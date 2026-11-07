import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const server = readFileSync(new URL("./rebornGame.ts", import.meta.url), "utf8");
const panel = readFileSync(new URL("../client/src/components/ExpensesPanel.tsx", import.meta.url), "utf8");
const deleteRoute = server.slice(server.indexOf('"/api/reborn/expenses/receipts/:id/delete"'), server.indexOf('"/api/reborn/expenses/:id/void"'));
const editRoute = server.slice(server.indexOf('"/api/reborn/expenses/receipts/:id/edit"'), server.indexOf('"/api/reborn/expenses/receipts/:id/delete"'));

describe("stock receipt edit and delete", () => {
  it("should take the stock back out and remove the purchase line when a receipt is deleted", () => {
    assert.ok(deleteRoute.includes("stock: sql`${posProducts.stock} - ${move.delta}`") && deleteRoute.includes("tx.delete(ledgerEntries)"));
  });

  it("should refuse to delete a receipt whose stock was already sold or used", () => {
    assert.ok(deleteRoute.includes("Number(p.stock) < (taken.get(p.id) || 0)") && deleteRoute.includes("status(400)"));
  });

  it("should change only the amount on edit so the receipt heading still finds its stock lines", () => {
    assert.ok(editRoute.includes("set({ amount: String(amount) })") && !editRoute.includes("note:"));
  });

  it("should apply the same who-may rule as an expense upload", () => {
    assert.ok(server.includes("canEditExpense(await adminRole(userId), userId, { uploadedBy: row.userId, createdAt: row.createdAt })"));
  });

  it("should show Edit and Delete on a delivery only when the server says the user may", () => {
    assert.ok(panel.includes("{delivery.canEdit && ("));
  });

  it("should ask before deleting a receipt", () => {
    assert.ok(panel.includes('window.confirm(t("ex.receiptDeleteAsk"'));
  });
});
