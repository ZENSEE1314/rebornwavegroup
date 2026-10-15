import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation, localeTag } from "@/lib/i18n";

const MAX_PHOTO_SIDE = 1400;
const PHOTO_QUALITY = 0.8;

// A phone photo is many MB: shrink it in the browser to a picture the server accepts.
function shrinkPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const picture = new Image();
    picture.onload = () => {
      const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(picture.width, picture.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(picture.width * scale);
      canvas.height = Math.round(picture.height * scale);
      canvas.getContext("2d")!.drawImage(picture, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", PHOTO_QUALITY));
    };
    picture.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
    picture.src = url;
  });
}

const inp = "rounded-lg bg-white/10 px-2.5 py-2 text-sm text-white";
const STATUS_STYLE: Record<string, string> = { none: "bg-white/5 text-white/50", awaiting_staff: "bg-amber-400/15 text-amber-200", awaiting_approval: "bg-sky-500/20 text-sky-200", approved: "bg-emerald-500/20 text-emerald-300" };

// Admin › Payroll › a staff member › Contract: see the ID they uploaded, set the role, send the employment contract for them to sign,
// then approve it (the PDF is e-mailed to them and to the approving admin).
export function StaffContractPanel({ userId, name, role }: { userId: string; name: string; role?: string }) {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [idImage, setIdImage] = useState<string | null>(null);
  const [form, setForm] = useState<{ jobTitle: string; startDate: string; lang: string; extraTerms: string; jobScope: string } | null>(null);
  const [note, setNote] = useState("");
  const listKey = ["/api/reborn/admin/contracts"];
  const key = ["/api/reborn/admin/contracts", userId];
  const { data: list } = useQuery<any[]>({ queryKey: listKey, queryFn: () => apiRequest("GET", "/api/reborn/admin/contracts").then((r) => r.json()) });
  const { data } = useQuery<any>({ queryKey: key, enabled: open, queryFn: () => apiRequest("GET", `/api/reborn/admin/contracts/${userId}`).then((r) => r.json()) });
  const status: string = (open && data?.status) || list?.find((c) => c.userId === userId)?.status || "none";
  const refresh = () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: listKey }); };
  const fail = (e: any) => toast({ title: String(e.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" });
  const post = (path: string, body: any = {}) => apiRequest("POST", `/api/reborn/admin/contracts/${userId}/${path}`, body).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; });
  const f = form || { jobTitle: data?.jobTitle || role || "", startDate: data?.startDate || "", lang: data?.lang || (language as string) || "en", extraTerms: data?.extraTerms || "", jobScope: data?.jobScope || "" };
  const set = (patch: Partial<typeof f>) => setForm({ ...f, ...patch });

  const send = useMutation({ mutationFn: () => post("send", f), onSuccess: (d: any) => { toast({ title: d.message }); setForm(null); refresh(); }, onError: fail });
  const approve = useMutation({
    mutationFn: () => post("approve"),
    onSuccess: (d: any) => {
      const mail = d.emailed || {};
      toast({ title: d.message, description: mail.staff && mail.admin ? t("admin.ctr.emailedBoth") : mail.staff || mail.admin ? t("admin.ctr.emailedSome") : t("admin.ctr.emailedNone") });
      refresh();
    }, onError: fail,
  });
  const sendBack = useMutation({ mutationFn: () => post("return", { note }), onSuccess: (d: any) => { toast({ title: d.message }); setNote(""); refresh(); }, onError: fail });
  const email = useMutation({ mutationFn: () => post("email"), onSuccess: (d: any) => toast({ title: d.emailed?.staff || d.emailed?.admin ? t("admin.ctr.emailedSome") : t("admin.ctr.emailedNone") }), onError: fail });
  const viewId = useMutation({
    mutationFn: () => apiRequest("GET", `/api/reborn/admin/contracts/${userId}/id`).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; }),
    onSuccess: (d: any) => setIdImage(d.image), onError: fail,
  });
  const uploadId = useMutation({
    mutationFn: async (file: File) => {
      const image = await shrinkPhoto(file);
      return post("id", { image, idNumber: data?.idNumber || "" });
    },
    onSuccess: (d: any) => { toast({ title: d.message }); setIdImage(null); refresh(); }, onError: fail,
  });
  const download = async () => {
    try {
      const r = await apiRequest("GET", `/api/reborn/admin/contracts/${userId}/pdf`);
      if (!r.ok) throw new Error((await r.json()).message);
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a"); a.href = url; a.download = `contract-${name.replace(/\W+/g, "_")}.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) { fail(e); }
  };
  const date = (v?: string) => (v ? new Date(v).toLocaleDateString(localeTag(language)) : "");
  const text = data?.text;

  return (
    <div className="mt-3 rounded-xl border border-white/10">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left">
        <span className="text-sm font-bold">{t("admin.ctr.title")}</span>
        <span className={`rounded-lg px-2 py-1 text-[11px] font-bold ${STATUS_STYLE[status] || STATUS_STYLE.none}`}>{t(`admin.ctr.status.${status}`)}</span>
      </button>
      {open && data && (
        <div className="space-y-3 border-t border-white/10 p-3">
          <div>
            <p className="text-xs text-white/60">{data.hasId ? t("admin.ctr.idDone", { d: date(data.idUploadedAt) }) : t("admin.ctr.noId")}{data.idNumber ? ` · ${data.idNumber}` : ""}</p>
            <label className="mt-1 ml-2 inline-block cursor-pointer rounded-lg bg-white/10 px-3 py-2 text-xs font-bold">{uploadId.isPending ? t("admin.ctr.uploading") : t("admin.ctr.uploadFor")}<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadId.mutate(file); e.target.value = ""; }} /></label>
            {data.hasId && <button type="button" onClick={() => (idImage ? setIdImage(null) : viewId.mutate())} className="mt-1 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold">{idImage ? t("admin.ctr.hideId") : t("admin.ctr.viewId")}</button>}
            {idImage && <img src={idImage} alt="" className="mt-2 max-h-72 rounded-lg" />}
          </div>

          {status !== "approved" && status !== "awaiting_approval" && (
            <div className="grid grid-cols-2 gap-2">
              <label className="col-span-2 text-[11px] text-white/50">{t("admin.ctr.role")}<input value={f.jobTitle} maxLength={120} onChange={(e) => set({ jobTitle: e.target.value })} placeholder={t("admin.ctr.rolePh")} className={inp + " w-full"} /></label>
              <label className="text-[11px] text-white/50">{t("admin.ctr.start")}<input type="date" value={f.startDate} onChange={(e) => set({ startDate: e.target.value })} className={inp + " w-full"} style={{ colorScheme: "dark" }} /></label>
              <label className="text-[11px] text-white/50">{t("admin.ctr.lang")}<select value={f.lang} onChange={(e) => set({ lang: e.target.value })} className={inp + " w-full"}><option value="en">English</option><option value="zh">中文</option><option value="id">Bahasa Indonesia</option></select></label>
              <label className="col-span-2 text-[11px] text-white/50">{t("admin.ctr.scope")}<textarea value={f.jobScope} rows={4} maxLength={2000} onChange={(e) => set({ jobScope: e.target.value })} placeholder={t("admin.ctr.scopePh")} className={inp + " w-full"} /></label>
              <label className="col-span-2 text-[11px] text-white/50">{t("admin.ctr.extra")}<textarea value={f.extraTerms} rows={3} maxLength={4000} onChange={(e) => set({ extraTerms: e.target.value })} placeholder={t("admin.ctr.extraPh")} className={inp + " w-full"} /></label>
              <p className="col-span-2 text-[11px] text-white/40">{t("admin.ctr.fromPayroll")}</p>
              <button type="button" onClick={() => send.mutate()} disabled={!f.jobTitle.trim() || send.isPending} className="col-span-2 rounded-xl bg-amber-400 py-2.5 text-sm font-bold text-black disabled:opacity-40">{status === "none" ? t("admin.ctr.send") : t("admin.ctr.resend")}</button>
            </div>
          )}

          {text && (
            <div className="max-h-60 overflow-auto rounded-xl bg-white/5 p-3 text-xs space-y-1.5">
              <p className="font-bold">{text.title}</p>
              <p>{text.intro}</p>
              {text.clauses.map((c: any, i: number) => <div key={i}><p className="font-semibold">{i + 1}. {c.heading}</p><p className="text-white/70 whitespace-pre-line">{c.body}</p></div>)}
            </div>
          )}

          {status === "awaiting_staff" && <p className="text-xs text-amber-200">{t("admin.ctr.waitingStaff")}</p>}

          {status === "awaiting_approval" && (
            <div className="space-y-2">
              <p className="text-xs text-sky-200">{t("admin.ctr.signed", { n: data.signedName, d: date(data.signedAt) })}</p>
              <button type="button" onClick={() => approve.mutate()} disabled={approve.isPending} className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-black disabled:opacity-40">{t("admin.ctr.approve")}</button>
              <div className="flex gap-2">
                <input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder={t("admin.ctr.returnNote")} className={inp + " min-w-0 flex-1"} />
                <button type="button" onClick={() => sendBack.mutate()} disabled={sendBack.isPending} className="rounded-xl bg-white/10 px-3 text-sm font-bold">{t("admin.ctr.return")}</button>
              </div>
            </div>
          )}

          {status === "approved" && <p className="text-xs text-emerald-200">{t("admin.ctr.approvedOn", { d: date(data.approvedAt) })}</p>}
          {status !== "none" && data.text && (
            <div className="flex gap-2">
              <button type="button" onClick={download} className="flex-1 rounded-xl bg-white/10 py-2.5 text-sm font-bold">{t("admin.ctr.pdf")}</button>
              {status === "approved" && <button type="button" onClick={() => email.mutate()} disabled={email.isPending} className="flex-1 rounded-xl bg-white/10 py-2.5 text-sm font-bold">{t("admin.ctr.emailAgain")}</button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
