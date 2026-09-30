import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RebornLayout } from "@/components/RebornLayout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useTranslation, translate, localeTag } from "@/lib/i18n";
import { Search, Crown, X, Mic2, UserPlus, Bell, Plus, ArrowDownToLine, Coins, Camera, QrCode, CheckCircle2 } from "lucide-react";

const ANIM_CSS = `
@keyframes kgPop{0%{transform:scale(.2);opacity:0}40%{transform:scale(1.25);opacity:1}70%{transform:scale(.95)}100%{transform:scale(1);opacity:1}}
@keyframes kgFloat{0%{transform:translateY(90px) scale(.5);opacity:0}45%{opacity:1;transform:translateY(-14px) scale(1.12)}70%{transform:translateY(4px) scale(.97)}100%{transform:translateY(0) scale(1);opacity:1}}
@keyframes kgZoom{0%{transform:scale(3);opacity:0}30%{opacity:1}60%{transform:scale(1)}100%{transform:scale(1.05);opacity:1}}
@keyframes kgRainDrop{0%{transform:translateY(-120px);opacity:0}20%{opacity:1}100%{transform:translateY(340px);opacity:0}}
.kg-pop{animation:kgPop .7s cubic-bezier(.2,1.4,.4,1) both}
.kg-float{animation:kgFloat 1.6s ease-out both}
.kg-zoom{animation:kgZoom .8s ease-out both}
@keyframes kgFlash{0%{opacity:.95}100%{opacity:0}}
@keyframes kgSpin{to{transform:translate(-50%,-50%) rotate(360deg)}}
@keyframes kgRaysIn{from{opacity:0;transform:translate(-50%,-50%) scale(.3)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
@keyframes kgRing{0%{transform:translate(-50%,-50%) scale(.2);opacity:1}100%{transform:translate(-50%,-50%) scale(2.4);opacity:0}}
@keyframes kgBurst{0%{transform:translate(-50%,-50%) rotate(var(--a)) translateY(0) scale(.3);opacity:0}15%{opacity:1}100%{transform:translate(-50%,-50%) rotate(var(--a)) translateY(calc(-1 * var(--d))) scale(1.1) rotate(calc(-1 * var(--a)));opacity:0}}
@keyframes kgConfetti{0%{transform:translate(0,-10vh) rotate(0);opacity:1}100%{transform:translate(var(--x),110vh) rotate(calc(var(--r) + 720deg));opacity:.9}}
@keyframes kgBob{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-8px) rotate(2deg)}}
@keyframes kgGlow{0%,100%{filter:drop-shadow(0 0 18px rgba(247,215,116,.7)) drop-shadow(0 0 40px rgba(236,72,153,.45))}50%{filter:drop-shadow(0 0 30px rgba(247,215,116,1)) drop-shadow(0 0 60px rgba(236,72,153,.7))}}
@keyframes kgTitle{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}
@keyframes kgAmount{0%,100%{text-shadow:0 0 10px rgba(247,215,116,.6),0 0 24px rgba(243,181,47,.4)}50%{text-shadow:0 0 18px rgba(247,215,116,1),0 0 40px rgba(243,181,47,.8)}}
.kg-flash{position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,#fff,rgba(255,236,170,.6) 30%,transparent 65%);animation:kgFlash .7s ease-out forwards;pointer-events:none}
.kg-rays{position:absolute;left:50%;top:42%;width:170vmax;height:170vmax;transform:translate(-50%,-50%);pointer-events:none;
  background:repeating-conic-gradient(from 0deg,rgba(247,215,116,.20) 0deg 8deg,transparent 8deg 22deg);
  -webkit-mask-image:radial-gradient(circle,#000 0,transparent 45%);mask-image:radial-gradient(circle,#000 0,transparent 45%);
  animation:kgRaysIn .6s ease-out both,kgSpin 14s linear infinite}
.kg-ring{position:absolute;left:50%;top:50%;width:170px;height:170px;border-radius:50%;border:4px solid rgba(247,215,116,.9);box-shadow:0 0 30px rgba(247,215,116,.8),inset 0 0 30px rgba(236,72,153,.6);animation:kgRing 1s ease-out both;pointer-events:none}
.kg-burst{position:absolute;left:50%;top:50%;font-size:22px;animation:kgBurst 1.2s cubic-bezier(.15,.7,.3,1) both;pointer-events:none}
.kg-confetti{position:absolute;top:0;width:8px;height:14px;border-radius:2px;animation-name:kgConfetti;animation-timing-function:linear;animation-iteration-count:infinite;pointer-events:none;opacity:0;animation-fill-mode:both}
.kg-gift{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.kg-art,.kg-art-emoji{animation:kgBob 2.4s ease-in-out .9s infinite,kgGlow 1.8s ease-in-out infinite}
.kg-art-emoji{font-size:110px;line-height:1;display:inline-block}
.kg-art{box-shadow:0 0 0 3px rgba(247,215,116,.8),0 10px 40px rgba(0,0,0,.6)}
.kg-title{animation:kgTitle .6s cubic-bezier(.2,1.4,.4,1) .35s both;text-shadow:0 2px 0 rgba(0,0,0,.5),0 0 18px rgba(236,72,153,.6)}
.kg-amount{font-size:26px;font-weight:900;font-style:italic;color:#fff3c4;animation:kgAmount 1.6s ease-in-out infinite}
@media (prefers-reduced-motion: reduce){.kg-rays,.kg-burst,.kg-confetti,.kg-ring,.kg-flash{display:none}.kg-art,.kg-art-emoji{animation:none}}
`;
const fmt = (n: number) => (n || 0).toLocaleString(localeTag());
function nameOf(u: any) { return u?.username || u?.firstName || translate("vn.common.member"); }
function initials(u: any) { return (nameOf(u)[0] || "?").toUpperCase(); }
function Avatar({ u }: any) {
  return u?.photo ? <img src={u.photo} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
    : <span className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-black flex-shrink-0" style={{ background: "linear-gradient(135deg,#ec4899,#c9a84c)" }}>{initials(u)}</span>;
}

export default function RebornKos() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [target, setTarget] = useState<any>(null);
  const [modal, setModal] = useState<null | "buy" | "cashout">(null);
  const [showNotif, setShowNotif] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [venueOpen, setVenueOpen] = useState(false);
  const isAdmin = (user as any)?.role === "admin";
  const { t } = useTranslation();

  const checkIn = (code: string) => {
    apiRequest("POST", "/api/reborn/venue/checkin", { code }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || t("vn.kos.checkinFailed"));
      toast({ title: t("vn.kos.checkinDone"), description: data.message });
      qc.invalidateQueries({ queryKey: ["/api/reborn/kos/leaderboard"] });
      qc.invalidateQueries({ queryKey: ["/api/reborn/venue/status"] });
    }).catch((error) => toast({ title: t("vn.kos.checkinFailed"), description: error.message, variant: "destructive" }));
  };

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("venue");
    if (!code) return;
    window.history.replaceState({}, "", "/kos");
    checkIn(code);
  }, []);

  const { data: venue } = useQuery<any>({ queryKey: ["/api/reborn/venue/status"], queryFn: () => apiRequest("GET", "/api/reborn/venue/status").then((r) => r.json()), refetchInterval: 30000 });
  const { data: friendData } = useQuery<any>({ queryKey: ["/api/reborn/chat/friends"], queryFn: () => apiRequest("GET", "/api/reborn/chat/friends").then((r) => r.json()) });
  const friendIds = new Set<string>((friendData?.friends || []).map((f: any) => f.user?.id));
  const pendingIds = new Set<string>([...(friendData?.outgoing || []), ...(friendData?.incoming || [])].map((f: any) => f.user?.id));

  const { data: wallet } = useQuery<any>({ queryKey: ["/api/reborn/kos/wallet"], queryFn: () => apiRequest("GET", "/api/reborn/kos/wallet").then((r) => r.json()), refetchInterval: 20000 });
  const { data: board = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/kos/leaderboard"], queryFn: () => apiRequest("GET", "/api/reborn/kos/leaderboard").then((r) => r.json()), refetchInterval: 15000 });
  const { data: gifts = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/kos/gifttypes"], queryFn: () => apiRequest("GET", "/api/reborn/kos/gifttypes").then((r) => r.json()) });
  const { data: notifs = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/kos/notifications"], queryFn: () => apiRequest("GET", "/api/reborn/kos/notifications").then((r) => r.json()), refetchInterval: 12000 });
  const { data: results = [] } = useQuery<any[]>({
    queryKey: ["/api/reborn/kos/search", q],
    queryFn: () => q.trim().length >= 2 ? apiRequest("GET", `/api/reborn/kos/search?q=${encodeURIComponent(q.trim())}`).then((r) => r.json()) : Promise.resolve([]),
    enabled: q.trim().length >= 2,
  });

  useEffect(() => {
    if (notifs.length > 0) setShowNotif(true);
  }, [notifs.length]);

  const refreshWallet = () => { qc.invalidateQueries({ queryKey: ["/api/reborn/kos/wallet"] }); qc.invalidateQueries({ queryKey: ["/api/auth/user"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/kos/leaderboard"] }); };
  const gift = useMutation({
    mutationFn: (giftTypeId: number) => apiRequest("POST", "/api/reborn/kos/gift", { toUserId: target.id, giftTypeId }).then((r) => r.json()),
    onSuccess: (d) => { toast({ title: t("vn.kos.giftSent"), description: d.message }); setTarget(null); refreshWallet(); },
    onError: (e: any) => toast({ title: t("vn.kos.cantGift"), description: e.message, variant: "destructive" }),
  });
  const addFriend = useMutation({
    mutationFn: (toUserId: string) => apiRequest("POST", "/api/reborn/chat/request", { toUserId }).then((r) => r.json()),
    onSuccess: (d) => { toast({ title: d.message }); qc.invalidateQueries({ queryKey: ["/api/reborn/chat/friends"] }); },
    onError: (e: any) => toast({ title: t("vn.common.failed"), description: e.message, variant: "destructive" }),
  });

  return (
    <RebornLayout active="/kos" title={t("vn.kos.title")}>
      <style dangerouslySetInnerHTML={{ __html: ANIM_CSS }} />

      {/* Wallet */}
      <div className="kos-wallet mb-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="kos-lbl">{t("vn.kos.yourKgold")}</p>
            <div className="kos-num flex items-center gap-2"><span className="kos-coin">🪙</span> {fmt(wallet?.kgold ?? 0)}</div>
            <p className="mt-1 text-sm font-black text-amber-200/90" style={{ textShadow: "0 0 10px rgba(247,215,116,.45)" }}>{t("vn.kos.worthRp", { rp: fmt(Math.floor((wallet?.kgold ?? 0) / (wallet?.kgoldPerRp || 100))), cr: fmt(wallet?.credits ?? 0) })}</p>
            <p className="arc-badge">🎁 {t("vn.kos.receivedGifts", { n: fmt(wallet?.starsReceived ?? 0) })}</p>
          </div>
          <div className="flex items-center gap-2">
          <button onClick={() => setScanning(true)} title={t("vn.kos.scanVenueQr")} aria-label={t("vn.kos.scanVenueQr")} className="arc-btn" style={{ width: 40, height: 40 }}>
            <Camera className="w-5 h-5 text-amber-300" />
          </button>
          <button onClick={() => { setShowNotif(true); }} title={t("vn.kos.giftNotifs")} aria-label={t("vn.kos.giftNotifs")} className="arc-btn" style={{ width: 40, height: 40 }}>
            <Bell className="w-5 h-5 text-amber-300" />
            {notifs.length > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-[11px] font-black flex items-center justify-center shadow-[0_0_10px_rgba(244,63,94,.8)] animate-pulse">{notifs.length}</span>}
          </button>
          </div>
        </div>
        <div className="grid gap-2 mt-4" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <button onClick={() => setModal("buy")} className="arc-play justify-center" style={{ padding: "10px" }}><Plus className="w-4 h-4" /> {t("vn.kos.buyKgold")}</button>
          <button onClick={() => setModal("cashout")} className="kos-dark"><ArrowDownToLine className="w-4 h-4" /> {t("vn.kos.cashOut")}</button>
        </div>
        <p className="text-white/50 text-[11px] mt-2.5 text-center">{t("vn.kos.rateInfo", { per: wallet?.kgoldPerRp ?? 100, pct: 100 - (wallet?.feePercent ?? 30) })}</p>
      </div>

      {/* Venue check-in */}
      {venue && !venue.checkedIn && (
        <button onClick={() => setScanning(true)} className="arc-room-row kos-checkin w-full mb-4 text-left" style={{ ["--c1" as any]: "#f3b52f", ["--c" as any]: "#f3b52f" }}>
          <span className="arc-icon shrink-0" style={{ width: 46, height: 46, fontSize: 22, ["--c1" as any]: "#ffe89a", ["--c2" as any]: "#f3b52f" }}><span>📷</span></span>
          <span className="min-w-0"><span className="block font-black italic uppercase tracking-wide">{t("vn.kos.scanVenueQr")}</span><span className="block text-xs text-white/55">{t("vn.kos.scanHint")}</span></span>
        </button>
      )}
      {venue?.checkedIn && <p className="arc-badge mb-4" style={{ ["--c1" as any]: "#22c55e", marginTop: 0 }}><CheckCircle2 className="w-4 h-4" /> {t("vn.kos.checkedInToday")}</p>}
      {isAdmin && (
        <button onClick={() => setVenueOpen(true)} className="arc-room-row w-full mb-4 text-left" style={{ ["--c1" as any]: "#8b5cf6" }}>
          <span className="arc-icon shrink-0" style={{ width: 46, height: 46, fontSize: 22, ["--c1" as any]: "#a78bfa", ["--c2" as any]: "#6d28d9" }}><span><QrCode className="w-5 h-5 text-white" /></span></span>
          <span className="min-w-0"><span className="block font-black italic uppercase tracking-wide">{t("vn.kos.venueQr")} <span className="text-[10px] font-bold text-black bg-amber-300 rounded px-1.5 py-0.5 ml-1 align-middle">{t("vn.kos.admin")}</span></span><span className="block text-xs text-white/55">{t("vn.kos.showTodayQr")}</span></span>
        </button>
      )}

      {/* Search */}
      <div className="relative mb-5">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-pink-300 z-10" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("vn.kos.searchPh")} className="arc-input w-full placeholder-white/35" style={{ ["--c1" as any]: "#ec4899", paddingLeft: 38, paddingTop: 12, paddingBottom: 12, borderColor: "rgba(236,72,153,.4)" }} />
        {results.length > 0 && (
          <div className="absolute z-20 left-0 right-0 mt-2 rounded-2xl bg-[#160f2a] border border-pink-400/40 overflow-hidden shadow-2xl shadow-pink-500/20">
            {results.map((u) => (
              <button key={u.id} onClick={() => { setTarget(u); setQ(""); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left"><Avatar u={u} /><span className="text-sm">{nameOf(u)}</span></button>
            ))}
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="arc-panel" style={{ ["--c1" as any]: "#ec4899" }}>
      <h2 className="arc-head"><Crown className="w-4 h-4 text-amber-400" /> {t("vn.kos.ranking")}</h2>
      {board.length === 0 && <div className="text-center py-10 text-white/40"><Mic2 className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>{t("vn.kos.noGifts")}</p></div>}
      <div>
        {board.map((u, i) => {
          const top = ["#f3c14b", "#cbd5e1", "#d08a4f"][i];
          return (
          <div key={u.id} className={`arc-row ${top ? "arc-row-top" : ""}`} style={top ? { ["--rc" as any]: top } : undefined}>
            <span className="arc-medal">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</span>
            <Avatar u={u} />
            <div className="flex-1 min-w-0"><p className="font-bold truncate">{nameOf(u)}</p><p className="text-xs font-black text-amber-300" style={{ textShadow: "0 0 8px rgba(247,215,116,.5)" }}>🪙 {fmt(u.stars)}</p></div>
            {u.id === (user as any)?.id ? <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/60">{t("vn.kos.you")}</span> : <>{!friendIds.has(u.id) && !pendingIds.has(u.id) && <button onClick={() => addFriend.mutate(u.id)} title={t("vn.kos.addFriend")} aria-label={t("vn.kos.addAsFriend", { name: nameOf(u) })} className="kos-add"><UserPlus className="w-5 h-5" /></button>}{pendingIds.has(u.id) && <span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/60">{t("vn.kos.pending")}</span>}<button onClick={() => setTarget(u)} className="kos-gift">🎁 {t("vn.kos.gift")}</button></>}
          </div>
          );
        })}
      </div>
      </div>

      {/* Gift picker */}
      {target && (
        <Overlay onClose={() => setTarget(null)}>
          <div className="flex items-center gap-3 mb-4"><Avatar u={target} /><div><p className="font-bold">{nameOf(target)}</p><p className="text-xs text-white/50">🪙 {fmt(wallet?.kgold ?? 0)} KGOLD</p></div></div>
          <div className="grid gap-2.5 max-h-[46vh] overflow-y-auto p-0.5" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            {gifts.map((g) => (
              <button key={g.id} onClick={() => gift.mutate(g.id)} disabled={gift.isPending || (wallet?.kgold ?? 0) < g.kgoldCost} className="pet-item p-3 disabled:opacity-40">
                {g.imageUrl ? <img src={g.imageUrl} alt={g.name} className="w-10 h-10 object-contain" /> : <span className="text-3xl">{g.emoji}</span>}
                <span className="text-[11px] font-semibold text-center leading-tight">{g.name}</span>
                <span className="pet-price text-amber-200">🪙 {fmt(g.kgoldCost)}</span>
              </button>
            ))}
          </div>
          {!friendIds.has(target.id) && !pendingIds.has(target.id) && <button onClick={() => addFriend.mutate(target.id)} className="mt-4 w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 flex items-center justify-center gap-2 text-sm font-semibold"><UserPlus className="w-4 h-4" /> {t("vn.kos.addFriendChat")}</button>}
        </Overlay>
      )}

      {scanning && <VenueScanner onClose={() => setScanning(false)} onDetect={(code) => { setScanning(false); checkIn(code); }} />}
      {venueOpen && <Overlay onClose={() => setVenueOpen(false)}><VenueQr /></Overlay>}
      {modal === "buy" && <BuyModal wallet={wallet} onClose={() => setModal(null)} onDone={refreshWallet} onTopup={() => navigate("/?topup=1")} />}
      {modal === "cashout" && <CashoutModal wallet={wallet} onClose={() => setModal(null)} onDone={refreshWallet} />}
      {showNotif && <GiftInbox notifs={notifs} onClose={() => { setShowNotif(false); apiRequest("POST", "/api/reborn/kos/notifications/seen").then(() => qc.invalidateQueries({ queryKey: ["/api/reborn/kos/notifications"] })); }} />}
    </RebornLayout>
  );
}

// Live camera scanner for the venue check-in QR (encodes /kos?venue=CODE).
function VenueScanner({ onDetect, onClose }: { onDetect: (code: string) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let scanner: any; let cancelled = false; let done = false;
    (async () => {
      try {
        const QrScanner = (await import("qr-scanner")).default;
        if (!videoRef.current || cancelled) return;
        scanner = new QrScanner(videoRef.current, (result: any) => {
          const data = typeof result === "string" ? result : result?.data;
          if (!data || done) return;
          let code = data;
          try { code = new URL(data).searchParams.get("venue") || data; } catch { /* raw code, not a URL */ }
          done = true;
          try { scanner?.stop(); } catch {}
          onDetect(code);
        }, { returnDetailedScanResult: true, highlightScanRegion: true, preferredCamera: "environment" });
        await scanner.start();
      } catch (e: any) { setErr(e?.message || translate("vn.kos.cameraError")); }
    })();
    return () => { cancelled = true; try { scanner?.stop(); scanner?.destroy(); } catch {} };
  }, []);
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
      <video ref={videoRef} className="w-full max-w-sm rounded-2xl aspect-square object-cover bg-black" muted playsInline />
      <p className="text-white/70 text-sm mt-3 text-center">{t("vn.kos.pointAt")}</p>
      {err && <p className="text-red-400 text-sm mt-2 text-center max-w-sm">{err}</p>}
      <button onClick={onClose} className="mt-4 px-6 py-2.5 rounded-xl font-bold bg-white/10 text-white">{t("vn.common.cancel")}</button>
    </div>
  );
}

// Admin-only: today's venue QR and live check-in count.
function VenueQr() {
  const { t } = useTranslation();
  const { data } = useQuery<any>({ queryKey: ["/api/reborn/admin/venue/session"], queryFn: () => apiRequest("GET", "/api/reborn/admin/venue/session").then((r) => r.json()), refetchInterval: 5000 });
  return <div>
    <h3 className="font-bold text-lg flex items-center gap-2 pr-8"><QrCode className="w-5 h-5 text-amber-300" /> {t("vn.kos.dailyCheckin")}</h3>
    <p className="text-sm text-white/55 mt-1 mb-4">{t("vn.kos.dailyCheckinDesc")}</p>
    <div className="bg-white rounded-2xl p-3"><img src={`/api/reborn/admin/venue/qr?v=${encodeURIComponent(data?.code || "")}`} alt={t("vn.kos.dailyQrAlt")} className="w-full aspect-square" /></div>
    <div className="grid grid-cols-3 gap-2 mt-4 text-center">
      <div><p className="text-[11px] text-white/45">{t("vn.kos.today")}</p><p className="font-bold text-sm">{data?.day || "—"}</p></div>
      <div><p className="text-[11px] text-white/45">{t("vn.kos.checkedIn")}</p><p className="font-extrabold text-2xl text-amber-300">{data?.count ?? 0}</p></div>
      <div><p className="text-[11px] text-white/45">{t("vn.kos.code")}</p><p className="font-mono tracking-[0.2em] font-bold text-sm">{data?.code || "—"}</p></div>
    </div>
  </div>;
}

function Overlay({ children, onClose }: any) {
  return (
    <div className="kos-sheet fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="kos-sheet-box relative w-full sm:max-w-sm rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="arc-btn" style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32 }}><X className="w-4 h-4" /></button>
        {children}
      </div>
    </div>
  );
}

function BuyModal({ wallet, onClose, onDone, onTopup }: any) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const min = wallet?.minBuyKgold ?? 1000000;
  const per = wallet?.kgoldPerRp ?? 100;
  const [kg, setKg] = useState(min);
  const cost = kg / per;
  const insufficient = cost > Number(wallet?.credits || 0);
  const buy = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/kos/buy", { kgold: kg }).then((r) => r.json()),
    onSuccess: (d) => { toast({ title: d.message }); onDone(); onClose(); },
    onError: (e: any) => toast({ title: t("vn.common.failed"), description: e.message, variant: "destructive" }),
  });
  return (
    <Overlay onClose={onClose}>
      <h3 className="arc-title mb-1" style={{ ["--c1" as any]: "#ec4899" }}>{t("vn.kos.buyKgold")}</h3>
      <p className="text-sm text-white/60 mb-4">{t("vn.kos.buyRate", { per, min: fmt(min) })}</p>
      <input type="number" min={min} step={min} value={kg} onChange={(e) => setKg(Number(e.target.value))} className="arc-input w-full mb-2 font-black text-lg" style={{ ["--c1" as any]: "#f3b52f" }} />
      <p className="text-sm text-white/60 mb-4">{t("vn.kos.costLabel")} <b className="text-amber-300">RP {fmt(cost)}</b> {t("vn.kos.costFrom", { n: fmt(wallet?.credits ?? 0) })}</p>
      <button onClick={() => insufficient ? onTopup() : buy.mutate()} disabled={buy.isPending || kg < min} className="arc-play w-full justify-center disabled:opacity-50" style={{ padding: 12, fontSize: 13 }}>{insufficient ? t("vn.kos.topupToContinue") : t("vn.kos.buyN", { n: fmt(kg) })}</button>
    </Overlay>
  );
}

function CashoutModal({ wallet, onClose, onDone }: any) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const per = wallet?.kgoldPerRp ?? 100;
  const bal = wallet?.kgold ?? 0;
  const minRp = wallet?.minCashoutRp ?? 1000;
  const rp = bal / per;
  const cash = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/kos/cashout", { kgold: bal }).then((r) => r.json()),
    onSuccess: (d) => { toast({ title: d.message }); onDone(); onClose(); },
    onError: (e: any) => toast({ title: t("vn.common.failed"), description: e.message, variant: "destructive" }),
  });
  return (
    <Overlay onClose={onClose}>
      <h3 className="arc-title mb-1" style={{ ["--c1" as any]: "#22c55e" }}>{t("vn.kos.cashoutTitle")}</h3>
      <p className="text-sm text-white/60 mb-4">{t("vn.kos.cashoutDesc", { rp: fmt(minRp), kg: fmt(minRp * per) })}</p>
      <div className="rounded-2xl bg-black/35 border border-amber-300/25 p-4 mb-4 text-center">
        <p className="kos-num" style={{ fontSize: 28 }}>🪙 {fmt(bal)}</p>
        <p className="text-white/60 text-sm">{t("vn.kos.eqCredits", { n: fmt(rp) })}</p>
      </div>
      <button onClick={() => cash.mutate()} disabled={cash.isPending || rp < minRp} className="pet-act w-full disabled:opacity-50" style={{ padding: 12, ["--c" as any]: "#22c55e", fontWeight: 900, fontStyle: "italic", textTransform: "uppercase", letterSpacing: ".06em" }}>{t("vn.kos.cashoutAll", { n: fmt(rp) })}</button>
      {rp < minRp && <p className="text-xs text-white/40 mt-2 text-center">{t("vn.kos.needMore")}</p>}
    </Overlay>
  );
}

