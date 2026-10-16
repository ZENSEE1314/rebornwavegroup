// Admin › Settings › Venue server. On the cloud: switch it on and get the token the venue PC needs. On the venue PC: whether it is in step with the cloud.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation, localeTag } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

const REFRESH_MS = 8000;
const card = "rounded-2xl border border-white/10 bg-white/5 p-4";

interface VenueStatus { isVenue: boolean; cloudUrl?: string; venue?: { configured: boolean; online: boolean; bootstrapped: boolean; isBusy: boolean; lastOkAt: string | null; lastError: string | null; waitingToSend: number; failures: number; note: string | null }; cloud?: { enabled: boolean; lastSeen: string | null; receivedFromVenue: number; failures: number } }

export function VenueSyncCard() {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const key = ["/api/reborn/admin/venue-sync"];
  const { data } = useQuery<VenueStatus>({ queryKey: key, queryFn: () => apiRequest("GET", "/api/reborn/admin/venue-sync").then((r) => r.json()), refetchInterval: REFRESH_MS });
  const [token, setToken] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString(localeTag(language)) : t("admin.venue.never"));
  const enable = useMutation({
    mutationFn: (rotate: boolean) => apiRequest("POST", "/api/reborn/admin/venue-sync/enable", { rotate }).then((r) => r.json()),
    onSuccess: (d: { token: string }) => { setToken(d.token); setIsAsking(false); qc.invalidateQueries({ queryKey: key }); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: String(e.message || ""), variant: "destructive" }),
  });
  const syncNow = useMutation({ mutationFn: () => apiRequest("POST", "/api/reborn/admin/venue-sync/now", {}).then((r) => r.json()), onSuccess: () => qc.invalidateQueries({ queryKey: key }) });
  if (!data) return null;

  if (data.isVenue && data.venue) {
    const v = data.venue;
    return (
      <div className={card}>
        <h3 className="font-bold mb-1">🏠 {t("admin.venue.titleVenue")}</h3>
        <p className={`text-sm font-semibold ${v.online ? "text-emerald-300" : "text-amber-300"}`}>{v.online ? `● ${t("admin.venue.online")}` : `○ ${t("admin.venue.offline")}`}</p>
        <p className="mt-1 text-xs text-white/60">{t("admin.venue.lastOk", { d: when(v.lastOkAt) })}</p>
        <p className="text-xs text-white/60">{t("admin.venue.waiting", { n: v.waitingToSend })}</p>
        {v.note && <p className="mt-1 text-xs text-sky-200">{v.note}</p>}
        {v.failures > 0 && <p className="mt-1 text-xs text-red-300">{t("admin.venue.failures", { n: v.failures })}</p>}
        {!v.online && v.lastError && <p className="mt-1 text-[11px] text-white/40">{v.lastError}</p>}
        <p className="mt-2 text-[11px] text-white/45">{t("admin.venue.venueHint")}</p>
        <button type="button" onClick={() => syncNow.mutate()} disabled={syncNow.isPending || v.isBusy} className="mt-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold disabled:opacity-40">{t("admin.venue.syncNow")}</button>
      </div>
    );
  }

  const cloud = data.cloud;
  return (
    <div className={card}>
      <h3 className="font-bold mb-1">🏠 {t("admin.venue.titleCloud")}</h3>
      <p className="text-[11px] text-white/50 mb-2">{t("admin.venue.cloudHint")}</p>
      {!cloud?.enabled && <button type="button" onClick={() => enable.mutate(false)} disabled={enable.isPending} className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-black disabled:opacity-40">{t("admin.venue.turnOn")}</button>}
      {cloud?.enabled && (
        <div className="space-y-1 text-xs text-white/70">
          <p>{t("admin.venue.lastSeen", { d: when(cloud.lastSeen) })}</p>
          {cloud.failures > 0 && <p className="text-red-300">{t("admin.venue.failures", { n: cloud.failures })}</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={() => enable.mutate(false)} className="rounded-xl bg-white/10 px-3 py-2 font-bold">{t("admin.venue.showToken")}</button>
            {isAsking
              ? <button type="button" onClick={() => enable.mutate(true)} className="rounded-xl bg-red-500 px-3 py-2 font-bold text-white">{t("admin.venue.newTokenSure")}</button>
              : <button type="button" onClick={() => setIsAsking(true)} className="rounded-xl bg-white/10 px-3 py-2 font-bold text-red-300">{t("admin.venue.newToken")}</button>}
          </div>
        </div>
      )}
      {token && (
        <div className="mt-3 rounded-xl bg-black/30 p-3">
          <p className="text-[11px] text-white/50">{t("admin.venue.tokenIs")}</p>
          <p className="mt-1 break-all font-mono text-xs text-amber-200 select-all">{token}</p>
          <p className="mt-2 text-[11px] text-white/45">{t("admin.venue.tokenUse", { url: window.location.origin })}</p>
        </div>
      )}
    </div>
  );
}
