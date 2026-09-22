import assert from "node:assert/strict";
import test from "node:test";

import { generateLayaSupportReply } from "./layaAgent";

test("uses a persistent Laya conversation and sends grounded support context", async () => {
  process.env.LAYA_BASE_URL = "http://127.0.0.1:8420";
  process.env.LAYA_SUPPORT_ENABLED = "true";
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; body?: any }> = [];

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    requests.push({ url, body });
    if (url.includes("/chat/conversations?")) return Response.json([]);
    if (url.endsWith("/chat/conversations")) {
      return Response.json({ conversation_id: "conv_rwg_901", title: "RWG Support #901" });
    }
    return Response.json({ message: { content: "Welcome to RWG!" } });
  };

  try {
    const first = await generateLayaSupportReply({
      ticketId: 901,
      message: "What memberships do you offer?",
      category: "membership",
      faqContext: "Q: Is membership available?\nA: Yes.",
    });
    const second = await generateLayaSupportReply({
      ticketId: 901,
      message: "How much is Standard VIP?",
      category: "membership",
    });

    assert.equal(first, "Welcome to RWG!");
    assert.equal(second, "Welcome to RWG!");
    assert.equal(requests.filter((request) => request.url.endsWith("/chat/conversations")).length, 1);
    const chatRequests = requests.filter((request) => request.url.endsWith("/chat"));
    assert.equal(chatRequests.length, 2);
    assert.equal(chatRequests[0].body.conversation_id, "conv_rwg_901");
    assert.match(chatRequests[0].body.card_context, /Approved RWG FAQ knowledge/);
    assert.match(chatRequests[0].body.card_context, /Do not use tools/);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.LAYA_BASE_URL;
    delete process.env.LAYA_SUPPORT_ENABLED;
  }
});

test("returns null when Laya is unavailable so the caller can use FAQ fallback", async () => {
  process.env.LAYA_BASE_URL = "http://127.0.0.1:8420";
  process.env.LAYA_SUPPORT_ENABLED = "true";
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  console.error = () => {};

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/chat/conversations?")) return Response.json([]);
    if (url.endsWith("/chat/conversations")) {
      return Response.json({ conversation_id: "conv_rwg_902", title: "RWG Support #902" });
    }
    return new Response("unavailable", { status: 503 });
  };

  try {
    const reply = await generateLayaSupportReply({ ticketId: 902, message: "Hello" });
    assert.equal(reply, null);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
    delete process.env.LAYA_BASE_URL;
    delete process.env.LAYA_SUPPORT_ENABLED;
  }
});
