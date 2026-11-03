import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const panel = readFileSync("client/src/components/ExpensesPanel.tsx", "utf8").replace(/\r\n/g, "\n");

describe("moving an uploaded expense to stock", () => {
  it("should offer Move to stock on an upload that has item lines", () => assert.match(panel, /startEdit\(row, true\)[^]*?t\("ex\.toStock"\)/));
  it("should open the form on the stock kind", () => assert.match(panel, /category: toStock \? STOCK_KIND : row\.category/));
  it("should tie each line to the inventory item of the same name", () => assert.match(panel, /inventory\.find\(\(product\) => String\(product\.name\)\.trim\(\)\.toLowerCase\(\) === line\.name\.trim\(\)\.toLowerCase\(\)\)/));
});
