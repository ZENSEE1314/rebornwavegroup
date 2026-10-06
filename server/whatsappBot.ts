// WhatsApp automation: Meta Cloud API webhook + CRM conversation bot + reminders.
//
// Activates when these env vars are set (Meta WhatsApp Business Cloud API):
//   WHATSAPP_TOKEN         permanent access token
//   WHATSAPP_PHONE_ID      phone number id (the "from" number)
//   WHATSAPP_VERIFY_TOKEN  any secret string, also entered in the Meta webhook config
// Optional:
//   WA_ADMIN_NUMBER        company number to notify of new leads / handoffs (digits only)
//   APP_BASE_URL           member app base url (default https://rebornwave.group)
//
// Without those vars the module still loads; sends are no-ops (logged) so the rest
// of the app runs unchanged and the wa.me button on the homepage still works.
import type { Express, Request, Response } from "express";
import { and, desc, eq, gte, inArray, isNotNull, lte, gt, ilike, ne, sql } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { crmContacts, crmMessages, bottleKeeps, users, appSettings, songRequests, songs, appointments, faqItems, memberPackages, memberPackageUses } from "@shared/schema";
import { sendRebornStaffNotification, sendRebornUserNotification } from "./bridgeX";
import { emitLiveUpdate } from "./liveUpdates";
import { createBooking, bookingHoursSummary, todayStr, parseAreas, enabledAreas, areaSlotsForDate, areaSlotLabelsForDate, areaHoursTextForDate, areaOpenHourForDate, isTableTaken, bookingWhen, tableCap, availableSlotsForDate, freeTablesForDateSlot, isDateFullyBooked, areasWithSpace, getBookingTimezone, tableDayLockOn, areaNameIn, areaLevelIn, BOOKING_OCCASIONS, specialRequestText, mentionsBirthday, hasPaxLimit, type BookingArea } from "./booking";
import { searchSongCatalog, textPinyin, type SongSuggestion } from "./songSearch";
import { sendPushToUser, sendPushToAdmins } from "./push";
import { defaultCompanyId } from "./tenant";
import { currentTenant, homeCompanySlug, runInTenant } from "./tenantContext";
import { inEveryDataSpace, listTenantSpaces } from "./tenantSpace";
import { bridgeBranches, bridgeCompanies } from "@shared/schema";
import { randomUUID } from "node:crypto";
import { localeOf, asLang, faqIn, pick } from "./i18n";
import { parseDateInput, yesNo, weekdayInWeek, weekdayOfIso } from "./dateParse";

const GRAPH_VERSION = "v20.0";
const APP_BASE_URL = process.env.APP_BASE_URL || "https://rebornwave.group";
const DEFAULT_PASSWORD = "123456";
const WEBSITE_ADDRESS = "Ruko Oceanic Bliss, Jl. Pasir Putih Harbourfront – Batam Centre, Blok A No. 51, Sadai, Bengkong, Batam City, Riau Islands 29444";
const HOUR_MS = 3600_000;
const DAY_MS = 24 * HOUR_MS;

// Where another company's members open their app when it has no domain of its own.
const TENANT_APP_BASE_URL = (process.env.TENANT_APP_BASE_URL || "https://bridgexpos.up.railway.app").replace(/\/$/, "");
const WA_CONFIG_TTL_MS = 60_000;
const WA_SETTING_KEYS = ["waToken", "waPhoneId", "waVerifyToken", "waAdminNumber", "clubName"] as const;

// Each company has its own WhatsApp Business number (Meta Cloud API), saved in its own
// settings: phone number ID + access token + the verify token of its webhook. The platform
// company can also keep using the server's env vars or a QR-linked number.
interface WaConfig { token: string; phoneId: string; verifyToken: string; adminNumber: string; club: string; appUrl: string; at: number }
const waConfigs = new Map<string, WaConfig>();

function envWaConfig() {
  if (currentTenant()) return { token: "", phoneId: "", verifyToken: "", adminNumber: "" };
  return {
    token: process.env.WHATSAPP_TOKEN || "",
    phoneId: process.env.WHATSAPP_PHONE_ID || "",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "",
    adminNumber: (process.env.WA_ADMIN_NUMBER || "").replace(/\D/g, ""),
  };
}

// Loads (and briefly caches) this company's WhatsApp settings, club name and app address.
async function loadWaConfig(force = false): Promise<WaConfig> {
  const space = homeCompanySlug();
  const cached = waConfigs.get(space);
  if (!force && cached && Date.now() - cached.at < WA_CONFIG_TTL_MS) return cached;
  const rows = await db.select().from(appSettings).where(inArray(appSettings.key, [...WA_SETTING_KEYS]));
  const saved = (key: (typeof WA_SETTING_KEYS)[number]) => rows.find((row) => row.key === key)?.value?.trim() || "";
  const env = envWaConfig();
  const [company] = await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.slug, space)).limit(1);
  const tenant = currentTenant();
  const appUrl = !tenant ? APP_BASE_URL.replace(/\/$/, "")
    : company?.websiteDomain ? `https://${company.websiteDomain}` : TENANT_APP_BASE_URL;
  const config: WaConfig = {
    token: saved("waToken") || env.token,
    phoneId: saved("waPhoneId") || env.phoneId,
    verifyToken: saved("waVerifyToken") || env.verifyToken,
    adminNumber: saved("waAdminNumber").replace(/\D/g, "") || env.adminNumber,
    club: saved("clubName") || company?.appName || company?.name || "",
    appUrl,
    at: Date.now(),
  };
  waConfigs.set(space, config);
  return config;
}

function cfg() {
  return waConfigs.get(homeCompanySlug()) ?? { ...envWaConfig(), club: "", appUrl: APP_BASE_URL.replace(/\/$/, "") };
}
export function whatsappConfigured(): boolean {
  const c = cfg();
  return Boolean(c.token && c.phoneId);
}

// Link into the member app for the current company. Without its own domain, a company's
// members use the shared host and the link says which business it is.
function memberAppUrl(path = ""): string {
  const tenant = currentTenant();
  const base = cfg().appUrl;
  if (!tenant || base !== TENANT_APP_BASE_URL) return `${base}${path}`;
  return `${base}${path || "/login"}?tenant=${tenant.slug}`;
}

// The message texts were written for Reborn; another company's bot speaks under its own name.
function inCompanyVoice(text: string): string {
  const club = currentTenant() ? cfg().club : "";
  return club ? text.replaceAll("Reborn Wave Group", club).replaceAll("Reborn Wave", club) : text;
}

// ── Admin: WhatsApp Business (Meta Cloud API) settings ──────────────────────
export async function getWhatsAppCloudSettings(origin: string) {
  const c = await loadWaConfig(true);
  let verifyToken = c.verifyToken;
  if (!verifyToken) {
    verifyToken = randomUUID().replace(/-/g, "");
    await db.insert(appSettings).values({ key: "waVerifyToken", value: verifyToken }).onConflictDoUpdate({ target: appSettings.key, set: { value: verifyToken, updatedAt: new Date() } });
    await loadWaConfig(true);
  }
  const tenant = currentTenant();
  return {
    phoneId: c.phoneId,
    adminNumber: c.adminNumber,
    tokenSet: Boolean(c.token), // the token itself is never sent back
    verifyToken,
    webhookUrl: `${origin}/api/whatsapp/webhook${tenant ? `/${tenant.slug}` : ""}`,
    qrLinkAvailable: !tenant,
  };
}

export async function saveWhatsAppCloudSettings(input: { phoneId?: string; token?: string; adminNumber?: string }) {
  const values: Record<string, string> = {
    waPhoneId: String(input.phoneId ?? "").replace(/\D/g, ""),
    waAdminNumber: String(input.adminNumber ?? "").replace(/\D/g, ""),
  };
  // An empty token field means "keep the one already saved".
  if (String(input.token ?? "").trim()) values.waToken = String(input.token).trim();
  for (const [key, value] of Object.entries(values)) {
    await db.insert(appSettings).values({ key, value }).onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
  }
  await loadWaConfig(true);
}

