import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

const HERO_CSS = `
.rwg-hero {
  --bg:#08060f; --bg-soft:#0f0b1d; --ink:#f4f1ff;
  --ink-dim:rgba(244,241,255,0.66); --ink-faint:rgba(244,241,255,0.42);
  --line:rgba(244,241,255,0.14);
  --l1:#ff6b6b; --l2:#4ecdc4; --l3:#45b7d1; --l4:#96ceb4; --l5:#fdcb6e;
  --radius:18px; --ease:cubic-bezier(0.22,1,0.36,1);
  --font:"Segoe UI",-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;
  --display:"Segoe UI",-apple-system,sans-serif;
  font-family:var(--font); background:var(--bg); color:var(--ink);
  -webkit-font-smoothing:antialiased;
}
.rwg-hero *, .rwg-hero *::before, .rwg-hero *::after { box-sizing:border-box; }
.rwg-hero img, .rwg-hero video { max-width:100%; display:block; }
.rwg-hero .stage { height:100dvh; overflow-y:auto; scroll-snap-type:y mandatory; scroll-behavior:smooth; }
.rwg-hero .panel { position:relative; min-height:100dvh; scroll-snap-align:start; display:flex; align-items:center; overflow:hidden; }

.rwg-hero .topbar { position:fixed; inset:0 0 auto 0; z-index:60; display:flex; align-items:center; justify-content:space-between; padding:20px clamp(20px,5vw,60px); background:linear-gradient(to bottom,rgba(8,6,15,0.7),rgba(8,6,15,0)); backdrop-filter:blur(2px); }
.rwg-hero .brand { display:flex; align-items:center; gap:12px; font-weight:800; letter-spacing:0.28em; font-size:14px; text-transform:uppercase; }
.rwg-hero .brand .dot { width:10px; height:10px; border-radius:50%; background:conic-gradient(from 0deg,var(--l1),var(--l2),var(--l3),var(--l5),var(--l1)); box-shadow:0 0 16px rgba(255,107,107,0.8); animation:rwgspin 6s linear infinite; }
@keyframes rwgspin { to { transform:rotate(360deg); } }
.rwg-hero .topbar nav { display:flex; gap:8px; }
.rwg-hero .topbar nav a { color:var(--ink-dim); text-decoration:none; font-size:13px; padding:8px 12px; border-radius:999px; transition:color .3s,background .3s; letter-spacing:0.04em; }
.rwg-hero .topbar nav a:hover, .rwg-hero .topbar nav a:focus-visible { color:var(--ink); background:rgba(255,255,255,0.08); }
@media (max-width:720px) { .rwg-hero .topbar nav { display:none; } }
.rwg-hero .login-btn { font-family:var(--font); font-size:13px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--ink); cursor:pointer; padding:10px 22px; border-radius:999px; border:1px solid var(--line); background:rgba(255,255,255,0.06); backdrop-filter:blur(6px); transition:transform .3s var(--ease),box-shadow .3s var(--ease),border-color .3s; }
.rwg-hero .login-btn:hover, .rwg-hero .login-btn:focus-visible { border-color:transparent; transform:translateY(-1px); background:linear-gradient(90deg,var(--l1),var(--l3)); color:#fff; box-shadow:0 10px 30px rgba(255,107,107,0.3); }

.rwg-hero .rail { position:fixed; right:clamp(14px,3vw,34px); top:50%; transform:translateY(-50%); z-index:60; display:flex; flex-direction:column; gap:16px; }
.rwg-hero .rail button { width:12px; height:12px; border-radius:50%; border:1.5px solid var(--line); background:transparent; cursor:pointer; padding:0; transition:all .35s var(--ease); position:relative; }
.rwg-hero .rail button::after { content:attr(data-label); position:absolute; right:22px; top:50%; transform:translateY(-50%) translateX(6px); white-space:nowrap; font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:var(--ink-faint); opacity:0; transition:opacity .3s,transform .3s; pointer-events:none; }
.rwg-hero .rail button:hover::after { opacity:1; transform:translateY(-50%) translateX(0); }
.rwg-hero .rail button[aria-current="true"] { transform:scale(1.5); }
@media (max-width:720px) { .rwg-hero .rail { right:10px; gap:12px; } .rwg-hero .rail button::after { display:none; } }

.rwg-hero #intro { background:radial-gradient(120% 120% at 50% 0%,var(--bg-soft),var(--bg) 60%); }
.rwg-hero #intro .bg { position:absolute; inset:0; z-index:0; width:100%; height:100%; object-fit:cover; }
.rwg-hero .intro-scrim { position:absolute; inset:0; z-index:1; background:radial-gradient(120% 100% at 50% 40%,rgba(8,6,15,0.35),rgba(8,6,15,0.82) 100%),linear-gradient(0deg,rgba(8,6,15,0.9) 0%,rgba(8,6,15,0) 55%); }
.rwg-hero #intro .aurora { z-index:1; opacity:0.3; mix-blend-mode:screen; }
.rwg-hero .aurora { position:absolute; inset:-20% -10% auto -10%; height:90%; z-index:0; filter:blur(70px); opacity:0.55; pointer-events:none; }
.rwg-hero .aurora span { position:absolute; border-radius:50%; }
.rwg-hero .aurora .a { width:46vw; height:46vw; left:4%; top:6%; background:var(--l1); animation:rwgdrift 16s var(--ease) infinite alternate; }
.rwg-hero .aurora .b { width:40vw; height:40vw; right:6%; top:0; background:var(--l3); animation:rwgdrift 20s var(--ease) infinite alternate-reverse; }
.rwg-hero .aurora .c { width:34vw; height:34vw; left:40%; top:30%; background:var(--l5); opacity:0.7; animation:rwgdrift 24s var(--ease) infinite alternate; }
@keyframes rwgdrift { to { transform:translate(6%,8%) scale(1.15); } }
.rwg-hero .intro-inner { position:relative; z-index:2; width:100%; text-align:center; padding:0 20px; }
.rwg-hero .eyebrow { font-size:13px; letter-spacing:0.42em; text-transform:uppercase; color:var(--ink-dim); margin-bottom:26px; }
.rwg-hero .intro-inner h1 { font-family:var(--display); font-weight:800; line-height:0.98; font-size:clamp(44px,10vw,132px); letter-spacing:-0.02em; background:linear-gradient(180deg,#fff 0%,#cbb8ff 55%,var(--l1) 130%); -webkit-background-clip:text; background-clip:text; color:transparent; margin:0; }
.rwg-hero .intro-inner .sub { margin:26px auto 0; max-width:560px; font-size:clamp(16px,2.2vw,21px); color:var(--ink-dim); line-height:1.6; }
.rwg-hero .scroll-cue { position:absolute; bottom:34px; left:50%; transform:translateX(-50%); z-index:3; display:flex; flex-direction:column; align-items:center; gap:8px; color:var(--ink-faint); font-size:11px; letter-spacing:0.2em; text-transform:uppercase; }
.rwg-hero .scroll-cue .mouse { width:22px; height:36px; border:1.5px solid var(--line); border-radius:12px; position:relative; }
.rwg-hero .scroll-cue .mouse::before { content:""; position:absolute; left:50%; top:7px; width:3px; height:7px; border-radius:3px; background:var(--ink-dim); transform:translateX(-50%); animation:rwgwheel 1.6s var(--ease) infinite; }
@keyframes rwgwheel { 0% { opacity:0; top:6px; } 40% { opacity:1; } 100% { opacity:0; top:18px; } }

.rwg-hero .level .bg { position:absolute; inset:0; z-index:0; width:100%; height:100%; object-fit:cover; }
.rwg-hero .level .scrim { position:absolute; inset:0; z-index:1; background:linear-gradient(90deg,rgba(8,6,15,0.92) 0%,rgba(8,6,15,0.55) 42%,rgba(8,6,15,0.15) 75%,rgba(8,6,15,0.45) 100%),linear-gradient(0deg,rgba(8,6,15,0.85) 0%,rgba(8,6,15,0) 45%); }
.rwg-hero .level .content { position:relative; z-index:2; padding:0 clamp(24px,8vw,120px); max-width:720px; }
.rwg-hero .floor-tag { display:inline-flex; align-items:center; gap:12px; font-size:13px; letter-spacing:0.24em; text-transform:uppercase; color:var(--ink-dim); margin-bottom:22px; }
.rwg-hero .floor-num { display:inline-flex; align-items:center; justify-content:center; width:46px; height:46px; border-radius:12px; font-weight:800; font-size:18px; color:var(--bg); }
.rwg-hero .level h2 { font-family:var(--display); font-weight:800; letter-spacing:-0.01em; font-size:clamp(38px,7vw,84px); line-height:1; margin:0 0 20px; }
.rwg-hero .level .desc { font-size:clamp(16px,2.1vw,21px); color:var(--ink-dim); line-height:1.6; max-width:460px; margin:0; }
.rwg-hero .tags { display:flex; flex-wrap:wrap; gap:10px; margin-top:30px; }
.rwg-hero .tags span { font-size:13px; padding:9px 16px; border-radius:999px; border:1px solid var(--line); background:rgba(255,255,255,0.05); color:var(--ink); backdrop-filter:blur(6px); }
.rwg-hero .reveal { opacity:0; transform:translateY(26px); transition:opacity .8s var(--ease),transform .8s var(--ease); }
.rwg-hero .panel.in .reveal { opacity:1; transform:none; }
.rwg-hero .panel.in .reveal:nth-child(2) { transition-delay:.08s; }
.rwg-hero .panel.in .reveal:nth-child(3) { transition-delay:.16s; }
.rwg-hero .panel.in .reveal:nth-child(4) { transition-delay:.24s; }

.rwg-hero footer { scroll-snap-align:start; padding:clamp(40px,8vw,90px) clamp(24px,8vw,120px); border-top:1px solid var(--line); display:flex; flex-wrap:wrap; gap:24px; justify-content:space-between; align-items:flex-end; background:var(--bg); }
.rwg-hero footer .big { font-family:var(--display); font-weight:800; font-size:clamp(28px,5vw,54px); line-height:1.05; }
.rwg-hero footer .meta { color:var(--ink-faint); font-size:13px; line-height:1.8; }
.rwg-hero .cta { display:inline-block; margin-top:20px; text-decoration:none; padding:14px 30px; border-radius:999px; font-weight:700; letter-spacing:0.04em; color:var(--bg); background:linear-gradient(90deg,var(--l1),var(--l5)); transition:transform .3s var(--ease),box-shadow .3s var(--ease); cursor:pointer; border:none; }
.rwg-hero .cta:hover { transform:translateY(-2px); box-shadow:0 14px 40px rgba(255,107,107,0.35); }

@media (prefers-reduced-motion:reduce) {
  .rwg-hero * { animation:none !important; scroll-behavior:auto !important; transition:none !important; }
  .rwg-hero .reveal { opacity:1; transform:none; }
}
`;

