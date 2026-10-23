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


import { cleanDays, clockInZone, isHappyNow } from "./happyHour";

describe("happy hour on chosen weekdays", () => {
  const monToWed = { happyStart: "17:00", happyEnd: "19:00", happyDays: "1,2,3" };
  it("should run on a ticked day", () => assert.equal(isHappyNow(monToWed, "2 17:30"), true));
  it("should not run on a day that is not ticked", () => assert.equal(isHappyNow(monToWed, "5 17:30"), false));
  it("should run every day when no day is ticked", () => assert.equal(isHappyNow({ happyStart: "17:00", happyEnd: "19:00", happyDays: "" }, "6 17:30"), true));
  it("should ignore the days when the clock has no weekday", () => assert.equal(isHappyNow(monToWed, "17:30"), true));
  it("should count the hours after midnight to the day the night started", () => assert.equal(isHappyNow({ happyStart: "22:00", happyEnd: "02:00", happyDays: "5" }, "6 01:00"), true));
  it("should not run after midnight when the night started on another day", () => assert.equal(isHappyNow({ happyStart: "22:00", happyEnd: "02:00", happyDays: "5" }, "5 01:00"), false));
  it("should read the weekday of the venue's own time zone", () => assert.match(clockInZone(new Date("2026-10-23T18:00:00Z"), "Asia/Jakarta"), /^6 01:00$/));
});

describe("cleanDays", () => {
  it("should keep valid weekdays once, in order", () => assert.equal(cleanDays("5,1,1,9,x"), "1,5"));
  it("should mean every day when all seven are ticked", () => assert.equal(cleanDays("0,1,2,3,4,5,6"), ""));
  it("should mean every day when nothing valid is given", () => assert.equal(cleanDays("abc"), ""));
  it("should accept a list", () => assert.equal(cleanDays([3, 1]), "1,3"));
});
