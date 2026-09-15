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
@keyframes rwpetWalk{0%{left:8%}50%{left:60%}100%{left:8%}}
@keyframes rwpetFace{0%,49%{transform:scaleX(1)}50%,100%{transform:scaleX(-1)}}
@keyframes rwpetHop{0%,100%{transform:translateY(0) scaleY(1) scaleX(1)}20%{transform:translateY(-12px) scaleY(1.08) scaleX(.96)}45%{transform:translateY(0) scaleY(.9) scaleX(1.08)}60%{transform:translateY(-7px) scaleY(1.04)}}
@keyframes rwpetBreathe{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
@keyframes rwpetPop{0%{transform:scale(1) rotate(0)}35%{transform:scale(1.22) rotate(-9deg)}70%{transform:scale(.94) rotate(5deg)}100%{transform:scale(1) rotate(0)}}
@keyframes rwpetShadow{0%,100%{transform:translateX(-50%) scaleX(1);opacity:.4}30%{transform:translateX(-50%) scaleX(.6);opacity:.18}}
.rwpet-walker{position:absolute;bottom:26px;width:78px;height:78px;animation:rwpetWalk 9s ease-in-out infinite;cursor:pointer;}
.rwpet-shadow{position:absolute;left:50%;bottom:-8px;width:52px;height:11px;border-radius:50%;background:#000;filter:blur(3px);animation:rwpetShadow 1s ease-in-out infinite;}
.rwpet-face{width:100%;height:100%;animation:rwpetFace 9s steps(1) infinite;}
.rwpet-hop{width:100%;height:100%;animation:rwpetHop 1s ease-in-out infinite;transform-origin:bottom center;}
.rwpet-pop{animation:rwpetPop .55s ease !important;}
.rwpet-sleep .rwpet-hop{animation:rwpetBreathe 2.6s ease-in-out infinite;}
.rwpet-sleep img{filter:brightness(.82) saturate(.75);}
.rwpet-glow{position:absolute;left:50%;bottom:20px;width:120px;height:60px;transform:translateX(-50%);background:radial-gradient(ellipse,rgba(201,168,76,.18),transparent 70%);pointer-events:none;}
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
    refetchInterval: 15000, refetchOnWindowFocus: true,
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
  const poke = () => { setPop(true); setTimeout(() => setPop(false), 550); }; // reaction only — no energy cost

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
      <div className="relative mx-4 mt-3 rounded-2xl overflow-hidden" style={{ height: 172, background: "linear-gradient(180deg,#2a1f4d 0%,#1d1436 60%,#140d26 100%)" }}>
        {/* wall décor */}
        <div className="absolute left-4 top-4 w-16 h-14 rounded-lg border-2 border-white/15 overflow-hidden" style={{ background: "linear-gradient(180deg,#3b2f7a,#1b2a5a)" }}>
          <span className="absolute right-1 top-0.5 text-sm">🌙</span>
          <span className="absolute left-1.5 bottom-1 text-[9px] text-white/50">✦ ✧</span>
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/15" /><div className="absolute top-1/2 left-0 right-0 h-px bg-white/15" />
        </div>
        <span className="absolute right-5 top-4 text-2xl">🖼️</span>
        <span className="absolute left-1/2 -translate-x-1/2 top-1 text-lg">💡</span>
        {/* floor + rug */}
        <div className="absolute inset-x-0 bottom-0 h-10" style={{ background: "linear-gradient(180deg,#3a2c5e,#281d45)", borderTop: "2px solid rgba(255,255,255,0.12)" }} />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-7 w-32 h-3 rounded-[50%]" style={{ background: "radial-gradient(ellipse, rgba(201,168,76,0.35), transparent 70%)" }} />
        <span className="absolute right-3 bottom-9 text-2xl">🪴</span>
        <div className="rwpet-glow" />
        {pet.isEgg ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <img src={img} alt="egg" className="w-20 h-20 object-contain" style={{ animation: "rwpetBreathe 2.4s ease-in-out infinite" }} />
            <p className="text-xs text-white/70 flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3" /> Hatches in {pet.hatchDaysLeft} day(s)</p>
          </div>
        ) : (
          <button onClick={poke} className={`rwpet-walker ${pet.isSleeping || sick ? "rwpet-sleep" : ""}`} style={sick || pet.isSleeping ? { animationPlayState: "paused", left: "42%" } : undefined} aria-label="Play with your pet">
            <div className="rwpet-shadow" />
            <div className="rwpet-face" style={sick || pet.isSleeping ? { animation: "none" } : undefined}>
              <div className={`rwpet-hop ${pop ? "rwpet-pop" : ""}`}>
                <img src={img} alt={pet.name} className={`w-full h-full object-contain ${sick ? "grayscale opacity-70" : ""}`} draggable={false} />
              </div>
            </div>
          </button>
        )}
        {pet.isSleeping && !pet.isEgg && <span className="absolute left-1/2 top-4 text-xl" style={{ animation: "rwpetBreathe 1.6s ease-in-out infinite" }}>💤</span>}
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
            <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
              {[
                { a: "feed", label: "Feed", emoji: "🍖" },
                { a: "play", label: "Play", emoji: "🎾" },
                { a: "clean", label: "Clean", emoji: "🧼" },
                { a: pet.isSleeping ? "wake" : "sleep", label: pet.isSleeping ? "Wake" : "Sleep", emoji: pet.isSleeping ? "☀️" : "😴" },
              ].map((b) => (
                <button key={b.label} onClick={() => onAction(b.a)} disabled={busy || (b.a === "feed" && !pet.canFeed)}
                  className="flex flex-col items-center justify-center gap-0.5 py-2 min-w-0 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all disabled:opacity-40">
                  <span className="text-lg leading-none">{b.emoji}</span><span className="text-[10px] font-semibold truncate">{b.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-white/35 text-center mt-1.5">Tap your pet to play (free) · buttons use 10 energy · Sleep restores it</p>

            {/* daily token timer */}
            <div className="mt-3 rounded-xl bg-black/20 p-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-white/60 flex items-center gap-1"><Coins className="w-3 h-3 text-amber-400" /> Daily token</span>
                {pet.tokenEarnedToday ? <span className="text-emerald-400 font-bold">Earned ✓</span>
                  : pet.cycleActive ? <span className="text-amber-300 font-bold">⏳ {pet.cycleHoursLeft}h left</span>
                  : <span className="text-white/40">Feed to start the 24h timer</span>}
              </div>
              <div className="flex gap-1.5">
                {Array.from({ length: pet.feedsNeeded }).map((_, i) => (
                  <div key={i} className="flex-1 h-2 rounded-full" style={{ background: i < pet.feedsInCycle ? "#c9a84c" : "rgba(255,255,255,0.12)" }} />
                ))}
              </div>
              <p className="text-[11px] text-white/40 mt-1.5">
                {pet.tokenEarnedToday ? "Token claimed for this cycle — timer resets in " + pet.cycleHoursLeft + "h."
                  : pet.nextFeedMinutes > 0 ? `Not hungry yet — next feed in ${pet.nextFeedMinutes >= 60 ? Math.ceil(pet.nextFeedMinutes / 60) + "h" : pet.nextFeedMinutes + "m"} · ${pet.feedsInCycle}/${pet.feedsNeeded} feeds`
                  : `Feed now · ${pet.feedsInCycle}/${pet.feedsNeeded} feeds done within 24h`}
              </p>
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
