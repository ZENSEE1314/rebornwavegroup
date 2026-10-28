// Camera bridge: runs on the venue PC (Node 18+, no packages, ffmpeg installed) and shows the venue's Dahua / Hiview cameras (the ones the DMSS app uses) in a browser.
// Browsers cannot play a camera's RTSP stream, so ffmpeg reads it once per camera and this program hands it out as a motion-JPEG picture to every viewer.
// The cameras are set in venue/camera.config.json (kept out of git, it holds the camera passwords):
//   { "cameras": [{ "id": "cam1", "name": "Front door", "host": "192.168.100.214", "user": "admin", "password": "...", "channel": 1 }] }
// Optional: "port" (554), "subtype" (1 = small stream, 0 = full quality), "fps" (5), "ffmpeg" (path), "listenPort" (3100). A "viewKey" is made on the first run.
// To watch from anywhere, also set "cloudUrl" (https://rebornwave.group) and "cloudToken" (the venue bridge token, same as the karaoke bridge; a company on the shared host adds "tenantSlug"):
// the program then sends a picture to the app, shown in Admin › Security › Cameras › Live from the venue. Nothing but small pictures leaves the venue, and only while the program runs.
//   node venue/camera-bridge.mjs   then open the address it prints (it holds the key; anyone on the venue Wi-Fi without the key sees nothing)
import { spawn } from "node:child_process";
import { randomBytes, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CONFIG_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "camera.config.json");
const DEFAULT_PORT = 3100;
const DEFAULT_RTSP_PORT = 554;
const DEFAULT_FPS = 5;
const DEFAULT_SUBTYPE = 1;
const RTSP_TIMEOUT_US = 8_000_000;
const IDLE_STOP_MS = 15_000;      // the stream stops this long after the last viewer left
const RESTART_AFTER_MS = 4000;
const MAX_FRAME_BYTES = 4_000_000;
const IDLE_PUSH_MS = 20_000;
const WATCH_PUSH_MS = 1500;
const CLOUD_TIMEOUT_MS = 15_000;
const RETRY_AFTER_ERROR_MS = 5000;
const JPEG_START = Buffer.from([0xff, 0xd8]);
const JPEG_END = Buffer.from([0xff, 0xd9]);
const BOUNDARY = "camframe";

// Dahua's own address pattern; the password is encoded so a symbol in it cannot break the address.
export function buildRtspUrl(cam) {
  const { host, user, password } = cam;
  const port = cam.port || DEFAULT_RTSP_PORT;
  const channel = cam.channel || 1;
  const subtype = cam.subtype ?? DEFAULT_SUBTYPE;
  return `rtsp://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/cam/realmonitor?channel=${channel}&subtype=${subtype}`;
}

// Cuts the bytes ffmpeg writes into whole JPEG pictures; returns them with what is left over for the next chunk.
export function splitJpegFrames(buffer) {
  const frames = [];
  let rest = buffer;
  for (;;) {
    const start = rest.indexOf(JPEG_START);
    if (start < 0) return { frames, rest: Buffer.alloc(0) };
    const end = rest.indexOf(JPEG_END, start + 2);
    if (end < 0) return { frames, rest: rest.subarray(start) };
    frames.push(rest.subarray(start, end + 2));
    rest = rest.subarray(end + 2);
  }
}

export function isKeyOk(given, expected) {
  const a = Buffer.from(String(given || ""));
  const b = Buffer.from(String(expected || ""));
  return a.length === b.length && timingSafeEqual(a, b);
}

function loadConfig() {
  const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8").replace(/^﻿/, "")); // Notepad / PowerShell add a byte-order mark
  if (!Array.isArray(config.cameras) || config.cameras.length === 0) throw new Error("camera.config.json needs a \"cameras\" list");
  if (!config.viewKey) {
    config.viewKey = randomBytes(12).toString("hex");
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  }
  return config;
}

function createCameraStream(cam, config) {
  const viewers = new Set();
  let child = null;
  let latest = null;
  let idleTimer = null;
  let isWanted = false;

  const start = () => {
    const args = ["-hide_banner", "-loglevel", "error", "-rtsp_transport", "tcp", "-timeout", String(RTSP_TIMEOUT_US), "-i", buildRtspUrl(cam),
      "-an", "-r", String(config.fps || DEFAULT_FPS), "-q:v", "6", "-f", "image2pipe", "-c:v", "mjpeg", "pipe:1"];
    child = spawn(config.ffmpeg || "ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let pending = Buffer.alloc(0);
    child.stdout.on("data", (chunk) => {
      pending = Buffer.concat([pending, chunk]);
      if (pending.length > MAX_FRAME_BYTES) { pending = Buffer.alloc(0); return; }
      const cut = splitJpegFrames(pending);
      pending = cut.rest;
      for (const frame of cut.frames) {
        latest = frame;
        for (const res of viewers) {
          res.write(`--${BOUNDARY}\r\nContent-Type: image/jpeg\r\nContent-Length: ${frame.length}\r\n\r\n`);
          res.write(frame);
          res.write("\r\n");
        }
      }
    });
    child.stderr.on("data", (chunk) => console.error(`[${cam.id}] ${String(chunk).trim().split(cam.password).join("***")}`));
    child.on("exit", () => {
      child = null;
      latest = null;
      if (isWanted) setTimeout(() => isWanted && !child && start(), RESTART_AFTER_MS);
    });
  };

  const stopWhenIdle = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (viewers.size === 0) { isWanted = false; child?.kill(); } }, IDLE_STOP_MS);
  };

  return {
    addViewer(res) {
      clearTimeout(idleTimer);
      viewers.add(res);
      if (!isWanted) { isWanted = true; if (!child) start(); }
      res.on("close", () => { viewers.delete(res); if (viewers.size === 0) stopWhenIdle(); });
    },
    async snapshot() {
      if (!isWanted) { isWanted = true; if (!child) start(); }
      stopWhenIdle();
      for (let waited = 0; !latest && waited < RTSP_TIMEOUT_US / 1000; waited += 200) await new Promise((resolve) => setTimeout(resolve, 200));
      return latest;
    },
  };
}

