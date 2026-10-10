import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { RebornLayout } from "@/components/RebornLayout";
import { Calendar, Clock, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MobileBackButton from "@/components/mobile-back-button";
import { useTranslation, localeTag, translate, getCurrentLanguage, tData } from "@/lib/i18n";
import { eventDates } from "@/lib/eventDates";

// Booking titles/descriptions are stored in English ("KTV Lounge (Level 1) ·
// Table V1 · Party of 4") — translate the fixed words for display.
const OCC_KEY: Record<string, string> = { "🎂 Birthday": "birthday", "🏢 Company event": "company", "💕 Anniversary": "anniversary", "🎉 Celebration / party": "celebration" };
function localizeBooking(text: string): string {
  return (text || "")
    .replace(/Party of (\d+)/g, (_m, n) => translate("bk.partyOf", { n }))
    .replace(/🎂 Birthday|🏢 Company event|💕 Anniversary|🎉 Celebration \/ party/g, (m) => translate(`bk.occ.${OCC_KEY[m]}`)) // special request
    .replace(/\bTable (\S+)/g, (_m, tb) => translate("bk.tableX", { t: tb }))
    .replace(/([^·/()]+?) \((Level [^)]+)\)/g, (_m, name, lvl) => { const lang = getCurrentLanguage(); return `${areaName({ name: name.trim() }, lang)} (${areaLevel(lvl, lang)})`; });
}
// Area names/levels in the current language: admin-entered translations first,
// then the standard names, then "Level N".
const AREA_KEYS: Record<string, string> = { "game house": "bk.area.gameHouse", "ktv lounge": "bk.area.ktvLounge", "beauty service": "bk.area.beauty", "ktv room": "bk.area.ktvRoom", "vip ktv room": "bk.area.vipKtv", "pet room": "bk.area.petRoom", "restaurant": "bk.area.restaurant" };
function areaName(a: any, lang: string): string {
  if (lang === "zh" || lang === "id") { const own = a?.names?.[lang]; if (own) return own; const k = AREA_KEYS[String(a?.name || "").trim().toLowerCase()]; if (k) return translate(k); }
  return a?.name || "";
}
function areaLevel(level: string, lang: string): string {
  if (!level || (lang !== "zh" && lang !== "id")) return level;
  return level.replace(/^Level\s+(.+)$/i, (_m, n) => translate("bk.levelN", { n }));
}

// Opening hours: "5:00pm – 2:00am" in English, "17:00 – 02:00" in Chinese/Bahasa.
function hoursIn(text: string, lang: string): string {
  if (!text) return "";
  if (text === "Closed") return translate("bk.closedToday");
  if (lang === "en") return text;
  return text.replace(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/gi, (_m, h, mi, ap) => { let hh = Number(h) % 12; if (/pm/i.test(ap)) hh += 12; return `${String(hh).padStart(2, "0")}:${mi || "00"}`; });
}

const STATUS_KEY: Record<string, string> = { confirmed: "bk.st.confirmed", pending: "bk.st.pending", scheduled: "bk.st.scheduled", seated: "bk.st.seated", completed: "bk.st.completed", cancelled: "bk.st.cancelled", blocked: "bk.st.blocked", no_show: "bk.st.noShow" };

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  seated: "bg-sky-500/20 text-sky-300 border border-sky-500/30",
  pending: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
  scheduled: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  completed: "bg-white/10 text-white/50 border border-white/20",
  cancelled: "bg-red-500/20 text-red-300 border border-red-500/30",
};

export default function Bookings() {
  const { t } = useTranslation();
  return (
    <RebornLayout active="/bookings" title={t("bk.pageTitleCaps")}><div>
      <div className="rwg-orb-1" />
      <div className="rwg-orb-2" />
      <div className="max-w-3xl mx-auto py-2 relative z-10">
        <MobileBackButton className="mb-4" />
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">{t("bk.pageTitle")}</h1>
          <p className="text-white/50 mt-1 text-sm">{t("bk.pageSub")}</p>
        </div>

        <TableBookingCard />
        <MyBookings />
      </div>
    </div></RebornLayout>
  );
}

