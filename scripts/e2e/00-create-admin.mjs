import pg from "pg";
const BASE = "http://127.0.0.1:3999";
let cookie = "";
async function call(method, path, body) {
  const res = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
  const set = res.headers.getSetCookie?.() || [];
  if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
  const text = await res.text(); let json; try { json = JSON.parse(text); } catch { json = text.slice(0, 200); }
  return { status: res.status, json, type: res.headers.get("content-type") };
}
const email = "admin@test.local", password = "Passw0rd!";
let r = await call("POST", "/api/auth/register", { email, password, firstName: "Admin", lastName: "Test", phoneNumber: "081200000001", dateOfBirth: "1990-01-01", gender: "male" });
console.log("register", r.status, JSON.stringify(r.json).slice(0, 120));
const db = new pg.Client({ connectionString: "postgres://postgres:pw@127.0.0.1:54329/reborn" }); await db.connect();
await db.query("UPDATE users SET role='admin' WHERE email=$1", [email]);
r = await call("POST", "/api/auth/login", { email, password });
console.log("login", r.status, JSON.stringify(r.json).slice(0, 120));
r = await call("GET", "/api/auth/user"); console.log("user", r.status, r.json?.role, r.json?.username);
r = await call("GET", "/api/reborn/my-role"); console.log("my-role", r.status, JSON.stringify(r.json));
await db.end();
