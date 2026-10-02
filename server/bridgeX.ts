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
  bridgePayments,
  staffAttendance,
  users,
  workerShifts,
} from "../shared/schema";

// Full module catalogue. Existing keys are kept (tenant rows reference them); new
// keys are added as we build each engine. `status` is honest: "live" gates a real
// feature today, "beta" is partial/config-only, "planned" is on the roadmap.
export type ModuleStatus = "live" | "beta" | "planned";
export interface ModuleDef { key: string; name: string; category: string; status: ModuleStatus; desc: string; core?: boolean; }
// Core modules are the basic system every company gets — always on, cannot be
// disabled. Everything else is an add-on the super admin ticks per company.
export const CORE_MODULES = new Set<string>(["crm", "events", "marketing", "reviews", "faq_automation", "analytics", "audit"]);
export const BRIDGEX_MODULE_REGISTRY: ModuleDef[] = [
  // Core — almost every business
  { key: "pos", name: "Point of Sale", category: "Core", status: "live", desc: "Sales, cart, discounts, tax, service charge, tips." },
  { key: "payments", name: "Payments", category: "Core", status: "live", desc: "Cash, card, QR, transfer, e-wallet, split & partial payment, change." },
  { key: "refunds", name: "Refunds & Voids", category: "Core", status: "live", desc: "Full/partial refund, void, auto restock, reason tracking." },
  { key: "pricing", name: "Pricing & Price Lists", category: "Core", status: "live", desc: "Happy hour, member & category discounts with day/time windows." },
  { key: "analytics", name: "Owner Dashboard", category: "Core", status: "live", desc: "Today-at-a-glance revenue, top products, payment split, comparisons." },
  { key: "audit", name: "Fraud & Staff Control", category: "Core", status: "live", desc: "Track voids, refunds, discounts per staff; flag anomalies." },
  // Inventory
  { key: "inventory", name: "Inventory & Stock", category: "Inventory", status: "live", desc: "Real-time stock, low-stock alerts, adjustments, movement history." },
  { key: "purchasing", name: "Purchasing & Suppliers", category: "Inventory", status: "live", desc: "Suppliers, purchase orders, goods received, auto cost & stock update." },
  // Customers
  { key: "crm", name: "CRM & Segments", category: "Customers", status: "live", desc: "Profiles, spend/visit history, tags, VIP/new/lost/birthday segments." },
  { key: "loyalty", name: "Loyalty & Rewards", category: "Customers", status: "live", desc: "Points, cashback, stamp cards, vouchers, referral rewards." },
  { key: "membership", name: "Membership Tiers", category: "Customers", status: "live", desc: "Tiers, member pricing, paid subscriptions, milestones." },
  { key: "marketing", name: "Marketing Engine", category: "Customers", status: "live", desc: "Campaigns, segment audiences (VIP/new/lost/birthday), recipient export." },
  { key: "reviews", name: "Reviews & Reputation", category: "Customers", status: "live", desc: "Customer feedback + staff reviews with sentiment, surfaced on the leaderboard." },
  // People
  { key: "employees", name: "Staff & HR", category: "People", status: "live", desc: "Roles, positions, attendance, shifts, leave, meetings, QR attendance." },
  { key: "payroll", name: "Payroll", category: "People", status: "live", desc: "Payroll summary: base pay + booking commission per staff for a period." },
  // Finance
  { key: "accounting", name: "Accounting", category: "Finance", status: "live", desc: "Income (from POS), expenses by category, refunds, net P&L for any period." },
  // Booking
  { key: "booking", name: "Universal Booking", category: "Booking", status: "live", desc: "Resources (staff/room/chair/bay/asset) + bookings, clash-check, deposits, staff commission." },
  // Industry packs
  { key: "restaurant", name: "Restaurant / Café", category: "Industry", status: "live", desc: "Table floor plan, running tabs, open→add→settle, dine-in service." },
  { key: "kitchen_display", name: "Kitchen Display (KDS)", category: "Industry", status: "live", desc: "Route orders to kitchen/bar/dessert; new→preparing→ready→served." },
  { key: "qr_ordering", name: "QR Ordering", category: "Industry", status: "live", desc: "Scan table QR → menu → order → straight to the kitchen." },
  { key: "foodcourt", name: "Food Court", category: "Industry", status: "live", desc: "Stalls, product→stall allocation, per-stall revenue & commission settlement." },
  { key: "ktv", name: "KTV / Rooms", category: "Industry", status: "live", desc: "Rooms & reservations (Booking), running tabs (Tables), bottle keep." },
  { key: "bottle_keep", name: "Bottle Keep", category: "Industry", status: "beta", desc: "Customer bottle storage & balance, host/waiter assignment." },
  { key: "beauty", name: "Beauty / Spa / Salon", category: "Industry", status: "live", desc: "Appointments + chair/room resources + staff commission (via Booking)." },
  { key: "retail", name: "Retail / Fashion", category: "Industry", status: "live", desc: "Barcode/SKU, stock, returns & exchanges (POS + Inventory + Refunds)." },
  { key: "grocery", name: "Supermarket / Grocery", category: "Industry", status: "live", desc: "Weighed items, batch/expiry, fast checkout (POS + Inventory)." },
  { key: "hotel", name: "Hotel / Homestay", category: "Industry", status: "live", desc: "Rooms & reservations with deposits (Booking); F&B via POS." },
  { key: "gym", name: "Gym / Fitness", category: "Industry", status: "live", desc: "Memberships + class/trainer booking (Booking + Membership)." },
  { key: "pet", name: "Pet Shop / Grooming", category: "Industry", status: "live", desc: "Owner profiles + grooming booking + retail (Booking + CRM + POS)." },
  { key: "workshop", name: "Car Workshop / Wash", category: "Industry", status: "live", desc: "Bays/mechanics + job bookings + parts (Booking + Inventory)." },
  { key: "repair", name: "Repair Shop", category: "Industry", status: "live", desc: "Repair tickets, device/IMEI, diagnosis, quote, status, warranty." },
  { key: "laundry", name: "Laundry", category: "Industry", status: "live", desc: "Pickup/collection bookings + POS by weight/pieces (Booking + POS)." },
  { key: "rental", name: "Rental", category: "Industry", status: "live", desc: "Assets + availability & deposits (Booking)." },
  { key: "education", name: "Education / Tuition", category: "Industry", status: "live", desc: "Classes/teachers + bookings + teacher commission (Booking)." },
  { key: "events", name: "Events / Ticketing", category: "Industry", status: "live", desc: "Events, ticket types, QR tickets, capacity, scan-in check." },
  { key: "wholesale", name: "Wholesale / B2B", category: "Industry", status: "live", desc: "B2B accounts, price tiers, credit limits & running balances/statements." },
  { key: "professional", name: "Professional Services", category: "Industry", status: "live", desc: "Projects, hourly rate, timesheets, billable totals." },
  // Engagement
  { key: "games", name: "Mini-Games / PvP", category: "Engagement", status: "beta", desc: "Spin, scratch, dice, PvP & party games awarding points/coupons." },
  { key: "live_gifts", name: "Live Gifts", category: "Engagement", status: "live", desc: "Virtual gift catalog, send to performers with share split + leaderboard." },
  { key: "lucky_draw", name: "Lucky Draw Pool", category: "Engagement", status: "live", desc: "Prize pool, weighted ticket entries, one-tap random winner draw." },
  { key: "song_requests", name: "Song Requests", category: "Engagement", status: "beta", desc: "Live song request queue for KTV/bar/lounge." },
  // AI & channels
  { key: "ai_whatsapp", name: "AI WhatsApp", category: "AI & Channels", status: "beta", desc: "Event-driven WhatsApp + AI replies (booking, order ready, birthday)." },
  { key: "ai_telegram", name: "AI Telegram", category: "AI & Channels", status: "beta", desc: "Telegram channel with AI replies and campaigns." },
  { key: "faq_automation", name: "FAQ Automation", category: "AI & Channels", status: "beta", desc: "Auto-answer common questions, hand over to staff when needed." },
];
BRIDGEX_MODULE_REGISTRY.forEach((m) => { m.core = CORE_MODULES.has(m.key); });
export const BRIDGEX_MODULES = BRIDGEX_MODULE_REGISTRY.map((m) => m.key) as unknown as readonly string[];

// Industry → default enabled modules. Picking an industry at signup turns the
// right system on automatically; the owner can still tick more.
const BASE_MODULES = ["pos", "employees", "crm", "loyalty", "analytics"];
export const BRIDGEX_INDUSTRIES: { key: string; name: string; modules: string[] }[] = [
  { key: "restaurant", name: "Restaurant / Café", modules: [...BASE_MODULES, "inventory", "purchasing", "restaurant", "kitchen_display", "qr_ordering", "booking", "payments", "refunds", "pricing"] },
  { key: "bar", name: "Bar / Lounge", modules: [...BASE_MODULES, "inventory", "restaurant", "booking", "bottle_keep", "song_requests", "games", "payments"] },
  { key: "nightclub", name: "Nightclub", modules: [...BASE_MODULES, "inventory", "booking", "bottle_keep", "live_gifts", "games", "lucky_draw", "events", "payments"] },
  { key: "ktv", name: "KTV / Karaoke", modules: [...BASE_MODULES, "inventory", "ktv", "booking", "bottle_keep", "song_requests", "payments"] },
  { key: "foodcourt", name: "Food Court", modules: [...BASE_MODULES, "inventory", "foodcourt", "qr_ordering", "kitchen_display", "payments", "refunds"] },
  { key: "beauty", name: "Beauty / Spa / Salon", modules: [...BASE_MODULES, "inventory", "beauty", "booking", "payroll", "marketing"] },
  { key: "retail", name: "Retail / Fashion", modules: [...BASE_MODULES, "inventory", "purchasing", "retail", "pricing", "refunds", "payments", "marketing"] },
  { key: "grocery", name: "Supermarket / Grocery", modules: [...BASE_MODULES, "inventory", "purchasing", "grocery", "pricing", "payments"] },
  { key: "hotel", name: "Hotel / Homestay", modules: [...BASE_MODULES, "inventory", "hotel", "booking", "restaurant", "payments"] },
  { key: "gym", name: "Gym / Fitness", modules: [...BASE_MODULES, "gym", "booking", "membership", "marketing"] },
  { key: "pet", name: "Pet Shop / Grooming", modules: [...BASE_MODULES, "inventory", "pet", "booking", "retail"] },
  { key: "workshop", name: "Car Workshop / Wash", modules: [...BASE_MODULES, "inventory", "purchasing", "workshop", "booking"] },
  { key: "repair", name: "Repair Shop", modules: [...BASE_MODULES, "inventory", "purchasing", "repair", "booking"] },
  { key: "laundry", name: "Laundry", modules: [...BASE_MODULES, "laundry", "booking", "payments"] },
  { key: "rental", name: "Rental", modules: [...BASE_MODULES, "inventory", "rental", "booking", "payments"] },
  { key: "education", name: "Education / Tuition", modules: [...BASE_MODULES, "education", "booking", "payroll"] },
  { key: "events", name: "Events / Attractions", modules: [...BASE_MODULES, "events", "booking", "marketing"] },
  { key: "wholesale", name: "Wholesale / B2B", modules: [...BASE_MODULES, "inventory", "purchasing", "wholesale", "accounting", "pricing"] },
  { key: "professional", name: "Professional Services", modules: [...BASE_MODULES, "professional", "booking", "accounting"] },
  { key: "clinic", name: "Clinic / Wellness", modules: [...BASE_MODULES, "inventory", "booking", "payroll"] },
  { key: "other", name: "Other", modules: BASE_MODULES },
];
export function modulesForIndustry(industry: string): string[] {
  const preset = BRIDGEX_INDUSTRIES.find((i) => i.key === industry);
  return (preset?.modules || BASE_MODULES).filter((key) => (BRIDGEX_MODULES as string[]).includes(key));
}
export const BRIDGEX_NOTIFICATION_EVENTS = [
  "new_order", "order_status", "order_paid", "payment_completed", "low_stock", "new_booking", "booking_status", "booking_cancelled",
  "shift", "attendance", "attendance_decision", "leave_request", "leave_decision", "staff_review", "meeting",
  "payroll_published", "subscription_renewal", "loyalty_reward", "pet_hungry", "kos_gift", "chat_message", "friend_request",
  "new_event", "admin_broadcast", "new_faq", "song_request", "song_request_update", "feedback",
] as const;

const MANAGEMENT_ROLES = new Set(["owner", "admin", "manager"]);
// Who may use the BridgeX merchant console at all. Plain app customers (role
// "member") belong to a tenant for notifications but must NOT see or operate it.
const STAFF_ROLES = new Set(["owner", "admin", "manager", "staff"]);
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

// The one super admin (by email) can manage the platform team + billing.
async function isSuperAdmin(req: Request) {
  const user = await currentUser(req);
  return !!user?.email && PLATFORM_EMAILS().has(user.email.toLowerCase());
}
// Platform staff = the super admin OR a sub-admin (sales/accountant/partner) he created.
// All of them can use the platform console (dashboard, companies, branches, business types).
async function platformRole(req: Request): Promise<string | null> {
  const user = await currentUser(req);
  if (!user) return null;
  if (user.email && PLATFORM_EMAILS().has(user.email.toLowerCase())) return "super";
  const [row] = (await db.execute(sql`SELECT role FROM bridge_platform_admins WHERE user_id=${user.id} LIMIT 1`)).rows as any[];
  return row?.role || null;
}
async function isPlatformAdmin(req: Request) {
  return (await platformRole(req)) !== null;
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
// Selected outlet/branch (top-right dropdown). Null = all branches.
function requestedBranchId(req: Request): number | null {
  const raw = req.header("x-branch-id") || req.query.branchId;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}
// SQL fragment that scopes a query to the selected branch, or nothing when "all".
function branchClause(req: Request, col: string) {
  const bid = requestedBranchId(req);
  return bid ? sql`AND ${sql.raw(col)}=${bid}` : sql``;
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
  if (!member || !STAFF_ROLES.has(member.role) || (management && !MANAGEMENT_ROLES.has(member.role))) {
    res.status(403).json({ message: management ? "Company management access required" : "Company access denied" });
    return null;
  }
  return { user, companyId, role: member.role, branchId: member.branchId };
}

// KDS routing: explicit product override wins, else derive a station from the category name.
function stationFor(category?: string | null, override?: string | null): string {
  if (override) return override;
  const c = (category || "").toLowerCase();
  if (/drink|beer|wine|beverage|\bbar\b|cocktail|juice|coffee|tea|soda|spirit|whisky|vodka/.test(c)) return "bar";
  if (/dessert|cake|ice ?cream|sweet|pastry|gelato/.test(c)) return "dessert";
  return "kitchen";
}
function randomToken() { return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6); }

async function moduleEnabled(companyId: number, key: string) {
  if (CORE_MODULES.has(key)) return true; // core is always on for every company
  const rows = (await db.execute(sql`SELECT enabled FROM bridge_company_modules WHERE company_id=${companyId} AND module_key=${key} LIMIT 1`)).rows as any[];
  return rows.length ? !!rows[0].enabled : false;
}
// Like companyAccess, but also requires the given module to be enabled for the company.
async function requireModule(req: Request, res: Response, key: string, management = false) {
  const access = await companyAccess(req, res, management);
  if (!access) return null;
  if (access.role !== "platform_admin" && !(await moduleEnabled(access.companyId, key))) {
    res.status(403).json({ message: `The ${key} module is not enabled for this business.`, code: "MODULE_DISABLED" });
    return null;
  }
  return access;
}

// Recompute a ticket's subtotal/total from its current line items + stored charges.
async function recomputeTicket(ticketId: number) {
  const [t] = await db.select().from(posTickets).where(eq(posTickets.id, ticketId)).limit(1);
  if (!t) return;
  const its = await db.select().from(posTicketItems).where(eq(posTicketItems.orderId, ticketId));
  const subtotal = its.reduce((s, i) => s + Number(i.lineTotal), 0);
  const total = Math.max(0, subtotal - Number(t.discount) + Number(t.tax) + Number(t.serviceFee));
  await db.update(posTickets).set({ subtotal: String(subtotal), total: String(total) }).where(eq(posTickets.id, ticketId));
}
// Append items to an open ticket (running tab): validates ownership, deducts stock, sets KDS station, recomputes totals.
async function appendTicketItems(companyId: number, ticketId: number, rawItems: any[], source: string) {
  const productIds = rawItems.map((i) => Number(i.productId)).filter(Boolean);
  const products = productIds.length ? await db.select().from(posProducts).where(and(eq(posProducts.companyId, companyId), inArray(posProducts.id, productIds))) : [];
  const lines = rawItems.map((item) => { const product = products.find((r) => r.id === Number(item.productId)); if (!product) throw new Error("A product does not belong to this company"); const qty = Math.max(1, Number(item.qty || 1)); return { product, qty, total: Number(product.price) * qty }; });
  if (!lines.length) throw new Error("No valid items");
  await db.insert(posTicketItems).values(lines.map((l) => ({ orderId: ticketId, productId: l.product.id, name: l.product.name, price: l.product.price, qty: l.qty, lineTotal: String(l.total), source, status: "new", station: stationFor(l.product.category, l.product.station) })));
  for (const l of lines) await db.update(posProducts).set({ stock: sql`${posProducts.stock} - ${l.qty}` }).where(and(eq(posProducts.id, l.product.id), eq(posProducts.companyId, companyId)));
  await maybeDeductRecipes(companyId, lines, null);
  await recomputeTicket(ticketId);
  return lines;
}
// A company's local timezone (from its first branch) for day/week/month bucketing.
const _tzCache = new Map<number, string>();
async function companyTimezone(companyId: number): Promise<string> {
  if (_tzCache.has(companyId)) return _tzCache.get(companyId)!;
  const [b] = (await db.execute(sql`SELECT timezone FROM bridge_branches WHERE company_id=${companyId} ORDER BY id LIMIT 1`)).rows as any[];
  const tz = b?.timezone || "Asia/Jakarta";
  _tzCache.set(companyId, tz);
  return tz;
}
// When a product with a recipe is sold, consume its inventory items (branch 0) + log movements.
async function deductRecipe(companyId: number, productId: number, saleQty: number, userId: string | null) {
  const recipe = (await db.execute(sql`SELECT item_id, qty FROM bridge_product_recipes WHERE company_id=${companyId} AND product_id=${productId}`)).rows as any[];
  if (!recipe.length) return;
  for (const line of recipe) {
    const consume = Number(line.qty) * saleQty;
    await db.execute(sql`INSERT INTO bridge_stock_levels (company_id, item_id, branch_id, quantity, updated_at) VALUES (${companyId}, ${line.item_id}, 0, ${-consume}, now())
      ON CONFLICT (item_id, branch_id) DO UPDATE SET quantity=bridge_stock_levels.quantity - ${consume}, updated_at=now()`);
    await db.execute(sql`INSERT INTO bridge_stock_movements (company_id, item_id, branch_id, type, quantity, reference, user_id) VALUES (${companyId}, ${line.item_id}, 0, 'sale', ${-consume}, ${"product#" + productId}, ${userId})`);
  }
}
async function maybeDeductRecipes(companyId: number, lines: any[], userId: string | null) {
  if (!(await moduleEnabled(companyId, "inventory"))) return;
  for (const l of lines) await deductRecipe(companyId, l.product.id, l.qty, userId);
}

