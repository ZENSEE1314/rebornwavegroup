import pg from "pg";
const BASE = "http://127.0.0.1:3999";
let cookie = "";
let failures = 0;
async function call(method, path, body) {
  const res = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
  const set = res.headers.getSetCookie?.() || [];
  if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
  const buf = Buffer.from(await res.arrayBuffer());
  const type = res.headers.get("content-type") || "";
  let json = null; if (type.includes("json")) { try { json = JSON.parse(buf.toString()); } catch { /* not json */ } }
  return { status: res.status, json, type, size: buf.length, head: buf.subarray(0, 5).toString() };
}
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  → " + extra)); if (!ok) failures++; };
const db = new pg.Client({ connectionString: "postgres://postgres:pw@127.0.0.1:54329/reborn" }); await db.connect();
const one = async (sql, args = []) => (await db.query(sql, args)).rows[0];

let r = await call("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });
check("login", r.status === 200, JSON.stringify(r.json));
const adminId = (await call("GET", "/api/auth/user")).json.id;

// ---- products
const make = async (b) => (await call("POST", "/api/reborn/admin/pos/products", b)).json;
const beer = await make({ name: "Bintang Beer", category: "Beer", price: 30000, cost: 13750, stock: 50 });
const burger = await make({ name: "Burger", category: "Main course", price: 50000, cost: 20000, stock: 20 });
const free = await make({ name: "Free item", category: "Main course", price: 0, stock: 10 });
check("products created", beer?.id && burger?.id && free?.id, JSON.stringify([beer, burger]));
r = await call("GET", "/api/reborn/shop/products");
check("member list hides price-0 item", r.status === 200 && !r.json.some((p) => p.name === "Free item") && r.json.some((p) => p.name === "Burger"), JSON.stringify(r.json?.map?.((p) => p.name)));

// ---- bundle: 6 beers
const bundle = await make({ name: "Bintang ×6", category: "Beer", price: 150000, bundleItemId: beer.id, bundleQty: 6 });
check("bundle created with its item + cost auto", bundle?.bundleItemId === beer.id && bundle?.bundleQty === 6 && Number(bundle.cost) === 82500, JSON.stringify(bundle));
r = await call("GET", "/api/reborn/pos/products");
check("bundle stock = whole bundles (50/6 = 8)", r.json.find((p) => p.id === bundle.id)?.stock === 8, JSON.stringify(r.json.find((p) => p.id === bundle.id)));
r = await call("POST", "/api/reborn/admin/pos/products", { name: "Bad bundle", price: 1, bundleItemId: bundle.id, bundleQty: 3 });
check("a bundle of a bundle is refused", r.status === 400, r.status);
r = await call("GET", "/api/reborn/admin/inventory");
check("inventory leaves bundles out", !r.json.items.some((i) => i.id === bundle.id), "");

// ---- quick sale of one bundle, then the same offline id again
const sale = (extra = {}) => call("POST", "/api/reborn/pos/sale", { paymentMethod: "cash", cashReceived: 200000, items: [{ productId: bundle.id, qty: 1 }], ...extra });
r = await sale({ offlineId: "off-1", offlineAt: new Date(Date.now() - 3600_000).toISOString() });
check("offline sale accepted", r.status === 200 && !r.json.duplicate, JSON.stringify(r.json)?.slice(0, 200));
check("sale took 6 off the beer", (await one("select stock from pos_products where id=$1", [beer.id])).stock === 44, "");
const ticket = await one("select * from pos_tickets where offline_id='off-1'");
check("ticket booked at the sale time (about 1h ago)", ticket && Date.now() - new Date(ticket.paid_at).getTime() > 3000_000, ticket?.paid_at);
r = await sale({ offlineId: "off-1" });
check("same offline id is not a second sale", r.status === 200 && r.json.duplicate === true, JSON.stringify(r.json)?.slice(0, 120));
check("stock unchanged after the repeat", (await one("select stock from pos_products where id=$1", [beer.id])).stock === 44, "");
check("only one ticket for it", Number((await one("select count(*) c from pos_tickets where offline_id='off-1'")).c) === 1, "");
check("movement written on the beer", !!(await one("select 1 x from stock_movements where product_id=$1 and delta=-6", [beer.id])), "");

// ---- table order → kitchen
r = await call("POST", "/api/reborn/pos/orders", { tableNumber: "5" });
const orderId = r.json.order.id;
r = await call("POST", `/api/reborn/pos/orders/${orderId}/items`, { items: [{ productId: burger.id, qty: 2 }, { productId: beer.id, qty: 3 }] });
check("items added to table 5", r.status === 200, JSON.stringify(r.json));
const stations = (await db.query("select name, station from pos_ticket_items where order_id=$1 order by id", [orderId])).rows;
check("burger→kitchen, beer→bar", stations.find((s) => s.name === "Burger")?.station === "kitchen" && stations.find((s) => s.name === "Bintang Beer")?.station === "bar", JSON.stringify(stations));
r = await call("GET", "/api/reborn/kitchen/orders?station=bar");
check("bar screen lists only the beer", r.status === 200 && r.json.length === 1 && r.json[0].items.length === 1 && r.json[0].items[0].name === "Bintang Beer", JSON.stringify(r.json));
const before = Number((await one("select count(*) c from pos_ticket_items where printed_at is null and order_id=$1", [orderId])).c);
r = await call("POST", "/api/reborn/kitchen/claim", { station: "kitchen" });
check("kitchen claim hands out the burger once", r.status === 200 && r.json.orders.length === 1 && r.json.orders[0].items[0].name === "Burger", JSON.stringify(r.json));
r = await call("POST", "/api/reborn/kitchen/claim", { station: "kitchen" });
check("second claim is empty", r.json.orders.length === 0, JSON.stringify(r.json));
r = await call("POST", "/api/reborn/kitchen/claim", { station: "all" });
check("'all' still gets the beer (not yet printed)", r.json.orders.length === 1 && r.json.orders[0].items[0].name === "Bintang Beer", JSON.stringify(r.json));
const burgerItem = (await one("select id from pos_ticket_items where order_id=$1 and name='Burger'", [orderId])).id;
r = await call("POST", `/api/reborn/pos/items/${burgerItem}/status`, { status: "served" });
check("serve the burger", r.status === 200, JSON.stringify(r.json));
r = await call("GET", "/api/reborn/kitchen/orders?station=all");
check("served item leaves the screen", r.json[0]?.items.length === 1 && r.json[0].items[0].name === "Bintang Beer", JSON.stringify(r.json));
check("burger line has station + printed_at set", !!(await one("select 1 x from pos_ticket_items where id=$1 and printed_at is not null", [burgerItem])), "");
// cancel order → bundle-free stock returns
r = await call("POST", `/api/reborn/pos/orders/${orderId}/cancel`);
check("cancel order restores the beer (44 → 47 after -3 +3)", (await one("select stock from pos_products where id=$1", [beer.id])).stock === 44, JSON.stringify(await one("select stock from pos_products where id=$1", [beer.id])));
// refund the bundle sale
r = await call("POST", `/api/reborn/pos/orders/${ticket.id}/refund`, { reason: "test" });
check("refund of the bundle puts 6 back", r.status === 200 && (await one("select stock from pos_products where id=$1", [beer.id])).stock === 50, `${r.status} ${JSON.stringify(r.json)?.slice(0, 120)} stock=${(await one("select stock from pos_products where id=$1", [beer.id])).stock}`);

// ---- recommended
r = await call("PATCH", `/api/reborn/admin/pos/products/${beer.id}`, { recommended: true });
r = await call("GET", "/api/reborn/shop/products");
check("recommended flag reaches the member list", r.json.find((p) => p.id === beer.id)?.recommended === true, "");

// ---- member app order auto-accept
r = await call("POST", "/api/reborn/shop/order", { tableNumber: "7", items: [{ productId: burger.id, qty: 1 }] });
check("member order accepted straight away", r.status === 200 && (await one("select status from pos_ticket_items where name='Burger' order by id desc limit 1")).status === "accepted", JSON.stringify(r.json)?.slice(0, 150));

console.log(failures ? `\n${failures} FAILED` : "\nALL PASSED");
await db.end();
