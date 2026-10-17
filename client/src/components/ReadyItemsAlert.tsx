import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";

const READY_ITEMS = "/api/reborn/pos/ready-items";
const POLL_MS = 5000;
const RING_EVERY_MS = 3000;
const VIBRATION = [300, 150, 300];
const BEEP_HZ = 660;
const BEEP_SECONDS = 0.3;
const KITCHEN_PATH = "/kitchen";

interface ReadyItem { id: number; name: string; qty: number; orderNo: string; tableNumber: string | null }

let audio: AudioContext | null = null;
function beep() {
  try {
    audio = audio ?? new (window.AudioContext || (window as any).webkitAudioContext)();
    void audio.resume();
    const tone = audio.createOscillator();
    const volume = audio.createGain();
    tone.frequency.value = BEEP_HZ;
    volume.gain.setValueAtTime(0.2, audio.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + BEEP_SECONDS);
    tone.connect(volume).connect(audio.destination);
    tone.start();
    tone.stop(audio.currentTime + BEEP_SECONDS);
  } catch { /* no sound available */ }
}

// Every staff phone vibrates (and beeps) while the kitchen has something ready; the first person to collect it taps "Collected" and it stops for everyone.
// The kitchen screen itself stays quiet: the cook just marked it.
export function ReadyItemsAlert() {
  const { user } = useAuth();
  const role = (user as any)?.role;
  const isStaff = role === "admin" || role === "staff";
  const isKitchenScreen = typeof window !== "undefined" && window.location.pathname.startsWith(KITCHEN_PATH);
  const isActive = isStaff && !isKitchenScreen;
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: items = [] } = useQuery<ReadyItem[]>({
    queryKey: [READY_ITEMS], queryFn: () => apiRequest("GET", READY_ITEMS).then((r) => r.json()), enabled: isActive, retry: false, refetchInterval: (query) => (query.state.error ? false : POLL_MS),
  });

  const isRinging = isActive && items.length > 0;
  useEffect(() => {
    if (!isRinging) return;
    const ring = () => { navigator.vibrate?.(VIBRATION); beep(); };
    ring();
    const timer = setInterval(ring, RING_EVERY_MS);
    return () => { clearInterval(timer); navigator.vibrate?.(0); };
  }, [isRinging]);

  // The line leaves the screen at once so it cannot be tapped twice; the server's list follows.
  const collect = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/reborn/pos/items/${id}/status`, { status: "served" }).then((r) => r.json()),
    onMutate: (id) => { qc.setQueryData<ReadyItem[]>([READY_ITEMS], (old) => (old ?? []).filter((item) => item.id !== id)); },
    onSettled: () => { qc.invalidateQueries({ queryKey: [READY_ITEMS] }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/orders"] }); },
  });

  if (!isActive || items.length === 0) return null;
  return (
    <div className="fixed inset-x-2 bottom-20 z-[70] max-h-[50vh] space-y-2 overflow-y-auto rounded-2xl border border-pink-400/70 bg-pink-950/95 p-3 shadow-2xl backdrop-blur" aria-live="assertive">
      <p className="flex items-center gap-2 text-sm font-bold text-white"><BellRing className="h-5 w-5 animate-pulse text-pink-300" />{t("hm.ready.title")}</p>
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{item.qty} × {item.name}</p>
            <p className="text-[11px] text-white/70">{item.tableNumber ? t("hm.ready.table", { t: item.tableNumber }) : t("hm.ready.walkIn")} · {item.orderNo}</p>
          </div>
          <button onClick={() => collect.mutate(item.id)} className="shrink-0 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-black">{t("hm.ready.collected")}</button>
        </div>
      ))}
    </div>
  );
}
