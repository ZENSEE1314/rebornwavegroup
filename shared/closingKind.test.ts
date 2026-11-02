import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { itemsOfKind, kindTotals, withDrinkCostOnly, type ClosingItem } from "./closingKind";

const items: ClosingItem[] = [
  { name: "Beer", kind: "drink", quantity: 2, sales: 100_000, cost: 40_000 },
  { name: "Burger", kind: "food", quantity: 1, sales: 80_000, cost: 30_000 },
  { name: "Cake", kind: "food", quantity: 1, sales: 50_000, cost: 10_000 },
  { name: "Corkage", kind: "other", quantity: 1, sales: 20_000, cost: 0 },
];

describe("food only / drinks only print", () => {
  it("should keep every item when no kind is chosen", () => assert.equal(itemsOfKind(items, "").length, 4));
  it("should keep only the food", () => assert.deepEqual(itemsOfKind(items, "food").map((item) => item.name), ["Burger", "Cake"]));
  it("should keep only the drinks", () => assert.deepEqual(itemsOfKind(items, "drink").map((item) => item.name), ["Beer"]));
  it("should add the sales of the chosen items", () => assert.equal(kindTotals(itemsOfKind(items, "food")).sales, 130_000));
  it("should take the cost off the profit of the chosen items", () => assert.equal(kindTotals(itemsOfKind(items, "food")).profit, 90_000));
  it("should leave an item without a kind out of both lists", () => assert.equal(itemsOfKind([{ name: "Old", quantity: 1, sales: 1, cost: 0 }], "drink").length, 0));
});

describe("daily report cost", () => {
  const costed = withDrinkCostOnly(items);
  it("should keep the cost of a drink", () => assert.equal(costed.find((item) => item.name === "Beer")?.cost, 40_000));
  it("should drop the cost of food", () => assert.equal(costed.find((item) => item.name === "Burger")?.cost, 0));
  it("should add only the drink cost into the total", () => assert.equal(kindTotals(costed).cost, 40_000));
  it("should keep the sales of food", () => assert.equal(kindTotals(itemsOfKind(costed, "food")).sales, 130_000));
});
