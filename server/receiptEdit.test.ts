import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { parseReceiptHead } from "./receiptLogic.ts";

const source = readFileSync(new URL("./rebornGame.ts", import.meta.url), "utf8");
const route = source.slice(source.indexOf('"/api/reborn/expenses/receipts/:id/edit"'), source.indexOf('"/api/reborn/expenses/receipts/:id/delete"'));

describe("stock receipt heading", () => {
  it("should read the supplier, invoice and day back out of the note", () => {
    assert.deepEqual(parseReceiptHead("Receipt 79370 from Perusahaan Es PT. Mawar Baru (2026-11-09): 2 × Es Kristal"), { invoiceNo: "79370", supplier: "Perusahaan Es PT. Mawar Baru", date: "2026-11-09" });
  });

  it("should not take the supplier for the invoice when there is no invoice", () => {
    assert.deepEqual(parseReceiptHead("Receipt from PT Bir (2026-10-14): 1 × Bintang"), { invoiceNo: "", supplier: "PT Bir", date: "2026-10-14" });
  });

  it("should give empty parts for a bare receipt", () => {
    assert.deepEqual(parseReceiptHead("Receipt: 1 × A"), { invoiceNo: "", supplier: "", date: "" });
  });
});

describe("editing a saved stock receipt", () => {
  it("should move the stock by the difference when the items are sent", () => {
    assert.ok(route.includes("rewriteReceiptLines(tx") && route.includes("readReceiptLines(req, req.body.items)"));
  });

  it("should still change only the amount when no items are sent", () => {
    assert.ok(route.includes(": row.note;"));
  });

  it("should keep the owed bill's supplier and lines in step", () => {
    assert.ok(route.includes('inArray(supplierPayables.status, ["unpaid", "paid"])'));
  });

  it("should show the supplier and lines of each receipt in the list", () => {
    assert.ok(source.includes("...parseReceiptHead(delivery.note)"));
  });
});

describe("editing a receipt or bill in the Expenses panel", () => {
  const panel = readFileSync(new URL("../client/src/components/ExpensesPanel.tsx", import.meta.url), "utf8");

  it("should put the supplier in the title of a stock receipt", () => {
    assert.ok(panel.includes('{t("ex.cat.stock")}{delivery.supplier ?'));
  });

  it("should offer the stock list and known suppliers as a dropdown while typing", () => {
    assert.ok(panel.includes('list="payable-items"') && panel.includes('list="payable-suppliers"'));
  });

  it("should use the saved spelling when the typed name is the same apart from capitals", () => {
    assert.ok(panel.includes("sameName(item.name, itemNames) ?? item.name"));
  });

  it("should open the item editor for a saved receipt, not only its amount", () => {
    assert.ok(panel.includes("<PayableEditor hideDueDate"));
  });

  it("should suggest stock items while a new stock line's name is typed and tie it to the matching item", () => {
    assert.ok(panel.includes('list="expense-item-names"') && panel.includes("setNewLineName(line.key, e.target.value)") && panel.includes("setLine(key, hit ? { productId: hit.id"));
  });

  it("should suggest every supplier on file, not only the saved vendors, in the Paid to box", () => {
    assert.ok(panel.includes('<datalist id="expense-vendors">{knownSupplierNames.map'));
  });
});
