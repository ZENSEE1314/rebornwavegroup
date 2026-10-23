// Commission a staff member earns on one kind of item (a ladies' drink): a % of what the customer paid for the line, or a fixed amount for every unit.
export type ItemCommissionKind = "percent" | "fixed";

export interface ItemCommissionRule { kind?: string | null; value?: string | number | null }

export const MAX_PERCENT = 100;
export const MAX_ELIGIBLE_STAFF = 100;

/** The staff an item's commission is limited to, saved as a JSON list of user ids; empty = any staff member. */
export function eligibleStaffOf(raw: unknown): string[] {
  let list: unknown = raw;
  if (typeof raw === "string") { try { list = JSON.parse(raw || "[]"); } catch { list = []; } }
  if (!Array.isArray(list)) return [];
  return Array.from(new Set(list.map((id) => String(id).trim()).filter(Boolean))).slice(0, MAX_ELIGIBLE_STAFF);
}

/** True when this person may earn the item's commission (nobody is excluded while the item has no list). */
export const canEarn = (eligible: string[], userId: string | null | undefined): boolean => !!userId && (eligible.length === 0 || eligible.includes(userId));

/** The rule saved on an item: a known kind with a value above 0, else null (no commission). */
export function ruleOf(rule: ItemCommissionRule | null | undefined): { kind: ItemCommissionKind; value: number } | null {
  const value = Number(rule?.value);
  if ((rule?.kind !== "percent" && rule?.kind !== "fixed") || !Number.isFinite(value) || value <= 0) return null;
  return { kind: rule.kind, value: rule.kind === "percent" ? Math.min(MAX_PERCENT, value) : value };
}

/** What a line earns. A free unit (line total 0) earns nothing; a fixed amount is per unit and never more than the line was paid. */
export function commissionFor(rule: ItemCommissionRule | null | undefined, lineTotal: number, qty: number, decimals = 0): number {
  const r = ruleOf(rule);
  const paid = Number(lineTotal) || 0;
  if (!r || paid <= 0) return 0;
  const raw = r.kind === "percent" ? (paid * r.value) / 100 : Math.min(paid, r.value * Math.max(1, Number(qty) || 1));
  const factor = 10 ** decimals;
  return Math.round(raw * factor) / factor;
}
