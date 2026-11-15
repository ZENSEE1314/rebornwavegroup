import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { clampStartDay, daysInPeriod, labelOfDay, periodOf, periodToPay } from "./payPeriod";

describe("pay period", () => {
  it("should be the calendar month when the start day is 1", () => {
    assert.deepEqual(periodOf("2026-11", 1), { from: "2026-11-01", to: "2026-12-01" });
  });

  it("should run from the 16th to the 15th when the start day is 16", () => {
    assert.deepEqual(periodOf("2026-11", 16), { from: "2026-10-16", to: "2026-11-16" });
  });

  it("should cross the year", () => {
    assert.deepEqual(periodOf("2027-01", 16), { from: "2026-12-16", to: "2027-01-16" });
  });

  it("should put the 15th in the period paid that month", () => {
    assert.equal(labelOfDay("2026-11-15", 16), "2026-11");
  });

  it("should start the next period on the 16th", () => {
    assert.equal(labelOfDay("2026-11-16", 16), "2026-12");
  });

  it("should keep the calendar month for start day 1", () => {
    assert.equal(labelOfDay("2026-11-30", 1), "2026-11");
  });

  it("should name the month that just ended for start day 1", () => {
    assert.equal(periodToPay({ year: 2026, month: 12, day: 15 }, 1), "2026-11");
  });

  it("should name the period ending on the 15th when paid on the 15th", () => {
    assert.equal(periodToPay({ year: 2026, month: 11, day: 15 }, 16), "2026-11");
  });

  it("should still name that period later in the month", () => {
    assert.equal(periodToPay({ year: 2026, month: 11, day: 25 }, 16), "2026-11");
  });

  it("should name the earlier period before payday", () => {
    assert.equal(periodToPay({ year: 2026, month: 11, day: 10 }, 16), "2026-10");
  });

  it("should count the days of a period", () => {
    assert.equal(daysInPeriod("2026-11", 16), 31);
  });

  it("should keep the start day between 1 and 28", () => {
    assert.deepEqual([clampStartDay(0), clampStartDay(40), clampStartDay("16"), clampStartDay("x")], [1, 28, 16, 1]);
  });
});
