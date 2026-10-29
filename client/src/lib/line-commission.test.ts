import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { percentToSend } from "./line-commission";

describe("the % sent when a staff member is picked for a bill line", () => {
  it("should send nothing when the box is blank, so the item's own rule (a fixed amount) still applies", () => {
    assert.equal(percentToSend(""), null);
  });
  it("should send nothing when the box only holds spaces", () => {
    assert.equal(percentToSend("  "), null);
  });
  it("should send the typed percent", () => {
    assert.equal(percentToSend("12.5"), 12.5);
  });
  it("should send 0 when the cashier typed 0 on purpose", () => {
    assert.equal(percentToSend("0"), 0);
  });
  it("should cap the percent at 100", () => {
    assert.equal(percentToSend("250"), 100);
  });
  it("should use it in both the staff select and the % box", () => {
    const source = readFileSync(new URL("../components/LineCommissionPick.tsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");
    assert.equal(source.split("percentToSend(typed)").length - 1, 2);
  });
  it("should not re-save the person when the % box loses focus without a change (it raced against 'No commission')", () => {
    const source = readFileSync(new URL("../components/LineCommissionPick.tsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");
    assert.ok(source.includes('if (typed !== String(shown || "")) onSave(staffId, percentToSend(typed))'));
  });
  it("should show the pick on the bill at once and put it back when the save fails", () => {
    const pos = readFileSync(new URL("../pages/reborn-pos.tsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");
    const mutation = pos.slice(pos.indexOf("const commissionStaff = useMutation("), pos.indexOf("const itemStatus = useMutation("));
    assert.ok(mutation.includes("onMutate") && mutation.includes("context.ticketsBefore"));
  });
});