// Asks Meta which number these credentials belong to — proves they work before going live.
export async function testWhatsAppCloud(): Promise<{ ok: boolean; number?: string; name?: string; error?: string }> {
  const c = await loadWaConfig(true);
  if (!c.token || !c.phoneId) return { ok: false, error: "missing" };
  try {
    const r = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${c.phoneId}?fields=display_phone_number,verified_name`, {
      headers: { Authorization: `Bearer ${c.token}` }, signal: AbortSignal.timeout(15_000),
    });
    const body: any = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: body?.error?.message || `HTTP ${r.status}` };
    return { ok: true, number: body.display_phone_number, name: body.verified_name };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || "network" };
  }
}
// True when we can actually send — either Cloud API is configured or a QR-linked
// WhatsApp Web session is connected.
export async function whatsappAvailable(): Promise<boolean> {
  await loadWaConfig();
  if (whatsappConfigured()) return true;
  try { const web = await import("./whatsappWeb"); return web.isWebConnected(); } catch { return false; }
}

// Logs a WhatsApp bot error and records it for Admin › Errors.
function waError(tag: string, e: unknown) {
  console.error(`[wa] ${tag}`, e);
  void import("./errorWatch").then((m) => m.recordError({ area: "whatsapp", source: "whatsapp", method: "BOT", path: tag, status: 0, message: `${tag}: ${(e as any)?.message || e}`, detail: String((e as any)?.stack || "") })).catch(() => {});
}

// --- Sending -------------------------------------------------------------
export async function sendWhatsApp(to: string, text: string): Promise<boolean> {
  const ok = await sendWhatsAppOnce(to, text);
  // Watcher (Admin › Errors): a reply that didn't go out while WhatsApp is linked.
  if (!ok && await whatsappAvailable()) void import("./errorWatch").then((m) => m.recordError({ area: "whatsapp", source: "whatsapp", method: "SEND", path: String(to).replace(/\D/g, ""), status: 0, message: `Reply not sent: ${text.slice(0, 120)}` })).catch(() => {});
  return ok;
}
// Messages the club sends a member outside a chat flow (booking confirmed /
// cancelled, booking receipt, "you're on now"…): retried once if WhatsApp was
// reconnecting, and saved to that member's chat in Admin › CRM so staff can see
// it was sent (or that it failed).
export async function sendToMember(to: string, text: string, userId?: string | null): Promise<boolean> {
  const num = waDigits(to);
  if (!num) return false;
  let ok = await sendWhatsApp(num, text);
  if (!ok && await whatsappAvailable()) { await new Promise((r) => setTimeout(r, 8000)); ok = await sendWhatsApp(num, text); }
  try {
    let [c] = await db.select().from(crmContacts).where(eq(crmContacts.phone, num));
    if (!c && userId) [c] = await db.select().from(crmContacts).where(eq(crmContacts.userId, userId));
    if (!c) [c] = await db.insert(crmContacts).values({ phone: num, userId: userId || null, stage: userId ? "member" : "new", source: "app" }).returning();
    if (c) await logMsg(c.id, c.phone, "out", ok ? text : `⚠️ ${text}`, true);
  } catch (e) { console.warn("[wa] log member message", e); }
  return ok;
}
async function sendWhatsAppOnce(to: string, rawText: string): Promise<boolean> {
  const c = await loadWaConfig();
  const text = inCompanyVoice(rawText);
  const num = String(to).replace(/\D/g, "");
  // Prefer a linked WhatsApp Web session (QR login) when available.
  try {
    const web = await import("./whatsappWeb");
    if (web.isWebConnected()) return await web.sendWhatsAppWeb(num, text);
  } catch { /* whatsappWeb not ready */ }
  if (!whatsappConfigured()) {
    console.log(`[wa] (not configured) would send to ${num}: ${text.slice(0, 80)}`);
    return false;
  }
  try {
    const r = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${c.phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: num, type: "text", text: { body: text } }),
      signal: AbortSignal.timeout(20_000), // never hang the chat on a slow API call
    });
    if (!r.ok) { console.error(`[wa] send failed ${r.status}: ${await r.text()}`); return false; }
    return true;
  } catch (e) {
    console.error("[wa] send error", e);
    return false;
  }
}

type WhatsAppChoice = { id: string; title: string };

// WhatsApp supports up to three quick-reply buttons. Cloud API receives the
// official interactive payload; QR-linked WhatsApp Web uses the matching
// Baileys native-flow message and falls back to numbered text when unavailable.
export async function sendWhatsAppChoices(to: string, rawText: string, choices: WhatsAppChoice[]): Promise<boolean> {
  const c = await loadWaConfig();
  const text = inCompanyVoice(rawText);
  const num = String(to).replace(/\D/g, "");
  const buttons = choices.slice(0, 3).map((choice) => ({ id: choice.id.slice(0, 256), title: choice.title.slice(0, 20) }));
  try {
    const web = await import("./whatsappWeb");
    if (web.isWebConnected()) {
      // Linked-device accounts can acknowledge an interactive native-flow
      // message without actually delivering it. Send the normal menu first so
      // the customer always receives an immediate response, then add buttons
      // as a progressive enhancement for WhatsApp clients that accept them.
      const textOk = await web.sendWhatsAppWeb(num, text);
      const buttonsOk = await web.sendWhatsAppWebChoices(num, "Tap a button to choose:", buttons);
      return textOk || buttonsOk;
    }
  } catch { /* use Cloud API or text fallback */ }
  if (whatsappConfigured()) {
    try {
      const r = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${c.phoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: num,
          type: "interactive",
          interactive: {
            type: "button",
            body: { text },
            action: { buttons: buttons.map((button) => ({ type: "reply", reply: button })) },
          },
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (r.ok) return true;
      console.error(`[wa] interactive send failed ${r.status}: ${await r.text()}`);
    } catch (e) { waError("interactive send error", e); }
  }
  return sendWhatsApp(num, `${text}\n\n${buttons.map((button, index) => `${index + 1}️⃣ ${button.title}`).join("\n")}`);
}
async function notifyAdmin(text: string) {
  const c = await loadWaConfig();
  if (c.adminNumber) await sendWhatsApp(c.adminNumber, text);
}
export async function notifyAdmins(text: string) { await notifyAdmin(text); }

// Send an image (data URL or http URL) with a caption. Falls back to text when the
// linked Web session isn't available (Cloud API image upload not implemented).
export async function sendWhatsAppImage(to: string, imageUrl: string, rawCaption: string): Promise<boolean> {
  await loadWaConfig();
  const caption = inCompanyVoice(rawCaption);
  const num = String(to).replace(/\D/g, "");
  try {
    const web = await import("./whatsappWeb");
    if (web.isWebConnected() && imageUrl) {
      const m = /^data:[^;]+;base64,(.+)$/.exec(imageUrl);
      const buf = m ? Buffer.from(m[1], "base64") : null;
      if (buf) return await web.sendWhatsAppWebImage(num, buf, caption);
    }
  } catch { /* fall through to text */ }
  return sendWhatsApp(num, caption);
}

// Admin › App features: is this member feature switched off? (same list the app uses)
async function featureOff(key: string): Promise<boolean> {
  try { const v = JSON.parse((await settingVal("disabledFeatures")) || "[]"); return Array.isArray(v) && v.includes(key); } catch { return false; }
}
async function settingVal(key: string): Promise<string> {
  try { const [r] = await db.select().from(appSettings).where(eq(appSettings.key, key)); return r?.value || ""; }
  catch { return ""; }
}

function asksForLocation(text: string): boolean {
  return /\b(address|location|located|directions?|map|maps|where are you|how to get there|alamat|lokasi|peta|dimana|di mana)\b|地址|位置|在哪里|在哪儿|怎么走/i.test(text);
}

// Reborn's own address on the platform; another company's comes from its first branch.
async function defaultAddress(): Promise<string> {
  const tenant = currentTenant();
  if (!tenant) return WEBSITE_ADDRESS;
  const [branch] = await db.select().from(bridgeBranches).where(and(eq(bridgeBranches.companyId, tenant.companyId), eq(bridgeBranches.active, true))).limit(1);
  return branch?.address || "";
}

// Exported so the app booking endpoints can include the same address + map pin.
export async function locationReply(lang: Lang = "en"): Promise<string> {
  const address = (await settingVal("businessAddress")).trim() || (await defaultAddress());
  const savedMap = (await settingVal("businessMapUrl")).trim();
  const mapUrl = savedMap || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return L(lang, "mapPin", { address, url: mapUrl });
}

// --- CRM -----------------------------------------------------------------
type Contact = typeof crmContacts.$inferSelect;

async function getOrCreateContact(phone: string, name?: string): Promise<Contact> {
  const num = phone.replace(/\D/g, "");
  const [existing] = await db.select().from(crmContacts).where(eq(crmContacts.phone, num));
  if (existing) return existing;
  const [row] = await db.insert(crmContacts).values({
    phone: num, name: name || null, stage: "new", source: "whatsapp", lastInboundAt: new Date(),
  }).returning();
  await notifyAdmin(`🟢 New WhatsApp lead: ${name || num} (${num})`);
  return row;
}
async function patchContact(id: number, patch: Partial<Contact>) {
  await db.update(crmContacts).set({ ...patch, updatedAt: new Date() }).where(eq(crmContacts.id, id));
}
// A Cloud API message Meta could not deliver: Admin › Errors gets the reason, and the member's
// CRM chat gets a ⚠️ line so staff see the booking message never arrived.
async function recordFailedDelivery(st: any) {
  const num = String(st?.recipient_id || "").replace(/\D/g, "");
  const err = st?.errors?.[0] || {};
  const reason = [err.code, err.title || err.message, err.error_data?.details].filter(Boolean).join(" · ") || "unknown";
  void import("./errorWatch").then((m) => m.recordError({ area: "whatsapp", source: "whatsapp", method: "DELIVERY", path: num, status: Number(err.code) || 0, message: `Not delivered to ${num}: ${reason}` })).catch(() => {});
  if (!num) return;
  try {
    const [c] = await db.select().from(crmContacts).where(eq(crmContacts.phone, num));
    if (c) await logMsg(c.id, num, "out", `⚠️ WhatsApp: ${reason}`, true);
  } catch (e) { console.warn("[wa] log failed delivery", e); }
}

async function logMsg(contactId: number, phone: string, direction: "in" | "out", body: string, viaBot: boolean) {
  try { await db.insert(crmMessages).values({ contactId, phone: phone.replace(/\D/g, ""), direction, body: body.slice(0, 4000), viaBot }); }
  catch (e) { waError("logMsg", e); }
}

// Admin replies to a contact from the web CRM. Sends over WhatsApp, logs it, and
// silences the bot for that contact (a human has taken over).
export async function sendAdminMessage(contactId: number, text: string): Promise<{ ok: boolean; message: string }> {
  const [c] = await db.select().from(crmContacts).where(eq(crmContacts.id, contactId));
  if (!c) return { ok: false, message: "Contact not found" };
  const ok = await sendWhatsApp(c.phone, text);
  await logMsg(c.id, c.phone, "out", text, false);
  if (c.stage !== "member") await patchContact(c.id, { stage: "active" }); // stop auto-replies
  return ok ? { ok: true, message: "Sent" } : { ok: false, message: "WhatsApp not connected — message saved but not delivered" };
}

// Called from POS when a member pays — powers "come back" and feedback reminders.
export async function crmRecordVisit(opts: { phone?: string | null; userId?: string | null; name?: string | null }) {
  const now = new Date();
  let num = (opts.phone || "").replace(/\D/g, "");
  let name = opts.name || null;
  try {
    // Resolve phone/name from the member record when only a userId is known.
    if (!num && opts.userId) {
      const [u] = await db.select().from(users).where(eq(users.id, opts.userId));
      if (u?.phoneNumber) num = u.phoneNumber.replace(/\D/g, "");
      if (!name) name = [u?.firstName, u?.lastName].filter(Boolean).join(" ") || null;
    }
    if (num) {
      const c = await getOrCreateContact(num, name || undefined);
      await patchContact(c.id, { lastVisitAt: now, userId: opts.userId || c.userId, name: name || c.name });
    } else if (opts.userId) {
      await db.update(crmContacts).set({ lastVisitAt: now, updatedAt: now }).where(eq(crmContacts.userId, opts.userId));
    }
  } catch (e) { waError("recordVisit", e); }
}

// --- Conversation state machine -----------------------------------------
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
// "I don't have an email" in any of our languages.
const NO_EMAIL_RE = /^\s*(skip|no|nope|none|no email|don'?t have( an? email)?|dont have|nil|-|跳过|没有|沒有|无|無|没有邮箱|沒有郵箱|不用|lewati|tidak( ada)?( email)?|gak( ada)?|ga( ada)?|nggak( ada)?|tak ada|belum( ada)?|skip aja)\s*[.!。]*\s*$/i;
// 6281234567890 → 081234567890 (how members type it when logging in).
const localPhone = (p: string) => { const d = String(p || "").replace(/\D/g, ""); return d.startsWith("62") ? "0" + d.slice(2) : d; };

function looksLikeName(s: string): boolean {
  const t = s.trim();
  return t.length >= 2 && t.length <= 40 && /[a-zA-Z一-鿿]/.test(t) && !EMAIL_RE.test(t);
}

// --- Localisation (en / zh / id) ----------------------------------------
export type Lang = "en" | "zh" | "id";
// Trilingual first message — shown to every new contact before they pick a language.
const WELCOME_TRILINGUAL =
  "🌊 Welcome to Reborn Wave Group! Please choose your language:\n" +
  "🌊 欢迎来到 Reborn Wave Group！请选择您的语言：\n" +
  "🌊 Selamat datang di Reborn Wave Group! Silakan pilih bahasa Anda:\n\n" +
  "1️⃣ English\n2️⃣ 中文\n3️⃣ Bahasa Indonesia\n\n" +
  "Reply 1, 2 or 3 · 回复 1、2 或 3 · Balas 1, 2 atau 3\n\n" +
  "Change anytime: \"change English / Chinese / Bahasa\" · 随时切换：「换中文」 · Ganti kapan saja: \"ganti bahasa\"";

function parseLang(s: string): Lang | null {
  const t = s.trim().toLowerCase();
  if (/^lang_en$|^1\b|\benglish\b|^(en|eng)$/.test(t)) return "en";
  if (/^lang_zh$|^2\b|中文|中国|\bchinese\b|^zh$|华语|华文/.test(t)) return "zh";
  if (/^lang_id$|^3\b|\bbahasa\b|\bindonesia\b|^(id|indo)$|\bmelayu\b|\bmalay\b/.test(t)) return "id";
  return null;
}

// "change english", "switch to chinese", "ganti bahasa", "tukar bahasa inggeris",
// "换中文", "切换英文", "english please" → the language to reply in from now on.
const LANG_NAMES: Array<[Lang, RegExp]> = [
  ["en", /^(english|eng|inggeris|inggris|bahasa (inggeris|inggris)|英文|英语|英語)$/],
  ["zh", /^(chinese|mandarin|中文|华语|华文|汉语|普通话|國語|bahasa (cina|mandarin|tionghoa))$/],
  ["id", /^(bahasa|bahasa indonesia|indonesia|indonesian|malay|melayu|bahasa melayu|bm)$/],
];
function langName(s: string): Lang | null {
  const t = s.trim();
  for (const [code, re] of LANG_NAMES) if (re.test(t)) return code;
  return null;
}
function parseLangSwitch(text: string): Lang | null {
  const t = text.trim().toLowerCase().replace(/[.!?。！？~]+$/, "").replace(/\s+/g, " ");
  const cmd = t.match(/^(?:(?:please|pls|can you|could you|tolong|sila)\s+)?(?:change|switch|set|use|speak|reply|talk|ganti|tukar|ubah|pakai|guna|cakap|换成|换|切换到|切换成|切换|改成|改用|改|用|说)\s*(?:(?:the\s+)?(?:language|lang|bahasa|语言)\s+)?(?:(?:to|into|in|ke|jadi)\s+|成|到)?\s*(.+)$/);
  const bare = (x: string) => x.replace(/^(?:language|lang|语言)\s*[:：]?\s*/, "").replace(/\s*\b(?:please|pls|only|language|lah)$/, "");
  return (cmd && langName(bare(cmd[1]))) || langName(bare(t));
}

function L(lang: Lang, key: string, vars: Record<string, string> = {}): string {
  const T: Record<string, Record<Lang, string>> = {
    mapPin: {
      en: "📍 Reborn Wave Group\n{address}\n\nOpen the map pin here:\n{url}",
      zh: "📍 Reborn Wave Group\n{address}\n\n点击打开地图定位：\n{url}",
      id: "📍 Reborn Wave Group\n{address}\n\nBuka titik lokasi di peta:\n{url}",
    },
    hoursSummary: {
      en: "hours vary by area — pick a day and I'll show the free times",
      zh: "各区域营业时间不同——选好日期后我会显示可预订的时间",
      id: "jam buka berbeda per area — pilih hari dan saya tunjukkan jam yang kosong",
    },
    closed: { en: "Closed", zh: "休息", id: "Tutup" },
    tableLine: { en: "{i}. {t} (up to {cap} pax)", zh: "{i}. {t}（最多 {cap} 人）", id: "{i}. {t} (maks {cap} orang)" },
    tableLineNoMax: { en: "{i}. {t} (no max)", zh: "{i}. {t}（人数不限）", id: "{i}. {t} (tanpa batas)" },
    paxRange: { en: "👥 {lo} pax to {hi} pax", zh: "👥 {lo} 至 {hi} 人", id: "👥 {lo} sampai {hi} orang" },
    paxRangeOne: { en: "👥 Up to {n} pax", zh: "👥 最多 {n} 人", id: "👥 Maks {n} orang" },
    paxRangeFrom: { en: "👥 From {lo} pax (some tables have no max)", zh: "👥 {lo} 人起（部分桌位人数不限）", id: "👥 Mulai {lo} orang (beberapa meja tanpa batas)" },
    askPax: { en: "👥 How many pax?", zh: "👥 几位客人？", id: "👥 Berapa orang?" },
    bookAskCake: {
      en: "🎂 Would you like us to prepare a birthday cake with decorations?\n1️⃣ Yes, please prepare it\n2️⃣ No, I'll prepare it myself",
      zh: "🎂 需要我们为您准备生日蛋糕和布置吗？\n1️⃣ 需要，请帮我准备\n2️⃣ 不用，我自己准备",
      id: "🎂 Mau kami siapkan kue ulang tahun dan dekorasi?\n1️⃣ Ya, tolong siapkan\n2️⃣ Tidak, saya siapkan sendiri",
    },
    cakeUs: { en: "🍰 Noted — we'll prepare the cake and decorations. Our team will confirm the details with you.", zh: "🍰 已记录——我们会为您准备蛋糕和布置，团队会与您确认细节。", id: "🍰 Dicatat — kami akan siapkan kue dan dekorasinya. Tim kami akan konfirmasi detailnya." },
    cakeNoteUs: { en: "🍰 Cake & decorations: we prepare", zh: "🍰 蛋糕和布置：由我们准备", id: "🍰 Kue & dekorasi: kami siapkan" },
    cakeNoteSelf: { en: "🍰 Cake & decorations: you bring your own", zh: "🍰 蛋糕和布置：您自行准备", id: "🍰 Kue & dekorasi: kamu bawa sendiri" },
    cakeSelf: { en: "🎈 Noted — you'll bring your own cake and decorations.", zh: "🎈 已记录——您将自行准备蛋糕和布置。", id: "🎈 Dicatat — kamu akan membawa kue dan dekorasi sendiri." },
    tableTaken: {
      en: "Sorry, {t} is already booked for {time} on {day}. Pick another:\n{list}",
      zh: "抱歉，{t} 在 {day} {time} 已被预订。请选择其他：\n{list}",
      id: "Maaf, {t} sudah dipesan untuk {day} jam {time}. Pilih yang lain:\n{list}",
    },
    tableTakenDay: {
      en: "Sorry, {t} is already booked on {day}. Pick another:\n{list}",
      zh: "抱歉，{t} 在 {day} 已被预订。请选择其他：\n{list}",
      id: "Maaf, {t} sudah dipesan pada {day}. Pilih yang lain:\n{list}",
    },
    overCap: {
      en: "{t} seats up to {cap} pax, but you asked for {n}. Let me help you pick a suitable spot 👇",
      zh: "{t} 最多容纳 {cap} 人，您需要 {n} 人。我来帮您选合适的位置 👇",
      id: "{t} maksimal {cap} orang, tapi Anda {n} orang. Saya bantu pilih tempat yang cocok 👇",
    },
    replyNumber: { en: "Reply a number 1-{n}.", zh: "请回复 1-{n} 的数字。", id: "Balas angka 1-{n}." },
    closedDay: {
      en: "{day}: sorry, {area} is closed that day. Please reply another date (e.g. tomorrow or \"next friday\").",
      zh: "{day}：抱歉，{area} 当天不营业。请回复其他日期（例如：明天）。",
      id: "{day}: maaf, {area} tutup hari itu. Silakan balas tanggal lain (mis. besok).",
    },
    fullDay: {
      en: "{day}: sorry, {area} is fully booked that day. Please reply another date.",
      zh: "{day}：抱歉，{area} 当天已订满。请回复其他日期。",
      id: "{day}: maaf, {area} sudah penuh hari itu. Silakan balas tanggal lain.",
    },
    dateOk: { en: "✅ Date: *{day}*", zh: "✅ 日期：*{day}*", id: "✅ Tanggal: *{day}*" },
    aboutIntro: {
      en: "🎉 Here's everything we have at {club}:",
      zh: "🎉 {club} 的全部项目：",
      id: "🎉 Ini semua yang ada di {club}:",
    },
    aboutTables: {
      en: "{n} tables/rooms",
      zh: "{n} 张桌/间房",
      id: "{n} meja/ruang",
    },
    aboutBook: {
      en: "Reply the number to book it — or 0 for the menu.",
      zh: "回复编号即可预订 — 或回复 0 返回菜单。",
      id: "Balas nomornya untuk booking — atau 0 untuk menu.",
    },
    aboutJoin: {
      en: "To book, you'll need a free member account (takes a minute). What's your name?",
      zh: "预订需要一个免费会员账户（一分钟即可）。请问你的名字是？",
      id: "Untuk booking, kamu perlu akun member gratis (hanya semenit). Siapa namamu?",
    },
    aboutMore: {
      en: "Reply MENU for more options.",
      zh: "回复 MENU 查看更多选项。",
      id: "Balas MENU untuk pilihan lain.",
    },
    eventsIntro: { en: "🎉 Our upcoming events ({n}):", zh: "🎉 即将举行的活动（{n} 个）：", id: "🎉 Acara mendatang kami ({n}):" },
    eventsNone: { en: "No upcoming events right now — check back soon! 🎉 Reply MENU for other options.", zh: "目前暂无活动——请稍后再来看看！🎉 回复 MENU 查看其他选项。", id: "Belum ada acara mendatang — cek lagi nanti! 🎉 Balas MENU untuk pilihan lain." },
    eventsFooter: { en: "Want a table for one of these? Reply *1* to book — or MENU for other options.", zh: "想为这些活动订桌吗？回复 *1* 预订 —— 或回复 MENU 查看其他选项。", id: "Mau booking meja untuk acara ini? Balas *1* untuk booking — atau MENU untuk pilihan lain." },
    eventOnDay: {
      en: "🎉 Happening on {day}: *{title}*{body}",
      zh: "🎉 {day} 的活动：*{title}*{body}",
      id: "🎉 Acara pada {day}: *{title}*{body}",
    },
    fullVenue: {
      en: "😔 Sorry, we're fully booked on {day} — every table is taken. Please reply another date.",
      zh: "😔 抱歉，{day} 已全部订满——所有桌位都已被预订。请回复其他日期。",
      id: "😔 Maaf, kami sudah penuh pada {day} — semua meja sudah dipesan. Silakan balas tanggal lain.",
    },
    fullOtherAreas: {
      en: "These areas still have space that day:\n{list}\nReply B to choose another area.",
      zh: "当天以下区域仍有空位：\n{list}\n回复 B 选择其他区域。",
      id: "Area ini masih ada tempat hari itu:\n{list}\nBalas B untuk memilih area lain.",
    },
    slotFilled: {
      en: "Sorry, that time just filled up. Reply another number 1-{n}.",
      zh: "抱歉，该时段刚刚订满。请回复其他数字 1-{n}。",
      id: "Maaf, jam itu baru saja penuh. Balas angka lain 1-{n}.",
    },
    tableTooSmall: {
      en: "{t} seats up to {cap} pax, but you have {n}. Reply another table number, or reply \"book\" to restart.",
      zh: "{t} 最多容纳 {cap} 人，您有 {n} 人。请回复其他桌位编号，或回复「预订」重新开始。",
      id: "{t} maksimal {cap} orang, tapi Anda {n} orang. Balas nomor meja lain, atau balas \"booking\" untuk mulai lagi.",
    },
    askPaxFor: { en: "👥 How many pax? ({t} seats up to {cap})", zh: "👥 几位客人？（{t} 最多 {cap} 人）", id: "👥 Berapa orang? ({t} maks {cap} orang)" },
    paxTooMany: {
      en: "Sorry, the most is {cap} pax. Please reply a number up to {cap}.",
      zh: "抱歉，最多 {cap} 人。请回复不超过 {cap} 的数字。",
      id: "Maaf, maksimal {cap} orang. Balas angka sampai {cap}.",
    },
    justBooked: {
      en: "Sorry, {t} was just booked. Reply \"book\" to try another.",
      zh: "抱歉，{t} 刚刚被预订。回复「预订」选择其他。",
      id: "Maaf, {t} baru saja dipesan. Balas \"booking\" untuk pilih yang lain.",
    },
    hoursSuffix: { en: " ({n}h)", zh: "（{n} 小时）", id: " ({n} jam)" },
    reviewGoogle: { en: "Please leave us a Google review 🙏 {url}", zh: "欢迎在 Google 给我们留下评价 🙏 {url}", id: "Mohon beri ulasan Google untuk kami 🙏 {url}" },
    reviewSeeYou: { en: "See you again soon! 💜", zh: "期待再次见到您！💜", id: "Sampai jumpa lagi! 💜" },
    reviewBetter: { en: "Thank you — we'll do better. 💜", zh: "谢谢您——我们会做得更好。💜", id: "Terima kasih — kami akan lebih baik lagi. 💜" },
    reviewLinkApp: { en: "\nFeedback in the app: {url}", zh: "\n在应用中反馈：{url}", id: "\nBeri masukan di aplikasi: {url}" },
    reviewLinkGoogle: { en: "\nGoogle review: {url}", zh: "\nGoogle 评价：{url}", id: "\nUlasan Google: {url}" },
    bottleLine: { en: "• {emoji} {type} — {name}{left} · {days} day(s) left", zh: "• {emoji} {type} — {name}{left} · 剩 {days} 天", id: "• {emoji} {type} — {name}{left} · sisa {days} hari" },
    bottleLeft: { en: " ({n} left)", zh: "（剩 {n}）", id: " (sisa {n})" },
    "type.whisky": { en: "Whisky", zh: "威士忌", id: "Wiski" },
    "type.beer": { en: "Beer", zh: "啤酒", id: "Bir" },
    "type.wine": { en: "Wine", zh: "葡萄酒", id: "Anggur" },
    "type.drink": { en: "Drink", zh: "酒水", id: "Minuman" },
    left10m: { en: "10 minutes", zh: "10 分钟", id: "10 menit" },
    left1h: { en: "1 hour", zh: "1 小时", id: "1 jam" },
    left3h: { en: "3 hours", zh: "3 小时", id: "3 jam" },
    pushRemindTitle: { en: "⏰ {club} in {left}", zh: "⏰ {left}后 {club} 见", id: "⏰ {club} dalam {left}" },
    yourBooking: { en: "Your booking", zh: "您的预订", id: "Booking Anda" },
    pushNoShowTitle: { en: "😔 Booking cancelled — no-show", zh: "😔 预订已取消——未到店", id: "😔 Booking dibatalkan — tidak datang" },
    pushNoShowBody: { en: "{what} · {when}. Tap to book again.", zh: "{what} · {when}。点击重新预订。", id: "{what} · {when}. Ketuk untuk booking lagi." },
    noticeNoShowTitle: { en: "Booking cancelled (no-show)", zh: "预订已取消（未到店）", id: "Booking dibatalkan (tidak datang)" },
    noticeNoShowBody: { en: "{what} · {when} — you didn't arrive within 15 minutes. Book again any time.", zh: "{what} · {when}——您未在 15 分钟内到达。欢迎随时重新预订。", id: "{what} · {when} — Anda tidak datang dalam 15 menit. Silakan booking lagi kapan saja." },
    "st.pending": { en: "pending", zh: "待确认", id: "menunggu" },
    "st.scheduled": { en: "scheduled", zh: "已安排", id: "terjadwal" },
    "st.confirmed": { en: "confirmed", zh: "已确认", id: "dikonfirmasi" },
    tableX: { en: "Table {t}", zh: "桌位 {t}", id: "Meja {t}" },
    partyOf: { en: "Party of {n}", zh: "{n} 人", id: "{n} orang" },
    booking: { en: "Booking", zh: "预订", id: "Booking" },
    friend: { en: "there", zh: "朋友", id: "Kak" },
    appReceipt: {
      en: "✅ Booking received at {club}: {area} · {day} {time}{table} · {n} pax. Our team will confirm shortly. 💜",
      zh: "✅ 已收到您在 {club} 的预订：{area} · {day} {time}{table} · {n} 位。我们的团队会尽快确认。💜",
      id: "✅ Booking diterima di {club}: {area} · {day} {time}{table} · {n} orang. Tim kami akan segera konfirmasi. 💜",
    },
    staffConfirmed: {
      en: "✅ Your booking is confirmed: {what} on {when}. See you! 💜",
      zh: "✅ 您的预订已确认：{what}，{when}。期待您的光临！💜",
      id: "✅ Booking Anda dikonfirmasi: {what} pada {when}. Sampai jumpa! 💜",
    },
    staffCancelled: {
      en: "😔 Sorry, your booking ({what} on {when}) has been cancelled{note} Please rebook a new date by typing \"booking\". 💜",
      zh: "😔 抱歉，您的预订（{what}，{when}）已被取消{note} 请回复「预订」选择新的日期。💜",
      id: "😔 Maaf, booking Anda ({what} pada {when}) dibatalkan{note} Silakan pesan tanggal baru dengan mengetik \"booking\". 💜",
    },
    songConfirmed: {
      en: "🎤 Your song request is confirmed: {song}{note}. Get ready to sing! 💜",
      zh: "🎤 您的点歌已确认：{song}{note}。准备开唱吧！💜",
      id: "🎤 Permintaan lagu Anda dikonfirmasi: {song}{note}. Siap-siap bernyanyi! 💜",
    },
    songRejected: {
      en: "🎵 Sorry, we can't play your song request: {song}{note}. Feel free to request another one in the app. 💜",
      zh: "🎵 抱歉，暂时无法播放您点的歌：{song}{note}。欢迎在应用里再点一首。💜",
      id: "🎵 Maaf, permintaan lagu Anda belum bisa diputar: {song}{note}. Silakan minta lagu lain di aplikasi. 💜",
    },
    pushConfirmedTitle: { en: "✅ Booking confirmed", zh: "✅ 预订已确认", id: "✅ Booking dikonfirmasi" },
    pushCancelledTitle: { en: "😔 Booking cancelled", zh: "😔 预订已取消", id: "😔 Booking dibatalkan" },
    tapRebook: { en: "Tap to rebook.", zh: "点击重新预订。", id: "Ketuk untuk booking ulang." },
    "status.confirmed": { en: "Booking confirmed", zh: "预订已确认", id: "Booking dikonfirmasi" },
    "status.cancelled": { en: "Booking cancelled", zh: "预订已取消", id: "Booking dibatalkan" },
    "status.completed": { en: "Booking completed", zh: "预订已完成", id: "Booking selesai" },
    "status.pending": { en: "Booking pending", zh: "预订待确认", id: "Booking menunggu" },
    staffBooked: {
      en: "✅ We've booked you at {club}: {area} on {when}{table}. See you! 💜",
      zh: "✅ 已为您在 {club} 预订：{area}，{when}{table}。期待您的光临！💜",
      id: "✅ Kami sudah memesankan Anda di {club}: {area} pada {when}{table}. Sampai jumpa! 💜",
    },
    pushBookedTitle: { en: "✅ You're booked", zh: "✅ 预订成功", id: "✅ Booking berhasil" },
    langChanged: {
      en: "✅ Okay! I'll reply in English from now on. (Type \"change Chinese\" or \"change Bahasa\" to switch.)",
      zh: "✅ 好的！接下来我会用中文回复您。（输入「change English」或「change Bahasa」可切换语言。）",
      id: "✅ Baik! Mulai sekarang saya akan membalas dalam Bahasa Indonesia. (Ketik \"change English\" atau \"change Chinese\" untuk ganti bahasa.)",
    },
    askName: {
      en: "Great! 👋 May I know your name?",
      zh: "好的！👋 请问怎么称呼您？",
      id: "Bagus! 👋 Boleh saya tahu nama Anda?",
    },
    askEmail: {
      en: "Nice to meet you, {name}! 🎉 What's your email address? I'll set up your member account.\n\nNo email? Reply *skip* — you'll log in with this phone number.",
      zh: "很高兴认识你，{name}！🎉 请提供你的电子邮箱，我帮你开通会员账户。\n\n没有邮箱？回复 *跳过*，以后用这个手机号登录。",
      id: "Senang berkenalan, {name}! 🎉 Boleh minta alamat email Anda? Saya akan buatkan akun member.\n\nTidak punya email? Balas *lewati* — Anda login pakai nomor HP ini.",
    },
    badEmail: {
      en: "That doesn't look like an email. Please send it like name@example.com 🙂\nNo email? Reply *skip* to use your phone number.",
      zh: "这似乎不是有效的邮箱，请按 name@example.com 格式发送 🙂\n没有邮箱？回复 *跳过*，用手机号登录。",
      id: "Itu sepertinya bukan email. Kirim dalam format name@example.com ya 🙂\nTidak punya email? Balas *lewati* untuk pakai nomor HP.",
    },
    readyPhone: {
      en: "All set! ✅ Your member account is ready.\n\n🔗 {url}\n📱 Log in with your phone number: {phone}\n🔑 Password: {pw}\n\nPlease log in and change your password. You can add an email later in your profile. 💜",
      zh: "搞定啦！✅ 你的会员账户已开通。\n\n🔗 {url}\n📱 用手机号登录：{phone}\n🔑 密码：{pw}\n\n请登录并修改密码。之后可在个人资料里添加邮箱。💜",
      id: "Selesai! ✅ Akun member Anda sudah siap.\n\n🔗 {url}\n📱 Login dengan nomor HP: {phone}\n🔑 Kata sandi: {pw}\n\nSilakan login dan ganti kata sandi. Email bisa ditambahkan nanti di profil. 💜",
    },
    welcomeBackPhone: {
      en: "Welcome back! This number already has an account. Log in at {url} with your phone number {phone}. 💜",
      zh: "欢迎回来！这个号码已有账户。请到 {url} 用手机号 {phone} 登录。💜",
      id: "Selamat datang kembali! Nomor ini sudah punya akun. Login di {url} dengan nomor HP {phone}. 💜",
    },
    ready: {
      en: "All set! ✅ Your member account is ready.\n\n🔗 {url}\n📧 {email}\n🔑 Password: {pw}\n\nPlease log in and change your password. Our team will help you from here — reply anytime. 💜",
      zh: "搞定啦！✅ 你的会员账户已开通。\n\n🔗 {url}\n📧 {email}\n🔑 密码：{pw}\n\n请登录并修改密码。接下来由我们的团队为你服务，随时留言。💜",
      id: "Selesai! ✅ Akun member Anda sudah siap.\n\n🔗 {url}\n📧 {email}\n🔑 Kata sandi: {pw}\n\nSilakan login dan ganti kata sandi. Tim kami akan membantu Anda — balas kapan saja. 💜",
    },
    welcomeBack: {
      en: "Welcome back! You already have an account ({email}). Log in at {url}. Our team will help you from here. 💜",
      zh: "欢迎回来！你已有账户（{email}）。请到 {url} 登录。接下来由我们的团队为你服务。💜",
      id: "Selamat datang kembali! Anda sudah punya akun ({email}). Login di {url}. Tim kami akan membantu Anda. 💜",
    },
    thanks: {
      en: "Thanks {name}! A team member will reply shortly. 💜",
      zh: "谢谢 {name}！我们的团队会尽快回复你。💜",
      id: "Terima kasih {name}! Tim kami akan segera membalas. 💜",
    },
    comeback: {
      en: "Hey {name}! 🌊 We miss you at Reborn Wave. Come back and enjoy — see you soon! 🎉",
      zh: "嘿 {name}！🌊 Reborn Wave 想你了，快回来玩吧，期待与你相见！🎉",
      id: "Hai {name}! 🌊 Kami rindu Anda di Reborn Wave. Ayo mampir lagi — sampai jumpa! 🎉",
    },
    feedback: {
      en: "Thanks for coming to Reborn Wave tonight, {name}! 🙏 How was your experience? Reply here — we read every message. 💜",
      zh: "谢谢你今晚光临 Reborn Wave，{name}！🙏 体验如何？欢迎回复我们，每条留言我们都会看。💜",
      id: "Terima kasih sudah datang ke Reborn Wave malam ini, {name}! 🙏 Bagaimana pengalaman Anda? Balas di sini — kami baca setiap pesan. 💜",
    },
    pkgExpiring: {
      en: "Hi {name}! 🎁 You still have {left} on your {item} — it expires in {days} day(s). Come use it before it's gone!{perk} 💜",
      zh: "你好 {name}！🎁 你的 {item} 还剩 {left}，将在 {days} 天后到期。快来使用吧，别浪费了！{perk} 💜",
      id: "Hai {name}! 🎁 {item} Anda masih tersisa {left} — kedaluwarsa dalam {days} hari. Yuk pakai sebelum hangus!{perk} 💜",
    },
    pkgIdle: {
      en: "Hi {name}! 🎁 Just a reminder: you still have {left} on your {item} at Reborn Wave. See you soon!{perk} 💜",
      zh: "你好 {name}！🎁 温馨提醒：你在 Reborn Wave 的 {item} 还剩 {left}。期待再见到你！{perk} 💜",
      id: "Hai {name}! 🎁 Sekadar mengingatkan: {item} Anda di Reborn Wave masih tersisa {left}. Sampai jumpa!{perk} 💜",
    },
    pkgLeftUses: { en: "{n} visit(s)", zh: "{n} 次", id: "{n} kunjungan" },
    pkgLeftCredit: { en: "RP {n} credit", zh: "RP {n} 余额", id: "kredit RP {n}" },
    pkgPerkHint: {
      en: " Use it all and you get {p}% off every bill.",
      zh: " 全部用完后，每张账单可享 {p}% 折扣。",
      id: " Habiskan dan dapatkan diskon {p}% setiap tagihan.",
    },
    pkgPushTitle: { en: "🎁 {item}: {left} left", zh: "🎁 {item}：还剩 {left}", id: "🎁 {item}: sisa {left}" },
    pkgPushExpiring: { en: "Expires in {days} day(s) — come use it!", zh: "{days} 天后到期——快来使用吧！", id: "Kedaluwarsa dalam {days} hari — yuk dipakai!" },
    pkgPushIdle: { en: "Still waiting for you — see you soon!", zh: "还在等你哦——期待再见！", id: "Masih menunggu Anda — sampai jumpa!" },
    bottle: {
      en: "Hi {name}! 🍾 Your kept {item} ({qty} left) is waiting at Reborn Wave — it expires in {days} day(s). Come finish it before it's gone! 💜",
      zh: "你好 {name}！🍾 你寄存的 {item}（还剩 {qty}）正在 Reborn Wave 等你，将在 {days} 天后到期。快来喝完吧！💜",
      id: "Hai {name}! 🍾 Simpanan {item} Anda (sisa {qty}) menunggu di Reborn Wave — kedaluwarsa dalam {days} hari. Yuk habiskan sebelum hangus! 💜",
    },
    menuMore: {
      en: "Meanwhile, anything else I can help with? 🌊\n1️⃣ Booking / appointment\n2️⃣ Request a song\n3️⃣ My kept bottles\n4️⃣ Events 🎉\nReply 1-4, or ask anything you need.",
      zh: "在此期间，还有什么可以帮您？🌊\n1️⃣ 预订 / 预约\n2️⃣ 点歌\n3️⃣ 我的寄存酒\n4️⃣ 活动 🎉\n请回复 1-4，或直接提出任何问题。",
      id: "Sambil menunggu, ada lagi yang bisa saya bantu? 🌊\n1️⃣ Booking / janji\n2️⃣ Minta lagu\n3️⃣ Botol simpanan saya\n4️⃣ Acara 🎉\nBalas 1-4, atau tanyakan apa saja yang Anda perlukan.",
    },
    menu: {
      en: "Hello {name}, how can I help you today? 🌊\n1️⃣ Booking / appointment\n2️⃣ Request a song\n3️⃣ My kept bottles\n4️⃣ Events 🎉\nReply 1-4, or ask anything you need.\n❌ Type \"cancel booking\" to cancel a booking.",
      zh: "你好 {name}，今天有什么可以帮您？🌊\n1️⃣ 预订 / 预约\n2️⃣ 点歌\n3️⃣ 我的寄存酒\n4️⃣ 活动 🎉\n请回复 1-4，或直接提出任何问题。\n❌ 输入「取消预订」可取消预订。",
      id: "Halo {name}, apa yang bisa saya bantu hari ini? 🌊\n1️⃣ Booking / janji\n2️⃣ Minta lagu\n3️⃣ Botol simpanan saya\n4️⃣ Acara 🎉\nBalas 1-4, atau tanyakan apa saja yang Anda perlukan.\n❌ Ketik \"batal booking\" untuk membatalkan booking.",
    },
    featureOff: {
      en: "Sorry, this is turned off right now. 🙏 Reply MENU for other options.",
      zh: "抱歉，此功能目前已关闭。🙏 回复 MENU 查看其他选项。",
      id: "Maaf, fitur ini sedang dinonaktifkan. 🙏 Balas MENU untuk pilihan lain.",
    },
    songStillNeedTable: {
      en: "🎤 Got it — \"{song}\". Please scan the QR code on your table first (app → KOS → camera), then send the song name again and I'll request it for you.",
      zh: "🎤 收到——「{song}」。请先扫描桌上的二维码（应用 → 歌王之王 → 相机），然后再发送歌名，我就帮你点歌。",
      id: "🎤 Oke — \"{song}\". Pindai dulu QR di mejamu (aplikasi → KOS → kamera), lalu kirim lagi judul lagunya dan akan saya mintakan.",
    },
    songNeedTable: {
      en: "🎤 Song requests go by table tonight. Please scan the QR code on your table first (open the app → KOS → camera), then send your song request again. If you booked a table, you'll be checked in once staff confirm your booking.",
      zh: "🎤 今晚点歌按桌排队。请先扫描桌上的二维码（打开应用 → 歌王之王 → 相机），然后再发送点歌请求。如果你已订桌，员工确认预订后会自动为你签到。",
      id: "🎤 Malam ini permintaan lagu berdasarkan meja. Pindai dulu QR di mejamu (buka aplikasi → KOS → kamera), lalu kirim lagi permintaan lagumu. Jika kamu booking meja, kamu otomatis check-in setelah staf mengonfirmasi booking.",
    },
    songAskName: {
      en: "🎤 What's the song name? (Chinese or pinyin — or both)",
      zh: "🎤 歌名是什么？（中文或拼音都可以）",
      id: "🎤 Judul lagunya apa? (Mandarin atau pinyin — boleh keduanya)",
    },
    songAskArtist: {
      en: "Who is the singer? This is optional — reply - to skip.",
      zh: "歌手是谁？可不填，回复 - 跳过。",
      id: "Siapa penyanyinya? Boleh kosong — balas - untuk lewati.",
    },
    songPick: {
      en: "I found these songs:\n{list}\n\nReply with the number, or 0 to enter the singer yourself.",
      zh: "找到这些歌曲：\n{list}\n\n回复编号，或回复 0 自己填写歌手。",
      id: "Saya menemukan lagu berikut:\n{list}\n\nBalas nomornya, atau 0 untuk isi penyanyi sendiri.",
    },
    songPickInvalid: {
      en: "Please reply with a song number from the list, or 0 to enter it manually.",
      zh: "请回复列表中的歌曲编号，或回复 0 手动填写。",
      id: "Balas dengan nomor lagu dari daftar, atau 0 untuk isi manual.",
    },
    songAskMode: {
      en: "How should it be performed?\n1. Self sing\n2. By singer",
      zh: "请选择演唱方式：\n1. 自己唱\n2. 歌手演唱",
      id: "Pilih cara tampil:\n1. Nyanyi sendiri\n2. Dinyanyikan penyanyi",
    },
    songModeInvalid: {
      en: "Reply 1 for Self sing or 2 for By singer.",
      zh: "回复 1 自己唱，或 2 歌手演唱。",
      id: "Balas 1 untuk nyanyi sendiri atau 2 untuk dinyanyikan penyanyi.",
    },
    bottlesList: {
      en: "🍾 Your kept bottles ({n}):\n{list}",
      zh: "🍾 你的寄存酒（{n}）：\n{list}",
      id: "🍾 Botol simpanan Anda ({n}):\n{list}",
    },
    bottlesNone: {
      en: "You have no bottles kept right now. 🍾",
      zh: "你目前没有寄存酒。🍾",
      id: "Anda belum ada botol simpanan. 🍾",
    },
    welcomeBackMenu: {
      en: "Hi {name}! 👋 What can I do for you today?\n1️⃣ Booking / ask a question\n2️⃣ Song request\n3️⃣ My kept bottles\n4️⃣ Events 🎉\n\nYou can also just ask me anything — opening hours, address, room capacity, and more.",
      zh: "你好 {name}！👋 今天需要什么帮助？\n1️⃣ 预订 / 咨询\n2️⃣ 点歌\n3️⃣ 我的寄存酒\n4️⃣ 活动 🎉\n\n也可以直接问我任何问题——营业时间、地址、房间容纳人数等。",
      id: "Hai {name}! 👋 Ada yang bisa dibantu hari ini?\n1️⃣ Booking / tanya\n2️⃣ Minta lagu\n3️⃣ Botol simpanan saya\n4️⃣ Acara 🎉\n\nAtau tanya apa saja — jam buka, alamat, kapasitas ruangan, dll.",
    },
    aiBack: {
      en: "🤖 Our AI assistant is back on — how can I help you?",
      zh: "🤖 AI 助手已重新开启——有什么可以帮您？",
      id: "🤖 Asisten AI kami aktif lagi — ada yang bisa dibantu?",
    },
    faqUnknown: {
      en: "Thanks for your message! Our team will get back to you shortly. 💜\n\nStill need our AI assistant? Type *AI* and the auto-reply will work again. 🤖",
      zh: "谢谢你的留言！我们的团队会尽快回复你。💜\n\n还需要 AI 助手？输入 *AI*，自动回复就会重新开启。🤖",
      id: "Terima kasih atas pesannya! Tim kami akan segera membalas. 💜\n\nMasih butuh asisten AI? Ketik *AI* dan balasan otomatis akan aktif lagi. 🤖",
    },
    bookOffer: {
      en: "Would you like to book a table? 🪑\nOur hours — {hours}\nReply 1 to book, or 2 to request a song.",
      zh: "要预订桌位吗？🪑\n营业时间 — {hours}\n回复 1 预订，或回复 2 点歌。",
      id: "Mau pesan meja? 🪑\nJam buka — {hours}\nBalas 1 untuk pesan, atau 2 untuk minta lagu.",
    },
    bookAskArea: {
      en: "What would you like to book?\n{list}\nReply the number.",
      zh: "您想预订哪一项？\n{list}\n回复数字。",
      id: "Mau pesan yang mana?\n{list}\nBalas nomornya.",
    },
    bookAskDate: {
      en: "Which day? Reply e.g. today, tomorrow, next Sunday, or a date like 13/10.",
      zh: "哪一天？可回复：今天、明天、后天、下个礼拜天，或日期如 10月13日、13/10。",
      id: "Hari apa? Balas mis. hari ini, besok, lusa, Sabtu depan, atau tanggal seperti 13/10.",
    },
    askWeekday: {
      en: "Which day {week}?\n1. Monday\n2. Tuesday\n3. Wednesday\n4. Thursday\n5. Friday\n6. Saturday\n7. Sunday\nReply the number or the day.",
      zh: "{week}哪一天？\n1. 星期一\n2. 星期二\n3. 星期三\n4. 星期四\n5. 星期五\n6. 星期六\n7. 星期日\n请回复数字或星期几。",
      id: "Hari apa {week}?\n1. Senin\n2. Selasa\n3. Rabu\n4. Kamis\n5. Jumat\n6. Sabtu\n7. Minggu\nBalas angka atau nama harinya.",
    },
    weekNext: { en: "next week", zh: "下个礼拜", id: "minggu depan" },
    weekThis: { en: "this week", zh: "这个礼拜", id: "minggu ini" },
    weekLater: { en: "in two weeks", zh: "下下个礼拜", id: "dua minggu lagi" },
    confirmDate: {
      en: "Is it *{day}*?\n1️⃣ Yes\n2️⃣ No",
      zh: "是 *{day}* 吗？\n1️⃣ 是\n2️⃣ 不是",
      id: "Apakah *{day}*?\n1️⃣ Ya\n2️⃣ Tidak",
    },
    navHint: {
      en: "↩️ Reply *B* to go back · ❌ *0* to cancel",
      zh: "↩️ 回复 *B* 返回上一步 · ❌ 回复 *0* 取消",
      id: "↩️ Balas *B* untuk kembali · ❌ *0* untuk batal",
    },
    navHintSongPick: {
      en: "↩️ Reply *B* to go back · ❌ *CANCEL* to stop",
      zh: "↩️ 回复 *B* 返回上一步 · ❌ 回复 *取消* 停止",
      id: "↩️ Balas *B* untuk kembali · ❌ *BATAL* untuk berhenti",
    },
    datePast: {
      en: "{day} has already passed. Please reply another date.",
      zh: "{day} 已经过去了，请回复其他日期。",
      id: "{day} sudah lewat. Silakan balas tanggal lain.",
    },
    bookAskSlot: {
      en: "{day} · {hours}\nChoose your start time:\n{list}\nReply the number.",
      zh: "{day} · {hours}\n请选择开始时间：\n{list}\n回复数字。",
      id: "{day} · {hours}\nPilih jam mulai:\n{list}\nBalas nomornya.",
    },
    bookAskTable: {
      en: "🪑 Choose your preferred table\n(check out our layout above)\n{range}\n{list}\n\nReply the number.",
      zh: "🪑 请选择您喜欢的桌位\n（请参考上方平面图）\n{range}\n{list}\n\n回复数字。",
      id: "🪑 Pilih meja favoritmu\n(lihat denah kami di atas)\n{range}\n{list}\n\nBalas nomornya.",
    },
    bookAskTableNoImg: {
      en: "🪑 Choose your preferred table\n{range}\n{list}\n\nReply the number.",
      zh: "🪑 请选择您喜欢的桌位\n{range}\n{list}\n\n回复数字。",
      id: "🪑 Pilih meja favoritmu\n{range}\n{list}\n\nBalas nomornya.",
    },
    bookAskParty: {
      en: "How many people? (reply a number)",
      zh: "几位客人？（请回复数字）",
      id: "Berapa orang? (balas angka)",
    },
    bookAskSpecial: {
      en: "Any special request? 🎉\n1️⃣ Birthday 🎂\n2️⃣ Company event 🏢\n3️⃣ Anniversary 💕\n4️⃣ Celebration / party 🎉\n5️⃣ No, that's all\n\nOr just type your request (e.g. \"birthday, please prepare a cake\").",
      zh: "有什么特别需求吗？🎉\n1️⃣ 生日 🎂\n2️⃣ 公司活动 🏢\n3️⃣ 纪念日 💕\n4️⃣ 庆祝 / 派对 🎉\n5️⃣ 没有了\n\n也可以直接输入您的需求（例如：“生日，请准备蛋糕”）。",
      id: "Ada permintaan khusus? 🎉\n1️⃣ Ulang tahun 🎂\n2️⃣ Acara kantor 🏢\n3️⃣ Anniversary 💕\n4️⃣ Perayaan / pesta 🎉\n5️⃣ Tidak ada\n\nAtau ketik permintaanmu (mis. \"ulang tahun, tolong siapkan kue\").",
    },
    bookAskSpecialNote: {
      en: "Anything we should prepare? Type it, or reply 5 to skip.",
      zh: "需要我们准备什么吗？请直接输入，或回复 5 跳过。",
      id: "Ada yang perlu kami siapkan? Ketik saja, atau balas 5 untuk lewati.",
    },
    "occ.birthday": { en: "🎂 Birthday", zh: "🎂 生日", id: "🎂 Ulang tahun" },
    "occ.company": { en: "🏢 Company event", zh: "🏢 公司活动", id: "🏢 Acara kantor" },
    "occ.anniversary": { en: "💕 Anniversary", zh: "💕 纪念日", id: "💕 Anniversary" },
    "occ.celebration": { en: "🎉 Celebration / party", zh: "🎉 庆祝派对", id: "🎉 Perayaan / pesta" },
    specialNoted: {
      en: "Special request noted: {r} ✨",
      zh: "已记录特别需求：{r} ✨",
      id: "Permintaan khusus dicatat: {r} ✨",
    },
    bookAskHours: {
      en: "How many hours? (minimum 2 — reply a number)",
      zh: "预订几小时？（最少 2 小时，请回复数字）",
      id: "Berapa jam? (minimal 2 — balas angka)",
    },
    bookDone: {
      en: "Booked! ✅ {day} at {time} for {n} pax. Our team will confirm shortly. View it in the app: {url}/bookings 💜",
      zh: "预订成功！✅ {day} {time}，{n} 位。我们的团队会尽快确认。可在应用查看：{url}/bookings 💜",
      id: "Berhasil! ✅ {day} jam {time} untuk {n} orang. Tim kami akan konfirmasi. Lihat di app: {url}/bookings 💜",
    },
    bookNeedAcct: {
      en: "Let's set up your account first — what's your name?",
      zh: "先帮您开通账户吧——请问您的名字？",
      id: "Kita buat akun dulu ya — siapa nama Anda?",
    },
    songAsk: {
      en: "🎤 Which song? Send it as: Song name - Singer",
      zh: "🎤 想点哪首歌？请按：歌名 - 歌手 发送",
      id: "🎤 Lagu apa? Kirim: Judul lagu - Penyanyi",
    },
    songDone: {
      en: "🎤 Added to the queue: {title}{artist}{pos}. We'll message you when it's your turn — see the full queue in the app (Songs › Queue). 💜",
      zh: "🎤 已加入点歌队列：{title}{artist}{pos}。轮到你时我们会通知你——完整队列请在应用查看（点歌 › 队列）。💜",
      id: "🎤 Masuk antrean: {title}{artist}{pos}. Kami kabari saat giliranmu — lihat antrean lengkap di aplikasi (Lagu › Antrean). 💜",
    },
    songPos: { en: " — you're #{n}", zh: "——你排第 {n} 位", id: " — kamu nomor {n}" },
    songOnNow: {
      en: "🎤 You're on now: {song}! Grab the mic. 💜",
      zh: "🎤 轮到你唱了：{song}！拿起麦克风吧。💜",
      id: "🎤 Giliranmu sekarang: {song}! Ambil mic-nya. 💜",
    },
    review: {
      en: "Thanks for coming to {club}! ⭐ How was it? Reply 1-5 stars.{link}",
      zh: "感谢光临 {club}！⭐ 体验如何？请回复 1-5 星。{link}",
      id: "Terima kasih sudah ke {club}! ⭐ Bagaimana? Balas 1-5 bintang.{link}",
    },
    reviewThanks: {
      en: "Thank you for the {n}⭐! {extra}",
      zh: "感谢你的 {n}⭐！{extra}",
      id: "Terima kasih atas {n}⭐! {extra}",
    },
    bookNoShow: {
      en: "😔 Your booking at {club} ({when}) has been cancelled because you didn't arrive within 15 minutes of the booking time. The table is now free for other guests.\n\nWant to come another time? Reply \"booking\" here or book in the app: {url} 💜",
      zh: "😔 您在 {club} 的预订（{when}）已取消，因为您未在预订时间后 15 分钟内到达。该座位已释放给其他客人。\n\n想改天再来？回复「预订」或在 App 中预订：{url} 💜",
      id: "😔 Booking Anda di {club} ({when}) dibatalkan karena Anda tidak datang dalam 15 menit dari waktu booking. Meja sudah dibuka untuk tamu lain.\n\nMau datang di lain waktu? Balas \"booking\" di sini atau booking di app: {url} 💜",
    },
    cancelNone: {
      en: "You don't have any upcoming bookings to cancel. Reply \"booking\" to make one. 💜",
      zh: "您目前没有可取消的预订。回复「预订」即可新建预订。💜",
      id: "Anda tidak punya booking mendatang untuk dibatalkan. Balas \"booking\" untuk membuat booking. 💜",
    },
    cancelPick: {
      en: "Which booking do you want to cancel?\n{list}\n\nReply with the number, or \"menu\" to go back.",
      zh: "您要取消哪一个预订？\n{list}\n\n请回复编号，或回复「菜单」返回。",
      id: "Booking mana yang ingin dibatalkan?\n{list}\n\nBalas dengan nomornya, atau \"menu\" untuk kembali.",
    },
    cancelDone: {
      en: "✅ Your booking ({what}) has been cancelled. We've let the team know. Reply \"booking\" any time to book again. 💜",
      zh: "✅ 您的预订（{what}）已取消，我们已通知团队。随时回复「预订」即可重新预订。💜",
      id: "✅ Booking Anda ({what}) sudah dibatalkan. Tim kami sudah diberi tahu. Balas \"booking\" kapan saja untuk booking lagi. 💜",
    },
    bookReminder: {
      en: "⏰ Reminder: your booking at {club} is {when} — in about {left}.{where} See you soon! 💜",
      zh: "⏰ 提醒：您在 {club} 的预订时间为 {when}，大约还有 {left}。{where} 期待您的光临！💜",
      id: "⏰ Pengingat: booking Anda di {club} pada {when} — sekitar {left} lagi.{where} Sampai jumpa! 💜",
    },
  };
  let s = (T[key]?.[lang]) || T[key]?.en || "";
  for (const k in vars) s = s.replaceAll(`{${k}}`, vars[k]);
  return s;
}

export { L as waText };

// A start time for display: "7pm" in English, "19:00" in Chinese/Bahasa.
export function timeText(lang: Lang, slot: string, enLabel?: string): string {
  return lang === "en" ? (enLabel || slot) : slot;
}
// Opening-hours text ("5pm – 2am" / "Closed") in the member's language.
function hoursText(lang: Lang, s: string): string {
  if (!s || s === "Closed") return L(lang, "closed");
  if (lang === "en") return s;
  return s.replace(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/gi, (_m, h, mi, ap) => {
    let hh = Number(h) % 12; if (/pm/i.test(ap)) hh += 12;
    return `${String(hh).padStart(2, "0")}:${mi || "00"}`;
  });
}
// Booking titles are stored in English ("KTV Lounge (Level 1) · Table V1 · Party of 4").
export function localizeBookingText(lang: Lang, s: string | null | undefined): string {
  if (!s) return L(lang, "booking");
  if (s === "Booking") return L(lang, "booking");
  return s.replace(/Party of (\d+)/g, (_m, n) => L(lang, "partyOf", { n })).replace(/\bTable (\S+)/g, (_m, t) => L(lang, "tableX", { t }))
    .replace(/([^·/()]+?) \((Level [^)]+)\)/g, (_m, name, lvl) => `${areaNameIn({ name: name.trim() }, lang)} (${areaLevelIn(lvl, lang)})`);
}
function tableList(lang: Lang, area: BookingArea, tables: string[]): string {
  return tables.map((t, i) => {
    const cap = tableCap(area, t);
    return hasPaxLimit(cap) ? L(lang, "tableLine", { i: String(i + 1), t, cap: String(cap) }) : L(lang, "tableLineNoMax", { i: String(i + 1), t });
  }).join("\n");
}
// "👥 4 to 6 pax" for the tables on offer (blank when none has a max).
function paxRange(lang: Lang, area: BookingArea, tables: string[]): string {
  const caps = tables.map((t) => tableCap(area, t));
  const limited = caps.filter(hasPaxLimit);
  if (!limited.length) return "";
  const lo = Math.min(...limited), hi = Math.max(...limited);
  if (limited.length < caps.length) return L(lang, "paxRangeFrom", { lo: String(lo) });
  return lo === hi ? L(lang, "paxRangeOne", { n: String(hi) }) : L(lang, "paxRange", { lo: String(lo), hi: String(hi) });
}
// The "choose your table" question for the free tables.
function tableQuestion(lang: Lang, area: BookingArea, tables: string[]): string {
  const range = paxRange(lang, area, tables);
  return L(lang, area.image ? "bookAskTable" : "bookAskTableNoImg", { range: range ? `${range}\n` : "", list: tableList(lang, area, tables) });
}

function memberMenu(lang: Lang, contact: Contact): string {
  return L(lang, "menu", { name: (contact.name || L(lang, "friend")).split(" ")[0] });
}

function memberMenuChoices(lang: Lang): WhatsAppChoice[] {
  if (lang === "zh") return [{ id: "menu_book", title: "🗓️ 预订" }, { id: "menu_song", title: "🎤 点歌" }, { id: "menu_bottle", title: "🍾 我的寄存酒" }];
  if (lang === "id") return [{ id: "menu_book", title: "🗓️ Booking" }, { id: "menu_song", title: "🎤 Minta lagu" }, { id: "menu_bottle", title: "🍾 Botol saya" }];
  return [{ id: "menu_book", title: "🗓️ Booking" }, { id: "menu_song", title: "🎤 Request song" }, { id: "menu_bottle", title: "🍾 Kept bottles" }];
}

// welcomeBack: greeting menu · "more": "anything else meanwhile?" after we hand over to staff.
async function sendMemberMenu(from: string, contact: Contact, lang: Lang, welcomeBack: boolean | "more" = false) {
  const name = (contact.name || L(lang, "friend")).split(" ")[0];
  const text = welcomeBack === "more" ? L(lang, "menuMore") : welcomeBack ? L(lang, "welcomeBackMenu", { name }) : memberMenu(lang, contact);
  await sendWhatsAppChoices(from, text, memberMenuChoices(lang));
  await logMsg(contact.id, contact.phone, "out", text, true);
}

async function createMemberFromContact(c: Contact): Promise<{ email: string; created: boolean }> {
  const email = (c.email || "").toLowerCase();
  // No email: the account is made with the phone number only (login = phone number).
  const existing = email ? await storage.getUserByEmail(email) : await linkExistingUserByPhone(c.phone);
  if (existing) {
    await patchContact(c.id, { userId: existing.id, stage: "member" });
    return { email, created: false };
  }
  const user = await storage.createUser({
    email: email || null,
    password: DEFAULT_PASSWORD,
    firstName: (c.name || "Guest").split(" ")[0],
    lastName: (c.name || "").split(" ").slice(1).join(" "),
    phoneNumber: c.phone,
    authProvider: "email",
  });
  // Force a password change on first login, and assign the house referral account
  // (un-referred signups belong to admin for commission).
  const house = await settingVal("houseReferralUserId");
  await db.update(users).set({
    mustChangePassword: true,
    ...(house ? { referredById: house } : {}),
  }).where(eq(users.id, user.id));
  await patchContact(c.id, { userId: user.id, stage: "member" });
  return { email, created: true };
}

// Public entry used by both the Cloud API webhook and the QR-linked Web session.
// Meta retries webhooks and the linked Web session can re-emit messages, so drop
// repeats by message id, and handle one message per number at a time so a second
// message can't race the first and read a stale onboarding stage.
const seenMsgIds = new Map<string, number>();
const phoneQueues = new Map<string, Promise<unknown>>();
export async function handleInboundText(from: string, text: string, profileName?: string, msgId?: string) {
  await loadWaConfig();
  if (msgId) {
    if (seenMsgIds.has(msgId)) return;
    seenMsgIds.set(msgId, Date.now());
    if (seenMsgIds.size > 5000) for (const k of Array.from(seenMsgIds.keys()).slice(0, 1000)) seenMsgIds.delete(k);
  }
  const key = from.replace(/\D/g, "");
  const prev = phoneQueues.get(key) || Promise.resolve();
  // Handle this number's messages in order — but never wait forever on a stuck
  // earlier one (that left chats silent mid-booking): move on after 45s.
  const waitPrev = Promise.race([prev.catch(() => {}), new Promise<void>((r) => setTimeout(r, 45_000))]);
  const run = waitPrev.then(() => handleInboundOnce(from, text, profileName));
  phoneQueues.set(key, run);
  try { return await run; } finally { if (phoneQueues.get(key) === run) phoneQueues.delete(key); }
}
async function handleInboundOnce(from: string, text: string, profileName?: string) {
  try {
    return await handleInbound(from, text, profileName);
  } catch (e: any) {
    // Watcher (Admin › Errors): the bot crashed on this message.
    void import("./errorWatch").then((m) => m.recordError({ area: "whatsapp", source: "whatsapp", method: "IN", path: from.replace(/\D/g, ""), status: 500, message: `Bot error on "${text.slice(0, 80)}": ${e?.message || e}`, detail: String(e?.stack || "") })).catch(() => {});
    throw e;
  } finally {
    // WhatsApp updates happen outside the app's HTTP mutations. Wake every open
    // screen after processing so bookings, messages, songs and CRM data appear now.
    emitLiveUpdate("/api/reborn/whatsapp", { action: "WHATSAPP_INBOUND" });
  }
}

const MAX_BOT_REPLIES = 10; // stop auto-replying to a number after this many bot messages

// "AI" (any case, with or without "assistant") turns a paused chat's auto-reply back on.
const AI_BACK_RE = /^\s*(ai|a\.i\.?|ai assistant|asisten ai|ai助手|ai 助手|人工智能)\s*[!.。]?\s*$/i;
async function say0(c: Contact, from: string, msg: string) { await sendWhatsApp(from, msg); await logMsg(c.id, c.phone, "out", msg, true); }

// Is this message exactly a song in our library? (title, or its pinyin — "ni hao bu hao" = 你好不好)
async function isLibrarySong(text: string): Promise<boolean> {
  const t = text.trim().toLowerCase().replace(/\s+/g, " ");
  if (t.length < 2 || t.length > 60) return false;
  const py = textPinyin(t).toLowerCase().replace(/\s+/g, " ").trim();
  const norm = (col: any) => sql`lower(regexp_replace(${col}, '\s+', ' ', 'g'))`;
  const [hit] = await db.select({ id: songs.id }).from(songs)
    .where(sql`${norm(songs.title)} = ${t} OR ${norm(songs.titlePinyin)} = ${t} OR ${norm(songs.titlePinyin)} = ${py}`).limit(1);
  return !!hit;
}

// Messages that aren't about the club (delivery, courier, sales…) go straight to staff.
const OFF_TOPIC_RE = /\b(deliver(y|ies|ing)?|courier|kurir|paket|parcel|package|shipment|ekspedisi|ojol|gojek|grab ?(food|express)|shopee ?food|cod\b|invoice|tagihan|supplier|vendor|sales|promosi|kerja ?sama|collaborat|partnership|job|lowongan|loker|interview|wawancara)\b|快递|外卖|送货|包裹|供应商|合作|应聘|招聘|发票/i;
function guessLang(body: string, fallback: Lang): Lang {
  return /[\u4e00-\u9fff]/.test(body) ? "zh" : /\b(saya|ada|untuk|mau|bisa|kirim|paket|tolong|dengan|yang|ini)\b/i.test(body) ? "id" : fallback;
}
// "We'll get back to you shortly" once, then the bot stays silent for this number
// until an admin turns it back on (CRM inbox). Staff are told straight away.
async function handOffToStaff(c: Contact, from: string, lang: Lang, body: string) {
  const reply = L(lang, "faqUnknown");
  await sendWhatsApp(from, reply);
  await logMsg(c.id, c.phone, "out", reply, true);
  await patchContact(c.id, { botPaused: true, waState: { flow: null }, ...(c.userId ? {} : { lang }) }); // remember their language for when they type "AI"
  await notifyAdmin(`🙋 ${c.name || from} needs a person (bot paused for this number): "${body.slice(0, 160)}" — reply in Admin › CRM.`);
  await alertStaffMessage(c, from, body, true);
}
async function alertStaffMessage(c: Contact, from: string, body: string, first = false) {
  try {
    const { notifyStaffI18n, pushAdminsI18n } = await import("./rebornGame");
    const who = c.name || `+${from}`;
    const title = (lang: Lang) => first ? pick(lang, { en: "🙋 {who} needs a reply", zh: "🙋 {who} 需要人工回复", id: "🙋 {who} perlu dibalas" }, { who }) : pick(lang, { en: "💬 {who} (WhatsApp)", zh: "💬 {who}（WhatsApp）", id: "💬 {who} (WhatsApp)" }, { who });
    await notifyStaffI18n("whatsapp_handoff", (lang) => ({ title: title(lang), body: body.slice(0, 140) }), { path: "/reborn-admin", crmContactId: c.id });
    await pushAdminsI18n((lang) => ({ title: title(lang), body: body.slice(0, 140), url: "/reborn-admin", tag: `wa-${c.id}` }));
  } catch (e) { waError("staff alert", e); }
}

// "What do you have?" / "facilities?" / "有什么？" / "ada apa saja?" → list everything we offer.
const ABOUT_RE = /what (do |does )?(you|u|ur club|your club|the club)( guys)? (have|got|offer)|what('?s| is) (there|available|in (your|the) club)|what can (i|we) (do|book)|\bfacilit|\bamenit|\bservices\b|有什么|有啥|有哪些|设施|服务项目|\bada apa\b|\bfasilitas\b|\blayanan apa\b|\bpunya apa\b/i;
const AREA_EMOJI: [RegExp, string][] = [[/vip/i, "👑"], [/ktv|karaoke/i, "🎤"], [/game/i, "🎮"], [/beauty|spa|salon/i, "💅"], [/pet/i, "🐾"], [/restaurant|food|dining|cafe/i, "🍽️"], [/bar|lounge/i, "🍸"]];
// Everything set up in the booking areas, with today's hours — reply a number to book it.
async function sendWhatWeHave(c: Contact, lang: Lang, say: (m: string) => Promise<void>) {
  const areas = enabledAreas(await settingVal("bookingAreas"));
  const club = (await settingVal("clubName")) || (await loadWaConfig()).club || "Reborn Wave Group";
  const today = todayStr();
  const list = areas.map((a, i) => {
    const emoji = (AREA_EMOJI.find(([re]) => re.test(a.name)) || [, "✨"])[1];
    const count = a.tables.length ? ` · ${L(lang, "aboutTables", { n: String(a.tables.length) })}` : "";
    return `${i + 1}. ${emoji} ${areaNameIn(a, lang)} (${areaLevelIn(a.level, lang)})${count}\n    🕒 ${hoursText(lang, areaHoursTextForDate(a, today))}`;
  }).join("\n");
  // Not signed up yet → ask their name to make the free member account (needed to book).
  if (!c.userId) {
    await say(`${L(lang, "aboutIntro", { club })}\n\n${list}\n\n${L(lang, "aboutJoin")}`);
    return patchContact(c.id, { lang, stage: "await_name", waState: { flow: null } });
  }
  const canBook = areas.length > 0 && !(await featureOff("bookings"));
  await say(`${L(lang, "aboutIntro", { club })}\n\n${list}\n\n${L(lang, canBook ? "aboutBook" : "aboutMore")}`);
  if (canBook) return patchContact(c.id, { waState: { flow: "book", step: "area" } });
}

function parseMenuIntent(s: string): "book" | "song" | "bottle" | "events" | "menu" | null {
  const t = s.trim().toLowerCase();
  if (/^menu_events$|^4$|\bevents?\b|\bpromos?\b|\bpromotions?\b|what'?s on|活动|活動|优惠|\bacara\b|\bpromo\b|\bevent\b/.test(t)) return "events";
  if (/^menu_book$|^1$|\bbook(ing)?\b|\btables?\b|\breserv|\bappointment|预订|订位|\bmeja\b|\bpesan meja\b/.test(t)) return "book";
  if (/^menu_song$|^2$|\bsongs?\b|^sing\b|\brequest a song\b|点歌|唱歌|\blagu\b/.test(t)) return "song";
  if (/^menu_bottle$|^3$|\bbottles?\b|\bmy drinks?\b|\bkept\b|\bkeep\b|寄存|存酒|\bbotol\b|\bsimpan\b/.test(t)) return "bottle";
  if (/^(menu|hi|hello|hey|start|help|0|你好|嗨|halo|hai)$/.test(t)) return "menu";
  return null;
}
// Display a YYYY-MM-DD date as "Mon 30-09-2025" (周一 / Sen) for members.
const WD: Record<Lang, string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  zh: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
  id: ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"],
};
// "Wednesday 13/10/2026" / "星期三 13/10/2026" / "Rabu 13/10/2026" for confirming a date.
const WD_FULL: Record<Lang, string[]> = {
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  zh: ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"],
  id: ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
};
function fmtLong(iso: string, lang: Lang): string {
  const [y, m, d] = iso.split("-");
  return `${WD_FULL[lang][weekdayOfIso(iso)]} ${d}/${m}/${y}`;
}
export function fmtDMY(iso: string, lang: Lang = "en"): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const wd = WD[lang][dt.getDay()];
  return `${wd} ${String(d).padStart(2, "0")}-${String(m).padStart(2, "0")}-${y}`;
}
function weekdayOf(dateStr: string): number { const [y, m, d] = dateStr.split("-").map(Number); return new Date(y, m - 1, d).getDay(); }

// --- Natural-language booking ("book KTV Lounge next Wednesday 6pm for 4 pax") ---
// A date anywhere in a one-line request ("book KTV next Wednesday 6pm"), any language.
function nlDate(body: string): string | null {
  const r = parseDateInput(body, todayStr());
  return r && r.kind !== "askDay" ? r.date : null;
}
function nlHourToSlot(body: string, area: BookingArea, date: string): string | null {
  const m = body.toLowerCase().match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/g);
  if (!m) return null;
  const slots = areaSlotsForDate(area, date);
  for (const raw of m) {
    const mm = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/); if (!mm) continue;
    let h = Number(mm[1]); const ap = mm[3];
    if (ap === "pm" && h < 12) h += 12; if (ap === "am" && h === 12) h = 0;
    if (!ap && h <= 7) h += 12; // bare "6" at a nightlife venue = 6pm
    const want = `${String(h).padStart(2, "0")}:00`;
    if (slots.includes(want)) return want;
    const near = slots.find((s) => Math.abs(Number(s.split(":")[0]) - h) <= 1);
    if (near) return near;
  }
  return null;
}
function nlParty(body: string): number | null {
  const m = body.match(/(\d+)\s*(pax|ppl|people|persons?|guests?|orang)/i) || body.match(/\bfor\s+(\d+)\b/i);
  return m ? Math.max(1, Math.min(50, Number(m[1]))) : null;
}
function nlArea(body: string, areas: BookingArea[]): BookingArea | null {
  const t = body.toLowerCase();
  let best: BookingArea | null = null, bestScore = 0;
  for (const a of areas) {
    const words = a.name.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
    const score = words.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; best = a; }
  }
  return bestScore > 0 ? best : null;
}
function nlTable(body: string, area: BookingArea): string | null {
  const t = body.toLowerCase();
  for (const tb of area.tables) if (new RegExp(`(^|\\W)${tb.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\W|$)`).test(t)) return tb;
  return null;
}

async function handleInbound(from: string, text: string, profileName?: string) {
  const body = (text || "").trim();
  let c = await getOrCreateContact(from, profileName);
  await patchContact(c.id, { lastInboundAt: new Date() });
  await logMsg(c.id, c.phone, "in", body, false); // store every incoming message for the admin inbox

  // Handed to staff: the bot stays silent for this number (admin replies from the
  // CRM inbox, and can turn the bot back on there). Staff just get a heads-up.
  // …unless they type "AI": the auto-reply comes back on for them.
  if (c.botPaused && AI_BACK_RE.test(body)) {
    await patchContact(c.id, { botPaused: false, waState: { flow: null } });
    c = { ...c, botPaused: false } as Contact;
    const aiLang = c.userId ? ((await accountLang(c.userId)) || (c.lang as Lang) || "en") : ((c.lang as Lang) || "en");
    const back = L(aiLang, "aiBack");
    await sendWhatsApp(from, back); await logMsg(c.id, c.phone, "out", back, true);
    if (c.stage === "member" || c.stage === "active") await sendMemberMenu(from, c, aiLang);
    else { await say0(c, from, L(aiLang, "askName")); await patchContact(c.id, { lang: aiLang, stage: "await_name" }); }
    return;
  }
  if (c.botPaused) { await alertStaffMessage(c, from, body); return; }

  // Always answer a location question immediately, even for a first-time number —
  // except while they're typing a special request mid-booking ("靠窗的位置" = a seat).
  const midRequest = ["special", "specialNote", "cake"].includes(((c.waState as any) || {}).step);
  if (asksForLocation(body) && !midRequest) {
    const reply = await locationReply(await langForPhone(c.phone, c.userId));
    await sendWhatsApp(from, reply);
    await logMsg(c.id, c.phone, "out", reply, true);
    return;
  }

  // "change english / chinese / bahasa" — switch the reply language at any point.
  const switchTo = parseLangSwitch(body);

  // If this phone already has an app account, skip onboarding — greet by name.
  if (!c.userId && (c.stage === "new" || c.stage === "await_lang" || c.stage === "await_name" || c.stage === "await_email")) {
    const u = await linkExistingUserByPhone(c.phone);
    if (u) {
      const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "there";
      const uLang = (switchTo || (["en", "zh", "id"].includes((u as any).preferredLanguage) ? (u as any).preferredLanguage : c.lang)) as Lang;
      await patchContact(c.id, { userId: u.id, name, stage: "member", lang: uLang });
      c = { ...c, userId: u.id, name, stage: "member", lang: uLang } as Contact;
      if (switchTo) await db.update(users).set({ preferredLanguage: switchTo }).where(eq(users.id, u.id)).catch(() => {});
      await sendMemberMenu(from, c, uLang, true);
      return;
    }
  }

  // A linked member's language follows their account (set in the app or here).
  let lang = (c.lang as Lang) || "en";
  if (c.userId && !switchTo) {
    const ul = await accountLang(c.userId);
    if (ul && ul !== lang) { lang = ul; await patchContact(c.id, { lang: ul }); c = { ...c, lang: ul } as Contact; }
  }
  const say = async (msg: string) => { await sendWhatsApp(from, msg); await logMsg(c.id, c.phone, "out", msg, true); };
  const wa: any = (c.waState as any) || {};

  if (switchTo) {
    await patchContact(c.id, { lang: switchTo });
    c = { ...c, lang: switchTo } as Contact;
    if (c.userId) await db.update(users).set({ preferredLanguage: switchTo }).where(eq(users.id, c.userId)).catch(() => {});
    await say(L(switchTo, "langChanged"));
    // Carry on from where they were, now in the new language.
    if (c.stage === "new" || c.stage === "await_lang") { await say(L(switchTo, "askName")); return patchContact(c.id, { stage: "await_name" }); }
    if (c.stage === "await_name") { await say(L(switchTo, "askName")); return; }
    if (c.stage === "await_email") { await say(L(switchTo, "askEmail", { name: c.name || "" })); return; }
    await sendMemberMenu(from, c, switchTo);
    return patchContact(c.id, { waState: { flow: null } });
  }

  // Not about the club at all (a delivery, courier, sales call…) → one "we'll get
  // back to you" and hand the chat to staff; no more bot replies to this number.
  if (OFF_TOPIC_RE.test(body) && !((c.waState as any) || {}).flow) return handOffToStaff(c, from, c.userId ? lang : guessLang(body, lang), body);

  // A new number asking "what do you have?" gets the list first (in the language they wrote in).
  if (!c.userId && (c.stage === "new" || c.stage === "await_lang" || c.stage === "await_name") && ABOUT_RE.test(body)) {
    const guess: Lang = c.stage === "await_name" && c.lang ? (c.lang as Lang) : /[\u4e00-\u9fff]/.test(body) ? "zh" : /\b(ada|apa|fasilitas|layanan|punya|saja|aja)\b/i.test(body) ? "id" : "en";
    return sendWhatWeHave(c, guess, say);
  }

  // --- ONBOARDING (new numbers) ---
  if (c.stage === "new") {
    await sendWhatsAppChoices(from, WELCOME_TRILINGUAL, [
      { id: "lang_en", title: "English" },
      { id: "lang_zh", title: "中文" },
      { id: "lang_id", title: "Bahasa Indonesia" },
    ]);
    await logMsg(c.id, c.phone, "out", WELCOME_TRILINGUAL, true);
    return patchContact(c.id, { stage: "await_lang" });
  }
  if (c.stage === "await_lang") {
    const picked = parseLang(body);
    if (!picked) { // not a language answer — show the language menu again instead of guessing
      // Ignored the language menu twice and wrote something else → a person should answer.
      if (((c.waState as any) || {}).langTries >= 1 && body.split(/\s+/).length >= 3) return handOffToStaff(c, from, guessLang(body, "en"), body);
      await patchContact(c.id, { waState: { ...((c.waState as any) || {}), langTries: (((c.waState as any) || {}).langTries || 0) + 1 } });
      await sendWhatsAppChoices(from, WELCOME_TRILINGUAL, [
        { id: "lang_en", title: "English" },
        { id: "lang_zh", title: "中文" },
        { id: "lang_id", title: "Bahasa Indonesia" },
      ]);
      await logMsg(c.id, c.phone, "out", WELCOME_TRILINGUAL, true);
      return;
    }
    await say(L(picked, "askName"));
    return patchContact(c.id, { lang: picked, stage: "await_name" });
  }
  if (c.stage === "await_name") {
    // A bare 1/2/3 here is a late language pick — switch language, then ask the name in it.
    if (/^[123]$|^lang_(en|zh|id)$/.test(body.toLowerCase())) {
      const picked = parseLang(body)!;
      await say(L(picked, "askName"));
      return patchContact(c.id, { lang: picked });
    }
    if (!looksLikeName(body)) { await say(L(lang, "askName")); return; }
    await say(L(lang, "askEmail", { name: body }));
    return patchContact(c.id, { name: body, stage: "await_email" });
  }
  if (c.stage === "await_email") {
    const m = body.match(EMAIL_RE);
    if (!m && NO_EMAIL_RE.test(body)) {
      // No email → sign up with the phone number; they log in with it.
      const { created } = await createMemberFromContact({ ...c, email: null } as Contact);
      const phone = localPhone(c.phone);
      await say(created ? L(lang, "readyPhone", { url: memberAppUrl(), phone, pw: DEFAULT_PASSWORD }) : L(lang, "welcomeBackPhone", { url: memberAppUrl(), phone }));
      await sendMemberMenu(from, c, lang);
      return patchContact(c.id, { waState: { flow: null } });
    }
    if (!m) { await say(L(lang, "badEmail")); return; }
    await patchContact(c.id, { email: m[0].toLowerCase() });
    const { email, created } = await createMemberFromContact({ ...c, email: m[0].toLowerCase() } as Contact); // sets stage=member
    await say(created ? L(lang, "ready", { url: memberAppUrl(), email, pw: DEFAULT_PASSWORD }) : L(lang, "welcomeBack", { url: memberAppUrl(), email }));
    // Second message: the WhatsApp menu shortcuts.
    await sendMemberMenu(from, c, lang);
    return patchContact(c.id, { waState: { flow: null } });
  }

  // --- REVIEW REPLY (after payment) ---
  if (wa.flow === "review") {
    const stars = Number((body.match(/[1-5]/) || [])[0] || 0);
    const extra = stars >= 4 ? (wa.reviewUrl ? L(lang, "reviewGoogle", { url: wa.reviewUrl }) : L(lang, "reviewSeeYou")) : L(lang, "reviewBetter");
    if (stars) { await say(L(lang, "reviewThanks", { n: String(stars), extra })); await notifyAdmin(`⭐ ${c.name || from} rated ${stars}/5`); return patchContact(c.id, { waState: { flow: null } }); }
    // not a rating → fall through to normal handling
  }

  // --- CANCEL A BOOKING --- ("cancel booking" / "batal booking" / "取消预订")
  if (CANCEL_BOOKING_RE.test(body)) return startCancelBooking(c, lang, say);
  if (wa.flow === "cancelbk") {
    if (/^(menu|cancel|stop|0|batal|取消|菜单)$/i.test(body)) { await patchContact(c.id, { waState: { flow: null } }); await sendMemberMenu(from, c, lang); return; }
    const ids: number[] = Array.isArray(wa.ids) ? wa.ids : [];
    const n = Number((body.match(/\d+/) || [])[0] || 0);
    if (n >= 1 && n <= ids.length) return finishCancelBooking(c, lang, ids[n - 1], say);
    // Not a valid pick → leave the cancel flow and handle the message normally.
    await patchContact(c.id, { waState: { flow: null } });
  }

  // --- ACTIVE FLOWS ---
  // "menu" / "cancel" always leaves a booking or song flow.
  const zeroMeansNotListed = wa.flow === "song" && wa.step === "pick" && body.trim() === "0";
  if ((wa.flow === "book" || wa.flow === "song") && !zeroMeansNotListed && /^(menu|cancel|stop|0|batal|取消|菜单)$/i.test(body)) {
    await patchContact(c.id, { waState: { flow: null } });
    await sendMemberMenu(from, c, lang);
    return;
  }
  if ((wa.flow === "book" || wa.flow === "song") && BACK_RE.test(body.trim())) {
    return wa.flow === "book" ? bookingBack(c, lang, from, wa, say) : songBack(c, lang, wa, say);
  }
  if (wa.flow === "book") return bookingStep(c, lang, from, body, wa, say);
  if (wa.flow === "song") return songStep(c, lang, from, body, wa, say);
  // Told to scan their table QR before requesting: the next message is almost
  // always the song name — never hand it to staff as an unknown question.
  if (wa.flow === "songWait") {
    const fresh = Date.now() - Number(wa.at || 0) < 30 * 60_000;
    const leaving = /^(menu|cancel|stop|0|batal|取消|菜单)$/i.test(body.trim()) || parseMenuIntent(body) !== null;
    if (fresh && !leaving) {
      if (c.userId && await songTableBlocked(c.userId)) { await say(L(lang, "songStillNeedTable", { song: body.trim().slice(0, 60) })); return; }
      return songStep(c, lang, from, body, { flow: "song", step: "name" }, say); // checked in now → request it
    }
    await patchContact(c.id, { waState: { flow: null } }); // expired or they picked something else
  }

  // --- WHAT WE HAVE --- ("what do you have?", "facilities", "有什么", "ada apa saja")
  if (ABOUT_RE.test(body)) return sendWhatWeHave(c, lang, say);

  // --- MENU INTENTS (work for members & returning contacts) ---
  const intent = parseMenuIntent(body);
  const offKey = intent === "book" ? "bookings" : intent === "song" ? "songs" : intent === "bottle" ? "bottles" : "";
  if (offKey && await featureOff(offKey)) { await say(L(lang, "featureOff")); return; }
  if (intent === "book") return handleBookIntent(c, lang, from, body, say);
  if (intent === "song") {
    if (c.userId && await songTableBlocked(c.userId)) { await say(L(lang, "songNeedTable")); return patchContact(c.id, { waState: { flow: "songWait", at: Date.now() } }); }
    await say(withNav(lang, L(lang, "songAskName"))); return patchContact(c.id, { waState: { flow: "song", step: "name" } });
  }
  if (intent === "bottle") return showBottles(c, lang, say);
  if (intent === "events") return sendAllEvents(c, from, lang);
  if (intent === "menu") { await sendMemberMenu(from, c, lang); return; }

  // --- No recognized command ---
  if (c.stage === "member" || c.stage === "active") {
    // Answer general enquiries from the FAQ knowledge base.
    const ans = await faqAnswer(body, lang);
    if (ans) { await say(ans); return; }
    // Greeting with no FAQ hit → show the menu.
    if (/\b(hi|hello|hey|enquir|enquiries|question|help|menu|halo|hai|selamat|tanya|bantuan)\b|你好|您好|咨询|请问|帮助|菜单/i.test(body)) {
      await sendMemberMenu(from, c, lang, true);
      return;
    }
    // A song from our library (title, Chinese or pinyin) → treat it as a song request.
    if (c.userId && !(await featureOff("songs")) && await isLibrarySong(body)) {
      if (await songTableBlocked(c.userId)) { await say(L(lang, "songNeedTable")); return patchContact(c.id, { waState: { flow: "songWait", at: Date.now() } }); }
      return songStep(c, lang, from, body, { flow: "song", step: "name" }, say);
    }
    // Unknown → log a pending FAQ and hand the chat to staff (bot goes quiet).
    await createPendingFaq(body);
    return handOffToStaff(c, from, lang, body);
  }
  // Still onboarding-ish → nudge with the menu (capped).
  if ((c.botReplies || 0) < MAX_BOT_REPLIES) { await sendMemberMenu(from, c, lang); await patchContact(c.id, { botReplies: (c.botReplies || 0) + 1 }); }
}

// Find an existing app account by phone number (digit-normalised, endsWith either way).
async function linkExistingUserByPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return null;
  const tail = digits.slice(-8);
  const cands = await db.select().from(users).where(and(isNotNull(users.phoneNumber), ilike(users.phoneNumber, `%${tail}%`)));
  return cands.find((u) => {
    const d = (u.phoneNumber || "").replace(/\D/g, "");
    return d && (d.endsWith(digits) || digits.endsWith(d));
  }) || null;
}

// Match the message against active FAQ items with an answer.
async function faqAnswer(body: string, lang: Lang = "en"): Promise<string | null> {
  const lc = body.toLowerCase();
  const faqs = await db.select().from(faqItems).where(eq(faqItems.active, true));
  let best: any = null, bestScore = 0;
  for (const f of faqs) {
    if (!f.answer || !f.answer.trim()) continue;
    const kws = (f.keywords || "").toLowerCase().split(",").map((k) => k.trim()).filter(Boolean);
    let score = 0;
    for (const k of kws) if (k && lc.includes(k)) score += 2;
    // match the question in any language (the member may ask in 中文 or Bahasa)
    for (const q of [f.question, faqIn(f as any, "zh").question, faqIn(f as any, "id").question]) if (q && lc.includes(q.toLowerCase().slice(0, 12))) { score += 1; break; }
    if (score > bestScore) { bestScore = score; best = f; }
  }
  return bestScore > 0 ? faqIn(best, lang).answer : null;
}

// Log an unanswered question as an inactive FAQ item (admin fills the answer later).
async function createPendingFaq(question: string) {
  try {
    const q = question.slice(0, 200);
    const existing = await db.select().from(faqItems).where(ilike(faqItems.question, q));
    if (existing.length) return;
    const kws = Array.from(new Set(q.toLowerCase().replace(/[^a-z0-9\u3400-\u9fff\s]/gi, " ").split(/\s+/).filter((w) => w.length > 3))).slice(0, 8).join(",");
    await db.insert(faqItems).values({ question: q, answer: "", keywords: kws, active: false, sortOrder: 200 });
  } catch (e) { waError("pending faq", e); }
}

// Offer a booking (used right after signup). Sends an area image if one is set.
async function offerBooking(c: Contact, lang: Lang, from: string) {
  const caption = L(lang, "bookOffer", { hours: L(lang, "hoursSummary") });
  const areas = enabledAreas(await settingVal("bookingAreas"));
  const img = areas.find((a) => a.image)?.image || await settingVal("bookingImageUrl");
  if (img) await sendWhatsAppImage(from, img, caption); else await sendWhatsApp(from, caption);
  await logMsg(c.id, c.phone, "out", caption, true);
}

// Book intent — try to parse a full request from free text, else start the step flow.
async function pushWhatsAppBooking(row: any, c: Contact, area: BookingArea, date: string, time: string, party: number) {
  await sendRebornStaffNotification({
    type: "booking",
    title: "New WhatsApp booking",
    body: `${c.name || "Guest"} · ${area.name} · ${date} ${time} · ${party} pax`,
    data: { path: "/reborn-admin", bookingId: row.id, source: "whatsapp" },
  });
}

async function handleBookIntent(c: Contact, lang: Lang, from: string, body: string, say: (m: string) => Promise<void>) {
  if (!c.userId) { await say(L(lang, "bookNeedAcct")); return patchContact(c.id, { stage: "await_name", waState: { flow: null } }); }
  const areas = enabledAreas(await settingVal("bookingAreas"));
  const area = nlArea(body, areas);
  const date = nlDate(body);
  const slot = area && date ? nlHourToSlot(body, area, date) : null;
  if (area && date && slot) {
    const party = nlParty(body) || 2;
    const daySlots = areaSlotsForDate(area, date); const label = areaSlotLabelsForDate(area, date)[daySlots.indexOf(slot)] || slot;
    const openH = areaOpenHourForDate(area, date);
    if (area.tables.length) {
      const table = nlTable(body, area);
      if (table) {
        if (await isTableTaken(area, table, bookingWhen(openH, date, slot))) {
          const free = await freeTablesForDateSlot(area, date, slot);
          const list = tableList(lang, area, free);
          await say(withNav(lang, L(lang, tableDayLockOn() ? "tableTakenDay" : "tableTaken", { t: table, time: timeText(lang, slot, label), day: fmtDMY(date, lang), list })));
          return patchContact(c.id, { waState: { flow: "book", step: "table", areaId: area.id, date, slot, party } });
        }
        const cap = tableCap(area, table);
        if (party > cap) { await say(L(lang, "overCap", { t: table, cap: String(cap), n: String(party) })); return startBooking(c, lang, from, say); }
        // all details given in one message: ask for a special request first if that's on
        if (await askSpecialOn()) return askSpecialOrFinish(c, lang, from, area, { date, slot, table, party }, 2, say);
        const row = await createBooking({ userId: c.userId!, dateStr: date, slot, partySize: party, hours: 2, table, area: `${area.name} (${area.level})`, openHour: openH, companyId: (await defaultCompanyId()) ?? undefined });
        await pushWhatsAppBooking(row, c, area, date, label, party);
        await say(L(lang, "bookDone", { day: fmtDMY(date, lang), time: timeText(lang, slot, label), n: String(party), url: memberAppUrl() }));
        await notifyAdmin(`New WhatsApp booking #${row.id}: ${c.name || c.phone} · ${area.name} · ${fmtDMY(date)} ${label} · Table ${table} · ${party} pax — confirm in the app.`);
        await sendMemberMenu(from, c, lang);
        return patchContact(c.id, { waState: { flow: null } });
      }
      // Area needs a table but none named → ask, showing only free tables + caps.
      const free = await freeTablesForDateSlot(area, date, slot);
      const caption = withNav(lang, tableQuestion(lang, area, free));
      if (area.image) { await sendWhatsAppImage(from, area.image, caption); await logMsg(c.id, c.phone, "out", caption, true); } else await say(caption);
      return patchContact(c.id, { waState: { flow: "book", step: "table", areaId: area.id, date, slot, party } });
    }
    const row = await createBooking({ userId: c.userId!, dateStr: date, slot, partySize: party, hours: 2, area: `${area.name} (${area.level})`, openHour: openH });
    await pushWhatsAppBooking(row, c, area, date, label, party);
    await say(L(lang, "bookDone", { day: fmtDMY(date, lang), time: timeText(lang, slot, label), n: String(party), url: memberAppUrl() }));
    await notifyAdmin(`New WhatsApp booking #${row.id}: ${c.name || c.phone} · ${area.name} · ${fmtDMY(date)} ${label} · ${party} pax — confirm in the app.`);
    await sendMemberMenu(from, c, lang);
    return patchContact(c.id, { waState: { flow: null } });
  }
  // Not enough detail → run the guided flow.
  return startBooking(c, lang, from, say);
}

