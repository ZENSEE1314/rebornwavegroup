// Windows 7 can only run Node.js 12, which has no fetch() and no AbortSignal.timeout(). This gives the karaoke bridge the little it uses of both.
// Written in plain ES2018 on purpose: it is put in front of the bundle as it is (not rewritten by the build).
(function () {
  if (typeof AbortSignal === "undefined") globalThis.AbortSignal = function AbortSignal() {};
  if (typeof AbortSignal.timeout !== "function") AbortSignal.timeout = function (ms) { return { timeoutMs: ms }; };
  if (typeof globalThis.fetch === "function") return;

  var http = require("http");
  var https = require("https");
  var MAX_REDIRECTS = 5;

  function request(target, options, redirects) {
    return new Promise(function (resolve, reject) {
      var url = new URL(target);
      var headers = Object.assign({}, options.headers || {});
      var body = options.body === undefined || options.body === null ? null : Buffer.from(String(options.body));
      if (body && !headers["content-length"]) headers["content-length"] = body.length;
      var timer = null;
      var req = (url.protocol === "https:" ? https : http).request(url, { method: options.method || "GET", headers: headers }, function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < MAX_REDIRECTS) {
          res.resume();
          clearTimeout(timer);
          resolve(request(new URL(res.headers.location, url).href, options, redirects + 1));
          return;
        }
        var chunks = [];
        res.on("data", function (chunk) { chunks.push(chunk); });
        res.on("error", function (error) { clearTimeout(timer); reject(error); });
        res.on("end", function () {
          clearTimeout(timer);
          var data = Buffer.concat(chunks);
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            headers: { get: function (name) { var value = res.headers[String(name).toLowerCase()]; return value === undefined ? null : String(value); } },
            text: function () { return Promise.resolve(data.toString("utf8")); },
            json: function () { return new Promise(function (done, fail) { try { done(JSON.parse(data.toString("utf8"))); } catch (error) { fail(error); } }); },
            arrayBuffer: function () { return Promise.resolve(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)); },
          });
        });
      });
      req.on("error", function (error) { clearTimeout(timer); reject(error); });
      var timeoutMs = options.signal && options.signal.timeoutMs;
      if (timeoutMs) timer = setTimeout(function () { req.destroy(new Error("The operation timed out")); }, timeoutMs);
      if (body) req.write(body);
      req.end();
    });
  }

  globalThis.fetch = function (target, options) { return request(String(target), options || {}, 0); };
})();

