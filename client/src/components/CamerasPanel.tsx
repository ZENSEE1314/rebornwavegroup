import { useEffect, useState } from "react";
import { Plus, Video } from "lucide-react";
import { CAMERA_BRANDS, MAX_BRAND_NAME, OTHER_BRAND, cameraBrand } from "@shared/cameraBrands";
import { useTranslation } from "@/lib/i18n";
import NearbyDevices, { type NearbyDevice } from "@/components/NearbyDevices";
import CameraQrScan from "@/components/CameraQrScan";
import { errorText, panelButton, panelCard, panelField, primaryButton, type Camera, type CameraKind, type SecuritySetup } from "@/lib/security-types";

const NOTICE_MS = 4000;
const MS_PER_SECOND = 1000;
const NEW_CAMERA_PREFIX = "new-";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

interface Props { setup: SecuritySetup; onSave(next: Pick<SecuritySetup, "cameras" | "stationNumbers" | "alertPhones">): Promise<void> }

// A browser refuses to load plain http content inside a secure (https) page unless it comes from this very computer.
function isBlockedByBrowser(url: string): boolean {
  try {
    const target = new URL(url);
    return window.location.protocol === "https:" && target.protocol === "http:" && !LOCAL_HOSTS.has(target.hostname);
  } catch { return false; }
}

const withTick = (url: string, tick: number) => `${url}${url.includes("?") ? "&" : "?"}_t=${tick}`;

const brandLabel = (camera: Camera) => (camera.brand === OTHER_BRAND ? camera.brandName : cameraBrand(camera.brand)?.name ?? "");

function CameraView({ camera }: { camera: Camera }) {
  const { t } = useTranslation();
  const [tick, setTick] = useState(() => Date.now());
  const [hasFailed, setHasFailed] = useState(false);
  const isBlocked = isBlockedByBrowser(camera.url);

  useEffect(() => {
    if (camera.kind !== "image" || camera.refreshSeconds <= 0) return;
    const timer = window.setInterval(() => setTick(Date.now()), camera.refreshSeconds * MS_PER_SECOND);
    return () => window.clearInterval(timer);
  }, [camera.kind, camera.refreshSeconds]);

  return (
    <div className="grow basis-72 rounded-xl overflow-hidden bg-black border border-white/10">
      <div className="flex items-center justify-between px-3 py-2 text-xs text-white/80">
        <span className="font-semibold">{camera.name}{brandLabel(camera) && <span className="ml-2 font-normal text-white/50">{brandLabel(camera)}</span>}</span>
        <a href={camera.url} target="_blank" rel="noopener noreferrer" className="text-cyan-200">{t("admin.cam.open")}</a>
      </div>
      {isBlocked
        ? <p className="p-3 text-xs text-amber-200">{t("admin.cam.blocked")}</p>
        : camera.kind === "page"
          ? <iframe title={camera.name} src={camera.url} className="w-full aspect-video border-0" allow="autoplay; fullscreen" sandbox="allow-scripts allow-same-origin" />
          : <img alt={camera.name} src={camera.refreshSeconds > 0 ? withTick(camera.url, tick) : camera.url} onError={() => setHasFailed(true)} onLoad={() => setHasFailed(false)} className="w-full aspect-video object-contain bg-black" />}
      {hasFailed && !isBlocked && <p className="p-3 text-xs text-red-300">{t("admin.cam.loadFailed")}</p>}
    </div>
  );
}

