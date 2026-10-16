// Admin › Inventory › an item › its bundles ("6 together") and its member packages ("6 uses"). They are made here, on the item itself, so each one
// is tied to that one inventory item and its stock; one item can have as many bundles and packages as wanted.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { money } from "@/lib/money";

const inp = "rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-sm text-white outline-none focus:border-amber-300";
const MIN_BUNDLE_QTY = 2;

interface Piece { id: number; name: string; category: string; department?: string | null; imageUrl?: string | null; price: string; recommended?: boolean; bundleItemId?: number | null; bundleQty?: number | null; packageKind?: string | null; packageUses?: number | null; packageCredit?: string | null; packageItemIds?: string | null }

const idsOf = (raw?: string | null): number[] => { try { const ids = JSON.parse(raw || "[]"); return Array.isArray(ids) ? ids.map(Number) : []; } catch { return []; } };

export function PieceRow({ piece, onChanged }: { piece: Piece; onChanged: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [name, setName] = useState(piece.name);
  const [price, setPrice] = useState(String(Number(piece.price) || 0));
  const [isStarred, setIsStarred] = useState(!!piece.recommended);
  const [isAsking, setIsAsking] = useState(false);
  const isDirty = name !== piece.name || Number(price) !== Number(piece.price) || isStarred !== !!piece.recommended;
  const fail = (e: any) => toast({ title: t("admin.c.failed"), description: String(e.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" });
  const save = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/reborn/admin/pos/products/${piece.id}`, { name, price: Number(price), recommended: isStarred }).then((r) => r.json()),
    onSuccess: () => { toast({ title: t("admin.c.saved") }); onChanged(); }, onError: fail,
  });
  const remove = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/reborn/admin/pos/products/${piece.id}`).then((r) => r.json()),
    onSuccess: () => { toast({ title: t("admin.c.deleted") }); onChanged(); }, onError: fail,
  });
  const size = piece.packageKind === "credit" ? t("admin.ib.creditSize", { v: money(Number(piece.packageCredit) || 0) }) : piece.bundleItemId ? t("admin.ib.together", { n: piece.bundleQty || 0 }) : t("admin.ib.uses", { n: piece.packageUses || 1 });
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2">
      <button type="button" onClick={() => setIsStarred(!isStarred)} aria-pressed={isStarred} title={t("admin.prod.recommend")} aria-label={t("admin.prod.recommend")} className="min-h-0 p-0 text-lg leading-none">{isStarred ? "⭐" : "☆"}</button>
      <input value={name} onChange={(e) => setName(e.target.value)} aria-label={t("admin.prod.name")} className={inp + " min-w-0 flex-1"} />
      <span className="rounded-lg bg-white/10 px-2 py-1 text-[11px] font-semibold text-amber-200">{size}</span>
      <input type="number" inputMode="numeric" value={price} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setPrice(e.target.value)} aria-label={t("admin.prod.sellPrice")} className={inp + " w-28"} />
      <button type="button" onClick={() => save.mutate()} disabled={!isDirty || save.isPending} className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-black disabled:opacity-40">{t("admin.c.save")}</button>
      {isAsking
        ? <button type="button" onClick={() => remove.mutate()} disabled={remove.isPending} className="rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white">{t("admin.ib.sure")}</button>
        : <button type="button" onClick={() => setIsAsking(true)} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-red-300">{t("admin.c.delete")}</button>}
    </div>
  );
}

