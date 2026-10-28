// Admin › Inventory › an item: put stock in (supplier, price, the date and time it arrived) or take stock out with a reason.
// Both are recorded as stock movements (the history and oldest-first costing follow them); the number itself is never typed over.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { suggestedUnitCost, suppliersOf, type SupplierLayer } from "@shared/stockPrefill";
import { DEFAULT_TERMS_DAYS, dueDateFrom } from "@shared/payables";
import ReceiptScan from "@/components/ReceiptScan";

const inp = "rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-sm text-white outline-none focus:border-amber-300";
const STOCK_IN = "/api/reborn/pos/stock-in";
const NEW_SUPPLIER = "__new__";
const OTHER_REASON = "Other";
// The English wording is what is stored (the server keeps "Count correction" out of the loss accounting); the screen shows it translated.
const REASONS = [
  { value: "Damaged / broken", key: "admin.sa.r.damaged" },
  { value: "Expired", key: "admin.sa.r.expired" },
  { value: "Spilled", key: "admin.sa.r.spilled" },
  { value: "Staff / free use", key: "admin.sa.r.free" },
  { value: "Count correction", key: "admin.sa.r.correction" },
  { value: OTHER_REASON, key: "admin.sa.r.other" },
];

// Current local date and time for <input type="datetime-local">, to the minute.
const nowLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