function MyBookings() {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/my-bookings"], queryFn: () => apiRequest("GET", "/api/reborn/my-bookings").then((r) => r.json()) });
  const cancel = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/reborn/my-bookings/${id}/cancel`, {}).then((r) => r.json()),
    onSuccess: () => { toast({ title: t("bk.cancelled") }); qc.invalidateQueries({ queryKey: ["/api/reborn/my-bookings"] }); },
    onError: (e: any) => toast({ title: t("bk.failed"), description: e.message, variant: "destructive" }),
  });
  const fmt = (iso: string) => { const d = new Date(iso); return d.toLocaleString(localeTag(language), { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }); };
  if (!rows.length) return null;
  return (
    <div className="mt-6">
      <h2 className="text-lg font-bold text-white mb-3">{t("bk.mine")}</h2>
      <div className="space-y-3">
        {rows.map((b) => {
          const upcoming = new Date(b.appointmentDate).getTime() > Date.now();
          const canCancel = upcoming && (b.status === "pending" || b.status === "confirmed" || b.status === "scheduled");
          return (
            <div key={b.id} className="rwg-card p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-base font-semibold text-white leading-snug">{localizeBooking(b.title)}</h3>
                <span className={`text-xs px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_STYLE[b.status] || STATUS_STYLE.pending}`}>{STATUS_KEY[b.status] ? t(STATUS_KEY[b.status]) : b.status}</span>
              </div>
              {b.description && <p className="text-white/50 text-sm mb-2">{localizeBooking(b.description)}</p>}
              {b.adminNote && b.status === "cancelled" && <p className="text-red-300/80 text-xs mb-2">{t("bk.note")}: {tData(b.adminNote)}</p>}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/40">
                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {fmt(b.appointmentDate)}</span>
                <span className="text-white/30">·</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {t("bk.hoursShort", { n: Math.round((b.duration || 120) / 60) })}</span>
              </div>
              {canCancel && (
                <button onClick={() => { if (confirm(t("bk.cancelConfirm"))) cancel.mutate(b.id); }} className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-red-500/15 border border-red-400/40 text-red-200">
                  <XCircle className="w-4 h-4" /> {t("bk.cancel")}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Matches the server: shorter than this is not an address; longer is cut.
const MIN_ADDRESS_LENGTH = 8;
const MAX_ADDRESS_LENGTH = 300;

function TableBookingCard() {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data } = useQuery<any>({ queryKey: ["/api/reborn/booking/info"], queryFn: () => apiRequest("GET", "/api/reborn/booking/info").then((r) => r.json()) });
  const todayStr = new Date().toISOString().slice(0, 10);
  const [areaId, setAreaId] = useState<string>("");
  const [planOpen, setPlanOpen] = useState(false); // floor plan full screen
  const [date, setDate] = useState<string>(todayStr);
  const [slot, setSlot] = useState<string>("");
  const [table, setTable] = useState<string>("");
  const [party, setParty] = useState(2);
  const [hours, setHours] = useState(2);
  const [occasion, setOccasion] = useState("");
  const [cake, setCake] = useState<"" | "us" | "self">(""); // birthday: we prepare the cake + decorations, or they bring their own
  const [note, setNote] = useState("");
  const [address, setAddress] = useState("");
  const areas: any[] = data?.areas || [];
  const area = areas.find((a) => a.id === areaId) || null;
  const needTable = !!area && area.tables?.length > 0;
  // A service done at the customer's place asks where to go instead of a table.
  const needAddress = area?.place === "customer";
  const hasAddress = address.trim().length >= MIN_ADDRESS_LENGTH;
  const askHours = data?.askHours !== false; // admin can switch the hours question off
  const askSpecial = data?.askSpecial !== false; // …and the special-request question
  const occasions: string[] = data?.occasions || ["birthday", "company", "anniversary", "celebration"];
  // Slots + taken tables for the chosen area+date (respects the weekly schedule).
  const { data: avail } = useQuery<any>({
    queryKey: ["/api/reborn/booking/availability", areaId, date],
    queryFn: () => apiRequest("GET", `/api/reborn/booking/availability?areaId=${encodeURIComponent(areaId)}&date=${date}`).then((r) => r.json()),
    enabled: !!areaId && !!date,
  });
  const areaSlots: any[] = avail?.slots || []; // [{value,label}]
  // Events happening on the picked date — show the poster + text.
  const { data: dayEvents = [] } = useQuery<any[]>({
    queryKey: ["/api/reborn/events", date],
    queryFn: () => apiRequest("GET", `/api/reborn/events?date=${date}`).then((r) => r.json()),
    enabled: !!date,
  });
  const takenForSlot: string[] = (slot && avail?.taken?.[slot]) || [];
  const fullSlots = new Set<string>(avail?.fullSlots || []);
  const otherAreas: any[] = avail?.otherAreas || [];
  const caps: Record<string, number> = avail?.caps || {};
  // 0 = the admin set "no max" for that table (or no max anywhere).
  const capFor = (tb: string) => (tb in caps ? caps[tb] : avail?.maxPax || 0);
  const NO_MAX = 99;
  const partyCap = (table ? capFor(table) : avail?.maxPax || 0) || NO_MAX;
  const book = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/booking", { areaId, date, slot, table, address: needAddress ? address : undefined, partySize: party, hours: askHours ? hours : 2, ...(askSpecial ? { occasion, note, cake: occasion === "birthday" ? cake : undefined } : {}) }).then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
    onSuccess: ({ ok, d }: any) => {
      if (!ok) { toast({ title: t("bk.failed"), description: d.message, variant: "destructive" }); return; }
      toast({ title: t("bk.requested"), description: d.message }); setSlot(""); setTable(""); setOccasion(""); setNote(""); setCake("");
      qc.invalidateQueries({ queryKey: ["/api/reborn/my-bookings"] });
      qc.invalidateQueries({ queryKey: ["/api/reborn/booking/availability", areaId, date] });
    },
    onError: (e: any) => toast({ title: t("bk.failed"), description: e.message, variant: "destructive" }),
  });

  return (
    <div className="rwg-card p-5 mb-5">
      <h3 className="text-lg font-bold text-white mb-1">🗓️ {t("bk.bookAt")}</h3>
      <p className="text-white/50 text-sm mb-3">{t("bk.hoursVary")}</p>

      {/* 1. Choose area / level */}
      <p className="text-xs text-white/50 mb-1">{t("bk.whatToBook")}</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {areas.map((a) => (
          <button key={a.id} onClick={() => { setAreaId(a.id); setTable(""); setSlot(""); }} className={`p-3 rounded-xl text-left ${areaId === a.id ? "bg-gradient-to-br from-violet-600/40 to-blue-600/30 border border-violet-400/50" : "bg-white/5 border border-white/10"}`}>
            <span className="block text-sm font-bold text-white">{areaName(a, language)}</span>
            <span className="block text-[11px] text-white/50">{areaLevel(a.level, language)}</span>
            <span className="block text-[10px] text-amber-300/80 mt-0.5">{hoursIn(a.hours, language)}</span>
          </button>
        ))}
      </div>

      {area && (<>
        {area.hasImage && (
          <button type="button" onClick={() => setPlanOpen(true)} className="relative block w-full mb-3 rounded-xl overflow-hidden border border-white/10 bg-white p-0" aria-label={t("bk.layoutOpen")}>
            <img src={`/api/reborn/booking/area-image/${area.id}`} alt={t("bk.layoutAlt", { a: areaName(area, language) })} loading="lazy" className="w-full" style={{ maxHeight: 340, objectFit: "contain", filter: "brightness(1.12) contrast(1.05)" }} />
            <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-bold text-white">🔍 {t("bk.layoutTap")}</span>
          </button>
        )}
        {planOpen && area.hasImage && <FloorPlanViewer src={`/api/reborn/booking/area-image/${area.id}`} title={areaName(area, language)} onClose={() => setPlanOpen(false)} />}
        {data?.note && <p className="text-white/60 text-sm mb-3">{data.note}</p>}

        <p className="text-xs text-white/50 mb-1">{t("bk.date")}</p>
        <input type="date" value={date} min={todayStr} onChange={(e) => setDate(e.target.value)}
          className="w-full mb-3 px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400/60" style={{ colorScheme: "dark" }} />

        {dayEvents.map((ev) => (
          <div key={ev.id} className="mb-3 rounded-xl overflow-hidden border border-amber-400/40 bg-amber-400/10">
            {ev.imageUrl && <img src={ev.imageUrl} alt="" className="w-full max-h-72 object-cover" loading="lazy" />}
            <div className="p-3">
              <p className="text-[11px] font-black text-amber-300 uppercase tracking-wide">🎉 {t("bk.eventOnDay")} · {eventDates(ev, language)}</p>
              <p className="font-bold text-white mt-0.5">{ev.title}</p>
              {ev.body && <p className="text-sm text-white/70 mt-1 whitespace-pre-line">{ev.body}</p>}
            </div>
          </div>
        ))}

        <p className="text-xs text-white/50 mb-1">{t("bk.startTime")} <span className="text-white/30">· {hoursIn(avail?.hours || area.hours, language)}</span></p>
        {avail?.closed ? (
          <p className="text-sm text-amber-300 mb-3">{t("bk.closedDay")}</p>
        ) : avail?.fullyBooked ? (
          <div className="mb-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3">
            <p className="text-sm text-red-300 font-semibold">{otherAreas.length ? t("bk.fullDay") : t("bk.fullVenue")}</p>
            {otherAreas.length > 0 && <>
              <p className="text-xs text-white/60 mt-2 mb-1.5">{t("bk.otherAreasFree")}</p>
              <div className="flex flex-wrap gap-2">
                {otherAreas.map((a) => <button key={a.id} onClick={() => { setAreaId(a.id); setTable(""); setSlot(""); }} className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs font-bold text-amber-200">{areaName(a, language)}</button>)}
              </div>
            </>}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {areaSlots.map((s: any) => {
              const full = fullSlots.has(s.value);
              return <button key={s.value} disabled={full} onClick={() => { setSlot(s.value); setTable(""); }} className={`py-2.5 rounded-xl text-sm font-semibold ${full ? "bg-white/5 text-white/25 cursor-not-allowed" : slot === s.value ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white" : "bg-white/5 text-white/70 border border-white/10"}`}>
                <span className={full ? "line-through" : ""}>{language === "en" ? s.label : s.value}</span>
                {full && <span className="block text-[10px] font-bold text-red-300/80 no-underline">{t("bk.slotFull")}</span>}
              </button>;
            })}
          </div>
        )}

        {needAddress && (
          <label className="block text-xs text-white/50 mb-3">{t("bk.address")}
            <textarea value={address} onChange={(e) => setAddress(e.target.value.slice(0, MAX_ADDRESS_LENGTH))} rows={2} placeholder={t("bk.addressPh")} autoComplete="street-address"
              className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-fuchsia-400" />
          </label>
        )}

        {needTable && (<>
          <p className="text-xs text-white/50 mb-1">{area.name.includes("KTV") ? t("bk.room") : t("bk.table")} <span className="text-white/30">{t("bk.seePlan")}</span></p>
          {!slot && <p className="text-[11px] text-amber-300/80 mb-2">{t("bk.pickTimeFirst")}</p>}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {area.tables.map((tb: string) => {
              const taken = takenForSlot.includes(tb);
              return (
                <button key={tb} disabled={taken} onClick={() => { setTable(tb); setParty((p) => Math.min(p, capFor(tb) || NO_MAX)); }} className={`py-2 rounded-xl text-xs font-bold leading-tight ${taken ? "bg-white/5 text-white/25 line-through cursor-not-allowed" : table === tb ? "bg-amber-400 text-black" : "bg-white/5 text-white/70 border border-white/10"}`}>{tb}<span className="block text-[9px] font-normal opacity-70">{capFor(tb) ? t("bk.upToPax", { n: capFor(tb) }) : t("bk.noMax")}</span></button>
              );
            })}
          </div>
        </>)}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/50">{t("bk.party")} {partyCap < NO_MAX && <span className="text-white/30">{t("bk.maxN", { n: partyCap })}</span>}</span>
            <button onClick={() => setParty((p) => Math.max(1, p - 1))} className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white font-bold" style={{ fontSize: 18 }}>−</button>
            <span className="w-8 text-center font-extrabold text-white">{party}</span>
            <button onClick={() => setParty((p) => Math.min(partyCap, p + 1))} disabled={party >= partyCap} className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white font-bold disabled:opacity-40" style={{ fontSize: 18 }}>+</button>
          </div>
          {askHours && <div className="flex items-center gap-3">
            <span className="text-xs text-white/50">{t("bk.hours")}</span>
            <button onClick={() => setHours((h) => Math.max(2, h - 1))} className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white font-bold" style={{ fontSize: 18 }}>−</button>
            <span className="w-8 text-center font-extrabold text-white">{hours}</span>
            <button onClick={() => setHours((h) => Math.min(8, h + 1))} className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white font-bold" style={{ fontSize: 18 }}>+</button>
          </div>}
        </div>

        {askSpecial && <div className="mb-4">
          <p className="text-xs text-white/50 mb-2">{t("bk.special")} <span className="text-white/30">· {t("bk.optional")}</span></p>
          <div className="flex flex-wrap gap-2 mb-2">
            {occasions.map((o) => (
              <button key={o} type="button" onClick={() => setOccasion(occasion === o ? "" : o)} aria-pressed={occasion === o}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition ${occasion === o ? "bg-fuchsia-500/25 border-fuchsia-400 text-white" : "bg-white/5 border-white/10 text-white/70"}`}>
                {t(`bk.occ.${o}`)}
              </button>
            ))}
          </div>
          {occasion === "birthday" && (
            <div className="mb-2 rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 p-3">
              <p className="text-sm font-semibold text-white mb-2">🎂 {t("bk.cakeQ")}</p>
              <div className="grid grid-cols-2 gap-2">
                {([["us", "bk.cakeUs"], ["self", "bk.cakeSelf"]] as const).map(([v, k]) => (
                  <button key={v} type="button" onClick={() => setCake(v)} aria-pressed={cake === v}
                    className={`px-2 py-2 rounded-lg text-xs font-bold border ${cake === v ? "bg-fuchsia-500/30 border-fuchsia-400 text-white" : "bg-white/5 border-white/10 text-white/70"}`}>{t(k)}</button>
                ))}
              </div>
            </div>
          )}
          <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} rows={2} placeholder={t("bk.specialPh")}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-fuchsia-400" />
        </div>}

        <Button onClick={() => book.mutate()} disabled={!slot || (needTable && !table) || (needAddress && !hasAddress) || book.isPending} className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white border-0 rounded-xl disabled:opacity-50">
          {book.isPending ? t("bk.booking") : !slot ? t("bk.pickTime") : needTable && !table ? t("bk.pickTable") : needAddress && !hasAddress ? t("bk.enterAddress") : t("bk.request")}
        </Button>
      </>)}
    </div>
  );
}

// Floor plan full screen: bright white background, brightened image, pinch to zoom.
function FloorPlanViewer({ src, title, onClose }: { src: string; title: string; onClose: () => void }) {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(1);
  // ☀️ steps the brightness up for dark plans: bright → brighter → brightest → normal.
  const LEVELS = [1.25, 1.6, 2.1, 1];
  const [lv, setLv] = useState(0);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = prev; };
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col bg-white">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-black/10 bg-white">
        <p className="flex-1 min-w-0 truncate text-sm font-bold text-gray-900">{t("bk.layoutAlt", { a: title })}</p>
        <button type="button" onClick={() => setLv((v) => (v + 1) % LEVELS.length)} className="h-9 min-w-[44px] px-2 rounded-full bg-amber-300 text-gray-900 text-sm font-bold" aria-label={t("bk.layoutBright")}>☀️{lv < 3 ? "+".repeat(lv + 1) : ""}</button>
        <button type="button" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} className="h-9 min-w-[36px] rounded-full bg-gray-100 text-gray-900 text-lg font-bold" aria-label="−">−</button>
        <button type="button" onClick={() => setZoom((z) => Math.min(4, z + 0.5))} className="h-9 min-w-[36px] rounded-full bg-gray-100 text-gray-900 text-lg font-bold" aria-label="+">+</button>
        <button type="button" onClick={onClose} className="h-9 px-3 rounded-full bg-gray-900 text-white text-sm font-bold">{t("bk.layoutClose")}</button>
      </div>
      <div className="flex-1 overflow-auto flex" style={{ touchAction: "pan-x pan-y pinch-zoom" }}>
        <img src={src} alt={t("bk.layoutAlt", { a: title })} className="block m-auto" style={{ width: `${zoom * 100}%`, maxWidth: "none", filter: `brightness(${LEVELS[lv]}) contrast(1.08)` }} />
      </div>
      <p className="py-2 text-center text-[11px] text-gray-500 bg-white">{t("bk.layoutHelp")}</p>
    </div>,
    document.body,
  );
}
