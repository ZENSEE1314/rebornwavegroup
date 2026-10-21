// Changing the tax and the service fee only reaches bills opened afterwards: an open bill and a paid bill keep the rates they were made with. Run against the local test server (see README.md).
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
const item = (await admin("POST", "/api/reborn/admin/pos/products", { name: `Tax Item ${tag}`, category: "Food", price: 100000, cost: 10000, stock: 100 })).json;
const openBill = async (table) => {
  const order = (await admin("POST", "/api/reborn/pos/orders", { tableNumber: table })).json.order;
  await admin("POST", `/api/reborn/pos/orders/${order.id}/items`, { items: [{ productId: item.id, qty: 1 }] });
  return order;
};
const quote = async (id) => (await admin("POST", "/api/reborn/pos/quote", { ticketId: id })).json;
const rates = (tax, service) => admin("PUT", "/api/reborn/admin/tax-fees", { taxPercent: tax, serviceFeePercent: service });

let r = await rates(10, 10);
check("the admin sets 10% tax and 10% service fee", r.status === 200 && r.json.taxPercent === 10 && r.json.serviceFeePercent === 10, JSON.stringify(r));
const billA = await openBill(`TA${tag}`.slice(0, 7));
let q = await quote(billA.id);
check("a bill opened now is quoted at 10% and 10%", q.serviceFee === 10000 && q.tax === 10000 && q.serviceFeePercent === 10 && q.taxPercent === 10, JSON.stringify(q));

r = await rates(0, 5);
check("the change is saved with who made it", r.status === 200 && r.json.history[0].prevTax === 10 && r.json.history[0].tax === 0 && r.json.history[0].service === 5 && !!r.json.history[0].by, JSON.stringify(r.json.history?.[0]));
q = await quote(billA.id);
check("the bill that was already open keeps 10% and 10%", q.serviceFee === 10000 && q.tax === 10000 && q.serviceFeePercent === 10, JSON.stringify(q));
const billB = await openBill(`TB${tag}`.slice(0, 7));
q = await quote(billB.id);
check("a bill opened after the change gets 5% service fee and no tax", q.serviceFee === 5000 && q.tax === 0 && q.serviceFeePercent === 5 && q.taxPercent === 0, JSON.stringify(q));

const quickQuote = (await admin("POST", "/api/reborn/pos/quote", { items: [{ productId: item.id, price: 100000, qty: 1 }] })).json;
check("a quick sale uses the current rates", quickQuote.serviceFee === 5000 && quickQuote.tax === 0, JSON.stringify(quickQuote));

// paying: each bill is charged with its own rates, even if the rates change again before it is paid
await rates(7, 3);
r = await admin("POST", `/api/reborn/pos/orders/${billA.id}/pay`, { paymentMethod: "cash", cashReceived: 1000000 });
const paidA = (await db.query("SELECT service_fee, tax, total, service_fee_percent, tax_percent FROM pos_tickets WHERE id=$1", [billA.id])).rows[0];
check("the old bill is paid with its own 10% and 10% although the rates changed again", r.status === 200 && Number(paidA.service_fee) === 10000 && Number(paidA.tax) === 10000 && Number(paidA.total) === 120000, JSON.stringify([r.status, paidA]));
check("the bill keeps the rates it was made with", Number(paidA.service_fee_percent) === 10 && Number(paidA.tax_percent) === 10, JSON.stringify(paidA));
check("the pay answer carries the rates for the receipt", r.json?.order?.serviceFeePercent !== undefined && Number(r.json.order.serviceFeePercent) === 10, JSON.stringify(r.json?.order?.serviceFeePercent));
r = await admin("POST", `/api/reborn/pos/orders/${billB.id}/pay`, { paymentMethod: "cash", cashReceived: 1000000 });
const paidB = (await db.query("SELECT service_fee, tax, total FROM pos_tickets WHERE id=$1", [billB.id])).rows[0];
check("the newer bill is paid with 5% service fee and no tax", r.status === 200 && Number(paidB.service_fee) === 5000 && Number(paidB.tax) === 0 && Number(paidB.total) === 105000, JSON.stringify([r.status, paidB]));
r = await admin("POST", "/api/reborn/pos/sale", { items: [{ productId: item.id, qty: 1 }], paymentMethod: "cash", cashReceived: 1000000 });
check("a quick sale after the last change uses 3% and 7%", r.status === 200 && Number(r.json.order.serviceFee) === 3000 && Number(r.json.order.tax) === 7000 && Number(r.json.order.taxPercent) === 7, JSON.stringify([r.status, r.json?.order?.serviceFee, r.json?.order?.tax]));

// validation and no-op
r = await rates(101, 5);
check("a rate above 100 is refused", r.status === 400, JSON.stringify(r));
r = await admin("PUT", "/api/reborn/admin/tax-fees", { taxPercent: "x", serviceFeePercent: 5 });
check("a rate that is not a number is refused", r.status === 400, JSON.stringify(r));
r = await rates(7, 3);
check("saving the same rates changes nothing", r.status === 200 && r.json.unchanged === true, JSON.stringify(r));
r = await admin("GET", "/api/reborn/admin/tax-fees");
check("the history lists the changes, newest first", r.status === 200 && r.json.history.length >= 3 && r.json.taxPercent === 7 && r.json.serviceFeePercent === 3, JSON.stringify(r.json.history?.length));

await rates(0, 0);
await db.end();
console.log(failures ? `${failures} FAILED` : "ALL PASSED");
process.exit(failures ? 1 : 0);
