import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const WINDOWS_LINE_END = /\r\n/g;
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8").replace(WINDOWS_LINE_END, "\n");
const list = read("./CommissionList.tsx");
const admin = read("../pages/reborn-admin.tsx");
const expenses = read("./ExpensesPanel.tsx");
const reports = read("./AccountingReports.tsx");
const server = read("../../../server/rebornGame.ts");

describe("accounting commission list", () => {
  it("should be shown on the Accounting page", () => {
    assert.ok(admin.includes("<CommissionList days={days} />"));
  });
  it("should let the admin change who earns a commission and its amount", () => {
    assert.ok(list.includes("edit.mutate({ id: row.id, userId: e.target.value })") && list.includes("edit.mutate({ id: row.id, amount:"));
  });
  it("should pay only the ticked commissions", () => {
    assert.ok(list.includes("pay.mutate(tickedRows.map((row) => row.id))"));
  });
  it("should not offer paid commissions for payment", () => {
    assert.ok(list.includes("!row.isSettled && <input type=\"checkbox\""));
  });
});

describe("expenses and accounting lines", () => {
  it("should tell why Move to stock is greyed out when no payment method is chosen", () => {
    assert.ok(expenses.includes('t("ex.needPayMethod")'));
  });
  it("should give the recently uploaded list the same Edit flag as the month list", () => {
    assert.ok(server.includes("const recent = listOf(recentRows);"));
  });
  it("should let the admin edit a correctable accounting line from the report", () => {
    assert.ok(reports.includes("line.canEdit && editing?.id !== line.id"));
  });
  it("should keep bills and expense uploads out of the editable accounting lines", () => {
    assert.ok(server.includes('const EDITABLE_LEDGER_REFS: (string | null)[] = [null, "stock_movement", "receipt", "receipt_expense", "item_commission_pay"];'));
  });
});
