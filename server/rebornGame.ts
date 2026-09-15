// Reborn Wave gamified economy: pet lifecycle, spin-the-wheel, support/FAQ, admin config.
import type { Express, Request, Response } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { requireAuth, getUserId } from "./multiAuth";
import {
  pets, users, tokenTransactions, activationCodes, petPills,
  spinPrizes, spinResults, faqItems, supportTickets, supportMessages,
  kosGifts, songs, songRequests, friendships, chatMessages,
} from "@shared/schema";
import { ilike, or } from "drizzle-orm";

const GIFT_TYPES: Record<string, number> = { rose: 1, heart: 5, diamond: 20, crown: 50 };

const LIFE_DAYS = 15;
const FEEDS_PER_DAY = 3;
const EGG_HATCH_DAYS = 15;
const SPIN_COST = 1;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_PETS = 2;                 // living pets a member can hold at once
const DECAY_PER_MIN = 100 / 240;    // stats fall 100 → 0 over 4 hours
const ENERGY_REGEN_PER_MIN = 0.1;   // sleeping: +1 energy per 10 min
const ACTION_ENERGY_COST = 10;      // feed/play/clean each cost energy
const STAT_GAIN = 30;               // each action raises its bar by 30%
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
  const today = wibDay();
  const feedsToday = pet.lastFeedDay === today ? (pet.feedsToday || 0) : 0;
  const tokenEarnedToday = pet.lastTokenClaim ? wibDay(new Date(pet.lastTokenClaim)) === today : false;
  return {
    id: pet.id, name: pet.name, gender: pet.gender,
    isEgg: pet.isEgg, lifeStatus: pet.lifeStatus, isSleeping: !!pet.isSleeping,
    hatchDaysLeft: pet.isEgg ? daysLeft(pet.hatchAt) : 0,
    daysLeft: pet.isEgg ? 0 : daysLeft(pet.expiresAt),
    happiness: clamp(pet.happiness ?? 60), hunger: clamp(pet.hunger ?? 60),
    cleanliness: clamp(pet.cleanliness ?? 60), energy: clamp(pet.energy ?? 60),
    feedsToday, feedsNeeded: FEEDS_PER_DAY, tokenEarnedToday,
    canFeed: !pet.isEgg && pet.lifeStatus === "active" && feedsToday < FEEDS_PER_DAY,
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
  { label: "Doluruu egg", prizeType: "egg", value: 0, weight: 5, colorHex: "#fb7185" },
  { label: "Free dish", prizeType: "item", value: 0, weight: 10, colorHex: "#f97316" },
  { label: "Nothing", prizeType: "nothing", value: 0, weight: 35, colorHex: "#64748b" },
];

