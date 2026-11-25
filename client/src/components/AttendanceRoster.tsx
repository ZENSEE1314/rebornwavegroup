// Admin › Staff › Attendance: who is in, who is off, on MC or on leave, with the time in and out. One day as a name list, or the whole month as a grid.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { localeTag, useTranslation } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";

type Attendance = { userId: string; staffName: string; workDate: string; checkInAt?: string | null; checkOutAt?: string | null; onBreak?: boolean };
type Leave = { userId: string; staffName: string; type: string; startDate: string; endDate: string; status: string };
type Shift = { userId: string; staffName: string; shiftDate: string; startTime?: string; endTime?: string };
type Person = { id: string; name: string };
type DayStatus = "present" | "mc" | "leave" | "absent" | "off";

const DAY_MS = 86_400_000;
const STATUS_STYLE: Record<DayStatus, string> = {
  present: "bg-emerald-500/15 text-emerald-300",
  mc: "bg-amber-500/20 text-amber-300",
  leave: "bg-sky-500/20 text-sky-300",
  absent: "bg-red-500/20 text-red-300",
  off: "bg-white/5 text-white/40",
};
const MONTH_CELL: Record<DayStatus, string> = { present: "✓", mc: "MC", leave: "L", absent: "✗", off: "·" };

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDay = (key: string) => new Date(`${key}T12:00:00`);
const timeOf = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString(localeTag(), { hour: "2-digit", minute: "2-digit", hour12: false }) : "—");
const monthDays = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => `${month}-${pad(i + 1)}`);
};
const shiftMonth = (month: string, by: number) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

const getJson = <T,>(url: string) => apiRequest("GET", url).then((r) => (r.ok ? (r.json() as Promise<T>) : ([] as unknown as T)));

