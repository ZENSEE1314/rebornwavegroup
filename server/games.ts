// Live PvP mini-games — ephemeral in-memory rooms synced to clients over SSE.
// Games: rps (rock-paper-scissors elimination), tap (30s tap/mining race).
// Leaderboards + which-game-on-which-day config persist in Postgres.
import type { Express, Request, Response } from "express";
import { and, desc, eq, sql, inArray } from "drizzle-orm";
import { db } from "./db";
import { users, pvpScores, appSettings, gameRanks } from "@shared/schema";
import { requireAuth, getUserId } from "./multiAuth";
import { resolveCompanyId } from "./tenant";
import { DEFAULT_COMPANY_SLUG, homeCompanySlug } from "./tenantContext";
import { awardPetCoins, COINS_PER_WIN, COINS_NUMBER_CRACK } from "./petHome";
import { tr, type Tri } from "./i18n";

type Choice = "rock" | "paper" | "scissors";
type GameKind = "rps" | "tap" | "cards" | "dice" | "wheel" | "riding" | "timer" | "789" | "stack" | "poker3" | "frog" | "rlgl" | "memory" | "bridge" | "draw" | "inbetween" | "updown" | "uno" | "sixcup";
interface Card { id: string; v: string; s: string; }
interface Bid { face: number; qty: number; by: string; strike?: boolean }
interface Player { id: string; name: string; choice?: Choice | null; alive: boolean; taps: number; connected: boolean; hand?: Card[]; dice?: number[]; stopMs?: number | null; stackHeight?: number; }
interface Room {
  code: string; game: GameKind; hostId: string; password: string; companyId?: number;
  space?: string; // the company data space the room was opened in (rooms never cross companies)
  status: "lobby" | "playing" | "reveal" | "done";
  players: Player[];
  round: number; deadline: number; message: string;
  // Translatable form of `message`: players in one room may use different
  // languages, so clients render gm.srv.<k> with vars `v` themselves.
  msg?: Msg;
  eliminatedThisRound: string[]; winnerId?: string; lastLoserId?: string;
  createdAt: number; timer?: NodeJS.Timeout; ticker?: NodeJS.Timeout; cleanupTimer?: NodeJS.Timeout;
  subs: Set<{ res: Response; uid?: string }>;
  // cards-only
  deck?: Card[]; discardTop?: Card | null; discardBy?: string | null;
  turnIdx?: number; phase?: "draw" | "discard"; drawnFrom?: "deck" | "discard" | null; cardReveal?: any;
  // dice-only
  bid?: Bid | null; jokerActive?: boolean; jokerReenableAt?: number; diceReveal?: any;
  // series (best-of / play to N wins)
  winTarget?: number; seriesScore?: Record<string, number>; seriesChampionId?: string;
  // wheel-only
  wheelResult?: any; wheelSpun?: string[]; wheelPrizes?: { label: string; cups?: number; w: number; emoji?: string; pass?: boolean }[];
  // riding (Red Riding Hood) only
  tiles?: { id: number; kind: "grandma" | "laughing" | "wolf"; flipped: boolean; by?: string }[];
  ridingClicks?: number; flippedThisTurn?: number; wolfCounts?: Record<string, number>; ridingReveal?: boolean;
  facesCount?: number;
  // timer (Stop the Clock) only
  timerStart?: number; timerWinners?: string[];
  timerMode?: "fixed" | "random"; timerTargetMs?: number;
  // 789 (two-dice drinking) only
  dir?: number; cupUnits?: number; lastRoll?: any; chooseFor?: string | null;
  // stack (tower stacking) only
  stackWinners?: string[];
  // inbetween / updown (card drinking games) only
  cd?: CdState;
  // uno (count to the limit) only
  uno?: UnoState;
  // sixcup (6 Cups dice game) only
  sc?: ScState; scDice?: number;
  // never-ending party games: wins / losses per player, and the final ranking
  tally?: Record<string, { w: number; l: number }>; tallyNames?: Record<string, string>;
  standings?: { id: string; name: string; w: number; l: number; place: number; win: boolean }[];
  // who won / lost the last finished game (rank flash on each player's screen)
  results?: { win: string[]; lose: string[] };
  // players who left a one-round game before it ended (they lose when it ends)
  quitters?: Record<string, string>;
  // rock-paper-scissors rematch for a tie on the win / lose line (party games)
  tb?: { order: string[]; tied: string[]; group: string[]; slots: number; won: string[]; lost: string[]; picks: Record<string, Choice>; round: number; last: any };
  tbNames?: Record<string, string>;
  // draw (Draw & Guess) only
  dg?: { word: string; category: string; drawer: string; strokes: { id: number; c: string; w: number; p: number[] }[]; feed: { id: string; name: string; text: string }[]; reveal: number[]; lastGuess: Record<string, number>; startedAt: number; winner?: string | null };
  // bridge (Glass Bridge) only
  gb?: { safe: number[]; known: (number | null)[]; broken: (number | null)[]; order: string[]; cur: number; pos: number; done: string[]; fell: string[]; last?: any };
  // memory (Memory Match) only
  mem?: { tiles: { v: number; by?: string }[]; open: number[]; score: Record<string, number>; busy?: boolean };
  // rlgl (Red Light, Green Light) only
  rl?: { light: "green" | "red"; lightAt: number; lightUntil?: number; nextGreenMs?: number; endsAt: number; startAt: number; st: Record<string, { steps: number; out?: boolean; done?: boolean; ms?: number; num: number; last?: number }> };
  // frog (Frog Jump) only
  frog?: { phase: "wait" | "pick" | "reveal"; picks: Record<string, number>; last?: any; drinks: Record<string, number>; turnNo: number };
  // poker3 (3-card blind poker drinking game) only
  pkMin?: number; pkMax?: number; // half-cup units, host-set
  pk?: { hands: Record<string, PkCard[]>; seen: Record<string, boolean>; stake: number; pot: number; lastBy?: string; reveal?: any };
  stackTower?: { x: number; y: number; w: number; h: number; by?: string }[];
  stackMove?: { axis: "x" | "y"; x: number; y: number; w: number; h: number; from: boolean; t0: number; speed: number };
}

// Room messages are sent as a key + vars; a var may itself be a nested message
// (or a "gm.*" client key) so words inside messages are translated too.
type MsgV = Record<string, string | number | Msg>;
interface Msg { k: string; v?: MsgV }
function setMsg(room: Room, k: string, v: MsgV | undefined, en: string) { room.message = en; room.msg = { k, v }; }
// Half-cup units → message ("½ cup", "1½ cups", …).
function cupsMsg(u: number): Msg { return { k: u <= 2 ? "cup1" : "cupN", v: { n: u % 2 ? (u === 1 ? "½" : `${Math.floor(u / 2)}½`) : `${u / 2}` } }; }
// Errors returned to the acting player, in their language.
const ERR: Record<string, Tri> = {
  "Not your turn": { en: "Not your turn", zh: "还没轮到你", id: "Belum giliranmu" },
  "No discard to take": { en: "No discard to take", zh: "没有可拿的弃牌", id: "Tidak ada kartu buangan untuk diambil" },
  "Deck empty — take the discard": { en: "Deck empty — take the discard", zh: "牌堆已空——请拿弃牌", id: "Dek habis — ambil kartu buangan" },
  "Choose take or draw": { en: "Choose take or draw", zh: "请选择拿弃牌或摸牌", id: "Pilih ambil buangan atau tarik dari dek" },
  "Pick a card to discard": { en: "Pick a card to discard", zh: "请选择要弃的牌", id: "Pilih kartu untuk dibuang" },
  "Draw first": { en: "Draw first", zh: "请先摸牌", id: "Tarik kartu dulu" },
  "Not now": { en: "Not now", zh: "现在不行", id: "Belum saatnya" },
  "Not playing": { en: "Not playing", zh: "游戏未在进行", id: "Permainan tidak sedang berjalan" },
  "Not in this room": { en: "Not in this room", zh: "你不在这个房间", id: "Kamu tidak ada di room ini" },
  "You've seen your cards — follow (double) or fold": { en: "You've seen your cards — follow (double) or fold", zh: "你已看牌——只能跟（双倍）或弃牌", id: "Kamu sudah lihat kartu — ikut (dobel) atau menyerah" },
  "Call, raise or look": { en: "Call, raise or look", zh: "请跟注、加注或看牌", id: "Ikut, naikkan, atau lihat kartu" },
  "Pick left or right": { en: "Pick left or right", zh: "请选择左或右", id: "Pilih kiri atau kanan" },
  "Only the drawer can draw": { en: "Only the drawer can draw", zh: "只有画手可以画", id: "Hanya penggambar yang boleh menggambar" },
  "Canvas is full — clear or undo": { en: "Canvas is full — clear or undo", zh: "画布已满——请清空或撤销", id: "Kanvas penuh — hapus atau urungkan" },
  "You're the drawer!": { en: "You're the drawer!", zh: "你是画手！", id: "Kamu penggambarnya!" },
  "Slow down": { en: "Slow down", zh: "慢一点", id: "Pelan-pelan" },
  "Type a guess": { en: "Type a guess", zh: "请输入你的答案", id: "Ketik tebakanmu" },
  "Unknown action": { en: "Unknown action", zh: "未知操作", id: "Aksi tidak dikenal" },
  "Wait…": { en: "Wait…", zh: "请稍等…", id: "Tunggu…" },
  "Pick a face-down card": { en: "Pick a face-down card", zh: "请选择一张背面朝上的牌", id: "Pilih kartu yang masih tertutup" },
  "Only the turn player can start": { en: "Only the turn player can start", zh: "只有当前回合的玩家可以开始", id: "Hanya pemain yang sedang giliran yang bisa mulai" },
  "Wait for START": { en: "Wait for START", zh: "请等待开始", id: "Tunggu MULAI" },
  "Pick a frog": { en: "Pick a frog", zh: "请选一只青蛙", id: "Pilih seekor katak" },
  "Pick a card": { en: "Pick a card", zh: "请选一张牌", id: "Pilih sebuah kartu" },
  "You already picked": { en: "You already picked", zh: "你已经选过了", id: "Kamu sudah memilih" },
};
function errText(req: Request, e: string | Tri): string {
  if (typeof e !== "string") return tr(req, e);
  return ERR[e] ? tr(req, ERR[e]) : e;
}
// Default wheel labels are sent as client keys so they get translated.
const WHEEL_LABEL_KEY: Record<string, string> = { PASS: "gm.wheel.pass", "½ cup": "gm.wheel.half", "1 cup": "gm.wheel.one", "2 cups": "gm.wheel.two" };

const rooms = new Map<string, Room>();
// Rooms live in one in-memory map; a room only exists for requests of its own company.
const inThisSpace = (room: Room) => (room.space ?? DEFAULT_COMPANY_SLUG) === homeCompanySlug();
const MAX_PLAYERS = 20;
const CARDS_MAX = 5;
const MEMORY_MAX = 5;
// Most players a room of this game takes.
const roomCap = (g: GameKind) => (g === "cards" ? CARDS_MAX : g === "poker3" ? 8 : g === "memory" ? MEMORY_MAX : g === "inbetween" || g === "updown" ? CD_MAX : g === "uno" ? UNO_MAX : g === "sixcup" ? SC_MAX : MAX_PLAYERS);
const RPS_SECONDS = 20;
const TAP_SECONDS = 30;

function code4(): string {
  let c = ""; do { c = Math.random().toString(36).slice(2, 6).toUpperCase(); } while (rooms.has(c));
  return c;
}

// Public snapshot — hides passwords and other players' live choice until reveal.
function view(room: Room, forUserId?: string) {
  const reveal = room.status === "reveal" || room.status === "done";
  return {
    code: room.code, game: room.game, hostId: room.hostId, status: room.status,
    hasPassword: !!room.password, round: room.round, message: room.message, msg: room.msg,
    secondsLeft: room.deadline ? Math.max(0, Math.ceil((room.deadline - Date.now()) / 1000)) : 0,
    winnerId: room.winnerId, lastLoserId: room.lastLoserId, eliminatedThisRound: room.eliminatedThisRound,
    winTarget: room.winTarget || 1, seriesScore: room.seriesScore || {}, seriesChampionId: room.seriesChampionId,
    you: forUserId,
    players: room.players.map((p) => ({
      id: p.id, name: p.name, alive: p.alive, taps: p.taps,
      chose: !!p.choice, // whether they've locked a choice this round
      choice: reveal || p.id === forUserId ? p.choice || null : null,
    })),
    ...(room.game === "cards" ? { cards: cardView(room, forUserId) } : {}),
    ...(room.game === "dice" ? { dice: diceView(room, forUserId) } : {}),
    ...(room.game === "wheel" ? { wheel: wheelView(room) } : {}),
    ...(room.game === "riding" ? { riding: ridingView(room) } : {}),
    ...(room.game === "timer" ? { timer: timerView(room, forUserId) } : {}),
    ...(room.game === "789" ? { seven: sevenView(room) } : {}),
    ...(room.game === "stack" ? { stack: stackView(room) } : {}),
    ...(room.game === "poker3" ? { poker: pokerView(room, forUserId) } : {}),
    ...(room.game === "frog" ? { frog: frogView(room, forUserId) } : {}),
    ...(room.game === "rlgl" ? { rlgl: rlView(room) } : {}),
    ...(room.game === "memory" ? { memory: memView(room) } : {}),
    ...(room.game === "bridge" ? { bridge: gbView(room) } : {}),
    ...(room.game === "draw" ? { draw: dgView(room, forUserId) } : {}),
    ...(room.game === "inbetween" || room.game === "updown" ? { cd: cdView(room) } : {}),
    ...(room.game === "uno" ? { uno: unoView(room, forUserId) } : {}),
    ...(room.game === "sixcup" ? { sixcup: scView(room) } : {}),
    continuous: CONTINUOUS.has(room.game), tiebreak: tbView(room, forUserId), tally: room.tally || {}, standings: room.standings || null, results: room.results || null,
  };
}

function broadcast(room: Room) {
  const dead: { res: Response; uid?: string }[] = [];
  for (const s of room.subs) {
    try { s.res.write(`data: ${JSON.stringify(view(room, s.uid))}\n\n`); } // personalized per viewer
    catch { dead.push(s); }
  }
  for (const d of dead) room.subs.delete(d);
  persistRoom(room);
}

// ── Rooms survive a server restart (deploys) ─────────────────────────────
// Rooms live in memory; every change is also saved to game_rooms (at most ~1/s
// per room). After a restart a room is loaded back the first time anyone asks
// for it, and its turn timer is started again — so a game half-way through
// carries on instead of "room not found".
const persistTimers = new Map<string, NodeJS.Timeout>();
function roomData(room: Room) {
  const { timer, ticker, cleanupTimer, subs, ...data } = room as any;
  return data;
}
function persistRoom(room: Room) {
  if (persistTimers.has(room.code) || !rooms.has(room.code)) return;
  persistTimers.set(room.code, setTimeout(() => {
    persistTimers.delete(room.code);
    if (!rooms.has(room.code)) return;
    let json = ""; try { json = JSON.stringify(roomData(room)); } catch { return; }
    db.execute(sql`INSERT INTO game_rooms (code, data, updated_at) VALUES (${room.code}, ${json}::jsonb, now())
      ON CONFLICT (code) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`).catch((e) => console.warn("[games] save room", e?.message));
  }, 1000));
}
function dropRoom(code: string) {
  rooms.delete(code);
  const t = persistTimers.get(code); if (t) { clearTimeout(t); persistTimers.delete(code); }
  db.execute(sql`DELETE FROM game_rooms WHERE code = ${code}`).catch(() => {});
}
// Start the game's clock again after a restart. Turn-based games carry on where
// they were; real-time races (tap, timer, wheel, red light, draw, RPS) go back
// to the lobby so the host can start a fresh round.
function resumeRoom(room: Room) {
  if (room.status === "reveal") room.status = "done";
  if (room.status === "done") { scheduleCleanup(room); return; }
  if (room.status !== "playing") return;
  if (room.tb) return tbRound(room); // a tie rematch was on: replay that round
  try {
    switch (room.game) {
      case "memory": {
        const m = room.mem!;
        if (m.busy) { m.open = []; m.busy = false; room.turnIdx = ((room.turnIdx ?? 0) + 1) % room.players.length; }
        return armMem(room);
      }
      case "789": return arm789(room);
      case "inbetween": case "updown": return armCd(room);
      case "sixcup": return armSc(room);
      case "uno": if (room.uno?.phase === "blast") { const i = room.players.findIndex((x) => x.id === room.uno!.blast?.by); unoNewRound(room, i < 0 ? 0 : i); } else unoBeginTurn(room); return;
      case "stack": return armStack(room);
      case "cards": return armCardTimer(room);
      case "dice": return armDiceTimer(room);
      case "riding": return armRidingTimer(room);
      case "poker3": return armPoker(room);
      case "bridge": return armGb(room);
      case "frog": return frogWait(room);
      default:
        resetRoom(room);
        setMsg(room, "restarted", undefined, "The game was restarted — host, press start to play again.");
        return;
    }
  } catch (e) {
    console.warn("[games] resume", room.code, e);
    resetRoom(room);
    setMsg(room, "restarted", undefined, "The game was restarted — host, press start to play again.");
  }
}
function restoreRoom(data: any): Room {
  const room = { ...data, subs: new Set() } as Room;
  rooms.set(room.code, room);
  resumeRoom(room);
  return room;
}
async function getRoom(codeRaw: unknown): Promise<Room | undefined> {
  const code = String(codeRaw || "").toUpperCase();
  const live = rooms.get(code);
  if (live) return inThisSpace(live) ? live : undefined;
  try {
    const r: any = await db.execute(sql`SELECT data FROM game_rooms WHERE code = ${code} AND updated_at > now() - interval '6 hours'`);
    const row = ((r.rows || r) as any[])[0];
    if (!row?.data || rooms.has(code)) return undefined;
    return restoreRoom({ ...row.data, space: row.data.space ?? homeCompanySlug() });
  } catch (e) { console.warn("[games] load room", e); return undefined; }
}
// Lobby list after a restart: bring back the open rooms saved before it.
const restoredLobbies = new Set<string>(); // per company data space
async function restoreSavedRooms() {
  if (restoredLobbies.has(homeCompanySlug())) return;
  restoredLobbies.add(homeCompanySlug());
  try {
    const r: any = await db.execute(sql`SELECT data FROM game_rooms WHERE updated_at > now() - interval '6 hours'`);
    for (const row of (r.rows || r) as any[]) if (row?.data?.code && !rooms.has(row.data.code)) restoreRoom({ ...row.data, space: row.data.space ?? homeCompanySlug() });
    await db.execute(sql`DELETE FROM game_rooms WHERE updated_at < now() - interval '1 day'`);
  } catch (e) { console.warn("[games] restore rooms", e); }
}

