#!/usr/bin/env node
/**
 * BridgeX end-to-end test agents.
 *
 * Two simulated actors drive the real HTTP API and report pass/fail per function:
 *   • adminAgent  — a platform/company admin: creates a company, sets modules,
 *                   white-label, branches, positions, staff, shifts, leave, meetings,
 *                   and reads back attendance / leaderboard / feedback.
 *   • userAgent   — a member: registers, logs in, reads their profile and a few
 *                   member-facing endpoints.
 *
 * It is intentionally NOT wired into the build or CI. Run it by hand:
 *
 *   node scripts/bridgex-test-agents.mjs \
 *     --base http://localhost:5000 \
 *     --admin-email you@example.com --admin-pass 'secret'
 *
 * Flags:
 *   --base        Base URL of the running server (default http://localhost:5000)
 *   --admin-email / --admin-pass   Existing platform-admin login (recommended).
 *   --only admin|user              Run only one agent.
 *   --json report.json             Also write the machine-readable report.
 *   --keep                         Don't attempt cleanup of created test data.
 *
 * Everything it creates is prefixed "ZZTEST" so it is easy to spot and remove.
 * Prefer running against a local server on the DEV database, not production.
 */

const args = parseArgs(process.argv.slice(2));
const BASE = (args.base || process.env.BRIDGEX_BASE || "http://localhost:5000").replace(/\/$/, "");
const STAMP = Date.now();
const TAG = `ZZTEST${STAMP}`;

// ── tiny fetch client with a cookie jar (one jar per agent) ──────────────────
function makeClient() {
  const jar = new Map();
  const cookieHeader = () => Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
  return async function call(method, path, body, extraHeaders = {}) {
    const headers = { "Content-Type": "application/json", ...extraHeaders };
    const cookie = cookieHeader();
    if (cookie) headers.Cookie = cookie;
    const res = await fetch(BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
    });
    const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    for (const c of setCookie) {
      const [pair] = c.split(";");
      const idx = pair.indexOf("=");
      if (idx > 0) jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
    }
    const text = await res.text();
    let data; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { status: res.status, ok: res.ok, data };
  };
}

// ── test runner ──────────────────────────────────────────────────────────────
function makeSuite(label) {
  const results = [];
  async function step(name, fn, { soft = false } = {}) {
    const t0 = Date.now();
    try {
      const detail = await fn();
      results.push({ agent: label, name, status: "pass", ms: Date.now() - t0, detail: detail || "" });
      console.log(`  \x1b[32m✓\x1b[0m ${name}${detail ? ` — ${detail}` : ""}`);
      return true;
    } catch (err) {
      const status = soft ? "warn" : "fail";
      results.push({ agent: label, name, status, ms: Date.now() - t0, error: String(err?.message || err) });
      const mark = soft ? "\x1b[33m!\x1b[0m" : "\x1b[31m✗\x1b[0m";
      console.log(`  ${mark} ${name} — ${err?.message || err}`);
      return false;
    }
  }
  return { results, step };
}
function expect(cond, msg) { if (!cond) throw new Error(msg); }
function ok(res, msg) { expect(res.ok, `${msg} (HTTP ${res.status}: ${short(res.data)})`); return res.data; }
const short = (d) => (typeof d === "string" ? d : JSON.stringify(d))?.slice(0, 160);

