import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RebornLayout } from "@/components/RebornLayout";
import { Plus, Minus, Trash2, UserCheck, X, Store, Search, PackagePlus, Receipt, LayoutGrid, ChevronLeft } from "lucide-react";

interface Product { id: number; name: string; category: string; price: string; stock: number; }
interface Order { id: number; orderNo: string; tableNumber?: string; memberName?: string; memberCode?: string; total: string; source: string; items?: any[]; }
type Tab = "tables" | "sell" | "stock";
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

export default function RebornPos() {
  const [, navigate] = useLocation();
  const { user, isLoading } = useAuth();
  const role = (user as any)?.role;
  const isStaff = role === "admin" || role === "staff";
  const [tab, setTab] = useState<Tab>("tables");

  if (!isLoading && !isStaff) {
    return <RebornLayout active="/pos" title="POS"><div className="text-center py-16 text-white/50">Staff only. <button className="text-amber-300 underline" onClick={() => navigate("/")}>Go home</button></div></RebornLayout>;
  }
  return (
    <RebornLayout active="/pos" title="POS">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c" }}><Store className="w-5 h-5" /></span>
        <h1 className="text-xl font-extrabold">Point of Sale</h1>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {([["tables", "Tables", <LayoutGrid className="w-4 h-4" />], ["sell", "Quick sale", <Receipt className="w-4 h-4" />], ["stock", "Stock", <PackagePlus className="w-4 h-4" />]] as const).map(([k, l, ic]) => (
          <button key={k} onClick={() => setTab(k as Tab)} className={`py-2.5 rounded-xl border font-semibold text-sm flex items-center justify-center gap-1.5 ${tab === k ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/10 bg-white/5 text-white/60"}`}>{ic}{l}</button>
        ))}
      </div>
      {tab === "tables" && <TablesTab />}
      {tab === "sell" && <QuickSaleTab />}
      {tab === "stock" && <StockTab />}
    </RebornLayout>
  );
}

