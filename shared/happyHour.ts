// Happy hour: a daily window with its own price, and/or an item that is only sold inside it. Times are "HH:MM" on the venue's clock;
// a window that ends before it starts (18:00 → 02:00) runs past midnight.
export interface HappyHourFields {
  price?: string | number | null;
  happyPrice?: string | number | null;
  happyStart?: string | null;
  happyEnd?: string | null;
  happyOnly?: boolean | null;
  happyBuyQty?: number | null;
  happyFreeQty?: number | null;
}

export const MAX_DEAL_QTY = 10;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MINUTES_PER_HOUR = 60;

export const isValidClock = (value: unknown): value is string => typeof value === "string" && TIME_RE.test(value);

const minutesOf = (clock: string): number => { const [h, m] = clock.split(":").map(Number); return h * MINUTES_PER_HOUR + m; };

export function clockInZone(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("hour")}:${get("minute")}`;
}

export function hasHappyWindow(p: HappyHourFields): boolean {
  return isValidClock(p.happyStart) && isValidClock(p.happyEnd) && p.happyStart !== p.happyEnd;
}

export function isHappyNow(p: HappyHourFields, clockNow: string): boolean {
  if (!hasHappyWindow(p)) return false;
  const start = minutesOf(p.happyStart!); const end = minutesOf(p.happyEnd!); const at = minutesOf(clockNow);
  return start < end ? at >= start && at < end : at >= start || at < end;
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
