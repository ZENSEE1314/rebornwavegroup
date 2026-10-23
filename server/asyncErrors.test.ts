import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express, { type NextFunction, type Request, type Response } from "express";
import "./asyncErrors";

const app = express();
app.get("/async-fail", async () => { throw new Error("database went away"); });
app.get("/async-ok", async (_req: Request, res: Response) => { res.json({ ok: true }); });
app.get("/sync-fail", () => { throw new Error("plain failure"); });
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => { if (!res.headersSent) res.status(500).json({ message: err.message }); });
const server = app.listen(0);
const base = () => `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const ANSWER_WITHIN_MS = 3000;

describe("async route errors", () => {
  after(() => { server.close(); });
  it("should answer 500 when an async handler rejects, instead of hanging", async () => {
    const res = await fetch(`${base()}/async-fail`, { signal: AbortSignal.timeout(ANSWER_WITHIN_MS) });
    assert.equal(res.status, 500);
  });
  it("should give the error's message to the error handler", async () => {
    const res = await fetch(`${base()}/async-fail`, { signal: AbortSignal.timeout(ANSWER_WITHIN_MS) });
    assert.equal((await res.json()).message, "database went away");
  });
  it("should leave a working async handler alone", async () => {
    const res = await fetch(`${base()}/async-ok`, { signal: AbortSignal.timeout(ANSWER_WITHIN_MS) });
    assert.deepEqual(await res.json(), { ok: true });
  });
  it("should still answer 500 for a plain thrown error", async () => {
    const res = await fetch(`${base()}/sync-fail`, { signal: AbortSignal.timeout(ANSWER_WITHIN_MS) });
    assert.equal(res.status, 500);
  });
});
