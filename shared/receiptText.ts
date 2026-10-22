// Reads the plain text a camera-OCR found on a supplier receipt (no AI key needed) into the same shape the AI reader answers with:
// supplier, phone, address, invoice no., date, time, total and the item lines. It only copies what looks right; anything unsure stays empty for the person to type.
export interface ParsedReceipt {
  supplier: string; supplierPhone: string; supplierAddress: string; invoiceNo: string; date: string; time: string; total: number;
  kind: "goods" | "expense"; category: "rental" | "utilities" | "salary" | "other";
  items: { name: string; qty: number; unit: string; packSize: number; unitCost: number; lineTotal: number; matchedProduct: string }[];
}

const MAX_ITEMS = 80;
const MIN_PRICE = 100;
const MAX_QTY = 10_000;
const TOLERANCE = 0.02;
// a number written alone: "330ml" and "1L" are sizes in a name, not prices
const NUMBER_RE = /(?<![A-Za-z0-9])(?:\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?![A-Za-z0-9])/g;
const PHONE_RE = /(?:\+?62|0)[\s-]?\d[\d\s-]{7,13}\d/;
const ADDRESS_RE = /\b(jl\.?|jalan|gang|gg\.?|street|st\.|road|rd\.|blok|kav\.?)\s/i;
const COMPANY_RE = /^(pt|cv|ud|toko|tb|pd|koperasi|supermarket|mart|store|shop|trading|distributor)\b/i;
const SKIP_LINE_RE = /\b(sub\s*total|subtotal|ppn|pajak|tax|service|servis|diskon|discount|kembali|change|tunai|cash|bayar|payment|pembulatan|rounding|ongkir|delivery|kartu|card|debit|kredit|voucher|terima kasih|thank)\b/i;
const TOTAL_RE = /\b(grand\s*total|total\s*(bayar|tagihan|belanja|harga)?|jumlah|amount\s*due|tagihan)\b/i;
const MONTHS: Record<string, number> = { jan: 1, januari: 1, january: 1, feb: 2, februari: 2, february: 2, mar: 3, maret: 3, march: 3, apr: 4, april: 4, mei: 5, may: 5, jun: 6, juni: 6, june: 6, jul: 7, juli: 7, july: 7, agu: 8, agt: 8, agustus: 8, aug: 8, august: 8, sep: 9, sept: 9, september: 9, okt: 10, oct: 10, oktober: 10, october: 10, nov: 11, nop: 11, november: 11, des: 12, dec: 12, desember: 12, december: 12 };

/** "35.000" → 35000, "1,250,000" → 1250000, "4.50" → 4.5: a separator followed by exactly three digits is a thousands mark. */
export function parseAmount(token: string): number {
  const clean = token.trim();
  if (/^\d{1,3}([.,]\d{3})+$/.test(clean)) return Number(clean.replace(/[.,]/g, ""));
  if (/^\d{1,3}([.,]\d{3})+[.,]\d{1,2}$/.test(clean)) {
    const point = Math.max(clean.lastIndexOf("."), clean.lastIndexOf(","));
    return Number(clean.slice(0, point).replace(/[.,]/g, "") + "." + clean.slice(point + 1));
  }
  return Number(clean.replace(",", "."));
}

const pad = (n: number) => String(n).padStart(2, "0");
const fullYear = (y: number) => (y < 100 ? 2000 + y : y);
const validDay = (y: number, m: number, d: number) => y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31;

function findDate(text: string): string {
  const iso = /\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/.exec(text);
  if (iso && validDay(+iso[1], +iso[2], +iso[3])) return `${iso[1]}-${pad(+iso[2])}-${pad(+iso[3])}`;
  const dmy = /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})\b/.exec(text);
  if (dmy && validDay(fullYear(+dmy[3]), +dmy[2], +dmy[1])) return `${fullYear(+dmy[3])}-${pad(+dmy[2])}-${pad(+dmy[1])}`;
  const named = /\b(\d{1,2})\s*([A-Za-z]{3,9})\.?,?\s*(\d{2}|\d{4})\b/.exec(text);
  const month = named ? MONTHS[named[2].toLowerCase()] : 0;
  if (named && month && validDay(fullYear(+named[3]), month, +named[1])) return `${fullYear(+named[3])}-${pad(month)}-${pad(+named[1])}`;
  return "";
}

function findTime(text: string): string {
  const match = /\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\b/.exec(text);
  return match ? `${pad(+match[1])}:${match[2]}` : "";
}