// Counts a number up from 0 for the gift reveal.
function useCountUp(target: number, ms = 1200, key?: any) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const t0 = performance.now();
    const tick = (now: number) => { const p = Math.min(1, (now - t0) / ms); setV(Math.round(target * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, key]);
  return v;
}


// ── Special gift scenes ─────────────────────────────────────────────────────
// Picked by the gift's animation ("car" | "fireworks" | "crown" | "diamonds"),
// or automatically from its emoji / name so existing gifts get them too.
type Scene = "car" | "fireworks" | "crown" | "diamonds";
function sceneOf(g: any): Scene | null {
  const a = String(g?.animation || "");
  if (a === "car" || a === "fireworks" || a === "crown" || a === "diamonds") return a;
  const e = `${g?.emoji || ""} ${g?.giftName || ""}`;
  if (/🏎|🚗|🚙|🚘|sports ?car|\bcar\b/i.test(e)) return "car";
  if (/🎆|🎇|🧨|firework/i.test(e)) return "fireworks";
  if (/👑|crown/i.test(e)) return "crown";
  if (/💎|diamond/i.test(e)) return "diamonds";
  return null;
}
const reducedMotion = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };
// Where the gift text sits so it doesn't cover the scene.
const SCENE_TEXT: Record<Scene, CSSProperties> = {
  car: { top: "9%" }, fireworks: { bottom: "7%" }, crown: { bottom: "7%" }, diamonds: { top: "47%" },
};

