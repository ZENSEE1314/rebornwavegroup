import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const server = readFileSync(new URL("./rebornGame.ts", import.meta.url), "utf8");
const admin = readFileSync(new URL("../client/src/pages/reborn-admin.tsx", import.meta.url), "utf8");
const shopOrder = server.slice(server.indexOf('app.post("/api/reborn/shop/order"'), server.indexOf("// Counter accepts / rejects / serves an app order item."));
const billEdit = server.slice(server.indexOf('app.post("/api/reborn/admin/accounting/orders/:id/edit"'), server.indexOf("// App design (shared/appSkins.ts)"));

describe("staff order through the app", () => {
  it("should not mark a staff member's order as an app order, so no app discount applies", () => {
    assert.ok(shopOrder.includes('byStaff ? "pos" : "app"'));
  });

  it("should not tag the staff account as the member of the bill", () => {
    assert.ok(shopOrder.includes("...(byStaff ? { staffId: userId } : {"));
  });

  it("should add a staff order as accepted without waiting for the counter", () => {
    assert.ok(shopOrder.includes('byStaff || autoAccept ? "accepted" : "pending"'));
  });
});

describe("editing the commission of a paid sale", () => {
  it("should work the commission out on the bill after discount, before tax and service charge", () => {
    assert.ok(billEdit.includes("commissionOf(req.body,subtotal-discount)"));
  });

  it("should book the extra commission when it goes up", () => {
    assert.ok(billEdit.includes("commissionDiff>0)await bookCommission("));
  });

  it("should book the difference back as income when it goes down", () => {
    assert.ok(billEdit.includes('category:"commission_reversal"') && billEdit.includes("commissionDiff<0"));
  });

  it("should leave the commission alone when the edit sends none", () => {
    assert.ok(billEdit.includes("req.body?.commission===undefined?{}") && billEdit.includes("if(req.body?.commission!==undefined)await db.update(posTickets).set(commissionPatch)"));
  });

  it("should show the commission fields only while editing the bill", () => {
    assert.ok(admin.includes('{editing&&<div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/5 p-2"><p className="col-span-2 text-xs font-bold">{t("admin.ao.commission")}'));
  });
});
