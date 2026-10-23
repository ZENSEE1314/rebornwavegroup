// Referral commission on venue bills (promo / flagged items left out, refund takes it back) and the app-order discount. Run against the local test server (see README.md).
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
const register = async (label, n, referralCode) => {
  const email = `${label}${tag}@test.local`.toLowerCase();
  const client = makeClient();
  await client("POST", "/api/auth/register", { email, password: "Passw0rd!", firstName: label, lastName: "Test", phoneNumber: `0818${n}${digits}`.slice(0, 12), dateOfBirth: "1995-01-01", gender: "female", ...(referralCode ? { referralCode } : {}) });
  await client("POST", "/api/auth/login", { email, password: "Passw0rd!" });
  const user = (await db.query("SELECT id, referral_code FROM users WHERE email=$1", [email])).rows[0];
  return { client, id: user.id, code: user.referral_code };
};
const referrer = await register("Refer", "1");
const member = await register("Buyer", "2", referrer.code);
const credits = async () => Number((await db.query("SELECT credits FROM users WHERE id=$1", [referrer.id])).rows[0].credits);
const linked = (await db.query("SELECT referred_by_id FROM users WHERE id=$1", [member.id])).rows[0].referred_by_id;
check("the new member is linked to the referrer", linked === referrer.id, String(linked));

const make = async (name, price, extra = {}) => (await admin("POST", "/api/reborn/admin/pos/products", { name: `${name} ${tag}`, category: "Beer", price, cost: 1000, stock: 100, ...extra })).json;
const beer = await make("Ref Beer", 40000);
const whisky = await make("Ref Whisky", 100000, { referralOk: false });
const promo = await make("Ref Promo", 50000);
await admin("PATCH", `/api/reborn/admin/pos/products/${promo.id}`, { happyStart: "00:00", happyEnd: "23:59", happyPrice: 30000 });
const flag = (await db.query("SELECT referral_ok FROM pos_products WHERE id=$1", [whisky.id])).rows[0];
check("an item can be flagged to never pay referral commission", flag.referral_ok === false, JSON.stringify(flag));

const payBill = async (table, items, memberCode) => {
  const order = (await admin("POST", "/api/reborn/pos/orders", { tableNumber: table })).json.order;
  await admin("POST", `/api/reborn/pos/orders/${order.id}/member`, { memberCode });
  await admin("POST", `/api/reborn/pos/orders/${order.id}/items`, { items });
  const paid = await admin("POST", `/api/reborn/pos/orders/${order.id}/pay`, { paymentMethod: "cash", cashReceived: 10_000_000 });
  return { order, paid };
};
const ticketRow = async (id) => (await db.query("SELECT discount, discount_reason, total, referral_payee, referral_base, referral_percent, referral_amount, referral_note FROM pos_tickets WHERE id=$1", [id])).rows[0];

// off: nothing is paid
await admin("POST", "/api/reborn/admin/settings", { referralOn: false, appDiscountOn: false });
let before = await credits();
let { order: first } = await payBill(`R${tag}`.slice(0, 7), [{ productId: beer.id, qty: 2 }], member.code);
check("nothing is paid while referral commission is off", (await credits()) === before);

await admin("POST", "/api/reborn/admin/settings", { referralOn: true, referralPercent: 10, referralHoldHours: 0, appDiscountOn: true, appDiscountPercent: 10 });
const settings = (await admin("GET", "/api/reborn/admin/settings")).json;
check("the settings are saved", settings.referralOn === true && settings.referralPercent === 10 && settings.appDiscountOn === true && settings.appDiscountPercent === 10, JSON.stringify(settings));

// on: normal beers pay, the flagged whisky and the promo item do not
before = await credits();
const { order: second } = await payBill(`S${tag}`.slice(0, 7), [{ productId: beer.id, qty: 2 }, { productId: whisky.id, qty: 1 }, { productId: promo.id, qty: 1 }], member.code);
let row = await ticketRow(second.id);
check("commission is 10% of the normal items only", Number(row.referral_base) === 80000 && Number(row.referral_amount) === 8000, JSON.stringify(row));
check("the referrer got the RP credits", (await credits()) === before + 8000, String(await credits() - before));
check("the receipt record names the referrer and the items left out", !!row.referral_payee && row.referral_note.includes("Ref Whisky") && row.referral_note.includes("Ref Promo"), JSON.stringify(row));
const history = (await db.query("SELECT commission_amount, status FROM commission_history WHERE related_id=$1 AND related_type='pos_order'", [second.id])).rows;
check("the commission is in the referrer's history", history.length === 1 && Number(history[0].commission_amount) === 8000 && history[0].status === "completed", JSON.stringify(history));

// a refund takes it back
before = await credits();
const refund = await admin("POST", `/api/reborn/admin/accounting/orders/${second.id}/refund`, { reason: "test" });
check("a refund takes the commission back", refund.status === 200 && (await credits()) === before - 8000, `${refund.status} ${await credits() - before}`);
check("the history row is marked reversed", (await db.query("SELECT status FROM commission_history WHERE related_id=$1 AND related_type='pos_order'", [second.id])).rows[0].status === "reversed");

