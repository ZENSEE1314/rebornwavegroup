import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FRAME_MAX_AGE_MS, MAX_CAMERAS_PER_COMPANY, MAX_FRAME_BYTES, WATCH_WINDOW_MS, createVenueCameraStore } from "./venueCameraStore";

const jpeg = Buffer.from([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9]);

function storeAt() {
  const clock = { now: 1_000_000 };
  return { clock, store: createVenueCameraStore(() => clock.now) };
}

describe("venue camera store", () => {
  it("should hand back the latest picture of a camera", () => {
    const { store } = storeAt();
    store.setFrame("", "cam1", "Door", jpeg);
    assert.deepEqual(store.getFrame("", "cam1"), jpeg);
  });

  it("should list a camera with its name and how old the picture is", () => {
    const { store, clock } = storeAt();
    store.setFrame("", "cam1", "Door", jpeg);
    clock.now += 4000;
    assert.deepEqual(store.list(""), [{ id: "cam1", name: "Door", ageSeconds: 4 }]);
  });

  it("should treat a camera as offline when its picture is too old", () => {
    const { store, clock } = storeAt();
    store.setFrame("", "cam1", "Door", jpeg);
    clock.now += FRAME_MAX_AGE_MS + 1;
    assert.equal(store.getFrame("", "cam1"), null);
  });

  it("should keep each company's cameras apart", () => {
    const { store } = storeAt();
    store.setFrame("club-a", "cam1", "Door", jpeg);
    assert.equal(store.getFrame("club-b", "cam1"), null);
  });

  it("should refuse something that is not a JPEG", () => {
    const { store } = storeAt();
    assert.equal(store.setFrame("", "cam1", "Door", Buffer.from("<html>")), false);
  });

  it("should refuse a picture that is too big", () => {
    const { store } = storeAt();
    assert.equal(store.setFrame("", "cam1", "Door", Buffer.concat([jpeg, Buffer.alloc(MAX_FRAME_BYTES)])), false);
  });

  it("should refuse an id with odd characters", () => {
    const { store } = storeAt();
    assert.equal(store.setFrame("", "../x", "Door", jpeg), false);
  });

  it("should refuse a new camera past the company limit but still update an existing one", () => {
    const { store } = storeAt();
    for (let n = 0; n < MAX_CAMERAS_PER_COMPANY; n++) store.setFrame("", `c${n}`, "x", jpeg);
    assert.equal(store.setFrame("", "extra", "x", jpeg), false);
    assert.equal(store.setFrame("", "c0", "x", jpeg), true);
  });

  it("should say someone is watching only for a short while after the last look", () => {
    const { store, clock } = storeAt();
    assert.equal(store.isWatched(""), false);
    store.markWatched("");
    assert.equal(store.isWatched(""), true);
    clock.now += WATCH_WINDOW_MS + 1;
    assert.equal(store.isWatched(""), false);
  });
});
