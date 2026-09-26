// Live PvP mini-games — ephemeral in-memory rooms synced to clients over SSE.
// Games: rps (rock-paper-scissors elimination), tap (60s tap/mining race).
// Leaderboards + which-game-on-which-day config persist in Postgres.
import type { Express, Request, Response } from "express";
import { and, desc, eq, sql, inArray } from "drizzle-orm";
import { db } from "./db";
import { users, pvpScores, appSettings, gameRanks } from "@shared/schema";
import { requireAuth, getUserId } from "./multiAuth";

type Choice = "rock" | "paper" | "scissors";
type GameKind = "rps" | "tap" | "cards" | "dice" | "wheel" | "riding";
interface Card { id: string; v: string; s: string; }
interface Bid { face: number; qty: number; by: string; strike?: boolean }
interface Player { id: string; name: string; choice?: Choice | null; alive: boolean; taps: number; connected: boolean; hand?: Card[]; dice?: number[]; }
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
  turnIdx?: number; phase?: "draw" | "discard"; drawnFrom?: "deck" | "discard" | null; cardReveal?: any;
  // dice-only
  bid?: Bid | null; jokerActive?: boolean; jokerReenableAt?: number; diceReveal?: any;
  // series (best-of / play to N wins)
  winTarget?: number; seriesScore?: Record<string, number>; seriesChampionId?: string;
  // wheel-only
  wheelResult?: any; wheelSpun?: string[]; wheelPrizes?: { label: string; cups?: number; w: number; emoji?: string }[];
  // riding (Red Riding Hood) only
  tiles?: { id: number; kind: "grandma" | "laughing" | "wolf"; flipped: boolean; by?: string }[];
  ridingClicks?: number; flippedThisTurn?: number; wolfCounts?: Record<string, number>; ridingReveal?: boolean;
  facesCount?: number;
}

