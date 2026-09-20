import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { RebornLayout } from "@/components/RebornLayout";
import { Calendar, Clock, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MobileBackButton from "@/components/mobile-back-button";

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  pending: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
  scheduled: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  completed: "bg-white/10 text-white/50 border border-white/20",
  cancelled: "bg-red-500/20 text-red-300 border border-red-500/30",
};

export default function Bookings() {
  return (
    <RebornLayout active="/bookings" title="BOOKINGS"><div>
      <div className="rwg-orb-1" />
      <div className="rwg-orb-2" />
      <div className="max-w-3xl mx-auto py-2 relative z-10">
        <MobileBackButton className="mb-4" />
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Bookings</h1>
          <p className="text-white/50 mt-1 text-sm">Reserve your spot — see your bookings below.</p>
        </div>

        <TableBookingCard />
        <MyBookings />
      </div>
    </div></RebornLayout>
  );
}

function MyBookings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/my-bookings"], queryFn: () => apiRequest("GET", "/api/reborn/my-bookings").then((r) => r.json()) });
  const cancel = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/reborn/my-bookings/${id}/cancel`, {}).then((r) => r.json()),
    onSuccess: () => { toast({ title: "Booking cancelled" }); qc.invalidateQueries({ queryKey: ["/api/reborn/my-bookings"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const fmt = (iso: string) => { const d = new Date(iso); return d.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }); };
  if (!rows.length) return null;
  return (
    <div className="mt-6">
      <h2 className="text-lg font-bold text-white mb-3">My bookings</h2>
      <div className="space-y-3">
        {rows.map((b) => {
          const upcoming = new Date(b.appointmentDate).getTime() > Date.now();
          const canCancel = upcoming && (b.status === "pending" || b.status === "confirmed" || b.status === "scheduled");
          return (
            <div key={b.id} className="rwg-card p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-base font-semibold text-white leading-snug">{b.title}</h3>
                <span className={`text-xs px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_STYLE[b.status] || STATUS_STYLE.pending}`}>{b.status}</span>
              </div>
              {b.description && <p className="text-white/50 text-sm mb-2">{b.description}</p>}
              {b.adminNote && b.status === "cancelled" && <p className="text-red-300/80 text-xs mb-2">Note: {b.adminNote}</p>}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/40">
                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {fmt(b.appointmentDate)}</span>
                <span className="text-white/30">·</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {Math.round((b.duration || 120) / 60)}h</span>
              </div>
              {canCancel && (
                <button onClick={() => { if (confirm("Cancel this booking?")) cancel.mutate(b.id); }} className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-red-500/15 border border-red-400/40 text-red-200">
                  <XCircle className="w-4 h-4" /> Cancel
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TableBookingCard() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data } = useQuery<any>({ queryKey: ["/api/reborn/booking/info"], queryFn: () => apiRequest("GET", "/api/reborn/booking/info").then((r) => r.json()) });
  const todayStr = new Date().toISOString().slice(0, 10);
  const [areaId, setAreaId] = useState<string>("");
  const [date, setDate] = useState<string>(todayStr);
  const [slot, setSlot] = useState<string>("");
  const [table, setTable] = useState<string>("");
  const [party, setParty] = useState(2);
  const [hours, setHours] = useState(2);
  const areas: any[] = data?.areas || [];
  const area = areas.find((a) => a.id === areaId) || null;
  const areaSlots: any[] = area?.slots || []; // [{value,label}]
  const needTable = !!area && area.tables?.length > 0;
  // Which tables are already taken for this area on this date (to grey out).
  const { data: avail } = useQuery<any>({
    queryKey: ["/api/reborn/booking/availability", areaId, date],
    queryFn: () => apiRequest("GET", `/api/reborn/booking/availability?areaId=${encodeURIComponent(areaId)}&date=${date}`).then((r) => r.json()),
    enabled: needTable && !!areaId && !!date,
  });
  const takenForSlot: string[] = (slot && avail?.taken?.[slot]) || [];
  const book = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/booking", { areaId, date, slot, table, partySize: party, hours }).then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
    onSuccess: ({ ok, d }: any) => {
      if (!ok) { toast({ title: "Failed", description: d.message, variant: "destructive" }); return; }
      toast({ title: "Requested!", description: d.message }); setSlot(""); setTable("");
      qc.invalidateQueries({ queryKey: ["/api/reborn/my-bookings"] });
      qc.invalidateQueries({ queryKey: ["/api/reborn/booking/availability", areaId, date] });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="rwg-card p-5 mb-5">
      <h3 className="text-lg font-bold text-white mb-1">🗓️ Book at Reborn Wave</h3>
      <p className="text-white/50 text-sm mb-3">{data?.hoursSummary || "Hours vary by area · 2-hour slots (stay longer if you like)"}</p>

      {/* 1. Choose area / level */}
      <p className="text-xs text-white/50 mb-1">What would you like to book?</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {areas.map((a) => (
          <button key={a.id} onClick={() => { setAreaId(a.id); setTable(""); setSlot(""); }} className={`p-3 rounded-xl text-left ${areaId === a.id ? "bg-gradient-to-br from-violet-600/40 to-blue-600/30 border border-violet-400/50" : "bg-white/5 border border-white/10"}`}>
            <span className="block text-sm font-bold text-white">{a.name}</span>
            <span className="block text-[11px] text-white/50">{a.level}</span>
            <span className="block text-[10px] text-amber-300/80 mt-0.5">{a.hours}</span>
          </button>
        ))}
      </div>

      {area && (<>
        {area.hasImage && <img src={`/api/reborn/booking/area-image/${area.id}`} alt={`${area.name} layout`} loading="lazy" className="w-full rounded-xl border border-white/10 mb-3" style={{ maxHeight: 340, objectFit: "contain" }} />}
        {data?.note && <p className="text-white/60 text-sm mb-3">{data.note}</p>}

        <p className="text-xs text-white/50 mb-1">Date</p>
        <input type="date" value={date} min={todayStr} onChange={(e) => setDate(e.target.value)}
          className="w-full mb-3 px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400/60" style={{ colorScheme: "dark" }} />

        <p className="text-xs text-white/50 mb-1">Start time <span className="text-white/30">· {area.hours}</span></p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {areaSlots.map((s: any) => (
            <button key={s.value} onClick={() => setSlot(s.value)} className={`py-2.5 rounded-xl text-sm font-semibold ${slot === s.value ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white" : "bg-white/5 text-white/70 border border-white/10"}`}>{s.label}</button>
          ))}
        </div>

        {needTable && (<>
          <p className="text-xs text-white/50 mb-1">{area.name.includes("KTV") ? "Room" : "Table"} <span className="text-white/30">(see the plan above)</span></p>
          {!slot && <p className="text-[11px] text-amber-300/80 mb-2">Pick a start time first to see which are free.</p>}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {area.tables.map((tb: string) => {
              const taken = takenForSlot.includes(tb);
              return (
                <button key={tb} disabled={taken} onClick={() => setTable(tb)} className={`py-2.5 rounded-xl text-sm font-bold ${taken ? "bg-white/5 text-white/25 line-through cursor-not-allowed" : table === tb ? "bg-amber-400 text-black" : "bg-white/5 text-white/70 border border-white/10"}`}>{tb}</button>
              );
            })}
          </div>
        </>)}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/50">Party</span>
            <button onClick={() => setParty((p) => Math.max(1, p - 1))} className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white font-bold" style={{ fontSize: 18 }}>−</button>
            <span className="w-8 text-center font-extrabold text-white">{party}</span>
            <button onClick={() => setParty((p) => Math.min(50, p + 1))} className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white font-bold" style={{ fontSize: 18 }}>+</button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/50">Hours</span>
            <button onClick={() => setHours((h) => Math.max(2, h - 1))} className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white font-bold" style={{ fontSize: 18 }}>−</button>
            <span className="w-8 text-center font-extrabold text-white">{hours}</span>
            <button onClick={() => setHours((h) => Math.min(8, h + 1))} className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white font-bold" style={{ fontSize: 18 }}>+</button>
          </div>
        </div>

        <Button onClick={() => book.mutate()} disabled={!slot || (needTable && !table) || book.isPending} className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white border-0 rounded-xl disabled:opacity-50">
          {book.isPending ? "Booking…" : !slot ? "Pick a time" : needTable && !table ? "Pick a table/room" : "Request booking"}
        </Button>
      </>)}
    </div>
  );
}
