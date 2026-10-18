// Karaoke bridge: runs on a PC at the venue (Node 18+, no packages) and joins our song queue to the karaoke box on the venue Wi-Fi
// (the box's own "phone song ordering" page, e.g. http://192.168.100.4:8084/demo/). Our app keeps the fair queue; this program
//   - takes the song that is "on now" in the app, finds it in the box's song list and orders it on the box (CommandServlet Add1),
//   - waits until the box is idle again (nothing playing or waiting) and then tells the app the song ended (POST /api/karaoke/next),
//   - cuts the song on the box (Skip) when the app skipped or cancelled it.
// It only adds a song when the box is idle, so songs ordered by hand on the box are never mixed up with ours.
//
//   CLOUD_URL=https://rebornwave.group KARAOKE_TOKEN=xxxx BOX_URL=http://192.168.100.4:8084/demo node venue/karaoke-bridge.mjs
// Optional: TENANT_SLUG (a company on the shared host), POLL_MS (default 3000). BOX_URL can be left out: the box is found on the network by itself
// (and remembered in karaoke-box.json); the setup file from Admin > Requests > Karaoke system sets everything up for a new PC.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_POLL_MS = 3000;
const BOX_TIMEOUT_MS = 8000;
const CLOUD_TIMEOUT_MS = 10000;
const STATE_EVERY_MS = 10000;
const NOT_STARTED_MS = 25000; // the box took a song but never showed it as busy: give up on it
const PLAYER_CALLBACK = "cb";
const JOB_POLL_TIMEOUT_MS = 30000; // the app holds the request up to 20 s
const RETRY_AFTER_ERROR_MS = 3000;
const SEARCH_PAGES = 3;          // pages (15 songs each) read per search text for a member's search
const FIND_PAGES = 40;           // pages read when looking for the one requested song by its initials
const BOX_PAGE_SIZE = 15;
const PHOTO_PARALLEL = 8;        // singer photos fetched side by side
const CATALOG_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "karaoke-catalog.json"); // the box's whole song list, kept next to the program
const SINGERS_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "karaoke-singers.json"); // the singers (name + photo file), kept next to the program
const CATALOG_MAX_AGE_MS = 24 * 3600 * 1000;
const SINGERS_PAGE = 24;
const SINGER_SONGS_PAGE = 30;
const NO_PHOTO = "singer_photo.png";
const PHOTO_FILE = /^[A-Za-z0-9_.-]{1,60}\.(jpg|jpeg|png)$/i;
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

// The box writes "<the title in pinyin>  <singer>, <singer>" into the singer field: the singers are what follows the double space.
export function singerNames(sINGER) {
  const parts = String(sINGER || "").split(/\s{2,}/);
  return (parts.length > 1 ? parts.slice(1).join(" ") : parts[0]).split(/[,\uff0c\u3001]/).map((x) => x.trim()).filter(Boolean);
}
const keepBrackets = (value) => String(value || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

// The song the box really has for a requested title and singer: the same title (a bracket like (T.I) is ignored) and, when the singer is known, that singer.
// Never a partial match: a wrong song is worse than none. Songs that are on the box itself come before cloud ones.
export function exactSong(results, title, artist) {
  const wantTitle = plain(title);
  const wantArtist = keepBrackets(artist);
  const matches = results.filter((x) => plain(x.sONGNAME) === wantTitle && (!wantArtist || singerNames(x.sINGER).some((name) => { const got = keepBrackets(name); return got && (got.includes(wantArtist) || wantArtist.includes(got)); })));
  return matches.sort((a, b) => Number(a.cLOUD) - Number(b.cLOUD))[0] || null;
}

// A song of the kept list with its title and singer already simplified for searching.
// "Hebe(田馥甄)" is the singer 田馥甄 in the singers list: the name inside the brackets is the key when there is one.
const singerKey = (token) => { const m = /^(.*?)[(（]([^)）]+)[)）]\s*$/.exec(token); return m ? m[2].trim() : token; };
function indexSong(song) { const names = singerNames(song.sINGER); return { ...song, pt: plain(song.sONGNAME), ps: plain(song.sINGER), names, keys: names.map(singerKey) }; }

