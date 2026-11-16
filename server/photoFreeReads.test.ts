import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const server = readFileSync(new URL("./rebornGame.ts", import.meta.url), "utf8");

describe("reports and lists never read receipt photos", () => {
  it("should read the ledger of a report without its photo column", () => {
    assert.equal((server.match(/db\.select\(LEDGER_LIGHT\)\.from\(ledgerEntries\)/g) || []).length, 5);
  });

  it("should read the expense uploads of a list without their photo column", () => {
    assert.equal((server.match(/db\.select\(UPLOAD_LIGHT\)\.from\(expenseUploads\)/g) || []).length, 3);
  });

  it("should keep only a marker where the photo was", () => {
    assert.ok(server.includes("CASE WHEN ${ledgerEntries.photoUrl} IS NULL THEN NULL ELSE 'photo' END") && server.includes("CASE WHEN ${expenseUploads.photoUrl} IS NULL THEN NULL ELSE 'photo' END"));
  });

  it("should not read the whole ledger in the accounting summary", () => {
    const summary = server.slice(server.indexOf('app.get("/api/reborn/admin/accounting/summary"'), server.indexOf('app.get("/api/reborn/admin/accounting/ledger"'));
    assert.ok(!summary.includes("db.select().from(ledgerEntries)"));
  });
});
