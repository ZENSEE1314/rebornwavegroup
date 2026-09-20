import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RebornLayout } from "@/components/RebornLayout";
import { openCashDrawer, connectDrawerSerial, getDrawerUrl, setDrawerUrl, serialSupported, drawerConfigured } from "@/lib/cashDrawer";
import { printReceipt, printKitchen } from "@/lib/receipt";
import { ImageUpload } from "@/components/ImageUpload";
import { Plus, Minus, Trash2, UserCheck, X, Store, Search, PackagePlus, Receipt, LayoutGrid, ChevronLeft, Bell, Settings, Wine, Printer } from "lucide-react";

interface Product { id: number; name: string; category: string; price: string; stock: number; imageUrl?: string; }
interface Staff { id: string; name: string; role: string; }
interface Order { id: number; orderNo: string; tableNumber?: string; memberName?: string; memberCode?: string; salesStaffName?: string; total: string; source: string; items?: any[]; }
type Tab = "tables" | "sell" | "stock" | "bottles";
const rp = (n: number) => "RP " + (n || 0).toLocaleString("en-US");

async function post(url: string, body?: any) {
  const r = await apiRequest("POST", url, body ?? {});
  const d = await r.json();
  if (!r.ok) throw new Error(d.message || "Failed");
  return d;
}
function useProducts() {
  return useQuery<Product[]>({ queryKey: ["/api/reborn/pos/products"], queryFn: () => apiRequest("GET", "/api/reborn/pos/products").then((r) => r.json()) });
}
function useStaff() {
  return useQuery<Staff[]>({ queryKey: ["/api/reborn/pos/staff"], queryFn: () => apiRequest("GET", "/api/reborn/pos/staff").then((r) => r.json()) });
}
function beep() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ac = new Ctx(); const o = ac.createOscillator(); const g = ac.createGain();
    o.connect(g); g.connect(ac.destination); o.type = "sine"; o.frequency.value = 880;
    g.gain.setValueAtTime(0.001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.3, ac.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
    o.start(); o.stop(ac.currentTime + 0.5);
  } catch {}
}

export default function RebornPos() {
  const [, navigate] = useLocation();
  const { user, isLoading } = useAuth();
  const role = (user as any)?.role;
  const isStaff = role === "admin" || role === "staff";
  const [tab, setTab] = useState<Tab>("tables");
  const [showDrawer, setShowDrawer] = useState(false);

  if (!isLoading && !isStaff) {
    return <RebornLayout active="/pos" title="POS"><div className="text-center py-16 text-white/50">Staff only. <button className="text-amber-300 underline" onClick={() => navigate("/")}>Go home</button></div></RebornLayout>;
  }
  return (
    <RebornLayout active="/pos" title="POS" wide>
      <div className="flex items-center gap-2 mb-4">
        <span className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c" }}><Store className="w-5 h-5" /></span>
        <h1 className="text-xl font-extrabold">Point of Sale</h1>
        <button onClick={() => setShowDrawer(true)} className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70"><Settings className="w-4 h-4" /> Cash drawer</button>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-4 max-w-2xl">
        {([["tables", "Tables", <LayoutGrid className="w-4 h-4" />], ["sell", "Quick sale", <Receipt className="w-4 h-4" />], ["stock", "Stock", <PackagePlus className="w-4 h-4" />], ["bottles", "Bottles", <Wine className="w-4 h-4" />]] as const).map(([k, l, ic]) => (
          <button key={k} onClick={() => setTab(k as Tab)} className={`py-2.5 rounded-xl border font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 ${tab === k ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/10 bg-white/5 text-white/60"}`}>{ic}<span className="hidden sm:inline">{l}</span><span className="sm:hidden">{l.split(" ")[0]}</span></button>
        ))}
      </div>
      {tab === "tables" && <TablesTab />}
      {tab === "sell" && <QuickSaleTab />}
      {tab === "stock" && <StockTab />}
      {tab === "bottles" && <BottlesTab />}
      {showDrawer && <DrawerSetup onClose={() => setShowDrawer(false)} />}
    </RebornLayout>
  );
}

function SalesPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { data: staff = [] } = useStaff();
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm">
      <option value="">Salesperson (commission) — optional</option>
      {staff.map((s) => <option key={s.id} value={s.id}>{s.name}{s.role === "admin" ? " (admin)" : ""}</option>)}
    </select>
  );
}

// ── Product picker: pending cart → onCommit(items) ──────────────────────────
function ProductPicker({ label, onCommit, busy }: { label: string; onCommit: (items: any[]) => void; busy?: boolean }) {
  const { data: products = [] } = useProducts();
  const [cart, setCart] = useState<Record<number, number>>({});
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const lines = Object.entries(cart).filter(([, q]) => q > 0);
  const total = lines.reduce((s, [id, q]) => s + Number(byId.get(Number(id))?.price || 0) * q, 0);
  const add = (id: number) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const sub = (id: number) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) - 1) }));
  const commit = () => { onCommit(lines.map(([id, q]) => { const p = byId.get(Number(id))!; return { productId: p.id, name: p.name, price: Number(p.price), qty: q }; })); setCart({}); };
  const groups = useMemo(() => {
    const g: Record<string, Product[]> = {};
    for (const p of products) (g[p.category || "Other"] ||= []).push(p);
    return Object.entries(g);
  }, [products]);
  return (
    <div>
      {groups.map(([cat, items]) => (
        <div key={cat} className="mb-4">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 px-1">{cat}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {items.map((p) => (
              <button key={p.id} onClick={() => add(p.id)} disabled={p.stock <= 0} className="rounded-2xl border border-white/10 bg-white/5 text-left active:scale-95 transition-all disabled:opacity-40 relative overflow-hidden">
                {p.imageUrl
                  ? <img src={p.imageUrl} alt="" className="w-full aspect-square object-cover" />
                  : <div className="w-full aspect-square flex items-center justify-center text-2xl bg-white/5">🍸</div>}
                <div className="p-2">
                  <p className="text-sm font-semibold leading-tight line-clamp-1">{p.name}</p>
                  <p className="text-xs text-amber-300">{rp(Number(p.price))}</p>
                  <p className="text-[10px] text-white/40">stock {p.stock}</p>
                </div>
                {(cart[p.id] || 0) > 0 && <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-amber-400 text-black text-xs font-bold flex items-center justify-center">{cart[p.id]}</span>}
              </button>
            ))}
          </div>
        </div>
      ))}
      {products.length === 0 && <p className="text-center text-white/40 py-6 text-sm">No products yet — add them in Admin › Products.</p>}
      {lines.length > 0 && (
        <div className="rounded-2xl border border-amber-400/30 bg-[#160f2a] p-3 mb-3">
          {lines.map(([id, q]) => {
            const p = byId.get(Number(id))!;
            return (
              <div key={id} className="flex items-center gap-2 py-1.5">
                <span className="flex-1 text-sm">{p.name}</span>
                <button onClick={() => sub(Number(id))} style={{ width: 32, height: 32 }} className="rounded-full bg-white/15 text-white flex items-center justify-center text-xl leading-none font-bold flex-shrink-0">−</button>
                <span style={{ minWidth: 20 }} className="text-center text-sm font-bold">{q}</span>
                <button onClick={() => add(Number(id))} style={{ width: 32, height: 32 }} className="rounded-full bg-white/15 text-white flex items-center justify-center text-xl leading-none font-bold flex-shrink-0">+</button>
                <span className="w-20 text-right text-sm text-amber-300">{rp(Number(p.price) * q)}</span>
              </div>
            );
          })}
          <div className="flex justify-between items-center border-t border-white/10 mt-2 pt-2">
            <button onClick={() => setCart({})} className="text-xs text-red-400 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Clear</button>
            <span className="text-lg font-extrabold text-amber-300">{rp(total)}</span>
          </div>
          <button onClick={commit} disabled={busy} className="w-full py-3 rounded-xl font-bold text-black mt-2 disabled:opacity-50" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>{label} · {rp(total)}</button>
        </div>
      )}
    </div>
  );
}

