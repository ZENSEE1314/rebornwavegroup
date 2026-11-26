// Has the owner pressed "Fix with Claude" in Admin › Errors? Reads the request the button leaves (read-only) and remembers which one was already handled.
// Meant for the scheduled error-watch agent (playbook rule T12).
//
//   node toolbox/scripts/fix-request.mjs
//
// Exit code: 0 = no new request. 10 = a new request: the last line is `REQUEST: {"requestedAt": ..., "area": ...}`. It is marked handled at once, so one click starts one run.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SETTING_KEY = "errorFixRequest";

/** True when the request on the server is newer than the last one handled. */
export function isNewRequest(requestedAt, handledAt) {
  if (!requestedAt) return false;
  const asked = Date.parse(requestedAt);
  if (Number.isNaN(asked)) return false;
  return !handledAt || asked > Date.parse(handledAt);
}

async function main() {
  const stateDir = process.env.ERROR_WATCH_STATE_DIR || path.join(process.env.LOCALAPPDATA || os.homedir(), "RebornErrorWatch");
  const statePath = path.join(stateDir, "fix-state.json");
  mkdirSync(stateDir, { recursive: true });
  const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : {};
  const { default: pg } = await import("pg");
  const urlFile = process.env.DATABASE_URL_FILE || "C:\\RebornStandby\\database-url.txt";
  const client = new pg.Client({ connectionString: readFileSync(urlFile, "utf8").trim() });
  await client.connect();
  try {
    await client.query("SET default_transaction_read_only = on");
    const { rows } = await client.query("SELECT value FROM app_settings WHERE key = $1", [SETTING_KEY]);
    const request = rows[0]?.value ? JSON.parse(rows[0].value) : null;
    if (!isNewRequest(request?.requestedAt, state.handledAt)) { console.log("No new fix request."); return 0; }
    writeFileSync(statePath, JSON.stringify({ handledAt: request.requestedAt, startedAt: new Date().toISOString() }));
    console.log(`REQUEST: ${JSON.stringify({ requestedAt: request.requestedAt, area: request.area || "" })}`);
    return 10;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().then((code) => process.exit(code)).catch((error) => { console.error("fix-request failed:", error.message); process.exit(2); });
}
