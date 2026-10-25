// Error watch: reads only the NEW rows of the live error log (the same data as Admin › Errors), sorts them, and writes a brief when something needs a fix.
// Read-only. It never prints the database address. Meant to be run by the scheduled error-watch agent (playbook rule T12), or by hand.
//
//   node toolbox/scripts/error-watch.mjs                 check new errors since the last run, write a brief if needed
//   node toolbox/scripts/error-watch.mjs --dry           look, but do not move the "already seen" marker
//   node toolbox/scripts/error-watch.mjs --hours 24      look at the last 24 hours instead of "since the last run" (implies --dry)
//
// Exit code: 0 = nothing to fix (noise only, or nothing new). 10 = something actionable: the brief file path is printed on the last line (BRIEF: <path>).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CATEGORY = { noise: "noise", watch: "watch", external: "external", infra: "infra", actionable: "actionable", owner: "owner" };
const FREQUENT_4XX = 10; // the same refusal this many times in one run is worth a look
const FREQUENT_INFRA = 5; // the same database / connection error this many times is no longer a blip
const FREQUENT_EXTERNAL = 10;
const NETWORK_MESSAGE = /failed to fetch|load failed|networkerror|network connection was lost|timed? ?out|aborted|err_internet|econnreset/i;
const NOT_STAFF_MESSAGE = /staff only|khusus staf|仅限员工|admin only|khusus admin|仅限管理员/i;
const STALE_SCREEN_MESSAGE = /order not open|item not found|already (paid|cancelled)/i;
const GUIDANCE_MESSAGE = /scan your table|scan the qr|song requests go by table|not in our karaoke system|is sold out|needtable/i;
const OWNER_ACTION_MESSAGE = /invalid oauth access token|cannot parse access token|session has expired|error validating access token|\b190\b/i; // a token only the owner can replace
const INFRA_MESSAGE = /connection terminated|deadlock detected|econnrefused|too many clients|timeout exceeded when trying to connect|terminating connection/i;

/** Sorts one error row (or a group): noise = expected, watch = a refusal worth counting, external = another service, infra = database / connection blip, actionable = needs a fix. */
export function classify(row, count = 1) {
  const message = String(row.message || "");
  const status = Number(row.status) || 0;
  // Calls the browser reports itself (source "client") have no status; a server-side failure is never called a network drop here.
  if (row.source !== "server" && status === 0 && NETWORK_MESSAGE.test(message)) return { category: CATEGORY.noise, why: "the browser could not reach the server (network)" };
  if ((status === 401 || status === 403) && NOT_STAFF_MESSAGE.test(message)) return { category: CATEGORY.noise, why: "a login without the needed role opened a staff screen" };
  if (STALE_SCREEN_MESSAGE.test(message) && status >= 400 && status < 500) return { category: CATEGORY.noise, why: "a stale screen (the bill or item had already changed)" };
  if (GUIDANCE_MESSAGE.test(message) && status >= 400 && status < 500) return { category: CATEGORY.noise, why: "a normal \"do this first\" reply" };
  if (row.area === "whatsapp" && OWNER_ACTION_MESSAGE.test(message)) return { category: CATEGORY.owner, why: "the WhatsApp access token is invalid or expired: the owner must save a new one (Admin › CRM, or Settings › Keys)" };
  if (row.area === "whatsapp" && /reply not sent|not delivered|131047|131026/i.test(message)) {
    return count >= FREQUENT_EXTERNAL ? { category: CATEGORY.actionable, why: `WhatsApp refused ${count} messages (check the token and the 24-hour rule)` } : { category: CATEGORY.external, why: "WhatsApp / Meta did not deliver a message" };
  }
  if (INFRA_MESSAGE.test(message)) return count >= FREQUENT_INFRA ? { category: CATEGORY.actionable, why: `database / connection error repeated ${count} times` } : { category: CATEGORY.infra, why: "a database or connection blip" };
  if (status >= 500 || (status === 0 && row.source === "server")) return { category: CATEGORY.actionable, why: "a server error" };
  if (status >= 400) return count >= FREQUENT_4XX ? { category: CATEGORY.actionable, why: `the same refusal ${count} times` } : { category: CATEGORY.watch, why: "a refused request" };
  if (status === 0) return { category: CATEGORY.actionable, why: "a failure with no status that is not a known network message" };
  return { category: CATEGORY.watch, why: "not sorted" };
}

/** WhatsApp rows carry the whole message text; what matters is what the provider answered. */
export function shortMessage(row) {
  const message = String(row.message || "");
  if (row.area !== "whatsapp") return message;
  const provider = /Meta (\d+): .*?"message":"([^"]+)"/.exec(message);
  return provider ? `WhatsApp not delivered: Meta ${provider[1]} ${provider[2]}` : message.replace(/^(Reply not sent):.*$/s, "$1").slice(0, 160);
}

const normalizePath = (value) => String(value || "").replace(/\b[0-9a-f]{8,}\b/gi, "ID").replace(/[0-9]+/g, "N");

/** Groups rows by area, status, method, path and the start of the message; each group gets its category. */
export function groupErrors(rows) {
  const groups = new Map();
  for (const row of rows) {
    const text = shortMessage(row);
    const key = [row.area, row.status, row.method || "", normalizePath(row.path), text.slice(0, 100)].join("|");
    const group = groups.get(key) || { key, area: row.area, status: Number(row.status) || 0, method: row.method || "", path: normalizePath(row.path), message: text.slice(0, 160), source: row.source, count: 0, firstId: row.id, lastId: row.id, lastAt: row.created_at, sampleDetail: "" };
    group.count += 1;
    group.lastId = Math.max(group.lastId, row.id);
    group.firstId = Math.min(group.firstId, row.id);
    if (!group.sampleDetail && row.detail && !/^\{\}$/.test(row.detail)) group.sampleDetail = String(row.detail).slice(0, 600);
    groups.set(key, group);
  }
  return Array.from(groups.values()).map((g) => ({ ...g, ...classify(g, g.count) })).sort((a, b) => b.count - a.count);
}

