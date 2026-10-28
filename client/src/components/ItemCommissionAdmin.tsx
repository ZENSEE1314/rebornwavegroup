import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { money } from "@/lib/money";

interface Row { id: number; userId: string; staffName: string; itemId: number; name: string; qty: number; base: string; amount: string; isSettled: boolean }
interface Staff { id: string; name: string }
interface BillItem { id: number; name: string; qty: number; lineTotal: string }
type Kind = "percent" | "amount";
interface AddDraft { staffId: string; kind: Kind; value: string }
const EMPTY_DRAFT: AddDraft = { staffId: "", kind: "percent", value: "" };

// Main admin: open one paid sale, see every item with its price, and set, change or cancel the commission on each item (who earns it, a % or a fixed amount). Payroll and accounting follow.
export function ItemCommissionAdmin({ ticketId }: { ticketId: number }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [adds, setAdds] = useState<Record<number, AddDraft>>({});
  const { data } = useQuery<{ items: BillItem[]; rows: Row[] }>({ queryKey: ["/api/reborn/admin/item-commissions", ticketId], queryFn: () => apiRequest("GET", `/api/reborn/admin/item-commissions?ticketId=${ticketId}`).then((r) => r.json()), enabled: isOpen });
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/reborn/pos/staff"], enabled: isOpen });
  const refresh = () => qc.invalidateQueries({ queryKey: ["/api/reborn/admin/item-commissions"] });
  const onError = (e: any) => toast({ title: t("itemCom.fail"), description: e.message, variant: "destructive" });
  const edit = useMutation({ mutationFn: (v: { id: number; amount?: number; userId?: string }) => apiRequest("PATCH", `/api/reborn/admin/item-commissions/${v.id}`, v).then((r) => r.json()), onSuccess: () => { refresh(); toast({ title: t("itemCom.saved") }); }, onError });
  const cancel = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/reborn/admin/item-commissions/${id}`).then((r) => r.json()), onSuccess: () => { refresh(); toast({ title: t("itemCom.cancelled") }); }, onError });
  const add = useMutation({ mutationFn: (v: { itemId: number; userId: string; percent?: number; amount?: number }) => apiRequest("POST", "/api/reborn/admin/item-commissions", v).then((r) => r.json()), onSuccess: (_r, v) => { refresh(); setAdds((prev) => ({ ...prev, [v.itemId]: EMPTY_DRAFT })); toast({ title: t("itemCom.saved") }); }, onError });

  if (!isOpen) {
    return <button type="button" onClick={() => setIsOpen(true)} className="mt-1.5 rounded-lg bg-amber-500/15 px-2.5 py-1.5 text-[11px] font-bold text-amber-100">{t("itemCom.editSale")}</button>;
  }
  const rows = data?.rows ?? [];
  const billItems = data?.items ?? [];
  const draftOf = (itemId: number) => adds[itemId] ?? EMPTY_DRAFT;
  const setDraft = (itemId: number, patch: Partial<AddDraft>) => setAdds({ ...adds, [itemId]: { ...draftOf(itemId), ...patch } });
  return (
    <div className="mt-2 rounded-2xl border border-amber-400/25 bg-amber-500/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-amber-100">{t("itemCom.editTitle")}</p>
        <button onClick={() => setIsOpen(false)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold">{t("menuImage.close")}</button>
      </div>
      <p className="mt-1 text-xs text-white/45">{t("itemCom.editDesc")}</p>
      <ul className="mt-3 space-y-2">
        {billItems.map((item) => {
          const lineRows = rows.filter((row) => row.itemId === item.id);
          const draft = draftOf(item.id);
          const isReady = draft.staffId !== "" && draft.value !== "";
          return (
            <li key={item.id} className="rounded-xl bg-white/5 p-2.5 text-xs">
              <p className="flex justify-between gap-2 font-semibold text-white"><span>{item.name} × {item.qty}</span><span>{money(item.lineTotal)}</span></p>
              {lineRows.map((row) => row.isSettled ? (
                <p key={row.id} className="mt-1 text-white/50">{row.staffName} · {money(row.amount)} · {t("itemCom.paidOut")}</p>
              ) : (
                <div key={row.id} className="mt-1.5 flex flex-wrap items-center gap-2">
                  <select value={row.userId} onChange={(e) => edit.mutate({ id: row.id, userId: e.target.value })} aria-label={t("itemCom.staff")} className="min-w-0 rounded-md border border-white/15 bg-black/40 px-1.5 py-1 text-white">
                    {!staff.some((s) => s.id === row.userId) && <option value={row.userId}>{row.staffName}</option>}
                    {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input type="number" min={0} value={drafts[row.id] ?? row.amount} onChange={(e) => setDrafts({ ...drafts, [row.id]: e.target.value })} aria-label={t("itemCom.amount")} className="w-28 rounded-md border border-white/15 bg-black/40 px-2 py-1 text-white" />
                  <button onClick={() => edit.mutate({ id: row.id, amount: Number(drafts[row.id] ?? row.amount) })} className="rounded-lg bg-amber-400 px-3 py-1 font-bold text-black">{t("itemCom.save")}</button>
                  <button onClick={() => window.confirm(t("itemCom.cancelConfirm")) && cancel.mutate(row.id)} className="rounded-lg bg-red-500/20 px-3 py-1 font-bold text-red-100">{t("itemCom.cancel")}</button>
                </div>
              ))}
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <select value={draft.staffId} onChange={(e) => setDraft(item.id, { staffId: e.target.value })} aria-label={t("itemCom.pickStaff")} className="min-w-0 rounded-md border border-white/15 bg-black/40 px-1.5 py-1 text-white">
                  <option value="">{lineRows.length ? t("itemCom.addAnother") : t("itemCom.pickStaff")}</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={draft.kind} onChange={(e) => setDraft(item.id, { kind: e.target.value as Kind })} aria-label={t("itemCom.kind")} className="rounded-md border border-white/15 bg-black/40 px-1.5 py-1 text-white">
                  <option value="percent">%</option>
                  <option value="amount">{t("itemCom.amount")}</option>
                </select>
                <input type="number" min={0} max={draft.kind === "percent" ? 100 : undefined} value={draft.value} onChange={(e) => setDraft(item.id, { value: e.target.value })} aria-label={t("itemCom.value")} className="w-24 rounded-md border border-white/15 bg-black/40 px-2 py-1 text-white" />
                <button disabled={!isReady || add.isPending} onClick={() => add.mutate({ itemId: item.id, userId: draft.staffId, [draft.kind]: Number(draft.value) })} className="rounded-lg bg-amber-400 px-3 py-1 font-bold text-black disabled:opacity-40">{t("itemCom.add")}</button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