function CarScene({ art }: { art: ReactNode }) {
  return (
    <div className="gs-car">
      <div className="gs-sky" />
      <div className="gs-moon">🌙</div>
      <div className="gs-city"><div className="gs-city-row">{Array.from({ length: 2 }).map((_, r) => <span key={r}>🏙️🏢🏬🌃🏙️🏢🏨🏬🏙️🏢🏬🌃</span>)}</div></div>
      <div className="gs-lamps">{Array.from({ length: 8 }).map((_, k) => <i key={k} style={{ left: `${k * 25}%` }} />)}</div>
      <div className="gs-road"><div className="gs-lane" /></div>
      <div className="gs-carbox">
        <div className="gs-speed">{Array.from({ length: 6 }).map((_, k) => <i key={k} style={{ top: `${15 + k * 13}%`, animationDelay: `${k * 0.09}s` }} />)}</div>
        <div className="gs-puff">💨</div>
        <div className="gs-beam" />
        <div className="gs-carart">{art}</div>
      </div>
    </div>
  );
}

const FW_COLORS = ["#ffd166", "#ff5d8f", "#7cf5ff", "#b388ff", "#8bff9c", "#ffffff", "#ff9f43"];
function Burst({ x, y, n, size, delay, loop }: { x: string; y: string; n: number; size: number; delay: number; loop?: boolean }) {
  return (
    <div className="gs-burst" style={{ left: x, top: y }}>
      <i className="gs-flash" style={{ animationDelay: `${delay}s`, animationIterationCount: loop ? "infinite" : 1 }} />
      {Array.from({ length: n }).map((_, k) => {
        const ang = (k / n) * Math.PI * 2, d = size * (0.75 + (k % 3) * 0.15);
        return <i key={k} className="gs-spark" style={{ ["--dx" as any]: `${Math.cos(ang) * d}px`, ["--dy" as any]: `${Math.sin(ang) * d}px`,
          background: FW_COLORS[k % FW_COLORS.length], boxShadow: `0 0 8px ${FW_COLORS[k % FW_COLORS.length]}`,
          animationDelay: `${delay}s`, animationIterationCount: loop ? "infinite" : 1 }} />;
      })}
    </div>
  );
}
function FireworksScene({ art }: { art: ReactNode }) {
  return (
    <div className="gs-fw">
      <div className="gs-fw-sky" />
      <div className="gs-rocket" />
      <Burst x="50%" y="26%" n={44} size={150} delay={1.15} />
      <Burst x="22%" y="18%" n={26} size={80} delay={1.9} loop />
      <Burst x="78%" y="22%" n={26} size={90} delay={2.4} loop />
      <Burst x="35%" y="40%" n={20} size={70} delay={3.1} loop />
      <Burst x="68%" y="12%" n={20} size={70} delay={3.6} loop />
      <div className="gs-fw-gift">{art}</div>
    </div>
  );
}

