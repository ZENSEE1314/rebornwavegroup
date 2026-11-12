import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "@/lib/i18n";

interface Props { src: string; name: string; className: string }

// The full-size view of a menu photo: tap anywhere to close.
export function PhotoLightbox({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  const { t } = useTranslation();
  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-black/90 p-4 text-white" onClick={onClose} role="dialog" aria-label={name}>
      <img src={src} alt={name} className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain" />
      <p className="font-bold">{name}</p>
      <button type="button" onClick={onClose} className="min-h-[44px] rounded-xl border border-white/20 bg-white/10 px-6 text-sm font-semibold">{t("admin.c.close")}</button>
    </div>, document.body);
}

// A menu photo that opens full size when tapped.
export function ZoomableImage({ src, name, className }: Props) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} aria-label={t("vn.order.viewPhoto", { name })} className="min-h-0 flex-shrink-0 border-0 bg-transparent p-0">
        <img src={src} alt="" className={className} />
      </button>
      {isOpen && <PhotoLightbox src={src} name={name} onClose={() => setIsOpen(false)} />}
    </>
  );
}
