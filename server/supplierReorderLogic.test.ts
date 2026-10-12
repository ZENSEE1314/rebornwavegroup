import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cleanReorderSetup, groupBySupplier, itemNeedsAsking, templateMessage, type ProductLite, type ReorderRequest } from "./supplierReorderLogic";

const NOW = Date.parse("2026-10-13T10:00:00Z");
const HOUR = 3_600_000;
const beer: ProductLite = { id: 7, name: "Bintang", stock: 3, supplierName: "Alay", supplierPhone: "81270257788" };
const setup = cleanReorderSetup({ enabled: true, items: { "7": { at: 5, qty: 24 } } });
const request = (status: ReorderRequest["status"], hoursAgo: number): ReorderRequest => ({ id: "r1", supplierName: "Alay", phone: "81270257788", items: [{ productId: 7, name: "Bintang", stock: 3, qty: 24 }], message: "", status, createdAt: new Date(NOW - hoursAgo * HOUR).toISOString(), decidedAt: new Date(NOW - hoursAgo * HOUR).toISOString() });

describe("cleaning the reorder setup", () => {
  it("should be off by default", () => assert.equal(cleanReorderSetup(null).enabled, false));
  it("should only turn on for a real true", () => assert.equal(cleanReorderSetup({ enabled: "yes" }).enabled, false));
  it("should default the language to Indonesian", () => assert.equal(cleanReorderSetup({}).lang, "id"));
  it("should drop item keys that are not product numbers", () => assert.deepEqual(Object.keys(cleanReorderSetup({ items: { x: {}, "5": {} } }).items), ["5"]));
  it("should never order fewer than one", () => assert.equal(cleanReorderSetup({ items: { "5": { qty: 0 } } }).items["5"].qty, 1));
});

describe("which items need asking", () => {
  it("should ask for a switched-on item at or below its level", () => assert.equal(itemNeedsAsking(beer, setup, [], NOW), true));
  it("should not ask when stock is above the level", () => assert.equal(itemNeedsAsking({ ...beer, stock: 6 }, setup, [], NOW), false));
  it("should not ask for an item that is not switched on", () => assert.equal(itemNeedsAsking({ ...beer, id: 8 }, setup, [], NOW), false));
  it("should not ask when the supplier has no number", () => assert.equal(itemNeedsAsking({ ...beer, supplierPhone: "" }, setup, [], NOW), false));
  it("should not ask twice while a request waits for the admin", () => assert.equal(itemNeedsAsking(beer, setup, [request("pending", 1)], NOW), false));
  it("should not ask again right after sending", () => assert.equal(itemNeedsAsking(beer, setup, [request("sent", 10)], NOW), false));
  it("should ask again a few days after sending", () => assert.equal(itemNeedsAsking(beer, setup, [request("sent", 100)], NOW), true));
  it("should ask again after a failed send", () => assert.equal(itemNeedsAsking(beer, setup, [request("failed", 1)], NOW), true));
});

describe("grouping by supplier", () => {
  it("should make one request per supplier number", () => {
    const soju: ProductLite = { id: 8, name: "Soju", stock: 1, supplierName: "Alay", supplierPhone: "+62 812-7025-7788".replace(/\D/g, "").slice(2) };
    const both = cleanReorderSetup({ items: { "7": { qty: 24 }, "8": { qty: 10 } } });
    assert.equal(groupBySupplier([beer, soju], both).length, 1);
  });
});

describe("the ready-made message", () => {
  const items = [{ productId: 7, name: "Bintang", stock: 3, qty: 24 }];
  it("should list the item and quantity", () => assert.ok(templateMessage("id", "Reborn", "Alay", items).includes("• Bintang — 24 pcs (sisa 3)")));
  it("should greet the supplier by name", () => assert.ok(templateMessage("en", "Reborn", "Alay", items).startsWith("Hello Alay, ")));
  it("should be written in Chinese when asked", () => assert.ok(templateMessage("zh", "Reborn", "Alay", items).includes("库存不足")));
});
