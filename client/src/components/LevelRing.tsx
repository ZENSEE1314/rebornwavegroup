// Gift levels (KOS): a ring around the member's photo that changes every 5
// levels (like TikTok), small level chips (🎁 Gifter / ⭐ Star) and a
// full-screen "LEVEL UP" animation when either level goes up.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";

type Tier = { min: number; key: string; ring: string; glow?: string; spin?: boolean; crown?: boolean };
// Every 5 levels a new ring; 40+ spin, 50 is legendary.
export const LEVEL_TIERS: Tier[] = [
  { min: 50, key: "legend", ring: "conic-gradient(#ff3b3b,#ffb800,#3dff6e,#22d3ee,#a855f7,#ff3bd4,#ff3b3b)", glow: "0 0 18px rgba(255,215,0,.9)", spin: true, crown: true },
  { min: 45, key: "rainbow", ring: "conic-gradient(#f43f5e,#f59e0b,#22c55e,#06b6d4,#8b5cf6,#f43f5e)", glow: "0 0 14px rgba(168,85,247,.8)", spin: true },
  { min: 40, key: "diamond", ring: "conic-gradient(#ffffff,#a5f3fc,#e0f2fe,#67e8f9,#ffffff)", glow: "0 0 14px rgba(165,243,252,.9)", spin: true },
  { min: 35, key: "ruby", ring: "linear-gradient(135deg,#fb7185,#be123c)", glow: "0 0 12px rgba(244,63,94,.75)" },
  { min: 30, key: "amethyst", ring: "linear-gradient(135deg,#d8b4fe,#7e22ce)", glow: "0 0 12px rgba(168,85,247,.75)" },
  { min: 25, key: "sapphire", ring: "linear-gradient(135deg,#93c5fd,#1d4ed8)", glow: "0 0 8px rgba(59,130,246,.6)" },
  { min: 20, key: "emerald", ring: "linear-gradient(135deg,#6ee7b7,#047857)" },
  { min: 15, key: "gold", ring: "linear-gradient(135deg,#fde68a,#d97706)" },
  { min: 10, key: "silver", ring: "linear-gradient(135deg,#f1f5f9,#94a3b8)" },
  { min: 5, key: "bronze", ring: "linear-gradient(135deg,#f0b27a,#9a5b2a)" },
  { min: 1, key: "basic", ring: "rgba(255,255,255,.18)" },
];
export const tierOf = (level: number) => LEVEL_TIERS.find((t) => level >= t.min) || LEVEL_TIERS[LEVEL_TIERS.length - 1];

// Keyframes (lvSpin, lvPop, lvRays, lvRise, lvSpark) live in index.css.

// The member's photo (or initial) inside their level ring.
export function LevelAvatar({ u, level = 1, size = 40, label, noCrown }: { u: any; level?: number; size?: number; label?: string; noCrown?: boolean }) {
  const tier = tierOf(level);
  const pad = level >= 5 ? Math.max(2, Math.round(size * 0.08)) : 2;
  const initial = label || (Array.from(String(u?.username || u?.firstName || "?"))[0] || "?").toUpperCase();
  return (
    <span className="relative inline-flex flex-shrink-0 rounded-full" style={{ width: size, height: size, boxShadow: tier.glow }}>
      <span className="absolute inset-0 rounded-full" style={{ background: tier.ring, animation: tier.spin ? "lvSpin 3s linear infinite" : undefined }} />
      <span className="absolute rounded-full overflow-hidden bg-[#160f2a]" style={{ inset: pad }}>
        {u?.photo
          ? <img src={u.photo} alt="" className="w-full h-full object-cover" />
          : <span className="w-full h-full flex items-center justify-center font-bold text-black" style={{ background: "linear-gradient(135deg,#ec4899,#c9a84c)", fontSize: size * 0.4 }}>{initial}</span>}
      </span>
      {tier.crown && !noCrown && <span className="absolute -top-2 left-1/2 -translate-x-1/2" style={{ fontSize: size * 0.32 }}>👑</span>}
    </span>
  );
}

// 🎁 Gifter level + ⭐ Star level chips.
export function LevelChips({ sender = 1, receiver = 1, small }: { sender?: number; receiver?: number; small?: boolean }) {
  const { t } = useTranslation();
  const cls = `inline-flex items-center gap-0.5 rounded-full font-black leading-none ${small ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"}`;
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <span className={cls} style={{ background: "linear-gradient(90deg,#ec4899,#be185d)", color: "#fff" }} title={t("vn.lv.gifter")}>🎁{sender}</span>
      <span className={cls} style={{ background: "linear-gradient(90deg,#fbbf24,#d97706)", color: "#1a1206" }} title={t("vn.lv.star")}>⭐{receiver}</span>
    </span>
  );
}

