import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { RebornLayout } from "@/components/RebornLayout";

type Row = Record<string, any>;
async function call(path:string, companyId?:number, options:RequestInit={}) {
  const response = await fetch(path, { ...options, credentials:"include", headers:{"Content-Type":"application/json",...(companyId?{"X-Company-Id":String(companyId)}:{}),...(options.headers||{})} });
  const data = await response.json().catch(()=>({})); if(!response.ok) throw new Error(data.message||"Request failed"); return data;
}

export default function StaffFeedback() {
  const [companies,setCompanies]=useState<Row[]>([]); const [companyId,setCompanyId]=useState<number>(); const [staff,setStaff]=useState<Row[]>([]);
  const [staffId,setStaffId]=useState(""); const [rating,setRating]=useState(5); const [note,setNote]=useState(""); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
  useEffect(()=>{call("/api/v1/companies").then((rows)=>{setCompanies(rows); const saved=Number(localStorage.getItem("bridgexCompanyId")); setCompanyId(rows.some((c:Row)=>c.id===saved)?saved:rows[0]?.id);}).catch(e=>setMessage(e.message));},[]);
  useEffect(()=>{if(!companyId)return; localStorage.setItem("bridgexCompanyId",String(companyId)); call("/api/v1/company/staff",companyId).then(setStaff).catch(e=>setMessage(e.message));},[companyId]);
  async function submit(){if(!companyId||!staffId)return;setBusy(true);setMessage("");try{await call(`/api/v1/company/staff/${staffId}/reviews`,companyId,{method:"POST",body:JSON.stringify({rating,note})});setMessage("Thank you. Your feedback was sent to the staff member and management.");setNote("");setRating(5);setStaffId("");}catch(e:any){setMessage(e.message)}finally{setBusy(false)}}
  return <RebornLayout active="staff-feedback" title="STAFF FEEDBACK"><div className="rounded-3xl border border-white/10 bg-white/5 p-5"><div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/15"><Star className="h-7 w-7 fill-amber-300 text-amber-300"/></div><h1 className="text-2xl font-extrabold">How was our team?</h1><p className="mb-5 mt-1 text-sm text-white/50">Choose the person who helped you. Your rating appears on their staff profile and weekly leaderboard.</p>
    <div className="space-y-3"><select className="w-full rounded-xl border border-white/10 bg-black/30 p-3" value={companyId||""} onChange={e=>setCompanyId(Number(e.target.value))}>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><select className="w-full rounded-xl border border-white/10 bg-black/30 p-3" value={staffId} onChange={e=>setStaffId(e.target.value)}><option value="">Select staff member</option>{staff.map(s=><option key={s.user_id} value={s.user_id}>{[s.first_name,s.last_name].filter(Boolean).join(" ")||s.email} · {s.position_name||s.role}</option>)}</select>
      <div className="flex justify-center gap-2 py-3">{[1,2,3,4,5].map(n=><button key={n} aria-label={`${n} stars`} onClick={()=>setRating(n)}><Star className={`h-9 w-9 ${n<=rating?"fill-amber-300 text-amber-300":"text-white/20"}`}/></button>)}</div><textarea className="min-h-28 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm" placeholder="Tell us what was good or what we should improve" value={note} onChange={e=>setNote(e.target.value)}/><button disabled={busy||!staffId} onClick={submit} className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-300 py-3 font-bold text-black disabled:opacity-40">{busy?"Sending…":"Send feedback"}</button>{message&&<p className="rounded-xl bg-white/5 p-3 text-sm text-amber-100">{message}</p>}</div>
  </div></RebornLayout>;
}
