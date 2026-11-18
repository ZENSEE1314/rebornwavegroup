// Admin › Accounting: stock deliveries booked as a purchase expense before the item was ticked "Cost is already in the expenses".
// Removes only the expense line (a backup is kept first); the stock stays as it is.
import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eraser } from "lucide-react";
import { useTranslation, localeTag } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { money } from "@/lib/money";

const API = "/api/reborn/admin/accounting";
const PREVIEW_KEY = `${API}/ticked-purchases`;
const SHOWN_LINES = 8;

export default function TickedPurchases() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState(false);
  const { data: p } = useQuery<any>({ queryKey: [PREVIEW_KEY], queryFn: () => apiRequest("GET", PREVIEW_KEY).then((r) => r.json()), enabled: open });
  const run = useMutation({
    mutationFn: () => apiRequest("POST", `${PREVIEW_KEY}/remove`, { confirm: true }).then((r) => r.json()),
    onSuccess: (d: any) => {
      setAsking(false);
      toast({ title: d.message });
      for (const key of [PREVIEW_KEY, `${API}/summary`, `${API}/ledger`, `${API}/period`, `${API}/monthly`, `${API}/overall`]) qc.invalidateQueries({ queryKey: [key] });
    },
    onError: (e: any) => { setAsking(false); toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }); },
  });

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-2 text-left">
        <span className="font-bold text-sm flex items-center gap-2"><Eraser className="w-4 h-4 text-amber-300" /> {t("admin.ticked.title")}</span>
        <span className="text-xs text-white/50">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-[12px] text-white/60">{t("admin.ticked.desc")}</p>
          {p ? (
            <>
              <div className="rounded-xl bg-red-500/10 border border-red-400/30 p-3">
                <p className="text-lg font-extrabold text-red-200">{p.count}</p>
                <p className="text-[11px] text-white/50">{money(p.total)}</p>
              </div>
              <ul className="space-y-1 text-[11px] text-white/60">
                {p.lines.slice(0, SHOWN_LINES).map((l: any) => (
                  <li key={l.id}>{new Date(l.createdAt).toLocaleDateString(localeTag())} · {l.note || l.productName} · {money(Number(l.amount))}</li>
                ))}
                {p.count > SHOWN_LINES && <li>… +{p.count - SHOWN_LINES}</li>}
              </ul>
            </>
          ) : <p className="text-xs text-white/40">…</p>}
          <p className="text-[11px] text-white/50">{t("admin.ticked.kept")}</p>
          <button onClick={() => setAsking(true)} disabled={!p || p.count === 0 || run.isPending} className="w-full min-h-[44px] rounded-lg text-sm font-bold text-red-100 bg-red-500/25 border border-red-400/50 disabled:opacity-50">{t("admin.ticked.button")}</button>
        </div>
      )}
      {asking && p && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 text-white" onClick={() => !run.isPending && setAsking(false)}>
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-red-400/40 bg-[#160f2a] p-4" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold mb-2">{t("admin.ticked.confirmTitle")}</p>
            <p className="text-sm text-white/70 mb-4">{t("admin.ticked.confirmText", { n: String(p.count), total: money(p.total) })}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAsking(false)} disabled={run.isPending} className="min-h-[44px] px-4 rounded-lg text-sm font-semibold bg-white/10 border border-white/15">{t("admin.cnt.back")}</button>
              <button onClick={() => run.mutate()} disabled={run.isPending} className="min-h-[44px] px-5 rounded-lg text-sm font-bold bg-red-500 text-white disabled:opacity-50">{t("admin.ticked.confirmBtn")}</button>
            </div>
          </div>
        </div>, document.body)}
    </div>
  );
}
