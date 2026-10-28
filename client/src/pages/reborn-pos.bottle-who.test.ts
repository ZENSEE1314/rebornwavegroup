import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const pos = read("./reborn-pos.tsx");
const admin = read("./reborn-admin.tsx");

describe("keeping a bottle for anyone", () => {
  it("should list matching members with their username in the POS Bottles tab", () => {
    assert.ok(pos.includes("m.username && `@${m.username}`"));
  });
  it("should list matching members with their username in Admin › Bottles", () => {
    assert.ok(admin.includes("m.username && `@${m.username}`, m.code || m.email"));
  });
  it("should let Admin › Bottles keep a bottle for a typed name with no member picked", () => {
    assert.ok(admin.includes('const canSave = (!!member || search.trim() !== "")') && admin.includes("guestName: member ? undefined : search.trim()"));
  });
});

describe("tagging a member on the POS", () => {
  it("should offer the member drop-down on a table bill's Tag member box", () => {
    assert.ok(pos.includes('onPick={(m) => tagMember.mutate(m.code || m.card || m.email || m.id)}'));
  });
  it("should offer the member drop-down on Quick sale's member box", () => {
    assert.ok(pos.includes('onPick={(m) => lookup.mutate(m.code || m.card || m.email || m.id)}'));
  });
});

describe("the admin editing a kept bottle", () => {
  it("should offer Edit on every kept bottle in Admin › Bottles", () => {
    assert.ok(admin.includes("<EditKeptBottle bottle={b} />"));
  });
});
