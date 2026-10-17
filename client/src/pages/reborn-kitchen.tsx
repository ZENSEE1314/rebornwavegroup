// Kitchen / bar screen: leave it open on the kitchen PC or tablet. Every new item prints a docket by itself (no tap), and the cook only taps "Served" when it leaves.
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { RebornLayout } from "@/components/RebornLayout";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import { printKitchen } from "@/lib/receipt";
import { useIsOffline } from "@/lib/offline-sales";
import { Check, Printer } from "lucide-react";

const STATIONS = ["all", "kitchen", "bar", "dessert"] as const;
type StationChoice = (typeof STATIONS)[number];
const REFRESH_MS = 4000;
const LATE_MINUTES = 10;
const VERY_LATE_MINUTES = 20;
const STATION_KEY = "rw.kitchen.station";
const AUTO_PRINT_KEY = "rw.kitchen.autoPrint";

interface KitchenItem { id: number; name: string; qty: number; station: string }
interface KitchenOrder { orderId: number; orderNo: string; tableNumber?: string | null; orderMode?: string | null; memberName?: string | null; createdAt?: string; items: KitchenItem[] }

const saved = (key: string, fallback: string) => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } };
const keep = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* not saved: the choice only lasts this visit */ } };

function beep() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination); osc.type = "sine"; osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(); osc.stop(ctx.currentTime + 0.5);
  } catch { /* no sound on this device */ }
}

