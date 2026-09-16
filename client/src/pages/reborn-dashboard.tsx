import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RebornLayout, MENU_ITEMS } from "@/components/RebornLayout";
import { OnboardingWalkthrough } from "@/components/OnboardingWalkthrough";
import { useTranslation } from "@/lib/i18n";
import {
  PawPrint, Disc3, Gift, Calendar, Trophy, Music, Users, Headphones, User,
  Coins, Star, DollarSign, HelpCircle, Shield, ChevronRight, Plus, Megaphone, X,
  Utensils, Store, Wine, Mic2,
} from "lucide-react";

const TILES = [
  { label: "Pet Care", desc: "Feed your Doluruu", icon: <PawPrint className="w-6 h-6" />, path: "/pet", color: "#fb7185" },
  { label: "Order to Table", desc: "Drinks & food to your seat", icon: <Utensils className="w-6 h-6" />, path: "/order", color: "#4ecdc4" },
  { label: "Bottle Keep", desc: "Your kept drinks", icon: <Wine className="w-6 h-6" />, path: "/bottles", color: "#c9a84c" },
  { label: "Spin & Win", desc: "Spend tokens for prizes", icon: <Disc3 className="w-6 h-6" />, path: "/spin", color: "#c9a84c" },
  { label: "My Prizes", desc: "Claim what you won", icon: <Gift className="w-6 h-6" />, path: "/spin?tab=prizes", color: "#22c55e" },
  { label: "Bookings", desc: "Reserve your visit", icon: <Calendar className="w-6 h-6" />, path: "/bookings", color: "#4ecdc4" },
  { label: "Loyalty", desc: "Rewards & perks", icon: <Trophy className="w-6 h-6" />, path: "/loyalty-program", color: "#a855f7" },
  { label: "Kings of Singers", desc: "Gift & rank", icon: <Mic2 className="w-6 h-6" />, path: "/kos", color: "#ec4899" },
  { label: "Song Request", desc: "Request & Top 500", icon: <Music className="w-6 h-6" />, path: "/songs", color: "#8b5cf6" },
  { label: "Referrals", desc: "Invite friends", icon: <Users className="w-6 h-6" />, path: "/my-referral", color: "#6366f1" },
  { label: "Support", desc: "Chat & FAQ", icon: <Headphones className="w-6 h-6" />, path: "/support", color: "#45b7d1" },
  { label: "Profile", desc: "Your account", icon: <User className="w-6 h-6" />, path: "/profile", color: "#94a3b8" },
];

function formatRp(n: number) { return "RP " + (n || 0).toLocaleString("en-US"); }

