// A month calendar where the days are ticked one by one (several dates at once), e.g. to put a staff member on the schedule.
import { useState } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useTranslation, localeTag } from "@/lib/i18n";

const DAYS_IN_WEEK = 7;
const MONDAY_2024 = Date.UTC(2024, 0, 1); // a Monday, only used to get weekday names in the language

const pad = (n: number) => String(n).padStart(2, "0");
const dateKey = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

export function MultiDateCalendar({ value, onChange, minDate }: { value: string[]; onChange: (dates: string[]) => void; minDate?: string }) {
  const { language } = useTranslation();
  const locale = localeTag(language);
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const firstWeekday = (new Date(Date.UTC(cursor.year, cursor.month, 1)).getUTCDay() + 6) % DAYS_IN_WEEK; // Monday = 0
  const dayCount = new Date(Date.UTC(cursor.year, cursor.month + 1, 0)).getUTCDate();
  const title = new Date(Date.UTC(cursor.year, cursor.month, 1)).toLocaleDateString(locale, { month: "long", year: "numeric", timeZone: "UTC" });
  const weekdays = Array.from({ length: DAYS_IN_WEEK }, (_, i) => new Date(MONDAY_2024 + i * 86_400_000).toLocaleDateString(locale, { weekday: "short", timeZone: "UTC" }));
  const move = (delta: number) => setCursor((c) => { const d = new Date(Date.UTC(c.year, c.month + delta, 1)); return { year: d.getUTCFullYear(), month: d.getUTCMonth() }; });
  const flip = (key: string) => onChange(value.includes(key) ? value.filter((d) => d !== key) : [...value, key].sort());
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: dayCount }, (_, i) => i + 1)];
  const todayKey = dateKey(now.getFullYear(), now.getMonth(), now.getDate());

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-2">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => move(-1)} aria-label="previous month" className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-white/5"><ChevronLeft className="w-4 h-4" /></button>
        <p className="text-sm font-bold capitalize">{title}</p>
        <button type="button" onClick={() => move(1)} aria-label="next month" className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-white/5"><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-white/40">{weekdays.map((name) => <span key={name}>{name}</span>)}</div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day === null) return <span key={`blank-${index}`} />;
          const key = dateKey(cursor.year, cursor.month, day);
          const isPast = (minDate ?? "") !== "" && key < minDate!;
          const isOn = value.includes(key);
          return (
            <button key={key} type="button" disabled={isPast} onClick={() => flip(key)} aria-pressed={isOn}
              className={`relative h-10 min-h-0 rounded-lg p-0 text-sm font-semibold ${isOn ? "bg-amber-400 text-black" : "bg-white/5 text-white/80"} ${key === todayKey && !isOn ? "ring-1 ring-amber-300/60" : ""} disabled:opacity-25`}>
              {day}
              {isOn && <Check className="absolute right-0.5 top-0.5 h-3 w-3" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
