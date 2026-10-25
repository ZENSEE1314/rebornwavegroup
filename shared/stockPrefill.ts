// Add stock: the screen already knows what an item costs from each supplier it was bought from (the stock layers on the shelf), so the cost is filled in,
// and a new supplier for the same item is just another name typed in the same form (no second product).
export interface SupplierLayer { supplier: string; unitCost: number }

/** The suppliers known for an item: the item's own supplier first, then the ones in its stock layers, each once. */
export function suppliersOf(layers: SupplierLayer[], productSupplier?: string | null): string[] {
  const names = [productSupplier || "", ...layers.map((layer) => layer.supplier || "")].map((name) => name.trim()).filter(Boolean);
  const seen = new Set<string>();
  return names.filter((name) => { const key = name.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; });
}

/**
 * The unit cost to suggest for a supplier: the newest layer from that supplier; else the item's own cost when it is the item's own supplier (or no supplier is named);
 * a supplier never seen before gets no suggestion (the price is typed, so a wrong cost is never booked quietly).
 */
export function suggestedUnitCost(layers: SupplierLayer[], supplier: string, productCost: number | string | null | undefined, productSupplier?: string | null): number | null {
  const wanted = supplier.trim().toLowerCase();
  const fromLayers = layers.filter((layer) => (layer.supplier || "").trim().toLowerCase() === wanted && Number(layer.unitCost) > 0);
  if (fromLayers.length > 0) return Number(fromLayers[fromLayers.length - 1].unitCost);
  const isOwnSupplier = wanted === "" || wanted === (productSupplier || "").trim().toLowerCase();
  const cost = Number(productCost);
  return isOwnSupplier && Number.isFinite(cost) && cost > 0 ? cost : null;
}
