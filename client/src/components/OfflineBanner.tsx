// POS: shows when the internet is down or sales are waiting to be sent, and lists any sale the server refused when it was sent.
import { useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { useTranslation, localeTag } from "@/lib/i18n";
import { money } from "@/lib/money";
import { discardOfflineSale, retryOfflineSale, useOfflineSales } from "@/lib/offline-sales";

export function OfflineBanner() {
  const { t, language } = useTranslation();
  const { isOffline, needsLogin, isSyncing, pending, failed, syncNow } = useOfflineSales();
  const [askingId, setAskingId] = useState("");
  if (!isOffline && !pending && !failed.length && !needsLogin) return null;
  return (
    <div className="mb-3 space-y-2">
      {(isOffline || pending > 0 || needsLogin) && (
        <div className={`rounded-2xl border p-3 text-sm ${isOffline ? "border-amber-400/40 bg-amber-400/10 text-amber-100" : "border-sky-400/30 bg-sky-400/10 text-sky-100"}`}>
          <p className="flex items-center gap-2 font-bold">{isOffline && <WifiOff className="h-4 w-4" />}{isOffline ? t("pos.offline.title") : t("pos.offline.waitingTitle")}</p>
          <p className="mt-1 text-xs opacity-80">{isOffline ? t("pos.offline.hint") : t("pos.offline.waiting", { n: pending })}</p>
          {isOffline && pending > 0 && <p className="mt-1 text-xs font-semibold">{t("pos.offline.saved", { n: pending })}</p>}
          {needsLogin && <p className="mt-1 text-xs font-semibold text-red-200">{t("pos.offline.loginAgain")}</p>}
          {pending > 0 && <button type="button" onClick={() => void syncNow()} disabled={isSyncing} className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />{t("pos.offline.sendNow")}</button>}
        </div>
      )}
      {failed.map((sale) => (
        <div key={sale.offlineId} className="rounded-2xl border border-red-400/40 bg-red-500/10 p-3 text-xs text-red-100">
          <p className="font-bold">{t("pos.offline.refused", { label: sale.label, total: money(sale.total) })}</p>
          <p className="mt-0.5 opacity-80">{new Date(sale.at).toLocaleString(localeTag(language))} · {sale.failed}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => retryOfflineSale(sale.offlineId)} className="rounded-lg bg-white/10 px-3 py-1.5 font-bold">{t("pos.offline.tryAgain")}</button>
            {askingId === sale.offlineId
              ? <button type="button" onClick={() => { discardOfflineSale(sale.offlineId); setAskingId(""); }} className="rounded-lg bg-red-500 px-3 py-1.5 font-bold text-white">{t("pos.offline.discardSure")}</button>
              : <button type="button" onClick={() => setAskingId(sale.offlineId)} className="rounded-lg bg-white/10 px-3 py-1.5 font-bold">{t("pos.offline.discard")}</button>}
          </div>
        </div>
      ))}
    </div>
  );
}
