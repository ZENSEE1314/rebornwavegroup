import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MAX_INDUSTRIES, cleanIndustries } from "./industries";

describe("cleaning the industries list", () => {
  it("should trim names", () => assert.deepEqual(cleanIndustries(["  KTV Room  "]), ["KTV Room"]));
  it("should drop empty names", () => assert.deepEqual(cleanIndustries(["", "  ", "Beauty"]), ["Beauty"]));
  it("should drop repeats whatever the case", () => assert.deepEqual(cleanIndustries(["Lounge", "lounge"]), ["Lounge"]));
  it("should read one industry per line from text", () => assert.deepEqual(cleanIndustries("Lounge\nBeauty\n"), ["Lounge", "Beauty"]));
  it("should remove commas, which separate a product's industries", () => assert.deepEqual(cleanIndustries(["Bar, Grill"]), ["Bar Grill"]));
  it("should keep at most the allowed number", () => assert.equal(cleanIndustries(Array.from({ length: 30 }, (_, i) => `Industry ${i}`)).length, MAX_INDUSTRIES));
  it("should give an empty list for anything else", () => assert.deepEqual(cleanIndustries(42), []));
});
