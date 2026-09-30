import { useEffect, useState } from "react";
import { MessageSquareMore, Star } from "lucide-react";
import { RebornLayout } from "@/components/RebornLayout";
import { useTranslation, translate, getCurrentLanguage } from "@/lib/i18n";

type Row = Record<string, any>;
async function call(path:string, companyId?:number, options:RequestInit={}) {
  const response = await fetch(path, { ...options, credentials:"include", headers:{"Content-Type":"application/json","X-Lang":getCurrentLanguage(),...(companyId?{"X-Company-Id":String(companyId)}:{}),...(options.headers||{})} });
  const data = await response.json().catch(()=>({})); if(!response.ok) throw new Error(data.message||translate("vn.fb.requestFailed")); return data;
}
const ROLE_WORDS=["owner","admin","manager","staff","employee","cashier","waiter","supervisor"];
const roleLabel=(r:any)=>r&&ROLE_WORDS.includes(String(r).toLowerCase())?translate(`vn.role.${String(r).toLowerCase()}`):(r||"");
const box="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none focus:border-amber-300";

export default function StaffFeedback() {
  const { t } = useTranslation();
  const [companies,setCompanies]=useState<Row[]>([]); const [companyId,setCompanyId]=useState<number>(); const [staff,setStaff]=useState<Row[]>([]);
  const [category,setCategory]=useState("service"); const [staffId,setStaffId]=useState(""); const [rating,setRating]=useState(5); const [subject,setSubject]=useState(""); const [messageText,setMessageText]=useState(""); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
  useEffect(()=>{call("/api/v1/companies").then((rows)=>{setCompanies(rows);const saved=Number(localStorage.getItem("bridgexCompanyId"));setCompanyId(rows.some((c:Row)=>c.id===saved)?saved:rows[0]?.id)}).catch(e=>setMessage(e.message));},[]);
  useEffect(()=>{if(!companyId)return;localStorage.setItem("bridgexCompanyId",String(companyId));call("/api/v1/company/staff",companyId).then(setStaff).catch(e=>setMessage(e.message));},[companyId]);
  async function submit(){if(!companyId||!messageText.trim()||(category==="staff"&&!staffId))return;setBusy(true);setMessage("");try{await call("/api/v1/company/feedback",companyId,{method:"POST",body:JSON.stringify({category,staffUserId:category==="staff"?staffId:null,rating,subject,message:messageText})});setMessage(t("vn.fb.thanks"));setMessageText("");setSubject("");setStaffId("");setRating(5)}catch(e:any){setMessage(e.message)}finally{setBusy(false)}}
  return <RebornLayout active="staff-feedback" title={t("vn.fb.title")}><div className="rounded-3xl border border-white/10 bg-white/5 p-5"><div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/15"><MessageSquareMore className="h-7 w-7 text-amber-300"/></div><h1 className="text-2xl font-extrabold">{t("vn.fb.heading")}</h1><p className="mb-5 mt-1 text-sm text-white/50">{t("vn.fb.sub")}</p>
    <div className="space-y-3"><select className={box} value={companyId||""} onChange={e=>setCompanyId(Number(e.target.value))}>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><div className="grid grid-cols-3 gap-2">{[["service",t("vn.fb.ourService")],["staff",t("vn.fb.ourStaff")],["improvement",t("vn.fb.improvement")]].map(([v,l])=><button key={v} onClick={()=>setCategory(v)} className={`rounded-xl border p-3 text-xs font-bold ${category===v?"border-amber-300 bg-amber-300/15 text-amber-200":"border-white/10 text-white/60"}`}>{l}</button>)}</div>
      {category==="staff"&&<select className={box} value={staffId} onChange={e=>setStaffId(e.target.value)}><option value="">{t("vn.fb.selectStaff")}</option>{staff.map(s=><option key={s.user_id} value={s.user_id}>{[s.first_name,s.last_name].filter(Boolean).join(" ")||s.email} · {s.position_name||roleLabel(s.role)}</option>)}</select>}
      {category!=="improvement"&&<div className="flex justify-center gap-2 py-3">{[1,2,3,4,5].map(n=><button key={n} aria-label={t(n===1?"vn.fb.star":"vn.fb.stars",{n})} onClick={()=>setRating(n)}><Star className={`h-9 w-9 ${n<=rating?"fill-amber-300 text-amber-300":"text-white/20"}`}/></button>)}</div>}
      <input className={box} placeholder={t("vn.fb.subjectPh")} value={subject} onChange={e=>setSubject(e.target.value)}/><textarea className={box+" min-h-28"} placeholder={t("vn.fb.messagePh")} value={messageText} onChange={e=>setMessageText(e.target.value)}/><button disabled={busy||!messageText.trim()||(category==="staff"&&!staffId)} onClick={submit} className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-300 py-3 font-bold text-black disabled:opacity-40">{busy?t("vn.otable.sending"):t("vn.fb.send")}</button>{message&&<p className="rounded-xl bg-white/5 p-3 text-sm text-amber-100">{message}</p>}</div>
  </div></RebornLayout>;
}
