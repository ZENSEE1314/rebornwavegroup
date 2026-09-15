import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RebornLayout } from "@/components/RebornLayout";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Check, X, Ticket, Gift, Pill, Music2, Coins, Users as UsersIcon, Megaphone, ScrollText, Package, Calculator, Pencil } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Tabs staff (sub-admin) can use; the rest are full-admin only
const STAFF_TABS = ["Requests", "Redemptions", "Top-ups", "Codes", "Pills", "Songs", "Events", "Users"] as const;
const ADMIN_TABS = ["Requests", "Redemptions", "Top-ups", "Codes", "Pills", "Songs", "Events", "Users", "Products", "Accounting", "Prizes", "Gifts", "FAQ", "Settings", "Logs"] as const;

export default function RebornAdmin() {
  const { user } = useAuth();
  const isFullAdmin = (user as any)?.role === "admin";
  const TABS = (isFullAdmin ? ADMIN_TABS : STAFF_TABS) as readonly string[];
  const [tab, setTab] = useState<string>("Requests");
  return (
    <RebornLayout active="/reborn-admin" title="ADMIN">
      <div className="flex gap-1 p-1 rounded-2xl bg-white/5 border border-white/10 mb-5 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 min-w-[80px] py-2 px-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${tab === t ? "text-black" : "text-white/60"}`} style={tab === t ? { background: "linear-gradient(90deg,#c9a84c,#f0d787)" } : undefined}>{t}</button>
        ))}
      </div>
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
      {tab === "Products" && <Products />}
      {tab === "Accounting" && <Accounting />}
      {tab === "Logs" && <Logs />}
    </RebornLayout>
  );
}

