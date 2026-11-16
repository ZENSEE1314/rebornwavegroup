import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { dayKeyOf, findDuplicates, groupByDay, type LedgerLine } from "./accountingEntries";

// UTC times, so the tests do not depend on the computer's time zone. Venue day D = D 01:00 UTC (08:00 Jakarta) up to the next day 01:00 UTC.
const at = (day: number, hour: number, minute = 0) => new Date(Date.UTC(2026, 10, day, hour, minute)).toISOString();
const line = (id: number, patch: Partial<LedgerLine> = {}): LedgerLine => ({ id, kind: "expense", category: "purchase", amount: 100_000, note: "Stock in: 2 × Bintang", createdAt: at(11, 12), refType: "stock_movement", ...patch });

describe("grouping the entries by day", () => {
  it("should put lines of the same day in one block", () => {
    assert.equal(groupByDay([line(1, { createdAt: at(11, 9) }), line(2, { createdAt: at(11, 20) })]).length, 1);
  });

  it("should put the newest day first", () => {
    assert.deepEqual(groupByDay([line(1, { createdAt: at(10, 12) }), line(2, { createdAt: at(12, 12) })]).map((group) => group.day), [dayKeyOf(at(12, 12)), dayKeyOf(at(10, 12))]);
  });

  it("should put the newest line first inside a day", () => {
    assert.deepEqual(groupByDay([line(1, { createdAt: at(11, 9) }), line(2, { createdAt: at(11, 20) })])[0].lines.map((l) => l.id), [2, 1]);
  });

  it("should add up what came in and what went out", () => {
    const [group] = groupByDay([line(1, { kind: "income", amount: 500_000 }), line(2, { amount: 120_000 }), line(3, { amount: "30000" })]);
    assert.deepEqual([group.income, group.expense], [500_000, 150_000]);
  });
});

describe("the venue day (08:00 to 08:00)", () => {
  it("should keep a 03:00 Jakarta sale with the night before", () => {
    assert.equal(dayKeyOf(at(11, 20)), "2026-11-11");
  });

  it("should still be the same venue day at 07:59 Jakarta", () => {
    assert.equal(dayKeyOf(at(12, 0, 59)), "2026-11-11");
  });

  it("should start the next venue day at 08:00 Jakarta", () => {
    assert.equal(dayKeyOf(at(12, 1)), "2026-11-12");
  });

  it("should put a 00:30 Jakarta line and a 22:00 Jakarta line in one block", () => {
    assert.equal(groupByDay([line(1, { createdAt: at(11, 15) }), line(2, { createdAt: at(11, 17, 30) })]).length, 1);
  });

  it("should split lines before and after 08:00 Jakarta", () => {
    assert.equal(groupByDay([line(1, { createdAt: at(12, 0, 30) }), line(2, { createdAt: at(12, 1, 30) })]).length, 2);
  });
});

describe("lines that look keyed in twice", () => {
  it("should find two identical typed-in lines on the same day", () => {
    assert.deepEqual(findDuplicates([line(1), line(2)]).map((group) => group.map((l) => l.id)), [[1, 2]]);
  });

  it("should keep the oldest line of the pair first", () => {
    assert.deepEqual(findDuplicates([line(2, { createdAt: at(11, 14) }), line(1, { createdAt: at(11, 10) })])[0].map((l) => l.id), [1, 2]);
  });

  it("should not match lines of different days", () => {
    assert.equal(findDuplicates([line(1), line(2, { createdAt: at(12, 12) })]).length, 0);
  });

  it("should not match lines of a different amount", () => {
    assert.equal(findDuplicates([line(1), line(2, { amount: 100_001 })]).length, 0);
  });

  it("should ignore capital letters and extra spaces in the text", () => {
    assert.equal(findDuplicates([line(1), line(2, { note: "  stock IN:  2 × bintang " })]).length, 1);
  });

  it("should never call two POS sales a duplicate", () => {
    assert.equal(findDuplicates([line(1, { refType: "pos_order", kind: "income" }), line(2, { refType: "pos_order", kind: "income" })]).length, 0);
  });

  it("should find a manual line keyed twice", () => {
    assert.equal(findDuplicates([line(1, { refType: null, note: "Gas" }), line(2, { refType: null, note: "Gas" })]).length, 1);
  });
});
