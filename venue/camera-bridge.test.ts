import { describe, it } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error plain .mjs program
import { buildRtspUrl, isKeyOk, splitJpegFrames } from "./camera-bridge.mjs";

const jpeg = (fill: number) => Buffer.from([0xff, 0xd8, fill, fill, 0xff, 0xd9]);

describe("camera bridge", () => {
  it("should build the Dahua stream address with the sub stream by default", () => {
    const url = buildRtspUrl({ host: "10.0.0.5", user: "admin", password: "pw", channel: 1 });
    assert.equal(url, "rtsp://admin:pw@10.0.0.5:554/cam/realmonitor?channel=1&subtype=1");
  });

  it("should encode a password with symbols so it cannot break the address", () => {
    const url = buildRtspUrl({ host: "10.0.0.5", user: "admin", password: "p@ss/w:rd#1" });
    assert.match(url, /admin:p%40ss%2Fw%3Ard%231@10\.0\.0\.5/);
  });

  it("should use the full quality stream when subtype is 0", () => {
    assert.match(buildRtspUrl({ host: "h", user: "u", password: "p", subtype: 0 }), /subtype=0$/);
  });

  it("should cut two whole pictures out of one chunk", () => {
    const { frames, rest } = splitJpegFrames(Buffer.concat([jpeg(1), jpeg(2)]));
    assert.deepEqual(frames.map((f: Buffer) => f[2]), [1, 2]);
    assert.equal(rest.length, 0);
  });

  it("should keep a half picture for the next chunk", () => {
    const whole = jpeg(7);
    const first = splitJpegFrames(whole.subarray(0, 4));
    const second = splitJpegFrames(Buffer.concat([first.rest, whole.subarray(4)]));
    assert.equal(first.frames.length, 0);
    assert.equal(second.frames.length, 1);
  });

  it("should drop noise before the first picture", () => {
    const { frames } = splitJpegFrames(Buffer.concat([Buffer.from([1, 2, 3]), jpeg(9)]));
    assert.equal(frames[0][2], 9);
  });

  it("should accept only the exact view key", () => {
    assert.equal(isKeyOk("abc", "abc"), true);
    assert.equal(isKeyOk("abd", "abc"), false);
    assert.equal(isKeyOk("", "abc"), false);
    assert.equal(isKeyOk(null, "abc"), false);
  });
});
