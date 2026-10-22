// Admin › Accounting › Tax and service fee: the rates new bills are opened with, each with its own on / off tick. A bill keeps the rates it was opened with, so a change never alters a bill that is already open or paid.
// "Let the POS change them": off = the POS shows these rates and cannot change them; on = the cashier can change or remove them on one bill.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Percent } from "lucide-react";
import { useTranslation, localeTag } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const card = "rounded-2xl bg-white/5 border border-white/10 p-4";
const field = "min-w-0 w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400/60 disabled:opacity-40";

interface Change { at: string; by: string; tax: number; service: number; prevTax: number; prevService: number }
interface TaxFees { taxPercent: number; serviceFeePercent: number; taxKept: number; serviceFeeKept: number; posCanChangeFees: boolean; history: Change[] }

export default function TaxFeesCard() {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data } = useQuery<TaxFees>({ queryKey: ["/api/reborn/admin/tax-fees"], queryFn: () => apiRequest("GET", "/api/reborn/admin/tax-fees").then((r) => r.json()) });
  const [taxOn, setTaxOn] = useState(false);
  const [tax, setTax] = useState("");
  const [serviceOn, setServiceOn] = useState(false);
  const [service, setService] = useState("");
  const [posCanChange, setPosCanChange] = useState(false);
  useEffect(() => {
    if (!data) return;
    setTaxOn(data.taxPercent > 0); setTax(String(data.taxPercent > 0 ? data.taxPercent : data.taxKept));
    setServiceOn(data.serviceFeePercent > 0); setService(String(data.serviceFeePercent > 0 ? data.serviceFeePercent : data.serviceFeeKept));
    setPosCanChange(data.posCanChangeFees);
  }, [data?.taxPercent, data?.serviceFeePercent, data?.taxKept, data?.serviceFeeKept, data?.posCanChangeFees]);
  const taxToSave = taxOn ? Number(tax) : 0;
  const serviceToSave = serviceOn ? Number(service) : 0;
  const save = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/reborn/admin/tax-fees", { taxPercent: taxToSave, serviceFeePercent: serviceToSave, taxKept: Number(tax) || 0, serviceFeeKept: Number(service) || 0, posCanChangeFees: posCanChange }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; }),
    onSuccess: (d: { unchanged?: boolean }) => {
      toast({ title: d.unchanged ? t("tf.same") : t("tf.saved") });
      qc.invalidateQueries({ queryKey: ["/api/reborn/admin/tax-fees"] });
      qc.invalidateQueries({ queryKey: ["/api/reborn/admin/settings"] });
      qc.invalidateQueries({ queryKey: ["/api/reborn/pos/settings"] });
    },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: String(e.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" }),
  });
  if (!data) return null;
  const isChanged = taxToSave !== data.taxPercent || serviceToSave !== data.serviceFeePercent || posCanChange !== data.posCanChangeFees;
  return (
    <div className={card + " space-y-3"}>
      <h3 className="font-extrabold flex items-center gap-2"><Percent className="w-5 h-5 text-amber-300" /> {t("tf.title")}</h3>
      <p className="text-[11px] text-white/50">{t("tf.hint")}</p>
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <div>
          <label className="flex items-center gap-2 text-[11px] text-white/50"><input type="checkbox" checked={taxOn} onChange={(e) => setTaxOn(e.target.checked)} className="w-4 h-4" /> {t("tf.tax")}</label>
          <input type="number" inputMode="decimal" min={0} max={100} step="0.1" value={tax} disabled={!taxOn} onChange={(e) => setTax(e.target.value)} aria-label={t("tf.tax")} className={field + " mt-1"} />
        </div>
        <div>
          <label className="flex items-center gap-2 text-[11px] text-white/50"><input type="checkbox" checked={serviceOn} onChange={(e) => setServiceOn(e.target.checked)} className="w-4 h-4" /> {t("tf.service")}</label>
          <input type="number" inputMode="decimal" min={0} max={100} step="0.1" value={service} disabled={!serviceOn} onChange={(e) => setService(e.target.value)} aria-label={t("tf.service")} className={field + " mt-1"} />
        </div>
      </div>
      <label className="flex items-start gap-2 text-xs text-white/70"><input type="checkbox" checked={posCanChange} onChange={(e) => setPosCanChange(e.target.checked)} className="mt-0.5 w-4 h-4" /> <span>{t("tf.canChange")}<span className="block text-[11px] text-white/40">{t("tf.canChangeHint")}</span></span></label>
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
