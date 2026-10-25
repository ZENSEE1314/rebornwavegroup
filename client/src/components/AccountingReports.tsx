// Admin › Accounting › Reports: one month (or everything) in plain lines — money in from sales, then every cost the owner cares about
// (stock bought, staff, electricity, water, internet, rent, security, police ...) and what is left. Built from the same ledger as the rest of Accounting.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { translations, useTranslation, localeTag } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { money } from "@/lib/money";
import { EXPENSE_GROUPS, sectionsOfGroup, type CostSection, type ExpenseGroup, type PeriodReport, type ReportGroup } from "@shared/accountingReport";

const card = "rounded-2xl bg-white/5 border border-white/10 p-4";
const field = "min-w-0 px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400/60";
const chip = (isActive: boolean) => `min-h-[44px] px-4 rounded-lg text-xs font-semibold whitespace-nowrap ${isActive ? "bg-amber-400 text-black" : "bg-white/5 text-white/70 border border-white/10"}`;
const todayMonth = () => new Date().toISOString().slice(0, 7);

interface MonthlyData { month: string; report: PeriodReport; plannedRunningCosts: number; pendingBills: string[]; prizePool: number }
interface OverallData { total: PeriodReport; months: { month: string; report: PeriodReport }[]; prizePool: number }

interface DrillLine {
  id: number; at: string | null; amount: number; category: string; refType: string | null; note: string | null; by: string; hasPhoto: boolean;
  bill: { id: number; orderNo: string; table: string | null; member: string | null } | null;
  upload: { id: number; payee: string | null; uploadedBy: string | null; spentOn: string; status: string; voidReason: string | null; hasPhoto: boolean } | null;
}
interface Drill { group: string; count: number; total: number; truncated: boolean; lines: DrillLine[] }

function Detail({ group, scope }: { group: ReportGroup; scope: string }) {
  const { t, language } = useTranslation();
  const [photo, setPhoto] = useState<{ id: number; url: string | null } | null>(null);
  const url = `/api/reborn/admin/accounting/report-lines?group=${group}${scope ? `&${scope}` : ""}`;
  const { data } = useQuery<Drill>({ queryKey: [url], queryFn: () => apiRequest("GET", url).then((r) => r.json()) });
  const showPhoto = async (id: number) => {
    setPhoto({ id, url: null });
    const r = await apiRequest("GET", `/api/reborn/admin/accounting/ledger/${id}/photo`);
    setPhoto({ id, url: (await r.json()).photoUrl });
  };
  const sourceLabel = (line: DrillLine) => {
    const key = `ar.src.${line.refType}`;
    return line.refType && translations[key] ? t(key) : line.refType || line.category;
  };
  if (!data) return <p className="py-2 text-[11px] text-white/40">…</p>;
  if (data.lines.length === 0) return <p className="py-2 text-[11px] text-white/40">{t("ar.noLines")}</p>;
  return (
    <div className="mb-2 rounded-xl border border-white/10 bg-black/30 p-2 space-y-1.5">
      <p className="text-[11px] text-white/50">{t("ar.lineCount", { n: data.count, total: money(data.total) })}</p>
      {data.lines.map((line) => (
        <div key={line.id} className="rounded-lg bg-white/5 p-2 text-[11px]">
          <div className="flex items-baseline justify-between gap-2"><span className="text-white/60">{line.at ? new Date(line.at).toLocaleString(localeTag(language)) : ""}</span><span className={`font-bold ${line.amount < 0 ? "text-red-300" : "text-white"}`}>{money(line.amount)}</span></div>
          <p className="text-white/80">{sourceLabel(line)}{line.bill ? ` · ${t("ar.bill", { no: line.bill.orderNo })}${line.bill.table ? ` · ${t("ar.table", { t: line.bill.table })}` : ""}${line.bill.member ? ` · ${line.bill.member}` : ""}` : ""}</p>
          {line.upload && <p className="text-white/60">{t("ar.uploadBy", { name: line.upload.uploadedBy || "?" })}{line.upload.payee ? ` · ${line.upload.payee}` : ""} · {t("ar.receiptDate", { d: line.upload.spentOn })}{line.upload.status === "voided" ? ` · ${t("ar.voided", { reason: line.upload.voidReason || "" })}` : ""}</p>}
          {line.note && <p className="text-white/45 break-words">{line.note}</p>}
          <div className="flex gap-3 text-white/40">{line.by && !line.upload && <span>{t("ar.by", { name: line.by })}</span>}{line.hasPhoto && <button type="button" onClick={() => showPhoto(line.id)} className="min-h-0 p-0 text-amber-300 underline">{t("ar.viewPhoto")}</button>}</div>
          {photo?.id === line.id && (photo.url ? <div><img src={photo.url} alt={t("ar.viewPhoto")} className="mt-1 max-h-72 w-full object-contain rounded" /><button type="button" onClick={() => setPhoto(null)} className="min-h-0 p-0 text-white/50 underline">{t("ex.close")}</button></div> : <p className="text-white/40">…</p>)}
        </div>
      ))}
      {data.truncated && <p className="text-[11px] text-amber-200">{t("ar.truncated")}</p>}
    </div>
  );
}

