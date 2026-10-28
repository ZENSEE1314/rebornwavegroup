// Staff / boss price with a monthly cap: staff buy at cost or half price until the receipt prices (before any discount) of their staff-price bills this month reach the cap; after that they pay the normal price less a small staff discount.
export type StaffPriceMode = "cost" | "half" | "percent";

export interface StaffPriceCaps {
  defaultCap: number; // 0 = no cap
  discountPercent: number; // taken off the normal price once the cap is reached
  perPerson: Record<string, number>; // a person's own cap, replaces the default (0 = no cap for them)
}

export const DEFAULT_STAFF_DISCOUNT_PERCENT = 10;

export const emptyStaffPriceCaps = (): StaffPriceCaps => ({ defaultCap: 0, discountPercent: DEFAULT_STAFF_DISCOUNT_PERCENT, perPerson: {} });

const amountOf = (value: unknown) => { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : 0; };

export function cleanStaffPriceCaps(raw: unknown): StaffPriceCaps {
  const source = (raw && typeof raw === "object" ? raw : {}) as Partial<StaffPriceCaps>;
  const percent = Number(source.discountPercent);
  const perPerson: Record<string, number> = {};
  for (const [userId, cap] of Object.entries(source.perPerson && typeof source.perPerson === "object" ? source.perPerson : {})) {
    if (userId && Number.isFinite(Number(cap)) && Number(cap) >= 0) perPerson[userId] = Number(cap);
  }
  return { defaultCap: amountOf(source.defaultCap), discountPercent: Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : DEFAULT_STAFF_DISCOUNT_PERCENT, perPerson };
}

export function capOf(caps: StaffPriceCaps, userId: string | null | undefined): number {
  if (userId && Object.prototype.hasOwnProperty.call(caps.perPerson, userId)) return caps.perPerson[userId];
  return caps.defaultCap;
}

/** The price a staff member really gets: what they asked for while they are under the cap, the staff discount once the month's receipt prices have reached it. */
export function staffPriceModeFor(asked: "cost" | "half", spent: number, cap: number): StaffPriceMode {
  return cap > 0 && spent >= cap ? "percent" : asked;
}