// ── ADMIN AGENT ──────────────────────────────────────────────────────────────
async function runAdmin() {
  console.log(`\n\x1b[36m[admin agent]\x1b[0m ${BASE}`);
  const { results, step } = makeSuite("admin");
  const api = makeClient();
  const ctx = {};

  await step("meta: module catalogue", async () => {
    const mods = ok(await api("GET", "/api/v1/meta/modules"), "GET modules");
    expect(Array.isArray(mods) && mods.length > 10, "expected module registry");
    return `${mods.length} modules`;
  });
  await step("meta: industry presets", async () => {
    const inds = ok(await api("GET", "/api/v1/meta/industries"), "GET industries");
    expect(inds.some((i) => i.key === "restaurant"), "expected restaurant preset");
    ctx.presets = inds;
    return `${inds.length} industries`;
  });

  const canLogin = args["admin-email"] && args["admin-pass"];
  await step("admin login", async () => {
    if (!canLogin) throw new Error("no --admin-email/--admin-pass provided; skipping authed steps");
    ok(await api("POST", "/api/auth/login", { email: args["admin-email"], password: args["admin-pass"] }), "login");
    const me = ok(await api("GET", "/api/auth/user"), "whoami");
    ctx.me = me;
    return me?.email || "ok";
  }, { soft: !canLogin });

  if (!canLogin) { return results; }

  await step("platform bootstrap", async () => {
    const boot = ok(await api("GET", "/api/v1/platform/bootstrap"), "bootstrap");
    ctx.platformAdmin = !!boot.platformAdmin;
    return boot.platformAdmin ? "platform admin" : "company user";
  });

  await step("create company (restaurant preset)", async () => {
    const path = ctx.platformAdmin ? "/api/v1/platform/companies" : "/api/v1/companies";
    const body = { name: `${TAG} Bistro`, appName: `${TAG} App`, adminEmail: `owner+${STAMP}@zztest.local`, industry: "restaurant", branchName: "Main", subscriptionPlan: "starter", billingModel: "subscription", billingCycle: "monthly", price: "0" };
    const created = ok(await api("POST", path, body), "create company");
    ctx.companyId = created.company?.id || created.id;
    expect(ctx.companyId, "no company id returned");
    return `company #${ctx.companyId}`;
  });

  const withCo = (extra = {}) => ({ "X-Company-Id": String(ctx.companyId), ...extra });

  await step("company modules reflect preset", async () => {
    const mods = ok(await api("GET", "/api/v1/company/modules", undefined, withCo()), "GET company modules");
    const enabled = mods.filter((m) => m.enabled).map((m) => m.moduleKey);
    expect(enabled.includes("restaurant") && enabled.includes("pos"), `expected restaurant+pos, got ${enabled.join(",")}`);
    return `${enabled.length} enabled`;
  });
  await step("update modules", async () => {
    ok(await api("PUT", "/api/v1/company/modules", { modules: ["pos", "employees", "crm", "loyalty", "inventory"] }, withCo()), "PUT modules");
    return "saved";
  });
  await step("white-label save", async () => {
    ok(await api("PUT", "/api/v1/company/white-label", { appName: `${TAG} App`, theme: { primaryColor: "#06b6d4", accentColor: "#f59e0b" }, currency: "IDR" }, withCo()), "PUT white-label");
    return "saved";
  });
  await step("create branch", async () => {
    ok(await api("POST", "/api/v1/company/branches", { name: `${TAG} Branch`, address: "1 Test St" }, withCo()), "POST branch");
    return "ok";
  });
  await step("create position", async () => {
    const p = ok(await api("POST", "/api/v1/company/positions", { name: `${TAG} Server` }, withCo()), "POST position");
    ctx.positionId = p?.id;
    return "ok";
  });
  await step("create staff", async () => {
    const s = ok(await api("POST", "/api/v1/company/staff", { name: `${TAG} Staff`, email: `staff+${STAMP}@zztest.local`, role: "staff", employmentType: "full_time", payType: "salary", baseSalary: "0" }, withCo()), "POST staff");
    ctx.staffUserId = s?.userId || s?.user_id || s?.id;
    return "ok";
  });
  await step("schedule meeting", async () => {
    ok(await api("POST", "/api/v1/company/meetings", { title: `${TAG} Meeting`, startsAt: new Date(Date.now() + 86400000).toISOString(), location: "HQ", agenda: "test" }, withCo()), "POST meeting");
    return "ok";
  });
  await step("assign shift", async () => {
    if (!ctx.staffUserId) throw new Error("no staff id");
    const d = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    ok(await api("POST", "/api/v1/company/shifts", { userId: ctx.staffUserId, dates: [d], startTime: "18:00", endTime: "23:00", role: "server" }, withCo()), "POST shift");
    return "ok";
  });
  await step("leave request + decision", async () => {
    const lv = ok(await api("POST", "/api/v1/company/leave", { type: "leave", startDate: "2999-01-01", endDate: "2999-01-02", reason: TAG }, withCo()), "POST leave");
    const id = lv?.id; if (id) ok(await api("PATCH", `/api/v1/company/leave/${id}`, { status: "approved", paid: true }, withCo()), "PATCH leave");
    return id ? `leave #${id}` : "created";
  });
  for (const [name, path] of [["attendance", "/api/v1/company/attendance"], ["leaderboard", "/api/v1/company/staff/leaderboard"], ["feedback", "/api/v1/company/feedback"], ["settings", "/api/v1/company/settings"], ["access-status", "/api/v1/company/access-status"]]) {
    await step(`read ${name}`, async () => { ok(await api("GET", path, undefined, withCo()), `GET ${name}`); return "ok"; });
  }
  await step("POS product create + list", async () => {
    const created = await api("POST", "/api/v1/company/pos/products", { name: `${TAG} Latte`, price: "35000" }, withCo());
    if (!created.ok && created.status === 402) throw new Error("SUBSCRIPTION_REQUIRED (expected on locked trial)");
    ok(created, "POST product");
    ok(await api("GET", "/api/v1/company/pos/products", undefined, withCo()), "GET products");
    return "ok";
  }, { soft: true });

  return results;
}

