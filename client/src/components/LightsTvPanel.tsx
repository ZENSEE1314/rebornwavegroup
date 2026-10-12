import { Suspense, lazy, useState } from "react";
import { Lightbulb, Tv } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

// Bluetooth and TV code is only fetched when its sub-tab opens.
const LightsPanel = lazy(() => import("@/components/LightsPanel"));
const TvPanel = lazy(() => import("@/components/TvPanel"));

type SubTab = "lights" | "tv";

const tabClass = (isActive: boolean) => `inline-flex items-center justify-center gap-1.5 flex-1 min-h-[44px] px-3 rounded-lg text-sm font-bold ${isActive ? "bg-amber-400 text-black" : "bg-white/5 text-white/70 border border-white/10"}`;

export default function LightsTvPanel() {
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState<SubTab>("lights");

  return (
    <div className="space-y-4">
      <div role="tablist" className="flex gap-2">
        <button type="button" role="tab" aria-selected={subTab === "lights"} onClick={() => setSubTab("lights")} className={tabClass(subTab === "lights")}><Lightbulb className="w-4 h-4" />{t("admin.lt.subLights")}</button>
        <button type="button" role="tab" aria-selected={subTab === "tv"} onClick={() => setSubTab("tv")} className={tabClass(subTab === "tv")}><Tv className="w-4 h-4" />{t("admin.lt.subTv")}</button>
      </div>
      <Suspense fallback={null}>
        {subTab === "lights" ? <LightsPanel /> : <TvPanel />}
      </Suspense>
    </div>
  );
}
