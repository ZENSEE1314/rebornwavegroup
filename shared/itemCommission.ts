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

export interface CommissionPart { staffId: string; name: string; qty: number }

/** One bill line shared between staff ("2 of the 3 beers were sold by Ana"): the saved JSON list cleaned up so the units never add up to more than the line has. */
export function splitPartsOf(raw: unknown, lineQty: number): CommissionPart[] {
  let list: unknown = raw;
  if (typeof raw === "string") { try { list = JSON.parse(raw || "[]"); } catch { list = []; } }
  if (!Array.isArray(list)) return [];
  const parts: CommissionPart[] = [];
  let left = Math.max(0, Math.floor(Number(lineQty) || 0));
  for (const entry of list) {
    const staffId = String(entry?.staffId ?? "").trim();
    const qty = Math.min(left, Math.floor(Number(entry?.qty) || 0));
    if (!staffId || qty < 1) continue;
    parts.push({ staffId, name: String(entry?.name ?? "").slice(0, 80), qty });
    left -= qty;
  }
  return parts;
}

/** What one person's share of a line earns: the line total is split by units, so a fixed amount stays per unit and a percent follows the share. */
export function commissionForPart(rule: ItemCommissionRule | null | undefined, lineTotal: number, lineQty: number, partQty: number, decimals = 0): number {
  const qty = Math.max(1, Number(lineQty) || 1);
  return commissionFor(rule, (Number(lineTotal) || 0) * Math.min(partQty, qty) / qty, partQty, decimals);
}
