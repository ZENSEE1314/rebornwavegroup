#!/usr/bin/env node
// Mobile UI/UX check: serves the client with Vite, mocks the API, opens every
// page (and a few clicked-through screens) at phone width, and reports:
//   • horizontal overflow — elements sticking out past the right edge
//   • tiny tap targets     — buttons/controls smaller than 24×24px (WCAG 2.2)
//   • page crashes         — uncaught errors while rendering
// Usage: npm run uiux            (all pages)
//        npm run uiux -- /games  (only paths containing "/games")
//        UIUX_URL=https://rebornwave.group npm run uiux   (check the deployed build;
//          the API is still mocked so every logged-in screen can be opened)
// Screenshots go to .uiux/ (git-ignored).
import { createServer } from "vite";
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const OV = {"1": [89.6, 130.1, 79.0, 214, 109], "2": [91.5, 137.3, 77.7, 222, 117], "3": [77.3, 141.4, 74.4, 208, 122], "4": [70.8, 145.5, 69.0, 198, 128], "5": [92, 160, 75, 225, 141], "6": [82.0, 145.1, 73.9, 220, 126], "7": [78.9, 130.1, 73.6, 222, 111], "8": [70.1, 136.3, 73.5, 222, 117], "9": [78.9, 138.4, 75.0, 242, 119], "10": [80, 128, 65, 222, 111], "11": [94.7, 118.2, 77.3, 220, 98], "12": [84.7, 121.5, 72.4, 218, 103], "13": [79.8, 123.0, 72.8, 212, 104], "14": [79.6, 121.9, 76.2, 214, 102], "15": [77, 113, 69, 216, 95], "16": [98, 142, 87, 225, 120], "17": [74.6, 100.9, 75.9, 222, 81], "18": [74, 106, 70, 216, 88], "19": [89.6, 110.7, 72.7, 224, 92], "20": [74.7, 126.1, 78.0, 210, 106], "21": [88, 41, 73, 175, 81], "22": [81, 44, 80, 177, 88], "23": [90, 42, 75, 180, 83], "24": [92.8, 48.0, 87.2, 197, 96], "25": [90, 53, 95, 204, 105], "26": [89, 44, 79, 183, 87], "27": [71, 46, 83, 170, 91], "28": [86, 48, 86, 189, 95], "29": [85.2, 46.8, 84.4, 186, 93], "30": [70, 32, 58, 139, 63]};
const CE = {"1": [167.9, 133.6, 96.5], "2": [145.0, 134.8, 94.5], "3": [147.3, 135.3, 94.3], "4": [146.1, 132.9, 92.8], "5": [140.8, 135.4, 91.8], "6": [148.9, 133.8, 95.0], "7": [143.9, 136.4, 93.1], "8": [146.8, 136.5, 92.5], "9": [137.5, 135.9, 92.6], "10": [132.9, 134.6, 94.1], "11": [156.3, 135.7, 95.7], "12": [140.4, 137.3, 93.6], "13": [135.9, 144.8, 88.3], "14": [137.2, 138.2, 93.6], "15": [139.7, 139.0, 88.7], "16": [134.9, 144.2, 92.9], "17": [135.6, 142.3, 90.6], "18": [140.6, 139.0, 87.7], "19": [146.6, 137.0, 92.7], "20": [135.0, 133.7, 94.9], "21": [149.9, 145.3, 82.8], "22": [135.3, 139.4, 85.7], "23": [147.8, 151.7, 82.8], "24": [145.0, 148.4, 80.9], "25": [148.2, 155.2, 82.5], "26": [137.8, 142.0, 91.7], "27": [127.4, 125.1, 92.8], "28": [143.4, 137.3, 94.9], "29": [137.5, 136.4, 94.6], "30": [137.8, 133.9, 93.6]};
const WIDTH = 360, HEIGHT = 800, PORT = 5199;
const OUT = path.resolve(".uiux");
const filter = process.argv[2] || "";

// Every route in client/src/App.tsx (params filled with sample values).
const ROUTES = [
  "/", "/app", "/login", "/profile", "/pet", "/pet-care", "/kos", "/chat", "/games", "/songs", "/spin",
  "/bookings", "/bottles", "/history", "/referrals", "/my-referral", "/support", "/order", "/pos",
  "/reborn-admin", "/admin", "/attend", "/staff-feedback", "/marketplace", "/energy-potion",
  "/loyalty-program", "/seasonal-collections", "/lux", "/checkout", "/payment-success", "/reset-password",
  "/investor", "/investor/login", "/bridgex", "/bridgexpos", "/bridgexpos/login", "/bridgexpos/apply",
];

