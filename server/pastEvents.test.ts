import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./rebornGame.ts", import.meta.url), "utf8");
const pastFn = source.slice(source.indexOf("export async function pastEvents"), source.indexOf("const PAST_EVENTS_LIMIT"));

describe("past events", () => {
  it("should keep only dated events whose last day is before today", () => {
    assert.ok(pastFn.includes("e.startDate && last(e) < today"));
  });

  it("should list the most recent past event first", () => {
    assert.ok(pastFn.includes("last(b).localeCompare(last(a))"));
  });

  it("should serve them on their own route so the upcoming list stays upcoming-only", () => {
    assert.ok(source.includes('"/api/reborn/events/past"') && source.includes("(await pastEvents())"));
  });
});
