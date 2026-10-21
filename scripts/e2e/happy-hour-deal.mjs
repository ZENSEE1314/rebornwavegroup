// Happy hour "buy X get Y free" on a table bill and a quick sale. Run against the local test server (see README.md).
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
const beer = (await admin("POST", "/api/reborn/admin/pos/products", { name: "Deal Beer " + tag, category: "Beer", price: 40000, cost: 15000, stock: 50 })).json;
const lines = async (orderId) => (await db.query("SELECT name, price, qty FROM pos_ticket_items WHERE order_id=$1 ORDER BY id", [orderId])).rows;
const stockOf = async () => Number((await db.query("SELECT stock FROM pos_products WHERE id=$1", [beer.id])).rows[0].stock);

let r = await admin("POST", "/api/reborn/admin/happy-hour", { productIds: [beer.id], start: "00:00", end: "23:59", buyQty: 1, freeQty: 1 });
const saved = (await db.query("SELECT happy_buy_qty, happy_free_qty FROM pos_products WHERE id=$1", [beer.id])).rows[0];
check("the deal is saved on the item", r.status === 200 && saved.happy_buy_qty === 1 && saved.happy_free_qty === 1, JSON.stringify([r.json, saved]));

const table = `D${tag}`.slice(0, 8);
const order = (await admin("POST", "/api/reborn/pos/orders", { tableNumber: table })).json.order;
await admin("POST", `/api/reborn/pos/orders/${order.id}/items`, { items: [{ productId: beer.id, qty: 1 }] });
let rows = await lines(order.id);
check("the first beer is paid", rows.length === 1 && Number(rows[0].price) === 40000, JSON.stringify(rows));
await admin("POST", `/api/reborn/pos/orders/${order.id}/items`, { items: [{ productId: beer.id, qty: 1 }] });
rows = await lines(order.id);
check("the second beer, added later, is free", rows.length === 2 && Number(rows[1].price) === 0 && rows[1].name.includes("free"), JSON.stringify(rows));
await admin("POST", `/api/reborn/pos/orders/${order.id}/items`, { items: [{ productId: beer.id, qty: 2 }] });
rows = await lines(order.id);
const paid = rows.filter((x) => Number(x.price) > 0).reduce((s, x) => s + x.qty, 0);
const freeUnits = rows.filter((x) => Number(x.price) === 0).reduce((s, x) => s + x.qty, 0);
check("four beers make two paid and two free", paid === 2 && freeUnits === 2, JSON.stringify(rows));
const [ticket] = (await db.query("SELECT total FROM pos_tickets WHERE id=$1", [order.id])).rows;
check("the bill total is two beers", Number(ticket.total) === 80000, JSON.stringify(ticket));
check("stock goes down for the free beers too", (await stockOf()) === 46, String(await stockOf()));

r = await admin("POST", "/api/reborn/pos/quote", { items: [{ productId: beer.id, price: 40000, qty: 2 }] });
check("a quick sale of two beers is priced as one", r.status === 200 && Number(r.json.subtotal) === 40000, JSON.stringify(r.json));

r = await admin("POST", "/api/reborn/admin/happy-hour", { productIds: [beer.id], clear: true });
const cleared = (await db.query("SELECT happy_buy_qty, happy_free_qty FROM pos_products WHERE id=$1", [beer.id])).rows[0];
check("taking happy hour off clears the deal", r.status === 200 && cleared.happy_buy_qty === 0 && cleared.happy_free_qty === 0, JSON.stringify(cleared));

await db.end();
console.log(failures ? `${failures} FAILED` : "ALL PASSED");
process.exit(failures ? 1 : 0);