export function createBridge({ cloudUrl, token, boxUrl, tenantSlug = "", fetchImpl = fetch, log = console.log, now = () => Date.now(), catalog: givenCatalog = null, catalogFile = CATALOG_FILE, singers: givenSingers = null, singersFile = SINGERS_FILE }) {
  const box = boxUrl.replace(/\/+$/, "");
  const cloud = cloudUrl.replace(/\/+$/, "");
  let sent = null; // { id, code, at, seenBusy, repeatDone } the app's song that is on the box now
  // The box only has a toggle between the singer's own voice (original / analog) and accompaniment, and cannot tell us which is on: we remember what we last set (it starts as accompaniment).
  let boxVocal = "karaoke";
  let lastStateAt = 0, lastStateCount = -1;
  // The box's whole song list (about 200,000 songs, read once and kept): the box's own search misses many Chinese songs, ours does not.
  let catalog = givenCatalog ? givenCatalog.map(indexSong) : null;
  // The singers of the box (name, photo file, songs in the list): the app shows them as a gallery, most songs first.
  let singers = givenSingers ? givenSingers.map((x) => ({ ...x, pn: plain(x.name), pp: plain(x.pinyin), pq: plain(x.qt_name) })) : null;
  let photoOf = new Map();
  let popular = [];
  const buildSingerIndex = () => {
    if (!singers || !catalog) return;
    photoOf = new Map(singers.filter((x) => x.picture && x.picture !== NO_PHOTO).map((x) => [x.name, x.picture]));
    const counts = new Map();
    for (const song of catalog) for (const key of song.keys) counts.set(key, (counts.get(key) || 0) + 1);
    for (const x of singers) x.songs = counts.get(x.name) || 0;
    popular = singers.filter((x) => x.songs > 0).sort((a, b) => b.songs - a.songs || a.name.localeCompare(b.name));
  };
  buildSingerIndex();
  const photoFor = (song) => { for (const key of song.keys) { const file = photoOf.get(key); if (file) return file; } return ""; };
  const songView = (song) => ({ code: song.sONGBM, title: song.sONGNAME, artist: song.names.join(", ") || song.sINGER, photo: photoFor(song), cloud: !!song.cLOUD });

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
  async function loadAll() { await loadCatalog(); await loadSingers(); buildSingerIndex(); }
  async function loadSingers() {
    try {
      if (fs.existsSync(singersFile) && Date.now() - fs.statSync(singersFile).mtimeMs < CATALOG_MAX_AGE_MS) {
        singers = JSON.parse(fs.readFileSync(singersFile, "utf8")).map((x) => ({ ...x, pn: plain(x.name), pp: plain(x.pinyin), pq: plain(x.qt_name) }));
        buildSingerIndex();
        log(`singers loaded: ${singers.length}`);
        return;
      }
      const ask = (page) => boxCall("SingerServlet", { singer: "", singerType: "", sortType: "", page: String(page) });
      const lastPage = Number((await ask(1)).maxPage) || 1;
      log(`reading the box's singers: ${lastPage} pages`);
      const pages = new Array(lastPage);
      let next = 1;
      const worker = async () => {
        while (next <= lastPage) {
          const page = next++;
          for (let attempt = 1; attempt <= CRAWL_RETRIES; attempt++) {
            try { pages[page - 1] = JSON.parse((await ask(page)).singerList || "[]"); break; } catch { if (attempt === CRAWL_RETRIES) pages[page - 1] = []; }
          }
        }
      };
      await Promise.all(Array.from({ length: CRAWL_WORKERS }, worker));
      const raw = pages.flat().map((x) => ({ name: x.name, picture: x.picture, pinyin: x.pinyin || "", qt_name: x.qt_name || "" }));
      fs.writeFileSync(singersFile, JSON.stringify(raw));
      singers = raw.map((x) => ({ ...x, pn: plain(x.name), pp: plain(x.pinyin), pq: plain(x.qt_name) }));
      buildSingerIndex();
      log(`singers ready: ${singers.length}`);
    } catch (error) { log(`singers not read yet: ${error.message}`); }
  }
  const findCode = async (song) => {
    if (song.karaokeCode) return song.karaokeCode;
    if (catalog) { const match = exactSong(searchLocal(song.title), song.title, song.artist); if (match) return match.sONGBM; }
    const exact = (all) => exactSong(all, song.title, song.artist);
    for (const text of song.boxQueries?.length ? song.boxQueries : [song.title]) {
      const match = exact(await searchBox(text, text === song.title ? 1 : FIND_PAGES, (all) => !!exact(all)));
      if (match) return match.sONGBM;
    }
    return null;
  };
  // The songs waiting on the box itself, so staff and members can see them next to our queue.
  async function reportBoxState(count) {
    lastStateAt = now(); lastStateCount = count;
    try {
      const list = count > 0 ? JSON.parse((await boxCall("PlaylistServlet", { onSelectPage: "true", click: "true", type: "1" })).songList || "[]") : [];
      await cloudCall("POST", "/api/karaoke/box-state", { songs: list.map((x) => ({ title: x.sONGNAME, artist: singerNames(x.sINGER).join(", ") })) });
    } catch (error) { log(`box list not sent: ${error.message}`); }
  }
  const finish = (finishedId, skip) => cloudCall("POST", "/api/karaoke/next", { finishedId, ...(skip ? { skip: true } : {}) });

  // One round: look at the app's queue and the box, and move whichever side is behind.
  async function tick() {
    // Buttons the admin pressed in the app (volume, mute, pause, voice): press them on the box.
    try {
      const { commands } = await cloudCall("GET", "/api/karaoke/controls");
      for (const cmd of commands || []) {
        await boxCall("CommandServlet", { cmd, cmdValue: "" });
        if (cmd === "MuOr") boxVocal = boxVocal === "original" ? "karaoke" : "original"; // the box's voice button flipped: keep our idea of it right
        log(`admin pressed ${cmd}`);
      }
    } catch (error) { log(`controls not read: ${error.message}`); }
    const board = await cloudCall("GET", "/api/karaoke/queue");
    const current = board.nowPlaying;
    const count = await boxCount();
    if (now() - lastStateAt > STATE_EVERY_MS || count !== lastStateCount) await reportBoxState(count);

    if (sent) {
      if (!current || current.id !== sent.id) { // skipped or cancelled in the app
        if (count > 0) await boxCall("CommandServlet", { cmd: "Skip", cmdValue: "" });
        log(`song ${sent.id} left the app's queue: ${count > 0 ? "cut on the box" : "box already idle"}`);
        sent = null;
        return "cut";
      }
      if ((current.repeat || 0) > sent.repeatDone) { // the singer pressed Repeat: play it again
        await boxCall("CommandServlet", { cmd: "Reset", cmdValue: "" });
        sent.repeatDone = current.repeat;
        sent.seenBusy = true;
        log(`song ${sent.id} played again`);
        return "repeated";
      }
      const wantVoice = current.vocal === "original" ? "original" : "karaoke";
      if (wantVoice !== boxVocal) { // the singer switched the original voice on / off while the song plays
        await boxCall("CommandServlet", { cmd: "MuOr", cmdValue: "" });
        boxVocal = wantVoice;
        log(`singer's voice ${wantVoice === "original" ? "on" : "off"} while "${current.title}" plays`);
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
    const wantVocal = current.vocal === "original" ? "original" : "karaoke";
    if (wantVocal !== boxVocal) { // the singer wants the original voice on (or off): the box's own toggle
      await boxCall("CommandServlet", { cmd: "MuOr", cmdValue: "" });
      boxVocal = wantVocal;
      log(`singer's voice ${wantVocal === "original" ? "on" : "off"} for "${current.title}"`);
    }
    await boxCall("CommandServlet", { cmd: "Add1", cmdValue: code });
    sent = { id: current.id, code, at: now(), seenBusy: false, repeatDone: current.repeat || 0 };
    log(`ordered "${current.title}" (${code}) on the box`);
    return "ordered";
  }

  // The gallery of singers: search by name / pinyin / English name, otherwise the ones with the most songs first.
  const singersPage = (q, page) => {
    if (!singers || !catalog) return { singers: [], maxPage: 1, loading: true };
    const want = plain(q);
    const list = want ? popular.filter((x) => x.pn.includes(want) || x.pp.includes(want) || x.pq.includes(want)) : popular;
    const from = (Math.max(1, Number(page) || 1) - 1) * SINGERS_PAGE;
    return { singers: list.slice(from, from + SINGERS_PAGE).map((x) => ({ name: x.name, pinyin: x.pinyin, photo: x.picture === NO_PHOTO ? "" : x.picture, songs: x.songs })), maxPage: Math.max(1, Math.ceil(list.length / SINGERS_PAGE)) };
  };
  const songsOfSinger = (name, page) => {
    if (!catalog) return { songs: [], maxPage: 1, loading: true };
    const list = catalog.filter((x) => x.keys.includes(name)).sort((a, b) => a.sONGNAME.localeCompare(b.sONGNAME));
    const from = (Math.max(1, Number(page) || 1) - 1) * SINGER_SONGS_PAGE;
    return { songs: list.slice(from, from + SINGER_SONGS_PAGE).map(songView), maxPage: Math.max(1, Math.ceil(list.length / SINGER_SONGS_PAGE)) };
  };
  const fetchPhoto = async (file) => {
    if (!PHOTO_FILE.test(String(file || ""))) return { data: "", type: "" };
    const res = await fetchImpl(`${box}/singer/${file}`, { signal: AbortSignal.timeout(BOX_TIMEOUT_MS) });
    if (!res.ok) return { data: "", type: "" };
    return { data: Buffer.from(await res.arrayBuffer()).toString("base64"), type: res.headers.get("content-type") || "image/jpeg" };
  };
  // A member's search: from the kept list when it is ready, else by asking the box (the text and, for Chinese, its pinyin initials).
  const searchAnswer = async (job) => {
    if (catalog) return { songs: searchLocal(job.q).map(songView) };
    const seen = new Set();
    const songs = [];
    for (const text of job.queries?.length ? job.queries : [job.q]) {
      for (const x of await searchBox(text, SEARCH_PAGES)) {
        if (seen.has(x.sONGBM) || (hasChinese(job.q) && !plain(x.sONGNAME).includes(plain(job.q)) && !plain(x.sINGER).includes(plain(job.q)))) continue;
        seen.add(x.sONGBM);
        songs.push(songView(indexSong(x)));
      }
    }
    return { songs };
  };

  // One round of the helper: ask the app for what members asked for (the request is held open up to 20 s), answer each from the kept lists or the box.
  async function serveSearches() {
    const res = await fetchImpl(`${cloud}/api/karaoke/jobs`, { signal: AbortSignal.timeout(JOB_POLL_TIMEOUT_MS), headers: { "x-karaoke-token": token, ...(tenantSlug ? { "x-tenant-slug": tenantSlug } : {}) } });
    if (!res.ok) throw new Error(`/api/karaoke/jobs: ${res.status}`);
    const { jobs = [] } = await res.json();
    // Pages and searches first, then the photos side by side: a page of singers asks for dozens of photos, and one after the other they kept the next page waiting until it timed out.
    const answerJob = async (job) => {
      const kind = job.kind || "search";
      const answer = kind === "singers" ? singersPage(job.q, job.page) : kind === "singer" ? songsOfSinger(job.name, job.page) : kind === "photo" ? await fetchPhoto(job.file) : await searchAnswer(job);
      await cloudCall("POST", `/api/karaoke/jobs/${job.id}`, answer);
      if (kind !== "photo") log(`${kind} "${job.q || job.name || ""}": answered`);
    };
    for (const job of jobs.filter((x) => x.kind !== "photo")) await answerJob(job);
    const photos = jobs.filter((x) => x.kind === "photo");
    for (let i = 0; i < photos.length; i += PHOTO_PARALLEL) await Promise.all(photos.slice(i, i + PHOTO_PARALLEL).map((job) => answerJob(job).catch((e) => log(`photo: ${e.message}`))));
    return jobs.length;
  }

  // Links the app's own song library to the box: every library song the box has gets its number on the box, so members only browse and request playable songs.
  async function linkLibrary() {
    if (!catalog) return 0;
    const library = await cloudCall("GET", "/api/karaoke/library");
    const byCode = new Map(catalog.map((x) => [String(x.sONGBM), x]));
    const links = [];
    let unlinked = 0;
    for (const song of library) {
      const match = exactSong(searchLocal(song.title), song.title, song.artist);
      if (match) { if (String(match.sONGBM) !== String(song.code || "")) links.push({ id: song.id, code: match.sONGBM }); continue; }
      const old = song.code ? byCode.get(String(song.code)) : null;
      if (song.code && (!old || plain(old.sONGNAME) !== plain(song.title))) { links.push({ id: song.id, code: null }); unlinked++; } // a link to a different song: off
    }
    if (links.length) await cloudCall("POST", "/api/karaoke/link", { links });
    log(`library: ${links.length - unlinked} linked, ${unlinked} wrong links taken off (of ${library.length} songs)`);
    return links.length;
  }

  return { tick, serveSearches, loadCatalog, loadAll, linkLibrary, singersPage, songsOfSinger, searchLocal, catalogSize: () => (catalog ? catalog.length : 0) };
}

const BOX_PORT = 8084;
const BOX_PATH = "demo";
const FIND_TIMEOUT_MS = 900;
const FIND_BATCH = 64;
const BOX_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "karaoke-box.json"); // the box found last time, kept next to the program

/** Does a karaoke box answer at this address? (its song search replies with a song list) */
export async function isBox(boxUrl, fetchImpl = fetch) {
  try {
    const query = new URLSearchParams({ songName: "a", page: "1", jsonpCallback: PLAYER_CALLBACK });
    const res = await fetchImpl(`${boxUrl}/SearchServlet?${query}`, { signal: AbortSignal.timeout(FIND_TIMEOUT_MS) });
    return /songList/.test(await res.text());
  } catch { return false; }
}

/** Looks for the box on this PC's own networks (every address of each /24, port 8084) and returns its address, or null. */
export async function findBox({ fetchImpl = fetch, interfaces = os.networkInterfaces(), log = () => {} } = {}) {
  const hosts = [];
  for (const list of Object.values(interfaces)) {
    for (const nic of list || []) {
      if (nic.family !== "IPv4" || nic.internal) continue;
      const [a, b, c] = nic.address.split(".");
      for (let host = 1; host <= 254; host++) { const ip = `${a}.${b}.${c}.${host}`; if (ip !== nic.address && !hosts.includes(ip)) hosts.push(ip); }
    }
  }
  log(`looking for the karaoke box among ${hosts.length} addresses ...`);
  for (let i = 0; i < hosts.length; i += FIND_BATCH) {
    const batch = hosts.slice(i, i + FIND_BATCH);
    const found = await Promise.all(batch.map(async (ip) => { const url = `http://${ip}:${BOX_PORT}/${BOX_PATH}`; return (await isBox(url, fetchImpl)) ? url : null; }));
    const hit = found.find(Boolean);
    if (hit) return hit;
  }
  return null;
}

// The box address: the one given, else the one found last time, else look for it on the network.
async function boxAddress(given) {
  if (given) return given;
  try { const saved = JSON.parse(fs.readFileSync(BOX_FILE, "utf8")).boxUrl; if (saved && await isBox(saved)) return saved; } catch { /* nothing saved yet */ }
  const found = await findBox({ log: console.log });
  if (found) { try { fs.writeFileSync(BOX_FILE, JSON.stringify({ boxUrl: found })); } catch { /* read-only folder: it is found again next time */ } }
  return found;
}

async function main() {
  const { CLOUD_URL, KARAOKE_TOKEN, BOX_URL, TENANT_SLUG, POLL_MS } = process.env;
  if (!CLOUD_URL || !KARAOKE_TOKEN) { console.error("Set CLOUD_URL and KARAOKE_TOKEN (the setup file from Admin > Requests > Karaoke system does it for you)."); process.exit(1); }
  const boxUrl = await boxAddress(BOX_URL);
  if (!boxUrl) { console.error("Could not find the karaoke box on this network. Check that this PC is on the same Wi-Fi / cable as the box, or set BOX_URL (for example http://192.168.1.20:8084/demo)."); process.exit(1); }
  const bridge = createBridge({ cloudUrl: CLOUD_URL, token: KARAOKE_TOKEN, boxUrl, tenantSlug: TENANT_SLUG || "" });
  console.log(`Karaoke bridge: ${boxUrl} <-> ${CLOUD_URL}`);
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const LINK_EVERY_MS = 6 * 3600 * 1000;
  void bridge.loadAll().then(async () => { for (;;) { try { await bridge.linkLibrary(); } catch (error) { console.log(`library link waiting: ${error.message}`); } await wait(LINK_EVERY_MS); } });
  const playLoop = async () => { for (;;) { try { await bridge.tick(); } catch (error) { console.log(`waiting: ${error.message}`); } await wait(Number(POLL_MS) || DEFAULT_POLL_MS); } };
  const searchLoop = async () => { for (;;) { try { await bridge.serveSearches(); } catch (error) { console.log(`search helper waiting: ${error.message}`); await wait(RETRY_AFTER_ERROR_MS); } } };
  await Promise.all([playLoop(), searchLoop()]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
