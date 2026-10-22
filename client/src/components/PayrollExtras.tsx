// Admin › Payroll: (1) the months when leave and MC are not paid and how many days of pay a month has, (2) the police / security money paid this month.
// The police money is saved as an expense of the kind "police" (the same record as in Admin › Expenses), so it is accountable, can be voided with a reason and shows under Staff in the reports.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { money } from "@/lib/money";

const card = "rounded-2xl bg-white/5 border border-white/10 p-4";
const field = "min-w-0 w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400/60";
const MAX_PAY_DAYS = 31;

export interface LeaveRules { noLeaveMonths: string[]; payDays: number }

export function LeaveRulesCard({ rules }: { rules?: LeaveRules }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [months, setMonths] = useState<string[]>(rules?.noLeaveMonths ?? []);
  const [payDays, setPayDays] = useState(String(rules?.payDays ?? 26));
  const [adding, setAdding] = useState("");
  useEffect(() => { setMonths(rules?.noLeaveMonths ?? []); setPayDays(String(rules?.payDays ?? 26)); }, [rules]);
  const save = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/reborn/admin/payroll/leave-rules", { noLeaveMonths: months, payDays: Number(payDays) }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; }),
    onSuccess: () => { toast({ title: t("lr.saved") }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/payroll"] }); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: String(e.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" }),
  });
  const add = () => { if (adding && !months.includes(adding)) setMonths([...months, adding].sort()); setAdding(""); };
  return (
    <div className={card + " space-y-3"}>
      <h3 className="font-extrabold">{t("lr.title")}</h3>
      <p className="text-[11px] text-white/50">{t("lr.hint")}</p>
      <div className="flex flex-wrap gap-2">
        {months.length === 0 && <span className="text-xs text-white/40">{t("lr.none")}</span>}
        {months.map((month) => (
          <span key={month} className="inline-flex items-center gap-1 rounded-full bg-red-400/15 px-3 py-1.5 text-xs text-red-200">{month}
            <button type="button" aria-label={t("lr.remove", { month })} onClick={() => setMonths(months.filter((m) => m !== month))} className="min-h-0 p-0"><X className="w-3.5 h-3.5" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2 items-end">
        <label className="text-[11px] text-white/50">{t("lr.addMonth")}<input type="month" value={adding} onChange={(e) => setAdding(e.target.value)} className={field + " mt-1"} style={{ colorScheme: "dark" }} /></label>
        <button type="button" onClick={add} disabled={!adding} className="min-h-[44px] px-4 rounded-lg bg-white/10 text-xs font-semibold disabled:opacity-40">{t("lr.add")}</button>
      </div>
      <label className="block text-[11px] text-white/50">{t("lr.payDays")}
        <input type="number" inputMode="numeric" min={1} max={MAX_PAY_DAYS} value={payDays} onChange={(e) => setPayDays(e.target.value)} className={field + " mt-1 w-28"} />
      </label>
      <button type="button" onClick={() => save.mutate()} disabled={save.isPending} className="min-h-[44px] px-5 rounded-lg bg-amber-400 text-black text-sm font-bold disabled:opacity-40">{t("lr.save")}</button>
    </div>
  );
}

interface PoliceRow { id: number; amount: string; spentOn: string; payee?: string | null; note?: string | null; status: string; uploadedByName?: string | null; voidReason?: string | null; category: string }
interface PoliceList { expenses: PoliceRow[]; canVoid: boolean }

export function PoliceMoneyCard({ month }: { month: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ amount: "", payee: "", spentOn: today, note: "", payMethod: "" });
  const [voiding, setVoiding] = useState<PoliceRow | null>(null);
  const [reason, setReason] = useState("");
  const url = `/api/reborn/expenses?month=${month}`;
  const { data } = useQuery<PoliceList>({ queryKey: [url], queryFn: () => apiRequest("GET", url).then((r) => r.json()) });
  const rows = (data?.expenses || []).filter((row) => row.category === "police");
  const total = rows.filter((row) => row.status === "active").reduce((sum, row) => sum + Number(row.amount), 0);
  const refresh = () => qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/reborn/expenses") });
  const fail = (e: any) => toast({ title: t("admin.c.failed"), description: String(e.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" });
  const save = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/expenses", { category: "police", amount: Number(form.amount), spentOn: form.spentOn, payee: form.payee, note: form.note, payMethod: form.payMethod }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; }),
    onSuccess: () => { toast({ title: t("ex.saved") }); setForm({ ...form, amount: "", payee: "", note: "", payMethod: "" }); refresh(); },
    onError: fail,
  });
  const voidIt = useMutation({
    mutationFn: () => apiRequest("POST", `/api/reborn/expenses/${voiding!.id}/void`, { reason }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; }),
    onSuccess: () => { toast({ title: t("ex.voidedToast") }); setVoiding(null); setReason(""); refresh(); },
    onError: fail,
  });
  return (
    <div className={card + " space-y-3"}>
      <h3 className="font-extrabold flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-sky-300" /> {t("pm.title")}</h3>
      <p className="text-[11px] text-white/50">{t("pm.hint")}</p>
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <label className="text-[11px] text-white/50">{t("ex.amount")}<input type="number" inputMode="numeric" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={field + " mt-1"} /></label>
        <label className="text-[11px] text-white/50">{t("pm.paidTo")}<input value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} className={field + " mt-1"} /></label>
        <label className="text-[11px] text-white/50">{t("ex.date")}<input type="date" max={today} value={form.spentOn} onChange={(e) => setForm({ ...form, spentOn: e.target.value })} className={field + " mt-1"} style={{ colorScheme: "dark" }} /></label>
        <label className="text-[11px] text-white/50">{t("ex.payMethod")}<select value={form.payMethod} onChange={(e) => setForm({ ...form, payMethod: e.target.value })} className={field + " mt-1"}><option value="">—</option><option value="cash">{t("ex.pm.cash")}</option><option value="card">{t("ex.pm.card")}</option></select></label>
        <label className="text-[11px] text-white/50">{t("ex.note")}<input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={field + " mt-1"} /></label>
      </div>
      <button type="button" onClick={() => save.mutate()} disabled={save.isPending || !(Number(form.amount) > 0) || !form.note.trim() || !form.payMethod} className="min-h-[44px] px-5 rounded-lg bg-sky-300 text-black text-sm font-bold disabled:opacity-40">{t("pm.save")}</button>
      <p className="text-sm font-black text-amber-200">{t("pm.total", { n: money(total) })}</p>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.id} className={`rounded-xl border border-white/10 p-2.5 text-xs ${row.status === "voided" ? "opacity-50" : "bg-black/20"}`}>
            <div className="flex justify-between gap-2"><span className="font-semibold">{row.spentOn}{row.payee ? ` · ${row.payee}` : ""}</span><span className={`font-black ${row.status === "voided" ? "line-through" : "text-amber-200"}`}>{money(Number(row.amount))}</span></div>
            <p className="text-white/50">{row.uploadedByName ? t("ex.by", { name: row.uploadedByName }) : ""}{row.note ? ` · ${row.note}` : ""}</p>
            {row.status === "voided" && <p className="text-red-300">{t("ex.voided", { reason: row.voidReason || "" })}</p>}
            {data?.canVoid && row.status === "active" && <button type="button" onClick={() => { setVoiding(row); setReason(""); }} className="mt-1 min-h-0 p-0 text-red-300 underline">{t("ex.void")}</button>}
          </div>
        ))}
        {rows.length === 0 && <p className="text-xs text-white/40">{t("pm.none")}</p>}
      </div>
      {voiding && (
        <div className="space-y-2 rounded-xl border border-red-400/30 p-3">
          <p className="text-sm font-semibold">{t("ex.voidAsk", { what: `${voiding.spentOn} ${money(Number(voiding.amount))}` })}</p>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("ex.voidReason")} aria-label={t("ex.voidReason")} className={field} />
          <div className="flex gap-2">
            <button type="button" onClick={() => voidIt.mutate()} disabled={!reason.trim() || voidIt.isPending} className="min-h-[44px] px-4 rounded-lg bg-red-400 text-black text-sm font-bold disabled:opacity-40">{t("ex.void")}</button>
            <button type="button" onClick={() => setVoiding(null)} className="min-h-[44px] px-4 rounded-lg bg-white/10 text-sm">{t("ex.cancel")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
