import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { matchesSearch, nextSort, sortRows } from "./table-sort";

const rows = [{ name: "Beer 10", stock: 5, supplier: "" }, { name: "beer 2", stock: 20, supplier: "Alay" }, { name: "Absolut", stock: 1, supplier: "Budi" }];
const get = (row: (typeof rows)[number], key: string) => (row as Record<string, string | number>)[key];

describe("clicking a column title", () => {
  it("should sort ascending on the first click", () => assert.deepEqual(nextSort(null, "stock"), { key: "stock", direction: 1 }));
  it("should sort descending on the second click", () => assert.deepEqual(nextSort({ key: "stock", direction: 1 }, "stock"), { key: "stock", direction: -1 }));
  it("should go back to normal on the third click", () => assert.equal(nextSort({ key: "stock", direction: -1 }, "stock"), null));
  it("should start ascending on a different column", () => assert.deepEqual(nextSort({ key: "stock", direction: -1 }, "name"), { key: "name", direction: 1 }));
});

describe("sorting rows", () => {
  it("should sort numbers as numbers", () => assert.deepEqual(sortRows(rows, { key: "stock", direction: 1 }, get).map((r) => r.stock), [1, 5, 20]));
  it("should reverse for descending", () => assert.deepEqual(sortRows(rows, { key: "stock", direction: -1 }, get).map((r) => r.stock), [20, 5, 1]));
  it("should put 2 before 10 in text", () => assert.deepEqual(sortRows(rows, { key: "name", direction: 1 }, get).map((r) => r.name), ["Absolut", "beer 2", "Beer 10"]));
  it("should keep empty cells last whichever way it sorts", () => {
    assert.equal(sortRows(rows, { key: "supplier", direction: 1 }, get)[2].supplier, "");
    assert.equal(sortRows(rows, { key: "supplier", direction: -1 }, get)[2].supplier, "");
  });
  it("should leave the rows alone with no sort", () => assert.equal(sortRows(rows, null, get), rows));
});

describe("the search box", () => {
  it("should need every word", () => assert.equal(matchesSearch("Bintang Beer Can Alay", "bintang can"), true));
  it("should fail when one word is missing", () => assert.equal(matchesSearch("Bintang Beer", "bintang wine"), false));
  it("should match everything when empty", () => assert.equal(matchesSearch("anything", "  "), true));
});
