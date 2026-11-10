import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./rebornGame.ts", import.meta.url), "utf8");
const panel = readFileSync(new URL("../client/src/components/ExpensesPanel.tsx", import.meta.url), "utf8");

describe("paying a supplier bill by bank transfer", () => {
  it("should accept bank transfer next to cash and card on the server", () => {
    assert.ok(source.includes('raw === "cash" || raw === "card" || raw === "transfer"'));
  });

  it("should offer a Paid by bank transfer button on an owed bill", () => {
    assert.ok(panel.includes('["cash", "card", "transfer"]'));
  });

  it("should offer bank transfer in the How it was paid list", () => {
    assert.ok(panel.includes('<option value="transfer">{t("ex.pm.transfer")}</option>'));
  });
});
