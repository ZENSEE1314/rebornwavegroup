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
import { crmContacts, bottleKeeps, users } from "@shared/schema";

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

  // The bot only onboards NEW numbers. Old/known contacts (already members, or past
  // the reply cap) get no auto-reply — a human handles them; reminders still go out.
  const isOld = c.stage === "member" || c.stage === "active" || (c.botReplies || 0) >= MAX_BOT_REPLIES;
  if (isOld) {
    await notifyAdmin(`💬 ${c.name || from}: "${body.slice(0, 160)}" — (bot silent, please reply)`);
    return;
  }

  // Count each auto-reply toward the cap; the bot goes quiet once it's hit.
  let sent = 0;
  const reply = async (msg: string) => { const ok = await sendWhatsApp(from, msg); if (ok) sent++; return ok; };
  const finish = async (patch: Partial<Contact> = {}) => {
    await patchContact(c.id, { ...patch, botReplies: (c.botReplies || 0) + sent });
  };

  const stage = c.stage;
  // 1) Brand-new or still needs a name.
  if (stage === "new" || (stage === "await_name" && !looksLikeName(body))) {
    await reply(`Hello! 👋 Welcome to Reborn Wave Group. May I know your name?`);
    return finish({ stage: "await_name" });
  }
  if (stage === "await_name") {
    await reply(`Nice to meet you, ${body}! 🎉 What's your email address? I'll set up your member account.`);
    return finish({ name: body, stage: "await_email" });
  }
  // 2) Capturing email → create the account.
  if (stage === "await_email") {
    const m = body.match(EMAIL_RE);
    if (!m) { await reply(`That doesn't look like an email. Please send it like name@example.com 🙂`); return finish(); }
    await patchContact(c.id, { email: m[0].toLowerCase() });
    const fresh = { ...c, email: m[0].toLowerCase() } as Contact;
    const { email, created } = await createMemberFromContact(fresh); // sets stage=member
    await reply(created
      ? `All set! ✅ Your member account is ready.\n\n🔗 ${APP_BASE_URL}\n📧 ${email}\n🔑 Password: ${DEFAULT_PASSWORD}\n\nPlease log in and change your password. Our team will help you from here — reply anytime. 💜`
      : `Welcome back! You already have an account (${email}). Log in at ${APP_BASE_URL}. Our team will help you from here. 💜`);
    return finish(); // stage already 'member' → future messages go to staff
  }

  // Fallback within onboarding window.
  await reply(`Thanks ${c.name || "there"}! A team member will reply shortly. 💜`);
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
      const ok = await sendWhatsApp(phone, `Hi ${b.memberName || "there"}! 🍾 Your kept ${b.name} (${b.quantity} left) is waiting at Reborn Wave — it expires in ${days} day(s). Come finish it before it's gone! 💜`);
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
      const ok = await sendWhatsApp(c.phone, `Hey ${c.name || "there"}! 🌊 We miss you at Reborn Wave. Come back and enjoy — reply "book" and I'll reserve your spot. 🎉`);
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
        const ok = await sendWhatsApp(c.phone, `Thanks for coming to Reborn Wave tonight, ${c.name || "friend"}! 🙏 How was your experience? Reply here — we read every message. See you again soon! 💜`);
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

let schedulerStarted = false;
function startReminderScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  // Run ~10 min after boot, then hourly.
  setTimeout(() => { runReminders().catch(() => {}); }, 10 * 60 * 1000);
  setInterval(() => { runReminders().catch(() => {}); }, HOUR_MS);
}
