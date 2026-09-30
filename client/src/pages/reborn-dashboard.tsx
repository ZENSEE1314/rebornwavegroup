import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RebornLayout, MENU_ITEMS } from "@/components/RebornLayout";
import { useModules, moduleEnabled, NAV_MODULE } from "@/lib/modules";
import { useDisabledFeatures, featureForPath } from "@/lib/features";
import { OnboardingWalkthrough } from "@/components/OnboardingWalkthrough";
import { useTranslation, localeTag } from "@/lib/i18n";
import {
  PawPrint, Disc3, Gift, Calendar, Trophy, Music, Users, Headphones, User,
  Coins, Star, DollarSign, HelpCircle, Shield, ChevronRight, Plus, Megaphone, X,
  Utensils, Store, Wine, Mic2, ReceiptText, Gamepad2,
} from "lucide-react";

const TILES = [
  { label: "hm.tile.petCare", desc: "hm.tile.petCareDesc", icon: <PawPrint className="w-6 h-6" />, path: "/pet", color: "#fb7185" },
  { label: "hm.tile.order", desc: "hm.tile.orderDesc", icon: <Utensils className="w-6 h-6" />, path: "/order", color: "#4ecdc4" },
  { label: "hm.tile.bottles", desc: "hm.tile.bottlesDesc", icon: <Wine className="w-6 h-6" />, path: "/bottles", color: "#c9a84c" },
  { label: "hm.tile.spin", desc: "hm.tile.spinDesc", icon: <Disc3 className="w-6 h-6" />, path: "/spin", color: "#c9a84c" },
  { label: "hm.tile.games", desc: "hm.tile.gamesDesc", icon: <Gamepad2 className="w-6 h-6" />, path: "/games", color: "#f59e0b" },
  { label: "hm.tile.prizes", desc: "hm.tile.prizesDesc", icon: <Gift className="w-6 h-6" />, path: "/spin?tab=prizes", color: "#22c55e" },
  { label: "hm.tile.bookings", desc: "hm.tile.bookingsDesc", icon: <Calendar className="w-6 h-6" />, path: "/bookings", color: "#4ecdc4" },
  { label: "hm.tile.loyalty", desc: "hm.tile.loyaltyDesc", icon: <Trophy className="w-6 h-6" />, path: "/loyalty-program", color: "#a855f7" },
  { label: "hm.tile.kos", desc: "hm.tile.kosDesc", icon: <Mic2 className="w-6 h-6" />, path: "/kos", color: "#ec4899" },
  { label: "hm.tile.songs", desc: "hm.tile.songsDesc", icon: <Music className="w-6 h-6" />, path: "/songs", color: "#8b5cf6" },
  { label: "hm.tile.referrals", desc: "hm.tile.referralsDesc", icon: <Users className="w-6 h-6" />, path: "/my-referral", color: "#6366f1" },
  { label: "hm.tile.support", desc: "hm.tile.supportDesc", icon: <Headphones className="w-6 h-6" />, path: "/support", color: "#45b7d1" },
  { label: "hm.tile.profile", desc: "hm.tile.profileDesc", icon: <User className="w-6 h-6" />, path: "/profile", color: "#94a3b8" },
  { label: "hm.tile.history", desc: "hm.tile.historyDesc", icon: <ReceiptText className="w-6 h-6" />, path: "/history", color: "#f0d787" },
];

// Must match MAX_TOPUP_RP on the server.
const MAX_TOPUP = 1_000_000_000;

function formatRp(n: number) { return "RP " + (n || 0).toLocaleString(localeTag()); }

