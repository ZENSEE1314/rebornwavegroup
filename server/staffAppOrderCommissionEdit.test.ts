import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const server = readFileSync(new URL("./rebornGame.ts", import.meta.url), "utf8");
const admin = readFileSync(new URL("../client/src/pages/reborn-admin.tsx", import.meta.url), "utf8");
const shopOrder = server.slice(server.indexOf('app.post("/api/reborn/shop/order"'), server.indexOf("// Counter accepts / rejects / serves an app order item."));
const billEdit = server.slice(server.indexOf('app.post("/api/reborn/admin/accounting/orders/:id/edit"'), server.indexOf("// App design (shared/appSkins.ts)"));
const changeCommission = server.slice(server.indexOf("const changeBillCommission"), server.indexOf("// The receipt roll (width + shift)"));
const billCommissionRoute = server.slice(server.indexOf('app.post("/api/reborn/admin/accounting/orders/:id/commission"'), server.indexOf("// Main admin: give a commission to one line"));

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
    assert.ok(billEdit.includes("changeBillCommission(req,order,req.body,subtotal-discount") && billCommissionRoute.includes("Number(order.subtotal) - Number(order.discount)"));
  });

  it("should book the extra commission when it goes up", () => {
    assert.ok(changeCommission.includes("diff > 0) await bookCommission("));
  });

  it("should book the difference back as income when it goes down", () => {
    assert.ok(changeCommission.includes('category: "commission_reversal"') && changeCommission.includes("diff < 0"));
  });

  it("should leave the commission alone when the edit sends none", () => {
    assert.ok(billEdit.includes("req.body?.commission===undefined?null:await changeBillCommission"));
  });

  it("should show the commission fields only while editing the bill", () => {
    assert.ok(admin.includes('{editing&&<div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/5 p-2"><p className="col-span-2 text-xs font-bold">{t("admin.ao.commission")}'));
  });
});

describe("commission of the whole bill from the Edit this sale panel", () => {
  it("should only change a paid sale", () => {
    assert.ok(billCommissionRoute.includes('order.status !== "paid"') && billCommissionRoute.includes("status(400)"));
  });

  it("should keep a record of who changed it and from what to what", () => {
    assert.ok(billCommissionRoute.includes('action: "edit_bill_commission"') && billCommissionRoute.includes("done.oldAmount"));
  });

  it("should offer who gets it, the % or amount and a way to remove it in the panel", () => {
    const panel = readFileSync(new URL("../client/src/components/ItemCommissionAdmin.tsx", import.meta.url), "utf8");
    assert.ok(panel.includes("itemCom.billWho") && panel.includes('<option value="percent">%</option>') && panel.includes("value: 0"));
  });
});
