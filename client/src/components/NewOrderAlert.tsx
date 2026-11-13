import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";

const PENDING_ORDERS = "/api/reborn/pos/pending-orders";
const POLL_MS = 5000;
const RING_EVERY_MS = 3000;
const VIBRATION = [500, 200, 500, 200, 500];
const BEEP_HZ = [988, 1319];
const BEEP_SECONDS = 0.35;
const BEEP_LOUDNESS = 1;

interface PendingOrder { orderId: number; orderNo: string; tableNumber: string | null; memberName: string; at: string; items: { id: number; name: string; qty: number }[] }

let audio: AudioContext | null = null;
function beep() {
  try {
    audio = audio ?? new (window.AudioContext || (window as any).webkitAudioContext)();
    void audio.resume();
    BEEP_HZ.forEach((hz, index) => {
      const start = audio!.currentTime + index * BEEP_SECONDS;
      const tone = audio!.createOscillator();
      const volume = audio!.createGain();
      tone.type = "square";
      tone.frequency.value = hz;
      volume.gain.setValueAtTime(BEEP_LOUDNESS, start);
      volume.gain.exponentialRampToValueAtTime(0.001, start + BEEP_SECONDS);
      tone.connect(volume).connect(audio!.destination);
      tone.start(start);
      tone.stop(start + BEEP_SECONDS);
    });
  } catch { /* no sound available */ }
}

// A member's order waits for the counter: every staff phone and admin screen vibrates and beeps until someone taps Accept
// (like a service call). Orders the counter or the app accepts by itself never show here.
export function NewOrderAlert() {
  const { user } = useAuth();
  const role = (user as any)?.role;
  const isStaff = role === "admin" || role === "staff";
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: orders = [] } = useQuery<PendingOrder[]>({
    queryKey: [PENDING_ORDERS], queryFn: () => apiRequest("GET", PENDING_ORDERS).then((r) => r.json()), enabled: isStaff, retry: false, refetchInterval: (query) => (query.state.error ? false : POLL_MS),
  });

  const isRinging = isStaff && orders.length > 0;
  useEffect(() => {
    if (!isRinging) return;
    const ring = () => { navigator.vibrate?.(VIBRATION); beep(); };
    ring();
    const timer = setInterval(ring, RING_EVERY_MS);
    return () => { clearInterval(timer); navigator.vibrate?.(0); };
  }, [isRinging]);

  // The order leaves the screen at once so it cannot be tapped twice; the server's list follows.
  const accept = useMutation({
    mutationFn: (order: PendingOrder) => Promise.all(order.items.map((item) => apiRequest("POST", `/api/reborn/pos/items/${item.id}/status`, { status: "accepted" }).then((r) => r.json()))),
    onMutate: (order) => { qc.setQueryData<PendingOrder[]>([PENDING_ORDERS], (old) => (old ?? []).filter((o) => o.orderId !== order.orderId)); },
    onSettled: () => { qc.invalidateQueries({ queryKey: [PENDING_ORDERS] }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/orders"] }); },
  });

  if (!isStaff || orders.length === 0) return null;
  return (
    <div className="fixed inset-x-2 top-20 z-[70] max-h-[50vh] space-y-2 overflow-y-auto" aria-live="assertive">
      {orders.map((order) => (
        <div key={order.orderId} className="rounded-2xl border border-orange-400/70 bg-orange-950/95 p-3 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-3">
            <BellRing className="h-6 w-6 shrink-0 animate-pulse text-orange-300" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight text-white">{t("hm.order.title", { t: order.tableNumber || "-" })}</p>
              <p className="truncate text-[11px] text-white/70">{order.memberName || t("hm.order.member")} · {order.orderNo} · {new Date(order.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
            <button onClick={() => accept.mutate(order)} className="shrink-0 rounded-xl bg-orange-400 px-4 py-2.5 text-sm font-black text-black">{t("hm.order.accept")}</button>
          </div>
          <ul className="mt-2 space-y-0.5 text-xs text-white/90">
            {order.items.map((item) => <li key={item.id}>{item.qty} × {item.name}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}
