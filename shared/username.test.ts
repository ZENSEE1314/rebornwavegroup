import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { emailAsUsername } from "./username";

describe("a new account's username", () => {
  it("should be the email in lower case", () => assert.equal(emailAsUsername("  Zen@Mail.com "), "zen@mail.com"));
  it("should be empty when there is no email", () => assert.equal(emailAsUsername(null), null));
  it("should be empty for text that is not an email", () => assert.equal(emailAsUsername("0812345"), null));
});
