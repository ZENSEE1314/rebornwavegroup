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

const email = `topup${tag}@test.local`;
const member = makeClient();
await member("POST", "/api/auth/register", { email, password: "Passw0rd!", firstName: "Top", lastName: "Up", phoneNumber: "0816" + tag.replace(/\D/g, "").padEnd(7, "5").slice(0, 7), dateOfBirth: "1995-01-01", gender: "female" });
const user = (await db.query("SELECT id, credits FROM users WHERE email=$1", [email])).rows[0];

// a top-up gives credits but is not income: the money counts when the credits are spent on a sale
const [req1] = (await db.query("INSERT INTO topup_requests (user_id, amount, payment_method, status) VALUES ($1, 100000, 'cash_deposit', 'pending') RETURNING id", [user.id])).rows;
let r = await admin("POST", `/api/reborn/admin/topups/${req1.id}`, { approve: true });
const after = (await db.query("SELECT credits FROM users WHERE id=$1", [user.id])).rows[0];
check("an approved top-up gives the member the credits", r.status === 200 && Number(after.credits) === Number(user.credits) + 100000, JSON.stringify(after));
const topLedger = (await db.query("SELECT count(*)::int n FROM ledger_entries WHERE ref_type='topup' AND ref_id=$1", [String(req1.id)])).rows[0].n;
check("a top-up is not booked as income", topLedger === 0, String(topLedger));

// a sale paid with those credits is income
const item = (await admin("POST", "/api/reborn/admin/pos/products", { name: "Cr Beer " + tag, category: "Beer", price: 50000, cost: 20000, stock: 20 })).json;
const order = (await admin("POST", "/api/reborn/pos/orders", { tableNumber: "K" + tag.slice(-3) })).json.order;
await admin("POST", `/api/reborn/pos/orders/${order.id}/member`, { memberCode: email });
await admin("POST", `/api/reborn/pos/orders/${order.id}/items`, { items: [{ productId: item.id, qty: 1 }] });
r = await admin("POST", `/api/reborn/pos/orders/${order.id}/pay`, { paymentMethod: "credits" });
check("the bill is paid with RP credits", r.status === 200, JSON.stringify(r.json));
const total = Number((await db.query("SELECT total FROM pos_tickets WHERE id=$1", [order.id])).rows[0].total);
const inc = (await db.query("SELECT kind, category, amount, note FROM ledger_entries WHERE ref_type='pos_order' AND ref_id=$1", [String(order.id)])).rows;
check("a credit-paid sale is booked as income at its total", inc.length === 1 && inc[0].kind === "income" && Number(inc[0].amount) === total && /credits/.test(inc[0].note), JSON.stringify(inc));

// refunding it gives the credits back and books the refund
const credBefore = Number((await db.query("SELECT credits FROM users WHERE id=$1", [user.id])).rows[0].credits);
r = await admin("POST", `/api/reborn/pos/orders/${order.id}/refund`, { reason: "test" });
const credAfter = Number((await db.query("SELECT credits FROM users WHERE id=$1", [user.id])).rows[0].credits);
const ref = (await db.query("SELECT kind, amount FROM ledger_entries WHERE ref_type='pos_refund' AND ref_id=$1", [String(order.id)])).rows;
check("the refund returns the credits", r.status === 200 && credAfter === credBefore + total, `${credBefore} → ${credAfter}`);
check("the refund of a credit-paid sale is booked as an expense", ref.length === 1 && ref[0].kind === "expense" && Number(ref[0].amount) === total, JSON.stringify(ref));

console.log(failures ? `${failures} FAILED` : "ALL PASSED"); await db.end(); process.exit(failures ? 1 : 0);
