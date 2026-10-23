// Happy hour: a daily window with its own price, and/or an item that is only sold inside it. Times are "HH:MM" on the venue's clock;
// a window that ends before it starts (18:00 → 02:00) runs past midnight.
export interface HappyHourFields {
  price?: string | number | null;
  happyPrice?: string | number | null;
  happyStart?: string | null;
  happyEnd?: string | null;
  happyOnly?: boolean | null;
  happyDays?: string | null; // weekdays it runs on, "1,2,5" (0 = Sunday … 6 = Saturday); empty = every day
  happyBuyQty?: number | null;
  happyFreeQty?: number | null;
}

export const MAX_DEAL_QTY = 10;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MINUTES_PER_HOUR = 60;

export const isValidClock = (value: unknown): value is string => typeof value === "string" && TIME_RE.test(value);

const minutesOf = (clock: string): number => { const [h, m] = clock.split(":").map(Number); return h * MINUTES_PER_HOUR + m; };
const DAYS_IN_WEEK = 7;

/** "5,1,1,9,x" → "1,5": only weekdays 0–6, each once, in order; nothing valid = "" (every day). */
export function cleanDays(value: unknown): string {
  const list = Array.isArray(value) ? value : String(value ?? "").split(",");
  const days = new Set<number>();
  for (const item of list) { const day = Number(String(item).trim()); if (String(item).trim() !== "" && Number.isInteger(day) && day >= 0 && day < DAYS_IN_WEEK) days.add(day); }
  return days.size === 0 || days.size === DAYS_IN_WEEK ? "" : Array.from(days).sort((a, b) => a - b).join(",");
}

export const daysOf = (value: string | null | undefined): number[] => (cleanDays(value) ? cleanDays(value).split(",").map(Number) : []);

/** The clock of the venue as "D HH:MM" (D = weekday 0–6); the checks below also accept a plain "HH:MM" (no weekday = days are not checked). */
const splitClock = (clockNow: string): { day: number | null; time: string } => {
  const match = /^([0-6]) (.+)$/.exec(clockNow);
  return match ? { day: Number(match[1]), time: match[2] } : { day: null, time: clockNow };
};

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function clockInZone(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${WEEKDAY_INDEX[get("weekday")] ?? 0} ${get("hour")}:${get("minute")}`;
}

export function hasHappyWindow(p: HappyHourFields): boolean {
  return isValidClock(p.happyStart) && isValidClock(p.happyEnd) && p.happyStart !== p.happyEnd;
}

export function isHappyNow(p: HappyHourFields, clockNow: string): boolean {
  if (!hasHappyWindow(p)) return false;
  const { day, time } = splitClock(clockNow);
  const start = minutesOf(p.happyStart!); const end = minutesOf(p.happyEnd!); const at = minutesOf(time);
  const crossesMidnight = start >= end;
  if (!(crossesMidnight ? at >= start || at < end : at >= start && at < end)) return false;
  const days = daysOf(p.happyDays);
  if (days.length === 0 || day === null) return true;
  // The part of a night after midnight belongs to the day the happy hour started on.
  const startedOn = crossesMidnight && at < end ? (day + DAYS_IN_WEEK - 1) % DAYS_IN_WEEK : day;
  return days.includes(startedOn);
}

// The price to charge right now (the happy price inside the window, else the normal price).
export function salePriceNow(p: HappyHourFields, clockNow: string): number {
  const normal = Number(p.price) || 0;
  const happy = p.happyPrice === null || p.happyPrice === undefined || p.happyPrice === "" ? NaN : Number(p.happyPrice);
  return isHappyNow(p, clockNow) && Number.isFinite(happy) && happy >= 0 ? happy : normal;
}

// "Buy X, get Y free" inside the window: in every group of X + Y units the last Y are free. `alreadyOnBill` is how many units of this item the bill already holds,
// so adding one beer at a time still makes the second one free.
export function dealOf(p: HappyHourFields): { buy: number; free: number } | null {
  const buy = Math.floor(Number(p.happyBuyQty)); const free = Math.floor(Number(p.happyFreeQty));
  return buy >= 1 && free >= 1 ? { buy, free } : null;
}

export function freeUnitsFor(p: HappyHourFields, clockNow: string, qty: number, alreadyOnBill = 0): number {
  const deal = dealOf(p);
  if (!deal || !isHappyNow(p, clockNow)) return 0;
  const cycle = deal.buy + deal.free;
  let free = 0;
  for (let i = 0; i < qty; i++) if ((alreadyOnBill + i) % cycle >= deal.buy) free++;
  return free;
}

// An item that is only sold in its window is not offered outside it.
export const isOffHours = (p: HappyHourFields, clockNow: string): boolean => !!p.happyOnly && hasHappyWindow(p) && !isHappyNow(p, clockNow);
