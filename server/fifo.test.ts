import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { groupLayers, runFifo, stockBySupplier, type StockMove } from "./fifo";

const at = (day: number) => new Date(Date.UTC(2026, 9, day));
const delivery = (id: number, day: number, qty: number, unitCost: number, supplier: string): StockMove => ({ id, delta: qty, reason: "stock_in", supplier, unitCost, createdAt: at(day) });
const sale = (id: number, day: number, qty: number): StockMove => ({ id, delta: -qty, reason: "sale", supplier: null, unitCost: null, createdAt: at(day) });

describe("oldest stock first", () => {
  const moves = [delivery(1, 1, 24, 20000, "Alay"), delivery(2, 5, 24, 22000, "Budi"), sale(3, 6, 30)];

  it("should take a sale from the oldest delivery first", () => {
    const { consumptions } = runFifo(moves, 18, 0, "");
    assert.deepEqual(consumptions.map((c) => [c.supplier, c.qty, c.cost]), [["Alay", 24, 20000], ["Budi", 6, 22000]]);
  });

  it("should leave what is left of the newer delivery", () => {
    const { layers } = runFifo(moves, 18, 0, "");
    assert.deepEqual(layers.map((l) => [l.supplier, l.qtyLeft, l.unitCost]), [["Budi", 18, 22000]]);
  });

  it("should value the stock left at each layer's own price", () => {
    assert.equal(runFifo(moves, 18, 0, "").stockValue, 18 * 22000);
  });
});

describe("stock from before the history", () => {
  it("should treat it as the oldest layer at the item's own cost", () => {
    const { layers } = runFifo([delivery(1, 3, 10, 5000, "Alay")], 15, 4000, "Old supplier");
    assert.deepEqual(layers.map((l) => [l.supplier, l.qtyLeft, l.unitCost, l.isOpening]), [["Old supplier", 5, 4000, true], ["Alay", 10, 5000, false]]);
  });
});

describe("deliveries without a price", () => {
  it("should use the item's own cost", () => {
    assert.equal(runFifo([{ ...delivery(1, 1, 5, 0, "Alay"), unitCost: null }], 5, 3000, "").layers[0].unitCost, 3000);
  });
});

describe("returns", () => {
  it("should go back at the cost they were taken out at", () => {
    const refund: StockMove = { id: 4, delta: 2, reason: "order_cancel", supplier: null, unitCost: null, createdAt: at(7) };
    const { layers } = runFifo([delivery(1, 1, 10, 20000, "Alay"), delivery(2, 2, 10, 22000, "Budi"), sale(3, 3, 12), refund], 10, 0, "");
    assert.deepEqual(layers.map((l) => [l.supplier, l.qtyLeft, l.unitCost]), [["Budi", 8, 22000], ["Budi", 2, 22000]]);
  });
});

describe("selling more than was recorded", () => {
  it("should cost the extra units at the item's own cost", () => {
    const { consumptions } = runFifo([delivery(1, 1, 2, 20000, "Alay"), sale(2, 2, 5)], -3, 18000, "Alay");
    assert.deepEqual(consumptions.map((c) => [c.qty, c.cost]), [[2, 20000], [3, 18000]]);
  });
});

describe("grouping layers for display", () => {
  it("should merge layers of the same supplier and price", () => {
    const grouped = groupLayers([
      { supplier: "Alay", unitCost: 20000, qtyLeft: 3, receivedAt: at(1), isOpening: false },
      { supplier: "Alay", unitCost: 20000, qtyLeft: 4, receivedAt: at(2), isOpening: false },
    ]);
    assert.deepEqual(grouped.map((l) => l.qtyLeft), [7]);
  });
});

describe("stock per supplier", () => {
  const moves = [delivery(1, 1, 24, 20000, "Alay"), delivery(2, 5, 40, 22000, "Budi")];

  it("should list how many units each supplier still has, adding up to the stock", () => {
    const rows = stockBySupplier(runFifo(moves, 64, 0, "").layers, ["Alay", "Budi"]);
    assert.deepEqual(rows.map((r) => [r.supplier, r.qty, r.unitCost]), [["Alay", 24, 20000], ["Budi", 40, 22000]]);
    assert.equal(rows.reduce((sum, r) => sum + r.qty, 0), 64);
  });

  it("should list a supplier whose delivery is all sold with 0 left", () => {
    const rows = stockBySupplier(runFifo([...moves, sale(3, 6, 24)], 40, 0, "").layers, ["Alay", "Budi"]);
    assert.deepEqual(rows.map((r) => [r.supplier, r.qty]), [["Budi", 40], ["Alay", 0]]);
  });

  it("should keep stock from before the records under the item's own supplier", () => {
    const rows = stockBySupplier(runFifo([delivery(1, 3, 10, 5000, "Budi")], 15, 4000, "Old supplier").layers, ["Budi"]);
    assert.deepEqual(rows.map((r) => [r.supplier, r.qty]), [["Old supplier", 5], ["Budi", 10]]);
  });
});
