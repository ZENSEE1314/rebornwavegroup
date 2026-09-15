import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RebornLayout } from "@/components/RebornLayout";
import { ImageUpload } from "@/components/ImageUpload";
import { PasswordInput } from "@/components/PasswordInput";
import { useTranslation } from "@/lib/i18n";
import { COUNTRIES, DIAL_CODES } from "@/lib/countries";
import { User, Lock, Globe, Copy, CreditCard } from "lucide-react";

const LANGS: { code: "en" | "zh" | "id"; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "id", label: "Bahasa", flag: "🇮🇩" },
];
const inp = "w-full px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400/60";
const gold = { background: "linear-gradient(90deg,#c9a84c,#f0d787)" };

function splitPhone(raw?: string): { dial: string; num: string } {
  const s = (raw || "").trim();
  const m = s.match(/^(\+\d{1,4})\s*(.*)$/);
  if (m) return { dial: m[1], num: m[2] };
  return { dial: "+62", num: s };
}

export default function RebornProfile() {
  const { user } = useAuth();
  const { t, language: lang, changeLanguage: setLang } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const u = (user as any) || {};
  const initPhone = splitPhone(u.phoneNumber);

  const [f, setF] = useState({
    firstName: u.firstName || "", lastName: u.lastName || "", username: u.username || "",
    dialCode: initPhone.dial, phone: initPhone.num,
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

  const saveDetails = () => {
    const phoneNumber = f.phone.trim() ? `${f.dialCode} ${f.phone.trim()}` : "";
    saveProfile.mutate({
      firstName: f.firstName, lastName: f.lastName, username: f.username, phoneNumber,
      address: f.address, country: f.country, profileImageUrl: f.profileImageUrl, dateOfBirth: f.dateOfBirth || null,
    });
  };
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

      {/* Member code + membership card */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {u.referralCode && (
          <button onClick={copyCode} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3 text-left">
            <div className="min-w-0"><p className="text-[11px] text-white/40">{t("prof.memberCode")}</p><p className="font-mono font-bold tracking-wider text-amber-300 truncate">{u.referralCode}</p></div>
            <Copy className="w-4 h-4 text-white/40 flex-shrink-0" />
          </button>
        )}
        {u.membershipCardNumber && (
          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-3">
            <p className="text-[11px] text-white/40 flex items-center gap-1"><CreditCard className="w-3 h-3" /> {t("prof.membershipCard")}</p>
            <p className="font-mono font-bold tracking-wider text-amber-200 truncate">{u.membershipCardNumber}</p>
          </div>
        )}
      </div>

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
        <div className="mb-3"><p className="text-xs text-white/50 mb-1">{t("prof.photo").replace(" URL", "")}</p><ImageUpload value={f.profileImageUrl} onChange={(v) => setF({ ...f, profileImageUrl: v })} shape="circle" label="Upload photo" /></div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <label className="text-xs text-white/50">{t("prof.firstName")}<input value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} className={inp} /></label>
          <label className="text-xs text-white/50">{t("prof.lastName")}<input value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} className={inp} /></label>
        </div>
        <label className="text-xs text-white/50 block mb-2">{t("prof.username")}<input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} placeholder="e.g. wave_king" className={inp} /></label>
        <label className="text-xs text-white/50 block mb-1">{t("prof.phone")}</label>
        <div className="flex gap-2 mb-2">
          <select value={f.dialCode} onChange={(e) => setF({ ...f, dialCode: e.target.value })} className="w-24 flex-shrink-0 px-2 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400/60">
            {DIAL_CODES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <input type="tel" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="812 3456 7890" className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400/60" />
        </div>
        <label className="text-xs text-white/50 block mb-2">{t("prof.address")}<input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} className={inp} /></label>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <label className="text-xs text-white/50">{t("prof.dob")}<input type="date" value={f.dateOfBirth} onChange={(e) => setF({ ...f, dateOfBirth: e.target.value })} className={inp} /></label>
          <label className="text-xs text-white/50">{t("prof.country")}
            <select value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} className={inp}>
              <option value="">—</option>
              {COUNTRIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </label>
        </div>
        <button onClick={saveDetails} disabled={saveProfile.isPending} className="w-full py-3 rounded-xl font-bold text-black disabled:opacity-50" style={gold}>{t("prof.save")}</button>
      </div>

      {/* Password */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="font-bold mb-3 flex items-center gap-2"><Lock className="w-4 h-4 text-amber-300" /> {t("prof.changePw")}</p>
        <div className="mb-2"><PasswordInput value={pw.currentPassword} onChange={(v) => setPw({ ...pw, currentPassword: v })} placeholder={t("prof.currentPw")} className={inp} /></div>
        <div className="mb-3"><PasswordInput value={pw.newPassword} onChange={(v) => setPw({ ...pw, newPassword: v })} placeholder={t("prof.newPw")} className={inp} /></div>
        <button onClick={() => changePw.mutate()} disabled={changePw.isPending || !pw.newPassword} className="w-full py-3 rounded-xl font-bold text-black disabled:opacity-50" style={gold}>{t("prof.updatePw")}</button>
      </div>
    </RebornLayout>
  );
}
