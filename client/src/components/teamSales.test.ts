import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { tabsForRole, visibleTabs } from "../../../shared/adminTabs";

const server = readFileSync(new URL("../../../server/rebornGame.ts", import.meta.url), "utf8");
const screen = readFileSync(new URL("./TeamSales.tsx", import.meta.url), "utf8");
const admin = readFileSync(new URL("../pages/reborn-admin.tsx", import.meta.url), "utf8");
const route = server.slice(server.indexOf('app.get("/api/reborn/staff/team-sales"'), server.indexOf('app.get("/api/reborn/staff/daily-commission"'));

describe("Daily sales tab for every staff account", () => {
  it("should be a tab of staff", () => {
    assert.ok(visibleTabs("staff", null).includes("Sales"));
  });

  it("should still be a tab of managers and the main admin once", () => {
    assert.deepEqual(["manager", "admin"].map((role) => tabsForRole(role as "manager" | "admin").filter((tab) => tab === "Sales").length), [1, 1]);
  });

  it("should keep POS last for staff and managers", () => {
    assert.deepEqual([visibleTabs("staff", null).at(-1), visibleTabs("manager", null).at(-1)], ["POS", "POS"]);
  });

  it("should not be a tab of a Security account", () => {
    assert.ok(!visibleTabs("security", null).includes("Sales"));
  });

  it("should open the team view for everyone on that tab", () => {
    assert.ok(admin.includes('{tab === "Sales" && <TeamSales />}'));
  });
});

describe("team sales answer", () => {
  it("should be open to any staff account", () => {
    assert.ok(server.includes('app.get("/api/reborn/staff/team-sales", requireStaff('));
  });

  it("should count the same base as the tier commission", () => {
    assert.ok(route.includes("staffDaySales(day, nextDayOf(day))") && server.includes("const staffDaySales = async"));
  });

  it("should give only the caller their own commission amount", () => {
    assert.ok(route.includes("...(id === userId ? { amount: state.amount } : {})"));
  });

  it("should list the caller's own days of the pay period", () => {
    assert.ok(route.includes("staffDaySales(period.from, periodEnd, userId)"));
  });
});

describe("team sales screen", () => {
  it("should show how much is left to reach the next tier", () => {
    assert.ok(screen.includes('t("dcm.next"') && screen.includes('role="progressbar"'));
  });

  it("should let a person step through the days and tap one of their own", () => {
    assert.ok(screen.includes('t("ms.prevDay")') && screen.includes("onClick={() => setChosenDay(row.day)}"));
  });

  it("should list everyone's sales for the day to compare", () => {
    assert.ok(screen.includes('t("ms.everyone"'));
  });
});
