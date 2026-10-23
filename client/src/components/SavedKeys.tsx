import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PasswordInput } from "@/components/PasswordInput";

type KeyState = "saved" | "env" | "unreadable" | "none";
interface KeyRow { name: string; group: string; state: KeyState }
interface KeysAnswer { canSave: boolean; keys: KeyRow[] }

const SECRETS_URL = "/api/reborn/admin/secrets";
const STATE_STYLE: Record<KeyState, string> = {
  saved: "text-emerald-300 border-emerald-400/40 bg-emerald-500/10",
  env: "text-sky-300 border-sky-400/40 bg-sky-500/10",
  unreadable: "text-red-300 border-red-400/40 bg-red-500/10",
  none: "text-white/50 border-white/15 bg-white/5",
};
const inputClass = "w-full min-w-0 px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400/60";

// Admin › Settings › Keys: API keys and tokens saved in the website (locked in the database) instead of the host's variables.
// A saved value is never shown again; changing or removing one needs the main-admin password.
export function SavedKeys() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // A company's admin gets a 403 here (the keys belong to the platform), so the card simply does not show.
  const { data } = useQuery<KeysAnswer>({ queryKey: [SECRETS_URL], retry: false });

  const close = () => { setEditing(null); setValue(""); setPassword(""); setError(""); };
  const send = useMutation({
    mutationFn: async (action: "save" | "remove") => {
      const url = action === "save" ? `${SECRETS_URL}/${editing}` : `${SECRETS_URL}/${editing}/remove`;
      await apiRequest("POST", url, { value, password });
    },
    onSuccess: (_result, action) => {
      toast({ title: t(action === "save" ? "admin.keys.savedToast" : "admin.keys.removedToast") });
      close();
      queryClient.invalidateQueries({ queryKey: [SECRETS_URL] });
    },
    onError: (failure: any) => setError(String(failure?.message || t("admin.c.failed")).replace(/^\d{3}:\s*/, "")),
  });

  if (!data) return null;
  const groups = Array.from(new Set(data.keys.map((key) => key.group)));

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="font-bold text-sm mb-1 flex items-center gap-2"><KeyRound className="w-4 h-4 text-amber-300" /> {t("admin.keys.title")}</h3>
      <p className="text-[11px] text-white/50 mb-3">{t("admin.keys.hint")}</p>
      {!data.canSave && <p role="alert" className="mb-3 text-[11px] text-amber-200">{t("admin.keys.noLock")}</p>}
      {groups.map((group) => (
        <div key={group} className="mb-3">
          <p className="text-[11px] uppercase tracking-wide text-white/40 mb-1">{t(`admin.keys.group.${group}`)}</p>
          {data.keys.filter((key) => key.group === group).map((key) => (
            <div key={key.name} className="py-2 border-t border-white/5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-mono break-all">{key.name}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full border text-[10px] ${STATE_STYLE[key.state]}`}>{t(`admin.keys.state.${key.state}`)}</span>
                </div>
                {data.canSave && editing !== key.name && (
                  <button type="button" onClick={() => { close(); setEditing(key.name); }} className="shrink-0 px-3 py-2 rounded-lg text-xs font-bold bg-white/10 border border-white/15">{t(key.state === "saved" || key.state === "unreadable" ? "admin.keys.change" : "admin.keys.set")}</button>
                )}
              </div>
              {key.state === "unreadable" && <p className="mt-1 text-[11px] text-red-300">{t("admin.keys.unreadableHelp")}</p>}
              {editing === key.name && (
                <div className="mt-2 space-y-2">
                  <PasswordInput value={value} onChange={setValue} placeholder={t("admin.keys.valuePh")} className={inputClass} />
                  <PasswordInput value={password} onChange={setPassword} placeholder={t("admin.sec.pwPh")} className={inputClass} />
                  {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={!value || !password || send.isPending} onClick={() => send.mutate("save")} className="px-3 py-2 rounded-lg text-xs font-bold bg-amber-500/80 text-black disabled:opacity-40">{t("admin.keys.save")}</button>
                    {key.state === "saved" && <button type="button" disabled={!password || send.isPending} onClick={() => send.mutate("remove")} className="px-3 py-2 rounded-lg text-xs font-bold text-red-100 bg-red-500/25 border border-red-400/50 disabled:opacity-40">{t("admin.keys.remove")}</button>}
                    <button type="button" onClick={close} className="px-3 py-2 rounded-lg text-xs bg-white/5 border border-white/10">{t("admin.keys.cancel")}</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
