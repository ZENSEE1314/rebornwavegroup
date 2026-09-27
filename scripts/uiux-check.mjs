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
  ["games › Who's the fastest", "/games", ["Who's the fastest"]],
  ["games › Lucky game", "/games", ["Lucky game"]],
  ["games › Dice game", "/games", ["Dice game"]],
  ["pet › costumes", "/pet", ["Costumes"]],
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
  if (p === "/api/reborn/games/config") return { today: Object.fromEntries(["rps", "tap", "cards", "dice", "wheel", "riding", "timer", "789", "stack", "number"].map((g) => [g, true])) };
  if (p === "/api/reborn/games/leaderboard") return [{ userId: "a", name: "A very long member name that could overflow", score: 12, plays: 20 }, { userId: "b", name: "Hihta Goh", score: 1, plays: 2 }];
  if (p.startsWith("/api/reborn/games/number")) return { round: 4, low: 0, high: 3504, remaining: 5, dailyLimit: 10, used: 5, recent: [{ name: "Huli", guess: 3505, hint: "lower" }], lastWin: { name: "Hihta Goh", number: 3536, round: 3 } };
  if (p === "/api/reborn/kos/wallet") return { kgold: 39172800, starsReceived: 703500, kgoldPerRp: 10, feePercent: 30 };
  if (p === "/api/reborn/kos/leaderboard") return [{ id: "x", username: "Hihta", stars: 42000000 }, { id: "u1", username: "tester", stars: 350000 }];
  if (p === "/api/reborn/venue/status") return { checkedIn: false };
  if (p === "/api/reborn/pets") return [{ id: 7, name: "Doluruu", gender: process.env.UIUX_GENDER || "male", isEgg: false, lifeStatus: "active", daysLeft: 3, hunger: 70, happiness: 80, cleanliness: 25, energy: 60, canFeed: true, feedsNeeded: 2, feedsInCycle: 1, cycleActive: true, cycleHoursLeft: 10, nextFeedMinutes: 0 }];
  if (p === "/api/reborn/pet-home") return {
    coins: 140, owned: ["plant_fern", "art_landscape", "sofa_pink", "hat_crown", "glasses_cool", "scarf_red", "lamp_floor", "toy_teddy"], lightOn: process.env.UIUX_LIGHT !== "off",
    placed: { plant: process.env.UIUX_PLANT || "plant_fern", art: "art_landscape", sofa: "sofa_pink", lamp: "lamp_floor", toy: "toy_teddy" },
    costumes: { 7: Object.fromEntries((process.env.UIUX_WEAR || "head:hat_crown,face:glasses_cool,neck:scarf_red").split(",").map((x) => x.split(":"))) },
    earnedToday: 25, dailyCap: 300, rewards: { play: 5, win: 20, numberCrack: 50 }, timezone: process.env.UIUX_TZ || "Asia/Jakarta",
    catalog: [["sofa_pink", "Pink sofa", "🛋️", 120, "furniture", "sofa"], ["sofa_chair", "Armchair", "🪑", 60, "furniture", "sofa"], ["plant_fern", "Fern pot", "🪴", 30, "furniture", "plant"], ["plant_tulip", "Tulip pot", "🌷", 45, "furniture", "plant"], ["plant_sunflower", "Sunflower pot", "🌻", 60, "furniture", "plant"], ["plant_cactus", "Cactus", "🌵", 40, "furniture", "plant"], ["plant_blossom", "Cherry blossom", "🌸", 90, "furniture", "plant"], ["lamp_floor", "Floor lamp", "🪔", 50, "furniture", "lamp"], ["lamp_candle", "Candles", "🕯️", 35, "furniture", "lamp"], ["art_landscape", "Landscape", "🖼️", 40, "furniture", "art"], ["art_rainbow", "Rainbow poster", "🌈", 55, "furniture", "art"], ["art_clock", "Wall clock", "🕰️", 70, "furniture", "art"], ["toy_ball", "Beach ball", "🏐", 25, "furniture", "toy"], ["toy_teddy", "Teddy bear", "🧸", 60, "furniture", "toy"], ["toy_gift", "Gift box", "🎁", 40, "furniture", "toy"],
      ["hat_party", "Party hat", "🥳", 50, "costume", "head"], ["hat_crown", "Crown", "👑", 200, "costume", "head"], ["hat_cap", "Cap", "🧢", 60, "costume", "head"], ["hat_top", "Top hat", "🎩", 90, "costume", "head"], ["hat_bow", "Ribbon", "🎀", 45, "costume", "head"], ["glasses_cool", "Sunglasses", "🕶️", 70, "costume", "face"], ["scarf_red", "Scarf", "🧣", 55, "costume", "neck"]]
      .map(([id, name, emoji, price, kind, slot]) => ({ id, name, emoji, price, kind, slot })),
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
