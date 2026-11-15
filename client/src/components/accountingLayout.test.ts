import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const admin = readFileSync(new URL("../pages/reborn-admin.tsx", import.meta.url), "utf8");
const accounting = admin.slice(admin.indexOf("function Accounting() {"), admin.indexOf("function DailyClosings"));

const CARDS: [string, string][] = [
  ["<PeriodBreakdown days={days} />", "overview"], ["<AccountingReports />", "overview"], ["<ExpensesPanel startWith=\"other\" />", "add"],
  ["<TaxFeesCard />", "setup"], ["<FixedCostsPanel />", "setup"], ["<AccountingFresh />", "setup"], ["<CommissionList days={days} />", "bills"],
  ["<ReceiptScan />", "add"], ["<DailyClosings days={days} />", "bills"], ["<AccountingOrders days={days} />", "bills"],
];

describe("Accounting sections", () => {
  for (const [card, view] of CARDS) {
    it(`should show ${card.replace(/[<>/{}= ]/g, "").slice(0, 24)} only in ${view}`, () => {
      assert.equal(accounting.split(card).length - 1, 1);
      assert.ok(accounting.includes(`{view === "${view}" && ${card}}`));
    });
  }

  it("should have the five sections", () => {
    assert.ok(accounting.includes('["overview", "entries", "add", "bills", "setup"]') || admin.includes('const ACCOUNTING_VIEWS = ["overview", "entries", "add", "bills", "setup"] as const;'));
  });
});

describe("Accounting entries", () => {
  it("should be laid out in one block per day", () => {
    assert.ok(accounting.includes("const dayGroups = groupByDay(normalLedger);") && accounting.includes("dayGroups.map((g) => ("));
  });

  it("should fold the POS bills of a day into one line", () => {
    assert.ok(accounting.includes("openSales[g.day] || !isSaleLine(l)"));
  });

  it("should show only the time on a line, the day is in the block heading", () => {
    assert.ok(accounting.includes("toLocaleTimeString(localeTag()"));
  });

  it("should offer the possible duplicates above the list", () => {
    assert.ok(accounting.includes("<DuplicateLines groups={duplicateGroups}"));
  });

  it("should remove a copy with the same delete as before, after asking", () => {
    assert.ok(accounting.includes("window.confirm(t(\"admin.acc.deleteAsk\"") && accounting.includes("deleteLedger.mutate(l.id)"));
  });
});
