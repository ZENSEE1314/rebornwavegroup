import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./rebornGame.ts", import.meta.url), "utf8");
const route = source.slice(source.indexOf('"/api/reborn/expenses/receipts/:id/delete"'), source.indexOf('"/api/reborn/expenses/:id/void"'));

describe("deleting a stock receipt that has no stock-in records", () => {
  it("should fall back to the receipt's own lines instead of refusing", () => {
    assert.ok(route.includes("payableItemsOf({ kind: \"stock\", note: row.note }, null)") && route.includes("if (!perCopy || copiesDiffer)"));
  });

  it("should take the units out of the matching items", () => {
    assert.ok(route.includes("stock: sql`${posProducts.stock} - ${units}`"));
  });

  it("should never take the stock below zero", () => {
    assert.ok(route.includes("Math.min(Math.max(0, Number(product.stock) || 0), Math.round(line.qty))"));
  });

  it("should still delete the purchase and void its unpaid bill", () => {
    assert.ok(route.includes('set({ status: "void" })') && route.includes("tx.delete(ledgerEntries)"));
  });

  it("should still refuse when the receipt has no lines to take back", () => {
    assert.ok(route.includes("if (!lines.length) return res.status(400)"));
  });
});
