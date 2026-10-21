// The tax and service fee of a bill are the rates it was opened with. Bills made before the rates were kept on the bill have only the amounts, so their percentage is worked out from them.
const HUNDRED = 100;
const CENTS = 100;

export function inferPercent(amount: number, base: number): number {
  return base > 0 ? Math.round((amount / base) * HUNDRED * CENTS) / CENTS : 0;
}

/** The percentage to show for a bill: the rate stored on it, else worked out from its amount, else the one given. */
export function percentOf(stored: string | number | null | undefined, amount: number, base: number, fallback: number): number {
  if (stored !== null && stored !== undefined && stored !== "" && Number.isFinite(Number(stored))) return Number(stored);
  return amount > 0 ? inferPercent(amount, base) : fallback;
}

export const MAX_RATE_PERCENT = 100;

export function cleanRate(value: unknown): number | null {
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 && rate <= MAX_RATE_PERCENT ? Math.round(rate * CENTS) / CENTS : null;
}
