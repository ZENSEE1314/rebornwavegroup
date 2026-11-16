import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("./reborn-kos.tsx", import.meta.url), "utf8");
const dockerfile = readFileSync(new URL("../../../Dockerfile", import.meta.url), "utf8");

describe("KOS ranking when it cannot load", () => {
  it("should not say there are no gifts while the ranking is loading", () => {
    assert.ok(page.includes("board.length === 0 && !boardLoading && !boardFailed"));
  });

  it("should offer Try again when the ranking failed to load", () => {
    assert.ok(page.includes("board.length === 0 && !boardLoading && boardFailed") && page.includes("onClick={() => refetchBoard()}"));
  });
});

describe("server memory", () => {
  it("should start the server with a heap cap so memory is freed early", () => {
    assert.ok(dockerfile.includes('CMD ["node", "--max-old-space-size=2560", "dist/index.js"]'));
  });
});
