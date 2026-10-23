// Keys saved in the website: locked in the database, never sent back, changed only with the main-admin password. Run against the local test server (see README.md).
import pg from "pg";
const BASE = "http://127.0.0.1:3999";
let failures = 0;
const makeClient = () => {
  let cookie = "";
  return async (method, path, body) => {
    const res = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
    const set = res.headers.getSetCookie?.() || []; if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
    const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json, text };
  };
};
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  → " + extra)); if (!ok) failures++; };
const db = new pg.Client({ connectionString: "postgres://postgres:pw@127.0.0.1:54329/reborn" }); await db.connect();
const PASSWORD = "Correct-Horse-9";
const SECRET = "sk-ant-test-0123456789abcdef";

const admin = makeClient();
await admin("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });
await admin("POST", "/api/reborn/admin/settings", { mainAdminPassword: PASSWORD });

const anonymous = makeClient();
let r = await anonymous("GET", "/api/reborn/admin/secrets");
check("someone not logged in cannot list the keys", r.status === 401 || r.status === 403, String(r.status));
r = await admin("GET", "/api/reborn/admin/secrets");
const anthropic = r.json?.keys?.find((k) => k.name === "ANTHROPIC_API_KEY");
check("the admin sees the list and the server can lock keys", r.status === 200 && r.json.canSave === true && anthropic, r.text.slice(0, 200));
r = await admin("POST", "/api/reborn/admin/secrets/ANTHROPIC_API_KEY", { value: SECRET, password: "wrong-password" });
check("a wrong main-admin password is refused", r.status === 403, String(r.status));
r = await admin("POST", "/api/reborn/admin/secrets/NOT_A_KEY", { value: SECRET, password: PASSWORD });
check("a name that is not on the list is refused", r.status === 404, String(r.status));
r = await admin("POST", "/api/reborn/admin/secrets/ANTHROPIC_API_KEY", { value: "   ", password: PASSWORD });
check("an empty value is refused", r.status === 400, String(r.status));
r = await admin("POST", "/api/reborn/admin/secrets/ANTHROPIC_API_KEY", { value: SECRET, password: PASSWORD });
check("a key is saved with the right password", r.status === 200, r.text);
r = await admin("GET", "/api/reborn/admin/secrets");
check("the list says it is saved", r.json.keys.find((k) => k.name === "ANTHROPIC_API_KEY").state === "saved");
check("the value is never sent back", !r.text.includes(SECRET) && !r.text.includes("0123456789abcdef"));
const row = (await db.query("SELECT value FROM bridge_platform_secrets WHERE name='ANTHROPIC_API_KEY'")).rows[0];
check("the database holds it locked, not as text", row && row.value.startsWith("v1:") && !row.value.includes("sk-ant"), String(row?.value).slice(0, 20));
r = await admin("POST", "/api/reborn/admin/secrets/ANTHROPIC_API_KEY/remove", { password: "wrong-password" });
check("removing needs the password too", r.status === 403, String(r.status));
r = await admin("POST", "/api/reborn/admin/secrets/ANTHROPIC_API_KEY/remove", { password: PASSWORD });
check("a key is removed with the right password", r.status === 200, r.text);
r = await admin("GET", "/api/reborn/admin/secrets");
check("the list says it is not set again", r.json.keys.find((k) => k.name === "ANTHROPIC_API_KEY").state === "none");
await db.end();
console.log(failures === 0 ? "ALL PASSED" : `${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
