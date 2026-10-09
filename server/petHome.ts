// Pet home: a personal room for each member's Doluruu. Members earn pet coins
// by playing games and spend them on furniture (placed in the room) and
// costumes (worn by a pet). Also stores the room's light switch.
import type { Express } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { homeCompanySlug } from "./tenantContext";
import { requireAuth, getUserId } from "./multiAuth";
import { getBookingTimezone } from "./booking";
import { reqLang, tr, type Lang } from "./i18n";

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
const CLOTH_EYES: Record<number, number[]> = { 1: [167.9, 133.6, 96.5] };
export const BASE_EYES = CLOTH_EYES[1];
// Overlay anchor per head/face item: [eyeX, eyeY, eyeDist, width, height] in overlay px.
const OVERLAY_ANCHOR: Record<number, number[]> = {"1": [89.6, 130.1, 79.0, 214, 109], "2": [91.5, 137.3, 77.7, 222, 117], "3": [77.3, 141.4, 74.4, 208, 122], "4": [70.8, 145.5, 69.0, 198, 128], "5": [92, 160, 75, 225, 141], "6": [82.0, 145.1, 73.9, 220, 126], "7": [78.9, 130.1, 73.6, 222, 111], "8": [70.1, 136.3, 73.5, 222, 117], "9": [78.9, 138.4, 75.0, 242, 119], "10": [80, 128, 65, 222, 111], "11": [94.7, 118.2, 77.3, 220, 98], "12": [84.7, 121.5, 72.4, 218, 103], "13": [79.8, 123.0, 72.8, 212, 104], "14": [79.6, 121.9, 76.2, 214, 102], "15": [77, 113, 69, 216, 95], "16": [98, 142, 87, 225, 120], "17": [74.6, 100.9, 75.9, 222, 81], "18": [74, 106, 70, 216, 88], "19": [89.6, 110.7, 72.7, 224, 92], "20": [74.7, 126.1, 78.0, 210, 106], "21": [88, 41, 73, 175, 81], "22": [81, 44, 80, 177, 88], "23": [90, 42, 75, 180, 83], "24": [92.8, 48.0, 87.2, 197, 96], "25": [90, 53, 95, 204, 105], "26": [89, 44, 79, 183, 87], "27": [71, 46, 83, 170, 91], "28": [86, 48, 86, 189, 95], "29": [85.2, 46.8, 84.4, 186, 93], "30": [70, 32, 58, 139, 63]};
// Neck items: chain / scarf / lei cut from each item's picture (ov-<n>.webp), same anchor format.
Object.assign(OVERLAY_ANCHOR, { "31": [66.5, -40, 71, 128, 60], "32": [59.5, -40, 71, 121, 60], "33": [59.5, -40, 71, 116, 60], "35": [66.5, -40, 71, 134, 60], "36": [66.5, -40, 71, 134, 60], "37": [66.5, -40, 71, 134, 60], "38": [66.5, -40, 71, 126, 60], "39": [65.5, -40, 71, 122, 60], "40": [68.5, -41, 73, 127, 59] });
// Items that can't be drawn on the walking pet (their pictures are half-body close-ups):
// wings/packs, auras, hand items, tail rings, shell items and the Bow Tie. Off sale; owners get refunded.
export const REMOVED_WEARABLES = new Set([34, ...Array.from({ length: 20 }, (_, i) => 71 + i), 95, 96, 97, 98, 99, 100]);
// The first clothing sheet (cloth-2…30) is off sale: its pictures were cut off at the
// sheet edges. Owners get their pet coins back (refundRemovedWearables). [name, price]
const OLD_CLOTHING: [string, number][] = [["T-Shirt", 80], ["Hoodie", 120], ["Jacket", 150], ["Leather Jacket", 180], ["Bomber Jacket", 170], ["Denim Jacket", 150],
  ["Sports Jersey", 130], ["Football Jersey", 130], ["Baseball Jersey", 130], ["Suit & Tie", 220], ["Tuxedo", 250], ["Chef Outfit", 180], ["Doctor Coat", 180],
  ["Police Uniform", 220], ["Firefighter", 220], ["Construction", 160], ["Explorer", 200], ["Adventurer", 220], ["Ninja Outfit", 250], ["Samurai Armor", 400],
  ["Knight Armor", 400], ["Wizard Robe", 300], ["King Robe", 380], ["Angel Outfit", 320], ["Devil Outfit", 320], ["Astronaut Suit", 450], ["Chinese Outfit", 280],
  ["K-Pop Outfit", 260], ["Hawaiian Shirt", 120]];
