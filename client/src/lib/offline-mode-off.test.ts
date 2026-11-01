import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const WINDOWS_LINE_END = /\r\n/g;
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8").replace(WINDOWS_LINE_END, "\n");
const sales = read("./offline-sales.ts");
const worker = readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8");

describe("offline mode switched off", () => {
  it("should have the offline switch off", () => assert.match(sales, /const OFFLINE_MODE = false;/));
  it("should never tell the screen it is offline while the switch is off", () => assert.match(sales, /looksOffline: OFFLINE_MODE && looksOffline/));
  it("should refuse a sale it cannot send instead of queueing it", () => assert.match(sales, /if \(!OFFLINE_MODE\) throw new Error\(translate\("pos\.sale\.unreachable"\)\);\n\s+save\(addSale/));
  it("should not answer any request from a saved copy in the service worker", () => assert.doesNotMatch(worker, /addEventListener\("fetch"/));
  it("should drop every saved cache of earlier versions when the worker starts", () => assert.match(worker, /names\.filter\(\(n\) => n\.startsWith\("rw-"\)\)/));
  it("should keep the push notification handler", () => assert.match(worker, /addEventListener\("push"/));
});
