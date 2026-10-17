// Karaoke bridge: runs on a PC at the venue (Node 18+, no packages) and joins our song queue to the karaoke box on the venue Wi-Fi
// (the box's own "phone song ordering" page, e.g. http://192.168.100.4:8084/demo/). Our app keeps the fair queue; this program
//   - takes the song that is "on now" in the app, finds it in the box's song list and orders it on the box (CommandServlet Add1),
//   - waits until the box is idle again (nothing playing or waiting) and then tells the app the song ended (POST /api/karaoke/next),
//   - cuts the song on the box (Skip) when the app skipped or cancelled it.
// It only adds a song when the box is idle, so songs ordered by hand on the box are never mixed up with ours.
//
//   CLOUD_URL=https://rebornwave.group KARAOKE_TOKEN=xxxx BOX_URL=http://192.168.100.4:8084/demo node venue/karaoke-bridge.mjs
// Optional: TENANT_SLUG (a company on the shared host), POLL_MS (default 3000).
import { fileURLToPath } from "node:url";

const DEFAULT_POLL_MS = 3000;
const BOX_TIMEOUT_MS = 8000;
const CLOUD_TIMEOUT_MS = 10000;
const NOT_STARTED_MS = 25000; // the box took a song but never showed it as busy: give up on it
const PLAYER_CALLBACK = "cb";
const JOB_POLL_TIMEOUT_MS = 30000; // the app holds the request up to 20 s
const RETRY_AFTER_ERROR_MS = 3000;

// The box answers with JSONP: cb({...}); the song list inside is itself a JSON string.
export function parseJsonp(text) {
  const start = text.indexOf("(");
  const end = text.lastIndexOf(")");
  if (start < 0 || end < start) throw new Error("not a JSONP answer");
  return JSON.parse(text.slice(start + 1, end));
}

const plain = (value) => String(value || "").toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

// The best song of the box's search result for a requested title / artist: same title first, local songs before cloud ones.
export function pickSong(results, title, artist) {
  const wantTitle = plain(title);
  const wantArtist = plain(artist);
  let best = null;
  let bestScore = 0;
  for (const song of results) {
    const gotTitle = plain(song.sONGNAME);
    let score = 0;
    if (gotTitle === wantTitle) score += 10;
    else if (gotTitle.includes(wantTitle) || wantTitle.includes(gotTitle)) score += 4;
    else continue;
    if (wantArtist && plain(song.sINGER).includes(wantArtist)) score += 5;
    if (!song.cLOUD) score += 1;
    if (score > bestScore) { best = song; bestScore = score; }
  }
  return best;
}

