// Copy to scripts/e2e/<name>.mjs. Run it with: bash toolbox/scripts/run-tests.sh <name>
// The runner rewrites the ports to the spare ones (54329 -> 54339, 3999 -> 3998), so write 54329 and 3999 here and never any live address.
// Test accounts only: admin@test.local / Passw0rd! (created by 00-create-admin.mjs). Make your own staff / members with a unique tag.
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
const tag = Date.now().toString(36); // makes names unique so a re-run does not collide

const admin = makeClient();
await admin("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });

// Arrange: make what the test needs (a product, a staff member, a bill)
// Act: call the route
// Assert: the answer AND the database (what was booked, what a refund reverses)
const r = await admin("GET", "/api/reborn/my-role");
check("the admin is an admin", r.status === 200 && r.json.role === "admin", JSON.stringify(r));

await db.end();
console.log(failures === 0 ? "ALL PASSED" : `${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
