// Oldest-stock-first costing. An item can be bought from several suppliers at different prices; every delivery is a
// "layer" (supplier + unit cost + quantity). A sale or loss uses the oldest layer first, so the cost of a sale — and which
// supplier it came from — is exact. The layers are worked out from the item's stock history (every change is already
// written there), so no sale / refund code needs to change.
export interface StockMove { id: number; delta: number; reason: string; supplier: string | null; unitCost: number | null; createdAt: Date }
export interface Layer { supplier: string; unitCost: number; qtyLeft: number; receivedAt: Date | null; isOpening: boolean }
export interface Consumption { moveId: number; qty: number; cost: number; supplier: string }

export interface FifoResult { layers: Layer[]; consumptions: Consumption[]; stockValue: number }

const DELIVERY_REASONS = new Set(["stock_in"]);

/**
 * @param moves        the item's stock history
 * @param currentStock the item's stock now (a count that the history may not fully explain)
 * @param fallbackCost the item's own cost, used where a delivery had no price
 * @param fallbackSupplier the item's supplier name, used for stock that came before the history
 */
export function runFifo(moves: StockMove[], currentStock: number, fallbackCost: number, fallbackSupplier: string): FifoResult {
  const ordered = [...moves].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id);
  const net = ordered.reduce((sum, move) => sum + move.delta, 0);
  const layers: Layer[] = [];
  const consumptions: Consumption[] = [];

  // Stock that was already there before the history began is the oldest layer.
  const opening = currentStock - net;
  if (opening > 0) layers.push({ supplier: fallbackSupplier, unitCost: fallbackCost, qtyLeft: opening, receivedAt: null, isOpening: true });

  let lastCost = fallbackCost;
  let lastSupplier = fallbackSupplier;
  for (const move of ordered) {
    if (move.delta > 0) {
      const isDelivery = DELIVERY_REASONS.has(move.reason);
      // A return puts units back at the cost they were taken out at; a delivery is a new layer at its own price.
      const unitCost = isDelivery ? (move.unitCost ?? fallbackCost) : lastCost;
      const supplier = isDelivery ? (move.supplier || fallbackSupplier) : lastSupplier;
      layers.push({ supplier, unitCost, qtyLeft: move.delta, receivedAt: move.createdAt, isOpening: false });
    } else if (move.delta < 0) {
      let toTake = -move.delta;
      while (toTake > 0) {
        const layer = layers.find((candidate) => candidate.qtyLeft > 0);
        if (!layer) { consumptions.push({ moveId: move.id, qty: toTake, cost: fallbackCost, supplier: fallbackSupplier }); break; } // stock went below what was recorded
        const taken = Math.min(layer.qtyLeft, toTake);
        layer.qtyLeft -= taken;
        toTake -= taken;
        lastCost = layer.unitCost;
        lastSupplier = layer.supplier;
        consumptions.push({ moveId: move.id, qty: taken, cost: layer.unitCost, supplier: layer.supplier });
      }
    }
  }
  const remaining = layers.filter((layer) => layer.qtyLeft > 0);
  return { layers: remaining, consumptions, stockValue: remaining.reduce((sum, layer) => sum + layer.qtyLeft * layer.unitCost, 0) };
}

export interface SupplierStock { supplier: string; unitCost: number; qty: number }

/**
 * What is on the shelf per supplier and price, so an item bought from several suppliers (also after the copies were merged into
 * one item) shows how many units came from each. A supplier that delivered before but has nothing left is listed with 0.
 * The quantities of the first group always add up to the item's stock.
 */
export function stockBySupplier(layers: Layer[], deliveredBy: string[]): SupplierStock[] {
  const rows = groupLayers(layers).filter((layer) => layer.qtyLeft > 0).map((layer) => ({ supplier: layer.supplier, unitCost: layer.unitCost, qty: layer.qtyLeft }));
  const listed = new Set(rows.map((row) => row.supplier));
  for (const supplier of deliveredBy) {
    if (!supplier || listed.has(supplier)) continue;
    listed.add(supplier);
    rows.push({ supplier, unitCost: 0, qty: 0 });
  }
  return rows;
}

/** The same layers merged by supplier + price, for display: "Alay · 19,583 · 12 left". */
export function groupLayers(layers: Layer[]): Layer[] {
  const grouped = new Map<string, Layer>();
  for (const layer of layers) {
    const key = `${layer.supplier}|${layer.unitCost}`;
    const found = grouped.get(key);
    if (found) found.qtyLeft += layer.qtyLeft;
    else grouped.set(key, { ...layer });
  }
  return [...grouped.values()];
}
