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
import { crmContacts, crmMessages, bottleKeeps, users, appSettings, songRequests } from "@shared/schema";
import { createBooking, slotLabels, slotsForDate, hoursTextFor, bookingHoursSummary, todayStr, parseTables, parseAreas } from "./booking";

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
export async function notifyAdmins(text: string) { await notifyAdmin(text); }

// Send an image (data URL or http URL) with a caption. Falls back to text when the
// linked Web session isn't available (Cloud API image upload not implemented).
export async function sendWhatsAppImage(to: string, imageUrl: string, caption: string): Promise<boolean> {
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

async function settingVal(key: string): Promise<string> {
  try { const [r] = await db.select().from(appSettings).where(eq(appSettings.key, key)); return r?.value || ""; }
  catch { return ""; }
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
    menu: {
      en: "How can I help? 🌊\n1️⃣ Book a table\n2️⃣ Request a song\nReply 1 or 2.",
      zh: "有什么可以帮您？🌊\n1️⃣ 预订桌位\n2️⃣ 点歌\n请回复 1 或 2。",
      id: "Ada yang bisa dibantu? 🌊\n1️⃣ Pesan meja\n2️⃣ Minta lagu\nBalas 1 atau 2.",
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
      en: "Which day? Reply: today, tomorrow, or a date like 2026-09-25.",
      zh: "哪一天？请回复：今天、明天，或日期如 2026-09-25。",
      id: "Hari apa? Balas: hari ini, besok, atau tanggal seperti 2026-09-25.",
    },
    bookAskSlot: {
      en: "{day} · {hours}\nChoose your start time:\n{list}\nReply the number.",
      zh: "{day} · {hours}\n请选择开始时间：\n{list}\n回复数字。",
      id: "{day} · {hours}\nPilih jam mulai:\n{list}\nBalas nomornya.",
    },
    bookAskTable: {
      en: "Which table? (see the layout image above)\n{list}\nReply the number.",
      zh: "选择哪张桌位？（见上方平面图）\n{list}\n回复数字。",
      id: "Meja mana? (lihat gambar denah di atas)\n{list}\nBalas nomornya.",
    },
    bookAskParty: {
      en: "How many people? (reply a number)",
      zh: "几位客人？（请回复数字）",
      id: "Berapa orang? (balas angka)",
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
      en: "🎤 Added your request: {title}{artist}. See it in the app under Song Requests. 💜",
      zh: "🎤 已收到你的点歌：{title}{artist}。可在应用的点歌记录查看。💜",
      id: "🎤 Permintaan lagu dicatat: {title}{artist}. Lihat di app pada Song Requests. 💜",
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
export async function handleInboundText(from: string, text: string, profileName?: string) {
  return handleInbound(from, text, profileName);
}

const MAX_BOT_REPLIES = 10; // stop auto-replying to a number after this many bot messages

function parseMenuIntent(s: string): "book" | "song" | "menu" | null {
  const t = s.trim().toLowerCase();
  if (/^1$|book|table|reserv|预订|订位|meja|pesan meja/.test(t)) return "book";
  if (/^2$|song|sing|request a song|点歌|唱歌|lagu/.test(t)) return "song";
  if (/^(menu|hi|hello|hey|start|help|3|你好|嗨|halo|hai)$/.test(t)) return "menu";
  return null;
}
function parseBookDate(s: string): string | null {
  const t = s.trim().toLowerCase();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  if (/today|hari ini|今天|tonight|今晚/.test(t)) return todayStr();
  if (/tomorrow|besok|明天|tmr/.test(t)) { const d = new Date(); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
  return null;
}
function weekdayOf(dateStr: string): number { const [y, m, d] = dateStr.split("-").map(Number); return new Date(y, m - 1, d).getDay(); }

async function handleInbound(from: string, text: string, profileName?: string) {
  const body = (text || "").trim();
  const c = await getOrCreateContact(from, profileName);
  await patchContact(c.id, { lastInboundAt: new Date() });
  await logMsg(c.id, c.phone, "in", body, false); // store every incoming message for the admin inbox

  const lang = (c.lang as Lang) || "en";
  const say = async (msg: string) => { await sendWhatsApp(from, msg); await logMsg(c.id, c.phone, "out", msg, true); };
  const wa: any = (c.waState as any) || {};

  // --- ONBOARDING (new numbers) ---
  if (c.stage === "new") { await say(WELCOME_TRILINGUAL); return patchContact(c.id, { stage: "await_lang" }); }
  if (c.stage === "await_lang") { const picked = parseLang(body) || "en"; await say(L(picked, "askName")); return patchContact(c.id, { lang: picked, stage: "await_name" }); }
  if (c.stage === "await_name") {
    if (!looksLikeName(body)) { await say(L(lang, "askName")); return; }
    await say(L(lang, "askEmail", { name: body }));
    return patchContact(c.id, { name: body, stage: "await_email" });
  }
  if (c.stage === "await_email") {
    const m = body.match(EMAIL_RE);
    if (!m) { await say(L(lang, "badEmail")); return; }
    await patchContact(c.id, { email: m[0].toLowerCase() });
    const { email, created } = await createMemberFromContact({ ...c, email: m[0].toLowerCase() } as Contact); // sets stage=member
    await say(created ? L(lang, "ready", { url: APP_BASE_URL, email, pw: DEFAULT_PASSWORD }) : L(lang, "welcomeBack", { url: APP_BASE_URL, email }));
    // Offer a booking straight away (with the table image if configured).
    await offerBooking(c, lang, from);
    return patchContact(c.id, { waState: { flow: null } });
  }

  // --- REVIEW REPLY (after payment) ---
  if (wa.flow === "review") {
    const stars = Number((body.match(/[1-5]/) || [])[0] || 0);
    const extra = stars >= 4 ? (wa.reviewUrl ? `Please leave us a Google review 🙏 ${wa.reviewUrl}` : "See you again soon! 💜") : "Thank you — we'll do better. 💜";
    if (stars) { await say(L(lang, "reviewThanks", { n: String(stars), extra })); await notifyAdmin(`⭐ ${c.name || from} rated ${stars}/5`); return patchContact(c.id, { waState: { flow: null } }); }
    // not a rating → fall through to normal handling
  }

  // --- ACTIVE FLOWS ---
  if (wa.flow === "book") return bookingStep(c, lang, from, body, wa, say);
  if (wa.flow === "song") return songStep(c, lang, from, body, say);

  // --- MENU INTENTS (work for members & returning contacts) ---
  const intent = parseMenuIntent(body);
  if (intent === "book") return startBooking(c, lang, from, say);
  if (intent === "song") { await say(L(lang, "songAsk")); return patchContact(c.id, { waState: { flow: "song" } }); }
  if (intent === "menu") { await say(L(lang, "menu")); return; }

  // --- No recognized command ---
  if (c.stage === "member" || c.stage === "active") {
    // Known contact, free-form chat → hand to staff (no AI chit-chat).
    await notifyAdmin(`💬 ${c.name || from}: "${body.slice(0, 160)}" — (bot silent, please reply)`);
    return;
  }
  // Still onboarding-ish → nudge with the menu (capped).
  if ((c.botReplies || 0) < MAX_BOT_REPLIES) { await say(L(lang, "menu")); await patchContact(c.id, { botReplies: (c.botReplies || 0) + 1 }); }
}

// Offer a booking (used right after signup). Sends the table image if one is set.
async function offerBooking(c: Contact, lang: Lang, from: string) {
  const hours = hoursTextFor(new Date().getDay());
  const caption = L(lang, "bookOffer", { hours });
  const img = await settingVal("bookingImageUrl");
  if (img) await sendWhatsAppImage(from, img, caption); else await sendWhatsApp(from, caption);
  await logMsg(c.id, c.phone, "out", caption, true);
}

async function startBooking(c: Contact, lang: Lang, from: string, say: (m: string) => Promise<void>) {
  if (!c.userId) { await say(L(lang, "bookNeedAcct")); return patchContact(c.id, { stage: "await_name", waState: { flow: null } }); }
  const areas = parseAreas(await settingVal("bookingAreas"));
  const list = areas.map((a, i) => `${i + 1}. ${a.name} (${a.level})`).join("\n");
  await say(L(lang, "bookAskArea", { list }));
  return patchContact(c.id, { waState: { flow: "book", step: "area" } });
}

async function bookingStep(c: Contact, lang: Lang, from: string, body: string, wa: any, say: (m: string) => Promise<void>) {
  const areas = parseAreas(await settingVal("bookingAreas"));
  if (wa.step === "area") {
    const idx = Number((body.match(/\d+/) || [])[0] || 0) - 1;
    if (idx < 0 || idx >= areas.length) { await say(`Reply a number 1-${areas.length}.`); return; }
    await say(L(lang, "bookAskDate"));
    return patchContact(c.id, { waState: { flow: "book", step: "date", areaId: areas[idx].id } });
  }
  const area = areas.find((a) => a.id === wa.areaId) || areas[0];
  if (wa.step === "date") {
    const date = parseBookDate(body);
    if (!date) { await say(L(lang, "bookAskDate")); return; }
    const list = slotLabels(date).map((t, i) => `${i + 1}. ${t}`).join("\n");
    const caption = L(lang, "bookAskSlot", { day: `${area.name} · ${date}`, hours: hoursTextFor(weekdayOf(date)), list });
    await say(caption);
    return patchContact(c.id, { waState: { flow: "book", step: "slot", areaId: area.id, date } });
  }
  if (wa.step === "slot") {
    const slots = slotsForDate(wa.date);
    const idx = Number((body.match(/[1-9]/) || [])[0] || 0) - 1;
    if (idx < 0 || idx >= slots.length) { await say(`Reply a number 1-${slots.length}.`); return; }
    if (area.tables.length) {
      // Ask which table/room next, showing the area's image if set.
      const list = area.tables.map((t, i) => `${i + 1}. ${t}`).join("\n");
      const caption = L(lang, "bookAskTable", { list });
      if (area.image) await sendWhatsAppImage(from, area.image, caption); else await say(caption);
      await logMsg(c.id, c.phone, "out", caption, true);
      return patchContact(c.id, { waState: { flow: "book", step: "table", areaId: area.id, date: wa.date, slot: slots[idx] } });
    }
    await say(L(lang, "bookAskParty"));
    return patchContact(c.id, { waState: { flow: "book", step: "party", areaId: area.id, date: wa.date, slot: slots[idx] } });
  }
  if (wa.step === "table") {
    const idx = Number((body.match(/\d+/) || [])[0] || 0) - 1;
    if (idx < 0 || idx >= area.tables.length) { await say(`Reply a number 1-${area.tables.length}.`); return; }
    await say(L(lang, "bookAskParty"));
    return patchContact(c.id, { waState: { flow: "book", step: "party", areaId: area.id, date: wa.date, slot: wa.slot, table: area.tables[idx] } });
  }
  if (wa.step === "party") {
    const n = Math.max(1, Math.min(50, Number((body.match(/\d+/) || [])[0] || 2)));
    const row = await createBooking({ userId: c.userId!, dateStr: wa.date, slot: wa.slot, partySize: n, table: wa.table, area: `${area.name} (${area.level})` });
    const label = slotLabels(wa.date)[slotsForDate(wa.date).indexOf(wa.slot)] || wa.slot;
    await say(L(lang, "bookDone", { day: wa.date, time: label, n: String(n), url: APP_BASE_URL }));
    await notifyAdmin(`📅 New WhatsApp booking #${row.id}: ${c.name || c.phone} · ${area.name} · ${wa.date} ${label} · ${wa.table ? "Table " + wa.table + " · " : ""}${n} pax — confirm in the app.`);
    return patchContact(c.id, { waState: { flow: null } });
  }
}

async function songStep(c: Contact, lang: Lang, from: string, body: string, say: (m: string) => Promise<void>) {
  if (!c.userId) { await say(L(lang, "bookNeedAcct")); return patchContact(c.id, { stage: "await_name", waState: { flow: null } }); }
  const parts = body.split(/\s*[-–—|]\s*|\s+by\s+/i);
  const title = (parts[0] || body).trim();
  const artist = (parts[1] || "").trim();
  if (!title) { await say(L(lang, "songAsk")); return; }
  await db.insert(songRequests).values({ userId: c.userId, title, artist, status: "pending" });
  await say(L(lang, "songDone", { title, artist: artist ? ` - ${artist}` : "" }));
  await notifyAdmin(`🎤 WhatsApp song request from ${c.name || c.phone}: ${title}${artist ? " - " + artist : ""}`);
  return patchContact(c.id, { waState: { flow: null } });
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
    const lang = ((contact?.lang as Lang) || "en");
    const link = opts.reviewUrl ? `\n${opts.reviewUrl}` : "";
    const msg = L(lang, "review", { club: opts.club, link });
    const ok = await sendWhatsApp(num, msg);
    if (contact) { await logMsg(contact.id, num, "out", msg, true); await patchContact(contact.id, { waState: { flow: "review", reviewUrl: opts.reviewUrl || "" } }); }
    return ok;
  } catch (e) { console.error("[wa] review request", e); }
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
      const blang = await langForPhone(phone);
      const ok = await sendWhatsApp(phone, L(blang, "bottle", { name: b.memberName || "", item: b.name, qty: String(b.quantity), days: String(daysLeft) }));
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