const OLD_CLOTHING_PRICE = new Map<string, number>(OLD_CLOTHING.map(([, price], i) => [`c${i + 2}`, price]));
// The RWG outfits (client/public/pet-items/outfit-N.webp, 300x360, feet on the floor at y 357):
// complete looks with shoes / hat. [name, price, eyes = eye centre x, y + eye distance]
const OUTFIT_LIST: [string, number, number[]][] = [
  ["Streetwear Hoodie", 180, [128.0, 104.9, 82]], ["Traditional Chinese Outfit", 280, [126.4, 106.8, 82]], ["Basketball Look", 220, [132.1, 114.5, 82]],
  ["Winter Cozy Outfit", 240, [145.3, 128.5, 82]], ["Fantasy Adventurer", 350, [125.5, 134.2, 82]]];
const CLOTHING: PetItem[] = OUTFIT_LIST.map(([name, price, eyes], i) => ({ id: `o${i + 1}`, name, emoji: "👕", price, kind: "costume", slot: "clothing", figure: `/pet-items/outfit-${i + 1}.webp`, layer: `/pet-items/outfit-${i + 1}.webp`, eyes }));
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
  const hidden = slot === "body" || slot === "feet" || REMOVED_WEARABLES.has(n);
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
// Catalogue item names in Chinese / Bahasa (English is the name itself).
const ITEM_NAMES: Record<string, [string, string]> = {
  "Streetwear Hoodie": ["街头连帽衫", "Hoodie Streetwear"], "Traditional Chinese Outfit": ["传统中式服装", "Baju Tradisional Tionghoa"],
  "Basketball Look": ["篮球装", "Gaya Basket"], "Winter Cozy Outfit": ["冬季保暖装", "Baju Hangat Musim Dingin"], "Fantasy Adventurer": ["奇幻冒险装", "Petualang Fantasi"],
  "Crown": ["皇冠", "Mahkota"], "Diamond Crown": ["钻石皇冠", "Mahkota Berlian"], "King Crown": ["国王皇冠", "Mahkota Raja"],
  "Prince Crown": ["王子皇冠", "Mahkota Pangeran"], "Party Hat": ["派对帽", "Topi Pesta"], "Birthday Crown": ["生日皇冠", "Mahkota Ulang Tahun"],
  "Santa Hat": ["圣诞帽", "Topi Sinterklas"], "Witch Hat": ["女巫帽", "Topi Nenek Sihir"], "Wizard Hat": ["巫师帽", "Topi Penyihir"],
  "Chef Hat": ["厨师帽", "Topi Koki"], "Cowboy Hat": ["牛仔帽", "Topi Koboi"], "Pirate Hat": ["海盗帽", "Topi Bajak Laut"],
  "Samurai Helmet": ["武士头盔", "Helm Samurai"], "Viking Helmet": ["维京头盔", "Helm Viking"], "Knight Helmet": ["骑士头盔", "Helm Ksatria"],
  "Baseball Cap": ["棒球帽", "Topi Bisbol"], "Bucket Hat": ["渔夫帽", "Topi Bucket"], "Beanie": ["毛线帽", "Kupluk"],
  "Straw Hat": ["草帽", "Topi Jerami"], "Halo": ["光环", "Lingkaran Malaikat"], "Round Sunglasses": ["圆框墨镜", "Kacamata Hitam Bulat"],
  "Heart Glasses": ["爱心眼镜", "Kacamata Hati"], "Cyber Visor": ["赛博护目镜", "Visor Siber"], "Aviator Glasses": ["飞行员眼镜", "Kacamata Aviator"],
  "Nerd Glasses": ["书呆子眼镜", "Kacamata Kutu Buku"], "Star Glasses": ["星星眼镜", "Kacamata Bintang"], "Monocle": ["单片眼镜", "Monokel"],
  "Eye Patch": ["眼罩", "Penutup Mata"], "Superhero Mask": ["超级英雄面具", "Topeng Superhero"], "Ninja Mask": ["忍者面罩", "Topeng Ninja"],
  "Gold Chain": ["金链", "Kalung Rantai Emas"], "Diamond Chain": ["钻石链", "Kalung Rantai Berlian"], "Bell Collar": ["铃铛项圈", "Kalung Lonceng"],
  "Bow Tie": ["领结", "Dasi Kupu-kupu"], "Red Scarf": ["红围巾", "Syal Merah"], "Winter Scarf": ["冬季围巾", "Syal Musim Dingin"],
  "Hawaiian Lei": ["夏威夷花环", "Kalung Bunga Hawaii"], "Pearl Necklace": ["珍珠项链", "Kalung Mutiara"], "Magic Amulet": ["魔法护身符", "Jimat Ajaib"],
  "Dragon Medallion": ["龙纹勋章", "Medali Naga"], "King Robe": ["国王长袍", "Jubah Raja"], "Tuxedo": ["燕尾服", "Tuksedo"],
  "Business Suit": ["商务西装", "Setelan Jas Bisnis"], "Hoodie": ["连帽衫", "Hoodie"], "Varsity Jacket": ["棒球夹克", "Jaket Varsity"],
  "Leather Jacket": ["皮夹克", "Jaket Kulit"], "Hawaiian Shirt": ["夏威夷衬衫", "Kemeja Hawaii"], "Basketball Jersey": ["篮球球衣", "Jersey Basket"],
  "Football Jersey": ["足球球衣", "Jersey Sepak Bola"], "Baseball Jersey": ["棒球球衣", "Jersey Bisbol"], "Superhero Suit": ["超级英雄战衣", "Kostum Superhero"],
  "Ninja Outfit": ["忍者服", "Pakaian Ninja"], "Samurai Armor": ["武士铠甲", "Baju Zirah Samurai"], "Knight Armor": ["骑士铠甲", "Baju Zirah Ksatria"],
  "Pirate Coat": ["海盗大衣", "Mantel Bajak Laut"], "Wizard Robe": ["巫师长袍", "Jubah Penyihir"], "Vampire Cape": ["吸血鬼斗篷", "Jubah Vampir"],
  "Angel Robe": ["天使长袍", "Jubah Malaikat"], "Devil Costume": ["恶魔装", "Kostum Iblis"], "Astronaut Suit": ["宇航服", "Baju Astronaut"],
  "Firefighter Suit": ["消防员制服", "Seragam Pemadam Kebakaran"], "Police Costume": ["警察装", "Kostum Polisi"], "Doctor Coat": ["医生白大褂", "Jas Dokter"],
  "Chef Uniform": ["厨师服", "Seragam Koki"], "Construction Vest": ["施工背心", "Rompi Konstruksi"], "Explorer Outfit": ["探险家服装", "Pakaian Penjelajah"],
  "Rock Star Jacket": ["摇滚明星夹克", "Jaket Bintang Rock"], "K-Pop Outfit": ["K-Pop 服装", "Pakaian K-Pop"], "Chinese New Year": ["新年唐装", "Baju Imlek"],
  "Batik Outfit": ["蜡染服装", "Baju Batik"], "Angel Wings": ["天使翅膀", "Sayap Malaikat"], "Devil Wings": ["恶魔翅膀", "Sayap Iblis"],
  "Fairy Wings": ["精灵翅膀", "Sayap Peri"], "Dragon Wings": ["龙翼", "Sayap Naga"], "Jetpack": ["喷气背包", "Jetpack"],
  "Rocket Pack": ["火箭背包", "Ransel Roket"], "Cyber Wings": ["赛博翅膀", "Sayap Siber"], "Rainbow Aura": ["彩虹光环", "Aura Pelangi"],
  "Fire Aura": ["火焰光环", "Aura Api"], "Ice Aura": ["冰霜光环", "Aura Es"], "Lightning Aura": ["闪电光环", "Aura Petir"],
  "Heart Aura": ["爱心光环", "Aura Hati"], "Star Aura": ["星星光环", "Aura Bintang"], "Money Aura": ["金钱光环", "Aura Uang"],
  "Galaxy Aura": ["银河光环", "Aura Galaksi"], "Golden Aura": ["金色光环", "Aura Emas"], "Gold Bracelet": ["金手镯", "Gelang Emas"],
  "Diamond Watch": ["钻石手表", "Jam Tangan Berlian"], "Boxing Gloves": ["拳击手套", "Sarung Tinju"], "Magic Gloves": ["魔法手套", "Sarung Tangan Ajaib"],
  "Sneakers": ["运动鞋", "Sepatu Sneakers"], "Gold Sneakers": ["金色运动鞋", "Sneakers Emas"], "Bunny Slippers": ["兔子拖鞋", "Sandal Kelinci"],
  "Roller Skates": ["旱冰鞋", "Sepatu Roda"], "Rainbow Tail Ring": ["彩虹尾环", "Cincin Ekor Pelangi"], "Gold Tail Ring": ["金色尾环", "Cincin Ekor Emas"],
  "Tail Bow": ["尾巴蝴蝶结", "Pita Ekor"], "Shell Jewel Set": ["龟壳宝石套装", "Set Permata Cangkang"], "Neon Shell Trim": ["霓虹龟壳饰边", "Hiasan Cangkang Neon"],
  "Royal Shell Armor": ["皇家龟壳铠甲", "Zirah Cangkang Kerajaan"], "T-Shirt": ["T恤", "Kaus"], "Jacket": ["夹克", "Jaket"],
  "Bomber Jacket": ["飞行员夹克", "Jaket Bomber"], "Denim Jacket": ["牛仔夹克", "Jaket Denim"], "Sports Jersey": ["运动球衣", "Jersey Olahraga"],
  "Suit & Tie": ["西装领带", "Jas & Dasi"], "Chef Outfit": ["厨师装", "Pakaian Koki"], "Police Uniform": ["警察制服", "Seragam Polisi"],
  "Firefighter": ["消防员", "Pemadam Kebakaran"], "Construction": ["建筑工人", "Pekerja Konstruksi"], "Explorer": ["探险家", "Penjelajah"],
  "Adventurer": ["冒险家", "Petualang"], "Angel Outfit": ["天使装", "Pakaian Malaikat"], "Devil Outfit": ["恶魔装束", "Pakaian Iblis"],
  "Chinese Outfit": ["中式服装", "Pakaian Tionghoa"], "Classic Sneakers": ["经典运动鞋", "Sneakers Klasik"], "Sport Sneakers": ["运动跑鞋", "Sneakers Sport"],
  "Silver Sneakers": ["银色运动鞋", "Sneakers Perak"], "Black Sneakers": ["黑色运动鞋", "Sneakers Hitam"], "Red Sneakers": ["红色运动鞋", "Sneakers Merah"],
  "Green Sneakers": ["绿色运动鞋", "Sneakers Hijau"], "Rainbow Sneakers": ["彩虹运动鞋", "Sneakers Pelangi"], "LED Sneakers": ["LED 发光鞋", "Sneakers LED"],
  "Basketball Shoes": ["篮球鞋", "Sepatu Basket"], "Football Cleats": ["足球钉鞋", "Sepatu Bola"], "Bear Slippers": ["小熊拖鞋", "Sandal Beruang"],
  "Panda Slippers": ["熊猫拖鞋", "Sandal Panda"], "Chicken Slippers": ["小鸡拖鞋", "Sandal Ayam"], "Dinosaur Slippers": ["恐龙拖鞋", "Sandal Dinosaurus"],
  "Shark Slippers": ["鲨鱼拖鞋", "Sandal Hiu"], "Unicorn Slippers": ["独角兽拖鞋", "Sandal Unicorn"], "Cat Slippers": ["猫咪拖鞋", "Sandal Kucing"],
  "Dog Slippers": ["小狗拖鞋", "Sandal Anjing"], "Dragon Slippers": ["龙拖鞋", "Sandal Naga"], "Tiger Slippers": ["老虎拖鞋", "Sandal Harimau"],
  "Pig Slippers": ["小猪拖鞋", "Sandal Babi"], "Cow Slippers": ["奶牛拖鞋", "Sandal Sapi"], "Fuzzy Boots": ["毛绒靴", "Sepatu Bot Berbulu"],
  "Winter Boots": ["冬靴", "Sepatu Bot Musim Dingin"], "Snow Boots": ["雪地靴", "Sepatu Bot Salju"], "Neon Sneakers": ["霓虹运动鞋", "Sneakers Neon"],
  "Golden Wing Sneakers": ["金翼运动鞋", "Sneakers Sayap Emas"], "Pink sofa": ["粉色沙发", "Sofa merah muda"], "Armchair": ["扶手椅", "Kursi berlengan"],
  "Fern pot": ["蕨类盆栽", "Pot pakis"], "Tulip pot": ["郁金香盆栽", "Pot tulip"], "Sunflower pot": ["向日葵盆栽", "Pot bunga matahari"],
  "Cactus": ["仙人掌", "Kaktus"], "Cherry blossom": ["樱花", "Bunga sakura"], "Floor lamp": ["落地灯", "Lampu lantai"],
  "Candles": ["蜡烛", "Lilin"], "Landscape": ["风景画", "Lukisan pemandangan"], "Rainbow poster": ["彩虹海报", "Poster pelangi"],
  "Wall clock": ["挂钟", "Jam dinding"], "Beach ball": ["沙滩球", "Bola pantai"], "Teddy bear": ["泰迪熊", "Boneka beruang"],
  "Gift box": ["礼物盒", "Kotak hadiah"], "Party hat": ["派对帽", "Topi pesta"], "Cap": ["鸭舌帽", "Topi"],
  "Top hat": ["礼帽", "Topi tinggi"], "Ribbon": ["蝴蝶结", "Pita"], "Sunglasses": ["墨镜", "Kacamata hitam"], "Scarf": ["围巾", "Syal"],
};
function itemName(name: string, lang: Lang): string {
  const t = ITEM_NAMES[name];
  return !t || lang === "en" ? name : lang === "zh" ? t[0] : t[1];
}
function localCatalog(lang: Lang): PetItem[] {
  return lang === "en" ? PET_CATALOG : PET_CATALOG.map((i) => ({ ...i, name: itemName(i.name, lang) }));
}
// Everyone starts with these so a new room isn't empty.
// (Clothing/footwear defaults: shirtless and barefoot — see BASE_LAYER.)
const STARTER_ITEMS = ["plant_fern", "art_landscape"];
const STARTER_PLACED: Record<string, string> = { plant: "plant_fern", art: "art_landscape" };

