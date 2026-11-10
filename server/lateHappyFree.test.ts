import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./rebornGame.ts", import.meta.url), "utf8");
const route = source.slice(source.indexOf('"/api/reborn/pos/items/:id/edit"'), source.indexOf('"/api/reborn/pos/items/:id/remove"'));

describe("late happy-hour key-in on a bill line", () => {
  it("should add the free units as their own (free) line at price 0", () => {
    assert.ok(route.includes("lateFree > 0") && route.includes('price: "0", qty: lateFree, lineTotal: "0"'));
  });

  it("should charge only the paid units on the original line", () => {
    assert.ok(route.includes("const paidQty = qty;") && route.includes("qty: paidQty"));
  });

  it("should give the free units for the typed paid units, so 4 on buy 1 get 1 free is 4 free", () => {
    assert.ok(route.includes("Math.floor(qty / deal.buy) * deal.free"));
  });

  it("should keep the deal on a line ordered inside happy hour without a tick", () => {
    assert.ok(route.includes("orderedInHappyHour") && route.includes("(orderedInHappyHour && !req.body?.atCost)"));
  });

  it("should update the existing free line instead of adding a second one", () => {
    assert.ok(route.includes("if (lateFree > 0 && freeLine)"));
  });

  it("should tell the cashier how many were paid and how many free", () => {
    assert.ok(route.includes("{paid} paid + {free} free"));
  });
});