async function nameFor(userId: string): Promise<string> {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  return u ? ([u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.email || "Player") : "Player";
}

async function saveScores(room: Room, rows: { userId: string; name: string; score: number; result: "win" | "lose" }[]) {
  // Players who left a one-round game before the end count as losers.
  for (const [id, name] of Object.entries(room.quitters || {})) if (!rows.some((r) => r.userId === id)) rows = [...rows, { userId: id, name, score: 0, result: "lose" }];
  room.quitters = {};
  if (!rows.length) return;
  await db.insert(pvpScores).values(rows.map((r) => ({ companyId: room.companyId ?? null, game: room.game, userId: r.userId, userName: r.name, score: r.score, result: r.result, roomCode: room.code }))).catch(() => {});
  // Every winner: +1 rank star and pet coins; every loser: −1 rank star (no coins).
  const loseIds = new Set(rows.filter((r) => r.result === "lose").map((r) => r.userId));
  if (room.lastLoserId && !rows.some((r) => r.userId === room.lastLoserId)) loseIds.add(room.lastLoserId);
  room.results = { win: rows.filter((r) => r.result === "win").map((r) => r.userId), lose: Array.from(loseIds) };
  broadcast(room);
  for (const r of rows) if (r.result === "win") await awardPetCoins(r.userId, COINS_PER_WIN);
  // Award +1 career rank star to each winner; the round's loser drops 1 star.
  const season = (await getRankConfig()).season;
  for (const r of rows.filter((x) => x.result === "win")) {
    await db.insert(gameRanks).values({ userId: r.userId, userName: r.name, stars: 1, peakStars: 1, season })
      .onConflictDoUpdate({ target: gameRanks.userId, set: { stars: sql`${gameRanks.stars} + 1`, peakStars: sql`greatest(${gameRanks.peakStars}, ${gameRanks.stars} + 1)`, userName: r.name, updatedAt: new Date() } })
      .catch(() => {});
  }
  for (const id of Array.from(loseIds)) {
    await db.update(gameRanks).set({ stars: sql`greatest(0, ${gameRanks.stars} - 1)`, updatedAt: new Date() }).where(eq(gameRanks.userId, id)).catch(() => {});
  }
}

// Series scoring: +1 to the round winner; mark champion when they hit the target.
function bumpSeries(room: Room, winnerId?: string) {
  if (!winnerId) return;
  room.seriesScore = room.seriesScore || {};
  room.seriesScore[winnerId] = (room.seriesScore[winnerId] || 0) + 1;
  if ((room.winTarget || 1) > 1 && room.seriesScore[winnerId] >= (room.winTarget || 1)) room.seriesChampionId = winnerId;
  broadcast(room); // reflect the updated tally in the done screen
}

function clearTimers(room: Room) {
  if (room.timer) { clearTimeout(room.timer); room.timer = undefined; }
  if (room.ticker) { clearInterval(room.ticker); room.ticker = undefined; }
}

// ── Rock Paper Scissors (loser hunt) ────────────────────────────────────
// Winners are safe and leave; losers keep throwing until one player is left,
// and that last player loses (drinks). e.g. 5 players: 3 win / 2 lose → the 2
// play on; 4 win / 1 lose → that 1 loses straight away.
const BEATS: Record<Choice, Choice> = { rock: "scissors", paper: "rock", scissors: "paper" };

const RPS_NEXT_MS = 4500;
function rpsNewGame(room: Room) {
  if (room.game !== "rps" || (room.status !== "reveal" && room.status !== "playing")) return;
  if (room.players.length < 2) { room.status = "playing"; return finishContinuous(room); }
  for (const p of room.players) { p.alive = true; p.choice = null; }
  room.round = 1;
  startRpsRound(room);
}
function startRpsRound(room: Room) {
  clearTimers(room);
  room.status = "playing";
  room.eliminatedThisRound = [];
  for (const p of room.players) if (p.alive) p.choice = null;
  room.deadline = Date.now() + RPS_SECONDS * 1000 + 400;
  setMsg(room, "rpsRound", { n: room.round }, `Round ${room.round} — choose!`);
  broadcast(room);
  room.timer = setTimeout(() => resolveRps(room), RPS_SECONDS * 1000 + 400);
}

function resolveRps(room: Room) {
  clearTimers(room);
  const alive = room.players.filter((p) => p.alive); // still in danger
  const noPick = alive.filter((p) => !p.choice);
  const choosers = alive.filter((p) => p.choice);

  // `alive` = still playing (not yet safe). Winners of a round become safe.
  let safe: Player[] = [];
  const kinds = new Set(choosers.map((p) => p.choice!));
  if (kinds.size === 2) {
    // Exactly two signs out — the winning sign is safe; the losing sign (and
    // anyone who didn't pick) plays on.
    const [a, b] = Array.from(kinds);
    const winningKind = BEATS[a] === b ? a : b;
    safe = choosers.filter((p) => p.choice === winningKind);
  } else if (choosers.length && noPick.length) {
    // Stand-off among the pickers, but some didn't pick — the pickers are safe.
    safe = choosers;
  }
  // Nobody picked at all → end the game rather than looping on idle players.
  // (With one player left — e.g. the others left the room — they simply lose.)
  if (!choosers.length && alive.length >= 2) {
    room.status = "reveal";
    room.winnerId = undefined; room.lastLoserId = undefined;
    setMsg(room, "rpsNobodyNext", undefined, "Nobody picked — a new game starts…");
    broadcast(room);
    room.timer = setTimeout(() => rpsNewGame(room), RPS_NEXT_MS);
    return;
  }
  for (const p of safe) p.alive = false;
  room.eliminatedThisRound = safe.map((p) => p.id); // who got safe this round

  const remaining = room.players.filter((p) => p.alive);
  room.status = "reveal";
  if (remaining.length <= 1) {
    const loser = remaining[0];
    room.winnerId = undefined;
    room.lastLoserId = loser?.id;
    // Party game: the loser gets a loss, everyone else a win; then the next game starts.
    for (const p of room.players) tallyAdd(room, p.id, p.id === loser?.id ? 0 : 1, p.id === loser?.id ? 1 : 0);
    if (loser) setMsg(room, "rpsLoserNext", { name: loser.name }, `${loser.name} loses — drink! 🍺 Next game starts…`); else setMsg(room, "rpsAllSafe", undefined, "Everyone is safe!");
    room.status = "reveal";
    broadcast(room);
    room.timer = setTimeout(() => rpsNewGame(room), RPS_NEXT_MS);
    return;
  }
  if (safe.length) setMsg(room, "rpsSafe", { names: safe.map((p) => p.name).join(", "), n: remaining.length }, `${safe.map((p) => p.name).join(", ")} safe! ${remaining.length} left — go again!`); else setMsg(room, "rpsStandoff", undefined, "Stand-off — go again!");
  broadcast(room);
  // Short reveal pause, then next round with the players still in.
  room.round += 1;
  room.timer = setTimeout(() => startRpsRound(room), 2600);
}

// ── Tap / Mining race (30s) ─────────────────────────────────────────────
function startTap(room: Room) {
  clearTimers(room);
  room.status = "playing";
  for (const p of room.players) p.taps = 0;
  room.deadline = Date.now() + TAP_SECONDS * 1000;
  setMsg(room, "tapGo", undefined, "DIG! Tap as fast as you can!");
  broadcast(room);
  room.ticker = setInterval(() => broadcast(room), 600); // live scoreboard
  room.timer = setTimeout(() => finishTap(room), TAP_SECONDS * 1000);
}

function finishTap(room: Room) {
  clearTimers(room);
  room.status = "done";
  const ranked = [...room.players].sort((a, b) => b.taps - a.taps);
  const top = ranked[0];
  room.winnerId = top?.id;
  room.lastLoserId = ranked[ranked.length - 1]?.id;
  if (top) setMsg(room, "tapWin", { name: top.name, n: top.taps }, `${top.name} struck gold — ${top.taps} coins! 🏆`); else setMsg(room, "gameOver", undefined, "Game over");
  broadcast(room);
  bumpSeries(room, top?.id);
  saveScores(room, ranked.map((p, i) => ({ userId: p.id, name: p.name, score: p.taps, result: i === 0 ? "win" : "lose" })));
  scheduleCleanup(room);
}

// ── Stop the Timer (10s target) ───────────────────────────────────────────
const TIMER_TARGET_MS = 10_000; // default target; host can pick "random" (5–20 s)
const TIMER_EXTRA_MS = 10_000; // hard stop this long after the target so a non-clicker can't stall the room
const timerTarget = (room: Room) => room.timerTargetMs || TIMER_TARGET_MS;
function fmtMs(ms: number) {
  const s = Math.floor(ms / 1000), cs = Math.floor((ms % 1000) / 10);
  return `${s}:${String(cs).padStart(2, "0")}`;
}
function startTimer(room: Room) {
  clearTimers(room);
  room.status = "playing";
  for (const p of room.players) p.stopMs = null;
  room.timerStart = Date.now();
  room.timerWinners = [];
  // Random mode picks a fresh whole-second target (5–20 s) every round.
  room.timerTargetMs = room.timerMode === "random" ? (5 + Math.floor(Math.random() * 16)) * 1000 : TIMER_TARGET_MS;
  room.deadline = 0;
  setMsg(room, "timerGo", { t: fmtMs(room.timerTargetMs) }, `GO! Hit STOP at exactly ${fmtMs(room.timerTargetMs)} ⏱️`);
  broadcast(room);
  room.timer = setTimeout(() => finishTimer(room), room.timerTargetMs + TIMER_EXTRA_MS);
}
function stopTimer(room: Room, uid: string) {
  if (room.status !== "playing" || room.game !== "timer" || !room.timerStart) return;
  const p = room.players.find((x) => x.id === uid);
  if (!p || p.stopMs != null) return;
  p.stopMs = Math.max(0, Date.now() - room.timerStart);
  broadcast(room);
  if (room.players.every((x) => x.stopMs != null)) finishTimer(room);
}
function finishTimer(room: Room) {
  clearTimers(room);
  room.status = "done";
  const dist = (p: Player) => (p.stopMs == null ? Infinity : Math.abs(p.stopMs - timerTarget(room)));
  const stoppers = room.players.filter((p) => p.stopMs != null);
  const min = stoppers.length ? Math.min(...stoppers.map(dist)) : Infinity;
  const winners = stoppers.filter((p) => dist(p) === min);
  room.timerWinners = winners.map((p) => p.id);
  room.winnerId = winners[0]?.id;
  const ranked = [...room.players].sort((a, b) => dist(a) - dist(b));
  room.lastLoserId = ranked.length ? ranked[ranked.length - 1].id : undefined;
  if (!winners.length) setMsg(room, "timerNone", undefined, "Nobody hit stop — no winner!");
  else if (winners.length === 1) setMsg(room, "timerWin", { name: winners[0].name, t: fmtMs(winners[0].stopMs!) }, `${winners[0].name} nailed it at ${fmtMs(winners[0].stopMs!)} 🏆`);
  else setMsg(room, "timerTie", { names: winners.map((p) => p.name).join(" & "), t: fmtMs(winners[0].stopMs!), n: winners.length }, `${winners.map((p) => p.name).join(" & ")} tied at ${fmtMs(winners[0].stopMs!)} — ${winners.length} winners! 🏆`);
  broadcast(room);
  const rows = room.players.map((p) => ({
    userId: p.id, name: p.name, score: p.stopMs == null ? 0 : Math.max(0, timerTarget(room) - Math.round(dist(p))),
    result: (room.timerWinners!.includes(p.id) ? "win" : "lose") as "win" | "lose", // no stop = lose
  }));
  saveScores(room, rows);
  scheduleCleanup(room);
}
function timerView(room: Room, forUserId?: string) {
  const done = room.status === "done";
  return {
    targetMs: timerTarget(room),
    mode: room.timerMode || "fixed",
    startedAt: room.timerStart || null,
    serverNow: Date.now(),
    yourMs: room.players.find((p) => p.id === forUserId)?.stopMs ?? null,
    stoppedCount: room.players.filter((p) => p.stopMs != null).length,
    total: room.players.length,
    winners: room.timerWinners || [],
    stopped: room.players.reduce((acc: any, p) => { acc[p.id] = p.stopMs != null; return acc; }, {}),
    results: done ? [...room.players].map((p) => ({ id: p.id, name: p.name, ms: p.stopMs ?? null, dist: p.stopMs == null ? null : Math.abs(p.stopMs - timerTarget(room)) })).sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity)) : null,
  };
}

// ── 789 (two-dice drinking party game) ───────────────────────────────────
// Roll 2 dice: 7 = top up the cup, 8 = drink half, 9 = drink whole. Those three
// let you roll AGAIN. Doubles reverse the turn direction; snake eyes (1,1) let
// you pick anyone to down the cup and it becomes their turn. No winner — a party
// game that runs until players leave.
const SEVEN_TURN_SECONDS = 40;
const rollD = () => 1 + Math.floor(Math.random() * 6);
function arm789(room: Room) {
  clearTimers(room);
  room.deadline = Date.now() + SEVEN_TURN_SECONDS * 1000 + 300;
  room.timer = setTimeout(() => seven789Timeout(room), SEVEN_TURN_SECONDS * 1000 + 300);
}
function start789(room: Room) {
  clearTimers(room);
  room.status = "playing";
  room.dir = 1; room.cupUnits = 1; room.lastRoll = null; room.chooseFor = null;
  room.turnIdx = Math.floor(Math.random() * room.players.length);
  setMsg(room, "s789Start", { name: room.players[room.turnIdx].name }, `${room.players[room.turnIdx].name} starts — roll the dice! 🎲`);
  arm789(room);
  broadcast(room);
}
const stepIdx789 = (room: Room, from: number) => { const n = room.players.length; return ((from + (room.dir || 1)) % n + n) % n; };
function seven789Timeout(room: Room) {
  if (room.status !== "playing" || room.game !== "789") return;
  if (room.chooseFor) {
    const others = room.players.filter((p) => p.id !== room.chooseFor);
    const t = others.length ? others[Math.floor(Math.random() * others.length)] : room.players[room.turnIdx ?? 0];
    seven789Choose(room, room.chooseFor, t.id);
  } else {
    const cur = room.players[room.turnIdx ?? 0]; if (cur) seven789Roll(room, cur.id);
  }
}
function seven789Roll(room: Room, uid: string) {
  if (room.status !== "playing" || room.game !== "789" || room.chooseFor) return;
  const idx = room.players.findIndex((p) => p.id === uid);
  if (idx !== room.turnIdx) return;
  clearTimers(room);
  const d1 = rollD(), d2 = rollD(), sum = d1 + d2;
  const p = room.players[idx];
  let action = "none", text = "", rollAgain = false, reverse = false, chooseNow = false;
  let tm: Msg | null = null; // translatable form of `text`
  if (d1 === 1 && d2 === 1) {
    chooseNow = true; action = "choose";
    text = `🎯 Snake eyes! ${p.name} picks anyone to down the whole cup`; tm = { k: "s789Snake", v: { name: p.name } };
  } else {
    if (sum === 7) { room.cupUnits = (room.cupUnits || 0) + 1; action = "add"; text = `${p.name} rolled 7 — top up the cup 🍺 (+1)`; tm = { k: "s789Add", v: { name: p.name } }; }
    else if (sum === 8) { room.cupUnits = Math.floor((room.cupUnits || 0) / 2); action = "half"; text = `${p.name} rolled 8 — drink HALF the cup 🍺`; tm = { k: "s789Half", v: { name: p.name } }; }
    else if (sum === 9) { room.cupUnits = 0; action = "whole"; text = `${p.name} rolled 9 — DOWN the whole cup 🍺🍺`; tm = { k: "s789Whole", v: { name: p.name } }; }
    if (d1 === d2) {
      reverse = true;
      if (text && tm) { text = `${text} · doubles reverse 🔄`; tm = { k: "s789Rev", v: { text: tm } }; }
      else { text = `${p.name} rolled doubles (${d1}+${d2}) — turn reverses 🔄`; tm = { k: "s789Doubles", v: { name: p.name, a: d1, b: d2 } }; }
    }
    else if ((sum === 7 || sum === 8 || sum === 9) && tm) { rollAgain = true; text += " — roll again!"; tm = { k: "s789Again", v: { text: tm } }; }
    if (!text || !tm) { text = `${p.name} rolled ${sum}`; tm = { k: "s789Rolled", v: { name: p.name, n: sum } }; }
  }
  room.lastRoll = { d1, d2, sum, by: uid, byName: p.name, action, text };
  // Tally: drinking (8 / 9) is a loss, any other roll a win; snake eyes counts for whoever downs it.
  if (action === "half" || action === "whole") tallyAdd(room, uid, 0, 1); else if (action !== "choose") tallyAdd(room, uid, 1, 0);
  if (chooseNow) { room.chooseFor = uid; setMsg(room, tm.k, tm.v, text); arm789(room); broadcast(room); return; }
  if (reverse) { room.dir = (room.dir || 1) * -1; room.turnIdx = stepIdx789(room, idx); setMsg(room, "s789Turn", { text: tm, name: room.players[room.turnIdx].name }, `${text} — ${room.players[room.turnIdx].name}'s turn`); }
  else if (rollAgain) { setMsg(room, tm.k, tm.v, text); }
  else { room.turnIdx = stepIdx789(room, idx); setMsg(room, "s789Turn", { text: tm, name: room.players[room.turnIdx].name }, `${text} — ${room.players[room.turnIdx].name}'s turn`); }
  arm789(room);
  broadcast(room);
}
function seven789Choose(room: Room, roller: string, targetId: string) {
  if (room.status !== "playing" || room.game !== "789" || room.chooseFor !== roller) return;
  const ti = room.players.findIndex((p) => p.id === targetId);
  if (ti < 0) return;
  const t = room.players[ti];
  room.cupUnits = 0;
  room.chooseFor = null;
  room.turnIdx = ti;
  tallyAdd(room, roller, 1, 0); tallyAdd(room, t.id, 0, 1);
  room.lastRoll = { ...(room.lastRoll || { d1: 1, d2: 1, sum: 2 }), action: "chosen", text: `${t.name} downs the whole cup 🍺 — their turn now` };
  setMsg(room, "s789Downs", { name: t.name }, `${t.name} downs the whole cup 🍺 — ${t.name}'s turn`);
  arm789(room);
  broadcast(room);
}
function sevenView(room: Room) {
  return {
    turnId: room.players[room.turnIdx ?? 0]?.id,
    dir: room.dir || 1,
    cupUnits: room.cupUnits || 0,
    last: room.lastRoll || null,
    chooseFor: room.chooseFor || null,
  };
}

// ── In Between + Up or Down (card drinking games, up to 10 players) ───────────
// One 52-card deck, A = 1 … K = 13. In Between: two cards lie open; the turn
// player calls INSIDE (the next card lands strictly between them) or OUTSIDE.
// Up or Down: one card lies open; call UP (higher) or DOWN (lower). A wrong call
// = drink 1 cup and call again; the same number as an open card = drink DOUBLE
// and call again. A right call passes the turn on. In Between: the drawer then
// puts the drawn card on the left or right for the next call; Up or Down: the
// drawn card becomes the open card. When the deck runs out a new deck (new game)
// starts by itself; the game runs until only one player is left.
const CD_MAX = 10;
const CD_CALL_SECONDS = 35, CD_PLACE_SECONDS = 20;
interface CdCard { id: string; r: number; s: string }
type CdCall = "in" | "out" | "up" | "down";
interface CdState {
  deck: CdCard[]; left?: CdCard | null; right?: CdCard | null; cur?: CdCard | null; drawn?: CdCard | null;
  phase: "call" | "place"; deckNo: number; drinks: Record<string, number>;
  last?: { by: string; name: string; call: CdCall; card: CdCard; result: "right" | "wrong" | "same"; cups: number } | null;
}
const cdLabel = (r: number) => (r === 1 ? "A" : r === 11 ? "J" : r === 12 ? "Q" : r === 13 ? "K" : String(r));
const cdName = (c: CdCard) => `${cdLabel(c.r)}${c.s}`;
const CD_CALL_KEY: Record<CdCall, string> = { in: "gm.cd.in", out: "gm.cd.out", up: "gm.cd.up", down: "gm.cd.down" };
function cdDeck(): CdCard[] {
  const d: CdCard[] = [];
  for (let r = 1; r <= 13; r++) for (const s of CARD_SUITS) d.push({ id: `${r}${s}-${Math.random().toString(36).slice(2, 7)}`, r, s });
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}
const cdTurn = (room: Room) => room.players[room.turnIdx ?? 0];
const cdNext = (room: Room) => { room.turnIdx = ((room.turnIdx ?? 0) + 1) % room.players.length; };
// A fresh deck = a new game: new open card(s), the turn stays where it is.
function cdNewDeck(room: Room) {
  const cd = room.cd!;
  cd.deck = cdDeck(); cd.deckNo += 1; cd.drawn = null; cd.phase = "call";
  if (room.game === "inbetween") { cd.left = cd.deck.pop()!; cd.right = cd.deck.pop()!; cd.cur = null; }
  else { cd.cur = cd.deck.pop()!; cd.left = cd.right = null; }
}
function armCd(room: Room) {
  clearTimers(room);
  const secs = room.cd?.phase === "place" ? CD_PLACE_SECONDS : CD_CALL_SECONDS;
  room.deadline = Date.now() + secs * 1000 + 300;
  room.timer = setTimeout(() => cdTimeout(room), secs * 1000 + 300);
}
function startCd(room: Room) {
  clearTimers(room);
  room.status = "playing";
  room.cd = { deck: [], deckNo: 0, drinks: {}, phase: "call", last: null };
  cdNewDeck(room);
  room.turnIdx = Math.floor(Math.random() * room.players.length);
  const name = cdTurn(room).name;
  if (room.game === "inbetween") setMsg(room, "ibStart", { name }, `${name} starts — inside or outside? 🃏`);
  else setMsg(room, "udStart", { name }, `${name} starts — up or down? 🃏`);
  armCd(room);
  broadcast(room);
}
function cdTimeout(room: Room) {
  if (room.status !== "playing" || !room.cd) return;
  const p = cdTurn(room); if (!p) return;
  if (room.cd.phase === "place") cdPlace(room, p.id, "left");
  else cdCall(room, p.id, room.game === "inbetween" ? (Math.random() < 0.5 ? "in" : "out") : (Math.random() < 0.5 ? "up" : "down"));
}
function cdCall(room: Room, uid: string, call: CdCall): string | null {
  const cd = room.cd;
  if (room.status !== "playing" || !cd) return "Not playing";
  if (cdTurn(room)?.id !== uid) return "Not your turn";
  if (cd.phase !== "call") return "Not now";
  const ok = room.game === "inbetween" ? call === "in" || call === "out" : call === "up" || call === "down";
  if (!ok) return "Unknown action";
  if (!cd.deck.length) cdNewDeck(room); // safety: never draw from an empty deck
  const c = cd.deck.pop()!;
  const p = cdTurn(room);
  let result: "right" | "wrong" | "same";
  if (room.game === "inbetween") {
    const a = cd.left!.r, b = cd.right!.r, lo = Math.min(a, b), hi = Math.max(a, b);
    if (c.r === a || c.r === b) result = "same";
    else result = (call === "in") === (c.r > lo && c.r < hi) ? "right" : "wrong";
  } else {
    if (c.r === cd.cur!.r) result = "same";
    else result = (call === "up") === (c.r > cd.cur!.r) ? "right" : "wrong";
  }
  const cups = result === "same" ? 2 : result === "wrong" ? 1 : 0;
  tallyAdd(room, uid, result === "right" ? 1 : 0, result === "right" ? 0 : 1);
  if (cups) cd.drinks[uid] = (cd.drinks[uid] || 0) + cups;
  cd.last = { by: uid, name: p.name, call, card: c, result, cups };
  const v = { name: p.name, call: CD_CALL_KEY[call], card: cdName(c) };
  if (room.game === "inbetween") {
    // The drawer puts the card on the left or right for the next call.
    cd.drawn = c; cd.phase = "place";
    if (result === "right") setMsg(room, "ibRight", v, `✅ ${p.name} called ${call} — ${v.card}! Now put the card left or right.`);
    else if (result === "wrong") setMsg(room, "ibWrong", v, `❌ ${p.name} called ${call} — ${v.card}. Drink 1 cup 🍺! Put the card left or right, then call again.`);
    else setMsg(room, "ibSame", v, `💥 ${v.card} — same number! ${p.name} drinks DOUBLE 🍺🍺. Put the card left or right, then call again.`);
  } else {
    cd.cur = c;
    if (result === "right") { cdNext(room); const next = cdTurn(room).name; setMsg(room, "udRight", { ...v, next }, `✅ ${p.name} called ${call} — ${v.card}! ${next}, up or down?`); }
    else if (result === "wrong") setMsg(room, "udWrong", v, `❌ ${p.name} called ${call} — ${v.card}. Drink 1 cup 🍺 and call again!`);
    else setMsg(room, "udSame", v, `💥 Same number ${v.card}! ${p.name} drinks DOUBLE 🍺🍺 and calls again!`);
    if (!cd.deck.length) { cdNewDeck(room); const name = cdTurn(room).name; setMsg(room, "udNewDeck", { name }, `🔄 The deck is finished — new game! ${name}, up or down?`); }
  }
  armCd(room);
  broadcast(room);
  return null;
}
function cdPlace(room: Room, uid: string, side: string): string | null {
  const cd = room.cd;
  if (room.status !== "playing" || !cd || room.game !== "inbetween") return "Not playing";
  if (cdTurn(room)?.id !== uid) return "Not your turn";
  if (cd.phase !== "place" || !cd.drawn) return "Not now";
  if (side !== "left" && side !== "right") return "Pick left or right";
  if (side === "left") cd.left = cd.drawn; else cd.right = cd.drawn;
  cd.drawn = null; cd.phase = "call";
  const won = cd.last?.result === "right";
  if (won) cdNext(room);
  const name = cdTurn(room).name;
  if (!cd.deck.length) { cdNewDeck(room); setMsg(room, "ibNewDeck", { name }, `🔄 The deck is finished — new game! ${name}, inside or outside?`); }
  else if (won) setMsg(room, "ibTurn", { name }, `${name}'s turn — inside or outside?`);
  else setMsg(room, "ibAgain", { name }, `${name}, call again — inside or outside?`);
  armCd(room);
  broadcast(room);
  return null;
}
// A player left mid-game: hand the turn on with a clean state.
function cdPlayerLeft(room: Room, leavingWasTurn: boolean) {
  const cd = room.cd; if (!cd) return;
  if (!leavingWasTurn) return;
  if (cd.phase === "place" && cd.drawn) { cd.left = cd.drawn; cd.drawn = null; } // their card goes on the left
  cd.phase = "call";
  if (!cd.deck.length) cdNewDeck(room);
  const name = cdTurn(room).name;
  if (room.game === "inbetween") setMsg(room, "ibTurn", { name }, `${name}'s turn — inside or outside?`);
  else setMsg(room, "udTurn", { name }, `${name}'s turn — up or down?`);
  armCd(room);
}
function cdView(room: Room) {
  const cd = room.cd; if (!cd) return null;
  const card = (c?: CdCard | null) => (c ? { r: c.r, s: c.s, label: cdLabel(c.r) } : null);
  return {
    turnId: cdTurn(room)?.id, phase: cd.phase, deckLeft: cd.deck.length, deckNo: cd.deckNo,
    left: card(cd.left), right: card(cd.right), cur: card(cd.cur), drawn: card(cd.drawn),
    last: cd.last ? { ...cd.last, card: card(cd.last.card) } : null,
    drinks: cd.drinks,
  };
}

