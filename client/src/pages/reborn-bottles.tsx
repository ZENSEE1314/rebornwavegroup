import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RebornLayout } from "@/components/RebornLayout";
import { Wine, Beer, Clock, AlertTriangle } from "lucide-react";

interface Bottle { id: number; type: string; name: string; quantity: number; photoUrl?: string; daysLeft: number; expiringSoon: boolean; storedAt: string; }

export default function RebornBottles() {
  const { data: bottles = [] } = useQuery<Bottle[]>({
    queryKey: ["/api/reborn/bottles"],
    queryFn: () => apiRequest("GET", "/api/reborn/bottles").then((r) => r.json()),
    refetchInterval: 30000,
  });
  const soon = bottles.filter((b) => b.expiringSoon);

  return (
    <RebornLayout active="/bottles" title="BOTTLE KEEP">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c" }}><Wine className="w-5 h-5" /></span>
        <div><h1 className="text-xl font-extrabold leading-none">Your kept bottles</h1><p className="text-sm text-white/50">Come finish them within 30 days</p></div>
      </div>

      {soon.length > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-100">You have {soon.length} bottle(s) expiring soon — come back before they're cleared!</p>
        </div>
      )}

      <div className="space-y-3">
        {bottles.map((b) => (
          <div key={b.id} className={`flex items-center gap-3 rounded-2xl border p-3 ${b.expiringSoon ? "border-amber-400/40 bg-amber-400/5" : "border-white/10 bg-white/5"}`}>
            {b.photoUrl
              ? <img src={b.photoUrl} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
              : <span className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">{b.type === "whisky" ? <Wine className="w-7 h-7 text-amber-300" /> : <Beer className="w-7 h-7 text-amber-300" />}</span>}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{b.name}</p>
              <p className="text-xs text-white/50 capitalize">{b.type} · {b.type === "beer" ? `${b.quantity} bottle(s) left` : "kept"}</p>
              <p className={`text-xs mt-1 flex items-center gap-1 ${b.daysLeft <= 5 ? "text-amber-300" : "text-white/50"}`}><Clock className="w-3 h-3" /> {b.daysLeft} day(s) left</p>
            </div>
          </div>
        ))}
      </div>
      {bottles.length === 0 && (
        <div className="text-center py-14 text-white/40">
          <Wine className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No bottles kept right now.</p>
          <p className="text-xs mt-1">Didn't finish your drink? Ask staff to keep it — up to 30 days.</p>
        </div>
      )}
    </RebornLayout>
  );
}
