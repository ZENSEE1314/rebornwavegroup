// The unpaid days of a month for a salaried person: approved leave / MC that is not paid, and days they were scheduled to work but did not come.
// A month the admin marked "no leave" makes every leave and MC day in it unpaid. One day of pay is the monthly salary over the days of pay in a month.
const CENTS = 100;
const round = (value: number) => Math.round(value * CENTS) / CENTS;
const DAY_MS = 86_400_000;
export const DEFAULT_PAY_DAYS = 26;
export const MIN_PAY_DAYS = 1;
export const MAX_PAY_DAYS = 31;

export interface LeaveEntry { type: string; startDate: string; endDate: string; paid: boolean | null }

export interface LeaveSummary {
  mcDays: number;
  leaveDays: number;
  /** Leave and MC days that are not paid (the approver said unpaid, or the month is a no-leave month). */
  unpaidLeaveDays: number;
  absentDays: number;
  unpaidDays: number;
  isNoLeaveMonth: boolean;
}

/** Every date ("YYYY-MM-DD") of `month` ("YYYY-MM") between two dates, both included. */
export function datesInMonth(startDate: string, endDate: string, month: string): string[] {
  const monthStart = Date.parse(`${month}-01T00:00:00Z`);
  const next = new Date(monthStart);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const from = Math.max(Date.parse(`${startDate}T00:00:00Z`), monthStart);
  const to = Math.min(Date.parse(`${endDate}T00:00:00Z`), next.getTime() - DAY_MS);
  const dates: string[] = [];
  for (let at = from; at <= to; at += DAY_MS) dates.push(new Date(at).toISOString().slice(0, 10));
  return dates;
}

export function leaveSummary(input: { month: string; leaves: LeaveEntry[]; noLeaveMonths: string[]; scheduledDates: string[]; attendedDates: string[]; needsAttendance: boolean; today: string }): LeaveSummary {
  const isNoLeaveMonth = input.noLeaveMonths.includes(input.month);
  const leaveDates = new Map<string, { type: string; isUnpaid: boolean }>();
  for (const entry of input.leaves) {
    for (const date of datesInMonth(entry.startDate, entry.endDate, input.month)) {
      if (!leaveDates.has(date)) leaveDates.set(date, { type: entry.type, isUnpaid: entry.paid === false || isNoLeaveMonth });
    }
  }
  const days = Array.from(leaveDates.values());
  const attended = new Set(input.attendedDates);
  const absentDays = input.needsAttendance
    ? new Set(input.scheduledDates.filter((date) => date.startsWith(input.month) && date <= input.today && !attended.has(date) && !leaveDates.has(date))).size
    : 0;
  const unpaidLeaveDays = days.filter((day) => day.isUnpaid).length;
  return {
    mcDays: days.filter((day) => day.type === "mc").length,
    leaveDays: days.filter((day) => day.type !== "mc").length,
    unpaidLeaveDays, absentDays, unpaidDays: unpaidLeaveDays + absentDays, isNoLeaveMonth,
  };
}

/** What comes off the monthly salary for the unpaid days (never more than the salary). */
export function unpaidDeduction(baseSalary: number, payDays: number, unpaidDays: number): number {
  const days = Math.min(MAX_PAY_DAYS, Math.max(MIN_PAY_DAYS, Math.floor(payDays) || DEFAULT_PAY_DAYS));
  return Math.min(Math.max(0, baseSalary), round((Math.max(0, baseSalary) / days) * Math.max(0, unpaidDays)));
}

/** The no-leave months from the screen: valid "YYYY-MM" values, no repeats, sorted. */
export function cleanNoLeaveMonths(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(new Set(raw.map(String).filter((month) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month)))).sort().slice(0, 60);
}
