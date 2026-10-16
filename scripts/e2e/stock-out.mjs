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
const item = (await call("POST", "/api/reborn/admin/pos/products", { name: "Out Beer " + tag, category: "Beer", price: 30000, cost: 10000, stock: 10 })).json;
const stockOf = async () => (await one("SELECT stock FROM pos_products WHERE id=$1", [item.id])).stock;

let r = await call("POST", "/api/reborn/pos/stock-in", { productId: item.id, qty: -2 });
check("taking stock out without a reason is refused", r.status === 400 && (await stockOf()) === 10, r.status);
const earlier = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString();
r = await call("POST", "/api/reborn/pos/stock-in", { productId: item.id, qty: -3, reason: "Damaged / broken", note: "dropped crate", receivedAt: earlier });
check("take out 3 with a reason and a date", r.status === 200 && (await stockOf()) === 7, JSON.stringify(r.json));
const mv = await one("SELECT delta, reason, note, created_at FROM stock_movements WHERE product_id=$1 ORDER BY id DESC LIMIT 1", [item.id]);
check("movement keeps reason + note and the chosen time", mv.delta === -3 && mv.note === "Damaged / broken: dropped crate" && Date.now() - new Date(mv.created_at).getTime() > 12 * 3600 * 1000, JSON.stringify(mv));
const loss = await one("SELECT amount FROM ledger_entries WHERE category='loss' AND ref_type='stock_out' ORDER BY id DESC LIMIT 1");
check("a loss of 3 x cost (30000) is booked", Number(loss?.amount) === 30000, JSON.stringify(loss));
r = await call("POST", "/api/reborn/pos/stock-in", { productId: item.id, qty: -1, reason: "Count correction" });
const losses = (await db.query("SELECT count(*) n FROM ledger_entries WHERE category='loss' AND ref_type='stock_out' AND note LIKE $1", ["%" + item.name + "%"])).rows[0].n;
check("count correction changes stock but books no loss", r.status === 200 && (await stockOf()) === 6 && Number(losses) === 1, losses);
r = await call("POST", "/api/reborn/pos/stock-in", { productId: item.id, qty: -50, reason: "Expired" });
check("cannot take out more than is in stock", r.status === 400 && (await stockOf()) === 6, r.status + JSON.stringify(r.json));
r = await call("POST", "/api/reborn/pos/stock-in", { productId: item.id, qty: 4, supplier: "Sup A", unitCost: 11000, receivedAt: earlier });
check("adding stock with a date still works", r.status === 200 && (await stockOf()) === 10);
console.log(failures ? `${failures} FAILED` : "ALL PASSED"); await db.end(); process.exit(failures ? 1 : 0);
