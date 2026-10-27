import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

describe("per-item commission on the POS", () => {
  it("should let any bill line be given to a staff member, not only items with a rule", () => {
    assert.doesNotMatch(read("client/src/pages/reborn-pos.tsx"), /products\.find\(\(p\) => p\.id === it\.productId\)\?\.staffCommissionKind && \(\(\)/);
  });
  it("should show the main admin the item commissions on the POS page", () => assert.match(read("client/src/pages/reborn-pos.tsx"), /role === "admin" && <ItemCommissionAdmin \/>/));
  it("should pay an item with no rule the push-sales percent when a person was picked", () => assert.match(read("server/rebornGame.ts"), /line\.commissionStaffId \? pushRule : null/));
  it("should keep payroll-settled commissions from being edited", () => assert.match(read("server/rebornGame.ts"), /Already paid out in a payroll/));
});

describe("one bill line shared between staff", () => {
  it("should offer the split on a line of more than one unit", () => assert.match(read("client/src/pages/reborn-pos.tsx"), /it\.qty > 1 && <LineCommissionSplit/));
  it("should book one commission row per person in the split", () => assert.match(read("server/rebornGame.ts"), /for \(const part of parts\)/));
  it("should keep the split on the bill line", () => assert.match(read("shared/schema.ts"), /commission_split/));
});

describe("sales day and bill commissions", () => {
  it("should let the admin open a bill's item commissions in the Sales tab", () => assert.match(read("client/src/pages/reborn-pos.tsx"), /isAdmin && !isRef && <ItemCommissionAdmin ticketId=\{o\.id\} \/>/));
  it("should group the Sales tab by sales day, not calendar date", () => assert.match(read("client/src/pages/reborn-pos.tsx"), /businessDayOf\(o\.paidAt/));
});
