// Reborn Wave gamified economy: pet lifecycle, spin-the-wheel, support/FAQ, admin config.
import { randomUUID } from "node:crypto";
import type { Express, Request, Response } from "express";
import { accrueEnergy } from "./petEnergy";
import { and, desc, eq, sql, inArray, isNotNull, isNull } from "drizzle-orm";
import { db } from "./db";
import { currentTenant, homeCompanySlug } from "./tenantContext";
import { registerClientErrorRoute } from "./errorWatch";
import { giftLevels, levelConfigs, levelCurve, MAX_LEVEL } from "./giftLevels";
import { getCheckinConfig, saveCheckinConfig, checkinState, doCheckin, checkinStats, CYCLE_DAYS, WEEK_DAYS } from "./dailyCheckin";
import { packageFields, memberWallet, quoteBill, spendPackageCredit, restorePackageCredit, issuePackages, refundPackagesOfTicket, takePackageUses, listActivePackages } from "./memberPackages";
import { companyCountry, companyMoney, roundMoney } from "./companyMoney";
import { formatMoneyIn } from "@shared/countries";
import { CUSTOM_PALETTE, DEFAULT_APP_SKIN, DEFAULT_CUSTOM_COLOURS, cleanAppColours, isAppFont, isAppSkin, isPaletteChoice } from "@shared/appSkins";
import { cleanPayrollRules, computeContributions, defaultPayrollRules, asResidency } from "@shared/payrollRules";
import { storage } from "./storage";
import { requireAuth, getUserId } from "./multiAuth";
import bcrypt from "bcryptjs";
import { sendEmail } from "./emailService";
import { getMetaSettings, saveMetaSettings, testMeta, connectTelegram, telegramStatus } from "./socialChat";
import { metaConnectStatus, metaConnectUrl, metaOAuthAvailable, metaPick, registerMetaConnect } from "./metaConnect";
import { crmRecordVisit, whatsappConfigured, whatsappAvailable, chatAvailable, waDigits, runReminders, runPackageReminders, getWhatsAppCloudSettings, saveWhatsAppCloudSettings, testWhatsAppCloud } from "./whatsappBot";
import { getWaWebStatus, startWhatsAppWeb, logoutWhatsAppWeb } from "./whatsappWeb";
import { sendAdminMessage, sendReviewRequest, notifyAdmins, sendWhatsApp, sendToMember, notifyBookingCancelledByMember, locationReply, langForPhone, waText, fmtDMY, timeText, fmtBookingWhen, localizeBookingText, memberWaPhone } from "./whatsappBot";
import { generateLayaSupportReply } from "./layaAgent";
import { sendRebornAllNotification, sendRebornUserNotification, sendBridgeXNotifications, emitCompanyChange } from "./bridgeX";
import { emitLiveUpdate } from "./liveUpdates";
import { searchSongCatalog, textPinyin } from "./songSearch";
import { TOP_SONGS_500 } from "./topSongs500";
import QRCode from "qrcode";
import { pushEnabled, getVapidPublicKey, savePushSubscription, removePushSubscription, sendPushToUser, sendPushToUsers, type PushPayload } from "./push";
import { createBooking, bookingHoursSummary, todayStr, parseAreas, enabledAreas, areaSlotsForDate, areaSlotLabelsForDate, areaHoursTextForDate, areaOpenHourForDate, isTableTaken, isAreaBlocked, takenTablesForDate, bookingWhen, tableCap, isDateFullyBooked, availableSlotsForDate, areasWithSpace, setBookingTimezone, setBookingRules, tableDayLockOn, getBookingTimezone, BLOCK_ALL, BOOKING_OCCASIONS, specialRequestText, mentionsBirthday, hasPaxLimit, releaseTableAfterPayment, atCustomerPlace, serviceAddressFrom } from "./booking";
import { tr, pick, asLang, localeOf, userLang, reqLang, faqIn, rememberPetName, DEFAULT_PET_NAME, type Lang } from "./i18n";
import { translateTexts } from "./autoTranslate";
import {
  pets, users, tokenTransactions, activationCodes, petPills,
  spinPrizes, spinResults, faqItems, supportTickets, supportMessages,
  kosGifts, songs, songRequests, friendships, chatMessages,
  appSettings, kosGiftTypes, adminLogs, topUpRequests, events,
  posProducts, posTickets, posTicketItems, stockMovements, ledgerEntries, bottleKeeps, crmContacts, crmMessages, appointments,
  staffAttendance, workerShifts, leaveRequests, bridgeCompanies, bridgeCompanyMembers, bridgePositions, bridgeStaffProfiles, bridgeStaffReviews, commissionHistory,
  venueCheckins, memberWalletTransactions,
} from "@shared/schema";
import { ilike, or } from "drizzle-orm";

// KGOLD economy defaults (admin-editable via app_settings)
const SETTINGS_DEFAULTS: Record<string, string> = {
  giftFeePercent: "30",     // % kept by the club; recipient gets the rest
  kgoldPerRp: "10",         // 10 KGOLD = 1 RP (1 RP → 10 KGOLD)
  minBuyKgold: "1000000",   // minimum KGOLD purchase
  minCashoutRp: "1000",     // minimum RP a member can cash out
  taxPercent: "0",          // POS sales tax %
  serviceFeePercent: "0",   // POS service charge %
  clubName: "Reborn Wave Group",
  receiptLogoUrl: "",       // data URL / image for receipts
  receiptFooter: "Thank you — see you again!",
  posAutoPrint: "false",    // open browser print dialog immediately after payment
  bookingImageUrl: "",      // legacy single floor-plan image (kept for back-compat)
  bookingNote: "",          // optional extra note shown with booking timings
  bookingTables: "V1,V2,1,2,3,4,5,T6,T7,T8,T9", // legacy single table list (back-compat)
  bookingAreas: "",         // JSON array of venue areas by level (empty → server defaults)
  googleReviewUrl: "",      // link sent after payment to collect a Google review
  businessAddress: "Ruko Oceanic Bliss, Jl. Pasir Putih Harbourfront – Batam Centre, Blok A No. 51, Sadai, Bengkong, Batam City, Riau Islands 29444",
  businessMapUrl: "",
  houseReferralUserId: "",  // admin account that owns un-referred signups (house commission)
  spinPoolPercent: "10",    // % of un-referred paid sales set aside into the Lucky Spin prize pool
  spinPoolMin: "1000000",   // spin only pays prizes when the pool is at/above this (min 1,000,000)
  spinPoolBalance: "0",     // current prize-pool reserve (auto: +contributions, -payouts)
  spinTokenCost: "1",       // tokens spent per spin (admin-set)
  spinAssumedBill: "500000", // representative bill used to estimate a %-voucher's pool cost
  mainAdminPassword: "",    // required to run the "reset numbers" action (set by the main admin)
  songRequestModeEnabled: "true",
  songQueueMode: "user",    // song turns go per member ("user") or per checked-in table ("table")
  songsPerTurn: "1",        // songs each member/table sings per turn (1–3)
  timezone: "Asia/Jakarta", // club country timezone — booking slots, "today" and WhatsApp reminders use this
  bottleExpiryDays: "90",   // days a kept bottle stays valid before it expires
  payrollDay: "1",          // day of month payroll is recorded/paid
  overtimeHourlyRate: "0",  // RP paid per hour worked past the scheduled shift end
  allowNegativeStock: "false", // let staff sell items even when stock hits 0 (goes negative)
  bookingTableDayLock: "false", // a table booked at any time is closed for the rest of that day
  bookingAskHours: "true",      // ask guests how many hours they'll stay (off → default 2 hours)
  bookingAskSpecial: "true",
  bookingLastTime: "",          // "HH:MM" — no booking start times from this time onward (areas can override)    // ask guests for a special request (birthday, company event, note)
  appAndroidUrl: "https://expo.dev/artifacts/eas/0YiA8OVhLT7Ri54Uvn0Xe9j8x1aH_w84jTMgSmqiHts.apk", // where /download/android sends people (EAS build 16, expires 2026-10-14; admin Settings override)
  appIosUrl: "",                // where /download/ios sends people (App Store / TestFlight link)
  // Gift levels (KOS): Lv.2 needs `Base` KGOLD in total, each next level `Growth` × that (2 = double), or an exact list.
  giftLevelSenderBase: "1000000", giftLevelSenderGrowth: "2", giftLevelSenderList: "",
  giftLevelReceiverBase: "1000000", giftLevelReceiverGrowth: "2", giftLevelReceiverList: "",
  petName: DEFAULT_PET_NAME, // what the pet is called everywhere in the app
  petImageUrl: "",          // the company's own pet picture (empty → Doluruu)
  petEggImageUrl: "",       // the company's own egg / blind-box picture
};
async function getSettings() {
  const rows = await db.select().from(appSettings);
  // Another company starts from its own name, not Reborn's name, address and app download.
  const tenant = currentTenant();
  const defaults = tenant ? { ...SETTINGS_DEFAULTS, clubName: tenant.name || SETTINGS_DEFAULTS.clubName, businessAddress: "", appAndroidUrl: "" } : SETTINGS_DEFAULTS;
  const map: Record<string, string> = { ...defaults };
  for (const r of rows) if (r.key in map || true) map[r.key] = r.value ?? map[r.key];
  const companySettingsResult = await db.execute(sql`SELECT s.config FROM bridge_company_settings s JOIN bridge_companies c ON c.id=s.company_id WHERE c.slug=${homeCompanySlug()} LIMIT 1`);
  const companyConfig: any = (companySettingsResult.rows || companySettingsResult as any)[0]?.config || {};
  rememberPetName(map.petName?.trim() || DEFAULT_PET_NAME);
  return {
    giftFeePercent: Number(map.giftFeePercent) || 30,
    kgoldPerRp: Number(map.kgoldPerRp) || 100,
    minBuyKgold: Number(map.minBuyKgold) || 1000000,
    minCashoutRp: Number(map.minCashoutRp) || 1000,
    taxPercent: Number(map.taxPercent) || 0,
    serviceFeePercent: Number(map.serviceFeePercent) || 0,
    clubName: map.clubName || defaults.clubName,
    receiptLogoUrl: map.receiptLogoUrl || "",
    receiptFooter: map.receiptFooter || "",
    posAutoPrint: map.posAutoPrint === "true",
    bookingImageUrl: map.bookingImageUrl || "",
    bookingNote: map.bookingNote || "",
    bookingTables: map.bookingTables || "V1,V2,1,2,3,4,5,T6,T7,T8,T9",
    bookingAreas: map.bookingAreas || "",
    googleReviewUrl: map.googleReviewUrl || "",
    businessAddress: map.businessAddress || defaults.businessAddress,
    businessMapUrl: map.businessMapUrl || "",
    houseReferralUserId: map.houseReferralUserId || "",
    spinPoolPercent: Number(map.spinPoolPercent) || 10,
    spinPoolMin: Math.max(1000000, Number(map.spinPoolMin) || 1000000),
    spinPoolBalance: Number(map.spinPoolBalance) || 0,
    spinTokenCost: Math.max(1, Number(map.spinTokenCost) || 1),
    spinAssumedBill: Math.max(0, Number(map.spinAssumedBill) || 500000),
    mainAdminPassword: map.mainAdminPassword || "",
    songRequestModeEnabled: map.songRequestModeEnabled !== "false",
    songQueueMode: map.songQueueMode === "table" ? "table" : "user",
    songsPerTurn: Math.min(3, Math.max(1, Math.floor(Number(map.songsPerTurn) || 1))),
    timezone: map.timezone || "Asia/Jakarta",
    bottleExpiryDays: Math.max(1, Number(map.bottleExpiryDays) || 90),
    payrollDay: Math.min(28, Math.max(1, Number(map.payrollDay) || 1)),
    overtimeHourlyRate: Math.max(0, Number(map.overtimeHourlyRate) || 0),
    allowNegativeStock: map.allowNegativeStock === "true",
    bookingTableDayLock: map.bookingTableDayLock === "true",
    bookingAskHours: map.bookingAskHours !== "false",
    bookingAskSpecial: map.bookingAskSpecial !== "false",
    bookingLastTime: map.bookingLastTime || "",
    appAndroidUrl: map.appAndroidUrl || defaults.appAndroidUrl,
    appIosUrl: map.appIosUrl || SETTINGS_DEFAULTS.appIosUrl,
    giftLevelSenderBase: Math.max(1, Number(map.giftLevelSenderBase) || 1000000),
    giftLevelSenderGrowth: Math.min(10, Math.max(1, Number(map.giftLevelSenderGrowth) || 2)),
    giftLevelSenderList: map.giftLevelSenderList || "",
    giftLevelReceiverBase: Math.max(1, Number(map.giftLevelReceiverBase) || 1000000),
    giftLevelReceiverGrowth: Math.min(10, Math.max(1, Number(map.giftLevelReceiverGrowth) || 2)),
    giftLevelReceiverList: map.giftLevelReceiverList || "",
    petName: map.petName?.trim() || DEFAULT_PET_NAME,
    petImageUrl: map.petImageUrl || "",
    petEggImageUrl: map.petEggImageUrl || "",
    loyalty: companyConfig.loyalty || { pointsSpendRp: 1000, rewardsEnabled: true, tiers: [] },
  };
}

// ── Notifications in each recipient's own language ─────────────────────────
// Numbers formatted the way the reader expects (1,000 / 1.000).
const fmtN = (n: number, lang: Lang) => Number(n || 0).toLocaleString(localeOf(lang));
type LangText = (lang: Lang) => { title: string; body: string };
// Group user ids by their saved language.
async function idsByLang(ids: string[]): Promise<Map<Lang, string[]>> {
  const out = new Map<Lang, string[]>();
  const uniq = Array.from(new Set(ids.filter(Boolean)));
  if (!uniq.length) return out;
  const rows = await db.select({ id: users.id, l: users.preferredLanguage }).from(users).where(inArray(users.id, uniq));
  const langOf = new Map<string, Lang>(rows.map((r) => [r.id, asLang(r.l)] as [string, Lang]));
  for (const id of uniq) { const l = langOf.get(id) || "en"; (out.get(l) || out.set(l, []).get(l)!).push(id); }
  return out;
}
// In-app + phone notification to one member, in their language.
async function notifyUserI18n(userId: string | null | undefined, type: string, text: LangText, data?: Record<string, unknown>) {
  if (!userId) return;
  const lang = await userLang(userId);
  return sendRebornUserNotification(userId, { type, ...text(lang), data });
}
// Web push to one member, in their language.
async function pushUserI18n(userId: string | null | undefined, make: (lang: Lang) => PushPayload) {
  if (!userId) return 0;
  return sendPushToUser(userId, make(await userLang(userId)));
}
// Same recipients as sendRebornStaffNotification, each in their own language.
export async function notifyStaffI18n(type: string, text: LangText, data?: Record<string, unknown>, opts?: { adminsOnly?: boolean }) {
  const company = (await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.slug, homeCompanySlug())).limit(1))[0];
  if (!company) return;
  if (opts?.adminsOnly) { // main admins only (e.g. error alerts — Admin › Errors is admin-only)
    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
    for (const [lang, ids] of Array.from(await idsByLang(admins.map((a) => a.id)))) await sendBridgeXNotifications(company.id, ids, { type, ...text(lang), data });
    return;
  }
  const members = await db.select({ userId: bridgeCompanyMembers.userId }).from(bridgeCompanyMembers).where(and(
    eq(bridgeCompanyMembers.companyId, company.id),
    eq(bridgeCompanyMembers.status, "active"),
    inArray(bridgeCompanyMembers.role, ["owner", "admin", "manager", "staff"]),
  ));
  const roleUsers = await db.select({ id: users.id }).from(users).where(inArray(users.role, ["admin", "staff"]));
  const groups = await idsByLang([...members.map((m) => m.userId), ...roleUsers.map((u) => u.id)]);
  for (const [lang, ids] of Array.from(groups)) await sendBridgeXNotifications(company.id, ids, { type, ...text(lang), data });
  emitCompanyChange(company.id, String(data?.path || "notifications"));
}
// Same recipients as sendRebornAllNotification (every user), each in their own language.
async function notifyAllI18n(type: string, text: LangText, data?: Record<string, unknown>) {
  const company = (await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.slug, homeCompanySlug())).limit(1))[0];
  if (!company) return;
  const allUsers = await db.select({ id: users.id }).from(users);
  const groups = await idsByLang(allUsers.map((u) => u.id));
  for (const [lang, ids] of Array.from(groups)) await sendBridgeXNotifications(company.id, ids, { type, ...text(lang), data });
  emitCompanyChange(company.id, String(data?.path || "notifications"));
}
// Same recipients as sendPushToAdmins (staff + admins), each in their own language.
export async function pushAdminsI18n(make: (lang: Lang) => PushPayload) {
  const admins = await db.select({ id: users.id }).from(users).where(inArray(users.role, ["staff", "admin"]));
  let sent = 0;
  for (const [lang, ids] of Array.from(await idsByLang(admins.map((a) => a.id)))) sent += await sendPushToUsers(ids, make(lang));
  return sent;
}

// ── Multi-tenant resolver ────────────────────────────────────────────────────
// Resolves which business a request belongs to, so the same app serves every
// company. Order: explicit tenant header → request host (custom domain) →
// the flagship Reborn company as the default. Cached briefly to avoid a lookup
// on every call. When nothing matches (localhost, railway host, no header) it
// returns Reborn, so existing behaviour is unchanged.
const _tenantCache = new Map<string, { row: any; at: number }>();
// The home company of each data space (Reborn on the platform, the tenant in its own space), by slug.
const _homeCache = new Map<string, { row: any; at: number }>();
async function rebornDefault() {
  const _rebornCache = _homeCache.get(homeCompanySlug());
  if (_rebornCache && Date.now() - _rebornCache.at < 60000) return _rebornCache.row;
  const row = (await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.slug, homeCompanySlug())).limit(1))[0] || null;
  _homeCache.set(homeCompanySlug(), { row, at: Date.now() });
  return row;
}
async function companyForReq(req: Request) {
  // Inside a company's own data space there is exactly one company: its own.
  if (currentTenant()) return rebornDefault();
  const slug = String(req.header("x-tenant-slug") || "").toLowerCase().trim();
  const idHdr = Number(req.header("x-tenant-id")) || 0;
  const host = String(req.hostname || "").toLowerCase().split(":")[0];
  // The platform's own hosts are never a tenant domain → use the default.
  const isPlatformHost = !host || host === "localhost" || host.endsWith("railway.app") || host.endsWith("rebornwave.group");
  const key = idHdr ? `id:${idHdr}` : slug ? `slug:${slug}` : `host:${host}`;
  const hit = _tenantCache.get(key);
  if (hit && Date.now() - hit.at < 60000) return hit.row;
  let row: any = null;
  if (idHdr) row = (await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.id, idHdr)).limit(1))[0];
  if (!row && slug) row = (await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.slug, slug)).limit(1))[0];
  if (!row && host && !isPlatformHost) row = (await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.websiteDomain, host)).limit(1))[0];
  if (!row) row = await rebornDefault();
  _tenantCache.set(key, { row, at: Date.now() });
  return row || null;
}
// Company row for a request (tenant-aware); pass req to scope, omit for default.
async function rebornCompany(req?: Request) {
  if (req) return companyForReq(req);
  return rebornDefault();
}
// Convenience: the resolved company id for a request (0 if none).
async function rebornCompanyId(req?: Request): Promise<number> {
  const c = await rebornCompany(req);
  return c?.id || 0;
}

// Workplace attendance QR code (staff scan to clock in). Persisted; admin can rotate.
async function currentAttendCode(): Promise<string> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, "attendCode"));
  if (row?.value) return row.value;
  return rotateAttendCode();
}
async function rotateAttendCode(): Promise<string> {
  const code = randomVenueCode() + randomVenueCode();
  await db.insert(appSettings).values({ key: "attendCode", value: code, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: code, updatedAt: new Date() } });
  return code;
}

// A stored poster (data URL) → a cacheable link that changes whenever the poster does.
function eventImageLink(e: { id: number; imageUrl: string | null }): string | null {
  if (!e.imageUrl || !e.imageUrl.startsWith("data:")) return e.imageUrl;
  let h = 0; for (let i = 0; i < e.imageUrl.length; i += 97) h = (h * 31 + e.imageUrl.charCodeAt(i)) | 0;
  return `/api/reborn/events/${e.id}/image?v=${(h >>> 0).toString(36)}${e.imageUrl.length.toString(36)}`;
}
// Event dates are plain YYYY-MM-DD (or null = an ongoing announcement).
function isoDay(v: any): string | null { const s = String(v || "").trim(); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null; }
// Active events that haven't ended, nearest first (undated announcements last).
// With `on`, only events happening that day.
export async function upcomingEvents(on?: string) {
  const today = todayStr();
  const rows = await db.select().from(events).where(eq(events.active, true)).orderBy(desc(events.sortOrder), desc(events.createdAt)).limit(100);
  const last = (e: typeof rows[number]) => e.endDate && e.startDate && e.endDate >= e.startDate ? e.endDate : e.startDate;
  const live = rows.filter((e) => !e.startDate || (last(e) || "") >= today);
  const list = on ? live.filter((e) => e.startDate && e.startDate <= on && on <= (last(e) || "")) : live;
  return list.sort((a, b) => (a.startDate ? 0 : 1) - (b.startDate ? 0 : 1) || String(a.startDate || "").localeCompare(String(b.startDate || ""))).slice(0, 30);
}

// The venue day runs 08:00 → 08:00 (WIB); at 8am everyone is checked out.
const VENUE_DAY_START_HOUR = 8;
async function ensureVenueSession(rotate = false) {
  const day = wibDay(new Date(Date.now() - VENUE_DAY_START_HOUR * 3600_000));
  const rows = await db.select().from(appSettings).where(inArray(appSettings.key, ["venueSessionDay", "venueSessionCode"]));
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value || ""]));
  let code = values.venueSessionCode;
  if (rotate || values.venueSessionDay !== day || !code) {
    // New venue day (8am): everyone from earlier days is checked out of KOS.
    if (values.venueSessionDay !== day) await db.update(venueCheckins).set({ checkedOutAt: new Date() }).where(and(sql`${venueCheckins.venueDay} <> ${day}`, sql`${venueCheckins.checkedOutAt} IS NULL`));
    code = randomVenueCode();
    for (const [key, value] of [["venueSessionDay", day], ["venueSessionCode", code]]) {
      await db.insert(appSettings).values({ key, value, updatedAt: new Date() })
        .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
    }
  }
  return { day, code };
}

function randomVenueCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// A table's bill was paid: once no other bill is open at that table, the guest has
// left — their booking stops holding the table so it can be booked again tonight.
async function freeTableAfterBill(companyId: number | null, table: string | null | undefined) {
  const label = String(table || "").trim();
  if (!label) return;
  try {
    const open = await db.select({ id: posTickets.id }).from(posTickets).where(and(eq(posTickets.status, "open"), eq(posTickets.tableNumber, label), ...(companyId ? [eq(posTickets.companyId, companyId)] : []))).limit(1);
    if (open.length) return; // the table still has an open bill
    const released = await releaseTableAfterPayment(label);
    if (released) emitLiveUpdate("/api/reborn/admin/bookings", { action: "TABLE_FREED" });
  } catch (e) { console.warn("free table after bill", e); }
}
// Venue day (08:00 → 08:00 WIB) of a stored UTC timestamp: +7h for WIB, −8h for the 8am start.
const VENUE_DAY_OF = (col: any) => sql`(${col} - interval '1 hour')::date`;
async function buildDailyClosingReport(day: string) {
  const tickets = await db.select().from(posTickets).where(and(
    eq(posTickets.status, "paid"),
    sql`${VENUE_DAY_OF(sql`${posTickets.paidAt}`)} = ${day}::date`,
  ));
  const ids = tickets.map((ticket) => ticket.id);
  const sold = ids.length ? await db.select({
    productId: posTicketItems.productId,
    name: posTicketItems.name,
    qty: posTicketItems.qty,
    lineTotal: posTicketItems.lineTotal,
    unitCost: posProducts.cost,
  }).from(posTicketItems).leftJoin(posProducts, eq(posTicketItems.productId, posProducts.id)).where(and(
    inArray(posTicketItems.orderId, ids),
    sql`${posTicketItems.status} <> 'rejected'`,
  )) : [];
  const grouped = new Map<string, { name: string; quantity: number; sales: number; cost: number }>();
  for (const item of sold) {
    const key = `${item.productId || "custom"}:${item.name}`;
    const row = grouped.get(key) || { name: item.name, quantity: 0, sales: 0, cost: 0 };
    row.quantity += Number(item.qty) || 0;
    row.sales += Number(item.lineTotal) || 0;
    row.cost += (Number(item.unitCost) || 0) * (Number(item.qty) || 0);
    grouped.set(key, row);
  }
  const totals = tickets.reduce((sum, ticket) => {
    sum.subtotal += Number(ticket.subtotal) || 0;
    sum.discount += Number(ticket.discount) || 0;
    sum.serviceFee += Number(ticket.serviceFee) || 0;
    sum.tax += Number(ticket.tax) || 0;
    sum.revenue += Number(ticket.total) || 0;
    const pkg = Number(ticket.packageCreditUsed) || 0; // paid with package credit (its money came in when the package was sold)
    const paid = (Number(ticket.total) || 0) - pkg;
    sum.packageCredit += pkg;
    if (ticket.paymentMethod === "cash") sum.cash += paid;
    if (ticket.paymentMethod === "card") sum.card += paid;
    if (ticket.paymentMethod === "credits") sum.credits += paid;
    return sum;
  }, { subtotal: 0, discount: 0, serviceFee: 0, tax: 0, revenue: 0, cash: 0, card: 0, credits: 0, packageCredit: 0 });
  const items = Array.from(grouped.values()).sort((a, b) => b.sales - a.sales);
  const cost = items.reduce((sum, item) => sum + item.cost, 0);
  return { day, closedAt: new Date().toISOString(), ticketCount: tickets.length, items, totals: { ...totals, cost, profit: totals.revenue - totals.tax - cost } };
}
// Pay a POS bill from the member's RP credits: one atomic UPDATE that only
// succeeds when the balance covers it. Returns the new balance, or null (+ current
// balance) when there isn't enough. Credits were booked as income at top-up, so
// the sale itself adds no second income entry to the ledger.
async function payWithCredits(userId: string, total: number, orderNo: string, ticketId: number): Promise<{ ok: true; balance: number } | { ok: false; balance: number }> {
  const [row] = await db.update(users).set({ credits: sql`${users.credits} - ${total}`, updatedAt: new Date() })
    .where(and(eq(users.id, userId), sql`${users.credits} >= ${total}`)).returning({ credits: users.credits });
  if (!row) { const [u] = await db.select({ credits: users.credits }).from(users).where(eq(users.id, userId)); return { ok: false, balance: Number(u?.credits || 0) }; }
  await db.insert(memberWalletTransactions).values({ userId, type: "pos_payment", rpAmount: String(-total), kgoldAmount: 0, description: `Paid bill ${orderNo} with RP credits`, referenceType: "pos_order", referenceId: String(ticketId) });
  return { ok: true, balance: Number(row.credits) };
}
const posMethod = (m: any) => (m === "card" ? "card" : m === "credits" ? "credits" : "cash");
// "package" = the whole bill was paid with package credit (server/memberPackages.ts).
const methodLabel = (m: string, lang: Lang) => m === "card" ? pick(lang, { en: "CARD", zh: "刷卡", id: "KARTU" }) : m === "credits" ? pick(lang, { en: "RP CREDITS", zh: "RP 余额", id: "KREDIT RP" }) : m === "package" ? pick(lang, { en: "PACKAGE CREDIT", zh: "套餐余额", id: "KREDIT PAKET" }) : pick(lang, { en: "CASH", zh: "现金", id: "TUNAI" });
const notEnoughCredits = (req: Request, total: number, balance: number) => tr(req, { en: "Not enough RP credits: the bill is RP {n}, the member has RP {b}.", zh: "RP 余额不足：账单 RP {n}，会员余额 RP {b}。", id: "Kredit RP tidak cukup: tagihan RP {n}, saldo member RP {b}." }, { n: fmtN(total, reqLang(req)), b: fmtN(balance, reqLang(req)) });

// Contribute the pool % only for UN-referred buyers (a referred buyer's 10% is their
// referrer's commission instead). House-account referrals count as un-referred.
async function contributeSpinPoolIfUnreferred(userId: string | null | undefined, saleTotal: number) {
  try {
    if (!userId) return;
    const [u] = await db.select({ ref: users.referredById }).from(users).where(eq(users.id, userId));
    const houseId = (await db.select().from(appSettings).where(eq(appSettings.key, "houseReferralUserId")))[0]?.value || "";
    const referred = u?.ref && u.ref !== houseId;
    if (!referred) await contributeSpinPool(saleTotal);
  } catch (e) { console.error("pool unreferred", e); }
}
// Prize-pool helpers (stored in app_settings.spinPoolBalance as a number string).
async function getSpinPool(): Promise<number> {
  const [r] = await db.select().from(appSettings).where(eq(appSettings.key, "spinPoolBalance"));
  return Number(r?.value) || 0;
}
async function adjustSpinPool(delta: number): Promise<number> {
  await db.insert(appSettings).values({ key: "spinPoolBalance", value: String(Math.max(0, delta)), updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: sql`GREATEST(0, COALESCE(${appSettings.value}::numeric,0) + ${delta})::text`, updatedAt: new Date() } });
  return getSpinPool();
}
async function setSpinPool(value: number): Promise<void> {
  await db.insert(appSettings).values({ key: "spinPoolBalance", value: String(Math.max(0, value)), updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: String(Math.max(0, value)), updatedAt: new Date() } });
}
// Contribute a % of a paid sale into the prize pool (called from POS/app pay).
async function contributeSpinPool(saleTotal: number) {
  try {
    const pct = Number((await db.select().from(appSettings).where(eq(appSettings.key, "spinPoolPercent")))[0]?.value) || 10;
    const add = Math.round(saleTotal * pct / 100);
    if (add > 0) await adjustSpinPool(add);
  } catch (e) { console.error("spin pool contribute", e); }
}
const DEFAULT_GIFT_TYPES = [
  { name: "Rose", emoji: "🌹", animation: "rose", kgoldCost: 100, sortOrder: 0 },
  { name: "Heart", emoji: "❤️", animation: "heart", kgoldCost: 500, sortOrder: 1 },
  { name: "Fireworks", emoji: "🎆", animation: "fireworks", kgoldCost: 5000, sortOrder: 2 },
  { name: "Diamond", emoji: "💎", animation: "diamonds", kgoldCost: 20000, sortOrder: 3 },
  { name: "Crown", emoji: "👑", animation: "crown", kgoldCost: 100000, sortOrder: 4 },
  { name: "Sports Car", emoji: "🏎️", animation: "car", kgoldCost: 500000, sortOrder: 5 },
  ...NEW_GIFT_TYPES_V2(),
];
// Big gifts added later (each with its own full-screen scene + sound). Added once
// to every venue that already has gifts (`giftsV2Added_<company>` flag), so an
// admin who deletes one doesn't get it back.
function NEW_GIFT_TYPES_V2() {
  return [
    { name: "Kiss", emoji: "💋", animation: "kiss", kgoldCost: 250000, sortOrder: 6 },
    { name: "Doluruu Thumbs Up", emoji: "👍", animation: "thumbsup", kgoldCost: 750000, sortOrder: 7 },
    { name: "Lion Roar", emoji: "🦁", animation: "lion", kgoldCost: 1250000, sortOrder: 8 },
    { name: "Big Whale", emoji: "🐋", animation: "whale", kgoldCost: 1750000, sortOrder: 9 },
    { name: "Rocket", emoji: "🚀", animation: "rocket", kgoldCost: 1000000000, sortOrder: 10 },
  ];
}
// Runs once per venue at a time: the gift list is loaded by many phones at once,
// and each used to add the new gifts again (duplicates). Now one in-process run
// per venue + an atomic "claim" of the flag row, so only one request ever adds them.
const giftSeedRuns = new Map<string, Promise<void>>();
function seedGiftTypesIfEmpty(companyId?: number): Promise<void> {
  const key = String(companyId ?? "all");
  const running = giftSeedRuns.get(key);
  if (running) return running;
  const run = seedGiftTypesOnce(companyId).finally(() => giftSeedRuns.delete(key));
  giftSeedRuns.set(key, run);
  return run;
}
async function claimFlag(flag: string): Promise<boolean> {
  const rows = await db.insert(appSettings).values({ key: flag, value: "1", updatedAt: new Date() }).onConflictDoNothing().returning({ key: appSettings.key });
  return rows.length > 0;
}
async function seedGiftTypesOnce(companyId?: number) {
  const cond = companyId ? eq(kosGiftTypes.companyId, companyId) : undefined;
  const existing = await db.select({ id: kosGiftTypes.id }).from(kosGiftTypes).where(cond as any).limit(1);
  if (existing.length === 0) {
    if (await claimFlag(`giftsSeeded_${companyId ?? "all"}`)) await db.insert(kosGiftTypes).values(DEFAULT_GIFT_TYPES.map((g) => ({ ...g, companyId: companyId ?? null })));
    await claimFlag(`giftsV2Added_${companyId ?? "all"}`); // defaults already include the new gifts
    return;
  }
  if (!(await claimFlag(`giftsV2Added_${companyId ?? "all"}`))) return; // added before (or right now by another request)
  const names = new Set((await db.select({ name: kosGiftTypes.name }).from(kosGiftTypes).where(cond as any)).map((r) => r.name));
  const add = NEW_GIFT_TYPES_V2().filter((g) => !names.has(g.name));
  if (add.length) await db.insert(kosGiftTypes).values(add.map((g) => ({ ...g, companyId: companyId ?? null })));
}
// One-off cleanup of the duplicate gifts that race created: keep the oldest of each
// (venue, name, price); gifts already sent are moved onto the one we keep.
async function dedupeGiftTypes() {
  try {
    await db.execute(sql`UPDATE kos_gifts g SET gift_type_id = k.keep FROM (
        SELECT id, MIN(id) OVER (PARTITION BY company_id, name, kgold_cost) AS keep FROM kos_gift_types) k
      WHERE g.gift_type_id = k.id AND k.id <> k.keep`);
    const r: any = await db.execute(sql`DELETE FROM kos_gift_types t USING kos_gift_types k
      WHERE t.company_id IS NOT DISTINCT FROM k.company_id AND t.name = k.name AND t.kgold_cost = k.kgold_cost AND t.id > k.id`);
    const n = r?.rowCount ?? 0;
    if (n) console.log(`[kos] removed ${n} duplicate gift types`);
  } catch (e) { console.warn("[kos] dedupe gift types", e); }
}

const LIFE_DAYS = 15;
const FEEDS_PER_DAY = 2;
const EGG_HATCH_DAYS = 15;
const SPIN_COST = 1;
const DAY_MS = 24 * 60 * 60 * 1000;
const FEED_GAP_MS = 4 * 60 * 60 * 1000;    // pet gets hungry ~every 4h; feeds must be spaced
const TOKEN_CYCLE_MS = 24 * 60 * 60 * 1000; // 2 feeds within this rolling window = 1 token
const MAX_PETS = 2;                 // living pets a member can hold at once
const DECAY_PER_MIN = 100 / 240;    // stats fall 100 → 0 over 4 hours
const ACTION_ENERGY_COST = 10;      // feed/play/clean each cost energy
const STAT_GAIN = 50;               // play/clean raise their bar by 50%
const FEED_GAIN = 50;               // each feed raises hunger by 50% (feed to full any time)
const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

// Day string in Indonesia time (WIB, UTC+7) so daily resets align with the club.
function wibDay(d: Date = new Date()): string {
  return new Date(d.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
const addDays = (n: number, from: Date = new Date()) => new Date(from.getTime() + n * DAY_MS);
const daysLeft = (until: Date | null) =>
  until ? Math.max(0, Math.ceil((new Date(until).getTime() - Date.now()) / DAY_MS)) : 0;

async function isAdmin(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const u = await storage.getUser(userId);
  return u?.role === "admin";
}
function requireAdmin(handler: (req: Request, res: Response) => Promise<any>) {
  return async (req: Request, res: Response) => {
    const uid = getUserId(req);
    if (!(await isAdmin(uid))) return res.status(403).json({ message: tr(req, { en: "Admin only", zh: "仅限管理员", id: "Khusus admin" }) });
    return handler(req, res);
  };
}
// Staff (sub-admin) OR full admin — for day-to-day approvals
async function isStaff(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const u = await storage.getUser(userId);
  return u?.role === "admin" || u?.role === "staff";
}
function requireStaff(handler: (req: Request, res: Response) => Promise<any>) {
  return async (req: Request, res: Response) => {
    const uid = getUserId(req);
    if (!(await isStaff(uid))) return res.status(403).json({ message: tr(req, { en: "Staff only", zh: "仅限员工", id: "Khusus staf" }) });
    return handler(req, res);
  };
}
// Admin-panel role: "admin" (main admin), "manager" (staff account whose company
// role is manager — staff tabs + daily sales), "staff", or "user".
async function adminRole(userId: string | null): Promise<"admin" | "manager" | "staff" | "user"> {
  if (!userId) return "user";
  const u = await storage.getUser(userId);
  if (u?.role === "admin") return "admin";
  if (u?.role !== "staff") return "user";
  const r = await db.execute(sql`SELECT m.role FROM bridge_company_members m JOIN bridge_companies c ON c.id=m.company_id WHERE c.slug=${homeCompanySlug()} AND m.user_id=${userId} LIMIT 1`);
  const role = ((r as any).rows || r)[0]?.role;
  return role === "manager" || role === "owner" || role === "admin" ? "manager" : "staff";
}
function requireManager(handler: (req: Request, res: Response) => Promise<any>) {
  return async (req: Request, res: Response) => {
    const role = await adminRole(getUserId(req));
    if (role !== "admin" && role !== "manager") return res.status(403).json({ message: tr(req, { en: "Manager or admin only", zh: "仅限经理或管理员", id: "Khusus manajer atau admin" }) });
    return handler(req, res);
  };
}
// Audit log: who did what
async function logAdmin(req: Request, o: { targetUserId?: string; targetType: string; targetId?: string; action: string; entityType: string; oldValues?: any; newValues?: any; description: string }) {
  try {
    await db.insert(adminLogs).values({
      adminUserId: getUserId(req)!, targetUserId: o.targetUserId || null, targetType: o.targetType,
      targetId: o.targetId ? String(o.targetId) : null, action: o.action, entityType: o.entityType,
      oldValues: o.oldValues ?? null, newValues: o.newValues ?? null, description: o.description,
      ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.ip || null,
      userAgent: req.headers["user-agent"] || null,
    });
  } catch (e) { console.error("logAdmin", e); }
}

// Resolve a pet's live state: hatch eggs, mark expired pets sick, and apply
// Tamagotchi stat decay (hunger/joy/cleanliness fall to 0 over 4h; energy
// regenerates while sleeping, otherwise decays). Persists the computed values.
async function refreshPet(pet: any) {
  const now = new Date();
  if (pet.isEgg) {
    if (pet.hatchAt && new Date(pet.hatchAt).getTime() <= now.getTime()) {
      const patch = {
        isEgg: false, name: "Doluruu", activatedAt: now, expiresAt: addDays(LIFE_DAYS, now),
        lifeStatus: "active", feedsToday: 0, lastFeedDay: null,
        hunger: 70, happiness: 70, cleanliness: 70, energy: 70, isSleeping: false,
        lastDecayTime: now, updatedAt: now,
      };
      await db.update(pets).set(patch).where(eq(pets.id, pet.id));
      return { ...pet, ...patch };
    }
    return pet;
  }

  let lifeStatus = pet.lifeStatus || "active";
  if (pet.expiresAt && new Date(pet.expiresAt).getTime() < now.getTime() && lifeStatus === "active") lifeStatus = "sick";

  const anchor = pet.lastDecayTime ? new Date(pet.lastDecayTime) : new Date(pet.updatedAt || now);
  const mins = Math.max(0, (now.getTime() - anchor.getTime()) / 60000);
  let hunger = pet.hunger ?? 60, happiness = pet.happiness ?? 60, cleanliness = pet.cleanliness ?? 60;
  // Energy has its own clock (see petEnergy.ts): +5/hour resting, +5/10 min asleep.
  const acc = accrueEnergy(pet.energy ?? 60, !!pet.isSleeping, pet.lastEnergyUpdate, now);
  const energy = acc.energy;
  const energyChanged = energy !== pet.energy || !pet.lastEnergyUpdate || acc.anchor.getTime() !== new Date(pet.lastEnergyUpdate).getTime();
  if (mins >= 1) {
    hunger = clamp(hunger - mins * DECAY_PER_MIN);
    happiness = clamp(happiness - mins * DECAY_PER_MIN);
    cleanliness = clamp(cleanliness - mins * DECAY_PER_MIN);
    await db.update(pets).set({ hunger, happiness, cleanliness, energy, lastEnergyUpdate: acc.anchor, lifeStatus, lastDecayTime: now, updatedAt: now }).where(eq(pets.id, pet.id));
  } else if (lifeStatus !== pet.lifeStatus || energyChanged) {
    await db.update(pets).set({ lifeStatus, energy, lastEnergyUpdate: acc.anchor, updatedAt: now }).where(eq(pets.id, pet.id));
  }
  return { ...pet, hunger, happiness, cleanliness, energy, lastEnergyUpdate: acc.anchor, lifeStatus };
}

function petView(pet: any) {
  const now = Date.now();
  // lastFeedDay stores the current token-cycle start (ISO); feedsToday = feeds in cycle
  const cycleStart = pet.lastFeedDay ? new Date(pet.lastFeedDay).getTime() : 0;
  const cycleActive = !!cycleStart && now - cycleStart < TOKEN_CYCLE_MS;
  const feedsInCycle = cycleActive ? (pet.feedsToday || 0) : 0;
  const cycleMsLeft = cycleActive ? Math.max(0, cycleStart + TOKEN_CYCLE_MS - now) : 0;
  const lastFed = pet.lastFedAt ? new Date(pet.lastFedAt).getTime() : 0;
  const nextFeedMs = lastFed ? Math.max(0, lastFed + FEED_GAP_MS - now) : 0;
  const tokenEarnedThisCycle = cycleActive && pet.lastTokenClaim ? new Date(pet.lastTokenClaim).getTime() >= cycleStart : false;
  const active = !pet.isEgg && pet.lifeStatus === "active";
  return {
    id: pet.id, name: pet.name, gender: pet.gender,
    isEgg: pet.isEgg, lifeStatus: pet.lifeStatus, isSleeping: !!pet.isSleeping,
    hatchDaysLeft: pet.isEgg ? daysLeft(pet.hatchAt) : 0,
    daysLeft: pet.isEgg ? 0 : daysLeft(pet.expiresAt),
    happiness: clamp(pet.happiness ?? 60), hunger: clamp(pet.hunger ?? 60),
    cleanliness: clamp(pet.cleanliness ?? 60), energy: clamp(pet.energy ?? 60),
    feedsInCycle, feedsNeeded: FEEDS_PER_DAY, tokenEarnedToday: tokenEarnedThisCycle,
    cycleActive, cycleHoursLeft: Math.ceil(cycleMsLeft / 3600000),
    nextFeedMinutes: Math.ceil(nextFeedMs / 60000),
    // Feed whenever the belly isn't full; nextFeedMinutes just tells when the next feed will COUNT toward the token.
    canFeed: active && clamp(pet.hunger ?? 60) < 100,
    tokenFeedReady: active && nextFeedMs === 0 && !(cycleActive && feedsInCycle >= FEEDS_PER_DAY),
    totalTokensEarned: pet.totalTokensEarned || 0,
  };
}

const DEFAULT_PRIZES = [
  { label: "Free can of beer", prizeType: "item", value: 0, weight: 8, colorHex: "#f59e0b" },
  { label: "10% discount voucher", prizeType: "voucher_percent", value: 10, weight: 15, colorHex: "#4ecdc4" },
  { label: "50% discount voucher", prizeType: "voucher_percent", value: 50, weight: 3, colorHex: "#a855f7" },
  { label: "Free Martell", prizeType: "item", value: 0, weight: 1, colorHex: "#c9a84c" },
  { label: "Free spin", prizeType: "free_spin", value: 0, weight: 15, colorHex: "#45b7d1" },
  { label: "50,000 RP discount voucher", prizeType: "voucher_amount", value: 50000, weight: 6, colorHex: "#22c55e" },
  { label: "100,000 RP discount voucher", prizeType: "voucher_amount", value: 100000, weight: 2, colorHex: "#ec4899" },
  { label: "Revival pill", prizeType: "pill", value: 0, weight: 5, colorHex: "#fb7185" },
  { label: "Free dish", prizeType: "item", value: 0, weight: 10, colorHex: "#f97316" },
  { label: "Nothing", prizeType: "nothing", value: 0, weight: 35, colorHex: "#64748b" },
];

const DEFAULT_FAQ = [
  { question: "How do I activate my pet?", answer: "Buy a blindbox package at the club, then open Pet Care and enter the activation code printed on your package. Your Doluruu will come to life for 15 days.", keywords: "activate,activation,code,package,start pet,new pet" },
  { question: "How do I earn tokens?", answer: "Feed your pet 2 times a day. Each full day of feeding (2 feeds) earns you 1 token. Tokens can be spent on the Spin the Wheel game for prizes.", keywords: "token,earn,feed,feeding,reward" },
  { question: "Why did my pet get sick?", answer: "A pet lives for 15 days. After that it gets sick and stops earning tokens. Visit us and spend 300,000 RP to receive a free revival pill from staff — it extends your pet another 15 days.", keywords: "sick,dead,expired,pill,revive,extend,15 days" },
  { question: "What is the Doluruu egg?", answer: "If you win a Doluruu egg on the wheel, it hatches into a brand-new pet after 15 days, which you can then feed for another 15 days of tokens.", keywords: "egg,hatch,new pet" },
  { question: "How do I claim a prize I won?", answer: "Prizes you win on the wheel appear under 'My Prizes'. Show it to our staff at the club — an admin will confirm and hand over your prize.", keywords: "prize,redeem,claim,voucher,wheel,spin" },
];

async function seedPrizesIfEmpty(companyId?: number) {
  const cond = companyId ? eq(spinPrizes.companyId, companyId) : undefined;
  const existing = await db.select({ id: spinPrizes.id }).from(spinPrizes).where(cond as any).limit(1);
  if (existing.length === 0) {
    await db.insert(spinPrizes).values(DEFAULT_PRIZES.map((p, i) => ({ ...p, companyId: companyId ?? null, sortOrder: i })));
  }
}
async function seedFaqIfEmpty() {
  // The starter answers describe Reborn's club; another company writes its own in Admin > FAQ.
  if (currentTenant()) return;
  const existing = await db.select({ id: faqItems.id }).from(faqItems).limit(1);
  if (existing.length === 0) {
    await db.insert(faqItems).values(DEFAULT_FAQ.map((f, i) => ({ ...f, sortOrder: i })));
  }
}

// Curated Chinese/Mandopop hits [chinese title, pinyin, singer]
const DEFAULT_SONGS: [string, string, string][] = [
  ["月亮代表我的心", "Yuè Liàng Dài Biǎo Wǒ De Xīn", "邓丽君 Teresa Teng"],
  ["甜蜜蜜", "Tián Mì Mì", "邓丽君 Teresa Teng"],
  ["吻别", "Wěn Bié", "张学友 Jacky Cheung"],
  ["七里香", "Qī Lǐ Xiāng", "周杰伦 Jay Chou"],
  ["晴天", "Qíng Tiān", "周杰伦 Jay Chou"],
  ["稻香", "Dào Xiāng", "周杰伦 Jay Chou"],
  ["青花瓷", "Qīng Huā Cí", "周杰伦 Jay Chou"],
  ["告白气球", "Gào Bái Qì Qiú", "周杰伦 Jay Chou"],
  ["简单爱", "Jiǎn Dān Ài", "周杰伦 Jay Chou"],
  ["夜曲", "Yè Qǔ", "周杰伦 Jay Chou"],
  ["菊花台", "Jú Huā Tái", "周杰伦 Jay Chou"],
  ["说好不哭", "Shuō Hǎo Bù Kū", "周杰伦 Jay Chou"],
  ["江南", "Jiāng Nán", "林俊杰 JJ Lin"],
  ["修炼爱情", "Xiū Liàn Ài Qíng", "林俊杰 JJ Lin"],
  ["曹操", "Cáo Cāo", "林俊杰 JJ Lin"],
  ["她说", "Tā Shuō", "林俊杰 JJ Lin"],
  ["十年", "Shí Nián", "陈奕迅 Eason Chan"],
  ["浮夸", "Fú Kuā", "陈奕迅 Eason Chan"],
  ["富士山下", "Fù Shì Shān Xià", "陈奕迅 Eason Chan"],
  ["泡沫", "Pào Mò", "邓紫棋 G.E.M."],
  ["光年之外", "Guāng Nián Zhī Wài", "邓紫棋 G.E.M."],
  ["喜欢你", "Xǐ Huān Nǐ", "邓紫棋 G.E.M."],
  ["遇见", "Yù Jiàn", "孙燕姿 Stefanie Sun"],
  ["天黑黑", "Tiān Hēi Hēi", "孙燕姿 Stefanie Sun"],
  ["我怀念的", "Wǒ Huái Niàn De", "孙燕姿 Stefanie Sun"],
  ["听海", "Tīng Hǎi", "张惠妹 A-Mei"],
  ["温柔", "Wēn Róu", "五月天 Mayday"],
  ["突然好想你", "Tū Rán Hǎo Xiǎng Nǐ", "五月天 Mayday"],
  ["童话", "Tóng Huà", "光良 Michael Wong"],
  ["至少还有你", "Zhì Shǎo Hái Yǒu Nǐ", "林忆莲 Sandy Lam"],
  ["红豆", "Hóng Dòu", "王菲 Faye Wong"],
  ["我愿意", "Wǒ Yuàn Yì", "王菲 Faye Wong"],
  ["传奇", "Chuán Qí", "王菲 Faye Wong"],
  ["挪威的森林", "Nuó Wēi De Sēn Lín", "伍佰 Wu Bai"],
  ["龙的传人", "Lóng De Chuán Rén", "王力宏 Leehom Wang"],
  ["你不知道的事", "Nǐ Bù Zhī Dào De Shì", "王力宏 Leehom Wang"],
  ["日不落", "Rì Bù Luò", "蔡依林 Jolin Tsai"],
  ["倒带", "Dào Dài", "蔡依林 Jolin Tsai"],
  ["崇拜", "Chóng Bài", "梁静茹 Fish Leong"],
  ["勇气", "Yǒng Qì", "梁静茹 Fish Leong"],
  ["小酒窝", "Xiǎo Jiǔ Wō", "林俊杰 JJ Lin & 蔡卓妍 Charlene Choi"],
  ["忽然之间", "Hū Rán Zhī Jiān", "莫文蔚 Karen Mok"],
  ["因为爱情", "Yīn Wèi Ài Qíng", "陈奕迅 & 王菲"],
  ["后来", "Hòu Lái", "刘若英 Rene Liu"],
  ["情非得已", "Qíng Fēi Dé Yǐ", "庾澄庆 Harlem Yu"],
  ["对面的女孩看过来", "Duì Miàn De Nǚ Hái Kàn Guò Lái", "任贤齐 Richie Jen"],
  ["死了都要爱", "Sǐ Le Dōu Yào Ài", "信乐团 Shin"],
  ["小幸运", "Xiǎo Xìng Yùn", "田馥甄 Hebe Tien"],
  ["演员", "Yǎn Yuán", "薛之谦 Joker Xue"],
  ["丑八怪", "Chǒu Bā Guài", "薛之谦 Joker Xue"],
  ["平凡之路", "Píng Fán Zhī Lù", "朴树 Pu Shu"],
  ["成都", "Chéng Dū", "赵雷 Zhao Lei"],
  ["海阔天空", "Hǎi Kuò Tiān Kōng", "Beyond"],
  ["光辉岁月", "Guāng Huī Suì Yuè", "Beyond"],
  ["月半小夜曲", "Yuè Bàn Xiǎo Yè Qǔ", "李克勤 Hacken Lee"],
  ["爱如潮水", "Ài Rú Cháo Shuǐ", "张信哲 Jeff Chang"],
  ["味道", "Wèi Dào", "辛晓琪 Winnie Hsin"],
  ["天涯", "Tiān Yá", "任贤齐 Richie Jen"],
  ["约定", "Yuē Dìng", "周蕙 Where Chou"],
  ["征服", "Zhēng Fú", "那英 Na Ying"],
];
let songCatalogReady = false;
async function seedSongsIfEmpty() {
  if (songCatalogReady) return;
  const existing = await db.select({ title: songs.title, artist: songs.artist }).from(songs);
  const key = (title: unknown, artist: unknown) => `${String(title || "").trim().toLocaleLowerCase()}|${String(artist || "").trim().toLocaleLowerCase()}`;
  const known = new Set(existing.map((row)=>key(row.title,row.artist)));
  const missing = TOP_SONGS_500.filter((row)=>!known.has(key(row.title,row.artist))).map((row,index)=>({
    title: row.title, titlePinyin: textPinyin(row.title), artist: row.artist, artistPinyin: textPinyin(row.artist),
    isHit: true, requestCount: Math.max(1, 500-index), spotifyUrl: null,
  }));
  for (let i=0;i<missing.length;i+=100) await db.insert(songs).values(missing.slice(i,i+100));
  if (existing.length === 0 && !missing.length) await db.insert(songs).values(DEFAULT_SONGS.map(([zh, py, artist], i) => ({ title: zh, titlePinyin: py, artist, isHit: true, requestCount: DEFAULT_SONGS.length-i })));
  songCatalogReady = true;
}

// ── App features the admin can switch off for members ─────────────────────
// Stored as a JSON array of feature keys in app_settings.disabledFeatures.
export const APP_FEATURE_KEYS = ["pet", "order", "bottles", "spin", "games", "bookings", "loyalty", "kos", "songs", "referral", "support", "chat", "history", "service"] as const;
// Per data space: each company switches its own features on and off.
const _disabledCaches = new Map<string, { at: number; list: string[] }>();
export async function disabledFeatures(): Promise<string[]> {
  const _disabledCache = _disabledCaches.get(homeCompanySlug());
  if (_disabledCache && Date.now() - _disabledCache.at < 15000) return _disabledCache.list;
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, "disabledFeatures"));
  let list: string[] = [];
  try { const v = JSON.parse(row?.value || "[]"); if (Array.isArray(v)) list = v.filter((k) => (APP_FEATURE_KEYS as readonly string[]).includes(k)); } catch {}
  _disabledCaches.set(homeCompanySlug(), { at: Date.now(), list });
  return list;
}
// Saves which features are off for this company. Used by the company's own Admin › App
// features and by BridgeX, which sets them per company.
export async function saveDisabledFeatures(keys: unknown): Promise<string[]> {
  const raw = Array.isArray(keys) ? keys : [];
  const list = Array.from(new Set(raw.map(String).filter((k: string) => (APP_FEATURE_KEYS as readonly string[]).includes(k))));
  const value = JSON.stringify(list);
  await db.insert(appSettings).values({ key: "disabledFeatures", value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
  _disabledCaches.delete(homeCompanySlug());
  return list;
}

// ── Call service: a member seated at a table asks staff to come ───────────
// Open calls are kept in this company's settings, so every server and every staff
// screen sees the same list. A call leaves the list when staff tap Done, or after a while.
const SERVICE_CALLS_KEY = "serviceCalls";
const SERVICE_CALL_COOLDOWN_MS = 60_000;
const SERVICE_CALL_SHOWN_MS = 30 * 60_000;
interface ServiceCall { id: string; table: string; userId: string; name: string; at: number }
async function openServiceCalls(): Promise<ServiceCall[]> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, SERVICE_CALLS_KEY));
  try {
    const list = JSON.parse(row?.value || "[]");
    return Array.isArray(list) ? list.filter((call: ServiceCall) => Date.now() - Number(call.at) < SERVICE_CALL_SHOWN_MS) : [];
  } catch { return []; }
}
async function saveServiceCalls(calls: ServiceCall[]) {
  const value = JSON.stringify(calls);
  await db.insert(appSettings).values({ key: SERVICE_CALLS_KEY, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
  emitLiveUpdate("/api/reborn/venue/service-calls", { action: "SERVICE_CALLS" });
}

// Member actions that belong to each feature (POST/PUT/DELETE only; reads stay open).
const FEATURE_API: Array<[string, RegExp]> = [
  ["service", /^\/api\/reborn\/venue\/call-service/],
  ["pet", /^\/api\/reborn\/(action|feed|use-pill|pet-home\/)/],
  ["order", /^\/api\/reborn\/shop\/order/],
  ["spin", /^\/api\/reborn\/(spin$|prizes\/)/],
  ["games", /^\/api\/reborn\/games\/(rooms|number)/],
  ["bookings", /^\/api\/reborn\/booking$/],
  ["kos", /^\/api\/reborn\/kos\/(buy|gift|cashout)/],
  ["songs", /^\/api\/reborn\/songs\/request/],
  ["chat", /^\/api\/reborn\/chat\/(request|send)/],
  ["support", /^\/api\/reborn\/support\/ask/],
];

// Fair song queue. The admin picks who takes turns — each member ("user") or
// each table ("table", from the table QR / booking check-in) — and how many
// songs a turn is (1–3). A group's round = floor((songs it already had
// confirmed this venue day + this request's place among its pending ones) /
// songs per turn). Rounds go first come, first served: within a round the
// group that asked first sings first, and all its songs for that turn go
// together. A1 A2 A3 then B1 with 2 per turn → A1 A2 B1 A3.
// Songs the admin moved up ("Play next", bumped_at) go before everyone, the latest move first.
async function fairSongQueue(cid: number | null) {
  const session = await ensureVenueSession();
  const since = venueDayStart(session.day);
  // Tonight's waiting songs only (the venue day starts 8am) — yesterday's leftovers never block the queue.
  const where = and(eq(songRequests.status, "pending"), sql`${songRequests.createdAt} >= ${since}`, ...(cid == null ? [] : [eq(songRequests.companyId, cid)]));
  const pending = await db.select().from(songRequests).where(where).orderBy(songRequests.createdAt, songRequests.id).limit(300);
  type Q = typeof pending[number] & { position: number; round: number; table: string | null; group: string };
  if (!pending.length) return [] as Q[];
  const s = await getSettings();
  const byTable = s.songQueueMode === "table";
  const perTurn = s.songsPerTurn;
  const ids = Array.from(new Set(pending.map((r) => r.userId)));
  // Where each requester is sitting right now (falls back to the table saved on the request).
  const seats = await db.select({ userId: venueCheckins.userId, table: venueCheckins.tableLabel }).from(venueCheckins)
    .where(and(inArray(venueCheckins.userId, ids), eq(venueCheckins.venueDay, session.day), eq(venueCheckins.sessionCode, session.code), sql`${venueCheckins.checkedOutAt} IS NULL`));
  const seatOf = new Map(seats.map((x) => [x.userId, x.table || null]));
  const tableOf = (r: { userId: string; tableLabel: string | null }) => seatOf.get(r.userId) || r.tableLabel || null;
  const groupOf = (userId: string, table: string | null) => (byTable && table ? `t:${table}` : `u:${userId}`);
  // Songs already sung / on now / skipped tonight use up that member's (or table's) turns.
  const doneWhere = and(inArray(songRequests.status, ["confirmed", "playing", "skipped"]), sql`${songRequests.confirmedAt} >= ${since}`, ...(cid == null ? [] : [eq(songRequests.companyId, cid)]));
  const done = await db.select({ userId: songRequests.userId, table: songRequests.tableLabel }).from(songRequests).where(doneWhere).limit(2000);
  const sung = new Map<string, number>();
  for (const d of done) { const g = groupOf(d.userId, d.table); sung.set(g, (sung.get(g) || 0) + 1); }
  const bumped = pending.filter((r) => r.bumpedAt)
    .sort((a, b) => new Date(b.bumpedAt!).getTime() - new Date(a.bumpedAt!).getTime())
    .map((r) => { const table = tableOf(r); return { ...r, table, group: groupOf(r.userId, table), round: 0 }; });
  const seen = new Map<string, number>();
  const ranked = pending.filter((r) => !r.bumpedAt).map((r, i) => {
    const table = tableOf(r); const group = groupOf(r.userId, table);
    const k = seen.get(group) || 0; seen.set(group, k + 1);
    return { ...r, table, group, round: Math.floor(((sung.get(group) || 0) + k) / perTurn), order: i };
  });
  // When a group first asked within each round — that decides who goes first.
  const firstAsk = new Map<string, number>();
  for (const r of ranked) { const key = `${r.round}|${r.group}`; if (!firstAsk.has(key)) firstAsk.set(key, r.order); }
  ranked.sort((a, b) => a.round - b.round || firstAsk.get(`${a.round}|${a.group}`)! - firstAsk.get(`${b.round}|${b.group}`)! || a.order - b.order);
  return [...bumped, ...ranked.map(({ order, ...r }) => r)].map((r, i) => ({ ...r, position: i + 1 })) as Q[];
}

// ── Song queue: now playing + advance (no staff approval) ───────────────────
// A request joins the fair queue straight away. The karaoke bridge (or staff with
// Next / Skip) moves the queue on: the song on now is marked sung (or skipped) and
// the first song of the fair queue starts playing.
async function songNowPlaying(cid: number | null) {
  const since = venueDayStart((await ensureVenueSession()).day);
  const [row] = await db.select().from(songRequests).where(and(eq(songRequests.status, "playing"), sql`${songRequests.confirmedAt} >= ${since}`, ...(cid == null ? [] : [eq(songRequests.companyId, cid)]))).orderBy(desc(songRequests.confirmedAt)).limit(1);
  return row || null;
}
async function karaokeCodes(songIds: number[]) {
  const ids = Array.from(new Set(songIds.filter(Boolean)));
  if (!ids.length) return new Map<number, string | null>();
  const rows = await db.select({ id: songs.id, code: songs.karaokeCode }).from(songs).where(inArray(songs.id, ids));
  return new Map(rows.map((r) => [r.id, r.code || null]));
}
// Admin › Requests › Pause: the song on now stops (the karaoke bridge reads `paused`) and the
// queue doesn't move on until Resume. Its own app_settings key, so saving Settings never resets it.
const SONG_PAUSE_KEY = "songQueuePaused";
async function songQueuePaused(): Promise<boolean> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, SONG_PAUSE_KEY));
  return row?.value === "true";
}
async function setSongQueuePaused(paused: boolean) {
  const value = paused ? "true" : "false";
  await db.insert(appSettings).values({ key: SONG_PAUSE_KEY, value, updatedAt: new Date() }).onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
}
async function advanceSongQueue(cid: number | null, how: "done" | "skip", by?: string | null) {
  const current = await songNowPlaying(cid);
  if (current) await db.update(songRequests).set({ status: how === "skip" ? "skipped" : "confirmed", adminId: by || current.adminId }).where(eq(songRequests.id, current.id));
  // Paused: the song on now may finish, but the next one waits for Resume.
  const queue = (await songQueuePaused()) ? [] : await fairSongQueue(cid);
  const next = queue[0];
  let playing: any = null;
  if (next) {
    [playing] = await db.update(songRequests).set({ status: "playing", confirmedAt: new Date(), tableLabel: next.table || next.tableLabel || null }).where(and(eq(songRequests.id, next.id), eq(songRequests.status, "pending"))).returning();
    if (playing) {
      const song = [playing.title, playing.artist].filter(Boolean).join(" — ");
      notifyUserI18n(playing.userId, "song_now", (lang) => ({
        title: pick(lang, { en: "🎤 You're on now!", zh: "🎤 轮到你唱了！", id: "🎤 Giliranmu sekarang!" }),
        body: song,
      }), { path: "/songs", songRequestId: playing.id, status: "playing" }).catch(() => {});
      memberWaPhone(playing.userId).then(async (phone) => {
        if (!phone) return;
        const lang = await langForPhone(phone, playing.userId);
        await sendToMember(phone, waText(lang, "songOnNow", { song }), playing.userId);
      }).catch(() => {});
      // The member after them: "you're up next".
      const after = queue[1];
      if (after && after.userId !== playing.userId) notifyUserI18n(after.userId, "song_next", (lang) => ({
        title: pick(lang, { en: "🎶 You're up next", zh: "🎶 下一首就是你", id: "🎶 Kamu berikutnya" }),
        body: [after.title, after.artist].filter(Boolean).join(" — "),
      }), { path: "/songs", songRequestId: after.id }).catch(() => {});
    }
  }
  emitLiveUpdate("/api/reborn/song-queue", { action: how === "skip" ? "SKIPPED" : "NEXT" });
  emitLiveUpdate("/api/reborn/songs/my-requests", { action: "QUEUE_MOVED" });
  emitLiveUpdate("/api/reborn/admin/song-requests", { action: "QUEUE_MOVED" });
  return { finished: current, playing };
}
// A request's place in tonight's fair queue (1 = next), for replies.
export async function songQueuePosition(cid: number | null, requestId: number): Promise<number | null> {
  return (await fairSongQueue(cid)).find((r) => r.id === requestId)?.position || null;
}
// The queue everyone can see: now singing + every waiting song (first name + table only).
async function songQueueBoard(cid: number | null, viewerId?: string | null) {
  const [now, queue, paused] = await Promise.all([songNowPlaying(cid), fairSongQueue(cid), songQueuePaused()]);
  const ids = Array.from(new Set([...(now ? [now.userId] : []), ...queue.map((r) => r.userId)]));
  const people = ids.length ? await db.select({ id: users.id, firstName: users.firstName, username: users.username }).from(users).where(inArray(users.id, ids)) : [];
  const nameOf = new Map(people.map((u) => [u.id, (u.firstName || u.username || "").trim()]));
  const codes = await karaokeCodes([...(now?.songId ? [now.songId] : []), ...queue.map((r) => r.songId || 0)]);
  const view = (r: any) => ({ id: r.id, title: r.title, artist: r.artist || "", performanceMode: r.performanceMode, table: r.table || r.tableLabel || null, name: nameOf.get(r.userId) || "", mine: !!viewerId && r.userId === viewerId, karaokeCode: r.songId ? codes.get(r.songId) || null : null });
  const s = await getSettings();
  return {
    mode: s.songQueueMode, perTurn: s.songsPerTurn, paused,
    nowPlaying: now ? { ...view(now), startedAt: now.confirmedAt } : null,
    queue: queue.map((r) => ({ ...view(r), position: r.position, round: r.round + 1, playNext: !!r.bumpedAt })),
  };
}

// ── Karaoke system bridge ────────────────────────────────────────────────────
// A small program at the club (next to the karaoke system) uses these with the
// token from Admin › Requests › Karaoke system: it reads the queue, plays the song
// on now, and calls "next" when a song ends. It can also upload the karaoke
// system's song list so requests carry the system's song number (karaoke_code).
async function karaokeAuth(req: Request): Promise<boolean> {
  const given = String(req.get("x-karaoke-token") || req.query.token || "");
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, "karaokeToken"));
  const want = row?.value || "";
  if (!want || given.length !== want.length) return false;
  let diff = 0; for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ given.charCodeAt(i);
  if (diff) return false;
  const now = Date.now();
  if (now - karaokeLastSeenWrite > 60_000) { // remember the bridge is online (at most once a minute)
    karaokeLastSeenWrite = now;
    await db.insert(appSettings).values({ key: "karaokeLastSeen", value: new Date(now).toISOString(), updatedAt: new Date() })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: new Date(now).toISOString(), updatedAt: new Date() } }).catch(() => {});
  }
  return true;
}
let karaokeLastSeenWrite = 0;
const normSong = (v: unknown) => String(v || "").toLowerCase().replace(/[\s·・\-–—_'"“”‘’()（）\[\]【】.,，。!！?？]/g, "");
// Add / update songs from the karaoke system's list: [{ code, title, artist }].
async function importKaraokeCatalog(list: Array<{ code?: unknown; title?: unknown; artist?: unknown }>) {
  const rows = (list || []).map((x) => ({ code: String(x?.code ?? "").trim(), title: String(x?.title ?? "").trim(), artist: String(x?.artist ?? "").trim() }))
    .filter((x) => x.code && x.title).slice(0, 60000);
  const all = await db.select({ id: songs.id, title: songs.title, artist: songs.artist, code: songs.karaokeCode }).from(songs);
  const byCode = new Map(all.filter((x) => x.code).map((x) => [x.code!, x.id]));
  const byName = new Map(all.map((x) => [`${normSong(x.title)}|${normSong(x.artist)}`, x.id]));
  let linked = 0, added = 0;
  for (const r of rows) {
    if (byCode.has(r.code)) continue;
    const id = byName.get(`${normSong(r.title)}|${normSong(r.artist)}`);
    if (id) { await db.update(songs).set({ karaokeCode: r.code }).where(eq(songs.id, id)); byCode.set(r.code, id); linked++; continue; }
    const [row] = await db.insert(songs).values({ title: r.title, titlePinyin: textPinyin(r.title), artist: r.artist, artistPinyin: textPinyin(r.artist), karaokeCode: r.code, isHit: false, requestCount: 0 }).returning({ id: songs.id });
    byCode.set(r.code, row.id); byName.set(`${normSong(r.title)}|${normSong(r.artist)}`, row.id); added++;
  }
  return { received: rows.length, linked, added };
}

// ── Venue day + table check-in ──────────────────────────────────────────────
function venueDayStart(day: string): Date { return new Date(`${day}T${String(VENUE_DAY_START_HOUR - 7).padStart(2, "0")}:00:00Z`); }
// Every table gets one fixed QR (it never changes, so it can be printed and
// stuck on the table). The signature stops people guessing other tables.
async function tableQrSecret(): Promise<string> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, "tableQrSecret"));
  if (row?.value) return row.value;
  const v = randomVenueCode() + randomVenueCode() + randomVenueCode();
  await db.insert(appSettings).values({ key: "tableQrSecret", value: v, updatedAt: new Date() }).onConflictDoNothing();
  const [again] = await db.select().from(appSettings).where(eq(appSettings.key, "tableQrSecret"));
  return again?.value || v;
}
async function tableSig(label: string): Promise<string> {
  const { createHmac } = await import("crypto");
  return createHmac("sha256", await tableQrSecret()).update(label).digest("base64url").slice(0, 10);
}
// All tables set up in the booking areas (label + area name).
async function venueTables(): Promise<{ label: string; area: string }[]> {
  const s = await getSettings();
  const out: { label: string; area: string }[] = []; const seen = new Set<string>();
  for (const a of enabledAreas(s.bookingAreas)) for (const t of a.tables) if (!seen.has(t)) { seen.add(t); out.push({ label: t, area: a.name }); }
  return out;
}
// The table a booking is for ("KTV Lounge (Level 1) · Table V1" → "V1").
function bookingTable(title?: string | null): string | null {
  const m = /·\s*Table\s+(.+)$/.exec(String(title || ""));
  return m ? m[1].trim() : null;
}
async function venueCheckIn(userId: string, table: string | null) {
  const session = await ensureVenueSession();
  const company = await rebornCompany();
  const [row] = await db.insert(venueCheckins).values({ companyId: company?.id || null, userId, venueDay: session.day, sessionCode: session.code, tableLabel: table, checkedInAt: new Date(), checkedOutAt: null })
    .onConflictDoUpdate({ target: [venueCheckins.venueDay, venueCheckins.userId], set: { companyId: company?.id || null, sessionCode: session.code, ...(table ? { tableLabel: table } : {}), checkedInAt: new Date(), checkedOutAt: null } }).returning();
  emitLiveUpdate("kos", { type: "venue_checkin", userId });
  return row;
}
// A member whose table booking is confirmed is checked in to KOS at that table
// automatically from 2 hours before the booking until it ends — no scan needed.
async function autoCheckinFromBooking(userId: string) {
  const now = Date.now();
  const rows = await db.select({ title: appointments.title, at: appointments.appointmentDate, duration: appointments.duration }).from(appointments)
    .where(and(eq(appointments.userId, userId), inArray(appointments.status, ["confirmed", "seated"]), sql`${appointments.appointmentDate} BETWEEN ${new Date(now - 12 * 3600_000)} AND ${new Date(now + 2 * 3600_000)}`))
    .orderBy(desc(appointments.appointmentDate)).limit(5);
  const hit = rows.find((r) => bookingTable(r.title) && new Date(r.at).getTime() + (r.duration || 120) * 60_000 > now);
  if (!hit) return null;
  const table = bookingTable(hit.title)!;
  const session = await ensureVenueSession();
  const [cur] = await db.select().from(venueCheckins).where(and(eq(venueCheckins.userId, userId), eq(venueCheckins.venueDay, session.day))).limit(1);
  // Respect a manual check-out / table scan already made today.
  if (cur && (cur.tableLabel || cur.checkedOutAt)) return cur.checkedOutAt ? null : cur;
  return venueCheckIn(userId, table);
}
// A no-show auto-cancel whose guests turn up late can still be marked Arrived while
// its time hasn't ended — unless the table was booked by someone else meanwhile.
const isNoShowCancel = (r: { status: string; adminNote?: string | null }) => r.status === "cancelled" && /^No-show/.test(r.adminNote || "");
const bookingEnd = (r: { appointmentDate: Date | string; duration: number | null }) => new Date(r.appointmentDate).getTime() + (r.duration || 120) * 60_000;
async function tableTakenByOther(r: typeof appointments.$inferSelect): Promise<boolean> {
  if (!r.notes) return false;
  const start = new Date(r.appointmentDate).getTime(), end = bookingEnd(r);
  const rows = await db.select().from(appointments).where(and(eq(appointments.notes, r.notes), sql`${appointments.appointmentDate} BETWEEN ${new Date(start - 12 * 3600_000)} AND ${new Date(end)}`));
  return rows.some((o) => o.id !== r.id && ["pending", "scheduled", "confirmed", "seated", "blocked"].includes(o.status) && new Date(o.appointmentDate).getTime() < end && bookingEnd(o) > start);
}
// WhatsApp the member a welcome once their booking is marked Arrived (staff or table scan).
async function notifyArrived(row: typeof appointments.$inferSelect) {
  if (!row.userId) return;
  const phone = await memberWaPhone(row.userId);
  if (!phone) return;
  const lang = await langForPhone(phone, row.userId);
  const club = (await getSettings()).clubName || "Reborn Wave";
  const ok = await sendToMember(phone, waText(lang, "arrivedWelcome", { club, what: localizeBookingText(lang, row.title) }), row.userId);
  if (!ok) console.warn(`[wa] booking #${row.id} arrived: WhatsApp not delivered to ${phone}`);
}
// The member scanned the QR of the table they booked: they're at the club, so the
// booking becomes Arrived (seated) by itself — also a late no-show if the table is still free.
async function markArrivedFromScan(userId: string, table: string) {
  const now = Date.now();
  const rows = await db.select().from(appointments)
    .where(and(eq(appointments.userId, userId), inArray(appointments.status, ["pending", "scheduled", "confirmed", "cancelled"]), sql`${appointments.appointmentDate} BETWEEN ${new Date(now - 12 * 3600_000)} AND ${new Date(now + 2 * 3600_000)}`))
    .orderBy(desc(appointments.appointmentDate)).limit(10);
  const hit = rows.find((r) => (r.status !== "cancelled" || isNoShowCancel(r)) && bookingTable(r.title) === table && bookingEnd(r) > now);
  if (!hit || (hit.status === "cancelled" && await tableTakenByOther(hit))) return null;
  const [row] = await db.update(appointments).set({ status: "seated", ...(hit.status === "cancelled" ? { adminNote: null } : {}), updatedAt: new Date() }).where(eq(appointments.id, hit.id)).returning();
  emitLiveUpdate("/api/reborn/admin/bookings", { action: "ARRIVED", resource: String(hit.id) });
  if (row) void notifyArrived(row).catch((e) => console.warn("arrived WhatsApp", e));
  return row;
}
// "By table" song queue: a member must be checked in at a table (table QR or
// confirmed table booking) before they can request a song — app and WhatsApp.
export async function songNeedsTableScan(userId: string): Promise<boolean> {
  if ((await getSettings()).songQueueMode !== "table") return false;
  return !(await activeCheckin(userId).catch(() => null))?.tableLabel;
}
// The member's live check-in for today (auto check-in from their booking first).
async function activeCheckin(userId: string) {
  const session = await ensureVenueSession();
  const find = async () => (await db.select().from(venueCheckins).where(and(eq(venueCheckins.userId, userId), eq(venueCheckins.venueDay, session.day), eq(venueCheckins.sessionCode, session.code), sql`${venueCheckins.checkedOutAt} IS NULL`)).limit(1))[0] || null;
  const row = await find();
  if (row?.tableLabel) return row;
  return (await autoCheckinFromBooking(userId).catch(() => null)) ? await find() : row;
}

export function registerRebornRoutes(app: Express) {
  console.log("*** REBORN GAME ROUTES REGISTERED");
  void dedupeGiftTypes();

  // Block member actions for features the admin turned off (admins/staff can still test them).
  app.use(async (req, res, next) => {
    if (req.method === "GET" || !req.path.startsWith("/api/reborn/")) return next();
    const hit = FEATURE_API.find(([, re]) => re.test(req.path));
    if (!hit) return next();
    try {
      if (!(await disabledFeatures()).includes(hit[0])) return next();
      const uid = getUserId(req);
      const u = uid ? await storage.getUser(uid) : null;
      if (u && ((u as any).role === "admin" || (u as any).role === "staff")) return next();
      return res.status(403).json({ message: tr(req, { en: "This feature is turned off right now.", zh: "此功能目前已关闭。", id: "Fitur ini sedang dinonaktifkan." }), featureOff: hit[0] });
    } catch { return next(); }
  });
  // The pet's name and pictures, set by the company's admin (Admin > Pet).
  app.get("/api/reborn/pet-brand", async (_req, res) => {
    const s = await getSettings();
    res.set("Cache-Control", "no-cache").json({ name: s.petName, imageUrl: s.petImageUrl, eggImageUrl: s.petEggImageUrl });
  });
  app.get("/api/reborn/features", async (_req, res) => {
    res.set("Cache-Control", "no-cache").json({ disabled: await disabledFeatures() });
  });
  app.post("/api/reborn/admin/features", requireAdmin(async (req, res) => {
    const list = await saveDisabledFeatures(req.body?.disabled);
    await logAdmin(req, { targetType: "settings", action: "features", entityType: "settings", description: `App features off: ${list.join(", ") || "none"}` });
    res.json({ disabled: list, message: tr(req, { en: "Saved", zh: "已保存", id: "Tersimpan" }) });
  }));
  // Apply the club's saved timezone to booking/reminder time math at boot.
  getSettings().then((s) => { setBookingTimezone(s.timezone); setBookingRules({ tableDayLock: s.bookingTableDayLock, lastBooking: s.bookingLastTime }); }).catch(() => {});

  // ── Pets ────────────────────────────────────────────────────────────────
  app.get("/api/reborn/pets", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const rows = await db.select().from(pets).where(and(eq(pets.userId, userId), eq(pets.isActive, true)));
      const refreshed = [];
      for (const p of rows) refreshed.push(petView(await refreshPet(p)));
      res.json(refreshed);
    } catch (e) { console.error("reborn pets", e); res.status(500).json({ message: tr(req, { en: "Failed to load pets", zh: "宠物加载失败", id: "Gagal memuat peliharaan" }) }); }
  });

  app.post("/api/reborn/activate", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const code = String(req.body?.code || "").trim().toUpperCase();
      if (!code) return res.status(400).json({ message: tr(req, { en: "Enter your activation code", zh: "请输入激活码", id: "Masukkan kode aktivasi" }) });
      const [row] = await db.select().from(activationCodes).where(eq(activationCodes.code, code));
      if (!row) return res.status(404).json({ message: tr(req, { en: "Code not found. Check the code on your package.", zh: "找不到该激活码，请核对包装上的代码。", id: "Kode tidak ditemukan. Periksa kode di kemasanmu." }) });
      if (row.used) return res.status(400).json({ message: tr(req, { en: "This code has already been used.", zh: "此激活码已被使用。", id: "Kode ini sudah dipakai." }) });
      const living = await db.select({ id: pets.id }).from(pets).where(and(eq(pets.userId, userId), eq(pets.isActive, true), sql`${pets.lifeStatus} != 'dead'`));
      if (living.length >= MAX_PETS) return res.status(400).json({ message: tr(req, { en: "You can only have {n} pets at a time.", zh: "你最多只能同时拥有 {n} 只宠物。", id: "Kamu hanya bisa memiliki {n} peliharaan sekaligus." }, { n: MAX_PETS }) });
      const now = new Date();
      const [pet] = await db.insert(pets).values({
        userId, toyId: 0, name: row.petName || "Doluruu", type: "virtual",
        gender: row.petGender || "male", isActive: true, lifeStatus: "active",
        activatedAt: now, expiresAt: addDays(LIFE_DAYS, now), feedsToday: 0,
        happiness: 60, hunger: 60, cleanliness: 60, energy: 60,
      }).returning();
      await db.update(activationCodes).set({ used: true, usedByUserId: userId, usedAt: now }).where(eq(activationCodes.id, row.id));
      res.json({ message: tr(req, { en: "Your Doluruu is alive! Feed it 2 times a day to earn tokens.", zh: "你的 Doluruu 活过来啦！每天喂 2 次即可赚取代币。", id: "Doluruu kamu sudah hidup! Beri makan 2 kali sehari untuk mendapatkan token." }), pet: petView(pet) });
    } catch (e) { console.error("reborn activate", e); res.status(500).json({ message: tr(req, { en: "Activation failed", zh: "激活失败", id: "Aktivasi gagal" }) }); }
  });

  app.post("/api/reborn/feed", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const petId = Number(req.body?.petId);
      const [petRow] = await db.select().from(pets).where(and(eq(pets.id, petId), eq(pets.userId, userId)));
      if (!petRow) return res.status(404).json({ message: tr(req, { en: "Pet not found", zh: "找不到该宠物", id: "Peliharaan tidak ditemukan" }) });
      const pet = await refreshPet(petRow);
      if (pet.isEgg) return res.status(400).json({ message: tr(req, { en: "This is still an egg — it needs to hatch first.", zh: "这还是一颗蛋——需要先孵化。", id: "Ini masih telur — harus menetas dulu." }) });
      if (pet.lifeStatus !== "active") return res.status(400).json({ message: tr(req, { en: "Your pet is sick. Get a revival pill from staff after a 300,000 RP visit.", zh: "你的宠物生病了。单次到店消费满 300,000 RP 后可向员工领取复活药丸。", id: "Peliharaanmu sedang sakit. Dapatkan pil kebangkitan dari staf setelah berkunjung dan belanja 300.000 RP." }) });

      const today = wibDay();
      let feeds = pet.lastFeedDay === today ? (pet.feedsToday || 0) : 0;
      if (feeds >= FEEDS_PER_DAY) return res.status(400).json({ message: tr(req, { en: "You've already fed your pet 2 times today. Come back tomorrow!", zh: "你今天已经喂过 2 次了，明天再来吧！", id: "Kamu sudah memberi makan 2 kali hari ini. Kembali lagi besok!" }) });
      feeds += 1;

      const now = new Date();
      const stat = (v: number) => Math.min(100, (v || 0) + 12);
      const update: any = {
        feedsToday: feeds, lastFeedDay: today, lastFedAt: now, updatedAt: now,
        hunger: stat(pet.hunger), happiness: stat(pet.happiness), energy: stat(pet.energy),
      };

      let tokenAwarded = false;
      const earnedToday = pet.lastTokenClaim ? wibDay(new Date(pet.lastTokenClaim)) === today : false;
      if (feeds >= FEEDS_PER_DAY && !earnedToday) {
        update.lastTokenClaim = now;
        update.totalTokensEarned = (pet.totalTokensEarned || 0) + 1;
        await db.update(users).set({ tokens: sql`${users.tokens} + 1`, updatedAt: now }).where(eq(users.id, userId));
        await db.insert(tokenTransactions).values({
          userId, tokens: 1, type: "earned", status: "completed",
          description: `Daily care token from ${pet.name}`, relatedId: pet.id,
        });
        tokenAwarded = true;
      }
      await db.update(pets).set(update).where(eq(pets.id, pet.id));
      const [fresh] = await db.select().from(pets).where(eq(pets.id, pet.id));
      res.json({
        message: tokenAwarded ? tr(req, { en: "Full belly! You earned 1 token 🎉", zh: "吃饱啦！你获得了 1 个代币 🎉", id: "Kenyang! Kamu mendapat 1 token 🎉" }) : tr(req, { en: "Fed! {n} more feed(s) today for your token.", zh: "喂好了！今天再喂 {n} 次即可获得代币。", id: "Sudah diberi makan! {n} kali lagi hari ini untuk mendapatkan token." }, { n: FEEDS_PER_DAY - feeds }),
        tokenAwarded, pet: petView(fresh),
      });
    } catch (e) { console.error("reborn feed", e); res.status(500).json({ message: tr(req, { en: "Feeding failed", zh: "喂食失败", id: "Gagal memberi makan" }) }); }
  });

  app.post("/api/reborn/action", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const petId = Number(req.body?.petId);
      const action = String(req.body?.action || "");
      const [petRow] = await db.select().from(pets).where(and(eq(pets.id, petId), eq(pets.userId, userId)));
      if (!petRow) return res.status(404).json({ message: tr(req, { en: "Pet not found", zh: "找不到该宠物", id: "Peliharaan tidak ditemukan" }) });
      const pet = await refreshPet(petRow);
      if (pet.isEgg) return res.status(400).json({ message: tr(req, { en: "This is still an egg — it needs to hatch first.", zh: "这还是一颗蛋——需要先孵化。", id: "Ini masih telur — harus menetas dulu." }) });
      if (pet.lifeStatus !== "active") return res.status(400).json({ message: tr(req, { en: "Your pet is sick. Get a revival pill from staff after a 300,000 RP visit.", zh: "你的宠物生病了。单次到店消费满 300,000 RP 后可向员工领取复活药丸。", id: "Peliharaanmu sedang sakit. Dapatkan pil kebangkitan dari staf setelah berkunjung dan belanja 300.000 RP." }) });

      const now = new Date(); const today = wibDay();
      let hunger = pet.hunger, happiness = pet.happiness, cleanliness = pet.cleanliness, energy = pet.energy;
      const update: any = { updatedAt: now, lastDecayTime: now, isSleeping: false };
      let tokenAwarded = false; let message = "";

      // Switching between awake/asleep changes the energy rate; restart its clock.
      if (action === "sleep" || action === "wake") update.lastEnergyUpdate = now;
      if (action === "sleep") {
        update.isSleeping = true; update.sleepStartTime = now;
        message = tr(req, { en: "Zzz… your pet is sleeping and will regain energy over time.", zh: "Zzz… 你的宠物正在睡觉，会慢慢恢复体力。", id: "Zzz… peliharaanmu sedang tidur dan energinya akan pulih perlahan." });
      } else if (action === "wake") {
        message = tr(req, { en: "Rise and shine! ☀️", zh: "起床啦！☀️", id: "Ayo bangun! ☀️" }); // isSleeping already cleared via update default
      } else if (action === "feed") {
        const nowMs = now.getTime();
        if (hunger >= 100) return res.status(400).json({ message: tr(req, { en: "Your pet is full — no need to feed right now.", zh: "你的宠物吃饱了——现在不用喂。", id: "Peliharaanmu sudah kenyang — tidak perlu diberi makan sekarang." }) });
        if (energy <= 0) return res.status(400).json({ message: tr(req, { en: "Too tired! Tap Sleep to recover energy first.", zh: "太累了！先点“睡觉”恢复体力吧。", id: "Terlalu lelah! Ketuk Tidur untuk memulihkan energi dulu." }) });
        // Feed the belly any time it's hungry (+50%); the token needs 2 feeds spaced ~4h apart within 24h.
        hunger = clamp(hunger + FEED_GAIN); energy = clamp(energy - ACTION_ENERGY_COST);
        const lastCounted = pet.lastFedAt ? new Date(pet.lastFedAt).getTime() : 0; // last feed that counted toward a token
        const spaced = !lastCounted || nowMs - lastCounted >= FEED_GAP_MS;
        if (spaced) {
          let cycleStart = pet.lastFeedDay ? new Date(pet.lastFeedDay).getTime() : 0;
          let feeds = (cycleStart && nowMs - cycleStart < TOKEN_CYCLE_MS) ? (pet.feedsToday || 0) : 0;
          if (!cycleStart || nowMs - cycleStart >= TOKEN_CYCLE_MS) { cycleStart = nowMs; feeds = 0; }
          feeds += 1;
          update.feedsToday = feeds; update.lastFeedDay = new Date(cycleStart).toISOString(); update.lastFedAt = now;
          const earned = pet.lastTokenClaim ? new Date(pet.lastTokenClaim).getTime() >= cycleStart : false;
          if (feeds >= FEEDS_PER_DAY && !earned) {
            update.lastTokenClaim = now; update.totalTokensEarned = (pet.totalTokensEarned || 0) + 1;
            await db.update(users).set({ tokens: sql`${users.tokens} + 1`, updatedAt: now }).where(eq(users.id, userId));
            await db.insert(tokenTransactions).values({ userId, tokens: 1, type: "earned", status: "completed", description: `Daily care token from ${pet.name}`, relatedId: pet.id });
            tokenAwarded = true;
            message = tr(req, { en: "Full belly! You earned today's token 🎉", zh: "吃饱啦！你获得了今天的代币 🎉", id: "Kenyang! Kamu mendapat token hari ini 🎉" });
          } else {
            message = tr(req, { en: "Yum! +50% hunger · {n} more spaced feed(s) for today's token.", zh: "好吃！饱食度 +50% · 再间隔喂食 {n} 次即可获得今天的代币。", id: "Nyam! Kenyang +50% · {n} kali makan berjeda lagi untuk token hari ini." }, { n: Math.max(0, FEEDS_PER_DAY - feeds) });
          }
        } else {
          message = tr(req, { en: "Yum! +50% hunger. (Feed ~4h apart to count toward your token.)", zh: "好吃！饱食度 +50%。（每次喂食间隔约 4 小时才会计入代币。）", id: "Nyam! Kenyang +50%. (Beri makan berjarak ~4 jam agar dihitung untuk token.)" });
        }
      } else if (action === "play" || action === "clean") {
        if (energy <= 0) return res.status(400).json({ message: tr(req, { en: "Too tired! Tap Sleep to recover energy first.", zh: "太累了！先点“睡觉”恢复体力吧。", id: "Terlalu lelah! Ketuk Tidur untuk memulihkan energi dulu." }) });
        energy = clamp(energy - ACTION_ENERGY_COST);
        if (action === "play") { happiness = clamp(happiness + STAT_GAIN); message = tr(req, { en: "So much fun! +50% joy", zh: "玩得好开心！快乐度 +50%", id: "Seru sekali! Kebahagiaan +50%" }); }
        else { cleanliness = clamp(cleanliness + STAT_GAIN); message = tr(req, { en: "Squeaky clean! +50% clean", zh: "干干净净！清洁度 +50%", id: "Bersih kinclong! Kebersihan +50%" }); }
      } else {
        return res.status(400).json({ message: tr(req, { en: "Unknown action", zh: "未知操作", id: "Aksi tidak dikenal" }) });
      }
      update.hunger = hunger; update.happiness = happiness; update.cleanliness = cleanliness; update.energy = energy;
      await db.update(pets).set(update).where(eq(pets.id, petId));
      const [fresh] = await db.select().from(pets).where(eq(pets.id, petId));
      res.json({ message, tokenAwarded, pet: petView(fresh) });
    } catch (e) { console.error("reborn action", e); res.status(500).json({ message: tr(req, { en: "Action failed", zh: "操作失败", id: "Aksi gagal" }) }); }
  });

  app.post("/api/reborn/use-pill", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const petId = Number(req.body?.petId);
      const [petRow] = await db.select().from(pets).where(and(eq(pets.id, petId), eq(pets.userId, userId)));
      if (!petRow) return res.status(404).json({ message: tr(req, { en: "Pet not found", zh: "找不到该宠物", id: "Peliharaan tidak ditemukan" }) });
      const [pill] = await db.select().from(petPills).where(and(eq(petPills.userId, userId), eq(petPills.status, "available"))).limit(1);
      if (!pill) return res.status(400).json({ message: tr(req, { en: "You don't have a revival pill. Visit us and spend 300,000 RP to get one from staff.", zh: "你没有复活药丸。到店消费满 300,000 RP 即可向员工领取。", id: "Kamu tidak punya pil kebangkitan. Kunjungi kami dan belanja 300.000 RP untuk mendapatkannya dari staf." }) });
      const now = new Date();
      await db.update(petPills).set({ status: "used", usedAt: now }).where(eq(petPills.id, pill.id));
      await db.update(pets).set({
        lifeStatus: "active", expiresAt: addDays(LIFE_DAYS, now), feedsToday: 0, lastFeedDay: null,
        pillsUsed: (petRow.pillsUsed || 0) + 1, updatedAt: now,
      }).where(eq(pets.id, petId));
      const [fresh] = await db.select().from(pets).where(eq(pets.id, petId));
      res.json({ message: tr(req, { en: "Revived! Your Doluruu is healthy for another 15 days.", zh: "复活成功！你的 Doluruu 将再健康 15 天。", id: "Bangkit kembali! Doluruu kamu sehat untuk 15 hari lagi." }), pet: petView(fresh) });
    } catch (e) { console.error("reborn pill", e); res.status(500).json({ message: tr(req, { en: "Revive failed", zh: "复活失败", id: "Gagal membangkitkan" }) }); }
  });

  app.get("/api/reborn/pills", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const rows = await db.select().from(petPills).where(and(eq(petPills.userId, userId), eq(petPills.status, "available")));
      res.json({ available: rows.length });
    } catch { res.json({ available: 0 }); }
  });

  // ── Spin the wheel ───────────────────────────────────────────────────────
  app.get("/api/reborn/spin/prizes", async (req, res) => {
    try {
      const cid = await rebornCompanyId(req);
      await seedPrizesIfEmpty(cid);
      const rows = await db.select().from(spinPrizes).where(and(eq(spinPrizes.companyId, cid), eq(spinPrizes.active, true))).orderBy(spinPrizes.sortOrder);
      res.json({ cost: (await getSettings()).spinTokenCost, prizes: rows });
    } catch (e) { console.error("spin prizes", e); res.status(500).json({ message: tr(req, { en: "Failed to load prizes", zh: "奖品加载失败", id: "Gagal memuat hadiah" }) }); }
  });

  app.post("/api/reborn/spin", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const cid = await rebornCompanyId(req);
      await seedPrizesIfEmpty(cid);
      const spinSettings = await getSettings();
      const spinCost = spinSettings.spinTokenCost;
      const user = await storage.getUser(userId);
      if (!user || (user.tokens || 0) < spinCost) return res.status(400).json({ message: tr(req, { en: "Not enough tokens (need {n}). Feed your pet to earn more.", zh: "代币不足（需要 {n} 个）。喂养宠物来赚取更多吧。", id: "Token tidak cukup (butuh {n}). Beri makan peliharaanmu untuk mendapatkan lebih banyak." }, { n: spinCost }) });

      const prizes = await db.select().from(spinPrizes).where(and(eq(spinPrizes.companyId, cid), eq(spinPrizes.active, true))).orderBy(spinPrizes.sortOrder);
      if (prizes.length === 0) return res.status(400).json({ message: tr(req, { en: "The wheel isn't set up yet. Please check back soon.", zh: "转盘尚未设置，请稍后再来。", id: "Roda belum disiapkan. Silakan cek lagi nanti." }) });
      // Prize pool gating: real prizes can only be won when the pool is funded and can
      // afford them. Below the minimum (or empty) only free outcomes (nothing/free spin).
      const pool = await getSpinPool();
      const gate = pool >= spinSettings.spinPoolMin;
      const isFree = (p: any) => p.prizeType === "nothing" || p.prizeType === "free_spin";
      // A %-voucher's pool cost = voucher% × the assumed bill (real cost is unknown at spin time).
      const prizeCost = (p: any) => p.prizeType === "voucher_percent"
        ? Math.round((Number(p.value) || 0) / 100 * spinSettings.spinAssumedBill)
        : (Number(p.costRp) || 0);
      let candidates = prizes.filter((p) => isFree(p) || (gate && prizeCost(p) <= pool));
      if (candidates.length === 0) candidates = prizes.filter((p) => p.prizeType === "nothing");
      if (candidates.length === 0) candidates = prizes; // last-resort safety
      const total = candidates.reduce((s, p) => s + Math.max(0, p.weight || 0), 0) || 1;
      let r = Math.random() * total;
      let picked = candidates[candidates.length - 1];
      for (const p of candidates) { r -= Math.max(0, p.weight || 0); if (r <= 0) { picked = p; break; } }
      const index = Math.max(0, prizes.findIndex((p) => p.id === picked.id));

      const now = new Date();
      // Spend a token
      await db.update(users).set({ tokens: sql`${users.tokens} - ${spinCost}`, updatedAt: now }).where(eq(users.id, userId));
      await db.insert(tokenTransactions).values({ userId, tokens: -spinCost, type: "spent", status: "completed", description: "Spin the Wheel" });

      let status = "won";
      let freeSpin = false;
      if (picked.prizeType === "free_spin") {
        freeSpin = true;
        await db.update(users).set({ tokens: sql`${users.tokens} + ${spinCost}`, updatedAt: now }).where(eq(users.id, userId));
      } else if (picked.prizeType === "pill") {
        await db.insert(petPills).values({ userId, grantedBy: "spin", note: "Won on the wheel" });
      } else if (picked.prizeType === "egg") {
        await db.insert(pets).values({
          userId, toyId: 0, name: "Doluruu Egg", type: "virtual",
          gender: Math.random() < 0.5 ? "male" : "female", isActive: true, isEgg: true,
          hatchAt: addDays(EGG_HATCH_DAYS, now), lifeStatus: "active",
        });
      } else if (picked.prizeType !== "nothing") {
        status = "unused"; // won; member must "Use" it (max 1 per 24h) before staff confirm
      }

      const [result] = await db.insert(spinResults).values({
        userId, companyId: cid, prizeId: picked.id, prizeLabel: picked.label, prizeType: picked.prizeType,
        tokensSpent: spinCost, status,
      }).returning();

      // Draw the prize's cost from the pool and record it as an expense (accountable).
      const cost = prizeCost(picked);
      if (cost > 0) {
        await adjustSpinPool(-cost);
        const label = picked.prizeType === "voucher_percent" ? `${picked.label} (est. ${picked.value}% of RP ${spinSettings.spinAssumedBill.toLocaleString()})` : picked.label;
        await db.insert(ledgerEntries).values({ kind: "expense", category: "spin_prize", amount: String(cost), note: `Spin prize: ${label}`, refType: "spin_result", refId: String(result.id), userId });
      }

      const fresh = await storage.getUser(userId);
      res.json({
        prizeIndex: index, prize: picked, freeSpin, status,
        tokens: fresh?.tokens ?? 0, resultId: result.id,
        message:
          picked.prizeType === "nothing" ? tr(req, { en: "So close! Better luck next spin.", zh: "差一点！祝你下次好运。", id: "Hampir saja! Semoga beruntung di putaran berikutnya." }) :
          freeSpin ? tr(req, { en: "Free spin! Go again — this one's on us.", zh: "免费再转一次！这次算我们的。", id: "Putaran gratis! Putar lagi — yang ini gratis dari kami." }) :
          picked.prizeType === "pill" ? tr(req, { en: "You won a revival pill! Use it to revive or extend a pet.", zh: "你赢得了复活药丸！可用来复活宠物或延长寿命。", id: "Kamu memenangkan pil kebangkitan! Gunakan untuk membangkitkan atau memperpanjang umur peliharaan." }) :
          picked.prizeType === "egg" ? tr(req, { en: "You won a Doluruu egg! It will hatch in 15 days.", zh: "你赢得了一颗 Doluruu 蛋！它将在 15 天后孵化。", id: "Kamu memenangkan telur Doluruu! Telur akan menetas dalam 15 hari." }) :
          tr(req, { en: "You won {prize}! Show it to staff to redeem.", zh: "你赢得了 {prize}！出示给员工即可兑换。", id: "Kamu memenangkan {prize}! Tunjukkan ke staf untuk menukarkannya." }, { prize: picked.label }),
      });
    } catch (e) { console.error("spin", e); res.status(500).json({ message: tr(req, { en: "Spin failed", zh: "转盘失败", id: "Gagal memutar roda" }) }); }
  });

  app.get("/api/reborn/spin/history", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const cid = await rebornCompanyId(req);
      const rows = await db.select().from(spinResults).where(and(eq(spinResults.companyId, cid), eq(spinResults.userId, userId))).orderBy(desc(spinResults.createdAt)).limit(50);
      res.json(rows);
    } catch { res.json([]); }
  });

  // My redeemable prizes + whether the once-per-24h "use" is available
  app.get("/api/reborn/prizes", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const cid = await rebornCompanyId(req);
      const rows = await db.select().from(spinResults)
        .where(and(eq(spinResults.companyId, cid), eq(spinResults.userId, userId), sql`${spinResults.status} in ('unused','redeeming','redeemed')`))
        .orderBy(desc(spinResults.createdAt));
      const last = rows.filter((r) => r.redeemedAt).sort((a, b) => new Date(b.redeemedAt!).getTime() - new Date(a.redeemedAt!).getTime())[0];
      const lastUsedMs = last?.redeemedAt ? new Date(last.redeemedAt).getTime() : 0;
      const cooldownLeftMs = Math.max(0, lastUsedMs + DAY_MS - Date.now());
      res.json({ prizes: rows, canUseNow: cooldownLeftMs === 0, cooldownHoursLeft: Math.ceil(cooldownLeftMs / (60 * 60 * 1000)) });
    } catch { res.json({ prizes: [], canUseNow: true, cooldownHoursLeft: 0 }); }
  });

  // Use a prize (max 1 per 24 hours) → goes to staff for confirmation
  app.post("/api/reborn/prizes/:id/use", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const id = Number(req.params.id);
      const [prize] = await db.select().from(spinResults).where(and(eq(spinResults.id, id), eq(spinResults.userId, userId)));
      if (!prize) return res.status(404).json({ message: tr(req, { en: "Prize not found", zh: "找不到该奖品", id: "Hadiah tidak ditemukan" }) });
      if (prize.status !== "unused") return res.status(400).json({ message: tr(req, { en: "This prize can't be used.", zh: "此奖品无法使用。", id: "Hadiah ini tidak bisa digunakan." }) });
      const recent = await db.select().from(spinResults).where(and(eq(spinResults.userId, userId), sql`${spinResults.status} in ('redeeming','redeemed')`, sql`${spinResults.redeemedAt} > ${new Date(Date.now() - DAY_MS)}`));
      if (recent.length > 0) {
        const last = recent.sort((a, b) => new Date(b.redeemedAt!).getTime() - new Date(a.redeemedAt!).getTime())[0];
        const hrs = Math.ceil((new Date(last.redeemedAt!).getTime() + DAY_MS - Date.now()) / (60 * 60 * 1000));
        return res.status(400).json({ message: tr(req, { en: "You can only use 1 prize per day. Try again in ~{h}h.", zh: "每天只能使用 1 个奖品。请约 {h} 小时后再试。", id: "Kamu hanya bisa memakai 1 hadiah per hari. Coba lagi dalam ~{h} jam." }, { h: hrs }) });
      }
      const [row] = await db.update(spinResults).set({ status: "redeeming", redeemedAt: new Date() }).where(eq(spinResults.id, id)).returning();
      res.json({ message: tr(req, { en: "Prize activated! Show it to staff to receive it.", zh: "奖品已激活！出示给员工即可领取。", id: "Hadiah diaktifkan! Tunjukkan ke staf untuk menerimanya." }), prize: row });
    } catch (e) { console.error("use prize", e); res.status(500).json({ message: tr(req, { en: "Failed", zh: "操作失败", id: "Gagal" }) }); }
  });

  // ── Support + FAQ ────────────────────────────────────────────────────────
  app.get("/api/reborn/faq", async (req, res) => {
    try {
      await seedFaqIfEmpty();
      const rows = await db.select().from(faqItems).where(eq(faqItems.active, true)).orderBy(faqItems.sortOrder);
      const lang = reqLang(req);
      res.json(rows.map((r) => faqIn(r as any, lang)));
    } catch (e) { console.error("faq", e); res.status(500).json({ message: tr(req, { en: "Failed to load FAQ", zh: "常见问题加载失败", id: "Gagal memuat FAQ" }) }); }
  });

  async function getOrCreateTicket(userId: string) {
    const [open] = await db.select().from(supportTickets)
      .where(and(eq(supportTickets.userId, userId), sql`${supportTickets.status} != 'closed'`))
      .orderBy(desc(supportTickets.createdAt)).limit(1);
    if (open) return open;
    const [created] = await db.insert(supportTickets).values({
      userId, subject: "Chat with admin", category: "general", status: "open", priority: "normal",
    }).returning();
    return created;
  }

  app.get("/api/reborn/support/messages", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const ticket = await getOrCreateTicket(userId);
      const msgs = await db.select().from(supportMessages).where(eq(supportMessages.ticketId, ticket.id)).orderBy(supportMessages.createdAt);
      res.json({ ticketId: ticket.id, messages: msgs });
    } catch (e) { console.error("support msgs", e); res.status(500).json({ message: tr(req, { en: "Failed to load chat", zh: "聊天加载失败", id: "Gagal memuat obrolan" }) }); }
  });

  // Admin broadcasts this member received (shown pinned in the Chat tab).
  app.get("/api/reborn/announcements", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const rows = await db.select({ id: supportMessages.id, content: supportMessages.content, createdAt: supportMessages.createdAt })
        .from(supportMessages).innerJoin(supportTickets, eq(supportTickets.id, supportMessages.ticketId))
        .where(and(eq(supportTickets.userId, userId), eq(supportMessages.senderType, "staff"), sql`${supportMessages.content} LIKE '📢 %'`))
        .orderBy(desc(supportMessages.createdAt)).limit(30);
      res.json(rows.map((r) => {
        const text = String(r.content || "").replace(/^📢\s*/, "");
        const cut = text.indexOf("\n\n");
        return { id: r.id, title: cut >= 0 ? text.slice(0, cut) : text, body: cut >= 0 ? text.slice(cut + 2) : "", createdAt: r.createdAt };
      }));
    } catch (e) { console.error("announcements", e); res.status(500).json({ message: tr(req, { en: "Failed to load announcements", zh: "公告加载失败", id: "Gagal memuat pengumuman" }) }); }
  });

  app.post("/api/reborn/support/ask", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const content = String(req.body?.message || "").trim();
      if (!content) return res.status(400).json({ message: tr(req, { en: "Type a message first", zh: "请先输入消息", id: "Ketik pesan dulu" }) });
      const ticket = await getOrCreateTicket(userId);
      await db.insert(supportMessages).values({ ticketId: ticket.id, senderType: "user", senderId: userId, content });

      // Give Laya the approved FAQ catalogue as grounded support knowledge.
      // If Laya is disabled or unavailable, preserve the existing deterministic
      // FAQ matcher so support chat continues to work.
      await seedFaqIfEmpty();
      const faqs = await db.select().from(faqItems).where(eq(faqItems.active, true));
      const lc = content.toLowerCase();
      let best: any = null; let bestScore = 0;
      for (const f of faqs) {
        const kws = (f.keywords || "").toLowerCase().split(",").map((k) => k.trim()).filter(Boolean);
        let score = 0;
        for (const k of kws) if (k && lc.includes(k)) score += 2;
        if (f.question && lc.includes(f.question.toLowerCase().slice(0, 12))) score += 1;
        if (score > bestScore) { bestScore = score; best = f; }
      }
      const sLang = reqLang(req);
      const faqContext = faqs
        .map((f) => faqIn(f as any, sLang))
        .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
        .join("\n\n");
      let autoReply = await generateLayaSupportReply({
        ticketId: ticket.id,
        message: content,
        category: ticket.category,
        faqContext,
        language: sLang,
      });
      if (!autoReply && best && bestScore > 0) autoReply = faqIn(best as any, sLang).answer;
      if (autoReply) {
        await db.insert(supportMessages).values({ ticketId: ticket.id, senderType: "ai", content: autoReply });
        await db.update(supportTickets).set({ status: "ai_replied", updatedAt: new Date() }).where(eq(supportTickets.id, ticket.id));
      }
      const msgs = await db.select().from(supportMessages).where(eq(supportMessages.ticketId, ticket.id)).orderBy(supportMessages.createdAt);
      res.json({ ticketId: ticket.id, autoReply, messages: msgs });
    } catch (e) { console.error("support ask", e); res.status(500).json({ message: tr(req, { en: "Send failed", zh: "发送失败", id: "Gagal mengirim" }) }); }
  });

  // ── KOS (Kings of Singers) — KGOLD gifting + leaderboard ─────────────────
  // KOS ranking: "tonight" (checked-in members, KGOLD received since check-in) or
  // "month" (everyone, KGOLD received this month). Each row carries the member's
  // top 3 gifters for that period and their Gifter / Star levels.
  app.get("/api/reborn/kos/leaderboard", requireAuth, async (req, res) => {
    try {
      const session = await ensureVenueSession();
      const cid = await rebornCompanyId(req);
      const period = req.query.period === "month" ? "month" : "tonight";
      const monthStart = new Date(`${session.day.slice(0, 7)}-01T${String(VENUE_DAY_START_HOUR - 7).padStart(2, "0")}:00:00Z`);
      const since = period === "month" ? monthStart : venueDayStart(session.day);
      const result = period === "month"
        ? await db.execute(sql`SELECT u.id,u.first_name AS "firstName",u.username,u.profile_image_url AS photo,SUM(g.recipient_kgold)::bigint AS stars,
              EXISTS(SELECT 1 FROM venue_checkins v WHERE v.user_id=u.id AND v.venue_day=${session.day} AND v.session_code=${session.code} AND v.checked_out_at IS NULL) AS "checkedIn"
            FROM kos_gifts g JOIN users u ON u.id=g.to_user_id
            WHERE g.company_id=${cid} AND g.created_at>=${since}
            GROUP BY u.id,u.first_name,u.username,u.profile_image_url ORDER BY stars DESC LIMIT 100`)
        : await db.execute(sql`SELECT u.id,u.first_name AS "firstName",u.username,u.profile_image_url AS photo,COALESCE(SUM(g.recipient_kgold),0)::bigint AS stars, true AS "checkedIn"
            FROM venue_checkins v JOIN users u ON u.id=v.user_id
            LEFT JOIN kos_gifts g ON g.to_user_id=u.id AND g.created_at>=v.checked_in_at AND g.company_id=${cid}
            WHERE v.venue_day=${session.day} AND v.session_code=${session.code} AND v.checked_out_at IS NULL
            GROUP BY u.id,u.first_name,u.username,u.profile_image_url,v.checked_in_at ORDER BY stars DESC,v.checked_in_at ASC LIMIT 100`);
      const rows = ((result.rows || result) as any[]).map((r) => ({ ...r, stars: Number(r.stars || 0) }));
      // Top 3 gifters of each member in this period.
      const ids = rows.map((r) => r.id);
      const tops = new Map<string, any[]>();
      if (ids.length) {
        const t: any = await db.execute(sql`SELECT g.to_user_id AS "to", g.from_user_id AS id, u.first_name AS "firstName", u.username, u.profile_image_url AS photo, SUM(g.kgold_cost)::bigint AS sent
          FROM kos_gifts g JOIN users u ON u.id=g.from_user_id
          WHERE g.company_id=${cid} AND g.created_at>=${since} AND g.to_user_id IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})
          GROUP BY g.to_user_id, g.from_user_id, u.first_name, u.username, u.profile_image_url ORDER BY sent DESC`);
        for (const r of (t.rows || t) as any[]) { const list = tops.get(r.to) || []; if (list.length < 3) list.push({ id: r.id, firstName: r.firstName, username: r.username, photo: r.photo, sent: Number(r.sent) || 0 }); tops.set(r.to, list); }
      }
      const s = await getSettings();
      const lv = await giftLevels(cid, [...ids, ...Array.from(tops.values()).flat().map((x) => x.id)], s);
      const lvOf = (id: string) => ({ senderLevel: lv.get(id)?.sender.level || 1, receiverLevel: lv.get(id)?.receiver.level || 1 });
      res.json(rows.map((r) => ({ ...r, ...lvOf(r.id), topGifters: (tops.get(r.id) || []).map((g) => ({ ...g, ...lvOf(g.id) })) })));
    } catch (e) { console.error("kos leaderboard", e); res.status(500).json({ message: tr(req, { en: "Failed to load leaderboard", zh: "排行榜加载失败", id: "Gagal memuat papan peringkat" }) }); }
  });
  // My Gifter + Star levels (profile page, level-up animation).
  app.get("/api/reborn/kos/levels/me", requireAuth, async (req, res) => {
    const uid = getUserId(req)!;
    const lv = (await giftLevels(await rebornCompanyId(req), [uid], await getSettings())).get(uid);
    res.json({ maxLevel: MAX_LEVEL, sender: lv?.sender, receiver: lv?.receiver });
  });
  // Admin preview: KGOLD needed for every level with the current settings.
  app.get("/api/reborn/admin/gift-levels", requireAdmin(async (_req, res) => {
    const c = levelConfigs(await getSettings());
    res.json({ sender: levelCurve(c.sender).slice(1), receiver: levelCurve(c.receiver).slice(1) });
  }));

  app.get("/api/reborn/kos/search", requireAuth, async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      const me = getUserId(req)!;
      if (q.length < 2) return res.json([]);
      const session = await ensureVenueSession();
      const result = await db.execute(sql`SELECT u.id,u.first_name AS "firstName",u.username,u.profile_image_url AS photo FROM venue_checkins v JOIN users u ON u.id=v.user_id
        WHERE v.venue_day=${session.day} AND v.session_code=${session.code} AND v.checked_out_at IS NULL AND u.id<>${me}
        AND (u.username ILIKE ${`%${q}%`} OR u.first_name ILIKE ${`%${q}%`}) LIMIT 20`);
      res.json(result.rows || result);
    } catch { res.json([]); }
  });

  app.get("/api/reborn/kos/gifttypes", async (req, res) => {
    try {
      const cid = await rebornCompanyId(req);
      await seedGiftTypesIfEmpty(cid);
      const rows = await db.select().from(kosGiftTypes).where(and(eq(kosGiftTypes.companyId, cid), eq(kosGiftTypes.active, true))).orderBy(kosGiftTypes.kgoldCost, kosGiftTypes.sortOrder, kosGiftTypes.id); // cheapest first
      res.json(rows);
    } catch (e) { console.error("gifttypes", e); res.status(500).json({ message: tr(req, { en: "Failed", zh: "操作失败", id: "Gagal" }) }); }
  });

  app.get("/api/reborn/kos/wallet", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const u = await storage.getUser(userId);
      const s = await getSettings();
      const cid = await rebornCompanyId(req);
      const [got] = await db.select({ stars: sql<number>`coalesce(sum(${kosGifts.recipientKgold}),0)` }).from(kosGifts).where(and(eq(kosGifts.companyId, cid), eq(kosGifts.toUserId, userId)));
      res.json({
        kgold: Number(u?.kgold ?? 0), credits: Number(u?.credits || 0), starsReceived: Number(got?.stars || 0),
        kgoldPerRp: s.kgoldPerRp, minBuyKgold: s.minBuyKgold, minCashoutRp: s.minCashoutRp, feePercent: s.giftFeePercent,
      });
    } catch (e) { console.error("kos wallet", e); res.status(500).json({ message: tr(req, { en: "Failed", zh: "操作失败", id: "Gagal" }) }); }
  });

  app.post("/api/reborn/kos/buy", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const kgold = Math.floor(Number(req.body?.kgold) || 0);
      const s = await getSettings();
      if (kgold < s.minBuyKgold) return res.status(400).json({ message: tr(req, { en: "Minimum purchase is {n} KGOLD.", zh: "最低购买 {n} KGOLD。", id: "Pembelian minimum {n} KGOLD." }, { n: fmtN(s.minBuyKgold, reqLang(req)) }) });
      const rpCost = kgold / s.kgoldPerRp;
      const u = await storage.getUser(userId);
      if (!u || Number(u.credits || 0) < rpCost) return res.status(400).json({ message: tr(req, { en: "Not enough credits. This costs RP {n}.", zh: "余额不足，需要 RP {n}。", id: "Saldo tidak cukup. Biayanya RP {n}." }, { n: fmtN(rpCost, reqLang(req)) }) });
      const now = new Date();
      await db.update(users).set({ credits: sql`${users.credits} - ${rpCost}`, kgold: sql`${users.kgold} + ${kgold}`, updatedAt: now }).where(eq(users.id, userId));
      await db.insert(memberWalletTransactions).values({ userId, type: "kgold_purchase", rpAmount: String(-rpCost), kgoldAmount: kgold, description: `Bought ${kgold.toLocaleString()} KGOLD` });
      const fresh = await storage.getUser(userId);
      res.json({ message: tr(req, { en: "Bought {n} KGOLD.", zh: "已购买 {n} KGOLD。", id: "Berhasil membeli {n} KGOLD." }, { n: fmtN(kgold, reqLang(req)) }), kgold: fresh?.kgold ?? 0, credits: Number(fresh?.credits || 0) });
    } catch (e) { console.error("kos buy", e); res.status(500).json({ message: tr(req, { en: "Purchase failed", zh: "购买失败", id: "Pembelian gagal" }) }); }
  });

  app.post("/api/reborn/kos/cashout", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const s = await getSettings();
      const u = await storage.getUser(userId);
      const kgoldBal = u?.kgold ?? 0;
      const kgold = Math.floor(Number(req.body?.kgold) || kgoldBal);
      const rp = kgold / s.kgoldPerRp;
      if (rp < s.minCashoutRp) return res.status(400).json({ message: tr(req, { en: "You need at least {k} KGOLD (RP {rp}) to cash out.", zh: "至少需要 {k} KGOLD（RP {rp}）才能兑现。", id: "Kamu butuh minimal {k} KGOLD (RP {rp}) untuk mencairkan." }, { k: fmtN(s.minCashoutRp * s.kgoldPerRp, reqLang(req)), rp: fmtN(s.minCashoutRp, reqLang(req)) }) });
      if (kgold > kgoldBal) return res.status(400).json({ message: tr(req, { en: "Not enough KGOLD.", zh: "KGOLD 不足。", id: "KGOLD tidak cukup." }) });
      const now = new Date();
      await db.update(users).set({ kgold: sql`${users.kgold} - ${kgold}`, credits: sql`${users.credits} + ${rp}`, updatedAt: now }).where(eq(users.id, userId));
      await db.insert(memberWalletTransactions).values({ userId, type: "kgold_cashout", rpAmount: String(rp), kgoldAmount: -kgold, description: `Cashed out ${kgold.toLocaleString()} KGOLD` });
      const fresh = await storage.getUser(userId);
      res.json({ message: tr(req, { en: "Cashed out {k} KGOLD → RP {rp} credits.", zh: "已兑现 {k} KGOLD → 余额 RP {rp}。", id: "Berhasil mencairkan {k} KGOLD → saldo RP {rp}." }, { k: fmtN(kgold, reqLang(req)), rp: fmtN(rp, reqLang(req)) }), kgold: fresh?.kgold ?? 0, credits: Number(fresh?.credits || 0) });
    } catch (e) { console.error("kos cashout", e); res.status(500).json({ message: tr(req, { en: "Cash out failed", zh: "兑现失败", id: "Pencairan gagal" }) }); }
  });

  app.post("/api/reborn/kos/gift", requireAuth, async (req, res) => {
    try {
      const fromUserId = getUserId(req)!;
      const toUserId = String(req.body?.toUserId || "");
      const giftTypeId = Number(req.body?.giftTypeId);
      if (!toUserId) return res.status(400).json({ message: tr(req, { en: "Choose someone to gift", zh: "请选择要送礼的对象", id: "Pilih orang yang ingin diberi hadiah" }) });
      if (toUserId === fromUserId) return res.status(400).json({ message: tr(req, { en: "You can't gift yourself", zh: "不能给自己送礼", id: "Kamu tidak bisa memberi hadiah ke diri sendiri" }) });
      const session = await ensureVenueSession();
      const [present] = await db.select({ id: venueCheckins.id }).from(venueCheckins).where(and(eq(venueCheckins.userId, toUserId), eq(venueCheckins.venueDay, session.day), eq(venueCheckins.sessionCode, session.code), sql`${venueCheckins.checkedOutAt} IS NULL`)).limit(1);
      if (!present) return res.status(400).json({ message: tr(req, { en: "This member is not checked in at the venue.", zh: "该会员尚未在店内签到。", id: "Member ini belum check-in di tempat." }) });
      const cid = await rebornCompanyId(req);
      const [gt] = await db.select().from(kosGiftTypes).where(and(eq(kosGiftTypes.id, giftTypeId), eq(kosGiftTypes.companyId, cid)));
      if (!gt || !gt.active) return res.status(404).json({ message: tr(req, { en: "Gift not found", zh: "找不到该礼物", id: "Hadiah tidak ditemukan" }) });
      const giver = await storage.getUser(fromUserId);
      const cost = gt.kgoldCost || 0;
      if (!giver || (giver.kgold || 0) < cost) return res.status(400).json({ message: tr(req, { en: "Need {n} KGOLD for a {gift}. Buy more KGOLD first.", zh: "送出 {gift} 需要 {n} KGOLD，请先购买更多 KGOLD。", id: "Butuh {n} KGOLD untuk {gift}. Beli KGOLD dulu." }, { n: fmtN(cost, reqLang(req)), gift: gt.name }) });
      const s = await getSettings();
      const recipientKgold = Math.floor(cost * (100 - s.giftFeePercent) / 100);
      const before = await giftLevels(cid, [fromUserId, toUserId], s);
      const now = new Date();
      await db.update(users).set({ kgold: sql`${users.kgold} - ${cost}`, updatedAt: now }).where(eq(users.id, fromUserId));
      await db.update(users).set({ kgold: sql`${users.kgold} + ${recipientKgold}`, updatedAt: now }).where(eq(users.id, toUserId));
      const [giftRow] = await db.insert(kosGifts).values({ companyId: cid, fromUserId, toUserId, giftTypeId, giftName: gt.name, kgoldCost: cost, recipientKgold, seen: false }).returning();
      await db.insert(memberWalletTransactions).values([
        { userId: fromUserId, type: "kgold_gift_sent", kgoldAmount: -cost, description: `Sent ${gt.name}`, referenceType: "kos_gift", referenceId: String(giftRow.id) },
        { userId: toUserId, type: "kgold_gift_received", kgoldAmount: recipientKgold, description: `Received ${gt.name}`, referenceType: "kos_gift", referenceId: String(giftRow.id) },
      ]);
      const giverName = (lang: Lang) => giver.firstName || giver.username || pick(lang, { en: "Someone", zh: "有人", id: "Seseorang" });
      await notifyUserI18n(toUserId, "kos_gift", (lang) => ({
        title: pick(lang, { en: "{name} sent you {gift}", zh: "{name} 送了你 {gift}", id: "{name} mengirimimu {gift}" }, { name: giverName(lang), gift: gt.name }),
        body: pick(lang, { en: "You received {n} KGOLD", zh: "你收到了 {n} KGOLD", id: "Kamu menerima {n} KGOLD" }, { n: fmtN(recipientKgold, lang) }),
      }), { path: "/kos" });
      pushUserI18n(toUserId, (lang) => ({ title: pick(lang, { en: "🎁 You received a gift!", zh: "🎁 你收到了一份礼物！", id: "🎁 Kamu menerima hadiah!" }), body: pick(lang, { en: "{name} sent you a {gift} · +{n} KGOLD", zh: "{name} 送了你 {gift} · +{n} KGOLD", id: "{name} mengirimimu {gift} · +{n} KGOLD" }, { name: giverName(lang), gift: gt.name, n: fmtN(recipientKgold, lang) }), url: "/reborn-kos", tag: "gift" })).catch(() => {});
      // Level ups: the sender's Gifter level, the recipient's Star level.
      const after = await giftLevels(cid, [fromUserId, toUserId], s);
      const senderUp = (after.get(fromUserId)?.sender.level || 1) > (before.get(fromUserId)?.sender.level || 1) ? after.get(fromUserId)!.sender.level : null;
      const starUp = (after.get(toUserId)?.receiver.level || 1) > (before.get(toUserId)?.receiver.level || 1) ? after.get(toUserId)!.receiver.level : null;
      if (starUp) notifyUserI18n(toUserId, "kos_level", (lang) => ({
        title: pick(lang, { en: "⭐ Star level up — Lv.{n}!", zh: "⭐ 明星等级提升——Lv.{n}！", id: "⭐ Level Bintang naik — Lv.{n}!" }, { n: starUp }),
        body: pick(lang, { en: "Your gifts received took you to Star Lv.{n}. New ring unlocked when you hit a new tier!", zh: "你收到的礼物让你升到明星 Lv.{n}。达到新段位会解锁新头像框！", id: "Hadiah yang kamu terima membawamu ke Bintang Lv.{n}. Bingkai baru terbuka di tingkat baru!" }, { n: starUp }),
      }), { path: "/profile" }).catch(() => {});
      const fresh = await storage.getUser(fromUserId);
      res.json({ message: tr(req, { en: "Sent a {gift}!", zh: "已送出 {gift}！", id: "{gift} terkirim!" }, { gift: gt.name }), kgold: fresh?.kgold ?? 0, levelUp: senderUp ? { kind: "sender", level: senderUp } : null });
    } catch (e) { console.error("kos gift", e); res.status(500).json({ message: tr(req, { en: "Gift failed", zh: "送礼失败", id: "Gagal mengirim hadiah" }) }); }
  });

  // Notifications: unseen gifts received (with gift image/animation + sender)
  app.get("/api/reborn/kos/notifications", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const rows = await db.select({
        id: kosGifts.id, giftName: kosGifts.giftName, recipientKgold: kosGifts.recipientKgold, createdAt: kosGifts.createdAt,
        fromName: users.firstName, fromUsername: users.username,
        emoji: kosGiftTypes.emoji, imageUrl: kosGiftTypes.imageUrl, animation: kosGiftTypes.animation,
      }).from(kosGifts)
        .leftJoin(users, eq(users.id, kosGifts.fromUserId))
        .leftJoin(kosGiftTypes, eq(kosGiftTypes.id, kosGifts.giftTypeId))
        .where(and(eq(kosGifts.companyId, await rebornCompanyId(req)), eq(kosGifts.toUserId, userId), eq(kosGifts.seen, false)))
        .orderBy(desc(kosGifts.createdAt)).limit(20);
      res.json(rows);
    } catch { res.json([]); }
  });
  app.post("/api/reborn/kos/notifications/seen", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      await db.update(kosGifts).set({ seen: true }).where(and(eq(kosGifts.companyId, await rebornCompanyId(req)), eq(kosGifts.toUserId, userId), eq(kosGifts.seen, false)));
      res.json({ ok: true });
    } catch { res.json({ ok: false }); }
  });

  // Daily venue attendance controls who appears in Kings of Singers.
  app.get("/api/reborn/venue/status", requireAuth, async (req, res) => {
    const userId = getUserId(req)!;
    const session = await ensureVenueSession();
    const row = await activeCheckin(userId);
    res.json({ checkedIn: !!row, day: session.day, checkedInAt: row?.checkedInAt || null, table: row?.tableLabel || null });
  });
  // "Call service": only for a member who scanned in at a table; staff are told which table.
  app.post("/api/reborn/venue/call-service", requireAuth, async (req, res) => {
    const userId = getUserId(req)!;
    const table = (await activeCheckin(userId))?.tableLabel;
    if (!table) return res.status(400).json({ message: tr(req, { en: "Scan your table's QR code first, then call service.", zh: "请先扫描桌上的二维码，再呼叫服务。", id: "Pindai dulu kode QR meja Anda, lalu panggil layanan." }) });
    const calls = await openServiceCalls();
    const alreadyCalling = calls.some((call) => call.userId === userId && Date.now() - call.at < SERVICE_CALL_COOLDOWN_MS);
    if (alreadyCalling) return res.status(429).json({ message: tr(req, { en: "Staff have been told. Please give them a moment.", zh: "已通知服务员，请稍等片刻。", id: "Staf sudah diberi tahu. Mohon tunggu sebentar." }) });
    const [member] = await db.select().from(users).where(eq(users.id, userId));
    const name = [member?.firstName, member?.lastName].filter(Boolean).join(" ") || member?.username || "Member";
    await saveServiceCalls([...calls.filter((call) => call.userId !== userId), { id: randomUUID(), table, userId, name, at: Date.now() }]);
    const notice = (lang: Lang) => ({
      title: pick(lang, { en: "🔔 Table {t} is calling", zh: "🔔 {t} 桌呼叫服务", id: "🔔 Meja {t} memanggil" }, { t: table }),
      body: pick(lang, { en: "{name} asks for service.", zh: "{name} 需要服务。", id: "{name} meminta layanan." }, { name }),
    });
    void notifyStaffI18n("service_call", notice, { path: "/pos", table }).catch((error) => console.error("[service call] notice", error));
    pushAdminsI18n((lang) => ({ ...notice(lang), url: "/pos", tag: `service-${table}` })).catch(() => {});
    void notifyAdmins(`🔔 Table ${table}: ${name} is calling for service.`).catch(() => {});
    res.json({ message: tr(req, { en: "Staff have been called to table {t}.", zh: "已呼叫服务员前往 {t} 桌。", id: "Staf sudah dipanggil ke meja {t}." }, { t: table }) });
  });
  app.get("/api/reborn/venue/service-calls", requireStaff(async (_req, res) => {
    res.json(await openServiceCalls());
  }));
  app.post("/api/reborn/venue/service-calls/:id/done", requireStaff(async (req, res) => {
    await saveServiceCalls((await openServiceCalls()).filter((call) => call.id !== req.params.id));
    res.json({ ok: true });
  }));
  app.post("/api/reborn/venue/checkin", requireAuth, async (req, res) => {
    const userId = getUserId(req)!;
    // Table QR (fixed, printed on each table): checks in and seats you at that table.
    const table = String(req.body?.table || "").trim();
    if (table) {
      if (String(req.body?.k || "") !== await tableSig(table)) return res.status(400).json({ message: tr(req, { en: "This table QR isn't valid. Ask staff for help.", zh: "此桌位二维码无效，请联系员工。", id: "QR meja ini tidak valid. Minta bantuan staf." }) });
      const row = await venueCheckIn(userId, table);
      await markArrivedFromScan(userId, table).catch((e) => console.warn("arrived from scan", e));
      return res.json({ message: tr(req, { en: "Checked in at table {t}. You now appear in Kings of Singers.", zh: "已在 {t} 号桌签到！你已出现在歌王之王中。", id: "Berhasil check-in di meja {t}. Kamu sekarang tampil di Raja Penyanyi." }, { t: table }), checkin: row, table });
    }
    const session = await ensureVenueSession();
    if (String(req.body?.code || "").trim().toUpperCase() !== session.code) return res.status(400).json({ message: tr(req, { en: "This venue QR has expired. Scan today's QR.", zh: "此场地二维码已过期，请扫描今天的二维码。", id: "QR tempat ini sudah kedaluwarsa. Pindai QR hari ini." }) });
    const row = await venueCheckIn(userId, null);
    res.json({ message: tr(req, { en: "Checked in. You now appear in Kings of Singers.", zh: "签到成功！你已出现在歌王之王中。", id: "Berhasil check-in. Kamu sekarang tampil di Raja Penyanyi." }), checkin: row, table: row?.tableLabel || null });
  });
  // Admin: the fixed QR for every table (print once, stick on the table).
  app.get("/api/reborn/admin/venue/tables", requireAdmin(async (req, res) => {
    const host = `${req.protocol}://${req.get("host")}`;
    const session = await ensureVenueSession();
    const seated = await db.select({ table: venueCheckins.tableLabel, n: sql<number>`count(*)::int` }).from(venueCheckins)
      .where(and(eq(venueCheckins.venueDay, session.day), eq(venueCheckins.sessionCode, session.code), sql`${venueCheckins.checkedOutAt} IS NULL`, isNotNull(venueCheckins.tableLabel))).groupBy(venueCheckins.tableLabel);
    const count = new Map(seated.map((x) => [x.table, Number(x.n) || 0]));
    const out = [];
    for (const t of await venueTables()) {
      const link = `${host}/kos?table=${encodeURIComponent(t.label)}&k=${await tableSig(t.label)}`;
      const svg = await QRCode.toString(link, { type: "svg", width: 360, margin: 1, color: { dark: "#120b20", light: "#ffffff" } });
      out.push({ ...t, link, svg, checkedIn: count.get(t.label) || 0 });
    }
    res.json(out);
  }));
  app.get("/api/reborn/admin/venue/session", requireAdmin(async (req, res) => {
    const session = await ensureVenueSession();
    const [count] = await db.select({ count: sql<number>`count(*)` }).from(venueCheckins).where(and(eq(venueCheckins.venueDay, session.day), eq(venueCheckins.sessionCode, session.code), sql`${venueCheckins.checkedOutAt} IS NULL`));
    const host = `${req.protocol}://${req.get("host")}`;
    res.json({ ...session, count: Number(count?.count) || 0, link: `${host}/kos?venue=${encodeURIComponent(session.code)}` });
  }));
  app.get("/api/reborn/admin/venue/qr", requireAdmin(async (req, res) => {
    const session = await ensureVenueSession();
    const host = `${req.protocol}://${req.get("host")}`;
    const svg = await QRCode.toString(`${host}/kos?venue=${encodeURIComponent(session.code)}`, { type: "svg", width: 720, margin: 2, color: { dark: "#120b20", light: "#ffffff" } });
    res.type("image/svg+xml").send(svg);
  }));
  app.post("/api/reborn/admin/venue/close", requireManager(async (req, res) => {
    const current = await ensureVenueSession();
    const report = await buildDailyClosingReport(current.day);
    const reportNote = JSON.stringify(report);
    const [saved] = await db.select().from(ledgerEntries).where(and(eq(ledgerEntries.refType, "pos_closing"), eq(ledgerEntries.refId, current.day))).limit(1);
    if (saved) await db.update(ledgerEntries).set({ note: reportNote, userId: getUserId(req)! }).where(eq(ledgerEntries.id, saved.id));
    else await db.insert(ledgerEntries).values({ kind: "income", category: "daily_closing", amount: "0", note: reportNote, refType: "pos_closing", refId: current.day, userId: getUserId(req)! });
    await db.update(venueCheckins).set({ checkedOutAt: new Date() }).where(and(eq(venueCheckins.venueDay, current.day), eq(venueCheckins.sessionCode, current.code), sql`${venueCheckins.checkedOutAt} IS NULL`));
    // Day closed: the song on now counts as sung, waiting songs are cleared.
    await db.update(songRequests).set({ status: "confirmed" }).where(eq(songRequests.status, "playing"));
    await db.update(songRequests).set({ status: "cancelled", adminNote: "Day closed" }).where(eq(songRequests.status, "pending"));
    await setSongQueuePaused(false); // a new night starts unpaused
    emitLiveUpdate("/api/reborn/song-queue", { action: "DAY_CLOSED" });
    const next = await ensureVenueSession(true);
    emitLiveUpdate("kos", { type: "venue_closed" });
    await logAdmin(req, { targetType: "pos_closing", targetId: current.day, action: "close_pos_day", entityType: "accounting", description: `Closed POS day ${current.day}: RP ${report.totals.revenue.toLocaleString()} revenue, RP ${report.totals.profit.toLocaleString()} profit` });
    res.json({ message: tr(req, { en: "POS day closed. The daily report was saved in Accounting, guests were cleared and a new QR is ready.", zh: "POS 营业日已结束。日报已保存到会计，顾客已清空，新的二维码已生成。", id: "Hari POS ditutup. Laporan harian disimpan di Akuntansi, tamu sudah dikosongkan, dan QR baru sudah siap." }), report, ...next });
  }));

  app.get("/api/reborn/history", requireAuth, async (req, res) => {
    const userId = getUserId(req)!;
    const cid = await rebornCompanyId(req);
    const [wallet, topups, tickets, prizes, gifts] = await Promise.all([
      // wallet + top-ups are the user's overall money wallet (user-level, global)
      db.select().from(memberWalletTransactions).where(eq(memberWalletTransactions.userId, userId)).orderBy(desc(memberWalletTransactions.createdAt)).limit(300),
      db.select().from(topUpRequests).where(eq(topUpRequests.userId, userId)).orderBy(desc(topUpRequests.createdAt)).limit(100),
      // tickets / prizes / gifts are this-business activity → scoped to the company
      db.select().from(posTickets).where(and(eq(posTickets.companyId, cid), eq(posTickets.memberId, userId))).orderBy(desc(posTickets.createdAt)).limit(100),
      db.select().from(spinResults).where(and(eq(spinResults.companyId, cid), eq(spinResults.userId, userId))).orderBy(desc(spinResults.createdAt)).limit(100),
      db.select().from(kosGifts).where(and(eq(kosGifts.companyId, cid), or(eq(kosGifts.fromUserId, userId), eq(kosGifts.toUserId, userId)))).orderBy(desc(kosGifts.createdAt)).limit(200),
    ]);
    const ticketIds = tickets.map((ticket) => ticket.id);
    const items = ticketIds.length ? await db.select().from(posTicketItems).where(inArray(posTicketItems.orderId, ticketIds)) : [];
    res.json({ wallet, topups, tickets: tickets.map((ticket) => ({ ...ticket, items: items.filter((item) => item.orderId === ticket.id) })), prizes, gifts: gifts.map((gift) => ({ ...gift, direction: gift.toUserId === userId ? "received" : "sent" })) });
  });

  // ── Chat: friend requests + member-to-member messaging ───────────────────
  app.post("/api/reborn/chat/request", requireAuth, async (req, res) => {
    try {
      const me = getUserId(req)!;
      const toUserId = String(req.body?.toUserId || "");
      if (!toUserId || toUserId === me) return res.status(400).json({ message: tr(req, { en: "Pick a member to add", zh: "请选择要添加的会员", id: "Pilih member yang ingin ditambahkan" }) });
      const existing = await db.select().from(friendships).where(or(
        and(eq(friendships.requesterId, me), eq(friendships.addresseeId, toUserId)),
        and(eq(friendships.requesterId, toUserId), eq(friendships.addresseeId, me)),
      ));
      if (existing.length) return res.json({ message: existing[0].status === "accepted" ? tr(req, { en: "You're already friends", zh: "你们已经是好友了", id: "Kalian sudah berteman" }) : tr(req, { en: "Request already pending", zh: "好友请求正在等待回应", id: "Permintaan masih menunggu" }) });
      await db.insert(friendships).values({ requesterId: me, addresseeId: toUserId, status: "pending" });
      const sender = await storage.getUser(me);
      await notifyUserI18n(toUserId, "friend_request", (lang) => ({ title: pick(lang, { en: "New friend request", zh: "新的好友请求", id: "Permintaan pertemanan baru" }), body: pick(lang, { en: "{name} wants to connect", zh: "{name} 想加你为好友", id: "{name} ingin berteman denganmu" }, { name: sender?.firstName || sender?.username || pick(lang, { en: "A member", zh: "一位会员", id: "Seorang member" }) }) }), { path: "/chat" });
      res.json({ message: tr(req, { en: "Friend request sent!", zh: "好友请求已发送！", id: "Permintaan pertemanan terkirim!" }) });
    } catch (e) { console.error("chat req", e); res.status(500).json({ message: tr(req, { en: "Request failed", zh: "请求失败", id: "Permintaan gagal" }) }); }
  });

  app.post("/api/reborn/chat/respond", requireAuth, async (req, res) => {
    try {
      const me = getUserId(req)!;
      const id = Number(req.body?.id);
      const accept = req.body?.accept !== false;
      const [f] = await db.select().from(friendships).where(eq(friendships.id, id));
      if (!f || f.addresseeId !== me) return res.status(404).json({ message: tr(req, { en: "Request not found", zh: "找不到该请求", id: "Permintaan tidak ditemukan" }) });
      if (accept) await db.update(friendships).set({ status: "accepted", updatedAt: new Date() }).where(eq(friendships.id, id));
      else await db.delete(friendships).where(eq(friendships.id, id));
      res.json({ message: accept ? tr(req, { en: "You're now friends!", zh: "你们现在是好友了！", id: "Kalian sekarang berteman!" }) : tr(req, { en: "Request declined", zh: "已拒绝请求", id: "Permintaan ditolak" }) });
    } catch (e) { console.error("chat respond", e); res.status(500).json({ message: tr(req, { en: "Failed", zh: "操作失败", id: "Gagal" }) }); }
  });

  app.get("/api/reborn/chat/friends", requireAuth, async (req, res) => {
    try {
      const me = getUserId(req)!;
      const all = await db.select().from(friendships).where(or(eq(friendships.requesterId, me), eq(friendships.addresseeId, me)));
      const otherIds = Array.from(new Set(all.map((f) => (f.requesterId === me ? f.addresseeId : f.requesterId))));
      const userRows = otherIds.length ? await db.select({ id: users.id, firstName: users.firstName, username: users.username, photo: users.profileImageUrl }).from(users).where(sql`${users.id} in (${sql.join(otherIds.map((i) => sql`${i}`), sql`, `)})`) : [];
      const umap = Object.fromEntries(userRows.map((u) => [u.id, u]));
      const messages = otherIds.length ? (await db.select(CHAT_COLS).from(chatMessages).where(or(and(eq(chatMessages.senderId, me), inArray(chatMessages.receiverId, otherIds)), and(eq(chatMessages.receiverId, me), inArray(chatMessages.senderId, otherIds)))).orderBy(desc(chatMessages.createdAt))).filter((m) => !hiddenFrom(m, me)).map(chatView) : [];
      const latest = new Map<string, any>();
      const unread = new Map<string, number>();
      for (const message of messages) {
        const oid = message.senderId === me ? message.receiverId : message.senderId; if (!latest.has(oid)) latest.set(oid, message);
        if (message.receiverId === me && !message.isRead) unread.set(oid, (unread.get(oid) || 0) + 1);
      }
      const friends = all.filter((f) => f.status === "accepted").map((f) => { const oid = f.requesterId === me ? f.addresseeId : f.requesterId; return { friendshipId: f.id, user: umap[oid] || { id: oid }, lastMessage: latest.get(oid) || null, unread: unread.get(oid) || 0 }; }).sort((a, b) => new Date(b.lastMessage?.createdAt || 0).getTime() - new Date(a.lastMessage?.createdAt || 0).getTime());
      const incoming = all.filter((f) => f.status === "pending" && f.addresseeId === me).map((f) => ({ friendshipId: f.id, user: umap[f.requesterId] || { id: f.requesterId } }));
      const outgoing = all.filter((f) => f.status === "pending" && f.requesterId === me).map((f) => ({ friendshipId: f.id, user: umap[f.addresseeId] || { id: f.addresseeId } }));
      res.json({ friends, incoming, outgoing });
    } catch (e) { console.error("chat friends", e); res.status(500).json({ message: tr(req, { en: "Failed", zh: "操作失败", id: "Gagal" }) }); }
  });

  // Counts for the badges on the bottom menu: unread chats (+ friend requests),
  // gifts not yet opened on KOS, and things the member's pets need right now.
  app.get("/api/reborn/badges", requireAuth, async (req, res) => {
    try {
      const me = getUserId(req)!;
      const friendRows = await db.select().from(friendships).where(and(eq(friendships.status, "accepted"), or(eq(friendships.requesterId, me), eq(friendships.addresseeId, me))));
      const friendIds = friendRows.map((f) => (f.requesterId === me ? f.addresseeId : f.requesterId));
      const [{ n: msgs }] = friendIds.length
        ? await db.select({ n: sql<number>`count(*)::int` }).from(chatMessages).where(and(eq(chatMessages.receiverId, me), eq(chatMessages.isRead, false), inArray(chatMessages.senderId, friendIds)))
        : [{ n: 0 }];
      const [{ n: requests }] = await db.select({ n: sql<number>`count(*)::int` }).from(friendships).where(and(eq(friendships.addresseeId, me), eq(friendships.status, "pending")));
      const [{ n: gifts }] = await db.select({ n: sql<number>`count(*)::int` }).from(kosGifts).where(and(eq(kosGifts.companyId, await rebornCompanyId(req)), eq(kosGifts.toUserId, me), eq(kosGifts.seen, false)));
      let pet = 0;
      for (const p of await db.select().from(pets).where(and(eq(pets.userId, me), eq(pets.isActive, true)))) {
        const v: any = petView(await refreshPet(p));
        if (v.isEgg || v.lifeStatus === "dead") continue;
        if (v.lifeStatus === "sick") { pet++; continue; }
        const low = (k: string, at: number) => Number(v[k] ?? 100) < at;
        pet += [low("hunger", 40), low("happiness", 40), low("cleanliness", 40), !v.isSleeping && low("energy", 20)].filter(Boolean).length;
      }
      res.json({ chat: Number(msgs) + Number(requests), kos: Number(gifts), pet });
    } catch (e) { console.error("badges", e); res.json({ chat: 0, kos: 0, pet: 0 }); }
  });

  // Chat messages without the photo bytes; photos load separately from /chat/image/:id.
  const CHAT_COLS = { id: chatMessages.id, senderId: chatMessages.senderId, receiverId: chatMessages.receiverId, content: chatMessages.content, isRead: chatMessages.isRead, createdAt: chatMessages.createdAt, hiddenFor: chatMessages.hiddenFor, hasImage: sql<boolean>`${chatMessages.imageData} is not null` };
  const hiddenFrom = (m: { hiddenFor: string[] | null }, me: string) => Array.isArray(m.hiddenFor) && m.hiddenFor.includes(me);
  const chatView = ({ hiddenFor, ...m }: any) => ({ ...m, imageUrl: m.hasImage ? `/api/reborn/chat/image/${m.id}` : null });
  const MAX_CHAT_IMAGE = 3_000_000; // ~2 MB photo as a data URL (the app shrinks photos before sending)

  async function areFriends(a: string, b: string) {
    const rows = await db.select().from(friendships).where(and(eq(friendships.status, "accepted"), or(
      and(eq(friendships.requesterId, a), eq(friendships.addresseeId, b)),
      and(eq(friendships.requesterId, b), eq(friendships.addresseeId, a)),
    )));
    return rows.length > 0;
  }

  app.get("/api/reborn/chat/messages/:otherId", requireAuth, async (req, res) => {
    try {
      const me = getUserId(req)!;
      const other = req.params.otherId;
      if (!(await areFriends(me, other))) return res.status(403).json({ message: tr(req, { en: "You're not friends yet", zh: "你们还不是好友", id: "Kalian belum berteman" }) });
      const msgs = (await db.select(CHAT_COLS).from(chatMessages).where(or(
        and(eq(chatMessages.senderId, me), eq(chatMessages.receiverId, other)),
        and(eq(chatMessages.senderId, other), eq(chatMessages.receiverId, me)),
      )).orderBy(desc(chatMessages.createdAt)).limit(300)).filter((m) => !hiddenFrom(m, me)).reverse().map(chatView);
      await db.update(chatMessages).set({ isRead: true }).where(and(eq(chatMessages.senderId, other), eq(chatMessages.receiverId, me), eq(chatMessages.isRead, false)));
      res.json(msgs);
    } catch (e) { console.error("chat msgs", e); res.status(500).json({ message: tr(req, { en: "Failed", zh: "操作失败", id: "Gagal" }) }); }
  });

  app.post("/api/reborn/chat/send", requireAuth, async (req, res) => {
    try {
      const me = getUserId(req)!;
      const toUserId = String(req.body?.toUserId || "");
      const content = String(req.body?.content || "").trim().slice(0, 4000);
      const image = typeof req.body?.image === "string" ? req.body.image : "";
      if (image && (!/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(image) || image.length > MAX_CHAT_IMAGE))
        return res.status(400).json({ message: tr(req, { en: "That photo can't be sent — try a smaller one.", zh: "无法发送该图片，请换一张较小的图片。", id: "Foto itu tidak bisa dikirim — coba yang lebih kecil." }) });
      if (!content && !image) return res.status(400).json({ message: tr(req, { en: "Empty message", zh: "消息不能为空", id: "Pesan kosong" }) });
      if (!(await areFriends(me, toUserId))) return res.status(403).json({ message: tr(req, { en: "You're not friends yet", zh: "你们还不是好友", id: "Kalian belum berteman" }) });
      await db.insert(chatMessages).values({ senderId: me, receiverId: toUserId, content, imageData: image || null });
      const sender = await storage.getUser(me);
      await notifyUserI18n(toUserId, "chat_message", (lang) => ({ title: sender?.firstName || sender?.username || pick(lang, { en: "New message", zh: "新消息", id: "Pesan baru" }), body: content ? content.slice(0, 140) : pick(lang, { en: "📷 Photo", zh: "📷 图片", id: "📷 Foto" }) }), { path: "/chat", fromUserId: me });
      res.json({ message: tr(req, { en: "sent", zh: "已发送", id: "Terkirim" }) });
    } catch (e) { console.error("chat send", e); res.status(500).json({ message: tr(req, { en: "Send failed", zh: "发送失败", id: "Gagal mengirim" }) }); }
  });

  // A chat photo (only the two people in the conversation can open it).
  app.get("/api/reborn/chat/image/:id", requireAuth, async (req, res) => {
    const me = getUserId(req)!;
    const [m] = await db.select().from(chatMessages).where(eq(chatMessages.id, Number(req.params.id)));
    const ok = m && (m.senderId === me || m.receiverId === me) && !hiddenFrom(m, me);
    const d = ok && m.imageData && /^data:([^;]+);base64,(.+)$/.exec(m.imageData);
    if (!d) return res.status(404).end();
    res.set("Content-Type", d[1]).set("Cache-Control", "private, max-age=31536000, immutable").send(Buffer.from(d[2], "base64"));
  });

  // Delete one message. Your own message is removed for both of you; a message
  // you received is removed only from your side.
  app.delete("/api/reborn/chat/messages/:id", requireAuth, async (req, res) => {
    try {
      const me = getUserId(req)!;
      const [m] = await db.select({ id: chatMessages.id, senderId: chatMessages.senderId, receiverId: chatMessages.receiverId, hiddenFor: chatMessages.hiddenFor }).from(chatMessages).where(eq(chatMessages.id, Number(req.params.id)));
      if (!m || (m.senderId !== me && m.receiverId !== me)) return res.status(404).json({ message: tr(req, { en: "Message not found", zh: "找不到该消息", id: "Pesan tidak ditemukan" }) });
      if (m.senderId === me) await db.delete(chatMessages).where(eq(chatMessages.id, m.id));
      else await db.update(chatMessages).set({ hiddenFor: Array.from(new Set([...(m.hiddenFor || []), me])) }).where(eq(chatMessages.id, m.id));
      res.json({ message: tr(req, { en: "Message deleted", zh: "消息已删除", id: "Pesan dihapus" }) });
    } catch (e) { console.error("chat delete", e); res.status(500).json({ message: tr(req, { en: "Failed", zh: "操作失败", id: "Gagal" }) }); }
  });

  // Clear a whole conversation from your side (the friend still sees their copy).
  app.delete("/api/reborn/chat/conversation/:otherId", requireAuth, async (req, res) => {
    try {
      const me = getUserId(req)!, other = String(req.params.otherId);
      await db.execute(sql`UPDATE chat_messages SET hidden_for = hidden_for || ${JSON.stringify([me])}::jsonb, is_read = CASE WHEN receiver_id = ${me} THEN true ELSE is_read END
        WHERE ((sender_id = ${me} AND receiver_id = ${other}) OR (sender_id = ${other} AND receiver_id = ${me})) AND NOT (hidden_for ? ${me})`);
      res.json({ message: tr(req, { en: "Chat cleared", zh: "聊天记录已清空", id: "Obrolan dihapus" }) });
    } catch (e) { console.error("chat clear", e); res.status(500).json({ message: tr(req, { en: "Failed", zh: "操作失败", id: "Gagal" }) }); }
  });

  // ── Song requests + Top 500 library ──────────────────────────────────────
  app.get("/api/reborn/songs", async (req, res) => {
    try {
      await seedSongsIfEmpty();
      const rows = await db.select().from(songs).orderBy(desc(songs.isHit), desc(songs.requestCount), songs.title); // the whole library
      res.json(rows);
    } catch (e) { console.error("songs", e); res.status(500).json({ message: tr(req, { en: "Failed to load songs", zh: "歌曲加载失败", id: "Gagal memuat lagu" }) }); }
  });

  app.get("/api/reborn/songs/search", requireAuth, async (req, res) => {
    try {
      await seedSongsIfEmpty();
      res.json(await searchSongCatalog(req.query.q, 10, 100));
    } catch (e) {
      console.error("song search", e);
      res.status(500).json({ message: tr(req, { en: "Song search failed", zh: "歌曲搜索失败", id: "Pencarian lagu gagal" }) });
    }
  });

  app.post("/api/reborn/songs/request", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      if (await songNeedsTableScan(userId)) return res.status(400).json({ needTable: true, message: tr(req, { en: "Song requests go by table. Scan the QR code on your table first (KOS → camera), then request your song.", zh: "点歌按桌排队。请先扫描桌上的二维码（歌王之王 → 相机），再点歌。", id: "Permintaan lagu berdasarkan meja. Pindai dulu QR di mejamu (KOS → kamera), lalu minta lagumu." }) });
      let { songId, title, titlePinyin, artist, artistPinyin, spotifyUrl, artistPhoto, performanceMode } = req.body || {};
      const songSettings = await getSettings();
      performanceMode = songSettings.songRequestModeEnabled && performanceMode === "singer" ? "singer" : "self";
      let song: any = null;
      if (songId) {
        [song] = await db.select().from(songs).where(eq(songs.id, Number(songId)));
        if (!song) return res.status(404).json({ message: tr(req, { en: "Song not found", zh: "找不到该歌曲", id: "Lagu tidak ditemukan" }) });
        await db.update(songs).set({ requestCount: (song.requestCount || 0) + 1 }).where(eq(songs.id, song.id));
        title = song.title; artist = song.artist;
      } else {
        title = String(title || "").trim();
        if (!title && titlePinyin) title = String(titlePinyin).trim();
        if (!title) return res.status(400).json({ message: tr(req, { en: "Enter the song name", zh: "请输入歌名", id: "Masukkan judul lagu" }) });
        // Don't duplicate: reuse only the same title + singer. Different covers remain selectable.
        const cleanArtist = String(artist || "").trim();
        const tp = String(titlePinyin || "").trim() || textPinyin(title);
        const ap = String(artistPinyin || "").trim() || textPinyin(cleanArtist);
        const existing = await db.select().from(songs).where(
          and(
            or(ilike(songs.title, title), tp ? ilike(songs.titlePinyin, tp) : ilike(songs.title, title)),
            cleanArtist ? ilike(songs.artist, cleanArtist) : ilike(songs.artist, ""),
          )
        ).limit(1);
        if (existing[0]) {
          song = existing[0];
          await db.update(songs).set({ requestCount: (song.requestCount || 0) + 1 }).where(eq(songs.id, song.id));
        } else {
          [song] = await db.insert(songs).values({
            title, titlePinyin: tp, artist: cleanArtist, artistPinyin: ap,
            spotifyUrl: spotifyUrl || null, artistPhoto: artistPhoto || null, isHit: false, requestCount: 1, createdBy: userId,
          }).returning();
        }
        songId = song.id;
      }
      const seat = await activeCheckin(userId).catch(() => null);
      const [reqRow] = await db.insert(songRequests).values({ companyId: await rebornCompanyId(req), userId, songId: Number(songId), title: song.title, artist: song.artist || "", performanceMode, tableLabel: seat?.tableLabel || null, status: "pending" }).returning();
      // No staff approval: the song joins the fair queue straight away.
      emitLiveUpdate("/api/reborn/song-queue", { action: "QUEUED" });
      emitLiveUpdate("/api/reborn/admin/song-requests", { action: "QUEUED" });
      const position = (await fairSongQueue(reqRow.companyId)).find((r) => r.id === reqRow.id)?.position || null;
      res.json({ message: position ? tr(req, { en: "Added to the queue — you're #{n}. Watch the Queue tab for your turn.", zh: "已加入队列——你排第 {n} 位。请在「队列」页查看何时轮到你。", id: "Masuk antrean — kamu nomor {n}. Pantau tab Antrean untuk giliranmu." }, { n: position }) : tr(req, { en: "Added to the queue!", zh: "已加入队列！", id: "Masuk antrean!" }), request: reqRow, position });
    } catch (e) { console.error("song request", e); res.status(500).json({ message: tr(req, { en: "Request failed", zh: "请求失败", id: "Permintaan gagal" }) }); }
  });

  app.get("/api/reborn/songs/my-requests", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const cid = await rebornCompanyId(req);
      const rows = await db.select().from(songRequests).where(and(eq(songRequests.companyId, cid), eq(songRequests.userId, userId))).orderBy(desc(songRequests.createdAt)).limit(100);
      const queue = await fairSongQueue(cid);
      const pos = new Map(queue.map((r) => [r.id, r.position]));
      res.json(rows.map((r) => (r.status === "pending" && pos.has(r.id) ? { ...r, position: pos.get(r.id), queueSize: queue.length } : r)));
    } catch { res.json([]); }
  });
  app.get("/api/reborn/song-settings", requireAuth, async (_req, res) => {
    const settings = await getSettings();
    res.json({ performanceModeEnabled: settings.songRequestModeEnabled });
  });

  // ── Admin ────────────────────────────────────────────────────────────────
  app.post("/api/reborn/admin/codes", requireStaff(async (req, res) => {
    const adminId = getUserId(req)!;
    const count = Math.min(200, Math.max(1, Number(req.body?.count) || 1));
    const gender = req.body?.gender === "female" ? "female" : "male";
    const made: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = "RW-" + Math.random().toString(36).slice(2, 8).toUpperCase();
      await db.insert(activationCodes).values({ code, petGender: gender, createdBy: adminId });
      made.push(code);
    }
    await logAdmin(req, { targetType: "activation_code", action: "create", entityType: "activation_code", description: `Generated ${count} ${gender} pet code(s)` });
    res.json({ codes: made });
  }));

  app.get("/api/reborn/admin/codes", requireStaff(async (_req, res) => {
    const rows = await db.select().from(activationCodes).orderBy(desc(activationCodes.createdAt)).limit(300);
    res.json(rows);
  }));

  app.post("/api/reborn/admin/grant-pill", requireStaff(async (req, res) => {
    const adminId = getUserId(req)!;
    const targetUserId = String(req.body?.userId || "");
    if (!targetUserId) return res.status(400).json({ message: tr(req, { en: "userId required", zh: "缺少用户 ID", id: "ID pengguna wajib diisi" }) });
    await db.insert(petPills).values({ userId: targetUserId, grantedBy: adminId, note: req.body?.note || "300,000 RP visit reward" });
    await logAdmin(req, { targetUserId, targetType: "user", action: "create", entityType: "pill", description: `Granted a revival pill to ${targetUserId}` });
    res.json({ message: tr(req, { en: "Pill granted", zh: "已发放复活药丸", id: "Pil kebangkitan diberikan" }) });
  }));

  app.get("/api/reborn/admin/prizes", requireAdmin(async (req, res) => {
    const cid = await rebornCompanyId(req);
    await seedPrizesIfEmpty(cid);
    const rows = await db.select().from(spinPrizes).where(eq(spinPrizes.companyId, cid)).orderBy(spinPrizes.sortOrder);
    res.json(rows);
  }));
  app.post("/api/reborn/admin/prizes", requireAdmin(async (req, res) => {
    const b = req.body || {};
    const [row] = await db.insert(spinPrizes).values({
      companyId: await rebornCompanyId(req),
      label: b.label || "New prize", description: b.description || "", prizeType: b.prizeType || "item",
      value: Number(b.value) || 0, costRp: Number(b.costRp) || 0, weight: Number(b.weight) || 10, colorHex: b.colorHex || "#c9a84c",
      active: b.active !== false, sortOrder: Number(b.sortOrder) || 0,
    }).returning();
    res.json(row);
  }));
  app.put("/api/reborn/admin/prizes/:id", requireAdmin(async (req, res) => {
    const id = Number(req.params.id); const b = req.body || {};
    const cid = await rebornCompanyId(req);
    const patch: any = { updatedAt: new Date() };
    for (const k of ["label", "description", "prizeType", "colorHex"]) if (b[k] !== undefined) patch[k] = b[k];
    for (const k of ["value", "costRp", "weight", "sortOrder"]) if (b[k] !== undefined) patch[k] = Number(b[k]);
    if (b.active !== undefined) patch.active = !!b.active;
    const [row] = await db.update(spinPrizes).set(patch).where(and(eq(spinPrizes.id, id), eq(spinPrizes.companyId, cid))).returning();
    res.json(row);
  }));
  app.delete("/api/reborn/admin/prizes/:id", requireAdmin(async (req, res) => {
    const cid = await rebornCompanyId(req);
    await db.delete(spinPrizes).where(and(eq(spinPrizes.id, Number(req.params.id)), eq(spinPrizes.companyId, cid)));
    res.json({ message: tr(req, { en: "Deleted", zh: "已删除", id: "Dihapus" }) });
  }));
  // Give a member one of the Prizes (admin award, daily check-in): eggs / pills arrive at
  // once, other prizes wait in Spin › My prizes for staff to redeem. Notifies the member.
  async function awardPrizeToUser(userId: string, prize: typeof spinPrizes.$inferSelect, cid: number, note: string) {
    const now = new Date();
    if (prize.prizeType === "pill") await db.insert(petPills).values({ userId, grantedBy: "admin", note });
    else if (prize.prizeType === "egg") await db.insert(pets).values({ userId, toyId: 0, name: "Doluruu Egg", type: "virtual", gender: Math.random() < 0.5 ? "male" : "female", isActive: true, isEgg: true, hatchAt: addDays(EGG_HATCH_DAYS, now), lifeStatus: "active" });
    const status = ["nothing", "free_spin", "pill", "egg"].includes(prize.prizeType || "") ? "won" : "unused";
    const [result] = await db.insert(spinResults).values({ userId, companyId: cid, prizeId: prize.id, prizeLabel: prize.label, prizeType: prize.prizeType, tokensSpent: 0, status }).returning();
    const club = (await getSettings()).clubName;
    await notifyUserI18n(userId, "prize", (lang) => ({ title: pick(lang, { en: "🎉 You won a prize!", zh: "🎉 你赢得了奖品！", id: "🎉 Kamu memenangkan hadiah!" }), body: pick(lang, { en: "{prize} — from {club}", zh: "{prize} — 来自 {club}", id: "{prize} — dari {club}" }, { prize: prize.label, club }) }), { path: "/spin" });
    pushUserI18n(userId, (lang) => ({ title: pick(lang, { en: "🎉 You won a prize!", zh: "🎉 你赢得了奖品！", id: "🎉 Kamu memenangkan hadiah!" }), body: pick(lang, { en: "{prize} — show it to staff to redeem", zh: "{prize} — 出示给员工即可兑换", id: "{prize} — tunjukkan ke staf untuk menukarkannya" }, { prize: prize.label }), url: "/spin", tag: `award-${result.id}` })).catch(() => {});
    return result;
  }

  // ── Daily check-in (server/dailyCheckin.ts) ──
  // Rewards as the app shows them (a prize carries its label).
  async function checkinRewardsView(cid: number) {
    const cfg = await getCheckinConfig();
    const ids = Array.from(new Set(cfg.days.map((r) => r.prizeId).filter(Boolean))) as number[];
    const prizes = ids.length ? await db.select().from(spinPrizes).where(and(inArray(spinPrizes.id, ids), eq(spinPrizes.companyId, cid))) : [];
    const view = (r: any) => ({ type: r.type, amount: r.amount, prizeId: r.prizeId || null, label: r.type === "prize" ? prizes.find((p) => p.id === r.prizeId)?.label || null : null });
    return { cfg, days: cfg.days.map(view) }; // days[0] = day 1
  }
  app.get("/api/reborn/daily-checkin", requireAuth, async (req, res) => {
    const { cfg, days } = await checkinRewardsView(await rebornCompanyId(req));
    if (!cfg.enabled) return res.json({ enabled: false });
    res.json({ enabled: true, cycleDays: CYCLE_DAYS, weekDays: WEEK_DAYS, resetOnMiss: cfg.resetOnMiss, autoClaim: cfg.autoClaim, days, ...(await checkinState(getUserId(req)!, cfg)) });
  });
  app.post("/api/reborn/daily-checkin", requireAuth, async (req, res) => {
    const cid = await rebornCompanyId(req);
    const cfg = await getCheckinConfig();
    if (!cfg.enabled) return res.status(400).json({ message: tr(req, { en: "The daily login reward is turned off", zh: "每日登录奖励已关闭", id: "Hadiah login harian sedang dimatikan" }) });
    const userId = getUserId(req)!;
    const out = await doCheckin(userId, cfg, async (uid, prizeId) => {
      const [prize] = await db.select().from(spinPrizes).where(and(eq(spinPrizes.id, prizeId), eq(spinPrizes.companyId, cid)));
      if (!prize) return null;
      await awardPrizeToUser(uid, prize, cid, "Daily check-in reward");
      return prize.label;
    });
    if (out.already) return res.status(409).json({ message: tr(req, { en: "You already collected today's reward — come back tomorrow!", zh: "你今天已经领取过奖励了——明天再来吧！", id: "Kamu sudah mengambil hadiah hari ini — datang lagi besok!" }), ...out });
    res.json(out);
  });
  app.get("/api/reborn/admin/daily-checkin", requireAdmin(async (req, res) => {
    const { cfg } = await checkinRewardsView(await rebornCompanyId(req));
    res.json({ config: cfg, stats: await checkinStats() });
  }));
  app.post("/api/reborn/admin/daily-checkin", requireAdmin(async (req, res) => {
    const cfg = await saveCheckinConfig(req.body || {});
    await logAdmin(req, { targetType: "settings", action: "daily_checkin", entityType: "settings", description: `Daily login reward ${cfg.enabled ? "on" : "off"} (${cfg.autoClaim ? "auto" : "tap"}): ${cfg.days.map((r, i) => `D${i + 1} ${r.type === "prize" ? `prize#${r.prizeId}` : r.type === "none" ? "-" : `${r.type} ${r.amount}`}`).join(", ")}` });
    res.json({ message: tr(req, { en: "Daily login reward saved", zh: "每日登录奖励已保存", id: "Hadiah login harian disimpan" }), config: cfg });
  }));

  // Admin hands a specific prize to a member by username/code — no spin needed.
  app.post("/api/reborn/admin/prizes/award", requireAdmin(async (req, res) => {
    const prizeId = Number(req.body?.prizeId);
    const cid = await rebornCompanyId(req);
    const u = await findMemberByCode(String(req.body?.username || ""));
    if (!u) return res.status(404).json({ message: tr(req, { en: "Member not found (username / code / email)", zh: "找不到该会员（用户名 / 会员码 / 邮箱）", id: "Member tidak ditemukan (nama pengguna / kode / email)" }) });
    const [prize] = await db.select().from(spinPrizes).where(and(eq(spinPrizes.id, prizeId), eq(spinPrizes.companyId, cid)));
    if (!prize) return res.status(404).json({ message: tr(req, { en: "Prize not found", zh: "找不到该奖品", id: "Hadiah tidak ditemukan" }) });
    const result = await awardPrizeToUser(u.id, prize, cid, "Awarded by admin");
    await logAdmin(req, { targetUserId: u.id, targetType: "spin_result", targetId: result.id, action: "award_prize", entityType: "prize", description: `Awarded "${prize.label}" to ${u.username || u.email}` });
    res.json({ message: tr(req, { en: "Awarded {prize} to {who}", zh: "已将 {prize} 颁发给 {who}", id: "{prize} diberikan kepada {who}" }, { prize: prize.label, who: u.username || u.email || u.id }) });
  }));

  app.get("/api/reborn/admin/redemptions", requireStaff(async (req, res) => {
    const rows = await db.select().from(spinResults).where(eq(spinResults.status, "redeeming")).orderBy(desc(spinResults.createdAt)).limit(200);
    const ids = Array.from(new Set(rows.map((r) => r.userId).filter(Boolean))) as string[];
    const us = ids.length ? await db.select().from(users).where(inArray(users.id, ids)) : [];
    const nameOf = new Map(us.map((u: any) => [u.id, [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.email || u.id]));
    res.json(rows.map((r) => ({ ...r, memberName: nameOf.get(r.userId) || tr(req, { en: "Member", zh: "会员", id: "Member" }) })));
  }));
  app.post("/api/reborn/admin/redemptions/:id", requireStaff(async (req, res) => {
    const adminId = getUserId(req)!;
    const id = Number(req.params.id);
    const approve = req.body?.approve !== false;
    const [row] = await db.update(spinResults).set({
      status: approve ? "redeemed" : "rejected", redeemedAt: new Date(), adminId,
    }).where(eq(spinResults.id, id)).returning();
    await logAdmin(req, { targetUserId: row?.userId, targetType: "prize", targetId: id, action: approve ? "approve" : "reject", entityType: "redemption", description: `${approve ? "Approved" : "Rejected"} prize "${row?.prizeLabel}"` });
    res.json(row);
  }));

  app.get("/api/reborn/admin/faq", requireAdmin(async (_req, res) => {
    await seedFaqIfEmpty();
    const rows = await db.select().from(faqItems).orderBy(faqItems.sortOrder);
    res.json(rows);
  }));
  app.post("/api/reborn/admin/faq", requireAdmin(async (req, res) => {
    const b = req.body || {};
    const [row] = await db.insert(faqItems).values({
      question: b.question || "", answer: b.answer || "", keywords: b.keywords || "",
      i18n: b.i18n && typeof b.i18n === "object" ? b.i18n : null,
      sortOrder: Number(b.sortOrder) || 0, active: b.active !== false,
    }).returning();
    if (row.active) await notifyAllI18n("new_faq", (lang) => ({ title: pick(lang, { en: "New help answer", zh: "新的帮助解答", id: "Jawaban bantuan baru" }), body: faqIn(row as any, lang).question }), { path: "/support", faqId: row.id });
    res.json(row);
  }));
  app.put("/api/reborn/admin/faq/:id", requireAdmin(async (req, res) => {
    const id = Number(req.params.id); const b = req.body || {};
    const patch: any = { updatedAt: new Date() };
    for (const k of ["question", "answer", "keywords"]) if (b[k] !== undefined) patch[k] = b[k];
    // A question members asked that had no answer yet: typing the answer and saving turns it on,
    // so the bot starts replying with it when anyone asks the same question.
    const [before] = await db.select().from(faqItems).where(eq(faqItems.id, id));
    if (before && !String(before.answer || "").trim() && String(b.answer || "").trim() && b.active === undefined) patch.active = true;
    if (b.i18n !== undefined) patch.i18n = b.i18n && typeof b.i18n === "object" ? b.i18n : null;
    if (b.sortOrder !== undefined) patch.sortOrder = Number(b.sortOrder);
    if (b.active !== undefined) patch.active = !!b.active;
    const [row] = await db.update(faqItems).set(patch).where(eq(faqItems.id, id)).returning();
    res.json(row);
  }));
  app.delete("/api/reborn/admin/faq/:id", requireAdmin(async (req, res) => {
    await db.delete(faqItems).where(eq(faqItems.id, Number(req.params.id)));
    res.json({ message: tr(req, { en: "Deleted", zh: "已删除", id: "Dihapus" }) });
  }));

  // Admin: song requests + song library
  app.get("/api/reborn/admin/song-requests", requireStaff(async (req, res) => {
    const cid = await rebornCompanyId(req);
    const now = await songNowPlaying(cid);
    const queue = [...(now ? [{ ...now, position: 0, round: 0, table: now.tableLabel, group: "", playing: true } as any] : []), ...(await fairSongQueue(cid))];
    const ids = Array.from(new Set(queue.map((r) => r.userId)));
    const people = ids.length ? await db.select({ id: users.id, username: users.username, firstName: users.firstName, lastName: users.lastName, phone: users.phoneNumber }).from(users).where(inArray(users.id, ids)) : [];
    const byId = new Map(people.map((u) => [u.id, u]));
    res.json(queue.map((r) => {
      const u = byId.get(r.userId);
      const name = u ? [u.firstName, u.lastName].filter(Boolean).join(" ").trim() : "";
      return { ...r, requester: { id: r.userId, username: u?.username || "", name, phone: u?.phone || "" } };
    }));
  }));
  app.get("/api/reborn/song-queue-info", requireAuth, async (req, res) => {
    const s = await getSettings();
    const seat = s.songQueueMode === "table" ? await activeCheckin(getUserId(req)!).catch(() => null) : null;
    res.json({ mode: s.songQueueMode, perTurn: s.songsPerTurn, table: seat?.tableLabel || null, needTable: s.songQueueMode === "table" && !seat?.tableLabel, paused: await songQueuePaused() });
  });
  // ── Karaoke bridge API (token, no login) ──
  app.get("/api/karaoke/queue", async (req, res) => {
    if (!(await karaokeAuth(req))) return res.status(401).json({ message: "Bad karaoke token" });
    res.json(await songQueueBoard(await rebornCompanyId(req)));
  });
  // The song on now ended (or { skip: true } cut it short) → start the next one; returns it.
  app.post("/api/karaoke/next", async (req, res) => {
    if (!(await karaokeAuth(req))) return res.status(401).json({ message: "Bad karaoke token" });
    const cid = await rebornCompanyId(req);
    // Optional guard: only finish the song the bridge thinks is playing.
    const cur = await songNowPlaying(cid);
    if (req.body?.finishedId && cur && Number(req.body.finishedId) !== cur.id) return res.json({ nowPlaying: (await songQueueBoard(cid)).nowPlaying, stale: true });
    await advanceSongQueue(cid, req.body?.skip === true ? "skip" : "done", null);
    res.json({ nowPlaying: (await songQueueBoard(cid)).nowPlaying });
  });
  app.post("/api/karaoke/songs", async (req, res) => {
    if (!(await karaokeAuth(req))) return res.status(401).json({ message: "Bad karaoke token" });
    res.json(await importKaraokeCatalog(Array.isArray(req.body) ? req.body : req.body?.songs || []));
  });
  // Admin › Requests › Karaoke system: bridge token, online status, song-list import.
  app.get("/api/reborn/admin/karaoke", requireAdmin(async (_req, res) => {
    const rows = await db.select().from(appSettings).where(inArray(appSettings.key, ["karaokeToken", "karaokeLastSeen"]));
    const m = Object.fromEntries(rows.map((r) => [r.key, r.value || ""]));
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(songs).where(isNotNull(songs.karaokeCode));
    res.json({ hasToken: !!m.karaokeToken, lastSeen: m.karaokeLastSeen || null, online: !!m.karaokeLastSeen && Date.now() - new Date(m.karaokeLastSeen).getTime() < 3 * 60_000, linkedSongs: Number(n) || 0 });
  }));
  app.post("/api/reborn/admin/karaoke/token", requireAdmin(async (req, res) => {
    const token = randomVenueCode() + randomVenueCode() + randomVenueCode() + randomVenueCode();
    await db.insert(appSettings).values({ key: "karaokeToken", value: token, updatedAt: new Date() }).onConflictDoUpdate({ target: appSettings.key, set: { value: token, updatedAt: new Date() } });
    await logAdmin(req, { targetType: "system", action: "karaoke_token", entityType: "settings", description: "Made a new karaoke bridge token" });
    res.json({ token, message: tr(req, { en: "New token made — the old one stops working", zh: "已生成新令牌——旧令牌失效", id: "Token baru dibuat — token lama tidak berlaku" }) });
  }));
  // Paste the karaoke system's song list: one song per line "code, title, artist" (tab or comma).
  app.post("/api/reborn/admin/karaoke/import", requireAdmin(async (req, res) => {
    const lines = String(req.body?.text || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const list = lines.map((l) => { const [code, title, ...rest] = l.split(/\t|,|;|\|/).map((x) => x.trim()); return { code, title, artist: rest.join(" ").trim() }; });
    const r = await importKaraokeCatalog(list);
    res.json({ ...r, message: tr(req, { en: "{n} songs read · {l} linked to the library · {a} added", zh: "读取 {n} 首 · 关联 {l} 首 · 新增 {a} 首", id: "{n} lagu dibaca · {l} ditautkan · {a} ditambahkan" }, { n: r.received, l: r.linked, a: r.added }) });
  }));

  // Everyone sees the queue: who's singing now (table + first name) and every waiting song.
  app.get("/api/reborn/song-queue", requireAuth, async (req, res) => {
    res.json(await songQueueBoard(await rebornCompanyId(req), getUserId(req)));
  });
  // A member takes back their own song that hasn't started yet.
  app.post("/api/reborn/songs/my-requests/:id/cancel", requireAuth, async (req, res) => {
    const [row] = await db.update(songRequests).set({ status: "cancelled", adminNote: "Cancelled by member" })
      .where(and(eq(songRequests.id, Number(req.params.id)), eq(songRequests.userId, getUserId(req)!), eq(songRequests.status, "pending"))).returning();
    if (!row) return res.status(400).json({ message: tr(req, { en: "This song can't be cancelled any more", zh: "这首歌已无法取消", id: "Lagu ini tidak bisa dibatalkan lagi" }) });
    emitLiveUpdate("/api/reborn/song-queue", { action: "CANCELLED" });
    emitLiveUpdate("/api/reborn/admin/song-requests", { action: "CANCELLED" });
    res.json({ message: tr(req, { en: "Song removed from the queue", zh: "已从队列移除", id: "Lagu dihapus dari antrean" }) });
  });
  // Staff: the song on now is done → next song in the fair queue (skip = cut it short).
  app.post("/api/reborn/admin/song-queue/next", requireStaff(async (req, res) => {
    const skip = req.body?.skip === true;
    const r = await advanceSongQueue(await rebornCompanyId(req), skip ? "skip" : "done", getUserId(req));
    if (r.finished) await logAdmin(req, { targetUserId: r.finished.userId, targetType: "song_request", targetId: String(r.finished.id), action: skip ? "skip" : "done", entityType: "song_request", description: `${skip ? "Skipped" : "Finished"} "${r.finished.title}"` });
    res.json({ message: r.playing ? tr(req, { en: "Now playing: {song}", zh: "正在播放：{song}", id: "Sedang diputar: {song}" }, { song: r.playing.title }) : tr(req, { en: "The queue is empty", zh: "队列已空", id: "Antrean kosong" }), playing: r.playing });
  }));
  // Staff: cancel one waiting song, or every waiting song of a table / member (they're leaving).
  app.post("/api/reborn/admin/song-requests/:id/cancel", requireStaff(async (req, res) => {
    const note = String(req.body?.note || "").trim() || "Cancelled by staff";
    const [row] = await db.update(songRequests).set({ status: "rejected", adminNote: note, adminId: getUserId(req) })
      .where(and(eq(songRequests.id, Number(req.params.id)), inArray(songRequests.status, ["pending", "playing"]))).returning();
    if (!row) return res.status(404).json({ message: tr(req, { en: "Not found", zh: "未找到", id: "Tidak ditemukan" }) });
    await logAdmin(req, { targetUserId: row.userId, targetType: "song_request", targetId: String(row.id), action: "cancel", entityType: "song_request", description: `Cancelled "${row.title}" (${note})` });
    emitLiveUpdate("/api/reborn/song-queue", { action: "CANCELLED" });
    emitLiveUpdate("/api/reborn/songs/my-requests", { action: "CANCELLED" });
    res.json({ message: tr(req, { en: "Song cancelled", zh: "已取消这首歌", id: "Lagu dibatalkan" }) });
  }));
  // Admin panel (staff, managers, admin): pause / resume the song queue. Resume starts the next song if nothing is on.
  app.post("/api/reborn/admin/song-queue/pause", requireStaff(async (req, res) => {
    const paused = req.body?.paused !== false;
    const cid = await rebornCompanyId(req);
    await setSongQueuePaused(paused);
    let playing: any = null;
    if (!paused && !(await songNowPlaying(cid))) playing = (await advanceSongQueue(cid, "done", getUserId(req))).playing;
    await logAdmin(req, { targetType: "song_request", action: paused ? "pause_queue" : "resume_queue", entityType: "song_request", description: paused ? "Paused the song queue" : "Resumed the song queue" });
    emitLiveUpdate("/api/reborn/song-queue", { action: paused ? "PAUSED" : "RESUMED" });
    emitLiveUpdate("/api/reborn/admin/song-requests", { action: paused ? "PAUSED" : "RESUMED" });
    res.json({ paused, playing, message: paused
      ? tr(req, { en: "Song queue paused", zh: "点歌队列已暂停", id: "Antrean lagu dijeda" })
      : tr(req, { en: "Song queue resumed", zh: "点歌队列已继续", id: "Antrean lagu dilanjutkan" }) });
  }));
  // Admin panel (staff, managers, admin): move a waiting song to the front — it plays right after the song on now.
  app.post("/api/reborn/admin/song-requests/:id/play-next", requireStaff(async (req, res) => {
    const [row] = await db.update(songRequests).set({ bumpedAt: new Date(), adminId: getUserId(req) })
      .where(and(eq(songRequests.id, Number(req.params.id)), eq(songRequests.status, "pending"))).returning();
    if (!row) return res.status(404).json({ message: tr(req, { en: "This song isn't waiting any more", zh: "这首歌已不在排队中", id: "Lagu ini sudah tidak dalam antrean" }) });
    await logAdmin(req, { targetUserId: row.userId, targetType: "song_request", targetId: String(row.id), action: "play_next", entityType: "song_request", description: `Moved "${row.title}" to play next` });
    emitLiveUpdate("/api/reborn/song-queue", { action: "MOVED" });
    emitLiveUpdate("/api/reborn/songs/my-requests", { action: "QUEUE_MOVED" });
    emitLiveUpdate("/api/reborn/admin/song-requests", { action: "MOVED" });
    res.json({ message: tr(req, { en: "\"{song}\" plays next", zh: "「{song}」将下一首播放", id: "\"{song}\" diputar berikutnya" }, { song: row.title }) });
  }));
  app.post("/api/reborn/admin/song-queue/cancel-group", requireStaff(async (req, res) => {
    const cid = await rebornCompanyId(req);
    const table = String(req.body?.table || "").trim();
    const userId = String(req.body?.userId || "").trim();
    if (!table && !userId) return res.status(400).json({ message: tr(req, { en: "Pick a table or member", zh: "请选择桌位或会员", id: "Pilih meja atau member" }) });
    // The queue knows each song's current table (check-in), so match on that.
    const ids = (await fairSongQueue(cid)).filter((r) => (table ? (r.table || r.tableLabel) === table : r.userId === userId)).map((r) => r.id);
    if (ids.length) await db.update(songRequests).set({ status: "rejected", adminNote: "Customer left — cancelled by staff", adminId: getUserId(req) }).where(and(inArray(songRequests.id, ids), eq(songRequests.status, "pending")));
    await logAdmin(req, { targetUserId: userId || undefined, targetType: "song_request", action: "cancel_group", entityType: "song_request", description: `Cancelled ${ids.length} waiting song(s) for ${table ? `table ${table}` : `member ${userId}`}` });
    emitLiveUpdate("/api/reborn/song-queue", { action: "CANCELLED" });
    emitLiveUpdate("/api/reborn/songs/my-requests", { action: "CANCELLED" });
    res.json({ message: tr(req, { en: "{n} waiting songs cancelled", zh: "已取消 {n} 首排队中的歌", id: "{n} lagu dalam antrean dibatalkan" }, { n: ids.length }), count: ids.length });
  }));
  app.post("/api/reborn/admin/song-requests/:id", requireStaff(async (req, res) => {
    const adminId = getUserId(req)!;
    const approve = req.body?.approve !== false;
    const comment = String(req.body?.comment || "").trim() || null;
    const [prev] = await db.select({ userId: songRequests.userId, tableLabel: songRequests.tableLabel }).from(songRequests).where(eq(songRequests.id, Number(req.params.id))).limit(1);
    const seat = prev ? await activeCheckin(prev.userId).catch(() => null) : null;
    const [row] = await db.update(songRequests).set({ status: approve ? "confirmed" : "rejected", confirmedAt: new Date(), adminId, adminNote: comment, tableLabel: seat?.tableLabel || prev?.tableLabel || null }).where(eq(songRequests.id, Number(req.params.id))).returning();
    await logAdmin(req, { targetUserId: row?.userId, targetType: "song_request", targetId: req.params.id, action: approve ? "approve" : "reject", entityType: "song_request", description: `${approve ? "Confirmed" : "Rejected"} song "${row?.title}"${comment ? ` (${comment})` : ""}` });
    await notifyUserI18n(row?.userId, "song_request_update", (lang) => ({
      title: approve ? pick(lang, { en: "Song request confirmed", zh: "点歌已确认", id: "Permintaan lagu dikonfirmasi" }) : pick(lang, { en: "Song request update", zh: "点歌请求有更新", id: "Kabar permintaan lagu" }),
      body: `${row?.title || pick(lang, { en: "Your song", zh: "你的歌曲", id: "Lagumu" })}${comment ? ` · ${comment}` : ""}`,
    }), { path: "/songs", songRequestId: row?.id, status: row?.status });
    // Tell the member on WhatsApp too.
    if (row?.userId) {
      const phone = await memberWaPhone(row.userId);
      if (phone) {
        const lang = await langForPhone(phone, row.userId);
        const song = [row.title, row.artist].filter(Boolean).join(" — ");
        const msg = waText(lang, approve ? "songConfirmed" : "songRejected", { song, note: comment ? ` (${comment})` : "" });
        sendToMember(phone, msg, row.userId).then((ok) => { if (!ok) console.warn(`[wa] song request #${row.id}: WhatsApp not delivered to ${phone}`); }).catch(() => {});
      }
    }
    emitLiveUpdate("/api/reborn/songs/my-requests", { action: approve ? "CONFIRMED" : "REJECTED" });
    res.json(row);
  }));
  app.post("/api/reborn/admin/songs", requireStaff(async (req, res) => {
    const adminId = getUserId(req)!; const b = req.body || {};
    const [row] = await db.insert(songs).values({
      title: b.title || "New song", titlePinyin: b.titlePinyin || "", artist: b.artist || "", artistPinyin: b.artistPinyin || "",
      spotifyUrl: b.spotifyUrl || null, artistPhoto: b.artistPhoto || null, isHit: b.isHit !== false, requestCount: Number(b.requestCount) || 0, createdBy: adminId,
    }).returning();
    res.json(row);
  }));
  app.put("/api/reborn/admin/songs/:id", requireStaff(async (req, res) => {
    const id = Number(req.params.id); const b = req.body || {}; const patch: any = {};
    for (const k of ["title", "titlePinyin", "artist", "artistPinyin", "spotifyUrl", "artistPhoto"]) if (b[k] !== undefined) patch[k] = b[k];
    if (b.isHit !== undefined) patch.isHit = !!b.isHit;
    if (b.requestCount !== undefined) patch.requestCount = Number(b.requestCount);
    const [row] = await db.update(songs).set(patch).where(eq(songs.id, id)).returning();
    res.json(row);
  }));
  app.delete("/api/reborn/admin/songs/:id", requireStaff(async (req, res) => {
    await db.delete(songs).where(eq(songs.id, Number(req.params.id)));
    res.json({ message: tr(req, { en: "Deleted", zh: "已删除", id: "Dihapus" }) });
  }));

  // Admin: KOS gift catalog + KGOLD settings
  app.get("/api/reborn/admin/gifttypes", requireAdmin(async (req, res) => {
    const cid = await rebornCompanyId(req);
    await seedGiftTypesIfEmpty(cid);
    res.json(await db.select().from(kosGiftTypes).where(eq(kosGiftTypes.companyId, cid)).orderBy(kosGiftTypes.kgoldCost, kosGiftTypes.sortOrder, kosGiftTypes.id));
  }));
  app.post("/api/reborn/admin/gifttypes", requireAdmin(async (req, res) => {
    const b = req.body || {};
    const [row] = await db.insert(kosGiftTypes).values({
      companyId: await rebornCompanyId(req),
      name: b.name || "New gift", emoji: b.emoji || "🎁", imageUrl: b.imageUrl || null,
      animation: b.animation || "pop", kgoldCost: Number(b.kgoldCost) || 100, active: b.active !== false, sortOrder: Number(b.sortOrder) || 0,
    }).returning();
    res.json(row);
  }));
  app.put("/api/reborn/admin/gifttypes/:id", requireAdmin(async (req, res) => {
    const id = Number(req.params.id); const b = req.body || {}; const patch: any = {};
    const cid = await rebornCompanyId(req);
    for (const k of ["name", "emoji", "imageUrl", "animation"]) if (b[k] !== undefined) patch[k] = b[k];
    if (b.kgoldCost !== undefined) patch.kgoldCost = Number(b.kgoldCost);
    if (b.sortOrder !== undefined) patch.sortOrder = Number(b.sortOrder);
    if (b.active !== undefined) patch.active = !!b.active;
    const [row] = await db.update(kosGiftTypes).set(patch).where(and(eq(kosGiftTypes.id, id), eq(kosGiftTypes.companyId, cid))).returning();
    res.json(row);
  }));
  app.delete("/api/reborn/admin/gifttypes/:id", requireAdmin(async (req, res) => {
    const cid = await rebornCompanyId(req);
    await db.delete(kosGiftTypes).where(and(eq(kosGiftTypes.id, Number(req.params.id)), eq(kosGiftTypes.companyId, cid)));
    res.json({ message: tr(req, { en: "Deleted", zh: "已删除", id: "Dihapus" }) });
  }));

  // App download links (public): the home page shows a button for each one that's set,
  // and /download/android|ios forward to the current link so shared links never go stale.
  app.get("/api/public/app-links", async (_req, res) => {
    const s = await getSettings();
    res.set("Cache-Control", "no-cache").json({ android: !!s.appAndroidUrl, ios: !!s.appIosUrl });
  });
  app.get("/download/:platform", async (req, res) => {
    const s = await getSettings();
    const url = req.params.platform === "ios" ? s.appIosUrl : req.params.platform === "android" ? s.appAndroidUrl : "";
    if (/^https?:\/\//i.test(url)) return res.redirect(302, url);
    res.redirect(302, "/login");
  });
  // App Links / Universal Links: lets a table QR (https://…/kos?table=…) scanned
  // with the phone camera open straight in the installed app. Needs the Android
  // signing-cert SHA-256 (ANDROID_CERT_SHA256, comma-separated) and the Apple
  // Team ID (APPLE_TEAM_ID) — without them phones just open the website.
  app.get("/.well-known/assetlinks.json", (_req, res) => {
    const fingerprints = String(process.env.ANDROID_CERT_SHA256 || "").split(",").map((f) => f.trim().toUpperCase()).filter(Boolean);
    res.type("application/json").json(fingerprints.length ? [{
      relation: ["delegate_permission/common.handle_all_urls"],
      target: { namespace: "android_app", package_name: process.env.ANDROID_PACKAGE || "com.zensee.rebornwavegroup", sha256_cert_fingerprints: fingerprints },
    }] : []);
  });
  app.get(["/.well-known/apple-app-site-association", "/apple-app-site-association"], (_req, res) => {
    const team = String(process.env.APPLE_TEAM_ID || "").trim();
    const appID = `${team}.${process.env.IOS_BUNDLE_ID || "com.zensee.rebornwavegroup"}`;
    res.type("application/json").json({ applinks: { apps: [], details: team ? [{ appID, appIDs: [appID], paths: ["/kos", "/kos*"], components: [{ "/": "/kos*" }] }] : [] } });
  });

  app.get("/api/reborn/admin/settings", requireAdmin(async (_req, res) => {
    res.json(await getSettings());
  }));
  app.post("/api/reborn/admin/settings", requireAdmin(async (req, res) => {
    const allowed = ["petName", "petImageUrl", "petEggImageUrl", "giftFeePercent", "kgoldPerRp", "minBuyKgold", "minCashoutRp", "taxPercent", "serviceFeePercent", "clubName", "receiptLogoUrl", "receiptFooter", "posAutoPrint", "bookingImageUrl", "bookingNote", "bookingTables", "bookingAreas", "googleReviewUrl", "businessAddress", "businessMapUrl", "houseReferralUserId", "spinPoolPercent", "spinPoolMin", "spinTokenCost", "spinAssumedBill", "mainAdminPassword", "songRequestModeEnabled", "songQueueMode", "songsPerTurn", "timezone", "bottleExpiryDays", "payrollDay", "overtimeHourlyRate", "allowNegativeStock", "bookingTableDayLock", "bookingAskHours", "bookingAskSpecial", "bookingLastTime", "appAndroidUrl", "appIosUrl", "giftLevelSenderBase", "giftLevelSenderGrowth", "giftLevelSenderList", "giftLevelReceiverBase", "giftLevelReceiverGrowth", "giftLevelReceiverList"];
    for (const k of allowed) {
      if (req.body?.[k] !== undefined) {
        let v = String(req.body[k]);
        if (k === "spinPoolMin") v = String(Math.max(1000000, Number(req.body[k]) || 1000000)); // floor 1,000,000
        if (k === "spinPoolPercent") v = String(Math.max(0, Math.min(100, Number(req.body[k]) || 0)));
        await db.insert(appSettings).values({ key: k, value: v, updatedAt: new Date() })
          .onConflictDoUpdate({ target: appSettings.key, set: { value: v, updatedAt: new Date() } });
      }
    }
    if (req.body?.loyalty && typeof req.body.loyalty === "object") {
      const loyalty = req.body.loyalty;
      const clean = {
        pointsSpendRp: Math.max(1, Number(loyalty.pointsSpendRp) || 1000),
        rewardsEnabled: loyalty.rewardsEnabled !== false,
        tiers: Array.isArray(loyalty.tiers) ? loyalty.tiers.slice(0, 20) : [],
      };
      await db.execute(sql`UPDATE bridge_company_settings s SET config=jsonb_set(COALESCE(s.config,'{}'::jsonb),'{loyalty}',${JSON.stringify(clean)}::jsonb,true), updated_at=now() FROM bridge_companies c WHERE s.company_id=c.id AND c.slug=${homeCompanySlug()}`);
    }
    if (req.body?.timezone !== undefined) setBookingTimezone(String(req.body.timezone));
    if (req.body?.bookingTableDayLock !== undefined) setBookingRules({ tableDayLock: String(req.body.bookingTableDayLock) === "true" });
    if (req.body?.bookingLastTime !== undefined) setBookingRules({ lastBooking: String(req.body.bookingLastTime || "") });
    res.json(await getSettings());
  }));
  // Prize pool status + manual adjust (top-up or set).
  app.get("/api/reborn/admin/spin-pool", requireAdmin(async (_req, res) => {
    const s = await getSettings();
    res.json({ balance: await getSpinPool(), percent: s.spinPoolPercent, min: s.spinPoolMin });
  }));
  app.post("/api/reborn/admin/spin-pool", requireAdmin(async (req, res) => {
    const add = Number(req.body?.add); const set = Number(req.body?.set);
    if (Number.isFinite(set) && req.body?.set !== undefined && req.body?.set !== "") { await setSpinPool(Math.max(0, set)); }
    else if (Number.isFinite(add) && add !== 0) { await adjustSpinPool(add); }
    else return res.status(400).json({ message: tr(req, { en: "Provide 'add' or 'set'", zh: "请填写“增加”或“设定”的数值", id: "Isi nilai 'tambah' atau 'atur'" }) });
    const bal = await getSpinPool();
    await logAdmin(req, { targetType: "spin_pool", action: "adjust", entityType: "spin", description: `Prize pool → RP ${bal.toLocaleString()}` });
    res.json({ balance: bal });
  }));

  // Admin: manage members (search, edit balances, change role)
  const userCols = { id: users.id, firstName: users.firstName, lastName: users.lastName, username: users.username, email: users.email, phoneNumber: users.phoneNumber, role: users.role, credits: users.credits, loyaltyPoints: users.loyaltyPoints, tokens: users.tokens, kgold: users.kgold, referralCode: users.referralCode, membershipCardNumber: users.membershipCardNumber };
  app.get("/api/reborn/admin/users", requireStaff(async (req, res) => {
    const q = String(req.query.q || "").trim();
    const filter = String(req.query.filter || "all"); // all | active | admin
    const sort = String(req.query.sort || "recent"); // recent | tokens
    const cid = await rebornCompanyId(req);
    // Only members of THIS business (bridge_company_members). Reborn has every user enrolled.
    const memberOf = sql`${users.id} IN (SELECT user_id FROM bridge_company_members WHERE company_id=${cid})`;
    let rows = q.length >= 1
      ? await db.select(userCols).from(users).where(and(memberOf, or(ilike(users.username, `${q}%`), ilike(users.firstName, `${q}%`), ilike(users.lastName, `${q}%`), ilike(users.email, `${q}%`), ilike(users.membershipCardNumber, `${q}%`), ilike(users.referralCode, `${q}%`)))).orderBy(users.firstName).limit(60)
      : await db.select(userCols).from(users).where(memberOf).orderBy(sort === "tokens" ? desc(users.tokens) : desc(users.createdAt)).limit(200);
    if (filter === "active") rows = rows.filter((u: any) => (u.tokens || 0) > 0 || (u.loyaltyPoints || 0) > 0 || Number(u.credits || 0) > 0 || (u.kgold || 0) > 0);
    if (filter === "admin") rows = rows.filter((u: any) => u.role === "admin" || u.role === "staff");
    if (sort === "tokens") rows = [...rows].sort((a: any, b: any) => (b.tokens || 0) - (a.tokens || 0));
    // Whole-base summary (independent of the current page/filter) — scoped to this company.
    const [agg] = await db.select({ count: sql<number>`count(*)`, tokens: sql<number>`coalesce(sum(${users.tokens}),0)`, points: sql<number>`coalesce(sum(${users.loyaltyPoints}),0)` }).from(users).where(memberOf);
    const result = await db.execute(sql`SELECT m.user_id, m.position_id, m.branch_id, m.role AS member_role, p.name position_name FROM bridge_company_members m LEFT JOIN bridge_positions p ON p.id=m.position_id WHERE m.company_id=${cid}`);
    const positionRows = (result.rows || result) as any[];
    res.json({ users: rows.map((u:any) => ({ ...u, ...(positionRows.find(p => p.user_id === u.id) || {}) })), summary: { totalUsers: Number(agg?.count) || 0, totalTokens: Number(agg?.tokens) || 0, totalPoints: Number(agg?.points) || 0 } });
  }));
  // Delete a user (admin only; not yourself).
  app.delete("/api/reborn/admin/users/:id", requireAdmin(async (req, res) => {
    const id = req.params.id;
    if (id === getUserId(req)) return res.status(400).json({ message: tr(req, { en: "You can't delete your own account", zh: "不能删除自己的账户", id: "Kamu tidak bisa menghapus akunmu sendiri" }) });
    const [u] = await db.select().from(users).where(eq(users.id, id));
    if (!u) return res.status(404).json({ message: tr(req, { en: "User not found", zh: "找不到该用户", id: "Pengguna tidak ditemukan" }) });
    await db.delete(users).where(eq(users.id, id));
    await logAdmin(req, { targetUserId: id, targetType: "user", action: "delete", entityType: "user", description: `Deleted user ${u.username || u.email || id}` });
    res.json({ message: tr(req, { en: "User deleted", zh: "用户已删除", id: "Pengguna dihapus" }) });
  }));
  // Main-admin reset: zero all member balances/points + the prize pool. Keeps users & items.
  app.post("/api/reborn/admin/reset-numbers", requireAdmin(async (req, res) => {
    const s = await getSettings();
    if (!s.mainAdminPassword) return res.status(400).json({ message: tr(req, { en: "Set a main-admin password in Settings first.", zh: "请先在设置中设定主管理员密码。", id: "Atur kata sandi admin utama di Pengaturan terlebih dahulu." }) });
    if (String(req.body?.password || "") !== s.mainAdminPassword) return res.status(403).json({ message: tr(req, { en: "Wrong main-admin password.", zh: "主管理员密码错误。", id: "Kata sandi admin utama salah." }) });
    await db.update(users).set({ tokens: 0, loyaltyPoints: 0, lifetimePoints: 0, credits: "0.00", kgold: 0, referralEarnings: "0.00", updatedAt: new Date() });
    await setSpinPool(0);
    await logAdmin(req, { targetType: "system", action: "reset_numbers", entityType: "system", description: "Reset all member balances/points + prize pool" });
    res.json({ message: tr(req, { en: "All member balances, points, tokens and the prize pool have been reset to 0.", zh: "所有会员余额、积分、代币和奖池已清零。", id: "Semua saldo, poin, dan token member serta kumpulan hadiah telah direset ke 0." }) });
  }));
  app.post("/api/reborn/admin/users/:id", requireAdmin(async (req, res) => {
    const id = req.params.id; const b = req.body || {};
    const [old] = await db.select().from(users).where(eq(users.id, id));
    if (!old) return res.status(404).json({ message: tr(req, { en: "User not found", zh: "找不到该用户", id: "Pengguna tidak ditemukan" }) });
    const patch: any = { updatedAt: new Date() };
    if (b.credits !== undefined) patch.credits = String(Number(b.credits));
    if (b.loyaltyPoints !== undefined) patch.loyaltyPoints = Number(b.loyaltyPoints);
    if (b.tokens !== undefined) patch.tokens = Number(b.tokens);
    if (b.kgold !== undefined) patch.kgold = Number(b.kgold);
    if (b.role !== undefined && ["admin", "staff", "user", "manager"].includes(b.role)) patch.role = b.role === "manager" ? "staff" : b.role; // manager = staff account + company role manager
    if (b.email !== undefined) patch.email = String(b.email).trim().toLowerCase() || null;
    if (b.firstName !== undefined) patch.firstName = b.firstName;
    if (b.lastName !== undefined) patch.lastName = b.lastName;
    if (b.username !== undefined) {
      const uname = String(b.username).trim();
      if (uname) {
        const [taken] = await db.select({ id: users.id }).from(users).where(and(ilike(users.username, uname), sql`${users.id} <> ${id}`)).limit(1);
        if (taken) return res.status(400).json({ message: tr(req, { en: "That username is already taken", zh: "该用户名已被使用", id: "Nama pengguna itu sudah dipakai" }) });
      }
      patch.username = uname || null;
    }
    if (b.membershipCardNumber !== undefined) patch.membershipCardNumber = String(b.membershipCardNumber).trim() || null;
    if (b.password) patch.password = await bcrypt.hash(String(b.password), 12);
    const [row] = await db.update(users).set(patch).where(eq(users.id, id)).returning();
    if (b.role === "staff" || b.role === "admin" || b.role === "manager") {
      const reborn = (await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.slug, homeCompanySlug())).limit(1))[0];
      if (reborn) {
        await db.insert(bridgeCompanyMembers).values({ companyId: reborn.id, userId: id, positionId: b.positionId ? Number(b.positionId) : null, role: b.role }).onConflictDoUpdate({ target: [bridgeCompanyMembers.companyId, bridgeCompanyMembers.userId], set: { positionId: b.positionId ? Number(b.positionId) : null, role: b.role, status: "active", updatedAt: new Date() } });
        await db.insert(bridgeStaffProfiles).values({ companyId: reborn.id, userId: id, positionId: b.positionId ? Number(b.positionId) : null }).onConflictDoUpdate({ target: [bridgeStaffProfiles.companyId, bridgeStaffProfiles.userId], set: { positionId: b.positionId ? Number(b.positionId) : null, updatedAt: new Date() } });
      }
    }
    const changed = Object.keys(patch).filter((k) => k !== "updatedAt");
    await logAdmin(req, { targetUserId: id, targetType: "user", action: "update", entityType: "profile", oldValues: { credits: old.credits, loyaltyPoints: old.loyaltyPoints, tokens: old.tokens, kgold: old.kgold, role: old.role, email: old.email }, newValues: { ...patch, password: patch.password ? "***reset***" : undefined }, description: `Edited member ${old.username || old.email || id}: ${changed.join(", ")}` });
    res.json({ ...row, password: undefined });
  }));

  // Member self-service profile: name, image, phone, address, DOB, country, language, password.
  app.post("/api/reborn/profile", requireAuth, async (req, res) => {
    const userId = getUserId(req)!;
    const b = req.body || {};
    const patch: any = { updatedAt: new Date() };
    for (const k of ["firstName", "lastName", "phoneNumber", "profileImageUrl", "address", "country"]) if (b[k] !== undefined) patch[k] = b[k];
    if (b.username !== undefined) {
      const uname = String(b.username).trim();
      if (uname) {
        const [taken] = await db.select({ id: users.id }).from(users).where(and(ilike(users.username, uname), sql`${users.id} <> ${userId}`)).limit(1);
        if (taken) return res.status(400).json({ message: tr(req, { en: "That username is already taken", zh: "该用户名已被使用", id: "Nama pengguna itu sudah dipakai" }) });
      }
      patch.username = uname || null;
    }
    if (b.dateOfBirth !== undefined) patch.dateOfBirth = b.dateOfBirth ? new Date(b.dateOfBirth) : null;
    if (b.preferredLanguage !== undefined && ["en", "zh", "id"].includes(b.preferredLanguage)) patch.preferredLanguage = b.preferredLanguage;
    if (b.newPassword) {
      const [u] = await db.select().from(users).where(eq(users.id, userId));
      // Skip the current-password check on a forced first-login reset (bot-created accounts).
      if (u?.password && !(u as any).mustChangePassword) {
        const ok = await bcrypt.compare(String(b.currentPassword || ""), u.password);
        if (!ok) return res.status(400).json({ message: tr(req, { en: "Current password is incorrect", zh: "当前密码不正确", id: "Kata sandi saat ini salah" }) });
      }
      if (String(b.newPassword).length < 6) return res.status(400).json({ message: tr(req, { en: "New password must be at least 6 characters", zh: "新密码至少需要 6 个字符", id: "Kata sandi baru minimal 6 karakter" }) });
      patch.password = await bcrypt.hash(String(b.newPassword), 12);
      patch.mustChangePassword = false; // first-login reset satisfied
    }
    const [row] = await db.update(users).set(patch).where(eq(users.id, userId)).returning();
    res.json({ ...row, password: undefined });
  });

  // Member RP top-up requests (approved by staff/admin → credits added)
  const MAX_TOPUP_RP = 1_000_000_000;
  // Admin helper: translate English text into Chinese + Bahasa (FAQ editor's Translate button).
  app.post("/api/reborn/admin/translate", requireStaff(async (req, res) => {
    const texts: string[] = (Array.isArray(req.body?.texts) ? req.body.texts : []).slice(0, 20).map((x: any) => String(x ?? "").slice(0, 4000));
    if (!texts.some((x) => x.trim())) return res.status(400).json({ message: tr(req, { en: "Type the English text first", zh: "请先填写英文内容", id: "Isi teks bahasa Inggris dulu" }) });
    try {
      const [zh, id] = await Promise.all([translateTexts(texts, "zh"), translateTexts(texts, "id")]);
      res.json({ zh, id });
    } catch (e) {
      console.error("[translate]", e);
      res.status(502).json({ message: tr(req, { en: "Auto-translate is not available right now. Please type the translation or try again later.", zh: "自动翻译暂时不可用，请手动填写翻译或稍后再试。", id: "Terjemahan otomatis sedang tidak tersedia. Silakan ketik terjemahannya atau coba lagi nanti." }) });
    }
  }));
  app.post("/api/reborn/topup", requireAuth, async (req, res) => {
    const userId = getUserId(req)!;
    const amount = Math.round((Number(req.body?.amount) || 0) * 100) / 100;
    if (amount <= 0) return res.status(400).json({ message: tr(req, { en: "Enter an amount", zh: "请输入金额", id: "Masukkan jumlah" }) });
    // Credits are numeric(16,2) (see moneyColumns.ts); the cap is a business limit.
    if (amount > MAX_TOPUP_RP) return res.status(400).json({ message: tr(req, { en: "The maximum top-up is RP {n}.", zh: "单次最多充值 RP {n}。", id: "Isi ulang maksimal RP {n}." }, { n: MAX_TOPUP_RP.toLocaleString(localeOf(reqLang(req))) }) });
    const method = req.body?.paymentMethod === "card" ? "card" : "cash";
    const [row] = await db.insert(topUpRequests).values({ userId, amount: String(amount), paymentMethod: method, paymentProof: req.body?.paymentProof || null, status: "pending" }).returning();
    res.json({ message: tr(req, { en: "Top-up request sent. Staff will confirm and add your credits.", zh: "充值申请已提交。员工确认后会为你添加余额。", id: "Permintaan isi saldo terkirim. Staf akan mengonfirmasi dan menambahkan saldomu." }), request: row });
  });
  app.get("/api/reborn/topup/mine", requireAuth, async (req, res) => {
    const userId = getUserId(req)!;
    res.json(await db.select().from(topUpRequests).where(eq(topUpRequests.userId, userId)).orderBy(desc(topUpRequests.createdAt)).limit(50));
  });
  app.get("/api/reborn/admin/topups", requireStaff(async (_req, res) => {
    res.json(await db.select().from(topUpRequests).where(eq(topUpRequests.status, "pending")).orderBy(desc(topUpRequests.createdAt)).limit(200));
  }));
  app.post("/api/reborn/admin/topups/:id", requireStaff(async (req, res) => {
    const adminId = getUserId(req)!; const id = Number(req.params.id); const approve = req.body?.approve !== false;
    const [t] = await db.select().from(topUpRequests).where(eq(topUpRequests.id, id));
    if (!t || t.status !== "pending") return res.status(400).json({ message: tr(req, { en: "Not pending", zh: "该申请不在待处理状态", id: "Permintaan ini tidak sedang menunggu" }) });
    await db.update(topUpRequests).set({ status: approve ? "approved" : "rejected", adminId, adminNotes: req.body?.notes || null, processedAt: new Date(), updatedAt: new Date() }).where(eq(topUpRequests.id, id));
    if (approve) {
      await db.update(users).set({ credits: sql`${users.credits} + ${Number(t.amount)}`, updatedAt: new Date() }).where(eq(users.id, t.userId));
      await db.insert(ledgerEntries).values({ kind: "income", category: "topup", amount: String(t.amount), note: `Top-up (${t.paymentMethod || "cash"})`, refType: "topup", refId: String(id), userId: t.userId });
    }
    const topupNotes = req.body?.notes ? String(req.body.notes) : "";
    pushUserI18n(t.userId, (lang) => approve
      ? { title: pick(lang, { en: "💰 Top-up approved", zh: "💰 充值已批准", id: "💰 Isi saldo disetujui" }), body: pick(lang, { en: "RP {n} added to your balance.", zh: "RP {n} 已添加到你的余额。", id: "RP {n} telah ditambahkan ke saldomu." }, { n: fmtN(Number(t.amount), lang) }), url: "/reborn", tag: `topup-${id}` }
      : { title: pick(lang, { en: "Top-up not approved", zh: "充值未获批准", id: "Isi saldo tidak disetujui" }), body: pick(lang, { en: "Your RP {n} top-up was rejected{note}", zh: "你的 RP {n} 充值申请被拒绝{note}", id: "Isi saldo RP {n} kamu ditolak{note}" }, { n: fmtN(Number(t.amount), lang), note: topupNotes ? (lang === "zh" ? `：${topupNotes}` : `: ${topupNotes}`) : (lang === "zh" ? "。" : ".") }), url: "/reborn", tag: `topup-${id}` }).catch(() => {});
    await logAdmin(req, { targetUserId: t.userId, targetType: "topup", targetId: id, action: approve ? "approve" : "reject", entityType: "credits", description: `${approve ? "Approved" : "Rejected"} RP ${t.amount} top-up` });
    res.json({ message: approve ? tr(req, { en: "Approved — credits added.", zh: "已批准——余额已添加。", id: "Disetujui — saldo ditambahkan." }) : tr(req, { en: "Rejected.", zh: "已拒绝。", id: "Ditolak." }) });
  }));

  // Events (homepage / login announcements)
  // Upcoming events, nearest date first; an event disappears once its last day has passed.
  // ?date=YYYY-MM-DD → only the events happening that day (shown when booking that date).
  app.get("/api/reborn/events", async (req, res) => {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date || "")) ? String(req.query.date) : "";
    // Posters are big (sharp A4) — send a cached link instead of the bytes in the list.
    res.json((await upcomingEvents(date || undefined)).map((e) => ({ ...e, imageUrl: eventImageLink(e) })));
  });
  app.get("/api/reborn/events/:id/image", async (req, res) => {
    const [ev] = await db.select({ imageUrl: events.imageUrl }).from(events).where(eq(events.id, Number(req.params.id))).limit(1);
    const m = /^data:([^;]+);base64,(.+)$/.exec(ev?.imageUrl || "");
    if (!m) return ev?.imageUrl && /^https?:\/\//.test(ev.imageUrl) ? res.redirect(302, ev.imageUrl) : res.status(404).end();
    res.set("Cache-Control", "public, max-age=31536000, immutable").type(m[1]).send(Buffer.from(m[2], "base64"));
  });
  app.get("/api/reborn/admin/events", requireStaff(async (_req, res) => { res.json(await db.select().from(events).orderBy(desc(events.createdAt))); }));
  app.post("/api/reborn/admin/events", requireStaff(async (req, res) => {
    const b = req.body || {};
    const [row] = await db.insert(events).values({ title: b.title || "New event", body: b.body || "", imageUrl: b.imageUrl || null, startDate: isoDay(b.startDate), endDate: isoDay(b.endDate), showOnLogin: b.showOnLogin !== false, active: b.active !== false, sortOrder: Number(b.sortOrder) || 0, createdBy: getUserId(req)! }).returning();
    await logAdmin(req, { targetType: "event", targetId: row.id, action: "create", entityType: "event", description: `Posted event "${row.title}"` });
    if (row.active) await notifyAllI18n("new_event", (lang) => ({ title: row.title, body: row.body?.slice(0, 140) || pick(lang, { en: "A new event was posted", zh: "发布了新活动", id: "Ada acara baru" }) }), { path: "/", eventId: row.id });
    res.json(row);
  }));
  app.put("/api/reborn/admin/events/:id", requireStaff(async (req, res) => {
    const id = Number(req.params.id); const b = req.body || {}; const patch: any = {};
    for (const k of ["title", "body", "imageUrl"]) if (b[k] !== undefined) patch[k] = b[k];
    if (b.startDate !== undefined) patch.startDate = isoDay(b.startDate);
    if (b.endDate !== undefined) patch.endDate = isoDay(b.endDate);
    if (b.showOnLogin !== undefined) patch.showOnLogin = !!b.showOnLogin;
    if (b.active !== undefined) patch.active = !!b.active;
    if (b.sortOrder !== undefined) patch.sortOrder = Number(b.sortOrder);
    const [row] = await db.update(events).set(patch).where(eq(events.id, id)).returning();
    res.json(row);
  }));
  app.delete("/api/reborn/admin/events/:id", requireStaff(async (req, res) => { await db.delete(events).where(eq(events.id, Number(req.params.id))); res.json({ message: tr(req, { en: "Deleted", zh: "已删除", id: "Dihapus" }) }); }));

  // Admin overview — counts for the admin home dashboard
  app.get("/api/reborn/admin/overview", requireStaff(async (_req, res) => {
    const n = async (q: any) => { const [r] = await q; return Number((r as any)?.c || 0); };
    const cnt = (tbl: any, where?: any) => n((where ? db.select({ c: sql`count(*)` }).from(tbl).where(where) : db.select({ c: sql`count(*)` }).from(tbl)));
    const [songReq, redemptions, topups, openTickets, appOrders, bottles, users_, products, lowStock] = await Promise.all([
      cnt(songRequests, eq(songRequests.status, "pending")),
      cnt(spinResults, eq(spinResults.status, "unused")),
      cnt(topUpRequests, eq(topUpRequests.status, "pending")),
      cnt(posTickets, eq(posTickets.status, "open")),
      cnt(posTickets, and(eq(posTickets.status, "open"), eq(posTickets.source, "app"))),
      cnt(bottleKeeps, eq(bottleKeeps.status, "kept")),
      cnt(users),
      cnt(posProducts),
      n(db.select({ c: sql`count(*)` }).from(posProducts).where(sql`${posProducts.stock} <= 5`)),
    ]);
    res.json({ songRequests: songReq, redemptions, topups, openTickets, appOrders, bottles, users: users_, products, lowStock });
  }));

  // Broadcast a message + email to all members (admin only)
  app.post("/api/reborn/admin/broadcast", requireAdmin(async (req, res) => {
    const subject = String(req.body?.subject || "").trim();
    const body = String(req.body?.body || "").trim();
    // Channels: `channels` {inapp,email,whatsapp} flags, or the older `channel` = both|inapp|email.
    const legacy = ["email", "inapp", "both"].includes(req.body?.channel) ? req.body.channel : "both";
    const ch = req.body?.channels && typeof req.body.channels === "object"
      ? { inapp: !!req.body.channels.inapp, email: !!req.body.channels.email, whatsapp: !!req.body.channels.whatsapp }
      : { inapp: legacy !== "email", email: legacy !== "inapp", whatsapp: false };
    if (!subject || !body) return res.status(400).json({ message: tr(req, { en: "Subject and message are required", zh: "请填写主题和内容", id: "Subjek dan pesan wajib diisi" }) });
    if (!ch.inapp && !ch.email && !ch.whatsapp) return res.status(400).json({ message: tr(req, { en: "Pick at least one way to send", zh: "请至少选择一种发送方式", id: "Pilih minimal satu cara kirim" }) });
    if (ch.whatsapp && !(await whatsappAvailable())) return res.status(400).json({ message: tr(req, { en: "WhatsApp is not connected — connect it in the CRM tab first.", zh: "WhatsApp 未连接 — 请先在 CRM 页面连接。", id: "WhatsApp belum terhubung — hubungkan dulu di tab CRM." }) });
    const everyone = await db.select({ id: users.id, email: users.email, firstName: users.firstName, phone: users.phoneNumber }).from(users);
    let inapp = 0, emails = 0, emailFail = 0, waQueued = 0;

    if (ch.inapp) {
      for (const u of everyone) {
        try {
          const [existing] = await db.select().from(supportTickets).where(and(eq(supportTickets.userId, u.id), sql`${supportTickets.status} != 'closed'`)).orderBy(desc(supportTickets.createdAt)).limit(1);
          const ticket = existing || (await db.insert(supportTickets).values({ userId: u.id, subject: "Announcement", category: "broadcast", status: "open", priority: "normal" }).returning())[0];
          await db.insert(supportMessages).values({ ticketId: ticket.id, senderType: "staff", senderId: getUserId(req)!, content: `📢 ${subject}\n\n${body}` });
          await db.update(supportTickets).set({ status: "open", updatedAt: new Date() }).where(eq(supportTickets.id, ticket.id));
          inapp++;
        } catch (e) { console.error("broadcast inapp", e); }
      }
    }
    if (ch.email) {
      const html = `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto"><h2 style="color:#c9a84c">${subject}</h2><p style="white-space:pre-line;color:#333;line-height:1.6">${body.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!))}</p><p style="color:#999;font-size:12px;margin-top:24px">Reborn Wave Group</p></div>`;
      for (const u of everyone) {
        if (!u.email) continue;
        try { const ok = await sendEmail({ to: u.email, subject, text: body, html }); ok ? emails++ : emailFail++; }
        catch (e) { emailFail++; console.error("broadcast email", e); }
      }
    }
    if (ch.whatsapp) {
      // Every WhatsApp number we know: people who chatted with the bot + members' phones (each number once).
      const contacts = await db.select({ id: crmContacts.id, phone: crmContacts.phone }).from(crmContacts);
      const targets = new Map<string, number | null>();
      for (const c of contacts) { const d = waDigits(c.phone); if (d.length >= 8) targets.set(d, c.id); }
      for (const u of everyone) { const d = waDigits(u.phone); if (d.length >= 8 && !targets.has(d)) targets.set(d, null); }
      waQueued = targets.size;
      const text = `📢 *${subject}*\n\n${body}`;
      // Send in the background, one every ~1.5s so WhatsApp doesn't flag the number.
      (async () => {
        let ok = 0, fail = 0;
        for (const [phone, contactId] of Array.from(targets)) {
          try {
            if (await sendWhatsApp(phone, text)) {
              ok++;
              if (contactId) await db.insert(crmMessages).values({ contactId, phone, direction: "out", body: text, viaBot: false }).catch(() => {});
            } else fail++;
          } catch (e) { fail++; console.error("broadcast wa", e); }
          await new Promise((r) => setTimeout(r, 1500));
        }
        await logAdmin(req, { targetType: "broadcast", action: "whatsapp", entityType: "broadcast", description: `Broadcast "${subject}" · WhatsApp ${ok} sent${fail ? `, ${fail} failed` : ""}` }).catch(() => {});
      })();
    }
    const pushed = await sendPushToUsers(everyone.map((u) => u.id), { title: `📢 ${subject}`, body, url: "/chat", tag: "broadcast" }).catch(() => 0);
    await sendRebornAllNotification({ type: "admin_broadcast", title: subject, body: body.slice(0, 160), data: { path: "/chat" } });
    await logAdmin(req, { targetType: "broadcast", action: "send", entityType: "broadcast", description: `Broadcast "${subject}" · ${inapp} in-app, ${emails} emails, ${pushed} push${emailFail ? `, ${emailFail} failed` : ""}${ch.whatsapp ? `, ${waQueued} WhatsApp queued` : ""}` });
    const waNote = ch.whatsapp ? tr(req, { en: " WhatsApp: sending to {w} number(s) now (about {m} min).", zh: " WhatsApp：正在发送给 {w} 个号码（约 {m} 分钟）。", id: " WhatsApp: sedang mengirim ke {w} nomor (sekitar {m} menit)." }, { w: waQueued, m: Math.max(1, Math.ceil(waQueued * 1.6 / 60)) }) : "";
    res.json({ message: tr(req, { en: "Sent — {a} in-app, {e} email(s), {p} push{f}.", zh: "已发送——应用内 {a} 条，邮件 {e} 封，推送 {p} 条{f}。", id: "Terkirim — {a} di aplikasi, {e} email, {p} push{f}." }, { a: inapp, e: emails, p: pushed, f: emailFail ? tr(req, { en: ", {x} email(s) failed", zh: "，{x} 封邮件发送失败", id: ", {x} email gagal" }, { x: emailFail }) : "" }) + waNote, inapp, emails, emailFail, pushed, whatsappQueued: waQueued });
  }));

  // Admin activity log (full admin only) — resolves which admin account did each action
  registerClientErrorRoute(app);
  // Admin › Errors: the error watcher's log (song, booking, POS, order, check-in, WhatsApp).
  app.get("/api/reborn/admin/errors", requireAdmin(async (req, res) => {
    const { listErrors } = await import("./errorWatch");
    res.json(await listErrors({ area: String(req.query.area || ""), days: Number(req.query.days) || 7 }));
  }));
  app.delete("/api/reborn/admin/errors", requireAdmin(async (req, res) => {
    const { clearErrors } = await import("./errorWatch");
    await clearErrors(String(req.query.area || ""));
    res.json({ message: tr(req, { en: "Cleared", zh: "已清除", id: "Dibersihkan" }) });
  }));
  app.get("/api/reborn/admin/logs", requireAdmin(async (_req, res) => {
    const rows = await db.select().from(adminLogs).orderBy(desc(adminLogs.createdAt)).limit(200);
    const adminIds = Array.from(new Set(rows.map((r) => r.adminUserId).filter(Boolean))) as string[];
    const admins = adminIds.length ? await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, username: users.username, email: users.email }).from(users).where(or(...adminIds.map((i) => eq(users.id, i)))) : [];
    const nameOf = new Map(admins.map((a) => [a.id, [a.firstName, a.lastName].filter(Boolean).join(" ") || a.username || a.email || a.id]));
    res.json(rows.map((r) => ({ ...r, adminName: nameOf.get(r.adminUserId) || r.adminUserId })));
  }));

  // Admin support: list open tickets + reply as staff
  app.get("/api/reborn/admin/support", requireStaff(async (_req, res) => {
    const tickets = await db.select().from(supportTickets).where(sql`${supportTickets.status} != 'closed'`).orderBy(desc(supportTickets.updatedAt)).limit(100);
    res.json(tickets);
  }));
  app.get("/api/reborn/admin/support/:ticketId", requireStaff(async (req, res) => {
    const tid = Number(req.params.ticketId);
    const msgs = await db.select().from(supportMessages).where(eq(supportMessages.ticketId, tid)).orderBy(supportMessages.createdAt);
    res.json(msgs);
  }));
  // Common words to ignore when turning a question into FAQ keywords.
  const STOPWORDS = new Set("the a an is are do does can how what when where why who i you my me to of in on for and or it this that with your our can't cannot will would should if at be have has".split(" "));
  app.post("/api/reborn/admin/support/:ticketId", requireStaff(async (req, res) => {
    const adminId = getUserId(req)!;
    const tid = Number(req.params.ticketId);
    const content = String(req.body?.message || "").trim();
    if (!content) return res.status(400).json({ message: tr(req, { en: "Empty message", zh: "消息不能为空", id: "Pesan kosong" }) });
    await db.insert(supportMessages).values({ ticketId: tid, senderType: "staff", senderId: adminId, content });
    await db.update(supportTickets).set({ status: "open", updatedAt: new Date() }).where(eq(supportTickets.id, tid));

    // Auto-learn: if the customer's last question had no confident FAQ answer, save this reply
    // as a new FAQ entry (unless learning is turned off) so it auto-answers next time.
    let learned = false;
    if (req.body?.learn !== false) {
      const msgs = await db.select().from(supportMessages).where(eq(supportMessages.ticketId, tid)).orderBy(desc(supportMessages.createdAt));
      const lastQ = msgs.find((m) => m.senderType === "user")?.content?.trim();
      if (lastQ && lastQ.length >= 4) {
        const faqs = await db.select().from(faqItems);
        const lc = lastQ.toLowerCase();
        const already = faqs.some((f) => {
          const kws = (f.keywords || "").toLowerCase().split(",").map((k) => k.trim()).filter(Boolean);
          return kws.some((k) => k.length > 2 && lc.includes(k)) || (f.question || "").toLowerCase() === lc;
        });
        if (!already) {
          const keywords = Array.from(new Set(lc.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w)))).slice(0, 8).join(",");
          await db.insert(faqItems).values({ question: lastQ.slice(0, 200), answer: content, keywords, active: true, sortOrder: 100 });
          learned = true;
          await logAdmin(req, { targetType: "faq", action: "auto_learn", entityType: "faq", description: `Learned FAQ from chat: "${lastQ.slice(0, 60)}"` });
        }
      }
    }
    res.json({ message: learned ? tr(req, { en: "Sent · added to auto-replies", zh: "已发送 · 已加入自动回复", id: "Terkirim · ditambahkan ke balasan otomatis" }) : tr(req, { en: "Sent", zh: "已发送", id: "Terkirim" }), learned });
  }));

  // ── POS · Inventory · In-app ordering · Accounting ──────────────────────────
  async function pointsSpendRp() {
    const result = await db.execute(sql`SELECT COALESCE((s.config->'loyalty'->>'pointsSpendRp')::numeric,1000) value FROM bridge_company_settings s JOIN bridge_companies c ON c.id=s.company_id WHERE c.slug=${homeCompanySlug()} LIMIT 1`);
    return Math.max(1, Number((result.rows || result as any)[0]?.value) || 1000);
  }

  async function storeBottleForMember(u: any, bottle: any, staffId: string, lang: Lang = "en") {
    if (!u || !bottle?.enabled) return null;
    const name = String(bottle.name || "").trim();
    if (!name) throw new Error(pick(lang, { en: "Enter the bottle name before payment", zh: "付款前请输入酒名", id: "Masukkan nama botol sebelum pembayaran" }));
    if (["wine", "whisky"].includes(String(bottle.type || "")) && !bottle.photoUrl) throw new Error(pick(lang, { en: "A bottle photo is required for wine and whisky", zh: "葡萄酒和威士忌需要拍摄酒瓶照片", id: "Foto botol wajib untuk wine dan wiski" }));
    const now = new Date();
    const keepDays = (await getSettings()).bottleExpiryDays;
    const [row] = await db.insert(bottleKeeps).values({
      userId: u.id, memberName: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.email,
      memberCode: u.referralCode, type: ["beer", "wine", "whisky", "other"].includes(bottle.type) ? bottle.type : "beer",
      name, quantity: Math.max(1, Math.floor(Number(bottle.quantity) || 1)), photoUrl: bottle.photoUrl || null,
      note: bottle.note || null, storedByStaffId: staffId, status: "kept", storedAt: now, expiresAt: addDays(keepDays, now),
    }).returning();
    return row;
  }

  // ── Packages (server/memberPackages.ts) ──
  const needMemberForPackage = (req: Request) => tr(req, { en: "Select a member to sell a package — it goes into their packages", zh: "出售套餐前请先选择会员——套餐会存入会员账户", id: "Pilih member untuk menjual paket — paket masuk ke akun member" });
  const packageCreditChanged = (req: Request) => tr(req, { en: "The member's package credit just changed — please try again", zh: "会员的套餐余额刚刚有变动——请重试", id: "Kredit paket member baru saja berubah — silakan coba lagi" });
  // The extra lines after "Paid RP …" on a POS payment.
  function paidExtras(req: Request, x: { points: number; bottle: boolean; creditUse: number; perkAmount: number; perkPercent: number; packages: number }) {
    const lang = reqLang(req);
    return (x.creditUse ? tr(req, { en: " · RP {n} paid with package credit", zh: " · 套餐余额支付 RP {n}", id: " · RP {n} dibayar dengan kredit paket" }, { n: fmtN(x.creditUse, lang) }) : "")
      + (x.perkAmount ? tr(req, { en: " · member {p}% off: RP {n}", zh: " · 会员 {p}% 折扣：RP {n}", id: " · diskon member {p}%: RP {n}" }, { p: x.perkPercent, n: fmtN(x.perkAmount, lang) }) : "")
      + (x.packages ? tr(req, { en: " · {n} package(s) added to the member", zh: " · 已为会员添加 {n} 个套餐", id: " · {n} paket ditambahkan ke member" }, { n: x.packages }) : "")
      + (x.points ? tr(req, { en: " · {p} points added", zh: " · 已增加 {p} 积分", id: " · {p} poin ditambahkan" }, { p: x.points }) : "")
      + (x.bottle ? tr(req, { en: " · bottle stored for 30 days", zh: " · 酒瓶已寄存 30 天", id: " · botol disimpan selama 30 hari" }) : "");
  }
  // Packages bought on a paid bill → the member's inventory + a notification.
  async function afterPackageSale(member: any, ticketId: number, companyId: number | null, items: { productId?: number | null; qty: number; price: any }[]) {
    const made = await issuePackages({ id: member.id, name: [member.firstName, member.lastName].filter(Boolean).join(" ") || member.username || member.email, code: member.referralCode }, ticketId, companyId, items);
    for (const p of made) await notifyUserI18n(member.id, "package_added", (lang) => ({
      title: pick(lang, { en: "🎁 Package added: {name}", zh: "🎁 已添加套餐：{name}", id: "🎁 Paket ditambahkan: {name}" }, { name: p.name }),
      body: p.kind === "uses"
        ? pick(lang, { en: "{n} visits ready to use. Show your member code at the counter.", zh: "共 {n} 次可用。在柜台出示会员码即可使用。", id: "{n} kunjungan siap dipakai. Tunjukkan kode member di kasir." }, { n: p.usesTotal })
        : pick(lang, { en: "RP {n} credit ready to spend.", zh: "RP {n} 余额可以使用了。", id: "Kredit RP {n} siap dipakai." }, { n: fmtN(Number(p.creditTotal), lang) }),
    }), { path: "/bottles" });
    return made;
  }
  // A credit package was used up → tell the member about their new discount.
  async function notifyPerks(userId: string, perks: { percent: number; until: Date | null; name: string }[]) {
    for (const k of perks) await notifyUserI18n(userId, "package_perk", (lang) => ({
      title: pick(lang, { en: "🎉 You now get {p}% off", zh: "🎉 你现在享有 {p}% 折扣", id: "🎉 Kamu sekarang dapat diskon {p}%" }, { p: k.percent }),
      body: k.until
        ? pick(lang, { en: "Your {name} credit is used up — {p}% off every bill until {d}.", zh: "你的 {name} 余额已用完——{d} 前每张账单享 {p}% 折扣。", id: "Kredit {name} kamu sudah habis — diskon {p}% setiap tagihan sampai {d}." }, { name: k.name, p: k.percent, d: k.until.toISOString().slice(0, 10) })
        : pick(lang, { en: "Your {name} credit is used up — {p}% off every bill, for life.", zh: "你的 {name} 余额已用完——终身每张账单享 {p}% 折扣。", id: "Kredit {name} kamu sudah habis — diskon {p}% setiap tagihan, seumur hidup." }, { name: k.name, p: k.percent }),
    }), { path: "/bottles" });
  }

  // Products — staff can read (to sell); admin manages catalogue/prices/stock.
  app.get("/api/reborn/pos/products", requireStaff(async (req, res) => {
    const cid = await rebornCompanyId(req);
    res.json(await db.select().from(posProducts).where(eq(posProducts.companyId, cid)).orderBy(posProducts.sortOrder, posProducts.name));
  }));
  // Members browse the active menu to order in-app.
  app.get("/api/reborn/shop/products", requireAuth, async (req, res) => {
    const cid = await rebornCompanyId(req);
    const rows = await db.select().from(posProducts).where(and(eq(posProducts.companyId, cid), eq(posProducts.active, true), eq(posProducts.posVisible, true))).orderBy(posProducts.sortOrder, posProducts.name);
    const allowNegative = (await getSettings()).allowNegativeStock;
    res.json(rows.map((p) => ({ id: p.id, name: p.name, category: p.category, price: p.price, stock: p.stock, imageUrl: p.imageUrl, soldOut: !p.packageKind && !allowNegative && (p.stock ?? 0) <= 0 })));
  });
  app.post("/api/reborn/admin/pos/products", requireAdmin(async (req, res) => {
    const b = req.body || {};
    if (!String(b.name || "").trim()) return res.status(400).json({ message: tr(req, { en: "Name required", zh: "请输入名称", id: "Nama wajib diisi" }) });
    const cid = await rebornCompanyId(req);
    const [row] = await db.insert(posProducts).values({
      companyId: cid,
      name: String(b.name).trim(), category: b.category || "General", department: b.department || null, price: String(Number(b.price) || 0),
      cost: String(Number(b.cost) || 0), stock: Number(b.stock) || 0, imageUrl: b.imageUrl || null,
      supplierName: b.supplierName || null, supplierAddress: b.supplierAddress || null, supplierPhone: b.supplierPhone || null,
      active: b.active !== false, posVisible: b.posVisible !== false, sortOrder: Number(b.sortOrder) || 0,
      ...packageFields(b),
    }).returning();
    if ((row.stock ?? 0) > 0) await db.insert(stockMovements).values({ productId: row.id, delta: row.stock, reason: "stock_in", supplier: b.supplierName || null, note: "Initial stock", userId: getUserId(req)! });
    await logAdmin(req, { targetType: "pos_product", targetId: row.id, action: "create", entityType: "product", description: `Added product "${row.name}" @ RP ${row.price}` });
    res.json(row);
  }));
  app.patch("/api/reborn/admin/pos/products/:id", requireAdmin(async (req, res) => {
    const id = Number(req.params.id); const b = req.body || {};
    const cid = await rebornCompanyId(req);
    const [prev] = await db.select().from(posProducts).where(and(eq(posProducts.id, id), eq(posProducts.companyId, cid)));
    if (!prev) return res.status(404).json({ message: tr(req, { en: "Not found", zh: "未找到", id: "Tidak ditemukan" }) });
    const patch: any = {};
    for (const k of ["name", "category", "department", "imageUrl", "supplierName", "supplierAddress", "supplierPhone"]) if (b[k] !== undefined) patch[k] = b[k] || null;
    for (const k of ["price", "cost"]) if (b[k] !== undefined) patch[k] = String(Number(b[k]) || 0);
    if (b.sortOrder !== undefined) patch.sortOrder = Number(b.sortOrder);
    if (b.active !== undefined) patch.active = !!b.active;
    if (b.posVisible !== undefined) patch.posVisible = !!b.posVisible;
    if (b.packageKind !== undefined) Object.assign(patch, packageFields(b));
    else if (b.creditOk !== undefined && !prev.packageKind) patch.creditOk = !!b.creditOk;
    const [row] = await db.update(posProducts).set(patch).where(and(eq(posProducts.id, id), eq(posProducts.companyId, cid))).returning();
    if (b.price !== undefined && String(prev.price) !== String(row.price))
      await logAdmin(req, { targetType: "pos_product", targetId: id, action: "edit_price", entityType: "product", oldValues: { price: prev.price }, newValues: { price: row.price }, description: `Price of "${row.name}" RP ${prev.price} → RP ${row.price}` });
    res.json(row);
  }));

  // Stock-in — receive inventory. Records a movement and (if unit cost given) a purchase expense.
  app.post("/api/reborn/pos/stock-in", requireStaff(async (req, res) => {
    const id = Number(req.body?.productId); const qty = Math.floor(Number(req.body?.qty) || 0);
    const unitCost = Number(req.body?.unitCost);
    if (!id || qty === 0) return res.status(400).json({ message: tr(req, { en: "Product and quantity required", zh: "请填写商品和数量", id: "Produk dan jumlah wajib diisi" }) });
    const cid = await rebornCompanyId(req);
    const [p] = await db.select().from(posProducts).where(and(eq(posProducts.id, id), eq(posProducts.companyId, cid)));
    if (!p) return res.status(404).json({ message: tr(req, { en: "Product not found", zh: "找不到该商品", id: "Produk tidak ditemukan" }) });
    const supplier = String(req.body?.supplier || "").trim() || null;
    await db.update(posProducts).set({ stock: sql`${posProducts.stock} + ${qty}`, ...(supplier ? { supplierName: supplier } : {}) }).where(eq(posProducts.id, id));
    await db.insert(stockMovements).values({ productId: id, delta: qty, reason: qty > 0 ? "stock_in" : "adjustment", supplier, unitCost: unitCost > 0 ? String(unitCost) : null, note: req.body?.note || null, userId: getUserId(req)! });
    if (qty > 0 && unitCost > 0)
      await db.insert(ledgerEntries).values({ kind: "expense", category: "purchase", amount: String(qty * unitCost), note: `Stock in: ${qty} × ${p.name} @ RP ${unitCost}${supplier ? ` from ${supplier}` : ""}`, refType: "stock_movement", refId: String(id), userId: getUserId(req)! });
    await logAdmin(req, { targetType: "pos_product", targetId: id, action: "stock_in", entityType: "stock", description: `Stock ${qty > 0 ? "+" : ""}${qty} for "${p.name}"${supplier ? ` (${supplier})` : ""}` });
    res.json({ message: tr(req, { en: "Stock updated", zh: "库存已更新", id: "Stok diperbarui" }) });
  }));
  app.get("/api/reborn/pos/stock", requireStaff(async (req, res) => {
    const cid = await rebornCompanyId(req);
    res.json(await db.select().from(posProducts).where(and(eq(posProducts.companyId, cid), isNull(posProducts.packageKind))).orderBy(posProducts.stock)); // packages hold no stock
  }));

  // Member lookup by member code (referral code), email, or phone — for POS key-in.
  app.get("/api/reborn/pos/member/:code", requireStaff(async (req, res) => {
    const code = String(req.params.code || "").trim();
    if (!code) return res.status(400).json({ message: tr(req, { en: "Enter a member code", zh: "请输入会员码", id: "Masukkan kode member" }) });
    const cid = await rebornCompanyId(req);
    const memberOf = sql`${users.id} IN (SELECT user_id FROM bridge_company_members WHERE company_id=${cid})`;
    const [u] = await db.select().from(users).where(and(memberOf,
      or(ilike(users.referralCode, code), ilike(users.membershipCardNumber, code), ilike(users.username, code), ilike(users.email, code), eq(users.phoneNumber, code), eq(users.id, code)))
    ).limit(1);
    if (!u) return res.status(404).json({ message: tr(req, { en: "Member not found", zh: "找不到该会员", id: "Member tidak ditemukan" }) });
    res.json({ id: u.id, name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.email, code: u.referralCode, membershipCardNumber: u.membershipCardNumber, credits: u.credits, loyaltyPoints: u.loyaltyPoints, tokens: u.tokens });
  }));
  app.get("/api/reborn/pos/members", requireStaff(async (req, res) => {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json([]);
    const cid = await rebornCompanyId(req);
    const memberOf = sql`${users.id} IN (SELECT user_id FROM bridge_company_members WHERE company_id=${cid})`;
    const rows = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, username: users.username, email: users.email, phone: users.phoneNumber, code: users.referralCode, card: users.membershipCardNumber }).from(users).where(and(memberOf, or(
      ilike(users.firstName, `%${q}%`), ilike(users.lastName, `%${q}%`), ilike(users.username, `%${q}%`), ilike(users.email, `%${q}%`), ilike(users.referralCode, `%${q}%`), ilike(users.membershipCardNumber, `%${q}%`)
    ))).orderBy(users.firstName).limit(12);
    res.json(rows.map((u) => ({ ...u, name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.email })));
  }));

  // Deduct stock for a set of items, append them to an order, and re-total the ticket.
  async function appendItems(orderId: number, orderNo: string, items: any[], userId: string, status: string = "accepted", source: string = "pos") {
    for (const it of items) {
      await db.insert(posTicketItems).values({ orderId, productId: it.productId || null, name: it.name, price: String(it.price), qty: it.qty, lineTotal: String(Number(it.price) * it.qty), status, source });
      if (it.productId) {
        const [before] = await db.select().from(posProducts).where(eq(posProducts.id, it.productId));
        await db.update(posProducts).set({ stock: sql`${posProducts.stock} - ${it.qty}` }).where(and(eq(posProducts.id, it.productId), isNull(posProducts.packageKind)));
        await db.insert(stockMovements).values({ productId: it.productId, delta: -it.qty, reason: "sale", note: `Ticket ${orderNo}`, userId });
        const remaining = (before?.stock ?? 0) - it.qty;
        if ((before?.stock ?? 0) > 5 && remaining <= 5) await notifyStaffI18n("low_stock", (lang) => ({ title: pick(lang, { en: "Low stock warning", zh: "库存不足提醒", id: "Peringatan stok menipis" }), body: pick(lang, { en: "{item}: {n} left", zh: "{item}：剩余 {n}", id: "{item}: sisa {n}" }, { item: it.name, n: Math.max(0, remaining) }) }), { path: "/reborn-pos", productId: it.productId });
      }
    }
    return recalcTicket(orderId);
  }
  // Ticket subtotal/total = sum of non-rejected line totals.
  async function recalcTicket(orderId: number) {
    const rows = await db.select().from(posTicketItems).where(eq(posTicketItems.orderId, orderId));
    const total = rows.filter((r) => r.status !== "rejected").reduce((s, r) => s + Number(r.lineTotal), 0);
    await db.update(posTickets).set({ subtotal: String(total), total: String(total) }).where(eq(posTickets.id, orderId));
    return total;
  }

  // Validate requested items against the live catalogue + stock.
  async function resolveItems(items: any[], lang: Lang = "en"): Promise<{ clean?: any[]; error?: string }> {
    const ids = items.map((it) => Number(it.productId)).filter(Boolean);
    const products = ids.length ? await db.select().from(posProducts).where(or(...ids.map((i: number) => eq(posProducts.id, i)))) : [];
    const byId = new Map(products.map((p) => [p.id, p]));
    const allowNegative = (await getSettings()).allowNegativeStock;
    const clean: any[] = [];
    for (const it of items) {
      const p = byId.get(Number(it.productId));
      if (!p || !p.active) return { error: pick(lang, { en: "An item is no longer available", zh: "有商品已不再供应", id: "Ada item yang sudah tidak tersedia" }) };
      const qty = Math.max(1, Math.floor(Number(it.qty) || 1));
      if (!allowNegative && !p.packageKind && (p.stock ?? 0) < qty) return { error: pick(lang, { en: "{item} is sold out", zh: "{item} 已售罄", id: "{item} habis terjual" }, { item: p.name }) };
      clean.push({ productId: p.id, name: p.name, price: Number(p.price), qty });
    }
    return { clean };
  }
  async function findMemberByCode(code: string) {
    if (!code?.trim()) return null;
    const c = code.trim();
    const [u] = await db.select().from(users).where(or(ilike(users.referralCode, c), ilike(users.membershipCardNumber, c), ilike(users.username, c), ilike(users.email, c), eq(users.id, c))).limit(1);
    return u || null;
  }
  // Type-ahead member search — powers the username dropdowns (prize award, manual booking, etc.)
  app.get("/api/reborn/admin/user-search", requireStaff(async (req, res) => {
    const q = String(req.query.q || "").trim();
    if (q.length < 1) return res.json([]);
    const like = `%${q}%`;
    const cid = await rebornCompanyId(req);
    const memberOf = sql`${users.id} IN (SELECT user_id FROM bridge_company_members WHERE company_id=${cid})`;
    const rows = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, username: users.username, email: users.email, referralCode: users.referralCode, membershipCardNumber: users.membershipCardNumber })
      .from(users)
      .where(and(memberOf, or(ilike(users.firstName, like), ilike(users.lastName, like), ilike(users.username, like), ilike(users.email, like), ilike(users.referralCode, like), ilike(users.membershipCardNumber, like))))
      .limit(12);
    res.json(rows.map((u: any) => ({
      id: u.id,
      name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.email || u.id,
      username: u.username || "", email: u.email || "", code: u.referralCode || u.membershipCardNumber || u.username || u.email || u.id,
    })));
  }));
  const memberTag = (u: any) => u ? { memberId: u.id, memberCode: u.referralCode, memberName: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email } : {};

  // Staff accounts (for the salesperson / commission dropdown)
  app.get("/api/reborn/pos/staff", requireStaff(async (_req, res) => {
    const rows = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, username: users.username, email: users.email, role: users.role })
      .from(users).where(or(eq(users.role, "staff"), eq(users.role, "admin"))).orderBy(users.firstName).limit(200);
    res.json(rows.map((u) => ({ id: u.id, name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.email, role: u.role })));
  }));
  async function salesTag(body: any) {
    if (!body?.salesStaffId) return {};
    const [s] = await db.select().from(users).where(eq(users.id, String(body.salesStaffId))).limit(1);
    if (!s) return {};
    return { salesStaffId: s.id, salesStaffName: [s.firstName, s.lastName].filter(Boolean).join(" ") || s.username || s.email };
  }

  // Staff opens a running tab for a table (optionally tagged to a member). One open ticket per table.
  app.post("/api/reborn/pos/orders", requireStaff(async (req, res) => {
    const tableNumber = String(req.body?.tableNumber || "").trim();
    if (!tableNumber) return res.status(400).json({ message: tr(req, { en: "Enter a table number", zh: "请输入桌号", id: "Masukkan nomor meja" }) });
    const cid = await rebornCompanyId(req);
    const [existing] = await db.select().from(posTickets).where(and(eq(posTickets.companyId, cid), eq(posTickets.status, "open"), eq(posTickets.tableNumber, tableNumber))).limit(1);
    if (existing) return res.json({ message: tr(req, { en: "Table {t} already has an open ticket", zh: "{t} 号桌已有未结账单", id: "Meja {t} sudah punya tagihan terbuka" }, { t: tableNumber }), order: existing });
    const u = await findMemberByCode(req.body?.memberCode || "");
    const [row] = await db.insert(posTickets).values({
      companyId: cid,
      orderNo: "T" + Date.now().toString(36).toUpperCase(), source: "pos", status: "open",
      ...memberTag(u), ...(await salesTag(req.body)), tableNumber, orderMode: req.body?.orderMode === "take_away" ? "take_away" : "dine_in",
      subtotal: "0", total: "0", staffId: getUserId(req)!,
    }).returning();
    await logAdmin(req, { targetUserId: u?.id, targetType: "pos_order", targetId: row.id, action: "open_ticket", entityType: "order", description: `Opened ticket ${row.orderNo} for table ${tableNumber}` });
    res.json({ message: tr(req, { en: "Opened ticket for table {t}", zh: "已为 {t} 号桌开单", id: "Tagihan dibuka untuk meja {t}" }, { t: tableNumber }), order: row });
  }));

  // Staff adds items to an open ticket (accumulate over the night).
  app.post("/api/reborn/pos/orders/:id/items", requireStaff(async (req, res) => {
    const id = Number(req.params.id);
    const [o] = await db.select().from(posTickets).where(eq(posTickets.id, id));
    if (!o || o.status !== "open") return res.status(400).json({ message: tr(req, { en: "Ticket not open", zh: "该账单未开启", id: "Tagihan tidak terbuka" }) });
    const { clean, error } = await resolveItems(Array.isArray(req.body?.items) ? req.body.items : [], reqLang(req));
    if (error) return res.status(400).json({ message: error });
    if (!clean!.length) return res.status(400).json({ message: tr(req, { en: "No items", zh: "没有商品", id: "Tidak ada item" }) });
    const total = await appendItems(id, o.orderNo, clean!, getUserId(req)!);
    res.json({ message: tr(req, { en: "Added to ticket", zh: "已加入账单", id: "Ditambahkan ke tagihan" }), total });
  }));
  // Tag / change the member on an open ticket (so points go to the right person).
  app.post("/api/reborn/pos/orders/:id/member", requireStaff(async (req, res) => {
    const id = Number(req.params.id);
    const [o] = await db.select().from(posTickets).where(eq(posTickets.id, id));
    if (!o || o.status !== "open") return res.status(400).json({ message: tr(req, { en: "Ticket not open", zh: "该账单未开启", id: "Tagihan tidak terbuka" }) });
    const u = await findMemberByCode(req.body?.memberCode || "");
    if (!u) return res.status(404).json({ message: tr(req, { en: "Member not found", zh: "找不到该会员", id: "Member tidak ditemukan" }) });
    await db.update(posTickets).set(memberTag(u)).where(eq(posTickets.id, id));
    res.json({ message: tr(req, { en: "Tagged to {name}", zh: "已关联到 {name}", id: "Ditandai ke {name}" }, { name: String(memberTag(u).memberName || "") }) });
  }));

  // Quick walk-in sale: open, fill, and close in one step.
  app.post("/api/reborn/pos/sale", requireStaff(async (req, res) => {
    const { clean, error } = await resolveItems(Array.isArray(req.body?.items) ? req.body.items : [], reqLang(req));
    if (error) return res.status(400).json({ message: error });
    if (!clean!.length) return res.status(400).json({ message: tr(req, { en: "No items", zh: "没有商品", id: "Tidak ada item" }) });
    const paymentReference = String(req.body?.paymentReference || "").trim();
    const u = await findMemberByCode(req.body?.memberCode || "");
    if (req.body?.paymentMethod === "credits" && !u) return res.status(400).json({ message: tr(req, { en: "Enter the member code to pay with their RP credits", zh: "使用 RP 余额付款前请输入会员码", id: "Masukkan kode member untuk membayar dengan kredit RP" }) });
    if (req.body?.keepBottle?.enabled && !u) return res.status(400).json({ message: tr(req, { en: "Select a member before keeping a bottle at checkout", zh: "结账寄存酒瓶前请先选择会员", id: "Pilih member sebelum menitipkan botol saat pembayaran" }) });
    if (req.body?.keepBottle?.enabled && !String(req.body.keepBottle.name || "").trim()) return res.status(400).json({ message: tr(req, { en: "Enter the bottle name before payment", zh: "付款前请输入酒名", id: "Masukkan nama botol sebelum pembayaran" }) });
    const settings = await getSettings();
    const q = await quoteBill({ lines: clean!.map((it) => ({ productId: it.productId, lineTotal: it.price * it.qty })), manualDiscount: Number(req.body?.discount) || 0, userId: u?.id, usePackageCredit: !!req.body?.usePackageCredit, serviceFeePercent: settings.serviceFeePercent, taxPercent: settings.taxPercent });
    const { subtotal, discount, serviceFee, tax, total, due } = q;
    if (q.hasPackages && !u) return res.status(400).json({ message: needMemberForPackage(req) });
    const paymentMethod = due <= 0 ? "package" : posMethod(req.body?.paymentMethod);
    if (paymentMethod === "card" && !paymentReference) return res.status(400).json({ message: tr(req, { en: "Enter the card approval or receipt number", zh: "请输入刷卡授权码或小票号码", id: "Masukkan kode persetujuan kartu atau nomor struk" }) });
    const cashReceived = paymentMethod === "cash" ? Number(req.body?.cashReceived) : null;
    if (paymentMethod === "cash" && (!Number.isFinite(cashReceived) || cashReceived! < due)) return res.status(400).json({ message: tr(req, { en: "Cash received must be at least RP {n}", zh: "收到的现金至少需为 RP {n}", id: "Uang tunai yang diterima minimal RP {n}" }, { n: fmtN(due, reqLang(req)) }) });
    const changeGiven = paymentMethod === "cash" ? cashReceived! - due : null;
    const keepType = String(req.body?.keepBottle?.type || "");
    if (req.body?.keepBottle?.enabled && ["wine", "whisky"].includes(keepType) && !req.body?.keepBottle?.photoUrl) return res.status(400).json({ message: tr(req, { en: "A bottle photo is required for wine and whisky", zh: "葡萄酒和威士忌需要拍摄酒瓶照片", id: "Foto botol wajib untuk wine dan wiski" }) });
    if (paymentMethod === "credits" && Number(u!.credits || 0) < due) return res.status(400).json({ message: notEnoughCredits(req, due, Number(u!.credits || 0)) });
    const points = u ? Math.floor(due / await pointsSpendRp()) : 0;
    const orderMode = req.body?.orderMode === "take_away" ? "take_away" : "dine_in";
    const staffId = getUserId(req)!;
    const [row] = await db.insert(posTickets).values({
      companyId: await rebornCompanyId(req),
      orderNo: "R" + Date.now().toString(36).toUpperCase(), source: "pos", status: "paid",
      ...memberTag(u), ...(await salesTag(req.body)), tableNumber: req.body?.tableNumber || null,
      subtotal: String(subtotal), discount: String(discount), discountReason: q.perkAmount > 0 ? `Member ${q.perkPercent}%` : null, serviceFee: String(serviceFee), tax: String(tax), total: String(total), packageCreditUsed: String(q.creditUse), orderMode,
      paymentMethod, paymentReference: paymentReference || null, cashReceived: cashReceived === null ? null : String(cashReceived), changeGiven: changeGiven === null ? null : String(changeGiven), pointsEarned: points, staffId, paidAt: new Date(),
    }).returning();
    const spent = await spendPackageCredit(u?.id || "", q.creditUse, row.id, staffId);
    if (spent.spent < q.creditUse) { await restorePackageCredit(row.id, staffId, "Payment not completed"); await db.delete(posTickets).where(eq(posTickets.id, row.id)); return res.status(409).json({ message: packageCreditChanged(req) }); }
    if (paymentMethod === "credits") {
      const paid = await payWithCredits(u!.id, due, row.orderNo, row.id);
      if (!paid.ok) { if (spent.spent) await restorePackageCredit(row.id, staffId, "Payment not completed"); await db.delete(posTickets).where(eq(posTickets.id, row.id)); return res.status(400).json({ message: notEnoughCredits(req, due, paid.balance) }); }
    }
    await appendItems(row.id, row.orderNo, clean!, staffId);
    await db.update(posTickets).set({ subtotal: String(subtotal), discount: String(discount), serviceFee: String(serviceFee), tax: String(tax), total: String(total) }).where(eq(posTickets.id, row.id));
    if (u && points > 0) await db.update(users).set({ loyaltyPoints: sql`${users.loyaltyPoints} + ${points}`, lifetimePoints: sql`${users.lifetimePoints} + ${points}`, updatedAt: new Date() }).where(eq(users.id, u.id));
    if (paymentMethod !== "credits" && due > 0) await db.insert(ledgerEntries).values({ kind: "income", category: "product_sale", amount: String(due), note: `Sale ${row.orderNo} (${paymentMethod})`, refType: "pos_order", refId: String(row.id), userId: u?.id || null });
    await notifyStaffI18n("payment_completed", (lang) => ({ title: pick(lang, { en: "Payment completed · {no}", zh: "付款完成 · {no}", id: "Pembayaran selesai · {no}" }, { no: row.orderNo }), body: `RP ${fmtN(total, lang)} · ${methodLabel(paymentMethod, lang)}` }), { path: "/reborn-admin", ticketId: row.id });
    if (u?.id) await notifyUserI18n(u.id, "order_paid", (lang) => ({ title: pick(lang, { en: "Payment completed", zh: "付款完成", id: "Pembayaran selesai" }), body: pick(lang, { en: "{no} · RP {n}. Your receipt is ready.", zh: "{no} · RP {n}。你的收据已准备好。", id: "{no} · RP {n}. Struk kamu sudah siap." }, { no: row.orderNo, n: fmtN(total, lang) }) }), { path: "/history", ticketId: row.id });
    const keptBottle = u ? await storeBottleForMember(u, req.body?.keepBottle, staffId, reqLang(req)) : null;
    const packagesAdded = u && q.hasPackages ? await afterPackageSale(u, row.id, row.companyId, clean!) : [];
    if (u) await notifyPerks(u.id, spent.perks);
    await logAdmin(req, { targetUserId: u?.id, targetType: "pos_order", targetId: row.id, action: "sale", entityType: "order", description: `Quick sale ${row.orderNo} RP ${total}${q.creditUse ? ` · package credit RP ${q.creditUse}` : ""}` });
    if (u) {
      crmRecordVisit({ userId: u.id, phone: (u as any).phoneNumber, name: [u.firstName, u.lastName].filter(Boolean).join(" ") }).catch(() => {});
      sendReviewRequest({ userId: u.id, phone: (u as any).phoneNumber, name: u.firstName, club: settings.clubName, reviewUrl: settings.googleReviewUrl }).catch(() => {});
    }
    contributeSpinPoolIfUnreferred(u?.id ?? null, due).catch(() => {});
    await freeTableAfterBill(row.companyId, row.tableNumber); // paid at a table → the table's booking frees it
    const items = await db.select().from(posTicketItems).where(eq(posTicketItems.orderId, row.id));
    res.json({ message: tr(req, { en: "Paid RP {n}", zh: "已付款 RP {n}", id: "Dibayar RP {n}" }, { n: fmtN(total, reqLang(req)) }) + paidExtras(req, { points, bottle: !!keptBottle, creditUse: q.creditUse, perkAmount: q.perkAmount, perkPercent: q.perkPercent, packages: packagesAdded.length }), order: { ...row, subtotal: String(subtotal), discount: String(discount), serviceFee: String(serviceFee), tax: String(tax), total: String(total), items }, bottle: keptBottle, packages: packagesAdded, receipt: { clubName: settings.clubName, logoUrl: settings.receiptLogoUrl, footer: settings.receiptFooter, serviceFeePercent: settings.serviceFeePercent, taxPercent: settings.taxPercent, autoPrint: settings.posAutoPrint } });
  }));

  // Member orders from the app — merges into their table's open ticket (or opens one).
  app.post("/api/reborn/shop/order", requireAuth, async (req, res) => {
    const userId = getUserId(req)!;
    const tableNumber = String(req.body?.tableNumber || "").trim() || (await activeCheckin(getUserId(req)!).catch(() => null))?.tableLabel || "";
    if (!tableNumber) return res.status(400).json({ message: tr(req, { en: "Enter your table number", zh: "请输入你的桌号", id: "Masukkan nomor mejamu" }) });
    const { clean, error } = await resolveItems(Array.isArray(req.body?.items) ? req.body.items : [], reqLang(req));
    if (error) return res.status(400).json({ message: error });
    if (!clean!.length) return res.status(400).json({ message: tr(req, { en: "Your order is empty", zh: "你的订单是空的", id: "Pesananmu kosong" }) });
    const cid = await rebornCompanyId(req);
    const [u] = await db.select().from(users).where(eq(users.id, userId));
    let [order] = await db.select().from(posTickets).where(and(eq(posTickets.companyId, cid), eq(posTickets.status, "open"), eq(posTickets.tableNumber, tableNumber))).limit(1);
    if (!order) {
      [order] = await db.insert(posTickets).values({
        companyId: cid,
        orderNo: "A" + Date.now().toString(36).toUpperCase(), source: "app", status: "open",
        memberId: userId, memberCode: u?.referralCode || null,
        memberName: [u?.firstName, u?.lastName].filter(Boolean).join(" ") || u?.email || null,
        tableNumber, orderMode: req.body?.orderMode === "take_away" ? "take_away" : "dine_in", subtotal: "0", total: "0",
      }).returning();
    }
    await appendItems(order.id, order.orderNo, clean!, userId, "pending", "app"); // counter must accept
    emitLiveUpdate("/api/reborn/pos/orders", { action: "NEW_ORDER", resource: String(order.id) });
    // Phone push first and independently: a stalled WhatsApp send used to hold
    // this request open so the admin app alert never went out.
    const itemCount = clean!.length;
    notifyStaffI18n("new_order", (lang) => ({
      title: pick(lang, { en: "New order {no}", zh: "新订单 {no}", id: "Pesanan baru {no}" }, { no: order.orderNo }),
      body: pick(lang, itemCount === 1
        ? { en: "{name} · Table {t} · {n} item", zh: "{name} · {t} 号桌 · {n} 件商品", id: "{name} · Meja {t} · {n} item" }
        : { en: "{name} · Table {t} · {n} items", zh: "{name} · {t} 号桌 · {n} 件商品", id: "{name} · Meja {t} · {n} item" }, { name: order.memberName || pick(lang, { en: "Member", zh: "会员", id: "Member" }), t: tableNumber, n: itemCount }),
    }), { path: "/reborn-pos", ticketId: order.id }).catch((e) => console.warn("new_order app push failed", e));
    pushAdminsI18n((lang) => ({ title: pick(lang, { en: "🛎️ New order", zh: "🛎️ 新订单", id: "🛎️ Pesanan baru" }), body: pick(lang, { en: "Table {t} · {name} — needs Accept/Reject", zh: "{t} 号桌 · {name} — 需要接单/拒单", id: "Meja {t} · {name} — perlu Terima/Tolak" }, { t: tableNumber, name: order.memberName || pick(lang, { en: "member", zh: "会员", id: "member" }) }), url: "/reborn-pos", tag: "new-order" })).catch(() => {});
    notifyAdmins(`🛎️ New order from table ${tableNumber} (${order.memberName || "member"}) — needs Accept/Reject in POS.`).catch(() => {});
    res.json({ message: tr(req, { en: "Order sent — waiting for the counter to accept.", zh: "订单已发送——等待柜台接单。", id: "Pesanan terkirim — menunggu kasir menerima." }), order });
  });
  // Counter accepts / rejects / serves an app order item.
  app.post("/api/reborn/pos/items/:id/status", requireStaff(async (req, res) => {
    const id = Number(req.params.id);
    const status = ["accepted", "rejected", "served"].includes(req.body?.status) ? req.body.status : null;
    if (!status) return res.status(400).json({ message: tr(req, { en: "Bad status", zh: "状态无效", id: "Status tidak valid" }) });
    const [it] = await db.select().from(posTicketItems).where(eq(posTicketItems.id, id));
    if (!it) return res.status(404).json({ message: tr(req, { en: "Item not found", zh: "找不到该品项", id: "Item tidak ditemukan" }) });
    const patch: any = { status };
    if (status === "rejected") {
      patch.rejectReason = String(req.body?.reason || "").trim() || "Unavailable";
      if (it.status !== "rejected" && it.productId) { // return stock
        await db.update(posProducts).set({ stock: sql`${posProducts.stock} + ${it.qty}` }).where(and(eq(posProducts.id, it.productId), isNull(posProducts.packageKind)));
        await db.insert(stockMovements).values({ productId: it.productId, delta: it.qty, reason: "order_reject", note: `Rejected item #${id}`, userId: getUserId(req)! });
      }
    }
    if (status === "served") patch.servedAt = new Date();
    await db.update(posTicketItems).set(patch).where(eq(posTicketItems.id, id));
    await recalcTicket(it.orderId);
    const [ticket] = await db.select().from(posTickets).where(eq(posTickets.id, it.orderId));
    if (ticket?.memberId) {
      // The default reason ("Unavailable") is stored as-is; show it in the member's language.
      const reasonFor = (lang: Lang) => String(req.body?.reason || "").trim() ? patch.rejectReason : pick(lang, { en: "Unavailable", zh: "暂无供应", id: "Tidak tersedia" });
      // Telling the member must not hold up the staff screen: the tap is answered first.
      void notifyUserI18n(ticket.memberId, "order_status", (lang) => ({
        title: status === "served" ? pick(lang, { en: "Your order is served", zh: "你的餐点已上桌", id: "Pesananmu sudah disajikan" }) : status === "accepted" ? pick(lang, { en: "Order confirmed", zh: "订单已确认", id: "Pesanan dikonfirmasi" }) : pick(lang, { en: "Order item unavailable", zh: "订单中有品项暂无供应", id: "Item pesanan tidak tersedia" }),
        body: status === "rejected" ? `${it.name}: ${reasonFor(lang)}` : `${it.name} · ${status === "served" ? pick(lang, { en: "served", zh: "已上桌", id: "disajikan" }) : pick(lang, { en: "accepted", zh: "已接单", id: "diterima" })}`,
      }), { path: "/shop", ticketId: ticket.id, itemId: id, status }).catch((error) => console.error("[pos] order status notice", error));
      pushUserI18n(ticket.memberId, (lang) => {
        const label = it.name || pick(lang, { en: "Your item", zh: "你的餐点", id: "Item kamu" });
        return {
          title: status === "accepted" ? pick(lang, { en: "👨‍🍳 Order accepted", zh: "👨‍🍳 已接单", id: "👨‍🍳 Pesanan diterima" }) : status === "served" ? pick(lang, { en: "🍽️ Order served", zh: "🍽️ 已上桌", id: "🍽️ Pesanan disajikan" }) : pick(lang, { en: "😔 Item unavailable", zh: "😔 品项暂无供应", id: "😔 Item tidak tersedia" }),
          body: status === "rejected" ? `${label} — ${reasonFor(lang)}` : status === "served" ? pick(lang, { en: "{item} is on your table. Enjoy! 💜", zh: "{item} 已送到你的桌上，请慢用！💜", id: "{item} sudah ada di mejamu. Selamat menikmati! 💜" }, { item: label }) : pick(lang, { en: "{item} is being prepared.", zh: "{item} 正在准备中。", id: "{item} sedang disiapkan." }, { item: label }),
          url: "/reborn-order", tag: `order-${it.orderId}`,
        };
      }).catch(() => {});
    }
    res.json({ message: status === "rejected" ? tr(req, { en: "Rejected: {r}", zh: "已拒绝：{r}", id: "Ditolak: {r}" }, { r: String(req.body?.reason || "").trim() ? patch.rejectReason : tr(req, { en: "Unavailable", zh: "暂无供应", id: "Tidak tersedia" }) }) : status === "served" ? tr(req, { en: "Marked served", zh: "已标记为已上桌", id: "Ditandai sudah disajikan" }) : tr(req, { en: "Accepted", zh: "已接单", id: "Diterima" }) });
  }));
  // Edit an item's price and/or qty (adjusts stock for qty change; logs reason).
  app.post("/api/reborn/pos/items/:id/edit", requireStaff(async (req, res) => {
    const id = Number(req.params.id);
    const [it] = await db.select().from(posTicketItems).where(eq(posTicketItems.id, id));
    if (!it) return res.status(404).json({ message: tr(req, { en: "Item not found", zh: "找不到该品项", id: "Item tidak ditemukan" }) });
    const price = req.body?.price !== undefined ? Math.max(0, Number(req.body.price)) : Number(it.price);
    const qty = req.body?.qty !== undefined ? Math.max(1, Math.floor(Number(req.body.qty))) : it.qty;
    const dQty = qty - it.qty;
    if (dQty !== 0 && it.productId) { // keep stock in sync
      await db.update(posProducts).set({ stock: sql`${posProducts.stock} - ${dQty}` }).where(and(eq(posProducts.id, it.productId), isNull(posProducts.packageKind)));
      await db.insert(stockMovements).values({ productId: it.productId, delta: -dQty, reason: "adjustment", note: `Edit item #${id}`, userId: getUserId(req)! });
    }
    await db.update(posTicketItems).set({ price: String(price), qty, lineTotal: String(price * qty) }).where(eq(posTicketItems.id, id));
    await recalcTicket(it.orderId);
    await logAdmin(req, { targetType: "pos_item", targetId: id, action: "edit", entityType: "order", description: `Edited "${it.name}" → ${qty} × RP ${price}${req.body?.reason ? ` (${req.body.reason})` : ""}` });
    res.json({ message: tr(req, { en: "Item updated", zh: "品项已更新", id: "Item diperbarui" }) });
  }));
  // Remove an item with an optional reason (restores stock). App-ordered items are
  // marked rejected (kept visible to the customer with the reason); POS items are deleted.
  app.post("/api/reborn/pos/items/:id/remove", requireStaff(async (req, res) => {
    const id = Number(req.params.id);
    const reason = String(req.body?.reason || "").trim();
    const [it] = await db.select().from(posTicketItems).where(eq(posTicketItems.id, id));
    if (!it) return res.status(404).json({ message: tr(req, { en: "Item not found", zh: "找不到该品项", id: "Item tidak ditemukan" }) });
    if (it.status !== "rejected" && it.productId) {
      await db.update(posProducts).set({ stock: sql`${posProducts.stock} + ${it.qty}` }).where(and(eq(posProducts.id, it.productId), isNull(posProducts.packageKind)));
      await db.insert(stockMovements).values({ productId: it.productId, delta: it.qty, reason: "adjustment", note: `Removed item #${id}`, userId: getUserId(req)! });
    }
    if (it.source === "app") await db.update(posTicketItems).set({ status: "rejected", rejectReason: reason || "Removed by staff" }).where(eq(posTicketItems.id, id));
    else await db.delete(posTicketItems).where(eq(posTicketItems.id, id));
    await recalcTicket(it.orderId);
    await logAdmin(req, { targetType: "pos_item", targetId: id, action: "remove", entityType: "order", description: `Removed "${it.name}"${reason ? ` (${reason})` : ""}` });
    res.json({ message: reason ? tr(req, { en: "Removed: {r}", zh: "已移除：{r}", id: "Dihapus: {r}" }, { r: reason }) : tr(req, { en: "Item removed", zh: "品项已移除", id: "Item dihapus" }) });
  }));
  // Move one item to another table's open ticket (split a bill). Creates the ticket if needed.
  app.post("/api/reborn/pos/items/:id/move", requireStaff(async (req, res) => {
    const id = Number(req.params.id);
    const table = String(req.body?.tableNumber || "").trim();
    if (!table) return res.status(400).json({ message: tr(req, { en: "Enter a table number", zh: "请输入桌号", id: "Masukkan nomor meja" }) });
    const [it] = await db.select().from(posTicketItems).where(eq(posTicketItems.id, id));
    if (!it) return res.status(404).json({ message: tr(req, { en: "Item not found", zh: "找不到该品项", id: "Item tidak ditemukan" }) });
    let [dest] = await db.select().from(posTickets).where(and(eq(posTickets.status, "open"), eq(posTickets.tableNumber, table))).limit(1);
    if (!dest) {
      [dest] = await db.insert(posTickets).values({ orderNo: "T" + Date.now().toString(36).toUpperCase(), source: "pos", status: "open", tableNumber: table, subtotal: "0", total: "0", staffId: getUserId(req)! }).returning();
    }
    if (dest.id === it.orderId) return res.status(400).json({ message: tr(req, { en: "Item already on that table", zh: "该品项已在那张桌上", id: "Item sudah ada di meja itu" }) });
    await db.update(posTicketItems).set({ orderId: dest.id }).where(eq(posTicketItems.id, id));
    await recalcTicket(it.orderId);
    await recalcTicket(dest.id);
    await logAdmin(req, { targetType: "pos_item", targetId: id, action: "move", entityType: "order", description: `Moved "${it.name}" to table ${table}` });
    res.json({ message: tr(req, { en: "Moved to table {t}", zh: "已移至 {t} 号桌", id: "Dipindahkan ke meja {t}" }, { t: table }) });
  }));
  // Change a ticket's table number.
  app.post("/api/reborn/pos/orders/:id/table", requireStaff(async (req, res) => {
    const id = Number(req.params.id);
    const table = String(req.body?.tableNumber || "").trim();
    if (!table) return res.status(400).json({ message: tr(req, { en: "Enter a table number", zh: "请输入桌号", id: "Masukkan nomor meja" }) });
    const [o] = await db.select().from(posTickets).where(eq(posTickets.id, id));
    if (!o || o.status !== "open") return res.status(400).json({ message: tr(req, { en: "Ticket not open", zh: "该账单未开启", id: "Tagihan tidak terbuka" }) });
    await db.update(posTickets).set({ tableNumber: table }).where(eq(posTickets.id, id));
    await logAdmin(req, { targetType: "pos_order", targetId: id, action: "rename_table", entityType: "order", description: `Table ${o.tableNumber} → ${table}` });
    res.json({ message: tr(req, { en: "Table changed to {t}", zh: "桌号已改为 {t}", id: "Meja diubah menjadi {t}" }, { t: table }) });
  }));
  // Merge all items from this ticket into another open ticket, then close this one.
  app.post("/api/reborn/pos/orders/:id/merge", requireStaff(async (req, res) => {
    const id = Number(req.params.id);
    const intoId = Number(req.body?.intoId);
    if (!intoId || intoId === id) return res.status(400).json({ message: tr(req, { en: "Pick a different ticket to merge into", zh: "请选择另一张要合并的账单", id: "Pilih tagihan lain untuk digabungkan" }) });
    const [from] = await db.select().from(posTickets).where(eq(posTickets.id, id));
    const [into] = await db.select().from(posTickets).where(eq(posTickets.id, intoId));
    if (!from || !into || from.status !== "open" || into.status !== "open") return res.status(400).json({ message: tr(req, { en: "Both tickets must be open", zh: "两张账单都必须处于开启状态", id: "Kedua tagihan harus terbuka" }) });
    await db.update(posTicketItems).set({ orderId: intoId }).where(eq(posTicketItems.orderId, id));
    await db.update(posTickets).set({ status: "cancelled" }).where(eq(posTickets.id, id));
    await recalcTicket(intoId);
    await logAdmin(req, { targetType: "pos_order", targetId: id, action: "merge", entityType: "order", description: `Merged ${from.orderNo} into ${into.orderNo} (table ${into.tableNumber})` });
    res.json({ message: tr(req, { en: "Merged into table {t}", zh: "已合并到 {t} 号桌", id: "Digabungkan ke meja {t}" }, { t: String(into.tableNumber || "") }) });
  }));
  // Set a whole-bill discount with an optional reason (applied at payment).
  app.post("/api/reborn/pos/orders/:id/discount", requireStaff(async (req, res) => {
    const id = Number(req.params.id);
    const [o] = await db.select().from(posTickets).where(eq(posTickets.id, id));
    if (!o || o.status !== "open") return res.status(400).json({ message: tr(req, { en: "Ticket not open", zh: "该账单未开启", id: "Tagihan tidak terbuka" }) });
    const subtotal = Number(o.subtotal || o.total);
    let amount: number, reason: string;
    const pct = Number(req.body?.percent);
    if (req.body?.percent !== undefined && req.body?.percent !== "" && Number.isFinite(pct) && pct > 0) {
      amount = roundMoney(subtotal * Math.min(100, pct) / 100);
      reason = String(req.body?.reason || "").trim() || `${pct}% off`;
    } else {
      amount = Math.max(0, Number(req.body?.amount) || 0);
      reason = String(req.body?.reason || "").trim() || (amount ? "Discount" : "");
    }
    amount = Math.min(subtotal, amount);
    await db.update(posTickets).set({ discount: String(amount), discountReason: reason || null }).where(eq(posTickets.id, id));
    await logAdmin(req, { targetType: "pos_order", targetId: id, action: "discount", entityType: "order", description: `Discount RP ${amount}${reason ? ` (${reason})` : ""} on ${o.orderNo}` });
    res.json({ message: amount ? tr(req, { en: "Discount RP {n} set", zh: "已设置折扣 RP {n}", id: "Diskon RP {n} diterapkan" }, { n: fmtN(amount, reqLang(req)) }) : tr(req, { en: "Discount cleared", zh: "已清除折扣", id: "Diskon dihapus" }), amount });
  }));
  app.get("/api/reborn/shop/my-orders", requireAuth, async (req, res) => {
    const userId = getUserId(req)!;
    const cid = await rebornCompanyId(req);
    const rows = await db.select().from(posTickets).where(and(eq(posTickets.companyId, cid), eq(posTickets.memberId, userId))).orderBy(desc(posTickets.createdAt)).limit(20);
    const withItems = await Promise.all(rows.map(async (o) => ({ ...o, items: await db.select().from(posTicketItems).where(eq(posTicketItems.orderId, o.id)) })));
    res.json(withItems);
  });

  // Open tickets (app orders awaiting payment) for staff to close.
  app.get("/api/reborn/pos/orders", requireStaff(async (req, res) => {
    const status = String(req.query.status || "open");
    const cid = await rebornCompanyId(req);
    const rows = await db.select().from(posTickets).where(and(eq(posTickets.companyId, cid), eq(posTickets.status, status))).orderBy(desc(posTickets.createdAt)).limit(100);
    const withItems = await Promise.all(rows.map(async (o) => ({ ...o, items: await db.select().from(posTicketItems).where(eq(posTicketItems.orderId, o.id)) })));
    res.json(withItems);
  }));
  app.post("/api/reborn/pos/orders/:id/pay", requireStaff(async (req, res) => {
    const id = Number(req.params.id);
    const paymentReference = String(req.body?.paymentReference || "").trim();
    const [o] = await db.select().from(posTickets).where(eq(posTickets.id, id));
    if (!o || o.status !== "open") return res.status(400).json({ message: tr(req, { en: "Order not open", zh: "该订单未开启", id: "Pesanan tidak terbuka" }) });
    if (req.body?.paymentMethod === "credits" && !o.memberId) return res.status(400).json({ message: tr(req, { en: "Tag a member to pay with their RP credits", zh: "使用 RP 余额付款前请先标记会员", id: "Tandai member untuk membayar dengan kredit RP" }) });
    if (req.body?.keepBottle?.enabled && !o.memberId) return res.status(400).json({ message: tr(req, { en: "Tag a member before keeping a bottle at checkout", zh: "结账寄存酒瓶前请先标记会员", id: "Tandai member sebelum menitipkan botol saat pembayaran" }) });
    if (req.body?.keepBottle?.enabled && !String(req.body.keepBottle.name || "").trim()) return res.status(400).json({ message: tr(req, { en: "Enter the bottle name before payment", zh: "付款前请输入酒名", id: "Masukkan nama botol sebelum pembayaran" }) });
    const settings = await getSettings();
    const lines = (await db.select().from(posTicketItems).where(eq(posTicketItems.orderId, id))).filter((x) => x.status !== "rejected");
    // Use the request discount if provided, else the discount already set on the ticket.
    const reqDisc = req.body?.discount !== undefined ? Number(req.body.discount) : Number(o.discount || 0);
    const q = await quoteBill({ lines: lines.map((x) => ({ productId: x.productId, lineTotal: Number(x.lineTotal) })), manualDiscount: reqDisc, userId: o.memberId, usePackageCredit: !!req.body?.usePackageCredit, serviceFeePercent: settings.serviceFeePercent, taxPercent: settings.taxPercent });
    const { subtotal, discount, serviceFee, tax, total, due } = q;
    if (q.hasPackages && !o.memberId) return res.status(400).json({ message: needMemberForPackage(req) });
    const paymentMethod = due <= 0 ? "package" : posMethod(req.body?.paymentMethod);
    if (paymentMethod === "card" && !paymentReference) return res.status(400).json({ message: tr(req, { en: "Enter the card approval or receipt number", zh: "请输入刷卡授权码或小票号码", id: "Masukkan kode persetujuan kartu atau nomor struk" }) });
    const cashReceived = paymentMethod === "cash" ? Number(req.body?.cashReceived) : null;
    if (paymentMethod === "cash" && (!Number.isFinite(cashReceived) || cashReceived! < due)) return res.status(400).json({ message: tr(req, { en: "Cash received must be at least RP {n}", zh: "收到的现金至少需为 RP {n}", id: "Uang tunai yang diterima minimal RP {n}" }, { n: fmtN(due, reqLang(req)) }) });
    const changeGiven = paymentMethod === "cash" ? cashReceived! - due : null;
    const keepType = String(req.body?.keepBottle?.type || "");
    if (req.body?.keepBottle?.enabled && ["wine", "whisky"].includes(keepType) && !req.body?.keepBottle?.photoUrl) return res.status(400).json({ message: tr(req, { en: "A bottle photo is required for wine and whisky", zh: "葡萄酒和威士忌需要拍摄酒瓶照片", id: "Foto botol wajib untuk wine dan wiski" }) });
    const points = o.memberId ? Math.floor(due / await pointsSpendRp()) : 0;
    const sales = await salesTag(req.body); // optional salesperson override at checkout
    const orderMode = req.body?.orderMode === "take_away" ? "take_away" : (o.orderMode || "dine_in");
    const staffId = getUserId(req)!;
    const spent = await spendPackageCredit(o.memberId || "", q.creditUse, id, staffId);
    if (spent.spent < q.creditUse) { await restorePackageCredit(id, staffId, "Payment not completed"); return res.status(409).json({ message: packageCreditChanged(req) }); }
    if (paymentMethod === "credits") {
      const paid = await payWithCredits(o.memberId!, due, o.orderNo, id);
      if (!paid.ok) { if (spent.spent) await restorePackageCredit(id, staffId, "Payment not completed"); return res.status(400).json({ message: notEnoughCredits(req, due, paid.balance) }); }
    }
    const discountReason = q.perkAmount > 0 ? [o.discountReason, `Member ${q.perkPercent}%`].filter(Boolean).join(" · ") : o.discountReason;
    await db.update(posTickets).set({ status: "paid", paymentMethod, paymentReference: paymentReference || null, cashReceived: cashReceived === null ? null : String(cashReceived), changeGiven: changeGiven === null ? null : String(changeGiven), subtotal: String(subtotal), discount: String(discount), discountReason, serviceFee: String(serviceFee), tax: String(tax), total: String(total), packageCreditUsed: String(q.creditUse), orderMode, pointsEarned: points, staffId, paidAt: new Date(), ...sales }).where(eq(posTickets.id, id));
    if (o.memberId && points > 0)
      await db.update(users).set({ loyaltyPoints: sql`${users.loyaltyPoints} + ${points}`, lifetimePoints: sql`${users.lifetimePoints} + ${points}`, updatedAt: new Date() }).where(eq(users.id, o.memberId));
    if (paymentMethod !== "credits" && due > 0) await db.insert(ledgerEntries).values({ kind: "income", category: "product_sale", amount: String(due), note: `Order ${o.orderNo} (${paymentMethod})`, refType: "pos_order", refId: String(id), userId: o.memberId || null });
    await notifyStaffI18n("payment_completed", (lang) => ({ title: pick(lang, { en: "Payment completed · {no}", zh: "付款完成 · {no}", id: "Pembayaran selesai · {no}" }, { no: o.orderNo }), body: `RP ${fmtN(total, lang)} · ${methodLabel(paymentMethod, lang)}` }), { path: "/reborn-admin", ticketId: id });
    if (o.memberId) await notifyUserI18n(o.memberId, "order_paid", (lang) => ({ title: pick(lang, { en: "Payment completed", zh: "付款完成", id: "Pembayaran selesai" }), body: pick(lang, { en: "{no} · RP {n}. Your receipt is ready.", zh: "{no} · RP {n}。你的收据已准备好。", id: "{no} · RP {n}. Struk kamu sudah siap." }, { no: o.orderNo, n: fmtN(total, lang) }) }), { path: "/history", ticketId: id });
    const [member] = o.memberId ? await db.select().from(users).where(eq(users.id, o.memberId)).limit(1) : [];
    const keptBottle = member ? await storeBottleForMember(member, req.body?.keepBottle, staffId, reqLang(req)) : null;
    const packagesAdded = member && q.hasPackages ? await afterPackageSale(member, id, o.companyId, lines.map((x) => ({ productId: x.productId, qty: x.qty, price: x.price }))) : [];
    if (member) await notifyPerks(member.id, spent.perks);
    await logAdmin(req, { targetUserId: o.memberId || undefined, targetType: "pos_order", targetId: id, action: "close", entityType: "order", description: `Closed ${o.orderNo} RP ${total} (${paymentMethod})${q.creditUse ? ` · package credit RP ${q.creditUse}` : ""}${points ? ` · ${points} pts` : ""}` });
    if (o.memberId) {
      crmRecordVisit({ userId: o.memberId, name: o.memberName }).catch(() => {});
      sendReviewRequest({ userId: o.memberId, name: o.memberName, club: settings.clubName, reviewUrl: settings.googleReviewUrl }).catch(() => {});
    }
    contributeSpinPoolIfUnreferred(o?.memberId ?? null, due).catch(() => {});
    await freeTableAfterBill(o.companyId, o.tableNumber); // bill closed → the table's booking frees it
    const items = await db.select().from(posTicketItems).where(eq(posTicketItems.orderId, id));
    const [fresh] = await db.select().from(posTickets).where(eq(posTickets.id, id));
    res.json({ message: tr(req, { en: "Paid RP {n}", zh: "已付款 RP {n}", id: "Dibayar RP {n}" }, { n: fmtN(total, reqLang(req)) }) + paidExtras(req, { points, bottle: !!keptBottle, creditUse: q.creditUse, perkAmount: q.perkAmount, perkPercent: q.perkPercent, packages: packagesAdded.length }), order: { ...fresh, items }, bottle: keptBottle, packages: packagesAdded, receipt: { clubName: settings.clubName, logoUrl: settings.receiptLogoUrl, footer: settings.receiptFooter, serviceFeePercent: settings.serviceFeePercent, taxPercent: settings.taxPercent, autoPrint: settings.posAutoPrint } });
  }));
  app.post("/api/reborn/pos/orders/:id/cancel", requireStaff(async (req, res) => {
    const id = Number(req.params.id);
    const [o] = await db.select().from(posTickets).where(eq(posTickets.id, id));
    if (!o || o.status !== "open") return res.status(400).json({ message: tr(req, { en: "Order not open", zh: "该订单未开启", id: "Pesanan tidak terbuka" }) });
    const items = await db.select().from(posTicketItems).where(eq(posTicketItems.orderId, id));
    for (const it of items) if (it.productId) {
      await db.update(posProducts).set({ stock: sql`${posProducts.stock} + ${it.qty}` }).where(and(eq(posProducts.id, it.productId), isNull(posProducts.packageKind)));
      await db.insert(stockMovements).values({ productId: it.productId, delta: it.qty, reason: "order_cancel", note: `Cancelled ${o.orderNo}`, userId: getUserId(req)! });
    }
    await db.update(posTickets).set({ status: "cancelled" }).where(eq(posTickets.id, id));
    await logAdmin(req, { targetType: "pos_order", targetId: id, action: "cancel", entityType: "order", description: `Cancelled ${o.orderNo}, stock restored` });
    res.json({ message: tr(req, { en: "Order cancelled, stock restored", zh: "订单已取消，库存已恢复", id: "Pesanan dibatalkan, stok dikembalikan" }) });
  }));

  // ── Bottle keep (locker) ────────────────────────────────────────────────
  const bottleView = (b: any) => {
    const now = Date.now();
    const exp = b.expiresAt ? new Date(b.expiresAt).getTime() : 0;
    const daysLeft = exp ? Math.ceil((exp - now) / DAY_MS) : 0;
    const expired = b.status === "kept" && exp && exp < now;
    return { ...b, daysLeft, expired, expiringSoon: b.status === "kept" && daysLeft <= 5 && daysLeft > 0 };
  };
  // Staff store an unfinished bottle for a member (beer = quantity; whisky = photo of level).
  app.post("/api/reborn/pos/bottle-keep", requireStaff(async (req, res) => {
    const b = req.body || {};
    const u = await findMemberByCode(b.memberCode || "");
    if (!u) return res.status(404).json({ message: tr(req, { en: "Enter a valid member (code/card/username/email) to keep a bottle.", zh: "请输入有效的会员（会员码/卡号/用户名/邮箱）以寄存酒瓶。", id: "Masukkan member yang valid (kode/kartu/nama pengguna/email) untuk menitipkan botol." }) });
    const row = await storeBottleForMember(u, { ...b, enabled: true, name: String(b.name || "").trim() || "Bottle" }, getUserId(req)!, reqLang(req));
    if (!row) return res.status(400).json({ message: tr(req, { en: "Could not store bottle", zh: "无法寄存酒瓶", id: "Tidak dapat menyimpan botol" }) });
    await logAdmin(req, { targetUserId: u.id, targetType: "bottle_keep", targetId: row.id, action: "store", entityType: "bottle", description: `Kept ${row.quantity}× ${row.name} for ${row.memberName} (30 days)` });
    res.json({ message: tr(req, { en: "Stored for {name} — 30 days to collect.", zh: "已为 {name} 寄存——30 天内领取。", id: "Disimpan untuk {name} — 30 hari untuk diambil." }, { name: String(row.memberName || "") }), bottle: bottleView(row) });
  }));
  app.get("/api/reborn/pos/bottle-keeps", requireStaff(async (req, res) => {
    const q = String(req.query.q || "").trim();
    let rows = await db.select().from(bottleKeeps).where(eq(bottleKeeps.status, "kept")).orderBy(bottleKeeps.expiresAt).limit(200);
    if (q) rows = rows.filter((r) => [r.memberName, r.memberCode, r.name].some((v) => (v || "").toLowerCase().includes(q.toLowerCase())));
    res.json(rows.map(bottleView));
  }));
  app.post("/api/reborn/pos/bottle-keeps/:id/collect", requireStaff(async (req, res) => {
    const id = Number(req.params.id); const take = Math.max(1, Math.floor(Number(req.body?.quantity) || 1));
    const [b] = await db.select().from(bottleKeeps).where(eq(bottleKeeps.id, id));
    if (!b || b.status !== "kept") return res.status(400).json({ message: tr(req, { en: "Not an active kept bottle", zh: "这不是有效的寄存酒瓶", id: "Bukan botol titipan yang aktif" }) });
    const remaining = (b.quantity || 1) - take;
    if (remaining > 0) { await db.update(bottleKeeps).set({ quantity: remaining }).where(eq(bottleKeeps.id, id)); }
    else { await db.update(bottleKeeps).set({ status: "collected", quantity: 0, collectedAt: new Date() }).where(eq(bottleKeeps.id, id)); }
    await logAdmin(req, { targetUserId: b.userId || undefined, targetType: "bottle_keep", targetId: id, action: "collect", entityType: "bottle", description: `Collected ${take}× ${b.name} (${b.memberName})` });
    res.json({ message: remaining > 0 ? tr(req, { en: "Collected {n}. {r} left in keep.", zh: "已取走 {n}，寄存中还剩 {r}。", id: "Sudah diambil {n}. Sisa {r} di titipan." }, { n: take, r: remaining }) : tr(req, { en: "Collected — bottle keep closed.", zh: "已取走——寄存已结束。", id: "Sudah diambil — titipan botol ditutup." }) });
  }));
  // Member: my kept bottles + reminders.
  app.get("/api/reborn/bottles", requireAuth, async (req, res) => {
    const userId = getUserId(req)!;
    const rows = await db.select().from(bottleKeeps).where(and(eq(bottleKeeps.userId, userId), eq(bottleKeeps.status, "kept"))).orderBy(bottleKeeps.expiresAt);
    res.json(rows.map(bottleView));
  });

  // ── Packages: quote a bill, look up / list / use a member's packages ──
  // The bill with the member's perk and package credit, for the POS pay panel.
  app.post("/api/reborn/pos/quote", requireStaff(async (req, res) => {
    const settings = await getSettings();
    let lines: { productId?: number | null; lineTotal: number }[] = [];
    let userId: string | null = null;
    if (req.body?.ticketId) {
      const [o] = await db.select().from(posTickets).where(eq(posTickets.id, Number(req.body.ticketId)));
      if (!o) return res.status(404).json({ message: tr(req, { en: "Order not found", zh: "找不到该订单", id: "Pesanan tidak ditemukan" }) });
      lines = (await db.select().from(posTicketItems).where(eq(posTicketItems.orderId, o.id))).filter((x) => x.status !== "rejected").map((x) => ({ productId: x.productId, lineTotal: Number(x.lineTotal) }));
      userId = o.memberId;
    } else {
      lines = (Array.isArray(req.body?.items) ? req.body.items : []).map((it: any) => ({ productId: Number(it.productId) || null, lineTotal: (Number(it.price) || 0) * Math.max(1, Math.floor(Number(it.qty) || 1)) }));
      userId = (await findMemberByCode(req.body?.memberCode || ""))?.id || null;
    }
    const q = await quoteBill({ lines, manualDiscount: Number(req.body?.discount) || 0, userId, usePackageCredit: !!req.body?.usePackageCredit, serviceFeePercent: settings.serviceFeePercent, taxPercent: settings.taxPercent });
    res.json({ ...q, hasMember: !!userId });
  }));
  // A member's packages (by member code) — POS pay panel and Packages tab.
  app.get("/api/reborn/pos/member-packages", requireStaff(async (req, res) => {
    const u = await findMemberByCode(String(req.query.code || ""));
    if (!u) return res.status(404).json({ message: tr(req, { en: "Member not found", zh: "找不到该会员", id: "Member tidak ditemukan" }) });
    res.json({ member: { id: u.id, name: memberTag(u).memberName, code: u.referralCode }, ...(await memberWallet(u.id)) });
  }));
  app.get("/api/reborn/pos/packages", requireStaff(async (req, res) => {
    res.json(await listActivePackages(String(req.query.q || "")));
  }));
  // Take visits from a member's package; with an open ticket it also shows on the bill (RP 0).
  app.post("/api/reborn/pos/packages/:id/use", requireStaff(async (req, res) => {
    const id = Number(req.params.id);
    const n = Math.max(1, Math.floor(Number(req.body?.uses) || 1));
    const ticketId = Number(req.body?.ticketId) || null;
    const [ticket] = ticketId ? await db.select().from(posTickets).where(eq(posTickets.id, ticketId)) : [];
    if (ticketId && (!ticket || ticket.status !== "open")) return res.status(400).json({ message: tr(req, { en: "Ticket not open", zh: "该账单未开启", id: "Tagihan tidak terbuka" }) });
    const after = await takePackageUses(id, n, getUserId(req)!, ticketId);
    if (!after) return res.status(400).json({ message: tr(req, { en: "Not enough visits left on this package (or it has expired)", zh: "该套餐剩余次数不足（或已过期）", id: "Sisa kunjungan paket ini tidak cukup (atau sudah kedaluwarsa)" }) });
    if (ticket) {
      await db.insert(posTicketItems).values({ orderId: ticket.id, productId: null, name: `${after.name} · ${tr(req, { en: "package", zh: "套餐", id: "paket" })} (${after.usesLeft}/${after.usesTotal})`, price: "0", qty: n, lineTotal: "0", status: "accepted", source: "pos" });
      emitLiveUpdate("/api/reborn/pos/orders", { action: "PACKAGE_USE", resource: String(ticket.id) });
    }
    await notifyUserI18n(after.userId, "package_used", (lang) => ({
      title: pick(lang, { en: "{name}: {n} used", zh: "{name}：已使用 {n} 次", id: "{name}: {n} dipakai" }, { name: after.name, n }),
      body: pick(lang, { en: "{left} of {total} left.", zh: "剩余 {left}/{total} 次。", id: "Sisa {left} dari {total}." }, { left: after.usesLeft, total: after.usesTotal }),
    }), { path: "/bottles" });
    await logAdmin(req, { targetUserId: after.userId, targetType: "member_package", targetId: String(id), action: "use", entityType: "package", description: `Used ${n}× ${after.name} for ${after.memberName} (${after.usesLeft}/${after.usesTotal} left)` });
    res.json({ message: tr(req, { en: "Used {n} — {left} of {total} left", zh: "已使用 {n} 次——剩余 {left}/{total}", id: "Dipakai {n} — sisa {left} dari {total}" }, { n, left: after.usesLeft, total: after.usesTotal }), package: after });
  }));
  // Member: my packages, package credit and perk.
  app.get("/api/reborn/my-packages", requireAuth, async (req, res) => {
    res.json(await memberWallet(getUserId(req)!));
  });

  // Accounting — money in/out summary + ledger (admin only).
  app.get("/api/reborn/admin/accounting/summary", requireAdmin(async (req, res) => {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const since = new Date(Date.now() - days * DAY_MS);
    const rows = await db.select().from(ledgerEntries).where(and(sql`${ledgerEntries.createdAt} >= ${since}`, sql`${ledgerEntries.refType} IS DISTINCT FROM 'pos_closing'`));
    const byCat: Record<string, number> = {};
    let income = 0, expense = 0, cogs = 0;
    for (const r of rows) {
      const amt = Number(r.amount);
      if (r.kind === "income") income += amt; else { expense += amt; if (r.category === "purchase") cogs += amt; }
      byCat[r.kind + ":" + r.category] = (byCat[r.kind + ":" + r.category] || 0) + amt;
    }
    // revenue = income; COGS = stock purchases; grossProfit = revenue - COGS; net = revenue - all expenses.
    res.json({ days, income, expense, revenue: income, cogs, grossProfit: income - cogs, otherExpense: expense - cogs, net: income - expense, byCategory: byCat, count: rows.length, spinPool: await getSpinPool() });
  }));
  app.get("/api/reborn/admin/accounting/ledger", requireAdmin(async (req, res) => {
    const limit = Math.min(500, Number(req.query.limit) || 100);
    res.json(await db.select().from(ledgerEntries).orderBy(desc(ledgerEntries.createdAt)).limit(limit));
  }));
  app.get("/api/reborn/pos/settings", requireStaff(async (_req, res) => {
    const settings = await getSettings();
    res.json({ taxPercent: settings.taxPercent, serviceFeePercent: settings.serviceFeePercent });
  }));
  app.get("/api/reborn/admin/accounting/closings", requireAdmin(async (req, res) => {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const since = new Date(Date.now() - days * DAY_MS);
    const rows = await db.select().from(ledgerEntries).where(and(eq(ledgerEntries.refType, "pos_closing"), sql`${ledgerEntries.createdAt} >= ${since}`)).orderBy(desc(ledgerEntries.createdAt));
    res.json(rows.map((row) => { try { return { id: row.id, ...JSON.parse(row.note || "{}") }; } catch { return null; } }).filter(Boolean));
  }));
  // Commission: paid sales grouped by salesperson (staff credited on each ticket).
  app.get("/api/reborn/admin/accounting/commission", requireAdmin(async (req, res) => {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const since = new Date(Date.now() - days * DAY_MS);
    const rate = Number(req.query.rate) || 0; // optional commission % for a quick payout estimate
    const rows = await db.select().from(posTickets).where(and(eq(posTickets.status, "paid"), sql`${posTickets.paidAt} >= ${since}`));
    const byStaff: Record<string, { name: string; sales: number; tickets: number }> = {};
    for (const t of rows) {
      const key = t.salesStaffName || tr(req, { en: "Unassigned", zh: "未分配", id: "Belum ditentukan" });
      byStaff[key] ||= { name: key, sales: 0, tickets: 0 };
      byStaff[key].sales += Number(t.total); byStaff[key].tickets += 1;
    }
    const list = Object.values(byStaff).sort((a, b) => b.sales - a.sales)
      .map((s) => ({ ...s, commission: roundMoney(s.sales * rate / 100) }));
    res.json({ days, rate, staff: list });
  }));
  // Record a commission payout as an RP cash expense (not app credits) — tracked in the ledger + admin log.
  app.post("/api/reborn/admin/accounting/commission/pay", requireAdmin(async (req, res) => {
    const name = String(req.body?.staffName || "").trim();
    const amount = roundMoney(Number(req.body?.amount) || 0);
    if (!name || amount <= 0) return res.status(400).json({ message: tr(req, { en: "Staff and amount required", zh: "请填写员工和金额", id: "Staf dan jumlah wajib diisi" }) });
    const [row] = await db.insert(ledgerEntries).values({ kind: "expense", category: "commission", amount: String(amount), note: `Commission paid to ${name} (RP)`, userId: getUserId(req)! }).returning();
    await logAdmin(req, { targetType: "ledger", targetId: row.id, action: "pay_commission", entityType: "accounting", description: `Paid commission RP ${amount} to ${name}` });
    res.json({ message: tr(req, { en: "Paid RP {n} commission to {name}.", zh: "已向 {name} 支付佣金 RP {n}。", id: "Komisi RP {n} dibayarkan kepada {name}." }, { n: fmtN(amount, reqLang(req)), name }) });
  }));
  app.post("/api/reborn/admin/accounting/entry", requireAdmin(async (req, res) => {
    const b = req.body || {};
    const amount = Number(b.amount) || 0;
    if (amount <= 0) return res.status(400).json({ message: tr(req, { en: "Enter an amount", zh: "请输入金额", id: "Masukkan jumlah" }) });
    const kind = b.kind === "expense" ? "expense" : "income";
    const [row] = await db.insert(ledgerEntries).values({ kind, category: b.category || "other", amount: String(amount), note: b.note || null, photoUrl: b.photoUrl || null, userId: getUserId(req)! }).returning();
    await logAdmin(req, { targetType: "ledger", targetId: row.id, action: "manual_entry", entityType: "accounting", description: `${kind} RP ${amount} (${row.category})` });
    res.json(row);
  }));

  app.get("/api/reborn/admin/accounting/orders", requireAdmin(async (req, res) => {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const since = new Date(Date.now() - days * DAY_MS);
    const cid = await rebornCompanyId(req);
    const rows = await db.select().from(posTickets).where(and(eq(posTickets.companyId, cid), inArray(posTickets.status, ["paid", "refunded"]), sql`${posTickets.paidAt} >= ${since}`)).orderBy(desc(posTickets.paidAt)).limit(300);
    const prodRows = await db.select({ id: posProducts.id, department: posProducts.department }).from(posProducts).where(eq(posProducts.companyId, cid));
    const depMap = new Map(prodRows.map((p) => [p.id, p.department]));
    const result = await Promise.all(rows.map(async (order) => {
      const items = await db.select().from(posTicketItems).where(eq(posTicketItems.orderId, order.id));
      return { ...order, items: items.map((it) => ({ ...it, department: it.productId ? (depMap.get(it.productId) || null) : null })) };
    }));
    res.json(result);
  }));
  // Revenue split per industry/department (product.department) for the period.
  app.get("/api/reborn/admin/accounting/by-industry", requireAdmin(async (req, res) => {
    const cid = await rebornCompanyId(req);
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const since = new Date(Date.now() - days * DAY_MS).toISOString();
    // A product can belong to several industries (comma-separated department), so unnest it —
    // a shared item's revenue is credited to each industry it serves.
    const rows = await db.execute(sql`
      SELECT COALESCE(NULLIF(TRIM(ind),''),'Unassigned') industry,
             COALESCE(SUM(pi.line_total),0) revenue, COUNT(DISTINCT tk.id) orders, COALESCE(SUM(pi.qty),0) items
      FROM pos_ticket_items pi
      JOIN pos_tickets tk ON tk.id=pi.order_id AND tk.status='paid' AND tk.company_id=${cid} AND tk.paid_at >= ${since}
      LEFT JOIN pos_products p ON p.id=pi.product_id
      LEFT JOIN LATERAL unnest(CASE WHEN COALESCE(p.department,'')='' THEN ARRAY['Unassigned'] ELSE string_to_array(p.department, ',') END) AS ind ON true
      GROUP BY 1 ORDER BY revenue DESC`);
    res.json((rows.rows || rows as any[]).map((r: any) => ({ industry: r.industry === "Unassigned" ? tr(req, { en: "Unassigned", zh: "未分配", id: "Belum ditentukan" }) : r.industry, revenue: Number(r.revenue), orders: Number(r.orders), items: Number(r.items) })));
  }));

  // Shared refund core: restores stock, reverses loyalty points, marks the ticket refunded
  // and books the expense. Returns the HTTP status + body plus the order for the audit log.
  const doPosRefund = async (id: number, reason: string, actorId: string, req: Request) => {
    const [order] = await db.select().from(posTickets).where(eq(posTickets.id, id));
    if (!order || order.status !== "paid") return { status: 400 as const, body: { message: tr(req, { en: "Only a paid bill can be refunded", zh: "只有已付款的账单才能退款", id: "Hanya tagihan yang sudah dibayar yang bisa di-refund" }) }, order: null as any };
    const items = await db.select().from(posTicketItems).where(eq(posTicketItems.orderId, id));
    for (const item of items.filter((x) => x.status !== "rejected" && x.productId)) {
      await db.update(posProducts).set({ stock: sql`${posProducts.stock} + ${item.qty}` }).where(and(eq(posProducts.id, item.productId!), isNull(posProducts.packageKind)));
      await db.insert(stockMovements).values({ productId: item.productId!, delta: item.qty, reason: "refund", note: `Refund ${order.orderNo}: ${reason}`, userId: actorId });
    }
    if (order.memberId && order.pointsEarned > 0) await db.update(users).set({ loyaltyPoints: sql`greatest(0,${users.loyaltyPoints}-${order.pointsEarned})`, lifetimePoints: sql`greatest(0,${users.lifetimePoints}-${order.pointsEarned})`, updatedAt: new Date() }).where(eq(users.id, order.memberId));
    const [updated] = await db.update(posTickets).set({ status: "refunded", refundReason: reason, refundedBy: actorId, refundedAt: new Date() }).where(eq(posTickets.id, id)).returning();
    // Package credit used on the bill goes back to the member's packages; packages bought on it are closed.
    await restorePackageCredit(id, actorId, `Refund ${order.orderNo}: ${reason}`);
    await refundPackagesOfTicket(id);
    const paidAmount = Number(order.total) - Number(order.packageCreditUsed || 0); // what was paid in cash / card / RP credits
    if (order.paymentMethod === "credits" && order.memberId) {
      // Paid from RP credits → give the credits back (no cash left the till).
      await db.update(users).set({ credits: sql`${users.credits} + ${paidAmount}`, updatedAt: new Date() }).where(eq(users.id, order.memberId));
      await db.insert(memberWalletTransactions).values({ userId: order.memberId, type: "pos_refund", rpAmount: String(paidAmount), kgoldAmount: 0, description: `Refund ${order.orderNo}: ${reason}`, referenceType: "pos_order", referenceId: String(id) });
    } else if (paidAmount > 0) await db.insert(ledgerEntries).values({ kind: "expense", category: "refund", amount: String(paidAmount), note: `Refund ${order.orderNo}: ${reason}`, refType: "pos_refund", refId: String(id), userId: order.memberId || null });
    return { status: 200 as const, body: { message: tr(req, { en: "{no} refunded and stock restored", zh: "{no} 已退款，库存已恢复", id: "{no} di-refund dan stok dikembalikan" }, { no: order.orderNo }), order: { ...updated, items } }, order };
  };
  app.post("/api/reborn/admin/accounting/orders/:id/refund", requireAdmin(async (req, res) => {
    const id = Number(req.params.id); const reason = String(req.body?.reason || "").trim();
    if (!reason) return res.status(400).json({ message: tr(req, { en: "A refund reason is required", zh: "请填写退款原因", id: "Alasan refund wajib diisi" }) });
    const r = await doPosRefund(id, reason, getUserId(req)!, req);
    if (r.status !== 200) return res.status(r.status).json(r.body);
    await logAdmin(req, { targetType: "pos_order", targetId: String(id), action: "refund", entityType: "accounting", description: `Refunded ${r.order.orderNo} RP ${Number(r.order.total)}: ${reason}` });
    res.json(r.body);
  }));
  // POS-floor refund: staff can refund a paid bill from POS while its business day is still open.
  app.post("/api/reborn/pos/orders/:id/refund", requireStaff(async (req, res) => {
    const id = Number(req.params.id); const reason = String(req.body?.reason || "").trim();
    if (!reason) return res.status(400).json({ message: tr(req, { en: "A refund reason is required", zh: "请填写退款原因", id: "Alasan refund wajib diisi" }) });
    const cid = await rebornCompanyId(req);
    const [order] = await db.select().from(posTickets).where(and(eq(posTickets.id, id), eq(posTickets.companyId, cid)));
    if (!order || order.status !== "paid") return res.status(400).json({ message: tr(req, { en: "Only a paid bill can be refunded", zh: "只有已付款的账单才能退款", id: "Hanya tagihan yang sudah dibayar yang bisa di-refund" }) });
    const day = wibDay(new Date(new Date(order.paidAt || order.createdAt || Date.now()).getTime() - VENUE_DAY_START_HOUR * 3600_000)); // its venue day (8am start)
    const [closed] = await db.select().from(ledgerEntries).where(and(eq(ledgerEntries.refType, "pos_closing"), eq(ledgerEntries.refId, day))).limit(1);
    if (closed) return res.status(400).json({ message: tr(req, { en: "That day is already closed — ask an admin to refund it from Accounting.", zh: "该营业日已结账——请让管理员在会计中退款。", id: "Hari itu sudah ditutup — minta admin melakukan refund dari Akuntansi." }) });
    const r = await doPosRefund(id, reason, getUserId(req)!, req);
    if (r.status !== 200) return res.status(r.status).json(r.body);
    await logAdmin(req, { targetType: "pos_order", targetId: String(id), action: "refund", entityType: "accounting", description: `POS refund ${r.order.orderNo} RP ${Number(r.order.total)}: ${reason}` });
    emitLiveUpdate("/api/reborn/pos/orders", { action: "REFUND", resource: String(id) });
    res.json(r.body);
  }));

  app.post("/api/reborn/admin/accounting/orders/:id/edit", requireAdmin(async (req, res) => {
    const id=Number(req.params.id); const reason=String(req.body?.reason||"").trim();
    if (!reason) return res.status(400).json({message:tr(req, { en: "A dispute/edit reason is required", zh: "请填写争议/修改原因", id: "Alasan sengketa/perubahan wajib diisi" })});
    const [order]=await db.select().from(posTickets).where(eq(posTickets.id,id));
    if (!order || order.status!=="paid") return res.status(400).json({message:tr(req, { en: "Only a paid bill can be edited", zh: "只有已付款的账单才能修改", id: "Hanya tagihan yang sudah dibayar yang bisa diubah" })});
    const current=await db.select().from(posTicketItems).where(eq(posTicketItems.orderId,id));
    const requested=Array.isArray(req.body?.items)?req.body.items:[];
    for (const change of requested) {
      const old=current.find((x)=>x.id===Number(change.id)); if(!old || old.status==="rejected") continue;
      const qty=Math.max(1,Math.floor(Number(change.qty)||1)); const price=Math.max(0,Number(change.price)||0); const delta=qty-old.qty;
      if(delta>0 && old.productId){ const [p]=await db.select().from(posProducts).where(eq(posProducts.id,old.productId)); if(!p || p.stock<delta) return res.status(400).json({message:tr(req, { en: "Not enough {item} stock for that edit", zh: "{item} 库存不足，无法这样修改", id: "Stok {item} tidak cukup untuk perubahan itu" }, { item: old.name })}); }
      if(delta!==0 && old.productId){ await db.update(posProducts).set({stock:sql`${posProducts.stock}-${delta}`}).where(and(eq(posProducts.id,old.productId), isNull(posProducts.packageKind))); await db.insert(stockMovements).values({productId:old.productId,delta:-delta,reason:"bill_edit",note:`${order.orderNo}: ${reason}`,userId:getUserId(req)!}); }
      await db.update(posTicketItems).set({qty,price:String(price),lineTotal:String(qty*price)}).where(eq(posTicketItems.id,old.id));
    }
    const freshItems=await db.select().from(posTicketItems).where(eq(posTicketItems.orderId,id));
    const subtotal=freshItems.filter((x)=>x.status!=="rejected").reduce((s,x)=>s+Number(x.lineTotal),0);
    const discount=Math.min(subtotal,Math.max(0,Number(req.body?.discount ?? order.discount)||0));
    const serviceFee=Math.max(0,Number(req.body?.serviceFee ?? order.serviceFee)||0); const tax=Math.max(0,Number(req.body?.tax ?? order.tax)||0); const total=subtotal-discount+serviceFee+tax;
    const method=req.body?.paymentMethod==="card"?"card":req.body?.paymentMethod==="cash"?"cash":order.paymentMethod;
    const ref=String(req.body?.paymentReference ?? order.paymentReference ?? "").trim(); if(method==="card"&&!ref)return res.status(400).json({message:tr(req, { en: "Card receipt/reference number is required", zh: "请填写刷卡小票/参考号", id: "Nomor struk/referensi kartu wajib diisi" })});
    const cash=method==="cash"?Number(req.body?.cashReceived ?? order.cashReceived ?? total):null; if(method==="cash"&&cash!<total)return res.status(400).json({message:tr(req, { en: "Cash received cannot be below the edited total", zh: "收到的现金不能少于修改后的总额", id: "Uang tunai yang diterima tidak boleh kurang dari total yang diubah" })});
    const diff=total-Number(order.total); if(diff!==0)await db.insert(ledgerEntries).values({kind:diff>0?"income":"expense",category:"bill_adjustment",amount:String(Math.abs(diff)),note:`Bill edit ${order.orderNo}: ${reason}`,refType:"pos_adjustment",refId:String(id),userId:order.memberId||null});
    const [updated]=await db.update(posTickets).set({subtotal:String(subtotal),discount:String(discount),serviceFee:String(serviceFee),tax:String(tax),total:String(total),paymentMethod:method,paymentReference:ref||null,cashReceived:cash===null?null:String(cash),changeGiven:cash===null?null:String(cash-total),adjustmentReason:reason}).where(eq(posTickets.id,id)).returning();
    await logAdmin(req,{targetType:"pos_order",targetId:String(id),action:"edit_paid_bill",entityType:"accounting",description:`Edited ${order.orderNo}: ${reason}; RP ${Number(order.total)} → ${total}`});
    res.json({message:tr(req, { en: "Bill updated with an audit record", zh: "账单已更新并留有审计记录", id: "Tagihan diperbarui dengan catatan audit" }),order:{...updated,items:freshItems}});
  }));

  // App design (shared/appSkins.ts): the company's main admin picks it here in the app; the
  // BridgeX console's White label sets the same value (bridge_companies.theme.skin).
  app.get("/api/reborn/admin/app-skin", requireAdmin(async(_req,res)=>{const [c]=await db.select({theme:bridgeCompanies.theme}).from(bridgeCompanies).where(eq(bridgeCompanies.slug,homeCompanySlug())).limit(1);const th=(c?.theme as any)||{};res.json({skin:th.skin||DEFAULT_APP_SKIN,palette:th.palette||"",colours:cleanAppColours(th.colours),font:isAppFont(th.font)?th.font:""});}));
  app.post("/api/reborn/admin/app-skin", requireAdmin(async(req,res)=>{
    const skin=String(req.body?.skin||"");
    if(!isAppSkin(skin))return res.status(400).json({message:tr(req,{en:"Unknown app design",zh:"未知的应用设计",id:"Desain aplikasi tidak dikenal"})});
    const [c]=await db.select({id:bridgeCompanies.id,theme:bridgeCompanies.theme}).from(bridgeCompanies).where(eq(bridgeCompanies.slug,homeCompanySlug())).limit(1);
    if(!c)return res.status(404).json({message:tr(req,{en:"Company not found",zh:"找不到该公司",id:"Perusahaan tidak ditemukan"})});
    const before=(c.theme as any)?.skin||DEFAULT_APP_SKIN;
    // The colour is chosen apart from the design; none = the design's own colour.
    // "custom" = the admin's own four colours (theme.colours); the lettering is optional too ("" = the design's own).
    const palette=isPaletteChoice(req.body?.palette)?req.body.palette:"";
    const colours=palette===CUSTOM_PALETTE?(cleanAppColours(req.body?.colours)||DEFAULT_CUSTOM_COLOURS):null;
    const font=isAppFont(req.body?.font)?req.body.font:"";
    const old:any=(c.theme as any)||{};
    const theme:any={...old,skin};
    if(palette)theme.palette=palette;else delete theme.palette;
    if(colours)theme.colours=colours;else delete theme.colours;
    if(font)theme.font=font;else delete theme.font;
    await db.update(bridgeCompanies).set({theme,updatedAt:new Date()}).where(eq(bridgeCompanies.id,c.id));
    await logAdmin(req,{targetType:"settings",targetId:"appSkin",action:"change_app_design",entityType:"settings",oldValues:{skin:before,palette:old.palette||"",colours:old.colours||null,font:old.font||""},newValues:{skin,palette,colours,font},description:`App design ${before} → ${skin}${palette?` · colour ${palette}`:""}${font?` · font ${font}`:""}`});
    res.json({message:tr(req,{en:"App design saved — members see it the next time they open the app",zh:"应用设计已保存——会员下次打开应用时可见",id:"Desain aplikasi disimpan — member melihatnya saat membuka aplikasi lagi"}),skin,palette,colours,font});
  }));
  // Statutory contributions (CPF / BPJS / EPF…): the company's country rates, editable by the admin.
  const payrollRules=async()=>{const [row]=await db.select().from(appSettings).where(eq(appSettings.key,"payrollRules"));let saved:any=null;try{saved=row?.value?JSON.parse(row.value):null}catch{}return saved?cleanPayrollRules(saved,companyCountry()):defaultPayrollRules(companyCountry());};
  app.get("/api/reborn/admin/payroll/rules", requireAdmin(async(_req,res)=>{res.json({rules:await payrollRules(),country:companyCountry(),money:companyMoney(),defaults:defaultPayrollRules(companyCountry())});}));
  app.post("/api/reborn/admin/payroll/rules", requireAdmin(async(req,res)=>{
    const rules=req.body?.reset?defaultPayrollRules(companyCountry()):cleanPayrollRules(req.body?.rules,companyCountry());
    const value=JSON.stringify(rules);
    await db.insert(appSettings).values({key:"payrollRules",value,updatedAt:new Date()}).onConflictDoUpdate({target:appSettings.key,set:{value,updatedAt:new Date()}});
    await logAdmin(req,{targetType:"settings",targetId:"payrollRules",action:"update_payroll_rules",entityType:"accounting",description:`Statutory contribution rates (${rules.country}) changed`});
    res.json({message:tr(req,{en:"Contribution rates saved",zh:"缴费比例已保存",id:"Tarif iuran disimpan"}),rules});
  }));
  app.get("/api/reborn/admin/payroll", requireAdmin(async (req,res)=>{
    const month=String(req.query.month||new Date().toISOString().slice(0,7)); const from=`${month}-01`; const to=new Date(new Date(`${from}T00:00:00Z`).setUTCMonth(new Date(`${from}T00:00:00Z`).getUTCMonth()+1)).toISOString().slice(0,10);
    const reborn=(await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.slug,homeCompanySlug())).limit(1))[0]; if(!reborn)return res.json({month,staff:[],referrals:[]});
    const otRate=(await getSettings()).overtimeHourlyRate;
    const result=await db.execute(sql`SELECT m.user_id,COALESCE(NULLIF(trim(concat(u.first_name,' ',u.last_name)),''),u.email) name,m.role,p.employment_type,p.pay_type,COALESCE(p.base_salary,0) base_salary,COALESCE(p.hourly_rate,0) hourly_rate,COALESCE(p.commission_rate,0) commission_rate,COALESCE(p.sales_target,0) sales_target,p.birth_date,COALESCE(p.residency,'citizen') residency,COALESCE(p.statutory_on,true) statutory_on,COALESCE(a.hours,0) hours,COALESCE(a.ot_hours,0) ot_hours,COALESCE(s.sales,0) sales,COALESCE(s.tickets,0) tickets FROM bridge_company_members m JOIN users u ON u.id=m.user_id LEFT JOIN bridge_staff_profiles p ON p.company_id=m.company_id AND p.user_id=m.user_id LEFT JOIN (SELECT user_id,sum(greatest(extract(epoch from(check_out_at-check_in_at))-coalesce(break_seconds,0),0)/3600) hours,sum(coalesce(overtime_seconds,0)/3600.0) ot_hours FROM staff_attendance WHERE status IN ('approved','present') AND work_date>=${from} AND work_date<${to} AND check_out_at IS NOT NULL GROUP BY user_id)a ON a.user_id=m.user_id LEFT JOIN (SELECT sales_staff_id,sum(total::numeric) sales,count(*) tickets FROM pos_tickets WHERE status='paid' AND paid_at>=${new Date(from+"T00:00:00Z")} AND paid_at<${new Date(to+"T00:00:00Z")} GROUP BY sales_staff_id)s ON s.sales_staff_id=m.user_id WHERE m.company_id=${reborn.id} AND m.role IN ('owner','admin','manager','staff') ORDER BY name`);
    const rules=await payrollRules(); const money=companyMoney();
    const staff=((result.rows||result) as any[]).map((x)=>{const basic=roundMoney(x.pay_type==="hourly"?Number(x.hourly_rate)*Number(x.hours):Number(x.base_salary));const salesCommission=roundMoney(Number(x.sales)*Number(x.commission_rate)/100);const overtimePay=roundMoney(Number(x.ot_hours)*otRate);const total=roundMoney(basic+salesCommission+overtimePay);return{...x,basic,salesCommission,overtimePay,otRate,total,contributions:computeContributions(rules,total,{birthDate:x.birth_date,residency:x.residency,statutoryOn:x.statutory_on},month,money.decimals),targetHit:Number(x.sales)>=Number(x.sales_target)&&Number(x.sales_target)>0};});
    const refs=await db.execute(sql`SELECT c.introducer_id,COALESCE(NULLIF(trim(concat(u.first_name,' ',u.last_name)),''),u.email) name,count(*) referrals,sum(c.transaction_amount::numeric) referred_sales,sum(c.commission_amount::numeric) commission FROM commission_history c JOIN users u ON u.id=c.introducer_id WHERE c.status='completed' AND c.created_at>=${new Date(from+"T00:00:00Z")} AND c.created_at<${new Date(to+"T00:00:00Z")} GROUP BY c.introducer_id,u.first_name,u.last_name,u.email ORDER BY commission DESC`);
    res.json({month,from,to,staff,referrals:refs.rows||refs,rules,money,country:companyCountry()});
  }));
  app.post("/api/reborn/admin/payroll/profile", requireAdmin(async(req,res)=>{const b=req.body||{};const reborn=(await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.slug,homeCompanySlug())).limit(1))[0];if(!reborn)return res.status(404).json({message:tr(req, { en: "Company not found", zh: "找不到该公司", id: "Perusahaan tidak ditemukan" })});const values={companyId:reborn.id,userId:String(b.userId),payType:b.payType==="hourly"?"hourly":"salary",employmentType:b.employmentType||"full_time",baseSalary:String(Math.max(0,Number(b.baseSalary)||0)),hourlyRate:String(Math.max(0,Number(b.hourlyRate)||0)),commissionRate:String(Math.max(0,Number(b.commissionRate)||0)),salesTarget:String(Math.max(0,Number(b.salesTarget)||0)),birthDate:/^\d{4}-\d{2}-\d{2}$/.test(String(b.birthDate||""))?String(b.birthDate):null,residency:asResidency(b.residency),statutoryOn:b.statutoryOn!==false,updatedAt:new Date()};const[row]=await db.insert(bridgeStaffProfiles).values(values).onConflictDoUpdate({target:[bridgeStaffProfiles.companyId,bridgeStaffProfiles.userId],set:values}).returning();res.json(row);}));
  // Record a month's pay: the gross salary as an expense, plus the employer's statutory
  // contributions (CPF / BPJS…) as their own expense. The employee's share is part of the
  // gross: it is withheld from the staff member and paid to the fund with the employer's.
  app.post("/api/reborn/admin/payroll/pay", requireAdmin(async(req,res)=>{
    const b=req.body||{};const amount=roundMoney(Math.max(0,Number(b.amount)||0));const month=String(b.month||"");const userId=String(b.userId||"");
    if(!amount||!/^\d{4}-\d{2}$/.test(month)||!userId)return res.status(400).json({message:tr(req, { en: "Staff, month and amount are required", zh: "请填写员工、月份和金额", id: "Staf, bulan, dan jumlah wajib diisi" })});
    const existing=await db.select().from(ledgerEntries).where(and(eq(ledgerEntries.refType,"payroll"),eq(ledgerEntries.refId,`${userId}:${month}`))).limit(1);
    if(existing.length)return res.status(409).json({message:tr(req, { en: "This staff payroll has already been recorded for the month", zh: "该员工本月的工资已记录", id: "Gaji staf ini sudah dicatat untuk bulan tersebut" })});
    const company=(await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.slug,homeCompanySlug())).limit(1))[0];
    const [profile]=company?await db.select().from(bridgeStaffProfiles).where(and(eq(bridgeStaffProfiles.companyId,company.id),eq(bridgeStaffProfiles.userId,userId))).limit(1):[];
    const c=computeContributions(await payrollRules(),amount,{birthDate:profile?.birthDate,residency:profile?.residency,statutoryOn:profile?.statutoryOn},month,companyMoney().decimals);
    const parts=c.lines.map((l)=>`${(l.label||l.code).toUpperCase()} ee ${l.ee} / er ${l.er}`).join(", ");
    const [row]=await db.insert(ledgerEntries).values({kind:"expense",category:"salary",amount:String(amount),note:`Payroll ${b.name||userId} · ${month} · gross ${amount}, staff contributions ${c.employee}, net pay ${c.net}${parts?` (${parts})`:""}`,refType:"payroll",refId:`${userId}:${month}`,userId}).returning();
    if(c.employer>0)await db.insert(ledgerEntries).values({kind:"expense",category:"statutory_contribution",amount:String(c.employer),note:`Employer contributions ${b.name||userId} · ${month}${parts?` (${parts})`:""}`,refType:"payroll_employer",refId:`${userId}:${month}`,userId});
    await logAdmin(req,{targetType:"payroll",targetId:`${userId}:${month}`,action:"record_payroll",entityType:"accounting",description:`Payroll ${b.name||userId} ${month}: gross ${amount}, net ${c.net}, employer ${c.employer}`});
    res.json({message:tr(req, { en: "Payroll recorded: net pay {net}, staff contributions {ee}, company contributions {er}", zh: "工资已记录：实发 {net}，员工缴费 {ee}，公司缴费 {er}", id: "Gaji dicatat: gaji bersih {net}, iuran staf {ee}, iuran perusahaan {er}" },{net:formatMoneyIn(companyMoney(),c.net),ee:formatMoneyIn(companyMoney(),c.employee),er:formatMoneyIn(companyMoney(),c.employer)}),row,contributions:c});
  }));

  // White-label feature flags — read the club's enabled modules from the
  // BridgeX company config so the app/admin only show ticked functions.
  app.get("/api/reborn/modules", async (req, res) => {
    try {
      // Tenant-aware: resolve the business for this request (header/domain, default Reborn).
      const company = await rebornCompany(req);
      const rows: any = company ? await db.execute(sql`SELECT module_key, enabled FROM bridge_company_modules WHERE company_id=${company.id}`) : { rows: [] };
      const list = rows.rows || rows;
      const modules: Record<string, boolean> = {};
      for (const r of list) modules[r.module_key] = r.enabled !== false;
      res.json({ modules });
    } catch { res.json({ modules: {} }); }
  });

  // ── Web Push (mobile pop-up notifications) ───────────────────────────
  app.get("/api/reborn/push/public-key", (_req, res) => {
    res.json({ key: getVapidPublicKey(), enabled: pushEnabled() });
  });
  app.post("/api/reborn/push/subscribe", requireAuth, async (req, res) => {
    try {
      await savePushSubscription(getUserId(req)!, req.body?.subscription, req.headers["user-agent"] as string);
      res.json({ ok: true });
    } catch (e: any) { res.status(400).json({ message: tr(req, { en: "Could not subscribe", zh: "无法开启推送通知", id: "Tidak dapat mengaktifkan notifikasi push" }) }); }
  });
  app.post("/api/reborn/push/unsubscribe", requireAuth, async (req, res) => {
    await removePushSubscription(String(req.body?.endpoint || ""));
    res.json({ ok: true });
  });
  // Let the member send themselves a test push to confirm it works.
  app.post("/api/reborn/push/test", requireAuth, async (req, res) => {
    const n = await sendPushToUser(getUserId(req)!, { title: "🔔 Reborn Wave", body: tr(req, { en: "Push notifications are on — you're all set!", zh: "推送通知已开启——一切就绪！", id: "Notifikasi push aktif — semuanya siap!" }), url: "/reborn", tag: "test" });
    res.json({ sent: n });
  });

  // ── Attendance QR — main admin posts this at the workplace; staff scan to clock in ──
  app.get("/api/reborn/admin/attendance/code", requireAdmin(async (req, res) => {
    const code = await currentAttendCode();
    res.json({ code, url: `${req.protocol}://${req.get("host")}/attend?c=${code}` });
  }));
  app.post("/api/reborn/admin/attendance/rotate", requireAdmin(async (_req, res) => {
    const code = await rotateAttendCode();
    res.json({ code });
  }));
  app.get("/api/reborn/admin/attendance/qr", requireAdmin(async (req, res) => {
    const code = await currentAttendCode();
    const svg = await QRCode.toString(`${req.protocol}://${req.get("host")}/attend?c=${code}`, { type: "svg", width: 720, margin: 2, color: { dark: "#120b20", light: "#ffffff" } });
    res.type("image/svg+xml").send(svg);
  }));

  // ── HR: attendance, schedule, leave ──────────────────────────────────
  // Worker self-service (any staff/admin account)
  app.post("/api/reborn/staff/check-in", requireStaff(async (req, res) => {
    const uid = getUserId(req)!;
    const wd = todayStr();
    const photo = String(req.body?.photo || "");
    const code = String(req.body?.code || "").trim();
    const validCode = code && code === (await currentAttendCode());
    if (!validCode && !photo) return res.status(400).json({ message: tr(req, { en: "Scan the workplace attendance QR, or take a check-in photo.", zh: "请扫描工作场所的考勤二维码，或拍一张签到照片。", id: "Pindai QR absensi tempat kerja, atau ambil foto absen masuk." }) });
    const open = await db.select().from(staffAttendance).where(and(eq(staffAttendance.userId, uid), eq(staffAttendance.workDate, wd))).limit(1);
    if (open[0] && !open[0].checkOutAt) return res.status(400).json({ message: tr(req, { en: "You are already checked in today.", zh: "你今天已经签到了。", id: "Kamu sudah absen masuk hari ini." }) });
    const [row] = await db.insert(staffAttendance).values({ userId: uid, companyId: await rebornCompanyId(req), workDate: wd, checkInPhoto: photo || null, status: "present", decisionNote: validCode ? "QR check-in" : null }).returning();
    const staff = await storage.getUser(uid);
    await notifyStaffI18n("attendance", (lang) => ({ title: pick(lang, { en: "Staff checked in", zh: "员工已签到", id: "Staf absen masuk" }), body: pick(lang, { en: "{name} checked in", zh: "{name} 已签到", id: "{name} sudah absen masuk" }, { name: staff?.firstName || staff?.username || pick(lang, { en: "Staff", zh: "员工", id: "Staf" }) }) }), { path: "/reborn-admin", attendanceId: row.id });
    res.json(row);
  }));
  // Break in / out — accumulates break time; a member can't check out while on break.
  app.post("/api/reborn/staff/break", requireStaff(async (req, res) => {
    const uid = getUserId(req)!;
    const rows = await db.select().from(staffAttendance).where(and(eq(staffAttendance.userId, uid), eq(staffAttendance.workDate, todayStr()))).orderBy(desc(staffAttendance.id)).limit(1);
    const row = rows[0];
    if (!row || row.checkOutAt) return res.status(400).json({ message: tr(req, { en: "Check in first.", zh: "请先签到。", id: "Absen masuk dulu." }) });
    const start = req.body?.start !== false;
    if (start) {
      if (row.onBreak) return res.status(400).json({ message: tr(req, { en: "Already on break.", zh: "你已在休息中。", id: "Sudah sedang istirahat." }) });
      const [upd] = await db.update(staffAttendance).set({ onBreak: true, breakStartedAt: new Date() }).where(eq(staffAttendance.id, row.id)).returning();
      return res.json(upd);
    }
    if (!row.onBreak) return res.status(400).json({ message: tr(req, { en: "You're not on a break.", zh: "你目前没有在休息。", id: "Kamu sedang tidak istirahat." }) });
    const add = row.breakStartedAt ? Math.floor((Date.now() - new Date(row.breakStartedAt).getTime()) / 1000) : 0;
    const [upd] = await db.update(staffAttendance).set({ onBreak: false, breakStartedAt: null, breakSeconds: sql`${staffAttendance.breakSeconds} + ${add}` }).where(eq(staffAttendance.id, row.id)).returning();
    res.json(upd);
  }));
  app.post("/api/reborn/staff/check-out", requireStaff(async (req, res) => {
    const uid = getUserId(req)!;
    const rows = await db.select().from(staffAttendance).where(and(eq(staffAttendance.userId, uid), eq(staffAttendance.workDate, todayStr()))).orderBy(desc(staffAttendance.id)).limit(1);
    const row = rows[0];
    if (!row || row.checkOutAt) return res.status(400).json({ message: tr(req, { en: "No open check-in to close.", zh: "没有可结束的签到记录。", id: "Tidak ada absen masuk yang bisa ditutup." }) });
    const now = new Date();
    // Close an in-progress break into the accumulator.
    let breakSeconds = row.breakSeconds || 0;
    if (row.onBreak && row.breakStartedAt) breakSeconds += Math.floor((now.getTime() - new Date(row.breakStartedAt).getTime()) / 1000);
    // Overtime = time worked past today's scheduled shift end (if any).
    let overtimeSeconds = 0;
    const shift = (await db.select().from(workerShifts).where(and(eq(workerShifts.userId, uid), eq(workerShifts.shiftDate, row.workDate))).limit(1))[0];
    if (shift?.endTime) {
      const [eh, em] = shift.endTime.split(":").map(Number);
      const end = new Date(row.workDate + "T00:00:00"); end.setHours(eh || 0, em || 0, 0, 0);
      if (now.getTime() > end.getTime()) overtimeSeconds = Math.floor((now.getTime() - end.getTime()) / 1000);
    }
    const [upd] = await db.update(staffAttendance).set({ checkOutAt: now, onBreak: false, breakStartedAt: null, breakSeconds, overtimeSeconds }).where(eq(staffAttendance.id, row.id)).returning();
    const staff = await storage.getUser(uid);
    await notifyStaffI18n("attendance", (lang) => ({ title: pick(lang, { en: "Staff checked out", zh: "员工已签退", id: "Staf absen pulang" }), body: pick(lang, { en: "{name} checked out", zh: "{name} 已签退", id: "{name} sudah absen pulang" }, { name: staff?.firstName || staff?.username || pick(lang, { en: "Staff", zh: "员工", id: "Staf" }) }) }), { path: "/reborn-admin", attendanceId: row.id });
    res.json(upd);
  }));
  app.get("/api/reborn/staff/my-attendance", requireStaff(async (req, res) => {
    const uid = getUserId(req)!;
    res.json(await db.select().from(staffAttendance).where(eq(staffAttendance.userId, uid)).orderBy(desc(staffAttendance.id)).limit(60));
  }));
  app.get("/api/reborn/staff/my-shifts", requireStaff(async (req, res) => {
    const uid = getUserId(req)!;
    res.json(await db.select().from(workerShifts).where(eq(workerShifts.userId, uid)).orderBy(desc(workerShifts.shiftDate)).limit(120));
  }));
  app.post("/api/reborn/staff/leave", requireStaff(async (req, res) => {
    const b = req.body || {};
    if (!b.startDate || !b.endDate || !String(b.reason || "").trim()) return res.status(400).json({ message: tr(req, { en: "Dates and a reason are required.", zh: "请填写日期和原因。", id: "Tanggal dan alasan wajib diisi." }) });
    const [row] = await db.insert(leaveRequests).values({
      userId: getUserId(req)!, companyId: await rebornCompanyId(req), type: b.type === "mc" ? "mc" : "leave",
      startDate: b.startDate, endDate: b.endDate, reason: String(b.reason).trim(), attachmentUrl: b.attachmentUrl || null,
    }).returning();
    const staff = await storage.getUser(row.userId);
    await notifyStaffI18n("leave_request", (lang) => ({ title: row.type === "mc" ? pick(lang, { en: "New medical leave", zh: "新的病假申请", id: "Cuti sakit baru" }) : pick(lang, { en: "New leave request", zh: "新的请假申请", id: "Pengajuan cuti baru" }), body: pick(lang, { en: "{name} · {from} to {to}", zh: "{name} · {from} 至 {to}", id: "{name} · {from} sampai {to}" }, { name: staff?.firstName || staff?.username || pick(lang, { en: "Staff", zh: "员工", id: "Staf" }), from: row.startDate, to: row.endDate }) }), { path: "/reborn-admin", leaveId: row.id });
    res.json(row);
  }));
  app.get("/api/reborn/staff/my-leave", requireStaff(async (req, res) => {
    const uid = getUserId(req)!;
    res.json(await db.select().from(leaveRequests).where(eq(leaveRequests.userId, uid)).orderBy(desc(leaveRequests.id)).limit(60));
  }));

  // Which admin-panel view this account gets (admin / manager / staff).
  app.get("/api/reborn/my-role", requireAuth, async (req, res) => {
    res.json({ role: await adminRole(getUserId(req)) });
  });
  // Month-to-date paid sales per salesperson vs their target (WIB month).
  async function salesTargets(cid: number, month: string, onlyUser?: string) {
    const from = `${month}-01`;
    const [y, m] = month.split("-").map(Number);
    const to = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
    const today = (await ensureVenueSession()).day;
    const result = await db.execute(sql`SELECT m.user_id, COALESCE(NULLIF(trim(concat(u.first_name,' ',u.last_name)),''),u.username,u.email) name, m.role,
        COALESCE(p.sales_target,0)::numeric target, COALESCE(s.sales,0) sales, COALESCE(s.tickets,0) tickets, COALESCE(s.today,0) today
      FROM bridge_company_members m JOIN users u ON u.id=m.user_id
      LEFT JOIN bridge_staff_profiles p ON p.company_id=m.company_id AND p.user_id=m.user_id
      LEFT JOIN (SELECT sales_staff_id, sum(total::numeric) sales, count(*) tickets,
          sum(total::numeric) FILTER (WHERE ${VENUE_DAY_OF(sql`paid_at`)} = ${today}::date) today
        FROM pos_tickets WHERE status='paid' AND ${VENUE_DAY_OF(sql`paid_at`)} >= ${from}::date AND ${VENUE_DAY_OF(sql`paid_at`)} < ${to}::date GROUP BY sales_staff_id) s ON s.sales_staff_id=m.user_id
      WHERE m.company_id=${cid} AND m.role IN ('owner','admin','manager','staff') ${onlyUser ? sql`AND m.user_id=${onlyUser}` : sql``}
      ORDER BY COALESCE(s.sales,0) DESC, name`);
    return (((result as any).rows || result) as any[])
      .map((r) => ({ userId: r.user_id, name: r.name, role: r.role, target: Number(r.target) || 0, sales: Number(r.sales) || 0, tickets: Number(r.tickets) || 0, today: Number(r.today) || 0 }))
      .map((r) => ({ ...r, percent: r.target > 0 ? Math.round((r.sales / r.target) * 100) : null }));
  }
  // Manager › Daily sales: today's (or a chosen day's) total + every salesperson's target.
  app.get("/api/reborn/manager/daily-sales", requireManager(async (req, res) => {
    const cid = await rebornCompanyId(req);
    const day = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.day || "")) ? String(req.query.day) : (await ensureVenueSession()).day;
    const report = await buildDailyClosingReport(day);
    const [closed] = await db.select({ id: ledgerEntries.id, at: ledgerEntries.createdAt }).from(ledgerEntries).where(and(eq(ledgerEntries.refType, "pos_closing"), eq(ledgerEntries.refId, day))).limit(1);
    const month = day.slice(0, 7);
    const targets = await salesTargets(cid, month);
    res.json({ day, currentDay: (await ensureVenueSession()).day, closed: !!closed, report, month, monthTotal: targets.reduce((n, r) => n + r.sales, 0), targets: targets.filter((r) => r.target > 0 || r.sales > 0) });
  }));
  // Staff › My target: this month's sales credited to me vs my target.
  app.get("/api/reborn/staff/my-target", requireStaff(async (req, res) => {
    const cid = await rebornCompanyId(req);
    const month = (await ensureVenueSession()).day.slice(0, 7);
    const [me] = await salesTargets(cid, month, getUserId(req)!);
    res.json({ month, ...(me || { target: 0, sales: 0, tickets: 0, today: 0, percent: null }) });
  }));

  // Admin/manager (full admin)
  const nameOf = (u: any) => u ? (`${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username || u.email || u.id) : "Unknown";
  app.get("/api/reborn/admin/staff-list", requireAdmin(async (req, res) => {
    const cid = await rebornCompanyId(req);
    const result = await db.execute(sql`SELECT m.user_id AS id, m.role, COALESCE(NULLIF(trim(concat(u.first_name,' ',u.last_name)),''),u.username,u.email,u.id) name FROM bridge_company_members m JOIN users u ON u.id=m.user_id WHERE m.company_id=${cid} AND m.role IN ('owner','admin','manager','staff') ORDER BY name`);
    res.json((result.rows || result as any[]).map((x: any) => ({ id: x.id, name: x.name, role: x.role })));
  }));
  app.get("/api/reborn/admin/staff-positions", requireAdmin(async (req, res) => {
    const cid = await rebornCompanyId(req);
    res.json(await db.select().from(bridgePositions).where(eq(bridgePositions.companyId, cid)).orderBy(bridgePositions.name));
  }));
  app.get("/api/reborn/staff/leaderboard", requireStaff(async (req, res) => {
    const cid = await rebornCompanyId(req); if (!cid) return res.json([]);
    const industry = String(req.query.industry || "").trim();
    // Weekly sales credited to each salesperson — either the whole ticket, or (when
    // an industry is chosen) only the line items of products in that industry.
    const salesExpr = industry
      ? sql`COALESCE((SELECT SUM(pi.line_total) FROM pos_ticket_items pi JOIN pos_tickets t ON t.id=pi.order_id LEFT JOIN pos_products p2 ON p2.id=pi.product_id WHERE t.company_id=m.company_id AND t.sales_staff_id=m.user_id AND t.status='paid' AND t.paid_at >= now()-interval '7 days' AND ${industry} = ANY(string_to_array(COALESCE(p2.department,''), ','))),0)`
      : sql`COALESCE(sum(t.total::numeric) FILTER (WHERE t.paid_at >= now()-interval '7 days'),0)`;
    const salesJoin = industry ? sql`` : sql`LEFT JOIN pos_tickets t ON t.company_id=m.company_id AND t.sales_staff_id=m.user_id AND t.status='paid'`;
    const result = await db.execute(sql`SELECT m.user_id, COALESCE(NULLIF(trim(concat(u.first_name,' ',u.last_name)),''),u.email) name, p.name position, ${salesExpr} weekly_sales, COALESCE(avg(r.rating),0)::numeric(3,2) rating, count(DISTINCT r.id) review_count, count(DISTINCT r.id) FILTER (WHERE r.rating <= 2) bad_reviews FROM bridge_company_members m JOIN users u ON u.id=m.user_id LEFT JOIN bridge_positions p ON p.id=m.position_id ${salesJoin} LEFT JOIN bridge_staff_reviews r ON r.company_id=m.company_id AND r.staff_user_id=m.user_id AND r.visible=true WHERE m.company_id=${cid} AND m.role IN ('owner','admin','manager','staff') GROUP BY m.user_id,u.first_name,u.last_name,u.email,p.name ORDER BY weekly_sales DESC, rating DESC`);
    const rows=(result.rows||result) as any[]; res.json(rows.map((x,i)=>({...x,rank:i+1,redFlag:(Number(x.rating)>0&&Number(x.rating)<2.5)||Number(x.bad_reviews)>=3})));
  }));
  // Distinct industries (product departments) for filters.
  app.get("/api/reborn/industries", requireStaff(async (req, res) => {
    const cid = await rebornCompanyId(req);
    const rows = await db.execute(sql`SELECT DISTINCT TRIM(dep) dep FROM pos_products, unnest(string_to_array(department, ',')) AS dep WHERE company_id=${cid} AND COALESCE(department,'') <> '' AND TRIM(dep) <> '' ORDER BY dep`);
    res.json((rows.rows || rows as any[]).map((r: any) => r.dep));
  }));
  app.get("/api/reborn/staff/feedback", requireStaff(async (_req, res) => {
    const reborn = (await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.slug, homeCompanySlug())).limit(1))[0]; if (!reborn) return res.json([]);
    const result=await db.execute(sql`SELECT f.*, COALESCE(NULLIF(trim(concat(u.first_name,' ',u.last_name)),''),u.email) user_name, COALESCE(NULLIF(trim(concat(s.first_name,' ',s.last_name)),''),s.email) staff_name FROM bridge_feedback f LEFT JOIN users u ON u.id=f.user_id LEFT JOIN users s ON s.id=f.staff_user_id WHERE f.company_id=${reborn.id} ORDER BY f.id DESC LIMIT 300`); res.json(result.rows||result);
  }));
  app.get("/api/reborn/admin/attendance", requireAdmin(async (req, res) => {
    const status = String(req.query.status || "");
    const cid = await rebornCompanyId(req);
    const cond = status ? and(eq(staffAttendance.companyId, cid), eq(staffAttendance.status, status)) : eq(staffAttendance.companyId, cid);
    const rows = await db.select().from(staffAttendance).where(cond).orderBy(desc(staffAttendance.id)).limit(200);
    const ids = Array.from(new Set(rows.map((r) => r.userId)));
    const us = ids.length ? await db.select().from(users).where(inArray(users.id, ids)) : [];
    const map = new Map(us.map((u: any) => [u.id, nameOf(u)]));
    res.json(rows.map((r) => ({ ...r, staffName: map.get(r.userId) || r.userId })));
  }));
  // Delete a check-in photo to save storage (keeps the attendance record).
  app.delete("/api/reborn/admin/attendance/:id/photo", requireAdmin(async (req, res) => {
    await db.update(staffAttendance).set({ checkInPhoto: null }).where(eq(staffAttendance.id, Number(req.params.id)));
    res.json({ ok: true });
  }));
  app.post("/api/reborn/admin/attendance/:id/decide", requireAdmin(async (req, res) => {
    const approve = !!req.body?.approve;
    const [row] = await db.update(staffAttendance).set({ status: approve ? "approved" : "rejected", decidedBy: getUserId(req)!, decisionNote: req.body?.note || null }).where(eq(staffAttendance.id, Number(req.params.id))).returning();
    if (!row) return res.status(404).json({ message: tr(req, { en: "Not found", zh: "未找到", id: "Tidak ditemukan" }) });
    await notifyUserI18n(row.userId, "attendance_decision", (lang) => ({ title: row.status === "approved" ? pick(lang, { en: "Attendance approved", zh: "考勤已批准", id: "Absensi disetujui" }) : pick(lang, { en: "Attendance rejected", zh: "考勤被拒绝", id: "Absensi ditolak" }), body: `${row.workDate}${row.decisionNote ? ` · ${row.decisionNote}` : ""}` }), { path: "/staff", attendanceId: row.id });
    pushUserI18n(row.userId, (lang) => ({ title: approve ? pick(lang, { en: "✅ Attendance approved", zh: "✅ 考勤已批准", id: "✅ Absensi disetujui" }) : pick(lang, { en: "Attendance rejected", zh: "考勤被拒绝", id: "Absensi ditolak" }), body: `${row.workDate}${!approve && row.decisionNote ? ` — ${row.decisionNote}` : ""}`, url: "/reborn-admin", tag: `att-${row.id}` })).catch(() => {});
    res.json(row);
  }));
  app.get("/api/reborn/admin/shifts", requireAdmin(async (req, res) => {
    const from = String(req.query.from || ""), to = String(req.query.to || "");
    const cid = await rebornCompanyId(req);
    let rows;
    if (from && to) rows = await db.select().from(workerShifts).where(and(eq(workerShifts.companyId, cid), sql`${workerShifts.shiftDate} >= ${from}`, sql`${workerShifts.shiftDate} <= ${to}`)).orderBy(workerShifts.shiftDate);
    else rows = await db.select().from(workerShifts).where(eq(workerShifts.companyId, cid)).orderBy(desc(workerShifts.shiftDate)).limit(300);
    const ids = Array.from(new Set(rows.map((r) => r.userId)));
    const us = ids.length ? await db.select().from(users).where(inArray(users.id, ids)) : [];
    const map = new Map(us.map((u: any) => [u.id, nameOf(u)]));
    res.json(rows.map((r) => ({ ...r, staffName: map.get(r.userId) || r.userId })));
  }));
  app.post("/api/reborn/admin/shifts", requireAdmin(async (req, res) => {
    const b = req.body || {};
    if (!b.userId || !b.shiftDate || !b.startTime || !b.endTime) return res.status(400).json({ message: tr(req, { en: "Worker, date and times are required.", zh: "请填写员工、日期和时间。", id: "Pekerja, tanggal, dan jam wajib diisi." }) });
    const [row] = await db.insert(workerShifts).values({ userId: b.userId, companyId: await rebornCompanyId(req), shiftDate: b.shiftDate, startTime: b.startTime, endTime: b.endTime, role: b.role || null, note: b.note || null, createdBy: getUserId(req)! }).returning();
    await notifyUserI18n(row.userId, "shift", (lang) => ({ title: pick(lang, { en: "New work shift", zh: "新的排班", id: "Jadwal kerja baru" }), body: `${row.shiftDate} · ${row.startTime}–${row.endTime}` }), { path: "/staff", shiftId: row.id });
    res.json(row);
  }));
  app.delete("/api/reborn/admin/shifts/:id", requireAdmin(async (req, res) => {
    await db.delete(workerShifts).where(eq(workerShifts.id, Number(req.params.id)));
    res.json({ ok: true });
  }));
  app.get("/api/reborn/admin/leave", requireAdmin(async (req, res) => {
    const status = String(req.query.status || "");
    const cid = await rebornCompanyId(req);
    const cond = status ? and(eq(leaveRequests.companyId, cid), eq(leaveRequests.status, status)) : eq(leaveRequests.companyId, cid);
    const rows = await db.select().from(leaveRequests).where(cond).orderBy(desc(leaveRequests.id)).limit(200);
    const ids = Array.from(new Set(rows.map((r) => r.userId)));
    const us = ids.length ? await db.select().from(users).where(inArray(users.id, ids)) : [];
    const map = new Map(us.map((u: any) => [u.id, nameOf(u)]));
    res.json(rows.map((r) => ({ ...r, staffName: map.get(r.userId) || r.userId })));
  }));
  app.post("/api/reborn/admin/leave/:id/decide", requireAdmin(async (req, res) => {
    const approve = !!req.body?.approve;
    const [row] = await db.update(leaveRequests).set({
      status: approve ? "approved" : "rejected",
      paid: approve ? !!req.body?.paid : null,
      decidedBy: getUserId(req)!, decisionNote: req.body?.note || null,
    }).where(eq(leaveRequests.id, Number(req.params.id))).returning();
    if (!row) return res.status(404).json({ message: tr(req, { en: "Not found", zh: "未找到", id: "Tidak ditemukan" }) });
    const leaveKind = (lang: Lang) => row.type === "mc" ? pick(lang, { en: "Medical leave", zh: "病假", id: "Cuti sakit" }) : pick(lang, { en: "Leave", zh: "请假", id: "Cuti" });
    await notifyUserI18n(row.userId, "leave_decision", (lang) => ({
      title: row.status === "approved"
        ? pick(lang, { en: "{kind} approved", zh: "{kind}已批准", id: "{kind} disetujui" }, { kind: leaveKind(lang) })
        : pick(lang, { en: "{kind} rejected", zh: "{kind}被拒绝", id: "{kind} ditolak" }, { kind: leaveKind(lang) }),
      body: `${pick(lang, { en: "{from} to {to}", zh: "{from} 至 {to}", id: "{from} sampai {to}" }, { from: row.startDate, to: row.endDate })}${row.decisionNote ? ` · ${row.decisionNote}` : ""}`,
    }), { path: "/staff", leaveId: row.id });
    pushUserI18n(row.userId, (lang) => approve
      ? { title: pick(lang, { en: "✅ Leave approved", zh: "✅ 请假已批准", id: "✅ Cuti disetujui" }), body: `${leaveKind(lang)} ${row.startDate}${row.endDate !== row.startDate ? `→${row.endDate}` : ""} — ${row.paid ? pick(lang, { en: "paid", zh: "带薪", id: "dibayar" }) : pick(lang, { en: "unpaid", zh: "无薪", id: "tidak dibayar" })}`, url: "/reborn-admin", tag: `leave-${row.id}` }
      : { title: pick(lang, { en: "Leave rejected", zh: "请假被拒绝", id: "Cuti ditolak" }), body: `${leaveKind(lang)} ${row.startDate}${row.decisionNote ? ` — ${row.decisionNote}` : ""}`, url: "/reborn-admin", tag: `leave-${row.id}` }).catch(() => {});
    res.json(row);
  }));

  // A still-pending booking whose date passed more than 3 days ago is dropped from
  // booking lists; upcoming ones always stay.
  const isStalePending = (r: { status: string; appointmentDate: Date | string }) =>
    (r.status === "pending" || r.status === "scheduled") && new Date(r.appointmentDate).getTime() < Date.now() - 3 * 86_400_000;

  // Booking info for members — enabled areas (each with its own hours/slots) + next 7 days.
  app.get("/api/reborn/booking/info", requireAuth, async (_req, res) => {
    const s = await getSettings();
    const days: any[] = [];
    const base = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(base); d.setDate(base.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push({ date: dateStr, weekday: d.getDay() });
    }
    // Strip the (large) inline image from the list; the app lazy-loads it per area.
    // Slots depend on the chosen date (per-weekday schedule) → fetched from /availability.
    const today = todayStr();
    const areas = enabledAreas(s.bookingAreas).map(({ image, ...a }) => ({
      ...a,
      hasImage: !!image,
      hours: areaHoursTextForDate(a as any, today),
    }));
    res.json({ note: s.bookingNote, hoursSummary: bookingHoursSummary(), areas, days, askHours: s.bookingAskHours, askSpecial: s.bookingAskSpecial, occasions: BOOKING_OCCASIONS.map((o) => o.id), tableDayLock: s.bookingTableDayLock });
  });
  // Serve one area's layout image (kept out of booking/info to keep that payload small).
  app.get("/api/reborn/booking/area-image/:areaId", requireAuth, async (req, res) => {
    const s = await getSettings();
    const area = enabledAreas(s.bookingAreas).find((a) => a.id === req.params.areaId);
    const m = area?.image && /^data:([^;]+);base64,(.+)$/.exec(area.image);
    if (!m) return res.sendStatus(404);
    res.setHeader("Content-Type", m[1]);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(Buffer.from(m[2], "base64"));
  });
  const ADDRESS_NEEDED = { en: "Enter the full address where you want the service.", zh: "请输入需要上门服务的完整地址。", id: "Isi alamat lengkap tempat layanan dilakukan." };
  // Member creates a booking from the app.
  app.post("/api/reborn/booking", requireAuth, async (req, res) => {
    const userId = getUserId(req)!;
    const b = req.body || {};
    const date = String(b.date || todayStr());
    const s = await getSettings();
    const areas = enabledAreas(s.bookingAreas);
    const area = areas.find((a) => a.id === b.areaId || a.name === b.area);
    if (!area) return res.status(400).json({ message: tr(req, { en: "Pick an area", zh: "请选择区域", id: "Pilih area" }) });
    const slots = areaSlotsForDate(area, date);
    if (!slots.length) return res.status(400).json({ message: tr(req, { en: "Closed on that day — please pick another date.", zh: "当天不营业，请选择其他日期。", id: "Tutup pada hari itu — silakan pilih tanggal lain." }) });
    const slot = slots.includes(String(b.slot)) ? String(b.slot) : null;
    if (!slot) return res.status(400).json({ message: tr(req, { en: "Pick a valid time slot", zh: "请选择有效的时段", id: "Pilih jam yang valid" }) });
    const table = b.table && area.tables.includes(String(b.table)) ? String(b.table) : undefined;
    if (area.tables.length && !table) return res.status(400).json({ message: tr(req, { en: "Pick a table", zh: "请选择桌位", id: "Pilih meja" }) });
    const address = atCustomerPlace(area) ? serviceAddressFrom(b.address) : "";
    if (atCustomerPlace(area) && !address) return res.status(400).json({ message: tr(req, ADDRESS_NEEDED) });
    const whenDt = bookingWhen(areaOpenHourForDate(area, date), date, slot);
    if (await isAreaBlocked(area, whenDt)) return res.status(409).json({ message: tr(req, { en: "That time is not available. Please pick another.", zh: "该时段不可预订，请选择其他时间。", id: "Jam itu tidak tersedia. Silakan pilih yang lain." }) });
    // Prevent double-booking the same table/room at the same time.
    if (table && await isTableTaken(area, table, whenDt))
      return res.status(409).json({ message: tr(req, tableDayLockOn() ? { en: "{t} is already booked that day. Please pick another.", zh: "{t} 当天已被预订，请选择其他桌位。", id: "{t} sudah dipesan hari itu. Silakan pilih yang lain." } : { en: "{t} is already booked for that time. Please pick another.", zh: "{t} 该时段已被预订，请选择其他桌位。", id: "{t} sudah dipesan untuk jam itu. Silakan pilih yang lain." }, { t: table }) });
    const party = Math.max(1, Number(b.partySize) || 2);
    const cap = tableCap(area, table);
    if (party > cap) return res.status(400).json({ message: tr(req, { en: "{t} seats up to {n} pax. Please reduce the party size or pick a bigger spot.", zh: "{t} 最多容纳 {n} 人，请减少人数或选择更大的位置。", id: "{t} maksimal {n} orang. Kurangi jumlah orang atau pilih tempat yang lebih besar." }, { t: table || tr(req, { en: "This area", zh: "该区域", id: "Area ini" }), n: cap }) });
    const hours = s.bookingAskHours ? Math.max(2, Math.min(8, Number(b.hours) || 2)) : 2;
    const row = await createBooking({ userId, dateStr: date, slot, partySize: Number(b.partySize) || 2, hours, note: s.bookingAskSpecial ? specialRequestText(b.occasion, b.note, b.occasion === "birthday" || mentionsBirthday(String(b.note || "")) ? b.cake : undefined) : undefined, table, address: address || undefined, area: `${area.name} (${area.level})`, openHour: areaOpenHourForDate(area, date), companyId: await rebornCompanyId(req) });
    const label = areaSlotLabelsForDate(area, date)[slots.indexOf(slot)] || slot;
    const [u] = await db.select().from(users).where(eq(users.id, userId));
    await notifyAdmins(`New app booking #${row.id}: ${[u?.firstName, u?.lastName].filter(Boolean).join(" ") || u?.email} · ${date} ${label} · ${row.description} — confirm in the app.`);
    await notifyStaffI18n("new_booking", (lang) => ({ title: pick(lang, { en: "New booking request", zh: "新的预订请求", id: "Permintaan booking baru" }), body: `${[u?.firstName, u?.lastName].filter(Boolean).join(" ") || u?.email || pick(lang, { en: "Member", zh: "会员", id: "Member" })} · ${date} ${label}` }), { path: "/reborn-admin", bookingId: row.id });
    pushAdminsI18n((lang) => ({ title: pick(lang, { en: "New booking to confirm", zh: "有新预订待确认", id: "Booking baru perlu dikonfirmasi" }), body: `${[u?.firstName, u?.lastName].filter(Boolean).join(" ") || u?.email} · ${date} ${label}`, url: "/reborn-admin", tag: `newbk-${row.id}` })).catch(() => {});
    // WhatsApp the member a booking receipt (the address + map pin follow when staff confirm).
    const receiptPhone = await memberWaPhone(userId);
    if (receiptPhone) {
      const phone = receiptPhone;
      (async () => {
        const lang = await langForPhone(phone, userId);
        const msg = waText(lang, "appReceipt", { club: s.clubName || "Reborn Wave", area: area.name, day: fmtDMY(date, lang), time: timeText(lang, slot, label), table: table ? ` · ${table}` : "", n: String(party) });
        await sendToMember(phone, msg, userId);
      })().catch(() => {});
    }
    await logAdmin(req, { targetUserId: userId, targetType: "appointment", targetId: row.id, action: "book", entityType: "booking", description: `Booked ${date} ${label}` });
    res.json({ message: tr(req, { en: "Booked {d} at {tm}. We'll confirm shortly.", zh: "已预订 {d} {tm}，我们会尽快确认。", id: "Dipesan {d} jam {tm}. Kami akan segera konfirmasi." }, { d: date, tm: timeText(reqLang(req), slot, label) }), appointment: row });
  });
  // Which tables/rooms are already taken for an area on a date (to grey them out).
  app.get("/api/reborn/booking/availability", requireAuth, async (req, res) => {
    const s = await getSettings();
    const area = enabledAreas(s.bookingAreas).find((a) => a.id === req.query.areaId);
    if (!area) return res.json({ slots: [], taken: {}, hours: "", closed: true });
    const date = String(req.query.date || todayStr());
    const values = areaSlotsForDate(area, date);
    const labels = areaSlotLabelsForDate(area, date);
    const slots = values.map((v, i) => ({ value: v, label: labels[i] }));
    const taken = await takenTablesForDate(area, date);
    const fullyBooked = values.length > 0 && (await isDateFullyBooked(area, date));
    // Times where every table is taken (shown as "Full"), and — when the whole
    // area is full — the other areas that still have space that day.
    const open = new Set(values.length ? await availableSlotsForDate(area, date) : []);
    const fullSlots = values.filter((v) => !open.has(v));
    const otherAreas = fullyBooked ? (await areasWithSpace(enabledAreas(s.bookingAreas), date, area.id)).map((x) => ({ id: x.id, name: x.name, names: x.names, level: x.level })) : [];
    const caps: Record<string, number> = {};
    for (const t of area.tables) caps[t] = hasPaxLimit(tableCap(area, t)) ? tableCap(area, t) : 0; // 0 = no max
    res.json({ slots, hours: areaHoursTextForDate(area, date), closed: values.length === 0, fullyBooked, fullSlots, otherAreas, taken, caps, maxPax: area.maxPax && area.maxPax > 0 ? area.maxPax : 0 });
  });
  // A member's own bookings (includes ones made over WhatsApp — same account).
  app.get("/api/reborn/my-bookings", requireAuth, async (req, res) => {
    const userId = getUserId(req)!;
    const cid = await rebornCompanyId(req);
    const rows = await db.select().from(appointments).where(and(eq(appointments.companyId, cid), eq(appointments.userId, userId))).orderBy(desc(appointments.appointmentDate)).limit(50);
    res.json(rows.filter((r) => !isStalePending(r)));
  });
  app.post("/api/reborn/my-bookings/:id/cancel", requireAuth, async (req, res) => {
    const userId = getUserId(req)!;
    const id = Number(req.params.id);
    const [a] = await db.select().from(appointments).where(and(eq(appointments.id, id), eq(appointments.userId, userId)));
    if (!a) return res.status(404).json({ message: tr(req, { en: "Booking not found", zh: "找不到该预订", id: "Booking tidak ditemukan" }) });
    // Pending AND confirmed bookings can be cancelled by the member, up to the start time.
    if (!["pending", "scheduled", "confirmed"].includes(a.status)) return res.status(400).json({ message: tr(req, { en: "Can't cancel this booking", zh: "无法取消此预订", id: "Booking ini tidak bisa dibatalkan" }) });
    if (new Date(a.appointmentDate).getTime() <= Date.now()) return res.status(400).json({ message: tr(req, { en: "This booking has already started", zh: "此预订已开始", id: "Booking ini sudah dimulai" }) });
    const [row] = await db.update(appointments).set({ status: "cancelled", adminNote: "Cancelled by member (app)", updatedAt: new Date() }).where(eq(appointments.id, id)).returning();
    await notifyBookingCancelledByMember(row, "app");
    res.json({ message: tr(req, { en: "Booking cancelled", zh: "预订已取消", id: "Booking dibatalkan" }) });
  });
  // Admin — all bookings (recent + upcoming) with member name/phone.
  app.get("/api/reborn/admin/bookings", requireStaff(async (req, res) => {
    const cid = await rebornCompanyId(req);
    // Bookings saved before every path tagged the business (company_id null) belong to the main club.
    const mainId = (await rebornCompany())?.id;
    const scope = cid === mainId ? or(eq(appointments.companyId, cid), isNull(appointments.companyId)) : eq(appointments.companyId, cid);
    const rows = await db.select().from(appointments).where(scope).orderBy(desc(appointments.appointmentDate)).limit(300);
    const ids = Array.from(new Set(rows.map((r) => r.userId).filter(Boolean)));
    const us = ids.length ? await db.select().from(users).where(inArray(users.id, ids as string[])) : [];
    const umap = new Map(us.map((u) => [u.id, u]));
    const now = Date.now();
    const out = rows.filter((r) => !isStalePending(r)).map((r) => {
      const u: any = umap.get(r.userId);
      const start = new Date(r.appointmentDate).getTime();
      // "upcoming" keeps a booking listed until it ends, so staff can still mark the guest Arrived.
      return { ...r, memberName: u ? [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email : "—", memberPhone: u?.phoneNumber || "", upcoming: r.status === "seated" || start + (r.duration || 120) * 60_000 > now, started: start <= now, lateArrivalOk: isNoShowCancel(r) && bookingEnd(r) > now }; // seated guests stay listed until their bill is paid
    });
    res.json(out);
  }));
  app.post("/api/reborn/admin/bookings/:id/status", requireStaff(async (req, res) => {
    const id = Number(req.params.id);
    const status = ["confirmed", "cancelled", "completed", "pending", "seated"].includes(req.body?.status) ? req.body.status : null;
    if (!status) return res.status(400).json({ message: tr(req, { en: "Bad status", zh: "状态无效", id: "Status tidak valid" }) });
    const note = String(req.body?.note || "").trim() || undefined;
    // ✓ Arrived on a booking that was auto-cancelled as a no-show: the guests came late.
    const [cur] = await db.select().from(appointments).where(eq(appointments.id, id));
    const late = !!cur && status === "seated" && cur.status === "cancelled";
    if (late) {
      if (!isNoShowCancel(cur) || bookingEnd(cur) <= Date.now()) return res.status(400).json({ message: tr(req, { en: "This booking was cancelled — make a new booking for the guest.", zh: "此预订已取消——请为客人重新预订。", id: "Booking ini sudah dibatalkan — buat booking baru untuk tamu." }) });
      if (await tableTakenByOther(cur)) return res.status(409).json({ message: tr(req, { en: "This table has been booked by someone else since — seat the guest at another table.", zh: "此桌已被其他人预订——请安排客人到别的桌。", id: "Meja ini sudah dipesan orang lain — dudukkan tamu di meja lain." }) });
    }
    const [row] = await db.update(appointments).set({ status, ...(note ? { adminNote: note } : late ? { adminNote: null } : {}), updatedAt: new Date() }).where(eq(appointments.id, id)).returning();
    if (!row) return res.status(404).json({ message: tr(req, { en: "Not found", zh: "未找到", id: "Tidak ditemukan" }) });
    // A confirmed table booking checks the member in to KOS at that table (from 2h before).
    if ((status === "confirmed" || status === "seated") && row.userId) await autoCheckinFromBooking(row.userId).catch((e) => console.warn("auto check-in", e));
    // Guest marked Arrived → a welcome on WhatsApp (once: not when it was already arrived).
    if (status === "seated" && cur?.status !== "seated") void notifyArrived(row).catch((e) => console.warn("arrived WhatsApp", e));
    // Tell the member on WhatsApp when a booking is confirmed or rejected. `whatsapp` tells the
    // admin's screen whether it went out: sending | noPhone | offline (WhatsApp not linked).
    let whatsapp: "sending" | "noPhone" | "offline" | undefined;
    if ((status === "confirmed" || status === "cancelled") && row.userId) {
      const phone = await memberWaPhone(row.userId);
      whatsapp = !phone ? "noPhone" : (await chatAvailable(phone)) ? "sending" : "offline";
      if (whatsapp !== "sending") void import("./errorWatch").then((m) => m.recordError({ area: "booking", source: "whatsapp", method: "SEND", path: `/api/reborn/admin/bookings/${id}/status`, status: 0, message: `Booking #${id} ${status}: WhatsApp not sent (${whatsapp === "noPhone" ? "member has no phone number" : "WhatsApp is not connected"})` })).catch(() => {});
      const lang = await langForPhone(phone, row.userId);
      const when = fmtBookingWhen(row.appointmentDate, lang);
      const what = localizeBookingText(lang, row.title);
      if (whatsapp === "sending") {
        const msg = status === "confirmed"
          ? waText(lang, "staffConfirmed", { what, when })
          : waText(lang, "staffCancelled", { what, when, note: note ? `: ${note}.` : "." });
        // A confirmation carries the club's address + map pin (the booking reply doesn't).
        const full = status === "confirmed" ? `${msg}\n\n${await locationReply(lang)}` : msg;
        sendToMember(phone, full, row.userId).then((ok) => { if (!ok) console.warn(`[wa] booking #${id} ${status}: WhatsApp not delivered to ${phone}`); }).catch(() => {});
      } else console.warn(`[wa] booking #${id} ${status}: WhatsApp not sent (${whatsapp})`);
      sendPushToUser(row.userId, {
        title: waText(lang, status === "confirmed" ? "pushConfirmedTitle" : "pushCancelledTitle"),
        body: status === "confirmed" ? `${what} — ${when}` : `${what}${note ? ` — ${note}` : ""}. ${waText(lang, "tapRebook")}`,
        url: "/bookings", tag: `booking-${id}`,
      }).catch(() => {});
    }
    await logAdmin(req, { targetUserId: row.userId, targetType: "appointment", targetId: id, action: status, entityType: "booking", description: `Booking #${id} → ${status}${note ? ` (${note})` : ""}` });
    const nLang = await langForPhone("", row.userId);
    await sendRebornUserNotification(row.userId, { type: "booking_status", title: waText(nLang, `status.${status}`), body: `${localizeBookingText(nLang, row.title)}${note ? ` · ${note}` : ""}`, data: { path: "/bookings", bookingId: row.id, status } });
    res.json({ ...row, whatsapp });
  }));
  // Admin blocks a date/time (whole area, or one table/room) so guests can't book it.
  app.post("/api/reborn/admin/bookings/block", requireStaff(async (req, res) => {
    const b = req.body || {};
    const s = await getSettings();
    const area = enabledAreas(s.bookingAreas).find((a) => a.id === b.areaId);
    if (!area) return res.status(400).json({ message: tr(req, { en: "Pick an area", zh: "请选择区域", id: "Pilih area" }) });
    const date = String(b.date || todayStr());
    const slots = areaSlotsForDate(area, date);
    const slot = slots.includes(String(b.slot)) ? String(b.slot) : null;
    if (!slot) return res.status(400).json({ message: tr(req, { en: "Pick a valid time slot", zh: "请选择有效的时段", id: "Pilih jam yang valid" }) });
    const table = b.table && area.tables.includes(String(b.table)) ? String(b.table) : BLOCK_ALL;
    const when = bookingWhen(areaOpenHourForDate(area, date), date, slot);
    const [row] = await db.insert(appointments).values({
      userId: getUserId(req)!, companyId: await rebornCompanyId(req), title: "BLOCKED", service: `${area.name} (${area.level})`,
      description: `Blocked by admin${b.reason ? `: ${b.reason}` : ""}`, notes: `${area.name} (${area.level}) / ${table}`,
      appointmentDate: when, duration: 120, cost: "0", status: "blocked", adminNote: b.reason || null,
    }).returning();
    await logAdmin(req, { targetType: "appointment", targetId: row.id, action: "block", entityType: "booking", description: `Blocked ${area.name} ${b.date} ${slot} (${table})` });
    res.json({ message: tr(req, { en: "Blocked {area} on {d} {slot}{t}.", zh: "已封锁 {area}：{d} {slot}{t}。", id: "{area} diblokir pada {d} {slot}{t}." }, { area: area.name, d: String(b.date || ""), slot, t: table !== BLOCK_ALL ? " · " + table : tr(req, { en: " (whole area)", zh: "（整个区域）", id: " (seluruh area)" }) }), appointment: row });
  }));
  // Admin books on behalf of a member (auto-confirmed).
  app.post("/api/reborn/admin/bookings/manual", requireStaff(async (req, res) => {
    const b = req.body || {};
    const u = await findMemberByCode(b.memberCode || "");
    if (!u) return res.status(404).json({ message: tr(req, { en: "Member not found (code / card / username / email)", zh: "找不到该会员（会员码 / 卡号 / 用户名 / 邮箱）", id: "Member tidak ditemukan (kode / kartu / nama pengguna / email)" }) });
    const s = await getSettings();
    const area = enabledAreas(s.bookingAreas).find((a) => a.id === b.areaId);
    if (!area) return res.status(400).json({ message: tr(req, { en: "Pick an area", zh: "请选择区域", id: "Pilih area" }) });
    const date = String(b.date || todayStr());
    const slots = areaSlotsForDate(area, date);
    if (!slots.length) return res.status(400).json({ message: tr(req, { en: "Closed on that day", zh: "当天不营业", id: "Tutup pada hari itu" }) });
    const slot = slots.includes(String(b.slot)) ? String(b.slot) : null;
    if (!slot) return res.status(400).json({ message: tr(req, { en: "Pick a valid time slot", zh: "请选择有效的时段", id: "Pilih jam yang valid" }) });
    const table = b.table && area.tables.includes(String(b.table)) ? String(b.table) : undefined;
    if (area.tables.length && !table) return res.status(400).json({ message: tr(req, { en: "Pick a table", zh: "请选择桌位", id: "Pilih meja" }) });
    const address = atCustomerPlace(area) ? serviceAddressFrom(b.address) : "";
    if (atCustomerPlace(area) && !address) return res.status(400).json({ message: tr(req, ADDRESS_NEEDED) });
    const when = bookingWhen(areaOpenHourForDate(area, date), date, slot);
    if (await isAreaBlocked(area, when)) return res.status(409).json({ message: tr(req, { en: "That time is blocked", zh: "该时段已被封锁", id: "Jam itu sudah diblokir" }) });
    if (table && await isTableTaken(area, table, when)) return res.status(409).json({ message: tr(req, { en: "{t} is already booked for that time", zh: "{t} 该时段已被预订", id: "{t} sudah dipesan untuk jam itu" }, { t: table }) });
    const manualParty = Math.max(1, Number(b.partySize) || 2);
    if (manualParty > tableCap(area, table)) return res.status(400).json({ message: tr(req, { en: "{t} seats up to {n} pax.", zh: "{t} 最多容纳 {n} 人。", id: "{t} maksimal {n} orang." }, { t: table || tr(req, { en: "This area", zh: "该区域", id: "Area ini" }), n: tableCap(area, table) }) });
    const hours = Math.max(2, Math.min(8, Number(b.hours) || 2));
    const row = await createBooking({ userId: u.id, dateStr: date, slot, partySize: manualParty, hours, table, address: address || undefined, area: `${area.name} (${area.level})`, openHour: areaOpenHourForDate(area, date), companyId: await rebornCompanyId(req) });
    await db.update(appointments).set({ status: "confirmed" }).where(eq(appointments.id, row.id)); // admin booking = confirmed
    const label = areaSlotLabelsForDate(area, date)[slots.indexOf(slot)] || slot;
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
    const memberPhone = await memberWaPhone(u.id);
    const mLang = await langForPhone(memberPhone, u.id);
    const whenTxt = fmtBookingWhen(when, mLang);
    if (memberPhone) {
      const phone = memberPhone;
      locationReply(mLang)
        .then((loc) => sendToMember(phone, `${waText(mLang, "staffBooked", { club: s.clubName || "Reborn Wave", area: area.name, when: whenTxt, table: table ? ` · ${table}` : "" })}\n\n${loc}`, u.id))
        .catch(() => {});
    }
    sendPushToUser(u.id, { title: waText(mLang, "pushBookedTitle"), body: `${area.name} — ${whenTxt}${table ? ` · ${table}` : ""}`, url: "/bookings", tag: `booking-${row.id}` }).catch(() => {});
    await logAdmin(req, { targetUserId: u.id, targetType: "appointment", targetId: row.id, action: "manual_book", entityType: "booking", description: `Booked ${name} · ${area.name} ${date} ${label}` });
    res.json({ message: tr(req, { en: "Booked {name} · {area} {d} {l}", zh: "已为 {name} 预订 · {area} {d} {l}", id: "Booking untuk {name} · {area} {d} {l}" }, { name: String(name || ""), area: area.name, d: date, l: label }), appointment: row });
  }));

  // Inventory report — stock levels, valuation and low-stock alerts, grouped by category.
  app.get("/api/reborn/admin/inventory", requireAdmin(async (req, res) => {
    const lowAt = Math.max(0, Number(req.query.lowAt) || 5);
    const cid = await rebornCompanyId(req);
    const rows = await db.select().from(posProducts).where(and(eq(posProducts.companyId, cid), isNull(posProducts.packageKind))).orderBy(posProducts.category, posProducts.name); // packages hold no stock
    // Distinct suppliers each product has been restocked from (one item, many suppliers).
    const supRows = await db.select({ productId: stockMovements.productId, supplier: stockMovements.supplier })
      .from(stockMovements).where(and(isNotNull(stockMovements.supplier), sql`${stockMovements.delta} > 0`));
    const supByProduct = new Map<number, Set<string>>();
    for (const r of supRows) { if (!r.supplier) continue; (supByProduct.get(r.productId) || supByProduct.set(r.productId, new Set()).get(r.productId)!).add(r.supplier); }
    const items = rows.map((p) => {
      const stock = p.stock ?? 0;
      const cost = Number(p.cost) || 0;
      const price = Number(p.price) || 0;
      return {
        id: p.id, name: p.name, category: p.category, department: p.department || null, active: p.active, posVisible: p.posVisible,
        stock, cost, price, imageUrl: p.imageUrl,
        suppliers: Array.from(supByProduct.get(p.id) || (p.supplierName ? new Set([p.supplierName]) : new Set())),
        stockValue: Math.round(stock * cost),
        retailValue: Math.round(stock * price),
        low: stock <= lowAt,
      };
    });
    const totals = items.reduce((a, it) => ({
      units: a.units + it.stock,
      cost: a.cost + it.stockValue,
      retail: a.retail + it.retailValue,
      low: a.low + (it.low ? 1 : 0),
    }), { units: 0, cost: 0, retail: 0, low: 0 });
    const byCategory: Record<string, { units: number; cost: number; retail: number }> = {};
    for (const it of items) {
      byCategory[it.category] ||= { units: 0, cost: 0, retail: 0 };
      byCategory[it.category].units += it.stock;
      byCategory[it.category].cost += it.stockValue;
      byCategory[it.category].retail += it.retailValue;
    }
    res.json({ lowAt, items, totals, byCategory });
  }));

  // CRM — WhatsApp/POS contacts captured by the bot.
  app.get("/api/reborn/admin/crm", requireAdmin(async (_req, res) => {
    const rows = await db.select().from(crmContacts).orderBy(desc(crmContacts.updatedAt)).limit(500);
    const stages: Record<string, number> = {};
    for (const c of rows) stages[c.stage] = (stages[c.stage] || 0) + 1;
    res.json({ contacts: rows, stages, count: rows.length });
  }));
  // Conversation history for one contact.
  app.get("/api/reborn/admin/crm/:id/messages", requireAdmin(async (req, res) => {
    const id = Number(req.params.id);
    const rows = await db.select().from(crmMessages).where(eq(crmMessages.contactId, id)).orderBy(crmMessages.createdAt).limit(300);
    res.json(rows);
  }));
  // Admin replies to a contact over WhatsApp from the web.
  app.post("/api/reborn/admin/crm/:id/send", requireAdmin(async (req, res) => {
    const id = Number(req.params.id);
    const text = String(req.body?.text || "").trim();
    if (!text) return res.status(400).json({ message: tr(req, { en: "Message is empty", zh: "消息为空", id: "Pesan kosong" }) });
    const out = await sendAdminMessage(id, text);
    await logAdmin(req, { targetType: "crm_contact", targetId: id, action: "wa_reply", entityType: "crm", description: `Replied on WhatsApp: "${text.slice(0, 80)}"` });
    res.status(out.ok ? 200 : 202).json(out);
  }));
  // Edit a contact's profile.
  app.patch("/api/reborn/admin/crm/:id", requireAdmin(async (req, res) => {
    const id = Number(req.params.id);
    const b = req.body || {};
    const patch: any = { updatedAt: new Date() };
    if (typeof b.name === "string") patch.name = b.name.trim() || null;
    if (typeof b.email === "string") patch.email = b.email.trim().toLowerCase() || null;
    if (typeof b.notes === "string") patch.notes = b.notes;
    if (b.lang === "en" || b.lang === "zh" || b.lang === "id") patch.lang = b.lang;
    if (["new", "await_lang", "await_name", "await_email", "await_phone", "await_code", "active", "member"].includes(b.stage)) patch.stage = b.stage;
    if (typeof b.botPaused === "boolean") { patch.botPaused = b.botPaused; if (!b.botPaused) patch.waState = { flow: null }; }
    const [row] = await db.update(crmContacts).set(patch).where(eq(crmContacts.id, id)).returning();
    if (!row) return res.status(404).json({ message: tr(req, { en: "Contact not found", zh: "找不到该联系人", id: "Kontak tidak ditemukan" }) });
    await logAdmin(req, { targetType: "crm_contact", targetId: id, action: "edit", entityType: "crm", description: `Edited contact ${row.name || row.phone}` });
    res.json(row);
  }));
  // Delete a contact and its messages.
  app.delete("/api/reborn/admin/crm/:id", requireAdmin(async (req, res) => {
    const id = Number(req.params.id);
    const [row] = await db.select().from(crmContacts).where(eq(crmContacts.id, id));
    if (!row) return res.status(404).json({ message: tr(req, { en: "Contact not found", zh: "找不到该联系人", id: "Kontak tidak ditemukan" }) });
    await db.delete(crmMessages).where(eq(crmMessages.contactId, id));
    await db.delete(crmContacts).where(eq(crmContacts.id, id));
    await logAdmin(req, { targetType: "crm_contact", targetId: id, action: "delete", entityType: "crm", description: `Deleted contact ${row.name || row.phone}` });
    res.json({ message: tr(req, { en: "Contact deleted", zh: "联系人已删除", id: "Kontak dihapus" }) });
  }));

  // WhatsApp status + manual reminder trigger.
  app.get("/api/reborn/admin/whatsapp/status", requireAdmin(async (_req, res) => {
    await whatsappAvailable(); // loads this company's saved WhatsApp settings
    res.json({ configured: whatsappConfigured(), adminNumber: Boolean(process.env.WA_ADMIN_NUMBER), web: getWaWebStatus() });
  }));
  // This company's own WhatsApp Business number (Meta Cloud API): settings, save, test.
  app.get("/api/reborn/admin/whatsapp/cloud", requireAdmin(async (req, res) => {
    res.json(await getWhatsAppCloudSettings(`https://${req.hostname}`));
  }));
  app.post("/api/reborn/admin/whatsapp/cloud", requireAdmin(async (req, res) => {
    await saveWhatsAppCloudSettings({ phoneId: req.body?.phoneId, token: req.body?.token, adminNumber: req.body?.adminNumber });
    await logAdmin(req, { targetType: "whatsapp", action: "cloud_settings", entityType: "whatsapp", description: "Updated WhatsApp Business (Meta) settings" });
    res.json({ ...(await getWhatsAppCloudSettings(`https://${req.hostname}`)), test: await testWhatsAppCloud() });
  }));
  app.post("/api/reborn/admin/whatsapp/cloud/test", requireAdmin(async (_req, res) => {
    res.json(await testWhatsAppCloud());
  }));
  registerMetaConnect(app); // the Facebook login comes back to /api/meta/oauth/callback
  // Telegram bot: paste the token from @BotFather once and it links itself; customers scan its QR.
  app.get("/api/reborn/admin/telegram", requireAdmin(async (_req, res) => { res.json(await telegramStatus()); }));
  app.post("/api/reborn/admin/telegram", requireAdmin(async (req, res) => {
    const out = await connectTelegram(String(req.body?.token || ""), `https://${req.hostname}`);
    if (!out.ok) return res.status(400).json({ message: tr(req, { en: "Telegram didn't accept this token: {e}", zh: "Telegram 不接受此令牌：{e}", id: "Telegram tidak menerima token ini: {e}" }, { e: out.error || "" }) });
    await logAdmin(req, { targetType: "whatsapp", action: out.username ? "telegram_link" : "telegram_unlink", entityType: "whatsapp", description: out.username ? `Linked Telegram bot @${out.username}` : "Unlinked the Telegram bot" });
    res.json({ ...(await telegramStatus()), message: out.username
      ? tr(req, { en: "Telegram bot @{u} linked", zh: "已关联 Telegram 机器人 @{u}", id: "Bot Telegram @{u} terhubung" }, { u: out.username })
      : tr(req, { en: "Telegram bot unlinked", zh: "已取消关联 Telegram 机器人", id: "Bot Telegram dilepas" }) });
  }));
  // This company's Facebook Page (+ its linked Instagram account): Messenger and Instagram DMs
  // get the same bot. Same webhook address and verify token as WhatsApp (server/socialChat.ts).
  const metaView = async (req: Request) => {
    const wa = await getWhatsAppCloudSettings(`https://${req.hostname}`);
    return { ...(await getMetaSettings()), webhookUrl: wa.webhookUrl, verifyToken: wa.verifyToken };
  };
  app.get("/api/reborn/admin/meta", requireAdmin(async (req, res) => { res.json({ ...(await metaView(req)), connect: await metaConnectStatus() }); }));
  // "Connect with Meta": log in to Facebook once, the Page / Instagram / WhatsApp number are found and saved (server/metaConnect.ts).
  app.post("/api/reborn/admin/meta/connect", requireAdmin(async (req, res) => {
    if (!metaOAuthAvailable()) return res.status(400).json({ message: tr(req, { en: "One-tap connect isn't set up on this server yet — enter the details by hand below.", zh: "此服务器尚未设置一键连接——请在下方手动填写。", id: "Hubungkan sekali ketuk belum disiapkan di server ini — isi datanya secara manual di bawah." }) });
    res.json({ url: await metaConnectUrl(getUserId(req)!, `https://${req.hostname}`) });
  }));
  app.post("/api/reborn/admin/meta/pick", requireAdmin(async (req, res) => {
    const saved = await metaPick(req.body?.pageId ? String(req.body.pageId) : undefined, req.body?.phoneId ? String(req.body.phoneId) : undefined);
    if (!saved) return res.status(400).json({ message: tr(req, { en: "Please connect with Facebook again", zh: "请重新连接 Facebook", id: "Silakan hubungkan Facebook lagi" }) });
    await logAdmin(req, { targetType: "whatsapp", action: "meta_connect", entityType: "whatsapp", description: `Connected Meta: ${[saved.page, saved.instagram && "@" + saved.instagram, saved.whatsapp].filter(Boolean).join(" · ")}` });
    res.json({ ...saved, message: tr(req, { en: "Connected", zh: "已连接", id: "Terhubung" }) });
  }));
  app.post("/api/reborn/admin/meta", requireAdmin(async (req, res) => {
    await saveMetaSettings({ pageId: req.body?.pageId, token: req.body?.token });
    await logAdmin(req, { targetType: "whatsapp", action: "meta_settings", entityType: "whatsapp", description: "Updated Facebook Messenger / Instagram settings" });
    res.json({ ...(await metaView(req)), test: await testMeta() });
  }));
  // QR login (WhatsApp Web / Linked Devices).
  app.post("/api/reborn/admin/whatsapp/web/connect", requireAdmin(async (_req, res) => {
    await startWhatsAppWeb();
    res.json(getWaWebStatus());
  }));
  app.get("/api/reborn/admin/whatsapp/web/qr", requireAdmin(async (_req, res) => {
    res.json(getWaWebStatus());
  }));
  app.post("/api/reborn/admin/whatsapp/web/logout", requireAdmin(async (req, res) => {
    await logoutWhatsAppWeb();
    await logAdmin(req, { targetType: "whatsapp", action: "web_logout", entityType: "whatsapp", description: "Unlinked WhatsApp Web session" });
    res.json(getWaWebStatus());
  }));
  app.post("/api/reborn/admin/whatsapp/run-reminders", requireAdmin(async (req, res) => {
    const out = { ...(await runReminders()), packages: await runPackageReminders({ anyTime: true }) };
    await logAdmin(req, { targetType: "whatsapp", action: "run_reminders", entityType: "whatsapp", description: `Reminders: ${out.bottles} bottle, ${out.comeback} comeback, ${out.feedback} feedback, ${out.packages} package` });
    res.json({ ...out, configured: whatsappConfigured() });
  }));
}
