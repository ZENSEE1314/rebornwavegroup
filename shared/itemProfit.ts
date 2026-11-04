// Admin › Accounting › Reports › Food & drinks: what each item sold for, cost, gave away as promotion and paid as commission, split into food and drinks,
// and each of those split again into happy hour sales and normal sales.
import { stationFor } from "./station";

export const MENU_KINDS = ["food", "drink", "other"] as const;
export type MenuKind = (typeof MENU_KINDS)[number];
export const SALE_TIMES = ["happy", "regular"] as const;
export type SaleTime = (typeof SALE_TIMES)[number];

export interface SoldLine {
  /** The receipt (bill) number the line is on, and when it was ordered (ISO), so a report number can be traced to the sales behind it. */
  orderNo: string;
  at: string;
  /** Who the bill is for, the table, and what the whole bill came to (for the receipt view). */
  customer: string;
  table: string;
  billTotal: number;
  /** Who ordered the line (the staff member, or the member through the app). */
  by: string;
  productId: number | null;
  name: string;
  category: string | null;
  station: string | null;
  isService: boolean;
  isPackage: boolean;
  /** The line was ordered inside its item's happy hours (the window and the weekdays set on the item). */
  inHappyHour: boolean;
  qty: number;
  lineTotal: number;
  /** The item's regular selling price for one unit (0 when the line is not a stock item). */
  regularPrice: number;
  /** What the units cost; the item's own cost times the quantity when no delivery history is known. */
  cost: number;
  /** Item commission paid to staff for this line. */
  commission: number;
}

export interface Totals { qty: number; revenue: number; cost: number; promotion: number; commission: number; profit: number }
export interface ItemProfit extends Totals {
  key: string;
  name: string;
  kind: MenuKind;
  bySale: Record<SaleTime, Totals>;
}
/** One sold line with what it gave: the rows behind every number of the report. */
export interface SaleRow extends Omit<Totals, "profit"> {
  orderNo: string;
  at: string;
  by: string;
  name: string;
  kind: MenuKind;
  time: SaleTime;
  profit: number;
}
/** A whole bill: who bought, where, when, what the bill came to, and every line on it marked happy hour or normal. */
export interface ReceiptRow {
  orderNo: string;
  customer: string;
  table: string;
  at: string;
  billTotal: number;
  hasHappy: boolean;
  lines: SaleRow[];
}
/** An item made and then spilled, broken or dropped (the customer did not pay for it). */
export interface WasteLine {
  orderNo: string;
  at: string;
  productId: number | null;
  name: string;
  category: string | null;
  station: string | null;
  isService: boolean;
  isPackage: boolean;
  qty: number;
  /** What one unit cost (the item's own cost). */
  unitCost: number;
  reason: string;
  by: string;
}
export interface WasteRow { orderNo: string; at: string; name: string; kind: MenuKind; qty: number; cost: number; reason: string; by: string }
export interface WastageReport {
  kinds: Record<MenuKind, { qty: number; cost: number }>;
  total: { qty: number; cost: number };
  rows: WasteRow[];
}
/** What the report route answers: the item report plus the wastage. */
export interface ItemProfitResponse extends ItemProfitReport { wastage: WastageReport }
export interface ItemProfitReport {
  receipts: ReceiptRow[];
  sales: SaleRow[];
  items: ItemProfit[];
  kinds: Record<MenuKind, Totals & { bySale: Record<SaleTime, Totals> }>;
  total: Totals & { bySale: Record<SaleTime, Totals> };
}

const CENTS = 100;
const round = (value: number) => Math.round(value * CENTS) / CENTS;
const emptyTotals = (): Totals => ({ qty: 0, revenue: 0, cost: 0, promotion: 0, commission: 0, profit: 0 });
const emptySplit = (): Record<SaleTime, Totals> => ({ happy: emptyTotals(), regular: emptyTotals() });

/** Drinks are what the bar makes, food is what the kitchen and the dessert counter make; services, packages and typed-in lines are "other". */
export function kindOf(line: Pick<SoldLine, "productId" | "category" | "station" | "isService" | "isPackage">): MenuKind {
  if (!line.productId || line.isService || line.isPackage) return "other";
  return stationFor(line.category, line.station) === "bar" ? "drink" : "food";
}

/** Money given away on a line: what the units would have cost at the regular price minus what was charged (happy hour, free units, a cashier discount). */
export const promotionOf = (line: Pick<SoldLine, "productId" | "qty" | "lineTotal" | "regularPrice">): number =>
  line.productId && line.regularPrice > 0 ? Math.max(0, line.regularPrice * line.qty - line.lineTotal) : 0;

/** A happy hour sale is a line ordered during its item's happy hours, at whatever price it was charged; everything else is a normal sale, so the two never share cost or revenue. */
export const saleTimeOf = (line: Pick<SoldLine, "inHappyHour">): SaleTime => (line.inHappyHour ? "happy" : "regular");

