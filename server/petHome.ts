// Pet home: a personal room for each member's Doluruu. Members earn pet coins
// by playing games and spend them on furniture (placed in the room) and
// costumes (worn by a pet). Also stores the room's light switch.
import type { Express } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { requireAuth, getUserId } from "./multiAuth";
import { getBookingTimezone } from "./booking";

export type PetItem = { id: string; name: string; emoji: string; price: number; kind: "furniture" | "costume"; slot: string; image?: string; figure?: string; sprite?: boolean; hidden?: boolean };

// The 100 wearables from the "Customize your Doluruu" sheet. Pictures live in
// client/public/pet-items/<n>.webp (cut from the sheet). [name, price]
const WEAR_SLOTS: [string, string, [string, number][]][] = [
  ["head", "🎩", [["Crown", 150], ["Diamond Crown", 300], ["King Crown", 250], ["Prince Crown", 180], ["Party Hat", 50], ["Birthday Crown", 120], ["Santa Hat", 80], ["Witch Hat", 90], ["Wizard Hat", 110], ["Chef Hat", 70],
    ["Cowboy Hat", 90], ["Pirate Hat", 110], ["Samurai Helmet", 220], ["Viking Helmet", 200], ["Knight Helmet", 220], ["Baseball Cap", 60], ["Bucket Hat", 60], ["Beanie", 50], ["Straw Hat", 60], ["Halo", 200]]],
  ["face", "🕶️", [["Round Sunglasses", 70], ["Heart Glasses", 80], ["Cyber Visor", 150], ["Aviator Glasses", 90], ["Nerd Glasses", 50], ["Star Glasses", 80], ["Monocle", 100], ["Eye Patch", 60], ["Superhero Mask", 120], ["Ninja Mask", 120]]],
  ["neck", "📿", [["Gold Chain", 150], ["Diamond Chain", 250], ["Bell Collar", 60], ["Bow Tie", 50], ["Red Scarf", 60], ["Winter Scarf", 70], ["Hawaiian Lei", 80], ["Pearl Necklace", 150], ["Magic Amulet", 180], ["Dragon Medallion", 250]]],
  ["body", "👕", [["King Robe", 350], ["Tuxedo", 250], ["Business Suit", 220], ["Hoodie", 120], ["Varsity Jacket", 150], ["Leather Jacket", 180], ["Hawaiian Shirt", 120], ["Basketball Jersey", 130], ["Football Jersey", 130], ["Baseball Jersey", 130],
    ["Superhero Suit", 300], ["Ninja Outfit", 250], ["Samurai Armor", 400], ["Knight Armor", 400], ["Pirate Coat", 280], ["Wizard Robe", 280], ["Vampire Cape", 300], ["Angel Robe", 300], ["Devil Costume", 300], ["Astronaut Suit", 450],
    ["Firefighter Suit", 220], ["Police Costume", 220], ["Doctor Coat", 180], ["Chef Uniform", 180], ["Construction Vest", 150], ["Explorer Outfit", 200], ["Rock Star Jacket", 250], ["K-Pop Outfit", 250], ["Chinese New Year", 280], ["Batik Outfit", 220]]],
  ["back", "🪽", [["Angel Wings", 400], ["Devil Wings", 400], ["Fairy Wings", 350], ["Dragon Wings", 450], ["Jetpack", 500], ["Rocket Pack", 500], ["Cyber Wings", 450]]],
  ["aura", "✨", [["Rainbow Aura", 500], ["Fire Aura", 550], ["Ice Aura", 550], ["Lightning Aura", 550], ["Heart Aura", 450], ["Star Aura", 450], ["Money Aura", 600], ["Galaxy Aura", 600], ["Golden Aura", 650]]],
  ["hands", "🧤", [["Gold Bracelet", 150], ["Diamond Watch", 250], ["Boxing Gloves", 120], ["Magic Gloves", 200]]],
  ["feet", "👟", [["Sneakers", 100], ["Gold Sneakers", 200], ["Bunny Slippers", 90], ["Roller Skates", 150]]],
  ["tail", "🎀", [["Rainbow Tail Ring", 120], ["Gold Tail Ring", 150], ["Tail Bow", 70]]],
  ["shell", "🐢", [["Shell Jewel Set", 300], ["Neon Shell Trim", 350], ["Royal Shell Armor", 500]]],
];
// Full-body transparent figures of Doluruu wearing the item (fig-<n>.webp) exist
// for all but these; tail rings are close-ups, so they can't be the walking pet.
const NO_FIGURE = new Set([5, 16, 25, 34, 46, 55, 65]);
const NOT_SPRITE = new Set([95, 96]);
let n = 0;
const WEARABLES: PetItem[] = WEAR_SLOTS.flatMap(([slot, emoji, items]) => items.map(([name, price]) => {
  n += 1;
  const figure = NO_FIGURE.has(n) ? undefined : `/pet-items/fig-${n}.webp`;
  return { id: `w${n}`, name, emoji, price, kind: "costume" as const, slot, image: `/pet-items/${n}.webp`, figure, sprite: !!figure && !NOT_SPRITE.has(n) };
}));

