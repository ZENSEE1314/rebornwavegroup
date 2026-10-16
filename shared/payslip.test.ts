import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatAmount, isReminderDue, monthLabel, previousMonth } from "./payslip";

describe("the month to pay", () => {
  it("should be last month", () => assert.equal(previousMonth(2026, 10), "2026-09"));
  it("should be December of last year in January", () => assert.equal(previousMonth(2026, 1), "2025-12"));
});

describe("the payday reminder", () => {
  it("should not come before payday", () => assert.equal(isReminderDue({ year: 2026, month: 10, day: 14, hour: 12 }, 15, null), false));
  it("should not come on payday before the morning", () => assert.equal(isReminderDue({ year: 2026, month: 10, day: 15, hour: 8 }, 15, null), false));
  it("should come on payday morning", () => assert.equal(isReminderDue({ year: 2026, month: 10, day: 15, hour: 9 }, 15, null), true));
  it("should come late when the server missed payday", () => assert.equal(isReminderDue({ year: 2026, month: 10, day: 18, hour: 1 }, 15, null), true));
  it("should come only once for the same month", () => assert.equal(isReminderDue({ year: 2026, month: 10, day: 16, hour: 12 }, 15, "2026-09"), false));
  it("should come again the next month", () => assert.equal(isReminderDue({ year: 2026, month: 11, day: 15, hour: 9 }, 15, "2026-09"), true));
});

describe("payslip words", () => {
  it("should write the month in the language", () => assert.match(monthLabel("2026-09", "id"), /September 2026/));
  it("should write an amount with its currency", () => assert.equal(formatAmount(5000000, { symbol: "RP", decimals: 0 }), "RP 5,000,000"));
});
