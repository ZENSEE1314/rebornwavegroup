import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { stationFor } from "./station";

describe("which screen an item goes to", () => {
  it("should send a drink category to the bar", () => assert.equal(stationFor("Beer"), "bar"));
  it("should send a dessert category to dessert", () => assert.equal(stationFor("Ice cream"), "dessert"));
  it("should send everything else to the kitchen", () => assert.equal(stationFor("Main course"), "kitchen"));
  it("should follow the item's own choice first", () => assert.equal(stationFor("Beer", "kitchen"), "kitchen"));
  it("should ignore a choice that is not a station", () => assert.equal(stationFor("Beer", "garden"), "bar"));
});
