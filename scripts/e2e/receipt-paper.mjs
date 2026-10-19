// The receipt roll + copies are shared by every browser of the shop. Run against the local test server (see README.md).
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

const admin = makeClient();
await admin("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });
const anon = makeClient();

let r = await anon("GET", "/api/reborn/pos/receipt-paper");
check("a signed-out visitor cannot read the paper setting", r.status === 401 || r.status === 403, r.status);
r = await admin("GET", "/api/reborn/pos/receipt-paper");
check("nothing is saved at first", r.status === 200 && !r.json.widthMm, JSON.stringify(r.json));
r = await admin("PUT", "/api/reborn/pos/receipt-paper", { widthMm: 5, shiftMm: 3 });
check("a roll that is far too narrow is refused", r.status === 400, r.status);
r = await admin("PUT", "/api/reborn/pos/receipt-paper", { widthMm: 48, shiftMm: 4.5, copies: "two" });
check("the roll and copies are saved", r.status === 200 && r.json.widthMm === 48 && r.json.shiftMm === 4.5 && r.json.copies === "two", JSON.stringify(r.json));
const other = makeClient();
await other("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });
r = await other("GET", "/api/reborn/pos/receipt-paper");
check("another browser reads the same roll", r.status === 200 && r.json.widthMm === 48 && r.json.shiftMm === 4.5 && r.json.copies === "two", JSON.stringify(r.json));
r = await admin("PUT", "/api/reborn/pos/receipt-paper", { widthMm: 80, shiftMm: 99 });
check("the shift is limited to 40 mm and copies default to one", r.status === 200 && r.json.shiftMm === 40 && r.json.copies === "one", JSON.stringify(r.json));

console.log(failures ? `${failures} FAILED` : "ALL PASSED");
process.exit(failures ? 1 : 0);
