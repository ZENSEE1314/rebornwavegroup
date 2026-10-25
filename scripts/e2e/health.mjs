// The POS asks /api/health while it thinks it is offline: it answers with no login and no database, and is never kept by the service worker. Run against the local test server (see README.md).
const BASE = "http://127.0.0.1:3999";
let failures = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  -> " + extra)); if (!ok) failures++; };

const res = await fetch(`${BASE}/api/health`);
const body = await res.json().catch(() => null);
check("the health check answers 200 with no login", res.status === 200 && body && body.ok === true, `${res.status} ${JSON.stringify(body)}`);
check("it is never kept in a cache", /no-store/.test(res.headers.get("cache-control") || ""), res.headers.get("cache-control"));
const sw = await (await fetch(`${BASE}/sw.js`)).text();
check("the service worker never answers it from its saved copy", /NEVER_KEEP\s*=\s*\/[^\n]*health\$/.test(sw));
check("the service worker waits longer on a slow line than when the device is offline", /ONLINE_WAIT_MS\s*=\s*25000/.test(sw) && /OFFLINE_WAIT_MS\s*=\s*3000/.test(sw));

console.log(failures === 0 ? "ALL PASSED" : `${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
