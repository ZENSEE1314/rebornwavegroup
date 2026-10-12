// "Ask the supplier when stock is low" (Admin › Inventory). When switched on, items the admin ticked that run low get a
// drafted WhatsApp message to their supplier. The draft only waits here: the admin reads it, edits it if needed and
// presses Send — nothing goes to a supplier without that tap.
import type { Express, Request, Response } from "express";
import { randomBytes } from "node:crypto";
import {
  MAX_REQUESTS_KEPT, cleanReorderSetup, cleanRequests, groupBySupplier, itemNeedsAsking, templateMessage,
  type ProductLite, type ReorderLang, type ReorderRequest, type ReorderSetup, type RequestItem,
} from "./supplierReorderLogic";

const SETUP_KEY = "supplierReorder";
const REQUESTS_KEY = "supplierReorderRequests";
const AI_MODEL = "claude-haiku-4-5-20251001";
const AI_TIMEOUT_MS = 15_000;
const AI_MAX_TOKENS = 400;
const MAX_MESSAGE_CHARS = 1500;
const LANGUAGE_NAMES: Record<ReorderLang, string> = { en: "English", zh: "Chinese", id: "Indonesian" };

export interface ReorderDeps {
  requireAdmin(handler: (req: Request, res: Response) => Promise<unknown>): (req: Request, res: Response) => unknown;
  readSetting(key: string): Promise<string | null>;
  writeSetting(key: string, value: string): Promise<void>;
  /** Every shop item with its supplier (a name and a phone number, either may be empty). */
  listProducts(): Promise<Array<ProductLite & { imageUrl: string | null }>>;
  clubName(): Promise<string>;
  sendWhatsApp(phone: string, text: string): Promise<boolean>;
  notifyAdmins(text: string): Promise<void>;
  logAdmin(req: Request, entry: { action: string; description: string }): Promise<void>;
}

const makeId = () => randomBytes(5).toString("hex");

async function readJson(deps: ReorderDeps, key: string): Promise<unknown> {
  try { return JSON.parse((await deps.readSetting(key)) || "null"); } catch { return null; }
}
const loadSetup = async (deps: ReorderDeps) => cleanReorderSetup(await readJson(deps, SETUP_KEY));
const loadRequests = async (deps: ReorderDeps) => cleanRequests(await readJson(deps, REQUESTS_KEY));
const saveRequests = (deps: ReorderDeps, requests: ReorderRequest[]) => deps.writeSetting(REQUESTS_KEY, JSON.stringify(requests.slice(0, MAX_REQUESTS_KEPT)));

/** The message: written by the AI when an AI key is set on the server, else the ready-made one. */
async function draftMessage(lang: ReorderLang, club: string, supplierName: string, items: RequestItem[]): Promise<string> {
  const fallback = templateMessage(lang, club, supplierName, items);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallback;
  const list = items.map((item) => `- ${item.name}: order ${item.qty} pcs (we have ${item.stock} left)`).join("\n");
  const prompt = `Write a short, polite WhatsApp message in ${LANGUAGE_NAMES[lang]} from "${club}" to its supplier "${supplierName || "the supplier"}" asking them to confirm availability and price for a restock order. No markdown. List exactly these items and quantities and nothing else:\n${list}\nEnd by asking them to confirm. Output only the message.`;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: AI_MODEL, max_tokens: AI_MAX_TOKENS, messages: [{ role: "user", content: prompt }] }),
    });
    const data: any = await response.json();
    const text = String(data?.content?.[0]?.text || "").trim();
    return text ? text.slice(0, MAX_MESSAGE_CHARS) : fallback;
  } catch { return fallback; }
}

let runCheck: (() => Promise<number>) | null = null;
/** Called by the timer for each company's data space; returns how many new requests were drafted. */
export const runSupplierReorderCheck = async (): Promise<number> => (runCheck ? runCheck() : 0);

export function registerSupplierReorder(app: Express, deps: ReorderDeps) {
  runCheck = async () => {
    const setup = await loadSetup(deps);
    if (!setup.enabled || !Object.keys(setup.items).length) return 0;
    const requests = await loadRequests(deps);
    const now = Date.now();
    const low = (await deps.listProducts()).filter((product) => itemNeedsAsking(product, setup, requests, now));
    if (!low.length) return 0;
    const club = await deps.clubName();
    const drafted: ReorderRequest[] = [];
    for (const group of groupBySupplier(low, setup)) {
      drafted.push({ id: makeId(), supplierName: group.supplierName, phone: group.phone, items: group.items, message: await draftMessage(setup.lang, club, group.supplierName, group.items), status: "pending", createdAt: new Date(now).toISOString() });
    }
    await saveRequests(deps, [...drafted, ...requests]);
    await deps.notifyAdmins(`📦 Low stock: ${low.length} item(s). A message to ${drafted.length === 1 ? "the supplier is" : `${drafted.length} suppliers is`} ready — open Admin › Inventory to read it and approve. / 库存不足，请在 管理 › 库存 查看并批准发送。 / Stok menipis, buka Admin › Inventori untuk menyetujui.`);
    return drafted.length;
  };

  app.get("/api/reborn/admin/reorder", deps.requireAdmin(async (_req, res) => {
    const [setup, requests, products] = await Promise.all([loadSetup(deps), loadRequests(deps), deps.listProducts()]);
    res.json({ setup, requests, hasAi: Boolean(process.env.ANTHROPIC_API_KEY), items: products.map((p) => ({ id: p.id, name: p.name, stock: p.stock, supplierName: p.supplierName, supplierPhone: p.supplierPhone, imageUrl: p.imageUrl })) });
  }));

  app.put("/api/reborn/admin/reorder/setup", deps.requireAdmin(async (req, res) => {
    const setup: ReorderSetup = cleanReorderSetup(req.body);
    await deps.writeSetting(SETUP_KEY, JSON.stringify(setup));
    await deps.logAdmin(req, { action: "reorder_setup", description: `Supplier reorder ${setup.enabled ? "ON" : "OFF"} for ${Object.keys(setup.items).length} item(s)` });
    res.json(setup);
  }));

  app.post("/api/reborn/admin/reorder/check", deps.requireAdmin(async (_req, res) => {
    res.json({ drafted: await runSupplierReorderCheck() });
  }));

  const decide = (action: "send" | "dismiss") => deps.requireAdmin(async (req, res) => {
    const requests = await loadRequests(deps);
    const request = requests.find((item) => item.id === req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "pending" && request.status !== "failed") return res.status(409).json({ message: "Already handled" });
    request.decidedAt = new Date().toISOString();
    if (action === "dismiss") request.status = "dismissed";
    else {
      const edited = String(req.body?.message || "").trim().slice(0, MAX_MESSAGE_CHARS);
      if (edited) request.message = edited;
      const sent = await deps.sendWhatsApp(request.phone, request.message).catch(() => false);
      request.status = sent ? "sent" : "failed";
      request.error = sent ? undefined : "WhatsApp could not send this message";
    }
    await saveRequests(deps, requests);
    await deps.logAdmin(req, { action: `reorder_${action}`, description: `Supplier message to ${request.supplierName || request.phone}: ${request.status}` });
    res.json(request);
  });
  app.post("/api/reborn/admin/reorder/:id/send", decide("send"));
  app.post("/api/reborn/admin/reorder/:id/dismiss", decide("dismiss"));
}
