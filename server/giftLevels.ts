// Gift levels (like TikTok): a Gifter level from all KGOLD a member has SENT and a
// Star level from all KGOLD they have RECEIVED in KOS. 50 levels each. The total
// KGOLD needed for each level is set by the admin: Lv.2 at `base`, then each
// level needs `growth` × the previous level's total (default 1,000,000 × 2:
// Lv.2 = 1M, Lv.3 = 2M, Lv.4 = 4M …), or an exact list of 49 totals.
import { sql } from "drizzle-orm";
import { db } from "./db";

export const MAX_LEVEL = 50;
export type LevelCfg = { base: number; growth: number; list?: number[] };
export type LevelInfo = { level: number; exp: number; levelStart: number; nextAt: number | null; progress: number };

// Total KGOLD needed to reach each level: at[1] = 0, at[2] = base, at[n] = at[n-1] × growth.
export function levelCurve(cfg: LevelCfg): number[] {
  const at = [0, 0];
  for (let lv = 2; lv <= MAX_LEVEL; lv++) {
    const want = cfg.list && cfg.list.length >= lv - 1 ? cfg.list[lv - 2] : lv === 2 ? cfg.base : Math.round(at[lv - 1] * cfg.growth);
    at[lv] = Math.max(at[lv - 1] + 1, want); // always increasing
  }
  return at;
}
export function levelOf(exp: number, curve: number[]): LevelInfo {
  let level = 1;
  for (let lv = MAX_LEVEL; lv >= 1; lv--) if (exp >= curve[lv]) { level = lv; break; }
  const levelStart = curve[level];
  const nextAt = level < MAX_LEVEL ? curve[level + 1] : null;
  const progress = nextAt == null ? 1 : Math.min(1, Math.max(0, (exp - levelStart) / (nextAt - levelStart)));
  return { level, exp, levelStart, nextAt, progress };
}
const parseList = (v: unknown) => {
  const nums = String(v || "").split(/[\s,;]+/).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0);
  return nums.length ? nums : undefined;
};
// Admin settings → the two curves.
export function levelConfigs(s: Record<string, any>) {
  const cfg = (p: "Sender" | "Receiver"): LevelCfg => ({
    base: Math.max(1, Number(s[`giftLevel${p}Base`]) || 1000000),
    growth: Math.min(10, Math.max(1, Number(s[`giftLevel${p}Growth`]) || 2)),
    list: parseList(s[`giftLevel${p}List`]),
  });
  return { sender: cfg("Sender"), receiver: cfg("Receiver") };
}

// KGOLD each member has sent / received in KOS (all time, this venue).
export async function giftTotals(cid: number | null, userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  const out = new Map<string, { sent: number; received: number }>();
  for (const id of ids) out.set(id, { sent: 0, received: 0 });
  if (!ids.length) return out;
  const scope = cid == null ? sql`` : sql`AND company_id = ${cid}`;
  const idList = sql.join(ids.map((id) => sql`${id}`), sql`, `);
  const sent: any = await db.execute(sql`SELECT from_user_id AS id, COALESCE(SUM(kgold_cost),0)::bigint AS n FROM kos_gifts WHERE from_user_id IN (${idList}) ${scope} GROUP BY from_user_id`);
  const got: any = await db.execute(sql`SELECT to_user_id AS id, COALESCE(SUM(recipient_kgold),0)::bigint AS n FROM kos_gifts WHERE to_user_id IN (${idList}) ${scope} GROUP BY to_user_id`);
  for (const r of (sent.rows || sent) as any[]) out.get(r.id)!.sent = Number(r.n) || 0;
  for (const r of (got.rows || got) as any[]) out.get(r.id)!.received = Number(r.n) || 0;
  return out;
}
export async function giftLevels(cid: number | null, userIds: string[], s: Record<string, any>) {
  const { sender, receiver } = levelConfigs(s);
  const sc = levelCurve(sender), rc = levelCurve(receiver);
  const totals = await giftTotals(cid, userIds);
  const out = new Map<string, { sender: LevelInfo; receiver: LevelInfo }>();
  for (const [id, t] of Array.from(totals)) out.set(id, { sender: levelOf(t.sent, sc), receiver: levelOf(t.received, rc) });
  return out;
}
