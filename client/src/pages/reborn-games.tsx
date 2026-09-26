import { useEffect, useRef, useState, useCallback } from "react";
import { RebornLayout } from "@/components/RebornLayout";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, Users, Lock, Play, LogOut, Crown, Pickaxe, Medal } from "lucide-react";
import MobileBackButton from "@/components/mobile-back-button";
import { RankBadge } from "@/components/RankBadge";
import { useRankConfig, useMyRank, computeRank } from "@/lib/rank";

const GAMES: Record<string, { name: string; emoji: string; blurb: string }> = {
  rps: { name: "Rock Paper Scissors", emoji: "✊", blurb: "5s to throw · no pick = out · last one standing wins" },
  tap: { name: "Gold Rush (Tap)", emoji: "⛏️", blurb: "60s dig — most gold coins wins" },
  cards: { name: "Card Match", emoji: "🃏", blurb: "3 pairs to win (A+9,2+8…J+J) · max 5 players" },
  dice: { name: "Dice Bluffing Game", emoji: "🎲", blurb: "5 dice each · bluff the count · catch the liar" },
};
const HAND: Record<string, string> = { rock: "✊", paper: "✋", scissors: "✌️" };

const RULES: Record<string, string[]> = {
  rps: [
    "Everyone throws ✊ ✋ ✌️ within 5 seconds.",
    "Didn't pick in time? You're out instantly.",
    "The losing sign is knocked out each round.",
    "Last player standing wins 🏆 — the last one out is the loser (drink!).",
  ],
  tap: [
    "When it says DIG, tap the button as fast as you can.",
    "Every tap = 1 gold coin ⛏️🪙.",
    "You have 60 seconds — most coins wins.",
    "Lowest score buys the round 😄.",
  ],
  cards: [
    "Goal: hold 3 matching pairs — A+9, 2+8, 3+7, 4+6, 5+5, J+J, Q+Q, K+K.",
    "On your turn (10s): take the face-up discard OR draw the deck, then discard 1.",
    "If someone discards the card that completes your 3 pairs, you WIN and they lose.",
    "Draw your winning card from the deck = BIG WIN — everyone else loses!",
    "Take too long (10s) and a card is auto-picked & discarded for you.",
    "Deck runs out with no winner = tie.",
  ],
  dice: [
    "Everyone rolls 5 hidden dice. Bid how many of a number are on the table across ALL players.",
    "① (ones) are wild — they count as any number.",
    "Each turn you have 15s to raise the bid (more dice, or same dice with a higher number) OR catch. Run out of time = you lose!",
    "Anyone can Catch (you'll confirm first). If the real count is LESS than the bid, the bidder loses. If it's enough, the catcher loses.",
    "Bid on ① or hit Strike → ones stop being wild, until a bid reaches 1.5× that amount.",
    "The round ends the moment someone loses — they drink 🍻; whoever called it right wins 🏆.",
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
        <button onClick={onClose} className="mt-4 w-full py-2.5 rounded-xl font-bold text-black" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>Got it!</button>
      </div>
    </div>
  );
}

const post = (path: string, body?: any) => apiRequest("POST", path, body || {}).then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({})) }));

export default function RebornGames() {
  const [code, setCode] = useState<string>("");
  return (
    <RebornLayout active="/games" title="GAMES">
      <div className="max-w-2xl mx-auto">
        <MobileBackButton className="mb-4" />
        {code ? <Room code={code} onLeave={() => setCode("")} /> : <Lobby onEnter={setCode} />}
      </div>
    </RebornLayout>
  );
}

