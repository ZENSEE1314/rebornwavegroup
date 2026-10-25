// Stock by supplier and price (oldest first): which deliveries are still on the shelf, what a sale really cost, and merging
// the same item entered twice. The costing itself is server/fifo.ts; this wires it to the database.
import type { Express, Request, Response } from "express";
import { and, desc, eq, gt, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "./db";
import { posProducts, posTicketItems, stockMovements } from "@shared/schema";
import { groupLayers, runFifo, type FifoResult, type StockMove } from "./fifo";

const toMove = (row: typeof stockMovements.$inferSelect): StockMove => ({
  id: row.id, delta: row.delta, reason: row.reason, supplier: row.supplier, unitCost: row.unitCost === null ? null : Number(row.unitCost), createdAt: row.createdAt ?? new Date(0),
});

/** The layers of each given product (the products are passed in so their current stock and own cost are the ones used). */
export async function loadFifo(products: Array<typeof posProducts.$inferSelect>): Promise<Map<number, FifoResult>> {
  const result = new Map<number, FifoResult>();
  if (!products.length) return result;
  const rows = await db.select().from(stockMovements).where(inArray(stockMovements.productId, products.map((p) => p.id)));
  const byProduct = new Map<number, StockMove[]>();
  for (const row of rows) (byProduct.get(row.productId) ?? byProduct.set(row.productId, []).get(row.productId)!).push(toMove(row));
  for (const product of products) {
    result.set(product.id, runFifo(byProduct.get(product.id) ?? [], product.stock ?? 0, Number(product.cost) || 0, product.supplierName || ""));
  }
  return result;
}

/** What the units sold in a time window cost, per product, taking each from the oldest delivery. */
export async function fifoSaleCosts(productIds: number[], from: Date, to: Date): Promise<Map<number, number>> {
  const costs = new Map<number, number>();
  if (!productIds.length) return costs;
  const products = await db.select().from(posProducts).where(inArray(posProducts.id, productIds));
  const fifo = await loadFifo(products);
  const sales = await db.select({ id: stockMovements.id, productId: stockMovements.productId, createdAt: stockMovements.createdAt }).from(stockMovements)
    .where(and(inArray(stockMovements.productId, productIds), eq(stockMovements.reason, "sale")));
  const inWindow = new Map(sales.filter((row) => row.createdAt && row.createdAt >= from && row.createdAt < to).map((row) => [row.id, row.productId]));
  for (const [productId, run] of fifo) {
    const total = run.consumptions.filter((c) => inWindow.get(c.moveId) === productId).reduce((sum, c) => sum + c.qty * c.cost, 0);
    if (total > 0) costs.set(productId, total);
  }
  return costs;
}

const DELIVERY_HISTORY_LIMIT = 200;

export interface StockLayerDeps {
  requireAdmin(handler: (req: Request, res: Response) => Promise<unknown>): (req: Request, res: Response) => unknown;
  requireManager(handler: (req: Request, res: Response) => Promise<unknown>): (req: Request, res: Response) => unknown;
  companyId(req: Request): Promise<number>;
  logAdmin(req: Request, entry: { action: string; description: string }): Promise<void>;
}

export function registerStockLayers(app: Express, deps: StockLayerDeps) {
  app.get("/api/reborn/admin/pos/products/:id/layers", deps.requireManager(async (req, res) => {
    const cid = await deps.companyId(req);
    const [product] = await db.select().from(posProducts).where(and(eq(posProducts.id, Number(req.params.id)), eq(posProducts.companyId, cid)));
    if (!product) return res.status(404).json({ message: "Item not found" });
    const run = (await loadFifo([product])).get(product.id)!;
    // Every delivery with a supplier and a price, oldest first: Add stock suggests the price of the supplier chosen, even when that supplier's units are all sold.
    const deliveries = await db.select({ supplier: stockMovements.supplier, unitCost: stockMovements.unitCost, at: stockMovements.createdAt }).from(stockMovements)
      .where(and(eq(stockMovements.productId, product.id), gt(stockMovements.delta, 0), isNotNull(stockMovements.supplier), isNotNull(stockMovements.unitCost)))
      .orderBy(desc(stockMovements.createdAt), desc(stockMovements.id)).limit(DELIVERY_HISTORY_LIMIT);
    res.json({
      deliveries: deliveries.reverse().map((row) => ({ supplier: row.supplier ?? "", unitCost: Number(row.unitCost), at: row.at })),
      stock: product.stock, stockValue: Math.round(run.stockValue),
      layers: groupLayers(run.layers).map((layer) => ({ supplier: layer.supplier, unitCost: layer.unitCost, qty: layer.qtyLeft, receivedAt: layer.receivedAt, isOpening: layer.isOpening })),
    });
  }));

  // Another supplier for the same item: a copy with everything but the supplier, ready for the admin to change the supplier's
  // name, number and price (no stock yet — it comes with the first delivery).
  app.post("/api/reborn/admin/pos/products/:id/duplicate", deps.requireManager(async (req, res) => {
    const cid = await deps.companyId(req);
    const [source] = await db.select().from(posProducts).where(and(eq(posProducts.id, Number(req.params.id)), eq(posProducts.companyId, cid)));
    if (!source) return res.status(404).json({ message: "Item not found" });
    const [copy] = await db.insert(posProducts).values({
      companyId: cid, branchId: source.branchId, name: source.name, category: source.category, price: source.price, cost: source.cost, stock: 0,
      imageUrl: source.imageUrl, department: source.department, posVisible: source.posVisible, station: source.station, stallId: source.stallId,
      unitsPerPack: source.unitsPerPack, packPrice: source.packPrice, creditOk: source.creditOk, sortOrder: source.sortOrder, active: true,
      supplierName: null, supplierPhone: null, supplierAddress: null,
    }).returning();
    await deps.logAdmin(req, { action: "duplicate_product", description: `Duplicated "${source.name}" for another supplier` });
    res.json(copy);
  }));

  // The same item was entered twice (e.g. once per supplier): everything of the first moves into the second — its stock, its
  // delivery history (so the supplier prices stay) and the bills it was sold on — and the first is removed.
  app.post("/api/reborn/admin/pos/products/:id/merge", deps.requireAdmin(async (req, res) => {
    const fromId = Number(req.params.id);
    const intoId = Number(req.body?.intoId);
    const cid = await deps.companyId(req);
    if (!intoId || intoId === fromId) return res.status(400).json({ message: "Choose a different item to merge into" });
    const [from] = await db.select().from(posProducts).where(and(eq(posProducts.id, fromId), eq(posProducts.companyId, cid)));
    const [into] = await db.select().from(posProducts).where(and(eq(posProducts.id, intoId), eq(posProducts.companyId, cid)));
    if (!from || !into) return res.status(404).json({ message: "Item not found" });
    const [history] = await db.select({ net: sql<number>`coalesce(sum(${stockMovements.delta}), 0)` }).from(stockMovements).where(eq(stockMovements.productId, fromId));
    const opening = (from.stock ?? 0) - Number(history?.net || 0); // the units it had before its history began
    await db.transaction(async (tx) => {
      // Those older units keep their supplier and price as a delivery dated before everything else.
      if (opening > 0) await tx.insert(stockMovements).values({ companyId: cid, productId: intoId, delta: opening, reason: "stock_in", supplier: from.supplierName, unitCost: from.cost, note: `Merged from "${from.name}"`, createdAt: new Date(Date.UTC(2000, 0, 1)) });
      await tx.update(stockMovements).set({ productId: intoId }).where(eq(stockMovements.productId, fromId));
      await tx.update(posTicketItems).set({ productId: intoId }).where(eq(posTicketItems.productId, fromId));
      await tx.update(posProducts).set({
        stock: (into.stock ?? 0) + (from.stock ?? 0),
        supplierName: into.supplierName || from.supplierName, supplierPhone: into.supplierPhone || from.supplierPhone, supplierAddress: into.supplierAddress || from.supplierAddress,
        imageUrl: into.imageUrl || from.imageUrl,
      }).where(eq(posProducts.id, intoId));
      await tx.delete(posProducts).where(eq(posProducts.id, fromId));
    });
    await deps.logAdmin(req, { action: "merge_product", description: `Merged "${from.name}" into "${into.name}"` });
    res.json({ ok: true });
  }));
}
