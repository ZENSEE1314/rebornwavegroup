// Venue PC launcher: a local Postgres (no installation) + the app in VENUE_MODE, restarted if it stops. Read venue/README.md first.
// Works from the project folder (developer) and from the packaged download (RebornVenue/launcher next to RebornVenue/app).
import EmbeddedPostgres from "embedded-postgres";
import { spawn, spawnSync, exec } from "node:child_process";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const parent = path.resolve(here, "..");
const isPackaged = fs.existsSync(path.join(parent, "app", "dist", "index.js"));
const appDir = isPackaged ? path.join(parent, "app") : parent;           // where dist/ and node_modules/ are
const homeDir = isPackaged ? parent : here;                              // where config.json and data/ stay (kept across updates)
const configFile = path.join(homeDir, "config.json");
const dataDir = path.join(homeDir, "data");
const DEFAULT_PORT = 3000;
const RESTART_DELAY_MS = 5000;
const DB_NAME = "reborn";
const require = createRequire(path.join(appDir, "package.json"));
const { Client } = require("pg");

const openInBrowser = (url) => exec(`start "" "${url}"`);

// First run: a small page in the browser asks for the cloud address and the token (no file to edit).
async function askForSettings() {
  const page = (message = "") => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reborn venue setup</title>
<body style="font-family:system-ui,sans-serif;max-width:560px;margin:40px auto;padding:0 16px">
<h1>Reborn venue server — first setup</h1>
<p>On the cloud site open <b>Admin › Settings › Venue server</b>, press <b>Turn on</b> and copy the token here.</p>
${message ? `<p style="color:#b00020"><b>${message}</b></p>` : ""}
<form method="post" action="/save">
<p><label>Cloud address<br><input name="cloudUrl" value="https://rebornwave.group" style="width:100%;padding:10px;font-size:16px"></label></p>
<p><label>Token<br><input name="token" style="width:100%;padding:10px;font-size:16px" autofocus></label></p>
<p><button style="padding:12px 24px;font-size:16px">Save and start</button></p></form>`;
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      if (req.method === "POST" && req.url === "/save") {
        let body = "";
        for await (const chunk of req) body += chunk;
        const form = new URLSearchParams(body);
        const cloudUrl = String(form.get("cloudUrl") || "").trim().replace(/\/+$/, "");
        const token = String(form.get("token") || "").trim();
        try {
          const answer = await fetch(`${cloudUrl}/api/venue-sync/hello`, { headers: { "x-venue-token": token }, signal: AbortSignal.timeout(10_000) });
          if (answer.status === 401) throw new Error("The cloud did not accept that token. Copy it again from Admin › Settings › Venue server.");
          if (!answer.ok) throw new Error(`The cloud answered ${answer.status}. Is "Turn on" pressed in Admin › Settings › Venue server?`);
        } catch (error) {
          res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
          return res.end(page(error.message.includes("fetch failed") ? "Cannot reach the cloud: check this PC's internet and the address." : error.message));
        }
        const config = { cloudUrl, token, port: DEFAULT_PORT, dbPort: 54329, sessionSecret: randomBytes(24).toString("hex") };
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end("<!doctype html><meta charset='utf-8'><body style='font-family:system-ui;max-width:560px;margin:40px auto'><h1>Saved</h1><p>The venue server is starting. The first copy of the data takes a few minutes. You can close this tab; the app opens on the same address.</p>");
        server.close(() => resolve(config));
        return;
      }
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(page());
    });
    server.listen(DEFAULT_PORT, () => { console.log(`\nFirst setup: open http://localhost:${DEFAULT_PORT}/ (it opens by itself).`); openInBrowser(`http://localhost:${DEFAULT_PORT}/`); });
  });
}

let config = fs.existsSync(configFile) ? JSON.parse(fs.readFileSync(configFile, "utf8")) : null;
if (!config || !config.token || String(config.token).startsWith("PASTE")) config = await askForSettings();
if (!fs.existsSync(path.join(appDir, "dist", "index.js"))) { console.error("The app is not built yet: run  npm run build  in the project folder."); process.exit(1); }

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
}

// The tables: all of them on the first start; on later starts only what a new version added (nothing is dropped: if the update would, it stops and says so).
const drizzleKit = path.join(appDir, "node_modules", "drizzle-kit", "bin.cjs");
if (fs.existsSync(drizzleKit)) {
  console.log(isFirstRun ? "First start: creating the tables…" : "Checking the tables…");
  const push = spawnSync(process.execPath, [drizzleKit, "push", ...(isFirstRun ? ["--force"] : [])], { cwd: appDir, env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: ["ignore", "inherit", "inherit"] });
  if (push.status !== 0 && isFirstRun) { console.error("Could not create the tables."); await postgres.stop(); process.exit(1); }
  if (push.status !== 0) console.warn("The table check did not finish (an update that would remove data needs the developer). The app starts with the tables it has.");
}

let child = null;
let stopping = false;
function runApp() {
  child = spawn(process.execPath, ["dist/index.js"], {
    cwd: appDir, stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl, PORT: String(config.port), NODE_ENV: "production", SESSION_SECRET: config.sessionSecret, VENUE_MODE: "1", CLOUD_URL: config.cloudUrl, VENUE_SYNC_TOKEN: config.token },
  });
  child.on("exit", (code) => { if (!stopping) { console.log(`The app stopped (${code}); starting again in ${RESTART_DELAY_MS / 1000}s…`); setTimeout(runApp, RESTART_DELAY_MS); } });
}
runApp();

const addresses = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === "IPv4" && !i.internal).map((i) => i.address);
console.log("\n==== Venue server is starting ====");
for (const ip of addresses) console.log(`  Guests (venue Wi-Fi):  http://${ip}:${config.port}/     QR page to print:  http://${ip}:${config.port}/venue`);
console.log(`  This PC:               http://localhost:${config.port}/\n`);
setTimeout(() => openInBrowser(`http://localhost:${config.port}/`), 20_000);

async function shutdown() {
  if (stopping) return;
  stopping = true;
  child?.kill();
  await postgres.stop().catch(() => {});
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
