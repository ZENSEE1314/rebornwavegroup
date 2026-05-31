import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeDollarSign,
  Building2,
  Crown,
  Gift,
  HeartHandshake,
  Landmark,
  Music2,
  PawPrint,
  Scissors,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  WalletCards,
} from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import rwgLogo from "@assets/rwg-logo.png";
import doluruuBoy from "@assets/Doluruu Boy_1749664545355.png";
import doluruuAdult from "@assets/Doluruu Adult_1749664856445.png";
import doluruuBaby from "@assets/Doluruu Baby_1749663725243.png";

type Floor = {
  level: string;
  title: string;
  units: string;
  detail: string;
  icon: typeof Music2;
  tone: string;
};

const floors: Floor[] = [
  {
    level: "1F",
    title: "KTV Lounge + Game House",
    units: "2 units KTV lounges, 1 unit kids game house",
    detail: "Open singing, competitions, family play, and daily customer traffic from morning to night.",
    icon: Trophy,
    tone: "#22d3ee",
  },
  {
    level: "2F",
    title: "Private KTV + Beauty Salon",
    units: "2 units with 4 private KTV rooms, 1 unit beauty salon",
    detail: "Private celebrations, customer hosting, beauty services, and repeat booking packages.",
    icon: Scissors,
    tone: "#f472b6",
  },
  {
    level: "3F",
    title: "VIP KTV + Beauty Salon",
    units: "2 units with 2 VIP private rooms, 1 unit beauty salon",
    detail: "Premium rooms for investor guests, birthday events, business hosting, and higher spend per visit.",
    icon: Crown,
    tone: "#facc15",
  },
  {
    level: "4F",
    title: "Pet Cafe",
    units: "All 3 units connected as a pet cafe",
    detail: "Food, drinks, pet-themed community, blindbox tie-ins, and content-friendly social traffic.",
    icon: PawPrint,
    tone: "#34d399",
  },
  {
    level: "5F",
    title: "Sea-View Live House",
    units: "Live band, dance floor, and rooftop sea view",
    detail: "Nightlife anchor with live music, special events, dance floor energy, and premium table sales.",
    icon: Music2,
    tone: "#a78bfa",
  },
];

const investorSteps = [
  {
    title: "Invest $5,000",
    detail: "Investor receives $5,000 club spending credits for friends, customers, and private hosting.",
    icon: WalletCards,
  },
  {
    title: "$10,000 ROI Target",
    detail: "Target return is paid across 24 months based on the official contract and payout rules.",
    icon: BadgeDollarSign,
  },
  {
    title: "20% Profit Pool",
    detail: "Each month, 20% of business profit is allocated and divided among active investors.",
    icon: Landmark,
  },
  {
    title: "10% New Investor Pool",
    detail: "10% of every new $5,000 investor package is shared with earlier active investors.",
    icon: Users,
  },
];

const audienceCards = [
  {
    title: "Customers",
    text: "Spend credits across KTV, beauty, pet cafe, game house, events, and live house nights.",
    icon: Sparkles,
  },
  {
    title: "Investors",
    text: "Enter with a clear $5,000 package, referral upside, capped allocation, and transparent monthly pool logic.",
    icon: HeartHandshake,
  },
  {
    title: "Workers",
    text: "A multi-floor club creates roles for hosts, singers, stylists, pet cafe crew, event staff, and promoters.",
    icon: Building2,
  },
];

function useLiveNumber(base: number, maxLift: number) {
  const [value, setValue] = useState(base);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setValue(base + Math.floor(Math.random() * maxLift));
    }, 4000);
    return () => window.clearInterval(timer);
  }, [base, maxLift]);

  return value;
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function InvestorCalculator() {
  const [invites, setInvites] = useState(3);
  const referralBonus = invites * 1000;
  const roiLeft = Math.max(10000 - referralBonus, 0);
  const complete = invites >= 10;

  return (
    <div className="rwg-eco-calculator">
      <div className="rwg-eco-panel-head">
        <span>Referral deduction simulator</span>
        <strong>{invites} friends</strong>
      </div>
      <input
        aria-label="Friends invited"
        className="rwg-eco-range"
        max={10}
        min={0}
        onChange={(event) => setInvites(Number(event.target.value))}
        type="range"
        value={invites}
      />
      <div className="rwg-eco-calc-grid">
        <div>
          <small>Referral bonus paid</small>
          <strong>${referralBonus.toLocaleString()}</strong>
        </div>
        <div>
          <small>ROI balance target</small>
          <strong>${roiLeft.toLocaleString()}</strong>
        </div>
      </div>
      <p>
        Each friend who invests $5,000 pays the inviter $1,000. That $1,000 is deducted from the inviter's
        remaining ROI target. After 10 successful investor invites, the $10,000 ROI target is fully cleared
        and the contract finishes unless the investor joins again.
      </p>
      {complete && <div className="rwg-eco-complete">Contract completed by referral bonuses.</div>}
    </div>
  );
}

