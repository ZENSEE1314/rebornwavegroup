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

// untick = 0 but the % is remembered; the POS may change a bill's rates only when the admin allows it
await rates(8, 6);
r = await admin("PUT", "/api/reborn/admin/tax-fees", { taxPercent: 0, serviceFeePercent: 6, taxKept: 8, posCanChangeFees: false });
check("tax is switched off (0) and its last % is remembered", r.status === 200 && r.json.taxPercent === 0 && r.json.taxKept === 8 && r.json.serviceFeePercent === 6, JSON.stringify(r.json));
r = await admin("GET", "/api/reborn/admin/tax-fees");
check("the card reads the remembered % back", r.json.taxPercent === 0 && r.json.taxKept === 8 && r.json.posCanChangeFees === false, JSON.stringify(r.json));
r = await admin("GET", "/api/reborn/pos/settings");
check("the POS is told it may not change the rates", r.json.canChangeFees === false && r.json.taxPercent === 0, JSON.stringify(r.json));
const billC = await openBill(`TC${tag}`.slice(0, 7));
r = await admin("POST", `/api/reborn/pos/orders/${billC.id}/rates`, { taxPercent: 1, serviceFeePercent: 1 });
check("the POS cannot change a bill's rates while that is off", r.status === 403, JSON.stringify(r));
q = await quote(billC.id);
check("the bill keeps the admin's rates (6% service, no tax)", q.serviceFeePercent === 6 && q.taxPercent === 0 && q.serviceFee === 6000 && q.tax === 0, JSON.stringify(q));
let quick = (await admin("POST", "/api/reborn/pos/quote", { items: [{ productId: item.id, price: 100000, qty: 1 }], rates: { taxPercent: 50, serviceFeePercent: 50 } })).json;
check("a quick sale ignores a rate sent while changing is off", quick.serviceFee === 6000 && quick.tax === 0, JSON.stringify(quick));
await admin("PUT", "/api/reborn/admin/tax-fees", { taxPercent: 0, serviceFeePercent: 6, posCanChangeFees: true });
r = await admin("POST", `/api/reborn/pos/orders/${billC.id}/rates`, { taxPercent: 2, serviceFeePercent: 0 });
check("with changing on, the POS sets this bill's own rates", r.status === 200 && r.json.taxPercent === 2 && r.json.serviceFeePercent === 0, JSON.stringify(r));
q = await quote(billC.id);
check("that bill is now quoted with them", q.tax === 2000 && q.serviceFee === 0, JSON.stringify(q));
const billD = await openBill(`TD${tag}`.slice(0, 7));
q = await quote(billD.id);
check("another bill still gets the admin's rates", q.serviceFee === 6000 && q.tax === 0, JSON.stringify(q));
r = await admin("POST", `/api/reborn/pos/orders/${billC.id}/rates`, { taxPercent: 120, serviceFeePercent: 0 });
check("a rate above 100 is refused for a bill", r.status === 403 || r.status === 400, JSON.stringify(r));
quick = (await admin("POST", "/api/reborn/pos/quote", { items: [{ productId: item.id, price: 100000, qty: 1 }], rates: { taxPercent: 5, serviceFeePercent: 0 } })).json;
check("a quick sale can carry its own rates now", quick.tax === 5000 && quick.serviceFee === 0, JSON.stringify(quick));
r = await admin("POST", "/api/reborn/pos/sale", { items: [{ productId: item.id, qty: 1 }], paymentMethod: "cash", cashReceived: 1000000, rates: { taxPercent: 5, serviceFeePercent: 0 } });
check("and is charged with them", r.status === 200 && Number(r.json.order.tax) === 5000 && Number(r.json.order.serviceFee) === 0, JSON.stringify([r.status, r.json?.order?.tax, r.json?.order?.serviceFee]));
await admin("PUT", "/api/reborn/admin/tax-fees", { taxPercent: 0, serviceFeePercent: 0, posCanChangeFees: false });

// Accounting shows what customers paid as service fee and tax: the same numbers as the paid bills, refunded bills left out
const paidSums = async () => (await db.query("SELECT coalesce(sum(service_fee),0)::float sf, coalesce(sum(tax),0)::float tx, count(*)::int n FROM pos_tickets WHERE status='paid' AND paid_at >= now() - interval '7 days'")).rows[0];
const shown = async () => (await admin("GET", "/api/reborn/admin/accounting/period?days=7")).json.taxFees;
let before = await paidSums();
let totals = await shown();
check("Accounting shows the service fee and tax collected, the same as the paid bills", totals && Math.abs(totals.serviceFee - before.sf) < 0.01 && Math.abs(totals.tax - before.tx) < 0.01 && totals.bills === before.n, JSON.stringify([totals && { s: totals.serviceFee, t: totals.tax, n: totals.bills }, before]));
check("and lists the months", Array.isArray(totals.months) && totals.months.length >= 1 && totals.months[0].month === new Date().toISOString().slice(0, 7), JSON.stringify(totals?.months));
await admin("POST", `/api/reborn/admin/accounting/orders/${billB.id}/refund`, { reason: "tax fee total test" });
totals = await shown();
check("a refunded bill is taken out of the service fee and tax collected", Math.abs(totals.serviceFee - (before.sf - 5000)) < 0.01 && totals.bills === before.n - 1, JSON.stringify([totals.serviceFee, before.sf, totals.bills]));

await rates(0, 0);
await db.end();
console.log(failures ? `${failures} FAILED` : "ALL PASSED");
process.exit(failures ? 1 : 0);
