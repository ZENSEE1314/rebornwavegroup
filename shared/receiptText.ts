// Reads the plain text a camera-OCR found on a supplier receipt (no AI key needed) into the same shape the AI reader answers with:
// supplier, phone, address, invoice no., date, time, total and the item lines. It only copies what looks right; anything unsure stays empty for the person to type.
export interface ParsedReceipt {
  supplier: string; supplierPhone: string; supplierAddress: string; invoiceNo: string; date: string; time: string; total: number;
  kind: "goods" | "expense"; category: "rental" | "utilities" | "salary" | "other";
  items: { name: string; qty: number; unit: string; packSize: number; unitCost: number; lineTotal: number; matchedProduct: string }[];
}

const MAX_ITEMS = 80;
const MIN_PRICE = 100;
const MAX_SHORT_WORD_SHARE = 0.3; // real descriptions have few one- or two-letter words
const MIN_UNIT_PRICE = 1000; // no goods are priced under Rp 1,000: a smaller figure is a stray number
const MAX_QTY = 10_000;
const TOLERANCE = 0.005;
const ADDRESS_LOOKAHEAD_LINES = 5;
// a number written alone: "330ml" and "1L" are sizes in a name, not prices
const NUMBER_RE = /(?<![A-Za-z0-9])(?:\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?![A-Za-z0-9])/g;
const CURRENCY_RE = /\b(rp|idr|sgd|usd|s\$)\.?\s*(?=\d)/gi;
const MOBILE_RE = /(?:\+?62|0)8\d{1,2}[\s-]?\d{3,4}[\s-]?\d{3,5}/;
const LANDLINE_RE = /\(0\d{2,4}\)\s?\d{5,8}/;
const ADDRESS_WORDS_RE = /\b(jl\.?|jalan|gang|gg\.?|street|st\.|road|rd\.|blok|block|kav\.?|komp(lek)?\.?|ruko|industrial|workshop|sei)\b/i;
const BUYER_SECTION_RE = /ship\s*\/?\s*bill|bill\s*to|ship\s*to|kepada|dikirim/i;
const COMPANY_RE = /^(pt|cv|ud|toko|tb|pd|koperasi|supermarket|mart|store|shop|trading|distributor)\b/i;
const DOCUMENT_WORD_RE = /\s+(invoice|faktur|nota|struk|receipt|bill)\b.*$/i;
const SKIP_LINE_RE = /\b(sub\s*total|subtotal|ppn|pajak|tax|service|servis|diskon|discount|kembali|change|tunai|cash|bayar|payment|pembulatan|rounding|ongkir|delivery|kartu|card|debit|kredit|voucher|terima kasih|thank|rek|rekening|bca|danamon|mandiri|bni)\b|a\/n|a\/c|\balc\b/i;
const TOTAL_RE = /\b(grand\s*total|total\s*(bayar|tagihan|belanja|harga)?|jumlah|amount\s*due|sale\s*amount|balance|tagihan)\b/i;
const UNIT_WORD_RE = /^(pcs?|pes|unit|units|btl|botol|ctn|carton|karton|dus|box|krat|pack|pak|set|kg|gr|ltr|lt)$/i;
const INVOICE_RE = /\b(?:invoice|inv|faktur|nota|struk|receipt|bill)[ \t]*(?:no\.?|number|#)?[ \t]*[:#.]?[ \t]*[^\w\s]?([A-Z0-9][A-Z0-9/.-]*\d[A-Z0-9/.-]*)/i;
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

/** Every date on the receipt; the invoice date is the earliest (a due date or ship date comes after it). */
function findDate(text: string): string {
  const found: string[] = [];
  for (const m of Array.from(text.matchAll(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/g))) if (validDay(+m[1], +m[2], +m[3])) found.push(`${m[1]}-${pad(+m[2])}-${pad(+m[3])}`);
  for (const m of Array.from(text.matchAll(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})\b/g))) if (validDay(fullYear(+m[3]), +m[2], +m[1])) found.push(`${fullYear(+m[3])}-${pad(+m[2])}-${pad(+m[1])}`);
  for (const m of Array.from(text.matchAll(/\b(\d{1,2})\s*([A-Za-z]{3,9})\.?,?\s*(\d{2}|\d{4})\b/g))) {
    const month = MONTHS[m[2].toLowerCase()];
    if (month && validDay(fullYear(+m[3]), month, +m[1])) found.push(`${fullYear(+m[3])}-${pad(month)}-${pad(+m[1])}`);
  }
  return found.sort()[0] || "";
}

