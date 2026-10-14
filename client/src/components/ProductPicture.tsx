import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ImageUpload } from "@/components/ImageUpload";
import { useAuth } from "@/hooks/useAuth";

const PICTURE_MAX_DIM = 600;
const PICTURE_QUALITY = 0.8;

interface Props { id: number; name: string; imageUrl?: string | null; sizeClass: string; roundedClass?: string }

// A product's picture: tap it to see it large; the admin can change or remove it there (saved with the Save button).
export default function ProductPicture({ id, name, imageUrl, sizeClass, roundedClass = "rounded-lg" }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const canEdit = (user as { role?: string } | null | undefined)?.role === "admin";
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? imageUrl ?? "";
  const isChanged = draft !== null && draft !== (imageUrl ?? "");

  const close = () => { setIsOpen(false); setDraft(null); };
  const save = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/reborn/admin/pos/products/${id}`, { imageUrl: draft ?? "" }).then((r) => r.json()),
    onSuccess: () => { toast({ title: t("admin.pic.saved") }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/inventory"] }); close(); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: String(e.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" }),
  });

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} aria-label={t("admin.pic.open", { name })} title={t("admin.pic.open", { name })} className={`${sizeClass} ${roundedClass} flex-shrink-0 overflow-hidden bg-white/5 p-0 inline-flex items-center justify-center border border-transparent hover:border-amber-400/60`}>
        {imageUrl ? <img src={imageUrl} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="w-1/2 h-1/2 text-white/30" />}
      </button>
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 text-white" onClick={close}>
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#160f2a] p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold truncate">{name}</p>
            <div className="flex items-center justify-center rounded-xl bg-black/40 min-h-[220px] max-h-[60vh] overflow-hidden">
              {shown ? <img src={shown} alt={name} className="max-h-[60vh] w-auto max-w-full object-contain" /> : <p className="text-sm text-white/40 p-8">{t("admin.pic.none")}</p>}
            </div>
            {canEdit && <ImageUpload value={shown} onChange={(value) => setDraft(value)} maxDim={PICTURE_MAX_DIM} quality={PICTURE_QUALITY} label={t("admin.pic.upload")} />}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={close} className="min-h-[44px] px-4 rounded-lg text-sm font-semibold bg-white/10 border border-white/15">{t("admin.c.close")}</button>
              {canEdit && <button type="button" onClick={() => save.mutate()} disabled={!isChanged || save.isPending} className="min-h-[44px] px-5 rounded-lg text-sm font-bold bg-amber-400 text-black disabled:opacity-40">{t("admin.c.save")}</button>}
            </div>
          </div>
        </div>, document.body)}
    </>
  );
}
