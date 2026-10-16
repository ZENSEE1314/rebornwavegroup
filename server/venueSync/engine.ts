// Venue PC side of the sync: every few seconds, if the cloud can be reached, send what changed here, then take what changed there.
// With no internet nothing is lost: the changes wait in the log (sync_log) and go as soon as the cloud answers.
import { pool } from "../db";
import { CLOUD_URL, VENUE_SYNC_TOKEN } from "../venueMode";
import { applyEntries, loadTableInfo, type SyncEntry } from "./apply";
import { ensureSyncInfra } from "./infra";
import { SYNC_BATCH_BYTES, SYNC_BATCH_ROWS, SYNC_EVERY_MS, SYNC_LOG_KEEP_DAYS, REPLICATED_TABLES } from "./policy";

const REQUEST_TIMEOUT_MS = 20_000;
const HELLO_TIMEOUT_MS = 6_000;
const SNAPSHOT_PAGE = 300;
const PEER_CLOUD = "cloud";
const BOOTSTRAPPED = "bootstrapped";
const quote = (id: string) => `"${id.replace(/"/g, '""')}"`;

export interface VenueSyncStatus {
  configured: boolean;
  online: boolean;
  bootstrapped: boolean;
  isBusy: boolean;
  lastOkAt: string | null;
  lastError: string | null;
  waitingToSend: number;
  failures: number;
  note: string | null;
}
const status: VenueSyncStatus = { configured: !!(CLOUD_URL && VENUE_SYNC_TOKEN), online: false, bootstrapped: false, isBusy: false, lastOkAt: null, lastError: null, waitingToSend: 0, failures: 0, note: null };

