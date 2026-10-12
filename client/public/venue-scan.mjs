// Venue scanner — run it on one PC at the venue (needs Node 18 or newer, nothing to install):
//   node venue-scan.mjs --server https://rebornwave.group --token <token> [--company <slug>]
// It looks for CCTV cameras and TVs on this network and reports them to the app (Admin > Security > Find nearby).
// It only listens for devices that announce themselves (ONVIF, UPnP) and checks the camera video port (554);
// it never logs in to anything and never sends your passwords anywhere.
import dgram from "node:dgram";
import net from "node:net";
import os from "node:os";

const args = Object.fromEntries(process.argv.slice(2).map((arg, i, all) => (arg.startsWith("--") ? [arg.slice(2), all[i + 1]] : null)).filter(Boolean));
const SERVER = String(args.server || "").replace(/\/$/, "");
const TOKEN = String(args.token || "");
if (!SERVER || !TOKEN) {
  console.error("Usage: node venue-scan.mjs --server https://your-app --token <token> [--company <slug>]");
  process.exit(1);
}

const POLL_MS = 15_000;
const LISTEN_MS = 4_000;
const RTSP_PORT = 554;
const PROBE_TIMEOUT_MS = 700;
const PROBE_BATCH = 64;
const MULTICAST = "239.255.255.250";
const headers = { "x-bridge-token": TOKEN, "content-type": "application/json", ...(args.company ? { "x-tenant-slug": String(args.company) } : {}) };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isIpv4 = (value) => /^\d{1,3}(\.\d{1,3}){3}$/.test(value);

// Listen for UDP replies after sending a multicast question.
function ask(port, message) {
  return new Promise((resolve) => {
    const replies = [];
    const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
    socket.on("message", (data, from) => replies.push({ text: data.toString("utf8"), from: from.address }));
    socket.on("error", () => resolve(replies));
    socket.bind(0, () => {
      try { socket.send(message, port, MULTICAST); } catch { /* no network */ }
      setTimeout(() => { try { socket.close(); } catch { /* already closed */ } resolve(replies); }, LISTEN_MS);
    });
  });
}

// ONVIF cameras answer a WS-Discovery probe.
async function findOnvif() {
  const probe = `<?xml version="1.0"?><e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope" xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" xmlns:dn="http://www.onvif.org/ver10/network/wsdl"><e:Header><w:MessageID>uuid:${crypto.randomUUID()}</w:MessageID><w:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To><w:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action></e:Header><e:Body><d:Probe><d:Types>dn:NetworkVideoTransmitter</d:Types></d:Probe></e:Body></e:Envelope>`;
  const found = [];
  for (const reply of await ask(3702, Buffer.from(probe))) {
    const scopes = reply.text.match(/<[^>]*Scopes[^>]*>([^<]*)</)?.[1] || "";
    const name = decodeURIComponent(scopes.match(/onvif:\/\/www\.onvif\.org\/name\/(\S+)/)?.[1] || "");
    const model = decodeURIComponent(scopes.match(/onvif:\/\/www\.onvif\.org\/hardware\/(\S+)/)?.[1] || "");
    found.push({ ip: reply.from, kind: "camera", name: name || "ONVIF camera", model, rtsp: `rtsp://${reply.from}:${RTSP_PORT}/`, via: "onvif" });
  }
  return found;
}

// TVs (and other screens) answer a UPnP / SSDP search; the description tells what they are.
async function findUpnp() {
  const search = Buffer.from(`M-SEARCH * HTTP/1.1\r\nHOST: ${MULTICAST}:1900\r\nMAN: "ssdp:discover"\r\nMX: 2\r\nST: ssdp:all\r\n\r\n`);
  const locations = new Map();
  for (const reply of await ask(1900, search)) {
    const location = reply.text.match(/^location:\s*(\S+)/im)?.[1];
    if (location) locations.set(reply.from, location);
  }
  const found = [];
  for (const [ip, location] of locations) {
    try {
      const xml = await (await fetch(location, { signal: AbortSignal.timeout(2500) })).text();
      const tag = (name) => xml.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1]?.trim() || "";
      const deviceType = tag("deviceType");
      const friendly = tag("friendlyName");
      const model = [tag("manufacturer"), tag("modelName")].filter(Boolean).join(" ");
      const isTv = /MediaRenderer|Television|dial/i.test(xml) || /tv|bravia|webos|roku|samsung|lg|vizio|chromecast/i.test(`${friendly} ${model}`);
      if (isTv && !/InternetGatewayDevice/i.test(deviceType)) found.push({ ip, kind: "tv", name: friendly || "TV", model, rtsp: "", via: "upnp" });
    } catch { /* this device has no readable description: skip it */ }
  }
  return found;
}

// Cameras without ONVIF still listen on the video port: try every address of this network.
function portOpen(ip, port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: ip, port, timeout: PROBE_TIMEOUT_MS });
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("timeout", () => { socket.destroy(); resolve(false); });
    socket.once("error", () => resolve(false));
  });
}

function localSubnets() {
  const bases = new Set();
  for (const list of Object.values(os.networkInterfaces())) {
    for (const item of list || []) if (item.family === "IPv4" && !item.internal) bases.add(item.address.split(".").slice(0, 3).join("."));
  }
  return [...bases];
}

async function findRtsp() {
  const found = [];
  for (const base of localSubnets()) {
    const hosts = Array.from({ length: 254 }, (_, i) => `${base}.${i + 1}`);
    for (let i = 0; i < hosts.length; i += PROBE_BATCH) {
      const batch = hosts.slice(i, i + PROBE_BATCH);
      const open = await Promise.all(batch.map((ip) => portOpen(ip, RTSP_PORT)));
      batch.forEach((ip, n) => { if (open[n]) found.push({ ip, kind: "camera", name: "Camera / video recorder", model: "", rtsp: `rtsp://${ip}:${RTSP_PORT}/`, via: "port 554" }); });
    }
  }
  return found;
}

async function scan() {
  console.log("Scanning…");
  const [onvif, upnp, rtsp] = await Promise.all([findOnvif(), findUpnp(), findRtsp()]);
  const byAddress = new Map();
  for (const device of [...rtsp, ...onvif, ...upnp]) if (isIpv4(device.ip)) byAddress.set(`${device.kind}:${device.ip}`, device); // the richer answer wins
  const devices = [...byAddress.values()];
  const response = await fetch(`${SERVER}/api/venue-bridge/report`, { method: "POST", headers, body: JSON.stringify({ devices }) });
  console.log(`Found ${devices.filter((d) => d.kind === "camera").length} camera(s), ${devices.filter((d) => d.kind === "tv").length} TV(s) — sent (${response.status}).`);
}

async function main() {
  console.log(`Venue scanner connected to ${SERVER}. Leave this window open; press "Find nearby" in the app to scan.`);
  let isFirst = true;
  for (;;) {
    try {
      const reply = await fetch(`${SERVER}/api/venue-bridge/poll`, { headers, signal: AbortSignal.timeout(10_000) });
      if (reply.status === 401) { console.error("The token is not accepted. Make a new one in the app and start again."); process.exit(1); }
      const { scan: isRequested } = await reply.json();
      if (isRequested || isFirst) { isFirst = false; await scan(); }
    } catch (error) {
      console.error("Could not reach the app, trying again:", error?.message || error);
    }
    await sleep(POLL_MS);
  }
}

main();
