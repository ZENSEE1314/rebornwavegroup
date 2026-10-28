import { useState } from "react";
import { useTranslation } from "@/lib/i18n";

interface Person { id: string; name: string }

const MAX_PERCENT = 100;

// One bill line: who earns its commission and the % they get (starts from the item's default % set in Inventory, the cashier can change it here).
export function LineCommissionPick({ staffId, percent, defaultPercent, people, onSave }: { staffId: string; percent: number | null; defaultPercent: number; people: Person[]; onSave: (staffId: string, percent: number | null) => void }) {
  const { t } = useTranslation();
  const shown = percent ?? defaultPercent;
  const [typed, setTyped] = useState<string>(String(shown || ""));
  const clean = (text: string) => Math.min(MAX_PERCENT, Math.max(0, Number(text) || 0));
  return (
    <div className="flex flex-wrap items-center gap-1.5 pb-1 text-[11px] text-pink-200">
      <label className="flex min-w-0 flex-1 items-center gap-1.5">
        {t("pos.item.commissionTo")}
        <select value={staffId} onChange={(e) => onSave(e.target.value, e.target.value ? clean(typed) : null)} className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-1.5 py-1 text-[11px] text-white">
          <option value="">{t("pos.item.commissionNone")}</option>
          {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
        </select>
      </label>
      {staffId && (
        <label className="flex items-center gap-1">
          <input type="number" inputMode="decimal" min={0} max={MAX_PERCENT} value={typed} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setTyped(e.target.value)} onBlur={() => onSave(staffId, clean(typed))} aria-label={t("pos.item.commissionPct")} className="w-16 rounded-md border border-white/10 bg-black/40 px-1.5 py-1 text-right text-[11px] text-white" />%
        </label>
      )}
    </div>
  );
}
