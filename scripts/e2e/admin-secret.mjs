// The main-admin password is saved as a hash, is never sent back to the browser, and the reset buttons check it. Run against the local test server (see README.md).
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
const stored = async () => (await db.query("SELECT value FROM app_settings WHERE key='mainAdminPassword'")).rows[0]?.value;

const admin = makeClient();
await admin("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });

let r = await admin("POST", "/api/reborn/admin/settings", { mainAdminPassword: "short" });
check("a main-admin password under 8 characters is refused", r.status === 400, JSON.stringify(r));
r = await admin("POST", "/api/reborn/admin/settings", { mainAdminPassword: "Correct-Horse-9" });
check("a long enough one is saved", r.status === 200, JSON.stringify(r));
check("it is stored as a hash, not as text", /^\$2[aby]\$\d\d\$/.test(await stored()) && !(await stored()).includes("Correct"), String(await stored()).slice(0, 12));
r = await admin("GET", "/api/reborn/admin/settings");
check("the settings screen is told one is set but never given it", r.json.mainAdminPassword === "" && r.json.mainAdminPasswordSet === true && !JSON.stringify(r.json).includes("Correct-Horse") && !JSON.stringify(r.json).includes("$2"), JSON.stringify([r.json.mainAdminPassword, r.json.mainAdminPasswordSet]));
const hashBefore = await stored();
await admin("POST", "/api/reborn/admin/settings", { mainAdminPassword: "", clubName: "Test Club" });
check("saving the screen with the password box empty keeps the saved password", (await stored()) === hashBefore);

// an old, readable password still works once and is turned into a hash
await db.query("UPDATE app_settings SET value='OldPlain-1234' WHERE key='mainAdminPassword'");
r = await admin("POST", "/api/reborn/admin/kos/reset", { password: "wrong-one" });
check("a wrong main-admin password is refused (readable form)", r.status === 403, JSON.stringify(r));
check("the old readable password is still readable after a refusal", (await stored()) === "OldPlain-1234");
r = await admin("POST", "/api/reborn/admin/kos/reset", { password: "OldPlain-1234" });
check("the old readable password still works", r.status === 200, JSON.stringify(r));
check("and was turned into a hash by using it", /^\$2[aby]\$\d\d\$/.test(await stored()), String(await stored()).slice(0, 12));
r = await admin("POST", "/api/reborn/admin/kos/reset", { password: "OldPlain-1234" });
check("the same password works against the hash", r.status === 200, JSON.stringify(r));
r = await admin("POST", "/api/reborn/admin/kos/reset", { password: "OldPlain-12345" });
check("a wrong password is refused against the hash", r.status === 403, JSON.stringify(r));

await db.end();
console.log(failures ? `${failures} FAILED` : "ALL PASSED");
process.exit(failures ? 1 : 0);
