// Daily login reward (daily check-in): the first time a member opens the app each day
// (WIB calendar day) it is collected by itself (`autoClaim`, default) — or, with
// auto-collect off, they tap "Check in".
// The admin sets the reward of each of the 30 days one by one (points, RP credits, tokens,
// KGOLD, one of the Prizes, or nothing) in Admin › Settings; days 7/14/21/28 play the
// gift-box animation and day 30 the crown. After day 30 the cycle starts again. Missing a day starts again from day 1 unless the admin turns
// "reset on a missed day" off.
import { desc, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { appSettings, dailyCheckins, ledgerEntries, memberWalletTransactions, users } from "@shared/schema";

export const CYCLE_DAYS = 30;
export const WEEK_DAYS = 7;
export type RewardType = "none" | "points" | "rp" | "tokens" | "kgold" | "prize";
export interface Reward { type: RewardType; amount: number; prizeId?: number | null }
export interface CheckinConfig { enabled: boolean; resetOnMiss: boolean; autoClaim: boolean; days: Reward[] } // days[0] = day 1 … days[29] = day 30

const TYPES: RewardType[] = ["none", "points", "rp", "tokens", "kgold", "prize"];
// A day's kind: 7/14/21/28 = weekly gift box, 30 = big crown, the rest normal.
export const dayKind = (day: number): "daily" | "week" | "big" => (day === CYCLE_DAYS ? "big" : day % WEEK_DAYS === 0 ? "week" : "daily");
// Starting rewards: 10 points a day, 2 tokens on every 7th day, 1,000 points on day 30.
const defaultDay = (day: number): Reward => (dayKind(day) === "big" ? { type: "points", amount: 1000 } : dayKind(day) === "week" ? { type: "tokens", amount: 2 } : { type: "points", amount: 10 });
const DEFAULTS: CheckinConfig = { enabled: false, resetOnMiss: true, autoClaim: true, days: Array.from({ length: CYCLE_DAYS }, (_, i) => defaultDay(i + 1)) };
const KEY = "dailyCheckin";

function cleanReward(r: any, fallback: Reward): Reward {
  const type = TYPES.includes(r?.type) ? r.type : fallback.type;
  return { type, amount: Math.max(0, Math.round(Number(r?.amount) || 0)), prizeId: type === "prize" ? Number(r?.prizeId) || null : null };
}
export function cleanConfig(c: any): CheckinConfig {
  // Settings saved before per-day rewards had daily / week / big: day 7/14/21/28 took the
  // weekly reward, day 30 the big one, every other day the daily one.
  const old = (day: number) => (c?.[dayKind(day)] ?? (dayKind(day) === "daily" ? undefined : c?.daily));
  const days = Array.from({ length: CYCLE_DAYS }, (_, i) => cleanReward(Array.isArray(c?.days) ? c.days[i] : old(i + 1), defaultDay(i + 1)));
  return { enabled: c?.enabled === true, resetOnMiss: c?.resetOnMiss !== false, autoClaim: c?.autoClaim !== false, days };
}
export async function getCheckinConfig(): Promise<CheckinConfig> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, KEY));
  try { return row?.value ? cleanConfig(JSON.parse(row.value)) : { ...DEFAULTS }; } catch { return { ...DEFAULTS }; }
}
export async function saveCheckinConfig(c: any): Promise<CheckinConfig> {
  const cfg = cleanConfig(c);
  const value = JSON.stringify(cfg);
  await db.insert(appSettings).values({ key: KEY, value }).onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
  return cfg;
}

// Calendar day in Indonesia time (WIB, UTC+7).
export const wibDay = (d: Date = new Date()) => new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);

// Where the member stands: checked in today? which day of the 30 is done / next.
export async function checkinState(userId: string, cfg: CheckinConfig) {
  const [last] = await db.select().from(dailyCheckins).where(eq(dailyCheckins.userId, userId)).orderBy(desc(dailyCheckins.day)).limit(1);
  const today = wibDay(), yesterday = wibDay(new Date(Date.now() - 86_400_000));
  const lastDay = last ? String(last.day).slice(0, 10) : "";
  const checkedToday = lastDay === today;
  const continuing = !!last && (checkedToday || lastDay === yesterday || !cfg.resetOnMiss);
  const done = continuing ? (checkedToday ? last!.streak : last!.streak % CYCLE_DAYS) : 0; // days of this cycle already collected
  return { checkedToday, done, nextDay: checkedToday ? null : done + 1, today };
}

