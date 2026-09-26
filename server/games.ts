// Live PvP mini-games — ephemeral in-memory rooms synced to clients over SSE.
// Games: rps (rock-paper-scissors elimination), tap (60s tap/mining race).
// Leaderboards + which-game-on-which-day config persist in Postgres.
import type { Express, Request, Response } from "express";
import { and, desc, eq, sql, inArray } from "drizzle-orm";
import { db } from "./db";
import { users, pvpScores, appSettings } from "@shared/schema";
import { requireAuth, getUserId } from "./multiAuth";

type Choice = "rock" | "paper" | "scissors";
type GameKind = "rps" | "tap" | "cards";
interface Card { id: string; v: string; s: string; }
interface Player { id: string; name: string; choice?: Choice | null; alive: boolean; taps: number; connected: boolean; hand?: Card[]; }
interface Room {
  code: string; game: GameKind; hostId: string; password: string;
  status: "lobby" | "playing" | "reveal" | "done";
  players: Player[];
  round: number; deadline: number; message: string;
  eliminatedThisRound: string[]; winnerId?: string; lastLoserId?: string;
  createdAt: number; timer?: NodeJS.Timeout; ticker?: NodeJS.Timeout; cleanupTimer?: NodeJS.Timeout;
  subs: Set<{ res: Response; uid?: string }>;
  // cards-only
  deck?: Card[]; discardTop?: Card | null; discardBy?: string | null;
  turnIdx?: number; phase?: "draw" | "discard"; drawnFrom?: "deck" | "discard" | null;
}

const rooms = new Map<string, Room>();
const MAX_PLAYERS = 20;
const CARDS_MAX = 5;
const RPS_SECONDS = 5;
const TAP_SECONDS = 60;

function code4(): string {
  let c = ""; do { c = Math.random().toString(36).slice(2, 6).toUpperCase(); } while (rooms.has(c));
  return c;
}

// Public snapshot — hides passwords and other players' live choice until reveal.
function view(room: Room, forUserId?: string) {
  const reveal = room.status === "reveal" || room.status === "done";
  return {
    code: room.code, game: room.game, hostId: room.hostId, status: room.status,
    hasPassword: !!room.password, round: room.round, message: room.message,
    secondsLeft: room.deadline ? Math.max(0, Math.ceil((room.deadline - Date.now()) / 1000)) : 0,
    winnerId: room.winnerId, lastLoserId: room.lastLoserId, eliminatedThisRound: room.eliminatedThisRound,
    you: forUserId,
    players: room.players.map((p) => ({
      id: p.id, name: p.name, alive: p.alive, taps: p.taps,
      chose: !!p.choice, // whether they've locked a choice this round
      choice: reveal || p.id === forUserId ? p.choice || null : null,
    })),
    ...(room.game === "cards" ? { cards: cardView(room, forUserId) } : {}),
  };
}

function broadcast(room: Room) {
  const dead: { res: Response; uid?: string }[] = [];
  for (const s of room.subs) {
    try { s.res.write(`data: ${JSON.stringify(view(room, s.uid))}\n\n`); } // personalized per viewer
    catch { dead.push(s); }
  }
  for (const d of dead) room.subs.delete(d);
}