// Watches my levels; when one goes up, plays the LEVEL UP animation once.
export function LevelUpWatcher({ userId }: { userId?: string }) {
  const { data } = useQuery<any>({
    queryKey: ["/api/reborn/kos/levels/me"],
    queryFn: () => apiRequest("GET", "/api/reborn/kos/levels/me").then((r) => r.json()),
    enabled: !!userId, refetchInterval: 30000, refetchOnWindowFocus: true,
  });
  const [show, setShow] = useState<{ kind: "sender" | "receiver"; level: number } | null>(null);
  useEffect(() => {
    if (!data?.sender || !userId) return;
    const key = `rw_levels_${userId}`;
    let prev: any = null;
    try { prev = JSON.parse(localStorage.getItem(key) || "null"); } catch {}
    const now = { s: data.sender.level, r: data.receiver.level };
    try { localStorage.setItem(key, JSON.stringify(now)); } catch {}
    if (!prev) return; // first visit: just remember
    if (now.s > prev.s) setShow({ kind: "sender", level: now.s });
    else if (now.r > prev.r) setShow({ kind: "receiver", level: now.r });
  }, [data?.sender?.level, data?.receiver?.level, userId]);
  useEffect(() => { if (!show) return; const tm = setTimeout(() => setShow(null), 4200); return () => clearTimeout(tm); }, [show]);
  if (!show) return null;
  return <LevelUpOverlay kind={show.kind} level={show.level} onClose={() => setShow(null)} />;
}

export function LevelUpOverlay({ kind, level, onClose }: { kind: "sender" | "receiver"; level: number; onClose: () => void }) {
  const { t } = useTranslation();
  const tier = tierOf(level);
  const newRing = level === tier.min && level >= 5;
  const sparks = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2, d = 120 + (i % 3) * 30;
    return { dx: `${Math.cos(a) * d}px`, dy: `${Math.sin(a) * d}px`, delay: `${(i % 6) * 0.05}s`, c: ["#fde047", "#f472b6", "#67e8f9", "#a78bfa"][i % 4] };
  });
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <div className="relative flex flex-col items-center text-center px-6" style={{ animation: "lvPop .7s cubic-bezier(.2,1.4,.4,1) both" }}>
        <div className="absolute top-6 w-64 h-64 rounded-full opacity-60" style={{ background: "repeating-conic-gradient(rgba(253,224,71,.35) 0 10deg, transparent 10deg 20deg)", animation: "lvRays 6s linear infinite" }} />
        {sparks.map((p, i) => <span key={i} className="absolute top-28 w-2.5 h-2.5 rounded-full" style={{ background: p.c, ["--dx" as any]: p.dx, ["--dy" as any]: p.dy, animation: `lvSpark 1.2s ease-out ${p.delay} both` }} />)}
        <div className="relative mt-10"><LevelAvatar u={{}} label={kind === "sender" ? "🎁" : "⭐"} level={level} size={120} /></div>
        <p className="mt-5 text-3xl font-black tracking-wide text-amber-300" style={{ textShadow: "0 0 18px rgba(251,191,36,.8)", animation: "lvRise .5s .3s both" }}>{t("vn.lv.levelUp")}</p>
        <p className="mt-1 text-lg font-black text-white" style={{ animation: "lvRise .5s .45s both" }}>{kind === "sender" ? t("vn.lv.gifterLv", { n: level }) : t("vn.lv.starLv", { n: level })}</p>
        {newRing && <p className="mt-2 text-sm font-bold text-fuchsia-200" style={{ animation: "lvRise .5s .6s both" }}>✨ {t("vn.lv.newRing", { ring: t(`vn.lv.tier.${tier.key}`) })}</p>}
      </div>
    </div>,
    document.body,
  );
}

