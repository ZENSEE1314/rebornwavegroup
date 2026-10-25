import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The pay panels used to show a "Salesperson (commission)" dropdown AND, further down, a separate "Commission (our cost)" box: two places for one idea.
// They are now one "Commission to" section (a staff member, or an agency whose name is typed). Opening a table still has its own salesperson picker.
const WINDOWS_LINE_END = /\r\n/g;
const source = readFileSync(new URL("./reborn-pos.tsx", import.meta.url), "utf8").replace(WINDOWS_LINE_END, "\n");
const count = (text: string, part: string) => text.split(part).length - 1;

describe("POS pay panels", () => {
  it("should no longer have the separate commission box", () => {
    assert.equal(count(source, "<CommissionBox"), 0);
  });
  it("should have the one commission section on the table bill and on Quick sale", () => {
    assert.equal(count(source, "<CommissionPayer "), 2);
  });
  it("should keep the salesperson picker only where a table is opened", () => {
    assert.equal(count(source, "<SalesPicker "), 1);
  });
  it("should let the cashier type the agency's name", () => {
    assert.ok(source.includes('t("pos.com.agencyName")') && source.includes("payee: e.target.value"));
  });
  it("should not book a separate commission for a staff member", () => {
    const section = source.slice(source.indexOf("function CommissionPayer("), source.indexOf("// Admin: the saved commissions"));
    assert.ok(section.includes("onChange(emptyCommission());\n    onSales(choice);"));
  });
});
