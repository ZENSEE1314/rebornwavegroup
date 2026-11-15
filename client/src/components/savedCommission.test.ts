import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const pos = readFileSync(new URL("../pages/reborn-pos.tsx", import.meta.url), "utf8");

describe("commission on an open table bill", () => {
  it("should start from what was saved for that bill", () => {
    assert.ok(pos.includes("const { sales, setSales, commission, setCommission } = useSavedCommission(order.id);") && pos.includes("readSavedCommission(billId)"));
  });

  it("should save a picked commission and drop the saved copy when it is cleared", () => {
    assert.ok(pos.includes("writeSavedCommission(billId, isEmpty ? null : { sales, commission })"));
  });

  it("should forget the saved commission once the bill is paid", () => {
    assert.ok(pos.includes("writeSavedCommission(order.id, null); toast({ title: t(\"pos.paid\")"));
  });
});
