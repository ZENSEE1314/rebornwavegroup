import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { errorText, panelButton, panelCard, panelField, primaryButton } from "@/lib/security-types";

const MAX_CAMERAS = 16;
const SETUP_FILE_NAME = "Start-Camera-Bridge.bat";

interface SetupRow { name: string; host: string; user: string; password: string; channel: number }

const emptyRow = (): SetupRow => ({ name: "", host: "", user: "admin", password: "", channel: 1 });

// Makes the one-click file for the venue PC: the cameras typed here go into the file and are not saved in the app.
export default function VenueCameraSetup() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<SetupRow[]>([emptyRow()]);
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; isError: boolean } | null>(null);

  const change = (index: number, patch: Partial<SetupRow>) => setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const download = async () => {
    setIsBusy(true);
    setNotice(null);
    try {
      const response = await apiRequest("POST", "/api/reborn/admin/security/camera-setup-file", { cameras: rows });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(await response.blob());
      link.download = SETUP_FILE_NAME;
      link.click();
      URL.revokeObjectURL(link.href);
      setNotice({ text: t("admin.cam.setup.done"), isError: false });
    } catch (error) { setNotice({ text: t("admin.cam.failed", { error: errorText(error) }), isError: true }); }
    setIsBusy(false);
  };

  return (
    <div className={panelCard}>
      <h3 className="font-bold mb-1">{t("admin.cam.setup.title")}</h3>
      <p className="text-[11px] text-white/50 mb-3">{t("admin.cam.setup.intro")}</p>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={index} className="rounded-lg bg-black/20 border border-white/10 p-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              <input aria-label={t("admin.cam.name")} placeholder={t("admin.cam.name")} value={row.name} maxLength={80} onChange={(event) => change(index, { name: event.target.value })} className={panelField + " grow basis-40"} />
              <input aria-label={t("admin.cam.setup.ip")} placeholder="192.168.100.240" inputMode="decimal" value={row.host} maxLength={100} onChange={(event) => change(index, { host: event.target.value })} className={panelField + " grow basis-40"} />
            </div>
            <div className="flex flex-wrap gap-2">
              <input aria-label={t("admin.cam.setup.user")} placeholder={t("admin.cam.setup.user")} value={row.user} maxLength={80} autoComplete="off" onChange={(event) => change(index, { user: event.target.value })} className={panelField + " grow basis-32"} />
              <input type="password" aria-label={t("admin.cam.setup.pass")} placeholder={t("admin.cam.setup.pass")} value={row.password} maxLength={80} autoComplete="new-password" onChange={(event) => change(index, { password: event.target.value })} className={panelField + " grow basis-32"} />
              <input type="number" min={1} aria-label={t("admin.cam.setup.channel")} title={t("admin.cam.setup.channel")} value={row.channel} onChange={(event) => change(index, { channel: Number(event.target.value) || 1 })} className={panelField + " w-20"} />
            </div>
            {rows.length > 1 && <button type="button" onClick={() => setRows((current) => current.filter((_, i) => i !== index))} className={panelButton}>{t("admin.cam.remove")}</button>}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {rows.length < MAX_CAMERAS && <button type="button" onClick={() => setRows((current) => [...current, emptyRow()])} className={panelButton}><Plus className="w-4 h-4" /> {t("admin.cam.add")}</button>}
        <button type="button" onClick={download} disabled={isBusy} className={primaryButton}><Download className="w-4 h-4" /> {t("admin.cam.setup.download")}</button>
      </div>
      <p className="mt-2 text-[11px] text-white/50">{t("admin.cam.setup.hint")}</p>
      {notice && <p role="status" className={`mt-2 text-xs ${notice.isError ? "text-red-300" : "text-emerald-300"}`}>{notice.text}</p>}
    </div>
  );
}