function BuildingStack() {
  return (
    <div className="rwg-eco-stage" aria-label="Animated 3D five floor club model">
      <div className="rwg-eco-orbit orbit-one" />
      <div className="rwg-eco-orbit orbit-two" />
      <div className="rwg-eco-building">
        {floors
          .slice()
          .reverse()
          .map((floor, index) => (
            <div
              className="rwg-eco-floor"
              key={floor.level}
              style={
                {
                  "--floor-tone": floor.tone,
                  "--floor-index": index,
                } as React.CSSProperties
              }
            >
              <span>{floor.level}</span>
              <strong>{floor.title}</strong>
              <small>{floor.units}</small>
            </div>
          ))}
      </div>
      <img className="rwg-eco-pet rwg-eco-pet-boy" src={doluruuBoy} alt="Male blindbox pet" />
      <img className="rwg-eco-pet rwg-eco-pet-baby" src={doluruuBaby} alt="Baby blindbox pet" />
    </div>
  );
}

function Landing() {
  const members = useLiveNumber(2341, 28);
  const raised = 65000;
  const cap = 200000;
  const capPct = useMemo(() => Math.round((raised / cap) * 100), [raised]);

  const handleLogin = () => {
    window.location.href = "/login";
  };

  return (
    <main className="rwg-eco-page">
      <style>{`
        .rwg-eco-page{min-height:100vh;width:100%;max-width:100vw;background:#03151a;color:#f8fafc;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden;position:relative}
        .rwg-eco-page *{box-sizing:border-box}
        .rwg-eco-page:before{content:"";position:fixed;inset:0;background:radial-gradient(circle at 15% 15%,rgba(34,211,238,.18),transparent 28%),radial-gradient(circle at 78% 5%,rgba(250,204,21,.13),transparent 26%),linear-gradient(135deg,#03151a 0%,#05252a 48%,#080f1f 100%);pointer-events:none;z-index:0}
        .rwg-eco-page:after{content:"";position:fixed;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:56px 56px;mask-image:linear-gradient(to bottom,rgba(0,0,0,.75),transparent 80%);pointer-events:none;z-index:0}
        .rwg-eco-page>*{position:relative;z-index:1}
        .rwg-eco-nav{position:sticky;top:0;z-index:40;background:rgba(3,21,26,.78);backdrop-filter:blur(22px);border-bottom:1px solid rgba(255,255,255,.09)}
        .rwg-eco-nav-inner{max-width:1180px;margin:0 auto;padding:12px 18px;display:flex;align-items:center;justify-content:space-between;gap:16px}
        .rwg-eco-brand{display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none;font-weight:800;font-size:14px;letter-spacing:.02em}
        .rwg-eco-brand img{width:38px;height:38px;object-fit:contain;border-radius:11px;background:rgba(255,255,255,.06)}
        .rwg-eco-links{display:flex;align-items:center;gap:8px}
        .rwg-eco-links button{border:0;background:transparent;color:rgba(255,255,255,.68);font-size:13px;font-weight:700;padding:9px 10px;border-radius:10px;cursor:pointer}
        .rwg-eco-links button:hover{background:rgba(255,255,255,.08);color:#fff}
        .rwg-eco-actions{display:flex;align-items:center;gap:10px}
        .rwg-eco-primary,.rwg-eco-secondary{border-radius:14px;padding:12px 16px;font-weight:800;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:transform .2s ease,box-shadow .2s ease,background .2s ease}
        .rwg-eco-primary{border:0;color:#071316;background:linear-gradient(135deg,#fde68a,#f59e0b);box-shadow:0 16px 36px rgba(245,158,11,.24)}
        .rwg-eco-primary:hover,.rwg-eco-secondary:hover{transform:translateY(-2px)}
        .rwg-eco-secondary{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff}
        .rwg-eco-hero{max-width:1180px;margin:0 auto;padding:70px 18px 44px;display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,520px);gap:44px;align-items:center}
        .rwg-eco-hero>div{min-width:0}
        .rwg-eco-hero h1{font-size:clamp(44px,7vw,86px);line-height:.94;margin:0 0 22px;font-weight:950;letter-spacing:0;color:#fff}
        .rwg-eco-gold{color:#f8d477}
        .rwg-eco-hero p{max-width:620px;color:rgba(255,255,255,.72);font-size:18px;line-height:1.7;margin:0 0 26px}
        .rwg-eco-hero-ctas{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:28px}
        .rwg-eco-proof{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;max-width:650px}
        .rwg-eco-proof div,.rwg-eco-card,.rwg-eco-panel,.rwg-eco-calculator{background:rgba(255,255,255,.065);border:1px solid rgba(255,255,255,.11);box-shadow:0 24px 80px rgba(0,0,0,.28);backdrop-filter:blur(20px)}
        .rwg-eco-proof div{border-radius:16px;padding:16px}
        .rwg-eco-proof strong{display:block;font-size:22px;color:#f8d477}
        .rwg-eco-proof span{display:block;font-size:12px;line-height:1.45;color:rgba(255,255,255,.62);margin-top:4px}
        .rwg-eco-stage{min-height:600px;position:relative;display:grid;place-items:center;perspective:1200px}
        .rwg-eco-building{width:min(390px,82vw);transform:rotateX(58deg) rotateZ(-28deg);transform-style:preserve-3d;animation:rwg-eco-hover 7s ease-in-out infinite}
        .rwg-eco-floor{height:78px;margin:-4px 0;border:1px solid color-mix(in srgb,var(--floor-tone),white 15%);border-radius:18px;background:linear-gradient(135deg,color-mix(in srgb,var(--floor-tone),#03151a 72%),rgba(255,255,255,.08));box-shadow:0 18px 0 color-mix(in srgb,var(--floor-tone),#020617 72%),0 30px 55px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.18);display:flex;flex-direction:column;justify-content:center;padding:0 22px;transform:translateZ(calc(var(--floor-index) * 18px));position:relative;overflow:hidden}
        .rwg-eco-floor:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);transform:translateX(-120%);animation:rwg-eco-shine 4s ease-in-out infinite;animation-delay:calc(var(--floor-index) * .3s)}
        .rwg-eco-floor span{font-size:24px;font-weight:950;color:var(--floor-tone);line-height:1}
        .rwg-eco-floor strong{font-size:15px;line-height:1.1;color:#fff;margin-top:4px}
        .rwg-eco-floor small{font-size:10px;color:rgba(255,255,255,.58);margin-top:4px}
        .rwg-eco-orbit{position:absolute;border:1px solid rgba(34,211,238,.25);border-radius:50%;filter:drop-shadow(0 0 18px rgba(34,211,238,.25));animation:rwg-eco-spin 16s linear infinite}
        .orbit-one{width:480px;height:160px;transform:rotate(-18deg)}
        .orbit-two{width:330px;height:110px;transform:rotate(38deg);animation-duration:11s;border-color:rgba(250,204,21,.24)}
        .rwg-eco-pet{position:absolute;object-fit:contain;filter:drop-shadow(0 24px 30px rgba(0,0,0,.45));animation:rwg-eco-bob 4.5s ease-in-out infinite}
        .rwg-eco-pet-boy{width:145px;right:0;top:72px}
        .rwg-eco-pet-baby{width:116px;left:8px;bottom:80px;animation-delay:1s}
        .rwg-eco-section{max-width:1180px;margin:0 auto;padding:54px 18px}
        .rwg-eco-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:22px}
        .rwg-eco-section h2{font-size:clamp(28px,4vw,48px);line-height:1.04;margin:0;color:#fff;letter-spacing:0}
        .rwg-eco-section-head p{max-width:540px;color:rgba(255,255,255,.62);line-height:1.65;margin:0}
        .rwg-eco-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}
        .rwg-eco-card{border-radius:18px;padding:18px;min-height:220px;position:relative;overflow:hidden}
        .rwg-eco-card:before{content:"";position:absolute;inset:auto -30px -50px auto;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle,var(--tone),transparent 70%);opacity:.16}
        .rwg-eco-card svg{width:28px;height:28px;color:var(--tone);margin-bottom:16px}
        .rwg-eco-card b{display:block;color:var(--tone);font-size:24px;margin-bottom:6px}
        .rwg-eco-card h3{font-size:16px;line-height:1.2;margin:0 0 10px;color:#fff}
        .rwg-eco-card small{display:block;color:rgba(255,255,255,.58);font-weight:700;line-height:1.4;margin-bottom:14px}
        .rwg-eco-card p{font-size:13px;line-height:1.55;color:rgba(255,255,255,.62);margin:0}
        .rwg-eco-split{display:grid;grid-template-columns:1.05fr .95fr;gap:18px;align-items:stretch}
        .rwg-eco-panel{border-radius:22px;padding:24px}
        .rwg-eco-panel h3{font-size:24px;margin:0 0 12px;color:#fff}
        .rwg-eco-panel p{color:rgba(255,255,255,.66);line-height:1.65;margin:0}
        .rwg-eco-invest-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:20px}
        .rwg-eco-invest-step{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.055);border-radius:16px;padding:16px}
        .rwg-eco-invest-step svg{color:#f8d477;width:24px;height:24px;margin-bottom:12px}
        .rwg-eco-invest-step strong{display:block;color:#fff;font-size:15px;margin-bottom:7px}
        .rwg-eco-invest-step span{display:block;color:rgba(255,255,255,.58);font-size:12px;line-height:1.5}
        .rwg-eco-cap{margin-top:20px;padding:18px;border-radius:18px;background:rgba(3,21,26,.72);border:1px solid rgba(248,212,119,.18)}
        .rwg-eco-cap-row{display:flex;justify-content:space-between;gap:12px;color:#fff;font-weight:800;margin-bottom:10px}
        .rwg-eco-cap-track{height:12px;border-radius:20px;background:rgba(255,255,255,.09);overflow:hidden}
        .rwg-eco-cap-fill{height:100%;width:var(--cap-pct);border-radius:20px;background:linear-gradient(90deg,#22d3ee,#f8d477);box-shadow:0 0 22px rgba(34,211,238,.35)}
        .rwg-eco-calculator{border-radius:22px;padding:24px;display:flex;flex-direction:column;gap:16px}
        .rwg-eco-panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;color:rgba(255,255,255,.66);font-size:13px}
        .rwg-eco-panel-head strong{font-size:18px;color:#f8d477}
        .rwg-eco-range{width:100%;accent-color:#f8d477}
        .rwg-eco-calc-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .rwg-eco-calc-grid div{padding:15px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1)}
        .rwg-eco-calc-grid small{display:block;color:rgba(255,255,255,.55);font-size:11px;margin-bottom:6px}
        .rwg-eco-calc-grid strong{font-size:22px;color:#fff}
        .rwg-eco-complete{padding:12px 14px;border-radius:14px;background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.32);color:#86efac;font-weight:800;font-size:13px}
        .rwg-eco-audience{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
        .rwg-eco-audience .rwg-eco-panel svg{width:30px;height:30px;color:#22d3ee;margin-bottom:14px}
        .rwg-eco-blindbox{display:grid;grid-template-columns:.9fr 1.1fr;gap:18px;align-items:center}
        .rwg-eco-pets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
        .rwg-eco-pet-card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:14px;text-align:center}
        .rwg-eco-pet-card img{height:145px;width:100%;object-fit:contain;filter:drop-shadow(0 16px 20px rgba(0,0,0,.38));animation:rwg-eco-bob 4s ease-in-out infinite}
        .rwg-eco-pet-card:nth-child(2) img{animation-delay:.7s}
        .rwg-eco-pet-card:nth-child(3) img{animation-delay:1.2s}
        .rwg-eco-pet-card strong{display:block;color:#fff;margin-top:8px}
        .rwg-eco-pet-card span{display:block;color:#f8d477;font-size:12px;margin-top:5px;font-weight:800}
        .rwg-eco-rules{display:grid;gap:10px}
        .rwg-eco-rule{display:grid;grid-template-columns:44px 1fr;gap:12px;align-items:start;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:14px}
        .rwg-eco-rule svg{width:26px;height:26px;color:#f8d477;margin-top:2px}
        .rwg-eco-rule strong{display:block;color:#fff;margin-bottom:4px}
        .rwg-eco-rule span{display:block;color:rgba(255,255,255,.62);font-size:13px;line-height:1.5}
        .rwg-eco-disclaimer{max-width:1180px;margin:0 auto 42px;padding:18px;border-radius:18px;border:1px solid rgba(248,212,119,.25);background:rgba(248,212,119,.07);display:grid;grid-template-columns:32px 1fr;gap:12px;color:rgba(255,255,255,.72);font-size:12px;line-height:1.55}
        .rwg-eco-disclaimer svg{width:26px;height:26px;color:#f8d477}
        .rwg-eco-footer{border-top:1px solid rgba(255,255,255,.08);padding:26px 18px 90px;color:rgba(255,255,255,.5)}
        .rwg-eco-footer-inner{max-width:1180px;margin:0 auto;display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;font-size:12px}
        .rwg-eco-mobile-bar{display:none}
        @keyframes rwg-eco-hover{0%,100%{transform:rotateX(58deg) rotateZ(-28deg) translateY(0)}50%{transform:rotateX(58deg) rotateZ(-28deg) translateY(-12px)}}
        @keyframes rwg-eco-shine{0%,35%{transform:translateX(-120%)}65%,100%{transform:translateX(120%)}}
        @keyframes rwg-eco-spin{to{rotate:360deg}}
        @keyframes rwg-eco-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @media(max-width:1020px){.rwg-eco-links{display:none}.rwg-eco-hero,.rwg-eco-split,.rwg-eco-blindbox{grid-template-columns:1fr}.rwg-eco-hero{padding-top:42px}.rwg-eco-stage{min-height:500px;order:-1}.rwg-eco-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.rwg-eco-invest-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:680px){.rwg-eco-nav-inner{padding:10px 14px}.rwg-eco-brand span{display:none}.rwg-eco-actions{display:none}.rwg-eco-hero{display:flex;flex-direction:column;padding:26px 14px 28px;gap:18px;overflow:hidden;width:100%;max-width:100vw}.rwg-eco-hero>div{width:100%;min-width:0}.rwg-eco-hero h1{font-size:clamp(36px,12vw,46px);max-width:100%;overflow-wrap:normal}.rwg-eco-hero p{font-size:15px;max-width:100%;overflow-wrap:break-word}.rwg-eco-hero-ctas{display:grid;grid-template-columns:1fr;width:100%}.rwg-eco-proof{grid-template-columns:1fr;width:100%}.rwg-eco-stage{min-height:390px;width:100%;max-width:100%;min-width:0;overflow:hidden}.rwg-eco-building{width:260px;transform:rotateX(58deg) rotateZ(-24deg)}.rwg-eco-floor{height:64px;border-radius:14px;padding:0 16px}.rwg-eco-floor span{font-size:20px}.rwg-eco-floor strong{font-size:11px}.rwg-eco-floor small{display:none}.rwg-eco-pet-boy{width:86px;right:8px;top:54px}.rwg-eco-pet-baby{width:82px;left:4px;bottom:54px}.orbit-one{width:286px;height:110px}.orbit-two{width:210px;height:80px}.rwg-eco-section{padding:40px 14px;overflow:hidden;width:100%;max-width:100vw}.rwg-eco-section-head{display:block}.rwg-eco-section-head p{margin-top:10px}.rwg-eco-grid,.rwg-eco-invest-grid,.rwg-eco-audience,.rwg-eco-pets,.rwg-eco-calc-grid{grid-template-columns:1fr}.rwg-eco-card{min-height:auto}.rwg-eco-panel,.rwg-eco-calculator{padding:18px}.rwg-eco-mobile-bar{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:50;padding:10px 12px 18px;background:rgba(3,21,26,.94);backdrop-filter:blur(20px);border-top:1px solid rgba(255,255,255,.12);gap:10px}.rwg-eco-mobile-bar button{flex:1;min-width:0;padding-left:8px;padding-right:8px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rwg-eco-footer{padding-bottom:105px}}
        @media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;scroll-behavior:auto!important;transition:none!important}}
      `}</style>

      <nav className="rwg-eco-nav">
        <div className="rwg-eco-nav-inner">
          <a className="rwg-eco-brand" href="/">
            <img src={rwgLogo} alt="Reborn Wave Group logo" />
            <span>Reborn Wave Group</span>
          </a>
          <div className="rwg-eco-links">
            <button onClick={() => scrollTo("ecosystem")}>Ecosystem</button>
            <button onClick={() => scrollTo("investor")}>Investors</button>
            <button onClick={() => scrollTo("blindbox")}>Blindbox</button>
            <button onClick={() => scrollTo("join")}>Join</button>
          </div>
          <div className="rwg-eco-actions">
            <div className="rwg-language-wrap">
              <LanguageSelector />
            </div>
            <button className="rwg-eco-secondary" onClick={handleLogin}>
              Log In
            </button>
            <button className="rwg-eco-primary" onClick={() => scrollTo("investor")}>
              Investor Package
            </button>
          </div>
        </div>
      </nav>

      <section className="rwg-eco-hero">
        <div>
          <h1>
            Reborn Wave Group <span className="rwg-eco-gold">Club Economy</span>
          </h1>
          <p>
            A 5-story, 3-unit waterfront club built to bring in customers, investors, sales partners, and
            workers through one connected ecosystem: KTV, kids game house, beauty salons, pet cafe, live
            band, dance floor, sea view, membership credits, and blindbox pet rewards.
          </p>
          <div className="rwg-eco-hero-ctas">
            <button className="rwg-eco-primary" onClick={() => scrollTo("ecosystem")}>
              Explore Ecosystem <ArrowRight size={17} />
            </button>
            <button className="rwg-eco-secondary" onClick={() => scrollTo("blindbox")}>
              See Blindbox Rewards <Gift size={17} />
            </button>
          </div>
          <div className="rwg-eco-proof">
            <div>
              <strong>5 floors</strong>
              <span>Each floor has a different reason for people to visit and spend.</span>
            </div>
            <div>
              <strong>$200K cap</strong>
              <span>Total investor allocation is capped for this package plan.</span>
            </div>
            <div>
              <strong>{members.toLocaleString()}</strong>
              <span>Live member interest counter for waitlist and launch campaigns.</span>
            </div>
          </div>
        </div>
        <BuildingStack />
      </section>

      <section className="rwg-eco-section" id="ecosystem">
        <div className="rwg-eco-section-head">
          <h2>Five floors that feed one another.</h2>
          <p>
            The club is designed like a loop: daytime families, beauty customers, private KTV groups, pet
            lovers, nightlife guests, and investor-hosted visitors all create traffic for each other.
          </p>
        </div>
        <div className="rwg-eco-grid">
          {floors.map((floor) => {
            const Icon = floor.icon;
            return (
              <article
                className="rwg-eco-card"
                key={floor.level}
                style={{ "--tone": floor.tone } as React.CSSProperties}
              >
                <Icon />
                <b>{floor.level}</b>
                <h3>{floor.title}</h3>
                <small>{floor.units}</small>
                <p>{floor.detail}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rwg-eco-section" id="investor">
        <div className="rwg-eco-section-head">
          <h2>Investor package made simple.</h2>
          <p>
            The message is direct: invest $5,000, receive $5,000 club credits, target $10,000 ROI over 2
            years, and earn referral bonuses that reduce the remaining ROI balance.
          </p>
        </div>
        <div className="rwg-eco-split">
          <div className="rwg-eco-panel">
            <h3>$5,000 package flow</h3>
            <p>
              Investor credits can be used to bring friends, customers, and potential business partners into
              the club. Monthly payouts come from business performance and new investor package allocation.
            </p>
            <div className="rwg-eco-invest-grid">
              {investorSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div className="rwg-eco-invest-step" key={step.title}>
                    <Icon />
                    <strong>{step.title}</strong>
                    <span>{step.detail}</span>
                  </div>
                );
              })}
            </div>
            <div className="rwg-eco-cap">
              <div className="rwg-eco-cap-row">
                <span>Investment cap progress</span>
                <span>${raised.toLocaleString()} / ${cap.toLocaleString()}</span>
              </div>
              <div className="rwg-eco-cap-track">
                <div className="rwg-eco-cap-fill" style={{ "--cap-pct": `${capPct}%` } as React.CSSProperties} />
              </div>
            </div>
          </div>
          <InvestorCalculator />
        </div>
      </section>

      <section className="rwg-eco-section" id="join">
        <div className="rwg-eco-section-head">
          <h2>One ecosystem for sales, customers, and workers.</h2>
          <p>
            The club needs more than investors. It needs customers who return, promoters who bring people,
            and workers who can grow inside the business.
          </p>
        </div>
        <div className="rwg-eco-audience">
          {audienceCards.map((card) => {
            const Icon = card.icon;
            return (
              <article className="rwg-eco-panel" key={card.title}>
                <Icon />
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rwg-eco-section" id="blindbox">
        <div className="rwg-eco-section-head">
          <h2>Blindbox pets turn members into daily users.</h2>
          <p>
            The blindbox is not just a doll. It is a digital pet companion that members feed daily to earn
            tokens, exchange prizes, and come back to the Reborn Wave ecosystem.
          </p>
        </div>
        <div className="rwg-eco-blindbox">
          <div className="rwg-eco-pets">
            <div className="rwg-eco-pet-card">
              <img src={doluruuBoy} alt="Male blindbox pet" />
              <strong>Male pet</strong>
              <span>1 token daily</span>
            </div>
            <div className="rwg-eco-pet-card">
              <img src={doluruuAdult} alt="Female blindbox pet" />
              <strong>Female pet</strong>
              <span>1 token daily</span>
            </div>
            <div className="rwg-eco-pet-card">
              <img src={doluruuBaby} alt="Baby blindbox pet" />
              <strong>Baby pet</strong>
              <span>1 token daily</span>
            </div>
          </div>
          <div className="rwg-eco-rules">
            <div className="rwg-eco-rule">
              <Gift />
              <div>
                <strong>Investor bonus</strong>
                <span>Every investor receives 1 blindbox free as part of the $5,000 package.</span>
              </div>
            </div>
            <div className="rwg-eco-rule">
              <HeartHandshake />
              <div>
                <strong>Male + female = baby</strong>
                <span>If a user owns both male and female pets, they receive 1 baby pet free.</span>
              </div>
            </div>
            <div className="rwg-eco-rule">
              <PawPrint />
              <div>
                <strong>3 pets = 3 daily tokens</strong>
                <span>Feeding male, female, and baby pets gives 3 tokens per day for prize exchange.</span>
              </div>
            </div>
            <div className="rwg-eco-rule">
              <Trophy />
              <div>
                <strong>Tokens drive repeat visits</strong>
                <span>Tokens can be used for rewards, upgrades, prizes, and club spending campaigns.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="rwg-eco-disclaimer">
        <ShieldCheck />
        <div>
          This homepage draft explains the package in customer-friendly language. ROI references are targets,
          not guaranteed returns. Actual investor contracts, payout rules, profit calculation, referral
          deductions, compliance requirements, and risk disclosures should be reviewed by a qualified legal
          and financial professional before launch.
        </div>
      </div>

      <footer className="rwg-eco-footer">
        <div className="rwg-eco-footer-inner">
          <span>Reborn Wave Group - Waterfront Lifestyle Club, Batam</span>
          <span>KTV - Game House - Beauty - Pet Cafe - Live House - Blindbox Rewards</span>
        </div>
      </footer>

      <div className="rwg-eco-mobile-bar">
        <button className="rwg-eco-secondary" onClick={handleLogin}>
          Log In
        </button>
        <button className="rwg-eco-primary" onClick={() => scrollTo("investor")}>
          Investor Package
        </button>
      </div>
    </main>
  );
}

export default Landing;
