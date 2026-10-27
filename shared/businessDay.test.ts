import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { businessDayOf } from "./businessDay";

const at = (hour: number, minute = 0, day = 27) => new Date(2026, 9, day, hour, minute);

describe("businessDayOf", () => {
  it("should keep a 5pm sale on its own date", () => assert.equal(businessDayOf(at(17)), "2026-10-27"));
  it("should count a 1:30am sale as the night before", () => assert.equal(businessDayOf(at(1, 30, 28)), "2026-10-27"));
  it("should count a 3am sale as the night before", () => assert.equal(businessDayOf(at(3, 0, 28)), "2026-10-27"));
  it("should start the next sales day at 8am", () => assert.equal(businessDayOf(at(8, 0, 28)), "2026-10-28"));
  it("should still be the night before at 7:59am", () => assert.equal(businessDayOf(at(7, 59, 28)), "2026-10-27"));
  it("should cross a month end", () => assert.equal(businessDayOf(new Date(2026, 10, 1, 2, 0)), "2026-10-31"));
});
