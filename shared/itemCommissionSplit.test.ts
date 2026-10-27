import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { commissionForPart, splitPartsOf } from "./itemCommission";

describe("splitPartsOf", () => {
  it("should keep two staff sharing three beers", () => assert.equal(splitPartsOf([{ staffId: "a", qty: 1 }, { staffId: "b", qty: 2 }], 3).length, 2));
  it("should cut a share that would go past the units on the line", () => assert.equal(splitPartsOf([{ staffId: "a", qty: 2 }, { staffId: "b", qty: 5 }], 3)[1].qty, 1));
  it("should drop a share with no staff", () => assert.equal(splitPartsOf([{ staffId: "", qty: 1 }], 3).length, 0));
  it("should drop a share of zero units", () => assert.equal(splitPartsOf([{ staffId: "a", qty: 0 }], 3).length, 0));
  it("should read the saved JSON text", () => assert.equal(splitPartsOf('[{"staffId":"a","qty":1}]', 2).length, 1));
  it("should give nothing for bad text", () => assert.equal(splitPartsOf("not json", 2).length, 0));
});

describe("commissionForPart", () => {
  const percent = { kind: "percent", value: 10 };
  it("should pay a percent on the share of the line total", () => assert.equal(commissionForPart(percent, 150000, 3, 1), 5000));
  it("should pay a fixed amount per unit in the share", () => assert.equal(commissionForPart({ kind: "fixed", value: 2000 }, 150000, 3, 2), 4000));
  it("should pay nothing without a rule", () => assert.equal(commissionForPart(null, 150000, 3, 1), 0));
});