function Lobby({ onEnter }: { onEnter: (c: string) => void }) {
  const { toast } = useToast();
  const [today, setToday] = useState<Record<string, boolean>>({});
  const [game, setGame] = useState<"rps" | "tap" | "cards" | "dice">("rps");
  const [password, setPassword] = useState("");
  const [winTarget, setWinTarget] = useState(1);
  const [joinCode, setJoinCode] = useState("");
  const [joinPw, setJoinPw] = useState("");
  const [lbGame, setLbGame] = useState<"rps" | "tap" | "cards" | "dice">("rps");
  const [lb, setLb] = useState<any[]>([]);
  const [help, setHelp] = useState<string | null>(null);

  const [openRooms, setOpenRooms] = useState<any[]>([]);
  const rankCfg = useRankConfig();
  const myRank = useMyRank();
  const [rankLb, setRankLb] = useState<any[]>([]);
  useEffect(() => { apiRequest("GET", "/api/reborn/rank/leaderboard").then((r) => r.json()).then(setRankLb).catch(() => {}); }, []);
  useEffect(() => { apiRequest("GET", "/api/reborn/games/config").then((r) => r.json()).then((d) => setToday(d.today || {})).catch(() => {}); }, []);
  useEffect(() => { apiRequest("GET", `/api/reborn/games/leaderboard?game=${lbGame}`).then((r) => r.json()).then(setLb).catch(() => {}); }, [lbGame]);
  const loadRooms = () => apiRequest("GET", "/api/reborn/games/rooms").then((r) => r.json()).then(setOpenRooms).catch(() => {});
  useEffect(() => { loadRooms(); const t = setInterval(loadRooms, 4000); return () => clearInterval(t); }, []);

  const create = async () => {
    const { ok, d } = await post("/api/reborn/games/rooms", { game, password, winTarget });
    if (!ok) return toast({ title: "Can't create", description: d.message, variant: "destructive" });
    onEnter(d.code);
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
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] text-white/50 uppercase tracking-wider">Your rank · Season {rankCfg.season}</p>
              <div className="mt-1"><RankBadge stars={myRank?.stars || 0} tiers={rankCfg.tiers} size="lg" /></div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-amber-300">{myRank?.stars || 0}★</p>
              <p className="text-[10px] text-white/40">peak {myRank?.peakStars || 0}</p>
            </div>
          </div>
          <div className="rounded-xl bg-black/25 p-2">
            <p className="text-[11px] font-bold text-white/60 mb-1 flex items-center gap-1"><Medal className="w-3.5 h-3.5 text-amber-300" /> Top ranked players</p>
            {rankLb.length === 0 && <p className="text-[11px] text-white/40">Win a game to climb the ladder!</p>}
            {rankLb.slice(0, 5).map((r, i) => (
              <div key={r.userId} className="flex items-center justify-between py-1">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-xs w-4 text-white/50">{i + 1}</span>
                  <RankBadge stars={r.stars} tiers={rankCfg.tiers!} size="sm" />
                  <span className="text-xs text-white/70 truncate">{r.name}</span>
                </span>
                <span className="text-xs font-bold text-amber-300 shrink-0">{r.stars}★</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-extrabold text-white">Live Games 🎮</h1>
        <p className="text-white/50 text-sm">Create a room, share the code, play head-to-head.</p>
      </div>

      <div className="rwg-card p-4">
        <p className="text-xs text-white/50 mb-2">Pick a game</p>
        <div className="grid grid-cols-1 gap-2">
          {(Object.keys(GAMES) as ("rps" | "tap" | "cards" | "dice")[]).map((g) => {
            const on = today[g];
            return (
              <button key={g} disabled={!on} onClick={() => setGame(g)}
                className={`p-3 rounded-2xl text-left border transition ${game === g && on ? "border-amber-400 bg-amber-400/10" : "border-white/10 bg-white/5"} ${!on ? "opacity-40" : ""}`}>
                <span className="text-lg font-bold text-white">{GAMES[g].emoji} {GAMES[g].name}</span>
                <span className="block text-[11px] text-white/50">{GAMES[g].blurb}</span>
                {!on && <span className="block text-[11px] text-amber-300 mt-0.5">Not scheduled today</span>}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-xl bg-black/30 border border-white/10 px-3">
            <Lock className="w-4 h-4 text-white/40" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Room password (optional)" className="flex-1 bg-transparent py-2.5 text-white text-sm focus:outline-none" />
          </div>
        </div>
        <div className="mt-2">
          <p className="text-xs text-white/50 mb-1">Play to how many wins?</p>
          <div className="flex gap-2">
            {[[1, "Single game"], [3, "Best of / 3 wins"], [5, "5 wins"]].map(([v, l]) => (
              <button key={v} onClick={() => setWinTarget(v as number)} className={`flex-1 py-2 rounded-lg text-xs font-semibold ${winTarget === v ? "bg-amber-400 text-black" : "bg-white/5 text-white/60"}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={() => setHelp(game)} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/80 font-bold text-sm">How to play</button>
          <button onClick={create} disabled={!today[game]} className="flex-1 py-3 rounded-xl font-extrabold text-black disabled:opacity-50" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>Create room</button>
        </div>
      </div>
      {help && <HowToPlay game={help} onClose={() => setHelp(null)} />}

      <div className="rwg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="font-bold text-white flex items-center gap-2"><Users className="w-4 h-4 text-amber-300" /> Open rooms</p>
          <button onClick={loadRooms} className="text-xs text-white/50">↻ Refresh</button>
        </div>
        {openRooms.length === 0 && <p className="text-xs text-white/40">No open rooms — create one above and invite friends!</p>}
        <div className="space-y-2">
          {openRooms.map((r) => (
            <div key={r.code} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
              <span className="text-2xl">{GAMES[r.game]?.emoji || "🎮"}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate">{GAMES[r.game]?.name || r.game} {r.hasPassword ? "🔒" : ""}</p>
                <p className="text-[11px] text-white/50 truncate">{r.hostName}'s room · <b className="text-amber-300">{r.code}</b> · {r.players}/{r.max} players</p>
              </div>
              <button onClick={() => joinRoom(r)} disabled={r.players >= r.max} className="px-4 py-2 rounded-lg text-sm font-bold text-black disabled:opacity-40" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>{r.players >= r.max ? "Full" : "Join"}</button>
            </div>
          ))}
        </div>
      </div>

      <div className="rwg-card p-4">
        <p className="text-xs text-white/50 mb-2">Or join by code</p>
        <div className="flex flex-wrap gap-2">
          <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={4} placeholder="CODE" className="w-20 text-center tracking-widest font-extrabold rounded-xl bg-black/30 border border-white/10 py-2.5 text-white focus:outline-none" />
          <input value={joinPw} onChange={(e) => setJoinPw(e.target.value)} placeholder="Password (if any)" className="flex-1 min-w-0 rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-white text-sm focus:outline-none" />
          <button onClick={join} className="shrink-0 px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white font-bold">Join</button>
        </div>
      </div>

      <div className="rwg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="font-bold text-white flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-300" /> Leaderboard</p>
          <div className="flex gap-1">
            {(["rps", "tap", "cards", "dice"] as const).map((g) => <button key={g} onClick={() => setLbGame(g)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${lbGame === g ? "bg-amber-400 text-black" : "bg-white/5 text-white/60"}`}>{GAMES[g].emoji}</button>)}
          </div>
        </div>
        {lb.length === 0 && <p className="text-xs text-white/40">No scores yet — be the first!</p>}
        {lb.map((r, i) => (
          <div key={r.userId} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0 text-sm">
            <span className="text-white/80">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`} {r.name}</span>
            <span className="text-amber-300 font-bold">{r.score}{lbGame === "tap" ? " coins" : " wins"}</span>
          </div>
        ))}
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

function useRoom(code: string) {
  const [room, setRoom] = useState<any>(null);
  useEffect(() => {
    const es = new EventSource(`/api/reborn/games/rooms/${code}/stream`, { withCredentials: true } as any);
    es.onmessage = (e) => { try { setRoom(JSON.parse(e.data)); } catch {} };
    es.onerror = () => {};
    return () => es.close();
  }, [code]);
  return room;
}

function Room({ code, onLeave }: { code: string; onLeave: () => void }) {
  const room = useRoom(code);
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
          <button onClick={() => setHelp(true)} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white/70 font-bold" title="How to play">?</button>
          <button onClick={leave} className="px-3 py-2 rounded-xl bg-red-500/15 border border-red-400/40 text-red-200 text-sm font-bold inline-flex items-center gap-1.5"><LogOut className="w-4 h-4" /> Leave</button>
        </div>
      </div>

      {room.status === "lobby" && <><SeriesBoard room={room} /><LobbyRoom room={room} code={code} isHost={isHost} /></>}
      {(room.status === "playing" || room.status === "reveal" || room.status === "done") && room.game === "rps" && <RpsGame room={room} code={code} me={me} />}
      {(room.status === "playing" || room.status === "reveal" || room.status === "done") && room.game === "tap" && <TapGame room={room} code={code} me={me} />}
      {(room.status === "playing" || room.status === "done") && room.game === "cards" && <CardGame room={room} code={code} me={me} />}
      {(room.status === "playing" || room.status === "reveal" || room.status === "done") && room.game === "dice" && <DiceGame room={room} code={code} me={me} />}

      {room.status === "done" && (
        <div className="space-y-2">
          {room.seriesChampionId && (
            <div className="rwg-card p-4 text-center" style={{ animation: "rwgPop .5s ease-out" }}>
              <p className="text-4xl mb-1">👑</p>
              <p className="text-xl font-black text-amber-300">Series champion: {room.players.find((p: any) => p.id === room.seriesChampionId)?.name}</p>
            </div>
          )}
          <SeriesBoard room={room} />
          {isHost ? (
            <button onClick={async () => { const { ok, d } = await post(`/api/reborn/games/rooms/${code}/restart`); if (!ok) toast({ title: "Can't restart", description: d.message, variant: "destructive" }); }}
              className="w-full py-3 rounded-xl font-extrabold text-black" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>{room.seriesChampionId ? "🎉 New series" : room.winTarget > 1 ? "▶ Next round" : "🔄 Play again"}</button>
          ) : (
            <p className="text-center text-white/50 text-sm py-2">Waiting for the host to start {room.winTarget > 1 && !room.seriesChampionId ? "the next round" : "another game"}… you can stay or leave.</p>
          )}
          <button onClick={leave} className="w-full py-3 rounded-xl font-bold bg-white/5 border border-white/10 text-white/80">Leave room</button>
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
        <button onClick={start} disabled={room.players.length < 2} className="w-full py-3 rounded-xl font-extrabold text-black disabled:opacity-50 inline-flex items-center justify-center gap-2" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>
          <Play className="w-5 h-5" /> {room.players.length < 2 ? "Waiting for players…" : "Start game"}
        </button>
      ) : <p className="text-center text-white/50 text-sm py-3">Waiting for the host to start…</p>}
      <p className="text-center text-[11px] text-white/40 mt-3">Share code <b className="text-amber-300">{room.code}</b>{room.hasPassword ? " + the password" : ""} with friends to join.</p>
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
  const pick = (choice: string) => post(`/api/reborn/games/rooms/${code}/action`, { choice });
  const iWon = room.status === "done" && room.winnerId === me;
  const iLost = room.status === "done" && room.winnerId !== me;
  const eliminatedMe = room.status === "reveal" && room.eliminatedThisRound?.includes(me);
  const secs = useLocalCountdown(room.secondsLeft, `${room.round}-${room.status}`);

  return (
    <div className="rwg-card p-5 text-center">
      <p className="text-sm text-white/60 mb-1">{room.message}</p>
      {room.status === "playing" && <p className="text-5xl font-black text-amber-300 mb-3 tabular-nums" style={{ animation: "rwgPulse 1s infinite" }}>{secs}</p>}

      {room.status === "done" ? (
        <div className="py-6">
          <div style={{ animation: "rwgPop .5s ease-out" }} className="text-7xl mb-2">{iWon ? "🏆" : "💀"}</div>
          <p className={`text-2xl font-black ${iWon ? "text-amber-300" : "text-red-300"}`}>{iWon ? "YOU WIN!" : "You're out"}</p>
        </div>
      ) : (
        <>
          {/* Everyone's reveal */}
          <div className="flex flex-wrap justify-center gap-3 my-4">
            {room.players.map((p: any) => (
              <div key={p.id} className={`flex flex-col items-center transition ${!p.alive ? "opacity-30" : ""}`}>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl bg-white/5 border ${room.eliminatedThisRound?.includes(p.id) ? "border-red-400/60" : "border-white/10"}`}
                  style={room.status === "reveal" && p.choice ? { animation: "rwgPop .4s ease-out" } : undefined}>
                  {p.choice ? HAND[p.choice] : (room.status === "playing" && p.chose ? "🔒" : "…")}
                </div>
                <span className="text-[10px] text-white/60 mt-1 max-w-[64px] truncate">{p.id === me ? "You" : p.name}</span>
              </div>
            ))}
          </div>

          {eliminatedMe && <p className="text-red-300 font-bold mb-2">You were eliminated 💀</p>}
          {!alive && room.status !== "done" && <p className="text-white/40 text-sm mb-2">You're out — watch who wins!</p>}

          {canPick ? (
            <div className="grid grid-cols-3 gap-3 mt-2">
              {(["rock", "paper", "scissors"] as const).map((c) => (
                <button key={c} onClick={() => pick(c)} className="py-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition">
                  <span className="text-4xl block">{HAND[c]}</span>
                  <span className="text-[11px] text-white/50 capitalize">{c}</span>
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

function PlayingCard({ c, onClick, selectable }: { c: any; onClick?: () => void; selectable?: boolean }) {
  const red = c.s === "♥" || c.s === "♦";
  return (
    <button onClick={onClick} disabled={!selectable} className={`w-12 h-16 rounded-lg bg-white flex flex-col items-center justify-center font-black shadow ${selectable ? "hover:-translate-y-1 active:scale-95 ring-2 ring-amber-400/0 hover:ring-amber-400" : "cursor-default"} transition`} style={{ animation: "rwgPop .3s ease-out" }}>
      <span className={red ? "text-red-600" : "text-slate-900"} style={{ fontSize: 18, lineHeight: 1 }}>{c.v}</span>
      <span className={red ? "text-red-600" : "text-slate-900"} style={{ fontSize: 18 }}>{c.s}</span>
    </button>
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
          <div className="mb-4 rounded-2xl bg-black/20 border border-white/10 py-3"><DiceRow vals={myDice} size={58} faceHi={bid?.face} /></div>
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
          <button onClick={() => act({ act: "bid", face, qty, strike })} className="w-full py-2.5 rounded-xl font-extrabold text-black" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>{bid ? "Raise bid" : "Open bid"}</button>
        </div>
      )}

      {canCatch && (
        <button onClick={() => { if (confirm(`Catch this bid (${bid.qty} × ${bid.face === 1 ? "①" : DIE_FACE[bid.face]})?\n\nIf you're WRONG, you lose. If it's a bluff, they lose.`)) act({ act: "catch" }); }} className="w-full py-3 rounded-xl font-black text-white bg-red-500 hover:bg-red-400">🫵 CATCH! (call their bluff)</button>
      )}
      {!myTurn && !canCatch && room.status === "playing" && <p className="text-center text-white/40 text-sm">Waiting…</p>}
    </div>
  );
}

function CardGame({ room, code, me }: any) {
  const cards = room.cards || {};
  const myHand: any[] = Array.isArray(cards.hands?.[me]) ? cards.hands[me] : [];
  const myTurn = cards.turnId === me;
  const iWon = room.status === "done" && room.winnerId === me;
  const act = (body: any) => post(`/api/reborn/games/rooms/${code}/action`, body);
  const secs = useLocalCountdown(room.secondsLeft, `${cards.turnId}-${cards.phase}-${room.message}`);

  if (room.status === "done") {
    return (
      <div className="rwg-card p-6 text-center">
        <div style={{ animation: "rwgPop .5s ease-out" }} className="text-7xl mb-2">{iWon ? "🏆" : "🃏"}</div>
        <p className={`text-2xl font-black ${iWon ? "text-amber-300" : "text-white/70"}`}>{iWon ? "YOU WIN!" : (room.winnerId ? "You lost" : "Tie")}</p>
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

      {/* my hand */}
      <p className="text-[11px] text-white/50 mb-1 text-center">Your hand — make 3 pairs (A+9, 2+8, 3+7, 4+6, 5+5, J+J, Q+Q, K+K)</p>
      <div className="flex flex-wrap justify-center gap-1.5 mb-3">
        {myHand.map((c: any) => (
          <PlayingCard key={c.id} c={c} selectable={myTurn && cards.phase === "discard"} onClick={() => act({ act: "discard", cardId: c.id })} />
        ))}
      </div>

      {myTurn ? (
        cards.phase === "draw" ? (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => act({ act: "take" })} disabled={!cards.discardTop} className="py-3 rounded-xl bg-white/10 border border-white/15 text-white font-bold disabled:opacity-40">Take discard {cards.discardTop ? `${cards.discardTop.v}${cards.discardTop.s}` : ""}</button>
            <button onClick={() => act({ act: "drawDeck" })} className="py-3 rounded-xl font-extrabold text-black" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>Draw deck</button>
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
