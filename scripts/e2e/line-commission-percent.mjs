// A bill line's commission %: picked on the POS (starting from the item's default), booked when the bill is paid. Run against the local test server (see README.md).
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
const me = login.json?.user?.id || login.json?.id;
const drink = (await admin("POST", "/api/reborn/admin/pos/products", { name: "Lady Drink " + tag, category: "Drinks", price: 100000, cost: 20000, stock: 20, staffCommissionKind: "percent", staffCommissionValue: 10 })).json;
const order = (await admin("POST", "/api/reborn/pos/orders", { tableNumber: "L" + tag.slice(-3) })).json.order;
await admin("POST", `/api/reborn/pos/orders/${order.id}/items`, { items: [{ productId: drink.id, qty: 2 }] });
const line = (await db.query("SELECT id FROM pos_ticket_items WHERE order_id=$1", [order.id])).rows[0];
let r = await admin("POST", `/api/reborn/pos/items/${line.id}/commission-staff`, { staffId: me, percent: 15 });
check("the cashier can pick the person and a % for one line", r.status === 200 && r.json?.percent === 15, JSON.stringify([r.status, r.json]));
await admin("POST", `/api/reborn/pos/orders/${order.id}/pay`, { method: "cash", cashReceived: 500000 });
const booked = (await db.query("SELECT amount FROM staff_item_commissions WHERE ticket_id=$1 AND voided_at IS NULL", [order.id])).rows;
check("the commission follows the line's % (15% of 200,000), not the item's default 10%", booked.length === 1 && Number(booked[0].amount) === 30000, JSON.stringify(booked));
await db.end();
console.log(failures ? `FAILED: ${failures}` : "ALL PASSED");
process.exit(failures ? 1 : 0);