const cleanName = (s: string) => s.replace(/[|_~=]+/g, " ").replace(/^[\s\-*.:#)\]]+|[\s\-*.:#(\[]+$/g, "").replace(/\s+/g, " ").trim();
const letters = (s: string) => (s.match(/[A-Za-zÀ-￿]/g) || []).length;
const near = (a: number, b: number) => b > 0 && Math.abs(a - b) <= Math.max(1, b * TOLERANCE);

function readItem(line: string): ParsedReceipt["items"][number] | null {
  const tokens = Array.from(line.matchAll(NUMBER_RE));
  if (!tokens.length) return null;
  const firstAt = tokens[0].index ?? 0;
  const priceTokens = tokens.filter((t) => parseAmount(t[0]) >= MIN_PRICE);
  if (!priceTokens.length) return null;
  const first = priceTokens[0];
  const nameBefore = cleanName(line.slice(0, first.index ?? 0).replace(/\d+\s*[x×@*]?\s*$/i, ""));
  let name = nameBefore;
  let qty = 1;
  const lead = /^(\d{1,4})\s*[x×]?\s+(.+)$/i.exec(cleanName(line.slice(0, first.index ?? 0)));
  if (lead && Number(lead[1]) > 0 && Number(lead[1]) <= MAX_QTY) { qty = Number(lead[1]); name = cleanName(lead[2].replace(/\d+\s*[x×@*]?\s*$/i, "")); }
  const amounts = priceTokens.map((t) => parseAmount(t[0]));
  const smalls = tokens.filter((t) => parseAmount(t[0]) < MIN_PRICE && Number.isInteger(parseAmount(t[0])) && parseAmount(t[0]) > 0);
  let unitCost = amounts[0];
  let lineTotal = amounts.length > 1 ? amounts[amounts.length - 1] : 0;
  if (amounts.length >= 2) {
    unitCost = amounts[amounts.length - 2];
    const implied = lineTotal / unitCost;
    if (Number.isInteger(Math.round(implied)) && near(Math.round(implied) * unitCost, lineTotal)) qty = Math.max(1, Math.round(implied));
  } else if (smalls.length && (smalls[0].index ?? 0) >= firstAt && (smalls[0].index ?? 0) < (first.index ?? 0)) {
    qty = Math.min(MAX_QTY, parseAmount(smalls[0][0]));
  }
  if (letters(name) < 2) return null;
  return { name, qty, unit: "", packSize: 0, unitCost, lineTotal: lineTotal || unitCost * qty, matchedProduct: "" };
}

function kindOf(text: string): Pick<ParsedReceipt, "kind" | "category"> {
  if (/\b(sewa|rent|kontrakan)\b/i.test(text)) return { kind: "expense", category: "rental" };
  if (/\b(listrik|pln|pdam|internet|wifi|indihome|telkom|token\s*listrik|gas)\b/i.test(text)) return { kind: "expense", category: "utilities" };
  if (/\b(gaji|salary|payroll)\b/i.test(text)) return { kind: "expense", category: "salary" };
  return { kind: "goods", category: "other" };
}

export function parseReceiptText(raw: string): ParsedReceipt {
  const lines = String(raw || "").split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const text = lines.join("\n");
  const phone = PHONE_RE.exec(text)?.[0].replace(/\s+/g, " ").trim() || "";
  const address = lines.find((l) => ADDRESS_RE.test(l)) || "";
  const supplierLine = lines.slice(0, 6).find((l) => COMPANY_RE.test(l)) || lines.slice(0, 6).find((l) => letters(l) >= 3 && !ADDRESS_RE.test(l) && !PHONE_RE.test(l) && !findDate(l) && !/^(struk|nota|invoice|faktur|receipt)/i.test(l));
  const invoiceLine = lines.find((l) => /\b(inv(oice)?|faktur|nota|struk|receipt|bill|no\.?\s*(trans|nota|faktur|inv))\b/i.test(l) && /[A-Z0-9]*\d[A-Z0-9/.-]*/i.test(l) && !ADDRESS_RE.test(l));
  const invoiceNo = invoiceLine ? (/(?:inv(?:oice)?|faktur|nota|struk|receipt|bill|no\.?)\s*[:#.]?\s*([A-Z0-9][A-Z0-9/.-]{2,})/i.exec(invoiceLine)?.[1] || "").replace(/[.]+$/, "") : "";
  const totals = lines.filter((l) => TOTAL_RE.test(l) && !/sub\s*total/i.test(l)).map((l) => Array.from(l.matchAll(NUMBER_RE)).map((t) => parseAmount(t[0])).filter((n) => n >= MIN_PRICE)).filter((n) => n.length).map((n) => n[n.length - 1]);
  const items: ParsedReceipt["items"] = [];
  for (const line of lines) {
    if (SKIP_LINE_RE.test(line) || TOTAL_RE.test(line) || line === address || line === invoiceLine || PHONE_RE.test(line)) continue;
    if (findDate(line) && !/[A-Za-z]{4,}/.test(line.replace(/\b[A-Za-z]{3,9}\b(?=\s*\d{2,4}\b)/g, ""))) continue;
    const item = readItem(line);
    if (item) items.push(item);
    if (items.length >= MAX_ITEMS) break;
  }
  const sum = items.reduce((total, it) => total + it.lineTotal, 0);
  return { supplier: supplierLine ? cleanName(supplierLine) : "", supplierPhone: phone, supplierAddress: address, invoiceNo, date: findDate(text), time: findTime(text), total: totals.length ? Math.max(...totals) : sum, ...kindOf(text), items };
}
