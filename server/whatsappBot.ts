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
import { and, desc, eq, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { crmContacts, crmMessages, bottleKeeps, users } from "@shared/schema";

const GRAPH_VERSION = "v20.0";
const APP_BASE_URL = process.env.APP_BASE_URL || "https://rebornwave.group";
const DEFAULT_PASSWORD = "123456";
const HOUR_MS = 3600_000;
const DAY_MS = 24 * HOUR_MS;

function cfg() {
  return {
    token: process.env.WHATSAPP_TOKEN || "",
    phoneId: process.env.WHATSAPP_PHONE_ID || "",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "",
    adminNumber: (process.env.WA_ADMIN_NUMBER || "").replace(/\D/g, ""),
  };
}
export function whatsappConfigured(): boolean {
  const c = cfg();
  return Boolean(c.token && c.phoneId);
}
// True when we can actually send — either Cloud API is configured or a QR-linked
// WhatsApp Web session is connected.
export async function whatsappAvailable(): Promise<boolean> {
  if (whatsappConfigured()) return true;
  try { const web = await import("./whatsappWeb"); return web.isWebConnected(); } catch { return false; }
}

// --- Sending -------------------------------------------------------------
export async function sendWhatsApp(to: string, text: string): Promise<boolean> {
  const c = cfg();
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
    });
    if (!r.ok) { console.error(`[wa] send failed ${r.status}: ${await r.text()}`); return false; }
    return true;
  } catch (e) {
    console.error("[wa] send error", e);
    return false;
  }
}
async function notifyAdmin(text: string) {
  const c = cfg();
  if (c.adminNumber) await sendWhatsApp(c.adminNumber, text);
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
async function logMsg(contactId: number, phone: string, direction: "in" | "out", body: string, viaBot: boolean) {
  try { await db.insert(crmMessages).values({ contactId, phone: phone.replace(/\D/g, ""), direction, body: body.slice(0, 4000), viaBot }); }
  catch (e) { console.error("[wa] logMsg", e); }
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
  } catch (e) { console.error("[wa] recordVisit", e); }
}

// --- Conversation state machine -----------------------------------------
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;

function looksLikeName(s: string): boolean {
  const t = s.trim();
  return t.length >= 2 && t.length <= 40 && /[a-zA-Z一-鿿]/.test(t) && !EMAIL_RE.test(t);
}

// --- Localisation (en / zh / id) ----------------------------------------
type Lang = "en" | "zh" | "id";
// Trilingual first message — shown to every new contact before they pick a language.
const WELCOME_TRILINGUAL =
  "🌊 Welcome to Reborn Wave Group! Please choose your language:\n" +
  "🌊 欢迎来到 Reborn Wave Group！请选择您的语言：\n" +
  "🌊 Selamat datang di Reborn Wave Group! Silakan pilih bahasa Anda:\n\n" +
  "1️⃣ English\n2️⃣ 中文\n3️⃣ Bahasa Indonesia\n\n" +
  "Reply 1, 2 or 3 · 回复 1、2 或 3 · Balas 1, 2 atau 3";

function parseLang(s: string): Lang | null {
  const t = s.trim().toLowerCase();
  if (/^1\b|english|eng/.test(t)) return "en";
  if (/^2\b|中文|中国|chinese|zh|华语|华文/.test(t)) return "zh";
  if (/^3\b|bahasa|indonesia|indo|melayu|malay|id/.test(t)) return "id";
  return null;
}

