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
const tag = Date.now().toString(36);
const svc = (await call("POST", "/api/reborn/admin/pos/products", { name: "Corkage " + tag, category: "Services", price: 100000, cost: 5000, stock: 7, isService: true })).json;
check("service saved with no cost and no stock", svc.isService === true && Number(svc.cost) === 0 && svc.stock === 0, JSON.stringify(svc));

let r = await call("GET", "/api/reborn/pos/products");
const listed = r.json.find((p) => p.id === svc.id);
check("POS list: service is never sold out", listed && listed.isService && listed.soldOut === false, JSON.stringify(listed));
r = await call("GET", "/api/reborn/shop/products");
check("member list shows the service though stock is 0", r.json.some((p) => p.id === svc.id), "");
r = await call("GET", "/api/reborn/admin/inventory");
check("service is not in Inventory", !r.json.items.some((i) => i.id === svc.id), "");
r = await call("GET", "/api/reborn/pos/stock");
check("service is not in the POS stock list", !r.json.some((p) => p.id === svc.id), "");

r = await call("POST", "/api/reborn/pos/orders", { tableNumber: "S" + tag.slice(-2) }); const oid = r.json.order.id;
r = await call("POST", `/api/reborn/pos/orders/${oid}/items`, { items: [{ productId: svc.id, qty: 3 }] });
check("can add 3 although stock is 0", r.status === 200, JSON.stringify(r.json));
const item = await one("SELECT id, line_total FROM pos_ticket_items WHERE order_id=$1", [oid]);
check("bill counts 3 × 100000", Number(item.line_total) === 300000, JSON.stringify(item));
check("no stock movement was written", Number((await one("SELECT count(*) n FROM stock_movements WHERE product_id=$1", [svc.id])).n) === 0);
check("stock stays 0", (await one("SELECT stock FROM pos_products WHERE id=$1", [svc.id])).stock === 0);
await call("POST", `/api/reborn/pos/items/${item.id}/status`, { status: "rejected", reason: "test" });
check("rejecting it does not create stock", (await one("SELECT stock FROM pos_products WHERE id=$1", [svc.id])).stock === 0);
console.log(failures ? `${failures} FAILED` : "ALL PASSED"); await db.end(); process.exit(failures ? 1 : 0);
