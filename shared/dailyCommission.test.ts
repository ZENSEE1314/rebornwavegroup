import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { DEFAULT_DAILY_TIERS, cleanSetup, cleanTiers, dayCommission, nextTierAfter, readSetup, tierRanges } from "./dailyCommission";

describe("daily commission tiers", () => {
  it("should pay the whole day at the tier reached", () => {
    assert.deepEqual(dayCommission(3_500_000, DEFAULT_DAILY_TIERS), { percent: 12, amount: 420_000, tierIndex: 1 });
  });

  it("should keep a day of exactly 3,000,000 in the first tier", () => {
    assert.equal(dayCommission(3_000_000, DEFAULT_DAILY_TIERS).percent, 10);
  });

  it("should move to the next tier one unit above the line", () => {
    assert.equal(dayCommission(3_000_001, DEFAULT_DAILY_TIERS).percent, 12);
  });

  it("should stop at the last tier however much is sold", () => {
    assert.deepEqual(dayCommission(12_000_000, DEFAULT_DAILY_TIERS), { percent: 25, amount: 3_000_000, tierIndex: 8 });
  });

  it("should pay nothing for a day with no sales", () => {
    assert.equal(dayCommission(0, DEFAULT_DAILY_TIERS).amount, 0);
  });

  it("should show each tier starting where the one before ends", () => {
    assert.deepEqual(tierRanges(DEFAULT_DAILY_TIERS).slice(0, 2), [{ from: 0, to: 3_000_000, percent: 10 }, { from: 3_000_000, to: 4_000_000, percent: 12 }]);
  });

  it("should tell what the next tier is", () => {
    assert.deepEqual(nextTierAfter(3_500_000, DEFAULT_DAILY_TIERS), { above: 4_000_000, percent: 14 });
  });

  it("should have no next tier at the top", () => {
    assert.equal(nextTierAfter(11_000_000, DEFAULT_DAILY_TIERS), null);
  });

  it("should sort tiers the admin typed out of order and put 'and above' last", () => {
    const { tiers } = cleanTiers([{ upTo: "", percent: 20 }, { upTo: 2_000_000, percent: 15 }, { upTo: 1_000_000, percent: 10 }]);
    assert.deepEqual(tiers.map((tier) => tier.upTo), [1_000_000, 2_000_000, null]);
  });

  it("should refuse two tiers ending at the same amount", () => {
    assert.equal(cleanTiers([{ upTo: 1_000_000, percent: 10 }, { upTo: 1_000_000, percent: 12 }, { upTo: null, percent: 20 }]).problem, "order");
  });

  it("should refuse tiers with no 'and above' tier", () => {
    assert.equal(cleanTiers([{ upTo: 1_000_000, percent: 10 }]).problem, "open");
  });

  it("should refuse a percent above 100", () => {
    assert.equal(cleanTiers([{ upTo: null, percent: 101 }]).problem, "percent");
  });

  it("should start switched off when nothing is saved", () => {
    assert.equal(readSetup(null).enabled, false);
  });

  it("should start counting from today when switched on without a day", () => {
    assert.equal(cleanSetup({ enabled: true, tiers: DEFAULT_DAILY_TIERS }, "2026-11-15").setup.startDay, "2026-11-15");
  });
});