// The reward a given day of the cycle gives (the admin's setting for that day).
export function rewardsForDay(day: number, cfg: CheckinConfig) {
  const reward = cfg.days[day - 1];
  return reward && reward.type !== "none" ? [{ kind: dayKind(day), reward }] : [];
}

// Check in today: one row per member per WIB day (the unique index makes a double tap
// or two devices at once count once), then hand out that day's rewards.
// `grantPrize` awards one of the admin's Prizes (it lands in the member's Spin › My prizes).
export async function doCheckin(userId: string, cfg: CheckinConfig, grantPrize: (userId: string, prizeId: number) => Promise<string | null>) {
  const state = await checkinState(userId, cfg);
  if (state.checkedToday) return { already: true as const, ...state };
  const day = state.done + 1;
  const [row] = await db.insert(dailyCheckins).values({ userId, day: state.today, streak: day }).onConflictDoNothing().returning();
  if (!row) return { already: true as const, ...(await checkinState(userId, cfg)) };
  const given: { kind: string; type: RewardType; amount: number; label?: string | null }[] = [];
  for (const { kind, reward } of rewardsForDay(day, cfg)) {
    const amount = reward.amount;
    if (reward.type === "points" && amount > 0) {
      await db.update(users).set({ loyaltyPoints: sql`${users.loyaltyPoints} + ${amount}`, lifetimePoints: sql`${users.lifetimePoints} + ${amount}`, updatedAt: new Date() }).where(eq(users.id, userId));
    } else if (reward.type === "rp" && amount > 0) {
      await db.update(users).set({ credits: sql`${users.credits} + ${amount}`, updatedAt: new Date() }).where(eq(users.id, userId));
      await db.insert(memberWalletTransactions).values({ userId, type: "daily_checkin", rpAmount: String(amount), kgoldAmount: 0, description: `Daily check-in day ${day} reward`, referenceType: "daily_checkin", referenceId: String(row.id) });
      await db.insert(ledgerEntries).values({ kind: "expense", category: "checkin_reward", amount: String(amount), note: `Daily check-in day ${day}: RP credits`, refType: "daily_checkin", refId: String(row.id), userId });
    } else if (reward.type === "tokens" && amount > 0) {
      await db.update(users).set({ tokens: sql`${users.tokens} + ${amount}`, updatedAt: new Date() }).where(eq(users.id, userId));
    } else if (reward.type === "kgold" && amount > 0) {
      await db.update(users).set({ kgold: sql`${users.kgold} + ${amount}`, updatedAt: new Date() }).where(eq(users.id, userId));
    } else if (reward.type === "prize" && reward.prizeId) {
      const label = await grantPrize(userId, reward.prizeId);
      if (!label) continue; // prize was deleted
      given.push({ kind, type: "prize", amount: 0, label });
      continue;
    } else continue;
    given.push({ kind, type: reward.type, amount });
  }
  await db.update(dailyCheckins).set({ rewards: given }).where(eq(dailyCheckins.id, row.id));
  return { already: false as const, day, rewards: given, milestone: day === CYCLE_DAYS ? "big" : day % WEEK_DAYS === 0 ? "week" : null };
}

export async function checkinStats() {
  const today = wibDay(), weekAgo = wibDay(new Date(Date.now() - 7 * 86_400_000)), monthAgo = wibDay(new Date(Date.now() - 30 * 86_400_000));
  const r: any = await db.execute(sql`SELECT count(*) FILTER (WHERE day = ${today})::int AS today, count(*) FILTER (WHERE day > ${weekAgo})::int AS week, count(DISTINCT user_id) FILTER (WHERE day > ${monthAgo})::int AS members FROM daily_checkins`);
  return (r.rows || r)[0] || { today: 0, week: 0, members: 0 };
}
