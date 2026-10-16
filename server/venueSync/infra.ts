// Database side of the venue sync: the change log, the trigger that fills it, and (on the venue PC) the id offset.
import { pool } from "../db";
import { REPLICATED_TABLES, VENUE_ID_START } from "./policy";

const quote = (id: string) => `"${id.replace(/"/g, '""')}"`;
const META_ID_OFFSET = "idOffset";

const BASE_SQL = `
CREATE TABLE IF NOT EXISTS sync_log (
  seq bigserial PRIMARY KEY,
  tbl text NOT NULL,
  op char(1) NOT NULL,
  pk jsonb NOT NULL,
  row jsonb,
  changes jsonb,
  deltas jsonb,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sync_tables (tbl text PRIMARY KEY, pk text[] NOT NULL, counters text[] NOT NULL DEFAULT '{}');
CREATE TABLE IF NOT EXISTS sync_state (peer text PRIMARY KEY, sent_through bigint NOT NULL DEFAULT 0, received_through bigint NOT NULL DEFAULT 0, seen_at timestamptz);
CREATE TABLE IF NOT EXISTS sync_meta (key text PRIMARY KEY, value text);
CREATE TABLE IF NOT EXISTS sync_failures (id bigserial PRIMARY KEY, tbl text, op char(1), pk jsonb, error text, entry jsonb, at timestamptz NOT NULL DEFAULT now());

CREATE OR REPLACE FUNCTION sync_capture() RETURNS trigger AS $fn$
DECLARE
  cfg sync_tables%ROWTYPE;
  src jsonb; old_row jsonb;
  pkj jsonb := '{}'::jsonb; ch jsonb := '{}'::jsonb; dl jsonb := '{}'::jsonb;
  col text;
BEGIN
  IF current_setting('sync.applying', true) = 'on' THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT * INTO cfg FROM sync_tables WHERE tbl = TG_TABLE_NAME;
  IF NOT FOUND THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP = 'DELETE' THEN src := to_jsonb(OLD); ELSE src := to_jsonb(NEW); END IF;
  FOREACH col IN ARRAY cfg.pk LOOP pkj := pkj || jsonb_build_object(col, src -> col); END LOOP;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO sync_log (tbl, op, pk, row) VALUES (TG_TABLE_NAME, 'I', pkj, src);
  ELSIF TG_OP = 'UPDATE' THEN
    old_row := to_jsonb(OLD);
    FOR col IN SELECT jsonb_object_keys(src) LOOP
      IF src -> col IS DISTINCT FROM old_row -> col THEN
        IF col = ANY (cfg.counters) THEN
          dl := dl || jsonb_build_object(col, COALESCE((src ->> col)::numeric, 0) - COALESCE((old_row ->> col)::numeric, 0));
        ELSE
          ch := ch || jsonb_build_object(col, src -> col);
        END IF;
      END IF;
    END LOOP;
    IF ch = '{}'::jsonb AND dl = '{}'::jsonb THEN RETURN NEW; END IF;
    INSERT INTO sync_log (tbl, op, pk, row, changes, deltas) VALUES (TG_TABLE_NAME, 'U', pkj, src, ch, dl);
  ELSE
    INSERT INTO sync_log (tbl, op, pk) VALUES (TG_TABLE_NAME, 'D', pkj);
  END IF;
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- logging a change must never stop the sale / the song request itself
  RAISE WARNING 'sync_capture failed on %: %', TG_TABLE_NAME, SQLERRM;
  RETURN COALESCE(NEW, OLD);
END
$fn$ LANGUAGE plpgsql;
`;

/** Creates the log, the trigger function and a trigger on every replicated table that exists. On the venue PC it also moves the id counters up. Safe to run again. */
export async function ensureSyncInfra(options: { isVenue: boolean }): Promise<{ tracked: string[]; skipped: string[] }> {
  const client = await pool.connect();
  const tracked: string[] = [];
  const skipped: string[] = [];
  try {
    await client.query(BASE_SQL);
    const present = new Set((await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")).rows.map((r) => r.table_name as string));
    for (const spec of REPLICATED_TABLES) {
      if (!present.has(spec.tbl)) { skipped.push(spec.tbl); continue; }
      const pk = (await client.query(
        `SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
         WHERE i.indrelid = $1::regclass AND i.indisprimary ORDER BY array_position(i.indkey, a.attnum)`, [`public.${quote(spec.tbl)}`])).rows.map((r) => r.attname as string);
      if (!pk.length) { skipped.push(spec.tbl); continue; }
      const columns = new Set((await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1", [spec.tbl])).rows.map((r) => r.column_name as string));
      const counters = (spec.counters || []).filter((c) => columns.has(c));
      await client.query("INSERT INTO sync_tables (tbl, pk, counters) VALUES ($1, $2, $3) ON CONFLICT (tbl) DO UPDATE SET pk = EXCLUDED.pk, counters = EXCLUDED.counters", [spec.tbl, pk, counters]);
      const has = await client.query("SELECT 1 FROM pg_trigger WHERE tgname = 'sync_capture_trg' AND tgrelid = $1::regclass", [`public.${quote(spec.tbl)}`]);
      if (!has.rowCount) await client.query(`CREATE TRIGGER sync_capture_trg AFTER INSERT OR UPDATE OR DELETE ON public.${quote(spec.tbl)} FOR EACH ROW EXECUTE FUNCTION sync_capture()`);
      tracked.push(spec.tbl);
    }
    if (options.isVenue) await moveIdsUp(client, tracked);
  } finally { client.release(); }
  return { tracked, skipped };
}

// Ids made on the venue PC start at VENUE_ID_START: a row made there and a row made in the cloud meanwhile never share an id (done once per table).
async function moveIdsUp(client: import("pg").PoolClient, tables: string[]) {
  for (const tbl of tables) {
    const key = `${META_ID_OFFSET}:${tbl}`;
    if ((await client.query("SELECT 1 FROM sync_meta WHERE key = $1", [key])).rowCount) continue;
    const pk = (await client.query("SELECT pk FROM sync_tables WHERE tbl = $1", [tbl])).rows[0]?.pk as string[] | undefined;
    for (const col of pk || []) {
      const seq = (await client.query("SELECT pg_get_serial_sequence($1, $2) AS s", [`public.${quote(tbl)}`, col])).rows[0]?.s as string | null;
      if (!seq) continue;
      await client.query(`SELECT setval($1::regclass, GREATEST((SELECT last_value FROM ${seq}), $2::bigint))`, [seq, VENUE_ID_START]);
    }
    await client.query("INSERT INTO sync_meta (key, value) VALUES ($1, 'yes') ON CONFLICT (key) DO NOTHING", [key]);
  }
}
