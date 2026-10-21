import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { dealOf, freeUnitsFor } from "./happyHour";

const DURING = "18:30";
const OUTSIDE = "12:00";
const beer = (buy: number, free: number) => ({ price: 40_000, happyStart: "17:00", happyEnd: "20:00", happyBuyQty: buy, happyFreeQty: free });

describe("freeUnitsFor", () => {
  it("should make the second beer free on buy 1 get 1 free", () => {
    assert.equal(freeUnitsFor(beer(1, 1), DURING, 2), 1);
  });

  it("should give nothing free for a single beer on buy 1 get 1 free", () => {
    assert.equal(freeUnitsFor(beer(1, 1), DURING, 1), 0);
  });

  it("should count beers already on the bill", () => {
    assert.equal(freeUnitsFor(beer(1, 1), DURING, 1, 1), 1);
  });

  it("should give two free in six on buy 2 get 1 free", () => {
    assert.equal(freeUnitsFor(beer(2, 1), DURING, 6), 2);
  });

  it("should give nothing free outside the happy hour", () => {
    assert.equal(freeUnitsFor(beer(1, 1), OUTSIDE, 4), 0);
  });

  it("should give nothing free when no deal is set", () => {
    assert.equal(freeUnitsFor(beer(0, 0), DURING, 4), 0);
  });
});

describe("dealOf", () => {
  it("should ignore a deal with nothing free", () => {
    assert.equal(dealOf(beer(2, 0)), null);
  });
});
