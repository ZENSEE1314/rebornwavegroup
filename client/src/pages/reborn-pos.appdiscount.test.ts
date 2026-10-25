import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The POS table bill can leave the app-order discount off one bill: a "Remove" beside the app line, "Give it back" once removed, and the same flag on the quote and on the payment.
const WINDOWS_LINE_END = /\r\n/g;
const source = readFileSync(new URL("./reborn-pos.tsx", import.meta.url), "utf8").replace(WINDOWS_LINE_END, "\n");

describe("remove the app-order discount on the POS", () => {
  it("should send the flag with the bill quote", () => {
    assert.ok(source.includes("removeAppDiscount: removeAppDiscount || undefined, v:"));
  });
  it("should send the flag with the payment", () => {
    assert.ok(source.includes("staffPrice: atCostToSend(atCost), removeAppDiscount: removeAppDiscount || undefined }"));
  });
  it("should offer Remove beside the app discount line and Give it back afterwards", () => {
    assert.ok(source.includes('t("pos.appDisc.remove")') && source.includes('t("pos.appDisc.restore")'));
  });
  it("should offer it on the table bill only, not Quick sale", () => {
    assert.equal(source.split("onToggleApp={").length - 1, 1);
  });
});