export default function CamerasPanel({ setup, onSave }: Props) {
  const { t } = useTranslation();
  const [cameras, setCameras] = useState<Camera[]>(setup.cameras);
  const [notice, setNotice] = useState<{ isError: boolean; text: string } | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => { setCameras(setup.cameras); }, [setup.cameras]); // after a save the server hands back the real ids

  const say = (text: string, isError = false) => {
    setNotice({ isError, text });
    window.setTimeout(() => setNotice(null), NOTICE_MS);
  };

  const change = (id: string, patch: Partial<Camera>) => {
    setCameras((current) => current.map((camera) => (camera.id === id ? { ...camera, ...patch } : camera)));
    setIsDirty(true);
  };

  const add = () => {
    setCameras((current) => [...current, { id: `${NEW_CAMERA_PREFIX}${Date.now()}`, name: `${t("admin.cam.title")} ${current.length + 1}`, kind: "image", url: "", refreshSeconds: 0, brand: "", brandName: "" }]);
    setIsDirty(true);
  };

  // A found camera is added with its own web page as the address; the video address (rtsp) is listed beside it for a stream converter.
  const addFound = (device: NearbyDevice) => {
    setCameras((current) => [...current, { id: `${NEW_CAMERA_PREFIX}${Date.now()}`, name: device.name, kind: "page", url: `http://${device.ip}/`, refreshSeconds: 0, brand: "", brandName: "" }]);
    setIsDirty(true);
  };

  // A camera whose QR code held its web address is added with the name and address filled in.
  const addFromQr = (found: { name: string; url: string; kind: CameraKind }) => {
    setCameras((current) => [...current, { id: `${NEW_CAMERA_PREFIX}${Date.now()}`, name: found.name, kind: found.kind, url: found.url, refreshSeconds: 0, brand: "", brandName: "" }]);
    setIsDirty(true);
  };

  const save = async () => {
    try {
      // The server gives a new camera its id; one without a web address is dropped there.
      await onSave({ cameras: cameras.map((camera) => ({ ...camera, id: camera.id.startsWith(NEW_CAMERA_PREFIX) ? "" : camera.id })), stationNumbers: setup.stationNumbers, alertPhones: setup.alertPhones });
      setIsDirty(false);
      say(t("admin.cam.saved"));
    } catch (error) { say(t("admin.cam.failed", { error: errorText(error) }), true); }
  };

  const saved = setup.cameras;

  return (
    <div className="space-y-4">
      <div className={panelCard}>
        <h3 className="font-bold mb-1 flex items-center gap-2"><Video className="w-4 h-4 text-cyan-300" /> {t("admin.cam.title")}</h3>
        {setup.canEdit && <><p className="text-[11px] text-white/50 mb-2">{t("admin.cam.intro")}</p><p className="text-[11px] text-white/50">{t("admin.cam.help")}</p></>}
        {saved.length === 0 && <p className="mt-3 text-xs text-white/50">{t("admin.cam.none")}</p>}
        <div className="mt-3 flex flex-wrap gap-3">{saved.map((camera) => <CameraView key={`${camera.id}${camera.url}${camera.kind}${camera.refreshSeconds}`} camera={camera} />)}</div>
      </div>

      <NearbyDevices kind="camera" onAdd={addFound} />

      {setup.canEdit && (
        <div className={panelCard}>
          <div className="space-y-3">
            {cameras.map((camera) => (
              <div key={camera.id} className="rounded-lg bg-black/20 border border-white/10 p-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <input aria-label={t("admin.cam.name")} placeholder={t("admin.cam.name")} value={camera.name} maxLength={60} onChange={(event) => change(camera.id, { name: event.target.value })} className={panelField + " grow basis-40"} />
                  <select aria-label={t("admin.cam.kind")} value={camera.kind} onChange={(event) => change(camera.id, { kind: event.target.value as CameraKind })} className={panelField + " grow basis-48"}>
                    <option value="image">{t("admin.cam.kind.image")}</option>
                    <option value="page">{t("admin.cam.kind.page")}</option>
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select aria-label={t("admin.cam.brand")} value={camera.brand} onChange={(event) => change(camera.id, { brand: event.target.value, brandName: "" })} className={panelField + " grow basis-48"}>
                    <option value="">{t("admin.cam.brand.pick")}</option>
                    {CAMERA_BRANDS.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                    <option value={OTHER_BRAND}>{t("admin.cam.brand.other")}</option>
                  </select>
                  {camera.brand === OTHER_BRAND && <input aria-label={t("admin.cam.brand.name")} placeholder={t("admin.cam.brand.name")} value={camera.brandName} maxLength={MAX_BRAND_NAME} onChange={(event) => change(camera.id, { brandName: event.target.value })} className={panelField + " grow basis-40"} />}
                </div>
                {cameraBrand(camera.brand) && (
                  <p className="text-[11px] text-white/50 break-all">{t("admin.cam.brand.example")} <code className="text-cyan-200">{camera.kind === "page" ? cameraBrand(camera.brand)?.page ?? cameraBrand(camera.brand)?.image : cameraBrand(camera.brand)?.image}</code></p>
                )}
                <input aria-label={t("admin.cam.url")} placeholder={t("admin.cam.url")} value={camera.url} onChange={(event) => change(camera.id, { url: event.target.value })} className={panelField + " w-full"} />
                {camera.kind === "image" && (
                  <label className="flex flex-wrap items-center gap-2 text-[11px] text-white/50">{t("admin.cam.refresh")}
                    <input type="number" min={0} max={60} value={camera.refreshSeconds} onChange={(event) => change(camera.id, { refreshSeconds: Number(event.target.value) })} className={panelField + " w-20"} />
                  </label>
                )}
                <button type="button" onClick={() => { setCameras((current) => current.filter((item) => item.id !== camera.id)); setIsDirty(true); }} className={panelButton + " text-red-200"}>{t("admin.cam.remove")}</button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" onClick={add} className={panelButton}><Plus className="w-4 h-4" /> {t("admin.cam.add")}</button>
            <CameraQrScan onWeb={addFromQr} />
            <button type="button" onClick={save} disabled={!isDirty} className={primaryButton}>{t("admin.cam.save")}</button>
            {notice && <span role={notice.isError ? "alert" : "status"} className={`text-xs ${notice.isError ? "text-red-300" : "text-emerald-300"}`}>{notice.text}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
