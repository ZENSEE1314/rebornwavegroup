import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { money } from "@/lib/money";

interface Person { id: string; name: string; role: string; spent: number; cap: number; hasOwnCap: boolean }
interface CapsData { defaultCap: number; discountPercent: number; perPerson: Record<string, number>; people: Person[] }

// Main admin: how much each staff member / boss can buy at staff price per month (receipt price before discount); after it they pay the normal price less the staff discount.
export function StaffPriceCaps() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [defaultCap, setDefaultCap] = useState("");
  const [percent, setPercent] = useState("");
  const [own, setOwn] = useState<Record<string, string>>({});
  const { data } = useQuery<CapsData>({ queryKey: ["/api/reborn/admin/staff-price-caps"], enabled: isOpen });

  useEffect(() => {
    if (!data) return;
    setDefaultCap(String(data.defaultCap));
    setPercent(String(data.discountPercent));
    setOwn(Object.fromEntries(Object.entries(data.perPerson).map(([id, cap]) => [id, String(cap)])));
  }, [data]);

  const save = useMutation({
    mutationFn: () => {
      const perPerson: Record<string, number> = {};
      for (const [id, value] of Object.entries(own)) if (value.trim() !== "") perPerson[id] = Number(value);
      return apiRequest("PUT", "/api/reborn/admin/staff-price-caps", { defaultCap: Number(defaultCap) || 0, discountPercent: Number(percent), perPerson }).then((r) => r.json());
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/reborn/admin/staff-price-caps"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/staff-price-people"] }); toast({ title: t("staffCap.saved") }); },
    onError: (e: any) => toast({ title: t("staffCap.fail"), description: e.message, variant: "destructive" }),
  });

  if (!isOpen) {
    return (
      <div className="mb-4 max-w-2xl rounded-2xl border border-sky-400/25 bg-sky-500/5 p-3 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div className="mb-3 sm:mb-0"><p className="text-sm font-bold text-sky-100">{t("staffCap.title")}</p><p className="text-xs text-white/45">{t("staffCap.desc")}</p></div>
        <button onClick={() => setIsOpen(true)} className="w-full rounded-xl border border-sky-400/40 bg-sky-500/15 px-4 py-2.5 text-sm font-bold text-sky-100 sm:w-auto">{t("staffCap.open")}</button>
      </div>
    );
  }
  return (
    <div className="mb-4 max-w-2xl rounded-2xl border border-sky-400/25 bg-sky-500/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-sky-100">{t("staffCap.title")}</p>
        <button onClick={() => setIsOpen(false)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold">{t("menuImage.close")}</button>
      </div>
      <p className="mt-1 text-xs text-white/45">{t("staffCap.desc")}</p>
      <div className="mt-3 grid gap-2 text-xs text-white/70 sm:grid-cols-2">
        <label className="block">{t("staffCap.default")}<input type="number" min={0} value={defaultCap} onChange={(e) => setDefaultCap(e.target.value)} className="mt-1 w-full rounded-md border border-white/15 bg-black/40 px-2 py-1.5 text-white" /></label>
        <label className="block">{t("staffCap.discount")}<input type="number" min={0} max={100} value={percent} onChange={(e) => setPercent(e.target.value)} className="mt-1 w-full rounded-md border border-white/15 bg-black/40 px-2 py-1.5 text-white" /></label>
      </div>
      <ul className="mt-3 space-y-1.5">
        {(data?.people ?? []).map((person) => (
          <li key={person.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white/5 p-2 text-xs">
            <span className="min-w-0 flex-1 font-semibold text-white">{person.name}<span className="block font-normal text-white/45">{money(person.spent)} {t("staffCap.used")}</span></span>
            <input type="number" min={0} value={own[person.id] ?? ""} onChange={(e) => setOwn({ ...own, [person.id]: e.target.value })} placeholder={t("staffCap.own")} aria-label={`${t("staffCap.own")} ${person.name}`} className="w-32 rounded-md border border-white/15 bg-black/40 px-2 py-1 text-white" />
          </li>
        ))}
      </ul>
      <button onClick={() => save.mutate()} disabled={save.isPending} className="mt-3 rounded-xl bg-sky-400 px-4 py-2 text-sm font-bold text-black disabled:opacity-40">{t("staffCap.save")}</button>
    </div>
  );
}
