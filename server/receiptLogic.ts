// Supplier receipts (Admin › Inventory / Accounting › "Scan a supplier receipt"): the AI reads the photo, and these
// helpers tidy what it read and match each line to an item already in the inventory, so the admin only checks and saves.

export interface ReadLine { name: string; qty: number; unitCost: number; lineTotal?: number; matchedProduct?: string }
export interface ReadReceipt { supplier: string; supplierPhone: string; invoiceNo: string; date: string; total: number; items: ReadLine[] }
export interface ProductLite { id: number; name: string }
export interface ReceiptLine { name: string; qty: number; unitCost: number; productId: number | null }

const MAX_LINES = 80;
const MATCH_AT = 0.6;

const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };
const text = (v: unknown, max = 120) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Lowercase, punctuation out, "620 ML" → "620ml", so the same item written two ways compares equal. */
export function normName(s: string): string {
  return s.toLowerCase()
    .replace(/[^0-9a-z\u00c0-\uffff]+/g, " ")
    .replace(/(\d)\s+(ml|l|ltr|g|gr|kg|cl|oz|pcs|pc|btl)\b/g, "$1$2")
    .replace(/\s+/g, " ").trim();
}

const bigrams = (s: string) => { const t = s.replace(/ /g, ""); const out: string[] = []; for (let i = 0; i < t.length - 1; i++) out.push(t.slice(i, i + 2)); return out; };

/** 0..1: how alike two item names are (whole words first, then letter pairs for short / abbreviated names). */
export function nameScore(a: string, b: string): number {
  const x = normName(a), y = normName(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const wx = new Set(x.split(" ")), wy = new Set(y.split(" "));
  const shared = Array.from(wx).filter((w) => wy.has(w)).length;
  const words = shared / Math.max(wx.size, wy.size);
  const bx = bigrams(x), by = bigrams(y);
  const pool = [...by];
  let hits = 0;
  for (const g of bx) { const i = pool.indexOf(g); if (i >= 0) { hits++; pool.splice(i, 1); } }
  const letters = bx.length + by.length ? (2 * hits) / (bx.length + by.length) : 0;
  return Math.max(words, letters);
}

/** The inventory item a receipt line is, or null for a new item: the AI's own pick when it names a real item, else the closest name. */
export function matchProduct(line: Pick<ReadLine, "name" | "matchedProduct">, products: ProductLite[]): number | null {
  const pick = normName(line.matchedProduct || "");
  if (pick) { const exact = products.find((p) => normName(p.name) === pick); if (exact) return exact.id; }
  let best: ProductLite | null = null, bestScore = 0;
  for (const p of products) { const s = nameScore(line.name, p.name); if (s > bestScore) { best = p; bestScore = s; } }
  return best && bestScore >= MATCH_AT ? best.id : null;
}

/** What the AI read, made safe to show: no empty lines, whole quantities, a unit price on every line. */
export function cleanReceipt(raw: any): ReadReceipt {
  const items: ReadLine[] = [];
  for (const it of Array.isArray(raw?.items) ? raw.items : []) {
    const name = text(it?.name);
    if (!name) continue;
    const qty = Math.max(1, Math.round(num(it?.qty) || 1));
    const lineTotal = num(it?.lineTotal);
    const unitCost = num(it?.unitCost) || (lineTotal ? lineTotal / qty : 0);
    items.push({ name, qty, unitCost, lineTotal: lineTotal || unitCost * qty, matchedProduct: text(it?.matchedProduct) });
    if (items.length >= MAX_LINES) break;
  }
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text(raw?.date)) ? text(raw.date) : "";
  return { supplier: text(raw?.supplier), supplierPhone: text(raw?.supplierPhone, 40), invoiceNo: text(raw?.invoiceNo, 60), date, total: num(raw?.total), items };
}

/** Lines the admin sends back to save: name, quantity ≥ 1, a price ≥ 0, and an item or a new name. */
export function cleanSaveLines(raw: unknown): ReceiptLine[] {
  const out: ReceiptLine[] = [];
  for (const it of Array.isArray(raw) ? raw : []) {
    const name = text((it as any)?.name);
    const qty = Math.floor(Number((it as any)?.qty) || 0);
    const unitCost = Math.max(0, Number((it as any)?.unitCost) || 0);
    const productId = Number((it as any)?.productId) > 0 ? Number((it as any).productId) : null;
    if (qty < 1 || (!productId && !name)) continue;
    out.push({ name, qty, unitCost, productId });
    if (out.length >= MAX_LINES) break;
  }
  return out;
}

/** The accounting line for a saved receipt: "Receipt INV-1 from PT Bir (14 Oct): 24 × Bintang, 6 × Cola". */
export function receiptNote(r: { supplier: string; invoiceNo: string; date: string }, lines: Array<{ name: string; qty: number }>): string {
  const head = `Receipt${r.invoiceNo ? ` ${r.invoiceNo}` : ""}${r.supplier ? ` from ${r.supplier}` : ""}${r.date ? ` (${r.date})` : ""}`;
  const body = lines.map((l) => `${l.qty} × ${l.name}`).join(", ");
  return `${head}: ${body}`.slice(0, 900);
}
