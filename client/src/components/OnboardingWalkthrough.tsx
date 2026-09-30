import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import petGuideImage from "@assets/Doluruu Grandpa_1749903476706.png";

// The app guide: one card per area of the app, explaining every button.
// Texts live in client/src/lib/i18n/home.ts under hm.guide.<step>.* —
// <step>.t title, <step>.i intro, <step>.p Doluruu's tip, and for each item
// <step>.<item>.t / <step>.<item>.x.
export interface TourStep {
  key: string;
  emoji: string;
  c1: string;
  c2: string;
  items?: { key: string; emoji: string }[];
}

const STEPS: TourStep[] = [
  { key: "welcome", emoji: "✨", c1: "#d946ef", c2: "#7c3aed" },
  { key: "nav", emoji: "🧭", c1: "#f3c14b", c2: "#c2410c", items: [
    { key: "token", emoji: "🪙" }, { key: "logout", emoji: "🚪" }, { key: "menu", emoji: "📱" }, { key: "pull", emoji: "🔄" },
  ] },
  { key: "home", emoji: "🏠", c1: "#a855f7", c2: "#6d28d9", items: [
    { key: "credits", emoji: "💵" }, { key: "points", emoji: "⭐" }, { key: "tokens", emoji: "🪙" },
    { key: "topup", emoji: "➕" }, { key: "tiles", emoji: "🧩" }, { key: "replay", emoji: "❓" },
  ] },
  { key: "pet", emoji: "🐾", c1: "#fb7185", c2: "#be185d", items: [
    { key: "activate", emoji: "🔑" }, { key: "buttons", emoji: "🍖" }, { key: "token", emoji: "🪙" },
    { key: "light", emoji: "💡" }, { key: "sick", emoji: "💊" }, { key: "shop", emoji: "🏠" },
  ] },
  { key: "spin", emoji: "🎡", c1: "#fbbf24", c2: "#d97706", items: [
    { key: "wheel", emoji: "🎡" }, { key: "prizes", emoji: "🎁" }, { key: "history", emoji: "📜" },
  ] },
  { key: "games", emoji: "🎮", c1: "#f59e0b", c2: "#ea580c", items: [
    { key: "pick", emoji: "▶️" }, { key: "join", emoji: "🔢" }, { key: "room", emoji: "👥" }, { key: "rank", emoji: "🏆" },
  ] },
  { key: "kos", emoji: "🎤", c1: "#ec4899", c2: "#9d174d", items: [
    { key: "buy", emoji: "🪙" }, { key: "scan", emoji: "📷" }, { key: "gift", emoji: "🎁" }, { key: "bell", emoji: "🔔" },
  ] },
  { key: "chat", emoji: "💬", c1: "#22d3ee", c2: "#0e7490", items: [
    { key: "req", emoji: "✅" }, { key: "open", emoji: "💬" },
  ] },
  { key: "club", emoji: "🍹", c1: "#2dd4bf", c2: "#0f766e", items: [
    { key: "order", emoji: "🍽️" }, { key: "bottles", emoji: "🍾" }, { key: "songs", emoji: "🎵" },
  ] },
  { key: "book", emoji: "📅", c1: "#8b5cf6", c2: "#4c1d95", items: [
    { key: "area", emoji: "📍" }, { key: "form", emoji: "🕒" }, { key: "mine", emoji: "📋" },
  ] },
  { key: "more", emoji: "🏆", c1: "#22c55e", c2: "#15803d", items: [
    { key: "loyalty", emoji: "🏆" }, { key: "ref", emoji: "👥" }, { key: "hist", emoji: "🧾" },
  ] },
  { key: "me", emoji: "👤", c1: "#60a5fa", c2: "#1d4ed8", items: [
    { key: "code", emoji: "🆔" }, { key: "notif", emoji: "🔔" }, { key: "lang", emoji: "🌐" }, { key: "edit", emoji: "✏️" }, { key: "support", emoji: "🎧" },
  ] },
  { key: "done", emoji: "🚀", c1: "#d946ef", c2: "#7c3aed" },
];

// Admin-only guide to the POS and the admin panel (texts: admin.guide.* in i18n/admin.ts).
export const STAFF_STEPS: TourStep[] = [
  { key: "welcome", emoji: "🛠️", c1: "#f3c14b", c2: "#b45309" },
  { key: "tables", emoji: "🍽️", c1: "#14b8a6", c2: "#0f766e", items: [
    { key: "open", emoji: "🪑" }, { key: "add", emoji: "➕" }, { key: "app", emoji: "🔔" }, { key: "edit", emoji: "✏️" },
  ] },
  { key: "pay", emoji: "💳", c1: "#22c55e", c2: "#15803d", items: [
    { key: "type", emoji: "🥡" }, { key: "disc", emoji: "🏷️" }, { key: "method", emoji: "💵" }, { key: "bottle", emoji: "🍾" }, { key: "cancel", emoji: "🗑️" },
  ] },
  { key: "posmore", emoji: "🧾", c1: "#0ea5e9", c2: "#1e40af", items: [
    { key: "quick", emoji: "⚡" }, { key: "sales", emoji: "↩️" }, { key: "stock", emoji: "📦" }, { key: "bottles", emoji: "🍾" }, { key: "drawer", emoji: "🗄️" }, { key: "close", emoji: "🌙" },
  ] },
  { key: "queue", emoji: "📋", c1: "#f59e0b", c2: "#c2410c", items: [
    { key: "book", emoji: "📅" }, { key: "songs", emoji: "🎵" }, { key: "redeem", emoji: "🎁" }, { key: "topup", emoji: "💰" },
  ] },
  { key: "members", emoji: "👥", c1: "#22c55e", c2: "#166534", items: [
    { key: "users", emoji: "👤" }, { key: "codes", emoji: "🔑" }, { key: "pills", emoji: "💊" }, { key: "prizes", emoji: "🎡" }, { key: "bottles", emoji: "🍾" },
  ] },
  { key: "content", emoji: "📣", c1: "#ec4899", c2: "#9d174d", items: [
    { key: "songs", emoji: "🎤" }, { key: "events", emoji: "📢" }, { key: "broadcast", emoji: "📨" }, { key: "gifts", emoji: "🎮" },
  ] },
  { key: "money", emoji: "💹", c1: "#10b981", c2: "#065f46", items: [
    { key: "products", emoji: "🛒" }, { key: "inventory", emoji: "📦" }, { key: "acct", emoji: "📊" }, { key: "payroll", emoji: "💼" },
  ] },
  { key: "team", emoji: "🧑‍🤝‍🧑", c1: "#84cc16", c2: "#3f6212", items: [
    { key: "staff", emoji: "🕒" }, { key: "board", emoji: "🏆" }, { key: "fb", emoji: "⭐" },
  ] },
  { key: "setup", emoji: "⚙️", c1: "#a855f7", c2: "#6b21a8", items: [
    { key: "crm", emoji: "💬" }, { key: "settings", emoji: "⚙️" }, { key: "logs", emoji: "📜" },
  ] },
  { key: "done", emoji: "🚀", c1: "#f3c14b", c2: "#b45309" },
];