// ── Tables: running tabs + new-order alerts ─────────────────────────────────
function TablesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<number | null>(null);
  const [table, setTable] = useState("");
  const [code, setCode] = useState("");
  const [sales, setSales] = useState("");
  const seen = useRef<Set<number> | null>(null);
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/reborn/pos/orders"],
    queryFn: () => apiRequest("GET", "/api/reborn/pos/orders?status=open").then((r) => r.json()),
    refetchInterval: 8000,
  });

  // Alert staff when a new app order arrives so they can prepare it.
  useEffect(() => {
    if (seen.current === null) { seen.current = new Set(orders.map((o) => o.id)); return; }
    for (const o of orders) {
      if (!seen.current.has(o.id)) {
        seen.current.add(o.id);
        if (o.source === "app") { beep(); toast({ title: "🔔 New order", description: `Table ${o.tableNumber || "—"} · ${o.memberName || "member"} — ${rp(Number(o.total))}` }); }
      }
    }
  }, [orders, toast]);
  const appCount = orders.filter((o) => o.source === "app").length;

  const openTicket = useMutation({
    mutationFn: () => post("/api/reborn/pos/orders", { tableNumber: table, memberCode: code || undefined, salesStaffId: sales || undefined }),
    onSuccess: (d) => { toast({ title: d.message }); setTable(""); setCode(""); setSales(""); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/orders"] }); setOpenId(d.order.id); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const active = orders.find((o) => o.id === openId);
  if (openId && active) return <TicketDetail order={active} onBack={() => setOpenId(null)} />;

  return (
    <div className="lg:grid lg:grid-cols-[340px_1fr] lg:gap-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 mb-4 lg:mb-0 h-fit">
        <p className="font-bold mb-2 text-sm">Open a new table ticket</p>
        <input value={table} onChange={(e) => setTable(e.target.value)} placeholder="Table number" className="w-full px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm mb-2" />
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code / card / username / email (optional)" className="w-full px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm mb-2" />
        <div className="mb-2"><SalesPicker value={sales} onChange={setSales} /></div>
        <button onClick={() => openTicket.mutate()} disabled={!table.trim() || openTicket.isPending} className="w-full py-2.5 rounded-xl font-bold text-black disabled:opacity-50" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>Open ticket</button>
      </div>
      <div>
        <p className="text-xs text-white/40 px-1 mb-2 flex items-center gap-2">Open tickets — tap to add items or take payment {appCount > 0 && <span className="inline-flex items-center gap-1 text-amber-300"><Bell className="w-3 h-3" /> {appCount} app order(s)</span>}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {orders.map((o) => (
            <button key={o.id} onClick={() => setOpenId(o.id)} className={`rounded-2xl border p-3 text-left active:scale-95 transition-all ${o.source === "app" ? "border-amber-400/50 bg-amber-400/10" : "border-white/10 bg-white/5"}`}>
              <p className="font-extrabold flex items-center gap-1">Table {o.tableNumber || "—"}{o.source === "app" && <span className="text-[9px] font-bold text-amber-300 bg-amber-400/20 px-1 rounded">NEW</span>}</p>
              <p className="text-xs text-white/50 truncate">{o.memberName || "Walk-in"}</p>
              {o.salesStaffName && <p className="text-[10px] text-white/40 truncate">sales: {o.salesStaffName}</p>}
              <p className="text-amber-300 font-bold mt-1">{rp(Number(o.total))}</p>
            </button>
          ))}
        </div>
        {orders.length === 0 && <p className="text-center text-white/40 py-8 text-sm">No open tickets. Open one, or member app orders will appear here.</p>}
      </div>
    </div>
  );
}

function TicketDetail({ order, onBack }: { order: Order; onBack: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [pay, setPay] = useState<"cash" | "card">("cash");
  const [code, setCode] = useState("");
  const [sales, setSales] = useState("");
  const [discount, setDiscount] = useState(0);
  const [orderMode, setOrderMode] = useState<"dine_in" | "take_away">((order.orderMode as any) || "dine_in");
  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/reborn/pos/orders"] });
  const addItems = useMutation({
    mutationFn: (items: any[]) => post(`/api/reborn/pos/orders/${order.id}/items`, { items }),
    onSuccess: () => { toast({ title: "Added to ticket" }); invalidate(); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const tagMember = useMutation({
    mutationFn: () => post(`/api/reborn/pos/orders/${order.id}/member`, { memberCode: code }),
    onSuccess: (d) => { toast({ title: d.message }); setCode(""); invalidate(); },
    onError: (e: any) => toast({ title: "Not found", description: e.message, variant: "destructive" }),
  });
  const payNow = useMutation({
    mutationFn: () => post(`/api/reborn/pos/orders/${order.id}/pay`, { paymentMethod: pay, salesStaffId: sales || undefined, discount, orderMode }),
    onSuccess: async (d) => {
      if (pay === "cash") { const ok = await openCashDrawer(); if (!ok && drawerConfigured()) toast({ title: "Drawer not opened", description: "Check Cash drawer setup." }); }
      if (d.order) printReceipt(d.order, d.receipt || {});
      toast({ title: "Paid", description: d.message }); invalidate(); onBack();
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const cancel = useMutation({
    mutationFn: () => post(`/api/reborn/pos/orders/${order.id}/cancel`),
    onSuccess: (d) => { toast({ title: d.message }); invalidate(); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); onBack(); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const itemStatus = useMutation({
    mutationFn: (v: { id: number; status: string; reason?: string }) => post(`/api/reborn/pos/items/${v.id}/status`, { status: v.status, reason: v.reason }),
    onSuccess: (d: any) => { toast({ title: d.message }); invalidate(); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const total = Number(order.total);
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-white/60 text-sm mb-3"><ChevronLeft className="w-4 h-4" /> All tables</button>
      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6">
        <div>
          <p className="text-xs text-white/40 px-1 mb-2">Add items</p>
          <ProductPicker label="Add to ticket" busy={addItems.isPending} onCommit={(items) => addItems.mutate(items)} />
        </div>
        <div className="lg:sticky lg:top-20 h-fit">
          <div className="rounded-2xl border border-amber-400/30 bg-white/5 p-4 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-extrabold">Table {order.tableNumber || "—"}</p>
                <p className="text-xs text-white/50">{order.orderNo} · {order.memberName || "no member"}</p>
              </div>
              <span className="text-xl font-extrabold text-amber-300">{rp(total)}</span>
            </div>
            {order.items && order.items.length > 0 && (
              <div className="mt-3 border-t border-white/10 pt-2 text-sm text-white/70 max-h-72 overflow-y-auto space-y-1.5">
                {order.items.map((it: any) => (
                  <div key={it.id} className={`${it.status === "rejected" ? "opacity-50" : ""}`}>
                    <div className="flex justify-between py-0.5">
                      <span className={it.status === "rejected" ? "line-through" : ""}>{it.qty}× {it.name}
                        {it.status === "pending" && <span className="ml-1 text-[10px] text-amber-300 bg-amber-400/20 px-1 rounded">NEW</span>}
                        {it.status === "served" && <span className="ml-1 text-[10px] text-emerald-300">✓ served</span>}
                        {it.status === "rejected" && <span className="ml-1 text-[10px] text-red-300">✕ {it.rejectReason}</span>}
                      </span>
                      <span>{rp(Number(it.lineTotal))}</span>
                    </div>
                    {it.status === "pending" && (
                      <div className="flex gap-1.5 pb-1">
                        <button onClick={() => itemStatus.mutate({ id: it.id, status: "accepted" })} className="px-2 py-1 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">Accept</button>
                        <button onClick={() => { const reason = prompt("Reject reason (e.g. out of stock, closing):", "out of stock") || "Unavailable"; itemStatus.mutate({ id: it.id, status: "rejected", reason }); }} className="px-2 py-1 rounded-md text-[11px] font-semibold bg-red-500/15 text-red-200 border border-red-400/40">Reject</button>
                      </div>
                    )}
                    {it.status === "accepted" && (
                      <div className="flex gap-1.5 pb-1">
                        <button onClick={() => itemStatus.mutate({ id: it.id, status: "served" })} className="px-2 py-1 rounded-md text-[11px] font-semibold bg-white/10 text-white/70">Mark served</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!order.memberName && (
              <div className="flex gap-2 mt-3">
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Tag member (code/card/username)" className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm" />
                <button onClick={() => tagMember.mutate()} disabled={!code.trim() || tagMember.isPending} className="px-4 rounded-xl bg-white/10 disabled:opacity-50"><UserCheck className="w-4 h-4" /></button>
              </div>
            )}
          </div>
          <button onClick={() => printKitchen({ ...order })} className="w-full py-2.5 rounded-xl bg-white/10 border border-white/10 text-sm font-semibold mb-3 flex items-center justify-center gap-2"><Printer className="w-4 h-4" /> Print kitchen ticket</button>
          <div className="rounded-2xl border border-white/10 bg-[#160f2a] p-3">
            <p className="font-bold text-sm mb-2">Take payment · {rp(total)}</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {(["dine_in", "take_away"] as const).map((m) => (
                <button key={m} onClick={() => setOrderMode(m)} className={`py-2 rounded-xl border font-semibold text-xs ${orderMode === m ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/10 bg-black/30 text-white/60"}`}>{m === "dine_in" ? "Dine in" : "Take away"}</button>
              ))}
            </div>
            <div className="mb-2"><SalesPicker value={sales} onChange={setSales} /></div>
            <label className="text-xs text-white/50 block mb-2">Discount (RP)<input type="number" min={0} value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))} className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm" /></label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {(["cash", "card"] as const).map((m) => (
                <button key={m} onClick={() => setPay(m)} className={`py-2.5 rounded-xl border font-semibold text-sm capitalize ${pay === m ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/10 bg-black/30 text-white/60"}`}>{m}</button>
              ))}
            </div>
            <button onClick={() => payNow.mutate()} disabled={payNow.isPending || total <= 0} className="w-full py-3 rounded-xl font-bold text-black disabled:opacity-50" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>Charge {rp(Math.max(0, total - discount))} {pay} · print</button>
            <button onClick={() => { if (confirm("Cancel this ticket and restore stock?")) cancel.mutate(); }} disabled={cancel.isPending} className="w-full py-2.5 rounded-xl text-red-300 text-sm mt-2 border border-red-400/30 bg-red-500/10">Cancel ticket</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Quick sale ──────────────────────────────────────────────────────────────
function QuickSaleTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [member, setMember] = useState<any>(null);
  const [pay, setPay] = useState<"cash" | "card">("cash");
  const [sales, setSales] = useState("");
  const [discount, setDiscount] = useState(0);
  const [orderMode, setOrderMode] = useState<"dine_in" | "take_away">("dine_in");
  const lookup = useMutation({
    mutationFn: () => apiRequest("GET", `/api/reborn/pos/member/${encodeURIComponent(code.trim())}`).then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
    onSuccess: ({ ok, d }) => { if (ok) { setMember(d); toast({ title: "Member found", description: d.name }); } else toast({ title: "Not found", description: d.message, variant: "destructive" }); },
  });
  const sell = useMutation({
    mutationFn: (items: any[]) => post("/api/reborn/pos/sale", { memberCode: member?.code || undefined, paymentMethod: pay, salesStaffId: sales || undefined, discount, orderMode, items }),
    onSuccess: async (d) => {
      if (pay === "cash") await openCashDrawer();
      if (d.order) printReceipt(d.order, d.receipt || {});
      toast({ title: "Sale complete", description: d.message }); setMember(null); setCode(""); setDiscount(0); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  return (
    <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-6">
      <div className="order-2 lg:order-1">
        <ProductPicker label={`Charge ${pay}`} busy={sell.isPending} onCommit={(items) => sell.mutate(items)} />
      </div>
      <div className="order-1 lg:order-2 mb-3 lg:mb-0 space-y-3 h-fit">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          {member ? (
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              <div className="flex-1"><p className="font-semibold text-sm">{member.name}</p><p className="text-xs text-white/50">{member.code} · {member.loyaltyPoints} pts</p></div>
              <button onClick={() => setMember(null)} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code / card / username / email (optional)" className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm" />
              <button onClick={() => lookup.mutate()} disabled={!code.trim() || lookup.isPending} className="px-4 rounded-xl bg-white/10 disabled:opacity-50"><Search className="w-4 h-4" /></button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["dine_in", "take_away"] as const).map((m) => (
            <button key={m} onClick={() => setOrderMode(m)} className={`py-2 rounded-xl border font-semibold text-xs ${orderMode === m ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/10 bg-black/30 text-white/60"}`}>{m === "dine_in" ? "Dine in" : "Take away"}</button>
          ))}
        </div>
        <SalesPicker value={sales} onChange={setSales} />
        <label className="text-xs text-white/50 block">Discount (RP)<input type="number" min={0} value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))} className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm" /></label>
        <div className="grid grid-cols-2 gap-2">
          {(["cash", "card"] as const).map((m) => (
            <button key={m} onClick={() => setPay(m)} className={`py-2.5 rounded-xl border font-semibold text-sm capitalize ${pay === m ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/10 bg-black/30 text-white/60"}`}>{m}</button>
          ))}
        </div>
        <p className="text-[11px] text-white/40 text-center">A receipt prints automatically on charge.</p>
      </div>
    </div>
  );
}

// ── Stock ─────────────────────────────────────────────────────────────────
function StockTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [sel, setSel] = useState<number | null>(null);
  const [dir, setDir] = useState<"add" | "deduct">("add");
  const [qty, setQty] = useState(10);
  const [unitCost, setUnitCost] = useState(0);
  const [note, setNote] = useState("");
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/reborn/pos/stock"], queryFn: () => apiRequest("GET", "/api/reborn/pos/stock").then((r) => r.json()) });
  const groups = useMemo(() => {
    const g: Record<string, Product[]> = {};
    for (const p of products) (g[p.category || "Other"] ||= []).push(p);
    return Object.entries(g);
  }, [products]);
  const adjust = useMutation({
    mutationFn: () => post("/api/reborn/pos/stock-in", { productId: sel, qty: dir === "add" ? qty : -qty, unitCost: dir === "add" ? unitCost : 0, note: note || (dir === "deduct" ? "Manual deduct" : "Manual add") }),
    onSuccess: (d) => { toast({ title: "Stock updated", description: d.message }); setSel(null); setQty(10); setUnitCost(0); setNote(""); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/stock"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  return (
    <div className="space-y-4">
      {groups.map(([cat, items]) => (
        <div key={cat}>
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 px-1">{cat}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {items.map((p) => (
              <div key={p.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {p.imageUrl && <img src={p.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover" />}
                    <div className="min-w-0"><p className="font-semibold text-sm truncate">{p.name}</p><p className={`text-xs ${p.stock <= 5 ? "text-red-400" : "text-white/50"}`}>stock {p.stock}{p.stock <= 5 ? " · low!" : ""}</p></div>
                  </div>
                  <button onClick={() => { setSel(sel === p.id ? null : p.id); setDir("add"); }} className="px-3 py-2 rounded-xl bg-white/10 text-sm font-semibold flex items-center gap-1 flex-shrink-0"><PackagePlus className="w-4 h-4" /></button>
                </div>
                {sel === p.id && (
                  <div className="mt-3">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <button onClick={() => setDir("add")} className={`py-2 rounded-xl border text-sm font-semibold ${dir === "add" ? "border-emerald-400 bg-emerald-400/15 text-emerald-200" : "border-white/10 bg-black/30 text-white/60"}`}>Add</button>
                      <button onClick={() => setDir("deduct")} className={`py-2 rounded-xl border text-sm font-semibold ${dir === "deduct" ? "border-red-400 bg-red-400/15 text-red-200" : "border-white/10 bg-black/30 text-white/60"}`}>Deduct</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-[11px] text-white/50">Quantity</label><input type="number" value={qty} onChange={(e) => setQty(Math.abs(Number(e.target.value)))} className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm" /></div>
                      {dir === "add"
                        ? <div><label className="text-[11px] text-white/50">Unit cost (RP)</label><input type="number" value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm" /></div>
                        : <div><label className="text-[11px] text-white/50">Reason</label><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="wastage, spoilage…" className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm" /></div>}
                      <button onClick={() => adjust.mutate()} disabled={adjust.isPending || qty === 0} className="col-span-2 py-2.5 rounded-xl font-bold text-black disabled:opacity-50" style={{ background: dir === "add" ? "linear-gradient(90deg,#c9a84c,#f0d787)" : "linear-gradient(90deg,#f87171,#fca5a5)" }}>{dir === "add" ? `Add ${qty} · cost ${rp(qty * unitCost)}` : `Deduct ${qty}`}</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      {products.length === 0 && <p className="text-center text-white/40 py-10 text-sm">No products yet. Add them in Admin › Products.</p>}
    </div>
  );
}

// ── Bottle keep ─────────────────────────────────────────────────────────────
function BottlesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [f, setF] = useState({ memberCode: "", type: "beer", name: "", quantity: 1, photoUrl: "", note: "" });
  const [q, setQ] = useState("");
  const { data: kept = [] } = useQuery<any[]>({
    queryKey: ["/api/reborn/pos/bottle-keeps", q],
    queryFn: () => apiRequest("GET", `/api/reborn/pos/bottle-keeps${q ? "?q=" + encodeURIComponent(q) : ""}`).then((r) => r.json()),
    refetchInterval: 20000,
  });
  const store = useMutation({
    mutationFn: () => post("/api/reborn/pos/bottle-keep", f),
    onSuccess: (d) => { toast({ title: d.message }); setF({ memberCode: "", type: "beer", name: "", quantity: 1, photoUrl: "", note: "" }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/bottle-keeps"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const collect = useMutation({
    mutationFn: (id: number) => post(`/api/reborn/pos/bottle-keeps/${id}/collect`, {}),
    onSuccess: (d) => { toast({ title: d.message }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/bottle-keeps"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const inp = "w-full px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm";
  return (
    <div className="lg:grid lg:grid-cols-[360px_1fr] lg:gap-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 mb-4 lg:mb-0 h-fit">
        <p className="font-bold mb-2 text-sm flex items-center gap-2"><Wine className="w-4 h-4 text-amber-300" /> Keep a bottle</p>
        <input value={f.memberCode} onChange={(e) => setF({ ...f, memberCode: e.target.value })} placeholder="Member code / card / username" className={inp + " mb-2"} />
        <div className="grid grid-cols-2 gap-2 mb-2">
          <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className={inp}>
            <option value="beer">Beer</option><option value="whisky">Whisky</option><option value="other">Other</option>
          </select>
          <input type="number" min={1} value={f.quantity} onChange={(e) => setF({ ...f, quantity: Number(e.target.value) })} placeholder="Qty" className={inp} />
        </div>
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Bottle name (e.g. Chivas 12)" className={inp + " mb-2"} />
        {f.type !== "beer" && (
          <div className="mb-2"><p className="text-xs text-white/50 mb-1">Photo of remaining level</p><ImageUpload value={f.photoUrl} onChange={(v) => setF({ ...f, photoUrl: v })} label="Take / upload photo" /></div>
        )}
        <input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Note (optional)" className={inp + " mb-2"} />
        <button onClick={() => store.mutate()} disabled={store.isPending || !f.name.trim() || !f.memberCode.trim()} className="w-full py-2.5 rounded-xl font-bold text-black disabled:opacity-50" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>Keep bottle (30 days)</button>
      </div>
      <div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search kept bottles by member or name" className={inp + " mb-3"} />
        <div className="grid sm:grid-cols-2 gap-2">
          {kept.map((b) => (
            <div key={b.id} className={`flex items-center gap-3 rounded-2xl border p-3 ${b.expiringSoon ? "border-amber-400/40 bg-amber-400/5" : "border-white/10 bg-white/5"}`}>
              {b.photoUrl
                ? <img src={b.photoUrl} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                : <span className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0"><Wine className="w-6 h-6 text-amber-300" /></span>}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{b.name} <span className="text-white/40">×{b.quantity}</span></p>
                <p className="text-xs text-white/50 truncate">{b.memberName} · {b.type}</p>
                <p className={`text-[11px] ${b.daysLeft <= 5 ? "text-amber-300" : "text-white/40"}`}>{b.daysLeft} day(s) left</p>
              </div>
              <button onClick={() => collect.mutate(b.id)} disabled={collect.isPending} className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-sm font-semibold flex-shrink-0">Collect</button>
            </div>
          ))}
        </div>
        {kept.length === 0 && <p className="text-center text-white/40 py-10 text-sm">No bottles in keep.</p>}
      </div>
    </div>
  );
}

// ── Cash drawer setup ───────────────────────────────────────────────────────
function DrawerSetup({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [url, setUrl] = useState(getDrawerUrl());
  const [linked, setLinked] = useState(false);
  const connect = async () => {
    const ok = await connectDrawerSerial();
    setLinked(ok);
    toast({ title: ok ? "Printer/drawer linked" : "Not linked", description: ok ? "The cash drawer will open on cash sales." : "Pick your receipt printer's serial port, or set a drawer URL below." });
  };
  const save = () => { setDrawerUrl(url.trim()); toast({ title: "Saved" }); };
  const test = async () => { const ok = await openCashDrawer(); toast({ title: ok ? "Kick sent" : "No drawer responded", description: ok ? "Drawer should have opened." : "Link the printer or set a URL first." }); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-[#160f2a] border border-white/10 rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><X className="w-4 h-4" /></button>
        <h3 className="text-lg font-extrabold mb-1">Cash drawer</h3>
        <p className="text-sm text-white/60 mb-4">The drawer opens automatically on cash payments once linked. It kicks via your ESC/POS receipt printer.</p>
        {serialSupported() ? (
          <button onClick={connect} className="w-full py-3 rounded-xl font-bold text-black mb-3" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>{linked ? "Re-link printer (USB/serial)" : "Link printer (USB/serial)"}</button>
        ) : (
          <p className="text-xs text-amber-300/80 mb-3">This browser has no Web Serial — use Chrome/Edge on the counter PC, or set a drawer URL below.</p>
        )}
        <label className="text-xs text-white/50 block mb-1">Drawer/printer URL (local print server, optional)</label>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://192.168.1.50:8000/kick" className="w-full px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm mb-3" />
        <div className="flex gap-2">
          <button onClick={save} className="flex-1 py-2.5 rounded-xl bg-white/10 border border-white/10 text-sm font-semibold">Save URL</button>
          <button onClick={test} className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-sm font-semibold">Test open</button>
        </div>
      </div>
    </div>
  );
}