function Members() {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const { data: users = [], refetch } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/users", q], queryFn: () => apiRequest("GET", `/api/reborn/admin/users${q ? "?q=" + encodeURIComponent(q) : ""}`).then((r) => r.json()) });
  const { user } = useAuth();
  const isFullAdmin = (user as any)?.role === "admin";
  const save = useMutation({ mutationFn: (u: any) => apiRequest("POST", `/api/reborn/admin/users/${u.id}`, u).then((r) => r.json()), onSuccess: () => { toast({ title: "Member updated" }); refetch(); }, onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }) });
  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name / username / email" className={inp + " w-full mb-4"} />
      {!isFullAdmin && <p className="text-xs text-white/40 mb-3">Only full admins can edit balances and roles.</p>}
      <div className="space-y-3">{users.map((u) => <MemberRow key={u.id} u={u} editable={isFullAdmin} onSave={save.mutate} />)}</div>
    </div>
  );
}
function MemberRow({ u, editable, onSave }: any) {
  const [e, setE] = useState(u);
  return (
    <Card>
      <p className="font-semibold text-sm">{u.firstName || u.username || "Member"} <span className="text-white/40">· {u.email}</span></p>
      <p className="text-[11px] text-white/40 mb-2">id {u.id}</p>
      {editable ? (
        <>
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
            <button onClick={() => act.mutate({ id: r.id, approve: true })} className={btnSm + " text-emerald-400"}><Check className="w-4 h-4" /></button>
            <button onClick={() => act.mutate({ id: r.id, approve: false })} className={btnSm + " text-red-400"}><X className="w-4 h-4" /></button>
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
      <input value={e.imageUrl || ""} onChange={(x) => setE({ ...e, imageUrl: x.target.value })} placeholder="Image URL (optional)" className={inp + " w-full mb-2"} />
      <div className="flex items-center gap-3">
        <label className="text-xs text-white/50 flex items-center gap-1"><input type="checkbox" checked={e.active} onChange={(x) => setE({ ...e, active: x.target.checked })} /> active</label>
        <label className="text-xs text-white/50 flex items-center gap-1"><input type="checkbox" checked={e.showOnLogin} onChange={(x) => setE({ ...e, showOnLogin: x.target.checked })} /> show at login</label>
        <button onClick={() => onSave(e)} className={btnSm + " text-emerald-400 ml-auto"}><Check className="w-4 h-4" /></button>
        <button onClick={() => onDelete(ev.id)} className={btnSm + " text-red-400"}><Trash2 className="w-4 h-4" /></button>
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
          <span className="text-white/40">{l.action} · {l.entityType} · by {l.adminUserId?.slice(0, 8)}</span>
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
      <input value={e.imageUrl || ""} onChange={(x) => setE({ ...e, imageUrl: x.target.value })} placeholder="Image URL (optional)" className={inp + " w-full mb-2"} />
      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-xs text-white/50">KGOLD<input type="number" value={e.kgoldCost} onChange={(x) => setE({ ...e, kgoldCost: Number(x.target.value) })} className={inp + " w-24 ml-1"} /></label>
        <select value={e.animation} onChange={(x) => setE({ ...e, animation: x.target.value })} className={inp}>{["pop", "float", "zoom", "rain"].map((a) => <option key={a} value={a}>{a}</option>)}</select>
        <label className="text-xs text-white/50 flex items-center gap-1"><input type="checkbox" checked={e.active} onChange={(x) => setE({ ...e, active: x.target.checked })} /> active</label>
        <button onClick={() => onSave(e)} className={btnSm + " text-emerald-400"}><Check className="w-4 h-4" /></button>
        <button onClick={() => onDelete(g.id)} className={btnSm + " text-red-400"}><Trash2 className="w-4 h-4" /></button>
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
  return (
    <Card>
      <h3 className="font-bold mb-3 flex items-center gap-2"><Coins className="w-4 h-4 text-amber-300" /> KGOLD economy</h3>
      <Field label="Gift fee % (kept by club; receiver gets the rest)" value={cur.giftFeePercent} onChange={(v: any) => set("giftFeePercent", v)} />
      <Field label="KGOLD per 1 RP" value={cur.kgoldPerRp} onChange={(v: any) => set("kgoldPerRp", v)} />
      <Field label="Minimum KGOLD purchase" value={cur.minBuyKgold} onChange={(v: any) => set("minBuyKgold", v)} />
      <Field label="Minimum RP to cash out" value={cur.minCashoutRp} onChange={(v: any) => set("minCashoutRp", v)} />
      <button onClick={() => save.mutate()} className={btn + " mt-2"}>Save settings</button>
    </Card>
  );
}
function Field({ label, value, onChange }: any) {
  return <label className="block mb-3"><span className="text-xs text-white/60 block mb-1">{label}</span><input type="number" value={value} onChange={(e) => onChange(e.target.value)} className={inp + " w-full"} /></label>;
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
      <input value={e.title} onChange={(x) => setE({ ...e, title: x.target.value })} placeholder="Song title" className={inp + " w-full mb-2"} />
      <input value={e.artist || ""} onChange={(x) => setE({ ...e, artist: x.target.value })} placeholder="Artist / singer" className={inp + " w-full mb-2"} />
      <input value={e.spotifyUrl || ""} onChange={(x) => setE({ ...e, spotifyUrl: x.target.value })} placeholder="Spotify link" className={inp + " w-full mb-2"} />
      <input value={e.artistPhoto || ""} onChange={(x) => setE({ ...e, artistPhoto: x.target.value })} placeholder="Artist photo URL" className={inp + " w-full mb-2"} />
      <div className="flex items-center gap-3 justify-between">
        <label className="text-xs text-white/50 flex items-center gap-1"><input type="checkbox" checked={e.isHit} onChange={(x) => setE({ ...e, isHit: x.target.checked })} /> hit song</label>
        <div className="flex gap-2">
          <button onClick={() => onSave(e)} className={btnSm + " text-emerald-400"}><Check className="w-4 h-4" /></button>
          <button onClick={() => onDelete(s.id)} className={btnSm + " text-red-400"}><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    </Card>
  );
}

function SongRequests() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/song-requests"], queryFn: () => apiRequest("GET", "/api/reborn/admin/song-requests").then((r) => r.json()) });
  const act = useMutation({ mutationFn: ({ id, approve }: any) => apiRequest("POST", `/api/reborn/admin/song-requests/${id}`, { approve }), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/reborn/admin/song-requests"] }) });
  if (rows.length === 0) return <Empty text="No pending song requests." />;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <Card key={r.id}>
          <div className="flex items-center gap-3">
            <Music2 className="w-5 h-5 text-amber-300" />
            <div className="flex-1 min-w-0"><p className="font-semibold text-sm truncate">{r.title}</p><p className="text-xs text-white/40 truncate">{r.artist || "—"} · user {r.userId?.slice(0, 8)}</p></div>
            <button onClick={() => act.mutate({ id: r.id, approve: true })} className={btnSm + " text-emerald-400"}><Check className="w-4 h-4" /></button>
            <button onClick={() => act.mutate({ id: r.id, approve: false })} className={btnSm + " text-red-400"}><X className="w-4 h-4" /></button>
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
      <p className="text-xs text-white/40 mt-3">Win rate = the chance each prize is won (higher = more often). Set big prizes low so members can't keep winning them. Types: item, voucher_percent, voucher_amount, egg, free_spin, nothing.</p>
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
          {["item", "voucher_percent", "voucher_amount", "egg", "free_spin", "nothing"].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <label className="text-xs text-white/50">value<input type="number" value={e.value} onChange={(x) => setE({ ...e, value: Number(x.target.value) })} className={inp + " w-20 ml-1"} /></label>
        <label className="text-xs text-white/50">win rate<input type="number" value={e.weight} onChange={(x) => setE({ ...e, weight: Number(x.target.value) })} className={inp + " w-16 ml-1"} /></label>
        <span className="text-xs font-bold text-amber-300" title="Chance of winning this prize">≈{pct}%</span>
        <label className="text-xs text-white/50 flex items-center gap-1"><input type="checkbox" checked={e.active} onChange={(x) => setE({ ...e, active: x.target.checked })} /> active</label>
        <button onClick={() => onSave(e)} className={btnSm}><Check className="w-4 h-4" /></button>
        <button onClick={() => onDelete(p.id)} className={btnSm + " text-red-400"}><Trash2 className="w-4 h-4" /></button>
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
            <button onClick={() => act.mutate({ id: r.id, approve: true })} className={btnSm + " text-emerald-400"}><Check className="w-4 h-4" /></button>
            <button onClick={() => act.mutate({ id: r.id, approve: false })} className={btnSm + " text-red-400"}><X className="w-4 h-4" /></button>
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
      <div className="flex gap-2 justify-end">
        <button onClick={() => onSave(e)} className={btnSm + " text-emerald-400"}><Check className="w-4 h-4" /></button>
        <button onClick={() => onDelete(f.id)} className={btnSm + " text-red-400"}><Trash2 className="w-4 h-4" /></button>
      </div>
    </Card>
  );
}

const inp = "px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400/60";
const btn = "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-black text-sm bg-amber-400 hover:bg-amber-300";
const btnSm = "inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10";
function Card({ children }: any) { return <div className="rounded-2xl bg-white/5 border border-white/10 p-4">{children}</div>; }
function Empty({ text }: any) { return <div className="text-center py-12 text-white/40">{text}</div>; }

function Products() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: products = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/pos/products"], queryFn: () => apiRequest("GET", "/api/reborn/pos/products").then((r) => r.json()) });
  const [n, setN] = useState({ name: "", category: "General", price: 0, cost: 0, stock: 0 });
  const create = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/pos/products", n).then((r) => r.json()),
    onSuccess: () => { toast({ title: "Product added" }); setN({ name: "", category: "General", price: 0, cost: 0, stock: 0 }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  return (
    <div className="space-y-3">
      <Card>
        <p className="font-bold mb-2 flex items-center gap-2"><Package className="w-4 h-4 text-amber-300" /> Add product</p>
        <input value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} placeholder="Name" className={inp + " w-full mb-2"} />
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input value={n.category} onChange={(e) => setN({ ...n, category: e.target.value })} placeholder="Category" className={inp} />
          <input type="number" value={n.stock} onChange={(e) => setN({ ...n, stock: Number(e.target.value) })} placeholder="Stock" className={inp} />
          <input type="number" value={n.price} onChange={(e) => setN({ ...n, price: Number(e.target.value) })} placeholder="Sell price (RP)" className={inp} />
          <input type="number" value={n.cost} onChange={(e) => setN({ ...n, cost: Number(e.target.value) })} placeholder="Unit cost (RP)" className={inp} />
        </div>
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
  const [f, setF] = useState({ name: p.name, category: p.category, price: Number(p.price), cost: Number(p.cost), active: p.active });
  const save = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/reborn/admin/pos/products/${p.id}`, f).then((r) => r.json()),
    onSuccess: () => { toast({ title: "Saved" }); setEdit(false); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  return (
    <Card>
      {!edit ? (
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{p.name} {!p.active && <span className="text-xs text-red-400">(hidden)</span>}</p>
            <p className="text-xs text-white/50">{p.category} · RP {Number(p.price).toLocaleString()} · stock {p.stock}</p>
          </div>
          <button onClick={() => setEdit(true)} className={btnSm}><Pencil className="w-4 h-4" /></button>
        </div>
      ) : (
        <div>
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inp + " w-full mb-2"} />
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="Category" className={inp} />
            <label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Active</label>
            <input type="number" value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} placeholder="Sell price" className={inp} />
            <input type="number" value={f.cost} onChange={(e) => setF({ ...f, cost: Number(e.target.value) })} placeholder="Unit cost" className={inp} />
          </div>
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

const CAT_LABEL: Record<string, string> = { "income:product_sale": "Product sales", "income:topup": "Top-ups", "income:service": "Services", "income:other": "Other income", "expense:purchase": "Stock purchases", "expense:other": "Other expenses" };

function Accounting() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [days, setDays] = useState(30);
  const { data: sum } = useQuery<any>({ queryKey: ["/api/reborn/admin/accounting/summary", days], queryFn: () => apiRequest("GET", `/api/reborn/admin/accounting/summary?days=${days}`).then((r) => r.json()) });
  const { data: ledger = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/admin/accounting/ledger"], queryFn: () => apiRequest("GET", "/api/reborn/admin/accounting/ledger?limit=100").then((r) => r.json()) });
  const [e, setE] = useState({ kind: "expense", category: "other", amount: 0, note: "" });
  const addEntry = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/accounting/entry", e).then((r) => r.json()),
    onSuccess: () => { toast({ title: "Entry added" }); setE({ kind: "expense", category: "other", amount: 0, note: "" }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/accounting/summary"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/accounting/ledger"] }); },
    onError: (x: any) => toast({ title: "Failed", description: x.message, variant: "destructive" }),
  });
  const money = (v: number) => "RP " + Math.round(v || 0).toLocaleString();
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {[7, 30, 90].map((d) => <button key={d} onClick={() => setDays(d)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${days === d ? "bg-amber-400 text-black" : "bg-white/5 text-white/60"}`}>{d}d</button>)}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-400/30 p-3 text-center"><p className="text-[11px] text-white/50">Income</p><p className="text-base font-extrabold text-emerald-300">{money(sum?.income || 0)}</p></div>
        <div className="rounded-2xl bg-red-500/10 border border-red-400/30 p-3 text-center"><p className="text-[11px] text-white/50">Expense</p><p className="text-base font-extrabold text-red-300">{money(sum?.expense || 0)}</p></div>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center"><p className="text-[11px] text-white/50">Net</p><p className={`text-base font-extrabold ${(sum?.net || 0) >= 0 ? "text-amber-300" : "text-red-300"}`}>{money(sum?.net || 0)}</p></div>
      </div>
      {sum?.byCategory && Object.keys(sum.byCategory).length > 0 && (
        <Card>
          <p className="font-bold mb-2 text-sm">Breakdown</p>
          {Object.entries(sum.byCategory).map(([k, v]: any) => (
            <div key={k} className="flex justify-between text-sm py-0.5"><span className="text-white/60">{CAT_LABEL[k] || k}</span><span className={k.startsWith("income") ? "text-emerald-300" : "text-red-300"}>{money(v)}</span></div>
          ))}
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

// apply gold gradient to primary buttons via style since Tailwind class can't hold gradient var here
// (btn uses text-black; background set inline where used would be ideal, but keep simple)
