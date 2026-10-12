// TV screens: each TV opens its own address (/tv/<token>) in a browser and this module feeds it — the songs waiting (with
// their tables), gift effects as they happen, and "something changed" nudges. The admin decides, per TV, what it shows
// and which tables it follows. Everything the public pages receive is first names, song titles and table labels only.
import type { Express, Request, Response } from "express";
import { randomBytes } from "node:crypto";
import { MAX_TV_SCREENS, cleanSetup, screenCovers, songLinesFor, type GiftEvent, type TvScreen, type TvSetup } from "./tvLogic";

export interface TvDeps {
  requireAdmin(handler: (req: Request, res: Response) => Promise<unknown>): (req: Request, res: Response) => unknown;
  companyId(req: Request): Promise<number>;
  songBoard(companyId: number): Promise<{ nowPlaying?: Record<string, unknown> | null; queue?: Array<Record<string, unknown>> }>;
  readSetting(): Promise<string | null>;
  writeSetting(value: string): Promise<void>;
  /** Every gift this company sells (its name, picture, effect and price), cheapest first, for the TV test. */
  giftTypes(companyId: number): Promise<Array<{ name: string; emoji: string; imageUrl: string; animation: string; kgoldCost: number }>>;
  /** Told whenever anything changes in the app (a song queued, a song finished …). */
  onAppChange(listener: (resource: string) => void): void;
}

const MAX_PAGES_PER_TV = 20;
const HEARTBEAT_MS = 20_000;
const REFRESH_DELAY_MS = 250;
const RECENT_GIFTS_KEPT = 20;
const RECENT_GIFTS_SHOWN = 8;
const CHANGE_WORDS = /song|queue|karaoke|tv/i;
const TEST_SCENES = ["rose", "fireworks", "rocket", "cake", "crown", "heart", "whale"];
const TEST_EMOJI: Record<string, string> = { rose: "🌹", fireworks: "🎆", rocket: "🚀", cake: "🎂", crown: "👑", heart: "❤️", whale: "🐋" };

let deps: TvDeps | null = null;
let testCounter = 0;
const pages = new Map<string, Set<Response>>(); // TV token → the pages open on that TV right now
const recentGifts = new Map<number, GiftEvent[]>(); // company → latest gifts (in memory: starts empty after a restart)

const makeId = () => randomBytes(4).toString("hex");
const makeToken = () => randomBytes(12).toString("hex");

async function loadSetup(): Promise<TvSetup> {
  const raw = await deps!.readSetting();
  let stored: unknown = null;
  try { stored = raw ? JSON.parse(raw) : null; } catch { /* unreadable value: start from an empty setup */ }
  return cleanSetup(stored, makeId, makeToken);
}

async function screenFor(token: string): Promise<TvScreen | undefined> {
  return (await loadSetup()).screens.find((screen) => screen.token === token);
}

function write(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  (res as unknown as { flush?: () => void }).flush?.();
}

function sendToTv(token: string, event: string, data: unknown): number {
  const open = pages.get(token);
  if (!open) return 0;
  let delivered = 0;
  Array.from(open).forEach((res) => {
    try { write(res, event, data); delivered++; } catch { open.delete(res); }
  });
  return delivered;
}

function sendToAll(event: string, data: unknown = {}) {
  pages.forEach((_open, token) => sendToTv(token, event, data));
}

const showsGifts = (screen: TvScreen) => screen.view === "overlay" || screen.view === "gifts";

/** A gift was sent in KOS: every TV that shows gifts and follows the sender's or receiver's table plays the effect. */
export async function publishTvGift(companyId: number, gift: GiftEvent): Promise<void> {
  if (!deps) return;
  recentGifts.set(companyId, [gift, ...(recentGifts.get(companyId) ?? [])].slice(0, RECENT_GIFTS_KEPT));
  const { screens } = await loadSetup();
  for (const screen of screens) {
    if (showsGifts(screen) && screenCovers(screen, [gift.fromTable, gift.toTable])) sendToTv(screen.token, "gift", gift);
  }
}

const withOnline = (screen: TvScreen) => ({ ...screen, online: pages.get(screen.token)?.size ?? 0 });

