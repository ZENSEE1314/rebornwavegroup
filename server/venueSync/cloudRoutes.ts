// Cloud side of the venue sync: the venue PC pushes its changes here and pulls the cloud's; the first time it also copies the whole data (snapshot).
// Every call carries the venue token (Admin › Settings › Venue server). The token is the only way in.
import type { Express, Request, Response } from "express";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { pool } from "../db";
import { homeCompanySlug } from "../tenantContext";
import { applyEntries, loadTableInfo, type SyncEntry } from "./apply";
import { ensureSyncInfra } from "./infra";
import { REPLICATED_TABLES, SYNC_LOG_KEEP_DAYS, type Scope } from "./policy";

const TOKEN_KEY = "venueSyncToken";
const PEER = "venue";
const MAX_PUSH_ENTRIES = 2000;
const MAX_PULL_ROWS = 500;
const MAX_SNAPSHOT_PAGE = 500;
const quote = (id: string) => `"${id.replace(/"/g, '""')}"`;
const scopeOf = new Map<string, Scope>(REPLICATED_TABLES.map((spec) => [spec.tbl, spec.scope || "all"]));

const sha = (text: string) => createHash("sha256").update(text).digest();

export async function venueToken(): Promise<string> {
  return (await pool.query("SELECT value FROM app_settings WHERE key = $1", [TOKEN_KEY])).rows[0]?.value || "";
}
async function authorised(req: Request): Promise<boolean> {
  const given = String(req.headers["x-venue-token"] || "");
  const real = await venueToken();
  return !!given && !!real && timingSafeEqual(sha(given), sha(real));
}
const homeCompanyId = async (): Promise<number | null> => (await pool.query("SELECT id FROM bridge_companies WHERE slug = $1", [homeCompanySlug()])).rows[0]?.id ?? null;

const USER_IN_SCOPE = `(EXISTS (SELECT 1 FROM bridge_company_members m WHERE m.user_id = u.id AND m.company_id = $1) OR NOT EXISTS (SELECT 1 FROM bridge_company_members m WHERE m.user_id = u.id))`;

/** What of the cloud's rows belongs to this venue: its own company's rows (and sign-ups that belong to no company yet), never another company's. */
async function entriesInScope(entries: SyncEntry[], home: number | null): Promise<SyncEntry[]> {
  const userIds = entries.filter((e) => e.tbl === "users" && e.op !== "D").map((e) => String(e.pk.id));
  const allowedUsers = new Set<string>();
  if (userIds.length) for (const row of (await pool.query(`SELECT u.id FROM users u WHERE u.id = ANY($2::varchar[]) AND ${USER_IN_SCOPE}`, [home, userIds])).rows) allowedUsers.add(row.id);
  return entries.filter((e) => {
    const scope = scopeOf.get(e.tbl);
    if (e.op === "D") return scope !== "companyRow" || Number(e.pk.id) === home;
    if (scope === "company") { const company = e.row?.company_id; return company == null || Number(company) === home; }
    if (scope === "companyRow") return Number(e.pk.id) === home;
    if (scope === "users") return allowedUsers.has(String(e.pk.id));
    return true;
  });
}

async function snapshotWhere(tbl: string, home: number | null): Promise<{ sql: string; params: unknown[] }> {
  const scope = scopeOf.get(tbl) || "all";
  const hasCompany = !!(await pool.query("SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'company_id'", [tbl])).rowCount;
  if (scope === "companyRow") return { sql: "WHERE t.id = $1", params: [home] };
  if (scope === "company" && hasCompany) return { sql: "WHERE t.company_id IS NULL OR t.company_id = $1", params: [home] };
  if (scope === "users") return { sql: `WHERE ${USER_IN_SCOPE.replace(/\bu\./g, "t.")}`, params: [home] };
  return { sql: "", params: [] };
}

