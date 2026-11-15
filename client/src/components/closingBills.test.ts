import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const admin = readFileSync(new URL("../pages/reborn-admin.tsx", import.meta.url), "utf8");
const server = readFileSync(new URL("../../../server/rebornGame.ts", import.meta.url), "utf8");
const screen = admin.slice(admin.indexOf("function DailyClosings"));
const route = server.slice(server.indexOf('"/api/reborn/admin/accounting/closing-bills"'), server.indexOf('"/api/reborn/admin/accounting/closings"'));

describe("end-of-day receipt screen", () => {
  it("should list only the chosen kind of items on screen", () => {
    assert.ok(screen.includes("itemsOfKind(selected?.items||[],printKind)") && screen.includes("shownItems.map("));
  });

  it("should show the sales of the chosen kind", () => {
    assert.ok(screen.includes("kindTotals(shownItems)") && screen.includes('t("admin.dc.itemSales")'));
  });

  it("should list each receipt with only the food or drink part when filtered", () => {
    assert.ok(screen.includes('printKind==="food"?b.food:printKind==="drink"?b.drink:b.total') && screen.includes("shownBills.map("));
  });

  it("should build the bills of a day from its paid tickets, manager and above", () => {
    assert.ok(route.includes("requireManager") && route.includes('eq(posTickets.status, "paid")') && route.includes("receiptNumbers("));
  });
});
