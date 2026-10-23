// Staff commission on items (ladies drinks): rule on the item, who earns it picked on the bill line, booked when paid, in payroll, cancelled by a refund. Run against the local test server (see README.md).
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

const makeStaff = async (label) => {
  const email = `ic${label.toLowerCase()}${tag}@test.local`;
  const client = makeClient();
  const reg = await client("POST", "/api/auth/register", { email, password: "Passw0rd!", firstName: "Lady" + label, lastName: "Test", phoneNumber: "0819" + (label === "A" ? "11" : "22") + tag.replace(/\D/g, "").padEnd(5, "5").slice(0, 5), dateOfBirth: "1995-01-01", gender: "female" });
  await db.query("UPDATE users SET role='staff' WHERE email=$1", [email]);
  const found = (await db.query("SELECT id FROM users WHERE email=$1", [email])).rows[0]; if (!found) throw new Error("sign-up failed: " + JSON.stringify(reg.json)); return { id: found.id, client, reg: reg.status };
};
const ladyA = await makeStaff("A");
const ladyB = await makeStaff("B");
const rows = async (ticketId) => (await db.query("SELECT user_id, amount::float a, voided_at FROM staff_item_commissions WHERE ticket_id=$1 ORDER BY id", [ticketId])).rows;

const drink = (await admin("POST", "/api/reborn/admin/pos/products", { name: "Lady Drink " + tag, category: "Ladies", price: 200000, cost: 50000, stock: 50, staffCommissionKind: "percent", staffCommissionValue: 20 })).json;
const plain = (await admin("POST", "/api/reborn/admin/pos/products", { name: "Plain Beer " + tag, category: "Beer", price: 50000, cost: 20000, stock: 50 })).json;
const saved = (await db.query("SELECT staff_commission_kind k, staff_commission_value::float v FROM pos_products WHERE id=$1", [drink.id])).rows[0];
check("the admin sets a percent rule on the item", saved.k === "percent" && saved.v === 20, JSON.stringify(saved));
let r = await admin("PATCH", `/api/reborn/admin/pos/products/${drink.id}`, { staffCommissionKind: "bonus", staffCommissionValue: 5 });
check("an unknown kind clears the rule", (await db.query("SELECT staff_commission_kind k FROM pos_products WHERE id=$1", [drink.id])).rows[0].k === null);
await admin("PATCH", `/api/reborn/admin/pos/products/${drink.id}`, { staffCommissionKind: "percent", staffCommissionValue: 20 });

// a table bill: 2 drinks to lady A, 1 plain beer
const table = `L${tag}`.slice(0, 7);
const order = (await admin("POST", "/api/reborn/pos/orders", { tableNumber: table })).json.order;
await admin("POST", `/api/reborn/pos/orders/${order.id}/items`, { items: [{ productId: drink.id, qty: 2 }, { productId: plain.id, qty: 1 }] });
const lines = (await db.query("SELECT id, product_id FROM pos_ticket_items WHERE order_id=$1", [order.id])).rows;
const drinkLine = lines.find((l) => l.product_id === drink.id);
r = await admin("POST", `/api/reborn/pos/items/${drinkLine.id}/commission-staff`, { staffId: ladyA.id });
check("a staff member is picked for the line", r.status === 200 && r.json.staffId === ladyA.id, JSON.stringify(r));
r = await admin("POST", `/api/reborn/pos/items/${drinkLine.id}/commission-staff`, { staffId: "no-such-user" });
check("someone who is not staff is refused", r.status === 400, String(r.status));
const plainCashier = makeClient();
r = await plainCashier("POST", `/api/reborn/pos/items/${drinkLine.id}/commission-staff`, { staffId: ladyA.id });
check("a person not logged in cannot pick", r.status === 401 || r.status === 403, String(r.status));
r = await admin("POST", `/api/reborn/pos/orders/${order.id}/pay`, { paymentMethod: "cash", cashReceived: 10_000_000 });
check("the bill is paid", r.status === 200, JSON.stringify(r).slice(0, 200));
let got = await rows(order.id);
check("20% of the 2 drinks (400,000) = 80,000 for the picked staff, nothing for the beer", got.length === 1 && got[0].user_id === ladyA.id && got[0].a === 80000, JSON.stringify(got));

