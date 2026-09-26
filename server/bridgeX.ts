import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import { getUserId } from "./multiAuth";
import {
  bridgeBranches,
  bridgeCompanies,
  bridgeCompanyMembers,
  bridgeCompanyModules,
  bridgeDeviceTokens,
  bridgeMeetings,
  bridgeMerchantApplications,
  bridgeNotifications,
  bridgePositions,
  bridgeStaffNotes,
  bridgeStaffProfiles,
  bridgeStaffReviews,
  leaveRequests,
  posProducts,
  posTicketItems,
  posTickets,
  staffAttendance,
  users,
  workerShifts,
} from "../shared/schema";

export const BRIDGEX_MODULES = [
  "pos", "restaurant", "ktv", "beauty", "booking", "inventory", "employees",
  "payroll", "membership", "loyalty", "qr_ordering", "kitchen_display",
  "accounting", "analytics", "retail", "ai_whatsapp", "ai_telegram",
  "song_requests", "bottle_keep", "faq_automation", "games",
] as const;
export const BRIDGEX_NOTIFICATION_EVENTS = [
  "new_order", "order_status", "order_paid", "payment_completed", "low_stock", "new_booking", "booking_status", "booking_cancelled",
  "shift", "attendance", "attendance_decision", "leave_request", "leave_decision", "staff_review", "meeting",
  "payroll_published", "subscription_renewal", "loyalty_reward", "pet_hungry", "kos_gift", "chat_message", "friend_request",
  "new_event", "admin_broadcast", "new_faq", "song_request", "song_request_update", "feedback",
] as const;

const MANAGEMENT_ROLES = new Set(["owner", "admin", "manager"]);
const bridgeStripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-06-30.basil" }) : null;
const PLATFORM_EMAILS = () => new Set(
  (process.env.BRIDGEX_SUPER_ADMIN_EMAILS || process.env.ADMIN_EMAIL || "zensee1314@gmail.com")
    .split(",").map((value) => value.trim().toLowerCase()).filter(Boolean),
);

type AsyncHandler = (req: Request, res: Response) => Promise<unknown>;
const route = (handler: AsyncHandler) => async (req: Request, res: Response) => {
  try { await handler(req, res); }
  catch (error) {
    console.error("BridgeXPOS API error", error);
    if (!res.headersSent) res.status(500).json({ message: "BridgeXPOS request failed" });
  }
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 56);
}

async function currentUser(req: Request) {
  const userId = getUserId(req);
  if (!userId) return null;
  return (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0] || null;
}

async function isPlatformAdmin(req: Request) {
  const user = await currentUser(req);
  return !!user?.email && PLATFORM_EMAILS().has(user.email.toLowerCase());
}

async function requireUser(req: Request, res: Response) {
  const user = await currentUser(req);
  if (!user) res.status(401).json({ message: "Sign in required" });
  return user;
}

function requestedCompanyId(req: Request) {
  const raw = req.header("x-company-id") || req.query.companyId || req.body?.companyId;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

async function companyAccess(req: Request, res: Response, management = false) {
  const user = await requireUser(req, res);
  if (!user) return null;
  const companyId = requestedCompanyId(req);
  if (!companyId) {
    res.status(400).json({ message: "Select a company with X-Company-Id" });
    return null;
  }
  if (await isPlatformAdmin(req)) return { user, companyId, role: "platform_admin", branchId: null };
  const member = (await db.select().from(bridgeCompanyMembers).where(and(
    eq(bridgeCompanyMembers.companyId, companyId),
    eq(bridgeCompanyMembers.userId, user.id),
    eq(bridgeCompanyMembers.status, "active"),
  )).limit(1))[0];
  if (!member || (management && !MANAGEMENT_ROLES.has(member.role))) {
    res.status(403).json({ message: management ? "Company management access required" : "Company access denied" });
    return null;
  }
  return { user, companyId, role: member.role, branchId: member.branchId };
}

async function ensureUser(email: string, name: string, password?: string) {
  const normalized = email.trim().toLowerCase();
  const existing = (await db.select().from(users).where(eq(users.email, normalized)).limit(1))[0];
  if (existing) return { user: existing, temporaryPassword: null };
  const temporaryPassword = password || `BX-${randomUUID().slice(0, 8)}`;
  const [user] = await db.insert(users).values({
    id: randomUUID(), email: normalized, password: await bcrypt.hash(temporaryPassword, 12),
    authProvider: "email", firstName: name || normalized.split("@")[0], role: "user",
    referralCode: `BX${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`,
    mustChangePassword: true,
  }).returning();
  return { user, temporaryPassword };
}

async function createCompany(req: Request, ownerUserId: string, body: any) {
  const name = String(body.name || "").trim();
  if (!name) throw new Error("Company name is required");
  const baseSlug = slugify(body.slug || name) || `company-${Date.now()}`;
  const slug = `${baseSlug}-${randomUUID().slice(0, 5)}`;
  const [company] = await db.insert(bridgeCompanies).values({
    slug, name, appName: String(body.appName || name).trim(),
    industry: String(body.industry || "other"), logoUrl: body.logoUrl || null,
    websiteDomain: body.websiteDomain ? String(body.websiteDomain).toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "") : null,
    appIconUrl: body.appIconUrl || body.logoUrl || null,
    androidPackage: body.androidPackage || null,
    iosBundleId: body.iosBundleId || null,
    theme: body.theme || {}, status: body.status || "trial",
    subscriptionPlan: body.subscriptionPlan || "starter",
    billingModel: body.billingModel || "subscription",
    billingCycle: body.billingModel === "one_time" ? "one_time" : body.billingCycle || "monthly",
    price: String(body.price || 0), currency: body.currency || "IDR",
    subscriptionStatus: body.subscriptionStatus || "trialing",
    trialEndsAt: new Date(Date.now() + 7 * 86400000), createdBy: ownerUserId,
  }).returning();
  const [branch] = await db.insert(bridgeBranches).values({
    companyId: company.id, name: body.branchName || "Main Outlet", code: "MAIN",
    address: body.address || null, timezone: body.timezone || "Asia/Jakarta",
  }).returning();
  const defaults = ["admin", "manager", "cashier", "waiter", "chef"];
  const positions = await db.insert(bridgePositions).values(defaults.map((name) => ({
    companyId: company.id, name: name[0].toUpperCase() + name.slice(1), code: name,
    permissions: name === "admin" ? ["*"] : [],
  }))).returning();
  const selected = Array.isArray(body.modules) ? body.modules.filter((key: string) => BRIDGEX_MODULES.includes(key as any)) : ["pos", "inventory", "employees"];
  if (selected.length) await db.insert(bridgeCompanyModules).values(selected.map((moduleKey: string) => ({ companyId: company.id, moduleKey })));
  await db.insert(bridgeCompanyMembers).values({ companyId: company.id, userId: ownerUserId, branchId: branch.id, positionId: positions[0]?.id, role: "owner" });
  return { company, branch, modules: selected };
}

export async function sendBridgeXNotifications(companyId: number, userIds: string[], payload: { type: string; title: string; body: string; data?: Record<string, unknown> }) {
  const targets = Array.from(new Set(userIds.filter(Boolean)));
  if (!targets.length) return;
  const notices = await db.insert(bridgeNotifications).values(targets.map((userId) => ({ companyId, userId, type: payload.type, title: payload.title, body: payload.body, data: payload.data || {} }))).returning();
  const tokens = await db.select().from(bridgeDeviceTokens).where(and(inArray(bridgeDeviceTokens.userId, targets), eq(bridgeDeviceTokens.active, true)));
  if (!tokens.length) {
    await db.update(bridgeNotifications).set({ pushStatus: "no_device" }).where(inArray(bridgeNotifications.id, notices.map((notice) => notice.id)));
    return;
  }
  const messages = tokens.map((token) => ({
    to: token.expoPushToken,
    sound: "default",
    priority: "high",
    channelId: "bridgex",
    badge: 1,
    ttl: 86400,
    title: payload.title,
    body: payload.body,
    data: { type: payload.type, companyId, ...(payload.data || {}) },
  }));
  // When the Expo project has "Enhanced Security for push" on (set once you
  // create an access token), sends must be authenticated or Expo rejects them.
  const expoToken = process.env.EXPO_ACCESS_TOKEN;
  const pushHeaders: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (expoToken) pushHeaders["Authorization"] = `Bearer ${expoToken}`;
  try {
    const tickets: any[] = [];
    for (let start = 0; start < messages.length; start += 100) {
      const response = await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers: pushHeaders, body: JSON.stringify(messages.slice(start, start + 100)) });
      if (!response.ok) throw new Error(`Expo push rejected ${response.status}: ${await response.text()}`);
      const result: any = await response.json();
      tickets.push(...(Array.isArray(result?.data) ? result.data : [result?.data]));
    }
    const invalid = tokens.filter((_, index) => tickets[index]?.details?.error === "DeviceNotRegistered");
    if (invalid.length) await db.update(bridgeDeviceTokens).set({ active: false, updatedAt: new Date() }).where(inArray(bridgeDeviceTokens.id, invalid.map((token) => token.id)));
    await db.update(bridgeNotifications).set({ pushStatus: tickets.some((ticket: any) => ticket?.status === "ok") ? "sent" : "failed" }).where(inArray(bridgeNotifications.id, notices.map((notice) => notice.id)));
    console.info("Expo push result", { type: payload.type, recipients: targets.length, devices: tokens.length, accepted: tickets.filter((ticket: any) => ticket?.status === "ok").length });
  } catch (error) {
    await db.update(bridgeNotifications).set({ pushStatus: "failed" }).where(inArray(bridgeNotifications.id, notices.map((notice) => notice.id)));
    console.warn("Expo push unavailable", error);
  }
}

