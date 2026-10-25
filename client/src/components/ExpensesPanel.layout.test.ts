import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Expenses (also used inside Accounting): editing opens the form right under the row, not at the top of the page; void and the receipt photo are pop-ups in front of the page.
const WINDOWS_LINE_END = /\r\n/g;
const source = readFileSync(new URL("./ExpensesPanel.tsx", import.meta.url), "utf8").replace(WINDOWS_LINE_END, "\n");

describe("expenses panel", () => {
  it("should show the edit form under the row that is being edited", () => {
    assert.ok(source.includes("{editingId === row.id && formCard}"));
  });
  it("should show the form at the top only when a new expense is being added", () => {
    assert.ok(source.includes("{!editingId && formCard}"));
  });
  it("should not jump to the top of the page when editing starts", () => {
    assert.ok(!source.includes("window.scrollTo"));
  });
  it("should open the void box as a pop-up", () => {
    assert.ok(source.includes('<Popup onClose={() => setVoiding(null)}'));
  });
  it("should open the receipt photo as a pop-up", () => {
    assert.ok(source.includes('<Popup onClose={() => setPhoto(null)}'));
  });
  it("should draw pop-ups through a portal to the page body", () => {
    assert.ok(source.includes("createPortal(") && source.includes("document.body"));
  });
});
