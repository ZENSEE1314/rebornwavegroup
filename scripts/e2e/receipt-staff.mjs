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

r = await staff("POST", "/api/reborn/admin/inventory/receipt/save", { payMethod: "cash", kind: "expense", supplier: "PLN", invoiceNo: "EL-" + tag, date: "2026-10-14", amount: 450000, category: "utilities", items: [{ name: "Electricity October", qty: 1, unitCost: 450000 }] });
check("a cashier saves an expense receipt", r.status === 200, JSON.stringify(r.json));
const booked = (await db.query("SELECT kind, category, amount, user_id FROM ledger_entries WHERE ref_type='receipt_expense' AND ref_id=$1", ["EL-" + tag])).rows;
check("the expense is booked in the accounts under the cashier's name", booked.length === 1 && booked[0].kind === "expense" && Number(booked[0].amount) === 450000 && booked[0].user_id === staffId, JSON.stringify(booked));
check("the answer shows no accounting figures beyond the bill itself", r.json && !("balance" in r.json) && !("income" in r.json) && !("profit" in r.json), JSON.stringify(r.json));

const ocrText = ["CV SINAR BINTANG", "Jl. Sudirman No. 12 Jakarta", "Telp 0821-7603-100", "14/10/2026 14:05", "2 Coca Cola 1L 15.000 30.000", "TOTAL 30.000"].join("\n");
r = await staff("POST", "/api/reborn/admin/inventory/receipt/read-text", { text: ocrText });
check("text read from a photo by the browser becomes supplier, address, date and a line", r.status === 200 && r.json.supplier === "CV SINAR BINTANG" && r.json.supplierAddress.startsWith("Jl. Sudirman") && r.json.date === "2026-10-14" && r.json.items.length === 1 && r.json.items[0].qty === 2, JSON.stringify(r.json));
r = await staff("POST", "/api/reborn/admin/inventory/receipt/read-text", { text: "zzz" });
check("text with nothing readable is refused", r.status === 400, r.status);
r = await anon("POST", "/api/reborn/admin/inventory/receipt/read-text", { text: ocrText });
check("a signed-out visitor cannot use the text reader", r.status === 401 || r.status === 403, r.status);

// a supplier typed by hand once is recognised on the next receipt
r = await staff("POST", "/api/reborn/expenses", { payMethod: "cash", category: "supplies", amount: 30000, spentOn: new Date().toISOString().slice(0, 10), payee: "CV SINAR BINTANG", payeeAddress: "Jl. Sudirman 12", payeePhone: "0821-7603-100", note: "first time, typed by hand", items: [{ name: "Coca Cola 1L", qty: 2, unitCost: 15000 }] });
check("a supplier is saved by hand the first time", r.status === 200, JSON.stringify(r.json));
r = await staff("GET", "/api/reborn/expenses/vendors");
check("the supplier list has it with its address and category", r.status === 200 && r.json.vendors.some((v) => v.name === "CV SINAR BINTANG" && v.address === "Jl. Sudirman 12" && v.category === "supplies" && v.items.length === 1), JSON.stringify(r.json));
r = await staff("POST", "/api/reborn/admin/inventory/receipt/read-text", { text: "CV SINAR BINTANG\nTOTAL 30.000" });
check("the next receipt with that name brings the saved details back", r.status === 200 && r.json.vendor && r.json.vendor.address === "Jl. Sudirman 12" && r.json.vendor.items[0].name === "Coca Cola 1L", JSON.stringify(r.json.vendor));
r = await staff("POST", "/api/reborn/admin/inventory/receipt/read-text", { text: "Toko Lain Sekali\nTOTAL 30.000" });
check("a new supplier brings nothing back", r.status === 200 && !r.json.vendor, JSON.stringify(r.json.vendor));

