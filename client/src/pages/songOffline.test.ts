import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("./reborn-song.tsx", import.meta.url), "utf8");

describe("song requests while the song system is offline", () => {
  it("should not replace the screen with the not-connected message", () => {
    assert.ok(!page.includes("if (status && !status.online) return ("));
  });

  it("should tell the member the song will play when the system is back", () => {
    assert.ok(page.includes('t("vn.song.offlineNotice")'));
  });

  it("should search even when the system is offline", () => {
    assert.ok(page.includes("enabled: search.length > 0,"));
  });
});
