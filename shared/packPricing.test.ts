import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cleanPackPrice, cleanUnitsPerPack, packBreakdown, unitPriceFromPack } from "./packPricing";

describe("units per pack", () => {
  it("should accept a whole number from two", () => assert.equal(cleanUnitsPerPack(24), 24));
  it("should read text numbers", () => assert.equal(cleanUnitsPerPack("12"), 12));
  it("should accept one (a single bottle)", () => assert.equal(cleanUnitsPerPack(1), 1));
  it("should treat zero as nothing set", () => assert.equal(cleanUnitsPerPack(0), null));
  it("should treat nothing as no pack", () => assert.equal(cleanUnitsPerPack(""), null));
  it("should round a decimal down", () => assert.equal(cleanUnitsPerPack(6.9), 6));
});

describe("pack price", () => {
  it("should accept a positive amount", () => assert.equal(cleanPackPrice("110000"), 110000));
  it("should refuse zero", () => assert.equal(cleanPackPrice(0), null));
  it("should refuse a negative amount", () => assert.equal(cleanPackPrice(-5), null));
});

describe("the price of one unit", () => {
  it("should divide the pack price by the units", () => assert.equal(unitPriceFromPack(120000, 24), 5000));
  it("should keep the cents", () => assert.equal(unitPriceFromPack(110000, 24), 4583.33));
  it("should be the whole price for a pack of one", () => assert.equal(unitPriceFromPack(400000, 1), 400000));
  it("should be null without a pack size", () => assert.equal(unitPriceFromPack(110000, 0), null));
  it("should be null without a pack price", () => assert.equal(unitPriceFromPack(0, 24), null));
});

describe("packs and loose units in stock", () => {
  it("should split 50 of a 24-pack into 2 packs and 2 loose", () => assert.deepEqual(packBreakdown(50, 24), { packs: 2, loose: 2 }));
  it("should give nothing for an item without a pack", () => assert.equal(packBreakdown(50, null), null));
});
