import { useState, useEffect, useRef } from "react";
import { tData, useTranslation, translations, localeTag, translate, getCurrentLanguage } from "@/lib/i18n";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RebornLayout } from "@/components/RebornLayout";
import { useToast } from "@/hooks/use-toast";
import { ToggleRight, Smartphone, Plus, Trash2, Check, X, Ticket, Receipt, Gift, Pill, Music2, Coins, Users as UsersIcon, Megaphone, ScrollText, Package, Calculator, Pencil, LayoutGrid, Disc3, HelpCircle, Settings as SettingsIcon, Send, ShoppingBag, Sparkles, Boxes, Contact, Download, Printer, MessageCircle, AlertTriangle, CalendarDays, Wine, Clock, LogIn, LogOut, CalendarClock, Plane, Star, QrCode, Gamepad2, RefreshCw, Languages, PawPrint, CalendarCheck } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import { useTenantBrand } from "@/hooks/useTenantBrand";
import { StaffGuideButton } from "@/components/StaffGuideButton";
import { PasswordInput } from "@/components/PasswordInput";
import { useAuth } from "@/hooks/useAuth";
import { useModules, moduleEnabled, ADMIN_TAB_MODULE } from "@/lib/modules";
import { APP_FEATURES } from "@/lib/features";
import { printClosingReport, printReceipt } from "@/lib/receipt";
import { money, moneySymbol, moneyStep, roundMoney, appMoney } from "@/lib/money";
import { AppSkinPicker } from "@/components/AppSkinPicker";
import { CUSTOM_PALETTE, type AppColours } from "@shared/appSkins";
import { applyAppSkin } from "@/lib/appSkin";
import { computeContributions, type PayrollRules, type CpfRules } from "@shared/payrollRules";
import { countryOf } from "@shared/countries";

// Tabs staff (sub-admin) can use; the rest are full-admin only
const STAFF_TABS = ["Overview", "Bookings", "Requests", "Redemptions", "Bottles", "Top-ups", "Pet", "Songs", "Games", "Events", "Staff", "Leaderboard", "Feedback", "POS"] as const;
// Managers: the staff tabs + Daily sales (today's total, close the day, every salesperson's target).
const MANAGER_TABS = [...STAFF_TABS.slice(0, -1), "Sales", "POS"] as const;
// Display text for a stored value (status, type…): its translation when a key exists, else the raw value.
const tv = (t: (k: string) => string, key: string, raw: any) => (translations[key] ? t(key) : String(raw ?? ""));
const tabKey = (tab: string) => "admin.tab." + tab.replace(/[^A-Za-z]/g, "");
const ADMIN_TABS = ["Overview", "Bookings", "Requests", "Redemptions", "Bottles", "Top-ups", "Pet", "Songs", "Games", "Events", "Broadcast", "CRM", "Users", "Staff", "Payroll", "Leaderboard", "Feedback", "Products", "Inventory", "Accounting", "Prizes", "Gifts", "FAQ", "Features", "Settings", "Logs", "Errors", "Sales", "POS"] as const;
type AdminRole = "admin" | "manager" | "staff" | "user";
const tabsFor = (role: AdminRole) => (role === "admin" ? ADMIN_TABS : role === "manager" ? MANAGER_TABS : STAFF_TABS) as readonly string[];
// The admin-panel view this account gets (manager = staff account with company role manager).
function useAdminRole(): AdminRole {
  const { user } = useAuth();
  const { data } = useQuery<{ role: AdminRole }>({ queryKey: ["/api/reborn/my-role"], queryFn: () => apiRequest("GET", "/api/reborn/my-role").then((r) => r.json()), enabled: !!user });
  return data?.role || ((user as any)?.role === "admin" ? "admin" : "staff");
}

export default function RebornAdmin() {
  const { user } = useAuth();
  // BridgeX has its own accounts; another company's admin has no shortcut into it.
  const { isWhiteLabel } = useTenantBrand();
  const isFullAdmin = (user as any)?.role === "admin";
  const role = useAdminRole();
  const modules = useModules();
  const ALL_TABS = tabsFor(role);
  const TABS = ALL_TABS.filter((t) => moduleEnabled(modules, ADMIN_TAB_MODULE[t]));
  // ?tab=Errors (from an error alert) opens that tab.
  const [tab, setTab] = useState<string>(() => { try { return new URLSearchParams(window.location.search).get("tab") || "Overview"; } catch { return "Overview"; } });
  const { t } = useTranslation();
  const go = (tb: string) => { if (tb === "POS") { window.location.href = "/pos"; return; } setTab(tb); };
  return (
    <RebornLayout active="/reborn-admin" title={t("admin.title")}>
      {isFullAdmin && !isWhiteLabel && <a href="/bridgex" className="mb-4 flex items-center justify-between rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-4 text-cyan-100"><span><b className="block">{t("admin.companySetup")}</b><span className="text-xs text-cyan-100/60">{t("admin.companySetupHint")}</span></span><span className="rounded-lg bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950">{t("admin.c.open")}</span></a>}
      <div className="flex gap-1 p-1 rounded-2xl bg-white/5 border border-white/10 mb-5 overflow-x-auto">
        {TABS.map((tb) => (
          <button key={tb} onClick={() => go(tb)} className={`flex-1 min-w-[92px] py-2 px-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors inline-flex items-center justify-center gap-1.5 ${tab === tb ? "text-black" : "text-white/60"}`} style={tab === tb ? { background: "linear-gradient(90deg,#c9a84c,#f0d787)" } : undefined}>{TAB_ICON[tb]}{t(tabKey(tb))}</button>
        ))}
      </div>
      {tab === "Overview" && <Overview onGo={go} />}
      {tab === "Bookings" && <AdminBookings />}
      {tab === "Bottles" && <AdminBottles />}
      {tab === "Pet" && <div className="space-y-6"><PetLook /><Codes /><Pills /></div>}
      {tab === "Sales" && (role === "admin" || role === "manager") && <DailySales />}
      {tab === "Prizes" && <Prizes />}
      {tab === "Redemptions" && <Redemptions />}
      {tab === "FAQ" && <Faq />}
      {tab === "Songs" && <Songs />}
      {tab === "Requests" && <SongRequests />}
      {tab === "Gifts" && <GiftTypes />}
      {tab === "Features" && <AppFeatures />}
      {tab === "Settings" && <Settings />}
      {tab === "Users" && <Members />}
      {tab === "Top-ups" && <TopUps />}
      {tab === "Events" && <Events />}
      {tab === "Broadcast" && <Broadcast />}
      {tab === "Products" && <Products />}
      {tab === "Inventory" && <Inventory />}
      {tab === "Accounting" && <Accounting />}
      {tab === "Games" && <GamesAdmin />}
      {tab === "Payroll" && <Payroll />}
      {tab === "Staff" && <StaffHr isAdmin={isFullAdmin} />}
      {tab === "Leaderboard" && <StaffLeaderboard />}
      {tab === "Feedback" && <CompanyFeedback />}
      {tab === "CRM" && <Crm />}
      {tab === "Logs" && <Logs />}
      {tab === "Errors" && <ErrorWatch canClear={isFullAdmin} />}
    </RebornLayout>
  );
}

