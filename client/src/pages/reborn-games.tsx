import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RebornLayout } from "@/components/RebornLayout";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, Users, Lock, Play, LogOut, Crown, Pickaxe, Medal, ChevronLeft, ChevronRight } from "lucide-react";
import MobileBackButton from "@/components/mobile-back-button";
import { RankBadge } from "@/components/RankBadge";
import { useRankConfig, useMyRank, computeRank } from "@/lib/rank";
import { sfx } from "@/lib/sfx";

const GAMES: Record<string, { name: string; emoji: string; blurb: string }> = {
  rps: { name: "Rock Paper Scissors", emoji: "✊", blurb: "20s to throw · winners are safe · last one left drinks" },
  tap: { name: "Gold Rush (Tap)", emoji: "⛏️", blurb: "30s dig — most gold coins wins" },
  cards: { name: "Card Match", emoji: "🃏", blurb: "3 pairs to win (A+9,2+8…J+J) · max 5 players" },
  draw: { name: "Draw & Guess", emoji: "🎨", blurb: "One draws the secret word · first right guess wins with the drawer" },
  bridge: { name: "Glass Bridge", emoji: "🌉", blurb: "10 rows of glass · pick left or right · wrong = fall & drink" },
  memory: { name: "Memory Match", emoji: "🧠", blurb: "2 players · flip 2 cards, same number = point & go again" },
  rlgl: { name: "Red Light, Green Light", emoji: "🚦", blurb: "tap left-right to walk on green · freeze on red · 3 min to cross" },
  frog: { name: "Frog Jump", emoji: "🐸", blurb: "tap a frog in 5s · same frog as the turn player = ½ cup" },
  poker3: { name: "3-Card Poker", emoji: "🂡", blurb: "play blind, raise ½ cup · look = pay double · worst hand drinks the pot" },
  dice: { name: "Dice Bluffing Game", emoji: "🎲", blurb: "5 dice each · bluff the count · catch the liar" },
  wheel: { name: "Spin the Wheel", emoji: "🎡", blurb: "½ cup · 1 cup · 2 cups — or land on PASS 😎" },
  riding: { name: "Red Riding Hood", emoji: "👵", blurb: "tap grannies · dodge the 🐺 wolf & 🧙 witch" },
  timer: { name: "Stop the Clock", emoji: "⏱️", blurb: "stop closest to the target (10s or random 5–20s) · up to 20" },
  "789": { name: "789 Dice", emoji: "🎯", blurb: "2 dice · 7 top-up · 8 half · 9 whole cup 🍺" },
  stack: { name: "Tower Stack", emoji: "🧱", blurb: "one tower, take turns · whoever knocks it over loses" },
  number: { name: "Guess the Number", emoji: "🔢", blurb: "one 4-digit number, guess any time · no host, runs 24/7" },
};
const HAND: Record<string, string> = { rock: "✊", paper: "✋", scissors: "✌️" };

const GAME_GRAD: Record<string, string> = {
  rps: "linear-gradient(135deg,#f0d787,#c9a84c)", tap: "linear-gradient(135deg,#ffd27a,#e0870f)",
  cards: "linear-gradient(135deg,#c49bff,#7c3aed)", dice: "linear-gradient(135deg,#66e2ff,#17b3e6)",
  wheel: "linear-gradient(135deg,#ff8ab5,#e0398b)", riding: "linear-gradient(135deg,#ff9a6b,#d1402a)",
  timer: "linear-gradient(135deg,#7affc0,#12b36a)", "789": "linear-gradient(135deg,#ffd27a,#e0398b)", poker3: "linear-gradient(135deg,#34d399,#0f766e)", frog: "linear-gradient(135deg,#86efac,#15803d)", rlgl: "linear-gradient(135deg,#34d399,#e11d48)", memory: "linear-gradient(135deg,#a78bfa,#6d28d9)", bridge: "linear-gradient(135deg,#7dd3fc,#1e3a8a)", draw: "linear-gradient(135deg,#fda4af,#7c3aed)",
  stack: "linear-gradient(135deg,#8ee0ff,#3a7bd5)", number: "linear-gradient(135deg,#9ab4ff,#4361e6)",
};
// Games grouped into categories for the lobby.
const GAME_CATEGORIES: { name: string; emoji: string; games: string[] }[] = [
  { name: "Guessing game", emoji: "🧠", games: ["number", "rps", "draw"] },
  { name: "Dice game", emoji: "🎲", games: ["dice", "789"] },
  { name: "Card game", emoji: "🃏", games: ["cards", "poker3", "memory"] },
  { name: "Who's the fastest", emoji: "⚡", games: ["tap", "timer", "stack", "rlgl"] },
  { name: "Lucky game", emoji: "🍀", games: ["wheel", "riding", "frog", "bridge"] },
];

const RULES: Record<string, string[]> = {
  rps: [
    "Everyone throws ✊ ✋ ✌️ within 20 seconds.",
    "The winning sign is safe 🎉 — the losers play on.",
    "Didn't pick in time? You stay in and play on.",
    "All the same sign or all three signs = draw, go again.",
    "Last player left loses — drink! 🍺",
  ],
  tap: [
    "When it says DIG, tap the button as fast as you can.",
    "Every tap = 1 gold coin ⛏️🪙.",
    "You have 30 seconds — most coins wins.",
    "Lowest score buys the round 😄.",
  ],
  draw: [
    "3–20 players. A random player becomes the drawer and secretly gets a word — a food, an animal or an item.",
    "Everyone else sees the hint: the category and the letter blanks (a letter is revealed at 2:00 and 4:00).",
    "The drawer draws it on the board — no writing letters! Everyone types guesses.",
    "First correct guess wins: that guesser AND the drawer win, everyone else drinks 🍺.",
    "Nobody gets it within 5 minutes → everyone loses, the drawer too (draw better!).",
  ],
  bridge: [
    "A glass bridge with 10 rows — each row has a LEFT and a RIGHT panel. Only one is safe.",
    "Players cross one at a time (random order). On your turn tap LEFT or RIGHT for the next row (15s).",
    "Safe glass → you step forward. Wrong glass → it shatters, you fall, you're OUT and drink 1 cup 🍺.",
    "Every broken row is shown to everyone, so the next walker skips straight past the known rows.",
    "Everyone who reaches the end wins 🏁 (many winners possible). If nobody makes it, nobody wins. Up to 20 players.",
  ],
  memory: [
    "2 players. 30 cards face-down (6 × 5) — 15 pairs of numbers.",
    "On your turn flip any 2 cards.",
    "Same number = +1 point and you flip 2 more!",
    "Different = they flip back and it's the other player's turn. Remember where they were 🧠",
    "When all pairs are found, most pairs wins — the loser drinks 🍺 (tie = both drink). 20s per flip.",
  ],
  rlgl: [
    "Everyone gets a player number and starts at the bottom of the field.",
    "🟢 GREEN LIGHT: tap LEFT, RIGHT, LEFT, RIGHT… in order to walk (wrong order doesn't count).",
    "🔴 RED LIGHT: freeze! Tap while it's red and you're OUT.",
    "500 steps (250 left + 250 right) reaches the finish line. You have 3 minutes.",
    "Everyone who crosses wins 🏁 — the rest drink 🍺.",
  ],
  frog: [
    "Three frogs 🐸🐸🐸. On your turn press START.",
    "Then EVERYONE (you too) has 5 seconds to tap one frog — nobody sees the others' picks.",
    "Tapped the same frog as the turn player? Drink ½ cup 🍺.",
    "Didn't tap in time? Drink ½ cup too (the turn player included).",
    "Then it's the next player's turn — keeps going until everyone leaves.",
  ],
  poker3: [
    "Everyone gets 3 cards FACE-DOWN and starts blind — you can't see your own cards. Everyone's in for the host's minimum cup.",
    "Your turn while blind: CALL (add the stake), RAISE (+½ cup to the stake) or LOOK at your cards.",
    "Scared? Look — but once you've seen your cards you pay DOUBLE.",
    "Seen player: FOLLOW (pay double) → everyone must open their cards, the WORST hand drinks the whole pot. Or FOLD → you drink the whole pot yourself.",
    "Hands, best first: Straight flush › Trail / three of a kind (AAA is the top) › Flush › Straight (e.g. 2-3-4) › Pair (e.g. 4-4-3) › High card.",
    "Pot reaches the host's maximum → everyone opens automatically, and nobody drinks more than the max. 30s per turn (blind auto-calls, seen auto-folds).",
  ],
  cards: [
    "Goal: hold 3 matching pairs — A+9, 2+8, 3+7, 4+6, 5+5, J+J, Q+Q, K+K.",
    "On your turn (20s): take the face-up discard OR draw the deck, then discard 1.",
    "If someone discards the card that completes your 3 pairs, you WIN and they lose.",
    "Draw your winning card from the deck = BIG WIN — everyone else loses!",
    "Take too long (20s) and a card is auto-picked & discarded for you.",
    "Deck runs out with no winner = tie.",
  ],
  dice: [
    "Everyone rolls 5 hidden dice. Bid how many of a number are on the table across ALL players.",
    "① (ones) are wild — they count as any number.",
    "Each turn you have 20s to raise the bid (more dice, or same dice with a higher number) OR catch. Run out of time = you lose!",
    "Anyone can Catch (you'll confirm first). If the real count is LESS than the bid, the bidder loses. If it's enough, the catcher loses.",
    "Bid on ① or hit Strike → ones stop being wild, until a bid reaches 1.5× that amount.",
    "The round ends the moment someone loses — they drink 🍻; whoever called it right wins 🏆.",
  ],
  wheel: [
    "Take turns spinning the wheel.",
    "14 slices: 4× ½ cup, 2× 1 cup, 1× 2 cups — and a PASS 😎 between every drink.",
    "Land on a drink and you drink it; land on PASS and you're safe — cheers!",
    "Everyone spins once, then the round ends.",
  ],
  riding: [
    "Every tile is a granny face 👵 — but wolves are hiding among them!",
    "On your turn, tap the number of grannies the host set (1–4).",
    "🐺 Tap a wolf in granny's clothes → you lose and drink 1 cup, game over.",
    "🧙 Tap the witch → you lose and drink DOUBLE, game over.",
    "Tap only real grannies to stay safe!",
  ],
  timer: [
    "The host starts the stopwatch — it counts up from 00:00.",
    "The target is 10:00 — or, if the host picked Random, a surprise time from 5:00 to 20:00 shown when the game starts.",
    "Hit STOP as close to the target as you can; your time locks in instantly.",
    "Whoever stops closest wins 🏆; everyone else loses.",
    "Same time = shared win (2 or 3 winners is fine). Up to 20 players.",
  ],
  stack: [
    "Everyone builds ONE tower together — take turns, one block each (top-down view).",
    "The block slides on one axis and it alternates each turn: ↔ horizontal, then ↕ vertical.",
    "Tap to drop it (10 seconds). Off-centre? The overhang on that axis is sliced off, so the next block is smaller.",
    "Miss the tower (or run out of time) and it falls — YOU lose, everyone else wins 🏆.",
  ],
  "789": [
    "On your turn, roll the 2 dice 🎲🎲.",
    "Sum = 7 → top up the communal cup 🍺. Sum = 8 → drink HALF. Sum = 9 → drink the WHOLE cup.",
    "Roll a 7, 8 or 9 and you roll AGAIN — keep going until you roll something else, then it passes on.",
    "Doubles (two of the same) reverse the turn direction 🔄.",
    "Snake eyes (1 + 1) → pick anyone to down the whole cup, and it becomes their turn.",
    "A party game — it just keeps going. Leave any time; the rest play on.",
  ],
  number: [
    "One secret 4-digit number (0–9999) runs for everyone — no host needed.",
    "Guess any time. After each guess you're told to go higher ⬆️ or lower ⬇️.",
    "The live range and everyone's guess history help you close in.",
    "First person to hit the exact number wins 🏆 and the round ends.",
    "A fresh number auto-generates instantly — it never stops, day or night.",
  ],
};

function HowToPlay({ game, onClose }: { game: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="rwg-card p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-extrabold text-white mb-3">{GAMES[game]?.emoji} How to play — {GAMES[game]?.name}</h3>
        <ol className="space-y-2">
          {(RULES[game] || []).map((line, i) => (
            <li key={i} className="flex gap-2 text-sm text-white/80"><span className="text-amber-300 font-bold">{i + 1}.</span><span>{line}</span></li>
          ))}
        </ol>
        <button onClick={onClose} className="cbtn cbtn-gold mt-4 w-full py-3">Got it!</button>
      </div>
    </div>
  );
}

const post = (path: string, body?: any) => apiRequest("POST", path, body || {}).then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({})) }));

const ROOM_KEY = "rw_game_room";
export default function RebornGames() {
  // Persist the room code so closing/backgrounding the app doesn't strand you
  // out of your open room — on reopen we drop you straight back in.
  const [code, setCode] = useState<string>(() => { try { return localStorage.getItem(ROOM_KEY) || ""; } catch { return ""; } });
  const enter = (c: string) => { try { localStorage.setItem(ROOM_KEY, c); } catch {} setCode(c); };
  const exit = () => { try { localStorage.removeItem(ROOM_KEY); } catch {} setCode(""); };
  const [numberMode, setNumberMode] = useState(false);
  return (
    <RebornLayout active="/games" title="GAMES" hideNav={!!code || numberMode}>
      <div className="max-w-2xl mx-auto">
        {!code && !numberMode && <MobileBackButton className="mb-4" />}
        {code ? <Room code={code} onLeave={exit} />
          : numberMode ? <NumberGame onLeave={() => setNumberMode(false)} />
          : <Lobby onEnter={enter} onOpenNumber={() => setNumberMode(true)} />}
      </div>
    </RebornLayout>
  );
}

