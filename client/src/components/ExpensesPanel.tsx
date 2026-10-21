// Admin › Expenses: the accounts staff upload the day's expenses (rent, electricity, salary, security ...) with the receipt photo. Every entry keeps who uploaded it and when;
// a mistake is voided with a reason (managers and the main admin), never deleted. Different from the Inventory receipt scan, which is for stock bought.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Receipt } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { money } from "@/lib/money";
import { ImageUpload } from "@/components/ImageUpload";
import { EXPENSE_GROUPS, GROUP_OF_SECTION, sectionOf, type ExpenseGroup } from "@shared/accountingReport";

const card = "rounded-2xl bg-white/5 border border-white/10 p-4";
const field = "min-w-0 w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400/60";
const PHOTO_MAX_DIM = 1400;
const PHOTO_QUALITY = 0.8;
// What the upload is for, grouped as the reports show it. Items bought for the shop's stock are not uploaded here (Inventory › Scan a supplier receipt).
const groupOf = (category: string): ExpenseGroup => GROUP_OF_SECTION[sectionOf(category)];
const todayText = () => new Date().toISOString().slice(0, 10);

interface Expense { id: number; category: string; amount: string; spentOn: string; payee?: string | null; note?: string | null; hasPhoto: boolean; status: string; voidReason?: string | null; uploadedByName?: string | null; createdAt?: string }
interface ExpenseList { month: string; expenses: Expense[]; totals: Record<string, number>; total: number; canVoid: boolean; categories: string[]; runningCosts: { id: string; name: string }[] }
const EMPTY = { category: "", amount: "", spentOn: todayText(), payee: "", note: "", photoUrl: "", fixedCostId: "" };

