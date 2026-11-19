// Admin › Accounting: stock bought twice (same item, quantity and unit cost booked more than once).
// The admin ticks the extra lines; only the expense line is removed (a backup is kept first), the stock stays.
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { useTranslation, localeTag } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { money } from "@/lib/money";

const API = "/api/reborn/admin/accounting";
const DUP_KEY = `${API}/duplicate-purchases`;
const REFRESH_KEYS = [DUP_KEY, `${API}/ticked-purchases`, `${API}/summary`, `${API}/ledger`, `${API}/period`, `${API}/monthly`, `${API}/overall`];

interface DupLine { id: number; amount: number; note: string; createdAt: string | null; fromImport: boolean }
interface DupGroup { name: string; qty: number; unit: number; keep: DupLine; extra: DupLine[] }
interface AlsoGroup { name: string; lines: DupLine[] }

const dayOf = (value: string | null) => (value ? new Date(value).toLocaleDateString(localeTag()) : "");

export default function DuplicatePurchases() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState(false);
  const [unticked, setUnticked] = useState<Set<number>>(new Set());
  const { data } = useQuery<{ repeated: DupGroup[]; importAndRestock: AlsoGroup[]; repeatedTotal: number }>({ queryKey: [DUP_KEY], queryFn: () => apiRequest("GET", DUP_KEY).then((r) => r.json()), enabled: open });

  const picked = useMemo(() => (data?.repeated ?? []).flatMap((g) => g.extra).filter((l) => !unticked.has(l.id)), [data, unticked]);
  const pickedTotal = picked.reduce((sum, l) => sum + l.amount, 0);

  const toggle = (id: number) => setUnticked((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const run = useMutation({
    mutationFn: () => apiRequest("POST", `${DUP_KEY}/remove`, { confirm: true, ids: picked.map((l) => l.id) }).then((r) => r.json()),
    onSuccess: (d: any) => {
      setAsking(false);
      toast({ title: d.message });
      for (const key of REFRESH_KEYS) qc.invalidateQueries({ queryKey: [key] });
    },
    onError: (e: any) => { setAsking(false); toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }); },
  });

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-2 text-left">
        <span className="font-bold text-sm flex items-center gap-2"><Copy className="w-4 h-4 text-amber-300" /> {t("admin.dup.title")}</span>
        <span className="text-xs text-white/50">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-[12px] text-white/60">{t("admin.dup.desc")}</p>
          {!data ? <p className="text-xs text-white/40">…</p> : data.repeated.length === 0 ? <p className="text-xs text-white/60">{t("admin.dup.none")}</p> : (
            <ul className="space-y-2">
              {data.repeated.map((g) => (
                <li key={g.keep.id} className="rounded-xl bg-white/5 border border-white/10 p-2 text-[12px]">
                  <p className="font-semibold">{g.qty} × {g.name} @ {money(g.unit)}</p>
                  <p className="text-white/50">{t("admin.dup.keep")}: {dayOf(g.keep.createdAt)} · {money(g.keep.amount)}</p>
                  {g.extra.map((l) => (
                    <label key={l.id} className="flex items-center gap-2 min-h-[36px] text-red-200">
                      <input type="checkbox" checked={!unticked.has(l.id)} onChange={() => toggle(l.id)} className="w-4 h-4" />
                      <span>{dayOf(l.createdAt)} · {money(l.amount)}</span>
                    </label>
                  ))}
                </li>
              ))}
            </ul>
          )}
          {data && data.importAndRestock.length > 0 && (
            <div className="space-y-1">
              <p className="text-[12px] font-semibold text-amber-200">{t("admin.dup.also")}</p>
              <ul className="text-[11px] text-white/60 space-y-1">
                {data.importAndRestock.map((g) => (
                  <li key={g.name}>{g.name}: {g.lines.map((l) => `${dayOf(l.createdAt)} ${money(l.amount)}${l.fromImport ? " (Excel)" : ""}`).join(" · ")}</li>
                ))}
              </ul>
            </div>
          )}
          {picked.length > 0 && <p className="text-[12px] text-white/70">{t("admin.dup.selected", { n: String(picked.length), total: money(pickedTotal) })}</p>}
          <button onClick={() => setAsking(true)} disabled={picked.length === 0 || run.isPending} className="w-full min-h-[44px] rounded-lg text-sm font-bold text-red-100 bg-red-500/25 border border-red-400/50 disabled:opacity-50">{t("admin.dup.button")}</button>
        </div>
      )}
      {asking && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 text-white" onClick={() => !run.isPending && setAsking(false)}>
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-red-400/40 bg-[#160f2a] p-4" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold mb-2">{t("admin.ticked.confirmTitle")}</p>
            <p className="text-sm text-white/70 mb-4">{t("admin.dup.confirmText", { n: String(picked.length), total: money(pickedTotal) })}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAsking(false)} disabled={run.isPending} className="min-h-[44px] px-4 rounded-lg text-sm font-semibold bg-white/10 border border-white/15">{t("admin.cnt.back")}</button>
              <button onClick={() => run.mutate()} disabled={run.isPending} className="min-h-[44px] px-5 rounded-lg text-sm font-bold bg-red-500 text-white disabled:opacity-50">{t("admin.ticked.confirmBtn")}</button>
            </div>
          </div>
        </div>, document.body)}
    </div>
  );
}
