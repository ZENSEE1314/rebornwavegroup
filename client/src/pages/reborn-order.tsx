import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RebornLayout } from "@/components/RebornLayout";
import { Plus, Minus, ShoppingCart, Utensils, Clock } from "lucide-react";

interface Product { id: number; name: string; category: string; price: string; stock: number; imageUrl?: string; soldOut?: boolean; }

const rp = (n: number) => "RP " + (n || 0).toLocaleString("en-US");

export default function RebornOrder() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [cart, setCart] = useState<Record<number, number>>({});
  const [table, setTable] = useState("");

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/reborn/shop/products"],
    queryFn: () => apiRequest("GET", "/api/reborn/shop/products").then((r) => r.json()),
  });
  const { data: myOrders = [] } = useQuery<any[]>({
    queryKey: ["/api/reborn/shop/my-orders"],
    queryFn: () => apiRequest("GET", "/api/reborn/shop/my-orders").then((r) => r.json()),
    refetchInterval: 15000,
  });

  const categories = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    for (const p of products) (groups[p.category] ||= []).push(p);
    return groups;
  }, [products]);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const lines = Object.entries(cart).filter(([, q]) => q > 0);
  const total = lines.reduce((s, [id, q]) => s + Number(byId.get(Number(id))?.price || 0) * q, 0);

  const add = (id: number) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const sub = (id: number) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) - 1) }));

  const place = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/shop/order", {
      tableNumber: table,
      items: lines.map(([id, q]) => ({ productId: Number(id), qty: q })),
    }).then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
    onSuccess: ({ ok, d }) => {
      if (!ok) { toast({ title: "Couldn't order", description: d.message, variant: "destructive" }); return; }
      toast({ title: "Order sent 🎉", description: d.message });
      setCart({});
      qc.invalidateQueries({ queryKey: ["/api/reborn/shop/my-orders"] });
      qc.invalidateQueries({ queryKey: ["/api/reborn/shop/products"] });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <RebornLayout active="/order" title="ORDER">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(78,205,196,0.15)", color: "#4ecdc4" }}><Utensils className="w-5 h-5" /></span>
        <div><h1 className="text-xl font-extrabold leading-none">Order to your table</h1><p className="text-sm text-white/50">Pay at the table — cash or card</p></div>
      </div>

      {myOrders.filter((o) => o.status === "open").length > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-3">
          {myOrders.filter((o) => o.status === "open").map((o) => (
            <div key={o.id} className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-amber-300" />
              <span>Order <b>{o.orderNo}</b> · Table {o.tableNumber} · {rp(Number(o.total))} — being served</span>
            </div>
          ))}
        </div>
      )}

      {Object.entries(categories).map(([cat, items]) => (
        <div key={cat} className="mb-5">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-2 px-1">{cat}</h2>
          <div className="space-y-2">
            {items.map((p) => (
              <div key={p.id} className={`flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 ${p.soldOut ? "opacity-50" : ""}`}>
                {p.imageUrl
                  ? <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded-xl object-cover" />
                  : <span className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-lg">🍸</span>}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{p.name}</p>
                  <p className="text-sm text-amber-300">{rp(Number(p.price))}{p.soldOut && <span className="text-red-400 ml-2">Sold out</span>}</p>
                </div>
                {p.soldOut ? null : (cart[p.id] || 0) > 0 ? (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => sub(p.id)} style={{ width: 36, height: 36 }} className="rounded-full bg-white/15 text-white flex items-center justify-center text-2xl leading-none font-bold flex-shrink-0">−</button>
                    <span style={{ minWidth: 20 }} className="text-center font-bold">{cart[p.id]}</span>
                    <button onClick={() => add(p.id)} style={{ width: 36, height: 36 }} className="rounded-full bg-amber-400 text-black flex items-center justify-center text-2xl leading-none font-bold flex-shrink-0">+</button>
                  </div>
                ) : (
                  <button onClick={() => add(p.id)} className="px-4 py-2 rounded-xl bg-amber-400 text-black font-semibold text-sm flex-shrink-0">Add</button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      {products.length === 0 && <p className="text-center text-white/40 py-10">Menu coming soon.</p>}

      {/* Cart bar */}
      {lines.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-30 px-4">
          <div className="max-w-2xl mx-auto rounded-2xl border border-amber-400/30 bg-[#160f2a] p-3 shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="w-4 h-4 text-amber-300" />
              <span className="text-sm font-bold">{lines.reduce((s, [, q]) => s + q, 0)} items</span>
              <span className="ml-auto font-extrabold text-amber-300">{rp(total)}</span>
            </div>
            <input value={table} onChange={(e) => setTable(e.target.value)} placeholder="Your table number"
              className="w-full px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white mb-2 text-sm" />
            <button onClick={() => place.mutate()} disabled={place.isPending || !table.trim()}
              className="w-full py-3 rounded-xl font-bold text-black disabled:opacity-50" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>
              Send order to table
            </button>
          </div>
        </div>
      )}
    </RebornLayout>
  );
}
