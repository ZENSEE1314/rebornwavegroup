// Karaoke bridge: runs on a PC at the venue (Node 18+, no packages) and joins our song queue to the karaoke box on the venue Wi-Fi
// (the box's own "phone song ordering" page, e.g. http://192.168.100.4:8084/demo/). Our app keeps the fair queue; this program
//   - takes the song that is "on now" in the app, finds it in the box's song list and orders it on the box (CommandServlet Add1),
//   - waits until the box is idle again (nothing playing or waiting) and then tells the app the song ended (POST /api/karaoke/next),
//   - cuts the song on the box (Skip) when the app skipped or cancelled it.
// It only adds a song when the box is idle, so songs ordered by hand on the box are never mixed up with ours.
//
//   CLOUD_URL=https://rebornwave.group KARAOKE_TOKEN=xxxx BOX_URL=http://192.168.100.4:8084/demo node venue/karaoke-bridge.mjs
// Optional: TENANT_SLUG (a company on the shared host), POLL_MS (default 3000).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_POLL_MS = 3000;
const BOX_TIMEOUT_MS = 8000;
const CLOUD_TIMEOUT_MS = 10000;
const NOT_STARTED_MS = 25000; // the box took a song but never showed it as busy: give up on it
const PLAYER_CALLBACK = "cb";
const JOB_POLL_TIMEOUT_MS = 30000; // the app holds the request up to 20 s
const RETRY_AFTER_ERROR_MS = 3000;
const SEARCH_PAGES = 3;          // pages (15 songs each) read per search text for a member's search
const FIND_PAGES = 40;           // pages read when looking for the one requested song by its initials
const BOX_PAGE_SIZE = 15;
const CATALOG_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "karaoke-catalog.json"); // the box's whole song list, kept next to the program
const CATALOG_MAX_AGE_MS = 24 * 3600 * 1000;
const CRAWL_WORKERS = 4;
const CRAWL_RETRIES = 3;
const LOCAL_RESULT_LIMIT = 40;
const hasChinese = (text) => /[\u3400-\u9fff]/.test(String(text || ""));

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

// A song of the kept list with its title and singer already simplified for searching.
function indexSong(song) { return { ...song, pt: plain(song.sONGNAME), ps: plain(song.sINGER) }; }