export function AttendanceRoster() {
  const { t } = useTranslation();
  const today = dayKey(new Date());
  const [mode, setMode] = useState<"day" | "month">("day");
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const range = mode === "day" ? { from: day.slice(0, 7) + "-01", to: monthDays(day.slice(0, 7)).slice(-1)[0] } : { from: `${month}-01`, to: monthDays(month).slice(-1)[0] };
  const monthOfRange = range.from.slice(0, 7);

  const { data: people = [] } = useQuery<Person[]>({ queryKey: ["/api/reborn/admin/staff-list"], queryFn: () => getJson<Person[]>("/api/reborn/admin/staff-list") });
  const { data: attendance = [] } = useQuery<Attendance[]>({ queryKey: ["/api/reborn/admin/attendance", range.from], queryFn: () => getJson<Attendance[]>(`/api/reborn/admin/attendance?from=${range.from}&to=${range.to}`) });
  const { data: leave = [] } = useQuery<Leave[]>({ queryKey: ["/api/reborn/admin/leave", "all"], queryFn: () => getJson<Leave[]>("/api/reborn/admin/leave") });
  const { data: shifts = [] } = useQuery<Shift[]>({ queryKey: ["/api/reborn/admin/shifts", range.from], queryFn: () => getJson<Shift[]>(`/api/reborn/admin/shifts?from=${range.from}&to=${range.to}`) });

  const roster = useMemo(() => {
    const names = new Map<string, string>(people.map((p) => [p.id, p.name]));
    for (const a of attendance) if (!names.has(a.userId)) names.set(a.userId, a.staffName);
    for (const s of shifts) if (!names.has(s.userId)) names.set(s.userId, s.staffName);
    const rows = Array.from(names, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    const attendanceOf = new Map<string, Attendance>();
    for (const a of attendance) { const key = `${a.userId}|${a.workDate}`; if (!attendanceOf.has(key)) attendanceOf.set(key, a); }
    const shiftOf = new Set(shifts.map((s) => `${s.userId}|${s.shiftDate}`));
    const approved = leave.filter((l) => l.status === "approved");
    const statusOf = (userId: string, date: string): { status: DayStatus; record?: Attendance } => {
      const record = attendanceOf.get(`${userId}|${date}`);
      if (record) return { status: "present", record };
      const away = approved.find((l) => l.userId === userId && l.startDate <= date && date <= l.endDate);
      if (away) return { status: away.type === "mc" ? "mc" : "leave" };
      if (shiftOf.has(`${userId}|${date}`) && date <= today) return { status: "absent" };
      return { status: "off" };
    };
    return { rows, statusOf };
  }, [people, attendance, leave, shifts, today]);

  const label: Record<DayStatus, string> = { present: t("admin.roster.present"), mc: t("admin.roster.mc"), leave: t("admin.roster.leave"), absent: t("admin.roster.absent"), off: t("admin.roster.off") };
  const dayTitle = parseDay(day).toLocaleDateString(localeTag(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const moveDay = (by: number) => setDay(dayKey(new Date(parseDay(day).getTime() + by * DAY_MS)));
  const counts = (date: string) => roster.rows.reduce((sum, p) => { const s = roster.statusOf(p.id, date).status; sum[s] += 1; return sum; }, { present: 0, mc: 0, leave: 0, absent: 0, off: 0 } as Record<DayStatus, number>);
  const iconButton = "w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center p-0";

  return (
    <div className="mb-3">
      <div className="flex gap-2 mb-3">
        {(["day", "month"] as const).map((value) => (
          <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={`px-3 rounded-full text-xs font-bold ${mode === value ? "bg-amber-400 text-black" : "bg-white/10 text-white/70"}`}>{t(`admin.roster.${value}`)}</button>
        ))}
      </div>

      {mode === "day" ? (
        <>
          <div className="flex items-center gap-2 mb-2">
            <button type="button" aria-label={t("admin.roster.prev")} onClick={() => moveDay(-1)} className={iconButton}><ChevronLeft className="w-4 h-4" /></button>
            <input type="date" value={day} max={today} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label={t("admin.roster.pickDay")} className="flex-1 min-w-0 bg-white/5 rounded-lg px-2 py-2 text-sm text-white" />
            <button type="button" aria-label={t("admin.roster.next")} onClick={() => moveDay(1)} className={iconButton}><ChevronRight className="w-4 h-4" /></button>
          </div>
          <p className="text-[11px] text-white/50 mb-2">{dayTitle}</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(Object.keys(label) as DayStatus[]).map((s) => <span key={s} className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_STYLE[s]}`}>{label[s]} {counts(day)[s]}</span>)}
          </div>
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 text-[10px] uppercase tracking-wide text-white/30 pb-1 border-b border-white/10">
            <span>{t("admin.roster.name")}</span><span>{t("admin.roster.status")}</span><span className="w-12 text-right">{t("admin.roster.in")}</span><span className="w-12 text-right">{t("admin.roster.out")}</span>
          </div>
          {roster.rows.map((person) => {
            const { status, record } = roster.statusOf(person.id, day);
            return (
              <div key={person.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center py-2 border-b border-white/5 text-sm">
                <span className="truncate text-white/85">{person.name}{record?.onBreak ? " ☕" : ""}</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_STYLE[status]}`}>{label[status]}</span>
                <span className="w-12 text-right tabular-nums text-white/80">{timeOf(record?.checkInAt)}</span>
                <span className="w-12 text-right tabular-nums text-white/80">{record?.checkInAt && !record.checkOutAt ? t("admin.roster.working") : timeOf(record?.checkOutAt)}</span>
              </div>
            );
          })}
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <button type="button" aria-label={t("admin.roster.prev")} onClick={() => setMonth(shiftMonth(month, -1))} className={iconButton}><ChevronLeft className="w-4 h-4" /></button>
            <p className="flex-1 text-center text-sm font-bold">{parseDay(`${month}-01`).toLocaleDateString(localeTag(), { month: "long", year: "numeric" })}</p>
            <button type="button" aria-label={t("admin.roster.next")} onClick={() => setMonth(shiftMonth(month, 1))} className={iconButton}><ChevronRight className="w-4 h-4" /></button>
          </div>
          <p className="text-[11px] text-white/40 mb-2">✓ {label.present} · MC · L {label.leave} · ✗ {label.absent} · · {label.off}</p>
          <div className="overflow-x-auto -mx-1">
            <table className="text-[11px] border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-[#1a1530] text-left pr-2 pb-1 font-normal text-white/40">{t("admin.roster.name")}</th>
                  {monthDays(monthOfRange).map((date) => <th key={date} className={`px-1 pb-1 font-normal ${date === today ? "text-amber-300" : "text-white/40"}`}>{Number(date.slice(8))}</th>)}
                </tr>
              </thead>
              <tbody>
                {roster.rows.map((person) => (
                  <tr key={person.id}>
                    <td className="sticky left-0 z-10 bg-[#1a1530] pr-2 py-0.5 whitespace-nowrap text-white/80 max-w-[8rem] truncate">{person.name}</td>
                    {monthDays(monthOfRange).map((date) => {
                      const { status, record } = roster.statusOf(person.id, date);
                      return <td key={date} title={`${person.name} · ${date} · ${label[status]}${record ? ` ${timeOf(record.checkInAt)}–${timeOf(record.checkOutAt)}` : ""}`} className="px-0.5 py-0.5"><span className={`block min-w-[1.5rem] text-center rounded py-1 ${STATUS_STYLE[status]}`}>{MONTH_CELL[status]}</span></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
