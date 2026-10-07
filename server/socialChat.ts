// Facebook Messenger + Instagram DMs (Meta Messenger Platform) for the same chat bot as
// WhatsApp (server/whatsappBot.ts). A Messenger / Instagram chat is a CRM contact whose
// `phone` is "fb:<page-scoped id>" / "ig:<instagram-scoped id>" — the "chat key". Every
// send in the bot goes through sendWhatsApp / sendWhatsAppChoices / sendWhatsAppImage, which
// hand a chat key to sendSocial here, so the whole conversation (sign-up, booking, songs,
// FAQ, staff hand-off) works unchanged on all three.
//
// Each company connects its own Facebook Page (and the Instagram account linked to it):
// Page ID + Page access token in Admin › CRM, saved in its own app_settings. Meta calls the
// same webhook address as WhatsApp, with the same verify token.
import type { Express, Request, Response } from "express";
import { randomBytes } from "node:crypto";
import { eq, inArray, lt, and, like } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { appSettings, crmContacts } from "@shared/schema";
import { homeCompanySlug, currentTenant } from "./tenantContext";

const GRAPH = "https://graph.facebook.com/v20.0";
const META_KEYS = ["metaPageId", "metaPageToken"] as const;
const CONFIG_TTL_MS = 60_000;
const DAY_MS = 24 * 3600_000;
// Meta's limits per message: Messenger 2000 characters, Instagram 1000; quick-reply titles 20.
const MAX_TEXT: Record<SocialNet, number> = { fb: 2000, ig: 1000 };
const MAX_QUICK_TITLE = 20;
const MAX_QUICK_REPLIES = 13;
const LOGIN_LINK_TTL_MS = 30 * 60_000;
const LOGIN_PREFIX = "chatLogin:";

export type SocialNet = "fb" | "ig";
const SOCIAL_KEY_RE = /^(fb|ig):(\d{5,})$/;

// "fb:123…" → { net: "fb", id: "123…" }; a phone number → null.
export function socialOf(key: string | null | undefined): { net: SocialNet; id: string } | null {
  const m = SOCIAL_KEY_RE.exec(String(key || "").trim());
  return m ? { net: m[1] as SocialNet, id: m[2] } : null;
}
export function isSocialKey(key: string | null | undefined): boolean {
  return socialOf(key) !== null;
}
// The CRM key of a chat: a Messenger / Instagram key as it is, a phone number as digits only.
export function chatKey(raw: string | null | undefined): string {
  const s = socialOf(raw);
  return s ? `${s.net}:${s.id}` : String(raw || "").replace(/\D/g, "");
}
export function networkName(net: SocialNet): string {
  return net === "ig" ? "Instagram" : "Facebook";
}
// How staff see a chat: "+628…", "Facebook", "Instagram".
export function chatLabel(key: string): string {
  const s = socialOf(key);
  return s ? networkName(s.net) : `+${String(key).replace(/\D/g, "")}`;
}

// ── This company's Facebook Page settings ───────────────────────────────────
interface MetaConfig { pageId: string; token: string; at: number }
const configs = new Map<string, MetaConfig>();

export async function loadMetaConfig(force = false): Promise<MetaConfig> {
  const space = homeCompanySlug();
  const cached = configs.get(space);
  if (!force && cached && Date.now() - cached.at < CONFIG_TTL_MS) return cached;
  const rows = await db.select().from(appSettings).where(inArray(appSettings.key, [...META_KEYS]));
  const saved = (key: (typeof META_KEYS)[number]) => rows.find((row) => row.key === key)?.value?.trim() || "";
  const config: MetaConfig = { pageId: saved("metaPageId"), token: saved("metaPageToken"), at: Date.now() };
  configs.set(space, config);
  return config;
}
export async function metaReady(): Promise<boolean> {
  return Boolean((await loadMetaConfig()).token);
}