export function createBridge({ cloudUrl, token, boxUrl, tenantSlug = "", fetchImpl = fetch, log = console.log, now = () => Date.now() }) {
  const box = boxUrl.replace(/\/+$/, "");
  const cloud = cloudUrl.replace(/\/+$/, "");
  let sent = null; // { id, code, at, seenBusy } the app's song that is on the box now

  const boxCall = async (servlet, params) => {
    const query = new URLSearchParams({ ...params, jsonpCallback: PLAYER_CALLBACK });
    const res = await fetchImpl(`${box}/${servlet}?${query}`, { signal: AbortSignal.timeout(BOX_TIMEOUT_MS) });
    return parseJsonp(await res.text());
  };
  const cloudCall = async (method, path, body) => {
    const res = await fetchImpl(`${cloud}${path}`, {
      method, signal: AbortSignal.timeout(CLOUD_TIMEOUT_MS),
      headers: { "content-type": "application/json", "x-karaoke-token": token, ...(tenantSlug ? { "x-tenant-slug": tenantSlug } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return res.json();
  };

  const boxCount = async () => Number((await boxCall("PlaylistServlet", { onSelectPage: "false", click: "false", type: "1" })).number) || 0;
  const findCode = async (song) => {
    if (song.karaokeCode) return song.karaokeCode;
    const found = await boxCall("SearchServlet", { songName: song.title, songType: "", singer: "", lang: "", sortType: "", page: "1" });
    const match = pickSong(JSON.parse(found.songList || "[]"), song.title, song.artist);
    return match ? match.sONGBM : null;
  };
  const finish = (finishedId, skip) => cloudCall("POST", "/api/karaoke/next", { finishedId, ...(skip ? { skip: true } : {}) });

  // One round: look at the app's queue and the box, and move whichever side is behind.
  async function tick() {
    const board = await cloudCall("GET", "/api/karaoke/queue");
    const current = board.nowPlaying;
    const count = await boxCount();

    if (sent) {
      if (!current || current.id !== sent.id) { // skipped or cancelled in the app
        if (count > 0) await boxCall("CommandServlet", { cmd: "Skip", cmdValue: "" });
        log(`song ${sent.id} left the app's queue: ${count > 0 ? "cut on the box" : "box already idle"}`);
        sent = null;
        return "cut";
      }
      if (count > 0) { sent.seenBusy = true; return "playing"; }
      if (sent.seenBusy) { // the box played it and is idle again
        const done = sent.id;
        sent = null;
        await finish(done, false);
        log(`song ${done} finished on the box`);
        return "finished";
      }
      if (now() - sent.at > NOT_STARTED_MS) {
        const lost = sent.id;
        sent = null;
        await finish(lost, true);
        log(`song ${lost} never started on the box: skipped`);
        return "lost";
      }
      return "starting";
    }

    if (!current || board.paused) return "idle";
    if (count > 0) return "box busy"; // someone is playing songs on the box by hand: wait until it is idle
    const code = await findCode(current);
    if (!code) {
      await finish(current.id, true);
      log(`"${current.title}" is not in the box's song list: skipped`);
      return "not found";
    }
    await boxCall("CommandServlet", { cmd: "Add1", cmdValue: code });
    sent = { id: current.id, code, at: now(), seenBusy: false };
    log(`ordered "${current.title}" (${code}) on the box`);
    return "ordered";
  }

  // One round of the search helper: ask the app for searches members typed (the request is held open up to 20 s), run each on the box and send the answer back.
  async function serveSearches() {
    const res = await fetchImpl(`${cloud}/api/karaoke/jobs`, { signal: AbortSignal.timeout(JOB_POLL_TIMEOUT_MS), headers: { "x-karaoke-token": token, ...(tenantSlug ? { "x-tenant-slug": tenantSlug } : {}) } });
    if (!res.ok) throw new Error(`/api/karaoke/jobs: ${res.status}`);
    const { jobs = [] } = await res.json();
    for (const job of jobs) {
      const songs = [];
      for (const page of ["1", "2"]) {
        const found = await boxCall("SearchServlet", { songName: job.q, songType: "", singer: "", lang: "", sortType: "", page });
        const list = JSON.parse(found.songList || "[]");
        songs.push(...list.map((x) => ({ code: x.sONGBM, title: x.sONGNAME, artist: x.sINGER, cloud: !!x.cLOUD })));
        if (list.length < Number(found.number || 15)) break;
      }
      await cloudCall("POST", `/api/karaoke/jobs/${job.id}`, { songs });
      log(`search "${job.q}": ${songs.length} songs`);
    }
    return jobs.length;
  }

  return { tick, serveSearches };
}

async function main() {
  const { CLOUD_URL, KARAOKE_TOKEN, BOX_URL, TENANT_SLUG, POLL_MS } = process.env;
  if (!CLOUD_URL || !KARAOKE_TOKEN || !BOX_URL) { console.error("Set CLOUD_URL, KARAOKE_TOKEN and BOX_URL (see the top of this file)."); process.exit(1); }
  const bridge = createBridge({ cloudUrl: CLOUD_URL, token: KARAOKE_TOKEN, boxUrl: BOX_URL, tenantSlug: TENANT_SLUG || "" });
  console.log(`Karaoke bridge: ${BOX_URL} <-> ${CLOUD_URL}`);
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const playLoop = async () => { for (;;) { try { await bridge.tick(); } catch (error) { console.log(`waiting: ${error.message}`); } await wait(Number(POLL_MS) || DEFAULT_POLL_MS); } };
  const searchLoop = async () => { for (;;) { try { await bridge.serveSearches(); } catch (error) { console.log(`search helper waiting: ${error.message}`); await wait(RETRY_AFTER_ERROR_MS); } } };
  await Promise.all([playLoop(), searchLoop()]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