function findTime(text: string): string {
  const match = /\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\b/.exec(text);
  return match ? `${pad(+match[1])}:${match[2]}` : "";
}

const cleanName = (s: string) => s.replace(/[|_~=]+/g, " ").replace(/^[\s\-*.:#)\]]+|[\s\-*.:#(\[]+$/g, "").replace(/\s+/g, " ").trim();
const letters = (s: string) => (s.match(/[A-Za-zÀ-￿]/g) || []).length;
const near = (a: number, b: number) => b > 0 && Math.abs(a - b) <= Math.max(1, b * TOLERANCE);

/** A description made of real words: at least half of its words have three or more letters, and one has four (smudged print comes out as "Yel Le omer we WRG TT ee"). */
function isReadableName(name: string): boolean {
  const words = name.split(/\s+/).filter(Boolean);
  const short = words.filter((w) => letters(w) <= 2).length;
  return words.some((w) => letters(w) >= 4) && short <= Math.max(1, Math.floor(words.length * MAX_SHORT_WORD_SHARE));
}

/** Words before the price: in a table row the quantity, unit and item code come first and the description after them ("480 pcs 01.1.101 CBN2D 24 Carlsberg Bottle 330ml"). */
function itemNameFrom(before: string): string {
  const withoutTail = before.replace(/\s*\d*\s*[x×@*]\s*$/i, "").replace(/\s+\d+\s*$/, "");
  const words = withoutTail.split(/\s+/).filter(Boolean);
  const isNumberOrUnit = (w: string) => /^[\d.,:/-]+$/.test(w) || UNIT_WORD_RE.test(w);
  const isCode = (w: string) => /\d/.test(w) && /^[A-Z0-9./-]+$/.test(w);
  // The table columns start at the first number or unit word (one or two noise words may sit before it); a lone "Es" before "Batu" is part of the name.
  const first = words.findIndex(isNumberOrUnit);
  if (first < 0 || first > 2) return cleanName(withoutTail);
  let start = first;
  while (start < words.length && (isNumberOrUnit(words[start]) || isCode(words[start]))) start++;
  return cleanName(words.slice(start).join(" ") || withoutTail);
}

function readItem(line: string, documentTotal: number): ParsedReceipt["items"][number] | null {
  const nums = Array.from(line.matchAll(NUMBER_RE)).map((t) => ({ at: t.index ?? 0, value: parseAmount(t[0]) }));
  const money = nums.filter((n) => n.value >= MIN_PRICE);
  if (!money.length) return null;
  type Money = (typeof money)[number];
  let best: { unit: Money; total: Money; qty: number } | null = null;
  // A quantity and a unit price that make the document's total (a smudged line total on the page cannot spoil it): 480 × 18,541.67 = 8,900,000.
  if (documentTotal > 0) {
    for (let i = 0; i < money.length && !best; i++) {
      for (let j = 0; j < money.length && !best; j++) {
        if (i !== j && Number.isInteger(money[i].value) && money[i].value <= MAX_QTY && near(money[i].value * money[j].value, documentTotal)) best = { unit: money[j], total: { at: money[j].at, value: money[i].value * money[j].value }, qty: money[i].value };
      }
    }
  }
  // Otherwise a unit price and a line total tie together through the quantity: 24 × 20,000 = 480,000.
  // A pair whose quantity is also printed on the line ("480 pcs") beats one that only happens to divide ("1875 × 480").
  if (!best) {
    const printed = new Set(nums.filter((n) => Number.isInteger(n.value) && n.value > 0).map((n) => n.value));
    let bestPrinted = false;
    for (let i = 0; i < money.length; i++) {
      for (let j = i + 1; j < money.length; j++) {
        const qty = Math.round(money[j].value / money[i].value);
        if (!(qty >= 1 && qty <= MAX_QTY && near(qty * money[i].value, money[j].value))) continue;
        const isPrinted = printed.has(qty);
        if (!best || (isPrinted && !bestPrinted) || (isPrinted === bestPrinted && money[j].value > best.total.value)) { best = { unit: money[i], total: money[j], qty }; bestPrinted = isPrinted; }
      }
    }
    // Nothing ties together (a smudged total) but the row says "480 pcs": that is the quantity and the next amount after it is the price.
    const qtyWithUnit = /(\d{1,5})\s*(pcs?|pes|unit|btl|botol|ctn|karton|dus|box|krat|pack|pak)\b/i.exec(line);
    if (qtyWithUnit && (!best || !bestPrinted)) {
      const after = (qtyWithUnit.index ?? 0) + qtyWithUnit[0].length;
      const price = money.find((n) => n.at >= after && n.value !== Number(qtyWithUnit[1]));
      if (price) best = { unit: price, total: { at: price.at, value: Number(qtyWithUnit[1]) * price.value }, qty: Number(qtyWithUnit[1]) };
    }
  }
  if (!best && money.length > 1 && money[money.length - 1].value < money[money.length - 2].value) return null; // numbers that do not read as price then total (a bank account line)
  let name: string;
  let qty = 1;
  let unitCost: number;
  let lineTotal: number;
  if (best) {
    name = itemNameFrom(line.slice(0, best.unit.at));
    qty = best.qty; unitCost = best.unit.value; lineTotal = best.total.value;
  } else {
    const first = money[0];
    name = itemNameFrom(line.slice(0, first.at));
    unitCost = money.length > 1 ? money[money.length - 2].value : first.value;
    lineTotal = money.length > 1 ? money[money.length - 1].value : 0;
    const lead = /^(\d{1,4})\s*[x×]?\s+/.exec(line.trim());
    if (lead && Number(lead[1]) > 0) qty = Number(lead[1]);
  }
  if (letters(name) < 2 || unitCost < MIN_UNIT_PRICE || !isReadableName(name)) return null;
  const unit =(line.match(/\b(pcs?|pes|btl|botol|ctn|karton|dus|box|krat|pack|pak)\b/i)?.[1] || "").toLowerCase();
  return { name, qty, unit, packSize: 0, unitCost, lineTotal: lineTotal || unitCost * qty, matchedProduct: "" };
}

function kindOf(text: string): Pick<ParsedReceipt, "kind" | "category"> {
  if (/\b(sewa|rent|kontrakan)\b/i.test(text)) return { kind: "expense", category: "rental" };
  if (/\b(listrik|pln|pdam|internet|wifi|indihome|telkom|token\s*listrik|gas)\b/i.test(text)) return { kind: "expense", category: "utilities" };
  if (/\b(gaji|salary|payroll)\b/i.test(text)) return { kind: "expense", category: "salary" };
  return { kind: "goods", category: "other" };
}

/** The seller's address: the lines under the company name, before the "Ship / Bill To" block (which is the buyer's). */
function findAddress(lines: string[], supplierIndex: number): string {
  const from = supplierIndex >= 0 ? supplierIndex + 1 : 0;
  const parts: string[] = [];
  for (const line of lines.slice(from, from + ADDRESS_LOOKAHEAD_LINES)) {
    if (!ADDRESS_WORDS_RE.test(line)) { if (parts.length) break; continue; }
    const cut = line.search(BUYER_SECTION_RE);
    const words = (cut >= 0 ? line.slice(0, cut) : line).split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)); // loose marks the OCR saw (®, ¥, \) are dropped
    while (words.length > 2 && /^[A-Za-z0-9]$/.test(words[words.length - 1])) words.pop();
    while (words.length > 1 && /^\W*[A-Za-z]{1,2}\W*$/.test(words[0]) && !ADDRESS_WORDS_RE.test(words[0])) words.shift(); // OCR noise before the words ("Ry Komp. ...")
    const clean = cleanName(words.join(" "));
    if (clean) parts.push(clean);
    if (parts.length >= 2) break;
  }
  return parts.join(", ");
}

