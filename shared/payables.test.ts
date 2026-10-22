import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dueDateFrom } from "./payables";

describe("dueDateFrom", () => {
  it("should add the terms to the receipt date", () => assert.equal(dueDateFrom("2026-10-22", 30), "2026-11-21"));
  it("should cross a year end", () => assert.equal(dueDateFrom("2026-12-20", 30), "2027-01-19"));
  it("should give the same day for 0 days", () => assert.equal(dueDateFrom("2026-10-22", 0), "2026-10-22"));
  it("should give an empty answer for a bad date", () => assert.equal(dueDateFrom("22/10/2026", 30), ""));
  it("should not go beyond a year", () => assert.equal(dueDateFrom("2026-01-01", 9999), "2027-01-01"));
});
