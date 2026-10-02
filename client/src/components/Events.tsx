import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "@/lib/i18n";
import { eventDates } from "@/lib/eventDates";
import { Megaphone, X } from "lucide-react";

// One A4 event poster card (date badge, title, two lines of text). Tap → full view.
export function EventPoster({ ev, onOpen, className = "", style }: { ev: any; onOpen: () => void; className?: string; style?: React.CSSProperties }) {
  const { t, language } = useTranslation();
  return (
    <button type="button" onClick={onOpen} className={`arc-panel overflow-hidden text-left ${className}`} style={{ padding: 0, ["--c1" as any]: "#f59e0b", ...style }}>
      <div className="relative w-full" style={{ aspectRatio: "210 / 297" }}>
        {ev.imageUrl
          ? <img src={ev.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />
          : <div className="absolute inset-0 flex items-center justify-center" style={{ background: "radial-gradient(circle at 50% 40%,rgba(251,191,36,.35),rgba(234,88,12,.15) 60%,transparent)" }}><Megaphone className="w-14 h-14 text-amber-300" /></div>}
        {ev.startDate && <span className="absolute top-2.5 left-2.5 rounded-full bg-amber-400 text-black text-[11px] font-black px-2.5 py-0.5 shadow-lg">{eventDates(ev, language)}</span>}
      </div>
      <div className="p-3">
        <p className="arc-title truncate" style={{ ["--c1" as any]: "#f59e0b", fontSize: 15 }}>{ev.title}</p>
        {ev.body && <p className="text-xs text-white/65 mt-1 line-clamp-2 whitespace-pre-line">{ev.body}</p>}
        <p className="text-[11px] font-bold text-amber-300 mt-1.5">{t("hm.ev.readMore")} →</p>
      </div>
    </button>
  );
}

// Upcoming events as A4 posters: one centred card at a time, swipe for the next.
// Tap a card to see the whole poster and the full text.
export function EventCarousel({ events }: { events: any[] }) {
  const { t, language } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<any>(null);
  const onScroll = () => {
    const el = ref.current; if (!el) return;
    const cards = Array.from(el.children) as HTMLElement[];
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0, dist = Infinity;
    cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < dist) { dist = d; best = i; } });
    setActive(best);
  };
  const goTo = (i: number) => { const c = ref.current?.children[i] as HTMLElement | undefined; c?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }); };
  return (
    <div className="mb-4">
      {/* Each slide is full width with its poster centred, so one event or many always sit in the middle. */}
      <div ref={ref} onScroll={onScroll} className="flex overflow-x-auto snap-x snap-mandatory pb-2" style={{ scrollbarWidth: "none" }}>
        {events.map((ev) => (
          <div key={ev.id} className="w-full shrink-0 snap-center flex justify-center">
            <EventPoster ev={ev} onOpen={() => setOpen(ev)} style={{ width: "78%", maxWidth: 360 }} />
          </div>
        ))}
      </div>
      {events.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-1">
          {events.map((ev, i) => <span key={ev.id} role="button" tabIndex={0} aria-label={ev.title} onClick={() => goTo(i)} className="block rounded-full transition-all cursor-pointer" style={{ height: 6, width: i === active ? 20 : 6, background: i === active ? "#fbbf24" : "rgba(255,255,255,.25)" }} />)}
        </div>
      )}
      {open && <EventViewer ev={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

// Full poster + the whole text.
export function EventViewer({ ev, onClose }: { ev: any; onClose: () => void }) {
  const { t, language } = useTranslation();
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  // Rendered on <body> so it covers the whole screen (the page body is a transformed container).
  return createPortal(
    <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="relative max-w-md mx-auto px-4 pt-14 pb-10" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label={t("hm.ev.close")} className="fixed top-4 right-4 w-11 h-11 rounded-full bg-white/20 text-white flex items-center justify-center z-10"><X style={{ width: 22, height: 22 }} /></button>
        {ev.imageUrl && <img src={ev.imageUrl} alt="" className="w-full rounded-2xl shadow-2xl" />}
        <div className="mt-4">
          {ev.startDate && <span className="inline-block mb-2 rounded-full bg-amber-400 text-black text-xs font-black px-3 py-1">{eventDates(ev, language)}</span>}
          <h2 className="arc-title" style={{ ["--c1" as any]: "#f59e0b", fontSize: 20 }}>{ev.title}</h2>
          {ev.body && <p className="text-[15px] leading-relaxed text-white/85 mt-2 whitespace-pre-line">{ev.body}</p>}
        </div>
        <button onClick={onClose} className="arc-play w-full justify-center mt-6" style={{ padding: 12 }}>{t("hm.ev.close")}</button>
      </div>
    </div>,
    document.body,
  );
}