function Lines({ report, scope }: { report: PeriodReport; scope: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<ReportGroup | null>(null);
  const toggle = (group: ReportGroup) => setOpen(open === group ? null : group);
  const row = (group: ReportGroup, label: string, amount: number, tone: string) => (
    <div key={group}>
      <button type="button" onClick={() => toggle(group)} aria-expanded={open === group} className={`w-full min-h-[40px] flex items-center justify-between gap-2 rounded-lg px-1 py-1 text-left text-sm hover:bg-white/5 ${amount === 0 ? "text-white/30" : tone}`}>
        <span>{open === group ? "▼" : "▶"} {label}</span><span>{money(amount)}</span>
      </button>
      {open === group && <Detail group={group} scope={scope} />}
    </div>
  );
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] text-white/40">{t("ar.open")}</p>
      {row("income", t("ar.moneyIn"), report.income, "text-emerald-300 font-semibold")}
      {EXPENSE_GROUPS.map((group: ExpenseGroup) => (
        <div key={group} className="pt-2">
          <div className="flex items-baseline justify-between border-b border-white/10 pb-0.5"><p className="text-[11px] font-bold uppercase tracking-wide text-amber-200">{t(`ar.group.${group}`)}</p><p className="text-xs font-bold text-red-300">{money(report.groups[group])}</p></div>
          {sectionsOfGroup(group).map((section: CostSection) => row(section, t(`ar.sec.${section}`), report.costs[section], "text-white/80"))}
        </div>
      ))}
      <div className="flex justify-between border-t border-white/10 pt-1.5 text-sm"><span className="font-semibold text-red-300">{t("ar.costTotal")}</span><span className="font-bold text-red-300">{money(report.costTotal)}</span></div>
      <div className="flex justify-between text-sm"><span className="text-white/60">{t("ar.grossProfit")}</span><span>{money(report.grossProfit)}</span></div>
      <div className="flex justify-between border-t-2 border-amber-300/50 pt-2"><span className="font-extrabold">{t("ar.net")}</span><span className={`text-lg font-black ${report.net >= 0 ? "text-amber-300" : "text-red-300"}`}>{money(report.net)}</span></div>
    </div>
  );
}

function MonthlyReport() {
  const { t } = useTranslation();
  const [month, setMonth] = useState(todayMonth());
  const url = `/api/reborn/admin/accounting/monthly?month=${month}`;
  const { data } = useQuery<MonthlyData>({ queryKey: [url], queryFn: () => apiRequest("GET", url).then((r) => r.json()) });
  const booked = data ? data.report.costTotal - data.report.costs.stock - data.report.costs.refunds : 0;
  return (
    <div className="space-y-3">
      <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} aria-label={t("ar.month")} className={field} />
      {data && (
        <>
          <Lines report={data.report} scope={`month=${month}`} />
          <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-1 text-xs">
            <p className="font-semibold text-white/70">{t("ar.running")}</p>
            <div className="flex justify-between text-white/60"><span>{t("ar.planned")}</span><span>{money(data.plannedRunningCosts)}</span></div>
            <div className="flex justify-between text-white/60"><span>{t("ar.booked")}</span><span>{money(booked)}</span></div>
            {data.pendingBills.length > 0 && <p className="text-amber-200">{t("ar.pending", { names: data.pendingBills.join(", ") })}</p>}
          </div>
          <p className="text-[11px] text-white/40">{t("ar.staffNote")}</p>
          <p className="text-[11px] text-white/40">{t("ar.pool", { n: money(data.prizePool) })}</p>
        </>
      )}
    </div>
  );
}