async function startBooking(c: Contact, lang: Lang, from: string, say: (m: string) => Promise<void>) {
  if (!c.userId) { await say(L(lang, "bookNeedAcct")); return patchContact(c.id, { stage: "await_name", waState: { flow: null } }); }
  const areas = enabledAreas(await settingVal("bookingAreas"));
  const list = areas.map((a, i) => `${i + 1}. ${areaNameIn(a, lang)} (${areaLevelIn(a.level, lang)})`).join("\n");
  await say(withNav(lang, L(lang, "bookAskArea", { list })));
  return patchContact(c.id, { waState: { flow: "book", step: "area" } });
}

const CANCEL_BOOKING_RE = /\b(cancel|batal(kan)?)\b.*\b(book(ing)?|reserv\w*|tempahan|meja)\b|取消(预订|预约|订位)/i;
const MEMBER_ACTIVE = ["pending", "scheduled", "confirmed"];
export const fmtBookingWhen = (d: Date | string, lang: Lang = "en") => new Date(d).toLocaleString(localeOf(lang), { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: lang === "en", timeZone: getBookingTimezone() });

async function startCancelBooking(c: Contact, lang: Lang, say: (m: string) => Promise<void>) {
  if (!c.userId) { await say(L(lang, "cancelNone")); return patchContact(c.id, { waState: { flow: null } }); }
  const rows = await db.select().from(appointments).where(and(
    eq(appointments.userId, c.userId), inArray(appointments.status, MEMBER_ACTIVE), gt(appointments.appointmentDate, new Date()),
  )).orderBy(appointments.appointmentDate).limit(5);
  if (!rows.length) { await say(L(lang, "cancelNone")); return patchContact(c.id, { waState: { flow: null } }); }
  if (rows.length === 1) return finishCancelBooking(c, lang, rows[0].id, say);
  const list = rows.map((r, i) => `${i + 1}️⃣ ${localizeBookingText(lang, r.title)} · ${fmtBookingWhen(r.appointmentDate, lang)} (${L(lang, "st." + r.status) || r.status})`).join("\n");
  await say(L(lang, "cancelPick", { list }));
  return patchContact(c.id, { waState: { flow: "cancelbk", ids: rows.map((r) => r.id) } });
}