async function cloud(path: string, init: { method?: string; body?: unknown; timeout?: number } = {}) {
  const res = await fetch(CLOUD_URL + path, {
    method: init.method || "GET",
    headers: { "content-type": "application/json", "x-venue-token": VENUE_SYNC_TOKEN },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(init.timeout ?? REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`cloud answered ${res.status}`);
  return res.json();
}

const meta = async (key: string) => (await pool.query("SELECT value FROM sync_meta WHERE key = $1", [key])).rows[0]?.value as string | undefined;
async function state(peer: string): Promise<{ sent: number; received: number }> {
  await pool.query("INSERT INTO sync_state (peer) VALUES ($1) ON CONFLICT DO NOTHING", [peer]);
  const row = (await pool.query("SELECT sent_through, received_through FROM sync_state WHERE peer = $1", [peer])).rows[0];
  return { sent: Number(row.sent_through), received: Number(row.received_through) };
}

// First run only: copy the cloud's data. This venue PC starts empty, so whatever its own start-up put in the tables is replaced.
async function bootstrap() {
  const start = await cloud("/api/venue-sync/snapshot/start");
  const mine = new Set((await pool.query("SELECT tbl FROM sync_tables")).rows.map((r) => r.tbl as string));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('sync.applying', 'on', true)");
    await client.query("SET LOCAL session_replication_role = replica").catch(() => {}); // not allowed for every database user: then the order of the tables below is what keeps links valid
    const order = REPLICATED_TABLES.map((s) => s.tbl).filter((t) => mine.has(t) && start.tables.some((x: { tbl: string }) => x.tbl === t));
    for (const tbl of [...order].reverse()) await client.query(`DELETE FROM public.${quote(tbl)}`);
    for (const tbl of order) {
      for (let page = 0; ; page += 1) {
        const { rows } = await cloud(`/api/venue-sync/snapshot/${encodeURIComponent(tbl)}?page=${page}&size=${SNAPSHOT_PAGE}`);
        if (rows.length) await client.query(`INSERT INTO public.${quote(tbl)} SELECT * FROM jsonb_populate_recordset(NULL::public.${quote(tbl)}, $1::jsonb) ON CONFLICT DO NOTHING`, [JSON.stringify(rows)]);
        if (rows.length < SNAPSHOT_PAGE) break;
      }
    }
    await client.query("DELETE FROM sync_log");
    await client.query("INSERT INTO sync_state (peer, received_through) VALUES ($1, $2) ON CONFLICT (peer) DO UPDATE SET received_through = EXCLUDED.received_through", [PEER_CLOUD, start.head]);
    await client.query("UPDATE sync_state SET sent_through = (SELECT COALESCE(max(seq), 0) FROM sync_log) WHERE peer = $1", [PEER_CLOUD]);
    await client.query("INSERT INTO sync_meta (key, value) VALUES ($1, 'yes') ON CONFLICT (key) DO UPDATE SET value = 'yes'", [BOOTSTRAPPED]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally { client.release(); }
}

async function push() {
  for (;;) {
    const { sent } = await state(PEER_CLOUD);
    const rows = (await pool.query("SELECT seq::float8 AS seq, tbl, op, pk, row, changes, deltas FROM sync_log WHERE seq > $1 ORDER BY seq LIMIT $2", [sent, SYNC_BATCH_ROWS])).rows as SyncEntry[];
    if (!rows.length) return;
    const batch: SyncEntry[] = [];
    let bytes = 0;
    for (const row of rows) { const size = JSON.stringify(row).length; if (batch.length && bytes + size > SYNC_BATCH_BYTES) break; batch.push(row); bytes += size; }
    const answer = await cloud("/api/venue-sync/push", { method: "POST", body: { entries: batch, through: batch[batch.length - 1].seq } });
    await pool.query("UPDATE sync_state SET sent_through = $2 WHERE peer = $1", [PEER_CLOUD, answer.receivedThrough]);
  }
}

async function pull() {
  for (;;) {
    const { received } = await state(PEER_CLOUD);
    const page = await cloud(`/api/venue-sync/pull?after=${received}&limit=${SYNC_BATCH_ROWS}`);
    if (page.gap) throw new Error("The cloud log no longer reaches back this far: a new full copy is needed (ask the developer)");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await applyEntries(client, page.entries, await loadTableInfo(client));
      await client.query("UPDATE sync_state SET received_through = $2, seen_at = now() WHERE peer = $1", [PEER_CLOUD, page.through]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally { client.release(); }
    if (page.through <= received || page.through >= page.head) return;
  }
}

async function refreshCounts() {
  const { sent } = await state(PEER_CLOUD);
  status.waitingToSend = Number((await pool.query("SELECT count(*) AS c FROM sync_log WHERE seq > $1", [sent])).rows[0].c);
  status.failures = Number((await pool.query("SELECT count(*) AS c FROM sync_failures")).rows[0].c);
}

/** One round. Returns quietly when the cloud can't be reached. */
export async function syncNow(): Promise<VenueSyncStatus> {
  if (!status.configured || status.isBusy) return status;
  status.isBusy = true;
  try {
    try { await cloud("/api/venue-sync/hello", { timeout: HELLO_TIMEOUT_MS }); } catch (error) { status.online = false; status.lastError = (error as Error).message; await refreshCounts(); return status; }
    status.online = true;
    status.bootstrapped = (await meta(BOOTSTRAPPED)) === "yes";
    if (!status.bootstrapped) { status.note = "Copying the cloud data for the first time…"; await bootstrap(); status.bootstrapped = true; status.note = null; }
    await push();
    await pull();
    await pool.query("DELETE FROM sync_log WHERE at < now() - ($1 || ' days')::interval AND seq <= (SELECT sent_through FROM sync_state WHERE peer = $2)", [String(SYNC_LOG_KEEP_DAYS), PEER_CLOUD]);
    status.lastOkAt = new Date().toISOString();
    status.lastError = null;
  } catch (error) {
    status.lastError = (error as Error).message;
    console.error("[venue-sync]", error);
  } finally {
    status.isBusy = false;
    await refreshCounts().catch(() => {});
  }
  return status;
}

export const venueSyncStatus = (): VenueSyncStatus => status;

export async function startVenueSync() {
  if (!status.configured) { console.warn("[venue-sync] VENUE_MODE is on but CLOUD_URL / VENUE_SYNC_TOKEN are not set: this PC runs alone."); return; }
  await ensureSyncInfra({ isVenue: true });
  status.bootstrapped = (await meta(BOOTSTRAPPED)) === "yes";
  setInterval(() => { void syncNow(); }, SYNC_EVERY_MS);
  void syncNow();
}