// app order discount + commission on what was really paid
before = await credits();
const table = `A${tag}`.slice(0, 7);
const appOrder = await member.client("POST", "/api/reborn/shop/order", { tableNumber: table, items: [{ productId: beer.id, qty: 2 }] });
check("the member can order through the app", appOrder.status === 200, JSON.stringify(appOrder));
const open = (await db.query("SELECT id FROM pos_tickets WHERE table_number=$1 AND status='open'", [table])).rows[0];
const quote = await admin("POST", "/api/reborn/pos/quote", { ticketId: open.id });
check("the quote shows 10% off the app items", quote.status === 200 && Number(quote.json.appDiscount) === 8000 && Number(quote.json.appPercent) === 10, JSON.stringify(quote.json));
await admin("POST", `/api/reborn/pos/orders/${open.id}/pay`, { paymentMethod: "cash", cashReceived: 10_000_000 });
row = await ticketRow(open.id);
check("the paid bill has the app discount and says so", Number(row.discount) === 8000 && String(row.discount_reason).includes("App order 10%"), JSON.stringify(row));
check("commission is worked out after the discount", Number(row.referral_base) === 72000 && Number(row.referral_amount) === 7200, JSON.stringify(row));

// items the cashier adds are not discounted
const staffTable = `C${tag}`.slice(0, 7);
const cashier = (await admin("POST", "/api/reborn/pos/orders", { tableNumber: staffTable })).json.order;
await admin("POST", `/api/reborn/pos/orders/${cashier.id}/items`, { items: [{ productId: beer.id, qty: 1 }] });
const staffQuote = await admin("POST", "/api/reborn/pos/quote", { ticketId: cashier.id });
check("items the cashier adds get no app discount", Number(staffQuote.json.appDiscount) === 0, JSON.stringify(staffQuote.json));

// an item the admin unticked "App-order discount applies" gets none
await admin("PATCH", `/api/reborn/admin/pos/products/${beer.id}`, { appDiscountOk: false });
const noDiscTable = `D${tag}`.slice(0, 7);
await member.client("POST", "/api/reborn/shop/order", { tableNumber: noDiscTable, items: [{ productId: beer.id, qty: 2 }] });
const noDiscOpen = (await db.query("SELECT id FROM pos_tickets WHERE table_number=$1 AND status='open'", [noDiscTable])).rows[0];
const noDiscQuote = await admin("POST", "/api/reborn/pos/quote", { ticketId: noDiscOpen.id });
check("an item with the app discount unticked gets none", noDiscQuote.status === 200 && Number(noDiscQuote.json.appDiscount) === 0, JSON.stringify(noDiscQuote.json));
await admin("PATCH", `/api/reborn/admin/pos/products/${beer.id}`, { appDiscountOk: true });
const againQuote = await admin("POST", "/api/reborn/pos/quote", { ticketId: noDiscOpen.id });
check("ticking it again brings the discount back", Number(againQuote.json.appDiscount) === 8000, JSON.stringify(againQuote.json));

// anti-cheat: a new referral earns nothing for 18 hours
await admin("POST", "/api/reborn/admin/settings", { referralOn: true, referralPercent: 10, referralHoldHours: 18 });
const newcomer = await register("Fresh", "3", referrer.code);
before = await credits();
const early = await payBill(`H${tag}`.slice(0, 7), [{ productId: beer.id, qty: 2 }], newcomer.code);
const earlyRow = await ticketRow(early.order.id);
check("a bill on a brand-new referral pays the referrer nothing", early.paid.status === 200 && (await credits()) === before && Number(earlyRow.referral_amount) === 0, JSON.stringify([earlyRow, await credits() - before]));
check("the bill says when the commission starts", String(earlyRow.referral_note || "").includes("commission starts"), JSON.stringify(earlyRow.referral_note));
await db.query("UPDATE referrals SET created_at = (now() AT TIME ZONE 'UTC') - interval '19 hours' WHERE referred_id=$1", [newcomer.id]);
before = await credits();
const late = await payBill(`J${tag}`.slice(0, 7), [{ productId: beer.id, qty: 2 }], newcomer.code);
const lateRow = await ticketRow(late.order.id);
check("19 hours after the referral the commission is paid", late.paid.status === 200 && Number(lateRow.referral_amount) === 8000 && (await credits()) === before + 8000, JSON.stringify([lateRow, await credits() - before]));
await db.query("UPDATE referrals SET created_at = (now() AT TIME ZONE 'UTC') WHERE referred_id=$1", [newcomer.id]);
await admin("POST", "/api/reborn/admin/settings", { referralHoldHours: 0 });
before = await credits();
await payBill(`K${tag}`.slice(0, 7), [{ productId: beer.id, qty: 1 }], newcomer.code);
check("with the hold set to 0 hours it pays at once", (await credits()) === before + 4000, String(await credits() - before));

await admin("POST", "/api/reborn/admin/settings", { referralOn: false, appDiscountOn: false });
await db.end();
console.log(failures ? `${failures} FAILED` : "ALL PASSED");
process.exit(failures ? 1 : 0);
