import pg from "pg";
const BASE = "http://127.0.0.1:3999";
let cookie = ""; let failures = 0;
async function call(method, path, body, raw) {
  const res = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
  const set = res.headers.getSetCookie?.() || []; if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
  if (raw) return { status: res.status, type: res.headers.get("content-type"), cache: res.headers.get("cache-control"), buf: Buffer.from(await res.arrayBuffer()) };
  const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json };
}
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  → " + extra)); if (!ok) failures++; };
const db = new pg.Client({ connectionString: "postgres://postgres:pw@127.0.0.1:54329/reborn" }); await db.connect();
await call("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const data = "data:image/png;base64," + png.toString("base64");
const p = (await call("POST", "/api/reborn/admin/pos/products", { name: "Pic Beer", category: "Beer", price: 1000, stock: 3, imageUrl: data })).json;
let r = await call("GET", "/api/reborn/admin/inventory");
const link = r.json.items.find((i) => i.id === p.id)?.imageUrl;
check("inventory sends a short picture address", link?.startsWith("/api/reborn/pos/product-image/" + p.id), link);
r = await call("GET", "/api/reborn/pos/products");
check("POS list sends the address too", r.json.find((x) => x.id === p.id)?.imageUrl === link, "");
const img = await call("GET", link, null, true);
check("address serves the real picture, cached", img.status === 200 && img.type === "image/png" && img.buf.equals(png) && /immutable/.test(img.cache || ""), img.status + " " + img.type + " " + img.cache);
await call("PATCH", `/api/reborn/admin/pos/products/${p.id}`, { name: "Pic Beer 2", imageUrl: link });
const row = (await db.query("SELECT image_url, name FROM pos_products WHERE id=$1", [p.id])).rows[0];
check("saving with the address keeps the stored picture", row.image_url === data && row.name === "Pic Beer 2", row.image_url?.slice(0, 40));
const b = (await call("POST", "/api/reborn/admin/pos/products", { name: "Pic Beer ×6", category: "Beer", price: 5000, imageUrl: link, bundleItemId: p.id, bundleQty: 6 })).json;
const brow = (await db.query("SELECT image_url FROM pos_products WHERE id=$1", [b.id])).rows[0];
check("a bundle made with the address gets the real picture", brow.image_url === data, brow.image_url?.slice(0, 40));
console.log(failures ? `${failures} FAILED` : "ALL PASSED"); await db.end(); process.exit(failures ? 1 : 0);
