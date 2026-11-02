// The accounting ledger list must stay small: an invoice photo stored as a data URL is not sent with the list (only a flag; the photo has its own call), and closed-day snapshots are left out. Run against the local test server (see README.md).
import pg from "pg";
const BASE = "http://127.0.0.1:3999";
let failures = 0;
const makeClient = () => {
  let cookie = "";
  return async (method, path, body) => {
    const res = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
    const set = res.headers.getSetCookie?.() || []; if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
    const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json };
  };
};
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  → " + extra)); if (!ok) failures++; };
const db = new pg.Client({ connectionString: "postgres://postgres:pw@127.0.0.1:54329/reborn" }); await db.connect();
const tag = Date.now().toString(36);

const bigPhoto = "data:image/jpeg;base64," + "A".repeat(200_000);
const photoLine = (await db.query("INSERT INTO ledger_entries (kind, category, amount, note, photo_url, user_id) VALUES ('expense','other',1000,$1,$2,$3) RETURNING id", ["photo " + tag, bigPhoto, adminId])).rows[0].id;
const closingLine = (await db.query("INSERT INTO ledger_entries (kind, category, amount, note, ref_type, ref_id, user_id) VALUES ('income','daily_closing',0,$1,'pos_closing',$2,$3) RETURNING id", [JSON.stringify({ day: "1999-01-01", big: "x".repeat(50_000) }), "1999-01-01-" + tag, adminId])).rows[0].id;

let r = await admin("GET", "/api/reborn/admin/accounting/ledger?limit=1000");
const listed = (r.json || []).find((x) => x.id === photoLine);
check("the list does not carry the photo itself", listed && !listed.photoUrl, JSON.stringify(listed && Object.keys(listed)));
check("the list says the line has a photo", listed?.hasPhoto === true, JSON.stringify(listed));
check("the list stays small", JSON.stringify(r.json).length < 150_000, String(JSON.stringify(r.json).length));
check("closed-day snapshots are not in the list", !(r.json || []).some((x) => x.id === closingLine), "closing listed");
r = await admin("GET", `/api/reborn/admin/accounting/ledger/${photoLine}/photo`);
check("the photo is still available by its own call", r.json?.photoUrl === bigPhoto, String(r.json?.photoUrl?.length));

await db.end();
console.log(failures ? `${failures} FAILED` : "ALL PASSED");
process.exit(failures ? 1 : 0);
