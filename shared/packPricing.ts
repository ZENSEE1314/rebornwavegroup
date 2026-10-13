// An item can be sold by the unit or by the pack (e.g. 24 cans). The admin sets how many units are in a pack and the
// price of a whole pack; the price of one unit is worked out from them.
export const MAX_UNITS_PER_PACK = 10_000;

/** How many units a pack holds: a whole number from 1 up (1 = a single bottle); anything else means nothing is set (null). */
export function cleanUnitsPerPack(value: unknown): number | null {
  const units = Math.floor(Number(value));
  return Number.isFinite(units) && units >= 1 ? Math.min(units, MAX_UNITS_PER_PACK) : null;
}

/** A pack price: a positive amount, or null. */
export function cleanPackPrice(value: unknown): number | null {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? Math.round(price * 100) / 100 : null;
}

/** The price of one unit = pack price ÷ units per pack (to the cent); null when either is missing. */
export function unitPriceFromPack(packPrice: unknown, unitsPerPack: unknown): number | null {
  const pack = cleanPackPrice(packPrice);
  const units = cleanUnitsPerPack(unitsPerPack);
  return pack !== null && units !== null ? Math.round((pack / units) * 100) / 100 : null;
}

/** Whole packs and loose units for a stock count: 50 units of a 24-pack = 2 packs + 2. */
export function packBreakdown(stock: number, unitsPerPack: number | null | undefined): { packs: number; loose: number } | null {
  const units = cleanUnitsPerPack(unitsPerPack);
  if (units === null || stock < 0) return null;
  return { packs: Math.floor(stock / units), loose: stock % units };
}
