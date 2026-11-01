import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const WINDOWS_LINE_END = /\r\n/g;
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8").replace(WINDOWS_LINE_END, "\n");
const sales = read("./offline-sales.ts");
const worker = read("../../public/sw.js");

describe("offline mode only on the PC", () => {
  it("should switch offline mode on only for the Windows POS app or the venue copy", () => assert.match(sales, /const OFFLINE_MODE = isPcPos\(\);/));
  it("should recognise the Windows POS app by its Electron name", () => assert.ok(sales.includes('navigator.userAgent.includes("Electron/")')));
  it("should never tell the screen it is offline where offline mode is off", () => assert.match(sales, /looksOffline: OFFLINE_MODE && looksOffline/));
  it("should refuse a sale it cannot send instead of queueing it on the web", () => assert.match(sales, /if \(!OFFLINE_MODE\) throw new Error\(translate\("pos\.sale\.unreachable"\)\);\n\s+save\(addSale/));
  it("should answer from a saved copy in the service worker only where offline is allowed", () => assert.match(worker, /addEventListener\("fetch", \(event\) => \{\n  if \(!OFFLINE_ALLOWED\) return;/));
  it("should recognise the PC in the service worker too", () => assert.ok(worker.includes('self.navigator.userAgent.includes("Electron/")')));
  it("should drop the saved caches on a device where offline is not allowed", () => assert.match(worker, /\(!OFFLINE_ALLOWED \|\| !\[SHELL, API\]\.includes\(n\)\)/));
  it("should keep the push notification handler", () => assert.match(worker, /addEventListener\("push"/));
});