const addTo = (totals: Totals, row: Omit<Totals, "profit">) => {
  totals.qty += row.qty; totals.revenue += row.revenue; totals.cost += row.cost; totals.promotion += row.promotion; totals.commission += row.commission;
};
const finish = (totals: Totals): Totals => {
  const revenue = round(totals.revenue), cost = round(totals.cost), commission = round(totals.commission);
  return { qty: totals.qty, revenue, cost, promotion: round(totals.promotion), commission, profit: round(revenue - cost - commission) };
};
const finishSplit = (split: Record<SaleTime, Totals>): Record<SaleTime, Totals> => ({ happy: finish(split.happy), regular: finish(split.regular) });

function receiptsOf(lines: SoldLine[], sales: SaleRow[]): ReceiptRow[] {
  const byOrder = new Map<string, ReceiptRow>();
  lines.forEach((line, index) => {
    const receipt = byOrder.get(line.orderNo) ?? { orderNo: line.orderNo, customer: line.customer, table: line.table, at: line.at, billTotal: line.billTotal, hasHappy: false, lines: [] };
    receipt.lines.push(sales[index]);
    if (sales[index].time === "happy") receipt.hasHappy = true;
    if (line.at > receipt.at) receipt.at = line.at;
    byOrder.set(line.orderNo, receipt);
  });
  return Array.from(byOrder.values()).sort((a, b) => b.at.localeCompare(a.at));
}

/** Wasted items by food and drinks with what they cost, newest first. */
export function wastageReport(lines: WasteLine[]): WastageReport {
  const kinds = { food: { qty: 0, cost: 0 }, drink: { qty: 0, cost: 0 }, other: { qty: 0, cost: 0 } };
  const total = { qty: 0, cost: 0 };
  const rows: WasteRow[] = lines.map((line) => {
    const kind = kindOf(line);
    const cost = round(line.unitCost * line.qty);
    kinds[kind].qty += line.qty; kinds[kind].cost += cost;
    total.qty += line.qty; total.cost += cost;
    return { orderNo: line.orderNo, at: line.at, name: line.name, kind, qty: line.qty, cost, reason: line.reason, by: line.by };
  }).sort((a, b) => b.at.localeCompare(a.at));
  const rounded = (part: { qty: number; cost: number }) => ({ qty: part.qty, cost: round(part.cost) });
  return { kinds: { food: rounded(kinds.food), drink: rounded(kinds.drink), other: rounded(kinds.other) }, total: rounded(total), rows };
}

/** One row per item (free units are added to their item), best profit first, and the totals of food, drinks and other. */
export function itemProfitReport(lines: SoldLine[]): ItemProfitReport {
  const byItem = new Map<string, ItemProfit>();
  const kinds = { food: emptyTotals(), drink: emptyTotals(), other: emptyTotals() };
  const kindSplits = { food: emptySplit(), drink: emptySplit(), other: emptySplit() };
  const total = emptyTotals();
  const totalSplit = emptySplit();
  const sales: SaleRow[] = [];
  for (const line of lines) {
    const key = line.productId ? `p${line.productId}` : `n${line.name}`;
    const kind = kindOf(line);
    const time = saleTimeOf(line);
    const part = { qty: line.qty, revenue: line.lineTotal, cost: line.cost, promotion: promotionOf(line), commission: line.commission };
    const row = byItem.get(key) ?? { key, name: line.name.replace(/\s*\(free\)$/i, ""), kind, ...emptyTotals(), bySale: emptySplit() };
    addTo(row, part); addTo(row.bySale[time], part);
    addTo(kinds[kind], part); addTo(kindSplits[kind][time], part);
    addTo(total, part); addTo(totalSplit[time], part);
    sales.push({ orderNo: line.orderNo, at: line.at, by: line.by, name: line.name, kind, time, ...part, revenue: round(part.revenue), cost: round(part.cost), promotion: round(part.promotion), commission: round(part.commission), profit: round(part.revenue - part.cost - part.commission) });
    byItem.set(key, row);
  }
  const items = Array.from(byItem.values()).map((row) => ({ ...row, ...finish(row), bySale: finishSplit(row.bySale) })).sort((a, b) => b.profit - a.profit);
  const withSplit = (totals: Totals, split: Record<SaleTime, Totals>) => ({ ...finish(totals), bySale: finishSplit(split) });
  return {
    receipts: receiptsOf(lines, sales),
    sales: sales.slice().sort((a, b) => b.at.localeCompare(a.at)),
    items,
    kinds: { food: withSplit(kinds.food, kindSplits.food), drink: withSplit(kinds.drink, kindSplits.drink), other: withSplit(kinds.other, kindSplits.other) },
    total: withSplit(total, totalSplit),
  };
}
