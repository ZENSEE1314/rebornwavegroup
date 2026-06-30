import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, Gift, HeartHandshake, MapPin, Sparkles } from "lucide-react";
import { ScrollVideoLevels, type HeroLevel } from "@/components/ScrollVideoLevels";
import doluruuBoy from "@assets/Doluruu Boy_1749664545355.png";
import doluruuFemale from "@assets/doluruu-female-transparent.png";
import doluruuBaby from "@assets/Doluruu Baby_1749663725243.png";
import doluruuBlindboxBox from "@assets/doluruu-blindbox-box.jpeg";

const PETS = [
  { img: doluruuBoy, name: "Male pet", tag: "1 token daily" },
  { img: doluruuFemale, name: "Female pet", tag: "1 token daily" },
  { img: doluruuBaby, name: "Baby pet", tag: "1 token daily" },
  { img: doluruuBlindboxBox, name: "Blindbox package", tag: "Member reward box" },
];

const PET_CARD_BG =
  "radial-gradient(circle at 50% 28%, rgba(252,199,117,0.16), rgba(103,232,249,0.05) 55%, rgba(255,255,255,0.03) 100%)";

const CLUB_ADDRESS =
  "Ruko Oceanic Bliss, Jl. Pasir Putih Harbourfront - Batam Centre.49 blok A. 51, Sadai, Bengkong, Batam City, Riau Islands 29444";
