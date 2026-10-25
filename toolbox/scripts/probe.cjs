// Calls every route of the server WITHOUT logging in (against a throw-away test server) and lists the ones that answer with data instead of "log in".
const fs = require("fs");
const path = require("path");
const root = process.argv[2];
const base = process.argv[3];
const files = fs.readdirSync(path.join(root, "server")).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
const routes = new Map();
for (const f of files) {
  const text = fs.readFileSync(path.join(root, "server", f), "utf8");
  for (const m of text.matchAll(/\bapp\.(get|post|put|patch|delete)\(\s*(['"`])(\/[^'"`]*)\2/g)) routes.set(`${m[1].toUpperCase()} ${m[3]}`, { method: m[1].toUpperCase(), p: m[3], file: f });
}
const skip = /(\/stream$|\/events$|\/live|sse|^\/health$|logout$|^\/\*|\.mjs$|\/jobs$)/i;
const open = [];
const concurrency = 8;
const list = Array.from(routes.values()).filter((r) => !skip.test(r.p));
let idx = 0;
const fill = (p) => p.replace(/:[A-Za-z]+/g, "1");
async function worker() {
  while (idx < list.length) {
    const r = list[idx++];
    try {
      const res = await fetch(base + fill(r.p), { method: r.method, headers: { "content-type": "application/json" }, body: r.method === "GET" ? undefined : "{}", signal: AbortSignal.timeout(6000), redirect: "manual" });
      const text = (await res.text()).slice(0, 120).replace(/\s+/g, " ");
      if (res.status >= 200 && res.status < 300 && !/^<!doctype html|^<html/i.test(text)) open.push({ ...r, status: res.status, text });
    } catch { /* timeout or stream */ }
  }
}
Promise.all(Array.from({ length: concurrency }, worker)).then(() => {
  console.log(`probed ${list.length} routes without a login; ${open.length} answered 2xx with something other than a web page:`);
  for (const r of open.sort((a, b) => a.p.localeCompare(b.p))) console.log(`${r.status} ${r.method} ${r.p}  [${r.file}]  ${r.text}`);
});
