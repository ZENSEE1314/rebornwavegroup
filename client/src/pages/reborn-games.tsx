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
import { useTranslation, translate } from "@/lib/i18n";

// Game names/blurbs live in i18n: gm.game.<key> and gm.blurb.<key>.
const GAMES: Record<string, { emoji: string }> = {
  rps: { emoji: "✊" }, tap: { emoji: "⛏️" }, cards: { emoji: "🃏" }, draw: { emoji: "🎨" },
  bridge: { emoji: "🌉" }, memory: { emoji: "🧠" }, rlgl: { emoji: "🚦" }, frog: { emoji: "🐸" },
  poker3: { emoji: "🂡" }, dice: { emoji: "🎲" }, wheel: { emoji: "🎡" }, riding: { emoji: "👵" },
  timer: { emoji: "⏱️" }, "789": { emoji: "🎯" }, stack: { emoji: "🧱" }, number: { emoji: "🔢" },
};
type TFn = (key: string, vars?: Record<string, string | number>) => string;
const gameName = (t: TFn, g: string) => (GAMES[g] ? t(`gm.game.${g}`) : g);
const gameBlurb = (t: TFn, g: string) => (GAMES[g] ? t(`gm.blurb.${g}`) : "");
// Room messages come from the server as a key + vars (vars may be nested
// messages or "gm.*" keys); fall back to the English text for old rooms.
type SrvMsg = { k: string; v?: Record<string, any> };
function srvText(t: TFn, m: SrvMsg): string {
  const v: Record<string, string | number> = {};
  for (const [k, x] of Object.entries(m.v || {})) v[k] = x && typeof x === "object" ? srvText(t, x) : typeof x === "string" && x.startsWith("gm.") ? t(x) : x;
  return t(`gm.srv.${m.k}`, v);
}
const roomMsg = (t: TFn, room: any): string => (room?.msg?.k ? srvText(t, room.msg) : room?.message || "");
// Default wheel labels → keys (host-typed punishments stay as typed).
const WHEEL_LABEL_KEY: Record<string, string> = { PASS: "gm.wheel.pass", "½ cup": "gm.wheel.half", "1 cup": "gm.wheel.one", "2 cups": "gm.wheel.two" };
const wheelLabel = (t: TFn, l: string) => (WHEEL_LABEL_KEY[l] ? t(WHEEL_LABEL_KEY[l]) : l);
// Poker hand categories (server sends English names).
const PK_CAT_KEY: Record<string, string> = { "High card": "gm.pk.cat.high", Pair: "gm.pk.cat.pair", Straight: "gm.pk.cat.straight", Flush: "gm.pk.cat.flush", Trail: "gm.pk.cat.trail", "Straight flush": "gm.pk.cat.sflush" };
const pkCat = (t: TFn, c: string) => (PK_CAT_KEY[c] ? t(PK_CAT_KEY[c]) : c);
// Draw & Guess categories.
const DG_CAT_KEY: Record<string, string> = { Food: "gm.dg.cat.food", Animal: "gm.dg.cat.animal", Item: "gm.dg.cat.item" };
const HAND: Record<string, string> = { rock: "✊", paper: "✋", scissors: "✌️" };