// Admin › App features: switch each member feature on or off (saved straight away).
function AppFeatures() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data } = useQuery<{ disabled: string[] }>({ queryKey: ["/api/reborn/features"], queryFn: () => apiRequest("GET", "/api/reborn/features").then((r) => r.json()) });
  const off = new Set(data?.disabled || []);
  const save = useMutation({
    mutationFn: (disabled: string[]) => apiRequest("POST", "/api/reborn/admin/features", { disabled }).then((r) => r.json()),
    onMutate: (disabled) => { qc.setQueryData(["/api/reborn/features"], { disabled }); },
    onSuccess: (d: any) => { qc.setQueryData(["/api/reborn/features"], { disabled: d.disabled }); toast({ title: t("admin.feat.saved") }); },
    onError: (e: any) => { qc.invalidateQueries({ queryKey: ["/api/reborn/features"] }); toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }); },
  });
  const toggle = (key: string) => { const next = new Set(off); next.has(key) ? next.delete(key) : next.add(key); save.mutate(Array.from(next)); };
  const onCount = APP_FEATURES.length - APP_FEATURES.filter((f) => off.has(f.key)).length;
  return (
    <Card>
      <h3 className="font-bold mb-1 flex items-center gap-2"><ToggleRight className="w-4 h-4 text-amber-300" /> {t("admin.feat.title")}</h3>
      <p className="text-xs text-white/50 mb-1">{t("admin.feat.hint")}</p>
      <p className="text-xs text-amber-200/80 mb-3">{t("admin.feat.count", { n: onCount, total: APP_FEATURES.length })}</p>
      <div className="space-y-2">
        {APP_FEATURES.map((f) => {
          const on = !off.has(f.key);
          return (
            <button key={f.key} type="button" role="switch" aria-checked={on} onClick={() => toggle(f.key)} disabled={save.isPending}
              className={`w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${on ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/10 bg-black/30 opacity-70"}`}>
              <span className="text-2xl w-9 text-center shrink-0" aria-hidden>{f.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-white truncate">{t(f.label)}</span>
                <span className="block text-[11px] text-white/45 truncate">{t(f.desc)}</span>
              </span>
              <span className={`shrink-0 text-[11px] font-black uppercase tracking-wide ${on ? "text-emerald-300" : "text-white/40"}`}>{on ? t("admin.feat.on") : t("admin.feat.off")}</span>
              <span className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${on ? "bg-emerald-400" : "bg-white/15"}`}>
                <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: on ? 22 : 2 }} />
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function Broadcast() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const blank = { subject: "", body: "", channels: { inapp: true, email: true, whatsapp: false } };
  const [f, setF] = useState(blank);
  const send = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/broadcast", f).then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
    onSuccess: ({ ok, d }: any) => { if (!ok) { toast({ title: t("admin.c.failed"), description: d.message, variant: "destructive" }); return; } toast({ title: t("admin.bc.sent"), description: d.message }); setF(blank); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }),
  });
  const chosen = f.channels.inapp || f.channels.email || f.channels.whatsapp;
  return (
    <Card>
      <h3 className="font-bold mb-1 flex items-center gap-2"><Megaphone className="w-4 h-4 text-amber-300" /> {t("admin.bc.title")}</h3>
      <p className="text-xs text-white/50 mb-3">{t("admin.bc.hint")}</p>
      <input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder={t("admin.bc.subject")} className={inp + " w-full mb-2"} />
      <textarea value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder={t("admin.bc.message")} rows={5} className={inp + " w-full mb-3"} />
      <p className="text-[11px] text-white/45 mb-1.5">{t("admin.bc.via")}</p>
      <div className="mb-2" style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 96px), 1fr))" }}>
        {([["inapp", "💬", t("admin.bc.chChat")], ["email", "✉️", t("admin.bc.chEmail")], ["whatsapp", "🟢", t("admin.bc.chWa")]] as const).map(([v, ic, l]) => {
          const on = f.channels[v];
          return (
            <button key={v} type="button" aria-pressed={on} onClick={() => setF({ ...f, channels: { ...f.channels, [v]: !on } })}
              className={`py-2.5 px-1.5 rounded-xl border text-[13px] leading-tight font-semibold inline-flex items-center justify-center gap-1 ${on ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/10 bg-black/30 text-white/50"}`}>
              <span aria-hidden className="text-xs">{on ? "✅" : ic}</span>{l}
            </button>
          );
        })}
      </div>
      {f.channels.whatsapp && <p className="text-[11px] text-emerald-300/80 mb-3">{t("admin.bc.waHint")}</p>}
      <button onClick={() => { if (confirm(t("admin.bc.confirm"))) send.mutate(); }} disabled={send.isPending || !chosen || !f.subject.trim() || !f.body.trim()} className={btn + " mt-1 disabled:opacity-50"}>{send.isPending ? t("admin.c.sending") : t("admin.bc.send")}</button>
    </Card>
  );
}

const TAB_ICON: Record<string, JSX.Element> = {
  Overview: <LayoutGrid className="w-4 h-4" />, Requests: <Music2 className="w-4 h-4" />, Redemptions: <Gift className="w-4 h-4" />,
  "Top-ups": <Coins className="w-4 h-4" />, Pet: <PawPrint className="w-4 h-4" />, Sales: <Coins className="w-4 h-4" />, POS: <Receipt className="w-4 h-4" />,
  Songs: <Music2 className="w-4 h-4" />, Events: <Megaphone className="w-4 h-4" />, Broadcast: <Send className="w-4 h-4" />,
  Users: <UsersIcon className="w-4 h-4" />, Products: <Package className="w-4 h-4" />, Accounting: <Calculator className="w-4 h-4" />,
  Prizes: <Disc3 className="w-4 h-4" />, Gifts: <Sparkles className="w-4 h-4" />, FAQ: <HelpCircle className="w-4 h-4" />,
  Features: <ToggleRight className="w-4 h-4" />, Settings: <SettingsIcon className="w-4 h-4" />, Logs: <ScrollText className="w-4 h-4" />, Errors: <AlertTriangle className="w-4 h-4" />,
  Inventory: <Boxes className="w-4 h-4" />, CRM: <Contact className="w-4 h-4" />, Bookings: <CalendarDays className="w-4 h-4" />, Bottles: <Wine className="w-4 h-4" />,
  Staff: <Clock className="w-4 h-4" />, Payroll: <Calculator className="w-4 h-4" />, Leaderboard: <Sparkles className="w-4 h-4" />, Feedback: <MessageCircle className="w-4 h-4" />, Games: <Gamepad2 className="w-4 h-4" />,
};

// Each admin section's colour for its tile.
const TAB_COLOR: Record<string, string> = {
  Requests: "#a855f7", Redemptions: "#ec4899", "Top-ups": "#f59e0b", Pet: "#06b6d4", Sales: "#22c55e", POS: "#f59e0b", Songs: "#8b5cf6",
  Events: "#f97316", Broadcast: "#3b82f6", Users: "#22c55e", Products: "#14b8a6", Accounting: "#10b981", Prizes: "#eab308",
  Gifts: "#f472b6", FAQ: "#60a5fa", Settings: "#94a3b8", Logs: "#64748b", Errors: "#ef4444", Inventory: "#0ea5e9", CRM: "#6366f1",
  Bookings: "#f59e0b", Bottles: "#e11d48", Staff: "#84cc16", Payroll: "#059669", Leaderboard: "#facc15", Feedback: "#fb7185", Games: "#d946ef",
};

function Overview({ onGo }: { onGo: (tab: string) => void }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const isFullAdmin = (user as any)?.role === "admin";
  const role = useAdminRole();
  const { data: o } = useQuery<any>({ queryKey: ["/api/reborn/admin/overview"], queryFn: () => apiRequest("GET", "/api/reborn/admin/overview").then((r) => r.json()), refetchInterval: 15000 });
  const cards = [
    { tab: "Requests", label: t("admin.ov.songRequests"), count: o?.songRequests, hot: true },
    { tab: "Redemptions", label: t("admin.ov.redemptions"), count: o?.redemptions, hot: true },
    { tab: "Top-ups", label: t("admin.ov.topups"), count: o?.topups, hot: true },
    { tab: "Users", label: t("admin.ov.members"), count: o?.users, admin: true },
    { tab: "Products", label: t("admin.ov.products"), count: o?.products, admin: true },
    { tab: "Products", label: t("admin.ov.lowStock"), count: o?.lowStock, warn: true, admin: true },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        {cards.filter((c) => !c.admin || isFullAdmin).map((c, i) => {
          const live = (c.hot || c.warn) && c.count > 0;
          const col = c.warn ? (c.count > 0 ? "#ef4444" : "#64748b") : TAB_COLOR[c.tab];
          return (
            <button key={i} onClick={() => onGo(c.tab)} className={`stat-tile ${live ? "stat-hot" : ""}`} style={{ ["--c" as any]: col }}>
              <span className="ic">{TAB_ICON[c.tab]}</span>
              <div className="flex items-start justify-between gap-1">
                <span className="num">{c.count ?? "—"}</span>
                {c.hot && c.count > 0 && <span className="text-[10px] font-black text-black bg-amber-300 px-1.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(252,211,77,.6)]">{t("admin.ov.pending", { n: c.count })}</span>}
              </div>
              <p className="lbl">{c.label}</p>
            </button>
          );
        })}
      </div>
      <StaffGuideButton />
      <h2 className="arc-head">{t("admin.ov.openSection")}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {tabsFor(role).filter((tb) => tb !== "Overview").map((tb, i) => (
          <button key={tb} onClick={() => onGo(tb)} className="feat-tile" style={{ ["--c" as any]: TAB_COLOR[tb] || "#c9a84c", ["--d" as any]: `${(i % 6) * 0.8}s` }}>
            <span className="feat-badge">{TAB_ICON[tb]}</span>
            <span className="feat-title">{t(tabKey(tb))}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Members() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "admin">("all");
  const [sort, setSort] = useState<"recent" | "tokens">("recent");
  const key = ["/api/reborn/admin/users", q, filter, sort];
  const { data, refetch } = useQuery<any>({ queryKey: key, queryFn: () => apiRequest("GET", `/api/reborn/admin/users?q=${encodeURIComponent(q)}&filter=${filter}&sort=${sort}`).then((r) => r.json()) });
  const users: any[] = data?.users || [];
  const summary = data?.summary;
  const { user } = useAuth();
  const isFullAdmin = (user as any)?.role === "admin";
  const { data: positions = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/staff-positions"], queryFn: () => apiRequest("GET", "/api/reborn/admin/staff-positions").then((r) => r.json()), enabled: isFullAdmin });
  const save = useMutation({ mutationFn: (u: any) => apiRequest("POST", `/api/reborn/admin/users/${u.id}`, u).then((r) => r.json()), onSuccess: () => { toast({ title: t("admin.m.updated") }); refetch(); }, onError: (e: any) => toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }) });
  const del = useMutation({ mutationFn: (id: string) => apiRequest("DELETE", `/api/reborn/admin/users/${id}`, {}).then((r) => r.json()), onSuccess: (d: any) => { toast({ title: d.message || t("admin.c.deleted") }); refetch(); }, onError: (e: any) => toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }) });
  const reset = useMutation({
    mutationFn: (password: string) => apiRequest("POST", "/api/reborn/admin/reset-numbers", { password }).then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
    onSuccess: ({ ok, d }: any) => { if (!ok) { toast({ title: t("admin.c.failed"), description: d.message, variant: "destructive" }); return; } toast({ title: d.message }); refetch(); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }),
  });
  return (
    <div>
      {summary && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 text-center"><p className="text-[11px] text-white/50">{t("admin.m.users")}</p><p className="font-extrabold">{summary.totalUsers}</p></div>
          <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 p-2.5 text-center"><p className="text-[11px] text-white/50">{t("admin.m.totalTokens")}</p><p className="font-extrabold text-amber-300">{summary.totalTokens}</p></div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 text-center"><p className="text-[11px] text-white/50">{t("admin.m.totalPoints")}</p><p className="font-extrabold">{summary.totalPoints}</p></div>
        </div>
      )}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.m.search")} className={inp + " w-full mb-2"} />
      <div className="flex flex-wrap gap-2 mb-3">
        {(["all", "active", "admin"] as const).map((f) => <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${filter === f ? "bg-amber-400 text-black" : "bg-white/5 text-white/60"}`}>{t("admin.m.filter." + f)}</button>)}
        <button onClick={() => setSort(sort === "tokens" ? "recent" : "tokens")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${sort === "tokens" ? "bg-amber-400 text-black" : "bg-white/5 text-white/60"}`}>{t("admin.m.sort", { s: sort === "tokens" ? t("admin.m.sortTokens") : t("admin.m.sortRecent") })}</button>
      </div>
      {!isFullAdmin && <p className="text-xs text-white/40 mb-3">{t("admin.m.onlyAdmins")}</p>}
      <div className="space-y-3">{users.map((u) => <MemberRow key={u.id} u={u} positions={positions} editable={isFullAdmin} onSave={save.mutate} onDelete={(id: string) => { if (confirm(t("admin.m.confirmDelete", { name: u.firstName || u.username || u.email }))) del.mutate(id); }} />)}</div>
      {isFullAdmin && (
        <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-500/5 p-4">
          <h3 className="font-bold text-sm text-red-200 mb-1">{t("admin.m.resetTitle")}</h3>
          <p className="text-[11px] text-white/50 mb-2">{t("admin.m.resetHint")}</p>
          <button onClick={() => { const p = prompt(t("admin.m.resetPrompt")); if (p) reset.mutate(p); }} disabled={reset.isPending} className={btnDel}>{t("admin.m.resetBtn")}</button>
        </div>
      )}
    </div>
  );
}
function MemberRow({ u, positions = [], editable, onSave, onDelete }: any) {
  const [e, setE] = useState(() => (u.role === "staff" && u.member_role === "manager" ? { ...u, role: "manager" } : u)); // manager shows as its own role
  const { t } = useTranslation();
  return (
    <Card>
      <p className="font-semibold text-sm">{u.firstName || u.username || t("admin.c.member")} <span className="text-white/40">· {u.email}</span></p>
      <p className="text-[11px] text-white/40 mb-2">{t("admin.c.idLabel", { id: u.id })}</p>
      {editable ? (
        <>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <label className="text-xs text-white/50">{t("admin.m.firstName")}<input value={e.firstName || ""} onChange={(x) => setE({ ...e, firstName: x.target.value })} className={inp + " w-full"} /></label>
            <label className="text-xs text-white/50">{t("admin.m.lastName")}<input value={e.lastName || ""} onChange={(x) => setE({ ...e, lastName: x.target.value })} className={inp + " w-full"} /></label>
            <label className="text-xs text-white/50 col-span-2">{t("admin.c.email")}<input value={e.email || ""} onChange={(x) => setE({ ...e, email: x.target.value })} className={inp + " w-full"} /></label>
            <label className="text-xs text-white/50 col-span-2">{t("admin.m.username")}<input value={e.username || ""} onChange={(x) => setE({ ...e, username: x.target.value })} className={inp + " w-full"} /></label>
            <label className="text-xs text-white/50 col-span-2">{t("admin.m.cardNo")}<input value={e.membershipCardNumber || ""} onChange={(x) => setE({ ...e, membershipCardNumber: x.target.value })} placeholder={t("admin.m.cardNoPh")} className={inp + " w-full"} /></label>
            <div className="col-span-2"><span className="text-xs text-white/50">{t("admin.m.resetPw")}</span><PasswordInput value={e.password || ""} onChange={(v) => setE({ ...e, password: v })} placeholder={t("admin.m.newPw")} className={inp + " w-full"} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-white/50">{t("admin.m.credits")}<input type="number" value={e.credits} onChange={(x) => setE({ ...e, credits: x.target.value })} className={inp + " w-full"} /></label>
            <label className="text-xs text-white/50">{t("admin.m.points")}<input type="number" value={e.loyaltyPoints} onChange={(x) => setE({ ...e, loyaltyPoints: Number(x.target.value) })} className={inp + " w-full"} /></label>
            <label className="text-xs text-white/50">{t("admin.m.tokens")}<input type="number" value={e.tokens} onChange={(x) => setE({ ...e, tokens: Number(x.target.value) })} className={inp + " w-full"} /></label>
            <label className="text-xs text-white/50">KGOLD<input type="number" value={e.kgold} onChange={(x) => setE({ ...e, kgold: Number(x.target.value) })} className={inp + " w-full"} /></label>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <label className="text-xs text-white/50">{t("admin.m.role")}
              <select value={e.role === "staff" && e.member_role === "manager" ? "manager" : e.role || "user"} onChange={(x) => setE({ ...e, role: x.target.value, member_role: x.target.value })} className={inp + " ml-1"}>
                <option value="user">{t("admin.role.user")}</option><option value="staff">{t("admin.role.staffSub")}</option><option value="manager">{t("admin.role.managerSub")}</option><option value="admin">{t("admin.role.admin")}</option>
              </select>
            </label>
            {(e.role === "staff" || e.role === "manager" || e.role === "admin") && <label className="text-xs text-white/50">{t("admin.m.position")}
              <select value={e.position_id || ""} onChange={(x) => setE({ ...e, positionId: x.target.value, position_id: x.target.value })} className={inp + " ml-1"}>
                <option value="">{t("admin.m.selectPosition")}</option>{positions.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>}
            <button onClick={() => onSave(e)} className={btn + " ml-auto"}>{t("admin.c.save")}</button>
            {onDelete && <button onClick={() => onDelete(u.id)} className={btnDel}><Trash2 className="w-4 h-4" /></button>}
          </div>
        </>
      ) : (
        <p className="text-xs text-white/60">{t("admin.m.summaryLine", { credits: u.credits, points: u.loyaltyPoints, tokens: u.tokens, kgold: u.kgold })} · <b>{u.role === "staff" && u.member_role === "manager" ? t("admin.role.manager") : tv(t, "admin.role." + u.role, u.role)}</b></p>
      )}
    </Card>
  );
}

function TopUps() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { data: rows = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/topups"], queryFn: () => apiRequest("GET", "/api/reborn/admin/topups").then((r) => r.json()), refetchInterval: 15000 });
  const act = useMutation({ mutationFn: ({ id, approve }: any) => apiRequest("POST", `/api/reborn/admin/topups/${id}`, { approve }), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/reborn/admin/topups"] }) });
  if (rows.length === 0) return <Empty text={t("admin.tu.empty")} />;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <Card key={r.id}>
          <div className="flex items-center gap-3">
            <Coins className="w-5 h-5 text-amber-300" />
            <div className="flex-1 min-w-0"><p className="font-semibold text-sm">{moneySymbol()} {Number(r.amount).toLocaleString()}</p><p className="text-xs text-white/40 truncate">{r.paymentMethod} · {t("admin.c.userShort", { id: r.userId?.slice(0, 8) })} · {new Date(r.createdAt).toLocaleString(localeTag())}</p></div>
            <button onClick={() => act.mutate({ id: r.id, approve: true })} className={btnSave}><Check className="w-4 h-4" /> {t("admin.c.approve")}</button>
            <button onClick={() => act.mutate({ id: r.id, approve: false })} className={btnDel}><X className="w-4 h-4" /></button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Events() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { data: rows = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/events"], queryFn: () => apiRequest("GET", "/api/reborn/admin/events").then((r) => r.json()) });
  const inv = () => qc.invalidateQueries({ queryKey: ["/api/reborn/admin/events"] });
  const add = useMutation({ mutationFn: () => apiRequest("POST", "/api/reborn/admin/events", { title: t("admin.ev.newTitle"), body: "" }).then((r) => r.json()), onSuccess: inv });
  const save = useMutation({ mutationFn: (ev: any) => apiRequest("PUT", `/api/reborn/admin/events/${ev.id}`, ev).then((r) => r.json()), onSuccess: inv });
  const del = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/reborn/admin/events/${id}`), onSuccess: inv });
  return (
    <div>
      <button onClick={() => add.mutate()} className={btn + " mb-4"}><Plus className="w-4 h-4" /> {t("admin.ev.post")}</button>
      <div className="space-y-3">{rows.map((ev) => <EventRow key={ev.id} ev={ev} onSave={save.mutate} onDelete={del.mutate} />)}</div>
    </div>
  );
}
function EventRow({ ev, onSave, onDelete }: any) {
  const [e, setE] = useState(ev);
  const { t } = useTranslation();
  return (
    <Card>
      <input value={e.title} onChange={(x) => setE({ ...e, title: x.target.value })} placeholder={t("admin.ev.title")} className={inp + " w-full mb-2"} />
      <textarea value={e.body || ""} onChange={(x) => setE({ ...e, body: x.target.value })} placeholder={t("admin.ev.details")} rows={2} className={inp + " w-full mb-2"} />
      <div className="grid grid-cols-2 gap-2 mb-1">
        <label className="text-[11px] text-white/50">{t("admin.ev.startDate")}<input type="date" value={e.startDate || ""} onChange={(x) => setE({ ...e, startDate: x.target.value })} className={inp + " w-full"} style={{ colorScheme: "dark" }} /></label>
        <label className="text-[11px] text-white/50">{t("admin.ev.endDate")}<input type="date" value={e.endDate || ""} min={e.startDate || undefined} onChange={(x) => setE({ ...e, endDate: x.target.value })} className={inp + " w-full"} style={{ colorScheme: "dark" }} /></label>
      </div>
      <p className="text-[10px] text-white/35 mb-2">{t("admin.ev.dateHint")}</p>
      <div className="mb-2"><p className="text-xs text-white/50 mb-1">{t("admin.ev.image")}</p><ImageUpload value={e.imageUrl} onChange={(v) => setE({ ...e, imageUrl: v })} label={t("admin.c.uploadImage")} output="jpeg" maxDim={2000} quality={0.92} /></div>
      <p className="text-[10px] text-white/35 -mt-1 mb-2">{t("admin.ev.imageHint")}</p>
      <div className="flex items-center gap-3">
        <label className="text-xs text-white/50 flex items-center gap-1"><input type="checkbox" checked={e.active} onChange={(x) => setE({ ...e, active: x.target.checked })} /> {t("admin.c.active")}</label>
        <label className="text-xs text-white/50 flex items-center gap-1"><input type="checkbox" checked={e.showOnLogin} onChange={(x) => setE({ ...e, showOnLogin: x.target.checked })} /> {t("admin.ev.showLogin")}</label>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={() => onSave(e)} className={btnSave + " flex-1 justify-center"}><Check className="w-4 h-4" /> {t("admin.c.save")}</button>
        <button onClick={() => onDelete(ev.id)} className={btnDel}><Trash2 className="w-4 h-4" /> {t("admin.c.delete")}</button>
      </div>
    </Card>
  );
}

function Logs() {
  const { t } = useTranslation();
  const { data: rows = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/logs"], queryFn: () => apiRequest("GET", "/api/reborn/admin/logs").then((r) => r.json()), refetchInterval: 20000 });
  if (rows.length === 0) return <Empty text={t("admin.log.empty")} />;
  return (
    <div className="space-y-1.5">
      {rows.map((l) => (
        <div key={l.id} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs">
          <div className="flex justify-between"><span className="font-semibold">{l.description}</span><span className="text-white/30">{new Date(l.createdAt).toLocaleString(localeTag())}</span></div>
          <span className="text-white/40">{l.action} · {l.entityType} · {t("admin.log.by")} <span className="text-amber-300/80">{l.adminName || l.adminUserId?.slice(0, 8)}</span></span>
        </div>
      ))}
    </div>
  );
}

// Admin › Errors: the error watcher (failed song requests, bookings, POS, orders, check-ins, WhatsApp).
const ERROR_AREAS = ["song", "booking", "pos", "order", "checkin", "whatsapp", "server"];
function ErrorWatch({ canClear }: { canClear: boolean }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [area, setArea] = useState("");
  const [days, setDays] = useState(7);
  const [open, setOpen] = useState<number | null>(null);
  const url = `/api/reborn/admin/errors?days=${days}${area ? `&area=${area}` : ""}`;
  const { data } = useQuery<any>({ queryKey: [url], queryFn: () => apiRequest("GET", url).then((r) => r.json()), refetchInterval: 20000 });
  const rows: any[] = data?.rows || [];
  const counts = new Map<string, any>((data?.counts || []).map((c: any) => [c.area, c]));
  const total = Array.from(counts.values()).reduce((n, c: any) => n + c.n, 0);
  const clear = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/reborn/admin/errors${area ? `?area=${area}` : ""}`).then((r) => r.json()),
    onSuccess: (d: any) => { toast({ title: d.message }); qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/reborn/admin/errors") }); },
  });
  const chip = (on: boolean) => `px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap ${on ? "bg-red-500/20 border-red-400/60 text-red-100" : "bg-white/5 border-white/10 text-white/60"}`;
  return (
    <div>
      <h3 className="font-bold flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-400" /> {t("admin.err.title")}</h3>
      <p className="text-xs text-white/50 mt-1 mb-3">{t("admin.err.hint")}</p>
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2">
        <button onClick={() => setArea("")} className={chip(!area)}>{t("admin.err.all")} · {total}</button>
        {ERROR_AREAS.map((a) => { const c = counts.get(a); return (
          <button key={a} onClick={() => setArea(a)} className={chip(area === a)}>{t(`admin.err.area.${a}`)} · {c?.n || 0}{c?.today ? <span className="ml-1 text-red-300">({t("admin.err.today", { n: c.today })})</span> : null}</button>
        ); })}
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {[1, 7, 30].map((d) => <button key={d} onClick={() => setDays(d)} className={chip(days === d)}>{t("admin.err.days", { n: d })}</button>)}
        {canClear && rows.length > 0 && <button onClick={() => { if (confirm(t("admin.err.clearConfirm"))) clear.mutate(); }} className="ml-auto px-3 py-1.5 rounded-full text-xs font-semibold border border-white/10 text-white/60 inline-flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> {t("admin.err.clear")}</button>}
      </div>
      {rows.length === 0 ? <Empty text={t("admin.err.empty")} /> : (
        <div className="space-y-1.5">
          {rows.map((e) => (
            <button key={e.id} onClick={() => setOpen(open === e.id ? null : e.id)} className="block w-full text-left px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs">
              <div className="flex items-start gap-2">
                <span className={`shrink-0 px-1.5 py-0.5 rounded font-bold ${e.status >= 500 || e.status === 0 ? "bg-red-500/30 text-red-100" : "bg-amber-400/20 text-amber-100"}`}>{e.status || "!"}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-white/90 break-words">{e.message}</span>
                  <span className="block text-white/40 truncate">{t(`admin.err.area.${e.area}`)} · {e.method} {e.path}{e.source === "client" ? ` · ${t("admin.err.network")}` : ""}</span>
                  {(e.userName || e.userId) && <span className="block text-amber-300/80">{t("admin.err.by", { name: e.userName || e.userId })}</span>}
                </span>
                <span className="shrink-0 text-white/30">{new Date(e.createdAt).toLocaleString(localeTag(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              {open === e.id && e.detail && <pre className="mt-2 p-2 rounded-lg bg-black/40 text-[10px] text-white/60 whitespace-pre-wrap break-all">{e.detail.startsWith("{") ? t("admin.err.sent", { body: e.detail }) : e.detail}</pre>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GiftTypes() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { data: rows = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/gifttypes"], queryFn: () => apiRequest("GET", "/api/reborn/admin/gifttypes").then((r) => r.json()) });
  const inv = () => qc.invalidateQueries({ queryKey: ["/api/reborn/admin/gifttypes"] });
  const add = useMutation({ mutationFn: () => apiRequest("POST", "/api/reborn/admin/gifttypes", { name: t("admin.gift.newName"), emoji: "🎁", kgoldCost: 1000 }).then((r) => r.json()), onSuccess: () => { toast({ title: t("admin.gift.added") }); inv(); } });
  const save = useMutation({ mutationFn: (g: any) => apiRequest("PUT", `/api/reborn/admin/gifttypes/${g.id}`, g).then((r) => r.json()), onSuccess: () => { toast({ title: t("admin.gift.saved") }); inv(); }, onError: (e: any) => toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }) });
  const del = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/reborn/admin/gifttypes/${id}`), onSuccess: () => { toast({ title: t("admin.gift.deleted") }); inv(); } });
  return (
    <div>
      <button onClick={() => add.mutate()} className={btn + " mb-4"}><Plus className="w-4 h-4" /> {t("admin.gift.add")}</button>
      <div className="space-y-3">{rows.map((g) => <GiftRow key={g.id} g={g} onSave={save.mutate} onDelete={del.mutate} />)}</div>
      <p className="text-xs text-white/40 mt-3">{t("admin.gift.hint")}</p>
    </div>
  );
}
// Game names are translated via admin.game.<key>.
const GAME_META: Record<string, { emoji: string }> = {
  rps: { emoji: "✊" },
  tap: { emoji: "⛏️" },
  cards: { emoji: "🃏" },
  poker3: { emoji: "🂡" },
  frog: { emoji: "🐸" },
  rlgl: { emoji: "🚦" },
  memory: { emoji: "🧠" },
  bridge: { emoji: "🌉" },
  draw: { emoji: "🎨" },
  dice: { emoji: "🎲" },
  wheel: { emoji: "🎡" },
  riding: { emoji: "👵" },
  timer: { emoji: "⏱️" },
  "789": { emoji: "🎯" },
  stack: { emoji: "🧱" },
  number: { emoji: "🔢" },
  inbetween: { emoji: "🎴" },
  updown: { emoji: "↕️" },
  uno: { emoji: "💥" },
  sixcup: { emoji: "🥤" },
};
const WDAYS = ["1", "2", "3", "4", "5", "6", "0"];
function GamesAdmin() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data } = useQuery<any>({ queryKey: ["/api/reborn/games/config"], queryFn: () => apiRequest("GET", "/api/reborn/games/config").then((r) => r.json()) });
  const [cfg, setCfg] = useState<any>(null);
  const [catCfg, setCatCfg] = useState<any>(null);
  const cur = cfg || data?.config;
  const curCat = catCfg || data?.categories;
  const catOrder: string[] = data?.categoryOrder || [];
  const save = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/games/config", { config: cur, categories: curCat }).then((r) => r.json()),
    onSuccess: () => { toast({ title: t("admin.games.saved") }); qc.invalidateQueries({ queryKey: ["/api/reborn/games/config"] }); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }),
  });
  if (!cur) return <Empty text={t("admin.c.loading")} />;
  const setGame = (k: string, patch: any) => setCfg({ ...cur, [k]: { ...cur[k], ...patch } });
  const toggleDay = (k: string, d: number) => {
    const days: number[] = cur[k]?.days || [];
    setGame(k, { days: days.includes(d) ? days.filter((x) => x !== d) : [...days, d] });
  };
  const toggleCatDay = (c: string, d: number) => {
    const base = curCat || {};
    const days: number[] = base[c]?.days || [];
    setCatCfg({ ...base, [c]: { days: days.includes(d) ? days.filter((x) => x !== d) : [...days, d] } });
  };
  return (
    <div className="space-y-3">
      <Card>
        <h3 className="font-bold text-sm flex items-center gap-2"><Gamepad2 className="w-4 h-4 text-amber-300" /> {t("admin.games.title")}</h3>
        <p className="text-[11px] text-white/50 mt-1">{t("admin.games.hint")}</p>
      </Card>
      {catOrder.length > 0 && (
        <Card>
          <p className="font-bold text-sm mb-1">{t("admin.games.catTitle")}</p>
          <p className="text-[11px] text-white/50 mb-3">{t("admin.games.catHint")}</p>
          {catOrder.map((c) => (
            <div key={c} className="py-2 border-b border-white/5 last:border-0">
              <p className="text-sm font-semibold mb-1.5">{tv(t, "admin.gcat." + c.toLowerCase().replace(/[^a-z0-9]/g, ""), c)}</p>
              <div className="flex flex-wrap gap-1.5">
                {WDAYS.map((d) => {
                  const on = ((curCat?.[c]?.days) || []).includes(Number(d));
                  return <button key={d} onClick={() => toggleCatDay(c, Number(d))} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${on ? "bg-amber-400 text-black" : "bg-white/5 text-white/50"}`}>{t("admin.wd." + d)}</button>;
                })}
              </div>
            </div>
          ))}
        </Card>
      )}
      {Object.keys(GAME_META).map((k) => (
        <Card key={k}>
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold">{GAME_META[k].emoji} {t("admin.game." + k)}</p>
            <label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={cur[k]?.enabled !== false} onChange={(e) => setGame(k, { enabled: e.target.checked })} /> {cur[k]?.enabled !== false ? t("admin.c.on") : t("admin.c.off")}</label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {WDAYS.map((d) => {
              const on = (cur[k]?.days || []).includes(Number(d));
              return <button key={d} onClick={() => toggleDay(k, Number(d))} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${on ? "bg-amber-400 text-black" : "bg-white/5 text-white/50"}`}>{t("admin.wd." + d)}</button>;
            })}
          </div>
          {k === "number" && (
            <label className="mt-3 block text-xs text-white/50">{t("admin.games.guesses")} <span className="text-white/30">{t("admin.games.unlimited")}</span>
              <input type="number" inputMode="numeric" min={0} value={cur.number?.dailyLimit ?? 0} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setGame("number", { dailyLimit: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} className={inp + " w-full mt-1"} />
            </label>
          )}
        </Card>
      ))}
      <button onClick={() => save.mutate()} className={btn}>{t("admin.games.save")}</button>
      <RankAdmin />
    </div>
  );
}
function RankAdmin() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data } = useQuery<any>({ queryKey: ["/api/reborn/rank/config"], queryFn: () => apiRequest("GET", "/api/reborn/rank/config").then((r) => r.json()) });
  const [cfg, setCfg] = useState<any>(null);
  const cur = cfg || data;
  const save = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/rank/config", { seasonStarDrop: cur.seasonStarDrop, tiers: cur.tiers }).then((r) => r.json()),
    onSuccess: () => { toast({ title: t("admin.rank.saved") }); qc.invalidateQueries({ queryKey: ["/api/reborn/rank/config"] }); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }),
  });
  const newSeason = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/rank/new-season", {}).then((r) => r.json()),
    onSuccess: (d: any) => { toast({ title: t("admin.rank.seasonStarted", { n: d.season }), description: t("admin.rank.dropped", { n: d.dropped }) }); qc.invalidateQueries({ queryKey: ["/api/reborn/rank/config"] }); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }),
  });
  if (!cur) return null;
  const setTier = (i: number, patch: any) => setCfg({ ...cur, tiers: cur.tiers.map((t: any, j: number) => (j === i ? { ...t, ...patch } : t)) });
  const addTier = () => setCfg({ ...cur, tiers: [...cur.tiers, { name: t("admin.rank.newTier"), perDiv: 6 }] });
  const delTier = (i: number) => setCfg({ ...cur, tiers: cur.tiers.filter((_: any, j: number) => j !== i) });
  return (
    <>
      <Card>
        <h3 className="font-bold text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-300" /> {t("admin.rank.title")} <span className="text-white/40 text-xs">{t("admin.rank.season", { n: cur.season })}</span></h3>
        <p className="text-[11px] text-white/50 mt-1 mb-2">{t("admin.rank.hint")}</p>
        <Field label={t("admin.rank.drop")} value={cur.seasonStarDrop} onChange={(v: any) => setCfg({ ...cur, seasonStarDrop: Math.max(0, Number(v) || 0) })} />
        <p className="text-xs text-white/60 mb-1 mt-2">{t("admin.rank.tiers")}</p>
        <div className="space-y-2">
          {cur.tiers.map((tier: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-white/30 text-xs w-4 shrink-0">{i + 1}</span>
              <input value={tier.name} onChange={(e) => setTier(i, { name: e.target.value })} className={inp + " flex-1 min-w-0"} />
              <input type="number" value={tier.perDiv || ""} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setTier(i, { perDiv: Math.max(1, Number(e.target.value) || 1) })} className={inp + " w-14 shrink-0"} title={t("admin.rank.perDiv")} />
              <button onClick={() => delTier(i)} className={btnSm + " shrink-0"}><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <button onClick={addTier} className="mt-2 text-xs text-amber-300 font-semibold">{t("admin.rank.addTier")}</button>
        <div className="mt-3 flex gap-2">
          <button onClick={() => save.mutate()} className={btn + " flex-1 justify-center"}>{t("admin.rank.saveLadder")}</button>
        </div>
      </Card>
      <Card>
        <h3 className="font-bold text-sm text-red-200">{t("admin.rank.newSeasonTitle")}</h3>
        <p className="text-[11px] text-white/50 mt-1 mb-2">{t("admin.rank.newSeasonHint", { n: cur.seasonStarDrop })}</p>
        <button onClick={() => { if (confirm(t("admin.rank.newSeasonConfirm", { n: cur.seasonStarDrop }))) newSeason.mutate(); }} disabled={newSeason.isPending} className={btnDel}>{t("admin.rank.newSeasonBtn")}</button>
      </Card>
    </>
  );
}
function GiftRow({ g, onSave, onDelete }: any) {
  const [e, setE] = useState(g);
  const { t } = useTranslation();
  return (
    <Card>
      <div className="flex gap-2 items-center mb-2">
        <input value={e.emoji || ""} onChange={(x) => setE({ ...e, emoji: x.target.value })} className={inp + " w-14 text-center"} />
        <input value={e.name} onChange={(x) => setE({ ...e, name: x.target.value })} placeholder={t("admin.gift.name")} className={inp + " flex-1"} />
      </div>
      <div className="mb-2"><p className="text-xs text-white/50 mb-1">{t("admin.gift.image")}</p><ImageUpload value={e.imageUrl} onChange={(v) => setE({ ...e, imageUrl: v })} label={t("admin.c.uploadImage")} /></div>
      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-xs text-white/50">KGOLD<input type="number" inputMode="numeric" value={e.kgoldCost || ""} onFocus={(x) => x.currentTarget.select()} onChange={(x) => setE({ ...e, kgoldCost: Number(x.target.value) })} className={inp + " w-24 ml-1"} /></label>
        <select value={e.animation} onChange={(x) => setE({ ...e, animation: x.target.value })} className={inp}>{["pop", "float", "zoom", "rain", "car", "fireworks", "crown", "diamonds", "kiss", "thumbsup", "lion", "whale", "rocket"].map((a) => <option key={a} value={a}>{t("admin.anim." + a)}</option>)}</select>
        <label className="text-xs text-white/50 flex items-center gap-1"><input type="checkbox" checked={e.active} onChange={(x) => setE({ ...e, active: x.target.checked })} /> {t("admin.c.active")}</label>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={() => onSave(e)} className={btnSave + " flex-1 justify-center"}><Check className="w-4 h-4" /> {t("admin.c.save")}</button>
        <button onClick={() => onDelete(g.id)} className={btnDel}><Trash2 className="w-4 h-4" /> {t("admin.c.delete")}</button>
      </div>
    </Card>
  );
}

// Settings › Daily check-in (server/dailyCheckin.ts): on/off, reset on a missed day, and
// the reward for every day, every 7th day and day 30 (points, RP, tokens, KGOLD or a Prize).
function DailyCheckinSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data } = useQuery<any>({ queryKey: ["/api/reborn/admin/daily-checkin"], queryFn: () => apiRequest("GET", "/api/reborn/admin/daily-checkin").then((r) => r.json()) });
  const { data: prizes = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/prizes"], queryFn: () => apiRequest("GET", "/api/reborn/admin/prizes").then((r) => r.json()) });
  const [e, setE] = useState<any>(null);
  const cur = e || data?.config;
  const save = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/daily-checkin", cur).then((r) => r.json()),
    onSuccess: (d: any) => { toast({ title: d.message }); setE(null); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/daily-checkin"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/daily-checkin"] }); },
    onError: (x: any) => toast({ title: t("admin.c.failed"), description: x.message, variant: "destructive" }),
  });
  if (!cur) return null;
  const days: any[] = cur.days || [];
  const setDay = (i: number, patch: any) => setE({ ...cur, days: days.map((r, k) => (k === i ? { ...r, ...patch } : r)) });
  // Copy day 1's reward to every normal day (not the 7th days or day 30).
  const copyDay1 = () => setE({ ...cur, days: days.map((r, k) => ((k + 1) % 7 === 0 || k === 29 ? r : { ...days[0] })) });
  const dayBox = (r: any, i: number) => {
    const d = i + 1, kind = d === 30 ? "big" : d % 7 === 0 ? "week" : "";
    return (
      <div key={d} className={`rounded-xl border p-2 ${kind === "big" ? "border-amber-400/60 bg-amber-400/10" : kind === "week" ? "border-fuchsia-400/50 bg-fuchsia-500/10" : "border-white/10 bg-black/20"}`}>
        <p className="text-[11px] font-bold text-white/75 mb-1">{kind === "big" ? "👑 " : kind === "week" ? "🎁 " : ""}{t("admin.ci.dayN", { n: d })}</p>
        <select value={r?.type || "none"} onChange={(ev) => setDay(i, { type: ev.target.value })} className={inp + " w-full mb-1 !py-1.5 text-xs"}>
          {["none", "points", "rp", "tokens", "kgold", "prize"].map((x) => <option key={x} value={x}>{t(`admin.ci.type.${x}`)}</option>)}
        </select>
        {r?.type === "prize"
          ? <select value={r.prizeId || ""} onChange={(ev) => setDay(i, { prizeId: Number(ev.target.value) || null })} className={inp + " w-full !py-1.5 text-xs"}><option value="">{t("admin.ci.pickPrize")}</option>{prizes.map((p: any) => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
          : r?.type && r.type !== "none" && <input type="number" inputMode="numeric" min={0} value={r.amount || ""} onFocus={(ev) => ev.currentTarget.select()} onChange={(ev) => setDay(i, { amount: Number(ev.target.value) })} placeholder={t("admin.ci.amount")} className={inp + " w-full !py-1.5 text-xs"} />}
      </div>
    );
  };
  return (
    <Card>
      <h3 className="font-bold mb-1 flex items-center gap-2"><CalendarCheck className="w-4 h-4 text-amber-300" /> {t("admin.ci.title")}</h3>
      <p className="text-xs text-white/50 mb-3">{t("admin.ci.hint")}</p>
      {data?.stats && <p className="text-xs text-white/60 mb-3">{t("admin.ci.stats", { today: data.stats.today, week: data.stats.week, members: data.stats.members })}</p>}
      <label className="mb-2 flex items-center gap-2 rounded-xl border border-white/10 p-2.5 text-sm"><input type="checkbox" checked={!!cur.enabled} onChange={(ev) => setE({ ...cur, enabled: ev.target.checked })} /> {t("admin.ci.enabled")}</label>
      <label className="mb-2 flex items-center gap-2 rounded-xl border border-white/10 p-2.5 text-sm"><input type="checkbox" checked={cur.autoClaim !== false} onChange={(ev) => setE({ ...cur, autoClaim: ev.target.checked })} /> {t("admin.ci.auto")} <span className="text-white/40 text-xs">{t("admin.ci.autoHint")}</span></label>
      <label className="mb-3 flex items-center gap-2 rounded-xl border border-white/10 p-2.5 text-sm"><input type="checkbox" checked={cur.resetOnMiss !== false} onChange={(ev) => setE({ ...cur, resetOnMiss: ev.target.checked })} /> {t("admin.ci.reset")} <span className="text-white/40 text-xs">{t("admin.ci.resetHint")}</span></label>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs text-white/60">{t("admin.ci.daysHint")}</p>
        <button onClick={copyDay1} className="shrink-0 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white/75">{t("admin.ci.copyDay1")}</button>
      </div>
      <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))" }}>
        {days.map(dayBox)}
      </div>
      {prizes.length === 0 && <p className="text-[11px] text-white/40 mb-2">{t("admin.ci.noPrizes")}</p>}
      <button onClick={() => save.mutate()} disabled={!e || save.isPending} className={btn + " disabled:opacity-50"}><Check className="w-4 h-4" /> {t("admin.c.save")}</button>
    </Card>
  );
}

// App design for this company's member app (same choice as BridgeX › White label): the
// design (shape), a colour or the admin's own four colours, and the lettering. Shown live
// while choosing; leaving without saving puts the saved look back.
function AppDesignSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data } = useQuery<any>({ queryKey: ["/api/reborn/admin/app-skin"], queryFn: () => apiRequest("GET", "/api/reborn/admin/app-skin").then((r) => r.json()) });
  const [pick, setPick] = useState<string | null>(null);
  const [pickedPalette, setPickedPalette] = useState<string | null>(null);
  const [pickedColours, setPickedColours] = useState<AppColours | null>(null);
  const [pickedFont, setPickedFont] = useState<string | null>(null);
  const skin = pick || data?.skin || "";
  const palette = pickedPalette ?? data?.palette ?? "";
  const colours: AppColours | null = pickedColours ?? data?.colours ?? null;
  const font = pickedFont ?? data?.font ?? "";
  const isUnchanged = skin === data?.skin && palette === (data?.palette ?? "") && font === (data?.font ?? "")
    && (palette !== CUSTOM_PALETTE || JSON.stringify(colours) === JSON.stringify(data?.colours ?? null));
  const reset = () => { setPick(null); setPickedPalette(null); setPickedColours(null); setPickedFont(null); };
  // Live preview of the choice; the saved look comes back when this screen closes.
  useEffect(() => { if (data) applyAppSkin(skin, palette, { colours, font }); }, [data, skin, palette, JSON.stringify(colours), font]);
  useEffect(() => () => { const saved = qc.getQueryData<any>(["/api/reborn/admin/app-skin"]); if (saved) applyAppSkin(saved.skin, saved.palette, { colours: saved.colours, font: saved.font }); }, []);
  const save = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/app-skin", { skin, palette, colours: palette === CUSTOM_PALETTE ? colours : null, font }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; }),
    onSuccess: (d: any) => {
      toast({ title: d.message });
      qc.setQueryData(["/api/reborn/admin/app-skin"], { skin: d.skin, palette: d.palette, colours: d.colours, font: d.font });
      applyAppSkin(d.skin, d.palette, { colours: d.colours, font: d.font });
      qc.invalidateQueries({ queryKey: ["tenant-brand"] });
      reset();
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });
  if (!data) return null;
  return (
    <Card>
      <AppSkinPicker value={skin} onChange={setPick} palette={palette} onPaletteChange={setPickedPalette}
        colours={colours} onColoursChange={setPickedColours} font={font} onFontChange={setPickedFont} note={t("admin.set.skinNote")} />
      <div className="mt-3 flex gap-2">
        {!isUnchanged && <button onClick={reset} disabled={save.isPending} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-white/80 disabled:opacity-40">{t("admin.set.skinUndo")}</button>}
        <button onClick={() => save.mutate()} disabled={save.isPending || isUnchanged} className="flex-1 rounded-xl bg-amber-400 py-2.5 text-sm font-bold text-black disabled:opacity-40">{t("admin.set.skinSave")}</button>
      </div>
    </Card>
  );
}

function Settings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data } = useQuery<any>({ queryKey: ["/api/reborn/admin/settings"], queryFn: () => apiRequest("GET", "/api/reborn/admin/settings").then((r) => r.json()) });
  const [e, setE] = useState<any>(null);
  const cur = e || data;
  const save = useMutation({ mutationFn: () => apiRequest("POST", "/api/reborn/admin/settings", cur).then((r) => r.json()), onSuccess: () => { toast({ title: t("admin.set.saved") }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/settings"] }); } });
  if (!cur) return <Empty text={t("admin.c.loading")} />;
  const set = (k: string, v: any) => setE({ ...cur, [k]: Number(v) });
  const setStr = (k: string, v: any) => setE({ ...cur, [k]: v });
  const loyalty = cur.loyalty || { pointsSpendRp: 1000, rewardsEnabled: true, tiers: [] };
  const setLoyalty = (patch: any) => setE({ ...cur, loyalty: { ...loyalty, ...patch } });
  const updateTier = (index: number, patch: any) => setLoyalty({ tiers: (loyalty.tiers || []).map((tier: any, i: number) => i === index ? { ...tier, ...patch } : tier) });
  return (
    <div className="space-y-4">
      <AppDesignSettings />
      <DailyCheckinSettings />
      <Card>
        <h3 className="font-bold mb-3 flex items-center gap-2"><Coins className="w-4 h-4 text-amber-300" /> {t("admin.set.kgold")}</h3>
        <Field label={t("admin.set.giftFee")} value={cur.giftFeePercent} onChange={(v: any) => set("giftFeePercent", v)} />
        <Field label={t("admin.set.kgoldPerRp")} value={cur.kgoldPerRp} onChange={(v: any) => set("kgoldPerRp", v)} />
        <Field label={t("admin.set.minBuy")} value={cur.minBuyKgold} onChange={(v: any) => set("minBuyKgold", v)} />
        <Field label={t("admin.set.minCashout")} value={cur.minCashoutRp} onChange={(v: any) => set("minCashoutRp", v)} />
      </Card>
      <GiftLevelSettings cur={cur} set={set} setStr={setStr} />
      <Card>
        <h3 className="font-bold mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-amber-300" /> {t("admin.set.pos")}</h3>
        <Field label={t("admin.set.tax")} value={cur.taxPercent} onChange={(v: any) => set("taxPercent", v)} />
        <Field label={t("admin.set.serviceFee")} value={cur.serviceFeePercent} onChange={(v: any) => set("serviceFeePercent", v)} />
        <label className="block mb-3"><span className="text-xs text-white/60 block mb-1">{t("admin.set.clubName")}</span><input value={cur.clubName || ""} onChange={(e) => setStr("clubName", e.target.value)} className={inp + " w-full"} /></label>
        <label className="block mb-3"><span className="text-xs text-white/60 block mb-1">{t("admin.set.footer")}</span><input value={cur.receiptFooter || ""} onChange={(e) => setStr("receiptFooter", e.target.value)} className={inp + " w-full"} /></label>
        <label className="mb-3 flex items-center gap-2 rounded-xl border border-white/10 p-3 text-sm"><input type="checkbox" checked={cur.posAutoPrint === true} onChange={(e)=>setStr("posAutoPrint",e.target.checked)}/> {t("admin.set.autoPrint")}</label>
        <p className="text-xs text-white/60 mb-1">{t("admin.set.logo")}</p>
        <ImageUpload value={cur.receiptLogoUrl} onChange={(v) => setStr("receiptLogoUrl", v)} label={t("admin.set.uploadLogo")} />
      </Card>
      <Card>
        <h3 className="font-bold mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-amber-300" /> {t("admin.set.ops")}</h3>
        <label className="block mb-3"><span className="text-xs text-white/60 block mb-1">{t("admin.set.tz")} <span className="text-white/40">{t("admin.set.tzHint")}</span></span>
          <select value={cur.timezone || "Asia/Jakarta"} onChange={(e) => setStr("timezone", e.target.value)} className={inp + " w-full"}>
            {["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "Asia/Singapore", "Asia/Kuala_Lumpur", "Asia/Bangkok", "Asia/Manila", "Asia/Ho_Chi_Minh", "Asia/Hong_Kong", "Asia/Shanghai", "Asia/Tokyo", "Asia/Dubai", "Australia/Sydney", "Europe/London", "America/New_York"].map((z) => <option key={z} value={z}>{t("admin.tz." + z.replace(/[^A-Za-z]/g, ""))}</option>)}
          </select>
        </label>
        <label className="mb-3 flex items-center gap-2 rounded-xl border border-white/10 p-3 text-sm"><input type="checkbox" checked={cur.allowNegativeStock === true} onChange={(e) => setStr("allowNegativeStock", e.target.checked)} /> {t("admin.set.negStock")}</label>
        <p className="-mt-2 mb-3 text-[11px] text-white/40">{t("admin.set.negStockHint")}</p>
        <Field label={t("admin.set.bottleDays")} value={cur.bottleExpiryDays} onChange={(v: any) => set("bottleExpiryDays", v)} />
        <Field label={t("admin.set.payrollDay")} value={cur.payrollDay} onChange={(v: any) => set("payrollDay", v)} />
        <Field label={t("admin.set.otRate")} value={cur.overtimeHourlyRate} onChange={(v: any) => set("overtimeHourlyRate", v)} />
      </Card>
      <Card>
        <h3 className="font-bold mb-1 flex items-center gap-2"><Star className="w-4 h-4 text-amber-300" /> {t("admin.loy.title")}</h3>
        <p className="mb-3 text-[11px] text-white/50">{t("admin.loy.hint")}</p>
        <Field label={t("admin.loy.spend")} value={loyalty.pointsSpendRp || 1000} onChange={(v:any)=>setLoyalty({pointsSpendRp:Math.max(1,Number(v)||1)})}/>
        <p className="-mt-2 mb-3 text-[11px] text-white/40">{t("admin.loy.spendHint")}</p>
        <label className="mb-1 flex items-center gap-2 rounded-xl border border-white/10 p-3 text-sm"><input type="checkbox" checked={loyalty.rewardsEnabled !== false} onChange={(e)=>setLoyalty({rewardsEnabled:e.target.checked})}/> {t("admin.loy.enable")}</label>
        <p className="mb-4 text-[11px] text-white/40">{t("admin.loy.enableHint")}</p>
        <div className="space-y-3">{(loyalty.tiers || []).map((tier:any,index:number)=><div key={index} className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-300">{t("admin.loy.tierN", { n: index + 1 })}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block"><span className="mb-1 block text-xs text-white/60">{t("admin.loy.tierName")}</span><input className={inp+" w-full"} value={tier.name||""} placeholder={t("admin.loy.tierNamePh")} onChange={(e)=>updateTier(index,{name:e.target.value})}/></label>
            <label className="block"><span className="mb-1 block text-xs text-white/60">{t("admin.loy.minPoints")}</span><input className={inp+" w-full"} type="number" min="0" value={tier.minPoints||0} placeholder={t("admin.c.example", { v: 500 })} onChange={(e)=>updateTier(index,{minPoints:Math.max(0,Number(e.target.value)||0)})}/></label>
            <label className="block"><span className="mb-1 block text-xs text-white/60">{t("admin.loy.discount")}</span><input className={inp+" w-full"} type="number" min="0" max="100" value={tier.discountPercent||0} placeholder={t("admin.c.example", { v: 2 })} onChange={(e)=>updateTier(index,{discountPercent:Math.max(0,Math.min(100,Number(e.target.value)||0))})}/><span className="mt-1 block text-[10px] text-white/35">{t("admin.loy.discountHint")}</span></label>
            <label className="block"><span className="mb-1 block text-xs text-white/60">{t("admin.loy.gift")}</span><input className={inp+" w-full"} type="number" min="0" value={tier.freeRp||0} placeholder={t("admin.c.example", { v: 50000 })} onChange={(e)=>updateTier(index,{freeRp:Math.max(0,Number(e.target.value)||0)})}/><span className="mt-1 block text-[10px] text-white/35">{t("admin.loy.giftHint")}</span></label>
          </div>
          <label className="mt-3 block"><span className="mb-1 block text-xs text-white/60">{t("admin.loy.benefits")}</span><input className={inp+" w-full"} value={(tier.benefits||[]).join(", ")} placeholder={t("admin.loy.benefitsPh")} onChange={(e)=>updateTier(index,{benefits:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)})}/><span className="mt-1 block text-[10px] text-white/35">{t("admin.loy.benefitsHint")}</span></label>
          <p className="mt-3 rounded-lg bg-white/5 px-3 py-2 text-[11px] text-white/55"><b>{tier.name || t("admin.loy.tierN", { n: index + 1 })}</b>: {t("admin.loy.summary", { points: Number(tier.minPoints || 0).toLocaleString(), pct: Number(tier.discountPercent || 0) })} · {Number(tier.freeRp || 0) > 0 ? t("admin.loy.storeGift", { rp: Number(tier.freeRp).toLocaleString() }) : t("admin.loy.noStoreGift")}</p>
          <button className="mt-3 text-xs text-red-300" onClick={()=>setLoyalty({tiers:loyalty.tiers.filter((_:any,i:number)=>i!==index)})}>{t("admin.loy.removeTier")}</button>
        </div>)}</div>
        <button className="mt-3 text-sm font-semibold text-amber-300" onClick={()=>setLoyalty({tiers:[...(loyalty.tiers||[]),{name:t("admin.loy.tierN", { n: (loyalty.tiers||[]).length+1 }),minPoints:0,discountPercent:0,freeRp:0,benefits:[]}]})}>{t("admin.loy.addTier")}</button>
        <button onClick={()=>save.mutate()} disabled={save.isPending} className={btn+" mt-4 w-full justify-center"}>{save.isPending?t("admin.c.saving"):t("admin.loy.save")}</button>
      </Card>
      <Card>
        <h3 className="font-bold mb-1 flex items-center gap-2"><Calculator className="w-4 h-4 text-amber-300" /> {t("admin.area.title")}</h3>
        <p className="text-[11px] text-white/50 mb-3">{t("admin.area.hint")}</p>
        <BookingAreasEditor value={cur.bookingAreas} onChange={(v) => setStr("bookingAreas", v)} />
        <label className="mt-3 flex items-start gap-2 rounded-xl border border-white/10 p-3 text-sm"><input className="mt-1" type="checkbox" checked={cur.bookingTableDayLock === true} onChange={(e) => setStr("bookingTableDayLock", e.target.checked)} /><span>{t("admin.bk.dayLock")}<span className="block text-[11px] text-white/40">{t("admin.bk.dayLockHint")}</span></span></label>
        <label className="mt-2 flex items-start gap-2 rounded-xl border border-white/10 p-3 text-sm"><input className="mt-1" type="checkbox" checked={cur.bookingAskHours !== false} onChange={(e) => setStr("bookingAskHours", e.target.checked)} /><span>{t("admin.bk.askHours")}<span className="block text-[11px] text-white/40">{t("admin.bk.askHoursHint")}</span></span></label>
        <label className="mt-2 flex items-start gap-2 rounded-xl border border-white/10 p-3 text-sm"><input className="mt-1" type="checkbox" checked={cur.bookingAskSpecial !== false} onChange={(e) => setStr("bookingAskSpecial", e.target.checked)} /><span>{t("admin.bk.askSpecial")}<span className="block text-[11px] text-white/40">{t("admin.bk.askSpecialHint")}</span></span></label>
        <label className="mt-2 block rounded-xl border border-white/10 p-3 text-sm"><span>{t("admin.bk.lastTime")}</span>
          <span className="flex items-center gap-2 mt-1.5"><input type="time" value={cur.bookingLastTime || ""} onChange={(e) => setStr("bookingLastTime", e.target.value)} className={inp + " w-40"} style={{ colorScheme: "dark" }} />
            {cur.bookingLastTime && <button type="button" onClick={() => setStr("bookingLastTime", "")} className="text-xs text-white/50 underline">{t("admin.bk.lastTimeClear")}</button>}</span>
          <span className="block text-[11px] text-white/40 mt-1">{t("admin.bk.lastTimeHint")}</span></label>
        <label className="block mt-3"><span className="text-xs text-white/60 block mb-1">{t("admin.area.note")}</span><input value={cur.bookingNote || ""} onChange={(e) => setStr("bookingNote", e.target.value)} className={inp + " w-full"} /></label>
        <button onClick={()=>save.mutate()} disabled={save.isPending} className={btn+" mt-3 w-full justify-center"}>{save.isPending?t("admin.c.saving"):t("admin.area.save")}</button>
      </Card>
      <Card>
        <h3 className="font-bold mb-2 flex items-center gap-2"><Music2 className="w-4 h-4 text-amber-300"/> {t("admin.set.songOpts")}</h3>
        <label className="flex items-center gap-2 rounded-xl border border-white/10 p-3 text-sm"><input type="checkbox" checked={cur.songRequestModeEnabled !== false} onChange={(e)=>setStr("songRequestModeEnabled",e.target.checked)}/> {t("admin.set.songMode")}</label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="block"><span className="text-xs text-white/60 block mb-1">{t("admin.set.songQueueBy")}</span>
            <select value={cur.songQueueMode || "user"} onChange={(e) => setStr("songQueueMode", e.target.value)} className={inp + " w-full"}>
              <option value="user">{t("admin.set.songQueueUser")}</option><option value="table">{t("admin.set.songQueueTable")}</option>
            </select></label>
          <label className="block"><span className="text-xs text-white/60 block mb-1">{t("admin.set.songsPerTurn")}</span>
            <select value={String(cur.songsPerTurn || 1)} onChange={(e) => setStr("songsPerTurn", Number(e.target.value))} className={inp + " w-full"}>
              {[1, 2, 3].map((n) => <option key={n} value={n}>{t("admin.set.songsN", { n })}</option>)}
            </select></label>
        </div>
        <p className="text-[11px] text-white/40 mt-2">{t("admin.set.songQueueHint")}</p>
        <button onClick={()=>save.mutate()} disabled={save.isPending} className={btn+" mt-3 w-full justify-center"}>{save.isPending?t("admin.c.saving"):t("admin.c.save")}</button>
      </Card>
      <Card>
        <h3 className="font-bold mb-1 flex items-center gap-2"><MessageCircle className="w-4 h-4 text-amber-300" /> {t("admin.set.reviews")}</h3>
        <label className="block mb-3"><span className="text-xs text-white/60 block mb-1">{t("admin.set.address")}</span><textarea value={cur.businessAddress || ""} onChange={(e) => setStr("businessAddress", e.target.value)} placeholder={t("admin.set.addressPh")} className={inp + " min-h-20 w-full"} /></label>
        <label className="block mb-3"><span className="text-xs text-white/60 block mb-1">{t("admin.set.mapLink")}</span><input value={cur.businessMapUrl || ""} onChange={(e) => setStr("businessMapUrl", e.target.value)} placeholder="https://maps.app.goo.gl/..." className={inp + " w-full"} /></label>
        <p className="mb-3 text-[11px] text-white/40">{t("admin.set.mapHint")}</p>
        <label className="block mb-3"><span className="text-xs text-white/60 block mb-1">{t("admin.set.reviewLink")}</span><input value={cur.googleReviewUrl || ""} onChange={(e) => setStr("googleReviewUrl", e.target.value)} placeholder="https://g.page/r/..." className={inp + " w-full"} /></label>
        <label className="block"><span className="text-xs text-white/60 block mb-1">{t("admin.set.house")}</span><input value={cur.houseReferralUserId || ""} onChange={(e) => setStr("houseReferralUserId", e.target.value)} placeholder={t("admin.set.housePh")} className={inp + " w-full"} /></label>
        <p className="text-[11px] text-white/40 mt-1">{t("admin.set.houseHint")}</p>
      </Card>
      <Card>
        <h3 className="font-bold mb-1 flex items-center gap-2"><Smartphone className="w-4 h-4 text-amber-300" /> {t("admin.set.appTitle")}</h3>
        <p className="mb-3 text-[11px] text-white/40">{t("admin.set.appHint")}</p>
        <label className="block mb-3"><span className="text-xs text-white/60 block mb-1">{t("admin.set.appAndroid")}</span><input value={cur.appAndroidUrl || ""} onChange={(e) => setStr("appAndroidUrl", e.target.value.trim())} placeholder="https://expo.dev/artifacts/eas/....apk" className={inp + " w-full"} /></label>
        <label className="block"><span className="text-xs text-white/60 block mb-1">{t("admin.set.appIos")}</span><input value={cur.appIosUrl || ""} onChange={(e) => setStr("appIosUrl", e.target.value.trim())} placeholder="https://apps.apple.com/..." className={inp + " w-full"} /></label>
      </Card>
      <Card>
        <h3 className="font-bold mb-1 flex items-center gap-2"><Disc3 className="w-4 h-4 text-amber-300" /> {t("admin.spin.title")}</h3>
        <p className="text-[11px] text-white/50 mb-3">{t("admin.spin.hint")}</p>
        <Field label={t("admin.spin.tokens")} value={cur.spinTokenCost} onChange={(v: any) => set("spinTokenCost", v)} />
        <Field label={t("admin.spin.pct")} value={cur.spinPoolPercent} onChange={(v: any) => set("spinPoolPercent", v)} />
        <Field label={t("admin.spin.bill")} value={cur.spinAssumedBill} onChange={(v: any) => set("spinAssumedBill", v)} />
        <Field label={t("admin.spin.min")} value={cur.spinPoolMin} onChange={(v: any) => set("spinPoolMin", v)} />
        <SpinPool />
      </Card>
      <Card>
        <h3 className="font-bold mb-1 flex items-center gap-2"><Coins className="w-4 h-4 text-red-300" /> {t("admin.sec.title")}</h3>
        <p className="text-[11px] text-white/50 mb-3">{t("admin.sec.hint")}</p>
        <label className="block"><span className="text-xs text-white/60 block mb-1">{t("admin.sec.pw")}</span><PasswordInput value={cur.mainAdminPassword || ""} onChange={(v) => setStr("mainAdminPassword", v)} placeholder={t("admin.sec.pwPh")} className={inp + " w-full"} /></label>
      </Card>
      <button onClick={() => save.mutate()} className={btn}>{t("admin.set.save")}</button>
    </div>
  );
}
// Admin › Settings › Gift levels: KGOLD needed per level (Gifter = sent, Star = received).
function levelPreview(base: number, growth: number, list: string) {
  const nums = String(list || "").split(/[\s,;]+/).map(Number).filter((x) => Number.isFinite(x) && x > 0);
  const g = Math.min(10, Math.max(1, growth || 2));
  const at = [0, 0];
  for (let lv = 2; lv <= 50; lv++) at[lv] = Math.max(at[lv - 1] + 1, nums.length >= lv - 1 ? nums[lv - 2] : lv === 2 ? (base || 1000000) : Math.round(at[lv - 1] * g));
  return at;
}
// Settings › Gift levels: all 50 levels of Gifter (KGOLD sent) and Star (KGOLD received),
// each box the total KGOLD needed for that level. Editing a box saves the exact list
// (`giftLevel*List`, 49 numbers for Lv.2–50); "Fill from formula" rewrites every box
// from Lv.2 = base, then × growth each level.
function GiftLevelSettings({ cur, set, setStr }: any) {
  const { t } = useTranslation();
  const block = (p: "Sender" | "Receiver") => {
    const key = `giftLevel${p}List`;
    const at = levelPreview(Number(cur[`giftLevel${p}Base`]), Number(cur[`giftLevel${p}Growth`]), cur[key]);
    const typed = String(cur[key] || "").split(/[\s,;]+/).map(Number).filter((x) => Number.isFinite(x) && x > 0);
    const shown = (lv: number) => (typed.length >= lv - 1 ? typed[lv - 2] : at[lv]); // what the admin typed, else the formula
    const setLv = (lv: number, v: string) => {
      const n = Math.round(Number(v));
      if (!(n > 0)) return; // an empty box keeps its value (type over it)
      const list = Array.from({ length: 49 }, (_, i) => shown(i + 2));
      list[lv - 2] = n;
      setStr(key, list.join(","));
    };
    const fillFormula = () => setStr(key, levelPreview(Number(cur[`giftLevel${p}Base`]), Number(cur[`giftLevel${p}Growth`]), "").slice(2).join(","));
    return (
      <div className="rounded-xl bg-black/20 border border-white/10 p-3 mb-3">
        <p className="font-bold text-sm mb-2">{p === "Sender" ? t("admin.lv.sender") : t("admin.lv.receiver")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end mb-3">
          <Field label={t("admin.lv.base")} value={cur[`giftLevel${p}Base`]} onChange={(v: any) => set(`giftLevel${p}Base`, v)} />
          <label className="block mb-3"><span className="text-xs text-white/60 block mb-1">{t("admin.lv.growth")}</span><input type="number" step="0.1" min="1" max="10" value={cur[`giftLevel${p}Growth`] ?? ""} onChange={(e) => set(`giftLevel${p}Growth`, e.target.value)} className={inp + " w-full"} /></label>
          <button type="button" onClick={fillFormula} className="mb-3 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white/80">{t("admin.lv.fill")}</button>
        </div>
        <p className="text-[11px] text-white/50 mb-2">{t("admin.lv.boxesHint")}</p>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(112px, 1fr))" }}>
          {Array.from({ length: 50 }, (_, i) => i + 1).map((lv) => {
            const v = lv === 1 ? 0 : shown(lv);
            const bad = lv > 2 && v <= shown(lv - 1);
            return (
              <label key={lv} className={`rounded-lg border px-2 py-1.5 ${bad ? "border-red-400/70 bg-red-500/10" : lv % 5 === 0 ? "border-amber-400/40 bg-amber-400/5" : "border-white/10 bg-white/[0.03]"}`}>
                <span className="block text-[10px] font-bold text-amber-200">Lv.{lv}</span>
                {lv === 1
                  ? <span className="block text-xs text-white/50 py-1">0</span>
                  : <input type="number" inputMode="numeric" min={1} value={v || ""} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setLv(lv, e.target.value)} className="w-full bg-transparent text-xs text-white outline-none py-0.5" />}
              </label>
            );
          })}
        </div>
        {Array.from({ length: 48 }, (_, i) => i + 3).some((lv) => shown(lv) <= shown(lv - 1)) && <p className="mt-2 text-[11px] text-red-300">{t("admin.lv.mustRise")}</p>}
      </div>
    );
  };
  return (
    <Card>
      <h3 className="font-bold mb-1 flex items-center gap-2"><Sparkles className="w-4 h-4 text-fuchsia-300" /> {t("admin.lv.title")}</h3>
      <p className="text-xs text-white/50 mb-3">{t("admin.lv.hint")}</p>
      {block("Sender")}
      {block("Receiver")}
    </Card>
  );
}

function Field({ label, value, onChange }: any) {
  // Show blank instead of a lone 0 and select-on-focus, so typing a value
  // never leaves a leading zero (e.g. "05000").
  return <label className="block mb-3"><span className="text-xs text-white/60 block mb-1">{label}</span><input type="number" inputMode="numeric" value={value === 0 || value === undefined || value === null ? "" : value} onFocus={(e) => e.currentTarget.select()} onChange={(e) => onChange(e.target.value)} className={inp + " w-full"} /></label>;
}

function SpinPool() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data } = useQuery<any>({ queryKey: ["/api/reborn/admin/spin-pool"], queryFn: () => apiRequest("GET", "/api/reborn/admin/spin-pool").then((r) => r.json()) });
  const [amt, setAmt] = useState("");
  const adjust = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/reborn/admin/spin-pool", body).then((r) => r.json()),
    onSuccess: () => { toast({ title: t("admin.spin.updated") }); setAmt(""); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/spin-pool"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/accounting/summary"] }); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }),
  });
  return (
    <div className="mt-2 rounded-xl bg-amber-500/10 border border-amber-400/30 p-3">
      <p className="text-xs text-white/50">{t("admin.spin.balance")}</p>
      <p className="text-xl font-extrabold text-amber-300">{money(data?.balance || 0)}</p>
      <div className="flex gap-2 mt-2">
        <input value={amt} onChange={(e) => setAmt(e.target.value)} type="number" placeholder={t("admin.spin.amount")} className={inp + " flex-1"} />
        <button onClick={() => adjust.mutate({ add: Number(amt) })} disabled={!amt || adjust.isPending} className={btnSave}>{t("admin.c.add")}</button>
        <button onClick={() => { if (confirm(t("admin.spin.setConfirm", { rp: Number(amt).toLocaleString() }))) adjust.mutate({ set: Number(amt) }); }} disabled={amt === "" || adjust.isPending} className="px-3 py-2 rounded-lg text-sm font-semibold bg-white/10 text-white/70">{t("admin.spin.set")}</button>
      </div>
      <p className="text-[11px] text-white/40 mt-1">{t("admin.spin.addSetHint")}</p>
    </div>
  );
}

const DEFAULT_AREAS = [
  { id: "l1-game", name: "Game House", level: "Level 1", image: "", tables: [] },
  { id: "l1-ktv", name: "KTV Lounge", level: "Level 1", image: "", tables: ["V1", "V2", "1", "2", "3", "4", "5", "T6", "T7", "T8", "T9"] },
  { id: "beauty", name: "Beauty Service", level: "Level 2 & 3", image: "", tables: [] },
  { id: "l2-ktv", name: "KTV Room", level: "Level 2", image: "", tables: ["Room 1", "Room 2", "Room 3", "Room 4"] },
  { id: "l3-vip", name: "VIP KTV Room", level: "Level 3", image: "", tables: ["VIP 1", "VIP 2", "VIP 3"] },
  { id: "l4-pet", name: "Pet Room", level: "Level 4", image: "", tables: [] },
  { id: "restaurant", name: "Restaurant", level: "Level 4 & 5", image: "", tables: [] },
];
function BookingAreasEditor({ value, onChange }: { value?: string; onChange: (json: string) => void }) {
  const { t } = useTranslation();
  const parse = (): any[] => { try { const a = JSON.parse(value || ""); if (Array.isArray(a) && a.length) return a; } catch {} return DEFAULT_AREAS; };
  const [areas, setAreas] = useState<any[]>(parse);
  const push = (next: any[]) => { setAreas(next); onChange(JSON.stringify(next)); };
  const upd = (i: number, patch: any) => push(areas.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  const add = () => push([...areas, { id: `area-${Date.now().toString(36)}`, name: t("admin.area.newArea"), level: t("admin.area.level1"), image: "", tables: [] }]);
  const remove = (i: number) => push(areas.filter((_, j) => j !== i));
  return (
    <div className="space-y-3">
      {areas.map((a, i) => (
        <div key={a.id || i} className={`rounded-xl border p-3 ${a.enabled === false ? "border-white/10 bg-black/40 opacity-60" : "border-white/10 bg-black/20"}`}>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input value={a.name} onChange={(e) => upd(i, { name: e.target.value })} placeholder={t("admin.area.name")} className={inp} />
            <input value={a.level} onChange={(e) => upd(i, { level: e.target.value })} placeholder={t("admin.area.level")} className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <label className="text-[11px] text-white/50">{t("admin.area.open")}<input type="time" value={a.open || ""} onChange={(e) => upd(i, { open: e.target.value })} className={inp + " w-full"} style={{ colorScheme: "dark" }} /></label>
            <label className="text-[11px] text-white/50">{t("admin.area.close")}<input type="time" value={a.close || ""} onChange={(e) => upd(i, { close: e.target.value })} className={inp + " w-full"} style={{ colorScheme: "dark" }} /></label>
          </div>
          <label className="text-[11px] text-white/50 block mb-2">{t("admin.area.lastBooking")}<input type="time" value={a.lastBooking || ""} onChange={(e) => upd(i, { lastBooking: e.target.value })} className={inp + " w-full"} style={{ colorScheme: "dark" }} /></label>
          <p className="text-[10px] text-white/35 mb-2">{t("admin.area.defaultHint")}</p>
          <WeeklySchedule area={a} onChange={(schedule: any) => upd(i, { schedule })} />
          <input value={(a.tables || []).join(", ")} onChange={(e) => upd(i, { tables: e.target.value.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean) })} placeholder={t("admin.area.tables")} className={inp + " w-full mb-2 mt-2"} />
          <label className="text-[11px] text-white/50 block mb-2">{t("admin.area.maxPax")} {(a.tables || []).length ? t("admin.area.maxPaxTables") : t("admin.area.maxPaxWhole")}<input type="number" min={1} value={a.maxPax > 0 ? a.maxPax : ""} onChange={(e) => upd(i, { maxPax: Math.max(0, Number(e.target.value) || 0) })} placeholder={t("admin.area.noMaxPh")} className={inp + " w-full"} /></label>
          {(a.tables || []).length > 0 && (
            <div className="mb-2">
              <p className="text-[11px] text-white/50 mb-1">{t("admin.area.maxPerTable")}</p>
              <p className="text-[10px] text-white/35 mb-1.5">{t("admin.area.maxPerTableHint")}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(a.tables || []).map((tb: string) => (
                  <label key={tb} className="flex items-center gap-1.5 text-[11px] text-white/60 bg-black/20 rounded-lg px-2 py-1">
                    <span className="truncate flex-1">{tb}</span>
                    {(a.tableCaps || {})[tb] === -1
                      ? <span className="px-1.5 py-1 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-bold">{t("admin.area.noMax")}</span>
                      : <input type="number" min={1} value={(a.tableCaps || {})[tb] > 0 ? a.tableCaps[tb] : ""} onChange={(e) => upd(i, { tableCaps: { ...(a.tableCaps || {}), [tb]: Math.max(0, Number(e.target.value) || 0) } })} placeholder={t("admin.area.max")} className="w-14 px-1.5 py-1 rounded bg-black/30 border border-white/10 text-white text-xs" />}
                    <button type="button" title={t("admin.area.noMax")} onClick={() => upd(i, { tableCaps: { ...(a.tableCaps || {}), [tb]: (a.tableCaps || {})[tb] === -1 ? 0 : -1 } })}
                      className={`px-1.5 py-1 rounded text-[10px] font-bold border ${(a.tableCaps || {})[tb] === -1 ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300" : "bg-white/5 border-white/10 text-white/50"}`}>∞</button>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <ImageUpload value={a.image} onChange={(v) => upd(i, { image: v })} label={t("admin.area.layout")} output="jpeg" maxDim={900} />
            <div className="flex items-center gap-2">
              <button onClick={() => upd(i, { enabled: a.enabled === false })} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${a.enabled === false ? "bg-white/10 text-white/50" : "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"}`}>{a.enabled === false ? t("admin.c.hidden") : t("admin.c.visible")}</button>
              <button onClick={() => remove(i)} className={btnDel}><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      ))}
      <button onClick={add} className={btn + " w-full justify-center"}><Plus className="w-4 h-4" /> {t("admin.area.add")}</button>
    </div>
  );
}

function WeeklySchedule({ area, onChange }: { area: any; onChange: (s: any) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const sched = area.schedule || {};
  const setDay = (d: number, patch: any) => {
    const cur = sched[String(d)] || {};
    const next = { ...sched, [String(d)]: { ...cur, ...patch } };
    onChange(next);
  };
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-2 mb-1">
      <button onClick={() => setOpen((v) => !v)} className="w-full text-left text-[11px] text-white/60 flex items-center justify-between">
        <span>{t("admin.area.weekly")} {open ? "▲" : "▼"}</span>
        <span className="text-white/30">{open ? t("admin.area.tapHide") : t("admin.area.tapEdit")}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-1">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => {
            const cfg = sched[String(d)] || {};
            const enabled = cfg.enabled !== false;
            return (
              <div key={d} className="flex items-center gap-2">
                <button onClick={() => setDay(d, { enabled: !enabled })} className={`w-12 py-1 rounded text-[11px] font-bold ${enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-white/30 line-through"}`}>{t("admin.wd." + d)}</button>
                <input type="time" value={cfg.open || ""} disabled={!enabled} onChange={(e) => setDay(d, { open: e.target.value })} className={inp + " flex-1"} style={{ colorScheme: "dark" }} />
                <input type="time" value={cfg.close || ""} disabled={!enabled} onChange={(e) => setDay(d, { close: e.target.value })} className={inp + " flex-1"} style={{ colorScheme: "dark" }} />
              </div>
            );
          })}
          <p className="text-[10px] text-white/35">{t("admin.area.weeklyHint")}</p>
        </div>
      )}
    </div>
  );
}

function Songs() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { data: songs = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/songs"], queryFn: () => apiRequest("GET", "/api/reborn/songs").then((r) => r.json()) });
  const inv = () => qc.invalidateQueries({ queryKey: ["/api/reborn/songs"] });
  const add = useMutation({ mutationFn: () => apiRequest("POST", "/api/reborn/admin/songs", { title: t("admin.song.newTitle"), isHit: true }).then((r) => r.json()), onSuccess: inv });
  const save = useMutation({ mutationFn: (s: any) => apiRequest("PUT", `/api/reborn/admin/songs/${s.id}`, s).then((r) => r.json()), onSuccess: inv });
  const del = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/reborn/admin/songs/${id}`), onSuccess: inv });
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(50);
  const needle = q.trim().toLowerCase();
  const list = needle ? songs.filter((s) => [s.title, s.titlePinyin, s.artist, s.artistPinyin].some((v) => String(v || "").toLowerCase().includes(needle))) : songs;
  return (
    <div>
      <button onClick={() => add.mutate()} className={btn + " mb-4"}><Plus className="w-4 h-4" /> {t("admin.song.add")}</button>
      <input value={q} onChange={(e) => { setQ(e.target.value); setShown(50); }} placeholder={t("admin.song.search", { n: songs.length })} className={inp + " w-full mb-3"} />
      <div className="space-y-3">{list.slice(0, shown).map((s) => <SongRow key={s.id} s={s} onSave={save.mutate} onDelete={del.mutate} />)}</div>
      {list.length > shown && <button onClick={() => setShown((n) => n + 50)} className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 py-2.5 text-sm text-white/70">{t("vn.song.showMore", { n: list.length - shown })}</button>}
    </div>
  );
}
function SongRow({ s, onSave, onDelete }: any) {
  const [e, setE] = useState(s);
  const { t } = useTranslation();
  return (
    <Card>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <input value={e.title} onChange={(x) => setE({ ...e, title: x.target.value })} placeholder={t("admin.song.name")} className={inp} />
        <input value={e.titlePinyin || ""} onChange={(x) => setE({ ...e, titlePinyin: x.target.value })} placeholder={t("admin.song.pinyin")} className={inp} />
        <input value={e.artist || ""} onChange={(x) => setE({ ...e, artist: x.target.value })} placeholder={t("admin.song.singer")} className={inp} />
        <input value={e.artistPinyin || ""} onChange={(x) => setE({ ...e, artistPinyin: x.target.value })} placeholder={t("admin.song.singerPinyin")} className={inp} />
      </div>
      <input value={e.spotifyUrl || ""} onChange={(x) => setE({ ...e, spotifyUrl: x.target.value })} placeholder={t("admin.song.spotify")} className={inp + " w-full mb-2"} />
      <div className="mb-2"><p className="text-xs text-white/50 mb-1">{t("admin.song.photo")}</p><ImageUpload value={e.artistPhoto} onChange={(v) => setE({ ...e, artistPhoto: v })} shape="circle" label={t("admin.c.uploadPhoto")} /></div>
      <label className="text-xs text-white/50 flex items-center gap-1 mb-2"><input type="checkbox" checked={e.isHit} onChange={(x) => setE({ ...e, isHit: x.target.checked })} /> {t("admin.song.hit")}</label>
      <div className="flex gap-2">
        <button onClick={() => onSave(e)} className={btnSave + " flex-1 justify-center"}><Check className="w-4 h-4" /> {t("admin.c.save")}</button>
        <button onClick={() => onDelete(s.id)} className={btnDel}><Trash2 className="w-4 h-4" /> {t("admin.c.delete")}</button>
      </div>
    </Card>
  );
}

function SongRequests() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { toast } = useToast();
  const role = useAdminRole();
  const { data: qi } = useQuery<any>({ queryKey: ["/api/reborn/song-queue-info"], queryFn: () => apiRequest("GET", "/api/reborn/song-queue-info").then((r) => r.json()) });
  const { data: all = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/song-requests"], queryFn: () => apiRequest("GET", "/api/reborn/admin/song-requests").then((r) => r.json()), refetchInterval: 8000, refetchOnWindowFocus: true });
  const inv = () => { qc.invalidateQueries({ queryKey: ["/api/reborn/admin/song-requests"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/song-queue"] }); };
  const done = (d: any) => { toast({ title: d.message }); inv(); };
  const fail = (e: any) => toast({ title: t("admin.c.failed"), description: String(e.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" });
  const next = useMutation({ mutationFn: (skip: boolean) => apiRequest("POST", "/api/reborn/admin/song-queue/next", { skip }).then((r) => r.json()), onSuccess: done, onError: fail });
  const cancel = useMutation({ mutationFn: ({ id, note }: any) => apiRequest("POST", `/api/reborn/admin/song-requests/${id}/cancel`, { note }).then((r) => r.json()), onSuccess: done, onError: fail });
  const cancelGroup = useMutation({ mutationFn: (v: { table?: string; userId?: string }) => apiRequest("POST", "/api/reborn/admin/song-queue/cancel-group", v).then((r) => r.json()), onSuccess: done, onError: fail });
  const paused = !!qi?.paused;
  const pause = useMutation({ mutationFn: (p: boolean) => apiRequest("POST", "/api/reborn/admin/song-queue/pause", { paused: p }).then((r) => r.json()), onSuccess: (d: any) => { done(d); qc.invalidateQueries({ queryKey: ["/api/reborn/song-queue-info"] }); }, onError: fail });
  const playNext = useMutation({ mutationFn: (id: number) => apiRequest("POST", `/api/reborn/admin/song-requests/${id}/play-next`, {}).then((r) => r.json()), onSuccess: done, onError: fail });
  const playing = all.find((r) => r.playing);
  const rows = all.filter((r) => !r.playing);
  const nameOf = (r: any) => r.requester?.name || r.requester?.username || t("admin.req.unknownUser");
  return (
    <div className="space-y-2">
      <Card>
        <p className="text-[11px] font-bold tracking-wider text-fuchsia-200/80 uppercase">🎤 {t("admin.req.nowPlaying")}{paused && <span className="ml-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] text-black">⏸ {t("admin.req.paused")}</span>}</p>
        {playing ? (<>
          <p className="text-lg font-black mt-1">{playing.title}{playing.artist ? <span className="text-sm font-normal text-white/50"> · {playing.artist}</span> : null}</p>
          <p className="text-xs text-amber-200/90">{playing.table ? `${t("admin.req.table", { t: playing.table })} · ` : ""}{nameOf(playing)}{playing.requester?.phone ? ` · ${playing.requester.phone}` : ""}</p>
        </>) : <p className="text-sm text-white/55 mt-1">{t("admin.req.nothingPlaying")}</p>}
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={() => next.mutate(false)} disabled={next.isPending || paused || (!playing && !rows.length)} className={btnSave}>▶ {playing ? t("admin.req.next") : t("admin.req.start")}</button>
          {playing && <button onClick={() => { if (confirm(t("admin.req.skipConfirm"))) next.mutate(true); }} disabled={next.isPending} className={btnDel}>⏭ {t("admin.req.skip")}</button>}
          {<button onClick={() => pause.mutate(!paused)} disabled={pause.isPending} className="px-3 py-2 rounded-lg text-sm font-semibold bg-amber-400/15 text-amber-200">{paused ? `▶ ${t("admin.req.resume")}` : `⏸ ${t("admin.req.pause")}`}</button>}
          {playing && <button onClick={() => { const note = prompt(t("admin.req.cancelPrompt"), "") ?? undefined; if (note !== undefined) cancel.mutate({ id: playing.id, note }); }} className="px-3 py-2 rounded-lg text-sm font-semibold bg-white/10 text-white/70">{t("admin.req.stop")}</button>}
        </div>
        <p className="text-[11px] text-white/45 mt-2">{paused ? t("admin.req.pausedNote") : t("admin.req.autoNote")}</p>
      </Card>
      <p className="text-xs text-white/50 px-1">{qi?.mode === "table" ? t("admin.req.fairNoteTable", { n: qi?.perTurn ?? 1 }) : t("admin.req.fairNoteUser", { n: qi?.perTurn ?? 1 })}</p>
      {rows.length === 0 && <Empty text={t("admin.req.empty")} />}
      {rows.map((r) => (
        <Card key={r.id}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm text-black" style={{ background: "linear-gradient(135deg,#c9a84c,#f0d787)" }}>#{r.position ?? "?"}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate"><Music2 className="w-3.5 h-3.5 inline mr-1 text-amber-300" />{r.title}</p>
              <p className="text-xs text-white/40 truncate">{r.bumpedAt && <b className="text-emerald-300">⬆ {t("admin.req.playNextTag")} · </b>}{r.artist || "—"} · {r.performanceMode === "singer" ? t("admin.req.bySinger") : t("admin.req.self")} · {t("admin.req.round", { n: (r.round ?? 0) + 1 })}{r.table ? <> · <b className="text-cyan-300">{t("admin.req.table", { t: r.table })}</b></> : null}</p>
              <p className="text-xs text-amber-200/90 truncate">{nameOf(r)}{r.requester?.username && r.requester?.name ? ` (@${r.requester.username})` : ""}{r.requester?.phone ? ` · ${r.requester.phone}` : ""}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {r.position !== 1 && <button onClick={() => playNext.mutate(r.id)} disabled={playNext.isPending} className="px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-400/15 text-emerald-200">⬆ {t("admin.req.playNext")}</button>}
                <button onClick={() => { const note = prompt(t("admin.req.cancelPrompt"), "") ?? undefined; if (note !== undefined) cancel.mutate({ id: r.id, note }); }} className={btnDel}><X className="w-4 h-4" /> {t("admin.req.cancel")}</button>
                {r.table
                  ? <button onClick={() => { if (confirm(t("admin.req.cancelTableConfirm", { t: r.table }))) cancelGroup.mutate({ table: r.table }); }} className="px-3 py-2 rounded-lg text-xs font-semibold bg-white/10 text-white/70">{t("admin.req.cancelTable", { t: r.table })}</button>
                  : <button onClick={() => { if (confirm(t("admin.req.cancelMemberConfirm", { name: nameOf(r) }))) cancelGroup.mutate({ userId: r.userId }); }} className="px-3 py-2 rounded-lg text-xs font-semibold bg-white/10 text-white/70">{t("admin.req.cancelMember")}</button>}
              </div>
            </div>
          </div>
        </Card>
      ))}
      {role === "admin" && <KaraokeBridge />}
    </div>
  );
}
// Admin › Requests › Karaoke system: token for the bridge program at the club + song-list import.
function KaraokeBridge() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [token, setToken] = useState("");
  const [text, setText] = useState("");
  const { data: k } = useQuery<any>({ queryKey: ["/api/reborn/admin/karaoke"], queryFn: () => apiRequest("GET", "/api/reborn/admin/karaoke").then((r) => r.json()), refetchInterval: 30000 });
  const mk = useMutation({ mutationFn: () => apiRequest("POST", "/api/reborn/admin/karaoke/token", {}).then((r) => r.json()), onSuccess: (d: any) => { setToken(d.token); toast({ title: d.message }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/karaoke"] }); } });
  const imp = useMutation({ mutationFn: () => apiRequest("POST", "/api/reborn/admin/karaoke/import", { text }).then((r) => r.json()), onSuccess: (d: any) => { toast({ title: d.message }); setText(""); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/karaoke"] }); } });
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <Card>
      <p className="font-bold flex items-center gap-2"><Disc3 className="w-4 h-4 text-fuchsia-300" /> {t("admin.kar.title")}</p>
      <p className="text-xs text-white/50 mt-1">{t("admin.kar.hint")}</p>
      <p className="text-xs mt-2">{k?.online ? <b className="text-emerald-300">● {t("admin.kar.online")}</b> : <span className="text-white/50">○ {k?.lastSeen ? t("admin.kar.lastSeen", { at: new Date(k.lastSeen).toLocaleString(localeTag()) }) : t("admin.kar.never")}</span>} · {t("admin.kar.linked", { n: k?.linkedSongs ?? 0 })}</p>
      <button onClick={() => { if (!k?.hasToken || confirm(t("admin.kar.newTokenConfirm"))) mk.mutate(); }} className={btn + " mt-3"}>{k?.hasToken ? t("admin.kar.newToken") : t("admin.kar.makeToken")}</button>
      {token && <div className="mt-2 p-2 rounded-lg bg-black/40 text-[11px] font-mono break-all text-amber-200">{token}<p className="text-white/45 font-sans mt-1">{t("admin.kar.copyOnce")}</p></div>}
      <pre className="mt-3 p-2 rounded-lg bg-black/40 text-[10px] text-white/60 whitespace-pre-wrap break-all">{`GET  ${base}/api/karaoke/queue
POST ${base}/api/karaoke/next   {"finishedId": <id>, "skip": false}
POST ${base}/api/karaoke/songs  [{"code":"10234","title":"…","artist":"…"}]
Header: X-Karaoke-Token: <token>`}</pre>
      <p className="text-xs text-white/60 mt-3">{t("admin.kar.importHint")}</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder={"10234, 七里香, 周杰伦\n10235, Separuh Aku, Noah"} className={inp + " w-full mt-1 font-mono text-xs"} />
      <button onClick={() => imp.mutate()} disabled={!text.trim() || imp.isPending} className={btn + " mt-2"}>{t("admin.kar.import")}</button>
    </Card>
  );
}

function useCrud(key: string) {
  const qc = useQueryClient();
  return { qc, invalidate: () => qc.invalidateQueries({ queryKey: [key] }) };
}

function Codes() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { qc } = useCrud("/api/reborn/admin/codes");
  const [count, setCount] = useState(5);
  const [gender, setGender] = useState("male");
  const { data: codes = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/codes"], queryFn: () => apiRequest("GET", "/api/reborn/admin/codes").then((r) => r.json()) });
  const gen = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/codes", { count, gender }).then((r) => r.json()),
    onSuccess: (d) => { toast({ title: t("admin.code.generated", { n: d.codes.length }) }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/codes"] }); },
  });
  return (
    <div>
      <Card>
        <h3 className="font-bold mb-3 flex items-center gap-2"><Ticket className="w-4 h-4 text-amber-300" /> {t("admin.code.title")}</h3>
        <div className="flex flex-wrap gap-2 items-center">
          <input type="number" min={1} max={200} value={count} onChange={(e) => setCount(Number(e.target.value))} className={inp + " w-20"} />
          <select value={gender} onChange={(e) => setGender(e.target.value)} className={inp}><option value="male">{t("admin.code.male")}</option><option value="female">{t("admin.code.female")}</option></select>
          <button onClick={() => gen.mutate()} className={btn}><Plus className="w-4 h-4" /> {t("admin.code.generate")}</button>
        </div>
      </Card>
      <div className="mt-4 space-y-1">
        {codes.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm">
            <span className="font-mono font-bold tracking-wider">{c.code}</span>
            <span className="text-xs text-white/50">{tv(t, "admin.code.g." + c.petGender, c.petGender)} · {c.used ? t("admin.code.used") : t("admin.code.unused")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Prizes() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: prizes = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/prizes"], queryFn: () => apiRequest("GET", "/api/reborn/admin/prizes").then((r) => r.json()) });
  const inv = () => qc.invalidateQueries({ queryKey: ["/api/reborn/admin/prizes"] });
  const add = useMutation({ mutationFn: () => apiRequest("POST", "/api/reborn/admin/prizes", { label: t("admin.prize.newLabel"), prizeType: "item", weight: 10 }).then((r) => r.json()), onSuccess: inv });
  const save = useMutation({ mutationFn: (p: any) => apiRequest("PUT", `/api/reborn/admin/prizes/${p.id}`, p).then((r) => r.json()), onSuccess: () => { toast({ title: t("admin.c.saved") }); inv(); } });
  const del = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/reborn/admin/prizes/${id}`), onSuccess: inv });
  const totalWeight = prizes.reduce((s, p) => s + (p.active ? Number(p.weight) || 0 : 0), 0) || 1;
  const [award, setAward] = useState({ username: "", prizeId: 0 });
  const giveAward = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/prizes/award", award).then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
    onSuccess: ({ ok, d }: any) => { toast({ title: ok ? d.message : t("admin.c.failed"), description: ok ? undefined : d.message, variant: ok ? undefined : "destructive" }); if (ok) setAward({ username: "", prizeId: 0 }); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }),
  });
  return (
    <div>
      <Card>
        <p className="font-bold mb-2 flex items-center gap-2 text-sm"><Disc3 className="w-4 h-4 text-amber-300" /> {t("admin.prize.giveTitle")}</p>
        <p className="text-[11px] text-white/50 mb-2">{t("admin.prize.giveHint")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <UserPicker value={award.username} onChange={(code) => setAward({ ...award, username: code })} placeholder={t("admin.prize.searchMember")} />
          <select value={award.prizeId} onChange={(e) => setAward({ ...award, prizeId: Number(e.target.value) })} className={inp}>
            <option value={0}>{t("admin.prize.choose")}</option>
            {prizes.map((p) => <option key={p.id} value={p.id}>{tData(p.label)}</option>)}
          </select>
        </div>
        <button onClick={() => giveAward.mutate()} disabled={!award.username.trim() || !award.prizeId || giveAward.isPending} className={btn + " disabled:opacity-50"}><Gift className="w-4 h-4" /> {t("admin.prize.give")}</button>
      </Card>
      <button onClick={() => add.mutate()} className={btn + " my-4"}><Plus className="w-4 h-4" /> {t("admin.prize.add")}</button>
      <div className="space-y-3">
        {prizes.map((p) => <PrizeRow key={p.id} p={p} totalWeight={totalWeight} onSave={save.mutate} onDelete={del.mutate} />)}
      </div>
      <p className="text-xs text-white/40 mt-3">{t("admin.prize.hint")}</p>
    </div>
  );
}
function PrizeRow({ p, totalWeight, onSave, onDelete }: any) {
  const [e, setE] = useState(p);
  const { t } = useTranslation();
  const pct = e.active ? Math.round(((Number(e.weight) || 0) / totalWeight) * 100) : 0;
  return (
    <Card>
      <div className="flex flex-wrap gap-2 items-center">
        <input value={e.label} onChange={(x) => setE({ ...e, label: x.target.value })} className={inp + " flex-1 min-w-[140px]"} />
        <input type="color" value={e.colorHex || "#c9a84c"} onChange={(x) => setE({ ...e, colorHex: x.target.value })} className="w-9 h-9 rounded bg-transparent border border-white/10" />
      </div>
      <div className="flex flex-wrap gap-2 items-center mt-2">
        <select value={e.prizeType} onChange={(x) => setE({ ...e, prizeType: x.target.value })} className={inp}>
          {["item", "voucher_percent", "voucher_amount", "pill", "free_spin", "nothing"].map((pt) => <option key={pt} value={pt}>{t("admin.ptype." + pt)}</option>)}
        </select>
        <label className="text-xs text-white/50" title={t("admin.prize.valueTip")}>{t("admin.prize.value")}<input type="number" inputMode="numeric" value={e.value || ""} onFocus={(x) => x.currentTarget.select()} onChange={(x) => setE({ ...e, value: Number(x.target.value) })} className={inp + " w-20 ml-1"} /></label>
        {e.prizeType === "voucher_percent"
          ? <span className="text-[11px] text-white/40" title={t("admin.prize.autoTip")}>{t("admin.prize.autoCost", { n: e.value || 0 })}</span>
          : <label className="text-xs text-white/50" title={t("admin.prize.costTip")}>{t("admin.prize.cost")}<input type="number" inputMode="numeric" value={e.costRp || ""} onFocus={(x) => x.currentTarget.select()} onChange={(x) => setE({ ...e, costRp: Number(x.target.value) })} className={inp + " w-24 ml-1"} /></label>}
        <label className="text-xs text-white/50">{t("admin.prize.winRate")}<input type="number" inputMode="numeric" value={e.weight || ""} onFocus={(x) => x.currentTarget.select()} onChange={(x) => setE({ ...e, weight: Number(x.target.value) })} className={inp + " w-16 ml-1"} /></label>
        <span className="text-xs font-bold text-amber-300" title={t("admin.prize.chanceTip")}>≈{pct}%</span>
        <label className="text-xs text-white/50 flex items-center gap-1"><input type="checkbox" checked={e.active} onChange={(x) => setE({ ...e, active: x.target.checked })} /> {t("admin.c.active")}</label>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={() => onSave(e)} className={btnSave + " flex-1 justify-center"}><Check className="w-4 h-4" /> {t("admin.c.save")}</button>
        <button onClick={() => onDelete(p.id)} className={btnDel}><Trash2 className="w-4 h-4" /> {t("admin.c.delete")}</button>
      </div>
    </Card>
  );
}

