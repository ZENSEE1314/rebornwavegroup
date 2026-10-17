import pg from "pg";
const BASE = "http://127.0.0.1:3999";
let cookie = ""; let failures = 0;
async function call(method, path, body, headers = {}, useCookie = true) {
  const res = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...(useCookie && cookie ? { cookie } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
  const set = res.headers.getSetCookie?.() || []; if (useCookie && set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
  const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json };
}
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  → " + extra)); if (!ok) failures++; };
const db = new pg.Client({ connectionString: "postgres://postgres:pw@127.0.0.1:54329/reborn" }); await db.connect();
const one = async (sql, args = []) => (await db.query(sql, args)).rows[0];

await call("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });
const token = (await call("POST", "/api/reborn/admin/karaoke/token")).json.token;
const bridge = { "x-karaoke-token": token };
const tag = Date.now().toString(36);
const query = "zq" + tag;

let r = await call("GET", `/api/reborn/songs/search?q=${query}`);
check("no bridge connected: search still answers, box not connected", r.status === 200 && r.json.boxConnected === false, JSON.stringify(r.json).slice(0, 120));

// the bridge program: ask for work (held open), run the search "on the box", send the answer
const worker = (async () => {
  const jobs = await call("GET", "/api/karaoke/jobs", null, bridge, false);
  const job = jobs.json.jobs[0];
  await call("POST", `/api/karaoke/jobs/${job.id}`, { songs: [
    { code: "10014728", title: `${query} Love(T.I)`, artist: "Singer A" }, { code: "555", title: `${query} Other`, artist: "Singer B" }] }, bridge, false);
  return job.q;
})();
await call("GET", "/api/karaoke/jobs?hello=1", null, { "x-karaoke-token": "wrong" }, false).then((x) => check("jobs refused without the right token", x.status === 401, x.status));
await new Promise((resolve) => setTimeout(resolve, 300)); // the worker is now waiting
// the bridge asked for work, so the server knows it is online: a member's search becomes a job
r = await call("GET", `/api/reborn/songs/search?q=${query}`);
const askedFor = await worker;
check("the bridge got the member's search text", askedFor === query, askedFor);
check("search shows the box songs first and says so", r.json.boxConnected === true && r.json.songs[0]?.source === "karaoke" && r.json.songs[0]?.karaokeCode === "10014728", JSON.stringify(r.json.songs?.slice(0, 2)));

const asked = await call("POST", "/api/reborn/songs/request", { title: `${query} Love(T.I)`, artist: "Singer A", karaokeCode: "10014728", performanceMode: "self" });
check("a request from the box list is accepted", asked.status === 200, JSON.stringify(asked.json));
const withCode = (await db.query("SELECT id, title FROM songs WHERE karaoke_code=$1", ["10014728"])).rows;
check("the song is saved once with the box's number (a repeat reuses it)", withCode.length === 1, JSON.stringify(withCode));
const queue = await call("GET", "/api/karaoke/queue", null, bridge, false);
const onNow = queue.json.nowPlaying || queue.json.queue?.[0];
check("the bridge sees it in the queue with that number", onNow?.karaokeCode === "10014728", JSON.stringify(queue.json).slice(0, 200));


// ---- only songs the box has: library songs are linked by the bridge, the rest are refused / hidden while the bridge is online
await call("GET", "/api/karaoke/jobs?x=1", null, bridge, false).catch(() => {}); // not awaited long: the next line marks the bridge online
const plainSong = (await db.query("INSERT INTO songs (title, artist) VALUES ($1, 'Nobody') RETURNING id", [`${query} Not in box`])).rows[0].id;
const linkedSong = (await db.query("INSERT INTO songs (title, artist) VALUES ($1, 'Somebody') RETURNING id", [`${query} In box`])).rows[0].id;
let lib = await call("GET", "/api/karaoke/library", null, bridge, false);
check("the bridge can read the library", lib.status === 200 && lib.json.some((x) => x.id === plainSong), lib.status);
let link = await call("POST", "/api/karaoke/link", { links: [{ id: linkedSong, code: "777" }] }, bridge, false);
check("the bridge links a library song to its box number", link.json.linked === 1 && (await one("SELECT karaoke_code FROM songs WHERE id=$1", [linkedSong])).karaoke_code === "777");
const pending = call("GET", "/api/karaoke/jobs?keepalive=1", null, bridge, false); // the bridge is asking for work = online
await new Promise((resolve) => setTimeout(resolve, 300));
r = await call("POST", "/api/reborn/songs/request", { songId: plainSong, performanceMode: "self" });
check("a library song the box does not have is refused with a clear message", r.status === 400 && /karaoke system/i.test(r.json?.message || ""), JSON.stringify(r.json));
r = await call("POST", "/api/reborn/songs/request", { songId: linkedSong, performanceMode: "self" });
check("a library song linked to the box is accepted", r.status === 200, JSON.stringify(r.json));
r = await call("POST", "/api/reborn/songs/request", { title: "Typed by hand", artist: "Nobody", performanceMode: "self" });
check("a hand-typed song is refused while the box is connected", r.status === 400, r.status);
const browse = await call("GET", "/api/reborn/songs");
check("members browse only the songs the box has", browse.json.length > 0 && browse.json.every((x) => x.karaokeCode), JSON.stringify(browse.json.slice(0, 2)));
const everything = await call("GET", "/api/reborn/songs?all=1");
check("admin screens still see the whole library", everything.json.some((x) => x.id === plainSong), everything.json.length);
await call("POST", `/api/karaoke/jobs/none`, { songs: [] }, bridge, false);
void pending;
console.log(failures ? `${failures} FAILED` : "ALL PASSED"); await db.end(); process.exit(failures ? 1 : 0);
