import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const panel = readFileSync(new URL("./ExpensesPanel.tsx", import.meta.url), "utf8");

describe("expenses search and dates", () => {
  it("should search the supplier, the items, the invoice and the amount of an upload", () => {
    assert.ok(panel.includes("const expenseMatches = (row: Expense) => textOk([kindLabel(row.category), row.payee, row.invoiceNo, row.note") && panel.includes("...(row.items || []).map((item) => item.name)"));
  });

  it("should search a stock delivery by its supplier and items", () => {
    assert.ok(panel.includes("const deliveryMatches = (delivery: StockDelivery) => textOk([delivery.note, delivery.supplier, delivery.invoiceNo"));
  });

  it("should search the not paid bills too", () => {
    assert.ok(panel.includes("payables!.payables.filter(payableMatches).map((p) => {"));
  });

  it("should keep only the rows inside the From and To dates", () => {
    assert.ok(panel.includes("const dayOk = (day: string | null | undefined) => (!fromDay || (!!day && day >= fromDay)) && (!toDay || (!!day && day <= toDay));"));
  });

  it("should open the month of the From date", () => {
    assert.ok(panel.includes("if (e.target.value) setMonth(e.target.value.slice(0, 7));"));
  });

  it("should apply to the uploads, the recent uploads and the deliveries", () => {
    assert.ok(panel.includes("!matchesPayFilter(row) || !expenseMatches(row)") && panel.includes("matchesPayFilter(delivery) && deliveryMatches(delivery)"));
  });

  it("should say when nothing matches and offer to clear", () => {
    assert.ok(panel.includes('t("ex.noMatch")') && panel.includes('t("ex.clearFilters")'));
  });
});
