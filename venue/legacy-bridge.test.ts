import { strict as assert } from "node:assert";
import { describe, it, before, after } from "node:test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import vm from "node:vm";
import type { AddressInfo } from "node:net";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
// @ts-ignore: plain JS build script
import { buildLegacyBridge } from "./build-legacy.mjs";

const here = new URL(".", import.meta.url);
const nodeRequire = createRequire(import.meta.url);
const read = (name: string) => fs.readFileSync(new URL(name, here), "utf8");
const bundlePath = new URL("legacy/karaoke-bridge-legacy.cjs", here);
const BODY_ECHO_PATH = "/echo";
const SLOW_PATH = "/slow";
const SLOW_MS = 400;

describe("the karaoke bridge for Windows 7 (Node.js 12)", () => {
  it("should be the current bridge: rebuild with node venue/build-legacy.mjs after changing karaoke-bridge.mjs", async () => {
    assert.equal(read("legacy/karaoke-bridge-legacy.cjs"), await buildLegacyBridge());
  });

  it("should use nothing Node 12 does not have", () => {
    assert.doesNotMatch(read("legacy/karaoke-bridge-legacy.cjs"), /\?\.|\?\?|\.replaceAll\(|\.at\(|structuredClone|Object\.hasOwn|rmSync/);
  });

  it("should start and say what it needs when the address is missing", () => {
    let output = "";
    try { execFileSync(process.execPath, [fileURLToPath(bundlePath)], { env: { ...process.env, CLOUD_URL: "", KARAOKE_TOKEN: "" }, stdio: "pipe" }); } catch (error: any) { output = String(error.stderr || error.stdout); }
    assert.match(output, /Set CLOUD_URL and KARAOKE_TOKEN/);
  });
});

describe("fetch for Node.js 12", () => {
  let server: http.Server;
  let base = "";
  let legacyFetch: (url: string, options?: any) => Promise<any>;
  let legacyContext: any;

  before(async () => {
    server = http.createServer((req, res) => {
      if (req.url === SLOW_PATH) return void setTimeout(() => res.end("late"), SLOW_MS);
      if (req.url === "/missing") { res.statusCode = 404; return void res.end("nope"); }
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ method: req.method, token: req.headers["x-karaoke-token"], body: Buffer.concat(chunks).toString() })); });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    // A world with no fetch and no AbortSignal, like Node 12.
    legacyContext = vm.createContext({ require: nodeRequire, Buffer, URL, setTimeout, clearTimeout, Promise, JSON, Object, String, Error, console });
    legacyContext.globalThis = legacyContext;
    vm.runInContext(read("legacy/legacy-shim.cjs"), legacyContext);
    legacyFetch = legacyContext.fetch;
  });
  after(() => server.close());

  it("should add fetch and AbortSignal.timeout where there are none", () => {
    assert.equal(typeof legacyFetch, "function");
    assert.equal(legacyContext.AbortSignal.timeout(5).timeoutMs, 5);
  });

  it("should send a POST with its headers and body and read the JSON answer", async () => {
    const res = await legacyFetch(`${base}${BODY_ECHO_PATH}`, { method: "POST", headers: { "content-type": "application/json", "x-karaoke-token": "abc" }, body: JSON.stringify({ a: 1 }) });
    assert.deepEqual(await res.json(), { method: "POST", token: "abc", body: '{"a":1}' });
  });

  it("should say not ok with the status for an error answer", async () => {
    const res = await legacyFetch(`${base}/missing`);
    assert.deepEqual([res.ok, res.status, await res.text()], [false, 404, "nope"]);
  });

  it("should read the content type and the bytes of an answer", async () => {
    const res = await legacyFetch(`${base}${BODY_ECHO_PATH}`);
    assert.equal(res.headers.get("content-type"), "application/json");
    assert.ok((await res.arrayBuffer()).byteLength > 0);
  });

  it("should give up when the time given by AbortSignal.timeout runs out", async () => {
    await assert.rejects(legacyFetch(`${base}${SLOW_PATH}`, { signal: legacyContext.AbortSignal.timeout(50) }), /timed out|socket hang up|ECONNRESET/);
  });
});