// ── Product picker: builds a pending cart, calls onCommit(items) ─────────────
function ProductPicker({ label, onCommit, busy }: { label: string; onCommit: (items: any[]) => void; busy?: boolean }) {
  const { data: products = [] } = useProducts();
  const [cart, setCart] = useState<Record<number, number>>({});
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const lines = Object.entries(cart).filter(([, q]) => q > 0);
  const total = lines.reduce((s, [id, q]) => s + Number(byId.get(Number(id))?.price || 0) * q, 0);
  const add = (id: number) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const sub = (id: number) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) - 1) }));
  const commit = () => { onCommit(lines.map(([id, q]) => { const p = byId.get(Number(id))!; return { productId: p.id, name: p.name, price: Number(p.price), qty: q }; })); setCart({}); };
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {products.map((p) => (
          <button key={p.id} onClick={() => add(p.id)} disabled={p.stock <= 0} className="p-3 rounded-2xl border border-white/10 bg-white/5 text-left active:scale-95 transition-all disabled:opacity-40 relative">
            <p className="text-sm font-semibold leading-tight line-clamp-2">{p.name}</p>
            <p className="text-xs text-amber-300 mt-1">{rp(Number(p.price))}</p>
            <p className="text-[10px] text-white/40">stock {p.stock}</p>
            {(cart[p.id] || 0) > 0 && <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-amber-400 text-black text-xs font-bold flex items-center justify-center">{cart[p.id]}</span>}
          </button>
        ))}
      </div>
      {products.length === 0 && <p className="text-center text-white/40 py-6 text-sm">No products yet — add them in Admin › Products.</p>}
      {lines.length > 0 && (
        <div className="rounded-2xl border border-amber-400/30 bg-[#160f2a] p-3 mb-3">
          {lines.map(([id, q]) => {
            const p = byId.get(Number(id))!;
            return (
              <div key={id} className="flex items-center gap-2 py-1.5">
                <span className="flex-1 text-sm">{p.name}</span>
                <button onClick={() => sub(Number(id))} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center"><Minus className="w-3.5 h-3.5" /></button>
                <span className="w-5 text-center text-sm font-bold">{q}</span>
                <button onClick={() => add(Number(id))} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
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

// ── Tables: open tickets / running tabs ─────────────────────────────────────
function TablesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<number | null>(null);
  const [table, setTable] = useState("");
  const [code, setCode] = useState("");
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/reborn/pos/orders"],
    queryFn: () => apiRequest("GET", "/api/reborn/pos/orders?status=open").then((r) => r.json()),
    refetchInterval: 8000,
  });
  const openTicket = useMutation({
    mutationFn: () => post("/api/reborn/pos/orders", { tableNumber: table, memberCode: code || undefined }),
    onSuccess: (d) => { toast({ title: d.message }); setTable(""); setCode(""); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/orders"] }); setOpenId(d.order.id); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const active = orders.find((o) => o.id === openId);
  if (openId && active) return <TicketDetail order={active} onBack={() => setOpenId(null)} />;

  return (
    <div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 mb-4">
        <p className="font-bold mb-2 text-sm">Open a new table ticket</p>
        <input value={table} onChange={(e) => setTable(e.target.value)} placeholder="Table number" className="w-full px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm mb-2" />
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Member code / email (optional)" className="w-full px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm mb-2" />
        <button onClick={() => openTicket.mutate()} disabled={!table.trim() || openTicket.isPending} className="w-full py-2.5 rounded-xl font-bold text-black disabled:opacity-50" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>Open ticket</button>
      </div>
      <p className="text-xs text-white/40 px-1 mb-2">Open tickets — tap to add items or take payment</p>
      <div className="grid grid-cols-2 gap-2">
        {orders.map((o) => (
          <button key={o.id} onClick={() => setOpenId(o.id)} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-left active:scale-95 transition-all">
            <p className="font-extrabold">Table {o.tableNumber || "—"}</p>
            <p className="text-xs text-white/50 truncate">{o.memberName || "Walk-in"}{o.source === "app" ? " · app" : ""}</p>
            <p className="text-amber-300 font-bold mt-1">{rp(Number(o.total))}</p>
          </button>
        ))}
      </div>
      {orders.length === 0 && <p className="text-center text-white/40 py-8 text-sm">No open tickets. Open one above, or member app orders will appear here.</p>}
    </div>
  );
}

function TicketDetail({ order, onBack }: { order: Order; onBack: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [pay, setPay] = useState<"cash" | "card">("cash");
  const [code, setCode] = useState("");
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
    mutationFn: () => post(`/api/reborn/pos/orders/${order.id}/pay`, { paymentMethod: pay }),
    onSuccess: (d) => { toast({ title: "Paid", description: d.message }); invalidate(); onBack(); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const cancel = useMutation({
    mutationFn: () => post(`/api/reborn/pos/orders/${order.id}/cancel`),
    onSuccess: (d) => { toast({ title: d.message }); invalidate(); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); onBack(); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const total = Number(order.total);
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-white/60 text-sm mb-3"><ChevronLeft className="w-4 h-4" /> All tables</button>
      <div className="rounded-2xl border border-amber-400/30 bg-white/5 p-4 mb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xl font-extrabold">Table {order.tableNumber || "—"}</p>
            <p className="text-xs text-white/50">{order.orderNo} · {order.memberName || "no member"}</p>
          </div>
          <span className="text-xl font-extrabold text-amber-300">{rp(total)}</span>
        </div>
        {order.items && order.items.length > 0 && (
          <div className="mt-3 border-t border-white/10 pt-2 text-sm text-white/70">
            {order.items.map((it: any) => <div key={it.id} className="flex justify-between py-0.5"><span>{it.qty}× {it.name}</span><span>{rp(Number(it.lineTotal))}</span></div>)}
          </div>
        )}
        {!order.memberName && (
          <div className="flex gap-2 mt-3">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Tag member (code/email)" className="flex-1 px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm" />
            <button onClick={() => tagMember.mutate()} disabled={!code.trim() || tagMember.isPending} className="px-4 rounded-xl bg-white/10 disabled:opacity-50"><UserCheck className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      <p className="text-xs text-white/40 px-1 mb-2">Add items</p>
      <ProductPicker label="Add to ticket" busy={addItems.isPending} onCommit={(items) => addItems.mutate(items)} />

      <div className="rounded-2xl border border-white/10 bg-[#160f2a] p-3 mt-2">
        <p className="font-bold text-sm mb-2">Take payment · {rp(total)}</p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {(["cash", "card"] as const).map((m) => (
            <button key={m} onClick={() => setPay(m)} className={`py-2.5 rounded-xl border font-semibold text-sm capitalize ${pay === m ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/10 bg-black/30 text-white/60"}`}>{m}</button>
          ))}
        </div>
        <button onClick={() => payNow.mutate()} disabled={payNow.isPending || total <= 0} className="w-full py-3 rounded-xl font-bold text-black disabled:opacity-50" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>Charge {rp(total)} {pay}</button>
        <button onClick={() => { if (confirm("Cancel this ticket and restore stock?")) cancel.mutate(); }} disabled={cancel.isPending} className="w-full py-2.5 rounded-xl text-red-300 text-sm mt-2 border border-red-400/30 bg-red-500/10">Cancel ticket</button>
      </div>
    </div>
  );
}

// ── Quick sale: open + fill + pay in one step (bar / walk-in) ───────────────
function QuickSaleTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [member, setMember] = useState<any>(null);
  const [pay, setPay] = useState<"cash" | "card">("cash");
  const lookup = useMutation({
    mutationFn: () => apiRequest("GET", `/api/reborn/pos/member/${encodeURIComponent(code.trim())}`).then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
    onSuccess: ({ ok, d }) => { if (ok) { setMember(d); toast({ title: "Member found", description: d.name }); } else toast({ title: "Not found", description: d.message, variant: "destructive" }); },
  });
  const sell = useMutation({
    mutationFn: (items: any[]) => post("/api/reborn/pos/sale", { memberCode: member?.code || undefined, paymentMethod: pay, items }),
    onSuccess: (d) => { toast({ title: "Sale complete", description: d.message }); setMember(null); setCode(""); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  return (
    <div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 mb-3">
        {member ? (
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            <div className="flex-1"><p className="font-semibold text-sm">{member.name}</p><p className="text-xs text-white/50">{member.code} · {member.loyaltyPoints} pts</p></div>
            <button onClick={() => setMember(null)} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Member code / email (optional)" className="flex-1 px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm" />
            <button onClick={() => lookup.mutate()} disabled={!code.trim() || lookup.isPending} className="px-4 rounded-xl bg-white/10 disabled:opacity-50"><Search className="w-4 h-4" /></button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {(["cash", "card"] as const).map((m) => (
          <button key={m} onClick={() => setPay(m)} className={`py-2.5 rounded-xl border font-semibold text-sm capitalize ${pay === m ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/10 bg-black/30 text-white/60"}`}>{m}</button>
        ))}
      </div>
      <ProductPicker label={`Charge ${pay}`} busy={sell.isPending} onCommit={(items) => sell.mutate(items)} />
    </div>
  );
}

// ── Stock ───────────────────────────────────────────────────────────────────
function StockTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [sel, setSel] = useState<number | null>(null);
  const [qty, setQty] = useState(10);
  const [unitCost, setUnitCost] = useState(0);
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/reborn/pos/stock"], queryFn: () => apiRequest("GET", "/api/reborn/pos/stock").then((r) => r.json()) });
  const stockIn = useMutation({
    mutationFn: () => post("/api/reborn/pos/stock-in", { productId: sel, qty, unitCost }),
    onSuccess: (d) => { toast({ title: "Stock updated", description: d.message }); setSel(null); setQty(10); setUnitCost(0); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/stock"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  return (
    <div className="space-y-2">
      {products.map((p) => (
        <div key={p.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between">
            <div><p className="font-semibold text-sm">{p.name}</p><p className={`text-xs ${p.stock <= 5 ? "text-red-400" : "text-white/50"}`}>stock {p.stock}{p.stock <= 5 ? " · low!" : ""}</p></div>
            <button onClick={() => setSel(sel === p.id ? null : p.id)} className="px-3 py-2 rounded-xl bg-white/10 text-sm font-semibold flex items-center gap-1"><PackagePlus className="w-4 h-4" /> Stock in</button>
          </div>
          {sel === p.id && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div><label className="text-[11px] text-white/50">Qty to add</label><input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm" /></div>
              <div><label className="text-[11px] text-white/50">Unit cost (RP)</label><input type="number" value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm" /></div>
              <button onClick={() => stockIn.mutate()} disabled={stockIn.isPending || qty === 0} className="col-span-2 py-2.5 rounded-xl font-bold text-black disabled:opacity-50" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>Add {qty} · cost {rp(qty * unitCost)}</button>
            </div>
          )}
        </div>
      ))}
      {products.length === 0 && <p className="text-center text-white/40 py-10 text-sm">No products yet. Add them in Admin › Products.</p>}
    </div>
  );
}
