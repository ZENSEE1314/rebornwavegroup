import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { MemberSearchBox, type MemberMatch } from "@/components/MemberSearchBox";

const inp = "rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-sm text-white outline-none focus:border-amber-300";

// Admin: change the drink name or who a kept bottle belongs to (pick a member to put it on their account, or type a name).
export function EditKeptBottle({ bottle }: { bottle: { id: number; name: string; memberName?: string | null } }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(bottle.name);
  const [who, setWho] = useState(bottle.memberName || "");
  const [member, setMember] = useState<MemberMatch | null>(null);
  const save = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/reborn/pos/bottle-keeps/${bottle.id}`, { name, ...(member ? { memberCode: member.code || member.card || member.email || member.id } : { memberName: who }) }).then(async (r) => { const body = await r.json().catch(() => ({})); if (!r.ok) throw new Error(body.message || "Failed"); return body; }),
    onSuccess: (d: any) => { toast({ title: d.message }); setIsOpen(false); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/bottle-keeps"] }); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: String(e.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" }),
  });
  if (!isOpen) return <button type="button" onClick={() => setIsOpen(true)} className="flex-shrink-0 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white/80">{t("admin.c.edit")}</button>;
  return (
    <div className="basis-full space-y-2 rounded-xl border border-amber-300/30 bg-black/30 p-2.5">
      <label className="block text-[11px] text-white/50">{t("admin.bot.drinkName")}<input value={name} onChange={(e) => setName(e.target.value)} className={inp + " mt-0.5 w-full"} /></label>
      <div className="text-[11px] text-white/50">{t("admin.bot.who")}
        <div className="mt-0.5 flex"><MemberSearchBox value={member ? member.name : who} onChange={(text) => { setMember(null); setWho(text); }} onPick={(m) => setMember(m)} placeholder={t("admin.bot.who")} className={inp} /></div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white/80">{t("admin.c.cancel")}</button>
        <button type="button" onClick={() => save.mutate()} disabled={save.isPending || !name.trim() || (!member && !who.trim())} className="rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-black disabled:opacity-40">{save.isPending ? t("admin.c.saving") : t("admin.c.save")}</button>
      </div>
    </div>
  );
}
