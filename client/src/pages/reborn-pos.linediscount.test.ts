import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Any POS user can give a % or RP-off discount on one bill line; selling a line at cost stays with managers and the main admin.
const WINDOWS_LINE_END = /\r\n/g;
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8").replace(WINDOWS_LINE_END, "\n");
const pos = read("./reborn-pos.tsx");
const server = read("../../../server/rebornGame.ts");
const admin = read("./reborn-admin.tsx");
const dialog = pos.slice(pos.indexOf("function LineEditDialog("), pos.indexOf("// Staff upload a supplier or expense receipt"));

describe("a discount on one bill line", () => {
  it("should show the % and RP-off boxes to every POS user", () => {
    assert.ok(dialog.includes('t("pos.line.percent")') && !dialog.includes("canLower"));
  });
  it("should keep the sell-at-cost button for managers and the main admin", () => {
    assert.ok(dialog.includes("{canSellAtCost && <button"));
  });
  it("should refuse a cashier only for at cost on the server", () => {
    assert.ok(server.includes("Only a manager or the main admin can sell a line at cost.") && !server.includes("can lower a price or give a discount"));
  });
});

describe("keeping the happy-hour price on a line after happy hour", () => {
  it("should show the button only to the main admin", () => {
    assert.ok(dialog.includes('const canKeepHappyPrice = role === "admin"') && dialog.includes("{canKeepHappyPrice && <button"));
  });
  it("should refuse anyone but the main admin on the server", () => {
    assert.ok(server.includes('req.body?.happyPrice') && server.includes("Only the main admin can keep the happy-hour price after happy hour."));
  });
});

describe("agency commission on a paid bill", () => {
  it("should be booked into the accounts for any paid bill that missed it", () => {
    assert.ok(read("../../../server/bridgeX.ts").includes("l.ref_type = 'pos_commission' AND l.ref_id = t.id::text"));
  });
});

describe("kept bottles in Admin › Bottles", () => {
  it("should show how many are left as its own badge for every drink type", () => {
    assert.ok(admin.includes('{t("admin.bot.left", { n: b.quantity })}</span></p>') && !admin.includes('b.type === "beer" ? ` · ${t("admin.bot.left"'));
  });
});
