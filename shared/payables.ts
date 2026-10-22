// Credit terms of a supplier bill ("pay within 30 days"): the day the bill falls due, counted from the date on the receipt.
export const DEFAULT_TERMS_DAYS = 30;
export const MAX_TERMS_DAYS = 365;
const MS_PER_DAY = 86_400_000;

/** "2026-10-22" + 30 days → "2026-11-21". The days are clamped to 0..365; a bad date gives an empty answer. */
export function dueDateFrom(receiptDate: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(receiptDate)) return "";
  const start = new Date(`${receiptDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return "";
  const clamped = Math.min(MAX_TERMS_DAYS, Math.max(0, Math.floor(Number(days) || 0)));
  return new Date(start.getTime() + clamped * MS_PER_DAY).toISOString().slice(0, 10);
}
