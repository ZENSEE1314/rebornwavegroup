// Admin › Inventory / Accounting: upload a supplier receipt; the AI reads the supplier and every line and matches each
// line to an inventory item. The admin checks or changes anything, then Save adds the stock and books one purchase.
import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ScanLine, Plus, X, Sparkles } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ImageUpload } from "@/components/ImageUpload";
import { readReceipt } from "@/lib/receipt-ocr";
import { money, roundMoney } from "@/lib/money";

interface Line { key: number; productId: number | null; name: string; qty: number; unitCost: number; packSize: number }
type Kind = "goods" | "expense";
interface Head { supplier: string; supplierPhone: string; invoiceNo: string; date: string; total: number; kind: Kind; category: string }

const inp = "min-w-0 max-w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400/60";
const EMPTY_HEAD: Head = { supplier: "", supplierPhone: "", invoiceNo: "", date: "", total: 0, kind: "goods", category: "other" };
const EXPENSE_CATEGORIES = ["rental", "utilities", "salary", "other"];
let nextKey = 1;
const newLine = (l: Partial<Line> = {}): Line => ({ key: nextKey++, productId: null, name: "", qty: 1, unitCost: 0, packSize: 1, ...l });

export default function ReceiptScan() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [photo, setPhoto] = useState("");
  const [head, setHead] = useState<Head>(EMPTY_HEAD);
  const [lines, setLines] = useState<Line[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [readPercent, setReadPercent] = useState(0);
  const { data: ready } = useQuery<{ ai: boolean }>({ queryKey: ["/api/reborn/admin/inventory/receipt/ready"], queryFn: () => apiRequest("GET", "/api/reborn/admin/inventory/receipt/ready").then((r) => r.json()) });
  const { data: products = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/pos/stock"], queryFn: () => apiRequest("GET", "/api/reborn/pos/stock").then((r) => r.json()) });
  const sorted = [...products].sort((a, b) => String(a.name).localeCompare(String(b.name)));

  const read = useMutation({
    mutationFn: () => { setReadPercent(0); return readReceipt(photo, !!ready?.ai, setReadPercent); },
    onSuccess: (d: any) => {
      setHead({ supplier: d.supplier || "", supplierPhone: d.supplierPhone || "", invoiceNo: d.invoiceNo || "", date: d.date || "", total: Number(d.total) || 0, kind: d.kind === "expense" ? "expense" : "goods", category: d.category || "other" });
      setLines((d.items || []).map((it: any) => newLine({ productId: it.productId ?? null, name: it.name, qty: it.qty, unitCost: roundMoney(it.unitCost), packSize: Math.max(1, Number(it.packSize) || 1) })));
      toast({ title: t("admin.rcpt.readOk", { n: String((d.items || []).length) }), description: d.learned > 0 ? t("admin.rcpt.learned", { n: String(d.learned) }) : undefined });
    },
    onError: (e: any) => toast({ title: t("admin.rcpt.readFail"), description: e.message, variant: "destructive" }),
  });
  const reset = () => { setPhoto(""); setHead(EMPTY_HEAD); setLines(null); setConfirming(false); };
  const save = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/admin/inventory/receipt/save", { ...head, photoUrl: photo || null, items: (lines || []).map(({ productId, name, qty, unitCost, packSize }) => ({ productId, name, qty, unitCost, packSize })) }).then((r) => r.json()),
    onSuccess: (d: any) => {
      toast({ title: d.message });
      reset();
      for (const key of ["/api/reborn/admin/inventory", "/api/reborn/pos/stock", "/api/reborn/pos/products", "/api/reborn/admin/accounting/summary", "/api/reborn/admin/accounting/ledger"]) qc.invalidateQueries({ queryKey: [key] });
    },
    onError: (e: any) => { setConfirming(false); toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }); },
  });

  const setLine = (key: number, patch: Partial<Line>) => setLines((ls) => (ls || []).map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const valid = (lines || []).filter((l) => l.qty >= 1 && (l.productId || l.name.trim()));
  const total = roundMoney(valid.reduce((s, l) => s + l.qty * l.unitCost, 0));
  const newItems = valid.filter((l) => !l.productId).length;
  const totalDiffers = head.total > 0 && Math.abs(head.total - total) > Math.max(1, head.total * 0.01);

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
      <div>
        <p className="font-bold text-sm flex items-center gap-2"><ScanLine className="w-4 h-4 text-amber-300" /> {t("admin.rcpt.title")}</p>
        <p className="text-[11px] text-white/50 mt-0.5">{ready?.ai ? t("admin.rcpt.hint") : t("admin.rcpt.hintNoAi")}</p>
      </div>
      <ImageUpload value={photo} onChange={setPhoto} label={t("admin.rcpt.photo")} output="jpeg" maxDim={1600} quality={0.85} />
      <div className="flex flex-wrap gap-2">
        {ready && <button onClick={() => read.mutate()} disabled={!photo || read.isPending} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-black text-sm bg-amber-400 disabled:opacity-50"><Sparkles className="w-4 h-4" /> {read.isPending ? (ready.ai ? t("admin.rcpt.reading") : t("ex.readingFree", { n: String(readPercent) })) : t("admin.rcpt.read")}</button>}
        {!lines && <button onClick={() => setLines([newLine()])} className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/10 border border-white/15">{t("admin.rcpt.typeIn")}</button>}
        {(lines || photo) && <button onClick={reset} className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/5 text-white/60">{t("admin.rcpt.clear")}</button>}
      </div>

      {lines && (
        <div className="space-y-3">
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            <label className="text-[11px] text-white/50">{t("admin.rcpt.kind")}<select value={head.kind} onChange={(e) => setHead({ ...head, kind: e.target.value === "expense" ? "expense" : "goods" })} className={inp + " w-full mt-0.5"}><option value="goods">{t("admin.rcpt.kindGoods")}</option><option value="expense">{t("admin.rcpt.kindExpense")}</option></select></label>
            {head.kind === "expense" && <label className="text-[11px] text-white/50">{t("admin.prod.category")}<select value={head.category} onChange={(e) => setHead({ ...head, category: e.target.value })} className={inp + " w-full mt-0.5"}>{EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{t("admin.cat.expense." + c)}</option>)}</select></label>}
            <label className="text-[11px] text-white/50">{t("admin.rcpt.supplier")}<input value={head.supplier} onChange={(e) => setHead({ ...head, supplier: e.target.value })} className={inp + " w-full mt-0.5"} /></label>
            <label className="text-[11px] text-white/50">{t("admin.rcpt.phone")}<input value={head.supplierPhone} onChange={(e) => setHead({ ...head, supplierPhone: e.target.value })} className={inp + " w-full mt-0.5"} /></label>
            <label className="text-[11px] text-white/50">{t("admin.rcpt.invoice")}<input value={head.invoiceNo} onChange={(e) => setHead({ ...head, invoiceNo: e.target.value })} className={inp + " w-full mt-0.5"} /></label>
            <label className="text-[11px] text-white/50">{t("admin.rcpt.date")}<input type="date" value={head.date} onChange={(e) => setHead({ ...head, date: e.target.value })} className={inp + " w-full mt-0.5"} /></label>
          </div>
          <div className="space-y-2">
            {lines.map((l) => (
              <div key={l.key} className="rounded-xl bg-black/20 border border-white/10 p-2 space-y-2">
                <div className="flex gap-2 items-start">
                  {head.kind === "goods" ? (
                    <select value={l.productId ?? ""} onChange={(e) => setLine(l.key, { productId: e.target.value ? Number(e.target.value) : null })} className={inp + " flex-1"}>
                      <option value="">{t("admin.rcpt.newItem")}</option>
                      {sorted.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  ) : <input value={l.name} onChange={(e) => setLine(l.key, { name: e.target.value, productId: null })} placeholder={t("admin.rcpt.expenseWhat")} className={inp + " flex-1"} />}
                  <button onClick={() => setLines((ls) => (ls || []).filter((x) => x.key !== l.key))} aria-label={t("admin.rcpt.remove")} className="w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-lg bg-white/5 border border-white/10"><X className="w-4 h-4" /></button>
                </div>
                {head.kind === "goods" && !l.productId && <input value={l.name} onChange={(e) => setLine(l.key, { name: e.target.value })} placeholder={t("admin.rcpt.newName")} className={inp + " w-full"} />}
                {l.productId && l.name && <p className="text-[11px] text-white/40 truncate">{t("admin.rcpt.onReceipt", { name: l.name })}</p>}
                {l.packSize > 1 && <p className="text-[11px] text-emerald-300">{t("admin.rcpt.packNote", { units: String(l.qty * l.packSize), each: money(l.unitCost / l.packSize) })}</p>}
                <div className="grid gap-2 items-end" style={{ gridTemplateColumns: "1fr 1fr 1.4fr 1.4fr" }}>
                  <label className="text-[11px] text-white/50">{t("admin.rcpt.qty")}<input type="number" min={1} value={l.qty} onChange={(e) => setLine(l.key, { qty: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} className={inp + " w-full mt-0.5"} /></label>
                  {head.kind === "goods" && <label className="text-[11px] text-white/50">{t("admin.rcpt.pack")}<input type="number" min={1} value={l.packSize} onChange={(e) => setLine(l.key, { packSize: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} className={inp + " w-full mt-0.5"} /></label>}
                  <label className="text-[11px] text-white/50">{t("admin.rcpt.unitCost")}<input type="number" min={0} value={l.unitCost} onChange={(e) => setLine(l.key, { unitCost: Math.max(0, Number(e.target.value) || 0) })} className={inp + " w-full mt-0.5"} /></label>
                  <p className="text-right text-sm font-bold text-amber-200 pb-2">{money(l.qty * l.unitCost)}</p>
                </div>
              </div>
            ))}
            <button onClick={() => setLines((ls) => [...(ls || []), newLine()])} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white/5 border border-white/10"><Plus className="w-3.5 h-3.5" /> {t("admin.rcpt.addLine")}</button>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-amber-400/10 border border-amber-400/30 px-3 py-2">
            <span className="text-sm font-bold">{t("admin.rcpt.total")}</span>
            <span className="text-base font-extrabold text-amber-300">{money(total)}</span>
          </div>
          {totalDiffers && <p className="text-[11px] text-amber-200">{t("admin.rcpt.totalDiffers", { receipt: money(head.total), lines: money(total) })}</p>}
          <button onClick={() => setConfirming(true)} disabled={!valid.length || save.isPending} className="w-full min-h-[44px] rounded-lg text-sm font-bold bg-emerald-500 text-black disabled:opacity-50">{t("admin.rcpt.save")}</button>
        </div>
      )}

      {confirming && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 text-white" onClick={() => !save.isPending && setConfirming(false)}>
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-white/15 bg-[#160f2a] p-4" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold mb-1">{t("admin.rcpt.confirmTitle")}</p>
            <p className="text-sm text-white/70 mb-3">{t("admin.rcpt.confirmText", { n: String(valid.length), total: money(total), supplier: head.supplier || "—" })}</p>
            {newItems > 0 && <p className="text-[11px] text-amber-200 mb-3">{t("admin.rcpt.confirmNew", { n: String(newItems) })}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirming(false)} disabled={save.isPending} className="min-h-[44px] px-4 rounded-lg text-sm font-semibold bg-white/10 border border-white/15">{t("admin.cnt.back")}</button>
              <button onClick={() => save.mutate()} disabled={save.isPending} className="min-h-[44px] px-5 rounded-lg text-sm font-bold bg-emerald-500 text-black disabled:opacity-50">{t("admin.rcpt.saveNow")}</button>
            </div>
          </div>
        </div>, document.body)}
    </div>
  );
}