const GOOGLE_MAP_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CLUB_ADDRESS)}`;
const TIKTOK_URL = "https://www.tiktok.com/@reborn.wave.group";
const INSTAGRAM_URL = "https://www.instagram.com/rebornwavegroup/";

const LEVELS: HeroLevel[] = [
  { no: "1A", tone: "#22d3ee", title: "Kids Fun House", units: "Level 1 · 1 unit", videoSrc: "/floors/f1a.mp4", detail: "Children's play, family fun, and daytime tourist traffic from morning to night." },
  { no: "1B", tone: "#67e8f9", title: "KTV Lounge", units: "Level 1 · 2 units", videoSrc: "/floors/f1b.mp4", detail: "Open singing, group seating, and the singing-competition stage." },
  { no: "2A", tone: "#f472b6", title: "Hair Salon", units: "Level 2 · 1 unit", videoSrc: "/floors/f2a.mp4", detail: "Hair styling, beauty services, waiting lounge, and repeat appointments." },
  { no: "2B", tone: "#f9a8d4", title: "Private KTV Rooms", units: "Level 2 · 2 units", videoSrc: "/floors/f2b.mp4", detail: "Four private rooms for group celebrations and birthdays." },
  { no: "3A", tone: "#facc15", title: "Facial Spa", units: "Level 3 · 1 unit", videoSrc: "/floors/f3a.mp4", detail: "Facial treatments, makeup prep, and premium guest pampering." },
  { no: "3B", tone: "#fcd34d", title: "VIP KTV Rooms", units: "Level 3 · 2 units", videoSrc: "/floors/f3b.mp4", detail: "Two premium private rooms for VIP guests and higher-spend groups." },
  { no: "4", tone: "#34d399", title: "Pet Cafe", units: "Level 4 · 3 units", videoSrc: "/floors/f4.mp4", detail: "Food, drinks, pet-themed community, blindbox tie-ins, and social content." },
  { no: "5", tone: "#a78bfa", title: "Sea-View Dance Floor", units: "Level 5 · 3 units", videoSrc: "/floors/f5.mp4", detail: "Rooftop sea-view bar, live music, dance floor energy, and premium tables." },
];

const AUDIENCE = [
  { icon: Sparkles, title: "Tourists", body: "A clear Batam destination for singing, food, pet cafe content, sea-view nightlife, and live performances." },
  { icon: HeartHandshake, title: "Families", body: "Kids game house, daytime KTV, pet cafe visits, beauty services, and safe group activities." },
  { icon: Building2, title: "Events", body: "Singing competitions, live bands, performances, private rooms, birthday parties, and dance floor nights." },
];

const BLINDBOX_RULES = [
  ["Member reward", "Blindbox pets can be used for club campaigns, member rewards, and event prizes."],
  ["Male + female = baby", "If a user owns both male and female pets, they receive 1 baby pet free."],
  ["3 pets = 3 daily tokens", "Feeding male, female, and baby pets gives 3 tokens per day for prize exchange."],
  ["Tokens drive repeat visits", "Tokens can be used for rewards, upgrades, prizes, and club spending campaigns."],
];

export default function LuxExperience() {
  const demoRef = useRef<HTMLVideoElement>(null);

  // Demo video plays muted on load (browser policy) and unmutes on the first
  // user gesture so visitors hear it without a hard autoplay-with-sound block.
  useEffect(() => {
    const enableSound = () => {
      const v = demoRef.current;
      if (!v) return;
      v.muted = false;
      void v.play().catch(() => {});
    };
    const events = ["click", "scroll", "keydown", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, enableSound, { once: true }));
    return () => events.forEach((e) => window.removeEventListener(e, enableSound));
  }, []);

  return (
    <main className="bg-[#090d12] text-white">
      <header className="fixed inset-x-0 top-0 z-[60] flex items-center justify-between bg-gradient-to-b from-[#090d12]/70 to-transparent px-6 py-4">
        <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-amber-300">Reborn Wave Group</span>
        <nav className="flex items-center gap-2">
          <a href="#club" className="px-3 py-2 text-sm font-semibold text-white/75 hover:text-white">Club</a>
          <Link href="/login">
            <Button className="bg-amber-400 font-bold text-slate-950 hover:bg-amber-300">Log In</Button>
          </Link>
        </nav>
      </header>

      <ScrollVideoLevels
        eyebrow="Waterfront Lifestyle Club · Batam"
        title={
          <>
            Reborn Wave Group
            <span className="mt-2 block bg-gradient-to-r from-amber-300 to-cyan-300 bg-clip-text text-transparent">Batam Club</span>
          </>
        }
        scrollHint="scroll to ascend the 5 floors"
        levels={LEVELS}
      />

      <section className="mx-auto max-w-5xl px-5 pb-6 pt-16">
        <div className="mx-auto mb-7 max-w-2xl text-center">
          <span className="mb-3 inline-flex items-center rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-amber-200">Demo video</span>
          <h2 className="text-3xl font-black md:text-4xl">See the club in motion.</h2>
        </div>
        <div className="relative mx-auto aspect-video max-w-4xl overflow-hidden rounded-3xl border border-white/12 bg-black shadow-2xl shadow-black/60">
          <video
            ref={demoRef}
            className="h-full w-full object-cover"
            src="/demo.mp4"
            autoPlay
            muted
            loop
            playsInline
            controls
            preload="metadata"
          />
        </div>
      </section>

      <section id="club" className="mx-auto max-w-7xl px-5 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-black md:text-4xl">A one-stop club for tourists and families.</h2>
          <p className="mt-4 text-white/60">
            Built for full-day entertainment: family activities, services, singing competitions, social content, live
            shows, and evening events in one place.
          </p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {AUDIENCE.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-400/15 text-cyan-300">
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-4 text-lg font-bold">{title}</div>
              <p className="mt-2 text-sm leading-6 text-white/55">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-black md:text-4xl">Blindbox pets turn members into daily users.</h2>
          <p className="mt-4 text-white/60">
            The blindbox is not just a doll. It is a digital pet companion that members feed daily to earn tokens,
            exchange prizes, and keep coming back to the club.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          {PETS.map((pet) => (
            <div
              key={pet.name}
              className="overflow-hidden rounded-3xl border border-white/10 p-5 text-center"
              style={{ background: PET_CARD_BG }}
            >
              <div className="flex h-40 items-center justify-center">
                <img
                  src={pet.img}
                  alt={pet.name}
                  className="max-h-full max-w-full object-contain drop-shadow-[0_14px_22px_rgba(0,0,0,0.55)]"
                />
              </div>
              <div className="mt-3 font-extrabold">{pet.name}</div>
              <div className="mt-1 text-xs font-bold text-amber-300">{pet.tag}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {BLINDBOX_RULES.map(([title, body]) => (
            <div key={title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <Gift className="h-6 w-6 shrink-0 text-amber-300" />
              <div>
                <div className="font-bold">{title}</div>
                <p className="mt-1 text-sm leading-6 text-white/55">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="flex flex-col items-center gap-6 rounded-[2rem] border border-white/10 bg-gradient-to-r from-amber-400/10 to-cyan-300/10 px-8 py-12 text-center">
          <MapPin className="h-8 w-8 text-cyan-300" />
          <h2 className="text-2xl font-black md:text-3xl">Find us in Batam, Indonesia.</h2>
          <p className="max-w-xl text-white/60">
            Near Harbourfront Batam Centre — a clear destination for KTV, beauty, pet cafe, live house events, family
            activities, and member rewards.
          </p>
          <p className="max-w-md text-sm text-white/45">{CLUB_ADDRESS}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href={GOOGLE_MAP_URL} target="_blank" rel="noreferrer">
              <Button size="lg" className="bg-amber-400 text-slate-950 hover:bg-amber-300">
                Open Google Maps <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </a>
            <a href={TIKTOK_URL} target="_blank" rel="noreferrer">
              <Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">TikTok</Button>
            </a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
              <Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">Instagram</Button>
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8 text-center text-xs text-white/40">
        <div>Reborn Wave Group — Waterfront Lifestyle Club, Batam</div>
        <div className="mt-1">KTV · Game House · Beauty · Pet Cafe · Live House · Blindbox Rewards</div>
      </footer>
    </main>
  );
}
