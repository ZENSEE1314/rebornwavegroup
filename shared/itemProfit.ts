// Admin › Accounting › Reports › Food & drinks: what each item sold for, cost, gave away as promotion and paid as commission, split into food and drinks,
// and each of those split again into happy hour sales and normal sales.
import { stationFor } from "./station";

export const MENU_KINDS = ["food", "drink", "other"] as const;
export type MenuKind = (typeof MENU_KINDS)[number];
export const SALE_TIMES = ["happy", "regular"] as const;
export type SaleTime = (typeof SALE_TIMES)[number];

export interface SoldLine {
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
export interface ItemProfitReport {
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

/** One row per item (free units are added to their item), best profit first, and the totals of food, drinks and other. */
export function itemProfitReport(lines: SoldLine[]): ItemProfitReport {
  const byItem = new Map<string, ItemProfit>();
  const kinds = { food: emptyTotals(), drink: emptyTotals(), other: emptyTotals() };
  const kindSplits = { food: emptySplit(), drink: emptySplit(), other: emptySplit() };
  const total = emptyTotals();
  const totalSplit = emptySplit();
  for (const line of lines) {
    const key = line.productId ? `p${line.productId}` : `n${line.name}`;
    const kind = kindOf(line);
    const time = saleTimeOf(line);
    const part = { qty: line.qty, revenue: line.lineTotal, cost: line.cost, promotion: promotionOf(line), commission: line.commission };
    const row = byItem.get(key) ?? { key, name: line.name.replace(/\s*\(free\)$/i, ""), kind, ...emptyTotals(), bySale: emptySplit() };
    addTo(row, part); addTo(row.bySale[time], part);
    addTo(kinds[kind], part); addTo(kindSplits[kind][time], part);
    addTo(total, part); addTo(totalSplit[time], part);
    byItem.set(key, row);
  }
  const items = Array.from(byItem.values()).map((row) => ({ ...row, ...finish(row), bySale: finishSplit(row.bySale) })).sort((a, b) => b.profit - a.profit);
  const withSplit = (totals: Totals, split: Record<SaleTime, Totals>) => ({ ...finish(totals), bySale: finishSplit(split) });
  return {
    items,
    kinds: { food: withSplit(kinds.food, kindSplits.food), drink: withSplit(kinds.drink, kindSplits.drink), other: withSplit(kinds.other, kindSplits.other) },
    total: withSplit(total, totalSplit),
  };
}