function Redemptions() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { data: rows = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/redemptions"], queryFn: () => apiRequest("GET", "/api/reborn/admin/redemptions").then((r) => r.json()) });
  const act = useMutation({ mutationFn: ({ id, approve }: any) => apiRequest("POST", `/api/reborn/admin/redemptions/${id}`, { approve }), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/reborn/admin/redemptions"] }) });
  return (
    <div className="space-y-2">
      <Card>
        <p className="font-bold text-sm flex items-center gap-2"><Gift className="w-4 h-4 text-amber-300" /> {t("admin.ov.redemptions")}</p>
        <p className="text-[11px] text-white/50 mt-1">{t("admin.red.hint")}</p>
      </Card>
      {rows.length === 0 && <Empty text={t("admin.red.empty")} />}
      {rows.map((r) => (
        <Card key={r.id}>
          <div className="flex items-center gap-3">
            <Gift className="w-5 h-5 text-amber-300" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{tData(r.prizeLabel)}</p>
              <p className="text-xs text-white/40">{r.memberName || t("admin.c.member")} · {new Date(r.createdAt).toLocaleString(localeTag())}</p>
            </div>
            <button onClick={() => act.mutate({ id: r.id, approve: true })} className={btnSave}><Check className="w-4 h-4" /> {t("admin.c.approve")}</button>
            <button onClick={() => act.mutate({ id: r.id, approve: false })} className={btnDel}><X className="w-4 h-4" /></button>
          </div>
        </Card>
      ))}
    </div>
  );
}

// The company's own pet: what it is called everywhere in the app, and its pictures.
function PetLook() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const SETTINGS = "/api/reborn/admin/settings";
  const { data } = useQuery<any>({ queryKey: [SETTINGS], queryFn: () => apiRequest("GET", SETTINGS).then((r) => r.json()) });
  const [look, setLook] = useState({ petName: "", petImageUrl: "", petEggImageUrl: "" });
  useEffect(() => {
    if (data) setLook({ petName: data.petName || "", petImageUrl: data.petImageUrl || "", petEggImageUrl: data.petEggImageUrl || "" });
  }, [data?.petName, data?.petImageUrl, data?.petEggImageUrl]);
  const save = useMutation({
    mutationFn: () => apiRequest("POST", SETTINGS, look).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SETTINGS] });
      qc.invalidateQueries({ queryKey: ["/api/reborn/pet-brand"] });
      toast({ title: t("admin.c.saved") });
    },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }),
  });
  return (
    <div className="rounded-2xl border bg-white/5 border-white/10 p-4">
      <p className="text-sm font-bold flex items-center gap-2"><PawPrint className="w-4 h-4 text-amber-300" /> {t("admin.petlook.title")}</p>
      <p className="text-[11px] text-white/50 mt-1">{t("admin.petlook.hint")}</p>
      <label className="mt-3 block text-[11px] text-white/60">{t("admin.petlook.name")}
        <input className={inp + " mt-1 w-full"} maxLength={24} value={look.petName} onChange={(e) => setLook({ ...look, petName: e.target.value })} />
      </label>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <ImageUpload value={look.petImageUrl} onChange={(v) => setLook({ ...look, petImageUrl: v })} label={t("admin.petlook.picture")} />
          {look.petImageUrl && <button onClick={() => setLook({ ...look, petImageUrl: "" })} className="mt-2 text-xs text-white/60 underline">{t("admin.petlook.useBuiltIn")}</button>}
        </div>
        <div>
          <ImageUpload value={look.petEggImageUrl} onChange={(v) => setLook({ ...look, petEggImageUrl: v })} label={t("admin.petlook.egg")} />
          {look.petEggImageUrl && <button onClick={() => setLook({ ...look, petEggImageUrl: "" })} className="mt-2 text-xs text-white/60 underline">{t("admin.petlook.useBuiltIn")}</button>}
        </div>
      </div>
      <p className="text-[11px] text-white/40 mt-3">{t("admin.petlook.clothesNote")}</p>
      <button onClick={() => save.mutate()} disabled={save.isPending} className={btnSave + " mt-3 disabled:opacity-60"}><Check className="w-4 h-4" /> {t("admin.c.save")}</button>
    </div>
  );
}

