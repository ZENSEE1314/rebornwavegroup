import { useState } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PasswordInput } from "@/components/PasswordInput";

// Main-admin "free start": 10,000 KGOLD to every account once, plus five small gifts (100 / 500 / 1,000 / 2,500 / 5,000).
export function FreeStartKgold() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const close = () => { setIsOpen(false); setPassword(""); setError(""); };

  const submit = async () => {
    if (!password || isBusy) return;
    setIsBusy(true);
    setError("");
    try {
      const data = await (await apiRequest("POST", "/api/reborn/admin/kos/free-start", { password })).json();
      toast({ title: data.message });
      close();
      queryClient.invalidateQueries();
    } catch (failure: any) {
      setError(String(failure?.message || t("admin.c.failed")).replace(/^\d{3}:\s*/, ""));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/5 p-4">
      <h3 className="font-bold text-sm text-emerald-200 mb-1">{t("admin.m.freeTitle")}</h3>
      <p className="text-[11px] text-white/50 mb-3">{t("admin.m.freeHint")}</p>
      <button type="button" onClick={() => setIsOpen(true)} className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-bold text-emerald-100 bg-emerald-500/25 border border-emerald-400/60 hover:bg-emerald-500/35">{t("admin.m.freeBtn")}</button>
      {isOpen && createPortal(
        <div role="dialog" aria-modal="true" aria-labelledby="free-start-title" className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/75" onClick={close}>
          <div className="w-full max-w-sm rounded-2xl bg-[#14101f] border border-emerald-400/50 p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h3 id="free-start-title" className="font-bold text-emerald-200 mb-2">{t("admin.m.freeTitle")}</h3>
            <p className="text-xs text-white/80 mb-3">{t("admin.m.freeWill")}</p>
            <label className="block text-xs text-white/60 mb-1" htmlFor="free-start-password">{t("admin.m.freePrompt")}</label>
            <PasswordInput value={password} onChange={setPassword} placeholder={t("admin.sec.pwPh")} className="w-full min-w-0 px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-400/60" />
            {error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={close} className="flex-1 min-h-[44px] rounded-lg text-sm font-semibold text-white/80 bg-white/10 border border-white/15">{t("admin.c.cancel")}</button>
              <button type="button" onClick={submit} disabled={!password || isBusy} className="flex-1 min-h-[44px] rounded-lg text-sm font-bold text-emerald-50 bg-emerald-600 disabled:opacity-40">{isBusy ? t("admin.m.freeWorking") : t("admin.m.freeBtn")}</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
