// Read-only look at the karaoke box's own web server, to find out whether it can show a text / message on the TV.
// Run on the venue PC (it must reach the box):  node venue/probe-box.mjs http://<box ip>:8084
// Writes venue/box-probe.txt: every page and script of the box's phone page and every servlet / command name found in them. It only GETs pages; it never orders, skips or changes anything.
import { writeFileSync } from "node:fs";

const base = (process.argv[2] || process.env.BOX_URL || "").replace(/\/+$/, "");
if (!base) { console.error("Usage: node venue/probe-box.mjs http://<box ip>:8084"); process.exit(1); }

const TIMEOUT_MS = 8000;
const START_PATHS = ["/demo/", "/demo/index.html", "/"];
const MAX_FILES = 40;
const NAME_PATTERN = /\b[A-Za-z]*(?:Servlet|Command|Message|Msg|Marquee|Scroll|Notice|Subtitle|Text|Show|Display|Popup|Banner)[A-Za-z]*\b|cmd\s*[:=]\s*["'][A-Za-z0-9_]+["']|["']\/[A-Za-z0-9_\/.-]+(?:\.html|\.js|\.do|\.jsp|Servlet)[^"']*["']/g;

const seen = new Set();
const report = [];
const names = new Set();

async function get(path) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  return { status: response.status, type: response.headers.get("content-type") || "", text: await response.text() };
}

async function visit(path) {
  if (seen.has(path) || seen.size >= MAX_FILES) return;
  seen.add(path);
  let page;
  try { page = await get(path); } catch (error) { report.push(`# ${path}\nFAILED: ${error.message}\n`); return; }
  report.push(`# ${path}  (${page.status}, ${page.type}, ${page.text.length} bytes)\n${page.text.slice(0, 6000)}\n`);
  for (const match of page.text.match(NAME_PATTERN) || []) names.add(match);
  for (const [, link] of page.text.matchAll(/(?:src|href)=["']([^"'#]+\.(?:js|html))["']/g)) {
    if (/^https?:/.test(link)) continue;
    const dir = path.endsWith("/") ? path : path.slice(0, path.lastIndexOf("/") + 1);
    await visit(link.startsWith("/") ? link : dir + link);
  }
}

for (const path of START_PATHS) await visit(path);
const summary = `Box: ${base}\nFiles read: ${[...seen].join(", ")}\n\nNames that could show text on the TV or send a command:\n${[...names].sort().join("\n") || "(none found)"}\n\n`;
writeFileSync(new URL("./box-probe.txt", import.meta.url), summary + report.join("\n"));
console.log(summary);
console.log("Saved venue/box-probe.txt — send it to Claude.");
