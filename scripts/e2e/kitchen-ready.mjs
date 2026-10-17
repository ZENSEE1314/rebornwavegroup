import pg from "pg";
const BASE = "http://127.0.0.1:3999";
let cookie = ""; let failures = 0;
async function call(method, path, body) {
  const res = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
  const set = res.headers.getSetCookie?.() || []; if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
  const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json };
}
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  → " + extra)); if (!ok) failures++; };
const db = new pg.Client({ connectionString: "postgres://postgres:pw@127.0.0.1:54329/reborn" }); await db.connect();
await call("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });
const tag = Date.now().toString(36);
const dish = (await call("POST", "/api/reborn/admin/pos/products", { name: "Ready Dish " + tag, category: "Main course", price: 50000, cost: 20000, stock: 9 })).json;
let r = await call("POST", "/api/reborn/pos/orders", { tableNumber: "R" + tag.slice(-2) }); const oid = r.json.order.id;
await call("POST", `/api/reborn/pos/orders/${oid}/items`, { items: [{ productId: dish.id, qty: 2 }] });
const item = (await db.query("SELECT id FROM pos_ticket_items WHERE order_id=$1", [oid])).rows[0];
r = await call("GET", "/api/reborn/kitchen/orders?station=all");
check("kitchen sees the accepted item", r.json.some((o) => o.items.some((i) => i.id === item.id)));
r = await call("POST", `/api/reborn/pos/items/${item.id}/status`, { status: "ready" });
check("kitchen marks it ready", r.status === 200, JSON.stringify(r.json));
r = await call("GET", "/api/reborn/kitchen/orders?station=all");
check("ready item leaves the kitchen screen", !r.json.some((o) => o.items.some((i) => i.id === item.id)));
r = await call("GET", "/api/reborn/pos/ready-items");
check("staff list has it (name, qty, table)", r.json.some((i) => i.id === item.id && i.qty === 2 && i.tableNumber), JSON.stringify(r.json));
check("the staff list says who made it ready", r.json.find((i) => i.id === item.id)?.readyByName, JSON.stringify(r.json));
check("bill total still counts it", Number((await db.query("SELECT total FROM pos_tickets WHERE id=$1", [oid])).rows[0].total) === 100000);
r = await call("POST", `/api/reborn/pos/items/${item.id}/status`, { status: "served" });
r = await call("GET", "/api/reborn/pos/ready-items");
check("collecting records who served it", (await db.query("SELECT served_by_name, ready_by_name FROM pos_ticket_items WHERE id=$1", [item.id])).rows[0].served_by_name, "");
check("collected: gone from the staff list and served", !r.json.some((i) => i.id === item.id) && (await db.query("SELECT status, served_at FROM pos_ticket_items WHERE id=$1", [item.id])).rows[0].status === "served");
console.log(failures ? `${failures} FAILED` : "ALL PASSED"); await db.end(); process.exit(failures ? 1 : 0);
