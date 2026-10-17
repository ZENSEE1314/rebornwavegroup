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
const song = await one("SELECT id, karaoke_code FROM songs WHERE title=$1", [`${query} Love(T.I)`]);
check("the song is saved with the box's number", song?.karaoke_code === "10014728", JSON.stringify(song));
const queue = await call("GET", "/api/karaoke/queue", null, bridge, false);
const onNow = queue.json.nowPlaying || queue.json.queue?.[0];
check("the bridge sees it in the queue with that number", onNow?.karaokeCode === "10014728", JSON.stringify(queue.json).slice(0, 200));

console.log(failures ? `${failures} FAILED` : "ALL PASSED"); await db.end(); process.exit(failures ? 1 : 0);
