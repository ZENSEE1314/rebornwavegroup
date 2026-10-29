import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation, localeTag } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { money } from "@/lib/money";

interface Row { id: number; userId: string; staffName: string; name: string; qty: number; base: string; amount: string; isSettled: boolean; orderNo: string | null; createdAt: string }
interface Staff { id: string; name: string }
type Filter = "all" | "unpaid" | "paid";
const FILTERS: Filter[] = ["all", "unpaid", "paid"];
const field = "min-w-0 rounded-md border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white";
const chip = (isActive: boolean) => `min-h-[40px] rounded-lg px-3 text-xs font-semibold ${isActive ? "bg-amber-400 text-black" : "bg-white/5 text-white/70 border border-white/10"}`;

// Accounting: every commission earned on items sold in the period, not only the ones already paid. The main admin fixes a wrong person or amount, cancels one, or pays the ticked ones in cash now.
export function CommissionList({ days }: { days: number }) {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [ticked, setTicked] = useState<number[]>([]);
  const { data } = useQuery<{ rows: Row[] }>({ queryKey: ["/api/reborn/admin/item-commissions", "list", days], queryFn: () => apiRequest("GET", `/api/reborn/admin/item-commissions?days=${days}`).then((r) => r.json()) });
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/reborn/pos/staff"] });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["/api/reborn/admin/item-commissions"] }); qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/reborn/admin/accounting") }); };
  const onError = (e: any) => toast({ title: t("itemCom.fail"), description: String(e.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" });
  const edit = useMutation({ mutationFn: (v: { id: number; amount?: number; userId?: string }) => apiRequest("PATCH", `/api/reborn/admin/item-commissions/${v.id}`, v).then(async (r) => { const body = await r.json(); if (!r.ok) throw new Error(body.message); return body; }), onSuccess: () => { refresh(); toast({ title: t("itemCom.saved") }); }, onError });
  const cancel = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/reborn/admin/item-commissions/${id}`).then(async (r) => { const body = await r.json(); if (!r.ok) throw new Error(body.message); return body; }), onSuccess: () => { refresh(); toast({ title: t("itemCom.cancelled") }); }, onError });
  const pay = useMutation({ mutationFn: (ids: number[]) => apiRequest("POST", "/api/reborn/admin/item-commissions/pay", { ids }).then(async (r) => { const body = await r.json(); if (!r.ok) throw new Error(body.message); return body; }), onSuccess: (d: any) => { setTicked([]); refresh(); toast({ title: d.message }); }, onError });

  const rows = (data?.rows ?? []).filter((row) => filter === "all" || (filter === "paid") === row.isSettled);
  const unpaidIds = (data?.rows ?? []).filter((row) => !row.isSettled).map((row) => row.id);
  const tickedRows = (data?.rows ?? []).filter((row) => ticked.includes(row.id) && !row.isSettled);
  const tickedTotal = tickedRows.reduce((sum, row) => sum + Number(row.amount), 0);
  const toggle = (id: number) => setTicked((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
      <p className="font-bold text-sm">{t("cl.title")}</p>
      <p className="text-[11px] text-white/50">{t("cl.intro")}</p>
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => <button key={f} type="button" onClick={() => setFilter(f)} className={chip(filter === f)}>{t(`cl.${f}`)}</button>)}
        {unpaidIds.length > 0 && <button type="button" onClick={() => setTicked(ticked.length === unpaidIds.length ? [] : unpaidIds)} className={chip(false)}>{t("cl.selectAll")}</button>}
      </div>
      {data && rows.length === 0 && <p className="text-xs text-white/40">{t("cl.none")}</p>}
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl bg-black/20 border border-white/10 p-2.5 text-xs">
            <div className="flex items-start gap-2">
              {!row.isSettled && <input type="checkbox" checked={ticked.includes(row.id)} onChange={() => toggle(row.id)} aria-label={t("cl.pay", { n: "1", total: money(row.amount) })} className="mt-1 h-5 w-5 shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="flex justify-between gap-2 font-semibold text-white"><span className="truncate">{row.name} × {row.qty}</span><span className="shrink-0 text-emerald-300">{money(row.amount)}</span></p>
                <p className="text-white/45">{new Date(row.createdAt).toLocaleDateString(localeTag(language))}{row.orderNo ? ` · ${t("cl.bill", { no: row.orderNo })}` : ""} · {t("itemCom.staff")}: {row.staffName} · <span className={row.isSettled ? "text-white/60" : "text-amber-200"}>{row.isSettled ? t("cl.paid") : t("cl.unpaid")}</span></p>
              </div>
            </div>
            {!row.isSettled && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <select value={row.userId} onChange={(e) => edit.mutate({ id: row.id, userId: e.target.value })} aria-label={t("itemCom.staff")} className={field}>
                  {!staff.some((s) => s.id === row.userId) && <option value={row.userId}>{row.staffName}</option>}
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input type="number" inputMode="decimal" min={0} value={drafts[row.id] ?? row.amount} onChange={(e) => setDrafts({ ...drafts, [row.id]: e.target.value })} aria-label={t("itemCom.amount")} className={field + " w-28"} />
                <button type="button" onClick={() => edit.mutate({ id: row.id, amount: Number(drafts[row.id] ?? row.amount) })} className="min-h-[40px] rounded-lg bg-amber-400 px-3 font-bold text-black">{t("itemCom.save")}</button>
                <button type="button" onClick={() => window.confirm(t("itemCom.cancelConfirm")) && cancel.mutate(row.id)} className="min-h-[40px] rounded-lg bg-red-500/20 px-3 font-bold text-red-100">{t("itemCom.cancel")}</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {tickedRows.length > 0 && (
        <button type="button" disabled={pay.isPending} onClick={() => window.confirm(t("cl.payConfirm", { total: money(tickedTotal) })) && pay.mutate(tickedRows.map((row) => row.id))} className="min-h-[44px] w-full rounded-lg bg-emerald-500 px-4 text-sm font-bold text-black disabled:opacity-40">{t("cl.pay", { n: String(tickedRows.length), total: money(tickedTotal) })}</button>
      )}
    </div>
  );
}
