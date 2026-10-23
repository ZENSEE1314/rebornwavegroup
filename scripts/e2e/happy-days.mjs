// Happy hour on chosen weekdays. Run against the local test server (see README.md).
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

const beer = (await admin("POST", "/api/reborn/admin/pos/products", { name: "HD Beer " + tag, category: "Beer", price: 100000, cost: 40000, stock: 50 })).json;
const timezone = (await db.query("SELECT value FROM app_settings WHERE key='timezone'")).rows[0]?.value || "Asia/Jakarta";
const today = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(new Date()));
const otherDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== today).slice(0, 2).join(",");
const happyNow = async () => (await admin("GET", "/api/reborn/pos/products")).json.find((p) => p.id === beer.id)?.happyNow;
const saved = async () => (await db.query("SELECT happy_days FROM pos_products WHERE id=$1", [beer.id])).rows[0].happy_days;

let r = await admin("POST", "/api/reborn/admin/happy-hour", { productIds: [beer.id], start: "00:00", end: "23:59", price: 80000, days: otherDays });
check("a happy hour on other days is saved", r.status === 200 && (await saved()) === otherDays.split(",").sort().join(","), String(await saved()));
check("it is not on today", (await happyNow()) === false);
r = await admin("POST", "/api/reborn/admin/happy-hour", { productIds: [beer.id], start: "00:00", end: "23:59", price: 80000, days: String(today) });
check("a happy hour on today's day is on", (await happyNow()) === true);
r = await admin("POST", "/api/reborn/admin/happy-hour", { productIds: [beer.id], start: "00:00", end: "23:59", price: 80000, days: "9,x" });
check("days that are not weekdays mean every day", (await saved()) === null && (await happyNow()) === true, String(await saved()));
r = await admin("PATCH", `/api/reborn/admin/pos/products/${beer.id}`, { happyDays: otherDays });
check("the item's own box can set the days", r.status === 200 && (await happyNow()) === false, r.status);
r = await admin("POST", "/api/reborn/admin/happy-hour/items", { items: [{ id: beer.id, happyStart: "00:00", happyEnd: "23:59", happyDays: String(today), happyPrice: 70000 }] });
check("item by item can set the days", r.status === 200 && (await happyNow()) === true, r.status);
await db.end();
console.log(failures === 0 ? "ALL PASSED" : `${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