type GK = "rps" | "tap" | "cards" | "poker3" | "frog" | "rlgl" | "memory" | "bridge" | "draw" | "dice" | "wheel" | "riding" | "timer" | "789" | "stack" | "number";
function Lobby({ onEnter, onOpenNumber }: { onEnter: (c: string) => void; onOpenNumber: () => void }) {
  const { toast } = useToast();
  const [today, setToday] = useState<Record<string, boolean>>({});
  const [cat, setCat] = useState<string | null>(null);
  const [game, setGame] = useState<GK | null>(null);
  const [password, setPassword] = useState("");
  const [winTarget, setWinTarget] = useState(1);
  const [ridingClicks, setRidingClicks] = useState(2);
  const [facesCount, setFacesCount] = useState(16);
  const [wheelText, setWheelText] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinPw, setJoinPw] = useState("");
  const [lb, setLb] = useState<any[]>([]);
  const [help, setHelp] = useState<string | null>(null);

  const [openRooms, setOpenRooms] = useState<any[]>([]);
  const rankCfg = useRankConfig();
  const myRank = useMyRank();
  const [rankLb, setRankLb] = useState<any[]>([]);
  useEffect(() => { apiRequest("GET", "/api/reborn/rank/leaderboard").then((r) => r.json()).then(setRankLb).catch(() => {}); }, []);
  useEffect(() => { apiRequest("GET", "/api/reborn/games/config").then((r) => r.json()).then((d) => setToday(d.today || {})).catch(() => {}); }, []);
  useEffect(() => { setLb([]); if (game) apiRequest("GET", `/api/reborn/games/leaderboard?game=${game}`).then((r) => r.json()).then(setLb).catch(() => {}); }, [game]);
  const loadRooms = () => apiRequest("GET", "/api/reborn/games/rooms").then((r) => r.json()).then(setOpenRooms).catch(() => {});
  useEffect(() => { loadRooms(); const t = setInterval(loadRooms, 4000); return () => clearInterval(t); }, []);

  const cats = GAME_CATEGORIES.filter((c) => c.games.some((g) => today[g]));
  const curCat = cats.find((c) => c.name === cat) || null;
  const pickGame = (g: GK) => { setGame(g); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const shownRooms = game ? openRooms.filter((r) => r.game === game) : openRooms;

  const [creating, setCreating] = useState(false);
  const [timerMode, setTimerMode] = useState<"fixed" | "random">("fixed");
  const [pkMin, setPkMin] = useState(1); // half-cups
  const [pkMax, setPkMax] = useState(10); // half-cups
  const create = async () => {
    if (!game || creating) return; // ignore double/triple taps while the room is being made
    setCreating(true);
    try {
      const wheelPrizes = wheelText.split("\n").map((s) => s.trim()).filter(Boolean);
      const { ok, d } = await post("/api/reborn/games/rooms", { game, password, winTarget, ridingClicks, facesCount, timerMode, pkMin, pkMax, wheelPrizes: wheelPrizes.length ? wheelPrizes : undefined });
      if (!ok) return toast({ title: "Can't create", description: d.message, variant: "destructive" });
      onEnter(d.code);
    } finally { setCreating(false); }
  };
  const join = async () => {
    const { ok, d } = await post(`/api/reborn/games/rooms/${joinCode.trim().toUpperCase()}/join`, { password: joinPw });
    if (!ok) return toast({ title: "Can't join", description: d.message, variant: "destructive" });
    onEnter(d.code);
  };
  const joinRoom = async (r: any) => {
    const pw = r.hasPassword ? (prompt(`"${r.hostName}"'s room is locked 🔒 — enter the password:`) ?? "") : "";
    if (r.hasPassword && !pw) return;
    const { ok, d } = await post(`/api/reborn/games/rooms/${r.code}/join`, { password: pw });
    if (!ok) return toast({ title: "Can't join", description: d.message, variant: "destructive" });
    onEnter(d.code);
  };

  return (
    <div className="space-y-4">
      {/* Rank header — Mobile-Legends style ladder */}
      {rankCfg?.tiers && (
        <div className="rounded-2xl p-4 border border-amber-400/20" style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.18),rgba(201,168,76,0.12))" }}>
          <div className="mb-3">
            <p className="text-[11px] text-white/50 uppercase tracking-wider mb-1">Your rank · Season {rankCfg.season}</p>
            <RankBadge stars={myRank?.stars || 0} tiers={rankCfg.tiers} size="lg" />
          </div>
          <div className="rounded-xl bg-black/25 p-2">
            <p className="text-[11px] font-bold text-white/60 mb-1 flex items-center gap-1"><Medal className="w-3.5 h-3.5 text-amber-300" /> Top ranked players</p>
            {rankLb.length === 0 && <p className="text-[11px] text-white/40">Win a game to climb the ladder!</p>}
            {rankLb.slice(0, 5).map((r, i) => (
              <div key={r.userId} className="flex items-center gap-2 py-1">
                <span className="text-xs w-4 text-white/50 shrink-0">{i + 1}</span>
                <RankBadge stars={r.stars} tiers={rankCfg.tiers!} size="sm" />
                <span className="text-xs text-white/70 truncate">{r.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Live Games 🎮</h1>
          <p className="text-white/50 text-sm">Create a room, share the code, play head-to-head.</p>
        </div>
        <MuteToggle />
      </div>

      {!cat && (
        <div className="gcard p-4">
          <p className="text-xs text-white/50 mb-2 font-bold uppercase tracking-wider">Pick a category</p>
          <div className="grid grid-cols-1 gap-2.5">
            {cats.map((c) => {
              const n = c.games.filter((g) => today[g]).length;
              return (
                <button key={c.name} onClick={() => setCat(c.name)}
                  className="w-full min-w-0 flex items-center gap-3 p-3 rounded-2xl text-left border border-white/10 active:scale-[.98] transition"
                  style={{ background: "rgba(255,255,255,0.04)" }}>
                  <span className="gem shrink-0" style={{ width: 52, height: 52, fontSize: 28, background: "linear-gradient(135deg,#f0d787,#c9a44c)" }}>{c.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-extrabold text-white leading-tight">{c.name}</span>
                    <span className="block text-[11px] text-white/55 truncate">{n} game{n === 1 ? "" : "s"} · {c.games.filter((g) => today[g]).map((g) => GAMES[g].name).join(" · ")}</span>
                  </span>
                  <ChevronRight className="w-5 h-5 text-white/40 shrink-0" />
                </button>
              );
            })}
            {cats.length === 0 && <p className="text-xs text-white/40">No games scheduled today — check back tomorrow!</p>}
          </div>
        </div>
      )}

      {curCat && !game && (
        <div className="gcard p-4">
          <button onClick={() => setCat(null)} className="flex items-center gap-1 text-sm text-white/60 mb-3"><ChevronLeft className="w-4 h-4" /> Back</button>
          <p className="text-[11px] font-bold text-amber-300/80 uppercase tracking-wider mb-2">{curCat.emoji} {curCat.name}</p>
          <div className="grid grid-cols-1 gap-2.5">
            {(curCat.games.filter((g) => today[g]) as GK[]).map((g) => (
              <button key={g} onClick={() => pickGame(g)}
                className="w-full min-w-0 flex items-center gap-3 p-3 rounded-2xl text-left border border-white/10 active:scale-[.98] transition"
                style={{ background: "rgba(255,255,255,0.04)" }}>
                <span className="gem shrink-0" style={{ width: 48, height: 48, fontSize: 26, background: GAME_GRAD[g] }}>{GAMES[g].emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-extrabold text-white leading-tight">{GAMES[g].name}</span>
                  <span className="block text-[11px] text-white/55">{GAMES[g].blurb}</span>
                </span>
                <ChevronRight className="w-5 h-5 text-white/40 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {game && (
        <>
          <div className="gcard p-4">
            <button onClick={() => setGame(null)} className="flex items-center gap-1 text-sm text-white/60 mb-3"><ChevronLeft className="w-4 h-4" /> Back</button>
            <div className="flex items-center gap-3">
              <span className="gem shrink-0" style={{ width: 52, height: 52, fontSize: 28, background: GAME_GRAD[game] }}>{GAMES[game].emoji}</span>
              <span className="min-w-0">
                <span className="block text-xl font-extrabold text-white leading-tight">{GAMES[game].name}</span>
                <span className="block text-[11px] text-white/55">{GAMES[game].blurb}</span>
              </span>
            </div>
          </div>

          <div className="gcard p-4">
            <p className="font-extrabold text-white flex items-center gap-2 mb-2"><Trophy className="w-4 h-4 text-amber-300" /> Leaderboard</p>
            {lb.length === 0 && <p className="text-xs text-white/40">No scores yet — be the first!</p>}
            {lb.map((r, i) => (
              <div key={r.userId} className="flex items-center justify-between gap-2 py-1.5 border-b border-white/5 last:border-0 text-sm">
                <span className="text-white/80 truncate min-w-0">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`} {r.name}</span>
                <span className="text-amber-300 font-bold shrink-0">{r.score}{game === "tap" ? " coins" : game === "stack" ? " high" : " wins"}</span>
              </div>
            ))}
          </div>

          <div className="gcard p-4">
            <p className="text-xs text-white/50 mb-1 font-bold uppercase tracking-wider">{game === "number" ? "Play" : "Create a room"}</p>
            {game !== "number" && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 rounded-xl bg-black/30 border border-white/10 px-3">
                <Lock className="w-4 h-4 text-white/40" />
                <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Room password (optional)" className="flex-1 bg-transparent py-2.5 text-white text-sm focus:outline-none" />
              </div>
            </div>
            )}
            {game === "riding" && (
              <div className="mt-3 space-y-2">
                <div>
                  <p className="text-xs text-white/50 mb-1.5 font-bold uppercase tracking-wider">Faces on the board</p>
                  <div className="flex gap-2">{[9, 16, 25, 36].map((n) => <button key={n} onClick={() => setFacesCount(n)} className={`cbtn flex-1 py-2 text-xs ${facesCount === n ? "cbtn-gold" : "cbtn-dark"}`}>{n}</button>)}</div>
                </div>
                <div>
                  <p className="text-xs text-white/50 mb-1.5 font-bold uppercase tracking-wider">Faces to flip each turn</p>
                  <div className="flex gap-2">{[1, 2, 3, 4].map((n) => <button key={n} onClick={() => setRidingClicks(n)} className={`cbtn flex-1 py-2 text-xs ${ridingClicks === n ? "cbtn-gold" : "cbtn-dark"}`}>{n}</button>)}</div>
                </div>
              </div>
            )}
            {game === "wheel" && (
              <div className="mt-3">
                <p className="text-xs text-white/50 mb-1.5 font-bold uppercase tracking-wider">Punishments <span className="text-white/40 normal-case">— one per line (a PASS slice is added after each), or leave blank for the default wheel</span></p>
                <textarea value={wheelText} onChange={(e) => setWheelText(e.target.value)} rows={4} placeholder={"Default: ½ cup ×4, 1 cup ×2, 2 cups ×1\nwith a PASS between every drink\n(leave blank to use this)"} className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-white text-sm focus:outline-none" />
              </div>
            )}
            {game === "poker3" && (
              <div className="mt-3 space-y-2">
                <div>
                  <p className="text-xs text-white/50 mb-1.5 font-bold uppercase tracking-wider">Min cup (everyone's in for)</p>
                  <div className="flex gap-2">{[1, 2, 3, 4].map((u) => <button key={u} onClick={() => { setPkMin(u); if (pkMax < u * 4) setPkMax(u * 4); }} className={`cbtn flex-1 py-2 text-xs ${pkMin === u ? "cbtn-gold" : "cbtn-dark"}`}>{cupsLabel(u)}</button>)}</div>
                </div>
                <div>
                  <p className="text-xs text-white/50 mb-1.5 font-bold uppercase tracking-wider">Max cup (pot limit — loser never drinks more)</p>
                  <div className="flex gap-2">{[4, 6, 10, 20].filter((u) => u >= pkMin * 4 || u === 20).map((u) => <button key={u} onClick={() => setPkMax(u)} className={`cbtn flex-1 py-2 text-xs ${pkMax === u ? "cbtn-gold" : "cbtn-dark"}`}>{cupsLabel(u)}</button>)}</div>
                </div>
              </div>
            )}
            {game === "timer" && (
              <div className="mt-3">
                <p className="text-xs text-white/50 mb-1.5 font-bold uppercase tracking-wider">Target time</p>
                <div className="flex gap-2">
                  <button onClick={() => setTimerMode("fixed")} className={`cbtn flex-1 py-2.5 text-xs ${timerMode === "fixed" ? "cbtn-gold" : "cbtn-dark"}`}>10:00 (10 sec)</button>
                  <button onClick={() => setTimerMode("random")} className={`cbtn flex-1 py-2.5 text-xs ${timerMode === "random" ? "cbtn-gold" : "cbtn-dark"}`}>🎲 Random 5–20 sec</button>
                </div>
              </div>
            )}
            {game !== "wheel" && game !== "riding" && game !== "timer" && game !== "number" && game !== "poker3" && game !== "frog" && game !== "rlgl" && game !== "memory" && game !== "bridge" && game !== "draw" && (
            <div className="mt-3">
              <p className="text-xs text-white/50 mb-1.5 font-bold uppercase tracking-wider">Play to how many wins?</p>
              <div className="flex gap-2">
                {[[1, "Single game"], [3, "Best of 3"], [5, "5 wins"]].map(([v, l]) => (
                  <button key={v} onClick={() => setWinTarget(v as number)} className={`cbtn flex-1 py-2.5 text-xs ${winTarget === v ? "cbtn-gold" : "cbtn-dark"}`}>{l}</button>
                ))}
              </div>
            </div>
            )}
            {game === "number" && <p className="mt-3 text-[11px] text-white/50">No room needed — one 4-digit number runs for everyone. Guess any time; first to crack it wins and a fresh number rolls automatically, 24/7.</p>}
            <div className="mt-4 flex gap-2">
              <button onClick={() => setHelp(game)} className="cbtn cbtn-dark px-4 py-3.5 text-sm">How to play</button>
              {game === "number"
                ? <button onClick={onOpenNumber} disabled={!today.number} className="cbtn cbtn-gold flex-1 py-3.5 text-base">🔢 Play now</button>
                : <button onClick={create} disabled={!today[game] || creating} className="cbtn cbtn-gold flex-1 py-3.5 text-base">{creating ? "Creating…" : "🎮 Create room"}</button>}
            </div>
          </div>
        </>
      )}
      {help && <HowToPlay game={help} onClose={() => setHelp(null)} />}

      {game !== "number" && (
      <div className="gcard p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="font-extrabold text-white flex items-center gap-2"><Users className="w-4 h-4 text-amber-300" /> Open rooms</p>
          <button onClick={loadRooms} className="text-xs text-white/50">↻ Refresh</button>
        </div>
        {shownRooms.length === 0 && <p className="text-xs text-white/40">No open rooms — create one and invite friends!</p>}
        <div className="space-y-2">
          {shownRooms.map((r) => (
            <div key={r.code} className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-3 py-2.5">
              <span className="text-2xl">{GAMES[r.game]?.emoji || "🎮"}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate">{GAMES[r.game]?.name || r.game} {r.hasPassword ? "🔒" : ""}</p>
                <p className="text-[11px] text-white/50 truncate">{r.hostName}'s room · <b className="text-amber-300">{r.code}</b> · {r.players}/{r.max} players</p>
              </div>
              <button onClick={() => joinRoom(r)} disabled={r.players >= r.max} className="cbtn cbtn-cyan px-4 py-2 text-sm shrink-0">{r.players >= r.max ? "Full" : "Join"}</button>
            </div>
          ))}
        </div>
      </div>
      )}

      <div className="gcard p-4">
        <p className="text-xs text-white/50 mb-2 font-bold uppercase tracking-wider">Or join by code</p>
        <div className="flex flex-wrap gap-2">
          <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={4} placeholder="CODE" className="w-20 text-center tracking-widest font-extrabold rounded-xl bg-black/30 border border-white/10 py-2.5 text-white focus:outline-none" />
          <input value={joinPw} onChange={(e) => setJoinPw(e.target.value)} placeholder="Password (if any)" className="flex-1 min-w-0 rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-white text-sm focus:outline-none" />
          <button onClick={join} className="cbtn cbtn-cyan shrink-0 px-5 py-2.5">Join</button>
        </div>
      </div>

    </div>
  );
}

// Local ticking countdown that re-seeds from the server whenever `resetKey`
// changes (SSE only pushes on state change, so we tick between messages).
function useLocalCountdown(serverSeconds: number, resetKey: any) {
  const endsAt = useRef(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { endsAt.current = Date.now() + (serverSeconds || 0) * 1000; setNow(Date.now()); }, [resetKey]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 400); return () => clearInterval(t); }, []);
  return Math.max(0, Math.ceil((endsAt.current - now) / 1000));
}

function useRoom(code: string, onGone?: () => void) {
  const [room, setRoom] = useState<any>(null);
  useEffect(() => {
    let got = false;
    const es = new EventSource(`/api/reborn/games/rooms/${code}/stream`, { withCredentials: true } as any);
    es.onmessage = (e) => { got = true; try { setRoom(JSON.parse(e.data)); } catch {} };
    es.onerror = () => {};
    // If the room no longer exists (e.g. reopened after it ended), the stream
    // never sends a snapshot — bail back to the lobby instead of hanging.
    const gone = setTimeout(() => { if (!got) onGone?.(); }, 5000);
    return () => { clearTimeout(gone); es.close(); };
  }, [code]);
  return room;
}

function Room({ code, onLeave }: { code: string; onLeave: () => void }) {
  const room = useRoom(code, onLeave);
  const { user } = useAuth();
  const me = (user as any)?.id;
  const { toast } = useToast();
  const [help, setHelp] = useState(true); // show the tutorial when you enter
  const leave = async () => { await post(`/api/reborn/games/rooms/${code}/leave`); onLeave(); };

  if (!room) return <div className="rwg-card p-8 text-center text-white/50">Connecting to room {code}…</div>;
  const isHost = room.hostId === me;

  return (
    <div className="space-y-4">
      {help && <HowToPlay game={room.game} onClose={() => setHelp(false)} />}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/40">Room code</p>
          <p className="text-3xl font-black tracking-[0.3em] text-amber-300">{room.code}</p>
        </div>
        <div className="flex gap-2">
          <MuteToggle />
          <button onClick={() => setHelp(true)} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white/70 font-bold" title="How to play">?</button>
          <button onClick={leave} className="px-3 py-2 rounded-xl bg-red-500/15 border border-red-400/40 text-red-200 text-sm font-bold inline-flex items-center gap-1.5"><LogOut className="w-4 h-4" /> Leave</button>
        </div>
      </div>

      {room.status === "lobby" && <><SeriesBoard room={room} /><LobbyRoom room={room} code={code} isHost={isHost} /></>}
      {(room.status === "playing" || room.status === "reveal" || room.status === "done") && room.game === "rps" && <RpsGame room={room} code={code} me={me} />}
      {(room.status === "playing" || room.status === "reveal" || room.status === "done") && room.game === "tap" && <TapGame room={room} code={code} me={me} />}
      {(room.status === "playing" || room.status === "reveal" || room.status === "done") && room.game === "cards" && <CardGame room={room} code={code} me={me} />}
      {(room.status === "playing" || room.status === "done") && room.game === "poker3" && <PokerGame room={room} code={code} me={me} />}
      {(room.status === "playing" || room.status === "done") && room.game === "frog" && <FrogGame room={room} code={code} me={me} />}
      {(room.status === "playing" || room.status === "done") && room.game === "rlgl" && <RlglGame room={room} code={code} me={me} />}
      {(room.status === "playing" || room.status === "done") && room.game === "memory" && <MemoryGame room={room} code={code} me={me} />}
      {(room.status === "playing" || room.status === "done") && room.game === "bridge" && <BridgeGame room={room} code={code} me={me} />}
      {(room.status === "playing" || room.status === "done") && room.game === "draw" && <DrawGame room={room} code={code} me={me} />}
      {(room.status === "playing" || room.status === "reveal" || room.status === "done") && room.game === "dice" && <DiceGame room={room} code={code} me={me} />}
      {(room.status === "playing" || room.status === "reveal" || room.status === "done") && room.game === "wheel" && <WheelGame room={room} code={code} me={me} />}
      {(room.status === "playing" || room.status === "reveal" || room.status === "done") && room.game === "riding" && <RidingGame room={room} code={code} me={me} />}
      {(room.status === "playing" || room.status === "reveal" || room.status === "done") && room.game === "timer" && <TimerGame room={room} code={code} me={me} />}
      {(room.status === "playing" || room.status === "reveal" || room.status === "done") && room.game === "789" && <SevenGame room={room} code={code} me={me} />}
      {(room.status === "playing" || room.status === "reveal" || room.status === "done") && room.game === "stack" && <StackGame room={room} code={code} me={me} />}

      {room.status === "done" && (
        <div className="space-y-2">
          <RankFlash win={room.winnerId === me} lose={room.lastLoserId === me} />
          {room.seriesChampionId && (
            <div className="rwg-card p-4 text-center" style={{ animation: "rwgPop .5s ease-out" }}>
              <p className="text-4xl mb-1">👑</p>
              <p className="text-xl font-black text-amber-300">Series champion: {room.players.find((p: any) => p.id === room.seriesChampionId)?.name}</p>
            </div>
          )}
          <SeriesBoard room={room} />
          {isHost ? (
            <button onClick={async () => { const { ok, d } = await post(`/api/reborn/games/rooms/${code}/restart`); if (!ok) toast({ title: "Can't restart", description: d.message, variant: "destructive" }); }}
              className="cbtn cbtn-gold w-full py-4 text-lg">{room.seriesChampionId ? "🎉 New series" : room.winTarget > 1 ? "▶ Next round" : "🔄 Play again"}</button>
          ) : (
            <p className="text-center text-white/50 text-sm py-2">Waiting for the host to start {room.winTarget > 1 && !room.seriesChampionId ? "the next round" : "another game"}… you can stay or leave.</p>
          )}
          <button onClick={leave} className="cbtn cbtn-dark w-full py-3">Leave room</button>
        </div>
      )}
    </div>
  );
}

function LobbyRoom({ room, code, isHost }: any) {
  const { toast } = useToast();
  const start = async () => { const { ok, d } = await post(`/api/reborn/games/rooms/${code}/start`); if (!ok) toast({ title: "Can't start", description: d.message, variant: "destructive" }); };
  return (
    <div className="rwg-card p-4">
      <p className="font-bold text-white mb-1">{GAMES[room.game]?.emoji} {GAMES[room.game]?.name}</p>
      <p className="text-[11px] text-white/50 mb-3">{GAMES[room.game]?.blurb} · {room.hasPassword ? "🔒 private" : "open"}</p>
      <p className="text-xs text-white/50 mb-2 flex items-center gap-1.5"><Users className="w-4 h-4" /> {room.players.length}/20 players</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {room.players.map((p: any) => (
          <span key={p.id} className={`px-3 py-1.5 rounded-full text-sm ${p.id === room.hostId ? "bg-amber-400/20 text-amber-200 border border-amber-400/40" : "bg-white/5 text-white/70"}`}>
            {p.id === room.hostId && <Crown className="w-3 h-3 inline mb-0.5 mr-1" />}{p.name}
          </span>
        ))}
      </div>
      {isHost ? (
        <button onClick={start} disabled={room.players.length < (room.game === "draw" ? 3 : 2)} className="cbtn cbtn-gold w-full py-4 text-lg inline-flex items-center justify-center gap-2">
          <Play className="w-5 h-5" /> {room.players.length < (room.game === "draw" ? 3 : 2) ? `Waiting for players… (min ${room.game === "draw" ? 3 : 2})` : "Start game"}
        </button>
      ) : <p className="text-center text-white/50 text-sm py-3">Waiting for the host to start…</p>}
      <p className="text-center text-[11px] text-white/40 mt-3">Share code <b className="text-amber-300">{room.code}</b>{room.hasPassword ? " + the password" : ""} with friends to join.</p>
    </div>
  );
}

function MuteToggle({ className = "" }: { className?: string }) {
  const [m, setM] = useState(sfx.isMuted());
  return <button onClick={() => { const nm = !m; sfx.setMuted(nm); setM(nm); }} className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white/70 ${className}`} title="Sound on/off">{m ? "🔇" : "🔊"}</button>;
}

function RankFlash({ win, lose }: { win: boolean; lose: boolean }) {
  const qc = useQueryClient();
  useEffect(() => { qc.invalidateQueries({ queryKey: ["/api/reborn/rank/me"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/rank/leaderboard"] }); if (win) sfx.rankUp(); else if (lose) sfx.rankDown(); }, [qc, win, lose]);
  if (!win && !lose) return null;
  return (
    <div className="rounded-2xl p-4 text-center border" style={{ animation: "rwgPop .5s ease-out", borderColor: win ? "rgba(240,215,135,0.4)" : "rgba(248,113,113,0.4)", background: win ? "linear-gradient(135deg,rgba(240,215,135,0.18),rgba(52,211,153,0.12))" : "rgba(248,113,113,0.1)" }}>
      <p className="text-4xl mb-1" style={{ animation: win ? "rwgPop .6s ease-out" : "rwgPulse 1s" }}>{win ? "⭐" : "🔻"}</p>
      <p className={`text-lg font-black ${win ? "text-amber-300" : "text-red-300"}`}>{win ? "RANK UP  +1★" : "RANK DOWN  −1★"}</p>
    </div>
  );
}

function SeriesBoard({ room }: any) {
  if (!room.winTarget || room.winTarget <= 1) return null;
  const score = room.seriesScore || {};
  const sorted = [...room.players].sort((a: any, b: any) => (score[b.id] || 0) - (score[a.id] || 0));
  return (
    <div className="rwg-card p-3">
      <p className="text-xs font-bold text-amber-200 mb-1.5">🏆 Series — first to {room.winTarget} wins</p>
      <div className="space-y-1">
        {sorted.map((p: any) => (
          <div key={p.id} className="flex items-center justify-between text-sm">
            <span className="text-white/70">{p.id === room.seriesChampionId ? "👑 " : ""}{p.name}</span>
            <span className="font-bold text-amber-300">{score[p.id] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RpsGame({ room, code, me }: any) {
  const meP = room.players.find((p: any) => p.id === me);
  const alive = meP?.alive;
  const canPick = room.status === "playing" && alive && !meP?.choice;
  const pick = (choice: string) => { sfx.click(); return post(`/api/reborn/games/rooms/${code}/action`, { choice }); };
  // alive = still playing (in danger); the winners of each round become safe.
  const iLost = room.status === "done" && room.lastLoserId === me;
  const safeMe = room.status === "reveal" && room.eliminatedThisRound?.includes(me);
  const secs = useLocalCountdown(room.secondsLeft, `${room.round}-${room.status}`);

  return (
    <div className="rwg-card p-5 text-center">
      <p className="text-sm text-white/60 mb-1">{room.message}</p>
      {room.status === "playing" && <p className="text-5xl font-black text-amber-300 mb-3 tabular-nums" style={{ animation: "rwgPulse 1s infinite" }}>{secs}</p>}

      {room.status === "done" ? (
        <div className="py-6">
          <div style={{ animation: "rwgPop .5s ease-out" }} className="text-7xl mb-2">{iLost ? "🍺" : "🎉"}</div>
          <p className={`text-2xl font-black ${iLost ? "text-red-300" : "text-emerald-300"}`}>{iLost ? "YOU LOSE — DRINK!" : room.lastLoserId ? "YOU'RE SAFE!" : "Game over"}</p>
        </div>
      ) : (
        <>
          {/* Everyone's reveal */}
          <div className="flex flex-wrap justify-center gap-3 my-4">
            {room.players.map((p: any) => (
              <div key={p.id} className={`flex flex-col items-center transition ${!p.alive ? "opacity-30" : ""}`}>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl bg-white/5 border ${room.eliminatedThisRound?.includes(p.id) ? "border-emerald-400/60" : "border-white/10"}`}
                  style={room.status === "reveal" && p.choice ? { animation: "rwgPop .4s ease-out" } : undefined}>
                  {p.choice ? HAND[p.choice] : (room.status === "playing" && p.chose ? "🔒" : "…")}
                </div>
                <span className="text-[10px] text-white/60 mt-1 max-w-[64px] truncate">{p.id === me ? "You" : p.name}</span>
              </div>
            ))}
          </div>

          {safeMe && <p className="text-emerald-300 font-bold mb-2">You won — you're safe! 🎉</p>}
          {!alive && !safeMe && room.status !== "done" && <p className="text-white/40 text-sm mb-2">You're safe — watch who drinks!</p>}

          {canPick ? (
            <div className="grid grid-cols-3 gap-3 mt-2">
              {(["rock", "paper", "scissors"] as const).map((c) => (
                <button key={c} onClick={() => pick(c)} className="cbtn cbtn-dark py-5">
                  <span className="text-4xl block">{HAND[c]}</span>
                  <span className="text-[11px] text-white/60 capitalize">{c}</span>
                </button>
              ))}
            </div>
          ) : alive && room.status === "playing" ? (
            <p className="text-emerald-300 font-bold mt-2">Locked in {HAND[meP.choice]} — waiting…</p>
          ) : null}
        </>
      )}
    </div>
  );
}

function TapGame({ room, code, me }: any) {
  const [localTaps, setLocalTaps] = useState(0);
  const pending = useRef(0);
  const meP = room.players.find((p: any) => p.id === me);
  const [coins, setCoins] = useState<number[]>([]);

  // Flush taps to the server in small batches to cut request volume.
  useEffect(() => {
    const t = setInterval(() => {
      if (pending.current > 0 && room.status === "playing") {
        const n = pending.current; pending.current = 0;
        post(`/api/reborn/games/rooms/${code}/action`, { tap: true, n });
      }
    }, 350);
    return () => clearInterval(t);
  }, [code, room.status]);

  const tap = () => {
    if (room.status !== "playing") return;
    sfx.coin();
    pending.current += 1; setLocalTaps((v) => v + 1);
    const id = Date.now() + Math.random(); setCoins((c) => [...c.slice(-8), id]);
    setTimeout(() => setCoins((c) => c.filter((x) => x !== id)), 700);
  };

  const ranked = [...room.players].sort((a, b) => b.taps - a.taps);
  const iWon = room.status === "done" && room.winnerId === me;
  const myScore = Math.max(meP?.taps || 0, localTaps);

  return (
    <div className="rwg-card p-5 text-center">
      <p className="text-sm text-white/60 mb-1">{room.message}</p>
      {room.status === "playing" && <p className="text-5xl font-black text-amber-300 mb-2 tabular-nums">{room.secondsLeft}s</p>}

      {room.status === "done" ? (
        <div className="py-6">
          <div style={{ animation: "rwgPop .5s ease-out" }} className="text-7xl mb-2">{iWon ? "🏆" : "⛏️"}</div>
          <p className={`text-2xl font-black ${iWon ? "text-amber-300" : "text-white/70"}`}>{iWon ? "YOU STRUCK GOLD!" : "Game over"}</p>
        </div>
      ) : (
        <div className="relative my-4 select-none">
          <button onPointerDown={tap} className="w-44 h-44 mx-auto rounded-full flex items-center justify-center text-6xl active:scale-90 transition-transform" style={{ background: "radial-gradient(circle at 30% 30%, #f0d787, #c9a84c)", boxShadow: "0 10px 30px rgba(201,168,76,0.4)" }}>
            <Pickaxe className="w-16 h-16 text-black/80" />
          </button>
          {coins.map((id) => (
            <span key={id} className="absolute left-1/2 top-6 text-2xl pointer-events-none" style={{ animation: "rwgCoin .7s ease-out forwards", transform: `translateX(${(id % 7) * 14 - 42}px)` }}>🪙</span>
          ))}
          <p className="text-3xl font-black text-amber-300 mt-4 tabular-nums">{myScore} <span className="text-sm text-white/50">coins</span></p>
        </div>
      )}

      <div className="mt-3 text-left">
        {ranked.slice(0, 8).map((p: any, i: number) => (
          <div key={p.id} className="flex items-center justify-between text-sm py-1 border-b border-white/5 last:border-0">
            <span className="text-white/70">{i === 0 ? "🥇" : `${i + 1}.`} {p.id === me ? "You" : p.name}</span>
            <span className="text-amber-300 font-bold tabular-nums">{p.id === me ? Math.max(p.taps, localTaps) : p.taps} 🪙</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const fmtClock = (ms: number | null) => {
  if (ms == null) return "—";
  // seconds:hundredths — rounds stop at 20s, so no minutes column.
  const s = Math.floor(ms / 1000), cs = Math.floor((ms % 1000) / 10);
  return `${s}:${String(cs).padStart(2, "0")}`;
};
function TimerGame({ room, code, me }: any) {
  const t = room.timer || {};
  const TIMER_TARGET_MS: number = t.targetMs || 10_000;
  const iStopped = !!t.stopped?.[me];
  const iWon = room.status === "done" && (t.winners || []).includes(me);
  const stop = () => { if (room.status === "playing" && !iStopped) { sfx.coin?.(); post(`/api/reborn/games/rooms/${code}/action`, { act: "stop" }); } };
  // Keep the local clock aligned to the server's start time despite clock skew.
  const offsetRef = useRef(0);
  useEffect(() => { if (t.serverNow) offsetRef.current = t.serverNow - Date.now(); }, [t.serverNow]);
  const [, force] = useState(0);
  useEffect(() => {
    if (room.status !== "playing" || iStopped || !t.startedAt) return;
    const id = setInterval(() => force((x) => x + 1), 43);
    return () => clearInterval(id);
  }, [room.status, iStopped, t.startedAt]);
  const liveMs = t.startedAt ? Math.max(0, Date.now() + offsetRef.current - t.startedAt) : 0;
  const shown = iStopped ? (t.yourMs ?? 0) : liveMs;
  const near = shown >= TIMER_TARGET_MS - 1000 && shown <= TIMER_TARGET_MS + 1000;
  return (
    <div className="rwg-card p-5 text-center">
      <p className="text-sm text-white/60 mb-3">{room.message}</p>
      {room.status === "done" ? (
        <>
          <div style={{ animation: "rwgPop .5s ease-out" }} className="text-7xl mb-2">{iWon ? "🏆" : "⏱️"}</div>
          <p className={`text-2xl font-black mb-3 ${iWon ? "text-emerald-300" : "text-white/70"}`}>{iWon ? `CLOSEST TO ${fmtClock(TIMER_TARGET_MS)}!` : "Game over"}</p>
          <div className="text-left">
            {(t.results || []).map((r: any, i: number) => {
              const win = (t.winners || []).includes(r.id);
              return (
                <div key={r.id} className={`flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0 ${win ? "text-emerald-300 font-bold" : "text-white/70"}`}>
                  <span>{win ? "🏆" : `${i + 1}.`} {r.id === me ? "You" : r.name}</span>
                  <span className="tabular-nums">{fmtClock(r.ms)}{r.dist != null && <span className="text-white/40 ml-2">({r.ms != null && r.ms > TIMER_TARGET_MS ? "+" : "−"}{fmtClock(r.dist)})</span>}</span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="my-4 select-none">
          <p className="text-white/50 text-xs mb-2">{t.mode === "random" ? "🎲 Random target: stop" : "Stop"} the clock as close to <b className="text-amber-300 text-base">{fmtClock(TIMER_TARGET_MS)}</b> as you can!</p>
          <p className={`text-5xl font-black tabular-nums mb-4 ${iStopped ? "text-white/70" : near ? "text-emerald-300" : "text-amber-300"}`} style={{ letterSpacing: "0.05em" }}>{fmtClock(shown)}</p>
          <button onClick={stop} disabled={iStopped} className={`w-44 h-44 mx-auto rounded-full flex flex-col items-center justify-center text-3xl font-black transition-transform ${iStopped ? "opacity-60" : "active:scale-90"}`} style={{ background: iStopped ? "rgba(255,255,255,0.08)" : "radial-gradient(circle at 30% 30%, #ff8a8a, #e0398b)", boxShadow: iStopped ? "none" : "0 10px 30px rgba(224,57,139,0.4)", color: iStopped ? "#f5b8d4" : "#1a0410" }}>
            {iStopped ? <><span className="text-4xl mb-1">✓</span><span className="text-lg">Locked</span></> : "STOP"}
          </button>
          <p className="text-white/60 text-sm mt-4">{t.stoppedCount || 0}/{t.total || room.players.length} players stopped</p>
        </div>
      )}
    </div>
  );
}

function SevenGame({ room, code, me }: any) {
  const s = room.seven || {};
  const myTurn = s.turnId === me;
  const choosing = s.chooseFor === me;
  const last = s.last;
  const cur = room.players.find((p: any) => p.id === s.turnId);
  const roll = () => { if (myTurn && !s.chooseFor) { (sfx as any).dice?.(); post(`/api/reborn/games/rooms/${code}/action`, { act: "roll" }); } };
  const choose = (targetId: string) => post(`/api/reborn/games/rooms/${code}/action`, { act: "choose", targetId });
  return (
    <div className="rwg-card p-5 text-center">
      <p className="text-sm text-white/70 mb-3">{room.message}</p>
      <div className="mb-4">
        <p className="text-xs text-white/40 mb-1">The Cup{s.dir === -1 ? " · 🔄 reversed" : ""}</p>
        <div className="text-3xl leading-none">{s.cupUnits > 0 ? "🍺".repeat(Math.min(10, s.cupUnits)) : "🫙"}</div>
        <p className="text-[11px] text-white/40 mt-1">{s.cupUnits > 0 ? `${s.cupUnits} pour${s.cupUnits === 1 ? "" : "s"} waiting` : "empty"}</p>
      </div>
      {last && (
        <div className="flex items-center justify-center gap-3 mb-4" style={{ animation: "rwgPop .35s ease-out" }}>
          <Die v={last.d1} size={56} />
          <Die v={last.d2} size={56} />
          <span className="text-2xl font-black text-amber-300">= {last.sum}</span>
        </div>
      )}
      {choosing ? (
        <div>
          <p className="text-sm font-bold text-amber-300 mb-2">🎯 Pick who downs the whole cup 🍺</p>
          <div className="flex flex-wrap justify-center gap-2">
            {room.players.filter((p: any) => p.id !== me).map((p: any) => (
              <button key={p.id} onClick={() => choose(p.id)} className="cbtn cbtn-gold px-4 py-2 text-sm">{p.name}</button>
            ))}
            {room.players.length === 1 && <button onClick={() => choose(me)} className="cbtn cbtn-gold px-4 py-2 text-sm">Myself</button>}
          </div>
        </div>
      ) : s.chooseFor ? (
        <p className="text-white/50 text-sm py-2">Waiting for {room.players.find((p: any) => p.id === s.chooseFor)?.name || "someone"} to pick…</p>
      ) : myTurn ? (
        <button onClick={roll} className="cbtn cbtn-gold w-full py-5 text-xl">🎲 Roll the dice</button>
      ) : (
        <p className="text-white/50 text-sm py-3">{cur ? `${cur.name}'s turn…` : "Waiting…"}</p>
      )}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {room.players.map((p: any) => (
          <span key={p.id} className={`px-3 py-1.5 rounded-full text-sm ${p.id === s.turnId ? "bg-amber-400/20 text-amber-200 border border-amber-400/40" : "bg-white/5 text-white/60"}`}>
            {p.id === s.turnId && "🎲 "}{p.id === me ? "You" : p.name}
          </span>
        ))}
      </div>
    </div>
  );
}

// Shared tower: the server owns the tower and whose turn it is; the sliding block's
// position is a back-and-forth computed from the server clock, so every player
// sees the same block. The player whose turn it is taps to drop it.
function StackGame({ room, code, me }: any) {
  const st = room.stack || {};
  const S: number = st.size || 220, VIEW = 8;
  const tower: any[] = st.tower || [];
  const move = st.move;
  const myTurn = room.status === "playing" && st.turnId === me;
  const offsetRef = useRef(0);
  useEffect(() => { if (st.serverNow) offsetRef.current = st.serverNow - Date.now(); }, [st.serverNow]);
  const [, tick] = useState(0);
  useEffect(() => {
    if (room.status !== "playing") return;
    let raf = 0; const loop = () => { tick((x) => x + 1); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [room.status]);
  const now = Date.now() + offsetRef.current;
  // Position of the moving block along its active axis (matches the server).
  const posOf = (m: any) => {
    const span = (m.axis === "x" ? S - m.w : S - m.h); if (span <= 0) return 0;
    const d = Math.max(0, now - m.t0) * m.speed, ph = d % (2 * span);
    const v = ph <= span ? ph : 2 * span - ph;
    return m.from ? v : span - v;
  };
  const movingRect = (m: any) => {
    const pos = posOf(m);
    return m.axis === "x" ? { x: pos, y: m.y, w: m.w, h: m.h } : { x: m.x, y: pos, w: m.w, h: m.h };
  };
  const sentRef = useRef("");
  const drop = () => {
    if (!myTurn || !move || now < move.t0) return;
    const key = `${tower.length}`; if (sentRef.current === key) return; // one drop per turn
    sentRef.current = key; (sfx as any).coin?.();
    setTimeout(() => { if (sentRef.current === key) sentRef.current = ""; }, 1500); // allow a retry if the tap was too early
    post(`/api/reborn/games/rooms/${code}/action`, { act: "drop", pos: posOf(move) });
  };
  const done = room.status === "done";
  const iWon = done && (st.winners || []).includes(me);
  const loser = room.players.find((p: any) => p.id === st.loserId);
  const turnName = room.players.find((p: any) => p.id === st.turnId)?.name;
  const startI = Math.max(0, tower.length - VIEW);
  const secsLeft = room.deadline ? Math.max(0, Math.ceil((room.deadline - now) / 1000)) : 0;
  const mv = move ? movingRect(move) : null;
  return (
    <div className="rwg-card p-5 text-center">
      <p className="text-sm text-white/60 mb-1">{room.message}</p>
      <p className="text-3xl font-black text-amber-300 mb-2 tabular-nums">{st.height || 0} <span className="text-sm text-white/50">blocks high</span></p>
      {done ? (
        <div className="py-4">
          <div style={{ animation: "rwgPop .5s ease-out" }} className="text-7xl mb-2">{iWon ? "🏆" : "💥"}</div>
          <p className={`text-2xl font-black ${iWon ? "text-amber-300" : "text-red-300"}`}>{iWon ? "You survived!" : "You knocked it over!"}</p>
          {loser && <p className="text-white/60 text-sm mt-1">{loser.id === me ? "You" : loser.name} lose{loser.id === me ? "" : "s"} — drink up 🍻</p>}
        </div>
      ) : (
        <>
          <p className={`text-sm font-bold mb-1 ${myTurn ? "text-emerald-300" : "text-white/60"}`}>{myTurn ? `Your turn — tap to drop! (${secsLeft}s)` : `${turnName || "…"}'s turn (${secsLeft}s)`}</p>
          {move && <p className="text-xs text-white/45 mb-2">Sliding <b className="text-amber-300">{move.axis === "x" ? "↔ horizontal" : "↕ vertical"}</b> · top-down view</p>}
          <div className={`relative mx-auto rounded-xl overflow-hidden select-none touch-none ${myTurn ? "cursor-pointer ring-2 ring-emerald-400/60" : ""}`} style={{ width: S, height: S, background: "repeating-linear-gradient(45deg,rgba(255,255,255,0.03),rgba(255,255,255,0.03) 10px,rgba(255,255,255,0.05) 10px,rgba(255,255,255,0.05) 20px)", border: "1px solid rgba(255,255,255,0.1)" }} onPointerDown={drop}>
            {tower.slice(startI).map((b: any, i: number) => {
              const idx = startI + i, depth = tower.slice(startI).length - i;
              return <div key={idx} className="absolute rounded-sm" style={{ left: b.x, top: b.y, width: b.w, height: b.h, background: `hsl(${(idx * 30) % 360} 70% 58%)`, opacity: Math.max(0.22, 1 - depth * 0.12) }} />;
            })}
            {mv && <div className="absolute rounded-sm" style={{ left: mv.x, top: mv.y, width: mv.w, height: mv.h, background: `hsl(${(tower.length * 30) % 360} 85% 66%)`, boxShadow: "0 0 14px rgba(255,255,255,0.45)", opacity: now < move.t0 ? 0.5 : 1 }} />}
          </div>
          <p className="text-white/50 text-xs mt-3">{myTurn ? "Line it up over the tower — miss and you lose!" : "Whoever misses the tower loses 🧱"}</p>
        </>
      )}
      <div className="mt-4 flex flex-wrap justify-center gap-1.5">
        {room.players.map((p: any) => (
          <span key={p.id} className={`px-2.5 py-1 rounded-full text-xs ${p.id === st.loserId ? "bg-red-500/20 text-red-300" : p.id === st.turnId ? "bg-emerald-400/20 text-emerald-200" : "bg-white/5 text-white/60"}`}>
            {p.id === me ? "You" : p.name} · {st.heights?.[p.id]?.h || 0}🧱{p.id === st.loserId ? " 💥" : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

const numGet = (path: string) => apiRequest("GET", path).then((r) => r.json());
function NumberGame({ onLeave }: { onLeave: () => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const me = (user as any)?.id;
  const [state, setState] = useState<any>(null);
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => numGet("/api/reborn/games/number").then(setState).catch(() => {}), []);
  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, [load]);
  const submit = async () => {
    const g = Math.floor(Number(guess));
    if (!Number.isFinite(g) || g < 0 || g > 9999) return toast({ title: "Enter 0–9999", variant: "destructive" });
    setBusy(true);
    const { ok, d } = await post("/api/reborn/games/number/guess", { guess: g });
    setBusy(false);
    if (!ok) return toast({ title: "Can't guess", description: d.message, variant: "destructive" });
    setFeedback({ correct: !!d.correct, message: d.message });
    if (d.correct) sfx.rankUp?.(); else sfx.coin?.();
    setGuess("");
    setState(d);
  };
  if (state && state.available === false) {
    return (
      <div className="space-y-4">
        <button onClick={onLeave} className="text-sm text-white/60">← Back to games</button>
        <div className="rwg-card p-6 text-center text-white/60">The number game isn't scheduled today.</div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onLeave} className="text-sm text-white/60 inline-flex items-center gap-1"><LogOut className="w-4 h-4" /> Back</button>
        <MuteToggle />
      </div>
      <div className="rwg-card p-5 text-center">
        <p className="text-5xl mb-1">🔢</p>
        <h2 className="text-xl font-black text-white">Guess the Number</h2>
        <p className="text-white/50 text-sm">Round #{state?.round ?? "—"} · a secret 4-digit number (0–9999)</p>
        {state?.range && <p className="mt-2 inline-block rounded-full bg-white/5 border border-white/10 px-3 py-1 text-sm text-amber-300 font-bold tabular-nums">It's between {state.range.low} and {state.range.high}</p>}
        {feedback && (
          <div className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold ${feedback.correct ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30" : "bg-white/5 text-white/80 border border-white/10"}`} style={{ animation: "rwgPop .4s ease-out" }}>{feedback.message}</div>
        )}
        <div className="mt-4 flex gap-2">
          <input value={guess} onChange={(e) => setGuess(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))} onKeyDown={(e) => e.key === "Enter" && submit()} disabled={state?.remaining === 0} inputMode="numeric" placeholder="0000" className="flex-1 min-w-0 w-0 text-center text-2xl font-black tracking-[0.3em] rounded-xl bg-black/30 border border-white/10 py-3 text-white focus:outline-none focus:border-amber-400/60 disabled:opacity-50" />
          <button onClick={submit} disabled={busy || !guess || state?.remaining === 0} className="cbtn cbtn-gold shrink-0 px-6 py-3 text-base disabled:opacity-50">Guess</button>
        </div>
        {typeof state?.dailyLimit === "number" && state.dailyLimit > 0 && (
          <p className={`mt-2 text-[11px] ${state.remaining === 0 ? "text-amber-300" : "text-white/50"}`}>{state.remaining > 0 ? `${state.remaining} of ${state.dailyLimit} guesses left today` : "No guesses left today — come back tomorrow 🌙"}</p>
        )}
      </div>
      {state?.lastWinner && (
        <div className="rwg-card p-3 text-center text-sm text-emerald-300">🎉 {state.lastWinner.name} cracked {state.lastWinner.guess} in round #{state.lastWinner.round}</div>
      )}
      <div className="gcard p-4">
        <p className="font-extrabold text-white flex items-center gap-2 mb-2"><Trophy className="w-4 h-4 text-amber-300" /> Recent guesses</p>
        {(!state?.history || state.history.length === 0) && <p className="text-xs text-white/40">No guesses yet this round — be the first!</p>}
        {(state?.history || []).map((h: any, i: number) => (
          <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0 text-sm">
            <span className="text-white/70 truncate">{h.userId === me ? "You" : h.name}</span>
            <span className="tabular-nums font-bold text-white">{h.guess}</span>
            <span className={`text-xs font-semibold ${h.hint === "higher" ? "text-emerald-300" : "text-sky-300"}`}>{h.hint === "higher" ? "go higher ⬆️" : "go lower ⬇️"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayingCard({ c, onClick, selectable, paired, highlight }: { c: any; onClick?: () => void; selectable?: boolean; paired?: boolean; highlight?: boolean }) {
  const red = c.s === "♥" || c.s === "♦";
  return (
    <button onClick={onClick} disabled={!selectable} className={`w-12 h-16 rounded-lg bg-white flex flex-col items-center justify-center font-black shadow ${selectable ? "hover:-translate-y-1 active:scale-95 hover:ring-2 hover:ring-amber-400" : "cursor-default"} transition`}
      style={{ animation: "rwgPop .3s ease-out", outline: highlight ? "3px solid #f0d787" : paired ? "2px solid #34d399" : "none", outlineOffset: 1, boxShadow: paired ? "0 0 8px rgba(52,211,153,0.5)" : undefined }}>
      <span className={red ? "text-red-600" : "text-slate-900"} style={{ fontSize: 18, lineHeight: 1 }}>{c.v}</span>
      <span className={red ? "text-red-600" : "text-slate-900"} style={{ fontSize: 18 }}>{c.s}</span>
    </button>
  );
}

const cupsLabel = (u: number) => (u % 2 ? (u === 1 ? "½" : `${Math.floor(u / 2)}½`) : `${u / 2}`) + (u <= 2 ? " cup" : " cups");
const PK_RANK: Record<number, string> = { 11: "J", 12: "Q", 13: "K", 14: "A" };
function PokerCard({ c, hidden, small }: { c?: any; hidden?: boolean; small?: boolean }) {
  const cls = small ? "w-9 h-12 text-sm" : "w-16 h-24 text-2xl";
  if (hidden || !c) return <div className={`${cls} rounded-lg border-2 border-white/80 shadow-lg`} style={{ background: "repeating-linear-gradient(45deg,#7c3aed 0 6px,#5b21b6 6px 12px)" }} />;
  const red = c.s === "♥" || c.s === "♦";
  return <div className={`${cls} rounded-lg bg-white shadow-lg flex flex-col items-center justify-center font-black ${red ? "text-red-600" : "text-slate-900"}`} style={{ animation: "rwgPop .35s ease-out" }}><span className="leading-none">{PK_RANK[c.r] || c.r}</span><span className="leading-none">{c.s}</span></div>;
}
function PokerGame({ room, code, me }: any) {
  const pk = room.poker || {};
  const { toast } = useToast();
  const myTurn = room.status === "playing" && pk.turnId === me;
  const iSeen = !!pk.seen?.[me];
  const act = async (a: string) => {
    try {
      const { ok, d } = await post(`/api/reborn/games/rooms/${code}/action`, { act: a });
      if (!ok) toast({ title: "Can't do that", description: d.message, variant: "destructive" });
    } catch (e: any) { toast({ title: "Can't do that", description: String(e?.message || e).replace(/^\d+:\s*/, ""), variant: "destructive" }); }
  };
  const turnName = room.players.find((p: any) => p.id === pk.turnId)?.name;
  if (room.status === "done" && pk.reveal) {
    const iLost = pk.reveal.results.find((r: any) => r.id === me)?.loser;
    return (
      <div className="rwg-card p-5 text-center">
        <div className="text-6xl mb-1">{iLost ? "🍺" : "🏆"}</div>
        <p className={`text-2xl font-black ${iLost ? "text-red-300" : "text-emerald-300"}`}>{iLost ? `You drink ${cupsLabel(pk.reveal.pot)}!` : "You're safe!"}</p>
        <p className="text-white/60 text-sm mt-1 mb-4">{room.message}</p>
        <div className="space-y-2 text-left">
          {pk.reveal.results.map((r: any, i: number) => (
            <div key={r.id} className={`flex items-center gap-3 rounded-xl p-2.5 ${r.loser ? "bg-red-500/15 border border-red-400/40" : "bg-white/5 border border-white/10"}`}>
              <span className="w-5 text-center text-sm text-white/50">{i + 1}</span>
              <div className="flex gap-1">{r.cards.map((c: any, j: number) => <PokerCard key={j} small c={c} />)}</div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{r.id === me ? "You" : r.name}</p><p className="text-[11px] text-white/55">{r.cat}</p></div>
              {r.loser && <span className="shrink-0 text-sm font-black text-red-300">🍺 drinks</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="rwg-card p-5 text-center">
      <p className="text-sm text-white/60 mb-3">{room.message}</p>
      <div className="flex justify-center gap-3 mb-4">
        <div className="rounded-2xl bg-amber-400/15 border border-amber-300/30 px-4 py-2"><p className="text-[11px] text-amber-200/70 uppercase font-bold">Pot</p><p className="text-xl font-black text-amber-300">🍺 {cupsLabel(pk.pot || 0)}</p></div>
        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-2"><p className="text-[11px] text-white/50 uppercase font-bold">Stake</p><p className="text-xl font-black">{cupsLabel(pk.stake || 1)}</p></div>
        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-2"><p className="text-[11px] text-white/50 uppercase font-bold">Max</p><p className="text-xl font-black">{cupsLabel(pk.cap || 20)}</p></div>
      </div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-2">Your cards {iSeen ? `· ${pk.myHand}` : "· blind 🙈"}</p>
      <div className="flex justify-center gap-2 mb-4">{[0, 1, 2].map((i) => <PokerCard key={i} hidden={!iSeen} c={pk.myCards?.[i]} />)}</div>
      {room.status === "playing" && (myTurn ? (
        iSeen ? (
          <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <button onClick={() => act("follow")} className="cbtn cbtn-gold py-3 text-sm leading-tight">💪 Follow ×2<br /><span className="text-[11px] opacity-80">add {cupsLabel((pk.stake || 1) * 2)} · all open</span></button>
            <button onClick={() => act("fold")} className="cbtn cbtn-dark py-3 text-sm leading-tight">😱 Fold<br /><span className="text-[11px] opacity-80">drink the pot</span></button>
          </div>
        ) : (
          <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
            <button onClick={() => act("call")} className="cbtn cbtn-cyan py-3 text-sm leading-tight">Call<br /><span className="text-[11px] opacity-80">+{cupsLabel(pk.stake || 1)}</span></button>
            <button onClick={() => act("raise")} className="cbtn cbtn-gold py-3 text-sm leading-tight">Raise 😈<br /><span className="text-[11px] opacity-80">+{cupsLabel((pk.stake || 1) + 1)}</span></button>
            <button onClick={() => act("look")} className="cbtn cbtn-dark py-3 text-sm leading-tight">👀 Look<br /><span className="text-[11px] opacity-80">then ×2</span></button>
          </div>
        )
      ) : (
        <div>
          <p className="text-white/50 text-sm">Waiting for {turnName || "…"} ({room.secondsLeft}s)</p>
          {!iSeen && <button onClick={() => act("look")} className="mt-2 cbtn cbtn-dark px-5 py-2 text-xs">👀 Look at my cards (then pay ×2)</button>}
        </div>
      ))}
      <div className="mt-4 flex flex-wrap justify-center gap-1.5">
        {room.players.map((p: any) => (
          <span key={p.id} className={`px-2.5 py-1 rounded-full text-xs ${p.id === pk.turnId ? "bg-emerald-400/20 text-emerald-200" : "bg-white/5 text-white/60"}`}>
            {p.id === me ? "You" : p.name} · {pk.seen?.[p.id] ? "👀 seen" : "🙈 blind"}
          </span>
        ))}
      </div>
    </div>
  );
}

const FROG_TINT = ["#34d399", "#60a5fa", "#f472b6"];
function FrogGame({ room, code, me }: any) {
  const f = room.frog || {};
  const { toast } = useToast();
  const myTurn = f.turnId === me;
  const turnName = room.players.find((p: any) => p.id === f.turnId)?.name;
  const act = async (body: any) => {
    try {
      const { ok, d } = await post(`/api/reborn/games/rooms/${code}/action`, body);
      if (!ok) toast({ title: "Can't do that", description: d.message, variant: "destructive" });
    } catch (e: any) { toast({ title: "Can't do that", description: String(e?.message || e).replace(/^\d+:\s*/, ""), variant: "destructive" }); }
  };
  // smooth local countdown for the 5-second pick window
  const [, tick] = useState(0);
  useEffect(() => { if (f.phase !== "pick") return; const t = setInterval(() => tick((x) => x + 1), 100); return () => clearInterval(t); }, [f.phase, f.turnNo]);
  const endsAt = useRef(0);
  useEffect(() => { endsAt.current = Date.now() + (room.secondsLeft || 0) * 1000; }, [f.phase, f.turnNo]);
  const left = Math.max(0, (endsAt.current - Date.now()) / 1000);
  const last = f.last;
  const drinkerIds = new Set((last?.drinkers || []).map((d: any) => d.id));
  return (
    <div className="rwg-card p-5 text-center">
      <p className="text-sm text-white/70 mb-3 min-h-[20px]">{room.message}</p>
      {f.phase === "pick" && (
        <div className="mx-auto mb-3 h-2 max-w-xs overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${(left / 5) * 100}%` }} /></div>
      )}
      {/* the pond */}
      <div className="relative mx-auto mb-4 grid max-w-sm gap-2 rounded-3xl p-4" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", background: "radial-gradient(ellipse at 50% 30%, #38bdf8, #0e7490)" }}>
        {[0, 1, 2].map((i) => {
          const mine = f.myPick === i;
          const leaderPick = f.phase === "reveal" && last?.leaderPick === i;
          const who = f.phase === "reveal" ? room.players.filter((p: any) => last?.picks?.[p.id] === i) : [];
          return (
            <button key={i} disabled={f.phase !== "pick" || f.myPick !== null} onClick={() => act({ act: "pick", frog: i })}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-full transition ${f.phase === "pick" && f.myPick === null ? "active:scale-90 hover:scale-105" : ""}`}
              style={{ background: "radial-gradient(circle at 40% 35%, #86efac, #15803d)", boxShadow: mine ? `0 0 0 4px #fff, 0 0 18px ${FROG_TINT[i]}` : leaderPick ? "0 0 0 4px #f59e0b" : "inset 0 -6px 0 rgba(0,0,0,.2)" }}>
              <span className="text-5xl leading-none" style={{ animation: f.phase === "pick" && f.myPick === null ? `rwgPop ${0.9 + i * 0.2}s ease-in-out infinite alternate` : undefined }}>🐸</span>
              <span className="mt-0.5 text-[11px] font-black text-white/90">Frog {i + 1}</span>
              {who.length > 0 && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">{who.map((p: any) => (p.id === me ? "You" : p.name)).join(", ")}</span>}
              {leaderPick && <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-black">👑 {last.leaderId === me ? "You" : turnName}</span>}
            </button>
          );
        })}
      </div>
      {f.phase === "wait" && (myTurn
        ? <button onClick={() => act({ act: "start" })} className="cbtn cbtn-gold w-full py-4 text-lg">🐸 START</button>
        : <p className="text-white/60 text-sm">Waiting for {turnName || "…"} to press START ({room.secondsLeft}s)</p>)}
      {f.phase === "pick" && <p className={`text-sm font-bold ${f.myPick === null ? "text-emerald-300" : "text-white/60"}`}>{f.myPick === null ? `Tap a frog! ${left.toFixed(1)}s` : `Locked in Frog ${f.myPick + 1} · ${(f.picked || []).length}/${room.players.length} picked`}</p>}
      {f.phase === "reveal" && (
        <p className={`text-lg font-black ${drinkerIds.has(me) ? "text-red-300" : "text-emerald-300"}`}>{drinkerIds.has(me) ? "🍺 You drink ½ cup!" : "😎 You're safe!"}</p>
      )}
      <div className="mt-4 text-left">
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1">Cups drunk so far</p>
        {room.players.map((p: any) => (
          <div key={p.id} className={`flex items-center justify-between py-1 text-sm border-b border-white/5 last:border-0 ${p.id === f.turnId ? "text-amber-200" : "text-white/70"}`}>
            <span>{p.id === f.turnId ? "👑 " : ""}{p.id === me ? "You" : p.name}{f.phase === "pick" && (f.picked || []).includes(p.id) ? " ✓" : ""}</span>
            <span className="font-bold tabular-nums">🍺 {((f.drinks?.[p.id] || 0) / 2).toString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const RL_COLORS = ["#10b981", "#f43f5e", "#3b82f6", "#f59e0b", "#a855f7", "#14b8a6", "#ec4899", "#84cc16"];
function RlglGame({ room, code, me }: any) {
  const r = room.rlgl || {};
  const st = r.st || {};
  const my = st[me] || { steps: 0 };
  const goal = r.goal || 500;
  const offset = useRef(0);
  useEffect(() => { if (r.serverNow) offset.current = r.serverNow - Date.now(); }, [r.serverNow]);
  const [, tick] = useState(0);
  useEffect(() => { if (room.status !== "playing") return; const t = setInterval(() => tick((x) => x + 1), 200); return () => clearInterval(t); }, [room.status]);
  const now = Date.now() + offset.current;
  const counting = now < (r.startAt || 0);
  const green = r.light === "green" && !counting;
  // local, optimistic steps; flushed to the server in small batches
  const next = useRef<"L" | "R">("L");
  const pending = useRef(0);
  const [local, setLocal] = useState(0);
  const [wrong, setWrong] = useState(false);
  useEffect(() => { setLocal((l) => Math.max(l, my.steps || 0)); }, [my.steps]);
  useEffect(() => {
    if (room.status !== "playing") return;
    const t = setInterval(() => {
      if (!pending.current) return;
      const n = pending.current; pending.current = 0;
      post(`/api/reborn/games/rooms/${code}/action`, { act: "step", n }).catch(() => {});
    }, 180);
    return () => clearInterval(t);
  }, [room.status, code]);
  const tap = (side: "L" | "R") => {
    if (room.status !== "playing" || my.out || my.done || counting) return; // ignore taps during the countdown
    if (side !== next.current) { setWrong(true); setTimeout(() => setWrong(false), 250); return; }
    next.current = side === "L" ? "R" : "L";
    pending.current += 1; setLocal((l) => Math.min(goal, l + 1));
    if (!green) { // moving on red = out; send now so the server sees it
      const n = pending.current; pending.current = 0;
      post(`/api/reborn/games/rooms/${code}/action`, { act: "step", n }).catch(() => {});
    }
  };
  // doll chant during green (fits the green time), turn sound on red
  useEffect(() => {
    if (room.status !== "playing") return;
    if (r.light === "green" && r.lightUntil) {
      const stop = sfx.dollChant((r.lightUntil - (Date.now() + offset.current)) / 1000);
      return stop;
    }
    if (r.light === "red" && Date.now() + offset.current > (r.startAt || 0)) sfx.dollTurn();
  }, [r.light, r.lightAt, room.status]);
  const wasOut = useRef(false);
  useEffect(() => { if (my.out && !wasOut.current) { wasOut.current = true; sfx.eliminated(); } }, [my.out]);
  const secs = Math.max(0, Math.ceil(((counting ? r.startAt : r.endsAt) - now) / 1000));
  const players = room.players.map((p: any, i: number) => ({ ...p, color: RL_COLORS[i % RL_COLORS.length], s: st[p.id] || { steps: 0 } }));
  if (room.status === "done") {
    const iWon = !!st[me]?.done;
    return (
      <div className="rwg-card p-5 text-center">
        <div className="text-6xl mb-1">{iWon ? "🏁" : "🍺"}</div>
        <p className={`text-2xl font-black ${iWon ? "text-emerald-300" : "text-red-300"}`}>{iWon ? "You made it!" : "You drink!"}</p>
        <p className="text-white/60 text-sm mt-1 mb-4">{room.message}</p>
        <div className="space-y-1.5 text-left">
          {players.sort((a: any, b: any) => (b.s.done ? 1e9 - (b.s.ms || 0) : b.s.steps) - (a.s.done ? 1e9 - (a.s.ms || 0) : a.s.steps)).map((p: any) => (
            <div key={p.id} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${p.s.done ? "bg-emerald-500/15" : "bg-red-500/10"}`}>
              <span className="font-bold">{String(p.s.num || 0).padStart(3, "0")} · {p.id === me ? "You" : p.name}</span>
              <span className={p.s.done ? "text-emerald-300" : "text-red-300"}>{p.s.done ? `🏁 ${((p.s.ms || 0) / 1000).toFixed(1)}s` : p.s.out ? "💥 moved on red" : `${p.s.steps}/${goal} · ⏰`}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="rwg-card overflow-hidden p-0 text-center select-none">
      {/* light + timer */}
      <div className="flex items-center justify-between px-4 py-3 transition-colors" style={{ background: counting ? "#374151" : green ? "#059669" : "#dc2626" }}>
        <span className="text-lg font-black text-white">{counting ? `Get ready… ${secs}` : green ? "🟢 GREEN LIGHT" : "🔴 RED LIGHT"}</span>
        <MuteToggle />
        <span className="rounded-full bg-black/30 px-3 py-1 text-sm font-bold tabular-nums text-white">⏱ {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</span>
      </div>
      {/* the field: doll at the finish, players walking up */}
      <div className="relative mx-auto h-64 w-full" style={{ background: "linear-gradient(180deg,#fde68a 0%,#f5d08a 12%,#e9c58f 100%)" }}>
        <div className="absolute inset-x-0 top-[14%] h-1 bg-red-600/80" />
        <div className="absolute left-1/2 top-1 -translate-x-1/2 text-4xl transition-transform duration-300" style={{ transform: `translateX(-50%) scaleX(${green ? -1 : 1})` }}>{green ? "🧍‍♀️" : "👧"}</div>
        <span className="absolute right-2 top-[15%] text-[10px] font-black text-red-700">FINISH</span>
        {players.map((p: any, i: number) => {
          const steps = p.id === me ? local : p.s.steps;
          const x = ((i + 0.5) / players.length) * 100;
          const y = 92 - (Math.min(steps, goal) / goal) * 76;
          return (
            <div key={p.id} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-all duration-200" style={{ left: `${x}%`, top: `${y}%`, opacity: p.s.out ? 0.35 : 1 }}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-black text-white shadow" style={{ background: p.color, outline: p.id === me ? "3px solid #111" : "none" }}>{p.s.out ? "💥" : p.s.done ? "🏁" : String(p.s.num || 0).padStart(3, "0")}</div>
              <span className="mt-0.5 max-w-[60px] truncate rounded bg-black/40 px-1 text-[9px] font-bold text-white">{p.id === me ? "You" : p.name}</span>
            </div>
          );
        })}
      </div>
      <div className="p-4">
        <p className="mb-2 text-sm text-white/70">{my.out ? "💥 You moved on red — you're out!" : my.done ? "🏁 You crossed! Watch the others…" : `${local}/${goal} steps · tap LEFT, RIGHT, LEFT, RIGHT…`}</p>
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${(local / goal) * 100}%` }} /></div>
        <div className={`grid gap-3 ${wrong ? "animate-pulse" : ""}`} style={{ gridTemplateColumns: "1fr 1fr" }}>
          {(["L", "R"] as const).map((side) => (
            <button key={side} onPointerDown={(e) => { e.preventDefault(); tap(side); }} disabled={my.out || my.done}
              className={`h-28 rounded-2xl text-2xl font-black text-white transition active:scale-95 disabled:opacity-40 ${next.current === side && !my.out && !my.done ? "ring-4 ring-white/70" : ""}`}
              style={{ background: side === "L" ? "linear-gradient(135deg,#ec4899,#be185d)" : "linear-gradient(135deg,#0ea5e9,#0369a1)", touchAction: "manipulation" }}>
              {side === "L" ? "👣 LEFT" : "RIGHT 👣"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MemoryGame({ room, code, me }: any) {
  const m = room.memory || {};
  const { toast } = useToast();
  const myTurn = room.status === "playing" && m.turnId === me && !m.busy;
  const turnName = room.players.find((p: any) => p.id === m.turnId)?.name;
  const flip = async (idx: number) => {
    try {
      const { ok, d } = await post(`/api/reborn/games/rooms/${code}/action`, { idx });
      if (!ok) toast({ title: "Can't flip", description: d.message, variant: "destructive" });
    } catch (e: any) { toast({ title: "Can't flip", description: String(e?.message || e).replace(/^\d+:\s*/, ""), variant: "destructive" }); }
  };
  const me0 = room.players.find((p: any) => p.id === me);
  const colorOf = (id: string) => (room.players.findIndex((p: any) => p.id === id) === 0 ? "#22c55e" : "#3b82f6");
  const done = room.status === "done";
  const iLost = done && room.lastLoserId && (m.score?.[me] || 0) <= Math.min(...room.players.map((p: any) => m.score?.[p.id] || 0));
  return (
    <div className="rwg-card p-4 text-center">
      {/* scoreboard */}
      <div className="mb-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${room.players.length}, minmax(0, 1fr))` }}>
        {room.players.map((p: any) => (
          <div key={p.id} className={`rounded-2xl border px-3 py-2 ${m.turnId === p.id ? "border-white/60 bg-white/10" : "border-white/10 bg-white/5"}`}>
            <p className="truncate text-xs font-bold" style={{ color: colorOf(p.id) }}>{m.turnId === p.id ? "▶ " : ""}{p.id === me ? "You" : p.name}</p>
            <p className="text-2xl font-black tabular-nums">{m.score?.[p.id] || 0}</p>
          </div>
        ))}
      </div>
      <p className="mb-3 min-h-[20px] text-sm text-white/70">{done ? room.message : myTurn ? `Your turn — flip 2 cards (${room.secondsLeft}s)` : m.busy ? room.message : `${turnName || "…"}'s turn (${room.secondsLeft}s)`}</p>
      {done && <p className={`mb-3 text-2xl font-black ${iLost ? "text-red-300" : "text-emerald-300"}`}>{iLost ? "🍺 You drink!" : "🏆 You win!"}</p>}
      {/* 6 × 5 board */}
      <div className="mx-auto grid max-w-sm gap-1.5" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
        {(m.tiles || []).map((t: any, i: number) => {
          const up = t.v !== null;
          return (
            <button key={i} disabled={!myTurn || up} onClick={() => flip(i)}
              className={`relative aspect-[3/4] rounded-lg text-xl font-black shadow transition-transform duration-300 ${myTurn && !up ? "active:scale-90" : ""}`}
              style={{
                background: up ? "#fff" : "repeating-linear-gradient(45deg,#7c3aed 0 5px,#5b21b6 5px 10px)",
                color: "#1e1b4b",
                border: t.by ? `3px solid ${colorOf(t.by)}` : t.open ? "3px solid #f59e0b" : "2px solid rgba(255,255,255,.7)",
                opacity: t.by && !done ? 0.55 : 1,
                animation: t.open ? "rwgPop .3s ease-out" : undefined,
              }}>
              {up ? t.v : ""}
            </button>
          );
        })}
      </div>
      {!me0 && <p className="mt-2 text-xs text-white/40">Watching</p>}
    </div>
  );
}

const DG_COLORS = ["#111111", "#ef4444", "#f97316", "#facc15", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#92400e", "#ffffff"];
const DG_WIDTHS = [4, 9, 18];
function DrawGame({ room, code, me }: any) {
  const g = room.draw || {};
  const { toast } = useToast();
  const done = room.status === "done";
  const amDrawer = g.drawerId === me;
  const drawerName = room.players.find((p: any) => p.id === g.drawerId)?.name || "Drawer";
  const secs = useLocalCountdown(room.secondsLeft, `${room.status}-${g.drawerId}`);
  const [color, setColor] = useState(DG_COLORS[0]);
  const [width, setWidth] = useState(DG_WIDTHS[1]);
  const [guess, setGuess] = useState("");
  // Local copies of strokes the drawer is still sending, so drawing feels instant.
  const [local, setLocal] = useState<Record<number, { c: string; w: number; p: number[] }>>({});
  const cur = useRef<{ id: number; c: string; w: number; all: number[]; sent: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const flushT = useRef<any>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const act = async (body: any, title = "Oops") => {
    try {
      const { ok, d } = await post(`/api/reborn/games/rooms/${code}/action`, body);
      if (!ok) toast({ title, description: d.message, variant: "destructive" });
      return ok;
    } catch (e: any) { toast({ title, description: String(e?.message || e).replace(/^\d+:\s*/, ""), variant: "destructive" }); return false; }
  };
  const pt = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) / r.width) * 1000), Math.round(((e.clientY - r.top) / r.height) * 1000)];
  };
  // Send the unsent tail of the current stroke (overlapping 1 point so pieces join up).
  const flush = (final = false) => {
    const s = cur.current;
    if (!s) return;
    const from = Math.max(0, s.sent - 2);
    if (s.all.length - from >= 4 || (final && s.all.length >= 2)) {
      const p = s.all.slice(from);
      s.sent = s.all.length;
      const id = s.id;
      act({ act: "stroke", id, c: s.c, w: s.w, p: p.length === 2 ? [...p, p[0] + 1, p[1]] : p }, "Can't draw").then(() => {
        if (final) setLocal((l) => { const n = { ...l }; delete n[id]; return n; });
      });
    } else if (final) setLocal((l) => { const n = { ...l }; delete n[s.id]; return n; });
  };
  const down = (e: React.PointerEvent) => {
    if (!amDrawer || done) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const [x, y] = pt(e);
    cur.current = { id: Date.now(), c: color, w: width, all: [x, y], sent: 0 };
    setLocal((l) => ({ ...l, [cur.current!.id]: { c: color, w: width, p: [x, y, x + 1, y] } }));
    clearInterval(flushT.current);
    flushT.current = setInterval(() => flush(), 180);
  };
  const move = (e: React.PointerEvent) => {
    const s = cur.current;
    if (!s) return;
    const [x, y] = pt(e);
    const lx = s.all[s.all.length - 2], ly = s.all[s.all.length - 1];
    if (Math.abs(x - lx) + Math.abs(y - ly) < 6) return;
    s.all.push(x, y);
    setLocal((l) => ({ ...l, [s.id]: { c: s.c, w: s.w, p: [...s.all] } }));
  };
  const up = () => {
    if (!cur.current) return;
    clearInterval(flushT.current);
    flush(true);
    cur.current = null;
  };
  useEffect(() => () => clearInterval(flushT.current), []);
  const feedLen = (g.feed || []).length;
  useEffect(() => { feedRef.current?.scrollTo({ top: 1e6 }); }, [feedLen]);
  const winKey = `${room.status}-${g.winnerId}`;
  useEffect(() => { if (!done) return; if (g.winnerId && (g.winnerId === me || amDrawer)) sfx.win(); else sfx.eliminated(); }, [winKey]);
  const send = async () => {
    const t = guess.trim();
    if (!t) return;
    setGuess("");
    await act({ act: "guess", text: t }, "Guess not sent");
  };
  const serverStrokes = (g.strokes || []).filter((s: any) => !local[s.id]);
  const all = [...serverStrokes, ...Object.values(local)];
  const iWon = done && !!g.winnerId && (g.winnerId === me || amDrawer);
  const mm = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  return (
    <div className="rwg-card p-3 text-center">
      <p className="mb-2 min-h-[20px] text-sm text-white/75">{room.message}</p>
      {done && <p className={`mb-2 text-2xl font-black ${iWon ? "text-emerald-300" : "text-red-300"}`}>{iWon ? "🎉 You win!" : "🍺 You drink!"}</p>}
      <div className="mb-2 flex items-center justify-between gap-2 text-left">
        <div className="min-w-0">
          <p className="truncate text-xs text-white/50">✏️ {amDrawer ? "You are drawing" : `${drawerName} is drawing`} · {g.category}</p>
          {amDrawer || done
            ? <p className="truncate text-lg font-black text-amber-300">{amDrawer && !done ? "Draw: " : "Answer: "}{String(g.word || "").toUpperCase()}</p>
            : <p className="font-mono text-lg font-black tracking-[0.25em] text-amber-300 break-all">{String(g.mask || "").toUpperCase()} <span className="text-xs tracking-normal text-white/40">({String(g.mask || "").replace(/ /g, "").length})</span></p>}
        </div>
        {!done && <span className={`shrink-0 rounded-lg px-2 py-1 font-black tabular-nums ${secs <= 30 ? "bg-red-500/30 text-red-200" : "bg-white/10 text-white"}`}>{mm}</span>}
      </div>
      <svg ref={svgRef} viewBox="0 0 1000 1000" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}
        className={`mx-auto block w-full max-w-md rounded-xl bg-white ${amDrawer && !done ? "cursor-crosshair" : ""}`} style={{ aspectRatio: "1 / 1", touchAction: "none" }}>
        {all.map((s: any, i: number) => {
          const pts: string[] = [];
          for (let k = 0; k + 1 < s.p.length; k += 2) pts.push(`${s.p[k]},${s.p[k + 1]}`);
          return <polyline key={i} points={pts.join(" ")} fill="none" stroke={s.c} strokeWidth={s.w * 2} strokeLinecap="round" strokeLinejoin="round" />;
        })}
      </svg>
      {amDrawer && !done && (
        <div className="mx-auto mt-2 max-w-md space-y-2">
          <div className="flex flex-wrap justify-center gap-1.5">
            {DG_COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} aria-label={`Colour ${c}`}
                className={`h-7 w-7 rounded-full border-2 ${color === c ? "scale-110 border-amber-300" : "border-white/30"}`} style={{ background: c }} />
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {DG_WIDTHS.map((w) => (
              <button key={w} onClick={() => setWidth(w)} className={`flex h-8 w-10 items-center justify-center rounded-lg border ${width === w ? "border-amber-300 bg-white/15" : "border-white/15 bg-white/5"}`}>
                <span className="rounded-full bg-white" style={{ width: w, height: w }} />
              </button>
            ))}
            <button onClick={() => act({ act: "undo" })} className="h-8 rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-bold text-white">↶ Undo</button>
            <button onClick={() => act({ act: "clear" })} className="h-8 rounded-lg border border-red-400/30 bg-red-500/15 px-3 text-xs font-bold text-red-200">🗑 Clear</button>
          </div>
          <p className="text-[11px] text-white/40">Draw it — no letters or words! If nobody guesses in 5 min, you lose too.</p>
        </div>
      )}
      <div ref={feedRef} className="mx-auto mt-2 max-h-32 max-w-md overflow-y-auto rounded-xl bg-black/25 p-2 text-left text-sm">
        {feedLen === 0 ? <p className="text-center text-xs text-white/35">Guesses will show here</p> :
          (g.feed || []).map((f: any, i: number) => (
            <p key={i} className="truncate"><b className={f.id === me ? "text-amber-300" : "text-white/80"}>{f.name}:</b> <span className="text-white/60">{f.text}</span></p>
          ))}
      </div>
      {!amDrawer && !done && (
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mx-auto mt-2 flex max-w-md gap-2">
          <input value={guess} onChange={(e) => setGuess(e.target.value)} maxLength={40} placeholder="Type your guess…" autoComplete="off"
            className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white placeholder:text-white/35" />
          <button type="submit" className="shrink-0 rounded-xl bg-amber-400 px-4 py-2 font-black text-slate-950">Guess</button>
        </form>
      )}
    </div>
  );
}

function BridgeGame({ room, code, me }: any) {
  const g = room.bridge || {};
  const { toast } = useToast();
  const myTurn = room.status === "playing" && g.turnId === me;
  const turnName = room.players.find((p: any) => p.id === g.turnId)?.name;
  const rows: number = g.rows || 10;
  const step = async (side: number) => {
    try {
      const { ok, d } = await post(`/api/reborn/games/rooms/${code}/action`, { side });
      if (!ok) toast({ title: "Can't step", description: d.message, variant: "destructive" });
    } catch (e: any) { toast({ title: "Can't step", description: String(e?.message || e).replace(/^\d+:\s*/, ""), variant: "destructive" }); }
  };
  const lastKey = g.last ? `${g.last.id}-${g.last.row}-${g.last.fell ? "f" : g.last.crossed ? "c" : "s"}` : "";
  useEffect(() => { if (!g.last) return; if (g.last.fell) sfx.eliminated(); else if (g.last.crossed) sfx.win(); else sfx.tick(); }, [lastKey]);
  const done = room.status === "done";
  const iWon = (g.done || []).includes(me);
  const iFell = (g.fell || []).includes(me);
  const status = (id: string) => ((g.done || []).includes(id) ? "🏁" : (g.fell || []).includes(id) ? "💥" : id === g.turnId ? "🚶" : "⏳");
  return (
    <div className="rwg-card p-4 text-center">
      <p className="mb-2 min-h-[20px] text-sm text-white/75">{room.message}</p>
      {done && <p className={`mb-2 text-2xl font-black ${iWon ? "text-emerald-300" : "text-red-300"}`}>{iWon ? "🏁 You crossed!" : "🍺 You drink 1 cup!"}</p>}
      {/* the bridge: finish at the top, start at the bottom */}
      <div className="mx-auto max-w-xs rounded-2xl p-3" style={{ background: "linear-gradient(180deg,#0f172a,#1e1b4b)" }}>
        <div className="mb-1.5 rounded-lg bg-emerald-500/30 py-1 text-[11px] font-black tracking-widest text-emerald-200">FINISH 🏁</div>
        {Array.from({ length: rows }).map((_, k) => {
          const r = rows - 1 - k; // draw top row first
          const here = !done && g.pos === r && g.turnId;
          return (
            <div key={r} className="mb-1.5 flex items-center gap-2">
              <span className="w-5 text-[10px] font-bold text-white/40">{r + 1}</span>
              {[0, 1].map((side) => {
                const knownSafe = g.known?.[r] === side;
                const broken = g.broken?.[r] === side || (g.known?.[r] !== null && g.known?.[r] !== undefined && g.known[r] !== side);
                const safeAtEnd = done && g.safe?.[r] === side;
                const clickable = myTurn && g.pos === r;
                return (
                  <button key={side} disabled={!clickable} onClick={() => step(side)}
                    className={`relative h-9 flex-1 rounded-md border-2 text-sm font-black transition ${clickable ? "animate-pulse border-amber-300 active:scale-95" : "border-white/20"}`}
                    style={{ background: broken ? "repeating-linear-gradient(135deg,#1f2937 0 4px,#111827 4px 8px)" : knownSafe || safeAtEnd ? "linear-gradient(135deg,#a7f3d0,#34d399)" : "linear-gradient(135deg,rgba(186,230,253,.55),rgba(125,211,252,.25))", color: "#0f172a" }}>
                    {broken ? "💥" : knownSafe ? "✓" : clickable ? (side ? "RIGHT" : "LEFT") : ""}
                    {here && g.known?.[r] === null && side === 0 && <span className="absolute -left-1 -top-3 text-base">🚶</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
        <div className="rounded-lg bg-white/10 py-1 text-[11px] font-black tracking-widest text-white/60">START</div>
      </div>
      {!done && (
        <p className={`mt-3 text-sm font-bold ${myTurn ? "text-amber-300" : "text-white/60"}`}>
          {myTurn ? `Your turn! Row ${g.pos + 1} — tap LEFT or RIGHT (${room.secondsLeft}s)` : iFell ? "💥 You fell — watch the others" : iWon ? "🏁 You're across!" : `${turnName || "…"} is walking (${room.secondsLeft}s)`}
        </p>
      )}
      {/* walking order */}
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {(g.order || []).map((id: string, i: number) => {
          const p = room.players.find((x: any) => x.id === id);
          if (!p) return null;
          return <span key={id} className={`rounded-full px-2.5 py-1 text-xs ${id === g.turnId ? "bg-amber-400/25 text-amber-200" : (g.fell || []).includes(id) ? "bg-red-500/15 text-red-300" : (g.done || []).includes(id) ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-white/60"}`}>{i + 1}. {id === me ? "You" : p.name} {status(id)}</span>;
        })}
      </div>
    </div>
  );
}

const DIE_FACE = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
// Cartoon SVG die with pips. wild=true tints it gold (the ① joker).
const PIP_POS: Record<string, [number, number]> = { tl: [30, 30], tr: [70, 30], ml: [30, 50], mr: [70, 50], c: [50, 50], bl: [30, 70], br: [70, 70] };
const PIP_LAYOUT: Record<number, string[]> = { 1: ["c"], 2: ["tl", "br"], 3: ["tl", "c", "br"], 4: ["tl", "tr", "bl", "br"], 5: ["tl", "tr", "c", "bl", "br"], 6: ["tl", "tr", "ml", "mr", "bl", "br"] };
function Die({ v, size = 54, wild = false, highlight = false }: { v: number; size?: number; wild?: boolean; highlight?: boolean }) {
  const pips = PIP_LAYOUT[v] || [];
  const isWild = wild || v === 1;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: highlight ? "drop-shadow(0 0 6px #f0d787)" : "drop-shadow(0 3px 4px rgba(0,0,0,0.45))" }}>
      <rect x="7" y="7" width="86" height="86" rx="22" fill={isWild ? "#fff4d6" : "#ffffff"} stroke={isWild ? "#e0a92e" : "#cfd3da"} strokeWidth="4" />
      <rect x="7" y="7" width="86" height="43" rx="22" fill="rgba(255,255,255,0.5)" />
      {pips.map((k, i) => { const [x, y] = PIP_POS[k]; return <circle key={i} cx={x} cy={y} r="9.5" fill={isWild ? "#c9871a" : "#2b2b2b"} />; })}
    </svg>
  );
}
function DiceRow({ vals, size = 54, faceHi }: { vals: number[]; size?: number; faceHi?: number }) {
  return <div className="flex flex-wrap justify-center gap-1.5">{vals.map((v, i) => <Die key={i} v={v} size={size} highlight={faceHi != null && (v === faceHi || (faceHi !== 1 && v === 1))} />)}</div>;
}
function DiceGame({ room, code, me }: any) {
  const { toast } = useToast();
  const d = room.dice || {};
  const myDice: number[] = Array.isArray(d.dice?.[me]) ? d.dice[me] : [];
  const meP = room.players.find((p: any) => p.id === me);
  const alive = meP?.alive;
  const myTurn = d.turnId === me && room.status === "playing";
  const bid = d.bid;
  const canCatch = alive && room.status === "playing" && bid && bid.by !== me;
  const act = (body: any) => post(`/api/reborn/games/rooms/${code}/action`, body);
  const secs = useLocalCountdown(room.secondsLeft, `${d.turnId}-${bid?.qty}-${bid?.face}-${room.status}`);

  const [qty, setQty] = useState<number>(0);
  const [face, setFace] = useState<number>(2);
  const [strike, setStrike] = useState(false);
  useEffect(() => { setQty(bid ? bid.qty : (d.minOpen || 5)); if (bid) setFace(bid.face); }, [bid?.qty, bid?.face, d.minOpen, d.turnId]);
  useEffect(() => { sfx.roll(); }, []); // dice tumble when the game opens

  if (room.status === "done") {
    const iWon = room.winnerId === me;
    const iLost = room.lastLoserId === me;
    return (
      <div className="rwg-card p-6 text-center">
        <div style={{ animation: "rwgPop .5s ease-out" }} className="text-7xl mb-2">{iWon ? "🏆" : iLost ? "🍻" : "🎲"}</div>
        <p className={`text-2xl font-black ${iWon ? "text-amber-300" : iLost ? "text-red-300" : "text-white/70"}`}>{iWon ? "YOU CALLED IT!" : iLost ? "YOU LOSE — DRINK!" : "Game over"}</p>
        <p className="text-white/60 text-sm mt-2">{room.message}</p>
      </div>
    );
  }

  const reveal = room.status === "reveal" && d.reveal;

  return (
    <div className="rwg-card p-4">
      <p className="text-sm text-amber-200 text-center mb-1">{room.message}</p>
      {room.status === "playing" && secs > 0 && <p className={`text-center font-black mb-2 tabular-nums ${secs <= 4 ? "text-red-400" : "text-white/60"}`}>⏱ {secs}s{myTurn ? " — your turn!" : ""}</p>}

      {/* current bid + joker status */}
      <div className="flex items-center justify-center gap-4 mb-3">
        <div className="text-center px-4 py-2 rounded-xl bg-white/5 border border-white/10">
          <p className="text-[10px] text-white/40 mb-0.5">Current bid</p>
          {bid ? <div className="flex items-center gap-2 justify-center"><span className="text-2xl font-black text-white">{bid.qty} ×</span><Die v={bid.face} size={34} /></div> : <p className="text-xl font-black text-white">—</p>}
        </div>
        <div className="text-center">
          <p className={`text-xs font-bold ${d.jokerActive ? "text-emerald-300" : "text-white/40"}`}>① {d.jokerActive ? "WILD" : "not wild"}</p>
          <p className="text-[10px] text-white/40">{d.totalDice} dice on table</p>
        </div>
      </div>

      {/* reveal */}
      {reveal && (
        <div className="mb-3 rounded-xl bg-black/30 border border-white/10 p-3">
          <p className="text-center text-sm text-white/70 mb-2">
            {reveal.timeout
              ? "⏱ Ran out of time!"
              : <>Bid was {reveal.bid.qty} × {reveal.bid.face === 1 ? "①" : DIE_FACE[reveal.bid.face]} — actually <b className="text-amber-300">{reveal.actual}</b> on the table</>}
          </p>
          {reveal.hands.map((h: any) => (
            <div key={h.id} className="flex items-center justify-between gap-2 py-1">
              <span className={`text-sm shrink-0 ${h.id === reveal.loserId ? "text-red-300 font-bold" : "text-white/70"}`}>{h.name}{h.id === reveal.loserId ? " 💀" : ""}</span>
              <span className="flex gap-1">{h.dice.map((x: number, i: number) => <Die key={i} v={x} size={26} highlight={reveal.bid && (x === reveal.bid.face || (reveal.jokerActive && reveal.bid.face !== 1 && x === 1))} />)}</span>
            </div>
          ))}
        </div>
      )}

      {/* my dice */}
      {alive ? (
        <>
          <p className="text-[11px] text-white/50 mb-2 text-center">🎲 Your dice</p>
          <div className="mb-4 rounded-2xl bg-black/20 border border-white/10 py-3 space-y-2">
            <DiceRow vals={myDice.slice(0, 3)} size={56} faceHi={bid?.face} />
            {myDice.length > 3 && <DiceRow vals={myDice.slice(3)} size={56} faceHi={bid?.face} />}
          </div>
        </>
      ) : <p className="text-center text-white/40 text-sm mb-3">You're out — watch the rest play!</p>}

      {/* players */}
      <div className="flex flex-wrap justify-center gap-2 mb-3">
        {room.players.map((p: any) => (
          <span key={p.id} className={`px-2.5 py-1 rounded-full text-xs ${!p.alive ? "bg-white/5 text-white/30 line-through" : d.turnId === p.id ? "bg-amber-400/20 text-amber-200 border border-amber-400/40" : "bg-white/5 text-white/60"}`}>
            {p.id === me ? "You" : p.name} · {Array.isArray(d.dice?.[p.id]) ? d.dice[p.id].length : d.dice?.[p.id] || 0}🎲{d.turnId === p.id ? " ⏳" : ""}
          </span>
        ))}
      </div>

      {/* controls */}
      {myTurn && room.status === "playing" && (
        <div className="rounded-xl bg-black/30 border border-white/10 p-3 mb-2">
          <p className="text-[11px] text-white/50 mb-2">Your bid — pick a number & how many dice total (min {bid ? "higher than now" : d.minOpen})</p>
          <div className="flex flex-wrap gap-2 justify-center mb-2">
            {[1, 2, 3, 4, 5, 6].map((f) => (
              <button key={f} onClick={() => setFace(f)} className={`p-1 rounded-xl transition ${face === f ? "bg-amber-400 ring-2 ring-amber-300 scale-105" : "bg-white/5 border border-white/10"}`}><Die v={f} size={44} /></button>
            ))}
          </div>
          <div className="flex items-center gap-2 justify-center mb-2">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 text-white text-xl font-bold">−</button>
            <input type="number" inputMode="numeric" value={qty || ""} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setQty(Number(e.target.value))} className="w-20 text-center rounded-lg bg-black/40 border border-white/10 py-2 text-white font-extrabold text-lg" />
            <button onClick={() => setQty((q) => q + 1)} className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 text-white text-xl font-bold">+</button>
            <span className="text-xs text-white/50">dice</span>
          </div>
          <label className="flex items-center justify-center gap-2 text-xs text-white/60 mb-2"><input type="checkbox" checked={strike} onChange={(e) => setStrike(e.target.checked)} /> Strike (make ① not wild)</label>
          <button onClick={async () => { sfx.click(); const { ok, d: r } = await act({ act: "bid", face, qty, strike }); if (!ok) toast({ title: "Can't bid", description: r?.message, variant: "destructive" }); }} className="cbtn cbtn-gold w-full py-3">{bid ? "Raise bid" : "Open bid"}</button>
        </div>
      )}

      {canCatch && (
        <button onClick={async () => { if (confirm(`Catch this bid (${bid.qty} × ${bid.face === 1 ? "①" : DIE_FACE[bid.face]})?\n\nIf you're WRONG, you lose. If it's a bluff, they lose.`)) { const { ok, d: r } = await act({ act: "catch" }); if (!ok) toast({ title: "Can't catch", description: r?.message, variant: "destructive" }); } }} className="cbtn cbtn-red w-full py-3.5">🫵 CATCH! (call their bluff)</button>
      )}
      {!myTurn && !canCatch && room.status === "playing" && <p className="text-center text-white/40 text-sm">Waiting…</p>}
    </div>
  );
}

function WheelGame({ room, code, me }: any) {
  const w = room.wheel || {};
  const prizes: any[] = w.prizes || [];
  const myTurn = w.turnId === me && room.status === "playing";
  const act = (body: any) => post(`/api/reborn/games/rooms/${code}/action`, body);
  const N = prizes.length || 1;
  const seg = 360 / N;
  const resultIdx = w.result?.index ?? -1;
  useEffect(() => { if (room.status === "reveal" && w.result) sfx.ding(); }, [room.status, w.result?.playerId, w.result?.index]);
  // Spin so the winning segment lands at the top pointer (with a few full turns).
  const rotation = resultIdx >= 0 ? 360 * 5 - (resultIdx * seg + seg / 2) : 0;
  const colors = ["#f0d787", "#ff8ab5", "#66e2ff", "#c49bff", "#8be28b", "#ffd27a"];
  const R = 96, C = 100;
  const rad = (deg: number) => (deg - 90) * Math.PI / 180;
  const pt = (deg: number, r: number) => [C + r * Math.cos(rad(deg)), C + r * Math.sin(rad(deg))];
  const slice = (a0: number, a1: number) => { const [x0, y0] = pt(a0, R); const [x1, y1] = pt(a1, R); return `M${C},${C} L${x0.toFixed(2)},${y0.toFixed(2)} A${R},${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`; };

  if (room.status === "done") {
    return <div className="rwg-card p-6 text-center"><div className="text-6xl mb-2">🍻</div><p className="text-xl font-black text-amber-300">Round done — cheers!</p><p className="text-white/60 text-sm mt-1">{room.message}</p></div>;
  }
  return (
    <div className="rwg-card p-5 text-center">
      <p className="text-sm text-amber-200 mb-3">{room.message}</p>
      <div className="relative mx-auto mb-4" style={{ width: 260, maxWidth: "80vw" }}>
        <div className="absolute left-1/2 -translate-x-1/2 -top-2 text-3xl z-10">🔻</div>
        <svg viewBox="0 0 200 200" style={{ width: "100%", transition: resultIdx >= 0 ? "transform 3.6s cubic-bezier(.17,.67,.2,1)" : "none", transform: `rotate(${rotation}deg)`, filter: "drop-shadow(0 8px 24px rgba(0,0,0,.5))" }}>
          <circle cx="100" cy="100" r="99" fill="#1a1030" />
          {prizes.map((p: any, i: number) => {
            const a0 = i * seg, a1 = (i + 1) * seg, mid = a0 + seg / 2;
            const [lx, ly] = pt(mid, R * 0.62);
            return (
              <g key={i}>
                <path d={slice(a0, a1)} fill={p.pass ? "#2b2346" : colors[Math.floor(i / (prizes.some((q: any) => q.pass) ? 2 : 1)) % colors.length]} stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
                <text x={lx} y={ly} fill={p.pass ? "#f0d787" : "#1a1030"} fontSize={N > 10 ? 8.5 : N > 6 ? 9 : 11} fontWeight="800" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${mid}, ${lx.toFixed(2)}, ${ly.toFixed(2)})`}>{p.label}</text>
              </g>
            );
          })}
          <circle cx="100" cy="100" r="16" fill="#0a0714" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
        </svg>
      </div>
      {room.status === "reveal" && w.result && <p className="text-2xl font-black text-amber-300 mb-3" style={{ animation: "rwgPop .5s ease-out" }}>{w.result.pass ? `${w.result.name}: PASS — no drink! ${w.result.emoji}` : `${w.result.name}: ${w.result.label} ${w.result.emoji}`}</p>}
      {myTurn ? (
        <button onClick={() => { sfx.spin(); act({ act: "spin" }); }} className="cbtn cbtn-gold w-full py-4 text-lg">🎡 SPIN!</button>
      ) : room.status === "playing" ? (
        <p className="text-white/50 text-sm">Waiting for {room.players.find((p: any) => p.id === w.turnId)?.name || "…"} to spin…</p>
      ) : null}
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {room.players.map((p: any) => <span key={p.id} className={`px-2.5 py-1 rounded-full text-xs ${w.spun?.includes(p.id) ? "bg-white/5 text-white/40" : w.turnId === p.id ? "bg-amber-400/20 text-amber-200" : "bg-white/5 text-white/60"}`}>{p.id === me ? "You" : p.name}{w.spun?.includes(p.id) ? " ✓" : ""}</span>)}
      </div>
    </div>
  );
}

const FACE = { grandma: "👵", wolf: "🐺", witch: "🧙" } as const;
function RidingGame({ room, code, me }: any) {
  const r = room.riding || {};
  const tiles: any[] = r.tiles || [];
  const cols = Math.round(Math.sqrt(tiles.length)) || 4;
  const myTurn = r.turnId === me && room.status === "playing";
  const act = (body: any) => post(`/api/reborn/games/rooms/${code}/action`, body);
  const secs = useLocalCountdown(room.secondsLeft, `${r.turnId}-${r.flippedThisTurn}-${room.status}`);
  const lossKind: string | undefined = (r.tiles || []).find((t: any) => t.by === room.lastLoserId && (t.kind === "wolf" || t.kind === "witch"))?.kind;
  const loserName = room.players.find((p: any) => p.id === room.lastLoserId)?.name;
  // On a loss, zoom the wolf/witch full-screen with its sound.
  useEffect(() => { if (room.status === "reveal") { if (lossKind === "witch") sfx.witch(); else sfx.wolf(); sfx.lose(); } }, [room.status]);

  // Full-screen wolf/witch reveal
  if (room.status === "reveal" && lossKind) {
    const witch = lossKind === "witch";
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center" style={{ background: witch ? "radial-gradient(circle, #3b1466 0%, #0a0714 80%)" : "radial-gradient(circle, #5c1111 0%, #0a0714 80%)" }}>
        <div style={{ fontSize: "42vw", lineHeight: 1, animation: "rwgZoom 1s ease-out forwards", filter: "drop-shadow(0 0 30px rgba(0,0,0,.6))" }}>{witch ? "🧙" : "🐺"}</div>
        <p className={`text-5xl font-black mt-2 ${witch ? "text-purple-300" : "text-red-300"}`} style={{ animation: "rwgPop .6s ease-out" }}>{witch ? "WITCH!" : "WOLF!"}</p>
        <p className="text-white text-lg font-bold mt-3">{loserName} loses — drink {witch ? "DOUBLE 🍻🍻" : "1 cup 🍻"}!</p>
      </div>
    );
  }

  if (room.status === "done") {
    const iLost = room.lastLoserId === me;
    return <div className="rwg-card p-6 text-center"><div className="text-7xl mb-2">{iLost ? (lossKind === "witch" ? "🧙🍻" : "🐺🍻") : "👵"}</div><p className={`text-2xl font-black ${iLost ? "text-red-300" : "text-white/70"}`}>{iLost ? "YOU LOSE — DRINK!" : "Safe! 👵"}</p><p className="text-white/60 text-sm mt-2">{room.message}</p></div>;
  }
  return (
    <div className="rwg-card p-4">
      <p className="text-sm text-amber-200 text-center mb-1">{room.message}</p>
      {room.status === "playing" && secs > 0 && <p className={`text-center font-black mb-2 tabular-nums ${secs <= 5 ? "text-red-400" : "text-white/60"}`}>⏱ {secs}s{myTurn ? ` — tap ${r.clicks - r.flippedThisTurn} more` : ""}</p>}
      <p className="text-center text-[11px] text-white/50 mb-2">Tap a granny 👵 — but a 🐺 wolf (or 🧙 witch!) is hiding among them…</p>

      <div className="grid gap-1.5 mb-3 mx-auto w-full" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, maxWidth: Math.min(360, cols * 68) }}>
        {tiles.map((t: any) => {
          const bomb = t.kind === "wolf" || t.kind === "witch";
          const revealed = t.flipped || room.ridingReveal;
          const face = revealed && t.kind ? FACE[t.kind as keyof typeof FACE] : "👵";
          const isLoserTile = bomb && t.by === room.lastLoserId;
          return (
            <button key={t.id} disabled={!myTurn || t.flipped} onClick={() => { sfx.flip(); act({ act: "flip", tileId: t.id }); }}
              className="aspect-square rounded-xl flex items-center justify-center transition active:scale-95 overflow-hidden"
              style={{
                fontSize: `min(${cols <= 4 ? 30 : 22}px, 8vw)`,
                background: revealed && bomb ? (t.kind === "witch" ? "#4c1d95" : "#7f1d1d") : t.flipped ? "rgba(255,255,255,0.12)" : "linear-gradient(135deg,#ffe0b0,#e6a866)",
                opacity: t.flipped && !bomb ? 0.55 : 1,
                border: "2px solid rgba(255,255,255,.18)",
                boxShadow: t.flipped ? "none" : "inset 0 2px 0 rgba(255,255,255,.35), 0 3px 6px rgba(0,0,0,.4)",
                transform: isLoserTile ? "scale(1.12)" : "none",
                animation: isLoserTile ? "rwgPop .5s ease-out" : undefined,
              }}>
              {face}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap justify-center gap-1.5">
        {room.players.map((p: any) => <span key={p.id} className={`px-2.5 py-1 rounded-full text-xs ${r.turnId === p.id ? "bg-amber-400/20 text-amber-200 border border-amber-400/40" : "bg-white/5 text-white/60"}`}>{p.id === me ? "You" : p.name}{r.turnId === p.id ? " ⏳" : ""}</span>)}
      </div>
      {!myTurn && room.status === "playing" && <p className="text-center text-white/40 text-sm mt-2">Watch {room.players.find((p: any) => p.id === r.turnId)?.name || "…"} tap…</p>}
    </div>
  );
}

const CARD_PARTNER: Record<string, string> = { A: "9", "9": "A", "2": "8", "8": "2", "3": "7", "7": "3", "4": "6", "6": "4", "5": "5", J: "J", Q: "Q", K: "K" };
// Group matched pairs first (shown on the left), singles after.
function orderHand(hand: any[]): any[] {
  const used = new Array(hand.length).fill(false); const out: any[] = [];
  for (let i = 0; i < hand.length; i++) {
    if (used[i]) continue; const need = CARD_PARTNER[hand[i].v];
    for (let j = i + 1; j < hand.length; j++) { if (!used[j] && hand[j].v === need) { used[i] = used[j] = true; out.push({ ...hand[i], pair: true }, { ...hand[j], pair: true }); break; } }
  }
  for (let i = 0; i < hand.length; i++) if (!used[i]) out.push({ ...hand[i], pair: false });
  return out;
}

function CardGame({ room, code, me }: any) {
  const cards = room.cards || {};
  const myHand: any[] = Array.isArray(cards.hands?.[me]) ? cards.hands[me] : [];
  const ordered = orderHand(myHand);
  const myTurn = cards.turnId === me;
  const iWon = room.status === "done" && room.winnerId === me;
  const iLost = room.status === "done" && room.lastLoserId === me;
  const act = (body: any) => { sfx.flip(); return post(`/api/reborn/games/rooms/${code}/action`, body); };
  const secs = useLocalCountdown(room.secondsLeft, `${cards.turnId}-${cards.phase}-${room.message}`);

  // Winner reveal — show the completed hand to everyone before the win screen.
  if (room.status === "reveal" && cards.reveal) {
    const rv = cards.reveal;
    return (
      <div className="rwg-card p-6 text-center">
        <p className="text-lg font-black text-amber-200 mb-1">🃏 {rv.winnerName} completed 3 pairs!</p>
        <p className="text-white/50 text-xs mb-4">{rv.via === "deck" ? "Drew the winning card from the deck — big win!" : "Matched the discard to win!"}</p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {orderHand(rv.hand || []).map((c: any) => <PlayingCard key={c.id} c={c} highlight={rv.winCard && c.id === rv.winCard.id} paired={c.pair} />)}
        </div>
        <p className="text-white/40 text-xs mt-4">Everyone can see the winning hand…</p>
      </div>
    );
  }

  if (room.status === "done") {
    return (
      <div className="rwg-card p-6 text-center">
        <div style={{ animation: "rwgPop .5s ease-out" }} className="text-7xl mb-2">{iWon ? "🏆" : iLost ? "🍻" : "🃏"}</div>
        <p className={`text-2xl font-black ${iWon ? "text-amber-300" : iLost ? "text-red-300" : "text-white/70"}`}>{iWon ? "YOU WIN!" : iLost ? "YOU LOSE — DRINK!" : (room.winnerId ? "Game over" : "Tie")}</p>
        <p className="text-white/60 text-sm mt-2">{room.message}</p>
      </div>
    );
  }

  return (
    <div className="rwg-card p-4">
      <p className="text-sm text-amber-200 text-center mb-1">{room.message}</p>
      {secs > 0 && <p className={`text-center font-black mb-3 tabular-nums ${secs <= 3 ? "text-red-400" : "text-white/60"}`}>⏱ {secs}s{myTurn ? " — your move!" : ""}</p>}

      {/* opponents */}
      <div className="flex flex-wrap justify-center gap-3 mb-4">
        {room.players.filter((p: any) => p.id !== me).map((p: any) => (
          <div key={p.id} className={`text-center ${cards.turnId === p.id ? "" : "opacity-60"}`}>
            <div className="flex -space-x-3 justify-center">
              {Array.from({ length: Math.min(6, Number(cards.hands?.[p.id]) || 0) }).map((_, i) => (
                <div key={i} className="w-7 h-10 rounded bg-gradient-to-br from-violet-700 to-blue-800 border border-white/20" />
              ))}
            </div>
            <p className="text-[11px] text-white/60 mt-1">{p.name}{cards.turnId === p.id ? " ⏳" : ""}{p.id === room.hostId ? " 👑" : ""}</p>
            {cards.oneAway?.[p.id] && <p className="text-[10px] font-bold text-red-300 animate-pulse">🔥 last card!</p>}
          </div>
        ))}
      </div>

      {/* deck + discard */}
      <div className="flex items-center justify-center gap-6 mb-4">
        <div className="text-center">
          <div className="w-12 h-16 rounded-lg bg-gradient-to-br from-violet-700 to-blue-800 border border-white/20 flex items-center justify-center text-white/70 text-xs font-bold">{cards.deckLeft}</div>
          <p className="text-[10px] text-white/40 mt-1">Deck</p>
        </div>
        <div className="text-center">
          {cards.discardTop ? <PlayingCard c={cards.discardTop} /> : <div className="w-12 h-16 rounded-lg border-2 border-dashed border-white/15" />}
          <p className="text-[10px] text-white/40 mt-1">Discard</p>
        </div>
      </div>

      {/* my hand — matched pairs grouped on the left (green), singles on the right */}
      <p className="text-[11px] text-white/50 mb-1 text-center">Your hand — matched pairs shown left {cards.oneAway?.[me] ? "· 🔥 you're 1 card from winning!" : ""}</p>
      <div className="flex flex-wrap justify-center gap-1.5 mb-3">
        {ordered.map((c: any) => (
          <PlayingCard key={c.id} c={c} paired={c.pair} selectable={myTurn && cards.phase === "discard"} onClick={() => act({ act: "discard", cardId: c.id })} />
        ))}
      </div>

      {myTurn ? (
        cards.phase === "draw" ? (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => act({ act: "take" })} disabled={!cards.discardTop} className="cbtn cbtn-dark py-3 text-sm">Take discard {cards.discardTop ? `${cards.discardTop.v}${cards.discardTop.s}` : ""}</button>
            <button onClick={() => act({ act: "drawDeck" })} className="cbtn cbtn-gold py-3">Draw deck</button>
          </div>
        ) : (
          <p className="text-center text-emerald-300 font-bold text-sm">Tap a card above to discard</p>
        )
      ) : (
        <p className="text-center text-white/40 text-sm">Waiting for {room.players.find((p: any) => p.id === cards.turnId)?.name || "…"}</p>
      )}
    </div>
  );
}
