import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RebornLayout } from "@/components/RebornLayout";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Check, X, Ticket, Gift, Pill, Music2, Coins, Users as UsersIcon, Megaphone, ScrollText, Package, Calculator, Pencil, LayoutGrid, Disc3, HelpCircle, Settings as SettingsIcon, Send, ShoppingBag, Sparkles, Boxes, Contact, Download, MessageCircle, AlertTriangle, CalendarDays, Wine } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import { PasswordInput } from "@/components/PasswordInput";
import { useAuth } from "@/hooks/useAuth";

// Tabs staff (sub-admin) can use; the rest are full-admin only
const STAFF_TABS = ["Overview", "Bookings", "Requests", "Redemptions", "Bottles", "Top-ups", "Codes", "Pills", "Songs", "Events", "Users"] as const;
const ADMIN_TABS = ["Overview", "Bookings", "Requests", "Redemptions", "Bottles", "Top-ups", "Codes", "Pills", "Songs", "Events", "Broadcast", "CRM", "Users", "Products", "Inventory", "Accounting", "Prizes", "Gifts", "FAQ", "Settings", "Logs"] as const;

export default function RebornAdmin() {
  const { user } = useAuth();
  const isFullAdmin = (user as any)?.role === "admin";
  const TABS = (isFullAdmin ? ADMIN_TABS : STAFF_TABS) as readonly string[];
  const [tab, setTab] = useState<string>("Overview");
  return (
    <RebornLayout active="/reborn-admin" title="ADMIN">
      <div className="flex gap-1 p-1 rounded-2xl bg-white/5 border border-white/10 mb-5 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 min-w-[92px] py-2 px-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors inline-flex items-center justify-center gap-1.5 ${tab === t ? "text-black" : "text-white/60"}`} style={tab === t ? { background: "linear-gradient(90deg,#c9a84c,#f0d787)" } : undefined}>{TAB_ICON[t]}{t}</button>
        ))}
      </div>
      {tab === "Overview" && <Overview onGo={setTab} />}
      {tab === "Bookings" && <AdminBookings />}
      {tab === "Bottles" && <AdminBottles />}
      {tab === "Codes" && <Codes />}
      {tab === "Prizes" && <Prizes />}
      {tab === "Redemptions" && <Redemptions />}
      {tab === "Pills" && <Pills />}
      {tab === "FAQ" && <Faq />}
      {tab === "Songs" && <Songs />}
      {tab === "Requests" && <SongRequests />}
      {tab === "Gifts" && <GiftTypes />}
      {tab === "Settings" && <Settings />}
      {tab === "Users" && <Members />}
      {tab === "Top-ups" && <TopUps />}
      {tab === "Events" && <Events />}
      {tab === "Broadcast" && <Broadcast />}
      {tab === "Products" && <Products />}
      {tab === "Inventory" && <Inventory />}
      {tab === "Accounting" && <Accounting />}
      {tab === "CRM" && <Crm />}
      {tab === "Logs" && <Logs />}
    </RebornLayout>
  );
}

