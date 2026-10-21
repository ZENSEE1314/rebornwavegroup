// A bill paid with RP credits + card + cash together (table bill and quick sale), the checks that refuse a bad split, the day's totals and a refund. Run against the local test server (see README.md).
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
const digits = tag.replace(/\D/g, "").padEnd(7, "7").slice(0, 7);

const admin = makeClient();
await admin("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });
const email = `split${tag}@test.local`;
const client = makeClient();
await client("POST", "/api/auth/register", { email, password: "Passw0rd!", firstName: "Split", lastName: "Test", phoneNumber: `08183${digits}`.slice(0, 12), dateOfBirth: "1995-01-01", gender: "female" });
const member = (await db.query("SELECT id, referral_code FROM users WHERE email=$1", [email])).rows[0];
const setCredits = (n) => db.query("UPDATE users SET credits=$2 WHERE id=$1", [member.id, n]);
const creditsNow = async () => Number((await db.query("SELECT credits FROM users WHERE id=$1", [member.id])).rows[0].credits);
const beer = (await admin("POST", "/api/reborn/admin/pos/products", { name: `Split Beer ${tag}`, category: "Beer", price: 50000, cost: 10000, stock: 100 })).json;

const openBill = async (table, qty) => {
  const order = (await admin("POST", "/api/reborn/pos/orders", { tableNumber: table })).json.order;
  await admin("POST", `/api/reborn/pos/orders/${order.id}/member`, { memberCode: member.referral_code });
  await admin("POST", `/api/reborn/pos/orders/${order.id}/items`, { items: [{ productId: beer.id, qty }] });
  return order;
};
const ticket = async (id) => (await db.query("SELECT payment_method, payment_split, cash_received, change_given, payment_reference, status FROM pos_tickets WHERE id=$1", [id])).rows[0];

// a bill of 100,000: credits 30,000 + card 20,000 + cash 50,000 (60,000 handed over)
await setCredits(30000);
let bill = await openBill(`P${tag}`.slice(0, 7), 2);
let r = await admin("POST", `/api/reborn/pos/orders/${bill.id}/pay`, { paymentMethod: "cash", payments: [{ method: "credits", amount: 30000 }, { method: "card", amount: 20000, reference: "APP123" }, { method: "cash", amount: 60000 }] });
let row = await ticket(bill.id);
const parts = JSON.parse(row.payment_split || "[]");
check("a bill is paid with credits, card and cash together", r.status === 200 && row.status === "paid" && row.payment_method === "split" && parts.length === 3, JSON.stringify([r.status, r.json?.message, row]));
check("the parts add up to the bill", parts.reduce((s, p) => s + Number(p.amount), 0) === 100000, JSON.stringify(parts));
check("the change comes from the cash only", Number(row.cash_received) === 60000 && Number(row.change_given) === 10000, JSON.stringify(row));
check("the card reference is kept", row.payment_reference === "APP123", JSON.stringify(row));
check("the credits part was taken from the member", (await creditsNow()) === 0, String(await creditsNow()));

// refused: not enough credits
await setCredits(5000);
bill = await openBill(`Q${tag}`.slice(0, 7), 2);
r = await admin("POST", `/api/reborn/pos/orders/${bill.id}/pay`, { paymentMethod: "cash", payments: [{ method: "credits", amount: 30000 }, { method: "cash", amount: 70000 }] });
check("credits above the member's balance are refused", r.status === 400, JSON.stringify(r));
check("nothing is taken when a split is refused", (await creditsNow()) === 5000 && (await ticket(bill.id)).status === "open", String(await creditsNow()));
// refused: cash short
r = await admin("POST", `/api/reborn/pos/orders/${bill.id}/pay`, { paymentMethod: "cash", payments: [{ method: "credits", amount: 5000 }, { method: "cash", amount: 10000 }] });
check("cash that does not cover the rest is refused", r.status === 400, JSON.stringify(r));
// refused: card without a reference
r = await admin("POST", `/api/reborn/pos/orders/${bill.id}/pay`, { paymentMethod: "cash", payments: [{ method: "card", amount: 50000 }, { method: "cash", amount: 50000 }] });
check("a card amount without a reference is refused", r.status === 400, JSON.stringify(r));
// refused: credits + card more than the bill
r = await admin("POST", `/api/reborn/pos/orders/${bill.id}/pay`, { paymentMethod: "cash", payments: [{ method: "credits", amount: 5000 }, { method: "card", amount: 99000, reference: "X" }] });
check("credits and card above the bill are refused", r.status === 400, JSON.stringify(r));

// card + credits cover the bill: no cash is needed
await setCredits(40000);
r = await admin("POST", `/api/reborn/pos/orders/${bill.id}/pay`, { paymentMethod: "cash", payments: [{ method: "credits", amount: 40000 }, { method: "card", amount: 60000, reference: "CARD9" }] });
row = await ticket(bill.id);
check("credits and card can cover the whole bill", r.status === 200 && row.payment_method === "split" && Number(row.change_given) === 0, JSON.stringify([r.status, r.json?.message, row]));

// the day's totals count each part where it was paid
const day = (await admin("GET", "/api/reborn/manager/daily-sales")).json;
const totals = day.report.totals;
check("the day's cash, card and credits totals include the split bills", totals.cash >= 50000 && totals.card >= 80000 && totals.credits >= 70000, JSON.stringify(totals));

// a quick sale
await setCredits(20000);
r = await admin("POST", "/api/reborn/pos/sale", { memberCode: member.referral_code, items: [{ productId: beer.id, qty: 1 }], paymentMethod: "cash", payments: [{ method: "credits", amount: 20000 }, { method: "cash", amount: 40000 }] });
check("a quick sale can be split too", r.status === 200 && r.json?.order?.paymentMethod === "split" && Number(r.json.order.changeGiven) === 10000, JSON.stringify([r.status, r.json?.message, r.json?.order?.paymentMethod]));
check("the quick sale took the credits part", (await creditsNow()) === 0, String(await creditsNow()));

// a refund gives the credits part back
await setCredits(0);
const refund = await admin("POST", `/api/reborn/admin/accounting/orders/${r.json.order.id}/refund`, { reason: "test" });
check("a refund gives only the credits part back to the member", refund.status === 200 && (await creditsNow()) === 20000, `${refund.status} ${await creditsNow()}`);

await db.end();
console.log(failures ? `${failures} FAILED` : "ALL PASSED");
process.exit(failures ? 1 : 0);
