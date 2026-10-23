// Running costs, the daily target, and the Expenses screen for the accounts staff (switched on per person, upload, void, a bill that fills in a month's real cost). Run against the local test server (see README.md).
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
const staffEmail = `acct${tag}@test.local`;
const staff = makeClient();
await staff("POST", "/api/auth/register", { email: staffEmail, password: "Passw0rd!", firstName: "Accounts", lastName: "Staff", phoneNumber: `08184${digits}`.slice(0, 12), dateOfBirth: "1995-01-01", gender: "female" });
await db.query("UPDATE users SET role='staff' WHERE email=$1", [staffEmail]);
await staff("POST", "/api/auth/login", { email: staffEmail, password: "Passw0rd!" });
const staffId = (await db.query("SELECT id FROM users WHERE email=$1", [staffEmail])).rows[0].id;
const company = (await db.query("SELECT id FROM bridge_companies WHERE slug=$1", ["reborn-wave-group"])).rows[0];
await db.query("INSERT INTO bridge_company_members (company_id, user_id, role) VALUES ($1,$2,'staff') ON CONFLICT DO NOTHING", [company.id, staffId]);

// every staff account has the Expenses page; the main admin can hide it from one person
let r = await staff("GET", "/api/reborn/expenses");
check("staff can open Expenses by default", r.status === 200 && Array.isArray(r.json.expenses), JSON.stringify(r));
r = await admin("PUT", `/api/reborn/admin/tab-access/${staffId}`, { tabs: ["Overview", "POS"] });
r = await staff("GET", "/api/reborn/expenses");
check("a staff member limited without Expenses cannot open it", r.status === 403, JSON.stringify(r));
r = await admin("PUT", `/api/reborn/admin/tab-access/${staffId}`, { tabs: ["Overview", "POS", "Expenses"] });
r = await staff("GET", "/api/reborn/expenses");
check("that person can open Expenses again", r.status === 200 && Array.isArray(r.json.expenses), JSON.stringify(r));

// uploading
const today = new Date().toISOString().slice(0, 10);
r = await staff("POST", "/api/reborn/expenses", { payMethod: "cash", category: "rent", amount: 1000, spentOn: today });
check("an expense with no photo and no note is refused", r.status === 400, JSON.stringify(r));
r = await staff("POST", "/api/reborn/expenses", { payMethod: "cash", category: "nope", amount: 1000, spentOn: today, note: "x" });
check("an unknown category is refused", r.status === 400, JSON.stringify(r));
r = await staff("POST", "/api/reborn/expenses", { payMethod: "cash", category: "rent", amount: 1000, spentOn: "2099-01-01", note: "x" });
check("a date in the future is refused", r.status === 400, JSON.stringify(r));
r = await staff("POST", "/api/reborn/expenses", { payMethod: "cash", category: "supplies", amount: 90000, spentOn: new Date().toISOString().slice(0, 10), spentTime: "14:05", payee: "Toko Maju", payeeAddress: "Jl. Sudirman 12", payeePhone: "0812555", invoiceNo: "INV-" + tag, items: [{ name: "Tissue", qty: 3, unitCost: 20000 }, { name: "Soap", qty: 1, unitCost: 30000 }], note: "cleaning" });
check("an upload keeps supplier address, phone, time and the item lines", r.status === 200 && r.json.expense.payeeAddress === "Jl. Sudirman 12" && r.json.expense.spentTime === "14:05" && r.json.expense.items.length === 2 && r.json.expense.items[0].qty === 3, JSON.stringify(r.json));
const otherEmail = `other${tag}@test.local`;
const other = makeClient();
await other("POST", "/api/auth/register", { email: otherEmail, password: "Passw0rd!", firstName: "Other", lastName: "Staff", phoneNumber: `08185${digits}`.slice(0, 12), dateOfBirth: "1995-01-01", gender: "female" });
await db.query("UPDATE users SET role='staff' WHERE email=$1", [otherEmail]);
await other("POST", "/api/auth/login", { email: otherEmail, password: "Passw0rd!" });
r = await other("GET", "/api/reborn/expenses");
check("another staff member does not see these uploads", r.status === 200 && r.json.expenses.length === 0 && r.json.total === 0, JSON.stringify(r.json));
r = await admin("GET", "/api/reborn/expenses");
check("the main admin sees every upload with the supplier address", r.json.expenses.some((e) => e.invoiceNo === "INV-" + tag && e.payeePhone === "0812555"), JSON.stringify(r.json.expenses?.length));
const securityBefore = (await staff("GET", "/api/reborn/expenses")).json.totals.security || 0;
r = await staff("POST", "/api/reborn/expenses", { payMethod: "cash", category: "security", amount: 450000, spentOn: today, payee: "Guard Co", note: "October guards" });
const expense = r.json?.expense;
check("an expense is saved with who uploaded it", r.status === 200 && expense?.uploadedByName === "Accounts Staff" && Number(expense.amount) === 450000, JSON.stringify(r));
const ledger = (await db.query("SELECT kind, category, amount, user_id FROM ledger_entries WHERE ref_type='expense_upload' AND ref_id=$1", [String(expense.id)])).rows[0];
check("it books one expense in the accounts", ledger?.kind === "expense" && Number(ledger.amount) === 450000 && ledger.user_id === staffId, JSON.stringify(ledger));
r = await staff("GET", "/api/reborn/expenses");
check("the list shows it and its total", r.json.expenses.some((e) => e.id === expense.id) && r.json.total >= 450000, JSON.stringify(r.json.totals));

