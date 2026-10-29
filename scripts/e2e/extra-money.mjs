// Card-to-cash exchange: the main admin adds extra money to a bill; it is paid by card and is never revenue. Run against the local test server (see README.md).
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
const EXTRA = 500000;

const admin = makeClient();
await admin("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });
const staffEmail = `extra${tag}@test.local`;
const staff = makeClient();
await staff("POST", "/api/auth/register", { email: staffEmail, password: "Passw0rd!", firstName: "Extra", lastName: "Staff", phoneNumber: "0817" + tag.replace(/\D/g, "").padEnd(7, "6").slice(0, 7), dateOfBirth: "1995-01-01", gender: "female" });
await db.query("UPDATE users SET role='staff' WHERE email=$1", [staffEmail]);
await staff("POST", "/api/auth/login", { email: staffEmail, password: "Passw0rd!" });

await admin("POST", "/api/reborn/admin/settings", { serviceFeePercent: 10, taxPercent: 11 });
const beer = (await admin("POST", "/api/reborn/admin/pos/products", { name: "Extra Beer " + tag, category: "Beer", price: 100000, cost: 40000, stock: 50 })).json;
const table = "X" + tag.slice(-4);
const bill = (await admin("POST", "/api/reborn/pos/orders", { tableNumber: table })).json.order;
await admin("POST", `/api/reborn/pos/orders/${bill.id}/items`, { items: [{ productId: beer.id, qty: 2 }] });
const plain = (await admin("POST", "/api/reborn/pos/quote", { ticketId: bill.id })).json;

let r = await staff("POST", `/api/reborn/pos/orders/${bill.id}/extra-money`, { amount: EXTRA });
check("a cashier cannot add extra money", r.status === 401 || r.status === 403, String(r.status));
r = await admin("POST", `/api/reborn/pos/orders/${bill.id}/extra-money`, { amount: EXTRA });
check("the admin adds extra money to the bill", r.status === 200 && r.json.amount === EXTRA, JSON.stringify([r.status, r.json]));
const quote = (await admin("POST", "/api/reborn/pos/quote", { ticketId: bill.id })).json;
check("the quote carries the extra money", Number(quote.extraMoney) === EXTRA, JSON.stringify(quote));
check("the sale itself (total, tax, service fee) does not change", quote.total === plain.total && quote.tax === plain.tax && quote.serviceFee === plain.serviceFee, JSON.stringify([plain, quote]));
const open = (await admin("GET", "/api/reborn/pos/orders?status=open")).json;
check("the open bill list carries the extra money", Number(open.find((o) => o.id === bill.id)?.extraMoney) === EXTRA, "missing");

r = await admin("POST", `/api/reborn/pos/orders/${bill.id}/pay`, { paymentMethod: "cash", cashReceived: 99_000_000 });
check("a bill with extra money cannot be paid in cash", r.status === 400, JSON.stringify([r.status, r.json]));
r = await admin("POST", `/api/reborn/pos/orders/${bill.id}/pay`, { paymentMethod: "card", paymentReference: "APPR" + tag });
check("it is paid by card", r.status === 200, JSON.stringify([r.status, r.json]));

const paid = (await db.query("SELECT total, extra_money FROM pos_tickets WHERE id=$1", [bill.id])).rows[0];
check("the bill keeps the sale total and the extra money apart", Number(paid.total) === quote.total && Number(paid.extra_money) === EXTRA, JSON.stringify(paid));
const income = (await db.query("SELECT COALESCE(SUM(amount),0) s FROM ledger_entries WHERE ref_type='pos_order' AND ref_id=$1 AND kind='income'", [String(bill.id)])).rows[0];
check("only the sale is booked as income, not the extra money", Number(income.s) === quote.due, JSON.stringify([income, quote.due]));

r = await admin("POST", `/api/reborn/pos/orders/${bill.id}/extra-money`, { amount: 1 });
check("a paid bill cannot get extra money", r.status === 400, String(r.status));
await db.end();
console.log(failures ? `FAILED: ${failures}` : "ALL PASSED");
process.exit(failures ? 1 : 0);
