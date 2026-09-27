// Pet home: a personal room for each member's Doluruu. Members earn pet coins
// by playing games and spend them on furniture (placed in the room) and
// costumes (worn by a pet). Also stores the room's light switch.
import type { Express } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { requireAuth, getUserId } from "./multiAuth";
import { getBookingTimezone } from "./booking";

export type PetItem = { id: string; name: string; emoji: string; price: number; kind: "furniture" | "costume"; slot: string; image?: string; figure?: string; sprite?: boolean; layer?: string; eyes?: number[]; overlay?: string; anchor?: number[]; hidden?: boolean };

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
// Clothing + footwear mix & match: each clothing item is a full-body figure on a
// shared 300x360 canvas; each footwear item is a shoes-only layer on the same
// canvas, so the client stacks clothing (or the shirtless base) + footwear.
export const BASE_LAYER = "/pet-items/cloth-1.webp"; // shirtless, barefoot
// Eye centre + eye distance on each clothing canvas (300x360), measured from the art.
// Head/face items are drawn as overlays (ov-<n>.webp) scaled/placed by these.
const CLOTH_EYES: Record<number, number[]> = {"1": [167.9, 133.6, 96.5], "2": [145.0, 134.8, 94.5], "3": [147.3, 135.3, 94.3], "4": [146.1, 132.9, 92.8], "5": [140.8, 135.4, 91.8], "6": [148.9, 133.8, 95.0], "7": [143.9, 136.4, 93.1], "8": [146.8, 136.5, 92.5], "9": [137.5, 135.9, 92.6], "10": [132.9, 134.6, 94.1], "11": [156.3, 135.7, 95.7], "12": [140.4, 137.3, 93.6], "13": [135.9, 144.8, 88.3], "14": [137.2, 138.2, 93.6], "15": [139.7, 139.0, 88.7], "16": [134.9, 144.2, 92.9], "17": [135.6, 142.3, 90.6], "18": [140.6, 139.0, 87.7], "19": [146.6, 137.0, 92.7], "20": [135.0, 133.7, 94.9], "21": [149.9, 145.3, 82.8], "22": [135.3, 139.4, 85.7], "23": [147.8, 151.7, 82.8], "24": [145.0, 148.4, 80.9], "25": [148.2, 155.2, 82.5], "26": [137.8, 142.0, 91.7], "27": [127.4, 125.1, 92.8], "28": [143.4, 137.3, 94.9], "29": [137.5, 136.4, 94.6], "30": [137.8, 133.9, 93.6]};
export const BASE_EYES = CLOTH_EYES[1];
// Overlay anchor per head/face item: [eyeX, eyeY, eyeDist, width, height] in overlay px.
const OVERLAY_ANCHOR: Record<number, number[]> = {"1": [89.6, 130.1, 79.0, 214, 109], "2": [91.5, 137.3, 77.7, 222, 117], "3": [77.3, 141.4, 74.4, 208, 122], "4": [70.8, 145.5, 69.0, 198, 128], "5": [92, 160, 75, 225, 141], "6": [82.0, 145.1, 73.9, 220, 126], "7": [78.9, 130.1, 73.6, 222, 111], "8": [70.1, 136.3, 73.5, 222, 117], "9": [78.9, 138.4, 75.0, 242, 119], "10": [80, 128, 65, 222, 111], "11": [94.7, 118.2, 77.3, 220, 98], "12": [84.7, 121.5, 72.4, 218, 103], "13": [79.8, 123.0, 72.8, 212, 104], "14": [79.6, 121.9, 76.2, 214, 102], "15": [77, 113, 69, 216, 95], "16": [98, 142, 87, 225, 120], "17": [74.6, 100.9, 75.9, 222, 81], "18": [74, 106, 70, 216, 88], "19": [89.6, 110.7, 72.7, 224, 92], "20": [74.7, 126.1, 78.0, 210, 106], "21": [88, 41, 73, 175, 81], "22": [81, 44, 80, 177, 88], "23": [90, 42, 75, 180, 83], "24": [92.8, 48.0, 87.2, 197, 96], "25": [90, 53, 95, 204, 105], "26": [89, 44, 79, 183, 87], "27": [71, 46, 83, 170, 91], "28": [86, 48, 86, 189, 95], "29": [85.2, 46.8, 84.4, 186, 93], "30": [70, 32, 58, 139, 63]};
const CLOTHING_LIST: [string, number][] = [["T-Shirt", 80], ["Hoodie", 120], ["Jacket", 150], ["Leather Jacket", 180], ["Bomber Jacket", 170], ["Denim Jacket", 150],
  ["Sports Jersey", 130], ["Football Jersey", 130], ["Baseball Jersey", 130], ["Suit & Tie", 220], ["Tuxedo", 250], ["Chef Outfit", 180], ["Doctor Coat", 180],
  ["Police Uniform", 220], ["Firefighter", 220], ["Construction", 160], ["Explorer", 200], ["Adventurer", 220], ["Ninja Outfit", 250], ["Samurai Armor", 400],
  ["Knight Armor", 400], ["Wizard Robe", 300], ["King Robe", 380], ["Angel Outfit", 320], ["Devil Outfit", 320], ["Astronaut Suit", 450], ["Chinese Outfit", 280],
  ["K-Pop Outfit", 260], ["Hawaiian Shirt", 120]];
