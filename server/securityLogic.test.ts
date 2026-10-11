import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MAX_CAMERAS, MAX_REFRESH_SECONDS, cleanOfficerClose, cleanOfficerLog, cleanOfficerStart, cleanSecuritySetup } from "./securityLogic";

let counter = 0;
const makeId = () => `id-${++counter}`;

describe("cleaning the security setup", () => {
  it("should keep a camera with a web address and give it an id", () => {
    const { cameras } = cleanSecuritySetup({ cameras: [{ name: "Door", url: "http://192.168.1.20:1984/api/stream.mjpeg?src=door" }] }, makeId);
    assert.equal(cameras.length, 1);
    assert.equal(cameras[0].name, "Door");
    assert.equal(cameras[0].kind, "image");
  });

  it("should drop a camera whose address is not http or https", () => {
    const { cameras } = cleanSecuritySetup({ cameras: [{ url: "rtsp://192.168.1.20/stream" }, { url: "javascript:alert(1)" }, { url: "" }] }, makeId);
    assert.equal(cameras.length, 0);
  });

  it("should never let two cameras share an id", () => {
    const { cameras } = cleanSecuritySetup({ cameras: [{ id: "a", url: "http://x.test/1" }, { id: "a", url: "http://x.test/2" }] }, makeId);
    assert.notEqual(cameras[0].id, cameras[1].id);
  });

  it("should keep the refresh time between zero and the limit", () => {
    const { cameras } = cleanSecuritySetup({ cameras: [{ url: "http://x.test/1", refreshSeconds: 9999 }, { url: "http://x.test/2", refreshSeconds: -4 }] }, makeId);
    assert.deepEqual(cameras.map((camera) => camera.refreshSeconds), [MAX_REFRESH_SECONDS, 0]);
  });

  it("should allow only a sensible number of cameras", () => {
    const many = Array.from({ length: MAX_CAMERAS + 5 }, (_, i) => ({ url: `http://x.test/${i}` }));
    assert.equal(cleanSecuritySetup({ cameras: many }, makeId).cameras.length, MAX_CAMERAS);
  });

  it("should read phone numbers as digits and drop short or repeated ones", () => {
    const setup = cleanSecuritySetup({ stationNumbers: [{ label: "Station", phone: "+62 21 1234 5678" }, { phone: "12" }], alertPhones: ["+6281336361314", "6281336361314", "abc"] }, makeId);
    assert.deepEqual(setup.stationNumbers, [{ label: "Station", phone: "622112345678" }]);
    assert.deepEqual(setup.alertPhones, ["6281336361314"]);
  });

  it("should survive garbage", () => {
    assert.deepEqual(cleanSecuritySetup(null, makeId), { cameras: [], stationNumbers: [], alertPhones: [] });
    assert.deepEqual(cleanSecuritySetup({ cameras: "no", stationNumbers: 5 }, makeId), { cameras: [], stationNumbers: [], alertPhones: [] });
  });
});

describe("officer checks", () => {
  it("should trim and shorten what staff typed", () => {
    const start = cleanOfficerStart({ claimedName: "  Inspector Budi  ", badge: "x".repeat(200), unit: 5, note: null });
    assert.equal(start.claimedName, "Inspector Budi");
    assert.equal(start.badge.length, 60);
    assert.equal(start.unit, "");
    assert.equal(start.note, "");
  });

  it("should accept the three ways a check can end", () => {
    assert.equal(cleanOfficerClose({ outcome: "verified" })?.outcome, "verified");
    assert.equal(cleanOfficerClose({ outcome: "not_verified", note: " fake " })?.note, "fake");
    assert.equal(cleanOfficerClose({ outcome: "refused" })?.outcome, "refused");
  });

  it("should refuse to end a check with an unknown outcome", () => {
    assert.equal(cleanOfficerClose({ outcome: "open" }), null);
    assert.equal(cleanOfficerClose({ outcome: "whatever" }), null);
    assert.equal(cleanOfficerClose(null), null);
  });

  it("should drop unreadable stored checks", () => {
    const good = { id: "1", at: "t", staffName: "a", claimedName: "b", badge: "", unit: "", note: "", outcome: "open" };
    assert.equal(cleanOfficerLog([good, { id: 2 }, null, { id: "3", outcome: "bad" }]).length, 1);
    assert.deepEqual(cleanOfficerLog("no"), []);
  });
});
