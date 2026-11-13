import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const search = readFileSync(new URL("./songSearch.ts", import.meta.url), "utf8");
const hints = readFileSync(new URL("../client/src/lib/i18n/venue.ts", import.meta.url), "utf8");

describe("library search by pinyin initials", () => {
  it("should only use initials for two or more letters", () => {
    assert.ok(search.includes("/^[a-z]{2,}$/i.test(query)"));
  });

  it("should match the first letters of the title's and the artist's pinyin", () => {
    assert.ok(search.includes("regexp_replace(${songs.titlePinyin}") && search.includes("regexp_replace(${songs.artistPinyin}"));
  });

  it("should tell members they can type pinyin letters", () => {
    assert.ok(hints.includes("pinyin letters (wbng)") && hints.includes("拼音首字母（wbng）") && hints.includes("huruf pinyin (wbng)"));
  });
});
