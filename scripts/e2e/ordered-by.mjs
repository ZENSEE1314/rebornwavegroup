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
const staffEmail = `waiter${tag}@test.local`;
const staff = makeClient();
await staff("POST", "/api/auth/register", { email: staffEmail, password: "Passw0rd!", firstName: "Waiter", lastName: "Wati", phoneNumber: "0812" + tag.replace(/\D/g, "").padEnd(7, "1").slice(0, 7), dateOfBirth: "1995-01-01", gender: "female" });
await db.query("UPDATE users SET role='staff' WHERE email=$1", [staffEmail]);
await staff("POST", "/api/auth/login", { email: staffEmail, password: "Passw0rd!" });

const item = (await admin("POST", "/api/reborn/admin/pos/products", { name: "By Beer " + tag, category: "Beer", price: 10000, cost: 4000, stock: 50 })).json;
const food = (await admin("POST", "/api/reborn/admin/pos/products", { name: "By Burger " + tag, category: "Main course", price: 30000, cost: 9000, stock: 50 })).json;
const table = "B" + tag.slice(-3);

const order = (await admin("POST", "/api/reborn/pos/orders", { tableNumber: table })).json.order;
await admin("POST", `/api/reborn/pos/orders/${order.id}/items`, { items: [{ productId: item.id, qty: 2 }] });
await staff("POST", `/api/reborn/pos/orders/${order.id}/items`, { items: [{ productId: food.id, qty: 1 }] });

const rows = (await db.query("SELECT id, name, qty, added_by_name, added_at FROM pos_ticket_items WHERE order_id=$1 ORDER BY id", [order.id])).rows;
check("first line is ordered by the first staff member", rows[0]?.added_by_name && rows[0].added_by_name !== "" && rows[0].added_at !== null, JSON.stringify(rows[0]));
check("second line (same table, next staff) is ordered by the other person", rows[1]?.added_by_name === "Waiter Wati", JSON.stringify(rows[1]));
check("the two lines have different ordering staff", rows[0].added_by_name !== rows[1].added_by_name);

const open = (await admin("GET", "/api/reborn/pos/orders?status=open")).json.find((o) => o.id === order.id);
check("the bill's lines carry the name to the screen", open.items.map((i) => i.addedByName).join("|") === `${rows[0].added_by_name}|Waiter Wati`, JSON.stringify(open.items.map((i) => i.addedByName)));

const logs = (await db.query("SELECT description, admin_user_id FROM admin_logs WHERE action='add_items' AND target_id=$1 ORDER BY id", [String(order.id)])).rows;
check("each order is logged with the table, the items and who did it", logs.length === 2 && /Table B/.test(logs[0].description) && /2× By Beer/.test(logs[0].description) && /1× By Burger/.test(logs[1].description), JSON.stringify(logs));
check("each log row belongs to the person who ordered (two different people)", logs[0].admin_user_id !== logs[1].admin_user_id, JSON.stringify(logs.map((l) => l.admin_user_id)));

await staff("POST", `/api/reborn/pos/items/${rows[0].id}/edit`, { qty: 1, reason: "customer changed mind" });
const edit = (await db.query("SELECT description FROM admin_logs WHERE action='edit' AND target_id=$1", [String(rows[0].id)])).rows[0];
check("an edit says who ordered the line and what changed", edit && new RegExp(`ordered by ${rows[0].added_by_name}`).test(edit.description) && /2 × RP 10000\.00 → 1 × RP 10000/.test(edit.description), JSON.stringify(edit));
await staff("POST", `/api/reborn/pos/items/${rows[1].id}/remove`, { reason: "wrong table" });
const removed = (await db.query("SELECT description FROM admin_logs WHERE action='remove' AND target_id=$1", [String(rows[1].id)])).rows[0];
check("a removal keeps who ordered the line even though the line is gone", removed && /ordered by Waiter Wati/.test(removed.description) && /By Burger/.test(removed.description), JSON.stringify(removed));
console.log(failures ? `${failures} FAILED` : "ALL PASSED"); await db.end(); process.exit(failures ? 1 : 0);
