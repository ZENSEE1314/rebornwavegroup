import { useState, useEffect } from "react";
import { Sparkles, Zap, MapPin, Star } from "lucide-react";
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

function fmt(n: number) { return n.toLocaleString(); }

/* ─── Ticker ─── */
const TICKER_ITEMS = [
  "Founders VIP Selling Fast","Blind Box Series 1 — Limited","Sky Bar Now Open — Batam",
  "10% Lifetime Referral","KTV Lounge — Private Rooms","Marketplace Launch Soon","Members Earn While They Sleep",
];
function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div style={{ background: "linear-gradient(90deg,#E94560,#7B2FBE)", padding: "8px 0", overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 48, whiteSpace: "nowrap", animation: "rwg-ticker 28s linear infinite", width: "max-content" }}>
        {items.map((item, i) => (
          <span key={i} style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", color: "#fff", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
            {item} <span style={{ color: "rgba(255,255,255,0.4)" }}>★</span>
          </span>
        ))}
      </div>
      <style>{`@keyframes rwg-ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
    </div>
  );
}

function SupplyBar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 10, overflow: "hidden", marginTop: 6 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#C9A84C,#F0D080)", borderRadius: 10 }} />
    </div>
  );
}

/* ─── Tier Card ─── */
function TierCard({ emoji, name, price, period, supply, supplyMax, supplyPct, features, ctaLabel, featured, onCta }: any) {
  return (
    <div style={{
      borderRadius: 20, padding: "24px 20px", position: "relative", overflow: "hidden",
      border: featured ? "1px solid rgba(201,168,76,0.45)" : "1px solid rgba(255,255,255,0.08)",
      background: featured ? "linear-gradient(145deg,rgba(201,168,76,0.08),rgba(201,168,76,0.02))" : "rgba(255,255,255,0.03)",
      boxShadow: featured ? "0 0 48px rgba(201,168,76,0.12)" : "none",
      display: "flex", flexDirection: "column", height: "100%",
    }}>
      {featured && (
        <div style={{ position: "absolute", top: 14, right: 14, background: "#C9A84C", color: "#000", fontSize: 9, fontWeight: 800, letterSpacing: 1, padding: "4px 10px", borderRadius: 20, textTransform: "uppercase" }}>🔥 Hottest</div>
      )}
      <div style={{ fontSize: 28, marginBottom: 10 }}>{emoji}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 3 }}>{name}</div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>
        Supply: <span style={{ color: "#E94560", fontWeight: 700 }}>{fmt(supply)}</span> / {fmt(supplyMax)}
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, color: "#C9A84C", lineHeight: 1, marginBottom: 2 }}>
        {price} <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>/ {period}</span>
      </div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <span>Availability</span><span>{supplyPct}</span>
      </div>
      <SupplyBar pct={parseFloat(supplyPct)} />
      <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: "16px 0" }} />
      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8, marginBottom: 20, flex: 1 }}>
        {features.map((f: string) => (
          <li key={f} style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "flex-start", gap: 6 }}>
            <span style={{ color: "#C9A84C", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span> {f}
          </li>
        ))}
      </ul>
      <button onClick={onCta} style={{
        width: "100%", padding: "13px", fontSize: 13, borderRadius: 12, fontWeight: 700, cursor: "pointer",
        ...(featured
          ? { background: "linear-gradient(135deg,#C9A84C,#E8B84B)", color: "#000", border: "none" }
          : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" })
      }}>
        {ctaLabel}
      </button>
    </div>
  );
}

export default function Landing() {
  const { t } = useTranslation();
  const handleLogin = () => { window.location.href = "/login"; };
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const foundersLeft = useLiveCounter(847, 800, 4500);
  const eliteLeft    = useLiveCounter(9214, 9000, 6000);
  const standardLeft = useLiveCounter(97803, 97000, 8000);
  const [members, setMembers] = useState(2341);
  useEffect(() => {
    const t = setInterval(() => setMembers(m => m + Math.floor(Math.random() * 2)), 6000);
    return () => clearInterval(t);
  }, []);

  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [tierDot, setTierDot] = useState(0);
  const handleEmail = () => {
    if (!email.includes("@")) return;
    setEmailSent(true); setMembers(m => m + 1);
    setTimeout(() => setEmailSent(false), 5000); setEmail("");
  };

  const tiers = [
    { emoji: "👑", name: "Founders VIP", price: "$9,999", period: "lifetime", supply: foundersLeft, supplyMax: 1000, supplyPct: `${(foundersLeft / 10).toFixed(1)}%`, featured: true, ctaLabel: "Secure Founders VIP →", features: ["Lifetime club access — all venues","Revenue share from platform earnings","NFT-style digital membership deed","First access to all blind box drops","Private VIP room + sky bar priority","Resale rights in marketplace"] },
    { emoji: "💎", name: "Elite VIP", price: "$1,999", period: "lifetime", supply: eliteLeft, supplyMax: 10000, supplyPct: `${(eliteLeft / 100).toFixed(1)}%`, featured: false, ctaLabel: "Claim Elite VIP →", features: ["Priority club booking + VIP rooms","Monthly exclusive blind box drop","Marketplace resale rights","10% lifetime referral commission","Gamification XP multiplier 2×","Elite-only events & experiences"] },
    { emoji: "⭐", name: "Standard VIP", price: "$299", period: "lifetime", supply: standardLeft, supplyMax: 100000, supplyPct: `${(standardLeft / 1000).toFixed(1)}%`, featured: false, ctaLabel: "Join Standard VIP →", features: ["Club entry + member pricing","App rewards + points economy","Blind box store access","Resale rights in marketplace","10% referral commission"] },
    { emoji: "🎟️", name: "Member", price: "$29", period: "year", supply: 1000000, supplyMax: 1000000, supplyPct: "2%", featured: false, ctaLabel: "Become a Member →", features: ["App access + gamification","Early blind box notifications","Basic loyalty points","Community access","Upgrade path to VIP tiers"], onCta: handleLogin },
  ];

  return (
    <div className="rwg-page-bg" style={{ fontFamily: "'Inter', sans-serif", paddingBottom: 80 }}>
      <style>{`
        @keyframes rwg-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes rwg-glow{0%,100%{opacity:0.4;transform:scale(1)}50%{opacity:0.8;transform:scale(1.06)}}
        @keyframes rwg-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.3)}}
        .rwg-live-dot{width:6px;height:6px;border-radius:50%;background:#E94560;animation:rwg-pulse 1s infinite;display:inline-block;flex-shrink:0}
        .rwg-gold-btn{background:linear-gradient(135deg,#C9A84C,#E8B84B);color:#000;font-weight:800;border:none;cursor:pointer;border-radius:28px;transition:transform 0.2s,box-shadow 0.2s}
        .rwg-gold-btn:active{transform:scale(0.97)}
        .rwg-ghost-btn{background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.16);color:#fff;font-weight:700;cursor:pointer;border-radius:28px;transition:background 0.2s}
        .rwg-ghost-btn:active{background:rgba(255,255,255,0.13)}
        .rwg-section-badge{display:inline-block;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#C9A84C;margin-bottom:12px}
        .rwg-fomo-pill{background:rgba(233,69,96,0.1);border:1px solid rgba(233,69,96,0.25);border-radius:20px;padding:6px 13px;font-size:12px;font-weight:600;color:#E94560;display:inline-flex;align-items:center;gap:6px}
        .rwg-input{width:100%;padding:14px 16px;border-radius:14px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);color:#fff;font-size:15px;outline:none;font-family:inherit;box-sizing:border-box}
        .rwg-input:focus{border-color:#C9A84C}
        .rwg-input::placeholder{color:rgba(255,255,255,0.35)}
        .rwg-select{width:100%;padding:13px 15px;border-radius:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#fff;font-size:14px;outline:none;font-family:inherit;margin-bottom:12px;appearance:none}
        .rwg-select option{background:#1a0a3e}

        /* Tier swipe scroll on mobile */
        .tier-track{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;padding:4px 2px 16px;scrollbar-width:none}
        .tier-track::-webkit-scrollbar{display:none}
        .tier-item{min-width:82vw;max-width:300px;scroll-snap-align:start;flex-shrink:0}
        @media(min-width:640px){
          .tier-track{display:grid;grid-template-columns:repeat(2,1fr);overflow-x:visible;scroll-snap-type:none}
          .tier-item{min-width:unset;max-width:unset;flex-shrink:unset}
        }
        @media(min-width:1024px){
          .tier-track{grid-template-columns:repeat(4,1fr)}
        }

        /* Experience swipe scroll on mobile */
        .exp-track{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;padding:4px 2px 16px;scrollbar-width:none}
        .exp-track::-webkit-scrollbar{display:none}
        .exp-item{min-width:52vw;max-width:200px;scroll-snap-align:start;flex-shrink:0}
        @media(min-width:640px){
          .exp-track{display:grid;grid-template-columns:repeat(3,1fr);overflow-x:visible;scroll-snap-type:none}
          .exp-item{min-width:unset;max-width:unset;flex-shrink:unset}
        }
        @media(min-width:1024px){
          .exp-track{grid-template-columns:repeat(5,1fr)}
        }

        /* Swipe dot indicators */
        .swipe-dots{display:flex;justify-content:center;gap:6px;margin-top:4px}
        .swipe-dots span{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.15);transition:background 0.3s}
        .swipe-dots span.active{background:#C9A84C;width:18px;border-radius:3px}
        @media(min-width:640px){.swipe-dots{display:none}}

        /* Split grid — single column on mobile, two columns on desktop */
        .rwg-split-grid{display:grid;grid-template-columns:1fr;gap:28px}
        @media(min-width:1024px){
          .rwg-split-grid{grid-template-columns:repeat(2,1fr);gap:64px;align-items:center}
        }

        /* Mobile sticky bar */
        .mobile-cta-bar{display:none}
        @media(max-width:639px){
          .mobile-cta-bar{display:flex;position:fixed;bottom:0;left:0;right:0;z-index:200;padding:10px 14px 20px;gap:10px;background:rgba(8,6,26,0.98);backdrop-filter:blur(24px);border-top:1px solid rgba(201,168,76,0.2)}
        }
      `}</style>

      <div className="rwg-orb-1" /><div className="rwg-orb-2" /><div className="rwg-orb-3" />
      <div className="rwg-grid-overlay" />

      {/* ══ NAV ══ */}
      <header className="rwg-header sticky top-0 z-50">
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
              <img src={rwgLogo} alt="RWG" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 13, background: "linear-gradient(90deg,#c4b5fd,#93c5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }} className="hidden sm:block">
              Reborn Wave Group
            </span>
          </div>
          {/* Nav actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="hidden lg:flex" style={{ alignItems: "center" }}>
              <div className="rwg-fomo-pill" style={{ marginRight: 8 }}>
                <span className="rwg-live-dot" />
                <span><strong>{fmt(foundersLeft)}</strong> Founders VIPs left</span>
              </div>
            </div>
            <div className="hidden md:block"><LanguageSelector /></div>
            <button onClick={handleLogin} className="rwg-ghost-btn" style={{ padding: "8px 18px", fontSize: 13, borderRadius: 22 }}>
              Log In
            </button>
            <button onClick={() => scrollTo("membership")} className="rwg-gold-btn" style={{ padding: "8px 16px", fontSize: 13 }}>
              <span className="hidden sm:inline">Join Now</span><span className="sm:hidden">Join</span>
            </button>
          </div>
        </div>
      </header>

      {/* ══ TICKER ══ */}
      <Ticker />

      {/* ══ HERO ══ */}
      <section style={{ padding: "48px 16px 40px", textAlign: "center", position: "relative", zIndex: 10 }} className="sm:py-24">
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          {/* Badge */}
          <div className="rwg-hero-badge" style={{ marginBottom: 16, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Sparkles style={{ width: 12, height: 12 }} className="text-violet-400" />
            <span style={{ fontSize: 11 }}>World's First 5-in-1 Lifestyle Empire</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: "clamp(36px, 10vw, 80px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 16, letterSpacing: "-1px" }}>
            <span style={{ color: "rgba(255,255,255,0.92)" }}>The Future of</span>
            <br />
            <span style={{ background: "linear-gradient(90deg,#C9A84C 0%,#F0D080 45%,#00F5FF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Entertainment
            </span>
          </h1>

          {/* Subtext */}
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", maxWidth: 480, margin: "0 auto 20px", lineHeight: 1.7 }}>
            Blind box collectibles · VIP club · Gamified rewards<br />
            Scarcity-driven memberships — Singapore &amp; Batam.
          </p>

          {/* FOMO pill */}
          <div className="rwg-fomo-pill" style={{ display: "inline-flex", marginBottom: 28, fontSize: 13, padding: "8px 16px" }}>
            🔥 Only <strong style={{ margin: "0 4px" }}>{fmt(foundersLeft)}</strong> Founders VIPs remain — forever
          </div>

          {/* CTAs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 420, margin: "0 auto 40px" }}>
            <button onClick={() => scrollTo("membership")} className="rwg-gold-btn" style={{ padding: "15px", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14 }}>
              <Zap style={{ width: 16, height: 16 }} /> Secure Founders VIP
            </button>
            <button onClick={() => scrollTo("experience")} className="rwg-ghost-btn" style={{ padding: "14px", fontSize: 14, borderRadius: 14 }}>
              🎬 Explore the World
            </button>
          </div>

          {/* Stats grid */}
          <div className="rwg-card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", maxWidth: 600, margin: "0 auto" }}>
            {[
              { v: "1,000", l: "Founders VIP\nNever Restocked" },
              { v: "5-in-1", l: "Club · KTV · Beauty\nF&B · Gaming" },
              { v: "10%", l: "Lifetime Referral\nCommission" },
              { v: fmt(members), l: "Active Members\n& Growing" },
            ].map((s, i) => (
              <div key={i} style={{ padding: "18px 12px", textAlign: "center", borderRight: i % 2 === 0 ? "1px solid rgba(255,255,255,0.06)" : "none", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#C9A84C", marginBottom: 5 }}>{s.v}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, whiteSpace: "pre-line" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ MEMBERSHIP ══ */}
      <section id="membership" style={{ padding: "48px 16px", background: "rgba(18,18,42,0.6)", position: "relative", zIndex: 10 }} className="sm:py-20">
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div className="rwg-section-badge">Scarcity Economy</div>
            <h2 style={{ fontSize: "clamp(22px,6vw,36px)", fontWeight: 800, color: "#fff", marginBottom: 10, lineHeight: 1.2 }}>
              One Chance. Four Tiers.<br />
              <span style={{ background: "linear-gradient(90deg,#C9A84C,#F0D080)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>No Restock. Ever.</span>
            </h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, maxWidth: 480, margin: "0 auto 16px", lineHeight: 1.6 }}>
              Once a tier sells out, it's gone permanently. Resale happens only in our internal marketplace.
            </p>
            {/* Live pills row */}
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
              <div className="rwg-fomo-pill"><span className="rwg-live-dot" /> {fmt(foundersLeft)} Founders VIPs left</div>
              <div className="rwg-fomo-pill"><span className="rwg-live-dot" /> {fmt(eliteLeft)} Elite left</div>
            </div>
          </div>

          {/* Swipe hint — mobile only */}
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 11, marginBottom: 12 }} className="sm:hidden">
            ← Swipe to explore all tiers →
          </p>

          {/* Tier carousel */}
          <div className="tier-track" onScroll={e => {
            const el = e.currentTarget;
            const idx = Math.round(el.scrollLeft / (el.scrollWidth / tiers.length));
            setTierDot(Math.min(idx, tiers.length - 1));
          }}>
            {tiers.map((tier) => (
              <div key={tier.name} className="tier-item">
                <TierCard {...tier} onCta={tier.onCta || (() => scrollTo("email-capture"))} />
              </div>
            ))}
          </div>
          {/* Dot indicators — mobile only */}
          <div className="swipe-dots" style={{ marginTop: 12 }}>
            {tiers.map((_, i) => <span key={i} className={i === tierDot ? "active" : ""} />)}
          </div>
        </div>
      </section>

      {/* ══ BLIND BOX ══ */}
      <section id="blindbox" style={{ padding: "48px 16px", position: "relative", zIndex: 10 }} className="sm:py-20">
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {/* Mobile: stacked. Desktop: side by side */}
          <div className="rwg-split-grid">
            {/* Visual */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ position: "relative", width: 200, height: 200 }}>
                <div style={{ position: "absolute", inset: -24, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,168,76,0.18),transparent 70%)", animation: "rwg-glow 3s ease-in-out infinite" }} />
                <div style={{ width: "100%", height: "100%", borderRadius: 20, background: "linear-gradient(145deg,#2a1a5e,#1a0a3e)", border: "2px solid rgba(201,168,76,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", animation: "rwg-float 4s ease-in-out infinite", position: "relative" }}>
                  🎁
                  <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "#C9A84C", color: "#000", fontSize: 9, fontWeight: 800, letterSpacing: 1.5, padding: "4px 12px", borderRadius: 20, whiteSpace: "nowrap" }}>Series 1 — LIVE</div>
                </div>
                {["🐉","✨","💫","🌟"].map((e, i) => (
                  <span key={i} style={{ position: "absolute", fontSize: 18, filter: "drop-shadow(0 0 6px rgba(201,168,76,0.5))", animation: `rwg-float ${5+i}s ease-in-out infinite`, animationDelay: `${-i*1.2}s`, ...[{top:"2%",left:"0%"},{top:"2%",right:"0%"},{bottom:"2%",left:"4%"},{bottom:"2%",right:"4%"}][i] as React.CSSProperties }}>{e}</span>
                ))}
              </div>
            </div>

            {/* Content */}
            <div style={{ textAlign: "center" }} className="lg:text-left">
              <div className="rwg-section-badge">Blind Box Collectibles</div>
              <h2 style={{ fontSize: "clamp(22px,6vw,34px)", fontWeight: 800, color: "#fff", marginBottom: 14, lineHeight: 1.2 }}>
                Dopamine in a Box.<br />Every. Single. Time.
              </h2>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
                {[["Common","rgba(100,200,100,0.12)","#80e880","rgba(100,200,100,0.2)"],["Rare","rgba(100,150,255,0.12)","#80b0ff","rgba(100,150,255,0.2)"],["Epic","rgba(180,80,255,0.12)","#c880ff","rgba(180,80,255,0.2)"],["Legendary ✦","rgba(255,200,50,0.12)","#C9A84C","rgba(255,200,50,0.2)"]].map(([label,bg,color,border]) => (
                  <span key={label} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg as string, color: color as string, border: `1px solid ${border}` }}>{label}</span>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28, textAlign: "left" }}>
                {[
                  { icon: "🎲", title: "Every Box is a Surprise", desc: "Four rarity tiers. Ultra-rare 1-in-100 Legendary pulls." },
                  { icon: "🔄", title: "Trade on the Marketplace", desc: "Every item is tradeable. Rare figures appreciate in value." },
                  { icon: "🏆", title: "Complete Sets for Bonuses", desc: "Unlock exclusive club perks, XP boosts, and secret items." },
                ].map(({ icon, title, desc }) => (
                  <div key={title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)" }}>{icon}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{title}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => scrollTo("email-capture")} className="rwg-gold-btn" style={{ padding: "14px 28px", fontSize: 14, width: "100%" }}>
                🛍️ Get Early Access to Series 1
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 5-IN-1 EXPERIENCE ══ */}
      <section id="experience" style={{ padding: "48px 16px", background: "rgba(18,18,42,0.6)", position: "relative", zIndex: 10 }} className="sm:py-20">
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div className="rwg-section-badge">The 5-in-1 Concept</div>
            <h2 style={{ fontSize: "clamp(22px,6vw,34px)", fontWeight: 800, color: "#fff", marginBottom: 8 }}>Five Worlds. One Destination.</h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
              The world's first fully integrated luxury entertainment empire.
            </p>
          </div>
          {/* Swipe hint — mobile only */}
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 11, marginBottom: 10 }} className="sm:hidden">
            ← Swipe to explore →
          </p>
          <div className="exp-track">
            {[
              { num: "01", emoji: "🎤", title: "KTV", sub: "Private Rooms", tags: ["Private Rooms","VIP Service"] },
              { num: "02", emoji: "🌅", title: "Sky Bar", sub: "Rooftop Views", tags: ["Sea Views","DJ Nights"] },
              { num: "03", emoji: "💆", title: "Beauty", sub: "& Wellness", tags: ["Luxury Spa","Skincare"] },
              { num: "04", emoji: "🎮", title: "Gaming", sub: "Lounge", tags: ["Tournaments","Collectibles"] },
              { num: "05", emoji: "🍽️", title: "Premium", sub: "F&B", tags: ["Gourmet","Craft Bar"] },
            ].map(({ num, emoji, title, sub, tags }) => (
              <div key={title} className="exp-item" style={{ borderRadius: 16, padding: "18px 16px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", transition: "all 0.3s" }}>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>{num}</div>
                <div style={{ fontSize: 30, marginBottom: 10 }}>{emoji}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", lineHeight: 1.3, marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 10 }}>{sub}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {tags.map(tag => <span key={tag} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 20, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.07)" }}>{tag}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ LOCATIONS ══ */}
      <section id="locations" style={{ padding: "48px 16px", position: "relative", zIndex: 10 }} className="sm:py-20">
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ marginBottom: 24, textAlign: "center" }} className="lg:text-left">
            <div className="rwg-section-badge">Our Locations</div>
            <h2 style={{ fontSize: "clamp(22px,6vw,34px)", fontWeight: 800, color: "#fff" }}>Where to Find Us</h2>
          </div>
          <div className="rwg-split-grid" style={{ gap: 16 }}>
            {/* Flagship */}
            <div style={{ borderRadius: 20, padding: "24px 20px", border: "1px solid rgba(201,168,76,0.3)", background: "linear-gradient(145deg,rgba(201,168,76,0.05),rgba(201,168,76,0.01))" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 20, padding: "5px 13px", fontSize: 11, fontWeight: 600, color: "#C9A84C", marginBottom: 14 }}>🌊 OPEN NOW</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Oceanic Bliss</h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 16 }}>
                Our flagship venue on the waterfront of Batam — sky bar, premium KTV suites, gaming &amp; beauty.
              </p>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>📍</span>
                <div>
                  <strong style={{ display: "block", color: "#fff", fontSize: 13, marginBottom: 3 }}>Batam, Indonesia</strong>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, lineHeight: 1.5, display: "block" }}>Ruko Batamas, Jl. Pasir Putih No.49-51, Sadai, Bengkong, Batam 29444</span>
                </div>
              </div>
              <button onClick={() => scrollTo("investor")} className="rwg-gold-btn" style={{ padding: "13px", fontSize: 14, width: "100%", borderRadius: 12 }}>
                Book a Visit →
              </button>
            </div>
            {/* Upcoming */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ borderRadius: 16, padding: "18px 16px", border: "1px solid rgba(123,47,190,0.25)", background: "rgba(123,47,190,0.06)" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(123,47,190,0.1)", border: "1px solid rgba(123,47,190,0.25)", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 600, color: "#a78bfa", marginBottom: 10 }}>🇸🇬 HEADQUARTERS</div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Singapore HQ</h3>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>Operational HQ — digital operations and investor relations.</p>
              </div>
              <div style={{ borderRadius: 16, padding: "18px 16px", border: "1px solid rgba(0,245,255,0.2)", background: "rgba(0,245,255,0.04)" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.2)", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 600, color: "#00F5FF", marginBottom: 10 }}>🌏 EXPANDING</div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 10 }}>Next Locations</h3>
                {[["2026","Kuala Lumpur, Malaysia"],["2026","Bangkok, Thailand"],["2027","Hong Kong & Seoul"]].map(([year, city]) => (
                  <div key={city} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "9px 12px", marginBottom: 8 }}>
                    <span style={{ background: "rgba(0,245,255,0.1)", color: "#00F5FF", border: "1px solid rgba(0,245,255,0.2)", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, flexShrink: 0 }}>{year}</span>
                    {city}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ INVESTOR ══ */}
      <section id="investor" style={{ padding: "48px 16px", background: "rgba(18,18,42,0.6)", position: "relative", zIndex: 10 }} className="sm:py-20">
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="rwg-split-grid">
            <div>
              <div style={{ textAlign: "center" }} className="lg:text-left">
                <div className="rwg-section-badge">For Investors</div>
                <h2 style={{ fontSize: "clamp(22px,6vw,34px)", fontWeight: 800, color: "#fff", marginBottom: 12, lineHeight: 1.2 }}>
                  This Is More Than a Club.<br />
                  <span style={{ background: "linear-gradient(90deg,#C9A84C,#F0D080)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>It's an Economy.</span>
                </h2>
              </div>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 24, textAlign: "left" }}>
                RebornWave operates a closed-loop membership economy. Supply is permanently capped. Resales generate platform fees.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                {[["$89M+","Total Revenue Potential"],["1.11M","Hard Cap — Total Members"],["5%","Marketplace Fee"],["10%","Lifetime Referral"]].map(([val, label]) => (
                  <div key={label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "16px 14px" }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#C9A84C" }}>{val}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4, lineHeight: 1.4 }}>{label}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => scrollTo("email-capture")} className="rwg-gold-btn" style={{ padding: "14px 28px", fontSize: 14, width: "100%", borderRadius: 14 }}>
                📊 Request Investor Brief
              </button>
            </div>
            {/* Booking form */}
            <div style={{ borderRadius: 20, padding: "24px 20px", background: "linear-gradient(145deg,rgba(123,47,190,0.15),rgba(233,69,96,0.08))", border: "1px solid rgba(123,47,190,0.25)" }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 18 }}>🏛️ Book an Investor Visit</h3>
              {[["✦","Physical walkthrough of Batam venue"],["✦","Live revenue dashboard presentation"],["✦","Meet the founding team"],["✦","Priority Founders VIP allocation"]].map(([dot, text]) => (
                <div key={text} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "rgba(255,255,255,0.65)", marginBottom: 10 }}>
                  <span style={{ color: "#C9A84C" }}>{dot}</span> {text}
                </div>
              ))}
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                <input className="rwg-input" type="text" placeholder="Full Name *" />
                <input className="rwg-input" type="email" placeholder="Email Address *" />
                <input className="rwg-input" type="text" placeholder="Company / Organisation" />
                <select className="rwg-select rwg-input">
                  <option value="" disabled>Investment Interest Level</option>
                  <option>Exploring ($10K–$50K)</option>
                  <option>Serious ($50K–$250K)</option>
                  <option>Strategic ($250K+)</option>
                  <option>Founders VIP Purchase</option>
                </select>
                <button className="rwg-gold-btn" style={{ padding: 14, fontSize: 15, borderRadius: 12 }}>
                  Request Investor Meeting →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ REWARDS ══ */}
      <section id="rewards" style={{ padding: "48px 16px", position: "relative", zIndex: 10 }} className="sm:py-20">
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div className="rwg-section-badge">Gamification + Rewards</div>
            <h2 style={{ fontSize: "clamp(22px,6vw,34px)", fontWeight: 800, color: "#fff", marginBottom: 8 }}>Earn. Level Up. Get Addicted.</h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>Every transaction, visit, and referral earns you rewards.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }} className="sm:grid-cols-3 sm:gap-5">
            {[
              { emoji: "🐾", title: "Digital Pets", desc: "Earn a unique companion. Feed it with XP. Evolve to unlock rare items.", highlight: "Level up → unlock rares" },
              { emoji: "👥", title: "10% Referral For Life", desc: "Invite friends. Earn 10% commission on everything they spend — forever.", highlight: "Lifetime passive earnings" },
              { emoji: "⚡", title: "XP & Loyalty Points", desc: "Every dollar spent earns XP. Level up to unlock VIP upgrades.", highlight: "Spend → Earn → Unlock" },
              { emoji: "🏪", title: "Marketplace", desc: "Trade memberships and blind box items. Rare items appreciate.", highlight: "Your membership = asset" },
              { emoji: "🎰", title: "Daily Spin", desc: "Log in daily for free spins, bonus XP, and surprise rewards.", highlight: "Free daily rewards" },
              { emoji: "🏆", title: "Leaderboards", desc: "Top 10 monthly earners win VIP upgrades, blind box sets, cashback.", highlight: "Monthly prizes" },
            ].map(({ emoji, title, desc, highlight }) => (
              <div key={title} style={{ borderRadius: 16, padding: "18px 16px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)", textAlign: "center", transition: "all 0.3s" }}
                className="sm:p-6 hover:-translate-y-1 hover:border-amber-500/25">
                <div style={{ fontSize: 32, marginBottom: 10 }}>{emoji}</div>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{title}</h3>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, marginBottom: 10 }}>{desc}</p>
                <div style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, padding: "7px 10px", fontSize: 11, fontWeight: 700, color: "#C9A84C" }}>{highlight}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ EMAIL CAPTURE ══ */}
      <section id="email-capture" style={{ padding: "48px 16px", background: "linear-gradient(135deg,rgba(123,47,190,0.3),rgba(233,69,96,0.2))", borderTop: "1px solid rgba(123,47,190,0.2)", borderBottom: "1px solid rgba(233,69,96,0.2)", position: "relative", zIndex: 10 }} className="sm:py-20">
        <div style={{ maxWidth: 500, margin: "0 auto", textAlign: "center" }}>
          <div className="rwg-section-badge">Don't Miss Out</div>
          <h2 style={{ fontSize: "clamp(24px,7vw,38px)", fontWeight: 900, color: "#fff", marginBottom: 10, lineHeight: 1.2 }}>
            Join the Waitlist.<br />Before It's Too Late.
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            Get first access to Founders VIP, blind box drops, and early app beta.<br />
            <strong style={{ color: "#fff" }}>{fmt(members)}</strong> members already waiting.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
            <input
              className="rwg-input"
              type="email"
              placeholder="Enter your email address..."
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleEmail()}
            />
            <button onClick={handleEmail} className="rwg-gold-btn" style={{ padding: 15, fontSize: 15, borderRadius: 14 }}>
              {emailSent ? "✅ You're in!" : "Join Now →"}
            </button>
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>🔒 No spam. Unsubscribe anytime.</p>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{ padding: "40px 16px 32px", position: "relative", zIndex: 10 }} className="rwg-footer">
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          {/* Top row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 24, marginBottom: 32 }} className="lg:grid-cols-4 lg:gap-8">
            <div style={{ gridColumn: "1 / -1" }} className="lg:col-auto">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, overflow: "hidden" }}><img src={rwgLogo} alt="RWG" style={{ width: "100%", objectFit: "contain" }} /></div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>Reborn Wave Group</span>
              </div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.7, marginBottom: 16, maxWidth: 320 }}>
                The world's first 5-in-1 luxury entertainment empire. Scarcity-driven memberships. Singapore &amp; Batam.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {["TikTok","IG","小红书","TG"].map(s => (
                  <a key={s} href="#" style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", color: "rgba(255,255,255,0.4)", fontSize: 9, fontWeight: 700 }}>{s}</a>
                ))}
              </div>
            </div>
            {[
              { title: "Membership", links: ["Founders VIP","Elite VIP","Standard VIP","Become a Member","Marketplace"] },
              { title: "Experience", links: ["KTV & Private Rooms","Sky Bar","Beauty & Wellness","Gaming Lounge","Blind Box Store"] },
              { title: "Company", links: ["Locations","Investor Relations","Rewards Program","Press & Media","Contact Us"] },
            ].map(({ title, links }) => (
              <div key={title}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 14 }}>{title}</h4>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
                  {links.map(l => <li key={l}><a href="#" style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", textDecoration: "none" }}>{l}</a></li>)}
                </ul>
              </div>
            ))}
          </div>
          {/* Bottom */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 18, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>© 2026 Reborn Wave Group. All rights reserved.</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
              <a href="#" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Privacy</a> · <a href="#" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Terms</a> · <a href="#" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Membership Rules</a>
            </p>
          </div>
        </div>
      </footer>

      {/* ══ MOBILE STICKY CTA BAR ══ */}
      <div className="mobile-cta-bar">
        <button onClick={handleLogin} className="rwg-ghost-btn" style={{ flex: 1, padding: "13px", fontSize: 14, borderRadius: 14 }}>
          Log In
        </button>
        <button onClick={() => scrollTo("membership")} className="rwg-gold-btn" style={{ flex: 2, padding: "13px", fontSize: 14, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Zap style={{ width: 14, height: 14 }} /> Secure My Spot
        </button>
      </div>
    </div>
  );
}