export async function getMetaSettings() {
  const c = await loadMetaConfig(true);
  return { pageId: c.pageId, tokenSet: Boolean(c.token) }; // the token itself is never sent back
}
export async function saveMetaSettings(input: { pageId?: string; token?: string }) {
  const values: Record<string, string> = { metaPageId: String(input.pageId ?? "").replace(/\D/g, "") };
  // An empty token field means "keep the one already saved".
  if (String(input.token ?? "").trim()) values.metaPageToken = String(input.token).trim();
  for (const [key, value] of Object.entries(values)) {
    await db.insert(appSettings).values({ key, value }).onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
  }
  await loadMetaConfig(true);
}
// Asks Meta which Page (and linked Instagram account) the token belongs to.
export async function testMeta(): Promise<{ ok: boolean; page?: string; instagram?: string; error?: string }> {
  const c = await loadMetaConfig(true);
  if (!c.token) return { ok: false, error: "missing" };
  try {
    const r = await fetch(`${GRAPH}/${c.pageId || "me"}?fields=name,instagram_business_account{username}`, {
      headers: { Authorization: `Bearer ${c.token}` }, signal: AbortSignal.timeout(15_000),
    });
    const body: any = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: body?.error?.message || `HTTP ${r.status}` };
    return { ok: true, page: body.name, instagram: body.instagram_business_account?.username };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || "network" };
  }
}

// ── Sending ────────────────────────────────────────────────────────────────
function recordSendError(key: string, message: string) {
  console.error(`[meta] ${key}: ${message}`);
  void import("./errorWatch").then((m) => m.recordError({ area: "whatsapp", source: "messenger", method: "SEND", path: key, status: 0, message: message.slice(0, 300) })).catch(() => {});
}

// WhatsApp's *bold* shows as plain asterisks on Messenger / Instagram.
function plain(text: string): string {
  return text.replace(/\*([^*\n]+)\*/g, "$1");
}
// Long replies are sent as several messages, split at line breaks where possible.
function chunks(text: string, max: number): string[] {
  const out: string[] = [];
  let rest = text;
  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n", max);
    if (cut < max / 2) cut = rest.lastIndexOf(" ", max);
    if (cut < max / 2) cut = max;
    out.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) out.push(rest);
  return out;
}

// Meta lets a page reply freely for 24 hours after the person's last message. After that a
// booking update goes out tagged as one (Messenger), and a staff reply as a human agent.
async function messagingType(key: string, net: SocialNet, human: boolean): Promise<Record<string, string>> {
  const [c] = await db.select({ at: crmContacts.lastInboundAt }).from(crmContacts).where(eq(crmContacts.phone, key)).limit(1);
  const inWindow = !!c?.at && Date.now() - new Date(c.at).getTime() < DAY_MS;
  if (inWindow) return { messaging_type: "RESPONSE" };
  if (human) return { messaging_type: "MESSAGE_TAG", tag: "HUMAN_AGENT" };
  if (net === "fb") return { messaging_type: "MESSAGE_TAG", tag: "CONFIRMED_EVENT_UPDATE" };
  return { messaging_type: "RESPONSE" }; // Instagram has no tag for this; Meta reports if it's too late
}

