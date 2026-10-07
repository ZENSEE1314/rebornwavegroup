// "Connect with Meta" (Admin › CRM): the company's admin logs in to Facebook once and the app
// finds and saves everything itself — the Facebook Page (Messenger) with its Page token, the
// Instagram account linked to it, and the WhatsApp Business number — then subscribes them to
// our webhook. No copying tokens or IDs by hand.
//
// It uses the platform's own Meta app, set on the server:
//   META_APP_ID, META_APP_SECRET   the Meta app (developers.facebook.com › your app › Settings › Basic)
//   META_LOGIN_CONFIG_ID           optional: a "Facebook Login for Business" configuration; with it
//                                  the WhatsApp token never expires (embedded signup)
//   META_OAUTH_REDIRECT            optional: the login return address (default
//                                  <APP_BASE_URL>/api/meta/oauth/callback — add it to the app's
//                                  "Valid OAuth Redirect URIs")
// In the Meta app the platform sets one webhook address for Messenger, Instagram and WhatsApp:
// <APP_BASE_URL>/api/whatsapp/webhook with the platform's verify token. Every company's
// messages arrive there and are sent on to the right company (metaSpaceFor, socialChat.ts).
import type { Express, Request, Response } from "express";
import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { appSettings } from "@shared/schema";
import { currentTenant, runInTenant } from "./tenantContext";
import { listTenantSpaces } from "./tenantSpace";
import { loadMetaConfig, forgetMetaRoutes } from "./socialChat";
import { reloadWhatsAppConfig } from "./whatsappBot";

const GRAPH = "https://graph.facebook.com/v20.0";
const DIALOG = "https://www.facebook.com/v20.0/dialog/oauth";
const APP_ID = process.env.META_APP_ID || "";
const APP_SECRET = process.env.META_APP_SECRET || "";
const LOGIN_CONFIG_ID = process.env.META_LOGIN_CONFIG_ID || "";
const APP_BASE_URL = (process.env.APP_BASE_URL || "https://rebornwave.group").replace(/\/$/, "");
const REDIRECT_URI = process.env.META_OAUTH_REDIRECT || `${APP_BASE_URL}/api/meta/oauth/callback`;
const SCOPES = [
  "pages_show_list", "pages_messaging", "pages_manage_metadata", "pages_read_engagement",
  "instagram_basic", "instagram_manage_messages",
  "business_management", "whatsapp_business_management", "whatsapp_business_messaging",
];
const STATE_PREFIX = "metaOauth:";
const STATE_TTL_MS = 15 * 60_000;
const PENDING_KEY = "metaPending";
const PLATFORM_SLUG = "_"; // the platform's own company in the login "state"

export function metaOAuthAvailable(): boolean {
  return Boolean(APP_ID && APP_SECRET);
}

async function setSetting(key: string, value: string) {
  await db.insert(appSettings).values({ key, value, updatedAt: new Date() }).onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
}
async function getSetting(key: string): Promise<string> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key));
  return row?.value || "";
}

async function graph(path: string, token: string, init: RequestInit = {}): Promise<any> {
  const sep = path.includes("?") ? "&" : "?";
  const r = await fetch(`${GRAPH}${path}${sep}access_token=${encodeURIComponent(token)}`, { ...init, signal: AbortSignal.timeout(20_000) });
  const body: any = await r.json().catch(() => ({}));
  if (!r.ok || body?.error) throw new Error(body?.error?.message || `HTTP ${r.status}`);
  return body;
}

// ── 1. The admin taps "Connect with Facebook" ────────────────────────────────
// The login comes back to one fixed address (Meta only allows listed ones), so the
// "state" says which company started it; the rest is kept in that company's settings.
export async function metaConnectUrl(userId: string, returnTo: string): Promise<string> {
  const nonce = randomBytes(18).toString("base64url");
  await setSetting(STATE_PREFIX + nonce, JSON.stringify({ userId, returnTo, exp: Date.now() + STATE_TTL_MS }));
  const state = `${currentTenant()?.slug || PLATFORM_SLUG}.${nonce}`;
  const params = new URLSearchParams({ client_id: APP_ID, redirect_uri: REDIRECT_URI, state, response_type: "code" });
  if (LOGIN_CONFIG_ID) { params.set("config_id", LOGIN_CONFIG_ID); params.set("override_default_response_type", "true"); }
  else params.set("scope", SCOPES.join(","));
  return `${DIALOG}?${params}`;
}

