// POS pay panels: "Split" lets the customer pay one bill with RP credits, card and cash together. The rest after credits and card is cash (change is worked out).
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
  const credits = Number(form.credits) || 0;
  const card = Number(form.card) || 0;
  const cashNeeded = Math.max(0, due - credits - card);
  const set = (patch: Partial<SplitForm>) => onChange({ ...form, ...patch });
  const fillRest = (key: "credits" | "card") => {
    const others = key === "credits" ? card : credits;
    const room = Math.max(0, due - others);
    set({ [key]: String(key === "credits" && balance !== null ? Math.min(room, balance) : room) });
  };
  const problem = plan.problem === "tooMuch" ? t("pos.split.tooMuch") : plan.problem === "needCardReference" ? t("pos.split.needRef") : plan.problem === "cashShort" ? t("pos.split.cashShort", { n: money(cashNeeded) }) : null;
  return (
    <div className="mb-2 space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-[11px] text-white/50">{t("pos.split.hint")}</p>
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <label className="block text-xs text-white/60">{t("pos.split.credits")}
          <input type="number" min={0} value={form.credits} disabled={!memberCode} onChange={(e) => set({ credits: e.target.value })} placeholder="0" className={inputClass + " disabled:opacity-40"} />
          <span className="mt-0.5 flex items-center justify-between text-[10px] text-white/40">
            {memberCode ? (balance === null ? "…" : t("pos.split.balance", { n: money(balance) })) : t("pos.credits.needMember")}
            {memberCode && <button type="button" onClick={() => fillRest("credits")} className="min-h-0 p-0 text-amber-300">{t("pos.split.fill")}</button>}
          </span>
        </label>
        <label className="block text-xs text-white/60">{t("pos.split.card")}
          <input type="number" min={0} value={form.card} onChange={(e) => set({ card: e.target.value })} placeholder="0" className={inputClass} />
          <span className="mt-0.5 flex justify-end text-[10px]"><button type="button" onClick={() => fillRest("card")} className="min-h-0 p-0 text-amber-300">{t("pos.split.fill")}</button></span>
        </label>
      </div>
      {card > 0 && <label className="block text-xs text-white/60">{t("pos.cardRef")}<input value={form.reference} onChange={(e) => set({ reference: e.target.value })} placeholder={t("pos.cardRefRequired")} className={inputClass} /></label>}
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <label className="block text-xs text-white/60">{t("pos.split.cashHanded", { n: money(cashNeeded) })}
          <input type="number" min={0} value={form.cash} onChange={(e) => set({ cash: e.target.value })} placeholder={String(cashNeeded)} className={inputClass} />
        </label>
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3">
          <p className="text-[11px] text-white/60">{t("pos.change")}</p>
          <p className="text-lg font-black text-emerald-200">{money(plan.change)}</p>
        </div>
      </div>
      {problem && <p role="status" className="text-[11px] font-semibold text-red-300">{problem}</p>}
    </div>
  );
}
