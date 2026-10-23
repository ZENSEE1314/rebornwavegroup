import { useTranslation } from "@/lib/i18n";
import { cleanDays, daysOf } from "@shared/happyHour";

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first

// Weekday chips for a happy hour: none ticked = every day. `value` is "1,2,5" (0 = Sunday), the same text the server stores.
export function HappyDays({ value, onChange }: { value: string | null | undefined; onChange: (days: string) => void }) {
  const { t } = useTranslation();
  const ticked = daysOf(value);
  const toggle = (day: number) => onChange(cleanDays(ticked.includes(day) ? ticked.filter((d) => d !== day) : [...ticked, day]));
  return (
    <div className="flex w-full flex-wrap items-center gap-1.5 text-xs text-white/60" role="group" aria-label={t("admin.hh.days")}>
      <span>{t("admin.hh.days")}</span>
      {WEEK_ORDER.map((day) => (
        <button key={day} type="button" aria-pressed={ticked.includes(day)} onClick={() => toggle(day)} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${ticked.includes(day) ? "bg-pink-400 text-black" : "bg-white/10 text-white/70"}`} style={{ minHeight: 0 }}>{t(`admin.hh.day${day}`)}</button>
      ))}
      <span className="text-[10px] text-white/40">{ticked.length === 0 ? t("admin.hh.daysAll") : ""}</span>
    </div>
  );
}

/** Short text for a chip: "Mon, Wed" or "" for every day. */
export function happyDaysText(value: string | null | undefined, name: (day: number) => string): string {
  return daysOf(value).sort((a, b) => WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b)).map(name).join(", ");
}
