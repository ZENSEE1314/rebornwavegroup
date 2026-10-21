// Admin › Daily sales: how much the venue must earn today to cover its running costs (the card), and Admin › Accounting: where those running costs are typed (the panel).
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Target, Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { money } from "@/lib/money";
import { FIXED_COST_CATEGORIES, FIXED_COST_PERIODS, MAX_FIXED_COSTS, type FixedCost, type MonthlyActuals } from "@shared/fixedCosts";

const card = "rounded-2xl bg-white/5 border border-white/10 p-4";
const field = "min-w-0 px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400/60";
const PERCENT = 100;

interface Target {
  day: string; perDay: number; lines: { id: string; name: string; daily: number; isPending: boolean; isActual: boolean }[]; pending: string[];
  margin: number | null; needSales: number | null; needProfit: number; salesToday: number; costToday: number; profitToday: number; isCovered: boolean;
}

function Bar({ value, total, isDone }: { value: number; total: number; isDone: boolean }) {
  const share = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;
  return <div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className={`h-full transition-all ${isDone ? "bg-emerald-400" : "bg-amber-400"}`} style={{ width: `${share * PERCENT}%` }} /></div>;
}

export function DailyTargetCard({ day }: { day: string }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const url = `/api/reborn/manager/daily-target${day ? `?day=${day}` : ""}`;
  const { data } = useQuery<Target>({ queryKey: [url], queryFn: () => apiRequest("GET", url).then((r) => r.json()), refetchInterval: 30000 });
  if (!data) return null;
  if (data.perDay <= 0) return <div className={card}><h3 className="font-extrabold flex items-center gap-2"><Target className="w-5 h-5 text-amber-300" /> {t("dt.title")}</h3><p className="mt-2 text-xs text-white/50">{t("dt.noCosts")}</p>{data.pending.length > 0 && <p className="mt-1 text-[11px] text-amber-200">{t("dt.pending", { names: data.pending.join(", ") })}</p>}</div>;
  const salesRemaining = data.needSales === null ? null : Math.max(0, data.needSales - data.salesToday);
  return (
    <div className={card}>
      <h3 className="font-extrabold flex items-center gap-2"><Target className="w-5 h-5 text-amber-300" /> {t("dt.title")}</h3>
      <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <div className="rounded-xl bg-black/30 border border-white/10 p-3"><p className="text-[11px] text-white/50">{t("dt.costsPerDay")}</p><p className="text-lg font-black text-amber-200">{money(data.perDay)}</p></div>
        <div className="rounded-xl bg-black/30 border border-white/10 p-3"><p className="text-[11px] text-white/50">{t("dt.needSales")}</p><p className="text-lg font-black text-emerald-200">{data.needSales === null ? "—" : money(data.needSales)}</p></div>
      </div>
      {data.needSales !== null ? (
        <div className="mt-3 space-y-1">
          <Bar value={data.salesToday} total={data.needSales} isDone={data.salesToday >= data.needSales} />
          <p className="text-xs text-white/70">{t("dt.soldSoFar", { sold: money(data.salesToday), need: money(data.needSales) })}{salesRemaining ? ` · ${t("dt.left", { n: money(salesRemaining) })}` : ""}</p>
          <p className="text-[11px] text-white/40">{t("dt.margin", { n: Math.round((data.margin || 0) * PERCENT) })}</p>
        </div>
      ) : <p className="mt-3 text-[11px] text-amber-200">{t("dt.noMargin", { n: money(data.needProfit) })}</p>}
      <div className="mt-3 space-y-1">
        <Bar value={data.profitToday} total={data.needProfit} isDone={data.isCovered} />
        <p className={`text-xs ${data.isCovered ? "text-emerald-300 font-semibold" : "text-white/70"}`}>{data.isCovered ? t("dt.covered") : t("dt.profitSoFar", { profit: money(data.profitToday), need: money(data.needProfit) })}</p>
        <p className="text-[11px] text-white/40">{t("dt.profitNote", { cost: money(data.costToday) })}</p>
      </div>
      {data.pending.length > 0 && <p className="mt-2 text-[11px] text-amber-200">{t("dt.pending", { names: data.pending.join(", ") })}</p>}
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="mt-2 min-h-0 p-0 text-[11px] text-white/50 underline">{t("dt.lines")} {isOpen ? "▲" : "▼"}</button>
      {isOpen && <div className="mt-1 space-y-0.5">{data.lines.map((line) => <div key={line.id} className="flex justify-between text-[11px] text-white/60"><span className="truncate">{line.name}{line.isActual ? ` · ${t("dt.actual")}` : ""}</span><span>{line.isPending ? t("dt.notYet") : money(line.daily)}</span></div>)}</div>}
    </div>
  );
}

interface FixedCostsData { month: string; costs: FixedCost[]; actuals: MonthlyActuals; salaryFromPayroll: boolean; payrollMonthly: number; paidThisMonth: Record<string, number> }

