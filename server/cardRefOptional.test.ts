import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./rebornGame.ts", import.meta.url), "utf8");
const client = readFileSync(new URL("../client/src/pages/reborn-pos.tsx", import.meta.url), "utf8");

describe("card payment without a receipt number", () => {
  it("should not make the server reject a card bill that has no approval number", () => {
    assert.ok(!source.includes('paymentMethod === "card" && !paymentReference'));
  });

  it("should not keep the pay button disabled for a card bill with no approval number", () => {
    assert.ok(!client.includes('pay === "card" && !paymentReference.trim()'));
  });
});
