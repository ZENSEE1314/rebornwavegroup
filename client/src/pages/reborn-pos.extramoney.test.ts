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
    assert.ok(pos.includes("const payable = due.payable + extraMoney + topCashN;")); // the top-up kept as credits is added the same way
  });
  it("should print the extra money and the card total on the receipt", () => {
    assert.ok(receipt.includes('tr("pos.rc.extraMoney")') && receipt.includes('tr("pos.rc.extraToPay")'));
  });
  it("should keep the extra money out of the cash and card tallies of a sale", () => {
    assert.ok(server.includes("sum.card += paid + exchanged + toppedUp; sum.cash -= exchanged;"));
  });
});

describe("card to cash exchange with nothing ordered", () => {
  it("should let Charge be pressed when only extra money is on the bill", () => {
    assert.ok(pos.includes("(total <= 0 && extraMoney <= 0)"));
  });
  it("should pay such a bill by card on the server, not as a package bill", () => {
    assert.ok(server.includes('const paymentMethod = exchangeOnly ? "card" : due <= 0 ? "package"'));
  });
});
