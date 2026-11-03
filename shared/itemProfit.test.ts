import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { itemProfitReport, kindOf, promotionOf, saleTimeOf, type SoldLine } from "./itemProfit";

const line = (over: Partial<SoldLine>): SoldLine => ({
  productId: 1, name: "Beer", category: "Beer", station: null, isService: false, isPackage: false, inHappyHour: false,
  qty: 1, lineTotal: 50_000, regularPrice: 50_000, cost: 20_000, commission: 0, ...over,
});

describe("food or drink", () => {
  it("should call a bar item a drink", () => assert.equal(kindOf(line({ category: "Beer" })), "drink"));
  it("should call a kitchen item food", () => assert.equal(kindOf(line({ category: "Mains" })), "food"));
  it("should call a dessert item food", () => assert.equal(kindOf(line({ category: "Cake" })), "food"));
  it("should follow the item's own station over its category", () => assert.equal(kindOf(line({ category: "Mains", station: "bar" })), "drink"));
  it("should put a service in other", () => assert.equal(kindOf(line({ isService: true })), "other"));
  it("should put a typed-in line in other", () => assert.equal(kindOf(line({ productId: null })), "other"));
});

describe("promotion and happy hour", () => {
  it("should count the price cut as promotion", () => assert.equal(promotionOf(line({ qty: 2, lineTotal: 60_000 })), 40_000));
  it("should count a free unit as promotion", () => assert.equal(promotionOf(line({ lineTotal: 0 })), 50_000));
  it("should give no promotion at the regular price", () => assert.equal(promotionOf(line({})), 0));
  it("should call a line ordered in the happy hours a happy hour sale", () => assert.equal(saleTimeOf(line({ inHappyHour: true, lineTotal: 30_000 })), "happy"));
  it("should call a discounted line ordered outside the happy hours a normal sale", () => assert.equal(saleTimeOf(line({ lineTotal: 30_000 })), "regular"));
  it("should call a free unit ordered in the happy hours a happy hour sale", () => assert.equal(saleTimeOf(line({ inHappyHour: true, lineTotal: 0 })), "happy"));
});

describe("item profit report", () => {
  const report = itemProfitReport([
    line({ qty: 2, lineTotal: 100_000, cost: 40_000, commission: 5_000 }),
    line({ qty: 1, lineTotal: 30_000, cost: 20_000, inHappyHour: true }),
    line({ productId: 2, name: "Burger", category: "Mains", qty: 1, lineTotal: 80_000, regularPrice: 80_000, cost: 30_000 }),
  ]);
  it("should add the lines of one item together", () => assert.equal(report.items.find((item) => item.name === "Beer")?.qty, 3));
  it("should take cost and commission off the profit", () => assert.equal(report.kinds.drink.profit, 130_000 - 60_000 - 5_000));
  it("should keep food and drinks apart", () => assert.equal(report.kinds.food.revenue, 80_000));
  it("should split the drinks into happy hour and normal sales", () => assert.equal(report.kinds.drink.bySale.happy.revenue, 30_000));
  it("should add the free line to its item, not list it twice", () => assert.equal(itemProfitReport([line({}), line({ name: "Beer (free)", lineTotal: 0 })]).items.length, 1));
  it("should add food and drinks into the total", () => assert.equal(report.total.revenue, 210_000));
});
