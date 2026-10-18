import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { TV_CODE_LENGTH, TV_CODE_TTL_MS, TvPairings, isTvCode } from "./tvPairing";

const counter = () => { let n = 0; return () => n++ % 10; };

describe("TvPairings", () => {
  it("should make a code of six digits", () => {
    assert.match(new TvPairings().create()!, new RegExp(`^[0-9]{${TV_CODE_LENGTH}}$`));
  });
  it("should keep a TV waiting until the admin links it", () => {
    const pairings = new TvPairings();
    const code = pairings.create()!;
    assert.deepEqual(pairings.poll(code), { status: "waiting" });
  });
  it("should hand the linked page to the waiting TV", () => {
    const pairings = new TvPairings();
    const code = pairings.create()!;
    pairings.assign(code, { path: "/tv/abc" });
    assert.deepEqual(pairings.poll(code), { status: "linked", link: { path: "/tv/abc" } });
  });
  it("should use a code up once it has been handed over", () => {
    const pairings = new TvPairings();
    const code = pairings.create()!;
    pairings.assign(code, { path: "/tv/abc" });
    pairings.poll(code);
    assert.deepEqual(pairings.poll(code), { status: "expired" });
  });
  it("should refuse to link a code that does not exist", () => {
    assert.equal(new TvPairings().assign("123456", { path: "/tv/x" }), false);
  });
  it("should refuse to link a code twice", () => {
    const pairings = new TvPairings();
    const code = pairings.create()!;
    pairings.assign(code, { path: "/tv/a" });
    assert.equal(pairings.assign(code, { path: "/tv/b" }), false);
  });
  it("should forget a code after it expires", () => {
    const pairings = new TvPairings();
    const code = pairings.create(1000)!;
    assert.deepEqual(pairings.poll(code, 1000 + TV_CODE_TTL_MS + 1), { status: "expired" });
  });
  it("should not give the same code to two TVs", () => {
    const pairings = new TvPairings(counter());
    const first = pairings.create()!;
    const second = pairings.create()!;
    assert.notEqual(first, second);
  });
  it("should know what a code looks like", () => {
    assert.equal(isTvCode("123456"), true);
    assert.equal(isTvCode("12345"), false);
    assert.equal(isTvCode("12a456"), false);
    assert.equal(isTvCode(123456), false);
  });
});
