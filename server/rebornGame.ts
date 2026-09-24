// Reborn Wave gamified economy: pet lifecycle, spin-the-wheel, support/FAQ, admin config.
import type { Express, Request, Response } from "express";
import { and, desc, eq, sql, inArray } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { requireAuth, getUserId } from "./multiAuth";
import bcrypt from "bcryptjs";
import { sendEmail } from "./emailService";
import { crmRecordVisit, whatsappConfigured, runReminders } from "./whatsappBot";
import { getWaWebStatus, startWhatsAppWeb, logoutWhatsAppWeb } from "./whatsappWeb";
import { sendAdminMessage, sendReviewRequest, notifyAdmins, sendWhatsApp } from "./whatsappBot";
import { generateLayaSupportReply } from "./layaAgent";
import { sendRebornAllNotification, sendRebornStaffNotification, sendRebornUserNotification } from "./bridgeX";
import { emitLiveUpdate } from "./liveUpdates";
import { searchSongCatalog, textPinyin } from "./songSearch";
import { TOP_SONGS_500 } from "./topSongs500";
import { createBooking, bookingHoursSummary, todayStr, parseAreas, enabledAreas, areaSlotsForDate, areaSlotLabelsForDate, areaHoursTextForDate, areaOpenHourForDate, isTableTaken, isAreaBlocked, takenTablesForDate, bookingWhen, BLOCK_ALL } from "./booking";
import {
  pets, users, tokenTransactions, activationCodes, petPills,
  spinPrizes, spinResults, faqItems, supportTickets, supportMessages,
  kosGifts, songs, songRequests, friendships, chatMessages,
  appSettings, kosGiftTypes, adminLogs, topUpRequests, events,
  posProducts, posTickets, posTicketItems, stockMovements, ledgerEntries, bottleKeeps, crmContacts, crmMessages, appointments,
  staffAttendance, workerShifts, leaveRequests, bridgeCompanies, bridgeCompanyMembers, bridgePositions, bridgeStaffProfiles, bridgeStaffReviews, commissionHistory,
} from "@shared/schema";
import { ilike, or } from "drizzle-orm";

