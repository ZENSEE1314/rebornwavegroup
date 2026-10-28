// Merging the same item entered twice keeps its bundles and visits packages: they move to the item it was merged into. Run against the local test server (see README.md).
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
const make = async (name) => (await admin("POST", "/api/reborn/admin/pos/products", { name, category: "Beer", price: 50000, cost: 20000, stock: 10 })).json;
const first = await make("Merge Beer A " + tag);
const second = await make("Merge Beer B " + tag);
const bundle = (await admin("POST", "/api/reborn/admin/pos/products", { name: "6 x Merge Beer A " + tag, category: "Beer", price: 280000, cost: 120000, bundleItemId: first.id, bundleQty: 6 })).json;
const pack = (await admin("POST", "/api/reborn/admin/pos/products", { name: "Pack of Merge Beer A " + tag, category: "Packages", price: 250000, packageKind: "uses", packageUses: 6, packageItemIds: [first.id] })).json;
const r = await admin("POST", `/api/reborn/admin/pos/products/${first.id}/merge`, { intoId: second.id });
check("the merge works", r.status === 200, JSON.stringify([r.status, r.json]));
const rows = (await db.query("SELECT id, bundle_item_id, package_item_ids FROM pos_products WHERE id = ANY($1)", [[bundle.id, pack.id]])).rows;
check("the bundle now belongs to the item it was merged into", Number(rows.find((x) => x.id === bundle.id)?.bundle_item_id) === second.id, JSON.stringify(rows));
check("the visits package now lists the item it was merged into", JSON.parse(rows.find((x) => x.id === pack.id)?.package_item_ids || "[]").map(Number).join() === String(second.id), JSON.stringify(rows));
await db.end();
console.log(failures ? `FAILED: ${failures}` : "ALL PASSED");
process.exit(failures ? 1 : 0);
