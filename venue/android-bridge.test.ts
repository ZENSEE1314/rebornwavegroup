import { strict as assert } from "node:assert";
import { describe, it, before, after } from "node:test";
import fs from "node:fs";
import http from "node:http";
import vm from "node:vm";
import type { AddressInfo } from "node:net";
// @ts-ignore: plain JS build script
import { ANDROID_BRIDGE_FILE, buildAndroidBridge } from "./build-android.mjs";

const TOKEN = "secret-token";
const RUN_FOR_MS = 1500;
const bundle = () => fs.readFileSync(ANDROID_BRIDGE_FILE, "utf8");

describe("the karaoke bridge inside the Android app", () => {
  it("should be the current bridge: rebuild with node venue/build-android.mjs after changing karaoke-bridge.mjs", async () => {
    assert.equal(bundle(), await buildAndroidBridge());
  });

  it("should use no syntax an old WebView lacks", () => {
    assert.doesNotMatch(bundle(), /\?\.|\?\?|\.replaceAll\(|\.at\(|structuredClone|Object\.hasOwn/);
  });

  it("should not hold a closing script tag that would end the page early", () => {
    assert.equal(bundle().includes("</script"), false);
  });
});

describe("the bridge page, run against a pretend app", () => {
  let cloud: http.Server;
  let box: http.Server;
  const cloudCalls: Array<{ path: string; token: string | undefined }> = [];
  const statuses: string[] = [];
  const logs: string[] = [];
  const kept = new Map<string, { text: string; at: number }>();
  const timers = new Set<NodeJS.Timeout>();
  let stopped = false;

  const listen = (server: http.Server) => new Promise<number>((resolve) => server.listen(0, "127.0.0.1", () => resolve((server.address() as AddressInfo).port)));

  before(async () => {
    cloud = http.createServer((req, res) => {
      cloudCalls.push({ path: String(req.url), token: req.headers["x-karaoke-token"] as string | undefined });
      res.setHeader("content-type", "application/json");
      if (req.url === "/api/karaoke/queue") return void res.end(JSON.stringify({ paused: false, nowPlaying: null }));
      if (req.url === "/api/karaoke/controls") return void res.end(JSON.stringify({ commands: [] }));
      if (req.url === "/api/karaoke/library") return void res.end("[]");
      res.end(JSON.stringify({ jobs: [] }));
    });
    box = http.createServer((req, res) => {
      const reply = (value: unknown) => res.end(`cb(${JSON.stringify(value)})`);
      if (String(req.url).includes("PlaylistServlet")) return reply({ number: "0" });
      reply({ number: "0", page: "1", maxPage: "1", songList: "[]", singerList: "[]" });
    });
    const cloudPort = await listen(cloud);
    const boxPort = await listen(box);

    const page: any = vm.createContext({ URLSearchParams, TextDecoder, atob, btoa, URL, Promise, Date, console: {} });
    page.window = page;
    const answer = async (id: number, url: string, method: string, headers: string, body: string) => {
      try {
        const response = await fetch(url, { method, headers: JSON.parse(headers), body: body || undefined });
        const headerMap: Record<string, string> = {};
        response.headers.forEach((value, name) => { headerMap[name.toLowerCase()] = value; });
        const bytes = Buffer.from(await response.arrayBuffer()).toString("base64");
        if (!stopped) page.__hostHttp(id, response.status, JSON.stringify(headerMap), bytes, null);
      } catch (error: any) {
        if (!stopped) page.__hostHttp(id, 0, "{}", "", error.message);
      }
    };
    page.AndroidHost = {
      http: (id: number, method: string, url: string, headers: string, body: string) => void answer(id, url, method, headers, body),
      sleep: (id: number, ms: number) => { const timer = setTimeout(() => { timers.delete(timer); if (!stopped) page.__hostWake(id); }, ms); timers.add(timer); },
      readFile: (name: string) => kept.get(name)?.text ?? null,
      writeFile: (name: string, text: string) => { kept.set(name, { text, at: Date.now() }); return true; },
      fileAge: (name: string) => (kept.has(name) ? Date.now() - kept.get(name)!.at : -1),
      addresses: () => JSON.stringify(["127.0.0.1"]),
      config: () => JSON.stringify({ cloudUrl: `http://127.0.0.1:${cloudPort}`, token: TOKEN, tenantSlug: "", boxUrl: `http://127.0.0.1:${boxPort}/demo` }),
      log: (line: string) => void logs.push(line),
      status: (text: string) => void statuses.push(text),
    };
    vm.runInContext(bundle(), page);
    await new Promise((resolve) => setTimeout(resolve, RUN_FOR_MS));
  });

  after(() => {
    stopped = true;
    for (const timer of timers) clearTimeout(timer);
    cloud.close();
    box.close();
  });

  it("should say it is connected to the song system", () => {
    assert.ok(statuses.some((text) => text.startsWith("Connected: http://127.0.0.1:")), statuses.join(" | "));
  });

  it("should ask the app for the queue with the key", () => {
    assert.ok(cloudCalls.some((call) => call.path === "/api/karaoke/queue" && call.token === TOKEN), JSON.stringify(cloudCalls.slice(0, 5)));
  });

  it("should read the buttons pressed in the app", () => {
    assert.ok(cloudCalls.some((call) => call.path === "/api/karaoke/controls" && call.token === TOKEN));
  });

  it("should keep the song list in a file of the app", () => {
    assert.ok(kept.has("karaoke-catalog.json"), [...kept.keys()].join(","));
  });

  it("should never stop with an error", () => {
    assert.equal(statuses.some((text) => text.startsWith("Stopped")), false, logs.join("\n"));
  });
});