function Broadcast() {
  const { toast } = useToast();
  const [f, setF] = useState({ subject: "", body: "", channel: "both" });
  const send = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/broadcast", f).then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
    onSuccess: ({ ok, d }: any) => { if (!ok) { toast({ title: "Failed", description: d.message, variant: "destructive" }); return; } toast({ title: "Broadcast sent", description: d.message }); setF({ subject: "", body: "", channel: "both" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  return (
    <Card>
      <h3 className="font-bold mb-1 flex items-center gap-2"><Megaphone className="w-4 h-4 text-amber-300" /> Message all members</h3>
      <p className="text-xs text-white/50 mb-3">Send an announcement to every member — in their in-app chat, by email, or both.</p>
      <input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="Subject / title" className={inp + " w-full mb-2"} />
      <textarea value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="Your message…" rows={5} className={inp + " w-full mb-3"} />
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[["both", "Chat + Email"], ["inapp", "In-app only"], ["email", "Email only"]].map(([v, l]) => (
          <button key={v} onClick={() => setF({ ...f, channel: v })} className={`py-2.5 rounded-xl border text-sm font-semibold ${f.channel === v ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/10 bg-black/30 text-white/60"}`}>{l}</button>
        ))}
      </div>
      <button onClick={() => { if (confirm("Send this to ALL members?")) send.mutate(); }} disabled={send.isPending || !f.subject.trim() || !f.body.trim()} className={btn + " disabled:opacity-50"}>{send.isPending ? "Sending…" : "Send to all members"}</button>
    </Card>
  );
}

const TAB_ICON: Record<string, JSX.Element> = {
  Overview: <LayoutGrid className="w-4 h-4" />, Requests: <Music2 className="w-4 h-4" />, Redemptions: <Gift className="w-4 h-4" />,
  "Top-ups": <Coins className="w-4 h-4" />, Codes: <Ticket className="w-4 h-4" />, Pills: <Pill className="w-4 h-4" />,
  Songs: <Music2 className="w-4 h-4" />, Events: <Megaphone className="w-4 h-4" />, Broadcast: <Send className="w-4 h-4" />,
  Users: <UsersIcon className="w-4 h-4" />, Products: <Package className="w-4 h-4" />, Accounting: <Calculator className="w-4 h-4" />,
  Prizes: <Disc3 className="w-4 h-4" />, Gifts: <Sparkles className="w-4 h-4" />, FAQ: <HelpCircle className="w-4 h-4" />,
  Settings: <SettingsIcon className="w-4 h-4" />, Logs: <ScrollText className="w-4 h-4" />,
  Inventory: <Boxes className="w-4 h-4" />, CRM: <Contact className="w-4 h-4" />, Bookings: <CalendarDays className="w-4 h-4" />, Bottles: <Wine className="w-4 h-4" />,
};

function Overview({ onGo }: { onGo: (tab: string) => void }) {
  const { user } = useAuth();
  const isFullAdmin = (user as any)?.role === "admin";
  const { data: o } = useQuery<any>({ queryKey: ["/api/reborn/admin/overview"], queryFn: () => apiRequest("GET", "/api/reborn/admin/overview").then((r) => r.json()), refetchInterval: 15000 });
  const cards = [
    { tab: "Requests", label: "Song requests", count: o?.songRequests, hot: true },
    { tab: "Redemptions", label: "Prize redemptions", count: o?.redemptions, hot: true },
    { tab: "Top-ups", label: "RP top-ups", count: o?.topups, hot: true },
    { tab: "Users", label: "Members", count: o?.users },
    { tab: "Products", label: "Products", count: o?.products, admin: true },
    { tab: "Products", label: "Low stock", count: o?.lowStock, warn: true, admin: true },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        {cards.filter((c) => !c.admin || isFullAdmin).map((c, i) => (
          <button key={i} onClick={() => onGo(c.tab)} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 active:scale-95 transition-all">
            <div className="flex items-center justify-between">
              <span className={`text-3xl font-extrabold ${c.warn && c.count > 0 ? "text-red-400" : c.hot && c.count > 0 ? "text-amber-300" : "text-white"}`}>{c.count ?? "—"}</span>
              {c.hot && c.count > 0 && <span className="text-[10px] font-bold text-black bg-amber-300 px-1.5 py-0.5 rounded-full">TO DO</span>}
            </div>
            <p className="text-sm text-white/60 mt-1">{c.label}</p>
          </button>
        ))}
      </div>
      <p className="text-xs text-white/40 mb-2 px-1">Open a section</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {(isFullAdmin ? ADMIN_TABS : STAFF_TABS).filter((t) => t !== "Overview").map((t) => (
          <button key={t} onClick={() => onGo(t)} className="py-4 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-white/70 hover:bg-white/10 hover:border-amber-400/40 flex flex-col items-center gap-2">
            <span className="text-amber-300">{TAB_ICON[t]}</span>{t}
          </button>
        ))}
      </div>
    </div>
  );
}

function Members() {
  const { toast } = useToast();
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
  const save = useMutation({ mutationFn: (u: any) => apiRequest("POST", `/api/reborn/admin/users/${u.id}`, u).then((r) => r.json()), onSuccess: () => { toast({ title: "Member updated" }); refetch(); }, onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }) });
  const del = useMutation({ mutationFn: (id: string) => apiRequest("DELETE", `/api/reborn/admin/users/${id}`, {}).then((r) => r.json()), onSuccess: (d: any) => { toast({ title: d.message || "Deleted" }); refetch(); }, onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }) });
  const reset = useMutation({
    mutationFn: (password: string) => apiRequest("POST", "/api/reborn/admin/reset-numbers", { password }).then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
    onSuccess: ({ ok, d }: any) => { if (!ok) { toast({ title: "Failed", description: d.message, variant: "destructive" }); return; } toast({ title: d.message }); refetch(); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  return (
    <div>
      {summary && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 text-center"><p className="text-[11px] text-white/50">Users</p><p className="font-extrabold">{summary.totalUsers}</p></div>
          <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 p-2.5 text-center"><p className="text-[11px] text-white/50">Total tokens</p><p className="font-extrabold text-amber-300">{summary.totalTokens}</p></div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 text-center"><p className="text-[11px] text-white/50">Total points</p><p className="font-extrabold">{summary.totalPoints}</p></div>
        </div>
      )}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name / username / email" className={inp + " w-full mb-2"} />
      <div className="flex flex-wrap gap-2 mb-3">
        {(["all", "active", "admin"] as const).map((f) => <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${filter === f ? "bg-amber-400 text-black" : "bg-white/5 text-white/60"}`}>{f === "admin" ? "Staff/Admin" : f}</button>)}
        <button onClick={() => setSort(sort === "tokens" ? "recent" : "tokens")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${sort === "tokens" ? "bg-amber-400 text-black" : "bg-white/5 text-white/60"}`}>Sort: {sort === "tokens" ? "tokens" : "recent"}</button>
      </div>
      {!isFullAdmin && <p className="text-xs text-white/40 mb-3">Only full admins can edit balances and roles.</p>}
      <div className="space-y-3">{users.map((u) => <MemberRow key={u.id} u={u} editable={isFullAdmin} onSave={save.mutate} onDelete={(id: string) => { if (confirm(`Delete ${u.firstName || u.username || u.email}? This cannot be undone.`)) del.mutate(id); }} />)}</div>
      {isFullAdmin && (
        <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-500/5 p-4">
          <h3 className="font-bold text-sm text-red-200 mb-1">⚠️ Reset numbers (main admin)</h3>
          <p className="text-[11px] text-white/50 mb-2">Zeros all members' tokens, points, credits, KGOLD and the prize pool. Users and items are NOT deleted. Requires the main-admin password (set it in Settings).</p>
          <button onClick={() => { const p = prompt("Main-admin password to reset ALL numbers:"); if (p) reset.mutate(p); }} disabled={reset.isPending} className={btnDel}>Reset all numbers</button>
        </div>
      )}
    </div>
  );
}
function MemberRow({ u, editable, onSave, onDelete }: any) {
  const [e, setE] = useState(u);
  return (
    <Card>
      <p className="font-semibold text-sm">{u.firstName || u.username || "Member"} <span className="text-white/40">· {u.email}</span></p>
      <p className="text-[11px] text-white/40 mb-2">id {u.id}</p>
      {editable ? (
        <>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <label className="text-xs text-white/50">First name<input value={e.firstName || ""} onChange={(x) => setE({ ...e, firstName: x.target.value })} className={inp + " w-full"} /></label>
            <label className="text-xs text-white/50">Last name<input value={e.lastName || ""} onChange={(x) => setE({ ...e, lastName: x.target.value })} className={inp + " w-full"} /></label>
            <label className="text-xs text-white/50 col-span-2">Email<input value={e.email || ""} onChange={(x) => setE({ ...e, email: x.target.value })} className={inp + " w-full"} /></label>
            <label className="text-xs text-white/50 col-span-2">Username<input value={e.username || ""} onChange={(x) => setE({ ...e, username: x.target.value })} className={inp + " w-full"} /></label>
            <label className="text-xs text-white/50 col-span-2">Membership card no. (add when they buy membership)<input value={e.membershipCardNumber || ""} onChange={(x) => setE({ ...e, membershipCardNumber: x.target.value })} placeholder="e.g. RWG-00123" className={inp + " w-full"} /></label>
            <div className="col-span-2"><span className="text-xs text-white/50">Reset password (leave blank to keep)</span><PasswordInput value={e.password || ""} onChange={(v) => setE({ ...e, password: v })} placeholder="New password" className={inp + " w-full"} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-white/50">Credits (RP)<input type="number" value={e.credits} onChange={(x) => setE({ ...e, credits: x.target.value })} className={inp + " w-full"} /></label>
            <label className="text-xs text-white/50">Points<input type="number" value={e.loyaltyPoints} onChange={(x) => setE({ ...e, loyaltyPoints: Number(x.target.value) })} className={inp + " w-full"} /></label>
            <label className="text-xs text-white/50">Tokens<input type="number" value={e.tokens} onChange={(x) => setE({ ...e, tokens: Number(x.target.value) })} className={inp + " w-full"} /></label>
            <label className="text-xs text-white/50">KGOLD<input type="number" value={e.kgold} onChange={(x) => setE({ ...e, kgold: Number(x.target.value) })} className={inp + " w-full"} /></label>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <label className="text-xs text-white/50">Role
              <select value={e.role || "user"} onChange={(x) => setE({ ...e, role: x.target.value })} className={inp + " ml-1"}>
                <option value="user">user</option><option value="staff">staff (sub-admin)</option><option value="admin">admin</option>
              </select>
            </label>
            <button onClick={() => onSave(e)} className={btn + " ml-auto"}>Save</button>
            {onDelete && <button onClick={() => onDelete(u.id)} className={btnDel}><Trash2 className="w-4 h-4" /></button>}
          </div>
        </>
      ) : (
        <p className="text-xs text-white/60">RP {u.credits} · {u.loyaltyPoints} pts · {u.tokens} tokens · {u.kgold} KGOLD · <b>{u.role}</b></p>
      )}
    </Card>
  );
}

function TopUps() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/topups"], queryFn: () => apiRequest("GET", "/api/reborn/admin/topups").then((r) => r.json()), refetchInterval: 15000 });
  const act = useMutation({ mutationFn: ({ id, approve }: any) => apiRequest("POST", `/api/reborn/admin/topups/${id}`, { approve }), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/reborn/admin/topups"] }) });
  if (rows.length === 0) return <Empty text="No pending top-up requests." />;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <Card key={r.id}>
          <div className="flex items-center gap-3">
            <Coins className="w-5 h-5 text-amber-300" />
            <div className="flex-1 min-w-0"><p className="font-semibold text-sm">RP {Number(r.amount).toLocaleString()}</p><p className="text-xs text-white/40 truncate">{r.paymentMethod} · user {r.userId?.slice(0, 8)} · {new Date(r.createdAt).toLocaleString()}</p></div>
            <button onClick={() => act.mutate({ id: r.id, approve: true })} className={btnSave}><Check className="w-4 h-4" /> Approve</button>
            <button onClick={() => act.mutate({ id: r.id, approve: false })} className={btnDel}><X className="w-4 h-4" /></button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Events() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/events"], queryFn: () => apiRequest("GET", "/api/reborn/admin/events").then((r) => r.json()) });
  const inv = () => qc.invalidateQueries({ queryKey: ["/api/reborn/admin/events"] });
  const add = useMutation({ mutationFn: () => apiRequest("POST", "/api/reborn/admin/events", { title: "New event", body: "" }).then((r) => r.json()), onSuccess: inv });
  const save = useMutation({ mutationFn: (ev: any) => apiRequest("PUT", `/api/reborn/admin/events/${ev.id}`, ev).then((r) => r.json()), onSuccess: inv });
  const del = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/reborn/admin/events/${id}`), onSuccess: inv });
  return (
    <div>
      <button onClick={() => add.mutate()} className={btn + " mb-4"}><Plus className="w-4 h-4" /> Post event</button>
      <div className="space-y-3">{rows.map((ev) => <EventRow key={ev.id} ev={ev} onSave={save.mutate} onDelete={del.mutate} />)}</div>
    </div>
  );
}
function EventRow({ ev, onSave, onDelete }: any) {
  const [e, setE] = useState(ev);
  return (
    <Card>
      <input value={e.title} onChange={(x) => setE({ ...e, title: x.target.value })} placeholder="Event title" className={inp + " w-full mb-2"} />
      <textarea value={e.body || ""} onChange={(x) => setE({ ...e, body: x.target.value })} placeholder="Details" rows={2} className={inp + " w-full mb-2"} />
      <div className="mb-2"><p className="text-xs text-white/50 mb-1">Event image (optional)</p><ImageUpload value={e.imageUrl} onChange={(v) => setE({ ...e, imageUrl: v })} label="Upload image" /></div>
      <div className="flex items-center gap-3">
        <label className="text-xs text-white/50 flex items-center gap-1"><input type="checkbox" checked={e.active} onChange={(x) => setE({ ...e, active: x.target.checked })} /> active</label>
        <label className="text-xs text-white/50 flex items-center gap-1"><input type="checkbox" checked={e.showOnLogin} onChange={(x) => setE({ ...e, showOnLogin: x.target.checked })} /> show at login</label>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={() => onSave(e)} className={btnSave + " flex-1 justify-center"}><Check className="w-4 h-4" /> Save</button>
        <button onClick={() => onDelete(ev.id)} className={btnDel}><Trash2 className="w-4 h-4" /> Delete</button>
      </div>
    </Card>
  );
}

function Logs() {
  const { data: rows = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/logs"], queryFn: () => apiRequest("GET", "/api/reborn/admin/logs").then((r) => r.json()), refetchInterval: 20000 });
  if (rows.length === 0) return <Empty text="No admin activity yet." />;
  return (
    <div className="space-y-1.5">
      {rows.map((l) => (
        <div key={l.id} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs">
          <div className="flex justify-between"><span className="font-semibold">{l.description}</span><span className="text-white/30">{new Date(l.createdAt).toLocaleString()}</span></div>
          <span className="text-white/40">{l.action} · {l.entityType} · by <span className="text-amber-300/80">{l.adminName || l.adminUserId?.slice(0, 8)}</span></span>
        </div>
      ))}
    </div>
  );
}

function GiftTypes() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/gifttypes"], queryFn: () => apiRequest("GET", "/api/reborn/admin/gifttypes").then((r) => r.json()) });
  const inv = () => qc.invalidateQueries({ queryKey: ["/api/reborn/admin/gifttypes"] });
  const add = useMutation({ mutationFn: () => apiRequest("POST", "/api/reborn/admin/gifttypes", { name: "New gift", emoji: "🎁", kgoldCost: 1000 }).then((r) => r.json()), onSuccess: inv });
  const save = useMutation({ mutationFn: (g: any) => apiRequest("PUT", `/api/reborn/admin/gifttypes/${g.id}`, g).then((r) => r.json()), onSuccess: inv });
  const del = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/reborn/admin/gifttypes/${id}`), onSuccess: inv });
  return (
    <div>
      <button onClick={() => add.mutate()} className={btn + " mb-4"}><Plus className="w-4 h-4" /> Add gift</button>
      <div className="space-y-3">{rows.map((g) => <GiftRow key={g.id} g={g} onSave={save.mutate} onDelete={del.mutate} />)}</div>
      <p className="text-xs text-white/40 mt-3">Set the KGOLD cost per gift. Animation: pop, float, zoom, or rain. Image URL is optional (falls back to the emoji).</p>
    </div>
  );
}
function GiftRow({ g, onSave, onDelete }: any) {
  const [e, setE] = useState(g);
  return (
    <Card>
      <div className="flex gap-2 items-center mb-2">
        <input value={e.emoji || ""} onChange={(x) => setE({ ...e, emoji: x.target.value })} className={inp + " w-14 text-center"} />
        <input value={e.name} onChange={(x) => setE({ ...e, name: x.target.value })} placeholder="Gift name" className={inp + " flex-1"} />
      </div>
      <div className="mb-2"><p className="text-xs text-white/50 mb-1">Gift image (optional — falls back to emoji)</p><ImageUpload value={e.imageUrl} onChange={(v) => setE({ ...e, imageUrl: v })} label="Upload image" /></div>
      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-xs text-white/50">KGOLD<input type="number" value={e.kgoldCost} onChange={(x) => setE({ ...e, kgoldCost: Number(x.target.value) })} className={inp + " w-24 ml-1"} /></label>
        <select value={e.animation} onChange={(x) => setE({ ...e, animation: x.target.value })} className={inp}>{["pop", "float", "zoom", "rain"].map((a) => <option key={a} value={a}>{a}</option>)}</select>
        <label className="text-xs text-white/50 flex items-center gap-1"><input type="checkbox" checked={e.active} onChange={(x) => setE({ ...e, active: x.target.checked })} /> active</label>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={() => onSave(e)} className={btnSave + " flex-1 justify-center"}><Check className="w-4 h-4" /> Save</button>
        <button onClick={() => onDelete(g.id)} className={btnDel}><Trash2 className="w-4 h-4" /> Delete</button>
      </div>
    </Card>
  );
}

