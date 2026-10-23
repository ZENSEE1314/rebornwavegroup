// Guessing a password is slowed down, and the server sends safe headers. Run against a server started WITHOUT RATE_LIMIT_OFF (see README.md).
const BASE = "http://127.0.0.1:3999";
let failures = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  → " + extra)); if (!ok) failures++; };
const login = async (email) => {
  const res = await fetch(BASE + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "wrong-password-" + Math.random() }) });
  return { status: res.status, retryAfter: res.headers.get("retry-after"), body: await res.text() };
};

const victim = `victim${Date.now().toString(36)}@test.local`;
const statuses = [];
for (let i = 0; i < 10; i++) statuses.push((await login(victim)).status);
check("the first ten wrong passwords for one account are answered normally (not blocked)", statuses.every((s) => s !== 429), JSON.stringify(statuses));
const blocked = await login(victim);
check("the eleventh try on the same account is refused with 429", blocked.status === 429, JSON.stringify(blocked));
check("and says how long to wait", Number(blocked.retryAfter) > 0, String(blocked.retryAfter));
const other = await login(`other${Date.now().toString(36)}@test.local`);
check("another account is not affected", other.status !== 429, JSON.stringify(other));
const upper = await login(victim.toUpperCase());
check("the same account in capital letters is counted as the same account", upper.status === 429, JSON.stringify(upper));

const headers = (await fetch(BASE + "/api/v1/tenant/resolve")).headers;
check("the server does not announce that it is Express", !headers.get("x-powered-by"), String(headers.get("x-powered-by")));
check("responses say not to guess the file type", headers.get("x-content-type-options") === "nosniff", String(headers.get("x-content-type-options")));
check("the site cannot be framed by another site", headers.get("x-frame-options") === "SAMEORIGIN", String(headers.get("x-frame-options")));
check("the referrer is trimmed for other sites", headers.get("referrer-policy") === "strict-origin-when-cross-origin", String(headers.get("referrer-policy")));
const secure = await fetch(BASE + "/api/v1/tenant/resolve", { headers: { "x-forwarded-proto": "https" } });
check("behind an https proxy the browser is told to always use https", /max-age=\d+/.test(secure.headers.get("strict-transport-security") || ""), String(secure.headers.get("strict-transport-security")));

console.log(failures ? `${failures} FAILED` : "ALL PASSED");
process.exit(failures ? 1 : 0);
