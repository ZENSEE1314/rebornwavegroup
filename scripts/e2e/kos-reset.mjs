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
const db = new pg.Client({ connectionString: "postgres://postgres:pw@127.0.0.1:54329/reborn" }); await db.connect();
const one = async (sql, args = []) => (await db.query(sql, args)).rows[0];

await call("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });
const adminId = (await call("GET", "/api/auth/user")).json.id;
await call("POST", "/api/reborn/admin/settings", { mainAdminPassword: "reset-pass" });
const tag = Date.now().toString(36);
const make = async (n) => (await db.query("INSERT INTO users (id, email, first_name, kgold, referral_code) VALUES ($1, $2, $3, $4, $5) RETURNING id", ["kos-" + n + tag, `kos${n}${tag}@test.local`, "Kos" + n, n * 1000, "KOS" + n + tag])).rows[0].id;
const a = await make(1); const b = await make(2);
await call("POST", "/api/reborn/admin/pos/products", { name: "KOS probe " + tag, category: "Test", price: 1000 }); // any company-scoped row tells which company the routes use
const cid = (await one("SELECT company_id FROM pos_products WHERE name=$1", ["KOS probe " + tag])).company_id;
await db.query("INSERT INTO kos_gifts (company_id, from_user_id, to_user_id, gift_name, kgold_cost, recipient_kgold) VALUES ($1, $2, $3, 'Rose', 5000, 4000), ($1, $3, $2, 'Rose', 1000, 800)", [cid, a, b]);

let r = await call("GET", "/api/reborn/kos/leaderboard?period=month");
check("before the reset the ranking lists the receivers", r.json.some((x) => x.id === b && x.stars === 4000), JSON.stringify(r.json));

r = await call("POST", "/api/reborn/admin/kos/reset", { password: "wrong" });
check("wrong password is refused", r.status === 403, r.status);
check("nothing changed after the refusal", Number((await one("SELECT kgold FROM users WHERE id=$1", [b])).kgold) === 2000);

r = await call("POST", "/api/reborn/admin/kos/reset", { password: "reset-pass" });
check("reset accepted", r.status === 200 && r.json.members >= 2, JSON.stringify(r.json));
check("every KGOLD balance is 0", Number((await one("SELECT count(*) n FROM users WHERE kgold <> 0")).n) === 0);
const backup = JSON.parse((await one("SELECT value FROM app_settings WHERE key='kosResetBackup'")).value);
check("old balances are kept in a backup", backup.balances[a] === 1000 && backup.balances[b] === 2000, JSON.stringify(backup).slice(0, 120));

r = await call("GET", "/api/reborn/kos/leaderboard?period=month");
check("the ranking starts again empty", r.status === 200 && r.json.length === 0, JSON.stringify(r.json));

await new Promise((resolve) => setTimeout(resolve, 1100));
await db.query("INSERT INTO kos_gifts (company_id, from_user_id, to_user_id, gift_name, kgold_cost, recipient_kgold) VALUES ($1, $2, $3, 'Rose', 500, 400)", [cid, a, b]);
r = await call("GET", "/api/reborn/kos/leaderboard?period=month");
check("only gifts after the reset count", r.json.length === 1 && r.json[0].id === b && r.json[0].stars === 400, JSON.stringify(r.json));
console.log(failures ? `${failures} FAILED` : "ALL PASSED"); await db.end(); process.exit(failures ? 1 : 0);
