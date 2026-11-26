import test from "node:test";
import assert from "node:assert/strict";
import { isNewRequest } from "./fix-request.mjs";

test("a first request is new", () => {
  assert.equal(isNewRequest("2026-11-26T10:00:00.000Z", undefined), true);
});

test("the request already handled is not new", () => {
  assert.equal(isNewRequest("2026-11-26T10:00:00.000Z", "2026-11-26T10:00:00.000Z"), false);
});

test("a later click is new", () => {
  assert.equal(isNewRequest("2026-11-26T11:00:00.000Z", "2026-11-26T10:00:00.000Z"), true);
});

test("no request or a broken time is not new", () => {
  assert.equal(isNewRequest(null, undefined), false);
  assert.equal(isNewRequest("not a time", undefined), false);
});
