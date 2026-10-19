// Sell at cost (staff / boss) and damage / waste charged to a staff member. Run against the local test server (see README.md).
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
const staffEmail = `cost${tag}@test.local`;
const staff = makeClient();
await staff("POST", "/api/auth/register", { email: staffEmail, password: "Passw0rd!", firstName: "Cost", lastName: "Staff", phoneNumber: "0816" + tag.replace(/\D/g, "").padEnd(7, "5").slice(0, 7), dateOfBirth: "1995-01-01", gender: "female" });
await db.query("UPDATE users SET role='staff' WHERE email=$1", [staffEmail]);
await staff("POST", "/api/auth/login", { email: staffEmail, password: "Passw0rd!" });
const staffId = (await db.query("SELECT id FROM users WHERE email=$1", [staffEmail])).rows[0].id;

await admin("POST", "/api/reborn/admin/settings", { serviceFeePercent: 10, taxPercent: 11 });
const beer = (await admin("POST", "/api/reborn/admin/pos/products", { name: "Cost Beer " + tag, category: "Beer", price: 100000, cost: 40000, stock: 50 })).json;

// ── sell at cost ──
const items = [{ productId: beer.id, price: 100000, qty: 2 }];
let r = await staff("POST", "/api/reborn/pos/quote", { items, atCost: { who: "staff", name: "Wati" } });
check("a cashier cannot ask for a price at cost", r.status === 403, r.status);
r = await staff("POST", "/api/reborn/pos/quote", { items, staffPrice: { mode: "half", who: "staff", name: "Wati" } });
check("a cashier can tick the staff price: 50% off, no service fee, no tax", r.status === 200 && r.json.total === 100000 && r.json.serviceFee === 0 && r.json.tax === 0, JSON.stringify(r.json));
r = await staff("POST", "/api/reborn/pos/quote", { items, staffPrice: { mode: "cost", who: "boss", name: "Mr Lim" } });
check("a cashier can tick the cost price: the bill is the cost, no fees", r.status === 200 && r.json.total === 80000 && r.json.serviceFee === 0 && r.json.tax === 0, JSON.stringify(r.json));
r = await staff("POST", "/api/reborn/pos/quote", { items, staffPrice: { mode: "bogus" } });
check("an unknown staff price mode is ignored (normal bill)", r.status === 200 && r.json.serviceFee > 0, JSON.stringify(r.json));
r = await admin("POST", "/api/reborn/pos/quote", { items });
check("a normal quote has service fee and tax", r.status === 200 && r.json.serviceFee > 0 && r.json.tax > 0, JSON.stringify(r.json));
r = await admin("POST", "/api/reborn/pos/quote", { items, atCost: { who: "staff", name: "Wati" } });
check("at cost the bill is the cost of the items, with no service fee and no tax", r.status === 200 && r.json.total === 80000 && r.json.serviceFee === 0 && r.json.tax === 0, JSON.stringify(r.json));

r = await admin("POST", "/api/reborn/pos/sale", { items, paymentMethod: "cash", cashReceived: 80000, atCost: { who: "boss", name: "Mr Lim" } });
check("a quick sale at cost is paid", r.status === 200, JSON.stringify(r.json));
const sale = (await db.query("SELECT total, service_fee, tax, discount_reason FROM pos_tickets ORDER BY id DESC LIMIT 1")).rows[0];
check("the sale is saved at cost and says who bought it", Number(sale.total) === 80000 && Number(sale.service_fee) === 0 && Number(sale.tax) === 0 && /At cost · Boss: Mr Lim/.test(sale.discount_reason || ""), JSON.stringify(sale));

const order = (await admin("POST", "/api/reborn/pos/orders", { tableNumber: "K" + tag.slice(-3) })).json.order;
await admin("POST", `/api/reborn/pos/orders/${order.id}/items`, { items: [{ productId: beer.id, qty: 1 }] });
r = await admin("POST", `/api/reborn/pos/orders/${order.id}/pay`, { paymentMethod: "cash", cashReceived: 40000, atCost: { who: "staff", name: "Wati" } });
check("a table bill is paid at cost", r.status === 200, JSON.stringify(r.json));
const bill = (await db.query("SELECT total, discount_reason FROM pos_tickets WHERE id=$1", [order.id])).rows[0];
check("the table bill total is the cost and carries the label", Number(bill.total) === 40000 && /At cost · Staff: Wati/.test(bill.discount_reason || ""), JSON.stringify(bill));