// Screens only reachable by clicking — [name, path, list of button texts to click in order].
const FLOWS = [
  ["games › category", "/games", ["Guessing game"]],
  ["games › Guess the Number", "/games", ["Guessing game", "Guess the Number"]],
  ["games › Guess the Number › play", "/games", ["Guessing game", "Guess the Number", "Play now"]],
  ["games › Rock Paper Scissors", "/games", ["Guessing game", "Rock Paper Scissors"]],
  ["games › Draw & Guess", "/games", ["Guessing game", "Draw & Guess"]],
  ["games › Who's the fastest", "/games", ["Who's the fastest"]],
  ["games › Lucky game", "/games", ["Lucky game"]],
  ["games › Dice game", "/games", ["Dice game"]],
  ["pet › costumes", "/pet", ["Costumes"]],
  ["pet › costumes › footwear", "/pet", ["Costumes", "👟 Footwear"]],
  ["kos › venue QR (admin)", "/kos", ["Venue check-in QR"]],
  ["kos › buy KGOLD", "/kos", ["Buy KGOLD"]],
  ["kos › cash out", "/kos", ["Cash out"]],
  // Every admin tab (click the tab in the scrolling tab bar).
  ...["Bookings", "Requests", "Redemptions", "Bottles", "Top-ups", "Codes", "Pills", "Songs", "Games", "Events", "Broadcast", "CRM", "Users", "Staff", "Payroll", "Leaderboard", "Feedback", "Products", "Inventory", "Accounting", "Prizes", "Gifts", "FAQ", "Settings", "Logs"]
    .map((t) => [`admin › ${t}`, "/reborn-admin", [`tab:${t}`]]),
];