async function finishCancelBooking(c: Contact, lang: Lang, id: number, say: (m: string) => Promise<void>) {
  await patchContact(c.id, { waState: { flow: null } });
  const [a] = await db.update(appointments).set({ status: "cancelled", adminNote: "Cancelled by member (WhatsApp)", updatedAt: new Date() })
    .where(and(eq(appointments.id, id), eq(appointments.userId, c.userId || "__none__"), inArray(appointments.status, MEMBER_ACTIVE))).returning();
  if (!a) { await say(L(lang, "cancelNone")); return; }
  await say(L(lang, "cancelDone", { what: `${localizeBookingText(lang, a.title)} · ${fmtBookingWhen(a.appointmentDate, lang)}` }));
  await notifyBookingCancelledByMember(a, "WhatsApp");
}

// Tell the team (WhatsApp admin line, app push, browser push) that a member cancelled.
export async function notifyBookingCancelledByMember(a: typeof appointments.$inferSelect, via: "app" | "WhatsApp") {
  const [u] = a.userId ? await db.select().from(users).where(eq(users.id, a.userId)) : [];
  const who = [u?.firstName, u?.lastName].filter(Boolean).join(" ") || u?.email || "Member";
  const when = fmtBookingWhen(a.appointmentDate);
  await notifyAdmin(`❌ Booking #${a.id} cancelled by ${who} (via ${via}): ${a.title} · ${when}${a.notes ? ` · ${a.notes}` : ""}. The slot is free again.`).catch(() => {});
  await sendRebornStaffNotification({ type: "booking_cancelled", title: "❌ Booking cancelled by member", body: `${who} · ${a.title} · ${when}`, data: { path: "/reborn-admin", bookingId: a.id } }).catch(() => {});
  sendPushToAdmins({ title: "❌ Booking cancelled", body: `${who} · ${a.title} · ${when}`, url: "/reborn-admin", tag: `cancelbk-${a.id}` }).catch(() => {});
  emitLiveUpdate("/api/reborn/admin/bookings", { action: "BOOKING_CANCELLED", resource: String(a.id) });
}