// Furniture goes in one slot of the room; costumes are worn on the pet's head/face/neck.
export const PET_CATALOG: PetItem[] = [
  { id: "sofa_pink", name: "Pink sofa", emoji: "🛋️", price: 120, kind: "furniture", slot: "sofa" },
  { id: "sofa_chair", name: "Armchair", emoji: "🪑", price: 60, kind: "furniture", slot: "sofa" },
  { id: "plant_fern", name: "Fern pot", emoji: "🪴", price: 30, kind: "furniture", slot: "plant" },
  { id: "plant_tulip", name: "Tulip pot", emoji: "🌷", price: 45, kind: "furniture", slot: "plant" },
  { id: "plant_sunflower", name: "Sunflower pot", emoji: "🌻", price: 60, kind: "furniture", slot: "plant" },
  { id: "plant_cactus", name: "Cactus", emoji: "🌵", price: 40, kind: "furniture", slot: "plant" },
  { id: "plant_blossom", name: "Cherry blossom", emoji: "🌸", price: 90, kind: "furniture", slot: "plant" },
  { id: "lamp_floor", name: "Floor lamp", emoji: "🪔", price: 50, kind: "furniture", slot: "lamp" },
  { id: "lamp_candle", name: "Candles", emoji: "🕯️", price: 35, kind: "furniture", slot: "lamp" },
  { id: "art_landscape", name: "Landscape", emoji: "🖼️", price: 40, kind: "furniture", slot: "art" },
  { id: "art_rainbow", name: "Rainbow poster", emoji: "🌈", price: 55, kind: "furniture", slot: "art" },
  { id: "art_clock", name: "Wall clock", emoji: "🕰️", price: 70, kind: "furniture", slot: "art" },
  { id: "toy_ball", name: "Beach ball", emoji: "🏐", price: 25, kind: "furniture", slot: "toy" },
  { id: "toy_teddy", name: "Teddy bear", emoji: "🧸", price: 60, kind: "furniture", slot: "toy" },
  { id: "toy_gift", name: "Gift box", emoji: "🎁", price: 40, kind: "furniture", slot: "toy" },
  { id: "hat_party", name: "Party hat", emoji: "🥳", price: 50, kind: "costume", slot: "head", hidden: true },
  { id: "hat_crown", name: "Crown", emoji: "👑", price: 200, kind: "costume", slot: "head", hidden: true },
  { id: "hat_cap", name: "Cap", emoji: "🧢", price: 60, kind: "costume", slot: "head", hidden: true },
  { id: "hat_top", name: "Top hat", emoji: "🎩", price: 90, kind: "costume", slot: "head", hidden: true },
  { id: "hat_bow", name: "Ribbon", emoji: "🎀", price: 45, kind: "costume", slot: "head", hidden: true },
  { id: "glasses_cool", name: "Sunglasses", emoji: "🕶️", price: 70, kind: "costume", slot: "face", hidden: true },
  { id: "scarf_red", name: "Scarf", emoji: "🧣", price: 55, kind: "costume", slot: "neck", hidden: true },
  ...WEARABLES,
];
// Everyone starts with these so a new room isn't empty.
const STARTER_ITEMS = ["plant_fern", "art_landscape"];
const STARTER_PLACED: Record<string, string> = { plant: "plant_fern", art: "art_landscape" };