export function registerTvRoutes(app: Express, injected: TvDeps) {
  deps = injected;

  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  injected.onAppChange((resource) => {
    if (!CHANGE_WORDS.test(resource) || refreshTimer) return;
    refreshTimer = setTimeout(() => { refreshTimer = null; sendToAll("refresh"); }, REFRESH_DELAY_MS); // one nudge for a burst of changes
  });

  // ---- admin ----

  app.get("/api/reborn/admin/tv", injected.requireAdmin(async (_req, res) => {
    res.json({ screens: (await loadSetup()).screens.map(withOnline), max: MAX_TV_SCREENS });
  }));

  app.put("/api/reborn/admin/tv", injected.requireAdmin(async (req, res) => {
    const setup = cleanSetup(req.body, makeId, makeToken);
    await injected.writeSetting(JSON.stringify(setup));
    sendToAll("refresh");
    res.json({ screens: setup.screens.map(withOnline), max: MAX_TV_SCREENS });
  }));

  // Plays a sample gift on one TV so the admin can see how it looks there.
  app.post("/api/reborn/admin/tv/test-gift", injected.requireAdmin(async (req, res) => {
    const screen = await screenFor(String(req.body?.token || ""));
    if (!screen) return res.status(404).json({ message: "Unknown TV" });
    // Each press plays the next of the company's real gifts, so every gift (and its price) can be checked on the TV.
    const own = await injected.giftTypes(await injected.companyId(req));
    const pick = own.length ? own[testCounter++ % own.length] : null;
    const scene = pick?.animation || TEST_SCENES[testCounter++ % TEST_SCENES.length];
    const gift: GiftEvent = {
      id: `test-${Date.now()}`, giftName: pick?.name || scene, emoji: pick?.emoji || TEST_EMOJI[scene] || "🎁", imageUrl: pick?.imageUrl || "", animation: scene,
      fromName: "Alex", fromTable: "5", toName: "Sam", toTable: "9", kgold: pick?.kgoldCost ?? 0,
      topGifters: [{ name: "Alex", photo: "", sent: 900000 }, { name: "Mia", photo: "", sent: 450000 }, { name: "Ben", photo: "", sent: 120000 }],
    };
    res.json({ shown: showsGifts(screen), delivered: showsGifts(screen) ? sendToTv(screen.token, "gift", gift) : 0 });
  }));

  // ---- the TV pages (no login: the secret address is the key) ----

  app.get("/api/tv/:token/state", async (req, res) => {
    try {
      const screen = await screenFor(req.params.token);
      if (!screen) return res.status(404).json({ message: "Unknown TV" });
      const companyId = await injected.companyId(req);
      const lines = songLinesFor(await injected.songBoard(companyId), screen);
      const gifts = (recentGifts.get(companyId) ?? []).filter((gift) => screenCovers(screen, [gift.fromTable, gift.toTable])).slice(0, RECENT_GIFTS_SHOWN);
      res.set("Cache-Control", "no-store").json({ name: screen.name, view: screen.view, tables: screen.tables, ...lines, gifts });
    } catch (error) {
      console.error("tv state", error);
      res.status(500).json({ message: "TV data is not available" });
    }
  });

  app.get("/api/tv/:token/stream", async (req, res) => {
    try {
      const screen = await screenFor(req.params.token);
      if (!screen) return res.status(404).json({ message: "Unknown TV" });
      const open = pages.get(screen.token) ?? new Set<Response>();
      if (open.size >= MAX_PAGES_PER_TV) return res.status(429).json({ message: "Too many pages are open on this TV" });
      res.status(200);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();
      write(res, "ready", { at: Date.now() });
      open.add(res);
      pages.set(screen.token, open);
      const heartbeat = setInterval(() => {
        try { res.write(": keepalive\n\n"); (res as unknown as { flush?: () => void }).flush?.(); } catch { clearInterval(heartbeat); open.delete(res); }
      }, HEARTBEAT_MS);
      req.on("close", () => { clearInterval(heartbeat); open.delete(res); });
    } catch (error) {
      console.error("tv stream", error);
      if (!res.headersSent) res.status(500).json({ message: "TV data is not available" });
    }
  });
}
