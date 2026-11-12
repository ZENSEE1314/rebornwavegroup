import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const pos = readFileSync(new URL("./reborn-pos.tsx", import.meta.url), "utf8");
const server = readFileSync(new URL("../../../server/rebornGame.ts", import.meta.url), "utf8");

describe("reprinting a past POS closing from the POS screen", () => {
  it("should list the closed days and open one in the same report that has the Print button", () => {
    assert.ok(pos.includes("onClick={() => setReport(row)}") && pos.includes("<ClosingReport report={report}"));
  });

  it("should load the list only when the person asks for it", () => {
    assert.ok(pos.includes("enabled: showPast"));
  });

  it("should let a manager read the closed days, the same people who may close the day", () => {
    assert.ok(server.includes('"/api/reborn/admin/accounting/closings", requireManager('));
  });
});

describe("days nobody closed", () => {
  it("should build the report of a day with paid bills but no saved closing", () => {
    assert.ok(server.includes("notClosed: true, ...(await buildDailyClosingReport(day))"));
  });

  it("should mark such a day in the list", () => {
    assert.ok(pos.includes('t("pos.close.notClosed")'));
  });
});