async function notifyKitchen(companyId: number, ticket: any, lines: any[]) {
  const result = await db.execute(sql`SELECT DISTINCT m.user_id FROM bridge_company_members m LEFT JOIN bridge_positions p ON p.id=m.position_id WHERE m.company_id=${companyId} AND m.status='active' AND (p.code IN ('chef','kitchen','bartender','bar') OR m.role IN ('owner','admin','manager'))`);
  const ids = ((result.rows || result) as any[]).map((r) => r.user_id);
  // Reborn's admins/staff are flagged on users.role and usually have no
  // bridge_company_members row, so the query above finds nobody for them.
  const [company] = await db.select({ slug: bridgeCompanies.slug }).from(bridgeCompanies).where(eq(bridgeCompanies.id, companyId)).limit(1);
  const isReborn = company?.slug === "reborn-wave-group";
  if (isReborn) ids.push(...(await db.select({ id: users.id }).from(users).where(inArray(users.role, ["admin", "staff"]))).map((u) => u.id));
  await sendBridgeXNotifications(companyId, ids, { type: "new_order", title: `Order ${ticket.orderNo}`, body: `${lines.length} item${lines.length === 1 ? "" : "s"}${ticket.tableNumber ? ` · Table ${ticket.tableNumber}` : ""}`, data: { ticketId: ticket.id, ...(isReborn ? { path: "/reborn-pos" } : {}) } });
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
  const industryKey = String(body.industry || "other");
  const chosen = Array.isArray(body.modules) && body.modules.length
    ? body.modules.filter((key: string) => (BRIDGEX_MODULES as string[]).includes(key))
    : modulesForIndustry(industryKey);
  // Core modules are always included for every company.
  const selected = Array.from(new Set([...chosen, ...CORE_MODULES]));
  if (selected.length) await db.insert(bridgeCompanyModules).values(selected.map((moduleKey: string) => ({ companyId: company.id, moduleKey })));
  await db.insert(bridgeCompanyMembers).values({ companyId: company.id, userId: ownerUserId, branchId: branch.id, positionId: positions[0]?.id, role: "owner" });
  return { company, branch, modules: selected };
}