// Profile: my Gifter + Star levels, progress to the next level and the ring ladder.
export function GiftLevelsCard({ photo, name }: { photo?: string | null; name?: string }) {
  const { t, language } = useTranslation();
  const { data } = useQuery<any>({ queryKey: ["/api/reborn/kos/levels/me"], queryFn: () => apiRequest("GET", "/api/reborn/kos/levels/me").then((r) => r.json()) });
  if (!data?.sender) return null;
  const fmt = (n: number) => Number(n || 0).toLocaleString(language === "id" ? "id-ID" : language === "zh" ? "zh-CN" : "en-US");
  const top = Math.max(data.sender.level, data.receiver.level);
  const row = (kind: "sender" | "receiver") => {
    const lv = data[kind];
    const tier = tierOf(lv.level);
    const color = kind === "sender" ? "linear-gradient(90deg,#ec4899,#f472b6)" : "linear-gradient(90deg,#f59e0b,#fde047)";
    return (
      <div className="rounded-2xl bg-black/30 border border-white/10 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-black">{kind === "sender" ? t("vn.lv.gifterLv", { n: lv.level }) : t("vn.lv.starLv", { n: lv.level })}</p>
          <span className="text-[11px] font-bold text-white/60">{t(`vn.lv.tier.${tier.key}`)}</span>
        </div>
        <div className="mt-2 h-2.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.round(lv.progress * 100)}%`, background: color }} /></div>
        <p className="mt-1.5 text-[11px] text-white/60">{lv.nextAt == null ? t("vn.lv.max") : t("vn.lv.toNext", { n: fmt(lv.nextAt - lv.exp), next: lv.level + 1 })}</p>
        <p className="text-[10px] text-white/40">{kind === "sender" ? t("vn.lv.sent", { n: fmt(lv.exp) }) : t("vn.lv.received", { n: fmt(lv.exp) })}</p>
      </div>
    );
  };
  return (
    <div className="rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/10 p-4 mb-4">
      <div className="flex items-center gap-3 mb-3">
        <LevelAvatar u={{ photo, username: name }} level={top} size={56} />
        <div className="min-w-0">
          <p className="font-black">{t("vn.lv.title")}</p>
          <LevelChips sender={data.sender.level} receiver={data.receiver.level} />
        </div>
      </div>
      <div className="grid gap-2">{row("sender")}{row("receiver")}</div>
      <p className="text-[11px] text-white/50 mt-3">{t("vn.lv.hint")}</p>
      <p className="text-[11px] font-bold text-white/60 mt-3 mb-1.5">{t("vn.lv.rings")}</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[...LEVEL_TIERS].reverse().filter((x) => x.min >= 5).map((tier) => (
          <div key={tier.key} className={`flex flex-col items-center flex-shrink-0 ${top >= tier.min ? "" : "opacity-35 grayscale"}`}>
            <LevelAvatar u={{ photo, username: name }} level={tier.min} size={38} />
            <span className="text-[9px] text-white/60 mt-1">Lv.{tier.min}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// A member's top 3 gifters as a mini podium: 2nd · 1st · 3rd. Each photo keeps the
// gifter's own level ring inside a gold / silver / bronze medal ring with a crown.
const MEDAL = [
  { c1: "#fff2a8", c2: "#f5b301", glow: "rgba(245,179,1,.75)", text: "#3a2600" },
  { c1: "#ffffff", c2: "#94a3b8", glow: "rgba(203,213,225,.7)", text: "#1e293b" },
  { c1: "#ffd2a6", c2: "#b45309", glow: "rgba(217,119,6,.65)", text: "#2b1400" },
];
function Crown({ color1, color2, w }: { color1: string; color2: string; w: number }) {
  const id = `cr${color2.replace("#", "")}`;
  return (
    <svg width={w} height={w * 0.7} viewBox="0 0 40 28" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,.5))" }}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color1} /><stop offset="1" stopColor={color2} /></linearGradient></defs>
      <path d="M3 24 L1 7 L11 15 L20 2 L29 15 L39 7 L37 24 Z" fill={`url(#${id})`} stroke="rgba(0,0,0,.25)" strokeWidth="1" />
      <rect x="3" y="22" width="34" height="5" rx="2" fill={`url(#${id})`} />
      <circle cx="20" cy="3" r="2.4" fill="#fff" /><circle cx="1.5" cy="7" r="2" fill="#fff" /><circle cx="38.5" cy="7" r="2" fill="#fff" />
    </svg>
  );
}
export function GifterPodium({ gifters, nameOf }: { gifters: any[]; nameOf: (u: any) => string }) {
  if (!gifters?.length) return null;
  const order = [1, 0, 2].filter((i) => gifters[i]); // 2nd · 1st · 3rd
  return (
    <div className="mt-1.5 flex items-end gap-2.5">
      {order.map((i) => {
        const g = gifters[i]; const m = MEDAL[i]; const size = i === 0 ? 38 : 30;
        return (
          <div key={g.id} className="flex flex-col items-center min-w-0" style={{ width: size + 18 }}>
            <Crown color1={m.c1} color2={m.c2} w={i === 0 ? 22 : 18} />
            <span className="relative rounded-full -mt-1" style={{ padding: 2, background: `linear-gradient(135deg,${m.c1},${m.c2})`, boxShadow: `0 0 10px ${m.glow}` }}>
              <LevelAvatar u={g} level={g.senderLevel || 1} size={size} noCrown />
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center" style={{ background: `linear-gradient(180deg,${m.c1},${m.c2})`, color: m.text, border: "1px solid rgba(0,0,0,.25)" }}>{i + 1}</span>
            </span>
            <span className="mt-1.5 text-[9px] leading-tight text-white/75 truncate max-w-full">{nameOf(g)}</span>
          </div>
        );
      })}
    </div>
  );
}
