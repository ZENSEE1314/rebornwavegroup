// An item ticked "No discount" is never discounted: no app-order discount, no member perk, no typed bill discount, no happy-hour price. Run against the local test server (see README.md).
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
const tag = Date.now().toString(36);
const admin = makeClient();
await admin("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });
await admin("POST", "/api/reborn/admin/settings", { serviceFeePercent: 0, taxPercent: 0 });

const make = async (name, extra = {}) => (await admin("POST", "/api/reborn/admin/pos/products", { name: `${name} ${tag}`, category: "Beer", price: 100000, cost: 40000, stock: 50, ...extra })).json;
const plain = await make("Plain");
const locked = await make("Locked", { noDiscount: true });
const quote = async (productId, body = {}) => (await admin("POST", "/api/reborn/pos/quote", { items: [{ productId, price: 100000, qty: 1 }], ...body })).json;

let r = await admin("GET", "/api/reborn/pos/products");
const saved = (r.json || []).find((p) => p.id === locked.id);
check("the no-discount tick is saved on the item", saved?.noDiscount === true && (r.json || []).find((p) => p.id === plain.id)?.noDiscount === false, JSON.stringify(saved));

let q = await quote(plain.id, { discount: 10000 });
check("a typed bill discount applies to a normal item", q.discount === 10000, JSON.stringify(q));
q = await quote(locked.id, { discount: 10000 });
check("a typed bill discount does not touch a no-discount item", q.discount === 0 && q.total === 100000, JSON.stringify(q));

await admin("PATCH", `/api/reborn/admin/pos/products/${plain.id}`, { happyStart: "00:00", happyEnd: "23:59", happyPrice: 50000 });
await admin("PATCH", `/api/reborn/admin/pos/products/${locked.id}`, { happyStart: "00:00", happyEnd: "23:59", happyPrice: 50000 });
r = await admin("GET", "/api/reborn/pos/products");
const list = r.json || [];
const plainNow = list.find((p) => p.id === plain.id), lockedNow = list.find((p) => p.id === locked.id);
check("a normal item sells at its happy-hour price", Number(plainNow?.salePrice ?? plainNow?.price) === 50000, JSON.stringify(plainNow));
check("a no-discount item stays at its normal price in happy hour", lockedNow && Number(lockedNow.salePrice ?? lockedNow.price) === 100000 && !lockedNow.happyNow, JSON.stringify(lockedNow));

await admin("PATCH", `/api/reborn/admin/pos/products/${locked.id}`, { noDiscount: false });
r = await admin("GET", "/api/reborn/pos/products");
check("the tick can be taken off again", (r.json || []).find((p) => p.id === locked.id)?.noDiscount === false);
console.log(failures ? `FAILED: ${failures}` : "ALL PASSED");
process.exit(failures ? 1 : 0);
