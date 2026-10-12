import { useCallback, useEffect, useRef, useState } from "react";
import { useRoute } from "wouter";
import { useTranslation } from "@/lib/i18n";
import { rememberedTenantSlug } from "@/hooks/useTenantBrand";
import { GiftScene, giftSoundOf, sceneOf } from "@/pages/reborn-kos";
import { sfx } from "@/lib/sfx";

interface Song { title: string; artist: string; table: string; name: string }
interface Gift { id: string; giftName: string; emoji: string; imageUrl: string; animation: string; fromName: string; fromTable: string; toName: string; toTable: string; kgold: number; fromPhoto?: string; toPhoto?: string; topGifters?: Array<{ name: string; photo: string; sent: number }> }
interface TvState { name: string; view: "overlay" | "queue" | "gifts" | "off"; tables: string[]; now: Song | null; next: Song[]; gifts: Gift[] }

const GIFT_SHOWN_MS = 9000;
const SAFETY_REFRESH_MS = 30_000;
const MARQUEE_SECONDS_PER_CHAR = 0.22;
const MARQUEE_MIN_SECONDS = 24;

const MARQUEE_CSS = `
@keyframes tvMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.tv-marquee { display: flex; width: max-content; animation: tvMarquee var(--tv-marquee-s, 40s) linear infinite; }
@media (prefers-reduced-motion: reduce) { .tv-marquee { animation: none; } }
`;

async function fetchState(token: string): Promise<TvState | null> {
  const res = await fetch(`/api/tv/${token}/state`, { cache: "no-store" });
  return res.ok ? res.json() : null;
}

function songText(song: Song, t: (key: string, vars?: Record<string, string>) => string): string {
  const who = [song.name, song.table ? t("hm.tv.table", { t: song.table }) : ""].filter(Boolean).join(" · ");
  return [song.title, song.artist].filter(Boolean).join(" – ") + (who ? `  (${who})` : "");
}

function NextSongBar({ state }: { state: TvState }) {
  const { t } = useTranslation();
  const parts: string[] = [];
  if (state.now) parts.push(`🎤 ${t("hm.tv.nowSinging")}: ${songText(state.now, t)}`);
  state.next.forEach((song, i) => parts.push(`${i === 0 ? "▶ " + t("hm.tv.next") : "▷"}: ${songText(song, t)}`));
  if (!parts.length) return null;
  const line = parts.join("      ✦      ");
  const seconds = Math.max(MARQUEE_MIN_SECONDS, line.length * MARQUEE_SECONDS_PER_CHAR);
  return (
    <div className="absolute inset-x-0 top-0 overflow-hidden bg-black/70 py-3 text-white" style={{ fontSize: "2.4vw", fontWeight: 800, textShadow: "0 2px 6px rgba(0,0,0,.8)" }} aria-live="off">
      <div className="tv-marquee" style={{ ["--tv-marquee-s" as string]: `${seconds}s` }}>
        <span className="whitespace-pre px-[4vw]">{line}</span>
        <span className="whitespace-pre px-[4vw]" aria-hidden="true">{line}</span>
      </div>
    </div>
  );
}

function QueueBoard({ state }: { state: TvState }) {
  const { t } = useTranslation();
  return (
    <div className="absolute inset-0 flex flex-col gap-[2vw] bg-[#0b0614] p-[4vw] text-white">
      <div className="rounded-[2vw] bg-gradient-to-r from-fuchsia-700 to-purple-700 p-[3vw]">
        <p style={{ fontSize: "1.6vw", opacity: 0.8 }}>🎤 {t("hm.tv.nowSinging")}</p>
        <p style={{ fontSize: "4.4vw", fontWeight: 900, lineHeight: 1.1 }}>{state.now ? state.now.title : "—"}</p>
        {state.now && <p style={{ fontSize: "2vw", opacity: 0.9 }}>{[state.now.artist, state.now.name, state.now.table && t("hm.tv.table", { t: state.now.table })].filter(Boolean).join(" · ")}</p>}
      </div>
      <p style={{ fontSize: "1.8vw", opacity: 0.7 }}>{t("hm.tv.upNext")}</p>
      {state.next.length === 0
        ? <p style={{ fontSize: "2.4vw", opacity: 0.8 }}>{t("hm.tv.empty")}</p>
        : <ol className="flex flex-col gap-[1vw]">
            {state.next.slice(0, 6).map((song, i) => (
              <li key={`${song.title}-${song.table}-${i}`} className="flex items-baseline gap-[2vw] rounded-[1.4vw] bg-white/10 px-[2.4vw] py-[1.2vw]">
                <span style={{ fontSize: "2.4vw", fontWeight: 900, color: "#f7d774" }}>{i + 1}</span>
                <span style={{ fontSize: "2.6vw", fontWeight: 800 }}>{song.title}</span>
                <span style={{ fontSize: "1.8vw", opacity: 0.75 }}>{[song.artist, song.name].filter(Boolean).join(" · ")}</span>
                {song.table && <span className="ml-auto" style={{ fontSize: "2vw", color: "#f7d774", fontWeight: 800 }}>{t("hm.tv.table", { t: song.table })}</span>}
              </li>
            ))}
          </ol>}
    </div>
  );
}

