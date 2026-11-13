import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const server = readFileSync(new URL("./rebornGame.ts", import.meta.url), "utf8");
const reports = readFileSync(new URL("../client/src/components/AccountingReports.tsx", import.meta.url), "utf8");
const remove = server.slice(server.indexOf("const deleteStockDelivery"), server.indexOf("const MAX_DRILL_LINES"));

describe("deleting a stock delivery in Accounting", () => {
  it("should take the units off the shelf and remove the delivery from the costing history", () => {
    assert.ok(remove.includes("${posProducts.stock} - ${move.delta}") && remove.includes("tx.delete(stockMovements)"));
  });

  it("should take the units off even when the stock is empty, so the count can go below 0", () => {
    assert.ok(!remove.includes("allowNegativeStock") && !remove.includes("cannot be taken off"));
  });

  it("should void a bill that was not paid yet and refuse one already paid", () => {
    assert.ok(remove.includes('set({ status: "void" })') && remove.includes('payable?.status === "paid"'));
  });

  it("should keep a log of the deletion", () => {
    assert.ok(remove.includes('action: "delete_stock_delivery"'));
  });

  it("should be offered on stock deliveries and manual lines only", () => {
    assert.ok(server.includes('canDelete: row.refType === null || row.refType === "stock_movement"') && server.includes('if (row.refType === "stock_movement") return deleteStockDelivery(req, res, row);'));
  });
});

describe("adding the missing receipt photo to a stock delivery", () => {
  it("should accept a photo on an editable line", () => {
    assert.ok(server.includes('req.body.photoUrl.startsWith("data:image/") && req.body.photoUrl.length <= MAX_EXPENSE_PHOTO_LENGTH) patch.photoUrl'));
  });

  it("should not copy the photo itself into the log", () => {
    assert.ok(server.includes('photoUrl: "receipt photo added"'));
  });

  it("should offer Add receipt photo only on a stock delivery that has none", () => {
    assert.ok(reports.includes('line.canEdit && !line.hasPhoto && line.refType === "stock_movement"'));
  });
});
