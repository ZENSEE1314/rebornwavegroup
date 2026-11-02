// The "food only" / "drinks only" print of a closed day: which items to list and what they add up to.
import type { MenuKind } from "./itemProfit";

export interface ClosingItem { name: string; kind?: MenuKind; quantity: number; sales: number; cost: number }

export function itemsOfKind<T extends ClosingItem>(items: T[], only: MenuKind | ""): T[] {
  return only ? items.filter((item) => item.kind === only) : items;
}

export function kindTotals(items: ClosingItem[]): { sales: number; cost: number; profit: number } {
  const sales = items.reduce((sum, item) => sum + (Number(item.sales) || 0), 0);
  const cost = items.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
  return { sales, cost, profit: sales - cost };
}

// Only drinks carry a cost on the daily report: food cost cannot be worked out per item, so the full food cost is entered as a monthly expense.
export function withDrinkCostOnly<T extends ClosingItem>(items: T[]): T[] {
  return items.map((item) => (item.kind === "drink" ? item : { ...item, cost: 0 }));
}