function GiftWall({ gifts }: { gifts: Gift[] }) {
  const { t } = useTranslation();
  return (
    <div className="absolute inset-0 bg-[#0b0614] p-[4vw] text-white">
      <p style={{ fontSize: "3vw", fontWeight: 900 }}>🎁 {t("hm.tv.giftsTitle")}</p>
      {gifts.length === 0
        ? <p className="mt-[2vw]" style={{ fontSize: "2.2vw", opacity: 0.7 }}>{t("hm.tv.noGifts")}</p>
        : <ul className="mt-[2vw] flex flex-col gap-[1vw]">
            {gifts.slice(0, 6).map((gift) => (
              <li key={gift.id} className="flex items-center gap-[2vw] rounded-[1.4vw] bg-white/10 px-[2.4vw] py-[1.2vw]" style={{ fontSize: "2.2vw" }}>
                <span style={{ fontSize: "3.4vw" }}>{gift.emoji || "🎁"}</span>
                <span>{t("hm.tv.giftBanner", { from: gift.fromName || t("hm.tv.someone"), gift: gift.giftName, to: gift.toName || t("hm.tv.someone") })}</span>
              </li>
            ))}
          </ul>}
    </div>
  );
}

// Over the karaoke picture ("overlay") a gift must not hide the song: no dark veil, the
// effect plays big with no background, and one line slides across from right to left. On a gift wall it keeps the full-screen scene.
const RANK_RING = ["#f7d774", "#d1d5db", "#d97706"];

