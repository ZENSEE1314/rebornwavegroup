import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { addSale, clearFailed, failedSales, markFailed, parseQueue, pendingSales, removeSale, verdictFor, type OfflineSale } from "./offlineSale";

const sale = (id: string): OfflineSale => ({ offlineId: id, at: "2026-10-16T10:00:00Z", label: "2 items", total: 50000, payload: { items: [] } });

describe("what to do after the server answers", () => {
  it("should drop a sale the server accepted", () => assert.equal(verdictFor(200), "sent"));
  it("should keep waiting when there was no answer", () => assert.equal(verdictFor(0), "retry-later"));
  it("should keep waiting when the server was down", () => assert.equal(verdictFor(503), "retry-later"));
  it("should ask to log in again on 401", () => assert.equal(verdictFor(401), "login"));
  it("should set aside a sale the server refused", () => assert.equal(verdictFor(400), "rejected"));
});

describe("the offline queue", () => {
  it("should add a sale once, even if added again", () => assert.equal(addSale(addSale([], sale("a")), sale("a")).length, 1));
  it("should remove a sent sale", () => assert.deepEqual(removeSale([sale("a"), sale("b")], "a").map((x) => x.offlineId), ["b"]));
  it("should count a refused sale as failed, not pending", () => {
    const queue = markFailed([sale("a"), sale("b")], "a", "Sold out");
    assert.equal(failedSales(queue).length, 1);
    assert.equal(pendingSales(queue).length, 1);
  });
  it("should put a failed sale back in line when tried again", () => assert.equal(pendingSales(clearFailed(markFailed([sale("a")], "a", "x"), "a")).length, 1));
  it("should read a broken saved queue as empty", () => assert.deepEqual(parseQueue("{not json"), []));
  it("should read a saved queue back", () => assert.equal(parseQueue(JSON.stringify([sale("a")])).length, 1));
});
