import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { deliverySource, purchaseEntryFromDelivery } from "./accountingReset";

describe("purchaseEntryFromDelivery", () => {
  it("should book quantity × unit cost as a purchase expense tied to the stock movement", () => {
    const e = purchaseEntryFromDelivery({ id: 7, productName: "Bintang 620ml", delta: 24, unitCost: "35000.00", supplier: "PT Bir", createdAt: "2026-10-15T08:00:00Z" })!;
    assert.equal(e.kind, "expense");
    assert.equal(e.category, "purchase");
    assert.equal(e.amount, "840000");
    assert.equal(e.refType, "stock_movement");
    assert.equal(e.refId, "7");
    assert.match(e.note, /24 × Bintang 620ml @ 35000 from PT Bir/);
  });
  it("should skip a delivery with no cost or no quantity", () => {
    assert.equal(purchaseEntryFromDelivery({ id: 1, productName: "x", delta: 5, unitCost: null, createdAt: null }), null);
    assert.equal(purchaseEntryFromDelivery({ id: 2, productName: "x", delta: 0, unitCost: "10", createdAt: null }), null);
    assert.equal(purchaseEntryFromDelivery({ id: 3, productName: "x", delta: -2, unitCost: "10", createdAt: null }), null);
  });
  it("should round to the company's decimals (cents for SGD)", () => {
    assert.equal(purchaseEntryFromDelivery({ id: 4, productName: "x", delta: 3, unitCost: "1.333", createdAt: null }, 2)!.amount, "4");
    assert.equal(purchaseEntryFromDelivery({ id: 5, productName: "x", delta: 3, unitCost: "1.337", createdAt: null }, 2)!.amount, "4.01");
  });
});

describe("purchaseEntryFromDelivery sources", () => {
  it("should name a scanned receipt or no source at all", () => {
    assert.match(purchaseEntryFromDelivery({ id: 8, productName: "Cola", delta: 6, unitCost: 5000, createdAt: null, source: "Receipt INV-1" })!.note, /\(Receipt INV-1\)$/);
    assert.doesNotMatch(purchaseEntryFromDelivery({ id: 9, productName: "Cola", delta: 6, unitCost: 5000, createdAt: null, source: "" })!.note, /\(/);
  });
  it("should tell where a delivery came from by its note", () => {
    assert.equal(deliverySource("Excel import 2026-10-01"), "Excel import");
    assert.equal(deliverySource("Receipt INV-1 from PT Bir"), "Receipt INV-1 from PT Bir");
    assert.equal(deliverySource("restock"), "");
    assert.equal(deliverySource(null), "");
  });
});
