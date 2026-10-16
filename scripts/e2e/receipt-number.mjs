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
const item = (await call("POST", "/api/reborn/admin/pos/products", { name: "Num Beer " + tag, category: "Beer", price: 10000, cost: 4000, stock: 50 })).json;

const paid = [];
for (let i = 1; i <= 3; i++) {
  const table = `N${i}${tag.slice(-2)}`;
  const o = (await call("POST", "/api/reborn/pos/orders", { tableNumber: table })).json.order;
  await call("POST", `/api/reborn/pos/orders/${o.id}/items`, { items: [{ productId: item.id, qty: i }] });
  const r = await call("POST", `/api/reborn/pos/orders/${o.id}/pay`, { paymentMethod: "cash", cashReceived: 100000 });
  paid.push({ id: o.id, res: r });
  check(`customer ${i} paid`, r.status === 200, JSON.stringify(r.json).slice(0, 160));
}
const today = new Date(Date.now() - 3600 * 1000).toISOString().slice(0, 10); // same rule as the venue day: 08:00 start (UTC clock is close enough for the date check)
const seqs = paid.map((p) => p.res.json?.order?.receiptSeq);
check("pay responses carry consecutive numbers", seqs[1] === seqs[0] + 1 && seqs[2] === seqs[1] + 1, JSON.stringify(seqs));
check("pay response carries the venue-day date", /^\d{4}-\d{2}-\d{2}$/.test(paid[0].res.json?.order?.receiptDay || ""), paid[0].res.json?.order?.receiptDay);

const history = (await call("GET", "/api/reborn/pos/orders?status=paid")).json;
const byId = new Map(history.map((o) => [o.id, o]));
check("sales history shows the same numbers", paid.every((p, i) => byId.get(p.id)?.receiptSeq === seqs[i] && byId.get(p.id)?.receiptDay === paid[0].res.json.order.receiptDay), JSON.stringify(paid.map((p) => byId.get(p.id)?.receiptSeq)));
const open = (await call("GET", "/api/reborn/pos/orders?status=open")).json;
check("open bills have no number yet", open.every((o) => o.receiptSeq === undefined || o.receiptSeq === null), "");

// a quick sale (no table) is a customer too
const sale = await call("POST", "/api/reborn/pos/sale", { paymentMethod: "cash", cashReceived: 100000, items: [{ productId: item.id, qty: 1, price: 10000 }] });
check("a quick sale is the next number", sale.status === 200 && sale.json?.order?.receiptSeq === seqs[2] + 1, JSON.stringify(sale.json?.order?.receiptSeq) + " / " + sale.status);
console.log(failures ? `${failures} FAILED` : "ALL PASSED"); await db.end(); process.exit(failures ? 1 : 0);
