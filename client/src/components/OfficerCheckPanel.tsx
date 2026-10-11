import { useEffect, useState } from "react";
import { Phone, ShieldAlert } from "lucide-react";
import { localeTag, useTranslation } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { errorText, panelButton, panelCard, panelField, primaryButton, type OfficerCheck, type SecuritySetup, type StationNumber } from "@/lib/security-types";

const STEP_KEYS = ["admin.off.step1", "admin.off.step2", "admin.off.step3", "admin.off.step4", "admin.off.step5"] as const;
const NOTICE_MS = 4000;
const OUTCOMES = [
  { outcome: "verified", label: "admin.off.verified", style: "bg-emerald-500/20 text-emerald-100 border border-emerald-400/50" },
  { outcome: "not_verified", label: "admin.off.notVerified", style: "bg-red-500/25 text-red-100 border border-red-400/60" },
  { outcome: "refused", label: "admin.off.refused", style: "bg-white/10 text-white/80 border border-white/20" },
] as const;
const STATUS_STYLE: Record<string, string> = { open: "text-amber-200", verified: "text-emerald-300", not_verified: "text-red-300", refused: "text-white/60" };
const EMPTY_FORM = { claimedName: "", badge: "", unit: "", note: "" };

interface Props { setup: SecuritySetup; onSave(next: Pick<SecuritySetup, "cameras" | "stationNumbers" | "alertPhones">): Promise<void> }