// ── Uno (count to the limit without blasting, 2–6 players) ────────────────────
// Everyone holds 3 cards; play one and you draw one. Number cards add their value
// to the shared total (A = 1 … 10); power cards can always be played: 7 = reverse (adds nothing),
// J = skip the next player, Q = −5, K = −10. Limit: 2 or 3 players 29, 4 players 39,
// +10 for each player after that. Reaching the limit exactly is fine; any card can be
// played, but a player whose card takes the total OVER the limit BLASTS — drinks 1 cup
// and loses that game; a new game starts (the next player begins) and the party carries on.
const UNO_MAX = 6;
const UNO_TURN_SECONDS = 30, UNO_BLAST_MS = 4500;
interface UnoState {
  deck: CdCard[]; hands: Record<string, CdCard[]>; total: number; limit: number; dir: number;
  phase: "play" | "blast"; roundNo: number;
  last?: { by: string; name: string; card: CdCard; effect: "add" | "reverse" | "skip" | "minus"; total: number; skipped?: string } | null;
  blast?: { by: string; name: string } | null;
}
const unoLimit = (n: number) => (n <= 3 ? 29 : 29 + (n - 3) * 10); // 2–3 players 29, then +10 each
const unoIsPower = (c: CdCard) => c.r === 7 || c.r === 11 || c.r === 12 || c.r === 13;
const unoValue = (c: CdCard) => (c.r === 12 ? -5 : c.r === 13 ? -10 : unoIsPower(c) ? 0 : c.r);
// Does this card keep the total at the limit or under? (Any card may be played; one that doesn't blasts.)
const unoCanPlay = (u: UnoState, c: CdCard) => unoIsPower(c) || u.total + c.r <= u.limit;
const unoStep = (room: Room, from: number, steps = 1) => { const n = room.players.length; return (((from + (room.uno?.dir || 1) * steps) % n) + n) % n; };
function unoDraw(u: UnoState): CdCard {
  if (!u.deck.length) { // reshuffle a fresh deck without the cards still in hands
    const held = new Set(Object.values(u.hands).flat().map((c) => `${c.r}${c.s}`));
    u.deck = cdDeck().filter((c) => !held.has(`${c.r}${c.s}`));
  }
  return u.deck.pop()!;
}
function unoNewRound(room: Room, starterIdx: number) {
  const u = room.uno!;
  u.deck = cdDeck(); u.hands = {}; u.total = 0; u.dir = 1; u.phase = "play"; u.blast = null; u.last = null;
  u.limit = unoLimit(room.players.length); u.roundNo += 1;
  for (const p of room.players) u.hands[p.id] = [unoDraw(u), unoDraw(u), unoDraw(u)];
  room.dir = 1;
  room.turnIdx = starterIdx % room.players.length;
  const name = room.players[room.turnIdx].name;
  setMsg(room, u.roundNo > 1 ? "unoNewRound" : "unoStart", { name, limit: u.limit }, `${name} starts — keep the total at ${u.limit} or under!`);
  unoBeginTurn(room);
}
function startUno(room: Room) {
  clearTimers(room);
  room.status = "playing";
  room.uno = { deck: [], hands: {}, total: 0, limit: 29, dir: 1, phase: "play", roundNo: 0 };
  unoNewRound(room, Math.floor(Math.random() * room.players.length));
  broadcast(room);
}
// Start the turn player's clock (they must play a card, even one that goes over).
function unoBeginTurn(room: Room) {
  const u = room.uno!, p = room.players[room.turnIdx ?? 0];
  if (!p) return;
  if (!u.hands[p.id]) u.hands[p.id] = [unoDraw(u), unoDraw(u), unoDraw(u)];
  clearTimers(room);
  room.deadline = Date.now() + UNO_TURN_SECONDS * 1000 + 300;
  room.timer = setTimeout(() => unoTimeout(room), UNO_TURN_SECONDS * 1000 + 300);
}
function unoBlast(room: Room, p: Player, card: CdCard) {
  const u = room.uno!;
  clearTimers(room);
  u.phase = "blast"; u.blast = { by: p.id, name: p.name };
  tallyAdd(room, p.id, 0, 1);
  for (const o of room.players) if (o.id !== p.id) tallyAdd(room, o.id, 1, 0);
  setMsg(room, "unoBust", { name: p.name, card: cdName(card), limit: u.limit, total: u.total }, `💥 ${p.name} played ${cdName(card)} · total ${u.total} — over ${u.limit}! BLAST, drink 1 cup 🍺`);
  room.deadline = Date.now() + UNO_BLAST_MS;
  room.timer = setTimeout(() => {
    if (room.status !== "playing" || room.game !== "uno") return;
    // The blaster just played, so the next player starts the new game (nobody plays twice in a row).
    const idx = room.players.findIndex((x) => x.id === p.id);
    unoNewRound(room, idx < 0 ? 0 : unoStep(room, idx));
    broadcast(room);
  }, UNO_BLAST_MS);
}
function unoTimeout(room: Room) {
  if (room.status !== "playing" || room.game !== "uno" || room.uno?.phase !== "play") return;
  const u = room.uno, p = room.players[room.turnIdx ?? 0]; if (!p) return;
  const hand = u.hands[p.id] || [];
  // Auto-play the smallest number that fits, else a power card, else the smallest card (it blasts).
  const pick = hand.filter((c) => !unoIsPower(c) && unoCanPlay(u, c)).sort((a, b) => a.r - b.r)[0] || hand.find((c) => unoIsPower(c)) || [...hand].sort((a, b) => a.r - b.r)[0];
  if (pick) unoPlay(room, p.id, pick.id);
}
function unoPlay(room: Room, uid: string, cardId: string): string | Tri | null {
  const u = room.uno;
  if (room.status !== "playing" || !u) return "Not playing";
  if (u.phase !== "play") return "Wait…";
  const idx = room.turnIdx ?? 0, p = room.players[idx];
  if (p?.id !== uid) return "Not your turn";
  const hand = u.hands[uid] || [];
  const ci = hand.findIndex((c) => c.id === cardId);
  if (ci < 0) return "Pick a card";
  const c = hand[ci];
  const bust = !unoCanPlay(u, c);
  hand.splice(ci, 1); hand.push(unoDraw(u));
  u.total += unoValue(c); // Q / K may take it below 0
  if (bust) { // over the limit → this player blasts
    u.last = { by: uid, name: p.name, card: c, effect: "add", total: u.total };
    unoBlast(room, p, c);
    broadcast(room);
    return null;
  }
  // J skips the next player — but never gives the same player two turns in a row
  // (with 2 players it just passes the turn on).
  let effect: "add" | "reverse" | "skip" | "minus" = c.r === 7 ? "reverse" : c.r === 11 ? (room.players.length > 2 ? "skip" : "add") : c.r >= 12 ? "minus" : "add";
  let next: number, skipped: string | undefined;
  if (effect === "reverse") { u.dir = -u.dir; room.dir = u.dir; next = unoStep(room, idx); }
  else if (effect === "skip") { const s = unoStep(room, idx); skipped = room.players[s]?.name; next = unoStep(room, idx, 2); }
  else next = unoStep(room, idx);
  u.last = { by: uid, name: p.name, card: c, effect, total: u.total, skipped };
  room.turnIdx = next;
  const v: MsgV = { name: p.name, card: cdName(c), total: u.total, next: room.players[next].name };
  if (effect === "reverse") setMsg(room, "unoReverse", v, `${p.name} played 7 — reverse 🔄 · total ${u.total} · ${v.next}'s turn`);
  else if (effect === "skip") setMsg(room, "unoSkip", { ...v, skipped: skipped || "" }, `${p.name} played J — ${skipped} is skipped ⏭ · total ${u.total} · ${v.next}'s turn`);
  else if (effect === "minus") setMsg(room, "unoMinus", { ...v, n: unoValue(c) }, `${p.name} played ${v.card} (${unoValue(c)}) · total ${u.total} · ${v.next}'s turn`);
  else setMsg(room, "unoAdd", v, `${p.name} played ${v.card} · total ${u.total} · ${v.next}'s turn`);
  unoBeginTurn(room);
  broadcast(room);
  return null;
}
function unoPlayerLeft(room: Room, uid: string | undefined, leavingWasTurn: boolean) {
  const u = room.uno; if (!u) return;
  if (uid) delete u.hands[uid];
  if (u.phase !== "play" || !leavingWasTurn) return;
  const name = room.players[room.turnIdx ?? 0].name;
  setMsg(room, "turn", { name }, `${name}'s turn`);
  unoBeginTurn(room);
}
function unoView(room: Room, forUserId?: string) {
  const u = room.uno; if (!u) return null;
  const card = (c: CdCard) => ({ id: c.id, r: c.r, s: c.s, label: cdLabel(c.r), power: unoIsPower(c), ok: unoCanPlay(u, c) });
  return {
    turnId: room.players[room.turnIdx ?? 0]?.id, total: u.total, limit: u.limit, dir: u.dir, phase: u.phase, roundNo: u.roundNo,
    deckLeft: u.deck.length, last: u.last ? { ...u.last, card: card(u.last.card) } : null, blast: u.blast || null,
    myHand: forUserId && u.hands[forUserId] ? u.hands[forUserId].map(card) : [],
    counts: Object.fromEntries(room.players.map((p) => [p.id, (u.hands[p.id] || []).length])),
  };
}

// ── 6 Cups (dice drinking game, up to 20 players) ─────────────────────────────
// A row of numbered cups starts empty: 6 cups (1–6) with 1 die, or 11 cups (2–12)
// with 2 dice. Roll: if that cup is empty you fill it (half or full) and the turn
// passes on; if it already has a drink you drink it (it empties) and roll again —
// until you land on an empty cup and fill it. With 2 dice, doubles reverse the turn
// order (the total still counts). Filling = a win, drinking = a loss on the tally.
const SC_MAX = 20;
const SC_ROLL_SECONDS = 30, SC_FILL_SECONDS = 20;
interface ScState {
  dice: 1 | 2; cups: Record<number, number>; // 0 empty, 1 half, 2 full
  phase: "roll" | "fill"; pending?: number | null; dir: number;
  last?: { by: string; name: string; d1: number; d2?: number; sum: number; action: "fill" | "drink"; amount?: number; reverse?: boolean } | null;
}
const scNumbers = (dice: number) => (dice === 2 ? [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [1, 2, 3, 4, 5, 6]);
function armSc(room: Room) {
  clearTimers(room);
  const secs = room.sc?.phase === "fill" ? SC_FILL_SECONDS : SC_ROLL_SECONDS;
  room.deadline = Date.now() + secs * 1000 + 300;
  room.timer = setTimeout(() => scTimeout(room), secs * 1000 + 300);
}
function startSc(room: Room) {
  clearTimers(room);
  room.status = "playing";
  const dice = room.scDice === 2 ? 2 : 1;
  room.sc = { dice, cups: Object.fromEntries(scNumbers(dice).map((n) => [n, 0])), phase: "roll", pending: null, dir: 1, last: null };
  room.turnIdx = Math.floor(Math.random() * room.players.length);
  const name = room.players[room.turnIdx].name;
  setMsg(room, "scStart", { name, n: scNumbers(dice).length }, `${name} starts — roll the dice! 🎲`);
  armSc(room);
  broadcast(room);
}
function scTimeout(room: Room) {
  if (room.status !== "playing" || room.game !== "sixcup" || !room.sc) return;
  const p = room.players[room.turnIdx ?? 0]; if (!p) return;
  if (room.sc.phase === "fill") scFill(room, p.id, 1); else scRoll(room, p.id);
}
const scStepTurn = (room: Room) => { const n = room.players.length; room.turnIdx = ((((room.turnIdx ?? 0) + (room.sc?.dir || 1)) % n) + n) % n; };
function scRoll(room: Room, uid: string): string | null {
  const s = room.sc;
  if (room.status !== "playing" || !s) return "Not playing";
  const p = room.players[room.turnIdx ?? 0];
  if (p?.id !== uid) return "Not your turn";
  if (s.phase !== "roll") return "Not now";
  const d1 = rollD(), d2 = s.dice === 2 ? rollD() : undefined, sum = d1 + (d2 || 0);
  const reverse = s.dice === 2 && d1 === d2;
  if (reverse) s.dir = -s.dir;
  const level = s.cups[sum] || 0;
  if (level > 0) {
    s.cups[sum] = 0;
    tallyAdd(room, uid, 0, 1);
    s.last = { by: uid, name: p.name, d1, d2, sum, action: "drink", amount: level, reverse };
    setMsg(room, reverse ? "scDrinkRev" : "scDrink", { name: p.name, n: sum, amt: level === 2 ? "gm.sc.full" : "gm.sc.half" }, `${p.name} rolled ${sum} — drink cup ${sum}! Roll again 🎲`);
  } else {
    s.phase = "fill"; s.pending = sum;
    s.last = { by: uid, name: p.name, d1, d2, sum, action: "fill", reverse };
    setMsg(room, reverse ? "scFillAskRev" : "scFillAsk", { name: p.name, n: sum }, `${p.name} rolled ${sum} — cup ${sum} is empty: fill it half or full`);
  }
  armSc(room);
  broadcast(room);
  return null;
}
function scFill(room: Room, uid: string, amount: number): string | null {
  const s = room.sc;
  if (room.status !== "playing" || !s) return "Not playing";
  const p = room.players[room.turnIdx ?? 0];
  if (p?.id !== uid) return "Not your turn";
  if (s.phase !== "fill" || s.pending == null) return "Not now";
  const amt = amount === 2 ? 2 : 1;
  const n = s.pending;
  s.cups[n] = amt; s.pending = null; s.phase = "roll";
  tallyAdd(room, uid, 1, 0);
  if (s.last) s.last = { ...s.last, amount: amt };
  scStepTurn(room);
  const next = room.players[room.turnIdx ?? 0].name;
  setMsg(room, "scFilled", { name: p.name, n, amt: amt === 2 ? "gm.sc.full" : "gm.sc.half", next }, `${p.name} filled cup ${n} — ${next}'s turn`);
  armSc(room);
  broadcast(room);
  return null;
}
function scPlayerLeft(room: Room, leavingWasTurn: boolean) {
  const s = room.sc; if (!s || !leavingWasTurn) return;
  if (s.phase === "fill" && s.pending != null) { s.cups[s.pending] = 1; s.pending = null; } // their pending cup gets half
  s.phase = "roll";
  const name = room.players[room.turnIdx ?? 0].name;
  setMsg(room, "turn", { name }, `${name}'s turn`);
  armSc(room);
}
function scView(room: Room) {
  const s = room.sc; if (!s) return null;
  return { dice: s.dice, cups: scNumbers(s.dice).map((n) => ({ n, level: s.cups[n] || 0 })), phase: s.phase, pending: s.pending ?? null, dir: s.dir, last: s.last || null, turnId: room.players[room.turnIdx ?? 0]?.id };
}

// ── Win / lose tally for the never-ending party games ─────────────────────────
// 789, Frog, In Between, Up or Down and Uno have no natural end. Each turn adds a
// win or a loss; when the host ends the game, players are ranked by wins (then
// fewest losses). 4+ players: the top 3 win (1st, 2nd, 3rd) and the rest lose;
// 3 or fewer: only the top player wins.
const CONTINUOUS = new Set<GameKind>(["rps", "789", "frog", "inbetween", "updown", "uno", "sixcup"]);
function tallyAdd(room: Room, uid: string, w: number, l: number) {
  room.tally = room.tally || {};
  room.tallyNames = room.tallyNames || {};
  const nm = room.players.find((p) => p.id === uid)?.name; if (nm) room.tallyNames[uid] = nm;
  const t = room.tally[uid] || (room.tally[uid] = { w: 0, l: 0 });
  t.w += w; t.l += l;
}
// Ranking at the end of a party game. A tie on the win / lose line (e.g. two players
// level for 1st when only 1st wins) is settled by a rock-paper-scissors rematch among
// the tied players; players who already left lose to those still here.
function finishContinuous(room: Room) {
  clearTimers(room);
  const t = room.tally || {};
  const people = new Map<string, string>(Object.entries(room.tallyNames || {}));
  for (const p of room.players) people.set(p.id, p.name);
  room.tbNames = Object.fromEntries(people);
  const order = Array.from(people.keys()).sort((a, b) => ((t[b]?.w || 0) - (t[a]?.w || 0)) || ((t[a]?.l || 0) - (t[b]?.l || 0)));
  const spots = order.length >= 4 ? 3 : 1;
  if (order.length > spots) {
    const key = (id: string) => `${t[id]?.w || 0}/${t[id]?.l || 0}`;
    const cut = key(order[spots - 1]);
    if (key(order[spots]) === cut) {
      const tied = order.filter((id) => key(id) === cut);
      const above = order.slice(0, spots).filter((id) => key(id) !== cut).length;
      return startTiebreak(room, order, tied, spots - above);
    }
  }
  finalizeRanking(room, order);
}
function finalizeRanking(room: Room, order: string[]) {
  clearTimers(room);
  room.tb = undefined;
  const t = room.tally || {};
  const names = room.tbNames || {};
  const winners = order.length >= 4 ? 3 : 1;
  room.standings = order.map((id, i) => ({ id, name: names[id] || room.players.find((p) => p.id === id)?.name || "Player", w: t[id]?.w || 0, l: t[id]?.l || 0, place: i + 1, win: i < winners }));
  room.status = "done";
  room.winnerId = order[0];
  room.lastLoserId = undefined;
  const top = room.standings[0];
  if (top) setMsg(room, "contDone", { name: top.name, n: top.w }, `🏆 ${top.name} is the winner! (${top.w} ✔)`);
  broadcast(room);
  saveScores(room, room.standings.map((s) => ({ userId: s.id, name: s.name, score: s.w, result: (s.win ? "win" : "lose") as "win" | "lose" })));
  scheduleCleanup(room);
}
const TB_SECONDS = 20, TB_REVEAL_MS = 3000;
function startTiebreak(room: Room, order: string[], tied: string[], slots: number) {
  const here = new Set(room.players.map((p) => p.id));
  const present = tied.filter((id) => here.has(id)), absent = tied.filter((id) => !here.has(id));
  room.tb = { order, tied, group: present, slots, won: [], lost: absent, picks: {}, round: 1, last: null };
  // Too few of the tied players are still here to need a rematch.
  if (present.length <= slots) { room.tb.won = present; room.tb.slots -= present.length; room.tb.group = []; return tbFinish(room); }
  tbRound(room);
}
function tbRound(room: Room) {
  const tb = room.tb!;
  clearTimers(room);
  tb.picks = {};
  room.status = "playing";
  const names = tb.group.map((id) => room.tbNames?.[id] || "").join(", ");
  setMsg(room, "tbRound", { names, n: tb.slots }, `🤝 Tie! ${names} — rock, paper, scissors decides who wins`);
  room.deadline = Date.now() + TB_SECONDS * 1000 + 300;
  broadcast(room);
  room.timer = setTimeout(() => tbResolve(room), TB_SECONDS * 1000 + 300);
}
function tbPick(room: Room, uid: string, choice: string): string | null {
  const tb = room.tb;
  if (!tb) return "Not now";
  if (!tb.group.includes(uid)) return "Not now";
  if (!["rock", "paper", "scissors"].includes(choice)) return "Unknown action";
  if (tb.picks[uid]) return null;
  tb.picks[uid] = choice as Choice;
  if (tb.group.every((id) => tb.picks[id])) tbResolve(room); else broadcast(room);
  return null;
}
function tbResolve(room: Room) {
  const tb = room.tb; if (!tb) return;
  clearTimers(room);
  const signs: Choice[] = ["rock", "paper", "scissors"];
  for (const id of tb.group) if (!tb.picks[id]) tb.picks[id] = signs[Math.floor(Math.random() * 3)]; // too slow: a random sign
  const kinds = Array.from(new Set(tb.group.map((id) => tb.picks[id])));
  tb.last = { picks: { ...tb.picks } };
  if (kinds.length === 2) {
    const winning = BEATS[kinds[0]] === kinds[1] ? kinds[0] : kinds[1];
    const ahead = tb.group.filter((id) => tb.picks[id] === winning), behind = tb.group.filter((id) => tb.picks[id] !== winning);
    if (ahead.length <= tb.slots) { tb.won.push(...ahead); tb.slots -= ahead.length; tb.group = behind; }
    else { tb.lost = [...behind, ...tb.lost]; tb.group = ahead; }
    const an = ahead.map((id) => room.tbNames?.[id] || "").join(", ");
    setMsg(room, "tbAhead", { names: an }, `${an} win the rematch!`);
  } else setMsg(room, "tbDraw", undefined, "Draw — go again!");
  broadcast(room);
  room.timer = setTimeout(() => {
    if (!room.tb) return;
    if (tb.slots <= 0) { tb.lost = [...tb.group, ...tb.lost]; tb.group = []; return tbFinish(room); }
    if (tb.group.length <= tb.slots) { tb.won.push(...tb.group); tb.slots -= tb.group.length; tb.group = []; return tbFinish(room); }
    tb.round += 1;
    tbRound(room);
  }, TB_REVEAL_MS);
}
function tbFinish(room: Room) {
  const tb = room.tb!;
  if (tb.slots > 0 && tb.lost.length) { const extra = tb.lost.splice(0, tb.slots); tb.won.push(...extra); } // only players who left remain
  const set = new Set(tb.tied);
  const first = tb.order.findIndex((id) => set.has(id));
  const rest = tb.order.filter((id) => !set.has(id));
  finalizeRanking(room, [...rest.slice(0, first), ...tb.won, ...tb.group, ...tb.lost, ...rest.slice(first)]);
}
// A tied player left during the rematch.
function tbPlayerLeft(room: Room, uid: string) {
  const tb = room.tb; if (!tb) return;
  if (tb.group.includes(uid)) { tb.group = tb.group.filter((id) => id !== uid); tb.lost.push(uid); delete tb.picks[uid]; }
  if (tb.group.length <= tb.slots) { tb.won.push(...tb.group); tb.slots -= tb.group.length; tb.group = []; clearTimers(room); return tbFinish(room); }
  if (tb.group.every((id) => tb.picks[id])) return tbResolve(room);
  broadcast(room);
}
function tbView(room: Room, forUserId?: string) {
  const tb = room.tb; if (!tb) return null;
  return { group: tb.group, slots: tb.slots, round: tb.round, picked: tb.group.filter((id) => !!tb.picks[id]), myPick: forUserId ? tb.picks[forUserId] || null : null, last: tb.last, names: room.tbNames || {} };
}


// ── Tower Stack (shared tower, take turns) ───────────────────────────────
// One tower for the whole room. Players take turns dropping the sliding block;
// overhang is sliced off, and whoever misses the tower (or runs out of time)
// knocks it over and loses — everyone else wins. The block's motion is a
// deterministic back-and-forth from the server's clock so every player sees the
// same block; the dropper reports where it was when they tapped.
// 2-axis stacker: the block slides on ONE axis per level and the axis alternates
// (even height → ↔ horizontal, odd → ↕ vertical). The active axis is trimmed on
// an off-centre drop. Motion is deterministic from the server clock so everyone
// sees the same block; the dropper reports its position on that axis when tapped.
const STACK_S = 220, STACK_BASE = 120, STACK_TURN_MS = 10_000;
function stackTop(room: Room) { const t = room.stackTower || []; return t[t.length - 1]; }
function stackAxisPos(m: NonNullable<Room["stackMove"]>, now: number) {
  const span = m.axis === "x" ? STACK_S - m.w : STACK_S - m.h;
  if (span <= 0) return 0;
  const d = Math.max(0, now - m.t0) * m.speed, ph = d % (2 * span);
  const v = ph <= span ? ph : 2 * span - ph;
  return m.from ? v : span - v;
}
function armStack(room: Room) {
  clearTimers(room);
  const h = (room.stackTower?.length || 1) - 1;
  const top = stackTop(room)!;
  const axis: "x" | "y" = h % 2 === 0 ? "x" : "y";
  room.stackMove = { axis, x: top.x, y: top.y, w: top.w, h: top.h, from: true, t0: Date.now() + 700, speed: Math.min(0.36, 0.12 + h * 0.012) };
  const p = room.players[room.turnIdx ?? 0];
  room.deadline = Date.now() + STACK_TURN_MS + 700;
  setMsg(room, "stackTurn", { name: p?.name || "" }, `${p?.name}'s turn — tap to drop! 🧱`);
  broadcast(room);
  room.timer = setTimeout(() => finishStack(room, p?.id, "ran out of time"), STACK_TURN_MS + 700);
}
function startStack(room: Room) {
  room.status = "playing";
  room.stackWinners = [];
  for (const p of room.players) { p.alive = true; p.stackHeight = 0; }
  const b = (STACK_S - STACK_BASE) / 2;
  room.stackTower = [{ x: b, y: b, w: STACK_BASE, h: STACK_BASE }];
  room.turnIdx = Math.floor(Math.random() * room.players.length);
  armStack(room);
}
function finishStack(room: Room, loserId?: string, why = "missed the tower") {
  clearTimers(room);
  room.status = "done";
  room.stackMove = undefined;
  const height = (room.stackTower?.length || 1) - 1;
  const loser = room.players.find((p) => p.id === loserId);
  room.lastLoserId = loser?.id;
  const winners = room.players.filter((p) => p.id !== loser?.id);
  room.stackWinners = winners.map((p) => p.id);
  room.winnerId = winners[0]?.id;
  if (loser) setMsg(room, why === "ran out of time" ? "stackFellTime" : "stackFellMiss", { name: loser.name, h: height }, `${loser.name} ${why} — the tower fell at ${height} blocks! 💥`);
  else setMsg(room, "stackStands", { h: height }, `Tower stands at ${height} blocks!`);
  broadcast(room);
  saveScores(room, room.players.map((p) => ({ userId: p.id, name: p.name, score: height, result: (p.id === loser?.id ? "lose" : "win") as "win" | "lose" })));
  scheduleCleanup(room);
}
function stackDrop(room: Room, uid: string, reportedPos: number) {
  if (room.status !== "playing" || room.game !== "stack" || !room.stackMove) return;
  const p = room.players[room.turnIdx ?? 0];
  if (!p || p.id !== uid) return;
  const m = room.stackMove, top = stackTop(room)!;
  if (Date.now() < m.t0) return; // block hasn't started moving yet
  const span = m.axis === "x" ? STACK_S - m.w : STACK_S - m.h;
  const pos = Number.isFinite(reportedPos) ? Math.max(0, Math.min(span, reportedPos)) : stackAxisPos(m, Date.now());
  let block: { x: number; y: number; w: number; h: number; by?: string };
  if (m.axis === "x") {
    const ol = Math.max(pos, top.x), or = Math.min(pos + m.w, top.x + top.w);
    if (or - ol < 1) return finishStack(room, uid);
    block = { x: ol, y: top.y, w: or - ol, h: top.h, by: p.name };
  } else {
    const ol = Math.max(pos, top.y), or = Math.min(pos + m.h, top.y + top.h);
    if (or - ol < 1) return finishStack(room, uid);
    block = { x: top.x, y: ol, w: top.w, h: or - ol, by: p.name };
  }
  room.stackTower!.push(block);
  p.stackHeight = (p.stackHeight || 0) + 1;
  room.turnIdx = ((room.turnIdx ?? 0) + 1) % room.players.length;
  armStack(room);
}
function stackView(room: Room) {
  const t = room.stackTower || [];
  return {
    size: STACK_S,
    winners: room.stackWinners || [],
    tower: t,
    height: Math.max(0, t.length - 1),
    move: room.stackMove || null,
    turnId: room.status === "playing" ? room.players[room.turnIdx ?? 0]?.id : null,
    loserId: room.status === "done" ? room.lastLoserId || null : null,
    serverNow: Date.now(),
    heights: room.players.reduce((acc: any, p) => { acc[p.id] = { h: p.stackHeight || 0, alive: true }; return acc; }, {}),
  };
}

// Remove a player from a room; the game keeps running for whoever's left. The
// room is only torn down when the last player leaves. Host passes to another.
function removePlayer(room: Room, uid?: string) {
  if (!uid) return;
  const wasIdx = room.players.findIndex((p) => p.id === uid);
  if (wasIdx < 0) return;
  const curTurnId = room.players[room.turnIdx ?? 0]?.id;
  const leavingWasTurn = curTurnId === uid;
  // Leaving a one-round game mid-way = a loss when it ends (party games rank leavers from their tally).
  if ((room.status === "playing" || room.status === "reveal") && !CONTINUOUS.has(room.game) && room.game !== "wheel") {
    room.quitters = { ...(room.quitters || {}), [uid]: room.players[wasIdx].name };
  }
  room.players = room.players.filter((p) => p.id !== uid);
  if (!room.players.length) { clearTimers(room); for (const s of room.subs) { try { s.res.end(); } catch {} } dropRoom(room.code); return; }
  if (room.hostId === uid) room.hostId = room.players[0].id;
  // Keep the turn pointer on the same live player (or the slot the leaver held).
  if (room.turnIdx != null) {
    let idx = room.players.findIndex((p) => p.id === curTurnId);
    if (idx < 0) idx = wasIdx % room.players.length;
    room.turnIdx = idx;
  }
  if (room.tb) tbPlayerLeft(room, uid);
  else if (room.status === "playing") onPlayerLeftMidGame(room, leavingWasTurn, uid);
  else broadcast(room);
}

function onPlayerLeftMidGame(room: Room, leavingWasTurn: boolean, leftId?: string) {
  const soloWin = () => {
    // A party game down to its last player: rank everyone who played from the tally.
    if (CONTINUOUS.has(room.game) && Object.values(room.tally || {}).some((x) => x.w + x.l > 0)) return finishContinuous(room);
    clearTimers(room); room.status = "done";
    const w = room.players.find((p) => p.alive) || room.players[0];
    room.winnerId = w?.id;
    if (w) setMsg(room, "soloWin", { name: w.name }, `${w.name} wins — everyone else left! 🏆`); else setMsg(room, "allLeft", undefined, "Everyone left.");
    broadcast(room);
    if (w) saveScores(room, [{ userId: w.id, name: w.name, score: 1, result: "win" }]);
    scheduleCleanup(room);
  };
  switch (room.game) {
    case "rps": {
      if (room.players.length < 2) return soloWin();
      const alive = room.players.filter((p) => p.alive);
      if (alive.length <= 1) return resolveRps(room);
      if (alive.every((p) => p.choice)) return resolveRps(room);
      return broadcast(room);
    }
    case "timer":
      if (room.players.every((p) => p.stopMs != null)) return finishTimer(room);
      return broadcast(room);
    case "dice": {
      if (diceAlive(room).length <= 1) return soloWin();
      if (leavingWasTurn) { armDiceTimer(room); setMsg(room, "turn", { name: room.players[room.turnIdx ?? 0].name }, `${room.players[room.turnIdx ?? 0].name}'s turn`); }
      return broadcast(room);
    }
    case "draw": {
      if (room.dg && !room.players.some((p) => p.id === room.dg!.drawer)) return finishDraw(room, null, "drawDrawerLeft");
      if (room.dg && room.players.length < 2) return finishDraw(room, null, "drawAllLeft");
      return broadcast(room);
    }
    case "bridge": {
      if (room.gb && !room.players.some((p) => p.id === room.gb!.order[room.gb!.cur])) gbAdvance(room); // the walker left
      return broadcast(room);
    }
    case "memory": {
      if (room.players.length < 2) return soloWin();
      if (leavingWasTurn && room.mem) { // hand the turn on with a clean board
        room.mem.open = []; room.mem.busy = false;
        setMsg(room, "memTurn", { name: room.players[room.turnIdx ?? 0].name }, `${room.players[room.turnIdx ?? 0].name}'s turn — flip 2 cards`);
        armMem(room);
      }
      return broadcast(room);
    }
    case "rlgl": {
      if (room.rl) rlCheckEnd(room);
      return broadcast(room);
    }
    case "frog": {
      if (room.players.length < 2) return soloWin();
      if (leavingWasTurn && room.frog?.phase === "wait") frogWait(room);
      else if (room.frog?.phase === "pick" && room.players.every((p) => room.frog!.picks[p.id] !== undefined)) frogReveal(room);
      return broadcast(room);
    }
    case "poker3": {
      if (room.players.length < 2) return soloWin();
      if (room.pk) { room.pk.pot = Math.max(room.pk.pot, 1); if (leavingWasTurn) { setMsg(room, "turn", { name: room.players[room.turnIdx ?? 0].name }, `${room.players[room.turnIdx ?? 0].name}'s turn`); armPoker(room); } }
      return broadcast(room);
    }
    case "cards": {
      if (room.players.length < 2) return soloWin();
      if (leavingWasTurn) { room.phase = "draw"; room.drawnFrom = null; setMsg(room, "cardsTurnDraw", { name: room.players[room.turnIdx ?? 0].name }, `${room.players[room.turnIdx ?? 0].name}'s turn — take the discard or draw`); armCardTimer(room); }
      return broadcast(room);
    }
    case "wheel": {
      if ((room.wheelSpun || []).length >= room.players.length) { clearTimers(room); room.status = "done"; setMsg(room, "wheelAllSpun", undefined, "Everyone's spun — cheers! 🍻"); broadcast(room); scheduleCleanup(room); return; }
      if (leavingWasTurn) {
        let guard = 0;
        while ((room.wheelSpun || []).includes(room.players[room.turnIdx ?? 0].id) && guard++ < room.players.length) room.turnIdx = ((room.turnIdx ?? 0) + 1) % room.players.length;
        room.status = "playing"; room.wheelResult = null;
        setMsg(room, "wheelTurn", { name: room.players[room.turnIdx ?? 0].name }, `${room.players[room.turnIdx ?? 0].name}'s turn — spin!`);
        room.deadline = Date.now() + WHEEL_TURN_SECONDS * 1000 + 300;
        clearTimers(room);
        room.timer = setTimeout(() => wheelSpin(room, room.players[room.turnIdx ?? 0]?.id), WHEEL_TURN_SECONDS * 1000 + 300);
      }
      return broadcast(room);
    }
    case "riding": {
      if (leavingWasTurn) { room.flippedThisTurn = 0; armRidingTimer(room); ridingTurnMsg(room); }
      return broadcast(room);
    }
    case "789": {
      if (room.chooseFor && !room.players.find((p) => p.id === room.chooseFor)) { room.chooseFor = null; arm789(room); }
      else if (leavingWasTurn) arm789(room);
      setMsg(room, "turn", { name: room.players[room.turnIdx ?? 0].name }, `${room.players[room.turnIdx ?? 0].name}'s turn`);
      return broadcast(room);
    }
    case "sixcup":
      if (room.players.length < 2) return soloWin();
      scPlayerLeft(room, leavingWasTurn);
      return broadcast(room);
    case "uno":
      if (room.players.length < 2) return soloWin();
      unoPlayerLeft(room, leftId, leavingWasTurn);
      return broadcast(room);
    case "inbetween": case "updown":
      if (room.players.length < 2) return soloWin();
      cdPlayerLeft(room, leavingWasTurn);
      return broadcast(room);
    case "stack":
      if (room.players.length <= 1) return soloWin();
      if (leavingWasTurn) return armStack(room);
      return broadcast(room);
    default:
      return broadcast(room);
  }
}

// Keep a finished room around so the host can "play again"; auto-delete only
// after a long idle so abandoned rooms don't linger forever.
function scheduleCleanup(room: Room) {
  if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
  room.cleanupTimer = setTimeout(() => { clearTimers(room); for (const s of room.subs) { try { s.res.end(); } catch {} } dropRoom(room.code); }, 10 * 60_000);
}

// Recycle a finished room back to the lobby for another round.
function resetRoom(room: Room) {
  clearTimers(room);
  if (room.cleanupTimer) { clearTimeout(room.cleanupTimer); room.cleanupTimer = undefined; }
  room.status = "lobby";
  room.round = 1; room.deadline = 0; setMsg(room, "lobbyWait", undefined, "Waiting for players…");
  room.eliminatedThisRound = []; room.winnerId = undefined; room.lastLoserId = undefined;
  room.deck = undefined; room.discardTop = null; room.discardBy = null; room.turnIdx = undefined; room.phase = undefined; room.drawnFrom = null; room.cardReveal = null;
  room.bid = null; room.jokerActive = true; room.jokerReenableAt = undefined; room.diceReveal = null;
  room.wheelResult = null; room.wheelSpun = []; room.tiles = undefined; room.flippedThisTurn = 0; room.wolfCounts = {}; room.ridingReveal = false;
  room.timerStart = undefined; room.timerWinners = [];
  room.dir = 1; room.cupUnits = 1; room.lastRoll = null; room.chooseFor = null;
  room.stackWinners = []; room.stackTower = undefined; room.stackMove = undefined; room.pk = undefined; room.frog = undefined; room.rl = undefined; room.mem = undefined; room.gb = undefined; room.dg = undefined; room.cd = undefined; room.uno = undefined; room.sc = undefined; room.tally = {}; room.tallyNames = {}; room.quitters = {}; room.tb = undefined; room.standings = undefined; room.results = undefined;
  // A finished series resets the tally for a fresh one; mid-series keeps it.
  if (room.seriesChampionId) { room.seriesScore = {}; room.seriesChampionId = undefined; }
  for (const p of room.players) { p.choice = null; p.alive = true; p.taps = 0; p.hand = undefined; p.dice = undefined; p.stopMs = null; p.stackHeight = 0; }
  broadcast(room);
}

// ── Card Match (3 pairs to 10 / like faces) ─────────────────────────────
// Pairs: A+9, 2+8, 3+7, 4+6, 5+5, J+J, Q+Q, K+K. 3 matched pairs (6 cards) win.
const CARD_VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "J", "Q", "K"];
const CARD_SUITS = ["♠", "♥", "♦", "♣"];
const PARTNER: Record<string, string> = { A: "9", "9": "A", "2": "8", "8": "2", "3": "7", "7": "3", "4": "6", "6": "4", "5": "5", J: "J", Q: "Q", K: "K" };
function buildDeck(): Card[] {
  const d: Card[] = [];
  for (const v of CARD_VALUES) for (const s of CARD_SUITS) d.push({ id: `${v}${s}-${Math.random().toString(36).slice(2, 7)}`, v, s });
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}
// Can these values be split into perfect pairs? (recursive matching)
function canPairAll(vals: string[]): boolean {
  if (vals.length === 0) return true;
  const [first, ...rest] = vals;
  const need = PARTNER[first];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === need) { const remain = rest.slice(0, i).concat(rest.slice(i + 1)); if (canPairAll(remain)) return true; }
  }
  return false;
}
const hasThreePairs = (hand: Card[]) => hand.length === 6 && canPairAll(hand.map((c) => c.v));
// Would a 5-card hand complete 3 pairs if this card were added?
const completesWith = (hand5: Card[], card: Card) => hand5.length === 5 && canPairAll([...hand5.map((c) => c.v), card.v]);

