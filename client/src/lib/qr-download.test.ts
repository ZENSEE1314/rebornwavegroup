import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { wifiQrText } from "./qr-download";

describe("Wi-Fi QR text", () => {
  it("should write the standard WIFI: string for a WPA network", () => {
    assert.equal(wifiQrText("Reborn", "secret123", "WPA"), "WIFI:T:WPA;S:Reborn;P:secret123;;");
  });

  it("should escape ; , : \\ and quotes in the name and the password", () => {
    assert.equal(wifiQrText('a;b', 'p:w,d"\\', "WPA"), 'WIFI:T:WPA;S:a\\;b;P:p\\:w\\,d\\"\\\\;;');
  });

  it("should leave the password out for an open network", () => {
    assert.equal(wifiQrText("Guest", "ignored", "nopass"), "WIFI:T:nopass;S:Guest;;");
  });
});
