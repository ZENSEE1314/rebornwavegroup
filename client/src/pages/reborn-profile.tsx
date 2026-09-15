import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RebornLayout } from "@/components/RebornLayout";
import { useTranslation } from "@/lib/i18n";
import { User, Lock, Globe, Copy } from "lucide-react";

const LANGS: { code: "en" | "zh" | "id"; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "id", label: "Bahasa", flag: "🇮🇩" },
];
const inp = "w-full px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400/60";
const gold = { background: "linear-gradient(90deg,#c9a84c,#f0d787)" };

export default function RebornProfile() {
  const { user } = useAuth();
  const { t, language: lang, changeLanguage: setLang } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const u = (user as any) || {};

  const [f, setF] = useState({
    firstName: u.firstName || "", lastName: u.lastName || "", phoneNumber: u.phoneNumber || "",
    address: u.address || "", country: u.country || "", profileImageUrl: u.profileImageUrl || "",
    dateOfBirth: u.dateOfBirth ? String(u.dateOfBirth).slice(0, 10) : "",
  });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });

  const saveProfile = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/reborn/profile", body).then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
    onSuccess: ({ ok, d }) => {
      if (!ok) { toast({ title: "Failed", description: d.message, variant: "destructive" }); return; }
      toast({ title: t("prof.saved") });
      qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const changePw = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/profile", pw).then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
    onSuccess: ({ ok, d }) => {
      if (!ok) { toast({ title: "Failed", description: d.message, variant: "destructive" }); return; }
      toast({ title: t("prof.pwUpdated") });
      setPw({ currentPassword: "", newPassword: "" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const pickLang = (code: any) => { setLang(code); saveProfile.mutate({ preferredLanguage: code }); };
  const copyCode = () => { try { navigator.clipboard.writeText(u.referralCode || ""); toast({ title: "Copied", description: u.referralCode }); } catch {} };

  return (
    <RebornLayout active="/profile" title="PROFILE">
      <div className="flex items-center gap-3 mb-5">
        {f.profileImageUrl
          ? <img src={f.profileImageUrl} alt="" className="w-16 h-16 rounded-2xl object-cover" />
          : <span className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-purple-500 flex items-center justify-center text-2xl font-bold text-black">{(f.firstName || u.email || "U").slice(0, 1).toUpperCase()}</span>}
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold truncate">{f.firstName || "Member"} {f.lastName}</h1>
          <p className="text-sm text-white/50 truncate">{u.email}</p>
        </div>
      </div>

      {/* Member code */}
      {u.referralCode && (
        <button onClick={copyCode} className="w-full flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3 mb-4">
          <div className="text-left"><p className="text-[11px] text-white/40">{t("prof.memberCode")}</p><p className="font-mono font-bold tracking-widest text-amber-300">{u.referralCode}</p></div>
          <Copy className="w-4 h-4 text-white/40" />
        </button>
      )}

      {/* Language */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
        <p className="font-bold mb-3 flex items-center gap-2"><Globe className="w-4 h-4 text-amber-300" /> {t("prof.language")}</p>
        <div className="grid grid-cols-3 gap-2">
          {LANGS.map((l) => (
            <button key={l.code} onClick={() => pickLang(l.code)} className={`py-2.5 rounded-xl border font-semibold text-sm ${lang === l.code ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/10 bg-black/30 text-white/70"}`}>{l.flag} {l.label}</button>
          ))}
        </div>
      </div>

      {/* Details */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
        <p className="font-bold mb-3 flex items-center gap-2"><User className="w-4 h-4 text-amber-300" /> {t("prof.title")}</p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <label className="text-xs text-white/50">{t("prof.firstName")}<input value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} className={inp} /></label>
          <label className="text-xs text-white/50">{t("prof.lastName")}<input value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} className={inp} /></label>
        </div>
        <label className="text-xs text-white/50 block mb-2">{t("prof.phone")}<input value={f.phoneNumber} onChange={(e) => setF({ ...f, phoneNumber: e.target.value })} className={inp} /></label>
        <label className="text-xs text-white/50 block mb-2">{t("prof.address")}<input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} className={inp} /></label>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <label className="text-xs text-white/50">{t("prof.dob")}<input type="date" value={f.dateOfBirth} onChange={(e) => setF({ ...f, dateOfBirth: e.target.value })} className={inp} /></label>
          <label className="text-xs text-white/50">{t("prof.country")}<input value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} className={inp} /></label>
        </div>
        <label className="text-xs text-white/50 block mb-3">{t("prof.photo")}<input value={f.profileImageUrl} onChange={(e) => setF({ ...f, profileImageUrl: e.target.value })} placeholder="https://…" className={inp} /></label>
        <button onClick={() => saveProfile.mutate(f)} disabled={saveProfile.isPending} className="w-full py-3 rounded-xl font-bold text-black disabled:opacity-50" style={gold}>{t("prof.save")}</button>
      </div>

      {/* Password */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="font-bold mb-3 flex items-center gap-2"><Lock className="w-4 h-4 text-amber-300" /> {t("prof.changePw")}</p>
        <input type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} placeholder={t("prof.currentPw")} className={inp + " mb-2"} />
        <input type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} placeholder={t("prof.newPw")} className={inp + " mb-3"} />
        <button onClick={() => changePw.mutate()} disabled={changePw.isPending || !pw.newPassword} className="w-full py-3 rounded-xl font-bold text-black disabled:opacity-50" style={gold}>{t("prof.updatePw")}</button>
      </div>
    </RebornLayout>
  );
}