// Game rewards (see awardPetCoins callers in games.ts).
export const COINS_PER_PLAY = 5;
export const COINS_PER_WIN = 20;
export const COINS_NUMBER_CRACK = 50;
export const DAILY_COIN_CAP = 300;

let ready: Promise<void> | null = null;
function ensureTable() {
  ready ??= db.execute(sql`CREATE TABLE IF NOT EXISTS pet_homes (
    user_id varchar PRIMARY KEY,
    coins integer NOT NULL DEFAULT 0,
    owned jsonb NOT NULL DEFAULT '[]',
    placed jsonb NOT NULL DEFAULT '{}',
    costumes jsonb NOT NULL DEFAULT '{}',
    light_on boolean NOT NULL DEFAULT true,
    earned_day varchar,
    earned_today integer NOT NULL DEFAULT 0,
    updated_at timestamp NOT NULL DEFAULT now()
  )`).then(() => undefined).catch((e) => { ready = null; throw e; });
  return ready;
}

type Home = { userId: string; coins: number; owned: string[]; placed: Record<string, string>; costumes: Record<string, Record<string, string>>; lightOn: boolean; earnedDay: string | null; earnedToday: number };

function venueDay() { return new Intl.DateTimeFormat("en-CA", { timeZone: getBookingTimezone() }).format(new Date()); }

async function getHome(userId: string): Promise<Home> {
  await ensureTable();
  await db.execute(sql`INSERT INTO pet_homes (user_id, owned, placed) VALUES (${userId}, ${JSON.stringify(STARTER_ITEMS)}::jsonb, ${JSON.stringify(STARTER_PLACED)}::jsonb) ON CONFLICT (user_id) DO NOTHING`);
  const r: any = await db.execute(sql`SELECT * FROM pet_homes WHERE user_id = ${userId}`);
  const row = (r.rows || r)[0];
  return { userId, coins: row.coins, owned: row.owned || [], placed: row.placed || {}, costumes: row.costumes || {}, lightOn: row.light_on, earnedDay: row.earned_day, earnedToday: row.earned_today };
}

// Credit pet coins for playing games, up to DAILY_COIN_CAP per venue day. Never throws.
export async function awardPetCoins(userId: string, amount: number) {
  try {
    if (!userId || amount <= 0) return;
    const home = await getHome(userId);
    const day = venueDay();
    const earned = home.earnedDay === day ? home.earnedToday : 0;
    const add = Math.max(0, Math.min(amount, DAILY_COIN_CAP - earned));
    if (!add) return;
    await db.execute(sql`UPDATE pet_homes SET coins = coins + ${add}, earned_day = ${day}, earned_today = ${earned + add}, updated_at = now() WHERE user_id = ${userId}`);
  } catch (e) { console.error("[petHome] award", e); }
}

function view(h: Home) {
  const day = venueDay();
  return {
    coins: h.coins, owned: h.owned, placed: h.placed, costumes: h.costumes, lightOn: h.lightOn,
    earnedToday: h.earnedDay === day ? h.earnedToday : 0, dailyCap: DAILY_COIN_CAP,
    rewards: { play: COINS_PER_PLAY, win: COINS_PER_WIN, numberCrack: COINS_NUMBER_CRACK },
    timezone: getBookingTimezone(), catalog: PET_CATALOG,
  };
}