// A member's face: their picture, or their first letter when they have none.
function Face({ name, photo, size, ring }: { name: string; photo?: string; size: string; ring?: string }) {
  return (
    <span className="inline-flex items-center justify-center overflow-hidden rounded-full shrink-0 align-middle bg-white/20 text-white font-black" style={{ width: size, height: size, border: `0.25vw solid ${ring || "rgba(255,255,255,.8)"}`, fontSize: `calc(${size} * 0.5)`, boxShadow: "0 2px 8px rgba(0,0,0,.6)" }}>
      {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : (name || "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

function GiftPlayer({ gift, dim }: { gift: Gift; dim: boolean }) {
  const { t } = useTranslation();
  const art = gift.imageUrl ? <img src={gift.imageUrl} alt="" className="gs-img" /> : <span className="gs-emoji">{gift.emoji || "🎁"}</span>;
  useEffect(() => { try { sfx.gift(giftSoundOf(gift)); } catch { /* the browser may block sound until the page is touched */ } }, [gift]);
  const from = gift.fromName || t("hm.tv.someone");
  const to = gift.toName || t("hm.tv.someone");
  if (!dim) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-black" />
        <div className="absolute inset-0"><GiftScene kind={sceneOf(gift)} art={art} /></div>
        <div className="absolute inset-x-0 bottom-[6%] px-[4vw] text-center text-white" style={{ fontSize: "3.2vw", fontWeight: 900, textShadow: "0 3px 10px rgba(0,0,0,.9)" }}>
          {t("hm.tv.giftBanner", { from, gift: gift.giftName, to })}
        </div>
      </div>
    );
  }
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <style>{`@keyframes tvGiftSlide { from { transform: translateX(100vw); } to { transform: translateX(-100%); } }`}</style>
      <div className="absolute inset-0 gs-bare">
        <GiftScene kind={sceneOf(gift)} art={art} />
      </div>
      <div className="absolute inset-x-0 top-[16%] overflow-hidden" style={{ background: "linear-gradient(90deg, transparent, rgba(0,0,0,.45) 12%, rgba(0,0,0,.45) 88%, transparent)", padding: "0.6vw 0" }}>
        <p className="whitespace-nowrap text-white inline-flex items-center gap-[1vw]" style={{ fontSize: "2.6vw", fontWeight: 900, textShadow: "0 2px 8px rgba(0,0,0,.9)", animation: `tvGiftSlide ${GIFT_SHOWN_MS}ms linear forwards` }}>
          <Face name={from} photo={gift.fromPhoto} size="4.2vw" />
          <span>{gift.emoji || "🎁"} {gift.kgold > 0 ? t("hm.tv.giftTicker", { from, gift: gift.giftName, to, kgold: gift.kgold.toLocaleString() }) : t("hm.tv.giftBanner", { from, gift: gift.giftName, to })}</span>
          <Face name={to} photo={gift.toPhoto} size="4.2vw" />
        </p>
      </div>
      {gift.topGifters && gift.topGifters.length > 0 && (
        <div className="absolute left-[2vw] top-[26%] rounded-[1.4vw] px-[1.4vw] py-[1vw] text-white" style={{ background: "rgba(0,0,0,.45)", maxWidth: "34vw" }}>
          <p style={{ fontSize: "1.7vw", fontWeight: 900, textShadow: "0 2px 6px rgba(0,0,0,.9)" }}>🏆 {t("hm.tv.topGifters", { name: to })}</p>
          <ul className="mt-[0.6vw] space-y-[0.6vw]">
            {gift.topGifters.map((top, i) => (
              <li key={`${top.name}${i}`} className="flex items-center gap-[1vw]" style={{ fontSize: "1.8vw", fontWeight: 800, textShadow: "0 2px 6px rgba(0,0,0,.9)" }}>
                <Face name={top.name} photo={top.photo} size="4vw" ring={RANK_RING[i]} />
                <span className="truncate">{i + 1}. {top.name || t("hm.tv.someone")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function TvDisplay() {
  const { t } = useTranslation();
  const [, params] = useRoute<{ token: string }>("/tv/:token");
  const token = params?.token ?? "";
  const [state, setState] = useState<TvState | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [playing, setPlaying] = useState<Gift | null>(null);
  const waiting = useRef<Gift[]>([]);
  const isPlaying = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchState(token);
      if (next) { setState(next); setInvalid(false); } else setInvalid(true);
    } catch { /* offline for a moment: the next nudge or the safety refresh tries again */ }
  }, [token]);

  const playNext = useCallback(() => {
    const gift = waiting.current.shift();
    if (!gift) { isPlaying.current = false; setPlaying(null); return; }
    isPlaying.current = true;
    setPlaying(gift);
    window.setTimeout(playNext, GIFT_SHOWN_MS);
  }, []);

  useEffect(() => {
    const previous = { body: document.body.style.background, root: document.documentElement.style.background };
    document.body.style.background = "transparent";
    document.documentElement.style.background = "transparent";
    return () => { document.body.style.background = previous.body; document.documentElement.style.background = previous.root; };
  }, []);

  useEffect(() => {
    if (!token) return;
    rememberedTenantSlug(); // saves ?tenant=<slug> as the cookie so every call below reaches this company's data
    void refresh();
    const source = new EventSource(`/api/tv/${token}/stream`);
    source.addEventListener("refresh", () => void refresh());
    source.addEventListener("gift", (event) => {
      waiting.current.push(JSON.parse((event as MessageEvent).data) as Gift);
      if (!isPlaying.current) playNext();
      void refresh();
    });
    const safety = window.setInterval(() => void refresh(), SAFETY_REFRESH_MS);
    return () => { source.close(); window.clearInterval(safety); };
  }, [token, refresh, playNext]);

  const view = state?.view;
  const showsGifts = view === "overlay" || view === "gifts";
  return (
    <div className="fixed inset-0 cursor-none overflow-hidden" style={{ background: view === "overlay" ? "transparent" : "#000" }}>
      <style>{MARQUEE_CSS}</style>
      {invalid && <p className="absolute inset-0 flex items-center justify-center bg-black p-[6vw] text-center text-white" style={{ fontSize: "3vw" }}>{t("hm.tv.unknown")}</p>}
      {!state && !invalid && <p className="absolute inset-0 flex items-center justify-center bg-black text-white" style={{ fontSize: "3vw" }}>{t("hm.tv.loading")}</p>}
      {state && view === "overlay" && <NextSongBar state={state} />}
      {state && view === "queue" && <QueueBoard state={state} />}
      {state && view === "gifts" && <GiftWall gifts={state.gifts} />}
      {state && showsGifts && playing && <GiftPlayer key={playing.id} gift={playing} dim={view === "overlay"} />}
    </div>
  );
}