function Pills() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [userId, setUserId] = useState("");
  const grant = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/grant-pill", { userId: userId.trim() }).then((r) => r.json()),
    onSuccess: (d) => { toast({ title: d.message }); setUserId(""); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }),
  });
  return (
    <Card>
      <h3 className="font-bold mb-2 flex items-center gap-2"><Pill className="w-4 h-4 text-rose-400" /> {t("admin.pill.title")}</h3>
      <p className="text-sm text-white/60 mb-3">{t("admin.pill.hint")}</p>
      <div className="flex gap-2">
        <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder={t("admin.pill.userId")} className={inp + " flex-1"} />
        <button onClick={() => grant.mutate()} disabled={!userId.trim()} className={btn}>{t("admin.pill.grant")}</button>
      </div>
    </Card>
  );
}

function Faq() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { data: items = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/faq"], queryFn: () => apiRequest("GET", "/api/reborn/admin/faq").then((r) => r.json()) });
  const inv = () => qc.invalidateQueries({ queryKey: ["/api/reborn/admin/faq"] });
  const add = useMutation({ mutationFn: () => apiRequest("POST", "/api/reborn/admin/faq", { question: t("admin.faq.newQ"), answer: t("admin.faq.answer"), keywords: "" }).then((r) => r.json()), onSuccess: inv });
  const save = useMutation({ mutationFn: (f: any) => apiRequest("PUT", `/api/reborn/admin/faq/${f.id}`, f).then((r) => r.json()), onSuccess: inv });
  const del = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/reborn/admin/faq/${id}`), onSuccess: inv });
  // Questions members asked that nobody answered yet come first.
  const unanswered = (f: any) => !String(f.answer || "").trim();
  const sorted = [...items].sort((a, b) => Number(unanswered(b)) - Number(unanswered(a)));
  const waiting = items.filter(unanswered).length;
  return (
    <div>
      <button onClick={() => add.mutate()} className={btn + " mb-4"}><Plus className="w-4 h-4" /> {t("admin.faq.add")}</button>
      {waiting > 0 && <p className="mb-3 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200">{t("admin.faq.waiting", { n: waiting })}</p>}
      <div className="space-y-3">{sorted.map((f) => <FaqRow key={f.id} f={f} onSave={save.mutate} onDelete={del.mutate} />)}</div>
      <p className="text-xs text-white/40 mt-3">{t("admin.faq.hint")}</p>
    </div>
  );
}
function FaqRow({ f, onSave, onDelete }: any) {
  const [e, setE] = useState(f);
  const { t } = useTranslation();
  const { toast } = useToast();
  // Fill the Chinese + Bahasa boxes from the English question/answer.
  const translateAll = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/translate", { texts: [e.question || "", e.answer || ""] }).then((r) => r.json()),
    onSuccess: (d: any) => {
      setE((cur: any) => ({ ...cur, i18n: { ...(cur.i18n || {}), zh: { question: d.zh[0], answer: d.zh[1] }, id: { question: d.id[0], answer: d.id[1] } } }));
      toast({ title: t("admin.faq.translated") });
    },
    onError: (err: any) => toast({ title: t("admin.c.failed"), description: String(err.message || "").replace(/^\d+:\s*/, ""), variant: "destructive" }),
  });
  const hasOther = ["zh", "id"].some((l) => e.i18n?.[l]?.question || e.i18n?.[l]?.answer);
  const waiting = !String(f.answer || "").trim();
  return (
    <Card>
      {waiting && <p className="mb-2 rounded-md bg-red-500/15 px-2 py-1 text-xs font-bold text-red-200">{t("admin.faq.needsAnswer")}</p>}
      <input value={e.question} onChange={(x) => setE({ ...e, question: x.target.value })} placeholder={t("admin.faq.question")} className={inp + " w-full mb-2"} />
      <textarea value={e.answer} onChange={(x) => setE({ ...e, answer: x.target.value })} placeholder={t("admin.faq.answer")} rows={2} className={inp + " w-full mb-2"} />
      <button type="button" disabled={translateAll.isPending || !(e.question || e.answer)}
        onClick={() => { if (!hasOther || confirm(t("admin.faq.overwrite"))) translateAll.mutate(); }}
        className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-sky-400/50 bg-sky-500/15 px-3 py-2 text-sm font-bold text-sky-100 hover:bg-sky-500/25 disabled:opacity-50">
        <Languages className="w-4 h-4" /> {translateAll.isPending ? t("admin.faq.translating") : t("admin.faq.translate")}
      </button>
      {(["zh", "id"] as const).map((l) => (
        <div key={l} className="mb-2 rounded-lg border border-white/10 p-2">
          <p className="mb-1 text-[11px] font-semibold text-white/50">{t(l === "zh" ? "admin.faq.inZh" : "admin.faq.inId")}</p>
          <input value={e.i18n?.[l]?.question || ""} onChange={(x) => setE({ ...e, i18n: { ...(e.i18n || {}), [l]: { ...(e.i18n?.[l] || {}), question: x.target.value } } })} placeholder={t("admin.faq.question")} className={inp + " w-full mb-1"} />
          <textarea value={e.i18n?.[l]?.answer || ""} onChange={(x) => setE({ ...e, i18n: { ...(e.i18n || {}), [l]: { ...(e.i18n?.[l] || {}), answer: x.target.value } } })} placeholder={t("admin.faq.answer")} rows={2} className={inp + " w-full"} />
        </div>
      ))}
      <input value={e.keywords || ""} onChange={(x) => setE({ ...e, keywords: x.target.value })} placeholder={t("admin.faq.keywords")} className={inp + " w-full mb-2"} />
      <div className="flex gap-2">
        <button onClick={() => onSave(e)} className={btnSave + " flex-1 justify-center"}><Check className="w-4 h-4" /> {t("admin.c.save")}</button>
        <button onClick={() => onDelete(f.id)} className={btnDel + " justify-center"}><Trash2 className="w-4 h-4" /> {t("admin.c.delete")}</button>
      </div>
    </Card>
  );
}

const inp = "min-w-0 max-w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400/60";
const btn = "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-black text-sm bg-amber-400 hover:bg-amber-300";
const btnSm = "inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10";
const btnSave = "inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-bold bg-emerald-500 text-black hover:bg-emerald-400";
const btnDel = "inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold text-red-200 bg-red-500/15 border border-red-400/40 hover:bg-red-500/25";
function Card({ children }: any) { return <div className="rounded-2xl bg-white/5 border border-white/10 p-4">{children}</div>; }
function Empty({ text }: any) { return <div className="text-center py-12 text-white/40">{text}</div>; }

// Type-ahead member picker — type a name/username and pick from a dropdown of
// real users. `value` is the chosen code (referral/username/email); onChange
// receives the code, onPick gives the full row (id + name).
function UserPicker({ value, onChange, onPick, placeholder }: { value: string; onChange: (code: string) => void; onPick?: (u: any) => void; placeholder?: string }) {
  const [q, setQ] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState("");
  const { t: tr } = useTranslation();
  useEffect(() => { setQ(value || ""); }, [value]);
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 200); return () => clearTimeout(t); }, [q]);
  const { data: results = [] } = useQuery<any[]>({
    queryKey: ["/api/reborn/admin/user-search", debounced],
    queryFn: () => apiRequest("GET", `/api/reborn/admin/user-search?q=${encodeURIComponent(debounced)}`).then((r) => r.json()),
    enabled: open && debounced.trim().length >= 1,
  });
  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder || tr("admin.up.placeholder")}
        className={inp + " w-full"}
      />
      {open && results.length > 0 && (
        <div className="absolute z-20 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl bg-[#0a1e26] border border-white/15 shadow-xl">
          {results.map((u) => (
            <button key={u.id} type="button" onMouseDown={(e) => { e.preventDefault(); setQ(u.code); onChange(u.code); onPick?.(u); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 hover:bg-white/10 border-b border-white/5 last:border-0">
              <p className="text-sm text-white font-semibold truncate">{u.name}</p>
              <p className="text-[11px] text-white/40 truncate">{[u.username && "@" + u.username, u.email, u.code].filter(Boolean).join(" · ")}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── HR: attendance, schedule, leave ──────────────────────────────────
const HR_STATUS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-300", approved: "bg-emerald-500/20 text-emerald-300", rejected: "bg-red-500/20 text-red-300",
};
const timeStr = (iso?: string | null) => iso ? new Date(iso).toLocaleTimeString(localeTag(), { hour: "numeric", minute: "2-digit" }) : "—";

function StaffLeaderboard() {
  const { t } = useTranslation();
  const [industry,setIndustry]=useState("");
  const { data: industries=[] }=useQuery<string[]>({queryKey:["/api/reborn/industries"],queryFn:()=>apiRequest("GET","/api/reborn/industries").then(r=>r.json())});
  const { data: rows=[] }=useQuery<any[]>({queryKey:["/api/reborn/staff/leaderboard",industry],queryFn:()=>apiRequest("GET",`/api/reborn/staff/leaderboard${industry?`?industry=${encodeURIComponent(industry)}`:""}`).then(r=>r.json()),refetchInterval:5000});
  return <div className="space-y-3">
    {industries.length>0&&<div className="flex items-center gap-2 flex-wrap"><span className="text-xs text-white/50">{t("admin.c.industry")}</span>{["",...industries].map((d)=><button key={d||"all"} onClick={()=>setIndustry(d)} className={`rounded-full px-3 py-1 text-xs ${industry===d?"bg-amber-400 text-black font-bold":"bg-white/5 text-white/60"}`}>{d?indLabel(d):t("admin.lb.allSales")}</button>)}</div>}
    {rows.length===0&&<Empty text={t("admin.lb.empty")}/>}{rows.map((r:any)=><Card key={r.user_id}><div className={`flex items-center justify-between ${r.redFlag?"text-red-300":""}`}><div><b>#{r.rank} · {r.name}</b><p className="text-xs text-white/45">{r.position||t("admin.c.staff")}</p></div><div className="text-right"><b>⭐ {Number(r.rating).toFixed(1)}</b><p className="text-xs text-white/45">{moneySymbol()} {Number(r.weekly_sales).toLocaleString()}{industry?` · ${indLabel(industry)}`:""} · {t("admin.lb.reviews", { n: r.review_count })}</p></div></div>{r.redFlag&&<p className="mt-2 text-xs text-red-300">{t("admin.lb.redFlag")}</p>}</Card>)}</div>;
}
function CompanyFeedback() {
  const { t } = useTranslation();
  const { data: rows=[] }=useQuery<any[]>({queryKey:["/api/reborn/staff/feedback"],queryFn:()=>apiRequest("GET","/api/reborn/staff/feedback").then(r=>r.json()),refetchInterval:5000});
  return <div className="space-y-3"><a href="/staff-feedback" className={btn+" w-full justify-center"}>{t("admin.fb.open")}</a>{rows.length===0&&<Empty text={t("admin.fb.empty")}/>}{rows.map((f:any)=><Card key={f.id}><div className="flex justify-between gap-3"><b className="capitalize">{t("admin.fb.category", { c: tv(t, "admin.fb.cat." + f.category, f.category) })}</b><span className="text-xs text-white/35">{new Date(f.created_at).toLocaleString(localeTag())}</span></div><p className="mt-2 text-sm text-white/75">{f.message}</p><p className="mt-2 text-xs text-white/40">{f.user_name||t("admin.c.customer")}{f.staff_name?` → ${f.staff_name}`:""}{f.rating?` · ${t("admin.fb.stars", { n: f.rating })}`:""}</p></Card>)}</div>;
}

// Manager › Daily sales: the venue day's sales total and every salesperson's target
// (the day is closed from the POS: "Close POS day").
function DailySales() {
  const { t } = useTranslation();
  const [day, setDay] = useState("");
  const url = `/api/reborn/manager/daily-sales${day ? `?day=${day}` : ""}`;
  const { data: d } = useQuery<any>({ queryKey: [url], queryFn: () => apiRequest("GET", url).then((r) => r.json()), refetchInterval: 30000 });
  const tot = d?.report?.totals || {};
  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-extrabold flex items-center gap-2"><Coins className="w-5 h-5 text-emerald-300" /> {t("admin.sales.title")}</h3>
          <input type="date" value={day || d?.day || ""} onChange={(e) => setDay(e.target.value)} className={inp} />
        </div>
        <p className="text-xs text-white/50 mt-1">{t("admin.sales.hint")}</p>
        <p className="mt-3 text-3xl font-black text-emerald-300">{money(tot.revenue)}</p>
        <p className="text-xs text-white/60">{t("admin.sales.bills", { n: d?.report?.ticketCount || 0 })}{d?.closed ? ` · ✓ ${t("admin.sales.closed")}` : ""}</p>
        <div className="flex gap-2 mt-3 text-center">
          {[["cash", tot.cash], ["card", tot.card], ["credits", tot.credits], ...(Number(tot.packageCredit) > 0 ? [["packageCredit", tot.packageCredit]] : [])].map(([k, v]) => (
            <div key={k as string} className="flex-1 min-w-0 rounded-xl bg-black/30 border border-white/10 p-2"><p className="text-[11px] text-white/50">{t(`admin.sales.${k}`)}</p><p className="text-sm font-bold">{money(v)}</p></div>
          ))}
        </div>
        <p className="text-[11px] text-white/45 mt-2">{t("admin.sales.breakdown", { discount: money(tot.discount), service: money(tot.serviceFee), tax: money(tot.tax) })}</p>
      </Card>
      {(d?.report?.items || []).length > 0 && <Card>
        <p className="font-bold text-sm mb-2">{t("admin.sales.topItems")}</p>
        <div className="space-y-1">{d.report.items.slice(0, 10).map((it: any) => (
          <div key={it.name} className="flex justify-between text-xs"><span className="text-white/75 truncate">{it.quantity} × {it.name}</span><span className="text-amber-200 font-semibold">{money(it.sales)}</span></div>
        ))}</div>
      </Card>}
      <Card>
        <div className="flex items-center justify-between"><p className="font-bold text-sm">{t("admin.sales.targets", { month: d?.month || "" })}</p><p className="text-xs text-white/60">{t("admin.sales.monthTotal", { total: money(d?.monthTotal) })}</p></div>
        {(d?.targets || []).length === 0 ? <p className="text-xs text-white/40 mt-2">{t("admin.sales.noTargets")}</p> : (
          <div className="space-y-2.5 mt-3">{d.targets.map((r: any) => <TargetBar key={r.userId} r={r} money={money} />)}</div>
        )}
      </Card>
    </div>
  );
}
function TargetBar({ r, money }: { r: any; money: (v: any) => string }) {
  const { t } = useTranslation();
  const pct = r.percent ?? 0;
  const col = r.target <= 0 ? "#64748b" : pct >= 100 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div>
      <div className="flex justify-between text-xs"><span className="font-semibold text-white/85">{r.name}</span><span className="text-white/60">{money(r.sales)}{r.target > 0 ? ` / ${money(r.target)} · ${pct}%` : ` · ${t("admin.target.none")}`}</span></div>
      <div className="h-2 rounded-full bg-white/10 mt-1 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(100, r.target > 0 ? pct : 0)}%`, background: col }} /></div>
      <p className="text-[10px] text-white/40 mt-0.5">{t("admin.target.todayBills", { today: money(r.today), n: r.tickets })}</p>
    </div>
  );
}
// Staff › My target: my sales this month (credited on POS bills) vs the target the admin set.
function MyTarget() {
  const { t } = useTranslation();
  const { data: r } = useQuery<any>({ queryKey: ["/api/reborn/staff/my-target"], queryFn: () => apiRequest("GET", "/api/reborn/staff/my-target").then((x) => x.json()), refetchInterval: 60000 });
  if (!r) return null;
  return (
    <Card>
      <p className="font-bold text-sm mb-2 flex items-center gap-2"><Star className="w-4 h-4 text-amber-300" /> {t("admin.target.mine", { month: r.month })}</p>
      <TargetBar r={{ ...r, name: t("admin.target.thisMonth") }} money={money} />
      {r.target > 0 && r.sales < r.target && <p className="text-xs text-amber-200/80 mt-2">{t("admin.target.left", { left: money(r.target - r.sales) })}</p>}
      {r.target > 0 && r.sales >= r.target && <p className="text-xs text-emerald-300 mt-2">🎉 {t("admin.target.hit")}</p>}
      <a href="/reborn-admin?tab=Bookings" onClick={(e) => { e.preventDefault(); window.location.href = "/reborn-admin?tab=Bookings"; }} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-amber-300"><CalendarDays className="w-3.5 h-3.5" /> {t("admin.target.bookForCustomer")}</a>
    </Card>
  );
}

function StaffHr({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useTranslation();
  const [view, setView] = useState<"me" | "manage">(isAdmin ? "manage" : "me");
  return (
    <div className="space-y-3">
      {isAdmin && (
        <div className="flex gap-2">
          <button onClick={() => setView("manage")} className={`flex-1 py-2 rounded-lg text-xs font-semibold ${view === "manage" ? "bg-amber-400 text-black" : "bg-white/5 text-white/60"}`}>{t("admin.hr.manage")}</button>
          <button onClick={() => setView("me")} className={`flex-1 py-2 rounded-lg text-xs font-semibold ${view === "me" ? "bg-amber-400 text-black" : "bg-white/5 text-white/60"}`}>{t("admin.hr.mine")}</button>
        </div>
      )}
      {view === "me" ? <><MyTarget /><MyHr /></> : <ManageHr />}
    </div>
  );
}

// Live camera QR scanner overlay — reads the workplace attendance QR and returns its code.
function QrScanOverlay({ onDetect, onClose }: { onDetect: (code: string) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let scanner: any; let cancelled = false;
    (async () => {
      try {
        const QrScanner = (await import("qr-scanner")).default;
        if (!videoRef.current || cancelled) return;
        scanner = new QrScanner(videoRef.current, (result: any) => {
          const data = typeof result === "string" ? result : result?.data;
          if (!data) return;
          let code = data;
          try { code = new URL(data).searchParams.get("c") || data; } catch { /* raw code, not a URL */ }
          try { scanner?.stop(); } catch {}
          onDetect(code);
        }, { returnDetailedScanResult: true, highlightScanRegion: true, preferredCamera: "environment" });
        await scanner.start();
      } catch (e: any) { setErr(e?.message || translate("admin.qr.camErr")); }
    })();
    return () => { cancelled = true; try { scanner?.stop(); scanner?.destroy(); } catch {} };
  }, []);
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
      <video ref={videoRef} className="w-full max-w-sm rounded-2xl aspect-square object-cover bg-black" muted playsInline />
      <p className="text-white/70 text-sm mt-3 text-center">{t("admin.qr.point")}</p>
      {err && <p className="text-red-400 text-sm mt-2 text-center max-w-sm">{err}</p>}
      <button onClick={onClose} className="mt-4 px-6 py-2.5 rounded-xl font-bold bg-white/10 text-white">{t("admin.c.cancel")}</button>
    </div>
  );
}