// Game rewards (see awardPetCoins callers in games.ts).
export const COINS_PER_PLAY = 0; // losers earn no pet coins
export const COINS_PER_WIN = 5;   // every winner of a game
export const COINS_NUMBER_CRACK = 50;
export const DAILY_COIN_CAP = 300;

// Created on first use, once per data space (each company has its own pet_homes).
const readyBySpace = new Map<string, Promise<void>>();
function ensureTable() {
  const space = homeCompanySlug();
  let ready = readyBySpace.get(space);
  if (!ready) readyBySpace.set(space, ready = db.execute(sql`CREATE TABLE IF NOT EXISTS pet_homes (
    user_id varchar PRIMARY KEY,
    coins integer NOT NULL DEFAULT 0,
    owned jsonb NOT NULL DEFAULT '[]',
    placed jsonb NOT NULL DEFAULT '{}',
    costumes jsonb NOT NULL DEFAULT '{}',
    light_on boolean NOT NULL DEFAULT true,
    earned_day varchar,
    earned_today integer NOT NULL DEFAULT 0,
    updated_at timestamp NOT NULL DEFAULT now()
  )`).then(() => undefined).catch((e) => { readyBySpace.delete(space); throw e; }));
  return ready;
}

type Home = { userId: string; coins: number; owned: string[]; placed: Record<string, string>; costumes: Record<string, Record<string, string>>; lightOn: boolean; earnedDay: string | null; earnedToday: number };