// Sends a picture of each camera to the app so it can be watched from anywhere. The app answers whether someone is looking:
// then a picture goes every second or two, otherwise only now and then (enough to show the camera as online).
async function pushPictures(cam, stream, { cloudUrl, token, tenantSlug }) {
  const headers = { "content-type": "application/json", "x-karaoke-token": token, ...(tenantSlug ? { "x-tenant-slug": tenantSlug } : {}) };
  for (;;) {
    let delay = IDLE_PUSH_MS;
    try {
      const frame = await stream.snapshot();
      if (frame) {
        const res = await fetch(`${cloudUrl}/api/venue-camera/frame`, { method: "POST", headers, body: JSON.stringify({ id: cam.id, name: cam.name, jpeg: frame.toString("base64") }), signal: AbortSignal.timeout(CLOUD_TIMEOUT_MS) });
        if (res.ok) delay = (await res.json()).watching ? WATCH_PUSH_MS : IDLE_PUSH_MS;
        else { console.error(`[${cam.id}] the app refused the picture (${res.status})`); delay = RETRY_AFTER_ERROR_MS; }
      }
    } catch (error) {
      console.error(`[${cam.id}] could not send a picture: ${error.message}`);
      delay = RETRY_AFTER_ERROR_MS;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

const escapeHtml =(text) => String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function pageHtml(config) {
  const tiles = config.cameras.map((cam) => `<figure><img src="/cam/${encodeURIComponent(cam.id)}.mjpg?key=${config.viewKey}" alt="${escapeHtml(cam.name)}"><figcaption>${escapeHtml(cam.name)}</figcaption></figure>`).join("");
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cameras</title>
<style>body{margin:0;background:#0b0b0f;color:#eee;font:14px system-ui}main{display:grid;gap:8px;padding:8px;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))}
figure{margin:0;background:#000;border-radius:10px;overflow:hidden}img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain}figcaption{padding:6px 10px}</style><main>${tiles}</main>`;
}

export function startServer(config) {
  const streams = new Map(config.cameras.map((cam) => [cam.id, createCameraStream(cam, config)]));
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://camera-bridge");
    if (!isKeyOk(url.searchParams.get("key"), config.viewKey)) { res.writeHead(403).end("Forbidden"); return; }
    if (url.pathname === "/cameras") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(pageHtml(config)); return; }
    const match = url.pathname.match(/^\/cam\/([^/]+)\.(mjpg|jpg)$/);
    const stream = match && streams.get(decodeURIComponent(match[1]));
    if (!stream) { res.writeHead(404).end("Not found"); return; }
    if (match[2] === "jpg") {
      const frame = await stream.snapshot();
      if (!frame) { res.writeHead(504).end("The camera did not answer"); return; }
      res.writeHead(200, { "Content-Type": "image/jpeg", "Cache-Control": "no-store" }).end(frame);
      return;
    }
    res.writeHead(200, { "Content-Type": `multipart/x-mixed-replace; boundary=${BOUNDARY}`, "Cache-Control": "no-store" });
    stream.addViewer(res);
  });
  server.listen(config.listenPort || DEFAULT_PORT, "0.0.0.0");
  const cloud = {
    cloudUrl: String(config.cloudUrl || process.env.CLOUD_URL || "").replace(/\/+$/, ""),
    token: config.cloudToken || process.env.KARAOKE_TOKEN || "",
    tenantSlug: config.tenantSlug || process.env.TENANT_SLUG || "",
  };
  if (cloud.cloudUrl && cloud.token) for (const cam of config.cameras) pushPictures(cam, streams.get(cam.id), cloud);
  return { server, isPushing: !!(cloud.cloudUrl && cloud.token) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = loadConfig();
  const { isPushing } = startServer(config);
  console.log(`Cameras: http://localhost:${config.listenPort || DEFAULT_PORT}/cameras?key=${config.viewKey}`);
  console.log(isPushing ? "Sending pictures to the app (Admin › Security › Cameras › Live from the venue)." : "Not sending to the app: set cloudUrl and cloudToken in camera.config.json (the token is the one from Admin › Requests › Karaoke system).");
  console.log("On the venue Wi-Fi use this PC's IP address instead of localhost. Keep this window open.");
}