const USER = {
  id: "u1", username: "tester", firstName: "Test", lastName: "User", email: "t@example.com",
  role: "admin", points: 1200, tokens: 50, kgold: 39172800, phoneNumber: "6281234567",
};
// Specific mock payloads; anything else under /api returns [] (safe for lists and `x?.y`).
function mock(url) {
  const p = new URL(url).pathname;
  if (p === "/api/auth/user") return USER;
  if (p === "/api/reborn/games/config") return { today: Object.fromEntries(["rps", "tap", "cards", "dice", "wheel", "riding", "timer", "789", "stack", "number", "draw"].map((g) => [g, true])) };
  if (p === "/api/reborn/games/leaderboard") return [{ userId: "a", name: "A very long member name that could overflow", score: 12, plays: 20 }, { userId: "b", name: "Hihta Goh", score: 1, plays: 2 }];
  if (p.startsWith("/api/reborn/games/number")) return { round: 4, low: 0, high: 3504, remaining: 5, dailyLimit: 10, used: 5, recent: [{ name: "Huli", guess: 3505, hint: "lower" }], lastWin: { name: "Hihta Goh", number: 3536, round: 3 } };
  if (p === "/api/reborn/kos/wallet") return { kgold: 39172800, starsReceived: 703500, kgoldPerRp: 10, feePercent: 30 };
  if (p === "/api/reborn/kos/leaderboard") return [{ id: "x", username: "Hihta", stars: 42000000 }, { id: "u1", username: "tester", stars: 350000 }];
  if (p === "/api/reborn/venue/status") return { checkedIn: false };
  if (p === "/api/reborn/pets") return [{ id: 7, name: "Doluruu", gender: process.env.UIUX_GENDER || "male", isEgg: false, lifeStatus: "active", daysLeft: 3, hunger: 70, happiness: 80, cleanliness: 25, energy: 60, canFeed: true, feedsNeeded: 2, feedsInCycle: 1, cycleActive: true, cycleHoursLeft: 10, nextFeedMinutes: 0 }];
  if (p === "/api/reborn/pet-home") return {
    coins: 340, owned: ["c22", "s23", "w2", "w41", "w71", "w21", "plant_fern", "art_landscape", "sofa_pink", "hat_crown", "glasses_cool", "scarf_red", "lamp_floor", "toy_teddy"], lightOn: process.env.UIUX_LIGHT !== "off",
    placed: { plant: process.env.UIUX_PLANT || "plant_fern", art: "art_landscape", sofa: "sofa_pink", lamp: "lamp_floor", toy: "toy_teddy" },
    costumes: { 7: Object.fromEntries((process.env.UIUX_WEAR || "clothing:c5,footwear:s23,head:w7,face:w21").split(",").map((x) => x.split(":"))) },
    earnedToday: 25, dailyCap: 300, rewards: { play: 5, win: 20, numberCrack: 50 }, timezone: process.env.UIUX_TZ || "Asia/Jakarta",
    catalog: [["sofa_pink", "Pink sofa", "🛋️", 120, "furniture", "sofa"], ["sofa_chair", "Armchair", "🪑", 60, "furniture", "sofa"], ["plant_fern", "Fern pot", "🪴", 30, "furniture", "plant"], ["plant_tulip", "Tulip pot", "🌷", 45, "furniture", "plant"], ["plant_sunflower", "Sunflower pot", "🌻", 60, "furniture", "plant"], ["plant_cactus", "Cactus", "🌵", 40, "furniture", "plant"], ["plant_blossom", "Cherry blossom", "🌸", 90, "furniture", "plant"], ["lamp_floor", "Floor lamp", "🪔", 50, "furniture", "lamp"], ["lamp_candle", "Candles", "🕯️", 35, "furniture", "lamp"], ["art_landscape", "Landscape", "🖼️", 40, "furniture", "art"], ["art_rainbow", "Rainbow poster", "🌈", 55, "furniture", "art"], ["art_clock", "Wall clock", "🕰️", 70, "furniture", "art"], ["toy_ball", "Beach ball", "🏐", 25, "furniture", "toy"], ["toy_teddy", "Teddy bear", "🧸", 60, "furniture", "toy"], ["toy_gift", "Gift box", "🎁", 40, "furniture", "toy"],
      ["hat_party", "Party hat", "🥳", 50, "costume", "head"], ["hat_crown", "Crown", "👑", 200, "costume", "head"], ["hat_cap", "Cap", "🧢", 60, "costume", "head"], ["hat_top", "Top hat", "🎩", 90, "costume", "head"], ["hat_bow", "Ribbon", "🎀", 45, "costume", "head"], ["glasses_cool", "Sunglasses", "🕶️", 70, "costume", "face"], ["scarf_red", "Scarf", "🧣", 55, "costume", "neck"]]
      .map(([id, name, emoji, price, kind, slot]) => ({ id, name, emoji, price, kind, slot, hidden: kind === "costume" }))
      .concat(Array.from({ length: 100 }, (_, i) => ({ id: `w${i + 1}`, name: `Wearable ${i + 1}`, emoji: "🎩", price: 50 + i * 5, kind: "costume", slot: ["head", "face", "neck", "body", "back", "aura", "hands", "feet", "tail", "shell"][i < 20 ? 0 : i < 30 ? 1 : i < 40 ? 2 : i < 70 ? 3 : i < 77 ? 4 : i < 86 ? 5 : i < 90 ? 6 : i < 94 ? 7 : i < 97 ? 8 : 9], image: `/pet-items/${i + 1}.webp`, ...([5, 16, 25, 34, 46, 55, 65].includes(i + 1) ? {} : { figure: `/pet-items/fig-${i + 1}.webp`, sprite: ![95, 96].includes(i + 1) }), ...(OV[i + 1] ? { overlay: `/pet-items/ov-${i + 1}.webp`, anchor: OV[i + 1] } : {}) })))
      .concat(Array.from({ length: 29 }, (_, i) => ({ id: `c${i + 2}`, name: `Clothing ${i + 2}`, emoji: "👕", price: 100, kind: "costume", slot: "clothing", figure: `/pet-items/cloth-${i + 2}.webp`, layer: `/pet-items/cloth-${i + 2}.webp`, eyes: CE[i + 2] })))
      .concat(Array.from({ length: 30 }, (_, i) => i + 1).map((n) => ({ id: `s${n}`, name: `Footwear ${n}`, emoji: "👟", price: 90, kind: "costume", slot: "footwear", figure: `/pet-items/shoefig-${n}.webp`, layer: `/pet-items/shoe-${n}.webp` }))),
    baseLayer: "/pet-items/cloth-1.webp", baseEyes: CE[1],
  };
  if (p === "/api/reborn/chat/friends") return { friends: [], incoming: [], outgoing: [] };
  return [];
}

