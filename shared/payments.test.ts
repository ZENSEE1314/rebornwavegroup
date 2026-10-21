import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { planSplit, readSplit } from "./payments";

const input = (over: Partial<Parameters<typeof planSplit>[0]> = {}) => ({ cash: 0, card: 0, credits: 0, cardReference: "", ...over });

describe("planSplit", () => {
  it("should take the rest in cash after credits and card", () => {
    const plan = planSplit(input({ credits: 20_000, card: 30_000, cardReference: "A1", cash: 60_000 }), 100_000);
    assert.deepEqual(plan.parts.map((part) => [part.method, part.amount]), [["credits", 20_000], ["card", 30_000], ["cash", 50_000]]);
  });

  it("should work out the change from the cash handed over", () => {
    assert.equal(planSplit(input({ credits: 20_000, cash: 100_000 }), 50_000).change, 70_000);
  });

  it("should say cash is short when too little was handed over", () => {
    assert.equal(planSplit(input({ credits: 20_000, cash: 10_000 }), 50_000).problem, "cashShort");
  });

  it("should ask for the card reference when a card amount is entered", () => {
    assert.equal(planSplit(input({ card: 30_000, cash: 20_000 }), 50_000).problem, "needCardReference");
  });

  it("should refuse credits and card that add up to more than the bill", () => {
    assert.equal(planSplit(input({ credits: 40_000, card: 20_000, cardReference: "A1" }), 50_000).problem, "tooMuch");
  });

  it("should need no cash when credits and card cover the bill", () => {
    const plan = planSplit(input({ credits: 20_000, card: 30_000, cardReference: "A1" }), 50_000);
    assert.deepEqual([plan.problem, plan.parts.length, plan.change], [null, 2, 0]);
  });

  it("should report how much is still not covered", () => {
    assert.equal(planSplit(input({ credits: 10_000 }), 50_000).left, 40_000);
  });
});

describe("readSplit", () => {
  it("should read a saved split back", () => {
    assert.deepEqual(readSplit('[{"method":"cash","amount":5},{"method":"card","amount":7,"reference":"X"}]').map((part) => part.method), ["cash", "card"]);
  });

  it("should give an empty list for bad json", () => {
    assert.deepEqual(readSplit("{oops"), []);
  });
});