const liveCompanyClients = new Map<number, Set<Response>>();
export function emitCompanyChange(companyId: number, resource = "all") {
  const message = `event: change\ndata: ${JSON.stringify({ companyId, resource, at: Date.now() })}\n\n`;
  for (const client of Array.from(liveCompanyClients.get(companyId) || [])) client.write(message);
}

export async function sendRebornStaffNotification(payload: { type: string; title: string; body: string; data?: Record<string, unknown> }) {
  const company = (await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.slug, "reborn-wave-group")).limit(1))[0];
  if (!company) return;
  const members = await db.select().from(bridgeCompanyMembers).where(and(
    eq(bridgeCompanyMembers.companyId, company.id),
    eq(bridgeCompanyMembers.status, "active"),
    inArray(bridgeCompanyMembers.role, ["owner", "admin", "manager", "staff"]),
  ));
  const roleUsers = await db.select({ id: users.id }).from(users).where(inArray(users.role, ["admin", "staff"]));
  await sendBridgeXNotifications(company.id, [...members.map((member) => member.userId), ...roleUsers.map((user) => user.id)], payload);
  emitCompanyChange(company.id, String(payload.data?.path || "notifications"));
}

export async function sendRebornUserNotification(userId: string | null | undefined, payload: { type: string; title: string; body: string; data?: Record<string, unknown> }) {
  if (!userId) return;
  const company = (await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.slug, "reborn-wave-group")).limit(1))[0];
  if (!company) return;
  await sendBridgeXNotifications(company.id, [userId], payload);
  emitCompanyChange(company.id, String(payload.data?.path || "notifications"));
}

export async function sendRebornAllNotification(payload: { type: string; title: string; body: string; data?: Record<string, unknown> }) {
  const company = (await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.slug, "reborn-wave-group")).limit(1))[0];
  if (!company) return;
  const allUsers = await db.select({ id: users.id }).from(users);
  await sendBridgeXNotifications(company.id, allUsers.map((user) => user.id), payload);
  emitCompanyChange(company.id, String(payload.data?.path || "notifications"));
}