export function registerPetHomeRoutes(app: Express) {
  app.get("/api/reborn/pet-home", requireAuth, async (req, res) => {
    try { res.json(view(await getHome(getUserId(req)!))); }
    catch (e) { console.error("[petHome] get", e); res.status(500).json({ message: "Failed to load pet home" }); }
  });

  app.post("/api/reborn/pet-home/buy", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const item = PET_CATALOG.find((i) => i.id === req.body?.itemId);
      if (!item || item.hidden) return res.status(404).json({ message: "Item not found" });
      const home = await getHome(userId);
      if (home.owned.includes(item.id)) return res.status(400).json({ message: "You already own this" });
      // Atomic: only succeeds if the balance still covers the price.
      const r: any = await db.execute(sql`UPDATE pet_homes SET coins = coins - ${item.price}, owned = owned || ${JSON.stringify([item.id])}::jsonb, updated_at = now()
        WHERE user_id = ${userId} AND coins >= ${item.price} AND NOT (owned ? ${item.id}) RETURNING user_id`);
      if (!(r.rows || r).length) return res.status(400).json({ message: `Not enough pet coins — ${item.name} costs ${item.price}` });
      res.json({ message: `${item.emoji} ${item.name} is yours!`, ...view(await getHome(userId)) });
    } catch (e) { console.error("[petHome] buy", e); res.status(500).json({ message: "Purchase failed" }); }
  });

  // Put an owned furniture item in its slot (itemId null clears the slot).
  app.post("/api/reborn/pet-home/place", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const slot = String(req.body?.slot || "");
      const itemId = req.body?.itemId ? String(req.body.itemId) : null;
      const home = await getHome(userId);
      if (itemId) {
        const item = PET_CATALOG.find((i) => i.id === itemId);
        if (!item || item.kind !== "furniture" || item.slot !== slot) return res.status(400).json({ message: "That doesn't go there" });
        if (!home.owned.includes(itemId)) return res.status(400).json({ message: "Buy it first" });
      } else if (!PET_CATALOG.some((i) => i.kind === "furniture" && i.slot === slot)) return res.status(400).json({ message: "Unknown spot" });
      const placed = { ...home.placed };
      if (itemId) placed[slot] = itemId; else delete placed[slot];
      await db.execute(sql`UPDATE pet_homes SET placed = ${JSON.stringify(placed)}::jsonb, updated_at = now() WHERE user_id = ${userId}`);
      res.json(view({ ...home, placed }));
    } catch (e) { console.error("[petHome] place", e); res.status(500).json({ message: "Failed" }); }
  });

  // Dress a pet: toggles an owned costume on/off for that pet (one per slot).
  app.post("/api/reborn/pet-home/wear", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const petId = String(Number(req.body?.petId) || "");
      const item = PET_CATALOG.find((i) => i.id === req.body?.itemId && i.kind === "costume");
      if (!petId || !item) return res.status(400).json({ message: "Pick a costume" });
      const home = await getHome(userId);
      if (!home.owned.includes(item.id)) return res.status(400).json({ message: "Buy it first" });
      const costumes = { ...home.costumes, [petId]: { ...(home.costumes[petId] || {}) } };
      if (costumes[petId][item.slot] === item.id) delete costumes[petId][item.slot]; else costumes[petId][item.slot] = item.id;
      await db.execute(sql`UPDATE pet_homes SET costumes = ${JSON.stringify(costumes)}::jsonb, updated_at = now() WHERE user_id = ${userId}`);
      res.json(view({ ...home, costumes }));
    } catch (e) { console.error("[petHome] wear", e); res.status(500).json({ message: "Failed" }); }
  });

  app.post("/api/reborn/pet-home/light", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const on = !!req.body?.on;
      const home = await getHome(userId);
      await db.execute(sql`UPDATE pet_homes SET light_on = ${on}, updated_at = now() WHERE user_id = ${userId}`);
      res.json(view({ ...home, lightOn: on }));
    } catch (e) { console.error("[petHome] light", e); res.status(500).json({ message: "Failed" }); }
  });
}
