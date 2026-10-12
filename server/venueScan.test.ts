import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cleanDevices, mergeDevices } from "./venueScan";

const NOW = "2026-10-12T10:00:00.000Z";
const LATER = "2026-10-12T11:00:00.000Z";

describe("cleaning what the venue scanner reports", () => {
  it("should keep a camera and a tv with a valid address", () => {
    const devices = cleanDevices([{ ip: "192.168.1.20", kind: "camera", name: "Door" }, { ip: "192.168.1.30", kind: "tv", name: "Bar TV" }], NOW);
    assert.deepEqual(devices.map((device) => device.kind), ["camera", "tv"]);
  });

  it("should drop a device whose address is not an IPv4 address", () => {
    assert.equal(cleanDevices([{ ip: "evil.example.com", kind: "camera" }], NOW).length, 0);
  });

  it("should drop a device of an unknown kind", () => {
    assert.equal(cleanDevices([{ ip: "192.168.1.5", kind: "printer" }], NOW).length, 0);
  });

  it("should use the address as the name when none is given", () => {
    assert.equal(cleanDevices([{ ip: "192.168.1.5", kind: "tv" }], NOW)[0].name, "192.168.1.5");
  });

  it("should drop a video address that is not rtsp", () => {
    assert.equal(cleanDevices([{ ip: "192.168.1.5", kind: "camera", rtsp: "javascript:alert(1)" }], NOW)[0].rtsp, "");
  });

  it("should return nothing when the report is not a list", () => {
    assert.deepEqual(cleanDevices({ ip: "192.168.1.5" }, NOW), []);
  });
});

describe("merging scans", () => {
  it("should replace a device seen again at the same address", () => {
    const known = cleanDevices([{ ip: "192.168.1.20", kind: "camera", name: "Old" }], NOW);
    const merged = mergeDevices(known, cleanDevices([{ ip: "192.168.1.20", kind: "camera", name: "New" }], LATER));
    assert.deepEqual(merged.map((device) => device.name), ["New"]);
  });

  it("should keep a device that the new scan did not see", () => {
    const known = cleanDevices([{ ip: "192.168.1.20", kind: "camera" }], NOW);
    const merged = mergeDevices(known, cleanDevices([{ ip: "192.168.1.21", kind: "camera" }], LATER));
    assert.equal(merged.length, 2);
  });
});