const DEFAULT_FAQ = [
  { question: "How do I activate my pet?", answer: "Buy a blindbox package at the club, then open Pet Care and enter the activation code printed on your package. Your Doluruu will come to life for 15 days.", keywords: "activate,activation,code,package,start pet,new pet" },
  { question: "How do I earn tokens?", answer: "Feed your pet 3 times a day. Each full day of feeding (3 feeds) earns you 1 token. Tokens can be spent on the Spin the Wheel game for prizes.", keywords: "token,earn,feed,feeding,reward" },
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
      res.json({ message: "Your Doluruu is alive! Feed it 3 times a day to earn tokens.", pet: petView(pet) });
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
      if (feeds >= FEEDS_PER_DAY) return res.status(400).json({ message: "You've already fed your pet 3 times today. Come back tomorrow!" });
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
      } else if (action === "feed" || action === "play" || action === "clean") {
        if (energy <= 0) return res.status(400).json({ message: "Too tired! Tap Sleep to recover energy first." });
        energy = clamp(energy - ACTION_ENERGY_COST);
        if (action === "feed") {
          hunger = clamp(hunger + STAT_GAIN);
          let feeds = pet.lastFeedDay === today ? (pet.feedsToday || 0) : 0;
          feeds += 1; update.feedsToday = feeds; update.lastFeedDay = today; update.lastFedAt = now;
          const earnedToday = pet.lastTokenClaim ? wibDay(new Date(pet.lastTokenClaim)) === today : false;
          if (feeds >= FEEDS_PER_DAY && !earnedToday) {
            update.lastTokenClaim = now; update.totalTokensEarned = (pet.totalTokensEarned || 0) + 1;
            await db.update(users).set({ tokens: sql`${users.tokens} + 1`, updatedAt: now }).where(eq(users.id, userId));
            await db.insert(tokenTransactions).values({ userId, tokens: 1, type: "earned", status: "completed", description: `Daily care token from ${pet.name}`, relatedId: pet.id });
            tokenAwarded = true;
          }
          message = tokenAwarded ? "Full belly! You earned 1 token 🎉" : "Yum! Hunger +30";
        } else if (action === "play") { happiness = clamp(happiness + STAT_GAIN); message = "So much fun! Joy +30"; }
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
      res.json({ cost: SPIN_COST, prizes: rows });
    } catch (e) { console.error("spin prizes", e); res.status(500).json({ message: "Failed to load prizes" }); }
  });

  app.post("/api/reborn/spin", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      await seedPrizesIfEmpty();
      const user = await storage.getUser(userId);
      if (!user || (user.tokens || 0) < SPIN_COST) return res.status(400).json({ message: "Not enough tokens. Feed your pet to earn more." });

      const prizes = await db.select().from(spinPrizes).where(eq(spinPrizes.active, true)).orderBy(spinPrizes.sortOrder);
      if (prizes.length === 0) return res.status(400).json({ message: "The wheel isn't set up yet. Please check back soon." });
      const total = prizes.reduce((s, p) => s + Math.max(0, p.weight || 0), 0);
      let r = Math.random() * total;
      let picked = prizes[prizes.length - 1];
      for (const p of prizes) { r -= Math.max(0, p.weight || 0); if (r <= 0) { picked = p; break; } }
      const index = prizes.findIndex((p) => p.id === picked.id);

      const now = new Date();
      // Spend a token
      await db.update(users).set({ tokens: sql`${users.tokens} - ${SPIN_COST}`, updatedAt: now }).where(eq(users.id, userId));
      await db.insert(tokenTransactions).values({ userId, tokens: -SPIN_COST, type: "spent", status: "completed", description: "Spin the Wheel" });

      let status = "won";
      let freeSpin = false;
      if (picked.prizeType === "free_spin") {
        freeSpin = true;
        await db.update(users).set({ tokens: sql`${users.tokens} + ${SPIN_COST}`, updatedAt: now }).where(eq(users.id, userId));
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
        tokensSpent: SPIN_COST, status,
      }).returning();

      const fresh = await storage.getUser(userId);
      res.json({
        prizeIndex: index, prize: picked, freeSpin, status,
        tokens: fresh?.tokens ?? 0, resultId: result.id,
        message:
          picked.prizeType === "nothing" ? "So close! Better luck next spin." :
          freeSpin ? "Free spin! Go again — this one's on us." :
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

      // Auto-reply: match FAQ keywords/questions
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
      let autoReply: string | null = null;
      if (best && bestScore > 0) {
        autoReply = best.answer;
        await db.insert(supportMessages).values({ ticketId: ticket.id, senderType: "ai", content: autoReply });
        await db.update(supportTickets).set({ status: "ai_replied", updatedAt: new Date() }).where(eq(supportTickets.id, ticket.id));
      }
      const msgs = await db.select().from(supportMessages).where(eq(supportMessages.ticketId, ticket.id)).orderBy(supportMessages.createdAt);
      res.json({ ticketId: ticket.id, autoReply, messages: msgs });
    } catch (e) { console.error("support ask", e); res.status(500).json({ message: "Send failed" }); }
  });

  // ── KOS (Kings of Singers) — gifting + leaderboard ───────────────────────
  app.get("/api/reborn/kos/leaderboard", async (_req, res) => {
    try {
      const rows = await db.select({
        id: users.id, firstName: users.firstName, username: users.username, photo: users.profileImageUrl,
        stars: sql<number>`coalesce(sum(${kosGifts.amount}),0)`,
      }).from(kosGifts).innerJoin(users, eq(users.id, kosGifts.toUserId))
        .groupBy(users.id, users.firstName, users.username, users.profileImageUrl)
        .orderBy(desc(sql`sum(${kosGifts.amount})`)).limit(100);
      res.json(rows);
    } catch (e) { console.error("kos leaderboard", e); res.status(500).json({ message: "Failed to load leaderboard" }); }
  });

  app.get("/api/reborn/kos/search", requireAuth, async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      if (q.length < 2) return res.json([]);
      const rows = await db.select({ id: users.id, firstName: users.firstName, username: users.username, photo: users.profileImageUrl })
        .from(users).where(or(ilike(users.username, `%${q}%`), ilike(users.firstName, `%${q}%`))).limit(20);
      res.json(rows);
    } catch { res.json([]); }
  });

  app.post("/api/reborn/kos/gift", requireAuth, async (req, res) => {
    try {
      const fromUserId = getUserId(req)!;
      const toUserId = String(req.body?.toUserId || "");
      const giftType = String(req.body?.giftType || "rose");
      const amount = GIFT_TYPES[giftType] || 1;
      if (!toUserId) return res.status(400).json({ message: "Choose someone to gift" });
      if (toUserId === fromUserId) return res.status(400).json({ message: "You can't gift yourself" });
      const giver = await storage.getUser(fromUserId);
      if (!giver || (giver.tokens || 0) < amount) return res.status(400).json({ message: `Need ${amount} tokens for a ${giftType}. Feed your pet to earn more.` });
      const now = new Date();
      await db.update(users).set({ tokens: sql`${users.tokens} - ${amount}`, updatedAt: now }).where(eq(users.id, fromUserId));
      await db.insert(tokenTransactions).values({ userId: fromUserId, tokens: -amount, type: "spent", status: "completed", description: `KOS ${giftType} gift` });
      await db.insert(kosGifts).values({ fromUserId, toUserId, giftType, amount });
      const fresh = await storage.getUser(fromUserId);
      res.json({ message: `Sent a ${giftType}! ⭐ +${amount}`, tokens: fresh?.tokens ?? 0 });
    } catch (e) { console.error("kos gift", e); res.status(500).json({ message: "Gift failed" }); }
  });

  app.get("/api/reborn/kos/me", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const [got] = await db.select({ stars: sql<number>`coalesce(sum(${kosGifts.amount}),0)` }).from(kosGifts).where(eq(kosGifts.toUserId, userId));
      res.json({ starsReceived: Number(got?.stars || 0) });
    } catch { res.json({ starsReceived: 0 }); }
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
      res.json({ message: "sent" });
    } catch (e) { console.error("chat send", e); res.status(500).json({ message: "Send failed" }); }
  });

  // ── Song requests + Top 500 library ──────────────────────────────────────
  app.get("/api/reborn/songs", async (_req, res) => {
    try {
      const rows = await db.select().from(songs).orderBy(desc(songs.isHit), desc(songs.requestCount), songs.title).limit(500);
      res.json(rows);
    } catch (e) { console.error("songs", e); res.status(500).json({ message: "Failed to load songs" }); }
  });

  app.post("/api/reborn/songs/request", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      let { songId, title, artist, spotifyUrl, artistPhoto } = req.body || {};
      let song: any = null;
      if (songId) {
        [song] = await db.select().from(songs).where(eq(songs.id, Number(songId)));
        if (!song) return res.status(404).json({ message: "Song not found" });
        await db.update(songs).set({ requestCount: (song.requestCount || 0) + 1 }).where(eq(songs.id, song.id));
        title = song.title; artist = song.artist;
      } else {
        if (!title || !String(title).trim()) return res.status(400).json({ message: "Enter a song title" });
        [song] = await db.insert(songs).values({ title: String(title).trim(), artist: artist || "", spotifyUrl: spotifyUrl || null, artistPhoto: artistPhoto || null, isHit: false, requestCount: 1, createdBy: userId }).returning();
        songId = song.id;
      }
      const [reqRow] = await db.insert(songRequests).values({ userId, songId: Number(songId), title: song.title, artist: song.artist || "", status: "pending" }).returning();
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

  // ── Admin ────────────────────────────────────────────────────────────────
  app.post("/api/reborn/admin/codes", requireAdmin(async (req, res) => {
    const adminId = getUserId(req)!;
    const count = Math.min(200, Math.max(1, Number(req.body?.count) || 1));
    const gender = req.body?.gender === "female" ? "female" : "male";
    const made: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = "RW-" + Math.random().toString(36).slice(2, 8).toUpperCase();
      await db.insert(activationCodes).values({ code, petGender: gender, createdBy: adminId });
      made.push(code);
    }
    res.json({ codes: made });
  }));

  app.get("/api/reborn/admin/codes", requireAdmin(async (_req, res) => {
    const rows = await db.select().from(activationCodes).orderBy(desc(activationCodes.createdAt)).limit(300);
    res.json(rows);
  }));

  app.post("/api/reborn/admin/grant-pill", requireAdmin(async (req, res) => {
    const adminId = getUserId(req)!;
    const targetUserId = String(req.body?.userId || "");
    if (!targetUserId) return res.status(400).json({ message: "userId required" });
    await db.insert(petPills).values({ userId: targetUserId, grantedBy: adminId, note: req.body?.note || "300,000 RP visit reward" });
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
      value: Number(b.value) || 0, weight: Number(b.weight) || 10, colorHex: b.colorHex || "#c9a84c",
      active: b.active !== false, sortOrder: Number(b.sortOrder) || 0,
    }).returning();
    res.json(row);
  }));
  app.put("/api/reborn/admin/prizes/:id", requireAdmin(async (req, res) => {
    const id = Number(req.params.id); const b = req.body || {};
    const patch: any = { updatedAt: new Date() };
    for (const k of ["label", "description", "prizeType", "colorHex"]) if (b[k] !== undefined) patch[k] = b[k];
    for (const k of ["value", "weight", "sortOrder"]) if (b[k] !== undefined) patch[k] = Number(b[k]);
    if (b.active !== undefined) patch.active = !!b.active;
    const [row] = await db.update(spinPrizes).set(patch).where(eq(spinPrizes.id, id)).returning();
    res.json(row);
  }));
  app.delete("/api/reborn/admin/prizes/:id", requireAdmin(async (req, res) => {
    await db.delete(spinPrizes).where(eq(spinPrizes.id, Number(req.params.id)));
    res.json({ message: "Deleted" });
  }));

  app.get("/api/reborn/admin/redemptions", requireAdmin(async (_req, res) => {
    const rows = await db.select().from(spinResults).where(eq(spinResults.status, "redeeming")).orderBy(desc(spinResults.createdAt)).limit(200);
    res.json(rows);
  }));
  app.post("/api/reborn/admin/redemptions/:id", requireAdmin(async (req, res) => {
    const adminId = getUserId(req)!;
    const id = Number(req.params.id);
    const approve = req.body?.approve !== false;
    const [row] = await db.update(spinResults).set({
      status: approve ? "redeemed" : "rejected", redeemedAt: new Date(), adminId,
    }).where(eq(spinResults.id, id)).returning();
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
  app.get("/api/reborn/admin/song-requests", requireAdmin(async (_req, res) => {
    const rows = await db.select().from(songRequests).where(eq(songRequests.status, "pending")).orderBy(desc(songRequests.createdAt)).limit(200);
    res.json(rows);
  }));
  app.post("/api/reborn/admin/song-requests/:id", requireAdmin(async (req, res) => {
    const adminId = getUserId(req)!;
    const approve = req.body?.approve !== false;
    const [row] = await db.update(songRequests).set({ status: approve ? "confirmed" : "rejected", confirmedAt: new Date(), adminId }).where(eq(songRequests.id, Number(req.params.id))).returning();
    res.json(row);
  }));
  app.post("/api/reborn/admin/songs", requireAdmin(async (req, res) => {
    const adminId = getUserId(req)!; const b = req.body || {};
    const [row] = await db.insert(songs).values({
      title: b.title || "New song", artist: b.artist || "", spotifyUrl: b.spotifyUrl || null,
      artistPhoto: b.artistPhoto || null, isHit: b.isHit !== false, requestCount: Number(b.requestCount) || 0, createdBy: adminId,
    }).returning();
    res.json(row);
  }));
  app.put("/api/reborn/admin/songs/:id", requireAdmin(async (req, res) => {
    const id = Number(req.params.id); const b = req.body || {}; const patch: any = {};
    for (const k of ["title", "artist", "spotifyUrl", "artistPhoto"]) if (b[k] !== undefined) patch[k] = b[k];
    if (b.isHit !== undefined) patch.isHit = !!b.isHit;
    if (b.requestCount !== undefined) patch.requestCount = Number(b.requestCount);
    const [row] = await db.update(songs).set(patch).where(eq(songs.id, id)).returning();
    res.json(row);
  }));
  app.delete("/api/reborn/admin/songs/:id", requireAdmin(async (req, res) => {
    await db.delete(songs).where(eq(songs.id, Number(req.params.id)));
    res.json({ message: "Deleted" });
  }));

  // Admin support: list open tickets + reply as staff
  app.get("/api/reborn/admin/support", requireAdmin(async (_req, res) => {
    const tickets = await db.select().from(supportTickets).where(sql`${supportTickets.status} != 'closed'`).orderBy(desc(supportTickets.updatedAt)).limit(100);
    res.json(tickets);
  }));
  app.get("/api/reborn/admin/support/:ticketId", requireAdmin(async (req, res) => {
    const tid = Number(req.params.ticketId);
    const msgs = await db.select().from(supportMessages).where(eq(supportMessages.ticketId, tid)).orderBy(supportMessages.createdAt);
    res.json(msgs);
  }));
  app.post("/api/reborn/admin/support/:ticketId", requireAdmin(async (req, res) => {
    const adminId = getUserId(req)!;
    const tid = Number(req.params.ticketId);
    const content = String(req.body?.message || "").trim();
    if (!content) return res.status(400).json({ message: "Empty message" });
    await db.insert(supportMessages).values({ ticketId: tid, senderType: "staff", senderId: adminId, content });
    await db.update(supportTickets).set({ status: "open", updatedAt: new Date() }).where(eq(supportTickets.id, tid));
    res.json({ message: "Sent" });
  }));
}
