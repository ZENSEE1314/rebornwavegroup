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
const one = async (sql, args = []) => (await db.query(sql, args)).rows[0];

await call("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });
await db.query("DELETE FROM pos_products WHERE name='Test Wine'").catch(() => {});
const wine = (await call("POST", "/api/reborn/admin/pos/products", { name: "Test Wine", category: "Wine", price: 90000, cost: 40000, stock: 10 })).json;

// stock-in with a past delivery date
const past = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
let r = await call("POST", "/api/reborn/pos/stock-in", { productId: wine.id, qty: 6, unitCost: 41000, supplier: "Wine Co", receivedAt: past });
check("stock-in with past date accepted", r.status === 200, JSON.stringify(r.json));
const mv = await one("SELECT created_at, supplier FROM stock_movements WHERE product_id=$1 AND reason='stock_in' ORDER BY id DESC LIMIT 1", [wine.id]);
check("movement carries the delivery time and supplier", Math.abs(Date.now() - new Date(mv.created_at).getTime() - 3 * 86400000) < 24 * 3600 * 1000 && mv.supplier === "Wine Co", JSON.stringify(mv));
const led = await one("SELECT created_at FROM ledger_entries WHERE category='purchase' AND note LIKE '%Test Wine%' ORDER BY id DESC LIMIT 1");
check("purchase expense is dated the delivery time", led && Math.abs(Date.now() - new Date(led.created_at).getTime() - 3 * 86400000) < 24 * 3600 * 1000, JSON.stringify(led));
r = await call("POST", "/api/reborn/pos/stock-in", { productId: wine.id, qty: 1, receivedAt: new Date(Date.now() + 86400000).toISOString() });
check("future date refused", r.status === 400, r.status);
r = await call("POST", "/api/reborn/pos/stock-in", { productId: wine.id, qty: 1, receivedAt: new Date(Date.now() - 400 * 86400000).toISOString() });
check("older than a year refused", r.status === 400, r.status);
r = await call("POST", "/api/reborn/pos/stock-in", { productId: wine.id, qty: 2 });
check("no date = now", r.status === 200, r.status);

// lose an item
r = await call("POST", "/api/reborn/pos/orders", { tableNumber: "9" }); const orderId = r.json.order.id;
await call("POST", `/api/reborn/pos/orders/${orderId}/items`, { items: [{ productId: wine.id, qty: 2 }] });
const item = await one("SELECT id FROM pos_ticket_items WHERE order_id=$1", [orderId]);
const stockBefore = (await one("SELECT stock FROM pos_products WHERE id=$1", [wine.id])).stock;
r = await call("POST", `/api/reborn/pos/items/${item.id}/lose`, { reason: "spilled" });
check("lose accepted", r.status === 200, JSON.stringify(r.json));
check("ticket total drops to 0", Number((await one("SELECT total FROM pos_tickets WHERE id=$1", [orderId])).total) === 0);
const loss = await one("SELECT amount FROM ledger_entries WHERE category='loss' ORDER BY id DESC LIMIT 1");
check("loss expense = cost × qty (80000)", Number(loss?.amount) === 80000, JSON.stringify(loss));
await call("POST", `/api/reborn/pos/orders/${orderId}/cancel`);
check("cancel does not give lost stock back", (await one("SELECT stock FROM pos_products WHERE id=$1", [wine.id])).stock === stockBefore);
r = await call("POST", `/api/reborn/pos/items/${item.id}/lose`, {});
check("second lose refused", r.status === 400, r.status);
console.log(failures ? `${failures} FAILED` : "ALL PASSED");
await db.end(); process.exit(failures ? 1 : 0);
