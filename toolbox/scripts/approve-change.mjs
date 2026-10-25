// The approval script: run it before every push. It checks the change against the playbook rules and prints APPROVED TO PUSH or NOT APPROVED.
// It never pushes, commits or changes anything. A person still decides to push.
//
//   node toolbox/scripts/approve-change.mjs              full check (build + every unit test)
//   node toolbox/scripts/approve-change.mjs --quick      skip the build and run only the test files in the change
//   node toolbox/scripts/approve-change.mjs --report f   also write the result to a file (see toolbox/templates/change-report.md)
//
// Run it from the working copy (the git worktree), never from the main repo folder.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = process.env.APPROVE_BASE || "origin/main";
const TRAILER = "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>";
const MAIN_REPO_FOLDER = "reborn-hero";
const CODE_DIRS = ["server/", "client/src/", "shared/"];
const SECRET_NAMES = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "RESEND_API_KEY", "SENDGRID_API_KEY", "WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID", "WHATSAPP_VERIFY_TOKEN", "EXPO_ACCESS_TOKEN", "SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"];
const SECRET_PATTERNS = [
  { name: "a database address with a password for a real host", re: /postgres(?:ql)?:\/\/[^\s:@/]+:(?!<)[^\s@/]+@(?!127\.0\.0\.1|localhost)[^\s/'"`]+/i },
  { name: "an Anthropic key", re: /sk-ant-[A-Za-z0-9_-]{10,}/ },
  { name: "an OpenAI-style key", re: /\bsk-[A-Za-z0-9]{32,}\b/ },
  { name: "a private key block", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "a Meta / WhatsApp access token", re: /\bEAA[A-Za-z0-9]{60,}\b/ },
  { name: "a Slack token", re: /\bxox[abp]-[A-Za-z0-9-]{10,}/ },
  { name: "a Railway proxy address", re: /[a-z0-9.-]+\.(?:proxy\.rlwy\.net|railway\.internal)/i },
];

const args = process.argv.slice(2);
const isQuick = args.includes("--quick");
const reportPath = args.includes("--report") ? args[args.indexOf("--report") + 1] : "";
const results = [];
const note = (status, name, detail = "") => { results.push({ status, name, detail }); console.log(`${status.padEnd(4)} ${name}${detail ? `  → ${detail}` : ""}`); };
const git = (...a) => { try { return execFileSync("git", a, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); } catch { return ""; } };

// 1. Where am I
const root = git("rev-parse", "--show-toplevel").trim();
if (!root) { console.error("Not inside a git working copy."); process.exit(2); }
process.chdir(root);
if (root.toLowerCase().includes(MAIN_REPO_FOLDER)) note("FAIL", "Working copy", `this is the main repo folder (${MAIN_REPO_FOLDER}); another session's work lives there. Use the worktree.`);
else note("PASS", "Working copy", root);

// 2. What changed (committed since the base + not yet committed)
git("fetch", "-q", "origin");
const changedFiles = Array.from(new Set([
  ...git("diff", "--name-only", `${BASE}...HEAD`).split("\n"),
  ...git("diff", "--name-only", "HEAD").split("\n"),
  ...git("ls-files", "--others", "--exclude-standard").split("\n"),
].map((f) => f.trim()).filter(Boolean)));
if (changedFiles.length === 0) { note("FAIL", "Change", `nothing differs from ${BASE}`); finish(); }
note("PASS", "Change", `${changedFiles.length} file(s) differ from ${BASE}`);

const addedLines = (file) => {
  const committed = git("diff", "-U0", `${BASE}...HEAD`, "--", file);
  const working = git("diff", "-U0", "HEAD", "--", file);
  const untracked = existsSync(file) && !git("ls-files", "--", file).trim() ? readFileSync(file, "utf8").split("\n").map((l) => `+${l}`).join("\n") : "";
  return [committed, working, untracked].join("\n").split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).map((l) => l.slice(1));
};
const isBinary = (f) => /\.(png|jpe?g|webp|gif|mp4|webm|zip|apk|ico|woff2?|ttf|pdf)$/i.test(f);
const MAX_SCAN_BYTES = 1_500_000; // big untracked files (databases, data sets) are not source
const textFiles = changedFiles.filter((f) => !/^(\.test-db|node_modules|dist)\//.test(f) && existsSync(f) && !isBinary(f) && statSync(f).isFile() && statSync(f).size < MAX_SCAN_BYTES);

// 3. Secrets in the added lines (never in the repository, a screenshot or chat)
const secretHits = [];
for (const file of textFiles) {
  if (file === "toolbox/scripts/approve-change.mjs" || file === "toolbox/scripts/approve-change.test.mjs") continue; // hold the patterns and the sample secrets themselves
  for (const line of addedLines(file)) for (const p of SECRET_PATTERNS) if (p.re.test(line)) secretHits.push(`${file}: ${p.name}`);
}
if (secretHits.length) note("FAIL", "No secrets in the change", Array.from(new Set(secretHits)).join("; "));
else note("PASS", "No secrets in the change");

// 4. Secret-key names are read with secret(NAME), not process.env.NAME (Settings › Keys must work)
const envHits = [];
for (const file of textFiles.filter((f) => f.startsWith("server/") && !/secrets\.ts$|\.test\.ts$/.test(f))) {
  for (const line of addedLines(file)) for (const name of SECRET_NAMES) if (line.includes(`process.env.${name}`)) envHits.push(`${file}: process.env.${name}`);
}
if (envHits.length) note("FAIL", "Saved keys are read with secret(NAME)", envHits.join("; "));
else note("PASS", "Saved keys are read with secret(NAME)");

// 5. Three languages: a new text key needs en, zh and id
const i18nProblems = [];
for (const file of textFiles.filter((f) => /client\/src\/lib\/i18n\/.*\.ts$/.test(f))) {
  for (const line of addedLines(file)) {
    if (!/^\s*['"][\w.]+['"]\s*:\s*\{/.test(line)) continue;
    const hasAll = /\ben\s*:/.test(line) && /\bzh\s*:/.test(line) && /\bid\s*:/.test(line);
    if (!hasAll) i18nProblems.push(`${file}: ${line.trim().slice(0, 60)}`);
  }
}
if (i18nProblems.length) note("FAIL", "New texts exist in English, 中文 and Bahasa", i18nProblems.slice(0, 5).join("; "));
else note("PASS", "New texts exist in English, 中文 and Bahasa");

// 6. Rules of the code
const codeChanged = textFiles.filter((f) => CODE_DIRS.some((d) => f.startsWith(d)) && !/\.test\.tsx?$/.test(f));
const sqlProblems = [];
for (const file of codeChanged.filter((f) => f.startsWith("server/"))) {
  for (const line of addedLines(file)) {
    if (/sql\.raw\(\s*(?:req\.|`[^`]*\$\{\s*(?:req|body|b)\b)/.test(line)) sqlProblems.push(`${file}: request data in sql.raw`);
    if (/\bpublic\.(?!platform_settings)\w+/.test(line) && /\b(?:select|insert|update|delete)\b/i.test(line) && !/pool\.query|platformDb|CREATE|ALTER/i.test(line)) sqlProblems.push(`${file}: public. in a query`);
  }
}
if (sqlProblems.length) note("FAIL", "Query rules (no request data in sql.raw, no public. in a query)", Array.from(new Set(sqlProblems)).slice(0, 5).join("; "));
else note("PASS", "Query rules (no request data in sql.raw, no public. in a query)");
if (changedFiles.includes("server/security.ts")) note("WARN", "server/security.ts changed", "it is the officer-check and cameras file; hardening lives in server/webSecurity.ts");
const literalSlug = codeChanged.flatMap((f) => addedLines(f).filter((l) => l.includes('"reborn-wave-group"') && !/homeCompanySlug|REBORN_SLUG\s*=/.test(l)).map(() => f));
if (literalSlug.length) note("WARN", 'Literal "reborn-wave-group"', `use homeCompanySlug(): ${Array.from(new Set(literalSlug)).join(", ")}`);
const rpHand = codeChanged.filter((f) => f.startsWith("client/")).flatMap((f) => addedLines(f).filter((l) => /["'`]RP ["'`]\s*\+|`RP \$\{/.test(l)).map(() => f));
if (rpHand.length) note("WARN", 'Money written with "RP " by hand', `use money(): ${Array.from(new Set(rpHand)).join(", ")}`);

// 7. A note and a test travel with every code change
if (codeChanged.length) {
  if (changedFiles.includes("CLAUDE.md")) note("PASS", "Note in CLAUDE.md");
  else note("FAIL", "Note in CLAUDE.md", "add one line about the change (what it does, the rule, the test)");
  const testsInChange = changedFiles.filter((f) => /\.test\.(tsx?|mjs)$|scripts\/e2e\/.*\.mjs$/.test(f));
  if (testsInChange.length) note("PASS", "A test in the change", testsInChange.join(", "));
  else note("FAIL", "A test in the change", "add a unit test (*.test.ts) or an end-to-end script (scripts/e2e/)");
} else note("SKIP", "Note and test", "no code files changed");

// 7b. Rule T10: every file in the toolbox is listed in toolbox/README.md and named in the master playbook
if (changedFiles.some((f) => f.startsWith("toolbox/"))) {
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
  const toolboxFiles = walk("toolbox").map((f) => f.split(path.sep).join("/"));
  const readme = readFileSync("toolbox/README.md", "utf8");
  const master = readFileSync("toolbox/playbooks/MASTER-PLAYBOOK.md", "utf8");
  const notInReadme = toolboxFiles.filter((f) => f !== "toolbox/README.md" && !readme.includes(path.basename(f)));
  const playbooks = toolboxFiles.filter((f) => f.startsWith("toolbox/playbooks/") || f === "toolbox/README.md");
  const notInMaster = toolboxFiles.filter((f) => !playbooks.includes(f) && !master.includes(path.basename(f)));
  const masterOwn = !playbooks.some((f) => !master.includes(path.basename(f)) && f !== "toolbox/playbooks/MASTER-PLAYBOOK.md") ;
  if (notInReadme.length || notInMaster.length || !masterOwn) note("FAIL", "Toolbox is whole (T10)", `not in README: ${notInReadme.join(", ") || "-"}; not named in the master playbook: ${notInMaster.join(", ") || "-"}${masterOwn ? "" : "; a playbook is not named in the master"}`);
  else note("PASS", "Toolbox is whole (T10)", `${toolboxFiles.length} files listed`);
}

// 8. Tests must not touch the live database or the live ports
const livePorts = [];
for (const file of textFiles.filter((f) => /^scripts\/e2e\/.*\.mjs$/.test(f))) {
  for (const line of addedLines(file)) if (/rlwy\.net|railway\.app|rebornwave\.group/i.test(line)) livePorts.push(file);
}
if (livePorts.length) note("FAIL", "Tests stay off the live system", Array.from(new Set(livePorts)).join(", "));
else note("PASS", "Tests stay off the live system");

// 9. Commit messages carry the trailer (only when there are commits)
const commits = git("log", "--format=%H", `${BASE}..HEAD`).split("\n").filter(Boolean);
if (commits.length === 0) note("SKIP", "Commit trailer", "no commit yet; commit with the trailer: " + TRAILER);
else {
  const missing = commits.filter((c) => !git("log", "-1", "--format=%B", c).includes(TRAILER));
  if (missing.length) note("FAIL", "Commit trailer", `${missing.length} commit(s) lack: ${TRAILER}`);
  else note("PASS", "Commit trailer", `${commits.length} commit(s)`);
}

// 10. Build and tests
const run = (cmd, argv) => spawnSync(cmd, argv, { encoding: "utf8", shell: process.platform === "win32", maxBuffer: 256 * 1024 * 1024 });
if (isQuick) note("SKIP", "Build", "--quick");
else {
  const build = run("npm", ["run", "build"]);
  const errors = `${build.stdout}\n${build.stderr}`.split("\n").filter((l) => /\bERROR\b|error TS/.test(l)).slice(0, 3).join(" | ");
  if (build.status === 0 && existsSync("dist/index.js")) note("PASS", "Build");
  else note("FAIL", "Build", errors || `exit ${build.status}`);
}
const allTests = (dir) => existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() && e.name !== "node_modules" ? allTests(path.join(dir, e.name)) : e.name.endsWith(".test.ts") ? [path.join(dir, e.name)] : []) : [];
const testFiles = isQuick ? changedFiles.filter((f) => /\.test\.ts$/.test(f) && existsSync(f)) : ["server", "shared", "venue", "client/src", "mobile"].flatMap(allTests);
if (testFiles.length === 0) note("SKIP", "Unit tests", "no test files to run");
else {
  const tests = run("npx", ["tsx", "--test", ...testFiles]);
  const out = `${tests.stdout}\n${tests.stderr}`;
  const pass = /ℹ pass (\d+)/.exec(out)?.[1], fail = /ℹ fail (\d+)/.exec(out)?.[1];
  if (tests.status === 0 && fail === "0") note("PASS", "Unit tests", `${pass} passed in ${testFiles.length} file(s)`);
  else note("FAIL", "Unit tests", `${fail ?? "?"} failed; run: npx tsx --test <file>`);
}
note("SKIP", "End-to-end scripts", "run toolbox/scripts/run-tests.sh on spare ports (they need a test database and server)");

finish();

function finish() {
  const failed = results.filter((r) => r.status === "FAIL");
  const warned = results.filter((r) => r.status === "WARN");
  const verdict = failed.length === 0 ? "APPROVED TO PUSH" : "NOT APPROVED";
  console.log(`\n${verdict}  (${results.filter((r) => r.status === "PASS").length} passed, ${warned.length} warnings, ${failed.length} failed)`);
  if (failed.length === 0) console.log("Still needed from a person: run the end-to-end scripts, check visual changes in the browser, then push and update the PC copy.");
  if (reportPath) {
    const lines = [`# Approval result · ${new Date().toISOString()}`, "", `**${verdict}**`, "", "| Check | Result | Detail |", "|---|---|---|", ...results.map((r) => `| ${r.name} | ${r.status} | ${r.detail.replace(/\|/g, "/")} |`)];
    writeFileSync(reportPath, lines.join("\n") + "\n");
    console.log(`Report written to ${reportPath}`);
  }
  process.exit(failed.length === 0 ? 0 : 1);
}