export default function ExpensesPanel() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [month, setMonth] = useState(todayText().slice(0, 7));
  const [form, setForm] = useState(EMPTY);
  const [voiding, setVoiding] = useState<Expense | null>(null);
  const [reason, setReason] = useState("");
  const [photo, setPhoto] = useState<{ id: number; url: string | null } | null>(null);
  const url = `/api/reborn/expenses?month=${month}`;
  const { data } = useQuery<ExpenseList>({ queryKey: [url], queryFn: () => apiRequest("GET", url).then((r) => r.json()) });
  const refresh = () => { qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/reborn/expenses") }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/fixed-costs"] }); };
  const fail = (e: any) => toast({ title: t("admin.c.failed"), description: String(e.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" });
  const save = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/expenses", { ...form, fixedCostId: form.fixedCostId || undefined }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; }),
    onSuccess: () => { toast({ title: t("ex.saved") }); setForm({ ...EMPTY, spentOn: form.spentOn }); refresh(); },
    onError: fail,
  });
  const voidIt = useMutation({
    mutationFn: () => apiRequest("POST", `/api/reborn/expenses/${voiding!.id}/void`, { reason }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; }),
    onSuccess: () => { toast({ title: t("ex.voidedToast") }); setVoiding(null); setReason(""); refresh(); },
    onError: fail,
  });
  const showPhoto = async (id: number) => {
    setPhoto({ id, url: null });
    const r = await apiRequest("GET", `/api/reborn/expenses/${id}/photo`);
    setPhoto({ id, url: (await r.json()).photoUrl });
  };
  const isReady = !!form.category && Number(form.amount) > 0 && !!form.spentOn && (!!form.photoUrl || !!form.note.trim());
  return (
    <div className="space-y-3">
      <div className={card + " space-y-3"}>
        <h3 className="font-extrabold flex items-center gap-2"><Receipt className="w-5 h-5 text-amber-300" /> {t("ex.title")}</h3>
        <p className="text-[11px] text-white/50">{t("ex.intro")}</p>
        <p className="text-[11px] text-white/40">{t("ex.itemsNote")}</p>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <label className="block text-xs text-white/60">{t("ex.category")}
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={field + " mt-1"}>
              <option value="">—</option>
              {EXPENSE_GROUPS.filter((group) => (data?.categories || []).some((c) => groupOf(c) === group)).map((group) => (
                <optgroup key={group} label={t(`ar.group.${group}`)}>{(data?.categories || []).filter((c) => groupOf(c) === group).map((c) => <option key={c} value={c}>{t(`ex.cat.${c}`)}</option>)}</optgroup>
              ))}
            </select>
          </label>
          <label className="block text-xs text-white/60">{t("ex.amount")}<input type="number" inputMode="numeric" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={field + " mt-1"} /></label>
          <label className="block text-xs text-white/60">{t("ex.date")}<input type="date" max={todayText()} value={form.spentOn} onChange={(e) => setForm({ ...form, spentOn: e.target.value })} className={field + " mt-1"} /></label>
          <label className="block text-xs text-white/60">{t("ex.payee")}<input value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} className={field + " mt-1"} /></label>
        </div>
        {(data?.runningCosts || []).length > 0 && (
          <label className="block text-xs text-white/60">{t("ex.settles")}
            <select value={form.fixedCostId} onChange={(e) => setForm({ ...form, fixedCostId: e.target.value })} className={field + " mt-1"}>
              <option value="">—</option>
              {data!.runningCosts.map((cost) => <option key={cost.id} value={cost.id}>{cost.name}</option>)}
            </select>
            <span className="mt-0.5 block text-[10px] text-white/40">{t("ex.settlesHint")}</span>
          </label>
        )}
        <label className="block text-xs text-white/60">{t("ex.note")}<input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={field + " mt-1"} /></label>
        <ImageUpload value={form.photoUrl} onChange={(photoUrl) => setForm({ ...form, photoUrl })} label={t("ex.photo")} output="jpeg" maxDim={PHOTO_MAX_DIM} quality={PHOTO_QUALITY} />
        <p className="text-[11px] text-white/40">{t("ex.needProof")}</p>
        <button type="button" onClick={() => save.mutate()} disabled={!isReady || save.isPending} className="min-h-[44px] px-5 rounded-lg bg-amber-400 text-black text-sm font-bold disabled:opacity-40">{t("ex.save")}</button>
      </div>

      <div className={card}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="font-bold text-sm">{t("ex.list")}</p>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={field + " w-auto"} />
        </div>
        {data && <p className="mt-1 text-sm font-black text-amber-200">{t("ex.total", { n: money(data.total) })}</p>}
        {data && Object.keys(data.totals).length > 0 && (
          <div className="mt-1 space-y-0.5 text-[11px] text-white/50">
            {EXPENSE_GROUPS.map((group) => {
              const inGroup = Object.entries(data.totals).filter(([c]) => groupOf(c) === group);
              return inGroup.length ? <p key={group}><b className="text-amber-200">{t(`ar.group.${group}`)} {money(inGroup.reduce((sum, [, n]) => sum + n, 0))}</b> · {inGroup.map(([c, n]) => `${t(`ex.cat.${c}`)} ${money(n)}`).join(" · ")}</p> : null;
            })}
          </div>
        )}
        <div className="mt-3 space-y-2">
          {(data?.expenses || []).map((row) => (
            <div key={row.id} className={`rounded-xl border p-3 text-xs ${row.status === "voided" ? "border-white/10 opacity-50" : "border-white/10 bg-black/20"}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{t(`ex.cat.${row.category}`)}{row.payee ? ` · ${row.payee}` : ""}</span>
                <span className={`font-black ${row.status === "voided" ? "line-through" : "text-amber-200"}`}>{money(Number(row.amount))}</span>
              </div>
              <p className="mt-0.5 text-white/50">{row.spentOn}{row.uploadedByName ? ` · ${t("ex.by", { name: row.uploadedByName })}` : ""}{row.note ? ` · ${row.note}` : ""}</p>
              {row.status === "voided" && <p className="mt-0.5 text-red-300">{t("ex.voided", { reason: row.voidReason || "" })}</p>}
              <div className="mt-1 flex gap-3">
                {row.hasPhoto ? <button type="button" onClick={() => showPhoto(row.id)} className="min-h-0 p-0 text-amber-300 underline">{t("ex.viewPhoto")}</button> : <span className="text-white/30">{t("ex.noPhoto")}</span>}
                {data?.canVoid && row.status === "active" && <button type="button" onClick={() => { setVoiding(row); setReason(""); }} className="min-h-0 p-0 text-red-300 underline">{t("ex.void")}</button>}
              </div>
            </div>
          ))}
          {data && data.expenses.length === 0 && <p className="text-xs text-white/40">{t("ex.none")}</p>}
        </div>
      </div>

      {voiding && (
        <div className={card + " space-y-2 border-red-400/30"}>
          <p className="text-sm font-semibold">{t("ex.voidAsk", { what: `${t(`ex.cat.${voiding.category}`)} ${money(Number(voiding.amount))}` })}</p>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("ex.voidReason")} aria-label={t("ex.voidReason")} className={field} />
          <div className="flex gap-2">
            <button type="button" onClick={() => voidIt.mutate()} disabled={!reason.trim() || voidIt.isPending} className="min-h-[44px] px-4 rounded-lg bg-red-400 text-black text-sm font-bold disabled:opacity-40">{t("ex.void")}</button>
            <button type="button" onClick={() => setVoiding(null)} className="min-h-[44px] px-4 rounded-lg bg-white/10 text-sm">{t("ex.cancel")}</button>
          </div>
        </div>
      )}
      {photo && (
        <div className={card}>
          {photo.url ? <img src={photo.url} alt={t("ex.photo")} className="max-h-96 w-full object-contain rounded-lg" /> : <p className="text-xs text-white/50">…</p>}
          <button type="button" onClick={() => setPhoto(null)} className="mt-2 min-h-[40px] px-4 rounded-lg bg-white/10 text-xs">{t("ex.close")}</button>
        </div>
      )}
    </div>
  );
}
