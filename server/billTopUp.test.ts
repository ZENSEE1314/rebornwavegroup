import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const server = readFileSync(new URL("./rebornGame.ts", import.meta.url), "utf8");
const packages = readFileSync(new URL("./memberPackages.ts", import.meta.url), "utf8");
const pos = readFileSync(new URL("../client/src/pages/reborn-pos.tsx", import.meta.url), "utf8");
const payRoute = server.slice(server.indexOf('app.post("/api/reborn/pos/orders/:id/pay"'), server.indexOf('app.post("/api/reborn/pos/orders/:id/cancel"'));
const applyTopUp = server.slice(server.indexOf("const applyTopUp"), server.indexOf("// The receipt roll (width + shift)"));
const refund = server.slice(server.indexOf("const doPosRefund"), server.indexOf("const doPosRefund") + 1800);
const quote = packages.slice(packages.indexOf("export async function quoteBill"), packages.indexOf("// Spend package credit"));

describe("top-up on a bill", () => {
  it("should need a member on the bill", () => {
    assert.ok(payRoute.includes("Tag a member before topping up on a bill"));
  });

  it("should ask the customer for the bill plus the extra kept as credits", () => {
    assert.ok(payRoute.includes("const toCollect = due + topUp.cash") && payRoute.includes("cashReceived! < toCollect") && payRoute.includes("cashReceived! - toCollect"));
  });

  it("should keep the extra as RP credits and give the spending credit as a full-price-only package", () => {
    assert.ok(applyTopUp.includes("credits: sql`${users.credits} + ${topUp.cash}`") && applyTopUp.includes("fullPriceOnly: true"));
  });

  it("should not book the top-up as income", () => {
    assert.ok(!applyTopUp.includes("ledgerEntries"));
  });

  it("should refuse to refund a bill that topped up the member", () => {
    assert.ok(refund.includes("Number(order.topupCash) > 0 || Number(order.topupCredit) > 0"));
  });

  it("should count the extra cash in the till of the day close without counting it as revenue", () => {
    assert.ok(server.includes("sum.cash += paid + toppedUp") && server.includes("sum.revenue += Number(ticket.total)"));
  });
});

describe("spending credit given with a top-up", () => {
  it("should leave out bundles, promotions and happy-hour lines", () => {
    assert.ok(quote.includes("!isPromo && !p.bundleItemId && !p.noDiscount) fullPriceBase += amt"));
  });

  it("should pay the full-price part first from the full-price-only credit", () => {
    assert.ok(quote.includes("Math.min(creditableFull, fullPriceCredit, creditable)") && server.includes("q.creditUse, id, staffId, q.fullPriceUse"));
  });

  it("should always show the top-up box, with the amounts locked until a member is on the bill", () => {
    assert.ok(pos.includes('{extraMoney <= 0 && pay !== "split" && pay !== "credits" && (') && pos.includes("disabled={!order.memberId}"));
  });
});