// ── 2. What the login can reach ──────────────────────────────────────────────
interface FoundPage { id: string; name: string; token: string; igId?: string; igUsername?: string }
interface FoundNumber { id: string; wabaId: string; display: string; name: string }
interface Pending { token: string; expiresAt: number; pages: FoundPage[]; numbers: FoundNumber[]; at: number }

async function discover(token: string): Promise<Pending> {
  const pagesRes = await graph("/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=100", token).catch(() => ({ data: [] }));
  const pages: FoundPage[] = (pagesRes.data || []).map((p: any) => ({
    id: String(p.id), name: p.name || String(p.id), token: p.access_token,
    igId: p.instagram_business_account?.id ? String(p.instagram_business_account.id) : undefined,
    igUsername: p.instagram_business_account?.username,
  })).filter((p: FoundPage) => p.token);
  // WhatsApp Business accounts the login was allowed to manage, then their numbers.
  const debug = await graph(`/debug_token?input_token=${encodeURIComponent(token)}`, `${APP_ID}|${APP_SECRET}`).catch(() => ({ data: {} }));
  const wabaIds = new Set<string>();
  for (const g of debug.data?.granular_scopes || []) {
    if (String(g.scope).startsWith("whatsapp_business")) for (const id of g.target_ids || []) wabaIds.add(String(id));
  }
  const numbers: FoundNumber[] = [];
  for (const wabaId of Array.from(wabaIds)) {
    const res = await graph(`/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name`, token).catch(() => ({ data: [] }));
    for (const n of res.data || []) numbers.push({ id: String(n.id), wabaId, display: n.display_phone_number || String(n.id), name: n.verified_name || "" });
  }
  return { token, expiresAt: Number(debug.data?.expires_at || 0) * 1000, pages, numbers, at: Date.now() };
}

// ── 3. Save the chosen Page / number and point them at our webhook ───────────
async function applyChoice(p: Pending, pageId?: string, phoneId?: string): Promise<{ page?: string; instagram?: string; whatsapp?: string }> {
  const out: { page?: string; instagram?: string; whatsapp?: string } = {};
  const page = p.pages.find((x) => x.id === pageId);
  if (page) {
    await setSetting("metaPageId", page.id);
    await setSetting("metaPageToken", page.token);
    await setSetting("metaPageName", page.name);
    await setSetting("metaIgId", page.igId || "");
    await setSetting("metaIgUsername", page.igUsername || "");
    // Messenger + Instagram DMs of this Page come to our webhook.
    await graph(`/${page.id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks`, page.token, { method: "POST" })
      .catch((e) => console.warn(`[meta] subscribe page ${page.id}: ${e.message}`));
    out.page = page.name; out.instagram = page.igUsername;
    await loadMetaConfig(true);
  }
  const number = p.numbers.find((x) => x.id === phoneId);
  if (number) {
    await setSetting("waPhoneId", number.id);
    await setSetting("waToken", p.token);
    await setSetting("waWabaId", number.wabaId);
    await setSetting("waDisplayNumber", number.display);
    await setSetting("waTokenExpires", p.expiresAt ? String(p.expiresAt) : "");
    await graph(`/${number.wabaId}/subscribed_apps`, p.token, { method: "POST" })
      .catch((e) => console.warn(`[meta] subscribe WhatsApp ${number.wabaId}: ${e.message}`));
    out.whatsapp = number.display;
    await reloadWhatsAppConfig();
  }
  forgetMetaRoutes();
  return out;
}