async function post(key: string, c: MetaConfig, payload: Record<string, unknown>): Promise<boolean> {
  try {
    const r = await fetch(`${GRAPH}/${c.pageId || "me"}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    });
    if (r.ok) return true;
    const body: any = await r.json().catch(() => ({}));
    recordSendError(key, `Not delivered: ${[body?.error?.code, body?.error?.message].filter(Boolean).join(" · ") || `HTTP ${r.status}`}`);
    return false;
  } catch (e) {
    recordSendError(key, `Send error: ${(e as Error)?.message || e}`);
    return false;
  }
}

export interface SocialSendOptions {
  quickReplies?: Array<{ id: string; title: string }>;
  image?: string;  // http(s) URL; data: URLs can't be sent to Meta, so only the caption goes
  human?: boolean; // a staff reply from Admin › CRM
}
export async function sendSocial(key: string, rawText: string, opts: SocialSendOptions = {}): Promise<boolean> {
  const who = socialOf(key);
  if (!who) return false;
  const c = await loadMetaConfig();
  if (!c.token) { console.log(`[meta] (not configured) would send to ${key}: ${rawText.slice(0, 80)}`); return false; }
  const base = { recipient: { id: who.id }, ...(await messagingType(key, who.net, !!opts.human)) };
  let ok = true;
  if (opts.image && /^https?:\/\//.test(opts.image)) {
    ok = await post(key, c, { ...base, message: { attachment: { type: "image", payload: { url: opts.image, is_reusable: true } } } });
  }
  const parts = chunks(plain(rawText), MAX_TEXT[who.net]);
  const quick = (opts.quickReplies || []).slice(0, MAX_QUICK_REPLIES).map((q) => ({ content_type: "text", title: q.title.slice(0, MAX_QUICK_TITLE), payload: q.id.slice(0, 1000) }));
  for (let i = 0; i < parts.length; i++) {
    const last = i === parts.length - 1;
    const message = { text: parts[i], ...(last && quick.length ? { quick_replies: quick } : {}) };
    ok = (await post(key, c, { ...base, message })) && ok;
  }
  return ok;
}

// The person's name from Meta (best effort — needs the Page's messaging permission).
export async function socialProfileName(key: string): Promise<string | undefined> {
  const who = socialOf(key);
  if (!who) return undefined;
  const c = await loadMetaConfig();
  if (!c.token) return undefined;
  try {
    const fields = who.net === "ig" ? "name,username" : "first_name,last_name";
    const r = await fetch(`${GRAPH}/${who.id}?fields=${fields}`, { headers: { Authorization: `Bearer ${c.token}` }, signal: AbortSignal.timeout(10_000) });
    if (!r.ok) return undefined;
    const p: any = await r.json();
    return (who.net === "ig" ? p.name || p.username : [p.first_name, p.last_name].filter(Boolean).join(" ")) || undefined;
  } catch { return undefined; }
}

// One Meta webhook call (object "page" = Messenger, "instagram" = Instagram DMs) → the
// messages in it, as { key, text, msgId }. Echoes of our own replies are left out.
export function socialMessagesIn(body: any): Array<{ key: string; text: string; msgId?: string }> {
  const net: SocialNet | null = body?.object === "page" ? "fb" : body?.object === "instagram" ? "ig" : null;
  if (!net) return [];
  const out: Array<{ key: string; text: string; msgId?: string }> = [];
  for (const entry of body.entry || []) {
    for (const ev of entry.messaging || []) {
      const sender = String(ev?.sender?.id || "");
      if (!sender || sender === String(entry.id) || ev?.message?.is_echo) continue;
      const text = String(ev?.message?.quick_reply?.payload || ev?.postback?.payload || ev?.message?.text || "").trim();
      if (!text) continue; // stickers, photos and reactions: nothing for the bot to read
      out.push({ key: `${net}:${sender}`, text, msgId: ev?.message?.mid || ev?.postback?.mid });
    }
  }
  return out;
}

// ── One-tap login link for accounts made from a Facebook / Instagram chat ──────
// Such an account has no phone number or email to log in with, so the chat sends a link that
// logs the member in once (30 minutes). Only accounts the chat itself created get links.
export const SOCIAL_AUTH_PROVIDERS = ["facebook", "instagram"];

export async function makeLoginLink(userId: string, appUrl: (path?: string) => string): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  const value = JSON.stringify({ userId, exp: Date.now() + LOGIN_LINK_TTL_MS });
  await db.insert(appSettings).values({ key: LOGIN_PREFIX + token, value, updatedAt: new Date() });
  // Drop old links now and then.
  await db.delete(appSettings).where(and(like(appSettings.key, `${LOGIN_PREFIX}%`), lt(appSettings.updatedAt, new Date(Date.now() - DAY_MS)))).catch(() => {});
  const tenant = currentTenant();
  const url = new URL(appUrl(`/api/chat-login/${token}`));
  if (tenant) url.searchParams.set("tenant", tenant.slug);
  return url.toString();
}

export function registerChatLogin(app: Express) {
  app.get("/api/chat-login/:token", async (req: Request, res: Response) => {
    // On the shared host a company is chosen by cookie: set it, then come back once.
    const wanted = String(req.query.tenant || "").toLowerCase();
    if (wanted && currentTenant()?.slug !== wanted) {
      if (req.query.again) return res.redirect("/login"); // that company doesn't exist here
      res.cookie("bx_tenant", wanted, { path: "/", maxAge: 365 * DAY_MS, sameSite: "lax" });
      return res.redirect(`${req.path}?tenant=${encodeURIComponent(wanted)}&again=1`);
    }
    // Back into the app on this same site (a company on the shared host keeps its ?tenant=).
    const appUrl = (path: string) => (wanted ? `${path}?tenant=${encodeURIComponent(wanted)}` : path);
    const key = LOGIN_PREFIX + String(req.params.token || "");
    const [row] = await db.delete(appSettings).where(eq(appSettings.key, key)).returning(); // single use
    let saved: { userId?: string; exp?: number } = {};
    try { saved = JSON.parse(row?.value || "{}"); } catch {}
    const user = saved.userId && Number(saved.exp) > Date.now() ? await storage.getUser(saved.userId) : null;
    if (!user || !SOCIAL_AUTH_PROVIDERS.includes(String(user.authProvider))) return res.redirect(appUrl("/login"));
    req.login(user as any, (err) => res.redirect(err ? appUrl("/login") : appUrl("/")));
  });
}
