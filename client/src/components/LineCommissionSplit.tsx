import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { splitPartsOf, type CommissionPart } from "@shared/itemCommission";

interface Person { id: string; name: string }

// One bill line of several units ("3 beers") shared between the staff who pushed them: each row is a person and how many of the units were theirs.
export function LineCommissionSplit({ itemId, qty, saved, people, invalidateKey }: { itemId: number; qty: number; saved: unknown; people: Person[]; invalidateKey: readonly unknown[] }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [rows, setRows] = useState<{ staffId: string; qty: number }[]>([]);
  const parts: CommissionPart[] = splitPartsOf(saved, qty);
  const used = rows.reduce((sum, row) => sum + (row.staffId ? row.qty : 0), 0);
  const save = useMutation({
    mutationFn: (list: { staffId: string; qty: number }[]) => apiRequest("POST", `/api/reborn/pos/items/${itemId}/commission-split`, { parts: list }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: invalidateKey, exact: true }); setIsOpen(false); },
    onError: (e: any) => toast({ title: t("pos.failed"), description: e.message, variant: "destructive" }),
  });
  const open = () => { setRows(parts.length ? parts.map((p) => ({ staffId: p.staffId, qty: p.qty })) : [{ staffId: "", qty: 1 }]); setIsOpen(true); };
  const setRow = (i: number, patch: Partial<{ staffId: string; qty: number }>) => setRows(rows.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  if (!isOpen) {
    return (
      <div className="pb-1 text-[11px]">
        {parts.length > 0 && <p className="text-pink-200">{parts.map((p) => `${p.name || p.staffId} × ${p.qty}`).join(" · ")}</p>}
        <button type="button" onClick={open} className="rounded-md bg-white/10 px-2 py-1 font-bold text-pink-100">{parts.length ? t("pos.split.edit") : t("pos.split.open", { n: qty })}</button>
      </div>
    );
  }
  return (
    <div className="mb-1 space-y-1.5 rounded-lg bg-black/30 p-2 text-[11px]">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <select value={row.staffId} onChange={(e) => setRow(i, { staffId: e.target.value })} aria-label={t("pos.split.staff")} className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-1.5 py-1 text-white">
            <option value="">{t("pos.split.pick")}</option>
            {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
          <input type="number" min={1} max={qty} value={row.qty} onChange={(e) => setRow(i, { qty: Math.max(1, Math.min(qty, Number(e.target.value) || 1)) })} aria-label={t("pos.split.units")} className="w-14 rounded-md border border-white/10 bg-black/40 px-1.5 py-1 text-white" />
          <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label={t("pos.split.remove")} className="rounded-md bg-white/10 px-2 py-1">×</button>
        </div>
      ))}
      <p className={used > qty ? "text-red-300" : "text-white/50"}>{t("pos.split.count", { used, qty })}</p>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => setRows([...rows, { staffId: "", qty: 1 }])} disabled={used >= qty} className="rounded-md bg-white/10 px-2 py-1 font-bold disabled:opacity-40">{t("pos.split.add")}</button>
        <button type="button" onClick={() => save.mutate(rows.filter((row) => row.staffId))} disabled={used > qty || save.isPending} className="rounded-md bg-pink-500 px-3 py-1 font-bold text-black disabled:opacity-40">{t("itemCom.save")}</button>
        <button type="button" onClick={() => setIsOpen(false)} className="rounded-md bg-white/10 px-2 py-1">{t("menuImage.close")}</button>
      </div>
    </div>
  );
}
