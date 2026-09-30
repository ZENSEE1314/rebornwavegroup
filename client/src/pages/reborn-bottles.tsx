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
      <div className="flex items-center gap-2 mb-4">
        <span className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c" }}><Wine className="w-5 h-5" /></span>
        <div><h1 className="text-xl font-extrabold leading-none">{t("vn.bottles.heading")}</h1><p className="text-sm text-white/50">{t("vn.bottles.within30")}</p></div>
      </div>

      {soon.length > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-100">{t("vn.bottles.expiringSoon", { n: soon.length })}</p>
        </div>
      )}

      <div className="space-y-3">
        {bottles.map((b) => (
          <div key={b.id} className={`flex items-center gap-3 rounded-2xl border p-3 ${b.expiringSoon ? "border-amber-400/40 bg-amber-400/5" : "border-white/10 bg-white/5"}`}>
            {b.photoUrl
              ? <img src={b.photoUrl} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
              : <span className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">{b.type === "whisky" ? <Wine className="w-7 h-7 text-amber-300" /> : <Beer className="w-7 h-7 text-amber-300" />}</span>}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{b.name}</p>
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
