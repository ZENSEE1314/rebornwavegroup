import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { breakEvenSales, cleanFixedCosts, dailyCosts, type FixedCost } from "./fixedCosts";

const OCT = "2026-10";
const cost = (over: Partial<FixedCost> = {}): FixedCost => ({ id: "rent", name: "Rent", category: "rent", amount: 3_100_000, period: "monthly", isCounted: true, ...over });

describe("dailyCosts", () => {
  it("should spread a monthly cost over the days of that month", () => {
    assert.equal(dailyCosts([cost()], OCT, {}).perDay, 100_000);
  });

  it("should use 28 days for February", () => {
    assert.equal(dailyCosts([cost({ amount: 2_800_000 })], "2026-02", {}).perDay, 100_000);
  });

  it("should count a weekly cost as a seventh", () => {
    assert.equal(dailyCosts([cost({ amount: 700_000, period: "weekly" })], OCT, {}).perDay, 100_000);
  });

  it("should keep a bill that has not come yet out of the sum and name it", () => {
    const result = dailyCosts([cost(), cost({ id: "power", name: "Electricity", category: "electricity", amount: null })], OCT, {});
    assert.deepEqual([result.perDay, result.pending], [100_000, ["Electricity"]]);
  });

  it("should use the real bill once it is entered", () => {
    const power = cost({ id: "power", name: "Electricity", category: "electricity", amount: null });
    assert.equal(dailyCosts([power], OCT, { [OCT]: { power: 620_000 } }).perDay, 20_000);
  });

  it("should leave out a cost the admin does not count", () => {
    assert.equal(dailyCosts([cost({ isCounted: false })], OCT, {}).perDay, 0);
  });

  it("should add the salaries taken from payroll", () => {
    assert.equal(dailyCosts([], OCT, {}, 50_000).perDay, 50_000);
  });
});

describe("breakEvenSales", () => {
  it("should divide the daily cost by the margin", () => {
    assert.equal(breakEvenSales(100_000, 0.5), 200_000);
  });

  it("should give nothing when there is no margin yet", () => {
    assert.equal(breakEvenSales(100_000, null), null);
  });
});

describe("cleanFixedCosts", () => {
  it("should drop a cost with no name", () => {
    assert.equal(cleanFixedCosts([{ name: " ", amount: 5 }]).length, 0);
  });

  it("should read an empty amount as a bill that has not come yet", () => {
    assert.equal(cleanFixedCosts([{ name: "Water", category: "water", amount: "" }])[0].amount, null);
  });

  it("should fall back to other and monthly for unknown values", () => {
    const [clean] = cleanFixedCosts([{ name: "X", category: "nope", period: "nope", amount: 1 }]);
    assert.deepEqual([clean.category, clean.period], ["other", "monthly"]);
  });
});
