import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The Lucky wheel: a second wheel whose spins the admin gives and whose prizes the admin sets.
const WINDOWS_LINE_END = /\r\n/g;
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8").replace(WINDOWS_LINE_END, "\n");
const server = read("../../../server/rebornGame.ts");
const spinPage = read("./reborn-spin.tsx");
const admin = read("./reborn-admin.tsx");

describe("the lucky wheel", () => {
  it("should start with nothing, 5%, 10%, 15%, 20%, a free beer and a free bucket", () => {
    for (const label of ["Nothing", "5% off", "10% off", "15% off", "20% off", "1 free beer", "1 free bucket"]) assert.ok(server.includes(`label: "${label}"`));
  });
  it("should take one spin only when the member has one left", () => {
    assert.ok(server.includes("UPDATE lucky_spin_tokens SET spins = spins - 1") && server.includes("AND spins > 0 RETURNING spins"));
  });
  it("should let only an admin give spins and set prizes", () => {
    assert.ok(server.includes('app.post("/api/reborn/admin/lucky-spin/give", requireAdmin(') && server.includes('app.put("/api/reborn/admin/lucky-prizes/:id", requireAdmin('));
  });
  it("should show members a Lucky tab and admins a give-spins box", () => {
    assert.ok(spinPage.includes('"Lucky"') && admin.includes("function LuckyPrizes()") && admin.includes("<LuckyPrizes />"));
  });
});
