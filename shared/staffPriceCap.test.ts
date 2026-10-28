import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { capOf, cleanStaffPriceCaps, staffPriceModeFor } from "./staffPriceCap";

describe("staff price monthly cap", () => {
  it("should keep the asked price while spending is under the cap", () => assert.equal(staffPriceModeFor("cost", 99, 100), "cost"));
  it("should fall back to the staff discount when spending reaches the cap", () => assert.equal(staffPriceModeFor("half", 100, 100), "percent"));
  it("should never limit a person when there is no cap", () => assert.equal(staffPriceModeFor("half", 9_000_000, 0), "half"));
  it("should use a person's own cap instead of the default", () => assert.equal(capOf({ defaultCap: 500, discountPercent: 10, perPerson: { a: 100 } }, "a"), 100));
  it("should use the default cap for a person with none of their own", () => assert.equal(capOf({ defaultCap: 500, discountPercent: 10, perPerson: { a: 100 } }, "b"), 500));
  it("should let a person's own cap of 0 mean no cap", () => assert.equal(capOf({ defaultCap: 500, discountPercent: 10, perPerson: { a: 0 } }, "a"), 0));
  it("should start the staff discount at 10 percent", () => assert.equal(cleanStaffPriceCaps(undefined).discountPercent, 10));
  it("should drop a negative or non-numeric cap", () => assert.deepEqual(cleanStaffPriceCaps({ defaultCap: -5, perPerson: { a: "x", b: 200 } }).perPerson, { b: 200 }));
});
