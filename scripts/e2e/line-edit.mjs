// Edit one bill line: price, quantity, discount (% or amount off the line) and "at cost". Run against the local test server (see README.md).
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
const staffEmail = `line${tag}@test.local`;
const staff = makeClient();
await staff("POST", "/api/auth/register", { email: staffEmail, password: "Passw0rd!", firstName: "Line", lastName: "Staff", phoneNumber: "0817" + tag.replace(/\D/g, "").padEnd(7, "6").slice(0, 7), dateOfBirth: "1995-01-01", gender: "female" });
await db.query("UPDATE users SET role='staff' WHERE email=$1", [staffEmail]);
await staff("POST", "/api/auth/login", { email: staffEmail, password: "Passw0rd!" });

const beer = (await admin("POST", "/api/reborn/admin/pos/products", { name: "Line Beer " + tag, category: "Beer", price: 100000, cost: 40000, stock: 50 })).json;
const order = (await admin("POST", "/api/reborn/pos/orders", { tableNumber: "E" + tag.slice(-3) })).json.order;
await admin("POST", `/api/reborn/pos/orders/${order.id}/items`, { items: [{ productId: beer.id, qty: 2 }] });
const lineId = (await db.query("SELECT id FROM pos_ticket_items WHERE order_id=$1", [order.id])).rows[0].id;
const line = async () => (await db.query("SELECT price, qty, line_total FROM pos_ticket_items WHERE id=$1", [lineId])).rows[0];
const total = async () => Number((await db.query("SELECT total FROM pos_tickets WHERE id=$1", [order.id])).rows[0].total);

let r = await staff("POST", `/api/reborn/pos/items/${lineId}/edit`, { price: 100000, discountPercent: 10 });
let l = await line();
check("a cashier can give 10% off one item (90,000 each, line 180,000)", r.status === 200 && Number(l.price) === 90000 && Number(l.line_total) === 180000 && (await total()) === 180000, JSON.stringify([r.status, l]));
r = await staff("POST", `/api/reborn/pos/items/${lineId}/edit`, { price: 100000, discountAmount: 50000 });
l = await line();
check("a cashier can take RP 50,000 off the line (150,000)", r.status === 200 && Number(l.line_total) === 150000 && (await total()) === 150000, JSON.stringify([r.status, l]));
r = await staff("POST", `/api/reborn/pos/items/${lineId}/edit`, { atCost: true });
check("a cashier cannot sell a line at cost", r.status === 403, r.status);
r = await staff("POST", `/api/reborn/pos/items/${lineId}/edit`, { price: 110000 });
l = await line();
check("a cashier can also raise a price", r.status === 200 && Number(l.price) === 110000 && Number(l.line_total) === 220000, JSON.stringify(l));

r = await admin("POST", `/api/reborn/pos/items/${lineId}/edit`, { price: 100000, discountPercent: 10 });
l = await line();
check("10% off one item takes it to 90,000 and the line to 180,000", r.status === 200 && Number(l.price) === 90000 && Number(l.line_total) === 180000 && (await total()) === 180000, JSON.stringify(l));

r = await admin("POST", `/api/reborn/pos/items/${lineId}/edit`, { price: 100000, discountAmount: 50000 });
l = await line();
check("RP 50,000 off the whole line makes it 150,000", r.status === 200 && Number(l.line_total) === 150000 && Number(l.price) === 75000 && (await total()) === 150000, JSON.stringify(l));

r = await admin("POST", `/api/reborn/pos/items/${lineId}/edit`, { atCost: true });
l = await line();
check("at cost the line is the cost of the items (2 × 40,000)", r.status === 200 && Number(l.price) === 40000 && Number(l.line_total) === 80000 && (await total()) === 80000, JSON.stringify(l));

r = await admin("POST", `/api/reborn/pos/items/${lineId}/edit`, { price: 100000, qty: 3 });
l = await line();
check("the price and quantity can be reset to normal", r.status === 200 && Number(l.line_total) === 300000 && l.qty === 3, JSON.stringify(l));

await db.end();
console.log(failures ? `${failures} FAILED` : "ALL PASSED");
process.exit(failures ? 1 : 0);