function MyHr() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [scan, setScan] = useState(false);
  const { data: att = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/staff/my-attendance"], queryFn: () => apiRequest("GET", "/api/reborn/staff/my-attendance").then((r) => r.json()) });
  const { data: shifts = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/staff/my-shifts"], queryFn: () => apiRequest("GET", "/api/reborn/staff/my-shifts").then((r) => r.json()) });
  const { data: leave = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/staff/my-leave"], queryFn: () => apiRequest("GET", "/api/reborn/staff/my-leave").then((r) => r.json()) });
  const today = new Date().toISOString().slice(0, 10);
  const openToday = att.find((a) => a.workDate === today && !a.checkOutAt);
  const [photo, setPhoto] = useState("");
  const doAct = useMutation({
    mutationFn: (v: { path: string; body?: any }) => apiRequest("POST", v.path, v.body || {}).then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
    onSuccess: ({ ok, d }: any) => { if (!ok) { toast({ title: t("admin.c.failed"), description: d.message, variant: "destructive" }); return; } toast({ title: t("admin.c.done") }); setPhoto(""); qc.invalidateQueries({ queryKey: ["/api/reborn/staff/my-attendance"] }); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }),
  });
  const [lv, setLv] = useState<any>({ type: "leave", startDate: today, endDate: today, reason: "", attachmentUrl: "" });
  const applyLeave = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/staff/leave", lv).then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
    onSuccess: ({ ok, d }: any) => { if (!ok) { toast({ title: t("admin.c.failed"), description: d.message, variant: "destructive" }); return; } toast({ title: t("admin.hr.leaveRequested") }); setLv({ type: "leave", startDate: today, endDate: today, reason: "", attachmentUrl: "" }); qc.invalidateQueries({ queryKey: ["/api/reborn/staff/my-leave"] }); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }),
  });
  return (
    <div className="space-y-3">
      <Card>
        <h3 className="font-bold mb-2 flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-amber-300" /> {t("admin.hr.attendance")}</h3>
        {openToday ? (
          <div className="space-y-2">
            <p className="text-[11px] text-white/50">{t("admin.hr.checkedInSince", { time: timeStr(openToday.checkInAt) })}{openToday.onBreak ? t("admin.hr.onBreak") : ""}</p>
            <div className="grid grid-cols-2 gap-2">
              {openToday.onBreak
                ? <button onClick={() => doAct.mutate({ path: "/api/reborn/staff/break", body: { start: false } })} disabled={doAct.isPending} className="py-2.5 rounded-xl text-sm font-bold bg-amber-400 text-black">{t("admin.hr.backFromBreak")}</button>
                : <button onClick={() => doAct.mutate({ path: "/api/reborn/staff/break", body: { start: true } })} disabled={doAct.isPending} className="py-2.5 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-white/80">{t("admin.hr.break")}</button>}
              <button onClick={() => doAct.mutate({ path: "/api/reborn/staff/check-out" })} disabled={doAct.isPending || openToday.onBreak} className="py-2.5 rounded-xl text-sm font-bold bg-red-400 text-black disabled:opacity-50 inline-flex items-center justify-center gap-1"><LogOut className="w-4 h-4" /> {t("admin.hr.checkOut")}</button>
            </div>
            {openToday.onBreak && <p className="text-[11px] text-amber-300/80">{t("admin.hr.endBreakFirst")}</p>}
          </div>
        ) : (
          <div className="space-y-2">
            <button onClick={() => setScan(true)} className="w-full justify-center inline-flex items-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-amber-400 text-black"><QrCode className="w-4 h-4" /> {t("admin.hr.scanQr")}</button>
            <p className="text-[11px] text-white/40 text-center">{t("admin.hr.orPhoto")}</p>
            <p className="text-[11px] text-white/50">{t("admin.hr.photoHint")}</p>
            <ImageUpload value={photo} onChange={(v: any) => setPhoto(v)} label={t("admin.hr.takePhoto")} output="webp" maxDim={1000} />
            <button onClick={() => doAct.mutate({ path: "/api/reborn/staff/check-in", body: { photo } })} disabled={!photo || doAct.isPending} className={btn + " w-full justify-center disabled:opacity-50"}><LogIn className="w-4 h-4" /> {t("admin.hr.checkIn")}</button>
          </div>
        )}
      </Card>
      {scan && <QrScanOverlay onClose={() => setScan(false)} onDetect={(code) => { setScan(false); doAct.mutate({ path: "/api/reborn/staff/check-in", body: { code } }); }} />}
      <Card>
        <p className="font-bold mb-2 text-sm">{t("admin.hr.recent")}</p>
        {att.length === 0 && <p className="text-xs text-white/40">{t("admin.hr.noRecords")}</p>}
        {att.slice(0, 14).map((a) => (
          <div key={a.id} className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
            <span className="text-white/70">{a.workDate}</span>
            <span className="text-white/50 text-xs">{timeStr(a.checkInAt)} – {timeStr(a.checkOutAt)}{a.overtimeSeconds > 0 ? ` · ${t("admin.hr.ot", { h: (a.overtimeSeconds / 3600).toFixed(1) })}` : ""}</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${HR_STATUS[a.status] || HR_STATUS.approved}`}>{tv(t, "admin.st." + a.status, a.status)}</span>
          </div>
        ))}
      </Card>
      <Card>
        <p className="font-bold mb-2 flex items-center gap-2 text-sm"><CalendarClock className="w-4 h-4 text-amber-300" /> {t("admin.hr.myShifts")}</p>
        {shifts.filter((s) => s.shiftDate >= today).length === 0 && <p className="text-xs text-white/40">{t("admin.hr.noShifts")}</p>}
        {shifts.filter((s) => s.shiftDate >= today).slice(0, 20).map((s) => (
          <div key={s.id} className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
            <span className="text-white/70">{s.shiftDate}{s.role ? ` · ${s.role}` : ""}</span>
            <span className="text-amber-300 text-xs font-semibold">{s.startTime}–{s.endTime}</span>
          </div>
        ))}
      </Card>
      <Card>
        <p className="font-bold mb-2 flex items-center gap-2 text-sm"><Plane className="w-4 h-4 text-amber-300" /> {t("admin.hr.applyLeave")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <select value={lv.type} onChange={(e) => setLv({ ...lv, type: e.target.value })} className={inp}><option value="leave">{t("admin.hr.leave")}</option><option value="mc">{t("admin.hr.mcLong")}</option></select>
          <div />
          <label className="text-xs text-white/50">{t("admin.hr.from")}<input type="date" value={lv.startDate} onChange={(e) => setLv({ ...lv, startDate: e.target.value })} className={inp + " w-full"} style={{ colorScheme: "dark" }} /></label>
          <label className="text-xs text-white/50">{t("admin.hr.to")}<input type="date" value={lv.endDate} onChange={(e) => setLv({ ...lv, endDate: e.target.value })} className={inp + " w-full"} style={{ colorScheme: "dark" }} /></label>
        </div>
        <textarea value={lv.reason} onChange={(e) => setLv({ ...lv, reason: e.target.value })} placeholder={t("admin.hr.reasonReq")} rows={2} className={inp + " w-full mb-2"} />
        {lv.type === "mc" && <div className="mb-2"><p className="text-[11px] text-white/50 mb-1">{t("admin.hr.mcDoc")}</p><ImageUpload value={lv.attachmentUrl} onChange={(v: any) => setLv({ ...lv, attachmentUrl: v })} label={t("admin.hr.uploadMc")} output="jpeg" maxDim={1200} /></div>}
        <button onClick={() => applyLeave.mutate()} disabled={!lv.reason.trim() || applyLeave.isPending} className={btn + " disabled:opacity-50"}><Plus className="w-4 h-4" /> {t("admin.hr.submit")}</button>
      </Card>
      <Card>
        <p className="font-bold mb-2 text-sm">{t("admin.hr.myLeave")}</p>
        {leave.length === 0 && <p className="text-xs text-white/40">{t("admin.hr.noneYet")}</p>}
        {leave.map((l) => (
          <div key={l.id} className="py-1.5 border-b border-white/5 last:border-0">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/70">{l.type === "mc" ? t("admin.hr.mc") : t("admin.hr.leave")} · {l.startDate}{l.endDate !== l.startDate ? `→${l.endDate}` : ""}</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${HR_STATUS[l.status]}`}>{tv(t, "admin.st." + l.status, l.status)}{l.status === "approved" ? (l.paid ? ` · ${t("admin.hr.paidLc")}` : ` · ${t("admin.hr.unpaidLc")}`) : ""}</span>
            </div>
            {l.decisionNote && <p className="text-[11px] text-white/40 mt-0.5">{t("admin.hr.note", { note: l.decisionNote })}</p>}
          </div>
        ))}
      </Card>
    </div>
  );
}

function ManageHr() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: attendance = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/attendance"], queryFn: () => apiRequest("GET", "/api/reborn/admin/attendance").then((r) => r.json()) });
  const { data: staff = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/staff-list"], queryFn: () => apiRequest("GET", "/api/reborn/admin/staff-list").then((r) => r.json()) });
  const { data: leave = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/leave", "pending"], queryFn: () => apiRequest("GET", "/api/reborn/admin/leave?status=pending").then((r) => r.json()) });
  const delPhoto = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/reborn/admin/attendance/${id}/photo`, {}).then((r) => r.json()),
    onSuccess: () => { toast({ title: t("admin.hr.photoDeleted") }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/attendance"] }); },
  });
  const decideLeave = useMutation({
    mutationFn: (v: any) => apiRequest("POST", `/api/reborn/admin/leave/${v.id}/decide`, v).then((r) => r.json()),
    onSuccess: () => { toast({ title: t("admin.c.updated") }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/leave", "pending"] }); },
  });
  const today = new Date().toISOString().slice(0, 10);
  const [sh, setSh] = useState<any>({ userId: "", shiftDate: today, startTime: "18:00", endTime: "02:00", role: "" });
  const [schedFrom, setSchedFrom] = useState(today);
  const { data: shifts = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/shifts", schedFrom], queryFn: () => apiRequest("GET", `/api/reborn/admin/shifts?from=${schedFrom}&to=2999-12-31`).then((r) => r.json()) });
  const addShift = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/shifts", sh).then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
    onSuccess: ({ ok, d }: any) => { if (!ok) { toast({ title: t("admin.c.failed"), description: d.message, variant: "destructive" }); return; } toast({ title: t("admin.hr.shiftAdded") }); setSh({ ...sh, role: "" }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/shifts", schedFrom] }); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }),
  });
  const delShift = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/reborn/admin/shifts/${id}`, {}).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/reborn/admin/shifts", schedFrom] }),
  });
  const { data: attendCode } = useQuery<any>({ queryKey: ["/api/reborn/admin/attendance/code"], queryFn: () => apiRequest("GET", "/api/reborn/admin/attendance/code").then((r) => r.json()) });
  const rotateCode = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/attendance/rotate", {}).then((r) => r.json()),
    onSuccess: () => { toast({ title: t("admin.hr.qrNew"), description: t("admin.hr.qrNewDesc") }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/attendance/code"] }); },
  });
  return (
    <div className="space-y-3">
      <Card>
        <p className="font-bold mb-2 flex items-center gap-2 text-sm"><QrCode className="w-4 h-4 text-amber-300" /> {t("admin.hr.qrTitle")}</p>
        <p className="text-[11px] text-white/40 mb-3">{t("admin.hr.qrHint")}</p>
        <div className="flex flex-col items-center gap-3">
          <div className="bg-white rounded-2xl p-3 w-44"><img src={`/api/reborn/admin/attendance/qr?v=${encodeURIComponent(attendCode?.code || "")}`} alt={t("admin.hr.qrTitle")} className="w-full aspect-square" /></div>
          <div className="flex gap-2 w-full">
            <button onClick={() => window.open(`/api/reborn/admin/attendance/qr?v=${encodeURIComponent(attendCode?.code || "")}`, "_blank")} className={btnSm + " flex-1 justify-center"}>{t("admin.hr.openPrint")}</button>
            <button onClick={() => { if (confirm(t("admin.hr.qrConfirm"))) rotateCode.mutate(); }} disabled={rotateCode.isPending} className={btnSm + " flex-1 justify-center disabled:opacity-50"}><RefreshCw className="w-4 h-4" /> {t("admin.hr.newQr")}</button>
          </div>
        </div>
      </Card>
      <Card>
        <p className="font-bold mb-2 flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-amber-300" /> {t("admin.hr.attendance")}</p>
        <p className="text-[11px] text-white/40 mb-2">{t("admin.hr.attHint")}</p>
        {attendance.length === 0 && <p className="text-xs text-white/40">{t("admin.hr.noCheckins")}</p>}
        {attendance.slice(0, 60).map((a) => (
          <div key={a.id} className="flex items-center gap-2 text-sm py-2 border-b border-white/5 last:border-0">
            {a.checkInPhoto
              ? <a href={a.checkInPhoto} target="_blank" rel="noreferrer"><img src={a.checkInPhoto} alt={t("admin.hr.checkInAlt")} className="w-11 h-11 rounded-lg object-cover border border-white/10 flex-shrink-0" /></a>
              : <span className="w-11 h-11 rounded-lg bg-white/5 flex-shrink-0 flex items-center justify-center text-[9px] text-white/30">{t("admin.hr.noPhoto")}</span>}
            <div className="min-w-0 flex-1">
              <p className="truncate text-white/80">{a.staffName}{a.onBreak ? " ☕" : ""}</p>
              <p className="text-[11px] text-white/40">{a.workDate} · {timeStr(a.checkInAt)}–{timeStr(a.checkOutAt)}{a.overtimeSeconds > 0 ? ` · ${t("admin.hr.ot", { h: (a.overtimeSeconds / 3600).toFixed(1) })}` : ""}{a.breakSeconds > 0 ? ` · ${t("admin.hr.breakMin", { m: Math.round(a.breakSeconds / 60) })}` : ""}</p>
            </div>
            {a.checkInPhoto && <button onClick={() => { if (confirm(t("admin.hr.delPhotoConfirm"))) delPhoto.mutate(a.id); }} className={btnSm + " flex-shrink-0"} title={t("admin.hr.delPhoto")}><Trash2 className="w-4 h-4" /></button>}
          </div>
        ))}
      </Card>
      <Card>
        <p className="font-bold mb-2 flex items-center gap-2 text-sm"><Plane className="w-4 h-4 text-amber-300" /> {t("admin.hr.toApprove")}</p>
        {leave.length === 0 && <p className="text-xs text-white/40">{t("admin.hr.nothingPending")}</p>}
        {leave.map((l) => (
          <div key={l.id} className="py-2 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-white/80">{l.staffName}</span>
              <span className="text-[11px] text-white/40">{l.type === "mc" ? t("admin.hr.mc") : t("admin.hr.leave")} · {l.startDate}{l.endDate !== l.startDate ? `→${l.endDate}` : ""}</span>
              {l.attachmentUrl && <a href={l.attachmentUrl} target="_blank" rel="noreferrer" className="text-[11px] text-amber-300 underline">{t("admin.hr.doc")}</a>}
            </div>
            <p className="text-xs text-white/50 mb-2">{l.reason}</p>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => decideLeave.mutate({ id: l.id, approve: true, paid: true })} className={btnSave}><Check className="w-4 h-4" /> {t("admin.hr.paid")}</button>
              <button onClick={() => decideLeave.mutate({ id: l.id, approve: true, paid: false })} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-bold bg-amber-400 text-black hover:bg-amber-300"><Check className="w-4 h-4" /> {t("admin.hr.unpaid")}</button>
              <button onClick={() => { const note = prompt(t("admin.hr.rejectPrompt"), "") ?? undefined; decideLeave.mutate({ id: l.id, approve: false, note }); }} className={btnDel}><X className="w-4 h-4" /> {t("admin.c.reject")}</button>
            </div>
          </div>
        ))}
      </Card>
      <Card>
        <p className="font-bold mb-2 flex items-center gap-2 text-sm"><CalendarClock className="w-4 h-4 text-amber-300" /> {t("admin.hr.addShiftTitle")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <select value={sh.userId} onChange={(e) => setSh({ ...sh, userId: e.target.value })} className={inp + " col-span-2"}>
            <option value="">{t("admin.hr.chooseWorker")}</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name} ({tv(t, "admin.role." + s.role, s.role)})</option>)}
          </select>
          <label className="text-xs text-white/50 col-span-2">{t("admin.hr.date")}<input type="date" value={sh.shiftDate} onChange={(e) => setSh({ ...sh, shiftDate: e.target.value })} className={inp + " w-full"} style={{ colorScheme: "dark" }} /></label>
          <label className="text-xs text-white/50">{t("admin.hr.start")}<input type="time" value={sh.startTime} onChange={(e) => setSh({ ...sh, startTime: e.target.value })} className={inp + " w-full"} style={{ colorScheme: "dark" }} /></label>
          <label className="text-xs text-white/50">{t("admin.hr.end")}<input type="time" value={sh.endTime} onChange={(e) => setSh({ ...sh, endTime: e.target.value })} className={inp + " w-full"} style={{ colorScheme: "dark" }} /></label>
          <input value={sh.role} onChange={(e) => setSh({ ...sh, role: e.target.value })} placeholder={t("admin.hr.positionPh")} className={inp + " col-span-2"} />
        </div>
        <button onClick={() => addShift.mutate()} disabled={!sh.userId || addShift.isPending} className={btn + " disabled:opacity-50"}><Plus className="w-4 h-4" /> {t("admin.hr.addShift")}</button>
      </Card>
      <Card>
        <div className="flex items-center justify-between mb-2">
          <p className="font-bold text-sm">{t("admin.hr.schedule")}</p>
          <label className="text-xs text-white/50 flex items-center gap-1">{t("admin.hr.fromLc")} <input type="date" value={schedFrom} onChange={(e) => setSchedFrom(e.target.value)} className={inp + " w-36"} style={{ colorScheme: "dark" }} /></label>
        </div>
        {shifts.length === 0 && <p className="text-xs text-white/40">{t("admin.hr.noShiftsRange")}</p>}
        {shifts.map((s) => (
          <div key={s.id} className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0 gap-2">
            <div className="min-w-0"><p className="truncate text-white/80">{s.staffName}{s.role ? ` · ${s.role}` : ""}</p><p className="text-[11px] text-white/40">{s.shiftDate}</p></div>
            <span className="text-amber-300 text-xs font-semibold flex-shrink-0">{s.startTime}–{s.endTime}</span>
            <button onClick={() => { if (confirm(t("admin.hr.removeShift"))) delShift.mutate(s.id); }} className={btnSm + " flex-shrink-0"}><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </Card>
    </div>
  );
}

const INDUSTRY_LABELS: Record<string, string> = { restaurant: "Restaurant", bar: "Bar", nightclub: "Nightclub", ktv: "KTV", foodcourt: "Food Court", beauty: "Beauty/Spa", retail: "Retail", grocery: "Grocery", hotel: "Hotel", gym: "Gym", pet: "Pet", workshop: "Workshop", repair: "Repair", laundry: "Laundry", rental: "Rental", education: "Education" };
// A product's department holds one or more industries as a comma-separated list (e.g. "KTV,Bar,Restaurant").
const deptList = (d?: string | null): string[] => (d || "").split(",").map((s) => s.trim()).filter(Boolean);
const deptHas = (d: string | null | undefined, ind: string): boolean => deptList(d).includes(ind);
// Industry values are stored in English (e.g. "Food Court"); show them in the current language.
const indLabel = (v: string): string => { const k = Object.keys(INDUSTRY_LABELS).find((x) => INDUSTRY_LABELS[x] === v); return k ? translate("admin.ind." + k) : v; };
const deptLabel = (d?: string | null): string => deptList(d).map(indLabel).join(" · ");

function IndustryPicker({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  const sel = new Set(deptList(value));
  const toggle = (o: string) => { const s = new Set(sel); s.has(o) ? s.delete(o) : s.add(o); onChange(Array.from(s).join(",")); };
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {options.length === 0 && <span className="text-xs text-white/30">{t("admin.prod.noIndustries")}</span>}
      {options.map((o) => <button type="button" key={o} onClick={() => toggle(o)} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${sel.has(o) ? "bg-amber-400 text-black border-amber-400" : "bg-white/5 text-white/60 border-white/10"}`}>{indLabel(o)}</button>)}
    </div>
  );
}

// Package settings of a POS product (server/memberPackages.ts): a normal product (that
// can or can't be paid with package credit), a visits package or a prepaid credit package.
const pkgOf = (p: any) => ({ packageKind: p?.packageKind || "", packageUses: p?.packageUses || "", packageCredit: p?.packageCredit ? Number(p.packageCredit) : "", packageValidDays: p?.packageValidDays || "", perkPercent: p?.perkPercent ? Number(p.perkPercent) : "", perkDays: p?.perkDays || "", creditOk: p?.creditOk !== false });
function PackageFields({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const { t } = useTranslation();
  const set = (k: string, v: any) => onChange({ ...value, [k]: v });
  const num = (k: string, label: string, hint?: string) => (
    <label className="text-xs text-white/50">{label}<input type="number" inputMode="numeric" min={0} value={value[k] ?? ""} onFocus={(e) => e.currentTarget.select()} onChange={(e) => set(k, e.target.value === "" ? "" : Number(e.target.value))} placeholder={hint} className={inp + " w-full"} /></label>
  );
  return (
    <div className="mb-2 rounded-xl border border-white/10 p-2.5">
      <p className="text-xs font-semibold text-white/70 mb-1.5">📦 {t("admin.pkg.title")}</p>
      <div className="grid gap-1.5 mb-2" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        {([["", t("admin.pkg.normal")], ["uses", t("admin.pkg.uses")], ["credit", t("admin.pkg.credit")]] as const).map(([k, l]) => (
          <div key={k} role="button" tabIndex={0} onClick={() => set("packageKind", k)} onKeyDown={(e) => { if (e.key === "Enter") set("packageKind", k); }} className={`cursor-pointer rounded-lg px-2 py-1.5 text-center text-xs font-semibold ${value.packageKind === k ? "bg-amber-400 text-black" : "bg-white/5 text-white/60"}`}>{l}</div>
        ))}
      </div>
      {!value.packageKind && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.creditOk !== false} onChange={(e) => set("creditOk", e.target.checked)} /> {t("admin.pkg.creditOk")} <span className="text-white/40 text-xs">{t("admin.pkg.creditOkHint")}</span></label>}
      {value.packageKind === "uses" && <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{num("packageUses", t("admin.pkg.usesN"), "10")}{num("packageValidDays", t("admin.pkg.validDays"), t("admin.pkg.never"))}</div>}
      {value.packageKind === "credit" && <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{num("packageCredit", t("admin.pkg.creditAmt"), "10000000")}{num("packageValidDays", t("admin.pkg.validDays"), t("admin.pkg.never"))}{num("perkPercent", t("admin.pkg.perkPct"), "5")}{num("perkDays", t("admin.pkg.perkDays"), t("admin.pkg.lifetime"))}</div>
        <p className="mt-1.5 text-[11px] text-white/40">{t("admin.pkg.creditHint")}</p>
      </>}
      {value.packageKind && <p className="mt-1.5 text-[11px] text-white/40">{t("admin.pkg.sellHint")}</p>}
    </div>
  );
}
// Short label of a product's package setting (lists and the table's Package button).
function pkgTag(p: any, t: (k: string, v?: any) => string) {
  if (p.packageKind === "uses") return t("admin.pkg.tagUses", { n: p.packageUses || 1 });
  if (p.packageKind === "credit") return t("admin.pkg.tagCredit", { n: Number(p.packageCredit || 0).toLocaleString() });
  return p.creditOk === false ? t("admin.pkg.tagNoCredit") : "";
}
// Desktop table: package settings open in a small dialog.
function PackageButton({ p }: { p: any }) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(pkgOf(p));
  const save = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/reborn/admin/pos/products/${p.id}`, v).then((r) => r.json()),
    onSuccess: () => { toast({ title: t("admin.c.saved") }); setOpen(false); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }),
  });
  return <>
    <button onClick={() => { setV(pkgOf(p)); setOpen(true); }} className="rounded-lg bg-white/5 px-2 py-1 text-xs text-white/70 hover:bg-white/10 whitespace-nowrap">{pkgTag(p, t) || "—"}</button>
    {open && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#160f2a] p-4 text-left" onClick={(e) => e.stopPropagation()}>
        <p className="mb-2 font-bold">{p.name}</p>
        <PackageFields value={v} onChange={setV} />
        <div className="flex justify-end gap-2"><button onClick={() => setOpen(false)} className={btnSm + " text-white/60"}><X className="w-4 h-4" /></button><button onClick={() => save.mutate()} disabled={save.isPending} className={btnSm + " text-emerald-400"}><Check className="w-4 h-4" /></button></div>
      </div>
    </div>}
  </>;
}

function Products() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const modules = useModules();
  const { data: products = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/pos/products"], queryFn: () => apiRequest("GET", "/api/reborn/pos/products").then((r) => r.json()) });
  const [n, setN] = useState<any>({ name: "", category: "General", department: "", price: 0, cost: 0, stock: 0, imageUrl: "", supplierName: "", supplierAddress: "", supplierPhone: "", posVisible: true, ...pkgOf(null) });
  const [industry, setIndustry] = useState("");
  const [mode, setMode] = useState<"new" | "restock">("new");
  const [rs, setRs] = useState<any>({ productId: "", supplier: "", qty: 1, unitCost: 0 });
  const industries = Array.from(new Set(products.flatMap((p) => deptList(p.department)))).sort();
  // Industry options = enabled industry modules + any industries already in use.
  const industryOptions = Array.from(new Set([...Object.keys(INDUSTRY_LABELS).filter((k) => moduleEnabled(modules, k)).map((k) => INDUSTRY_LABELS[k]), ...industries])).sort();
  const shown = industry ? products.filter((p) => deptHas(p.department, industry)) : products;
  const create = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/pos/products", n).then((r) => r.json()),
    onSuccess: () => { toast({ title: t("admin.prod.added") }); setN({ name: "", category: "General", department: n.department, price: 0, cost: 0, stock: 0, imageUrl: "", supplierName: "", supplierAddress: "", supplierPhone: "", posVisible: true, ...pkgOf(null) }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }),
  });
  const restock = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/pos/stock-in", { productId: Number(rs.productId), qty: Number(rs.qty), unitCost: rs.unitCost ? Number(rs.unitCost) : undefined, supplier: rs.supplier || undefined }).then((r) => r.json()),
    onSuccess: () => { toast({ title: t("admin.prod.batchAdded") }); setRs({ productId: "", supplier: "", qty: 1, unitCost: 0 }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/inventory"] }); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }),
  });
  return (
    <div className="space-y-3">
      <Card>
        <div className="mb-3 flex gap-2">
          <button onClick={() => setMode("new")} className={`flex-1 py-2 rounded-lg text-xs font-semibold ${mode === "new" ? "bg-amber-400 text-black" : "bg-white/5 text-white/60"}`}>{t("admin.prod.new")}</button>
          <button onClick={() => setMode("restock")} className={`flex-1 py-2 rounded-lg text-xs font-semibold ${mode === "restock" ? "bg-amber-400 text-black" : "bg-white/5 text-white/60"}`}>{t("admin.prod.restockTab")}</button>
        </div>
        {mode === "new" ? <>
        <label className="text-xs text-white/50 block mb-2">{t("admin.prod.name")}<input value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} placeholder={t("admin.c.eg", { v: "Heineken" })} className={inp + " w-full"} /></label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <label className="text-xs text-white/50">{t("admin.prod.category")}<input value={n.category} onChange={(e) => setN({ ...n, category: e.target.value })} placeholder={t("admin.prod.categoryPh")} className={inp + " w-full"} /></label>
          <div className="text-xs text-white/50 sm:col-span-2">{t("admin.prod.industries")} <span className="text-white/30">{t("admin.prod.industriesHint")}</span><IndustryPicker value={n.department} options={industryOptions} onChange={(v) => setN({ ...n, department: v })} /></div>
          <label className="text-xs text-white/50">{t("admin.prod.stockQty")}<input type="number" inputMode="numeric" value={n.stock || ""} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setN({ ...n, stock: Number(e.target.value) })} className={inp + " w-full"} /></label>
          <label className="text-xs text-white/50">{t("admin.prod.sellPrice")}<input type="number" inputMode="numeric" value={n.price || ""} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setN({ ...n, price: Number(e.target.value) })} className={inp + " w-full"} /></label>
          <label className="text-xs text-white/50">{t("admin.prod.unitCost")}<input type="number" inputMode="numeric" value={n.cost || ""} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setN({ ...n, cost: Number(e.target.value) })} className={inp + " w-full"} /></label>
        </div>
        <div className="mb-2 grid grid-cols-1 sm:grid-cols-2 gap-2"><input value={n.supplierName} onChange={(e)=>setN({...n,supplierName:e.target.value})} placeholder={t("admin.prod.supName")} className={inp}/><input value={n.supplierPhone} onChange={(e)=>setN({...n,supplierPhone:e.target.value})} placeholder={t("admin.prod.supPhone")} className={inp}/><input value={n.supplierAddress} onChange={(e)=>setN({...n,supplierAddress:e.target.value})} placeholder={t("admin.prod.supAddr")} className={inp+" sm:col-span-2"}/></div>
        <label className="mb-2 flex items-center gap-2 rounded-xl border border-white/10 p-2.5 text-sm"><input type="checkbox" checked={n.posVisible !== false} onChange={(e) => setN({ ...n, posVisible: e.target.checked })} /> {t("admin.prod.sellable")} <span className="text-white/40 text-xs">{t("admin.prod.sellableHint")}</span></label>
        <PackageFields value={n} onChange={setN} />
        <div className="mb-3"><p className="text-xs text-white/50 mb-1">{t("admin.prod.photo")}</p><ImageUpload value={n.imageUrl} onChange={(v) => setN({ ...n, imageUrl: v })} label={t("admin.c.uploadPhoto")} /></div>
        <button onClick={() => create.mutate()} disabled={!n.name.trim() || create.isPending} className={btn + " disabled:opacity-50"}><Plus className="w-4 h-4" /> {t("admin.c.add")}</button>
        </> : <>
        <p className="text-xs text-white/50 mb-2">{t("admin.prod.restockHint")}</p>
        <label className="text-xs text-white/50 block mb-2">{t("admin.prod.item")}<select value={rs.productId} onChange={(e) => setRs({ ...rs, productId: e.target.value })} className={inp + " w-full"}><option value="">{t("admin.prod.selectItem")}</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.department ? ` · ${deptLabel(p.department)}` : ""} ({t("admin.prod.stockN", { n: p.stock })})</option>)}</select></label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
          <label className="text-xs text-white/50">{t("admin.prod.supplier")}<input value={rs.supplier} onChange={(e) => setRs({ ...rs, supplier: e.target.value })} placeholder={t("admin.prod.supNameShort")} className={inp + " w-full"} /></label>
          <label className="text-xs text-white/50">{t("admin.prod.qty")}<input type="number" inputMode="numeric" value={rs.qty || ""} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setRs({ ...rs, qty: Number(e.target.value) })} className={inp + " w-full"} /></label>
          <label className="text-xs text-white/50">{t("admin.prod.unitCost")}<input type="number" inputMode="numeric" value={rs.unitCost || ""} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setRs({ ...rs, unitCost: Number(e.target.value) })} className={inp + " w-full"} /></label>
        </div>
        <button onClick={() => restock.mutate()} disabled={!rs.productId || !Number(rs.qty) || restock.isPending} className={btn + " disabled:opacity-50"}><Plus className="w-4 h-4" /> {t("admin.prod.addBatch")}</button>
        </>}
      </Card>
      {industries.length > 0 && <div className="flex items-center gap-2 flex-wrap"><span className="text-xs text-white/50">{t("admin.c.industry")}</span>{["", ...industries].map((d) => <button key={d || "all"} onClick={() => setIndustry(d)} className={`rounded-full px-3 py-1 text-xs ${industry === d ? "bg-amber-400 text-black font-bold" : "bg-white/5 text-white/60"}`}>{d ? indLabel(d) : t("admin.c.all")}</button>)}</div>}
      {/* Desktop: editable spreadsheet view */}
      {shown.length > 0 && <div className="hidden lg:block"><ProductsTable products={shown} industryOptions={industryOptions} /></div>}
      {/* Mobile / tablet: card view */}
      <div className="lg:hidden space-y-3">{shown.map((p) => <ProductRow key={p.id} p={p} />)}</div>
      {shown.length === 0 && <Empty text={t("admin.prod.emptyInd")} />}
    </div>
  );
}

// Shared spreadsheet cell input styling.
const cell = "w-full bg-transparent border border-transparent rounded px-1.5 py-1 text-sm outline-none hover:border-white/15 focus:border-amber-400/60 focus:bg-black/20";

function ProductsTable({ products, industryOptions }: { products: any[]; industryOptions: string[] }) {
  const { t } = useTranslation();
  return (
    <Card>
      <div className="overflow-x-auto -mx-3 sm:mx-0">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-white/40 border-b border-white/10">
              <th className="py-2 px-2 font-semibold">{t("admin.prod.item")}</th>
              <th className="py-2 px-2 font-semibold">{t("admin.prod.category")}</th>
              <th className="py-2 px-2 font-semibold min-w-[180px]">{t("admin.prod.industries")}</th>
              <th className="py-2 px-2 font-semibold text-right">{t("admin.prod.sellRp")}</th>
              <th className="py-2 px-2 font-semibold text-right">{t("admin.prod.costRp")}</th>
              <th className="py-2 px-2 font-semibold text-right">{t("admin.prod.stock")}</th>
              <th className="py-2 px-2 font-semibold">{t("admin.prod.supplier")}</th>
              <th className="py-2 px-2 font-semibold">{t("admin.pkg.col")}</th>
              <th className="py-2 px-2 font-semibold text-center">{t("admin.prod.pos")}</th>
              <th className="py-2 px-2 font-semibold text-center">{t("admin.prod.activeCol")}</th>
              <th className="py-2 px-2 font-semibold text-right"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => <ProductTableRow key={p.id} p={p} industryOptions={industryOptions} />)}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-white/40 mt-2">{t("admin.prod.tableHint")}</p>
    </Card>
  );
}

