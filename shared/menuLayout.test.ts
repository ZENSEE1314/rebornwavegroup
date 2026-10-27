import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { menuItemsOf, planPages, sectionsOf, type MenuProduct } from "./menuLayout";

const product = (over: Partial<MenuProduct> & { id: number; name: string }): MenuProduct => ({ category: "Beer", price: 50000, posVisible: true, ...over });
const HEIGHTS = { page: 1000, firstHeader: 200, nextHeader: 80, footer: 60, heading: 80, row: 160 };

describe("menuItemsOf", () => {
  it("should keep a priced item shown in the POS", () => assert.equal(menuItemsOf([product({ id: 1, name: "Bintang" })]).length, 1));
  it("should leave out an item with no price", () => assert.equal(menuItemsOf([product({ id: 1, name: "Free", price: 0 })]).length, 0));
  it("should leave out an item hidden from the POS", () => assert.equal(menuItemsOf([product({ id: 1, name: "Raw meat", posVisible: false })]).length, 0));
  it("should leave out a service such as corkage", () => assert.equal(menuItemsOf([product({ id: 1, name: "Corkage", isService: true })]).length, 0));
  it("should leave out a member package", () => assert.equal(menuItemsOf([product({ id: 1, name: "Spa x10", packageKind: "uses" })]).length, 0));
  it("should leave out a set such as 6 x Beer unless sets are asked for", () => assert.equal(menuItemsOf([product({ id: 1, name: "6 x Bintang", bundleItemId: 2 })]).length, 0));
  it("should include sets when asked", () => assert.equal(menuItemsOf([product({ id: 1, name: "6 x Bintang", bundleItemId: 2 })], { includeSets: true }).length, 1));
  it("should leave out a sold-out item unless asked", () => assert.equal(menuItemsOf([product({ id: 1, name: "Nasi", soldOut: true })]).length, 0));
  it("should include a sold-out item when asked", () => assert.equal(menuItemsOf([product({ id: 1, name: "Nasi", soldOut: true })], { includeSoldOut: true }).length, 1));
  it("should show the happy hour price while it is on", () => assert.equal(menuItemsOf([product({ id: 1, name: "Bintang", price: 50000, salePrice: 40000 })])[0].price, 40000));
  it("should put an item with no category under Other", () => assert.equal(menuItemsOf([product({ id: 1, name: "Thing", category: "" })])[0].category, "Other"));
});

describe("sectionsOf", () => {
  it("should list food before desserts before drinks", () => {
    const items = menuItemsOf([product({ id: 1, name: "Bintang", category: "Beer" }), product({ id: 2, name: "Ice cream", category: "Dessert" }), product({ id: 3, name: "Fries", category: "Snacks" })]);
    assert.deepEqual(sectionsOf(items).map((s) => s.kind), ["food", "dessert", "drinks"]);
  });
  it("should sort the items of a category A to Z", () => {
    const items = menuItemsOf([product({ id: 1, name: "Zulu" }), product({ id: 2, name: "Alpha" })]);
    assert.deepEqual(sectionsOf(items)[0].items.map((i) => i.name), ["Alpha", "Zulu"]);
  });
});

describe("planPages", () => {
  const sectionOfN = (n: number) => sectionsOf(menuItemsOf(Array.from({ length: n }, (_, i) => product({ id: i + 1, name: `Item ${String(i).padStart(2, "0")}` }))));
  it("should put a short menu on one page", () => assert.equal(planPages(sectionOfN(4), HEIGHTS).length, 1));
  it("should split a long menu over more pages", () => assert.ok(planPages(sectionOfN(40), HEIGHTS).length > 1));
  it("should repeat the category heading when a category continues on the next page", () => {
    const pages = planPages(sectionOfN(40), HEIGHTS);
    assert.equal(pages[1][0].kind, "heading");
  });
  it("should never leave a heading alone at the bottom of a page", () => {
    const pages = planPages(sectionOfN(40), HEIGHTS);
    assert.ok(pages.every((page) => page[page.length - 1].kind === "row"));
  });
  it("should keep every item exactly once", () => {
    const pages = planPages(sectionOfN(37), HEIGHTS);
    const count = pages.flat().reduce((n, block) => n + (block.kind === "row" ? block.items.length : 0), 0);
    assert.equal(count, 37);
  });
  it("should give no pages for an empty menu", () => assert.equal(planPages([], HEIGHTS).length, 0));
});
