// Admin › Accounting (main admin): clear every old accounting line and start again from the inventory — each stock
// delivery becomes one purchase expense. The old lines are kept as a downloadable backup first.
import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Download } from "lucide-react";
import { useTranslation, localeTag } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { money } from "@/lib/money";

const API = "/api/reborn/admin/accounting";

async function downloadBackup(id: number) {
  const rows = await apiRequest("GET", `${API}/backups/${id}`).then((r) => r.json());
  const url = URL.createObjectURL(new Blob([JSON.stringify(rows, null, 1)], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = `accounting-backup-${id}.json`; a.click(); URL.revokeObjectURL(url);
}

export default function AccountingFresh() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState(false);
  const { data: p } = useQuery<any>({ queryKey: [`${API}/reset-preview`], queryFn: () => apiRequest("GET", `${API}/reset-preview`).then((r) => r.json()), enabled: open });
  const run = useMutation({
    mutationFn: () => apiRequest("POST", `${API}/reset`, { confirm: true }).then((r) => r.json()),
    onSuccess: (d: any) => {
      setAsking(false);
      toast({ title: d.message });
      qc.invalidateQueries({ queryKey: [API] });
      for (const key of [`${API}/summary`, `${API}/ledger`, `${API}/closings`, `${API}/by-industry`, `${API}/reset-preview`]) qc.invalidateQueries({ queryKey: [key] });
    },
    onError: (e: any) => { setAsking(false); toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }); },
  });

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-2 text-left">
        <span className="font-bold text-sm flex items-center gap-2"><RotateCcw className="w-4 h-4 text-amber-300" /> {t("admin.fresh.title")}</span>
        <span className="text-xs text-white/50">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-[12px] text-white/60">{t("admin.fresh.desc")}</p>
          {p ? (
            <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="rounded-xl bg-red-500/10 border border-red-400/30 p-3">
                <p className="text-[11px] text-white/50">{t("admin.fresh.removed")}</p>
                <p className="text-lg font-extrabold text-red-200">{p.oldRows}</p>
                <p className="text-[11px] text-white/50">{t("admin.fresh.oldTotals", { income: money(p.oldIncome), expense: money(p.oldExpense) })}</p>
              </div>
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/30 p-3">
                <p className="text-[11px] text-white/50">{t("admin.fresh.added")}</p>
                <p className="text-lg font-extrabold text-emerald-200">{p.purchases}</p>
                <p className="text-[11px] text-white/50">{money(p.purchaseTotal)}{p.skipped ? ` · ${t("admin.fresh.skipped", { n: String(p.skipped) })}` : ""}</p>
              </div>
            </div>
          ) : <p className="text-xs text-white/40">…</p>}
          <p className="text-[11px] text-white/50">{t("admin.fresh.kept")}</p>
          {p?.lastBackup && (
            <button onClick={() => downloadBackup(p.lastBackup.id)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white/5 border border-white/10">
              <Download className="w-3.5 h-3.5" /> {t("admin.fresh.download", { when: new Date(p.lastBackup.createdAt).toLocaleString(localeTag()), n: String(p.lastBackup.rowCount) })}
            </button>
          )}
          <button onClick={() => setAsking(true)} disabled={!p || run.isPending} className="w-full min-h-[44px] rounded-lg text-sm font-bold text-red-100 bg-red-500/25 border border-red-400/50 disabled:opacity-50">{t("admin.fresh.button")}</button>
        </div>
      )}
      {asking && p && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 text-white" onClick={() => !run.isPending && setAsking(false)}>
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-red-400/40 bg-[#160f2a] p-4" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold mb-2">{t("admin.fresh.confirmTitle")}</p>
            <p className="text-sm text-white/70 mb-4">{t("admin.fresh.confirmText", { removed: String(p.oldRows), added: String(p.purchases), total: money(p.purchaseTotal) })}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAsking(false)} disabled={run.isPending} className="min-h-[44px] px-4 rounded-lg text-sm font-semibold bg-white/10 border border-white/15">{t("admin.cnt.back")}</button>
              <button onClick={() => run.mutate()} disabled={run.isPending} className="min-h-[44px] px-5 rounded-lg text-sm font-bold bg-red-500 text-white disabled:opacity-50">{t("admin.fresh.confirmBtn")}</button>
            </div>
          </div>
        </div>, document.body)}
    </div>
  );
}
