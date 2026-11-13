import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const server = readFileSync(new URL("./rebornGame.ts", import.meta.url), "utf8");
const pos = readFileSync(new URL("../client/src/pages/reborn-pos.tsx", import.meta.url), "utf8");
const admin = readFileSync(new URL("../client/src/pages/reborn-admin.tsx", import.meta.url), "utf8");
const undoRoute = server.slice(server.indexOf('"/api/reborn/admin/accounting/orders/:id/undo-refund"'), server.indexOf('"/api/reborn/admin/accounting/orders/:id/edit"'));

describe("refund is for the main admin only", () => {
  it("should refuse the POS refund call from staff and managers", () => {
    assert.ok(server.includes('app.post("/api/reborn/pos/orders/:id/refund", requireAdmin('));
  });

  it("should keep the Accounting refund for the main admin", () => {
    assert.ok(server.includes('app.post("/api/reborn/admin/accounting/orders/:id/refund", requireAdmin('));
  });

  it("should show the POS Refund button only to the main admin", () => {
    assert.ok(pos.includes("{isAdmin && !isRef && <button onClick={() => doRefund(o)}"));
  });
});

describe("undo a refund from the log", () => {
  it("should be for the main admin only", () => {
    assert.ok(server.includes('app.post("/api/reborn/admin/accounting/orders/:id/undo-refund", requireAdmin('));
  });

  it("should only put back a refunded bill", () => {
    assert.ok(undoRoute.includes('order.status !== "refunded"'));
  });

  it("should refuse a bill that used or sold a package or paid a referral commission", () => {
    assert.ok(undoRoute.includes("packageCreditUsed") && undoRoute.includes("order.referralAmount"));
  });

  it("should refuse once the bill's day is closed", () => {
    assert.ok(undoRoute.includes('"pos_closing"'));
  });

  it("should take the stock out again and remove the refund from the books", () => {
    assert.ok(undoRoute.includes("moveStock(item.productId!, -item.qty") && undoRoute.includes('["pos_refund", "pos_commission_reversal"]'));
  });

  it("should leave a log entry of the undo", () => {
    assert.ok(undoRoute.includes('action: "undo_refund"'));
  });

  it("should offer the button on the newest refund of a bill in Admin Logs", () => {
    assert.ok(admin.includes("latestOfBill.get(l.targetId) === l.id") && admin.includes("undo-refund"));
  });
});
