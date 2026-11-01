import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

describe("sales person's own target page", () => {
  it("should send the bills credited to the person with their target", () => assert.match(read("server/rebornGame.ts"), /eq\(posTickets\.salesStaffId, getUserId\(req\)!\), eq\(posTickets\.status, "paid"\)/));
  it("should count the bills by the same venue-day month as the target total", () => assert.match(read("server/rebornGame.ts"), /VENUE_DAY_OF\(sql`paid_at`\)\} >= \$\{`\$\{month\}-01`\}::date/));
  it("should list those bills under the target bar", () => assert.match(read("client/src/pages/reborn-admin.tsx"), /admin\.target\.bills/));
  it("should keep the name on the receipt in step when the admin changes the sales person", () => assert.match(read("server/rebornGame.ts"), /adjustmentReason:reason,salesStaffId,salesStaffName\}/));
});