export function parseReceiptText(raw: string): ParsedReceipt {
  const lines = String(raw || "").split(/\r?\n/).map((l) => l.replace(CURRENCY_RE, " ").replace(/\s+/g, " ").trim()).filter(Boolean);
  const text = lines.join("\n");
  const phone = (MOBILE_RE.exec(text) || LANDLINE_RE.exec(text))?.[0].replace(/\s+/g, " ").trim() || "";
  const supplierIndex = lines.slice(0, 6).findIndex((l) => COMPANY_RE.test(l));
  const fallbackIndex = lines.slice(0, 6).findIndex((l) => isReadableName(l.replace(DOCUMENT_WORD_RE, "")) && !ADDRESS_WORDS_RE.test(l) && !MOBILE_RE.test(l) && !LANDLINE_RE.test(l) && Array.from(l.matchAll(NUMBER_RE)).filter((t) => parseAmount(t[0]) >= MIN_PRICE).length < 2 && !findDate(l) && !/^(struk|nota|invoice|faktur|receipt)/i.test(l));
  const supplierAt = supplierIndex >= 0 ? supplierIndex : fallbackIndex;
  const supplier = supplierAt >= 0 ? cleanName(lines[supplierAt].replace(DOCUMENT_WORD_RE, "")) : "";
  const address = findAddress(lines, supplierAt);
  const invoiceNo = (INVOICE_RE.exec(text)?.[1] || "").replace(/[.]+$/, "");
  const totals = lines.filter((l) => TOTAL_RE.test(l) && !/sub\s*total/i.test(l)).map((l) => Array.from(l.matchAll(NUMBER_RE)).map((t) => parseAmount(t[0])).filter((n) => n >= MIN_PRICE)).filter((n) => n.length).map((n) => n[n.length - 1]);
  const items: ParsedReceipt["items"] = [];
  for (const line of lines) {
    if (SKIP_LINE_RE.test(line) || TOTAL_RE.test(line) || MOBILE_RE.test(line) || LANDLINE_RE.test(line) || (invoiceNo && line.includes(invoiceNo))) continue;
    if (ADDRESS_WORDS_RE.test(line) && !/\d{3,}[.,]\d{3}/.test(line)) continue;
    if (findDate(line) && !/[A-Za-z]{4,}/.test(line.replace(/\b[A-Za-z]{3,9}\b(?=\s*\d{2,4}\b)/g, ""))) continue;
    const item = readItem(line, totals.length ? Math.max(...totals) : 0);
    if (item) items.push(item);
    if (items.length >= MAX_ITEMS) break;
  }
  const sum = items.reduce((total, it) => total + it.lineTotal, 0);
  // a total smaller than one of its own lines was smudged: the lines' sum is used instead
  const printedTotal = totals.length ? Math.max(...totals) : 0;
  const largestLine = Math.max(0, ...items.map((it) => it.lineTotal));
  const total = printedTotal > 0 && (printedTotal >= largestLine || near(printedTotal, largestLine)) ? printedTotal : sum;
  return { supplier, supplierPhone: phone, supplierAddress: address, invoiceNo, date: findDate(text), time: findTime(text), total, ...kindOf(text), items };
}

/** How much of a reading looks right (higher is better): used to pick the better of two readings of one photo. */
export function receiptTextScore(read: ParsedReceipt): number {
  let score = 0;
  if (read.supplier) score += 2;
  if (read.date) score += 1;
  if (read.invoiceNo) score += 1;
  if (read.supplierPhone) score += 1;
  if (read.total > 0) score += 1;
  for (const item of read.items) score += near(item.qty * item.unitCost, item.lineTotal) ? 3 : -1;
  return score;
}
