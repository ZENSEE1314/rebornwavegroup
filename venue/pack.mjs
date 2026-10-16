// Makes the Windows download: RebornVenue-windows.zip in %TEMP%\reborn-venue-pack (or PACK_OUT) (run on a Windows PC:  node venue/pack.mjs).
// It holds everything the venue PC needs — Node, the built app, the local database engine — so nothing has to be installed there.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
// Outside the project folder (and any OneDrive sync): the pieces add up to several hundred MB.
const outDir = process.env.PACK_OUT || path.join(os.tmpdir(), "reborn-venue-pack");
const stage = path.join(outDir, "RebornVenue");
const zipFile = path.join(outDir, "RebornVenue-windows.zip");

if (process.platform !== "win32") { console.error("Run this on Windows: the download carries Windows programs."); process.exit(1); }
const run = (command, args, cwd = root, env = {}) => {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell: true, env: { ...process.env, ...env } });
  if (result.status !== 0) { console.error(`Failed: ${command} ${args.join(" ")}`); process.exit(1); }
};
const copy = (from, to) => fs.cpSync(from, to, { recursive: true });

fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(path.join(stage, "runtime"), { recursive: true });
fs.mkdirSync(path.join(stage, "app"), { recursive: true });
fs.mkdirSync(path.join(stage, "launcher"), { recursive: true });

// 1. the app, built fresh
fs.rmSync(path.join(root, "dist"), { recursive: true, force: true });
run("npx", ["vite", "build", "--emptyOutDir"], root, { BROWSERSLIST_IGNORE_OLD_DATA: "1" });
run("npx", ["esbuild", "server/index.ts", "--platform=node", "--packages=external", "--bundle", "--format=esm", "--outdir=dist"]);
copy(path.join(root, "dist"), path.join(stage, "app", "dist"));
for (const file of ["package.json", "package-lock.json", "drizzle.config.ts"]) copy(path.join(root, file), path.join(stage, "app", file));
copy(path.join(root, "shared"), path.join(stage, "app", "shared"));

// 2. the programs the app needs (production packages + the tool that creates / extends the tables)
run("npm", ["ci", "--omit=dev", "--no-audit", "--no-fund"], path.join(stage, "app"));
run("npm", ["install", "--no-save", "--no-audit", "--no-fund", "drizzle-kit@0.30.4"], path.join(stage, "app"));

// 3. Node itself, and the launcher with its local database engine
fs.copyFileSync(process.execPath, path.join(stage, "runtime", "node.exe"));
for (const file of ["start-venue.mjs", "package.json", "package-lock.json"]) copy(path.join(here, file), path.join(stage, "launcher", file));
run("npm", ["ci", "--omit=dev", "--no-audit", "--no-fund"], path.join(stage, "launcher"));

// 4. the files the person at the venue uses
fs.writeFileSync(path.join(stage, "Start Reborn Venue.bat"), '@echo off\r\ntitle Reborn venue server\r\ncd /d "%~dp0"\r\n"runtime\\node.exe" "launcher\\start-venue.mjs"\r\npause\r\n');
fs.writeFileSync(path.join(stage, "Start automatically with Windows (run as administrator).bat"), [
  "@echo off", 'cd /d "%~dp0"',
  'schtasks /Create /TN "RebornVenueServer" /TR "\\"%~dp0Start Reborn Venue.bat\\"" /SC ONSTART /RL HIGHEST /RU SYSTEM /F',
  'netsh advfirewall firewall add rule name="Reborn venue server" dir=in action=allow protocol=TCP localport=3000 profile=private,domain >nul',
  "powercfg /change standby-timeout-ac 0", "powercfg /change hibernate-timeout-ac 0",
  "echo.", "echo Done: the venue server starts with Windows, the firewall is open for the venue Wi-Fi and the PC no longer sleeps while plugged in.", "pause", ""].join("\r\n"));
fs.writeFileSync(path.join(stage, "READ ME FIRST.txt"), [
  "REBORN VENUE SERVER", "====================", "",
  "This PC runs the app for the venue, so songs, orders, POS and the kitchen screen keep working with no internet.", "",
  "FIRST TIME",
  "1. On the cloud site: Admin > Settings > Venue server > Turn on. Copy the token.",
  "2. Double-click  Start Reborn Venue.bat. A page opens: paste the token, press Save and start.",
  "3. Wait a few minutes (first copy of the data). The window shows the address for guests, e.g. http://192.168.1.50:3000/",
  "   Print the QR page for the tables:  http://<that address>/venue",
  "4. Log in on this PC (http://localhost:3000/) with your normal admin account.",
  "5. Double-click  Start automatically with Windows (run as administrator).bat  once (right-click > Run as administrator).", "",
  "EVERY DAY: nothing. The PC must stay on while the venue is open. Keep the black window open (or let it start with Windows).", "",
  "UPDATING: unzip the new download next to the old folder and copy the old  config.json  and  data  folder into it (or unzip over the old one: config.json and data are kept).", "",
  "ROUTER: see the guide on the cloud site / ask the developer (fixed IP for this PC; guest Wi-Fi with no internet; client isolation off).", ""].join("\r\n"));

// 5. one file to download
fs.rmSync(zipFile, { force: true });
// Windows' own tar (a Git-for-Windows tar would read "C:" as a remote host)
run(`"${path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe")}"`, ["-a", "-c", "-f", `"${zipFile}"`, "-C", `"${outDir}"`, "RebornVenue"], root);
const mb = Math.round(fs.statSync(zipFile).size / 1024 / 1024);
console.log(`\nDone: ${zipFile} (${mb} MB)`);
