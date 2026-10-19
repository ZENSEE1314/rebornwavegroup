// A cashier uploads a supplier / expense receipt: it is booked in the accounts, but the cashier cannot open the accounts. Run against the local test server (see README.md).
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

const staffEmail = `rc${tag}@test.local`;
const staff = makeClient();
await staff("POST", "/api/auth/register", { email: staffEmail, password: "Passw0rd!", firstName: "Receipt", lastName: "Cashier", phoneNumber: "0819" + tag.replace(/\D/g, "").padEnd(7, "8").slice(0, 7), dateOfBirth: "1995-01-01", gender: "female" });
await db.query("UPDATE users SET role='staff' WHERE email=$1", [staffEmail]);
await staff("POST", "/api/auth/login", { email: staffEmail, password: "Passw0rd!" });
const anon = makeClient();
const staffId = (await db.query("SELECT id FROM users WHERE email=$1", [staffEmail])).rows[0].id;

let r = await anon("POST", "/api/reborn/admin/inventory/receipt/save", { kind: "expense", amount: 1000 });
check("a signed-out visitor cannot upload a receipt", r.status === 401 || r.status === 403, r.status);

r = await staff("GET", "/api/reborn/admin/inventory/receipt/ready");
check("a cashier can ask whether the receipt reader is ready", r.status === 200, r.status);

r = await staff("POST", "/api/reborn/admin/inventory/receipt/save", { kind: "expense", supplier: "PLN", invoiceNo: "EL-" + tag, date: "2026-10-14", amount: 450000, category: "utilities", items: [{ name: "Electricity October", qty: 1, unitCost: 450000 }] });
check("a cashier saves an expense receipt", r.status === 200, JSON.stringify(r.json));
const booked = (await db.query("SELECT kind, category, amount, user_id FROM ledger_entries WHERE ref_type='receipt_expense' AND ref_id=$1", ["EL-" + tag])).rows;
check("the expense is booked in the accounts under the cashier's name", booked.length === 1 && booked[0].kind === "expense" && Number(booked[0].amount) === 450000 && booked[0].user_id === staffId, JSON.stringify(booked));
check("the answer shows no accounting figures beyond the bill itself", r.json && !("balance" in r.json) && !("income" in r.json) && !("profit" in r.json), JSON.stringify(r.json));

r = await staff("GET", "/api/reborn/admin/accounting/ledger");
check("the cashier cannot open the accounts (ledger)", r.status === 403 || r.status === 401, r.status);
r = await staff("GET", "/api/reborn/admin/accounting/summary");
check("the cashier cannot open the accounts (summary)", r.status === 403 || r.status === 401, r.status);

await db.end();
console.log(failures ? `${failures} FAILED` : "ALL PASSED");
process.exit(failures ? 1 : 0);