function Settings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data } = useQuery<any>({ queryKey: ["/api/reborn/admin/settings"], queryFn: () => apiRequest("GET", "/api/reborn/admin/settings").then((r) => r.json()) });
  const [e, setE] = useState<any>(null);
  const cur = e || data;
  const save = useMutation({ mutationFn: () => apiRequest("POST", "/api/reborn/admin/settings", cur).then((r) => r.json()), onSuccess: () => { toast({ title: "Settings saved" }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/settings"] }); } });
  if (!cur) return <Empty text="Loading…" />;
  const set = (k: string, v: any) => setE({ ...cur, [k]: Number(v) });
  const setStr = (k: string, v: any) => setE({ ...cur, [k]: v });
  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-bold mb-3 flex items-center gap-2"><Coins className="w-4 h-4 text-amber-300" /> KGOLD economy</h3>
        <Field label="Gift fee % (kept by club; receiver gets the rest)" value={cur.giftFeePercent} onChange={(v: any) => set("giftFeePercent", v)} />
        <Field label="KGOLD per 1 RP" value={cur.kgoldPerRp} onChange={(v: any) => set("kgoldPerRp", v)} />
        <Field label="Minimum KGOLD purchase" value={cur.minBuyKgold} onChange={(v: any) => set("minBuyKgold", v)} />
        <Field label="Minimum RP to cash out" value={cur.minCashoutRp} onChange={(v: any) => set("minCashoutRp", v)} />
      </Card>
      <Card>
        <h3 className="font-bold mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-amber-300" /> POS & receipts</h3>
        <Field label="Sales tax % (applied at checkout)" value={cur.taxPercent} onChange={(v: any) => set("taxPercent", v)} />
        <label className="block mb-3"><span className="text-xs text-white/60 block mb-1">Club name (on receipt)</span><input value={cur.clubName || ""} onChange={(e) => setStr("clubName", e.target.value)} className={inp + " w-full"} /></label>
        <label className="block mb-3"><span className="text-xs text-white/60 block mb-1">Receipt footer</span><input value={cur.receiptFooter || ""} onChange={(e) => setStr("receiptFooter", e.target.value)} className={inp + " w-full"} /></label>
        <p className="text-xs text-white/60 mb-1">Receipt logo</p>
        <ImageUpload value={cur.receiptLogoUrl} onChange={(v) => setStr("receiptLogoUrl", v)} label="Upload logo" />
      </Card>
      <Card>
        <h3 className="font-bold mb-1 flex items-center gap-2"><Calculator className="w-4 h-4 text-amber-300" /> Booking areas (by level)</h3>
        <p className="text-[11px] text-white/50 mb-3">Hours are fixed: Sun–Thu 5pm–2am · Fri–Sat 5pm–3am · 2-hour slots. Each area shows on the member booking page and on WhatsApp. Add tables/rooms and a layout image where guests pick a spot (e.g. KTV Lounge).</p>
        <BookingAreasEditor value={cur.bookingAreas} onChange={(v) => setStr("bookingAreas", v)} />
        <label className="block mt-3"><span className="text-xs text-white/60 block mb-1">Booking note (optional, shown with timings)</span><input value={cur.bookingNote || ""} onChange={(e) => setStr("bookingNote", e.target.value)} className={inp + " w-full"} /></label>
      </Card>
      <Card>
        <h3 className="font-bold mb-1 flex items-center gap-2"><MessageCircle className="w-4 h-4 text-amber-300" /> Reviews & referral</h3>
        <label className="block mb-3"><span className="text-xs text-white/60 block mb-1">Google review link (sent on WhatsApp after payment)</span><input value={cur.googleReviewUrl || ""} onChange={(e) => setStr("googleReviewUrl", e.target.value)} placeholder="https://g.page/r/..." className={inp + " w-full"} /></label>
        <label className="block"><span className="text-xs text-white/60 block mb-1">House referral account — user ID that owns un-referred signups (commission)</span><input value={cur.houseReferralUserId || ""} onChange={(e) => setStr("houseReferralUserId", e.target.value)} placeholder="e.g. your admin user id" className={inp + " w-full"} /></label>
        <p className="text-[11px] text-white/40 mt-1">Signups from the website or WhatsApp with no referral code are credited to this account.</p>
      </Card>
      <Card>
        <h3 className="font-bold mb-1 flex items-center gap-2"><Disc3 className="w-4 h-4 text-amber-300" /> Lucky Spin prize pool</h3>
        <p className="text-[11px] text-white/50 mb-3">The pool is funded by the <b>10% on un-referred sales</b> (a referred buyer's 10% goes to their referrer instead). Raise the % to grow the pool faster. Spins only award a prize the pool can afford; below the minimum (or empty) spins land on "nothing". Set each prize's <b>cost RP</b> in the Prizes tab.</p>
        <Field label="Tokens spent per spin" value={cur.spinTokenCost} onChange={(v: any) => set("spinTokenCost", v)} />
        <Field label="Pool contribution % of un-referred sales" value={cur.spinPoolPercent} onChange={(v: any) => set("spinPoolPercent", v)} />
        <Field label="Assumed bill (RP) for % voucher cost" value={cur.spinAssumedBill} onChange={(v: any) => set("spinAssumedBill", v)} />
        <Field label="Minimum pool before prizes pay out (min 1,000,000)" value={cur.spinPoolMin} onChange={(v: any) => set("spinPoolMin", v)} />
        <SpinPool />
      </Card>
      <Card>
        <h3 className="font-bold mb-1 flex items-center gap-2"><Coins className="w-4 h-4 text-red-300" /> Main-admin security</h3>
        <p className="text-[11px] text-white/50 mb-3">Password required to <b>reset all numbers</b> (zero every member's tokens/points/credits + the prize pool) from the Members tab. Keep it separate from your login password.</p>
        <label className="block"><span className="text-xs text-white/60 block mb-1">Main-admin reset password</span><PasswordInput value={cur.mainAdminPassword || ""} onChange={(v) => setStr("mainAdminPassword", v)} placeholder="Set a strong password" className={inp + " w-full"} /></label>
      </Card>
      <button onClick={() => save.mutate()} className={btn}>Save settings</button>
    </div>
  );
}
function Field({ label, value, onChange }: any) {
  return <label className="block mb-3"><span className="text-xs text-white/60 block mb-1">{label}</span><input type="number" value={value} onChange={(e) => onChange(e.target.value)} className={inp + " w-full"} /></label>;
}

function SpinPool() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data } = useQuery<any>({ queryKey: ["/api/reborn/admin/spin-pool"], queryFn: () => apiRequest("GET", "/api/reborn/admin/spin-pool").then((r) => r.json()) });
  const [amt, setAmt] = useState("");
  const money = (v: number) => "RP " + Math.round(v || 0).toLocaleString();
  const adjust = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/reborn/admin/spin-pool", body).then((r) => r.json()),
    onSuccess: () => { toast({ title: "Pool updated" }); setAmt(""); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/spin-pool"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/accounting/summary"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  return (
    <div className="mt-2 rounded-xl bg-amber-500/10 border border-amber-400/30 p-3">
      <p className="text-xs text-white/50">Current pool balance</p>
      <p className="text-xl font-extrabold text-amber-300">{money(data?.balance || 0)}</p>
      <div className="flex gap-2 mt-2">
        <input value={amt} onChange={(e) => setAmt(e.target.value)} type="number" placeholder="Amount RP" className={inp + " flex-1"} />
        <button onClick={() => adjust.mutate({ add: Number(amt) })} disabled={!amt || adjust.isPending} className={btnSave}>Add</button>
        <button onClick={() => { if (confirm(`Set pool to RP ${Number(amt).toLocaleString()}?`)) adjust.mutate({ set: Number(amt) }); }} disabled={amt === "" || adjust.isPending} className="px-3 py-2 rounded-lg text-sm font-semibold bg-white/10 text-white/70">Set</button>
      </div>
      <p className="text-[11px] text-white/40 mt-1">Add tops up the pool; Set overwrites it. Contributions & prize payouts adjust it automatically.</p>
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
  const parse = (): any[] => { try { const a = JSON.parse(value || ""); if (Array.isArray(a) && a.length) return a; } catch {} return DEFAULT_AREAS; };
  const [areas, setAreas] = useState<any[]>(parse);
  const push = (next: any[]) => { setAreas(next); onChange(JSON.stringify(next)); };
  const upd = (i: number, patch: any) => push(areas.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  const add = () => push([...areas, { id: `area-${Date.now().toString(36)}`, name: "New area", level: "Level 1", image: "", tables: [] }]);
  const remove = (i: number) => push(areas.filter((_, j) => j !== i));
  return (
    <div className="space-y-3">
      {areas.map((a, i) => (
        <div key={a.id || i} className={`rounded-xl border p-3 ${a.enabled === false ? "border-white/10 bg-black/40 opacity-60" : "border-white/10 bg-black/20"}`}>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input value={a.name} onChange={(e) => upd(i, { name: e.target.value })} placeholder="Area name" className={inp} />
            <input value={a.level} onChange={(e) => upd(i, { level: e.target.value })} placeholder="Level" className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <label className="text-[11px] text-white/50">Open<input type="time" value={a.open || ""} onChange={(e) => upd(i, { open: e.target.value })} className={inp + " w-full"} style={{ colorScheme: "dark" }} /></label>
            <label className="text-[11px] text-white/50">Close<input type="time" value={a.close || ""} onChange={(e) => upd(i, { close: e.target.value })} className={inp + " w-full"} style={{ colorScheme: "dark" }} /></label>
          </div>
          <p className="text-[10px] text-white/35 mb-2">Default hours above. Set per-day below to override or close a day (applies to app + WhatsApp).</p>
          <WeeklySchedule area={a} onChange={(schedule: any) => upd(i, { schedule })} />
          <input value={(a.tables || []).join(", ")} onChange={(e) => upd(i, { tables: e.target.value.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean) })} placeholder="Tables/rooms (comma) — leave empty for none" className={inp + " w-full mb-2 mt-2"} />
          <div className="flex items-center justify-between gap-2">
            <ImageUpload value={a.image} onChange={(v) => upd(i, { image: v })} label="Layout image" output="jpeg" maxDim={900} />
            <div className="flex items-center gap-2">
              <button onClick={() => upd(i, { enabled: a.enabled === false })} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${a.enabled === false ? "bg-white/10 text-white/50" : "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"}`}>{a.enabled === false ? "Hidden" : "Visible"}</button>
              <button onClick={() => remove(i)} className={btnDel}><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      ))}
      <button onClick={add} className={btn + " w-full justify-center"}><Plus className="w-4 h-4" /> Add area</button>
    </div>
  );
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function WeeklySchedule({ area, onChange }: { area: any; onChange: (s: any) => void }) {
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
        <span>Weekly schedule (Mon–Sun) {open ? "▲" : "▼"}</span>
        <span className="text-white/30">tap to {open ? "hide" : "edit"}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-1">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => {
            const cfg = sched[String(d)] || {};
            const enabled = cfg.enabled !== false;
            return (
              <div key={d} className="flex items-center gap-2">
                <button onClick={() => setDay(d, { enabled: !enabled })} className={`w-12 py-1 rounded text-[11px] font-bold ${enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-white/30 line-through"}`}>{WEEKDAYS[d]}</button>
                <input type="time" value={cfg.open || ""} disabled={!enabled} onChange={(e) => setDay(d, { open: e.target.value })} className={inp + " flex-1"} style={{ colorScheme: "dark" }} />
                <input type="time" value={cfg.close || ""} disabled={!enabled} onChange={(e) => setDay(d, { close: e.target.value })} className={inp + " flex-1"} style={{ colorScheme: "dark" }} />
              </div>
            );
          })}
          <p className="text-[10px] text-white/35">Leave a day's times blank to use the default hours above. Toggle the day off to close it.</p>
        </div>
      )}
    </div>
  );
}

function Songs() {
  const qc = useQueryClient();
  const { data: songs = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/songs"], queryFn: () => apiRequest("GET", "/api/reborn/songs").then((r) => r.json()) });
  const inv = () => qc.invalidateQueries({ queryKey: ["/api/reborn/songs"] });
  const add = useMutation({ mutationFn: () => apiRequest("POST", "/api/reborn/admin/songs", { title: "New hit song", isHit: true }).then((r) => r.json()), onSuccess: inv });
  const save = useMutation({ mutationFn: (s: any) => apiRequest("PUT", `/api/reborn/admin/songs/${s.id}`, s).then((r) => r.json()), onSuccess: inv });
  const del = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/reborn/admin/songs/${id}`), onSuccess: inv });
  return (
    <div>
      <button onClick={() => add.mutate()} className={btn + " mb-4"}><Plus className="w-4 h-4" /> Add hit song</button>
      <div className="space-y-3">{songs.map((s) => <SongRow key={s.id} s={s} onSave={save.mutate} onDelete={del.mutate} />)}</div>
    </div>
  );
}
function SongRow({ s, onSave, onDelete }: any) {
  const [e, setE] = useState(s);
  return (
    <Card>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <input value={e.title} onChange={(x) => setE({ ...e, title: x.target.value })} placeholder="Song name 中文" className={inp} />
        <input value={e.titlePinyin || ""} onChange={(x) => setE({ ...e, titlePinyin: x.target.value })} placeholder="Song pinyin" className={inp} />
        <input value={e.artist || ""} onChange={(x) => setE({ ...e, artist: x.target.value })} placeholder="Singer 中文" className={inp} />
        <input value={e.artistPinyin || ""} onChange={(x) => setE({ ...e, artistPinyin: x.target.value })} placeholder="Singer pinyin" className={inp} />
      </div>
      <input value={e.spotifyUrl || ""} onChange={(x) => setE({ ...e, spotifyUrl: x.target.value })} placeholder="Spotify link" className={inp + " w-full mb-2"} />
      <div className="mb-2"><p className="text-xs text-white/50 mb-1">Singer photo</p><ImageUpload value={e.artistPhoto} onChange={(v) => setE({ ...e, artistPhoto: v })} shape="circle" label="Upload photo" /></div>
      <label className="text-xs text-white/50 flex items-center gap-1 mb-2"><input type="checkbox" checked={e.isHit} onChange={(x) => setE({ ...e, isHit: x.target.checked })} /> hit song (Top list)</label>
      <div className="flex gap-2">
        <button onClick={() => onSave(e)} className={btnSave + " flex-1 justify-center"}><Check className="w-4 h-4" /> Save</button>
        <button onClick={() => onDelete(s.id)} className={btnDel}><Trash2 className="w-4 h-4" /> Delete</button>
      </div>
    </Card>
  );
}

function SongRequests() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/song-requests"], queryFn: () => apiRequest("GET", "/api/reborn/admin/song-requests").then((r) => r.json()) });
  const act = useMutation({ mutationFn: ({ id, approve, comment }: any) => apiRequest("POST", `/api/reborn/admin/song-requests/${id}`, { approve, comment }), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/reborn/admin/song-requests"] }) });
  if (rows.length === 0) return <Empty text="No pending song requests." />;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <Card key={r.id}>
          <div className="flex items-center gap-3">
            <Music2 className="w-5 h-5 text-amber-300 flex-shrink-0" />
            <div className="flex-1 min-w-0"><p className="font-semibold text-sm truncate">{r.title}</p><p className="text-xs text-white/40 truncate">{r.artist || "—"} · user {r.userId?.slice(0, 8)}</p></div>
            <button onClick={() => act.mutate({ id: r.id, approve: true })} className={btnSave}><Check className="w-4 h-4" /> Confirm</button>
            <button onClick={() => { const comment = prompt("Reject — reason/comment (optional):", "") ?? undefined; act.mutate({ id: r.id, approve: false, comment }); }} className={btnDel}><X className="w-4 h-4" /> Reject</button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function useCrud(key: string) {
  const qc = useQueryClient();
  return { qc, invalidate: () => qc.invalidateQueries({ queryKey: [key] }) };
}

function Codes() {
  const { toast } = useToast();
  const { qc } = useCrud("/api/reborn/admin/codes");
  const [count, setCount] = useState(5);
  const [gender, setGender] = useState("male");
  const { data: codes = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/codes"], queryFn: () => apiRequest("GET", "/api/reborn/admin/codes").then((r) => r.json()) });
  const gen = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/codes", { count, gender }).then((r) => r.json()),
    onSuccess: (d) => { toast({ title: `${d.codes.length} codes generated` }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/codes"] }); },
  });
  return (
    <div>
      <Card>
        <h3 className="font-bold mb-3 flex items-center gap-2"><Ticket className="w-4 h-4 text-amber-300" /> Generate activation codes</h3>
        <div className="flex flex-wrap gap-2 items-center">
          <input type="number" min={1} max={200} value={count} onChange={(e) => setCount(Number(e.target.value))} className={inp + " w-20"} />
          <select value={gender} onChange={(e) => setGender(e.target.value)} className={inp}><option value="male">Male pet</option><option value="female">Female pet</option></select>
          <button onClick={() => gen.mutate()} className={btn}><Plus className="w-4 h-4" /> Generate</button>
        </div>
      </Card>
      <div className="mt-4 space-y-1">
        {codes.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm">
            <span className="font-mono font-bold tracking-wider">{c.code}</span>
            <span className="text-xs text-white/50">{c.petGender} · {c.used ? "used" : "unused"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Prizes() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: prizes = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/prizes"], queryFn: () => apiRequest("GET", "/api/reborn/admin/prizes").then((r) => r.json()) });
  const inv = () => qc.invalidateQueries({ queryKey: ["/api/reborn/admin/prizes"] });
  const add = useMutation({ mutationFn: () => apiRequest("POST", "/api/reborn/admin/prizes", { label: "New prize", prizeType: "item", weight: 10 }).then((r) => r.json()), onSuccess: inv });
  const save = useMutation({ mutationFn: (p: any) => apiRequest("PUT", `/api/reborn/admin/prizes/${p.id}`, p).then((r) => r.json()), onSuccess: () => { toast({ title: "Saved" }); inv(); } });
  const del = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/reborn/admin/prizes/${id}`), onSuccess: inv });
  const totalWeight = prizes.reduce((s, p) => s + (p.active ? Number(p.weight) || 0 : 0), 0) || 1;
  return (
    <div>
      <button onClick={() => add.mutate()} className={btn + " mb-4"}><Plus className="w-4 h-4" /> Add prize</button>
      <div className="space-y-3">
        {prizes.map((p) => <PrizeRow key={p.id} p={p} totalWeight={totalWeight} onSave={save.mutate} onDelete={del.mutate} />)}
      </div>
      <p className="text-xs text-white/40 mt-3">Win rate = the chance each prize is won (higher = more often). Set big prizes low so members can't keep winning them. Types: item, voucher_percent, voucher_amount, pill (revives a pet), free_spin, nothing.</p>
    </div>
  );
}
function PrizeRow({ p, totalWeight, onSave, onDelete }: any) {
  const [e, setE] = useState(p);
  const pct = e.active ? Math.round(((Number(e.weight) || 0) / totalWeight) * 100) : 0;
  return (
    <Card>
      <div className="flex flex-wrap gap-2 items-center">
        <input value={e.label} onChange={(x) => setE({ ...e, label: x.target.value })} className={inp + " flex-1 min-w-[140px]"} />
        <input type="color" value={e.colorHex || "#c9a84c"} onChange={(x) => setE({ ...e, colorHex: x.target.value })} className="w-9 h-9 rounded bg-transparent border border-white/10" />
      </div>
      <div className="flex flex-wrap gap-2 items-center mt-2">
        <select value={e.prizeType} onChange={(x) => setE({ ...e, prizeType: x.target.value })} className={inp}>
          {["item", "voucher_percent", "voucher_amount", "pill", "free_spin", "nothing"].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <label className="text-xs text-white/50" title="For % voucher: the discount %. For RP voucher: the RP amount.">value<input type="number" value={e.value} onChange={(x) => setE({ ...e, value: Number(x.target.value) })} className={inp + " w-20 ml-1"} /></label>
        {e.prizeType === "voucher_percent"
          ? <span className="text-[11px] text-white/40" title="Cost is auto = value% × the assumed bill (Settings)">cost: auto {e.value || 0}% of bill</span>
          : <label className="text-xs text-white/50" title="RP drawn from the prize pool when won (0 = free outcome)">cost RP<input type="number" value={e.costRp || 0} onChange={(x) => setE({ ...e, costRp: Number(x.target.value) })} className={inp + " w-24 ml-1"} /></label>}
        <label className="text-xs text-white/50">win rate<input type="number" value={e.weight} onChange={(x) => setE({ ...e, weight: Number(x.target.value) })} className={inp + " w-16 ml-1"} /></label>
        <span className="text-xs font-bold text-amber-300" title="Chance of winning this prize">≈{pct}%</span>
        <label className="text-xs text-white/50 flex items-center gap-1"><input type="checkbox" checked={e.active} onChange={(x) => setE({ ...e, active: x.target.checked })} /> active</label>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={() => onSave(e)} className={btnSave + " flex-1 justify-center"}><Check className="w-4 h-4" /> Save</button>
        <button onClick={() => onDelete(p.id)} className={btnDel}><Trash2 className="w-4 h-4" /> Delete</button>
      </div>
    </Card>
  );
}

function Redemptions() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/redemptions"], queryFn: () => apiRequest("GET", "/api/reborn/admin/redemptions").then((r) => r.json()) });
  const act = useMutation({ mutationFn: ({ id, approve }: any) => apiRequest("POST", `/api/reborn/admin/redemptions/${id}`, { approve }), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/reborn/admin/redemptions"] }) });
  if (rows.length === 0) return <Empty text="No prizes waiting to be redeemed." />;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <Card key={r.id}>
          <div className="flex items-center gap-3">
            <Gift className="w-5 h-5 text-amber-300" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{r.prizeLabel}</p>
              <p className="text-xs text-white/40">user {r.userId?.slice(0, 8)} · {new Date(r.createdAt).toLocaleString()}</p>
            </div>
            <button onClick={() => act.mutate({ id: r.id, approve: true })} className={btnSave}><Check className="w-4 h-4" /> Approve</button>
            <button onClick={() => act.mutate({ id: r.id, approve: false })} className={btnDel}><X className="w-4 h-4" /></button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Pills() {
  const { toast } = useToast();
  const [userId, setUserId] = useState("");
  const grant = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/grant-pill", { userId: userId.trim() }).then((r) => r.json()),
    onSuccess: (d) => { toast({ title: d.message }); setUserId(""); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  return (
    <Card>
      <h3 className="font-bold mb-2 flex items-center gap-2"><Pill className="w-4 h-4 text-rose-400" /> Grant revival pill</h3>
      <p className="text-sm text-white/60 mb-3">After a member spends 300,000 RP, grant them a pill to revive/extend their pet 15 days. Enter their user ID (from their profile).</p>
      <div className="flex gap-2">
        <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="user id" className={inp + " flex-1"} />
        <button onClick={() => grant.mutate()} disabled={!userId.trim()} className={btn}>Grant pill</button>
      </div>
    </Card>
  );
}

function Faq() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/faq"], queryFn: () => apiRequest("GET", "/api/reborn/admin/faq").then((r) => r.json()) });
  const inv = () => qc.invalidateQueries({ queryKey: ["/api/reborn/admin/faq"] });
  const add = useMutation({ mutationFn: () => apiRequest("POST", "/api/reborn/admin/faq", { question: "New question", answer: "Answer", keywords: "" }).then((r) => r.json()), onSuccess: inv });
  const save = useMutation({ mutationFn: (f: any) => apiRequest("PUT", `/api/reborn/admin/faq/${f.id}`, f).then((r) => r.json()), onSuccess: inv });
  const del = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/reborn/admin/faq/${id}`), onSuccess: inv });
  return (
    <div>
      <button onClick={() => add.mutate()} className={btn + " mb-4"}><Plus className="w-4 h-4" /> Add FAQ</button>
      <div className="space-y-3">{items.map((f) => <FaqRow key={f.id} f={f} onSave={save.mutate} onDelete={del.mutate} />)}</div>
      <p className="text-xs text-white/40 mt-3">Keywords (comma-separated) are matched against member questions for instant auto-replies.</p>
    </div>
  );
}
function FaqRow({ f, onSave, onDelete }: any) {
  const [e, setE] = useState(f);
  return (
    <Card>
      <input value={e.question} onChange={(x) => setE({ ...e, question: x.target.value })} placeholder="Question" className={inp + " w-full mb-2"} />
      <textarea value={e.answer} onChange={(x) => setE({ ...e, answer: x.target.value })} placeholder="Answer" rows={2} className={inp + " w-full mb-2"} />
      <input value={e.keywords || ""} onChange={(x) => setE({ ...e, keywords: x.target.value })} placeholder="keywords, comma, separated" className={inp + " w-full mb-2"} />
      <div className="flex gap-2">
        <button onClick={() => onSave(e)} className={btnSave + " flex-1 justify-center"}><Check className="w-4 h-4" /> Save</button>
        <button onClick={() => onDelete(f.id)} className={btnDel + " justify-center"}><Trash2 className="w-4 h-4" /> Delete</button>
      </div>
    </Card>
  );
}

const inp = "px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400/60";
const btn = "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-black text-sm bg-amber-400 hover:bg-amber-300";
const btnSm = "inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10";
const btnSave = "inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-bold bg-emerald-500 text-black hover:bg-emerald-400";
const btnDel = "inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold text-red-200 bg-red-500/15 border border-red-400/40 hover:bg-red-500/25";
function Card({ children }: any) { return <div className="rounded-2xl bg-white/5 border border-white/10 p-4">{children}</div>; }
function Empty({ text }: any) { return <div className="text-center py-12 text-white/40">{text}</div>; }

function Products() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: products = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/pos/products"], queryFn: () => apiRequest("GET", "/api/reborn/pos/products").then((r) => r.json()) });
  const [n, setN] = useState({ name: "", category: "General", price: 0, cost: 0, stock: 0, imageUrl: "" });
  const create = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/pos/products", n).then((r) => r.json()),
    onSuccess: () => { toast({ title: "Product added" }); setN({ name: "", category: "General", price: 0, cost: 0, stock: 0, imageUrl: "" }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  return (
    <div className="space-y-3">
      <Card>
        <p className="font-bold mb-2 flex items-center gap-2"><Package className="w-4 h-4 text-amber-300" /> Add product</p>
        <label className="text-xs text-white/50 block mb-2">Product name<input value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} placeholder="e.g. Heineken" className={inp + " w-full"} /></label>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <label className="text-xs text-white/50">Category<input value={n.category} onChange={(e) => setN({ ...n, category: e.target.value })} placeholder="Drinks" className={inp + " w-full"} /></label>
          <label className="text-xs text-white/50">Stock quantity<input type="number" value={n.stock} onChange={(e) => setN({ ...n, stock: Number(e.target.value) })} className={inp + " w-full"} /></label>
          <label className="text-xs text-white/50">Sell price (RP)<input type="number" value={n.price} onChange={(e) => setN({ ...n, price: Number(e.target.value) })} className={inp + " w-full"} /></label>
          <label className="text-xs text-white/50">Unit cost (RP)<input type="number" value={n.cost} onChange={(e) => setN({ ...n, cost: Number(e.target.value) })} className={inp + " w-full"} /></label>
        </div>
        <div className="mb-3"><p className="text-xs text-white/50 mb-1">Photo</p><ImageUpload value={n.imageUrl} onChange={(v) => setN({ ...n, imageUrl: v })} label="Upload photo" /></div>
        <button onClick={() => create.mutate()} disabled={!n.name.trim() || create.isPending} className={btn + " disabled:opacity-50"}><Plus className="w-4 h-4" /> Add</button>
      </Card>
      {products.map((p) => <ProductRow key={p.id} p={p} />)}
      {products.length === 0 && <Empty text="No products yet." />}
    </div>
  );
}

function ProductRow({ p }: any) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ name: p.name, category: p.category, price: Number(p.price), cost: Number(p.cost), active: p.active, imageUrl: p.imageUrl || "" });
  const save = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/reborn/admin/pos/products/${p.id}`, f).then((r) => r.json()),
    onSuccess: () => { toast({ title: "Saved" }); setEdit(false); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  return (
    <Card>
      {!edit ? (
        <div className="flex items-center gap-3">
          {p.imageUrl && <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />}
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{p.name} {!p.active && <span className="text-xs text-red-400">(hidden)</span>}</p>
            <p className="text-xs text-white/50">{p.category} · RP {Number(p.price).toLocaleString()} · stock {p.stock}</p>
          </div>
          <button onClick={() => setEdit(true)} className={btnSm}><Pencil className="w-4 h-4" /></button>
        </div>
      ) : (
        <div>
          <label className="text-xs text-white/50">Name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inp + " w-full mb-2"} /></label>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <label className="text-xs text-white/50">Category<input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className={inp + " w-full"} /></label>
            <label className="flex items-center gap-2 text-sm text-white/70 mt-4"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Active</label>
            <label className="text-xs text-white/50">Sell price (RP)<input type="number" value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} className={inp + " w-full"} /></label>
            <label className="text-xs text-white/50">Unit cost (RP)<input type="number" value={f.cost} onChange={(e) => setF({ ...f, cost: Number(e.target.value) })} className={inp + " w-full"} /></label>
          </div>
          <div className="mb-2"><p className="text-xs text-white/50 mb-1">Photo</p><ImageUpload value={f.imageUrl} onChange={(v) => setF({ ...f, imageUrl: v })} label="Upload photo" /></div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => save.mutate()} className={btnSm + " text-emerald-400"}><Check className="w-4 h-4" /></button>
            <button onClick={() => setEdit(false)} className={btnSm + " text-white/60"}><X className="w-4 h-4" /></button>
          </div>
          <p className="text-[11px] text-white/40 mt-1">Adjust stock quantities from POS › Stock.</p>
        </div>
      )}
    </Card>
  );
}