// "B" / back / 返回 / kembali: go one question back in a WhatsApp booking or song request.
const BACK_RE = /^(b|back|go back|返回|上一步|kembali|balik)$/i;
const withNav = (lang: Lang, m: string) => `${m}\n\n${L(lang, "navHint")}`;

// Step back one question in the guided booking and ask it again.
async function bookingBack(c: Contact, lang: Lang, from: string, wa: any, say: (m: string) => Promise<void>): Promise<unknown> {
  const areaId = wa.areaId;
  switch (wa.step) {
    case "area": await patchContact(c.id, { waState: { flow: null } }); return sendMemberMenu(from, c, lang);
    case "date": return startBooking(c, lang, from, say);
    case "weekday": case "dateConfirm": case "slot":
      await say(withNav(lang, L(lang, "bookAskDate")));
      return patchContact(c.id, { waState: { flow: "book", step: "date", areaId } });
    case "table":
      return bookingStep(c, lang, from, "", { flow: "book", step: "date", areaId, confirmedDate: wa.date }, say);
    case "special": case "specialNote": case "cake":
      if (await askHoursOn()) { await say(withNav(lang, L(lang, "bookAskHours"))); return patchContact(c.id, { waState: { ...wa, step: "hours" } }); }
      if (wa.table) { await say(withNav(lang, L(lang, "bookAskParty"))); return patchContact(c.id, { waState: { ...wa, step: "party" } }); }
      return bookingStep(c, lang, from, "", { flow: "book", step: "date", areaId, confirmedDate: wa.date }, say);
    case "party": case "hours": {
      if (wa.table) { // back to the table list for that time
        const areas = enabledAreas(await settingVal("bookingAreas"));
        const area = areas.find((a) => a.id === areaId);
        const avail = area ? await availableSlotsForDate(area, wa.date) : [];
        const i = avail.indexOf(wa.slot);
        if (i >= 0) return bookingStep(c, lang, from, String(i + 1), { flow: "book", step: "slot", areaId, date: wa.date }, say);
      }
      return bookingStep(c, lang, from, "", { flow: "book", step: "date", areaId, confirmedDate: wa.date }, say);
    }
    default: return startBooking(c, lang, from, say);
  }
}

