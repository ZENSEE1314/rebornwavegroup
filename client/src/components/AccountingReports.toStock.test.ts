import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const view = readFileSync("client/src/components/AccountingReports.tsx", "utf8").replace(/\r\n/g, "\n");
const server = readFileSync("server/rebornGame.ts", "utf8").replace(/\r\n/g, "\n");

describe("moving an expense upload to stock from the accounts", () => {
  it("should offer Move to stock on an active upload that has item lines", () => assert.match(view, /line\.upload\?\.status === "active" && line\.upload\.hasItems/));
  it("should ask before moving", () => assert.match(view, /t\("ar\.toStockAsk"\)/));
  it("should call the automatic move route", () => assert.match(view, /\/to-stock-auto/));
  it("should tie each line to the inventory item of the same name", () => assert.match(server, /byName\.get\(line\.name\.trim\(\)\.toLowerCase\(\)\) \?\? null/));
  it("should refuse an upload with no lines or no payment method", () => assert.match(server, /!lines\.length \|\| \(!bill && !payMethodOf\(row\.payMethod\)\)/));
});
