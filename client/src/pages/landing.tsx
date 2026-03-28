import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Zap, ArrowRight, Globe, MapPin, Star, Users, Gift,
  DollarSign, Gamepad2, Music, Crown, ShoppingBag, TrendingUp,
  ChevronRight, Flame
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { LanguageSelector } from "@/components/LanguageSelector";
import rwgLogo from "@assets/rwg-logo.png";

/* ─── live counter hook ─── */
function useLiveCounter(initial: number, minFloor: number, intervalMs = 5000) {
  const [count, setCount] = useState(initial);
  useEffect(() => {
    const t = setInterval(() => {
      setCount(c => (c > minFloor && Math.random() < 0.4 ? c - 1 : c));
    }, intervalMs);
    return () => clearInterval(t);
  }, [minFloor, intervalMs]);
  return count;
}

function fmt(n: number) {
  return n.toLocaleString();
}

/* ─── Ticker ─── */
const TICKER_ITEMS = [
  "Founders VIP Selling Fast",
  "Blind Box Series 1 — Limited",
  "Sky Bar Now Open — Batam",
  "10% Lifetime Referral",
  "KTV Lounge — Private Rooms",
  "Marketplace Launch Soon",
  "Members Earn While They Sleep",
];

function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div style={{ background: "linear-gradient(90deg,#E94560,#7B2FBE)", padding: "10px 0", overflow: "hidden", position: "relative", zIndex: 20 }}>
      <div style={{ display: "flex", gap: 56, whiteSpace: "nowrap", animation: "rwg-ticker 28s linear infinite", width: "max-content" }}>
        {items.map((item, i) => (
          <span key={i} style={{ fontSize: 12, fontWeight: 700, letterSpacing: "1.5px", color: "#fff", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 10 }}>
            {item} <span style={{ color: "rgba(255,255,255,0.4)" }}>★</span>
          </span>
        ))}
      </div>
      <style>{`@keyframes rwg-ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
    </div>
  );
}

/* ─── Supply bar ─── */
function SupplyBar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 10, overflow: "hidden", marginTop: 6 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#C9A84C,#F0D080)", borderRadius: 10, transition: "width 0.6s" }} />
    </div>
  );
}

/* ─── Floating box animation ─── */
const FLOAT_STYLE: React.CSSProperties = { animation: "rwg-float 4s ease-in-out infinite" };
const GLOW_STYLE: React.CSSProperties = { animation: "rwg-glow 3s ease-in-out infinite" };

export default function Landing() {
  const { t } = useTranslation();
  const handleLogin = () => { window.location.href = "/login"; };

  const foundersLeft  = useLiveCounter(847, 800, 4500);
  const eliteLeft     = useLiveCounter(9214, 9000, 6000);
  const standardLeft  = useLiveCounter(97803, 97000, 8000);
  const [members, setMembers] = useState(2341);
  useEffect(() => {
    const t = setInterval(() => setMembers(m => m + Math.floor(Math.random() * 2)), 6000);
    return () => clearInterval(t);
  }, []);

  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const handleEmail = () => {
    if (!email.includes("@")) return;
    setEmailSent(true);
    setMembers(m => m + 1);
    setTimeout(() => setEmailSent(false), 5000);
    setEmail("");
  };

  return (
    <div className="rwg-page-bg" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes rwg-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes rwg-glow{0%,100%{opacity:0.4;transform:scale(1)}50%{opacity:0.8;transform:scale(1.06)}}
        @keyframes rwg-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.3)}}
        @keyframes rwg-orbit{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-8px) scale(1.05)}}
        .rwg-live-dot{width:7px;height:7px;border-radius:50%;background:#E94560;animation:rwg-pulse 1s infinite;display:inline-block;flex-shrink:0}
        .rwg-gold-btn{background:linear-gradient(135deg,#C9A84C,#E8B84B);color:#000;font-weight:800;border:none;cursor:pointer;border-radius:28px;transition:transform 0.2s,box-shadow 0.2s}
        .rwg-gold-btn:hover{transform:translateY(-2px);box-shadow:0 10px 36px rgba(201,168,76,0.45)}
        .rwg-tier-card{border-radius:20px;padding:28px 24px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);position:relative;overflow:hidden;transition:transform 0.3s,box-shadow 0.3s}
        .rwg-tier-card:hover{transform:translateY(-6px)}
        .rwg-tier-featured{border-color:rgba(201,168,76,0.45);background:linear-gradient(145deg,rgba(201,168,76,0.07),rgba(201,168,76,0.02));box-shadow:0 0 60px rgba(201,168,76,0.12)}
        .rwg-tier-featured:hover{box-shadow:0 20px 80px rgba(201,168,76,0.22)}
        .rwg-exp-card{border-radius:16px;padding:18px 16px;border:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.03);transition:all 0.3s}
        @media(min-width:640px){.rwg-exp-card{padding:28px 22px;border-radius:18px}}
        .rwg-exp-card:hover{transform:translateY(-4px);border-color:rgba(201,168,76,0.25)}
        .rwg-reward-card{border-radius:16px;padding:20px 18px;border:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.03);text-align:center;transition:all 0.3s}
        @media(min-width:640px){.rwg-reward-card{padding:28px 22px;border-radius:18px}}
        .rwg-reward-card:hover{transform:translateY(-4px);border-color:rgba(201,168,76,0.25)}
        .rwg-inv-metric{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:18px}
        .rwg-email-input{flex:1;padding:14px 18px;border-radius:14px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);color:#fff;font-size:15px;outline:none;transition:border-color 0.2s;font-family:inherit}
        .rwg-email-input:focus{border-color:#C9A84C}
        .rwg-email-input::placeholder{color:rgba(255,255,255,0.35)}
        .rwg-section-badge{display:inline-block;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#C9A84C;margin-bottom:14px}
        .rwg-fomo-pill{background:rgba(233,69,96,0.1);border:1px solid rgba(233,69,96,0.25);border-radius:20px;padding:7px 16px;font-size:13px;font-weight:600;color:#E94560;display:inline-flex;align-items:center;gap:7px}
        .rwg-loc-card{border-radius:20px;padding:32px;border:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.03)}
        .rwg-loc-highlight{border-color:rgba(201,168,76,0.3);background:linear-gradient(145deg,rgba(201,168,76,0.05),rgba(201,168,76,0.01))}
        .rwg-booking-input{width:100%;padding:12px 15px;border-radius:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#fff;font-size:14px;outline:none;font-family:inherit;transition:border-color 0.2s;margin-bottom:10px}
        .rwg-booking-input:focus{border-color:#C9A84C}
        .rwg-booking-input::placeholder{color:rgba(255,255,255,0.35)}
        .rwg-booking-select{width:100%;padding:12px 15px;border-radius:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#fff;font-size:14px;outline:none;font-family:inherit;margin-bottom:16px}
        .rwg-booking-select option{background:#1a0a3e}
        .rwg-mobile-sticky{display:none}
        @media(max-width:639px){
          .rwg-mobile-sticky{display:flex;position:fixed;bottom:0;left:0;right:0;z-index:100;background:rgba(10,8,30,0.96);backdrop-filter:blur(20px);padding:12px 16px;gap:10px;border-top:1px solid rgba(201,168,76,0.18)}
          .rwg-tier-scroll{display:flex;overflow-x:auto;gap:14px;padding-bottom:8px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
          .rwg-tier-scroll::-webkit-scrollbar{display:none}
          .rwg-tier-scroll-item{min-width:80vw;scroll-snap-align:start;flex-shrink:0}
        }
        @media(min-width:640px){.rwg-tier-scroll{display:contents}}
        @media(min-width:640px){.rwg-tier-scroll-item{min-width:unset;flex-shrink:unset}}
      `}</style>

      <div className="rwg-orb-1" /><div className="rwg-orb-2" /><div className="rwg-orb-3" />
      <div className="rwg-grid-overlay" />

      {/* ══ NAV ══ */}
      <header className="rwg-header sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0">
              <img src={rwgLogo} alt="RWG" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-sm bg-gradient-to-r from-violet-300 to-blue-300 bg-clip-text text-transparent hidden sm:block">
              Reborn Wave Group
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Live FOMO counter in nav */}
            <div className="rwg-fomo-pill hidden lg:inline-flex">
              <span className="rwg-live-dot" />
              <span><strong>{fmt(foundersLeft)}</strong> Founders VIPs left</span>
            </div>
            <div className="hidden md:block"><LanguageSelector /></div>
            {/* LOGIN BUTTON */}
            <button
              onClick={handleLogin}
              style={{ padding: "8px 16px", fontSize: 13, borderRadius: 22, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff", fontWeight: 700, cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }}
              onMouseOver={e => (e.currentTarget.style.background = "rgba(255,255,255,0.14)")}
              onMouseOut={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            >
              Log In
            </button>
            <button
              onClick={() => document.getElementById("membership")?.scrollIntoView({ behavior: "smooth" })}
              className="rwg-gold-btn"
              style={{ padding: "8px 16px", fontSize: 13, whiteSpace: "nowrap" }}
            >
              <span className="hidden sm:inline">Secure My Spot </span>→
            </button>
          </div>
        </div>
      </header>

      {/* ══ TICKER ══ */}
      <Ticker />

      {/* ══ HERO ══ */}
      <section className="relative z-10 pt-14 sm:pt-24 pb-14 sm:pb-20 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-5xl mx-auto">
          <div className="rwg-hero-badge mb-4 sm:mb-6">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>World's First 5-in-1 Lifestyle Empire</span>
          </div>

          <h1 className="text-4xl sm:text-6xl xl:text-8xl font-extrabold tracking-tight mb-4 sm:mb-6 leading-tight">
            <span className="text-white/90">The Future of</span>
            <br />
            <span style={{ background: "linear-gradient(90deg,#C9A84C 0%,#F0D080 40%,#00F5FF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Entertainment
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-white/55 max-w-2xl mx-auto mb-4 sm:mb-5 leading-relaxed px-2">
            Blind box collectibles. VIP club. Gamified rewards. Scarcity-driven memberships.<br className="hidden sm:block" />
            One extraordinary ecosystem — Singapore &amp; Batam.
          </p>

          {/* FOMO scarcity pill */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(233,69,96,0.09)", border: "1px solid rgba(233,69,96,0.22)", borderRadius: 10, padding: "8px 16px", marginBottom: 28, fontSize: 13, fontWeight: 600, color: "#E94560", flexWrap: "wrap", justifyContent: "center" }}>
            🔥 Only <strong style={{ fontSize: 16, margin: "0 2px" }}>{fmt(foundersLeft)}</strong> Founders VIP memberships remain — forever.
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10 sm:mb-16 px-4">
            <button
              onClick={() => document.getElementById("membership")?.scrollIntoView({ behavior: "smooth" })}
              className="rwg-gold-btn w-full sm:w-auto"
              style={{ padding: "14px 32px", fontSize: 15, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <Zap style={{ width: 16, height: 16 }} /> Secure Founders VIP
            </button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => document.getElementById("experience")?.scrollIntoView({ behavior: "smooth" })}
              className="w-full sm:w-auto border-white/15 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-8 py-3 rounded-2xl font-semibold text-base backdrop-blur-sm transition-all duration-200"
            >
              🎬 Explore the World
            </Button>
          </div>

          {/* Stats bar */}
          <div className="max-w-4xl mx-auto">
            <div className="rwg-card grid grid-cols-2 sm:grid-cols-4">
              {[
                { label: "Founders VIP — Never Restocked", value: "1,000" },
                { label: "Club · KTV · Beauty · F&B · Gaming", value: "5-in-1" },
                { label: "Lifetime Referral Commission", value: "10%" },
                { label: "Active Members & Growing", value: fmt(members) },
              ].map((s, i) => (
                <div key={s.label} className="py-4 sm:py-5 px-3 sm:px-4 text-center" style={{ borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none", ...(i >= 2 ? {} : {}) }}>
                  <div className="text-lg sm:text-2xl font-bold mb-1" style={{ color: "#C9A84C" }}>{s.value}</div>
                  <div className="text-xs text-white/40 font-medium leading-tight">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ MEMBERSHIP / SCARCITY ══ */}
      <section id="membership" className="relative z-10 py-12 sm:py-20 px-4 sm:px-6 lg:px-8" style={{ background: "rgba(18,18,42,0.6)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-5">
            <div className="rwg-section-badge">Scarcity Economy</div>
            <h2 className="text-2xl sm:text-4xl font-bold text-white mb-3">
              One Chance. Four Tiers.<br />
              <span style={{ background: "linear-gradient(90deg,#C9A84C,#F0D080)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>No Restock. Ever.</span>
            </h2>
            <p className="text-white/50 max-w-xl mx-auto text-sm leading-relaxed mb-6">
              Once a tier sells out, it's gone permanently. Resale happens only in our internal marketplace — where the platform earns, and so do you.
            </p>
          </div>

          {/* Live pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <div className="rwg-fomo-pill" style={{ fontSize: 12, padding: "6px 12px" }}><span className="rwg-live-dot" /> LIVE — {fmt(foundersLeft)} Founders VIPs remaining</div>
            <div className="rwg-fomo-pill" style={{ fontSize: 12, padding: "6px 12px" }}><span className="rwg-live-dot" /> {fmt(eliteLeft)} Elite VIPs remaining</div>
            <div className="rwg-fomo-pill hidden sm:inline-flex" style={{ fontSize: 12, padding: "6px 12px" }}><span className="rwg-live-dot" /> {fmt(standardLeft)} Standard VIPs remaining</div>
          </div>

          {/* Swipe hint on mobile */}
          <p className="text-center text-white/30 text-xs mb-3 sm:hidden">← Swipe to see all tiers →</p>

          {/* Tier cards — horizontal scroll on mobile, grid on desktop */}
          <div className="rwg-tier-scroll sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">

            {/* FOUNDERS */}
            <div className="rwg-tier-scroll-item"><div className="rwg-tier-card rwg-tier-featured" style={{ height: "100%" }}>
              <div style={{ position: "absolute", top: 16, right: 16, background: "#C9A84C", color: "#000", fontSize: 10, fontWeight: 800, letterSpacing: 1, padding: "4px 10px", borderRadius: 20, textTransform: "uppercase" }}>🔥 Hottest</div>
              <div style={{ fontSize: 30, marginBottom: 12 }}>👑</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Founders VIP</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 14, display: "flex", gap: 5 }}>
                Supply: <span style={{ color: "#E94560", fontWeight: 700 }}>{fmt(foundersLeft)}</span> / 1,000
              </div>
              <div style={{ fontSize: 30, fontWeight: 900, color: "#C9A84C", lineHeight: 1, marginBottom: 4 }}>$9,999 <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>/ lifetime</span></div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                <span>Availability</span><span>{(foundersLeft / 10).toFixed(1)}%</span>
              </div>
              <SupplyBar pct={foundersLeft / 10} />
              <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: "16px 0" }} />
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 9, marginBottom: 20 }}>
                {["Lifetime club access — all venues", "Revenue share from platform earnings", "NFT-style digital membership deed", "First access to all blind box drops", "Private VIP room + sky bar priority", "Resale rights in marketplace"].map(f => (
                  <li key={f} style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "flex-start", gap: 7 }}>
                    <span style={{ color: "#C9A84C", fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => document.getElementById("email-capture")?.scrollIntoView({ behavior: "smooth" })} className="rwg-gold-btn" style={{ width: "100%", padding: "13px", fontSize: 14, borderRadius: 12 }}>
                Secure Founders VIP →
              </button>
            </div></div>

            {/* ELITE */}
            <div className="rwg-tier-scroll-item"><div className="rwg-tier-card" style={{ height: "100%" }}>
              <div style={{ fontSize: 30, marginBottom: 12 }}>💎</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Elite VIP</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 14, display: "flex", gap: 5 }}>
                Supply: <span style={{ color: "#E94560", fontWeight: 700 }}>{fmt(eliteLeft)}</span> / 10,000
              </div>
              <div style={{ fontSize: 30, fontWeight: 900, color: "#C9A84C", lineHeight: 1, marginBottom: 4 }}>$1,999 <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>/ lifetime</span></div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                <span>Availability</span><span>{(eliteLeft / 100).toFixed(1)}%</span>
              </div>
              <SupplyBar pct={eliteLeft / 100} />
              <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: "16px 0" }} />
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 9, marginBottom: 20 }}>
                {["Priority club booking + VIP rooms", "Monthly exclusive blind box drop", "Marketplace resale rights", "10% lifetime referral commission", "Gamification XP multiplier 2×", "Elite-only events & experiences"].map(f => (
                  <li key={f} style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "flex-start", gap: 7 }}>
                    <span style={{ color: "#C9A84C", fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => document.getElementById("email-capture")?.scrollIntoView({ behavior: "smooth" })} style={{ width: "100%", padding: "13px", fontSize: 14, borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontWeight: 700, cursor: "pointer", transition: "background 0.2s" }}>
                Claim Elite VIP →
              </button>
            </div></div>

            {/* STANDARD */}
            <div className="rwg-tier-scroll-item"><div className="rwg-tier-card" style={{ height: "100%" }}>
              <div style={{ fontSize: 30, marginBottom: 12 }}>⭐</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Standard VIP</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 14, display: "flex", gap: 5 }}>
                Supply: <span style={{ color: "#E94560", fontWeight: 700 }}>{fmt(standardLeft)}</span> / 100,000
              </div>
              <div style={{ fontSize: 30, fontWeight: 900, color: "#C9A84C", lineHeight: 1, marginBottom: 4 }}>$299 <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>/ lifetime</span></div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                <span>Availability</span><span>{(standardLeft / 1000).toFixed(1)}%</span>
              </div>
              <SupplyBar pct={standardLeft / 1000} />
              <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: "16px 0" }} />
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 9, marginBottom: 20 }}>
                {["Club entry + member pricing", "App rewards + points economy", "Blind box store access", "Resale rights in marketplace", "10% referral commission"].map(f => (
                  <li key={f} style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "flex-start", gap: 7 }}>
                    <span style={{ color: "#C9A84C", fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => document.getElementById("email-capture")?.scrollIntoView({ behavior: "smooth" })} style={{ width: "100%", padding: "13px", fontSize: 14, borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontWeight: 700, cursor: "pointer", transition: "background 0.2s" }}>
                Join Standard VIP →
              </button>
            </div></div>

            {/* MEMBER */}
            <div className="rwg-tier-scroll-item"><div className="rwg-tier-card" style={{ height: "100%" }}>
              <div style={{ fontSize: 30, marginBottom: 12 }}>🎟️</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Member</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 14 }}>Supply: <span style={{ color: "rgba(255,255,255,0.6)" }}>1,000,000 max</span></div>
              <div style={{ fontSize: 30, fontWeight: 900, color: "#C9A84C", lineHeight: 1, marginBottom: 4 }}>$29 <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>/ year</span></div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                <span>Open Tier</span><span>Entry Level</span>
              </div>
              <SupplyBar pct={2} />
              <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: "16px 0" }} />
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 9, marginBottom: 20 }}>
                {["App access + gamification", "Early blind box notifications", "Basic loyalty points", "Community access", "Upgrade path to VIP tiers"].map(f => (
                  <li key={f} style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "flex-start", gap: 7 }}>
                    <span style={{ color: "#C9A84C", fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button onClick={handleLogin} style={{ width: "100%", padding: "13px", fontSize: 14, borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                Become a Member →
              </button>
            </div></div>

          </div>
        </div>
      </section>

      {/* ══ BLIND BOX ══ */}
      <section id="blindbox" className="relative z-10 py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">

            {/* Visual */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <div style={{ width: 280, height: 280, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ position: "absolute", inset: -30, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,168,76,0.2),transparent 70%)", ...GLOW_STYLE }} />
                <div style={{ width: 200, height: 200, borderRadius: 24, background: "linear-gradient(145deg,#2a1a5e,#1a0a3e)", border: "2px solid rgba(201,168,76,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 72, boxShadow: "0 20px 60px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.1)", cursor: "pointer", position: "relative", ...FLOAT_STYLE }}>
                  🎁
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#C9A84C", color: "#000", fontSize: 10, fontWeight: 800, letterSpacing: 1.5, padding: "4px 14px", borderRadius: 20, whiteSpace: "nowrap" }}>Series 1 — LIVE</div>
                </div>
                {/* Floating items */}
                {["🐉","✨","💫","🌟"].map((e, i) => (
                  <span key={i} style={{ position: "absolute", fontSize: 22, filter: "drop-shadow(0 0 8px rgba(201,168,76,0.5))", animation: `rwg-orbit ${6 + i}s linear infinite`, animationDelay: `${-i * 1.5}s`, ...[{ top: "8%", left: "4%" }, { top: "8%", right: "4%" }, { bottom: "8%", left: "8%" }, { bottom: "8%", right: "8%" }][i] as React.CSSProperties }}>{e}</span>
                ))}
              </div>
            </div>

            {/* Content */}
            <div>
              <div className="rwg-section-badge">Blind Box Collectibles</div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Dopamine in a Box.<br />Every. Single. Time.</h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
                {[["Common","rgba(100,200,100,0.12)","#80e880","rgba(100,200,100,0.2)"],["Rare","rgba(100,150,255,0.12)","#80b0ff","rgba(100,150,255,0.2)"],["Epic","rgba(180,80,255,0.12)","#c880ff","rgba(180,80,255,0.2)"],["Legendary ✦","rgba(255,200,50,0.12)","#C9A84C","rgba(255,200,50,0.2)"]].map(([label, bg, color, border]) => (
                  <span key={label} style={{ padding: "5px 13px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: bg as string, color: color as string, border: `1px solid ${border}` }}>{label}</span>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
                {[
                  { icon: "🎲", title: "Every Box is a Surprise", desc: "Four rarity tiers. Ultra-rare 1-in-100 Legendary pulls. No duplicates guaranteed within a set." },
                  { icon: "🔄", title: "Trade on the Marketplace", desc: "Every item is tradeable. Rare figures appreciate in value. Buy, sell, or hold your collection." },
                  { icon: "🏆", title: "Complete Sets for Bonuses", desc: "Complete a full series and unlock exclusive club perks, XP boosts, and secret items." },
                ].map(({ icon, title, desc }) => (
                  <div key={title} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)" }}>{icon}</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 3 }}>{title}</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => document.getElementById("email-capture")?.scrollIntoView({ behavior: "smooth" })} className="rwg-gold-btn" style={{ padding: "15px 32px", fontSize: 15, display: "inline-flex", alignItems: "center", gap: 8 }}>
                🛍️ Get Early Access to Series 1
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 5-IN-1 EXPERIENCE ══ */}
      <section id="experience" className="relative z-10 py-12 sm:py-20 px-4 sm:px-6 lg:px-8" style={{ background: "rgba(18,18,42,0.6)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="rwg-section-badge">The 5-in-1 Concept</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Five Worlds. One Destination.</h2>
            <p className="text-white/50 max-w-xl mx-auto text-sm leading-relaxed">
              The world's first fully integrated luxury entertainment empire — beauty, food, KTV, gaming, and technology under one roof.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { num: "01", emoji: "🎤", title: "KTV & Private Rooms", desc: "Premium karaoke suites with mood lighting, VIP bottle service, and private party rooms up to 20 guests.", tags: ["Private Rooms","Premium Sound","VIP Service"] },
              { num: "02", emoji: "🌅", title: "Sky Bar", desc: "Panoramic sea views, DJ nights, craft cocktails, and Instagram-worthy sunsets. Most exclusive rooftop in Batam.", tags: ["Sea Views","DJ Nights","Cocktails"] },
              { num: "03", emoji: "💆", title: "Beauty & Wellness", desc: "Premium skincare, luxury spa, and personalized beauty consultations. Rejuvenate before or after your night.", tags: ["Luxury Spa","Skincare","Wellness"] },
              { num: "04", emoji: "🎮", title: "Gaming Lounge", desc: "Cutting-edge gaming stations, tournament events, and collectible trading floor in an immersive environment.", tags: ["Gaming","Tournaments","Collectibles"] },
              { num: "05", emoji: "🍽️", title: "Premium F&B", desc: "Gourmet dining, artisan coffee, and craft beverages. World-class culinary experiences paired with entertainment.", tags: ["Gourmet","Artisan Coffee","Craft Bar"] },
            ].map(({ num, emoji, title, desc, tags }) => (
              <div key={title} className="rwg-exp-card">
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: 2, marginBottom: 14 }}>{num}</div>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{emoji}</div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginBottom: 12 }}>{desc}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {tags.map(tag => <span key={tag} style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}>{tag}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ LOCATIONS ══ */}
      <section id="locations" className="relative z-10 py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <div className="rwg-section-badge">Our Locations</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Where to Find Us</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="rwg-loc-card rwg-loc-highlight">
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 600, color: "#C9A84C", marginBottom: 18 }}>🌊 OPEN NOW</div>
              <h3 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Oceanic Bliss</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 20 }}>
                Our flagship venue on the waterfront of Batam, Indonesia. A breathtaking 5-in-1 lifestyle destination with stunning sea views, sky bar, premium KTV suites, and the RebornWave gaming &amp; beauty experience.
              </p>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 14, marginBottom: 18 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>📍</span>
                <div>
                  <strong style={{ display: "block", color: "#fff", marginBottom: 3 }}>Batam, Indonesia</strong>
                  <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>Ruko Batamas, Jl. Pasir Putih No.49-51, Sadai, Kec. Bengkong, Kota Batam, Kepulauan Riau 29444</span>
                </div>
              </div>
              <button onClick={() => document.getElementById("investor")?.scrollIntoView({ behavior: "smooth" })} className="rwg-gold-btn" style={{ padding: "12px 28px", fontSize: 14, width: "100%", borderRadius: 12 }}>
                Book a Visit →
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="rwg-loc-card">
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(123,47,190,0.1)", border: "1px solid rgba(123,47,190,0.25)", borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 600, color: "#a78bfa", marginBottom: 14 }}>🇸🇬 HEADQUARTERS</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Singapore HQ</h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>Our operational headquarters — home of the RebornWave brand, digital operations, and investor relations.</p>
              </div>
              <div className="rwg-loc-card">
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.2)", borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 600, color: "#00F5FF", marginBottom: 14 }}>🌏 EXPANDING</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Next Locations</h3>
                {[["2026","Kuala Lumpur, Malaysia"],["2026","Bangkok, Thailand"],["2027","Hong Kong & Seoul"]].map(([year, city]) => (
                  <div key={city} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 13px", marginBottom: 8 }}>
                    <span style={{ background: "rgba(0,245,255,0.1)", color: "#00F5FF", border: "1px solid rgba(0,245,255,0.2)", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20 }}>{year}</span>
                    {city}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ INVESTOR ══ */}
      <section id="investor" className="relative z-10 py-12 sm:py-20 px-4 sm:px-6 lg:px-8" style={{ background: "rgba(18,18,42,0.6)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
            <div>
              <div className="rwg-section-badge">For Investors</div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">This Is More Than a Club.<br /><span style={{ background: "linear-gradient(90deg,#C9A84C,#F0D080)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>It's an Economy.</span></h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.8, marginBottom: 28 }}>
                RebornWave operates a closed-loop membership economy. Supply is permanently capped. Resales generate platform fees. Every member is a stakeholder. Every transaction builds platform value.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 32 }}>
                {[["$89M+","Total Revenue Potential"],["1.11M","Hard Cap — Total Members"],["5%","Marketplace Fee"],["10%","Lifetime Referral"]].map(([val, label]) => (
                  <div key={label} className="rwg-inv-metric">
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#C9A84C" }}>{val}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => document.getElementById("email-capture")?.scrollIntoView({ behavior: "smooth" })} className="rwg-gold-btn" style={{ padding: "14px 32px", fontSize: 15, display: "inline-flex", alignItems: "center", gap: 8 }}>
                📊 Request Investor Brief
              </button>
            </div>

            {/* Booking form */}
            <div style={{ borderRadius: 20, padding: "20px 18px", background: "linear-gradient(145deg,rgba(123,47,190,0.15),rgba(233,69,96,0.08))", border: "1px solid rgba(123,47,190,0.25)" }} className="sm:p-8">
              <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 24 }}>🏛️ Book an Investor Visit</h3>
              {[["✦","Physical walkthrough of the Batam venue"],["✦","Live revenue dashboard presentation"],["✦","Meet the founding team"],["✦","Priority Founders VIP allocation"]].map(([dot, text]) => (
                <div key={text} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "rgba(255,255,255,0.65)", marginBottom: 12 }}>
                  <span style={{ color: "#C9A84C" }}>{dot}</span> {text}
                </div>
              ))}
              <div style={{ marginTop: 20 }}>
                <input className="rwg-booking-input" type="text" placeholder="Full Name *" />
                <input className="rwg-booking-input" type="email" placeholder="Email Address *" />
                <input className="rwg-booking-input" type="text" placeholder="Company / Organisation" />
                <select className="rwg-booking-select">
                  <option value="" disabled>Investment Interest Level</option>
                  <option>Exploring ($10K–$50K)</option>
                  <option>Serious ($50K–$250K)</option>
                  <option>Strategic ($250K+)</option>
                  <option>Founders VIP Purchase</option>
                </select>
                <button className="rwg-gold-btn" style={{ width: "100%", padding: 14, fontSize: 15, borderRadius: 12 }}>
                  Request Investor Meeting →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ REWARDS / GAMIFICATION ══ */}
      <section id="rewards" className="relative z-10 py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="rwg-section-badge">Gamification + Rewards</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Earn. Level Up. Get Addicted.</h2>
            <p className="text-white/50 max-w-xl mx-auto text-sm leading-relaxed">Every transaction, visit, and referral earns you rewards. The more you engage, the more you earn.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { emoji: "🐾", title: "Digital Pets", desc: "Earn a unique digital companion. Feed it with XP from purchases. Evolve it to unlock exclusive rewards and rare blind box items.", highlight: "Level up your pet → unlock rares" },
              { emoji: "👥", title: "10% Referral For Life", desc: "Invite friends. Earn 10% commission on everything they spend — forever. Build a network, build passive income.", highlight: "Lifetime passive earnings" },
              { emoji: "⚡", title: "XP & Loyalty Points", desc: "Every dollar spent earns XP. Level up to unlock VIP room upgrades, free blind boxes, and exclusive event access.", highlight: "Spend → Earn → Unlock" },
              { emoji: "🏪", title: "Internal Marketplace", desc: "Trade memberships and blind box items within the platform. Rare memberships appreciate. You hold the resale rights.", highlight: "Your membership = your asset" },
              { emoji: "🎰", title: "Daily Spin & Challenges", desc: "Log in daily for free spins, bonus XP, and surprise rewards. Complete weekly challenges for exclusive prizes.", highlight: "Free daily rewards" },
              { emoji: "🏆", title: "Leaderboards", desc: "Compete with members globally. Top 10 monthly earners win VIP room upgrades, blind box sets, and cashback.", highlight: "Monthly prizes for top members" },
            ].map(({ emoji, title, desc, highlight }) => (
              <div key={title} className="rwg-reward-card">
                <div style={{ fontSize: 40, marginBottom: 14 }}>{emoji}</div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 14 }}>{desc}</p>
                <div style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 700, color: "#C9A84C" }}>{highlight}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ EMAIL CAPTURE ══ */}
      <section id="email-capture" className="relative z-10 py-12 sm:py-20 px-4 sm:px-6 lg:px-8" style={{ background: "linear-gradient(135deg,rgba(123,47,190,0.3),rgba(233,69,96,0.2))", borderTop: "1px solid rgba(123,47,190,0.2)", borderBottom: "1px solid rgba(233,69,96,0.2)" }}>
        <div className="max-w-2xl mx-auto text-center">
          <div className="rwg-section-badge">Don't Miss Out</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
            Join the Waitlist.<br />Before It's Too Late.
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, marginBottom: 28, lineHeight: 1.6 }}>
            Get first access to Founders VIP, exclusive blind box drops, and early app beta.<br />
            Over <strong style={{ color: "#fff" }}>{fmt(members)}</strong> members already waiting.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 480, margin: "0 auto 14px" }}>
            <input
              className="rwg-email-input"
              type="email"
              placeholder="Enter your email address..."
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleEmail()}
              style={{ width: "100%" }}
            />
            <button onClick={handleEmail} className="rwg-gold-btn" style={{ padding: "14px 26px", fontSize: 15, borderRadius: 14, width: "100%" }}>
              {emailSent ? "✅ You're in!" : "Join Now →"}
            </button>
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>🔒 No spam. Unsubscribe anytime. Early members get exclusive bonuses.</p>
        </div>
      </section>

      {/* ══ MOBILE STICKY BOTTOM BAR ══ */}
      <div className="rwg-mobile-sticky">
        <button
          onClick={handleLogin}
          style={{ flex: 1, padding: "12px", fontSize: 14, borderRadius: 14, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff", fontWeight: 700, cursor: "pointer" }}
        >
          Log In
        </button>
        <button
          onClick={() => document.getElementById("membership")?.scrollIntoView({ behavior: "smooth" })}
          className="rwg-gold-btn"
          style={{ flex: 2, padding: "12px", fontSize: 14, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <Zap style={{ width: 14, height: 14 }} /> Secure My Spot
        </button>
      </div>

      {/* ══ FOOTER ══ */}
      <footer className="relative z-10 rwg-footer py-12 pb-28 sm:pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl overflow-hidden"><img src={rwgLogo} alt="RWG" className="w-full h-full object-contain" /></div>
                <span className="text-sm font-bold text-white/70">Reborn Wave Group</span>
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, marginBottom: 16 }}>
                The world's first 5-in-1 luxury entertainment empire. Scarcity-driven memberships. Blind box collectibles. Singapore &amp; Batam.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {["TikTok","IG","小红书","TG"].map(s => (
                  <a key={s} href="#" style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 700, transition: "all 0.2s" }}>{s}</a>
                ))}
              </div>
            </div>
            {/* Links */}
            {[
              { title: "Membership", links: ["Founders VIP","Elite VIP","Standard VIP","Become a Member","Marketplace"] },
              { title: "Experience", links: ["KTV & Private Rooms","Sky Bar","Beauty & Wellness","Gaming Lounge","Blind Box Store"] },
              { title: "Company", links: ["Locations","Investor Relations","Rewards Program","Press & Media","Contact Us"] },
            ].map(({ title, links }) => (
              <div key={title}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 16 }}>{title}</h4>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                  {links.map(l => <li key={l}><a href="#" style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>{l}</a></li>)}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 20, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>© 2026 Reborn Wave Group. All rights reserved. | Based in Singapore.</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              <a href="#" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Privacy Policy</a> · <a href="#" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Terms</a> · <a href="#" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Membership Rules</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
