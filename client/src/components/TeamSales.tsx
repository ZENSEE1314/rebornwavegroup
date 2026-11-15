// Admin › Daily sales (every staff account): one venue day of everyone's sales side by side, so staff can compare, and the person's own bar to the next daily tier.
// The same base as the daily tier commission (shared/dailyCommission.ts): items after the discount, no service fee, no tax, no-commission items left out.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { money } from "@/lib/money";

interface Next { above: number; percent: number }
interface Person { userId: string; name: string; isMe: boolean; sales: number; percent: number | null; from: number; to: number | null; next: Next | null; amount?: number }
interface MyDay { day: string; sales: number; percent: number | null; amount: number }
interface Answer { day: string; currentDay: string; enabled: boolean; startDay: string; period: { from: string; to: string; startDay: number }; people: Person[]; myDays: MyDay[]; myPeriodSales: number }

const DAY_MS = 86_400_000;
const shiftDay = (day: string, by: number) => new Date(Date.parse(`${day}T00:00:00Z`) + by * DAY_MS).toISOString().slice(0, 10);
const percentOf = (part: number, whole: number) => (whole > 0 ? Math.min(100, Math.max(0, (part / whole) * 100)) : 0);
const barClass = "h-2 overflow-hidden rounded-full bg-white/10";

export function TeamSales() {
  const { t } = useTranslation();
  const [chosenDay, setChosenDay] = useState("");
  const { data } = useQuery<Answer>({
    queryKey: ["/api/reborn/staff/team-sales", chosenDay],
    queryFn: () => apiRequest("GET", `/api/reborn/staff/team-sales?day=${chosenDay}`).then((r) => r.json()),
    refetchInterval: 60_000,
  });
  if (!data) return null;
  const me = data.people.find((person) => person.isMe);
  const topSales = Math.max(1, ...data.people.map((person) => person.sales));
  const canGoNext = data.day < data.currentDay;
  const go = (by: number) => setChosenDay(shiftDay(data.day, by));
  const navButton = "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 disabled:opacity-30";

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="flex items-center gap-2 text-sm font-bold"><Trophy className="h-4 w-4 text-amber-300" /> {t("ms.title")}</p>
        <div className="mt-3 flex items-center gap-2">
          <button type="button" onClick={() => go(-1)} aria-label={t("ms.prevDay")} className={navButton}><ChevronLeft className="h-5 w-5" /></button>
          <input type="date" value={data.day} max={data.currentDay} onChange={(e) => e.target.value && setChosenDay(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white" style={{ colorScheme: "dark" }} />
          <button type="button" onClick={() => go(1)} disabled={!canGoNext} aria-label={t("ms.nextDay")} className={navButton}><ChevronRight className="h-5 w-5" /></button>
        </div>
        {!data.enabled && <p className="mt-2 text-[11px] text-white/50">{t("ms.tiersOff")}</p>}
      </div>

      {me && (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
          <p className="flex justify-between gap-2 text-sm font-bold text-emerald-100"><span>{t("ms.yourDay", { day: data.day })}</span><span>{money(me.sales)}{me.percent !== null ? ` · ${me.percent}%` : ""}</span></p>
          {data.enabled && me.percent !== null && (
            <>
              <div className={`mt-2 ${barClass}`} role="progressbar" aria-label={t("ms.bar")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(me.to === null ? 100 : percentOf(me.sales - me.from, me.to - me.from))}>
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${me.to === null ? 100 : percentOf(me.sales - me.from, me.to - me.from)}%` }} />
              </div>
              <p className="mt-1 flex justify-between text-[11px] text-white/55"><span>{money(me.from)}</span><span>{me.to === null ? "" : money(me.to)}</span></p>
              <p className="mt-1 text-xs text-white/80">{me.next ? t("dcm.next", { more: money(Math.max(1, me.next.above + 1 - me.sales)), pct: me.next.percent }) : t("dcm.top")}</p>
              <p className="mt-1 text-xs font-bold text-emerald-200">{t("ms.commissionNow", { amount: money(me.amount ?? 0) })}</p>
            </>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-bold">{t("ms.everyone", { day: data.day })}</p>
        {data.people.every((person) => person.sales <= 0) && <p className="mt-2 text-xs text-white/45">{t("ms.noSales")}</p>}
        <ul className="mt-2 space-y-2.5">
          {data.people.filter((person) => person.sales > 0 || person.isMe).map((person, index) => (
            <li key={person.userId} className={`rounded-xl p-2.5 ${person.isMe ? "bg-emerald-400/10 ring-1 ring-emerald-400/40" : "bg-black/20"}`}>
              <p className="flex items-center justify-between gap-2 text-xs"><span className="min-w-0 truncate font-semibold text-white"><span className="mr-1 text-white/40">{index + 1}.</span>{person.name}{person.isMe ? ` (${t("ms.you")})` : ""}</span><span className="shrink-0 font-bold text-amber-200">{money(person.sales)}{person.percent !== null ? ` · ${person.percent}%` : ""}</span></p>
              <div className={`mt-1.5 ${barClass}`}><div className={`h-full rounded-full ${person.isMe ? "bg-emerald-400" : "bg-amber-300/70"}`} style={{ width: `${percentOf(person.sales, topSales)}%` }} /></div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="flex justify-between gap-2 text-sm font-bold"><span>{t("ms.myDays")}</span><span className="text-emerald-300">{t("ms.periodTotal", { n: money(data.myPeriodSales) })}</span></p>
        <p className="mt-0.5 text-[11px] text-white/45">{data.period.from} → {shiftDay(data.period.to, -1)} · {t("ms.tapDay")}</p>
        <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto">
          {data.myDays.map((row) => (
            <li key={row.day}>
              <button type="button" onClick={() => setChosenDay(row.day)} aria-pressed={row.day === data.day} className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-xs ${row.day === data.day ? "bg-emerald-400/15 ring-1 ring-emerald-400/40" : "bg-black/20"}`}>
                <span className="font-semibold text-white">{row.day}</span>
                <span className="text-white/80">{money(row.sales)}{row.percent !== null ? ` · ${row.percent}% · ${money(row.amount)}` : ""}</span>
              </button>
            </li>
          ))}
          {data.myDays.length === 0 && <li className="text-xs text-white/40">{t("ms.noSales")}</li>}
        </ul>
      </div>
    </div>
  );
}