// ── USER AGENT ───────────────────────────────────────────────────────────────
async function runUser() {
  console.log(`\n\x1b[36m[user agent]\x1b[0m ${BASE}`);
  const { results, step } = makeSuite("user");
  const api = makeClient();
  const email = `member+${STAMP}@zztest.local`;
  const password = "Passw0rd!test";

  await step("register member", async () => {
    const res = await api("POST", "/api/auth/register", { email, password, firstName: TAG, lastName: "User", username: `zz${STAMP}` });
    if (!res.ok && res.status !== 409) throw new Error(`register failed HTTP ${res.status}: ${short(res.data)}`);
    return res.status === 409 ? "already exists" : "registered";
  });
  await step("login member", async () => {
    ok(await api("POST", "/api/auth/login", { email, password }), "login");
    return "ok";
  });
  await step("read profile", async () => {
    const me = ok(await api("GET", "/api/auth/user"), "whoami");
    return me?.email || "ok";
  });
  // A few member-facing reads (soft: depend on Reborn tenant being present)
  for (const [name, path] of [["reborn profile", "/api/reborn/profile"], ["games list", "/api/reborn/games"], ["my attendance", "/api/reborn/staff/my-attendance"]]) {
    await step(`read ${name}`, async () => { ok(await api("GET", path), `GET ${name}`); return "ok"; }, { soft: true });
  }
  return results;
}

// ── main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`BridgeX test agents → ${BASE}\n(tag: ${TAG})`);
  let all = [];
  const only = args.only;
  try {
    if (only !== "user") all = all.concat(await runAdmin());
    if (only !== "admin") all = all.concat(await runUser());
  } catch (err) {
    console.error("\nFATAL:", err?.message || err);
  }
  const pass = all.filter((r) => r.status === "pass").length;
  const warn = all.filter((r) => r.status === "warn").length;
  const fail = all.filter((r) => r.status === "fail").length;
  console.log(`\n──────── summary ────────`);
  console.log(`  \x1b[32m${pass} passed\x1b[0m · \x1b[33m${warn} warn\x1b[0m · \x1b[31m${fail} failed\x1b[0m`);
  if (fail) console.log(`  failing: ${all.filter((r) => r.status === "fail").map((r) => r.name).join(", ")}`);
  if (args.json) {
    const fs = await import("node:fs");
    fs.writeFileSync(args.json, JSON.stringify({ base: BASE, tag: TAG, at: new Date().toISOString(), pass, warn, fail, results: all }, null, 2));
    console.log(`  report → ${args.json}`);
  }
  console.log(`\n  Note: created data is tagged "${TAG}". No auto-delete endpoint exists for companies;`);
  console.log(`  remove test rows from the DB by that tag if needed.`);
  process.exit(fail ? 1 : 0);
})();

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) { out[key] = next; i++; } else { out[key] = true; }
    }
  }
  return out;
}