export default function OfficerCheckPanel({ setup, onSave }: Props) {
  const { t, language } = useTranslation();
  const [checks, setChecks] = useState<OfficerCheck[]>([]);
  const [active, setActive] = useState<OfficerCheck | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [ticked, setTicked] = useState<boolean[]>(STEP_KEYS.map(() => false));
  const [endNote, setEndNote] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState<{ isError: boolean; text: string } | null>(null);
  const [stations, setStations] = useState<StationNumber[]>(setup.stationNumbers);
  const [alertText, setAlertText] = useState(setup.alertPhones.join("\n"));

  const say = (text: string, isError = false) => {
    setNotice({ isError, text });
    window.setTimeout(() => setNotice(null), NOTICE_MS);
  };

  const loadChecks = async () => {
    try { setChecks((await (await apiRequest("GET", "/api/reborn/security/officer-checks")).json()).checks); } catch (error) { say(errorText(error), true); }
  };

  useEffect(() => { void loadChecks(); }, []);

  const startSteps = (check: OfficerCheck) => {
    setActive(check);
    setTicked(STEP_KEYS.map(() => false));
    setEndNote("");
  };

  const begin = async () => {
    setIsBusy(true);
    try {
      const { check } = await (await apiRequest("POST", "/api/reborn/security/officer-checks", form)).json();
      startSteps(check);
      say(t("admin.off.started"));
      void loadChecks();
    } catch (error) { say(errorText(error), true); } finally { setIsBusy(false); }
  };

  const finish = async (outcome: string) => {
    if (!active) return;
    setIsBusy(true);
    try {
      await apiRequest("POST", `/api/reborn/security/officer-checks/${active.id}/close`, { outcome, note: endNote });
      setActive(null);
      setForm(EMPTY_FORM);
      say(t("admin.off.closed"));
      void loadChecks();
    } catch (error) { say(errorText(error), true); } finally { setIsBusy(false); }
  };

  const saveSettings = async () => {
    try {
      const alertPhones = alertText.split(/[\n,;]+/).map((line) => line.trim()).filter(Boolean);
      await onSave({ cameras: setup.cameras, stationNumbers: stations, alertPhones });
      say(t("admin.off.saved"));
    } catch (error) { say(t("admin.off.failed", { error: errorText(error) }), true); }
  };

  const setStation = (index: number, patch: Partial<StationNumber>) => setStations((current) => current.map((station, i) => (i === index ? { ...station, ...patch } : station)));
  const when = (iso: string) => new Date(iso).toLocaleString(localeTag(language));

  return (
    <div className="space-y-4">
      <div className={panelCard}>
        <h3 className="font-bold mb-1 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-red-300" /> {t("admin.off.title")}</h3>
        <p className="text-[11px] text-white/50 mb-3">{t("admin.off.intro")}</p>

        {!active && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <input aria-label={t("admin.off.claimedName")} placeholder={t("admin.off.claimedName")} value={form.claimedName} maxLength={60} onChange={(event) => setForm({ ...form, claimedName: event.target.value })} className={panelField + " grow basis-40"} />
              <input aria-label={t("admin.off.badge")} placeholder={t("admin.off.badge")} value={form.badge} maxLength={60} onChange={(event) => setForm({ ...form, badge: event.target.value })} className={panelField + " grow basis-40"} />
              <input aria-label={t("admin.off.unit")} placeholder={t("admin.off.unit")} value={form.unit} maxLength={60} onChange={(event) => setForm({ ...form, unit: event.target.value })} className={panelField + " grow basis-40"} />
            </div>
            <input aria-label={t("admin.off.note")} placeholder={t("admin.off.note")} value={form.note} maxLength={500} onChange={(event) => setForm({ ...form, note: event.target.value })} className={panelField + " w-full"} />
            <button type="button" onClick={begin} disabled={isBusy} className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-lg font-bold text-white text-sm bg-red-600 disabled:opacity-40"><ShieldAlert className="w-4 h-4" /> {t("admin.off.begin")}</button>
          </div>
        )}

        {active && (
          <div className="space-y-3">
            <p className="text-xs text-amber-200">{[active.claimedName, active.badge, active.unit].filter(Boolean).join(" · ") || "—"}</p>
            <p className="text-[11px] text-white/50">{t("admin.off.checklist")}</p>
            <ul className="space-y-2">
              {STEP_KEYS.map((key, i) => (
                <li key={key}>
                  <label className="flex items-start gap-3 text-sm text-white/90 min-h-[44px]">
                    <input type="checkbox" checked={ticked[i]} onChange={() => setTicked((current) => current.map((value, index) => (index === i ? !value : value)))} className="mt-1 w-5 h-5 shrink-0" />
                    <span>{t(key)}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div>
              <p className="text-[11px] text-white/50 mb-1">{t("admin.off.stations")}</p>
              {setup.stationNumbers.length === 0
                ? <p className="text-xs text-white/50">{t("admin.off.noStations")}</p>
                : <div className="flex flex-wrap gap-2">
                    {setup.stationNumbers.map((station) => <a key={station.phone} href={`tel:+${station.phone}`} className={panelButton + " no-underline"}><Phone className="w-4 h-4" /> {t("admin.off.call")} {station.label || station.phone}</a>)}
                  </div>}
            </div>
            <p className="text-[11px] text-white/50">{t("admin.off.endTitle")}</p>
            <input aria-label={t("admin.off.note")} placeholder={t("admin.off.note")} value={endNote} maxLength={500} onChange={(event) => setEndNote(event.target.value)} className={panelField + " w-full"} />
            <div className="flex flex-wrap gap-2">
              {OUTCOMES.map(({ outcome, label, style }) => <button key={outcome} type="button" disabled={isBusy} onClick={() => finish(outcome)} className={`min-h-[44px] px-4 rounded-lg text-xs font-bold disabled:opacity-40 ${style}`}>{t(label)}</button>)}
            </div>
          </div>
        )}
        {notice && <p role={notice.isError ? "alert" : "status"} className={`mt-3 text-xs ${notice.isError ? "text-red-300" : "text-emerald-300"}`}>{notice.text}</p>}
      </div>

      <div className={panelCard}>
        <h3 className="font-bold mb-2 text-sm">{t("admin.off.log")}</h3>
        {checks.length === 0 && <p className="text-xs text-white/50">{t("admin.off.logEmpty")}</p>}
        <ul className="space-y-2">
          {checks.map((check) => (
            <li key={check.id} className="rounded-lg bg-black/20 border border-white/10 p-3 text-xs">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className={`font-bold ${STATUS_STYLE[check.outcome]}`}>{t(`admin.off.status.${check.outcome}`)}</span>
                <span className="text-white/90">{[check.claimedName, check.badge, check.unit].filter(Boolean).join(" · ") || "—"}</span>
                <span className="text-white/40">{when(check.at)} · {t("admin.off.by", { name: check.staffName })}</span>
              </div>
              {check.note && <p className="mt-1 text-white/60">{check.note}</p>}
              {check.outcome === "open" && !active && <button type="button" onClick={() => startSteps(check)} className={panelButton + " mt-2"}>{t("admin.off.endTitle")}</button>}
            </li>
          ))}
        </ul>
      </div>

      {setup.canEdit && (
        <div className={panelCard}>
          <h3 className="font-bold mb-2 text-sm">{t("admin.off.settings")}</h3>
          <p className="text-[11px] text-white/50 mb-1">{t("admin.off.stations")}</p>
          <div className="space-y-2">
            {stations.map((station, index) => (
              <div key={index} className="flex flex-wrap gap-2">
                <input aria-label={t("admin.off.stationLabel")} placeholder={t("admin.off.stationLabel")} value={station.label} maxLength={60} onChange={(event) => setStation(index, { label: event.target.value })} className={panelField + " grow basis-40"} />
                <input aria-label={t("admin.off.stationPhone")} placeholder={t("admin.off.stationPhone")} value={station.phone} inputMode="tel" onChange={(event) => setStation(index, { phone: event.target.value })} className={panelField + " grow basis-40"} />
                <button type="button" onClick={() => setStations((current) => current.filter((_, i) => i !== index))} className={panelButton + " text-red-200"}>{t("admin.cam.remove")}</button>
              </div>
            ))}
            <button type="button" onClick={() => setStations((current) => [...current, { label: "", phone: "" }])} className={panelButton}>{t("admin.off.addStation")}</button>
          </div>
          <label className="block mt-4 text-[11px] text-white/50" htmlFor="off-alert-phones">{t("admin.off.alertPhones")}</label>
          <textarea id="off-alert-phones" rows={3} value={alertText} onChange={(event) => setAlertText(event.target.value)} className={panelField + " w-full mt-1"} />
          <p className="text-[11px] text-white/40 mt-1">{t("admin.off.alertHint")}</p>
          <button type="button" onClick={saveSettings} className={primaryButton + " mt-3"}>{t("admin.off.saveSettings")}</button>
        </div>
      )}
    </div>
  );
}