const CAT_LABEL: Record<string, string> = { "income:product_sale": "Product sales", "income:topup": "Top-ups", "income:service": "Services", "income:other": "Other income", "expense:purchase": "Stock purchases", "expense:commission": "Commission paid", "expense:spin_prize": "Spin prizes paid", "expense:other": "Other expenses" };

function Accounting() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [days, setDays] = useState(30);
  const [rate, setRate] = useState(10);
  const { data: sum } = useQuery<any>({ queryKey: ["/api/reborn/admin/accounting/summary", days], queryFn: () => apiRequest("GET", `/api/reborn/admin/accounting/summary?days=${days}`).then((r) => r.json()) });
  const { data: commission } = useQuery<any>({ queryKey: ["/api/reborn/admin/accounting/commission", days, rate], queryFn: () => apiRequest("GET", `/api/reborn/admin/accounting/commission?days=${days}&rate=${rate}`).then((r) => r.json()) });
  const { data: ledger = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/accounting/ledger"], queryFn: () => apiRequest("GET", "/api/reborn/admin/accounting/ledger?limit=100").then((r) => r.json()) });
  const [e, setE] = useState({ kind: "expense", category: "other", amount: 0, note: "" });
  const addEntry = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/accounting/entry", e).then((r) => r.json()),
    onSuccess: () => { toast({ title: "Entry added" }); setE({ kind: "expense", category: "other", amount: 0, note: "" }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/accounting/summary"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/accounting/ledger"] }); },
    onError: (x: any) => toast({ title: "Failed", description: x.message, variant: "destructive" }),
  });
  const payCommission = useMutation({
    mutationFn: (v: { staffName: string; amount: number }) => apiRequest("POST", "/api/reborn/admin/accounting/commission/pay", v).then((r) => r.json()),
    onSuccess: (d: any) => { toast({ title: "Commission paid", description: d.message }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/accounting/summary"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/accounting/ledger"] }); },
    onError: (x: any) => toast({ title: "Failed", description: x.message, variant: "destructive" }),
  });
  const money = (v: number) => "RP " + Math.round(v || 0).toLocaleString();
  const exportCsv = () => {
    const rows = [["Date", "Type", "Category", "Amount (RP)", "Note"], ...ledger.map((l) => [
      new Date(l.createdAt).toISOString(), l.kind, l.category, String(Math.round(Number(l.amount))), (l.note || "").replace(/"/g, "'"),
    ])];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `accounting-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {[7, 30, 90].map((d) => <button key={d} onClick={() => setDays(d)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${days === d ? "bg-amber-400 text-black" : "bg-white/5 text-white/60"}`}>{d}d</button>)}
        <button onClick={exportCsv} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-white/70 inline-flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Export CSV</button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-400/30 p-3 text-center"><p className="text-[11px] text-white/50">Income</p><p className="text-base font-extrabold text-emerald-300">{money(sum?.income || 0)}</p></div>
        <div className="rounded-2xl bg-red-500/10 border border-red-400/30 p-3 text-center"><p className="text-[11px] text-white/50">Expense</p><p className="text-base font-extrabold text-red-300">{money(sum?.expense || 0)}</p></div>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center"><p className="text-[11px] text-white/50">Net</p><p className={`text-base font-extrabold ${(sum?.net || 0) >= 0 ? "text-amber-300" : "text-red-300"}`}>{money(sum?.net || 0)}</p></div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center"><p className="text-[11px] text-white/50">Revenue</p><p className="text-sm font-extrabold text-white">{money(sum?.revenue || 0)}</p></div>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center"><p className="text-[11px] text-white/50">Cost of goods</p><p className="text-sm font-extrabold text-white">{money(sum?.cogs || 0)}</p></div>
        <div className="rounded-2xl bg-amber-500/10 border border-amber-400/30 p-3 text-center"><p className="text-[11px] text-white/50">🎡 Prize pool</p><p className="text-sm font-extrabold text-amber-300">{money(sum?.spinPool || 0)}</p></div>
      </div>
      {sum?.byCategory && Object.keys(sum.byCategory).length > 0 && (
        <Card>
          <p className="font-bold mb-2 text-sm">Breakdown</p>
          {Object.entries(sum.byCategory).map(([k, v]: any) => (
            <div key={k} className="flex justify-between text-sm py-0.5"><span className="text-white/60">{CAT_LABEL[k] || k}</span><span className={k.startsWith("income") ? "text-emerald-300" : "text-red-300"}>{money(v)}</span></div>
          ))}
        </Card>
      )}
      {commission?.staff && (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold text-sm">Sales by staff (commission)</p>
            <label className="text-xs text-white/50 flex items-center gap-1">rate <input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} className={inp + " w-14"} />%</label>
          </div>
          {commission.staff.length === 0 && <p className="text-xs text-white/40">No paid sales in this period.</p>}
          {commission.staff.map((s: any) => (
            <div key={s.name} className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0 gap-2">
              <span className="text-white/70 min-w-0 truncate">{s.name} <span className="text-white/30">· {s.tickets} sale(s) · {money(s.sales)}</span></span>
              <span className="flex items-center gap-2 flex-shrink-0">
                <span className="text-emerald-300 font-semibold">{money(s.commission)}</span>
                {s.name !== "Unassigned" && s.commission > 0 && (
                  <button onClick={() => { if (confirm(`Pay RP ${s.commission.toLocaleString()} commission to ${s.name}? This records an RP cash expense.`)) payCommission.mutate({ staffName: s.name, amount: s.commission }); }} disabled={payCommission.isPending} className="px-2.5 py-1.5 rounded-lg bg-emerald-500/90 text-black text-xs font-bold">Pay RP</button>
                )}
              </span>
            </div>
          ))}
          <p className="text-[11px] text-white/40 mt-2">Commission is paid as RP cash (recorded as an expense), not app credits.</p>
        </Card>
      )}
      <Card>
        <p className="font-bold mb-2 flex items-center gap-2 text-sm"><Calculator className="w-4 h-4 text-amber-300" /> Add manual entry</p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <select value={e.kind} onChange={(x) => setE({ ...e, kind: x.target.value })} className={inp}><option value="expense">Expense</option><option value="income">Income</option></select>
          <select value={e.category} onChange={(x) => setE({ ...e, category: x.target.value })} className={inp}><option value="other">Other</option><option value="service">Service</option><option value="purchase">Purchase</option></select>
          <input type="number" value={e.amount} onChange={(x) => setE({ ...e, amount: Number(x.target.value) })} placeholder="Amount (RP)" className={inp} />
          <input value={e.note} onChange={(x) => setE({ ...e, note: x.target.value })} placeholder="Note" className={inp} />
        </div>
        <button onClick={() => addEntry.mutate()} disabled={e.amount <= 0 || addEntry.isPending} className={btn + " disabled:opacity-50"}><Plus className="w-4 h-4" /> Add entry</button>
      </Card>
      <p className="text-xs text-white/40 px-1">Recent ledger</p>
      {ledger.map((l) => (
        <div key={l.id} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm">
          <div className="min-w-0"><p className="truncate">{l.note || CAT_LABEL[l.kind + ":" + l.category] || l.category}</p><p className="text-[11px] text-white/40">{new Date(l.createdAt).toLocaleString()}</p></div>
          <span className={l.kind === "income" ? "text-emerald-300 font-semibold" : "text-red-300 font-semibold"}>{l.kind === "income" ? "+" : "−"}{money(Number(l.amount))}</span>
        </div>
      ))}
      {ledger.length === 0 && <Empty text="No transactions yet." />}
    </div>
  );
}

