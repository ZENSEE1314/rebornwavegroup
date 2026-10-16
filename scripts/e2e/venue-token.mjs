// Prints the venue token of a running cloud server (admin@test.local), making one if needed.
const BASE = process.env.BASE || "http://127.0.0.1:3999";
const login = await fetch(BASE + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "admin@test.local", password: "Passw0rd!" }) });
const cookie = login.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
const res = await fetch(BASE + "/api/reborn/admin/venue-sync/enable", { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify({}) });
console.log((await res.json()).token);
