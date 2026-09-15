import { useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import {
  Home, PawPrint, Disc3, Headphones, Menu as MenuIcon, X, Gift, Coins,
  Calendar, Trophy, Users, User, Music, LogOut, Shield, Sparkles, MessageCircle,
} from "lucide-react";

interface NavItem { label: string; icon: ReactNode; path: string; }

const MAIN_NAV: NavItem[] = [
  { label: "Home", icon: <Home className="w-5 h-5" />, path: "/" },
  { label: "Pet", icon: <PawPrint className="w-5 h-5" />, path: "/pet" },
  { label: "KOS", icon: <Music className="w-5 h-5" />, path: "/kos" },
  { label: "Chat", icon: <MessageCircle className="w-5 h-5" />, path: "/chat" },
];

export const MENU_ITEMS: NavItem[] = [
  { label: "Pet Care", icon: <PawPrint className="w-5 h-5" />, path: "/pet" },
  { label: "Spin & Win", icon: <Disc3 className="w-5 h-5" />, path: "/spin" },
  { label: "My Prizes", icon: <Gift className="w-5 h-5" />, path: "/spin?tab=prizes" },
  { label: "Bookings", icon: <Calendar className="w-5 h-5" />, path: "/bookings" },
  { label: "Loyalty Program", icon: <Trophy className="w-5 h-5" />, path: "/loyalty-program" },
  { label: "Kings of Singers", icon: <Music className="w-5 h-5" />, path: "/kos" },
  { label: "Song Request", icon: <Music className="w-5 h-5" />, path: "/songs" },
  { label: "Referrals", icon: <Users className="w-5 h-5" />, path: "/my-referral" },
  { label: "Support & FAQ", icon: <Headphones className="w-5 h-5" />, path: "/support" },
  { label: "Profile", icon: <User className="w-5 h-5" />, path: "/profile" },
];

export function RebornLayout({ children, title, active }: { children: ReactNode; title?: string; active?: string }) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = (user as any)?.role === "admin";
  const tokens = (user as any)?.tokens ?? 0;

  const logout = async () => {
    try { await apiRequest("POST", "/api/auth/logout"); } catch {}
    window.location.href = "/";
  };
  const go = (p: string) => { setMenuOpen(false); navigate(p); };

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
          <button onClick={() => go("/profile")} aria-label="Profile" className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10">
            <User className="w-4 h-4 text-white/70" />
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
                <span className="text-[11px] font-medium">{it.label}</span>
              </button>
            );
          })}
          <button onClick={() => setMenuOpen(true)} className="flex flex-col items-center gap-1 py-2.5 text-white/50 hover:text-white/80">
            <MenuIcon className="w-5 h-5" />
            <span className="text-[11px] font-medium">Menu</span>
          </button>
        </div>
      </nav>

      {/* Menu drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full sm:max-w-md bg-[#120c22] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">All features</h3>
              <button onClick={() => setMenuOpen(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {MENU_ITEMS.map((it) => (
                <button key={it.path} onClick={() => go(it.path)} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center text-amber-300" style={{ background: "rgba(201,168,76,0.12)" }}>{it.icon}</span>
                  <span className="text-xs text-center text-white/80 leading-tight">{it.label}</span>
                </button>
              ))}
              {isAdmin && (
                <button onClick={() => go("/reborn-admin")} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 border border-purple-500/30 hover:bg-white/10">
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center text-purple-300" style={{ background: "rgba(168,85,247,0.15)" }}><Shield className="w-5 h-5" /></span>
                  <span className="text-xs text-center text-white/80">Admin</span>
                </button>
              )}
            </div>
            <button onClick={logout} className="mt-4 w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white/70 hover:text-white flex items-center justify-center gap-2">
              <LogOut className="w-4 h-4" /> Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
