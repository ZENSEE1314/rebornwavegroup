import { kindOf, type MenuKind } from "./itemProfit";

export interface StockListItem { id: number; name: string; category: string; station?: string | null; stock: number; cost: number; stockValue: number }

/** Food, drink or other for an inventory item (inventory holds no services or packages). */
export const stockKindOf = (item: Pick<StockListItem, "id" | "category" | "station">): MenuKind =>
  kindOf({ productId: item.id, category: item.category, station: item.station ?? null, isService: false, isPackage: false });

/** The items of one kind ("" = all), by category then name, as the printed stock list reads. */
export function stockListOf<T extends StockListItem>(items: T[], only: MenuKind | ""): T[] {
  return items
    .filter((item) => !only || stockKindOf(item) === only)
    .sort((a, b) => (a.category || "").localeCompare(b.category || "") || a.name.localeCompare(b.name));
}
