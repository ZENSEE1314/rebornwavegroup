import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("loading every waiting song onto the song system", () => {
  it("should let the server keep a setting of 30", () => {
    assert.ok(read("./rebornGame.ts").includes("const MAX_SONG_LOOKAHEAD = 30;"));
  });

  it("should let the venue bridge load that many", () => {
    assert.ok(read("../venue/karaoke-bridge.mjs").includes("const MAX_LOOKAHEAD = 30;"));
  });

  it("should offer the choice in Settings", () => {
    assert.ok(read("../client/src/pages/reborn-admin.tsx").includes('<option value={30}>{t("admin.set.songLookaheadAll")}</option>'));
  });
});
