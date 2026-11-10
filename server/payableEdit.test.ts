import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./rebornGame.ts", import.meta.url), "utf8");
const route = source.slice(source.indexOf('"/api/reborn/expenses/payables/:id/edit"'), source.indexOf('"/api/reborn/expenses/vendors"'));
const panel = readFileSync(new URL("../client/src/components/ExpensesPanel.tsx", import.meta.url), "utf8");

describe("editing an unpaid supplier bill", () => {
  it("should only let a manager or the main admin edit", () => {
    assert.ok(route.includes('role !== "admin" && role !== "manager"'));
  });

  it("should only edit a bill that is still unpaid", () => {
    assert.ok(route.includes('eq(supplierPayables.status, "unpaid")'));
  });

  it("should change the stock by the difference of each line", () => {
    assert.ok(route.includes("const delta = line.qty - (before.get(key) || 0);") && route.includes("stock: sql`${posProducts.stock} + ${delta}`"));
  });

  it("should add a new item to the stock list hidden from the POS", () => {
    assert.ok(route.includes("posVisible: false"));
  });

  it("should put units back out for an item taken off the bill without going below zero", () => {
    assert.ok(route.includes("GREATEST(0, ${posProducts.stock} - ${units})"));
  });

  it("should offer an Edit button beside the paid buttons", () => {
    assert.ok(panel.includes('t("ex.pay.edit")') && panel.includes("<PayableEditor"));
  });
});