function ProductTableRow({ p, industryOptions }: { p: any; industryOptions: string[] }) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const base = { name: p.name || "", category: p.category || "", department: p.department || "", price: Number(p.price) || 0, cost: Number(p.cost) || 0, active: p.active !== false, posVisible: p.posVisible !== false, supplierName: p.supplierName || "" };
  const [f, setF] = useState(base);
  const dirty = JSON.stringify(f) !== JSON.stringify(base);
  const save = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/reborn/admin/pos/products/${p.id}`, f).then((r) => r.json()),
    onSuccess: () => { toast({ title: t("admin.c.saved") }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }),
  });
  return (
    <tr className={`border-b border-white/5 hover:bg-white/[0.03] ${dirty ? "bg-amber-400/5" : ""}`}>
      <td className="px-2 py-1"><div className="flex items-center gap-2">{p.imageUrl ? <img src={p.imageUrl} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" /> : <span className="w-7 h-7 rounded bg-white/5 flex-shrink-0" />}<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={cell + " min-w-[120px] font-medium"} /></div></td>
      <td className="px-2 py-1"><input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className={cell + " min-w-[90px]"} /></td>
      <td className="px-2 py-1"><IndustryPicker value={f.department} options={industryOptions} onChange={(v) => setF({ ...f, department: v })} /></td>
      <td className="px-2 py-1"><input type="number" inputMode="numeric" value={f.price || ""} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} className={cell + " text-right w-24"} /></td>
      <td className="px-2 py-1"><input type="number" inputMode="numeric" value={f.cost || ""} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setF({ ...f, cost: Number(e.target.value) })} className={cell + " text-right w-24"} /></td>
      <td className={`px-2 py-1 text-right font-semibold tabular-nums ${p.stock <= (p.lowStock ?? 0) ? "text-red-300" : "text-white/70"}`}>{p.stock}</td>
      <td className="px-2 py-1"><input value={f.supplierName} onChange={(e) => setF({ ...f, supplierName: e.target.value })} placeholder="—" className={cell + " min-w-[110px]"} /></td>
      <td className="px-2 py-1"><PackageButton p={p} /></td>
      <td className="px-2 py-1 text-center"><input type="checkbox" checked={f.posVisible} onChange={(e) => setF({ ...f, posVisible: e.target.checked })} /></td>
      <td className="px-2 py-1 text-center"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /></td>
      <td className="px-2 py-1 text-right"><button onClick={() => save.mutate()} disabled={!dirty || save.isPending} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${dirty ? "bg-amber-400 text-black" : "bg-white/5 text-white/30"} disabled:opacity-50`}><Check className="w-3.5 h-3.5" /> {t("admin.c.save")}</button></td>
    </tr>
  );
}

