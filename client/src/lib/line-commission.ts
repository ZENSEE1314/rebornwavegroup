const MAX_PERCENT = 100;

// A blank box means "use the item's own commission rule" (null); a typed number, even 0, is the cashier's own % for this line.
export function percentToSend(typed: string): number | null {
  if (typed.trim() === "") return null;
  return Math.min(MAX_PERCENT, Math.max(0, Number(typed) || 0));
}