function OverallReport() {
  const { t } = useTranslation();
  const { data } = useQuery<OverallData>({ queryKey: ["/api/reborn/admin/accounting/overall"], queryFn: () => apiRequest("GET", "/api/reborn/admin/accounting/overall").then((r) => r.json()) });
  if (!data) return null;
  return (
    <div className="space-y-3">
      <Lines report={data.total} scope="" />
      {data.months.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-white/40"><th className="py-1 pr-2">{t("ar.month")}</th><th className="pr-2 text-right">{t("ar.moneyIn")}</th>{EXPENSE_GROUPS.map((group) => <th key={group} className="pr-2 text-right">{t(`ar.group.${group}`)}</th>)}<th className="text-right">{t("ar.net")}</th></tr></thead>
            <tbody>
              {data.months.map(({ month, report }) => (
                <tr key={month} className="border-t border-white/5">
                  <td className="py-1 pr-2 font-semibold">{month}</td>
                  <td className="pr-2 text-right text-emerald-300">{money(report.income)}</td>
                  {EXPENSE_GROUPS.map((group) => <td key={group} className="pr-2 text-right">{money(report.groups[group])}</td>)}
                  <td className={`text-right font-bold ${report.net >= 0 ? "text-amber-300" : "text-red-300"}`}>{money(report.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-white/40">{t("ar.pool", { n: money(data.prizePool) })}</p>
    </div>
  );
}

export default function AccountingReports() {
  const { t } = useTranslation();
  const [view, setView] = useState<"monthly" | "overall">("monthly");
  return (
    <div className={card + " space-y-3"}>
      <h3 className="font-extrabold flex items-center gap-2"><BarChart3 className="w-5 h-5 text-amber-300" /> {t("ar.title")}</h3>
      <p className="text-[11px] text-white/50">{t("ar.intro")}</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => setView("monthly")} className={chip(view === "monthly")}>{t("ar.monthly")}</button>
        <button type="button" onClick={() => setView("overall")} className={chip(view === "overall")}>{t("ar.overall")}</button>
      </div>
      {view === "monthly" ? <MonthlyReport /> : <OverallReport />}
    </div>
  );
}

interface TaxFeeMonth { month: string; serviceFee: number; tax: number; bills: number }
interface PeriodData { days: number; report: PeriodReport; prizePool: number; taxFees?: { serviceFee: number; tax: number; bills: number; months: TaxFeeMonth[] } }

/** The top of Accounting for the last 7 / 30 / 90 days: money in, all costs and what is left, then every cost in its group — each line opens to the entries behind it. */
export function PeriodBreakdown({ days }: { days: number }) {
  const { t } = useTranslation();
  const url = `/api/reborn/admin/accounting/period?days=${days}`;
  const { data } = useQuery<PeriodData>({ queryKey: [url], queryFn: () => apiRequest("GET", url).then((r) => r.json()) });
  if (!data) return null;
  const { report } = data;
  const tile = (label: string, value: string, tone: string) => <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center"><p className="text-[11px] text-white/50">{label}</p><p className={`text-base font-extrabold ${tone}`}>{value}</p></div>;
  return (
    <div className="space-y-2">
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        {tile(t("ar.moneyIn"), money(report.income), "text-emerald-300")}
        {tile(t("ar.costTotal"), money(report.costTotal), "text-red-300")}
        {tile(t("ar.net"), money(report.net), report.net >= 0 ? "text-amber-300" : "text-red-300")}
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        {tile(t("ar.grossProfit"), money(report.grossProfit), "text-white")}
        {tile(t("admin.acc.prizePool"), money(data.prizePool), "text-amber-300")}
      </div>
      {data.taxFees && (
        <div className={card}>
          <p className="text-sm font-bold">{t("ar.taxFees.title")}</p>
          <p className="mb-2 text-[11px] text-white/45">{t("ar.taxFees.hint", { n: String(data.taxFees.bills) })}</p>
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            {tile(t("ar.taxFees.service"), money(data.taxFees.serviceFee), "text-white")}
            {tile(t("ar.taxFees.tax"), money(data.taxFees.tax), "text-white")}
            {tile(t("ar.taxFees.both"), money(data.taxFees.serviceFee + data.taxFees.tax), "text-amber-300")}
          </div>
          {data.taxFees.months.length > 0 && (
            <details className="mt-2 text-xs text-white/70">
              <summary className="cursor-pointer font-semibold">{t("ar.taxFees.byMonth")}</summary>
              <div className="mt-1 space-y-1">
                {data.taxFees.months.map((m) => (
                  <div key={m.month} className="flex items-center justify-between gap-2 rounded-lg bg-black/20 px-2 py-1.5"><span className="font-semibold">{m.month}</span><span className="text-white/50">{m.bills}</span><span>{t("ar.taxFees.service")} {money(m.serviceFee)}</span><span>{t("ar.taxFees.tax")} {money(m.tax)}</span></div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
      <div className={card}><Lines report={report} scope={`days=${days}`} /><p className="mt-2 text-[11px] text-white/40">{t("ar.pool", { n: money(data.prizePool) })}</p></div>
    </div>
  );
}
