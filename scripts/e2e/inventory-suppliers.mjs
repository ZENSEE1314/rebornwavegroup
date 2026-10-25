// One item, a few suppliers, each with the price it last charged (Admin › Inventory shows "Budi RP 450,000 · Nanda RP 460,000"). Run against the local test server (see README.md).
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
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  -> " + extra)); if (!ok) failures++; };
const tag = Date.now().toString(36);
const admin = makeClient();
await admin("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });

const item = (await admin("POST", "/api/reborn/admin/pos/products", { name: `Supplier Item ${tag}`, category: "Spirits", price: 900000, cost: 100000, stock: 0, supplierName: "Nanda" })).json;
const stockIn = (supplier, unitCost, qty = 2) => admin("POST", "/api/reborn/pos/stock-in", { productId: item.id, qty, supplier, unitCost });
await stockIn("Nanda", 100000);
await stockIn("Budi", 120000);
await stockIn("Nanda", 110000); // Nanda raised the price: the newest delivery is the price shown
const row = async () => (await admin("GET", "/api/reborn/admin/inventory")).json.items.find((i) => i.id === item.id);

let it = await row();
check("the item lists every supplier it was bought from", it && it.suppliers.length === 2 && it.suppliers.includes("Nanda") && it.suppliers.includes("Budi"), JSON.stringify(it?.suppliers));
const price = (name) => it?.supplierPrices?.find((s) => s.supplier === name)?.unitCost;
check("each supplier shows the price it charged last", price("Nanda") === 110000 && price("Budi") === 120000, JSON.stringify(it?.supplierPrices));

// Add stock knows the suppliers and their prices from the delivery history
const layers = (await admin("GET", `/api/reborn/admin/pos/products/${item.id}/layers`)).json;
const lastOf = (name) => [...(layers.deliveries || [])].reverse().find((d) => d.supplier === name)?.unitCost;
check("Add stock gets the delivery history with each supplier's price", lastOf("Nanda") === 110000 && lastOf("Budi") === 120000 && layers.deliveries.length === 3, JSON.stringify(layers.deliveries));

// a supplier typed in for the first time is just another delivery of the same item
await stockIn("Citra", 130000, 1);
it = await row();
check("a new supplier typed in Add stock joins the same item (no second product)", it.suppliers.length === 3 && price("Citra") === 130000, JSON.stringify(it?.supplierPrices));

console.log(failures === 0 ? "ALL PASSED" : `${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
