import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { classifyLine, monthOfLine, monthlyReports, periodReport, sectionOf, type LedgerLine } from "./accountingReport";

let nextId = 1;
const line = (over: Partial<LedgerLine>): LedgerLine => ({ id: nextId++, kind: "expense", category: "other", amount: 0, createdAt: "2026-10-10T05:00:00Z", ...over });

describe("periodReport", () => {
  it("should add up money in from sales", () => {
    const report = periodReport([line({ kind: "income", category: "product_sale", amount: 1_000_000 }), line({ kind: "income", category: "product_sale", amount: 500_000 })], []);
    assert.equal(report.income, 1_500_000);
  });

  it("should count stock bought as the cost of goods and take it off the gross profit", () => {
    const report = periodReport([line({ kind: "income", category: "product_sale", amount: 1_000_000 }), line({ category: "purchase", amount: 400_000 })], []);
    assert.deepEqual([report.costs.stock, report.grossProfit], [400_000, 600_000]);
  });

  it("should put salary and statutory contributions under staff", () => {
    const report = periodReport([line({ category: "salary", amount: 3_000_000 }), line({ category: "statutory_contribution", amount: 300_000 })], []);
    assert.equal(report.costs.staff, 3_300_000);
  });

  it("should split uploaded utilities into electricity and water", () => {
    const power = line({ category: "utilities", amount: 620_000, refType: "expense_upload", refId: "1" });
    const water = line({ category: "utilities", amount: 80_000, refType: "expense_upload", refId: "2" });
    const report = periodReport([power, water], [{ id: 1, ledgerEntryId: power.id, category: "electricity" }, { id: 2, ledgerEntryId: water.id, category: "water" }]);
    assert.deepEqual([report.costs.electricity, report.costs.water, report.costs.utilities], [620_000, 80_000, 0]);
  });

  it("should count uploaded security and police under their own kinds", () => {
    const guards = line({ category: "other", amount: 450_000, refType: "expense_upload" });
    const police = line({ category: "other", amount: 200_000, refType: "expense_upload" });
    const report = periodReport([guards, police], [{ id: 1, ledgerEntryId: guards.id, category: "security" }, { id: 2, ledgerEntryId: police.id, category: "police" }]);
    assert.deepEqual([report.costs.security, report.costs.police, report.costs.other], [450_000, 200_000, 0]);
  });

  it("should take a voided upload out again", () => {
    const power = line({ category: "utilities", amount: 620_000, refType: "expense_upload", refId: "7" });
    const voided = line({ kind: "income", category: "expense_reversal", amount: 620_000, refType: "expense_void", refId: "7" });
    const report = periodReport([power, voided], [{ id: 7, ledgerEntryId: power.id, category: "electricity" }]);
    assert.deepEqual([report.costs.electricity, report.income], [0, 0]);
  });

  it("should give back a commission that was returned with a refund", () => {
    const report = periodReport([line({ category: "commission", amount: 100_000 }), line({ kind: "income", category: "commission_reversal", amount: 100_000 })], []);
    assert.deepEqual([report.costs.commission, report.income], [0, 0]);
  });

  it("should work out the net as money in minus every cost", () => {
    const report = periodReport([line({ kind: "income", category: "product_sale", amount: 2_000_000 }), line({ category: "purchase", amount: 500_000 }), line({ category: "rental", amount: 700_000 })], []);
    assert.equal(report.net, 800_000);
  });
});

describe("monthly reports", () => {
  it("should group lines by month, newest first", () => {
    const reports = monthlyReports([line({ createdAt: "2026-09-20T05:00:00Z", kind: "income", category: "product_sale", amount: 5 }), line({ createdAt: "2026-10-02T05:00:00Z", kind: "income", category: "product_sale", amount: 7 })], []);
    assert.deepEqual(reports.map((entry) => [entry.month, entry.report.income]), [["2026-10", 7], ["2026-09", 5]]);
  });

  it("should put a line booked late on the last night in the next month on the venue clock", () => {
    assert.equal(monthOfLine("2026-09-30T18:00:00Z"), "2026-10");
  });
});

describe("the four groups", () => {
  it("should add stock bought and lost items under items", () => {
    const report = periodReport([line({ category: "purchase", amount: 400_000 }), line({ category: "loss", amount: 50_000 })], []);
    assert.deepEqual([report.groups.items, report.costs.stockLoss], [450_000, 50_000]);
  });

  it("should put salary, commission, security and police under staff", () => {
    const guards = line({ category: "other", amount: 450_000, refType: "expense_upload" });
    const report = periodReport([line({ category: "salary", amount: 3_000_000 }), line({ category: "commission", amount: 100_000 }), guards], [{ id: 1, ledgerEntryId: guards.id, category: "security" }]);
    assert.equal(report.groups.staff, 3_550_000);
  });

  it("should put electricity, water and internet under utilities", () => {
    const power = line({ category: "utilities", amount: 620_000, refType: "expense_upload" });
    const report = periodReport([power, line({ category: "utilities", amount: 50_000 })], [{ id: 1, ledgerEntryId: power.id, category: "electricity" }]);
    assert.equal(report.groups.utilities, 670_000);
  });

  it("should put rent, refunds and everything else under company expenses", () => {
    const report = periodReport([line({ category: "rental", amount: 700_000 }), line({ category: "refund", amount: 20_000 }), line({ category: "other", amount: 30_000 })], []);
    assert.equal(report.groups.company, 750_000);
  });

  it("should make the four groups add up to all costs", () => {
    const report = periodReport([line({ category: "purchase", amount: 1 }), line({ category: "salary", amount: 2 }), line({ category: "utilities", amount: 3 }), line({ category: "other", amount: 4 })], []);
    assert.equal(Object.values(report.groups).reduce((a, b) => a + b, 0), report.costTotal);
  });
});

describe("sectionOf", () => {
  it("should file an unknown category under other", () => {
    assert.equal(sectionOf("whatever"), "other");
  });
});

describe("classifyLine", () => {
  it("should count a voided upload as a negative amount in the kind it was uploaded as", () => {
    const voided = line({ kind: "income", category: "expense_reversal", amount: 620_000, refType: "expense_void", refId: "7" });
    assert.deepEqual(classifyLine(voided, [{ id: 7, ledgerEntryId: 1, category: "electricity" }]), { group: "electricity", amount: -620_000 });
  });

  it("should count a sale as income", () => {
    assert.deepEqual(classifyLine(line({ kind: "income", category: "product_sale", amount: 5 }), []), { group: "income", amount: 5 });
  });
});
