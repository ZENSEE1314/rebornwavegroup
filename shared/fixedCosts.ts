// What the venue must earn each day just to cover its running costs (rent, electricity, water, internet, salaries, security ...).
// A cost is typed once with how often it is paid; a bill that only arrives at month end (electricity, water) is left empty and counted
// from the day the admin enters it — until then the target says it is not counting it yet.
export const FIXED_COST_CATEGORIES = ["rent", "electricity", "water", "internet", "salary", "security", "other"] as const;
export type FixedCostCategory = (typeof FIXED_COST_CATEGORIES)[number];
export const FIXED_COST_PERIODS = ["daily", "weekly", "monthly", "yearly"] as const;
export type FixedPeriod = (typeof FIXED_COST_PERIODS)[number];

export const MAX_FIXED_COSTS = 60;
const NAME_MAX = 60;
const DAYS_PER_WEEK = 7;
const CENTS = 100;
const round = (value: number) => Math.round(value * CENTS) / CENTS;

export interface FixedCost {
  id: string;
  name: string;
  category: FixedCostCategory;
  /** What one period costs; null = the bill has not come yet. */
  amount: number | null;
  period: FixedPeriod;
  /** Company-level costs can be left out of the venue's daily target. */
  isCounted: boolean;
}

/** The real amounts of monthly bills: month ("2026-10") → cost id → amount. */
export type MonthlyActuals = Record<string, Record<string, number>>;

export interface DailyLine { id: string; name: string; category: FixedCostCategory; daily: number; isPending: boolean; isActual: boolean }
export interface DailyCosts { perDay: number; lines: DailyLine[]; pending: string[] }

export function daysInMonth(month: string): number {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}

const daysInYear = (month: string) => { const year = Number(month.slice(0, 4)); return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365; };

export function dailyLine(cost: FixedCost, month: string, actuals: MonthlyActuals): DailyLine {
  const actual = actuals[month]?.[cost.id];
  const hasActual = typeof actual === "number" && Number.isFinite(actual) && actual >= 0;
  const amount = hasActual && cost.period === "monthly" ? actual : cost.amount;
  const base = { id: cost.id, name: cost.name, category: cost.category, isActual: hasActual && cost.period === "monthly" };
  if (amount === null || !Number.isFinite(amount)) return { ...base, daily: 0, isPending: true };
  const divisor = cost.period === "monthly" ? daysInMonth(month) : cost.period === "weekly" ? DAYS_PER_WEEK : cost.period === "yearly" ? daysInYear(month) : 1;
  return { ...base, daily: round(amount / divisor), isPending: false };
}

export function dailyCosts(costs: FixedCost[], month: string, actuals: MonthlyActuals, extraPerDay = 0): DailyCosts {
  const lines = costs.filter((cost) => cost.isCounted).map((cost) => dailyLine(cost, month, actuals));
  return { perDay: round(lines.reduce((sum, line) => sum + line.daily, 0) + Math.max(0, extraPerDay)), lines, pending: lines.filter((line) => line.isPending).map((line) => line.name) };
}

/** Sales needed in a day so that the profit left after the cost of goods covers the running costs. */
export function breakEvenSales(perDay: number, margin: number | null): number | null {
  if (margin === null || margin <= 0 || perDay <= 0) return null;
  return round(perDay / margin);
}

/** The list from the screen, cleaned: known categories and periods, no empty names, ids kept or made. */
export function cleanFixedCosts(raw: unknown): FixedCost[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_FIXED_COSTS).flatMap((entry, index) => {
    const name = String(entry?.name ?? "").trim().slice(0, NAME_MAX);
    if (!name) return [];
    const category = (FIXED_COST_CATEGORIES as readonly string[]).includes(entry?.category) ? entry.category as FixedCostCategory : "other";
    const period = (FIXED_COST_PERIODS as readonly string[]).includes(entry?.period) ? entry.period as FixedPeriod : "monthly";
    const amount = entry?.amount === null || entry?.amount === "" || entry?.amount === undefined ? null : Math.max(0, Number(entry.amount));
    const id = String(entry?.id ?? "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 24) || `c${Date.now().toString(36)}${index}`;
    return [{ id, name, category, amount: amount !== null && Number.isFinite(amount) ? amount : null, period, isCounted: entry?.isCounted !== false }];
  });
}