// voiding is for managers and the main admin, with a reason, and books a reversal
r = await staff("POST", `/api/reborn/expenses/${expense.id}/void`, { reason: "oops" });
check("the accounts staff cannot void an expense", r.status === 403, JSON.stringify(r));
r = await admin("POST", `/api/reborn/expenses/${expense.id}/void`, { reason: "" });
check("voiding needs a reason", r.status === 400, JSON.stringify(r));
r = await admin("POST", `/api/reborn/expenses/${expense.id}/void`, { reason: "entered twice" });
const reversal = (await db.query("SELECT kind, amount FROM ledger_entries WHERE ref_type='expense_void' AND ref_id=$1", [String(expense.id)])).rows[0];
check("the main admin voids it and the accounts get a reversal", r.status === 200 && reversal?.kind === "income" && Number(reversal.amount) === 450000, JSON.stringify([r, reversal]));
r = await staff("GET", "/api/reborn/expenses");
check("a voided expense no longer counts in the total", (r.json.totals.security || 0) === securityBefore, JSON.stringify([securityBefore, r.json.totals]));
r = await admin("POST", `/api/reborn/expenses/${expense.id}/void`, { reason: "again" });
check("it cannot be voided twice", r.status === 400, JSON.stringify(r));

// running costs and the daily target
const day = "2026-10-15"; // 31 days in the month
await admin("PUT", "/api/reborn/admin/fixed-costs/actual", { month: "2026-10", id: "power", amount: null }); // a bill typed by an earlier run
await admin("PUT", "/api/reborn/admin/fixed-costs", { costs: [
  { id: "rent", name: "Rent", category: "rent", amount: 3100000, period: "monthly", isCounted: true },
  { id: "power", name: "Electricity", category: "electricity", amount: null, period: "monthly", isCounted: true },
  { id: "hq", name: "Head office", category: "other", amount: 999999, period: "monthly", isCounted: false },
], salaryFromPayroll: false });
r = await staff("GET", `/api/reborn/manager/daily-target?day=${day}`);
check("staff cannot read the daily target", r.status === 403, JSON.stringify(r));
r = await admin("GET", `/api/reborn/manager/daily-target?day=${day}`);
check("the daily cost is the monthly rent over the days of the month", r.status === 200 && r.json.perDay === 100000, JSON.stringify(r.json));
check("a bill that has not come yet is named, not counted", JSON.stringify(r.json.pending) === JSON.stringify(["Electricity"]), JSON.stringify(r.json.pending));
check("a cost marked not counted is left out", !r.json.lines.some((line) => line.id === "hq"), JSON.stringify(r.json.lines));

// an upload that settles a monthly cost becomes that month's real bill
r = await staff("POST", "/api/reborn/expenses", { payMethod: "cash", category: "electricity", amount: 620000, spentOn: "2026-10-10", payee: "PLN", note: "October", fixedCostId: "power" });
check("an upload can settle a running cost", r.status === 200, JSON.stringify(r));
const powerId = r.json.expense.id;
r = await admin("GET", `/api/reborn/manager/daily-target?day=${day}`);
check("the real bill now counts: 3,100,000 + 620,000 over 31 days", r.json.perDay === 120000 && r.json.pending.length === 0, JSON.stringify(r.json));
await admin("POST", `/api/reborn/expenses/${powerId}/void`, { reason: "wrong bill" });
r = await admin("GET", `/api/reborn/manager/daily-target?day=${day}`);
check("voiding that upload takes the bill back out", r.json.perDay === 100000 && r.json.pending[0] === "Electricity", JSON.stringify(r.json));
r = await admin("PUT", "/api/reborn/admin/fixed-costs/actual", { month: "2026-10", id: "power", amount: 310000 });
check("the admin can also type a month's bill by hand", r.status === 200, JSON.stringify(r));
r = await admin("GET", `/api/reborn/manager/daily-target?day=${day}`);
check("a typed bill counts too", r.json.perDay === 110000, JSON.stringify(r.json));