async function nameFor(userId: string): Promise<string> {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  return u ? ([u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.email || "Player") : "Player";
}

async function saveScores(room: Room, rows: { userId: string; name: string; score: number; result: "win" | "lose" }[]) {
  if (!rows.length) return;
  await db.insert(pvpScores).values(rows.map((r) => ({ game: room.game, userId: r.userId, userName: r.name, score: r.score, result: r.result, roomCode: room.code }))).catch(() => {});
}

function clearTimers(room: Room) {
  if (room.timer) { clearTimeout(room.timer); room.timer = undefined; }
  if (room.ticker) { clearInterval(room.ticker); room.ticker = undefined; }
}

// ── Rock Paper Scissors (elimination) ───────────────────────────────────
const BEATS: Record<Choice, Choice> = { rock: "scissors", paper: "rock", scissors: "paper" };

function startRpsRound(room: Room) {
  clearTimers(room);
  room.status = "playing";
  room.eliminatedThisRound = [];
  for (const p of room.players) if (p.alive) p.choice = null;
  room.deadline = Date.now() + RPS_SECONDS * 1000 + 400;
  room.message = `Round ${room.round} — choose!`;
  broadcast(room);
  room.timer = setTimeout(() => resolveRps(room), RPS_SECONDS * 1000 + 400);
}

function resolveRps(room: Room) {
  clearTimers(room);
  const alive = room.players.filter((p) => p.alive);
  // Anyone who didn't pick is eliminated immediately.
  const noPick = alive.filter((p) => !p.choice);
  const choosers = alive.filter((p) => p.choice);
  let eliminated: Player[] = [...noPick];

  if (choosers.length >= 2) {
    const kinds = new Set(choosers.map((p) => p.choice!));
    if (kinds.size === 2) {
      // Exactly two signs out — the losing sign is eliminated.
      const [a, b] = Array.from(kinds);
      const losingKind = BEATS[a] === b ? b : a; // whichever is beaten
      eliminated.push(...choosers.filter((p) => p.choice === losingKind));
    }
    // size 1 or 3 among choosers = stand-off, no elimination beyond no-picks.
  }
  for (const p of eliminated) p.alive = false;
  room.eliminatedThisRound = eliminated.map((p) => p.id);
  if (eliminated.length) room.lastLoserId = eliminated[eliminated.length - 1].id;

  const survivors = room.players.filter((p) => p.alive);
  room.status = "reveal";
  if (survivors.length <= 1) {
    room.winnerId = survivors[0]?.id;
    room.message = survivors[0] ? `${survivors[0].name} wins! 🏆` : "No winner — everyone out!";
    room.status = "done";
    broadcast(room);
    const rows: { userId: string; name: string; score: number; result: "win" | "lose" }[] = [];
    if (survivors[0]) rows.push({ userId: survivors[0].id, name: survivors[0].name, score: 1, result: "win" });
    if (room.lastLoserId) { const l = room.players.find((p) => p.id === room.lastLoserId); if (l && l.id !== survivors[0]?.id) rows.push({ userId: l.id, name: l.name, score: 0, result: "lose" }); }
    saveScores(room, rows);
    scheduleCleanup(room);
    return;
  }
  room.message = eliminated.length ? `${eliminated.map((p) => p.name).join(", ")} out!` : "Stand-off — go again!";
  broadcast(room);
  // Short reveal pause, then next round with survivors.
  room.round += 1;
  room.timer = setTimeout(() => startRpsRound(room), 2600);
}

// ── Tap / Mining race (60s) ─────────────────────────────────────────────
function startTap(room: Room) {
  clearTimers(room);
  room.status = "playing";
  for (const p of room.players) p.taps = 0;
  room.deadline = Date.now() + TAP_SECONDS * 1000;
  room.message = "DIG! Tap as fast as you can!";
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
  room.message = top ? `${top.name} struck gold — ${top.taps} coins! 🏆` : "Game over";
  broadcast(room);
  saveScores(room, ranked.map((p, i) => ({ userId: p.id, name: p.name, score: p.taps, result: i === 0 ? "win" : "lose" })));
  scheduleCleanup(room);
}

// Keep a finished room around so the host can "play again"; auto-delete only
// after a long idle so abandoned rooms don't linger forever.
function scheduleCleanup(room: Room) {
  if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
  room.cleanupTimer = setTimeout(() => { clearTimers(room); for (const s of room.subs) { try { s.res.end(); } catch {} } rooms.delete(room.code); }, 10 * 60_000);
}

// Recycle a finished room back to the lobby for another round.
function resetRoom(room: Room) {
  clearTimers(room);
  if (room.cleanupTimer) { clearTimeout(room.cleanupTimer); room.cleanupTimer = undefined; }
  room.status = "lobby";
  room.round = 1; room.deadline = 0; room.message = "Waiting for players…";
  room.eliminatedThisRound = []; room.winnerId = undefined; room.lastLoserId = undefined;
  room.deck = undefined; room.discardTop = null; room.discardBy = null; room.turnIdx = undefined; room.phase = undefined; room.drawnFrom = null;
  for (const p of room.players) { p.choice = null; p.alive = true; p.taps = 0; p.hand = undefined; }
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
  room.message = `${host.name}'s turn — discard a card to open`;
  armCardTimer(room);
  broadcast(room);
}

function cardView(room: Room, forUserId?: string) {
  const done = room.status === "done";
  return {
    deckLeft: room.deck?.length || 0,
    discardTop: room.discardTop || null,
    turnId: room.players[room.turnIdx ?? 0]?.id,
    phase: room.phase,
    hands: room.players.reduce((acc: any, p) => { acc[p.id] = (p.id === forUserId || done) ? (p.hand || []) : (p.hand?.length || 0); return acc; }, {}),
  };
}

async function cardsWin(room: Room, winnerId: string, via: "deck" | "discard") {
  clearTimers(room);
  room.status = "done";
  room.winnerId = winnerId;
  const winner = room.players.find((p) => p.id === winnerId)!;
  const rows: { userId: string; name: string; score: number; result: "win" | "lose" }[] = [{ userId: winner.id, name: winner.name, score: 1, result: "win" }];
  if (via === "deck") {
    room.message = `${winner.name} drew the winning card — BIG WIN, everyone else loses! 🏆`;
    for (const p of room.players) if (p.id !== winnerId) rows.push({ userId: p.id, name: p.name, score: 0, result: "lose" });
  } else {
    const loser = room.players.find((p) => p.id === room.discardBy);
    room.message = `${winner.name} matched ${room.discardBy && loser ? loser.name + "'s" : "the"} discard and wins! 🏆`;
    if (loser && loser.id !== winnerId) { rows.push({ userId: loser.id, name: loser.name, score: 0, result: "lose" }); room.lastLoserId = loser.id; }
  }
  broadcast(room);
  await saveScores(room, rows);
  scheduleCleanup(room);
}

function cardsTie(room: Room) {
  clearTimers(room);
  room.status = "done";
  room.message = "Deck ran out — it's a tie, no winner.";
  broadcast(room);
  scheduleCleanup(room);
}

const CARD_TURN_SECONDS = 10;
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
  room.message = `${p.name} ran out of time — auto-discarded`;
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
  room.message = `${room.players[room.turnIdx].name}'s turn — take the discard or draw`;
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
    room.message = `${p.name} — discard a card`;
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

// ── Config: which game is available which weekday ───────────────────────
const GAME_KEYS = ["rps", "tap", "cards"] as const;
async function getGamesConfig(): Promise<Record<string, { enabled: boolean; days: number[] }>> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, "gamesConfig"));
  let cfg: any = {};
  try { cfg = row?.value ? JSON.parse(row.value) : {}; } catch { cfg = {}; }
  const out: any = {};
  for (const k of GAME_KEYS) out[k] = { enabled: cfg[k]?.enabled !== false, days: Array.isArray(cfg[k]?.days) ? cfg[k].days : [0, 1, 2, 3, 4, 5, 6] };
  return out;
}
function availableToday(cfg: Record<string, { enabled: boolean; days: number[] }>) {
  const wd = new Date().getDay();
  const out: Record<string, boolean> = {};
  for (const k of GAME_KEYS) out[k] = cfg[k].enabled && cfg[k].days.includes(wd);
  return out;
}