export function ItemBundles({ p }: { p: { id: number; name: string; category: string; department?: string | null; imageUrl?: string | null } }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const { data: all = [] } = useQuery<Piece[]>({ queryKey: ["/api/reborn/pos/products"], queryFn: () => apiRequest("GET", "/api/reborn/pos/products").then((r) => r.json()), enabled: isOpen });
  const bundles = all.filter((x) => x.bundleItemId === p.id);
  const packages = all.filter((x) => x.packageKind === "uses" && idsOf(x.packageItemIds).includes(p.id));
  const [bundle, setBundle] = useState({ qty: "6", price: "" });
  const [pack, setPack] = useState({ uses: "6", days: "", price: "" });
  const changed = () => { qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/inventory"] }); };
  const fail = (e: any) => toast({ title: t("admin.c.failed"), description: String(e.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" });
  const base = { category: p.category, department: p.department || "", imageUrl: p.imageUrl || "", active: true, posVisible: true };
  const addBundle = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/pos/products", { ...base, name: `${p.name} ×${bundle.qty}`, price: Number(bundle.price), bundleItemId: p.id, bundleQty: Number(bundle.qty) }).then((r) => r.json()),
    onSuccess: () => { toast({ title: t("admin.prod.added") }); setBundle({ ...bundle, price: "" }); changed(); }, onError: fail,
  });
  const addPackage = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/pos/products", { ...base, name: `${p.name} ${t("admin.ib.packageWord")} ×${pack.uses}`, price: Number(pack.price), packageKind: "uses", packageUses: Number(pack.uses), packageItemIds: [p.id], packageValidDays: pack.days ? Number(pack.days) : "" }).then((r) => r.json()),
    onSuccess: () => { toast({ title: t("admin.prod.added") }); setPack({ ...pack, price: "" }); changed(); }, onError: fail,
  });
  const canAddBundle = Number(bundle.qty) >= MIN_BUNDLE_QTY && Number(bundle.price) > 0;
  const canAddPackage = Number(pack.uses) >= 1 && Number(pack.price) > 0;
  return (
    <div className="mt-3 border-t border-white/10 pt-2">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="min-h-0 p-0 text-left text-cyan-200" style={{ fontSize: 12, fontWeight: 600 }}>🍺 {t("admin.ib.title")} {isOpen ? "▲" : "▼"}</button>
      {isOpen && (
        <div className="mt-2 space-y-4">
          <section className="space-y-2">
            <p className="text-xs font-bold">{t("admin.ib.bundles")}</p>
            <p className="text-[11px] text-white/45">{t("admin.ib.bundleHint")}</p>
            {bundles.map((piece) => <PieceRow key={piece.id} piece={piece} onChanged={changed} />)}
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-[11px] text-white/50">{t("admin.bundle.qty")}<input type="number" inputMode="numeric" min={MIN_BUNDLE_QTY} value={bundle.qty} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setBundle({ ...bundle, qty: e.target.value })} className={inp + " mt-0.5 block w-24"} /></label>
              <label className="text-[11px] text-white/50">{t("admin.ib.bundlePrice")}<input type="number" inputMode="numeric" value={bundle.price} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setBundle({ ...bundle, price: e.target.value })} className={inp + " mt-0.5 block w-32"} /></label>
              <button type="button" onClick={() => addBundle.mutate()} disabled={!canAddBundle || addBundle.isPending} className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-black disabled:opacity-40">+ {t("admin.ib.addBundle")}</button>
            </div>
            {canAddBundle && <p className="text-[11px] text-white/40">{t("admin.ib.perUnit", { v: money(Number(bundle.price) / Number(bundle.qty)) })}</p>}
          </section>
          <section className="space-y-2">
            <p className="text-xs font-bold">{t("admin.ib.packages")}</p>
            <p className="text-[11px] text-white/45">{t("admin.ib.packageHint")}</p>
            {packages.map((piece) => <PieceRow key={piece.id} piece={piece} onChanged={changed} />)}
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-[11px] text-white/50">{t("admin.pkg.usesN")}<input type="number" inputMode="numeric" min={1} value={pack.uses} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setPack({ ...pack, uses: e.target.value })} className={inp + " mt-0.5 block w-24"} /></label>
              <label className="text-[11px] text-white/50">{t("admin.pkg.validDays")}<input type="number" inputMode="numeric" min={0} value={pack.days} placeholder={t("admin.pkg.never")} onChange={(e) => setPack({ ...pack, days: e.target.value })} className={inp + " mt-0.5 block w-28"} /></label>
              <label className="text-[11px] text-white/50">{t("admin.ib.bundlePrice")}<input type="number" inputMode="numeric" value={pack.price} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setPack({ ...pack, price: e.target.value })} className={inp + " mt-0.5 block w-32"} /></label>
              <button type="button" onClick={() => addPackage.mutate()} disabled={!canAddPackage || addPackage.isPending} className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-black disabled:opacity-40">+ {t("admin.ib.addPackage")}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

// Prepaid credit packages ("pay 5,000,000, get 10,000,000 to spend"): not tied to one item, so they are made here at the top of Inventory.
export function CreditPackages() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const { data: all = [] } = useQuery<Piece[]>({ queryKey: ["/api/reborn/pos/products"], queryFn: () => apiRequest("GET", "/api/reborn/pos/products").then((r) => r.json()), enabled: isOpen });
  const credits = all.filter((x) => x.packageKind === "credit");
  const [f, setF] = useState({ name: "", price: "", credit: "", days: "", perkPct: "", perkDays: "" });
  const changed = () => qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] });
  const add = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/pos/products", { name: f.name.trim(), category: "Packages", price: Number(f.price), packageKind: "credit", packageCredit: Number(f.credit), packageValidDays: f.days ? Number(f.days) : "", perkPercent: f.perkPct ? Number(f.perkPct) : "", perkDays: f.perkDays ? Number(f.perkDays) : "", active: true, posVisible: true }).then((r) => r.json()),
    onSuccess: () => { toast({ title: t("admin.prod.added") }); setF({ name: "", price: "", credit: "", days: "", perkPct: "", perkDays: "" }); changed(); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: String(e.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" }),
  });
  const can = f.name.trim() !== "" && Number(f.price) > 0 && Number(f.credit) > 0;
  const field = (key: keyof typeof f, label: string, width: string, isText = false) => (
    <label className="text-[11px] text-white/50">{label}<input type={isText ? "text" : "number"} inputMode={isText ? undefined : "numeric"} value={f[key]} onFocus={isText ? undefined : (e) => e.currentTarget.select()} onChange={(e) => setF({ ...f, [key]: e.target.value })} className={inp + " mt-0.5 block " + width} /></label>
  );
  return (
    <div className="mb-3 rounded-2xl border border-white/10 bg-white/5 p-3">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="min-h-0 p-0 text-left text-cyan-200" style={{ fontSize: 13, fontWeight: 700 }}>💳 {t("admin.ib.creditTitle")} {isOpen ? "▲" : "▼"}</button>
      {isOpen && (
        <div className="mt-2 space-y-2">
          <p className="text-[11px] text-white/45">{t("admin.ib.creditHint")}</p>
          {credits.map((piece) => <PieceRow key={piece.id} piece={piece} onChanged={changed} />)}
          <div className="flex flex-wrap items-end gap-2">
            {field("name", t("admin.prod.name"), "w-48", true)}
            {field("price", t("admin.ib.bundlePrice"), "w-32")}
            {field("credit", t("admin.pkg.creditAmt"), "w-36")}
            {field("days", t("admin.pkg.validDays"), "w-24")}
            {field("perkPct", t("admin.pkg.perkPct"), "w-20")}
            {field("perkDays", t("admin.pkg.perkDays"), "w-24")}
            <button type="button" onClick={() => add.mutate()} disabled={!can || add.isPending} className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-black disabled:opacity-40">+ {t("admin.ib.addCredit")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
