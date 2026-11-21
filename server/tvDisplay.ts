// TV screens: each TV opens its own address (/tv/<token>) in a browser and this module feeds it — the songs waiting (with
// their tables), gift effects as they happen, and "something changed" nudges. The admin decides, per TV, what it shows
// and which tables it follows. Everything the public pages receive is first names, song titles and table labels only.
import type { Express, Request, Response } from "express";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { MAX_TV_SCREENS, cleanSetup, screenCovers, songLinesFor, type GiftEvent, type TvScreen, type TvSetup } from "./tvLogic";
import { TV_CODE_TTL_MS, TvPairings, isTvCode, type KaraokeLink } from "./tvPairing";

export interface TvDeps {
  requireAdmin(handler: (req: Request, res: Response) => Promise<unknown>): (req: Request, res: Response) => unknown;
  companyId(req: Request): Promise<number>;
  /** The company's name on the shared host ("" for the platform's own company), put in the TV's address so its page opens in the right company. */
  tenantSlug(req: Request): string;
  songBoard(companyId: number): Promise<{ nowPlaying?: Record<string, unknown> | null; queue?: Array<Record<string, unknown>> }>;
  readSetting(): Promise<string | null>;
  writeSetting(value: string): Promise<void>;
  /** Every gift this company sells (its name, picture, effect and price), cheapest first, for the TV test. */
  giftTypes(companyId: number): Promise<Array<{ name: string; emoji: string; imageUrl: string; animation: string; kgoldCost: number }>>;
  /** Told whenever anything changes in the app (a song queued, a song finished …). */
  onAppChange(listener: (resource: string) => void): void;
  /** The song system's address and key, handed to the box with the TV link so one code links both. */
  karaokeLink(req: Request): Promise<KaraokeLink>;
}

const MAX_PAGES_PER_TV = 20;
const HEARTBEAT_MS = 20_000;
const REFRESH_DELAY_MS = 250;
const RECENT_GIFTS_KEPT = 20;
const RECENT_GIFTS_SHOWN = 8;
const CHANGE_WORDS = /song|queue|karaoke|tv/i;
const MAX_TEST_GIFTS = 60;
const TEST_GAP_MS = 15_000; // a little longer than one gift stays on a TV
const TEST_SCENES =["rose", "fireworks", "rocket", "cake", "crown", "heart", "whale"];
const TEST_EMOJI: Record<string, string> = { rose: "🌹", fireworks: "🎆", rocket: "🚀", cake: "🎂", crown: "👑", heart: "❤️", whale: "🐋" };

let deps: TvDeps | null = null;
let testCounter = 0;
const pairings = new TvPairings(); // codes shown on TVs that are waiting to be linked
const pages = new Map<string, Set<Response>>(); // TV token → the pages open on that TV right now
const recentGifts = new Map<number, GiftEvent[]>(); // company → latest gifts (in memory: starts empty after a restart)

/** The admin typed the code a song-system box shows: the box receives the bridge's key and address (the code is used up once the box has read it). */
export function linkKaraokeBox(code: string, link: KaraokeLink): boolean {
  return isTvCode(code) && pairings.assign(code, { path: "", karaoke: link });
}

const WRONG_KEY_DELAY_MS = 1_000;
const BOX_SCREEN_NAME = "Karaoke box";