const rooms = new Map<string, Room>();
const MAX_PLAYERS = 20;
const CARDS_MAX = 5;
const RPS_SECONDS = 20;
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
  // Award +1 career rank star to each winner; the round's loser drops 1 star.
  const season = (await getRankConfig()).season;
  for (const r of rows.filter((x) => x.result === "win")) {
    await db.insert(gameRanks).values({ userId: r.userId, userName: r.name, stars: 1, peakStars: 1, season })
      .onConflictDoUpdate({ target: gameRanks.userId, set: { stars: sql`${gameRanks.stars} + 1`, peakStars: sql`greatest(${gameRanks.peakStars}, ${gameRanks.stars} + 1)`, userName: r.name, updatedAt: new Date() } })
      .catch(() => {});
  }
  if (room.lastLoserId) {
    await db.update(gameRanks).set({ stars: sql`greatest(0, ${gameRanks.stars} - 1)`, updatedAt: new Date() }).where(eq(gameRanks.userId, room.lastLoserId)).catch(() => {});
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
    bumpSeries(room, survivors[0]?.id);
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
  bumpSeries(room, top?.id);
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
  room.deck = undefined; room.discardTop = null; room.discardBy = null; room.turnIdx = undefined; room.phase = undefined; room.drawnFrom = null; room.cardReveal = null;
  room.bid = null; room.jokerActive = true; room.jokerReenableAt = undefined; room.diceReveal = null;
  room.wheelResult = null; room.wheelSpun = []; room.tiles = undefined; room.flippedThisTurn = 0; room.wolfCounts = {}; room.ridingReveal = false;
  // A finished series resets the tally for a fresh one; mid-series keeps it.
  if (room.seriesChampionId) { room.seriesScore = {}; room.seriesChampionId = undefined; }
  for (const p of room.players) { p.choice = null; p.alive = true; p.taps = 0; p.hand = undefined; p.dice = undefined; }
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
  room.message = `${winner.name} completed 3 pairs — take a look! 🃏`;
  broadcast(room);
  room.timer = setTimeout(async () => {
    room.status = "done";
    room.winnerId = winnerId;
    const rows: { userId: string; name: string; score: number; result: "win" | "lose" }[] = [{ userId: winner.id, name: winner.name, score: 1, result: "win" }];
    if (via === "deck") {
      room.message = `${winner.name} drew the winning card — BIG WIN, everyone else loses! 🏆`;
      for (const p of room.players) if (p.id !== winnerId) rows.push({ userId: p.id, name: p.name, score: 0, result: "lose" });
    } else {
      room.message = `${winner.name} matched ${loser ? loser.name + "'s" : "the"} discard and wins! 🏆`;
      if (loser && loser.id !== winnerId) rows.push({ userId: loser.id, name: loser.name, score: 0, result: "lose" });
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
  room.message = "Deck ran out — it's a tie, no winner.";
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
  room.message = `${p.name} ran out of time — LOSES! 🍻`;
  broadcast(room);
  room.timer = setTimeout(() => {
    room.status = "done";
    room.winnerId = winnerId;
    const winner = room.players.find((x) => x.id === winnerId);
    room.message = `${p.name} ran out of time and loses! 🍻${winner ? "  " + winner.name + " wins 🏆" : ""}`;
    broadcast(room);
    bumpSeries(room, winnerId);
    const rows: { userId: string; name: string; score: number; result: "win" | "lose" }[] = [{ userId: loserId, name: p.name, score: 0, result: "lose" }];
    if (winner && winner.id !== loserId) rows.push({ userId: winner.id, name: winner.name, score: 1, result: "win" });
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
  room.message = `${room.players[idx].name} opens — bid at least ${minOpenBid(room)} dice`;
  armDiceTimer(room);
  broadcast(room);
}
function nextAliveIdx(room: Room, from: number): number {
  for (let i = 1; i <= room.players.length; i++) { const j = (from + i) % room.players.length; if (room.players[j].alive) return j; }
  return from;
}
// Validate + apply a bid. Returns error string or "".
function applyDiceBid(room: Room, uid: string, face: number, qty: number, strike: boolean): string {
  const idx = room.players.findIndex((p) => p.id === uid);
  if (idx !== room.turnIdx) return "Not your turn";
  face = Math.max(1, Math.min(6, Math.floor(face))); qty = Math.floor(qty);
  if (!room.bid) { if (qty < minOpenBid(room)) return `Opening bid must be at least ${minOpenBid(room)} dice`; }
  else { if (!(qty > room.bid.qty || (qty === room.bid.qty && face > room.bid.face))) return `Too low! The call is ${room.bid.qty} × ${room.bid.face === 1 ? "①" : room.bid.face}. You must raise the number, or bid more total dice (above ${room.bid.qty}).`; }
  // Re-enable joker if this bid reaches the threshold, THEN a 1s-bid or strike disables it.
  if (!room.jokerActive && room.jokerReenableAt && qty >= room.jokerReenableAt) { room.jokerActive = true; room.jokerReenableAt = undefined; }
  if (face === 1 || strike) { room.jokerActive = false; room.jokerReenableAt = Math.floor(qty * 1.5) + 1; }
  room.bid = { face, qty, by: uid, strike };
  room.turnIdx = nextAliveIdx(room, idx);
  room.message = `${room.players[idx].name} bid ${qty}× ${face === 1 ? "①(ones)" : face}${strike ? " · strike" : ""} — ${room.players[room.turnIdx].name}'s turn`;
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
  room.message = lie
    ? `Caught the bluff! Only ${actual}× ${bid.face} — ${loser?.name} LOSES! 💀`
    : `There were ${actual}× ${bid.face} — ${loser?.name} caught wrong and LOSES! 💀`;
  broadcast(room);
  // Game ends on the first loss.
  room.timer = setTimeout(() => {
    room.status = "done";
    room.winnerId = winnerId;
    room.message = `${loser?.name} loses! 🍻  ${winner ? winner.name + " called it right 🏆" : ""}`;
    broadcast(room);
    bumpSeries(room, winnerId);
    const rows: { userId: string; name: string; score: number; result: "win" | "lose" }[] = [];
    if (winner) rows.push({ userId: winner.id, name: winner.name, score: 1, result: "win" });
    if (loser && loser.id !== winnerId) rows.push({ userId: loser.id, name: loser.name, score: 0, result: "lose" });
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
const WHEEL_PRIZES = [
  { label: "Half cup", cups: 0.5, w: 3, emoji: "🥤" },
  { label: "1 cup", cups: 1, w: 2, emoji: "🍺" },
  { label: "2 cups", cups: 2, w: 1, emoji: "🍺🍺" },
];
const WHEEL_TURN_SECONDS = 20;
const wheelPrizesOf = (room: Room) => (room.wheelPrizes && room.wheelPrizes.length ? room.wheelPrizes : WHEEL_PRIZES);
function startWheel(room: Room) {
  clearTimers(room);
  room.wheelSpun = []; room.wheelResult = null;
  room.turnIdx = Math.floor(Math.random() * room.players.length);
  room.status = "playing";
  room.message = `${room.players[room.turnIdx].name}'s turn — spin the wheel!`;
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
  room.wheelResult = { playerId: uid, name: p.name, index: pi, label: prize.label, cups: prize.cups, emoji: prize.emoji };
  room.status = "reveal";
  room.message = `${p.name} must drink ${prize.label}! ${prize.emoji}`;
  broadcast(room);
  room.timer = setTimeout(() => {
    if ((room.wheelSpun || []).length >= room.players.length) {
      room.status = "done"; room.message = "Everyone's spun — cheers! 🍻"; broadcast(room); scheduleCleanup(room);
    } else {
      room.turnIdx = nextAliveIdx(room, room.turnIdx ?? 0);
      // skip players who already spun
      let guard = 0;
      while ((room.wheelSpun || []).includes(room.players[room.turnIdx].id) && guard++ < room.players.length) room.turnIdx = (room.turnIdx + 1) % room.players.length;
      room.status = "playing"; room.wheelResult = null;
      room.message = `${room.players[room.turnIdx].name}'s turn — spin!`;
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
function startRiding(room: Room) {
  clearTimers(room);
  const n = Math.max(9, Math.min(36, room.facesCount || 16));
  // Every tile looks like a granny. Some are wolves in disguise (lose, drink 1),
  // and 1 is a witch (lose, drink double). The rest are real grannies (safe).
  const wolves = Math.max(1, Math.floor(n / 9));
  const kinds: ("grandma" | "wolf" | "witch")[] = ["witch"];
  for (let i = 0; i < wolves; i++) kinds.push("wolf");
  while (kinds.length < n) kinds.push("grandma");
  for (let i = kinds.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
  room.tiles = kinds.map((k, i) => ({ id: i, kind: k, flipped: false }));
  room.wolfCounts = {}; room.flippedThisTurn = 0; room.ridingReveal = false;
  room.turnIdx = Math.floor(Math.random() * room.players.length);
  room.status = "playing";
  room.message = `${room.players[room.turnIdx].name}, tap ${room.ridingClicks} granny${(room.ridingClicks || 1) > 1 ? "s" : ""}!`;
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
    room.message = t.kind === "witch"
      ? `🧙 It's the WITCH! ${p.name} loses — drink DOUBLE! 🍻🍻`
      : `🐺 A WOLF in granny's clothes! ${p.name} loses — drink 1 cup! 🍻`;
    broadcast(room);
    room.timer = setTimeout(async () => {
      room.status = "done"; room.message = `${p.name} loses!`;
      broadcast(room);
      await saveScores(room, [{ userId: uid, name: p.name, score: 0, result: "lose" }]);
      scheduleCleanup(room);
    }, 4500);
    return true;
  }
  // Safe granny — keep going until you've tapped your quota.
  room.flippedThisTurn = (room.flippedThisTurn || 0) + 1;
  if ((room.flippedThisTurn || 0) >= (room.ridingClicks || 1) || room.tiles!.every((x) => x.flipped)) {
    room.flippedThisTurn = 0;
    room.turnIdx = nextAliveIdx(room, idx);
    room.message = `${room.players[room.turnIdx].name}, tap ${room.ridingClicks} granny${(room.ridingClicks || 1) > 1 ? "s" : ""}!`;
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

// ── Config: which game is available which weekday ───────────────────────
const GAME_KEYS = ["rps", "tap", "cards", "dice", "wheel", "riding"] as const;
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
    res.json(rows.map((r) => ({ userId: r.userId, name: r.userName || "Player", stars: r.stars, peakStars: r.peakStars })));
  });
  app.post("/api/reborn/rank/config", requireAuth, async (req, res) => {
    const uid = getUserId(req); const [u] = uid ? await db.select().from(users).where(eq(users.id, uid)) : [];
    if (!u || u.role !== "admin") return res.status(403).json({ message: "Admin only" });
    const cur = await getRankConfig();
    const tiers = Array.isArray(req.body?.tiers) && req.body.tiers.length ? req.body.tiers : cur.tiers;
    await saveRankConfig({ season: cur.season, seasonStarDrop: Math.max(0, Number(req.body?.seasonStarDrop) ?? cur.seasonStarDrop), tiers });
    res.json(await getRankConfig());
  });
  app.post("/api/reborn/rank/new-season", requireAuth, async (req, res) => {
    const uid = getUserId(req); const [u] = uid ? await db.select().from(users).where(eq(users.id, uid)) : [];
    if (!u || u.role !== "admin") return res.status(403).json({ message: "Admin only" });
    const cfg = await getRankConfig();
    const drop = cfg.seasonStarDrop;
    await db.update(gameRanks).set({ stars: sql`greatest(0, ${gameRanks.stars} - ${drop})`, season: cfg.season + 1, updatedAt: new Date() });
    await saveRankConfig({ ...cfg, season: cfg.season + 1 });
    res.json({ ok: true, season: cfg.season + 1, dropped: drop });
  });

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
    const game: GameKind = ["tap", "cards", "dice", "wheel", "riding"].includes(req.body?.game) ? req.body.game : "rps";
    const cfg = await getGamesConfig();
    if (!availableToday(cfg)[game]) return res.status(400).json({ message: "That game isn't available today." });
    const name = await nameFor(uid);
    const room: Room = {
      code: code4(), game, hostId: uid, password: String(req.body?.password || "").trim(),
      status: "lobby", players: [{ id: uid, name, alive: true, taps: 0, connected: true }],
      round: 1, deadline: 0, message: "Waiting for players…", eliminatedThisRound: [],
      winTarget: Math.max(1, Math.min(10, Math.floor(Number(req.body?.winTarget) || 1))), seriesScore: {},
      ridingClicks: Math.max(1, Math.min(4, Math.floor(Number(req.body?.ridingClicks) || 1))),
      facesCount: Math.max(9, Math.min(36, Math.floor(Number(req.body?.facesCount) || 16))),
      wheelPrizes: Array.isArray(req.body?.wheelPrizes)
        ? req.body.wheelPrizes.map((s: any) => String(s).trim()).filter(Boolean).slice(0, 12).map((label: string) => ({ label, w: 1, emoji: "🍺" }))
        : undefined,
      createdAt: Date.now(), subs: new Set(),
    };
    rooms.set(room.code, room);
    res.json({ code: room.code });
  });

  // Join a room
  app.post("/api/reborn/games/rooms/:code/join", requireAuth, async (req, res) => {
    const room = rooms.get(String(req.params.code).toUpperCase());
    if (!room) return res.status(404).json({ message: "Room not found (it may have ended)." });
    const uid = getUserId(req)!;
    const existing = room.players.find((p) => p.id === uid);
    // Already in this room → allow rejoin/reconnect any time (after backgrounding
    // the app, etc.), even mid-game, so you never lose control of your room.
    if (existing) return res.json({ code: room.code });
    if (room.status !== "lobby") return res.status(400).json({ message: "This game has already started." });
    if (room.password && String(req.body?.password || "") !== room.password) return res.status(403).json({ message: "Wrong room password." });
    const cap = room.game === "cards" ? CARDS_MAX : MAX_PLAYERS;
    if (room.players.length >= cap) return res.status(400).json({ message: `Room is full (${cap} players).` });
    room.players.push({ id: uid, name: await nameFor(uid), alive: true, taps: 0, connected: true });
    broadcast(room);
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
    else if (room.game === "dice") startDiceRound(room);
    else if (room.game === "wheel") startWheel(room);
    else if (room.game === "riding") startRiding(room);
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
    if (room.game === "wheel") {
      if (req.body?.act === "spin") wheelSpin(room, getUserId(req)!);
      return res.json({ ok: true });
    }
    if (room.game === "riding") {
      if (req.body?.act === "flip") {
        const uid = getUserId(req)!;
        if (room.players[room.turnIdx ?? 0]?.id !== uid) return res.status(400).json({ message: "Not your turn" });
        ridingFlip(room, uid, Number(req.body?.tileId));
      }
      return res.json({ ok: true });
    }
    if (room.game === "dice") {
      const uid = getUserId(req)!;
      const act = req.body?.act;
      if (act === "catch") {
        if (!room.bid) return res.status(400).json({ message: "No bid to catch yet." });
        if (uid === room.bid.by) return res.status(400).json({ message: "You can't catch your own bid." });
        if (!p.alive) return res.status(400).json({ message: "You're out." });
        resolveDiceCatch(room, uid);
        return res.json({ ok: true });
      }
      if (act === "bid") {
        const err = applyDiceBid(room, uid, Number(req.body?.face), Number(req.body?.qty), !!req.body?.strike);
        if (err) return res.status(400).json({ message: err });
        return res.json({ ok: true });
      }
      return res.status(400).json({ message: "Bad action" });
    }
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