function ProductRow({ p }: any) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const modules = useModules();
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState<any>({ name: p.name, category: p.category, department: p.department || "", price: Number(p.price), cost: Number(p.cost), active: p.active, posVisible: p.posVisible !== false, imageUrl: p.imageUrl || "", supplierName: p.supplierName || "", supplierAddress: p.supplierAddress || "", supplierPhone: p.supplierPhone || "", ...pkgOf(p) });
  const industryOptions = Array.from(new Set([...Object.keys(INDUSTRY_LABELS).filter((k) => moduleEnabled(modules, k)).map((k) => INDUSTRY_LABELS[k]), ...deptList(p.department)])).sort();
  const save = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/reborn/admin/pos/products/${p.id}`, f).then((r) => r.json()),
    onSuccess: () => { toast({ title: t("admin.c.saved") }); setEdit(false); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }),
  });
  return (
    <Card>
      {!edit ? (
        <div className="flex items-start gap-3">
          {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" /> : <span className="w-14 h-14 rounded-xl bg-white/5 flex-shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{p.name} {!p.active && <span className="text-xs text-red-400">{t("admin.prod.hiddenTag")}</span>} {p.posVisible === false && <span className="text-xs text-amber-400">{t("admin.prod.notInPosTag")}</span>} {pkgTag(p, t) && <span className="text-xs text-sky-300">{pkgTag(p, t)}</span>}</p>
            <p className="text-xs text-white/50 break-words">{p.category}{p.department ? ` · ${deptLabel(p.department)}` : ""} · {moneySymbol()} {Number(p.price).toLocaleString()} · {t("admin.prod.stockN", { n: p.stock })}</p>
            {p.supplierName && <p className="mt-1 text-[11px] text-white/40 break-words">{t("admin.prod.supplierLbl")} {p.supplierName}{p.supplierPhone ? ` · ${p.supplierPhone}` : ""}</p>}
          </div>
          <button onClick={() => setEdit(true)} className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold bg-amber-400/90 text-black hover:bg-amber-300"><Pencil className="w-3.5 h-3.5" /> {t("admin.c.edit")}</button>
        </div>
      ) : (
        <div>
          <label className="text-xs text-white/50">{t("admin.c.name")}<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inp + " w-full mb-2"} /></label>
          <div className="text-xs text-white/50 mb-2">{t("admin.prod.industries")} <span className="text-white/30">{t("admin.prod.tickAll")}</span><IndustryPicker value={f.department} options={industryOptions} onChange={(v) => setF({ ...f, department: v })} /></div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <label className="text-xs text-white/50">{t("admin.prod.category")}<input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className={inp + " w-full"} /></label>
            <label className="flex items-center gap-2 text-sm text-white/70 mt-4"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> {t("admin.prod.activeCol")}</label>
            <label className="text-xs text-white/50">{t("admin.prod.sellPrice")}<input type="number" inputMode="numeric" value={f.price || ""} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} className={inp + " w-full"} /></label>
            <label className="text-xs text-white/50">{t("admin.prod.unitCost")}<input type="number" inputMode="numeric" value={f.cost || ""} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setF({ ...f, cost: Number(e.target.value) })} className={inp + " w-full"} /></label>
          </div>
          <label className="mb-2 flex items-center gap-2 rounded-xl border border-white/10 p-2.5 text-sm"><input type="checkbox" checked={f.posVisible} onChange={(e) => setF({ ...f, posVisible: e.target.checked })} /> {t("admin.prod.sellable")} <span className="text-white/40 text-xs">{t("admin.prod.sellableHintLong")}</span></label>
          <PackageFields value={f} onChange={setF} />
          <div className="mb-2 grid grid-cols-1 sm:grid-cols-2 gap-2"><input value={f.supplierName} onChange={(e)=>setF({...f,supplierName:e.target.value})} placeholder={t("admin.prod.supName")} className={inp}/><input value={f.supplierPhone} onChange={(e)=>setF({...f,supplierPhone:e.target.value})} placeholder={t("admin.prod.supPhone")} className={inp}/><input value={f.supplierAddress} onChange={(e)=>setF({...f,supplierAddress:e.target.value})} placeholder={t("admin.prod.supAddr")} className={inp+" sm:col-span-2"}/></div>
          <div className="mb-2"><p className="text-xs text-white/50 mb-1">{t("admin.prod.photo")}</p><ImageUpload value={f.imageUrl} onChange={(v) => setF({ ...f, imageUrl: v })} label={t("admin.c.uploadPhoto")} /></div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => save.mutate()} className={btnSm + " text-emerald-400"}><Check className="w-4 h-4" /></button>
            <button onClick={() => setEdit(false)} className={btnSm + " text-white/60"}><X className="w-4 h-4" /></button>
          </div>
          <p className="text-[11px] text-white/40 mt-1">{t("admin.prod.adjustHint")}</p>
        </div>
      )}
    </Card>
  );
}

// Ledger category label ("income:topup" → translated), or undefined when unknown.
const catLabel = (k: string): string | undefined => { const key = "admin.cat." + k.replace(":", "."); return translations[key] ? translate(key) : undefined; };

function Accounting() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [days, setDays] = useState(30);
  const [rate, setRate] = useState(10);
  const { data: sum } = useQuery<any>({ queryKey: ["/api/reborn/admin/accounting/summary", days], queryFn: () => apiRequest("GET", `/api/reborn/admin/accounting/summary?days=${days}`).then((r) => r.json()) });
  const { data: commission } = useQuery<any>({ queryKey: ["/api/reborn/admin/accounting/commission", days, rate], queryFn: () => apiRequest("GET", `/api/reborn/admin/accounting/commission?days=${days}&rate=${rate}`).then((r) => r.json()) });
  const { data: ledger = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/accounting/ledger"], queryFn: () => apiRequest("GET", "/api/reborn/admin/accounting/ledger?limit=100").then((r) => r.json()) });
  const { data: byIndustry = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/accounting/by-industry", days], queryFn: () => apiRequest("GET", `/api/reborn/admin/accounting/by-industry?days=${days}`).then((r) => r.json()) });
  const [e, setE] = useState<any>({ kind: "expense", category: "other", amount: 0, note: "", photoUrl: "" });
  const normalLedger = ledger.filter((entry) => entry.refType !== "pos_closing");
  const addEntry = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/accounting/entry", e).then((r) => r.json()),
    onSuccess: () => { toast({ title: t("admin.acc.entryAdded") }); setE({ kind: "expense", category: "other", amount: 0, note: "", photoUrl: "" }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/accounting/summary"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/accounting/ledger"] }); },
    onError: (x: any) => toast({ title: t("admin.c.failed"), description: x.message, variant: "destructive" }),
  });
  const payCommission = useMutation({
    mutationFn: (v: { staffName: string; amount: number }) => apiRequest("POST", "/api/reborn/admin/accounting/commission/pay", v).then((r) => r.json()),
    onSuccess: (d: any) => { toast({ title: t("admin.acc.commissionPaid"), description: d.message }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/accounting/summary"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/accounting/ledger"] }); },
    onError: (x: any) => toast({ title: t("admin.c.failed"), description: x.message, variant: "destructive" }),
  });
  const exportCsv = () => {
    const rows = [[t("admin.hr.date"), t("admin.acc.type"), t("admin.prod.category"), t("admin.acc.amount"), t("admin.acc.note")], ...normalLedger.map((l) => [
      new Date(l.createdAt).toISOString(), tv(t, "admin.acc." + l.kind, l.kind), catLabel(l.kind + ":" + l.category) || l.category, String(roundMoney(l.amount)), (l.note || "").replace(/"/g, "'"),
    ])];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `accounting-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {[7, 30, 90].map((d) => <button key={d} onClick={() => setDays(d)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${days === d ? "bg-amber-400 text-black" : "bg-white/5 text-white/60"}`}>{t("admin.acc.days", { n: d })}</button>)}
        <button onClick={exportCsv} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-white/70 inline-flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> {t("admin.c.exportCsv")}</button>
      </div>
      {byIndustry.length > 0 && <Card>
        <p className="font-bold mb-2 flex items-center gap-2"><Calculator className="w-4 h-4 text-amber-300" /> {t("admin.acc.byIndustry", { n: days })}</p>
        <div className="space-y-1.5">{byIndustry.map((r) => (
          <div key={r.industry} className="flex items-center justify-between text-sm"><span className="text-white/80">{indLabel(r.industry)}</span><span className="text-white/50">{t("admin.acc.orders", { n: r.orders })} · <b className="text-amber-200">{money(r.revenue)}</b></span></div>
        ))}</div>
        <p className="mt-2 text-[11px] text-white/40">{t("admin.acc.industryHint")}</p>
      </Card>}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-400/30 p-3 text-center"><p className="text-[11px] text-white/50">{t("admin.acc.incomeT")}</p><p className="text-base font-extrabold text-emerald-300">{money(sum?.income || 0)}</p></div>
        <div className="rounded-2xl bg-red-500/10 border border-red-400/30 p-3 text-center"><p className="text-[11px] text-white/50">{t("admin.acc.expenseT")}</p><p className="text-base font-extrabold text-red-300">{money(sum?.expense || 0)}</p></div>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center"><p className="text-[11px] text-white/50">{t("admin.acc.net")}</p><p className={`text-base font-extrabold ${(sum?.net || 0) >= 0 ? "text-amber-300" : "text-red-300"}`}>{money(sum?.net || 0)}</p></div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center"><p className="text-[11px] text-white/50">{t("admin.acc.revenue")}</p><p className="text-sm font-extrabold text-white">{money(sum?.revenue || 0)}</p></div>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center"><p className="text-[11px] text-white/50">{t("admin.acc.cogs")}</p><p className="text-sm font-extrabold text-white">{money(sum?.cogs || 0)}</p></div>
        <div className="rounded-2xl bg-amber-500/10 border border-amber-400/30 p-3 text-center"><p className="text-[11px] text-white/50">{t("admin.acc.prizePool")}</p><p className="text-sm font-extrabold text-amber-300">{money(sum?.spinPool || 0)}</p></div>
      </div>
      {sum?.byCategory && Object.keys(sum.byCategory).length > 0 && (
        <Card>
          <p className="font-bold mb-2 text-sm">{t("admin.acc.breakdown")}</p>
          {Object.entries(sum.byCategory).map(([k, v]: any) => (
            <div key={k} className="flex justify-between text-sm py-0.5"><span className="text-white/60">{catLabel(k) || k}</span><span className={k.startsWith("income") ? "text-emerald-300" : "text-red-300"}>{money(v)}</span></div>
          ))}
        </Card>
      )}
      {commission?.staff && (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold text-sm">{t("admin.acc.byStaff")}</p>
            <label className="text-xs text-white/50 flex items-center gap-1">{t("admin.acc.rate")} <input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} className={inp + " w-14"} />%</label>
          </div>
          {commission.staff.length === 0 && <p className="text-xs text-white/40">{t("admin.acc.noSales")}</p>}
          {commission.staff.map((s: any) => (
            <div key={s.name} className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0 gap-2">
              <span className="text-white/70 min-w-0 truncate">{s.name === "Unassigned" ? t("admin.acc.unassigned") : s.name} <span className="text-white/30">· {t("admin.acc.sales", { n: s.tickets })} · {money(s.sales)}</span></span>
              <span className="flex items-center gap-2 flex-shrink-0">
                <span className="text-emerald-300 font-semibold">{money(s.commission)}</span>
                {s.name !== "Unassigned" && s.commission > 0 && (
                  <button onClick={() => { if (confirm(t("admin.acc.payConfirm", { rp: s.commission.toLocaleString(), name: s.name }))) payCommission.mutate({ staffName: s.name, amount: s.commission }); }} disabled={payCommission.isPending} className="px-2.5 py-1.5 rounded-lg bg-emerald-500/90 text-black text-xs font-bold">{t("admin.acc.payRp")}</button>
                )}
              </span>
            </div>
          ))}
          <p className="text-[11px] text-white/40 mt-2">{t("admin.acc.commissionHint")}</p>
        </Card>
      )}
      <DailyClosings days={days} />
      <AccountingOrders days={days} />
      <Card>
        <p className="font-bold mb-2 flex items-center gap-2 text-sm"><Calculator className="w-4 h-4 text-amber-300" /> {t("admin.acc.manual")}</p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <select value={e.kind} onChange={(x) => setE({ ...e, kind: x.target.value })} className={inp}><option value="expense">{t("admin.acc.expenseT")}</option><option value="income">{t("admin.acc.incomeT")}</option></select>
          <select value={e.category} onChange={(x) => setE({ ...e, category: x.target.value })} className={inp}>
            {e.kind === "expense"
              ? <><option value="salary">{t("admin.cat.expense.salary")}</option><option value="rental">{t("admin.cat.expense.rental")}</option><option value="utilities">{t("admin.cat.expense.utilities")}</option><option value="purchase">{t("admin.acc.stockPurchase")}</option><option value="other">{t("admin.acc.other")}</option></>
              : <><option value="service">{t("admin.acc.service")}</option><option value="other">{t("admin.acc.other")}</option></>}
          </select>
          <input type="number" value={e.amount} onChange={(x) => setE({ ...e, amount: Number(x.target.value) })} placeholder={t("admin.acc.amount")} className={inp} />
          <input value={e.note} onChange={(x) => setE({ ...e, note: x.target.value })} placeholder={t("admin.acc.notePh")} className={inp} />
        </div>
        <p className="text-[11px] text-white/50 mb-1">{t("admin.acc.snapHint")}</p>
        <div className="mb-3"><ImageUpload value={e.photoUrl} onChange={(v: any) => setE({ ...e, photoUrl: v })} label={t("admin.acc.snap")} output="jpeg" maxDim={1200} /></div>
        <button onClick={() => addEntry.mutate()} disabled={e.amount <= 0 || addEntry.isPending} className={btn + " disabled:opacity-50"}><Plus className="w-4 h-4" /> {t("admin.acc.addEntry")}</button>
      </Card>
      <p className="text-xs text-white/40 px-1">{t("admin.acc.recent")}</p>
      {normalLedger.map((l) => (
        <div key={l.id} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm gap-2">
          <div className="min-w-0 flex items-center gap-2">
            {l.photoUrl && <a href={l.photoUrl} target="_blank" rel="noreferrer"><img src={l.photoUrl} alt={t("admin.acc.invoice")} className="w-9 h-9 rounded object-cover border border-white/10 flex-shrink-0" /></a>}
            <div className="min-w-0"><p className="truncate">{l.note || catLabel(l.kind + ":" + l.category) || l.category}</p><p className="text-[11px] text-white/40">{new Date(l.createdAt).toLocaleString(localeTag())}</p></div>
          </div>
          <span className={l.kind === "income" ? "text-emerald-300 font-semibold flex-shrink-0" : "text-red-300 font-semibold flex-shrink-0"}>{l.kind === "income" ? "+" : "−"}{money(Number(l.amount))}</span>
        </div>
      ))}
      {normalLedger.length === 0 && <Empty text={t("admin.acc.noTx")} />}
    </div>
  );
}

function DailyClosings({days}:{days:number}) {
  const { t } = useTranslation();
  const [selected,setSelected]=useState<any>(null);
  const {data:reports=[]}=useQuery<any[]>({queryKey:["/api/reborn/admin/accounting/closings",days],queryFn:()=>apiRequest("GET",`/api/reborn/admin/accounting/closings?days=${days}`).then(r=>r.json())});
  return <Card><p className="mb-2 flex items-center gap-2 text-sm font-bold"><Receipt className="h-4 w-4 text-amber-300"/>{t("admin.dc.title")}</p>{reports.map(r=><button key={r.id} onClick={()=>setSelected(r)} className="mb-2 flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3 text-left"><span><b className="block">{r.day}</b><span className="text-[11px] text-white/40">{t("admin.dc.paidOrders", { n: r.ticketCount })} · {t("admin.dc.cost", { v: money(r.totals?.cost) })}</span></span><span className="text-right"><b className="block text-emerald-300">{money(r.totals?.revenue)}</b><span className="text-[11px] text-white/40">{t("admin.dc.profit", { v: money(r.totals?.profit) })}</span></span></button>)}{reports.length===0&&<p className="text-xs text-white/40">{t("admin.dc.empty")}</p>}{selected&&<div className="fixed inset-0 z-[90] overflow-y-auto bg-black/85 p-4 backdrop-blur-sm"><div className="relative mx-auto my-4 max-w-md rounded-3xl border border-white/15 bg-[#160f2a] p-5"><button onClick={()=>setSelected(null)} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/10"><X className="h-5 w-5"/></button><h3 className="pr-10 text-xl font-black">{t("admin.dc.receipt")}</h3><p className="text-sm text-white/50">{selected.day} · {t("admin.dc.paidOrders", { n: selected.ticketCount })}</p><div className="my-4 max-h-60 space-y-2 overflow-y-auto border-y border-white/10 py-3">{(selected.items||[]).map((item:any)=><div key={item.name} className="flex justify-between gap-3 text-sm"><span>{item.quantity}× {item.name}</span><span>{money(item.sales)}</span></div>)}</div><div className="space-y-1 text-sm"><div className="flex justify-between"><span>{t("admin.dc.gross")}</span><span>{money(selected.totals?.subtotal)}</span></div><div className="flex justify-between"><span>{t("admin.dc.discounts")}</span><span>- {money(selected.totals?.discount)}</span></div><div className="flex justify-between"><span>{t("admin.dc.serviceFee")}</span><span>{money(selected.totals?.serviceFee)}</span></div><div className="flex justify-between"><span>{t("admin.dc.tax")}</span><span>{money(selected.totals?.tax)}</span></div><div className="flex justify-between text-lg font-black text-amber-300"><span>{t("admin.dc.totalRevenue")}</span><span>{money(selected.totals?.revenue)}</span></div><div className="flex justify-between text-white/60"><span>{t("admin.dc.cashCard")}</span><span>{money(selected.totals?.cash)} / {money(selected.totals?.card)}</span></div>{Number(selected.totals?.credits) > 0 && <div className="flex justify-between text-white/60"><span>{t("pos.pay.credits")}</span><span>{money(selected.totals?.credits)}</span></div>}<div className="mt-2 flex justify-between border-t border-white/10 pt-2"><span>{t("admin.dc.productCost")}</span><span>- {money(selected.totals?.cost)}</span></div><div className="flex justify-between text-lg font-black text-emerald-300"><span>{t("admin.dc.grossProfit")}</span><span>{money(selected.totals?.profit)}</span></div></div><button onClick={()=>printClosingReport(selected,{clubName:"Reborn Wave Group"})} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 py-3 font-bold text-black"><Printer className="h-4 w-4"/>{t("admin.dc.print")}</button></div></div>}</Card>;
}

function AccountingOrders({ days }: { days: number }) {
  const { t } = useTranslation();
  const { toast } = useToast(); const qc=useQueryClient(); const [selected,setSelected]=useState<any>(null); const [editing,setEditing]=useState(false); const [reason,setReason]=useState("");
  const {data:orders=[]}=useQuery<any[]>({queryKey:["/api/reborn/admin/accounting/orders",days],queryFn:()=>apiRequest("GET",`/api/reborn/admin/accounting/orders?days=${days}`).then(r=>r.json())});
  const refresh=()=>{qc.invalidateQueries({queryKey:["/api/reborn/admin/accounting/orders"]});qc.invalidateQueries({queryKey:["/api/reborn/admin/accounting/summary"]});qc.invalidateQueries({queryKey:["/api/reborn/admin/accounting/ledger"]});};
  const refund=useMutation({mutationFn:(o:any)=>apiRequest("POST",`/api/reborn/admin/accounting/orders/${o.id}/refund`,{reason}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message);return d}),onSuccess:(d:any)=>{toast({title:d.message});setSelected(d.order);setReason("");refresh()},onError:(e:any)=>toast({title:t("admin.ao.refundFailed"),description:e.message,variant:"destructive"})});
  const save=useMutation({mutationFn:(o:any)=>apiRequest("POST",`/api/reborn/admin/accounting/orders/${o.id}/edit`,{...o,reason,items:o.items.map((x:any)=>({id:x.id,qty:Number(x.qty),price:Number(x.price)})),discount:Number(o.discount),tax:Number(o.tax),cashReceived:o.paymentMethod==="cash"?Number(o.cashReceived):undefined}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message);return d}),onSuccess:(d:any)=>{toast({title:d.message});setSelected(d.order);setEditing(false);setReason("");refresh()},onError:(e:any)=>toast({title:t("admin.ao.editFailed"),description:e.message,variant:"destructive"})});
  const [industry,setIndustry]=useState("");
  const industries=Array.from(new Set(orders.flatMap((o:any)=>(o.items||[]).flatMap((it:any)=>deptList(it.department))))).sort();
  const shown=industry?orders.filter((o:any)=>(o.items||[]).some((it:any)=>deptHas(it.department,industry))):orders;
  const taxRate=(o:any)=>{const taxable=Number(o.subtotal)-Number(o.discount);return taxable>0&&Number(o.tax)>0?Number((Number(o.tax)/taxable*100).toFixed(2)):0};
  const serviceRate=(o:any)=>{const taxable=Number(o.subtotal)-Number(o.discount);return taxable>0&&Number(o.serviceFee)>0?Number((Number(o.serviceFee)/taxable*100).toFixed(2)):0};
  return <Card><p className="mb-2 font-bold text-sm flex items-center gap-2"><Ticket className="h-4 w-4 text-amber-300"/>{t("admin.ao.title")}</p>{industries.length>0&&<div className="mb-2 flex items-center gap-2 flex-wrap"><span className="text-xs text-white/50">{t("admin.c.industry")}</span>{["",...industries].map((d)=><button key={d||"all"} onClick={()=>setIndustry(d)} className={`rounded-full px-3 py-1 text-xs ${industry===d?"bg-amber-400 text-black font-bold":"bg-white/5 text-white/60"}`}>{d?indLabel(d):t("admin.c.all")}</button>)}</div>}<div className="max-h-80 space-y-2 overflow-y-auto">{shown.map((o)=><button key={o.id} onClick={()=>{setSelected(structuredClone(o));setEditing(false);setReason("")}} className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-left"><span className="min-w-0"><b className="block truncate">{o.orderNo} · {o.memberName||t("admin.ao.walkIn")}</b><span className="text-[11px] text-white/40">{new Date(o.paidAt).toLocaleString(localeTag())} · {tv(t,"admin.pay."+o.paymentMethod,String(o.paymentMethod).toUpperCase())}</span></span><span className={o.status==="refunded"?"font-bold text-red-300":"font-bold text-emerald-300"}>{o.status==="refunded"?t("admin.ao.refundedTag"):""}{money(o.total)}</span></button>)}</div>{shown.length===0&&<p className="text-xs text-white/40">{t("admin.ao.empty")}</p>}
  {selected&&<div className="fixed inset-0 z-[80] overflow-y-auto bg-black/80 p-3 backdrop-blur-sm"><div className="relative mx-auto my-4 max-w-lg rounded-3xl border border-white/15 bg-[#160f2a] p-5"><button onClick={()=>setSelected(null)} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/10"><X className="h-5 w-5"/></button><h3 className="pr-10 text-lg font-extrabold">{t("admin.ao.receiptTitle", { no: selected.orderNo })}</h3><p className="text-xs text-white/50">{selected.memberName||t("admin.ao.walkIn")} · {new Date(selected.paidAt).toLocaleString(localeTag())}</p><div className="my-4 space-y-2">{selected.items.filter((x:any)=>x.status!=="rejected").map((x:any,i:number)=><div key={x.id} className="grid grid-cols-[1fr_70px_110px] items-center gap-2 rounded-xl bg-white/5 p-2"><span className="truncate text-sm">{x.name}</span>{editing?<><input type="number" min={1} value={x.qty} onChange={e=>{const items=[...selected.items];items[i]={...x,qty:Number(e.target.value)};setSelected({...selected,items})}} className={inp}/><input type="number" min={0} value={x.price} onChange={e=>{const items=[...selected.items];items[i]={...x,price:Number(e.target.value)};setSelected({...selected,items})}} className={inp}/></>:<><span className="text-sm">×{x.qty}</span><span className="text-right text-sm">{money(x.lineTotal)}</span></>}</div>)}</div>{editing&&<div className="grid grid-cols-2 gap-2"><label className="text-xs text-white/50">{t("admin.ao.discount")}<input type="number" value={selected.discount} onChange={e=>setSelected({...selected,discount:Number(e.target.value)})} className={inp+" w-full"}/></label><label className="text-xs text-white/50">{t("admin.dc.serviceFee")}<input type="number" value={selected.serviceFee||0} onChange={e=>setSelected({...selected,serviceFee:Number(e.target.value)})} className={inp+" w-full"}/></label><label className="text-xs text-white/50">{t("admin.dc.tax")}<input type="number" value={selected.tax} onChange={e=>setSelected({...selected,tax:Number(e.target.value)})} className={inp+" w-full"}/></label><select value={selected.paymentMethod} onChange={e=>setSelected({...selected,paymentMethod:e.target.value})} className={inp}><option value="cash">{t("admin.pay.cash")}</option><option value="card">{t("admin.pay.card")}</option></select>{selected.paymentMethod==="card"?<input value={selected.paymentReference||""} onChange={e=>setSelected({...selected,paymentReference:e.target.value})} placeholder={t("admin.ao.cardRef")} className={inp}/>:<input type="number" value={selected.cashReceived||""} onChange={e=>setSelected({...selected,cashReceived:e.target.value})} placeholder={t("admin.ao.cashReceived")} className={inp}/>}</div>}<div className="my-4 border-t border-white/10 pt-3 text-sm"><div className="flex justify-between"><span>{t("admin.ao.subtotal")}</span><span>{money(selected.subtotal)}</span></div><div className="flex justify-between"><span>{t("admin.ao.discount")}</span><span>- {money(selected.discount)}</span></div><div className="flex justify-between"><span>{t("admin.dc.serviceFee")}{serviceRate(selected)>0?` (${serviceRate(selected)}%)`:""}</span><span>{money(selected.serviceFee)}</span></div><div className="flex justify-between"><span>{t("admin.dc.tax")}{taxRate(selected)>0?` (${taxRate(selected)}%)`:""}</span><span>{money(selected.tax)}</span></div><div className="flex justify-between text-lg font-black"><span>{t("admin.ao.total")}</span><span>{money(selected.total)}</span></div>{selected.paymentMethod==="cash"&&<><div className="flex justify-between"><span>{t("admin.ao.cashReceived")}</span><span>{money(selected.cashReceived)}</span></div><div className="flex justify-between"><span>{t("admin.ao.change")}</span><span>{money(selected.changeGiven)}</span></div></>}</div>{(editing||selected.status==="paid")&&<textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder={t("admin.ao.reason")} rows={2} className={inp+" mb-3 w-full"}/>}<div className="grid grid-cols-2 gap-2"><button onClick={()=>printReceipt(selected,{clubName:"Reborn Wave Group",serviceFeePercent:serviceRate(selected),taxPercent:taxRate(selected)})} className="rounded-xl bg-white/10 px-3 py-2.5 text-sm font-bold"><Printer className="mr-1 inline h-4 w-4"/>{t("admin.ao.print")}</button>{selected.status==="paid"&&!editing&&<button onClick={()=>setEditing(true)} className="rounded-xl bg-amber-400 px-3 py-2.5 text-sm font-bold text-black">{t("admin.ao.editBill")}</button>}{editing&&<button onClick={()=>save.mutate(selected)} disabled={!reason.trim()||save.isPending} className="rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-bold text-black disabled:opacity-40">{t("admin.ao.saveBill")}</button>}{selected.status==="paid"&&!editing&&<button onClick={()=>refund.mutate(selected)} disabled={!reason.trim()||refund.isPending} className="col-span-2 rounded-xl bg-red-500/20 px-3 py-2.5 text-sm font-bold text-red-200 disabled:opacity-40">{t("admin.ao.refund")}</button>}</div>{selected.refundReason&&<p className="mt-3 rounded-xl bg-red-500/10 p-3 text-xs text-red-200">{t("admin.ao.refundReason", { r: selected.refundReason })}</p>}</div></div>}</Card>;
}

function Payroll() {
  const { t } = useTranslation();
  const {toast}=useToast();const qc=useQueryClient();const [month,setMonth]=useState(new Date().toISOString().slice(0,7));
  const {data}=useQuery<any>({queryKey:["/api/reborn/admin/payroll",month],queryFn:()=>apiRequest("GET",`/api/reborn/admin/payroll?month=${month}`).then(r=>r.json())});
  const save=useMutation({mutationFn:(s:any)=>apiRequest("POST","/api/reborn/admin/payroll/profile",{userId:s.user_id,payType:s.pay_type,employmentType:s.employment_type,baseSalary:Number(s.base_salary),hourlyRate:Number(s.hourly_rate),commissionRate:Number(s.commission_rate),salesTarget:Number(s.sales_target),birthDate:s.birth_date||null,residency:s.residency||"citizen",statutoryOn:s.statutory_on!==false}).then(r=>r.json()),onSuccess:()=>{toast({title:t("admin.pr.saved")});qc.invalidateQueries({queryKey:["/api/reborn/admin/payroll"]})}});
  const pay=useMutation({mutationFn:(s:any)=>apiRequest("POST","/api/reborn/admin/payroll/pay",{userId:s.user_id,name:s.name,month,amount:s.total}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message);return d}),onSuccess:(d:any)=>{toast({title:d.message});qc.invalidateQueries({queryKey:["/api/reborn/admin/accounting"]})},onError:(e:any)=>toast({title:t("admin.pr.cannot"),description:e.message,variant:"destructive"})});
  const rules:PayrollRules|undefined=data?.rules;
  return <div className="space-y-3"><Card><div className="flex items-center justify-between gap-3"><div><h3 className="font-extrabold">{t("admin.pr.title")}</h3><p className="text-xs text-white/50">{t("admin.pr.hint")}</p></div><input type="month" value={month} onChange={e=>setMonth(e.target.value)} className={inp} style={{colorScheme:"dark"}}/></div></Card>{rules&&<StatutoryRules key={JSON.stringify(rules)} initial={rules} country={data?.country}/>}{(data?.staff||[]).map((initial:any)=><PayrollRow key={initial.user_id+month} initial={initial} rules={rules} month={month} onSave={(s:any)=>save.mutate(s)} onPay={(s:any)=>pay.mutate(s)}/>)}<Card><p className="mb-2 font-bold text-sm">{t("admin.pr.refTitle")}</p>{(data?.referrals||[]).map((r:any)=><div key={r.introducer_id} className="flex justify-between border-b border-white/5 py-2 text-sm"><span>{r.name}<span className="block text-[11px] text-white/40">{t("admin.pr.refLine", { n: r.referrals, v: money(r.referred_sales) })}</span></span><b className="text-amber-300">{money(r.commission)}</b></div>)}{!(data?.referrals||[]).length&&<p className="text-xs text-white/40">{t("admin.pr.noRef")}</p>}<p className="mt-2 text-[11px] text-white/40">{t("admin.pr.recordedHint")}</p></Card></div>;
}
// Name of a contribution line: built-in codes are translated, custom ones keep the admin's name.
function lineName(t:any,l:{code:string;label?:string}){return l.label||(translations[`admin.pr.line.${l.code}`]?t(`admin.pr.line.${l.code}`):l.code);}
// The company's statutory contribution rates (CPF / BPJS / EPF…): start from the country's, every number editable.
function StatutoryRules({initial,country}:{initial:PayrollRules;country?:string}){
  const { t } = useTranslation();const {toast}=useToast();const qc=useQueryClient();
  const [r,setR]=useState<PayrollRules>(initial);const [open,setOpen]=useState(false);
  const saveRules=useMutation({mutationFn:(body:any)=>apiRequest("POST","/api/reborn/admin/payroll/rules",body).then(async x=>{const d=await x.json();if(!x.ok)throw new Error(d.message);return d}),onSuccess:(d:any)=>{toast({title:d.message});qc.invalidateQueries({queryKey:["/api/reborn/admin/payroll"]})},onError:(e:any)=>toast({title:e.message,variant:"destructive"})});
  const n=(v:any)=>v===""?"":Number(v);
  const setLine=(i:number,patch:any)=>setR({...r,lines:r.lines.map((l,k)=>k===i?{...l,...patch}:l)});
  const cpf=r.cpf;const setCpf=(patch:any)=>setR({...r,cpf:{...(cpf as CpfRules),...patch}});
  const cell=inp+" w-full";
  const summary=r.scheme==="cpf"?t("admin.pr.st.cpfSummary"):r.lines.length?r.lines.map(l=>lineName(t,l)).join(" · "):t("admin.pr.st.none");
  return <Card><button onClick={()=>setOpen(!open)} className="flex w-full items-center justify-between gap-2 text-left"><div><p className="font-bold text-sm">{t("admin.pr.st.title")}</p><p className="text-xs text-white/50">{t("admin.pr.st.country",{c:countryOf(country||r.country).name[getCurrentLanguage()]})} · {summary}</p></div><span className="text-white/50">{open?"▲":"▼"}</span></button>
  {open&&<div className="mt-3 space-y-3">
    <p className="rounded-xl bg-amber-400/10 p-2 text-[11px] text-amber-200">{t("admin.pr.st.check")}</p>
    {r.scheme==="cpf"&&cpf&&<>
      <label className="block text-[11px] text-white/50">{t("admin.pr.st.owCeiling")}<input type="number" min={0} value={cpf.owCeiling} onChange={e=>setCpf({owCeiling:n(e.target.value)})} className={cell}/></label>
      <div><p className="mb-1 text-xs font-bold">{t("admin.pr.st.bands")}</p><div className="grid grid-cols-3 gap-1 text-[11px] text-white/50"><span>{t("admin.pr.st.ageBelow")}</span><span>{t("admin.pr.st.er")}</span><span>{t("admin.pr.st.ee")}</span></div>
        {cpf.bands.map((b,i)=><div key={i} className="mt-1 grid grid-cols-3 gap-1"><input type="number" value={b.below>=999?"":b.below} placeholder={t("admin.pr.st.anyAge")} onChange={e=>setCpf({bands:cpf.bands.map((x,k)=>k===i?{...x,below:e.target.value===""?999:Number(e.target.value)}:x)})} className={cell}/><input type="number" step="0.1" value={b.er} onChange={e=>setCpf({bands:cpf.bands.map((x,k)=>k===i?{...x,er:n(e.target.value)}:x)})} className={cell}/><input type="number" step="0.1" value={b.ee} onChange={e=>setCpf({bands:cpf.bands.map((x,k)=>k===i?{...x,ee:n(e.target.value)}:x)})} className={cell}/></div>)}</div>
      {(["pr1","pr2"] as const).map(k=><div key={k}><p className="mb-1 text-xs font-bold">{t(`admin.pr.res.${k}`)}</p><div className="grid grid-cols-2 gap-1"><label className="text-[11px] text-white/50">{t("admin.pr.st.er")}<input type="number" step="0.1" value={cpf[k].er} onChange={e=>setCpf({[k]:{...cpf[k],er:n(e.target.value)}})} className={cell}/></label><label className="text-[11px] text-white/50">{t("admin.pr.st.ee")}<input type="number" step="0.1" value={cpf[k].ee} onChange={e=>setCpf({[k]:{...cpf[k],ee:n(e.target.value)}})} className={cell}/></label></div></div>)}
      <div><p className="mb-1 text-xs font-bold">{t("admin.pr.line.sdl")}</p><div className="grid grid-cols-3 gap-1"><label className="text-[11px] text-white/50">%<input type="number" step="0.01" value={cpf.sdlPct} onChange={e=>setCpf({sdlPct:n(e.target.value)})} className={cell}/></label><label className="text-[11px] text-white/50">{t("admin.pr.st.min")}<input type="number" step="0.01" value={cpf.sdlMin} onChange={e=>setCpf({sdlMin:n(e.target.value)})} className={cell}/></label><label className="text-[11px] text-white/50">{t("admin.pr.st.max")}<input type="number" step="0.01" value={cpf.sdlMax} onChange={e=>setCpf({sdlMax:n(e.target.value)})} className={cell}/></label></div></div>
    </>}
    {r.scheme==="lines"&&<div className="space-y-2">{r.lines.map((l,i)=><div key={i} className="rounded-xl bg-white/5 p-2"><div className="flex items-center gap-2"><input value={l.label??(translations[`admin.pr.line.${l.code}`]?t(`admin.pr.line.${l.code}`):l.code)} onChange={e=>setLine(i,{label:e.target.value})} className={cell}/><button onClick={()=>setR({...r,lines:r.lines.filter((_,k)=>k!==i)})} className="rounded-lg bg-red-500/15 px-2 py-1 text-xs text-red-300">✕</button></div><div className="mt-1 grid grid-cols-3 gap-1"><label className="text-[11px] text-white/50">{t("admin.pr.st.er")}<input type="number" step="0.01" value={l.er} onChange={e=>setLine(i,{er:n(e.target.value)})} className={cell}/></label><label className="text-[11px] text-white/50">{t("admin.pr.st.ee")}<input type="number" step="0.01" value={l.ee} onChange={e=>setLine(i,{ee:n(e.target.value)})} className={cell}/></label><label className="text-[11px] text-white/50">{t("admin.pr.st.cap")}<input type="number" min={0} value={l.cap??""} placeholder={t("admin.pr.st.noCap")} onChange={e=>setLine(i,{cap:e.target.value===""?null:Number(e.target.value)})} className={cell}/></label></div>{l.threshold!=null&&<div className="mt-1 grid grid-cols-2 gap-1"><label className="text-[11px] text-white/50">{t("admin.pr.st.threshold")}<input type="number" min={0} value={l.threshold??""} onChange={e=>setLine(i,{threshold:e.target.value===""?null:Number(e.target.value)})} className={cell}/></label><label className="text-[11px] text-white/50">{t("admin.pr.st.erAbove")}<input type="number" step="0.01" value={l.erAbove??""} onChange={e=>setLine(i,{erAbove:e.target.value===""?null:Number(e.target.value)})} className={cell}/></label></div>}</div>)}
      <button onClick={()=>setR({...r,lines:[...r.lines,{code:`custom-${Date.now()}`,label:t("admin.pr.st.newLine"),er:0,ee:0}]})} className="w-full rounded-xl border border-dashed border-white/20 py-2 text-xs text-white/70">+ {t("admin.pr.st.addLine")}</button></div>}
    <div className="grid grid-cols-2 gap-2"><button onClick={()=>{if(confirm(t("admin.pr.st.resetConfirm")))saveRules.mutate({reset:true})}} className="rounded-xl bg-white/10 py-2.5 text-sm font-bold">{t("admin.pr.st.reset")}</button><button onClick={()=>saveRules.mutate({rules:r})} className="rounded-xl bg-amber-400 py-2.5 text-sm font-bold text-black">{t("admin.set.save")}</button></div>
  </div>}</Card>;
}
function PayrollRow({initial,rules,month,onSave,onPay}:any){const { t } = useTranslation();const[s,setS]=useState(initial);const basic=roundMoney(s.pay_type==="hourly"?Number(s.hourly_rate)*Number(s.hours):Number(s.base_salary));const commission=roundMoney(Number(s.sales)*Number(s.commission_rate)/100);const overtimePay=roundMoney(Number(s.ot_hours||0)*Number(s.otRate||0));const total=roundMoney(basic+commission+overtimePay);const v={...s,basic,salesCommission:commission,overtimePay,total};
  const c=rules?computeContributions(rules,total,{birthDate:s.birth_date,residency:s.residency,statutoryOn:s.statutory_on!==false},month,appMoney().decimals):null;
  return <Card><div className="mb-3 flex items-start justify-between gap-2"><div><b>{s.name}</b><p className="text-xs text-white/40">{t("admin.pr.hours", { h: Number(s.hours).toFixed(1) })}{Number(s.ot_hours)>0?` · ${t("admin.pr.ot", { h: Number(s.ot_hours).toFixed(1) })}`:""} · {t("admin.pr.salesN", { n: s.tickets })} · {money(s.sales)}</p></div><span className={`rounded-lg px-2 py-1 text-[11px] font-bold ${Number(s.sales_target)>0&&Number(s.sales)>=Number(s.sales_target)?"bg-emerald-500/20 text-emerald-300":"bg-white/5 text-white/50"}`}>{Number(s.sales_target)>0?t("admin.pr.target", { n: Math.round(Number(s.sales)/Number(s.sales_target)*100) }):t("admin.pr.noTarget")}</span></div>
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><label className="text-[11px] text-white/50">{t("admin.pr.payType")}<select value={s.pay_type||"salary"} onChange={e=>setS({...s,pay_type:e.target.value})} className={inp+" w-full"}><option value="salary">{t("admin.pr.monthly")}</option><option value="hourly">{t("admin.pr.hourly")}</option></select></label><label className="text-[11px] text-white/50">{t("admin.pr.basicSalary")}<input type="number" step={moneyStep()} value={s.base_salary||0} onChange={e=>setS({...s,base_salary:e.target.value})} className={inp+" w-full"}/></label><label className="text-[11px] text-white/50">{t("admin.pr.hourlyRate")}<input type="number" step={moneyStep()} value={s.hourly_rate||0} onChange={e=>setS({...s,hourly_rate:e.target.value})} className={inp+" w-full"}/></label><label className="text-[11px] text-white/50">{t("admin.pr.salesTarget")}<input type="number" value={s.sales_target||0} onChange={e=>setS({...s,sales_target:e.target.value})} className={inp+" w-full"}/></label><label className="text-[11px] text-white/50">{t("admin.pr.commissionPct")}<input type="number" min={0} value={s.commission_rate||0} onChange={e=>setS({...s,commission_rate:e.target.value})} className={inp+" w-full"}/></label>
    <label className="text-[11px] text-white/50">{t("admin.pr.birthDate")}<input type="date" value={s.birth_date||""} onChange={e=>setS({...s,birth_date:e.target.value})} className={inp+" w-full"} style={{colorScheme:"dark"}}/></label>
    {rules?.scheme==="cpf"&&<label className="text-[11px] text-white/50">{t("admin.pr.residency")}<select value={s.residency||"citizen"} onChange={e=>setS({...s,residency:e.target.value})} className={inp+" w-full"}>{["citizen","pr1","pr2","foreigner"].map(k=><option key={k} value={k}>{t(`admin.pr.res.${k}`)}</option>)}</select></label>}
    <label className="flex items-end gap-2 pb-2 text-[11px] text-white/70"><input type="checkbox" checked={s.statutory_on!==false} onChange={e=>setS({...s,statutory_on:e.target.checked})}/>{t("admin.pr.statutoryOn")}</label></div>
  <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs"><span className="rounded-xl bg-white/5 p-2">{t("admin.pr.basic")}<br/><b>{money(basic)}</b></span><span className="rounded-xl bg-white/5 p-2">{t("admin.pr.commission")}<br/><b>{money(commission)}</b></span><span className="rounded-xl bg-white/5 p-2">{t("admin.pr.overtime")}<br/><b>{money(overtimePay)}</b></span><span className="rounded-xl bg-amber-400/10 p-2 text-amber-200">{t("admin.pr.gross")}<br/><b>{money(total)}</b></span></div>
  {c&&c.lines.length>0&&<div className="mt-2 rounded-xl bg-white/5 p-2 text-xs"><div className="grid grid-cols-3 gap-1 text-[11px] text-white/45"><span>{c.age!=null?t("admin.pr.ageNow",{n:c.age}):t("admin.pr.noAge")}</span><span className="text-right">{t("admin.pr.st.eeShort")}</span><span className="text-right">{t("admin.pr.st.erShort")}</span></div>{c.lines.map(l=><div key={l.code} className="grid grid-cols-3 gap-1"><span>{lineName(t,l)}</span><span className="text-right text-red-300">{l.ee?`− ${money(l.ee)}`:"—"}</span><span className="text-right text-sky-300">{l.er?`+ ${money(l.er)}`:"—"}</span></div>)}</div>}
  {c&&<div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs"><span className="rounded-xl bg-red-500/10 p-2 text-red-200">{t("admin.pr.staffPays")}<br/><b>− {money(c.employee)}</b></span><span className="rounded-xl bg-emerald-500/15 p-2 text-emerald-200">{t("admin.pr.netPay")}<br/><b>{money(c.net)}</b></span><span className="rounded-xl bg-sky-500/10 p-2 text-sky-200">{t("admin.pr.companyCost")}<br/><b>{money(c.cost)}</b></span></div>}
  <div className="mt-3 grid grid-cols-2 gap-2"><button onClick={()=>onSave(v)} className="rounded-xl bg-white/10 py-2.5 text-sm font-bold">{t("admin.set.save")}</button><button onClick={()=>{if(confirm(t("admin.pr.confirm2", { v: money(total), net: money(c?.net??total), er: money(c?.employer??0), name: s.name })))onPay(v)}} disabled={total<=0} className="rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-black disabled:opacity-40">{t("admin.pr.recordPaid")}</button></div></Card>}

function Inventory() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data } = useQuery<any>({ queryKey: ["/api/reborn/admin/inventory"], queryFn: () => apiRequest("GET", "/api/reborn/admin/inventory").then((r) => r.json()) });
  const adjust = useMutation({
    mutationFn: (v: { productId: number; qty: number; unitCost?: number; supplier?: string }) => apiRequest("POST", "/api/reborn/pos/stock-in", v).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/reborn/admin/inventory"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/accounting/summary"] }); },
    onError: (x: any) => toast({ title: t("admin.c.failed"), description: x.message, variant: "destructive" }),
  });
  const allItems: any[] = data?.items || [];
  const [industry, setIndustry] = useState("");
  const industries = Array.from(new Set(allItems.flatMap((i) => deptList(i.department)))).sort();
  const items = industry ? allItems.filter((i) => deptHas(i.department, industry)) : allItems;
  const cats = Array.from(new Set(items.map((i) => i.category)));
  const totals = industry
    ? items.reduce((a, it) => ({ units: a.units + it.stock, cost: a.cost + it.stockValue, retail: a.retail + it.retailValue, low: a.low + (it.low ? 1 : 0) }), { units: 0, cost: 0, retail: 0, low: 0 })
    : (data?.totals || { units: 0, cost: 0, retail: 0, low: 0 });
  const step = (it: any, delta: number) => {
    if (delta > 0) { const c = prompt(t("admin.inv.addHowMany", { name: it.name }), "1"); if (!c) return; const q = Math.floor(Number(c)); if (!q) return; const supplier = prompt(t("admin.inv.supplierPrompt"), it.suppliers?.[0] || "") || undefined; const uc = prompt(t("admin.inv.unitCostPrompt"), ""); adjust.mutate({ productId: it.id, qty: q, unitCost: uc ? Number(uc) : undefined, supplier }); }
    else { const c = prompt(t("admin.inv.deductHowMany", { name: it.name }), "1"); if (!c) return; const q = Math.floor(Number(c)); if (!q) return; adjust.mutate({ productId: it.id, qty: -Math.abs(q) }); }
  };
  const exportCsv = () => {
    const rows = [[t("admin.prod.category"), t("admin.prod.item"), t("admin.prod.stock"), t("admin.inv.unitCost"), t("admin.inv.stockValue"), t("admin.inv.retailValue")], ...items.map((i) => [i.category, i.name, String(i.stock), String(i.cost), String(i.stockValue), String(i.retailValue)])];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-3">
      {industries.length > 0 && <div className="flex items-center gap-2 flex-wrap"><span className="text-xs text-white/50">{t("admin.c.industry")}</span>{["", ...industries].map((d) => <button key={d || "all"} onClick={() => setIndustry(d)} className={`rounded-full px-3 py-1 text-xs ${industry === d ? "bg-amber-400 text-black font-bold" : "bg-white/5 text-white/60"}`}>{d ? indLabel(d) : t("admin.c.all")}</button>)}</div>}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center"><p className="text-[11px] text-white/50">{t("admin.inv.units")}</p><p className="text-base font-extrabold">{(totals.units || 0).toLocaleString()}</p></div>
        <div className="rounded-2xl bg-amber-500/10 border border-amber-400/30 p-3 text-center"><p className="text-[11px] text-white/50">{t("admin.inv.stockValue")}</p><p className="text-base font-extrabold text-amber-300">{money(totals.cost || 0)}</p></div>
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-400/30 p-3 text-center"><p className="text-[11px] text-white/50">{t("admin.inv.retailValue")}</p><p className="text-base font-extrabold text-emerald-300">{money(totals.retail || 0)}</p></div>
      </div>
      <div className="flex items-center gap-2">
        {(data?.totals?.low || 0) > 0 && <span className="inline-flex items-center gap-1 text-xs text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-2.5 py-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {t("admin.inv.lowItems", { n: data.totals.low })}</span>}
        <button onClick={exportCsv} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-white/70 inline-flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> {t("admin.c.exportCsv")}</button>
      </div>
      {/* Desktop: spreadsheet view */}
      {items.length > 0 && <div className="hidden lg:block"><InventoryTable items={items} money={money} step={step} /></div>}
      {/* Mobile / tablet: grouped cards */}
      <div className="lg:hidden space-y-3">
      {cats.map((cat) => (
        <Card key={cat}>
          <p className="font-bold mb-2 text-sm flex items-center gap-2"><Boxes className="w-4 h-4 text-amber-300" /> {cat}</p>
          {items.filter((i) => i.category === cat).map((it) => (
            <div key={it.id} className="flex items-center gap-2 py-2 border-b border-white/5 last:border-0">
              {it.imageUrl ? <img src={it.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" /> : <span className="w-9 h-9 rounded-lg bg-white/5 flex-shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate flex items-center gap-1.5">{it.name}{it.low && <span className="text-[10px] text-red-300 bg-red-500/15 rounded px-1.5 py-0.5">{t("admin.inv.low")}</span>}{it.posVisible === false && <span className="text-[10px] text-amber-300 bg-amber-500/15 rounded px-1.5 py-0.5">{t("admin.inv.notInPos")}</span>}</p>
                <p className="text-[11px] text-white/40">{t("admin.inv.costValue", { cost: money(it.cost), value: money(it.stockValue) })}{it.suppliers?.length ? ` · ${it.suppliers.join(", ")}` : ""}</p>
              </div>
              <button onClick={() => step(it, -1)} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white font-bold flex items-center justify-center" style={{ fontSize: 16 }}>−</button>
              <span className={`w-10 text-center font-extrabold ${it.low ? "text-red-300" : "text-white"}`}>{it.stock}</span>
              <button onClick={() => step(it, 1)} className="w-8 h-8 rounded-lg bg-amber-400 text-black font-bold flex items-center justify-center" style={{ fontSize: 16 }}>+</button>
            </div>
          ))}
        </Card>
      ))}
      </div>
      {items.length === 0 && <Empty text={t("admin.inv.empty")} />}
    </div>
  );
}

function InventoryTable({ items, money, step }: { items: any[]; money: (v: number) => string; step: (it: any, delta: number) => void }) {
  const { t } = useTranslation();
  const rows = [...items].sort((a, b) => (a.category || "").localeCompare(b.category || "") || (a.name || "").localeCompare(b.name || ""));
  return (
    <Card>
      <div className="overflow-x-auto -mx-3 sm:mx-0">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-white/40 border-b border-white/10">
              <th className="py-2 px-2 font-semibold">{t("admin.prod.item")}</th>
              <th className="py-2 px-2 font-semibold">{t("admin.prod.category")}</th>
              <th className="py-2 px-2 font-semibold">{t("admin.inv.industry")}</th>
              <th className="py-2 px-2 font-semibold">{t("admin.inv.suppliers")}</th>
              <th className="py-2 px-2 font-semibold text-right">{t("admin.inv.unitCost")}</th>
              <th className="py-2 px-2 font-semibold text-right">{t("admin.inv.stockValue")}</th>
              <th className="py-2 px-2 font-semibold text-right">{t("admin.inv.retailValue")}</th>
              <th className="py-2 px-2 font-semibold text-center min-w-[130px]">{t("admin.prod.stock")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((it) => (
              <tr key={it.id} className={`border-b border-white/5 hover:bg-white/[0.03] ${it.low ? "bg-red-500/5" : ""}`}>
                <td className="px-2 py-1.5"><div className="flex items-center gap-2">{it.imageUrl ? <img src={it.imageUrl} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" /> : <span className="w-7 h-7 rounded bg-white/5 flex-shrink-0" />}<span className="font-medium">{it.name}</span>{it.low && <span className="text-[10px] text-red-300 bg-red-500/15 rounded px-1.5 py-0.5">{t("admin.inv.low")}</span>}{it.posVisible === false && <span className="text-[10px] text-amber-300 bg-amber-500/15 rounded px-1.5 py-0.5">{t("admin.inv.notInPos")}</span>}</div></td>
                <td className="px-2 py-1.5 text-white/60">{it.category}</td>
                <td className="px-2 py-1.5 text-white/60">{deptLabel(it.department) || "—"}</td>
                <td className="px-2 py-1.5 text-white/50 text-xs">{it.suppliers?.length ? it.suppliers.join(", ") : "—"}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-white/70">{money(it.cost)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-amber-300">{money(it.stockValue)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-emerald-300">{money(it.retailValue)}</td>
                <td className="px-2 py-1.5"><div className="flex items-center justify-center gap-1.5"><button onClick={() => step(it, -1)} className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-white font-bold flex items-center justify-center">−</button><span className={`w-10 text-center font-extrabold tabular-nums ${it.low ? "text-red-300" : "text-white"}`}>{it.stock}</span><button onClick={() => step(it, 1)} className="w-7 h-7 rounded-lg bg-amber-400 text-black font-bold flex items-center justify-center">+</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AdminBookings() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"upcoming" | "all">("upcoming");
  const { data: rows = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/bookings"], queryFn: () => apiRequest("GET", "/api/reborn/admin/bookings").then((r) => r.json()), refetchInterval: 30000 });
  const inv = () => qc.invalidateQueries({ queryKey: ["/api/reborn/admin/bookings"] });
  const setStatus = useMutation({
    mutationFn: (v: { id: number; status: string; note?: string }) => apiRequest("POST", `/api/reborn/admin/bookings/${v.id}/status`, { status: v.status, note: v.note }).then((r) => r.json()),
    // Says whether the member's WhatsApp message went out, and why not when it didn't.
    onSuccess: (d: any) => {
      if (d?.whatsapp === "noPhone" || d?.whatsapp === "offline") toast({ title: t("admin.c.updated"), description: t(`admin.bk.wa.${d.whatsapp}`), variant: "destructive" });
      else toast({ title: t("admin.c.updated"), description: d?.whatsapp === "sending" ? t("admin.bk.wa.sending") : undefined });
      inv();
    },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }),
  });
  const fmt = (iso: string) => new Date(iso).toLocaleString(localeTag(), { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
  const list = rows.filter((b) => (filter === "upcoming" ? b.upcoming && (b.status !== "cancelled" || b.lateArrivalOk) : true));
  const sColor: Record<string, string> = { confirmed: "text-emerald-300", seated: "text-sky-300", pending: "text-amber-300", scheduled: "text-blue-300", completed: "text-white/40", cancelled: "text-red-300", blocked: "text-orange-300" };
  return (
    <div className="space-y-3">
      <ManualBooking onDone={inv} />
      <BlockSlot onDone={inv} />
      <div className="flex gap-2">
        {(["upcoming", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${filter === f ? "bg-amber-400 text-black" : "bg-white/5 text-white/60"}`}>{t("admin.bk.filter." + f)}</button>
        ))}
        <span className="ml-auto text-xs text-white/40 self-center">{t("admin.bk.items", { n: list.length })}</span>
      </div>
      <p className="text-[11px] text-white/40 px-1">{t("admin.bk.arrivedHint")}</p>
      {list.map((b) => (
        <div key={b.id} className="rounded-xl bg-white/5 border border-white/10 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{b.status === "blocked" ? "🚫 " : ""}{b.title}</p>
              {b.status !== "blocked" && <p className="text-[11px] text-white/50">{b.memberName}{b.memberPhone ? ` · ${b.memberPhone}` : ""}</p>}
              <p className="text-[11px] text-white/40 mt-0.5">📅 {fmt(b.appointmentDate)} · {t("admin.bk.hoursN", { n: Math.round((b.duration || 120) / 60) })} · {b.description}</p>
              {b.adminNote && <p className="text-[11px] text-amber-300/80 mt-0.5">📝 {b.adminNote}</p>}
            </div>
            <span className={`text-xs font-bold flex-shrink-0 ${sColor[b.status] || "text-white/50"}`}>{tv(t, "admin.st." + b.status, b.status)}</span>
          </div>
          {b.status === "blocked" ? (
            <button onClick={() => { if (confirm(t("admin.bk.unblockConfirm"))) setStatus.mutate({ id: b.id, status: "cancelled" }); }} className="mt-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 text-white/70">{t("admin.bk.unblock")}</button>
          ) : b.lateArrivalOk ? (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <button onClick={() => setStatus.mutate({ id: b.id, status: "seated" })} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/20 text-sky-200 border border-sky-400/40">{t("admin.bk.arrivedLate")}</button>
              <span className="text-[11px] text-white/40">{t("admin.bk.arrivedLateHint")}</span>
            </div>
          ) : b.status !== "cancelled" && b.status !== "completed" && (
            <div className="flex gap-2 mt-2">
              {b.status !== "confirmed" && b.status !== "seated" && <button onClick={() => setStatus.mutate({ id: b.id, status: "confirmed" })} className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">{t("admin.c.confirm")}</button>}
              {b.status === "seated"
                ? <button onClick={() => { if (confirm(t("admin.bk.leftConfirm"))) setStatus.mutate({ id: b.id, status: "completed" }); }} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/20 text-sky-200 border border-sky-400/40">{t("admin.bk.left")}</button>
                : <button onClick={() => setStatus.mutate({ id: b.id, status: "seated" })} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${b.started ? "bg-sky-500/20 text-sky-200 border border-sky-400/40" : "bg-white/10 text-white/70"}`}>{t("admin.bk.arrived")}</button>}
              <button onClick={() => { const note = prompt(t("admin.bk.rejectPrompt"), "") ?? undefined; setStatus.mutate({ id: b.id, status: "cancelled", note }); }} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-500/15 text-red-200 border border-red-400/40">{t("admin.c.reject")}</button>
            </div>
          )}
        </div>
      ))}
      {list.length === 0 && <Empty text={t("admin.bk.empty")} />}
    </div>
  );
}

function AdminBottles() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data: rows = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/pos/bottle-keeps", q], queryFn: () => apiRequest("GET", `/api/reborn/pos/bottle-keeps${q ? "?q=" + encodeURIComponent(q) : ""}`).then((r) => r.json()) });
  const collect = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/reborn/pos/bottle-keeps/${id}/collect`, {}).then((r) => r.json()),
    onSuccess: (d: any) => { toast({ title: d.message || t("admin.bot.redeemed") }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/bottle-keeps"] }); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }),
  });
  const kept = rows.filter((b) => b.status === "kept");
  return (
    <div className="space-y-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.bot.search")} className={inp + " w-full"} />
      <p className="text-xs text-white/40 px-1">{t("admin.bot.kept", { n: kept.length })}</p>
      {kept.map((b) => (
        <div key={b.id} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3">
          {b.photoUrl ? <img src={b.photoUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" /> : <span className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0"><Wine className="w-5 h-5 text-amber-300" /></span>}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{b.name} <span className="text-white/40 text-xs capitalize">· {tv(t, "admin.bot.type." + b.type, b.type)}{b.type === "beer" ? ` · ${t("admin.bot.left", { n: b.quantity })}` : ""}</span></p>
            <p className="text-[11px] text-white/40 truncate">{b.memberName || "—"}{b.memberCode ? ` · ${b.memberCode}` : ""}{b.expiresAt ? ` · ${t("admin.bot.exp", { d: new Date(b.expiresAt).toLocaleDateString(localeTag()) })}` : ""}</p>
          </div>
          <button onClick={() => { if (confirm(t("admin.bot.confirm", { name: b.name, member: b.memberName || t("admin.bot.customer") }))) collect.mutate(b.id); }} disabled={collect.isPending} className={btnSave + " flex-shrink-0"}><Check className="w-4 h-4" /> {t("admin.bot.redeem")}</button>
        </div>
      ))}
      {kept.length === 0 && <Empty text={t("admin.bot.empty")} />}
    </div>
  );
}

function ManualBooking({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data } = useQuery<any>({ queryKey: ["/api/reborn/booking/info"], queryFn: () => apiRequest("GET", "/api/reborn/booking/info").then((r) => r.json()), enabled: open });
  const areas: any[] = data?.areas || [];
  const [memberCode, setMemberCode] = useState(""); const [areaId, setAreaId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slot, setSlot] = useState(""); const [table, setTable] = useState(""); const [party, setParty] = useState(2); const [hours, setHours] = useState(2);
  const area = areas.find((a) => a.id === areaId);
  const { data: avail } = useQuery<any>({ queryKey: ["/api/reborn/booking/availability", areaId, date, "manual"], queryFn: () => apiRequest("GET", `/api/reborn/booking/availability?areaId=${encodeURIComponent(areaId)}&date=${date}`).then((r) => r.json()), enabled: open && !!areaId && !!date });
  const slots: any[] = avail?.slots || [];
  const book = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/bookings/manual", { memberCode, areaId, date, slot, table: table || undefined, partySize: party, hours }).then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
    onSuccess: ({ ok, d }: any) => { if (!ok) { toast({ title: t("admin.c.failed"), description: d.message, variant: "destructive" }); return; } toast({ title: d.message }); setSlot(""); setTable(""); onDone(); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }),
  });
  if (!open) return <button onClick={() => setOpen(true)} className={btn + " w-full justify-center"}><Plus className="w-4 h-4" /> {t("admin.bk.bookFor")}</button>;
  return (
    <Card>
      <div className="flex items-center justify-between mb-2"><h3 className="font-bold text-sm">{t("admin.bk.bookFor")}</h3><button onClick={() => setOpen(false)} className={btnSm}><X className="w-4 h-4" /></button></div>
      <div className="mb-2"><UserPicker value={memberCode} onChange={setMemberCode} placeholder={t("admin.bk.searchMember")} /></div>
      <select value={areaId} onChange={(e) => { setAreaId(e.target.value); setSlot(""); setTable(""); }} className={inp + " w-full mb-2"}>
        <option value="">{t("admin.bk.selectArea")}</option>
        {areas.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.level})</option>)}
      </select>
      {area && (<>
        <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => { setDate(e.target.value); setSlot(""); }} className={inp + " w-full mb-2"} style={{ colorScheme: "dark" }} />
        {avail?.closed ? <p className="text-xs text-amber-300 mb-2">{t("admin.bk.closed")}</p> : (
          <select value={slot} onChange={(e) => setSlot(e.target.value)} className={inp + " w-full mb-2"}>
            <option value="">{t("admin.bk.startTime")}</option>
            {slots.map((s: any) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        )}
        {area.tables?.length > 0 && (
          <select value={table} onChange={(e) => setTable(e.target.value)} className={inp + " w-full mb-2"}>
            <option value="">{t("admin.bk.selectTable")}</option>
            {area.tables.map((t: string) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <div className="flex gap-2 mb-2">
          <label className="text-[11px] text-white/50 flex-1">{t("admin.bk.party")}<input type="number" min={1} value={party} onChange={(e) => setParty(Number(e.target.value))} className={inp + " w-full"} /></label>
          <label className="text-[11px] text-white/50 flex-1">{t("admin.bk.hours")}<input type="number" min={2} max={8} value={hours} onChange={(e) => setHours(Number(e.target.value))} className={inp + " w-full"} /></label>
        </div>
        <button onClick={() => book.mutate()} disabled={!memberCode.trim() || !slot || (area.tables?.length > 0 && !table) || book.isPending} className={btn + " w-full justify-center disabled:opacity-50"}>{t("admin.bk.confirmBooking")}</button>
      </>)}
    </Card>
  );
}

function BlockSlot({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data } = useQuery<any>({ queryKey: ["/api/reborn/booking/info"], queryFn: () => apiRequest("GET", "/api/reborn/booking/info").then((r) => r.json()), enabled: open });
  const areas: any[] = data?.areas || [];
  const [areaId, setAreaId] = useState(""); const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slot, setSlot] = useState(""); const [table, setTable] = useState(""); const [reason, setReason] = useState("");
  const area = areas.find((a) => a.id === areaId);
  const { data: avail } = useQuery<any>({ queryKey: ["/api/reborn/booking/availability", areaId, date, "block"], queryFn: () => apiRequest("GET", `/api/reborn/booking/availability?areaId=${encodeURIComponent(areaId)}&date=${date}`).then((r) => r.json()), enabled: open && !!areaId && !!date });
  const slots: any[] = avail?.slots || [];
  const block = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/bookings/block", { areaId, date, slot, table: table || undefined, reason }).then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
    onSuccess: ({ ok, d }: any) => { if (!ok) { toast({ title: t("admin.c.failed"), description: d.message, variant: "destructive" }); return; } toast({ title: d.message }); setSlot(""); setTable(""); setReason(""); onDone(); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }),
  });
  if (!open) return <button onClick={() => setOpen(true)} className={btn + " w-full justify-center"}>🚫 {t("admin.bk.blockTitle")}</button>;
  return (
    <Card>
      <div className="flex items-center justify-between mb-2"><h3 className="font-bold text-sm">{t("admin.bk.blockTitle")}</h3><button onClick={() => setOpen(false)} className={btnSm}><X className="w-4 h-4" /></button></div>
      <select value={areaId} onChange={(e) => { setAreaId(e.target.value); setSlot(""); setTable(""); }} className={inp + " w-full mb-2"}>
        <option value="">{t("admin.bk.selectArea")}</option>
        {areas.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.level})</option>)}
      </select>
      {area && (<>
        <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => { setDate(e.target.value); setSlot(""); }} className={inp + " w-full mb-2"} style={{ colorScheme: "dark" }} />
        <select value={slot} onChange={(e) => setSlot(e.target.value)} className={inp + " w-full mb-2"}>
          <option value="">{t("admin.bk.startTime")}</option>
          {slots.map((s: any) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {area.tables?.length > 0 && (
          <select value={table} onChange={(e) => setTable(e.target.value)} className={inp + " w-full mb-2"}>
            <option value="">{t("admin.bk.wholeArea")}</option>
            {area.tables.map((t: string) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("admin.bk.reasonOpt")} className={inp + " w-full mb-2"} />
        <button onClick={() => block.mutate()} disabled={!slot || block.isPending} className={btn + " w-full justify-center disabled:opacity-50"}>{t("admin.bk.blockSlot")}</button>
      </>)}
    </Card>
  );
}

// Each company connects its own WhatsApp Business number (Meta Cloud API). The access token
// is write-only: the server never sends it back, only whether one is saved.
function WhatsAppBusinessCard() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const CLOUD = "/api/reborn/admin/whatsapp/cloud";
  const { data } = useQuery<any>({ queryKey: [CLOUD], queryFn: () => apiRequest("GET", CLOUD).then((r) => r.json()) });
  const [phoneId, setPhoneId] = useState("");
  const [token, setToken] = useState("");
  const [adminNumber, setAdminNumber] = useState("");
  useEffect(() => { if (data) { setPhoneId(data.phoneId || ""); setAdminNumber(data.adminNumber || ""); } }, [data?.phoneId, data?.adminNumber]);
  const save = useMutation({
    mutationFn: () => apiRequest("POST", CLOUD, { phoneId, token, adminNumber }).then((r) => r.json()),
    onSuccess: (d: any) => {
      setToken("");
      qc.invalidateQueries({ queryKey: [CLOUD] });
      qc.invalidateQueries({ queryKey: ["/api/reborn/admin/whatsapp/status"] });
      if (d?.test?.ok) toast({ title: t("admin.wa.ok", { number: d.test.number || d.test.name || "" }) });
      else toast({ title: d?.test?.error === "missing" ? t("admin.wa.missing") : t("admin.wa.fail"), description: d?.test?.error === "missing" ? undefined : d?.test?.error, variant: "destructive" });
    },
    onError: (x: any) => toast({ title: t("admin.c.failed"), description: x.message, variant: "destructive" }),
  });
  const copy = (value: string) => { navigator.clipboard?.writeText(value).then(() => toast({ title: t("admin.wa.copied") })).catch(() => {}); };
  const field = "mt-1 w-full rounded-lg bg-black/30 border border-white/15 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400";
  return (
    <div className="rounded-2xl border bg-white/5 border-white/10 p-4">
      <p className="text-sm font-bold flex items-center gap-2"><MessageCircle className="w-4 h-4 text-emerald-300" /> {t("admin.wa.title")}</p>
      <p className="text-[11px] text-white/50 mt-1">{t("admin.wa.hint")}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-[11px] text-white/60">{t("admin.wa.phoneId")}<input className={field} inputMode="numeric" value={phoneId} onChange={(e) => setPhoneId(e.target.value)} /></label>
        <label className="text-[11px] text-white/60">{t("admin.wa.token")}{data?.tokenSet ? ` (${t("admin.wa.tokenSaved")})` : ""}<input className={field} type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} /></label>
        <label className="text-[11px] text-white/60">{t("admin.wa.adminNumber")}<input className={field} inputMode="tel" placeholder="628…" value={adminNumber} onChange={(e) => setAdminNumber(e.target.value)} /></label>
      </div>
      {data && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-[11px] text-white/60">{t("admin.wa.webhook")}<input className={field + " cursor-pointer"} readOnly value={data.webhookUrl} onClick={() => copy(data.webhookUrl)} /></label>
          <label className="text-[11px] text-white/60">{t("admin.wa.verify")}<input className={field + " cursor-pointer"} readOnly value={data.verifyToken} onClick={() => copy(data.verifyToken)} /></label>
        </div>
      )}
      <p className="text-[11px] text-white/40 mt-2">{t("admin.wa.subscribe")}</p>
      <button onClick={() => save.mutate()} disabled={save.isPending} className="mt-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-black inline-flex items-center gap-1.5 disabled:opacity-60">{t("admin.wa.save")}</button>
    </div>
  );
}

