import { useCallback, useEffect, useState } from "react";
import { Copy, Radar } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { errorText, panelButton, panelCard, primaryButton } from "@/lib/security-types";

export interface NearbyDevice { ip: string; kind: "camera" | "tv"; name: string; model: string; rtsp: string; via: string; seenAt: string }
interface NearbyState { devices: NearbyDevice[]; canEdit: boolean; hasToken: boolean; token: string; company: string; lastSeenAt: string; scanning: boolean }

const REFRESH_MS = 4000;
const BRIDGE_ONLINE_MS = 45_000;
const COPIED_SHOWN_MS = 2000;
const SCRIPT_PATH = "/venue-scan.mjs";
const FLAGSHIP_SLUG = "reborn-wave-group";

const isOnline = (lastSeenAt: string) => Boolean(lastSeenAt) && Date.now() - new Date(lastSeenAt).getTime() < BRIDGE_ONLINE_MS;

// "Find nearby": cameras and TVs found on the venue's network by the small scanner program running there.
export default function NearbyDevices({ kind, onAdd }: { kind: NearbyDevice["kind"]; onAdd?: (device: NearbyDevice) => void }) {
  const { t } = useTranslation();
  const [state, setState] = useState<NearbyState | null>(null);
  const [message, setMessage] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  const load = useCallback(async () => {
    try { setState(await (await apiRequest("GET", "/api/reborn/security/nearby")).json()); } catch (error) { setMessage(errorText(error)); }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  if (!state) return null;
  const online = isOnline(state.lastSeenAt);
  const found = state.devices.filter((device) => device.kind === kind);
  const company = state.company && state.company !== FLAGSHIP_SLUG ? ` --company ${state.company}` : "";
  const command = `node venue-scan.mjs --server ${window.location.origin} --token ${state.token}${company}`;

  const scan = async () => {
    try { await apiRequest("POST", "/api/reborn/security/nearby/scan", {}); setMessage(t("admin.nb.scanStarted")); load(); } catch (error) { setMessage(errorText(error)); }
  };
  const makeToken = async () => {
    try { await apiRequest("POST", "/api/reborn/security/nearby/token", {}); load(); } catch (error) { setMessage(errorText(error)); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(command); setIsCopied(true); window.setTimeout(() => setIsCopied(false), COPIED_SHOWN_MS); } catch { /* clipboard blocked: the text can still be selected by hand */ }
  };

  return (
    <div className={panelCard}>
      <h3 className="font-bold mb-1 flex items-center gap-2"><Radar className="w-4 h-4 text-cyan-300" /> {t("admin.nb.title")}</h3>
      <p className="text-[11px] text-white/50 mb-2">{t(kind === "camera" ? "admin.nb.introCam" : "admin.nb.introTv")}</p>
      <p className={`text-xs mb-2 ${online ? "text-emerald-300" : "text-amber-300"}`}>{online ? t("admin.nb.online") : t("admin.nb.offline")}</p>

      {!online && state.canEdit && (
        <div className="rounded-lg bg-black/20 border border-white/10 p-3 mb-3 space-y-2 text-[11px] text-white/70">
          <p>1. <a href={SCRIPT_PATH} download className="text-cyan-200 underline">{t("admin.nb.download")}</a> · {t("admin.nb.needNode")}</p>
          {state.hasToken ? (
            <>
              <p>2. {t("admin.nb.run")}</p>
              <code className="block break-all rounded bg-black/40 p-2 text-cyan-200">{command}</code>
              <button type="button" onClick={copy} className={panelButton}><Copy className="w-4 h-4" /> {isCopied ? t("admin.nb.copied") : t("admin.nb.copy")}</button>
            </>
          ) : (
            <button type="button" onClick={makeToken} className={panelButton}>{t("admin.nb.makeToken")}</button>
          )}
        </div>
      )}
      {!online && !state.canEdit && <p className="text-[11px] text-white/50 mb-3">{t("admin.nb.askAdmin")}</p>}

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <button type="button" onClick={scan} disabled={!online || state.scanning} className={primaryButton}><Radar className="w-4 h-4" /> {state.scanning ? t("admin.nb.scanning") : t("admin.nb.find")}</button>
        {message && <span className="text-xs text-white/60">{message}</span>}
      </div>

      {found.length === 0
        ? <p className="text-xs text-white/50">{t("admin.nb.none")}</p>
        : (
          <ul className="space-y-2">
            {found.map((device) => (
              <li key={`${device.kind}${device.ip}`} className="flex flex-wrap items-center gap-2 rounded-lg bg-black/20 border border-white/10 p-3 text-xs">
                <span className="grow basis-48 min-w-0">
                  <b className="block text-white">{device.name}</b>
                  <span className="block text-white/50 break-all">{device.ip}{device.model ? ` · ${device.model}` : ""}{device.rtsp ? ` · ${device.rtsp}` : ""}</span>
                </span>
                {onAdd && state.canEdit && <button type="button" onClick={() => onAdd(device)} className={panelButton}>{t("admin.nb.add")}</button>}
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