/** The TV screen a self-linking box follows: the first overlay screen that shows every table, or a new one made now. */
async function overlayScreen(): Promise<TvScreen> {
  const setup = await loadSetup();
  const existing = setup.screens.find((screen) => screen.view === "overlay" && screen.tables.length === 0);
  if (existing) return existing;
  const made: TvScreen = { id: makeId(), name: BOX_SCREEN_NAME, token: makeToken(), view: "overlay", tables: [] };
  const saved = cleanSetup({ screens: [...setup.screens, made] }, makeId, makeToken);
  await deps!.writeSetting(JSON.stringify(saved));
  return saved.screens.find((screen) => screen.token === made.token) ?? made;
}

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
    // One press plays the next of the company's real gifts; with `all` every gift is played one after another (cheapest first), so each gift and its price can be checked on the TV.
    const own = await injected.giftTypes(await injected.companyId(req));
    const makeTestGift = (pick: (typeof own)[number] | null, index: number): GiftEvent => {
      const scene = pick?.animation || TEST_SCENES[index % TEST_SCENES.length];
      return {
        id: `test-${Date.now()}-${index}`, giftName: pick?.name || scene, emoji: pick?.emoji || TEST_EMOJI[scene] || "🎁", imageUrl: pick?.imageUrl || "", animation: scene,
        fromName: "Alex", fromTable: "5", toName: "Sam", toTable: "9", kgold: pick?.kgoldCost ?? 0,
        topGifters: [{ name: "Alex", photo: "", sent: 900000 }, { name: "Mia", photo: "", sent: 450000 }, { name: "Ben", photo: "", sent: 120000 }],
      };
    };
    if (!showsGifts(screen)) return res.json({ shown: false, delivered: 0 });
    if (req.body?.all) {
      const list = own.slice(0, MAX_TEST_GIFTS);
      // A TV keeps only a few gifts waiting, so they are sent one at a time, as each one finishes.
      list.forEach((pick, index) => setTimeout(() => sendToTv(screen.token, "gift", makeTestGift(pick, index)), index * TEST_GAP_MS));
      return res.json({ shown: true, delivered: list.length ? 1 : 0, count: list.length });
    }
    const index = testCounter++;
    res.json({ shown: true, delivered: sendToTv(screen.token, "gift", makeTestGift(own.length ? own[index % own.length] : null, index)), count: 1 });
  }));

  // The admin types the code a TV shows next to one of the TV screens: the TV then opens that screen's page by itself.
  app.post("/api/reborn/admin/tv/pair", injected.requireAdmin(async (req, res) => {
    const code = String(req.body?.code ?? "").replace(/\s/g, "");
    if (!isTvCode(code)) return res.status(400).json({ message: "Enter the 6-digit code shown on the TV" });
    const screen = (await loadSetup()).screens.find((item) => item.id === String(req.body?.screenId ?? ""));
    if (!screen || !screen.token) return res.status(404).json({ message: "Save the TV screen first" });
    const slug = injected.tenantSlug(req);
    const linked = pairings.assign(code, { path: `/tv/${screen.token}${slug ? `?tenant=${encodeURIComponent(slug)}` : ""}`, karaoke: await injected.karaokeLink(req) });
    if (!linked) return res.status(404).json({ message: "That code is not on any TV (it may have expired: open the TV page again for a new one)" });
    res.json({ ok: true });
  }));

  // ---- a TV waiting to be linked (no login) ----

  app.post("/api/tv/pair", (_req, res) => {
    const code = pairings.create();
    if (!code) return res.status(429).json({ message: "Too many TVs are waiting, try again in a few minutes" });
    res.set("Cache-Control", "no-store").json({ code, expiresInSeconds: TV_CODE_TTL_MS / 1000 });
  });

  // A box whose app was built with the club's box key (BOX_SETUP_KEY on the server) links itself: no code to type. It gets the TV page (an overlay
  // screen is made if there is none) and the song system's address and key. Wrong or missing key = refused; the server has no key = switched off.
  app.post("/api/tv/enroll", async (req, res) => {
    const wanted = Buffer.from(process.env.BOX_SETUP_KEY || "");
    const given = Buffer.from(String(req.get("x-box-key") || ""));
    const isKnown = wanted.length > 0 && given.length === wanted.length && timingSafeEqual(wanted, given);
    if (!isKnown) {
      await new Promise((later) => setTimeout(later, WRONG_KEY_DELAY_MS)); // slows guessing
      return res.status(401).json({ message: "Bad box key" });
    }
    try {
      const screen = await overlayScreen();
      const slug = injected.tenantSlug(req);
      res.set("Cache-Control", "no-store").json({ path: `/tv/${screen.token}${slug ? `?tenant=${encodeURIComponent(slug)}` : ""}`, karaoke: await injected.karaokeLink(req) });
    } catch (error) {
      console.error("box enroll", error);
      res.status(500).json({ message: "Could not set the box up" });
    }
  });

  app.get("/api/tv/pair/:code", (req, res) => {
    const answer = isTvCode(req.params.code) ? pairings.poll(req.params.code) : { status: "expired" as const };
    res.set("Cache-Control", "no-store").json(answer.status === "linked" ? { status: "linked", path: answer.link.path, ...(answer.link.karaoke ? { karaoke: answer.link.karaoke } : {}) } : answer);
  });

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
