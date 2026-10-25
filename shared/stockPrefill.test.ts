import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { suggestedUnitCost, suppliersOf } from "./stockPrefill";

const layers = [
  { supplier: "Nanda", unitCost: 460000 },
  { supplier: "Budi", unitCost: 450000 },
  { supplier: "Nanda", unitCost: 480000 },
];

describe("suppliersOf", () => {
  it("should list the item's own supplier first", () => assert.deepEqual(suppliersOf(layers, "Budi"), ["Budi", "Nanda"]));
  it("should list each supplier once, whatever the capitals", () => assert.deepEqual(suppliersOf([{ supplier: "nanda", unitCost: 1 }, { supplier: "Nanda", unitCost: 2 }], "NANDA"), ["NANDA"]));
  it("should leave out empty names", () => assert.deepEqual(suppliersOf([{ supplier: "", unitCost: 1 }], null), []));
});

describe("suggestedUnitCost", () => {
  it("should suggest the newest price from that supplier", () => assert.equal(suggestedUnitCost(layers, "Nanda", 100, "Nanda"), 480000));
  it("should suggest the other supplier's own price when it is chosen", () => assert.equal(suggestedUnitCost(layers, "Budi", 100, "Nanda"), 450000));
  it("should fall back to the item's cost for its own supplier when there is no layer", () => assert.equal(suggestedUnitCost([], "Nanda", "460000.00", "Nanda"), 460000));
  it("should fall back to the item's cost when no supplier is named", () => assert.equal(suggestedUnitCost([], "", 460000, null), 460000));
  it("should suggest nothing for a supplier never seen before", () => assert.equal(suggestedUnitCost(layers, "New Supplier", 460000, "Nanda"), null));
  it("should suggest nothing when the item has no cost", () => assert.equal(suggestedUnitCost([], "Nanda", 0, "Nanda"), null));
});

describe("a supplier whose units are all sold", () => {
  const history = [{ supplier: "Nanda", unitCost: 460000 }, { supplier: "Budi", unitCost: 450000 }];
  it("should still be listed from the delivery history", () => assert.deepEqual(suppliersOf(history, "Budi"), ["Budi", "Nanda"]));
  it("should still get its last price suggested", () => assert.equal(suggestedUnitCost(history, "Nanda", 450000, "Budi"), 460000));
});
