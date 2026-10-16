// Which kitchen screen / printer an item goes to: the product's own choice wins, else it is worked out from the category name.
export type Station = "kitchen" | "bar" | "dessert";
export const STATIONS: Station[] = ["kitchen", "bar", "dessert"];

const BAR_WORDS = /drink|beer|wine|beverage|\bbar\b|cocktail|juice|coffee|tea|soda|spirit|whisky|vodka|minuman|bir\b|anggur/i;
const DESSERT_WORDS = /dessert|cake|ice ?cream|sweet|pastry|gelato|kue|es krim/i;

export function stationFor(category?: string | null, override?: string | null): Station {
  if (override === "kitchen" || override === "bar" || override === "dessert") return override;
  const name = category || "";
  if (BAR_WORDS.test(name)) return "bar";
  if (DESSERT_WORDS.test(name)) return "dessert";
  return "kitchen";
}
