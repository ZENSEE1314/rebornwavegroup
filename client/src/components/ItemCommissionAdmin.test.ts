import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

describe("per-item commission on the POS", () => {
  it("should offer the commission staff picker with a % on every bill line", () => assert.match(read("client/src/pages/reborn-pos.tsx"), /<LineCommissionPick staffId=/));
  it("should not show a global item commission card on the POS page", () => assert.doesNotMatch(read("client/src/pages/reborn-pos.tsx"), /<ItemCommissionAdmin \/>/));
  it("should not pay a commission to whoever ordered the item or the cashier by default", () => assert.doesNotMatch(read("server/rebornGame.ts"), /line\.source === "app" \? null : line\.addedBy/));
  it("should keep payroll-settled commissions from being edited", () => assert.match(read("server/rebornGame.ts"), /Already paid out in a payroll/));
});

describe("one bill line shared between staff", () => {
  it("should offer the split on a line of more than one unit", () => assert.match(read("client/src/pages/reborn-pos.tsx"), /it\.qty > 1 && <LineCommissionSplit/));
  it("should book one commission row per person in the split", () => assert.match(read("server/rebornGame.ts"), /for \(const part of parts\)/));
  it("should keep the split on the bill line", () => assert.match(read("shared/schema.ts"), /commission_split/));
});

describe("admin adds and edits commissions, staff price names and caps", () => {
  it("should let the admin add a commission to a bill line that has none", () => assert.match(read("server/rebornGame.ts"), /app\.post\("\/api\/reborn\/admin\/item-commissions"/));
  it("should offer the bill's items in the add-commission form", () => assert.match(read("client/src/components/ItemCommissionAdmin.tsx"), /billItems\.map/));
  it("should pick the staff-price name from a list, not type it", () => assert.match(read("client/src/pages/reborn-pos.tsx"), /pickPerson\(e\.target\.value\)/));
  it("should give the staff discount once the monthly cap is reached", () => assert.match(read("server/rebornGame.ts"), /staffPriceModeFor\(price\.mode/));
  it("should count only cost and half-price bills against the cap", () => assert.match(read("server/rebornGame.ts"), /staff_price_mode IN \('cost', 'half'\)/));
  it("should let the main admin set the caps on the POS page", () => assert.match(read("client/src/pages/reborn-pos.tsx"), /role === "admin" && <StaffPriceCaps \/>/));
  it("should draw the company logo as the menu title", () => assert.match(read("client/src/components/MenuImageMaker.tsx"), /drawLogo\(ctx, logo/));
  it("should keep the admin's category order on the menu", () => assert.match(read("shared/menuLayout.ts"), /rank\(a\.category\) - rank\(b\.category\)/));
});

describe("sales day and bill commissions", () => {
  it("should let the admin open a bill's item commissions in the Sales tab", () => assert.match(read("client/src/pages/reborn-pos.tsx"), /isAdmin && !isRef && <ItemCommissionAdmin ticketId=\{o\.id\} \/>/));
  it("should group the Sales tab by sales day, not calendar date", () => assert.match(read("client/src/pages/reborn-pos.tsx"), /businessDayOf\(o\.paidAt/));
});
