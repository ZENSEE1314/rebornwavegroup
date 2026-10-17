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
const staffEmail = `cash${tag}@test.local`;
const staff = makeClient();
await staff("POST", "/api/auth/register", { email: staffEmail, password: "Passw0rd!", firstName: "Cash", lastName: "Ier", phoneNumber: "0815" + tag.replace(/\D/g, "").padEnd(7, "4").slice(0, 7), dateOfBirth: "1995-01-01", gender: "female" });
await db.query("UPDATE users SET role='staff' WHERE email=$1", [staffEmail]);
await staff("POST", "/api/auth/login", { email: staffEmail, password: "Passw0rd!" });

const beer = (await admin("POST", "/api/reborn/admin/pos/products", { name: "Com Beer " + tag, category: "Beer", price: 100000, cost: 40000, stock: 50 })).json;

// saved list
let r = await staff("PUT", "/api/reborn/admin/commission-types", { types: [{ name: "Hacked", kind: "percent", value: 50 }] });
check("a cashier cannot change the saved commission list", r.status === 403 || r.status === 401, r.status);
r = await admin("PUT", "/api/reborn/admin/commission-types", { types: [{ name: "Agent", kind: "percent", value: 10 }, { name: "Driver", kind: "amount", value: 15000 }, { name: "", kind: "percent", value: 5 }, { name: "Zero", kind: "percent", value: 0 }] });
check("the admin saves the list and empty / zero rows are dropped", r.status === 200 && r.json.length === 2 && r.json[0].name === "Agent", JSON.stringify(r.json));
r = await staff("GET", "/api/reborn/pos/commission-types");
check("a cashier reads the saved list", r.status === 200 && r.json.map((x) => x.name).join() === "Agent,Driver", JSON.stringify(r.json));

// table bill, percent commission
const order = (await admin("POST", "/api/reborn/pos/orders", { tableNumber: "C" + tag.slice(-3) })).json.order;
await admin("POST", `/api/reborn/pos/orders/${order.id}/items`, { items: [{ productId: beer.id, qty: 2 }] });
r = await staff("POST", `/api/reborn/pos/orders/${order.id}/pay`, { paymentMethod: "cash", cashReceived: 500000, commission: { label: "Agent", payee: "Budi", kind: "percent", value: 10 } });
check("the bill is paid", r.status === 200, JSON.stringify(r.json));
const t1 = (await db.query("SELECT total, commission_label, commission_payee, commission_amount FROM pos_tickets WHERE id=$1", [order.id])).rows[0];
check("10% of RP 200,000 is saved on the bill with the name and the person", Number(t1.commission_amount) === 20000 && t1.commission_label === "Agent" && t1.commission_payee === "Budi", JSON.stringify(t1));
check("the customer still pays the normal total", Number(t1.total) === 200000, JSON.stringify(t1));
const l1 = (await db.query("SELECT kind, category, amount FROM ledger_entries WHERE ref_type='pos_commission' AND ref_id=$1", [String(order.id)])).rows;
check("the commission is booked as one expense", l1.length === 1 && l1[0].kind === "expense" && Number(l1[0].amount) === 20000, JSON.stringify(l1));
check("the pay answer carries the commission for the sales copy", Number(r.json.order?.commissionAmount) === 20000, JSON.stringify(r.json.order && { a: r.json.order.commissionAmount }));

// refund gives it back in accounting
r = await admin("POST", `/api/reborn/pos/orders/${order.id}/refund`, { reason: "test" });
const rev = (await db.query("SELECT kind, amount FROM ledger_entries WHERE ref_type='pos_commission_reversal' AND ref_id=$1", [String(order.id)])).rows;
check("a refund books the commission back as income", r.status === 200 && rev.length === 1 && rev[0].kind === "income" && Number(rev[0].amount) === 20000, `${r.status} ${JSON.stringify(rev)}`);

// quick sale, fixed amount + a bill with no commission
r = await staff("POST", "/api/reborn/pos/sale", { items: [{ productId: beer.id, qty: 1 }], paymentMethod: "cash", cashReceived: 100000, commission: { label: "Driver", payee: "Eko", kind: "amount", value: 15000 } });
check("a quick sale carries a fixed commission", r.status === 200 && Number(r.json.order?.commissionAmount) === 15000 && r.json.order?.commissionPayee === "Eko", JSON.stringify(r.json.order && { a: r.json.order.commissionAmount, p: r.json.order.commissionPayee }));
r = await staff("POST", "/api/reborn/pos/sale", { items: [{ productId: beer.id, qty: 1 }], paymentMethod: "cash", cashReceived: 100000 });
check("a sale without commission has none", r.status === 200 && Number(r.json.order?.commissionAmount || 0) === 0, JSON.stringify(r.json.order && r.json.order.commissionAmount));
r = await staff("POST", "/api/reborn/pos/sale", { items: [{ productId: beer.id, qty: 1 }], paymentMethod: "cash", cashReceived: 100000, commission: { label: "Big", kind: "amount", value: 9999999 } });
check("a commission is never more than the sale", r.status === 200 && Number(r.json.order?.commissionAmount) === 100000, JSON.stringify(r.json.order && r.json.order.commissionAmount));
r = await staff("POST", "/api/reborn/pos/sale", { items: [{ productId: beer.id, qty: 1 }], paymentMethod: "cash", cashReceived: 100000, commission: { label: "Over", kind: "percent", value: 150 } });
check("a percent over 100 is ignored", r.status === 200 && Number(r.json.order?.commissionAmount || 0) === 0, JSON.stringify(r.json.order && r.json.order.commissionAmount));

const listed = (await admin("GET", "/api/reborn/pos/orders?status=paid")).json.find((o) => o.commissionPayee === "Eko");
check("the paid-bills list carries the commission so a reprint shows it", !!listed && Number(listed.commissionAmount) === 15000, JSON.stringify(listed && listed.commissionAmount));

console.log(failures ? `${failures} FAILED` : "ALL PASSED"); await db.end(); process.exit(failures ? 1 : 0);
