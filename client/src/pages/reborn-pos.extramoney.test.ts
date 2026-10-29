import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Card-to-cash exchange: the main admin adds extra money to a table bill; the customer pays it by card on top of the sale.
const WINDOWS_LINE_END = /\r\n/g;
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8").replace(WINDOWS_LINE_END, "\n");
const pos = read("./reborn-pos.tsx");
const receipt = read("../lib/receipt.ts");
const server = read("../../../server/rebornGame.ts");

describe("extra money on a POS bill", () => {
  it("should save the amount on the bill through the admin route", () => {
    assert.ok(pos.includes("/extra-money`, { amount }"));
  });
  it("should offer the box to the main admin only", () => {
    assert.ok(pos.includes('useAdminRole() === "admin"') && pos.includes("{isMainAdmin && ("));
  });
  it("should add the extra money to what the customer pays", () => {
    assert.ok(pos.includes("const payable = due.payable + extraMoney;"));
  });
  it("should print the extra money and the card total on the receipt", () => {
    assert.ok(receipt.includes('tr("pos.rc.extraMoney")') && receipt.includes('tr("pos.rc.extraToPay")'));
  });
  it("should keep the extra money out of the cash and card tallies of a sale", () => {
    assert.ok(server.includes("sum.card += paid + exchanged; sum.cash -= exchanged;"));
  });
});
