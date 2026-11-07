import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const server = readFileSync(new URL("./rebornGame.ts", import.meta.url), "utf8");
const admin = readFileSync(new URL("../client/src/pages/reborn-admin.tsx", import.meta.url), "utf8");
const route = server.slice(server.indexOf('app.delete("/api/reborn/admin/accounting/ledger/:id"'), server.indexOf("const MAX_DRILL_LINES"));

describe("manual accounting line delete", () => {
  it("should refuse a line that follows a bill, upload or sale", () => {
    assert.ok(route.includes("row.refType !== null") && route.includes("status(400)"));
  });

  it("should keep what was deleted in the admin log", () => {
    assert.ok(route.includes('action: "delete_entry"') && route.includes("oldValues"));
  });

  it("should show Edit and Delete only on lines keyed in by hand", () => {
    assert.ok(admin.includes("{!l.refType && ("));
  });

  it("should ask before deleting", () => {
    assert.ok(admin.includes('window.confirm(t("admin.acc.deleteAsk"'));
  });
});
