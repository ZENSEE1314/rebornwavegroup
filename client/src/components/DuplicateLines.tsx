// Admin › Accounting › Entries: typed-in lines that look keyed twice (same type, category, amount, day and text). The oldest of each group is kept; a copy typed by hand or
// as a stock delivery can be removed here, a copy from an Expenses upload has to be voided (with a reason) in the Expenses tab, which keeps its record.
import { useTranslation } from "@/lib/i18n";
import { money } from "@/lib/money";
import { dayKeyOf, type LedgerLine } from "@shared/accountingEntries";

const REMOVABLE_REFS: (string | null)[] = [null, "stock_movement"];

interface Props<T extends LedgerLine> {
  groups: T[][];
  isRemoving: boolean;
  onRemove: (line: T) => void;
}

export function DuplicateLines<T extends LedgerLine>({ groups, isRemoving, onRemove }: Props<T>) {
  const { t } = useTranslation();
  if (groups.length === 0) return null;
  const copies = groups.reduce((count, group) => count + group.length - 1, 0);
  return (
    <div role="region" aria-label={t("acx.dupTitle")} className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3">
      <p className="text-sm font-bold text-amber-100">⚠️ {t("acx.dupTitle")} · {copies}</p>
      <p className="mt-0.5 text-[11px] text-white/60">{t("acx.dupHint")}</p>
      <ul className="mt-2 space-y-2">
        {groups.map((group) => (
          <li key={group.map((line) => line.id).join("-")} className="rounded-xl bg-black/25 p-2.5 text-xs">
            <p className="font-semibold text-white">{group[0].note || group[0].category}</p>
            <p className="text-white/50">{dayKeyOf(group[0].createdAt)} · {money(Number(group[0].amount))}</p>
            <ul className="mt-1.5 space-y-1">
              {group.map((line, index) => (
                <li key={line.id} className="flex items-center justify-between gap-2">
                  <span className={index === 0 ? "text-emerald-300" : "text-white/70"}>#{line.id} · {new Date(line.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{index === 0 ? ` · ${t("acx.dupKeep")}` : ""}</span>
                  {index > 0 && (REMOVABLE_REFS.includes(line.refType)
                    ? <button type="button" disabled={isRemoving} onClick={() => onRemove(line)} className="min-h-[40px] rounded-lg bg-red-500/25 px-3 font-bold text-red-100 disabled:opacity-40">{t("acx.dupRemove")}</button>
                    : <span className="text-[11px] text-white/45">{t("acx.dupOpenExpenses")}</span>)}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