function startCards(room: Room) {
  clearTimers(room);
  room.deck = buildDeck();
  const order = room.players.map((p) => p.id);
  const hostIdx = Math.floor(Math.random() * order.length);
  room.hostId = order[hostIdx]; // random host holds 6
  for (let i = 0; i < room.players.length; i++) {
    const count = room.players[i].id === room.hostId ? 6 : 5;
    room.players[i].hand = room.deck!.splice(0, count);
  }
  room.turnIdx = hostIdx;
  room.discardTop = null; room.discardBy = null; room.drawnFrom = null;
  room.status = "playing";
  const host = room.players[hostIdx];
  // Host may already have 3 pairs on the deal.
  if (hasThreePairs(host.hand!)) return cardsWin(room, host.id, "deck");
  room.phase = "discard"; // host discards to open
  setMsg(room, "cardsOpen", { name: host.name }, `${host.name}'s turn — discard a card to open`);
  armCardTimer(room);
  broadcast(room);
}

// A 5-card hand is "one card away" if 4 of its 5 cards already form 2 pairs.
function cardsOneAway(hand?: Card[]): boolean {
  if (!hand || hand.length !== 5) return false;
  for (let i = 0; i < 5; i++) { const four = hand.filter((_, j) => j !== i).map((c) => c.v); if (canPairAll(four)) return true; }
  return false;
}
function cardView(room: Room, forUserId?: string) {
  const shown = room.status === "done" || room.status === "reveal";
  return {
    deckLeft: room.deck?.length || 0,
    discardTop: room.discardTop || null,
    turnId: room.players[room.turnIdx ?? 0]?.id,
    phase: room.phase,
    reveal: room.cardReveal || null,
    hands: room.players.reduce((acc: any, p) => { acc[p.id] = (p.id === forUserId || shown) ? (p.hand || []) : (p.hand?.length || 0); return acc; }, {}),
    // public "on their last card" flag so everyone knows who's one win away
    oneAway: room.players.reduce((acc: any, p) => { acc[p.id] = cardsOneAway(p.hand); return acc; }, {}),
  };
}

function cardsWin(room: Room, winnerId: string, via: "deck" | "discard") {
  clearTimers(room);
  const winner = room.players.find((p) => p.id === winnerId)!;
  const loser = via === "discard" ? room.players.find((p) => p.id === room.discardBy) : undefined;
  if (loser && loser.id !== winnerId) room.lastLoserId = loser.id;
  // Reveal the winning hand to everyone first (don't pop the win instantly).
  room.status = "reveal";
  room.cardReveal = { winnerId, winnerName: winner.name, hand: winner.hand, via, loserId: loser?.id || null, winCard: via === "discard" ? undefined : (winner.hand || [])[winner.hand!.length - 1] };
  setMsg(room, "cardsReveal", { name: winner.name }, `${winner.name} completed 3 pairs — take a look! 🃏`);
  broadcast(room);
  room.timer = setTimeout(async () => {
    room.status = "done";
    room.winnerId = winnerId;
    const rows: { userId: string; name: string; score: number; result: "win" | "lose" }[] = [{ userId: winner.id, name: winner.name, score: 1, result: "win" }];
    if (via === "deck") {
      setMsg(room, "cardsDeckWin", { name: winner.name }, `${winner.name} drew the winning card — BIG WIN, everyone else loses! 🏆`);
      for (const p of room.players) if (p.id !== winnerId) rows.push({ userId: p.id, name: p.name, score: 0, result: "lose" });
    } else {
      if (loser) setMsg(room, "cardsDiscardWinFrom", { name: winner.name, loser: loser.name }, `${winner.name} matched ${loser.name}'s discard and wins! 🏆`);
      else setMsg(room, "cardsDiscardWin", { name: winner.name }, `${winner.name} matched the discard and wins! 🏆`);
      for (const p of room.players) if (p.id !== winnerId) rows.push({ userId: p.id, name: p.name, score: p.id === loser?.id ? 0 : 1, result: (p.id === loser?.id ? "lose" : "win") as "win" | "lose" });
    }
    broadcast(room);
    bumpSeries(room, winnerId);
    await saveScores(room, rows);
    scheduleCleanup(room);
  }, 5000);
}

function cardsTie(room: Room) {
  clearTimers(room);
  room.status = "done";
  setMsg(room, "cardsTie", undefined, "Deck ran out — it's a tie, no winner.");
  broadcast(room);
  scheduleCleanup(room);
}

const CARD_TURN_SECONDS = 20;
// Arm the 10s turn clock; if the player doesn't act it auto-plays for them.
function armCardTimer(room: Room) {
  clearTimers(room);
  room.deadline = Date.now() + CARD_TURN_SECONDS * 1000 + 300;
  room.timer = setTimeout(() => autoPlayCards(room), CARD_TURN_SECONDS * 1000 + 300);
}
// Timeout fallback — random pick/discard so the game never stalls.
function autoPlayCards(room: Room) {
  if (room.status !== "playing" || room.game !== "cards") return;
  const p = room.players[room.turnIdx ?? 0];
  if (!p) return;
  if (room.phase === "draw") {
    if (room.deck!.length) { p.hand!.push(room.deck!.shift()!); room.drawnFrom = "deck"; }
    else if (room.discardTop) { p.hand!.push(room.discardTop); room.drawnFrom = "discard"; room.discardTop = null; }
    else return cardsTie(room);
    if (hasThreePairs(p.hand!)) return void cardsWin(room, p.id, room.drawnFrom === "deck" ? "deck" : "discard");
    room.phase = "discard";
  }
  // Discard a random card and pass on.
  const rIdx = Math.floor(Math.random() * p.hand!.length);
  const [card] = p.hand!.splice(rIdx, 1);
  room.discardTop = card; room.discardBy = p.id;
  setMsg(room, "cardsAuto", { name: p.name }, `${p.name} ran out of time — auto-discarded`);
  nextCardTurn(room);
}

function nextCardTurn(room: Room) {
  // After a discard, check every OTHER player for an instant claim win.
  const claimant = room.players.find((p) => p.id !== room.discardBy && completesWith(p.hand!, room.discardTop!));
  if (claimant) { claimant.hand!.push(room.discardTop!); room.discardTop = null; return cardsWin(room, claimant.id, "discard"); }
  // Advance to next player, who must draw.
  room.turnIdx = ((room.turnIdx ?? 0) + 1) % room.players.length;
  room.phase = "draw"; room.drawnFrom = null;
  if (!room.deck!.length && !room.discardTop) return cardsTie(room);
  setMsg(room, "cardsTurnDraw", { name: room.players[room.turnIdx].name }, `${room.players[room.turnIdx].name}'s turn — take the discard or draw`);
  armCardTimer(room);
  broadcast(room);
}

function cardAction(room: Room, uid: string, body: any): { error?: string } {
  const idx = room.players.findIndex((p) => p.id === uid);
  if (idx !== room.turnIdx) return { error: "Not your turn" };
  const p = room.players[idx];
  const act = body?.act;
  if (room.phase === "draw") {
    if (act === "take") {
      if (!room.discardTop) return { error: "No discard to take" };
      p.hand!.push(room.discardTop); room.drawnFrom = "discard"; room.discardTop = null;
    } else if (act === "drawDeck") {
      if (!room.deck!.length) { if (!room.discardTop) { cardsTie(room); return {}; } return { error: "Deck empty — take the discard" }; }
      p.hand!.push(room.deck!.shift()!); room.drawnFrom = "deck";
    } else return { error: "Choose take or draw" };
    // Completed on pickup?
    if (hasThreePairs(p.hand!)) { cardsWin(room, p.id, room.drawnFrom === "deck" ? "deck" : "discard"); return {}; }
    room.phase = "discard";
    setMsg(room, "cardsDiscard", { name: p.name }, `${p.name} — discard a card`);
    armCardTimer(room);
    broadcast(room);
    return {};
  }
  if (room.phase === "discard") {
    const cardId = body?.cardId;
    const ci = p.hand!.findIndex((c) => c.id === cardId);
    if (ci < 0) return { error: "Pick a card to discard" };
    if (p.hand!.length < 6) return { error: "Draw first" };
    const [card] = p.hand!.splice(ci, 1);
    room.discardTop = card; room.discardBy = p.id;
    nextCardTurn(room);
    return {};
  }
  return { error: "Not now" };
}

// ── Liar's Dice (Perudo-style) ──────────────────────────────────────────
const DICE_PER_PLAYER = 5;
const DICE_TURN_SECONDS = 20;
const diceAlive = (room: Room) => room.players.filter((p) => p.alive);
const minOpenBid = (room: Room) => 1 + diceAlive(room).length;
const rollDie = () => 1 + Math.floor(Math.random() * 6);

