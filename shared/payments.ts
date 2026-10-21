// A bill paid with several methods together: RP credits and card take exact amounts, the rest is cash (the customer may hand over more and get change).
// The POS shows this live and the server checks it again before it takes the payment.
const CENTS = 100;
const round = (value: number) => Math.round(value * CENTS) / CENTS;

export type PayMethod = "cash" | "card" | "credits";
export interface PayPart { method: PayMethod; amount: number; reference?: string }
export interface SplitInput { cash: number; card: number; credits: number; cardReference: string }
export type SplitProblem = "tooMuch" | "needCardReference" | "cashShort";

export interface SplitPlan {
  /** What each method really pays (cash = the part of the bill, not what was handed over). */
  parts: PayPart[];
  /** Cash handed over and the change given back (0 when no cash is needed). */
  cashReceived: number;
  change: number;
  /** The part of the bill still not covered by the amounts entered. */
  left: number;
  problem: SplitProblem | null;
}

export function planSplit(input: SplitInput, due: number): SplitPlan {
  const credits = Math.max(0, round(input.credits));
  const card = Math.max(0, round(input.card));
  const cashHanded = Math.max(0, round(input.cash));
  const cashNeeded = Math.max(0, round(due - credits - card));
  const reference = input.cardReference.trim();
  const parts: PayPart[] = [];
  if (credits > 0) parts.push({ method: "credits", amount: credits });
  if (card > 0) parts.push({ method: "card", amount: card, reference });
  if (cashNeeded > 0) parts.push({ method: "cash", amount: cashNeeded });
  const left = Math.max(0, round(cashNeeded - cashHanded));
  const problem: SplitProblem | null = credits + card > due ? "tooMuch" : card > 0 && !reference ? "needCardReference" : cashNeeded > 0 && cashHanded < cashNeeded ? "cashShort" : null;
  return { parts, cashReceived: cashNeeded > 0 ? cashHanded : 0, change: cashNeeded > 0 ? Math.max(0, round(cashHanded - cashNeeded)) : 0, left, problem };
}

/** A saved split (JSON on the ticket) read back safely. */
export function readSplit(json: string | null | undefined): PayPart[] {
  if (!json) return [];
  try {
    const list = JSON.parse(json);
    return Array.isArray(list) ? list.filter((part) => part && ["cash", "card", "credits"].includes(part.method) && Number(part.amount) > 0).map((part) => ({ method: part.method as PayMethod, amount: Number(part.amount), reference: part.reference ? String(part.reference) : undefined })) : [];
  } catch {
    return [];
  }
}
