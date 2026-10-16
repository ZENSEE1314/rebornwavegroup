import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RebornLayout } from "@/components/RebornLayout";
import { useTranslation, localeTag } from "@/lib/i18n";
import { SignaturePad, photoToDataUrl, type SignaturePadHandle } from "@/components/SignaturePad";
import { FileText, IdCard } from "lucide-react";

const card = "rounded-2xl border border-white/10 bg-white/5 p-4 mb-4";

// App › Profile › My employment (staff only): upload the ID for the admin, then read and sign the employment contract the admin sends.
function Payslips() {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const { data: slips = [] } = useQuery<Array<{ month: string; net: number; currency: { symbol: string; decimals: number } }>>({ queryKey: ["/api/reborn/my-payslips"], queryFn: () => apiRequest("GET", "/api/reborn/my-payslips").then((r) => r.json()) });
  const download = async (month: string) => {
    try {
      const r = await apiRequest("GET", `/api/reborn/my-payslips/${month}/pdf`);
      if (!r.ok) throw new Error((await r.json()).message);
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a"); a.href = url; a.download = `payslip-${month}.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e: any) { toast({ title: String(e.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" }); }
  };
  const monthName = (month: string) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString(localeTag(language), { month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <div className={card}>
      <p className="font-bold flex items-center gap-2 mb-2"><FileText className="w-4 h-4 text-emerald-300" /> {t("emp.slips")}</p>
      {slips.length === 0 && <p className="text-xs text-white/50">{t("emp.slipsNone")}</p>}
      {slips.map((slip) => (
        <div key={slip.month} className="flex items-center justify-between gap-2 border-t border-white/10 py-2 first:border-t-0">
          <div><p className="text-sm font-semibold">{monthName(slip.month)}</p><p className="text-xs text-emerald-200">{t("emp.slipNet", { v: `${slip.currency.symbol} ${slip.net.toLocaleString("en-US", { minimumFractionDigits: slip.currency.decimals, maximumFractionDigits: slip.currency.decimals })}` })}</p></div>
          <button type="button" onClick={() => download(slip.month)} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">{t("emp.slipDownload")}</button>
        </div>
      ))}
    </div>
  );
}

