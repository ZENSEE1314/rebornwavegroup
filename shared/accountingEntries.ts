// Admin › Accounting › Entries: the ledger lines laid out by the date of the item (the day typed on the bill, the delivery day) in venue days (08:00 to 08:00), one block per day with what came in and went out,
// and the lines that look keyed in twice. Pure functions, so the screen only draws what they return.

export interface LedgerLine { id: number; kind: string; category: string; amount: number | string; note: string | null; createdAt: string; refType: string | null }
export interface DayGroup<T extends LedgerLine> { day: string; lines: T[]; income: number; expense: number }

export const SALE_REF = "pos_order";
// Lines a person types in or uploads: these are the ones that can be keyed twice. Sales, refunds, payroll and the like come from the system.
const KEYED_REFS: (string | null)[] = [null, "stock_movement", "receipt", "receipt_expense", "expense_upload", "stock_out"];
// The venue day runs 08:00 to 08:00 (Jakarta time), the same rule as the server's VENUE_DAY_OF (the time minus one hour, read as a UTC date):
// a line made at 03:00 belongs to the night before, not to the next calendar day.
const VENUE_DAY_SHIFT_MS = 3_600_000;

export const dayKeyOf = (value: string | Date): string => new Date(new Date(value).getTime() - VENUE_DAY_SHIFT_MS).toISOString().slice(0, 10);

const newestFirst = <T extends LedgerLine>(a: T, b: T) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id - a.id;

export function groupByDay<T extends LedgerLine>(lines: T[]): DayGroup<T>[] {
  const groups = new Map<string, DayGroup<T>>();
  for (const line of [...lines].sort(newestFirst)) {
    const day = dayKeyOf(line.createdAt);
    const group = groups.get(day) || { day, lines: [], income: 0, expense: 0 };
    group.lines.push(line);
    if (line.kind === "income") group.income += Number(line.amount) || 0;
    else group.expense += Number(line.amount) || 0;
    groups.set(day, group);
  }
  return Array.from(groups.values());
}

const signatureOf = (line: LedgerLine) => [line.kind, line.category, Math.round((Number(line.amount) || 0) * 100), dayKeyOf(line.createdAt), (line.note || "").trim().toLowerCase().replace(/\s+/g, " ")].join("|");

// Groups of two or more typed-in lines with the same type, category, amount, day and text. The oldest line of a group is the one to keep, so it comes first.
export function findDuplicates<T extends LedgerLine>(lines: T[]): T[][] {
  const bySignature = new Map<string, T[]>();
  for (const line of lines) {
    if (!KEYED_REFS.includes(line.refType) || !(Number(line.amount) > 0)) continue;
    const key = signatureOf(line);
    bySignature.set(key, [...(bySignature.get(key) || []), line]);
  }
  return Array.from(bySignature.values()).filter((group) => group.length > 1).map((group) => group.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id - b.id));
}