export function createBridge({ cloudUrl, token, boxUrl, tenantSlug = "", fetchImpl = fetch, log = console.log, now = () => Date.now(), catalog: givenCatalog = null, catalogFile = CATALOG_FILE }) {
  const box = boxUrl.replace(/\/+$/, "");
  const cloud = cloudUrl.replace(/\/+$/, "");
  let sent = null; // { id, code, at, seenBusy } the app's song that is on the box now
  // The box's whole song list (about 200,000 songs, read once and kept): the box's own search misses many Chinese songs, ours does not.
  let catalog = givenCatalog ? givenCatalog.map(indexSong) : null;

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
  // One search text on the box, page after page (the box returns 15 songs a page); stops at the end of the list or when `enough` says so.
  const searchBox = async (text, pages, enough = () => false) => {
    const all = [];
    for (let page = 1; page <= pages; page++) {
      const found = await boxCall("SearchServlet", { songName: text, songType: "", singer: "", lang: "", sortType: "", page: String(page) });
      const list = JSON.parse(found.songList || "[]");
      all.push(...list);
      if (list.length < BOX_PAGE_SIZE || enough(all)) break;
    }
    return all;
  };
  // Songs of the kept list whose title or singer (the box writes the title's pinyin into the singer field) contain the text: best matches first.
  const searchLocal = (text) => {
    const want = plain(text);
    if (!want || !catalog) return [];
    const scored = [];
    for (const song of catalog) {
      const inTitle = song.pt.indexOf(want);
      const inSinger = song.ps.indexOf(want);
      if (inTitle < 0 && inSinger < 0) continue;
      scored.push({ song, score: song.pt === want ? 0 : inTitle === 0 ? 1 : inTitle > 0 ? 2 : 3 });
    }
    return scored.sort((a, b) => a.score - b.score || Number(a.song.cLOUD) - Number(b.song.cLOUD)).slice(0, LOCAL_RESULT_LIMIT).map((x) => x.song);
  };
  async function loadCatalog() {
    try {
      if (fs.existsSync(catalogFile) && Date.now() - fs.statSync(catalogFile).mtimeMs < CATALOG_MAX_AGE_MS) {
        catalog = JSON.parse(fs.readFileSync(catalogFile, "utf8")).map(indexSong);
        log(`song list loaded from ${catalogFile}: ${catalog.length} songs`);
        return;
      }
      const first = await boxCall("SearchServlet", { songName: "", songType: "", singer: "", lang: "", sortType: "", page: "1" });
      const lastPage = Number(first.maxPage) || 1;
      log(`reading the box's song list: ${lastPage} pages (a few minutes, searches work meanwhile)`);
      const pages = new Array(lastPage);
      let next = 1, done = 0;
      const worker = async () => {
        while (next <= lastPage) {
          const page = next++;
          for (let attempt = 1; attempt <= CRAWL_RETRIES; attempt++) {
            try { pages[page - 1] = JSON.parse((await boxCall("SearchServlet", { songName: "", songType: "", singer: "", lang: "", sortType: "", page: String(page) })).songList || "[]"); break; }
            catch (error) { if (attempt === CRAWL_RETRIES) { pages[page - 1] = []; log(`page ${page} skipped: ${error.message}`); } }
          }
          if (++done % 2000 === 0) log(`  ${done} / ${lastPage} pages`);
        }
      };
      await Promise.all(Array.from({ length: CRAWL_WORKERS }, worker));
      const raw = pages.flat().map((x) => ({ sONGBM: x.sONGBM, sONGNAME: x.sONGNAME, sINGER: x.sINGER, cLOUD: x.cLOUD }));
      fs.writeFileSync(catalogFile, JSON.stringify(raw));
      catalog = raw.map(indexSong);
      log(`song list ready: ${catalog.length} songs`);
    } catch (error) { log(`song list not read yet: ${error.message}`); }
  }
  const findCode = async (song) => {
    if (song.karaokeCode) return song.karaokeCode;
    if (catalog) { const match = pickSong(searchLocal(song.title), song.title, song.artist); if (match) return match.sONGBM; }
    const exact = (all) => pickSong(all, song.title, song.artist);
    for (const text of song.boxQueries?.length ? song.boxQueries : [song.title]) {
      const match = exact(await searchBox(text, text === song.title ? 1 : FIND_PAGES, (all) => !!exact(all)));
      if (match) return match.sONGBM;
    }
    return null;
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

    if (board.paused) return "idle";
    // Nothing is on in the app yet but members are waiting and the box is idle: start the first of the queue (the app only starts a song when asked).
    if (!current) {
      if (!board.queue?.length || count > 0) return "idle";
      await cloudCall("POST", "/api/karaoke/next", {});
      log("started the first waiting song");
      return "started";
    }
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
      if (catalog) {
        const local = searchLocal(job.q).map((x) => ({ code: x.sONGBM, title: x.sONGNAME, artist: x.sINGER, cloud: !!x.cLOUD }));
        await cloudCall("POST", `/api/karaoke/jobs/${job.id}`, { songs: local });
        log(`search "${job.q}": ${local.length} songs (own list)`);
        continue;
      }
      // Chinese text is also searched by its pinyin initials; those matches are broad, so only songs that really contain what the member typed are kept.
      const seen = new Set();
      const songs = [];
      for (const text of job.queries?.length ? job.queries : [job.q]) {
        for (const x of await searchBox(text, SEARCH_PAGES)) {
          if (seen.has(x.sONGBM) || (hasChinese(job.q) && !plain(x.sONGNAME).includes(plain(job.q)) && !plain(x.sINGER).includes(plain(job.q)))) continue;
          seen.add(x.sONGBM);
          songs.push({ code: x.sONGBM, title: x.sONGNAME, artist: x.sINGER, cloud: !!x.cLOUD });
        }
      }
      await cloudCall("POST", `/api/karaoke/jobs/${job.id}`, { songs });
      log(`search "${job.q}": ${songs.length} songs`);
    }
    return jobs.length;
  }

  // Links the app's own song library to the box: every library song the box has gets its number on the box, so members only browse and request playable songs.
  async function linkLibrary() {
    if (!catalog) return 0;
    const library = await cloudCall("GET", "/api/karaoke/library");
    const links = [];
    for (const song of library) {
      const match = pickSong(searchLocal(song.title), song.title, song.artist);
      if (match && String(match.sONGBM) !== String(song.code || "")) links.push({ id: song.id, code: match.sONGBM });
    }
    if (links.length) await cloudCall("POST", "/api/karaoke/link", { links });
    log(`library: ${links.length} of ${library.length} songs linked to the box`);
    return links.length;
  }

  return { tick, serveSearches, loadCatalog, linkLibrary, searchLocal, catalogSize: () => (catalog ? catalog.length : 0) };
}

async function main() {
  const { CLOUD_URL, KARAOKE_TOKEN, BOX_URL, TENANT_SLUG, POLL_MS } = process.env;
  if (!CLOUD_URL || !KARAOKE_TOKEN || !BOX_URL) { console.error("Set CLOUD_URL, KARAOKE_TOKEN and BOX_URL (see the top of this file)."); process.exit(1); }
  const bridge = createBridge({ cloudUrl: CLOUD_URL, token: KARAOKE_TOKEN, boxUrl: BOX_URL, tenantSlug: TENANT_SLUG || "" });
  console.log(`Karaoke bridge: ${BOX_URL} <-> ${CLOUD_URL}`);
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const LINK_EVERY_MS = 6 * 3600 * 1000;
  void bridge.loadCatalog().then(async () => { for (;;) { try { await bridge.linkLibrary(); } catch (error) { console.log(`library link waiting: ${error.message}`); } await wait(LINK_EVERY_MS); } });
  const playLoop = async () => { for (;;) { try { await bridge.tick(); } catch (error) { console.log(`waiting: ${error.message}`); } await wait(Number(POLL_MS) || DEFAULT_POLL_MS); } };
  const searchLoop = async () => { for (;;) { try { await bridge.serveSearches(); } catch (error) { console.log(`search helper waiting: ${error.message}`); await wait(RETRY_AFTER_ERROR_MS); } } };
  await Promise.all([playLoop(), searchLoop()]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
