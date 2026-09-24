import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RebornLayout } from "@/components/RebornLayout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Search, Crown, X, Mic2, UserPlus, Bell, Plus, ArrowDownToLine, Coins } from "lucide-react";

const ANIM_CSS = `
@keyframes kgPop{0%{transform:scale(.2);opacity:0}40%{transform:scale(1.25);opacity:1}70%{transform:scale(.95)}100%{transform:scale(1);opacity:1}}
@keyframes kgFloat{0%{transform:translateY(60px) scale(.6);opacity:0}30%{opacity:1}100%{transform:translateY(-40px) scale(1.1);opacity:0}}
@keyframes kgZoom{0%{transform:scale(3);opacity:0}30%{opacity:1}60%{transform:scale(1)}100%{transform:scale(1.05);opacity:1}}
@keyframes kgRainDrop{0%{transform:translateY(-120px);opacity:0}20%{opacity:1}100%{transform:translateY(340px);opacity:0}}
.kg-pop{animation:kgPop .7s cubic-bezier(.2,1.4,.4,1) both}
.kg-float{animation:kgFloat 1.6s ease-out both}
.kg-zoom{animation:kgZoom .8s ease-out both}
`;
const fmt = (n: number) => (n || 0).toLocaleString("en-US");
function nameOf(u: any) { return u?.username || u?.firstName || "Member"; }
function initials(u: any) { return (nameOf(u)[0] || "?").toUpperCase(); }
function Avatar({ u }: any) {
  return u?.photo ? <img src={u.photo} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
    : <span className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-black flex-shrink-0" style={{ background: "linear-gradient(135deg,#ec4899,#c9a84c)" }}>{initials(u)}</span>;
}

export default function RebornKos() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [target, setTarget] = useState<any>(null);
  const [modal, setModal] = useState<null | "buy" | "cashout">(null);
  const [showNotif, setShowNotif] = useState(false);

  const { data: wallet } = useQuery<any>({ queryKey: ["/api/reborn/kos/wallet"], queryFn: () => apiRequest("GET", "/api/reborn/kos/wallet").then((r) => r.json()), refetchInterval: 20000 });
  const { data: board = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/kos/leaderboard"], queryFn: () => apiRequest("GET", "/api/reborn/kos/leaderboard").then((r) => r.json()), refetchInterval: 15000 });
  const { data: gifts = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/kos/gifttypes"], queryFn: () => apiRequest("GET", "/api/reborn/kos/gifttypes").then((r) => r.json()) });
  const { data: notifs = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/kos/notifications"], queryFn: () => apiRequest("GET", "/api/reborn/kos/notifications").then((r) => r.json()), refetchInterval: 12000 });
  const { data: results = [] } = useQuery<any[]>({
    queryKey: ["/api/reborn/kos/search", q],
    queryFn: () => q.trim().length >= 2 ? apiRequest("GET", `/api/reborn/kos/search?q=${encodeURIComponent(q.trim())}`).then((r) => r.json()) : Promise.resolve([]),
    enabled: q.trim().length >= 2,
  });

  const refreshWallet = () => { qc.invalidateQueries({ queryKey: ["/api/reborn/kos/wallet"] }); qc.invalidateQueries({ queryKey: ["/api/auth/user"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/kos/leaderboard"] }); };
  const gift = useMutation({
    mutationFn: (giftTypeId: number) => apiRequest("POST", "/api/reborn/kos/gift", { toUserId: target.id, giftTypeId }).then((r) => r.json()),
    onSuccess: (d) => { toast({ title: "Gift sent!", description: d.message }); setTarget(null); refreshWallet(); },
    onError: (e: any) => toast({ title: "Can't gift", description: e.message, variant: "destructive" }),
  });
  const addFriend = useMutation({
    mutationFn: (toUserId: string) => apiRequest("POST", "/api/reborn/chat/request", { toUserId }).then((r) => r.json()),
    onSuccess: (d) => toast({ title: d.message }),
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <RebornLayout active="/kos" title="KINGS OF SINGERS">
      <style dangerouslySetInnerHTML={{ __html: ANIM_CSS }} />

      {/* Wallet */}
      <div className="rounded-3xl p-5 mb-4 border border-white/10" style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.25), rgba(201,168,76,0.14))" }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/60 text-sm">Your KGOLD</p>
            <div className="text-3xl font-extrabold flex items-center gap-2">🪙 {fmt(wallet?.kgold ?? 0)}</div>
            <p className="text-white/50 text-xs mt-1">Received {fmt(wallet?.starsReceived ?? 0)} KGOLD in gifts</p>
          </div>
          <button onClick={() => { setShowNotif(true); }} className="relative w-10 h-10 rounded-full bg-black/25 flex items-center justify-center">
            <Bell className="w-5 h-5 text-amber-300" />
            {notifs.length > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-[11px] font-bold flex items-center justify-center">{notifs.length}</span>}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button onClick={() => setModal("buy")} className="py-2.5 rounded-xl font-bold text-black flex items-center justify-center gap-1.5" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}><Plus className="w-4 h-4" /> Buy KGOLD</button>
          <button onClick={() => setModal("cashout")} className="py-2.5 rounded-xl font-bold bg-black/25 border border-white/10 flex items-center justify-center gap-1.5"><ArrowDownToLine className="w-4 h-4" /> Cash out</button>
        </div>
        <p className="text-white/40 text-[11px] mt-2 text-center">{wallet?.kgoldPerRp ?? 100} KGOLD = 1 RP · gifts give the receiver {100 - (wallet?.feePercent ?? 30)}%</p>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a member by username…" className="w-full pl-9 pr-4 py-3 rounded-full bg-black/30 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60" />
        {results.length > 0 && (
          <div className="absolute z-20 left-0 right-0 mt-2 rounded-2xl bg-[#160f2a] border border-white/10 overflow-hidden shadow-2xl">
            {results.map((u) => (
              <button key={u.id} onClick={() => { setTarget(u); setQ(""); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left"><Avatar u={u} /><span className="text-sm">{nameOf(u)}</span></button>
            ))}
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3 px-1 flex items-center gap-2"><Crown className="w-4 h-4 text-amber-400" /> Ranking (KGOLD received)</h2>
      {board.length === 0 && <div className="text-center py-10 text-white/40"><Mic2 className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No gifts yet. Be the first!</p></div>}
      <div className="space-y-2">
        {board.map((u, i) => (
          <div key={u.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
            <span className={`w-7 text-center font-extrabold ${i === 0 ? "text-amber-300" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-400" : "text-white/40"}`}>{i + 1}</span>
            <Avatar u={u} />
            <div className="flex-1 min-w-0"><p className="font-semibold truncate">{nameOf(u)}</p><p className="text-xs text-amber-300">🪙 {fmt(u.stars)}</p></div>
            {u.id === (user as any)?.id ? <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/60">You</span> : <><button onClick={() => addFriend.mutate(u.id)} title="Add friend" aria-label={`Add ${nameOf(u)} as friend`} className="w-11 h-11 rounded-full bg-amber-400 border border-amber-200 shadow-lg flex items-center justify-center text-black"><UserPlus className="w-5 h-5" /></button><button onClick={() => setTarget(u)} className="px-4 py-2 rounded-full text-sm font-bold text-black" style={{ background: "linear-gradient(90deg,#ec4899,#c9a84c)" }}>Gift</button></>}
          </div>
        ))}
      </div>

      {/* Gift picker */}
      {target && (
        <Overlay onClose={() => setTarget(null)}>
          <div className="flex items-center gap-3 mb-4"><Avatar u={target} /><div><p className="font-bold">{nameOf(target)}</p><p className="text-xs text-white/50">🪙 {fmt(wallet?.kgold ?? 0)} KGOLD</p></div></div>
          <div className="grid grid-cols-3 gap-3 max-h-[46vh] overflow-y-auto">
            {gifts.map((g) => (
              <button key={g.id} onClick={() => gift.mutate(g.id)} disabled={gift.isPending || (wallet?.kgold ?? 0) < g.kgoldCost} className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40">
                {g.imageUrl ? <img src={g.imageUrl} alt={g.name} className="w-10 h-10 object-contain" /> : <span className="text-3xl">{g.emoji}</span>}
                <span className="text-[11px] font-semibold text-center leading-tight">{g.name}</span>
                <span className="text-[11px] text-amber-300">🪙 {fmt(g.kgoldCost)}</span>
              </button>
            ))}
          </div>
          <button onClick={() => addFriend.mutate(target.id)} className="mt-4 w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 flex items-center justify-center gap-2 text-sm font-semibold"><UserPlus className="w-4 h-4" /> Add friend to chat</button>
        </Overlay>
      )}

      {modal === "buy" && <BuyModal wallet={wallet} onClose={() => setModal(null)} onDone={refreshWallet} />}
      {modal === "cashout" && <CashoutModal wallet={wallet} onClose={() => setModal(null)} onDone={refreshWallet} />}
      {showNotif && <GiftInbox notifs={notifs} onClose={() => { setShowNotif(false); apiRequest("POST", "/api/reborn/kos/notifications/seen").then(() => qc.invalidateQueries({ queryKey: ["/api/reborn/kos/notifications"] })); }} />}
    </RebornLayout>
  );
}

function Overlay({ children, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-sm bg-[#160f2a] border border-white/10 rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><X className="w-4 h-4" /></button>
        {children}
      </div>
    </div>
  );
}

function BuyModal({ wallet, onClose, onDone }: any) {
  const { toast } = useToast();
  const min = wallet?.minBuyKgold ?? 1000000;
  const per = wallet?.kgoldPerRp ?? 100;
  const [kg, setKg] = useState(min);
  const buy = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/kos/buy", { kgold: kg }).then((r) => r.json()),
    onSuccess: (d) => { toast({ title: d.message }); onDone(); onClose(); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  return (
    <Overlay onClose={onClose}>
      <h3 className="text-xl font-extrabold mb-1">Buy KGOLD</h3>
      <p className="text-sm text-white/60 mb-4">{per} KGOLD = 1 RP · minimum {fmt(min)} KGOLD.</p>
      <input type="number" min={min} step={min} value={kg} onChange={(e) => setKg(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white mb-2" />
      <p className="text-sm text-white/60 mb-4">Cost: <b className="text-amber-300">RP {fmt(kg / per)}</b> from your credits (you have RP {fmt(wallet?.credits ?? 0)})</p>
      <button onClick={() => buy.mutate()} disabled={buy.isPending || kg < min} className="w-full py-3 rounded-xl font-bold text-black disabled:opacity-50" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>Buy {fmt(kg)} KGOLD</button>
    </Overlay>
  );
}

function CashoutModal({ wallet, onClose, onDone }: any) {
  const { toast } = useToast();
  const per = wallet?.kgoldPerRp ?? 100;
  const bal = wallet?.kgold ?? 0;
  const minRp = wallet?.minCashoutRp ?? 1000;
  const rp = bal / per;
  const cash = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/kos/cashout", { kgold: bal }).then((r) => r.json()),
    onSuccess: (d) => { toast({ title: d.message }); onDone(); onClose(); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  return (
    <Overlay onClose={onClose}>
      <h3 className="text-xl font-extrabold mb-1">Cash out KGOLD</h3>
      <p className="text-sm text-white/60 mb-4">Convert your KGOLD to RP credits. Minimum RP {fmt(minRp)} ({fmt(minRp * per)} KGOLD).</p>
      <div className="rounded-2xl bg-black/25 p-4 mb-4 text-center">
        <p className="text-2xl font-extrabold">🪙 {fmt(bal)}</p>
        <p className="text-white/60 text-sm">= RP {fmt(rp)} credits</p>
      </div>
      <button onClick={() => cash.mutate()} disabled={cash.isPending || rp < minRp} className="w-full py-3 rounded-xl font-bold text-black disabled:opacity-50" style={{ background: "linear-gradient(90deg,#22c55e,#86efac)" }}>Cash out all → RP {fmt(rp)}</button>
      {rp < minRp && <p className="text-xs text-white/40 mt-2 text-center">You need more KGOLD to reach the minimum.</p>}
    </Overlay>
  );
}

function GiftInbox({ notifs, onClose }: any) {
  const [i, setI] = useState(0);
  const g = notifs[i];
  useEffect(() => { if (notifs.length === 0) onClose(); }, [notifs.length]);
  if (!g) return null;
  const animClass = g.animation === "float" ? "kg-float" : g.animation === "zoom" ? "kg-zoom" : "kg-pop";
  const next = () => (i < notifs.length - 1 ? setI(i + 1) : onClose());
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" onClick={next}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      {g.animation === "rain" && Array.from({ length: 12 }).map((_, k) => (
        <span key={k} className="absolute text-3xl" style={{ left: `${(k * 8 + 5) % 95}%`, top: 0, animation: `kgRainDrop ${1 + (k % 5) * 0.3}s linear ${k * 0.1}s infinite` }}>{g.emoji || "🎁"}</span>
      ))}
      <div className="relative text-center" onClick={(e) => e.stopPropagation()}>
        <div key={i} className={animClass} style={{ fontSize: 96, lineHeight: 1 }}>
          {g.imageUrl ? <img src={g.imageUrl} alt="" className="w-32 h-32 object-contain mx-auto" /> : (g.emoji || "🎁")}
        </div>
        <p className="text-white text-lg font-extrabold mt-4">{g.fromUsername || g.fromName || "Someone"} sent you a {g.giftName}!</p>
        <p className="text-amber-300 font-bold mt-1">🪙 +{fmt(g.recipientKgold)} KGOLD</p>
        <button onClick={next} className="mt-6 px-8 py-2.5 rounded-full font-bold text-black" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>{i < notifs.length - 1 ? "Next" : "Awesome!"}</button>
        {notifs.length > 1 && <p className="text-white/40 text-xs mt-2">{i + 1} / {notifs.length}</p>}
      </div>
    </div>
  );
}
