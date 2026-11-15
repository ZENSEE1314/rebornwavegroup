// Admin › Staff: the tiers of the extra daily sales commission (rules in shared/dailyCommission.ts). Everyone with the tab sees the table when it is on;
// the main admin, managers and the head staff the main admin picked can change it.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { money } from "@/lib/money";
import { tierRanges, type DailyCommissionSetup } from "@shared/dailyCommission";

interface Answer { setup: DailyCommissionSetup; canEdit: boolean; canPickEditors: boolean; editors: string[] }
interface StaffPerson { id: string; name: string; role?: string }
interface DraftTier { upTo: string; percent: string }

const QUERY_KEY = ["/api/reborn/staff/daily-commission"];
const NEW_TIER_STEP = 1_000_000;
const field = "min-w-0 w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400/60";

const draftOf = (setup: DailyCommissionSetup): DraftTier[] => setup.tiers.map((tier) => ({ upTo: tier.upTo === null ? "" : String(tier.upTo), percent: String(tier.percent) }));

export function DailyCommissionCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data } = useQuery<Answer>({ queryKey: QUERY_KEY, queryFn: () => apiRequest("GET", "/api/reborn/staff/daily-commission").then((r) => r.json()) });
  const { data: staff = [] } = useQuery<StaffPerson[]>({ queryKey: ["/api/reborn/pos/staff"], queryFn: () => apiRequest("GET", "/api/reborn/pos/staff").then((r) => r.json()), enabled: !!data?.canPickEditors });
  const [enabled, setEnabled] = useState(false);
  const [startDay, setStartDay] = useState("");
  const [tiers, setTiers] = useState<DraftTier[]>([]);
  useEffect(() => {
    if (!data) return;
    setEnabled(data.setup.enabled);
    setStartDay(data.setup.startDay);
    setTiers(draftOf(data.setup));
  }, [data]);

  const fail = (e: any) => toast({ title: t("vn.common.failed"), description: e.message, variant: "destructive" });
  const save = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/reborn/staff/daily-commission", { enabled, startDay, tiers: tiers.map((tier) => ({ upTo: tier.upTo === "" ? null : Number(tier.upTo), percent: Number(tier.percent) })) }).then(async (r) => { const body = await r.json(); if (!r.ok) throw new Error(body.message); return body; }),
    onSuccess: () => { toast({ title: t("dcm.saved") }); qc.invalidateQueries({ queryKey: QUERY_KEY }); qc.invalidateQueries({ queryKey: ["/api/reborn/staff/my-target"] }); },
    onError: fail,
  });
  const pickEditors = useMutation({
    mutationFn: (userIds: string[]) => apiRequest("PUT", "/api/reborn/admin/daily-commission/editors", { userIds }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: fail,
  });

  if (!data || (!data.canEdit && !data.setup.enabled)) return null;
  const change = (index: number, patch: Partial<DraftTier>) => setTiers((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const addTier = () => setTiers((rows) => {
    const lastClosed = rows.length >= 2 ? Number(rows[rows.length - 2].upTo) || 0 : 0;
    return [...rows.slice(0, -1), { upTo: String(lastClosed + NEW_TIER_STEP), percent: rows[rows.length - 1]?.percent || "0" }, rows[rows.length - 1]];
  });
  const removeTier = (index: number) => setTiers((rows) => rows.filter((_, i) => i !== index));
  const fromText = (index: number) => (index === 0 ? money(0) : t("dcm.above", { n: money(Number(tiers[index - 1].upTo) || 0) }));

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
      <p className="text-sm font-bold">💸 {t("dcm.title")}</p>
      <p className="mt-1 text-xs text-white/50">{t("dcm.intro")}</p>
      {!data.canEdit ? (
        <ul className="mt-3 space-y-1 text-xs">
          {tierRanges(data.setup.tiers).map((range, index) => (
            <li key={index} className="flex justify-between gap-2 rounded-lg bg-black/20 px-3 py-2"><span>{range.to === null ? t("dcm.aboveRange", { n: money(range.from) }) : t("dcm.range", { from: money(range.from), to: money(range.to) })}</span><b className="text-emerald-300">{range.percent}%</b></li>
          ))}
        </ul>
      ) : (
        <>
          <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> {t("dcm.on")}</label>
          {enabled && <label className="mt-2 block text-xs text-white/60">{t("dcm.startDay")}<input type="date" value={startDay} onChange={(e) => setStartDay(e.target.value)} className={`${field} mt-1`} style={{ colorScheme: "dark" }} /></label>}
          <div className="mt-3 space-y-2">
            {tiers.map((tier, index) => {
              const isLast = index === tiers.length - 1;
              return (
                <div key={index} className="rounded-xl bg-black/20 p-2 text-xs">
                  <p className="text-white/50">{t("dcm.from")} {fromText(index)}</p>
                  <div className="mt-1 flex items-center gap-2">
                    {isLast ? <span className="w-full text-white/70">{t("dcm.andAbove")}</span> : <input type="number" inputMode="numeric" min={1} value={tier.upTo} onChange={(e) => change(index, { upTo: e.target.value })} aria-label={t("dcm.upTo")} placeholder={t("dcm.upTo")} className={field} />}
                    <input type="number" inputMode="decimal" min={0} max={100} value={tier.percent} onChange={(e) => change(index, { percent: e.target.value })} aria-label={t("dcm.percent")} className={`${field} !w-20 shrink-0`} />
                    <span className="text-white/60">%</span>
                    {!isLast && tiers.length > 2 && <button type="button" onClick={() => removeTier(index)} aria-label={t("dcm.remove")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-white/45">{t("dcm.cap")}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={addTier} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-white/10 py-2 text-xs font-bold"><Plus className="h-4 w-4" /> {t("dcm.addTier")}</button>
            <button type="button" onClick={() => save.mutate()} disabled={save.isPending} className="flex-1 rounded-xl bg-amber-400 py-2 text-xs font-bold text-black disabled:opacity-50">{t("dcm.save")}</button>
          </div>
          {data.canPickEditors && (
            <div className="mt-4 border-t border-white/10 pt-3">
              <p className="text-xs font-bold">{t("dcm.editors")}</p>
              <p className="text-[11px] text-white/45">{t("dcm.editorsNote")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {staff.filter((person) => person.role !== "admin" && person.role !== "manager").map((person) => {
                  const isPicked = data.editors.includes(person.id);
                  return <button key={person.id} type="button" aria-pressed={isPicked} onClick={() => pickEditors.mutate(isPicked ? data.editors.filter((id) => id !== person.id) : [...data.editors, person.id])} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${isPicked ? "border-amber-400 bg-amber-400 text-black" : "border-white/20 bg-white/5 text-white/70"}`}>{person.name}</button>;
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
