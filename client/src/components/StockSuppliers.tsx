import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { moneySymbol } from "@/lib/money";

interface Layer { supplier: string; unitCost: number; qty: number; isOpening: boolean }
interface Layers { stock: number; stockValue: number; layers: Layer[] }
interface Product { id: number; name: string }

// "Stock by supplier and price (oldest first)" for one item, and "same item as…" to merge a duplicate into it.
export default function StockSuppliers({ p }: { p: Product }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [intoId, setIntoId] = useState("");
  const { data } = useQuery<Layers>({ queryKey: ["/api/reborn/admin/pos/products", p.id, "layers"], enabled: isOpen, queryFn: () => apiRequest("GET", `/api/reborn/admin/pos/products/${p.id}/layers`).then((r) => r.json()) });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/reborn/pos/products"], enabled: isOpen, queryFn: () => apiRequest("GET", "/api/reborn/pos/products").then((r) => r.json()) });
  const merge = useMutation({
    mutationFn: () => apiRequest("POST", `/api/reborn/admin/pos/products/${p.id}/merge`, { intoId: Number(intoId) }).then((r) => r.json()),
    onSuccess: () => { toast({ title: t("admin.lay.merged") }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/inventory"] }); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: String(e.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" }),
  });
  const others = products.filter((item) => item.id !== p.id).sort((a, b) => Number(b.name.toLowerCase().startsWith(p.name.toLowerCase().slice(0, 4))) - Number(a.name.toLowerCase().startsWith(p.name.toLowerCase().slice(0, 4))) || a.name.localeCompare(b.name));
  return (
    <div className="mt-2 border-t border-white/10 pt-2">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="text-xs font-semibold text-cyan-200">{t("admin.lay.title")} {isOpen ? "▲" : "▼"}</button>
      {isOpen && (
        <div className="mt-2 space-y-2 text-xs">
          <p className="text-white/40">{t("admin.lay.hint")}</p>
          <ul className="space-y-1">
            {(data?.layers || []).map((layer, i) => (
              <li key={i} className="rounded-lg bg-black/20 border border-white/10 px-2 py-1.5">{t("admin.lay.line", { supplier: layer.isOpening ? `${layer.supplier || "—"} (${t("admin.lay.opening")})` : layer.supplier || "—", cost: `${moneySymbol()} ${Math.round(layer.unitCost).toLocaleString()}`, qty: String(layer.qty) })}</li>
            ))}
          </ul>
          <div className="space-y-1">
            <p className="text-white/50">{t("admin.lay.merge")}</p>
            <div className="flex flex-wrap gap-2">
              <select value={intoId} onChange={(event) => setIntoId(event.target.value)} className="min-w-0 flex-1 rounded-lg bg-black/30 border border-white/15 px-2 py-2 text-sm">
                <option value="" />
                {others.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <button type="button" onClick={() => merge.mutate()} disabled={!intoId || merge.isPending} className="min-h-[40px] px-3 rounded-lg text-xs font-bold bg-white/10 border border-white/15 disabled:opacity-40">{t("admin.lay.mergeDo")}</button>
            </div>
            <p className="text-white/35">{t("admin.lay.mergeHint")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
