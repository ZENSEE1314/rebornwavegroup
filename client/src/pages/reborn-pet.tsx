import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RebornLayout } from "@/components/RebornLayout";
import { useToast } from "@/hooks/use-toast";
import { PawPrint, Utensils, Coins, Egg, HeartPulse, Pill, Clock, Check } from "lucide-react";
import petMale from "@assets/Doluruu Boy_1749664545355.png";
import petFemale from "@assets/doluruu-female-transparent.png";
import eggImg from "@assets/doluruu-blindbox-box.jpeg";

export default function RebornPet() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [code, setCode] = useState("");

  const { data: pets = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/reborn/pets"],
    queryFn: () => apiRequest("GET", "/api/reborn/pets").then((r) => r.json()),
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
  const feed = useMutation({
    mutationFn: (petId: number) => apiRequest("POST", "/api/reborn/feed", { petId }).then((r) => r.json()),
    onSuccess: (d) => { toast({ title: d.tokenAwarded ? "Token earned! 🎉" : "Yum!", description: d.message }); refresh(); },
    onError: (e: any) => toast({ title: "Can't feed", description: e.message, variant: "destructive" }),
  });
  const usePill = useMutation({
    mutationFn: (petId: number) => apiRequest("POST", "/api/reborn/use-pill", { petId }).then((r) => r.json()),
    onSuccess: (d) => { toast({ title: "Revived!", description: d.message }); refresh(); },
    onError: (e: any) => toast({ title: "Can't revive", description: e.message, variant: "destructive" }),
  });

  const hasPets = pets.length > 0;

  return (
    <RebornLayout active="/pet" title="PET CARE">
      {/* Activate a new pet */}
      <div className="rounded-3xl p-5 mb-4 border border-white/10 bg-white/5">
        <div className="flex items-center gap-2 mb-2"><PawPrint className="w-5 h-5 text-rose-400" /><h2 className="font-bold">Activate a pet</h2></div>
        <p className="text-sm text-white/60 mb-3">Bought a blindbox package? Enter the code on it to bring your Doluruu to life for 15 days.</p>
        <div className="flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="RW-XXXXXX"
            className="flex-1 px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60 uppercase tracking-wider" />
          <button onClick={() => activate.mutate()} disabled={!code.trim() || activate.isPending}
            className="px-5 py-3 rounded-xl font-bold text-black disabled:opacity-50" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>
            {activate.isPending ? "..." : "Activate"}
          </button>
        </div>
      </div>

      {isLoading && <p className="text-white/50 text-center py-8">Loading your pets…</p>}
      {!isLoading && !hasPets && (
        <div className="text-center py-10 text-white/50">
          <PawPrint className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No pets yet. Activate a package code above to start.</p>
        </div>
      )}

      <div className="space-y-4">
        {pets.map((pet) => <PetCard key={pet.id} pet={pet} onFeed={() => feed.mutate(pet.id)} feeding={feed.isPending} onPill={() => usePill.mutate(pet.id)} pilling={usePill.isPending} pillsAvailable={pills?.available || 0} />)}
      </div>
    </RebornLayout>
  );
}

function PetCard({ pet, onFeed, feeding, onPill, pilling, pillsAvailable }: any) {
  const img = pet.isEgg ? eggImg : pet.gender === "female" ? petFemale : petMale;
  const sick = pet.lifeStatus === "sick";

  return (
    <div className="rounded-3xl p-5 border border-white/10 bg-white/5">
      <div className="flex gap-4">
        <div className="w-24 h-24 rounded-2xl bg-black/25 flex items-center justify-center flex-shrink-0 overflow-hidden">
          <img src={img} alt={pet.name} className={`w-full h-full object-contain ${sick ? "grayscale opacity-60" : ""}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold truncate">{pet.name}</h3>
            {pet.isEgg ? <Badge color="#fb7185"><Egg className="w-3 h-3" /> Egg</Badge>
              : sick ? <Badge color="#ef4444"><HeartPulse className="w-3 h-3" /> Sick</Badge>
              : <Badge color="#22c55e"><Check className="w-3 h-3" /> Healthy</Badge>}
          </div>

          {pet.isEgg ? (
            <p className="text-sm text-white/60 mt-1 flex items-center gap-1"><Clock className="w-4 h-4" /> Hatches in {pet.hatchDaysLeft} day(s) into a new pet.</p>
          ) : sick ? (
            <p className="text-sm text-white/60 mt-1">Your pet is sick and won't earn tokens. Visit us and spend 300,000 RP to get a free revival pill from staff.</p>
          ) : (
            <>
              <p className="text-sm text-white/60 mt-1 flex items-center gap-1"><Clock className="w-4 h-4" /> {pet.daysLeft} day(s) of tokens left</p>
              {/* Feed progress */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                  <span>Feeds today</span>
                  <span>{pet.feedsToday}/{pet.feedsNeeded}{pet.tokenEarnedToday ? " · token earned ✓" : ""}</span>
                </div>
                <div className="flex gap-1.5">
                  {Array.from({ length: pet.feedsNeeded }).map((_, i) => (
                    <div key={i} className="flex-1 h-2 rounded-full" style={{ background: i < pet.feedsToday ? "#c9a84c" : "rgba(255,255,255,0.12)" }} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Action */}
      {!pet.isEgg && (
        <div className="mt-4">
          {sick ? (
            <button onClick={onPill} disabled={pilling || pillsAvailable < 1}
              className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-white disabled:opacity-50" style={{ background: pillsAvailable > 0 ? "linear-gradient(90deg,#ef4444,#f97316)" : "rgba(255,255,255,0.08)" }}>
              <Pill className="w-4 h-4" /> {pillsAvailable > 0 ? "Use revival pill" : "No pill yet (visit + spend 300,000 RP)"}
            </button>
          ) : (
            <button onClick={onFeed} disabled={feeding || !pet.canFeed}
              className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-black disabled:opacity-50" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>
              {pet.canFeed ? <><Utensils className="w-4 h-4" /> Feed ({pet.feedsToday}/{pet.feedsNeeded})</> : <><Check className="w-4 h-4" /> All fed today — come back tomorrow</>}
            </button>
          )}
          {!sick && (
            <p className="text-center text-xs text-white/40 mt-2 flex items-center justify-center gap-1">
              <Coins className="w-3 h-3 text-amber-400" /> Feed 3× a day = 1 token
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Badge({ children, color }: any) {
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: `${color}22`, color }}>{children}</span>;
}
