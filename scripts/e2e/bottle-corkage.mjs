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
const corkage = (await call("POST", "/api/reborn/admin/pos/products", { name: "Corkage " + tag, category: "Services", price: 150000, isService: true })).json;
const beer = (await call("POST", "/api/reborn/admin/pos/products", { name: "Not a service " + tag, category: "Beer", price: 30000, stock: 5 })).json;
const table = "C" + tag.slice(-3);
const body = (extra) => ({ memberCode: "admin@test.local", type: "wine", name: "My Own Wine", quantity: 2, photoUrl: "data:image/png;base64,AAAA", isOwn: true, ...extra });

let r = await call("POST", "/api/reborn/pos/bottle-keep", body({ corkage: { productId: corkage.id } }));
check("corkage without a table is refused", r.status === 400, r.status + JSON.stringify(r.json));
r = await call("POST", "/api/reborn/pos/bottle-keep", body({ corkage: { productId: beer.id, tableNumber: table } }));
check("a normal item cannot be used as corkage", r.status === 400, r.status);
const before = Number((await one("SELECT count(*) n FROM bottle_keeps")).n);
check("nothing was stored by the refused calls", before === Number((await one("SELECT count(*) n FROM bottle_keeps")).n));

r = await call("POST", "/api/reborn/pos/bottle-keep", body({ corkage: { productId: corkage.id, tableNumber: table } }));
check("own bottle kept with corkage", r.status === 200, JSON.stringify(r.json));
const keep = await one("SELECT name, quantity, note FROM bottle_keeps ORDER BY id DESC LIMIT 1");
check("bottle saved as the customer's own", keep.name === "My Own Wine" && keep.quantity === 2 && /Own bottle/.test(keep.note || ""), JSON.stringify(keep));
const ticket = await one("SELECT id, total FROM pos_tickets WHERE table_number=$1 AND status='open'", [table]);
check("corkage on the table bill: 2 bottles x 150000", ticket && Number(ticket.total) === 300000, JSON.stringify(ticket));
const line = await one("SELECT name, qty, price FROM pos_ticket_items WHERE order_id=$1", [ticket.id]);
check("the line is the service, qty 2", line.name === corkage.name && line.qty === 2, JSON.stringify(line));
check("no stock written for the service", Number((await one("SELECT count(*) n FROM stock_movements WHERE product_id=$1", [corkage.id])).n) === 0);

r = await call("POST", "/api/reborn/pos/bottle-keep", body({ name: "Bring Your Own", quantity: 1 }));
check("own bottle without corkage works and adds no bill line", r.status === 200 && Number((await one("SELECT total FROM pos_tickets WHERE id=$1", [ticket.id])).total) === 300000, JSON.stringify(r.json));
console.log(failures ? `${failures} FAILED` : "ALL PASSED"); await db.end(); process.exit(failures ? 1 : 0);