async function bookingStep(c: Contact, lang: Lang, from: string, body: string, wa: any, sayRaw: (m: string) => Promise<void>): Promise<unknown> {
  // Every question in this flow ends with the "B = back · 0 = cancel" line.
  const say = (m: string) => sayRaw(withNav(lang, m));
  const areas = enabledAreas(await settingVal("bookingAreas"));
  if (wa.step === "area") {
    const idx = Number((body.match(/\d+/) || [])[0] || 0) - 1;
    if (idx < 0 || idx >= areas.length) { await say(L(lang, "replyNumber", { n: String(areas.length) })); return; }
    await say(L(lang, "bookAskDate"));
    return patchContact(c.id, { waState: { flow: "book", step: "date", areaId: areas[idx].id } });
  }
  const area = areas.find((a) => a.id === wa.areaId) || areas[0];
  if (!area) { await say(L(lang, "bookAskArea", { list: areas.map((a, i) => `${i + 1}. ${areaNameIn(a, lang)} (${areaLevelIn(a.level, lang)})`).join("\n") })); return patchContact(c.id, { waState: { flow: "book", step: "area" } }); }
  const slots = wa.date ? areaSlotsForDate(area, wa.date) : [];
  const labels = wa.date ? areaSlotLabelsForDate(area, wa.date) : [];
  const labelFor = (slot: string) => labels[slots.indexOf(slot)] || slot;
  // Date: a typed date is used as-is; "tomorrow / next Sunday / 下个礼拜天 / lusa"
  // is confirmed first (yes/no); "next week" alone asks which day.
  const askForDay = async (weekOffset: number) => {
    await say(L(lang, "askWeekday", { week: L(lang, weekOffset === 0 ? "weekThis" : weekOffset === 1 ? "weekNext" : "weekLater") }));
    return patchContact(c.id, { waState: { flow: "book", step: "weekday", areaId: area.id, weekOffset } });
  };
  const confirmDay = async (date: string): Promise<unknown> => {
    if (date < todayStr()) { await say(L(lang, "datePast", { day: fmtLong(date, lang) })); return patchContact(c.id, { waState: { flow: "book", step: "date", areaId: area.id } }); }
    // Only "tomorrow / next Tuesday"-style answers are checked; today goes straight to the times.
    if (date === todayStr()) return bookingStep(c, lang, from, "", { ...wa, flow: "book", step: "date", areaId: area.id, confirmedDate: date }, sayRaw);
    await say(L(lang, "confirmDate", { day: fmtLong(date, lang) }));
    return patchContact(c.id, { waState: { flow: "book", step: "dateConfirm", areaId: area.id, pendingDate: date } });
  };
  if (wa.step === "weekday") {
    const n = Number((body.match(/^\s*([1-7])\s*$/) || [])[1] || 0);
    const r = parseDateInput(body, todayStr());
    if (n) return confirmDay(weekdayInWeek(todayStr(), n % 7, wa.weekOffset ?? 1)); // 1 = Monday … 7 = Sunday
    if (r?.kind === "exact") wa = { ...wa, step: "date" };
    else if (r?.kind === "relative") return confirmDay(r.kind === "relative" && /(星期|礼拜|禮拜|周|週)|\b(mon|tue|wed|thu|fri|sat|sun|senin|selasa|rabu|kamis|jum|sabtu|minggu)/i.test(body) ? weekdayInWeek(todayStr(), weekdayOfIso(r.date), wa.weekOffset ?? 1) : r.date);
    else return askForDay(wa.weekOffset ?? 1);
  }
  if (wa.step === "dateConfirm") {
    const ans = yesNo(body);
    if (ans === "yes") wa = { ...wa, step: "date", confirmedDate: wa.pendingDate };
    else if (ans === "no") { await say(L(lang, "bookAskDate")); return patchContact(c.id, { waState: { flow: "book", step: "date", areaId: area.id } }); }
    else wa = { ...wa, step: "date" }; // they typed a date instead — read it below
  }
  if (wa.step === "date") {
    let date: string | null = wa.confirmedDate || null;
    if (!date) {
      const r = parseDateInput(body, todayStr());
      if (!r) { await say(L(lang, "bookAskDate")); return patchContact(c.id, { waState: { flow: "book", step: "date", areaId: area.id } }); }
      if (r.kind === "askDay") return askForDay(r.weekOffset);
      if (r.kind === "relative") return confirmDay(r.date);
      date = r.date;
      if (date < todayStr()) { await say(L(lang, "datePast", { day: fmtLong(date, lang) })); return; }
    }
    if (!areaSlotsForDate(area, date).length) { await say(L(lang, "closedDay", { day: fmtDMY(date, lang), area: areaNameIn(area, lang) })); return; }
    const avail = await availableSlotsForDate(area, date);
    if (!avail.length) {
      // Area full that day: point to areas that still have space, or say we're fully booked.
      const others = await areasWithSpace(areas, date, area.id);
      if (!others.length) { await say(L(lang, "fullVenue", { day: fmtDMY(date, lang) })); return; }
      await say(`${L(lang, "fullDay", { day: fmtDMY(date, lang), area: areaNameIn(area, lang) })}\n\n${L(lang, "fullOtherAreas", { list: others.map((x) => `• ${areaNameIn(x, lang)} (${areaLevelIn(x.level, lang)})`).join("\n") })}`);
      return;
    }
    // An event that day? Send its poster + text first so they know what's on.
    await sendEventsForDay(c, from, lang, date);
    // Confirm the resolved date, then list only the times that still have space.
    const dSlots = areaSlotsForDate(area, date), dLabels = areaSlotLabelsForDate(area, date);
    const list = avail.map((s, i) => `${i + 1}. ${timeText(lang, s, dLabels[dSlots.indexOf(s)])}`).join("\n");
    const caption = `${L(lang, "dateOk", { day: fmtDMY(date, lang) })}\n\n${L(lang, "bookAskSlot", { day: areaNameIn(area, lang), hours: hoursText(lang, areaHoursTextForDate(area, date)), list })}`;
    await say(caption);
    return patchContact(c.id, { waState: { flow: "book", step: "slot", areaId: area.id, date } });
  }
  if (wa.step === "slot") {
    const avail = await availableSlotsForDate(area, wa.date);
    const idx = Number((body.match(/\d+/) || [])[0] || 0) - 1;
    if (idx < 0 || idx >= avail.length) { await say(L(lang, "replyNumber", { n: String(avail.length) })); return; }
    const picked = avail[idx];
    if (area.tables.length) {
      const free = await freeTablesForDateSlot(area, wa.date, picked);
      if (!free.length) { await say(L(lang, "slotFilled", { n: String(avail.length) })); return; }
      const caption = tableQuestion(lang, area, free);
      if (area.image) { const cap = withNav(lang, caption); await sendWhatsAppImage(from, area.image, cap); await logMsg(c.id, c.phone, "out", cap, true); } else await say(caption);
      return patchContact(c.id, { waState: { flow: "book", step: "table", areaId: area.id, date: wa.date, slot: picked } });
    }
    await say(L(lang, "bookAskParty"));
    return patchContact(c.id, { waState: { flow: "book", step: "party", areaId: area.id, date: wa.date, slot: picked } });
  }
  if (wa.step === "table") {
    const free = await freeTablesForDateSlot(area, wa.date, wa.slot);
    const idx = Number((body.match(/\d+/) || [])[0] || 0) - 1;
    if (idx < 0 || idx >= free.length) { await say(L(lang, "replyNumber", { n: String(free.length) })); return; }
    const picked = free[idx];
    const cap = tableCap(area, picked);
    if (wa.party) {
      if (hasPaxLimit(cap) && wa.party > cap) { await say(L(lang, "tableTooSmall", { t: picked, cap: String(cap), n: String(wa.party) })); return; }
      const next = { ...wa, table: picked };
      if (!(await askHoursOn())) return askSpecialOrFinish(c, lang, from, area, next, 2, sayRaw);
      await say(L(lang, "bookAskHours")); return patchContact(c.id, { waState: { flow: "book", step: "hours", areaId: area.id, date: wa.date, slot: wa.slot, table: picked, party: wa.party } });
    }
    await say(hasPaxLimit(cap) ? L(lang, "askPaxFor", { t: picked, cap: String(cap) }) : L(lang, "askPax"));
    return patchContact(c.id, { waState: { flow: "book", step: "party", areaId: area.id, date: wa.date, slot: wa.slot, table: picked } });
  }
  if (wa.step === "party") {
    const cap = tableCap(area, wa.table);
    const n = Math.max(1, Number((body.match(/\d+/) || [])[0] || 2));
    if (hasPaxLimit(cap) && n > cap) { await say(L(lang, "paxTooMany", { cap: String(cap) })); return; }
    if (!(await askHoursOn())) return askSpecialOrFinish(c, lang, from, area, { ...wa, party: n }, 2, sayRaw);
    await say(L(lang, "bookAskHours"));
    return patchContact(c.id, { waState: { flow: "book", step: "hours", areaId: area.id, date: wa.date, slot: wa.slot, table: wa.table, party: n } });
  }
  if (wa.step === "hours") {
    const hrs = Math.max(2, Math.min(8, Number((body.match(/\d+/) || [])[0] || 2)));
    return askSpecialOrFinish(c, lang, from, area, wa, hrs, sayRaw);
  }
  if (wa.step === "special") {
    // 1-4 = an occasion, 5 = nothing; anything else is their request in their own words
    const text = body.trim(), num = /^\d+$/.test(text) ? Number(text) : 0;
    if (num >= 1 && num <= BOOKING_OCCASIONS.length) { // occasion picked
      const occasion = BOOKING_OCCASIONS[num - 1].id;
      // Birthday: first ask whether we should prepare the cake + decorations.
      if (occasion === "birthday") { await say(L(lang, "bookAskCake")); return patchContact(c.id, { waState: { ...wa, step: "cake", occasion } }); }
      await say(L(lang, "bookAskSpecialNote"));
      return patchContact(c.id, { waState: { ...wa, step: "specialNote", occasion } });
    }
    const note = num === BOOKING_OCCASIONS.length + 1 ? undefined : text;
    // They typed a birthday request themselves → still ask about the cake.
    if (note && mentionsBirthday(note)) { await say(L(lang, "bookAskCake")); return patchContact(c.id, { waState: { ...wa, step: "cake", typedNote: note } }); }
    return completeStepBooking(c, lang, from, area, { ...wa, special: specialRequestText(undefined, note) }, wa.hours || 2, sayRaw);
  }
  if (wa.step === "cake") {
    const t = body.trim().toLowerCase();
    const cake = /^1\b|^(yes|y|ya|iya|ok|好|要|是)/i.test(t) ? "us" : /^2\b|^(no|n|tidak|nggak|gak|不|自己)/i.test(t) ? "self" : "";
    if (!cake) { await say(L(lang, "bookAskCake")); return; }
    await say(L(lang, cake === "us" ? "cakeUs" : "cakeSelf"));
    if (wa.typedNote) return completeStepBooking(c, lang, from, area, { ...wa, special: specialRequestText("birthday", wa.typedNote, cake) }, wa.hours || 2, sayRaw);
    await say(L(lang, "bookAskSpecialNote"));
    return patchContact(c.id, { waState: { ...wa, step: "specialNote", cake } });
  }
  if (wa.step === "specialNote") {
    const text = body.trim(), skip = /^\d+$/.test(text);
    return completeStepBooking(c, lang, from, area, { ...wa, special: specialRequestText(wa.occasion, skip ? undefined : text, wa.cake) }, wa.hours || 2, sayRaw);
  }
}

