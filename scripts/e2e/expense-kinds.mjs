// The main admin adds his own kind of expense (renovation ...), uploads an expense under it, and cannot remove it while it is used. Run against the local test server (see README.md).
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
const tag = Date.now().toString(36);
const kind = "Renovation " + tag;
const key = "x:" + kind;
const admin = makeClient();
await admin("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });

let r = await admin("POST", "/api/reborn/admin/expense-categories", { name: kind });
check("the admin adds a kind", r.status === 200 && r.json?.category === key, JSON.stringify([r.status, r.json]));
r = await admin("POST", "/api/reborn/admin/expense-categories", { name: kind.toUpperCase() });
check("the same name again is refused", r.status === 400, JSON.stringify([r.status, r.json]));
r = await admin("POST", "/api/reborn/admin/expense-categories", { name: "  " });
check("an empty name is refused", r.status === 400, String(r.status));
const anyone = makeClient();
r = await anyone("POST", "/api/reborn/admin/expense-categories", { name: "Nope " + tag });
check("a signed-out visitor cannot add a kind", r.status === 401 || r.status === 403, String(r.status));

r = await admin("GET", "/api/reborn/expenses");
check("the form lists the new kind", (r.json?.categories || []).includes(key), JSON.stringify(r.json?.categories));
const today = new Date().toISOString().slice(0, 10);
r = await admin("POST", "/api/reborn/expenses", { payMethod: "cash", category: key, amount: 7000, spentOn: today, payee: "Builder " + tag, note: "paint" });
check("an expense can be uploaded under the new kind", r.status === 200 && r.json?.expense?.category === key, JSON.stringify([r.status, r.json]));
r = await admin("POST", "/api/reborn/expenses", { payMethod: "cash", category: "x:Never added " + tag, amount: 7000, spentOn: today, note: "x" });
check("a kind that was never added is refused", r.status === 400, String(r.status));
r = await admin("POST", "/api/reborn/admin/expense-categories/remove", { category: key });
check("a kind that is in use cannot be removed", r.status === 400, JSON.stringify([r.status, r.json]));
const spare = "Spare " + tag;
await admin("POST", "/api/reborn/admin/expense-categories", { name: spare });
r = await admin("POST", "/api/reborn/admin/expense-categories/remove", { category: "x:" + spare });
check("an unused kind can be removed", r.status === 200, JSON.stringify([r.status, r.json]));
console.log(failures ? `FAILED: ${failures}` : "ALL PASSED");
process.exit(failures ? 1 : 0);
