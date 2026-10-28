// Inventory › Add stock with a price: paid (cash / card) or not paid yet (a bill to pay later). Run against the local test server (see README.md).
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
const item = (await admin("POST", "/api/reborn/admin/pos/products", { name: "Paid Beer " + tag, category: "Beer", price: 50000, cost: 20000, stock: 0 })).json;
const stockOf = async () => Number((await db.query("SELECT stock FROM pos_products WHERE id=$1", [item.id])).rows[0].stock);
let r = await admin("POST", "/api/reborn/pos/stock-in", { productId: item.id, qty: 5, unitCost: 20000, supplier: "Budi", paid: true });
check("a paid delivery with no cash / card choice is refused", r.status === 400 && (await stockOf()) === 0, JSON.stringify([r.status, r.json]));
r = await admin("POST", "/api/reborn/pos/stock-in", { productId: item.id, qty: 5, unitCost: 20000, supplier: "Budi", paid: true, payMethod: "cash" });
check("a delivery paid in cash is added", r.status === 200 && (await stockOf()) === 5, JSON.stringify([r.status, r.json]));
check("and the purchase says it was paid in cash", (await db.query("SELECT 1 FROM ledger_entries WHERE ref_type='stock_movement' AND ref_id=$1 AND note LIKE '% · cash'", [String(item.id)])).rowCount === 1);
r = await admin("POST", "/api/reborn/pos/stock-in", { productId: item.id, qty: 10, unitCost: 20000, supplier: "Budi", paid: false, dueDate: "2099-01-31" });
check("a delivery not paid yet is added with no cash / card choice", r.status === 200 && (await stockOf()) === 15, JSON.stringify([r.status, r.json]));
const owed = (await db.query("SELECT amount, due_date, kind, supplier FROM supplier_payables WHERE supplier='Budi' AND kind='stock' ORDER BY id DESC LIMIT 1")).rows[0];
check("and a bill to pay (200,000 to Budi, due on the day given) is kept", owed && Number(owed.amount) === 200000 && String(owed.due_date).startsWith("2099-01-31"), JSON.stringify(owed));
r = await admin("POST", "/api/reborn/pos/stock-in", { productId: item.id, qty: 1 });
check("adding stock with no price needs no payment choice", r.status === 200, JSON.stringify([r.status, r.json]));
await db.end();
console.log(failures ? `FAILED: ${failures}` : "ALL PASSED");
process.exit(failures ? 1 : 0);
