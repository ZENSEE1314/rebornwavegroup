// Admin › Accounting › Tax and service fee: the rates new bills are opened with. A bill keeps the rates it was opened with, so a change never alters a bill that is already open or paid.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Percent } from "lucide-react";
import { useTranslation, localeTag } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const card = "rounded-2xl bg-white/5 border border-white/10 p-4";
const field = "min-w-0 w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400/60";

interface Change { at: string; by: string; tax: number; service: number; prevTax: number; prevService: number }
interface TaxFees { taxPercent: number; serviceFeePercent: number; history: Change[] }

export default function TaxFeesCard() {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data } = useQuery<TaxFees>({ queryKey: ["/api/reborn/admin/tax-fees"], queryFn: () => apiRequest("GET", "/api/reborn/admin/tax-fees").then((r) => r.json()) });
  const [tax, setTax] = useState("");
  const [service, setService] = useState("");
  useEffect(() => { if (data) { setTax(String(data.taxPercent)); setService(String(data.serviceFeePercent)); } }, [data?.taxPercent, data?.serviceFeePercent]);
  const save = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/reborn/admin/tax-fees", { taxPercent: Number(tax), serviceFeePercent: Number(service) }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; }),
    onSuccess: (d: { unchanged?: boolean }) => {
      toast({ title: d.unchanged ? t("tf.same") : t("tf.saved") });
      qc.invalidateQueries({ queryKey: ["/api/reborn/admin/tax-fees"] });
      qc.invalidateQueries({ queryKey: ["/api/reborn/admin/settings"] });
      qc.invalidateQueries({ queryKey: ["/api/reborn/pos/settings"] });
    },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: String(e.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" }),
  });
  if (!data) return null;
  const isChanged = Number(tax) !== data.taxPercent || Number(service) !== data.serviceFeePercent;
  return (
    <div className={card + " space-y-3"}>
      <h3 className="font-extrabold flex items-center gap-2"><Percent className="w-5 h-5 text-amber-300" /> {t("tf.title")}</h3>
      <p className="text-[11px] text-white/50">{t("tf.hint")}</p>
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <label className="text-[11px] text-white/50">{t("tf.tax")}<input type="number" inputMode="decimal" min={0} max={100} step="0.1" value={tax} onChange={(e) => setTax(e.target.value)} className={field + " mt-1"} /></label>
        <label className="text-[11px] text-white/50">{t("tf.service")}<input type="number" inputMode="decimal" min={0} max={100} step="0.1" value={service} onChange={(e) => setService(e.target.value)} className={field + " mt-1"} /></label>
      </div>
      <button type="button" onClick={() => save.mutate()} disabled={save.isPending || !isChanged} className="min-h-[44px] px-5 rounded-lg bg-amber-400 text-black text-sm font-bold disabled:opacity-40">{t("tf.save")}</button>
      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-wide text-white/40">{t("tf.history")}</p>
        {data.history.length === 0 && <p className="text-xs text-white/40">{t("tf.none")}</p>}
        {data.history.map((change) => (
          <p key={change.at} className="text-[11px] text-white/60">{new Date(change.at).toLocaleString(localeTag(language))} · {change.by}: {t("tf.line", { a: change.prevTax, b: change.tax, c: change.prevService, d: change.service })}</p>
        ))}
      </div>
    </div>
  );
}
