import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { findHeader, guessCategory, matchColumns, readSheetRows, type Cell } from "./inventorySheet";

const HEADER: Cell[] = ["No.", "Item", "Volume", "QTY", "Cost", "Selling", "Suppiler", "HP no."];
const SHEET: Cell[][] = [
  HEADER,
  [1, "Jose cuervo", null, 1, 285000, null, "Nanda", 81265661254],
  [4, "Jameson 700ml", "700ml", 1, 340000, null, "Nanda", 81265661257],
  [11, "SOJU Sevendays Apple", "36cl", 20, 400000, null, "Ita Wa", 81927240374],
  [264, null, null, null, null, null, null, null],
];

describe("matching sheet columns", () => {
  it("should find the item column", () => assert.equal(matchColumns(HEADER).name, 1));
  it("should find qty as stock", () => assert.equal(matchColumns(HEADER).stock, 3));
  it("should find selling as the price", () => assert.equal(matchColumns(HEADER).price, 5));
  it("should tolerate the typo Suppiler", () => assert.equal(matchColumns(HEADER).supplier, 6));
  it("should read HP no. as the supplier phone", () => assert.equal(matchColumns(HEADER).phone, 7));
  it("should not take No. as the name", () => assert.notEqual(matchColumns(HEADER).name, 0));
  it("should call cost price a cost, not a price", () => assert.equal(matchColumns(["Product", "Cost Price", "Sell Price"]).cost, 1));
});

describe("finding the header", () => {
  it("should find it after title rows", () => assert.equal(findHeader([["Stock list 2026"], [], HEADER, [1, "A", "", 1, 1, 1]])?.index, 2));
  it("should give up when nothing looks like a header", () => assert.equal(findHeader([["a", "b"], ["c", "d"]]), null));
});

describe("reading rows", () => {
  it("should skip rows without an item", () => assert.equal(readSheetRows(SHEET).length, 3));
  it("should add the volume to the name when it is missing", () => assert.equal(readSheetRows(SHEET)[2].name, "SOJU Sevendays Apple 36cl"));
  it("should not repeat a volume already in the name", () => assert.equal(readSheetRows(SHEET)[1].name, "Jameson 700ml"));
  it("should divide a total cost by the quantity when asked", () => assert.equal(readSheetRows(SHEET, { isCostTotal: true })[2].cost, "20000"));
  it("should keep the cost as given by default", () => assert.equal(readSheetRows(SHEET)[2].cost, "400000"));
  it("should keep only digits of the supplier phone", () => assert.equal(readSheetRows(SHEET)[0].phone, "81265661254"));
});

describe("guessing a category", () => {
  it("should call Jameson spirits", () => assert.equal(guessCategory("Jameson 700ml"), "Spirits"));
  it("should call soju soju", () => assert.equal(guessCategory("SOJU Sevendays Apple"), "Soju"));
  it("should fall back to General", () => assert.equal(guessCategory("Mystery item"), "General"));
});