// Facebook Page (+ its linked Instagram account): Messenger and Instagram DMs get the same
// bot as WhatsApp, on the same webhook address. The Page token is write-only.
function MetaChatCard() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const META = "/api/reborn/admin/meta";
  const { data } = useQuery<any>({ queryKey: [META], queryFn: () => apiRequest("GET", META).then((r) => r.json()) });
  const [pageId, setPageId] = useState("");
  const [token, setToken] = useState("");
  useEffect(() => { if (data) setPageId(data.pageId || ""); }, [data?.pageId]);
  const save = useMutation({
    mutationFn: () => apiRequest("POST", META, { pageId, token }).then((r) => r.json()),
    onSuccess: (d: any) => {
      setToken("");
      qc.invalidateQueries({ queryKey: [META] });
      if (d?.test?.ok) toast({ title: t("admin.meta.ok", { page: d.test.page || "", ig: d.test.instagram ? ` · Instagram @${d.test.instagram}` : "" }) });
      else toast({ title: d?.test?.error === "missing" ? t("admin.meta.missing") : t("admin.wa.fail"), description: d?.test?.error === "missing" ? undefined : d?.test?.error, variant: "destructive" });
    },
    onError: (x: any) => toast({ title: t("admin.c.failed"), description: x.message, variant: "destructive" }),
  });
  const copy = (value: string) => { navigator.clipboard?.writeText(value).then(() => toast({ title: t("admin.wa.copied") })).catch(() => {}); };
  const field = "mt-1 w-full rounded-lg bg-black/30 border border-white/15 px-3 py-2 text-sm text-white outline-none focus:border-sky-400";
  return (
    <div className="rounded-2xl border bg-white/5 border-white/10 p-4">
      <p className="text-sm font-bold flex items-center gap-2"><MessageCircle className="w-4 h-4 text-sky-300" /> {t("admin.meta.title")}{data?.tokenSet && <span className="text-[10px] font-bold text-black bg-sky-300 rounded px-1.5 py-0.5">{t("admin.meta.on")}</span>}</p>
      <p className="text-[11px] text-white/50 mt-1">{t("admin.meta.hint")}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-[11px] text-white/60">{t("admin.meta.pageId")}<input className={field} inputMode="numeric" value={pageId} onChange={(e) => setPageId(e.target.value)} /></label>
        <label className="text-[11px] text-white/60">{t("admin.meta.token")}{data?.tokenSet ? ` (${t("admin.wa.tokenSaved")})` : ""}<input className={field} type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} /></label>
      </div>
      {data && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-[11px] text-white/60">{t("admin.meta.webhook")}<input className={field + " cursor-pointer"} readOnly value={data.webhookUrl} onClick={() => copy(data.webhookUrl)} /></label>
          <label className="text-[11px] text-white/60">{t("admin.wa.verify")}<input className={field + " cursor-pointer"} readOnly value={data.verifyToken} onClick={() => copy(data.verifyToken)} /></label>
        </div>
      )}
      <p className="text-[11px] text-white/40 mt-2">{t("admin.meta.subscribe")}</p>
      <button onClick={() => save.mutate()} disabled={save.isPending} className="mt-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-400 text-black inline-flex items-center gap-1.5 disabled:opacity-60">{t("admin.wa.save")}</button>
    </div>
  );
}

// "Facebook" / "Instagram" / "Telegram" for those chats, else the phone number.
function chatWhere(phone: string): { label: string; social: boolean; net?: "fb" | "ig" | "tg" } {
  const m = /^(fb|ig|tg):/.exec(String(phone || ""));
  if (!m) return { label: `+${String(phone || "").replace(/\D/g, "")}`, social: false };
  const net = m[1] as "fb" | "ig" | "tg";
  return { label: net === "ig" ? "Instagram" : net === "tg" ? "Telegram" : "Facebook", social: true, net };
}

// "Connect with Meta": one Facebook login finds and saves the Page (Messenger), its Instagram
// and the WhatsApp Business number, and links them to the bot (server/metaConnect.ts).
function ConnectMetaCard() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const META = "/api/reborn/admin/meta";
  const { data } = useQuery<any>({ queryKey: [META], queryFn: () => apiRequest("GET", META).then((r) => r.json()) });
  const info = data?.connect;
  const [pageId, setPageId] = useState("");
  const [phoneId, setPhoneId] = useState("");
  // Back from the Facebook window: ?meta=ok | pick | error (&why=…).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const result = q.get("meta");
    if (!result) return;
    if (result === "ok") toast({ title: t("admin.mc.done") });
    else if (result === "pick") toast({ title: t("admin.mc.pickToast") });
    else { const why = q.get("why") || ""; toast({ title: t("admin.mc.failed"), description: ["expired", "cancelled", "noAssets"].includes(why) ? t(`admin.mc.why.${why}`) : why || undefined, variant: "destructive" }); }
    q.delete("meta"); q.delete("why");
    window.history.replaceState(null, "", `${window.location.pathname}?${q}`);
  }, []);
  useEffect(() => { if (info?.pending) { setPageId(info.pending.pages[0]?.id || ""); setPhoneId(info.pending.numbers[0]?.id || ""); } }, [!!info?.pending]);
  const connect = useMutation({
    mutationFn: () => apiRequest("POST", `${META}/connect`, {}).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; }),
    onSuccess: (d: any) => { window.location.href = d.url; },
    onError: (x: any) => toast({ title: t("admin.c.failed"), description: String(x.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" }),
  });
  const pick = useMutation({
    mutationFn: () => apiRequest("POST", `${META}/pick`, { pageId, phoneId }).then((r) => r.json()),
    onSuccess: (d: any) => { toast({ title: d.message }); qc.invalidateQueries({ queryKey: [META] }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/whatsapp/cloud"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/whatsapp/status"] }); },
    onError: (x: any) => toast({ title: t("admin.c.failed"), description: x.message, variant: "destructive" }),
  });
  if (!info) return null;
  const select = "mt-1 w-full rounded-lg bg-black/30 border border-white/15 px-3 py-2 text-sm text-white";
  const row = (ok: boolean, label: string, value: string) => (
    <p className="text-xs"><span className={ok ? "text-emerald-300" : "text-white/35"}>{ok ? "✓" : "○"}</span> {label}: <b className={ok ? "text-white" : "text-white/40"}>{ok ? value : t("admin.mc.notYet")}</b></p>
  );
  return (
    <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 p-4">
      <p className="text-sm font-bold flex items-center gap-2"><MessageCircle className="w-4 h-4 text-sky-300" /> {t("admin.mc.title")}</p>
      <p className="text-[11px] text-white/55 mt-1">{t("admin.mc.hint")}</p>
      <div className="mt-2 space-y-0.5">
        {row(!!info.pageName, "Messenger", info.pageName)}
        {row(!!info.igUsername, "Instagram", `@${info.igUsername}`)}
        {row(!!info.waNumber, "WhatsApp", info.waNumber)}
      </div>
      {info.waTokenExpires && <p className="text-[11px] text-amber-300 mt-1">{t("admin.mc.expires", { d: new Date(info.waTokenExpires).toLocaleDateString(localeTag()) })}</p>}
      {info.pending && (
        <div className="mt-3 rounded-xl bg-black/25 p-3">
          <p className="text-xs font-bold">{t("admin.mc.pickTitle")}</p>
          {info.pending.pages.length > 0 && <label className="mt-2 block text-[11px] text-white/60">{t("admin.mc.page")}<select className={select} value={pageId} onChange={(e) => setPageId(e.target.value)}>{info.pending.pages.map((p: any) => <option key={p.id} value={p.id}>{p.name}{p.instagram ? ` · @${p.instagram}` : ""}</option>)}<option value="">{t("admin.mc.none")}</option></select></label>}
          {info.pending.numbers.length > 0 && <label className="mt-2 block text-[11px] text-white/60">{t("admin.mc.number")}<select className={select} value={phoneId} onChange={(e) => setPhoneId(e.target.value)}>{info.pending.numbers.map((n: any) => <option key={n.id} value={n.id}>{n.display}{n.name ? ` · ${n.name}` : ""}</option>)}<option value="">{t("admin.mc.none")}</option></select></label>}
          <button onClick={() => pick.mutate()} disabled={pick.isPending} className="mt-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-black disabled:opacity-60">{t("admin.mc.use")}</button>
        </div>
      )}
      {info.oauth
        ? <button onClick={() => connect.mutate()} disabled={connect.isPending} className="mt-3 px-4 py-2 rounded-lg text-sm font-bold bg-[#1877F2] text-white inline-flex items-center gap-2 disabled:opacity-60">f &nbsp;{info.pageName || info.waNumber ? t("admin.mc.reconnect") : t("admin.mc.button")}</button>
        : <p className="text-[11px] text-amber-300/90 mt-3">{t("admin.mc.notSetUp")}</p>}
    </div>
  );
}

// Telegram: the admin makes a bot with @BotFather and pastes its token once — it links itself.
// Customers scan the bot's QR to start chatting.
function TelegramCard() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const TG = "/api/reborn/admin/telegram";
  const { data } = useQuery<any>({ queryKey: [TG], queryFn: () => apiRequest("GET", TG).then((r) => r.json()) });
  const [token, setToken] = useState("");
  const save = useMutation({
    mutationFn: (value: string) => apiRequest("POST", TG, { token: value }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; }),
    onSuccess: (d: any) => { setToken(""); toast({ title: d.message }); qc.setQueryData([TG], d); },
    onError: (x: any) => toast({ title: t("admin.c.failed"), description: String(x.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" }),
  });
  const field = "mt-1 w-full rounded-lg bg-black/30 border border-white/15 px-3 py-2 text-sm text-white outline-none focus:border-sky-400";
  return (
    <div className={`rounded-2xl border p-4 ${data?.connected ? "bg-sky-500/10 border-sky-400/30" : "bg-white/5 border-white/10"}`}>
      <p className="text-sm font-bold flex items-center gap-2"><Send className="w-4 h-4 text-sky-300" /> {t("admin.tg.title")}</p>
      {data?.connected ? (
        <div className="mt-2 text-center">
          <p className="text-sm text-sky-200 font-semibold">{t("admin.tg.linked", { u: data.username })}</p>
          <p className="text-[11px] text-white/55 mt-1">{t("admin.tg.scanHint")}</p>
          {data.qr && <img src={data.qr} alt="Telegram QR" className="mx-auto mt-2 rounded-xl bg-white p-2" style={{ width: 200, height: 200 }} />}
          <a href={data.link} target="_blank" rel="noreferrer" className="mt-2 block text-xs font-bold text-sky-300 break-all">{data.link}</a>
          <button onClick={() => { if (confirm(t("admin.tg.unlinkConfirm"))) save.mutate(""); }} disabled={save.isPending} className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/15 border border-red-400/40 text-red-200">{t("admin.tg.unlink")}</button>
        </div>
      ) : (
        <div className="mt-2">
          <ol className="text-[11px] text-white/60 list-decimal pl-4 space-y-0.5">
            <li>{t("admin.tg.step1")} <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="font-bold text-sky-300">@BotFather</a></li>
            <li>{t("admin.tg.step2")}</li>
            <li>{t("admin.tg.step3")}</li>
          </ol>
          <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="mt-2 inline-flex px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-500/20 text-sky-200">{t("admin.tg.open")}</a>
          <label className="mt-3 block text-[11px] text-white/60">{t("admin.tg.token")}<input className={field} type="password" autoComplete="off" placeholder="123456789:AA…" value={token} onChange={(e) => setToken(e.target.value)} /></label>
          <button onClick={() => save.mutate(token)} disabled={save.isPending || !token.trim()} className="mt-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-400 text-black disabled:opacity-50">{save.isPending ? t("admin.tg.linking") : t("admin.tg.link")}</button>
        </div>
      )}
    </div>
  );
}

function Crm() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data } = useQuery<any>({ queryKey: ["/api/reborn/admin/crm"], queryFn: () => apiRequest("GET", "/api/reborn/admin/crm").then((r) => r.json()) });
  const { data: wa } = useQuery<any>({
    queryKey: ["/api/reborn/admin/whatsapp/status"],
    queryFn: () => apiRequest("GET", "/api/reborn/admin/whatsapp/status").then((r) => r.json()),
    refetchInterval: (q: any) => { const s = q?.state?.data?.web?.status; return (s === "qr" || s === "connecting") ? 3000 : false; },
  });
  const webStatus = wa?.web?.status || "idle";
  const connect = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/whatsapp/web/connect", {}).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/reborn/admin/whatsapp/status"] }),
    onError: (x: any) => toast({ title: t("admin.c.failed"), description: x.message, variant: "destructive" }),
  });
  const logout = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/whatsapp/web/logout", {}).then((r) => r.json()),
    onSuccess: () => { toast({ title: t("admin.crm.unlinked") }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/whatsapp/status"] }); },
  });
  const runReminders = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/whatsapp/run-reminders", {}).then((r) => r.json()),
    onSuccess: (d: any) => toast({ title: d.configured ? t("admin.crm.remSent") : t("admin.crm.remRun"), description: t("admin.crm.remDesc", { b: d.bottles, c: d.comeback, f: d.feedback, p: d.packages ?? 0 }) }),
    onError: (x: any) => toast({ title: t("admin.c.failed"), description: x.message, variant: "destructive" }),
  });
  const contacts: any[] = data?.contacts || [];
  const [openId, setOpenId] = useState<number | null>(null);
  const openContact = contacts.find((c) => c.id === openId) || null;
  const stageColor: Record<string, string> = { new: "text-white/50", await_lang: "text-amber-300", await_name: "text-amber-300", await_email: "text-amber-300", await_phone: "text-amber-300", await_code: "text-amber-300", active: "text-emerald-300", member: "text-emerald-300" };
  const { data: meta } = useQuery<any>({ queryKey: ["/api/reborn/admin/meta"], queryFn: () => apiRequest("GET", "/api/reborn/admin/meta").then((r) => r.json()) });
  const { data: tg } = useQuery<any>({ queryKey: ["/api/reborn/admin/telegram"], queryFn: () => apiRequest("GET", "/api/reborn/admin/telegram").then((r) => r.json()) });
  const live = webStatus === "connected" || wa?.configured;
  // The QR-linked number belongs to the platform's own company; other companies use Meta only.
  const { data: cloud } = useQuery<any>({ queryKey: ["/api/reborn/admin/whatsapp/cloud"], queryFn: () => apiRequest("GET", "/api/reborn/admin/whatsapp/cloud").then((r) => r.json()) });
  return (
    <div className="space-y-3">
      <ConnectMetaCard />
      <TelegramCard />
      <details className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <summary className="text-xs font-semibold text-white/60 cursor-pointer">{t("admin.mc.manual")}</summary>
        <div className="mt-3 space-y-3">
          <WhatsAppBusinessCard />
          <MetaChatCard />
        </div>
      </details>
      {/* QR login — link an existing WhatsApp number */}
      <div hidden={cloud?.qrLinkAvailable === false} className={`rounded-2xl border p-4 ${webStatus === "connected" ? "bg-emerald-500/10 border-emerald-400/30" : "bg-white/5 border-white/10"}`}>
        <p className="text-sm font-bold flex items-center gap-2"><MessageCircle className="w-4 h-4 text-emerald-300" /> {t("admin.crm.connectTitle")}</p>
        {webStatus === "connected" ? (
          <div className="mt-2">
            <p className="text-sm text-emerald-300 font-semibold">{t("admin.crm.linked")}{wa?.web?.number ? ` · +${wa.web.number}` : ""}</p>
            <p className="text-[11px] text-white/50 mt-1">{t("admin.crm.linkedHint")}</p>
            <button onClick={() => { if (confirm(t("admin.crm.unlinkConfirm"))) logout.mutate(); }} disabled={logout.isPending} className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/15 border border-red-400/40 text-red-200">{t("admin.crm.unlink")}</button>
          </div>
        ) : webStatus === "qr" && wa?.web?.qr ? (
          <div className="mt-3 text-center">
            <p className="text-[11px] text-white/60 mb-2">{t("admin.crm.scanHow")}</p>
            <img src={wa.web.qr} alt={t("admin.crm.qrAlt")} className="mx-auto rounded-xl bg-white p-2" style={{ width: 240, height: 240 }} />
            <p className="text-[11px] text-white/40 mt-2">{t("admin.crm.waiting")}</p>
          </div>
        ) : (
          <div className="mt-2">
            <p className="text-[11px] text-white/50">{t("admin.crm.linkHint")}</p>
            <p className="text-[11px] text-amber-300/90 mt-1">{t("admin.crm.warn")}</p>
            <button onClick={() => connect.mutate()} disabled={connect.isPending} className="mt-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-black inline-flex items-center gap-1.5">{connect.isPending || webStatus === "connecting" ? t("admin.crm.starting") : t("admin.crm.showQr")}</button>
          </div>
        )}
      </div>

      <div className={`rounded-2xl border p-3 ${live ? "bg-emerald-500/10 border-emerald-400/30" : "bg-amber-500/10 border-amber-400/30"}`}>
        <p className="text-sm font-bold flex items-center gap-2"><MessageCircle className="w-4 h-4" /> {t("admin.crm.botStatus", { s: live ? t("admin.crm.active") : t("admin.crm.inactive") })}</p>
        <p className="text-[11px] text-white/50 mt-1">{live ? t("admin.crm.liveHint") : t("admin.crm.offHint")}</p>
        <button onClick={() => runReminders.mutate()} disabled={runReminders.isPending} className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 inline-flex items-center gap-1.5"><Send className="w-3.5 h-3.5" /> {t("admin.crm.runNow")}</button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center"><p className="text-[11px] text-white/50">{t("admin.crm.contacts")}</p><p className="text-base font-extrabold">{data?.count || 0}</p></div>
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-400/30 p-3 text-center"><p className="text-[11px] text-white/50">{t("admin.ov.members")}</p><p className="text-base font-extrabold text-emerald-300">{data?.stages?.member || 0}</p></div>
        <div className="rounded-2xl bg-amber-500/10 border border-amber-400/30 p-3 text-center"><p className="text-[11px] text-white/50">{t("admin.crm.inProgress")}</p><p className="text-base font-extrabold text-amber-300">{(data?.stages?.await_name || 0) + (data?.stages?.await_email || 0) + (data?.stages?.await_phone || 0) + (data?.stages?.await_code || 0)}</p></div>
      </div>
      <p className="text-xs text-white/40 px-1 pt-1">{t("admin.crm.tapHint")}</p>
      {contacts.map((c) => (
        <button key={c.id} onClick={() => setOpenId(c.id)} className="w-full flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-left hover:bg-white/10">
          <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-black font-bold" style={{ background: "linear-gradient(135deg,#c9a84c,#a855f7)" }}>{(c.name || c.phone || "?").slice(0, 1).toUpperCase()}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold truncate">{c.name || t("admin.crm.unknown")} <span className={`text-[11px] ${stageColor[c.stage] || "text-white/40"}`}>· {tv(t, "admin.stage." + c.stage, c.stage)}</span>{c.botPaused && <span className="ml-1.5 text-[10px] font-bold text-black bg-amber-300 rounded px-1.5 py-0.5 align-middle">🙋 {t("admin.crm.botPaused")}</span>}</span>
            <span className="block text-[11px] text-white/40 truncate">{chatWhere(c.phone).social ? <b className="text-sky-300">{chatWhere(c.phone).label}</b> : c.phone}{c.email ? ` · ${c.email}` : ""}{c.lastVisitAt ? ` · ${t("admin.crm.visit", { d: new Date(c.lastVisitAt).toLocaleDateString(localeTag()) })}` : ""}</span>
          </span>
          <MessageCircle className="w-4 h-4 text-emerald-300 flex-shrink-0" />
        </button>
      ))}
      {contacts.length === 0 && <Empty text={t("admin.crm.empty")} />}

      {openContact && <CrmChat contact={openContact} connected={chatWhere(openContact.phone).net === "tg" ? !!tg?.connected : chatWhere(openContact.phone).social ? !!meta?.tokenSet : webStatus === "connected" || !!wa?.configured} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function CrmChat({ contact, connected, onClose }: { contact: any; connected: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ name: contact.name || "", email: contact.email || "", lang: contact.lang || "en", notes: contact.notes || "" });
  const msgsKey = ["/api/reborn/admin/crm", contact.id, "messages"];
  const { data: msgs = [] } = useQuery<any[]>({
    queryKey: msgsKey,
    queryFn: () => apiRequest("GET", `/api/reborn/admin/crm/${contact.id}/messages`).then((r) => r.json()),
    refetchInterval: 4000,
  });
  const send = useMutation({
    mutationFn: () => apiRequest("POST", `/api/reborn/admin/crm/${contact.id}/send`, { text }).then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
    onSuccess: ({ d }: any) => { setText(""); qc.invalidateQueries({ queryKey: msgsKey }); if (d?.message && d.message !== "Sent") toast({ title: d.message }); },
    onError: (x: any) => toast({ title: t("admin.c.failed"), description: x.message, variant: "destructive" }),
  });
  const saveEdit = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/reborn/admin/crm/${contact.id}`, f).then((r) => r.json()),
    onSuccess: () => { toast({ title: t("admin.c.saved") }); setEditing(false); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/crm"] }); },
    onError: (x: any) => toast({ title: t("admin.c.failed"), description: x.message, variant: "destructive" }),
  });
  const [paused, setPaused] = useState(!!contact.botPaused);
  const toggleBot = useMutation({
    mutationFn: (botPaused: boolean) => apiRequest("PATCH", `/api/reborn/admin/crm/${contact.id}`, { botPaused }).then((r) => r.json()),
    onSuccess: (row: any) => { setPaused(!!row.botPaused); toast({ title: row.botPaused ? t("admin.crm.pausedToast") : t("admin.crm.resumedToast") }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/crm"] }); },
    onError: (x: any) => toast({ title: t("admin.c.failed"), description: x.message, variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/reborn/admin/crm/${contact.id}`, {}).then((r) => r.json()),
    onSuccess: () => { toast({ title: t("admin.crm.deleted") }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/crm"] }); onClose(); },
    onError: (x: any) => toast({ title: t("admin.c.failed"), description: x.message, variant: "destructive" }),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-[#160f2a] border border-white/10 rounded-t-3xl sm:rounded-3xl flex flex-col" style={{ maxHeight: "88vh" }} onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="flex items-center gap-2 p-3 border-b border-white/10">
          <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-black font-bold" style={{ background: "linear-gradient(135deg,#c9a84c,#a855f7)" }}>{(contact.name || contact.phone || "?").slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate">{contact.name || t("admin.crm.unknown")}</p>
            <p className="text-[11px] text-white/40 truncate">{chatWhere(contact.phone).label} · {tv(t, "admin.stage." + contact.stage, contact.stage)} · {contact.lang?.toUpperCase()}</p>
          </div>
          <button onClick={() => setEditing((v) => !v)} className={btnSm} title={t("admin.c.edit")}><Pencil className="w-4 h-4 text-white/70" /></button>
          <button onClick={() => { if (confirm(t("admin.crm.delConfirm", { name: contact.name || contact.phone }))) del.mutate(); }} className={btnSm} title={t("admin.c.delete")}><Trash2 className="w-4 h-4 text-red-300" /></button>
          <button onClick={onClose} className={btnSm} title={t("admin.c.close")}><X className="w-4 h-4 text-white/70" /></button>
        </div>

        {/* Bot on/off for this number (paused = handed to staff) */}
        <div className={`flex items-center gap-2 px-3 py-2 border-b border-white/10 text-xs ${paused ? "bg-amber-400/10" : ""}`}>
          <span className="flex-1 text-white/70">{paused ? `🙋 ${t("admin.crm.pausedHint")}` : `🤖 ${t("admin.crm.botOnHint")}`}</span>
          <button onClick={() => toggleBot.mutate(!paused)} disabled={toggleBot.isPending} className={`px-2.5 py-1 rounded-lg font-bold ${paused ? "bg-emerald-500 text-black" : "bg-white/10 text-white/80"}`}>{paused ? t("admin.crm.resumeBot") : t("admin.crm.pauseBot")}</button>
        </div>

        {editing && (
          <div className="p-3 border-b border-white/10 space-y-2 bg-black/20">
            <div className="grid grid-cols-2 gap-2">
              <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={t("admin.c.name")} className={inp} />
              <select value={f.lang} onChange={(e) => setF({ ...f, lang: e.target.value })} className={inp}><option value="en">English</option><option value="zh">中文</option><option value="id">Bahasa</option></select>
            </div>
            <input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder={t("admin.c.email")} className={inp + " w-full"} />
            <input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder={t("admin.crm.notes")} className={inp + " w-full"} />
            <button onClick={() => saveEdit.mutate()} disabled={saveEdit.isPending} className={btnSave}><Check className="w-4 h-4" /> {t("admin.crm.saveProfile")}</button>
          </div>
        )}

        {/* messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ minHeight: 200 }}>
          {msgs.length === 0 && <p className="text-center text-xs text-white/40 py-8">{t("admin.crm.noMsgs")}</p>}
          {msgs.map((m) => (
            <div key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${m.direction === "out" ? "bg-emerald-600/80 text-white rounded-br-sm" : "bg-white/10 text-white rounded-bl-sm"}`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className="text-[9px] opacity-50 mt-0.5">{m.viaBot ? t("admin.crm.bot") : ""}{new Date(m.createdAt).toLocaleString(localeTag())}</p>
              </div>
            </div>
          ))}
        </div>

        {/* composer */}
        <div className="p-3 border-t border-white/10">
          {!connected && <p className="text-[11px] text-amber-300 mb-1.5">{t("admin.crm.notLinked")}</p>}
          <div className="flex items-end gap-2">
            <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (text.trim()) send.mutate(); } }} rows={1} placeholder={t("admin.crm.typeMsg")} className={inp + " flex-1 resize-none"} style={{ maxHeight: 120 }} />
            <button onClick={() => text.trim() && send.mutate()} disabled={send.isPending || !text.trim()} className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-black disabled:opacity-40" style={{ background: "#25D366" }}><Send className="w-5 h-5" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

// apply gold gradient to primary buttons via style since Tailwind class can't hold gradient var here
// (btn uses text-black; background set inline where used would be ideal, but keep simple)