const FLOORS = [
  { id: "l1", num: "01", accent: "var(--l1)", tag: "Sing Room · 🎤", src: "sing", h2: ["Sing It", "Loud"], desc: "An intimate singing lounge — grab the mic, order a round, and let the room hear you. Velvet booths, crystal glassware, zero judgement.", tags: ["Singing Lounge", "Premium Mics", "Bottle Service"] },
  { id: "l2", num: "02", accent: "var(--l2)", tag: "KTV · 🎶", src: "ktv", h2: ["Your Private", "Stage"], desc: "A whole floor of private KTV rooms — big screens, deep song libraries and dedicated service behind every door.", tags: ["Private KTV Rooms", "Huge Song Library", "Room Service"] },
  { id: "l3", num: "03", accent: "var(--l3)", tag: "VIP Room · 👑", src: "vip", h2: ["The", "Top Table"], desc: "A luxury VIP experience — champagne on arrival with sparklers, a private host, and the best seat in the building.", tags: ["VIP Tables", "Champagne Service", "Private Host"] },
  { id: "l4", num: "04", accent: "var(--l4)", tag: "Pet Paradise · 🐾", src: "pet", h2: ["Bring the", "Whole Family"], desc: "A play area and café dedicated to your pets — Doloruu's favourite floor. Because a night out shouldn't leave anyone behind.", tags: ["Pet Play Area", "Pet Café", "Doloruu Meet & Greet"] },
  { id: "l5", num: "05", accent: "var(--l5)", tag: "Live Stage · 🎵", src: "live", h2: ["Where the", "Night Peaks"], desc: "Live bands, performances and headline entertainment on the rooftop stage. The finale of every Reborn Wave night.", tags: ["Live Bands", "Headline Acts", "Rooftop Stage"] },
];

