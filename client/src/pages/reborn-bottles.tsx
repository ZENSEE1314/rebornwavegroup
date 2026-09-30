import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RebornLayout } from "@/components/RebornLayout";
import { useTranslation } from "@/lib/i18n";
import { Wine, Beer, Clock, AlertTriangle } from "lucide-react";

interface Bottle { id: number; type: string; name: string; quantity: number; photoUrl?: string; daysLeft: number; expiringSoon: boolean; storedAt: string; }

const BOTTLE_TYPE_KEYS: Record<string, string> = { beer: "vn.bottles.typeBeer", wine: "vn.bottles.typeWine", whisky: "vn.bottles.typeWhisky", other: "vn.bottles.typeOther" };

export default function RebornBottles() {
  const { t } = useTranslation();
  const { data: bottles = [] } = useQuery<Bottle[]>({
    queryKey: ["/api/reborn/bottles"],
    queryFn: () => apiRequest("GET", "/api/reborn/bottles").then((r) => r.json()),
    refetchInterval: 30000,
  });
  const soon = bottles.filter((b) => b.expiringSoon);

  return (
    <RebornLayout active="/bottles" title={t("vn.bottles.title")}>
      <div className="flex items-center gap-3 mb-4">
        <span className="arc-icon shrink-0" style={{ width: 48, height: 48, ["--c1" as any]: "#fb7185", ["--c2" as any]: "#9f1239" }}><span><Wine className="w-6 h-6 text-white" /></span></span>
        <div><h1 className="text-xl font-extrabold leading-none">{t("vn.bottles.heading")}</h1><p className="text-sm text-white/50">{t("vn.bottles.within30")}</p></div>
      </div>

      {soon.length > 0 && (
        <div className="arc-room-row kos-checkin mb-4" style={{ ["--c1" as any]: "#f3b52f", ["--c" as any]: "#f3b52f" }}>
          <AlertTriangle className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-100">{t("vn.bottles.expiringSoon", { n: soon.length })}</p>
        </div>
      )}

      <div className="space-y-3">
        {bottles.map((b) => (
          <div key={b.id} className="arc-room-row" style={{ ["--c1" as any]: b.daysLeft <= 3 ? "#ef4444" : b.expiringSoon || b.daysLeft <= 7 ? "#f3b52f" : "#e11d48" }}>
            {b.photoUrl
              ? <img src={b.photoUrl} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
              : <span className="arc-icon shrink-0" style={{ width: 56, height: 56, ["--c1" as any]: "#fbbf24", ["--c2" as any]: "#b45309" }}><span>{b.type === "whisky" ? <Wine className="w-7 h-7 text-white" /> : <Beer className="w-7 h-7 text-white" />}</span></span>}
            <div className="flex-1 min-w-0">
              <p className="font-black italic truncate">{b.name}</p>
              <p className="text-xs text-white/50 capitalize">{BOTTLE_TYPE_KEYS[b.type] ? t(BOTTLE_TYPE_KEYS[b.type]) : b.type} · {b.type === "beer" ? t("vn.bottles.leftN", { n: b.quantity }) : t("vn.bottles.kept")}</p>
              <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-1 rounded-full text-xs font-bold ${b.daysLeft <= 3 ? "bg-red-500/20 text-red-300 border border-red-400/40" : b.daysLeft <= 7 ? "bg-amber-500/20 text-amber-300 border border-amber-400/40" : "bg-white/10 text-white/70 border border-white/15"}`}>
                <Clock className="w-3 h-3" /> {b.daysLeft > 0 ? t(b.daysLeft === 1 ? "vn.bottles.dayLeft" : "vn.bottles.daysLeft", { n: b.daysLeft }) : t("vn.bottles.expiresToday")}
              </span>
              {b.daysLeft <= 7 && <p className="text-[11px] text-white/40 mt-1">{t("vn.bottles.remind")}</p>}
            </div>
          </div>
        ))}
      </div>
      {bottles.length === 0 && (
        <div className="text-center py-14 text-white/40">
          <Wine className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{t("vn.bottles.none")}</p>
          <p className="text-xs mt-1">{t("vn.bottles.noneHint")}</p>
        </div>
      )}
    </RebornLayout>
  );
}