export async function ensureBridgeXSchema() {
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS bridge_companies (id serial PRIMARY KEY, slug varchar UNIQUE NOT NULL, name varchar NOT NULL, app_name varchar NOT NULL, industry varchar NOT NULL DEFAULT 'other', logo_url text, website_domain varchar UNIQUE, app_icon_url text, android_package varchar UNIQUE, ios_bundle_id varchar UNIQUE, theme jsonb NOT NULL DEFAULT '{}', status varchar NOT NULL DEFAULT 'active', subscription_plan varchar NOT NULL DEFAULT 'starter', billing_model varchar NOT NULL DEFAULT 'subscription', billing_cycle varchar NOT NULL DEFAULT 'monthly', price numeric(14,2) NOT NULL DEFAULT 0, currency varchar NOT NULL DEFAULT 'IDR', subscription_status varchar NOT NULL DEFAULT 'trialing', trial_ends_at timestamp, created_by varchar, created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now());
    ALTER TABLE bridge_companies ADD COLUMN IF NOT EXISTS website_domain varchar; ALTER TABLE bridge_companies ADD COLUMN IF NOT EXISTS app_icon_url text; ALTER TABLE bridge_companies ADD COLUMN IF NOT EXISTS android_package varchar; ALTER TABLE bridge_companies ADD COLUMN IF NOT EXISTS ios_bundle_id varchar; ALTER TABLE bridge_companies ADD COLUMN IF NOT EXISTS billing_model varchar NOT NULL DEFAULT 'subscription'; ALTER TABLE bridge_companies ADD COLUMN IF NOT EXISTS billing_cycle varchar NOT NULL DEFAULT 'monthly'; ALTER TABLE bridge_companies ADD COLUMN IF NOT EXISTS price numeric(14,2) NOT NULL DEFAULT 0; ALTER TABLE bridge_companies ADD COLUMN IF NOT EXISTS currency varchar NOT NULL DEFAULT 'IDR';
    CREATE UNIQUE INDEX IF NOT EXISTS bridge_companies_website_domain_key ON bridge_companies(website_domain) WHERE website_domain IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS bridge_companies_android_package_key ON bridge_companies(android_package) WHERE android_package IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS bridge_companies_ios_bundle_id_key ON bridge_companies(ios_bundle_id) WHERE ios_bundle_id IS NOT NULL;
    CREATE TABLE IF NOT EXISTS bridge_branches (id serial PRIMARY KEY, company_id integer NOT NULL, name varchar NOT NULL, code varchar NOT NULL, address text, timezone varchar NOT NULL DEFAULT 'Asia/Jakarta', active boolean NOT NULL DEFAULT true, created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now(), UNIQUE(company_id, code));
    CREATE TABLE IF NOT EXISTS bridge_company_modules (company_id integer NOT NULL, module_key varchar NOT NULL, enabled boolean NOT NULL DEFAULT true, config jsonb NOT NULL DEFAULT '{}', updated_at timestamp NOT NULL DEFAULT now(), PRIMARY KEY(company_id, module_key));
    CREATE TABLE IF NOT EXISTS bridge_merchant_applications (id serial PRIMARY KEY, company_id integer NOT NULL, applicant_user_id varchar NOT NULL, contact_name varchar NOT NULL, contact_email varchar NOT NULL, contact_phone varchar, requirements jsonb NOT NULL DEFAULT '{}', status varchar NOT NULL DEFAULT 'submitted', review_note text, reviewed_by varchar, created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS bridge_positions (id serial PRIMARY KEY, company_id integer NOT NULL, name varchar NOT NULL, code varchar NOT NULL, permissions jsonb NOT NULL DEFAULT '[]', active boolean NOT NULL DEFAULT true, created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now(), UNIQUE(company_id, code));
    CREATE TABLE IF NOT EXISTS bridge_company_members (id serial PRIMARY KEY, company_id integer NOT NULL, user_id varchar NOT NULL, branch_id integer, position_id integer, role varchar NOT NULL DEFAULT 'staff', status varchar NOT NULL DEFAULT 'active', joined_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now(), UNIQUE(company_id, user_id));
    CREATE TABLE IF NOT EXISTS bridge_staff_profiles (id serial PRIMARY KEY, company_id integer NOT NULL, user_id varchar NOT NULL, branch_id integer, position_id integer, employment_type varchar NOT NULL DEFAULT 'full_time', pay_type varchar NOT NULL DEFAULT 'salary', base_salary numeric(14,2) NOT NULL DEFAULT 0, hourly_rate numeric(14,2) NOT NULL DEFAULT 0, commission_rate numeric(6,2) NOT NULL DEFAULT 0, sales_target numeric(14,2) NOT NULL DEFAULT 0, hire_date varchar, status varchar NOT NULL DEFAULT 'active', ranking_score numeric(10,2) NOT NULL DEFAULT 0, star_grade numeric(3,2) NOT NULL DEFAULT 0, created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now(), UNIQUE(company_id, user_id));
    CREATE TABLE IF NOT EXISTS bridge_staff_reviews (id serial PRIMARY KEY, company_id integer NOT NULL, branch_id integer, staff_user_id varchar NOT NULL, customer_user_id varchar, rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5), note text, sentiment varchar NOT NULL DEFAULT 'neutral', visible boolean NOT NULL DEFAULT true, created_at timestamp NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS bridge_staff_notes (id serial PRIMARY KEY, company_id integer NOT NULL, staff_user_id varchar NOT NULL, author_user_id varchar NOT NULL, note text NOT NULL, visibility varchar NOT NULL DEFAULT 'management', created_at timestamp NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS bridge_meetings (id serial PRIMARY KEY, company_id integer NOT NULL, branch_id integer, title varchar NOT NULL, agenda text, starts_at timestamp NOT NULL, location varchar, status varchar NOT NULL DEFAULT 'scheduled', created_by varchar NOT NULL, created_at timestamp NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS bridge_device_tokens (id serial PRIMARY KEY, user_id varchar NOT NULL, company_id integer, expo_push_token text UNIQUE NOT NULL, platform varchar NOT NULL, device_id varchar, active boolean NOT NULL DEFAULT true, updated_at timestamp NOT NULL DEFAULT now(), created_at timestamp NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS bridge_notifications (id serial PRIMARY KEY, company_id integer, user_id varchar NOT NULL, type varchar NOT NULL, title varchar NOT NULL, body text NOT NULL, data jsonb NOT NULL DEFAULT '{}', push_status varchar NOT NULL DEFAULT 'pending', read_at timestamp, created_at timestamp NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS venue_checkins (id serial PRIMARY KEY, company_id integer, user_id varchar NOT NULL, venue_day varchar NOT NULL, session_code varchar NOT NULL, checked_in_at timestamp NOT NULL DEFAULT now(), checked_out_at timestamp, UNIQUE(venue_day,user_id));
    CREATE TABLE IF NOT EXISTS member_wallet_transactions (id serial PRIMARY KEY, user_id varchar NOT NULL, type varchar NOT NULL, rp_amount numeric(14,2) NOT NULL DEFAULT 0, kgold_amount integer NOT NULL DEFAULT 0, description text NOT NULL, reference_type varchar, reference_id varchar, created_at timestamp NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS venue_checkin_session_active ON venue_checkins(venue_day,session_code,checked_out_at);
    CREATE INDEX IF NOT EXISTS member_wallet_user_created ON member_wallet_transactions(user_id,created_at);
    CREATE TABLE IF NOT EXISTS bridge_feedback (id serial PRIMARY KEY, company_id integer NOT NULL, branch_id integer, user_id varchar, category varchar NOT NULL, staff_user_id varchar, rating integer CHECK (rating BETWEEN 1 AND 5), subject varchar, message text NOT NULL, status varchar NOT NULL DEFAULT 'new', created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS bridge_company_settings (company_id integer PRIMARY KEY, config jsonb NOT NULL DEFAULT '{}', updated_at timestamp NOT NULL DEFAULT now());
    ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS company_id integer; ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS branch_id integer;
    ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS supplier_name varchar; ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS supplier_address text; ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS supplier_phone varchar;
    ALTER TABLE song_requests ADD COLUMN IF NOT EXISTS performance_mode varchar NOT NULL DEFAULT 'self';
    ALTER TABLE pos_tickets ADD COLUMN IF NOT EXISTS company_id integer; ALTER TABLE pos_tickets ADD COLUMN IF NOT EXISTS branch_id integer; ALTER TABLE pos_tickets ADD COLUMN IF NOT EXISTS payment_reference varchar;
    ALTER TABLE pos_tickets ADD COLUMN IF NOT EXISTS cash_received numeric(10,2); ALTER TABLE pos_tickets ADD COLUMN IF NOT EXISTS change_given numeric(10,2); ALTER TABLE pos_tickets ADD COLUMN IF NOT EXISTS adjustment_reason text; ALTER TABLE pos_tickets ADD COLUMN IF NOT EXISTS refund_reason text; ALTER TABLE pos_tickets ADD COLUMN IF NOT EXISTS refunded_by varchar; ALTER TABLE pos_tickets ADD COLUMN IF NOT EXISTS refunded_at timestamp;
    ALTER TABLE bridge_staff_profiles ADD COLUMN IF NOT EXISTS commission_rate numeric(6,2) NOT NULL DEFAULT 0; ALTER TABLE bridge_staff_profiles ADD COLUMN IF NOT EXISTS sales_target numeric(14,2) NOT NULL DEFAULT 0;
    ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS company_id integer; ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS branch_id integer;
    ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS company_id integer; ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS branch_id integer;
    ALTER TABLE staff_attendance ADD COLUMN IF NOT EXISTS company_id integer; ALTER TABLE staff_attendance ADD COLUMN IF NOT EXISTS branch_id integer;
    ALTER TABLE worker_shifts ADD COLUMN IF NOT EXISTS company_id integer; ALTER TABLE worker_shifts ADD COLUMN IF NOT EXISTS branch_id integer;
    ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS company_id integer; ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS branch_id integer;
    ALTER TABLE events ADD COLUMN IF NOT EXISTS company_id integer; ALTER TABLE events ADD COLUMN IF NOT EXISTS branch_id integer;
  `));
  const reborn = (await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.slug, "reborn-wave-group")).limit(1))[0]
    || (await db.insert(bridgeCompanies).values({ slug: "reborn-wave-group", name: "Reborn Wave Group", appName: "Reborn", industry: "entertainment", status: "active", subscriptionPlan: "enterprise", subscriptionStatus: "active" }).returning())[0];
  await db.update(bridgeCompanies).set({ appName: "Reborn", industry: "entertainment", websiteDomain: "rebornwave.group", androidPackage: "com.rebornwave.group", iosBundleId: "com.rebornwave.group", status: "active", subscriptionPlan: "enterprise", subscriptionStatus: "active", updatedAt: new Date() }).where(eq(bridgeCompanies.id, reborn.id));
  let branch = (await db.select().from(bridgeBranches).where(and(eq(bridgeBranches.companyId, reborn.id), eq(bridgeBranches.code, "MAIN"))).limit(1))[0];
  if (!branch) [branch] = await db.insert(bridgeBranches).values({ companyId: reborn.id, name: "Reborn Batam", code: "MAIN", address: "Batam, Indonesia" }).returning();
  await db.execute(sql.raw(`INSERT INTO bridge_company_modules (company_id, module_key, enabled) SELECT ${reborn.id}, module_key, true FROM unnest(ARRAY[${BRIDGEX_MODULES.map((key) => `'${key}'`).join(",")}]::text[]) module_key ON CONFLICT (company_id, module_key) DO NOTHING`));
  await db.execute(sql`INSERT INTO bridge_company_settings (company_id, config) VALUES (${reborn.id}, ${JSON.stringify({ loyalty: { pointsSpendRp: 1000, rewardsEnabled: true, tiers: [{ name: "Bronze", minPoints: 0, discountPercent: 0, freeRp: 0, benefits: ["Member access"] }, { name: "Silver", minPoints: 500, discountPercent: 2, freeRp: 0, benefits: ["Priority booking"] }, { name: "Gold", minPoints: 2000, discountPercent: 5, freeRp: 50000, benefits: ["5% discount", "RP 50,000 store gift"] }] }, services: { booking: true, faq: true, songRequests: true, bottleKeep: true, aiWhatsApp: true, aiTelegram: false }, booking: { areas: [] }, automation: { reminders: [], faq: [] }, provision: { domainStatus: "live", backendStatus: "live", appStyle: "reborn" } })}::jsonb) ON CONFLICT (company_id) DO NOTHING`);
  await db.execute(sql`INSERT INTO bridge_company_members (company_id, user_id, branch_id, role) SELECT ${reborn.id}, id, ${branch.id}, CASE WHEN role='admin' THEN 'admin' WHEN role='staff' THEN 'staff' ELSE 'member' END FROM users ON CONFLICT (company_id, user_id) DO NOTHING`);
  for (const table of ["pos_products", "pos_tickets", "stock_movements", "ledger_entries", "staff_attendance", "worker_shifts", "leave_requests", "events"]) {
    await db.execute(sql.raw(`UPDATE ${table} SET company_id=${reborn.id}, branch_id=${branch.id} WHERE company_id IS NULL`));
  }
}

export function registerBridgeXRoutes(app: Express) {
  app.get("/api/v1/company/live", route(async (req, res) => {
    const access = await companyAccess(req, res); if (!access) return;
    res.setHeader("Content-Type", "text/event-stream"); res.setHeader("Cache-Control", "no-cache, no-transform"); res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.(); res.write(`event: ready\ndata: ${JSON.stringify({ companyId: access.companyId })}\n\n`);
    const clients = liveCompanyClients.get(access.companyId) || new Set<Response>(); clients.add(res); liveCompanyClients.set(access.companyId, clients);
    const heartbeat = setInterval(() => res.write(": keepalive\n\n"), 25000);
    req.on("close", () => { clearInterval(heartbeat); clients.delete(res); if (!clients.size) liveCompanyClients.delete(access.companyId); });
  }));
  app.use("/api/v1", (req, res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) res.on("finish", () => { const id = requestedCompanyId(req); if (id && res.statusCode < 400) emitCompanyChange(id, req.path); });
    next();
  });
  app.use(["/api/v1/company/pos", "/api/v1/company/attendance", "/api/v1/company/leave", "/api/v1/company/shifts"], async (req, res, next) => {
    try {
      const companyId = requestedCompanyId(req); if (!companyId) return res.status(400).json({ message: "Company required" });
      const company = (await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.id, companyId)).limit(1))[0];
      const trialActive = company?.subscriptionStatus === "trialing" && !!company.trialEndsAt && new Date(company.trialEndsAt).getTime() > Date.now();
      if (!company || (company.subscriptionStatus !== "active" && !trialActive)) return res.status(402).json({ message: "Company access is locked. Start a trial or complete payment to continue.", code: "SUBSCRIPTION_REQUIRED" });
      next();
    } catch (error) { next(error); }
  });
  app.post("/api/v1/merchant/apply", route(async (req, res) => {
    const body = req.body || {};
    const email = String(body.email || "").trim().toLowerCase(); const password = String(body.password || "");
    const firstName = String(body.firstName || "").trim(); const lastName = String(body.lastName || "").trim();
    if (!email || !email.includes("@") || password.length < 8 || !firstName || !body.companyName) return res.status(400).json({ message: "Company, owner name, valid email and an 8-character password are required" });
    let user = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
    if (user) {
      if (!user.password || !(await bcrypt.compare(password, user.password))) return res.status(409).json({ message: "This email already has an account. Sign in first, then create the company from BridgeXPOS." });
    } else {
      user = (await ensureUser(email, `${firstName} ${lastName}`.trim(), password)).user;
      await db.update(users).set({ firstName, lastName, phoneNumber: body.phone || null, mustChangePassword: false, updatedAt: new Date() }).where(eq(users.id, user.id));
    }
    const created = await createCompany(req, user.id, {
      name: body.companyName, appName: body.appName || body.companyName, industry: body.industry,
      logoUrl: body.logoUrl, websiteDomain: body.websiteDomain, branchName: body.branchName,
      address: body.address, timezone: body.timezone, modules: body.modules,
      subscriptionPlan: body.subscriptionPlan, billingModel: body.billingModel,
      billingCycle: body.billingCycle, price: body.price, currency: body.currency,
    });
    const requirements = {
      outletCount: Math.max(1, Number(body.outletCount || 1)), expectedStaff: Math.max(1, Number(body.expectedStaff || 1)),
      requestedModules: created.modules, desiredLaunchDate: body.desiredLaunchDate || null,
      needsWebsite: body.needsWebsite !== false, needsAndroidApp: !!body.needsAndroidApp,
      needsIosApp: !!body.needsIosApp, notes: body.notes || null,
    };
    const [application] = await db.insert(bridgeMerchantApplications).values({ companyId: created.company.id, applicantUserId: user.id, contactName: `${firstName} ${lastName}`.trim(), contactEmail: email, contactPhone: body.phone || null, requirements }).returning();
    await new Promise<void>((resolve, reject) => req.login(user as any, (error) => error ? reject(error) : resolve()));
    res.status(201).json({ ...created, application, next: "/bridgex" });
  }));

  app.get("/api/v1/platform/applications", route(async (req, res) => {
    if (!(await isPlatformAdmin(req))) return res.status(403).json({ message: "Platform admin required" });
    const result = await db.execute(sql`SELECT a.*, c.name company_name, c.app_name FROM bridge_merchant_applications a JOIN bridge_companies c ON c.id=a.company_id ORDER BY a.id DESC`); res.json(result.rows || result);
  }));
  app.patch("/api/v1/platform/applications/:id", route(async (req, res) => {
    const admin = await requireUser(req, res); if (!admin) return; if (!(await isPlatformAdmin(req))) return res.status(403).json({ message: "Platform admin required" });
    const status = String(req.body?.status || ""); if (!["reviewing", "approved", "rejected"].includes(status)) return res.status(400).json({ message: "Invalid application status" });
    const [application] = await db.update(bridgeMerchantApplications).set({ status, reviewNote: req.body?.reviewNote || null, reviewedBy: admin.id, updatedAt: new Date() }).where(eq(bridgeMerchantApplications.id, Number(req.params.id))).returning();
    if (!application) return res.status(404).json({ message: "Application not found" });
    if (status === "approved") await db.update(bridgeCompanies).set({ status: "active", updatedAt: new Date() }).where(eq(bridgeCompanies.id, application.companyId));
    res.json(application);
  }));

  app.get("/api/v1/platform/bootstrap", route(async (req, res) => {
    const user = await requireUser(req, res); if (!user) return;
    res.json({ brand: "BridgeXPOS", platformAdmin: await isPlatformAdmin(req), modules: BRIDGEX_MODULES, notificationEvents: BRIDGEX_NOTIFICATION_EVENTS });
  }));

  app.get("/api/v1/platform/companies", route(async (req, res) => {
    if (!(await isPlatformAdmin(req))) return res.status(403).json({ message: "Platform admin required" });
    res.json(await db.select().from(bridgeCompanies).orderBy(desc(bridgeCompanies.id)));
  }));

  app.get("/api/v1/platform/users", route(async (req, res) => {
    if (!(await isPlatformAdmin(req))) return res.status(403).json({ message: "Platform admin required" });
    const q = `%${String(req.query.q || "").trim()}%`;
    const result = await db.execute(sql`SELECT id, email, first_name, last_name, role FROM users WHERE email ILIKE ${q} OR first_name ILIKE ${q} OR last_name ILIKE ${q} ORDER BY created_at DESC LIMIT 80`);
    res.json(result.rows || result);
  }));

  app.post("/api/v1/platform/companies", route(async (req, res) => {
    const admin = await requireUser(req, res); if (!admin) return;
    if (!(await isPlatformAdmin(req))) return res.status(403).json({ message: "Platform admin required" });
    let ownerId = admin.id, credentials = null;
    if (req.body?.adminEmail) { const ensured = await ensureUser(req.body.adminEmail, req.body.adminName || "Company Admin", req.body.adminPassword); ownerId = ensured.user.id; credentials = ensured.temporaryPassword; }
    res.status(201).json({ ...(await createCompany(req, ownerId, req.body || {})), temporaryPassword: credentials });
  }));

  app.post("/api/v1/companies", route(async (req, res) => {
    const user = await requireUser(req, res); if (!user) return;
    res.status(201).json(await createCompany(req, user.id, req.body || {}));
  }));

  app.get("/api/v1/companies", route(async (req, res) => {
    const user = await requireUser(req, res); if (!user) return;
    if (await isPlatformAdmin(req)) return res.json(await db.select().from(bridgeCompanies).orderBy(bridgeCompanies.name));
    const memberships = await db.select().from(bridgeCompanyMembers).where(and(eq(bridgeCompanyMembers.userId, user.id), eq(bridgeCompanyMembers.status, "active")));
    const ids = memberships.map((row) => row.companyId);
    const companies = ids.length ? await db.select().from(bridgeCompanies).where(inArray(bridgeCompanies.id, ids)) : [];
    res.json(companies.map((company) => ({ ...company, membership: memberships.find((row) => row.companyId === company.id) })));
  }));

  app.patch("/api/v1/platform/companies/:id", route(async (req, res) => {
    if (!(await isPlatformAdmin(req))) return res.status(403).json({ message: "Platform admin required" });
    const allowed: any = {}; for (const key of ["name", "appName", "industry", "logoUrl", "websiteDomain", "appIconUrl", "androidPackage", "iosBundleId", "theme", "status", "subscriptionPlan", "billingModel", "billingCycle", "price", "currency", "subscriptionStatus"]) if (req.body?.[key] !== undefined) allowed[key] = key === "price" ? String(req.body[key]) : req.body[key];
    if (req.body?.trialDays !== undefined) { const days = Math.max(0, Number(req.body.trialDays) || 0); allowed.trialEndsAt = new Date(Date.now() + days * 86400000); allowed.subscriptionStatus = "trialing"; allowed.status = "trial"; }
    if (req.body?.subscriptionStatus === "active") allowed.status = "active";
    if (["past_due", "unpaid", "cancelled"].includes(req.body?.subscriptionStatus)) allowed.status = "suspended";
    allowed.updatedAt = new Date();
    res.json((await db.update(bridgeCompanies).set(allowed).where(eq(bridgeCompanies.id, Number(req.params.id))).returning())[0]);
  }));

  // Public tenant lookup lets custom domains load the correct branding before login.
  app.get("/api/v1/tenant/resolve", route(async (req, res) => {
    const host = String(req.query.host || req.hostname).toLowerCase().split(":")[0];
    const slug = String(req.query.slug || "").toLowerCase();
    const result = await db.execute(sql`SELECT id, slug, name, app_name, industry, logo_url, app_icon_url, website_domain, theme, status FROM bridge_companies WHERE status IN ('active','trial') AND (${host} <> '' AND website_domain=${host} OR ${slug} <> '' AND slug=${slug}) LIMIT 1`);
    const tenant = (result.rows || result as any)[0];
    if (!tenant) return res.status(404).json({ message: "Company not found" });
    res.json(tenant);
  }));

  app.get("/api/v1/company/white-label", route(async (req, res) => {
    const access = await companyAccess(req, res, true); if (!access) return;
    const company = (await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.id, access.companyId)).limit(1))[0];
    res.json({
      ...company,
      appBuild: {
        name: company.appName,
        slug: company.slug,
        iconUrl: company.appIconUrl || company.logoUrl,
        androidPackage: company.androidPackage,
        iosBundleId: company.iosBundleId,
        startUrl: company.websiteDomain ? `https://${company.websiteDomain}/login?tenant=${company.slug}` : `https://bridgexpos.up.railway.app/bridgexpos/login?tenant=${company.slug}`,
      },
    });
  }));
  app.get("/api/v1/tenant/settings", route(async (req, res) => {
    const slug = String(req.query.slug || "reborn-wave-group").toLowerCase();
    const result = await db.execute(sql`SELECT s.config FROM bridge_company_settings s JOIN bridge_companies c ON c.id=s.company_id WHERE c.slug=${slug} LIMIT 1`);
    res.json((result.rows || result as any)[0]?.config || { loyalty: { pointsSpendRp: 1000, rewardsEnabled: true, tiers: [] }, services: {} });
  }));

  app.get("/api/v1/company/access-status", route(async (req, res) => {
    const access = await companyAccess(req, res); if (!access) return;
    const company = (await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.id, access.companyId)).limit(1))[0];
    const trialActive = company.subscriptionStatus === "trialing" && !!company.trialEndsAt && new Date(company.trialEndsAt).getTime() > Date.now();
    res.json({ allowed: company.subscriptionStatus === "active" || trialActive, subscriptionStatus: company.subscriptionStatus, status: company.status, trialEndsAt: company.trialEndsAt, trialActive });
  }));

  app.get("/api/v1/company/settings", route(async (req, res) => {
    const access = await companyAccess(req, res); if (!access) return;
    const result = await db.execute(sql`SELECT config, updated_at FROM bridge_company_settings WHERE company_id=${access.companyId}`);
    res.json((result.rows || result as any)[0] || { config: { loyalty: { pointsSpendRp: 1000, rewardsEnabled: true, tiers: [] }, services: {}, booking: { areas: [] }, automation: { reminders: [], faq: [] } } });
  }));
  app.put("/api/v1/company/settings", route(async (req, res) => {
    const access = await companyAccess(req, res, true); if (!access) return;
    const config = req.body?.config || {};
    const result = await db.execute(sql`INSERT INTO bridge_company_settings (company_id, config, updated_at) VALUES (${access.companyId}, ${JSON.stringify(config)}::jsonb, now()) ON CONFLICT (company_id) DO UPDATE SET config=EXCLUDED.config, updated_at=now() RETURNING *`);
    res.json((result.rows || result as any)[0]);
  }));

  app.get("/api/v1/company/feedback", route(async (req, res) => {
    const access = await companyAccess(req, res); if (!access) return;
    const result = await db.execute(sql`SELECT f.*, COALESCE(NULLIF(trim(concat(u.first_name,' ',u.last_name)),''),u.email) user_name, COALESCE(NULLIF(trim(concat(s.first_name,' ',s.last_name)),''),s.email) staff_name FROM bridge_feedback f LEFT JOIN users u ON u.id=f.user_id LEFT JOIN users s ON s.id=f.staff_user_id WHERE f.company_id=${access.companyId} ORDER BY f.id DESC LIMIT 300`);
    res.json(result.rows || result);
  }));
  app.post("/api/v1/company/feedback", route(async (req, res) => {
    const user = await requireUser(req, res); if (!user) return; const companyId = requestedCompanyId(req); if (!companyId) return res.status(400).json({ message: "Company required" });
    const category = String(req.body?.category || "service"); const message = String(req.body?.message || "").trim(); const rating = req.body?.rating ? Math.max(1, Math.min(5, Number(req.body.rating))) : null;
    if (!["service", "staff", "improvement"].includes(category) || !message) return res.status(400).json({ message: "Choose a feedback type and enter your feedback" });
    const result = await db.execute(sql`INSERT INTO bridge_feedback (company_id, branch_id, user_id, category, staff_user_id, rating, subject, message) VALUES (${companyId}, ${req.body?.branchId || null}, ${user.id}, ${category}, ${req.body?.staffUserId || null}, ${rating}, ${req.body?.subject || null}, ${message}) RETURNING *`);
    if (category === "staff" && req.body?.staffUserId && rating) {
      await db.insert(bridgeStaffReviews).values({ companyId, branchId: req.body?.branchId || null, staffUserId: req.body.staffUserId, customerUserId: user.id, rating, note: message, sentiment: rating >= 4 ? "positive" : rating <= 2 ? "negative" : "neutral" });
    }
    const managers = await db.select().from(bridgeCompanyMembers).where(and(eq(bridgeCompanyMembers.companyId, companyId), inArray(bridgeCompanyMembers.role, ["owner", "admin", "manager"])));
    await sendBridgeXNotifications(companyId, managers.map(x => x.userId), { type: "feedback", title: `New ${category} feedback`, body: rating ? `${rating} stars · ${message.slice(0, 100)}` : message.slice(0, 120) });
    res.status(201).json((result.rows || result as any)[0]);
  }));

  app.put("/api/v1/company/white-label", route(async (req, res) => {
    const access = await companyAccess(req, res, true); if (!access) return;
    const allowed: any = {};
    for (const key of ["appName", "logoUrl", "appIconUrl", "websiteDomain", "androidPackage", "iosBundleId", "theme", "billingModel", "billingCycle", "subscriptionPlan", "price", "currency"]) {
      if (req.body?.[key] !== undefined) allowed[key] = key === "price" ? String(req.body[key]) : req.body[key];
    }
    if (allowed.websiteDomain) allowed.websiteDomain = String(allowed.websiteDomain).toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (allowed.billingModel === "one_time") allowed.billingCycle = "one_time";
    allowed.updatedAt = new Date();
    res.json((await db.update(bridgeCompanies).set(allowed).where(eq(bridgeCompanies.id, access.companyId)).returning())[0]);
  }));

  app.post("/api/v1/company/billing/checkout", route(async (req, res) => {
    const access = await companyAccess(req, res, true); if (!access) return;
    if (!bridgeStripe) return res.status(503).json({ message: "Stripe is not configured" });
    const company = (await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.id, access.companyId)).limit(1))[0];
    if (!company || Number(company.price) <= 0) return res.status(400).json({ message: "Set a company price before checkout" });
    const currency = company.currency.toLowerCase();
    const zeroDecimal = new Set(["bif","clp","djf","gnf","jpy","kmf","krw","mga","pyg","rwf","ugx","vnd","vuv","xaf","xof","xpf"]);
    const unitAmount = Math.round(Number(company.price) * (zeroDecimal.has(currency) ? 1 : 100));
    const origin = `${req.protocol}://${req.get("host")}`;
    const recurring = company.billingModel === "subscription" ? { interval: company.billingCycle === "yearly" ? "year" as const : "month" as const } : undefined;
    const session = await bridgeStripe.checkout.sessions.create({
      mode: recurring ? "subscription" : "payment",
      customer_email: access.user.email || undefined,
      line_items: [{ quantity: 1, price_data: { currency, unit_amount: unitAmount, product_data: { name: `${company.appName} · ${company.subscriptionPlan} plan`, metadata: { companyId: String(company.id) } }, ...(recurring ? { recurring } : {}) } }],
      metadata: { companyId: String(company.id), userId: access.user.id, billingCycle: company.billingCycle },
      success_url: `${origin}/bridgex?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/bridgex?checkout=cancelled`,
    });
    res.json({ url: session.url, sessionId: session.id });
  }));

  app.post("/api/v1/company/billing/confirm", route(async (req, res) => {
    const access = await companyAccess(req, res, true); if (!access) return;
    if (!bridgeStripe) return res.status(503).json({ message: "Stripe is not configured" });
    const sessionId = String(req.body?.sessionId || ""); if (!sessionId) return res.status(400).json({ message: "Checkout session required" });
    const session = await bridgeStripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.companyId !== String(access.companyId)) return res.status(403).json({ message: "Checkout does not belong to this company" });
    if (session.status !== "complete" || (session.mode === "payment" && session.payment_status !== "paid")) return res.status(409).json({ message: "Payment is not complete" });
    const [company] = await db.update(bridgeCompanies).set({ subscriptionStatus: "active", status: "active", updatedAt: new Date() }).where(eq(bridgeCompanies.id, access.companyId)).returning();
    res.json(company);
  }));

  app.get("/api/v1/company/modules", route(async (req, res) => { const access = await companyAccess(req, res); if (access) res.json(await db.select().from(bridgeCompanyModules).where(eq(bridgeCompanyModules.companyId, access.companyId))); }));
  app.put("/api/v1/company/modules", route(async (req, res) => {
    const access = await companyAccess(req, res, true); if (!access) return;
    const selected = Array.isArray(req.body?.modules) ? req.body.modules.filter((key: string) => BRIDGEX_MODULES.includes(key as any)) : [];
    await db.delete(bridgeCompanyModules).where(eq(bridgeCompanyModules.companyId, access.companyId));
    if (selected.length) await db.insert(bridgeCompanyModules).values(selected.map((moduleKey: string) => ({ companyId: access.companyId, moduleKey })));
    res.json({ modules: selected });
  }));

  app.get("/api/v1/company/branches", route(async (req, res) => { const access = await companyAccess(req, res); if (access) res.json(await db.select().from(bridgeBranches).where(eq(bridgeBranches.companyId, access.companyId)).orderBy(bridgeBranches.name)); }));
  app.post("/api/v1/company/branches", route(async (req, res) => {
    const access = await companyAccess(req, res, true); if (!access) return;
    const name = String(req.body?.name || "").trim(); if (!name) return res.status(400).json({ message: "Branch name required" });
    res.status(201).json((await db.insert(bridgeBranches).values({ companyId: access.companyId, name, code: slugify(req.body?.code || name).toUpperCase(), address: req.body?.address || null, timezone: req.body?.timezone || "Asia/Jakarta" }).returning())[0]);
  }));

  app.get("/api/v1/company/positions", route(async (req, res) => { const access = await companyAccess(req, res); if (access) res.json(await db.select().from(bridgePositions).where(eq(bridgePositions.companyId, access.companyId)).orderBy(bridgePositions.name)); }));
  app.post("/api/v1/company/positions", route(async (req, res) => {
    const access = await companyAccess(req, res, true); if (!access) return;
    const name = String(req.body?.name || "").trim(); if (!name) return res.status(400).json({ message: "Position name required" });
    res.status(201).json((await db.insert(bridgePositions).values({ companyId: access.companyId, name, code: slugify(req.body?.code || name), permissions: req.body?.permissions || [] }).returning())[0]);
  }));

  app.get("/api/v1/company/staff", route(async (req, res) => {
    const access = await companyAccess(req, res); if (!access) return;
    const result = await db.execute(sql`SELECT m.*, u.email, u.first_name, u.last_name, p.name position_name, s.employment_type, s.pay_type, s.base_salary, s.hourly_rate, s.hire_date, s.star_grade, s.ranking_score, b.name branch_name FROM bridge_company_members m JOIN users u ON u.id=m.user_id LEFT JOIN bridge_staff_profiles s ON s.company_id=m.company_id AND s.user_id=m.user_id LEFT JOIN bridge_positions p ON p.id=COALESCE(s.position_id,m.position_id) LEFT JOIN bridge_branches b ON b.id=COALESCE(s.branch_id,m.branch_id) WHERE m.company_id=${access.companyId} AND m.role IN ('owner','admin','manager','staff') ORDER BY u.first_name, u.email`);
    res.json(result.rows || result);
  }));

  app.get("/api/v1/company/users", route(async (req, res) => {
    const access = await companyAccess(req, res, true); if (!access) return;
    const q = `%${String(req.query.q || "").trim()}%`;
    const result = await db.execute(sql`SELECT u.id, u.email, u.first_name, u.last_name, u.role, m.role company_role, m.position_id, m.branch_id FROM users u LEFT JOIN bridge_company_members m ON m.user_id=u.id AND m.company_id=${access.companyId} WHERE u.email ILIKE ${q} OR u.first_name ILIKE ${q} OR u.last_name ILIKE ${q} ORDER BY u.created_at DESC LIMIT 80`);
    res.json(result.rows || result);
  }));

  app.post("/api/v1/company/staff", route(async (req, res) => {
    const access = await companyAccess(req, res, true); if (!access) return;
    const existingId = String(req.body?.userId || "").trim(); const email = String(req.body?.email || "").trim(); if (!existingId && !email) return res.status(400).json({ message: "Select a user or enter a staff email" });
    const existing = existingId ? (await db.select().from(users).where(eq(users.id, existingId)).limit(1))[0] : null;
    if (existingId && !existing) return res.status(404).json({ message: "User not found" });
    const ensured = existing ? { user: existing, temporaryPassword: null } : await ensureUser(email, req.body?.name || "Staff", req.body?.password);
    await db.insert(bridgeCompanyMembers).values({ companyId: access.companyId, userId: ensured.user.id, branchId: req.body?.branchId || null, positionId: req.body?.positionId || null, role: req.body?.role || "staff" }).onConflictDoUpdate({ target: [bridgeCompanyMembers.companyId, bridgeCompanyMembers.userId], set: { branchId: req.body?.branchId || null, positionId: req.body?.positionId || null, role: req.body?.role || "staff", status: "active", updatedAt: new Date() } });
    await db.insert(bridgeStaffProfiles).values({ companyId: access.companyId, userId: ensured.user.id, branchId: req.body?.branchId || null, positionId: req.body?.positionId || null, employmentType: req.body?.employmentType || "full_time", payType: req.body?.payType || "salary", baseSalary: String(req.body?.baseSalary || 0), hourlyRate: String(req.body?.hourlyRate || 0), hireDate: req.body?.hireDate || null }).onConflictDoUpdate({ target: [bridgeStaffProfiles.companyId, bridgeStaffProfiles.userId], set: { branchId: req.body?.branchId || null, positionId: req.body?.positionId || null, employmentType: req.body?.employmentType || "full_time", payType: req.body?.payType || "salary", baseSalary: String(req.body?.baseSalary || 0), hourlyRate: String(req.body?.hourlyRate || 0), hireDate: req.body?.hireDate || null, updatedAt: new Date() } });
    res.status(201).json({ userId: ensured.user.id, temporaryPassword: ensured.temporaryPassword });
  }));

  app.post("/api/v1/company/staff/:userId/notes", route(async (req, res) => {
    const access = await companyAccess(req, res, true); if (!access) return;
    const note = String(req.body?.note || "").trim(); if (!note) return res.status(400).json({ message: "Note required" });
    res.status(201).json((await db.insert(bridgeStaffNotes).values({ companyId: access.companyId, staffUserId: req.params.userId, authorUserId: access.user.id, note, visibility: req.body?.visibility || "management" }).returning())[0]);
  }));

  app.get("/api/v1/company/staff/:userId/profile", route(async (req, res) => {
    const access = await companyAccess(req, res); if (!access) return;
    const staffResult = await db.execute(sql`SELECT m.user_id, m.role, u.email, u.first_name, u.last_name, p.name position_name, b.name branch_name, s.employment_type, s.hire_date, s.star_grade, s.ranking_score FROM bridge_company_members m JOIN users u ON u.id=m.user_id LEFT JOIN bridge_staff_profiles s ON s.company_id=m.company_id AND s.user_id=m.user_id LEFT JOIN bridge_positions p ON p.id=COALESCE(s.position_id,m.position_id) LEFT JOIN bridge_branches b ON b.id=COALESCE(s.branch_id,m.branch_id) WHERE m.company_id=${access.companyId} AND m.user_id=${req.params.userId} LIMIT 1`);
    const staff = (staffResult.rows || staffResult as any)[0]; if (!staff) return res.status(404).json({ message: "Staff member not found" });
    const reviews = await db.select().from(bridgeStaffReviews).where(and(eq(bridgeStaffReviews.companyId, access.companyId), eq(bridgeStaffReviews.staffUserId, req.params.userId), eq(bridgeStaffReviews.visible, true))).orderBy(desc(bridgeStaffReviews.id)).limit(100);
    const allNotes = await db.select().from(bridgeStaffNotes).where(and(eq(bridgeStaffNotes.companyId, access.companyId), eq(bridgeStaffNotes.staffUserId, req.params.userId))).orderBy(desc(bridgeStaffNotes.id)).limit(100);
    const notes = MANAGEMENT_ROLES.has(access.role) ? allNotes : allNotes.filter((note) => note.visibility !== "management");
    res.json({ staff, reviews, notes });
  }));

  app.get("/api/v1/company/staff/leaderboard", route(async (req, res) => {
    const access = await companyAccess(req, res); if (!access) return;
    const result = await db.execute(sql`SELECT m.user_id, COALESCE(NULLIF(trim(concat(u.first_name,' ',u.last_name)),''),u.email) name, p.name position, COALESCE(sum(t.total::numeric) FILTER (WHERE t.paid_at >= now()-interval '7 days'),0) weekly_sales, COALESCE(avg(r.rating),0)::numeric(3,2) rating, count(r.id) review_count, count(r.id) FILTER (WHERE r.rating <= 2) bad_reviews FROM bridge_company_members m JOIN users u ON u.id=m.user_id LEFT JOIN bridge_staff_profiles sp ON sp.company_id=m.company_id AND sp.user_id=m.user_id LEFT JOIN bridge_positions p ON p.id=COALESCE(sp.position_id,m.position_id) LEFT JOIN pos_tickets t ON t.company_id=m.company_id AND t.sales_staff_id=m.user_id AND t.status='paid' LEFT JOIN bridge_staff_reviews r ON r.company_id=m.company_id AND r.staff_user_id=m.user_id AND r.visible=true WHERE m.company_id=${access.companyId} AND m.role IN ('owner','admin','manager','staff') GROUP BY m.user_id,u.first_name,u.last_name,u.email,p.name ORDER BY weekly_sales DESC, rating DESC`);
    const rows: any[] = (result.rows || result) as any[];
    res.json(rows.map((row, index) => ({ ...row, rank: index + 1, redFlag: Number(row.rating) > 0 && Number(row.rating) < 2.5 || Number(row.bad_reviews) >= 3 })));
  }));

  app.post("/api/v1/company/staff/:userId/reviews", route(async (req, res) => {
    const user = await requireUser(req, res); if (!user) return;
    const companyId = requestedCompanyId(req); if (!companyId) return res.status(400).json({ message: "Company required" });
    const target = (await db.select().from(bridgeCompanyMembers).where(and(eq(bridgeCompanyMembers.companyId, companyId), eq(bridgeCompanyMembers.userId, req.params.userId))).limit(1))[0];
    if (!target || !["owner", "admin", "manager", "staff"].includes(target.role)) return res.status(404).json({ message: "Staff member not found" });
    const rating = Math.max(1, Math.min(5, Number(req.body?.rating) || 0)); if (!rating) return res.status(400).json({ message: "Rating required" });
    const [review] = await db.insert(bridgeStaffReviews).values({ companyId, branchId: req.body?.branchId || null, staffUserId: req.params.userId, customerUserId: user.id, rating, note: req.body?.note || null, sentiment: rating >= 4 ? "positive" : rating <= 2 ? "negative" : "neutral" }).returning();
    const managers = await db.select().from(bridgeCompanyMembers).where(and(eq(bridgeCompanyMembers.companyId, companyId), inArray(bridgeCompanyMembers.role, ["owner", "admin", "manager"])));
    await sendBridgeXNotifications(companyId, [req.params.userId, ...managers.map((row) => row.userId)], { type: "staff_review", title: rating <= 2 ? "Staff review needs attention" : "New staff feedback", body: `${rating} star review received`, data: { reviewId: review.id, staffUserId: req.params.userId } });
    res.status(201).json(review);
  }));

  app.get("/api/v1/company/meetings", route(async (req, res) => { const access = await companyAccess(req, res); if (access) res.json(await db.select().from(bridgeMeetings).where(eq(bridgeMeetings.companyId, access.companyId)).orderBy(desc(bridgeMeetings.startsAt)).limit(100)); }));
  app.post("/api/v1/company/meetings", route(async (req, res) => {
    const access = await companyAccess(req, res, true); if (!access) return;
    if (!req.body?.title || !req.body?.startsAt) return res.status(400).json({ message: "Title and meeting time required" });
    const [meeting] = await db.insert(bridgeMeetings).values({ companyId: access.companyId, branchId: req.body?.branchId || null, title: req.body.title, agenda: req.body?.agenda || null, startsAt: new Date(req.body.startsAt), location: req.body?.location || null, createdBy: access.user.id }).returning();
    const members = await db.select().from(bridgeCompanyMembers).where(and(eq(bridgeCompanyMembers.companyId, access.companyId), eq(bridgeCompanyMembers.status, "active")));
    await sendBridgeXNotifications(access.companyId, members.map((row) => row.userId), { type: "meeting", title: `Staff meeting: ${meeting.title}`, body: `${meeting.startsAt.toLocaleString()}${meeting.location ? ` · ${meeting.location}` : ""}`, data: { meetingId: meeting.id } });
    res.status(201).json(meeting);
  }));

  // Tenant-native POS routes. These never return or mutate another company's rows.
  app.get("/api/v1/company/pos/products", route(async (req, res) => {
    const access = await companyAccess(req, res); if (!access) return;
    res.json(await db.select().from(posProducts).where(eq(posProducts.companyId, access.companyId)).orderBy(posProducts.sortOrder, posProducts.name));
  }));
  app.post("/api/v1/company/pos/products", route(async (req, res) => {
    const access = await companyAccess(req, res, true); if (!access) return;
    if (!req.body?.name) return res.status(400).json({ message: "Product name required" });
    const [product] = await db.insert(posProducts).values({ companyId: access.companyId, branchId: req.body?.branchId || access.branchId, name: req.body.name, category: req.body?.category || "General", price: String(req.body?.price || 0), cost: String(req.body?.cost || 0), stock: Number(req.body?.stock || 0), imageUrl: req.body?.imageUrl || null }).returning();
    res.status(201).json(product);
  }));
  app.patch("/api/v1/company/pos/products/:id", route(async (req, res) => {
    const access = await companyAccess(req, res, true); if (!access) return;
    const update: any = {}; for (const key of ["name", "category", "price", "cost", "stock", "imageUrl", "active", "sortOrder", "branchId"]) if (req.body?.[key] !== undefined) update[key] = req.body[key];
    const [product] = await db.update(posProducts).set(update).where(and(eq(posProducts.id, Number(req.params.id)), eq(posProducts.companyId, access.companyId))).returning();
    if (!product) return res.status(404).json({ message: "Product not found" }); res.json(product);
  }));
  app.get("/api/v1/company/pos/tickets", route(async (req, res) => {
    const access = await companyAccess(req, res); if (!access) return;
    const status = String(req.query.status || "");
    const condition = status ? and(eq(posTickets.companyId, access.companyId), eq(posTickets.status, status)) : eq(posTickets.companyId, access.companyId);
    res.json(await db.select().from(posTickets).where(condition).orderBy(desc(posTickets.id)).limit(200));
  }));
  app.post("/api/v1/company/pos/tickets", route(async (req, res) => {
    const access = await companyAccess(req, res); if (!access) return;
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ message: "At least one item required" });
    const productIds = items.map((item:any) => Number(item.productId)).filter(Boolean);
    const products = productIds.length ? await db.select().from(posProducts).where(and(eq(posProducts.companyId, access.companyId), inArray(posProducts.id, productIds))) : [];
    const lines = items.map((item:any) => { const product = products.find((row) => row.id === Number(item.productId)); if (!product) throw new Error("A product does not belong to this company"); const qty = Math.max(1, Number(item.qty || 1)); return { product, qty, total: Number(product.price) * qty }; });
    const subtotal = lines.reduce((sum:number, line:any) => sum + line.total, 0); const discount = Math.max(0, Number(req.body?.discount || 0)); const tax = Math.max(0, Number(req.body?.tax || 0)); const total = Math.max(0, subtotal - discount + tax);
    const [ticket] = await db.insert(posTickets).values({ companyId: access.companyId, branchId: req.body?.branchId || access.branchId, orderNo: `BX-${Date.now().toString(36).toUpperCase()}`, source: req.body?.source || "pos", status: req.body?.paymentMethod ? "paid" : "open", subtotal: String(subtotal), discount: String(discount), tax: String(tax), total: String(total), paymentMethod: req.body?.paymentMethod || null, tableNumber: req.body?.tableNumber || null, orderMode: req.body?.orderMode || "dine_in", staffId: access.user.id, salesStaffId: req.body?.salesStaffId || access.user.id, paidAt: req.body?.paymentMethod ? new Date() : null }).returning();
    await db.insert(posTicketItems).values(lines.map((line:any) => ({ orderId: ticket.id, productId: line.product.id, name: line.product.name, price: line.product.price, qty: line.qty, lineTotal: String(line.total), source: req.body?.source || "pos" })));
    for (const line of lines) await db.update(posProducts).set({ stock: sql`${posProducts.stock} - ${line.qty}` }).where(and(eq(posProducts.id, line.product.id), eq(posProducts.companyId, access.companyId)));
    const kitchenResult = await db.execute(sql`SELECT DISTINCT m.user_id FROM bridge_company_members m LEFT JOIN bridge_positions p ON p.id=m.position_id WHERE m.company_id=${access.companyId} AND m.status='active' AND (p.code IN ('chef','kitchen') OR m.role IN ('owner','admin','manager'))`);
    const kitchenIds = ((kitchenResult.rows || kitchenResult) as any[]).map((row) => row.user_id);
    await sendBridgeXNotifications(access.companyId, kitchenIds, { type: "new_order", title: `New order ${ticket.orderNo}`, body: `${lines.length} item${lines.length === 1 ? "" : "s"}${ticket.tableNumber ? ` · Table ${ticket.tableNumber}` : ""}`, data: { ticketId: ticket.id } });
    const lowStock = lines.filter((line:any) => Number(line.product.stock) - line.qty <= 5).map((line:any) => line.product.name);
    if (lowStock.length) await sendBridgeXNotifications(access.companyId, kitchenIds, { type: "low_stock", title: "Low stock warning", body: lowStock.slice(0, 4).join(", "), data: { productIds: lines.filter((line:any) => lowStock.includes(line.product.name)).map((line:any) => line.product.id) } });
    res.status(201).json(ticket);
  }));

  // Attendance, shifts and leave are scoped by tenant and generate native alerts.
  app.get("/api/v1/company/attendance", route(async (req, res) => {
    const access = await companyAccess(req, res); if (!access) return;
    const userId = MANAGEMENT_ROLES.has(access.role) ? (req.query.userId ? String(req.query.userId) : null) : access.user.id;
    const condition = userId ? and(eq(staffAttendance.companyId, access.companyId), eq(staffAttendance.userId, userId)) : eq(staffAttendance.companyId, access.companyId);
    res.json(await db.select().from(staffAttendance).where(condition).orderBy(desc(staffAttendance.id)).limit(200));
  }));
  app.post("/api/v1/company/attendance/check-in", route(async (req, res) => {
    const access = await companyAccess(req, res); if (!access) return;
    const workDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
    const existing = (await db.select().from(staffAttendance).where(and(eq(staffAttendance.companyId, access.companyId), eq(staffAttendance.userId, access.user.id), eq(staffAttendance.workDate, workDate))).limit(1))[0];
    if (existing && !existing.checkOutAt) return res.json(existing);
    res.status(201).json((await db.insert(staffAttendance).values({ companyId: access.companyId, branchId: req.body?.branchId || access.branchId, userId: access.user.id, workDate }).returning())[0]);
  }));
  app.post("/api/v1/company/attendance/check-out", route(async (req, res) => {
    const access = await companyAccess(req, res); if (!access) return;
    const workDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
    const row = (await db.select().from(staffAttendance).where(and(eq(staffAttendance.companyId, access.companyId), eq(staffAttendance.userId, access.user.id), eq(staffAttendance.workDate, workDate))).orderBy(desc(staffAttendance.id)).limit(1))[0];
    if (!row) return res.status(404).json({ message: "No check-in found" });
    res.json((await db.update(staffAttendance).set({ checkOutAt: new Date() }).where(and(eq(staffAttendance.id, row.id), eq(staffAttendance.companyId, access.companyId))).returning())[0]);
  }));
  app.get("/api/v1/company/shifts", route(async (req, res) => { const access = await companyAccess(req, res); if (!access) return; const userId = MANAGEMENT_ROLES.has(access.role) ? (req.query.userId ? String(req.query.userId) : null) : access.user.id; const condition = userId ? and(eq(workerShifts.companyId, access.companyId), eq(workerShifts.userId, userId)) : eq(workerShifts.companyId, access.companyId); res.json(await db.select().from(workerShifts).where(condition).orderBy(desc(workerShifts.shiftDate)).limit(300)); }));
  app.post("/api/v1/company/shifts", route(async (req, res) => {
    const access = await companyAccess(req, res, true); if (!access) return;
    const dates: string[] = Array.from(new Set<string>((Array.isArray(req.body?.dates) ? req.body.dates : [req.body?.shiftDate]).map(String).filter(Boolean))).slice(0, 62);
    if (!req.body?.userId || !dates.length || !req.body?.startTime || !req.body?.endTime) return res.status(400).json({ message: "Staff, at least one date and times required" });
    const shifts = await db.insert(workerShifts).values(dates.map(shiftDate => ({ companyId: access.companyId, branchId: req.body?.branchId || null, userId: req.body.userId, shiftDate, startTime: req.body.startTime, endTime: req.body.endTime, role: req.body?.role || null, note: req.body?.note || null, createdBy: access.user.id }))).returning();
    await sendBridgeXNotifications(access.companyId, [req.body.userId], { type: "shift", title: dates.length === 1 ? "New work shift" : `${dates.length} new work shifts`, body: `${dates[0]}${dates.length > 1 ? ` to ${dates[dates.length - 1]}` : ""}, ${req.body.startTime}–${req.body.endTime}`, data: { shiftIds: shifts.map(x => x.id) } }); res.status(201).json(shifts);
  }));
  app.get("/api/v1/company/leave", route(async (req, res) => { const access = await companyAccess(req, res); if (!access) return; const condition = MANAGEMENT_ROLES.has(access.role) ? eq(leaveRequests.companyId, access.companyId) : and(eq(leaveRequests.companyId, access.companyId), eq(leaveRequests.userId, access.user.id)); res.json(await db.select().from(leaveRequests).where(condition).orderBy(desc(leaveRequests.id)).limit(200)); }));
  app.post("/api/v1/company/leave", route(async (req, res) => {
    const access = await companyAccess(req, res); if (!access) return; if (!req.body?.startDate || !req.body?.endDate || !req.body?.reason) return res.status(400).json({ message: "Dates and reason required" });
    const [leave] = await db.insert(leaveRequests).values({ companyId: access.companyId, branchId: req.body?.branchId || access.branchId, userId: access.user.id, type: req.body?.type || "leave", startDate: req.body.startDate, endDate: req.body.endDate, reason: req.body.reason, attachmentUrl: req.body?.attachmentUrl || null }).returning();
    const managers = await db.select().from(bridgeCompanyMembers).where(and(eq(bridgeCompanyMembers.companyId, access.companyId), inArray(bridgeCompanyMembers.role, ["owner", "admin", "manager"]))); await sendBridgeXNotifications(access.companyId, managers.map((row) => row.userId), { type: "leave_request", title: "New leave request", body: `${leave.startDate} to ${leave.endDate}`, data: { leaveId: leave.id } }); res.status(201).json(leave);
  }));
  app.patch("/api/v1/company/leave/:id", route(async (req, res) => {
    const access = await companyAccess(req, res, true); if (!access) return; const status = req.body?.status; if (!["approved", "rejected"].includes(status)) return res.status(400).json({ message: "Approved or rejected status required" });
    const [leave] = await db.update(leaveRequests).set({ status, paid: req.body?.paid ?? null, decidedBy: access.user.id, decisionNote: req.body?.note || null }).where(and(eq(leaveRequests.id, Number(req.params.id)), eq(leaveRequests.companyId, access.companyId))).returning(); if (!leave) return res.status(404).json({ message: "Leave request not found" });
    await sendBridgeXNotifications(access.companyId, [leave.userId], { type: "leave_decision", title: `Leave ${status}`, body: `${leave.startDate} to ${leave.endDate}`, data: { leaveId: leave.id } }); res.json(leave);
  }));

  app.post("/api/v1/app/push-diagnostics", route(async (req, res) => {
    const allowed = new Set(["setup_started", "permission_denied", "token_missing", "setup_error", "expo_token_ready"]);
    const status = String(req.body?.status || "unknown");
    if (!allowed.has(status)) return res.status(400).json({ message: "Invalid diagnostic status" });
    console.info("Mobile push diagnostic", {
      status,
      detail: String(req.body?.detail || "").slice(0, 500),
      platform: String(req.body?.platform || "unknown").slice(0, 20),
      appVersion: String(req.body?.appVersion || "unknown").slice(0, 30),
      buildVersion: String(req.body?.buildVersion || "unknown").slice(0, 30),
    });
    res.status(204).end();
  }));

  app.post("/api/v1/app/device-tokens", route(async (req, res) => {
    const user = await requireUser(req, res); if (!user) return;
    const token = String(req.body?.expoPushToken || ""); if (!/^(ExponentPushToken|ExpoPushToken)/.test(token)) return res.status(400).json({ message: "Valid Expo push token required" });
    const existing = await db.select({ id: bridgeDeviceTokens.id, userId: bridgeDeviceTokens.userId, active: bridgeDeviceTokens.active }).from(bridgeDeviceTokens).where(eq(bridgeDeviceTokens.expoPushToken, token)).limit(1);
    const [row] = await db.insert(bridgeDeviceTokens).values({ userId: user.id, companyId: requestedCompanyId(req), expoPushToken: token, platform: req.body?.platform || "unknown", deviceId: req.body?.deviceId || null }).onConflictDoUpdate({ target: bridgeDeviceTokens.expoPushToken, set: { userId: user.id, companyId: requestedCompanyId(req), platform: req.body?.platform || "unknown", deviceId: req.body?.deviceId || null, active: true, updatedAt: new Date() } }).returning();
    console.info("Mobile push device registered", { userId: user.id, role: user.role, platform: row.platform, newDevice: existing.length === 0 });
    res.json(row);
    if (!existing.length || existing[0].userId !== user.id || !existing[0].active) {
      await sendRebornUserNotification(user.id, {
        type: "notifications_enabled",
        title: user.role === "admin" || user.role === "staff" ? "Admin phone alerts enabled" : "Phone alerts enabled",
        body: user.role === "admin" || user.role === "staff" ? "New food orders, song requests and staff updates will pop up on this phone." : "Bookings, orders, messages and account updates will pop up on this phone.",
        data: { path: user.role === "admin" || user.role === "staff" ? "/reborn-admin" : "/profile" },
      });
    }
  }));
  app.get("/api/v1/app/device-tokens/status", route(async (req, res) => {
    const user = await requireUser(req, res); if (!user) return;
    const rows = await db.select().from(bridgeDeviceTokens).where(and(eq(bridgeDeviceTokens.userId, user.id), eq(bridgeDeviceTokens.active, true)));
    res.json({ registered: rows.length > 0, devices: rows.map((row) => ({ platform: row.platform, updatedAt: row.updatedAt })) });
  }));
  app.post("/api/v1/app/notifications/test", route(async (req, res) => {
    const user = await requireUser(req, res); if (!user) return;
    await sendRebornUserNotification(user.id, { type: "test", title: "Reborn notifications are working", body: "You will receive live orders, gifts, messages and updates on this phone.", data: { path: "/profile" } });
    res.json({ message: "Test notification sent to your registered phone." });
  }));
  app.get("/api/v1/app/notifications", route(async (req, res) => { const user = await requireUser(req, res); if (user) res.json(await db.select().from(bridgeNotifications).where(eq(bridgeNotifications.userId, user.id)).orderBy(desc(bridgeNotifications.id)).limit(100)); }));
  app.post("/api/v1/app/notifications/:id/read", route(async (req, res) => { const user = await requireUser(req, res); if (!user) return; res.json((await db.update(bridgeNotifications).set({ readAt: new Date() }).where(and(eq(bridgeNotifications.id, Number(req.params.id)), eq(bridgeNotifications.userId, user.id))).returning())[0]); }));
}
