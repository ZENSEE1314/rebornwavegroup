import { useEffect, useMemo, useState } from "react";
import { Building2, ChevronLeft, LogOut, Plus, ShieldCheck, Smartphone, Star, Users, WandSparkles } from "lucide-react";
import { Link } from "wouter";

import { useTranslation } from "@/lib/i18n";
import { APP_SKINS, DEFAULT_APP_SKIN } from "@shared/appSkins";
import { canUseBridgeXConsole } from "@/hooks/useTenantBrand";
import { moneySymbol } from "@/lib/money";
import { COUNTRIES } from "@shared/countries";

const MODULES = ["pos", "restaurant", "retail", "ktv", "beauty", "booking", "inventory", "employees", "payroll", "membership", "loyalty", "qr_ordering", "kitchen_display", "accounting", "analytics", "ai_whatsapp", "ai_telegram", "song_requests", "bottle_keep", "faq_automation", "games"];
type Company = { id:number; slug?:string; country?:string; localCurrency?:string; dataMode?:string; serverUrl?:string; name:string; appName:string; industry:string; status:string; logoUrl?:string; websiteDomain?:string; subscriptionPlan:string; subscriptionStatus:string; trialEndsAt?:string; billingModel?:string; billingCycle?:string; price?:string; currency?:string; theme?:any };
type Row = Record<string, any>;

