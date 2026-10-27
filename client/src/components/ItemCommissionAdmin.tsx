import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { money } from "@/lib/money";

interface Row { id: number; userId: string; staffName: string; ticketId: number; orderNo: string | null; name: string; qty: number; base: string; amount: string; createdAt: string; isSettled: boolean }
interface Staff { id: string; name: string }
const PERIOD_DAYS = 31;

// Main admin: review the commission each staff member earned on single items of a bill, change who earns it or how much, or cancel it. Payroll and accounting follow.
export function ItemCommissionAdmin() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [percentDraft, setPercentDraft] = useState("");
  const key = ["/api/reborn/admin/item-commissions", PERIOD_DAYS];
  const { data } = useQuery<{ pushPercent: number; rows: Row[] }>({ queryKey: key, queryFn: () => apiRequest("GET", `/api/reborn/admin/item-commissions?days=${PERIOD_DAYS}`).then((r) => r.json()), enabled: isOpen });
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/reborn/pos/staff"], enabled: isOpen });
  const refresh = () => qc.invalidateQueries({ queryKey: ["/api/reborn/admin/item-commissions"] });
  const onError = (e: any) => toast({ title: t("itemCom.fail"), description: e.message, variant: "destructive" });
  const edit = useMutation({ mutationFn: (v: { id: number; amount?: number; userId?: string }) => apiRequest("PATCH", `/api/reborn/admin/item-commissions/${v.id}`, v).then((r) => r.json()), onSuccess: () => { refresh(); toast({ title: t("itemCom.saved") }); }, onError });
  const cancel = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/reborn/admin/item-commissions/${id}`).then((r) => r.json()), onSuccess: () => { refresh(); toast({ title: t("itemCom.cancelled") }); }, onError });
  const setPercent = useMutation({ mutationFn: (percent: number) => apiRequest("POST", "/api/reborn/admin/item-commissions-percent", { percent }).then((r) => r.json()), onSuccess: () => { refresh(); toast({ title: t("itemCom.saved") }); }, onError });

  if (!isOpen) {
    return (
      <div className="mb-4 max-w-2xl rounded-2xl border border-amber-400/25 bg-amber-500/5 p-3 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div className="mb-3 sm:mb-0"><p className="text-sm font-bold text-amber-100">{t("itemCom.title")}</p><p className="text-xs text-white/45">{t("itemCom.desc")}</p></div>
        <button onClick={() => setIsOpen(true)} className="w-full rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-2.5 text-sm font-bold text-amber-100 sm:w-auto">{t("itemCom.open")}</button>
      </div>
    );
  }
  const rows = data?.rows ?? [];
  return (
    <div className="mb-4 max-w-2xl rounded-2xl border border-amber-400/25 bg-amber-500/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-amber-100">{t("itemCom.title")}</p>
        <button onClick={() => setIsOpen(false)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold">{t("menuImage.close")}</button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/70">
        <label htmlFor="push-percent">{t("itemCom.pushPercent")}</label>
        <input id="push-percent" type="number" min={0} max={100} value={percentDraft || String(data?.pushPercent ?? "")} onChange={(e) => setPercentDraft(e.target.value)} className="w-20 rounded-md border border-white/15 bg-black/40 px-2 py-1 text-white" />
        <button onClick={() => setPercent.mutate(Number(percentDraft || data?.pushPercent || 0))} className="rounded-lg bg-amber-400 px-3 py-1.5 font-bold text-black">{t("itemCom.save")}</button>
      </div>
      {rows.length === 0 ? <p className="mt-3 text-xs text-white/50">{t("itemCom.none")}</p> : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="rounded-xl bg-white/5 p-2.5 text-xs">
              <p className="font-semibold text-white">{row.name} × {row.qty} <span className="font-normal text-white/50">· {row.orderNo || `#${row.ticketId}`} · {money(row.base)}</span></p>
              {row.isSettled ? <p className="mt-1 text-white/50">{row.staffName} · {money(row.amount)} · {t("itemCom.paidOut")}</p> : (
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <select value={row.userId} onChange={(e) => edit.mutate({ id: row.id, userId: e.target.value })} aria-label={t("itemCom.staff")} className="min-w-0 rounded-md border border-white/15 bg-black/40 px-1.5 py-1 text-white">
                    {!staff.some((s) => s.id === row.userId) && <option value={row.userId}>{row.staffName}</option>}
                    {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input type="number" min={0} value={drafts[row.id] ?? row.amount} onChange={(e) => setDrafts({ ...drafts, [row.id]: e.target.value })} aria-label={t("itemCom.amount")} className="w-28 rounded-md border border-white/15 bg-black/40 px-2 py-1 text-white" />
                  <button onClick={() => edit.mutate({ id: row.id, amount: Number(drafts[row.id] ?? row.amount) })} className="rounded-lg bg-amber-400 px-3 py-1 font-bold text-black">{t("itemCom.save")}</button>
                  <button onClick={() => window.confirm(t("itemCom.cancelConfirm")) && cancel.mutate(row.id)} className="rounded-lg bg-red-500/20 px-3 py-1 font-bold text-red-100">{t("itemCom.cancel")}</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
