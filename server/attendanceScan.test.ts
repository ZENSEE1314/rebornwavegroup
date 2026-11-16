import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const server = readFileSync(new URL("./rebornGame.ts", import.meta.url), "utf8");
const admin = readFileSync(new URL("../client/src/pages/reborn-admin.tsx", import.meta.url), "utf8");
const attend = readFileSync(new URL("../client/src/pages/reborn-attend.tsx", import.meta.url), "utf8");
const start = server.indexOf("const OPEN_SHIFT_MAX_MS");
const attendance = server.slice(start, server.indexOf('app.get("/api/reborn/staff/my-attendance"'));

describe("scan to check in and scan to check out", () => {
  it("should refuse a check-in without the workplace QR code", () => {
    assert.ok(attendance.includes("if (!(await attendanceCodeOk(code))) return { status: 400") && attendance.includes("Scan the workplace QR code to check in."));
  });

  it("should refuse a check-out without the workplace QR code", () => {
    assert.ok(attendance.includes("Scan the workplace QR code to check out."));
  });

  it("should no longer accept a photo instead of the code", () => {
    assert.ok(!attendance.includes("checkInPhoto") && !attendance.includes("take a check-in photo"));
  });

  it("should offer one scan route that checks out when a check-in is open and checks in otherwise", () => {
    assert.ok(attendance.includes('app.post("/api/reborn/staff/attend-scan", requireStaff(') && attendance.includes('(await openAttendanceOf(uid)) ? "out" : "in"'));
  });

  it("should refuse a wrong tap when the scanner says what it is for", () => {
    assert.ok(attendance.includes('const action = intent || (') && admin.includes("body: { code, intent }"));
  });

  it("should open for every staff account", () => {
    assert.ok(attendance.includes('app.post("/api/reborn/staff/check-in", requireStaff(') && attendance.includes('app.post("/api/reborn/staff/check-out", requireStaff('));
  });
});

describe("a shift that runs past midnight", () => {
  it("should find the open check-in by its state, not by today's date", () => {
    assert.ok(attendance.includes("isNull(staffAttendance.checkOutAt)") && !attendance.includes("eq(staffAttendance.workDate, todayStr())"));
  });

  it("should forget a check-in left open for 20 hours", () => {
    assert.ok(attendance.includes("const OPEN_SHIFT_MAX_MS = 20 * 3_600_000;") && admin.includes("const OPEN_SHIFT_MAX_MS = 20 * 3_600_000;"));
  });

  it("should end a shift that finishes before it starts on the next day", () => {
    assert.ok(attendance.includes("shift.endTime <= shift.startTime"));
  });

  it("should let the staff screen show Check out after midnight", () => {
    assert.ok(admin.includes("const openToday = att.find((a) => !a.checkOutAt && Date.now()"));
  });
});

describe("the phone camera page", () => {
  it("should use the scan route and say whether it checked in or out", () => {
    assert.ok(attend.includes("/api/reborn/staff/attend-scan") && attend.includes('"vn.attend.checkedOut"'));
  });
});
