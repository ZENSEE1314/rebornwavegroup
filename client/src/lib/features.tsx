import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";
import { useTranslation } from "./i18n";
import { useAuth } from "@/hooks/useAuth";

// Member features the admin can switch on/off in Admin › App features.
// `paths` are the app pages that belong to the feature (keys match the server's APP_FEATURE_KEYS).
export const APP_FEATURES: { key: string; icon: string; label: string; desc: string; paths: string[] }[] = [
  { key: "pet", icon: "🐉", label: "hm.tile.petCare", desc: "hm.tile.petCareDesc", paths: ["/pet"] },
  { key: "games", icon: "🎮", label: "hm.tile.games", desc: "hm.tile.gamesDesc", paths: ["/games"] },
  { key: "songs", icon: "🎤", label: "hm.tile.songs", desc: "hm.tile.songsDesc", paths: ["/songs"] },
  { key: "bookings", icon: "📅", label: "hm.tile.bookings", desc: "hm.tile.bookingsDesc", paths: ["/bookings"] },
  { key: "order", icon: "🍽️", label: "hm.tile.order", desc: "hm.tile.orderDesc", paths: ["/order"] },
  { key: "kos", icon: "👑", label: "hm.tile.kos", desc: "hm.tile.kosDesc", paths: ["/kos"] },
  { key: "spin", icon: "🎡", label: "hm.tile.spin", desc: "hm.tile.spinDesc", paths: ["/spin"] },
  { key: "bottles", icon: "🍾", label: "hm.tile.bottles", desc: "hm.tile.bottlesDesc", paths: ["/bottles"] },
  { key: "loyalty", icon: "🏆", label: "hm.tile.loyalty", desc: "hm.tile.loyaltyDesc", paths: ["/loyalty-program"] },
  { key: "referral", icon: "🤝", label: "hm.tile.referrals", desc: "hm.tile.referralsDesc", paths: ["/my-referral", "/referrals"] },
  { key: "chat", icon: "💬", label: "nav.chat", desc: "admin.feat.chatDesc", paths: ["/chat"] },
  { key: "support", icon: "🎧", label: "hm.tile.support", desc: "hm.tile.supportDesc", paths: ["/support"] },
  { key: "history", icon: "🧾", label: "hm.tile.history", desc: "hm.tile.historyDesc", paths: ["/history"] },
];

export function featureForPath(path: string): string | undefined {
  const p = path.split("?")[0];
  return APP_FEATURES.find((f) => f.paths.includes(p))?.key;
}

function useFeaturesQuery() {
  return useQuery<{ disabled: string[] }>({
    queryKey: ["/api/reborn/features"],
    queryFn: () => apiRequest("GET", "/api/reborn/features").then((r) => r.json()),
    staleTime: 30_000,
  });
}
// The features switched off. Until the list has loaded every switchable feature
// counts as off, so a member can never see or tap a button that's turned off.
export function useDisabledFeatures(): Set<string> {
  return useFeatureState().off;
}
export function useFeatureState(): { off: Set<string>; loaded: boolean } {
  const { data, isError } = useFeaturesQuery();
  if (!data) return { off: new Set(isError ? [] : APP_FEATURES.map((f) => f.key)), loaded: isError };
  return { off: new Set(data.disabled || []), loaded: true };
}

// Is this page's feature on for the current user? Admins and staff can always open it.
// "loading" until the list arrives, so pages don't flash the "turned off" notice.
export function useFeatureOn(path: string): boolean | "loading" {
  const { off, loaded } = useFeatureState();
  const { user } = useAuth();
  const role = (user as any)?.role;
  if (role === "admin" || role === "staff") return true;
  const key = featureForPath(path);
  if (!key) return true;
  if (!loaded) return "loading";
  return !off.has(key);
}

// Wraps a page: shows a friendly "turned off" card when the admin disabled it.
export function FeatureGate({ path, children }: { path: string; children: ReactNode }) {
  const on = useFeatureOn(path);
  const { t } = useTranslation();
  if (on === "loading") return null;
  if (on) return <>{children}</>;
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0a0714" }}>
      <div className="max-w-sm w-full rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-white">
        <div className="text-5xl mb-3">🔒</div>
        <p className="text-lg font-black mb-1">{t("admin.feat.offTitle")}</p>
        <p className="text-sm text-white/60 mb-5">{t("admin.feat.offBody")}</p>
        <a href="/" className="inline-block rounded-2xl px-5 py-3 font-bold text-black" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>{t("admin.feat.offHome")}</a>
      </div>
    </div>
  );
}
