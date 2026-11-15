// The pay period of staff sales and payroll. Start day 1 = the calendar month. Another start day, say 16 (paid on the 15th), makes a period run from the 16th to the 15th
// of the next month. A period is named after the month it is PAID in: "2026-11" with start day 16 = 16 Oct to 15 Nov, paid 15 Nov.

export const MIN_START_DAY = 1;
export const MAX_START_DAY = 28;
const DAY_MS = 24 * 3_600_000;

export interface PeriodClock { year: number; month: number; day: number }

export function clampStartDay(value: unknown): number {
  const day = Math.round(Number(value));
  return Number.isFinite(day) ? Math.min(MAX_START_DAY, Math.max(MIN_START_DAY, day)) : MIN_START_DAY;
}

const monthLabel = (year: number, monthIndex: number) => new Date(Date.UTC(year, monthIndex, 1)).toISOString().slice(0, 7);
const isoDay = (year: number, monthIndex: number, day: number) => new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);

/** The days of a period: `from` is its first day, `to` the first day after it. */
export function periodOf(label: string, startDay: number): { from: string; to: string } {
  const [year, month] = label.split("-").map(Number);
  const start = clampStartDay(startDay);
  if (start === 1) return { from: isoDay(year, month - 1, 1), to: isoDay(year, month, 1) };
  return { from: isoDay(year, month - 2, start), to: isoDay(year, month - 1, start) };
}

/** Which period a day belongs to (the month it is paid in). */
export function labelOfDay(day: string, startDay: number): string {
  const [year, month, dayOfMonth] = day.split("-").map(Number);
  const start = clampStartDay(startDay);
  return start > 1 && dayOfMonth >= start ? monthLabel(year, month) : monthLabel(year, month - 1);
}

/** The period that has just ended on payday, so the reminder names the right one. */
export function periodToPay(clock: PeriodClock, startDay: number): string {
  const start = clampStartDay(startDay);
  if (start === 1) return monthLabel(clock.year, clock.month - 2);
  return clock.day >= start - 1 ? monthLabel(clock.year, clock.month - 1) : monthLabel(clock.year, clock.month - 2);
}

export function daysInPeriod(label: string, startDay: number): number {
  const { from, to } = periodOf(label, startDay);
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}
