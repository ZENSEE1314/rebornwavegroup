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

describe("admin kept bottle row layout", () => {
  it("should put the Redeem buttons on their own full-width row so the bottle name is not squeezed", () => {
    const admin = readFileSync(new URL("./reborn-admin.tsx", import.meta.url), "utf8");
    assert.ok(admin.includes('<div className="flex w-full flex-wrap items-center gap-2">') && admin.includes('className="min-w-[10rem] flex-1"'));
  });
});
