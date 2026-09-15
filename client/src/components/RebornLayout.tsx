import { useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import {
  Home, PawPrint, Disc3, Headphones, X, Gift, Coins,
  Calendar, Trophy, Users, User, Music, LogOut, Sparkles, MessageCircle,
  Utensils,
} from "lucide-react";

interface NavItem { label: string; tkey: string; icon: ReactNode; path: string; }

const MAIN_NAV: NavItem[] = [
  { label: "Home", tkey: "nav.home", icon: <Home className="w-5 h-5" />, path: "/" },
  { label: "Pet", tkey: "nav.pet", icon: <PawPrint className="w-5 h-5" />, path: "/pet" },
  { label: "KOS", tkey: "nav.kos", icon: <Music className="w-5 h-5" />, path: "/kos" },
  { label: "Chat", tkey: "nav.chat", icon: <MessageCircle className="w-5 h-5" />, path: "/chat" },
  { label: "Profile", tkey: "nav.profile", icon: <User className="w-5 h-5" />, path: "/profile" },
];

// All features live on the home page grid; this list is still exported for reference.
export const MENU_ITEMS: NavItem[] = [
  { label: "Pet Care", tkey: "nav.petCare", icon: <PawPrint className="w-5 h-5" />, path: "/pet" },
  { label: "Spin & Win", tkey: "nav.spin", icon: <Disc3 className="w-5 h-5" />, path: "/spin" },
  { label: "My Prizes", tkey: "nav.myPrizes", icon: <Gift className="w-5 h-5" />, path: "/spin?tab=prizes" },
  { label: "Order to Table", tkey: "nav.order", icon: <Utensils className="w-5 h-5" />, path: "/order" },
  { label: "Bookings", tkey: "nav.bookings", icon: <Calendar className="w-5 h-5" />, path: "/bookings" },
  { label: "Loyalty Program", tkey: "nav.loyalty", icon: <Trophy className="w-5 h-5" />, path: "/loyalty-program" },
  { label: "Kings of Singers", tkey: "nav.kingsOfSingers", icon: <Music className="w-5 h-5" />, path: "/kos" },
  { label: "Song Request", tkey: "nav.songRequest", icon: <Music className="w-5 h-5" />, path: "/songs" },
  { label: "Referrals", tkey: "nav.referrals", icon: <Users className="w-5 h-5" />, path: "/my-referral" },
  { label: "Support & FAQ", tkey: "nav.support", icon: <Headphones className="w-5 h-5" />, path: "/support" },
  { label: "Profile", tkey: "nav.profile", icon: <User className="w-5 h-5" />, path: "/profile" },
];

export function RebornLayout({ children, title, active }: { children: ReactNode; title?: string; active?: string }) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const tokens = (user as any)?.tokens ?? 0;

  const logout = async () => {
    try { await apiRequest("POST", "/api/auth/logout"); } catch {}
    window.location.href = "/";
  };
  const go = (p: string) => navigate(p);

  return (
    <div className="min-h-screen text-white" style={{ background: "radial-gradient(120% 100% at 50% 0%, #1a1030 0%, #0a0714 60%)" }}>
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b border-white/10 backdrop-blur-md" style={{ background: "rgba(10,7,20,0.75)" }}>
        <button onClick={() => go("/")} className="flex items-center gap-2 font-extrabold tracking-widest text-sm">
          <span className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#c9a84c,#a855f7)" }}>
            <Sparkles className="w-4 h-4" />
          </span>
          {title || "REBORN WAVE"}
        </button>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-amber-300">{tokens}</span>
          </div>
          <button onClick={() => setConfirmLogout(true)} aria-label={t("nav.logout")} className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white">
            <LogOut className="w-4 h-4" />
            <span className="text-xs font-semibold">{t("nav.logout")}</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 pt-4 pb-28">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 backdrop-blur-md" style={{ background: "rgba(10,7,20,0.9)" }}>
        <div className="max-w-2xl mx-auto grid grid-cols-5">
          {MAIN_NAV.map((it) => {
            const isActive = active === it.path || active === it.label.toLowerCase();
            return (
              <button key={it.path} onClick={() => go(it.path)} className={`flex flex-col items-center gap-1 py-2.5 transition-colors ${isActive ? "text-amber-300" : "text-white/50 hover:text-white/80"}`}>
                {it.icon}
                <span className="text-[11px] font-medium">{t(it.tkey)}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Logout confirm */}
      {confirmLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={() => setConfirmLogout(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-xs bg-[#160f2a] border border-white/10 rounded-3xl p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <span className="w-12 h-12 rounded-full bg-red-500/15 border border-red-400/30 flex items-center justify-center mx-auto mb-3"><LogOut className="w-5 h-5 text-red-300" /></span>
            <h3 className="text-lg font-extrabold mb-1">{t("nav.logout")}?</h3>
            <p className="text-sm text-white/50 mb-5">{t("logout.confirm")}</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmLogout(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-semibold">{t("common.cancel")}</button>
              <button onClick={logout} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold flex items-center justify-center gap-1.5"><LogOut className="w-4 h-4" /> {t("nav.logout")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