export default function RebornEmployment() {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data } = useQuery<any>({ queryKey: ["/api/reborn/my-employment"], queryFn: () => apiRequest("GET", "/api/reborn/my-employment").then((r) => r.json()) });
  const [photo, setPhoto] = useState<string | null>(null);
  const [idNumber, setIdNumber] = useState("");
  const [name, setName] = useState("");
  const [hasInk, setHasInk] = useState(false);
  const pad = useRef<SignaturePadHandle>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["/api/reborn/my-employment"] });
  const fail = (e: any) => toast({ title: String(e.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" });
  const post = (url: string, body: any) => apiRequest("POST", url, body).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; });

  const upload = useMutation({
    mutationFn: () => post("/api/reborn/my-employment/id", { image: photo, idNumber }),
    onSuccess: (d: any) => { toast({ title: d.message }); setPhoto(null); refresh(); },
    onError: fail,
  });
  const sign = useMutation({
    mutationFn: () => post("/api/reborn/my-employment/sign", { signature: pad.current?.toDataUrl(), name }),
    onSuccess: (d: any) => { toast({ title: d.message }); pad.current?.clear(); refresh(); },
    onError: fail,
  });
  const pickFile = async (file?: File) => {
    if (!file) return;
    try { setPhoto(await photoToDataUrl(file)); } catch { toast({ title: t("emp.badPhoto"), variant: "destructive" }); }
  };
  const download = async () => {
    try {
      const r = await apiRequest("GET", "/api/reborn/my-employment/pdf");
      if (!r.ok) throw new Error((await r.json()).message);
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a"); a.href = url; a.download = "employment-contract.pdf"; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) { fail(e); }
  };

  const status: string = data?.status || "none";
  const text = data?.text;
  const date = (v?: string) => (v ? new Date(v).toLocaleDateString(localeTag(language)) : "");
  return (
    <RebornLayout active="/profile" title={t("emp.title")}>
      <h1 className="text-xl font-extrabold mb-1">{t("emp.title")}</h1>
      <p className="text-sm text-white/50 mb-4">{t("emp.sub")}</p>

      <div className={card}>
        <p className="font-bold flex items-center gap-2 mb-1"><IdCard className="w-4 h-4 text-amber-300" /> {t("emp.idTitle")}</p>
        <p className="text-xs text-white/50 mb-3">{data?.hasId ? t("emp.idDone", { d: date(data.idUploadedAt) }) : t("emp.idHint")}</p>
        {status !== "approved" && (
          <>
            <label className="block rounded-xl border border-dashed border-white/25 p-3 text-center text-sm text-white/70">
              {photo ? <img src={photo} alt="" className="mx-auto max-h-48 rounded-lg" /> : (data?.hasId ? t("emp.idReplace") : t("emp.idPick"))}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
            </label>
            <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} maxLength={60} placeholder={t("emp.idNumber")} className="mt-2 w-full rounded-xl bg-white/10 px-3 py-2.5 text-sm" />
            <button onClick={() => upload.mutate()} disabled={!photo || upload.isPending} className="mt-2 w-full rounded-xl bg-amber-400 py-2.5 text-sm font-bold text-black disabled:opacity-40">{t("emp.idUpload")}</button>
          </>
        )}
      </div>

      <div className={card}>
        <p className="font-bold flex items-center gap-2 mb-1"><FileText className="w-4 h-4 text-amber-300" /> {t("emp.contractTitle")}</p>
        {status === "none" && <p className="text-xs text-white/50">{t("emp.none")}</p>}
        {status !== "none" && text && (
          <>
            {data.returnNote && status === "awaiting_staff" && <p className="mb-2 rounded-xl bg-amber-400/10 p-2 text-xs text-amber-200">{t("emp.returned", { note: data.returnNote })}</p>}
            <div className="rounded-xl bg-white/5 p-3 text-sm space-y-2 max-h-[50vh] overflow-auto">
              <p className="font-bold">{text.title}</p>
              <p>{text.intro}</p>
              {text.clauses.map((c: any, i: number) => <div key={i}><p className="font-semibold">{i + 1}. {c.heading}</p><p className="text-white/80 whitespace-pre-line">{c.body}</p></div>)}
              <p className="text-white/80">{text.closing}</p>
            </div>
            {status === "awaiting_staff" && (
              <div className="mt-3 space-y-3">
                {!data.hasId && <p className="rounded-xl bg-red-500/10 p-2 text-xs text-red-200">{t("emp.needId")}</p>}
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder={t("emp.fullName")} className="w-full rounded-xl bg-white/10 px-3 py-2.5 text-sm" />
                <SignaturePad ref={pad} label={t("emp.signHere")} clearLabel={t("emp.clear")} onChange={setHasInk} />
                <button onClick={() => sign.mutate()} disabled={!data.hasId || !name.trim() || !hasInk || sign.isPending} className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-black disabled:opacity-40">{t("emp.sign")}</button>
              </div>
            )}
            {status === "awaiting_approval" && <p className="mt-3 rounded-xl bg-sky-500/10 p-2 text-xs text-sky-200">{t("emp.waiting", { d: date(data.signedAt) })}</p>}
            {status === "approved" && (
              <div className="mt-3">
                <p className="rounded-xl bg-emerald-500/10 p-2 text-xs text-emerald-200">{t("emp.approved", { d: date(data.approvedAt) })}</p>
                <button onClick={download} className="mt-2 w-full rounded-xl bg-white/10 py-2.5 text-sm font-bold">{t("emp.download")}</button>
              </div>
            )}
          </>
        )}
      </div>
      <Payslips />
    </RebornLayout>
  );
}