export default function RebornDashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const isAdmin = (user as any)?.role === "admin" || (user as any)?.role === "staff";
  const [showTour, setShowTour] = useState(() => {
    try { return !localStorage.getItem("onboarding-completed"); } catch { return true; }
  });
  const closeTour = () => { try { localStorage.setItem("onboarding-completed", "true"); } catch {} setShowTour(false); };
  const [showTopup, setShowTopup] = useState(false);

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
  const firstName = (user as any)?.firstName || "there";

  return (
    <RebornLayout active="/">
      {showTour && <OnboardingWalkthrough isOpen={showTour} onClose={closeTour} onComplete={closeTour} />}

      {/* Welcome + balances */}
      <div className="rounded-3xl p-5 mb-4 border border-white/10" style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.25), rgba(201,168,76,0.12))" }}>
        <p className="text-white/60 text-sm">{t("dash.welcomeBack")}</p>
        <h1 className="text-2xl font-extrabold mb-4">{firstName} 👋</h1>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: t("dash.credits"), value: formatRp(parseFloat((user as any)?.credits || "0")), icon: <DollarSign className="w-4 h-4" />, c: "#22c55e" },
            { label: t("dash.points"), value: (user as any)?.loyaltyPoints ?? 0, icon: <Star className="w-4 h-4" />, c: "#a855f7" },
            { label: t("dash.tokens"), value: (user as any)?.tokens ?? 0, icon: <Coins className="w-4 h-4" />, c: "#c9a84c" },
          ].map((b) => (
            <div key={b.label} className="rounded-2xl bg-black/25 p-3 text-center">
              <span className="inline-flex mb-1" style={{ color: b.c }}>{b.icon}</span>
              <div className="text-lg font-bold leading-none">{b.value}</div>
              <div className="text-[11px] text-white/50 mt-1">{b.label}</div>
            </div>
          ))}
        </div>
        <button onClick={() => setShowTopup(true)} className="mt-3 w-full py-2.5 rounded-xl font-bold text-black flex items-center justify-center gap-1.5" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>
          <Plus className="w-4 h-4" /> {t("dash.topUp")}
        </button>
      </div>

      {/* Bottle-keep reminder */}
      {expiringBottles > 0 && (
        <button onClick={() => navigate("/bottles")} className="w-full mb-4 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3 flex items-center gap-2 text-left">
          <Wine className="w-5 h-5 text-amber-300 flex-shrink-0" />
          <span className="text-sm text-amber-100">{expiringBottles} {t("dash.bottleReminder")}</span>
          <ChevronRight className="w-4 h-4 text-amber-300/60 ml-auto" />
        </button>
      )}

      {/* Events */}
      {events.length > 0 && (
        <div className="mb-4 space-y-2">
          {events.map((ev) => (
            <div key={ev.id} className="rounded-2xl border border-amber-400/25 overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.18), rgba(236,72,153,0.12))" }}>
              {ev.imageUrl && <img src={ev.imageUrl} alt="" className="w-full h-32 object-cover" />}
              <div className="p-4">
                <p className="font-bold flex items-center gap-2"><Megaphone className="w-4 h-4 text-amber-300" /> {ev.title}</p>
                {ev.body && <p className="text-sm text-white/70 mt-1 whitespace-pre-line">{ev.body}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showTopup && <TopupModal onClose={() => setShowTopup(false)} />}

      {/* Pet quick status / CTA */}
      <button onClick={() => navigate("/pet")} className="w-full rounded-2xl p-4 mb-4 border border-white/10 bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-3 text-left">
        <span className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(251,113,133,0.15)", color: "#fb7185" }}>
          <PawPrint className="w-6 h-6" />
        </span>
        <div className="flex-1 min-w-0">
          {livePet ? (
            <>
              <p className="font-bold">{livePet.name} · {livePet.daysLeft} days left</p>
              <p className="text-sm text-white/60">Fed {livePet.feedsToday}/{livePet.feedsNeeded} today {livePet.tokenEarnedToday ? "· token earned ✓" : "· feed 3× for a token"}</p>
            </>
          ) : (
            <>
              <p className="font-bold">{t("dash.activatePet")}</p>
              <p className="text-sm text-white/60">{t("dash.activatePetDesc")}</p>
            </>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-white/40" />
      </button>

      {/* All feature buttons */}
      <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3 px-1">{t("nav.allFeatures")}</h2>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
        {TILES.map((t) => (
          <button key={t.label} onClick={() => navigate(t.path)} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all">
            <span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${t.color}22`, color: t.color }}>{t.icon}</span>
            <span className="text-xs font-semibold text-center leading-tight">{t.label}</span>
            <span className="text-[10px] text-white/40 text-center leading-tight">{t.desc}</span>
          </button>
        ))}
        {isAdmin && (
          <button onClick={() => navigate("/pos")} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-amber-500/30 hover:bg-white/10 active:scale-95 transition-all">
            <span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(201,168,76,0.15)", color: "#f0d787" }}><Store className="w-6 h-6" /></span>
            <span className="text-xs font-semibold text-center">POS</span>
            <span className="text-[10px] text-white/40 text-center">Ring up sales</span>
          </button>
        )}
        {isAdmin && (
          <button onClick={() => navigate("/reborn-admin")} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-purple-500/30 hover:bg-white/10 active:scale-95 transition-all">
            <span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(168,85,247,0.15)", color: "#c084fc" }}><Shield className="w-6 h-6" /></span>
            <span className="text-xs font-semibold text-center">Admin</span>
            <span className="text-[10px] text-white/40 text-center">Manage everything</span>
          </button>
        )}
      </div>

      {/* Replay guide */}
      <button onClick={() => setShowTour(true)} className="mt-5 w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white/70 hover:text-white flex items-center justify-center gap-2 text-sm">
        <HelpCircle className="w-4 h-4" /> {t("dash.replayGuide")}
      </button>

      <WhatsAppFab />
    </RebornLayout>
  );
}

// Company WhatsApp — floating button on the home page. Pre-fills a greeting so the
// bot flow (server/whatsappBot.ts) can start capturing the contact into the CRM.
const WA_NUMBER = "6281336361314";
const WA_GREETING = "Hello";
function WhatsAppFab() {
  const href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_GREETING)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed right-4 z-40 flex items-center gap-2 rounded-full pl-3 pr-4 py-3 font-bold text-white shadow-lg active:scale-95 transition-transform"
      style={{ bottom: 84, background: "#25D366", boxShadow: "0 8px 24px rgba(37,211,102,0.45)" }}
    >
      <svg viewBox="0 0 32 32" width="24" height="24" fill="currentColor" aria-hidden="true">
        <path d="M16.003 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.26.6 4.46 1.73 6.4L3.2 28.8l6.6-1.73a12.74 12.74 0 0 0 6.2 1.6h.01c7.06 0 12.8-5.74 12.8-12.8s-5.74-12.67-12.8-12.67zm0 23.04h-.01a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-3.92 1.03 1.05-3.82-.25-.4a10.57 10.57 0 0 1-1.62-5.64c0-5.86 4.77-10.63 10.64-10.63 2.84 0 5.51 1.11 7.52 3.12a10.56 10.56 0 0 1 3.11 7.52c0 5.87-4.77 10.63-10.63 10.63zm5.83-7.96c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.71.16-.21.32-.82 1.04-1 1.25-.18.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.18.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.71-1.72-.98-2.35-.26-.62-.52-.54-.71-.55l-.61-.01c-.21 0-.55.08-.84.4-.29.32-1.1 1.08-1.1 2.63 0 1.55 1.13 3.05 1.29 3.26.16.21 2.23 3.4 5.4 4.77.75.32 1.34.52 1.8.66.76.24 1.44.21 1.99.13.61-.09 1.89-.77 2.16-1.52.27-.75.27-1.39.19-1.52-.08-.13-.29-.21-.61-.37z"/>
      </svg>
      WhatsApp
    </a>
  );
}

function TopupModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [amount, setAmount] = useState(100000);
  const [method, setMethod] = useState("cash");
  const submit = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/topup", { amount, paymentMethod: method }).then((r) => r.json()),
    onSuccess: (d) => { toast({ title: "Request sent", description: d.message }); qc.invalidateQueries({ queryKey: ["/api/reborn/topup/mine"] }); onClose(); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const { data: mine = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/topup/mine"], queryFn: () => apiRequest("GET", "/api/reborn/topup/mine").then((r) => r.json()), refetchInterval: 12000 });
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-sm bg-[#160f2a] border border-white/10 rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><X className="w-4 h-4" /></button>
        <h3 className="text-xl font-extrabold mb-1">Top up RP</h3>
        <p className="text-sm text-white/60 mb-4">Request to add RP credits (use them to buy KGOLD or pay in-app). Staff will confirm your payment.</p>
        <label className="text-xs text-white/60 block mb-1">Amount (RP)</label>
        <input type="number" min={10000} step={10000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white mb-3" />
        <label className="text-xs text-white/60 block mb-1">Payment method</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[{ v: "cash", l: "Cash" }, { v: "card", l: "Card" }].map((m) => (
            <button key={m.v} type="button" onClick={() => setMethod(m.v)} className={`py-3 rounded-xl border font-semibold ${method === m.v ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/10 bg-black/30 text-white/70"}`}>{m.l}</button>
          ))}
        </div>
        <button onClick={() => submit.mutate()} disabled={submit.isPending || amount < 10000} className="w-full py-3 rounded-xl font-bold text-black disabled:opacity-50" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>Send request</button>
        {mine.length > 0 && (
          <div className="mt-4 space-y-1">
            <p className="text-xs text-white/40">Recent requests</p>
            {mine.slice(0, 4).map((r) => (
              <div key={r.id} className="flex justify-between text-xs"><span>RP {Number(r.amount).toLocaleString()}</span>
                <span className={r.status === "approved" ? "text-emerald-400" : r.status === "rejected" ? "text-red-400" : "text-amber-300"}>{r.status}</span></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
