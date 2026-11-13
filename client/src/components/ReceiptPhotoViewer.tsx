import { useState } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus } from "lucide-react";

import { ImageUpload } from "@/components/ImageUpload";
import { useTranslation } from "@/lib/i18n";

const ZOOM_STEPS = [1, 2, 3, 4];
const UPLOAD_MAX_DIM = 1600;
const UPLOAD_QUALITY = 0.85;

interface Props { src: string; name: string; onClose: () => void; onReplace?: (dataUrl: string) => void }

// A receipt / invoice photo full screen: tap it (or + / −) to zoom in and drag to move, and, for a line that can be changed,
// replace it with a clearer photo.
export function ReceiptPhotoViewer({ src, name, onClose, onReplace }: Props) {
  const { t } = useTranslation();
  const [zoomIndex, setZoomIndex] = useState(0);
  const [isReplacing, setIsReplacing] = useState(false);
  const zoom = ZOOM_STEPS[zoomIndex];
  const zoomBy = (step: number) => setZoomIndex((index) => Math.min(ZOOM_STEPS.length - 1, Math.max(0, index + step)));
  const cycleZoom = () => setZoomIndex((index) => (index + 1) % ZOOM_STEPS.length);
  const button = "min-h-[44px] rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white";
  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col gap-2 bg-black/95 p-3 text-white" role="dialog" aria-label={name}>
      <div className="min-h-0 flex-1 overflow-auto rounded-xl">
        <img src={src} alt={name} onClick={cycleZoom} style={{ width: `${zoom * 100}%`, maxWidth: "none" }} className={`mx-auto block h-auto ${zoom < ZOOM_STEPS[ZOOM_STEPS.length - 1] ? "cursor-zoom-in" : "cursor-zoom-out"}`} />
      </div>
      <p className="text-center text-[11px] text-white/60">{t("ar.photoHint")}</p>
      {isReplacing && onReplace && <ImageUpload value="" onChange={(url) => { if (url) { onReplace(url); setIsReplacing(false); } }} label={t("admin.rcpt.photo")} output="jpeg" maxDim={UPLOAD_MAX_DIM} quality={UPLOAD_QUALITY} />}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={() => zoomBy(-1)} disabled={zoomIndex === 0} aria-label={t("ar.zoomOut")} className={button + " flex items-center disabled:opacity-40"}><Minus className="h-4 w-4" /></button>
        <button type="button" onClick={() => setZoomIndex(0)} className={button}>{t("ar.fit")}</button>
        <button type="button" onClick={() => zoomBy(1)} disabled={zoomIndex === ZOOM_STEPS.length - 1} aria-label={t("ar.zoomIn")} className={button + " flex items-center disabled:opacity-40"}><Plus className="h-4 w-4" /></button>
        {onReplace && <button type="button" onClick={() => setIsReplacing(!isReplacing)} className={button + " border-amber-400/50 text-amber-200"}>{t("ar.replacePhoto")}</button>}
        <button type="button" onClick={onClose} className={button}>{t("admin.c.close")}</button>
      </div>
    </div>, document.body);
}