export function briefText(groups, window) {
  const pick = (c) => groups.filter((g) => g.category === c);
  const line = (g) => `- **${g.count}×** \`${g.method ? g.method + " " : ""}${g.path || "(no path)"}\` [${g.area}${g.status ? " " + g.status : ""}] ${g.message}\n  - Why: ${g.why}${g.sampleDetail ? `\n  - Sample detail: \`${g.sampleDetail.replace(/`/g, "'").replace(/\s+/g, " ").slice(0, 300)}\`` : ""}`;
  const parts = [`# Error brief · ${new Date().toISOString()}`, "", `Window: ${window}. Rows: ${groups.reduce((n, g) => n + g.count, 0)}, groups: ${groups.length}.`, ""];
  parts.push("## Needs the owner (a key or token only the owner can replace)", ...(pick("owner").length ? pick("owner").map(line) : ["- nothing"]), "");
  parts.push("## Needs a fix (code)", ...(pick("actionable").length ? pick("actionable").map(line) : ["- nothing"]), "");
  parts.push("## Watch (refusals, below the alarm level)", ...(pick("watch").length ? pick("watch").slice(0, 10).map(line) : ["- nothing"]), "");
  parts.push("## Infra / external (not code)", ...([...pick("infra"), ...pick("external")].length ? [...pick("infra"), ...pick("external")].slice(0, 10).map(line) : ["- nothing"]), "");
  parts.push(`## Noise (not listed): ${pick("noise").reduce((n, g) => n + g.count, 0)} rows in ${pick("noise").length} groups`, "");
  parts.push("## What to do next", "1. Read the route in the repo for each group under \"Needs a fix\" and find the cause (playbook T4, change-request template).", "2. Fix in the working copy, add a test, run `node toolbox/scripts/approve-change.mjs` and `bash toolbox/scripts/run-tests.sh` (T1, T2).", "3. Do NOT push or update the PC copy: the owner decides. Report with `toolbox/templates/change-report.md` and the done checklist (T8, T11).");
  return parts.join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const hoursArg = args.includes("--hours") ? Number(args[args.indexOf("--hours") + 1]) : 0;
  const isDry = args.includes("--dry") || hoursArg > 0;
  const stateDir = process.env.ERROR_WATCH_STATE_DIR || path.join(process.env.LOCALAPPDATA || os.homedir(), "RebornErrorWatch");
  const briefDir = process.env.ERROR_WATCH_BRIEF_DIR || path.join(os.homedir(), "OneDrive", "Documents", "Reborn-Wave-Error-Briefs");
  const statePath = path.join(stateDir, "state.json");
  mkdirSync(stateDir, { recursive: true });
  const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : {};
  const { default: pg } = await import("pg");
  const urlFile = process.env.DATABASE_URL_FILE || "C:\\RebornStandby\\database-url.txt";
  const client = new pg.Client({ connectionString: readFileSync(urlFile, "utf8").trim() });
  await client.connect();
  try {
    await client.query("SET default_transaction_read_only = on");
    let lastId = Number(state.lastId) || 0;
    if (!state.lastId && !hoursArg) {
      // First run: start from now, so old history does not flood the first brief.
      const { rows } = await client.query("SELECT coalesce(max(id), 0)::int AS id FROM app_errors");
      lastId = rows[0].id;
      if (!isDry) writeFileSync(statePath, JSON.stringify({ lastId, at: new Date().toISOString() }));
      console.log(`First run: watching from error #${lastId}. Nothing to report yet.`);
      return 0;
    }
    const { rows } = hoursArg
      ? await client.query("SELECT id, area, source, status, method, path, message, detail, created_at FROM app_errors WHERE created_at > now() - ($1 || ' hours')::interval ORDER BY id LIMIT 5000", [String(hoursArg)])
      : await client.query("SELECT id, area, source, status, method, path, message, detail, created_at FROM app_errors WHERE id > $1 ORDER BY id LIMIT 5000", [lastId]);
    const groups = groupErrors(rows);
    const actionable = groups.filter((g) => g.category === CATEGORY.actionable);
    const summary = groups.reduce((acc, g) => ({ ...acc, [g.category]: (acc[g.category] || 0) + g.count }), {});
    console.log(`New errors: ${rows.length}  ${JSON.stringify(summary)}`);
    if (!isDry && rows.length) writeFileSync(statePath, JSON.stringify({ lastId: Math.max(...rows.map((r) => r.id)), at: new Date().toISOString() }));
    const owner = groups.filter((g) => g.category === CATEGORY.owner);
    if (actionable.length === 0 && owner.length === 0) return 0;
    mkdirSync(briefDir, { recursive: true });
    const briefPath = path.join(briefDir, `brief-${new Date().toISOString().replace(/[:.]/g, "-")}.md`);
    writeFileSync(briefPath, briefText(groups, hoursArg ? `last ${hoursArg} hours` : `errors #${lastId + 1} to #${rows[rows.length - 1].id}`));
    console.log(`BRIEF: ${briefPath}`);
    return 10;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().then((code) => process.exit(code)).catch((error) => { console.error("error-watch failed:", error.message); process.exit(2); });
}
