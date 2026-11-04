import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spendByStaff, type StaffExpenseRow } from "./expenseByStaff";

const row = (over: Partial<StaffExpenseRow>): StaffExpenseRow => ({ id: 1, status: "active", amount: "10000", uploadedBy: "u1", uploadedByName: "Kartika", spentOn: "2026-11-01", category: "water", ...over });

describe("spend by staff", () => {
  it("should add up what one staff member uploaded", () => assert.equal(spendByStaff([row({}), row({ id: 2, amount: "5000" })])[0].total, 15_000));
  it("should count the uploads of each staff member", () => assert.equal(spendByStaff([row({}), row({ id: 2 })])[0].count, 2));
  it("should leave voided uploads out", () => assert.deepEqual(spendByStaff([row({ status: "voided" })]), []));
  it("should list the biggest spender first", () => assert.equal(spendByStaff([row({}), row({ id: 2, uploadedBy: "u2", uploadedByName: "Budi", amount: "99000" })])[0].name, "Budi"));
  it("should keep each staff member apart", () => assert.equal(spendByStaff([row({}), row({ id: 2, uploadedBy: "u2", uploadedByName: "Budi" })]).length, 2));
  it("should split paid from still owed", () => assert.deepEqual(spendByStaff([row({}), row({ id: 2, amount: "4000", bill: { status: "unpaid" } })]).map((s) => [s.paid, s.unpaid]), [[10_000, 4_000]]));
  it("should keep every receipt with its items, newest first", () => assert.deepEqual(spendByStaff([row({}), row({ id: 2, spentOn: "2026-11-03", items: [{ name: "Ice", qty: 2, unitCost: 17000 }] })])[0].receipts.map((r) => [r.id, r.items.length]), [[2, 1], [1, 0]]));
});