function rollAllDice(room: Room) {
  for (const p of room.players) p.dice = p.alive ? Array.from({ length: DICE_PER_PLAYER }, rollDie) : [];
}
// Count of a face across all alive dice (1s are wild when jokerActive & face!=1).
function countFace(room: Room, face: number): number {
  let n = 0;
  for (const p of diceAlive(room)) for (const d of p.dice || []) {
    if (d === face) n++;
    else if (face !== 1 && d === 1 && room.jokerActive) n++;
  }
  return n;
}
function armDiceTimer(room: Room) {
  clearTimers(room);
  room.deadline = Date.now() + DICE_TURN_SECONDS * 1000 + 300;
  room.timer = setTimeout(() => diceTimeout(room), DICE_TURN_SECONDS * 1000 + 300);
}
// Ran out of time on your turn → you lose. The standing bidder wins.
function diceTimeout(room: Room) {
  if (room.status !== "playing" || room.game !== "dice") return;
  clearTimers(room);
  const p = room.players[room.turnIdx ?? 0];
  if (!p) return;
  const loserId = p.id;
  const winnerId = room.bid?.by; // whoever's bid was standing
  const handsSnapshot = room.players.filter((x) => x.dice && x.dice.length).map((x) => ({ id: x.id, name: x.name, dice: x.dice }));
  p.alive = false;
  room.lastLoserId = loserId;
  room.diceReveal = { timeout: true, bid: room.bid || null, loserId, hands: handsSnapshot };
  room.status = "reveal";
  setMsg(room, "diceTimeout", { name: p.name }, `${p.name} ran out of time — LOSES! 🍻`);
  broadcast(room);
  room.timer = setTimeout(() => {
    room.status = "done";
    room.winnerId = winnerId;
    const winner = room.players.find((x) => x.id === winnerId);
    if (winner) setMsg(room, "diceTimeoutDoneW", { name: p.name, winner: winner.name }, `${p.name} ran out of time and loses! 🍻  ${winner.name} wins 🏆`);
    else setMsg(room, "diceTimeoutDone", { name: p.name }, `${p.name} ran out of time and loses! 🍻`);
    broadcast(room);
    bumpSeries(room, winnerId);
    const rows = room.players.map((x) => ({ userId: x.id, name: x.name, score: x.id === loserId ? 0 : 1, result: (x.id === loserId ? "lose" : "win") as "win" | "lose" }));
    if (!rows.some((r) => r.userId === loserId)) rows.push({ userId: loserId, name: p.name, score: 0, result: "lose" });
    saveScores(room, rows);
    scheduleCleanup(room);
  }, 5000);
}
function startDiceRound(room: Room, starterId?: string) {
  clearTimers(room);
  rollAllDice(room);
  room.bid = null; room.jokerActive = true; room.jokerReenableAt = undefined; room.diceReveal = null;
  const alive = diceAlive(room);
  let idx = starterId ? room.players.findIndex((p) => p.id === starterId && p.alive) : -1;
  if (idx < 0) idx = room.players.indexOf(alive[Math.floor(Math.random() * alive.length)]);
  room.turnIdx = idx;
  room.status = "playing";
  setMsg(room, "diceOpen", { name: room.players[idx].name, n: minOpenBid(room) }, `${room.players[idx].name} opens — bid at least ${minOpenBid(room)} dice`);
  armDiceTimer(room);
  broadcast(room);
}
function nextAliveIdx(room: Room, from: number): number {
  for (let i = 1; i <= room.players.length; i++) { const j = (from + i) % room.players.length; if (room.players[j].alive) return j; }
  return from;
}
// Validate + apply a bid. Returns error string or "".
function applyDiceBid(room: Room, uid: string, face: number, qty: number, strike: boolean): string | Tri {
  const idx = room.players.findIndex((p) => p.id === uid);
  if (idx !== room.turnIdx) return "Not your turn";
  face = Math.max(1, Math.min(6, Math.floor(face))); qty = Math.floor(qty);
  if (!room.bid) { if (qty < minOpenBid(room)) return { en: `Opening bid must be at least ${minOpenBid(room)} dice`, zh: `开局叫数至少 ${minOpenBid(room)} 颗骰子`, id: `Tawaran pembuka minimal ${minOpenBid(room)} dadu` }; }
  else { if (!(qty > room.bid.qty || (qty === room.bid.qty && face > room.bid.face))) { const q = room.bid.qty, f = room.bid.face === 1 ? "①" : room.bid.face; return { en: `Too low! The call is ${q} × ${f}. You must raise the number, or bid more total dice (above ${q}).`, zh: `太低了！当前叫数是 ${q} × ${f}。你必须叫更大的点数，或叫更多骰子（超过 ${q} 颗）。`, id: `Terlalu rendah! Tawaran sekarang ${q} × ${f}. Naikkan angkanya, atau tawar lebih banyak dadu (di atas ${q}).` }; } }
  // Re-enable joker if this bid reaches the threshold, THEN a 1s-bid or strike disables it.
  if (!room.jokerActive && room.jokerReenableAt && qty >= room.jokerReenableAt) { room.jokerActive = true; room.jokerReenableAt = undefined; }
  if (face === 1 || strike) { room.jokerActive = false; room.jokerReenableAt = Math.floor(qty * 1.5) + 1; }
  room.bid = { face, qty, by: uid, strike };
  room.turnIdx = nextAliveIdx(room, idx);
  setMsg(room, strike ? "diceBidStrike" : "diceBid", { name: room.players[idx].name, qty, face: face === 1 ? { k: "diceOnes" } : face, next: room.players[room.turnIdx].name }, `${room.players[idx].name} bid ${qty}× ${face === 1 ? "①(ones)" : face}${strike ? " · strike" : ""} — ${room.players[room.turnIdx].name}'s turn`);
  armDiceTimer(room);
  broadcast(room);
  return "";
}
function resolveDiceCatch(room: Room, challengerId: string) {
  if (!room.bid) return;
  clearTimers(room);
  const bid = room.bid;
  const actual = countFace(room, bid.face);
  const lie = actual < bid.qty;
  const loserId = lie ? bid.by : challengerId;
  const loser = room.players.find((p) => p.id === loserId);
  const challenger = room.players.find((p) => p.id === challengerId);
  room.diceReveal = {
    bid, actual, jokerActive: room.jokerActive, loserId,
    challengerName: challenger?.name,
    hands: diceAlive(room).map((p) => ({ id: p.id, name: p.name, dice: p.dice })),
    verdict: lie ? "lie" : "true",
  };
  room.lastLoserId = loserId;
  const winnerId = lie ? challengerId : bid.by; // the one who was right
  const winner = room.players.find((p) => p.id === winnerId);
  room.status = "reveal";
  if (lie) setMsg(room, "diceLie", { n: actual, face: bid.face, name: loser?.name || "" }, `Caught the bluff! Only ${actual}× ${bid.face} — ${loser?.name} LOSES! 💀`);
  else setMsg(room, "diceTrue", { n: actual, face: bid.face, name: loser?.name || "" }, `There were ${actual}× ${bid.face} — ${loser?.name} caught wrong and LOSES! 💀`);
  broadcast(room);
  // Game ends on the first loss.
  room.timer = setTimeout(() => {
    room.status = "done";
    room.winnerId = winnerId;
    if (winner) setMsg(room, "diceDoneW", { name: loser?.name || "", winner: winner.name }, `${loser?.name} loses! 🍻  ${winner.name} called it right 🏆`);
    else setMsg(room, "diceDone", { name: loser?.name || "" }, `${loser?.name} loses! 🍻`);
    broadcast(room);
    bumpSeries(room, winnerId);
    // The loser loses; everyone else wins.
    const rows = room.players.map((x) => ({ userId: x.id, name: x.name, score: x.id === loser?.id ? 0 : 1, result: (x.id === loser?.id ? "lose" : "win") as "win" | "lose" }));
    saveScores(room, rows);
    scheduleCleanup(room);
  }, 5000);
}
function diceView(room: Room, forUserId?: string) {
  const done = room.status === "done" || room.status === "reveal";
  return {
    bid: room.bid || null,
    jokerActive: room.jokerActive !== false,
    minOpen: minOpenBid(room),
    turnId: room.players[room.turnIdx ?? 0]?.id,
    totalDice: diceAlive(room).reduce((s, p) => s + (p.dice?.length || 0), 0),
    reveal: room.diceReveal || null,
    dice: room.players.reduce((acc: any, p) => { acc[p.id] = (p.id === forUserId || done) ? (p.dice || []) : (p.alive ? (p.dice?.length || 0) : 0); return acc; }, {}),
  };
}

// ── Spin the Wheel (random punishment) ──────────────────────────────────
// Every slice is equally likely. 7 drink slices (4× half, 2× 1 cup, 1× 2 cups)
// with a PASS slice between each one — half the wheel lets you off the hook.
const WHEEL_PASS = { label: "PASS", cups: 0, w: 1, emoji: "😎", pass: true };
const withPasses = (drinks: { label: string; cups?: number; w: number; emoji?: string }[]) => drinks.flatMap((d) => [{ ...d, w: 1 }, WHEEL_PASS]);
const HALF = { label: "½ cup", cups: 0.5, w: 1, emoji: "🥤" }, ONE = { label: "1 cup", cups: 1, w: 1, emoji: "🍺" }, TWO = { label: "2 cups", cups: 2, w: 1, emoji: "🍺🍺" };
const WHEEL_PRIZES = withPasses([HALF, ONE, HALF, TWO, HALF, ONE, HALF]);
const WHEEL_TURN_SECONDS = 20;
const wheelPrizesOf = (room: Room) => (room.wheelPrizes && room.wheelPrizes.length ? withPasses(room.wheelPrizes) : WHEEL_PRIZES);
function startWheel(room: Room) {
  clearTimers(room);
  room.wheelSpun = []; room.wheelResult = null;
  room.turnIdx = Math.floor(Math.random() * room.players.length);
  room.status = "playing";
  setMsg(room, "wheelStart", { name: room.players[room.turnIdx].name }, `${room.players[room.turnIdx].name}'s turn — spin the wheel!`);
  room.deadline = Date.now() + WHEEL_TURN_SECONDS * 1000 + 300;
  room.timer = setTimeout(() => wheelSpin(room, room.players[room.turnIdx ?? 0]?.id), WHEEL_TURN_SECONDS * 1000 + 300);
  broadcast(room);
}
function wheelSpin(room: Room, uid: string) {
  if (room.status !== "playing" || room.game !== "wheel") return;
  const idx = room.players.findIndex((p) => p.id === uid);
  if (idx !== room.turnIdx) return;
  clearTimers(room);
  const PRIZES = wheelPrizesOf(room);
  const total = PRIZES.reduce((s, p) => s + p.w, 0);
  let r = Math.random() * total, pi = 0;
  for (let i = 0; i < PRIZES.length; i++) { r -= PRIZES[i].w; if (r <= 0) { pi = i; break; } }
  const prize = PRIZES[pi];
  const p = room.players[idx];
  room.wheelSpun = Array.from(new Set([...(room.wheelSpun || []), uid]));
  const pass = !!(prize as any).pass;
  room.wheelResult = { playerId: uid, name: p.name, index: pi, label: prize.label, cups: prize.cups, emoji: prize.emoji, pass };
  room.status = "reveal";
  if (pass) setMsg(room, "wheelPass", { name: p.name, emoji: prize.emoji || "" }, `${p.name} hit PASS — no drink! ${prize.emoji}`);
  else setMsg(room, "wheelDrink", { name: p.name, prize: WHEEL_LABEL_KEY[prize.label] || prize.label, emoji: prize.emoji || "" }, `${p.name} must drink ${prize.label}! ${prize.emoji}`);
  broadcast(room);
  room.timer = setTimeout(() => {
    if ((room.wheelSpun || []).length >= room.players.length) {
      room.status = "done"; setMsg(room, "wheelAllSpun", undefined, "Everyone's spun — cheers! 🍻"); broadcast(room); scheduleCleanup(room);
    } else {
      room.turnIdx = nextAliveIdx(room, room.turnIdx ?? 0);
      // skip players who already spun
      let guard = 0;
      while ((room.wheelSpun || []).includes(room.players[room.turnIdx].id) && guard++ < room.players.length) room.turnIdx = (room.turnIdx + 1) % room.players.length;
      room.status = "playing"; room.wheelResult = null;
      setMsg(room, "wheelTurn", { name: room.players[room.turnIdx].name }, `${room.players[room.turnIdx].name}'s turn — spin!`);
      room.deadline = Date.now() + WHEEL_TURN_SECONDS * 1000 + 300;
      room.timer = setTimeout(() => wheelSpin(room, room.players[room.turnIdx ?? 0]?.id), WHEEL_TURN_SECONDS * 1000 + 300);
      broadcast(room);
    }
  }, 4500);
}
function wheelView(room: Room) {
  return { prizes: wheelPrizesOf(room), result: room.wheelResult || null, turnId: room.players[room.turnIdx ?? 0]?.id, spun: room.wheelSpun || [] };
}