// reports: every number can be opened to the lines behind it
const month = today.slice(0, 7);
r = await staff("POST", "/api/reborn/expenses", { payMethod: "cash", category: "security", amount: 200000, spentOn: today, payee: "Guard Co", note: "guards", photoUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg==" });
const guardsId = r.json.expense.id;
await staff("POST", "/api/reborn/expenses", { payMethod: "cash", category: "police", amount: 100000, spentOn: today, payee: "Station", note: "monthly" });
r = await admin("GET", `/api/reborn/admin/accounting/monthly?month=${month}`);
check("the monthly report lists security and police on their own lines", r.status === 200 && r.json.report.costs.security >= 200000 && r.json.report.costs.police >= 100000, JSON.stringify(r.json.report?.costs));
check("the report adds the costs up in four groups: items, staff, utilities, company", r.json.report.groups && r.json.report.groups.staff >= 300000 && Object.values(r.json.report.groups).reduce((a, b) => a + b, 0) === r.json.report.costTotal, JSON.stringify(r.json.report?.groups));
check("a voided upload is not counted in its line", r.json.report.costs.electricity === 0, JSON.stringify(r.json.report?.costs));
r = await admin("GET", `/api/reborn/admin/accounting/report-lines?group=security&month=${month}`);
const guardLine = r.json?.lines?.find((l) => l.upload?.id === guardsId);
check("a line opens to the entries behind it, with who uploaded it", r.status === 200 && guardLine?.upload?.uploadedBy === "Accounts Staff" && guardLine.upload.payee === "Guard Co", JSON.stringify(r.json?.lines?.[0]));
check("the lines add up to the number on the report", Math.abs(r.json.total - (await admin("GET", `/api/reborn/admin/accounting/monthly?month=${month}`)).json.report.costs.security) < 0.01, JSON.stringify(r.json?.total));
r = await admin("GET", `/api/reborn/admin/accounting/ledger/${guardLine.id}/photo`);
check("the receipt photo of a line can be opened", r.status === 200 && String(r.json.photoUrl).startsWith("data:image"), JSON.stringify(r));
r = await admin("GET", "/api/reborn/admin/accounting/report-lines?group=nope");
check("an unknown line is refused", r.status === 400, JSON.stringify(r));
r = await staff("GET", `/api/reborn/admin/accounting/monthly?month=${month}`);
check("staff cannot read the reports", r.status === 403 || r.status === 401, JSON.stringify(r));
r = await admin("GET", "/api/reborn/admin/accounting/overall");
check("the overall report has the total and a row per month", r.status === 200 && r.json.months.some((m) => m.month === month) && r.json.total.costs.security >= 200000, JSON.stringify(r.json?.months?.[0]));

await admin("PUT", "/api/reborn/admin/fixed-costs/actual", { month: "2026-10", id: "power", amount: null });
await admin("PUT", "/api/reborn/admin/fixed-costs", { costs: [], salaryFromPayroll: false });
// a bill keyed in today with an older receipt date is not lost from view
const older = new Date(); older.setUTCMonth(older.getUTCMonth() - 2);
const olderDay = older.toISOString().slice(0, 10);
r = await staff("POST", "/api/reborn/expenses", { payMethod: "cash", category: "supplies", amount: 4321, spentOn: olderDay, payee: "Old Bill Shop", note: "older month" });
check("a bill with an older receipt date is saved", r.status === 200, JSON.stringify(r));
r = await staff("GET", "/api/reborn/expenses");
check("it is not in this month's list", !r.json.expenses.some((x) => x.payee === "Old Bill Shop"));
check("but the list shows it under 'saved recently, other month'", r.json.recent.some((x) => x.payee === "Old Bill Shop"), JSON.stringify(r.json.recent?.map((x) => x.payee)));
r = await staff("GET", `/api/reborn/expenses?month=${olderDay.slice(0, 7)}`);
check("and it is in its own month's list", r.json.expenses.some((x) => x.payee === "Old Bill Shop"));
await db.end();
console.log(failures ? `${failures} FAILED` : "ALL PASSED");
process.exit(failures ? 1 : 0);
