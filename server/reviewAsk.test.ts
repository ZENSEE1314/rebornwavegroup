import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { askedThisVenueDay } from "./reviewAsk";

describe("askedThisVenueDay", () => {
  it("should be false when the person was never asked", () => {
    assert.equal(askedThisVenueDay(null, new Date("2026-10-30T18:00:00Z")), false);
  });
  it("should be true for a second bill five minutes after the first ask", () => {
    assert.equal(askedThisVenueDay(new Date("2026-10-30T18:33:00Z"), new Date("2026-10-30T18:38:00Z")), true);
  });
  it("should be true across midnight while the venue day (from 08:00 WIB) is the same", () => {
    assert.equal(askedThisVenueDay(new Date("2026-10-30T16:30:00Z"), new Date("2026-10-30T21:06:00Z")), true);
  });
  it("should be false after 08:00 WIB starts a new venue day", () => {
    assert.equal(askedThisVenueDay(new Date("2026-10-30T21:00:00Z"), new Date("2026-10-31T01:30:00Z")), false);
  });
});
