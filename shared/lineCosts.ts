// What sold lines cost from the deliveries their units came out of. A bundle ("6 x Beer") takes its units out of its base item, so the base item's
// delivery cost is shared between the base item's own lines and its bundles' lines by the units each took; counting it once on the base item and again
// on the bundle's own cost doubled the cost of every bundle.
export interface CostLine {
  productId: number | null;
  qty: number;
  bundleItemId: number | null;
  bundleQty: number | null;
}

const isBundle = (line: CostLine): boolean => !!(line.bundleItemId && line.bundleQty);
export const baseOf = (line: CostLine): number | null => (isBundle(line) ? line.bundleItemId : line.productId);
export const unitsOf = (line: CostLine): number => line.qty * (isBundle(line) ? line.bundleQty! : 1);

/** Stock units sold per base item, bundles counted in the units they take. */
export function baseUnits(lines: CostLine[]): Map<number, number> {
  const units = new Map<number, number>();
  for (const line of lines) {
    const base = baseOf(line);
    if (base) units.set(base, (units.get(base) ?? 0) + unitsOf(line));
  }
  return units;
}

/** The line's share of its base item's delivery cost; undefined when the base item has no delivery history (use the item's own cost then). */
export function costOfLine(line: CostLine, units: Map<number, number>, totals: Map<number, number>): number | undefined {
  const base = baseOf(line);
  const total = base ? totals.get(base) : undefined;
  const sold = base ? units.get(base) ?? 0 : 0;
  return total !== undefined && sold > 0 ? (total * unitsOf(line)) / sold : undefined;
}
