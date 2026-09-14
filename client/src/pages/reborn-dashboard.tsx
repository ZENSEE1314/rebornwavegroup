import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { RebornLayout, MENU_ITEMS } from "@/components/RebornLayout";
import { OnboardingWalkthrough } from "@/components/OnboardingWalkthrough";
import {
  PawPrint, Disc3, Gift, Calendar, Trophy, Music, Users, Headphones, User,
  Coins, Star, DollarSign, HelpCircle, Shield, ChevronRight,
} from "lucide-react";

const TILES = [
  { label: "Pet Care", desc: "Feed your Doluruu", icon: <PawPrint className="w-6 h-6" />, path: "/pet", color: "#fb7185" },
  { label: "Spin & Win", desc: "Spend tokens for prizes", icon: <Disc3 className="w-6 h-6" />, path: "/spin", color: "#c9a84c" },
  { label: "My Prizes", desc: "Claim what you won", icon: <Gift className="w-6 h-6" />, path: "/spin?tab=prizes", color: "#22c55e" },
  { label: "Bookings", desc: "Reserve your visit", icon: <Calendar className="w-6 h-6" />, path: "/bookings", color: "#4ecdc4" },
  { label: "Loyalty", desc: "Rewards & perks", icon: <Trophy className="w-6 h-6" />, path: "/loyalty-program", color: "#a855f7" },
  { label: "Kings of Singers", desc: "Sing & vote", icon: <Music className="w-6 h-6" />, path: "/complete-app", color: "#ec4899" },
  { label: "Referrals", desc: "Invite friends", icon: <Users className="w-6 h-6" />, path: "/my-referral", color: "#6366f1" },
  { label: "Support", desc: "Chat & FAQ", icon: <Headphones className="w-6 h-6" />, path: "/support", color: "#45b7d1" },
  { label: "Profile", desc: "Your account", icon: <User className="w-6 h-6" />, path: "/profile", color: "#94a3b8" },
];

function formatRp(n: number) { return "RP " + (n || 0).toLocaleString("en-US"); }

export default function RebornDashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === "admin";
  const [showTour, setShowTour] = useState(() => {
    try { return !localStorage.getItem("onboarding-completed"); } catch { return true; }
  });
  const closeTour = () => { try { localStorage.setItem("onboarding-completed", "true"); } catch {} setShowTour(false); };

  const { data: pets = [] } = useQuery<any[]>({
    queryKey: ["/api/reborn/pets"],
    queryFn: () => apiRequest("GET", "/api/reborn/pets").then((r) => r.json()),
  });
  const livePet = pets.find((p) => !p.isEgg && p.lifeStatus === "active");
  const firstName = (user as any)?.firstName || "there";

  return (
    <RebornLayout active="/">
      {showTour && <OnboardingWalkthrough isOpen={showTour} onClose={closeTour} onComplete={closeTour} />}

      {/* Welcome + balances */}
      <div className="rounded-3xl p-5 mb-4 border border-white/10" style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.25), rgba(201,168,76,0.12))" }}>
        <p className="text-white/60 text-sm">Welcome back,</p>
        <h1 className="text-2xl font-extrabold mb-4">{firstName} 👋</h1>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Credits", value: formatRp(parseFloat((user as any)?.credits || "0")), icon: <DollarSign className="w-4 h-4" />, c: "#22c55e" },
            { label: "Points", value: (user as any)?.loyaltyPoints ?? 0, icon: <Star className="w-4 h-4" />, c: "#a855f7" },
            { label: "Tokens", value: (user as any)?.tokens ?? 0, icon: <Coins className="w-4 h-4" />, c: "#c9a84c" },
          ].map((b) => (
            <div key={b.label} className="rounded-2xl bg-black/25 p-3 text-center">
              <span className="inline-flex mb-1" style={{ color: b.c }}>{b.icon}</span>
              <div className="text-lg font-bold leading-none">{b.value}</div>
              <div className="text-[11px] text-white/50 mt-1">{b.label}</div>
            </div>
          ))}
        </div>
      </div>

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
              <p className="font-bold">Activate your pet</p>
              <p className="text-sm text-white/60">Enter your package code to bring Doluruu to life</p>
            </>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-white/40" />
      </button>

      {/* All feature buttons */}
      <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3 px-1">All features</h2>
      <div className="grid grid-cols-3 gap-3">
        {TILES.map((t) => (
          <button key={t.label} onClick={() => navigate(t.path)} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all">
            <span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${t.color}22`, color: t.color }}>{t.icon}</span>
            <span className="text-xs font-semibold text-center leading-tight">{t.label}</span>
            <span className="text-[10px] text-white/40 text-center leading-tight">{t.desc}</span>
          </button>
        ))}
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
        <HelpCircle className="w-4 h-4" /> How it all works — replay the guide
      </button>
    </RebornLayout>
  );
}
