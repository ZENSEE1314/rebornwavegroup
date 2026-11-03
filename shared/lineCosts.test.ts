import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { baseUnits, costOfLine, type CostLine } from "./lineCosts";

const single: CostLine = { productId: 1, qty: 10, bundleItemId: null, bundleQty: null };
const sixPack: CostLine = { productId: 2, qty: 5, bundleItemId: 1, bundleQty: 6 };
const lines = [single, sixPack];
const totals = new Map([[1, 800_000]]); // 40 units out of the deliveries at 20,000 each

describe("cost of lines with bundles", () => {
  const units = baseUnits(lines);
  it("should count a bundle in the units it takes from its base item", () => assert.equal(units.get(1), 40));
  it("should give a single line its units' share of the cost", () => assert.equal(costOfLine(single, units, totals), 200_000));
  it("should give a bundle line its units' share of the base item's cost", () => assert.equal(costOfLine(sixPack, units, totals), 600_000));
  it("should not count the base item's cost twice", () => assert.equal(costOfLine(single, units, totals)! + costOfLine(sixPack, units, totals)!, 800_000));
  it("should have no delivery cost for an item with no history", () => assert.equal(costOfLine(single, units, new Map()), undefined));
});