let activeBranchId: number | undefined; // selected outlet; sent on every scoped request
export async function request(path:string, options:RequestInit = {}, companyId?:number) {
  const response = await fetch(path, { ...options, credentials:"include", headers:{ "Content-Type":"application/json", ...(companyId ? { "X-Company-Id":String(companyId) } : {}), ...(activeBranchId ? { "X-Branch-Id":String(activeBranchId) } : {}), ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || `Request failed (${response.status})`);
  return body;
}

// A tenant's app lives on its own domain when it has one, otherwise under /t/<slug>.
const tenantUrl = (c: { websiteDomain?: string; slug?: string; dataMode?: string; serverUrl?: string }) =>
  c.dataMode === "dedicated" && c.serverUrl ? c.serverUrl
    : c.websiteDomain ? `https://${c.websiteDomain}` : `${window.location.origin}/t/${c.slug}`;

// The platform's own company keeps its data on the platform tables.
const FLAGSHIP_SLUG = "reborn-wave-group";

export const field = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400";
export const button = "rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50";

// The admins of one company's own app. They live in that company's data, so BridgeX is
// where a first admin is created or a lost password is replaced.
function CompanyAdmins({ company, onMsg }: { company: Company; onMsg: (message: string) => void }) {
  const { t } = useTranslation();
  const base = `/api/v1/platform/companies/${company.id}/admins`;
  const [admins, setAdmins] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const load = () => request(base).then(setAdmins).catch((e) => { setAdmins([]); onMsg(e.message); }).finally(() => setLoaded(true));
  useEffect(() => { setLoaded(false); load(); }, [company.id, company.dataMode]);
  const run = async (work: () => Promise<string>) => {
    setBusy(true);
    try { onMsg(await work()); await load(); } catch (e: any) { onMsg(e.message); } finally { setBusy(false); }
  };
  const create = () => run(async () => {
    const made = await request(base, { method: "POST", body: JSON.stringify(form) });
    setForm({ name: "", email: "", password: "" });
    if (made.existing) return t("admin.bx.admins.promoted", { email: made.email });
    return made.temporaryPassword ? t("admin.bx.admins.createdTemp", { email: made.email, password: made.temporaryPassword }) : t("admin.bx.admins.created", { email: made.email });
  });
  const resetPassword = (admin: Row) => run(async () => {
    const reset = await request(`${base}/${admin.id}/password`, { method: "POST", body: "{}" });
    return t("admin.bx.admins.newPassword", { email: admin.email, password: reset.temporaryPassword });
  });
  const remove = (admin: Row) => {
    if (!window.confirm(t("admin.bx.admins.confirmRemove", { email: admin.email }))) return;
    run(async () => { await request(`${base}/${admin.id}`, { method: "DELETE" }); return t("admin.bx.admins.removed", { email: admin.email }); });
  };
  return (
    <div className="rounded-xl border border-white/10 bg-white/[.03] p-4">
      <b>{t("admin.bx.admins.title", { name: company.appName || company.name })}</b>
      <p className="mt-1 text-xs text-slate-400">{t("admin.bx.admins.hint")}</p>
      <div className="mt-3 grid gap-2">
        {loaded && admins.length === 0 && <p className="text-sm text-amber-300">{t("admin.bx.admins.none")}</p>}
        {admins.map((admin) => (
          <div key={admin.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="min-w-0"><b className="block truncate">{[admin.firstName, admin.lastName].filter(Boolean).join(" ") || admin.email}</b><span className="block truncate text-xs text-slate-400">{admin.email}</span></div>
            <div className="flex gap-3">
              <button disabled={busy} className="text-xs text-cyan-300 disabled:opacity-40" onClick={() => resetPassword(admin)}>{t("admin.bx.admins.reset")}</button>
              <button disabled={busy} className="text-xs text-red-300 disabled:opacity-40" onClick={() => remove(admin)}>{t("admin.bx.admins.remove")}</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <input className={field} placeholder={t("admin.bx.admins.name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={field} type="email" autoCapitalize="none" placeholder={t("admin.bx.admins.email")} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className={field} type="text" autoComplete="off" placeholder={t("admin.bx.admins.password")} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </div>
      <button disabled={busy || !form.email.includes("@")} className={button + " mt-3"} onClick={create}><Plus className="mr-1 inline h-4 w-4" />{t("admin.bx.admins.create")}</button>
    </div>
  );
}

// The app designs (ten looks + five light industry styles), each drawn as a small phone so the admin sees what they are choosing.
function AppSkinPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="mt-5">
      <p className="text-sm font-bold text-white">{t("admin.bx.skin.title")}</p>
      <p className="mt-1 text-xs text-slate-400">{t("admin.bx.skin.hint")}</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {APP_SKINS.map((skin) => (
          <button key={skin.id} type="button" aria-pressed={value === skin.id} onClick={() => onChange(skin.id)} className={`rounded-2xl border p-2 text-left ${value === skin.id ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-white/5"}`}>
            <div className="flex h-36 flex-col gap-1.5 overflow-hidden rounded-xl p-2" style={{ background: skin.page }}>
              <div className="flex items-center justify-between"><span className="h-2 w-10 rounded-full" style={{ background: skin.accentSoft }} /><span className="h-2.5 w-6 rounded-full" style={{ background: skin.accent }} /></div>
              <div className="flex-1 p-2" style={{ background: skin.panel, border: `1px solid ${skin.edge}`, borderRadius: skin.radius }}>
                <span className="block text-[10px] font-bold" style={{ color: skin.ink || skin.accentSoft }}>{t("admin.bx.skin.sample")}</span>
                <span className={`mt-1.5 block h-1.5 w-3/4 rounded-full ${skin.mode === "light" ? "bg-black/15" : "bg-white/25"}`} />
                <span className={`mt-1 block h-1.5 w-1/2 rounded-full ${skin.mode === "light" ? "bg-black/10" : "bg-white/15"}`} />
                <span className="mt-2 block h-4 w-14" style={{ background: skin.accent, borderRadius: skin.radius }} />
              </div>
              <div className="flex justify-around">{[0, 1, 2, 3].map((slot) => <span key={slot} className="h-3 w-5" style={{ background: slot === 1 ? skin.accent : skin.panel, border: `1px solid ${skin.edge}`, borderRadius: Math.min(skin.radius, 6) }} />)}</div>
            </div>
            <span className="mt-2 block text-xs font-bold text-white">{t(`admin.bx.skin.${skin.id}`)}</span>
            <span className="block text-[11px] leading-snug text-slate-400">{t(`admin.bx.skin.${skin.id}.d`)}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">{t("admin.bx.skin.saveNote")}</p>
    </div>
  );
}

export default function BridgeXAdmin() {
  const { t, language } = useTranslation();
  const [companies,setCompanies] = useState<Company[]>([]);
  const [companyId,setCompanyId] = useState<number>();
  const [branchId,setBranchId] = useState<number|undefined>();
  const [platformAdmin,setPlatformAdmin] = useState(false);
  const [superAdmin,setSuperAdmin] = useState(false);
  const [registry,setRegistry] = useState<{key:string;name:string;category:string;status:string;desc:string}[]>([]);
  const [industries,setIndustries] = useState<{key:string;name:string;modules:string[]}[]>([]);
  const [modules,setModules] = useState<string[]>([]);
  const [effectiveModules,setEffectiveModules] = useState<string[]>([]); // company modules, narrowed to the selected outlet's business types
  const [branches,setBranches] = useState<Row[]>([]);
  const [positions,setPositions] = useState<Row[]>([]);
  const [staff,setStaff] = useState<Row[]>([]);
  const [leaders,setLeaders] = useState<Row[]>([]);
  const [meetings,setMeetings] = useState<Row[]>([]);
  const [attendance,setAttendance] = useState<Row[]>([]);
  const [leave,setLeave] = useState<Row[]>([]);
  const [shifts,setShifts] = useState<Row[]>([]);
  const [applications,setApplications] = useState<Row[]>([]);
  const [tenantUsers,setTenantUsers] = useState<Row[]>([]);
  const [feedback,setFeedback] = useState<Row[]>([]);
  const [suppliers,setSuppliers] = useState<Row[]>([]);
  const [items,setItems] = useState<Row[]>([]);
  const [purchaseOrders,setPurchaseOrders] = useState<Row[]>([]);
  const [customers,setCustomers] = useState<Row[]>([]);
  const [segments,setSegments] = useState<Row>({});
  const [custSearch,setCustSearch] = useState("");
  const [supForm,setSupForm] = useState({name:"",phone:"",email:""});
  const [itemForm,setItemForm] = useState({name:"",sku:"",category:"",unit:"unit",costPrice:"0",sellPrice:"0",lowStockThreshold:"0",supplierId:""});
  const [custForm,setCustForm] = useState({name:"",phone:"",email:"",birthday:"",note:""});
  const [poForm,setPoForm] = useState<{supplierId:string;note:string;lines:{itemId:string;quantity:string;unitCost:string}[]}>({supplierId:"",note:"",lines:[{itemId:"",quantity:"1",unitCost:"0"}]});
  const [access,setAccess] = useState<Row>({});
  const [settings,setSettings] = useState<any>({ loyalty:{pointsSpendRp:1000,rewardsEnabled:true,tiers:[]}, services:{}, booking:{areas:[]}, automation:{reminders:[],faq:[]} });
  const [tab,setTab] = useState(() => { try { return new URLSearchParams(location.search).get("tab") || "company"; } catch { return "company"; } });
  const [loaded,setLoaded] = useState(false);
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const [companyForm,setCompanyForm] = useState({ name:"", appName:"", adminEmail:"", websiteDomain:"", industry:"restaurant", country:"ID", branchName:"Main Outlet", subscriptionPlan:"starter", billingModel:"subscription", billingCycle:"monthly", price:"0", modules:["pos","inventory","employees"], dataMode:"schema", serverUrl:"" });
  const [branchForm,setBranchForm] = useState({ name:"", address:"" });
  const [positionName,setPositionName] = useState("");
  const [staffForm,setStaffForm] = useState({ userId:"", name:"", email:"", role:"staff", branchId:"", positionId:"", employmentType:"full_time", payType:"salary", baseSalary:"0", hourlyRate:"0", hireDate:"" });
  const [meetingForm,setMeetingForm] = useState({ title:"", startsAt:"", location:"", agenda:"" });
  const [leaveForm,setLeaveForm] = useState({ type:"leave", startDate:"", endDate:"", reason:"" });
  const [shiftForm,setShiftForm] = useState({ userId:"", shiftDate:"", startTime:"", endTime:"", role:"", note:"" });
  const [shiftDates,setShiftDates] = useState<string[]>([]);
  const [userSearch,setUserSearch] = useState("");
  const selected = useMemo(() => companies.find((c) => c.id === companyId),[companies,companyId]);
  const moduleGroups = useMemo(() => {
    const src = registry.length ? registry : MODULES.map(k=>({key:k,name:k.replaceAll("_"," "),category:"Modules",status:"live",desc:""}));
    const g:Record<string,typeof src> = {};
    src.forEach(m=>{(g[m.category]=g[m.category]||[]).push(m);});
    return g;
  },[registry]);
  const [brand,setBrand] = useState({ appName:"", logoUrl:"", appIconUrl:"", websiteDomain:"", androidPackage:"", iosBundleId:"", primaryColor:"#06b6d4", accentColor:"#f59e0b", skin:DEFAULT_APP_SKIN, billingModel:"subscription", billingCycle:"monthly", subscriptionPlan:"starter", price:"0", currency:"IDR" });

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    location.replace("/bridgexpos/login");
  };
  async function loadCompanies() {
    const [boot,list] = await Promise.all([request("/api/v1/platform/bootstrap"),request("/api/v1/companies")]);
    // Signed in, but not allowed in the console (a company's owner, staff or member): out.
    if (!canUseBridgeXConsole(!!boot.platformAdmin, list.map((company: Company) => company.slug || ""))) { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {}); location.replace("/bridgexpos/login"); return; }
    const shown: Company[] = boot.platformAdmin ? list : list.filter((company: Company) => company.slug === FLAGSHIP_SLUG);
    setPlatformAdmin(boot.platformAdmin); setSuperAdmin(!!boot.superAdmin); setCompanies(shown); setCompanyId((current) => current || shown[0]?.id); setLoaded(true);
    if (boot.platformAdmin) setApplications(await request("/api/v1/platform/applications"));
  }
  async function loadTenant(id:number, hydrateForms=true) {
    const [mods,bs,ps,ss,ls,ms,wl,att,lv,sh,fb,cfg,gate] = await Promise.all([
      request("/api/v1/company/modules",{},id), request("/api/v1/company/branches",{},id), request("/api/v1/company/positions",{},id),
      request("/api/v1/company/staff",{},id), request("/api/v1/company/staff/leaderboard",{},id), request("/api/v1/company/meetings",{},id), request("/api/v1/company/white-label",{},id),
      request("/api/v1/company/attendance",{},id), request("/api/v1/company/leave",{},id), request("/api/v1/company/shifts",{},id),
      request("/api/v1/company/feedback",{},id), request("/api/v1/company/settings",{},id), request("/api/v1/company/access-status",{},id),
    ]);
    const en = mods.filter((m:Row) => m.enabled).map((m:Row) => m.moduleKey);
    setModules(en); setBranches(bs); setPositions(ps); setStaff(ss); setLeaders(ls); setMeetings(ms);
    setAttendance(att); setLeave(lv); setShifts(sh);
    setFeedback(fb); if(hydrateForms) setSettings(cfg.config || settings); setAccess(gate);
    try { const bm = await request(`/api/v1/company/branch-modules?branchId=${activeBranchId||0}`,{},id); setEffectiveModules(Array.isArray(bm.modules)?bm.modules:en); } catch { setEffectiveModules(en); }
    await loadModuleData(id, en);
    if(hydrateForms) setBrand({ appName:wl.appName || "", logoUrl:wl.logoUrl || "", appIconUrl:wl.appIconUrl || "", websiteDomain:wl.websiteDomain || "", androidPackage:wl.androidPackage || "", iosBundleId:wl.iosBundleId || "", primaryColor:wl.theme?.primaryColor || "#06b6d4", accentColor:wl.theme?.accentColor || "#f59e0b", skin:wl.theme?.skin || DEFAULT_APP_SKIN, billingModel:wl.billingModel || "subscription", billingCycle:wl.billingCycle || "monthly", subscriptionPlan:wl.subscriptionPlan || "starter", price:wl.price || "0", currency:wl.currency || "IDR" });
  }
  async function loadModuleData(id:number, en:string[]) {
    try {
      if (en.includes("inventory")) { setItems(await request("/api/v1/company/inventory/items",{},id)); setSuppliers(await request("/api/v1/company/inventory/suppliers",{},id)); } else { setItems([]); setSuppliers([]); }
      if (en.includes("purchasing")) setPurchaseOrders(await request("/api/v1/company/inventory/purchase-orders",{},id)); else setPurchaseOrders([]);
      if (en.includes("crm")) { setCustomers(await request(`/api/v1/company/crm/customers?q=${encodeURIComponent(custSearch)}`,{},id)); setSegments(await request("/api/v1/company/crm/segments",{},id)); } else { setCustomers([]); setSegments({}); }
    } catch {}
  }
  useEffect(() => { loadCompanies().catch((e) => setMessage(e.message)); },[]);
  useEffect(() => { if(companyId && modules.includes("crm")) { const t=setTimeout(()=>request(`/api/v1/company/crm/customers?q=${encodeURIComponent(custSearch)}`,{},companyId).then(setCustomers).catch(()=>{}),250); return ()=>clearTimeout(t); } },[custSearch,companyId,modules]);
  useEffect(() => { Promise.all([request("/api/v1/meta/modules"),request("/api/v1/meta/industries")]).then(([m,i])=>{setRegistry(m);setIndustries(i);const preset=i.find((x:any)=>x.key===companyForm.industry);if(preset)setCompanyForm(f=>({...f,modules:preset.modules}));}).catch(()=>{}); },[]);
  useEffect(() => {
    const params = new URLSearchParams(location.search); const sessionId = params.get("session_id");
    if (params.get("checkout") === "success" && sessionId) {
      const saved = Number(localStorage.getItem("bridgexCompanyId"));
      if (saved) act(() => request("/api/v1/company/billing/confirm", { method:"POST", body:JSON.stringify({sessionId}) }, saved), "Payment confirmed and subscription activated").finally(() => history.replaceState({}, "", "/bridgex"));
    } else if (params.get("checkout") === "cancelled") { setMessage("Checkout cancelled"); history.replaceState({}, "", "/bridgex"); }
  },[]);
  useEffect(() => { activeBranchId = branchId; },[branchId]);
  useEffect(() => { // reset outlet when switching company, restoring any saved choice
    if (!companyId) return;
    const saved = Number(localStorage.getItem(`bridgexBranch:${companyId}`)) || undefined;
    activeBranchId = saved; setBranchId(saved);
  },[companyId]);
  const selectBranch = (id?:number) => { setBranchId(id); activeBranchId = id; if (companyId) { if (id) localStorage.setItem(`bridgexBranch:${companyId}`, String(id)); else localStorage.removeItem(`bridgexBranch:${companyId}`); loadTenant(companyId, false).catch(()=>{}); } };
  useEffect(() => { if (companyId) { localStorage.setItem("bridgexCompanyId", String(companyId)); loadTenant(companyId).catch((e) => setMessage(e.message)); } },[companyId,branchId]);
  useEffect(() => { if(!companyId)return; const refresh=()=>loadTenant(companyId,false).catch(()=>{}); const timer=setInterval(refresh,5000); const stream=new EventSource(`/api/v1/company/live?companyId=${companyId}`); stream.addEventListener("change",refresh); return()=>{clearInterval(timer);stream.close()}; },[companyId]);
  useEffect(() => { if(!companyId)return; const timer=setTimeout(()=>request(`/api/v1/company/users?q=${encodeURIComponent(userSearch)}`,{},companyId).then(setTenantUsers).catch(()=>{}),250); return()=>clearTimeout(timer); },[companyId,userSearch]);
  async function act(run:()=>Promise<any>, success:string) { setBusy(true); setMessage(""); try { await run(); setMessage(success); if(companyId) await loadTenant(companyId); await loadCompanies(); } catch(e:any) { setMessage(e.message); } finally { setBusy(false); } }

  if (loaded && !platformAdmin && companies.length === 0) return <div className="grid min-h-screen place-items-center bg-[#07101f] p-6 text-center text-slate-100"><div className="max-w-sm"><div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-cyan-400 font-black text-slate-950">BX</div><h1 className="text-xl font-black">No business console access</h1><p className="mt-2 text-sm text-slate-400">Your account isn't an owner or staff member of any BridgeXPOS business. If you manage a business, ask your platform admin to add you, or open your business app instead.</p><Link href="/" className="mt-5 inline-block rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950">Back to app</Link></div></div>;

  return <div className="min-h-screen overflow-x-hidden bg-[#07101f] text-slate-100">
    <header className="border-b border-white/10 bg-slate-950/70 px-5 py-4 backdrop-blur"><div className="mx-auto flex max-w-7xl flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex items-center gap-3"><Link href="/"><ChevronLeft className="h-5 w-5" /></Link><div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400 font-black text-slate-950">BX</div><div><h1 className="font-black tracking-tight">BridgeXPOS</h1><p className="text-xs text-slate-400">Multi-company control centre</p></div></div>
      <div className="flex w-full gap-2 sm:w-auto">
        <button type="button" onClick={logout} className="order-last inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2.5 text-sm font-bold text-red-200 hover:bg-red-500/20"><LogOut className="h-4 w-4" />{t("nav.logout")}</button>
        <select className={field+" w-full sm:max-w-xs"} value={companyId || ""} onChange={(e) => setCompanyId(Number(e.target.value))}>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        {branches.length>0 && <select className={field+" w-40"} value={branchId || ""} onChange={(e)=>selectBranch(e.target.value?Number(e.target.value):undefined)} title="Outlet / branch"><option value="">All outlets</option>{branches.map((b)=><option key={b.id} value={b.id}>{b.name}</option>)}</select>}
      </div>
    </div></header>
    <main className="mx-auto min-w-0 max-w-7xl p-3 sm:p-5">
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={<Building2/>} label="Companies" value={companies.length}/><Stat icon={<Users/>} label="Team" value={staff.length}/><Stat icon={<WandSparkles/>} label="Modules" value={modules.length}/><Stat icon={<ShieldCheck/>} label="Access" value={platformAdmin ? "Super admin" : "Company"}/>
      </section>
      {message && <div className="mb-5 rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-3 text-sm text-cyan-100">{message}</div>}
      {companyId&&<div className={`mb-5 rounded-xl border p-3 text-sm ${access.allowed?"border-emerald-400/30 bg-emerald-400/10 text-emerald-200":"border-red-400/40 bg-red-500/10 text-red-200"}`}><b>{access.allowed?"App access enabled":"App access locked"}</b> · {access.subscriptionStatus||selected?.subscriptionStatus}{access.trialEndsAt&&` · trial ends ${new Date(access.trialEndsAt).toLocaleDateString()}`}</div>}
      {/* BridgeX platform console = super-admin only: create companies, enable/disable
          their modules, set branches & business types, white-label + billing.
          All day-to-day operations (POS, bookings, staff, inventory, accounting, …)
          live in the company's own app (Reborn), not here. */}
      <nav className="-mx-3 mb-5 flex max-w-[100vw] gap-2 overflow-x-auto px-3 pb-2 sm:mx-0 sm:max-w-full sm:px-0">{[["company","Companies"],...(platformAdmin?[["overview","All companies"]]:[]),...(platformAdmin?[["admins",t("admin.bx.admins.tab")]]:[]),...(superAdmin?[["team","Team"]]:[]),...(platformAdmin?[["applications","Applications"]]:[]),["modules","Services (enable/disable)"],["branches","Branches & business types"],["brand","White label & billing"]].map(([id,label]) => <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${tab===id?"bg-cyan-400 font-bold text-slate-950":"bg-white/5 text-slate-300"}`}>{label}</button>)}</nav>

      {tab === "company" && <Panel title={platformAdmin?"Company accounts":"Your business"} subtitle={platformAdmin?"Create a business, its owner login, first branch, domain and billing.":"Businesses you own or manage."}>
        {platformAdmin && <>
        <div className="grid gap-3 md:grid-cols-3">{["name","appName","adminEmail","websiteDomain","branchName","price"].map((key) => <input key={key} className={field} placeholder={({name:"Company name",appName:"Customer-facing app name",adminEmail:"Owner email",websiteDomain:"App domain (e.g. company.com)",branchName:"First branch",price:"Price"} as Record<string,string>)[key]} value={(companyForm as any)[key]} onChange={(e)=>setCompanyForm({...companyForm,[key]:e.target.value})}/>)}</div>
        <div className="mt-3 grid gap-3 md:grid-cols-4"><select className={field} value={companyForm.industry} onChange={(e)=>{const ind=e.target.value;const preset=industries.find(i=>i.key===ind);setCompanyForm({...companyForm,industry:ind,modules:preset?preset.modules:companyForm.modules});}}>{(industries.length?industries:[{key:"other",name:"Other"}]).map(x=><option key={x.key} value={x.key}>{x.name}</option>)}</select><select className={field} value={companyForm.billingModel} onChange={(e)=>setCompanyForm({...companyForm,billingModel:e.target.value,billingCycle:e.target.value==="one_time"?"one_time":"monthly"})}><option value="subscription">Subscription</option><option value="one_time">One-time payment</option></select><select className={field} value={companyForm.billingCycle} disabled={companyForm.billingModel==="one_time"} onChange={(e)=>setCompanyForm({...companyForm,billingCycle:e.target.value})}><option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="one_time">One time</option></select><select className={field} value={companyForm.subscriptionPlan} onChange={(e)=>setCompanyForm({...companyForm,subscriptionPlan:e.target.value})}><option>starter</option><option>growth</option><option>enterprise</option><option>custom</option></select></div>
        <label className="mt-3 block text-xs text-slate-400">{t("admin.bx.country")}<select className={field+" mt-1"} value={companyForm.country} onChange={(e)=>setCompanyForm({...companyForm,country:e.target.value})}>{COUNTRIES.map(c=><option key={c.code} value={c.code}>{c.name[language]} · {c.currency}</option>)}</select><span className="mt-1 block text-[11px] text-slate-500">{t("admin.bx.countryHint")}</span></label>
        <div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-xs text-slate-400">{t("admin.bx.data.label")}<select className={field+" mt-1"} value={companyForm.dataMode} onChange={(e)=>setCompanyForm({...companyForm,dataMode:e.target.value})}><option value="schema">{t("admin.bx.data.schema")}</option><option value="dedicated">{t("admin.bx.data.dedicated")}</option></select></label>{companyForm.dataMode==="dedicated"&&<label className="text-xs text-slate-400">{t("admin.bx.data.serverUrl")}<input className={field+" mt-1"} placeholder="https://" value={companyForm.serverUrl} onChange={(e)=>setCompanyForm({...companyForm,serverUrl:e.target.value})}/></label>}</div>
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[.03] p-3"><p className="mb-2 text-xs text-slate-400">This industry turns on {companyForm.modules.length} module(s) automatically (editable later in Services):</p><div className="flex flex-wrap gap-1.5">{companyForm.modules.map(k=><span key={k} className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-[11px] text-cyan-200">{registry.find(r=>r.key===k)?.name||k}</span>)}</div></div>
        <button disabled={busy || !companyForm.name} className={button+" mt-4"} onClick={()=>act(async()=>{const result=await request("/api/v1/platform/companies",{method:"POST",body:JSON.stringify(companyForm)}); if(result.temporaryPassword) setMessage(`Company created. Temporary owner password: ${result.temporaryPassword}`); setCompanyForm({...companyForm,name:"",appName:"",adminEmail:"",websiteDomain:""});},"Company created") }><Plus className="mr-1 inline h-4 w-4"/>Create company</button>
        </>}
        <div className="mt-5 grid gap-3 md:grid-cols-2">{companies.map(c=><div key={c.id} className={`rounded-xl border p-4 ${c.id===companyId?"border-cyan-400/60 bg-cyan-400/5":"border-white/10 bg-white/[.03]"}`}><button className="w-full text-left" onClick={()=>setCompanyId(c.id)}><div className="flex justify-between"><b>{c.name}</b><span className={`text-xs uppercase ${c.subscriptionStatus==="active"?"text-emerald-300":c.subscriptionStatus==="trialing"?"text-amber-300":"text-red-300"}`}>{c.subscriptionStatus||c.status}</span></div><p className="mt-1 text-sm text-slate-400">{c.appName} · {c.industry} · {c.billingCycle || "monthly"}</p></button><a className="mt-1 block truncate text-xs text-cyan-300 underline-offset-2 hover:underline" href={tenantUrl(c)} target="_blank" rel="noopener noreferrer">{tenantUrl(c)}</a><label className="mt-1 flex items-center gap-2 text-xs text-slate-400">{t("admin.bx.country")}:<select disabled={!platformAdmin} className="rounded-md border border-white/10 bg-slate-950 px-2 py-1 text-xs text-slate-200" value={c.country||"ID"} onChange={(e)=>{const code=e.target.value;act(()=>request(`/api/v1/platform/companies/${c.id}`,{method:"PATCH",body:JSON.stringify({country:code})}),t("admin.bx.data.done"));}}>{COUNTRIES.map(x=><option key={x.code} value={x.code}>{x.name[language]} · {x.currency}</option>)}</select></label><p className="mt-1 text-xs text-slate-400">{t("admin.bx.data.label")}: <span className={c.dataMode==="shared"&&c.slug!==FLAGSHIP_SLUG?"text-red-300":"text-slate-200"}>{c.slug===FLAGSHIP_SLUG?t("admin.bx.data.platform"):t(`admin.bx.data.${c.dataMode||"shared"}`)}</span></p>{c.trialEndsAt&&<p className="mt-1 text-xs text-slate-500">Trial ends {new Date(c.trialEndsAt).toLocaleDateString()}</p>}{platformAdmin&&<div className="mt-3 flex flex-wrap gap-3">{c.slug!==FLAGSHIP_SLUG&&c.dataMode!=="schema"&&<button className="text-xs text-cyan-300" onClick={()=>{ if(!window.confirm(t("admin.bx.data.confirmSchema",{name:c.name}))) return; act(()=>request(`/api/v1/platform/companies/${c.id}`,{method:"PATCH",body:JSON.stringify({dataMode:"schema"})}),t("admin.bx.data.done")); }}>{t("admin.bx.data.makeSchema")}</button>}{c.slug!==FLAGSHIP_SLUG&&<button className="text-xs text-violet-300" onClick={()=>{ const url=window.prompt(t("admin.bx.data.askServerUrl"),c.serverUrl||"https://"); if(!url||!/^https?:\/\/.+/.test(url)) return; act(()=>request(`/api/v1/platform/companies/${c.id}`,{method:"PATCH",body:JSON.stringify({dataMode:"dedicated",serverUrl:url})}),t("admin.bx.data.done")); }}>{t("admin.bx.data.makeDedicated")}</button>}<button className="text-xs text-emerald-300" onClick={()=>act(()=>request(`/api/v1/platform/companies/${c.id}`,{method:"PATCH",body:JSON.stringify({subscriptionStatus:"active"})}),"Merchant marked paid and activated")}>Mark paid</button><button className="text-xs text-amber-300" onClick={()=>act(()=>request(`/api/v1/platform/companies/${c.id}`,{method:"PATCH",body:JSON.stringify({trialDays:7})}),"Seven-day trial started")}>Give 7-day trial</button><button className="text-xs text-red-300" onClick={()=>act(()=>request(`/api/v1/platform/companies/${c.id}`,{method:"PATCH",body:JSON.stringify({subscriptionStatus:"unpaid"})}),"Merchant marked unpaid and app locked")}>Mark unpaid</button></div>}</div>)}</div>
      </Panel>}

      {tab === "admins" && platformAdmin && selected && <CompanyAdmins company={selected} onMsg={setMessage} />}

      {tab === "applications" && <Panel title="Merchant applications" subtitle="Review what each company requested, then approve or reject its activation."><div className="space-y-3">{applications.length===0&&<p className="text-sm text-slate-500">No applications yet.</p>}{applications.map(a=><div key={a.id} className="rounded-xl border border-white/10 bg-white/[.03] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><b>{a.company_name}</b><p className="text-sm text-slate-400">{a.contact_name} · {a.contact_email} · {a.contact_phone||"No phone"}</p><p className="mt-2 text-xs text-slate-500">{a.requirements?.outletCount||1} outlet(s) · {a.requirements?.expectedStaff||1} staff · {(a.requirements?.requestedModules||[]).join(", ")}</p>{a.requirements?.notes&&<p className="mt-2 text-sm text-slate-300">{a.requirements.notes}</p>}</div><span className="rounded-full bg-white/5 px-3 py-1 text-xs uppercase text-cyan-300">{a.status}</span></div>{a.status!=="approved"&&<div className="mt-3 flex gap-3"><button className="text-xs font-bold text-emerald-300" onClick={()=>act(()=>request(`/api/v1/platform/applications/${a.id}`,{method:"PATCH",body:JSON.stringify({status:"approved"})}),"Merchant approved")}>Approve</button><button className="text-xs font-bold text-red-300" onClick={()=>act(()=>request(`/api/v1/platform/applications/${a.id}`,{method:"PATCH",body:JSON.stringify({status:"rejected"})}),"Merchant rejected")}>Reject</button></div>}</div>)}</div></Panel>}

      {tab === "brand" && <Panel title="White-label website and app" subtitle="Use one platform to publish a separate brand, custom domain and mobile app for this company.">
        <div className="grid gap-3 md:grid-cols-2"><input className={field} placeholder="App name" value={brand.appName} onChange={e=>setBrand({...brand,appName:e.target.value})}/><input className={field} placeholder="company.example.com" value={brand.websiteDomain} onChange={e=>setBrand({...brand,websiteDomain:e.target.value})}/><input className={field} placeholder="Logo URL" value={brand.logoUrl} onChange={e=>setBrand({...brand,logoUrl:e.target.value})}/><input className={field} placeholder="Square app icon URL" value={brand.appIconUrl} onChange={e=>setBrand({...brand,appIconUrl:e.target.value})}/><input className={field} placeholder="com.company.pos (Android)" value={brand.androidPackage} onChange={e=>setBrand({...brand,androidPackage:e.target.value})}/><input className={field} placeholder="com.company.pos (iOS)" value={brand.iosBundleId} onChange={e=>setBrand({...brand,iosBundleId:e.target.value})}/><label className="text-xs text-slate-400">Primary colour<input type="color" className={field+" mt-1 h-11"} value={brand.primaryColor} onChange={e=>setBrand({...brand,primaryColor:e.target.value})}/></label><label className="text-xs text-slate-400">Accent colour<input type="color" className={field+" mt-1 h-11"} value={brand.accentColor} onChange={e=>setBrand({...brand,accentColor:e.target.value})}/></label></div>
        <AppSkinPicker value={brand.skin} onChange={(skin)=>setBrand({...brand,skin})}/>
        <div className="mt-4 grid gap-3 md:grid-cols-4"><select className={field} value={brand.billingModel} onChange={e=>setBrand({...brand,billingModel:e.target.value,billingCycle:e.target.value==="one_time"?"one_time":brand.billingCycle})}><option value="subscription">Subscription</option><option value="one_time">One-time</option></select><select className={field} value={brand.billingCycle} disabled={brand.billingModel==="one_time"} onChange={e=>setBrand({...brand,billingCycle:e.target.value})}><option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="one_time">One time</option></select><input className={field} type="number" value={brand.price} onChange={e=>setBrand({...brand,price:e.target.value})}/><select className={field} value={brand.currency} onChange={e=>setBrand({...brand,currency:e.target.value})}><option>IDR</option><option>SGD</option><option>USD</option><option>MYR</option></select></div>
        <div className="mt-4 flex flex-wrap gap-3"><button disabled={busy||!companyId} className={button} onClick={()=>act(()=>request("/api/v1/company/white-label",{method:"PUT",body:JSON.stringify({...brand,theme:{primaryColor:brand.primaryColor,accentColor:brand.accentColor,skin:brand.skin}})},companyId),"Brand and commercial terms saved")}>Save white label</button><button disabled={busy||!companyId||Number(brand.price)<=0} className="rounded-xl border border-cyan-400 px-4 py-2.5 text-sm font-bold text-cyan-300 disabled:opacity-40" onClick={()=>act(async()=>{await request("/api/v1/company/white-label",{method:"PUT",body:JSON.stringify({...brand,theme:{primaryColor:brand.primaryColor,accentColor:brand.accentColor,skin:brand.skin}})},companyId);const checkout=await request("/api/v1/company/billing/checkout",{method:"POST",body:"{}"},companyId);location.href=checkout.url;},"Opening secure checkout")}>Pay / start subscription</button></div>
        <div className="mt-5 rounded-2xl p-5" style={{background:brand.primaryColor}}><div className="flex items-center gap-3">{brand.logoUrl?<img src={brand.logoUrl} className="h-12 w-12 rounded-xl object-cover"/>:<Smartphone/>}<div><b className="text-slate-950">{brand.appName || selected?.name || "Your app"}</b><p className="text-xs text-slate-900/70">{brand.websiteDomain || "your-company.com"}</p></div></div></div>
      </Panel>}

      {tab === "modules" && <Panel title="Modules & add-ons" subtitle="Core is the basic system every business gets (always on). Tick the add-ons this business needs; each ticked module becomes a button in their app. Apply an industry preset to set them fast.">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-400"><span>Quick apply an industry preset:</span>{industries.map(i=><button key={i.key} className="rounded-full bg-white/5 px-3 py-1 text-slate-200 hover:bg-cyan-400/15" onClick={()=>setModules(i.modules)}>{i.name}</button>)}</div>
        {Object.entries(moduleGroups).map(([cat,items])=><div key={cat} className="mb-5">
          <h3 className="mb-2 text-sm font-black uppercase tracking-wider text-cyan-300">{cat}</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{items.map(m=>{const core=(m as any).core;const on=core||modules.includes(m.key);const badge=m.status==="live"?"bg-emerald-400/15 text-emerald-300":m.status==="beta"?"bg-amber-400/15 text-amber-300":"bg-white/10 text-slate-400";return <label key={m.key} className={`flex items-start gap-3 rounded-xl border p-3 ${core?"cursor-default border-cyan-400/30 bg-cyan-400/[.04]":`cursor-pointer ${on?"border-cyan-400/50 bg-cyan-400/5":"border-white/10 bg-white/[.03]"}`}`}><input type="checkbox" className="mt-1" checked={on} disabled={core} onChange={core?undefined:()=>setModules(on?modules.filter(x=>x!==m.key):[...modules,m.key])}/><span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><b className="text-sm">{m.name}</b><span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${badge}`}>{m.status}</span>{core?<span className="rounded-full bg-cyan-400/20 px-2 py-0.5 text-[10px] font-bold uppercase text-cyan-200">core</span>:<span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase text-slate-400">add-on</span>}</span>{m.desc&&<span className="mt-0.5 block text-[11px] text-slate-400">{m.desc}</span>}</span></label>;})}</div>
        </div>)}
        <button className={button+" mt-2"} disabled={busy} onClick={()=>act(()=>request("/api/v1/company/modules",{method:"PUT",body:JSON.stringify({modules})},companyId),"Services updated")}>Save modules</button>
      </Panel>}

      {tab === "overview" && platformAdmin && <OverviewPanel />}

      {tab === "team" && superAdmin && <TeamPanel onMsg={setMessage} />}

      {tab === "dashboard" && companyId && <DashboardPanel companyId={companyId} />}

      {tab === "pricing" && companyId && <PricingPanel companyId={companyId} onMsg={setMessage} />}

      {tab === "audit" && companyId && <AuditPanel companyId={companyId} />}

      {tab === "booking" && companyId && <BookingPanel companyId={companyId} staff={staff} customers={customers} onMsg={setMessage} />}

      {tab === "events" && companyId && <EventsPanel companyId={companyId} onMsg={setMessage} />}

      {tab === "repair" && companyId && <RepairPanel companyId={companyId} staff={staff} onMsg={setMessage} />}

      {tab === "wholesale" && companyId && <WholesalePanel companyId={companyId} onMsg={setMessage} />}

      {tab === "projects" && companyId && <ProjectsPanel companyId={companyId} onMsg={setMessage} />}

      {tab === "marketing" && companyId && <MarketingPanel companyId={companyId} onMsg={setMessage} />}

      {tab === "foodcourt" && companyId && <FoodcourtPanel companyId={companyId} onMsg={setMessage} />}

      {tab === "gifts" && companyId && <GiftsPanel companyId={companyId} staff={staff} onMsg={setMessage} />}

      {tab === "draws" && companyId && <DrawsPanel companyId={companyId} onMsg={setMessage} />}

      {tab === "payroll" && companyId && <PayrollPanel companyId={companyId} />}

      {tab === "accounting" && companyId && <AccountingPanel companyId={companyId} onMsg={setMessage} />}

      {tab === "register" && companyId && <PosPanel companyId={companyId} customers={customers} crmOn={modules.includes("crm")} pricingOn={modules.includes("pricing")} onMsg={setMessage} />}

      {tab === "tables" && companyId && <TablesPanel companyId={companyId} onMsg={setMessage} />}

      {tab === "kds" && companyId && <KdsPanel companyId={companyId} onMsg={setMessage} />}

      {tab === "inventory" && <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Stock items" subtitle="Track quantity on hand. Items at or below their low-stock level are flagged red.">
          <div className="grid gap-2 sm:grid-cols-2"><input className={field} placeholder="Item name" value={itemForm.name} onChange={e=>setItemForm({...itemForm,name:e.target.value})}/><input className={field} placeholder="SKU / barcode" value={itemForm.sku} onChange={e=>setItemForm({...itemForm,sku:e.target.value})}/><input className={field} placeholder="Category" value={itemForm.category} onChange={e=>setItemForm({...itemForm,category:e.target.value})}/><input className={field} placeholder="Unit (e.g. bottle, kg)" value={itemForm.unit} onChange={e=>setItemForm({...itemForm,unit:e.target.value})}/><input className={field} type="number" placeholder="Cost price" value={itemForm.costPrice} onChange={e=>setItemForm({...itemForm,costPrice:e.target.value})}/><input className={field} type="number" placeholder="Sell price" value={itemForm.sellPrice} onChange={e=>setItemForm({...itemForm,sellPrice:e.target.value})}/><input className={field} type="number" placeholder="Low-stock alert at" value={itemForm.lowStockThreshold} onChange={e=>setItemForm({...itemForm,lowStockThreshold:e.target.value})}/><select className={field} value={itemForm.supplierId} onChange={e=>setItemForm({...itemForm,supplierId:e.target.value})}><option value="">No supplier</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <button className={button+" mt-3"} disabled={busy||!itemForm.name} onClick={()=>act(async()=>{await request("/api/v1/company/inventory/items",{method:"POST",body:JSON.stringify(itemForm)},companyId);setItemForm({name:"",sku:"",category:"",unit:"unit",costPrice:"0",sellPrice:"0",lowStockThreshold:"0",supplierId:""});},"Item added")}><Plus className="mr-1 inline h-4 w-4"/>Add item</button>
          <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-slate-500"><tr><th>Item</th><th>Stock</th><th>Cost/Sell</th><th></th></tr></thead><tbody>{items.length===0&&<tr><td colSpan={4} className="py-4 text-slate-500">No items yet.</td></tr>}{items.map(i=><tr key={i.id} className={`border-t border-white/10 ${i.low_stock?"bg-red-500/10":""}`}><td className="py-2">{i.name}<div className="text-xs text-slate-500">{i.sku||"—"}{i.supplier_name?` · ${i.supplier_name}`:""}</div></td><td>{Number(i.stock)} {i.unit}{i.low_stock&&<span className="ml-1 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-300">LOW</span>}</td><td className="text-xs">{Number(i.cost_price).toLocaleString()} / {Number(i.sell_price).toLocaleString()}</td><td className="whitespace-nowrap"><button className="text-xs text-emerald-300" title="Add stock" onClick={()=>{const q=prompt(`Add stock to ${i.name} (quantity)`);if(q&&Number(q))act(()=>request("/api/v1/company/inventory/adjust",{method:"POST",body:JSON.stringify({itemId:i.id,quantity:Math.abs(Number(q)),type:"in",note:"manual add"})},companyId),"Stock updated")}}>+ in</button> <button className="text-xs text-amber-300" title="Remove stock" onClick={()=>{const q=prompt(`Remove stock from ${i.name} (quantity)`);if(q&&Number(q))act(()=>request("/api/v1/company/inventory/adjust",{method:"POST",body:JSON.stringify({itemId:i.id,quantity:-Math.abs(Number(q)),type:"out",note:"manual remove"})},companyId),"Stock updated")}}>− out</button> <button className="text-xs text-red-300" onClick={()=>{if(confirm(`Delete ${i.name}?`))act(()=>request(`/api/v1/company/inventory/items/${i.id}`,{method:"DELETE"},companyId),"Item deleted")}}>del</button></td></tr>)}</tbody></table></div>
        </Panel>
        <Panel title="Suppliers" subtitle="Vendors you buy stock from. Used when raising purchase orders.">
          <div className="grid gap-2 sm:grid-cols-3"><input className={field} placeholder="Supplier name" value={supForm.name} onChange={e=>setSupForm({...supForm,name:e.target.value})}/><input className={field} placeholder="Phone" value={supForm.phone} onChange={e=>setSupForm({...supForm,phone:e.target.value})}/><input className={field} placeholder="Email" value={supForm.email} onChange={e=>setSupForm({...supForm,email:e.target.value})}/></div>
          <button className={button+" mt-3"} disabled={busy||!supForm.name} onClick={()=>act(async()=>{await request("/api/v1/company/inventory/suppliers",{method:"POST",body:JSON.stringify(supForm)},companyId);setSupForm({name:"",phone:"",email:""});},"Supplier added")}><Plus className="mr-1 inline h-4 w-4"/>Add supplier</button>
          <div className="mt-4 grid gap-2">{suppliers.length===0&&<p className="text-sm text-slate-500">No suppliers yet.</p>}{suppliers.map(s=><div key={s.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[.03] p-3"><div><b>{s.name}</b><p className="text-xs text-slate-400">{s.phone||"—"} · {s.email||"—"}</p></div><button className="text-xs text-red-300" onClick={()=>{if(confirm(`Delete ${s.name}?`))act(()=>request(`/api/v1/company/inventory/suppliers/${s.id}`,{method:"DELETE"},companyId),"Supplier deleted")}}>del</button></div>)}</div>
        </Panel>
        <div className="lg:col-span-2"><RecipePanel companyId={companyId} items={items} onMsg={setMessage} /></div>
      </div>}

      {tab === "purchasing" && <Panel title="Purchase orders" subtitle="Order stock from a supplier, then mark it received to add it to inventory and update cost prices.">
        <div className="rounded-xl border border-white/10 bg-white/[.03] p-4">
          <div className="grid gap-2 sm:grid-cols-2"><select className={field} value={poForm.supplierId} onChange={e=>setPoForm({...poForm,supplierId:e.target.value})}><option value="">Select supplier</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><input className={field} placeholder="Note (optional)" value={poForm.note} onChange={e=>setPoForm({...poForm,note:e.target.value})}/></div>
          <div className="mt-3 space-y-2">{poForm.lines.map((ln,idx)=><div key={idx} className="grid gap-2 sm:grid-cols-[2fr,1fr,1fr,auto]"><select className={field} value={ln.itemId} onChange={e=>setPoForm({...poForm,lines:poForm.lines.map((l,i)=>i===idx?{...l,itemId:e.target.value}:l)})}><option value="">Select item</option>{items.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select><input className={field} type="number" placeholder="Qty" value={ln.quantity} onChange={e=>setPoForm({...poForm,lines:poForm.lines.map((l,i)=>i===idx?{...l,quantity:e.target.value}:l)})}/><input className={field} type="number" placeholder="Unit cost" value={ln.unitCost} onChange={e=>setPoForm({...poForm,lines:poForm.lines.map((l,i)=>i===idx?{...l,unitCost:e.target.value}:l)})}/><button className="rounded-xl border border-white/10 px-3 text-red-300" onClick={()=>setPoForm({...poForm,lines:poForm.lines.filter((_,i)=>i!==idx)})}>×</button></div>)}</div>
          <button className="mt-2 text-sm font-bold text-cyan-300" onClick={()=>setPoForm({...poForm,lines:[...poForm.lines,{itemId:"",quantity:"1",unitCost:"0"}]})}>+ Add line</button>
          <button className={button+" mt-3 block"} disabled={busy||!poForm.lines.some(l=>l.itemId&&Number(l.quantity)>0)} onClick={()=>act(async()=>{await request("/api/v1/company/inventory/purchase-orders",{method:"POST",body:JSON.stringify({supplierId:poForm.supplierId||null,note:poForm.note,items:poForm.lines.filter(l=>l.itemId&&Number(l.quantity)>0).map(l=>({itemId:Number(l.itemId),quantity:Number(l.quantity),unitCost:Number(l.unitCost)}))})},companyId);setPoForm({supplierId:"",note:"",lines:[{itemId:"",quantity:"1",unitCost:"0"}]});},"Purchase order created")}>Create purchase order</button>
        </div>
        <div className="mt-5 grid gap-3">{purchaseOrders.length===0&&<p className="text-sm text-slate-500">No purchase orders yet.</p>}{purchaseOrders.map(p=><div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[.03] p-4"><div><b>PO #{p.id}</b> · {p.supplier_name||"No supplier"}<p className="text-xs text-slate-400">{p.item_count} line(s) · total {Number(p.total).toLocaleString()} · <span className={p.status==="received"?"text-emerald-300":p.status==="cancelled"?"text-red-300":"text-amber-300"}>{p.status}</span></p></div><div className="flex gap-3">{p.status!=="received"&&p.status!=="cancelled"&&<><button className="text-xs font-bold text-emerald-300" onClick={()=>act(()=>request(`/api/v1/company/inventory/purchase-orders/${p.id}/receive`,{method:"POST",body:"{}"},companyId),"Stock received")}>Receive</button><button className="text-xs text-red-300" onClick={()=>act(()=>request(`/api/v1/company/inventory/purchase-orders/${p.id}`,{method:"PATCH",body:JSON.stringify({status:"cancelled"})},companyId),"PO cancelled")}>Cancel</button></>}</div></div>)}</div>
      </Panel>}

      {tab === "crm" && <Panel title="Customers & segments" subtitle="Every profile is auto-tagged: VIP (spend ≥ 5M), New (≤30 days), Active (visited ≤30 days), Lost (no visit 90+ days), Birthday this month.">
        <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6">{[["total","All"],["vip","VIP"],["new","New"],["active","Active"],["lost","Lost"],["birthday","Birthday"]].map(([k,label])=><div key={k} className="rounded-xl border border-white/10 bg-white/[.04] p-3 text-center"><b className="text-xl">{Number(segments[k]||0)}</b><p className="text-[11px] text-slate-500">{label}</p></div>)}</div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"><input className={field} placeholder="Customer name" value={custForm.name} onChange={e=>setCustForm({...custForm,name:e.target.value})}/><input className={field} placeholder="Phone" value={custForm.phone} onChange={e=>setCustForm({...custForm,phone:e.target.value})}/><input className={field} placeholder="Email" value={custForm.email} onChange={e=>setCustForm({...custForm,email:e.target.value})}/><input className={field} type="date" value={custForm.birthday} onChange={e=>setCustForm({...custForm,birthday:e.target.value})}/><input className={field+" sm:col-span-2"} placeholder="Note / tags" value={custForm.note} onChange={e=>setCustForm({...custForm,note:e.target.value})}/></div>
        <button className={button+" mt-3"} disabled={busy||!custForm.name} onClick={()=>act(async()=>{await request("/api/v1/company/crm/customers",{method:"POST",body:JSON.stringify(custForm)},companyId);setCustForm({name:"",phone:"",email:"",birthday:"",note:""});},"Customer added")}><Plus className="mr-1 inline h-4 w-4"/>Add customer</button>
        <input className={field+" mt-4"} placeholder="Search customers by name, phone or email" value={custSearch} onChange={e=>setCustSearch(e.target.value)}/>
        <div className="mt-3 grid gap-2">{customers.length===0&&<p className="text-sm text-slate-500">No customers found.</p>}{customers.map(c=><div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[.03] p-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><b>{c.name}</b>{c.is_vip&&<Badge t="VIP" c="bg-amber-400/20 text-amber-300"/>}{c.is_new&&<Badge t="New" c="bg-cyan-400/20 text-cyan-300"/>}{c.is_lost&&<Badge t="Lost" c="bg-red-400/20 text-red-300"/>}{c.is_birthday&&<Badge t="🎂" c="bg-pink-400/20 text-pink-300"/>}</div><p className="text-xs text-slate-400">{c.phone||"—"} · {c.email||"—"} · spend {Number(c.total_spend).toLocaleString()} · {c.visit_count} visit(s)</p></div><div className="flex gap-3"><button className="text-xs text-cyan-300" onClick={()=>{const a=prompt(`Record a visit for ${c.name} — amount spent`);if(a!==null)act(()=>request(`/api/v1/company/crm/customers/${c.id}/visit`,{method:"POST",body:JSON.stringify({amount:Number(a)||0})},companyId),"Visit recorded")}}>+ visit</button><button className="text-xs text-red-300" onClick={()=>{if(confirm(`Delete ${c.name}?`))act(()=>request(`/api/v1/company/crm/customers/${c.id}`,{method:"DELETE"},companyId),"Customer deleted")}}>del</button></div></div>)}</div>
      </Panel>}

      {tab === "operations" && <OperationsPanel settings={settings} setSettings={setSettings} onSave={()=>act(()=>request("/api/v1/company/settings",{method:"PUT",body:JSON.stringify({config:settings})},companyId),"Loyalty, booking and automation settings saved")} />}

      {tab === "branches" && <div className="space-y-5">
        <Panel title="Branches and outlets" subtitle="Each location is a branch. Every sale, booking and employee can be assigned to a branch; switch outlet from the top-right dropdown."><div className="flex gap-3"><input className={field} placeholder="Branch name" value={branchForm.name} onChange={e=>setBranchForm({...branchForm,name:e.target.value})}/><input className={field} placeholder="Address" value={branchForm.address} onChange={e=>setBranchForm({...branchForm,address:e.target.value})}/><button className={button} onClick={()=>act(()=>request("/api/v1/company/branches",{method:"POST",body:JSON.stringify(branchForm)},companyId),"Branch added")}>Add</button></div><div className="mt-4 grid gap-3 md:grid-cols-3">{branches.map(b=><Mini key={b.id} title={b.name} detail={`${b.code} · ${b.address||"No address"}`}/>)}</div></Panel>
        {branches.map(b=><BranchBusinessCard key={b.id} companyId={companyId!} branch={b} companyModules={modules} registry={registry} onMsg={setMessage} />)}
      </div>}

      {tab === "staff" && <Panel title="Staff, roles, positions and pay" subtitle="Promote an existing app user or create a new staff account. Company admins only manage their own company; super admins can switch merchants above.">
        <div className="mb-4 flex gap-3"><input className={field} placeholder="New position, e.g. Barista" value={positionName} onChange={e=>setPositionName(e.target.value)}/><button className={button} onClick={()=>act(()=>request("/api/v1/company/positions",{method:"POST",body:JSON.stringify({name:positionName})},companyId),"Position added")}>Add position</button></div>
        <div className="mb-4 rounded-xl border border-white/10 bg-white/[.03] p-4"><label className="text-xs text-slate-400">Find an existing app user<input className={field+" mt-1"} placeholder="Search name or email" value={userSearch} onChange={e=>setUserSearch(e.target.value)}/></label><select className={field+" mt-2"} value={staffForm.userId} onChange={e=>{const u=tenantUsers.find(x=>x.id===e.target.value);setStaffForm({...staffForm,userId:e.target.value,email:u?.email||"",name:[u?.first_name,u?.last_name].filter(Boolean).join(" ")})}}><option value="">Or create a new user below</option>{tenantUsers.map(u=><option key={u.id} value={u.id}>{[u.first_name,u.last_name].filter(Boolean).join(" ")||u.email} · {u.email}{u.company_role?` · ${u.company_role}`:""}</option>)}</select></div>
        <div className="grid gap-3 md:grid-cols-4"><input className={field} placeholder="Staff name" value={staffForm.name} onChange={e=>setStaffForm({...staffForm,name:e.target.value})}/><input className={field} placeholder="Email" value={staffForm.email} onChange={e=>setStaffForm({...staffForm,email:e.target.value})}/><select className={field} value={staffForm.role} onChange={e=>setStaffForm({...staffForm,role:e.target.value})}><option>staff</option><option>manager</option><option>admin</option></select><select className={field} value={staffForm.positionId} onChange={e=>setStaffForm({...staffForm,positionId:e.target.value})}><option value="">Position</option>{positions.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><select className={field} value={staffForm.branchId} onChange={e=>setStaffForm({...staffForm,branchId:e.target.value})}><option value="">All branches</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select><select className={field} value={staffForm.employmentType} onChange={e=>setStaffForm({...staffForm,employmentType:e.target.value})}><option value="full_time">Full time</option><option value="part_time">Part time</option><option value="contract">Contract</option></select><select className={field} value={staffForm.payType} onChange={e=>setStaffForm({...staffForm,payType:e.target.value})}><option value="salary">Salary</option><option value="hourly">Hourly</option></select><input className={field} type="date" value={staffForm.hireDate} onChange={e=>setStaffForm({...staffForm,hireDate:e.target.value})}/><input className={field} type="number" placeholder="Basic salary" value={staffForm.baseSalary} onChange={e=>setStaffForm({...staffForm,baseSalary:e.target.value})}/><input className={field} type="number" placeholder="Hourly rate" value={staffForm.hourlyRate} onChange={e=>setStaffForm({...staffForm,hourlyRate:e.target.value})}/></div><button className={button+" mt-4"} onClick={()=>act(()=>request("/api/v1/company/staff",{method:"POST",body:JSON.stringify(staffForm)},companyId),"Staff account and position saved")}>Save staff</button>
        <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-slate-500"><tr><th>Name</th><th>Role / position</th><th>Branch</th><th>Type</th><th>Pay</th></tr></thead><tbody>{staff.map(s=><tr key={s.user_id} className="border-t border-white/10"><td className="py-3">{[s.first_name,s.last_name].filter(Boolean).join(" ")||s.email}<div className="text-xs text-slate-500">{s.email}</div></td><td>{s.role} · {s.position_name||"No position"}</td><td>{s.branch_name||"All"}</td><td>{s.employment_type}</td><td>{s.pay_type==="hourly"?s.hourly_rate+"/hr":s.base_salary}</td></tr>)}</tbody></table></div>
        <h3 className="mb-3 mt-7 text-lg font-black">Staff leaderboard</h3><Leaderboard rows={leaders}/>
      </Panel>}

      {tab === "hr" && <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Attendance" subtitle="Staff check in and out from the app; management sees the company log."><div className="mb-4 flex gap-3"><button className={button} onClick={()=>act(()=>request("/api/v1/company/attendance/check-in",{method:"POST",body:"{}"},companyId),"Checked in")}>Check in</button><button className="rounded-xl border border-cyan-400 px-4 py-2 text-sm text-cyan-300" onClick={()=>act(()=>request("/api/v1/company/attendance/check-out",{method:"POST",body:"{}"},companyId),"Checked out")}>Check out</button></div><div className="max-h-72 space-y-2 overflow-auto">{attendance.map(a=><Mini key={a.id} title={`${a.workDate} · ${a.status}`} detail={`${a.checkInAt?new Date(a.checkInAt).toLocaleTimeString():"–"} → ${a.checkOutAt?new Date(a.checkOutAt).toLocaleTimeString():"Open"}`}/>)}</div></Panel>
        <Panel title="Leave and medical leave" subtitle="Requests and decisions notify the correct people in their mobile app."><div className="grid gap-2 sm:grid-cols-2"><select className={field} value={leaveForm.type} onChange={e=>setLeaveForm({...leaveForm,type:e.target.value})}><option value="leave">Leave</option><option value="mc">Medical leave</option></select><input className={field} type="date" value={leaveForm.startDate} onChange={e=>setLeaveForm({...leaveForm,startDate:e.target.value})}/><input className={field} type="date" value={leaveForm.endDate} onChange={e=>setLeaveForm({...leaveForm,endDate:e.target.value})}/><input className={field} placeholder="Reason" value={leaveForm.reason} onChange={e=>setLeaveForm({...leaveForm,reason:e.target.value})}/></div><button className={button+" my-3"} onClick={()=>act(()=>request("/api/v1/company/leave",{method:"POST",body:JSON.stringify(leaveForm)},companyId),"Leave request submitted")}>Request leave</button><div className="max-h-72 space-y-2 overflow-auto">{leave.map(l=><div key={l.id} className="rounded-xl border border-white/10 p-3"><b>{l.type} · {l.startDate} to {l.endDate}</b><p className="text-xs text-slate-400">{l.reason} · {l.status}</p>{l.status==="pending"&&<div className="mt-2 flex gap-3"><button className="text-xs text-emerald-300" onClick={()=>act(()=>request(`/api/v1/company/leave/${l.id}`,{method:"PATCH",body:JSON.stringify({status:"approved",paid:true})},companyId),"Leave approved")}>Approve paid</button><button className="text-xs text-red-300" onClick={()=>act(()=>request(`/api/v1/company/leave/${l.id}`,{method:"PATCH",body:JSON.stringify({status:"rejected"})},companyId),"Leave rejected")}>Reject</button></div>}</div>)}</div></Panel>
        <Panel title="Multi-date shift calendar" subtitle="Pick several dates, then publish the same shift in one action. Changes appear live for super admin, company admin and staff."><div className="grid gap-2 sm:grid-cols-2"><select className={field} value={shiftForm.userId} onChange={e=>setShiftForm({...shiftForm,userId:e.target.value})}><option value="">Select staff</option>{staff.map(s=><option key={s.user_id} value={s.user_id}>{s.first_name||s.email}</option>)}</select><div className="flex gap-2"><input className={field} type="date" value={shiftForm.shiftDate} onChange={e=>setShiftForm({...shiftForm,shiftDate:e.target.value})}/><button className="rounded-xl border border-cyan-400 px-3 text-cyan-300" onClick={()=>shiftForm.shiftDate&&!shiftDates.includes(shiftForm.shiftDate)&&setShiftDates([...shiftDates,shiftForm.shiftDate].sort())}>Add date</button></div><input className={field} type="time" value={shiftForm.startTime} onChange={e=>setShiftForm({...shiftForm,startTime:e.target.value})}/><input className={field} type="time" value={shiftForm.endTime} onChange={e=>setShiftForm({...shiftForm,endTime:e.target.value})}/></div><div className="mt-3 flex flex-wrap gap-2">{shiftDates.map(d=><button key={d} onClick={()=>setShiftDates(shiftDates.filter(x=>x!==d))} className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">{d} ×</button>)}</div><button className={button+" my-3"} disabled={!shiftForm.userId||!shiftDates.length} onClick={()=>act(async()=>{await request("/api/v1/company/shifts",{method:"POST",body:JSON.stringify({...shiftForm,dates:shiftDates})},companyId);setShiftDates([])},`${shiftDates.length} shift(s) assigned`)}>Assign selected dates</button><div className="max-h-64 space-y-2 overflow-auto">{shifts.map(s=><Mini key={s.id} title={`${s.shiftDate} · ${s.startTime}–${s.endTime}`} detail={staff.find(x=>x.user_id===s.userId)?.email||s.userId}/>)}</div></Panel>
      </div>}

      {tab === "performance" && <Panel title="Weekly staff leaderboard" subtitle="Sales and customer reviews produce the ranking. Repeated bad feedback is highlighted red."><div className="grid gap-3">{leaders.map(l=><div key={l.user_id} className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${l.redFlag?"border-red-500/60 bg-red-500/10":"border-white/10 bg-white/[.03]"}`}><div className="flex items-center gap-3"><span className="text-xl font-black">#{l.rank}</span><div><b>{l.name}</b><p className="text-xs text-slate-400">{l.position||"Staff"}</p></div></div><div className="flex gap-5 text-right"><div><b>{Number(l.weekly_sales).toLocaleString()}</b><p className="text-xs text-slate-500">weekly sales</p></div><div><b><Star className="inline h-4 w-4 fill-amber-400 text-amber-400"/> {Number(l.rating).toFixed(1)}</b><p className="text-xs text-slate-500">{l.review_count} reviews</p></div></div></div>)}</div></Panel>}

      {tab === "feedback" && <Panel title="Customer feedback" subtitle="Service, staff and improvement feedback submitted from Support or the post-payment WhatsApp link appears here live."><div className="grid gap-3">{feedback.length===0&&<p className="text-sm text-slate-500">No feedback yet.</p>}{feedback.map(f=><div key={f.id} className={`rounded-xl border p-4 ${f.rating&&Number(f.rating)<=2?"border-red-500/50 bg-red-500/10":"border-white/10 bg-white/[.03]"}`}><div className="flex items-center justify-between"><b className="capitalize">{f.category} feedback</b><span className="text-xs text-slate-500">{new Date(f.created_at).toLocaleString()}</span></div><p className="mt-1 text-sm text-slate-300">{f.message}</p><p className="mt-2 text-xs text-slate-500">{f.user_name||"Customer"}{f.staff_name?` → ${f.staff_name}`:""}{f.rating?` · ${f.rating}/5 stars`:""}</p></div>)}</div></Panel>}

      {tab === "meetings" && <Panel title="Staff meetings" subtitle="Creating a meeting sends a push notification to every active employee app."><div className="grid gap-3 md:grid-cols-2"><input className={field} placeholder="Meeting title" value={meetingForm.title} onChange={e=>setMeetingForm({...meetingForm,title:e.target.value})}/><input className={field} type="datetime-local" value={meetingForm.startsAt} onChange={e=>setMeetingForm({...meetingForm,startsAt:e.target.value})}/><input className={field} placeholder="Location" value={meetingForm.location} onChange={e=>setMeetingForm({...meetingForm,location:e.target.value})}/><input className={field} placeholder="Agenda" value={meetingForm.agenda} onChange={e=>setMeetingForm({...meetingForm,agenda:e.target.value})}/></div><button className={button+" mt-4"} onClick={()=>act(()=>request("/api/v1/company/meetings",{method:"POST",body:JSON.stringify(meetingForm)},companyId),"Meeting scheduled and staff notified")}>Schedule meeting</button><div className="mt-5 grid gap-3 md:grid-cols-2">{meetings.map(m=><Mini key={m.id} title={m.title} detail={`${new Date(m.startsAt).toLocaleString()} · ${m.location||"TBA"}`}/>)}</div></Panel>}
    </main>
  </div>;
}

export function Panel({title,subtitle,children}:{title:string;subtitle:string;children:any}) { return <section className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5"><h2 className="text-xl font-black">{title}</h2><p className="mb-5 mt-1 text-sm text-slate-400">{subtitle}</p>{children}</section> }
function Stat({icon,label,value}:{icon:any;label:string;value:any}) { return <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><div className="mb-3 text-cyan-300">{icon}</div><b className="text-2xl">{value}</b><p className="text-xs text-slate-500">{label}</p></div> }
export function Mini({title,detail}:{title:string;detail:string}) { return <div className="rounded-xl border border-white/10 bg-white/[.03] p-4"><b>{title}</b><p className="mt-1 text-xs text-slate-400">{detail}</p></div> }
export function Badge({t,c}:{t:string;c:string}) { return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c}`}>{t}</span> }

type Cart = Record<number,{product:Row;qty:number}>;
export function PosPanel({companyId,customers,crmOn,pricingOn,onMsg}:{companyId:number;customers:Row[];crmOn:boolean;pricingOn:boolean;onMsg:(m:string)=>void}) {
  const [products,setProducts] = useState<Row[]>([]);
  const [tickets,setTickets] = useState<Row[]>([]);
  const [cart,setCart] = useState<Cart>({});
  const [charges,setCharges] = useState({discount:"0",tax:"0",serviceCharge:"0",tip:"0"});
  const [pays,setPays] = useState<{method:string;amount:string}[]>([{method:"cash",amount:""}]);
  const [customerId,setCustomerId] = useState("");
  const [prodForm,setProdForm] = useState({name:"",price:"",category:"General",stock:"0"});
  const [busy,setBusy] = useState(false);
  const [detail,setDetail] = useState<Row|null>(null);
  const load = () => { request("/api/v1/company/pos/products",{},companyId).then(setProducts).catch(()=>{}); request("/api/v1/company/pos/tickets",{},companyId).then(setTickets).catch(()=>{}); };
  useEffect(() => { load(); },[companyId]);

  const addToCart = (p:Row) => setCart(c=>({...c,[p.id]:{product:p,qty:(c[p.id]?.qty||0)+1}}));
  const setQty = (id:number,qty:number) => setCart(c=>{const n={...c}; if(qty<=0)delete n[id]; else n[id]={...n[id],qty}; return n;});
  const lines = Object.values(cart);
  const subtotal = lines.reduce((s,l)=>s+Number(l.product.price)*l.qty,0);
  const num = (v:string)=>Math.max(0,Number(v)||0);
  const total = Math.max(0, subtotal - num(charges.discount) + num(charges.tax) + num(charges.serviceCharge));
  const due = total + num(charges.tip);
  const paid = pays.reduce((s,p)=>s+num(p.amount),0);
  const change = Math.max(0, paid - due);

  async function checkout() {
    if(!lines.length){onMsg("Add at least one item");return;}
    setBusy(true); onMsg("");
    try {
      const payments = pays.map(p=>({method:p.method,amount:num(p.amount)})).filter(p=>p.amount>0);
      const body = { items: lines.map(l=>({productId:l.product.id,qty:l.qty})), discount:num(charges.discount), tax:num(charges.tax), serviceCharge:num(charges.serviceCharge), tip:num(charges.tip), payments, customerId: customerId?Number(customerId):null };
      const t = await request("/api/v1/company/pos/tickets",{method:"POST",body:JSON.stringify(body)},companyId);
      onMsg(`Sale ${t.orderNo} · ${t.status}${Number(t.changeGiven)>0?` · change ${Number(t.changeGiven).toLocaleString()}`:""}`);
      setCart({}); setCharges({discount:"0",tax:"0",serviceCharge:"0",tip:"0"}); setPays([{method:"cash",amount:""}]); setCustomerId(""); load();
    } catch(e:any){ onMsg(e.message); } finally { setBusy(false); }
  }
  async function act(run:()=>Promise<any>,msg:string){ setBusy(true); onMsg(""); try{await run(); onMsg(msg); load(); if(detail)setDetail(null);}catch(e:any){onMsg(e.message);}finally{setBusy(false);} }
  async function applyPricing() { try { const r=await request(`/api/v1/company/pricing/active${customerId?"?member=1":""}`,{},companyId); if(!r.percentOff){onMsg("No pricing rule active right now");return;} setCharges(c=>({...c,discount:String(Math.round(subtotal*r.percentOff/100))})); onMsg(`Applied ${r.percentOff}% (${r.rules.map((x:Row)=>x.name).join(", ")})`); } catch(e:any){onMsg(e.message);} }

  return <div className="grid gap-5 lg:grid-cols-[1.3fr,1fr]">
    <Panel title="Register" subtitle="Tap products to build the sale. Supports discount, tax, service charge, tip, split & partial payment, and change.">
      <div className="mb-3 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/[.03] p-3">
        <input className={field+" flex-1 min-w-[120px]"} placeholder="Quick add product" value={prodForm.name} onChange={e=>setProdForm({...prodForm,name:e.target.value})}/>
        <input className={field+" w-24"} type="number" placeholder="Price" value={prodForm.price} onChange={e=>setProdForm({...prodForm,price:e.target.value})}/>
        <input className={field+" w-20"} type="number" placeholder="Stock" value={prodForm.stock} onChange={e=>setProdForm({...prodForm,stock:e.target.value})}/>
        <button className={button} disabled={busy||!prodForm.name||!prodForm.price} onClick={()=>act(async()=>{await request("/api/v1/company/pos/products",{method:"POST",body:JSON.stringify(prodForm)},companyId);setProdForm({name:"",price:"",category:"General",stock:"0"});},"Product added")}>Add</button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{products.length===0&&<p className="col-span-full text-sm text-slate-500">No products yet — add one above.</p>}{products.filter(p=>p.active!==false).map(p=><button key={p.id} onClick={()=>addToCart(p)} className="rounded-xl border border-white/10 bg-white/[.03] p-3 text-left hover:border-cyan-400/50"><b className="block truncate text-sm">{p.name}</b><span className="text-xs text-cyan-300">{Number(p.price).toLocaleString()}</span><span className="ml-2 text-[11px] text-slate-500">stk {p.stock}</span></button>)}</div>
    </Panel>

    <Panel title="Current sale" subtitle="">
      <div className="max-h-56 space-y-2 overflow-auto">{lines.length===0&&<p className="text-sm text-slate-500">Cart is empty.</p>}{lines.map(l=><div key={l.product.id} className="flex items-center gap-2 text-sm"><span className="min-w-0 flex-1 truncate">{l.product.name}</span><button className="h-6 w-6 rounded bg-white/10" onClick={()=>setQty(l.product.id,l.qty-1)}>−</button><span className="w-6 text-center">{l.qty}</span><button className="h-6 w-6 rounded bg-white/10" onClick={()=>setQty(l.product.id,l.qty+1)}>+</button><span className="w-20 text-right">{(Number(l.product.price)*l.qty).toLocaleString()}</span></div>)}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">{([["discount","Discount"],["tax","Tax"],["serviceCharge","Service"],["tip","Tip"]] as const).map(([k,label])=><label key={k} className="text-xs text-slate-400">{label}<input className={field+" mt-1"} type="number" value={(charges as any)[k]} onChange={e=>setCharges({...charges,[k]:e.target.value})}/></label>)}</div>
      {pricingOn&&<button className="mt-2 text-xs font-bold text-cyan-300" onClick={applyPricing}>✨ Apply happy hour / auto price</button>}
      {crmOn&&<select className={field+" mt-3"} value={customerId} onChange={e=>setCustomerId(e.target.value)}><option value="">Walk-in (no customer)</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}{c.phone?` · ${c.phone}`:""}</option>)}</select>}
      <div className="mt-3 space-y-2">{pays.map((p,i)=><div key={i} className="flex gap-2"><select className={field} value={p.method} onChange={e=>setPays(pays.map((x,n)=>n===i?{...x,method:e.target.value}:x))}>{["cash","card","qr","transfer","ewallet"].map(m=><option key={m} value={m}>{m}</option>)}</select><input className={field} type="number" placeholder="Amount" value={p.amount} onChange={e=>setPays(pays.map((x,n)=>n===i?{...x,amount:e.target.value}:x))}/>{pays.length>1&&<button className="rounded-xl border border-white/10 px-3 text-red-300" onClick={()=>setPays(pays.filter((_,n)=>n!==i))}>×</button>}</div>)}</div>
      <div className="mt-1 flex justify-between text-xs"><button className="text-cyan-300" onClick={()=>setPays([...pays,{method:"card",amount:""}])}>+ Split payment</button><button className="text-slate-300" onClick={()=>setPays(pays.map((p,i)=>i===0?{...p,amount:String(due)}:p))}>Exact cash</button></div>
      <div className="mt-3 rounded-xl bg-white/5 p-3 text-sm"><Row2 l="Subtotal" v={subtotal}/><Row2 l="Total due" v={due} bold/>{paid>0&&<Row2 l="Paid" v={paid}/>}{change>0&&<Row2 l="Change" v={change}/>}</div>
      <button className={button+" mt-3 w-full justify-center"} disabled={busy||!lines.length} onClick={checkout}>Charge {due.toLocaleString()}</button>
    </Panel>

    <div className="lg:col-span-2"><Panel title="Recent sales" subtitle="Tap a sale to see items, payments, and to refund or void it.">
      <div className="grid gap-2">{tickets.length===0&&<p className="text-sm text-slate-500">No sales yet.</p>}{tickets.slice(0,40).map(t=><button key={t.id} onClick={()=>request(`/api/v1/company/pos/tickets/${t.id}`,{},companyId).then(setDetail).catch(()=>{})} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[.03] p-3 text-left"><div><b>{t.orderNo}</b><p className="text-xs text-slate-400">{new Date(t.createdAt).toLocaleString()} · {t.paymentMethod||"unpaid"}</p></div><div className="text-right"><b>{Number(t.total).toLocaleString()}</b><p className={`text-xs ${t.status==="paid"?"text-emerald-300":t.status==="refunded"||t.status==="voided"?"text-red-300":"text-amber-300"}`}>{t.status}</p></div></button>)}</div>
    </Panel></div>

    {detail&&<div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={()=>setDetail(null)}><div className="absolute inset-0 bg-black/70"/><div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-5" onClick={e=>e.stopPropagation()}>
      <div className="flex items-center justify-between"><b className="text-lg">{detail.orderNo}</b><span className={`text-xs ${detail.status==="paid"?"text-emerald-300":detail.status==="refunded"||detail.status==="voided"?"text-red-300":"text-amber-300"}`}>{detail.status}</span></div>
      <div className="mt-3 space-y-1 text-sm">{(detail.items||[]).map((it:Row)=><div key={it.id} className="flex justify-between"><span>{it.qty}× {it.name}</span><span>{Number(it.lineTotal).toLocaleString()}</span></div>)}</div>
      <div className="mt-3 border-t border-white/10 pt-2 text-sm"><Row2 l="Subtotal" v={Number(detail.subtotal)}/>{Number(detail.discount)>0&&<Row2 l="Discount" v={-Number(detail.discount)}/>}{Number(detail.tax)>0&&<Row2 l="Tax" v={Number(detail.tax)}/>}{Number(detail.serviceFee)>0&&<Row2 l="Service" v={Number(detail.serviceFee)}/>}{Number(detail.tip)>0&&<Row2 l="Tip" v={Number(detail.tip)}/>}<Row2 l="Total" v={Number(detail.total)} bold/><Row2 l="Paid" v={Number(detail.paidTotal)}/></div>
      {(detail.payments||[]).length>0&&<div className="mt-2 text-xs text-slate-400">{(detail.payments||[]).map((p:Row)=><div key={p.id}>{p.is_refund||p.isRefund?"↩ refund":"•"} {p.method}: {Number(p.amount).toLocaleString()}</div>)}</div>}
      {detail.status!=="voided"&&detail.status!=="refunded"&&<div className="mt-4 flex gap-2">
        <button className="flex-1 rounded-xl bg-amber-400/90 py-2.5 text-sm font-bold text-slate-950" disabled={busy} onClick={()=>{const r=prompt("Refund reason (leave blank for full refund)");act(()=>request(`/api/v1/company/pos/tickets/${detail.id}/refund`,{method:"POST",body:JSON.stringify({reason:r||""})},companyId),"Refunded")}}>Refund</button>
        <button className="flex-1 rounded-xl bg-red-500/90 py-2.5 text-sm font-bold text-white" disabled={busy} onClick={()=>{const r=prompt("Void reason");if(r!==null)act(()=>request(`/api/v1/company/pos/tickets/${detail.id}/void`,{method:"POST",body:JSON.stringify({reason:r})},companyId),"Voided")}}>Void</button>
      </div>}
      <button className="mt-3 w-full text-sm text-slate-400" onClick={()=>setDetail(null)}>Close</button>
    </div></div>}
  </div>;
}
export function Row2({l,v,bold}:{l:string;v:number;bold?:boolean}) { return <div className={`flex justify-between ${bold?"font-bold":""}`}><span className="text-slate-400">{l}</span><span>{v.toLocaleString()}</span></div> }

function TeamPanel({onMsg}:{onMsg:(m:string)=>void}) {
  const [admins,setAdmins] = useState<Row[]>([]);
  const [form,setForm] = useState({name:"",email:"",role:"sales",password:""});
  const load = () => request("/api/v1/platform/admins").then(setAdmins).catch(()=>{});
  useEffect(() => { load(); },[]);
  return <Panel title="BridgeX platform team" subtitle="Create logins for your sales, accountants and partners. They can see the dashboard, create companies, add branches and business types, and view the company list.">
    <div className="grid gap-2 sm:grid-cols-4"><input className={field} placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input className={field} placeholder="Email (their login)" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/><select className={field} value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{["sales","accountant","partner","admin"].map(r=><option key={r} value={r}>{r}</option>)}</select><input className={field} placeholder="Temp password (optional)" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></div>
    <button className={button+" mt-3"} disabled={!form.email} onClick={async()=>{try{const r=await request("/api/v1/platform/admins",{method:"POST",body:JSON.stringify(form)});onMsg(r.temporaryPassword?`Team member added. Temp password: ${r.temporaryPassword}`:"Team member added");setForm({name:"",email:"",role:"sales",password:""});load();}catch(e:any){onMsg(e.message);}}}><Plus className="mr-1 inline h-4 w-4"/>Add team member</button>
    <div className="mt-4 grid gap-2">{admins.length===0&&<p className="text-sm text-slate-500">No team members yet — just you (super admin).</p>}{admins.map(a=><div key={a.user_id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[.03] p-3"><div><b>{a.name}</b> <span className="text-xs uppercase text-cyan-300">{a.role}</span><p className="text-xs text-slate-400">{a.email}</p></div><button className="text-xs text-red-300" onClick={()=>{if(confirm(`Remove ${a.email} from the platform team?`))request(`/api/v1/platform/admins/${a.user_id}`,{method:"DELETE"}).then(load)}}>remove</button></div>)}</div>
  </Panel>;
}

function OverviewPanel() {
  const [d,setD] = useState<Row|null>(null);
  useEffect(()=>{ const load=()=>request("/api/v1/platform/overview").then(setD).catch(()=>{}); load(); const t=setInterval(load,20000); return ()=>clearInterval(t); },[]);
  if(!d) return <Panel title="All companies" subtitle="Loading…"><p className="text-sm text-slate-500">Aggregating every company…</p></Panel>;
  const money=(n:any)=>Number(n||0).toLocaleString();
  const t=d.totals;
  return <div className="space-y-5">
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><p className="text-xs text-slate-500">Companies</p><b className="text-2xl">{t.companies}</b></div>
      <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><p className="text-xs text-slate-500">Total revenue (month)</p><b className="text-2xl text-emerald-300">{money(t.revMonth)}</b>{t.deltaPct!=null&&<p className={`mt-1 text-xs ${t.deltaPct>=0?"text-emerald-300":"text-red-300"}`}>{t.deltaPct>=0?"▲":"▼"} {Math.abs(t.deltaPct)}% vs last month</p>}</div>
      <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><p className="text-xs text-slate-500">Last month</p><b className="text-2xl">{money(t.revPrev)}</b></div>
      <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><p className="text-xs text-slate-500">Orders (month)</p><b className="text-2xl">{money(t.orders)}</b></div>
    </section>
    <Panel title="Revenue by company" subtitle="This month vs last month across the whole platform. Highest earners first.">
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-slate-500"><tr><th>Company</th><th>Status</th><th className="text-right">This month</th><th className="text-right">Last month</th><th className="text-right">Change</th><th className="text-right">Orders</th></tr></thead><tbody>{d.companies.map((c:Row)=><tr key={c.id} className="border-t border-white/10"><td className="py-2">{c.name}<div className="text-xs text-slate-500">{c.industry}</div></td><td><span className={`text-xs ${c.subscriptionStatus==="active"?"text-emerald-300":c.subscriptionStatus==="trialing"?"text-amber-300":"text-red-300"}`}>{c.subscriptionStatus}</span></td><td className="text-right font-bold">{money(c.revMonth)}</td><td className="text-right text-slate-400">{money(c.revPrev)}</td><td className={`text-right ${c.deltaPct==null?"text-slate-500":c.deltaPct>=0?"text-emerald-300":"text-red-300"}`}>{c.deltaPct==null?"—":`${c.deltaPct>=0?"▲":"▼"} ${Math.abs(c.deltaPct)}%`}</td><td className="text-right text-slate-400">{c.ordersMonth}</td></tr>)}</tbody></table></div>
    </Panel>
  </div>;
}

export function DashboardPanel({companyId}:{companyId:number}) {
  const [d,setD] = useState<Row|null>(null);
  useEffect(()=>{ const load=()=>request("/api/v1/company/analytics/summary",{},companyId).then(setD).catch(()=>{}); load(); const t=setInterval(load,15000); return ()=>clearInterval(t); },[companyId]);
  if(!d) return <Panel title="Owner dashboard" subtitle="Loading…"><p className="text-sm text-slate-500">Crunching numbers…</p></Panel>;
  const money=(n:number)=>Number(n).toLocaleString();
  const tiles = [["Revenue today",money(d.revToday),d.dayDeltaPct!=null?`${d.dayDeltaPct>=0?"▲":"▼"} ${Math.abs(d.dayDeltaPct)}% vs yesterday`:""],["Orders today",d.ordersToday,""],["Revenue this week",money(d.revWeek),`${d.ordersWeek} orders`],["Revenue this month",money(d.revMonth),`avg bill ${money(Math.round(d.avgBillMonth))}`]];
  return <div className="space-y-5">
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">{tiles.map(([l,v,s],i)=><div key={i} className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><p className="text-xs text-slate-500">{l}</p><b className="text-2xl">{v}</b>{s&&<p className={`mt-1 text-xs ${String(s).startsWith("▼")?"text-red-300":"text-emerald-300"}`}>{s}</p>}</div>)}</section>
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Top products this month" subtitle="By quantity sold."><div className="space-y-2">{d.topProducts.length===0&&<p className="text-sm text-slate-500">No sales yet.</p>}{d.topProducts.map((p:Row,i:number)=><div key={i} className="flex items-center justify-between text-sm"><span className="min-w-0 flex-1 truncate">{i+1}. {p.name}</span><span className="text-slate-400">{p.qty} sold · {money(p.revenue)}</span></div>)}</div></Panel>
      <Panel title="This month at a glance" subtitle="Payments, refunds and customers.">
        <div className="mb-3 space-y-1">{d.paymentSplit.map((p:Row,i:number)=><Row2 key={i} l={p.method} v={p.amount}/>)}</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Mini title={money(d.discountMonth)} detail="Discounts given"/><Mini title={money(d.refundsMonth)} detail="Refunded"/>
          <Mini title={String(d.voidsMonth)} detail="Voids"/><Mini title={String(d.lowStock)} detail="Low-stock items"/>
          <Mini title={String(d.customersTotal)} detail="Customers"/><Mini title={`+${d.customersNew}`} detail="New this month"/>
        </div>
      </Panel>
    </div>
  </div>;
}

export function PricingPanel({companyId,onMsg}:{companyId:number;onMsg:(m:string)=>void}) {
  const [rules,setRules] = useState<Row[]>([]);
  const [form,setForm] = useState({name:"",type:"happy_hour",scopeCategory:"",percentOff:"10",startTime:"17:00",endTime:"19:00",days:[] as number[]});
  const load = () => request("/api/v1/company/pricing/rules",{},companyId).then(setRules).catch(()=>{});
  useEffect(() => { load(); },[companyId]);
  const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const toggleDay=(i:number)=>setForm(f=>({...f,days:f.days.includes(i)?f.days.filter(x=>x!==i):[...f.days,i]}));
  return <Panel title="Pricing rules" subtitle="Happy hour, member and category discounts. Rules apply automatically in the register during their day/time window (server clock).">
    <div className="rounded-xl border border-white/10 bg-white/[.03] p-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"><input className={field} placeholder="Rule name (e.g. Happy Hour)" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><select className={field} value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="happy_hour">Happy hour (time)</option><option value="member">Member only</option><option value="category">Category</option></select><input className={field} placeholder="Category (blank = all)" value={form.scopeCategory} onChange={e=>setForm({...form,scopeCategory:e.target.value})}/><label className="text-xs text-slate-400">% off<input className={field+" mt-1"} type="number" value={form.percentOff} onChange={e=>setForm({...form,percentOff:e.target.value})}/></label><label className="text-xs text-slate-400">From<input className={field+" mt-1"} type="time" value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})}/></label><label className="text-xs text-slate-400">To<input className={field+" mt-1"} type="time" value={form.endTime} onChange={e=>setForm({...form,endTime:e.target.value})}/></label></div>
      <div className="mt-2 flex flex-wrap gap-1.5">{DAYS.map((d,i)=><button key={i} onClick={()=>toggleDay(i)} className={`rounded-full px-2.5 py-1 text-xs ${form.days.includes(i)?"bg-cyan-400 font-bold text-slate-950":"bg-white/5 text-slate-300"}`}>{d}</button>)}<span className="self-center text-[11px] text-slate-500">{form.days.length?"":"blank = every day"}</span></div>
      <button className={button+" mt-3"} disabled={!form.name} onClick={async()=>{try{await request("/api/v1/company/pricing/rules",{method:"POST",body:JSON.stringify(form)},companyId);setForm({...form,name:""});onMsg("Rule added");load();}catch(e:any){onMsg(e.message);}}}><Plus className="mr-1 inline h-4 w-4"/>Add rule</button>
    </div>
    <div className="mt-4 grid gap-2">{rules.length===0&&<p className="text-sm text-slate-500">No rules yet.</p>}{rules.map(r=><div key={r.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[.03] p-3"><div><b>{r.name}</b> <span className="text-xs text-cyan-300">{Number(r.percent_off)}% off</span><p className="text-xs text-slate-400">{r.type}{r.scope_category?` · ${r.scope_category}`:" · all items"}{r.start_time?` · ${r.start_time}–${r.end_time}`:""}{(r.days||[]).length?` · ${(r.days as number[]).map((d:number)=>DAYS[d]).join(",")}`:""}</p></div><div className="flex items-center gap-3"><span className={`text-xs ${r.active?"text-emerald-300":"text-slate-500"}`}>{r.active?"on":"off"}</span><button className="text-xs text-slate-300" onClick={()=>request(`/api/v1/company/pricing/rules/${r.id}`,{method:"PUT",body:JSON.stringify({active:!r.active})},companyId).then(load)}>toggle</button><button className="text-xs text-red-300" onClick={()=>{if(confirm("Delete rule?"))request(`/api/v1/company/pricing/rules/${r.id}`,{method:"DELETE"},companyId).then(load)}}>del</button></div></div>)}</div>
  </Panel>;
}

export function AuditPanel({companyId}:{companyId:number}) {
  const [d,setD] = useState<{events:Row[];staff:Row[]}>({events:[],staff:[]});
  useEffect(()=>{ request("/api/v1/company/audit",{},companyId).then(setD).catch(()=>{}); },[companyId]);
  return <div className="grid gap-5 lg:grid-cols-2">
    <Panel title="Staff control (last 7 days)" subtitle="Voids, refunds and discounts per staff. Rows flagged red are unusually high and worth a look."><div className="space-y-2">{d.staff.length===0&&<p className="text-sm text-slate-500">Nothing to report.</p>}{d.staff.map((s,i)=><div key={i} className={`flex items-center justify-between rounded-xl border p-3 ${s.flag?"border-red-500/60 bg-red-500/10":"border-white/10 bg-white/[.03]"}`}><b>{s.staff_name||"Unknown"}</b><span className="text-xs text-slate-400">{s.voids} voids · {s.refunds} refunds · {Number(s.discounts).toLocaleString()} disc{s.flag?" ⚠️":""}</span></div>)}</div></Panel>
    <Panel title="Recent voids, refunds & discounts" subtitle="Every reversal and manual discount, newest first."><div className="max-h-[28rem] space-y-2 overflow-auto">{d.events.length===0&&<p className="text-sm text-slate-500">No events.</p>}{d.events.map(e=><div key={e.id} className="rounded-xl border border-white/10 bg-white/[.03] p-3 text-sm"><div className="flex justify-between"><b>{e.order_no}</b><span className={e.status==="voided"||e.status==="refunded"?"text-red-300":"text-amber-300"}>{e.status==="paid"&&Number(e.discount)>0?"discount":e.status}</span></div><p className="text-xs text-slate-400">{Number(e.total).toLocaleString()}{Number(e.discount)>0?` · disc ${Number(e.discount).toLocaleString()}`:""} · {e.staff_name||"—"} · {new Date(e.created_at).toLocaleString()}</p>{(e.void_reason||e.refund_reason||e.discount_reason)&&<p className="mt-1 text-xs text-slate-500">"{e.void_reason||e.refund_reason||e.discount_reason}"</p>}</div>)}</div></Panel>
  </div>;
}

function BranchBusinessCard({companyId,branch,companyModules,registry,onMsg}:{companyId:number;branch:Row;companyModules:string[];registry:Row[];onMsg:(m:string)=>void}) {
  const [sel,setSel] = useState<string[]>([]);
  const [configured,setConfigured] = useState(false);
  const load = () => request(`/api/v1/company/branch-modules?branchId=${branch.id}`,{},companyId).then((r)=>{setSel(r.modules||[]);setConfigured(!!r.configured);}).catch(()=>{});
  useEffect(() => { load(); },[companyId,branch.id]);
  const toggle = (k:string) => setSel(s=>s.includes(k)?s.filter(x=>x!==k):[...s,k]);
  const businessKeys = companyModules.filter(k=>{const r=registry.find(x=>x.key===k);return r?["Industry","Engagement"].includes(r.category):false;});
  const label = (k:string) => registry.find(r=>r.key===k)?.name||k;
  return <Panel title={`Businesses at ${branch.name}`} subtitle={configured?"This outlet runs only the ticked business types.":"Not set — this outlet inherits all the company's business types. Tick some to limit it."}>
    <div className="flex flex-wrap gap-2">{businessKeys.length===0&&<p className="text-sm text-slate-500">Enable industry modules in Services first.</p>}{businessKeys.map(k=><label key={k} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${sel.includes(k)?"border-cyan-400/60 bg-cyan-400/10":"border-white/10 bg-white/[.03]"}`}><input type="checkbox" checked={sel.includes(k)} onChange={()=>toggle(k)}/>{label(k)}</label>)}</div>
    <div className="mt-3 flex gap-2"><button className={button} onClick={()=>request("/api/v1/company/branch-modules",{method:"PUT",body:JSON.stringify({branchId:branch.id,modules:sel})},companyId).then(()=>{onMsg(`${branch.name} business types saved`);load();})}>Save</button><button className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300" onClick={()=>request("/api/v1/company/branch-modules",{method:"PUT",body:JSON.stringify({branchId:branch.id,modules:[]})},companyId).then(()=>{onMsg(`${branch.name} now inherits all business types`);load();})}>Inherit all</button></div>
  </Panel>;
}

export function RecipePanel({companyId,items,onMsg}:{companyId:number;items:Row[];onMsg:(m:string)=>void}) {
  const [products,setProducts] = useState<Row[]>([]);
  const [productId,setProductId] = useState("");
  const [lines,setLines] = useState<Row[]>([]);
  const [add,setAdd] = useState({itemId:"",qty:"1"});
  useEffect(()=>{ request("/api/v1/company/pos/products",{},companyId).then(setProducts).catch(()=>{}); },[companyId]);
  const loadLines = (pid:string) => { if(pid) request(`/api/v1/company/inventory/recipe/${pid}`,{},companyId).then(setLines).catch(()=>setLines([])); else setLines([]); };
  useEffect(()=>loadLines(productId),[productId,companyId]);
  return <Panel title="Recipes — auto-deduct stock on sale" subtitle="Link a menu product to the inventory items it uses. Selling it (POS, table tab or QR) automatically deducts those items.">
    <select className={field} value={productId} onChange={e=>setProductId(e.target.value)}><option value="">Select a product…</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
    {productId&&<>
      <div className="mt-3 flex gap-2"><select className={field} value={add.itemId} onChange={e=>setAdd({...add,itemId:e.target.value})}><option value="">Inventory item</option>{items.map(i=><option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}</select><input className={field+" w-24"} type="number" step="0.001" placeholder="Qty" value={add.qty} onChange={e=>setAdd({...add,qty:e.target.value})}/><button className={button} disabled={!add.itemId||!Number(add.qty)} onClick={async()=>{try{await request(`/api/v1/company/inventory/recipe/${productId}`,{method:"POST",body:JSON.stringify({itemId:Number(add.itemId),qty:Number(add.qty)})},companyId);setAdd({itemId:"",qty:"1"});loadLines(productId);}catch(e:any){onMsg(e.message);}}}>Add</button></div>
      <div className="mt-3 grid gap-1">{lines.length===0&&<p className="text-sm text-slate-500">No recipe — this product doesn't deduct stock.</p>}{lines.map(l=><div key={l.id} className="flex items-center justify-between border-b border-white/5 py-1.5 text-sm"><span>{Number(l.qty)} {l.unit} · {l.item_name}</span><button className="text-xs text-red-300" onClick={()=>request(`/api/v1/company/inventory/recipe/line/${l.id}`,{method:"DELETE"},companyId).then(()=>loadLines(productId))}>remove</button></div>)}</div>
    </>}
  </Panel>;
}

export function AccountingPanel({companyId,onMsg}:{companyId:number;onMsg:(m:string)=>void}) {
  const first = new Date(); first.setDate(1);
  const [from,setFrom] = useState(first.toISOString().slice(0,10));
  const [to,setTo] = useState(new Date().toISOString().slice(0,10));
  const [sum,setSum] = useState<Row|null>(null);
  const [expenses,setExpenses] = useState<Row[]>([]);
  const [form,setForm] = useState({category:"rent",amount:"",note:"",spentOn:new Date().toISOString().slice(0,10)});
  const load = () => { request(`/api/v1/company/accounting/summary?from=${from}&to=${to}`,{},companyId).then(setSum).catch(()=>{}); request("/api/v1/company/accounting/expenses",{},companyId).then(setExpenses).catch(()=>{}); };
  useEffect(() => { load(); },[companyId,from,to]);
  const money=(n:any)=>Number(n||0).toLocaleString();
  return <div className="space-y-5">
    <div className="flex flex-wrap items-end gap-2"><label className="text-xs text-slate-400">From<input className={field+" mt-1"} type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label className="text-xs text-slate-400">To<input className={field+" mt-1"} type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></div>
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><p className="text-xs text-slate-500">Income</p><b className="text-2xl text-emerald-300">{money(sum?.income)}</b></div>
      <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><p className="text-xs text-slate-500">Refunds</p><b className="text-2xl text-red-300">{money(sum?.refunds)}</b></div>
      <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><p className="text-xs text-slate-500">Expenses</p><b className="text-2xl text-amber-300">{money(sum?.expenses)}</b></div>
      <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><p className="text-xs text-slate-500">Net profit</p><b className={`text-2xl ${Number(sum?.net)>=0?"text-emerald-300":"text-red-300"}`}>{money(sum?.net)}</b></div>
    </section>
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Add expense" subtitle="Income is pulled automatically from paid POS sales; log costs here.">
        <div className="grid gap-2 sm:grid-cols-2"><select className={field} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{["rent","utilities","payroll","purchases","marketing","supplies","petty_cash","other"].map(c=><option key={c} value={c}>{c.replace("_"," ")}</option>)}</select><input className={field} type="number" placeholder="Amount" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/><input className={field} type="date" value={form.spentOn} onChange={e=>setForm({...form,spentOn:e.target.value})}/><input className={field} placeholder="Note" value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></div>
        <button className={button+" mt-3"} disabled={!Number(form.amount)} onClick={async()=>{try{await request("/api/v1/company/accounting/expenses",{method:"POST",body:JSON.stringify(form)},companyId);setForm({...form,amount:"",note:""});onMsg("Expense added");load();}catch(e:any){onMsg(e.message);}}}><Plus className="mr-1 inline h-4 w-4"/>Add expense</button>
        <div className="mt-4 max-h-64 space-y-1 overflow-auto text-sm">{expenses.map(x=><div key={x.id} className="flex items-center justify-between border-b border-white/5 py-1.5"><span className="min-w-0 flex-1 truncate"><span className="capitalize">{x.category}</span> {x.note?<span className="text-slate-500">· {x.note}</span>:""} <span className="text-slate-600">{x.spent_on}</span></span><span className="mr-2">{money(x.amount)}</span><button className="text-xs text-red-300" onClick={()=>{if(confirm("Delete expense?"))request(`/api/v1/company/accounting/expenses/${x.id}`,{method:"DELETE"},companyId).then(load)}}>del</button></div>)}</div>
      </Panel>
      <Panel title="Expenses by category" subtitle="For the selected period."><div className="space-y-2">{(sum?.byCategory||[]).length===0&&<p className="text-sm text-slate-500">No expenses in range.</p>}{(sum?.byCategory||[]).map((c:Row,i:number)=><div key={i} className="flex justify-between text-sm"><span className="capitalize">{c.category.replace("_"," ")}</span><span className="text-slate-400">{money(c.amount)}</span></div>)}</div></Panel>
    </div>
  </div>;
}

export function FoodcourtPanel({companyId,onMsg}:{companyId:number;onMsg:(m:string)=>void}) {
  const [stalls,setStalls] = useState<Row[]>([]);
  const [products,setProducts] = useState<Row[]>([]);
  const [settle,setSettle] = useState<Row[]>([]);
  const [form,setForm] = useState({name:"",commissionPct:"10",contact:""});
  const load = () => { request("/api/v1/company/foodcourt/stalls",{},companyId).then(setStalls).catch(()=>{}); request("/api/v1/company/pos/products",{},companyId).then(setProducts).catch(()=>{}); request("/api/v1/company/foodcourt/settlement",{},companyId).then(setSettle).catch(()=>{}); };
  useEffect(() => { load(); },[companyId]);
  return <div className="grid gap-5 lg:grid-cols-2">
    <Panel title="Stalls" subtitle="Each stall gets a commission %. Assign products to a stall; sales are allocated automatically.">
      <div className="grid gap-2 sm:grid-cols-3"><input className={field} placeholder="Stall name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><label className="text-xs text-slate-400">Commission %<input className={field+" mt-1"} type="number" value={form.commissionPct} onChange={e=>setForm({...form,commissionPct:e.target.value})}/></label><input className={field} placeholder="Contact" value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})}/></div>
      <button className={button+" mt-3"} disabled={!form.name} onClick={async()=>{try{await request("/api/v1/company/foodcourt/stalls",{method:"POST",body:JSON.stringify(form)},companyId);setForm({name:"",commissionPct:"10",contact:""});onMsg("Stall added");load();}catch(e:any){onMsg(e.message);}}}><Plus className="mr-1 inline h-4 w-4"/>Add stall</button>
      <div className="mt-4 grid gap-2">{stalls.map(s=><div key={s.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[.03] p-3"><div><b>{s.name}</b> <span className="text-xs text-slate-400">{Number(s.commission_pct)}% · {s.contact||"—"}</span></div><button className="text-xs text-red-300" onClick={()=>{if(confirm("Delete stall?"))request(`/api/v1/company/foodcourt/stalls/${s.id}`,{method:"DELETE"},companyId).then(load)}}>del</button></div>)}</div>
      <div className="mt-5 border-t border-white/10 pt-4"><p className="mb-2 text-sm font-bold">Assign products to stalls</p><div className="max-h-56 space-y-2 overflow-auto">{products.map(p=><div key={p.id} className="flex items-center justify-between text-sm"><span className="min-w-0 flex-1 truncate">{p.name}</span><select className={field+" w-40"} value={p.stall_id||""} onChange={e=>request("/api/v1/company/foodcourt/assign",{method:"POST",body:JSON.stringify({productId:p.id,stallId:e.target.value?Number(e.target.value):null})},companyId).then(load)}><option value="">— no stall —</option>{stalls.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>)}</div></div>
    </Panel>
    <Panel title="Settlement (this month)" subtitle="Gross sales, platform commission and net payable per stall.">
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-slate-500"><tr><th>Stall</th><th className="text-right">Gross</th><th className="text-right">Comm</th><th className="text-right">Net</th></tr></thead><tbody>{settle.length===0&&<tr><td colSpan={4} className="py-3 text-slate-500">No stalls / sales yet.</td></tr>}{settle.map(s=><tr key={s.id} className="border-t border-white/10"><td className="py-2">{s.name} <span className="text-xs text-slate-500">{s.commissionPct}%</span></td><td className="text-right">{Number(s.gross).toLocaleString()}</td><td className="text-right text-amber-300">{Number(s.commission).toLocaleString()}</td><td className="text-right text-emerald-300">{Number(s.net).toLocaleString()}</td></tr>)}</tbody></table></div>
    </Panel>
  </div>;
}

export function GiftsPanel({companyId,staff,onMsg}:{companyId:number;staff:Row[];onMsg:(m:string)=>void}) {
  const [catalog,setCatalog] = useState<Row[]>([]);
  const [board,setBoard] = useState<Row[]>([]);
  const [form,setForm] = useState({name:"",emoji:"🎁",price:"0",sharePct:"50"});
  const [send,setSend] = useState({giftId:"",toUserId:"",fromName:""});
  const load = () => { request("/api/v1/company/live-gifts/catalog",{},companyId).then(setCatalog).catch(()=>{}); request("/api/v1/company/live-gifts/leaderboard",{},companyId).then(setBoard).catch(()=>{}); };
  useEffect(() => { load(); },[companyId]);
  return <div className="grid gap-5 lg:grid-cols-2">
    <Panel title="Gift catalog & send" subtitle="Virtual gifts guests buy for performers. Performer gets the share %; the house keeps the rest.">
      <div className="grid gap-2 sm:grid-cols-4"><input className={field} placeholder="Gift" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input className={field} placeholder="Emoji" value={form.emoji} onChange={e=>setForm({...form,emoji:e.target.value})}/><input className={field} type="number" placeholder="Price" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/><input className={field} type="number" placeholder="Share %" value={form.sharePct} onChange={e=>setForm({...form,sharePct:e.target.value})}/></div>
      <button className={button+" mt-3"} disabled={!form.name} onClick={async()=>{try{await request("/api/v1/company/live-gifts/catalog",{method:"POST",body:JSON.stringify(form)},companyId);setForm({name:"",emoji:"🎁",price:"0",sharePct:"50"});onMsg("Gift added");load();}catch(e:any){onMsg(e.message);}}}><Plus className="mr-1 inline h-4 w-4"/>Add gift</button>
      <div className="mt-3 flex flex-wrap gap-2">{catalog.map(g=><span key={g.id} className="rounded-full bg-white/5 px-3 py-1 text-xs">{g.emoji} {g.name} · {Number(g.price).toLocaleString()} · {Number(g.share_pct)}% <button className="text-red-300" onClick={()=>request(`/api/v1/company/live-gifts/catalog/${g.id}`,{method:"DELETE"},companyId).then(load)}>×</button></span>)}</div>
      <div className="mt-5 border-t border-white/10 pt-4"><p className="mb-2 text-sm font-bold">Send a gift</p><div className="grid gap-2 sm:grid-cols-3"><select className={field} value={send.giftId} onChange={e=>setSend({...send,giftId:e.target.value})}><option value="">Gift</option>{catalog.map(g=><option key={g.id} value={g.id}>{g.emoji} {g.name}</option>)}</select><select className={field} value={send.toUserId} onChange={e=>setSend({...send,toUserId:e.target.value})}><option value="">To performer</option>{staff.map(s=><option key={s.user_id} value={s.user_id}>{[s.first_name,s.last_name].filter(Boolean).join(" ")||s.email}</option>)}</select><input className={field} placeholder="From (guest)" value={send.fromName} onChange={e=>setSend({...send,fromName:e.target.value})}/></div><button className={button+" mt-2"} disabled={!send.giftId||!send.toUserId} onClick={async()=>{try{await request("/api/v1/company/live-gifts/send",{method:"POST",body:JSON.stringify(send)},companyId);onMsg("Gift sent 🎉");setSend({giftId:"",toUserId:"",fromName:""});load();}catch(e:any){onMsg(e.message);}}}>Send gift</button></div>
    </Panel>
    <Panel title="Performer leaderboard (this month)" subtitle="Total gift value received and performer earnings."><div className="space-y-2">{board.length===0&&<p className="text-sm text-slate-500">No gifts yet.</p>}{board.map((b,i)=><div key={i} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[.03] p-3"><div className="flex items-center gap-2"><span className="text-lg font-black">#{i+1}</span><b>{b.performer}</b></div><span className="text-xs text-slate-400">{b.gifts} gifts · {Number(b.total).toLocaleString()} · earned {Number(b.earned).toLocaleString()}</span></div>)}</div></Panel>
  </div>;
}

export function DrawsPanel({companyId,onMsg}:{companyId:number;onMsg:(m:string)=>void}) {
  const [draws,setDraws] = useState<Row[]>([]);
  const [sel,setSel] = useState<Row|null>(null); const [entries,setEntries] = useState<Row[]>([]);
  const [name,setName] = useState(""); const [pool,setPool] = useState("0");
  const [ent,setEnt] = useState({name:"",tickets:"1"});
  const load = () => request("/api/v1/company/draws",{},companyId).then(setDraws).catch(()=>{});
  useEffect(() => { load(); },[companyId]);
  const openD = async (d:Row) => { setSel(d); setEntries(await request(`/api/v1/company/draws/${d.id}/entries`,{},companyId)); };
  return <div className="grid gap-5 lg:grid-cols-2">
    <Panel title="Lucky draws" subtitle="Create a prize pool, add entrants with ticket counts, then draw a weighted random winner.">
      <div className="flex gap-2"><input className={field} placeholder="Draw name" value={name} onChange={e=>setName(e.target.value)}/><input className={field+" w-28"} type="number" placeholder="Pool" value={pool} onChange={e=>setPool(e.target.value)}/><button className={button} disabled={!name} onClick={async()=>{await request("/api/v1/company/draws",{method:"POST",body:JSON.stringify({name,pool:Number(pool)})},companyId);setName("");setPool("0");onMsg("Draw created");load();}}>Add</button></div>
      <div className="mt-4 grid gap-2">{draws.map(d=><button key={d.id} onClick={()=>openD(d)} className={`rounded-xl border p-3 text-left ${sel?.id===d.id?"border-cyan-400/60 bg-cyan-400/5":"border-white/10 bg-white/[.03]"}`}><div className="flex justify-between"><b>{d.name}</b><span className={`text-xs ${d.status==="drawn"?"text-emerald-300":"text-cyan-300"}`}>{d.status}</span></div><p className="text-xs text-slate-400">Pool {Number(d.pool).toLocaleString()} · {Number(d.total_tickets)} tickets{d.winner_name?` · 🏆 ${d.winner_name}`:""}</p></button>)}</div>
    </Panel>
    <Panel title={sel?sel.name:"Select a draw"} subtitle={sel?"Add entrants and draw the winner.":"Pick a draw."}>
      {sel&&<><div className="flex gap-2"><input className={field} placeholder="Entrant name" value={ent.name} onChange={e=>setEnt({...ent,name:e.target.value})}/><input className={field+" w-20"} type="number" placeholder="Tickets" value={ent.tickets} onChange={e=>setEnt({...ent,tickets:e.target.value})}/><button className={button} disabled={!ent.name} onClick={async()=>{await request(`/api/v1/company/draws/${sel.id}/entries`,{method:"POST",body:JSON.stringify({name:ent.name,tickets:Number(ent.tickets)})},companyId);setEnt({name:"",tickets:"1"});openD(sel);}}>Add</button></div>
      <button className={button+" mt-3 w-full justify-center"} disabled={sel.status==="drawn"} onClick={async()=>{try{const d=await request(`/api/v1/company/draws/${sel.id}/draw`,{method:"POST",body:"{}"},companyId);onMsg(`🏆 Winner: ${d.winner_name}`);setSel(d);load();}catch(e:any){onMsg(e.message);}}}>{sel.status==="drawn"?`Winner: ${sel.winner_name}`:"🎲 Draw winner"}</button>
      <div className="mt-3 max-h-72 space-y-1 overflow-auto text-sm">{entries.map(e=><div key={e.id} className="flex justify-between border-b border-white/5 py-1.5"><span>{e.name}</span><span className="text-slate-400">{e.tickets} 🎟️</span></div>)}</div></>}
      {!sel&&<p className="text-sm text-slate-500">No draw selected.</p>}
    </Panel>
  </div>;
}

export function PayrollPanel({companyId}:{companyId:number}) {
  const [rows,setRows] = useState<Row[]>([]);
  const first = new Date(); first.setDate(1);
  const [from,setFrom] = useState(first.toISOString().slice(0,10));
  const [to,setTo] = useState(new Date().toISOString().slice(0,10));
  const load = () => request(`/api/v1/company/payroll/summary?from=${from}&to=${to}`,{},companyId).then(setRows).catch(()=>{});
  useEffect(() => { load(); },[companyId,from,to]);
  const total = rows.reduce((s,r)=>s+Number(r.total),0);
  return <Panel title="Payroll summary" subtitle="Base pay (salaried) plus booking commission for the period. Hourly staff show their rate — log hours via attendance.">
    <div className="mb-3 flex gap-2"><label className="text-xs text-slate-400">From<input className={field+" mt-1"} type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label className="text-xs text-slate-400">To<input className={field+" mt-1"} type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></div>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-slate-500"><tr><th>Staff</th><th>Type</th><th className="text-right">Hours</th><th className="text-right">Base</th><th className="text-right">Commission</th><th className="text-right">Total</th></tr></thead><tbody>{rows.length===0&&<tr><td colSpan={6} className="py-3 text-slate-500">No active staff.</td></tr>}{rows.map((r,i)=><tr key={i} className="border-t border-white/10"><td className="py-2">{r.name}</td><td>{r.payType==="hourly"?`hourly ${Number(r.hourlyRate).toLocaleString()}/h`:"salary"}</td><td className="text-right">{r.payType==="hourly"?Number(r.hours||0):"—"}</td><td className="text-right">{Number(r.base).toLocaleString()}</td><td className="text-right text-cyan-300">{Number(r.commission).toLocaleString()}</td><td className="text-right font-bold">{Number(r.total).toLocaleString()}</td></tr>)}</tbody><tfoot><tr className="border-t border-white/20"><td colSpan={5} className="py-2 text-right font-bold">Total payroll</td><td className="text-right font-black text-emerald-300">{total.toLocaleString()}</td></tr></tfoot></table></div>
  </Panel>;
}

export function WholesalePanel({companyId,onMsg}:{companyId:number;onMsg:(m:string)=>void}) {
  const [accts,setAccts] = useState<Row[]>([]);
  const [form,setForm] = useState({name:"",contact:"",phone:"",priceTier:"standard",discountPct:"0",creditLimit:"0"});
  const load = () => request("/api/v1/company/wholesale/accounts",{},companyId).then(setAccts).catch(()=>{});
  useEffect(() => { load(); },[companyId]);
  return <Panel title="Wholesale / B2B accounts" subtitle="Trade customers with a price tier, discount, credit limit and a running balance (charge on delivery, reduce on payment).">
    <div className="grid gap-2 sm:grid-cols-3"><input className={field} placeholder="Account name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input className={field} placeholder="Contact" value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})}/><input className={field} placeholder="Phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/><input className={field} placeholder="Price tier" value={form.priceTier} onChange={e=>setForm({...form,priceTier:e.target.value})}/><label className="text-xs text-slate-400">Discount %<input className={field+" mt-1"} type="number" value={form.discountPct} onChange={e=>setForm({...form,discountPct:e.target.value})}/></label><label className="text-xs text-slate-400">Credit limit<input className={field+" mt-1"} type="number" value={form.creditLimit} onChange={e=>setForm({...form,creditLimit:e.target.value})}/></label></div>
    <button className={button+" mt-3"} disabled={!form.name} onClick={async()=>{try{await request("/api/v1/company/wholesale/accounts",{method:"POST",body:JSON.stringify(form)},companyId);setForm({name:"",contact:"",phone:"",priceTier:"standard",discountPct:"0",creditLimit:"0"});onMsg("Account added");load();}catch(e:any){onMsg(e.message);}}}><Plus className="mr-1 inline h-4 w-4"/>Add account</button>
    <div className="mt-4 grid gap-2">{accts.map(x=><div key={x.id} className={`rounded-xl border p-3 ${Number(x.balance)>Number(x.credit_limit)&&Number(x.credit_limit)>0?"border-red-500/50 bg-red-500/10":"border-white/10 bg-white/[.03]"}`}><div className="flex items-center justify-between"><b>{x.name}</b><span className="text-xs text-slate-400">{x.price_tier} · {Number(x.discount_pct)}% off</span></div><p className="text-xs text-slate-400">{x.contact||"—"} {x.phone||""} · balance <span className={Number(x.balance)>0?"text-amber-300":"text-emerald-300"}>{Number(x.balance).toLocaleString()}</span> / limit {Number(x.credit_limit).toLocaleString()}</p><div className="mt-2 flex gap-3 text-xs"><button className="text-amber-300" onClick={()=>{const v=prompt(`Charge amount to ${x.name}`);if(v&&Number(v))request(`/api/v1/company/wholesale/accounts/${x.id}/charge`,{method:"POST",body:JSON.stringify({amount:Math.abs(Number(v))})},companyId).then(load);}}>+ charge</button><button className="text-emerald-300" onClick={()=>{const v=prompt(`Payment received from ${x.name}`);if(v&&Number(v))request(`/api/v1/company/wholesale/accounts/${x.id}/charge`,{method:"POST",body:JSON.stringify({amount:-Math.abs(Number(v))})},companyId).then(load);}}>− payment</button><button className="text-red-300" onClick={()=>{if(confirm("Delete account?"))request(`/api/v1/company/wholesale/accounts/${x.id}`,{method:"DELETE"},companyId).then(load)}}>del</button></div></div>)}</div>
  </Panel>;
}

export function ProjectsPanel({companyId,onMsg}:{companyId:number;onMsg:(m:string)=>void}) {
  const [projects,setProjects] = useState<Row[]>([]);
  const [sel,setSel] = useState<Row|null>(null); const [entries,setEntries] = useState<Row[]>([]);
  const [form,setForm] = useState({client:"",name:"",budget:"0",rate:"0"});
  const [te,setTe] = useState({hours:"",note:""});
  const load = () => request("/api/v1/company/projects",{},companyId).then(setProjects).catch(()=>{});
  useEffect(() => { load(); },[companyId]);
  const openP = async (p:Row) => { setSel(p); setEntries(await request(`/api/v1/company/projects/${p.id}/time`,{},companyId)); };
  return <div className="grid gap-5 lg:grid-cols-2">
    <Panel title="Projects" subtitle="Client work with an hourly rate and budget. Billable = logged hours × rate.">
      <div className="grid gap-2 sm:grid-cols-2"><input className={field} placeholder="Client" value={form.client} onChange={e=>setForm({...form,client:e.target.value})}/><input className={field} placeholder="Project name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><label className="text-xs text-slate-400">Budget<input className={field+" mt-1"} type="number" value={form.budget} onChange={e=>setForm({...form,budget:e.target.value})}/></label><label className="text-xs text-slate-400">Hourly rate<input className={field+" mt-1"} type="number" value={form.rate} onChange={e=>setForm({...form,rate:e.target.value})}/></label></div>
      <button className={button+" mt-3"} disabled={!form.name} onClick={async()=>{try{await request("/api/v1/company/projects",{method:"POST",body:JSON.stringify(form)},companyId);setForm({client:"",name:"",budget:"0",rate:"0"});onMsg("Project created");load();}catch(e:any){onMsg(e.message);}}}><Plus className="mr-1 inline h-4 w-4"/>Add project</button>
      <div className="mt-4 grid gap-2">{projects.map(p=><button key={p.id} onClick={()=>openP(p)} className={`rounded-xl border p-3 text-left ${sel?.id===p.id?"border-cyan-400/60 bg-cyan-400/5":"border-white/10 bg-white/[.03]"}`}><div className="flex justify-between"><b>{p.name}</b><span className="text-xs text-slate-400">{p.status}</span></div><p className="text-xs text-slate-400">{p.client||"—"} · {Number(p.hours)}h · billable {Number(p.billable).toLocaleString()} / budget {Number(p.budget).toLocaleString()}</p></button>)}</div>
    </Panel>
    <Panel title={sel?`Timesheet: ${sel.name}`:"Select a project"} subtitle={sel?"Log hours worked.":"Pick a project."}>
      {sel&&<><div className="flex gap-2"><input className={field+" w-24"} type="number" placeholder="Hours" value={te.hours} onChange={e=>setTe({...te,hours:e.target.value})}/><input className={field} placeholder="Note" value={te.note} onChange={e=>setTe({...te,note:e.target.value})}/><button className={button} disabled={!Number(te.hours)} onClick={async()=>{await request(`/api/v1/company/projects/${sel.id}/time`,{method:"POST",body:JSON.stringify({hours:Number(te.hours),note:te.note})},companyId);setTe({hours:"",note:""});openP(sel);load();}}>Log</button></div>
      <div className="mt-3 max-h-80 space-y-1 overflow-auto text-sm">{entries.length===0&&<p className="text-slate-500">No time logged.</p>}{entries.map(en=><div key={en.id} className="flex justify-between border-b border-white/5 py-1.5"><span>{en.work_date} · {en.staff_name||"—"} <span className="text-slate-500">{en.note}</span></span><span>{Number(en.hours)}h</span></div>)}</div></>}
      {!sel&&<p className="text-sm text-slate-500">No project selected.</p>}
    </Panel>
  </div>;
}

const MKT_SEGMENTS = [["all","Everyone"],["vip","VIP"],["new","New (30d)"],["lost","Lost (90d)"],["birthday","Birthday"]];
export function MarketingPanel({companyId,onMsg}:{companyId:number;onMsg:(m:string)=>void}) {
  const [campaigns,setCampaigns] = useState<Row[]>([]);
  const [form,setForm] = useState({name:"",channel:"whatsapp",segment:"all",message:""});
  const [aud,setAud] = useState<Row|null>(null);
  const load = () => request("/api/v1/company/marketing/campaigns",{},companyId).then(setCampaigns).catch(()=>{});
  useEffect(() => { load(); },[companyId]);
  const preview = async (seg:string) => { const r=await request(`/api/v1/company/marketing/audience?segment=${seg}`,{},companyId); setAud(r); };
  useEffect(()=>{preview(form.segment);},[form.segment,companyId]);
  return <Panel title="Marketing campaigns" subtitle="Build an audience from your CRM segments, save the campaign, then export recipients (WhatsApp/email auto-send connects later).">
    <div className="grid gap-2 sm:grid-cols-2"><input className={field} placeholder="Campaign name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><select className={field} value={form.channel} onChange={e=>setForm({...form,channel:e.target.value})}>{["whatsapp","email","sms","push"].map(c=><option key={c} value={c}>{c}</option>)}</select><select className={field} value={form.segment} onChange={e=>setForm({...form,segment:e.target.value})}>{MKT_SEGMENTS.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select><div className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-sm text-slate-300">Audience: <b className="text-cyan-300">{aud?.count ?? "…"}</b> recipient(s)</div></div>
    <textarea className={field+" mt-2"} rows={3} placeholder="Message" value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/>
    <button className={button+" mt-3"} disabled={!form.name} onClick={async()=>{try{await request("/api/v1/company/marketing/campaigns",{method:"POST",body:JSON.stringify(form)},companyId);setForm({...form,name:"",message:""});onMsg("Campaign saved");load();}catch(e:any){onMsg(e.message);}}}><Plus className="mr-1 inline h-4 w-4"/>Save campaign</button>
    {aud?.note&&<p className="mt-2 text-xs text-amber-300">{aud.note}</p>}
    <div className="mt-4 grid gap-2">{campaigns.map(c=><div key={c.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[.03] p-3"><div><b>{c.name}</b> <span className="text-xs text-slate-400">{c.channel} · {c.segment}</span><p className="text-xs text-slate-500">{c.status}{c.sent_count?` · ${c.sent_count} sent`:""}</p></div><div className="flex gap-3 text-xs">{c.status!=="sent"&&<button className="text-emerald-300" onClick={()=>{if(confirm(`Send "${c.name}" to the ${c.segment} segment via ${c.channel}?`))request(`/api/v1/company/marketing/campaigns/${c.id}/send`,{method:"POST",body:"{}"},companyId).then((r)=>{onMsg(r.note||"Sent");load();})}}>send now</button>}<button className="text-red-300" onClick={()=>{if(confirm("Delete campaign?"))request(`/api/v1/company/marketing/campaigns/${c.id}`,{method:"DELETE"},companyId).then(load)}}>del</button></div></div>)}</div>
  </Panel>;
}

export function EventsPanel({companyId,onMsg}:{companyId:number;onMsg:(m:string)=>void}) {
  const [events,setEvents] = useState<Row[]>([]);
  const [sel,setSel] = useState<Row|null>(null);
  const [types,setTypes] = useState<Row[]>([]);
  const [tickets,setTickets] = useState<Row[]>([]);
  const [evForm,setEvForm] = useState({name:"",startsAt:"",venue:""});
  const [tyForm,setTyForm] = useState({name:"",price:"0",quantity:"0"});
  const [issue,setIssue] = useState({ticketTypeId:"",buyerName:"",qty:"1"});
  const [scan,setScan] = useState(""); const [scanRes,setScanRes] = useState<Row|null>(null);
  const loadEvents = () => request("/api/v1/company/events",{},companyId).then(setEvents).catch(()=>{});
  useEffect(() => { loadEvents(); },[companyId]);
  const openEvent = async (e:Row) => { setSel(e); setTypes(await request(`/api/v1/company/events/${e.id}/types`,{},companyId)); setTickets(await request(`/api/v1/company/events/${e.id}/tickets`,{},companyId)); };
  const reloadSel = () => sel&&openEvent(sel);
  return <div className="grid gap-5 lg:grid-cols-2">
    <Panel title="Events" subtitle="Create events, add ticket types, issue QR tickets and scan guests in.">
      <div className="grid gap-2 sm:grid-cols-2"><input className={field} placeholder="Event name" value={evForm.name} onChange={e=>setEvForm({...evForm,name:e.target.value})}/><input className={field} type="datetime-local" value={evForm.startsAt} onChange={e=>setEvForm({...evForm,startsAt:e.target.value})}/><input className={field+" sm:col-span-2"} placeholder="Venue" value={evForm.venue} onChange={e=>setEvForm({...evForm,venue:e.target.value})}/></div>
      <button className={button+" mt-3"} disabled={!evForm.name} onClick={async()=>{try{await request("/api/v1/company/events",{method:"POST",body:JSON.stringify(evForm)},companyId);setEvForm({name:"",startsAt:"",venue:""});onMsg("Event created");loadEvents();}catch(e:any){onMsg(e.message);}}}><Plus className="mr-1 inline h-4 w-4"/>Add event</button>
      <div className="mt-4 grid gap-2">{events.map(e=><button key={e.id} onClick={()=>openEvent(e)} className={`rounded-xl border p-3 text-left ${sel?.id===e.id?"border-cyan-400/60 bg-cyan-400/5":"border-white/10 bg-white/[.03]"}`}><b>{e.name}</b><p className="text-xs text-slate-400">{e.starts_at?new Date(e.starts_at).toLocaleString():"No date"}{e.venue?` · ${e.venue}`:""} · {Number(e.checked_in||0)}/{Number(e.tickets||0)} in</p></button>)}</div>
    </Panel>
    <Panel title={sel?`Manage: ${sel.name}`:"Select an event"} subtitle={sel?"Ticket types, issue tickets, scan guests.":"Pick an event on the left."}>
      {!sel&&<p className="text-sm text-slate-500">No event selected.</p>}
      {sel&&<>
        <p className="text-sm font-bold">Ticket types</p>
        <div className="mt-1 flex flex-wrap gap-2">{types.map(t=><span key={t.id} className="rounded-full bg-white/5 px-3 py-1 text-xs">{t.name} · {Number(t.price).toLocaleString()} · {Number(t.sold)}/{Number(t.quantity)||"∞"}</span>)}</div>
        <div className="mt-2 flex gap-2"><input className={field} placeholder="Type name" value={tyForm.name} onChange={e=>setTyForm({...tyForm,name:e.target.value})}/><input className={field+" w-24"} type="number" placeholder="Price" value={tyForm.price} onChange={e=>setTyForm({...tyForm,price:e.target.value})}/><input className={field+" w-20"} type="number" placeholder="Qty" value={tyForm.quantity} onChange={e=>setTyForm({...tyForm,quantity:e.target.value})}/><button className={button} disabled={!tyForm.name} onClick={async()=>{await request(`/api/v1/company/events/${sel.id}/types`,{method:"POST",body:JSON.stringify(tyForm)},companyId);setTyForm({name:"",price:"0",quantity:"0"});reloadSel();}}>Add</button></div>
        <div className="mt-4 border-t border-white/10 pt-3"><p className="text-sm font-bold">Issue tickets</p>
          <div className="mt-1 flex flex-wrap gap-2"><select className={field+" flex-1"} value={issue.ticketTypeId} onChange={e=>setIssue({...issue,ticketTypeId:e.target.value})}><option value="">No type</option>{types.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><input className={field} placeholder="Buyer name" value={issue.buyerName} onChange={e=>setIssue({...issue,buyerName:e.target.value})}/><input className={field+" w-16"} type="number" value={issue.qty} onChange={e=>setIssue({...issue,qty:e.target.value})}/><button className={button} onClick={async()=>{try{const t=await request(`/api/v1/company/events/${sel.id}/issue`,{method:"POST",body:JSON.stringify(issue)},companyId);onMsg(`Issued ${t.length} ticket(s)`);reloadSel();}catch(e:any){onMsg(e.message);}}}>Issue</button></div>
        </div>
        <div className="mt-4 border-t border-white/10 pt-3"><p className="text-sm font-bold">Scan / check-in</p>
          <div className="mt-1 flex gap-2"><input className={field} placeholder="Paste/scan ticket code" value={scan} onChange={e=>setScan(e.target.value)}/><button className={button} onClick={async()=>{try{const r=await request("/api/v1/company/events/scan",{method:"POST",body:JSON.stringify({code:scan.trim()})},companyId);setScanRes(r);setScan("");reloadSel();}catch(e:any){setScanRes({ok:false,message:e.message});}}}>Scan</button></div>
          {scanRes&&<p className={`mt-2 text-sm ${scanRes.ok?"text-emerald-300":scanRes.already?"text-amber-300":"text-red-300"}`}>{scanRes.ok?`✅ Valid — ${scanRes.buyer||"guest"} checked in`:scanRes.already?`⚠️ Already used${scanRes.checkedInAt?` at ${new Date(scanRes.checkedInAt).toLocaleTimeString()}`:""}`:`❌ ${scanRes.message||"Invalid ticket"}`}</p>}
        </div>
        <div className="mt-4 max-h-52 overflow-auto"><p className="mb-1 text-xs text-slate-500">{tickets.length} ticket(s)</p>{tickets.map(t=><div key={t.id} className="flex items-center justify-between border-b border-white/5 py-1.5 text-xs"><span>{t.code} · {t.buyer_name||"—"} <a className="text-cyan-300 underline" href={`/api/v1/company/events/ticket/${t.code}/qr`} target="_blank" rel="noreferrer">QR</a></span><span className={t.status==="used"?"text-emerald-300":t.status==="cancelled"?"text-red-300":"text-slate-400"}>{t.status}</span></div>)}</div>
      </>}
    </Panel>
  </div>;
}

const REPAIR_FLOW = ["received","diagnosing","quoted","approved","repairing","testing","ready","collected","cancelled"];
export function RepairPanel({companyId,staff,onMsg}:{companyId:number;staff:Row[];onMsg:(m:string)=>void}) {
  const [tickets,setTickets] = useState<Row[]>([]);
  const [form,setForm] = useState({customerName:"",customerPhone:"",device:"",serialImei:"",problem:"",quote:"0",deposit:"0",assignedUserId:""});
  const load = () => request("/api/v1/company/repair/tickets",{},companyId).then(setTickets).catch(()=>{});
  useEffect(() => { load(); },[companyId]);
  return <div className="grid gap-5 lg:grid-cols-2">
    <Panel title="New repair ticket" subtitle="Log a device in. Track it through the workflow to collection.">
      <div className="grid gap-2 sm:grid-cols-2"><input className={field} placeholder="Customer name" value={form.customerName} onChange={e=>setForm({...form,customerName:e.target.value})}/><input className={field} placeholder="Phone" value={form.customerPhone} onChange={e=>setForm({...form,customerPhone:e.target.value})}/><input className={field} placeholder="Device (e.g. iPhone 13)" value={form.device} onChange={e=>setForm({...form,device:e.target.value})}/><input className={field} placeholder="Serial / IMEI" value={form.serialImei} onChange={e=>setForm({...form,serialImei:e.target.value})}/><input className={field+" sm:col-span-2"} placeholder="Problem reported" value={form.problem} onChange={e=>setForm({...form,problem:e.target.value})}/><input className={field} type="number" placeholder="Quote" value={form.quote} onChange={e=>setForm({...form,quote:e.target.value})}/><input className={field} type="number" placeholder="Deposit" value={form.deposit} onChange={e=>setForm({...form,deposit:e.target.value})}/><select className={field+" sm:col-span-2"} value={form.assignedUserId} onChange={e=>setForm({...form,assignedUserId:e.target.value})}><option value="">Assign technician (optional)</option>{staff.map(s=><option key={s.user_id} value={s.user_id}>{[s.first_name,s.last_name].filter(Boolean).join(" ")||s.email}</option>)}</select></div>
      <button className={button+" mt-3"} disabled={!form.device} onClick={async()=>{try{await request("/api/v1/company/repair/tickets",{method:"POST",body:JSON.stringify(form)},companyId);setForm({customerName:"",customerPhone:"",device:"",serialImei:"",problem:"",quote:"0",deposit:"0",assignedUserId:""});onMsg("Repair logged");load();}catch(e:any){onMsg(e.message);}}}><Plus className="mr-1 inline h-4 w-4"/>Log repair</button>
    </Panel>
    <Panel title="Repairs" subtitle="Advance status as work progresses.">
      <div className="max-h-[30rem] space-y-2 overflow-auto">{tickets.length===0&&<p className="text-sm text-slate-500">No repairs yet.</p>}{tickets.map(t=><div key={t.id} className="rounded-xl border border-white/10 bg-white/[.03] p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><b>{t.ticket_no} · {t.device}</b><p className="text-xs text-slate-400 truncate">{t.customer_name||"—"}{t.customer_phone?` · ${t.customer_phone}`:""}{t.serial_imei?` · ${t.serial_imei}`:""}</p>{t.problem&&<p className="text-xs text-slate-500 truncate">"{t.problem}"</p>}<p className="text-xs text-cyan-300">{Number(t.quote).toLocaleString()}{t.assignee?` · ${t.assignee}`:""}</p></div><select className={field+" w-32"} value={t.status} onChange={e=>request(`/api/v1/company/repair/tickets/${t.id}`,{method:"PATCH",body:JSON.stringify({status:e.target.value})},companyId).then(load)}>{REPAIR_FLOW.map(s=><option key={s} value={s}>{s}</option>)}</select></div><button className="mt-2 text-xs text-red-300" onClick={()=>{if(confirm("Delete repair ticket?"))request(`/api/v1/company/repair/tickets/${t.id}`,{method:"DELETE"},companyId).then(load)}}>delete</button></div>)}</div>
    </Panel>
  </div>;
}

const BOOKING_STATUS:Record<string,string> = { booked:"text-cyan-300", confirmed:"text-cyan-300", seated:"text-amber-300", completed:"text-emerald-300", cancelled:"text-red-300", no_show:"text-red-300" };
export function BookingPanel({companyId,staff,customers,onMsg}:{companyId:number;staff:Row[];customers:Row[];onMsg:(m:string)=>void}) {
  const today = new Date().toISOString().slice(0,10);
  const [resources,setResources] = useState<Row[]>([]);
  const [bookings,setBookings] = useState<Row[]>([]);
  const [date,setDate] = useState(today);
  const [comms,setComms] = useState<Row[]>([]);
  const [resForm,setResForm] = useState({name:"",type:"staff"});
  const [form,setForm] = useState({resourceId:"",service:"",customerName:"",customerPhone:"",customerId:"",time:"10:00",durationMin:"60",price:"0",deposit:"0",staffUserId:"",note:""});
  const [busy,setBusy] = useState(false);
  const loadRes = () => request("/api/v1/company/booking/resources",{},companyId).then(setResources).catch(()=>{});
  const loadBookings = () => request(`/api/v1/company/booking/bookings?date=${date}`,{},companyId).then(setBookings).catch(()=>{});
  const loadComms = () => { const from=new Date(); from.setDate(1); request(`/api/v1/company/booking/commissions?from=${from.toISOString().slice(0,10)}`,{},companyId).then(setComms).catch(()=>{}); };
  useEffect(()=>{ loadRes(); loadComms(); },[companyId]);
  useEffect(() => { loadBookings(); },[companyId,date]);
  const act = async (run:()=>Promise<any>,msg:string) => { setBusy(true); onMsg(""); try{await run(); onMsg(msg); loadBookings(); loadComms();}catch(e:any){onMsg(e.message);}finally{setBusy(false);} };
  const create = () => act(async()=>{ const startsAt=new Date(`${date}T${form.time}:00`); await request("/api/v1/company/booking/bookings",{method:"POST",body:JSON.stringify({...form,resourceId:form.resourceId||null,customerId:form.customerId||null,startsAt:startsAt.toISOString(),durationMin:Number(form.durationMin),price:Number(form.price),deposit:Number(form.deposit),staffUserId:form.staffUserId||null})},companyId); setForm({...form,service:"",customerName:"",customerPhone:"",customerId:"",price:"0",deposit:"0",note:""}); },"Booking created");

  return <div className="grid gap-5 lg:grid-cols-2">
    <Panel title="New booking" subtitle="Book a resource (stylist, room, chair, bay, trainer, asset…). Clashes on the same resource are blocked.">
      <div className="grid gap-2 sm:grid-cols-2">
        <select className={field} value={form.resourceId} onChange={e=>setForm({...form,resourceId:e.target.value})}><option value="">Any / no resource</option>{resources.map(r=><option key={r.id} value={r.id}>{r.name} ({r.type})</option>)}</select>
        <input className={field} placeholder="Service (e.g. Haircut)" value={form.service} onChange={e=>setForm({...form,service:e.target.value})}/>
        <select className={field} value={form.customerId} onChange={e=>{const c=customers.find(x=>String(x.id)===e.target.value);setForm({...form,customerId:e.target.value,customerName:c?.name||form.customerName,customerPhone:c?.phone||form.customerPhone});}}><option value="">Walk-in / type name</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <input className={field} placeholder="Customer name" value={form.customerName} onChange={e=>setForm({...form,customerName:e.target.value})}/>
        <input className={field} type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})}/>
        <input className={field} type="number" placeholder="Duration (min)" value={form.durationMin} onChange={e=>setForm({...form,durationMin:e.target.value})}/>
        <input className={field} type="number" placeholder="Price" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/>
        <input className={field} type="number" placeholder="Deposit" value={form.deposit} onChange={e=>setForm({...form,deposit:e.target.value})}/>
        <select className={field+" sm:col-span-2"} value={form.staffUserId} onChange={e=>setForm({...form,staffUserId:e.target.value})}><option value="">Staff for commission (optional)</option>{staff.map(s=><option key={s.user_id} value={s.user_id}>{[s.first_name,s.last_name].filter(Boolean).join(" ")||s.email}</option>)}</select>
      </div>
      <button className={button+" mt-3"} disabled={busy} onClick={create}><Plus className="mr-1 inline h-4 w-4"/>Book</button>
      <div className="mt-5 border-t border-white/10 pt-4"><p className="mb-2 text-sm font-bold">Resources</p><div className="flex gap-2"><input className={field} placeholder="Resource name" value={resForm.name} onChange={e=>setResForm({...resForm,name:e.target.value})}/><select className={field+" w-32"} value={resForm.type} onChange={e=>setResForm({...resForm,type:e.target.value})}>{["staff","room","chair","bay","court","asset","table"].map(t=><option key={t} value={t}>{t}</option>)}</select><button className={button} disabled={!resForm.name} onClick={()=>act(async()=>{await request("/api/v1/company/booking/resources",{method:"POST",body:JSON.stringify(resForm)},companyId);setResForm({name:"",type:"staff"});loadRes();},"Resource added")}>Add</button></div><div className="mt-2 flex flex-wrap gap-2">{resources.map(r=><span key={r.id} className="rounded-full bg-white/5 px-3 py-1 text-xs">{r.name} <span className="text-slate-500">{r.type}</span> <button className="text-red-300" onClick={()=>{if(confirm(`Delete ${r.name}?`))act(()=>request(`/api/v1/company/booking/resources/${r.id}`,{method:"DELETE"},companyId),"Deleted").then(loadRes)}}>×</button></span>)}</div></div>
    </Panel>

    <Panel title="Schedule" subtitle="Confirm → Seat → Complete. Completing a booking books staff commission automatically.">
      <input className={field+" mb-3"} type="date" value={date} onChange={e=>setDate(e.target.value)}/>
      <div className="max-h-[22rem] space-y-2 overflow-auto">{bookings.length===0&&<p className="text-sm text-slate-500">No bookings for this day.</p>}{bookings.map(b=><div key={b.id} className="rounded-xl border border-white/10 bg-white/[.03] p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><b>{new Date(b.starts_at).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})} · {b.service||"Booking"}</b><p className="text-xs text-slate-400 truncate">{b.customer_name||"Walk-in"}{b.resource_name?` · ${b.resource_name}`:""}{b.staff_name?` · ${b.staff_name}`:""} · {Number(b.price).toLocaleString()}{Number(b.commission)>0?` · comm ${Number(b.commission).toLocaleString()}`:""}</p></div><span className={`text-xs ${BOOKING_STATUS[b.status]||"text-slate-400"}`}>{b.status}</span></div>{!["completed","cancelled","no_show"].includes(b.status)&&<div className="mt-2 flex flex-wrap gap-2 text-xs">{b.status==="booked"&&<button className="text-cyan-300" onClick={()=>act(()=>request(`/api/v1/company/booking/bookings/${b.id}`,{method:"PATCH",body:JSON.stringify({status:"confirmed"})},companyId),"Confirmed")}>Confirm</button>}<button className="text-amber-300" onClick={()=>act(()=>request(`/api/v1/company/booking/bookings/${b.id}`,{method:"PATCH",body:JSON.stringify({status:"seated"})},companyId),"Seated")}>Seat</button><button className="text-emerald-300" onClick={()=>act(()=>request(`/api/v1/company/booking/bookings/${b.id}`,{method:"PATCH",body:JSON.stringify({status:"completed"})},companyId),"Completed")}>Complete</button><button className="text-red-300" onClick={()=>act(()=>request(`/api/v1/company/booking/bookings/${b.id}`,{method:"PATCH",body:JSON.stringify({status:"cancelled"})},companyId),"Cancelled")}>Cancel</button><button className="text-slate-400" onClick={()=>act(()=>request(`/api/v1/company/booking/bookings/${b.id}`,{method:"PATCH",body:JSON.stringify({status:"no_show"})},companyId),"No-show")}>No-show</button></div>}</div>)}</div>
      {comms.length>0&&<div className="mt-4 border-t border-white/10 pt-3"><p className="mb-2 text-sm font-bold">Staff commission (this month)</p>{comms.map((c,i)=><div key={i} className="flex justify-between text-sm"><span>{c.staff_name}</span><span className="text-slate-400">{c.jobs} jobs · {Number(c.commission).toLocaleString()}</span></div>)}</div>}
    </Panel>
  </div>;
}

const TABLE_COLOR:Record<string,string> = { available:"border-emerald-400/50 bg-emerald-400/5", occupied:"border-amber-400/60 bg-amber-400/10", reserved:"border-cyan-400/50 bg-cyan-400/5" };
export function TablesPanel({companyId,onMsg}:{companyId:number;onMsg:(m:string)=>void}) {
  const [tables,setTables] = useState<Row[]>([]);
  const [products,setProducts] = useState<Row[]>([]);
  const [form,setForm] = useState({name:"",area:"",seats:"2"});
  const [open,setOpen] = useState<Row|null>(null);
  const [pay,setPay] = useState({method:"cash"});
  const [busy,setBusy] = useState(false);
  const load = () => { request("/api/v1/company/restaurant/tables",{},companyId).then(setTables).catch(()=>{}); request("/api/v1/company/pos/products",{},companyId).then(setProducts).catch(()=>{}); };
  useEffect(() => { load(); },[companyId]);
  const openTable = async (t:Row) => { setBusy(true); try { const tk = await request(`/api/v1/company/restaurant/tables/${t.id}/open`,{method:"POST",body:"{}"},companyId); await refreshDrawer(t.id); load(); } catch(e:any){onMsg(e.message);} finally{setBusy(false);} };
  const refreshDrawer = async (id:number) => { const d = await request(`/api/v1/company/restaurant/tables/${id}`,{},companyId); setOpen(d); };
  const addItem = async (productId:number) => { if(!open?.ticket) return; setBusy(true); try { await request(`/api/v1/company/pos/tickets/${open.ticket.id}/items`,{method:"POST",body:JSON.stringify({items:[{productId,qty:1}]})},companyId); await refreshDrawer(open.id); } catch(e:any){onMsg(e.message);} finally{setBusy(false);} };
  const settle = async () => { if(!open?.ticket) return; setBusy(true); try { const due = Number(open.ticket.total); await request(`/api/v1/company/pos/tickets/${open.ticket.id}/settle`,{method:"POST",body:JSON.stringify({payments:[{method:pay.method,amount:due}]})},companyId); onMsg(`Table ${open.name} settled (${due.toLocaleString()})`); setOpen(null); load(); } catch(e:any){onMsg(e.message);} finally{setBusy(false);} };
  const freeTable = async () => { if(!open) return; setBusy(true); try { await request(`/api/v1/company/restaurant/tables/${open.id}/close`,{method:"POST",body:"{}"},companyId); setOpen(null); load(); } catch(e:any){onMsg(e.message);} finally{setBusy(false);} };

  return <Panel title="Tables & floor plan" subtitle="Green = free, amber = occupied. Tap a table to open a tab, add items (they fire to the kitchen), then settle. Print each table's QR for self-ordering.">
    <div className="mb-4 flex flex-wrap gap-2"><input className={field+" w-32"} placeholder="Table name/no." value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input className={field+" w-28"} placeholder="Area" value={form.area} onChange={e=>setForm({...form,area:e.target.value})}/><input className={field+" w-20"} type="number" placeholder="Seats" value={form.seats} onChange={e=>setForm({...form,seats:e.target.value})}/><button className={button} disabled={busy||!form.name} onClick={async()=>{try{await request("/api/v1/company/restaurant/tables",{method:"POST",body:JSON.stringify(form)},companyId);setForm({name:"",area:"",seats:"2"});onMsg("Table added");load();}catch(e:any){onMsg(e.message);}}}><Plus className="mr-1 inline h-4 w-4"/>Add table</button></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{tables.length===0&&<p className="col-span-full text-sm text-slate-500">No tables yet.</p>}{tables.map(t=><button key={t.id} onClick={()=>refreshDrawer(t.id)} className={`rounded-2xl border p-4 text-left ${TABLE_COLOR[t.status]||"border-white/10 bg-white/[.03]"}`}><div className="flex items-center justify-between"><b className="text-lg">{t.name}</b><span className="text-[11px] uppercase text-slate-400">{t.status}</span></div><p className="mt-1 text-xs text-slate-400">{t.area||"—"} · {t.seats} seats</p>{t.current_ticket_id&&<p className="mt-2 text-sm text-amber-200">{Number(t.open_items||0)} item(s) · {Number(t.open_total||0).toLocaleString()}</p>}</button>)}</div>

    {open&&<div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={()=>setOpen(null)}><div className="absolute inset-0 bg-black/70"/><div className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-slate-900 p-5" onClick={e=>e.stopPropagation()}>
      <div className="flex items-center justify-between"><b className="text-lg">Table {open.name}</b><a className="text-xs text-cyan-300 underline" href={`/api/v1/company/restaurant/tables/${open.id}/qr`} target="_blank" rel="noreferrer">Print QR</a></div>
      {!open.ticket&&<button className={button+" mt-4"} disabled={busy} onClick={()=>openTable(open)}>Open tab for this table</button>}
      {open.ticket&&<>
        <p className="mt-1 text-xs text-slate-400">{open.ticket.orderNo} · {open.ticket.status}</p>
        <div className="mt-3 max-h-40 space-y-1 overflow-auto text-sm">{(open.ticket.items||[]).length===0&&<p className="text-slate-500">No items yet.</p>}{(open.ticket.items||[]).map((it:Row)=><div key={it.id} className="flex justify-between"><span>{it.qty}× {it.name} <span className="text-[10px] text-slate-500">{it.station}·{it.status}</span></span><span>{Number(it.lineTotal).toLocaleString()}</span></div>)}</div>
        <div className="mt-3 border-t border-white/10 pt-2"><Row2 l="Total" v={Number(open.ticket.total)} bold/></div>
        <p className="mt-3 text-xs text-slate-400">Add items:</p>
        <div className="mt-1 grid max-h-40 grid-cols-2 gap-2 overflow-auto sm:grid-cols-3">{products.filter(p=>p.active!==false).map(p=><button key={p.id} disabled={busy} onClick={()=>addItem(p.id)} className="rounded-lg border border-white/10 bg-white/[.03] p-2 text-left text-xs hover:border-cyan-400/50"><b className="block truncate">{p.name}</b><span className="text-cyan-300">{Number(p.price).toLocaleString()}</span></button>)}</div>
        <div className="mt-4 flex items-center gap-2"><select className={field+" w-32"} value={pay.method} onChange={e=>setPay({method:e.target.value})}>{["cash","card","qr","transfer","ewallet"].map(m=><option key={m} value={m}>{m}</option>)}</select><button className={button+" flex-1 justify-center"} disabled={busy||!(open.ticket.items||[]).length} onClick={settle}>Settle {Number(open.ticket.total).toLocaleString()}</button></div>
        <button className="mt-2 text-xs text-red-300" onClick={freeTable}>Free table without charge</button>
      </>}
      <button className="mt-3 text-sm text-slate-400" onClick={()=>setOpen(null)}>Close</button>
    </div></div>}
  </Panel>;
}

const KDS_NEXT:Record<string,string> = { new:"preparing", preparing:"ready", ready:"served" };
const KDS_LABEL:Record<string,string> = { new:"Start", preparing:"Ready", ready:"Serve" };
export function KdsPanel({companyId,onMsg}:{companyId:number;onMsg:(m:string)=>void}) {
  const [items,setItems] = useState<Row[]>([]);
  const [station,setStation] = useState("");
  const load = () => request(`/api/v1/company/restaurant/kds${station?`?station=${station}`:""}`,{},companyId).then(setItems).catch(()=>{});
  useEffect(()=>{ load(); const t=setInterval(load,4000); const es=new EventSource(`/api/v1/company/live?companyId=${companyId}`); es.addEventListener("change",load); return ()=>{clearInterval(t);es.close();}; },[companyId,station]);
  const advance = async (it:Row) => { const next=KDS_NEXT[it.status]; if(!next) return; try{ await request(`/api/v1/company/restaurant/kds/${it.id}`,{method:"PATCH",body:JSON.stringify({status:next})},companyId); load(); }catch(e:any){onMsg(e.message);} };
  const cols = ["new","preparing","ready"];
  return <Panel title="Kitchen display" subtitle="Live order queue. Tap a ticket to move it new → preparing → ready → served. Drinks route to Bar, desserts to Dessert.">
    <div className="mb-4 flex gap-2">{[["","All"],["kitchen","Kitchen"],["bar","Bar"],["dessert","Dessert"]].map(([k,label])=><button key={k} onClick={()=>setStation(k)} className={`rounded-full px-3 py-1.5 text-sm ${station===k?"bg-cyan-400 font-bold text-slate-950":"bg-white/5 text-slate-300"}`}>{label}</button>)}</div>
    <div className="grid gap-3 sm:grid-cols-3">{cols.map(col=><div key={col}><h3 className="mb-2 text-sm font-black uppercase tracking-wider text-slate-400">{col} <span className="text-slate-600">({items.filter(i=>i.status===col).length})</span></h3><div className="space-y-2">{items.filter(i=>i.status===col).map(it=><button key={it.id} onClick={()=>advance(it)} className={`w-full rounded-xl border p-3 text-left ${col==="new"?"border-red-400/40 bg-red-500/5":col==="preparing"?"border-amber-400/40 bg-amber-400/5":"border-emerald-400/40 bg-emerald-400/5"}`}><div className="flex justify-between"><b className="text-sm">{it.qty}× {it.name}</b><span className="text-[10px] uppercase text-slate-500">{it.station}</span></div><p className="mt-1 text-xs text-slate-400">{it.order_no}{it.table_number?` · T${it.table_number}`:""}</p><span className="mt-2 inline-block rounded bg-white/10 px-2 py-0.5 text-[11px]">{KDS_LABEL[it.status]||"Done"} →</span></button>)}{items.filter(i=>i.status===col).length===0&&<p className="text-xs text-slate-600">Empty</p>}</div></div>)}</div>
  </Panel>;
}
function Leaderboard({rows}:{rows:Row[]}) { return <div className="grid gap-3">{rows.length===0&&<p className="text-sm text-slate-500">No ranked staff yet.</p>}{rows.map(l=><div key={l.user_id} className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${l.redFlag?"border-red-500/60 bg-red-500/10":"border-white/10 bg-white/[.03]"}`}><div className="flex items-center gap-3"><span className="text-xl font-black">#{l.rank}</span><div><b>{l.name}</b><p className="text-xs text-slate-400">{l.position||"Staff"}</p></div></div><div className="flex gap-5 text-right"><div><b>{Number(l.weekly_sales).toLocaleString()}</b><p className="text-xs text-slate-500">weekly sales</p></div><div><b><Star className="inline h-4 w-4 fill-amber-400 text-amber-400"/> {Number(l.rating).toFixed(1)}</b><p className="text-xs text-slate-500">{l.review_count} reviews</p></div></div></div>)}</div> }
function OperationsPanel({settings,setSettings,onSave}:{settings:any;setSettings:(v:any)=>void;onSave:()=>void}) {
  const loyalty=settings.loyalty||{pointsSpendRp:1000,rewardsEnabled:true,tiers:[]}; const services=settings.services||{}; const booking=settings.booking||{areas:[]};
  const setL=(patch:any)=>setSettings({...settings,loyalty:{...loyalty,...patch}}); const setService=(key:string,value:boolean)=>setSettings({...settings,services:{...services,[key]:value}});
  const updateTier=(i:number,patch:any)=>setL({tiers:(loyalty.tiers||[]).map((t:any,n:number)=>n===i?{...t,...patch}:t)});
  const updateArea=(i:number,patch:any)=>setSettings({...settings,booking:{...booking,areas:(booking.areas||[]).map((a:any,n:number)=>n===i?{...a,...patch}:a)}});
  return <div className="grid gap-5 lg:grid-cols-2">
    <Panel title="Loyalty rules" subtitle="Points are awarded automatically at checkout. Every number now shows what it controls.">
      <label className="block text-xs text-slate-400">RP spending needed to earn 1 point<input className={field+" mt-1"} type="number" min="1" value={loyalty.pointsSpendRp||1000} onChange={e=>setL({pointsSpendRp:Math.max(1,Number(e.target.value)||1)})}/><span className="mt-1 block text-[11px] text-slate-500">Example: 1,000 means every RP 1,000 spent earns 1 point.</span></label>
      <label className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 p-3"><input type="checkbox" checked={loyalty.rewardsEnabled!==false} onChange={e=>setL({rewardsEnabled:e.target.checked})}/> Enable reward redemption</label>
      <p className="mt-1 text-[11px] text-slate-500">Turn this off to hide reward redemption from members.</p>
      <div className="mt-4 space-y-3">{(loyalty.tiers||[]).map((t:any,i:number)=><div key={i} className="rounded-xl border border-white/10 p-3">
        <p className="mb-3 text-xs font-black uppercase tracking-wider text-cyan-300">Tier {i + 1}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-400">Tier name<input className={field+" mt-1"} placeholder="Example: Silver" value={t.name||""} onChange={e=>updateTier(i,{name:e.target.value})}/></label>
          <label className="text-xs text-slate-400">Points required to reach tier<input className={field+" mt-1"} type="number" min="0" placeholder="Example: 500" value={t.minPoints||0} onChange={e=>updateTier(i,{minPoints:Math.max(0,Number(e.target.value)||0)})}/></label>
          <label className="text-xs text-slate-400">Member discount (%)<input className={field+" mt-1"} type="number" min="0" max="100" placeholder="Example: 2" value={t.discountPercent||0} onChange={e=>updateTier(i,{discountPercent:Math.max(0,Math.min(100,Number(e.target.value)||0))})}/><span className="mt-1 block text-[10px] text-slate-500">Enter 2 for 2%. Enter 0 for none.</span></label>
          <label className="text-xs text-slate-400">Store gift value (RP)<input className={field+" mt-1"} type="number" min="0" placeholder="Example: 50000" value={t.freeRp||0} onChange={e=>updateTier(i,{freeRp:Math.max(0,Number(e.target.value)||0)})}/><span className="mt-1 block text-[10px] text-slate-500">Enter 50,000 for an RP 50,000 gift.</span></label>
        </div>
        <label className="mt-3 block text-xs text-slate-400">Other tier benefits<input className={field+" mt-1"} placeholder="Example: Priority booking, birthday gift" value={(t.benefits||[]).join(", ")} onChange={e=>updateTier(i,{benefits:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)})}/><span className="mt-1 block text-[10px] text-slate-500">Separate multiple benefits with commas.</span></label>
        <p className="mt-3 rounded-lg bg-white/5 px-3 py-2 text-[11px] text-slate-400"><b>{t.name||`Tier ${i+1}`}</b>: starts at {Number(t.minPoints||0).toLocaleString()} points · {Number(t.discountPercent||0)}% discount · {Number(t.freeRp||0)>0?`${moneySymbol()} ${Number(t.freeRp).toLocaleString()} store gift`:"no store gift"}</p>
        <button className="mt-3 text-left text-xs text-red-300" onClick={()=>setL({tiers:loyalty.tiers.filter((_:any,n:number)=>n!==i)})}>Remove tier</button>
      </div>)}</div>
      <button className="mt-3 text-sm font-bold text-cyan-300" onClick={()=>setL({tiers:[...(loyalty.tiers||[]),{name:`Tier ${(loyalty.tiers||[]).length+1}`,minPoints:0,discountPercent:0,freeRp:0,benefits:[]}]})}>+ Add tier</button>
      <button className={button+" mt-4 w-full justify-center"} onClick={onSave}>Save loyalty settings</button>
    </Panel>
    <Panel title="AI channels and service switches" subtitle="Turn each company function on or off. WhatsApp and Telegram can be linked independently from the company app."><div className="grid gap-2 sm:grid-cols-2">{[["booking","Booking"],["faq","FAQ replies"],["songRequests","Song request"],["bottleKeep","Bottle keep"],["aiWhatsApp","AI WhatsApp"],["aiTelegram","AI Telegram"],["reminders","Automated reminders"],["retail","Retail mode"]].map(([key,label])=><label key={key} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.03] p-3"><input type="checkbox" checked={!!services[key]} onChange={e=>setService(key,e.target.checked)}/>{label}</label>)}</div><div className="mt-4 rounded-xl bg-cyan-400/5 p-4 text-sm text-slate-300"><b>Channel connection</b><p className="mt-1 text-xs text-slate-400">Company admins can open their company app, choose WhatsApp or Telegram, scan the displayed QR code, and then configure reminders, FAQ, booking, song requests and bottle keeping here.</p></div></Panel>
    <Panel title="Booking areas and floor plans" subtitle="Create rooms or areas, upload a floor-plan URL, list tables, and set operating times. WhatsApp booking uses the same company configuration."><div className="space-y-3">{(booking.areas||[]).map((a:any,i:number)=><div key={i} className="grid gap-2 rounded-xl border border-white/10 p-3 sm:grid-cols-2"><input className={field} placeholder="Area / room name" value={a.name||""} onChange={e=>updateArea(i,{name:e.target.value})}/><input className={field} placeholder="Level" value={a.level||""} onChange={e=>updateArea(i,{level:e.target.value})}/><input className={field+" sm:col-span-2"} placeholder="Floor plan image URL" value={a.imageUrl||""} onChange={e=>updateArea(i,{imageUrl:e.target.value})}/><input className={field+" sm:col-span-2"} placeholder="Tables / rooms, comma separated" value={(a.tables||[]).join(", ")} onChange={e=>updateArea(i,{tables:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)})}/><input className={field} type="time" value={a.openTime||"17:00"} onChange={e=>updateArea(i,{openTime:e.target.value})}/><input className={field} type="time" value={a.closeTime||"02:00"} onChange={e=>updateArea(i,{closeTime:e.target.value})}/><button className="text-left text-xs text-red-300" onClick={()=>setSettings({...settings,booking:{...booking,areas:booking.areas.filter((_:any,n:number)=>n!==i)}})}>Remove area</button></div>)}</div><button className="mt-3 text-sm font-bold text-cyan-300" onClick={()=>setSettings({...settings,booking:{...booking,areas:[...(booking.areas||[]),{name:"New area",level:"Ground",imageUrl:"",tables:[],openTime:"17:00",closeTime:"02:00"}]}})}>+ Add area or room</button></Panel>
    <Panel title="Website and app provisioning" subtitle="The selected merchant receives a tenant login URL while custom domain and store builds are prepared."><p className="rounded-xl bg-white/5 p-4 text-sm">Temporary tenant login: <a className="text-cyan-300 underline" href="/bridgexpos/login">BridgeXPOS merchant login</a></p><p className="mt-3 text-xs text-slate-400">Website, backend and app design use the same enabled modules and can follow the Reborn app layout as the starting template.</p><button className={button+" mt-5"} onClick={onSave}>Save all operation settings</button></Panel>
  </div>
}