// ── Red Riding Hood (flip grandma faces, avoid the laughing one; wolves = drink double) ──
const RIDING_TURN_SECONDS = 20;
function ridingTurnMsg(room: Room) {
  const name = room.players[room.turnIdx ?? 0].name, n = room.ridingClicks || 1;
  setMsg(room, n > 1 ? "ridingTurnN" : "ridingTurn1", { name, n }, `${name}, tap ${room.ridingClicks} granny${n > 1 ? "s" : ""}!`);
}
function startRiding(room: Room) {
  clearTimers(room);
  const n = Math.max(9, Math.min(36, room.facesCount || 16));
  // Every tile looks like a granny. Some are wolves in disguise (lose, drink 1),
  // and 1 is a witch (lose, drink double). The rest are real grannies (safe).
  // Sparse bombs so the game lasts longer before someone loses.
  const wolves = Math.max(1, Math.round(n / 16));
  const kinds: ("grandma" | "wolf" | "witch")[] = ["witch"];
  for (let i = 0; i < wolves; i++) kinds.push("wolf");
  while (kinds.length < n) kinds.push("grandma");
  for (let i = kinds.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
  room.tiles = kinds.map((k, i) => ({ id: i, kind: k, flipped: false }));
  room.wolfCounts = {}; room.flippedThisTurn = 0; room.ridingReveal = false;
  room.turnIdx = Math.floor(Math.random() * room.players.length);
  room.status = "playing";
  ridingTurnMsg(room);
  armRidingTimer(room);
  broadcast(room);
}
function armRidingTimer(room: Room) {
  clearTimers(room);
  room.deadline = Date.now() + RIDING_TURN_SECONDS * 1000 + 300;
  room.timer = setTimeout(() => ridingTimeout(room), RIDING_TURN_SECONDS * 1000 + 300);
}
function ridingTimeout(room: Room) {
  if (room.status !== "playing" || room.game !== "riding") return;
  // Auto-flip random remaining tiles for the current player.
  const uid = room.players[room.turnIdx ?? 0]?.id; if (!uid) return;
  const need = (room.ridingClicks || 1) - (room.flippedThisTurn || 0);
  const free = room.tiles!.filter((t) => !t.flipped);
  for (let i = 0; i < need && free.length; i++) {
    const t = free.splice(Math.floor(Math.random() * free.length), 1)[0];
    if (ridingFlip(room, uid, t.id, true)) return; // ended on laughing
  }
}
// returns true if the game ended
function ridingFlip(room: Room, uid: string, tileId: number, auto = false): boolean {
  const idx = room.players.findIndex((p) => p.id === uid);
  if (idx !== room.turnIdx) return false;
  const t = room.tiles!.find((x) => x.id === tileId);
  if (!t || t.flipped) return false;
  t.flipped = true; t.by = uid;
  const p = room.players[idx];
  // Wolf (disguised granny) → lose, drink 1. Witch → lose, drink double. Both end the game.
  if (t.kind === "wolf" || t.kind === "witch") {
    clearTimers(room);
    room.lastLoserId = uid;
    room.ridingReveal = true;
    room.status = "reveal";
    if (t.kind === "witch") setMsg(room, "ridingWitch", { name: p.name }, `🧙 It's the WITCH! ${p.name} loses — drink DOUBLE! 🍻🍻`);
    else setMsg(room, "ridingWolf", { name: p.name }, `🐺 A WOLF in granny's clothes! ${p.name} loses — drink 1 cup! 🍻`);
    broadcast(room);
    room.timer = setTimeout(async () => {
      room.status = "done"; setMsg(room, "ridingLoses", { name: p.name }, `${p.name} loses!`);
      broadcast(room);
      await saveScores(room, room.players.map((x) => ({ userId: x.id, name: x.name, score: x.id === uid ? 0 : 1, result: (x.id === uid ? "lose" : "win") as "win" | "lose" })));
      scheduleCleanup(room);
    }, 4500);
    return true;
  }
  // Safe granny — keep going until you've tapped your quota.
  room.flippedThisTurn = (room.flippedThisTurn || 0) + 1;
  if ((room.flippedThisTurn || 0) >= (room.ridingClicks || 1) || room.tiles!.every((x) => x.flipped)) {
    room.flippedThisTurn = 0;
    room.turnIdx = nextAliveIdx(room, idx);
    ridingTurnMsg(room);
    armRidingTimer(room);
  }
  broadcast(room);
  return false;
}
function ridingView(room: Room) {
  return {
    clicks: room.ridingClicks || 1,
    flippedThisTurn: room.flippedThisTurn || 0,
    turnId: room.players[room.turnIdx ?? 0]?.id,
    wolfCounts: room.wolfCounts || {},
    tiles: (room.tiles || []).map((t) => ({ id: t.id, flipped: t.flipped, by: t.by, kind: t.flipped || room.ridingReveal ? t.kind : undefined })),
  };
}

// ── 3-Card Poker (blind drinking poker) ──────────────────────────────────
// Everyone gets 3 face-down cards and plays BLIND (can't see them). Drinks are
// counted in half-cups. The pot starts at ½ cup per player and the stake at ½.
// On your turn, blind: Call (add the stake), Raise (+½ to the stake, then add),
// or Look at your cards. Once you've looked you're SEEN and pay double: Follow
// (add 2× stake) forces a showdown — everyone opens and the WORST hand drinks
// the whole pot — or Fold, which means you drink the whole pot yourself.
// Ranks: Straight flush > Trail (AAA best) > Flush > Straight > Pair > High card.
// Host sets the minimum (starting stake, per player) and maximum (pot cap) cups.
type PkCard = { r: number; s: string };
const PK_SUITS = ["♠", "♥", "♦", "♣"];
const PK_TURN_SECONDS = 30;
const PK_POT_CAP = 20; // default cap: 10 cups → automatic showdown so an all-blind table can't loop forever
const pkCap = (room: Room) => room.pkMax || PK_POT_CAP;
const PK_CATS = ["High card", "Pair", "Straight", "Flush", "Trail", "Straight flush"];
function pkScore(h: PkCard[]): { score: number; cat: string } {
  const r = h.map((c) => c.r).sort((a, b) => b - a);
  const flush = h.every((c) => c.s === h[0].s);
  const isA23 = r[0] === 14 && r[1] === 3 && r[2] === 2;
  const straight = (r[0] - r[1] === 1 && r[1] - r[2] === 1) || isA23;
  const hi = isA23 ? 3 : r[0];
  let cat = 0, tb = [r[0], r[1], r[2]];
  if (straight && flush) { cat = 5; tb = [hi, 0, 0]; }
  else if (r[0] === r[1] && r[1] === r[2]) cat = 4;
  else if (flush) cat = 3;
  else if (straight) { cat = 2; tb = [hi, 0, 0]; }
  else if (r[0] === r[1] || r[1] === r[2]) { cat = 1; const pr = r[1], k = r[0] === r[1] ? r[2] : r[0]; tb = [pr, k, 0]; }
  return { score: cat * 1e6 + tb[0] * 1e4 + tb[1] * 100 + tb[2], cat: PK_CATS[cat] };
}
const pkLabel = (c: PkCard) => `${({ 11: "J", 12: "Q", 13: "K", 14: "A" } as any)[c.r] || c.r}${c.s}`;
function armPoker(room: Room) {
  clearTimers(room);
  room.deadline = Date.now() + PK_TURN_SECONDS * 1000 + 300;
  room.timer = setTimeout(() => {
    const p = room.players[room.turnIdx ?? 0]; if (!p || room.status !== "playing") return;
    // Out of time: blind players auto-call; seen players didn't dare → fold.
    pokerAction(room, p.id, room.pk?.seen[p.id] ? "fold" : "call");
  }, PK_TURN_SECONDS * 1000 + 300);
}
function startPoker(room: Room) {
  clearTimers(room);
  const deck: PkCard[] = [];
  for (let r = 2; r <= 14; r++) for (const s of PK_SUITS) deck.push({ r, s });
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  const hands: Record<string, PkCard[]> = {}, seen: Record<string, boolean> = {};
  for (const p of room.players) { hands[p.id] = deck.splice(0, 3); seen[p.id] = false; p.alive = true; }
  const min = room.pkMin || 1;
  room.pk = { hands, seen, stake: min, pot: room.players.length * min, reveal: null };
  room.status = "playing";
  room.turnIdx = Math.floor(Math.random() * room.players.length);
  setMsg(room, "pkStart", { name: room.players[room.turnIdx].name, cups: cupsMsg(min) }, `Cards dealt face-down 🂠 — ${room.players[room.turnIdx].name} starts. Everyone's in for ${cupsText(min)}.`);
  armPoker(room); broadcast(room);
}
const cupsText = (u: number) => (u % 2 ? (u === 1 ? "½" : `${Math.floor(u / 2)}½`) : `${u / 2}`) + (u <= 2 ? " cup" : " cups");
function finishPoker(room: Room, loserIds: string[], why: string, whyMsg: Msg) {
  clearTimers(room);
  const pk = room.pk!;
  pk.pot = Math.min(pk.pot, pkCap(room)); // never more than the host's max
  room.status = "done";
  room.lastLoserId = loserIds[0];
  const winners = room.players.filter((p) => !loserIds.includes(p.id));
  room.winnerId = winners[0]?.id;
  const results = room.players.map((p) => { const sc = pkScore(pk.hands[p.id]); return { id: p.id, name: p.name, cards: pk.hands[p.id], cat: sc.cat, score: sc.score, loser: loserIds.includes(p.id) }; })
    .sort((a, b) => b.score - a.score);
  pk.reveal = { results, why, pot: pk.pot };
  const names = room.players.filter((p) => loserIds.includes(p.id)).map((p) => p.name).join(" & ");
  setMsg(room, loserIds.length > 1 ? "pkFinishN" : "pkFinish1", { why: whyMsg, names, cups: cupsMsg(pk.pot) }, `${why} — ${names} drink${loserIds.length > 1 ? "" : "s"} the whole pot: ${cupsText(pk.pot)} 🍻`);
  broadcast(room);
  saveScores(room, room.players.map((p) => ({ userId: p.id, name: p.name, score: loserIds.includes(p.id) ? 0 : 1, result: (loserIds.includes(p.id) ? "lose" : "win") as "win" | "lose" })));
  scheduleCleanup(room);
}
function pokerShowdown(room: Room, why: string, whyMsg: Msg) {
  const pk = room.pk!;
  const scores = room.players.map((p) => ({ id: p.id, score: pkScore(pk.hands[p.id]).score }));
  const low = Math.min(...scores.map((x) => x.score));
  finishPoker(room, scores.filter((x) => x.score === low).map((x) => x.id), why, whyMsg);
}
function pokerAction(room: Room, uid: string, act: string) {
  if (room.status !== "playing" || room.game !== "poker3" || !room.pk) return "Not playing";
  const pk = room.pk, idx = room.players.findIndex((p) => p.id === uid);
  if (idx < 0) return "Not in this room";
  if (act === "look") { pk.seen[uid] = true; broadcast(room); return ""; } // looking is allowed any time
  if (idx !== room.turnIdx) return "Not your turn";
  const p = room.players[idx], seen = !!pk.seen[uid];
  const advance = (msg: string, mm: Msg) => {
    pk.lastBy = uid;
    if (pk.pot >= pkCap(room)) return pokerShowdown(room, `The pot hit the ${cupsText(pkCap(room))} max — everybody opens`, { k: "pkPotMax", v: { cups: cupsMsg(pkCap(room)) } });
    room.turnIdx = (idx + 1) % room.players.length;
    const n = room.players[room.turnIdx];
    setMsg(room, pk.seen[n.id] ? "pkNextSeen" : "pkNext", { msg: mm, name: n.name }, `${msg} · ${n.name}'s turn${pk.seen[n.id] ? " (seen — pays double)" : ""}`);
    armPoker(room); broadcast(room);
  };
  if (!seen && act === "call") { pk.pot += pk.stake; advance(`${p.name} stays blind and calls ${cupsText(pk.stake)}`, { k: "pkCall", v: { name: p.name, cups: cupsMsg(pk.stake) } }); return ""; }
  if (!seen && act === "raise") { pk.stake += 1; pk.pot += pk.stake; advance(`${p.name} raises blind to ${cupsText(pk.stake)} 😈`, { k: "pkRaise", v: { name: p.name, cups: cupsMsg(pk.stake) } }); return ""; }
  if (seen && act === "follow") { pk.pot += pk.stake * 2; pokerShowdown(room, `${p.name} looked and dared to follow (double ${cupsText(pk.stake * 2)}) — cards open!`, { k: "pkFollow", v: { name: p.name, cups: cupsMsg(pk.stake * 2) } }); return ""; }
  if (seen && act === "fold") { finishPoker(room, [uid], `${p.name} looked and didn't dare 😱`, { k: "pkFold", v: { name: p.name } }); return ""; }
  return seen ? "You've seen your cards — follow (double) or fold" : "Call, raise or look";
}
function pokerView(room: Room, forUserId?: string) {
  const pk = room.pk;
  if (!pk) return null;
  const done = room.status === "done";
  const mine = forUserId ? pk.hands[forUserId] : undefined;
  return {
    turnId: room.status === "playing" ? room.players[room.turnIdx ?? 0]?.id : null,
    stake: pk.stake, pot: pk.pot, cap: pkCap(room), min: room.pkMin || 1,
    seen: pk.seen,
    myCards: mine && (pk.seen[forUserId!] || done) ? mine.map((c) => ({ ...c, label: pkLabel(c) })) : null,
    myHand: mine && (pk.seen[forUserId!] || done) ? pkScore(mine).cat : null,
    reveal: done ? pk.reveal : null,
  };
}

// ── Glass Bridge ─────────────────────────────────────────────────────────
// 10 rows of glass, each with a LEFT and RIGHT panel — one is tempered (safe),
// the other shatters. Players cross one at a time in a random order. On an
// unknown row the walker taps left or right: safe → step forward; wrong → the
// glass breaks, they fall (out, drink 1 cup) and that row is now known to
// everyone. Rows already known are walked automatically. Everyone who reaches
// the end wins; if nobody makes it, nobody wins.
const GB_ROWS = 10, GB_TURN_SECONDS = 15, GB_PAUSE_MS = 1600;
function armGb(room: Room) {
  clearTimers(room);
  const g = room.gb!;
  const id = g.order[g.cur];
  room.deadline = Date.now() + GB_TURN_SECONDS * 1000;
  room.timer = setTimeout(() => gbStep(room, id, Math.random() < 0.5 ? 0 : 1, true), GB_TURN_SECONDS * 1000);
}
function gbName(room: Room, id: string) { return room.players.find((p) => p.id === id)?.name || "Player"; }
// Put the current walker on the first row nobody knows yet (known rows are free).
function gbAdvance(room: Room) {
  const g = room.gb!;
  while (g.cur < g.order.length && !room.players.some((p) => p.id === g.order[g.cur])) g.cur++; // skip leavers
  if (g.cur >= g.order.length) return finishBridge(room);
  const id = g.order[g.cur];
  g.pos = 0;
  while (g.pos < GB_ROWS && g.known[g.pos] !== null) g.pos++;
  if (g.pos >= GB_ROWS) { // the whole path is known — walk straight across
    g.done.push(id);
    g.last = { id, crossed: true, free: true };
    setMsg(room, "gbFree", { name: gbName(room, id) }, `🌉 ${gbName(room, id)} walks the known path and crosses safely!`);
    g.cur++; broadcast(room);
    clearTimers(room); room.timer = setTimeout(() => gbAdvance(room), GB_PAUSE_MS);
    return;
  }
  setMsg(room, "gbTurn", { name: gbName(room, id), n: g.pos + 1 }, `${gbName(room, id)}'s turn — row ${g.pos + 1}: LEFT or RIGHT?`);
  armGb(room); broadcast(room);
}
function startBridge(room: Room) {
  const order = room.players.map((p) => p.id);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  room.gb = { safe: Array.from({ length: GB_ROWS }, () => (Math.random() < 0.5 ? 0 : 1)), known: Array(GB_ROWS).fill(null), broken: Array(GB_ROWS).fill(null), order, cur: 0, pos: 0, done: [], fell: [] };
  room.status = "playing";
  gbAdvance(room);
}
function gbStep(room: Room, uid: string, side: number, auto = false): string {
  const g = room.gb;
  if (room.status !== "playing" || !g) return "Not playing";
  if (g.order[g.cur] !== uid) return "Not your turn";
  if (side !== 0 && side !== 1) return "Pick left or right";
  clearTimers(room);
  const row = g.pos;
  g.known[row] = g.safe[row];
  if (side === g.safe[row]) {
    g.pos++;
    while (g.pos < GB_ROWS && g.known[g.pos] !== null) g.pos++;
    if (g.pos >= GB_ROWS) {
      g.done.push(uid); g.last = { id: uid, crossed: true, row };
      setMsg(room, "gbAcross", { name: gbName(room, uid) }, `🎉 ${gbName(room, uid)} made it across the bridge!`);
      g.cur++; broadcast(room);
      room.timer = setTimeout(() => gbAdvance(room), GB_PAUSE_MS);
      return "";
    }
    g.last = { id: uid, safe: true, row, side };
    setMsg(room, auto ? "gbSafeAuto" : "gbSafe", { name: gbName(room, uid), side: { k: side ? "right" : "left" }, n: g.pos + 1 }, `✅ ${gbName(room, uid)} stepped ${side ? "RIGHT" : "LEFT"} — safe! Row ${g.pos + 1} next${auto ? " (time ran out — random step)" : ""}`);
    armGb(room); broadcast(room);
    return "";
  }
  g.broken[row] = side; g.fell.push(uid);
  g.last = { id: uid, fell: true, row, side };
  setMsg(room, auto ? "gbFellAuto" : "gbFell", { name: gbName(room, uid), n: row + 1 }, `💥 The glass shattered! ${gbName(room, uid)} fell at row ${row + 1} — drink 1 cup 🍺${auto ? " (time ran out)" : ""}`);
  g.cur++; broadcast(room);
  room.timer = setTimeout(() => gbAdvance(room), GB_PAUSE_MS + 400);
  return "";
}
function finishBridge(room: Room) {
  clearTimers(room);
  const g = room.gb!;
  room.status = "done";
  const winners = room.players.filter((p) => g.done.includes(p.id));
  const losers = room.players.filter((p) => !g.done.includes(p.id));
  room.winnerId = winners[0]?.id; room.lastLoserId = losers[0]?.id;
  const wn = winners.map((p) => p.name).join(", "), ln = losers.map((p) => p.name).join(", ");
  if (!winners.length) setMsg(room, "gbNone", undefined, "Nobody made it across — no winners! Everyone drinks 🍺");
  else if (losers.length) setMsg(room, "gbDoneFell", { names: wn, fell: ln }, `🌉 ${wn} crossed! ${ln} fell — drink 1 cup each 🍺`);
  else setMsg(room, "gbDoneAll", { names: wn }, `🌉 ${wn} crossed! Nobody fell!`);
  broadcast(room);
  saveScores(room, room.players.map((p) => ({ userId: p.id, name: p.name, score: g.done.includes(p.id) ? GB_ROWS : 0, result: (g.done.includes(p.id) ? "win" : "lose") as "win" | "lose" })));
  scheduleCleanup(room);
}
function gbView(room: Room) {
  const g = room.gb;
  if (!g) return null;
  return {
    rows: GB_ROWS, known: g.known, broken: g.broken, order: g.order, cur: g.cur, pos: g.pos,
    turnId: room.status === "playing" ? g.order[g.cur] || null : null,
    done: g.done, fell: g.fell, last: g.last || null,
    safe: room.status === "done" ? g.safe : null,
  };
}

// ── Draw & Guess (3–20 players) ─────────────────────────────────────────
// A random player becomes the drawer and secretly gets a random word (food,
// animal or item). Everyone else sees only the hint (category + letter
// blanks, with a letter revealed at 2 and 4 minutes) and types guesses.
// First correct guess ends it: the drawer AND that guesser win, the rest
// drink. Nobody gets it within 5 minutes → everyone loses, drawer included.
const DG_WORDS: Record<string, string[]> = {
  Food: ["pizza", "burger", "noodles", "sushi", "ice cream", "hot dog", "banana", "apple", "watermelon", "cake", "donut", "egg", "bread", "rice", "chicken wing", "french fries", "sandwich", "cookie", "cheese", "corn", "carrot", "pineapple", "grapes", "strawberry", "chilli", "popcorn", "lollipop", "cupcake", "taco", "dumpling", "satay", "durian", "coconut", "mango", "pancake", "prawn", "fish ball", "candy", "chocolate", "mushroom"],
  Animal: ["cat", "dog", "elephant", "giraffe", "snake", "fish", "bird", "rabbit", "monkey", "lion", "tiger", "horse", "cow", "pig", "chicken", "duck", "frog", "turtle", "shark", "whale", "octopus", "crab", "spider", "butterfly", "bee", "penguin", "owl", "kangaroo", "zebra", "crocodile", "snail", "dolphin", "bat", "mouse", "panda", "camel", "deer", "sheep", "jellyfish", "dinosaur"],
  Item: ["umbrella", "phone", "guitar", "microphone", "chair", "table", "bed", "lamp", "clock", "glasses", "hat", "shoe", "key", "car", "bicycle", "airplane", "boat", "house", "tree", "flower", "sun", "moon", "star", "rainbow", "cup", "bottle", "beer", "scissors", "pencil", "book", "camera", "television", "computer", "balloon", "candle", "ladder", "toothbrush", "backpack", "rocket", "football"],
};
const DG_SECONDS = 300, DG_MAX_POINTS = 8000, DG_MAX_FEED = 40;
type DgStroke = { c: string; w: number; p: number[] }; // p = flat [x,y,x,y…] in 0..1000
// The same words in Chinese and Bahasa — guesses in any of the three languages count,
// and each player sees the word in their own language (client key gm.w.<word>).
const DG_T: Record<string, { zh: string; id: string }> = {
  "pizza": { zh: "披萨", id: "pizza" },
  "burger": { zh: "汉堡", id: "burger" },
  "noodles": { zh: "面条", id: "mi" },
  "sushi": { zh: "寿司", id: "sushi" },
  "ice cream": { zh: "冰淇淋", id: "es krim" },
  "hot dog": { zh: "热狗", id: "hot dog" },
  "banana": { zh: "香蕉", id: "pisang" },
  "apple": { zh: "苹果", id: "apel" },
  "watermelon": { zh: "西瓜", id: "semangka" },
  "cake": { zh: "蛋糕", id: "kue" },
  "donut": { zh: "甜甜圈", id: "donat" },
  "egg": { zh: "鸡蛋", id: "telur" },
  "bread": { zh: "面包", id: "roti" },
  "rice": { zh: "米饭", id: "nasi" },
  "chicken wing": { zh: "鸡翅", id: "sayap ayam" },
  "french fries": { zh: "薯条", id: "kentang goreng" },
  "sandwich": { zh: "三明治", id: "roti lapis" },
  "cookie": { zh: "饼干", id: "kukis" },
  "cheese": { zh: "奶酪", id: "keju" },
  "corn": { zh: "玉米", id: "jagung" },
  "carrot": { zh: "胡萝卜", id: "wortel" },
  "pineapple": { zh: "菠萝", id: "nanas" },
  "grapes": { zh: "葡萄", id: "anggur" },
  "strawberry": { zh: "草莓", id: "stroberi" },
  "chilli": { zh: "辣椒", id: "cabai" },
  "popcorn": { zh: "爆米花", id: "popcorn" },
  "lollipop": { zh: "棒棒糖", id: "permen lolipop" },
  "cupcake": { zh: "纸杯蛋糕", id: "kue mangkuk" },
  "taco": { zh: "墨西哥卷饼", id: "taco" },
  "dumpling": { zh: "饺子", id: "pangsit" },
  "satay": { zh: "沙爹", id: "sate" },
  "durian": { zh: "榴莲", id: "durian" },
  "coconut": { zh: "椰子", id: "kelapa" },
  "mango": { zh: "芒果", id: "mangga" },
  "pancake": { zh: "煎饼", id: "panekuk" },
  "prawn": { zh: "虾", id: "udang" },
  "fish ball": { zh: "鱼丸", id: "bakso ikan" },
  "candy": { zh: "糖果", id: "permen" },
  "chocolate": { zh: "巧克力", id: "cokelat" },
  "mushroom": { zh: "蘑菇", id: "jamur" },
  "cat": { zh: "猫", id: "kucing" },
  "dog": { zh: "狗", id: "anjing" },
  "elephant": { zh: "大象", id: "gajah" },
  "giraffe": { zh: "长颈鹿", id: "jerapah" },
  "snake": { zh: "蛇", id: "ular" },
  "fish": { zh: "鱼", id: "ikan" },
  "bird": { zh: "鸟", id: "burung" },
  "rabbit": { zh: "兔子", id: "kelinci" },
  "monkey": { zh: "猴子", id: "monyet" },
  "lion": { zh: "狮子", id: "singa" },
  "tiger": { zh: "老虎", id: "harimau" },
  "horse": { zh: "马", id: "kuda" },
  "cow": { zh: "牛", id: "sapi" },
  "pig": { zh: "猪", id: "babi" },
  "chicken": { zh: "鸡", id: "ayam" },
  "duck": { zh: "鸭子", id: "bebek" },
  "frog": { zh: "青蛙", id: "katak" },
  "turtle": { zh: "乌龟", id: "kura-kura" },
  "shark": { zh: "鲨鱼", id: "hiu" },
  "whale": { zh: "鲸鱼", id: "paus" },
  "octopus": { zh: "章鱼", id: "gurita" },
  "crab": { zh: "螃蟹", id: "kepiting" },
  "spider": { zh: "蜘蛛", id: "laba-laba" },
  "butterfly": { zh: "蝴蝶", id: "kupu-kupu" },
  "bee": { zh: "蜜蜂", id: "lebah" },
  "penguin": { zh: "企鹅", id: "penguin" },
  "owl": { zh: "猫头鹰", id: "burung hantu" },
  "kangaroo": { zh: "袋鼠", id: "kanguru" },
  "zebra": { zh: "斑马", id: "zebra" },
  "crocodile": { zh: "鳄鱼", id: "buaya" },
  "snail": { zh: "蜗牛", id: "siput" },
  "dolphin": { zh: "海豚", id: "lumba-lumba" },
  "bat": { zh: "蝙蝠", id: "kelelawar" },
  "mouse": { zh: "老鼠", id: "tikus" },
  "panda": { zh: "熊猫", id: "panda" },
  "camel": { zh: "骆驼", id: "unta" },
  "deer": { zh: "鹿", id: "rusa" },
  "sheep": { zh: "羊", id: "domba" },
  "jellyfish": { zh: "水母", id: "ubur-ubur" },
  "dinosaur": { zh: "恐龙", id: "dinosaurus" },
  "umbrella": { zh: "雨伞", id: "payung" },
  "phone": { zh: "手机", id: "ponsel" },
  "guitar": { zh: "吉他", id: "gitar" },
  "microphone": { zh: "麦克风", id: "mikrofon" },
  "chair": { zh: "椅子", id: "kursi" },
  "table": { zh: "桌子", id: "meja" },
  "bed": { zh: "床", id: "kasur" },
  "lamp": { zh: "台灯", id: "lampu" },
  "clock": { zh: "时钟", id: "jam dinding" },
  "glasses": { zh: "眼镜", id: "kacamata" },
  "hat": { zh: "帽子", id: "topi" },
  "shoe": { zh: "鞋子", id: "sepatu" },
  "key": { zh: "钥匙", id: "kunci" },
  "car": { zh: "汽车", id: "mobil" },
  "bicycle": { zh: "自行车", id: "sepeda" },
  "airplane": { zh: "飞机", id: "pesawat" },
  "boat": { zh: "船", id: "perahu" },
  "house": { zh: "房子", id: "rumah" },
  "tree": { zh: "树", id: "pohon" },
  "flower": { zh: "花", id: "bunga" },
  "sun": { zh: "太阳", id: "matahari" },
  "moon": { zh: "月亮", id: "bulan" },
  "star": { zh: "星星", id: "bintang" },
  "rainbow": { zh: "彩虹", id: "pelangi" },
  "cup": { zh: "杯子", id: "cangkir" },
  "bottle": { zh: "瓶子", id: "botol" },
  "beer": { zh: "啤酒", id: "bir" },
  "scissors": { zh: "剪刀", id: "gunting" },
  "pencil": { zh: "铅笔", id: "pensil" },
  "book": { zh: "书", id: "buku" },
  "camera": { zh: "相机", id: "kamera" },
  "television": { zh: "电视", id: "televisi" },
  "computer": { zh: "电脑", id: "komputer" },
  "balloon": { zh: "气球", id: "balon" },
  "candle": { zh: "蜡烛", id: "lilin" },
  "ladder": { zh: "梯子", id: "tangga" },
  "toothbrush": { zh: "牙刷", id: "sikat gigi" },
  "backpack": { zh: "背包", id: "ransel" },
  "rocket": { zh: "火箭", id: "roket" },
  "football": { zh: "足球", id: "bola sepak" },
};
const dgKey = (w: string) => `gm.w.${w.replace(/ /g, "_")}`;
const DG_NON_WORD = new RegExp("[^\\p{L}\\p{N}]", "gu");
function dgNorm(s: string) { return String(s || "").toLowerCase().replace(DG_NON_WORD, ""); }
function dgMatches(guess: string, word: string): boolean {
  const g = dgNorm(guess);
  return [word, DG_T[word]?.zh, DG_T[word]?.id].some((w) => !!w && dgNorm(w) === g);
}
function dgPoints(g: NonNullable<Room["dg"]>) { return g.strokes.reduce((n, s) => n + s.p.length / 2, 0); }
function startDraw(room: Room) {
  const cats = Object.keys(DG_WORDS);
  const category = cats[Math.floor(Math.random() * cats.length)];
  const list = DG_WORDS[category];
  const drawer = room.players[Math.floor(Math.random() * room.players.length)];
  room.dg = { word: list[Math.floor(Math.random() * list.length)], category, drawer: drawer.id, strokes: [], feed: [], reveal: [], lastGuess: {}, startedAt: Date.now() };
  room.status = "playing";
  setMsg(room, "dgStart" + category, { name: drawer.name }, `✏️ ${drawer.name} is drawing — guess the ${category.toLowerCase()}!`);
  clearTimers(room);
  room.deadline = Date.now() + DG_SECONDS * 1000;
  room.timer = setTimeout(() => finishDraw(room, null), DG_SECONDS * 1000);
  dgArmHints(room);
  broadcast(room);
}
// Reveal one letter at 2:00 and another at 4:00 so a stuck table gets help.
function dgArmHints(room: Room) {
  room.ticker = setInterval(() => {
    const g = room.dg;
    if (!g || room.status !== "playing") return;
    const elapsed = (Date.now() - g.startedAt) / 1000;
    const want = elapsed >= 240 ? 2 : elapsed >= 120 ? 1 : 0;
    if (g.reveal.length >= want) return;
    const hidden = g.word.split("").map((_, i) => i).filter((i) => g.word[i] !== " " && !g.reveal.includes(i));
    if (hidden.length <= 1) return;
    g.reveal.push(hidden[Math.floor(Math.random() * hidden.length)]);
    setMsg(room, "dgHint", undefined, "💡 Hint: a letter was revealed!");
    broadcast(room);
  }, 2000);
}
function dgAction(room: Room, uid: string, body: any): string {
  const g = room.dg;
  if (room.status !== "playing" || !g) return "Not playing";
  const act = String(body?.act || "");
  if (act === "stroke" || act === "clear" || act === "undo") {
    if (uid !== g.drawer) return "Only the drawer can draw";
    if (act === "clear") g.strokes = [];
    else if (act === "undo") { const sid = g.strokes.length ? g.strokes[g.strokes.length - 1].id : null; g.strokes = g.strokes.filter((s) => s.id !== sid); }
    else {
      const raw = Array.isArray(body?.p) ? body.p : [];
      const p: number[] = [];
      for (let i = 0; i + 1 < raw.length && p.length < 400; i += 2) {
        const x = Math.round(Number(raw[i])), y = Math.round(Number(raw[i + 1]));
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        p.push(Math.max(0, Math.min(1000, x)), Math.max(0, Math.min(1000, y)));
      }
      if (p.length < 2) return "";
      if (dgPoints(g) + p.length / 2 > DG_MAX_POINTS) return "Canvas is full — clear or undo";
      const c = /^#[0-9a-fA-F]{6}$/.test(String(body?.c)) ? String(body.c) : "#111111";
      const w = Math.max(2, Math.min(40, Math.round(Number(body?.w) || 6)));
      g.strokes.push({ id: Math.max(0, Math.floor(Number(body?.id) || 0)), c, w, p });
    }
    broadcast(room);
    return "";
  }
  if (act === "guess") {
    if (uid === g.drawer) return "You're the drawer!";
    const me = room.players.find((p) => p.id === uid);
    if (!me) return "Not in this room";
    const now = Date.now();
    if (now - (g.lastGuess[uid] || 0) < 600) return "Slow down";
    g.lastGuess[uid] = now;
    const text = String(body?.text || "").trim().slice(0, 40);
    if (!dgNorm(text)) return "Type a guess";
    if (dgMatches(text, g.word)) { finishDraw(room, uid); return ""; }
    g.feed.push({ id: uid, name: me.name, text });
    if (g.feed.length > DG_MAX_FEED) g.feed.splice(0, g.feed.length - DG_MAX_FEED);
    broadcast(room);
    return "";
  }
  return "Unknown action";
}
const DG_REASON_EN: Record<string, string> = { drawDrawerLeft: "✏️ The drawer left!", drawAllLeft: "Everyone else left!", dgTimeUp: "⏰ Time's up!" };
function finishDraw(room: Room, winnerId: string | null, reason?: "drawDrawerLeft" | "drawAllLeft") {
  clearTimers(room);
  const g = room.dg!;
  room.status = "done";
  g.winner = winnerId;
  const drawer = room.players.find((p) => p.id === g.drawer);
  const winner = winnerId ? room.players.find((p) => p.id === winnerId) : undefined;
  const wins = new Set(winner ? [g.drawer, winner.id] : []);
  const losers = room.players.filter((p) => !wins.has(p.id));
  room.winnerId = winner?.id; room.lastLoserId = losers[0]?.id;
  if (winner) {
    const lnames = losers.map((p) => p.name).join(", ");
    setMsg(room, losers.length === 0 ? "dgWin0" : losers.length === 1 ? "dgWin1" : "dgWinN",
      { name: winner.name, word: dgKey(g.word), drawer: drawer?.name || { k: "theDrawer" }, losers: lnames },
      `🎉 ${winner.name} guessed "${g.word}"! ${winner.name} & ${drawer?.name || "the drawer"} win — ${lnames || "nobody"} drink${losers.length === 1 ? "s" : ""} 🍺`);
  } else {
    const rk = reason || "dgTimeUp";
    setMsg(room, "dgLose", { reason: { k: rk }, word: dgKey(g.word) }, `${DG_REASON_EN[rk]} The word was "${g.word}" — nobody got it, everyone drinks (drawer too) 🍺`);
  }
  broadcast(room);
  saveScores(room, room.players.map((p) => ({ userId: p.id, name: p.name, score: wins.has(p.id) ? 1 : 0, result: (wins.has(p.id) ? "win" : "lose") as "win" | "lose" })));
  scheduleCleanup(room);
}
function dgView(room: Room, forUserId?: string) {
  const g = room.dg;
  if (!g) return null;
  const show = room.status === "done" || forUserId === g.drawer;
  return {
    drawerId: g.drawer, category: g.category,
    word: show ? g.word : null,
    wordKey: show ? dgKey(g.word) : null,
    // answer length per language, so Chinese/Bahasa players get the right number of blanks
    lens: { en: g.word.replace(/ /g, "").length, zh: (DG_T[g.word]?.zh || g.word).replace(/ /g, "").length, id: (DG_T[g.word]?.id || g.word).replace(/ /g, "").length },
    // letter blanks for guessers: "_" for hidden letters, spaces kept
    mask: g.word.split("").map((ch, i) => (ch === " " ? " " : g.reveal.includes(i) ? ch : "_")).join(""),
    strokes: g.strokes, feed: g.feed, winnerId: g.winner ?? null,
  };
}

// ── Memory Match (2–5 players) ────────────────────────────────────────────
// 30 face-down cards (6×5) = 15 pairs. On your turn flip 2: same number = +1
// point and flip again; different = they flip back and it's the next
// player's turn. When every pair is found, most pairs wins — the loser drinks
// (if everyone ties, everyone drinks).
const MEM_PAIRS = 15, MEM_TURN_SECONDS = 20, MEM_PEEK_MS = 1300;
function armMem(room: Room) {
  clearTimers(room);
  room.deadline = Date.now() + MEM_TURN_SECONDS * 1000;
  room.timer = setTimeout(() => {
    const m = room.mem; if (!m || room.status !== "playing") return;
    // out of time: flip random cards for them
    const p = room.players[room.turnIdx ?? 0];
    const choices = m.tiles.map((t, i) => i).filter((i) => !m.tiles[i].by && !m.open.includes(i));
    if (choices.length) memFlip(room, p.id, choices[Math.floor(Math.random() * choices.length)], true);
  }, MEM_TURN_SECONDS * 1000);
}
function startMemory(room: Room) {
  const vals: number[] = [];
  for (let v = 1; v <= MEM_PAIRS; v++) vals.push(v, v);
  for (let i = vals.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [vals[i], vals[j]] = [vals[j], vals[i]]; }
  room.mem = { tiles: vals.map((v) => ({ v })), open: [], score: Object.fromEntries(room.players.map((p) => [p.id, 0])) };
  room.status = "playing";
  room.turnIdx = Math.floor(Math.random() * room.players.length);
  setMsg(room, "memFirst", { name: room.players[room.turnIdx].name }, `${room.players[room.turnIdx].name} goes first — flip 2 cards 🃏`);
  armMem(room); broadcast(room);
}
function memFlip(room: Room, uid: string, idx: number, auto = false): string {
  const m = room.mem;
  if (room.status !== "playing" || !m) return "Not playing";
  const p = room.players[room.turnIdx ?? 0];
  if (!p || p.id !== uid) return "Not your turn";
  if (m.busy) return "Wait…";
  if (!(idx >= 0 && idx < m.tiles.length) || m.tiles[idx].by || m.open.includes(idx)) return "Pick a face-down card";
  m.open.push(idx);
  if (m.open.length < 2) { armMem(room); broadcast(room); if (auto) memFlipAgain(room, uid); return ""; }
  const [a, b] = m.open;
  if (m.tiles[a].v === m.tiles[b].v) {
    m.tiles[a].by = m.tiles[b].by = uid; m.open = [];
    m.score[uid] = (m.score[uid] || 0) + 1;
    if (m.tiles.every((t) => t.by)) return finishMemory(room), "";
    setMsg(room, "memMatch", { name: p.name, n: m.tiles[a].v }, `✨ ${p.name} matched ${m.tiles[a].v}! +1 — go again`);
    armMem(room); broadcast(room); return "";
  }
  m.busy = true; clearTimers(room);
  setMsg(room, "memMiss", { name: p.name, a: m.tiles[a].v, b: m.tiles[b].v }, `${p.name} missed (${m.tiles[a].v} ≠ ${m.tiles[b].v})`);
  broadcast(room);
  room.timer = setTimeout(() => {
    if (!room.mem) return;
    room.mem.open = []; room.mem.busy = false;
    room.turnIdx = ((room.turnIdx ?? 0) + 1) % room.players.length;
    setMsg(room, "memTurn", { name: room.players[room.turnIdx].name }, `${room.players[room.turnIdx].name}'s turn — flip 2 cards`);
    armMem(room); broadcast(room);
  }, MEM_PEEK_MS);
  return "";
}
function memFlipAgain(room: Room, uid: string) {
  const m = room.mem!; const choices = m.tiles.map((t, i) => i).filter((i) => !m.tiles[i].by && !m.open.includes(i));
  if (choices.length) memFlip(room, uid, choices[Math.floor(Math.random() * choices.length)]);
}
function finishMemory(room: Room) {
  clearTimers(room);
  const m = room.mem!;
  room.status = "done";
  const top = Math.max(...room.players.map((p) => m.score[p.id] || 0));
  const winners = room.players.filter((p) => (m.score[p.id] || 0) === top);
  const tie = winners.length === room.players.length;
  const losers = tie ? room.players : room.players.filter((p) => !winners.includes(p));
  room.winnerId = tie ? undefined : winners[0]?.id;
  room.lastLoserId = losers[0]?.id;
  if (tie) setMsg(room, room.players.length > 2 ? "memTieAll" : "memTie2", { n: top }, `Tie at ${top} pairs — ${room.players.length > 2 ? "everyone drinks" : "both drink"} 🍻`);
  else setMsg(room, "memWin", { names: winners.map((p) => p.name).join(" & "), n: top, losers: losers.map((p) => p.name).join(", ") }, `${winners.map((p) => p.name).join(" & ")} wins with ${top} pairs 🏆 — ${losers.map((p) => p.name).join(", ")} drinks 🍺`);
  broadcast(room);
  saveScores(room, room.players.map((p) => ({ userId: p.id, name: p.name, score: m.score[p.id] || 0, result: (losers.includes(p) ? "lose" : "win") as "win" | "lose" })));
  scheduleCleanup(room);
}
function memView(room: Room) {
  const m = room.mem;
  if (!m) return null;
  const done = room.status === "done";
  return {
    turnId: room.status === "playing" ? room.players[room.turnIdx ?? 0]?.id : null,
    tiles: m.tiles.map((t, i) => ({ v: t.by || m.open.includes(i) || done ? t.v : null, by: t.by || null, open: m.open.includes(i) })),
    score: m.score, busy: !!m.busy,
  };
}

// ── Red Light, Green Light ────────────────────────────────────────────────
// Tap LEFT, RIGHT, LEFT, RIGHT… to walk while the light is GREEN; 500 steps
// reach the finish. Tap while it's RED (after a short reaction grace) and
// you're out. 3 minutes to finish. Everyone who crosses wins; the rest drink.
const RL_GOAL = 500, RL_TIME_MS = 180_000, RL_GRACE_MS = 450, RL_MAX_RATE = 16; // steps/s cap
function rlSchedule(room: Room) {
  const r = room.rl!;
  if (room.status !== "playing") return;
  const next = r.light === "green" ? "red" : "green";
  // `dur` is how long the CURRENT light lasts before switching to `next`.
  const dur = r.light === "green" ? (r.lightUntil ? Math.max(0, r.lightUntil - Date.now()) : 4000) : 2000 + Math.random() * 2500;
  if (next === "green") r.nextGreenMs = 2500 + Math.random() * 4000;
  room.ticker = setTimeout(() => {
    if (room.status !== "playing" || !room.rl) return;
    room.rl.light = next; room.rl.lightAt = Date.now();
    room.rl.lightUntil = next === "green" ? room.rl.lightAt + room.rl.nextGreenMs! : undefined;
    if (next === "green") setMsg(room, "rlGreen", undefined, "🟢 GREEN LIGHT — walk!"); else setMsg(room, "rlRed", undefined, "🔴 RED LIGHT — freeze!");
    broadcast(room); rlSchedule(room);
  }, dur) as any;
}
function startRlgl(room: Room) {
  clearTimers(room);
  const now = Date.now();
  const nums = room.players.map(() => 1 + Math.floor(Math.random() * 456));
  room.status = "playing";
  room.rl = { light: "red", lightAt: now, startAt: now + 3000, endsAt: now + 3000 + RL_TIME_MS, st: Object.fromEntries(room.players.map((p, i) => [p.id, { steps: 0, num: nums[i] }])) };
  room.deadline = room.rl.endsAt;
  setMsg(room, "rlReady", undefined, "Get ready… 🔴 (don't move!)");
  broadcast(room);
  // first green after the 3s countdown, then random red/green cycles
  room.ticker = setTimeout(() => { if (!room.rl) return; room.rl.light = "green"; room.rl.lightAt = Date.now(); room.rl.lightUntil = room.rl.lightAt + 2500 + Math.random() * 4000; setMsg(room, "rlGreen", undefined, "🟢 GREEN LIGHT — walk!"); broadcast(room); rlSchedule(room); }, 3000) as any;
  room.timer = setTimeout(() => finishRlgl(room), 3000 + RL_TIME_MS);
}
function rlStep(room: Room, uid: string, n: number) {
  const r = room.rl;
  if (room.status !== "playing" || !r) return;
  const s = r.st[uid];
  if (!s || s.out || s.done) return;
  const now = Date.now();
  n = Math.max(0, Math.floor(n) || 0);
  if (!n) return;
  if (now < r.startAt || (r.light === "red" && now - r.lightAt > RL_GRACE_MS)) {
    s.out = true; { const nm = room.players.find((p) => p.id === uid)?.name || ""; setMsg(room, "rlOut", { name: nm }, `💥 ${nm} moved on RED — eliminated!`); }
    broadcast(room); return rlCheckEnd(room);
  }
  const cap = s.last ? Math.ceil(((now - s.last) / 1000) * RL_MAX_RATE) + 2 : 10; // anti-autoclicker
  s.last = now;
  s.steps = Math.min(RL_GOAL, s.steps + Math.min(n, cap));
  if (s.steps >= RL_GOAL) { s.done = true; s.ms = now - r.startAt; { const nm = room.players.find((p) => p.id === uid)?.name || ""; setMsg(room, "rlCross", { name: nm }, `🏁 ${nm} crossed the line!`); } broadcast(room); return rlCheckEnd(room); }
  broadcast(room);
}
function rlCheckEnd(room: Room) {
  const r = room.rl!;
  if (room.players.every((p) => r.st[p.id]?.out || r.st[p.id]?.done)) finishRlgl(room);
}
function finishRlgl(room: Room) {
  const r = room.rl;
  if (!r || room.status !== "playing") return;
  clearTimers(room);
  room.status = "done";
  let winners = room.players.filter((p) => r.st[p.id]?.done);
  // Nobody reached the finish: whoever got nearest (most steps) still wins.
  const best = Math.max(0, ...room.players.map((p) => r.st[p.id]?.steps || 0));
  const nearest = !winners.length && best > 0;
  if (nearest) winners = room.players.filter((p) => (r.st[p.id]?.steps || 0) === best);
  const losers = room.players.filter((p) => !winners.includes(p));
  room.winnerId = winners.sort((a, b) => (r.st[a.id]?.ms || 0) - (r.st[b.id]?.ms || 0))[0]?.id;
  room.lastLoserId = losers[0]?.id;
  const ln = losers.map((p) => p.name).join(", ");
  if (!losers.length) setMsg(room, "rlDoneAll", undefined, "Everybody made it — nobody drinks! 🎉");
  else if (nearest) { const wn = winners.map((p) => p.name).join(", "); setMsg(room, "rlDoneNearest", { names: wn, losers: ln }, `Nobody made it — ${wn} got the nearest and win! ${ln} drink 🍺`); }
  else if (winners.length) setMsg(room, "rlDoneSome", { n: winners.length, losers: ln }, `${winners.length} made it 🏁 · ${ln} drink 🍺`);
  else setMsg(room, "rlDoneNone", { losers: ln }, `Nobody made it! ${ln} drink 🍺`);
  broadcast(room);
  saveScores(room, room.players.map((p) => ({ userId: p.id, name: p.name, score: r.st[p.id]?.steps || 0, result: (winners.includes(p) ? "win" : "lose") as "win" | "lose" })));
  scheduleCleanup(room);
}
function rlView(room: Room) {
  const r = room.rl;
  if (!r) return null;
  return { light: r.light, lightAt: r.lightAt, lightUntil: r.lightUntil || null, startAt: r.startAt, endsAt: r.endsAt, serverNow: Date.now(), goal: RL_GOAL, st: r.st };
}

// ── Frog Jump (non-stop party game) ─────────────────────────────────────
// Three frogs. The turn player presses START, then EVERYONE (turn player too)
// has 5 seconds to tap one frog. Nobody sees the others' picks until time's up.
// Anyone who picked the same frog as the turn player drinks ½ cup; anyone who
// didn't tap in time drinks ½ cup too (the turn player included). Then the next
// player's turn. Runs until players leave.
const FROG_PICK_MS = 5000, FROG_WAIT_MS = 20_000, FROG_REVEAL_MS = 4500;
function frogWait(room: Room) {
  clearTimers(room);
  const f = room.frog!;
  f.phase = "wait"; f.picks = {};
  const p = room.players[room.turnIdx ?? 0];
  room.deadline = Date.now() + FROG_WAIT_MS;
  setMsg(room, "frogWait", { name: p.name }, `${p.name}'s turn — press START 🐸`);
  broadcast(room);
  room.timer = setTimeout(() => frogStart(room, p.id, true), FROG_WAIT_MS);
}
function startFrog(room: Room) {
  room.status = "playing";
  room.frog = { phase: "wait", picks: {}, drinks: Object.fromEntries(room.players.map((p) => [p.id, 0])), turnNo: 0 };
  room.turnIdx = Math.floor(Math.random() * room.players.length);
  frogWait(room);
}
function frogStart(room: Room, uid: string, auto = false) {
  const f = room.frog;
  if (room.status !== "playing" || !f || f.phase !== "wait") return "Not now";
  const p = room.players[room.turnIdx ?? 0];
  if (!p || (p.id !== uid && !auto)) return "Only the turn player can start";
  clearTimers(room);
  f.phase = "pick"; f.picks = {}; f.turnNo += 1;
  room.deadline = Date.now() + FROG_PICK_MS;
  setMsg(room, auto ? "frogGoAuto" : "frogGo", undefined, `GO! Everyone tap a frog in 5 seconds 🐸🐸🐸${auto ? " (auto-started)" : ""}`);
  broadcast(room);
  room.timer = setTimeout(() => frogReveal(room), FROG_PICK_MS + 250);
  return "";
}
function frogPick(room: Room, uid: string, frog: number) {
  const f = room.frog;
  if (room.status !== "playing" || !f || f.phase !== "pick") return "Wait for START";
  if (!(frog >= 0 && frog <= 2)) return "Pick a frog";
  if (f.picks[uid] !== undefined) return "You already picked";
  f.picks[uid] = frog;
  broadcast(room);
  if (room.players.every((p) => f.picks[p.id] !== undefined)) frogReveal(room);
  return "";
}
function frogReveal(room: Room) {
  const f = room.frog;
  if (!f || f.phase !== "pick") return;
  clearTimers(room);
  const leader = room.players[room.turnIdx ?? 0];
  const lp = leader ? f.picks[leader.id] : undefined;
  const drinkers: { id: string; name: string; why: string }[] = [];
  for (const p of room.players) {
    const pick = f.picks[p.id];
    if (pick === undefined) drinkers.push({ id: p.id, name: p.name, why: "too slow" });
    else if (p.id !== leader?.id && lp !== undefined && pick === lp) drinkers.push({ id: p.id, name: p.name, why: "same frog as " + leader.name });
  }
  for (const d of drinkers) f.drinks[d.id] = (f.drinks[d.id] || 0) + 1;
  for (const p of room.players) tallyAdd(room, p.id, drinkers.some((d) => d.id === p.id) ? 0 : 1, drinkers.some((d) => d.id === p.id) ? 1 : 0);
  f.phase = "reveal";
  f.last = { leaderId: leader?.id, leaderPick: lp ?? null, picks: { ...f.picks }, drinkers };
  if (drinkers.length) { const dn = drinkers.map((d) => d.name).join(", "); setMsg(room, drinkers.length > 1 ? "frogDrinkN" : "frogDrink1", { names: dn }, `${dn} drink${drinkers.length > 1 ? "" : "s"} ½ cup 🍺`); }
  else setMsg(room, "frogSafe", undefined, "Nobody matched — safe! 🎉");
  room.deadline = Date.now() + FROG_REVEAL_MS;
  broadcast(room);
  room.timer = setTimeout(() => { if (room.status !== "playing") return; room.turnIdx = ((room.turnIdx ?? 0) + 1) % room.players.length; frogWait(room); }, FROG_REVEAL_MS);
}
function frogView(room: Room, forUserId?: string) {
  const f = room.frog;
  if (!f) return null;
  return {
    phase: f.phase, turnId: room.players[room.turnIdx ?? 0]?.id, turnNo: f.turnNo,
    myPick: forUserId !== undefined ? f.picks[forUserId] ?? null : null,
    picked: room.players.filter((p) => f.picks[p.id] !== undefined).map((p) => p.id),
    last: f.phase === "reveal" ? f.last : null,
    drinks: f.drinks,
  };
}

// ── Config: which game is available which weekday ───────────────────────
const GAME_KEYS = ["rps", "tap", "rlgl", "cards", "poker3", "memory", "inbetween", "updown", "uno", "sixcup", "frog", "bridge", "draw", "dice", "wheel", "riding", "timer", "789", "stack", "number"] as const;
// Each game belongs to one category; admins can schedule categories per weekday.
const GAME_CATEGORY: Record<string, string> = {
  number: "Guessing game", rps: "Guessing game", draw: "Guessing game",
  dice: "Dice game", "789": "Dice game", sixcup: "Dice game",
  cards: "Card game", poker3: "Card game", memory: "Card game", inbetween: "Card game", updown: "Card game", uno: "Card game",
  tap: "Who's the fastest", rlgl: "Who's the fastest", timer: "Who's the fastest", stack: "Who's the fastest",
  wheel: "Lucky game", riding: "Lucky game", frog: "Lucky game", bridge: "Lucky game",
};
const CATEGORY_ORDER = ["Guessing game", "Dice game", "Card game", "Who's the fastest", "Lucky game"];
async function getCategoryConfig(): Promise<Record<string, { days: number[] }>> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, "gameCategoryConfig"));
  let cfg: any = {};
  try { cfg = row?.value ? JSON.parse(row.value) : {}; } catch { cfg = {}; }
  const out: any = {};
  for (const c of CATEGORY_ORDER) out[c] = { days: Array.isArray(cfg[c]?.days) ? cfg[c].days : [0, 1, 2, 3, 4, 5, 6] };
  return out;
}
async function getGamesConfig(): Promise<Record<string, { enabled: boolean; days: number[]; dailyLimit?: number }>> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, "gamesConfig"));
  let cfg: any = {};
  try { cfg = row?.value ? JSON.parse(row.value) : {}; } catch { cfg = {}; }
  const out: any = {};
  for (const k of GAME_KEYS) out[k] = { enabled: cfg[k]?.enabled !== false, days: Array.isArray(cfg[k]?.days) ? cfg[k].days : [0, 1, 2, 3, 4, 5, 6] };
  // Guess-the-Number: 0 = unlimited daily guesses per player.
  out.number.dailyLimit = Math.max(0, Math.floor(Number(cfg?.number?.dailyLimit) || 0));
  return out;
}
function availableToday(cfg: Record<string, { enabled: boolean; days: number[] }>, catCfg?: Record<string, { days: number[] }>) {
  const wd = new Date().getDay();
  const out: Record<string, boolean> = {};
  for (const k of GAME_KEYS) {
    const catDays = catCfg?.[GAME_CATEGORY[k]]?.days;
    const catOk = !catDays || catDays.includes(wd);
    out[k] = cfg[k].enabled && cfg[k].days.includes(wd) && catOk;
  }
  return out;
}

