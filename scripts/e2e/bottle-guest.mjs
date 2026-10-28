// Keeping a bottle needs no member account: a typed name is enough, and a member found by code gets it on their account. Run against the local test server (see README.md).
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
const admin = makeClient();
const login = await admin("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });
const adminId = login.json?.user?.id || login.json?.id;
const rowOf = async (name) => (await db.query("SELECT user_id, member_name, member_code, status FROM bottle_keeps WHERE name=$1", [name])).rows;
let r = await admin("POST", "/api/reborn/pos/bottle-keep", { memberCode: "Guest Anna " + tag, type: "beer", name: "Own Beer G" + tag, quantity: 2 });
check("a bottle is kept for a typed name with no account", r.status === 200, JSON.stringify([r.status, r.json]));
let rows = await rowOf("Own Beer G" + tag);
check("it has the name and no account", rows.length === 1 && rows[0].user_id === null && rows[0].member_name === "Guest Anna " + tag, JSON.stringify(rows));
r = await admin("POST", "/api/reborn/pos/bottle-keep", { memberCode: "", guestName: "Guest Budi " + tag, type: "beer", name: "Own Beer H" + tag, quantity: 1 });
check("a separate guestName works the same", r.status === 200 && (await rowOf("Own Beer H" + tag))[0]?.member_name === "Guest Budi " + tag, JSON.stringify([r.status, r.json]));
r = await admin("POST", "/api/reborn/pos/bottle-keep", { memberCode: "", type: "beer", name: "Own Beer N" + tag, quantity: 1 });
check("no name and no member is refused", r.status === 400, JSON.stringify([r.status, r.json]));
const me = (await db.query("SELECT referral_code FROM users WHERE id=$1", [adminId])).rows[0];
r = await admin("POST", "/api/reborn/pos/bottle-keep", { memberCode: me.referral_code, type: "beer", name: "Own Beer M" + tag, quantity: 1 });
rows = await rowOf("Own Beer M" + tag);
check("a member found by code gets the bottle on their account", r.status === 200 && rows[0]?.user_id === adminId, JSON.stringify([r.status, rows]));
r = await admin("GET", "/api/reborn/pos/bottle-keeps?q=Anna " + tag);
check("the guest bottle is in the list for staff", Array.isArray(r.json) && r.json.some((b) => b.memberName === "Guest Anna " + tag), JSON.stringify(r.json).slice(0, 200));
await db.end();
console.log(failures ? `FAILED: ${failures}` : "ALL PASSED");
process.exit(failures ? 1 : 0);