const GAME_GRAD: Record<string, string> = {
  rps: "linear-gradient(135deg,#f0d787,#c9a84c)", tap: "linear-gradient(135deg,#ffd27a,#e0870f)",
  cards: "linear-gradient(135deg,#c49bff,#7c3aed)", dice: "linear-gradient(135deg,#66e2ff,#17b3e6)",
  wheel: "linear-gradient(135deg,#ff8ab5,#e0398b)", riding: "linear-gradient(135deg,#ff9a6b,#d1402a)",
  timer: "linear-gradient(135deg,#7affc0,#12b36a)", "789": "linear-gradient(135deg,#ffd27a,#e0398b)", poker3: "linear-gradient(135deg,#34d399,#0f766e)", frog: "linear-gradient(135deg,#86efac,#15803d)", rlgl: "linear-gradient(135deg,#34d399,#e11d48)", memory: "linear-gradient(135deg,#a78bfa,#6d28d9)", bridge: "linear-gradient(135deg,#7dd3fc,#1e3a8a)", draw: "linear-gradient(135deg,#fda4af,#7c3aed)",
  stack: "linear-gradient(135deg,#8ee0ff,#3a7bd5)", number: "linear-gradient(135deg,#9ab4ff,#4361e6)",
};
// Games grouped into categories for the lobby (name = id; label from gm.cat.<key>).
// c1/c2 = each category's neon colours in the arcade-style lobby.
const GAME_CATEGORIES: { name: string; key: string; emoji: string; games: string[]; c1: string; c2: string }[] = [
  { name: "Guessing game", key: "guess", emoji: "🧠", games: ["number", "rps", "draw"], c1: "#b36bff", c2: "#5b2bd6" },
  { name: "Dice game", key: "dice", emoji: "🎲", games: ["dice", "789"], c1: "#29d8ff", c2: "#1463d6" },
  { name: "Card game", key: "card", emoji: "🃏", games: ["cards", "poker3", "memory"], c1: "#ff4fa3", c2: "#b3127a" },
  { name: "Who's the fastest", key: "fast", emoji: "⚡", games: ["tap", "timer", "stack", "rlgl"], c1: "#ffb020", c2: "#e8551c" },
  { name: "Lucky game", key: "lucky", emoji: "🍀", games: ["wheel", "riding", "frog", "bridge"], c1: "#3ef08a", c2: "#0e9f57" },
];
// Neon colour pair for a single game tile (taken from its gradient).
const gameColors = (g: string): [string, string] => { const m = (GAME_GRAD[g] || "").match(/#[0-9a-fA-F]{6}/g) || []; return [m[0] || "#f0d787", m[1] || "#c9a84c"]; };

// How-to-play lines per game: gm.rules.<game>.<n> for n = 1..count.
const RULES: Record<string, number> = { rps: 5, tap: 4, draw: 5, bridge: 5, memory: 5, rlgl: 5, frog: 5, poker3: 6, cards: 6, dice: 6, wheel: 4, riding: 5, timer: 5, stack: 4, "789": 6, number: 5 };

function HowToPlay({ game, onClose }: { game: string; onClose: () => void }) {
  const { t } = useTranslation();
  const lines = Array.from({ length: RULES[game] || 0 }, (_, i) => t(`gm.rules.${game}.${i + 1}`));
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="rwg-card p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-extrabold text-white mb-3">{GAMES[game]?.emoji} {t("gm.howTo.title", { name: gameName(t, game) })}</h3>
        <ol className="space-y-2">
          {lines.map((line, i) => (
            <li key={i} className="flex gap-2 text-sm text-white/80"><span className="text-amber-300 font-bold">{i + 1}.</span><span>{line}</span></li>
          ))}
        </ol>
        <button onClick={onClose} className="cbtn cbtn-gold mt-4 w-full py-3">{t("gm.gotIt")}</button>
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
  const { t } = useTranslation();
  return (
    <RebornLayout active="/games" title={t("gm.title")} hideNav={!!code || numberMode}>
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
  const { t } = useTranslation();
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
      if (!ok) return toast({ title: t("gm.toast.cantCreate"), description: d.message, variant: "destructive" });
      onEnter(d.code);
    } finally { setCreating(false); }
  };
  const join = async () => {
    const { ok, d } = await post(`/api/reborn/games/rooms/${joinCode.trim().toUpperCase()}/join`, { password: joinPw });
    if (!ok) return toast({ title: t("gm.toast.cantJoin"), description: d.message, variant: "destructive" });
    onEnter(d.code);
  };
  const joinRoom = async (r: any) => {
    const pw = r.hasPassword ? (prompt(t("gm.lobby.lockedPrompt", { name: r.hostName })) ?? "") : "";
    if (r.hasPassword && !pw) return;
    const { ok, d } = await post(`/api/reborn/games/rooms/${r.code}/join`, { password: pw });
    if (!ok) return toast({ title: t("gm.toast.cantJoin"), description: d.message, variant: "destructive" });
    onEnter(d.code);
  };

  return (
    <div className="space-y-4">
      {/* Rank header — Mobile-Legends style ladder */}
      {rankCfg?.tiers && (
        <div className="rounded-2xl p-4 border border-amber-400/20" style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.18),rgba(201,168,76,0.12))" }}>
          <div className="mb-3">
            <p className="text-[11px] text-white/50 uppercase tracking-wider mb-1">{t("gm.lobby.yourRank", { n: rankCfg.season })}</p>
            <RankBadge stars={myRank?.stars || 0} tiers={rankCfg.tiers} size="lg" />
          </div>
          <div className="rounded-xl bg-black/25 p-2">
            <p className="text-[11px] font-bold text-white/60 mb-1 flex items-center gap-1"><Medal className="w-3.5 h-3.5 text-amber-300" /> {t("gm.lobby.topRanked")}</p>
            {rankLb.length === 0 && <p className="text-[11px] text-white/40">{t("gm.lobby.climb")}</p>}
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
          <h1 className="text-2xl font-extrabold text-white">{t("gm.lobby.title")}</h1>
          <p className="text-white/50 text-sm">{t("gm.lobby.subtitle")}</p>
        </div>
        <MuteToggle />
      </div>

      {!cat && (
        <div>
          <p className="arc-head">🎮 {t("gm.lobby.pickCat")}</p>
          <div className="grid grid-cols-1 gap-3">
            {cats.map((c, i) => {
              const list = c.games.filter((g) => today[g]);
              const n = list.length;
              return (
                <button key={c.name} onClick={() => setCat(c.name)} className="arc-tile"
                  style={{ ["--c1" as any]: c.c1, ["--c2" as any]: c.c2, ["--d" as any]: `${i * 0.6}s` }}>
                  <span className="arc-icon"><span>{c.emoji}</span></span>
                  <span className="min-w-0 flex-1">
                    <span className="arc-title">{t(`gm.cat.${c.key}`)}</span>
                    <span className="arc-badge">🕹️ {t(n === 1 ? "gm.lobby.gameCount1" : "gm.lobby.gameCountN", { n })}</span>
                    <span className="arc-chips" aria-hidden>{list.map((g) => <span key={g} className="arc-chip" title={gameName(t, g)}>{GAMES[g]?.emoji}</span>)}</span>
                  </span>
                  <span className="arc-play">{t("gm.lobby.play")} ▶</span>
                </button>
              );
            })}
            {cats.length === 0 && <p className="text-xs text-white/40">{t("gm.lobby.noneToday")}</p>}
          </div>
        </div>
      )}

      {curCat && !game && (
        <div className="gcard p-4">
          <button onClick={() => setCat(null)} className="flex items-center gap-1 text-sm text-white/60 mb-3"><ChevronLeft className="w-4 h-4" /> {t("gm.back")}</button>
          <p className="arc-head" style={{ color: curCat.c1, textShadow: `0 0 10px ${curCat.c1}88` }}>{curCat.emoji} {t(`gm.cat.${curCat.key}`)}</p>
          <div className="grid grid-cols-1 gap-3">
            {(curCat.games.filter((g) => today[g]) as GK[]).map((g, i) => {
              const [c1, c2] = gameColors(g);
              return (
                <button key={g} onClick={() => pickGame(g)} className="arc-tile"
                  style={{ ["--c1" as any]: c1, ["--c2" as any]: c2, ["--d" as any]: `${i * 0.6}s` }}>
                  <span className="arc-icon"><span>{GAMES[g].emoji}</span></span>
                  <span className="min-w-0 flex-1">
                    <span className="arc-title" style={{ fontSize: 17 }}>{gameName(t, g)}</span>
                    <span className="mt-1 block text-[11px] leading-snug text-white/65">{gameBlurb(t, g)}</span>
                  </span>
                  <span className="arc-play">{t("gm.lobby.play")} ▶</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {game && (
        <>
          <div className="gcard p-4">
            <button onClick={() => setGame(null)} className="flex items-center gap-1 text-sm text-white/60 mb-3"><ChevronLeft className="w-4 h-4" /> {t("gm.back")}</button>
            <div className="flex items-center gap-3">
              <span className="gem shrink-0" style={{ width: 52, height: 52, fontSize: 28, background: GAME_GRAD[game] }}>{GAMES[game].emoji}</span>
              <span className="min-w-0">
                <span className="block text-xl font-extrabold text-white leading-tight">{gameName(t, game)}</span>
                <span className="block text-[11px] text-white/55">{gameBlurb(t, game)}</span>
              </span>
            </div>
          </div>

          <div className="gcard p-4">
            <p className="font-extrabold text-white flex items-center gap-2 mb-2"><Trophy className="w-4 h-4 text-amber-300" /> {t("gm.lobby.leaderboard")}</p>
            {lb.length === 0 && <p className="text-xs text-white/40">{t("gm.lobby.noScores")}</p>}
            {lb.map((r, i) => (
              <div key={r.userId} className="flex items-center justify-between gap-2 py-1.5 border-b border-white/5 last:border-0 text-sm">
                <span className="text-white/80 truncate min-w-0">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`} {r.name}</span>
                <span className="text-amber-300 font-bold shrink-0">{t(game === "tap" ? "gm.lobby.scoreCoins" : game === "stack" ? "gm.lobby.scoreHigh" : "gm.lobby.scoreWins", { n: r.score })}</span>
              </div>
            ))}
          </div>

          <div className="gcard p-4">
            <p className="text-xs text-white/50 mb-1 font-bold uppercase tracking-wider">{game === "number" ? t("gm.lobby.play") : t("gm.lobby.createRoom")}</p>
            {game !== "number" && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 rounded-xl bg-black/30 border border-white/10 px-3">
                <Lock className="w-4 h-4 text-white/40" />
                <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("gm.lobby.pwOptional")} className="flex-1 bg-transparent py-2.5 text-white text-sm focus:outline-none" />
              </div>
            </div>
            )}
            {game === "riding" && (
              <div className="mt-3 space-y-2">
                <div>
                  <p className="text-xs text-white/50 mb-1.5 font-bold uppercase tracking-wider">{t("gm.lobby.facesBoard")}</p>
                  <div className="flex gap-2">{[9, 16, 25, 36].map((n) => <button key={n} onClick={() => setFacesCount(n)} className={`cbtn flex-1 py-2 text-xs ${facesCount === n ? "cbtn-gold" : "cbtn-dark"}`}>{n}</button>)}</div>
                </div>
                <div>
                  <p className="text-xs text-white/50 mb-1.5 font-bold uppercase tracking-wider">{t("gm.lobby.facesFlip")}</p>
                  <div className="flex gap-2">{[1, 2, 3, 4].map((n) => <button key={n} onClick={() => setRidingClicks(n)} className={`cbtn flex-1 py-2 text-xs ${ridingClicks === n ? "cbtn-gold" : "cbtn-dark"}`}>{n}</button>)}</div>
                </div>
              </div>
            )}
            {game === "wheel" && (
              <div className="mt-3">
                <p className="text-xs text-white/50 mb-1.5 font-bold uppercase tracking-wider">{t("gm.lobby.punish")} <span className="text-white/40 normal-case">{t("gm.lobby.punishHint")}</span></p>
                <textarea value={wheelText} onChange={(e) => setWheelText(e.target.value)} rows={4} placeholder={t("gm.lobby.punishPh")} className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-white text-sm focus:outline-none" />
              </div>
            )}
            {game === "poker3" && (
              <div className="mt-3 space-y-2">
                <div>
                  <p className="text-xs text-white/50 mb-1.5 font-bold uppercase tracking-wider">{t("gm.lobby.pkMin")}</p>
                  <div className="flex gap-2">{[1, 2, 3, 4].map((u) => <button key={u} onClick={() => { setPkMin(u); if (pkMax < u * 4) setPkMax(u * 4); }} className={`cbtn flex-1 py-2 text-xs ${pkMin === u ? "cbtn-gold" : "cbtn-dark"}`}>{cupsLabel(u)}</button>)}</div>
                </div>
                <div>
                  <p className="text-xs text-white/50 mb-1.5 font-bold uppercase tracking-wider">{t("gm.lobby.pkMax")}</p>
                  <div className="flex gap-2">{[4, 6, 10, 20].filter((u) => u >= pkMin * 4 || u === 20).map((u) => <button key={u} onClick={() => setPkMax(u)} className={`cbtn flex-1 py-2 text-xs ${pkMax === u ? "cbtn-gold" : "cbtn-dark"}`}>{cupsLabel(u)}</button>)}</div>
                </div>
              </div>
            )}
            {game === "timer" && (
              <div className="mt-3">
                <p className="text-xs text-white/50 mb-1.5 font-bold uppercase tracking-wider">{t("gm.lobby.target")}</p>
                <div className="flex gap-2">
                  <button onClick={() => setTimerMode("fixed")} className={`cbtn flex-1 py-2.5 text-xs ${timerMode === "fixed" ? "cbtn-gold" : "cbtn-dark"}`}>{t("gm.lobby.target10")}</button>
                  <button onClick={() => setTimerMode("random")} className={`cbtn flex-1 py-2.5 text-xs ${timerMode === "random" ? "cbtn-gold" : "cbtn-dark"}`}>{t("gm.lobby.targetRandom")}</button>
                </div>
              </div>
            )}
            {game !== "wheel" && game !== "riding" && game !== "timer" && game !== "number" && game !== "poker3" && game !== "frog" && game !== "rlgl" && game !== "memory" && game !== "bridge" && game !== "draw" && (
            <div className="mt-3">
              <p className="text-xs text-white/50 mb-1.5 font-bold uppercase tracking-wider">{t("gm.lobby.playTo")}</p>
              <div className="flex gap-2">
                {[[1, t("gm.lobby.single")], [3, t("gm.lobby.bo3")], [5, t("gm.lobby.win5")]].map(([v, l]) => (
                  <button key={v} onClick={() => setWinTarget(v as number)} className={`cbtn flex-1 py-2.5 text-xs ${winTarget === v ? "cbtn-gold" : "cbtn-dark"}`}>{l}</button>
                ))}
              </div>
            </div>
            )}
            {game === "number" && <p className="mt-3 text-[11px] text-white/50">{t("gm.lobby.numberNote")}</p>}
            <div className="mt-4 flex gap-2">
              <button onClick={() => setHelp(game)} className="cbtn cbtn-dark px-4 py-3.5 text-sm">{t("gm.howTo")}</button>
              {game === "number"
                ? <button onClick={onOpenNumber} disabled={!today.number} className="cbtn cbtn-gold flex-1 py-3.5 text-base">{t("gm.lobby.playNow")}</button>
                : <button onClick={create} disabled={!today[game] || creating} className="cbtn cbtn-gold flex-1 py-3.5 text-base">{creating ? t("gm.lobby.creating") : t("gm.lobby.createBtn")}</button>}
            </div>
          </div>
        </>
      )}
      {help && <HowToPlay game={help} onClose={() => setHelp(null)} />}

      {game !== "number" && (
      <div className="gcard p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="font-extrabold text-white flex items-center gap-2"><Users className="w-4 h-4 text-amber-300" /> {t("gm.lobby.openRooms")}</p>
          <button onClick={loadRooms} className="text-xs text-white/50">{t("gm.lobby.refresh")}</button>
        </div>
        {shownRooms.length === 0 && <p className="text-xs text-white/40">{t("gm.lobby.noRooms")}</p>}
        <div className="space-y-2">
          {shownRooms.map((r) => (
            <div key={r.code} className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-3 py-2.5">
              <span className="text-2xl">{GAMES[r.game]?.emoji || "🎮"}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate">{gameName(t, r.game)} {r.hasPassword ? "🔒" : ""}</p>
                <p className="text-[11px] text-white/50 truncate">{t("gm.lobby.hostRoom", { name: r.hostName })} · <b className="text-amber-300">{r.code}</b> · {t("gm.lobby.playersOf", { n: r.players, max: r.max })}</p>
              </div>
              <button onClick={() => joinRoom(r)} disabled={r.players >= r.max} className="cbtn cbtn-cyan px-4 py-2 text-sm shrink-0">{r.players >= r.max ? t("gm.lobby.full") : t("gm.lobby.join")}</button>
            </div>
          ))}
        </div>
      </div>
      )}

      <div className="gcard p-4">
        <p className="text-xs text-white/50 mb-2 font-bold uppercase tracking-wider">{t("gm.lobby.joinByCode")}</p>
        <div className="flex flex-wrap gap-2">
          <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={4} placeholder={t("gm.lobby.codePh")} className="w-20 text-center tracking-widest font-extrabold rounded-xl bg-black/30 border border-white/10 py-2.5 text-white focus:outline-none" />
          <input value={joinPw} onChange={(e) => setJoinPw(e.target.value)} placeholder={t("gm.lobby.pwIfAny")} className="flex-1 min-w-0 rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-white text-sm focus:outline-none" />
          <button onClick={join} className="cbtn cbtn-cyan shrink-0 px-5 py-2.5">{t("gm.lobby.join")}</button>
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
  const { t } = useTranslation();
  const room = useRoom(code, onLeave);
  const { user } = useAuth();
  const me = (user as any)?.id;
  const { toast } = useToast();
  const [help, setHelp] = useState(true); // show the tutorial when you enter
  const leave = async () => { await post(`/api/reborn/games/rooms/${code}/leave`); onLeave(); };

  if (!room) return <div className="rwg-card p-8 text-center text-white/50">{t("gm.room.connecting", { code })}</div>;
  const isHost = room.hostId === me;
  const [c1, c2] = gameColors(room.game);

  return (
    <div className="arc-room space-y-4" style={{ ["--c1" as any]: c1, ["--c2" as any]: c2 }}>
      {help && <HowToPlay game={room.game} onClose={() => setHelp(false)} />}
      {/* Game HUD: game, room code, controls */}
      <div className="arc-hud">
        <span className="arc-icon" style={{ width: 46, height: 46, fontSize: 25, borderRadius: 14 }}><span>{GAMES[room.game]?.emoji}</span></span>
        <div className="relative z-[1] min-w-0 flex-1">
          <p className="arc-title" style={{ fontSize: 15, lineHeight: 1.1 }}>{gameName(t, room.game)}</p>
          <p className="arc-code" title={t("gm.room.code")}>#{room.code}</p>
        </div>
        <MuteToggle className="arc-btn" />
        <button onClick={() => setHelp(true)} className="arc-btn" title={t("gm.howTo")} aria-label={t("gm.howTo")}>?</button>
        <button onClick={leave} className="arc-btn arc-btn-red" title={t("gm.room.leave")} aria-label={t("gm.room.leave")}><span aria-hidden style={{ fontSize: 18 }}>🚪</span></button>
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
              <p className="text-xl font-black text-amber-300">{t("gm.room.champion", { name: room.players.find((p: any) => p.id === room.seriesChampionId)?.name || "" })}</p>
            </div>
          )}
          <SeriesBoard room={room} />
          {isHost ? (
            <button onClick={async () => { const { ok, d } = await post(`/api/reborn/games/rooms/${code}/restart`); if (!ok) toast({ title: t("gm.toast.cantRestart"), description: d.message, variant: "destructive" }); }}
              className="cbtn cbtn-gold w-full py-4 text-lg">{room.seriesChampionId ? t("gm.room.newSeries") : room.winTarget > 1 ? t("gm.room.nextRound") : t("gm.room.playAgain")}</button>
          ) : (
            <p className="text-center text-white/50 text-sm py-2">{room.winTarget > 1 && !room.seriesChampionId ? t("gm.room.waitNextRound") : t("gm.room.waitAnother")}</p>
          )}
          <button onClick={leave} className="cbtn cbtn-dark w-full py-3">{t("gm.room.leaveRoom")}</button>
        </div>
      )}
    </div>
  );
}

function LobbyRoom({ room, code, isHost }: any) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const start = async () => { const { ok, d } = await post(`/api/reborn/games/rooms/${code}/start`); if (!ok) toast({ title: t("gm.toast.cantStart"), description: d.message, variant: "destructive" }); };
  const minPlayers = room.game === "draw" ? 3 : 2;
  const ready = room.players.length >= minPlayers;
  // Show at least 4 slots (empty ones blink) so it feels like a match lobby.
  const empty = Math.max(0, Math.max(4, minPlayers) - room.players.length);
  return (
    <div className="rwg-card p-4">
      <p className="text-[11px] text-white/55 mb-3 text-center">{gameBlurb(t, room.game)} · {room.hasPassword ? `🔒 ${t("gm.room.private")}` : `🌐 ${t("gm.room.open")}`}</p>
      <div className="arc-status mb-3"><span className="dot" />{ready ? t("gm.room.readyToStart") : t("gm.room.waitingPlayers")}<span className="text-white/50 tracking-normal">· <Users className="w-3.5 h-3.5 inline -mt-0.5" /> {t("gm.lobby.playersOf", { n: room.players.length, max: 20 })}</span></div>
      <div className="arc-slots mb-5">
        {room.players.map((p: any) => (
          <div key={p.id} className="arc-slot">
            <span className="arc-ava">{p.id === room.hostId && <span className="arc-crown">👑</span>}{String(p.name || "?").trim().charAt(0).toUpperCase() || "?"}</span>
            <span className="arc-name">{p.name}</span>
          </div>
        ))}
        {Array.from({ length: empty }).map((_, i) => (
          <div key={`e${i}`} className="arc-slot"><span className="arc-ava arc-ava-empty">?</span><span className="arc-name text-white/30">{t("gm.room.emptySlot")}</span></div>
        ))}
      </div>
      {isHost ? (
        <button onClick={start} disabled={!ready} className={`cbtn cbtn-gold w-full py-4 text-lg inline-flex items-center justify-center gap-2 font-black italic uppercase tracking-wide ${ready ? "arc-start" : ""}`}>
          <Play className="w-5 h-5" /> {!ready ? t("gm.room.waitPlayers", { n: minPlayers }) : t("gm.room.start")}
        </button>
      ) : <p className="text-center text-white/60 text-sm py-3">⏳ {t("gm.room.waitHost")}</p>}
      <p className="text-center text-[11px] text-white/40 mt-3">{t(room.hasPassword ? "gm.room.sharePw" : "gm.room.share", { code: "\u0000" }).split("\u0000")[0]}<b className="text-amber-300">{room.code}</b>{t(room.hasPassword ? "gm.room.sharePw" : "gm.room.share", { code: "\u0000" }).split("\u0000")[1]}</p>
    </div>
  );
}

function MuteToggle({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const [m, setM] = useState(sfx.isMuted());
  return <button onClick={() => { const nm = !m; sfx.setMuted(nm); setM(nm); }} className={className || "w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white/70"} title={t("gm.sound")} aria-label={t("gm.sound")}>{m ? "🔇" : "🔊"}</button>;
}

function RankFlash({ win, lose }: { win: boolean; lose: boolean }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  useEffect(() => { qc.invalidateQueries({ queryKey: ["/api/reborn/rank/me"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/rank/leaderboard"] }); if (win) sfx.rankUp(); else if (lose) sfx.rankDown(); }, [qc, win, lose]);
  if (!win && !lose) return null;
  return (
    <div className="rounded-2xl p-4 text-center border" style={{ animation: "rwgPop .5s ease-out", borderColor: win ? "rgba(240,215,135,0.4)" : "rgba(248,113,113,0.4)", background: win ? "linear-gradient(135deg,rgba(240,215,135,0.18),rgba(52,211,153,0.12))" : "rgba(248,113,113,0.1)" }}>
      <p className="text-4xl mb-1" style={{ animation: win ? "rwgPop .6s ease-out" : "rwgPulse 1s" }}>{win ? "⭐" : "🔻"}</p>
      <p className={`text-lg font-black ${win ? "text-amber-300" : "text-red-300"}`}>{win ? t("gm.rankUp") : t("gm.rankDown")}</p>
    </div>
  );
}

function SeriesBoard({ room }: any) {
  const { t } = useTranslation();
  if (!room.winTarget || room.winTarget <= 1) return null;
  const score = room.seriesScore || {};
  const sorted = [...room.players].sort((a: any, b: any) => (score[b.id] || 0) - (score[a.id] || 0));
  return (
    <div className="rwg-card p-3">
      <p className="text-xs font-bold text-amber-200 mb-1.5">{t("gm.series", { n: room.winTarget })}</p>
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
  const { t } = useTranslation();
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
      <p className="text-sm text-white/60 mb-1">{roomMsg(t, room)}</p>
      {room.status === "playing" && <p className="text-5xl font-black text-amber-300 mb-3 tabular-nums" style={{ animation: "rwgPulse 1s infinite" }}>{secs}</p>}

      {room.status === "done" ? (
        <div className="py-6">
          <div style={{ animation: "rwgPop .5s ease-out" }} className="text-7xl mb-2">{iLost ? "🍺" : "🎉"}</div>
          <p className={`text-2xl font-black ${iLost ? "text-red-300" : "text-emerald-300"}`}>{iLost ? t("gm.youLoseDrink") : room.lastLoserId ? t("gm.rps.youSafe") : t("gm.gameOver")}</p>
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
                <span className="text-[10px] text-white/60 mt-1 max-w-[64px] truncate">{p.id === me ? t("gm.you") : p.name}</span>
              </div>
            ))}
          </div>

          {safeMe && <p className="text-emerald-300 font-bold mb-2">{t("gm.rps.wonSafe")}</p>}
          {!alive && !safeMe && room.status !== "done" && <p className="text-white/40 text-sm mb-2">{t("gm.rps.watch")}</p>}

          {canPick ? (
            <div className="grid grid-cols-3 gap-3 mt-2">
              {(["rock", "paper", "scissors"] as const).map((c) => (
                <button key={c} onClick={() => pick(c)} className="cbtn cbtn-dark py-5">
                  <span className="text-4xl block">{HAND[c]}</span>
                  <span className="text-[11px] text-white/60 capitalize">{t(`gm.rps.${c}`)}</span>
                </button>
              ))}
            </div>
          ) : alive && room.status === "playing" ? (
            <p className="text-emerald-300 font-bold mt-2">{t("gm.rps.locked", { hand: HAND[meP.choice] })}</p>
          ) : null}
        </>
      )}
    </div>
  );
}

function TapGame({ room, code, me }: any) {
  const { t } = useTranslation();
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
      <p className="text-sm text-white/60 mb-1">{roomMsg(t, room)}</p>
      {room.status === "playing" && <p className="text-5xl font-black text-amber-300 mb-2 tabular-nums">{t("gm.unit.s", { n: room.secondsLeft })}</p>}

      {room.status === "done" ? (
        <div className="py-6">
          <div style={{ animation: "rwgPop .5s ease-out" }} className="text-7xl mb-2">{iWon ? "🏆" : "⛏️"}</div>
          <p className={`text-2xl font-black ${iWon ? "text-amber-300" : "text-white/70"}`}>{iWon ? t("gm.tap.gold") : t("gm.gameOver")}</p>
        </div>
      ) : (
        <div className="relative my-4 select-none">
          <button onPointerDown={tap} className="w-44 h-44 mx-auto rounded-full flex items-center justify-center text-6xl active:scale-90 transition-transform" style={{ background: "radial-gradient(circle at 30% 30%, #f0d787, #c9a84c)", boxShadow: "0 10px 30px rgba(201,168,76,0.4)" }}>
            <Pickaxe className="w-16 h-16 text-black/80" />
          </button>
          {coins.map((id) => (
            <span key={id} className="absolute left-1/2 top-6 text-2xl pointer-events-none" style={{ animation: "rwgCoin .7s ease-out forwards", transform: `translateX(${(id % 7) * 14 - 42}px)` }}>🪙</span>
          ))}
          <p className="text-3xl font-black text-amber-300 mt-4 tabular-nums">{myScore} <span className="text-sm text-white/50">{t("gm.tap.coins")}</span></p>
        </div>
      )}

      <div className="mt-3 text-left">
        {ranked.slice(0, 8).map((p: any, i: number) => (
          <div key={p.id} className="flex items-center justify-between text-sm py-1 border-b border-white/5 last:border-0">
            <span className="text-white/70">{i === 0 ? "🥇" : `${i + 1}.`} {p.id === me ? t("gm.you") : p.name}</span>
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
  const { t } = useTranslation();
  const tm = room.timer || {};
  const TIMER_TARGET_MS: number = tm.targetMs || 10_000;
  const iStopped = !!tm.stopped?.[me];
  const iWon = room.status === "done" && (tm.winners || []).includes(me);
  const stop = () => { if (room.status === "playing" && !iStopped) { sfx.coin?.(); post(`/api/reborn/games/rooms/${code}/action`, { act: "stop" }); } };
  // Keep the local clock aligned to the server's start time despite clock skew.
  const offsetRef = useRef(0);
  useEffect(() => { if (tm.serverNow) offsetRef.current = tm.serverNow - Date.now(); }, [tm.serverNow]);
  const [, force] = useState(0);
  useEffect(() => {
    if (room.status !== "playing" || iStopped || !tm.startedAt) return;
    const id = setInterval(() => force((x) => x + 1), 43);
    return () => clearInterval(id);
  }, [room.status, iStopped, tm.startedAt]);
  const liveMs = tm.startedAt ? Math.max(0, Date.now() + offsetRef.current - tm.startedAt) : 0;
  const shown = iStopped ? (tm.yourMs ?? 0) : liveMs;
  const near = shown >= TIMER_TARGET_MS - 1000 && shown <= TIMER_TARGET_MS + 1000;
  return (
    <div className="rwg-card p-5 text-center">
      <p className="text-sm text-white/60 mb-3">{roomMsg(t, room)}</p>
      {room.status === "done" ? (
        <>
          <div style={{ animation: "rwgPop .5s ease-out" }} className="text-7xl mb-2">{iWon ? "🏆" : "⏱️"}</div>
          <p className={`text-2xl font-black mb-3 ${iWon ? "text-emerald-300" : "text-white/70"}`}>{iWon ? t("gm.timer.closest", { t: fmtClock(TIMER_TARGET_MS) }) : t("gm.gameOver")}</p>
          <div className="text-left">
            {(tm.results || []).map((r: any, i: number) => {
              const win = (tm.winners || []).includes(r.id);
              return (
                <div key={r.id} className={`flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0 ${win ? "text-emerald-300 font-bold" : "text-white/70"}`}>
                  <span>{win ? "🏆" : `${i + 1}.`} {r.id === me ? t("gm.you") : r.name}</span>
                  <span className="tabular-nums">{fmtClock(r.ms)}{r.dist != null && <span className="text-white/40 ml-2">({r.ms != null && r.ms > TIMER_TARGET_MS ? "+" : "−"}{fmtClock(r.dist)})</span>}</span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="my-4 select-none">
          <p className="text-white/50 text-xs mb-2">{tm.mode === "random" ? t("gm.timer.randomTarget") + " " : ""}{t("gm.timer.stopAt", { t: "\u0000" }).split("\u0000")[0]}<b className="text-amber-300 text-base">{fmtClock(TIMER_TARGET_MS)}</b>{t("gm.timer.stopAt", { t: "\u0000" }).split("\u0000")[1]}</p>
          <p className={`text-5xl font-black tabular-nums mb-4 ${iStopped ? "text-white/70" : near ? "text-emerald-300" : "text-amber-300"}`} style={{ letterSpacing: "0.05em" }}>{fmtClock(shown)}</p>
          <button onClick={stop} disabled={iStopped} className={`w-44 h-44 mx-auto rounded-full flex flex-col items-center justify-center text-3xl font-black transition-transform ${iStopped ? "opacity-60" : "active:scale-90"}`} style={{ background: iStopped ? "rgba(255,255,255,0.08)" : "radial-gradient(circle at 30% 30%, #ff8a8a, #e0398b)", boxShadow: iStopped ? "none" : "0 10px 30px rgba(224,57,139,0.4)", color: iStopped ? "#f5b8d4" : "#1a0410" }}>
            {iStopped ? <><span className="text-4xl mb-1">✓</span><span className="text-lg">{t("gm.timer.locked")}</span></> : t("gm.timer.stop")}
          </button>
          <p className="text-white/60 text-sm mt-4">{t("gm.timer.stopped", { n: tm.stoppedCount || 0, total: tm.total || room.players.length })}</p>
        </div>
      )}
    </div>
  );
}

function SevenGame({ room, code, me }: any) {
  const { t } = useTranslation();
  const s = room.seven || {};
  const myTurn = s.turnId === me;
  const choosing = s.chooseFor === me;
  const last = s.last;
  const cur = room.players.find((p: any) => p.id === s.turnId);
  const roll = () => { if (myTurn && !s.chooseFor) { (sfx as any).dice?.(); post(`/api/reborn/games/rooms/${code}/action`, { act: "roll" }); } };
  const choose = (targetId: string) => post(`/api/reborn/games/rooms/${code}/action`, { act: "choose", targetId });
  return (
    <div className="rwg-card p-5 text-center">
      <p className="text-sm text-white/70 mb-3">{roomMsg(t, room)}</p>
      <div className="mb-4">
        <p className="text-xs text-white/40 mb-1">{t("gm.s789.cup")}{s.dir === -1 ? " · " + t("gm.s789.reversed") : ""}</p>
        <div className="text-3xl leading-none">{s.cupUnits > 0 ? "🍺".repeat(Math.min(10, s.cupUnits)) : "🫙"}</div>
        <p className="text-[11px] text-white/40 mt-1">{s.cupUnits > 0 ? t(s.cupUnits === 1 ? "gm.s789.pour1" : "gm.s789.pourN", { n: s.cupUnits }) : t("gm.s789.empty")}</p>
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
          <p className="text-sm font-bold text-amber-300 mb-2">{t("gm.s789.pick")}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {room.players.filter((p: any) => p.id !== me).map((p: any) => (
              <button key={p.id} onClick={() => choose(p.id)} className="cbtn cbtn-gold px-4 py-2 text-sm">{p.name}</button>
            ))}
            {room.players.length === 1 && <button onClick={() => choose(me)} className="cbtn cbtn-gold px-4 py-2 text-sm">{t("gm.s789.myself")}</button>}
          </div>
        </div>
      ) : s.chooseFor ? (
        <p className="text-white/50 text-sm py-2">{t("gm.s789.waitPick", { name: room.players.find((p: any) => p.id === s.chooseFor)?.name || t("gm.someone") })}</p>
      ) : myTurn ? (
        <button onClick={roll} className="cbtn cbtn-gold w-full py-5 text-xl">{t("gm.s789.roll")}</button>
      ) : (
        <p className="text-white/50 text-sm py-3">{cur ? t("gm.turnOf", { name: cur.name }) + "…" : t("gm.waiting")}</p>
      )}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {room.players.map((p: any) => (
          <span key={p.id} className={`px-3 py-1.5 rounded-full text-sm ${p.id === s.turnId ? "bg-amber-400/20 text-amber-200 border border-amber-400/40" : "bg-white/5 text-white/60"}`}>
            {p.id === s.turnId && "🎲 "}{p.id === me ? t("gm.you") : p.name}
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
  const { t } = useTranslation();
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
      <p className="text-sm text-white/60 mb-1">{roomMsg(t, room)}</p>
      <p className="text-3xl font-black text-amber-300 mb-2 tabular-nums">{st.height || 0} <span className="text-sm text-white/50">{t("gm.stack.high")}</span></p>
      {done ? (
        <div className="py-4">
          <div style={{ animation: "rwgPop .5s ease-out" }} className="text-7xl mb-2">{iWon ? "🏆" : "💥"}</div>
          <p className={`text-2xl font-black ${iWon ? "text-amber-300" : "text-red-300"}`}>{iWon ? t("gm.stack.survived") : t("gm.stack.knocked")}</p>
          {loser && <p className="text-white/60 text-sm mt-1">{loser.id === me ? t("gm.stack.youLose") : t("gm.stack.loses", { name: loser.name })}</p>}
        </div>
      ) : (
        <>
          <p className={`text-sm font-bold mb-1 ${myTurn ? "text-emerald-300" : "text-white/60"}`}>{myTurn ? t("gm.stack.yourTurn", { n: secsLeft }) : t("gm.turnSecs", { name: turnName || "…", n: secsLeft })}</p>
          {move && <p className="text-xs text-white/45 mb-2">{t("gm.stack.sliding")} <b className="text-amber-300">{move.axis === "x" ? t("gm.stack.horiz") : t("gm.stack.vert")}</b> · {t("gm.stack.topDown")}</p>}
          <div className={`relative mx-auto rounded-xl overflow-hidden select-none touch-none ${myTurn ? "cursor-pointer ring-2 ring-emerald-400/60" : ""}`} style={{ width: S, height: S, background: "repeating-linear-gradient(45deg,rgba(255,255,255,0.03),rgba(255,255,255,0.03) 10px,rgba(255,255,255,0.05) 10px,rgba(255,255,255,0.05) 20px)", border: "1px solid rgba(255,255,255,0.1)" }} onPointerDown={drop}>
            {tower.slice(startI).map((b: any, i: number) => {
              const idx = startI + i, depth = tower.slice(startI).length - i;
              return <div key={idx} className="absolute rounded-sm" style={{ left: b.x, top: b.y, width: b.w, height: b.h, background: `hsl(${(idx * 30) % 360} 70% 58%)`, opacity: Math.max(0.22, 1 - depth * 0.12) }} />;
            })}
            {mv && <div className="absolute rounded-sm" style={{ left: mv.x, top: mv.y, width: mv.w, height: mv.h, background: `hsl(${(tower.length * 30) % 360} 85% 66%)`, boxShadow: "0 0 14px rgba(255,255,255,0.45)", opacity: now < move.t0 ? 0.5 : 1 }} />}
          </div>
          <p className="text-white/50 text-xs mt-3">{myTurn ? t("gm.stack.lineUp") : t("gm.stack.whoever")}</p>
        </>
      )}
      <div className="mt-4 flex flex-wrap justify-center gap-1.5">
        {room.players.map((p: any) => (
          <span key={p.id} className={`px-2.5 py-1 rounded-full text-xs ${p.id === st.loserId ? "bg-red-500/20 text-red-300" : p.id === st.turnId ? "bg-emerald-400/20 text-emerald-200" : "bg-white/5 text-white/60"}`}>
            {p.id === me ? t("gm.you") : p.name} · {st.heights?.[p.id]?.h || 0}🧱{p.id === st.loserId ? " 💥" : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

const numGet = (path: string) => apiRequest("GET", path).then((r) => r.json());
function NumberGame({ onLeave }: { onLeave: () => void }) {
  const { t } = useTranslation();
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
    if (!Number.isFinite(g) || g < 0 || g > 9999) return toast({ title: t("gm.num.enter"), variant: "destructive" });
    setBusy(true);
    const { ok, d } = await post("/api/reborn/games/number/guess", { guess: g });
    setBusy(false);
    if (!ok) return toast({ title: t("gm.toast.cantGuess"), description: d.message, variant: "destructive" });
    setFeedback({ correct: !!d.correct, message: d.message });
    if (d.correct) sfx.rankUp?.(); else sfx.coin?.();
    setGuess("");
    setState(d);
  };
  if (state && state.available === false) {
    return (
      <div className="space-y-4">
        <button onClick={onLeave} className="text-sm text-white/60">← {t("gm.num.backGames")}</button>
        <div className="rwg-card p-6 text-center text-white/60">{t("gm.num.notToday")}</div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onLeave} className="text-sm text-white/60 inline-flex items-center gap-1"><LogOut className="w-4 h-4" /> {t("gm.back")}</button>
        <MuteToggle />
      </div>
      <div className="rwg-card p-5 text-center">
        <p className="text-5xl mb-1">🔢</p>
        <h2 className="text-xl font-black text-white">{t("gm.game.number")}</h2>
        <p className="text-white/50 text-sm">{t("gm.num.round", { n: state?.round ?? "—" })}</p>
        {state?.range && <p className="mt-2 inline-block rounded-full bg-white/5 border border-white/10 px-3 py-1 text-sm text-amber-300 font-bold tabular-nums">{t("gm.num.between", { a: state.range.low, b: state.range.high })}</p>}
        {feedback && (
          <div className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold ${feedback.correct ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30" : "bg-white/5 text-white/80 border border-white/10"}`} style={{ animation: "rwgPop .4s ease-out" }}>{feedback.message}</div>
        )}
        <div className="mt-4 flex gap-2">
          <input value={guess} onChange={(e) => setGuess(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))} onKeyDown={(e) => e.key === "Enter" && submit()} disabled={state?.remaining === 0} inputMode="numeric" placeholder="0000" className="flex-1 min-w-0 w-0 text-center text-2xl font-black tracking-[0.3em] rounded-xl bg-black/30 border border-white/10 py-3 text-white focus:outline-none focus:border-amber-400/60 disabled:opacity-50" />
          <button onClick={submit} disabled={busy || !guess || state?.remaining === 0} className="cbtn cbtn-gold shrink-0 px-6 py-3 text-base disabled:opacity-50">{t("gm.guess")}</button>
        </div>
        {typeof state?.dailyLimit === "number" && state.dailyLimit > 0 && (
          <p className={`mt-2 text-[11px] ${state.remaining === 0 ? "text-amber-300" : "text-white/50"}`}>{state.remaining > 0 ? t("gm.num.left", { n: state.remaining, max: state.dailyLimit }) : t("gm.num.noneLeft")}</p>
        )}
      </div>
      {state?.lastWinner && (
        <div className="rwg-card p-3 text-center text-sm text-emerald-300">{t("gm.num.lastWinner", { name: state.lastWinner.name, n: state.lastWinner.guess, r: state.lastWinner.round })}</div>
      )}
      <div className="gcard p-4">
        <p className="font-extrabold text-white flex items-center gap-2 mb-2"><Trophy className="w-4 h-4 text-amber-300" /> {t("gm.num.recent")}</p>
        {(!state?.history || state.history.length === 0) && <p className="text-xs text-white/40">{t("gm.num.noGuesses")}</p>}
        {(state?.history || []).map((h: any, i: number) => (
          <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0 text-sm">
            <span className="text-white/70 truncate">{h.userId === me ? t("gm.you") : h.name}</span>
            <span className="tabular-nums font-bold text-white">{h.guess}</span>
            <span className={`text-xs font-semibold ${h.hint === "higher" ? "text-emerald-300" : "text-sky-300"}`}>{h.hint === "higher" ? t("gm.num.higher") : t("gm.num.lower")}</span>
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

const cupsLabel = (u: number) => translate(u <= 2 ? "gm.srv.cup1" : "gm.srv.cupN", { n: u % 2 ? (u === 1 ? "½" : `${Math.floor(u / 2)}½`) : `${u / 2}` });
const PK_RANK: Record<number, string> = { 11: "J", 12: "Q", 13: "K", 14: "A" };
function PokerCard({ c, hidden, small }: { c?: any; hidden?: boolean; small?: boolean }) {
  const cls = small ? "w-9 h-12 text-sm" : "w-16 h-24 text-2xl";
  if (hidden || !c) return <div className={`${cls} rounded-lg border-2 border-white/80 shadow-lg`} style={{ background: "repeating-linear-gradient(45deg,#7c3aed 0 6px,#5b21b6 6px 12px)" }} />;
  const red = c.s === "♥" || c.s === "♦";
  return <div className={`${cls} rounded-lg bg-white shadow-lg flex flex-col items-center justify-center font-black ${red ? "text-red-600" : "text-slate-900"}`} style={{ animation: "rwgPop .35s ease-out" }}><span className="leading-none">{PK_RANK[c.r] || c.r}</span><span className="leading-none">{c.s}</span></div>;
}
function PokerGame({ room, code, me }: any) {
  const { t } = useTranslation();
  const pk = room.poker || {};
  const { toast } = useToast();
  const myTurn = room.status === "playing" && pk.turnId === me;
  const iSeen = !!pk.seen?.[me];
  const act = async (a: string) => {
    try {
      const { ok, d } = await post(`/api/reborn/games/rooms/${code}/action`, { act: a });
      if (!ok) toast({ title: t("gm.toast.cantDo"), description: d.message, variant: "destructive" });
    } catch (e: any) { toast({ title: t("gm.toast.cantDo"), description: String(e?.message || e).replace(/^\d+:\s*/, ""), variant: "destructive" }); }
  };
  const turnName = room.players.find((p: any) => p.id === pk.turnId)?.name;
  if (room.status === "done" && pk.reveal) {
    const iLost = pk.reveal.results.find((r: any) => r.id === me)?.loser;
    return (
      <div className="rwg-card p-5 text-center">
        <div className="text-6xl mb-1">{iLost ? "🍺" : "🏆"}</div>
        <p className={`text-2xl font-black ${iLost ? "text-red-300" : "text-emerald-300"}`}>{iLost ? t("gm.pk.youDrink", { cups: cupsLabel(pk.reveal.pot) }) : t("gm.youSafe")}</p>
        <p className="text-white/60 text-sm mt-1 mb-4">{roomMsg(t, room)}</p>
        <div className="space-y-2 text-left">
          {pk.reveal.results.map((r: any, i: number) => (
            <div key={r.id} className={`flex items-center gap-3 rounded-xl p-2.5 ${r.loser ? "bg-red-500/15 border border-red-400/40" : "bg-white/5 border border-white/10"}`}>
              <span className="w-5 text-center text-sm text-white/50">{i + 1}</span>
              <div className="flex gap-1">{r.cards.map((c: any, j: number) => <PokerCard key={j} small c={c} />)}</div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{r.id === me ? t("gm.you") : r.name}</p><p className="text-[11px] text-white/55">{pkCat(t, r.cat)}</p></div>
              {r.loser && <span className="shrink-0 text-sm font-black text-red-300">{t("gm.pk.drinks")}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="rwg-card p-5 text-center">
      <p className="text-sm text-white/60 mb-3">{roomMsg(t, room)}</p>
      <div className="flex justify-center gap-3 mb-4">
        <div className="rounded-2xl bg-amber-400/15 border border-amber-300/30 px-4 py-2"><p className="text-[11px] text-amber-200/70 uppercase font-bold">{t("gm.pk.pot")}</p><p className="text-xl font-black text-amber-300">🍺 {cupsLabel(pk.pot || 0)}</p></div>
        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-2"><p className="text-[11px] text-white/50 uppercase font-bold">{t("gm.pk.stake")}</p><p className="text-xl font-black">{cupsLabel(pk.stake || 1)}</p></div>
        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-2"><p className="text-[11px] text-white/50 uppercase font-bold">{t("gm.pk.max")}</p><p className="text-xl font-black">{cupsLabel(pk.cap || 20)}</p></div>
      </div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-2">{t("gm.pk.yourCards")} {iSeen ? `· ${pkCat(t, pk.myHand || "")}` : "· " + t("gm.pk.blind")}</p>
      <div className="flex justify-center gap-2 mb-4">{[0, 1, 2].map((i) => <PokerCard key={i} hidden={!iSeen} c={pk.myCards?.[i]} />)}</div>
      {room.status === "playing" && (myTurn ? (
        iSeen ? (
          <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <button onClick={() => act("follow")} className="cbtn cbtn-gold py-3 text-sm leading-tight">{t("gm.pk.follow")}<br /><span className="text-[11px] opacity-80">{t("gm.pk.followSub", { cups: cupsLabel((pk.stake || 1) * 2) })}</span></button>
            <button onClick={() => act("fold")} className="cbtn cbtn-dark py-3 text-sm leading-tight">{t("gm.pk.fold")}<br /><span className="text-[11px] opacity-80">{t("gm.pk.foldSub")}</span></button>
          </div>
        ) : (
          <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
            <button onClick={() => act("call")} className="cbtn cbtn-cyan py-3 text-sm leading-tight">{t("gm.pk.call")}<br /><span className="text-[11px] opacity-80">+{cupsLabel(pk.stake || 1)}</span></button>
            <button onClick={() => act("raise")} className="cbtn cbtn-gold py-3 text-sm leading-tight">{t("gm.pk.raise")}<br /><span className="text-[11px] opacity-80">+{cupsLabel((pk.stake || 1) + 1)}</span></button>
            <button onClick={() => act("look")} className="cbtn cbtn-dark py-3 text-sm leading-tight">{t("gm.pk.look")}<br /><span className="text-[11px] opacity-80">{t("gm.pk.lookSub")}</span></button>
          </div>
        )
      ) : (
        <div>
          <p className="text-white/50 text-sm">{t("gm.waitFor", { name: turnName || "…" })} ({t("gm.unit.s", { n: room.secondsLeft })})</p>
          {!iSeen && <button onClick={() => act("look")} className="mt-2 cbtn cbtn-dark px-5 py-2 text-xs">{t("gm.pk.lookMine")}</button>}
        </div>
      ))}
      <div className="mt-4 flex flex-wrap justify-center gap-1.5">
        {room.players.map((p: any) => (
          <span key={p.id} className={`px-2.5 py-1 rounded-full text-xs ${p.id === pk.turnId ? "bg-emerald-400/20 text-emerald-200" : "bg-white/5 text-white/60"}`}>
            {p.id === me ? t("gm.you") : p.name} · {pk.seen?.[p.id] ? t("gm.pk.seen") : t("gm.pk.blind")}
          </span>
        ))}
      </div>
    </div>
  );
}

const FROG_TINT = ["#34d399", "#60a5fa", "#f472b6"];
function FrogGame({ room, code, me }: any) {
  const { t } = useTranslation();
  const f = room.frog || {};
  const { toast } = useToast();
  const myTurn = f.turnId === me;
  const turnName = room.players.find((p: any) => p.id === f.turnId)?.name;
  const act = async (body: any) => {
    try {
      const { ok, d } = await post(`/api/reborn/games/rooms/${code}/action`, body);
      if (!ok) toast({ title: t("gm.toast.cantDo"), description: d.message, variant: "destructive" });
    } catch (e: any) { toast({ title: t("gm.toast.cantDo"), description: String(e?.message || e).replace(/^\d+:\s*/, ""), variant: "destructive" }); }
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
      <p className="text-sm text-white/70 mb-3 min-h-[20px]">{roomMsg(t, room)}</p>
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
              <span className="mt-0.5 text-[11px] font-black text-white/90">{t("gm.frog.n", { n: i + 1 })}</span>
              {who.length > 0 && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">{who.map((p: any) => (p.id === me ? t("gm.you") : p.name)).join(", ")}</span>}
              {leaderPick && <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-black">👑 {last.leaderId === me ? t("gm.you") : turnName}</span>}
            </button>
          );
        })}
      </div>
      {f.phase === "wait" && (myTurn
        ? <button onClick={() => act({ act: "start" })} className="cbtn cbtn-gold w-full py-4 text-lg">{t("gm.frog.start")}</button>
        : <p className="text-white/60 text-sm">{t("gm.frog.waitStart", { name: turnName || "…", n: room.secondsLeft })}</p>)}
      {f.phase === "pick" && <p className={`text-sm font-bold ${f.myPick === null ? "text-emerald-300" : "text-white/60"}`}>{f.myPick === null ? t("gm.frog.tap", { n: left.toFixed(1) }) : t("gm.frog.locked", { f: f.myPick + 1, n: (f.picked || []).length, total: room.players.length })}</p>}
      {f.phase === "reveal" && (
        <p className={`text-lg font-black ${drinkerIds.has(me) ? "text-red-300" : "text-emerald-300"}`}>{drinkerIds.has(me) ? t("gm.frog.youDrink") : "😎 " + t("gm.youSafe")}</p>
      )}
      <div className="mt-4 text-left">
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1">{t("gm.frog.cups")}</p>
        {room.players.map((p: any) => (
          <div key={p.id} className={`flex items-center justify-between py-1 text-sm border-b border-white/5 last:border-0 ${p.id === f.turnId ? "text-amber-200" : "text-white/70"}`}>
            <span>{p.id === f.turnId ? "👑 " : ""}{p.id === me ? t("gm.you") : p.name}{f.phase === "pick" && (f.picked || []).includes(p.id) ? " ✓" : ""}</span>
            <span className="font-bold tabular-nums">🍺 {((f.drinks?.[p.id] || 0) / 2).toString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const RL_COLORS = ["#10b981", "#f43f5e", "#3b82f6", "#f59e0b", "#a855f7", "#14b8a6", "#ec4899", "#84cc16"];
function RlglGame({ room, code, me }: any) {
  const { t } = useTranslation();
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
        <p className={`text-2xl font-black ${iWon ? "text-emerald-300" : "text-red-300"}`}>{iWon ? t("gm.rl.madeIt") : t("gm.youDrink")}</p>
        <p className="text-white/60 text-sm mt-1 mb-4">{roomMsg(t, room)}</p>
        <div className="space-y-1.5 text-left">
          {players.sort((a: any, b: any) => (b.s.done ? 1e9 - (b.s.ms || 0) : b.s.steps) - (a.s.done ? 1e9 - (a.s.ms || 0) : a.s.steps)).map((p: any) => (
            <div key={p.id} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${p.s.done ? "bg-emerald-500/15" : "bg-red-500/10"}`}>
              <span className="font-bold">{String(p.s.num || 0).padStart(3, "0")} · {p.id === me ? t("gm.you") : p.name}</span>
              <span className={p.s.done ? "text-emerald-300" : "text-red-300"}>{p.s.done ? `🏁 ${t("gm.unit.s", { n: ((p.s.ms || 0) / 1000).toFixed(1) })}` : p.s.out ? t("gm.rl.movedRed") : `${p.s.steps}/${goal} · ⏰`}</span>
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
        <span className="text-lg font-black text-white">{counting ? t("gm.rl.ready", { n: secs }) : green ? t("gm.rl.green") : t("gm.rl.red")}</span>
        <MuteToggle />
        <span className="rounded-full bg-black/30 px-3 py-1 text-sm font-bold tabular-nums text-white">⏱ {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</span>
      </div>
      {/* the field: doll at the finish, players walking up */}
      <div className="relative mx-auto h-64 w-full" style={{ background: "linear-gradient(180deg,#fde68a 0%,#f5d08a 12%,#e9c58f 100%)" }}>
        <div className="absolute inset-x-0 top-[14%] h-1 bg-red-600/80" />
        <div className="absolute left-1/2 top-1 -translate-x-1/2 text-4xl transition-transform duration-300" style={{ transform: `translateX(-50%) scaleX(${green ? -1 : 1})` }}>{green ? "🧍‍♀️" : "👧"}</div>
        <span className="absolute right-2 top-[15%] text-[10px] font-black text-red-700">{t("gm.finish")}</span>
        {players.map((p: any, i: number) => {
          const steps = p.id === me ? local : p.s.steps;
          const x = ((i + 0.5) / players.length) * 100;
          const y = 92 - (Math.min(steps, goal) / goal) * 76;
          return (
            <div key={p.id} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-all duration-200" style={{ left: `${x}%`, top: `${y}%`, opacity: p.s.out ? 0.35 : 1 }}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-black text-white shadow" style={{ background: p.color, outline: p.id === me ? "3px solid #111" : "none" }}>{p.s.out ? "💥" : p.s.done ? "🏁" : String(p.s.num || 0).padStart(3, "0")}</div>
              <span className="mt-0.5 max-w-[60px] truncate rounded bg-black/40 px-1 text-[9px] font-bold text-white">{p.id === me ? t("gm.you") : p.name}</span>
            </div>
          );
        })}
      </div>
      <div className="p-4">
        <p className="mb-2 text-sm text-white/70">{my.out ? t("gm.rl.youOut") : my.done ? t("gm.rl.youCrossed") : t("gm.rl.steps", { n: local, goal })}</p>
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${(local / goal) * 100}%` }} /></div>
        <div className={`grid gap-3 ${wrong ? "animate-pulse" : ""}`} style={{ gridTemplateColumns: "1fr 1fr" }}>
          {(["L", "R"] as const).map((side) => (
            <button key={side} onPointerDown={(e) => { e.preventDefault(); tap(side); }} disabled={my.out || my.done}
              className={`h-28 rounded-2xl text-2xl font-black text-white transition active:scale-95 disabled:opacity-40 ${next.current === side && !my.out && !my.done ? "ring-4 ring-white/70" : ""}`}
              style={{ background: side === "L" ? "linear-gradient(135deg,#ec4899,#be185d)" : "linear-gradient(135deg,#0ea5e9,#0369a1)", touchAction: "manipulation" }}>
              {side === "L" ? `👣 ${t("gm.left")}` : `${t("gm.right")} 👣`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// One colour per player (up to 5) for their matched cards and score chip.
const MEM_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#a855f7"];

function MemoryGame({ room, code, me }: any) {
  const { t } = useTranslation();
  const m = room.memory || {};
  const { toast } = useToast();
  const myTurn = room.status === "playing" && m.turnId === me && !m.busy;
  const turnName = room.players.find((p: any) => p.id === m.turnId)?.name;
  const flip = async (idx: number) => {
    try {
      const { ok, d } = await post(`/api/reborn/games/rooms/${code}/action`, { idx });
      if (!ok) toast({ title: t("gm.toast.cantFlip"), description: d.message, variant: "destructive" });
    } catch (e: any) { toast({ title: t("gm.toast.cantFlip"), description: String(e?.message || e).replace(/^\d+:\s*/, ""), variant: "destructive" }); }
  };
  const me0 = room.players.find((p: any) => p.id === me);
  const colorOf = (id: string) => MEM_COLORS[Math.max(0, room.players.findIndex((p: any) => p.id === id)) % MEM_COLORS.length];
  const done = room.status === "done";
  const iLost = done && room.lastLoserId && (m.score?.[me] || 0) <= Math.min(...room.players.map((p: any) => m.score?.[p.id] || 0));
  return (
    <div className="rwg-card p-4 text-center">
      {/* scoreboard */}
      <div className="mb-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${room.players.length}, minmax(0, 1fr))` }}>
        {room.players.map((p: any) => (
          <div key={p.id} className={`rounded-2xl border px-3 py-2 ${m.turnId === p.id ? "border-white/60 bg-white/10" : "border-white/10 bg-white/5"}`}>
            <p className="truncate text-xs font-bold" style={{ color: colorOf(p.id) }}>{m.turnId === p.id ? "▶ " : ""}{p.id === me ? t("gm.you") : p.name}</p>
            <p className="text-2xl font-black tabular-nums">{m.score?.[p.id] || 0}</p>
          </div>
        ))}
      </div>
      <p className="mb-3 min-h-[20px] text-sm text-white/70">{done ? roomMsg(t, room) : myTurn ? t("gm.mem.yourTurn", { n: room.secondsLeft }) : m.busy ? roomMsg(t, room) : t("gm.turnSecs", { name: turnName || "…", n: room.secondsLeft })}</p>
      {done && <p className={`mb-3 text-2xl font-black ${iLost ? "text-red-300" : "text-emerald-300"}`}>{iLost ? "🍺 " + t("gm.youDrink") : "🏆 " + t("gm.youWin")}</p>}
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
      {!me0 && <p className="mt-2 text-xs text-white/40">{t("gm.watching")}</p>}
    </div>
  );
}

const DG_COLORS = ["#111111", "#ef4444", "#f97316", "#facc15", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#92400e", "#ffffff"];
const DG_WIDTHS = [4, 9, 18];
function DrawGame({ room, code, me }: any) {
  const { t, language } = useTranslation();
  const g = room.draw || {};
  const { toast } = useToast();
  const done = room.status === "done";
  const amDrawer = g.drawerId === me;
  const drawerName = room.players.find((p: any) => p.id === g.drawerId)?.name || t("gm.dg.drawer");
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
  const act = async (body: any, title = t("gm.toast.oops")) => {
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
      act({ act: "stroke", id, c: s.c, w: s.w, p: p.length === 2 ? [...p, p[0] + 1, p[1]] : p }, t("gm.toast.cantDraw")).then(() => {
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
  const tr = t;
  const send = async () => {
    const t = guess.trim();
    if (!t) return;
    setGuess("");
    await act({ act: "guess", text: t }, tr("gm.toast.guessNotSent"));
  };
  const serverStrokes = (g.strokes || []).filter((s: any) => !local[s.id]);
  const all = [...serverStrokes, ...Object.values(local)];
  const iWon = done && !!g.winnerId && (g.winnerId === me || amDrawer);
  const mm = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  return (
    <div className="rwg-card p-3 text-center">
      <p className="mb-2 min-h-[20px] text-sm text-white/75">{roomMsg(t, room)}</p>
      {done && <p className={`mb-2 text-2xl font-black ${iWon ? "text-emerald-300" : "text-red-300"}`}>{iWon ? "🎉 " + t("gm.youWin") : "🍺 " + t("gm.youDrink")}</p>}
      <div className="mb-2 flex items-center justify-between gap-2 text-left">
        <div className="min-w-0">
          <p className="truncate text-xs text-white/50">✏️ {amDrawer ? t("gm.dg.youDraw") : t("gm.dg.isDrawing", { name: drawerName })} · {DG_CAT_KEY[g.category] ? t(DG_CAT_KEY[g.category]) : g.category}</p>
          {amDrawer || done
            ? <p className="truncate text-lg font-black text-amber-300">{amDrawer && !done ? t("gm.dg.draw") : t("gm.dg.answer")}{g.wordKey ? t(g.wordKey).toUpperCase() : String(g.word || "").toUpperCase()}</p>
            : language === "en" || !g.lens
              ? <p className="font-mono text-lg font-black tracking-[0.25em] text-amber-300 break-all">{String(g.mask || "").toUpperCase()} <span className="text-xs tracking-normal text-white/40">({String(g.mask || "").replace(/ /g, "").length})</span></p>
              : <p className="font-mono text-lg font-black tracking-[0.25em] text-amber-300 break-all">{"_".repeat(g.lens[language] || 0)} <span className="text-xs tracking-normal text-white/40">({g.lens[language]})</span></p>}
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
              <button key={c} onClick={() => setColor(c)} aria-label={t("gm.dg.colour", { c })} title={t("gm.dg.colour", { c })}
                className={`h-7 w-7 rounded-full border-2 ${color === c ? "scale-110 border-amber-300" : "border-white/30"}`} style={{ background: c }} />
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {DG_WIDTHS.map((w) => (
              <button key={w} onClick={() => setWidth(w)} className={`flex h-8 w-10 items-center justify-center rounded-lg border ${width === w ? "border-amber-300 bg-white/15" : "border-white/15 bg-white/5"}`}>
                <span className="rounded-full bg-white" style={{ width: w, height: w }} />
              </button>
            ))}
            <button onClick={() => act({ act: "undo" })} className="h-8 rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-bold text-white">↶ {t("gm.dg.undo")}</button>
            <button onClick={() => act({ act: "clear" })} className="h-8 rounded-lg border border-red-400/30 bg-red-500/15 px-3 text-xs font-bold text-red-200">🗑 {t("gm.dg.clear")}</button>
          </div>
          <p className="text-[11px] text-white/40">{t("gm.dg.tip")}</p>
        </div>
      )}
      <div ref={feedRef} className="mx-auto mt-2 max-h-32 max-w-md overflow-y-auto rounded-xl bg-black/25 p-2 text-left text-sm">
        {feedLen === 0 ? <p className="text-center text-xs text-white/35">{t("gm.dg.feedEmpty")}</p> :
          (g.feed || []).map((f: any, i: number) => (
            <p key={i} className="truncate"><b className={f.id === me ? "text-amber-300" : "text-white/80"}>{f.name}:</b> <span className="text-white/60">{f.text}</span></p>
          ))}
      </div>
      {!amDrawer && !done && (
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mx-auto mt-2 flex max-w-md gap-2">
          <input value={guess} onChange={(e) => setGuess(e.target.value)} maxLength={40} placeholder={t("gm.dg.guessPh")} autoComplete="off"
            className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white placeholder:text-white/35" />
          <button type="submit" className="shrink-0 rounded-xl bg-amber-400 px-4 py-2 font-black text-slate-950">{t("gm.guess")}</button>
        </form>
      )}
    </div>
  );
}

function BridgeGame({ room, code, me }: any) {
  const { t } = useTranslation();
  const g = room.bridge || {};
  const { toast } = useToast();
  const myTurn = room.status === "playing" && g.turnId === me;
  const turnName = room.players.find((p: any) => p.id === g.turnId)?.name;
  const rows: number = g.rows || 10;
  const step = async (side: number) => {
    try {
      const { ok, d } = await post(`/api/reborn/games/rooms/${code}/action`, { side });
      if (!ok) toast({ title: t("gm.toast.cantStep"), description: d.message, variant: "destructive" });
    } catch (e: any) { toast({ title: t("gm.toast.cantStep"), description: String(e?.message || e).replace(/^\d+:\s*/, ""), variant: "destructive" }); }
  };
  const lastKey = g.last ? `${g.last.id}-${g.last.row}-${g.last.fell ? "f" : g.last.crossed ? "c" : "s"}` : "";
  useEffect(() => { if (!g.last) return; if (g.last.fell) sfx.eliminated(); else if (g.last.crossed) sfx.win(); else sfx.tick(); }, [lastKey]);
  const done = room.status === "done";
  const iWon = (g.done || []).includes(me);
  const iFell = (g.fell || []).includes(me);
  const status = (id: string) => ((g.done || []).includes(id) ? "🏁" : (g.fell || []).includes(id) ? "💥" : id === g.turnId ? "🚶" : "⏳");
  return (
    <div className="rwg-card p-4 text-center">
      <p className="mb-2 min-h-[20px] text-sm text-white/75">{roomMsg(t, room)}</p>
      {done && <p className={`mb-2 text-2xl font-black ${iWon ? "text-emerald-300" : "text-red-300"}`}>{iWon ? t("gm.gb.youCrossed") : t("gm.gb.youDrink")}</p>}
      {/* the bridge: finish at the top, start at the bottom */}
      <div className="mx-auto max-w-xs rounded-2xl p-3" style={{ background: "linear-gradient(180deg,#0f172a,#1e1b4b)" }}>
        <div className="mb-1.5 rounded-lg bg-emerald-500/30 py-1 text-[11px] font-black tracking-widest text-emerald-200">{t("gm.finish")} 🏁</div>
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
                    {broken ? "💥" : knownSafe ? "✓" : clickable ? (side ? t("gm.right") : t("gm.left")) : ""}
                    {here && g.known?.[r] === null && side === 0 && <span className="absolute -left-1 -top-3 text-base">🚶</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
        <div className="rounded-lg bg-white/10 py-1 text-[11px] font-black tracking-widest text-white/60">{t("gm.gb.start")}</div>
      </div>
      {!done && (
        <p className={`mt-3 text-sm font-bold ${myTurn ? "text-amber-300" : "text-white/60"}`}>
          {myTurn ? t("gm.gb.yourTurn", { r: g.pos + 1, n: room.secondsLeft }) : iFell ? t("gm.gb.youFell") : iWon ? t("gm.gb.across") : t("gm.gb.walking", { name: turnName || "…", n: room.secondsLeft })}
        </p>
      )}
      {/* walking order */}
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {(g.order || []).map((id: string, i: number) => {
          const p = room.players.find((x: any) => x.id === id);
          if (!p) return null;
          return <span key={id} className={`rounded-full px-2.5 py-1 text-xs ${id === g.turnId ? "bg-amber-400/25 text-amber-200" : (g.fell || []).includes(id) ? "bg-red-500/15 text-red-300" : (g.done || []).includes(id) ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-white/60"}`}>{i + 1}. {id === me ? t("gm.you") : p.name} {status(id)}</span>;
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
  const { t } = useTranslation();
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
        <p className={`text-2xl font-black ${iWon ? "text-amber-300" : iLost ? "text-red-300" : "text-white/70"}`}>{iWon ? t("gm.dice.calledIt") : iLost ? t("gm.youLoseDrink") : t("gm.gameOver")}</p>
        <p className="text-white/60 text-sm mt-2">{roomMsg(t, room)}</p>
      </div>
    );
  }

  const reveal = room.status === "reveal" && d.reveal;

  return (
    <div className="rwg-card p-4">
      <p className="text-sm text-amber-200 text-center mb-1">{roomMsg(t, room)}</p>
      {room.status === "playing" && secs > 0 && <p className={`text-center font-black mb-2 tabular-nums ${secs <= 4 ? "text-red-400" : "text-white/60"}`}>⏱ {t("gm.unit.s", { n: secs })}{myTurn ? " — " + t("gm.dice.yourTurn") : ""}</p>}

      {/* current bid + joker status */}
      <div className="flex items-center justify-center gap-4 mb-3">
        <div className="text-center px-4 py-2 rounded-xl bg-white/5 border border-white/10">
          <p className="text-[10px] text-white/40 mb-0.5">{t("gm.dice.current")}</p>
          {bid ? <div className="flex items-center gap-2 justify-center"><span className="text-2xl font-black text-white">{bid.qty} ×</span><Die v={bid.face} size={34} /></div> : <p className="text-xl font-black text-white">—</p>}
        </div>
        <div className="text-center">
          <p className={`text-xs font-bold ${d.jokerActive ? "text-emerald-300" : "text-white/40"}`}>① {d.jokerActive ? t("gm.dice.wild") : t("gm.dice.notWild")}</p>
          <p className="text-[10px] text-white/40">{t("gm.dice.onTable", { n: d.totalDice })}</p>
        </div>
      </div>

      {/* reveal */}
      {reveal && (
        <div className="mb-3 rounded-xl bg-black/30 border border-white/10 p-3">
          <p className="text-center text-sm text-white/70 mb-2">
            {reveal.timeout
              ? t("gm.dice.timeout")
              : <>{t("gm.dice.bidWas", { q: reveal.bid.qty, f: reveal.bid.face === 1 ? "①" : DIE_FACE[reveal.bid.face] })} — {t("gm.dice.actually")} <b className="text-amber-300">{reveal.actual}</b> {t("gm.dice.onTableShort")}</>}
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
          <p className="text-[11px] text-white/50 mb-2 text-center">{t("gm.dice.yours")}</p>
          <div className="mb-4 rounded-2xl bg-black/20 border border-white/10 py-3 space-y-2">
            <DiceRow vals={myDice.slice(0, 3)} size={56} faceHi={bid?.face} />
            {myDice.length > 3 && <DiceRow vals={myDice.slice(3)} size={56} faceHi={bid?.face} />}
          </div>
        </>
      ) : <p className="text-center text-white/40 text-sm mb-3">{t("gm.dice.out")}</p>}

      {/* players */}
      <div className="flex flex-wrap justify-center gap-2 mb-3">
        {room.players.map((p: any) => (
          <span key={p.id} className={`px-2.5 py-1 rounded-full text-xs ${!p.alive ? "bg-white/5 text-white/30 line-through" : d.turnId === p.id ? "bg-amber-400/20 text-amber-200 border border-amber-400/40" : "bg-white/5 text-white/60"}`}>
            {p.id === me ? t("gm.you") : p.name} · {Array.isArray(d.dice?.[p.id]) ? d.dice[p.id].length : d.dice?.[p.id] || 0}🎲{d.turnId === p.id ? " ⏳" : ""}
          </span>
        ))}
      </div>

      {/* controls */}
      {myTurn && room.status === "playing" && (
        <div className="rounded-xl bg-black/30 border border-white/10 p-3 mb-2">
          <p className="text-[11px] text-white/50 mb-2">{t("gm.dice.yourBid", { min: bid ? t("gm.dice.higherNow") : d.minOpen })}</p>
          <div className="flex flex-wrap gap-2 justify-center mb-2">
            {[1, 2, 3, 4, 5, 6].map((f) => (
              <button key={f} onClick={() => setFace(f)} className={`p-1 rounded-xl transition ${face === f ? "bg-amber-400 ring-2 ring-amber-300 scale-105" : "bg-white/5 border border-white/10"}`}><Die v={f} size={44} /></button>
            ))}
          </div>
          <div className="flex items-center gap-2 justify-center mb-2">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 text-white text-xl font-bold">−</button>
            <input type="number" inputMode="numeric" value={qty || ""} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setQty(Number(e.target.value))} className="w-20 text-center rounded-lg bg-black/40 border border-white/10 py-2 text-white font-extrabold text-lg" />
            <button onClick={() => setQty((q) => q + 1)} className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 text-white text-xl font-bold">+</button>
            <span className="text-xs text-white/50">{t("gm.dice.dice")}</span>
          </div>
          <label className="flex items-center justify-center gap-2 text-xs text-white/60 mb-2"><input type="checkbox" checked={strike} onChange={(e) => setStrike(e.target.checked)} /> {t("gm.dice.strike")}</label>
          <button onClick={async () => { sfx.click(); const { ok, d: r } = await act({ act: "bid", face, qty, strike }); if (!ok) toast({ title: t("gm.toast.cantBid"), description: r?.message, variant: "destructive" }); }} className="cbtn cbtn-gold w-full py-3">{bid ? t("gm.dice.raise") : t("gm.dice.open")}</button>
        </div>
      )}

      {canCatch && (
        <button onClick={async () => { if (confirm(t("gm.dice.confirm", { q: bid.qty, f: bid.face === 1 ? "①" : DIE_FACE[bid.face] }))) { const { ok, d: r } = await act({ act: "catch" }); if (!ok) toast({ title: t("gm.toast.cantCatch"), description: r?.message, variant: "destructive" }); } }} className="cbtn cbtn-red w-full py-3.5">{t("gm.dice.catch")}</button>
      )}
      {!myTurn && !canCatch && room.status === "playing" && <p className="text-center text-white/40 text-sm">{t("gm.waiting")}</p>}
    </div>
  );
}

function WheelGame({ room, code, me }: any) {
  const { t } = useTranslation();
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
    return <div className="rwg-card p-6 text-center"><div className="text-6xl mb-2">🍻</div><p className="text-xl font-black text-amber-300">{t("gm.wheel.done")}</p><p className="text-white/60 text-sm mt-1">{roomMsg(t, room)}</p></div>;
  }
  return (
    <div className="rwg-card p-5 text-center">
      <p className="text-sm text-amber-200 mb-3">{roomMsg(t, room)}</p>
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
                <text x={lx} y={ly} fill={p.pass ? "#f0d787" : "#1a1030"} fontSize={N > 10 ? 8.5 : N > 6 ? 9 : 11} fontWeight="800" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${mid}, ${lx.toFixed(2)}, ${ly.toFixed(2)})`}>{wheelLabel(t, p.label)}</text>
              </g>
            );
          })}
          <circle cx="100" cy="100" r="16" fill="#0a0714" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
        </svg>
      </div>
      {room.status === "reveal" && w.result && <p className="text-2xl font-black text-amber-300 mb-3" style={{ animation: "rwgPop .5s ease-out" }}>{w.result.pass ? `${w.result.name}: ${t("gm.wheel.passNoDrink")} ${w.result.emoji}` : `${w.result.name}: ${wheelLabel(t, w.result.label)} ${w.result.emoji}`}</p>}
      {myTurn ? (
        <button onClick={() => { sfx.spin(); act({ act: "spin" }); }} className="cbtn cbtn-gold w-full py-4 text-lg">{t("gm.wheel.spin")}</button>
      ) : room.status === "playing" ? (
        <p className="text-white/50 text-sm">{t("gm.wheel.waitSpin", { name: room.players.find((p: any) => p.id === w.turnId)?.name || "…" })}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {room.players.map((p: any) => <span key={p.id} className={`px-2.5 py-1 rounded-full text-xs ${w.spun?.includes(p.id) ? "bg-white/5 text-white/40" : w.turnId === p.id ? "bg-amber-400/20 text-amber-200" : "bg-white/5 text-white/60"}`}>{p.id === me ? t("gm.you") : p.name}{w.spun?.includes(p.id) ? " ✓" : ""}</span>)}
      </div>
    </div>
  );
}

const FACE = { grandma: "👵", wolf: "🐺", witch: "🧙" } as const;
function RidingGame({ room, code, me }: any) {
  const { t } = useTranslation();
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
        <p className={`text-5xl font-black mt-2 ${witch ? "text-purple-300" : "text-red-300"}`} style={{ animation: "rwgPop .6s ease-out" }}>{witch ? t("gm.ride.witch") : t("gm.ride.wolf")}</p>
        <p className="text-white text-lg font-bold mt-3">{t(witch ? "gm.ride.loseDouble" : "gm.ride.loseOne", { name: loserName || "" })}</p>
      </div>
    );
  }

  if (room.status === "done") {
    const iLost = room.lastLoserId === me;
    return <div className="rwg-card p-6 text-center"><div className="text-7xl mb-2">{iLost ? (lossKind === "witch" ? "🧙🍻" : "🐺🍻") : "👵"}</div><p className={`text-2xl font-black ${iLost ? "text-red-300" : "text-white/70"}`}>{iLost ? t("gm.youLoseDrink") : t("gm.ride.safe")}</p><p className="text-white/60 text-sm mt-2">{roomMsg(t, room)}</p></div>;
  }
  return (
    <div className="rwg-card p-4">
      <p className="text-sm text-amber-200 text-center mb-1">{roomMsg(t, room)}</p>
      {room.status === "playing" && secs > 0 && <p className={`text-center font-black mb-2 tabular-nums ${secs <= 5 ? "text-red-400" : "text-white/60"}`}>⏱ {t("gm.unit.s", { n: secs })}{myTurn ? " — " + t("gm.ride.tapMore", { n: r.clicks - r.flippedThisTurn }) : ""}</p>}
      <p className="text-center text-[11px] text-white/50 mb-2">{t("gm.ride.hint")}</p>

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
        {room.players.map((p: any) => <span key={p.id} className={`px-2.5 py-1 rounded-full text-xs ${r.turnId === p.id ? "bg-amber-400/20 text-amber-200 border border-amber-400/40" : "bg-white/5 text-white/60"}`}>{p.id === me ? t("gm.you") : p.name}{r.turnId === p.id ? " ⏳" : ""}</span>)}
      </div>
      {!myTurn && room.status === "playing" && <p className="text-center text-white/40 text-sm mt-2">{t("gm.ride.watch", { name: room.players.find((p: any) => p.id === r.turnId)?.name || "…" })}</p>}
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
  const { t } = useTranslation();
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
        <p className="text-lg font-black text-amber-200 mb-1">🃏 {t("gm.cards.completed", { name: rv.winnerName })}</p>
        <p className="text-white/50 text-xs mb-4">{rv.via === "deck" ? t("gm.cards.viaDeck") : t("gm.cards.viaDiscard")}</p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {orderHand(rv.hand || []).map((c: any) => <PlayingCard key={c.id} c={c} highlight={rv.winCard && c.id === rv.winCard.id} paired={c.pair} />)}
        </div>
        <p className="text-white/40 text-xs mt-4">{t("gm.cards.seeHand")}</p>
      </div>
    );
  }

  if (room.status === "done") {
    return (
      <div className="rwg-card p-6 text-center">
        <div style={{ animation: "rwgPop .5s ease-out" }} className="text-7xl mb-2">{iWon ? "🏆" : iLost ? "🍻" : "🃏"}</div>
        <p className={`text-2xl font-black ${iWon ? "text-amber-300" : iLost ? "text-red-300" : "text-white/70"}`}>{iWon ? t("gm.cards.youWin") : iLost ? t("gm.youLoseDrink") : (room.winnerId ? t("gm.gameOver") : t("gm.cards.tie"))}</p>
        <p className="text-white/60 text-sm mt-2">{roomMsg(t, room)}</p>
      </div>
    );
  }

  return (
    <div className="rwg-card p-4">
      <p className="text-sm text-amber-200 text-center mb-1">{roomMsg(t, room)}</p>
      {secs > 0 && <p className={`text-center font-black mb-3 tabular-nums ${secs <= 3 ? "text-red-400" : "text-white/60"}`}>⏱ {t("gm.unit.s", { n: secs })}{myTurn ? " — " + t("gm.cards.yourMove") : ""}</p>}

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
            {cards.oneAway?.[p.id] && <p className="text-[10px] font-bold text-red-300 animate-pulse">{t("gm.cards.lastCard")}</p>}
          </div>
        ))}
      </div>

      {/* deck + discard */}
      <div className="flex items-center justify-center gap-6 mb-4">
        <div className="text-center">
          <div className="w-12 h-16 rounded-lg bg-gradient-to-br from-violet-700 to-blue-800 border border-white/20 flex items-center justify-center text-white/70 text-xs font-bold">{cards.deckLeft}</div>
          <p className="text-[10px] text-white/40 mt-1">{t("gm.cards.deck")}</p>
        </div>
        <div className="text-center">
          {cards.discardTop ? <PlayingCard c={cards.discardTop} /> : <div className="w-12 h-16 rounded-lg border-2 border-dashed border-white/15" />}
          <p className="text-[10px] text-white/40 mt-1">{t("gm.cards.discard")}</p>
        </div>
      </div>

      {/* my hand — matched pairs grouped on the left (green), singles on the right */}
      <p className="text-[11px] text-white/50 mb-1 text-center">{t("gm.cards.yourHand")} {cards.oneAway?.[me] ? "· " + t("gm.cards.oneAway") : ""}</p>
      <div className="flex flex-wrap justify-center gap-1.5 mb-3">
        {ordered.map((c: any) => (
          <PlayingCard key={c.id} c={c} paired={c.pair} selectable={myTurn && cards.phase === "discard"} onClick={() => act({ act: "discard", cardId: c.id })} />
        ))}
      </div>

      {myTurn ? (
        cards.phase === "draw" ? (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => act({ act: "take" })} disabled={!cards.discardTop} className="cbtn cbtn-dark py-3 text-sm">{t("gm.cards.take")} {cards.discardTop ? `${cards.discardTop.v}${cards.discardTop.s}` : ""}</button>
            <button onClick={() => act({ act: "drawDeck" })} className="cbtn cbtn-gold py-3">{t("gm.cards.drawDeck")}</button>
          </div>
        ) : (
          <p className="text-center text-emerald-300 font-bold text-sm">{t("gm.cards.tapDiscard")}</p>
        )
      ) : (
        <p className="text-center text-white/40 text-sm">{t("gm.waitFor", { name: room.players.find((p: any) => p.id === cards.turnId)?.name || "…" })}</p>
      )}
    </div>
  );
}
