// The admin can change the drink name and the owner of a kept bottle (a member by code, or just a typed name). Run against the local test server (see README.md).
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
const made = await admin("POST", "/api/reborn/pos/bottle-keep", { memberCode: "Typo Name " + tag, type: "beer", name: "Wrong Beer " + tag, quantity: 1 });
const id = made.json?.bottle?.id;
const rowOf = async () => (await db.query("SELECT name, user_id, member_name, member_code FROM bottle_keeps WHERE id=$1", [id])).rows[0];
let r = await admin("PATCH", `/api/reborn/pos/bottle-keeps/${id}`, { name: "Right Beer " + tag });
check("the admin changes the drink name", r.status === 200 && (await rowOf()).name === "Right Beer " + tag, JSON.stringify([r.status, r.json]));
r = await admin("PATCH", `/api/reborn/pos/bottle-keeps/${id}`, { memberName: "Fixed Name " + tag });
check("the admin changes the name it is kept under", r.status === 200 && (await rowOf()).member_name === "Fixed Name " + tag && (await rowOf()).user_id === null, JSON.stringify(await rowOf()));
const me = (await db.query("SELECT referral_code FROM users WHERE id=$1", [adminId])).rows[0];
r = await admin("PATCH", `/api/reborn/pos/bottle-keeps/${id}`, { memberCode: me.referral_code });
check("the admin puts it on a member's account by code", r.status === 200 && (await rowOf()).user_id === adminId, JSON.stringify(await rowOf()));
r = await admin("PATCH", `/api/reborn/pos/bottle-keeps/${id}`, { name: "   " });
check("an empty drink name is refused", r.status === 400, JSON.stringify([r.status, r.json]));
r = await admin("PATCH", `/api/reborn/pos/bottle-keeps/${id}`, {});
check("nothing to change is refused", r.status === 400, JSON.stringify([r.status, r.json]));
const anyone = makeClient();
r = await anyone("PATCH", `/api/reborn/pos/bottle-keeps/${id}`, { name: "Hacked" });
check("a signed-out visitor cannot change it", r.status === 401 || r.status === 403, String(r.status));
await db.end();
console.log(failures ? `FAILED: ${failures}` : "ALL PASSED");
process.exit(failures ? 1 : 0);