// KGOLD economy defaults (admin-editable via app_settings)
const SETTINGS_DEFAULTS: Record<string, string> = {
  giftFeePercent: "30",     // % kept by the club; recipient gets the rest
  kgoldPerRp: "100",        // 100 KGOLD = 1 RP
  minBuyKgold: "1000000",   // minimum KGOLD purchase
  minCashoutRp: "1000",     // minimum RP a member can cash out
  taxPercent: "0",          // POS sales tax %
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
};
async function getSettings() {
  const rows = await db.select().from(appSettings);
  const map: Record<string, string> = { ...SETTINGS_DEFAULTS };
  for (const r of rows) if (r.key in map || true) map[r.key] = r.value ?? map[r.key];
  const companySettingsResult = await db.execute(sql`SELECT s.config FROM bridge_company_settings s JOIN bridge_companies c ON c.id=s.company_id WHERE c.slug='reborn-wave-group' LIMIT 1`);
  const companyConfig: any = (companySettingsResult.rows || companySettingsResult as any)[0]?.config || {};
  return {
    giftFeePercent: Number(map.giftFeePercent) || 30,
    kgoldPerRp: Number(map.kgoldPerRp) || 100,
    minBuyKgold: Number(map.minBuyKgold) || 1000000,
    minCashoutRp: Number(map.minCashoutRp) || 1000,
    taxPercent: Number(map.taxPercent) || 0,
    clubName: map.clubName || "Reborn Wave Group",
    receiptLogoUrl: map.receiptLogoUrl || "",
    receiptFooter: map.receiptFooter || "",
    posAutoPrint: map.posAutoPrint === "true",
    bookingImageUrl: map.bookingImageUrl || "",
    bookingNote: map.bookingNote || "",
    bookingTables: map.bookingTables || "V1,V2,1,2,3,4,5,T6,T7,T8,T9",
    bookingAreas: map.bookingAreas || "",
    googleReviewUrl: map.googleReviewUrl || "",
    businessAddress: map.businessAddress || SETTINGS_DEFAULTS.businessAddress,
    businessMapUrl: map.businessMapUrl || "",
    houseReferralUserId: map.houseReferralUserId || "",
    spinPoolPercent: Number(map.spinPoolPercent) || 10,
    spinPoolMin: Math.max(1000000, Number(map.spinPoolMin) || 1000000),
    spinPoolBalance: Number(map.spinPoolBalance) || 0,
    spinTokenCost: Math.max(1, Number(map.spinTokenCost) || 1),
    spinAssumedBill: Math.max(0, Number(map.spinAssumedBill) || 500000),
    mainAdminPassword: map.mainAdminPassword || "",
    songRequestModeEnabled: map.songRequestModeEnabled !== "false",
    loyalty: companyConfig.loyalty || { pointsSpendRp: 1000, rewardsEnabled: true, tiers: [] },
  };
}
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
  { name: "Rose", emoji: "🌹", animation: "float", kgoldCost: 100, sortOrder: 0 },
  { name: "Heart", emoji: "❤️", animation: "pop", kgoldCost: 500, sortOrder: 1 },
  { name: "Fireworks", emoji: "🎆", animation: "rain", kgoldCost: 5000, sortOrder: 2 },
  { name: "Diamond", emoji: "💎", animation: "zoom", kgoldCost: 20000, sortOrder: 3 },
  { name: "Crown", emoji: "👑", animation: "zoom", kgoldCost: 100000, sortOrder: 4 },
  { name: "Sports Car", emoji: "🏎️", animation: "float", kgoldCost: 500000, sortOrder: 5 },
];
async function seedGiftTypesIfEmpty() {
  const existing = await db.select({ id: kosGiftTypes.id }).from(kosGiftTypes).limit(1);
  if (existing.length === 0) await db.insert(kosGiftTypes).values(DEFAULT_GIFT_TYPES);
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
const ENERGY_REGEN_PER_MIN = 0.1;   // sleeping: +1 energy per 10 min
const ACTION_ENERGY_COST = 10;      // feed/play/clean each cost energy
const STAT_GAIN = 30;               // play/clean raise their bar by 30%
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
    if (!(await isAdmin(uid))) return res.status(403).json({ message: "Admin only" });
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
    if (!(await isStaff(uid))) return res.status(403).json({ message: "Staff only" });
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
  let hunger = pet.hunger ?? 60, happiness = pet.happiness ?? 60, cleanliness = pet.cleanliness ?? 60, energy = pet.energy ?? 60;
  if (mins >= 1) {
    hunger = clamp(hunger - mins * DECAY_PER_MIN);
    happiness = clamp(happiness - mins * DECAY_PER_MIN);
    cleanliness = clamp(cleanliness - mins * DECAY_PER_MIN);
    energy = pet.isSleeping ? clamp(energy + mins * ENERGY_REGEN_PER_MIN) : clamp(energy - mins * DECAY_PER_MIN);
    await db.update(pets).set({ hunger, happiness, cleanliness, energy, lifeStatus, lastDecayTime: now, updatedAt: now }).where(eq(pets.id, pet.id));
  } else if (lifeStatus !== pet.lifeStatus) {
    await db.update(pets).set({ lifeStatus, updatedAt: now }).where(eq(pets.id, pet.id));
  }
  return { ...pet, hunger, happiness, cleanliness, energy, lifeStatus };
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

async function seedPrizesIfEmpty() {
  const existing = await db.select({ id: spinPrizes.id }).from(spinPrizes).limit(1);
  if (existing.length === 0) {
    await db.insert(spinPrizes).values(DEFAULT_PRIZES.map((p, i) => ({ ...p, sortOrder: i })));
  }
}
async function seedFaqIfEmpty() {
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

export function registerRebornRoutes(app: Express) {
  console.log("*** REBORN GAME ROUTES REGISTERED");

  // ── Pets ────────────────────────────────────────────────────────────────
  app.get("/api/reborn/pets", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const rows = await db.select().from(pets).where(and(eq(pets.userId, userId), eq(pets.isActive, true)));
      const refreshed = [];
      for (const p of rows) refreshed.push(petView(await refreshPet(p)));
      res.json(refreshed);
    } catch (e) { console.error("reborn pets", e); res.status(500).json({ message: "Failed to load pets" }); }
  });

  app.post("/api/reborn/activate", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const code = String(req.body?.code || "").trim().toUpperCase();
      if (!code) return res.status(400).json({ message: "Enter your activation code" });
      const [row] = await db.select().from(activationCodes).where(eq(activationCodes.code, code));
      if (!row) return res.status(404).json({ message: "Code not found. Check the code on your package." });
      if (row.used) return res.status(400).json({ message: "This code has already been used." });
      const living = await db.select({ id: pets.id }).from(pets).where(and(eq(pets.userId, userId), eq(pets.isActive, true), sql`${pets.lifeStatus} != 'dead'`));
      if (living.length >= MAX_PETS) return res.status(400).json({ message: `You can only have ${MAX_PETS} pets at a time.` });
      const now = new Date();
      const [pet] = await db.insert(pets).values({
        userId, toyId: 0, name: row.petName || "Doluruu", type: "virtual",
        gender: row.petGender || "male", isActive: true, lifeStatus: "active",
        activatedAt: now, expiresAt: addDays(LIFE_DAYS, now), feedsToday: 0,
        happiness: 60, hunger: 60, cleanliness: 60, energy: 60,
      }).returning();
      await db.update(activationCodes).set({ used: true, usedByUserId: userId, usedAt: now }).where(eq(activationCodes.id, row.id));
      res.json({ message: "Your Doluruu is alive! Feed it 2 times a day to earn tokens.", pet: petView(pet) });
    } catch (e) { console.error("reborn activate", e); res.status(500).json({ message: "Activation failed" }); }
  });

  app.post("/api/reborn/feed", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const petId = Number(req.body?.petId);
      const [petRow] = await db.select().from(pets).where(and(eq(pets.id, petId), eq(pets.userId, userId)));
      if (!petRow) return res.status(404).json({ message: "Pet not found" });
      const pet = await refreshPet(petRow);
      if (pet.isEgg) return res.status(400).json({ message: "This is still an egg — it needs to hatch first." });
      if (pet.lifeStatus !== "active") return res.status(400).json({ message: "Your pet is sick. Get a revival pill from staff after a 300,000 RP visit." });

      const today = wibDay();
      let feeds = pet.lastFeedDay === today ? (pet.feedsToday || 0) : 0;
      if (feeds >= FEEDS_PER_DAY) return res.status(400).json({ message: "You've already fed your pet 2 times today. Come back tomorrow!" });
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
        message: tokenAwarded ? "Full belly! You earned 1 token 🎉" : `Fed! ${FEEDS_PER_DAY - feeds} more feed(s) today for your token.`,
        tokenAwarded, pet: petView(fresh),
      });
    } catch (e) { console.error("reborn feed", e); res.status(500).json({ message: "Feeding failed" }); }
  });

  app.post("/api/reborn/action", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const petId = Number(req.body?.petId);
      const action = String(req.body?.action || "");
      const [petRow] = await db.select().from(pets).where(and(eq(pets.id, petId), eq(pets.userId, userId)));
      if (!petRow) return res.status(404).json({ message: "Pet not found" });
      const pet = await refreshPet(petRow);
      if (pet.isEgg) return res.status(400).json({ message: "This is still an egg — it needs to hatch first." });
      if (pet.lifeStatus !== "active") return res.status(400).json({ message: "Your pet is sick. Get a revival pill from staff after a 300,000 RP visit." });

      const now = new Date(); const today = wibDay();
      let hunger = pet.hunger, happiness = pet.happiness, cleanliness = pet.cleanliness, energy = pet.energy;
      const update: any = { updatedAt: now, lastDecayTime: now, isSleeping: false };
      let tokenAwarded = false; let message = "";

      if (action === "sleep") {
        update.isSleeping = true; update.sleepStartTime = now;
        message = "Zzz… your pet is sleeping and will regain energy over time.";
      } else if (action === "wake") {
        message = "Rise and shine! ☀️"; // isSleeping already cleared via update default
      } else if (action === "feed") {
        const nowMs = now.getTime();
        if (hunger >= 100) return res.status(400).json({ message: "Your pet is full — no need to feed right now." });
        if (energy <= 0) return res.status(400).json({ message: "Too tired! Tap Sleep to recover energy first." });
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
            message = "Full belly! You earned today's token 🎉";
          } else {
            message = `Yum! +50% hunger · ${Math.max(0, FEEDS_PER_DAY - feeds)} more spaced feed(s) for today's token.`;
          }
        } else {
          message = "Yum! +50% hunger. (Feed ~4h apart to count toward your token.)";
        }
      } else if (action === "play" || action === "clean") {
        if (energy <= 0) return res.status(400).json({ message: "Too tired! Tap Sleep to recover energy first." });
        energy = clamp(energy - ACTION_ENERGY_COST);
        if (action === "play") { happiness = clamp(happiness + STAT_GAIN); message = "So much fun! Joy +30"; }
        else { cleanliness = clamp(cleanliness + STAT_GAIN); message = "Squeaky clean! +30"; }
      } else {
        return res.status(400).json({ message: "Unknown action" });
      }
      update.hunger = hunger; update.happiness = happiness; update.cleanliness = cleanliness; update.energy = energy;
      await db.update(pets).set(update).where(eq(pets.id, petId));
      const [fresh] = await db.select().from(pets).where(eq(pets.id, petId));
      res.json({ message, tokenAwarded, pet: petView(fresh) });
    } catch (e) { console.error("reborn action", e); res.status(500).json({ message: "Action failed" }); }
  });

  app.post("/api/reborn/use-pill", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const petId = Number(req.body?.petId);
      const [petRow] = await db.select().from(pets).where(and(eq(pets.id, petId), eq(pets.userId, userId)));
      if (!petRow) return res.status(404).json({ message: "Pet not found" });
      const [pill] = await db.select().from(petPills).where(and(eq(petPills.userId, userId), eq(petPills.status, "available"))).limit(1);
      if (!pill) return res.status(400).json({ message: "You don't have a revival pill. Visit us and spend 300,000 RP to get one from staff." });
      const now = new Date();
      await db.update(petPills).set({ status: "used", usedAt: now }).where(eq(petPills.id, pill.id));
      await db.update(pets).set({
        lifeStatus: "active", expiresAt: addDays(LIFE_DAYS, now), feedsToday: 0, lastFeedDay: null,
        pillsUsed: (petRow.pillsUsed || 0) + 1, updatedAt: now,
      }).where(eq(pets.id, petId));
      const [fresh] = await db.select().from(pets).where(eq(pets.id, petId));
      res.json({ message: "Revived! Your Doluruu is healthy for another 15 days.", pet: petView(fresh) });
    } catch (e) { console.error("reborn pill", e); res.status(500).json({ message: "Revive failed" }); }
  });

  app.get("/api/reborn/pills", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const rows = await db.select().from(petPills).where(and(eq(petPills.userId, userId), eq(petPills.status, "available")));
      res.json({ available: rows.length });
    } catch { res.json({ available: 0 }); }
  });

  // ── Spin the wheel ───────────────────────────────────────────────────────
  app.get("/api/reborn/spin/prizes", async (_req, res) => {
    try {
      await seedPrizesIfEmpty();
      const rows = await db.select().from(spinPrizes).where(eq(spinPrizes.active, true)).orderBy(spinPrizes.sortOrder);
      res.json({ cost: (await getSettings()).spinTokenCost, prizes: rows });
    } catch (e) { console.error("spin prizes", e); res.status(500).json({ message: "Failed to load prizes" }); }
  });

  app.post("/api/reborn/spin", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      await seedPrizesIfEmpty();
      const spinSettings = await getSettings();
      const spinCost = spinSettings.spinTokenCost;
      const user = await storage.getUser(userId);
      if (!user || (user.tokens || 0) < spinCost) return res.status(400).json({ message: `Not enough tokens (need ${spinCost}). Feed your pet to earn more.` });

      const prizes = await db.select().from(spinPrizes).where(eq(spinPrizes.active, true)).orderBy(spinPrizes.sortOrder);
      if (prizes.length === 0) return res.status(400).json({ message: "The wheel isn't set up yet. Please check back soon." });
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
        userId, prizeId: picked.id, prizeLabel: picked.label, prizeType: picked.prizeType,
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
          picked.prizeType === "nothing" ? "So close! Better luck next spin." :
          freeSpin ? "Free spin! Go again — this one's on us." :
          picked.prizeType === "pill" ? "You won a revival pill! Use it to revive or extend a pet." :
          picked.prizeType === "egg" ? "You won a Doluruu egg! It will hatch in 15 days." :
          `You won ${picked.label}! Show it to staff to redeem.`,
      });
    } catch (e) { console.error("spin", e); res.status(500).json({ message: "Spin failed" }); }
  });

  app.get("/api/reborn/spin/history", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const rows = await db.select().from(spinResults).where(eq(spinResults.userId, userId)).orderBy(desc(spinResults.createdAt)).limit(50);
      res.json(rows);
    } catch { res.json([]); }
  });

  // My redeemable prizes + whether the once-per-24h "use" is available
  app.get("/api/reborn/prizes", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const rows = await db.select().from(spinResults)
        .where(and(eq(spinResults.userId, userId), sql`${spinResults.status} in ('unused','redeeming','redeemed')`))
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
      if (!prize) return res.status(404).json({ message: "Prize not found" });
      if (prize.status !== "unused") return res.status(400).json({ message: "This prize can't be used." });
      const recent = await db.select().from(spinResults).where(and(eq(spinResults.userId, userId), sql`${spinResults.status} in ('redeeming','redeemed')`, sql`${spinResults.redeemedAt} > ${new Date(Date.now() - DAY_MS)}`));
      if (recent.length > 0) {
        const last = recent.sort((a, b) => new Date(b.redeemedAt!).getTime() - new Date(a.redeemedAt!).getTime())[0];
        const hrs = Math.ceil((new Date(last.redeemedAt!).getTime() + DAY_MS - Date.now()) / (60 * 60 * 1000));
        return res.status(400).json({ message: `You can only use 1 prize per day. Try again in ~${hrs}h.` });
      }
      const [row] = await db.update(spinResults).set({ status: "redeeming", redeemedAt: new Date() }).where(eq(spinResults.id, id)).returning();
      res.json({ message: "Prize activated! Show it to staff to receive it.", prize: row });
    } catch (e) { console.error("use prize", e); res.status(500).json({ message: "Failed" }); }
  });

  // ── Support + FAQ ────────────────────────────────────────────────────────
  app.get("/api/reborn/faq", async (_req, res) => {
    try {
      await seedFaqIfEmpty();
      const rows = await db.select().from(faqItems).where(eq(faqItems.active, true)).orderBy(faqItems.sortOrder);
      res.json(rows);
    } catch (e) { console.error("faq", e); res.status(500).json({ message: "Failed to load FAQ" }); }
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
    } catch (e) { console.error("support msgs", e); res.status(500).json({ message: "Failed to load chat" }); }
  });

  app.post("/api/reborn/support/ask", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const content = String(req.body?.message || "").trim();
      if (!content) return res.status(400).json({ message: "Type a message first" });
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
      const faqContext = faqs
        .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
        .join("\n\n");
      let autoReply = await generateLayaSupportReply({
        ticketId: ticket.id,
        message: content,
        category: ticket.category,
        faqContext,
      });
      if (!autoReply && best && bestScore > 0) autoReply = best.answer;
      if (autoReply) {
        await db.insert(supportMessages).values({ ticketId: ticket.id, senderType: "ai", content: autoReply });
        await db.update(supportTickets).set({ status: "ai_replied", updatedAt: new Date() }).where(eq(supportTickets.id, ticket.id));
      }
      const msgs = await db.select().from(supportMessages).where(eq(supportMessages.ticketId, ticket.id)).orderBy(supportMessages.createdAt);
      res.json({ ticketId: ticket.id, autoReply, messages: msgs });
    } catch (e) { console.error("support ask", e); res.status(500).json({ message: "Send failed" }); }
  });

  // ── KOS (Kings of Singers) — KGOLD gifting + leaderboard ─────────────────
  app.get("/api/reborn/kos/leaderboard", async (_req, res) => {
    try {
      const rows = await db.select({
        id: users.id, firstName: users.firstName, username: users.username, photo: users.profileImageUrl,
        stars: sql<number>`coalesce(sum(${kosGifts.recipientKgold}),0)`,
      }).from(kosGifts).innerJoin(users, eq(users.id, kosGifts.toUserId))
        .groupBy(users.id, users.firstName, users.username, users.profileImageUrl)
        .orderBy(desc(sql`sum(${kosGifts.recipientKgold})`)).limit(100);
      res.json(rows);
    } catch (e) { console.error("kos leaderboard", e); res.status(500).json({ message: "Failed to load leaderboard" }); }
  });

  app.get("/api/reborn/kos/search", requireAuth, async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      const me = getUserId(req)!;
      if (q.length < 2) return res.json([]);
      const rows = await db.select({ id: users.id, firstName: users.firstName, username: users.username, photo: users.profileImageUrl })
        .from(users).where(and(sql`${users.id} <> ${me}`, or(ilike(users.username, `%${q}%`), ilike(users.firstName, `%${q}%`)))).limit(20);
      res.json(rows);
    } catch { res.json([]); }
  });

  app.get("/api/reborn/kos/gifttypes", async (_req, res) => {
    try {
      await seedGiftTypesIfEmpty();
      const rows = await db.select().from(kosGiftTypes).where(eq(kosGiftTypes.active, true)).orderBy(kosGiftTypes.sortOrder);
      res.json(rows);
    } catch (e) { console.error("gifttypes", e); res.status(500).json({ message: "Failed" }); }
  });

  app.get("/api/reborn/kos/wallet", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const u = await storage.getUser(userId);
      const s = await getSettings();
      const [got] = await db.select({ stars: sql<number>`coalesce(sum(${kosGifts.recipientKgold}),0)` }).from(kosGifts).where(eq(kosGifts.toUserId, userId));
      res.json({
        kgold: u?.kgold ?? 0, credits: Number(u?.credits || 0), starsReceived: Number(got?.stars || 0),
        kgoldPerRp: s.kgoldPerRp, minBuyKgold: s.minBuyKgold, minCashoutRp: s.minCashoutRp, feePercent: s.giftFeePercent,
      });
    } catch (e) { console.error("kos wallet", e); res.status(500).json({ message: "Failed" }); }
  });

  app.post("/api/reborn/kos/buy", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const kgold = Math.floor(Number(req.body?.kgold) || 0);
      const s = await getSettings();
      if (kgold < s.minBuyKgold) return res.status(400).json({ message: `Minimum purchase is ${s.minBuyKgold.toLocaleString()} KGOLD.` });
      const rpCost = kgold / s.kgoldPerRp;
      const u = await storage.getUser(userId);
      if (!u || Number(u.credits || 0) < rpCost) return res.status(400).json({ message: `Not enough credits. This costs RP ${rpCost.toLocaleString()}.` });
      const now = new Date();
      await db.update(users).set({ credits: sql`${users.credits} - ${rpCost}`, kgold: sql`${users.kgold} + ${kgold}`, updatedAt: now }).where(eq(users.id, userId));
      const fresh = await storage.getUser(userId);
      res.json({ message: `Bought ${kgold.toLocaleString()} KGOLD.`, kgold: fresh?.kgold ?? 0, credits: Number(fresh?.credits || 0) });
    } catch (e) { console.error("kos buy", e); res.status(500).json({ message: "Purchase failed" }); }
  });

  app.post("/api/reborn/kos/cashout", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const s = await getSettings();
      const u = await storage.getUser(userId);
      const kgoldBal = u?.kgold ?? 0;
      const kgold = Math.floor(Number(req.body?.kgold) || kgoldBal);
      const rp = kgold / s.kgoldPerRp;
      if (rp < s.minCashoutRp) return res.status(400).json({ message: `You need at least ${(s.minCashoutRp * s.kgoldPerRp).toLocaleString()} KGOLD (RP ${s.minCashoutRp.toLocaleString()}) to cash out.` });
      if (kgold > kgoldBal) return res.status(400).json({ message: "Not enough KGOLD." });
      const now = new Date();
      await db.update(users).set({ kgold: sql`${users.kgold} - ${kgold}`, credits: sql`${users.credits} + ${rp}`, updatedAt: now }).where(eq(users.id, userId));
      const fresh = await storage.getUser(userId);
      res.json({ message: `Cashed out ${kgold.toLocaleString()} KGOLD → RP ${rp.toLocaleString()} credits.`, kgold: fresh?.kgold ?? 0, credits: Number(fresh?.credits || 0) });
    } catch (e) { console.error("kos cashout", e); res.status(500).json({ message: "Cash out failed" }); }
  });

  app.post("/api/reborn/kos/gift", requireAuth, async (req, res) => {
    try {
      const fromUserId = getUserId(req)!;
      const toUserId = String(req.body?.toUserId || "");
      const giftTypeId = Number(req.body?.giftTypeId);
      if (!toUserId) return res.status(400).json({ message: "Choose someone to gift" });
      if (toUserId === fromUserId) return res.status(400).json({ message: "You can't gift yourself" });
      const [gt] = await db.select().from(kosGiftTypes).where(eq(kosGiftTypes.id, giftTypeId));
      if (!gt || !gt.active) return res.status(404).json({ message: "Gift not found" });
      const giver = await storage.getUser(fromUserId);
      const cost = gt.kgoldCost || 0;
      if (!giver || (giver.kgold || 0) < cost) return res.status(400).json({ message: `Need ${cost.toLocaleString()} KGOLD for a ${gt.name}. Buy more KGOLD first.` });
      const s = await getSettings();
      const recipientKgold = Math.floor(cost * (100 - s.giftFeePercent) / 100);
      const now = new Date();
      await db.update(users).set({ kgold: sql`${users.kgold} - ${cost}`, updatedAt: now }).where(eq(users.id, fromUserId));
      await db.update(users).set({ kgold: sql`${users.kgold} + ${recipientKgold}`, updatedAt: now }).where(eq(users.id, toUserId));
      await db.insert(kosGifts).values({ fromUserId, toUserId, giftTypeId, giftName: gt.name, kgoldCost: cost, recipientKgold, seen: false });
      await sendRebornUserNotification(toUserId, { type: "kos_gift", title: `${giver.firstName || giver.username || "Someone"} sent you ${gt.name}`, body: `You received ${recipientKgold.toLocaleString()} KGOLD`, data: { path: "/kos" } });
      const fresh = await storage.getUser(fromUserId);
      res.json({ message: `Sent a ${gt.name}!`, kgold: fresh?.kgold ?? 0 });
    } catch (e) { console.error("kos gift", e); res.status(500).json({ message: "Gift failed" }); }
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
        .where(and(eq(kosGifts.toUserId, userId), eq(kosGifts.seen, false)))
        .orderBy(desc(kosGifts.createdAt)).limit(20);
      res.json(rows);
    } catch { res.json([]); }
  });
  app.post("/api/reborn/kos/notifications/seen", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      await db.update(kosGifts).set({ seen: true }).where(and(eq(kosGifts.toUserId, userId), eq(kosGifts.seen, false)));
      res.json({ ok: true });
    } catch { res.json({ ok: false }); }
  });

  // ── Chat: friend requests + member-to-member messaging ───────────────────
  app.post("/api/reborn/chat/request", requireAuth, async (req, res) => {
    try {
      const me = getUserId(req)!;
      const toUserId = String(req.body?.toUserId || "");
      if (!toUserId || toUserId === me) return res.status(400).json({ message: "Pick a member to add" });
      const existing = await db.select().from(friendships).where(or(
        and(eq(friendships.requesterId, me), eq(friendships.addresseeId, toUserId)),
        and(eq(friendships.requesterId, toUserId), eq(friendships.addresseeId, me)),
      ));
      if (existing.length) return res.json({ message: existing[0].status === "accepted" ? "You're already friends" : "Request already pending" });
      await db.insert(friendships).values({ requesterId: me, addresseeId: toUserId, status: "pending" });
      const sender = await storage.getUser(me);
      await sendRebornUserNotification(toUserId, { type: "friend_request", title: "New friend request", body: `${sender?.firstName || sender?.username || "A member"} wants to connect`, data: { path: "/chat" } });
      res.json({ message: "Friend request sent!" });
    } catch (e) { console.error("chat req", e); res.status(500).json({ message: "Request failed" }); }
  });

  app.post("/api/reborn/chat/respond", requireAuth, async (req, res) => {
    try {
      const me = getUserId(req)!;
      const id = Number(req.body?.id);
      const accept = req.body?.accept !== false;
      const [f] = await db.select().from(friendships).where(eq(friendships.id, id));
      if (!f || f.addresseeId !== me) return res.status(404).json({ message: "Request not found" });
      if (accept) await db.update(friendships).set({ status: "accepted", updatedAt: new Date() }).where(eq(friendships.id, id));
      else await db.delete(friendships).where(eq(friendships.id, id));
      res.json({ message: accept ? "You're now friends!" : "Request declined" });
    } catch (e) { console.error("chat respond", e); res.status(500).json({ message: "Failed" }); }
  });

  app.get("/api/reborn/chat/friends", requireAuth, async (req, res) => {
    try {
      const me = getUserId(req)!;
      const all = await db.select().from(friendships).where(or(eq(friendships.requesterId, me), eq(friendships.addresseeId, me)));
      const otherIds = Array.from(new Set(all.map((f) => (f.requesterId === me ? f.addresseeId : f.requesterId))));
      const userRows = otherIds.length ? await db.select({ id: users.id, firstName: users.firstName, username: users.username, photo: users.profileImageUrl }).from(users).where(sql`${users.id} in (${sql.join(otherIds.map((i) => sql`${i}`), sql`, `)})`) : [];
      const umap = Object.fromEntries(userRows.map((u) => [u.id, u]));
      const friends = all.filter((f) => f.status === "accepted").map((f) => { const oid = f.requesterId === me ? f.addresseeId : f.requesterId; return { friendshipId: f.id, user: umap[oid] || { id: oid } }; });
      const incoming = all.filter((f) => f.status === "pending" && f.addresseeId === me).map((f) => ({ friendshipId: f.id, user: umap[f.requesterId] || { id: f.requesterId } }));
      const outgoing = all.filter((f) => f.status === "pending" && f.requesterId === me).map((f) => ({ friendshipId: f.id, user: umap[f.addresseeId] || { id: f.addresseeId } }));
      res.json({ friends, incoming, outgoing });
    } catch (e) { console.error("chat friends", e); res.status(500).json({ message: "Failed" }); }
  });

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
      if (!(await areFriends(me, other))) return res.status(403).json({ message: "You're not friends yet" });
      const msgs = await db.select().from(chatMessages).where(or(
        and(eq(chatMessages.senderId, me), eq(chatMessages.receiverId, other)),
        and(eq(chatMessages.senderId, other), eq(chatMessages.receiverId, me)),
      )).orderBy(chatMessages.createdAt).limit(200);
      res.json(msgs);
    } catch (e) { console.error("chat msgs", e); res.status(500).json({ message: "Failed" }); }
  });

  app.post("/api/reborn/chat/send", requireAuth, async (req, res) => {
    try {
      const me = getUserId(req)!;
      const toUserId = String(req.body?.toUserId || "");
      const content = String(req.body?.content || "").trim();
      if (!content) return res.status(400).json({ message: "Empty message" });
      if (!(await areFriends(me, toUserId))) return res.status(403).json({ message: "You're not friends yet" });
      await db.insert(chatMessages).values({ senderId: me, receiverId: toUserId, content });
      const sender = await storage.getUser(me);
      await sendRebornUserNotification(toUserId, { type: "chat_message", title: sender?.firstName || sender?.username || "New message", body: content.slice(0, 140), data: { path: "/chat", fromUserId: me } });
      res.json({ message: "sent" });
    } catch (e) { console.error("chat send", e); res.status(500).json({ message: "Send failed" }); }
  });

  // ── Song requests + Top 500 library ──────────────────────────────────────
  app.get("/api/reborn/songs", async (_req, res) => {
    try {
      await seedSongsIfEmpty();
      const rows = await db.select().from(songs).orderBy(desc(songs.isHit), desc(songs.requestCount), songs.title).limit(500);
      res.json(rows);
    } catch (e) { console.error("songs", e); res.status(500).json({ message: "Failed to load songs" }); }
  });

  app.get("/api/reborn/songs/search", requireAuth, async (req, res) => {
    try {
      await seedSongsIfEmpty();
      res.json(await searchSongCatalog(req.query.q, 10));
    } catch (e) {
      console.error("song search", e);
      res.status(500).json({ message: "Song search failed" });
    }
  });

  app.post("/api/reborn/songs/request", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      let { songId, title, titlePinyin, artist, artistPinyin, spotifyUrl, artistPhoto, performanceMode } = req.body || {};
      const songSettings = await getSettings();
      performanceMode = songSettings.songRequestModeEnabled && performanceMode === "singer" ? "singer" : "self";
      let song: any = null;
      if (songId) {
        [song] = await db.select().from(songs).where(eq(songs.id, Number(songId)));
        if (!song) return res.status(404).json({ message: "Song not found" });
        await db.update(songs).set({ requestCount: (song.requestCount || 0) + 1 }).where(eq(songs.id, song.id));
        title = song.title; artist = song.artist;
      } else {
        title = String(title || "").trim();
        if (!title && titlePinyin) title = String(titlePinyin).trim();
        if (!title) return res.status(400).json({ message: "Enter the song name" });
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
      const [reqRow] = await db.insert(songRequests).values({ userId, songId: Number(songId), title: song.title, artist: song.artist || "", performanceMode, status: "pending" }).returning();
      await sendRebornStaffNotification({
        type: "song_request",
        title: "New app song request",
        body: `${song.title}${song.artist ? ` - ${song.artist}` : ""} · ${performanceMode === "singer" ? "By singer" : "Self sing"}`,
        data: { path: "/reborn-admin", songRequestId: reqRow.id, source: "app" },
      });
      res.json({ message: "Request sent! Staff will confirm it shortly.", request: reqRow });
    } catch (e) { console.error("song request", e); res.status(500).json({ message: "Request failed" }); }
  });

  app.get("/api/reborn/songs/my-requests", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const rows = await db.select().from(songRequests).where(eq(songRequests.userId, userId)).orderBy(desc(songRequests.createdAt)).limit(100);
      res.json(rows);
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
    if (!targetUserId) return res.status(400).json({ message: "userId required" });
    await db.insert(petPills).values({ userId: targetUserId, grantedBy: adminId, note: req.body?.note || "300,000 RP visit reward" });
    await logAdmin(req, { targetUserId, targetType: "user", action: "create", entityType: "pill", description: `Granted a revival pill to ${targetUserId}` });
    res.json({ message: "Pill granted" });
  }));

  app.get("/api/reborn/admin/prizes", requireAdmin(async (_req, res) => {
    await seedPrizesIfEmpty();
    const rows = await db.select().from(spinPrizes).orderBy(spinPrizes.sortOrder);
    res.json(rows);
  }));
  app.post("/api/reborn/admin/prizes", requireAdmin(async (req, res) => {
    const b = req.body || {};
    const [row] = await db.insert(spinPrizes).values({
      label: b.label || "New prize", description: b.description || "", prizeType: b.prizeType || "item",
      value: Number(b.value) || 0, costRp: Number(b.costRp) || 0, weight: Number(b.weight) || 10, colorHex: b.colorHex || "#c9a84c",
      active: b.active !== false, sortOrder: Number(b.sortOrder) || 0,
    }).returning();
    res.json(row);
  }));
  app.put("/api/reborn/admin/prizes/:id", requireAdmin(async (req, res) => {
    const id = Number(req.params.id); const b = req.body || {};
    const patch: any = { updatedAt: new Date() };
    for (const k of ["label", "description", "prizeType", "colorHex"]) if (b[k] !== undefined) patch[k] = b[k];
    for (const k of ["value", "costRp", "weight", "sortOrder"]) if (b[k] !== undefined) patch[k] = Number(b[k]);
    if (b.active !== undefined) patch.active = !!b.active;
    const [row] = await db.update(spinPrizes).set(patch).where(eq(spinPrizes.id, id)).returning();
    res.json(row);
  }));
  app.delete("/api/reborn/admin/prizes/:id", requireAdmin(async (req, res) => {
    await db.delete(spinPrizes).where(eq(spinPrizes.id, Number(req.params.id)));
    res.json({ message: "Deleted" });
  }));

  app.get("/api/reborn/admin/redemptions", requireStaff(async (_req, res) => {
    const rows = await db.select().from(spinResults).where(eq(spinResults.status, "redeeming")).orderBy(desc(spinResults.createdAt)).limit(200);
    res.json(rows);
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
      sortOrder: Number(b.sortOrder) || 0, active: b.active !== false,
    }).returning();
    if (row.active) await sendRebornAllNotification({ type: "new_faq", title: "New help answer", body: row.question, data: { path: "/support", faqId: row.id } });
    res.json(row);
  }));
  app.put("/api/reborn/admin/faq/:id", requireAdmin(async (req, res) => {
    const id = Number(req.params.id); const b = req.body || {};
    const patch: any = { updatedAt: new Date() };
    for (const k of ["question", "answer", "keywords"]) if (b[k] !== undefined) patch[k] = b[k];
    if (b.sortOrder !== undefined) patch.sortOrder = Number(b.sortOrder);
    if (b.active !== undefined) patch.active = !!b.active;
    const [row] = await db.update(faqItems).set(patch).where(eq(faqItems.id, id)).returning();
    res.json(row);
  }));
  app.delete("/api/reborn/admin/faq/:id", requireAdmin(async (req, res) => {
    await db.delete(faqItems).where(eq(faqItems.id, Number(req.params.id)));
    res.json({ message: "Deleted" });
  }));

  // Admin: song requests + song library
  app.get("/api/reborn/admin/song-requests", requireStaff(async (_req, res) => {
    const rows = await db.select().from(songRequests).where(eq(songRequests.status, "pending")).orderBy(desc(songRequests.createdAt)).limit(200);
    res.json(rows);
  }));
  app.post("/api/reborn/admin/song-requests/:id", requireStaff(async (req, res) => {
    const adminId = getUserId(req)!;
    const approve = req.body?.approve !== false;
    const comment = String(req.body?.comment || "").trim() || null;
    const [row] = await db.update(songRequests).set({ status: approve ? "confirmed" : "rejected", confirmedAt: new Date(), adminId, adminNote: comment }).where(eq(songRequests.id, Number(req.params.id))).returning();
    await logAdmin(req, { targetUserId: row?.userId, targetType: "song_request", targetId: req.params.id, action: approve ? "approve" : "reject", entityType: "song_request", description: `${approve ? "Confirmed" : "Rejected"} song "${row?.title}"${comment ? ` (${comment})` : ""}` });
    await sendRebornUserNotification(row?.userId, {
      type: "song_request_update",
      title: approve ? "Song request confirmed" : "Song request update",
      body: `${row?.title || "Your song"}${comment ? ` · ${comment}` : ""}`,
      data: { path: "/songs", songRequestId: row?.id, status: row?.status },
    });
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
    res.json({ message: "Deleted" });
  }));

  // Admin: KOS gift catalog + KGOLD settings
  app.get("/api/reborn/admin/gifttypes", requireAdmin(async (_req, res) => {
    await seedGiftTypesIfEmpty();
    res.json(await db.select().from(kosGiftTypes).orderBy(kosGiftTypes.sortOrder));
  }));
  app.post("/api/reborn/admin/gifttypes", requireAdmin(async (req, res) => {
    const b = req.body || {};
    const [row] = await db.insert(kosGiftTypes).values({
      name: b.name || "New gift", emoji: b.emoji || "🎁", imageUrl: b.imageUrl || null,
      animation: b.animation || "pop", kgoldCost: Number(b.kgoldCost) || 100, active: b.active !== false, sortOrder: Number(b.sortOrder) || 0,
    }).returning();
    res.json(row);
  }));
  app.put("/api/reborn/admin/gifttypes/:id", requireAdmin(async (req, res) => {
    const id = Number(req.params.id); const b = req.body || {}; const patch: any = {};
    for (const k of ["name", "emoji", "imageUrl", "animation"]) if (b[k] !== undefined) patch[k] = b[k];
    if (b.kgoldCost !== undefined) patch.kgoldCost = Number(b.kgoldCost);
    if (b.sortOrder !== undefined) patch.sortOrder = Number(b.sortOrder);
    if (b.active !== undefined) patch.active = !!b.active;
    const [row] = await db.update(kosGiftTypes).set(patch).where(eq(kosGiftTypes.id, id)).returning();
    res.json(row);
  }));
  app.delete("/api/reborn/admin/gifttypes/:id", requireAdmin(async (req, res) => {
    await db.delete(kosGiftTypes).where(eq(kosGiftTypes.id, Number(req.params.id)));
    res.json({ message: "Deleted" });
  }));

  app.get("/api/reborn/admin/settings", requireAdmin(async (_req, res) => {
    res.json(await getSettings());
  }));
  app.post("/api/reborn/admin/settings", requireAdmin(async (req, res) => {
    const allowed = ["giftFeePercent", "kgoldPerRp", "minBuyKgold", "minCashoutRp", "taxPercent", "clubName", "receiptLogoUrl", "receiptFooter", "posAutoPrint", "bookingImageUrl", "bookingNote", "bookingTables", "bookingAreas", "googleReviewUrl", "businessAddress", "businessMapUrl", "houseReferralUserId", "spinPoolPercent", "spinPoolMin", "spinTokenCost", "spinAssumedBill", "mainAdminPassword", "songRequestModeEnabled"];
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
      await db.execute(sql`UPDATE bridge_company_settings s SET config=jsonb_set(COALESCE(s.config,'{}'::jsonb),'{loyalty}',${JSON.stringify(clean)}::jsonb,true), updated_at=now() FROM bridge_companies c WHERE s.company_id=c.id AND c.slug='reborn-wave-group'`);
    }
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
    else return res.status(400).json({ message: "Provide 'add' or 'set'" });
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
    let rows = q.length >= 1
      ? await db.select(userCols).from(users).where(or(ilike(users.username, `${q}%`), ilike(users.firstName, `${q}%`), ilike(users.lastName, `${q}%`), ilike(users.email, `${q}%`), ilike(users.membershipCardNumber, `${q}%`), ilike(users.referralCode, `${q}%`))).orderBy(users.firstName).limit(60)
      : await db.select(userCols).from(users).orderBy(sort === "tokens" ? desc(users.tokens) : desc(users.createdAt)).limit(200);
    if (filter === "active") rows = rows.filter((u: any) => (u.tokens || 0) > 0 || (u.loyaltyPoints || 0) > 0 || Number(u.credits || 0) > 0 || (u.kgold || 0) > 0);
    if (filter === "admin") rows = rows.filter((u: any) => u.role === "admin" || u.role === "staff");
    if (sort === "tokens") rows = [...rows].sort((a: any, b: any) => (b.tokens || 0) - (a.tokens || 0));
    // Whole-base summary (independent of the current page/filter).
    const [agg] = await db.select({ count: sql<number>`count(*)`, tokens: sql<number>`coalesce(sum(${users.tokens}),0)`, points: sql<number>`coalesce(sum(${users.loyaltyPoints}),0)` }).from(users);
    const reborn = (await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.slug, "reborn-wave-group")).limit(1))[0];
    let positionRows: any[] = [];
    if (reborn) { const result = await db.execute(sql`SELECT m.user_id, m.position_id, m.branch_id, p.name position_name FROM bridge_company_members m LEFT JOIN bridge_positions p ON p.id=m.position_id WHERE m.company_id=${reborn.id}`); positionRows = (result.rows || result) as any[]; }
    res.json({ users: rows.map((u:any) => ({ ...u, ...(positionRows.find(p => p.user_id === u.id) || {}) })), summary: { totalUsers: Number(agg?.count) || 0, totalTokens: Number(agg?.tokens) || 0, totalPoints: Number(agg?.points) || 0 } });
  }));
  // Delete a user (admin only; not yourself).
  app.delete("/api/reborn/admin/users/:id", requireAdmin(async (req, res) => {
    const id = req.params.id;
    if (id === getUserId(req)) return res.status(400).json({ message: "You can't delete your own account" });
    const [u] = await db.select().from(users).where(eq(users.id, id));
    if (!u) return res.status(404).json({ message: "User not found" });
    await db.delete(users).where(eq(users.id, id));
    await logAdmin(req, { targetUserId: id, targetType: "user", action: "delete", entityType: "user", description: `Deleted user ${u.username || u.email || id}` });
    res.json({ message: "User deleted" });
  }));
  // Main-admin reset: zero all member balances/points + the prize pool. Keeps users & items.
  app.post("/api/reborn/admin/reset-numbers", requireAdmin(async (req, res) => {
    const s = await getSettings();
    if (!s.mainAdminPassword) return res.status(400).json({ message: "Set a main-admin password in Settings first." });
    if (String(req.body?.password || "") !== s.mainAdminPassword) return res.status(403).json({ message: "Wrong main-admin password." });
    await db.update(users).set({ tokens: 0, loyaltyPoints: 0, lifetimePoints: 0, credits: "0.00", kgold: 0, referralEarnings: "0.00", updatedAt: new Date() });
    await setSpinPool(0);
    await logAdmin(req, { targetType: "system", action: "reset_numbers", entityType: "system", description: "Reset all member balances/points + prize pool" });
    res.json({ message: "All member balances, points, tokens and the prize pool have been reset to 0." });
  }));
  app.post("/api/reborn/admin/users/:id", requireAdmin(async (req, res) => {
    const id = req.params.id; const b = req.body || {};
    const [old] = await db.select().from(users).where(eq(users.id, id));
    if (!old) return res.status(404).json({ message: "User not found" });
    const patch: any = { updatedAt: new Date() };
    if (b.credits !== undefined) patch.credits = String(Number(b.credits));
    if (b.loyaltyPoints !== undefined) patch.loyaltyPoints = Number(b.loyaltyPoints);
    if (b.tokens !== undefined) patch.tokens = Number(b.tokens);
    if (b.kgold !== undefined) patch.kgold = Number(b.kgold);
    if (b.role !== undefined && ["admin", "staff", "user"].includes(b.role)) patch.role = b.role;
    if (b.email !== undefined) patch.email = String(b.email).trim().toLowerCase() || null;
    if (b.firstName !== undefined) patch.firstName = b.firstName;
    if (b.lastName !== undefined) patch.lastName = b.lastName;
    if (b.username !== undefined) {
      const uname = String(b.username).trim();
      if (uname) {
        const [taken] = await db.select({ id: users.id }).from(users).where(and(ilike(users.username, uname), sql`${users.id} <> ${id}`)).limit(1);
        if (taken) return res.status(400).json({ message: "That username is already taken" });
      }
      patch.username = uname || null;
    }
    if (b.membershipCardNumber !== undefined) patch.membershipCardNumber = String(b.membershipCardNumber).trim() || null;
    if (b.password) patch.password = await bcrypt.hash(String(b.password), 12);
    const [row] = await db.update(users).set(patch).where(eq(users.id, id)).returning();
    if (b.role === "staff" || b.role === "admin") {
      const reborn = (await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.slug, "reborn-wave-group")).limit(1))[0];
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
        if (taken) return res.status(400).json({ message: "That username is already taken" });
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
        if (!ok) return res.status(400).json({ message: "Current password is incorrect" });
      }
      if (String(b.newPassword).length < 6) return res.status(400).json({ message: "New password must be at least 6 characters" });
      patch.password = await bcrypt.hash(String(b.newPassword), 12);
      patch.mustChangePassword = false; // first-login reset satisfied
    }
    const [row] = await db.update(users).set(patch).where(eq(users.id, userId)).returning();
    res.json({ ...row, password: undefined });
  });

  // Member RP top-up requests (approved by staff/admin → credits added)
  app.post("/api/reborn/topup", requireAuth, async (req, res) => {
    const userId = getUserId(req)!;
    const amount = Number(req.body?.amount) || 0;
    if (amount <= 0) return res.status(400).json({ message: "Enter an amount" });
    const method = req.body?.paymentMethod === "card" ? "card" : "cash";
    const [row] = await db.insert(topUpRequests).values({ userId, amount: String(amount), paymentMethod: method, paymentProof: req.body?.paymentProof || null, status: "pending" }).returning();
    res.json({ message: "Top-up request sent. Staff will confirm and add your credits.", request: row });
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
    if (!t || t.status !== "pending") return res.status(400).json({ message: "Not pending" });
    await db.update(topUpRequests).set({ status: approve ? "approved" : "rejected", adminId, adminNotes: req.body?.notes || null, processedAt: new Date(), updatedAt: new Date() }).where(eq(topUpRequests.id, id));
    if (approve) {
      await db.update(users).set({ credits: sql`${users.credits} + ${Number(t.amount)}`, updatedAt: new Date() }).where(eq(users.id, t.userId));
      await db.insert(ledgerEntries).values({ kind: "income", category: "topup", amount: String(t.amount), note: `Top-up (${t.paymentMethod || "cash"})`, refType: "topup", refId: String(id), userId: t.userId });
    }
    await logAdmin(req, { targetUserId: t.userId, targetType: "topup", targetId: id, action: approve ? "approve" : "reject", entityType: "credits", description: `${approve ? "Approved" : "Rejected"} RP ${t.amount} top-up` });
    res.json({ message: approve ? "Approved — credits added." : "Rejected." });
  }));

  // Events (homepage / login announcements)
  app.get("/api/reborn/events", async (_req, res) => {
    res.json(await db.select().from(events).where(eq(events.active, true)).orderBy(desc(events.sortOrder), desc(events.createdAt)).limit(20));
  });
  app.get("/api/reborn/admin/events", requireStaff(async (_req, res) => { res.json(await db.select().from(events).orderBy(desc(events.createdAt))); }));
  app.post("/api/reborn/admin/events", requireStaff(async (req, res) => {
    const b = req.body || {};
    const [row] = await db.insert(events).values({ title: b.title || "New event", body: b.body || "", imageUrl: b.imageUrl || null, showOnLogin: b.showOnLogin !== false, active: b.active !== false, sortOrder: Number(b.sortOrder) || 0, createdBy: getUserId(req)! }).returning();
    await logAdmin(req, { targetType: "event", targetId: row.id, action: "create", entityType: "event", description: `Posted event "${row.title}"` });
    if (row.active) await sendRebornAllNotification({ type: "new_event", title: row.title, body: row.body?.slice(0, 140) || "A new event was posted", data: { path: "/", eventId: row.id } });
    res.json(row);
  }));
  app.put("/api/reborn/admin/events/:id", requireStaff(async (req, res) => {
    const id = Number(req.params.id); const b = req.body || {}; const patch: any = {};
    for (const k of ["title", "body", "imageUrl"]) if (b[k] !== undefined) patch[k] = b[k];
    if (b.showOnLogin !== undefined) patch.showOnLogin = !!b.showOnLogin;
    if (b.active !== undefined) patch.active = !!b.active;
    if (b.sortOrder !== undefined) patch.sortOrder = Number(b.sortOrder);
    const [row] = await db.update(events).set(patch).where(eq(events.id, id)).returning();
    res.json(row);
  }));
  app.delete("/api/reborn/admin/events/:id", requireStaff(async (req, res) => { await db.delete(events).where(eq(events.id, Number(req.params.id))); res.json({ message: "Deleted" }); }));

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
    const channel = ["email", "inapp", "both"].includes(req.body?.channel) ? req.body.channel : "both";
    if (!subject || !body) return res.status(400).json({ message: "Subject and message are required" });
    const everyone = await db.select({ id: users.id, email: users.email, firstName: users.firstName }).from(users);
    let inapp = 0, emails = 0, emailFail = 0;

    if (channel === "inapp" || channel === "both") {
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
    if (channel === "email" || channel === "both") {
      const html = `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto"><h2 style="color:#c9a84c">${subject}</h2><p style="white-space:pre-line;color:#333;line-height:1.6">${body.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!))}</p><p style="color:#999;font-size:12px;margin-top:24px">Reborn Wave Group</p></div>`;
      for (const u of everyone) {
        if (!u.email) continue;
        try { const ok = await sendEmail({ to: u.email, subject, text: body, html }); ok ? emails++ : emailFail++; }
        catch (e) { emailFail++; console.error("broadcast email", e); }
      }
    }
    await logAdmin(req, { targetType: "broadcast", action: "send", entityType: "broadcast", description: `Broadcast "${subject}" · ${inapp} in-app, ${emails} emails${emailFail ? `, ${emailFail} failed` : ""}` });
    await sendRebornAllNotification({ type: "admin_broadcast", title: subject, body: body.slice(0, 160), data: { path: "/support" } });
    res.json({ message: `Sent — ${inapp} in-app message(s), ${emails} email(s)${emailFail ? `, ${emailFail} email(s) failed` : ""}.`, inapp, emails, emailFail });
  }));

  // Admin activity log (full admin only) — resolves which admin account did each action
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
    if (!content) return res.status(400).json({ message: "Empty message" });
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
    res.json({ message: learned ? "Sent · added to auto-replies" : "Sent", learned });
  }));

  // ── POS · Inventory · In-app ordering · Accounting ──────────────────────────
  async function pointsSpendRp() {
    const result = await db.execute(sql`SELECT COALESCE((s.config->'loyalty'->>'pointsSpendRp')::numeric,1000) value FROM bridge_company_settings s JOIN bridge_companies c ON c.id=s.company_id WHERE c.slug='reborn-wave-group' LIMIT 1`);
    return Math.max(1, Number((result.rows || result as any)[0]?.value) || 1000);
  }

  const KEEP_DAYS = 30;
  async function storeBottleForMember(u: any, bottle: any, staffId: string) {
    if (!u || !bottle?.enabled) return null;
    const name = String(bottle.name || "").trim();
    if (!name) throw new Error("Enter the bottle name before payment");
    if (["wine", "whisky"].includes(String(bottle.type || "")) && !bottle.photoUrl) throw new Error("A bottle photo is required for wine and whisky");
    const now = new Date();
    const [row] = await db.insert(bottleKeeps).values({
      userId: u.id, memberName: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.email,
      memberCode: u.referralCode, type: ["beer", "wine", "whisky", "other"].includes(bottle.type) ? bottle.type : "beer",
      name, quantity: Math.max(1, Math.floor(Number(bottle.quantity) || 1)), photoUrl: bottle.photoUrl || null,
      note: bottle.note || null, storedByStaffId: staffId, status: "kept", storedAt: now, expiresAt: addDays(KEEP_DAYS, now),
    }).returning();
    return row;
  }

  // Products — staff can read (to sell); admin manages catalogue/prices/stock.
  app.get("/api/reborn/pos/products", requireStaff(async (_req, res) => {
    res.json(await db.select().from(posProducts).orderBy(posProducts.sortOrder, posProducts.name));
  }));
  // Members browse the active menu to order in-app.
  app.get("/api/reborn/shop/products", requireAuth, async (_req, res) => {
    const rows = await db.select().from(posProducts).where(eq(posProducts.active, true)).orderBy(posProducts.sortOrder, posProducts.name);
    res.json(rows.map((p) => ({ id: p.id, name: p.name, category: p.category, price: p.price, stock: p.stock, imageUrl: p.imageUrl, soldOut: (p.stock ?? 0) <= 0 })));
  });
  app.post("/api/reborn/admin/pos/products", requireAdmin(async (req, res) => {
    const b = req.body || {};
    if (!String(b.name || "").trim()) return res.status(400).json({ message: "Name required" });
    const [row] = await db.insert(posProducts).values({
      name: String(b.name).trim(), category: b.category || "General", price: String(Number(b.price) || 0),
      cost: String(Number(b.cost) || 0), stock: Number(b.stock) || 0, imageUrl: b.imageUrl || null,
      supplierName: b.supplierName || null, supplierAddress: b.supplierAddress || null, supplierPhone: b.supplierPhone || null,
      active: b.active !== false, sortOrder: Number(b.sortOrder) || 0,
    }).returning();
    if ((row.stock ?? 0) > 0) await db.insert(stockMovements).values({ productId: row.id, delta: row.stock, reason: "stock_in", note: "Initial stock", userId: getUserId(req)! });
    await logAdmin(req, { targetType: "pos_product", targetId: row.id, action: "create", entityType: "product", description: `Added product "${row.name}" @ RP ${row.price}` });
    res.json(row);
  }));
  app.patch("/api/reborn/admin/pos/products/:id", requireAdmin(async (req, res) => {
    const id = Number(req.params.id); const b = req.body || {};
    const [prev] = await db.select().from(posProducts).where(eq(posProducts.id, id));
    if (!prev) return res.status(404).json({ message: "Not found" });
    const patch: any = {};
    for (const k of ["name", "category", "imageUrl", "supplierName", "supplierAddress", "supplierPhone"]) if (b[k] !== undefined) patch[k] = b[k] || null;
    for (const k of ["price", "cost"]) if (b[k] !== undefined) patch[k] = String(Number(b[k]) || 0);
    if (b.sortOrder !== undefined) patch.sortOrder = Number(b.sortOrder);
    if (b.active !== undefined) patch.active = !!b.active;
    const [row] = await db.update(posProducts).set(patch).where(eq(posProducts.id, id)).returning();
    if (b.price !== undefined && String(prev.price) !== String(row.price))
      await logAdmin(req, { targetType: "pos_product", targetId: id, action: "edit_price", entityType: "product", oldValues: { price: prev.price }, newValues: { price: row.price }, description: `Price of "${row.name}" RP ${prev.price} → RP ${row.price}` });
    res.json(row);
  }));

  // Stock-in — receive inventory. Records a movement and (if unit cost given) a purchase expense.
  app.post("/api/reborn/pos/stock-in", requireStaff(async (req, res) => {
    const id = Number(req.body?.productId); const qty = Math.floor(Number(req.body?.qty) || 0);
    const unitCost = Number(req.body?.unitCost);
    if (!id || qty === 0) return res.status(400).json({ message: "Product and quantity required" });
    const [p] = await db.select().from(posProducts).where(eq(posProducts.id, id));
    if (!p) return res.status(404).json({ message: "Product not found" });
    await db.update(posProducts).set({ stock: sql`${posProducts.stock} + ${qty}` }).where(eq(posProducts.id, id));
    await db.insert(stockMovements).values({ productId: id, delta: qty, reason: qty > 0 ? "stock_in" : "adjustment", note: req.body?.note || null, userId: getUserId(req)! });
    if (qty > 0 && unitCost > 0)
      await db.insert(ledgerEntries).values({ kind: "expense", category: "purchase", amount: String(qty * unitCost), note: `Stock in: ${qty} × ${p.name} @ RP ${unitCost}`, refType: "stock_movement", refId: String(id), userId: getUserId(req)! });
    await logAdmin(req, { targetType: "pos_product", targetId: id, action: "stock_in", entityType: "stock", description: `Stock ${qty > 0 ? "+" : ""}${qty} for "${p.name}"` });
    res.json({ message: "Stock updated" });
  }));
  app.get("/api/reborn/pos/stock", requireStaff(async (_req, res) => {
    res.json(await db.select().from(posProducts).orderBy(posProducts.stock));
  }));

  // Member lookup by member code (referral code), email, or phone — for POS key-in.
  app.get("/api/reborn/pos/member/:code", requireStaff(async (req, res) => {
    const code = String(req.params.code || "").trim();
    if (!code) return res.status(400).json({ message: "Enter a member code" });
    const [u] = await db.select().from(users).where(
      or(ilike(users.referralCode, code), ilike(users.membershipCardNumber, code), ilike(users.username, code), ilike(users.email, code), eq(users.phoneNumber, code), eq(users.id, code))
    ).limit(1);
    if (!u) return res.status(404).json({ message: "Member not found" });
    res.json({ id: u.id, name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.email, code: u.referralCode, membershipCardNumber: u.membershipCardNumber, credits: u.credits, loyaltyPoints: u.loyaltyPoints, tokens: u.tokens });
  }));
  app.get("/api/reborn/pos/members", requireStaff(async (req, res) => {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json([]);
    const rows = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, username: users.username, email: users.email, phone: users.phoneNumber, code: users.referralCode, card: users.membershipCardNumber }).from(users).where(or(
      ilike(users.firstName, `%${q}%`), ilike(users.lastName, `%${q}%`), ilike(users.username, `%${q}%`), ilike(users.email, `%${q}%`), ilike(users.referralCode, `%${q}%`), ilike(users.membershipCardNumber, `%${q}%`)
    )).orderBy(users.firstName).limit(12);
    res.json(rows.map((u) => ({ ...u, name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.email })));
  }));

  // Deduct stock for a set of items, append them to an order, and re-total the ticket.
  async function appendItems(orderId: number, orderNo: string, items: any[], userId: string, status: string = "accepted", source: string = "pos") {
    for (const it of items) {
      await db.insert(posTicketItems).values({ orderId, productId: it.productId || null, name: it.name, price: String(it.price), qty: it.qty, lineTotal: String(Number(it.price) * it.qty), status, source });
      if (it.productId) {
        const [before] = await db.select().from(posProducts).where(eq(posProducts.id, it.productId));
        await db.update(posProducts).set({ stock: sql`${posProducts.stock} - ${it.qty}` }).where(eq(posProducts.id, it.productId));
        await db.insert(stockMovements).values({ productId: it.productId, delta: -it.qty, reason: "sale", note: `Ticket ${orderNo}`, userId });
        const remaining = (before?.stock ?? 0) - it.qty;
        if ((before?.stock ?? 0) > 5 && remaining <= 5) await sendRebornStaffNotification({ type: "low_stock", title: "Low stock warning", body: `${it.name}: ${Math.max(0, remaining)} left`, data: { path: "/reborn-pos", productId: it.productId } });
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
  async function resolveItems(items: any[]): Promise<{ clean?: any[]; error?: string }> {
    const ids = items.map((it) => Number(it.productId)).filter(Boolean);
    const products = ids.length ? await db.select().from(posProducts).where(or(...ids.map((i: number) => eq(posProducts.id, i)))) : [];
    const byId = new Map(products.map((p) => [p.id, p]));
    const clean: any[] = [];
    for (const it of items) {
      const p = byId.get(Number(it.productId));
      if (!p || !p.active) return { error: "An item is no longer available" };
      const qty = Math.max(1, Math.floor(Number(it.qty) || 1));
      if ((p.stock ?? 0) < qty) return { error: `${p.name} is sold out` };
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
    if (!tableNumber) return res.status(400).json({ message: "Enter a table number" });
    const [existing] = await db.select().from(posTickets).where(and(eq(posTickets.status, "open"), eq(posTickets.tableNumber, tableNumber))).limit(1);
    if (existing) return res.json({ message: `Table ${tableNumber} already has an open ticket`, order: existing });
    const u = await findMemberByCode(req.body?.memberCode || "");
    const [row] = await db.insert(posTickets).values({
      orderNo: "T" + Date.now().toString(36).toUpperCase(), source: "pos", status: "open",
      ...memberTag(u), ...(await salesTag(req.body)), tableNumber, orderMode: req.body?.orderMode === "take_away" ? "take_away" : "dine_in",
      subtotal: "0", total: "0", staffId: getUserId(req)!,
    }).returning();
    await logAdmin(req, { targetUserId: u?.id, targetType: "pos_order", targetId: row.id, action: "open_ticket", entityType: "order", description: `Opened ticket ${row.orderNo} for table ${tableNumber}` });
    res.json({ message: `Opened ticket for table ${tableNumber}`, order: row });
  }));

  // Staff adds items to an open ticket (accumulate over the night).
  app.post("/api/reborn/pos/orders/:id/items", requireStaff(async (req, res) => {
    const id = Number(req.params.id);
    const [o] = await db.select().from(posTickets).where(eq(posTickets.id, id));
    if (!o || o.status !== "open") return res.status(400).json({ message: "Ticket not open" });
    const { clean, error } = await resolveItems(Array.isArray(req.body?.items) ? req.body.items : []);
    if (error) return res.status(400).json({ message: error });
    if (!clean!.length) return res.status(400).json({ message: "No items" });
    const total = await appendItems(id, o.orderNo, clean!, getUserId(req)!);
    res.json({ message: "Added to ticket", total });
  }));
  // Tag / change the member on an open ticket (so points go to the right person).
  app.post("/api/reborn/pos/orders/:id/member", requireStaff(async (req, res) => {
    const id = Number(req.params.id);
    const [o] = await db.select().from(posTickets).where(eq(posTickets.id, id));
    if (!o || o.status !== "open") return res.status(400).json({ message: "Ticket not open" });
    const u = await findMemberByCode(req.body?.memberCode || "");
    if (!u) return res.status(404).json({ message: "Member not found" });
    await db.update(posTickets).set(memberTag(u)).where(eq(posTickets.id, id));
    res.json({ message: `Tagged to ${memberTag(u).memberName}` });
  }));

  // Quick walk-in sale: open, fill, and close in one step.
  app.post("/api/reborn/pos/sale", requireStaff(async (req, res) => {
    const { clean, error } = await resolveItems(Array.isArray(req.body?.items) ? req.body.items : []);
    if (error) return res.status(400).json({ message: error });
    if (!clean!.length) return res.status(400).json({ message: "No items" });
    const paymentMethod = req.body?.paymentMethod === "card" ? "card" : "cash";
    const paymentReference = String(req.body?.paymentReference || "").trim();
    if (paymentMethod === "card" && !paymentReference) return res.status(400).json({ message: "Enter the card approval or receipt number" });
    const u = await findMemberByCode(req.body?.memberCode || "");
    if (req.body?.keepBottle?.enabled && !u) return res.status(400).json({ message: "Select a member before keeping a bottle at checkout" });
    if (req.body?.keepBottle?.enabled && !String(req.body.keepBottle.name || "").trim()) return res.status(400).json({ message: "Enter the bottle name before payment" });
    const settings = await getSettings();
    const subtotal = clean!.reduce((s, it) => s + it.price * it.qty, 0);
    const discount = Math.min(subtotal, Math.max(0, Number(req.body?.discount) || 0));
    const tax = Math.round((subtotal - discount) * settings.taxPercent / 100);
    const total = subtotal - discount + tax;
    const cashReceived = paymentMethod === "cash" ? Number(req.body?.cashReceived) : null;
    if (paymentMethod === "cash" && (!Number.isFinite(cashReceived) || cashReceived! < total)) return res.status(400).json({ message: `Cash received must be at least RP ${total.toLocaleString()}` });
    const changeGiven = paymentMethod === "cash" ? cashReceived! - total : null;
    const keepType = String(req.body?.keepBottle?.type || "");
    if (req.body?.keepBottle?.enabled && ["wine", "whisky"].includes(keepType) && !req.body?.keepBottle?.photoUrl) return res.status(400).json({ message: "A bottle photo is required for wine and whisky" });
    const points = u ? Math.floor(total / await pointsSpendRp()) : 0;
    const orderMode = req.body?.orderMode === "take_away" ? "take_away" : "dine_in";
    const [row] = await db.insert(posTickets).values({
      orderNo: "R" + Date.now().toString(36).toUpperCase(), source: "pos", status: "paid",
      ...memberTag(u), ...(await salesTag(req.body)), tableNumber: req.body?.tableNumber || null,
      subtotal: String(subtotal), discount: String(discount), tax: String(tax), total: String(total), orderMode,
      paymentMethod, paymentReference: paymentReference || null, cashReceived: cashReceived === null ? null : String(cashReceived), changeGiven: changeGiven === null ? null : String(changeGiven), pointsEarned: points, staffId: getUserId(req)!, paidAt: new Date(),
    }).returning();
    await appendItems(row.id, row.orderNo, clean!, getUserId(req)!);
    await db.update(posTickets).set({ subtotal: String(subtotal), discount: String(discount), tax: String(tax), total: String(total) }).where(eq(posTickets.id, row.id));
    if (u && points > 0) await db.update(users).set({ loyaltyPoints: sql`${users.loyaltyPoints} + ${points}`, lifetimePoints: sql`${users.lifetimePoints} + ${points}`, updatedAt: new Date() }).where(eq(users.id, u.id));
    await db.insert(ledgerEntries).values({ kind: "income", category: "product_sale", amount: String(total), note: `Sale ${row.orderNo} (${paymentMethod})`, refType: "pos_order", refId: String(row.id), userId: u?.id || null });
    const keptBottle = u ? await storeBottleForMember(u, req.body?.keepBottle, getUserId(req)!) : null;
    await logAdmin(req, { targetUserId: u?.id, targetType: "pos_order", targetId: row.id, action: "sale", entityType: "order", description: `Quick sale ${row.orderNo} RP ${total}` });
    if (u) {
      crmRecordVisit({ userId: u.id, phone: (u as any).phoneNumber, name: [u.firstName, u.lastName].filter(Boolean).join(" ") }).catch(() => {});
      sendReviewRequest({ userId: u.id, phone: (u as any).phoneNumber, name: u.firstName, club: settings.clubName, reviewUrl: settings.googleReviewUrl }).catch(() => {});
    }
    contributeSpinPoolIfUnreferred(u?.id ?? null, total).catch(() => {});
    const items = await db.select().from(posTicketItems).where(eq(posTicketItems.orderId, row.id));
    res.json({ message: `Paid RP ${total.toLocaleString()}${points ? ` · ${points} points added` : ""}${keptBottle ? " · bottle stored for 30 days" : ""}`, order: { ...row, subtotal: String(subtotal), discount: String(discount), tax: String(tax), total: String(total), items }, bottle: keptBottle, receipt: { clubName: settings.clubName, logoUrl: settings.receiptLogoUrl, footer: settings.receiptFooter, taxPercent: settings.taxPercent, autoPrint: settings.posAutoPrint } });
  }));

  // Member orders from the app — merges into their table's open ticket (or opens one).
  app.post("/api/reborn/shop/order", requireAuth, async (req, res) => {
    const userId = getUserId(req)!;
    const tableNumber = String(req.body?.tableNumber || "").trim();
    if (!tableNumber) return res.status(400).json({ message: "Enter your table number" });
    const { clean, error } = await resolveItems(Array.isArray(req.body?.items) ? req.body.items : []);
    if (error) return res.status(400).json({ message: error });
    if (!clean!.length) return res.status(400).json({ message: "Your order is empty" });
    const [u] = await db.select().from(users).where(eq(users.id, userId));
    let [order] = await db.select().from(posTickets).where(and(eq(posTickets.status, "open"), eq(posTickets.tableNumber, tableNumber))).limit(1);
    if (!order) {
      [order] = await db.insert(posTickets).values({
        orderNo: "A" + Date.now().toString(36).toUpperCase(), source: "app", status: "open",
        memberId: userId, memberCode: u?.referralCode || null,
        memberName: [u?.firstName, u?.lastName].filter(Boolean).join(" ") || u?.email || null,
        tableNumber, orderMode: req.body?.orderMode === "take_away" ? "take_away" : "dine_in", subtotal: "0", total: "0",
      }).returning();
    }
    await appendItems(order.id, order.orderNo, clean!, userId, "pending", "app"); // counter must accept
    await notifyAdmins(`🛎️ New order from table ${tableNumber} (${order.memberName || "member"}) — needs Accept/Reject in POS.`);
    await sendRebornStaffNotification({ type: "new_order", title: `New order ${order.orderNo}`, body: `${order.memberName || "Member"} · Table ${tableNumber} · ${clean!.length} item${clean!.length === 1 ? "" : "s"}`, data: { path: "/reborn-pos", ticketId: order.id } });
    emitLiveUpdate("/api/reborn/pos/orders", { action: "NEW_ORDER", resource: String(order.id) });
    res.json({ message: "Order sent — waiting for the counter to accept.", order });
  });
  // Counter accepts / rejects / serves an app order item.
  app.post("/api/reborn/pos/items/:id/status", requireStaff(async (req, res) => {
    const id = Number(req.params.id);
    const status = ["accepted", "rejected", "served"].includes(req.body?.status) ? req.body.status : null;
    if (!status) return res.status(400).json({ message: "Bad status" });
    const [it] = await db.select().from(posTicketItems).where(eq(posTicketItems.id, id));
    if (!it) return res.status(404).json({ message: "Item not found" });
    const patch: any = { status };
    if (status === "rejected") {
      patch.rejectReason = String(req.body?.reason || "").trim() || "Unavailable";
      if (it.status !== "rejected" && it.productId) { // return stock
        await db.update(posProducts).set({ stock: sql`${posProducts.stock} + ${it.qty}` }).where(eq(posProducts.id, it.productId));
        await db.insert(stockMovements).values({ productId: it.productId, delta: it.qty, reason: "order_reject", note: `Rejected item #${id}`, userId: getUserId(req)! });
      }
    }
    if (status === "served") patch.servedAt = new Date();
    await db.update(posTicketItems).set(patch).where(eq(posTicketItems.id, id));
    await recalcTicket(it.orderId);
    const [ticket] = await db.select().from(posTickets).where(eq(posTickets.id, it.orderId));
    if (ticket?.memberId) await sendRebornUserNotification(ticket.memberId, {
      type: "order_status", title: status === "served" ? "Your order is served" : status === "accepted" ? "Order confirmed" : "Order item unavailable",
      body: status === "rejected" ? `${it.name}: ${patch.rejectReason}` : `${it.name} · ${status}`,
      data: { path: "/shop", ticketId: ticket.id, itemId: id, status },
    });
    res.json({ message: status === "rejected" ? `Rejected: ${patch.rejectReason}` : status === "served" ? "Marked served" : "Accepted" });
  }));
  // Edit an item's price and/or qty (adjusts stock for qty change; logs reason).
  app.post("/api/reborn/pos/items/:id/edit", requireStaff(async (req, res) => {
    const id = Number(req.params.id);
    const [it] = await db.select().from(posTicketItems).where(eq(posTicketItems.id, id));
    if (!it) return res.status(404).json({ message: "Item not found" });
    const price = req.body?.price !== undefined ? Math.max(0, Number(req.body.price)) : Number(it.price);
    const qty = req.body?.qty !== undefined ? Math.max(1, Math.floor(Number(req.body.qty))) : it.qty;
    const dQty = qty - it.qty;
    if (dQty !== 0 && it.productId) { // keep stock in sync
      await db.update(posProducts).set({ stock: sql`${posProducts.stock} - ${dQty}` }).where(eq(posProducts.id, it.productId));
      await db.insert(stockMovements).values({ productId: it.productId, delta: -dQty, reason: "adjustment", note: `Edit item #${id}`, userId: getUserId(req)! });
    }
    await db.update(posTicketItems).set({ price: String(price), qty, lineTotal: String(price * qty) }).where(eq(posTicketItems.id, id));
    await recalcTicket(it.orderId);
    await logAdmin(req, { targetType: "pos_item", targetId: id, action: "edit", entityType: "order", description: `Edited "${it.name}" → ${qty} × RP ${price}${req.body?.reason ? ` (${req.body.reason})` : ""}` });
    res.json({ message: "Item updated" });
  }));
  // Remove an item with an optional reason (restores stock). App-ordered items are
  // marked rejected (kept visible to the customer with the reason); POS items are deleted.
  app.post("/api/reborn/pos/items/:id/remove", requireStaff(async (req, res) => {
    const id = Number(req.params.id);
    const reason = String(req.body?.reason || "").trim();
    const [it] = await db.select().from(posTicketItems).where(eq(posTicketItems.id, id));
    if (!it) return res.status(404).json({ message: "Item not found" });
    if (it.status !== "rejected" && it.productId) {
      await db.update(posProducts).set({ stock: sql`${posProducts.stock} + ${it.qty}` }).where(eq(posProducts.id, it.productId));
      await db.insert(stockMovements).values({ productId: it.productId, delta: it.qty, reason: "adjustment", note: `Removed item #${id}`, userId: getUserId(req)! });
    }
    if (it.source === "app") await db.update(posTicketItems).set({ status: "rejected", rejectReason: reason || "Removed by staff" }).where(eq(posTicketItems.id, id));
    else await db.delete(posTicketItems).where(eq(posTicketItems.id, id));
    await recalcTicket(it.orderId);
    await logAdmin(req, { targetType: "pos_item", targetId: id, action: "remove", entityType: "order", description: `Removed "${it.name}"${reason ? ` (${reason})` : ""}` });
    res.json({ message: reason ? `Removed: ${reason}` : "Item removed" });
  }));
  // Move one item to another table's open ticket (split a bill). Creates the ticket if needed.
  app.post("/api/reborn/pos/items/:id/move", requireStaff(async (req, res) => {
    const id = Number(req.params.id);
    const table = String(req.body?.tableNumber || "").trim();
    if (!table) return res.status(400).json({ message: "Enter a table number" });
    const [it] = await db.select().from(posTicketItems).where(eq(posTicketItems.id, id));
    if (!it) return res.status(404).json({ message: "Item not found" });
    let [dest] = await db.select().from(posTickets).where(and(eq(posTickets.status, "open"), eq(posTickets.tableNumber, table))).limit(1);
    if (!dest) {
      [dest] = await db.insert(posTickets).values({ orderNo: "T" + Date.now().toString(36).toUpperCase(), source: "pos", status: "open", tableNumber: table, subtotal: "0", total: "0", staffId: getUserId(req)! }).returning();
    }
    if (dest.id === it.orderId) return res.status(400).json({ message: "Item already on that table" });
    await db.update(posTicketItems).set({ orderId: dest.id }).where(eq(posTicketItems.id, id));
    await recalcTicket(it.orderId);
    await recalcTicket(dest.id);
    await logAdmin(req, { targetType: "pos_item", targetId: id, action: "move", entityType: "order", description: `Moved "${it.name}" to table ${table}` });
    res.json({ message: `Moved to table ${table}` });
  }));
  // Change a ticket's table number.
  app.post("/api/reborn/pos/orders/:id/table", requireStaff(async (req, res) => {
    const id = Number(req.params.id);
    const table = String(req.body?.tableNumber || "").trim();
    if (!table) return res.status(400).json({ message: "Enter a table number" });
    const [o] = await db.select().from(posTickets).where(eq(posTickets.id, id));
    if (!o || o.status !== "open") return res.status(400).json({ message: "Ticket not open" });
    await db.update(posTickets).set({ tableNumber: table }).where(eq(posTickets.id, id));
    await logAdmin(req, { targetType: "pos_order", targetId: id, action: "rename_table", entityType: "order", description: `Table ${o.tableNumber} → ${table}` });
    res.json({ message: `Table changed to ${table}` });
  }));
  // Merge all items from this ticket into another open ticket, then close this one.
  app.post("/api/reborn/pos/orders/:id/merge", requireStaff(async (req, res) => {
    const id = Number(req.params.id);
    const intoId = Number(req.body?.intoId);
    if (!intoId || intoId === id) return res.status(400).json({ message: "Pick a different ticket to merge into" });
    const [from] = await db.select().from(posTickets).where(eq(posTickets.id, id));
    const [into] = await db.select().from(posTickets).where(eq(posTickets.id, intoId));
    if (!from || !into || from.status !== "open" || into.status !== "open") return res.status(400).json({ message: "Both tickets must be open" });
    await db.update(posTicketItems).set({ orderId: intoId }).where(eq(posTicketItems.orderId, id));
    await db.update(posTickets).set({ status: "cancelled" }).where(eq(posTickets.id, id));
    await recalcTicket(intoId);
    await logAdmin(req, { targetType: "pos_order", targetId: id, action: "merge", entityType: "order", description: `Merged ${from.orderNo} into ${into.orderNo} (table ${into.tableNumber})` });
    res.json({ message: `Merged into table ${into.tableNumber}` });
  }));
  // Set a whole-bill discount with an optional reason (applied at payment).
  app.post("/api/reborn/pos/orders/:id/discount", requireStaff(async (req, res) => {
    const id = Number(req.params.id);
    const [o] = await db.select().from(posTickets).where(eq(posTickets.id, id));
    if (!o || o.status !== "open") return res.status(400).json({ message: "Ticket not open" });
    const subtotal = Number(o.subtotal || o.total);
    let amount: number, reason: string;
    const pct = Number(req.body?.percent);
    if (req.body?.percent !== undefined && req.body?.percent !== "" && Number.isFinite(pct) && pct > 0) {
      amount = Math.round(subtotal * Math.min(100, pct) / 100);
      reason = String(req.body?.reason || "").trim() || `${pct}% off`;
    } else {
      amount = Math.max(0, Number(req.body?.amount) || 0);
      reason = String(req.body?.reason || "").trim() || (amount ? "Discount" : "");
    }
    amount = Math.min(subtotal, amount);
    await db.update(posTickets).set({ discount: String(amount), discountReason: reason || null }).where(eq(posTickets.id, id));
    await logAdmin(req, { targetType: "pos_order", targetId: id, action: "discount", entityType: "order", description: `Discount RP ${amount}${reason ? ` (${reason})` : ""} on ${o.orderNo}` });
    res.json({ message: amount ? `Discount RP ${amount.toLocaleString()} set` : "Discount cleared", amount });
  }));
  app.get("/api/reborn/shop/my-orders", requireAuth, async (req, res) => {
    const userId = getUserId(req)!;
    const rows = await db.select().from(posTickets).where(eq(posTickets.memberId, userId)).orderBy(desc(posTickets.createdAt)).limit(20);
    const withItems = await Promise.all(rows.map(async (o) => ({ ...o, items: await db.select().from(posTicketItems).where(eq(posTicketItems.orderId, o.id)) })));
    res.json(withItems);
  });

  // Open tickets (app orders awaiting payment) for staff to close.
  app.get("/api/reborn/pos/orders", requireStaff(async (req, res) => {
    const status = String(req.query.status || "open");
    const rows = await db.select().from(posTickets).where(eq(posTickets.status, status)).orderBy(desc(posTickets.createdAt)).limit(100);
    const withItems = await Promise.all(rows.map(async (o) => ({ ...o, items: await db.select().from(posTicketItems).where(eq(posTicketItems.orderId, o.id)) })));
    res.json(withItems);
  }));
  app.post("/api/reborn/pos/orders/:id/pay", requireStaff(async (req, res) => {
    const id = Number(req.params.id); const paymentMethod = req.body?.paymentMethod === "card" ? "card" : "cash";
    const paymentReference = String(req.body?.paymentReference || "").trim();
    if (paymentMethod === "card" && !paymentReference) return res.status(400).json({ message: "Enter the card approval or receipt number" });
    const [o] = await db.select().from(posTickets).where(eq(posTickets.id, id));
    if (!o || o.status !== "open") return res.status(400).json({ message: "Order not open" });
    if (req.body?.keepBottle?.enabled && !o.memberId) return res.status(400).json({ message: "Tag a member before keeping a bottle at checkout" });
    if (req.body?.keepBottle?.enabled && !String(req.body.keepBottle.name || "").trim()) return res.status(400).json({ message: "Enter the bottle name before payment" });
    const settings = await getSettings();
    const subtotal = Number(o.subtotal || o.total);
    // Use the request discount if provided, else the discount already set on the ticket.
    const reqDisc = req.body?.discount !== undefined ? Number(req.body.discount) : Number(o.discount || 0);
    const discount = Math.min(subtotal, Math.max(0, reqDisc || 0));
    const tax = Math.round((subtotal - discount) * settings.taxPercent / 100);
    const total = subtotal - discount + tax;
    const cashReceived = paymentMethod === "cash" ? Number(req.body?.cashReceived) : null;
    if (paymentMethod === "cash" && (!Number.isFinite(cashReceived) || cashReceived! < total)) return res.status(400).json({ message: `Cash received must be at least RP ${total.toLocaleString()}` });
    const changeGiven = paymentMethod === "cash" ? cashReceived! - total : null;
    const keepType = String(req.body?.keepBottle?.type || "");
    if (req.body?.keepBottle?.enabled && ["wine", "whisky"].includes(keepType) && !req.body?.keepBottle?.photoUrl) return res.status(400).json({ message: "A bottle photo is required for wine and whisky" });
    const points = o.memberId ? Math.floor(total / await pointsSpendRp()) : 0;
    const sales = await salesTag(req.body); // optional salesperson override at checkout
    const orderMode = req.body?.orderMode === "take_away" ? "take_away" : (o.orderMode || "dine_in");
    await db.update(posTickets).set({ status: "paid", paymentMethod, paymentReference: paymentReference || null, cashReceived: cashReceived === null ? null : String(cashReceived), changeGiven: changeGiven === null ? null : String(changeGiven), subtotal: String(subtotal), discount: String(discount), tax: String(tax), total: String(total), orderMode, pointsEarned: points, staffId: getUserId(req)!, paidAt: new Date(), ...sales }).where(eq(posTickets.id, id));
    if (o.memberId && points > 0)
      await db.update(users).set({ loyaltyPoints: sql`${users.loyaltyPoints} + ${points}`, lifetimePoints: sql`${users.lifetimePoints} + ${points}`, updatedAt: new Date() }).where(eq(users.id, o.memberId));
    await db.insert(ledgerEntries).values({ kind: "income", category: "product_sale", amount: String(total), note: `Order ${o.orderNo} (${paymentMethod})`, refType: "pos_order", refId: String(id), userId: o.memberId || null });
    const [member] = o.memberId ? await db.select().from(users).where(eq(users.id, o.memberId)).limit(1) : [];
    const keptBottle = member ? await storeBottleForMember(member, req.body?.keepBottle, getUserId(req)!) : null;
    await logAdmin(req, { targetUserId: o.memberId || undefined, targetType: "pos_order", targetId: id, action: "close", entityType: "order", description: `Closed ${o.orderNo} RP ${total} (${paymentMethod})${points ? ` · ${points} pts` : ""}` });
    if (o.memberId) {
      crmRecordVisit({ userId: o.memberId, name: o.memberName }).catch(() => {});
      sendReviewRequest({ userId: o.memberId, name: o.memberName, club: settings.clubName, reviewUrl: settings.googleReviewUrl }).catch(() => {});
    }
    contributeSpinPoolIfUnreferred(o?.memberId ?? null, total).catch(() => {});
    const items = await db.select().from(posTicketItems).where(eq(posTicketItems.orderId, id));
    const [fresh] = await db.select().from(posTickets).where(eq(posTickets.id, id));
    res.json({ message: `Paid RP ${total.toLocaleString()}${points ? ` · ${points} points added` : ""}${keptBottle ? " · bottle stored for 30 days" : ""}`, order: { ...fresh, items }, bottle: keptBottle, receipt: { clubName: settings.clubName, logoUrl: settings.receiptLogoUrl, footer: settings.receiptFooter, taxPercent: settings.taxPercent, autoPrint: settings.posAutoPrint } });
  }));
  app.post("/api/reborn/pos/orders/:id/cancel", requireStaff(async (req, res) => {
    const id = Number(req.params.id);
    const [o] = await db.select().from(posTickets).where(eq(posTickets.id, id));
    if (!o || o.status !== "open") return res.status(400).json({ message: "Order not open" });
    const items = await db.select().from(posTicketItems).where(eq(posTicketItems.orderId, id));
    for (const it of items) if (it.productId) {
      await db.update(posProducts).set({ stock: sql`${posProducts.stock} + ${it.qty}` }).where(eq(posProducts.id, it.productId));
      await db.insert(stockMovements).values({ productId: it.productId, delta: it.qty, reason: "order_cancel", note: `Cancelled ${o.orderNo}`, userId: getUserId(req)! });
    }
    await db.update(posTickets).set({ status: "cancelled" }).where(eq(posTickets.id, id));
    await logAdmin(req, { targetType: "pos_order", targetId: id, action: "cancel", entityType: "order", description: `Cancelled ${o.orderNo}, stock restored` });
    res.json({ message: "Order cancelled, stock restored" });
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
    if (!u) return res.status(404).json({ message: "Enter a valid member (code/card/username/email) to keep a bottle." });
    const row = await storeBottleForMember(u, { ...b, enabled: true, name: String(b.name || "").trim() || "Bottle" }, getUserId(req)!);
    if (!row) return res.status(400).json({ message: "Could not store bottle" });
    await logAdmin(req, { targetUserId: u.id, targetType: "bottle_keep", targetId: row.id, action: "store", entityType: "bottle", description: `Kept ${row.quantity}× ${row.name} for ${row.memberName} (30 days)` });
    res.json({ message: `Stored for ${row.memberName} — 30 days to collect.`, bottle: bottleView(row) });
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
    if (!b || b.status !== "kept") return res.status(400).json({ message: "Not an active kept bottle" });
    const remaining = (b.quantity || 1) - take;
    if (remaining > 0) { await db.update(bottleKeeps).set({ quantity: remaining }).where(eq(bottleKeeps.id, id)); }
    else { await db.update(bottleKeeps).set({ status: "collected", quantity: 0, collectedAt: new Date() }).where(eq(bottleKeeps.id, id)); }
    await logAdmin(req, { targetUserId: b.userId || undefined, targetType: "bottle_keep", targetId: id, action: "collect", entityType: "bottle", description: `Collected ${take}× ${b.name} (${b.memberName})` });
    res.json({ message: remaining > 0 ? `Collected ${take}. ${remaining} left in keep.` : "Collected — bottle keep closed." });
  }));
  // Member: my kept bottles + reminders.
  app.get("/api/reborn/bottles", requireAuth, async (req, res) => {
    const userId = getUserId(req)!;
    const rows = await db.select().from(bottleKeeps).where(and(eq(bottleKeeps.userId, userId), eq(bottleKeeps.status, "kept"))).orderBy(bottleKeeps.expiresAt);
    res.json(rows.map(bottleView));
  });

  // Accounting — money in/out summary + ledger (admin only).
  app.get("/api/reborn/admin/accounting/summary", requireAdmin(async (req, res) => {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const since = new Date(Date.now() - days * DAY_MS);
    const rows = await db.select().from(ledgerEntries).where(sql`${ledgerEntries.createdAt} >= ${since}`);
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
  // Commission: paid sales grouped by salesperson (staff credited on each ticket).
  app.get("/api/reborn/admin/accounting/commission", requireAdmin(async (req, res) => {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const since = new Date(Date.now() - days * DAY_MS);
    const rate = Number(req.query.rate) || 0; // optional commission % for a quick payout estimate
    const rows = await db.select().from(posTickets).where(and(eq(posTickets.status, "paid"), sql`${posTickets.paidAt} >= ${since}`));
    const byStaff: Record<string, { name: string; sales: number; tickets: number }> = {};
    for (const t of rows) {
      const key = t.salesStaffName || "Unassigned";
      byStaff[key] ||= { name: key, sales: 0, tickets: 0 };
      byStaff[key].sales += Number(t.total); byStaff[key].tickets += 1;
    }
    const list = Object.values(byStaff).sort((a, b) => b.sales - a.sales)
      .map((s) => ({ ...s, commission: Math.round(s.sales * rate / 100) }));
    res.json({ days, rate, staff: list });
  }));
  // Record a commission payout as an RP cash expense (not app credits) — tracked in the ledger + admin log.
  app.post("/api/reborn/admin/accounting/commission/pay", requireAdmin(async (req, res) => {
    const name = String(req.body?.staffName || "").trim();
    const amount = Math.round(Number(req.body?.amount) || 0);
    if (!name || amount <= 0) return res.status(400).json({ message: "Staff and amount required" });
    const [row] = await db.insert(ledgerEntries).values({ kind: "expense", category: "commission", amount: String(amount), note: `Commission paid to ${name} (RP)`, userId: getUserId(req)! }).returning();
    await logAdmin(req, { targetType: "ledger", targetId: row.id, action: "pay_commission", entityType: "accounting", description: `Paid commission RP ${amount} to ${name}` });
    res.json({ message: `Paid RP ${amount.toLocaleString()} commission to ${name}.` });
  }));
  app.post("/api/reborn/admin/accounting/entry", requireAdmin(async (req, res) => {
    const b = req.body || {};
    const amount = Number(b.amount) || 0;
    if (amount <= 0) return res.status(400).json({ message: "Enter an amount" });
    const kind = b.kind === "expense" ? "expense" : "income";
    const [row] = await db.insert(ledgerEntries).values({ kind, category: b.category || "other", amount: String(amount), note: b.note || null, photoUrl: b.photoUrl || null, userId: getUserId(req)! }).returning();
    await logAdmin(req, { targetType: "ledger", targetId: row.id, action: "manual_entry", entityType: "accounting", description: `${kind} RP ${amount} (${row.category})` });
    res.json(row);
  }));

  app.get("/api/reborn/admin/accounting/orders", requireAdmin(async (req, res) => {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const since = new Date(Date.now() - days * DAY_MS);
    const rows = await db.select().from(posTickets).where(and(inArray(posTickets.status, ["paid", "refunded"]), sql`${posTickets.paidAt} >= ${since}`)).orderBy(desc(posTickets.paidAt)).limit(300);
    const result = await Promise.all(rows.map(async (order)=>({ ...order, items: await db.select().from(posTicketItems).where(eq(posTicketItems.orderId, order.id)) })));
    res.json(result);
  }));

  app.post("/api/reborn/admin/accounting/orders/:id/refund", requireAdmin(async (req, res) => {
    const id = Number(req.params.id); const reason = String(req.body?.reason || "").trim();
    if (!reason) return res.status(400).json({ message: "A refund reason is required" });
    const [order] = await db.select().from(posTickets).where(eq(posTickets.id,id));
    if (!order || order.status !== "paid") return res.status(400).json({ message: "Only a paid bill can be refunded" });
    const items = await db.select().from(posTicketItems).where(eq(posTicketItems.orderId,id));
    for (const item of items.filter((x)=>x.status !== "rejected" && x.productId)) {
      await db.update(posProducts).set({ stock: sql`${posProducts.stock} + ${item.qty}` }).where(eq(posProducts.id,item.productId!));
      await db.insert(stockMovements).values({ productId:item.productId!, delta:item.qty, reason:"refund", note:`Refund ${order.orderNo}: ${reason}`, userId:getUserId(req)! });
    }
    if (order.memberId && order.pointsEarned > 0) await db.update(users).set({ loyaltyPoints:sql`greatest(0,${users.loyaltyPoints}-${order.pointsEarned})`, lifetimePoints:sql`greatest(0,${users.lifetimePoints}-${order.pointsEarned})`, updatedAt:new Date() }).where(eq(users.id,order.memberId));
    const [updated] = await db.update(posTickets).set({ status:"refunded", refundReason:reason, refundedBy:getUserId(req)!, refundedAt:new Date() }).where(eq(posTickets.id,id)).returning();
    await db.insert(ledgerEntries).values({ kind:"expense", category:"refund", amount:String(order.total), note:`Refund ${order.orderNo}: ${reason}`, refType:"pos_refund", refId:String(id), userId:order.memberId || null });
    await logAdmin(req,{ targetType:"pos_order",targetId:String(id),action:"refund",entityType:"accounting",description:`Refunded ${order.orderNo} RP ${Number(order.total)}: ${reason}` });
    res.json({ message:`${order.orderNo} refunded and stock restored`, order:{...updated,items} });
  }));

  app.post("/api/reborn/admin/accounting/orders/:id/edit", requireAdmin(async (req, res) => {
    const id=Number(req.params.id); const reason=String(req.body?.reason||"").trim();
    if (!reason) return res.status(400).json({message:"A dispute/edit reason is required"});
    const [order]=await db.select().from(posTickets).where(eq(posTickets.id,id));
    if (!order || order.status!=="paid") return res.status(400).json({message:"Only a paid bill can be edited"});
    const current=await db.select().from(posTicketItems).where(eq(posTicketItems.orderId,id));
    const requested=Array.isArray(req.body?.items)?req.body.items:[];
    for (const change of requested) {
      const old=current.find((x)=>x.id===Number(change.id)); if(!old || old.status==="rejected") continue;
      const qty=Math.max(1,Math.floor(Number(change.qty)||1)); const price=Math.max(0,Number(change.price)||0); const delta=qty-old.qty;
      if(delta>0 && old.productId){ const [p]=await db.select().from(posProducts).where(eq(posProducts.id,old.productId)); if(!p || p.stock<delta) return res.status(400).json({message:`Not enough ${old.name} stock for that edit`}); }
      if(delta!==0 && old.productId){ await db.update(posProducts).set({stock:sql`${posProducts.stock}-${delta}`}).where(eq(posProducts.id,old.productId)); await db.insert(stockMovements).values({productId:old.productId,delta:-delta,reason:"bill_edit",note:`${order.orderNo}: ${reason}`,userId:getUserId(req)!}); }
      await db.update(posTicketItems).set({qty,price:String(price),lineTotal:String(qty*price)}).where(eq(posTicketItems.id,old.id));
    }
    const freshItems=await db.select().from(posTicketItems).where(eq(posTicketItems.orderId,id));
    const subtotal=freshItems.filter((x)=>x.status!=="rejected").reduce((s,x)=>s+Number(x.lineTotal),0);
    const discount=Math.min(subtotal,Math.max(0,Number(req.body?.discount ?? order.discount)||0));
    const tax=Math.max(0,Number(req.body?.tax ?? order.tax)||0); const total=subtotal-discount+tax;
    const method=req.body?.paymentMethod==="card"?"card":req.body?.paymentMethod==="cash"?"cash":order.paymentMethod;
    const ref=String(req.body?.paymentReference ?? order.paymentReference ?? "").trim(); if(method==="card"&&!ref)return res.status(400).json({message:"Card receipt/reference number is required"});
    const cash=method==="cash"?Number(req.body?.cashReceived ?? order.cashReceived ?? total):null; if(method==="cash"&&cash!<total)return res.status(400).json({message:"Cash received cannot be below the edited total"});
    const diff=total-Number(order.total); if(diff!==0)await db.insert(ledgerEntries).values({kind:diff>0?"income":"expense",category:"bill_adjustment",amount:String(Math.abs(diff)),note:`Bill edit ${order.orderNo}: ${reason}`,refType:"pos_adjustment",refId:String(id),userId:order.memberId||null});
    const [updated]=await db.update(posTickets).set({subtotal:String(subtotal),discount:String(discount),tax:String(tax),total:String(total),paymentMethod:method,paymentReference:ref||null,cashReceived:cash===null?null:String(cash),changeGiven:cash===null?null:String(cash-total),adjustmentReason:reason}).where(eq(posTickets.id,id)).returning();
    await logAdmin(req,{targetType:"pos_order",targetId:String(id),action:"edit_paid_bill",entityType:"accounting",description:`Edited ${order.orderNo}: ${reason}; RP ${Number(order.total)} → ${total}`});
    res.json({message:"Bill updated with an audit record",order:{...updated,items:freshItems}});
  }));

  app.get("/api/reborn/admin/payroll", requireAdmin(async (req,res)=>{
    const month=String(req.query.month||new Date().toISOString().slice(0,7)); const from=`${month}-01`; const to=new Date(new Date(`${from}T00:00:00Z`).setUTCMonth(new Date(`${from}T00:00:00Z`).getUTCMonth()+1)).toISOString().slice(0,10);
    const reborn=(await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.slug,"reborn-wave-group")).limit(1))[0]; if(!reborn)return res.json({month,staff:[],referrals:[]});
    const result=await db.execute(sql`SELECT m.user_id,COALESCE(NULLIF(trim(concat(u.first_name,' ',u.last_name)),''),u.email) name,m.role,p.employment_type,p.pay_type,COALESCE(p.base_salary,0) base_salary,COALESCE(p.hourly_rate,0) hourly_rate,COALESCE(p.commission_rate,0) commission_rate,COALESCE(p.sales_target,0) sales_target,COALESCE(a.hours,0) hours,COALESCE(s.sales,0) sales,COALESCE(s.tickets,0) tickets FROM bridge_company_members m JOIN users u ON u.id=m.user_id LEFT JOIN bridge_staff_profiles p ON p.company_id=m.company_id AND p.user_id=m.user_id LEFT JOIN (SELECT user_id,sum(extract(epoch from(check_out_at-check_in_at))/3600) hours FROM staff_attendance WHERE status='approved' AND work_date>=${from} AND work_date<${to} AND check_out_at IS NOT NULL GROUP BY user_id)a ON a.user_id=m.user_id LEFT JOIN (SELECT sales_staff_id,sum(total::numeric) sales,count(*) tickets FROM pos_tickets WHERE status='paid' AND paid_at>=${new Date(from+"T00:00:00Z")} AND paid_at<${new Date(to+"T00:00:00Z")} GROUP BY sales_staff_id)s ON s.sales_staff_id=m.user_id WHERE m.company_id=${reborn.id} AND m.role IN ('owner','admin','manager','staff') ORDER BY name`);
    const staff=((result.rows||result) as any[]).map((x)=>{const basic=x.pay_type==="hourly"?Number(x.hourly_rate)*Number(x.hours):Number(x.base_salary);const salesCommission=Number(x.sales)*Number(x.commission_rate)/100;return{...x,basic,salesCommission,total:basic+salesCommission,targetHit:Number(x.sales)>=Number(x.sales_target)&&Number(x.sales_target)>0};});
    const refs=await db.execute(sql`SELECT c.introducer_id,COALESCE(NULLIF(trim(concat(u.first_name,' ',u.last_name)),''),u.email) name,count(*) referrals,sum(c.transaction_amount::numeric) referred_sales,sum(c.commission_amount::numeric) commission FROM commission_history c JOIN users u ON u.id=c.introducer_id WHERE c.status='completed' AND c.created_at>=${new Date(from+"T00:00:00Z")} AND c.created_at<${new Date(to+"T00:00:00Z")} GROUP BY c.introducer_id,u.first_name,u.last_name,u.email ORDER BY commission DESC`);
    res.json({month,from,to,staff,referrals:refs.rows||refs});
  }));
  app.post("/api/reborn/admin/payroll/profile", requireAdmin(async(req,res)=>{const b=req.body||{};const reborn=(await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.slug,"reborn-wave-group")).limit(1))[0];if(!reborn)return res.status(404).json({message:"Company not found"});const values={companyId:reborn.id,userId:String(b.userId),payType:b.payType==="hourly"?"hourly":"salary",employmentType:b.employmentType||"full_time",baseSalary:String(Math.max(0,Number(b.baseSalary)||0)),hourlyRate:String(Math.max(0,Number(b.hourlyRate)||0)),commissionRate:String(Math.max(0,Number(b.commissionRate)||0)),salesTarget:String(Math.max(0,Number(b.salesTarget)||0)),updatedAt:new Date()};const[row]=await db.insert(bridgeStaffProfiles).values(values).onConflictDoUpdate({target:[bridgeStaffProfiles.companyId,bridgeStaffProfiles.userId],set:values}).returning();res.json(row);}));
  app.post("/api/reborn/admin/payroll/pay", requireAdmin(async(req,res)=>{const b=req.body||{};const amount=Math.max(0,Number(b.amount)||0);const month=String(b.month||"");const userId=String(b.userId||"");if(!amount||!month||!userId)return res.status(400).json({message:"Staff, month and amount are required"});const existing=await db.select().from(ledgerEntries).where(and(eq(ledgerEntries.refType,"payroll"),eq(ledgerEntries.refId,`${userId}:${month}`))).limit(1);if(existing.length)return res.status(409).json({message:"This staff payroll has already been recorded for the month"});const[row]=await db.insert(ledgerEntries).values({kind:"expense",category:"salary",amount:String(amount),note:`Payroll ${b.name||userId} · ${month} (basic + commission)`,refType:"payroll",refId:`${userId}:${month}`,userId}).returning();res.json({message:"Payroll recorded as an expense",row});}));

  // ── HR: attendance, schedule, leave ──────────────────────────────────
  // Worker self-service (any staff/admin account)
  app.post("/api/reborn/staff/check-in", requireStaff(async (req, res) => {
    const uid = getUserId(req)!;
    const wd = todayStr();
    const open = await db.select().from(staffAttendance).where(and(eq(staffAttendance.userId, uid), eq(staffAttendance.workDate, wd))).limit(1);
    if (open[0] && !open[0].checkOutAt) return res.status(400).json({ message: "You are already checked in today." });
    const [row] = await db.insert(staffAttendance).values({ userId: uid, workDate: wd }).returning();
    const staff = await storage.getUser(uid);
    await sendRebornStaffNotification({ type: "attendance", title: "Staff checked in", body: `${staff?.firstName || staff?.username || "Staff"} checked in`, data: { path: "/reborn-admin", attendanceId: row.id } });
    res.json(row);
  }));
  app.post("/api/reborn/staff/check-out", requireStaff(async (req, res) => {
    const uid = getUserId(req)!;
    const rows = await db.select().from(staffAttendance).where(and(eq(staffAttendance.userId, uid), eq(staffAttendance.workDate, todayStr()))).orderBy(desc(staffAttendance.id)).limit(1);
    const row = rows[0];
    if (!row || row.checkOutAt) return res.status(400).json({ message: "No open check-in to close." });
    const [upd] = await db.update(staffAttendance).set({ checkOutAt: new Date() }).where(eq(staffAttendance.id, row.id)).returning();
    const staff = await storage.getUser(uid);
    await sendRebornStaffNotification({ type: "attendance", title: "Staff checked out", body: `${staff?.firstName || staff?.username || "Staff"} checked out`, data: { path: "/reborn-admin", attendanceId: row.id } });
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
    if (!b.startDate || !b.endDate || !String(b.reason || "").trim()) return res.status(400).json({ message: "Dates and a reason are required." });
    const [row] = await db.insert(leaveRequests).values({
      userId: getUserId(req)!, type: b.type === "mc" ? "mc" : "leave",
      startDate: b.startDate, endDate: b.endDate, reason: String(b.reason).trim(), attachmentUrl: b.attachmentUrl || null,
    }).returning();
    const staff = await storage.getUser(row.userId);
    await sendRebornStaffNotification({ type: "leave_request", title: row.type === "mc" ? "New medical leave" : "New leave request", body: `${staff?.firstName || staff?.username || "Staff"} · ${row.startDate} to ${row.endDate}`, data: { path: "/reborn-admin", leaveId: row.id } });
    res.json(row);
  }));
  app.get("/api/reborn/staff/my-leave", requireStaff(async (req, res) => {
    const uid = getUserId(req)!;
    res.json(await db.select().from(leaveRequests).where(eq(leaveRequests.userId, uid)).orderBy(desc(leaveRequests.id)).limit(60));
  }));

  // Admin/manager (full admin)
  const nameOf = (u: any) => u ? (`${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username || u.email || u.id) : "Unknown";
  app.get("/api/reborn/admin/staff-list", requireAdmin(async (_req, res) => {
    const rows = await db.select().from(users).where(inArray(users.role, ["staff", "admin"]));
    res.json(rows.map((u: any) => ({ id: u.id, name: nameOf(u), role: u.role })));
  }));
  app.get("/api/reborn/admin/staff-positions", requireAdmin(async (_req, res) => {
    const reborn = (await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.slug, "reborn-wave-group")).limit(1))[0];
    res.json(reborn ? await db.select().from(bridgePositions).where(eq(bridgePositions.companyId, reborn.id)).orderBy(bridgePositions.name) : []);
  }));
  app.get("/api/reborn/staff/leaderboard", requireStaff(async (_req, res) => {
    const reborn = (await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.slug, "reborn-wave-group")).limit(1))[0]; if (!reborn) return res.json([]);
    const result = await db.execute(sql`SELECT m.user_id, COALESCE(NULLIF(trim(concat(u.first_name,' ',u.last_name)),''),u.email) name, p.name position, COALESCE(sum(t.total::numeric) FILTER (WHERE t.paid_at >= now()-interval '7 days'),0) weekly_sales, COALESCE(avg(r.rating),0)::numeric(3,2) rating, count(DISTINCT r.id) review_count, count(DISTINCT r.id) FILTER (WHERE r.rating <= 2) bad_reviews FROM bridge_company_members m JOIN users u ON u.id=m.user_id LEFT JOIN bridge_positions p ON p.id=m.position_id LEFT JOIN pos_tickets t ON t.company_id=m.company_id AND t.sales_staff_id=m.user_id AND t.status='paid' LEFT JOIN bridge_staff_reviews r ON r.company_id=m.company_id AND r.staff_user_id=m.user_id AND r.visible=true WHERE m.company_id=${reborn.id} AND m.role IN ('owner','admin','manager','staff') GROUP BY m.user_id,u.first_name,u.last_name,u.email,p.name ORDER BY weekly_sales DESC, rating DESC`);
    const rows=(result.rows||result) as any[]; res.json(rows.map((x,i)=>({...x,rank:i+1,redFlag:(Number(x.rating)>0&&Number(x.rating)<2.5)||Number(x.bad_reviews)>=3})));
  }));
  app.get("/api/reborn/staff/feedback", requireStaff(async (_req, res) => {
    const reborn = (await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.slug, "reborn-wave-group")).limit(1))[0]; if (!reborn) return res.json([]);
    const result=await db.execute(sql`SELECT f.*, COALESCE(NULLIF(trim(concat(u.first_name,' ',u.last_name)),''),u.email) user_name, COALESCE(NULLIF(trim(concat(s.first_name,' ',s.last_name)),''),s.email) staff_name FROM bridge_feedback f LEFT JOIN users u ON u.id=f.user_id LEFT JOIN users s ON s.id=f.staff_user_id WHERE f.company_id=${reborn.id} ORDER BY f.id DESC LIMIT 300`); res.json(result.rows||result);
  }));
  app.get("/api/reborn/admin/attendance", requireAdmin(async (req, res) => {
    const status = String(req.query.status || "");
    const base = db.select().from(staffAttendance).orderBy(desc(staffAttendance.id)).limit(200);
    const rows = status ? await db.select().from(staffAttendance).where(eq(staffAttendance.status, status)).orderBy(desc(staffAttendance.id)).limit(200) : await base;
    const ids = Array.from(new Set(rows.map((r) => r.userId)));
    const us = ids.length ? await db.select().from(users).where(inArray(users.id, ids)) : [];
    const map = new Map(us.map((u: any) => [u.id, nameOf(u)]));
    res.json(rows.map((r) => ({ ...r, staffName: map.get(r.userId) || r.userId })));
  }));
  app.post("/api/reborn/admin/attendance/:id/decide", requireAdmin(async (req, res) => {
    const approve = !!req.body?.approve;
    const [row] = await db.update(staffAttendance).set({ status: approve ? "approved" : "rejected", decidedBy: getUserId(req)!, decisionNote: req.body?.note || null }).where(eq(staffAttendance.id, Number(req.params.id))).returning();
    if (!row) return res.status(404).json({ message: "Not found" });
    await sendRebornUserNotification(row.userId, { type: "attendance_decision", title: `Attendance ${row.status}`, body: `${row.workDate}${row.decisionNote ? ` · ${row.decisionNote}` : ""}`, data: { path: "/staff", attendanceId: row.id } });
    res.json(row);
  }));
  app.get("/api/reborn/admin/shifts", requireAdmin(async (req, res) => {
    const from = String(req.query.from || ""), to = String(req.query.to || "");
    let rows;
    if (from && to) rows = await db.select().from(workerShifts).where(and(sql`${workerShifts.shiftDate} >= ${from}`, sql`${workerShifts.shiftDate} <= ${to}`)).orderBy(workerShifts.shiftDate);
    else rows = await db.select().from(workerShifts).orderBy(desc(workerShifts.shiftDate)).limit(300);
    const ids = Array.from(new Set(rows.map((r) => r.userId)));
    const us = ids.length ? await db.select().from(users).where(inArray(users.id, ids)) : [];
    const map = new Map(us.map((u: any) => [u.id, nameOf(u)]));
    res.json(rows.map((r) => ({ ...r, staffName: map.get(r.userId) || r.userId })));
  }));
  app.post("/api/reborn/admin/shifts", requireAdmin(async (req, res) => {
    const b = req.body || {};
    if (!b.userId || !b.shiftDate || !b.startTime || !b.endTime) return res.status(400).json({ message: "Worker, date and times are required." });
    const [row] = await db.insert(workerShifts).values({ userId: b.userId, shiftDate: b.shiftDate, startTime: b.startTime, endTime: b.endTime, role: b.role || null, note: b.note || null, createdBy: getUserId(req)! }).returning();
    await sendRebornUserNotification(row.userId, { type: "shift", title: "New work shift", body: `${row.shiftDate} · ${row.startTime}–${row.endTime}`, data: { path: "/staff", shiftId: row.id } });
    res.json(row);
  }));
  app.delete("/api/reborn/admin/shifts/:id", requireAdmin(async (req, res) => {
    await db.delete(workerShifts).where(eq(workerShifts.id, Number(req.params.id)));
    res.json({ ok: true });
  }));
  app.get("/api/reborn/admin/leave", requireAdmin(async (req, res) => {
    const status = String(req.query.status || "");
    const rows = status ? await db.select().from(leaveRequests).where(eq(leaveRequests.status, status)).orderBy(desc(leaveRequests.id)).limit(200) : await db.select().from(leaveRequests).orderBy(desc(leaveRequests.id)).limit(200);
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
    if (!row) return res.status(404).json({ message: "Not found" });
    await sendRebornUserNotification(row.userId, { type: "leave_decision", title: `${row.type === "mc" ? "Medical leave" : "Leave"} ${row.status}`, body: `${row.startDate} to ${row.endDate}${row.decisionNote ? ` · ${row.decisionNote}` : ""}`, data: { path: "/staff", leaveId: row.id } });
    res.json(row);
  }));

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
    res.json({ note: s.bookingNote, hoursSummary: bookingHoursSummary(), areas, days });
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
  // Member creates a booking from the app.
  app.post("/api/reborn/booking", requireAuth, async (req, res) => {
    const userId = getUserId(req)!;
    const b = req.body || {};
    const date = String(b.date || todayStr());
    const s = await getSettings();
    const areas = enabledAreas(s.bookingAreas);
    const area = areas.find((a) => a.id === b.areaId || a.name === b.area);
    if (!area) return res.status(400).json({ message: "Pick an area" });
    const slots = areaSlotsForDate(area, date);
    if (!slots.length) return res.status(400).json({ message: "Closed on that day — please pick another date." });
    const slot = slots.includes(String(b.slot)) ? String(b.slot) : null;
    if (!slot) return res.status(400).json({ message: "Pick a valid time slot" });
    const table = b.table && area.tables.includes(String(b.table)) ? String(b.table) : undefined;
    if (area.tables.length && !table) return res.status(400).json({ message: "Pick a table" });
    const whenDt = bookingWhen(areaOpenHourForDate(area, date), date, slot);
    if (await isAreaBlocked(area, whenDt)) return res.status(409).json({ message: "That time is not available. Please pick another." });
    // Prevent double-booking the same table/room at the same time.
    if (table && await isTableTaken(area, table, whenDt))
      return res.status(409).json({ message: `${table} is already booked for that time. Please pick another.` });
    const hours = Math.max(2, Math.min(8, Number(b.hours) || 2));
    const row = await createBooking({ userId, dateStr: date, slot, partySize: Number(b.partySize) || 2, hours, note: b.note, table, area: `${area.name} (${area.level})`, openHour: areaOpenHourForDate(area, date) });
    const label = areaSlotLabelsForDate(area, date)[slots.indexOf(slot)] || slot;
    const [u] = await db.select().from(users).where(eq(users.id, userId));
    await notifyAdmins(`📅 New app booking #${row.id}: ${[u?.firstName, u?.lastName].filter(Boolean).join(" ") || u?.email} · ${date} ${label} · ${row.description} — confirm in the app.`);
    await sendRebornStaffNotification({ type: "new_booking", title: "New booking request", body: `${[u?.firstName, u?.lastName].filter(Boolean).join(" ") || u?.email || "Member"} · ${date} ${label}`, data: { path: "/reborn-admin", bookingId: row.id } });
    await logAdmin(req, { targetUserId: userId, targetType: "appointment", targetId: row.id, action: "book", entityType: "booking", description: `Booked ${date} ${label}` });
    res.json({ message: `Booked ${date} at ${label}. We'll confirm shortly.`, appointment: row });
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
    res.json({ slots, hours: areaHoursTextForDate(area, date), closed: values.length === 0, taken: await takenTablesForDate(area, date) });
  });
  // A member's own bookings (includes ones made over WhatsApp — same account).
  app.get("/api/reborn/my-bookings", requireAuth, async (req, res) => {
    const userId = getUserId(req)!;
    const rows = await db.select().from(appointments).where(eq(appointments.userId, userId)).orderBy(desc(appointments.appointmentDate)).limit(50);
    res.json(rows);
  });
  app.post("/api/reborn/my-bookings/:id/cancel", requireAuth, async (req, res) => {
    const userId = getUserId(req)!;
    const id = Number(req.params.id);
    const [a] = await db.select().from(appointments).where(and(eq(appointments.id, id), eq(appointments.userId, userId)));
    if (!a) return res.status(404).json({ message: "Booking not found" });
    if (a.status === "cancelled" || a.status === "completed") return res.status(400).json({ message: "Can't cancel this booking" });
    await db.update(appointments).set({ status: "cancelled", updatedAt: new Date() }).where(eq(appointments.id, id));
    res.json({ message: "Booking cancelled" });
  });
  // Admin — all bookings (recent + upcoming) with member name/phone.
  app.get("/api/reborn/admin/bookings", requireStaff(async (req, res) => {
    const rows = await db.select().from(appointments).orderBy(desc(appointments.appointmentDate)).limit(300);
    const ids = Array.from(new Set(rows.map((r) => r.userId).filter(Boolean)));
    const us = ids.length ? await db.select().from(users).where(inArray(users.id, ids as string[])) : [];
    const umap = new Map(us.map((u) => [u.id, u]));
    const now = Date.now();
    const out = rows.map((r) => {
      const u: any = umap.get(r.userId);
      return { ...r, memberName: u ? [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email : "—", memberPhone: u?.phoneNumber || "", upcoming: new Date(r.appointmentDate).getTime() > now };
    });
    res.json(out);
  }));
  app.post("/api/reborn/admin/bookings/:id/status", requireStaff(async (req, res) => {
    const id = Number(req.params.id);
    const status = ["confirmed", "cancelled", "completed", "pending"].includes(req.body?.status) ? req.body.status : null;
    if (!status) return res.status(400).json({ message: "Bad status" });
    const note = String(req.body?.note || "").trim() || undefined;
    const [row] = await db.update(appointments).set({ status, ...(note ? { adminNote: note } : {}), updatedAt: new Date() }).where(eq(appointments.id, id)).returning();
    if (!row) return res.status(404).json({ message: "Not found" });
    // Tell the member on WhatsApp when a booking is confirmed or rejected.
    if ((status === "confirmed" || status === "cancelled") && row.userId) {
      const [u] = await db.select().from(users).where(eq(users.id, row.userId));
      if (u?.phoneNumber) {
        const when = new Date(row.appointmentDate).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
        const msg = status === "confirmed"
          ? `✅ Your booking is confirmed: ${row.title} on ${when}. See you! 💜`
          : `😔 Sorry, your booking (${row.title} on ${when}) has been cancelled${note ? `: ${note}` : "."} Please rebook a new date by typing "booking". 💜`;
        sendWhatsApp(u.phoneNumber, msg).catch(() => {});
      }
    }
    await logAdmin(req, { targetUserId: row.userId, targetType: "appointment", targetId: id, action: status, entityType: "booking", description: `Booking #${id} → ${status}${note ? ` (${note})` : ""}` });
    await sendRebornUserNotification(row.userId, { type: "booking_status", title: `Booking ${status}`, body: `${row.title}${note ? ` · ${note}` : ""}`, data: { path: "/booking", bookingId: row.id, status } });
    res.json(row);
  }));
  // Admin blocks a date/time (whole area, or one table/room) so guests can't book it.
  app.post("/api/reborn/admin/bookings/block", requireStaff(async (req, res) => {
    const b = req.body || {};
    const s = await getSettings();
    const area = enabledAreas(s.bookingAreas).find((a) => a.id === b.areaId);
    if (!area) return res.status(400).json({ message: "Pick an area" });
    const date = String(b.date || todayStr());
    const slots = areaSlotsForDate(area, date);
    const slot = slots.includes(String(b.slot)) ? String(b.slot) : null;
    if (!slot) return res.status(400).json({ message: "Pick a valid time slot" });
    const table = b.table && area.tables.includes(String(b.table)) ? String(b.table) : BLOCK_ALL;
    const when = bookingWhen(areaOpenHourForDate(area, date), date, slot);
    const [row] = await db.insert(appointments).values({
      userId: getUserId(req)!, title: "BLOCKED", service: `${area.name} (${area.level})`,
      description: `Blocked by admin${b.reason ? `: ${b.reason}` : ""}`, notes: `${area.name} (${area.level}) / ${table}`,
      appointmentDate: when, duration: 120, cost: "0", status: "blocked", adminNote: b.reason || null,
    }).returning();
    await logAdmin(req, { targetType: "appointment", targetId: row.id, action: "block", entityType: "booking", description: `Blocked ${area.name} ${b.date} ${slot} (${table})` });
    res.json({ message: `Blocked ${area.name} on ${b.date} ${slot}${table !== BLOCK_ALL ? " · " + table : " (whole area)"}.`, appointment: row });
  }));
  // Admin books on behalf of a member (auto-confirmed).
  app.post("/api/reborn/admin/bookings/manual", requireStaff(async (req, res) => {
    const b = req.body || {};
    const u = await findMemberByCode(b.memberCode || "");
    if (!u) return res.status(404).json({ message: "Member not found (code / card / username / email)" });
    const s = await getSettings();
    const area = enabledAreas(s.bookingAreas).find((a) => a.id === b.areaId);
    if (!area) return res.status(400).json({ message: "Pick an area" });
    const date = String(b.date || todayStr());
    const slots = areaSlotsForDate(area, date);
    if (!slots.length) return res.status(400).json({ message: "Closed on that day" });
    const slot = slots.includes(String(b.slot)) ? String(b.slot) : null;
    if (!slot) return res.status(400).json({ message: "Pick a valid time slot" });
    const table = b.table && area.tables.includes(String(b.table)) ? String(b.table) : undefined;
    if (area.tables.length && !table) return res.status(400).json({ message: "Pick a table" });
    const when = bookingWhen(areaOpenHourForDate(area, date), date, slot);
    if (await isAreaBlocked(area, when)) return res.status(409).json({ message: "That time is blocked" });
    if (table && await isTableTaken(area, table, when)) return res.status(409).json({ message: `${table} is already booked for that time` });
    const hours = Math.max(2, Math.min(8, Number(b.hours) || 2));
    const row = await createBooking({ userId: u.id, dateStr: date, slot, partySize: Number(b.partySize) || 2, hours, table, area: `${area.name} (${area.level})`, openHour: areaOpenHourForDate(area, date) });
    await db.update(appointments).set({ status: "confirmed" }).where(eq(appointments.id, row.id)); // admin booking = confirmed
    const label = areaSlotLabelsForDate(area, date)[slots.indexOf(slot)] || slot;
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
    if (u.phoneNumber) sendWhatsApp(u.phoneNumber, `✅ We've booked you at ${s.clubName || "Reborn Wave"}: ${area.name} on ${when.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })}${table ? ` · ${table}` : ""}. See you! 💜`).catch(() => {});
    await logAdmin(req, { targetUserId: u.id, targetType: "appointment", targetId: row.id, action: "manual_book", entityType: "booking", description: `Booked ${name} · ${area.name} ${date} ${label}` });
    res.json({ message: `Booked ${name} · ${area.name} ${date} ${label}`, appointment: row });
  }));

  // Inventory report — stock levels, valuation and low-stock alerts, grouped by category.
  app.get("/api/reborn/admin/inventory", requireAdmin(async (req, res) => {
    const lowAt = Math.max(0, Number(req.query.lowAt) || 5);
    const rows = await db.select().from(posProducts).orderBy(posProducts.category, posProducts.name);
    const items = rows.map((p) => {
      const stock = p.stock ?? 0;
      const cost = Number(p.cost) || 0;
      const price = Number(p.price) || 0;
      return {
        id: p.id, name: p.name, category: p.category, active: p.active,
        stock, cost, price, imageUrl: p.imageUrl,
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
    if (!text) return res.status(400).json({ message: "Message is empty" });
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
    if (["new", "await_lang", "await_name", "await_email", "active", "member"].includes(b.stage)) patch.stage = b.stage;
    const [row] = await db.update(crmContacts).set(patch).where(eq(crmContacts.id, id)).returning();
    if (!row) return res.status(404).json({ message: "Contact not found" });
    await logAdmin(req, { targetType: "crm_contact", targetId: id, action: "edit", entityType: "crm", description: `Edited contact ${row.name || row.phone}` });
    res.json(row);
  }));
  // Delete a contact and its messages.
  app.delete("/api/reborn/admin/crm/:id", requireAdmin(async (req, res) => {
    const id = Number(req.params.id);
    const [row] = await db.select().from(crmContacts).where(eq(crmContacts.id, id));
    if (!row) return res.status(404).json({ message: "Contact not found" });
    await db.delete(crmMessages).where(eq(crmMessages.contactId, id));
    await db.delete(crmContacts).where(eq(crmContacts.id, id));
    await logAdmin(req, { targetType: "crm_contact", targetId: id, action: "delete", entityType: "crm", description: `Deleted contact ${row.name || row.phone}` });
    res.json({ message: "Contact deleted" });
  }));

  // WhatsApp status + manual reminder trigger.
  app.get("/api/reborn/admin/whatsapp/status", requireAdmin(async (_req, res) => {
    res.json({ configured: whatsappConfigured(), adminNumber: Boolean(process.env.WA_ADMIN_NUMBER), web: getWaWebStatus() });
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
    const out = await runReminders();
    await logAdmin(req, { targetType: "whatsapp", action: "run_reminders", entityType: "whatsapp", description: `Reminders: ${out.bottles} bottle, ${out.comeback} comeback, ${out.feedback} feedback` });
    res.json({ ...out, configured: whatsappConfigured() });
  }));
}
