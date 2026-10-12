import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cleanImportRows, matchKey, toNumber } from "./inventoryImport";

describe("reading numbers from a spreadsheet", () => {
  it("should read a plain number", () => assert.equal(toNumber(12.5), 12.5));
  it("should read comma thousands", () => assert.equal(toNumber("1,500,000"), 1500000));
  it("should read dot thousands with a decimal comma", () => assert.equal(toNumber("Rp 25.000,50"), 25000.5));
  it("should read a decimal comma", () => assert.equal(toNumber("12,5"), 12.5));
  it("should give null for text", () => assert.equal(toNumber("n/a"), null));
  it("should give null for an empty cell", () => assert.equal(toNumber(""), null));
});

describe("cleaning import rows", () => {
  it("should skip a row without a name", () => {
    const { rows, skipped } = cleanImportRows([{ name: "", price: 5 }, { name: "Beer", price: 5 }]);
    assert.deepEqual([rows.length, skipped], [1, 1]);
  });

  it("should use the General category when none is given", () => {
    assert.equal(cleanImportRows([{ name: "Beer" }]).rows[0].category, "General");
  });

  it("should keep an empty stock cell as unchanged (null)", () => {
    assert.equal(cleanImportRows([{ name: "Beer", stock: "" }]).rows[0].stock, null);
  });

  it("should round stock down and never go below zero", () => {
    assert.equal(cleanImportRows([{ name: "Beer", stock: -3 }]).rows[0].stock, 0);
  });

  it("should ignore a negative price", () => {
    assert.equal(cleanImportRows([{ name: "Beer", price: -1 }]).rows[0].price, null);
  });

  it("should return nothing when the input is not a list", () => {
    assert.deepEqual(cleanImportRows("x"), { rows: [], skipped: 0 });
  });
});

describe("recognising the same item", () => {
  it("should ignore the volume", () => assert.equal(matchKey("Jameson 700ml"), matchKey("JAMESON")));
  it("should ignore case and punctuation", () => assert.equal(matchKey("Coca-Cola  can"), matchKey("coca cola CAN")));
  it("should keep different items apart", () => assert.notEqual(matchKey("Red Label"), matchKey("Black Label")));
});
