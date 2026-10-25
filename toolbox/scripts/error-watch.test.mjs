// Tests for the error watch's sorting. Run: node --test toolbox/scripts/error-watch.test.mjs
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { briefText, classify, groupErrors, shortMessage } from "./error-watch.mjs";

const row = (over) => ({ id: 1, area: "pos", source: "client", status: 0, method: "POST", path: "/api/reborn/pos/quote", message: "Failed to fetch", detail: "{}", created_at: new Date(), ...over });

describe("classify", () => {
  it("should treat a browser that could not reach the server as noise", () => assert.equal(classify(row({})).category, "noise"));
  it("should treat a staff-only refusal as noise", () => assert.equal(classify(row({ status: 403, message: "Staff only", path: "/api/reborn/pos/orders" })).category, "noise"));
  it("should treat an Indonesian staff-only refusal as noise", () => assert.equal(classify(row({ status: 403, message: "Khusus staf" })).category, "noise"));
  it("should treat order not open as a stale screen", () => assert.equal(classify(row({ status: 400, message: "Order not open" })).category, "noise"));
  it("should treat a table-scan reply as noise", () => assert.equal(classify(row({ area: "song", status: 400, message: "Song requests go by table. Scan the QR code on your table first" })).category, "noise"));
  it("should not call a server-side failure with a network-like message a network drop", () => assert.equal(classify(row({ source: "server", area: "server", status: 0, message: "Failed to fetch" })).category, "actionable"));
  it("should call a 500 actionable", () => assert.equal(classify(row({ source: "app", status: 500, message: "Cannot read properties of undefined" })).category, "actionable"));
  it("should call a server crash with no status actionable", () => assert.equal(classify(row({ source: "server", status: 0, area: "server", message: "TypeError: x is not a function" })).category, "actionable"));
  it("should call one connection blip infra, not actionable", () => assert.equal(classify(row({ source: "server", area: "server", status: 0, message: "Connection terminated unexpectedly" }), 1).category, "infra"));
  it("should call a repeated connection error actionable", () => assert.equal(classify(row({ source: "server", area: "server", status: 0, message: "Connection terminated unexpectedly" }), 6).category, "actionable"));
  it("should call one refusal a watch item", () => assert.equal(classify(row({ status: 400, message: "Invalid price" }), 2).category, "watch"));
  it("should call the same refusal ten times actionable", () => assert.equal(classify(row({ status: 400, message: "Invalid price" }), 10).category, "actionable"));
  it("should call a few undelivered WhatsApp messages external", () => assert.equal(classify(row({ area: "whatsapp", source: "server", status: 0, message: "Reply not sent: Hi" }), 3).category, "external"));
  it("should call many undelivered WhatsApp messages actionable", () => assert.equal(classify(row({ area: "whatsapp", source: "server", status: 0, message: "Reply not sent: Hi" }), 12).category, "actionable"));
});

describe("groupErrors", () => {
  it("should merge rows that differ only by a number in the path", () => {
    const groups = groupErrors([row({ id: 1, status: 500, message: "boom", path: "/api/reborn/pos/orders/12/pay" }), row({ id: 2, status: 500, message: "boom", path: "/api/reborn/pos/orders/99/pay" })]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].count, 2);
  });
  it("should put the most frequent group first", () => {
    const groups = groupErrors([row({ id: 1, message: "a" }), row({ id: 2, message: "b" }), row({ id: 3, message: "b" })]);
    assert.equal(groups[0].message, "b");
  });
});

describe("briefText", () => {
  it("should list an actionable group under Needs a fix", () => {
    const text = briefText(groupErrors([row({ status: 500, message: "boom", path: "/api/reborn/x" })]), "test");
    assert.match(text.split("## Watch")[0], /boom/);
  });
  it("should not list noise", () => {
    const text = briefText(groupErrors([row({})]), "test");
    assert.ok(!text.split("## Noise")[0].includes("Failed to fetch"));
  });
  it("should tell the reader not to push", () => assert.match(briefText([], "test"), /Do NOT push/));
});

describe("WhatsApp errors", () => {
  const meta401 = (text) => row({ area: "whatsapp", source: "whatsapp", status: 0, method: "SEND", path: "628123", message: `Reply not sent: ${text} — Meta 401: {"error":{"message":"Invalid OAuth access token - Cannot parse access token","type":"OAuthException","code":190}}` });
  it("should call an invalid access token an owner action", () => assert.equal(classify(meta401("Hai")).category, "owner"));
  it("should group different message texts under the same provider error", () => {
    const groups = groupErrors([meta401("Hai A"), meta401("Thanks B"), meta401("Come back C")]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].count, 3);
  });
  it("should shorten a WhatsApp row to the provider's answer", () => assert.match(shortMessage(meta401("Hai")), /^WhatsApp not delivered: Meta 401 Invalid OAuth access token/));
  it("should list an owner action under Needs the owner", () => {
    const text = briefText(groupErrors([meta401("Hai")]), "test");
    assert.match(text.split("## Needs a fix")[0], /Invalid OAuth/);
  });
});