// Whether to ask for a special request (admin switch; off → book straight away).
async function askSpecialOn(): Promise<boolean> { return (await settingVal("bookingAskSpecial")) !== "false"; }
async function askSpecialOrFinish(c: Contact, lang: Lang, from: string, area: BookingArea, wa: any, hrs: number, sayRaw: (m: string) => Promise<void>): Promise<unknown> {
  if (!(await askSpecialOn())) return completeStepBooking(c, lang, from, area, wa, hrs, sayRaw);
  await sayRaw(withNav(lang, L(lang, "bookAskSpecial")));
  return patchContact(c.id, { waState: { flow: "book", step: "special", areaId: area.id, date: wa.date, slot: wa.slot, table: wa.table, party: wa.party, hours: hrs } });
}

// Whether to ask guests how many hours (admin switch; off → book 2 hours).
async function askHoursOn(): Promise<boolean> { return (await settingVal("bookingAskHours")) !== "false"; }

// Final step of the guided WhatsApp booking: save it and confirm with the address.
async function completeStepBooking(c: Contact, lang: Lang, from: string, area: BookingArea, wa: any, hrs: number, say: (m: string) => Promise<void>) {
  if (wa.table && await isTableTaken(area, wa.table, bookingWhen(areaOpenHourForDate(area, wa.date), wa.date, wa.slot))) {
    await say(L(lang, "justBooked", { t: wa.table }));
    return patchContact(c.id, { waState: { flow: null } });
  }
  const row = await createBooking({ userId: c.userId!, dateStr: wa.date, slot: wa.slot, partySize: wa.party || 2, hours: hrs, note: wa.special, table: wa.table, area: `${area.name} (${area.level})`, openHour: areaOpenHourForDate(area, wa.date), companyId: (await defaultCompanyId()) ?? undefined });
  const slots = areaSlotsForDate(area, wa.date), labels = areaSlotLabelsForDate(area, wa.date);
  const label = labels[slots.indexOf(wa.slot)] || wa.slot;
  await pushWhatsAppBooking(row, c, area, wa.date, label, wa.party || 2);
  const hoursPart = (await askHoursOn()) ? L(lang, "hoursSuffix", { n: String(hrs) }) : "";
  await say(L(lang, "bookDone", { day: fmtDMY(wa.date, lang), time: `${timeText(lang, wa.slot, label)}${hoursPart}`, n: String(wa.party || 2), url: memberAppUrl() }));
  if (wa.special) { // echo it back in their language (it's saved in English for staff)
    const o = BOOKING_OCCASIONS.find((x) => wa.special.startsWith(`${x.emoji} ${x.en}`));
    // Shown in the member's language (the booking itself keeps the English text for staff).
    const shown = (o ? wa.special.replace(`${o.emoji} ${o.en}`, L(lang, `occ.${o.id}`)) : wa.special.replace("🎂 Birthday", L(lang, "occ.birthday")))
      .replace("🍰 Cake & decorations: WE PREPARE", L(lang, "cakeNoteUs")).replace("🍰 Cake & decorations: guest brings own", L(lang, "cakeNoteSelf"));
    await say(L(lang, "specialNoted", { r: shown }));
  }
  await notifyAdmin(`New WhatsApp booking #${row.id}: ${c.name || c.phone} · ${area.name} · ${wa.date} ${label} · ${hrs}h · ${wa.table ? "Table " + wa.table + " · " : ""}${wa.party || 2} pax${wa.special ? ` · ${wa.special}` : ""} — confirm in the app.`);
  await sendMemberMenu(from, c, lang);
  return patchContact(c.id, { waState: { flow: null } });
}

// Events the admin set for a date (poster as an image with the text as its caption).
async function sendEventsForDay(c: Contact, from: string, lang: Lang, date: string) {
  try {
    const { upcomingEvents } = await import("./rebornGame");
    for (const ev of (await upcomingEvents(date)).slice(0, 3)) {
      const text = L(lang, "eventOnDay", { day: fmtDMY(date, lang), title: ev.title, body: ev.body ? `\n${ev.body}` : "" });
      if (ev.imageUrl) await sendWhatsAppImage(from, ev.imageUrl, text); else await sendWhatsApp(from, text);
      await logMsg(c.id, c.phone, "out", text, true);
    }
  } catch (e) { waError("events for day", e); }
}

// "Events" (menu 4): every upcoming event, nearest first — poster + text for each.
async function sendAllEvents(c: Contact, from: string, lang: Lang) {
  try {
    const { upcomingEvents } = await import("./rebornGame");
    const list = (await upcomingEvents()).slice(0, 10);
    if (!list.length) { await say0(c, from, L(lang, "eventsNone")); return; }
    await say0(c, from, L(lang, "eventsIntro", { n: String(list.length) }));
    for (const ev of list) {
      const when = ev.startDate ? `${fmtDMY(ev.startDate, lang)}${ev.endDate && ev.endDate > ev.startDate ? ` – ${fmtDMY(ev.endDate, lang)}` : ""}\n` : "";
      const text = `${when}*${ev.title}*${ev.body ? `\n${ev.body}` : ""}`;
      if (ev.imageUrl) await sendWhatsAppImage(from, ev.imageUrl, text); else await sendWhatsApp(from, text);
      await logMsg(c.id, c.phone, "out", text, true);
    }
    await say0(c, from, L(lang, "eventsFooter"));
  } catch (e) { waError("events list", e); }
}

// Step back one question in a WhatsApp song request.
async function songBack(c: Contact, lang: Lang, wa: any, say: (m: string) => Promise<void>) {
  if (wa.step === "mode" && wa.song?.source !== "library" && Array.isArray(wa.candidates)) {
    const list = wa.candidates.map((song: any, i: number) => `${i + 1}. ${song.title}${song.artist ? ` — ${song.artist}` : ""}`).join("\n");
    await say(`${L(lang, "songPick", { list })}\n\n${L(lang, "navHintSongPick")}`);
    return patchContact(c.id, { waState: { flow: "song", step: "pick", songTitle: wa.songTitle, candidates: wa.candidates } });
  }
  await say(withNav(lang, L(lang, "songAskName")));
  return patchContact(c.id, { waState: { flow: "song", step: "name" } });
}

// "By table" song queue: the member must scan their table QR (or have a confirmed table booking) first.
async function songTableBlocked(userId: string): Promise<boolean> {
  try { const { songNeedsTableScan } = await import("./rebornGame"); return await songNeedsTableScan(userId); } catch (e) { waError("song table check", e); return false; }
}

async function songStep(c: Contact, lang: Lang, from: string, body: string, wa: any, sayRaw: (m: string) => Promise<void>) {
  const say = (m: string) => sayRaw(withNav(lang, m));
  if (!c.userId) { await say(L(lang, "bookNeedAcct")); return patchContact(c.id, { stage: "await_name", waState: { flow: null } }); }
  if (await songTableBlocked(c.userId)) { await sayRaw(L(lang, "songNeedTable")); return patchContact(c.id, { waState: { flow: "songWait", at: Date.now() } }); }
  if (wa.step === "name") {
    const title = body.trim();
    if (!title) { await say(L(lang, "songAskName")); return; }
    const result = await searchSongCatalog(title, 8);
    if (result.songs.length) {
      const list = result.songs.map((song, index) => `${index + 1}. ${song.title}${song.artist ? ` — ${song.artist}` : ""}${song.titlePinyin ? ` (${song.titlePinyin})` : ""}`).join("\n");
      await sayRaw(`${L(lang, "songPick", { list })}\n\n${L(lang, "navHintSongPick")}`);
      return patchContact(c.id, { waState: { flow: "song", step: "pick", songTitle: title, candidates: result.songs } });
    }
    await say(L(lang, "songAskArtist"));
    return patchContact(c.id, { waState: { flow: "song", step: "artist", songTitle: title } });
  }

  if (wa.step === "pick") {
    const selected = Number((body.match(/\d+/) || [])[0] || -1);
    if (selected === 0) {
      await say(L(lang, "songAskArtist"));
      return patchContact(c.id, { waState: { flow: "song", step: "artist", songTitle: wa.songTitle } });
    }
    const song = Array.isArray(wa.candidates) ? wa.candidates[selected - 1] as SongSuggestion | undefined : undefined;
    if (!song) { await say(L(lang, "songPickInvalid")); return; }
    if ((await settingVal("songRequestModeEnabled")) !== "false") {
      await say(L(lang, "songAskMode"));
      return patchContact(c.id, { waState: { flow: "song", step: "mode", song, songTitle: wa.songTitle, candidates: wa.candidates } });
    }
    await finishWhatsAppSongRequest(c, lang, song, "self", sayRaw);
    return;
  }

  if (wa.step === "artist") {
    const title = String(wa.songTitle || "").trim();
    const artist = body.trim() === "-" ? "" : body.trim();
    const song: SongSuggestion = { source: "library", title, titlePinyin: textPinyin(title), artist, artistPinyin: textPinyin(artist) };
    if ((await settingVal("songRequestModeEnabled")) !== "false") {
      await say(L(lang, "songAskMode"));
      return patchContact(c.id, { waState: { flow: "song", step: "mode", song } });
    }
    await finishWhatsAppSongRequest(c, lang, song, "self", sayRaw);
    return;
  }

  if (wa.step === "mode") {
    const normalized = body.trim().toLowerCase();
    const performanceMode = /^(2|singer|by singer|歌手|penyanyi)/i.test(normalized) ? "singer" : /^(1|self|self sing|自己|sendiri)/i.test(normalized) ? "self" : "";
    if (!performanceMode) { await say(L(lang, "songModeInvalid")); return; }
    await finishWhatsAppSongRequest(c, lang, wa.song as SongSuggestion, performanceMode, sayRaw);
    return;
  }

  await say(L(lang, "songAskName"));
  return patchContact(c.id, { waState: { flow: "song", step: "name" } });
}

async function finishWhatsAppSongRequest(c: Contact, lang: Lang, selected: SongSuggestion, performanceMode: "self" | "singer", say: (m: string) => Promise<void>) {
  const title = String(selected?.title || "").trim();
  const artist = String(selected?.artist || "").trim();
  let songId: number | undefined;
  try {
    if (selected?.id && selected.source === "library") {
      const [existing] = await db.select().from(songs).where(eq(songs.id, selected.id)).limit(1);
      if (existing) {
        songId = existing.id;
        await db.update(songs).set({ requestCount: (existing.requestCount || 0) + 1 }).where(eq(songs.id, existing.id));
      }
    }
    if (!songId) {
      const [existing] = await db.select().from(songs).where(and(ilike(songs.title, title), artist ? ilike(songs.artist, artist) : ilike(songs.artist, ""))).limit(1);
      if (existing) {
        songId = existing.id;
        await db.update(songs).set({ requestCount: (existing.requestCount || 0) + 1 }).where(eq(songs.id, existing.id));
      } else {
        const [saved] = await db.insert(songs).values({
          title,
          titlePinyin: selected.titlePinyin || textPinyin(title),
          artist,
          artistPinyin: selected.artistPinyin || textPinyin(artist),
          spotifyUrl: selected.spotifyUrl || null,
          artistPhoto: selected.artistPhoto || null,
          requestCount: 1,
          createdBy: c.userId,
        }).returning();
        songId = saved.id;
      }
    }
  } catch (e) { waError("song upsert", e); }
  // No staff approval: the song joins the fair queue straight away.
  const cid = await defaultCompanyId();
  const [reqRow] = await db.insert(songRequests).values({ companyId: cid, userId: c.userId!, songId, title, artist, performanceMode, status: "pending" }).returning();
  emitLiveUpdate("/api/reborn/admin/song-requests", { action: "WHATSAPP_SONG_REQUEST" });
  emitLiveUpdate("/api/reborn/song-queue", { action: "QUEUED" });
  let pos = "";
  try { const { songQueuePosition } = await import("./rebornGame"); const n = await songQueuePosition(cid, reqRow.id); if (n) pos = L(lang, "songPos", { n: String(n) }); } catch (e) { waError("song position", e); }
  await say(L(lang, "songDone", { title, artist: artist ? ` - ${artist}` : "", pos }));
  await sendMemberMenu(c.phone, c, lang);
  return patchContact(c.id, { waState: { flow: null } });
}

async function showBottles(c: Contact, lang: Lang, say: (m: string) => Promise<void>) {
  if (!c.userId) { await say(L(lang, "bookNeedAcct")); return patchContact(c.id, { stage: "await_name", waState: { flow: null } }); }
  const rows = await db.select().from(bottleKeeps).where(and(eq(bottleKeeps.userId, c.userId), eq(bottleKeeps.status, "kept")));
  if (!rows.length) { await say(L(lang, "bottlesNone")); await sendMemberMenu(c.phone, c, lang); return; }
  const list = rows.map((b) => {
    const days = b.expiresAt ? Math.max(0, Math.ceil((new Date(b.expiresAt).getTime() - Date.now()) / DAY_MS)) : 0;
    const emoji = b.type === "whisky" ? "🥃" : b.type === "beer" ? "🍺" : "🍾";
    const typeKey = ["whisky", "beer", "wine"].includes(b.type || "") ? `type.${b.type}` : "type.drink";
    return L(lang, "bottleLine", { emoji, type: L(lang, typeKey), name: b.name, left: b.type === "beer" ? L(lang, "bottleLeft", { n: String(b.quantity) }) : "", days: String(days) });
  }).join("\n");
  await say(L(lang, "bottlesList", { n: String(rows.length), list }));
  await sendMemberMenu(c.phone, c, lang);
}

// Post-payment: ask for feedback + a Google review. Called from the app after a paid order/top-up.
export async function sendReviewRequest(opts: { phone?: string | null; userId?: string | null; name?: string | null; club: string; reviewUrl?: string }) {
  try {
    let num = (opts.phone || "").replace(/\D/g, "");
    let contact: Contact | undefined;
    if (num) [contact] = await db.select().from(crmContacts).where(eq(crmContacts.phone, num));
    if (!contact && opts.userId) { [contact] = await db.select().from(crmContacts).where(eq(crmContacts.userId, opts.userId)); if (contact) num = contact.phone; }
    if (!num && opts.userId) { const [u] = await db.select().from(users).where(eq(users.id, opts.userId)); if (u?.phoneNumber) num = u.phoneNumber.replace(/\D/g, ""); }
    if (!num) return;
    const lang = await langForPhone(num, opts.userId || contact?.userId);
    const feedbackUrl = memberAppUrl("/staff-feedback");
    const link = L(lang, "reviewLinkApp", { url: feedbackUrl }) + (opts.reviewUrl ? L(lang, "reviewLinkGoogle", { url: opts.reviewUrl }) : "");
    const msg = L(lang, "review", { club: opts.club, link });
    const ok = await sendWhatsApp(num, msg);
    if (contact) { await logMsg(contact.id, num, "out", msg, true); await patchContact(contact.id, { waState: { flow: "review", reviewUrl: opts.reviewUrl || "" } }); }
    return ok;
  } catch (e) { waError("review request", e); }
}

