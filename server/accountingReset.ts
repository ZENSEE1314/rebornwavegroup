// Clearing the accounting (ledger) and starting again from the stock that was just added: the Excel inventory import puts stock in
// (`stock_movements`, reason stock_in, note "Excel import…") but books no money, so after the old ledger is cleared each of those deliveries
// becomes one "purchase" expense again (quantity × unit cost) — the same entry a manual stock-in makes.
// `source` names where the delivery came from in the note ("Excel import" when left out; "" for none).
export interface ImportedDelivery { id: number; productName: string; delta: number; unitCost: string | number | null; supplier?: string | null; createdAt: Date | string | null; source?: string }
export interface PurchaseEntry { kind: "expense"; category: "purchase"; amount: string; note: string; refType: "stock_movement"; refId: string; createdAt: Date | null }

export const IMPORT_NOTE_PATTERN = "Excel import%";

/** One ledger entry for a delivery, or null when there is nothing to book (no quantity or no cost). */
export function purchaseEntryFromDelivery(m: ImportedDelivery, decimals = 0): PurchaseEntry | null {
  const unit = Number(m.unitCost);
  if (!(m.delta > 0) || !(unit > 0)) return null;
  const amount = Number((m.delta * unit).toFixed(decimals));
  const supplier = m.supplier ? ` from ${m.supplier}` : "";
  const tag = m.source === undefined ? "Excel import" : m.source;
  return {
    kind: "expense", category: "purchase", amount: String(amount),
    note: `Stock in: ${m.delta} × ${m.productName} @ ${unit}${supplier}${tag ? ` (${tag})` : ""}`,
    refType: "stock_movement", refId: String(m.id), createdAt: m.createdAt ? new Date(m.createdAt) : null,
  };
}

/** Where a stock delivery came from, by its stock-history note: the Excel import, a scanned receipt, or a manual stock-in. */
export function deliverySource(note: string | null | undefined): string {
  const n = String(note || "");
  if (/^Excel import/i.test(n)) return "Excel import";
  if (/^Receipt/i.test(n)) return n.slice(0, 60);
  return "";
}