// payroll shows it
const month = new Date().toISOString().slice(0, 7);
const payroll = await admin("GET", `/api/reborn/admin/payroll?month=${month}`);
const mine = payroll.json?.staff?.find((s) => s.user_id === ladyA.id);
check("payroll adds it to the staff member's commission (when they are on the payroll list)", !mine || (Number(mine.itemCommission) === 80000 && Number(mine.salesCommission) >= 80000), JSON.stringify(mine && { ic: mine.itemCommission, sc: mine.salesCommission }));

// a refund cancels it
r = await admin("POST", `/api/reborn/admin/accounting/orders/${order.id}/refund`, { reason: "test" });
got = await rows(order.id);
check("a refund cancels the commission", r.status === 200 && got.length === 1 && got[0].voided_at !== null, JSON.stringify([r.status, got]));

// fixed amount, default person = who ordered
await admin("PATCH", `/api/reborn/admin/pos/products/${drink.id}`, { staffCommissionKind: "fixed", staffCommissionValue: 30000 });
const table2 = `M${tag}`.slice(0, 7);
const order2 = (await admin("POST", "/api/reborn/pos/orders", { tableNumber: table2 })).json.order;
await ladyB.client("POST", "/api/auth/login", { email: `icb${tag}@test.local`, password: "Passw0rd!" });
const added = await ladyB.client("POST", `/api/reborn/pos/orders/${order2.id}/items`, { items: [{ productId: drink.id, qty: 2 }] });
await admin("POST", `/api/reborn/pos/orders/${order2.id}/pay`, { paymentMethod: "cash", cashReceived: 10_000_000 });
got = await rows(order2.id);
check("fixed 30,000 per drink x 2 = 60,000 goes to the person who ordered it", added.status === 200 && got.length === 1 && got[0].user_id === ladyB.id && got[0].a === 60000, JSON.stringify([added.status, got]));

// limited to chosen staff: only they can be picked, and a non-listed orderer earns nothing by default
await admin("PATCH", `/api/reborn/admin/pos/products/${drink.id}`, { staffCommissionKind: "percent", staffCommissionValue: 10, staffCommissionStaffIds: [ladyA.id] });
const savedIds = (await db.query("SELECT staff_commission_staff_ids ids FROM pos_products WHERE id=$1", [drink.id])).rows[0].ids;
check("the admin limits the item to chosen staff", JSON.parse(savedIds || "[]").join() === ladyA.id, String(savedIds));
const table4 = `P${tag}`.slice(0, 7);
const order4 = (await admin("POST", "/api/reborn/pos/orders", { tableNumber: table4 })).json.order;
await ladyB.client("POST", `/api/reborn/pos/orders/${order4.id}/items`, { items: [{ productId: drink.id, qty: 1 }] });
const line4 = (await db.query("SELECT id FROM pos_ticket_items WHERE order_id=$1", [order4.id])).rows[0];
r = await admin("POST", `/api/reborn/pos/items/${line4.id}/commission-staff`, { staffId: ladyB.id });
check("a staff member not on the item's list cannot be picked", r.status === 400, String(r.status));
await admin("POST", `/api/reborn/pos/orders/${order4.id}/pay`, { paymentMethod: "cash", cashReceived: 10_000_000 });
check("an orderer who is not on the list earns nothing by default", (await rows(order4.id)).length === 0, JSON.stringify(await rows(order4.id)));
r = await admin("POST", `/api/reborn/pos/items/${line4.id}/commission-staff`, { staffId: ladyA.id });
check("a listed staff member can be picked", r.status === 200, String(r.status));
await admin("PATCH", `/api/reborn/admin/pos/products/${drink.id}`, { staffCommissionKind: "percent", staffCommissionValue: 10, staffCommissionStaffIds: [] });
check("an empty list means any staff again", (await db.query("SELECT staff_commission_staff_ids ids FROM pos_products WHERE id=$1", [drink.id])).rows[0].ids === null);

// no rule = no commission
const table3 = `N${tag}`.slice(0, 7);
const order3 = (await admin("POST", "/api/reborn/pos/orders", { tableNumber: table3 })).json.order;
await admin("POST", `/api/reborn/pos/orders/${order3.id}/items`, { items: [{ productId: plain.id, qty: 2 }] });
await admin("POST", `/api/reborn/pos/orders/${order3.id}/pay`, { paymentMethod: "cash", cashReceived: 10_000_000 });
check("an item with no rule earns nothing", (await rows(order3.id)).length === 0);
await db.end();
console.log(failures === 0 ? "ALL PASSED" : `${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