// ── Guess the Number (persistent, host-less, per company) ────────────────
// A 4-digit secret runs continuously; anyone can guess any time. First correct
// guess ends the round and a fresh number auto-generates. State + capped guess
// history live in app_settings so the game survives restarts and lasts for days.
const NUM_MAX = 9999;
const NUM_HISTORY = 40;
const newSecret = () => Math.floor(Math.random() * (NUM_MAX + 1));
async function loadNumberGame(cid: number) {
  const key = `numberGame:${cid}`;
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key));
  let g: any = null;
  try { g = row?.value ? JSON.parse(row.value) : null; } catch { g = null; }
  if (!g || typeof g.secret !== "number") {
    g = { round: 1, secret: newSecret(), startedAt: Date.now(), low: 0, high: NUM_MAX, history: [], lastWinner: null };
    await saveNumberGame(cid, g);
  }
  if (!Array.isArray(g.history)) g.history = [];
  return g;
}
async function saveNumberGame(cid: number, g: any) {
  const key = `numberGame:${cid}`;
  await db.insert(appSettings).values({ key, value: JSON.stringify(g), updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: JSON.stringify(g), updatedAt: new Date() } });
}
function numberPublic(g: any) {
  return {
    round: g.round, startedAt: g.startedAt, digits: 4, min: 0, max: NUM_MAX,
    range: { low: g.low, high: g.high },
    guessCount: g.history.length,
    history: g.history.slice(-NUM_HISTORY).reverse(),
    lastWinner: g.lastWinner || null,
  };
}

// ── Rank ladder config (admin-editable) ─────────────────────────────────
const DEFAULT_TIERS = [
  { name: "Rookie", perDiv: 3 }, { name: "Warrior", perDiv: 3 }, { name: "Fighter", perDiv: 4 },
  { name: "Elite", perDiv: 4 }, { name: "Master", perDiv: 5 }, { name: "Grandmaster", perDiv: 5 },
  { name: "Epic", perDiv: 6 }, { name: "Champion", perDiv: 6 },
];
async function getRankConfig(): Promise<{ seasonStarDrop: number; season: number; tiers: { name: string; perDiv: number }[] }> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, "rankConfig"));
  let cfg: any = {};
  try { cfg = row?.value ? JSON.parse(row.value) : {}; } catch { cfg = {}; }
  return {
    seasonStarDrop: Number(cfg.seasonStarDrop) >= 0 ? Number(cfg.seasonStarDrop) : 20,
    season: Number(cfg.season) || 1,
    tiers: Array.isArray(cfg.tiers) && cfg.tiers.length ? cfg.tiers.map((t: any) => ({ name: String(t.name || "Tier"), perDiv: Math.max(1, Number(t.perDiv) || 3) })) : DEFAULT_TIERS,
  };
}
async function saveRankConfig(cfg: any) {
  await db.insert(appSettings).values({ key: "rankConfig", value: JSON.stringify(cfg), updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: JSON.stringify(cfg), updatedAt: new Date() } });
}