function report(name, issues) {
  if (!issues.length) { console.log(`  ✓ ${name}`); return 0; }
  console.log(`  ✗ ${name}`);
  for (const i of issues) console.log(`      - ${i}`);
  return issues.length;
}

// Runs in the page: find elements overflowing the viewport and tiny tap targets.
function audit(width) {
  const out = [];
  const desc = (el) => {
    const cls = (el.getAttribute("class") || "").split(/\s+/).filter(Boolean).slice(0, 4).join(".");
    const txt = (el.innerText || el.getAttribute("placeholder") || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return `<${el.tagName.toLowerCase()}${cls ? "." + cls : ""}>${txt ? ` "${txt}"` : ""}`;
  };
  // Inside a horizontal scroller or clipped box, sticking out is intended.
  const clipped = (el) => {
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return a.getBoundingClientRect().right <= width + 1;
    }
    return false;
  };
  const visible = (el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.visibility !== "hidden" && s.display !== "none" && r.width > 0 && r.height > 0; };
  const seen = new Set();
  if (document.documentElement.scrollWidth > width + 1) out.push(`page scrolls sideways (${document.documentElement.scrollWidth}px wide)`);
  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el) || getComputedStyle(el).position === "fixed" || el.closest("svg") !== el && el.closest("svg")) continue;
    const r = el.getBoundingClientRect();
    if (r.right > width + 1 && r.left < width && !clipped(el)) {
      // Only report the outermost offender of each branch.
      let p = el.parentElement, dup = false;
      for (; p; p = p.parentElement) if (seen.has(p)) { dup = true; break; }
      if (!dup) { seen.add(el); out.push(`overflows right edge by ${Math.round(r.right - width)}px: ${desc(el)}`); }
    }
  }
  for (const el of document.querySelectorAll("button, a[href], [role=button], input, select")) {
    if (!visible(el) || el.disabled || el.type === "hidden") continue;
    // Text links in a sentence and checkboxes wrapped in a <label> are fine.
    if (el.tagName === "A" && getComputedStyle(el).display.startsWith("inline") && (el.innerText || "").trim()) continue;
    if ((el.type === "checkbox" || el.type === "radio") && el.closest("label")) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 24 || r.height < 24) out.push(`small tap target ${Math.round(r.width)}×${Math.round(r.height)}px: ${desc(el)}`);
  }
  return out.slice(0, 25);
}

const BASE = (process.env.UIUX_URL || "").replace(/\/$/, "") || `http://localhost:${PORT}`;
const server = process.env.UIUX_URL ? null : await createServer({ configFile: path.resolve("vite.config.ts"), server: { port: PORT, strictPort: true }, logLevel: "error" });
await server?.listen();
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.route("**/api/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mock(route.request().url())) }));
await ctx.route(/\/(socket\.io|ws|events)/, (route) => route.abort());

async function check(name, url, clicks = []) {
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`page error: ${String(e.message).slice(0, 120)}`));
  try {
    await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1500);
    for (const text of clicks) {
      const target = text.startsWith("tab:")
        ? page.getByRole("button", { name: text.slice(4), exact: true }).first()
        : page.getByText(text, { exact: false }).first();
      await target.click({ timeout: 5000 });
      await page.waitForTimeout(600);
    }
    const issues = [...errors, ...(await page.evaluate(audit, WIDTH))];
    await page.screenshot({ path: path.join(OUT, name.replace(/[^\w]+/g, "_") + ".png"), fullPage: true });
    return report(name, issues);
  } catch (e) {
    return report(name, [...errors, `could not check: ${String(e.message).split("\n")[0]}`]);
  } finally { await page.close(); }
}

console.log(`UI/UX check of ${BASE} at ${WIDTH}×${HEIGHT} (screenshots in .uiux/)`);
let total = 0;
for (const r of ROUTES) if (r.includes(filter)) total += await check(r, r);
for (const [name, url, clicks] of FLOWS) if (url.includes(filter) || name.includes(filter)) total += await check(name, url, clicks);
await browser.close();
await server?.close();
console.log(total ? `\n${total} issue(s) found.` : "\nNo issues found.");
process.exit(total ? 1 : 0);
