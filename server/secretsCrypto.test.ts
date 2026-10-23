import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decryptValue, encryptValue, lockWord } from "./secretsCrypto";

const WORD = "a-long-enough-lock-word-123";

describe("saved keys encryption", () => {
  it("should give back the same text after locking and unlocking", () => assert.equal(decryptValue(encryptValue("sk-ant-abc 中文", WORD), WORD), "sk-ant-abc 中文"));
  it("should not contain the plain text in what is stored", () => assert.ok(!encryptValue("sk-ant-secret", WORD).includes("sk-ant-secret")));
  it("should lock the same text differently every time", () => assert.notEqual(encryptValue("x", WORD), encryptValue("x", WORD)));
  it("should not open with another lock word", () => assert.equal(decryptValue(encryptValue("x", WORD), "another-lock-word-4567890"), null));
  it("should not open a changed value", () => {
    const stored = encryptValue("hello", WORD);
    const flipped = stored.slice(0, -3) + (stored.endsWith("AAA") ? "BBB" : "AAA");
    assert.equal(decryptValue(flipped, WORD), null);
  });
  it("should not open text that was never locked", () => assert.equal(decryptValue("plain", WORD), null));
  it("should refuse to lock when no lock word is set", () => assert.throws(() => encryptValue("x", "")));
});

describe("lockWord", () => {
  it("should prefer SECRETS_KEY over SESSION_SECRET", () => assert.equal(lockWord({ SECRETS_KEY: "k".repeat(20), SESSION_SECRET: "s".repeat(20) }), "k".repeat(20)));
  it("should use SESSION_SECRET when SECRETS_KEY is missing", () => assert.equal(lockWord({ SESSION_SECRET: "s".repeat(20) }), "s".repeat(20)));
  it("should ignore a word under 16 characters", () => assert.equal(lockWord({ SESSION_SECRET: "short" }), ""));
});