export function registerGameRoutes(app: Express) {
  // Rank ladder: config, my rank, and the rank leaderboard shown atop /games.
  app.get("/api/reborn/rank/config", async (_req, res) => res.json(await getRankConfig()));
  app.get("/api/reborn/rank/me", requireAuth, async (req, res) => {
    const uid = getUserId(req)!;
    const [r] = await db.select().from(gameRanks).where(eq(gameRanks.userId, uid));
    res.json({ stars: r?.stars || 0, peakStars: r?.peakStars || 0 });
  });
  app.get("/api/reborn/rank/leaderboard", async (_req, res) => {
    const rows = await db.select().from(gameRanks).orderBy(desc(gameRanks.stars)).limit(50);
    res.json(rows.map((r) => ({ userId: r.userId, name: r.userName || tr(_req, { en: "Player", zh: "玩家", id: "Pemain" }), stars: r.stars, peakStars: r.peakStars })));
  });
  app.post("/api/reborn/rank/config", requireAuth, async (req, res) => {
    const uid = getUserId(req); const [u] = uid ? await db.select().from(users).where(eq(users.id, uid)) : [];
    if (!u || u.role !== "admin") return res.status(403).json({ message: tr(req, { en: "Admin only", zh: "仅限管理员", id: "Khusus admin" }) });
    const cur = await getRankConfig();
    const tiers = Array.isArray(req.body?.tiers) && req.body.tiers.length ? req.body.tiers : cur.tiers;
    await saveRankConfig({ season: cur.season, seasonStarDrop: Math.max(0, Number(req.body?.seasonStarDrop) ?? cur.seasonStarDrop), tiers });
    res.json(await getRankConfig());
  });
  app.post("/api/reborn/rank/new-season", requireAuth, async (req, res) => {
    const uid = getUserId(req); const [u] = uid ? await db.select().from(users).where(eq(users.id, uid)) : [];
    if (!u || u.role !== "admin") return res.status(403).json({ message: tr(req, { en: "Admin only", zh: "仅限管理员", id: "Khusus admin" }) });
    const cfg = await getRankConfig();
    const drop = cfg.seasonStarDrop;
    await db.update(gameRanks).set({ stars: sql`greatest(0, ${gameRanks.stars} - ${drop})`, season: cfg.season + 1, updatedAt: new Date() });
    await saveRankConfig({ ...cfg, season: cfg.season + 1 });
    res.json({ ok: true, season: cfg.season + 1, dropped: drop });
  });

  // Config (members see today's availability; admin edits schedule)
  app.get("/api/reborn/games/config", async (_req, res) => {
    const cfg = await getGamesConfig();
    const cat = await getCategoryConfig();
    res.json({ config: cfg, categories: cat, categoryOrder: CATEGORY_ORDER, gameCategory: GAME_CATEGORY, today: availableToday(cfg, cat) });
  });
  app.post("/api/reborn/games/config", requireAuth, async (req, res) => {
    const uid = getUserId(req); const [u] = uid ? await db.select().from(users).where(eq(users.id, uid)) : [];
    if (!u || (u.role !== "admin" && u.role !== "staff")) return res.status(403).json({ message: tr(req, { en: "Staff only", zh: "仅限员工", id: "Khusus staf" }) });
    if (req.body?.config) {
      const cfg = req.body.config;
      await db.insert(appSettings).values({ key: "gamesConfig", value: JSON.stringify(cfg), updatedAt: new Date() })
        .onConflictDoUpdate({ target: appSettings.key, set: { value: JSON.stringify(cfg), updatedAt: new Date() } });
    }
    if (req.body?.categories) {
      const cat = req.body.categories;
      await db.insert(appSettings).values({ key: "gameCategoryConfig", value: JSON.stringify(cat), updatedAt: new Date() })
        .onConflictDoUpdate({ target: appSettings.key, set: { value: JSON.stringify(cat), updatedAt: new Date() } });
    }
    const cfg = await getGamesConfig(); const cat = await getCategoryConfig();
    res.json({ ok: true, config: cfg, categories: cat });
  });

  // Guess the Number — read current round + guess history
  app.get("/api/reborn/games/number", requireAuth, async (req, res) => {
    const cfg = await getGamesConfig();
    if (!availableToday(cfg, await getCategoryConfig()).number) return res.json({ available: false });
    const cid = await resolveCompanyId(req);
    const uid = getUserId(req)!;
    const g = await loadNumberGame(cid);
    const limit = cfg.number.dailyLimit || 0;
    const day = new Date().toISOString().slice(0, 10);
    const used = (g.counts && g.counts.day === day) ? (g.counts.byUser?.[uid] || 0) : 0;
    res.json({ available: true, dailyLimit: limit, used, remaining: limit > 0 ? Math.max(0, limit - used) : null, ...numberPublic(g) });
  });
  // Submit a guess; first correct one ends the round and rolls a new secret.
  app.post("/api/reborn/games/number/guess", requireAuth, async (req, res) => {
    const cfg = await getGamesConfig();
    if (!availableToday(cfg, await getCategoryConfig()).number) return res.status(400).json({ message: tr(req, { en: "The number game isn't available today.", zh: "猜数字游戏今天未开放。", id: "Permainan tebak angka tidak tersedia hari ini." }) });
    const cid = await resolveCompanyId(req);
    const uid = getUserId(req)!;
    const guess = Math.floor(Number(req.body?.guess));
    if (!Number.isFinite(guess) || guess < 0 || guess > NUM_MAX) return res.status(400).json({ message: tr(req, { en: "Enter a number from 0 to 9999.", zh: "请输入 0 到 9999 之间的数字。", id: "Masukkan angka dari 0 sampai 9999." }) });
    const g = await loadNumberGame(cid);
    const limit = cfg.number.dailyLimit || 0;
    const day = new Date().toISOString().slice(0, 10);
    if (!g.counts || g.counts.day !== day) g.counts = { day, byUser: {} };
    const used = g.counts.byUser[uid] || 0;
    if (limit > 0 && used >= limit) return res.status(429).json({ message: tr(req, { en: limit === 1 ? "You've used your 1 guess for today — come back tomorrow!" : "You've used all {n} guesses for today — come back tomorrow!", zh: "你今天的 {n} 次猜测已用完——明天再来吧！", id: "Kamu sudah memakai {n} tebakan hari ini — kembali lagi besok!" }, { n: limit }) });
    g.counts.byUser[uid] = used + 1;
    const remaining = limit > 0 ? Math.max(0, limit - g.counts.byUser[uid]) : null;
    const name = await nameFor(uid);
    const at = Date.now();
    if (guess === g.secret) {
      const wonRound = g.round;
      const solved = g.secret;
      await db.insert(pvpScores).values({ companyId: cid, game: "number", userId: uid, userName: name, score: wonRound, result: "win", roomCode: `R${wonRound}` }).catch(() => {});
      await awardPetCoins(uid, COINS_NUMBER_CRACK);
      const season = (await getRankConfig()).season;
      await db.insert(gameRanks).values({ userId: uid, userName: name, stars: 1, peakStars: 1, season })
        .onConflictDoUpdate({ target: gameRanks.userId, set: { stars: sql`${gameRanks.stars} + 1`, peakStars: sql`greatest(${gameRanks.peakStars}, ${gameRanks.stars} + 1)`, userName: name, updatedAt: new Date() } }).catch(() => {});
      g.round += 1; g.secret = newSecret(); g.startedAt = at; g.low = 0; g.high = NUM_MAX; g.history = [];
      g.lastWinner = { name, guess: solved, round: wonRound, at };
      await saveNumberGame(cid, g);
      return res.json({ correct: true, solved, message: tr(req, { en: "🎉 {name} cracked {n}! A new number is ready — keep guessing.", zh: "🎉 {name} 猜中了 {n}！新数字已就绪——继续猜吧。", id: "🎉 {name} menebak {n} dengan tepat! Angka baru sudah siap — terus menebak." }, { name, n: solved }), dailyLimit: limit, used: g.counts.byUser[uid], remaining, ...numberPublic(g) });
    }
    const hint = guess < g.secret ? "higher" : "lower";
    if (guess < g.secret) g.low = Math.max(g.low, guess + 1);
    else g.high = Math.min(g.high, guess - 1);
    g.history.push({ userId: uid, name, guess, hint, at });
    if (g.history.length > NUM_HISTORY) g.history = g.history.slice(-NUM_HISTORY);
    await saveNumberGame(cid, g);
    res.json({ correct: false, hint, guess, message: hint === "higher" ? tr(req, { en: "Higher than {n} ⬆️", zh: "比 {n} 大 ⬆️", id: "Lebih besar dari {n} ⬆️" }, { n: guess }) : tr(req, { en: "Lower than {n} ⬇️", zh: "比 {n} 小 ⬇️", id: "Lebih kecil dari {n} ⬇️" }, { n: guess }), dailyLimit: limit, used: g.counts.byUser[uid], remaining, ...numberPublic(g) });
  });

  // Leaderboard per game
  app.get("/api/reborn/games/leaderboard", async (req, res) => {
    const game = String(req.query.game || "rps");
    const cid = await resolveCompanyId(req);
    // rps/cards: rank by wins; tap: rank by best single score (coins).
    const rows: any = (game === "tap" || game === "stack")
      ? await db.execute(sql`SELECT user_id, max(user_name) name, max(score) best, count(*) plays FROM pvp_game_scores WHERE game=${game} AND company_id=${cid} GROUP BY user_id ORDER BY best DESC LIMIT 50`)
      : await db.execute(sql`SELECT user_id, max(user_name) name, count(*) FILTER (WHERE result='win') wins, count(*) plays FROM pvp_game_scores WHERE game=${game} AND company_id=${cid} GROUP BY user_id ORDER BY wins DESC LIMIT 50`);
    res.json((rows.rows || rows).map((r: any) => ({ userId: r.user_id, name: r.name, score: Number(r.best ?? r.wins ?? 0), plays: Number(r.plays || 0) })));
  });

  // Browse all open rooms (in the lobby, not yet started)
  app.get("/api/reborn/games/rooms", requireAuth, async (req, res) => {
    await restoreSavedRooms();
    const list = Array.from(rooms.values())
      .filter((r) => r.status === "lobby" && inThisSpace(r))
      .map((r) => ({
        code: r.code, game: r.game,
        hostName: r.players.find((p) => p.id === r.hostId)?.name || tr(req, { en: "Host", zh: "房主", id: "Host" }),
        players: r.players.length, max: roomCap(r.game),
        hasPassword: !!r.password, createdAt: r.createdAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
    res.json(list);
  });

  // Create a room
  app.post("/api/reborn/games/rooms", requireAuth, async (req, res) => {
    const uid = getUserId(req)!;
    const game: GameKind = ["tap", "cards", "dice", "wheel", "riding", "timer", "789", "stack", "poker3", "frog", "rlgl", "memory", "bridge", "draw", "inbetween", "updown", "uno", "sixcup"].includes(req.body?.game) ? req.body.game : "rps";
    const cfg = await getGamesConfig();
    const cat = await getCategoryConfig();
    if (!availableToday(cfg, cat)[game]) return res.status(400).json({ message: tr(req, { en: "That game isn't available today.", zh: "该游戏今天未开放。", id: "Permainan itu tidak tersedia hari ini." }) });
    const name = await nameFor(uid);
    const companyId = await resolveCompanyId(req);
    // Double/triple taps on "Create room" must not open several rooms: reuse the
    // lobby room this host already has for this game. (No await between this
    // check and rooms.set, so concurrent requests can't both pass it.)
    const already = Array.from(rooms.values()).find((r) => inThisSpace(r) && r.hostId === uid && r.game === game && r.status === "lobby");
    if (already) return res.json({ code: already.code });
    const room: Room = {
      code: code4(), game, hostId: uid, password: String(req.body?.password || "").trim(), companyId, space: homeCompanySlug(),
      status: "lobby", players: [{ id: uid, name, alive: true, taps: 0, connected: true }],
      round: 1, deadline: 0, message: "Waiting for players…", msg: { k: "lobbyWait" }, eliminatedThisRound: [],
      winTarget: 1, seriesScore: {}, // no series: each game keeps going or ends by its own rules
      ridingClicks: Math.max(1, Math.min(4, Math.floor(Number(req.body?.ridingClicks) || 1))),
      facesCount: Math.max(9, Math.min(36, Math.floor(Number(req.body?.facesCount) || 16))),
      wheelPrizes: Array.isArray(req.body?.wheelPrizes)
        ? req.body.wheelPrizes.map((s: any) => String(s).trim()).filter(Boolean).slice(0, 12).map((label: string) => ({ label, w: 1, emoji: "🍺" }))
        : undefined,
      timerMode: req.body?.timerMode === "random" ? "random" : "fixed",
      pkMin: Math.max(1, Math.min(4, Math.floor(Number(req.body?.pkMin) || 1))),
      pkMax: Math.max(4, Math.min(40, Math.floor(Number(req.body?.pkMax) || 20))),
      scDice: Number(req.body?.scDice) === 2 ? 2 : 1,
      createdAt: Date.now(), subs: new Set(),
    };
    rooms.set(room.code, room);
    res.json({ code: room.code });
  });

  // Join a room
  app.post("/api/reborn/games/rooms/:code/join", requireAuth, async (req, res) => {
    const room = await getRoom(req.params.code);
    if (!room) return res.status(404).json({ message: tr(req, { en: "Room not found (it may have ended).", zh: "找不到房间（可能已结束）。", id: "Room tidak ditemukan (mungkin sudah selesai)." }) });
    const uid = getUserId(req)!;
    const existing = room.players.find((p) => p.id === uid);
    // Already in this room → allow rejoin/reconnect any time (after backgrounding
    // the app, etc.), even mid-game, so you never lose control of your room.
    if (existing) return res.json({ code: room.code });
    if (room.status !== "lobby") return res.status(400).json({ message: tr(req, { en: "This game has already started.", zh: "游戏已经开始了。", id: "Permainan ini sudah dimulai." }) });
    if (room.password && String(req.body?.password || "") !== room.password) return res.status(403).json({ message: tr(req, { en: "Wrong room password.", zh: "房间密码错误。", id: "Kata sandi room salah." }) });
    const cap = roomCap(room.game);
    if (room.players.length >= cap) return res.status(400).json({ message: tr(req, { en: "Room is full ({n} players).", zh: "房间已满（{n} 人）。", id: "Room penuh ({n} pemain)." }, { n: cap }) });
    room.players.push({ id: uid, name: await nameFor(uid), alive: true, taps: 0, connected: true });
    broadcast(room);
    res.json({ code: room.code });
  });

  // Host starts the game (any time, min 2 players)
  app.post("/api/reborn/games/rooms/:code/start", requireAuth, async (req, res) => {
    const room = await getRoom(req.params.code);
    if (!room) return res.status(404).json({ message: tr(req, { en: "Room not found", zh: "找不到房间", id: "Room tidak ditemukan" }) });
    if (getUserId(req) !== room.hostId) return res.status(403).json({ message: tr(req, { en: "Only the host can start.", zh: "只有房主可以开始。", id: "Hanya host yang bisa memulai." }) });
    if (room.status !== "lobby") return res.status(400).json({ message: tr(req, { en: "Already started.", zh: "已经开始了。", id: "Sudah dimulai." }) });
    if (room.players.length < 2) return res.status(400).json({ message: tr(req, { en: "Need at least 2 players.", zh: "至少需要 2 名玩家。", id: "Butuh minimal 2 pemain." }) });
    if (room.game === "draw" && room.players.length < 3) return res.status(400).json({ message: tr(req, { en: "Draw & Guess needs at least 3 players.", zh: "你画我猜至少需要 3 名玩家。", id: "Gambar & Tebak butuh minimal 3 pemain." }) });
    if (room.game === "rps") { room.round = 1; startRpsRound(room); }
    else if (room.game === "cards") startCards(room);
    else if (room.game === "poker3") startPoker(room);
    else if (room.game === "frog") startFrog(room);
    else if (room.game === "rlgl") startRlgl(room);
    else if (room.game === "memory") startMemory(room);
    else if (room.game === "bridge") startBridge(room);
    else if (room.game === "draw") startDraw(room);
    else if (room.game === "dice") startDiceRound(room);
    else if (room.game === "wheel") startWheel(room);
    else if (room.game === "riding") startRiding(room);
    else if (room.game === "timer") startTimer(room);
    else if (room.game === "789") start789(room);
    else if (room.game === "inbetween" || room.game === "updown") startCd(room);
    else if (room.game === "uno") startUno(room);
    else if (room.game === "sixcup") startSc(room);
    else if (room.game === "stack") startStack(room);
    else startTap(room);
    res.json({ ok: true });
  });

  // End a never-ending party game and rank the players by their wins.
  app.post("/api/reborn/games/rooms/:code/finish", requireAuth, async (req, res) => {
    const room = await getRoom(req.params.code);
    if (!room) return res.status(404).json({ message: tr(req, { en: "Room not found", zh: "找不到房间", id: "Room tidak ditemukan" }) });
    if (getUserId(req) !== room.hostId) return res.status(403).json({ message: tr(req, { en: "Only the host can end the game.", zh: "只有房主可以结束游戏。", id: "Hanya host yang bisa mengakhiri permainan." }) });
    if ((room.status !== "playing" && room.status !== "reveal") || room.tb || !CONTINUOUS.has(room.game)) return res.status(400).json({ message: tr(req, { en: "This game can't be ended now.", zh: "现在不能结束这个游戏。", id: "Permainan ini belum bisa diakhiri." }) });
    if (!Object.values(room.tally || {}).some((x) => x.w + x.l > 0)) return res.status(400).json({ message: tr(req, { en: "Play at least one round first.", zh: "请至少先玩一轮。", id: "Mainkan setidaknya satu ronde dulu." }) });
    finishContinuous(room);
    res.json({ ok: true });
  });

  // Play again — host recycles the finished room back to the lobby.
  app.post("/api/reborn/games/rooms/:code/restart", requireAuth, async (req, res) => {
    const room = await getRoom(req.params.code);
    if (!room) return res.status(404).json({ message: tr(req, { en: "Room not found", zh: "找不到房间", id: "Room tidak ditemukan" }) });
    if (getUserId(req) !== room.hostId) return res.status(403).json({ message: tr(req, { en: "Only the host can restart.", zh: "只有房主可以重新开始。", id: "Hanya host yang bisa memulai ulang." }) });
    if (room.status !== "done") return res.status(400).json({ message: tr(req, { en: "Game still in progress.", zh: "游戏仍在进行中。", id: "Permainan masih berlangsung." }) });
    resetRoom(room);
    res.json({ ok: true });
  });

  // Player action: {choice} for rps, {tap:true} for tap
  app.post("/api/reborn/games/rooms/:code/action", requireAuth, async (req, res) => {
    const room = await getRoom(req.params.code);
    if (!room) return res.status(404).json({ message: tr(req, { en: "Room not found", zh: "找不到房间", id: "Room tidak ditemukan" }) });
    const p = room.players.find((x) => x.id === getUserId(req));
    if (!p) return res.status(403).json({ message: tr(req, { en: "You're not in this room.", zh: "你不在这个房间。", id: "Kamu tidak ada di room ini." }) });
    if (room.status !== "playing") return res.json({ ok: false });
    if (room.tb) {
      const err = req.body?.act === "tb" ? tbPick(room, getUserId(req)!, String(req.body?.choice || "")) : "Wait…";
      return err ? res.status(400).json({ message: errText(req, err) }) : res.json({ ok: true });
    }
    if (room.game === "wheel") {
      if (req.body?.act === "spin") wheelSpin(room, getUserId(req)!);
      return res.json({ ok: true });
    }
    if (room.game === "timer") {
      if (req.body?.act === "stop") stopTimer(room, getUserId(req)!);
      return res.json({ ok: true });
    }
    if (room.game === "789") {
      const uid = getUserId(req)!;
      if (req.body?.act === "roll") seven789Roll(room, uid);
      else if (req.body?.act === "choose") seven789Choose(room, uid, String(req.body?.targetId));
      return res.json({ ok: true });
    }
    if (room.game === "sixcup") {
      const uid = getUserId(req)!;
      const err = req.body?.act === "roll" ? scRoll(room, uid) : req.body?.act === "fill" ? scFill(room, uid, Number(req.body?.amount)) : "Unknown action";
      return err ? res.status(400).json({ message: errText(req, err) }) : res.json({ ok: true });
    }
    if (room.game === "uno") {
      const err = req.body?.act === "play" ? unoPlay(room, getUserId(req)!, String(req.body?.cardId || "")) : "Unknown action";
      return err ? res.status(400).json({ message: errText(req, err) }) : res.json({ ok: true });
    }
    if (room.game === "inbetween" || room.game === "updown") {
      const uid = getUserId(req)!;
      const err = req.body?.act === "call" ? cdCall(room, uid, String(req.body?.call) as CdCall) : req.body?.act === "place" ? cdPlace(room, uid, String(req.body?.side)) : "Unknown action";
      return err ? res.status(400).json({ message: errText(req, err) }) : res.json({ ok: true });
    }
    if (room.game === "stack") {
      if (req.body?.act === "drop") stackDrop(room, getUserId(req)!, Number(req.body?.pos ?? req.body?.left));
      return res.json({ ok: true });
    }
    if (room.game === "riding") {
      if (req.body?.act === "flip") {
        const uid = getUserId(req)!;
        if (room.players[room.turnIdx ?? 0]?.id !== uid) return res.status(400).json({ message: errText(req, "Not your turn") });
        ridingFlip(room, uid, Number(req.body?.tileId));
      }
      return res.json({ ok: true });
    }
    if (room.game === "dice") {
      const uid = getUserId(req)!;
      const act = req.body?.act;
      if (act === "catch") {
        if (!room.bid) return res.status(400).json({ message: tr(req, { en: "No bid to catch yet.", zh: "还没有可以抓的叫数。", id: "Belum ada tawaran untuk ditangkap." }) });
        if (uid === room.bid.by) return res.status(400).json({ message: tr(req, { en: "You can't catch your own bid.", zh: "你不能抓自己的叫数。", id: "Kamu tidak bisa menangkap tawaranmu sendiri." }) });
        if (!p.alive) return res.status(400).json({ message: tr(req, { en: "You're out.", zh: "你已出局。", id: "Kamu sudah keluar." }) });
        resolveDiceCatch(room, uid);
        return res.json({ ok: true });
      }
      if (act === "bid") {
        const err = applyDiceBid(room, uid, Number(req.body?.face), Number(req.body?.qty), !!req.body?.strike);
        if (err) return res.status(400).json({ message: errText(req, err) });
        return res.json({ ok: true });
      }
      return res.status(400).json({ message: tr(req, { en: "Bad action", zh: "无效操作", id: "Aksi tidak valid" }) });
    }
    if (room.game === "draw") {
      const err = dgAction(room, getUserId(req)!, req.body);
      return err ? res.status(400).json({ message: errText(req, err) }) : res.json({ ok: true });
    }
    if (room.game === "bridge") {
      const err = gbStep(room, getUserId(req)!, Number(req.body?.side));
      return err ? res.status(400).json({ message: errText(req, err) }) : res.json({ ok: true });
    }
    if (room.game === "memory") {
      const err = memFlip(room, getUserId(req)!, Number(req.body?.idx));
      return err ? res.status(400).json({ message: errText(req, err) }) : res.json({ ok: true });
    }
    if (room.game === "rlgl") {
      if (req.body?.act === "step") rlStep(room, getUserId(req)!, Number(req.body?.n));
      return res.json({ ok: true });
    }
    if (room.game === "frog") {
      const uid = getUserId(req)!;
      const err = req.body?.act === "start" ? frogStart(room, uid) : req.body?.act === "pick" ? frogPick(room, uid, Number(req.body?.frog)) : "Unknown action";
      return err ? res.status(400).json({ message: errText(req, err) }) : res.json({ ok: true });
    }
    if (room.game === "poker3") {
      const err = pokerAction(room, getUserId(req)!, String(req.body?.act || ""));
      return err ? res.status(400).json({ message: errText(req, err) }) : res.json({ ok: true });
    }
    if (room.game === "cards") {
      const r = cardAction(room, getUserId(req)!, req.body || {});
      if (r.error) return res.status(400).json({ message: errText(req, r.error) });
      return res.json({ ok: true });
    }
    if (room.game === "rps") {
      const choice = req.body?.choice as Choice;
      if (!["rock", "paper", "scissors"].includes(choice)) return res.status(400).json({ message: tr(req, { en: "Bad choice", zh: "无效选择", id: "Pilihan tidak valid" }) });
      if (p.alive && !p.choice) {
        p.choice = choice;
        // If everyone still alive has chosen, resolve early.
        if (room.players.filter((x) => x.alive).every((x) => x.choice)) resolveRps(room);
        else broadcast(room);
      }
    } else {
      if (Date.now() < room.deadline) p.taps += Math.max(1, Math.min(5, Number(req.body?.n) || 1));
    }
    res.json({ ok: true });
  });

  // Leave / close
  app.post("/api/reborn/games/rooms/:code/leave", requireAuth, async (req, res) => {
    const room = await getRoom(req.params.code);
    // A player leaving no longer ends the game — it keeps running for whoever's
    // left, and the host role passes on. The room only closes when it's empty.
    if (room) removePlayer(room, getUserId(req) || undefined);
    res.json({ ok: true });
  });

  // Live state stream (SSE)
  app.get("/api/reborn/games/rooms/:code/stream", requireAuth, async (req, res) => {
    const room = await getRoom(req.params.code);
    if (!room) return res.status(404).end();
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    const sub = { res, uid: getUserId(req) || undefined };
    res.write(`data: ${JSON.stringify(view(room, sub.uid))}\n\n`);
    room.subs.add(sub);
    const ping = setInterval(() => { try { res.write(": ping\n\n"); } catch {} }, 25_000);
    req.on("close", () => { clearInterval(ping); room.subs.delete(sub); });
  });
}
