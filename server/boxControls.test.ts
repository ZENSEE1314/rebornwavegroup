import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { BoxControlQueue, isBoxControl } from "./boxControls";

describe("BoxControlQueue", () => {
  it("should hand the pressed buttons to the bridge in order", () => {
    const queue = new BoxControlQueue();
    queue.push("1", "musicUp"); queue.push("1", "mute");
    assert.deepEqual(queue.take("1"), ["Music_up", "Mute"]);
  });
  it("should hand each press over once", () => {
    const queue = new BoxControlQueue();
    queue.push("1", "pause");
    queue.take("1");
    assert.deepEqual(queue.take("1"), []);
  });
  it("should keep one company's presses apart from another's", () => {
    const queue = new BoxControlQueue();
    queue.push("1", "micUp");
    assert.deepEqual(queue.take("2"), []);
  });
  it("should stop collecting when the bridge is not taking them", () => {
    const queue = new BoxControlQueue();
    for (let i = 0; i < 20; i++) queue.push("1", "micUp");
    assert.equal(queue.push("1", "micUp"), false);
  });
  it("should only know the listed buttons", () => {
    assert.equal(isBoxControl("voice"), true);
    assert.equal(isBoxControl("Skip"), false);
    assert.equal(isBoxControl("toString"), false);
  });
});