function Inventory() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data } = useQuery<any>({ queryKey: ["/api/reborn/admin/inventory"], queryFn: () => apiRequest("GET", "/api/reborn/admin/inventory").then((r) => r.json()) });
  const adjust = useMutation({
    mutationFn: (v: { productId: number; qty: number; unitCost?: number }) => apiRequest("POST", "/api/reborn/pos/stock-in", v).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/reborn/admin/inventory"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/accounting/summary"] }); },
    onError: (x: any) => toast({ title: "Failed", description: x.message, variant: "destructive" }),
  });
  const money = (v: number) => "RP " + Math.round(v || 0).toLocaleString();
  const items: any[] = data?.items || [];
  const cats = Array.from(new Set(items.map((i) => i.category)));
  const step = (it: any, delta: number) => {
    if (delta > 0) { const c = prompt(`Add how many "${it.name}"?`, "1"); if (!c) return; const q = Math.floor(Number(c)); if (!q) return; const uc = prompt("Unit cost (RP) — leave blank to skip expense", ""); adjust.mutate({ productId: it.id, qty: q, unitCost: uc ? Number(uc) : undefined }); }
    else { const c = prompt(`Deduct how many "${it.name}"? (spoilage / adjustment)`, "1"); if (!c) return; const q = Math.floor(Number(c)); if (!q) return; adjust.mutate({ productId: it.id, qty: -Math.abs(q) }); }
  };
  const exportCsv = () => {
    const rows = [["Category", "Item", "Stock", "Unit cost", "Stock value", "Retail value"], ...items.map((i) => [i.category, i.name, String(i.stock), String(i.cost), String(i.stockValue), String(i.retailValue)])];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center"><p className="text-[11px] text-white/50">Units</p><p className="text-base font-extrabold">{(data?.totals?.units || 0).toLocaleString()}</p></div>
        <div className="rounded-2xl bg-amber-500/10 border border-amber-400/30 p-3 text-center"><p className="text-[11px] text-white/50">Stock value</p><p className="text-base font-extrabold text-amber-300">{money(data?.totals?.cost || 0)}</p></div>
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-400/30 p-3 text-center"><p className="text-[11px] text-white/50">Retail value</p><p className="text-base font-extrabold text-emerald-300">{money(data?.totals?.retail || 0)}</p></div>
      </div>
      <div className="flex items-center gap-2">
        {(data?.totals?.low || 0) > 0 && <span className="inline-flex items-center gap-1 text-xs text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-2.5 py-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {data.totals.low} low-stock item(s)</span>}
        <button onClick={exportCsv} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-white/70 inline-flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Export CSV</button>
      </div>
      {cats.map((cat) => (
        <Card key={cat}>
          <p className="font-bold mb-2 text-sm flex items-center gap-2"><Boxes className="w-4 h-4 text-amber-300" /> {cat}</p>
          {items.filter((i) => i.category === cat).map((it) => (
            <div key={it.id} className="flex items-center gap-2 py-2 border-b border-white/5 last:border-0">
              {it.imageUrl ? <img src={it.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" /> : <span className="w-9 h-9 rounded-lg bg-white/5 flex-shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate flex items-center gap-1.5">{it.name}{it.low && <span className="text-[10px] text-red-300 bg-red-500/15 rounded px-1.5 py-0.5">LOW</span>}</p>
                <p className="text-[11px] text-white/40">cost {money(it.cost)} · value {money(it.stockValue)}</p>
              </div>
              <button onClick={() => step(it, -1)} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white font-bold flex items-center justify-center" style={{ fontSize: 16 }}>−</button>
              <span className={`w-10 text-center font-extrabold ${it.low ? "text-red-300" : "text-white"}`}>{it.stock}</span>
              <button onClick={() => step(it, 1)} className="w-8 h-8 rounded-lg bg-amber-400 text-black font-bold flex items-center justify-center" style={{ fontSize: 16 }}>+</button>
            </div>
          ))}
        </Card>
      ))}
      {items.length === 0 && <Empty text="No products yet. Add products in the Products tab." />}
    </div>
  );
}

function AdminBookings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"upcoming" | "all">("upcoming");
  const { data: rows = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/bookings"], queryFn: () => apiRequest("GET", "/api/reborn/admin/bookings").then((r) => r.json()), refetchInterval: 30000 });
  const inv = () => qc.invalidateQueries({ queryKey: ["/api/reborn/admin/bookings"] });
  const setStatus = useMutation({
    mutationFn: (v: { id: number; status: string; note?: string }) => apiRequest("POST", `/api/reborn/admin/bookings/${v.id}/status`, { status: v.status, note: v.note }).then((r) => r.json()),
    onSuccess: () => { toast({ title: "Updated" }); inv(); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
  const list = rows.filter((b) => (filter === "upcoming" ? b.upcoming && b.status !== "cancelled" : true));
  const sColor: Record<string, string> = { confirmed: "text-emerald-300", pending: "text-amber-300", scheduled: "text-blue-300", completed: "text-white/40", cancelled: "text-red-300", blocked: "text-orange-300" };
  return (
    <div className="space-y-3">
      <ManualBooking onDone={inv} />
      <BlockSlot onDone={inv} />
      <div className="flex gap-2">
        {(["upcoming", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${filter === f ? "bg-amber-400 text-black" : "bg-white/5 text-white/60"}`}>{f}</button>
        ))}
        <span className="ml-auto text-xs text-white/40 self-center">{list.length} item(s)</span>
      </div>
      {list.map((b) => (
        <div key={b.id} className="rounded-xl bg-white/5 border border-white/10 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{b.status === "blocked" ? "🚫 " : ""}{b.title}</p>
              {b.status !== "blocked" && <p className="text-[11px] text-white/50">{b.memberName}{b.memberPhone ? ` · ${b.memberPhone}` : ""}</p>}
              <p className="text-[11px] text-white/40 mt-0.5">📅 {fmt(b.appointmentDate)} · {Math.round((b.duration || 120) / 60)}h · {b.description}</p>
              {b.adminNote && <p className="text-[11px] text-amber-300/80 mt-0.5">📝 {b.adminNote}</p>}
            </div>
            <span className={`text-xs font-bold flex-shrink-0 ${sColor[b.status] || "text-white/50"}`}>{b.status}</span>
          </div>
          {b.status === "blocked" ? (
            <button onClick={() => { if (confirm("Unblock this slot?")) setStatus.mutate({ id: b.id, status: "cancelled" }); }} className="mt-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 text-white/70">Unblock</button>
          ) : b.status !== "cancelled" && b.status !== "completed" && (
            <div className="flex gap-2 mt-2">
              {b.status !== "confirmed" && <button onClick={() => setStatus.mutate({ id: b.id, status: "confirmed" })} className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">Confirm</button>}
              <button onClick={() => setStatus.mutate({ id: b.id, status: "completed" })} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 text-white/70">Done</button>
              <button onClick={() => { const note = prompt("Reject/cancel — reason for the guest (optional):", "") ?? undefined; setStatus.mutate({ id: b.id, status: "cancelled", note }); }} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-500/15 text-red-200 border border-red-400/40">Reject</button>
            </div>
          )}
        </div>
      ))}
      {list.length === 0 && <Empty text="No bookings." />}
    </div>
  );
}

function AdminBottles() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data: rows = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/pos/bottle-keeps", q], queryFn: () => apiRequest("GET", `/api/reborn/pos/bottle-keeps${q ? "?q=" + encodeURIComponent(q) : ""}`).then((r) => r.json()) });
  const collect = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/reborn/pos/bottle-keeps/${id}/collect`, {}).then((r) => r.json()),
    onSuccess: (d: any) => { toast({ title: d.message || "Redeemed" }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/bottle-keeps"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const kept = rows.filter((b) => b.status === "kept");
  return (
    <div className="space-y-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search member name / code…" className={inp + " w-full"} />
      <p className="text-xs text-white/40 px-1">{kept.length} bottle(s) kept</p>
      {kept.map((b) => (
        <div key={b.id} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3">
          {b.photoUrl ? <img src={b.photoUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" /> : <span className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0"><Wine className="w-5 h-5 text-amber-300" /></span>}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{b.name} <span className="text-white/40 text-xs capitalize">· {b.type}{b.type === "beer" ? ` · ${b.quantity} left` : ""}</span></p>
            <p className="text-[11px] text-white/40 truncate">{b.memberName || "—"}{b.memberCode ? ` · ${b.memberCode}` : ""}{b.expiresAt ? ` · exp ${new Date(b.expiresAt).toLocaleDateString()}` : ""}</p>
          </div>
          <button onClick={() => { if (confirm(`Redeem ${b.name} for ${b.memberName || "customer"}?`)) collect.mutate(b.id); }} disabled={collect.isPending} className={btnSave + " flex-shrink-0"}><Check className="w-4 h-4" /> Redeem</button>
        </div>
      ))}
      {kept.length === 0 && <Empty text="No bottles kept right now." />}
    </div>
  );
}

function ManualBooking({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
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
    onSuccess: ({ ok, d }: any) => { if (!ok) { toast({ title: "Failed", description: d.message, variant: "destructive" }); return; } toast({ title: d.message }); setSlot(""); setTable(""); onDone(); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  if (!open) return <button onClick={() => setOpen(true)} className={btn + " w-full justify-center"}><Plus className="w-4 h-4" /> Book for a member</button>;
  return (
    <Card>
      <div className="flex items-center justify-between mb-2"><h3 className="font-bold text-sm">Book for a member</h3><button onClick={() => setOpen(false)} className={btnSm}><X className="w-4 h-4" /></button></div>
      <input value={memberCode} onChange={(e) => setMemberCode(e.target.value)} placeholder="Member code / card / username / email" className={inp + " w-full mb-2"} />
      <select value={areaId} onChange={(e) => { setAreaId(e.target.value); setSlot(""); setTable(""); }} className={inp + " w-full mb-2"}>
        <option value="">Select area…</option>
        {areas.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.level})</option>)}
      </select>
      {area && (<>
        <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => { setDate(e.target.value); setSlot(""); }} className={inp + " w-full mb-2"} style={{ colorScheme: "dark" }} />
        {avail?.closed ? <p className="text-xs text-amber-300 mb-2">Closed that day.</p> : (
          <select value={slot} onChange={(e) => setSlot(e.target.value)} className={inp + " w-full mb-2"}>
            <option value="">Start time…</option>
            {slots.map((s: any) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        )}
        {area.tables?.length > 0 && (
          <select value={table} onChange={(e) => setTable(e.target.value)} className={inp + " w-full mb-2"}>
            <option value="">Select table/room…</option>
            {area.tables.map((t: string) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <div className="flex gap-2 mb-2">
          <label className="text-[11px] text-white/50 flex-1">Party<input type="number" min={1} value={party} onChange={(e) => setParty(Number(e.target.value))} className={inp + " w-full"} /></label>
          <label className="text-[11px] text-white/50 flex-1">Hours<input type="number" min={2} max={8} value={hours} onChange={(e) => setHours(Number(e.target.value))} className={inp + " w-full"} /></label>
        </div>
        <button onClick={() => book.mutate()} disabled={!memberCode.trim() || !slot || (area.tables?.length > 0 && !table) || book.isPending} className={btn + " w-full justify-center disabled:opacity-50"}>Confirm booking</button>
      </>)}
    </Card>
  );
}

function BlockSlot({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
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
    onSuccess: ({ ok, d }: any) => { if (!ok) { toast({ title: "Failed", description: d.message, variant: "destructive" }); return; } toast({ title: d.message }); setSlot(""); setTable(""); setReason(""); onDone(); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  if (!open) return <button onClick={() => setOpen(true)} className={btn + " w-full justify-center"}>🚫 Block a date / time</button>;
  return (
    <Card>
      <div className="flex items-center justify-between mb-2"><h3 className="font-bold text-sm">Block a date / time</h3><button onClick={() => setOpen(false)} className={btnSm}><X className="w-4 h-4" /></button></div>
      <select value={areaId} onChange={(e) => { setAreaId(e.target.value); setSlot(""); setTable(""); }} className={inp + " w-full mb-2"}>
        <option value="">Select area…</option>
        {areas.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.level})</option>)}
      </select>
      {area && (<>
        <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => { setDate(e.target.value); setSlot(""); }} className={inp + " w-full mb-2"} style={{ colorScheme: "dark" }} />
        <select value={slot} onChange={(e) => setSlot(e.target.value)} className={inp + " w-full mb-2"}>
          <option value="">Start time…</option>
          {slots.map((s: any) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {area.tables?.length > 0 && (
          <select value={table} onChange={(e) => setTable(e.target.value)} className={inp + " w-full mb-2"}>
            <option value="">Whole area (all tables)</option>
            {area.tables.map((t: string) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" className={inp + " w-full mb-2"} />
        <button onClick={() => block.mutate()} disabled={!slot || block.isPending} className={btn + " w-full justify-center disabled:opacity-50"}>Block this slot</button>
      </>)}
    </Card>
  );
}

function Crm() {
  const { toast } = useToast();
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
    onError: (x: any) => toast({ title: "Failed", description: x.message, variant: "destructive" }),
  });
  const logout = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/whatsapp/web/logout", {}).then((r) => r.json()),
    onSuccess: () => { toast({ title: "WhatsApp unlinked" }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/whatsapp/status"] }); },
  });
  const runReminders = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/whatsapp/run-reminders", {}).then((r) => r.json()),
    onSuccess: (d: any) => toast({ title: d.configured ? "Reminders sent" : "Reminders run", description: `${d.bottles} bottle · ${d.comeback} comeback · ${d.feedback} feedback` }),
    onError: (x: any) => toast({ title: "Failed", description: x.message, variant: "destructive" }),
  });
  const contacts: any[] = data?.contacts || [];
  const [openId, setOpenId] = useState<number | null>(null);
  const openContact = contacts.find((c) => c.id === openId) || null;
  const stageColor: Record<string, string> = { new: "text-white/50", await_lang: "text-amber-300", await_name: "text-amber-300", await_email: "text-amber-300", active: "text-emerald-300", member: "text-emerald-300" };
  const live = webStatus === "connected" || wa?.configured;
  return (
    <div className="space-y-3">
      {/* QR login — link an existing WhatsApp number */}
      <div className={`rounded-2xl border p-4 ${webStatus === "connected" ? "bg-emerald-500/10 border-emerald-400/30" : "bg-white/5 border-white/10"}`}>
        <p className="text-sm font-bold flex items-center gap-2"><MessageCircle className="w-4 h-4 text-emerald-300" /> Connect WhatsApp by QR</p>
        {webStatus === "connected" ? (
          <div className="mt-2">
            <p className="text-sm text-emerald-300 font-semibold">Linked{wa?.web?.number ? ` · +${wa.web.number}` : ""}</p>
            <p className="text-[11px] text-white/50 mt-1">The bot now auto-replies, captures leads, creates accounts, books appointments and sends reminders on this number.</p>
            <button onClick={() => { if (confirm("Unlink this WhatsApp number?")) logout.mutate(); }} disabled={logout.isPending} className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/15 border border-red-400/40 text-red-200">Unlink</button>
          </div>
        ) : webStatus === "qr" && wa?.web?.qr ? (
          <div className="mt-3 text-center">
            <p className="text-[11px] text-white/60 mb-2">On your phone: WhatsApp → <b>Settings → Linked devices → Link a device</b>, then scan:</p>
            <img src={wa.web.qr} alt="WhatsApp QR" className="mx-auto rounded-xl bg-white p-2" style={{ width: 240, height: 240 }} />
            <p className="text-[11px] text-white/40 mt-2">Waiting for scan… the code refreshes automatically.</p>
          </div>
        ) : (
          <div className="mt-2">
            <p className="text-[11px] text-white/50">Link your existing WhatsApp number (like WhatsApp Web) so the bot runs without the Meta Business API.</p>
            <p className="text-[11px] text-amber-300/90 mt-1">⚠️ Uses WhatsApp's unofficial web protocol — against WhatsApp's Terms; the number can be banned. Use a dedicated business line, not personal.</p>
            <button onClick={() => connect.mutate()} disabled={connect.isPending} className="mt-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-black inline-flex items-center gap-1.5">{connect.isPending || webStatus === "connecting" ? "Starting…" : "Show QR to link"}</button>
          </div>
        )}
      </div>

      <div className={`rounded-2xl border p-3 ${live ? "bg-emerald-500/10 border-emerald-400/30" : "bg-amber-500/10 border-amber-400/30"}`}>
        <p className="text-sm font-bold flex items-center gap-2"><MessageCircle className="w-4 h-4" /> Bot status: {live ? "active" : "inactive"}</p>
        <p className="text-[11px] text-white/50 mt-1">{live ? "Auto-captures leads, creates member accounts and books appointments. Reminders run hourly." : "Link a number by QR above, or set WHATSAPP_* env vars for the Meta Business API. The homepage WhatsApp button already works."}</p>
        <button onClick={() => runReminders.mutate()} disabled={runReminders.isPending} className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 inline-flex items-center gap-1.5"><Send className="w-3.5 h-3.5" /> Run reminders now</button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center"><p className="text-[11px] text-white/50">Contacts</p><p className="text-base font-extrabold">{data?.count || 0}</p></div>
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-400/30 p-3 text-center"><p className="text-[11px] text-white/50">Members</p><p className="text-base font-extrabold text-emerald-300">{data?.stages?.member || 0}</p></div>
        <div className="rounded-2xl bg-amber-500/10 border border-amber-400/30 p-3 text-center"><p className="text-[11px] text-white/50">In progress</p><p className="text-base font-extrabold text-amber-300">{(data?.stages?.await_name || 0) + (data?.stages?.await_email || 0)}</p></div>
      </div>
      <p className="text-xs text-white/40 px-1 pt-1">Tap a contact to chat, edit or delete</p>
      {contacts.map((c) => (
        <button key={c.id} onClick={() => setOpenId(c.id)} className="w-full flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-left hover:bg-white/10">
          <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-black font-bold" style={{ background: "linear-gradient(135deg,#c9a84c,#a855f7)" }}>{(c.name || c.phone || "?").slice(0, 1).toUpperCase()}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold truncate">{c.name || "Unknown"} <span className={`text-[11px] ${stageColor[c.stage] || "text-white/40"}`}>· {c.stage}</span></span>
            <span className="block text-[11px] text-white/40 truncate">{c.phone}{c.email ? ` · ${c.email}` : ""}{c.lastVisitAt ? ` · visit ${new Date(c.lastVisitAt).toLocaleDateString()}` : ""}</span>
          </span>
          <MessageCircle className="w-4 h-4 text-emerald-300 flex-shrink-0" />
        </button>
      ))}
      {contacts.length === 0 && <Empty text="No contacts yet. Leads captured by the WhatsApp bot appear here." />}

      {openContact && <CrmChat contact={openContact} connected={webStatus === "connected" || !!wa?.configured} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function CrmChat({ contact, connected, onClose }: { contact: any; connected: boolean; onClose: () => void }) {
  const { toast } = useToast();
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
    onError: (x: any) => toast({ title: "Failed", description: x.message, variant: "destructive" }),
  });
  const saveEdit = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/reborn/admin/crm/${contact.id}`, f).then((r) => r.json()),
    onSuccess: () => { toast({ title: "Saved" }); setEditing(false); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/crm"] }); },
    onError: (x: any) => toast({ title: "Failed", description: x.message, variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/reborn/admin/crm/${contact.id}`, {}).then((r) => r.json()),
    onSuccess: () => { toast({ title: "Contact deleted" }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/crm"] }); onClose(); },
    onError: (x: any) => toast({ title: "Failed", description: x.message, variant: "destructive" }),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-[#160f2a] border border-white/10 rounded-t-3xl sm:rounded-3xl flex flex-col" style={{ maxHeight: "88vh" }} onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="flex items-center gap-2 p-3 border-b border-white/10">
          <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-black font-bold" style={{ background: "linear-gradient(135deg,#c9a84c,#a855f7)" }}>{(contact.name || contact.phone || "?").slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate">{contact.name || "Unknown"}</p>
            <p className="text-[11px] text-white/40 truncate">+{String(contact.phone).replace(/\D/g, "")} · {contact.stage} · {contact.lang?.toUpperCase()}</p>
          </div>
          <button onClick={() => setEditing((v) => !v)} className={btnSm} title="Edit"><Pencil className="w-4 h-4 text-white/70" /></button>
          <button onClick={() => { if (confirm(`Delete ${contact.name || contact.phone}? This removes the contact and its chat history.`)) del.mutate(); }} className={btnSm} title="Delete"><Trash2 className="w-4 h-4 text-red-300" /></button>
          <button onClick={onClose} className={btnSm} title="Close"><X className="w-4 h-4 text-white/70" /></button>
        </div>

        {editing && (
          <div className="p-3 border-b border-white/10 space-y-2 bg-black/20">
            <div className="grid grid-cols-2 gap-2">
              <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Name" className={inp} />
              <select value={f.lang} onChange={(e) => setF({ ...f, lang: e.target.value })} className={inp}><option value="en">English</option><option value="zh">中文</option><option value="id">Bahasa</option></select>
            </div>
            <input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="Email" className={inp + " w-full"} />
            <input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Notes" className={inp + " w-full"} />
            <button onClick={() => saveEdit.mutate()} disabled={saveEdit.isPending} className={btnSave}><Check className="w-4 h-4" /> Save profile</button>
          </div>
        )}

        {/* messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ minHeight: 200 }}>
          {msgs.length === 0 && <p className="text-center text-xs text-white/40 py-8">No messages yet. Say hello 👋</p>}
          {msgs.map((m) => (
            <div key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${m.direction === "out" ? "bg-emerald-600/80 text-white rounded-br-sm" : "bg-white/10 text-white rounded-bl-sm"}`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className="text-[9px] opacity-50 mt-0.5">{m.viaBot ? "🤖 bot · " : ""}{new Date(m.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>

        {/* composer */}
        <div className="p-3 border-t border-white/10">
          {!connected && <p className="text-[11px] text-amber-300 mb-1.5">⚠️ WhatsApp not linked — messages are saved but won't be delivered until you link a number.</p>}
          <div className="flex items-end gap-2">
            <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (text.trim()) send.mutate(); } }} rows={1} placeholder="Type a message…" className={inp + " flex-1 resize-none"} style={{ maxHeight: 120 }} />
            <button onClick={() => text.trim() && send.mutate()} disabled={send.isPending || !text.trim()} className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-black disabled:opacity-40" style={{ background: "#25D366" }}><Send className="w-5 h-5" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

// apply gold gradient to primary buttons via style since Tailwind class can't hold gradient var here
// (btn uses text-black; background set inline where used would be ideal, but keep simple)
