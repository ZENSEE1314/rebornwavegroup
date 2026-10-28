import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The item edit form (Admin › Inventory / Products) grew long (sell options, happy hour, staff commission). Its Save button used to be a small tick at the very
// end, about 2,000 px down, so on a phone it looked as if an item could not be saved. Save must be reachable at the top of the form as well.
const WINDOWS_LINE_END = /\r\n/g;
const source = readFileSync(new URL("./reborn-admin.tsx", import.meta.url), "utf8").replace(WINDOWS_LINE_END, "\n");
const productRow = source.slice(source.indexOf("function ProductRow("));
const editForm = productRow.slice(productRow.indexOf(") : (\n        <div>"));
const firstSave = editForm.indexOf("save.mutate()");
const longSections = editForm.indexOf("<SellOptions");

describe("item edit form", () => {
  it("should have a Save button before the long sell-options section", () => {
    assert.ok(firstSave > 0 && longSections > 0 && firstSave < longSections);
  });
  it("should have a Cancel button before the long sell-options section", () => {
    assert.ok(editForm.indexOf("setEdit(false)") < longSections);
  });
  it("should label Save and Cancel with words, not only an icon", () => {
    assert.ok(editForm.includes('t("admin.c.save")') && editForm.includes('t("admin.c.cancel")'));
  });
  it("should give the Inventory editor a key per item so a different item never inherits the previous item's form values", () => {
    assert.ok(source.includes("<ProductRow key={product.id} p={product} inventory />"));
  });
  it("should open the Inventory editor inside the item's own row, not at the end of its category", () => {
    assert.ok(source.includes("{openId === it.id && renderEditor(it.id)}"));
  });
  it("should not offer a staff commission rule on the item form", () => {
    assert.ok(!source.includes('t("admin.sc.title")'));
  });
  it("should keep a second Save at the end of the form", () => {
    assert.ok(editForm.lastIndexOf("save.mutate()") > longSections);
  });
});
