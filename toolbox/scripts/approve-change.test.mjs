// Tests for the approval script: each check must refuse what it is meant to refuse, and stay quiet on a clean tree.
//   node --test toolbox/scripts/approve-change.test.mjs
// It makes throw-away probe files in the working copy and removes them afterwards (also if a test fails).
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const SCRIPT = "toolbox/scripts/approve-change.mjs";
const PROBES = ["server/zz-approval-probe.ts", "toolbox/templates/zz-unlisted.md"];
const I18N_FILE = "client/src/lib/i18n/home.ts";
const originalI18n = execFileSync("git", ["show", `HEAD:${I18N_FILE}`], { encoding: "utf8", cwd: root });

const approve = () => spawnSync("node", [SCRIPT, "--quick"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).stdout;
const clean = () => { for (const f of PROBES) rmSync(`${root}/${f}`, { force: true }); execFileSync("git", ["checkout", "--", I18N_FILE], { cwd: root }); };
const lineFor = (output, name) => output.split("\n").find((l) => l.includes(name)) || "";

describe("approve-change", () => {
  after(clean);

  it("should pass the secrets, key, text and toolbox checks on a clean tree", () => {
    clean();
    const out = approve();
    for (const name of ["No secrets in the change", "Saved keys are read with secret(NAME)", "New texts exist in English", "Toolbox is whole (T10)"]) assert.match(lineFor(out, name), /^PASS/, name);
  });

  it("should refuse a database address with a password for a real host", () => {
    writeFileSync(`${root}/${PROBES[0]}`, 'export const url = "postgres://admin:hunter2@db.example.com/app";\n');
    assert.match(lineFor(approve(), "No secrets in the change"), /^FAIL/);
  });

  it("should accept a placeholder password in a document", () => {
    clean();
    writeFileSync(`${root}/${PROBES[0]}`, '// postgresql://postgres:<password>@<host>:<port>/railway\n');
    assert.match(lineFor(approve(), "No secrets in the change"), /^PASS/);
  });

  it("should refuse reading a saved key straight from the environment", () => {
    clean();
    writeFileSync(`${root}/${PROBES[0]}`, "export const key = process.env.ANTHROPIC_API_KEY;\n");
    assert.match(lineFor(approve(), "Saved keys are read with secret(NAME)"), /^FAIL/);
  });

  it("should refuse a new text that lacks a language", () => {
    clean();
    appendFileSync(`${root}/${I18N_FILE}`, "  'zz.bad': { en: 'Only English' },\n");
    assert.match(lineFor(approve(), "New texts exist in English"), /^FAIL/);
    assert.ok(originalI18n.length > 0);
  });

  it("should refuse a toolbox file that is not listed in the README and the master playbook", () => {
    clean();
    writeFileSync(`${root}/${PROBES[1]}`, "x\n");
    assert.match(lineFor(approve(), "Toolbox is whole (T10)"), /^FAIL/);
    assert.ok(existsSync(`${root}/${PROBES[1]}`));
  });
});
