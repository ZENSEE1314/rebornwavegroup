import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spendByStaff } from "./expenseByStaff";

const row = (over: Partial<Parameters<typeof spendByStaff>[0][number]>) => ({ status: "active", amount: "10000", uploadedBy: "u1", uploadedByName: "Kartika", ...over });

describe("spend by staff", () => {
  it("should add up what one staff member uploaded", () => assert.equal(spendByStaff([row({}), row({ amount: "5000" })])[0].total, 15_000));
  it("should count the uploads of each staff member", () => assert.equal(spendByStaff([row({}), row({})])[0].count, 2));
  it("should leave voided uploads out", () => assert.deepEqual(spendByStaff([row({ status: "voided" })]), []));
  it("should list the biggest spender first", () => assert.equal(spendByStaff([row({}), row({ uploadedBy: "u2", uploadedByName: "Budi", amount: "99000" })])[0].name, "Budi"));
  it("should keep each staff member apart", () => assert.equal(spendByStaff([row({}), row({ uploadedBy: "u2", uploadedByName: "Budi" })]).length, 2));
});
