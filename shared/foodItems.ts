// Food made in the kitchen from raw items that are already keyed in the expenses: adding its stock must not book a second purchase.
// An item counts as food when it carries the "cost is already in the expenses" tick, or its category is a food category.
const FOOD_CATEGORY = /food|main|course|appetizer|appetiser|starter|snack|side|kitchen|meal|rice|noodle|burger|pizza|pasta|soup|salad|dessert|cake|ice ?cream|pastry|makan|nasi|mie\b|kue/i;

export function isFoodItem(item: { category?: string | null; noExpenseCost?: boolean | null }): boolean {
  return !!item.noExpenseCost || FOOD_CATEGORY.test(item.category || "");
}