function CrownScene({ art }: { art: ReactNode }) {
  return (
    <div className="gs-crown">
      <div className="gs-throne-glow" />
      <div className="gs-king"><span>🧔</span><i className="gs-robe" /></div>
      <div className="gs-hand">🫴</div>
      <div className="gs-crownart">{art}</div>
      <div className="gs-crown-rays" />
      {Array.from({ length: 8 }).map((_, k) => <span key={k} className="gs-glint" style={{ left: `${50 + Math.cos(k * 0.785) * 22}%`, top: `${40 + Math.sin(k * 0.785) * 12}%`, animationDelay: `${2.5 + (k % 4) * 0.25}s` }}>✨</span>)}
    </div>
  );
}

function DiamondsScene({ art }: { art: ReactNode }) {
  return (
    <div className="gs-dia">
      <div className="gs-dia-sky" />
      {Array.from({ length: 42 }).map((_, k) => (
        <span key={k} className="gs-drop" style={{ left: `${(k * 23 + 4) % 96}%`, fontSize: 18 + (k % 4) * 6,
          ["--land" as any]: `${80 + (k % 5) * 2.4}vh`, ["--rot" as any]: `${(k * 47) % 60 - 30}deg`,
          animationDelay: `${(k % 14) * 0.12 + Math.floor(k / 14) * 0.25}s` }}>💎</span>
      ))}
      <div className="gs-ground" />
      <div className="gs-bigdia">{art}</div>
      <div className="gs-bigdia-ring" />
      {Array.from({ length: 6 }).map((_, k) => <span key={k} className="gs-glint" style={{ left: `${50 + Math.cos(k * 1.05) * 18}%`, top: `${24 + Math.sin(k * 1.05) * 8}%`, animationDelay: `${2.9 + k * 0.2}s` }}>✨</span>)}
    </div>
  );
}