// For Admin › CRM: what's connected, and a choice to make when the login found several.
export async function metaConnectStatus() {
  const keys = ["metaPageName", "metaIgUsername", "waDisplayNumber", "waTokenExpires", PENDING_KEY];
  const rows = await db.select().from(appSettings).where(inArray(appSettings.key, keys));
  const v = (k: string) => rows.find((r) => r.key === k)?.value || "";
  let pending: Pending | null = null;
  try { pending = v(PENDING_KEY) ? JSON.parse(v(PENDING_KEY)) : null; } catch {}
  return {
    oauth: metaOAuthAvailable(),
    pageName: v("metaPageName"), igUsername: v("metaIgUsername"), waNumber: v("waDisplayNumber"),
    waTokenExpires: Number(v("waTokenExpires")) || null,
    // Names only — the tokens stay on the server.
    pending: pending ? {
      pages: pending.pages.map((x) => ({ id: x.id, name: x.name, instagram: x.igUsername || "" })),
      numbers: pending.numbers.map((x) => ({ id: x.id, display: x.display, name: x.name })),
    } : null,
  };
}

export async function metaPick(pageId?: string, phoneId?: string) {
  let pending: Pending | null = null;
  try { pending = JSON.parse((await getSetting(PENDING_KEY)) || "null"); } catch {}
  if (!pending) return null;
  const saved = await applyChoice(pending, pageId, phoneId);
  await db.delete(appSettings).where(eq(appSettings.key, PENDING_KEY));
  return saved;
}

// ── The login comes back here (one address for every company) ────────────────
export function registerMetaConnect(app: Express) {
  app.get("/api/meta/oauth/callback", async (req: Request, res: Response) => {
    const [slug, nonce] = String(req.query.state || "").split(".");
    const space = slug && slug !== PLATFORM_SLUG ? (await listTenantSpaces()).find((s) => s.slug === slug) : null;
    if (slug !== PLATFORM_SLUG && !space) return res.status(400).send("Unknown company");
    const run = <T>(fn: () => Promise<T>) => (space ? runInTenant(space, fn) : fn());
    const back = (returnTo: string, result: string, why = "") =>
      res.redirect(`${returnTo || ""}/reborn-admin?tab=CRM&meta=${result}${why ? `&why=${encodeURIComponent(why.slice(0, 200))}` : ""}`);
    await run(async () => {
      const key = STATE_PREFIX + (nonce || "");
      const [row] = await db.delete(appSettings).where(eq(appSettings.key, key)).returning(); // single use
      let saved: { userId?: string; returnTo?: string; exp?: number } = {};
      try { saved = JSON.parse(row?.value || "{}"); } catch {}
      if (!saved.userId || Number(saved.exp) < Date.now()) return back(saved.returnTo || "", "error", "expired") // the client shows these codes in the admin's language;
      if (req.query.error || !req.query.code) return back(saved.returnTo!, "error", req.query.error === "access_denied" ? "cancelled" : String(req.query.error_description || req.query.error || "cancelled"));
      try {
        const q = new URLSearchParams({ client_id: APP_ID, client_secret: APP_SECRET, redirect_uri: REDIRECT_URI, code: String(req.query.code) });
        const short = await (await fetch(`${GRAPH}/oauth/access_token?${q}`, { signal: AbortSignal.timeout(20_000) })).json();
        if (!short?.access_token) throw new Error(short?.error?.message || "No token from Meta");
        // A long-lived token: Page tokens made from it never expire.
        const lq = new URLSearchParams({ grant_type: "fb_exchange_token", client_id: APP_ID, client_secret: APP_SECRET, fb_exchange_token: short.access_token });
        const long = await (await fetch(`${GRAPH}/oauth/access_token?${lq}`, { signal: AbortSignal.timeout(20_000) })).json().catch(() => ({}));
        const found = await discover(long?.access_token || short.access_token);
        if (!found.pages.length && !found.numbers.length) return back(saved.returnTo!, "error", "noAssets");
        // One of each (or none): save straight away. Several: the admin picks in Admin › CRM.
        if (found.pages.length <= 1 && found.numbers.length <= 1) {
          await applyChoice(found, found.pages[0]?.id, found.numbers[0]?.id);
          return back(saved.returnTo!, "ok");
        }
        await setSetting(PENDING_KEY, JSON.stringify(found));
        return back(saved.returnTo!, "pick");
      } catch (e) {
        console.error("[meta] connect", e);
        return back(saved.returnTo!, "error", (e as Error).message);
      }
    });
  });
}
