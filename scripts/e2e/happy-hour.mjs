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
await call("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });
const mk = async (b) => (await call("POST", "/api/reborn/admin/pos/products", b)).json;
const hhmm = (offMin) => { const d = new Date(Date.now() + offMin * 60000); const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d); return p; };
const tag = Date.now().toString(36);
const inside = await mk({ name: "HH Inside " + tag, category: "Beer", price: 30000, cost: 10000, stock: 10, happyStart: hhmm(-60), happyEnd: hhmm(60), happyPrice: 20000 });
const only = await mk({ name: "HH Only Out " + tag, category: "Beer", price: 40000, cost: 10000, stock: 10, happyStart: hhmm(120), happyEnd: hhmm(180), happyOnly: true });
const plain = await mk({ name: "HH Plain " + tag, category: "Beer", price: 25000, cost: 10000, stock: 10 });
check("window saved", inside.happyStart && inside.happyPrice === "20000.00", JSON.stringify(inside));
let r = await call("GET", "/api/reborn/pos/products");
const get = (id) => r.json.find((p) => p.id === id);
check("POS list: happy price now, regular price kept", get(inside.id).salePrice === "20000" && Number(get(inside.id).price) === 30000 && get(inside.id).happyNow, JSON.stringify(get(inside.id)));
check("only-in-window item is off hours (soldOut)", get(only.id).offHours && get(only.id).soldOut, JSON.stringify(get(only.id)));
check("plain item untouched", get(plain.id).salePrice === "25000" && !get(plain.id).offHours);
r = await call("GET", "/api/reborn/shop/products");
check("member list: happy price shown, off-hours item hidden", r.json.find((p) => p.id === inside.id)?.price === "20000" && !r.json.some((p) => p.id === only.id), JSON.stringify(r.json.map((p) => p.name)));
r = await call("POST", "/api/reborn/pos/orders", { tableNumber: "H1" }); const oid = r.json.order.id;
r = await call("POST", `/api/reborn/pos/orders/${oid}/items`, { items: [{ productId: only.id, qty: 1 }] });
check("ordering an off-hours item is refused", r.status === 400, r.status + JSON.stringify(r.json));
r = await call("POST", `/api/reborn/pos/orders/${oid}/items`, { items: [{ productId: inside.id, qty: 2 }] });
const db = new pg.Client({ connectionString: "postgres://postgres:pw@127.0.0.1:54329/reborn" }); await db.connect();
const row = (await db.query("SELECT price, line_total FROM pos_ticket_items WHERE order_id=$1", [oid])).rows[0];
check("line is charged the happy price (2 × 20000)", Number(row?.price) === 20000 && Number(row?.line_total) === 40000, JSON.stringify(row));
r = await call("PATCH", `/api/reborn/admin/pos/products/${inside.id}`, { happyStart: "", happyEnd: "" });
check("clearing the times removes the happy hour", r.json.happyStart === null && r.json.happyPrice === null && r.json.happyOnly === false, JSON.stringify(r.json));
console.log(failures ? `${failures} FAILED` : "ALL PASSED"); await db.end(); process.exit(failures ? 1 : 0);
