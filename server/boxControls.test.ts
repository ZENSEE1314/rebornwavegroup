import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { BoxControlQueue, isBoxControl, isBoxSongId } from "./boxControls";

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
  it("should drop a press that nobody collected for a minute", () => {
    const queue = new BoxControlQueue();
    queue.push("1", "musicDown", 1000);
    assert.deepEqual(queue.take("1", 1000 + 61_000), []);
  });
  it("should keep a press collected within the minute", () => {
    const queue = new BoxControlQueue();
    queue.push("1", "musicDown", 1000);
    assert.deepEqual(queue.take("1", 1000 + 30_000), ["Music_down"]);
  });
  it("should only know the listed buttons", () => {
    assert.equal(isBoxControl("voice"), true);
    assert.equal(isBoxControl("repeat"), true);
    assert.equal(isBoxControl("Skip"), false);
    assert.equal(isBoxControl("toString"), false);
  });
});

describe("BoxControlQueue songs of the box", () => {
  it("should hand a song command with the box's number for that song", () => {
    const queue = new BoxControlQueue();
    queue.pushSong("1", "next", "17");
    assert.deepEqual(queue.take("1"), ["Pro2:17"]);
  });
  it("should accept only plain song numbers", () => {
    assert.equal(isBoxSongId("17"), true);
    assert.equal(isBoxSongId("1;2"), false);
  });
});
