import { Suspense, lazy, useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { errorText, type SecuritySetup } from "@/lib/security-types";

const OfficerCheckPanel = lazy(() => import("@/components/OfficerCheckPanel"));
const CamerasPanel = lazy(() => import("@/components/CamerasPanel"));

type SubTab = "officer" | "cameras";

const tabClass = (isActive: boolean) => `flex-1 min-h-[44px] px-3 rounded-lg text-sm font-bold ${isActive ? "bg-amber-400 text-black" : "bg-white/5 text-white/70 border border-white/10"}`;

export default function SecurityPanel() {
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState<SubTab>("officer");
  const [setup, setSetup] = useState<SecuritySetup | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    apiRequest("GET", "/api/reborn/security/setup")
      .then((response) => response.json())
      .then(setSetup)
      .catch((error) => setLoadError(errorText(error)));
  }, []);

  const save = async (next: Pick<SecuritySetup, "cameras" | "stationNumbers" | "alertPhones">) => {
    const saved = await (await apiRequest("PUT", "/api/reborn/security/setup", next)).json();
    setSetup((current) => (current ? { ...current, ...saved } : current));
  };

  if (loadError) return <p role="alert" className="text-xs text-red-300">{loadError}</p>;
  if (!setup) return null;

  return (
    <div className="space-y-4">
      <div role="tablist" className="flex gap-2">
        <button type="button" role="tab" aria-selected={subTab === "officer"} onClick={() => setSubTab("officer")} className={tabClass(subTab === "officer")}>{t("admin.sc.subOfficer")}</button>
        <button type="button" role="tab" aria-selected={subTab === "cameras"} onClick={() => setSubTab("cameras")} className={tabClass(subTab === "cameras")}>{t("admin.sc.subCameras")}</button>
      </div>
      <Suspense fallback={null}>
        {subTab === "officer" ? <OfficerCheckPanel setup={setup} onSave={save} /> : <CamerasPanel setup={setup} onSave={save} />}
      </Suspense>
    </div>
  );
}
