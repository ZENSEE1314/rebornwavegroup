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
interface Order { id: number; orderNo: string; tableNumber?: string; memberName?: string; memberCode?: string; salesStaffName?: string; total: string; source: string; orderMode?: string; items?: any[]; paymentMethod?: string; paymentReference?: string; cashReceived?: string; changeGiven?: string; subtotal?: string; discount?: string; tax?: string; paidAt?: string; }
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
function ProductPicker({ label, onCommit, onCartChange, busy }: { label: string; onCommit: (items: any[]) => void; onCartChange?: (items: any[]) => void; busy?: boolean }) {
  const { data: products = [] } = useProducts();
  const [cart, setCart] = useState<Record<number, number>>({});
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const lines = Object.entries(cart).filter(([, q]) => q > 0);
  const cartItems = useMemo(() => Object.entries(cart).filter(([, q]) => q > 0).map(([id, qty]) => ({ ...byId.get(Number(id))!, qty })), [cart, byId]);
  useEffect(() => { onCartChange?.(cartItems); }, [cartItems, onCartChange]);
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

const emptyBottle = () => ({ enabled: false, type: "beer", name: "", quantity: 1, photoUrl: "", note: "" });
const isDrink = (category = "", name = "") => /drink|beverage|beer|lager|ale|wine|whisky|whiskey|spirit|vodka|gin|rum|tequila|cocktail|bottle/i.test(`${category} ${name}`);
const bottleType = (category = "", name = "") => /whisky|whiskey|spirit|vodka|gin|rum/i.test(`${category} ${name}`) ? "whisky" : /wine/i.test(`${category} ${name}`) ? "wine" : /beer|lager|ale/i.test(`${category} ${name}`) ? "beer" : "other";
function KeepBottleCheckout({ value, onChange, hasMember, drinkOptions = [] }: { value: any; onChange: (value: any) => void; hasMember: boolean; drinkOptions?: Array<{ name: string; category?: string }> }) {
  const input = "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white";
  const unique = Array.from(new Map(drinkOptions.map((x)=>[x.name,x])).values());
  const availableTypes = Array.from(new Set(unique.map((x)=>bottleType(x.category,x.name))));
  const filtered = unique.filter((x)=>bottleType(x.category,x.name)===value.type);
  useEffect(() => {
    if (!value.enabled || availableTypes.length === 0 || availableTypes.includes(value.type)) return;
    onChange({ ...value, type: availableTypes[0], name: "", photoUrl: "" });
  }, [value.enabled, value.type, availableTypes.join("|")]);
  return <div className="mb-2 rounded-xl border border-white/10 bg-black/20 p-3">
    <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={value.enabled} onChange={(e) => onChange({ ...value, enabled: e.target.checked })}/><Wine className="h-4 w-4 text-amber-300"/> Keep unfinished bottle with this checkout</label>
    {value.enabled && <div className="mt-3 space-y-2">
      {!hasMember && <p className="rounded-lg bg-red-500/10 p-2 text-xs text-red-200">Select or tag a member first.</p>}
      <div className="grid grid-cols-[1fr_80px] gap-2"><select className={input} value={value.type} onChange={(e)=>onChange({...value,type:e.target.value,name:"",photoUrl:""})}>{availableTypes.map((type)=><option key={type} value={type}>{type === "whisky" ? "Whisky / spirits" : type.charAt(0).toUpperCase()+type.slice(1)}</option>)}</select><input className={input} type="number" min={1} value={value.quantity} onChange={(e)=>onChange({...value,quantity:Number(e.target.value)})}/></div>
      <select className={input} value={value.name} onChange={(e)=>onChange({...value,name:e.target.value})}>
        <option value="">Select {value.type} from this order</option>
        {filtered.map((x)=><option key={x.name} value={x.name}>{x.name}</option>)}
      </select>
      {drinkOptions.length === 0 && <p className="text-xs text-amber-200">Add a drink to the order before keeping it.</p>}
      {(value.type === "wine" || value.type === "whisky") && <div><p className="mb-1 text-xs text-white/50">Photo of the remaining bottle level (required)</p><ImageUpload value={value.photoUrl} onChange={(photoUrl)=>onChange({...value,photoUrl})} label="Take / upload bottle photo" /></div>}
      <input className={input} value={value.note} onChange={(e)=>onChange({...value,note:e.target.value})} placeholder="Note (optional)"/>
    </div>}
  </div>;
}

function TicketDetail({ order, onBack }: { order: Order; onBack: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [pay, setPay] = useState<"cash" | "card">("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [receiptResult, setReceiptResult] = useState<any>(null);
  const { data: products = [] } = useProducts();
  const productById = useMemo(() => new Map(products.map((p)=>[p.id,p])), [products]);
  const orderDrinks = (order.items || []).filter((item:any)=>item.status !== "rejected").map((item:any)=>({ name:item.name, category:productById.get(item.productId)?.category || "" })).filter((item:any)=>isDrink(item.category,item.name));
  const [code, setCode] = useState("");
  const [sales, setSales] = useState("");
  const [discount, setDiscount] = useState(Number((order as any).discount) || 0);
  const [discPct, setDiscPct] = useState("");
  const [discReason, setDiscReason] = useState((order as any).discountReason || "");
  const [orderMode, setOrderMode] = useState<"dine_in" | "take_away">((order.orderMode as any) || "dine_in");
  const [keepBottle, setKeepBottle] = useState(emptyBottle);
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
    mutationFn: () => post(`/api/reborn/pos/orders/${order.id}/pay`, { paymentMethod: pay, paymentReference: paymentReference.trim() || undefined, cashReceived: pay === "cash" ? Number(cashReceived) : undefined, salesStaffId: sales || undefined, discount, orderMode, keepBottle }),
    onSuccess: async (d) => {
      if (pay === "cash") { const ok = await openCashDrawer(); if (!ok && drawerConfigured()) toast({ title: "Drawer not opened", description: "Check Cash drawer setup." }); }
      if (d.receipt?.autoPrint && d.order) printReceipt(d.order, d.receipt || {});
      toast({ title: "Paid", description: d.message }); setReceiptResult(d);
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
  const itemEdit = useMutation({
    mutationFn: (v: { id: number; op: string; body?: any }) => post(`/api/reborn/pos/items/${v.id}/${v.op}`, v.body || {}),
    onSuccess: (d: any) => { toast({ title: d.message }); invalidate(); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const renameTable = useMutation({
    mutationFn: (tableNumber: string) => post(`/api/reborn/pos/orders/${order.id}/table`, { tableNumber }),
    onSuccess: (d: any) => { toast({ title: d.message }); invalidate(); }, onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const setBillDiscount = useMutation({
    mutationFn: (v: { amount?: number; percent?: number; reason?: string }) => post(`/api/reborn/pos/orders/${order.id}/discount`, v),
    onSuccess: (d: any) => { toast({ title: d.message }); setDiscount(d.amount ?? 0); setDiscPct(""); invalidate(); }, onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const mergeInto = useMutation({
    mutationFn: (intoId: number) => post(`/api/reborn/pos/orders/${order.id}/merge`, { intoId }),
    onSuccess: (d: any) => { toast({ title: d.message }); invalidate(); onBack(); }, onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const { data: openTickets = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/pos/orders"], queryFn: () => apiRequest("GET", "/api/reborn/pos/orders?status=open").then((r) => r.json()) });
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
                <p className="text-xl font-extrabold flex items-center gap-2">Table {order.tableNumber || "—"}
                  <button onClick={() => { const t = prompt("Change table number (e.g. 2, 2B):", order.tableNumber || ""); if (t && t.trim()) renameTable.mutate(t.trim()); }} className="text-white/40 hover:text-white text-xs">✏️</button>
                </p>
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
                    {it.status !== "rejected" && (
                      <div className="flex flex-wrap gap-1.5 pb-1">
                        {it.status === "accepted" && <button onClick={() => itemStatus.mutate({ id: it.id, status: "served" })} className="px-2 py-1 rounded-md text-[11px] font-semibold bg-white/10 text-white/70">Served</button>}
                        <button onClick={() => { const p = prompt(`New unit price for "${it.name}" (RP):`, String(Number(it.price))); if (p !== null) itemEdit.mutate({ id: it.id, op: "edit", body: { price: Number(p) } }); }} className="px-2 py-1 rounded-md text-[11px] font-semibold bg-white/10 text-white/60">Price</button>
                        <button onClick={() => { const q = prompt(`Quantity for "${it.name}":`, String(it.qty)); if (q !== null) itemEdit.mutate({ id: it.id, op: "edit", body: { qty: Number(q) } }); }} className="px-2 py-1 rounded-md text-[11px] font-semibold bg-white/10 text-white/60">Qty</button>
                        <button onClick={() => { const t = prompt(`Move "${it.name}" to which table? (splits the bill)`, ""); if (t && t.trim()) itemEdit.mutate({ id: it.id, op: "move", body: { tableNumber: t.trim() } }); }} className="px-2 py-1 rounded-md text-[11px] font-semibold bg-white/10 text-white/60">Move</button>
                        <button onClick={() => { const reason = prompt(`Remove "${it.name}" — reason (shown to the customer):`, ""); if (reason !== null) itemEdit.mutate({ id: it.id, op: "remove", body: { reason } }); }} className="px-2 py-1 rounded-md text-[11px] font-semibold bg-red-500/15 text-red-200">✕ Remove</button>
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
          {/* Merge this bill into another open table */}
          {openTickets.filter((t: any) => t.id !== order.id).length > 0 && (
            <div className="flex gap-2 mb-3">
              <select id={`merge-${order.id}`} className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm">
                <option value="">Merge into table…</option>
                {openTickets.filter((t: any) => t.id !== order.id).map((t: any) => <option key={t.id} value={t.id}>Table {t.tableNumber || "—"} ({rp(Number(t.total))})</option>)}
              </select>
              <button onClick={() => { const el = document.getElementById(`merge-${order.id}`) as HTMLSelectElement; const into = Number(el?.value); if (into && confirm("Merge this bill into the selected table?")) mergeInto.mutate(into); }} className="px-4 rounded-xl bg-white/10 text-sm font-semibold">Merge</button>
            </div>
          )}
          <button onClick={() => printKitchen({ ...order })} className="w-full py-2.5 rounded-xl bg-white/10 border border-white/10 text-sm font-semibold mb-3 flex items-center justify-center gap-2"><Printer className="w-4 h-4" /> Print kitchen ticket</button>
          <div className="rounded-2xl border border-white/10 bg-[#160f2a] p-3">
            <p className="font-bold text-sm mb-2">Take payment · {rp(total)}</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {(["dine_in", "take_away"] as const).map((m) => (
                <button key={m} onClick={() => setOrderMode(m)} className={`py-2 rounded-xl border font-semibold text-xs ${orderMode === m ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/10 bg-black/30 text-white/60"}`}>{m === "dine_in" ? "Dine in" : "Take away"}</button>
              ))}
            </div>
            <div className="mb-2"><SalesPicker value={sales} onChange={setSales} /></div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-2 mb-2">
              <p className="text-xs text-white/50 mb-1">Discount {(order as any).discountReason ? <span className="text-amber-300">· {(order as any).discountReason}</span> : ""}</p>
              <div className="flex gap-2 mb-2">
                <input type="number" min={0} value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))} placeholder="RP amount" className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm" />
                <input type="number" min={0} max={100} value={discPct} onChange={(e) => setDiscPct(e.target.value)} placeholder="%" className="w-16 px-2 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm" />
              </div>
              <input value={discReason} onChange={(e) => setDiscReason(e.target.value)} placeholder="Reason (optional)" className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm mb-2" />
              <button onClick={() => setBillDiscount.mutate(discPct ? { percent: Number(discPct), reason: discReason } : { amount: discount, reason: discReason })} className="w-full py-2 rounded-xl bg-white/10 text-sm font-semibold">Apply discount</button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {(["cash", "card"] as const).map((m) => (
                <button key={m} onClick={() => setPay(m)} className={`py-2.5 rounded-xl border font-semibold text-sm capitalize ${pay === m ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/10 bg-black/30 text-white/60"}`}>{m}</button>
              ))}
            </div>
            {pay === "card" && <label className="mb-2 block text-xs text-white/60">Card approval / receipt number<input value={paymentReference} onChange={(e)=>setPaymentReference(e.target.value)} placeholder="Required for card payment" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white" /></label>}
            {pay === "cash" && <div className="mb-2 grid grid-cols-2 gap-2"><label className="block text-xs text-white/60">Cash received<input type="number" min={Math.max(0,total-discount)} value={cashReceived} onChange={(e)=>setCashReceived(e.target.value)} placeholder={String(Math.max(0,total-discount))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white" /></label><div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3"><p className="text-[11px] text-white/50">Change</p><p className="font-extrabold text-emerald-300">{rp(Math.max(0,Number(cashReceived||0)-Math.max(0,total-discount)))}</p></div></div>}
            <KeepBottleCheckout value={keepBottle} onChange={setKeepBottle} hasMember={!!order.memberName} drinkOptions={orderDrinks}/>
            <button onClick={() => payNow.mutate()} disabled={payNow.isPending || total <= 0 || (pay === "card" && !paymentReference.trim()) || (pay === "cash" && Number(cashReceived) < Math.max(0,total-discount)) || (keepBottle.enabled && (!keepBottle.name || ((keepBottle.type === "wine" || keepBottle.type === "whisky") && !keepBottle.photoUrl)))} className="w-full py-3 rounded-xl font-bold text-black disabled:opacity-50" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>Charge {rp(Math.max(0, total - discount))} {pay}</button>
            <button onClick={() => { if (confirm("Cancel this ticket and restore stock?")) cancel.mutate(); }} disabled={cancel.isPending} className="w-full py-2.5 rounded-xl text-red-300 text-sm mt-2 border border-red-400/30 bg-red-500/10">Cancel ticket</button>
          </div>
        </div>
      </div>
      {receiptResult && <ReceiptPreview order={receiptResult.order} meta={receiptResult.receipt} onDone={()=>{setReceiptResult(null);invalidate();onBack();}} />}
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
  const [paymentReference, setPaymentReference] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [receiptResult, setReceiptResult] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [sales, setSales] = useState("");
  const [discount, setDiscount] = useState(0);
  const [orderMode, setOrderMode] = useState<"dine_in" | "take_away">("dine_in");
  const [keepBottle, setKeepBottle] = useState(emptyBottle);
  const lookup = useMutation({
    mutationFn: () => apiRequest("GET", `/api/reborn/pos/member/${encodeURIComponent(code.trim())}`).then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
    onSuccess: ({ ok, d }) => { if (ok) { setMember(d); toast({ title: "Member found", description: d.name }); } else toast({ title: "Not found", description: d.message, variant: "destructive" }); },
  });
  const sell = useMutation({
    mutationFn: (items: any[]) => post("/api/reborn/pos/sale", { memberCode: member?.code || undefined, paymentMethod: pay, paymentReference: paymentReference.trim() || undefined, cashReceived: pay === "cash" ? Number(cashReceived) : undefined, salesStaffId: sales || undefined, discount, orderMode, keepBottle, items }),
    onSuccess: async (d) => {
      if (pay === "cash") await openCashDrawer();
      if (d.receipt?.autoPrint && d.order) printReceipt(d.order, d.receipt || {});
      toast({ title: "Sale complete", description: d.message }); setReceiptResult(d); setMember(null); setCode(""); setDiscount(0); setPaymentReference(""); setCashReceived(""); setKeepBottle(emptyBottle()); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  return (
    <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-6">
      <div className="order-2 lg:order-1">
        <ProductPicker label={`Charge ${pay}`} busy={sell.isPending || (pay === "card" && !paymentReference.trim()) || (pay === "cash" && Number(cashReceived) < Math.max(0,cartItems.reduce((s,x)=>s+Number(x.price)*Number(x.qty),0)-discount)) || (keepBottle.enabled && (!keepBottle.name || ((keepBottle.type === "wine" || keepBottle.type === "whisky") && !keepBottle.photoUrl)))} onCartChange={setCartItems} onCommit={(items) => sell.mutate(items)} />
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
        <KeepBottleCheckout value={keepBottle} onChange={setKeepBottle} hasMember={!!member} drinkOptions={cartItems.filter((x)=>isDrink(x.category,x.name)).map((x)=>({name:x.name,category:x.category}))}/>
        <div className="grid grid-cols-2 gap-2">
          {(["cash", "card"] as const).map((m) => (
            <button key={m} onClick={() => setPay(m)} className={`py-2.5 rounded-xl border font-semibold text-sm capitalize ${pay === m ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/10 bg-black/30 text-white/60"}`}>{m}</button>
          ))}
        </div>
        {pay === "card" && <label className="block text-xs text-white/60">Card approval / receipt number<input value={paymentReference} onChange={(e)=>setPaymentReference(e.target.value)} placeholder="Required for card payment" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white" /></label>}
        {pay === "cash" && <div className="grid grid-cols-2 gap-2"><label className="block text-xs text-white/60">Cash received<input type="number" min={0} value={cashReceived} onChange={(e)=>setCashReceived(e.target.value)} placeholder="Required" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white" /></label><div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3"><p className="text-[11px] text-white/50">Change</p><p className="font-extrabold text-emerald-300">{rp(Math.max(0,Number(cashReceived||0)-Math.max(0,cartItems.reduce((s,x)=>s+Number(x.price)*Number(x.qty),0)-discount)))}</p></div></div>}
        <p className="text-[11px] text-white/40 text-center">The receipt appears after payment. Printing follows the admin setting.</p>
      </div>
      {receiptResult && <ReceiptPreview order={receiptResult.order} meta={receiptResult.receipt} onDone={()=>setReceiptResult(null)} />}
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
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [q, setQ] = useState("");
  const { data: products = [] } = useProducts();
  const { data: kept = [] } = useQuery<any[]>({
    queryKey: ["/api/reborn/pos/bottle-keeps", q],
    queryFn: () => apiRequest("GET", `/api/reborn/pos/bottle-keeps${q ? "?q=" + encodeURIComponent(q) : ""}`).then((r) => r.json()),
    refetchInterval: 20000,
  });
  const { data: memberMatches = [] } = useQuery<any[]>({
    queryKey: ["/api/reborn/pos/members", f.memberCode],
    queryFn: () => apiRequest("GET", `/api/reborn/pos/members?q=${encodeURIComponent(f.memberCode)}`).then((r) => r.json()),
    enabled: f.memberCode.trim().length >= 1 && !selectedMember,
  });
  const store = useMutation({
    mutationFn: () => post("/api/reborn/pos/bottle-keep", f),
    onSuccess: (d) => { toast({ title: d.message }); setF({ memberCode: "", type: "beer", name: "", quantity: 1, photoUrl: "", note: "" }); setSelectedMember(null); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/bottle-keeps"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const collect = useMutation({
    mutationFn: (id: number) => post(`/api/reborn/pos/bottle-keeps/${id}/collect`, {}),
    onSuccess: (d) => { toast({ title: d.message }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/bottle-keeps"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const inp = "w-full px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm";
  const drinks = products.filter((p)=>isDrink(p.category,p.name));
  const drinkTypes = Array.from(new Set(drinks.map((p)=>bottleType(p.category,p.name))));
  const drinksForType = drinks.filter((p)=>bottleType(p.category,p.name)===f.type);
  useEffect(()=>{ if(drinkTypes.length && !drinkTypes.includes(f.type)) setF((current)=>({...current,type:drinkTypes[0],name:"",photoUrl:""})); },[drinkTypes.join("|"),f.type]);
  return (
    <div className="lg:grid lg:grid-cols-[360px_1fr] lg:gap-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 mb-4 lg:mb-0 h-fit">
        <p className="font-bold mb-2 text-sm flex items-center gap-2"><Wine className="w-4 h-4 text-amber-300" /> Keep a bottle</p>
        <div className="relative mb-2"><input value={f.memberCode} onChange={(e) => { setSelectedMember(null); setF({ ...f, memberCode: e.target.value }); }} placeholder="Type name, code, card or email" className={inp} />
          {!selectedMember && memberMatches.length > 0 && <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-white/15 bg-[#160f2a] p-1 shadow-2xl">{memberMatches.map((m)=><button key={m.id} type="button" onClick={()=>{setSelectedMember(m);setF({...f,memberCode:m.code||m.card||m.email})}} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10"><b className="block text-sm">{m.name}</b><span className="text-xs text-white/50">{m.code||m.card||m.email}</span></button>)}</div>}
        </div>
        {selectedMember && <div className="mb-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-2 text-sm text-emerald-200"><UserCheck className="mr-1 inline h-4 w-4"/> {selectedMember.name}</div>}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value, name: "", photoUrl: "" })} className={inp}>
            {drinkTypes.map((type)=><option key={type} value={type}>{type === "whisky" ? "Whisky / spirits" : type.charAt(0).toUpperCase()+type.slice(1)}</option>)}
          </select>
          <input type="number" min={1} value={f.quantity} onChange={(e) => setF({ ...f, quantity: Number(e.target.value) })} placeholder="Qty" className={inp} />
        </div>
        <select value={f.name} onChange={(e) => { const p=products.find((x)=>x.name===e.target.value); setF({ ...f, name:e.target.value, type:bottleType(p?.category,e.target.value) }); }} className={inp + " mb-2"}>
          <option value="">Select drink from products</option>
          {drinksForType.map((p)=><option key={p.id} value={p.name}>{p.name} · {p.category}</option>)}
        </select>
        {(f.type === "wine" || f.type === "whisky") && (
          <div className="mb-2"><p className="text-xs text-white/50 mb-1">Photo of remaining level (required)</p><ImageUpload value={f.photoUrl} onChange={(v) => setF({ ...f, photoUrl: v })} label="Take / upload photo" /></div>
        )}
        <input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Note (optional)" className={inp + " mb-2"} />
        <button onClick={() => store.mutate()} disabled={store.isPending || !f.name.trim() || !f.memberCode.trim() || ((f.type === "wine" || f.type === "whisky") && !f.photoUrl)} className="w-full py-2.5 rounded-xl font-bold text-black disabled:opacity-50" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>Keep bottle (30 days)</button>
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

function ReceiptPreview({ order, meta, onDone }: { order: any; meta: any; onDone: () => void }) {
  const { toast } = useToast();
  const paidAt = new Date(order.paidAt || order.createdAt || Date.now()).toLocaleString();
  const print = () => {
    if (!printReceipt(order, meta || {})) toast({ title: "Receipt ready", description: "Use Print from a counter computer or your phone's share/print menu." });
  };
  return <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
    <div className="relative mx-auto my-4 w-full max-w-sm rounded-3xl border border-white/15 bg-[#f7f2e8] p-5 text-black shadow-2xl">
      <button onClick={onDone} aria-label="Close receipt" className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/10"><X className="h-5 w-5"/></button>
      <div className="text-center">
        {meta?.logoUrl && <img src={meta.logoUrl} alt="" className="mx-auto mb-2 max-h-16 max-w-32 object-contain" />}
        <h2 className="text-xl font-black">{meta?.clubName || "Reborn Wave Group"}</h2>
        <span className="mt-2 inline-block border-2 border-black px-3 py-1 text-xs font-black">{order.orderMode === "take_away" ? "TAKE AWAY" : "DINE IN"}</span>
      </div>
      <div className="my-4 border-t border-dashed border-black/50" />
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4"><span>Order</span><b>{order.orderNo}</b></div>
        {order.tableNumber && <div className="flex justify-between gap-4"><span>Table</span><span>{order.tableNumber}</span></div>}
        {order.memberName && <div className="flex justify-between gap-4"><span>Member</span><span className="text-right">{order.memberName}</span></div>}
        {order.salesStaffName && <div className="flex justify-between gap-4"><span>Served by</span><span className="text-right">{order.salesStaffName}</span></div>}
        <div className="flex justify-between gap-4"><span>Date</span><span className="text-right">{paidAt}</span></div>
      </div>
      <div className="my-4 border-t border-dashed border-black/50" />
      <div className="space-y-2 text-sm">{(order.items || []).filter((x:any)=>x.status!=="rejected").map((item:any)=><div key={item.id || `${item.name}-${item.qty}`} className="flex justify-between gap-3"><span>{item.qty}× {item.name}</span><span>{rp(Number(item.lineTotal ?? item.price * item.qty))}</span></div>)}</div>
      <div className="my-4 border-t border-dashed border-black/50" />
      <div className="space-y-1 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>{rp(Number(order.subtotal ?? order.total))}</span></div>
        {Number(order.discount)>0 && <div className="flex justify-between"><span>Discount</span><span>- {rp(Number(order.discount))}</span></div>}
        {Number(order.tax)>0 && <div className="flex justify-between"><span>Tax</span><span>{rp(Number(order.tax))}</span></div>}
        <div className="flex justify-between text-lg font-black"><span>TOTAL</span><span>{rp(Number(order.total))}</span></div>
        <div className="flex justify-between"><span>Paid</span><b>{String(order.paymentMethod || "").toUpperCase()}</b></div>
        {order.paymentReference && <div className="flex justify-between gap-3"><span>Card / receipt ref.</span><b className="text-right">{order.paymentReference}</b></div>}
        {order.paymentMethod === "cash" && <><div className="flex justify-between"><span>Cash received</span><b>{rp(Number(order.cashReceived))}</b></div><div className="flex justify-between"><span>Change</span><b>{rp(Number(order.changeGiven))}</b></div></>}
      </div>
      <p className="mt-4 border-t border-dashed border-black/50 pt-4 text-center text-xs">{meta?.footer || "Thank you!"}</p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button onClick={print} className="flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 font-bold text-white"><Printer className="h-4 w-4"/> Print</button>
        <button onClick={onDone} className="rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white">Done</button>
      </div>
    </div>
  </div>;
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
