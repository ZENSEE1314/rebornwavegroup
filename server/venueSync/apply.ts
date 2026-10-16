// Replays logged changes (policy.ts explains the rules). Runs inside one transaction with the trigger switched off, so nothing echoes back.
import type { PoolClient } from "pg";

export interface SyncEntry {
  seq: number;
  tbl: string;
  op: "I" | "U" | "D";
  pk: Record<string, unknown>;
  row?: Record<string, unknown> | null;
  changes?: Record<string, unknown> | null;
  deltas?: Record<string, unknown> | null;
}

interface TableInfo { pk: string[]; counters: string[]; columns: Set<string> }
const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const quote = (id: string) => `"${id.replace(/"/g, '""')}"`;

export async function loadTableInfo(client: PoolClient): Promise<Map<string, TableInfo>> {
  const tables = (await client.query("SELECT tbl, pk, counters FROM sync_tables")).rows;
  const info = new Map<string, TableInfo>();
  for (const row of tables) {
    const columns = new Set((await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1", [row.tbl])).rows.map((r) => r.column_name as string));
    info.set(row.tbl, { pk: row.pk, counters: row.counters, columns });
  }
  return info;
}

const pkMatch = (tbl: string, info: TableInfo, alias: string, param: string) => {
  const cols = info.pk.map(quote).join(", ");
  const own = info.pk.map((c) => `${alias}.${quote(c)}`).join(", ");
  return `(${own}) IN (SELECT ${cols} FROM jsonb_populate_record(NULL::public.${quote(tbl)}, ${param}::jsonb))`;
};

async function applyOne(client: PoolClient, entry: SyncEntry, info: TableInfo) {
  const tbl = entry.tbl;
  const table = `public.${quote(tbl)}`;
  if (entry.op === "D") {
    await client.query(`DELETE FROM ${table} AS t WHERE ${pkMatch(tbl, info, "t", "$1")}`, [JSON.stringify(entry.pk)]);
    return;
  }
  const insertRow = () => client.query(`INSERT INTO ${table} SELECT * FROM jsonb_populate_record(NULL::${table}, $1::jsonb) ON CONFLICT DO NOTHING`, [JSON.stringify(entry.row)]);
  if (entry.op === "I") { await insertRow(); return; }
  const sets: string[] = [];
  const params: unknown[] = [JSON.stringify(entry.pk), JSON.stringify(entry.changes || {})];
  for (const col of Object.keys(entry.changes || {})) {
    if (!NAME.test(col) || !info.columns.has(col) || info.pk.includes(col)) continue;
    sets.push(`${quote(col)} = r.${quote(col)}`);
  }
  for (const [col, delta] of Object.entries(entry.deltas || {})) {
    if (!NAME.test(col) || !info.columns.has(col) || !info.counters.includes(col)) continue;
    params.push(String(delta));
    sets.push(`${quote(col)} = t.${quote(col)} + $${params.length}::numeric`);
  }
  if (!sets.length) return;
  const result = await client.query(`UPDATE ${table} AS t SET ${sets.join(", ")} FROM jsonb_populate_record(NULL::${table}, $2::jsonb) r WHERE ${pkMatch(tbl, info, "t", "$1")}`, params);
  if (!result.rowCount && entry.row) await insertRow(); // the row was never here: take it whole
}

/** Applies the entries in order. A change that cannot be applied (e.g. a unique email already taken) is put in sync_failures and skipped; the rest carry on. */
export async function applyEntries(client: PoolClient, entries: SyncEntry[], info: Map<string, TableInfo>): Promise<{ applied: number; failed: number }> {
  await client.query("SELECT set_config('sync.applying', 'on', true)");
  let applied = 0, failed = 0;
  for (const entry of entries) {
    const tableInfo = info.get(entry.tbl);
    if (!tableInfo || !NAME.test(entry.tbl)) continue;
    await client.query("SAVEPOINT sync_entry");
    try {
      await applyOne(client, entry, tableInfo);
      await client.query("RELEASE SAVEPOINT sync_entry");
      applied += 1;
    } catch (error) {
      await client.query("ROLLBACK TO SAVEPOINT sync_entry");
      await client.query("INSERT INTO sync_failures (tbl, op, pk, error, entry) VALUES ($1, $2, $3, $4, $5)", [entry.tbl, entry.op, JSON.stringify(entry.pk), String((error as Error).message).slice(0, 500), JSON.stringify(entry)]);
      failed += 1;
    }
  }
  return { applied, failed };
}
