import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

describe("per-item commission on the POS", () => {
  it("should let any bill line be given to a staff member, not only items with a rule", () => {
    assert.doesNotMatch(read("client/src/pages/reborn-pos.tsx"), /products\.find\(\(p\) => p\.id === it\.productId\)\?\.staffCommissionKind && \(\(\)/);
  });
  it("should show the main admin the item commissions on the POS page", () => assert.match(read("client/src/pages/reborn-pos.tsx"), /role === "admin" && <ItemCommissionAdmin \/>/));
  it("should pay an item with no rule the push-sales percent when a person was picked", () => assert.match(read("server/rebornGame.ts"), /line\.commissionStaffId && pushPercent > 0/));
  it("should keep payroll-settled commissions from being edited", () => assert.match(read("server/rebornGame.ts"), /Already paid out in a payroll/));
});
