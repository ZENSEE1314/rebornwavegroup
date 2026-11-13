import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const alert = readFileSync(new URL("./NewOrderAlert.tsx", import.meta.url), "utf8");
const layout = readFileSync(new URL("./RebornLayout.tsx", import.meta.url), "utf8");
const server = readFileSync(new URL("../../../server/rebornGame.ts", import.meta.url), "utf8");

describe("new order alert for staff and admins", () => {
  it("should be shown on every staff page through the layout", () => {
    assert.ok(layout.includes("<NewOrderAlert />"));
  });

  it("should keep ringing while an order is waiting", () => {
    assert.ok(alert.includes("const isRinging = isStaff && orders.length > 0;") && alert.includes("setInterval(ring, RING_EVERY_MS)"));
  });

  it("should accept every item of the order with one tap", () => {
    assert.ok(alert.includes("order.items.map((item) => apiRequest(") && alert.includes('status: "accepted"'));
  });

  it("should list only items nobody has accepted yet", () => {
    assert.ok(server.includes("i.status = 'pending'") && server.includes('"/api/reborn/pos/pending-orders"'));
  });

  it("should send the push again every 45 seconds, up to 20 times", () => {
    assert.ok(server.includes("const ORDER_REMIND_MS = 45_000;") && server.includes("const ORDER_MAX_ALERTS = 20;"));
  });

  it("should not send orders to the kitchen on their own by default", () => {
    assert.ok(server.includes('appOrdersAutoAccept: "false"'));
  });

  it("should switch a saved straight-to-kitchen choice off once so the alert works", () => {
    assert.ok(server.includes("claimFlag(ORDER_ALERT_RESET_FLAG)") && server.includes('key: "appOrdersAutoAccept", value: "false"'));
  });
});
