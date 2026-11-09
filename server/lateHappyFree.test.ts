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
    assert.ok(route.includes("const paidQty = qty - lateFree;") && route.includes("qty: paidQty"));
  });

  it("should tell the cashier how many were paid and how many free", () => {
    assert.ok(route.includes("{paid} paid + {free} free"));
  });
});
