// Extra commission on what a salesperson sold in ONE venue day, by tiers the admin sets.
// The day's sales (before service fee and tax) earn the % of the tier they reach, on the whole day (3,500,000 in the 12% tier = 420,000);
// the count starts again every venue day. A tier is "up to N"; its start is the end of the one before; the last tier has no top and is the most anyone earns.

export interface CommissionTier { upTo: number | null; percent: number }
export interface DailyCommissionSetup { enabled: boolean; startDay: string; tiers: CommissionTier[] }
export type TiersProblem = "" | "empty" | "percent" | "order" | "open";

export const MAX_COMMISSION_TIERS = 30;
const CENTS = 100;
const MAX_PERCENT = 100;

export const DEFAULT_DAILY_TIERS: CommissionTier[] = [
  { upTo: 3_000_000, percent: 10 },
  { upTo: 4_000_000, percent: 12 },
  { upTo: 5_000_000, percent: 14 },
  { upTo: 6_000_000, percent: 15 },
  { upTo: 7_000_000, percent: 16 },
  { upTo: 8_000_000, percent: 18 },
  { upTo: 9_000_000, percent: 20 },
  { upTo: 10_000_000, percent: 22 },
  { upTo: null, percent: 25 },
];

export function defaultSetup(): DailyCommissionSetup {
  return { enabled: false, startDay: "", tiers: DEFAULT_DAILY_TIERS.map((tier) => ({ ...tier })) };
}

const isDay = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

// What the admin sent: rows in any order, one row without "up to" = "and above". Returns the rows sorted, or what is wrong.
export function cleanTiers(raw: unknown): { tiers: CommissionTier[]; problem: TiersProblem } {
  const rows = Array.isArray(raw) ? raw.slice(0, MAX_COMMISSION_TIERS) : [];
  if (rows.length < 1) return { tiers: [], problem: "empty" };
  const closed: CommissionTier[] = [];
  const open: CommissionTier[] = [];
  for (const row of rows) {
    const percent = Number(row?.percent);
    if (!Number.isFinite(percent) || percent < 0 || percent > MAX_PERCENT) return { tiers: [], problem: "percent" };
    const hasTop = row?.upTo !== null && row?.upTo !== undefined && row?.upTo !== "";
    const upTo = Number(row?.upTo);
    if (hasTop && (!Number.isFinite(upTo) || upTo <= 0)) return { tiers: [], problem: "order" };
    (hasTop ? closed : open).push({ upTo: hasTop ? upTo : null, percent });
  }
  if (open.length !== 1) return { tiers: [], problem: "open" };
  closed.sort((a, b) => (a.upTo as number) - (b.upTo as number));
  if (closed.some((tier, index) => index > 0 && tier.upTo === closed[index - 1].upTo)) return { tiers: [], problem: "order" };
  return { tiers: [...closed, open[0]], problem: "" };
}

export function readSetup(json: string | null | undefined): DailyCommissionSetup {
  try {
    const saved = JSON.parse(json || "null");
    const { tiers, problem } = cleanTiers(saved?.tiers);
    if (!saved || problem) return defaultSetup();
    return { enabled: saved.enabled === true, startDay: isDay(saved.startDay) ? saved.startDay : "", tiers };
  } catch {
    return defaultSetup();
  }
}

// The setup the admin saves. Switching on needs a start day (today unless one is given), so days already gone are not paid again.
export function cleanSetup(raw: any, today: string): { setup: DailyCommissionSetup; problem: TiersProblem } {
  const { tiers, problem } = cleanTiers(raw?.tiers);
  const enabled = raw?.enabled === true;
  const startDay = isDay(raw?.startDay) ? raw.startDay : enabled ? today : "";
  return { setup: { enabled, startDay, tiers }, problem };
}

export function tierIndexFor(sales: number, tiers: CommissionTier[]): number {
  const index = tiers.findIndex((tier) => tier.upTo !== null && sales <= tier.upTo);
  return index === -1 ? tiers.length - 1 : index;
}

export function dayCommission(sales: number, tiers: CommissionTier[]): { percent: number; amount: number; tierIndex: number } {
  const tierIndex = tierIndexFor(sales, tiers);
  if (!(sales > 0) || !tiers.length) return { percent: 0, amount: 0, tierIndex };
  const percent = tiers[tierIndex].percent;
  return { percent, amount: Math.round((sales * percent * CENTS) / 100) / CENTS, tierIndex };
}

// How the table reads: each tier's start (what the one before ends at; 0 for the first), its top (null = and above) and its %.
export function tierRanges(tiers: CommissionTier[]): { from: number; to: number | null; percent: number }[] {
  return tiers.map((tier, index) => ({ from: index === 0 ? 0 : (tiers[index - 1].upTo as number), to: tier.upTo, percent: tier.percent }));
}

// The next tier up from today's sales: sell more than `above` to earn `percent`.
export function nextTierAfter(sales: number, tiers: CommissionTier[]): { above: number; percent: number } | null {
  const index = tierIndexFor(sales, tiers);
  const current = tiers[index];
  if (!current || current.upTo === null) return null;
  return { above: current.upTo, percent: tiers[index + 1].percent };
}