export function registerGameRoutes(app: Express) {
  // Config (members see today's availability; admin edits schedule)
  app.get("/api/reborn/games/config", async (_req, res) => {
    const cfg = await getGamesConfig();
    res.json({ config: cfg, today: availableToday(cfg) });
  });
  app.post("/api/reborn/games/config", requireAuth, async (req, res) => {
    const uid = getUserId(req); const [u] = uid ? await db.select().from(users).where(eq(users.id, uid)) : [];
    if (!u || u.role !== "admin") return res.status(403).json({ message: "Admin only" });
    const cfg = req.body?.config || {};
    await db.insert(appSettings).values({ key: "gamesConfig", value: JSON.stringify(cfg), updatedAt: new Date() })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: JSON.stringify(cfg), updatedAt: new Date() } });
    res.json({ ok: true, config: await getGamesConfig() });
  });

  // Leaderboard per game
  app.get("/api/reborn/games/leaderboard", async (req, res) => {
    const game = String(req.query.game || "rps");
    // rps/cards: rank by wins; tap: rank by best single score (coins).
    const rows: any = game === "tap"
      ? await db.execute(sql`SELECT user_id, max(user_name) name, max(score) best, count(*) plays FROM pvp_game_scores WHERE game=${game} GROUP BY user_id ORDER BY best DESC LIMIT 50`)
      : await db.execute(sql`SELECT user_id, max(user_name) name, count(*) FILTER (WHERE result='win') wins, count(*) plays FROM pvp_game_scores WHERE game=${game} GROUP BY user_id ORDER BY wins DESC LIMIT 50`);
    res.json((rows.rows || rows).map((r: any) => ({ userId: r.user_id, name: r.name, score: Number(r.best ?? r.wins ?? 0), plays: Number(r.plays || 0) })));
  });

  // Browse all open rooms (in the lobby, not yet started)
  app.get("/api/reborn/games/rooms", requireAuth, async (_req, res) => {
    const list = Array.from(rooms.values())
      .filter((r) => r.status === "lobby")
      .map((r) => ({
        code: r.code, game: r.game,
        hostName: r.players.find((p) => p.id === r.hostId)?.name || "Host",
        players: r.players.length, max: r.game === "cards" ? CARDS_MAX : MAX_PLAYERS,
        hasPassword: !!r.password, createdAt: r.createdAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
    res.json(list);
  });

  // Create a room
  app.post("/api/reborn/games/rooms", requireAuth, async (req, res) => {
    const uid = getUserId(req)!;
    const game: GameKind = ["tap", "cards"].includes(req.body?.game) ? req.body.game : "rps";
    const cfg = await getGamesConfig();
    if (!availableToday(cfg)[game]) return res.status(400).json({ message: "That game isn't available today." });
    const name = await nameFor(uid);
    const room: Room = {
      code: code4(), game, hostId: uid, password: String(req.body?.password || "").trim(),
      status: "lobby", players: [{ id: uid, name, alive: true, taps: 0, connected: true }],
      round: 1, deadline: 0, message: "Waiting for players…", eliminatedThisRound: [],
      createdAt: Date.now(), subs: new Set(),
    };
    rooms.set(room.code, room);
    res.json({ code: room.code });
  });

  // Join a room
  app.post("/api/reborn/games/rooms/:code/join", requireAuth, async (req, res) => {
    const room = rooms.get(String(req.params.code).toUpperCase());
    if (!room) return res.status(404).json({ message: "Room not found (it may have ended)." });
    if (room.status !== "lobby") return res.status(400).json({ message: "This game has already started." });
    if (room.password && String(req.body?.password || "") !== room.password) return res.status(403).json({ message: "Wrong room password." });
    const uid = getUserId(req)!;
    if (!room.players.find((p) => p.id === uid)) {
      const cap = room.game === "cards" ? CARDS_MAX : MAX_PLAYERS;
      if (room.players.length >= cap) return res.status(400).json({ message: `Room is full (${cap} players).` });
      room.players.push({ id: uid, name: await nameFor(uid), alive: true, taps: 0, connected: true });
      broadcast(room);
    }
    res.json({ code: room.code });
  });

  // Host starts the game (any time, min 2 players)
  app.post("/api/reborn/games/rooms/:code/start", requireAuth, async (req, res) => {
    const room = rooms.get(String(req.params.code).toUpperCase());
    if (!room) return res.status(404).json({ message: "Room not found" });
    if (getUserId(req) !== room.hostId) return res.status(403).json({ message: "Only the host can start." });
    if (room.status !== "lobby") return res.status(400).json({ message: "Already started." });
    if (room.players.length < 2) return res.status(400).json({ message: "Need at least 2 players." });
    if (room.game === "rps") { room.round = 1; startRpsRound(room); }
    else if (room.game === "cards") startCards(room);
    else startTap(room);
    res.json({ ok: true });
  });

  // Play again — host recycles the finished room back to the lobby.
  app.post("/api/reborn/games/rooms/:code/restart", requireAuth, async (req, res) => {
    const room = rooms.get(String(req.params.code).toUpperCase());
    if (!room) return res.status(404).json({ message: "Room not found" });
    if (getUserId(req) !== room.hostId) return res.status(403).json({ message: "Only the host can restart." });
    if (room.status !== "done") return res.status(400).json({ message: "Game still in progress." });
    resetRoom(room);
    res.json({ ok: true });
  });

  // Player action: {choice} for rps, {tap:true} for tap
  app.post("/api/reborn/games/rooms/:code/action", requireAuth, async (req, res) => {
    const room = rooms.get(String(req.params.code).toUpperCase());
    if (!room) return res.status(404).json({ message: "Room not found" });
    const p = room.players.find((x) => x.id === getUserId(req));
    if (!p) return res.status(403).json({ message: "You're not in this room." });
    if (room.status !== "playing") return res.json({ ok: false });
    if (room.game === "cards") {
      const r = cardAction(room, getUserId(req)!, req.body || {});
      if (r.error) return res.status(400).json({ message: r.error });
      return res.json({ ok: true });
    }
    if (room.game === "rps") {
      const choice = req.body?.choice as Choice;
      if (!["rock", "paper", "scissors"].includes(choice)) return res.status(400).json({ message: "Bad choice" });
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
    const room = rooms.get(String(req.params.code).toUpperCase());
    if (room) {
      const uid = getUserId(req);
      room.players = room.players.filter((p) => p.id !== uid);
      if (!room.players.length || uid === room.hostId) { clearTimers(room); for (const s of room.subs) { try { s.res.end(); } catch {} } rooms.delete(room.code); }
      else broadcast(room);
    }
    res.json({ ok: true });
  });

  // Live state stream (SSE)
  app.get("/api/reborn/games/rooms/:code/stream", requireAuth, async (req, res) => {
    const room = rooms.get(String(req.params.code).toUpperCase());
    if (!room) return res.status(404).end();
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    const sub = { res, uid: getUserId(req) || undefined };
    res.write(`data: ${JSON.stringify(view(room, sub.uid))}\n\n`);
    room.subs.add(sub);
    const ping = setInterval(() => { try { res.write(": ping\n\n"); } catch {} }, 25_000);
    req.on("close", () => { clearInterval(ping); room.subs.delete(sub); });
  });
}
