// Inventory from a spreadsheet: the browser reads the Excel / CSV file into rows; the server cleans them here
// and then creates new items / updates existing ones (matched by name).
export interface ImportRow { name: string; category: string; price: number | null; cost: number | null; stock: number | null; supplier: string }

export const MAX_IMPORT_ROWS = 1000;
const MAX_NAME = 120;
const MAX_TEXT = 80;
const DEFAULT_CATEGORY = "General";

const text = (value: unknown, max: number) => (value === null || value === undefined ? "" : String(value).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max));

/** "1,500,000" / "1.500.000" / "Rp 25.000,50" / 12.5 → a number; anything unreadable → null. */
export function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let raw = text(value, 40).replace(/[^\d.,-]/g, "");
  if (!raw || raw === "-") return null;
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(raw)) raw = raw.replace(/,/g, "");
  else if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(raw)) raw = raw.replace(/\./g, "").replace(",", ".");
  else raw = raw.replace(",", ".");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function cleanImportRows(raw: unknown): { rows: ImportRow[]; skipped: number } {
  const list = Array.isArray(raw) ? raw.slice(0, MAX_IMPORT_ROWS) : [];
  const rows: ImportRow[] = [];
  let skipped = 0;
  for (const item of list) {
    const name = text(item?.name, MAX_NAME);
    if (!name) { skipped++; continue; }
    const price = toNumber(item?.price);
    const cost = toNumber(item?.cost);
    const stock = toNumber(item?.stock);
    rows.push({
      name, category: text(item?.category, MAX_TEXT) || DEFAULT_CATEGORY, supplier: text(item?.supplier, MAX_TEXT),
      price: price !== null && price >= 0 ? price : null,
      cost: cost !== null && cost >= 0 ? cost : null,
      stock: stock !== null ? Math.max(0, Math.floor(stock)) : null,
    });
  }
  return { rows, skipped };
}
