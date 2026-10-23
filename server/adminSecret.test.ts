import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkSecret, hashSecret, isHashedSecret } from "./adminSecret";

describe("the main-admin password", () => {
  it("should be stored as a hash that is not the password", async () => {
    const hash = await hashSecret("correct horse");
    assert.equal(isHashedSecret(hash) && !hash.includes("correct"), true);
  });
  it("should accept the right password against a hash", async () => assert.equal((await checkSecret(await hashSecret("correct horse"), "correct horse")).ok, true));
  it("should refuse a wrong password against a hash", async () => assert.equal((await checkSecret(await hashSecret("correct horse"), "wrong horse")).ok, false));
  it("should accept the old readable password once and offer a hash to store", async () => {
    const result = await checkSecret("oldplain1234", "oldplain1234");
    assert.equal(result.ok && !!result.upgrade && isHashedSecret(result.upgrade), true);
  });
  it("should refuse a wrong password against the old readable form", async () => assert.equal((await checkSecret("oldplain1234", "nope")).ok, false));
  it("should refuse everything when no password is set", async () => assert.equal((await checkSecret("", "anything")).ok, false));
  it("should refuse an empty try", async () => assert.equal((await checkSecret(await hashSecret("x12345678"), "")).ok, false));
});
