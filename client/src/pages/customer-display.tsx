// /customer: the screen that faces the customer. Event posters while nothing is being rung up; the bill (what they ordered, the prices and the total) beside the
// posters while the cashier works on a bill; "Thank you" after payment. Opened by the POS (button "Customer screen" or the Windows app's second monitor).
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation, localeTag } from "@/lib/i18n";
import { listenScreen, type BillSnapshot } from "@/lib/customer-screen";
import { money } from "@/lib/money";

interface PosterEvent { id: number; title: string; body?: string | null; imageUrl?: string | null; startDate?: string | null; endDate?: string | null }

const POSTER_MS = 9000;
const EVENTS_REFRESH_MS = 5 * 60 * 1000;
const THANKS_MS = 8000;
const BILL_STALE_MS = 10 * 60 * 1000; // a bill the POS never closed is taken off after this long

export default function CustomerDisplay() {
  const { t, language } = useTranslation();
  const [bill, setBill] = useState<BillSnapshot | null>(null);
  const [thanks, setThanks] = useState<number | null>(null);
  const [slide, setSlide] = useState(0);
  const { data: events = [] } = useQuery<PosterEvent[]>({ queryKey: ["/api/reborn/events"], queryFn: () => apiRequest("GET", "/api/reborn/events").then((r) => r.json()), refetchInterval: EVENTS_REFRESH_MS });
  const posters = useMemo(() => events.filter((event) => event.imageUrl), [events]);

  useEffect(() => listenScreen((message) => {
    if (message.type === "bill") { setThanks(null); setBill(message.bill.lines.length ? message.bill : null); }
    else if (message.type === "thanks") { setBill(null); setThanks(message.total); }
    else { setBill(null); }
  }), []);
  useEffect(() => { if (thanks === null) return; const timer = window.setTimeout(() => setThanks(null), THANKS_MS); return () => window.clearTimeout(timer); }, [thanks]);
  useEffect(() => { if (!bill) return; const timer = window.setTimeout(() => setBill(null), BILL_STALE_MS); return () => window.clearTimeout(timer); }, [bill]);
  useEffect(() => {
    if (posters.length < 2) return;
    const timer = window.setInterval(() => setSlide((n) => (n + 1) % posters.length), POSTER_MS);
    return () => window.clearInterval(timer);
  }, [posters.length]);
  useEffect(() => { document.title = t("cs.title"); document.body.style.background = "#05030c"; }, [t]);

  const poster = posters.length ? posters[slide % posters.length] : null;
  const dateText = (event: PosterEvent) => {
    if (!event.startDate) return "";
    const format = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(localeTag(language), { day: "numeric", month: "long" });
    return event.endDate && event.endDate !== event.startDate ? `${format(event.startDate)} – ${format(event.endDate)}` : format(event.startDate);
  };

  const posterPane = (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {poster ? (
        <>
          <img src={poster.imageUrl!} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl" />
          <img key={poster.id} src={poster.imageUrl!} alt={poster.title} className="relative z-10 h-full w-full object-contain" style={{ animation: "csfade .8s ease" }} />
          <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 to-transparent p-6 text-white">
            <p className="text-2xl font-extrabold md:text-4xl">{poster.title}</p>
            {dateText(poster) && <p className="mt-1 text-lg text-amber-300 md:text-2xl">{dateText(poster)}</p>}
          </div>
        </>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center text-white">
          <p className="text-5xl font-black tracking-widest text-amber-300 md:text-7xl">REBORN WAVE</p>
          <p className="text-xl text-white/70 md:text-3xl">{t("cs.welcome")}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 flex bg-[#05030c] text-white">
      <style>{"@keyframes csfade{from{opacity:0}to{opacity:1}}"}</style>
      <div className={bill || thanks !== null ? "hidden h-full flex-1 md:block" : "h-full w-full"}>{posterPane}</div>
      {thanks !== null && (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#1b0f33] to-[#05030c] p-8 text-center md:w-[42%] md:flex-none">
          <p className="text-6xl">💜</p>
          <p className="text-4xl font-extrabold md:text-5xl">{t("cs.thanks")}</p>
          <p className="text-2xl text-amber-300">{money(thanks)}</p>
        </div>
      )}
      {bill && (
        <div className="flex h-full w-full flex-col bg-gradient-to-b from-[#1b0f33] to-[#0a0714] p-6 md:w-[42%] md:flex-none">
          <p className="text-sm font-bold uppercase tracking-widest text-amber-300">{t("cs.yourOrder")}{bill.table ? ` · ${t("cs.table", { t: bill.table })}` : ""}</p>
          {bill.member && <p className="text-white/60">{bill.member}</p>}
          <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {bill.lines.map((line, index) => (
              <div key={`${line.name}-${index}`} className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-2">
                <span className="min-w-0 text-xl md:text-2xl"><b className="text-amber-300">{line.qty}×</b> {line.name}</span>
                <span className="shrink-0 text-xl font-bold md:text-2xl">{money(line.total)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1 text-lg text-white/80">
            <div className="flex justify-between"><span>{t("cs.subtotal")}</span><span>{money(bill.subtotal)}</span></div>
            {bill.discount > 0 && <div className="flex justify-between text-emerald-300"><span>{t("cs.discount")}</span><span>− {money(bill.discount)}</span></div>}
            {bill.serviceFee > 0 && <div className="flex justify-between"><span>{t("cs.service")}</span><span>{money(bill.serviceFee)}</span></div>}
            {bill.tax > 0 && <div className="flex justify-between"><span>{t("cs.tax")}</span><span>{money(bill.tax)}</span></div>}
          </div>
          <div className="mt-3 flex items-baseline justify-between border-t-2 border-amber-300/60 pt-3">
            <span className="text-2xl font-bold">{t("cs.total")}</span>
            <span className="text-4xl font-black text-amber-300 md:text-5xl">{money(bill.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
