// A night that starts at 5pm and ends at 2am or 3am is ONE sales day: the day changes at this hour, not at midnight (the same 08:00 start as the venue day: receipt numbers, closing report).
export const BUSINESS_DAY_START_HOUR = 8;
const HOUR_MS = 3_600_000;

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" of the sales day a moment belongs to, on the device's own clock: 01:30 on Tuesday still belongs to Monday's night. */
export function businessDayOf(moment: Date | string | number, startHour: number = BUSINESS_DAY_START_HOUR): string {
  const shifted = new Date(new Date(moment).getTime() - startHour * HOUR_MS);
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`;
}
