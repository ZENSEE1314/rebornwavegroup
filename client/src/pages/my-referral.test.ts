import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("client/src/pages/my-referral.tsx", "utf8").replace(/\r\n/g, "\n");

describe("my referral page", () => {
  it("should list the people the member referred", () => assert.match(page, /\/api\/reborn\/my-referrals/));
  it("should show when a new referral starts earning", () => assert.match(page, /person\.startsAt/));
  it("should show the live commission percent instead of a fixed 10", () => assert.match(page, /referred\?\.percent/));
});
