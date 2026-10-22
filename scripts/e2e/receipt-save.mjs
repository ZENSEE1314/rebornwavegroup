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

// goods: a box line becomes bottles, the item is made with supplier + phone + pack, dated the receipt's day
const name = "Rcpt Beer " + tag;
let r = await admin("POST", "/api/reborn/admin/inventory/receipt/save", { payMethod: "cash", supplier: "CV Test Supplier", supplierPhone: "0778123456", invoiceNo: "SL-" + tag, date: "2026-10-14", kind: "goods",
  items: [{ name, qty: 2, unitCost: 480000, packSize: 24, productId: null }] });
check("the receipt is saved", r.status === 200 && r.json.created === 1, JSON.stringify(r.json));
const p = (await db.query("SELECT id, stock, cost, units_per_pack, pack_price, supplier_name, supplier_phone, pos_visible FROM pos_products WHERE name=$1", [name])).rows[0];
check("2 boxes of 24 are 48 bottles in stock", p?.stock === 48, JSON.stringify(p));
check("the cost of one bottle is the box price ÷ 24", Number(p?.cost) === 20000, JSON.stringify(p));
check("the new item keeps its pack size and box price", p?.units_per_pack === 24 && Number(p?.pack_price) === 480000, JSON.stringify(p));
check("the new item has the supplier name and number", p?.supplier_name === "CV Test Supplier" && p?.supplier_phone === "0778123456", JSON.stringify(p));
check("the new item stays out of the POS until it has a price", p?.pos_visible === false, JSON.stringify(p));
const mv = (await db.query("SELECT delta, unit_cost, supplier, created_at::date::text AS day FROM stock_movements WHERE product_id=$1", [p.id])).rows[0];
check("the stock movement is dated the receipt's day with the bottle cost", mv && mv.delta === 48 && Number(mv.unit_cost) === 20000 && mv.day === "2026-10-14" && mv.supplier === "CV Test Supplier", JSON.stringify(mv));
const l = (await db.query("SELECT kind, category, amount, created_at::date::text AS day FROM ledger_entries WHERE ref_type='receipt' AND ref_id=$1", ["SL-" + tag])).rows[0];
check("the purchase is booked at the box total on the same day", l && l.kind === "expense" && l.category === "purchase" && Number(l.amount) === 960000 && l.day === "2026-10-14", JSON.stringify(l));

// a second delivery of the same item adds to it
r = await admin("POST", "/api/reborn/admin/inventory/receipt/save", { payMethod: "cash", supplier: "CV Test Supplier", date: "2026-10-14", kind: "goods", items: [{ productId: p.id, name, qty: 1, unitCost: 480000, packSize: 24 }] });
const p2 = (await db.query("SELECT stock FROM pos_products WHERE id=$1", [p.id])).rows[0];
check("a later delivery adds another 24", r.status === 200 && p2.stock === 72, JSON.stringify(p2));

// a line with no pack stays one for one
r = await admin("POST", "/api/reborn/admin/inventory/receipt/save", { payMethod: "cash", supplier: "CV Test Supplier", date: "2026-10-14", kind: "goods", items: [{ productId: p.id, name, qty: 5, unitCost: 20000 }] });
const p3 = (await db.query("SELECT stock FROM pos_products WHERE id=$1", [p.id])).rows[0];
check("a line without a pack size adds the same number of units", r.status === 200 && p3.stock === 77, JSON.stringify(p3));

// a future date falls back to now
r = await admin("POST", "/api/reborn/admin/inventory/receipt/save", { payMethod: "cash", supplier: "S", date: "2099-01-01", kind: "goods", items: [{ productId: p.id, name, qty: 1, unitCost: 20000 }] });
const mvf = (await db.query("SELECT created_at FROM stock_movements WHERE product_id=$1 ORDER BY id DESC LIMIT 1", [p.id])).rows[0];
check("a date in the future is not used", r.status === 200 && mvf.created_at.getFullYear() < 2090, JSON.stringify(mvf));

// expense bill: no stock, one expense line, chosen category, bill's day
const before = (await db.query("SELECT count(*)::int n FROM stock_movements")).rows[0].n;
r = await admin("POST", "/api/reborn/admin/inventory/receipt/save", { payMethod: "cash", kind: "expense", category: "utilities", supplier: "PLN", invoiceNo: "PLN-" + tag, date: "2026-10-13", items: [{ name: "Electricity October", qty: 1, unitCost: 2500000 }] });
check("the bill is saved", r.status === 200 && Number(r.json.amount) === 2500000, JSON.stringify(r.json));
const e = (await db.query("SELECT kind, category, amount, note, created_at::date::text AS day FROM ledger_entries WHERE ref_type='receipt_expense' AND ref_id=$1", ["PLN-" + tag])).rows[0];
check("the bill is one expense line in its category and on its day", e && e.kind === "expense" && e.category === "utilities" && Number(e.amount) === 2500000 && e.day === "2026-10-13" && /PLN/.test(e.note), JSON.stringify(e));
const after = (await db.query("SELECT count(*)::int n FROM stock_movements")).rows[0].n;
check("a bill touches no stock", before === after, `${before} → ${after}`);
r = await admin("POST", "/api/reborn/admin/inventory/receipt/save", { payMethod: "cash", kind: "expense", category: "nonsense", date: "2026-10-13", items: [{ name: "Something", qty: 1, unitCost: 1000 }] });
const e2 = (await db.query("SELECT category FROM ledger_entries WHERE ref_type='receipt_expense' AND amount=1000 ORDER BY id DESC LIMIT 1")).rows[0];
check("an unknown category becomes other", r.status === 200 && e2?.category === "other", JSON.stringify(e2));
r = await admin("POST", "/api/reborn/admin/inventory/receipt/save", { payMethod: "cash", kind: "expense", category: "other", items: [{ name: "Free", qty: 1, unitCost: 0 }] });
check("a bill with no amount is refused", r.status === 400, r.status);


// the reader learns: the item + pack size of a printed line, the supplier's kind, and our expense lines whatever the month
const memLine = (await db.query("SELECT product_id, pack_size, uses FROM receipt_memory WHERE supplier_key=$1 AND line_key=$2", ["cv test supplier", name.toLowerCase().replace(/[^0-9a-z]+/g, " ").trim()])).rows[0];
check("a saved line is remembered with its item and the latest pack size (the last save here had none, so 1)", memLine && memLine.product_id === p.id && memLine.pack_size === 1, JSON.stringify(memLine));
check("a line saved again counts one more use", memLine && memLine.uses >= 2, JSON.stringify(memLine));
const memSup = (await db.query("SELECT kind FROM receipt_memory WHERE supplier_key='cv test supplier' AND line_key=''")).rows[0];
check("the supplier is remembered as goods", memSup?.kind === "goods", JSON.stringify(memSup));
const memExp = (await db.query("SELECT kind, category FROM receipt_memory WHERE supplier_key='pln' AND line_key='x:electricity'")).rows[0];
check("an expense line is remembered without its month", memExp?.kind === "expense" && memExp.category === "utilities", JSON.stringify(memExp));
const memExpSup = (await db.query("SELECT kind, category FROM receipt_memory WHERE supplier_key='pln' AND line_key=''")).rows[0];
check("the expense supplier is remembered with its category", memExpSup?.kind === "expense" && memExpSup.category === "utilities", JSON.stringify(memExpSup));

console.log(failures ? `${failures} FAILED` : "ALL PASSED"); await db.end(); process.exit(failures ? 1 : 0);
