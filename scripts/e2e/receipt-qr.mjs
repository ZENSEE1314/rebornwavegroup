import pg from "pg";
const BASE = "http://127.0.0.1:3999";
let cookie = ""; let failures = 0;
async function call(method, path, body) {
  const res = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
  const set = res.headers.getSetCookie?.() || []; if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
  const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json };
}
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  → " + extra)); if (!ok) failures++; };
await call("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });
const tag = Date.now().toString(36);
const item = (await call("POST", "/api/reborn/admin/pos/products", { name: "Qr Beer " + tag, category: "Beer", price: 10000, cost: 4000, stock: 20 })).json;
const payOne = async (n) => {
  const o = (await call("POST", "/api/reborn/pos/orders", { tableNumber: `Q${n}${tag.slice(-2)}` })).json.order;
  await call("POST", `/api/reborn/pos/orders/${o.id}/items`, { items: [{ productId: item.id, qty: 1 }] });
  return (await call("POST", `/api/reborn/pos/orders/${o.id}/pay`, { paymentMethod: "cash", cashReceived: 50000 })).json;
};
await call("POST", "/api/reborn/admin/settings", { receiptQrKind: "none" });
let paid = await payOne(1);
check("no QR when the admin chose none", paid.receipt && paid.receipt.qr === null, JSON.stringify(paid.receipt));
await call("POST", "/api/reborn/admin/settings", { wifiName: "Reborn Guest", wifiPassword: "pa;ss", wifiSecurity: "WPA", receiptQrKind: "wifi", receiptQrCaption: "Scan for Wi-Fi" });
paid = await payOne(2);
check("Wi-Fi QR holds the standard Wi-Fi text", paid.receipt.qr?.text === String.raw`WIFI:T:WPA;S:Reborn Guest;P:pa\;ss;;` && paid.receipt.qr.caption === "Scan for Wi-Fi", JSON.stringify(paid.receipt.qr));
await call("POST", "/api/reborn/admin/settings", { receiptQrKind: "link", receiptQrLink: "https://rebornwave.group/download/android" });
paid = await payOne(3);
check("a typed link is what the QR holds", paid.receipt.qr?.text === "https://rebornwave.group/download/android", JSON.stringify(paid.receipt.qr));
await call("POST", "/api/reborn/admin/settings", { receiptQrKind: "review", googleReviewUrl: "" });
paid = await payOne(4);
check("review kind with no review link saved prints no QR", paid.receipt.qr === null, JSON.stringify(paid.receipt.qr));
await call("POST", "/api/reborn/admin/settings", { receiptQrKind: "none" });
console.log(failures ? `${failures} FAILED` : "ALL PASSED"); process.exit(failures ? 1 : 0);
