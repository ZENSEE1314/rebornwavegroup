import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { RebornLayout } from "@/components/RebornLayout";
import { useToast } from "@/hooks/use-toast";
import { Search, Star, Crown, Coins, X, Music, UserPlus } from "lucide-react";

const GIFTS = [
  { type: "rose", emoji: "🌹", label: "Rose", cost: 1 },
  { type: "heart", emoji: "❤️", label: "Heart", cost: 5 },
  { type: "diamond", emoji: "💎", label: "Diamond", cost: 20 },
  { type: "crown", emoji: "👑", label: "Crown", cost: 50 },
];

function nameOf(u: any) { return u.username || u.firstName || "Member"; }
function initials(u: any) { return (nameOf(u)[0] || "?").toUpperCase(); }

export default function RebornKos() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const tokens = (user as any)?.tokens ?? 0;
  const [q, setQ] = useState("");
  const [target, setTarget] = useState<any>(null);

  const { data: board = [] } = useQuery<any[]>({
    queryKey: ["/api/reborn/kos/leaderboard"],
    queryFn: () => apiRequest("GET", "/api/reborn/kos/leaderboard").then((r) => r.json()),
    refetchInterval: 15000,
  });
  const { data: me } = useQuery<{ starsReceived: number }>({
    queryKey: ["/api/reborn/kos/me"],
    queryFn: () => apiRequest("GET", "/api/reborn/kos/me").then((r) => r.json()),
  });
  const { data: results = [] } = useQuery<any[]>({
    queryKey: ["/api/reborn/kos/search", q],
    queryFn: () => q.trim().length >= 2 ? apiRequest("GET", `/api/reborn/kos/search?q=${encodeURIComponent(q.trim())}`).then((r) => r.json()) : Promise.resolve([]),
    enabled: q.trim().length >= 2,
  });

  const gift = useMutation({
    mutationFn: (giftType: string) => apiRequest("POST", "/api/reborn/kos/gift", { toUserId: target.id, giftType }).then((r) => r.json()),
    onSuccess: (d) => {
      toast({ title: "Gift sent!", description: d.message });
      setTarget(null);
      qc.invalidateQueries({ queryKey: ["/api/reborn/kos/leaderboard"] });
      qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
      qc.invalidateQueries({ queryKey: ["/api/reborn/kos/me"] });
    },
    onError: (e: any) => toast({ title: "Can't gift", description: e.message, variant: "destructive" }),
  });
  const addFriend = useMutation({
    mutationFn: (toUserId: string) => apiRequest("POST", "/api/reborn/chat/request", { toUserId }).then((r) => r.json()),
    onSuccess: (d) => toast({ title: d.message }),
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <RebornLayout active="/kos" title="KINGS OF SINGERS">
      {/* Your fame */}
      <div className="rounded-3xl p-5 mb-4 border border-white/10 text-center" style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.25), rgba(201,168,76,0.12))" }}>
        <p className="text-white/60 text-sm">Your stars</p>
        <div className="text-3xl font-extrabold flex items-center justify-center gap-2"><Star className="w-6 h-6 text-amber-400" /> {me?.starsReceived ?? 0}</div>
        <p className="text-white/50 text-xs mt-1">Get gifted by other members to climb the ranking</p>
      </div>

      {/* Search + gift */}
      <div className="relative mb-5">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a member by username to gift…"
          className="w-full pl-9 pr-4 py-3 rounded-full bg-black/30 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60" />
        {results.length > 0 && (
          <div className="absolute z-20 left-0 right-0 mt-2 rounded-2xl bg-[#160f2a] border border-white/10 overflow-hidden shadow-2xl">
            {results.map((u) => (
              <button key={u.id} onClick={() => { setTarget(u); setQ(""); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left">
                <Avatar u={u} />
                <span className="text-sm">{nameOf(u)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3 px-1 flex items-center gap-2"><Crown className="w-4 h-4 text-amber-400" /> Ranking</h2>
      {board.length === 0 && <div className="text-center py-10 text-white/40"><Music className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No gifts yet. Be the first to send one!</p></div>}
      <div className="space-y-2">
        {board.map((u, i) => (
          <div key={u.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
            <span className={`w-7 text-center font-extrabold ${i === 0 ? "text-amber-300" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-400" : "text-white/40"}`}>{i + 1}</span>
            <Avatar u={u} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{nameOf(u)}</p>
              <p className="text-xs text-amber-300 flex items-center gap-1"><Star className="w-3 h-3" /> {u.stars}</p>
            </div>
            <button onClick={() => addFriend.mutate(u.id)} title="Add friend" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white"><UserPlus className="w-4 h-4" /></button>
            <button onClick={() => setTarget(u)} className="px-4 py-2 rounded-full text-sm font-bold text-black" style={{ background: "linear-gradient(90deg,#ec4899,#c9a84c)" }}>Gift</button>
          </div>
        ))}
      </div>

      {/* Gift modal */}
      {target && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setTarget(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full sm:max-w-sm bg-[#160f2a] border border-white/10 rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setTarget(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><X className="w-4 h-4" /></button>
            <div className="flex items-center gap-3 mb-4"><Avatar u={target} /><div><p className="font-bold">{nameOf(target)}</p><p className="text-xs text-white/50">Send a gift</p></div></div>
            <div className="flex items-center gap-1.5 mb-4 text-sm text-white/60"><Coins className="w-4 h-4 text-amber-400" /> You have <b className="text-amber-300">{tokens}</b> tokens</div>
            <div className="grid grid-cols-2 gap-3">
              {GIFTS.map((g) => (
                <button key={g.type} onClick={() => gift.mutate(g.type)} disabled={gift.isPending || tokens < g.cost}
                  className="flex flex-col items-center gap-1 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40">
                  <span className="text-3xl">{g.emoji}</span>
                  <span className="text-sm font-semibold">{g.label}</span>
                  <span className="text-xs text-amber-300 flex items-center gap-1"><Coins className="w-3 h-3" /> {g.cost}</span>
                </button>
              ))}
            </div>
            <button onClick={() => { addFriend.mutate(target.id); }} className="mt-4 w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 flex items-center justify-center gap-2 text-sm font-semibold">
              <UserPlus className="w-4 h-4" /> Add friend to chat
            </button>
          </div>
        </div>
      )}
    </RebornLayout>
  );
}

function Avatar({ u }: any) {
  return u.photo
    ? <img src={u.photo} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
    : <span className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-black flex-shrink-0" style={{ background: "linear-gradient(135deg,#ec4899,#c9a84c)" }}>{initials(u)}</span>;
}