const halfOrder = (await admin("POST", "/api/reborn/pos/orders", { tableNumber: "H" + tag.slice(-3) })).json.order;
await admin("POST", `/api/reborn/pos/orders/${halfOrder.id}/items`, { items: [{ productId: beer.id, qty: 1 }] });
r = await staff("POST", `/api/reborn/pos/orders/${halfOrder.id}/pay`, { paymentMethod: "cash", cashReceived: 50000, staffPrice: { mode: "half", who: "staff", name: "Wati" } });
const halfBill = (await db.query("SELECT total, service_fee, tax, discount_reason FROM pos_tickets WHERE id=$1", [halfOrder.id])).rows[0];
check("a cashier pays a bill at the staff price (50%) and the bill says so", r.status === 200 && Number(halfBill.total) === 50000 && Number(halfBill.service_fee) === 0 && Number(halfBill.tax) === 0 && /Staff price 50% off · Staff: Wati/.test(halfBill.discount_reason || ""), JSON.stringify([r.status, halfBill]));

// ── damage / waste charged to staff ──
const lostOrder = (await admin("POST", "/api/reborn/pos/orders", { tableNumber: "L" + tag.slice(-3) })).json.order;
await admin("POST", `/api/reborn/pos/orders/${lostOrder.id}/items`, { items: [{ productId: beer.id, qty: 2 }] });
const lineId = (await db.query("SELECT id FROM pos_ticket_items WHERE order_id=$1", [lostOrder.id])).rows[0].id;
r = await admin("POST", `/api/reborn/pos/items/${lineId}/lose`, { reason: "dropped", chargeStaffId: staffId });
check("a lost line charged to a staff member is accepted", r.status === 200 && r.json.charged === true, JSON.stringify(r.json));
let charges = (await db.query("SELECT amount, source FROM staff_charges WHERE user_id=$1", [staffId])).rows;
check("the charge is the cost of the lost items (2 × 40,000), no tax or service", charges.length === 1 && Number(charges[0].amount) === 80000 && charges[0].source === "pos_lost", JSON.stringify(charges));

r = await admin("POST", "/api/reborn/pos/stock-in", { productId: beer.id, qty: -1, reason: "Spilled", chargeStaffId: staffId });
charges = (await db.query("SELECT amount, source FROM staff_charges WHERE user_id=$1 ORDER BY id", [staffId])).rows;
check("a stock take-out charged to a staff member adds a second charge", r.status === 200 && charges.length === 2 && Number(charges[1].amount) === 40000 && charges[1].source === "stock_out", JSON.stringify(charges));

r = await admin("POST", "/api/reborn/pos/stock-in", { productId: beer.id, qty: -1, reason: "Count correction", chargeStaffId: staffId });
check("a count correction is never charged to anyone", r.status === 200 && (await db.query("SELECT 1 FROM staff_charges WHERE user_id=$1", [staffId])).rowCount === 2);

r = await admin("POST", "/api/reborn/pos/stock-in", { productId: beer.id, qty: -1, reason: "Expired", chargeStaffId: "nobody-" + tag });
check("an unknown person is not charged", r.status === 200 && (await db.query("SELECT 1 FROM staff_charges WHERE user_id=$1", ["nobody-" + tag])).rowCount === 0);

const month = new Date().toISOString().slice(0, 7);
const chargeIds = (await db.query("SELECT id FROM staff_charges WHERE user_id=$1 ORDER BY id", [staffId])).rows.map((x) => x.id);
r = await admin("POST", "/api/reborn/admin/staff-charges/" + chargeIds[1] + "/waive", {});
check("the admin can waive a charge", r.status === 200 && (await db.query("SELECT settled_note FROM staff_charges WHERE id=$1", [chargeIds[1]])).rows[0].settled_note === "Waived");
r = await staff("POST", "/api/reborn/admin/staff-charges/" + chargeIds[0] + "/waive", {});
check("a cashier cannot waive a charge", r.status === 403 || r.status === 401, r.status);

r = await admin("POST", "/api/reborn/admin/payroll/pay", { userId: staffId, name: "Cost Staff", month, amount: 3000000, deduction: 80000, deductionNote: "Damage / waste", chargeIds: [chargeIds[0]] });
check("recording the pay with the charge settles it", r.status === 200 && (await db.query("SELECT settled_at FROM staff_charges WHERE id=$1", [chargeIds[0]])).rows[0].settled_at !== null, JSON.stringify(r.json).slice(0, 200));

await db.end();
console.log(failures ? `${failures} FAILED` : "ALL PASSED");
process.exit(failures ? 1 : 0);
