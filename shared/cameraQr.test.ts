import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { parseCameraQr } from "./cameraQr";

describe("parseCameraQr", () => {
  it("should add a camera's web page address as a page", () => {
    assert.deepEqual(parseCameraQr("http://192.168.1.64/"), { type: "web", url: "http://192.168.1.64/", kind: "page", name: "192.168.1.64" });
  });
  it("should add a snapshot address as a picture", () => {
    const out = parseCameraQr("http://192.168.1.64/cgi-bin/snapshot.cgi");
    assert.equal(out.type === "web" && out.kind, "image");
  });
  it("should read a bare IP with a port", () => {
    assert.deepEqual(parseCameraQr("192.168.1.10:8080"), { type: "web", url: "http://192.168.1.10:8080/", kind: "page", name: "192.168.1.10" });
  });
  it("should reject an IP with a part above 255", () => {
    assert.equal(parseCameraQr("192.168.1.999").type, "unknown");
  });
  it("should tell a video address apart", () => {
    assert.deepEqual(parseCameraQr("rtsp://admin:pw@192.168.1.20:554/stream1"), { type: "video", rtsp: "rtsp://admin:pw@192.168.1.20:554/stream1" });
  });
  it("should read ip and port from key=value text", () => {
    assert.deepEqual(parseCameraQr("ip=192.168.1.30;port=8000;name=Door"), { type: "web", url: "http://192.168.1.30:8000/", kind: "page", name: "Door" });
  });
  it("should read an address from JSON", () => {
    assert.equal(parseCameraQr('{"ip":"192.168.1.31","port":"81"}').type, "web");
  });
  it("should know a cloud link as the maker's cloud, not a web page", () => {
    assert.deepEqual(parseCameraQr("https://www.ezviz.com/qr?sn=BF1234567"), { type: "cloudId", id: "BF1234567", brand: "Ezviz" });
  });
  it("should take a 16-character hex ID as an XMEye ID", () => {
    assert.deepEqual(parseCameraQr("a1b2c3d4e5f60718"), { type: "cloudId", id: "a1b2c3d4e5f60718", brand: "XMEye / iCSee" });
  });
  it("should take a 9-digit serial as an Ezviz / Hik-Connect ID", () => {
    assert.equal(parseCameraQr("123456789").type === "cloudId" && (parseCameraQr("123456789") as any).brand, "Ezviz / Hik-Connect");
  });
  it("should take a uid field as a cloud ID", () => {
    assert.equal(parseCameraQr("uid:ABCD1234EFGH5678").type, "cloudId");
  });
  it("should not make a camera of unrelated text", () => {
    assert.equal(parseCameraQr("hello world").type, "unknown");
  });
  it("should not make a camera of nothing", () => {
    assert.equal(parseCameraQr("  ").type, "unknown");
  });
});
