import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canEarn, commissionFor, eligibleStaffOf, ruleOf } from "./itemCommission";

describe("commissionFor", () => {
  it("should take a percent of the line total", () => assert.equal(commissionFor({ kind: "percent", value: 20 }, 250000, 2), 50000));
  it("should pay a fixed amount for every unit", () => assert.equal(commissionFor({ kind: "fixed", value: 30000 }, 250000, 2), 60000));
  it("should never pay more than the line was paid", () => assert.equal(commissionFor({ kind: "fixed", value: 200000 }, 100000, 1), 100000));
  it("should pay nothing on a free unit", () => assert.equal(commissionFor({ kind: "fixed", value: 30000 }, 0, 1), 0));
  it("should pay nothing when the item has no rule", () => assert.equal(commissionFor({ kind: "", value: 20 }, 100000, 1), 0));
  it("should pay nothing when the value is zero", () => assert.equal(commissionFor({ kind: "percent", value: 0 }, 100000, 1), 0));
  it("should round to the company's decimals", () => assert.equal(commissionFor({ kind: "percent", value: 15 }, 19.99, 1, 2), 3));
});

describe("ruleOf", () => {
  it("should cap a percent at 100", () => assert.deepEqual(ruleOf({ kind: "percent", value: 250 }), { kind: "percent", value: 100 }));
  it("should read a value saved as text", () => assert.deepEqual(ruleOf({ kind: "fixed", value: "15000.00" }), { kind: "fixed", value: 15000 }));
  it("should give nothing for an unknown kind", () => assert.equal(ruleOf({ kind: "bonus", value: 5 }), null));
});

describe("eligible staff", () => {
  it("should read a saved list", () => assert.deepEqual(eligibleStaffOf('["a","b","a"]'), ["a", "b"]));
  it("should give an empty list for bad text", () => assert.deepEqual(eligibleStaffOf("not json"), []));
  it("should let anyone earn while the list is empty", () => assert.equal(canEarn([], "x"), true));
  it("should let only listed staff earn when there is a list", () => assert.equal(canEarn(["a"], "b"), false));
  it("should let a listed person earn", () => assert.equal(canEarn(["a"], "a"), true));
  it("should never let nobody earn", () => assert.equal(canEarn([], null), false));
});
