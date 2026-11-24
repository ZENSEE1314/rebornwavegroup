// A small box asking "sure?" with an optional reason (replaces the browser's prompt(), which phone browsers block).
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "@/lib/i18n";

interface ReasonDialogProps {
  title: string;
  hint?: string;
  confirmLabel: string;
  isDanger?: boolean;
  onConfirm: (reason: string, chargeStaffId?: string, pin?: string) => void;
  needsPin?: boolean; // when true the box also asks for the PIN and will not confirm without it
  staffOptions?: { id: string; name: string }[]; // when given, the box also asks who pays for it
  onCancel: () => void;
}

export function ReasonDialog({ title, hint, confirmLabel, isDanger = false, onConfirm, onCancel, staffOptions, needsPin = false }: ReasonDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [pin, setPin] = useState("");
  const [payer, setPayer] = useState("");
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
        {needsPin && <input value={pin} onChange={(event) => setPin(event.target.value)} type="password" inputMode="numeric" autoComplete="off" maxLength={12} placeholder={t("pos.item.pinPh")} aria-label={t("pos.item.pinPh")} className="mt-2 w-full rounded-xl border border-amber-400/40 bg-black/30 px-3 py-2.5 text-sm text-white" />}
        {staffOptions && (
          <label className="mt-3 block text-[11px] text-white/55">{t("pos.item.staffPays")}
            <select value={payer} onChange={(event) => setPayer(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white">
              <option value="">{t("pos.item.nobodyPays")}</option>
              {staffOptions.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
            {payer && <span className="mt-1 block text-amber-200/80">{t("pos.item.staffPaysNote")}</span>}
          </label>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} className="rounded-xl bg-white/10 py-2.5 text-sm font-bold">{t("pos.item.dialogCancel")}</button>
          <button type="button" disabled={needsPin && !pin.trim()} onClick={() => onConfirm(reason.trim(), payer || undefined, needsPin ? pin.trim() : undefined)} className={`rounded-xl py-2.5 text-sm font-bold disabled:opacity-40 ${isDanger ? "bg-red-500 text-white" : "bg-amber-400 text-black"}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