const __importMetaUrl = require("url").pathToFileURL(__filename).href;
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// venue/karaoke-bridge.mjs
var karaoke_bridge_exports = {};
__export(karaoke_bridge_exports, {
  createBridge: () => createBridge,
  exactSong: () => exactSong,
  findBox: () => findBox,
  initialsOf: () => initialsOf,
  isBox: () => isBox,
  parseJsonp: () => parseJsonp,
  pickSong: () => pickSong,
  singerNames: () => singerNames
});
module.exports = __toCommonJS(karaoke_bridge_exports);
var import_node_fs = __toESM(require("fs"), 1);
var import_node_os = __toESM(require("os"), 1);
var import_node_path = __toESM(require("path"), 1);
var import_node_url = require("url");
var DEFAULT_POLL_MS = 1500;
var BOX_TIMEOUT_MS = 8e3;
var CONTROL_EVERY_MS = 700;
var CLOUD_TIMEOUT_MS = 2e4;
var CLOUD_TRIES = 3;
var CLOUD_RETRY_WAIT_MS = 400;
var STATE_EVERY_MS = 1e4;
var NOT_STARTED_MS = 25e3;
var PLAYER_CALLBACK = "cb";
var MIN_LOOKAHEAD = 2;
var MAX_LOOKAHEAD = 30;
var JOB_POLL_TIMEOUT_MS = 3e4;
var RETRY_AFTER_ERROR_MS = 3e3;
var SEARCH_PAGES = 3;
var FIND_PAGES = 40;
var BOX_PAGE_SIZE = 15;
var PHOTO_PARALLEL = 8;
var CATALOG_FILE = import_node_path.default.join(import_node_path.default.dirname((0, import_node_url.fileURLToPath)(__importMetaUrl)), "karaoke-catalog.json");
var SINGERS_FILE = import_node_path.default.join(import_node_path.default.dirname((0, import_node_url.fileURLToPath)(__importMetaUrl)), "karaoke-singers.json");
var CATALOG_MAX_AGE_MS = 7 * 24 * 3600 * 1e3;
var SINGERS_PAGE = 24;
var SINGER_SONGS_PAGE = 30;
var NO_PHOTO = "singer_photo.png";
var PHOTO_FILE = /^[A-Za-z0-9_.-]{1,60}\.(jpg|jpeg|png)$/i;
var CRAWL_WORKERS = 4;
var CRAWL_RETRIES = 3;
var LOCAL_RESULT_LIMIT = 40;
var hasChinese = (text) => /[\u3400-\u9fff]/.test(String(text || ""));
function parseJsonp(text) {
  const start = text.indexOf("(");
  const end = text.lastIndexOf(")");
  if (start < 0 || end < start) throw new Error("not a JSONP answer");
  return JSON.parse(text.slice(start + 1, end));
}
var plain = (value) => String(value || "").toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
function pickSong(results, title, artist) {
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
    if (score > bestScore) {
      best = song;
      bestScore = score;
    }
  }
  return best;
}
function singerNames(sINGER) {
  const parts = String(sINGER || "").split(/\s{2,}/);
  return (parts.length > 1 ? parts.slice(1).join(" ") : parts[0]).split(/[,\uff0c\u3001]/).map((x) => x.trim()).filter(Boolean);
}
var keepBrackets = (value) => String(value || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
function exactSong(results, title, artist) {
  const wantTitle = plain(title);
  const wantArtist = keepBrackets(artist);
  const matches = results.filter((x) => plain(x.sONGNAME) === wantTitle && (!wantArtist || singerNames(x.sINGER).some((name) => {
    const got = keepBrackets(name);
    return got && (got.includes(wantArtist) || wantArtist.includes(got));
  })));
  return matches.sort((a, b) => Number(a.cLOUD) - Number(b.cLOUD))[0] || null;
}
var singerKey = (token) => {
  const m = /^(.*?)[(（]([^)）]+)[)）]\s*$/.exec(token);
  return m ? m[2].trim() : token;
};
function initialsOf(words) {
  return String(words || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).map((word) => word[0]).join("");
}
function titleInitials(song) {
  const parts = String(song.sINGER || "").split(/\s{2,}/);
  if (parts.length > 1) return initialsOf(parts[0]);
  return hasChinese(song.sONGNAME) ? "" : initialsOf(String(song.sONGNAME || "").replace(/\([^)]*\)/g, " "));
}
function indexSong(song) {
  const names = singerNames(song.sINGER);
  const keys = names.map(singerKey);
  return { ...song, pt: plain(song.sONGNAME), ps: plain(song.sINGER), pi: titleInitials(song), si: keys.filter((key) => !hasChinese(key)).map(initialsOf), names, keys };
}
function createBridge({ cloudUrl, token, boxUrl, tenantSlug = "", fetchImpl = fetch, log = console.log, now = () => Date.now(), catalog: givenCatalog = null, catalogFile = CATALOG_FILE, singers: givenSingers = null, singersFile = SINGERS_FILE, showCloud = true }) {
  const box = boxUrl.replace(/\/+$/, "");
  const cloud = cloudUrl.replace(/\/+$/, "");
  let sent = null;
  let ahead = [];
  const codeOfSong = /* @__PURE__ */ new Map();
  let boxVocal = "karaoke";
  let lastStateAt = 0, lastStateCount = -1;
  let catalog = givenCatalog ? givenCatalog.map(indexSong) : null;
  let singers = givenSingers ? givenSingers.map((x) => ({ ...x, pn: plain(x.name), pp: plain(x.pinyin), pq: plain(x.qt_name) })) : null;
  let photoOf = /* @__PURE__ */ new Map();
  let popular = [];
  const buildSingerIndex = () => {
    if (!singers || !catalog) return;
    photoOf = new Map(singers.filter((x) => x.picture && x.picture !== NO_PHOTO).map((x) => [x.name, x.picture]));
    const counts = /* @__PURE__ */ new Map();
    for (const song of catalog) for (const key of song.keys) counts.set(key, (counts.get(key) || 0) + 1);
    for (const x of singers) x.songs = counts.get(x.name) || 0;
    const singerInitials = new Map(singers.filter((x) => x.pinyin).map((x) => [x.name, initialsOf(x.pinyin)]));
    for (const song of catalog) song.si = song.keys.map((key) => singerInitials.get(key) || (hasChinese(key) ? "" : initialsOf(key))).filter(Boolean);
    popular = singers.filter((x) => x.songs > 0).sort((a, b) => b.songs - a.songs || a.name.localeCompare(b.name));
  };
  buildSingerIndex();
  const photoFor = (song) => {
    for (const key of song.keys) {
      const file = photoOf.get(key);
      if (file) return file;
    }
    return "";
  };
  const songView = (song) => ({ code: song.sONGBM, title: song.sONGNAME, artist: song.names.join(", ") || song.sINGER, photo: photoFor(song), cloud: !!song.cLOUD });
  const boxCall = async (servlet, params) => {
    const query = new URLSearchParams({ ...params, jsonpCallback: PLAYER_CALLBACK });
    const res = await fetchImpl(`${box}/${servlet}?${query}`, { signal: AbortSignal.timeout(BOX_TIMEOUT_MS) });
    return parseJsonp(await res.text());
  };
  const cloudCall = async (method, path2, body) => {
    for (let attempt = 1; ; attempt++) {
      try {
        const res = await fetchImpl(`${cloud}${path2}`, {
          method,
          signal: AbortSignal.timeout(CLOUD_TIMEOUT_MS),
          headers: { "content-type": "application/json", "x-karaoke-token": token, ...tenantSlug ? { "x-tenant-slug": tenantSlug } : {} },
          body: body ? JSON.stringify(body) : void 0
        });
        if (!res.ok) {
          const failure = new Error(`${path2}: ${res.status}`);
          failure.retry = res.status >= 500;
          throw failure;
        }
        return await res.json();
      } catch (error) {
        const isNetwork = error.retry === void 0;
        if (attempt >= CLOUD_TRIES || !(isNetwork || error.retry)) throw error;
        await new Promise((resolve) => setTimeout(resolve, CLOUD_RETRY_WAIT_MS));
      }
    }
  };
  const boxCount = async () => Number((await boxCall("PlaylistServlet", { onSelectPage: "false", click: "false", type: "1" })).number) || 0;
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
  const searchLocal = (text) => {
    const want = plain(text);
    if (!want || !catalog) return [];
    const isInitials = /^[a-z]{2,}$/.test(want);
    const scored = [];
    for (const song of catalog) {
      if (!showCloud && song.cLOUD) continue;
      const inTitle = song.pt.indexOf(want);
      const inSinger = song.ps.indexOf(want);
      const isTitleInitials = isInitials && song.pi.startsWith(want);
      const isSingerInitials = isInitials && (song.si || []).some((letters) => letters.startsWith(want));
      if (inTitle < 0 && inSinger < 0 && !isTitleInitials && !isSingerInitials) continue;
      const wordScore = inTitle < 0 && inSinger < 0 ? Infinity : song.pt === want ? 0 : inTitle === 0 ? 1 : inTitle > 0 ? 2 : 3;
      scored.push({ song, score: Math.min(wordScore, isTitleInitials ? song.pi === want ? 1.5 : 2.5 : Infinity, isSingerInitials ? 3.5 : Infinity) });
    }
    return scored.sort((a, b) => a.score - b.score || Number(a.song.cLOUD) - Number(b.song.cLOUD)).slice(0, LOCAL_RESULT_LIMIT).map((x) => x.song);
  };
  async function loadCatalog() {
    try {
      if (import_node_fs.default.existsSync(catalogFile) && Date.now() - import_node_fs.default.statSync(catalogFile).mtimeMs < CATALOG_MAX_AGE_MS) {
        catalog = JSON.parse(import_node_fs.default.readFileSync(catalogFile, "utf8")).map(indexSong);
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
            try {
              pages[page - 1] = JSON.parse((await boxCall("SearchServlet", { songName: "", songType: "", singer: "", lang: "", sortType: "", page: String(page) })).songList || "[]");
              break;
            } catch (error) {
              if (attempt === CRAWL_RETRIES) {
                pages[page - 1] = [];
                log(`page ${page} skipped: ${error.message}`);
              }
            }
          }
          if (++done % 2e3 === 0) log(`  ${done} / ${lastPage} pages`);
        }
      };
      await Promise.all(Array.from({ length: CRAWL_WORKERS }, worker));
      const raw = pages.flat().map((x) => ({ sONGBM: x.sONGBM, sONGNAME: x.sONGNAME, sINGER: x.sINGER, cLOUD: x.cLOUD }));
      import_node_fs.default.writeFileSync(catalogFile, JSON.stringify(raw));
      catalog = raw.map(indexSong);
      log(`song list ready: ${catalog.length} songs`);
    } catch (error) {
      log(`song list not read yet: ${error.message}`);
    }
  }
  async function loadAll() {
    await loadCatalog();
    await loadSingers();
    buildSingerIndex();
  }
  async function loadSingers() {
    try {
      if (import_node_fs.default.existsSync(singersFile) && Date.now() - import_node_fs.default.statSync(singersFile).mtimeMs < CATALOG_MAX_AGE_MS) {
        singers = JSON.parse(import_node_fs.default.readFileSync(singersFile, "utf8")).map((x) => ({ ...x, pn: plain(x.name), pp: plain(x.pinyin), pq: plain(x.qt_name) }));
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
            try {
              pages[page - 1] = JSON.parse((await ask(page)).singerList || "[]");
              break;
            } catch {
              if (attempt === CRAWL_RETRIES) pages[page - 1] = [];
            }
          }
        }
      };
      await Promise.all(Array.from({ length: CRAWL_WORKERS }, worker));
      const raw = pages.flat().map((x) => ({ name: x.name, picture: x.picture, pinyin: x.pinyin || "", qt_name: x.qt_name || "" }));
      import_node_fs.default.writeFileSync(singersFile, JSON.stringify(raw));
      singers = raw.map((x) => ({ ...x, pn: plain(x.name), pp: plain(x.pinyin), pq: plain(x.qt_name) }));
      buildSingerIndex();
      log(`singers ready: ${singers.length}`);
    } catch (error) {
      log(`singers not read yet: ${error.message}`);
    }
  }
  const findCode = async (song) => {
    var _a;
    if (song.karaokeCode) return song.karaokeCode;
    if (catalog) {
      const match = exactSong(searchLocal(song.title), song.title, song.artist);
      if (match) return match.sONGBM;
    }
    const exact = (all) => exactSong(all, song.title, song.artist);
    for (const text of ((_a = song.boxQueries) == null ? void 0 : _a.length) ? song.boxQueries : [song.title]) {
      const match = exact(await searchBox(text, text === song.title ? 1 : FIND_PAGES, (all) => !!exact(all)));
      if (match) return match.sONGBM;
    }
    return null;
  };
  const boxPlaylist = async () => JSON.parse((await boxCall("PlaylistServlet", { onSelectPage: "true", click: "true", type: "1" })).songList || "[]");
  async function reportBoxState(count, known = null) {
    lastStateAt = now();
    lastStateCount = count;
    try {
      const list = known != null ? known : count > 0 ? await boxPlaylist() : [];
      const ours = new Set(ahead.map((e) => e.xH).filter(Boolean));
      const own = sent ? list.findIndex((x) => String(x.sONGBM) === String(sent.code)) : -1;
      await cloudCall("POST", "/api/karaoke/box-state", { songs: list.filter((x, i) => {
        var _a;
        return i !== own && !ours.has(String((_a = x.xH) != null ? _a : ""));
      }).map((x) => {
        var _a;
        return { id: String((_a = x.xH) != null ? _a : ""), title: x.sONGNAME, artist: singerNames(x.sINGER).join(", ") };
      }) });
    } catch (error) {
      log(`box list not sent: ${error.message}`);
    }
  }
  const finish = (finishedId, skip) => cloudCall("POST", "/api/karaoke/next", { finishedId, ...skip ? { skip: true } : {} });
  async function pressControls() {
    try {
      const { commands } = await cloudCall("GET", "/api/karaoke/controls");
      for (const press of commands || []) {
        const [cmd, value = ""] = String(press).split(":");
        await boxCall("CommandServlet", { cmd, cmdValue: value });
        if (cmd === "MuOr") boxVocal = boxVocal === "original" ? "karaoke" : "original";
        log(`admin pressed ${cmd}${value ? ` ${value}` : ""}`);
      }
    } catch (error) {
      log(`controls not read: ${error.message}`);
    }
  }
  const boxDelete = (entry, isPlaying) => boxCall("CommandServlet", isPlaying ? { cmd: "Skip", cmdValue: "" } : { cmd: "Del1", cmdValue: String(entry.xH) });
  const codeFor = async (song) => {
    if (song.karaokeCode) return song.karaokeCode;
    if (codeOfSong.has(song.id)) return codeOfSong.get(song.id);
    const code = await findCode(song);
    codeOfSong.set(song.id, code);
    return code;
  };
  async function loadAhead(board, wanted) {
    const desired = [board.nowPlaying, ...board.queue || []].slice(0, wanted);
    let same = 1;
    while (same < ahead.length && same < desired.length && ahead[same].id === desired[same].id) same++;
    const wrong = ahead.slice(same);
    if (wrong.some((e) => !e.xH)) return;
    for (const entry of wrong) {
      await boxDelete(entry, false);
      log(`song ${entry.id} taken off the box: it waits for its turn`);
    }
    ahead = ahead.slice(0, same);
    for (const song of desired.slice(ahead.length)) {
      const code = await codeFor(song);
      if (!code) break;
      await boxCall("CommandServlet", { cmd: "Add1", cmdValue: code });
      ahead.push({ id: song.id, code, xH: null, at: now(), repeatDone: song.repeat || 0 });
      log(`loaded "${song.title}" (${code}) on the box`);
    }
  }
  async function tickAhead(board) {
    var _a;
    const list = await boxPlaylist();
    const count = list.length;
    if (now() - lastStateAt > STATE_EVERY_MS || count !== lastStateCount) await reportBoxState(count, list);
    const current = board.nowPlaying;
    const taken = new Set(ahead.map((e) => e.xH).filter(Boolean));
    for (const entry of ahead) {
      if (entry.xH) continue;
      const hit = list.find((x) => String(x.sONGBM) === String(entry.code) && !taken.has(String(x.xH)));
      if (hit) {
        entry.xH = String(hit.xH);
        taken.add(entry.xH);
      }
    }
    const onBox = new Set(list.map((x) => String(x.xH)));
    const first = ahead[0];
    const lostFirst = first && !first.xH && now() - first.at > NOT_STARTED_MS;
    const gone = ahead.filter((e) => e.xH && !onBox.has(e.xH) || !e.xH && now() - e.at > NOT_STARTED_MS);
    ahead = ahead.filter((e) => !gone.includes(e));
    if (first && gone.includes(first)) {
      await finish(first.id, !!lostFirst);
      log(lostFirst ? `song ${first.id} never started on the box: skipped` : `song ${first.id} finished on the box`);
      return lostFirst ? "lost" : "finished";
    }
    if (!current) {
      if (ahead.length) {
        await boxDelete(ahead[0], true);
        for (const entry of ahead.slice(1)) if (entry.xH) await boxDelete(entry, false);
        log(`song ${ahead[0].id} left the app's queue: cut on the box`);
        ahead = [];
        return "cut";
      }
      if (board.paused || !((_a = board.queue) == null ? void 0 : _a.length) || count > 0) return "idle";
      await cloudCall("POST", "/api/karaoke/next", {});
      log("started the first waiting song");
      return "started";
    }
    if (ahead.length && ahead[0].id !== current.id) {
      const at = ahead.findIndex((e) => e.id === current.id);
      const drop = at > 0 ? ahead.slice(0, at) : ahead;
      await boxDelete(drop[0], true);
      for (const entry of drop.slice(1)) if (entry.xH) await boxDelete(entry, false);
      ahead = at > 0 ? ahead.slice(at) : [];
      log("the box was playing another song than the app's: cut");
      return "cut";
    }
    if (!ahead.length) {
      if (count > 0) return "box busy";
      const code = await codeFor(current);
      if (!code) {
        await finish(current.id, true);
        log(`"${current.title}" is not in the box's song list: skipped`);
        return "not found";
      }
      const wantVocal = current.vocal === "original" ? "original" : "karaoke";
      if (wantVocal !== boxVocal) {
        await boxCall("CommandServlet", { cmd: "MuOr", cmdValue: "" });
        boxVocal = wantVocal;
        log(`singer's voice ${wantVocal === "original" ? "on" : "off"} for "${current.title}"`);
      }
      await boxCall("CommandServlet", { cmd: "Add1", cmdValue: code });
      ahead.push({ id: current.id, code, xH: null, at: now(), repeatDone: current.repeat || 0 });
      log(`ordered "${current.title}" (${code}) on the box`);
    } else {
      if ((current.repeat || 0) > ahead[0].repeatDone) {
        await boxCall("CommandServlet", { cmd: "Reset", cmdValue: "" });
        ahead[0].repeatDone = current.repeat;
        log(`song ${current.id} played again`);
        return "repeated";
      }
      const wantVoice = current.vocal === "original" ? "original" : "karaoke";
      if (wantVoice !== boxVocal) {
        await boxCall("CommandServlet", { cmd: "MuOr", cmdValue: "" });
        boxVocal = wantVoice;
        log(`singer's voice ${wantVoice === "original" ? "on" : "off"} while "${current.title}" plays`);
      }
    }
    if (!board.paused) await loadAhead(board, Math.min(MAX_LOOKAHEAD, Number(board.lookahead) || MIN_LOOKAHEAD));
    return ahead.length > 1 ? "loaded ahead" : "playing";
  }
  async function leaveLookahead() {
    const [playing, ...waiting] = ahead;
    ahead = [];
    for (const entry of waiting) if (entry.xH) await boxDelete(entry, false);
    if (playing) sent = { id: playing.id, code: playing.code, at: now(), seenBusy: true, repeatDone: playing.repeatDone };
  }
  async function tick({ controls = true } = {}) {
    var _a;
    if (controls) await pressControls();
    const board = await cloudCall("GET", "/api/karaoke/queue");
    if (Number(board.lookahead) >= MIN_LOOKAHEAD) return tickAhead(board);
    if (ahead.length) await leaveLookahead();
    const count = await boxCount();
    const current = board.nowPlaying;
    if (now() - lastStateAt > STATE_EVERY_MS || count !== lastStateCount) await reportBoxState(count);
    if (sent) {
      if (!current || current.id !== sent.id) {
        if (count > 0) await boxCall("CommandServlet", { cmd: "Skip", cmdValue: "" });
        log(`song ${sent.id} left the app's queue: ${count > 0 ? "cut on the box" : "box already idle"}`);
        sent = null;
        return "cut";
      }
      if ((current.repeat || 0) > sent.repeatDone) {
        await boxCall("CommandServlet", { cmd: "Reset", cmdValue: "" });
        sent.repeatDone = current.repeat;
        sent.seenBusy = true;
        log(`song ${sent.id} played again`);
        return "repeated";
      }
      const wantVoice = current.vocal === "original" ? "original" : "karaoke";
      if (wantVoice !== boxVocal) {
        await boxCall("CommandServlet", { cmd: "MuOr", cmdValue: "" });
        boxVocal = wantVoice;
        log(`singer's voice ${wantVoice === "original" ? "on" : "off"} while "${current.title}" plays`);
      }
      if (count > 0) {
        sent.seenBusy = true;
        return "playing";
      }
      if (sent.seenBusy) {
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
    if (!current) {
      if (!((_a = board.queue) == null ? void 0 : _a.length) || count > 0) return "idle";
      await cloudCall("POST", "/api/karaoke/next", {});
      log("started the first waiting song");
      return "started";
    }
    if (count > 0) return "box busy";
    const code = await findCode(current);
    if (!code) {
      await finish(current.id, true);
      log(`"${current.title}" is not in the box's song list: skipped`);
      return "not found";
    }
    const wantVocal = current.vocal === "original" ? "original" : "karaoke";
    if (wantVocal !== boxVocal) {
      await boxCall("CommandServlet", { cmd: "MuOr", cmdValue: "" });
      boxVocal = wantVocal;
      log(`singer's voice ${wantVocal === "original" ? "on" : "off"} for "${current.title}"`);
    }
    await boxCall("CommandServlet", { cmd: "Add1", cmdValue: code });
    sent = { id: current.id, code, at: now(), seenBusy: false, repeatDone: current.repeat || 0 };
    log(`ordered "${current.title}" (${code}) on the box`);
    return "ordered";
  }
  const singersPage = (q, page) => {
    if (!singers || !catalog) return { singers: [], maxPage: 1, loading: true };
    const want = plain(q);
    const list = want ? popular.filter((x) => x.pn.includes(want) || x.pp.includes(want) || x.pq.includes(want)) : popular;
    const from = (Math.max(1, Number(page) || 1) - 1) * SINGERS_PAGE;
    return { singers: list.slice(from, from + SINGERS_PAGE).map((x) => ({ name: x.name, pinyin: x.pinyin, photo: x.picture === NO_PHOTO ? "" : x.picture, songs: x.songs })), maxPage: Math.max(1, Math.ceil(list.length / SINGERS_PAGE)) };
  };
  const songsOfSinger = (name, page) => {
    if (!catalog) return { songs: [], maxPage: 1, loading: true };
    const list = catalog.filter((x) => (showCloud || !x.cLOUD) && x.keys.includes(name)).sort((a, b) => a.sONGNAME.localeCompare(b.sONGNAME));
    const from = (Math.max(1, Number(page) || 1) - 1) * SINGER_SONGS_PAGE;
    return { songs: list.slice(from, from + SINGER_SONGS_PAGE).map(songView), maxPage: Math.max(1, Math.ceil(list.length / SINGER_SONGS_PAGE)) };
  };
  const fetchPhoto = async (file) => {
    if (!PHOTO_FILE.test(String(file || ""))) return { data: "", type: "" };
    const res = await fetchImpl(`${box}/singer/${file}`, { signal: AbortSignal.timeout(BOX_TIMEOUT_MS) });
    if (!res.ok) return { data: "", type: "" };
    return { data: Buffer.from(await res.arrayBuffer()).toString("base64"), type: res.headers.get("content-type") || "image/jpeg" };
  };
  const searchAnswer = async (job) => {
    var _a;
    if (catalog) return { songs: searchLocal(job.q).map(songView) };
    const seen = /* @__PURE__ */ new Set();
    const songs = [];
    for (const text of ((_a = job.queries) == null ? void 0 : _a.length) ? job.queries : [job.q]) {
      for (const x of await searchBox(text, SEARCH_PAGES)) {
        if (seen.has(x.sONGBM) || hasChinese(job.q) && !plain(x.sONGNAME).includes(plain(job.q)) && !plain(x.sINGER).includes(plain(job.q))) continue;
        seen.add(x.sONGBM);
        songs.push(songView(indexSong(x)));
      }
    }
    return { songs };
  };
  async function serveSearches() {
    var _a, _b, _c;
    const res = await fetchImpl(`${cloud}/api/karaoke/jobs`, { signal: AbortSignal.timeout(JOB_POLL_TIMEOUT_MS), headers: { "x-karaoke-token": token, ...tenantSlug ? { "x-tenant-slug": tenantSlug } : {} } });
    if (!res.ok) throw new Error(`/api/karaoke/jobs: ${res.status}`);
    const { jobs = [] } = await res.json();
    const answerOf = async (job) => {
      const kind = job.kind || "search";
      return kind === "singers" ? singersPage(job.q, job.page) : kind === "singer" ? songsOfSinger(job.name, job.page) : kind === "photo" ? await fetchPhoto(job.file) : await searchAnswer(job);
    };
    const answerJob = async (job) => {
      await cloudCall("POST", `/api/karaoke/jobs/${job.id}`, await answerOf(job));
      if (job.kind !== "photo") log(`${job.kind || "search"} "${job.q || job.name || ""}": answered`);
    };
    const sameQuestion = /* @__PURE__ */ new Map();
    for (const job of jobs.filter((x) => x.kind !== "photo")) {
      const key = JSON.stringify([job.kind || "search", (_a = job.q) != null ? _a : "", (_b = job.page) != null ? _b : 1, (_c = job.name) != null ? _c : ""]);
      sameQuestion.set(key, [...sameQuestion.get(key) || [], job]);
    }
    await Promise.all(Array.from(sameQuestion.values(), async (group) => {
      try {
        const answer = await answerOf(group[0]);
        await Promise.all(group.map(async (job) => {
          await cloudCall("POST", `/api/karaoke/jobs/${job.id}`, answer);
        }));
        log(`${group[0].kind || "search"} "${group[0].q || group[0].name || ""}": answered${group.length > 1 ? ` (${group.length} members)` : ""}`);
      } catch (error) {
        log(`${group[0].kind || "search"} "${group[0].q || group[0].name || ""}": not delivered (${error.message})`);
      }
    }));
    const photos = jobs.filter((x) => x.kind === "photo");
    for (let i = 0; i < photos.length; i += PHOTO_PARALLEL) await Promise.all(photos.slice(i, i + PHOTO_PARALLEL).map((job) => answerJob(job).catch((e) => log(`photo: ${e.message}`))));
    return jobs.length;
  }
  async function linkLibrary() {
    if (!catalog) return 0;
    const library = await cloudCall("GET", "/api/karaoke/library");
    const byCode = new Map(catalog.map((x) => [String(x.sONGBM), x]));
    const links = [];
    let unlinked = 0;
    for (const song of library) {
      const match = exactSong(searchLocal(song.title), song.title, song.artist);
      if (match) {
        if (String(match.sONGBM) !== String(song.code || "")) links.push({ id: song.id, code: match.sONGBM });
        continue;
      }
      const old = song.code ? byCode.get(String(song.code)) : null;
      if (song.code && (!old || plain(old.sONGNAME) !== plain(song.title))) {
        links.push({ id: song.id, code: null });
        unlinked++;
      }
    }
    if (links.length) await cloudCall("POST", "/api/karaoke/link", { links });
    log(`library: ${links.length - unlinked} linked, ${unlinked} wrong links taken off (of ${library.length} songs)`);
    return links.length;
  }
  return { tick, pressControls, serveSearches, loadCatalog, loadAll, linkLibrary, singersPage, songsOfSinger, searchLocal, catalogSize: () => catalog ? catalog.length : 0 };
}
var BOX_PORT = 8084;
var BOX_PATH = "demo";
var FIND_TIMEOUT_MS = 900;
var FIND_BATCH = 64;
var BOX_FILE = import_node_path.default.join(import_node_path.default.dirname((0, import_node_url.fileURLToPath)(__importMetaUrl)), "karaoke-box.json");
async function isBox(boxUrl, fetchImpl = fetch) {
  try {
    const query = new URLSearchParams({ songName: "a", page: "1", jsonpCallback: PLAYER_CALLBACK });
    const res = await fetchImpl(`${boxUrl}/SearchServlet?${query}`, { signal: AbortSignal.timeout(FIND_TIMEOUT_MS) });
    return /songList/.test(await res.text());
  } catch {
    return false;
  }
}
async function findBox({ fetchImpl = fetch, interfaces = import_node_os.default.networkInterfaces(), log = () => {
} } = {}) {
  const hosts = [];
  for (const list of Object.values(interfaces)) {
    for (const nic of list || []) {
      if (nic.family !== "IPv4" || nic.internal) continue;
      const [a, b, c] = nic.address.split(".");
      for (let host = 1; host <= 254; host++) {
        const ip = `${a}.${b}.${c}.${host}`;
        if (ip !== nic.address && !hosts.includes(ip)) hosts.push(ip);
      }
    }
  }
  log(`looking for the karaoke box among ${hosts.length} addresses ...`);
  for (let i = 0; i < hosts.length; i += FIND_BATCH) {
    const batch = hosts.slice(i, i + FIND_BATCH);
    const found = await Promise.all(batch.map(async (ip) => {
      const url = `http://${ip}:${BOX_PORT}/${BOX_PATH}`;
      return await isBox(url, fetchImpl) ? url : null;
    }));
    const hit = found.find(Boolean);
    if (hit) return hit;
  }
  return null;
}
async function boxAddress(given) {
  if (given) return given;
  try {
    const saved = JSON.parse(import_node_fs.default.readFileSync(BOX_FILE, "utf8")).boxUrl;
    if (saved && await isBox(saved)) return saved;
  } catch {
  }
  const found = await findBox({ log: console.log });
  if (found) {
    try {
      import_node_fs.default.writeFileSync(BOX_FILE, JSON.stringify({ boxUrl: found }));
    } catch {
    }
  }
  return found;
}
async function main() {
  const { CLOUD_URL, KARAOKE_TOKEN, BOX_URL, TENANT_SLUG, POLL_MS } = process.env;
  if (!CLOUD_URL || !KARAOKE_TOKEN) {
    console.error("Set CLOUD_URL and KARAOKE_TOKEN (the setup file from Admin > Requests > Karaoke system does it for you).");
    process.exit(1);
  }
  const boxUrl = await boxAddress(BOX_URL);
  if (!boxUrl) {
    console.error("Could not find the karaoke box on this network. Check that this PC is on the same Wi-Fi / cable as the box, or set BOX_URL (for example http://192.168.1.20:8084/demo).");
    process.exit(1);
  }
  const bridge = createBridge({ cloudUrl: CLOUD_URL, token: KARAOKE_TOKEN, boxUrl, tenantSlug: TENANT_SLUG || "", showCloud: process.env.SHOW_CLOUD_SONGS === "1" });
  console.log(`Karaoke bridge: ${boxUrl} <-> ${CLOUD_URL}`);
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const LINK_EVERY_MS = 6 * 3600 * 1e3;
  void bridge.loadAll().then(async () => {
    for (; ; ) {
      try {
        await bridge.linkLibrary();
      } catch (error) {
        console.log(`library link waiting: ${error.message}`);
      }
      await wait(LINK_EVERY_MS);
    }
  });
  const playLoop = async () => {
    for (; ; ) {
      try {
        await bridge.tick({ controls: false });
      } catch (error) {
        console.log(`waiting: ${error.message}`);
      }
      await wait(Number(POLL_MS) || DEFAULT_POLL_MS);
    }
  };
  const controlLoop = async () => {
    for (; ; ) {
      await bridge.pressControls();
      await wait(CONTROL_EVERY_MS);
    }
  };
  const searchLoop = async () => {
    for (; ; ) {
      try {
        await bridge.serveSearches();
      } catch (error) {
        console.log(`search helper waiting: ${error.message}`);
        await wait(RETRY_AFTER_ERROR_MS);
      }
    }
  };
  await Promise.all([playLoop(), controlLoop(), searchLoop()]);
}
if (process.argv[1] === (0, import_node_url.fileURLToPath)(__importMetaUrl)) main();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createBridge,
  exactSong,
  findBox,
  initialsOf,
  isBox,
  parseJsonp,
  pickSong,
  singerNames
});
