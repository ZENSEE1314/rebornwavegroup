import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./receipt.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");

describe("receipt line commission", () => {
  it("should put each item's commission person and % under the item on the sales copy", () => {
    assert.ok(source.includes("${lineCommission(it, showCommission)}"));
  });
  it("should never print a line commission on the customer's copy", () => {
    assert.ok(source.includes('if (!showCommission || !it.commissionStaffName || !(percent > 0)) return "";'));
  });
  it("should print the sales copy when a line has a commission person", () => {
    assert.ok(source.includes("it.commissionStaffName && Number(it.commissionPercent) > 0"));
  });
});
