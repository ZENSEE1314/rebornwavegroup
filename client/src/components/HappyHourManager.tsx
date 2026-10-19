// Admin › Inventory › Happy hour: set the hours once, tick the drinks and food, and give them a happy price (a % off, or one price for all). The POS then shows
// the happy price on those items inside the hours (and can hide an item outside them). Each item can still have its own price in its pencil box.
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { money } from "@/lib/money";

interface Item { id: number; name: string; category: string; price: string | number; happyPrice?: string | number | null; happyStart?: string | null; happyEnd?: string | null; happyOnly?: boolean | null; packageKind?: string | null; isService?: boolean | null }

const inp = "rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-sm text-white outline-none focus:border-amber-300";
const DEFAULT_START = "17:00";
const DEFAULT_END = "20:00";

export function HappyHourManager() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [from, setFrom] = useState(DEFAULT_START);
  const [until, setUntil] = useState(DEFAULT_END);
  const [percent, setPercent] = useState("");
  const [price, setPrice] = useState("");
  const [isOnly, setIsOnly] = useState(false);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");
  const { data: all = [] } = useQuery<Item[]>({ queryKey: ["/api/reborn/pos/products", "happy"], queryFn: () => apiRequest("GET", "/api/reborn/pos/products").then((r) => r.json()), enabled: isOpen });
  const items = useMemo(() => all.filter((x) => !x.packageKind && !x.isService && x.name.toLowerCase().includes(query.trim().toLowerCase())), [all, query]);
  const groups = useMemo(() => {
    const byCategory = new Map<string, Item[]>();
    for (const item of items) byCategory.set(item.category, [...(byCategory.get(item.category) || []), item]);
    return Array.from(byCategory.entries());
  }, [items]);
  const withHappy = all.filter((x) => x.happyStart && x.happyEnd);

  const toggle = (id: number) => setPicked((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggleGroup = (ids: number[]) => setPicked((current) => { const next = new Set(current); const isAll = ids.every((id) => next.has(id)); for (const id of ids) { if (isAll) next.delete(id); else next.add(id); } return next; });
  const hasWay = Number(percent) > 0 || Number(price) > 0 || isOnly;
  const save = useMutation({
    mutationFn: (clear: boolean) => apiRequest("POST", "/api/reborn/admin/happy-hour", { productIds: Array.from(picked), start: from, end: until, percent: Number(percent) || undefined, price: Number(price) || undefined, onlyDuring: isOnly, clear }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; }),
    onSuccess: (d: { changed: number }, clear) => {
      toast({ title: clear ? t("admin.hh.cleared", { n: String(d.changed) }) : t("admin.hh.saved", { n: String(d.changed) }) });
      setPicked(new Set());
      qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/inventory"] });
    },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: String(e.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" }),
  });
  const chip = (item: Item) => (item.happyStart && item.happyEnd
    ? <span className="ml-1 rounded-full bg-pink-400/20 px-2 py-0.5 text-[10px] text-pink-200">🍹 {item.happyStart}–{item.happyEnd}{item.happyPrice !== null && item.happyPrice !== undefined && item.happyPrice !== "" ? ` · ${money(Number(item.happyPrice))}` : ""}{item.happyOnly ? ` · ${t("admin.hh.onlyChip")}` : ""}</span>
    : null);

  return (
    <div className="mb-3 rounded-2xl border border-white/10 bg-white/5 p-3">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="min-h-0 p-0 text-left text-pink-200" style={{ fontSize: 13, fontWeight: 700 }}>🍹 {t("admin.hh.title")} {isOpen ? "▲" : "▼"}</button>
      {isOpen && (
        <div className="mt-2 space-y-3">
          <p className="text-[11px] text-white/50">{t("admin.hh.intro")}</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[11px] text-white/50">{t("admin.happy.from")}<input type="time" value={from} onChange={(e) => setFrom(e.target.value)} className={inp + " mt-0.5 block"} style={{ colorScheme: "dark" }} /></label>
            <label className="text-[11px] text-white/50">{t("admin.happy.to")}<input type="time" value={until} onChange={(e) => setUntil(e.target.value)} className={inp + " mt-0.5 block"} style={{ colorScheme: "dark" }} /></label>
            <label className="text-[11px] text-white/50">{t("admin.hh.percent")}<input type="number" inputMode="numeric" min={0} max={100} value={percent} onChange={(e) => { setPercent(e.target.value); if (e.target.value) setPrice(""); }} placeholder="0" className={inp + " mt-0.5 block w-24"} /></label>
            <label className="text-[11px] text-white/50">{t("admin.hh.samePrice")}<input type="number" inputMode="numeric" min={0} value={price} onChange={(e) => { setPrice(e.target.value); if (e.target.value) setPercent(""); }} placeholder="0" className={inp + " mt-0.5 block w-28"} /></label>
          </div>
          <label className="flex items-center gap-2 text-xs text-white/70"><input type="checkbox" checked={isOnly} onChange={(e) => setIsOnly(e.target.checked)} />{t("admin.hh.only")}</label>
          <p className="text-[11px] text-white/40">{t("admin.hh.hint")}</p>

          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("admin.search.ph")} className={inp + " w-full"} />
          <div className="max-h-80 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-2">
            {groups.map(([category, list]) => (
              <div key={category} className="mb-2">
                <label className="flex items-center gap-2 text-xs font-bold text-amber-200"><input type="checkbox" checked={list.every((x) => picked.has(x.id))} onChange={() => toggleGroup(list.map((x) => x.id))} />{category} <span className="font-normal text-white/40">({list.length})</span></label>
                {list.map((item) => (
                  <label key={item.id} className="ml-5 flex items-center gap-2 py-0.5 text-xs text-white/80"><input type="checkbox" checked={picked.has(item.id)} onChange={() => toggle(item.id)} /><span className="min-w-0 truncate">{item.name}</span><span className="shrink-0 text-white/40">{money(Number(item.price))}</span>{chip(item)}</label>
                ))}
              </div>
            ))}
            {!groups.length && <p className="p-2 text-xs text-white/40">{t("admin.hh.noItems")}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => save.mutate(false)} disabled={save.isPending || picked.size === 0 || !hasWay} className="rounded-lg bg-pink-400 px-4 py-2 text-xs font-bold text-black disabled:opacity-40">{t("admin.hh.apply", { n: String(picked.size) })}</button>
            <button type="button" onClick={() => save.mutate(true)} disabled={save.isPending || picked.size === 0} className="rounded-lg bg-white/10 px-4 py-2 text-xs font-bold text-white/80 disabled:opacity-40">{t("admin.hh.clear", { n: String(picked.size) })}</button>
          </div>
          {withHappy.length > 0 && <p className="text-[11px] text-white/50">{t("admin.hh.count", { n: String(withHappy.length) })}</p>}
        </div>
      )}
    </div>
  );
}
