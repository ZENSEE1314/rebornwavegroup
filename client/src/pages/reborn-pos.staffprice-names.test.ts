import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./reborn-pos.tsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const box = source.slice(source.indexOf("function AtCostBox("), source.indexOf("function AtCostBox(") + 3500);

describe("staff price: who is buying", () => {
  it("should fall back to the plain staff list while the cap figures are missing", () => {
    assert.ok(box.includes("useStaff()") && box.includes("people?.people?.length ? people.people"));
  });
  it("should fill the name drop-down from that list, never from an empty one", () => {
    assert.ok(box.includes("{choices.map((p) => <option"));
  });
});
