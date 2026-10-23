// Only Meta may post to the WhatsApp webhook: a call must be signed with the app secret. Run against a server started with META_APP_SECRET=e2e-meta-secret (see README.md).
import { createHmac } from "node:crypto";
const BASE = "http://127.0.0.1:3999";
const SECRET = "e2e-meta-secret";
let failures = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  → " + extra)); if (!ok) failures++; };
const body = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
const post = async (headers) => (await fetch(BASE + "/api/whatsapp/webhook", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body })).status;
const sign = (secret) => "sha256=" + createHmac("sha256", secret).update(body).digest("hex");

check("a call with no signature is refused", (await post({})) === 403);
check("a call signed with another secret is refused", (await post({ "x-hub-signature-256": sign("not-the-secret") })) === 403);
check("a call signed with the app secret is accepted", (await post({ "x-hub-signature-256": sign(SECRET) })) === 200);
const slug = await fetch(BASE + "/api/whatsapp/webhook/reborn-wave-group", { method: "POST", headers: { "Content-Type": "application/json" }, body });
check("the company address is checked the same way", slug.status === 403, String(slug.status));
console.log(failures ? `${failures} FAILED` : "ALL PASSED");
process.exit(failures ? 1 : 0);
