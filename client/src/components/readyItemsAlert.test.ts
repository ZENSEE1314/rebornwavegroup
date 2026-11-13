import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const alert = readFileSync(new URL("../lib/staff-alarm.ts", import.meta.url), "utf8");

describe("ready-order beep for staff", () => {
  it("should play at full volume", () => {
    assert.ok(alert.includes("const BEEP_LOUDNESS = 1;"));
  });

  it("should use two high notes", () => {
    assert.ok(alert.includes("const BEEP_HZ = [988, 1319];"));
  });
});