function GiftScene({ kind, art }: { kind: Scene; art: ReactNode }) {
  if (kind === "car") return <CarScene art={art} />;
  if (kind === "fireworks") return <FireworksScene art={art} />;
  if (kind === "crown") return <CrownScene art={art} />;
  return <DiamondsScene art={art} />;
}

const CONFETTI = ["#f7d774", "#ec4899", "#a855f7", "#22d3ee", "#34d399", "#fb7185", "#fff"];
function GiftInbox({ notifs, onClose }: any) {
  const { t } = useTranslation();
  const [i, setI] = useState(0);
  const g = notifs[i];
  useEffect(() => { if (notifs.length === 0) onClose(); }, [notifs.length]);
  useEffect(() => { try { navigator.vibrate?.([60, 40, 120]); } catch {} }, [i]);
  const kg = Number(g?.recipientKgold || 0);
  const shown = useCountUp(kg, 1400, i);
  if (!g) return null;
  const animClass = g.animation === "float" ? "kg-float" : g.animation === "zoom" ? "kg-zoom" : "kg-pop";
  const next = () => (i < notifs.length - 1 ? setI(i + 1) : onClose());
  // Bigger gifts get a bigger show.
  const tier = kg >= 1_000_000 ? 3 : kg >= 100_000 ? 2 : 1;
  const burst = 10 + tier * 8, confetti = 18 + tier * 14;
  const art = g.imageUrl ? <img src={g.imageUrl} alt="" className="kg-art w-36 h-36 object-cover rounded-3xl mx-auto" /> : <span className="kg-art-emoji">{g.emoji || "🎁"}</span>;
  const scene = reducedMotion() ? null : sceneOf(g);
  if (scene) {
    const sceneArt = g.imageUrl ? <img src={g.imageUrl} alt="" className="gs-img" /> : <span className="gs-emoji">{g.emoji || "🎁"}</span>;
    return (
      <div className="kg-stage fixed inset-0 z-[60] overflow-hidden" onClick={next}>
        <div className="absolute inset-0 bg-black/90" />
        <div key={`scene-${i}`} className="absolute inset-0"><GiftScene kind={scene} art={sceneArt} /></div>
        <div key={`txt-${i}`} className="gs-text absolute inset-x-0 text-center px-6" style={SCENE_TEXT[scene]} onClick={(e) => e.stopPropagation()}>
          <p className="kg-title text-white text-xl font-black">{t("vn.kos.sentYou", { name: g.fromUsername || g.fromName || t("vn.kos.someone"), gift: g.giftName })}</p>
          <p className="kg-amount mt-2">🪙 +{fmt(shown)} KGOLD</p>
          <button onClick={next} className="arc-play arc-start mt-5 mx-auto px-8 justify-center" style={{ padding: "12px 32px", fontSize: 14 }}>{i < notifs.length - 1 ? t("vn.common.next") : t("vn.kos.awesome")}</button>
          {notifs.length > 1 && <p className="text-white/40 text-xs mt-2">{i + 1} / {notifs.length}</p>}
        </div>
      </div>
    );
  }
  return (
    <div className="kg-stage fixed inset-0 z-[60] flex items-center justify-center p-6 overflow-hidden" onClick={next}>
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
      <div key={`flash-${i}`} className="kg-flash" />
      <div key={`rays-${i}`} className="kg-rays" />
      {/* confetti rain */}
      {Array.from({ length: confetti }).map((_, k) => (
        <i key={`c-${i}-${k}`} className="kg-confetti" style={{ left: `${(k * 37) % 100}%`, background: CONFETTI[k % CONFETTI.length],
          animationDelay: `${(k % 12) * 0.12}s`, animationDuration: `${2.2 + (k % 5) * 0.35}s`, ["--r" as any]: `${(k * 53) % 360}deg`, ["--x" as any]: `${((k * 29) % 80) - 40}px` }} />
      ))}
      {g.animation === "rain" && Array.from({ length: 14 }).map((_, k) => (
        <span key={`r-${i}-${k}`} className="absolute text-3xl" style={{ left: `${(k * 7 + 4) % 95}%`, top: 0, animation: `kgRainDrop ${1 + (k % 5) * 0.3}s linear ${k * 0.1}s infinite` }}>{g.emoji || "🎁"}</span>
      ))}
      <div className="relative text-center" onClick={(e) => e.stopPropagation()}>
        <div className="relative mx-auto" style={{ width: 170, height: 170 }}>
          <div key={`ring-${i}`} className="kg-ring" />
          {/* burst of gift copies + sparkles flying out */}
          {Array.from({ length: burst }).map((_, k) => (
            <span key={`b-${i}-${k}`} className="kg-burst" style={{ ["--a" as any]: `${(360 / burst) * k}deg`, ["--d" as any]: `${110 + (k % 3) * 45}px`, animationDelay: `${0.15 + (k % 4) * 0.05}s` }}>
              {k % 3 === 0 ? (g.emoji || "✨") : k % 3 === 1 ? "✨" : "⭐"}
            </span>
          ))}
          <div key={`g-${i}`} className={`kg-gift ${animClass}`}>{art}</div>
        </div>
        <p key={`t-${i}`} className="kg-title text-white text-xl font-black mt-5 px-2">{t("vn.kos.sentYou", { name: g.fromUsername || g.fromName || t("vn.kos.someone"), gift: g.giftName })}</p>
        <p className="kg-amount mt-2">🪙 +{fmt(shown)} KGOLD</p>
        <button onClick={next} className="arc-play arc-start mt-6 mx-auto px-8 justify-center" style={{ padding: "12px 32px", fontSize: 14 }}>{i < notifs.length - 1 ? t("vn.common.next") : t("vn.kos.awesome")}</button>
        {notifs.length > 1 && <p className="text-white/40 text-xs mt-2">{i + 1} / {notifs.length}</p>}
      </div>
    </div>
  );
}
