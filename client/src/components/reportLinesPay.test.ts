import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const server = readFileSync(new URL("../../../server/rebornGame.ts", import.meta.url), "utf8");
const screen = readFileSync(new URL("./AccountingReports.tsx", import.meta.url), "utf8");
const route = server.slice(server.indexOf('app.get("/api/reborn/admin/accounting/report-lines"'), server.indexOf('app.get("/api/reborn/industries"'));

describe("report lines on the server", () => {
  it("should search every line of the group before cutting to the newest ones", () => {
    assert.ok(route.includes("(!q || textOf(entry).includes(q))") && route.indexOf("textOf(entry).includes(q)") < route.indexOf("matched.slice(0, MAX_DRILL_LINES)"));
  });

  it("should filter paid and not paid on the bill of each line", () => {
    assert.ok(route.includes('(billOfLedger.get(entry.row.id)?.status === "unpaid") === (payFilter === "unpaid")'));
  });

  it("should send each line's bill so it can be paid there", () => {
    assert.ok(route.includes("payable: billOfLedger.get(row.id)") && route.includes("unpaidCount: unpaidBills.length"));
  });

  it("should search the note, the supplier, the invoice and the amount", () => {
    assert.ok(route.includes("bill?.supplier, bill?.invoiceNo") && route.includes("String(Math.abs(entry.counted.amount))"));
  });
});

describe("report lines on the screen", () => {
  it("should show Paid or Not paid on a purchase line", () => {
    assert.ok(screen.includes('t("ex.notPaidChip")') && screen.includes('t("ex.paid")') && screen.includes('const BILL_REFS = ["stock_movement", "receipt", "receipt_expense", "expense_upload"];'));
  });

  it("should let a not paid line be paid by cash, card or bank transfer right there", () => {
    assert.ok(screen.includes("/api/reborn/expenses/payables/${v.id}/pay") && screen.includes('const PAY_METHODS = ["cash", "card", "transfer"] as const;') && screen.includes("markPaid.mutate({ id: line.payable!.id, method })"));
  });

  it("should have a search box that stays on screen while the list loads", () => {
    assert.ok(screen.includes('type="search"') && screen.includes('{!data && <p className="py-2 text-[11px] text-white/40">…</p>}'));
  });

  it("should have the All, Paid and Not paid chips on cost groups only", () => {
    assert.ok(screen.includes('group !== "income" && (') && screen.includes('["all", "paid", "unpaid"] as const'));
  });

  it("should wait a moment while typing before asking the server", () => {
    assert.ok(screen.includes("setTimeout(() => setSearched(search.trim()), SEARCH_DELAY_MS)"));
  });
});