export interface PushOutcome { status: "sent" | "failed" | "no_device" | "no_recipients"; devices: number; errors: string[] }
export async function sendBridgeXNotifications(companyId: number, userIds: string[], payload: { type: string; title: string; body: string; data?: Record<string, unknown> }): Promise<PushOutcome> {
  const targets = Array.from(new Set(userIds.filter(Boolean)));
  if (!targets.length) return { status: "no_recipients", devices: 0, errors: [] };
  const notices = await db.insert(bridgeNotifications).values(targets.map((userId) => ({ companyId, userId, type: payload.type, title: payload.title, body: payload.body, data: payload.data || {} }))).returning();
  const tokens = await db.select().from(bridgeDeviceTokens).where(and(inArray(bridgeDeviceTokens.userId, targets), eq(bridgeDeviceTokens.active, true)));
  if (!tokens.length) {
    await db.update(bridgeNotifications).set({ pushStatus: "no_device" }).where(inArray(bridgeNotifications.id, notices.map((notice) => notice.id)));
    console.info("Expo push skipped: no registered phone", { type: payload.type, recipients: targets.length });
    return { status: "no_device", devices: 0, errors: [] };
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
    const sent = tickets.some((ticket: any) => ticket?.status === "ok");
    await db.update(bridgeNotifications).set({ pushStatus: sent ? "sent" : "failed" }).where(inArray(bridgeNotifications.id, notices.map((notice) => notice.id)));
    const errors = tickets.filter((ticket: any) => ticket?.status !== "ok").map((ticket: any) => ticket?.details?.error || ticket?.message || "unknown");
    console.info("Expo push result", { type: payload.type, recipients: targets.length, devices: tokens.length, accepted: tickets.length - errors.length, errors });
    return { status: sent ? "sent" : "failed", devices: tokens.length, errors };
  } catch (error) {
    await db.update(bridgeNotifications).set({ pushStatus: "failed" }).where(inArray(bridgeNotifications.id, notices.map((notice) => notice.id)));
    console.warn("Expo push unavailable", error);
    return { status: "failed", devices: tokens.length, errors: [error instanceof Error ? error.message : String(error)] };
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

export async function sendRebornUserNotification(userId: string | null | undefined, payload: { type: string; title: string; body: string; data?: Record<string, unknown> }): Promise<PushOutcome | undefined> {
  if (!userId) return;
  const company = (await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.slug, "reborn-wave-group")).limit(1))[0];
  if (!company) return;
  const outcome = await sendBridgeXNotifications(company.id, [userId], payload);
  emitCompanyChange(company.id, String(payload.data?.path || "notifications"));
  return outcome;
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
    ALTER TABLE song_requests ADD COLUMN IF NOT EXISTS table_label varchar; ALTER TABLE venue_checkins ADD COLUMN IF NOT EXISTS table_label varchar;
    ALTER TABLE faq_items ADD COLUMN IF NOT EXISTS i18n jsonb;
    ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS image_data text; ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS hidden_for jsonb NOT NULL DEFAULT '[]';
    ALTER TABLE pos_tickets ADD COLUMN IF NOT EXISTS company_id integer; ALTER TABLE pos_tickets ADD COLUMN IF NOT EXISTS branch_id integer; ALTER TABLE pos_tickets ADD COLUMN IF NOT EXISTS payment_reference varchar;
    ALTER TABLE pos_tickets ADD COLUMN IF NOT EXISTS cash_received numeric(10,2); ALTER TABLE pos_tickets ADD COLUMN IF NOT EXISTS change_given numeric(10,2); ALTER TABLE pos_tickets ADD COLUMN IF NOT EXISTS adjustment_reason text; ALTER TABLE pos_tickets ADD COLUMN IF NOT EXISTS refund_reason text; ALTER TABLE pos_tickets ADD COLUMN IF NOT EXISTS refunded_by varchar; ALTER TABLE pos_tickets ADD COLUMN IF NOT EXISTS refunded_at timestamp;
    ALTER TABLE bridge_staff_profiles ADD COLUMN IF NOT EXISTS commission_rate numeric(6,2) NOT NULL DEFAULT 0; ALTER TABLE bridge_staff_profiles ADD COLUMN IF NOT EXISTS sales_target numeric(14,2) NOT NULL DEFAULT 0;
    ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS company_id integer; ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS branch_id integer;
    ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS company_id integer; ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS branch_id integer;
    ALTER TABLE staff_attendance ADD COLUMN IF NOT EXISTS company_id integer; ALTER TABLE staff_attendance ADD COLUMN IF NOT EXISTS branch_id integer;
    ALTER TABLE worker_shifts ADD COLUMN IF NOT EXISTS company_id integer; ALTER TABLE worker_shifts ADD COLUMN IF NOT EXISTS branch_id integer;
    ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS company_id integer; ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS branch_id integer;
    ALTER TABLE events ADD COLUMN IF NOT EXISTS company_id integer; ALTER TABLE events ADD COLUMN IF NOT EXISTS branch_id integer;
    ALTER TABLE events ADD COLUMN IF NOT EXISTS start_date varchar; ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date varchar;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS company_id integer; ALTER TABLE appointments ADD COLUMN IF NOT EXISTS branch_id integer;
    ALTER TABLE spin_prizes ADD COLUMN IF NOT EXISTS company_id integer; ALTER TABLE spin_results ADD COLUMN IF NOT EXISTS company_id integer;
    ALTER TABLE songs ADD COLUMN IF NOT EXISTS company_id integer; ALTER TABLE song_requests ADD COLUMN IF NOT EXISTS company_id integer; ALTER TABLE kos_gift_types ADD COLUMN IF NOT EXISTS company_id integer; ALTER TABLE kos_gifts ADD COLUMN IF NOT EXISTS company_id integer;
    ALTER TABLE pvp_game_scores ADD COLUMN IF NOT EXISTS company_id integer;
    -- Inventory & Purchasing module
    CREATE TABLE IF NOT EXISTS bridge_suppliers (id serial PRIMARY KEY, company_id integer NOT NULL, name varchar NOT NULL, phone varchar, email varchar, address text, note text, active boolean NOT NULL DEFAULT true, created_at timestamp NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS bridge_suppliers_company ON bridge_suppliers(company_id);
    CREATE TABLE IF NOT EXISTS bridge_inventory_items (id serial PRIMARY KEY, company_id integer NOT NULL, sku varchar, name varchar NOT NULL, category varchar, unit varchar NOT NULL DEFAULT 'unit', cost_price numeric(14,2) NOT NULL DEFAULT 0, sell_price numeric(14,2) NOT NULL DEFAULT 0, track_stock boolean NOT NULL DEFAULT true, low_stock_threshold numeric(14,3) NOT NULL DEFAULT 0, supplier_id integer, active boolean NOT NULL DEFAULT true, created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS bridge_inventory_items_company ON bridge_inventory_items(company_id);
    CREATE TABLE IF NOT EXISTS bridge_stock_levels (company_id integer NOT NULL, item_id integer NOT NULL, branch_id integer NOT NULL DEFAULT 0, quantity numeric(14,3) NOT NULL DEFAULT 0, updated_at timestamp NOT NULL DEFAULT now(), PRIMARY KEY(item_id, branch_id));
    CREATE TABLE IF NOT EXISTS bridge_stock_movements (id serial PRIMARY KEY, company_id integer NOT NULL, item_id integer NOT NULL, branch_id integer NOT NULL DEFAULT 0, type varchar NOT NULL, quantity numeric(14,3) NOT NULL, unit_cost numeric(14,2) NOT NULL DEFAULT 0, reference varchar, note text, user_id varchar, created_at timestamp NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS bridge_stock_movements_company ON bridge_stock_movements(company_id, created_at);
    CREATE TABLE IF NOT EXISTS bridge_purchase_orders (id serial PRIMARY KEY, company_id integer NOT NULL, supplier_id integer, branch_id integer NOT NULL DEFAULT 0, status varchar NOT NULL DEFAULT 'draft', total numeric(14,2) NOT NULL DEFAULT 0, note text, created_by varchar, created_at timestamp NOT NULL DEFAULT now(), received_at timestamp);
    CREATE INDEX IF NOT EXISTS bridge_purchase_orders_company ON bridge_purchase_orders(company_id, created_at);
    CREATE TABLE IF NOT EXISTS bridge_purchase_order_items (id serial PRIMARY KEY, po_id integer NOT NULL, item_id integer NOT NULL, quantity numeric(14,3) NOT NULL DEFAULT 0, unit_cost numeric(14,2) NOT NULL DEFAULT 0, received_qty numeric(14,3) NOT NULL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS bridge_po_items_po ON bridge_purchase_order_items(po_id);
    -- CRM module
    CREATE TABLE IF NOT EXISTS bridge_customers (id serial PRIMARY KEY, company_id integer NOT NULL, name varchar NOT NULL, phone varchar, email varchar, birthday varchar, gender varchar, tags jsonb NOT NULL DEFAULT '[]', note text, wallet_balance numeric(14,2) NOT NULL DEFAULT 0, store_credit numeric(14,2) NOT NULL DEFAULT 0, total_spend numeric(14,2) NOT NULL DEFAULT 0, visit_count integer NOT NULL DEFAULT 0, last_visit_at timestamp, created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS bridge_customers_company ON bridge_customers(company_id);
    -- Deep POS + payments
    ALTER TABLE pos_tickets ADD COLUMN IF NOT EXISTS tip numeric(10,2) NOT NULL DEFAULT 0;
    ALTER TABLE pos_tickets ADD COLUMN IF NOT EXISTS paid_total numeric(10,2) NOT NULL DEFAULT 0;
    ALTER TABLE pos_tickets ADD COLUMN IF NOT EXISTS customer_id integer;
    ALTER TABLE pos_tickets ADD COLUMN IF NOT EXISTS void_reason text;
    ALTER TABLE pos_tickets ADD COLUMN IF NOT EXISTS voided_by varchar;
    ALTER TABLE pos_tickets ADD COLUMN IF NOT EXISTS voided_at timestamp;
    CREATE TABLE IF NOT EXISTS bridge_payments (id serial PRIMARY KEY, company_id integer NOT NULL, ticket_id integer NOT NULL, method varchar NOT NULL, amount numeric(14,2) NOT NULL, reference varchar, is_refund boolean NOT NULL DEFAULT false, created_by varchar, created_at timestamp NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS bridge_payments_ticket ON bridge_payments(ticket_id);
    -- Restaurant pack (tables, KDS routing, QR ordering)
    ALTER TABLE pos_ticket_items ADD COLUMN IF NOT EXISTS station varchar NOT NULL DEFAULT 'kitchen';
    CREATE TABLE IF NOT EXISTS bridge_tables (id serial PRIMARY KEY, company_id integer NOT NULL, branch_id integer NOT NULL DEFAULT 0, name varchar NOT NULL, area varchar, seats integer NOT NULL DEFAULT 2, status varchar NOT NULL DEFAULT 'available', current_ticket_id integer, qr_token varchar, sort integer NOT NULL DEFAULT 0, created_at timestamp NOT NULL DEFAULT now());
    CREATE UNIQUE INDEX IF NOT EXISTS bridge_tables_qr_token ON bridge_tables(qr_token) WHERE qr_token IS NOT NULL;
    CREATE INDEX IF NOT EXISTS bridge_tables_company ON bridge_tables(company_id);
    ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS station varchar;
    ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS department varchar;
    -- Pricing rules (happy hour / member / category discounts)
    CREATE TABLE IF NOT EXISTS bridge_price_rules (id serial PRIMARY KEY, company_id integer NOT NULL, name varchar NOT NULL, type varchar NOT NULL DEFAULT 'happy_hour', scope_category varchar, percent_off numeric(6,2) NOT NULL DEFAULT 0, days jsonb NOT NULL DEFAULT '[]', start_time varchar, end_time varchar, active boolean NOT NULL DEFAULT true, created_at timestamp NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS bridge_price_rules_company ON bridge_price_rules(company_id);
    -- Universal booking engine (staff/room/chair/bay/asset) + bookings
    CREATE TABLE IF NOT EXISTS bridge_resources (id serial PRIMARY KEY, company_id integer NOT NULL, type varchar NOT NULL DEFAULT 'staff', name varchar NOT NULL, meta jsonb NOT NULL DEFAULT '{}', active boolean NOT NULL DEFAULT true, sort integer NOT NULL DEFAULT 0, created_at timestamp NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS bridge_resources_company ON bridge_resources(company_id);
    CREATE TABLE IF NOT EXISTS bridge_bookings (id serial PRIMARY KEY, company_id integer NOT NULL, branch_id integer NOT NULL DEFAULT 0, resource_id integer, customer_id integer, customer_name varchar, customer_phone varchar, service varchar, starts_at timestamp NOT NULL, ends_at timestamp, status varchar NOT NULL DEFAULT 'booked', price numeric(14,2) NOT NULL DEFAULT 0, deposit numeric(14,2) NOT NULL DEFAULT 0, commission numeric(14,2) NOT NULL DEFAULT 0, staff_user_id varchar, note text, created_by varchar, created_at timestamp NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS bridge_bookings_company_time ON bridge_bookings(company_id, starts_at);
    -- Events / ticketing
    CREATE TABLE IF NOT EXISTS bridge_events (id serial PRIMARY KEY, company_id integer NOT NULL, name varchar NOT NULL, starts_at timestamp, venue varchar, description text, active boolean NOT NULL DEFAULT true, created_at timestamp NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS bridge_events_company ON bridge_events(company_id);
    CREATE TABLE IF NOT EXISTS bridge_ticket_types (id serial PRIMARY KEY, company_id integer NOT NULL, event_id integer NOT NULL, name varchar NOT NULL, price numeric(14,2) NOT NULL DEFAULT 0, quantity integer NOT NULL DEFAULT 0, sold integer NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS bridge_tickets (id serial PRIMARY KEY, company_id integer NOT NULL, event_id integer NOT NULL, ticket_type_id integer, code varchar, buyer_name varchar, buyer_phone varchar, status varchar NOT NULL DEFAULT 'valid', checked_in_at timestamp, created_at timestamp NOT NULL DEFAULT now());
    CREATE UNIQUE INDEX IF NOT EXISTS bridge_tickets_code ON bridge_tickets(code) WHERE code IS NOT NULL;
    CREATE INDEX IF NOT EXISTS bridge_tickets_event ON bridge_tickets(event_id);
    -- Repair shop tickets
    CREATE TABLE IF NOT EXISTS bridge_repairs (id serial PRIMARY KEY, company_id integer NOT NULL, ticket_no varchar, customer_name varchar, customer_phone varchar, device varchar, serial_imei varchar, problem text, diagnosis text, quote numeric(14,2) NOT NULL DEFAULT 0, deposit numeric(14,2) NOT NULL DEFAULT 0, status varchar NOT NULL DEFAULT 'received', assigned_user_id varchar, note text, created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS bridge_repairs_company ON bridge_repairs(company_id);
    -- Marketing campaigns
    CREATE TABLE IF NOT EXISTS bridge_campaigns (id serial PRIMARY KEY, company_id integer NOT NULL, name varchar NOT NULL, channel varchar NOT NULL DEFAULT 'whatsapp', segment varchar NOT NULL DEFAULT 'all', message text, status varchar NOT NULL DEFAULT 'draft', sent_count integer NOT NULL DEFAULT 0, created_at timestamp NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS bridge_campaigns_company ON bridge_campaigns(company_id);
    -- Wholesale / B2B accounts
    CREATE TABLE IF NOT EXISTS bridge_wholesale_accounts (id serial PRIMARY KEY, company_id integer NOT NULL, name varchar NOT NULL, contact varchar, phone varchar, price_tier varchar NOT NULL DEFAULT 'standard', discount_pct numeric(6,2) NOT NULL DEFAULT 0, credit_limit numeric(14,2) NOT NULL DEFAULT 0, balance numeric(14,2) NOT NULL DEFAULT 0, note text, created_at timestamp NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS bridge_wholesale_company ON bridge_wholesale_accounts(company_id);
    -- Professional services: projects + time entries
    CREATE TABLE IF NOT EXISTS bridge_projects (id serial PRIMARY KEY, company_id integer NOT NULL, client varchar, name varchar NOT NULL, status varchar NOT NULL DEFAULT 'active', budget numeric(14,2) NOT NULL DEFAULT 0, rate numeric(14,2) NOT NULL DEFAULT 0, note text, created_at timestamp NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS bridge_projects_company ON bridge_projects(company_id);
    CREATE TABLE IF NOT EXISTS bridge_time_entries (id serial PRIMARY KEY, company_id integer NOT NULL, project_id integer NOT NULL, user_id varchar, work_date varchar, hours numeric(8,2) NOT NULL DEFAULT 0, note text, created_at timestamp NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS bridge_time_entries_project ON bridge_time_entries(project_id);
    -- Food court: stalls + revenue allocation
    ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS stall_id integer;
    CREATE TABLE IF NOT EXISTS bridge_stalls (id serial PRIMARY KEY, company_id integer NOT NULL, name varchar NOT NULL, commission_pct numeric(6,2) NOT NULL DEFAULT 0, contact varchar, active boolean NOT NULL DEFAULT true, created_at timestamp NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS bridge_stalls_company ON bridge_stalls(company_id);
    -- Live gifts
    CREATE TABLE IF NOT EXISTS bridge_gift_catalog (id serial PRIMARY KEY, company_id integer NOT NULL, name varchar NOT NULL, emoji varchar, price numeric(14,2) NOT NULL DEFAULT 0, share_pct numeric(6,2) NOT NULL DEFAULT 50, active boolean NOT NULL DEFAULT true);
    CREATE TABLE IF NOT EXISTS bridge_gift_sends (id serial PRIMARY KEY, company_id integer NOT NULL, gift_id integer, from_name varchar, to_user_id varchar, amount numeric(14,2) NOT NULL DEFAULT 0, performer_share numeric(14,2) NOT NULL DEFAULT 0, created_at timestamp NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS bridge_gift_sends_company ON bridge_gift_sends(company_id, created_at);
    -- Lucky draw
    CREATE TABLE IF NOT EXISTS bridge_draws (id serial PRIMARY KEY, company_id integer NOT NULL, name varchar NOT NULL, pool numeric(14,2) NOT NULL DEFAULT 0, status varchar NOT NULL DEFAULT 'open', winner_name varchar, created_at timestamp NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS bridge_draw_entries (id serial PRIMARY KEY, draw_id integer NOT NULL, company_id integer NOT NULL, name varchar NOT NULL, tickets integer NOT NULL DEFAULT 1);
    CREATE INDEX IF NOT EXISTS bridge_draw_entries_draw ON bridge_draw_entries(draw_id);
    -- Accounting: expenses (income is derived from paid POS tickets)
    CREATE TABLE IF NOT EXISTS bridge_expenses (id serial PRIMARY KEY, company_id integer NOT NULL, category varchar NOT NULL DEFAULT 'other', amount numeric(14,2) NOT NULL DEFAULT 0, note text, spent_on varchar, created_by varchar, created_at timestamp NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS bridge_expenses_company ON bridge_expenses(company_id, spent_on);
    -- Recipe / BOM: a POS product consumes inventory items when sold
    CREATE TABLE IF NOT EXISTS bridge_product_recipes (id serial PRIMARY KEY, company_id integer NOT NULL, product_id integer NOT NULL, item_id integer NOT NULL, qty numeric(14,3) NOT NULL DEFAULT 1);
    CREATE INDEX IF NOT EXISTS bridge_product_recipes_product ON bridge_product_recipes(product_id);
    -- Which business types (modules) each branch runs. No rows = inherit all company modules.
    CREATE TABLE IF NOT EXISTS bridge_branch_modules (company_id integer NOT NULL, branch_id integer NOT NULL, module_key varchar NOT NULL, PRIMARY KEY(branch_id, module_key));
    CREATE INDEX IF NOT EXISTS bridge_branch_modules_branch ON bridge_branch_modules(branch_id);
    -- Platform team: sub-admins the super admin creates (sales/accountant/partner/admin).
    CREATE TABLE IF NOT EXISTS bridge_platform_admins (user_id varchar PRIMARY KEY, role varchar NOT NULL DEFAULT 'sales', created_at timestamp NOT NULL DEFAULT now());
  `));
  const reborn = (await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.slug, "reborn-wave-group")).limit(1))[0]
    || (await db.insert(bridgeCompanies).values({ slug: "reborn-wave-group", name: "Reborn Wave Group", appName: "Reborn", industry: "entertainment", status: "active", subscriptionPlan: "enterprise", subscriptionStatus: "active" }).returning())[0];
  await db.update(bridgeCompanies).set({ appName: "Reborn", industry: "entertainment", websiteDomain: "rebornwave.group", androidPackage: "com.rebornwave.group", iosBundleId: "com.rebornwave.group", status: "active", subscriptionPlan: "enterprise", subscriptionStatus: "active", updatedAt: new Date() }).where(eq(bridgeCompanies.id, reborn.id));
  let branch = (await db.select().from(bridgeBranches).where(and(eq(bridgeBranches.companyId, reborn.id), eq(bridgeBranches.code, "MAIN"))).limit(1))[0];
  if (!branch) [branch] = await db.insert(bridgeBranches).values({ companyId: reborn.id, name: "Reborn Batam", code: "MAIN", address: "Batam, Indonesia" }).returning();
  await db.execute(sql.raw(`INSERT INTO bridge_company_modules (company_id, module_key, enabled) SELECT ${reborn.id}, module_key, true FROM unnest(ARRAY[${BRIDGEX_MODULES.map((key) => `'${key}'`).join(",")}]::text[]) module_key ON CONFLICT (company_id, module_key) DO NOTHING`));
  await db.execute(sql`INSERT INTO bridge_company_settings (company_id, config) VALUES (${reborn.id}, ${JSON.stringify({ loyalty: { pointsSpendRp: 1000, rewardsEnabled: true, tiers: [{ name: "Bronze", minPoints: 0, discountPercent: 0, freeRp: 0, benefits: ["Member access"] }, { name: "Silver", minPoints: 500, discountPercent: 2, freeRp: 0, benefits: ["Priority booking"] }, { name: "Gold", minPoints: 2000, discountPercent: 5, freeRp: 50000, benefits: ["5% discount", "RP 50,000 store gift"] }] }, services: { booking: true, faq: true, songRequests: true, bottleKeep: true, aiWhatsApp: true, aiTelegram: false }, booking: { areas: [] }, automation: { reminders: [], faq: [] }, provision: { domainStatus: "live", backendStatus: "live", appStyle: "reborn" } })}::jsonb) ON CONFLICT (company_id) DO NOTHING`);
  await db.execute(sql`INSERT INTO bridge_company_members (company_id, user_id, branch_id, role) SELECT ${reborn.id}, id, ${branch.id}, CASE WHEN role='admin' THEN 'admin' WHEN role='staff' THEN 'staff' ELSE 'member' END FROM users ON CONFLICT (company_id, user_id) DO NOTHING`);
  for (const table of ["pos_products", "pos_tickets", "stock_movements", "ledger_entries", "staff_attendance", "worker_shifts", "leave_requests", "events", "appointments"]) {
    await db.execute(sql.raw(`UPDATE ${table} SET company_id=${reborn.id}, branch_id=${branch.id} WHERE company_id IS NULL`));
  }
  // company-only backfill (these tables have no branch_id)
  for (const table of ["spin_prizes", "spin_results", "songs", "song_requests", "kos_gift_types", "kos_gifts", "pvp_game_scores"]) {
    await db.execute(sql.raw(`UPDATE ${table} SET company_id=${reborn.id} WHERE company_id IS NULL`));
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
  app.get("/api/v1/meta/modules", route(async (_req, res) => { res.json(BRIDGEX_MODULE_REGISTRY); }));
  app.get("/api/v1/meta/industries", route(async (_req, res) => { res.json(BRIDGEX_INDUSTRIES); }));
  // ── QR ordering (public — resolved by a table's QR token, no login) ────────
  app.get("/api/v1/order/:token", route(async (req, res) => {
    const [tbl] = (await db.execute(sql`SELECT * FROM bridge_tables WHERE qr_token=${req.params.token} LIMIT 1`)).rows as any[];
    if (!tbl) return res.status(404).json({ message: "Invalid QR code" });
    if (!(await moduleEnabled(tbl.company_id, "qr_ordering"))) return res.status(403).json({ message: "QR ordering is not enabled here" });
    const [company] = await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.id, tbl.company_id)).limit(1);
    const menu = await db.select().from(posProducts).where(and(eq(posProducts.companyId, tbl.company_id), eq(posProducts.active, true)));
    res.json({ table: { id: tbl.id, name: tbl.name }, company: { appName: company?.appName || company?.name, logoUrl: company?.logoUrl, theme: company?.theme }, menu: menu.filter((m) => m.posVisible !== false).map((m) => ({ id: m.id, name: m.name, price: m.price, category: m.category, imageUrl: m.imageUrl })) });
  }));
  app.post("/api/v1/order/:token", route(async (req, res) => {
    const [tbl] = (await db.execute(sql`SELECT * FROM bridge_tables WHERE qr_token=${req.params.token} LIMIT 1`)).rows as any[];
    if (!tbl) return res.status(404).json({ message: "Invalid QR code" });
    const companyId = tbl.company_id;
    if (!(await moduleEnabled(companyId, "qr_ordering"))) return res.status(403).json({ message: "QR ordering is not enabled here" });
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ message: "Add at least one item" });
    let ticketId = tbl.current_ticket_id;
    if (ticketId) { const [t] = await db.select().from(posTickets).where(eq(posTickets.id, ticketId)).limit(1); if (!t || ["paid", "refunded", "voided"].includes(t.status)) ticketId = null; }
    if (!ticketId) { const [t] = await db.insert(posTickets).values({ companyId, branchId: tbl.branch_id || null, orderNo: `QR-${Date.now().toString(36).toUpperCase()}`, source: "qr", status: "open", tableNumber: tbl.name, orderMode: "dine_in" }).returning(); ticketId = t.id; await db.execute(sql`UPDATE bridge_tables SET status='occupied', current_ticket_id=${ticketId} WHERE id=${tbl.id}`); }
    const lines = await appendTicketItems(companyId, ticketId, items, "qr");
    const [ticket] = await db.select().from(posTickets).where(eq(posTickets.id, ticketId)).limit(1);
    await notifyKitchen(companyId, ticket, lines);
    emitCompanyChange(companyId, "kds");
    res.status(201).json({ ok: true, orderNo: ticket.orderNo });
  }));
  // Public ticket view (holder shows this; scanning is done by staff via /events/scan)
  app.get("/api/v1/ticket/:code", route(async (req, res) => {
    const [t] = (await db.execute(sql`SELECT t.*, e.name event_name, e.starts_at, e.venue, tt.name type_name, c.app_name, c.name company_name, c.logo_url, c.theme FROM bridge_tickets t JOIN bridge_events e ON e.id=t.event_id LEFT JOIN bridge_ticket_types tt ON tt.id=t.ticket_type_id JOIN bridge_companies c ON c.id=t.company_id WHERE t.code=${req.params.code} LIMIT 1`)).rows as any[];
    if (!t) return res.status(404).json({ message: "Ticket not found" });
    res.json({ code: t.code, status: t.status, buyer: t.buyer_name, event: t.event_name, startsAt: t.starts_at, venue: t.venue, type: t.type_name, checkedInAt: t.checked_in_at, company: { appName: t.app_name || t.company_name, logoUrl: t.logo_url, theme: t.theme } });
  }));
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
    const role = await platformRole(req);
    res.json({ brand: "BridgeXPOS", platformAdmin: role !== null, superAdmin: role === "super", platformRole: role, modules: BRIDGEX_MODULES, notificationEvents: BRIDGEX_NOTIFICATION_EVENTS });
  }));

  // Platform team management — super admin only.
  app.get("/api/v1/platform/admins", route(async (req, res) => {
    if (!(await isSuperAdmin(req))) return res.status(403).json({ message: "Super admin only" });
    res.json((await db.execute(sql`SELECT a.user_id, a.role, a.created_at, u.email, COALESCE(NULLIF(trim(concat(u.first_name,' ',u.last_name)),''),u.email) name FROM bridge_platform_admins a JOIN users u ON u.id=a.user_id ORDER BY a.created_at DESC`)).rows || []);
  }));
  app.post("/api/v1/platform/admins", route(async (req, res) => {
    if (!(await isSuperAdmin(req))) return res.status(403).json({ message: "Super admin only" });
    const email = String(req.body?.email || "").trim().toLowerCase();
    const role = ["sales", "accountant", "partner", "admin"].includes(req.body?.role) ? req.body.role : "sales";
    if (!email || !email.includes("@")) return res.status(400).json({ message: "A valid email is required" });
    const ensured = await ensureUser(email, req.body?.name || "BridgeX Team", req.body?.password);
    await db.execute(sql`INSERT INTO bridge_platform_admins (user_id, role) VALUES (${ensured.user.id}, ${role}) ON CONFLICT (user_id) DO UPDATE SET role=${role}`);
    res.status(201).json({ userId: ensured.user.id, email, role, temporaryPassword: ensured.temporaryPassword });
  }));
  app.delete("/api/v1/platform/admins/:userId", route(async (req, res) => {
    if (!(await isSuperAdmin(req))) return res.status(403).json({ message: "Super admin only" });
    await db.execute(sql`DELETE FROM bridge_platform_admins WHERE user_id=${req.params.userId}`); res.json({ ok: true });
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
    // Only the platform super admin creates businesses (and assigns each an owner).
    const admin = await requireUser(req, res); if (!admin) return;
    if (!(await isPlatformAdmin(req))) return res.status(403).json({ message: "Only the BridgeX platform admin can create a business." });
    let ownerId = admin.id, credentials: string | null = null;
    if (req.body?.adminEmail) { const ensured = await ensureUser(req.body.adminEmail, req.body.adminName || "Company Admin", req.body.adminPassword); ownerId = ensured.user.id; credentials = ensured.temporaryPassword; }
    res.status(201).json({ ...(await createCompany(req, ownerId, req.body || {})), temporaryPassword: credentials });
  }));

  app.get("/api/v1/companies", route(async (req, res) => {
    const user = await requireUser(req, res); if (!user) return;
    if (await isPlatformAdmin(req)) return res.json(await db.select().from(bridgeCompanies).orderBy(bridgeCompanies.name));
    const memberships = (await db.select().from(bridgeCompanyMembers).where(and(eq(bridgeCompanyMembers.userId, user.id), eq(bridgeCompanyMembers.status, "active"))))
      .filter((row) => STAFF_ROLES.has(row.role)); // customers (role 'member') don't get the merchant console
    const ids = memberships.map((row) => row.companyId);
    const companies = ids.length ? await db.select().from(bridgeCompanies).where(inArray(bridgeCompanies.id, ids)) : [];
    res.json(companies.map((company) => ({ ...company, membership: memberships.find((row) => row.companyId === company.id) })));
  }));

  // Super-admin cross-company overview: revenue per company + totals + MoM comparison.
  app.get("/api/v1/platform/overview", route(async (req, res) => {
    if (!(await isPlatformAdmin(req))) return res.status(403).json({ message: "Platform admin required" });
    const rows = (await db.execute(sql`
      SELECT c.id, c.name, c.industry, c.subscription_status,
        COALESCE(SUM(t.total) FILTER (WHERE t.status='paid' AND t.created_at >= date_trunc('month', now())),0) rev_month,
        COALESCE(SUM(t.total) FILTER (WHERE t.status='paid' AND t.created_at >= date_trunc('month', now()) - interval '1 month' AND t.created_at < date_trunc('month', now())),0) rev_prev,
        COUNT(t.id) FILTER (WHERE t.status='paid' AND t.created_at >= date_trunc('month', now())) orders_month
      FROM bridge_companies c LEFT JOIN pos_tickets t ON t.company_id=c.id
      GROUP BY c.id ORDER BY rev_month DESC`)).rows as any[];
    const companies = rows.map((r) => { const revMonth = Number(r.rev_month), revPrev = Number(r.rev_prev); return { id: r.id, name: r.name, industry: r.industry, subscriptionStatus: r.subscription_status, revMonth, revPrev, ordersMonth: Number(r.orders_month), deltaPct: revPrev ? Math.round(((revMonth - revPrev) / revPrev) * 100) : null }; });
    const totalMonth = companies.reduce((s, c) => s + c.revMonth, 0);
    const totalPrev = companies.reduce((s, c) => s + c.revPrev, 0);
    const totalOrders = companies.reduce((s, c) => s + c.ordersMonth, 0);
    res.json({ companies, totals: { companies: companies.length, revMonth: totalMonth, revPrev: totalPrev, orders: totalOrders, deltaPct: totalPrev ? Math.round(((totalMonth - totalPrev) / totalPrev) * 100) : null } });
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
    let tenant = (await db.execute(sql`SELECT id, slug, name, app_name, industry, logo_url, app_icon_url, website_domain, theme, status FROM bridge_companies WHERE (${host} <> '' AND website_domain=${host}) OR (${slug} <> '' AND slug=${slug}) LIMIT 1`)).rows?.[0] as any;
    // Default host (no domain/slug match) is the flagship Reborn app.
    if (!tenant) tenant = (await db.execute(sql`SELECT id, slug, name, app_name, industry, logo_url, app_icon_url, website_domain, theme, status FROM bridge_companies WHERE slug='reborn-wave-group' LIMIT 1`)).rows?.[0] as any;
    if (!tenant) return res.status(404).json({ message: "Company not found" });
    const modules = (await db.execute(sql`SELECT module_key FROM bridge_company_modules WHERE company_id=${tenant.id} AND enabled=true`)).rows.map((m: any) => m.module_key);
    res.json({ ...tenant, modules });
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

  // ── Inventory & Purchasing module ────────────────────────────────────────
  app.get("/api/v1/company/inventory/suppliers", route(async (req, res) => {
    const a = await requireModule(req, res, "inventory"); if (!a) return;
    res.json((await db.execute(sql`SELECT * FROM bridge_suppliers WHERE company_id=${a.companyId} ORDER BY active DESC, name`)).rows || []);
  }));
  app.post("/api/v1/company/inventory/suppliers", route(async (req, res) => {
    const a = await requireModule(req, res, "inventory", true); if (!a) return;
    const name = String(req.body?.name || "").trim(); if (!name) return res.status(400).json({ message: "Supplier name is required" });
    res.status(201).json((await db.execute(sql`INSERT INTO bridge_suppliers (company_id, name, phone, email, address, note) VALUES (${a.companyId}, ${name}, ${req.body?.phone || null}, ${req.body?.email || null}, ${req.body?.address || null}, ${req.body?.note || null}) RETURNING *`)).rows[0]);
  }));
  app.put("/api/v1/company/inventory/suppliers/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "inventory", true); if (!a) return;
    const r = await db.execute(sql`UPDATE bridge_suppliers SET name=COALESCE(${req.body?.name ?? null},name), phone=${req.body?.phone ?? null}, email=${req.body?.email ?? null}, address=${req.body?.address ?? null}, note=${req.body?.note ?? null}, active=COALESCE(${req.body?.active ?? null},active) WHERE id=${Number(req.params.id)} AND company_id=${a.companyId} RETURNING *`);
    if (!r.rows.length) return res.status(404).json({ message: "Supplier not found" }); res.json(r.rows[0]);
  }));
  app.delete("/api/v1/company/inventory/suppliers/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "inventory", true); if (!a) return;
    await db.execute(sql`DELETE FROM bridge_suppliers WHERE id=${Number(req.params.id)} AND company_id=${a.companyId}`); res.json({ ok: true });
  }));

  app.get("/api/v1/company/inventory/items", route(async (req, res) => {
    const a = await requireModule(req, res, "inventory"); if (!a) return;
    res.json((await db.execute(sql`
      SELECT i.*, s.name supplier_name, COALESCE(l.stock,0) stock,
             (i.track_stock AND COALESCE(l.stock,0) <= i.low_stock_threshold) low_stock
      FROM bridge_inventory_items i
      LEFT JOIN bridge_suppliers s ON s.id=i.supplier_id
      LEFT JOIN (SELECT item_id, SUM(quantity) stock FROM bridge_stock_levels GROUP BY item_id) l ON l.item_id=i.id
      WHERE i.company_id=${a.companyId} ORDER BY i.active DESC, i.name`)).rows || []);
  }));
  app.post("/api/v1/company/inventory/items", route(async (req, res) => {
    const a = await requireModule(req, res, "inventory", true); if (!a) return;
    const name = String(req.body?.name || "").trim(); if (!name) return res.status(400).json({ message: "Item name is required" });
    res.status(201).json((await db.execute(sql`INSERT INTO bridge_inventory_items (company_id, sku, name, category, unit, cost_price, sell_price, track_stock, low_stock_threshold, supplier_id)
      VALUES (${a.companyId}, ${req.body?.sku || null}, ${name}, ${req.body?.category || null}, ${req.body?.unit || "unit"}, ${Number(req.body?.costPrice) || 0}, ${Number(req.body?.sellPrice) || 0}, ${req.body?.trackStock !== false}, ${Number(req.body?.lowStockThreshold) || 0}, ${req.body?.supplierId || null}) RETURNING *`)).rows[0]);
  }));
  app.put("/api/v1/company/inventory/items/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "inventory", true); if (!a) return;
    const r = await db.execute(sql`UPDATE bridge_inventory_items SET
      sku=${req.body?.sku ?? null}, name=COALESCE(${req.body?.name ?? null},name), category=${req.body?.category ?? null}, unit=COALESCE(${req.body?.unit ?? null},unit),
      cost_price=COALESCE(${req.body?.costPrice ?? null},cost_price), sell_price=COALESCE(${req.body?.sellPrice ?? null},sell_price),
      track_stock=COALESCE(${req.body?.trackStock ?? null},track_stock), low_stock_threshold=COALESCE(${req.body?.lowStockThreshold ?? null},low_stock_threshold),
      supplier_id=${req.body?.supplierId ?? null}, active=COALESCE(${req.body?.active ?? null},active), updated_at=now()
      WHERE id=${Number(req.params.id)} AND company_id=${a.companyId} RETURNING *`);
    if (!r.rows.length) return res.status(404).json({ message: "Item not found" }); res.json(r.rows[0]);
  }));
  app.delete("/api/v1/company/inventory/items/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "inventory", true); if (!a) return;
    await db.execute(sql`DELETE FROM bridge_inventory_items WHERE id=${Number(req.params.id)} AND company_id=${a.companyId}`);
    await db.execute(sql`DELETE FROM bridge_stock_levels WHERE item_id=${Number(req.params.id)}`);
    res.json({ ok: true });
  }));

  // Recipe / BOM: which inventory items a POS product consumes when sold
  app.get("/api/v1/company/inventory/recipe/:productId", route(async (req, res) => {
    const a = await requireModule(req, res, "inventory"); if (!a) return;
    res.json((await db.execute(sql`SELECT r.id, r.item_id, r.qty, i.name item_name, i.unit FROM bridge_product_recipes r JOIN bridge_inventory_items i ON i.id=r.item_id WHERE r.company_id=${a.companyId} AND r.product_id=${Number(req.params.productId)} ORDER BY r.id`)).rows || []);
  }));
  app.post("/api/v1/company/inventory/recipe/:productId", route(async (req, res) => {
    const a = await requireModule(req, res, "inventory", true); if (!a) return;
    const itemId = Number(req.body?.itemId); const qty = Number(req.body?.qty) || 0;
    if (!itemId || !(qty > 0)) return res.status(400).json({ message: "Item and a positive quantity are required" });
    res.status(201).json((await db.execute(sql`INSERT INTO bridge_product_recipes (company_id, product_id, item_id, qty) VALUES (${a.companyId}, ${Number(req.params.productId)}, ${itemId}, ${qty}) RETURNING *`)).rows[0]);
  }));
  app.delete("/api/v1/company/inventory/recipe/line/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "inventory", true); if (!a) return;
    await db.execute(sql`DELETE FROM bridge_product_recipes WHERE id=${Number(req.params.id)} AND company_id=${a.companyId}`); res.json({ ok: true });
  }));
  app.post("/api/v1/company/inventory/adjust", route(async (req, res) => {
    const a = await requireModule(req, res, "inventory", true); if (!a) return;
    const itemId = Number(req.body?.itemId); const delta = Number(req.body?.quantity);
    const branchId = Number(req.body?.branchId) || 0; const type = String(req.body?.type || "adjust");
    if (!itemId || !Number.isFinite(delta) || delta === 0) return res.status(400).json({ message: "Item and a non-zero quantity are required" });
    const owns = (await db.execute(sql`SELECT id FROM bridge_inventory_items WHERE id=${itemId} AND company_id=${a.companyId} LIMIT 1`)).rows;
    if (!owns.length) return res.status(404).json({ message: "Item not found" });
    await db.execute(sql`INSERT INTO bridge_stock_levels (company_id, item_id, branch_id, quantity, updated_at) VALUES (${a.companyId}, ${itemId}, ${branchId}, ${delta}, now())
      ON CONFLICT (item_id, branch_id) DO UPDATE SET quantity=bridge_stock_levels.quantity + ${delta}, updated_at=now()`);
    await db.execute(sql`INSERT INTO bridge_stock_movements (company_id, item_id, branch_id, type, quantity, unit_cost, reference, note, user_id) VALUES (${a.companyId}, ${itemId}, ${branchId}, ${type}, ${delta}, ${Number(req.body?.unitCost) || 0}, ${req.body?.reference || null}, ${req.body?.note || null}, ${a.user.id})`);
    const [level] = (await db.execute(sql`SELECT COALESCE(SUM(quantity),0) stock FROM bridge_stock_levels WHERE item_id=${itemId}`)).rows as any[];
    res.json({ ok: true, stock: Number(level?.stock || 0) });
  }));
  app.get("/api/v1/company/inventory/movements", route(async (req, res) => {
    const a = await requireModule(req, res, "inventory"); if (!a) return;
    const itemId = Number(req.query.itemId) || 0;
    const rows = itemId
      ? (await db.execute(sql`SELECT m.*, i.name item_name FROM bridge_stock_movements m JOIN bridge_inventory_items i ON i.id=m.item_id WHERE m.company_id=${a.companyId} AND m.item_id=${itemId} ORDER BY m.id DESC LIMIT 200`)).rows
      : (await db.execute(sql`SELECT m.*, i.name item_name FROM bridge_stock_movements m JOIN bridge_inventory_items i ON i.id=m.item_id WHERE m.company_id=${a.companyId} ORDER BY m.id DESC LIMIT 200`)).rows;
    res.json(rows || []);
  }));

  app.get("/api/v1/company/inventory/purchase-orders", route(async (req, res) => {
    const a = await requireModule(req, res, "purchasing"); if (!a) return;
    res.json((await db.execute(sql`SELECT p.*, s.name supplier_name, (SELECT COUNT(*) FROM bridge_purchase_order_items pi WHERE pi.po_id=p.id) item_count FROM bridge_purchase_orders p LEFT JOIN bridge_suppliers s ON s.id=p.supplier_id WHERE p.company_id=${a.companyId} ORDER BY p.id DESC LIMIT 200`)).rows || []);
  }));
  app.get("/api/v1/company/inventory/purchase-orders/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "purchasing"); if (!a) return;
    const id = Number(req.params.id);
    const [po] = (await db.execute(sql`SELECT p.*, s.name supplier_name FROM bridge_purchase_orders p LEFT JOIN bridge_suppliers s ON s.id=p.supplier_id WHERE p.id=${id} AND p.company_id=${a.companyId} LIMIT 1`)).rows as any[];
    if (!po) return res.status(404).json({ message: "PO not found" });
    const items = (await db.execute(sql`SELECT pi.*, i.name item_name, i.unit FROM bridge_purchase_order_items pi JOIN bridge_inventory_items i ON i.id=pi.item_id WHERE pi.po_id=${id}`)).rows;
    res.json({ ...po, items });
  }));
  app.post("/api/v1/company/inventory/purchase-orders", route(async (req, res) => {
    const a = await requireModule(req, res, "purchasing", true); if (!a) return;
    const items = Array.isArray(req.body?.items) ? req.body.items.filter((x: any) => Number(x.itemId) && Number(x.quantity) > 0) : [];
    if (!items.length) return res.status(400).json({ message: "Add at least one line item" });
    const total = items.reduce((sum: number, x: any) => sum + Number(x.quantity) * Number(x.unitCost || 0), 0);
    const branchId = Number(req.body?.branchId) || 0;
    const [po] = (await db.execute(sql`INSERT INTO bridge_purchase_orders (company_id, supplier_id, branch_id, status, total, note, created_by) VALUES (${a.companyId}, ${req.body?.supplierId || null}, ${branchId}, 'ordered', ${total}, ${req.body?.note || null}, ${a.user.id}) RETURNING *`)).rows as any[];
    for (const x of items) await db.execute(sql`INSERT INTO bridge_purchase_order_items (po_id, item_id, quantity, unit_cost) VALUES (${po.id}, ${Number(x.itemId)}, ${Number(x.quantity)}, ${Number(x.unitCost) || 0})`);
    res.status(201).json(po);
  }));
  app.post("/api/v1/company/inventory/purchase-orders/:id/receive", route(async (req, res) => {
    const a = await requireModule(req, res, "purchasing", true); if (!a) return;
    const id = Number(req.params.id);
    const [po] = (await db.execute(sql`SELECT * FROM bridge_purchase_orders WHERE id=${id} AND company_id=${a.companyId} LIMIT 1`)).rows as any[];
    if (!po) return res.status(404).json({ message: "PO not found" });
    if (po.status === "received") return res.status(400).json({ message: "This purchase order is already received" });
    if (po.status === "cancelled") return res.status(400).json({ message: "This purchase order was cancelled" });
    const items = (await db.execute(sql`SELECT * FROM bridge_purchase_order_items WHERE po_id=${id}`)).rows as any[];
    for (const it of items) {
      const qty = Number(it.quantity);
      await db.execute(sql`INSERT INTO bridge_stock_levels (company_id, item_id, branch_id, quantity, updated_at) VALUES (${a.companyId}, ${it.item_id}, ${po.branch_id}, ${qty}, now())
        ON CONFLICT (item_id, branch_id) DO UPDATE SET quantity=bridge_stock_levels.quantity + ${qty}, updated_at=now()`);
      await db.execute(sql`INSERT INTO bridge_stock_movements (company_id, item_id, branch_id, type, quantity, unit_cost, reference, user_id) VALUES (${a.companyId}, ${it.item_id}, ${po.branch_id}, 'purchase', ${qty}, ${Number(it.unit_cost) || 0}, ${"PO#" + id}, ${a.user.id})`);
      await db.execute(sql`UPDATE bridge_purchase_order_items SET received_qty=quantity WHERE id=${it.id}`);
      if (Number(it.unit_cost) > 0) await db.execute(sql`UPDATE bridge_inventory_items SET cost_price=${Number(it.unit_cost)}, updated_at=now() WHERE id=${it.item_id} AND company_id=${a.companyId}`);
    }
    const [updated] = (await db.execute(sql`UPDATE bridge_purchase_orders SET status='received', received_at=now() WHERE id=${id} RETURNING *`)).rows as any[];
    res.json(updated);
  }));
  app.patch("/api/v1/company/inventory/purchase-orders/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "purchasing", true); if (!a) return;
    const status = String(req.body?.status || ""); if (!["cancelled", "ordered", "draft"].includes(status)) return res.status(400).json({ message: "Invalid status" });
    const r = await db.execute(sql`UPDATE bridge_purchase_orders SET status=${status} WHERE id=${Number(req.params.id)} AND company_id=${a.companyId} AND status<>'received' RETURNING *`);
    if (!r.rows.length) return res.status(404).json({ message: "PO not found or already received" }); res.json(r.rows[0]);
  }));

  // ── CRM module ────────────────────────────────────────────────────────────
  app.get("/api/v1/company/crm/customers", route(async (req, res) => {
    const a = await requireModule(req, res, "crm"); if (!a) return;
    const q = `%${String(req.query.q || "").trim()}%`;
    const rows = (await db.execute(sql`
      SELECT *,
        (total_spend >= 5000000) is_vip,
        (created_at > now() - interval '30 days') is_new,
        (last_visit_at IS NOT NULL AND last_visit_at < now() - interval '90 days') is_lost,
        (birthday IS NOT NULL AND substring(birthday from 6 for 2) = to_char(now(),'MM')) is_birthday
      FROM bridge_customers
      WHERE company_id=${a.companyId} AND (${String(req.query.q || "").trim() === ""} OR name ILIKE ${q} OR phone ILIKE ${q} OR email ILIKE ${q})
      ORDER BY last_visit_at DESC NULLS LAST, id DESC LIMIT 500`)).rows || [];
    res.json(rows);
  }));
  app.get("/api/v1/company/crm/segments", route(async (req, res) => {
    const a = await requireModule(req, res, "crm"); if (!a) return;
    const [row] = (await db.execute(sql`SELECT
      COUNT(*) total,
      COUNT(*) FILTER (WHERE total_spend >= 5000000) vip,
      COUNT(*) FILTER (WHERE created_at > now() - interval '30 days') new,
      COUNT(*) FILTER (WHERE last_visit_at IS NOT NULL AND last_visit_at < now() - interval '90 days') lost,
      COUNT(*) FILTER (WHERE last_visit_at >= now() - interval '30 days') active,
      COUNT(*) FILTER (WHERE birthday IS NOT NULL AND substring(birthday from 6 for 2) = to_char(now(),'MM')) birthday
      FROM bridge_customers WHERE company_id=${a.companyId}`)).rows as any[];
    res.json(row || {});
  }));
  app.post("/api/v1/company/crm/customers", route(async (req, res) => {
    const a = await requireModule(req, res, "crm", true); if (!a) return;
    const name = String(req.body?.name || "").trim(); if (!name) return res.status(400).json({ message: "Customer name is required" });
    const tags = Array.isArray(req.body?.tags) ? req.body.tags : [];
    res.status(201).json((await db.execute(sql`INSERT INTO bridge_customers (company_id, name, phone, email, birthday, gender, tags, note) VALUES (${a.companyId}, ${name}, ${req.body?.phone || null}, ${req.body?.email || null}, ${req.body?.birthday || null}, ${req.body?.gender || null}, ${JSON.stringify(tags)}::jsonb, ${req.body?.note || null}) RETURNING *`)).rows[0]);
  }));
  app.put("/api/v1/company/crm/customers/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "crm", true); if (!a) return;
    const tags = req.body?.tags !== undefined ? JSON.stringify(Array.isArray(req.body.tags) ? req.body.tags : []) : null;
    const r = await db.execute(sql`UPDATE bridge_customers SET name=COALESCE(${req.body?.name ?? null},name), phone=${req.body?.phone ?? null}, email=${req.body?.email ?? null}, birthday=${req.body?.birthday ?? null}, gender=${req.body?.gender ?? null}, tags=COALESCE(${tags}::jsonb,tags), note=${req.body?.note ?? null}, updated_at=now() WHERE id=${Number(req.params.id)} AND company_id=${a.companyId} RETURNING *`);
    if (!r.rows.length) return res.status(404).json({ message: "Customer not found" }); res.json(r.rows[0]);
  }));
  app.delete("/api/v1/company/crm/customers/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "crm", true); if (!a) return;
    await db.execute(sql`DELETE FROM bridge_customers WHERE id=${Number(req.params.id)} AND company_id=${a.companyId}`); res.json({ ok: true });
  }));
  app.post("/api/v1/company/crm/customers/:id/visit", route(async (req, res) => {
    const a = await requireModule(req, res, "crm", true); if (!a) return;
    const amount = Number(req.body?.amount) || 0;
    const r = await db.execute(sql`UPDATE bridge_customers SET total_spend=total_spend + ${amount}, visit_count=visit_count + 1, last_visit_at=now(), updated_at=now() WHERE id=${Number(req.params.id)} AND company_id=${a.companyId} RETURNING *`);
    if (!r.rows.length) return res.status(404).json({ message: "Customer not found" }); res.json(r.rows[0]);
  }));
  app.post("/api/v1/company/crm/customers/:id/wallet", route(async (req, res) => {
    const a = await requireModule(req, res, "crm", true); if (!a) return;
    const wallet = Number(req.body?.walletDelta) || 0; const credit = Number(req.body?.creditDelta) || 0;
    const r = await db.execute(sql`UPDATE bridge_customers SET wallet_balance=wallet_balance + ${wallet}, store_credit=store_credit + ${credit}, updated_at=now() WHERE id=${Number(req.params.id)} AND company_id=${a.companyId} RETURNING *`);
    if (!r.rows.length) return res.status(404).json({ message: "Customer not found" }); res.json(r.rows[0]);
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
    const chosen = Array.isArray(req.body?.modules) ? req.body.modules.filter((key: string) => BRIDGEX_MODULES.includes(key as any)) : [];
    const selected = Array.from(new Set([...chosen, ...CORE_MODULES])); // core cannot be turned off
    await db.delete(bridgeCompanyModules).where(eq(bridgeCompanyModules.companyId, access.companyId));
    if (selected.length) await db.insert(bridgeCompanyModules).values(selected.map((moduleKey: string) => ({ companyId: access.companyId, moduleKey })));
    res.json({ modules: selected });
  }));

  // Per-branch business types. A branch can run any subset of the company's modules;
  // no rows means it inherits everything the company has enabled.
  app.get("/api/v1/company/branch-modules", route(async (req, res) => {
    const access = await companyAccess(req, res); if (!access) return;
    const branchId = Number(req.query.branchId) || 0;
    const companyKeys = (await db.select().from(bridgeCompanyModules).where(and(eq(bridgeCompanyModules.companyId, access.companyId), eq(bridgeCompanyModules.enabled, true)))).map((m) => m.moduleKey);
    if (!branchId) return res.json({ branchId: 0, configured: false, modules: companyKeys });
    const rows = (await db.execute(sql`SELECT module_key FROM bridge_branch_modules WHERE branch_id=${branchId} AND company_id=${access.companyId}`)).rows as any[];
    if (!rows.length) return res.json({ branchId, configured: false, modules: companyKeys });
    const keys = rows.map((r) => r.module_key).filter((k) => companyKeys.includes(k));
    res.json({ branchId, configured: true, modules: keys });
  }));
  app.put("/api/v1/company/branch-modules", route(async (req, res) => {
    const access = await companyAccess(req, res, true); if (!access) return;
    const branchId = Number(req.body?.branchId); if (!branchId) return res.status(400).json({ message: "branchId is required" });
    const selected = Array.isArray(req.body?.modules) ? req.body.modules.filter((k: string) => (BRIDGEX_MODULES as string[]).includes(k)) : [];
    await db.execute(sql`DELETE FROM bridge_branch_modules WHERE branch_id=${branchId} AND company_id=${access.companyId}`);
    for (const k of selected) await db.execute(sql`INSERT INTO bridge_branch_modules (company_id, branch_id, module_key) VALUES (${access.companyId}, ${branchId}, ${k}) ON CONFLICT DO NOTHING`);
    res.json({ branchId, configured: selected.length > 0, modules: selected });
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
    const [product] = await db.insert(posProducts).values({ companyId: access.companyId, branchId: req.body?.branchId || access.branchId, name: req.body.name, category: req.body?.category || "General", price: String(req.body?.price || 0), cost: String(req.body?.cost || 0), stock: Number(req.body?.stock || 0), imageUrl: req.body?.imageUrl || null, station: req.body?.station || null }).returning();
    res.status(201).json(product);
  }));
  app.patch("/api/v1/company/pos/products/:id", route(async (req, res) => {
    const access = await companyAccess(req, res, true); if (!access) return;
    const update: any = {}; for (const key of ["name", "category", "price", "cost", "stock", "imageUrl", "active", "sortOrder", "branchId", "station", "stallId"]) if (req.body?.[key] !== undefined) update[key] = req.body[key];
    const [product] = await db.update(posProducts).set(update).where(and(eq(posProducts.id, Number(req.params.id)), eq(posProducts.companyId, access.companyId))).returning();
    if (!product) return res.status(404).json({ message: "Product not found" }); res.json(product);
  }));
  app.get("/api/v1/company/pos/tickets", route(async (req, res) => {
    const access = await companyAccess(req, res); if (!access) return;
    const status = String(req.query.status || ""); const bid = requestedBranchId(req);
    const parts = [eq(posTickets.companyId, access.companyId)];
    if (status) parts.push(eq(posTickets.status, status));
    if (bid) parts.push(eq(posTickets.branchId, bid));
    res.json(await db.select().from(posTickets).where(and(...parts)).orderBy(desc(posTickets.id)).limit(200));
  }));
  app.get("/api/v1/company/pos/tickets/:id", route(async (req, res) => {
    const access = await companyAccess(req, res); if (!access) return;
    const id = Number(req.params.id);
    const [ticket] = await db.select().from(posTickets).where(and(eq(posTickets.id, id), eq(posTickets.companyId, access.companyId))).limit(1);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    const its = await db.select().from(posTicketItems).where(eq(posTicketItems.orderId, id));
    const pays = await db.select().from(bridgePayments).where(eq(bridgePayments.ticketId, id));
    res.json({ ...ticket, items: its, payments: pays });
  }));
  app.post("/api/v1/company/pos/tickets", route(async (req, res) => {
    const access = await companyAccess(req, res); if (!access) return;
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ message: "At least one item required" });
    const productIds = items.map((item:any) => Number(item.productId)).filter(Boolean);
    const products = productIds.length ? await db.select().from(posProducts).where(and(eq(posProducts.companyId, access.companyId), inArray(posProducts.id, productIds))) : [];
    const lines = items.map((item:any) => { const product = products.find((row) => row.id === Number(item.productId)); if (!product) throw new Error("A product does not belong to this company"); const qty = Math.max(1, Number(item.qty || 1)); return { product, qty, total: Number(product.price) * qty }; });
    const subtotal = lines.reduce((sum:number, line:any) => sum + line.total, 0);
    const discount = Math.max(0, Number(req.body?.discount || 0));
    const tax = Math.max(0, Number(req.body?.tax || 0));
    const serviceCharge = Math.max(0, Number(req.body?.serviceCharge ?? req.body?.serviceFee ?? 0));
    const tip = Math.max(0, Number(req.body?.tip || 0));
    const total = Math.max(0, subtotal - discount + tax + serviceCharge);
    const due = total + tip;
    // Payments: an array of tenders (split/partial) or a legacy single paymentMethod.
    let payments = Array.isArray(req.body?.payments)
      ? req.body.payments.map((p:any) => ({ method: String(p.method || "cash"), amount: Math.max(0, Number(p.amount || 0)), reference: p.reference || null })).filter((p:any) => p.amount > 0)
      : [];
    if (!payments.length && req.body?.paymentMethod) payments = [{ method: String(req.body.paymentMethod), amount: due, reference: req.body?.paymentReference || null }];
    const paidTotal = payments.reduce((s:number, p:any) => s + p.amount, 0);
    const cashPaid = payments.filter((p:any) => p.method === "cash").reduce((s:number, p:any) => s + p.amount, 0);
    const changeGiven = Math.max(0, paidTotal - due);
    const status = (paidTotal >= due && due > 0) ? "paid" : paidTotal > 0 ? "partial" : "open";
    const [ticket] = await db.insert(posTickets).values({
      companyId: access.companyId, branchId: req.body?.branchId || access.branchId,
      orderNo: `BX-${Date.now().toString(36).toUpperCase()}`, source: req.body?.source || "pos", status,
      subtotal: String(subtotal), discount: String(discount), tax: String(tax), serviceFee: String(serviceCharge), tip: String(tip),
      total: String(total), paidTotal: String(Math.min(paidTotal, due)),
      paymentMethod: payments.length === 1 ? payments[0].method : payments.length > 1 ? "split" : null,
      cashReceived: cashPaid ? String(cashPaid) : null, changeGiven: changeGiven ? String(changeGiven) : null,
      customerId: req.body?.customerId ? Number(req.body.customerId) : null,
      tableNumber: req.body?.tableNumber || null, orderMode: req.body?.orderMode || "dine_in",
      staffId: access.user.id, salesStaffId: req.body?.salesStaffId || access.user.id, paidAt: status === "paid" ? new Date() : null,
    }).returning();
    await db.insert(posTicketItems).values(lines.map((line:any) => ({ orderId: ticket.id, productId: line.product.id, name: line.product.name, price: line.product.price, qty: line.qty, lineTotal: String(line.total), source: req.body?.source || "pos", station: stationFor(line.product.category, line.product.station) })));
    if (payments.length) await db.insert(bridgePayments).values(payments.map((p:any) => ({ companyId: access.companyId, ticketId: ticket.id, method: p.method, amount: String(p.amount), reference: p.reference, createdBy: access.user.id })));
    for (const line of lines) await db.update(posProducts).set({ stock: sql`${posProducts.stock} - ${line.qty}` }).where(and(eq(posProducts.id, line.product.id), eq(posProducts.companyId, access.companyId)));
    await maybeDeductRecipes(access.companyId, lines, access.user.id);
    if (ticket.customerId && (status === "paid" || status === "partial") && await moduleEnabled(access.companyId, "crm")) {
      await db.execute(sql`UPDATE bridge_customers SET total_spend=total_spend + ${total}, visit_count=visit_count + 1, last_visit_at=now(), updated_at=now() WHERE id=${ticket.customerId} AND company_id=${access.companyId}`);
    }
    const kitchenResult = await db.execute(sql`SELECT DISTINCT m.user_id FROM bridge_company_members m LEFT JOIN bridge_positions p ON p.id=m.position_id WHERE m.company_id=${access.companyId} AND m.status='active' AND (p.code IN ('chef','kitchen') OR m.role IN ('owner','admin','manager'))`);
    const kitchenIds = ((kitchenResult.rows || kitchenResult) as any[]).map((row) => row.user_id);
    await sendBridgeXNotifications(access.companyId, kitchenIds, { type: "new_order", title: `New order ${ticket.orderNo}`, body: `${lines.length} item${lines.length === 1 ? "" : "s"}${ticket.tableNumber ? ` · Table ${ticket.tableNumber}` : ""}`, data: { ticketId: ticket.id } });
    const lowStock = lines.filter((line:any) => Number(line.product.stock) - line.qty <= 5).map((line:any) => line.product.name);
    if (lowStock.length) await sendBridgeXNotifications(access.companyId, kitchenIds, { type: "low_stock", title: "Low stock warning", body: lowStock.slice(0, 4).join(", "), data: { productIds: lines.filter((line:any) => lowStock.includes(line.product.name)).map((line:any) => line.product.id) } });
    res.status(201).json(ticket);
  }));
  app.post("/api/v1/company/pos/tickets/:id/refund", route(async (req, res) => {
    const access = await companyAccess(req, res, true); if (!access) return;
    const id = Number(req.params.id);
    const [t] = await db.select().from(posTickets).where(and(eq(posTickets.id, id), eq(posTickets.companyId, access.companyId))).limit(1);
    if (!t) return res.status(404).json({ message: "Ticket not found" });
    if (t.status === "refunded" || t.status === "voided") return res.status(400).json({ message: "This ticket is already refunded or voided" });
    const paid = Number(t.paidTotal || 0);
    const amount = req.body?.amount != null ? Math.min(Math.max(0, Number(req.body.amount)), paid) : paid;
    if (!(amount > 0)) return res.status(400).json({ message: "Nothing to refund" });
    const newPaid = Math.max(0, paid - amount); const full = newPaid <= 0;
    await db.insert(bridgePayments).values({ companyId: access.companyId, ticketId: id, method: String(req.body?.method || t.paymentMethod || "cash"), amount: String(amount), reference: req.body?.reference || null, isRefund: true, createdBy: access.user.id });
    await db.update(posTickets).set({ paidTotal: String(newPaid), status: full ? "refunded" : t.status, refundReason: String(req.body?.reason || t.refundReason || ""), refundedBy: access.user.id, refundedAt: new Date() }).where(eq(posTickets.id, id));
    const restock = req.body?.restock ?? full;
    if (restock) { const its = await db.select().from(posTicketItems).where(eq(posTicketItems.orderId, id)); for (const it of its) if (it.productId) await db.update(posProducts).set({ stock: sql`${posProducts.stock} + ${it.qty}` }).where(and(eq(posProducts.id, it.productId), eq(posProducts.companyId, access.companyId))); }
    if (t.customerId && await moduleEnabled(access.companyId, "crm")) await db.execute(sql`UPDATE bridge_customers SET total_spend=GREATEST(0, total_spend - ${amount}), updated_at=now() WHERE id=${t.customerId} AND company_id=${access.companyId}`);
    res.json({ ok: true, refunded: amount, status: full ? "refunded" : t.status });
  }));
  app.post("/api/v1/company/pos/tickets/:id/void", route(async (req, res) => {
    const access = await companyAccess(req, res, true); if (!access) return;
    const id = Number(req.params.id);
    const [t] = await db.select().from(posTickets).where(and(eq(posTickets.id, id), eq(posTickets.companyId, access.companyId))).limit(1);
    if (!t) return res.status(404).json({ message: "Ticket not found" });
    if (t.status === "voided") return res.status(400).json({ message: "Already voided" });
    const its = await db.select().from(posTicketItems).where(eq(posTicketItems.orderId, id));
    for (const it of its) if (it.productId) await db.update(posProducts).set({ stock: sql`${posProducts.stock} + ${it.qty}` }).where(and(eq(posProducts.id, it.productId), eq(posProducts.companyId, access.companyId)));
    await db.update(posTickets).set({ status: "voided", voidReason: String(req.body?.reason || ""), voidedBy: access.user.id, voidedAt: new Date() }).where(eq(posTickets.id, id));
    if (t.customerId && Number(t.total) > 0 && await moduleEnabled(access.companyId, "crm")) await db.execute(sql`UPDATE bridge_customers SET total_spend=GREATEST(0, total_spend - ${Number(t.total)}), updated_at=now() WHERE id=${t.customerId} AND company_id=${access.companyId}`);
    res.json({ ok: true, status: "voided" });
  }));
  // Append items to a running tab (table service / register hold), fires to KDS.
  app.post("/api/v1/company/pos/tickets/:id/items", route(async (req, res) => {
    const access = await companyAccess(req, res); if (!access) return;
    const id = Number(req.params.id);
    const [t] = await db.select().from(posTickets).where(and(eq(posTickets.id, id), eq(posTickets.companyId, access.companyId))).limit(1);
    if (!t) return res.status(404).json({ message: "Ticket not found" });
    if (["paid", "refunded", "voided"].includes(t.status)) return res.status(400).json({ message: "This ticket is closed" });
    const lines = await appendTicketItems(access.companyId, id, Array.isArray(req.body?.items) ? req.body.items : [], req.body?.source || "pos");
    await notifyKitchen(access.companyId, t, lines);
    emitCompanyChange(access.companyId, "kds");
    res.json((await db.select().from(posTickets).where(eq(posTickets.id, id)).limit(1))[0]);
  }));
  // Settle (finalise) an open ticket with payments; frees any table it occupies.
  app.post("/api/v1/company/pos/tickets/:id/settle", route(async (req, res) => {
    const access = await companyAccess(req, res); if (!access) return;
    const id = Number(req.params.id);
    const [t] = await db.select().from(posTickets).where(and(eq(posTickets.id, id), eq(posTickets.companyId, access.companyId))).limit(1);
    if (!t) return res.status(404).json({ message: "Ticket not found" });
    if (["paid", "refunded", "voided"].includes(t.status)) return res.status(400).json({ message: "This ticket is already settled" });
    const discount = Math.max(0, Number(req.body?.discount ?? t.discount));
    const tax = Math.max(0, Number(req.body?.tax ?? t.tax));
    const serviceCharge = Math.max(0, Number(req.body?.serviceCharge ?? t.serviceFee));
    const tip = Math.max(0, Number(req.body?.tip ?? t.tip));
    const its = await db.select().from(posTicketItems).where(eq(posTicketItems.orderId, id));
    const subtotal = its.reduce((s, i) => s + Number(i.lineTotal), 0);
    const total = Math.max(0, subtotal - discount + tax + serviceCharge);
    const due = total + tip;
    let payments = Array.isArray(req.body?.payments) ? req.body.payments.map((p: any) => ({ method: String(p.method || "cash"), amount: Math.max(0, Number(p.amount || 0)), reference: p.reference || null })).filter((p: any) => p.amount > 0) : [];
    if (!payments.length && req.body?.paymentMethod) payments = [{ method: String(req.body.paymentMethod), amount: due, reference: null }];
    const paidTotal = payments.reduce((s: number, p: any) => s + p.amount, 0);
    const cashPaid = payments.filter((p: any) => p.method === "cash").reduce((s: number, p: any) => s + p.amount, 0);
    const change = Math.max(0, paidTotal - due);
    const status = (paidTotal >= due && due > 0) ? "paid" : paidTotal > 0 ? "partial" : "open";
    if (payments.length) await db.insert(bridgePayments).values(payments.map((p: any) => ({ companyId: access.companyId, ticketId: id, method: p.method, amount: String(p.amount), reference: p.reference, createdBy: access.user.id })));
    const customerId = req.body?.customerId != null ? Number(req.body.customerId) : t.customerId;
    await db.update(posTickets).set({ discount: String(discount), tax: String(tax), serviceFee: String(serviceCharge), tip: String(tip), subtotal: String(subtotal), total: String(total), paidTotal: String(Math.min(paidTotal, due)), paymentMethod: payments.length === 1 ? payments[0].method : payments.length > 1 ? "split" : t.paymentMethod, cashReceived: cashPaid ? String(cashPaid) : null, changeGiven: change ? String(change) : null, customerId, status, paidAt: status === "paid" ? new Date() : null }).where(eq(posTickets.id, id));
    if (status === "paid") {
      await db.execute(sql`UPDATE bridge_tables SET status='available', current_ticket_id=NULL WHERE current_ticket_id=${id} AND company_id=${access.companyId}`);
      if (customerId && await moduleEnabled(access.companyId, "crm")) await db.execute(sql`UPDATE bridge_customers SET total_spend=total_spend + ${total}, visit_count=visit_count + 1, last_visit_at=now(), updated_at=now() WHERE id=${customerId} AND company_id=${access.companyId}`);
    }
    res.json((await db.select().from(posTickets).where(eq(posTickets.id, id)).limit(1))[0]);
  }));

  // ── Restaurant: tables & floor plan ───────────────────────────────────────
  app.get("/api/v1/company/restaurant/tables", route(async (req, res) => {
    const a = await requireModule(req, res, "restaurant"); if (!a) return;
    res.json((await db.execute(sql`SELECT t.*, tk.total open_total, tk.order_no open_order_no, tk.status open_status, (SELECT COUNT(*) FROM pos_ticket_items pi WHERE pi.order_id=t.current_ticket_id) open_items FROM bridge_tables t LEFT JOIN pos_tickets tk ON tk.id=t.current_ticket_id WHERE t.company_id=${a.companyId} ${branchClause(req, "t.branch_id")} ORDER BY t.sort, t.name`)).rows || []);
  }));
  app.post("/api/v1/company/restaurant/tables", route(async (req, res) => {
    const a = await requireModule(req, res, "restaurant", true); if (!a) return;
    const name = String(req.body?.name || "").trim(); if (!name) return res.status(400).json({ message: "Table name/number is required" });
    res.status(201).json((await db.execute(sql`INSERT INTO bridge_tables (company_id, name, area, seats, qr_token) VALUES (${a.companyId}, ${name}, ${req.body?.area || null}, ${Number(req.body?.seats) || 2}, ${randomToken()}) RETURNING *`)).rows[0]);
  }));
  app.put("/api/v1/company/restaurant/tables/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "restaurant", true); if (!a) return;
    const r = await db.execute(sql`UPDATE bridge_tables SET name=COALESCE(${req.body?.name ?? null},name), area=${req.body?.area ?? null}, seats=COALESCE(${req.body?.seats ?? null},seats), status=COALESCE(${req.body?.status ?? null},status), sort=COALESCE(${req.body?.sort ?? null},sort) WHERE id=${Number(req.params.id)} AND company_id=${a.companyId} RETURNING *`);
    if (!r.rows.length) return res.status(404).json({ message: "Table not found" }); res.json(r.rows[0]);
  }));
  app.delete("/api/v1/company/restaurant/tables/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "restaurant", true); if (!a) return;
    await db.execute(sql`DELETE FROM bridge_tables WHERE id=${Number(req.params.id)} AND company_id=${a.companyId}`); res.json({ ok: true });
  }));
  app.get("/api/v1/company/restaurant/tables/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "restaurant"); if (!a) return;
    const [tbl] = (await db.execute(sql`SELECT * FROM bridge_tables WHERE id=${Number(req.params.id)} AND company_id=${a.companyId} LIMIT 1`)).rows as any[];
    if (!tbl) return res.status(404).json({ message: "Table not found" });
    let ticket: any = null;
    if (tbl.current_ticket_id) { const [t] = await db.select().from(posTickets).where(eq(posTickets.id, tbl.current_ticket_id)).limit(1); if (t) { const items = await db.select().from(posTicketItems).where(eq(posTicketItems.orderId, t.id)); ticket = { ...t, items }; } }
    res.json({ ...tbl, ticket });
  }));
  app.post("/api/v1/company/restaurant/tables/:id/open", route(async (req, res) => {
    const a = await requireModule(req, res, "restaurant"); if (!a) return;
    const [tbl] = (await db.execute(sql`SELECT * FROM bridge_tables WHERE id=${Number(req.params.id)} AND company_id=${a.companyId} LIMIT 1`)).rows as any[];
    if (!tbl) return res.status(404).json({ message: "Table not found" });
    if (tbl.current_ticket_id) { const [t] = await db.select().from(posTickets).where(eq(posTickets.id, tbl.current_ticket_id)).limit(1); if (t && !["paid", "refunded", "voided"].includes(t.status)) return res.json(t); }
    const [ticket] = await db.insert(posTickets).values({ companyId: a.companyId, branchId: tbl.branch_id || a.branchId, orderNo: `BX-${Date.now().toString(36).toUpperCase()}`, source: "pos", status: "open", tableNumber: tbl.name, orderMode: "dine_in", staffId: a.user.id, salesStaffId: a.user.id }).returning();
    await db.execute(sql`UPDATE bridge_tables SET status='occupied', current_ticket_id=${ticket.id} WHERE id=${tbl.id}`);
    res.status(201).json(ticket);
  }));
  app.post("/api/v1/company/restaurant/tables/:id/close", route(async (req, res) => {
    const a = await requireModule(req, res, "restaurant", true); if (!a) return;
    await db.execute(sql`UPDATE bridge_tables SET status='available', current_ticket_id=NULL WHERE id=${Number(req.params.id)} AND company_id=${a.companyId}`); res.json({ ok: true });
  }));
  app.get("/api/v1/company/restaurant/tables/:id/qr", route(async (req, res) => {
    const a = await requireModule(req, res, "restaurant", true); if (!a) return;
    const [tbl] = (await db.execute(sql`SELECT * FROM bridge_tables WHERE id=${Number(req.params.id)} AND company_id=${a.companyId} LIMIT 1`)).rows as any[];
    if (!tbl?.qr_token) return res.status(404).json({ message: "Table not found" });
    const svg = await QRCode.toString(`${req.protocol}://${req.get("host")}/order/t/${tbl.qr_token}`, { type: "svg", width: 640, margin: 2 });
    res.type("image/svg+xml").send(svg);
  }));

  // ── Kitchen Display (KDS) ─────────────────────────────────────────────────
  app.get("/api/v1/company/restaurant/kds", route(async (req, res) => {
    const a = await requireModule(req, res, "kitchen_display"); if (!a) return;
    const station = String(req.query.station || "");
    const rows = station
      ? (await db.execute(sql`SELECT pi.id, pi.order_id, pi.name, pi.qty, pi.status, pi.station, pi.created_at, tk.order_no, tk.table_number FROM pos_ticket_items pi JOIN pos_tickets tk ON tk.id=pi.order_id WHERE tk.company_id=${a.companyId} AND pi.status IN ('new','preparing','ready') AND pi.station=${station} ${branchClause(req, "tk.branch_id")} ORDER BY pi.created_at ASC LIMIT 300`)).rows
      : (await db.execute(sql`SELECT pi.id, pi.order_id, pi.name, pi.qty, pi.status, pi.station, pi.created_at, tk.order_no, tk.table_number FROM pos_ticket_items pi JOIN pos_tickets tk ON tk.id=pi.order_id WHERE tk.company_id=${a.companyId} AND pi.status IN ('new','preparing','ready') ${branchClause(req, "tk.branch_id")} ORDER BY pi.created_at ASC LIMIT 300`)).rows;
    res.json(rows || []);
  }));
  app.patch("/api/v1/company/restaurant/kds/:itemId", route(async (req, res) => {
    const a = await requireModule(req, res, "kitchen_display"); if (!a) return;
    const status = String(req.body?.status || ""); if (!["new", "preparing", "ready", "served"].includes(status)) return res.status(400).json({ message: "Invalid status" });
    const [row] = (await db.execute(sql`SELECT pi.id FROM pos_ticket_items pi JOIN pos_tickets tk ON tk.id=pi.order_id WHERE pi.id=${Number(req.params.itemId)} AND tk.company_id=${a.companyId} LIMIT 1`)).rows as any[];
    if (!row) return res.status(404).json({ message: "Item not found" });
    if (status === "served") await db.execute(sql`UPDATE pos_ticket_items SET status=${status}, served_at=now() WHERE id=${Number(req.params.itemId)}`);
    else await db.execute(sql`UPDATE pos_ticket_items SET status=${status} WHERE id=${Number(req.params.itemId)}`);
    emitCompanyChange(a.companyId, "kds");
    res.json({ ok: true });
  }));

  // ── Accounting (income from POS + manual expenses → P&L) ───────────────────
  app.get("/api/v1/company/accounting/expenses", route(async (req, res) => {
    const a = await requireModule(req, res, "accounting", true); if (!a) return;
    res.json((await db.execute(sql`SELECT * FROM bridge_expenses WHERE company_id=${a.companyId} ORDER BY COALESCE(spent_on, to_char(created_at,'YYYY-MM-DD')) DESC, id DESC LIMIT 300`)).rows || []);
  }));
  app.post("/api/v1/company/accounting/expenses", route(async (req, res) => {
    const a = await requireModule(req, res, "accounting", true); if (!a) return;
    const amount = Number(req.body?.amount) || 0; if (!(amount > 0)) return res.status(400).json({ message: "Amount must be greater than 0" });
    res.status(201).json((await db.execute(sql`INSERT INTO bridge_expenses (company_id, category, amount, note, spent_on, created_by) VALUES (${a.companyId}, ${req.body?.category || "other"}, ${amount}, ${req.body?.note || null}, ${req.body?.spentOn || new Date().toISOString().slice(0, 10)}, ${a.user.id}) RETURNING *`)).rows[0]);
  }));
  app.delete("/api/v1/company/accounting/expenses/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "accounting", true); if (!a) return;
    await db.execute(sql`DELETE FROM bridge_expenses WHERE id=${Number(req.params.id)} AND company_id=${a.companyId}`); res.json({ ok: true });
  }));
  app.get("/api/v1/company/accounting/summary", route(async (req, res) => {
    const a = await requireModule(req, res, "accounting", true); if (!a) return;
    const from = String(req.query.from || ""); const to = String(req.query.to || "");
    const tz = await companyTimezone(a.companyId);
    const range = (col: string) => sql`${from ? sql`AND ${sql.raw(col)} >= ${from}::date` : sql``} ${to ? sql`AND ${sql.raw(col)} < (${to}::date + interval '1 day')` : sql``}`;
    const locD = sql`((created_at AT TIME ZONE 'UTC' AT TIME ZONE ${tz})::date)`;
    const incRange = sql`${from ? sql`AND ${locD} >= ${from}::date` : sql``} ${to ? sql`AND ${locD} <= ${to}::date` : sql``}`;
    const [inc] = (await db.execute(sql`SELECT COALESCE(SUM(total) FILTER (WHERE status='paid'),0) income, COALESCE(SUM(total) FILTER (WHERE status='refunded'),0) refunds FROM pos_tickets WHERE company_id=${a.companyId} ${incRange} ${branchClause(req, "branch_id")}`)).rows as any[];
    const [exp] = (await db.execute(sql`SELECT COALESCE(SUM(amount),0) total FROM bridge_expenses WHERE company_id=${a.companyId} ${range("COALESCE(spent_on::date, created_at::date)")}`)).rows as any[];
    const byCategory = (await db.execute(sql`SELECT category, COALESCE(SUM(amount),0) amount FROM bridge_expenses WHERE company_id=${a.companyId} ${range("COALESCE(spent_on::date, created_at::date)")} GROUP BY category ORDER BY amount DESC`)).rows;
    const income = Number(inc.income), refunds = Number(inc.refunds), expenses = Number(exp.total);
    res.json({ income, refunds, expenses, net: income - refunds - expenses, byCategory: byCategory.map((c: any) => ({ category: c.category, amount: Number(c.amount) })) });
  }));

  // ── Analytics / owner dashboard ───────────────────────────────────────────
  app.get("/api/v1/company/analytics/summary", route(async (req, res) => {
    const a = await requireModule(req, res, "analytics"); if (!a) return;
    const cid = a.companyId; const tz = await companyTimezone(cid);
    // Local-time buckets: convert stored UTC timestamps to the company's timezone.
    const loc = sql`(created_at AT TIME ZONE 'UTC' AT TIME ZONE ${tz})`;
    const tloc = sql`(tk.created_at AT TIME ZONE 'UTC' AT TIME ZONE ${tz})`;
    const nl = sql`(now() AT TIME ZONE ${tz})`;
    const [totals] = (await db.execute(sql`
      SELECT
        COALESCE(SUM(total) FILTER (WHERE ${loc} >= date_trunc('day', ${nl})),0) rev_today,
        COUNT(*) FILTER (WHERE ${loc} >= date_trunc('day', ${nl})) orders_today,
        COALESCE(SUM(total) FILTER (WHERE ${loc} >= date_trunc('week', ${nl})),0) rev_week,
        COUNT(*) FILTER (WHERE ${loc} >= date_trunc('week', ${nl})) orders_week,
        COALESCE(SUM(total) FILTER (WHERE ${loc} >= date_trunc('month', ${nl})),0) rev_month,
        COUNT(*) FILTER (WHERE ${loc} >= date_trunc('month', ${nl})) orders_month,
        COALESCE(SUM(total) FILTER (WHERE ${loc} >= date_trunc('day', ${nl}) - interval '1 day' AND ${loc} < date_trunc('day', ${nl})),0) rev_yesterday
      FROM pos_tickets WHERE company_id=${cid} AND status='paid' ${branchClause(req, "branch_id")}`)).rows as any[];
    const paymentSplit = (await db.execute(sql`SELECT payment_method method, COALESCE(SUM(total),0) amount FROM pos_tickets WHERE company_id=${cid} AND status='paid' AND ${loc} >= date_trunc('month', ${nl}) ${branchClause(req, "branch_id")} GROUP BY payment_method ORDER BY amount DESC`)).rows;
    const topProducts = (await db.execute(sql`SELECT pi.name, SUM(pi.qty) qty, SUM(pi.line_total) revenue FROM pos_ticket_items pi JOIN pos_tickets tk ON tk.id=pi.order_id WHERE tk.company_id=${cid} AND tk.status='paid' AND ${tloc} >= date_trunc('month', ${nl}) ${branchClause(req, "tk.branch_id")} GROUP BY pi.name ORDER BY qty DESC LIMIT 8`)).rows;
    const [extra] = (await db.execute(sql`
      SELECT
        COALESCE(SUM(discount) FILTER (WHERE ${loc} >= date_trunc('month', ${nl})),0) discount_month,
        COALESCE(SUM(total) FILTER (WHERE status='refunded' AND ${loc} >= date_trunc('month', ${nl})),0) refunds_month,
        COUNT(*) FILTER (WHERE status='voided' AND ${loc} >= date_trunc('month', ${nl})) voids_month
      FROM pos_tickets WHERE company_id=${cid} ${branchClause(req, "branch_id")}`)).rows as any[];
    let lowStock = 0, customersTotal = 0, customersNew = 0;
    if (await moduleEnabled(cid, "inventory")) { const [r] = (await db.execute(sql`SELECT COUNT(*) c FROM bridge_inventory_items i LEFT JOIN (SELECT item_id, SUM(quantity) s FROM bridge_stock_levels GROUP BY item_id) l ON l.item_id=i.id WHERE i.company_id=${cid} AND i.track_stock AND COALESCE(l.s,0) <= i.low_stock_threshold`)).rows as any[]; lowStock = Number(r?.c || 0); }
    if (await moduleEnabled(cid, "crm")) { const [r] = (await db.execute(sql`SELECT COUNT(*) total, COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now())) new FROM bridge_customers WHERE company_id=${cid}`)).rows as any[]; customersTotal = Number(r?.total || 0); customersNew = Number(r?.new || 0); }
    const revToday = Number(totals.rev_today), revYesterday = Number(totals.rev_yesterday);
    res.json({
      revToday, ordersToday: Number(totals.orders_today), revWeek: Number(totals.rev_week), ordersWeek: Number(totals.orders_week),
      revMonth: Number(totals.rev_month), ordersMonth: Number(totals.orders_month),
      avgBillMonth: Number(totals.orders_month) ? Number(totals.rev_month) / Number(totals.orders_month) : 0,
      revYesterday, dayDeltaPct: revYesterday ? Math.round(((revToday - revYesterday) / revYesterday) * 100) : null,
      discountMonth: Number(extra.discount_month), refundsMonth: Number(extra.refunds_month), voidsMonth: Number(extra.voids_month),
      lowStock, customersTotal, customersNew,
      paymentSplit: paymentSplit.map((p: any) => ({ method: p.method || "unpaid", amount: Number(p.amount) })),
      topProducts: topProducts.map((p: any) => ({ name: p.name, qty: Number(p.qty), revenue: Number(p.revenue) })),
    });
  }));

  // ── Audit / fraud & staff control ─────────────────────────────────────────
  app.get("/api/v1/company/audit", route(async (req, res) => {
    const a = await requireModule(req, res, "audit", true); if (!a) return;
    const events = (await db.execute(sql`
      SELECT tk.id, tk.order_no, tk.status, tk.total, tk.discount, tk.discount_reason, tk.refund_reason, tk.void_reason, tk.created_at,
             COALESCE(NULLIF(trim(concat(u.first_name,' ',u.last_name)),''),u.email) staff_name
      FROM pos_tickets tk LEFT JOIN users u ON u.id=COALESCE(tk.voided_by, tk.refunded_by, tk.staff_id)
      WHERE tk.company_id=${a.companyId} AND (tk.status IN ('voided','refunded') OR tk.discount > 0)
      ORDER BY tk.id DESC LIMIT 100`)).rows;
    const staff = (await db.execute(sql`
      SELECT COALESCE(NULLIF(trim(concat(u.first_name,' ',u.last_name)),''),u.email) staff_name,
             COUNT(*) FILTER (WHERE tk.status='voided') voids,
             COUNT(*) FILTER (WHERE tk.status='refunded') refunds,
             COALESCE(SUM(tk.discount),0) discounts
      FROM pos_tickets tk LEFT JOIN users u ON u.id=tk.staff_id
      WHERE tk.company_id=${a.companyId} AND tk.created_at >= now() - interval '7 days'
      GROUP BY 1 HAVING COUNT(*) FILTER (WHERE tk.status IN ('voided','refunded')) > 0 ORDER BY voids + refunds DESC`)).rows;
    res.json({ events, staff: staff.map((s: any) => ({ ...s, voids: Number(s.voids), refunds: Number(s.refunds), discounts: Number(s.discounts), flag: Number(s.voids) + Number(s.refunds) >= 5 })) });
  }));

  // ── Pricing rules (happy hour / member / category discounts) ───────────────
  app.get("/api/v1/company/pricing/rules", route(async (req, res) => {
    const a = await requireModule(req, res, "pricing"); if (!a) return;
    res.json((await db.execute(sql`SELECT * FROM bridge_price_rules WHERE company_id=${a.companyId} ORDER BY id DESC`)).rows || []);
  }));
  app.post("/api/v1/company/pricing/rules", route(async (req, res) => {
    const a = await requireModule(req, res, "pricing", true); if (!a) return;
    const name = String(req.body?.name || "").trim(); if (!name) return res.status(400).json({ message: "Rule name is required" });
    const days = Array.isArray(req.body?.days) ? req.body.days : [];
    res.status(201).json((await db.execute(sql`INSERT INTO bridge_price_rules (company_id, name, type, scope_category, percent_off, days, start_time, end_time) VALUES (${a.companyId}, ${name}, ${req.body?.type || "happy_hour"}, ${req.body?.scopeCategory || null}, ${Number(req.body?.percentOff) || 0}, ${JSON.stringify(days)}::jsonb, ${req.body?.startTime || null}, ${req.body?.endTime || null}) RETURNING *`)).rows[0]);
  }));
  app.put("/api/v1/company/pricing/rules/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "pricing", true); if (!a) return;
    const days = req.body?.days !== undefined ? JSON.stringify(Array.isArray(req.body.days) ? req.body.days : []) : null;
    const r = await db.execute(sql`UPDATE bridge_price_rules SET name=COALESCE(${req.body?.name ?? null},name), type=COALESCE(${req.body?.type ?? null},type), scope_category=${req.body?.scopeCategory ?? null}, percent_off=COALESCE(${req.body?.percentOff ?? null},percent_off), days=COALESCE(${days}::jsonb,days), start_time=${req.body?.startTime ?? null}, end_time=${req.body?.endTime ?? null}, active=COALESCE(${req.body?.active ?? null},active) WHERE id=${Number(req.params.id)} AND company_id=${a.companyId} RETURNING *`);
    if (!r.rows.length) return res.status(404).json({ message: "Rule not found" }); res.json(r.rows[0]);
  }));
  app.delete("/api/v1/company/pricing/rules/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "pricing", true); if (!a) return;
    await db.execute(sql`DELETE FROM bridge_price_rules WHERE id=${Number(req.params.id)} AND company_id=${a.companyId}`); res.json({ ok: true });
  }));
  // Which discount % applies right now (server clock), best rule wins.
  app.get("/api/v1/company/pricing/active", route(async (req, res) => {
    const a = await requireModule(req, res, "pricing"); if (!a) return;
    const member = String(req.query.member || "") === "1";
    const rules = (await db.execute(sql`SELECT * FROM bridge_price_rules WHERE company_id=${a.companyId} AND active=true`)).rows as any[];
    const now = new Date(); const day = now.getDay(); const hhmm = now.toTimeString().slice(0, 5);
    const applies = (r: any) => {
      if (r.type === "member" && !member) return false;
      const days = Array.isArray(r.days) ? r.days : [];
      if (days.length && !days.includes(day)) return false;
      if (r.start_time && r.end_time) { if (hhmm < r.start_time || hhmm > r.end_time) return false; }
      return true;
    };
    const active = rules.filter(applies);
    const best = active.reduce((m: number, r: any) => Math.max(m, Number(r.percent_off)), 0);
    res.json({ percentOff: best, rules: active.map((r: any) => ({ id: r.id, name: r.name, percentOff: Number(r.percent_off), scopeCategory: r.scope_category })) });
  }));

  // ── Universal booking engine (beauty/gym/hotel/clinic/workshop/rental/…) ───
  app.get("/api/v1/company/booking/resources", route(async (req, res) => {
    const a = await requireModule(req, res, "booking"); if (!a) return;
    res.json((await db.execute(sql`SELECT * FROM bridge_resources WHERE company_id=${a.companyId} ORDER BY sort, name`)).rows || []);
  }));
  app.post("/api/v1/company/booking/resources", route(async (req, res) => {
    const a = await requireModule(req, res, "booking", true); if (!a) return;
    const name = String(req.body?.name || "").trim(); if (!name) return res.status(400).json({ message: "Resource name is required" });
    res.status(201).json((await db.execute(sql`INSERT INTO bridge_resources (company_id, type, name, meta) VALUES (${a.companyId}, ${req.body?.type || "staff"}, ${name}, ${JSON.stringify(req.body?.meta || {})}::jsonb) RETURNING *`)).rows[0]);
  }));
  app.put("/api/v1/company/booking/resources/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "booking", true); if (!a) return;
    const meta = req.body?.meta !== undefined ? JSON.stringify(req.body.meta) : null;
    const r = await db.execute(sql`UPDATE bridge_resources SET name=COALESCE(${req.body?.name ?? null},name), type=COALESCE(${req.body?.type ?? null},type), meta=COALESCE(${meta}::jsonb,meta), active=COALESCE(${req.body?.active ?? null},active), sort=COALESCE(${req.body?.sort ?? null},sort) WHERE id=${Number(req.params.id)} AND company_id=${a.companyId} RETURNING *`);
    if (!r.rows.length) return res.status(404).json({ message: "Resource not found" }); res.json(r.rows[0]);
  }));
  app.delete("/api/v1/company/booking/resources/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "booking", true); if (!a) return;
    await db.execute(sql`DELETE FROM bridge_resources WHERE id=${Number(req.params.id)} AND company_id=${a.companyId}`); res.json({ ok: true });
  }));
  app.get("/api/v1/company/booking/bookings", route(async (req, res) => {
    const a = await requireModule(req, res, "booking"); if (!a) return;
    const date = String(req.query.date || "");
    const rows = date
      ? (await db.execute(sql`SELECT b.*, r.name resource_name, r.type resource_type, COALESCE(NULLIF(trim(concat(u.first_name,' ',u.last_name)),''),u.email) staff_name FROM bridge_bookings b LEFT JOIN bridge_resources r ON r.id=b.resource_id LEFT JOIN users u ON u.id=b.staff_user_id WHERE b.company_id=${a.companyId} AND b.starts_at::date = ${date}::date ${branchClause(req, "b.branch_id")} ORDER BY b.starts_at`)).rows
      : (await db.execute(sql`SELECT b.*, r.name resource_name, r.type resource_type, COALESCE(NULLIF(trim(concat(u.first_name,' ',u.last_name)),''),u.email) staff_name FROM bridge_bookings b LEFT JOIN bridge_resources r ON r.id=b.resource_id LEFT JOIN users u ON u.id=b.staff_user_id WHERE b.company_id=${a.companyId} AND b.starts_at >= now() - interval '1 day' ${branchClause(req, "b.branch_id")} ORDER BY b.starts_at LIMIT 300`)).rows;
    res.json(rows || []);
  }));
  app.post("/api/v1/company/booking/bookings", route(async (req, res) => {
    const a = await requireModule(req, res, "booking"); if (!a) return;
    const startsAt = req.body?.startsAt ? new Date(req.body.startsAt) : null;
    if (!startsAt || isNaN(startsAt.getTime())) return res.status(400).json({ message: "A valid start time is required" });
    const durationMin = Math.max(0, Number(req.body?.durationMin) || 0);
    const endsAt = req.body?.endsAt ? new Date(req.body.endsAt) : durationMin ? new Date(startsAt.getTime() + durationMin * 60000) : null;
    const resourceId = req.body?.resourceId ? Number(req.body.resourceId) : null;
    if (resourceId && endsAt) {
      const clash = (await db.execute(sql`SELECT id FROM bridge_bookings WHERE company_id=${a.companyId} AND resource_id=${resourceId} AND status NOT IN ('cancelled','no_show') AND starts_at < ${endsAt.toISOString()} AND COALESCE(ends_at, starts_at + interval '30 min') > ${startsAt.toISOString()} LIMIT 1`)).rows;
      if (clash.length) return res.status(409).json({ message: "That resource is already booked for this time" });
    }
    const [b] = (await db.execute(sql`INSERT INTO bridge_bookings (company_id, branch_id, resource_id, customer_id, customer_name, customer_phone, service, starts_at, ends_at, status, price, deposit, staff_user_id, note, created_by)
      VALUES (${a.companyId}, ${a.branchId || 0}, ${resourceId}, ${req.body?.customerId || null}, ${req.body?.customerName || null}, ${req.body?.customerPhone || null}, ${req.body?.service || null}, ${startsAt.toISOString()}, ${endsAt ? endsAt.toISOString() : null}, ${req.body?.status || "booked"}, ${Number(req.body?.price) || 0}, ${Number(req.body?.deposit) || 0}, ${req.body?.staffUserId || null}, ${req.body?.note || null}, ${a.user.id}) RETURNING *`)).rows as any[];
    if (b.staff_user_id) await sendBridgeXNotifications(a.companyId, [b.staff_user_id], { type: "new_booking", title: "New booking", body: `${b.service || "Booking"} · ${new Date(b.starts_at).toLocaleString()}`, data: { bookingId: b.id } });
    res.status(201).json(b);
  }));
  app.patch("/api/v1/company/booking/bookings/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "booking"); if (!a) return;
    const id = Number(req.params.id);
    const [b] = (await db.execute(sql`SELECT * FROM bridge_bookings WHERE id=${id} AND company_id=${a.companyId} LIMIT 1`)).rows as any[];
    if (!b) return res.status(404).json({ message: "Booking not found" });
    const status = req.body?.status ? String(req.body.status) : b.status;
    let commission = Number(b.commission);
    if (status === "completed" && b.status !== "completed") {
      if (b.staff_user_id) { const [sp] = (await db.execute(sql`SELECT commission_rate FROM bridge_staff_profiles WHERE company_id=${a.companyId} AND user_id=${b.staff_user_id} LIMIT 1`)).rows as any[]; commission = Number(b.price) * (Number(sp?.commission_rate || 0) / 100); }
      if (b.customer_id && await moduleEnabled(a.companyId, "crm")) await db.execute(sql`UPDATE bridge_customers SET total_spend=total_spend + ${Number(b.price)}, visit_count=visit_count + 1, last_visit_at=now(), updated_at=now() WHERE id=${b.customer_id} AND company_id=${a.companyId}`);
    }
    const [upd] = (await db.execute(sql`UPDATE bridge_bookings SET status=${status}, price=COALESCE(${req.body?.price ?? null}, price), note=COALESCE(${req.body?.note ?? null}, note), staff_user_id=COALESCE(${req.body?.staffUserId ?? null}, staff_user_id), commission=${commission} WHERE id=${id} AND company_id=${a.companyId} RETURNING *`)).rows as any[];
    res.json(upd);
  }));
  app.delete("/api/v1/company/booking/bookings/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "booking", true); if (!a) return;
    await db.execute(sql`DELETE FROM bridge_bookings WHERE id=${Number(req.params.id)} AND company_id=${a.companyId}`); res.json({ ok: true });
  }));
  app.get("/api/v1/company/booking/commissions", route(async (req, res) => {
    const a = await requireModule(req, res, "booking", true); if (!a) return;
    const from = String(req.query.from || ""); const to = String(req.query.to || "");
    const rows = (await db.execute(sql`
      SELECT COALESCE(NULLIF(trim(concat(u.first_name,' ',u.last_name)),''),u.email) staff_name, b.staff_user_id,
        COUNT(*) jobs, COALESCE(SUM(b.price),0) revenue, COALESCE(SUM(b.commission),0) commission
      FROM bridge_bookings b LEFT JOIN users u ON u.id=b.staff_user_id
      WHERE b.company_id=${a.companyId} AND b.status='completed' AND b.staff_user_id IS NOT NULL
        ${from ? sql`AND b.starts_at >= ${from}::date` : sql``} ${to ? sql`AND b.starts_at < (${to}::date + interval '1 day')` : sql``}
      GROUP BY b.staff_user_id, staff_name ORDER BY commission DESC`)).rows;
    res.json(rows.map((r: any) => ({ ...r, jobs: Number(r.jobs), revenue: Number(r.revenue), commission: Number(r.commission) })));
  }));

  // ── Events / ticketing ────────────────────────────────────────────────────
  app.get("/api/v1/company/events", route(async (req, res) => {
    const a = await requireModule(req, res, "events"); if (!a) return;
    res.json((await db.execute(sql`SELECT e.*, (SELECT COUNT(*) FROM bridge_tickets t WHERE t.event_id=e.id) tickets, (SELECT COUNT(*) FROM bridge_tickets t WHERE t.event_id=e.id AND t.status='used') checked_in FROM bridge_events e WHERE e.company_id=${a.companyId} ORDER BY e.id DESC`)).rows || []);
  }));
  app.post("/api/v1/company/events", route(async (req, res) => {
    const a = await requireModule(req, res, "events", true); if (!a) return;
    const name = String(req.body?.name || "").trim(); if (!name) return res.status(400).json({ message: "Event name is required" });
    res.status(201).json((await db.execute(sql`INSERT INTO bridge_events (company_id, name, starts_at, venue, description) VALUES (${a.companyId}, ${name}, ${req.body?.startsAt ? new Date(req.body.startsAt).toISOString() : null}, ${req.body?.venue || null}, ${req.body?.description || null}) RETURNING *`)).rows[0]);
  }));
  app.delete("/api/v1/company/events/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "events", true); if (!a) return;
    const id = Number(req.params.id);
    await db.execute(sql`DELETE FROM bridge_tickets WHERE event_id=${id} AND company_id=${a.companyId}`);
    await db.execute(sql`DELETE FROM bridge_ticket_types WHERE event_id=${id} AND company_id=${a.companyId}`);
    await db.execute(sql`DELETE FROM bridge_events WHERE id=${id} AND company_id=${a.companyId}`);
    res.json({ ok: true });
  }));
  app.get("/api/v1/company/events/:id/types", route(async (req, res) => {
    const a = await requireModule(req, res, "events"); if (!a) return;
    res.json((await db.execute(sql`SELECT * FROM bridge_ticket_types WHERE event_id=${Number(req.params.id)} AND company_id=${a.companyId} ORDER BY id`)).rows || []);
  }));
  app.post("/api/v1/company/events/:id/types", route(async (req, res) => {
    const a = await requireModule(req, res, "events", true); if (!a) return;
    const name = String(req.body?.name || "").trim(); if (!name) return res.status(400).json({ message: "Ticket type name is required" });
    res.status(201).json((await db.execute(sql`INSERT INTO bridge_ticket_types (company_id, event_id, name, price, quantity) VALUES (${a.companyId}, ${Number(req.params.id)}, ${name}, ${Number(req.body?.price) || 0}, ${Number(req.body?.quantity) || 0}) RETURNING *`)).rows[0]);
  }));
  app.get("/api/v1/company/events/:id/tickets", route(async (req, res) => {
    const a = await requireModule(req, res, "events"); if (!a) return;
    res.json((await db.execute(sql`SELECT t.*, tt.name type_name FROM bridge_tickets t LEFT JOIN bridge_ticket_types tt ON tt.id=t.ticket_type_id WHERE t.event_id=${Number(req.params.id)} AND t.company_id=${a.companyId} ORDER BY t.id DESC LIMIT 500`)).rows || []);
  }));
  app.post("/api/v1/company/events/:id/issue", route(async (req, res) => {
    const a = await requireModule(req, res, "events", true); if (!a) return;
    const eventId = Number(req.params.id); const typeId = Number(req.body?.ticketTypeId) || null;
    const qty = Math.max(1, Math.min(50, Number(req.body?.qty) || 1));
    if (typeId) {
      const [tt] = (await db.execute(sql`SELECT * FROM bridge_ticket_types WHERE id=${typeId} AND company_id=${a.companyId} LIMIT 1`)).rows as any[];
      if (!tt) return res.status(404).json({ message: "Ticket type not found" });
      if (Number(tt.quantity) > 0 && Number(tt.sold) + qty > Number(tt.quantity)) return res.status(400).json({ message: `Only ${Number(tt.quantity) - Number(tt.sold)} left` });
    }
    const created: any[] = [];
    for (let i = 0; i < qty; i++) { const code = `TK-${randomToken().toUpperCase().slice(0, 10)}`; const [t] = (await db.execute(sql`INSERT INTO bridge_tickets (company_id, event_id, ticket_type_id, code, buyer_name, buyer_phone) VALUES (${a.companyId}, ${eventId}, ${typeId}, ${code}, ${req.body?.buyerName || null}, ${req.body?.buyerPhone || null}) RETURNING *`)).rows as any[]; created.push(t); }
    if (typeId) await db.execute(sql`UPDATE bridge_ticket_types SET sold=sold + ${qty} WHERE id=${typeId}`);
    res.status(201).json(created);
  }));
  app.get("/api/v1/company/events/ticket/:code/qr", route(async (req, res) => {
    const a = await requireModule(req, res, "events", true); if (!a) return;
    const svg = await QRCode.toString(`${req.protocol}://${req.get("host")}/ticket/${req.params.code}`, { type: "svg", width: 512, margin: 2 });
    res.type("image/svg+xml").send(svg);
  }));
  app.post("/api/v1/company/events/scan", route(async (req, res) => {
    const a = await requireModule(req, res, "events"); if (!a) return;
    const code = String(req.body?.code || "").trim();
    const [t] = (await db.execute(sql`SELECT t.*, e.name event_name FROM bridge_tickets t JOIN bridge_events e ON e.id=t.event_id WHERE t.code=${code} AND t.company_id=${a.companyId} LIMIT 1`)).rows as any[];
    if (!t) return res.status(404).json({ ok: false, message: "Ticket not found" });
    if (t.status === "used") return res.json({ ok: false, already: true, checkedInAt: t.checked_in_at, event: t.event_name, buyer: t.buyer_name });
    if (t.status === "cancelled") return res.json({ ok: false, cancelled: true });
    await db.execute(sql`UPDATE bridge_tickets SET status='used', checked_in_at=now() WHERE id=${t.id}`);
    res.json({ ok: true, event: t.event_name, buyer: t.buyer_name });
  }));

  // ── Repair shop tickets ───────────────────────────────────────────────────
  app.get("/api/v1/company/repair/tickets", route(async (req, res) => {
    const a = await requireModule(req, res, "repair"); if (!a) return;
    res.json((await db.execute(sql`SELECT r.*, COALESCE(NULLIF(trim(concat(u.first_name,' ',u.last_name)),''),u.email) assignee FROM bridge_repairs r LEFT JOIN users u ON u.id=r.assigned_user_id WHERE r.company_id=${a.companyId} ORDER BY r.id DESC LIMIT 300`)).rows || []);
  }));
  app.post("/api/v1/company/repair/tickets", route(async (req, res) => {
    const a = await requireModule(req, res, "repair", true); if (!a) return;
    const device = String(req.body?.device || "").trim(); if (!device) return res.status(400).json({ message: "Device is required" });
    const ticketNo = `RP-${Date.now().toString(36).toUpperCase()}`;
    res.status(201).json((await db.execute(sql`INSERT INTO bridge_repairs (company_id, ticket_no, customer_name, customer_phone, device, serial_imei, problem, quote, deposit, assigned_user_id, note) VALUES (${a.companyId}, ${ticketNo}, ${req.body?.customerName || null}, ${req.body?.customerPhone || null}, ${device}, ${req.body?.serialImei || null}, ${req.body?.problem || null}, ${Number(req.body?.quote) || 0}, ${Number(req.body?.deposit) || 0}, ${req.body?.assignedUserId || null}, ${req.body?.note || null}) RETURNING *`)).rows[0]);
  }));
  app.patch("/api/v1/company/repair/tickets/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "repair", true); if (!a) return;
    const r = await db.execute(sql`UPDATE bridge_repairs SET status=COALESCE(${req.body?.status ?? null},status), diagnosis=${req.body?.diagnosis ?? null}, quote=COALESCE(${req.body?.quote ?? null},quote), assigned_user_id=${req.body?.assignedUserId ?? null}, note=${req.body?.note ?? null}, updated_at=now() WHERE id=${Number(req.params.id)} AND company_id=${a.companyId} RETURNING *`);
    if (!r.rows.length) return res.status(404).json({ message: "Repair ticket not found" }); res.json(r.rows[0]);
  }));
  app.delete("/api/v1/company/repair/tickets/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "repair", true); if (!a) return;
    await db.execute(sql`DELETE FROM bridge_repairs WHERE id=${Number(req.params.id)} AND company_id=${a.companyId}`); res.json({ ok: true });
  }));

  // ── Marketing campaigns ───────────────────────────────────────────────────
  const SEGMENT_SQL: Record<string, any> = {
    all: sql``,
    vip: sql`AND total_spend >= 5000000`,
    new: sql`AND created_at >= now() - interval '30 days'`,
    lost: sql`AND last_visit_at IS NOT NULL AND last_visit_at < now() - interval '90 days'`,
    birthday: sql`AND birthday IS NOT NULL AND substring(birthday from 6 for 2) = to_char(now(),'MM')`,
  };
  app.get("/api/v1/company/marketing/campaigns", route(async (req, res) => {
    const a = await requireModule(req, res, "marketing"); if (!a) return;
    res.json((await db.execute(sql`SELECT * FROM bridge_campaigns WHERE company_id=${a.companyId} ORDER BY id DESC`)).rows || []);
  }));
  app.post("/api/v1/company/marketing/campaigns", route(async (req, res) => {
    const a = await requireModule(req, res, "marketing", true); if (!a) return;
    const name = String(req.body?.name || "").trim(); if (!name) return res.status(400).json({ message: "Campaign name is required" });
    res.status(201).json((await db.execute(sql`INSERT INTO bridge_campaigns (company_id, name, channel, segment, message) VALUES (${a.companyId}, ${name}, ${req.body?.channel || "whatsapp"}, ${req.body?.segment || "all"}, ${req.body?.message || null}) RETURNING *`)).rows[0]);
  }));
  app.delete("/api/v1/company/marketing/campaigns/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "marketing", true); if (!a) return;
    await db.execute(sql`DELETE FROM bridge_campaigns WHERE id=${Number(req.params.id)} AND company_id=${a.companyId}`); res.json({ ok: true });
  }));
  // Build the recipient list for a segment (CRM customers with a contact).
  app.get("/api/v1/company/marketing/audience", route(async (req, res) => {
    const a = await requireModule(req, res, "marketing"); if (!a) return;
    const seg = String(req.query.segment || "all"); const filter = SEGMENT_SQL[seg] ?? SEGMENT_SQL.all;
    if (!(await moduleEnabled(a.companyId, "crm"))) return res.json({ count: 0, recipients: [], note: "Enable CRM to build audiences from customers." });
    const rows = (await db.execute(sql`SELECT name, phone, email FROM bridge_customers WHERE company_id=${a.companyId} ${filter} ORDER BY name LIMIT 1000`)).rows as any[];
    res.json({ count: rows.length, recipients: rows });
  }));
  // Send the campaign to the segment via its channel (email/WhatsApp), capped for safety.
  app.post("/api/v1/company/marketing/campaigns/:id/send", route(async (req, res) => {
    const a = await requireModule(req, res, "marketing", true); if (!a) return;
    const [c] = (await db.execute(sql`SELECT * FROM bridge_campaigns WHERE id=${Number(req.params.id)} AND company_id=${a.companyId} LIMIT 1`)).rows as any[];
    if (!c) return res.status(404).json({ message: "Campaign not found" });
    if (!(await moduleEnabled(a.companyId, "crm"))) return res.status(400).json({ message: "Enable CRM to send to customer segments." });
    const filter = SEGMENT_SQL[c.segment] ?? SEGMENT_SQL.all;
    const recipients = (await db.execute(sql`SELECT name, phone, email FROM bridge_customers WHERE company_id=${a.companyId} ${filter} LIMIT 1000`)).rows as any[];
    const [company] = await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.id, a.companyId)).limit(1);
    const brand = company?.appName || company?.name || "Us";
    const personalize = (msg: string, name: string) => String(msg || "").replace(/\{name\}/gi, name || "there");
    let delivered = 0, attempted = 0; let channelReady = true;
    if (c.channel === "email") {
      const { sendEmail } = await import("./emailService");
      for (const r of recipients) { if (!r.email) continue; attempted++; try { if (await sendEmail({ to: r.email, subject: c.name, text: personalize(c.message, r.name), html: `<p>${personalize(c.message, r.name).replace(/\n/g, "<br>")}</p>` })) delivered++; } catch {} }
    } else if (c.channel === "whatsapp") {
      const { sendWhatsApp, whatsappConfigured } = await import("./whatsappBot");
      channelReady = whatsappConfigured();
      if (channelReady) for (const r of recipients) { if (!r.phone) continue; attempted++; try { if (await sendWhatsApp(r.phone, `*${brand}*\n\n${personalize(c.message, r.name)}`)) delivered++; } catch {} }
    } else { channelReady = false; }
    const [upd] = (await db.execute(sql`UPDATE bridge_campaigns SET status='sent', sent_count=${delivered} WHERE id=${c.id} RETURNING *`)).rows as any[];
    const note = !channelReady ? `The ${c.channel} channel isn't connected — audience of ${recipients.length} captured. Connect the channel to deliver.` : `Delivered ${delivered}/${attempted} via ${c.channel}.`;
    res.json({ ...upd, audience: recipients.length, attempted, delivered, note });
  }));

  // ── Wholesale / B2B accounts ──────────────────────────────────────────────
  app.get("/api/v1/company/wholesale/accounts", route(async (req, res) => {
    const a = await requireModule(req, res, "wholesale"); if (!a) return;
    res.json((await db.execute(sql`SELECT * FROM bridge_wholesale_accounts WHERE company_id=${a.companyId} ORDER BY name`)).rows || []);
  }));
  app.post("/api/v1/company/wholesale/accounts", route(async (req, res) => {
    const a = await requireModule(req, res, "wholesale", true); if (!a) return;
    const name = String(req.body?.name || "").trim(); if (!name) return res.status(400).json({ message: "Account name is required" });
    res.status(201).json((await db.execute(sql`INSERT INTO bridge_wholesale_accounts (company_id, name, contact, phone, price_tier, discount_pct, credit_limit, note) VALUES (${a.companyId}, ${name}, ${req.body?.contact || null}, ${req.body?.phone || null}, ${req.body?.priceTier || "standard"}, ${Number(req.body?.discountPct) || 0}, ${Number(req.body?.creditLimit) || 0}, ${req.body?.note || null}) RETURNING *`)).rows[0]);
  }));
  app.put("/api/v1/company/wholesale/accounts/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "wholesale", true); if (!a) return;
    const r = await db.execute(sql`UPDATE bridge_wholesale_accounts SET name=COALESCE(${req.body?.name ?? null},name), contact=${req.body?.contact ?? null}, phone=${req.body?.phone ?? null}, price_tier=COALESCE(${req.body?.priceTier ?? null},price_tier), discount_pct=COALESCE(${req.body?.discountPct ?? null},discount_pct), credit_limit=COALESCE(${req.body?.creditLimit ?? null},credit_limit), note=${req.body?.note ?? null} WHERE id=${Number(req.params.id)} AND company_id=${a.companyId} RETURNING *`);
    if (!r.rows.length) return res.status(404).json({ message: "Account not found" }); res.json(r.rows[0]);
  }));
  app.post("/api/v1/company/wholesale/accounts/:id/charge", route(async (req, res) => {
    const a = await requireModule(req, res, "wholesale", true); if (!a) return;
    const delta = Number(req.body?.amount) || 0; // +charge, -payment
    const r = await db.execute(sql`UPDATE bridge_wholesale_accounts SET balance=balance + ${delta} WHERE id=${Number(req.params.id)} AND company_id=${a.companyId} RETURNING *`);
    if (!r.rows.length) return res.status(404).json({ message: "Account not found" }); res.json(r.rows[0]);
  }));
  app.delete("/api/v1/company/wholesale/accounts/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "wholesale", true); if (!a) return;
    await db.execute(sql`DELETE FROM bridge_wholesale_accounts WHERE id=${Number(req.params.id)} AND company_id=${a.companyId}`); res.json({ ok: true });
  }));

  // ── Professional services: projects + timesheets ──────────────────────────
  app.get("/api/v1/company/projects", route(async (req, res) => {
    const a = await requireModule(req, res, "professional"); if (!a) return;
    res.json((await db.execute(sql`SELECT p.*, COALESCE((SELECT SUM(hours) FROM bridge_time_entries te WHERE te.project_id=p.id),0) hours, COALESCE((SELECT SUM(hours) FROM bridge_time_entries te WHERE te.project_id=p.id),0)*p.rate billable FROM bridge_projects p WHERE p.company_id=${a.companyId} ORDER BY p.id DESC`)).rows || []);
  }));
  app.post("/api/v1/company/projects", route(async (req, res) => {
    const a = await requireModule(req, res, "professional", true); if (!a) return;
    const name = String(req.body?.name || "").trim(); if (!name) return res.status(400).json({ message: "Project name is required" });
    res.status(201).json((await db.execute(sql`INSERT INTO bridge_projects (company_id, client, name, budget, rate, note) VALUES (${a.companyId}, ${req.body?.client || null}, ${name}, ${Number(req.body?.budget) || 0}, ${Number(req.body?.rate) || 0}, ${req.body?.note || null}) RETURNING *`)).rows[0]);
  }));
  app.patch("/api/v1/company/projects/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "professional", true); if (!a) return;
    const r = await db.execute(sql`UPDATE bridge_projects SET status=COALESCE(${req.body?.status ?? null},status), budget=COALESCE(${req.body?.budget ?? null},budget), rate=COALESCE(${req.body?.rate ?? null},rate), note=${req.body?.note ?? null} WHERE id=${Number(req.params.id)} AND company_id=${a.companyId} RETURNING *`);
    if (!r.rows.length) return res.status(404).json({ message: "Project not found" }); res.json(r.rows[0]);
  }));
  app.delete("/api/v1/company/projects/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "professional", true); if (!a) return;
    await db.execute(sql`DELETE FROM bridge_time_entries WHERE project_id=${Number(req.params.id)} AND company_id=${a.companyId}`);
    await db.execute(sql`DELETE FROM bridge_projects WHERE id=${Number(req.params.id)} AND company_id=${a.companyId}`); res.json({ ok: true });
  }));
  app.get("/api/v1/company/projects/:id/time", route(async (req, res) => {
    const a = await requireModule(req, res, "professional"); if (!a) return;
    res.json((await db.execute(sql`SELECT te.*, COALESCE(NULLIF(trim(concat(u.first_name,' ',u.last_name)),''),u.email) staff_name FROM bridge_time_entries te LEFT JOIN users u ON u.id=te.user_id WHERE te.project_id=${Number(req.params.id)} AND te.company_id=${a.companyId} ORDER BY te.id DESC LIMIT 200`)).rows || []);
  }));
  app.post("/api/v1/company/projects/:id/time", route(async (req, res) => {
    const a = await requireModule(req, res, "professional"); if (!a) return;
    const hours = Number(req.body?.hours) || 0; if (!(hours > 0)) return res.status(400).json({ message: "Hours must be greater than 0" });
    res.status(201).json((await db.execute(sql`INSERT INTO bridge_time_entries (company_id, project_id, user_id, work_date, hours, note) VALUES (${a.companyId}, ${Number(req.params.id)}, ${a.user.id}, ${req.body?.workDate || new Date().toISOString().slice(0, 10)}, ${hours}, ${req.body?.note || null}) RETURNING *`)).rows[0]);
  }));

  // ── Food court: stalls + revenue allocation ───────────────────────────────
  app.get("/api/v1/company/foodcourt/stalls", route(async (req, res) => {
    const a = await requireModule(req, res, "foodcourt"); if (!a) return;
    res.json((await db.execute(sql`SELECT * FROM bridge_stalls WHERE company_id=${a.companyId} ORDER BY name`)).rows || []);
  }));
  app.post("/api/v1/company/foodcourt/stalls", route(async (req, res) => {
    const a = await requireModule(req, res, "foodcourt", true); if (!a) return;
    const name = String(req.body?.name || "").trim(); if (!name) return res.status(400).json({ message: "Stall name is required" });
    res.status(201).json((await db.execute(sql`INSERT INTO bridge_stalls (company_id, name, commission_pct, contact) VALUES (${a.companyId}, ${name}, ${Number(req.body?.commissionPct) || 0}, ${req.body?.contact || null}) RETURNING *`)).rows[0]);
  }));
  app.put("/api/v1/company/foodcourt/stalls/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "foodcourt", true); if (!a) return;
    const r = await db.execute(sql`UPDATE bridge_stalls SET name=COALESCE(${req.body?.name ?? null},name), commission_pct=COALESCE(${req.body?.commissionPct ?? null},commission_pct), contact=${req.body?.contact ?? null}, active=COALESCE(${req.body?.active ?? null},active) WHERE id=${Number(req.params.id)} AND company_id=${a.companyId} RETURNING *`);
    if (!r.rows.length) return res.status(404).json({ message: "Stall not found" }); res.json(r.rows[0]);
  }));
  app.delete("/api/v1/company/foodcourt/stalls/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "foodcourt", true); if (!a) return;
    await db.execute(sql`UPDATE pos_products SET stall_id=NULL WHERE stall_id=${Number(req.params.id)} AND company_id=${a.companyId}`);
    await db.execute(sql`DELETE FROM bridge_stalls WHERE id=${Number(req.params.id)} AND company_id=${a.companyId}`); res.json({ ok: true });
  }));
  app.post("/api/v1/company/foodcourt/assign", route(async (req, res) => {
    const a = await requireModule(req, res, "foodcourt", true); if (!a) return;
    await db.execute(sql`UPDATE pos_products SET stall_id=${req.body?.stallId || null} WHERE id=${Number(req.body?.productId)} AND company_id=${a.companyId}`);
    res.json({ ok: true });
  }));
  app.get("/api/v1/company/foodcourt/settlement", route(async (req, res) => {
    const a = await requireModule(req, res, "foodcourt"); if (!a) return;
    const rows = (await db.execute(sql`
      SELECT s.id, s.name, s.commission_pct, COALESCE(SUM(pi.line_total),0) gross
      FROM bridge_stalls s
      LEFT JOIN pos_products p ON p.stall_id=s.id
      LEFT JOIN pos_ticket_items pi ON pi.product_id=p.id
      LEFT JOIN pos_tickets tk ON tk.id=pi.order_id AND tk.status='paid' AND tk.created_at >= date_trunc('month', now())
      WHERE s.company_id=${a.companyId} GROUP BY s.id ORDER BY gross DESC`)).rows as any[];
    res.json(rows.map((r) => { const gross = Number(r.gross); const commission = gross * Number(r.commission_pct) / 100; return { id: r.id, name: r.name, commissionPct: Number(r.commission_pct), gross, commission, net: gross - commission }; }));
  }));

  // ── Live gifts ────────────────────────────────────────────────────────────
  app.get("/api/v1/company/live-gifts/catalog", route(async (req, res) => {
    const a = await requireModule(req, res, "live_gifts"); if (!a) return;
    res.json((await db.execute(sql`SELECT * FROM bridge_gift_catalog WHERE company_id=${a.companyId} ORDER BY price`)).rows || []);
  }));
  app.post("/api/v1/company/live-gifts/catalog", route(async (req, res) => {
    const a = await requireModule(req, res, "live_gifts", true); if (!a) return;
    const name = String(req.body?.name || "").trim(); if (!name) return res.status(400).json({ message: "Gift name is required" });
    res.status(201).json((await db.execute(sql`INSERT INTO bridge_gift_catalog (company_id, name, emoji, price, share_pct) VALUES (${a.companyId}, ${name}, ${req.body?.emoji || null}, ${Number(req.body?.price) || 0}, ${req.body?.sharePct != null ? Number(req.body.sharePct) : 50}) RETURNING *`)).rows[0]);
  }));
  app.delete("/api/v1/company/live-gifts/catalog/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "live_gifts", true); if (!a) return;
    await db.execute(sql`DELETE FROM bridge_gift_catalog WHERE id=${Number(req.params.id)} AND company_id=${a.companyId}`); res.json({ ok: true });
  }));
  app.post("/api/v1/company/live-gifts/send", route(async (req, res) => {
    const a = await requireModule(req, res, "live_gifts"); if (!a) return;
    const [g] = (await db.execute(sql`SELECT * FROM bridge_gift_catalog WHERE id=${Number(req.body?.giftId)} AND company_id=${a.companyId} LIMIT 1`)).rows as any[];
    if (!g) return res.status(404).json({ message: "Gift not found" });
    const toUserId = req.body?.toUserId || null;
    const share = Number(g.price) * Number(g.share_pct) / 100;
    const [s] = (await db.execute(sql`INSERT INTO bridge_gift_sends (company_id, gift_id, from_name, to_user_id, amount, performer_share) VALUES (${a.companyId}, ${g.id}, ${req.body?.fromName || null}, ${toUserId}, ${Number(g.price)}, ${share}) RETURNING *`)).rows as any[];
    if (toUserId) await sendBridgeXNotifications(a.companyId, [toUserId], { type: "kos_gift", title: `${g.emoji || "🎁"} You received ${g.name}!`, body: `${req.body?.fromName || "A guest"} sent you ${g.name}`, data: {} });
    res.status(201).json(s);
  }));
  app.get("/api/v1/company/live-gifts/leaderboard", route(async (req, res) => {
    const a = await requireModule(req, res, "live_gifts"); if (!a) return;
    const rows = (await db.execute(sql`
      SELECT COALESCE(NULLIF(trim(concat(u.first_name,' ',u.last_name)),''),u.email) performer, gs.to_user_id,
        COUNT(*) gifts, COALESCE(SUM(gs.amount),0) total, COALESCE(SUM(gs.performer_share),0) earned
      FROM bridge_gift_sends gs LEFT JOIN users u ON u.id=gs.to_user_id
      WHERE gs.company_id=${a.companyId} AND gs.to_user_id IS NOT NULL AND gs.created_at >= date_trunc('month', now())
      GROUP BY gs.to_user_id, performer ORDER BY total DESC LIMIT 50`)).rows as any[];
    res.json(rows.map((r) => ({ ...r, gifts: Number(r.gifts), total: Number(r.total), earned: Number(r.earned) })));
  }));

  // ── Lucky draw ────────────────────────────────────────────────────────────
  app.get("/api/v1/company/draws", route(async (req, res) => {
    const a = await requireModule(req, res, "lucky_draw"); if (!a) return;
    res.json((await db.execute(sql`SELECT d.*, (SELECT COALESCE(SUM(tickets),0) FROM bridge_draw_entries e WHERE e.draw_id=d.id) total_tickets FROM bridge_draws d WHERE d.company_id=${a.companyId} ORDER BY d.id DESC`)).rows || []);
  }));
  app.post("/api/v1/company/draws", route(async (req, res) => {
    const a = await requireModule(req, res, "lucky_draw", true); if (!a) return;
    const name = String(req.body?.name || "").trim(); if (!name) return res.status(400).json({ message: "Draw name is required" });
    res.status(201).json((await db.execute(sql`INSERT INTO bridge_draws (company_id, name, pool) VALUES (${a.companyId}, ${name}, ${Number(req.body?.pool) || 0}) RETURNING *`)).rows[0]);
  }));
  app.delete("/api/v1/company/draws/:id", route(async (req, res) => {
    const a = await requireModule(req, res, "lucky_draw", true); if (!a) return;
    await db.execute(sql`DELETE FROM bridge_draw_entries WHERE draw_id=${Number(req.params.id)} AND company_id=${a.companyId}`);
    await db.execute(sql`DELETE FROM bridge_draws WHERE id=${Number(req.params.id)} AND company_id=${a.companyId}`); res.json({ ok: true });
  }));
  app.get("/api/v1/company/draws/:id/entries", route(async (req, res) => {
    const a = await requireModule(req, res, "lucky_draw"); if (!a) return;
    res.json((await db.execute(sql`SELECT * FROM bridge_draw_entries WHERE draw_id=${Number(req.params.id)} AND company_id=${a.companyId} ORDER BY id DESC`)).rows || []);
  }));
  app.post("/api/v1/company/draws/:id/entries", route(async (req, res) => {
    const a = await requireModule(req, res, "lucky_draw", true); if (!a) return;
    const name = String(req.body?.name || "").trim(); if (!name) return res.status(400).json({ message: "Entrant name is required" });
    res.status(201).json((await db.execute(sql`INSERT INTO bridge_draw_entries (draw_id, company_id, name, tickets) VALUES (${Number(req.params.id)}, ${a.companyId}, ${name}, ${Math.max(1, Number(req.body?.tickets) || 1)}) RETURNING *`)).rows[0]);
  }));
  app.post("/api/v1/company/draws/:id/draw", route(async (req, res) => {
    const a = await requireModule(req, res, "lucky_draw", true); if (!a) return;
    const id = Number(req.params.id);
    const entries = (await db.execute(sql`SELECT * FROM bridge_draw_entries WHERE draw_id=${id} AND company_id=${a.companyId}`)).rows as any[];
    const pooled: string[] = []; for (const e of entries) for (let i = 0; i < Number(e.tickets); i++) pooled.push(e.name);
    if (!pooled.length) return res.status(400).json({ message: "No entries to draw from" });
    const winner = pooled[Math.floor(Math.random() * pooled.length)];
    const [d] = (await db.execute(sql`UPDATE bridge_draws SET status='drawn', winner_name=${winner} WHERE id=${id} AND company_id=${a.companyId} RETURNING *`)).rows as any[];
    res.json(d);
  }));

  // ── Payroll summary (base pay + booking commission) ───────────────────────
  app.get("/api/v1/company/payroll/summary", route(async (req, res) => {
    const a = await requireModule(req, res, "payroll", true); if (!a) return;
    const from = String(req.query.from || ""); const to = String(req.query.to || "");
    const rows = (await db.execute(sql`
      SELECT sp.user_id, sp.pay_type, sp.base_salary, sp.hourly_rate, sp.commission_rate,
        COALESCE(NULLIF(trim(concat(u.first_name,' ',u.last_name)),''),u.email) name,
        COALESCE((SELECT SUM(b.commission) FROM bridge_bookings b WHERE b.company_id=${a.companyId} AND b.staff_user_id=sp.user_id AND b.status='completed' ${from ? sql`AND b.starts_at >= ${from}::date` : sql``} ${to ? sql`AND b.starts_at < (${to}::date + interval '1 day')` : sql``}),0) commission,
        COALESCE((SELECT SUM(GREATEST(0, EXTRACT(EPOCH FROM (att.check_out_at - att.check_in_at))/3600 - att.break_seconds/3600.0)) FROM staff_attendance att WHERE att.company_id=${a.companyId} AND att.user_id=sp.user_id AND att.check_out_at IS NOT NULL ${from ? sql`AND att.work_date >= ${from}` : sql``} ${to ? sql`AND att.work_date <= ${to}` : sql``}),0) hours
      FROM bridge_staff_profiles sp LEFT JOIN users u ON u.id=sp.user_id
      WHERE sp.company_id=${a.companyId} AND sp.status='active' ORDER BY name`)).rows as any[];
    res.json(rows.map((r) => {
      const hours = Math.round(Number(r.hours) * 100) / 100;
      const base = r.pay_type === "salary" ? Number(r.base_salary) : hours * Number(r.hourly_rate);
      const commission = Number(r.commission);
      return { userId: r.user_id, name: r.name, payType: r.pay_type, baseSalary: Number(r.base_salary), hourlyRate: Number(r.hourly_rate), hours, base, commission, total: base + commission };
    }));
  }));

  // Attendance, shifts and leave are scoped by tenant and generate native alerts.
  app.get("/api/v1/company/attendance", route(async (req, res) => {
    const access = await companyAccess(req, res); if (!access) return;
    const userId = MANAGEMENT_ROLES.has(access.role) ? (req.query.userId ? String(req.query.userId) : null) : access.user.id;
    const bid = requestedBranchId(req);
    const parts = [eq(staffAttendance.companyId, access.companyId)];
    if (userId) parts.push(eq(staffAttendance.userId, userId));
    if (bid) parts.push(eq(staffAttendance.branchId, bid));
    res.json(await db.select().from(staffAttendance).where(and(...parts)).orderBy(desc(staffAttendance.id)).limit(200));
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
      const { userLang, pick } = await import("./i18n");
      const lang = await userLang(user.id);
      await sendRebornUserNotification(user.id, {
        type: "notifications_enabled",
        title: user.role === "admin" || user.role === "staff"
          ? pick(lang, { en: "Admin phone alerts enabled", zh: "管理员手机提醒已开启", id: "Notifikasi HP admin aktif" })
          : pick(lang, { en: "Phone alerts enabled", zh: "手机提醒已开启", id: "Notifikasi HP aktif" }),
        body: user.role === "admin" || user.role === "staff"
          ? pick(lang, { en: "New food orders, song requests and staff updates will pop up on this phone.", zh: "新的点餐、点歌请求和员工动态将在这部手机上弹出提醒。", id: "Pesanan makanan baru, permintaan lagu, dan kabar staf akan muncul di HP ini." })
          : pick(lang, { en: "Bookings, orders, messages and account updates will pop up on this phone.", zh: "预订、订单、消息和账户动态将在这部手机上弹出提醒。", id: "Booking, pesanan, pesan, dan kabar akun akan muncul di HP ini." }),
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
    const { userLang, pick, tr } = await import("./i18n");
    const lang = await userLang(user.id);
    const outcome = await sendRebornUserNotification(user.id, { type: "test", title: pick(lang, { en: "Reborn notifications are working", zh: "Reborn 通知运行正常", id: "Notifikasi Reborn berfungsi" }), body: pick(lang, { en: "You will receive live orders, gifts, messages and updates on this phone.", zh: "你将在这部手机上实时收到订单、礼物、消息和动态。", id: "Kamu akan menerima pesanan, hadiah, pesan, dan kabar terbaru secara langsung di HP ini." }), data: { path: "/profile" } });
    if (outcome?.status === "sent") return res.json({ message: tr(req, { en: "Test notification sent to your registered phone.", zh: "测试通知已发送到你登记的手机。", id: "Notifikasi uji telah dikirim ke HP terdaftarmu." }), ...outcome });
    if (outcome?.status === "no_device") return res.status(409).json({ message: tr(req, { en: "This phone isn't registered for alerts yet. Install the latest app, allow notifications, then reopen the app while signed in.", zh: "这部手机尚未登记接收提醒。请安装最新版应用、允许通知，然后在登录状态下重新打开应用。", id: "HP ini belum terdaftar untuk notifikasi. Pasang aplikasi versi terbaru, izinkan notifikasi, lalu buka ulang aplikasi dalam keadaan masuk." }), ...outcome });
    const reason = outcome?.errors?.[0] || tr(req, { en: "unknown", zh: "未知", id: "tidak diketahui" });
    const hint = /InvalidCredentials|FCM|credentials/i.test(reason) ? tr(req, { en: " Android push key (FCM) is missing in the Expo project.", zh: " Expo 项目中缺少安卓推送密钥（FCM）。", id: " Kunci push Android (FCM) belum diatur di proyek Expo." }) : "";
    res.status(502).json({ message: tr(req, { en: "Phone alert was rejected: {reason}.{hint}", zh: "手机提醒被拒绝：{reason}。{hint}", id: "Notifikasi HP ditolak: {reason}.{hint}" }, { reason, hint }), ...(outcome || {}) });
  }));
  app.get("/api/v1/app/notifications", route(async (req, res) => { const user = await requireUser(req, res); if (user) res.json(await db.select().from(bridgeNotifications).where(eq(bridgeNotifications.userId, user.id)).orderBy(desc(bridgeNotifications.id)).limit(100)); }));
  app.post("/api/v1/app/notifications/:id/read", route(async (req, res) => { const user = await requireUser(req, res); if (!user) return; res.json((await db.update(bridgeNotifications).set({ readAt: new Date() }).where(and(eq(bridgeNotifications.id, Number(req.params.id)), eq(bridgeNotifications.userId, user.id))).returning())[0]); }));
}
