import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, X } from "lucide-react";

import { useTranslation } from "@/lib/i18n";
import { drawQrCard, saveCardImage, type QrCardPart, type SaveResult } from "@/lib/qr-download";

interface QrBigViewProps {
  title: string;
  subtitle?: string;
  svg: string;
  fileName: string;
  // A second card for the same place, e.g. the table QR together with the Wi-Fi QR on one picture.
  combined?: { label: string; parts: QrCardPart[]; fileName: string };
  onClose: () => void;
}

// A QR shown as large as the screen allows, with a button that saves it as a picture.
export function QrBigView({ title, subtitle = "", svg, fileName, combined, onClose }: QrBigViewProps) {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<SaveResult | null>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = async (parts: QrCardPart[], name: string) => {
    setIsSaving(true); setError(""); setDone(null);
    try { setDone(await saveCardImage(await drawQrCard(title, subtitle, parts), name)); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setIsSaving(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-3 text-white" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="relative max-h-full w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-4 text-black" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label={t("admin.c.close")} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/10 p-0"><X className="h-5 w-5" /></button>
        <p className="pr-10 text-2xl font-black leading-tight">{title}</p>
        {subtitle && <p className="text-sm text-black/60">{subtitle}</p>}
        <div className="mx-auto mt-3 aspect-square w-full max-w-[min(80vw,28rem)] [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="mt-3 space-y-2">
          <button type="button" disabled={isSaving} onClick={() => save([{ svg, label: title }], fileName)} className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-bold text-white disabled:opacity-50"><Download className="h-4 w-4" /> {t("admin.qr.download")}</button>
          {combined && <button type="button" disabled={isSaving} onClick={() => save(combined.parts, combined.fileName)} className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-sm font-bold text-black disabled:opacity-50"><Download className="h-4 w-4" /> {combined.label}</button>}
          {done && <p className="text-xs text-emerald-700">{t(done === "printed" ? "admin.qr.savedPrint" : done === "shared" ? "admin.qr.savedShare" : "admin.qr.savedDownload")}</p>}
          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
