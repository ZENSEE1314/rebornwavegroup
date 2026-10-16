// Venue PC launcher: a local Postgres (no installation) + the app in VENUE_MODE, restarted if it stops. Read venue/README.md first.
import EmbeddedPostgres from "embedded-postgres";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const configFile = path.join(here, "config.json");
const dataDir = path.join(here, "data");
const RESTART_DELAY_MS = 5000;
const DB_NAME = "reborn";
const require = createRequire(path.join(root, "package.json"));
const { Client } = require("pg");

if (!fs.existsSync(configFile)) {
  fs.writeFileSync(configFile, JSON.stringify({ cloudUrl: "https://rebornwave.group", token: "PASTE-THE-TOKEN-FROM-ADMIN-SETTINGS", port: 3000, dbPort: 54329, sessionSecret: randomBytes(24).toString("hex") }, null, 2));
  console.log(`\nA settings file was made: ${configFile}\nOpen it, paste the token (Admin > Settings > Venue server on the cloud site), save, and start again.\n`);
  process.exit(0);
}
const config = JSON.parse(fs.readFileSync(configFile, "utf8"));
if (!config.token || config.token.startsWith("PASTE")) { console.error("config.json still has no token. Get it from Admin > Settings > Venue server on the cloud site."); process.exit(1); }
if (!fs.existsSync(path.join(root, "dist", "index.js"))) { console.error("The app is not built yet: run  npm run build  in the project folder."); process.exit(1); }

const databaseUrl = `postgres://postgres:pw@127.0.0.1:${config.dbPort}/${DB_NAME}`;
const isFirstRun = !fs.existsSync(path.join(dataDir, "PG_VERSION"));
const postgres = new EmbeddedPostgres({ databaseDir: dataDir, user: "postgres", password: "pw", port: config.dbPort, persistent: true, initdbFlags: ["--encoding=UTF8", "--locale=C"] });
if (isFirstRun) await postgres.initialise();
await postgres.start();
if (isFirstRun) {
  await postgres.createDatabase(DB_NAME);
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  await client.query(`ALTER DATABASE ${DB_NAME} SET client_encoding = 'UTF8'`);
  await client.query("ALTER ROLE postgres SET client_encoding = 'UTF8'");
  await client.end();
  console.log("First start: creating the tables…");
  const push = spawnSync("npx", ["drizzle-kit", "push", "--force"], { cwd: root, env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: "inherit", shell: true });
  if (push.status !== 0) { console.error("Could not create the tables."); await postgres.stop(); process.exit(1); }
}

let child = null;
let stopping = false;
function runApp() {
  child = spawn(process.execPath, ["dist/index.js"], {
    cwd: root, stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl, PORT: String(config.port), NODE_ENV: "production", SESSION_SECRET: config.sessionSecret, VENUE_MODE: "1", CLOUD_URL: config.cloudUrl, VENUE_SYNC_TOKEN: config.token },
  });
  child.on("exit", (code) => { if (!stopping) { console.log(`The app stopped (${code}); starting again in ${RESTART_DELAY_MS / 1000}s…`); setTimeout(runApp, RESTART_DELAY_MS); } });
}
runApp();

const addresses = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === "IPv4" && !i.internal).map((i) => i.address);
console.log("\n==== Venue server is starting ====");
for (const ip of addresses) console.log(`  Guests (venue Wi-Fi):  http://${ip}:${config.port}/     QR page to print:  http://${ip}:${config.port}/venue`);
console.log(`  This PC:               http://localhost:${config.port}/\n`);

async function shutdown() {
  if (stopping) return;
  stopping = true;
  child?.kill();
  await postgres.stop().catch(() => {});
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