interface OnboardingWalkthroughProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  /** Cards to show (default: the member guide). */
  steps?: TourStep[];
  /** i18n key prefix for the cards (default "hm.guide"). */
  prefix?: string;
}

export function OnboardingWalkthrough({ isOpen, onClose, onComplete, steps = STEPS, prefix = "hm.guide" }: OnboardingWalkthroughProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const total = steps.length;
  const data = steps[step];
  const isFirst = step === 0;
  const isLast = step === total - 1;
  const k = (s: string) => t(`${prefix}.${data.key}.${s}`);

  const next = () => (isLast ? onComplete() : setStep((s) => s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, step]);

  if (!isOpen) return null;

  // Portal to <body> so an animated/transformed parent can't trap the fixed overlay.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ ["--c1" as any]: data.c1, ["--c2" as any]: data.c2 }}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div role="dialog" aria-modal="true" aria-label={t("hm.tour.aria")}
        className="guide-card relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[92vh] flex flex-col text-white">
        {/* Header band */}
        <div className="guide-band relative px-5 pt-5 pb-14">
          <button onClick={onClose} aria-label={t("hm.tour.close")} className="arc-btn" style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32 }}>
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/90">
            <span className="arc-icon" style={{ width: 34, height: 34, fontSize: 18, borderRadius: 11 }}><span>{data.emoji}</span></span>
            {t("hm.tour.stepOf", { n: step + 1, total })}
          </div>
          <h2 className="arc-title mt-3 pr-8" style={{ fontSize: 24 }}>{k("t")}</h2>
        </div>

        {/* Doluruu with a speech bubble */}
        <div className="relative -mt-12 px-5">
          <div className="flex items-end gap-3">
            <img src={petGuideImage} alt={t("hm.tour.guideAlt")} className="w-20 h-20 object-contain drop-shadow-xl flex-shrink-0" />
            <div className="guide-bubble mb-2 rounded-2xl rounded-bl-sm px-3 py-2">
              <p className="text-[13px] leading-snug text-white/90">{k("p")}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div key={step} className="rwg-enter px-5 pt-4 pb-2 overflow-y-auto">
          <p className="text-[15px] leading-relaxed text-white/80">{k("i")}</p>
          {data.items && (
            <div className="mt-3 space-y-2">
              {data.items.map((it) => (
                <div key={it.key} className="guide-item flex gap-3 items-start rounded-2xl p-3">
                  <span className="arc-icon shrink-0" style={{ width: 38, height: 38, fontSize: 18, borderRadius: 12 }}><span>{it.emoji}</span></span>
                  <div className="min-w-0">
                    <p className="text-sm font-black">{t(`${prefix}.${data.key}.${it.key}.t`)}</p>
                    <p className="text-[13px] leading-snug text-white/65">{t(`${prefix}.${data.key}.${it.key}.x`)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pt-3 pb-5 mt-2 border-t border-white/10">
          <div className="flex items-center justify-center gap-1.5 mb-4 flex-wrap">
            {steps.map((s, i) => (
              <button key={s.key} onClick={() => setStep(i)} aria-label={t("hm.tour.goStep", { n: i + 1 })}
                className="guide-dot h-1.5 rounded-full transition-all duration-300"
                style={{ width: i === step ? 22 : 7, background: i === step ? "var(--c1)" : "rgba(255,255,255,.22)", boxShadow: i === step ? "0 0 8px var(--c1)" : "none" }} />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={back} disabled={isFirst}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold text-white/70 hover:bg-white/10 disabled:opacity-0 disabled:pointer-events-none">
              <ArrowLeft className="w-4 h-4" /> {t("hm.common.back")}
            </button>
            <button onClick={onClose} className="ml-auto px-3 py-2.5 rounded-xl text-sm font-semibold text-white/45 hover:text-white/80">
              {t("hm.tour.skip")}
            </button>
            <button onClick={next} className="arc-play" style={{ padding: "11px 18px", fontSize: 13 }}>
              {isLast ? t("hm.tour.letsGo") : t("hm.common.next")}
              {isLast ? <Sparkles className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