function L(lang: Lang, key: string, vars: Record<string, string> = {}): string {
  const T: Record<string, Record<Lang, string>> = {
    askName: {
      en: "Great! 👋 May I know your name?",
      zh: "好的！👋 请问怎么称呼您？",
      id: "Bagus! 👋 Boleh saya tahu nama Anda?",
    },
    askEmail: {
      en: "Nice to meet you, {name}! 🎉 What's your email address? I'll set up your member account.",
      zh: "很高兴认识你，{name}！🎉 请提供你的电子邮箱，我帮你开通会员账户。",
      id: "Senang berkenalan, {name}! 🎉 Boleh minta alamat email Anda? Saya akan buatkan akun member.",
    },
    badEmail: {
      en: "That doesn't look like an email. Please send it like name@example.com 🙂",
      zh: "这似乎不是有效的邮箱，请按 name@example.com 格式发送 🙂",
      id: "Itu sepertinya bukan email. Kirim dalam format name@example.com ya 🙂",
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
    bottle: {
      en: "Hi {name}! 🍾 Your kept {item} ({qty} left) is waiting at Reborn Wave — it expires in {days} day(s). Come finish it before it's gone! 💜",
      zh: "你好 {name}！🍾 你寄存的 {item}（还剩 {qty}）正在 Reborn Wave 等你，将在 {days} 天后到期。快来喝完吧！💜",
      id: "Hai {name}! 🍾 Simpanan {item} Anda (sisa {qty}) menunggu di Reborn Wave — kedaluwarsa dalam {days} hari. Yuk habiskan sebelum hangus! 💜",
    },
  };
  let s = (T[key]?.[lang]) || T[key]?.en || "";
  for (const k in vars) s = s.replaceAll(`{${k}}`, vars[k]);
  return s;
}

async function createMemberFromContact(c: Contact): Promise<{ email: string; created: boolean }> {
  const email = (c.email || "").toLowerCase();
  const existing = await storage.getUserByEmail(email);
  if (existing) {
    await patchContact(c.id, { userId: existing.id, stage: "member" });
    return { email, created: false };
  }
  const user = await storage.createUser({
    email,
    password: DEFAULT_PASSWORD,
    firstName: (c.name || "Guest").split(" ")[0],
    lastName: (c.name || "").split(" ").slice(1).join(" "),
    phoneNumber: c.phone,
    authProvider: "email",
  });
  await patchContact(c.id, { userId: user.id, stage: "member" });
  return { email, created: true };
}

// Public entry used by both the Cloud API webhook and the QR-linked Web session.
export async function handleInboundText(from: string, text: string, profileName?: string) {
  return handleInbound(from, text, profileName);
}

const MAX_BOT_REPLIES = 10; // stop auto-replying to a number after this many bot messages

async function handleInbound(from: string, text: string, profileName?: string) {
  const body = (text || "").trim();
  const c = await getOrCreateContact(from, profileName);
  await patchContact(c.id, { lastInboundAt: new Date() });
  await logMsg(c.id, c.phone, "in", body, false); // store every incoming message for the admin inbox

  // The bot only onboards NEW numbers. Old/known contacts (already members, or past
  // the reply cap) get no auto-reply — a human handles them; reminders still go out.
  const isOld = c.stage === "member" || c.stage === "active" || (c.botReplies || 0) >= MAX_BOT_REPLIES;
  if (isOld) {
    await notifyAdmin(`💬 ${c.name || from}: "${body.slice(0, 160)}" — (bot silent, please reply)`);
    return;
  }

  // Count each auto-reply toward the cap; the bot goes quiet once it's hit.
  let sent = 0;
  const reply = async (msg: string) => { const ok = await sendWhatsApp(from, msg); await logMsg(c.id, c.phone, "out", msg, true); if (ok) sent++; return ok; };
  const finish = async (patch: Partial<Contact> = {}) => {
    await patchContact(c.id, { ...patch, botReplies: (c.botReplies || 0) + sent });
  };

  const lang = (c.lang as Lang) || "en";
  const stage = c.stage;

  // 0) Brand-new → greet in all 3 languages and ask which to use.
  if (stage === "new") {
    await reply(WELCOME_TRILINGUAL);
    return finish({ stage: "await_lang" });
  }
  // 1) Capture language choice, then ask for the name in that language.
  if (stage === "await_lang") {
    const picked = parseLang(body) || "en"; // default English if unclear
    await reply(L(picked, "askName"));
    return finish({ lang: picked, stage: "await_name" });
  }
  // 2) Capture name.
  if (stage === "await_name") {
    if (!looksLikeName(body)) { await reply(L(lang, "askName")); return finish(); }
    await reply(L(lang, "askEmail", { name: body }));
    return finish({ name: body, stage: "await_email" });
  }
  // 3) Capture email → create the account.
  if (stage === "await_email") {
    const m = body.match(EMAIL_RE);
    if (!m) { await reply(L(lang, "badEmail")); return finish(); }
    await patchContact(c.id, { email: m[0].toLowerCase() });
    const fresh = { ...c, email: m[0].toLowerCase() } as Contact;
    const { email, created } = await createMemberFromContact(fresh); // sets stage=member
    await reply(created
      ? L(lang, "ready", { url: APP_BASE_URL, email, pw: DEFAULT_PASSWORD })
      : L(lang, "welcomeBack", { url: APP_BASE_URL, email }));
    return finish(); // stage already 'member' → future messages go to staff
  }

  // Fallback within onboarding window.
  await reply(L(lang, "thanks", { name: c.name || "" }));
  await notifyAdmin(`💬 ${c.name || from}: "${body.slice(0, 160)}"`);
  return finish();
}

// --- Webhook -------------------------------------------------------------
export function registerWhatsAppBot(app: Express) {
  app.get("/api/whatsapp/webhook", (req: Request, res: Response) => {
    const c = cfg();
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === c.verifyToken && c.verifyToken) return res.status(200).send(challenge);
    return res.sendStatus(403);
  });

  app.post("/api/whatsapp/webhook", async (req: Request, res: Response) => {
    res.sendStatus(200); // ack immediately; Meta retries on non-200
    try {
      const entries = req.body?.entry || [];
      for (const entry of entries) {
        for (const change of entry.changes || []) {
          const value = change.value || {};
          const contacts = value.contacts || [];
          for (const msg of value.messages || []) {
            if (msg.type !== "text") continue;
            const from = msg.from;
            const profileName = contacts.find((x: any) => x.wa_id === from)?.profile?.name;
            await handleInbound(from, msg.text?.body || "", profileName);
          }
        }
      }
    } catch (e) { console.error("[wa] webhook error", e); }
  });

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

  // 1) Leftover drinks
  try {
    const soon = new Date(now + 7 * DAY_MS);
    const kept = await db.select().from(bottleKeeps)
      .where(and(eq(bottleKeeps.status, "kept"), isNotNull(bottleKeeps.expiresAt), lte(bottleKeeps.expiresAt, soon)));
    for (const b of kept) {
      if (b.lastReminderAt && now - new Date(b.lastReminderAt).getTime() < 5 * DAY_MS) continue;
      const phone = await phoneForBottle(b);
      if (!phone) continue;
      const days = b.expiresAt ? Math.max(0, Math.ceil((new Date(b.expiresAt).getTime() - now) / DAY_MS)) : 0;
      const blang = await langForPhone(phone);
      const ok = await sendWhatsApp(phone, L(blang, "bottle", { name: b.memberName || "", item: b.name, qty: String(b.quantity), days: String(days) }));
      if (ok) { await db.update(bottleKeeps).set({ lastReminderAt: new Date() }).where(eq(bottleKeeps.id, b.id)); out.bottles++; }
    }
  } catch (e) { console.error("[wa] bottle reminders", e); }

  // 2) Come back after 3 days
  try {
    const rows = await db.select().from(crmContacts)
      .where(and(isNotNull(crmContacts.lastVisitAt), isNotNull(crmContacts.phone)));
    for (const c of rows) {
      const visit = c.lastVisitAt ? new Date(c.lastVisitAt).getTime() : 0;
      const age = now - visit;
      if (age < 3 * DAY_MS || age > 4 * DAY_MS) continue; // once, ~3 days after
      if (c.lastComebackReminderAt && new Date(c.lastComebackReminderAt).getTime() > visit) continue;
      const ok = await sendWhatsApp(c.phone, L((c.lang as Lang) || "en", "comeback", { name: c.name || "" }));
      if (ok) { await patchContact(c.id, { lastComebackReminderAt: new Date() }); out.comeback++; }
    }
  } catch (e) { console.error("[wa] comeback reminders", e); }

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
        const ok = await sendWhatsApp(c.phone, L((c.lang as Lang) || "en", "feedback", { name: c.name || "" }));
        if (ok) { await patchContact(c.id, { lastFeedbackReminderAt: new Date() }); out.feedback++; }
      }
    }
  } catch (e) { console.error("[wa] feedback reminders", e); }

  return out;
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

// Preferred language for a phone number, from its CRM contact (defaults to English).
async function langForPhone(phone: string): Promise<Lang> {
  const [c] = await db.select().from(crmContacts).where(eq(crmContacts.phone, phone.replace(/\D/g, "")));
  return ((c?.lang as Lang) || "en");
}

let schedulerStarted = false;
function startReminderScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  // Run ~10 min after boot, then hourly.
  setTimeout(() => { runReminders().catch(() => {}); }, 10 * 60 * 1000);
  setInterval(() => { runReminders().catch(() => {}); }, HOUR_MS);
}
