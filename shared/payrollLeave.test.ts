import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { cleanNoLeaveMonths, datesInMonth, leaveSummary, unpaidDeduction } from "./payrollLeave";

const OCT = "2026-10";
const base = { month: OCT, leaves: [], noLeaveMonths: [], scheduledDates: [], attendedDates: [], needsAttendance: true, today: "2026-10-31" };

describe("datesInMonth", () => {
  it("should list the days of a leave inside the month", () => {
    assert.deepEqual(datesInMonth("2026-10-05", "2026-10-07", OCT), ["2026-10-05", "2026-10-06", "2026-10-07"]);
  });

  it("should cut a leave that runs into the next month", () => {
    assert.deepEqual(datesInMonth("2026-10-30", "2026-11-02", OCT), ["2026-10-30", "2026-10-31"]);
  });

  it("should cut a leave that began in the month before", () => {
    assert.deepEqual(datesInMonth("2026-09-29", "2026-10-02", OCT), ["2026-10-01", "2026-10-02"]);
  });
});

describe("leaveSummary", () => {
  it("should not take pay off for paid leave in a normal month", () => {
    assert.equal(leaveSummary({ ...base, leaves: [{ type: "leave", startDate: "2026-10-05", endDate: "2026-10-06", paid: true }] }).unpaidDays, 0);
  });

  it("should take pay off for leave the approver marked unpaid", () => {
    assert.equal(leaveSummary({ ...base, leaves: [{ type: "leave", startDate: "2026-10-05", endDate: "2026-10-06", paid: false }] }).unpaidDays, 2);
  });

  it("should make MC unpaid in a month with no leave", () => {
    const result = leaveSummary({ ...base, noLeaveMonths: [OCT], leaves: [{ type: "mc", startDate: "2026-10-05", endDate: "2026-10-05", paid: true }] });
    assert.deepEqual([result.mcDays, result.unpaidDays, result.isNoLeaveMonth], [1, 1, true]);
  });

  it("should count a scheduled day with no check-in as absent", () => {
    assert.equal(leaveSummary({ ...base, scheduledDates: ["2026-10-03", "2026-10-04"], attendedDates: ["2026-10-03"] }).absentDays, 1);
  });

  it("should not count a scheduled day that is covered by approved leave as absent", () => {
    const result = leaveSummary({ ...base, scheduledDates: ["2026-10-05"], leaves: [{ type: "mc", startDate: "2026-10-05", endDate: "2026-10-05", paid: true }] });
    assert.equal(result.absentDays, 0);
  });

  it("should not count a shift that has not happened yet", () => {
    assert.equal(leaveSummary({ ...base, today: "2026-10-10", scheduledDates: ["2026-10-20"] }).absentDays, 0);
  });

  it("should never count a person who needs no attendance as absent", () => {
    assert.equal(leaveSummary({ ...base, needsAttendance: false, scheduledDates: ["2026-10-03"] }).absentDays, 0);
  });
});

describe("unpaidDeduction", () => {
  it("should take one day of pay for each unpaid day", () => {
    assert.equal(unpaidDeduction(2_600_000, 26, 2), 200_000);
  });

  it("should never take more than the salary", () => {
    assert.equal(unpaidDeduction(100_000, 1, 5), 100_000);
  });

  it("should use the default pay days when none is given", () => {
    assert.equal(unpaidDeduction(2_600_000, 0, 1), 100_000);
  });
});

describe("cleanNoLeaveMonths", () => {
  it("should keep valid months once and sorted", () => {
    assert.deepEqual(cleanNoLeaveMonths(["2026-12", "2026-12", "nope", "2026-02"]), ["2026-02", "2026-12"]);
  });
});
