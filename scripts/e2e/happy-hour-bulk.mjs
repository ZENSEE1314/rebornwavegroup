// Happy hour for many items at once (Admin › Inventory › Happy hour). Run against the local test server (see README.md).
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
await admin("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });
const staffEmail = `hh${tag}@test.local`;
const staff = makeClient();
await staff("POST", "/api/auth/register", { email: staffEmail, password: "Passw0rd!", firstName: "Happy", lastName: "Staff", phoneNumber: "0818" + tag.replace(/\D/g, "").padEnd(7, "7").slice(0, 7), dateOfBirth: "1995-01-01", gender: "female" });
await db.query("UPDATE users SET role='staff' WHERE email=$1", [staffEmail]);
await staff("POST", "/api/auth/login", { email: staffEmail, password: "Passw0rd!" });

const beer = (await admin("POST", "/api/reborn/admin/pos/products", { name: "HH Beer " + tag, category: "Beer", price: 100000, cost: 40000, stock: 50 })).json;
const fries = (await admin("POST", "/api/reborn/admin/pos/products", { name: "HH Fries " + tag, category: "Food", price: 30000, cost: 10000, stock: 50 })).json;
const row = async (id) => (await db.query("SELECT happy_start, happy_end, happy_price, happy_only FROM pos_products WHERE id=$1", [id])).rows[0];

let r = await staff("POST", "/api/reborn/admin/happy-hour", { productIds: [beer.id], start: "17:00", end: "20:00", percent: 20 });
check("a cashier cannot set a happy hour", r.status === 403 || r.status === 401, r.status);
r = await admin("POST", "/api/reborn/admin/happy-hour", { productIds: [], start: "17:00", end: "20:00", percent: 20 });
check("nothing ticked is refused", r.status === 400, r.status);
r = await admin("POST", "/api/reborn/admin/happy-hour", { productIds: [beer.id], start: "17:00", end: "17:00", percent: 20 });
check("a window with the same start and end is refused", r.status === 400, r.status);
r = await admin("POST", "/api/reborn/admin/happy-hour", { productIds: [beer.id, fries.id], start: "17:00", end: "20:00", percent: 20 });
let a = await row(beer.id), b = await row(fries.id);
check("20% off is worked out from each item's own price", r.status === 200 && r.json.changed === 2 && Number(a.happy_price) === 80000 && Number(b.happy_price) === 24000 && a.happy_start === "17:00" && a.happy_end === "20:00", JSON.stringify([r.json, a, b]));
r = await admin("POST", "/api/reborn/admin/happy-hour", { productIds: [beer.id], start: "18:00", end: "02:00", price: 45000, onlyDuring: true });
a = await row(beer.id);
check("one price for all, a window past midnight, and only sold in the hours", r.status === 200 && Number(a.happy_price) === 45000 && a.happy_end === "02:00" && a.happy_only === true, JSON.stringify(a));
r = await admin("POST", "/api/reborn/admin/happy-hour", { productIds: [beer.id], start: "18:00", end: "20:00" });
a = await row(beer.id);
check("hours only (no price) keeps the normal price", r.status === 200 && a.happy_price === null && a.happy_start === "18:00", JSON.stringify(a));
r = await admin("POST", "/api/reborn/admin/happy-hour", { productIds: [beer.id, fries.id], clear: true });
a = await row(beer.id); b = await row(fries.id);
check("taking happy hour off clears every field", r.status === 200 && a.happy_start === null && a.happy_price === null && a.happy_only === false && b.happy_start === null, JSON.stringify([a, b]));

await db.end();
console.log(failures ? `${failures} FAILED` : "ALL PASSED");
process.exit(failures ? 1 : 0);
