import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { RL_GRACE_MS, RL_MAX_TAP_AGE_MS, isTapOnRed, tappedAtOf } from "./redLight";

const START = 1_000;
const red = (lightAt: number) => ({ light: "red" as const, lightAt, startAt: START });
const green = (lightAt: number, lastRed?: { from: number; to: number }) => ({ light: "green" as const, lightAt, lastRed, startAt: START });

describe("isTapOnRed", () => {
  it("should allow a tap on green", () => {
    assert.equal(isTapOnRed(green(5_000), 6_000), false);
  });
  it("should allow a tap just after the light turned red (time to stop)", () => {
    assert.equal(isTapOnRed(red(5_000), 5_000 + RL_GRACE_MS - 1), false);
  });
  it("should eliminate a tap well into red", () => {
    assert.equal(isTapOnRed(red(5_000), 5_000 + RL_GRACE_MS + 1), true);
  });
  it("should allow a tap made on green but judged after the light turned red", () => {
    assert.equal(isTapOnRed(red(5_000), 4_900), false);
  });
  it("should eliminate a tap before the walk began", () => {
    assert.equal(isTapOnRed(green(5_000), START - 1), true);
  });
  it("should eliminate a tap made late in a red that has just ended", () => {
    assert.equal(isTapOnRed(green(9_000, { from: 6_000, to: 9_000 }), 8_000), true);
  });
  it("should allow a tap made at the start of a red that has just ended", () => {
    assert.equal(isTapOnRed(green(9_000, { from: 6_000, to: 9_000 }), 6_000 + RL_GRACE_MS - 1), false);
  });
  it("should allow a tap made after the red ended", () => {
    assert.equal(isTapOnRed(green(9_000, { from: 6_000, to: 9_000 }), 9_100), false);
  });
});

describe("tappedAtOf", () => {
  it("should subtract how long ago the phone says the tap was", () => {
    assert.equal(tappedAtOf(10_000, 300), 9_700);
  });
  it("should not believe a tap older than the limit", () => {
    assert.equal(tappedAtOf(10_000, 60_000), 10_000 - RL_MAX_TAP_AGE_MS);
  });
  it("should treat a missing or negative age as now", () => {
    assert.equal(tappedAtOf(10_000, Number.NaN), 10_000);
    assert.equal(tappedAtOf(10_000, -50), 10_000);
  });
});
