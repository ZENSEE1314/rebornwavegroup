// The karaoke bridge as the Android app on the karaoke box runs it (tv-overlay/, BridgeService): same program, no PC.
// The app starts this page with its settings in AndroidHost.config() = { cloudUrl, token, tenantSlug, boxUrl }.
import { findBox, isBox, runBridge } from "../karaoke-bridge.mjs";
import fs from "node:fs";

const BOX_PORT = 8084;
const BOX_PATH = "demo";
const BOX_FILE = "karaoke-box.json";
const SEARCH_AGAIN_MS = 30000;

const addressOf = (ip) => `http://${ip}:${BOX_PORT}/${BOX_PATH}`;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const say = (text) => AndroidHost.status(text);

// The song system's web server is on this very device: its own address first, then the one found last time, then the whole network.
async function findTheBox(given) {
  if (given) return given;
  let saved = "";
  try { saved = JSON.parse(fs.readFileSync(BOX_FILE, "utf8")).boxUrl || ""; } catch { /* nothing saved yet */ }
  const near = [saved, addressOf("127.0.0.1"), ...JSON.parse(AndroidHost.addresses()).map(addressOf)].filter(Boolean);
  for (const url of near) if (await isBox(url)) return url;
  const found = await findBox({ log: console.log });
  if (found) { try { fs.writeFileSync(BOX_FILE, JSON.stringify({ boxUrl: found })); } catch { /* it is found again next time */ } }
  return found;
}

async function start() {
  const config = JSON.parse(AndroidHost.config());
  for (;;) {
    say("Looking for the song system on this box ...");
    const boxUrl = await findTheBox(config.boxUrl);
    if (boxUrl) {
      say(`Connected: ${boxUrl}`);
      await runBridge({ cloudUrl: config.cloudUrl, token: config.token, boxUrl, tenantSlug: config.tenantSlug || "" });
    }
    console.log("the song system was not found: trying again soon");
    await wait(SEARCH_AGAIN_MS);
  }
}

start().catch((error) => { say(`Stopped: ${error.message}`); console.log(`stopped: ${error.stack || error.message}`); });
