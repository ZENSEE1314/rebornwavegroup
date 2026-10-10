import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";

const CALLS = "/api/reborn/venue/service-calls";
const STAFF = `${CALLS}/staff`;
const POLL_MS = 5000;
const RING_EVERY_MS = 3000;
const VIBRATION = [500, 200, 500, 200, 500];
const BEEP_HZ = 880;
const BEEP_SECONDS = 0.35;

interface Person { id: string; name: string }
interface Call { id: string; table: string; name: string; at: number; assignedTo?: Person; acceptedBy?: Person }
interface CallsReply { calls: Call[]; me: { id: string; canManage: boolean } }

let audio: AudioContext | null = null;
// A short beep next to the vibration. Browsers only allow sound after the person has touched the page.
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

// Shown to staff and admins on every page: a table is calling. The phone keeps vibrating (and
// beeping) until someone accepts; a manager or the main admin can send a particular person.
export function ServiceCallAlert() {
  const { user } = useAuth();
  const role = (user as any)?.role;
  const isStaff = role === "admin" || role === "staff";
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data } = useQuery<CallsReply>({
    queryKey: [CALLS], queryFn: () => apiRequest("GET", CALLS).then((r) => r.json()), enabled: isStaff, refetchInterval: POLL_MS,
  });
  const calls = data?.calls ?? [];
  const me = data?.me;
  const { data: staff = [] } = useQuery<Person[]>({
    queryKey: [STAFF], queryFn: () => apiRequest("GET", STAFF).then((r) => r.json()), enabled: isStaff && !!me?.canManage && calls.some((c) => !c.acceptedBy),
  });

  // Rings for the calls this person is meant to answer: everyone's until a manager picks someone.
  const isRinging = calls.some((c) => !c.acceptedBy && (!c.assignedTo || c.assignedTo.id === me?.id));
  useEffect(() => {
    if (!isRinging) return;
    const ring = () => { navigator.vibrate?.(VIBRATION); beep(); };
    ring();
    const timer = setInterval(ring, RING_EVERY_MS);
    return () => { clearInterval(timer); navigator.vibrate?.(0); };
  }, [isRinging]);

  // The screen changes at once (so a button cannot be tapped twice); the server's list follows.
  const act = useMutation({
    mutationFn: (v: { id: string; action: "accept" | "done" | "assign"; userId?: string }) => apiRequest("POST", `${CALLS}/${v.id}/${v.action}`, v.action === "assign" ? { userId: v.userId } : {}).then(async (r) => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || "Failed"); return r.json(); }),
    onMutate: (v) => {
      qc.setQueryData<CallsReply>([CALLS], (old) => old && {
        ...old,
        calls: v.action === "done" ? old.calls.filter((c) => c.id !== v.id)
          : old.calls.map((c) => c.id !== v.id ? c : v.action === "accept" ? { ...c, acceptedBy: { id: old.me.id, name: "…" } } : { ...c, assignedTo: v.userId ? { id: v.userId, name: staff.find((s) => s.id === v.userId)?.name ?? "…" } : undefined }),
      });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [CALLS] }),
  });

  if (!isStaff || calls.length === 0) return null;
  return (
    <div className="fixed inset-x-2 top-2 z-[70] max-h-[60vh] space-y-2 overflow-y-auto" aria-live="assertive">
      {calls.map((call) => {
        const isMine = !call.assignedTo || call.assignedTo.id === me?.id;
        const canAccept = !call.acceptedBy && (isMine || !!me?.canManage);
        const canFinish = !!call.acceptedBy && (call.acceptedBy.id === me?.id || !!me?.canManage);
        return (
          <div key={call.id} className={`rounded-2xl border p-3 shadow-2xl backdrop-blur ${call.acceptedBy ? "border-emerald-400/60 bg-emerald-950/95" : "border-orange-400/70 bg-orange-950/95"}`}>
            <div className="flex items-center gap-3">
              <BellRing className={`h-6 w-6 shrink-0 ${call.acceptedBy ? "text-emerald-300" : "animate-pulse text-orange-300"}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{t("pos.call.table", { t: call.table })}</p>
                <p className="truncate text-[11px] text-white/70">
                  {call.name} · {new Date(call.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {call.acceptedBy ? ` · ${t("hm.svc.attending", { n: call.acceptedBy.name })}` : call.assignedTo ? ` · ${t("hm.svc.assignedTo", { n: call.assignedTo.name })}` : ""}
                </p>
              </div>
              {canAccept && <button onClick={() => act.mutate({ id: call.id, action: "accept" })} className="shrink-0 rounded-xl bg-orange-400 px-4 py-2.5 text-sm font-black text-black">{t("hm.svc.accept")}</button>}
              {canFinish && <button onClick={() => act.mutate({ id: call.id, action: "done" })} className="shrink-0 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-black">{t("pos.call.done")}</button>}
            </div>
            {me?.canManage && !call.acceptedBy && (
              <select value={call.assignedTo?.id ?? ""} onChange={(e) => act.mutate({ id: call.id, action: "assign", userId: e.target.value })} aria-label={t("hm.svc.assign")} className="mt-2 w-full rounded-xl border border-white/20 bg-black/50 px-3 py-2.5 text-sm text-white">
                <option value="">{t("hm.svc.everyone")}</option>
                {staff.map((person) => <option key={person.id} value={person.id}>{t("hm.svc.send", { n: person.name })}</option>)}
              </select>
            )}
          </div>
        );
      })}
    </div>
  );
}
