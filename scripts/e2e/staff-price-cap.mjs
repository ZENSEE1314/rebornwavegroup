// Staff price with a monthly cap, names from a list, admin-added item commission and the menu order. Run against the local test server (see README.md).
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
const staffEmail = `cap${tag}@test.local`;
const staff = makeClient();
await staff("POST", "/api/auth/register", { email: staffEmail, password: "Passw0rd!", firstName: "Cap", lastName: "Staff", phoneNumber: "0817" + tag.replace(/\D/g, "").padEnd(7, "6").slice(0, 7), dateOfBirth: "1995-01-01", gender: "female" });
await db.query("UPDATE users SET role='staff' WHERE email=$1", [staffEmail]);
await staff("POST", "/api/auth/login", { email: staffEmail, password: "Passw0rd!" });
const staffId = (await db.query("SELECT id FROM users WHERE email=$1", [staffEmail])).rows[0].id;

await admin("POST", "/api/reborn/admin/settings", { serviceFeePercent: 10, taxPercent: 11 });
const beer = (await admin("POST", "/api/reborn/admin/pos/products", { name: "Cap Beer " + tag, category: "Beer", price: 100000, cost: 40000, stock: 50 })).json;
const items = [{ productId: beer.id, price: 100000, qty: 2 }];
const price = (mode) => ({ mode, who: "staff", name: "Cap Staff", userId: staffId });

let r = await staff("PUT", "/api/reborn/admin/staff-price-caps", { defaultCap: 1 });
check("a cashier cannot change the caps", r.status === 403, r.status);
r = await admin("PUT", "/api/reborn/admin/staff-price-caps", { defaultCap: 150000, discountPercent: 10, perPerson: {} });
check("the main admin saves the monthly cap", r.status === 200 && r.json.defaultCap === 150000, JSON.stringify(r.json));

r = await staff("GET", "/api/reborn/pos/staff-price-people");
const me = r.json?.people?.find((p) => p.id === staffId);
check("the names list has the staff member with the cap and nothing used yet", r.status === 200 && me && me.cap === 150000 && me.spent === 0 && me.isCapReached === false, JSON.stringify(r.json));

r = await staff("POST", "/api/reborn/pos/quote", { items, staffPrice: price("half") });
check("under the cap the staff price applies: 50% off, no fees", r.status === 200 && r.json.total === 100000 && r.json.serviceFee === 0 && r.json.tax === 0, JSON.stringify(r.json));

r = await admin("POST", "/api/reborn/pos/sale", { items, paymentMethod: "cash", cashReceived: 100000, staffPrice: price("half") });
check("the first staff-price bill is paid", r.status === 200, JSON.stringify(r.json));
const first = (await db.query("SELECT staff_price_user_id, staff_price_mode, subtotal FROM pos_tickets ORDER BY id DESC LIMIT 1")).rows[0];
check("the bill keeps who it was for and the mode", first.staff_price_user_id === staffId && first.staff_price_mode === "half" && Number(first.subtotal) === 200000, JSON.stringify(first));

r = await staff("GET", "/api/reborn/pos/staff-price-people");
const used = r.json?.people?.find((p) => p.id === staffId);
check("the cap counts the receipt price before discount and is now reached", used && used.spent === 200000 && used.isCapReached === true, JSON.stringify(used));

r = await staff("POST", "/api/reborn/pos/quote", { items, staffPrice: price("cost") });
check("after the cap the bill is the normal price less 10%, with service fee and tax", r.status === 200 && r.json.discount === 20000 && r.json.serviceFee === 18000 && r.json.tax === 19800 && r.json.total === 217800, JSON.stringify(r.json));

r = await admin("POST", "/api/reborn/pos/sale", { items, paymentMethod: "cash", cashReceived: 217800, staffPrice: price("half") });
const second = (await db.query("SELECT staff_price_mode, discount_reason, total FROM pos_tickets ORDER BY id DESC LIMIT 1")).rows[0];
check("the discounted bill is saved as the staff discount and says the cap was reached", r.status === 200 && second.staff_price_mode === "percent" && /cap reached/.test(second.discount_reason || "") && Number(second.total) === 217800, JSON.stringify([r.status, second]));

r = await staff("GET", "/api/reborn/pos/staff-price-people");
check("a staff-discount bill does not use up the cap", r.json?.people?.find((p) => p.id === staffId)?.spent === 200000, JSON.stringify(r.json));

r = await admin("PUT", "/api/reborn/admin/staff-price-caps", { defaultCap: 150000, discountPercent: 10, perPerson: { [staffId]: 0 } });
r = await staff("POST", "/api/reborn/pos/quote", { items, staffPrice: price("half") });
check("a personal cap of 0 means no limit for that person", r.status === 200 && r.json.total === 100000, JSON.stringify(r.json));

// ── admin adds a commission to a bill line ──
const order = (await admin("POST", "/api/reborn/pos/orders", { tableNumber: "C" + tag.slice(-3) })).json.order;
await admin("POST", `/api/reborn/pos/orders/${order.id}/items`, { items: [{ productId: beer.id, qty: 1 }] });
r = await admin("POST", `/api/reborn/pos/orders/${order.id}/pay`, { paymentMethod: "cash", cashReceived: 150000 });
check("a normal table bill is paid", r.status === 200, JSON.stringify(r.json));
r = await admin("GET", `/api/reborn/admin/item-commissions?ticketId=${order.id}`);
const lineId = r.json?.items?.[0]?.id;
check("the bill's own items are listed for the admin", r.status === 200 && r.json.items.length === 1 && r.json.rows.length === 0, JSON.stringify(r.json));
r = await staff("POST", "/api/reborn/admin/item-commissions", { itemId: lineId, userId: staffId, percent: 10 });
check("a cashier cannot add a commission", r.status === 403, r.status);
r = await admin("POST", "/api/reborn/admin/item-commissions", { itemId: lineId, userId: staffId, percent: 10 });
check("the admin adds a commission to a line that had none", r.status === 200, JSON.stringify(r.json));
r = await admin("GET", `/api/reborn/admin/item-commissions?ticketId=${order.id}`);
check("a 10% commission added by the admin is 10% of the line and belongs to that person", r.json?.rows?.length === 1 && r.json.rows[0].userId === staffId && Number(r.json.rows[0].amount) === Number(r.json.rows[0].base) * 0.1, JSON.stringify(r.json));

// ── menu: category order + logo field ──
r = await admin("PUT", "/api/reborn/admin/menu-category-order", { order: ["Beer", "Food"] });
check("the admin saves the order of the menu categories", r.status === 200 && r.json.order.join() === "Beer,Food", JSON.stringify(r.json));
r = await admin("GET", "/api/reborn/pos/menu-info");
check("the menu info carries the saved order and the logo field", r.status === 200 && r.json.categoryOrder.join() === "Beer,Food" && "logoUrl" in r.json, JSON.stringify(r.json));

await db.end();
console.log(failures ? `FAILED: ${failures}` : "ALL PASSED");
process.exit(failures ? 1 : 0);
