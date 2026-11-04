import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const view = readFileSync("client/src/components/AccountingReports.tsx", "utf8").replace(/\r\n/g, "\n");

describe("happy hour and normal sales lists", () => {
  it("should list whole receipts, not single lines", () => assert.match(view, /function SalesList\(\{ receipts, time, kind \}/));
  it("should show every line of the bill inside each receipt", () => assert.match(view, /receipt\.lines\.map\(\(sale, index\)/));
  it("should show the bill total and the customer on each receipt", () => assert.match(view, /t\("ip\.billTotal"\)\} \{money\(receipt\.billTotal\)\}/));
});
