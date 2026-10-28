// Adding items to a table bill: a request sent again with the same key (the POS lost its connection) adds the items once. Run against the local test server (see README.md).
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
const beer = (await admin("POST", "/api/reborn/admin/pos/products", { name: "Once Beer " + tag, category: "Beer", price: 50000, cost: 20000, stock: 50 })).json;
const order = (await admin("POST", "/api/reborn/pos/orders", { tableNumber: "O" + tag.slice(-3) })).json.order;
const qtyOnBill = async () => Number((await db.query("SELECT COALESCE(SUM(qty),0) AS n FROM pos_ticket_items WHERE order_id=$1 AND product_id=$2", [order.id, beer.id])).rows[0].n);
const items = [{ productId: beer.id, qty: 3 }];

let r = await admin("POST", `/api/reborn/pos/orders/${order.id}/items`, { items, clientKey: "k1-" + tag });
check("three of the same item are added", r.status === 200 && (await qtyOnBill()) === 3, JSON.stringify([r.status, r.json]));
r = await admin("POST", `/api/reborn/pos/orders/${order.id}/items`, { items, clientKey: "k1-" + tag });
check("the same request sent again gets the same answer", r.status === 200 && r.json?.total !== undefined, JSON.stringify([r.status, r.json]));
check("and the items are not added a second time", (await qtyOnBill()) === 3, String(await qtyOnBill()));
r = await admin("POST", `/api/reborn/pos/orders/${order.id}/items`, { items, clientKey: "k2-" + tag });
check("a new key (a new tap on the button) adds again", r.status === 200 && (await qtyOnBill()) === 6, String(await qtyOnBill()));
r = await admin("POST", `/api/reborn/pos/orders/${order.id}/items`, { items });
check("a request with no key still works as before", r.status === 200 && (await qtyOnBill()) === 9, String(await qtyOnBill()));

await db.end();
console.log(failures ? `FAILED: ${failures}` : "ALL PASSED");
process.exit(failures ? 1 : 0);