// One-off clean-up (once per company's data space): refund pet coins for removed wearables
// and old clothing, and take them off every pet.
const refundedBySpace = new Map<string, Promise<void>>();
function refundRemovedWearables() {
  const space = homeCompanySlug();
  const done = refundedBySpace.get(space);
  if (done) return done;
  const refunded = (async () => {
    await ensureTable();
    const removed = new Map<string, number>(Array.from(OLD_CLOTHING_PRICE.entries()));
    for (const i of PET_CATALOG) if (i.kind === "costume" && /^w\d+$/.test(i.id) && REMOVED_WEARABLES.has(Number(i.id.slice(1)))) removed.set(i.id, i.price);
    const r: any = await db.execute(sql`SELECT user_id, owned, costumes FROM pet_homes`);
    for (const row of (r.rows || r)) {
      const owned: string[] = row.owned || [];
      const gone = owned.filter((id) => removed.has(id));
      if (!gone.length) continue;
      const refund = gone.reduce((sum, id) => sum + (removed.get(id) || 0), 0);
      const costumes: Record<string, Record<string, string>> = row.costumes || {};
      for (const pet of Object.values(costumes)) for (const [slot, id] of Object.entries(pet)) if (removed.has(id)) delete pet[slot];
      // Only while the member still owns them, so two servers starting together never refund twice.
      const goneJson = JSON.stringify(gone);
      const u: any = await db.execute(sql`UPDATE pet_homes SET coins = coins + ${refund},
        owned = (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM jsonb_array_elements(owned) x WHERE NOT (${goneJson}::jsonb ? (x #>> '{}'))),
        costumes = ${JSON.stringify(costumes)}::jsonb, updated_at = now() WHERE user_id = ${row.user_id} AND owned @> ${goneJson}::jsonb RETURNING user_id`);
      if (!(u.rows || u).length) continue;
      console.log(`[petHome] refunded ${refund} coins to ${row.user_id} for removed items: ${gone.join(", ")}`);
    }
  })().catch((e) => { refundedBySpace.delete(space); console.error("[petHome] refund removed", e); });
  refundedBySpace.set(space, refunded);
  return refunded;
}

