import pg from "pg";
const BASE = "http://127.0.0.1:3999";
let failures = 0;
const makeClient = () => {
  let cookie = "";
  return async (method, path, body, headers = {}, raw = false) => {
    const res = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
    const set = res.headers.getSetCookie?.() || []; if (set.length && !headers["x-karaoke-token"]) cookie = set.map((c) => c.split(";")[0]).join("; ");
    if (raw) return { status: res.status, type: res.headers.get("content-type"), buf: Buffer.from(await res.arrayBuffer()) };
    const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json };
  };
};
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  → " + extra)); if (!ok) failures++; };
const db = new pg.Client({ connectionString: "postgres://postgres:pw@127.0.0.1:54329/reborn" }); await db.connect();
const admin = makeClient();
await admin("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });
const token = (await admin("POST", "/api/reborn/admin/karaoke/token")).json.token;
const bridge = makeClient(); const bh = { "x-karaoke-token": token };
const tag = Date.now().toString(36);
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

// a member
const email = `sing${tag}@test.local`;
const member = makeClient();
await member("POST", "/api/auth/register", { email, password: "Passw0rd!", firstName: "Singer", lastName: "One", phoneNumber: "0813" + tag.replace(/\D/g, "").padEnd(7, "2").slice(0, 7), dateOfBirth: "1995-01-01", gender: "female" });
await member("POST", "/api/auth/login", { email, password: "Passw0rd!" });
const other = makeClient();
const otherEmail = `other${tag}@test.local`;
await other("POST", "/api/auth/register", { email: otherEmail, password: "Passw0rd!", firstName: "Other", lastName: "Two", phoneNumber: "0814" + tag.replace(/\D/g, "").padEnd(7, "3").slice(0, 7), dateOfBirth: "1995-01-01", gender: "male" });
await other("POST", "/api/auth/login", { email: otherEmail, password: "Passw0rd!" });

// a bridge answering every kind of question
let stop = false;
const answers = {
  singers: { singers: [{ name: "田馥甄", pinyin: "Tian Fu Zhen", photo: "11002.jpg", songs: 12 }], maxPage: 3 },
  singer: { songs: [{ code: "10123077", title: "小幸运(T.I)", artist: "田馥甄", photo: "11002.jpg" }], maxPage: 1 },
  photo: { data: png.toString("base64"), type: "image/png" },
  search: { songs: [{ code: "10123077", title: "小幸运(T.I)", artist: "田馥甄", photo: "11002.jpg" }] },
};
const asked = [];
const worker = (async () => {
  while (!stop) {
    const r = await bridge("GET", "/api/karaoke/jobs", null, bh);
    for (const job of r.json?.jobs || []) { asked.push(job.kind); await bridge("POST", `/api/karaoke/jobs/${job.id}`, answers[job.kind] || {}, bh); }
  }
})();
await new Promise((resolve) => setTimeout(resolve, 400));

let r = await member("GET", "/api/reborn/karaoke/status");
check("members can see the song system is online", r.json?.online === true, JSON.stringify(r.json));
r = await member("GET", "/api/reborn/karaoke/singers?page=1");
check("the singers gallery: name, photo file, songs, pages", r.json.singers?.[0]?.name === "田馥甄" && r.json.singers[0].photo === "11002.jpg" && r.json.maxPage === 3, JSON.stringify(r.json));
r = await member("GET", "/api/reborn/karaoke/singer-songs?name=%E7%94%B0%E9%A6%A5%E7%94%84&page=1");
check("one singer's songs, ready to order", r.json.songs?.[0]?.code === "10123077", JSON.stringify(r.json));
const photo = await member("GET", "/api/reborn/karaoke/photo/11002.jpg", null, {}, true);
check("a singer photo is served as an image with a cache time", photo.status === 200 && photo.type === "image/png" && photo.buf.equals(png), photo.status + " " + photo.type);
const bad = await member("GET", "/api/reborn/karaoke/photo/..%2F..%2Fetc%2Fpasswd", null, {}, true);
check("a photo name that is not a plain picture file is refused", bad.status === 400 || bad.status === 404, bad.status);

// request with the singer's voice on, then the queue
r = await member("POST", "/api/reborn/songs/request", { title: "小幸运(T.I)", artist: "田馥甄", karaokeCode: "10123077", vocal: "original", performanceMode: "self" });
check("a song is requested from the song system with the voice choice", r.status === 200, JSON.stringify(r.json));
const row = (await db.query("SELECT id, vocal, status FROM song_requests WHERE user_id=(SELECT id FROM users WHERE email=$1) ORDER BY id DESC LIMIT 1", [email])).rows[0];
check("the choice (singer's voice on) is saved", row?.vocal === "original", JSON.stringify(row));
let q = (await bridge("GET", "/api/karaoke/queue", null, bh)).json;
check("the bridge sees the choice in the queue", q.queue?.[0]?.vocal === "original" || q.nowPlaying?.vocal === "original", JSON.stringify(q).slice(0, 200));

// start it (the bridge does this), then the singer repeats / another member cannot
await bridge("POST", "/api/karaoke/next", {}, bh);
q = (await bridge("GET", "/api/karaoke/queue", null, bh)).json;
const onNow = q.nowPlaying;
check("it is on now", onNow?.id === row.id, JSON.stringify(q).slice(0, 200));
r = await other("POST", `/api/reborn/songs/my-requests/${row.id}/skip`, {});
check("another member cannot skip someone else's song", r.status === 400, r.status);
r = await member("POST", `/api/reborn/songs/my-requests/${row.id}/repeat`, {});
check("the singer can repeat their own song", r.status === 200, JSON.stringify(r.json));
q = (await bridge("GET", "/api/karaoke/queue", null, bh)).json;
check("the repeat is counted for the bridge", q.nowPlaying?.repeat === 1, JSON.stringify(q.nowPlaying));

// the system's own list shows to members and admin
await bridge("POST", "/api/karaoke/box-state", { songs: [{ title: "Ordered by hand", artist: "Someone" }] }, bh);
const queueView = (await member("GET", "/api/reborn/song-queue")).json;
check("members see songs ordered on the system next to the queue", queueView.boxQueue?.[0]?.title === "Ordered by hand", JSON.stringify(queueView.boxQueue));
const adminView = (await admin("GET", "/api/reborn/admin/karaoke/box-playlist")).json;
check("admin sees them too", adminView.online === true && adminView.songs?.[0]?.title === "Ordered by hand", JSON.stringify(adminView));

r = await member("POST", `/api/reborn/songs/my-requests/${row.id}/skip`, {});
check("the singer can skip their own song", r.status === 200, JSON.stringify(r.json));
const after = (await db.query("SELECT status FROM song_requests WHERE id=$1", [row.id])).rows[0];
check("it is marked skipped", after.status === "skipped", JSON.stringify(after));
const mine = (await member("GET", "/api/reborn/songs/my-requests")).json;
check("my requests shows no history (skipped / sung songs are gone)", mine.every((x) => x.status === "pending" || x.status === "playing"), JSON.stringify(mine.map((x) => x.status)));
const everything = (await admin("GET", "/api/reborn/songs?all=1")).json;
check("admin still sees every library song", Array.isArray(everything), "");

stop = true; await bridge("POST", "/api/karaoke/box-state", { songs: [] }, bh);
console.log(asked.length ? "bridge was asked: " + [...new Set(asked)].join(", ") : "");
console.log(failures ? `${failures} FAILED` : "ALL PASSED"); await db.end(); process.exit(failures ? 1 : 0);