export function StockAdjust({ p }: { p: { id: number; name: string; stock?: number; cost?: string | number | null; supplierName?: string | null; unitsPerPack?: number | null; packPrice?: string | number | null } }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"in" | "out">("in");
  const [f, setF] = useState({ qty: "", supplier: p.supplierName || "", unitCost: "", at: nowLocal(), reason: REASONS[0].value, note: "", perBox: p.unitsPerPack && p.unitsPerPack > 1 ? String(p.unitsPerPack) : "", boxCost: Number(p.packPrice) > 0 ? String(Number(p.packPrice)) : "" });
  const [isBox, setIsBox] = useState(false);
  const [payer, setPayer] = useState("");
  const [isPaid, setIsPaid] = useState(true); // false = a bill to pay later (credit terms), kept under "not paid yet" in Admin › Expenses
  const [payMethod, setPayMethod] = useState(""); // cash | card, asked whenever it is paid
  const [termsDays, setTermsDays] = useState(String(DEFAULT_TERMS_DAYS));
  const { data: staff = [] } = useQuery<{ id: string; name: string }[]>({ queryKey: ["/api/reborn/pos/staff"], queryFn: () => apiRequest("GET", "/api/reborn/pos/staff").then((r) => r.json()), enabled: isOpen && mode === "out" });
  // What the item already costs from each supplier it was bought from (the same layers the "Stock by supplier and price" list shows).
  const { data: layerData } = useQuery<{ layers: SupplierLayer[]; deliveries?: SupplierLayer[] }>({ queryKey: ["/api/reborn/admin/pos/products", p.id, "layers"], enabled: isOpen && mode === "in", queryFn: () => apiRequest("GET", `/api/reborn/admin/pos/products/${p.id}/layers`).then((r) => r.json()) });
  // The delivery history (oldest first) knows every supplier and its price, even one whose units are all sold; the shelf layers are the fallback.
  const layers = layerData?.deliveries?.length ? layerData.deliveries : layerData?.layers ?? [];
  const knownSuppliers = suppliersOf(layers, p.supplierName);
  const [isNewSupplier, setIsNewSupplier] = useState(false);
  const [isCostTyped, setIsCostTyped] = useState(false);
  // A new supplier whose name is not typed yet gets no suggestion (a blank name would otherwise fall back to the item's own cost).
  const suggestion = isNewSupplier && f.supplier.trim() === "" ? null : suggestedUnitCost(layers, f.supplier, p.cost, p.supplierName);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  // By box: the quantity is boxes, so the units are boxes × units per box, and the price typed is for a whole box.
  const perBox = Math.max(0, Math.floor(Number(f.perBox) || 0));
  const entered = Math.floor(Number(f.qty) || 0);
  const qty = isBox ? entered * perBox : entered;
  const suggestedBoxCost = suggestion !== null && perBox > 0 ? Math.round(suggestion * perBox) : null;
  const shownUnitCost = isCostTyped ? f.unitCost : suggestion !== null ? String(suggestion) : "";
  const shownBoxCost = isCostTyped ? f.boxCost : suggestedBoxCost !== null ? String(suggestedBoxCost) : f.boxCost;
  const unitCostOfBox = perBox > 0 && Number(shownBoxCost) > 0 ? Number(shownBoxCost) / perBox : undefined;
  const needsNote = mode === "out" && f.reason === OTHER_REASON;
  const hasCost = mode === "in" && Number(isBox ? unitCostOfBox : shownUnitCost) > 0;
  const needsPayMethod = hasCost && isPaid && !payMethod;
  const dueDate = !isPaid ? dueDateFrom((f.at || nowLocal()).slice(0, 10), Number(termsDays)) : "";
  const canSave = qty > 0 && (!isBox || perBox >= 2) && (mode === "in" || !needsNote || f.note.trim() !== "") && !needsPayMethod;
  const fail = (e: any) => toast({ title: t("admin.c.failed"), description: String(e.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" });
  const save = useMutation({
    mutationFn: () => apiRequest("POST", STOCK_IN, {
      productId: p.id, qty: mode === "in" ? qty : -qty, receivedAt: f.at ? new Date(f.at).toISOString() : undefined,
      ...(mode === "in" ? { supplier: f.supplier || undefined, unitCost: isBox ? unitCostOfBox : (shownUnitCost ? Number(shownUnitCost) : undefined), ...(hasCost ? { paid: isPaid, payMethod: isPaid ? payMethod : undefined, dueDate: dueDate || undefined } : {}) } : { reason: f.reason, note: f.note, chargeStaffId: payer || undefined }),
    }).then((r) => r.json()),
    onSuccess: () => {
      toast({ title: t("admin.sa.saved") });
      setF({ ...f, qty: "", unitCost: "", boxCost: "", note: "", at: nowLocal() });
      setIsCostTyped(false);
      setPayer("");
      setPayMethod("");
      qc.invalidateQueries({ queryKey: ["/api/reborn/admin/inventory"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] });
    },
    onError: fail,
  });
  const tab = (value: "in" | "out", label: string) => (
    <button type="button" onClick={() => setMode(value)} aria-pressed={mode === value} className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold ${mode === value ? (value === "in" ? "bg-emerald-500 text-black" : "bg-red-400 text-black") : "bg-white/10 text-white/70"}`}>{label}</button>
  );
  return (
    <div className="mt-3 border-t border-white/10 pt-2">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="min-h-0 p-0 text-left text-cyan-200" style={{ fontSize: 12, fontWeight: 600 }}>📦 {t("admin.sa.title")} {isOpen ? "▲" : "▼"}</button>
      {isOpen && (
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">{tab("in", `➕ ${t("admin.sa.add")}`)}{tab("out", `➖ ${t("admin.sa.take")}`)}</div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setIsBox(false)} aria-pressed={!isBox} className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold ${!isBox ? "bg-amber-400 text-black" : "bg-white/10 text-white/70"}`}>{t("admin.sa.byUnit")}</button>
            <button type="button" onClick={() => setIsBox(true)} aria-pressed={isBox} className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold ${isBox ? "bg-amber-400 text-black" : "bg-white/10 text-white/70"}`}>{t("admin.sa.byBox")}</button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[11px] text-white/50">{isBox ? t("admin.sa.boxes") : t("admin.prod.qty")}<input type="number" inputMode="numeric" min={1} value={f.qty} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setF({ ...f, qty: e.target.value })} className={inp + " mt-0.5 block w-24"} /></label>
            {mode === "in" && <>
              <label className="text-[11px] text-white/50">{t("admin.prod.supplier")}
                <select value={isNewSupplier ? NEW_SUPPLIER : f.supplier} onChange={(e) => { if (e.target.value === NEW_SUPPLIER) { setIsNewSupplier(true); setF({ ...f, supplier: "" }); } else { setIsNewSupplier(false); setF({ ...f, supplier: e.target.value }); } setIsCostTyped(false); }} className={inp + " mt-0.5 block w-44"}>
                  {knownSuppliers.length === 0 && !f.supplier && <option value="">—</option>}
                  {knownSuppliers.map((name) => <option key={name} value={name}>{name}</option>)}
                  <option value={NEW_SUPPLIER}>＋ {t("admin.sa.newSupplier")}</option>
                </select>
              </label>
              {isNewSupplier && <label className="text-[11px] text-white/50">{t("admin.sa.newSupplierName")}<input value={f.supplier} onChange={(e) => { setF({ ...f, supplier: e.target.value }); setIsCostTyped(false); }} className={inp + " mt-0.5 block w-40"} autoFocus /></label>}
              {isBox
                ? <label className="text-[11px] text-white/50">{t("admin.sa.boxCost")}<input type="number" inputMode="numeric" value={shownBoxCost} onFocus={(e) => e.currentTarget.select()} onChange={(e) => { setIsCostTyped(true); setF({ ...f, boxCost: e.target.value }); }} className={inp + " mt-0.5 block w-32"} /></label>
                : <label className="text-[11px] text-white/50">{t("admin.prod.unitCost")}<input type="number" inputMode="numeric" value={shownUnitCost} onFocus={(e) => e.currentTarget.select()} onChange={(e) => { setIsCostTyped(true); setF({ ...f, unitCost: e.target.value }); }} className={inp + " mt-0.5 block w-28"} /></label>}
            </>}
            {isBox && <label className="text-[11px] text-white/50">{t("admin.sa.perBox")}<input type="number" inputMode="numeric" min={2} value={f.perBox} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setF({ ...f, perBox: e.target.value })} className={inp + " mt-0.5 block w-24"} /></label>}
            <label className="text-[11px] text-white/50">{mode === "in" ? t("admin.prod.receivedAt") : t("admin.sa.when")}<input type="datetime-local" value={f.at} max={nowLocal()} onChange={(e) => setF({ ...f, at: e.target.value })} className={inp + " mt-0.5 block"} /></label>
          </div>
          {hasCost && (
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-[11px] text-white/50">{t("ex.payment")}
                <select value={isPaid ? "paid" : "unpaid"} onChange={(e) => setIsPaid(e.target.value === "paid")} className={inp + " mt-0.5 block"}>
                  <option value="paid">{t("ex.paid")}</option>
                  <option value="unpaid">{t("ex.notPaid")}</option>
                </select>
              </label>
              {isPaid && <label className="text-[11px] text-white/50">{t("ex.payMethod")}<select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className={inp + " mt-0.5 block"}><option value="">—</option><option value="cash">{t("ex.pm.cash")}</option><option value="card">{t("ex.pm.card")}</option></select></label>}
              {!isPaid && <label className="text-[11px] text-white/50">{t("ex.termsDays")}<input type="number" inputMode="numeric" min={0} max={365} value={termsDays} onChange={(e) => setTermsDays(e.target.value)} className={inp + " mt-0.5 block w-24"} /><span className="mt-0.5 block text-[10px] text-white/40">{dueDate ? t("ex.dueOn", { d: dueDate }) : ""}</span></label>}
            </div>
          )}
          {mode === "out" && (
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-[11px] text-white/50">{t("admin.sa.reason")}<select value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} className={inp + " mt-0.5 block"}>{REASONS.map((r) => <option key={r.value} value={r.value}>{t(r.key)}</option>)}</select></label>
              <label className="min-w-0 flex-1 text-[11px] text-white/50">{needsNote ? t("admin.sa.noteRequired") : t("admin.sa.note")}<input value={f.note} maxLength={200} onChange={(e) => setF({ ...f, note: e.target.value })} className={inp + " mt-0.5 block w-full"} /></label>
            </div>
          )}
          {mode === "out" && f.reason !== "Count correction" && (
            <label className="block text-[11px] text-white/50">{t("pos.item.staffPays")}
              <select value={payer} onChange={(e) => setPayer(e.target.value)} className={inp + " mt-0.5 block w-full"}>
                <option value="">{t("pos.item.nobodyPays")}</option>
                {staff.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
              </select>
              {payer && <span className="mt-1 block text-amber-200/80">{t("pos.item.staffPaysNote")}</span>}
            </label>
          )}
          {mode === "in" && !isCostTyped && suggestion !== null && <p className="text-[11px] text-emerald-200/80">{t("admin.sa.costKnown", { supplier: f.supplier || "—" })}</p>}
          {mode === "in" && isNewSupplier && f.supplier.trim() !== "" && !isCostTyped && suggestion === null && <p className="text-[11px] text-amber-200">{t("admin.sa.costNew")}</p>}
          {isBox && <p className="text-[12px] font-semibold text-amber-200">{perBox >= 2 ? t("admin.sa.boxTotal", { b: String(entered), u: String(perBox), n: String(qty) }) : t("admin.sa.needPerBox")}</p>}
          <p className="text-[11px] text-white/40">{mode === "in" ? t("admin.sa.hintIn") : t("admin.sa.hintOut")}</p>
          {mode === "in" && (
            <div className="rounded-xl border border-white/10 bg-black/20 p-2">
              <button type="button" onClick={() => setIsReceiptOpen(!isReceiptOpen)} className="min-h-0 p-0 text-left text-cyan-200" style={{ fontSize: 12, fontWeight: 600 }}>📄 {t("admin.sa.receipt")} {isReceiptOpen ? "▲" : "▼"}</button>
              {isReceiptOpen && <div className="mt-2"><p className="mb-2 text-[11px] text-white/45">{t("admin.sa.receiptHint")}</p><ReceiptScan /></div>}
            </div>
          )}
          <button type="button" onClick={() => save.mutate()} disabled={!canSave || save.isPending} className={`rounded-lg px-4 py-2 text-xs font-bold text-black disabled:opacity-40 ${mode === "in" ? "bg-emerald-500" : "bg-red-400"}`}>{mode === "in" ? t("admin.sa.saveIn", { n: String(qty || 0) }) : t("admin.sa.saveOut", { n: String(qty || 0) })}</button>
        </div>
      )}
    </div>
  );
}
