import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { stockKindOf, stockListOf, type StockListItem } from "./stockList";

const item = (over: Partial<StockListItem>): StockListItem => ({ id: 1, name: "Item", category: "Mains", stock: 1, cost: 1000, stockValue: 1000, ...over });

describe("stock list by kind", () => {
  it("should call a bar item a drink", () => assert.equal(stockKindOf(item({ category: "Beer" })), "drink"));
  it("should call a kitchen item food", () => assert.equal(stockKindOf(item({ category: "Mains" })), "food"));
  it("should follow the item's own station over its category", () => assert.equal(stockKindOf(item({ category: "Mains", station: "bar" })), "drink"));
  it("should keep only drinks when drinks is picked", () => assert.deepEqual(stockListOf([item({ id: 1, name: "Rice" }), item({ id: 2, name: "Bintang", category: "Beer" })], "drink").map((i) => i.name), ["Bintang"]));
  it("should keep every item when no kind is picked", () => assert.equal(stockListOf([item({ id: 1 }), item({ id: 2, category: "Beer" })], "").length, 2));
  it("should order by category then name", () => assert.deepEqual(stockListOf([item({ id: 1, name: "B", category: "Mains" }), item({ id: 2, name: "A", category: "Mains" }), item({ id: 3, name: "C", category: "Desserts" })], "").map((i) => i.name), ["C", "A", "B"]));
});