export default function RebornDashboard() {
  const [, navigate] = useLocation();
  const modules = useModules();
  const featuresOff = useDisabledFeatures();
  const { user } = useAuth();
  const { t } = useTranslation();
  const isAdmin = (user as any)?.role === "admin" || (user as any)?.role === "staff";
  const [showTour, setShowTour] = useState(() => {
    try { return !localStorage.getItem("onboarding-completed"); } catch { return true; }
  });
  const closeTour = () => { try { localStorage.setItem("onboarding-completed", "true"); } catch {} setShowTour(false); };
  const [showTopup, setShowTopup] = useState(() => new URLSearchParams(window.location.search).get("topup") === "1");

  const { data: pets = [] } = useQuery<any[]>({
    queryKey: ["/api/reborn/pets"],
    queryFn: () => apiRequest("GET", "/api/reborn/pets").then((r) => r.json()),
  });
  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/reborn/events"],
    queryFn: () => apiRequest("GET", "/api/reborn/events").then((r) => r.json()),
  });
  const { data: bottles = [] } = useQuery<any[]>({
    queryKey: ["/api/reborn/bottles"],
    queryFn: () => apiRequest("GET", "/api/reborn/bottles").then((r) => r.json()),
  });
  const expiringBottles = bottles.filter((b) => b.expiringSoon).length;
  const livePet = pets.find((p) => !p.isEgg && p.lifeStatus === "active");
  const firstName = (user as any)?.firstName || t("hm.dash.there");

  return (
    <RebornLayout active="/">
      {showTour && <OnboardingWalkthrough isOpen={showTour} onClose={closeTour} onComplete={closeTour} />}

      {/* Welcome + balances */}
      <div className="home-hero mb-4">
        <p className="home-hi">{t("dash.welcomeBack")}</p>
        <h1 className="home-name mb-4">{firstName} 👋</h1>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          {[
            { label: t("dash.credits"), value: formatRp(parseFloat((user as any)?.credits || "0")), icon: <DollarSign className="w-4 h-4" />, c: "#22c55e" },
            { label: t("dash.points"), value: (user as any)?.loyaltyPoints ?? 0, icon: <Star className="w-4 h-4" />, c: "#a855f7" },
            { label: t("dash.tokens"), value: (user as any)?.tokens ?? 0, icon: <Coins className="w-4 h-4" />, c: "#c9a84c" },
          ].map((b) => (
            <div key={b.label} className="home-stat" style={{ ["--c" as any]: b.c }}>
              <span className="ic">{b.icon}</span>
              <div className="v">{b.value}</div>
              <div className="l">{b.label}</div>
            </div>
          ))}
        </div>
        <button onClick={() => setShowTopup(true)} className="arc-play arc-start mt-3 w-full justify-center" style={{ padding: 12, fontSize: 13 }}>
          <Plus className="w-4 h-4" /> {t("dash.topUp")}
        </button>
      </div>

      {/* Bottle-keep reminder */}
      {expiringBottles > 0 && !featuresOff.has("bottles") && (
        <button onClick={() => navigate("/bottles")} className="arc-room-row w-full mb-4 text-left" style={{ ["--c1" as any]: "#f3b52f" }}>
          <Wine className="w-5 h-5 text-amber-300 flex-shrink-0" />
          <span className="text-sm text-amber-100">{expiringBottles} {t("dash.bottleReminder")}</span>
          <ChevronRight className="w-4 h-4 text-amber-300/60 ml-auto" />
        </button>
      )}

      {/* Events */}
      {events.length > 0 && (
        <div className="mb-4 space-y-2">
          {events.map((ev) => (
            <div key={ev.id} className="arc-panel" style={{ padding: 0, ["--c1" as any]: "#f59e0b" }}>
              {ev.imageUrl && <img src={ev.imageUrl} alt="" className="w-full h-32 object-cover" />}
              <div className="p-4 flex items-start gap-3">
                <span className="arc-icon shrink-0" style={{ width: 44, height: 44, fontSize: 20, ["--c1" as any]: "#fbbf24", ["--c2" as any]: "#ea580c" }}><span><Megaphone className="w-5 h-5 text-white" /></span></span>
                <div className="min-w-0 flex-1">
                <p className="arc-title" style={{ ["--c1" as any]: "#f59e0b", fontSize: 17 }}>{ev.title}</p>
                {ev.body && <p className="text-sm text-white/70 mt-1 whitespace-pre-line">{ev.body}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showTopup && <TopupModal onClose={() => setShowTopup(false)} />}

      {/* Pet quick status / CTA */}
      {!featuresOff.has("pet") && (
      <button onClick={() => navigate("/pet")} className="arc-tile w-full mb-4 text-left" style={{ ["--c1" as any]: "#fb7185", ["--c2" as any]: "#db2777" }}>
        <span className="arc-icon"><span><PawPrint className="w-7 h-7 text-white" /></span></span>
        <div className="flex-1 min-w-0">
          {livePet ? (
            <>
              <p className="arc-title" style={{ fontSize: 16 }}>{livePet.name} · {t("hm.dash.daysLeft", { n: livePet.daysLeft })}</p>
              <p className="text-sm text-white/60">{t("hm.dash.fedToday", { fed: livePet.feedsToday ?? livePet.feedsInCycle ?? 0, need: livePet.feedsNeeded })} {livePet.tokenEarnedToday ? t("hm.dash.tokenEarned") : t("hm.dash.feedForToken")}</p>
            </>
          ) : (
            <>
              <p className="arc-title" style={{ fontSize: 16 }}>{t("dash.activatePet")}</p>
              <p className="text-sm text-white/60">{t("dash.activatePetDesc")}</p>
            </>
          )}
        </div>
        <span className="arc-play"><ChevronRight className="w-4 h-4" /></span>
      </button>
      )}

      {/* All feature buttons */}
      <p className="arc-head">✨ {t("nav.allFeatures")}</p>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
        {[
          ...TILES.filter((tile) => moduleEnabled(modules, NAV_MODULE[tile.path]) && !featuresOff.has(featureForPath(tile.path) || "")).map((tile) => ({ key: tile.label, path: tile.path, icon: tile.icon, color: tile.color, title: t(tile.label), desc: t(tile.desc) })),
          ...(isAdmin ? [
            { key: "pos", path: "/pos", icon: <Store className="w-6 h-6" />, color: "#f0b429", title: t("nav.pos"), desc: t("hm.dash.posDesc") },
            { key: "admin", path: "/reborn-admin", icon: <Shield className="w-6 h-6" />, color: "#a855f7", title: t("hm.dash.admin"), desc: t("hm.dash.adminDesc") },
          ] : []),
        ].map((tile, i) => (
          <button key={tile.key} onClick={() => navigate(tile.path)} className="feat-tile" style={{ ["--c" as any]: tile.color, ["--d" as any]: `${(i % 6) * 0.8}s` }}>
            <span className="feat-badge">{tile.icon}</span>
            <span className="feat-title">{tile.title}</span>
            <span className="feat-desc">{tile.desc}</span>
          </button>
        ))}
      </div>

      {/* Replay guide */}
      <button onClick={() => setShowTour(true)} className="arc-tile mt-5 w-full text-left" style={{ ["--c1" as any]: "#60a5fa", ["--c2" as any]: "#7c3aed" }}>
        <span className="arc-icon"><span><HelpCircle className="w-7 h-7 text-white" /></span></span>
        <span className="arc-title flex-1 min-w-0" style={{ fontSize: 16 }}>{t("dash.replayGuide")}</span>
        <span className="arc-play"><ChevronRight className="w-4 h-4" /></span>
      </button>
    </RebornLayout>
  );
}

function TopupModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const { t, language } = useTranslation();
  const qc = useQueryClient();
  const [amount, setAmount] = useState(100000);
  const [method, setMethod] = useState("cash");
  const submit = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/topup", { amount, paymentMethod: method }).then((r) => r.json()),
    onSuccess: (d) => { toast({ title: t("hm.topup.requestSent"), description: d.message }); qc.invalidateQueries({ queryKey: ["/api/reborn/topup/mine"] }); onClose(); },
    onError: (e: any) => toast({ title: t("hm.common.failed"), description: e.message, variant: "destructive" }),
  });
  const { data: mine = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/topup/mine"], queryFn: () => apiRequest("GET", "/api/reborn/topup/mine").then((r) => r.json()), refetchInterval: 12000 });
  return (
    <div className="kos-sheet fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="kos-sheet-box relative w-full sm:max-w-sm rounded-3xl p-6" style={{ borderColor: "rgba(247,215,116,.5)" }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="arc-btn" style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32 }}><X className="w-4 h-4" /></button>
        <h3 className="arc-title mb-1" style={{ ["--c1" as any]: "#f3b52f" }}>{t("hm.topup.title")}</h3>
        <p className="text-sm text-white/60 mb-4">{t("hm.topup.desc")}</p>
        <label className="text-xs text-white/60 block mb-1">{t("hm.topup.amount")}</label>
        <input type="number" min={10000} max={MAX_TOPUP} step={10000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="arc-input w-full mb-1 font-black text-lg" style={{ ["--c1" as any]: "#f3b52f" }} />
        <p className={`text-[11px] mb-3 ${amount > MAX_TOPUP ? "text-red-300 font-bold" : "text-white/45"}`}>{t("hm.topup.max", { n: MAX_TOPUP.toLocaleString(localeTag(language)) })}</p>
        <label className="text-xs text-white/60 block mb-1">{t("hm.topup.method")}</label>
        <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          {[{ v: "cash", l: t("hm.topup.cash") }, { v: "card", l: t("hm.topup.card") }].map((m) => (
            <button key={m.v} type="button" onClick={() => setMethod(m.v)} className={`pet-tab ${method === m.v ? "on" : "border border-white/10 bg-black/30"}`}>{m.l}</button>
          ))}
        </div>
        <button onClick={() => submit.mutate()} disabled={submit.isPending || amount < 10000 || amount > MAX_TOPUP} className="arc-play w-full justify-center disabled:opacity-50" style={{ padding: 12, fontSize: 13 }}>{t("hm.topup.send")}</button>
        {mine.length > 0 && (
          <div className="mt-4 space-y-1">
            <p className="text-xs text-white/40">{t("hm.topup.recent")}</p>
            {mine.slice(0, 4).map((r) => (
              <div key={r.id} className="flex justify-between text-xs"><span>RP {Number(r.amount).toLocaleString(localeTag(language))}</span>
                <span className={r.status === "approved" ? "text-emerald-400" : r.status === "rejected" ? "text-red-400" : "text-amber-300"}>{t(`hm.status.${r.status}`)}</span></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
