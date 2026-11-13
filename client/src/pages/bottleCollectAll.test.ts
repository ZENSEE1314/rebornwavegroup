import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("collecting a kept bottle with several left", () => {
  it("should offer to take them all in the POS", () => {
    assert.ok(read("./reborn-pos.tsx").includes("collect.mutate({ id: b.id, quantity: b.quantity })"));
  });

  it("should offer to take them all in Admin › Bottles", () => {
    assert.ok(read("./reborn-admin.tsx").includes("collect.mutate({ id: b.id, quantity: b.quantity })"));
  });
});