export function registerVenueSyncRoutes(app: Express) {
  const guard = (handler: (req: Request, res: Response) => Promise<unknown>) => async (req: Request, res: Response) => {
    try {
      if (!(await authorised(req))) return res.status(401).json({ message: "Venue token needed" });
      await handler(req, res);
    } catch (error) {
      console.error("[venue-sync]", error);
      res.status(500).json({ message: "Sync failed" });
    }
  };

  app.get("/api/venue-sync/hello", guard(async (_req, res) => {
    const head = Number((await pool.query("SELECT COALESCE(max(seq), 0) AS head FROM sync_log")).rows[0].head);
    const tables = (await pool.query("SELECT tbl FROM sync_tables ORDER BY tbl")).rows.map((r) => r.tbl);
    res.json({ ok: true, head, tables });
  }));

  // The venue's changes, in order. Anything at or below what was already received is ignored, so a repeated push (lost answer) changes nothing.
  app.post("/api/venue-sync/push", guard(async (req, res) => {
    const entries: SyncEntry[] = Array.isArray(req.body?.entries) ? req.body.entries : [];
    const through = Number(req.body?.through) || 0;
    if (entries.length > MAX_PUSH_ENTRIES) return res.status(400).json({ message: "Too many entries" });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("INSERT INTO sync_state (peer) VALUES ($1) ON CONFLICT DO NOTHING", [PEER]);
      const state = (await client.query("SELECT received_through FROM sync_state WHERE peer = $1 FOR UPDATE", [PEER])).rows[0];
      const received = Number(state.received_through);
      const fresh = entries.filter((e) => e.seq > received).sort((a, b) => a.seq - b.seq);
      const result = await applyEntries(client, fresh, await loadTableInfo(client));
      const next = Math.max(received, through);
      await client.query("UPDATE sync_state SET received_through = $2, seen_at = now() WHERE peer = $1", [PEER, next]);
      await client.query("COMMIT");
      res.json({ receivedThrough: next, applied: result.applied, failed: result.failed });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally { client.release(); }
  }));

  // The cloud's changes after the venue's cursor (only those that belong to this venue).
  app.get("/api/venue-sync/pull", guard(async (req, res) => {
    const after = Math.max(0, Number(req.query.after) || 0);
    const limit = Math.min(MAX_PULL_ROWS, Math.max(1, Number(req.query.limit) || 300));
    const oldest = Number((await pool.query("SELECT COALESCE(min(seq), 0) AS oldest FROM sync_log")).rows[0].oldest);
    const head = Number((await pool.query("SELECT COALESCE(max(seq), 0) AS head FROM sync_log")).rows[0].head);
    const raw = (await pool.query("SELECT seq::float8 AS seq, tbl, op, pk, row, changes, deltas FROM sync_log WHERE seq > $1 ORDER BY seq LIMIT $2", [after, limit])).rows as SyncEntry[];
    await pool.query("INSERT INTO sync_state (peer, sent_through, seen_at) VALUES ($1, $2, now()) ON CONFLICT (peer) DO UPDATE SET sent_through = GREATEST(sync_state.sent_through, $2), seen_at = now()", [PEER, after]);
    res.json({ entries: await entriesInScope(raw, await homeCompanyId()), through: raw.length ? raw[raw.length - 1].seq : after, head, gap: after > 0 && oldest > 0 && after < oldest - 1 });
  }));

  // First copy: the list of tables and where the change log stood, then each table in pages.
  app.get("/api/venue-sync/snapshot/start", guard(async (_req, res) => {
    const head = Number((await pool.query("SELECT COALESCE(max(seq), 0) AS head FROM sync_log")).rows[0].head);
    const home = await homeCompanyId();
    const tables = [];
    for (const spec of REPLICATED_TABLES) {
      if (!(await pool.query("SELECT 1 FROM sync_tables WHERE tbl = $1", [spec.tbl])).rowCount) continue;
      const where = await snapshotWhere(spec.tbl, home);
      tables.push({ tbl: spec.tbl, count: Number((await pool.query(`SELECT count(*) AS c FROM public.${quote(spec.tbl)} t ${where.sql}`, where.params)).rows[0].c) });
    }
    res.json({ head, tables });
  }));
  app.get("/api/venue-sync/snapshot/:tbl", guard(async (req, res) => {
    const tbl = String(req.params.tbl);
    const spec = (await pool.query("SELECT pk FROM sync_tables WHERE tbl = $1", [tbl])).rows[0];
    if (!spec) return res.status(404).json({ message: "Unknown table" });
    const page = Math.max(0, Number(req.query.page) || 0);
    const size = Math.min(MAX_SNAPSHOT_PAGE, Math.max(1, Number(req.query.size) || 300));
    const where = await snapshotWhere(tbl, await homeCompanyId());
    const order = (spec.pk as string[]).map((c) => `t.${quote(c)}`).join(", ");
    const rows = (await pool.query(`SELECT to_jsonb(t) AS r FROM public.${quote(tbl)} t ${where.sql} ORDER BY ${order} OFFSET ${page * size} LIMIT ${size}`, where.params)).rows.map((r) => r.r);
    res.json({ rows });
  }));
}

export async function enableVenueSync(rotate: boolean): Promise<string> {
  let token = await venueToken();
  if (!token || rotate) {
    token = randomBytes(24).toString("hex");
    if (rotate) await pool.query("DELETE FROM sync_state WHERE peer = $1", [PEER]).catch(() => {}); // a new venue PC starts counting from 1 again
    await pool.query("INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()", [TOKEN_KEY, token]);
  }
  await ensureSyncInfra({ isVenue: false });
  return token;
}

/** What the admin sees on the cloud: is it on, when the venue was last here, how much it has sent. */
export async function cloudSyncStatus() {
  const enabled = !!(await venueToken());
  if (!enabled) return { enabled: false };
  const state = (await pool.query("SELECT received_through, sent_through, seen_at FROM sync_state WHERE peer = $1", [PEER])).rows[0];
  const failures = Number((await pool.query("SELECT count(*) AS c FROM sync_failures").catch(() => ({ rows: [{ c: 0 }] }))).rows[0].c);
  return { enabled: true, lastSeen: state?.seen_at || null, receivedFromVenue: Number(state?.received_through || 0), sentToVenue: Number(state?.sent_through || 0), failures };
}

export async function pruneCloudLog() {
  await pool.query("DELETE FROM sync_log WHERE at < now() - ($1 || ' days')::interval", [String(SYNC_LOG_KEEP_DAYS)]).catch(() => {});
}
