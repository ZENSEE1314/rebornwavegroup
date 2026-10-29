// An upload listed under "recently uploaded" can be edited, an accounting line can be corrected, and item commissions can be paid in cash from the list without the payroll paying them again. Run against the local test server (see README.md).
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
const login = await admin("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });
const adminId = login.json?.user?.id || login.json?.id;

// an upload whose receipt date is in another month appears under "recently uploaded" and must still carry Edit
const today = new Date().toISOString().slice(0, 10);
const made = await admin("POST", "/api/reborn/expenses", { payMethod: "cash", category: "supplies", amount: 5000, spentOn: today, payee: "Edit Test " + tag, note: "x" });
const otherMonth = "1999-01";
let r = await admin("GET", `/api/reborn/expenses?month=${otherMonth}`);
const recent = (r.json?.recent || []).find((e) => e.id === made.json?.expense?.id);
check("a recent upload has the Edit flag", recent?.canEdit === true, JSON.stringify(recent));

// an accounting line (a stock delivery) can be corrected; a sale line cannot
const lineId = (await db.query("INSERT INTO ledger_entries (kind, category, amount, note, ref_type, user_id) VALUES ('expense','purchase',1000,$1,'stock_movement',$2) RETURNING id", ["typo " + tag, adminId])).rows[0].id;
r = await admin("PATCH", `/api/reborn/admin/accounting/ledger/${lineId}`, { amount: 1500, note: "fixed " + tag });
const edited = (await db.query("SELECT amount::float a, note FROM ledger_entries WHERE id=$1", [lineId])).rows[0];
check("the admin corrects a stock delivery line", r.status === 200 && edited.a === 1500 && edited.note === "fixed " + tag, JSON.stringify([r.status, r.json, edited]));
const saleLine = (await db.query("INSERT INTO ledger_entries (kind, category, amount, note, ref_type, ref_id, user_id) VALUES ('income','sales',1000,'sale','pos_order','0',$1) RETURNING id", [adminId])).rows[0].id;
r = await admin("PATCH", `/api/reborn/admin/accounting/ledger/${saleLine}`, { amount: 1 });
check("a sale line is refused (it follows its bill)", r.status === 400, JSON.stringify([r.status, r.json]));
r = await admin("PATCH", `/api/reborn/admin/accounting/ledger/${lineId}`, { amount: 0 });
check("an amount of 0 is refused", r.status === 400, JSON.stringify([r.status, r.json]));
const anyone = makeClient();
r = await anyone("PATCH", `/api/reborn/admin/accounting/ledger/${lineId}`, { amount: 9 });
check("a signed-out visitor cannot correct a line", r.status === 401 || r.status === 403, String(r.status));

// commissions paid in cash from the list
const insertCommission = async (amount) => (await db.query("INSERT INTO staff_item_commissions (user_id, ticket_id, item_id, name, qty, base, amount) VALUES ($1, 0, 0, $2, 1, 1000, $3) RETURNING id", [adminId, "Lady drink " + tag, amount])).rows[0].id;
const first = await insertCommission(10000);
const second = await insertCommission(5000);
r = await admin("GET", "/api/reborn/admin/item-commissions?days=31");
check("the list shows every commission, paid or not", [first, second].every((id) => (r.json?.rows || []).some((x) => x.id === id && x.isSettled === false)), JSON.stringify(r.json?.rows?.length));
const month = new Date().toISOString().slice(0, 7);
const payrollCommission = async () => Number(((await admin("GET", `/api/reborn/admin/payroll?month=${month}`)).json?.staff || []).find((s) => s.user_id === adminId)?.itemCommission || 0);
const company = (await db.query("SELECT id FROM bridge_companies WHERE slug=$1", ["reborn-wave-group"])).rows[0];
await db.query("INSERT INTO bridge_company_members (company_id, user_id, role) VALUES ($1,$2,'admin') ON CONFLICT DO NOTHING", [company.id, adminId]); // the payroll only lists people who belong to the company
const commissionBefore = await payrollCommission();
check("the payroll sees the unpaid commissions first", commissionBefore >= 15000, String(commissionBefore));
r = await admin("POST", "/api/reborn/admin/item-commissions/pay", { ids: [] });
check("paying with nothing ticked is refused", r.status === 400, JSON.stringify([r.status, r.json]));
r = await admin("POST", "/api/reborn/admin/item-commissions/pay", { ids: [first, second] });
const paid = (await db.query("SELECT settled_at, paid_ledger_id FROM staff_item_commissions WHERE id=$1", [first])).rows[0];
const expense = (await db.query("SELECT kind, category, amount::float a FROM ledger_entries WHERE id=$1", [paid?.paid_ledger_id])).rows[0];
check("the ticked commissions are marked paid", r.status === 200 && !!paid?.settled_at && !!paid?.paid_ledger_id, JSON.stringify([r.status, r.json, paid]));
check("one cash expense is booked for the person", expense?.kind === "expense" && expense?.category === "commission" && expense?.a === 15000, JSON.stringify(expense));
r = await admin("POST", "/api/reborn/admin/item-commissions/pay", { ids: [first] });
check("a commission already paid is not paid again", r.status === 400, JSON.stringify([r.status, r.json]));
check("the payroll does not add commissions paid in cash", (await payrollCommission()) === commissionBefore - 15000, String(commissionBefore));
await db.query("DELETE FROM staff_item_commissions WHERE name=$1", ["Lady drink " + tag]);
await db.end();
console.log(failures ? `FAILED: ${failures}` : "ALL PASSED");
process.exit(failures ? 1 : 0);