// --- Webhook -------------------------------------------------------------
export function registerWhatsAppBot(app: Express) {
  // WhatsApp bookings/song requests used to be saved without a company, so the
  // app (which lists per company) never showed them. Attach them to the default.
  (async () => {
    try {
      const cid = await defaultCompanyId();
      if (!cid) return;
      await db.update(appointments).set({ companyId: cid }).where(sql`${appointments.companyId} IS NULL`);
      await db.update(songRequests).set({ companyId: cid }).where(sql`${songRequests.companyId} IS NULL`);
    } catch (e) { waError("company backfill", e); }
  })();
  // Meta calls one webhook address per WhatsApp Business number: the platform company's is
  // /api/whatsapp/webhook, every other company's is /api/whatsapp/webhook/<its slug>.
  const inCompany = async <T>(slug: string | undefined, run: () => Promise<T>): Promise<T | null> => {
    if (!slug) return run();
    const tenant = (await listTenantSpaces()).find((space) => space.slug === slug.toLowerCase());
    return tenant ? runInTenant(tenant, run) : null;
  };

  const verifyWebhook = async (req: Request, res: Response) => {
    const answered = await inCompany(req.params.slug, async () => {
      const c = await loadWaConfig(true);
      const matches = req.query["hub.mode"] === "subscribe" && Boolean(c.verifyToken) && req.query["hub.verify_token"] === c.verifyToken;
      return matches ? String(req.query["hub.challenge"] ?? "") : null;
    }).catch(() => null);
    return answered === null ? res.sendStatus(403) : res.status(200).send(answered);
  };
  app.get("/api/whatsapp/webhook", verifyWebhook);
  app.get("/api/whatsapp/webhook/:slug", verifyWebhook);

  const receiveWebhook = async (req: Request, res: Response) => {
    res.sendStatus(200); // ack immediately; Meta retries on non-200
    try {
      await inCompany(req.params.slug, async () => {
        const entries = req.body?.entry || [];
        for (const entry of entries) {
          for (const change of entry.changes || []) {
            const value = change.value || {};
            const contacts = value.contacts || [];
            // Meta accepts a message first and reports later if it couldn't be delivered (e.g. 131047:
            // more than 24h since the member last wrote, so free text is refused). Show that to staff.
            for (const st of value.statuses || []) if (st?.status === "failed") await recordFailedDelivery(st);
            for (const msg of value.messages || []) {
              if (msg.type !== "text" && msg.type !== "interactive" && msg.type !== "button") continue;
              const from = msg.from;
              const profileName = contacts.find((x: any) => x.wa_id === from)?.profile?.name;
              const selected = msg.interactive?.button_reply?.id
                || msg.interactive?.list_reply?.id
                || msg.button?.payload
                || msg.text?.body
                || "";
              await handleInboundText(from, selected, profileName, msg.id);
            }
          }
        }
      });
    } catch (e) { waError("webhook error", e); }
  };
  app.post("/api/whatsapp/webhook", receiveWebhook);
  app.post("/api/whatsapp/webhook/:slug", receiveWebhook);

  // Kick off the reminder scheduler (hourly). Safe no-op until WhatsApp is configured.
  startReminderScheduler();
}

// --- Reminders -----------------------------------------------------------
// 1) Leftover drinks: kept bottles expiring within 7 days, nudged at most every 5 days.
// 2) Come back: contacts whose last visit was ~3 days ago, once.
// 3) Feedback: contacts who visited earlier today, once that evening.
export async function runReminders(): Promise<{ bottles: number; comeback: number; feedback: number }> {
  const out = { bottles: 0, comeback: 0, feedback: 0 };
  if (!(await whatsappAvailable())) return out;
  const now = Date.now();

  // 1) Leftover drinks — weekly nudges across the ~30-day keep, then daily in the last 3 days.
  try {
    const kept = await db.select().from(bottleKeeps)
      .where(and(eq(bottleKeeps.status, "kept"), isNotNull(bottleKeeps.expiresAt)));
    for (const b of kept) {
      const exp = b.expiresAt ? new Date(b.expiresAt).getTime() : 0;
      if (!exp || exp <= now) continue; // expired handled elsewhere
      const daysLeft = Math.max(0, Math.ceil((exp - now) / DAY_MS));
      const gapNeeded = daysLeft <= 3 ? 20 * HOUR_MS : 7 * DAY_MS; // daily near expiry, else weekly
      if (b.lastReminderAt && now - new Date(b.lastReminderAt).getTime() < gapNeeded) continue;
      const phone = await phoneForBottle(b);
      if (!phone) continue;
      const blang = await langForPhone(phone, b.userId);
      const ok = await sendWhatsApp(phone, L(blang, "bottle", { name: b.memberName || "", item: b.name, qty: String(b.quantity), days: String(daysLeft) }));
      if (ok) { await db.update(bottleKeeps).set({ lastReminderAt: new Date() }).where(eq(bottleKeeps.id, b.id)); out.bottles++; }
    }
  } catch (e) { waError("bottle reminders", e); }

  // 2) Come back after 3 days
  try {
    const rows = await db.select().from(crmContacts)
      .where(and(isNotNull(crmContacts.lastVisitAt), isNotNull(crmContacts.phone)));
    for (const c of rows) {
      const visit = c.lastVisitAt ? new Date(c.lastVisitAt).getTime() : 0;
      const age = now - visit;
      if (age < 3 * DAY_MS || age > 4 * DAY_MS) continue; // once, ~3 days after
      if (c.lastComebackReminderAt && new Date(c.lastComebackReminderAt).getTime() > visit) continue;
      const ok = await sendWhatsApp(c.phone, L(await langForPhone(c.phone, c.userId), "comeback", { name: c.name || "" }));
      if (ok) { await patchContact(c.id, { lastComebackReminderAt: new Date() }); out.comeback++; }
    }
  } catch (e) { waError("comeback reminders", e); }

  // 3) Same-day feedback (evening, for visits earlier today)
  try {
    const hour = new Date().getHours();
    if (hour >= 21 && hour <= 23) { // send in the 9pm–11pm window
      const rows = await db.select().from(crmContacts)
        .where(and(isNotNull(crmContacts.lastVisitAt), isNotNull(crmContacts.phone)));
      for (const c of rows) {
        const visit = c.lastVisitAt ? new Date(c.lastVisitAt).getTime() : 0;
        if (now - visit > DAY_MS) continue; // visited today
        if (c.lastFeedbackReminderAt && new Date(c.lastFeedbackReminderAt).getTime() > visit) continue;
        const ok = await sendWhatsApp(c.phone, L(await langForPhone(c.phone, c.userId), "feedback", { name: c.name || "" }));
        if (ok) { await patchContact(c.id, { lastFeedbackReminderAt: new Date() }); out.feedback++; }
      }
    }
  } catch (e) { waError("feedback reminders", e); }

  return out;
}

// Booking reminders — sent at ~3h, ~1h and ~10min before the appointment start.
const REMINDER_ORDER = ["3h", "1h", "10m"];
export async function runBookingReminders(): Promise<number> {
  const now = Date.now();
  let sent = 0;
  const waAvail = await whatsappAvailable();
  try {
    const soon = new Date(now + 3 * 60 * 60_000 + 15 * 60_000); // up to ~3h15m ahead
    const rows = await db.select().from(appointments).where(and(gt(appointments.appointmentDate, new Date(now)), lte(appointments.appointmentDate, soon)));
    const club = (await settingVal("clubName")) || (await loadWaConfig()).club || "Reborn Wave";
    for (const a of rows) {
      if (!["pending", "scheduled", "confirmed"].includes(a.status)) continue;
      const mins = (new Date(a.appointmentDate).getTime() - now) / 60000;
      let tag = "";
      if (mins <= 10) tag = "10m";
      else if (mins <= 60) tag = "1h";
      else if (mins <= 180) tag = "3h";
      if (!tag) continue;
      const already = (a.remindersSent || "").split(",").filter(Boolean);
      if (already.includes(tag)) continue;
      const phone = await memberWaPhone(a.userId);
      const markSet = Array.from(new Set([...already, ...REMINDER_ORDER.slice(0, REMINDER_ORDER.indexOf(tag) + 1)]));
      const lang = await langForPhone(phone, a.userId);
      const left = L(lang, tag === "10m" ? "left10m" : tag === "1h" ? "left1h" : "left3h");
      const when = fmtBookingWhen(a.appointmentDate, lang);
      const where = a.notes ? ` (${localizeBookingText(lang, a.notes.replace(/ \/ /g, " · "))})` : "";
      // Real phone push — fires even when WhatsApp is offline or the member has no phone on file.
      await sendPushToUser(a.userId, { title: L(lang, "pushRemindTitle", { club, left }), body: `${a.title ? localizeBookingText(lang, a.title) : L(lang, "yourBooking")} — ${when}${where}`, url: "/bookings", tag: `remind-${a.id}-${tag}` }).catch(() => {});
      if (waAvail && phone) {
        const ok = await sendWhatsApp(phone, L(lang, "bookReminder", { club, when, left, where }));
        if (ok) sent++;
      }
      await db.update(appointments).set({ remindersSent: markSet.join(",") }).where(eq(appointments.id, a.id));
    }
  } catch (e) { waError("booking reminders", e); }
  return sent;
}

// No-shows: a booking still pending/confirmed 15 minutes after its start time is
// auto-cancelled, which frees the table for app + WhatsApp booking again. Staff
// mark guests who turned up as "Arrived" (status seated) in the admin app.
// Only bookings that started after this server booted (and within the last
// hour) are touched, so history — and guests seated before staff could mark
// them Arrived — is never mass-cancelled or messaged.
const NO_SHOW_SINCE = Date.now();
export async function runNoShowCancels(): Promise<number> {
  let cancelled = 0;
  try {
    const now = Date.now();
    const rows = await db.update(appointments)
      .set({ status: "cancelled", adminNote: "No-show — auto-cancelled 15 min after booking time", updatedAt: new Date() })
      .where(and(
        inArray(appointments.status, MEMBER_ACTIVE),
        lte(appointments.appointmentDate, new Date(now - 15 * 60_000)),
        gte(appointments.appointmentDate, new Date(Math.max(now - 60 * 60_000, NO_SHOW_SINCE))),
        ne(appointments.title, "BLOCKED"),
      )).returning();
    if (!rows.length) return 0;
    const club = (await settingVal("clubName")) || (await loadWaConfig()).club || "Reborn Wave";
    const waAvail = await whatsappAvailable();
    for (const a of rows) {
      cancelled++;
      const [u] = a.userId ? await db.select().from(users).where(eq(users.id, a.userId)) : [];
      const phone = (u?.phoneNumber || "").replace(/\D/g, "");
      const lang = await langForPhone(phone, a.userId);
      const when = fmtBookingWhen(a.appointmentDate, lang);
      const what = localizeBookingText(lang, a.title);
      if (waAvail && phone) sendWhatsApp(phone, L(lang, "bookNoShow", { club, when, url: memberAppUrl("/bookings") })).catch(() => {});
      sendPushToUser(a.userId, { title: L(lang, "pushNoShowTitle"), body: L(lang, "pushNoShowBody", { what, when }), url: "/bookings", tag: `noshow-${a.id}` }).catch(() => {});
      await sendRebornUserNotification(a.userId, { type: "booking_status", title: L(lang, "noticeNoShowTitle"), body: L(lang, "noticeNoShowBody", { what, when }), data: { path: "/bookings", bookingId: a.id, status: "cancelled" } }).catch(() => {});
      const who = [u?.firstName, u?.lastName].filter(Boolean).join(" ") || u?.email || "Member";
      await sendRebornStaffNotification({ type: "booking_cancelled", title: "⏱️ No-show auto-cancelled", body: `${who} · ${a.title} · ${when} — slot is free again`, data: { path: "/reborn-admin", bookingId: a.id } }).catch(() => {});
    }
    emitLiveUpdate("/api/reborn/admin/bookings", { action: "NO_SHOW", resource: rows.map((r) => r.id).join(",") });
    console.info("[booking] no-show auto-cancelled", rows.map((r) => r.id));
  } catch (e) { console.error("[booking] no-show job", e); }
  return cancelled;
}

async function phoneForBottle(b: typeof bottleKeeps.$inferSelect): Promise<string | null> {
  if (b.userId) {
    const [u] = await db.select().from(users).where(eq(users.id, b.userId));
    if (u?.phoneNumber) return u.phoneNumber.replace(/\D/g, "");
  }
  if (b.memberCode) {
    const [c] = await db.select().from(crmContacts).where(eq(crmContacts.userId, b.userId || "__none__"));
    if (c?.phone) return c.phone;
  }
  return null;
}

// A member account's saved language (null when there's no such account).
async function accountLang(userId?: string | null): Promise<Lang | null> {
  if (!userId) return null;
  const [u] = await db.select({ l: users.preferredLanguage }).from(users).where(eq(users.id, userId));
  return u ? asLang(u.l) : null;
}
// Language to message someone in: their member account's language when linked
// (so choosing 中文 in the app also switches WhatsApp), else the WhatsApp contact's.
// Phone typed in the app → WhatsApp digits. Indonesian numbers are often typed
// without the country code ("0812…" / "812…"), which WhatsApp can't deliver to.
export function waDigits(raw: string | null | undefined): string {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8") && d.length >= 9 && d.length <= 12) d = "62" + d;
  return d;
}

// The WhatsApp number to message a member on: the chat they actually wrote to us
// from (CRM contact) when there is one, else the phone on their profile.
export async function memberWaPhone(userId: string | null | undefined): Promise<string> {
  if (!userId) return "";
  // A member can have more than one CRM contact (app + WhatsApp). Use the chat they last
  // wrote to us from — that is the one WhatsApp delivers to — else their newest contact.
  const [chat] = await db.select({ phone: crmContacts.phone }).from(crmMessages)
    .innerJoin(crmContacts, eq(crmContacts.id, crmMessages.contactId))
    .where(and(eq(crmContacts.userId, userId), eq(crmMessages.direction, "in")))
    .orderBy(desc(crmMessages.createdAt)).limit(1);
  if (chat?.phone) return chat.phone;
  const [c] = await db.select().from(crmContacts).where(eq(crmContacts.userId, userId)).orderBy(desc(crmContacts.updatedAt)).limit(1);
  if (c?.phone) return c.phone;
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  return waDigits(u?.phoneNumber);
}

export async function langForPhone(phone: string, userId?: string | null): Promise<Lang> {
  const num = (phone || "").replace(/\D/g, "");
  const [c] = num ? await db.select().from(crmContacts).where(eq(crmContacts.phone, num)) : [];
  return (await accountLang(userId || c?.userId)) || ((c?.lang as Lang) || "en");
}

// Packages bought at the POS (server/memberPackages.ts) with visits or credit left:
// a phone push + WhatsApp (saved in the CRM chat), 10:00–20:00 WIB only.
//  - expiring within 7 days → every 2 days, daily in the last 3 days;
//  - not used for 14 days → once every 14 days.
// `anyTime` = an admin pressed "run reminders now" (skips the daytime window).
export async function runPackageReminders(opts: { anyTime?: boolean } = {}): Promise<number> {
  const wibHour = (new Date().getUTCHours() + 7) % 24;
  if (!opts.anyTime && (wibHour < 10 || wibHour >= 20)) return 0;
  const now = Date.now();
  let sent = 0;
  try {
    const rows = await db.select().from(memberPackages).where(and(eq(memberPackages.status, "active"), sql`(${memberPackages.usesLeft} > 0 OR ${memberPackages.creditLeft} > 0)`));
    if (!rows.length) return 0;
    const used = await db.select({ id: memberPackageUses.packageId, at: sql<Date>`max(${memberPackageUses.createdAt})` }).from(memberPackageUses)
      .where(and(inArray(memberPackageUses.packageId, rows.map((r) => r.id)), sql`(${memberPackageUses.uses} > 0 OR ${memberPackageUses.credit} > 0)`)).groupBy(memberPackageUses.packageId);
    const lastUse = new Map(used.map((u) => [u.id, new Date(u.at).getTime()]));
    const waAvail = await whatsappAvailable();
    for (const p of rows) {
      const exp = p.expiresAt ? new Date(p.expiresAt).getTime() : 0;
      if (exp && exp <= now) continue;
      const daysLeft = exp ? Math.max(1, Math.ceil((exp - now) / DAY_MS)) : null;
      const lastActive = Math.max(lastUse.get(p.id) || 0, p.createdAt ? new Date(p.createdAt).getTime() : 0);
      let kind: "pkgExpiring" | "pkgIdle" | null = null, gap = 0;
      if (daysLeft !== null && daysLeft <= 7) { kind = "pkgExpiring"; gap = daysLeft <= 3 ? 20 * HOUR_MS : 2 * DAY_MS; }
      else if (now - lastActive >= 14 * DAY_MS) { kind = "pkgIdle"; gap = 14 * DAY_MS; }
      if (!kind) continue;
      if (p.lastReminderAt && now - new Date(p.lastReminderAt).getTime() < gap) continue;
      const [u] = await db.select({ firstName: users.firstName }).from(users).where(eq(users.id, p.userId));
      const phone = await memberWaPhone(p.userId);
      const lang = await langForPhone(phone, p.userId);
      const left = p.kind === "uses"
        ? L(lang, "pkgLeftUses", { n: String(p.usesLeft) })
        : L(lang, "pkgLeftCredit", { n: Math.round(Number(p.creditLeft)).toLocaleString(localeOf(lang)) });
      const perk = p.kind === "credit" && Number(p.perkPercent) > 0 ? L(lang, "pkgPerkHint", { p: String(Number(p.perkPercent)) }) : "";
      const vars = { name: u?.firstName || p.memberName || "", item: p.name, left, days: String(daysLeft ?? ""), perk };
      await sendPushToUser(p.userId, { title: L(lang, "pkgPushTitle", vars), body: L(lang, kind === "pkgExpiring" ? "pkgPushExpiring" : "pkgPushIdle", vars), url: "/bottles", tag: `pkg-${p.id}` }).catch(() => {});
      if (waAvail && phone) await sendToMember(phone, L(lang, kind, vars), p.userId);
      await db.update(memberPackages).set({ lastReminderAt: new Date() }).where(eq(memberPackages.id, p.id));
      sent++;
    }
  } catch (e) { waError("package reminders", e); }
  return sent;
}

let schedulerStarted = false;
function startReminderScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  // Run ~10 min after boot, then hourly (bottle / comeback / feedback).
  // Every job runs for each company in turn (its own bookings, contacts and WhatsApp number).
  setTimeout(() => { void inEveryDataSpace(runReminders); }, 10 * 60 * 1000);
  setInterval(() => { void inEveryDataSpace(runReminders); }, HOUR_MS);
  // Package reminders (visits / credit left) — hourly, daytime only.
  setTimeout(() => { void inEveryDataSpace(runPackageReminders); }, 12 * 60 * 1000);
  setInterval(() => { void inEveryDataSpace(runPackageReminders); }, HOUR_MS);
  // Booking reminders need finer granularity (3h / 1h / 10min) — check every 5 minutes.
  setTimeout(() => { void inEveryDataSpace(runBookingReminders); }, 60 * 1000);
  setInterval(() => { void inEveryDataSpace(runBookingReminders); }, 5 * 60 * 1000);
  // No-show auto-cancel (15 min after start) — checked every minute.
  setTimeout(() => { void inEveryDataSpace(runNoShowCancels); }, 90 * 1000);
  setInterval(() => { void inEveryDataSpace(runNoShowCancels); }, 60 * 1000);
}
