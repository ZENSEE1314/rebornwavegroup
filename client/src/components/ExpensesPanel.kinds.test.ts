import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GROUP_OF_SECTION, sectionOf } from "../../../shared/accountingReport";

const WINDOWS_LINE_END = /\r\n/g;
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8").replace(WINDOWS_LINE_END, "\n");
const panel = read("./ExpensesPanel.tsx");
const server = read("../../../server/rebornGame.ts");

describe("expense kinds the admin makes", () => {
  it("should count a kind of the admin's own under Company expenses", () => {
    assert.equal(GROUP_OF_SECTION[sectionOf("x:Renovation")], "company");
  });
  it("should offer adding a kind in the Expenses form", () => {
    assert.ok(panel.includes('apiRequest("POST", "/api/reborn/admin/expense-categories", { name: newKind })'));
  });
  it("should show the typed name, not a translation key, for such a kind", () => {
    assert.ok(panel.includes("category.slice(CUSTOM_KIND_PREFIX.length)"));
  });
  it("should accept an upload only for a kind that was added", () => {
    assert.ok(server.includes("(await customCategoriesOf()).includes(category)"));
  });
});
