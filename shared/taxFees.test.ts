import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { cleanRate, inferPercent, percentOf } from "./taxFees";

describe("percentOf", () => {
  it("should use the rate stored on the bill", () => {
    assert.equal(percentOf("10.00", 100, 1000, 5), 10);
  });

  it("should work the percentage out from the amount of an older bill", () => {
    assert.equal(percentOf(null, 107_500, 1_075_000, 5), 10);
  });

  it("should fall back when the bill has no such charge", () => {
    assert.equal(percentOf(null, 0, 1_000_000, 7), 7);
  });
});

describe("inferPercent", () => {
  it("should keep two decimals", () => {
    assert.equal(inferPercent(65_000, 1_000_000), 6.5);
  });

  it("should give 0 for an empty bill", () => {
    assert.equal(inferPercent(10, 0), 0);
  });
});

describe("cleanRate", () => {
  it("should accept 0 to 100", () => {
    assert.deepEqual([cleanRate(0), cleanRate("7.5"), cleanRate(100)], [0, 7.5, 100]);
  });

  it("should refuse a negative, a too big or a non-number rate", () => {
    assert.deepEqual([cleanRate(-1), cleanRate(101), cleanRate("x")], [null, null, null]);
  });
});