// bills on credit terms: booked now, listed as not paid until a manager / the admin marks them paid
const boss = makeClient();
await boss("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });
const today = new Date().toISOString().slice(0, 10);
r = await staff("POST", "/api/reborn/expenses", { category: "supplies", amount: 120000, spentOn: today, payee: "Toko Tempo " + tag, note: "30 days", paid: false, dueDate: "2026-12-01" });
check("an expense upload can be left not paid yet (credit terms)", r.status === 200, JSON.stringify(r.json));
const expenseId = r.json?.expense?.id;
r = await staff("POST", "/api/reborn/admin/inventory/receipt/save", { kind: "goods", supplier: "PT Tempo " + tag, invoiceNo: "TP-" + tag, date: today, paid: false, dueDate: "2026-11-30", items: [{ productId: null, name: "Tempo Beer " + tag, qty: 2, unitCost: 50000, packSize: 1 }] });
check("a stock receipt can be left not paid yet", r.status === 200 && r.json.created === 1, JSON.stringify(r.json));
r = await staff("GET", "/api/reborn/expenses/payables");
const mine = (r.json?.payables || []).filter((p) => (p.supplier || "").includes(tag));
check("the staff member sees both unpaid bills with their due dates", r.status === 200 && mine.length === 2 && mine.some((p) => p.dueDate === "2026-12-01") && r.json.canPay === false, JSON.stringify(r.json));
check("the unpaid bills are counted in the amount owed", r.json.total >= 220000, String(r.json?.total));
r = await staff("POST", `/api/reborn/expenses/payables/${mine[0].id}/pay`, { method: "cash" });
check("staff cannot mark a bill as paid", r.status === 403, JSON.stringify(r));
r = await boss("GET", "/api/reborn/expenses/payables");
check("the admin sees every unpaid bill and may mark them paid", r.status === 200 && r.json.canPay === true && r.json.payables.length >= 2, JSON.stringify(r.json?.payables?.length));
const stockBill = mine.find((p) => p.kind === "stock");
r = await boss("POST", `/api/reborn/expenses/payables/${stockBill.id}/pay`, { method: "cash" });
check("the admin marks the stock bill as paid", r.status === 200 && r.json.payable.status === "paid", JSON.stringify(r.json));
r = await boss("POST", `/api/reborn/expenses/payables/${stockBill.id}/pay`, { method: "cash" });
check("a bill cannot be paid twice", r.status === 404, r.status);
r = await boss("POST", `/api/reborn/expenses/${expenseId}/void`, { reason: "wrong supplier" });
r = await staff("GET", "/api/reborn/expenses/payables");
check("a voided expense leaves the unpaid list", !(r.json?.payables || []).some((p) => p.supplier === "Toko Tempo " + tag), JSON.stringify(r.json?.payables?.map((p) => p.supplier)));
const bookedUnpaid = (await db.query("SELECT count(*)::int n FROM ledger_entries WHERE ref_type='receipt' AND ref_id=$1", ["TP-" + tag])).rows[0].n;
check("an unpaid stock receipt is still booked in the accounts (the goods came in)", bookedUnpaid === 1, String(bookedUnpaid));

// correcting an upload: the uploader for 24 h, a manager / the admin any time; the accounts follow
r = await staff("POST", "/api/reborn/expenses", { payMethod: "cash", category: "supplies", amount: 70000, spentOn: today, payee: "Toko Salah " + tag, note: "typo" });
const wrong = r.json.expense;
r = await staff("POST", `/api/reborn/expenses/${wrong.id}/edit`, { category: "electricity", amount: 75000, spentOn: today, payee: "PLN " + tag, note: "corrected" });
check("the uploader corrects their own upload", r.status === 200 && r.json.expense.category === "electricity" && Number(r.json.expense.amount) === 75000 && r.json.expense.editCount === 1, JSON.stringify(r.json));
const ledgerNow = (await db.query("SELECT amount, category FROM ledger_entries WHERE id=$1", [wrong.ledgerEntryId])).rows[0];
check("the accounting line follows the correction", Number(ledgerNow.amount) === 75000 && ledgerNow.category === "utilities", JSON.stringify(ledgerNow));
r = await staff("POST", `/api/reborn/expenses/${expenseId}/edit`, { amount: 1 });
check("a voided upload cannot be edited", r.status === 400, JSON.stringify(r));
await db.query("UPDATE expense_uploads SET created_at = now() - interval '3 days' WHERE id=$1", [wrong.id]);
r = await staff("POST", `/api/reborn/expenses/${wrong.id}/edit`, { amount: 76000 });
check("staff cannot edit their own upload after 24 hours", r.status === 403, JSON.stringify(r));
r = await boss("POST", `/api/reborn/expenses/${wrong.id}/edit`, { amount: 76000, paid: false, dueDate: "2026-12-15" });
check("a manager / the admin can still edit it, and make it a bill not paid yet", r.status === 200 && Number(r.json.expense.amount) === 76000 && r.json.expense.editCount === 2, JSON.stringify(r.json));
r = await boss("GET", "/api/reborn/expenses/payables");
check("the corrected upload shows as a bill to pay with the new amount", (r.json.payables || []).some((p) => p.supplier === "PLN " + tag && Number(p.amount) === 76000 && p.dueDate === "2026-12-15"), JSON.stringify(r.json?.payables?.map((p) => p.supplier)));

// a bill the customer has not paid at closing time: kept open on account, table freed, paid later
const itemRow = (await boss("POST", "/api/reborn/admin/pos/products", { name: "Account Item " + tag, category: "Food", price: 100000, cost: 10000, stock: 50 })).json;
const mkBill = async (table) => { const o = (await boss("POST", "/api/reborn/pos/orders", { tableNumber: table })).json.order; await boss("POST", `/api/reborn/pos/orders/${o.id}/items`, { items: [{ productId: itemRow.id, qty: 2 }] }); return o; };
const tableName = ("AC" + tag).slice(0, 7);
const bill = await mkBill(tableName);
r = await boss("POST", `/api/reborn/pos/orders/${bill.id}/on-account`, { customer: "" });
check("who owes it must be named", r.status === 400, JSON.stringify(r));
r = await boss("POST", `/api/reborn/pos/orders/${bill.id}/on-account`, { customer: "Pak Budi", phone: "0812999", note: "pays Friday" });
check("a bill can be kept on account", r.status === 200 && r.json.customer === "Pak Budi", JSON.stringify(r.json));
const listed = (await boss("GET", "/api/reborn/pos/orders?status=open")).json.find((o) => o.id === bill.id);
check("it stays in the open list with who owes it", !!listed && listed.onAccount === true && listed.onAccountCustomer === "Pak Budi" && listed.onAccountPhone === "0812999", JSON.stringify(listed && [listed.onAccount, listed.onAccountCustomer]));
const again = (await boss("POST", "/api/reborn/pos/orders", { tableNumber: tableName })).json.order;
check("the table is free: opening it again starts a new bill", again && again.id !== bill.id, JSON.stringify([again?.id, bill.id]));
await boss("POST", `/api/reborn/pos/orders/${again.id}/items`, { items: [{ productId: itemRow.id, qty: 1 }] });
r = await boss("POST", `/api/reborn/pos/orders/${bill.id}/on-account/clear`);
check("it cannot go back to an ordinary bill while the table has another one", r.status === 400, JSON.stringify(r));
await boss("POST", `/api/reborn/pos/orders/${again.id}/pay`, { paymentMethod: "cash", cashReceived: 1000000 });
const report = (await boss("POST", "/api/reborn/admin/venue/close")).json.report;
check("closing the day lists the unpaid bill and carries it over", report && report.onAccount.count >= 1 && report.onAccount.bills.some((b) => b.customer === "Pak Budi" && b.total === 200000), JSON.stringify(report?.onAccount));
const stillOpen = (await boss("GET", "/api/reborn/pos/orders?status=open")).json.find((o) => o.id === bill.id);
check("after closing the day the bill is still open", !!stillOpen && stillOpen.onAccount === true, JSON.stringify(stillOpen && stillOpen.status));
r = await boss("POST", `/api/reborn/pos/orders/${bill.id}/pay`, { paymentMethod: "cash", cashReceived: 1000000 });
check("next day it is paid like any bill", r.status === 200, JSON.stringify(r.json?.message));
const paidRow = (await db.query("SELECT status, total, on_account FROM pos_tickets WHERE id=$1", [bill.id])).rows[0];
check("and it is paid, with the on-account note kept", paidRow.status === "paid" && Number(paidRow.total) === 200000 && paidRow.on_account === true, JSON.stringify(paidRow));

// every paid bill states cash or card
r = await staff("POST", "/api/reborn/expenses", { category: "supplies", amount: 5000, spentOn: today, note: "no method" });
check("a paid expense without cash or card is refused", r.status === 400, JSON.stringify(r));
r = await staff("POST", "/api/reborn/expenses", { category: "supplies", amount: 5000, spentOn: today, note: "by card", payMethod: "card" });
check("a card expense is saved with its method", r.status === 200 && r.json.expense.payMethod === "card", JSON.stringify(r.json));
const cardNote = (await db.query("SELECT note FROM ledger_entries WHERE id=$1", [r.json.expense.ledgerEntryId])).rows[0].note;
check("the accounting line says it was paid by card", /card/.test(cardNote), cardNote);
r = await staff("POST", "/api/reborn/admin/inventory/receipt/save", { kind: "goods", supplier: "No Method " + tag, items: [{ productId: null, name: "Nm Item " + tag, qty: 1, unitCost: 1000, packSize: 1 }] });
check("a paid stock receipt without cash or card is refused", r.status === 400, JSON.stringify(r));
r = await staff("POST", "/api/reborn/expenses", { category: "supplies", amount: 8000, spentOn: today, payee: "Method Later " + tag, note: "credit", paid: false });
const laterBill = (await boss("GET", "/api/reborn/expenses/payables")).json.payables.find((p) => p.supplier === "Method Later " + tag);
r = await boss("POST", `/api/reborn/expenses/payables/${laterBill.id}/pay`, {});
check("marking a bill paid needs cash or card too", r.status === 400, JSON.stringify(r));
r = await boss("POST", `/api/reborn/expenses/payables/${laterBill.id}/pay`, { method: "card" });
check("and it records the method", r.status === 200 && r.json.payable.payMethod === "card", JSON.stringify(r.json));

// an upload that was really food or drinks is moved to the stock: the expense is replaced, the purchase counted once
r = await staff("POST", "/api/reborn/expenses", { payMethod: "cash", category: "supplies", amount: 60000, spentOn: today, payee: "Warung Pindah " + tag, note: "air galon" });
const toMove = r.json.expense;
r = await staff("POST", `/api/reborn/expenses/${toMove.id}/to-stock`, { supplier: "Warung Pindah " + tag, date: today, paid: true, payMethod: "cash", items: [{ productId: null, name: "Air Galon " + tag, qty: 4, unitCost: 15000, packSize: 1 }] });
check("an upload is moved to the stock", r.status === 200 && r.json.created === 1 && r.json.lines === 1, JSON.stringify(r.json));
const moved = (await db.query("SELECT status, void_reason FROM expense_uploads WHERE id=$1", [toMove.id])).rows[0];
check("the old expense is voided with the reason", moved.status === "voided" && /stock/i.test(moved.void_reason), JSON.stringify(moved));
const newItem = (await db.query("SELECT id, stock, pos_visible FROM pos_products WHERE name=$1", ["Air Galon " + tag])).rows[0];
check("the new item is in the inventory with its stock, hidden from the POS", !!newItem && newItem.stock === 4 && newItem.pos_visible === false, JSON.stringify(newItem));
const bookKinds = (await db.query("SELECT ref_type FROM ledger_entries WHERE ref_id = $1 OR ref_id = $2 ORDER BY id", [String(toMove.id), "none"])).rows.map((x) => x.ref_type);
check("the expense's accounting line is reversed", bookKinds.includes("expense_void"), JSON.stringify(bookKinds));
r = await staff("POST", `/api/reborn/expenses/${toMove.id}/to-stock`, { supplier: "x", date: today, paid: true, payMethod: "cash", items: [{ productId: null, name: "Again " + tag, qty: 1, unitCost: 1000, packSize: 1 }] });
check("a voided expense cannot be moved again", r.status === 400, JSON.stringify(r));

r = await staff("GET", "/api/reborn/admin/accounting/ledger");
check("the cashier cannot open the accounts (ledger)", r.status === 403 || r.status === 401, r.status);
r = await staff("GET", "/api/reborn/admin/accounting/summary");
check("the cashier cannot open the accounts (summary)", r.status === 403 || r.status === 401, r.status);

await db.end();
console.log(failures ? `${failures} FAILED` : "ALL PASSED");
process.exit(failures ? 1 : 0);
