import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// While the POS thinks it is offline it asks the server every few seconds and, when the server answers, goes back online by itself and refreshes the screen.
const WINDOWS_LINE_END = /\r\n/g;
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8").replace(WINDOWS_LINE_END, "\n");
const sales = read("./offline-sales.ts");
const banner = read("../components/OfflineBanner.tsx");

describe("offline recovery", () => {
  it("should start asking the server when a request fails or the device goes offline", () => {
    assert.ok(sales.includes("if (looksOffline) startProbe();") && sales.includes('window.addEventListener("offline", () => { looksOffline = true; publish(); startProbe(); });'));
  });
  it("should ask a health check that is not answered from the saved copy", () => {
    assert.ok(sales.includes('const HEALTH_URL = "/api/health";') && sales.includes('response.headers.get("x-sw-saved")'));
  });
  it("should go back online and announce it when the server answers", () => {
    assert.ok(sales.includes("looksOffline = false;") && sales.includes("window.dispatchEvent(new Event(RECONNECTED_EVENT));"));
  });
  it("should read every query afresh when it is back", () => {
    assert.ok(sales.includes("qc.invalidateQueries()"));
  });
  it("should offer a button to check the connection now", () => {
    assert.ok(banner.includes("checkConnectionNow") && banner.includes('t("pos.offline.checkNow")'));
  });
});
