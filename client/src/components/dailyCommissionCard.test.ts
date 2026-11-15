import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const card = readFileSync(new URL("./DailyCommissionCard.tsx", import.meta.url), "utf8");
const admin = readFileSync(new URL("../pages/reborn-admin.tsx", import.meta.url), "utf8");
const server = readFileSync(new URL("../../../server/rebornGame.ts", import.meta.url), "utf8");
const block = server.slice(server.indexOf("const DAILY_COMMISSION_KEY"), server.indexOf("async function salesTag"));

describe("daily commission tiers screen and routes", () => {
  it("should show the tiers to everyone but let only editors change them", () => {
    assert.ok(card.includes("!data.canEdit ?") && card.includes("(!data.canEdit && !data.setup.enabled)"));
  });

  it("should let the main admin pick the head staff who can edit", () => {
    assert.ok(card.includes("data.canPickEditors") && block.includes('app.put("/api/reborn/admin/daily-commission/editors", requireAdmin('));
  });

  it("should refuse changes from anyone who is not admin, manager or picked head staff", () => {
    assert.ok(block.includes("if (!(await canSetCommission(getUserId(req)!))) return res.status(403)") && block.includes('role === "admin" || role === "manager" || (await commissionEditorIds()).includes(userId)'));
  });

  it("should count sales before service fee and tax, one venue day at a time", () => {
    assert.ok(block.includes("COALESCE(t.subtotal::numeric, 0) - COALESCE(t.discount::numeric, 0)") && block.includes("GROUP BY 1, 2"));
  });

  it("should leave out the items ticked no commission in Inventory", () => {
    assert.ok(block.includes("COALESCE(p.sales_commission_ok, true)") && server.includes("if (b.salesCommissionOk !== undefined) patch.salesCommissionOk = !!b.salesCommissionOk;"));
  });

  it("should add the tier commission to payroll", () => {
    assert.ok(server.includes("+itemCommission+tierCommission)") && admin.includes("+itemCommission+tierCommission)"));
  });

  it("should put the card on the Staff tab", () => {
    assert.ok(admin.includes("<DailyCommissionCard />"));
  });
});
