// POS pay panels: "Split" lets the customer pay one bill with cash, card and RP credits together. Type what was paid in cash first, then the card amount (or tap "fill the rest"):
// the box shows what has been entered and what is still to pay, and the receipt lists every part. Cash may be more than needed (the change is worked out).
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { money } from "@/lib/money";
import { planSplit, type PayPart, type SplitPlan } from "@shared/payments";

export interface SplitForm { cash: string; card: string; credits: string; reference: string }
export const EMPTY_SPLIT: SplitForm = { cash: "", card: "", credits: "", reference: "" };

const inputClass = "mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white";

export const splitPlanOf = (form: SplitForm, due: number): SplitPlan =>
  planSplit({ cash: Number(form.cash) || 0, card: Number(form.card) || 0, credits: Number(form.credits) || 0, cardReference: form.reference }, due);

/** The parts the server wants: credits and card at their amounts, cash as what was handed over. */
export function splitPayments(form: SplitForm, due: number): Pick<PayPart, "method" | "amount" | "reference">[] {
  const plan = splitPlanOf(form, due);
  return plan.parts.map((part) => (part.method === "cash" ? { method: "cash" as const, amount: plan.cashReceived } : part));
}

export function isSplitReady(form: SplitForm, due: number, memberCredits: number | null): boolean {
  const plan = splitPlanOf(form, due);
  const wantsCredits = (Number(form.credits) || 0) > 0;
  if (plan.parts.length < 2 || plan.problem) return false;
  return !wantsCredits || (memberCredits !== null && memberCredits >= Number(form.credits));
}

type Field = "cash" | "card" | "credits";

export function SplitPayBox({ due, memberCode, form, onChange, onBalance }: { due: number; memberCode?: string | null; form: SplitForm; onChange: (next: SplitForm) => void; onBalance: (balance: number | null) => void }) {
  const { t } = useTranslation();
  const { data } = useQuery<any>({
    queryKey: ["/api/reborn/pos/member", memberCode],
    queryFn: () => apiRequest("GET", `/api/reborn/pos/member/${encodeURIComponent(memberCode || "")}`).then((r) => r.json()),
    enabled: !!memberCode,
  });
  const balance = data?.credits !== undefined ? Number(data.credits) : null;
  useEffect(() => { onBalance(balance); }, [balance]);
  const plan = splitPlanOf(form, due);
  const amounts: Record<Field, number> = { cash: Number(form.cash) || 0, card: Number(form.card) || 0, credits: Number(form.credits) || 0 };
  const entered = amounts.cash + amounts.card + amounts.credits;
  const remaining = Math.max(0, due - entered);
  const set = (patch: Partial<SplitForm>) => onChange({ ...form, ...patch });
  // "Fill the rest" puts into this field whatever the other two have not covered (credits are capped by the member's balance).
  const fillRest = (key: Field) => {
    const others = entered - amounts[key];
    const room = Math.max(0, due - others);
    set({ [key]: String(key === "credits" && balance !== null ? Math.min(room, balance) : room) });
  };
  const problem = plan.problem === "tooMuch" ? t("pos.split.tooMuch") : plan.problem === "needCardReference" ? t("pos.split.needRef") : null;
  const restButton = (key: Field) => <button type="button" onClick={() => fillRest(key)} className="min-h-0 p-0 text-amber-300">{t("pos.split.fill")}</button>;
  return (
    <div className="mb-2 space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-[11px] text-white/50">{t("pos.split.hint")}</p>
      <label className="block text-xs text-white/60">
        <span className="flex items-center justify-between">{t("pos.split.cash")}{restButton("cash")}</span>
        <input type="number" min={0} value={form.cash} onChange={(e) => set({ cash: e.target.value })} placeholder="0" className={inputClass} />
      </label>
      <label className="block text-xs text-white/60">
        <span className="flex items-center justify-between">{t("pos.split.card")}{restButton("card")}</span>
        <input type="number" min={0} value={form.card} onChange={(e) => set({ card: e.target.value })} placeholder="0" className={inputClass} />
      </label>
      {amounts.card > 0 && <label className="block text-xs text-white/60">{t("pos.cardRef")}<input value={form.reference} onChange={(e) => set({ reference: e.target.value })} placeholder={t("pos.cardRefRequired")} className={inputClass} /></label>}
      <label className="block text-xs text-white/60">
        <span className="flex items-center justify-between">{t("pos.split.credits")}{memberCode && restButton("credits")}</span>
        <input type="number" min={0} value={form.credits} disabled={!memberCode} onChange={(e) => set({ credits: e.target.value })} placeholder="0" className={inputClass + " disabled:opacity-40"} />
        <span className="mt-0.5 block text-[10px] text-white/40">{memberCode ? (balance === null ? "…" : t("pos.split.balance", { n: money(balance) })) : t("pos.credits.needMember")}</span>
      </label>
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <div className="rounded-xl border border-white/10 bg-black/30 p-2"><p className="text-[10px] text-white/50">{t("pos.split.entered")}</p><p className="text-sm font-bold">{money(entered)}</p></div>
        <div className={`rounded-xl border p-2 ${remaining > 0 ? "border-amber-400/40 bg-amber-400/10" : "border-emerald-400/30 bg-emerald-400/10"}`}><p className="text-[10px] text-white/60">{t("pos.split.remaining")}</p><p className={`text-sm font-black ${remaining > 0 ? "text-amber-200" : "text-emerald-200"}`}>{money(remaining)}</p></div>
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-2"><p className="text-[10px] text-white/60">{t("pos.change")}</p><p className="text-sm font-black text-emerald-200">{money(plan.change)}</p></div>
      </div>
      {problem && <p role="status" className="text-[11px] font-semibold text-red-300">{problem}</p>}
    </div>
  );
}
