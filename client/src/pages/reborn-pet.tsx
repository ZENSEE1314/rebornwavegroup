import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RebornLayout } from "@/components/RebornLayout";
import { useToast } from "@/hooks/use-toast";
import { PawPrint, Egg, HeartPulse, Pill, Clock, Check, Coins } from "lucide-react";
import petMale from "@assets/Doluruu Boy_1749664545355.png";
import petFemale from "@assets/doluruu-female-transparent.png";
import eggImg from "@assets/doluruu-blindbox-box.jpeg";

const WALK_CSS = `
@keyframes rwpetWalk { 0%{left:6%;transform:scaleX(1)} 48%{left:66%;transform:scaleX(1)} 50%{left:66%;transform:scaleX(-1)} 98%{left:6%;transform:scaleX(-1)} 100%{left:6%;transform:scaleX(1)} }
@keyframes rwpetBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
@keyframes rwpetPop { 0%{transform:scale(1)} 40%{transform:scale(1.18) rotate(-6deg)} 100%{transform:scale(1)} }
.rwpet-walker{position:absolute;bottom:14px;width:84px;height:84px;animation:rwpetWalk 8s linear infinite;}
.rwpet-inner{width:100%;height:100%;animation:rwpetBob 1.1s ease-in-out infinite;}
.rwpet-pop{animation:rwpetPop .5s ease;}
.rwpet-sleep{filter:brightness(.8) saturate(.7);}
`;

const STAT_META: Record<string, { label: string; color: string; emoji: string }> = {
  hunger: { label: "Hungry", color: "#f59e0b", emoji: "🍖" },
  happiness: { label: "Joy", color: "#ec4899", emoji: "🎾" },
  cleanliness: { label: "Clean", color: "#38bdf8", emoji: "🧼" },
  energy: { label: "Energy", color: "#22c55e", emoji: "⚡" },
};

export default function RebornPet() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [code, setCode] = useState("");

  const { data: pets = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/reborn/pets"],
    queryFn: () => apiRequest("GET", "/api/reborn/pets").then((r) => r.json()),
    refetchInterval: 60000,
  });
  const { data: pills } = useQuery<{ available: number }>({
    queryKey: ["/api/reborn/pills"],
    queryFn: () => apiRequest("GET", "/api/reborn/pills").then((r) => r.json()),
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["/api/reborn/pets"] });
    qc.invalidateQueries({ queryKey: ["/api/reborn/pills"] });
    qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
  };

  const activate = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/activate", { code: code.trim() }).then((r) => r.json()),
    onSuccess: (d) => { toast({ title: "Pet activated!", description: d.message }); setCode(""); refresh(); },
    onError: (e: any) => toast({ title: "Couldn't activate", description: e.message, variant: "destructive" }),
  });
  const act = useMutation({
    mutationFn: (v: { petId: number; action: string }) => apiRequest("POST", "/api/reborn/action", v).then((r) => r.json()),
    onSuccess: (d) => { if (d.tokenAwarded) toast({ title: "Token earned! 🎉", description: d.message }); refresh(); },
    onError: (e: any) => toast({ title: "Can't do that", description: e.message, variant: "destructive" }),
  });
  const usePill = useMutation({
    mutationFn: (petId: number) => apiRequest("POST", "/api/reborn/use-pill", { petId }).then((r) => r.json()),
    onSuccess: (d) => { toast({ title: "Revived!", description: d.message }); refresh(); },
    onError: (e: any) => toast({ title: "Can't revive", description: e.message, variant: "destructive" }),
  });

  const canAddMore = pets.filter((p) => p.lifeStatus !== "dead").length < 2;

  return (
    <RebornLayout active="/pet" title="PET CARE">
      <style dangerouslySetInnerHTML={{ __html: WALK_CSS }} />

      {canAddMore && (
        <div className="rounded-3xl p-5 mb-4 border border-white/10 bg-white/5">
          <div className="flex items-center gap-2 mb-2"><PawPrint className="w-5 h-5 text-rose-400" /><h2 className="font-bold">Activate a pet</h2></div>
          <p className="text-sm text-white/60 mb-3">Enter the code on your blindbox package (you can keep up to 2 pets).</p>
          <div className="flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="RW-XXXXXX"
              className="flex-1 px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60 uppercase tracking-wider" />
            <button onClick={() => activate.mutate()} disabled={!code.trim() || activate.isPending} className="px-5 py-3 rounded-xl font-bold text-black disabled:opacity-50" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>
              {activate.isPending ? "..." : "Activate"}
            </button>
          </div>
        </div>
      )}

      {isLoading && <p className="text-white/50 text-center py-8">Loading your pets…</p>}
      {!isLoading && pets.length === 0 && (
        <div className="text-center py-10 text-white/50"><PawPrint className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No pets yet. Activate a package code above.</p></div>
      )}

      <div className="space-y-4">
        {pets.map((pet) => (
          <PetCard key={pet.id} pet={pet}
            onAction={(action: string) => act.mutate({ petId: pet.id, action })} busy={act.isPending}
            onPill={() => usePill.mutate(pet.id)} pilling={usePill.isPending} pillsAvailable={pills?.available || 0} />
        ))}
      </div>
    </RebornLayout>
  );
}