export default function RebornKitchen() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user, isLoading } = useAuth();
  const role = (user as any)?.role;
  const isStaff = role === "admin" || role === "staff";
  const isOffline = useIsOffline();
  const [station, setStation] = useState<StationChoice>(() => (STATIONS as readonly string[]).includes(saved(STATION_KEY, "all")) ? saved(STATION_KEY, "all") as StationChoice : "all");
  const [isAutoPrint, setIsAutoPrint] = useState(() => saved(AUTO_PRINT_KEY, "on") === "on");
  const [now, setNow] = useState(Date.now());
  const busy = useRef(false);
  const listKey = ["/api/reborn/kitchen/orders", station];
  const { data: orders = [] } = useQuery<KitchenOrder[]>({ queryKey: listKey, queryFn: () => apiRequest("GET", `/api/reborn/kitchen/orders?station=${station}`).then((r) => r.json()), enabled: isStaff, refetchInterval: REFRESH_MS });

  const titleFor = (value: string) => (value === "bar" ? t("pos.kitchen.docketBar") : value === "dessert" ? t("pos.kitchen.docketDessert") : undefined);
  const printOrder = (order: KitchenOrder) => printKitchen({ orderNo: order.orderNo, tableNumber: order.tableNumber || undefined, memberName: order.memberName || undefined, orderMode: order.orderMode || undefined, createdAt: order.createdAt, items: order.items.map((item) => ({ ...item, price: 0, lineTotal: 0 })) } as any, titleFor(order.items[0]?.station || station));

  // New items: take the dockets still to print (the server hands each one out once) and print them.
  useEffect(() => {
    if (!isStaff || !isAutoPrint) return;
    const timer = setInterval(async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        const res = await apiRequest("POST", "/api/reborn/kitchen/claim", { station });
        const { orders: fresh } = await res.json() as { orders: KitchenOrder[] };
        if (fresh.length) { fresh.forEach(printOrder); beep(); qc.invalidateQueries({ queryKey: listKey }); }
      } catch { /* offline or signed out: the next round tries again */ } finally { busy.current = false; }
    }, REFRESH_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaff, isAutoPrint, station]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);

  // What is ready and not yet collected, and who made it ready (every staff member sees it here, not only the cook).
  const { data: readyItems = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/pos/ready-items"], queryFn: () => apiRequest("GET", "/api/reborn/pos/ready-items").then((r) => r.json()), enabled: isStaff, refetchInterval: REFRESH_MS });
  const markReady = async (ids: number[]) => {
    try {
      for (const id of ids) await apiRequest("POST", `/api/reborn/pos/items/${id}/status`, { status: "ready" });
      qc.invalidateQueries({ queryKey: listKey }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/ready-items"] });
    } catch (e: any) { toast({ title: t("pos.failed"), description: String(e.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" }); }
  };
  const chooseStation = (value: StationChoice) => { setStation(value); keep(STATION_KEY, value); };
  const toggleAutoPrint = (on: boolean) => { setIsAutoPrint(on); keep(AUTO_PRINT_KEY, on ? "on" : "off"); };
  const label = (value: StationChoice) => t(`pos.kitchen.station${value === "all" ? "All" : value === "kitchen" ? "Kitchen" : value === "bar" ? "Bar" : "Dessert"}`);

  if (!isLoading && !isStaff) return <RebornLayout active="/pos" title={t("pos.kitchen.title")}><p className="py-16 text-center text-white/50">{t("pos.staffOnly")}</p></RebornLayout>;
  return (
    <RebornLayout active="/pos" title={t("pos.kitchen.title")} wide hideNav>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-extrabold">🍳 {t("pos.kitchen.title")}</h1>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {STATIONS.map((value) => <button key={value} type="button" onClick={() => chooseStation(value)} aria-pressed={station === value} className={`rounded-xl px-4 py-2 text-sm font-bold ${station === value ? "bg-amber-400 text-black" : "bg-white/5 text-white/70"}`}>{label(value)}</button>)}
        </div>
      </div>
      <label className="mb-1 flex items-center gap-2 text-sm"><input type="checkbox" checked={isAutoPrint} onChange={(e) => toggleAutoPrint(e.target.checked)} />{t("pos.kitchen.autoPrint")}</label>
      <p className="mb-3 text-[11px] text-white/45">{t("pos.kitchen.printHint")}</p>
      {isOffline && <p className="mb-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-100">📴 {t("pos.kitchen.offline")}</p>}
      {readyItems.length > 0 && (
        <div className="mb-3 rounded-2xl border border-pink-400/40 bg-pink-500/10 p-3">
          <p className="mb-2 text-sm font-bold text-pink-200">🔔 {t("pos.kitchen.readyList", { n: readyItems.length })}</p>
          <div className="space-y-1">
            {readyItems.map((item) => (
              <p key={item.id} className="text-sm">{item.qty} × {item.name} <span className="text-white/60">· {item.tableNumber ? t("pos.table", { n: item.tableNumber }) : t("pos.walkIn")}{item.readyByName ? ` · ${t("pos.item.by2", { n: item.readyByName })}` : ""}</span></p>
            ))}
          </div>
        </div>
      )}
      {orders.length === 0 && <p className="py-16 text-center text-white/40">{t("pos.kitchen.empty")}</p>}
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))" }}>
        {orders.map((order) => {
          const minutes = Math.max(0, Math.round((now - new Date(order.createdAt || now).getTime()) / 60_000));
          const tone = minutes >= VERY_LATE_MINUTES ? "border-red-400/60 bg-red-500/10" : minutes >= LATE_MINUTES ? "border-amber-400/60 bg-amber-400/10" : "border-white/10 bg-white/5";
          return (
            <div key={order.orderId} className={`rounded-2xl border p-3 ${tone}`}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div><p className="text-2xl font-black leading-none">{order.tableNumber ? t("pos.table", { n: order.tableNumber }) : t("pos.walkIn")}</p><p className="mt-1 text-[11px] text-white/50">{order.orderNo}{order.memberName ? ` · ${order.memberName}` : ""}</p></div>
                <span className="rounded-lg bg-black/30 px-2 py-1 text-xs font-bold">{t("pos.kitchen.minutes", { n: minutes })}</span>
              </div>
              <div className="space-y-1.5">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span className="flex-1 text-lg font-semibold leading-tight">{item.qty} × {item.name}</span>
                    <button type="button" onClick={() => markReady([item.id])} className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-black"><Check className="h-4 w-4" />{t("pos.kitchen.ready")}</button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                {order.items.length > 1 && <button type="button" onClick={() => markReady(order.items.map((item) => item.id))} className="flex-1 rounded-xl bg-emerald-500/90 py-2.5 text-sm font-bold text-black">{t("pos.kitchen.readyAll")}</button>}
                <button type="button" onClick={() => printOrder(order)} className="inline-flex items-center justify-center gap-1 rounded-xl bg-white/10 px-3 py-2.5 text-xs font-bold"><Printer className="h-4 w-4" />{t("pos.kitchen.reprint")}</button>
              </div>
            </div>
          );
        })}
      </div>
    </RebornLayout>
  );
}
