import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const panel = read("./ExpensesPanel.tsx");
const server = read("../../../server/rebornGame.ts");

describe("expenses list shows paid and not paid", () => {
  it("should filter the list by all, paid or not paid yet", () => {
    assert.ok(panel.includes('(["all", "paid", "unpaid"] as const)') && panel.includes("matchesPayFilter(row)"));
  });

  it("should show a status on every expense and stock delivery", () => {
    assert.ok(panel.includes("payStatus(row.bill ?? null, row.payMethod)") && panel.includes("payStatus(delivery.bill ?? null)"));
  });

  it("should let a manager mark a not paid line paid by cash, card or transfer right in the list", () => {
    assert.ok(panel.includes('markPaid.mutate({ id: bill.id!, method })') && panel.includes("payables?.canPay && isUnpaid(bill)"));
  });

  it("should send the bill id and how it was paid with every row", () => {
    assert.ok(server.includes("{ id: b.id, status: b.status, dueDate: b.dueDate, payMethod: b.payMethod, paidOn: b.paidOn }"));
  });
});

describe("receipt photo on every line of the expenses panel", () => {
  it("should offer View photo on stock deliveries and on not paid bills", () => {
    assert.ok(panel.includes("showLedgerPhoto(delivery.id)") && panel.includes("showLedgerPhoto(p.ledgerEntryId!)"));
  });

  it("should say No photo when a line has none", () => {
    assert.ok(panel.includes('t("ex.noPhoto")'));
  });

  it("should open every photo in the zoom viewer", () => {
    assert.ok(panel.includes("<ReceiptPhotoViewer src={photo.url}"));
  });

  it("should serve the photo of a ledger line only to the manager, the main admin or the person who keyed it", () => {
    assert.ok(server.includes('app.get("/api/reborn/expenses/ledger/:id/photo"') && server.includes('role !== "admin" && role !== "manager" && row.userId !== userId'));
  });
});

describe("drop-down of names typed before", () => {
  it("should suggest suppliers and items while typing in the bill editor and the form", () => {
    assert.ok(panel.includes("<SuggestInput options={supplierNames}") && panel.includes("<SuggestInput options={itemNames}") && panel.includes("<SuggestInput options={knownSupplierNames}") && panel.includes("<SuggestInput options={knownItemNames}"));
  });

  it("should fill the box when a suggestion is tapped, without losing focus first", () => {
    const input = read("./SuggestInput.tsx");
    assert.ok(input.includes("onPointerDown={(e) => { e.preventDefault(); pick(name); }}"));
  });
});