function PetCard({ pet, onAction, busy, onPill, pilling, pillsAvailable }: any) {
  const img = pet.isEgg ? eggImg : pet.gender === "female" ? petFemale : petMale;
  const sick = pet.lifeStatus === "sick";
  const [pop, setPop] = useState(false);
  const poke = () => { setPop(true); setTimeout(() => setPop(false), 500); if (!sick && !pet.isEgg) onAction("play"); };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold">{pet.name}</h3>
          {pet.isEgg ? <Badge color="#fb7185"><Egg className="w-3 h-3" /> Egg</Badge>
            : sick ? <Badge color="#ef4444"><HeartPulse className="w-3 h-3" /> Sick</Badge>
            : <Badge color="#22c55e"><Check className="w-3 h-3" /> Healthy</Badge>}
        </div>
        {!pet.isEgg && <span className="text-xs text-white/50 flex items-center gap-1"><Clock className="w-3 h-3" /> {pet.daysLeft}d left</span>}
      </div>

      {/* the room */}
      <div className="relative mx-4 mt-3 rounded-2xl overflow-hidden" style={{ height: 150, background: "linear-gradient(180deg,#241a3f 0%,#1a1230 70%,#120c22 100%)" }}>
        <div className="absolute inset-x-0 bottom-0 h-6" style={{ background: "rgba(255,255,255,0.05)", borderTop: "1px solid rgba(255,255,255,0.08)" }} />
        {pet.isEgg ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <img src={img} alt="egg" className="w-20 h-20 object-contain" style={{ animation: "rwpetBob 1.6s ease-in-out infinite" }} />
            <p className="text-xs text-white/60 flex items-center gap-1"><Clock className="w-3 h-3" /> Hatches in {pet.hatchDaysLeft} day(s)</p>
          </div>
        ) : (
          <button onClick={poke} className="rwpet-walker" style={sick ? { animationPlayState: "paused", left: "40%" } : pet.isSleeping ? { animationPlayState: "paused", left: "40%" } : undefined} aria-label="Poke your pet">
            <div className={`rwpet-inner ${pop ? "rwpet-pop" : ""} ${pet.isSleeping ? "rwpet-sleep" : ""}`}>
              <img src={img} alt={pet.name} className={`w-full h-full object-contain ${sick ? "grayscale opacity-70" : ""}`} draggable={false} />
            </div>
          </button>
        )}
        {pet.isSleeping && !pet.isEgg && <span className="absolute top-3 left-1/2 text-xl" style={{ animation: "rwpetBob 1.4s ease-in-out infinite" }}>💤</span>}
      </div>

      {/* body */}
      <div className="p-4">
        {pet.isEgg ? (
          <p className="text-sm text-white/60 text-center">Your egg will hatch into a brand-new pet you can raise for 15 more days.</p>
        ) : sick ? (
          <>
            <p className="text-sm text-white/60 mb-3">Your pet is sick and won't earn tokens. Visit us and spend 300,000 RP to get a free revival pill from staff.</p>
            <button onClick={onPill} disabled={pilling || pillsAvailable < 1} className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-white disabled:opacity-50" style={{ background: pillsAvailable > 0 ? "linear-gradient(90deg,#ef4444,#f97316)" : "rgba(255,255,255,0.08)" }}>
              <Pill className="w-4 h-4" /> {pillsAvailable > 0 ? "Use revival pill" : "No pill yet (visit + spend 300,000 RP)"}
            </button>
          </>
        ) : (
          <>
            {/* stat bars */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
              {(["hunger", "happiness", "cleanliness", "energy"] as const).map((k) => {
                const v = pet[k] ?? 0; const m = STAT_META[k];
                const c = v < 20 ? "#ef4444" : v < 50 ? "#f59e0b" : m.color;
                return (
                  <div key={k}>
                    <div className="flex justify-between text-[11px] mb-1"><span className="text-white/60">{m.emoji} {m.label}</span><span className="font-bold" style={{ color: c }}>{v}%</span></div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${v}%`, background: c }} /></div>
                  </div>
                );
              })}
            </div>

            {/* actions */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { a: "feed", label: "Feed", emoji: "🍖" },
                { a: "play", label: "Play", emoji: "🎾" },
                { a: "clean", label: "Clean", emoji: "🧼" },
                { a: pet.isSleeping ? "wake" : "sleep", label: pet.isSleeping ? "Wake" : "Sleep", emoji: pet.isSleeping ? "☀️" : "😴" },
              ].map((b) => (
                <button key={b.label} onClick={() => onAction(b.a === "wake" ? "play" : b.a)} disabled={busy}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all disabled:opacity-50">
                  <span className="text-xl">{b.emoji}</span><span className="text-[11px] font-semibold">{b.label}</span>
                </button>
              ))}
            </div>

            {/* token progress */}
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-white/50">Feeds today: {pet.feedsToday}/{pet.feedsNeeded}</span>
              <span className="text-amber-300 flex items-center gap-1"><Coins className="w-3 h-3" /> {pet.tokenEarnedToday ? "Token earned ✓" : "Feed 3× = 1 token"}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Badge({ children, color }: any) {
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: `${color}22`, color }}>{children}</span>;
}