const RAIL = [
  { target: "intro", label: "Home" },
  { target: "l1", label: "Sing" },
  { target: "l2", label: "KTV" },
  { target: "l3", label: "VIP" },
  { target: "l4", label: "Pet" },
  { target: "l5", label: "Live" },
];

export default function Landing() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const panels = Array.from(root.querySelectorAll<HTMLElement>(".panel"));
    const railBtns = Array.from(root.querySelectorAll<HTMLButtonElement>(".rail button"));

    root.querySelectorAll<HTMLVideoElement>("video").forEach((v) => { v.muted = true; });

    const onRailClick = (btn: HTMLButtonElement) => () => {
      const id = btn.dataset.target;
      if (id) root.querySelector(`#${id}`)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    };
    const cleanups = railBtns.map((btn) => {
      const handler = onRailClick(btn);
      btn.addEventListener("click", handler);
      return () => btn.removeEventListener("click", handler);
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const id = (e.target as HTMLElement).id;
          const vid = e.target.querySelector<HTMLVideoElement>("video.bg");
          if (e.isIntersecting) {
            e.target.classList.add("in");
            if (vid && !reduce) vid.play().catch(() => {});
            railBtns.forEach((b) => {
              const active = b.dataset.target === id;
              b.setAttribute("aria-current", String(active));
              b.style.background = active ? "var(--c)" : "transparent";
              b.style.borderColor = active ? "var(--c)" : "var(--line)";
            });
          } else if (vid) {
            vid.pause();
          }
        });
      },
      { threshold: 0.55 },
    );
    panels.forEach((p) => io.observe(p));

    return () => {
      io.disconnect();
      cleanups.forEach((fn) => fn());
    };
  }, []);

  const goLogin = () => navigate("/login");
  const year = new Date().getFullYear();

  return (
    <div className="rwg-hero" ref={rootRef}>
      <style dangerouslySetInnerHTML={{ __html: HERO_CSS }} />

      <header className="topbar">
        <div className="brand"><span className="dot" aria-hidden="true" /> Reborn{" "}Wave</div>
        <nav aria-label="Floors">
          {RAIL.filter((r) => r.target !== "intro").map((r, i) => (
            <a key={r.target} href={`#${r.target}`}>{FLOORS[i].num} · {r.label}</a>
          ))}
        </nav>
        <button className="login-btn" type="button" onClick={goLogin}>Login</button>
      </header>

      <div className="rail" aria-hidden="true">
        {RAIL.map((r) => (
          <button
            key={r.target}
            data-target={r.target}
            data-label={r.label}
            style={{ ["--c" as string]: r.target === "intro" ? "#fff" : `var(--${r.target})` } as React.CSSProperties}
          />
        ))}
      </div>

      <main className="stage">
        {/* INTRO */}
        <section className="panel" id="intro">
          <video className="bg" src="/videos/intro.mp4" poster="/videos/intro.jpg" muted loop playsInline preload="auto" autoPlay />
          <div className="intro-scrim" aria-hidden="true" />
          <div className="aurora" aria-hidden="true"><span className="a" /><span className="b" /><span className="c" /></div>
          <div className="intro-inner">
            <p className="eyebrow reveal">Reborn Wave Group</p>
            <h1 className="reveal">FIVE WORLDS<br />ONE BUILDING</h1>
            <p className="sub reveal">A five-floor nightlife destination. Ride the elevator through singing rooms, KTV, VIP suites and more — guided by Doloruu.</p>
          </div>
          <div className="scroll-cue" aria-hidden="true"><span className="mouse" />Scroll to enter</div>
        </section>

        {/* FLOORS */}
        {FLOORS.map((f) => (
          <section key={f.id} className="panel level" id={f.id} style={{ ["--c" as string]: f.accent } as React.CSSProperties}>
            <video className="bg" src={`/videos/${f.src}.mp4`} poster={`/videos/${f.src}.jpg`} muted loop playsInline preload="none" />
            <div className="scrim" />
            <div className="content">
              <span className="floor-tag reveal"><span className="floor-num" style={{ background: f.accent }}>{f.num}</span> {f.tag}</span>
              <h2 className="reveal">{f.h2[0]}<br />{f.h2[1]}</h2>
              <p className="desc reveal">{f.desc}</p>
              <div className="tags reveal">{f.tags.map((t) => <span key={t}>{t}</span>)}</div>
            </div>
          </section>
        ))}

        <footer>
          <div>
            <div className="big">Come find<br />your floor.</div>
            <button className="cta" type="button" onClick={goLogin}>Enter the club →</button>
          </div>
          <div className="meta">
            &copy; {year} Reborn Wave Group. All rights reserved.<br />
            Doloruu is the official mascot of Reborn Wave Group.
          </div>
        </footer>
      </main>
    </div>
  );
}
