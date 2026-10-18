// Add a CCTV camera by its QR code: point this device's camera at the sticker / screen, or choose a picture of the QR (a screenshot from the camera's app works).
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, ScanLine } from "lucide-react";
import { parseCameraQr, type CameraQr } from "@shared/cameraQr";
import { useTranslation } from "@/lib/i18n";
import { panelButton } from "@/lib/security-types";

interface Props { onWeb(camera: Extract<CameraQr, { type: "web" }>): void }

export default function CameraQrScan({ onWeb }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handle = (text: string) => {
    const parsed = parseCameraQr(text);
    if (parsed.type === "web") { onWeb(parsed); setMessage(t("admin.cam.qr.added", { name: parsed.name })); setIsOpen(false); return; }
    if (parsed.type === "video") setMessage(t("admin.cam.qr.video", { address: parsed.rtsp.replace(/\/\/[^@/]*@/, "//") }));
    else if (parsed.type === "cloudId") setMessage(t("admin.cam.qr.cloud", { brand: parsed.brand || "—", id: parsed.id }));
    else setMessage(t("admin.cam.qr.unknown"));
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    let scanner: { start(): Promise<void>; stop(): void; destroy(): void } | null = null;
    let isCancelled = false;
    let isDone = false;
    setError("");
    (async () => {
      try {
        const QrScanner = (await import("qr-scanner")).default;
        if (!videoRef.current || isCancelled) return;
        scanner = new QrScanner(videoRef.current, (result: { data: string }) => {
          if (isDone || !result?.data) return;
          isDone = true;
          handle(result.data);
        }, { returnDetailedScanResult: true, highlightScanRegion: true, preferredCamera: "environment" });
        await scanner!.start();
      } catch (e) { setError(e instanceof Error ? e.message : t("admin.cam.qr.noCamera")); }
    })();
    return () => { isCancelled = true; try { scanner?.stop(); scanner?.destroy(); } catch { /* already stopped */ } };
  }, [isOpen]);

  const fromPicture = async (file: File | undefined) => {
    if (!file) return;
    try {
      const QrScanner = (await import("qr-scanner")).default;
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      handle(result.data);
    } catch { setMessage(t("admin.cam.qr.noneInPicture")); }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <>
      <button type="button" onClick={() => { setMessage(""); setIsOpen(true); }} className={panelButton}><ScanLine className="w-4 h-4" /> {t("admin.cam.qr.scan")}</button>
      <button type="button" onClick={() => fileRef.current?.click()} className={panelButton}><ImagePlus className="w-4 h-4" /> {t("admin.cam.qr.picture")}</button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => void fromPicture(event.target.files?.[0])} />
      {message && <p role="status" className="basis-full text-xs text-amber-200 break-all">{message}</p>}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 p-4 text-white">
          <video ref={videoRef} className="w-full max-w-sm aspect-square rounded-2xl bg-black object-cover" muted playsInline />
          <p className="mt-3 text-center text-sm text-white/70">{t("admin.cam.qr.point")}</p>
          {error && <p role="alert" className="mt-2 max-w-sm text-center text-sm text-red-300">{error}</p>}
          <button type="button" onClick={() => setIsOpen(false)} className="mt-4 min-h-[44px] rounded-xl bg-white/10 px-6 font-bold">{t("admin.cnt.back")}</button>
        </div>, document.body)}
    </>
  );
}