const CLOTHING: PetItem[] = CLOTHING_LIST.map(([name, price], i) => ({ id: `c${i + 2}`, name, emoji: "👕", price, kind: "costume", slot: "clothing", figure: `/pet-items/cloth-${i + 2}.webp`, layer: `/pet-items/cloth-${i + 2}.webp`, eyes: CLOTH_EYES[i + 2] }));
const FOOTWEAR_LIST: [string, number][] = [["Classic Sneakers", 80], ["Sport Sneakers", 90], ["Gold Sneakers", 250], ["Silver Sneakers", 200], ["Black Sneakers", 90],
  ["Red Sneakers", 90], ["Green Sneakers", 90], ["Rainbow Sneakers", 150], ["LED Sneakers", 220], ["Basketball Shoes", 130],
  ["Football Cleats", 120], ["Roller Skates", 180], ["Bunny Slippers", 90], ["Bear Slippers", 90], ["Panda Slippers", 90],
  ["Chicken Slippers", 90], ["Dinosaur Slippers", 110], ["Shark Slippers", 110], ["Unicorn Slippers", 130], ["Cat Slippers", 90],
  ["Dog Slippers", 90], ["Dragon Slippers", 150], ["Tiger Slippers", 110], ["Pig Slippers", 90], ["Cow Slippers", 90],
  ["Fuzzy Boots", 140], ["Winter Boots", 160], ["Snow Boots", 170], ["Neon Sneakers", 260], ["Golden Wing Sneakers", 400]];
const FOOTWEAR: PetItem[] = FOOTWEAR_LIST.map(([name, price], i) => ({ id: `s${i + 1}`, name, emoji: "👟", price, kind: "costume", slot: "footwear", figure: `/pet-items/shoefig-${i + 1}.webp`, layer: `/pet-items/shoe-${i + 1}.webp` }));

// Full-body transparent figures of Doluruu wearing the item (fig-<n>.webp) exist
// for all but these; tail rings are close-ups, so they can't be the walking pet.
const NO_FIGURE = new Set([5, 16, 25, 34, 46, 55, 65]);
const NOT_SPRITE = new Set([95, 96]);
let n = 0;
const WEARABLES: PetItem[] = WEAR_SLOTS.flatMap(([slot, emoji, items]) => items.map(([name, price]) => {
  n += 1;
  const figure = NO_FIGURE.has(n) ? undefined : `/pet-items/fig-${n}.webp`;
  // Body and feet from the first sheet are replaced by the clothing/footwear sets.
  const hidden = slot === "body" || slot === "feet";
  const ov = OVERLAY_ANCHOR[n] ? { overlay: `/pet-items/ov-${n}.webp`, anchor: OVERLAY_ANCHOR[n] } : {};
  return { id: `w${n}`, name, emoji, price, kind: "costume" as const, slot, image: `/pet-items/${n}.webp`, figure, sprite: !!figure && !NOT_SPRITE.has(n), ...ov, ...(hidden ? { hidden: true } : {}) };
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
  ...CLOTHING,
  ...FOOTWEAR,
];
// Everyone starts with these so a new room isn't empty.
// (Clothing/footwear defaults: shirtless and barefoot — see BASE_LAYER.)
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
    timezone: getBookingTimezone(), catalog: PET_CATALOG, baseLayer: BASE_LAYER, baseEyes: BASE_EYES,
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
