import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const server = readFileSync(new URL("./rebornGame.ts", import.meta.url), "utf8");
const route = server.slice(server.indexOf('app.post("/api/reborn/shop/order"'), server.indexOf("// Phone push first and independently"));
const append = server.slice(server.indexOf("async function appendItems"), server.indexOf("async function appendItems") + 600);

describe("a staff login ordering through the phone app", () => {
  it("should name the line with (phone) so it differs from a POS entry", () => {
    assert.ok(append.includes("viaPhone && ordererName ? `${ordererName} (phone)`") && route.includes('byStaff ? "pos" : "app", byStaff)'));
  });

  it("should write the order to Admin › Logs as from the phone app", () => {
    assert.ok(route.includes('action: "add_items"') && route.includes("from the phone app"));
  });

  it("should log the table opening only when the order opened it", () => {
    assert.ok(route.includes("const openedNow = !order") && route.includes("if (openedNow) await logAdmin"));
  });
});