export function FixedCostsPanel() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data } = useQuery<FixedCostsData>({ queryKey: ["/api/reborn/admin/fixed-costs"], queryFn: () => apiRequest("GET", "/api/reborn/admin/fixed-costs").then((r) => r.json()) });
  const [costs, setCosts] = useState<FixedCost[] | null>(null);
  const [fromPayroll, setFromPayroll] = useState<boolean | null>(null);
  const [bills, setBills] = useState<Record<string, string>>({});
  useEffect(() => { setCosts(null); setFromPayroll(null); }, [data]);
  const list = costs ?? data?.costs ?? [];
  const useSalary = fromPayroll ?? data?.salaryFromPayroll ?? false;
  const refresh = () => { qc.invalidateQueries({ queryKey: ["/api/reborn/admin/fixed-costs"] }); qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).includes("/api/reborn/manager/daily-target") }); };
  const save = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/reborn/admin/fixed-costs", { costs: list, salaryFromPayroll: useSalary }).then((r) => r.json()),
    onSuccess: () => { toast({ title: t("fc.saved") }); refresh(); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: String(e.message || ""), variant: "destructive" }),
  });
  const saveBill = useMutation({
    mutationFn: (v: { id: string; amount: number | null }) => apiRequest("PUT", "/api/reborn/admin/fixed-costs/actual", { month: data!.month, id: v.id, amount: v.amount }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; }),
    onSuccess: () => { toast({ title: t("fc.billSaved") }); refresh(); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: String(e.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" }),
  });
  if (!data) return null;
  const update = (id: string, patch: Partial<FixedCost>) => setCosts(list.map((cost) => (cost.id === id ? { ...cost, ...patch } : cost)));
  const add = () => setCosts([...list, { id: `c${Date.now().toString(36)}`, name: "", category: "other", amount: null, period: "monthly", isCounted: true }]);
  return (
    <div className={card + " space-y-3"}>
      <h3 className="font-extrabold flex items-center gap-2"><Target className="w-5 h-5 text-amber-300" /> {t("fc.title")}</h3>
      <p className="text-[11px] text-white/50">{t("fc.intro")}</p>
      <label className="flex items-center gap-2 rounded-xl border border-white/10 p-3 text-sm"><input type="checkbox" checked={useSalary} onChange={(e) => setFromPayroll(e.target.checked)} /> {t("fc.salary", { n: money(data.payrollMonthly) })}</label>
      {list.map((cost) => {
        const bill = data.actuals[data.month]?.[cost.id];
        const paid = data.paidThisMonth[cost.id] || 0;
        return (
          <div key={cost.id} className="rounded-xl border border-white/10 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input value={cost.name} onChange={(e) => update(cost.id, { name: e.target.value })} placeholder={t("fc.name")} aria-label={t("fc.name")} className={field + " flex-1"} />
              <button type="button" onClick={() => setCosts(list.filter((item) => item.id !== cost.id))} aria-label={t("fc.remove")} className="w-9 h-9 p-0 flex items-center justify-center shrink-0 text-white/50 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={cost.category} onChange={(e) => update(cost.id, { category: e.target.value as FixedCost["category"] })} aria-label={t("fc.category")} className={field}>{FIXED_COST_CATEGORIES.map((c) => <option key={c} value={c}>{t(`fc.cat.${c}`)}</option>)}</select>
              <select value={cost.period} onChange={(e) => update(cost.id, { period: e.target.value as FixedCost["period"] })} aria-label={t("fc.period")} className={field}>{FIXED_COST_PERIODS.map((p) => <option key={p} value={p}>{t(`fc.per.${p}`)}</option>)}</select>
              <input type="number" inputMode="numeric" min={0} value={cost.amount ?? ""} onChange={(e) => update(cost.id, { amount: e.target.value === "" ? null : Number(e.target.value) })} placeholder={t("fc.amountPh")} aria-label={t("fc.amount")} className={field + " w-40"} />
            </div>
            <label className="flex items-center gap-2 text-xs text-white/70"><input type="checkbox" checked={cost.isCounted} onChange={(e) => update(cost.id, { isCounted: e.target.checked })} /> {t("fc.counted")}</label>
            {cost.period === "monthly" && (
              <div className="rounded-lg bg-black/20 p-2 space-y-1">
                <p className="text-[11px] text-white/50">{t("fc.thisMonth", { month: data.month })}{bill !== undefined ? ` · ${money(bill)}` : cost.amount === null ? ` · ${t("fc.waiting")}` : ""}{paid > 0 ? ` · ${t("fc.paid", { n: money(paid) })}` : ""}</p>
                <div className="flex gap-2">
                  <input type="number" inputMode="numeric" min={0} value={bills[cost.id] ?? ""} onChange={(e) => setBills({ ...bills, [cost.id]: e.target.value })} placeholder={t("fc.billPh")} aria-label={t("fc.bill")} className={field + " w-40"} />
                  <button type="button" disabled={saveBill.isPending || (bills[cost.id] ?? "") === ""} onClick={() => saveBill.mutate({ id: cost.id, amount: Number(bills[cost.id]) })} className="min-h-[40px] px-3 rounded-lg bg-white/10 text-xs font-semibold disabled:opacity-40">{t("fc.setBill")}</button>
                  {bill !== undefined && <button type="button" onClick={() => saveBill.mutate({ id: cost.id, amount: null })} className="min-h-[40px] px-3 rounded-lg bg-white/5 text-xs text-white/60">{t("fc.clearBill")}</button>}
                </div>
              </div>
            )}
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={add} disabled={list.length >= MAX_FIXED_COSTS} className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg bg-white/10 text-sm font-semibold disabled:opacity-40"><Plus className="w-4 h-4" /> {t("fc.add")}</button>
        <button type="button" onClick={() => save.mutate()} disabled={save.isPending} className="min-h-[44px] px-5 rounded-lg bg-amber-400 text-black text-sm font-bold disabled:opacity-40">{t("fc.save")}</button>
      </div>
    </div>
  );
}
