import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./reborn-pos.tsx", import.meta.url), "utf8");

describe("POS sales bill details", () => {
  it("should show who keyed each line", () => {
    assert.ok(source.includes("it.addedByName") && source.includes('t("pos.sales.keyedBy"'));
  });

  it("should let a bill be opened and closed", () => {
    assert.ok(source.includes("setOpenBillId(openBillId === o.id ? null : o.id)"));
  });

  it("should still list removed lines so the history is complete", () => {
    assert.ok(source.includes("OFF_BILL.includes(it.status)") && source.includes("line-through"));
  });
});
