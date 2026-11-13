import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const server = readFileSync(new URL("./rebornGame.ts", import.meta.url), "utf8");
const form = readFileSync(new URL("../client/src/components/StockAdjust.tsx", import.meta.url), "utf8");

describe("receipt photo on stock bought", () => {
  it("should keep the photo on the purchase line whether the bill is paid or not", () => {
    assert.ok(server.includes("const stockPhoto = buyingWithCost &&") && server.includes("photoUrl: stockPhoto, refType: \"stock_movement\""));
  });

  it("should only take an image of a sensible size", () => {
    assert.ok(server.includes('req.body.photoUrl.startsWith("data:image/") && req.body.photoUrl.length <= MAX_EXPENSE_PHOTO_LENGTH'));
  });

  it("should let the person add the receipt photo next to the paid / not paid choice", () => {
    assert.ok(form.includes("<ImageUpload value={receiptPhoto}") && form.includes("photoUrl: receiptPhoto || undefined"));
  });
});