function venueDay() { return new Intl.DateTimeFormat("en-CA", { timeZone: getBookingTimezone() }).format(new Date()); }

async function getHome(userId: string): Promise<Home> {
  await ensureTable();
  await refundRemovedWearables();
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

function view(h: Home, lang: Lang = "en") {
  const day = venueDay();
  return {
    coins: h.coins, owned: h.owned, placed: h.placed, costumes: h.costumes, lightOn: h.lightOn,
    earnedToday: h.earnedDay === day ? h.earnedToday : 0, dailyCap: DAILY_COIN_CAP,
    rewards: { play: COINS_PER_PLAY, win: COINS_PER_WIN, numberCrack: COINS_NUMBER_CRACK },
    timezone: getBookingTimezone(), catalog: localCatalog(lang), baseLayer: BASE_LAYER, baseEyes: BASE_EYES,
  };
}

export function registerPetHomeRoutes(app: Express) {
  refundRemovedWearables();
  app.get("/api/reborn/pet-home", requireAuth, async (req, res) => {
    try { res.json(view(await getHome(getUserId(req)!), reqLang(req))); }
    catch (e) { console.error("[petHome] get", e); res.status(500).json({ message: tr(req, { en: "Failed to load pet home", zh: "宠物小屋加载失败", id: "Gagal memuat rumah hewan" }) }); }
  });

  app.post("/api/reborn/pet-home/buy", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const item = PET_CATALOG.find((i) => i.id === req.body?.itemId);
      if (!item || item.hidden) return res.status(404).json({ message: tr(req, { en: "Item not found", zh: "找不到该物品", id: "Barang tidak ditemukan" }) });
      const home = await getHome(userId);
      if (home.owned.includes(item.id)) return res.status(400).json({ message: tr(req, { en: "You already own this", zh: "你已经拥有这件物品", id: "Kamu sudah memiliki ini" }) });
      // Atomic: only succeeds if the balance still covers the price.
      const r: any = await db.execute(sql`UPDATE pet_homes SET coins = coins - ${item.price}, owned = owned || ${JSON.stringify([item.id])}::jsonb, updated_at = now()
        WHERE user_id = ${userId} AND coins >= ${item.price} AND NOT (owned ? ${item.id}) RETURNING user_id`);
      if (!(r.rows || r).length) return res.status(400).json({ message: tr(req, { en: "Not enough pet coins — {item} costs {price}", zh: "宠物币不足 — {item} 需要 {price} 币", id: "Koin hewan tidak cukup — {item} seharga {price}" }, { item: itemName(item.name, reqLang(req)), price: item.price }) });
      res.json({ message: tr(req, { en: "{emoji} {item} is yours!", zh: "{emoji} {item} 归你啦！", id: "{emoji} {item} jadi milikmu!" }, { emoji: item.emoji, item: itemName(item.name, reqLang(req)) }), ...view(await getHome(userId), reqLang(req)) });
    } catch (e) { console.error("[petHome] buy", e); res.status(500).json({ message: tr(req, { en: "Purchase failed", zh: "购买失败", id: "Pembelian gagal" }) }); }
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
        if (!item || item.kind !== "furniture" || item.slot !== slot) return res.status(400).json({ message: tr(req, { en: "That doesn't go there", zh: "这件物品不能放在这里", id: "Barang itu tidak bisa ditaruh di sana" }) });
        if (!home.owned.includes(itemId)) return res.status(400).json({ message: tr(req, { en: "Buy it first", zh: "请先购买", id: "Beli dulu" }) });
      } else if (!PET_CATALOG.some((i) => i.kind === "furniture" && i.slot === slot)) return res.status(400).json({ message: tr(req, { en: "Unknown spot", zh: "未知位置", id: "Posisi tidak dikenal" }) });
      const placed = { ...home.placed };
      if (itemId) placed[slot] = itemId; else delete placed[slot];
      await db.execute(sql`UPDATE pet_homes SET placed = ${JSON.stringify(placed)}::jsonb, updated_at = now() WHERE user_id = ${userId}`);
      res.json(view({ ...home, placed }, reqLang(req)));
    } catch (e) { console.error("[petHome] place", e); res.status(500).json({ message: tr(req, { en: "Failed", zh: "操作失败", id: "Gagal" }) }); }
  });

  // Dress a pet: toggles an owned costume on/off for that pet (one per slot).
  app.post("/api/reborn/pet-home/wear", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const petId = String(Number(req.body?.petId) || "");
      const item = PET_CATALOG.find((i) => i.id === req.body?.itemId && i.kind === "costume");
      if (!petId || !item) return res.status(400).json({ message: tr(req, { en: "Pick a costume", zh: "请选择一件服装", id: "Pilih kostum" }) });
      const home = await getHome(userId);
      if (!home.owned.includes(item.id)) return res.status(400).json({ message: tr(req, { en: "Buy it first", zh: "请先购买", id: "Beli dulu" }) });
      const costumes = { ...home.costumes, [petId]: { ...(home.costumes[petId] || {}) } };
      if (costumes[petId][item.slot] === item.id) delete costumes[petId][item.slot]; else costumes[petId][item.slot] = item.id;
      await db.execute(sql`UPDATE pet_homes SET costumes = ${JSON.stringify(costumes)}::jsonb, updated_at = now() WHERE user_id = ${userId}`);
      res.json(view({ ...home, costumes }, reqLang(req)));
    } catch (e) { console.error("[petHome] wear", e); res.status(500).json({ message: tr(req, { en: "Failed", zh: "操作失败", id: "Gagal" }) }); }
  });

  app.post("/api/reborn/pet-home/light", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const on = !!req.body?.on;
      const home = await getHome(userId);
      await db.execute(sql`UPDATE pet_homes SET light_on = ${on}, updated_at = now() WHERE user_id = ${userId}`);
      res.json(view({ ...home, lightOn: on }, reqLang(req)));
    } catch (e) { console.error("[petHome] light", e); res.status(500).json({ message: tr(req, { en: "Failed", zh: "操作失败", id: "Gagal" }) }); }
  });
}
