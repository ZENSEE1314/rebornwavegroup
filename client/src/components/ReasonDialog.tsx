// A small box asking "sure?" with an optional reason (replaces the browser's prompt(), which phone browsers block).
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "@/lib/i18n";

interface ReasonDialogProps {
  title: string;
  hint?: string;
  confirmLabel: string;
  isDanger?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function ReasonDialog({ title, hint, confirmLabel, isDanger = false, onConfirm, onCancel }: ReasonDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 text-white" onClick={onCancel} role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#160f2a] p-4" onClick={(event) => event.stopPropagation()}>
        <p className="font-bold">{title}</p>
        {hint && <p className="mt-1 text-xs text-white/55">{hint}</p>}
        <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={200} placeholder={t("pos.item.reasonPh")} autoFocus className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white" />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} className="rounded-xl bg-white/10 py-2.5 text-sm font-bold">{t("pos.item.dialogCancel")}</button>
          <button type="button" onClick={() => onConfirm(reason.trim())} className={`rounded-xl py-2.5 text-sm font-bold ${isDanger ? "bg-red-500 text-white" : "bg-amber-400 text-black"}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
