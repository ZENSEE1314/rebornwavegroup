import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RebornLayout } from "@/components/RebornLayout";
import { openCashDrawer, connectDrawerSerial, getDrawerUrl, setDrawerUrl, serialSupported, drawerConfigured } from "@/lib/cashDrawer";
import { printClosingReport, printReceipt, printBill, printKitchen, printPaperTest, getReceiptPaper, saveReceiptPaper, getReceiptCopies, saveReceiptCopies } from "@/lib/receipt";
import { ImageUpload } from "@/components/ImageUpload";
import { useTranslation, translate, localeTag } from "@/lib/i18n";
import { Plus, Minus, Trash2, UserCheck, X, Store, Search, PackagePlus, Receipt, LayoutGrid, ChevronLeft, Bell, Settings, Wine, Printer, History, RotateCcw, Gift } from "lucide-react";
import { StaffGuideButton } from "@/components/StaffGuideButton";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ReasonDialog } from "@/components/ReasonDialog";
import { prepareOfflinePos, savedReceiptMeta, submitSale, useOfflineSales } from "@/lib/offline-sales";
import { money, roundMoney } from "@/lib/money";

interface Product { bundleItemId?: number | null; isService?: boolean; salePrice?: string; happyNow?: boolean; offHours?: boolean; recommended?: boolean; id: number; name: string; category: string; department?: string | null; price: string; stock: number; soldOut?: boolean; imageUrl?: string; packageKind?: string | null; packageUses?: number | null; packageCredit?: string | null; }
// A product's department holds one or more industries as a comma-separated list (e.g. "KTV,Bar").
const deptList = (d?: string | null): string[] => (d || "").split(",").map((s) => s.trim()).filter(Boolean);
const deptHas = (d: string | null | undefined, ind: string): boolean => deptList(d).includes(ind);
interface Staff { id: string; name: string; role: string; }
interface Order { id: number; orderNo: string; tableNumber?: string; memberName?: string; memberCode?: string; salesStaffName?: string; total: string; source: string; orderMode?: string; items?: any[]; paymentMethod?: string; paymentReference?: string; cashReceived?: string; changeGiven?: string; subtotal?: string; discount?: string; serviceFee?: string; tax?: string; paidAt?: string; }
type Tab = "tables" | "sell" | "sales" | "stock" | "bottles" | "packages";
const OPEN_TICKETS = ["/api/reborn/pos/orders"];
// A line that no longer counts on the bill: rejected before it was served, or lost (spilled / broken) after.
const OFF_BILL = ["rejected", "lost"];
const RECOMMENDED_GROUP = "__recommended__";
const PACKAGES_GROUP = "__packages__";
// Translate a server-provided enum value, falling back to the raw value when no key exists.
const tOr = (t: (k: string) => string, key: string, fallback: string) => { const v = t(key); return v === key ? fallback : v; };
const rp = (n: any) => money(n);

async function post(url: string, body?: any) {
  const r = await apiRequest("POST", url, body ?? {});
  const d = await r.json();
  if (!r.ok) throw new Error(d.message || translate("pos.failed"));
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

// Commission for a sale (an agent, a driver ...): our own cost, kept out of the bill and off the customer's receipt.
interface CommissionInput { label: string; payee: string; kind: "percent" | "amount"; value: number }
const emptyCommission = (): CommissionInput => ({ label: "", payee: "", kind: "percent", value: 0 });
const commissionToSend = (c: CommissionInput) => (c.value > 0 ? c : undefined);
const commissionAmountOf = (c: CommissionInput, base: number) => (c.value > 0 ? Math.min(Math.max(0, base), roundMoney(c.kind === "percent" ? (base * c.value) / 100 : c.value)) : 0);
const commissionPreview = (c: CommissionInput, base: number) => { const amount = commissionAmountOf(c, base); return amount > 0 ? { commissionLabel: c.label, commissionPayee: c.payee, commissionAmount: amount } : {}; };

function CommissionBox({ value, onChange, base }: { value: CommissionInput; onChange: (next: CommissionInput) => void; base: number }) {
  const { t } = useTranslation();
  const { data: types = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/pos/commission-types"], queryFn: () => apiRequest("GET", "/api/reborn/pos/commission-types").then((r) => r.json()) });
  const amount = commissionAmountOf(value, base);
  const field = "mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white";
  return (
    <details className="mb-2 rounded-xl border border-white/10 bg-black/20 p-2 text-xs text-white/70">
      <summary className="cursor-pointer font-semibold">💼 {t("pos.com.title")}{amount > 0 && <span className="ml-2 text-amber-300">{rp(amount)}</span>}</summary>
      <p className="my-2 text-white/45">{t("pos.com.hint")}</p>
      <p className="mb-2 font-semibold text-white/70">{t("pos.com.base", { amount: rp(base) })}</p>
      {types.length > 0 && (
        <select value="" onChange={(e) => { const type = types.find((x: any) => x.id === e.target.value); if (type) onChange({ ...value, label: type.name, kind: type.kind, value: Number(type.value) }); }} className={field}>
          <option value="">{t("pos.com.pick")}</option>
          {types.map((x: any) => <option key={x.id} value={x.id}>{x.name} · {x.kind === "percent" ? `${x.value}%` : rp(x.value)}</option>)}
        </select>
      )}
      <label className="mt-2 block">{t("pos.com.name")}<input value={value.label} onChange={(e) => onChange({ ...value, label: e.target.value })} maxLength={40} className={field} /></label>
      <label className="mt-2 block">{t("pos.com.payee")}<input value={value.payee} onChange={(e) => onChange({ ...value, payee: e.target.value })} maxLength={60} className={field} /></label>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <select value={value.kind} onChange={(e) => onChange({ ...value, kind: e.target.value === "percent" ? "percent" : "amount" })} className={field}>
          <option value="percent">%</option>
          <option value="amount">{t("pos.rpAmount")}</option>
        </select>
        <input type="number" min={0} value={value.value || ""} onChange={(e) => onChange({ ...value, value: Math.max(0, Number(e.target.value)) })} className={field} />
      </div>
      {(value.value > 0 || value.label || value.payee) && <button type="button" onClick={() => onChange(emptyCommission())} className="mt-2 text-white/50 underline">{t("pos.com.clear")}</button>}
    </details>
  );
}

// Admin: the saved commissions the cashier can pick from (name + % or amount).
function CommissionTypesSetting() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [rows, setRows] = useState<Array<{ id: string; name: string; kind: "percent" | "amount"; value: number }>>([]);
  const { data: saved } = useQuery<any[]>({ queryKey: ["/api/reborn/pos/commission-types"], queryFn: () => apiRequest("GET", "/api/reborn/pos/commission-types").then((r) => r.json()) });
  useEffect(() => { if (saved) setRows(saved.map((x: any) => ({ id: x.id, name: x.name, kind: x.kind, value: Number(x.value) }))); }, [saved]);
  const save = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/reborn/admin/commission-types", { types: rows }).then((r) => r.json()),
    onSuccess: () => { toast({ title: t("pos.com.saved") }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/commission-types"] }); },
    onError: (e: any) => toast({ title: t("pos.failed"), description: e.message, variant: "destructive" }),
  });
  const update = (index: number, patch: Partial<(typeof rows)[number]>) => setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const field = "rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm text-white";
  return (
    <div className="mb-3 inline-block align-top mr-2">
      <button onClick={() => setIsOpen(!isOpen)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70">💼 {t("pos.com.manage")}</button>
      {isOpen && (
        <div className="mt-2 w-80 max-w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white/80">
          <p className="mb-2 text-white/50">{t("pos.com.manageHint")}</p>
          {rows.map((row, i) => (
            <div key={row.id || i} className="mb-2 grid gap-1" style={{ gridTemplateColumns: "minmax(0,1fr) 4rem 5rem 2rem" }}>
              <input value={row.name} onChange={(e) => update(i, { name: e.target.value })} maxLength={40} placeholder={t("pos.com.name")} className={field} />
              <select value={row.kind} onChange={(e) => update(i, { kind: e.target.value === "percent" ? "percent" : "amount" })} className={field}><option value="percent">%</option><option value="amount">RP</option></select>
              <input type="number" min={0} value={row.value || ""} onChange={(e) => update(i, { value: Math.max(0, Number(e.target.value)) })} className={field} />
              <button aria-label={t("pos.com.remove")} onClick={() => setRows(rows.filter((_, j) => j !== i))} className="w-8 h-9 rounded-lg bg-white/10">×</button>
            </div>
          ))}
          <div className="flex gap-2">
            <button onClick={() => setRows([...rows, { id: "", name: "", kind: "percent", value: 0 }])} className="flex-1 rounded-lg bg-white/10 px-3 py-2 font-semibold">+ {t("pos.com.add")}</button>
            <button onClick={() => save.mutate()} disabled={save.isPending} className="flex-1 rounded-lg bg-amber-400/20 px-3 py-2 font-semibold text-amber-200">{t("pos.com.save")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Which roll is in the receipt printer of this PC: width and how far to move the print right (saved in this browser).
function ReceiptPaperSetting() {
  const { t } = useTranslation();
  const [paper, setPaper] = useState(getReceiptPaper);
  const [isOpen, setIsOpen] = useState(false);
  const change = (next: { widthMm: number; shiftMm: number }) => { setPaper(next); saveReceiptPaper(next); };
  const [copies, setCopies] = useState(getReceiptCopies);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const applyRuler = () => {
    const a = Number(first), b = Number(last);
    if (Number.isFinite(a) && Number.isFinite(b) && b - a >= 40) change({ widthMm: Math.min(80, b - a), shiftMm: Math.max(0, a) });
  };
  return (
    <div className="mb-3 inline-block align-top mr-2">
      <button onClick={() => setIsOpen(!isOpen)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70">🧾 {t("pos.rc.paperSetting")}</button>
      {isOpen && (
        <div className="mt-2 w-72 rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white/80">
          <label className="block mb-2">{t("pos.rc.paperWidth")}
            <input type="number" min={40} max={80} value={paper.widthMm} onChange={(e) => change({ ...paper, widthMm: Math.max(40, Math.min(80, Number(e.target.value) || 80)) })} className="mt-1 w-full rounded-lg bg-black/40 border border-white/10 px-2 py-2 text-white" />
          </label>
          <label className="block mb-2">{t("pos.rc.paperShift")}
            <input type="number" min={0} max={40} step={1} value={paper.shiftMm} onChange={(e) => change({ ...paper, shiftMm: Math.max(0, Math.min(40, Number(e.target.value) || 0)) })} className="mt-1 w-full rounded-lg bg-black/40 border border-white/10 px-2 py-2 text-white" />
          </label>
          <label className="block mb-2">{t("pos.rc.copies")}
            <select value={copies} onChange={(e) => { const next = e.target.value === "two" ? "two" : "one"; setCopies(next); saveReceiptCopies(next); }} className="mt-1 w-full rounded-lg bg-black/40 border border-white/10 px-2 py-2 text-white">
              <option value="one">{t("pos.rc.copiesOne")}</option>
              <option value="two">{t("pos.rc.copiesTwo")}</option>
            </select>
            <span className="mt-1 block text-white/45">{t("pos.rc.copiesHint")}</span>
          </label>
          <p className="mb-2 text-white/50">{t("pos.rc.paperHint")}</p>
          <button onClick={() => printPaperTest()} className="w-full rounded-lg bg-white/10 px-3 py-2 font-semibold text-white">{t("pos.rc.paperTest")}</button>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="block">{t("pos.rc.paperFirst")}<input type="number" min={0} max={80} value={first} onChange={(e) => setFirst(e.target.value)} className="mt-1 w-full rounded-lg bg-black/40 border border-white/10 px-2 py-2 text-white" /></label>
            <label className="block">{t("pos.rc.paperLast")}<input type="number" min={0} max={80} value={last} onChange={(e) => setLast(e.target.value)} className="mt-1 w-full rounded-lg bg-black/40 border border-white/10 px-2 py-2 text-white" /></label>
          </div>
          <button onClick={applyRuler} className="mt-2 w-full rounded-lg bg-amber-400/20 px-3 py-2 font-semibold text-amber-200">{t("pos.rc.paperFromRuler")}</button>
        </div>
      )}
    </div>
  );
}

export default function RebornPos() {
  const [, navigate] = useLocation();
  const { user, isLoading } = useAuth();
  const role = (user as any)?.role;
  const isStaff = role === "admin" || role === "staff";
  const [tab, setTab] = useState<Tab>("tables");
  const [showDrawer, setShowDrawer] = useState(false);
  const { t } = useTranslation();
  // Managers (staff with the company role "manager") close the day here too.
  const { data: myRole } = useQuery<{ role: string }>({ queryKey: ["/api/reborn/my-role"], queryFn: () => apiRequest("GET", "/api/reborn/my-role").then((r) => r.json()), enabled: isStaff });
  const companyRole = myRole?.role;
  useEffect(() => { void prepareOfflinePos(); }, []);

  if (!isLoading && !isStaff) {
    return <RebornLayout active="/pos" title={t("pos.title")}><div className="text-center py-16 text-white/50">{t("pos.staffOnly")} <button className="text-amber-300 underline" onClick={() => navigate("/")}>{t("pos.goHome")}</button></div></RebornLayout>;
  }
  return (
    <RebornLayout active="/pos" title={t("pos.title")} wide>
      <div className="flex items-center gap-2 mb-4">
        <span className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c" }}><Store className="w-5 h-5" /></span>
        <h1 className="text-xl font-extrabold">{t("pos.heading")}</h1>
        <button onClick={() => setShowDrawer(true)} className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70"><Settings className="w-4 h-4" /> {t("pos.cashDrawer")}</button>
      </div>
      <StaffGuideButton />
      <OfflineBanner />
      <ReceiptPaperSetting />
      {role === "admin" && <CommissionTypesSetting />}
      <a href="/kitchen" className="mb-3 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70">🍳 {t("pos.kitchen.open")}</a>
      {(role === "admin" || companyRole === "manager") && <ClosePosDay />}
      <div className="grid gap-2 mb-4 max-w-3xl" style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}>
        {([["tables", t("pos.tab.tables"), <LayoutGrid className="w-4 h-4" />], ["sell", t("pos.tab.sell"), <Receipt className="w-4 h-4" />], ["sales", t("pos.tab.sales"), <History className="w-4 h-4" />], ["stock", t("pos.tab.stock"), <PackagePlus className="w-4 h-4" />], ["bottles", t("pos.tab.bottles"), <Wine className="w-4 h-4" />], ["packages", t("pos.tab.packages"), <Gift className="w-4 h-4" />]] as const).map(([k, l, ic]) => (
          <button key={k} onClick={() => setTab(k as Tab)} className={`min-w-0 px-1 py-2 sm:py-2.5 rounded-xl border font-semibold text-[10px] sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 ${tab === k ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/10 bg-white/5 text-white/60"}`}>{ic}<span className="hidden sm:inline">{l}</span><span className="sm:hidden max-w-full truncate">{l.split(" ")[0]}</span></button>
        ))}
      </div>
      {tab === "tables" && <TablesTab />}
      {tab === "sell" && <QuickSaleTab />}
      {tab === "sales" && <SalesTodayTab />}
      {tab === "stock" && <StockTab />}
      {tab === "bottles" && <BottlesTab />}
      {tab === "packages" && <PackagesTab />}
      {showDrawer && <DrawerSetup onClose={() => setShowDrawer(false)} />}
    </RebornLayout>
  );
}
function usePosSettings() {
  return useQuery<any>({ queryKey: ["/api/reborn/pos/settings"], queryFn: () => apiRequest("GET", "/api/reborn/pos/settings").then((r) => r.json()) });
}
function billTotals(subtotal: number, discount: number, settings: any) {
  const taxable = Math.max(0, subtotal - Math.min(subtotal, Math.max(0, discount || 0)));
  const serviceFee = roundMoney(taxable * (Number(settings?.serviceFeePercent) || 0) / 100);
  const tax = roundMoney(taxable * (Number(settings?.taxPercent) || 0) / 100);
  return { taxable, serviceFee, tax, total: taxable + serviceFee + tax };
}

function ClosePosDay() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [report, setReport] = useState<any>(null);
  const { t } = useTranslation();
  const close = useMutation({
    mutationFn: () => post("/api/reborn/admin/venue/close"),
    onSuccess: (d) => {
      setReport(d.report);
      toast({ title: t("pos.close.toastOk"), description: d.message });
      qc.invalidateQueries({ queryKey: ["/api/reborn/admin/venue/session"] });
      qc.invalidateQueries({ queryKey: ["/api/reborn/kos/checked-in"] });
    },
    onError: (e: any) => toast({ title: t("pos.close.toastFail"), description: e.message, variant: "destructive" }),
  });
  const confirmClose = () => {
    if (window.confirm(t("pos.close.confirm"))) close.mutate();
  };
  return <><div className="mb-4 max-w-2xl rounded-2xl border border-red-400/25 bg-red-500/5 p-3 sm:flex sm:items-center sm:justify-between sm:gap-4">
    <div className="mb-3 sm:mb-0"><p className="text-sm font-bold text-red-100">{t("pos.close.title")}</p><p className="text-xs text-white/45">{t("pos.close.desc")}</p></div>
    <button onClick={confirmClose} disabled={close.isPending} className="w-full rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-2.5 text-sm font-bold text-red-100 disabled:opacity-50 sm:w-auto">{close.isPending ? t("pos.close.closing") : t("pos.close.button")}</button>
  </div>{report && <ClosingReport report={report} onClose={()=>setReport(null)} />}</>;
}

function ClosingReport({ report, onClose }: { report: any; onClose: () => void }) {
  const { t: tr } = useTranslation();
  const t=report.totals||{};
  return <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/85 p-4 backdrop-blur-sm"><div className="relative mx-auto my-4 max-w-md rounded-3xl border border-white/15 bg-[#160f2a] p-5"><button onClick={onClose} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/10" aria-label={tr("pos.report.closeAria")}><X className="h-5 w-5"/></button><h2 className="pr-10 text-xl font-black">{tr("pos.report.title")}</h2><p className="text-sm text-white/50">{report.day} · {tr("pos.report.paidOrders", { n: report.ticketCount })}</p><div className="my-4 max-h-56 space-y-2 overflow-y-auto border-y border-white/10 py-3">{(report.items||[]).map((item:any)=><div key={item.name} className="flex justify-between gap-3 text-sm"><span>{item.quantity}× {item.name}</span><span>{rp(item.sales)}</span></div>)}{!(report.items||[]).length&&<p className="text-sm text-white/40">{tr("pos.report.noItems")}</p>}</div><div className="space-y-1 text-sm"><div className="flex justify-between"><span>{tr("pos.report.gross")}</span><span>{rp(t.subtotal)}</span></div><div className="flex justify-between"><span>{tr("pos.report.discounts")}</span><span>- {rp(t.discount)}</span></div><div className="flex justify-between"><span>{tr("pos.serviceFee")}</span><span>{rp(t.serviceFee)}</span></div><div className="flex justify-between"><span>{tr("pos.tax")}</span><span>{rp(t.tax)}</span></div><div className="flex justify-between text-lg font-black text-amber-300"><span>{tr("pos.report.revenue")}</span><span>{rp(t.revenue)}</span></div><div className="flex justify-between text-white/60"><span>{tr("pos.report.cashCard")}</span><span>{rp(t.cash)} / {rp(t.card)}</span></div>{Number(t.credits) > 0 && <div className="flex justify-between text-white/60"><span>{tr("pos.pay.credits")}</span><span>{rp(t.credits)}</span></div>}{Number(t.packageCredit) > 0 && <div className="flex justify-between text-white/60"><span>{tr("pos.rc.packageCredit")}</span><span>{rp(t.packageCredit)}</span></div>}<div className="mt-2 flex justify-between border-t border-white/10 pt-2"><span>{tr("pos.report.cost")}</span><span>- {rp(t.cost)}</span></div><div className="flex justify-between text-lg font-black text-emerald-300"><span>{tr("pos.report.profit")}</span><span>{rp(t.profit)}</span></div></div><div className="mt-5 grid grid-cols-2 gap-2"><button onClick={()=>printClosingReport(report,{clubName:"Reborn Wave Group"})} className="flex items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-3 font-bold text-black"><Printer className="h-4 w-4"/> {tr("pos.print")}</button><button onClick={onClose} className="rounded-xl bg-white/10 px-4 py-3 font-bold">{tr("pos.done")}</button></div><p className="mt-3 text-center text-xs text-white/40">{tr("pos.report.saved")}</p></div></div>;
}

function SalesPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { data: staff = [] } = useStaff();
  const { t } = useTranslation();
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm">
      <option value="">{t("pos.salesperson")}</option>
      {staff.map((s) => <option key={s.id} value={s.id}>{s.name}{s.role === "admin" ? t("pos.adminSuffix") : ""}</option>)}
    </select>
  );
}

// ── Product picker: pending cart → onCommit(items) ──────────────────────────
function ProductPicker({ label, onCommit, onCartChange, busy, displayTotal }: { label: string; onCommit: (items: any[]) => void; onCartChange?: (items: any[]) => void; busy?: boolean; displayTotal?: number }) {
  const { data: products = [] } = useProducts();
  const { t } = useTranslation();
  const [cart, setCart] = useState<Record<number, number>>({});
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const lines = Object.entries(cart).filter(([, q]) => q > 0);
  const cartItems = useMemo(() => Object.entries(cart).filter(([, q]) => q > 0).map(([id, qty]) => ({ ...byId.get(Number(id))!, price: byId.get(Number(id))!.salePrice ?? byId.get(Number(id))!.price, qty })), [cart, byId]);
  useEffect(() => { onCartChange?.(cartItems); }, [cartItems, onCartChange]);
  const total = lines.reduce((s, [id, q]) => s + Number(byId.get(Number(id))?.salePrice ?? byId.get(Number(id))?.price ?? 0) * q, 0);
  const add = (id: number, count = 1) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + count }));
  const sub = (id: number) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) - 1) }));
  const commit = () => { onCommit(lines.map(([id, q]) => { const p = byId.get(Number(id))!; return { productId: p.id, name: p.name, price: Number(p.salePrice ?? p.price), qty: q }; })); setCart({}); };
  const [industry, setIndustry] = useState("");
  const industries = useMemo(() => Array.from(new Set(products.flatMap((p) => deptList(p.department)))).sort() as string[], [products]);
  const groups = useMemo(() => {
    const g: Record<string, Product[]> = {};
    const shown = products.filter((p) => Number(p.price) > 0 && !p.soldOut && !(industry && !deptHas(p.department, industry))); // an item with no price isn't offered for sale
    const picks = shown.filter((p) => p.recommended);
    if (picks.length) g[RECOMMENDED_GROUP] = picks;
    const bundles = shown.filter((p) => p.packageKind);
    if (bundles.length) g[PACKAGES_GROUP] = bundles;
    for (const p of shown) if (!p.packageKind) (g[p.category || ""] ||= []).push(p);
    return Object.entries(g);
  }, [products, industry]);
  return (
    <div>
      {industries.length > 0 && <div className="flex items-center gap-2 flex-wrap mb-3"><span className="text-xs text-white/50">{t("pos.industry")}</span>{["", ...industries].map((d) => <button key={d || "all"} onClick={() => setIndustry(d)} className={`rounded-full px-3 py-1 text-xs ${industry === d ? "bg-amber-400 text-black font-bold" : "bg-white/5 text-white/60"}`}>{d || t("pos.all")}</button>)}</div>}
      {groups.map(([cat, items]) => (
        <div key={cat} className="mb-4">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 px-1">{cat === RECOMMENDED_GROUP ? `⭐ ${t("pos.recommended")}` : cat === PACKAGES_GROUP ? `📦 ${t("pos.packagesGroup")}` : cat || t("pos.other")}</p>
          {/* 2–3 tiles per row on phones, more on wider screens (inline template:
              the phone-wide grid-cols-* override would make it one huge column). */}
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 112px), 1fr))" }}>
            {items.map((p) => (
              <div key={p.id} className="relative min-w-0">
              <button onClick={() => add(p.id)} disabled={!p.packageKind && !p.isService && p.stock <= 0} className="min-w-0 rounded-2xl border border-white/10 bg-white/5 text-left active:scale-95 transition-all disabled:opacity-40 relative overflow-hidden">
                {p.imageUrl
                  ? <img src={p.imageUrl} alt="" className="w-full aspect-square object-cover" />
                  : <div className="w-full aspect-square flex items-center justify-center text-2xl bg-white/5">{p.packageKind === "uses" ? "📦" : p.packageKind === "credit" ? "💳" : "🍸"}</div>}
                <div className="p-2">
                  <p className="text-[13px] font-semibold leading-tight line-clamp-2 break-words">{p.recommended && cat !== RECOMMENDED_GROUP ? "⭐ " : ""}{p.name}</p>
                  <p className="text-xs text-amber-300">{rp(Number(p.salePrice ?? p.price))}{p.happyNow && <span className="ml-1 text-[10px] text-pink-300">🍹 {t("pos.happy.now")}</span>}</p>
                  <p className="text-[10px] text-white/40">{p.isService ? "🛎️" : p.packageKind === "uses" ? t("pos.pkg.tileUses", { n: p.packageUses || 1 }) : p.packageKind === "credit" ? t("pos.pkg.tileCredit", { n: rp(Number(p.packageCredit)) }) : t("pos.stockCount", { n: p.stock })}</p>
                </div>
                {(cart[p.id] || 0) > 0 && <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-amber-400 text-black text-xs font-bold flex items-center justify-center">{cart[p.id]}</span>}
              </button>
              {/* A whole pack in one tap, under the tile (not over it). Bundles and packages are not sold by the pack. */}
              {p.unitsPerPack > 1 && p.stock >= p.unitsPerPack && !p.bundleItemId && !p.packageKind && <button type="button" onClick={() => add(p.id, p.unitsPerPack)} title={t("pos.packBtnTitle", { n: p.unitsPerPack, price: rp(Number(p.price) * p.unitsPerPack) })} style={{ minHeight: 0, height: 32, padding: "0 8px" }} className="mt-1 w-full rounded-xl bg-amber-400 text-[12px] font-bold text-black">{t("pos.packBtn", { n: p.unitsPerPack })}</button>}
              </div>
            ))}
          </div>
        </div>
      ))}
      {products.length === 0 && <p className="text-center text-white/40 py-6 text-sm">{t("pos.noProductsPicker")}</p>}
      {lines.length > 0 && (
        <div className="sticky bottom-20 z-30 mb-3 rounded-2xl border border-amber-400/30 bg-[#160f2a] p-3 shadow-2xl lg:bottom-2">
          <div className="max-h-40 overflow-y-auto">
          {lines.map(([id, q]) => {
            const p = byId.get(Number(id))!;
            return (
              <div key={id} className="flex items-center gap-2 py-1.5">
                <span className="flex-1 text-sm">{p.name}</span>
                <button onClick={() => sub(Number(id))} style={{ width: 32, height: 32 }} className="rounded-full bg-white/15 text-white flex items-center justify-center text-xl leading-none font-bold flex-shrink-0">−</button>
                <span style={{ minWidth: 20 }} className="text-center text-sm font-bold">{q}</span>
                <button onClick={() => add(Number(id))} style={{ width: 32, height: 32 }} className="rounded-full bg-white/15 text-white flex items-center justify-center text-xl leading-none font-bold flex-shrink-0">+</button>
                <span className="w-20 text-right text-sm text-amber-300">{rp(Number(p.salePrice ?? p.price) * q)}</span>
              </div>
            );
          })}
          </div>
          <div className="flex justify-between items-center border-t border-white/10 mt-2 pt-2">
            <button onClick={() => setCart({})} className="text-xs text-red-400 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> {t("pos.clear")}</button>
            <span className="text-lg font-extrabold text-amber-300">{rp(total)}</span>
          </div>
          <button onClick={commit} disabled={busy} className="w-full py-3 rounded-xl font-bold text-black mt-2 disabled:opacity-50" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>{label} · {rp(displayTotal ?? total)}</button>
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
  const { t } = useTranslation();
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
        if (o.source === "app") { beep(); toast({ title: t("pos.newOrderTitle"), description: t("pos.newOrderDesc", { table: o.tableNumber || "—", member: o.memberName || t("pos.memberFallback"), total: rp(Number(o.total)) }) }); }
      }
    }
  }, [orders, toast]);
  const appCount = orders.filter((o) => o.source === "app").length;

  const openTicket = useMutation({
    mutationFn: () => post("/api/reborn/pos/orders", { tableNumber: table, memberCode: code || undefined, salesStaffId: sales || undefined }),
    onSuccess: (d) => { toast({ title: d.message }); setTable(""); setCode(""); setSales(""); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/orders"] }); setOpenId(d.order.id); },
    onError: (e: any) => toast({ title: t("pos.failed"), description: e.message, variant: "destructive" }),
  });

  const active = orders.find((o) => o.id === openId);
  if (openId && active) return <TicketDetail order={active} onBack={() => setOpenId(null)} />;

  return (
    <div className="lg:grid lg:grid-cols-[340px_1fr] lg:gap-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 mb-4 lg:mb-0 h-fit">
        <p className="font-bold mb-2 text-sm">{t("pos.openNew")}</p>
        <input value={table} onChange={(e) => setTable(e.target.value)} placeholder={t("pos.tableNumber")} className="w-full px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm mb-2" />
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("pos.memberLookup")} className="w-full px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm mb-2" />
        <div className="mb-2"><SalesPicker value={sales} onChange={setSales} /></div>
        <button onClick={() => openTicket.mutate()} disabled={!table.trim() || openTicket.isPending} className="w-full py-2.5 rounded-xl font-bold text-black disabled:opacity-50" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>{t("pos.openTicket")}</button>
      </div>
      <div>
        <p className="text-xs text-white/40 px-1 mb-2 flex items-center gap-2">{t("pos.openTickets")} {appCount > 0 && <span className="inline-flex items-center gap-1 text-amber-300"><Bell className="w-3 h-3" /> {t("pos.appOrders", { n: appCount })}</span>}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {orders.map((o) => (
            <button key={o.id} onClick={() => setOpenId(o.id)} className={`rounded-2xl border p-3 text-left active:scale-95 transition-all ${o.source === "app" ? "border-amber-400/50 bg-amber-400/10" : "border-white/10 bg-white/5"}`}>
              <p className="font-extrabold flex items-center gap-1">{t("pos.table", { n: o.tableNumber || "—" })}{o.source === "app" && <span className="text-[9px] font-bold text-amber-300 bg-amber-400/20 px-1 rounded">{t("pos.newBadge")}</span>}</p>
              <p className="text-xs text-white/50 truncate">{o.memberName || t("pos.walkIn")}</p>
              {o.salesStaffName && <p className="text-[10px] text-white/40 truncate">{t("pos.salesLabel", { name: o.salesStaffName })}</p>}
              <p className="text-amber-300 font-bold mt-1">{rp(Number(o.total))}</p>
            </button>
          ))}
        </div>
        {orders.length === 0 && <p className="text-center text-white/40 py-8 text-sm">{t("pos.noOpenTickets")}</p>}
      </div>
    </div>
  );
}

const emptyBottle = () => ({ enabled: false, isOwn: false, type: "beer", name: "", quantity: 1, photoUrl: "", note: "" });
const isDrink = (category = "", name = "") => /drink|beverage|beer|lager|ale|wine|whisky|whiskey|spirit|vodka|gin|rum|tequila|cocktail|bottle/i.test(`${category} ${name}`);
const bottleType = (category = "", name = "") => /whisky|whiskey|spirit|vodka|gin|rum/i.test(`${category} ${name}`) ? "whisky" : /wine/i.test(`${category} ${name}`) ? "wine" : /beer|lager|ale/i.test(`${category} ${name}`) ? "beer" : "other";
// onAddCorkage: puts a corkage service (a product marked as a service) on the bill being paid, once per bottle kept; the bill total changes before it is charged.
function KeepBottleCheckout({ value, onChange, hasMember, drinkOptions = [], onAddCorkage }: { value: any; onChange: (value: any) => void; hasMember: boolean; drinkOptions?: Array<{ name: string; category?: string }>; onAddCorkage?: (service: Product, quantity: number) => void }) {
  const { t } = useTranslation();
  const { data: allProducts = [] } = useProducts();
  const services = allProducts.filter((p) => p.isService && Number(p.salePrice ?? p.price) > 0);
  const [corkageId, setCorkageId] = useState("");
  const input = "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white";
  const unique = Array.from(new Map(drinkOptions.map((x)=>[x.name,x])).values());
  const availableTypes = value.isOwn ? ["beer", "wine", "whisky", "other"] : Array.from(new Set(unique.map((x)=>bottleType(x.category,x.name))));
  const filtered = unique.filter((x)=>bottleType(x.category,x.name)===value.type);
  useEffect(() => {
    if (!value.enabled || availableTypes.length === 0 || availableTypes.includes(value.type)) return;
    onChange({ ...value, type: availableTypes[0], name: "", photoUrl: "" });
  }, [value.enabled, value.type, availableTypes.join("|")]);
  return <div className="mb-2 rounded-xl border border-white/10 bg-black/20 p-3">
    <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={value.enabled} onChange={(e) => onChange({ ...value, enabled: e.target.checked })}/><Wine className="h-4 w-4 text-amber-300"/> {t("pos.keep.checkbox")}</label>
    {value.enabled && <div className="mt-3 space-y-2">
      {!hasMember && <p className="rounded-lg bg-red-500/10 p-2 text-xs text-red-200">{t("pos.keep.needMember")}</p>}
      <div className="grid grid-cols-[1fr_80px] gap-2"><select className={input} value={value.type} onChange={(e)=>onChange({...value,type:e.target.value,name:"",photoUrl:""})}>{availableTypes.map((type)=><option key={type} value={type}>{t(`pos.bottleType.${type}`)}</option>)}</select><input className={input} type="number" min={1} value={value.quantity} onChange={(e)=>onChange({...value,quantity:Number(e.target.value)})}/></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!value.isOwn} onChange={(e) => onChange({ ...value, isOwn: e.target.checked, name: "", photoUrl: "" })} /> {t("pos.ownBottle")}</label>
      {value.isOwn
        ? <input className={input} value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder={t("pos.ownBottleName")} />
        :       <select className={input} value={value.name} onChange={(e)=>onChange({...value,name:e.target.value})}>
          <option value="">{t("pos.keep.selectFromOrder", { type: t(`pos.bottleType.${value.type}`) })}</option>
          {filtered.map((x)=><option key={x.name} value={x.name}>{x.name}</option>)}
        </select>}
      <div className="rounded-xl border border-white/10 p-2.5">
        <p className="mb-1.5 text-xs text-white/50">🛎️ {t("pos.corkage.title")}</p>
        {services.length === 0 ? <p className="text-[11px] text-amber-200">{t("pos.corkage.noService")}</p> : (
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <select className={input} value={corkageId} onChange={(e) => setCorkageId(e.target.value)}>
              <option value="">{t("pos.corkage.none")}</option>
              {services.map((p) => <option key={p.id} value={p.id}>{p.name} · {rp(Number(p.salePrice ?? p.price))}</option>)}
            </select>
            {onAddCorkage && <button type="button" disabled={!corkageId} onClick={() => { const service = services.find((p) => String(p.id) === corkageId); if (service) { onAddCorkage(service, Math.max(1, Math.floor(Number(value.quantity) || 1))); setCorkageId(""); } }} className="rounded-xl bg-amber-400 px-3 text-xs font-bold text-black disabled:opacity-40">{t("pos.corkage.addToBill", { n: String(Math.max(1, Math.floor(Number(value.quantity) || 1))) })}</button>}
          </div>
        )}
        {!onAddCorkage && services.length > 0 && <p className="mt-1.5 text-[11px] text-white/40">{t("pos.corkage.pickAbove")}</p>}
      </div>
      {!value.isOwn && drinkOptions.length === 0 && <p className="text-xs text-amber-200">{t("pos.keep.addDrinkFirst")}</p>}
      {(value.type === "wine" || value.type === "whisky") && <div><p className="mb-1 text-xs text-white/50">{t("pos.keep.photoLevel")}</p><ImageUpload value={value.photoUrl} onChange={(photoUrl)=>onChange({...value,photoUrl})} label={t("pos.keep.uploadBottlePhoto")} /></div>}
      <input className={input} value={value.note} onChange={(e)=>onChange({...value,note:e.target.value})} placeholder={t("pos.noteOptional")}/>
    </div>}
  </div>;
}

function TicketDetail({ order, onBack }: { order: Order; onBack: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [pay, setPay] = useState<"cash" | "card" | "credits">("cash");
  const [creditBal, setCreditBal] = useState<number | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [receiptResult, setReceiptResult] = useState<any>(null);
  const { t } = useTranslation();
  const { data: products = [] } = useProducts();
  const productById = useMemo(() => new Map(products.map((p)=>[p.id,p])), [products]);
  const orderDrinks = (order.items || []).filter((item:any)=>!OFF_BILL.includes(item.status)).map((item:any)=>({ name:item.name, category:productById.get(item.productId)?.category || "" })).filter((item:any)=>isDrink(item.category,item.name));
  const [code, setCode] = useState("");
  const [sales, setSales] = useState("");
  const [discount, setDiscount] = useState(Number((order as any).discount) || 0);
  const [discPct, setDiscPct] = useState("");
  const [discReason, setDiscReason] = useState((order as any).discountReason || "");
  const [orderMode, setOrderMode] = useState<"dine_in" | "take_away">((order.orderMode as any) || "dine_in");
  const [keepBottle, setKeepBottle] = useState(emptyBottle);
  const [commission, setCommission] = useState(emptyCommission);
  const [useCredit, setUseCredit] = useState(false);
  const { data: posSettings } = usePosSettings();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/reborn/pos/orders"] });
  const addItems = useMutation({
    mutationFn: (items: any[]) => post(`/api/reborn/pos/orders/${order.id}/items`, { items }),
    onSuccess: () => { toast({ title: t("pos.addedToTicket") }); invalidate(); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); },
    onError: (e: any) => toast({ title: t("pos.failed"), description: e.message, variant: "destructive" }),
  });
  const tagMember = useMutation({
    mutationFn: () => post(`/api/reborn/pos/orders/${order.id}/member`, { memberCode: code }),
    onSuccess: (d) => { toast({ title: d.message }); setCode(""); invalidate(); },
    onError: (e: any) => toast({ title: t("pos.notFound"), description: e.message, variant: "destructive" }),
  });
  const payNow = useMutation({
    mutationFn: () => post(`/api/reborn/pos/orders/${order.id}/pay`, { paymentMethod: pay, paymentReference: paymentReference.trim() || undefined, cashReceived: pay === "cash" ? Number(cashReceived) : undefined, salesStaffId: sales || undefined, discount, orderMode, keepBottle, usePackageCredit: useCredit, commission: commissionToSend(commission) }),
    onSuccess: async (d) => {
      if (pay === "cash") { const ok = await openCashDrawer(); if (!ok && drawerConfigured()) toast({ title: t("pos.drawerNotOpened"), description: t("pos.checkDrawerSetup") }); }
      if (d.receipt?.autoPrint && d.order) printReceipt(d.order, d.receipt || {});
      toast({ title: t("pos.paid"), description: d.message }); setReceiptResult(d);
    },
    onError: (e: any) => toast({ title: t("pos.failed"), description: e.message, variant: "destructive" }),
  });
  const cancel = useMutation({
    mutationFn: () => post(`/api/reborn/pos/orders/${order.id}/cancel`),
    onSuccess: (d) => { toast({ title: d.message }); invalidate(); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); onBack(); },
    onError: (e: any) => toast({ title: t("pos.failed"), description: e.message, variant: "destructive" }),
  });
  // Accept / reject / served shows on the ticket the moment it is tapped (the button it was
  // tapped on is gone, so it cannot be tapped twice); the server's answer follows, and a
  // failed save puts the ticket back as it was.
  const itemStatus = useMutation({
    mutationFn: (v: { id: number; status: string; reason?: string }) => post(`/api/reborn/pos/items/${v.id}/status`, { status: v.status, reason: v.reason }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: OPEN_TICKETS, exact: true });
      const ticketsBefore = qc.getQueryData<Order[]>(OPEN_TICKETS);
      qc.setQueryData<Order[]>(OPEN_TICKETS, (tickets) => tickets?.map((ticket) => ticket.id !== order.id ? ticket : {
        ...ticket,
        items: (ticket.items || []).map((item: any) => item.id === v.id ? { ...item, status: v.status, rejectReason: v.reason ?? item.rejectReason } : item),
      }));
      return { ticketsBefore };
    },
    onSuccess: (d: any) => { toast({ title: d.message }); },
    onError: (e: any, _v, context) => {
      if (context?.ticketsBefore) qc.setQueryData(OPEN_TICKETS, context.ticketsBefore);
      toast({ title: t("pos.failed"), description: e.message, variant: "destructive" });
    },
    onSettled: () => { invalidate(); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); },
  });
  const [ask, setAsk] = useState<{ kind: "remove" | "lose"; item: any } | null>(null);
  // Removing or losing a line shows at once (the bill and the total follow); the server's answer then confirms it, or the line comes back.
  const itemEdit = useMutation({
    mutationFn: (v: { id: number; op: string; body?: any }) => post(`/api/reborn/pos/items/${v.id}/${v.op}`, v.body || {}),
    onMutate: async (v) => {
      if (v.op !== "remove" && v.op !== "lose") return undefined;
      await qc.cancelQueries({ queryKey: OPEN_TICKETS });
      const ticketsBefore = qc.getQueryData<any[]>(OPEN_TICKETS);
      qc.setQueryData<any[]>(OPEN_TICKETS, (list = []) => list.map((ticket: any) => {
        if (!(ticket.items || []).some((item: any) => item.id === v.id)) return ticket;
        const items = (ticket.items || []).flatMap((item: any) => {
          if (item.id !== v.id) return [item];
          if (v.op === "lose") return [{ ...item, status: "lost", rejectReason: v.body?.reason || item.rejectReason }];
          return item.source === "app" ? [{ ...item, status: "rejected", rejectReason: v.body?.reason || "Removed by staff" }] : [];
        });
        const total = items.filter((item: any) => !OFF_BILL.includes(item.status)).reduce((sum: number, item: any) => sum + Number(item.lineTotal), 0);
        return { ...ticket, items, subtotal: String(total), total: String(total) };
      }));
      return { ticketsBefore };
    },
    onSuccess: (d: any) => { toast({ title: d.message }); invalidate(); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); },
    onError: (e: any, _v, context) => {
      if (context?.ticketsBefore) qc.setQueryData(OPEN_TICKETS, context.ticketsBefore);
      toast({ title: t("pos.failed"), description: e.message, variant: "destructive" });
    },
  });
  const renameTable = useMutation({
    mutationFn: (tableNumber: string) => post(`/api/reborn/pos/orders/${order.id}/table`, { tableNumber }),
    onSuccess: (d: any) => { toast({ title: d.message }); invalidate(); }, onError: (e: any) => toast({ title: t("pos.failed"), description: e.message, variant: "destructive" }),
  });
  const setBillDiscount = useMutation({
    mutationFn: (v: { amount?: number; percent?: number; reason?: string }) => post(`/api/reborn/pos/orders/${order.id}/discount`, v),
    onSuccess: (d: any) => { toast({ title: d.message }); setDiscount(d.amount ?? 0); setDiscPct(""); invalidate(); }, onError: (e: any) => toast({ title: t("pos.failed"), description: e.message, variant: "destructive" }),
  });
  const mergeInto = useMutation({
    mutationFn: (intoId: number) => post(`/api/reborn/pos/orders/${order.id}/merge`, { intoId }),
    onSuccess: (d: any) => { toast({ title: d.message }); invalidate(); onBack(); }, onError: (e: any) => toast({ title: t("pos.failed"), description: e.message, variant: "destructive" }),
  });
  const { data: openTickets = [] } = useQuery<any[]>({ queryKey: ["/api/reborn/pos/orders"], queryFn: () => apiRequest("GET", "/api/reborn/pos/orders?status=open").then((r) => r.json()) });
  const subtotal = Number(order.subtotal ?? order.total);
  // The server's quote adds the member's perk and package credit (lib: server/memberPackages.ts).
  const quote = useQuote({ ticketId: order.id, discount, usePackageCredit: useCredit, v: `${order.total}:${(order.items || []).length}:${order.memberCode || ""}` }, true);
  const due = quoteTotals(quote, billTotals(subtotal, discount, posSettings));
  const total = due.total;
  const payable = due.payable;
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-white/60 text-sm mb-3"><ChevronLeft className="w-4 h-4" /> {t("pos.allTables")}</button>
      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6">
        <div>
          <p className="text-xs text-white/40 px-1 mb-2">{t("pos.addItems")}</p>
          <ProductPicker label={t("pos.addToTicket")} busy={addItems.isPending} onCommit={(items) => addItems.mutate(items)} />
        </div>
        <div className="lg:sticky lg:top-20 h-fit">
          <div className="rounded-2xl border border-amber-400/30 bg-white/5 p-4 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-extrabold flex items-center gap-2">{t("pos.table", { n: order.tableNumber || "—" })}
                  <button onClick={() => { const tn = prompt(t("pos.promptChangeTable"), order.tableNumber || ""); if (tn && tn.trim()) renameTable.mutate(tn.trim()); }} title={t("pos.changeTableTitle")} aria-label={t("pos.changeTableTitle")} className="text-white/40 hover:text-white text-xs">✏️</button>
                </p>
                <p className="text-xs text-white/50">{order.orderNo} · {order.memberName || t("pos.noMember")}</p>
              </div>
              <span className="text-xl font-extrabold text-amber-300">{rp(total)}</span>
            </div>
            {order.items && order.items.length > 0 && (
              <div className="mt-3 border-t border-white/10 pt-2 text-sm text-white/70 max-h-72 overflow-y-auto space-y-1.5">
                {order.items.map((it: any) => (
                  <div key={it.id} className={`${it.status === "rejected" ? "opacity-50" : ""}`}>
                    <div className="flex justify-between py-0.5">
                      <span className={it.status === "rejected" ? "line-through" : ""}>{it.qty}× {it.name}{it.addedByName && <span className="block text-[10px] font-normal text-white/40">{t("pos.item.by", { n: it.addedByName, time: it.addedAt ? new Date(it.addedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "" })}</span>}
                        {it.status === "pending" && <span className="ml-1 text-[10px] text-amber-300 bg-amber-400/20 px-1 rounded">{t("pos.newBadge")}</span>}
                        {it.status === "served" && <span className="ml-1 text-[10px] text-emerald-300">{t("pos.item.served")}{it.servedByName ? ` · ${it.servedByName}` : ""}</span>}
                        {it.status === "rejected" && <span className="ml-1 text-[10px] text-red-300">✕ {it.rejectReason}</span>}
                        {it.status === "lost" && <span className="ml-1 text-[10px] text-orange-300">⚠ {t("pos.item.lostTag")}: {it.rejectReason}</span>}
                      </span>
                      <span>{rp(Number(it.lineTotal))}</span>
                    </div>
                    {it.status === "pending" && (
                      <div className="flex gap-1.5 pb-1">
                        <button onClick={() => itemStatus.mutate({ id: it.id, status: "accepted" })} className="px-2 py-1 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">{t("pos.item.accept")}</button>
                        <button onClick={() => { const reason = prompt(t("pos.item.rejectPrompt"), t("pos.item.rejectDefault")) || t("pos.item.unavailable"); itemStatus.mutate({ id: it.id, status: "rejected", reason }); }} className="px-2 py-1 rounded-md text-[11px] font-semibold bg-red-500/15 text-red-200 border border-red-400/40">{t("pos.item.reject")}</button>
                      </div>
                    )}
                    {!OFF_BILL.includes(it.status) && (
                      <div className="flex flex-wrap gap-1.5 pb-1">
                        {it.status === "ready" && <><span className="ml-1 text-[10px] text-pink-300">{t("pos.item.ready")}{it.readyByName ? ` · ${t("pos.item.by2", { n: it.readyByName })}` : ""}</span> <button onClick={() => itemStatus.mutate({ id: it.id, status: "served" })} className="px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-500 text-black">{t("pos.item.collected")}</button></>}
                        {it.status === "accepted" && <button onClick={() => itemStatus.mutate({ id: it.id, status: "served" })} className="px-2 py-1 rounded-md text-[11px] font-semibold bg-white/10 text-white/70">{t("pos.item.markServed")}</button>}
                        <button onClick={() => { const p = prompt(t("pos.item.pricePrompt", { name: it.name }), String(Number(it.price))); if (p !== null) itemEdit.mutate({ id: it.id, op: "edit", body: { price: Number(p) } }); }} className="px-2 py-1 rounded-md text-[11px] font-semibold bg-white/10 text-white/60">{t("pos.item.price")}</button>
                        <button onClick={() => { const q = prompt(t("pos.item.qtyPrompt", { name: it.name }), String(it.qty)); if (q !== null) itemEdit.mutate({ id: it.id, op: "edit", body: { qty: Number(q) } }); }} className="px-2 py-1 rounded-md text-[11px] font-semibold bg-white/10 text-white/60">{t("pos.qtyShort")}</button>
                        <button onClick={() => { const tn = prompt(t("pos.item.movePrompt", { name: it.name }), ""); if (tn && tn.trim()) itemEdit.mutate({ id: it.id, op: "move", body: { tableNumber: tn.trim() } }); }} className="px-2 py-1 rounded-md text-[11px] font-semibold bg-white/10 text-white/60">{t("pos.item.move")}</button>
                        <button onClick={() => setAsk({ kind: "remove", item: it })} className="px-2 py-1 rounded-md text-[11px] font-semibold bg-red-500/15 text-red-200">{t("pos.item.remove")}</button>
                        {it.status !== "pending" && <button onClick={() => setAsk({ kind: "lose", item: it })} className="px-2 py-1 rounded-md text-[11px] font-semibold bg-orange-500/15 text-orange-200">{t("pos.item.lose")}</button>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!order.memberName && (
              <div className="flex gap-2 mt-3">
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("pos.tagMember")} className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm" />
                <button onClick={() => tagMember.mutate()} disabled={!code.trim() || tagMember.isPending} className="px-4 rounded-xl bg-white/10 disabled:opacity-50"><UserCheck className="w-4 h-4" /></button>
              </div>
            )}
          </div>
          {/* Merge this bill into another open table */}
          {openTickets.filter((tk: any) => tk.id !== order.id).length > 0 && (
            <div className="flex gap-2 mb-3">
              <select id={`merge-${order.id}`} className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm">
                <option value="">{t("pos.mergeInto")}</option>
                {openTickets.filter((tk: any) => tk.id !== order.id).map((tk: any) => <option key={tk.id} value={tk.id}>{t("pos.table", { n: tk.tableNumber || "—" })} ({rp(Number(tk.total))})</option>)}
              </select>
              <button onClick={() => { const el = document.getElementById(`merge-${order.id}`) as HTMLSelectElement; const into = Number(el?.value); if (into && confirm(t("pos.mergeConfirm"))) mergeInto.mutate(into); }} className="px-4 rounded-xl bg-white/10 text-sm font-semibold">{t("pos.merge")}</button>
            </div>
          )}
          <button onClick={() => printKitchen({ ...order })} className="w-full py-2.5 rounded-xl bg-white/10 border border-white/10 text-sm font-semibold mb-3 flex items-center justify-center gap-2"><Printer className="w-4 h-4" /> {t("pos.printKitchen")}</button>
          <div className="rounded-2xl border border-white/10 bg-[#160f2a] p-3">
            <p className="font-bold text-sm mb-2">{t("pos.takePayment", { amount: rp(total) })}</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {(["dine_in", "take_away"] as const).map((m) => (
                <button key={m} onClick={() => setOrderMode(m)} className={`py-2 rounded-xl border font-semibold text-xs ${orderMode === m ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/10 bg-black/30 text-white/60"}`}>{t(`pos.mode.${m}`)}</button>
              ))}
            </div>
            <div className="mb-2"><SalesPicker value={sales} onChange={setSales} /></div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-2 mb-2">
              <p className="text-xs text-white/50 mb-1">{t("pos.discount")} {(order as any).discountReason ? <span className="text-amber-300">· {(order as any).discountReason}</span> : ""}</p>
              <div className="flex gap-2 mb-2">
                <input type="number" min={0} value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))} placeholder={t("pos.rpAmount")} className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm" />
                <input type="number" min={0} max={100} value={discPct} onChange={(e) => setDiscPct(e.target.value)} placeholder="%" className="w-16 px-2 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm" />
              </div>
              <input value={discReason} onChange={(e) => setDiscReason(e.target.value)} placeholder={t("pos.reasonOptional")} className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm mb-2" />
              <button onClick={() => setBillDiscount.mutate(discPct ? { percent: Number(discPct), reason: discReason } : { amount: discount, reason: discReason })} className="w-full py-2 rounded-xl bg-white/10 text-sm font-semibold">{t("pos.applyDiscount")}</button>
            </div>
            <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
              {(["cash", "card", "credits"] as const).map((m) => (
                <button key={m} onClick={() => setPay(m)} className={`py-2.5 rounded-xl border font-semibold text-sm capitalize ${pay === m ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/10 bg-black/30 text-white/60"}`}>{t(`pos.pay.${m}`)}</button>
              ))}
            </div>
            <MemberWallet code={order.memberCode} quote={quote} useCredit={useCredit} onUseCredit={setUseCredit} ticketId={order.id} />
            <BillSummary due={due} settings={posSettings} />
            {payable > 0 && pay === "credits" && <CreditsLine code={order.memberCode} total={payable} onBalance={setCreditBal} />}
            {payable > 0 && pay === "card" && <label className="mb-2 block text-xs text-white/60">{t("pos.cardRef")}<input value={paymentReference} onChange={(e)=>setPaymentReference(e.target.value)} placeholder={t("pos.cardRefRequired")} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white" /></label>}
            {payable > 0 && pay === "cash" && <div className="mb-2 grid grid-cols-2 gap-2"><label className="block text-xs text-white/60">{t("pos.cashReceived")}<input type="number" min={payable} value={cashReceived} onChange={(e)=>setCashReceived(e.target.value)} placeholder={String(payable)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white" /></label><div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3"><p className="text-[11px] text-white/50">{t("pos.change")}</p><p className="font-extrabold text-emerald-300">{rp(Math.max(0,Number(cashReceived||0)-payable))}</p></div></div>}
            <CommissionBox value={commission} onChange={setCommission} base={due.taxable} />
            <button onClick={() => printBill({ ...order, subtotal, discount: Math.max(0, subtotal - due.taxable), serviceFee: due.serviceFee, tax: due.tax, total: due.total, packageCreditUsed: due.creditUse, items: (order.items || []).filter((item: any) => !OFF_BILL.includes(item.status)) } as any, savedReceiptMeta())} className="w-full py-2.5 rounded-xl mb-2 text-sm font-semibold bg-white/10 border border-white/10">🧾 {t("pos.bill.print")}</button>
            <KeepBottleCheckout value={keepBottle} onChange={setKeepBottle} hasMember={!!order.memberName} drinkOptions={orderDrinks} onAddCorkage={(service, quantity) => addItems.mutate([{ productId: service.id, name: service.name, price: Number(service.salePrice ?? service.price), qty: quantity }])}/>
            <button onClick={() => payNow.mutate()} disabled={payNow.isPending || total <= 0 || (quote?.hasPackages && !order.memberCode) || (payable > 0 && ((pay === "card" && !paymentReference.trim()) || (pay === "cash" && Number(cashReceived) < payable) || (pay === "credits" && (creditBal === null || creditBal < payable)))) || (keepBottle.enabled && (!keepBottle.name || ((keepBottle.type === "wine" || keepBottle.type === "whisky") && !keepBottle.photoUrl)))} className="w-full py-3 rounded-xl font-bold text-black disabled:opacity-50" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>{payable > 0 ? t("pos.chargeAmount", { amount: rp(payable), method: t(`pos.pay.${pay}`) }) : t("pos.pkg.payAllCredit", { amount: rp(total) })}</button>
            <button onClick={() => { if (confirm(t("pos.cancelConfirm"))) cancel.mutate(); }} disabled={cancel.isPending} className="w-full py-2.5 rounded-xl text-red-300 text-sm mt-2 border border-red-400/30 bg-red-500/10">{t("pos.cancelTicket")}</button>
          </div>
        </div>
      </div>
      {receiptResult && <ReceiptPreview order={receiptResult.order} meta={receiptResult.receipt} onDone={()=>{setReceiptResult(null);invalidate();onBack();}} />}
      {ask && <ReasonDialog
        title={t(ask.kind === "lose" ? "pos.item.loseTitle" : "pos.item.removeTitle", { name: ask.item.name })}
        hint={ask.kind === "lose" ? t("pos.item.loseHint") : undefined}
        confirmLabel={t(ask.kind === "lose" ? "pos.item.lose" : "pos.item.remove")}
        isDanger
        onCancel={() => setAsk(null)}
        onConfirm={(reason) => { itemEdit.mutate({ id: ask.item.id, op: ask.kind, body: { reason } }); setAsk(null); }} />}
    </div>
  );
}

// ── Quick sale ──────────────────────────────────────────────────────────────
function QuickSaleTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [member, setMember] = useState<any>(null);
  const [pay, setPay] = useState<"cash" | "card" | "credits">("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [receiptResult, setReceiptResult] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const { t } = useTranslation();
  const [sales, setSales] = useState("");
  const [discount, setDiscount] = useState(0);
  const [orderMode, setOrderMode] = useState<"dine_in" | "take_away">("dine_in");
  const [keepBottle, setKeepBottle] = useState(emptyBottle);
  const [useCredit, setUseCredit] = useState(false);
  const { data: posSettings } = usePosSettings();
  const [commission, setCommission] = useState(emptyCommission);
  const cartSubtotal = cartItems.reduce((sum,item)=>sum+Number(item.price)*Number(item.qty),0);
  const quote = useQuote({ items: cartItems.map((x) => ({ productId: x.id, price: Number(x.price), qty: x.qty })), memberCode: member?.code || "", discount, usePackageCredit: useCredit }, cartItems.length > 0);
  const due = quoteTotals(cartItems.length ? quote : null, billTotals(cartSubtotal, discount, posSettings));
  const payable = due.payable;
  const lookup = useMutation({
    mutationFn: () => apiRequest("GET", `/api/reborn/pos/member/${encodeURIComponent(code.trim())}`).then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
    onSuccess: ({ ok, d }) => { if (ok) { setMember(d); toast({ title: t("pos.memberFound"), description: d.name }); } else toast({ title: t("pos.notFound"), description: d.message, variant: "destructive" }); },
  });
  const { isOffline } = useOfflineSales();
  const sell = useMutation({
    mutationFn: async (items: any[]) => {
      const outcome = await submitSale({ memberCode: member?.code || undefined, paymentMethod: pay, paymentReference: paymentReference.trim() || undefined, cashReceived: pay === "cash" ? Number(cashReceived) : undefined, salesStaffId: sales || undefined, discount, orderMode, keepBottle, items, usePackageCredit: useCredit, commission: commissionToSend(commission) }, { label: t("pos.offline.items", { n: items.length }), total: payable });
      if (!outcome.queued) return outcome.data;
      // Saved on this device: a receipt is made from the numbers on the screen (the server prices it again when it is sent).
      const cashIn = Number(cashReceived) || 0;
      const order = { id: 0, orderNo: `OFFLINE-${outcome.sale.offlineId.slice(0, 6).toUpperCase()}`, orderMode, subtotal: cartSubtotal, discount, serviceFee: due.serviceFee, tax: due.tax, total: due.total, paymentMethod: pay, paymentReference: paymentReference.trim() || undefined, cashReceived: cashIn, changeGiven: pay === "cash" ? Math.max(0, cashIn - due.total) : 0, paidAt: outcome.sale.at, ...commissionPreview(commission, due.taxable),
        items: items.map((it: any) => ({ name: it.name, qty: it.qty, price: Number(it.price), lineTotal: Number(it.price) * Number(it.qty) })) };
      return { queued: true, order, receipt: savedReceiptMeta(), message: t("pos.offline.savedToast") };
    },
    onSuccess: async (d) => {
      if (pay === "cash") await openCashDrawer();
      if (d.receipt?.autoPrint && d.order) printReceipt(d.order, d.receipt || {});
      toast({ title: t("pos.saleComplete"), description: d.message }); setReceiptResult(d); setMember(null); setCode(""); setDiscount(0); setUseCredit(false); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/packages"] }); setPaymentReference(""); setCashReceived(""); setKeepBottle(emptyBottle()); setCommission(emptyCommission()); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] });
    },
    onError: (e: any) => toast({ title: t("pos.failed"), description: e.message, variant: "destructive" }),
  });
  return (
    <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-6">
      <div className="order-2 lg:order-1">
        <ProductPicker label={payable > 0 || !cartItems.length ? t("pos.chargeMethod", { method: t(`pos.pay.${pay}`) }) : t("pos.pkg.payAllCredit", { amount: rp(due.total) })} displayTotal={payable} busy={sell.isPending || (quote?.hasPackages && !member) || (payable > 0 && ((pay === "credits" && (!member || Number(member.credits || 0) < payable)) || (pay === "card" && !paymentReference.trim()) || (pay === "cash" && Number(cashReceived) < payable))) || (keepBottle.enabled && (!keepBottle.name || ((keepBottle.type === "wine" || keepBottle.type === "whisky") && !keepBottle.photoUrl)))} onCartChange={setCartItems} onCommit={(items) => sell.mutate(items)} />
      </div>
      <div className="order-1 lg:order-2 mb-3 lg:mb-0 space-y-3 h-fit">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          {member ? (
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              <div className="flex-1"><p className="font-semibold text-sm">{member.name}</p><p className="text-xs text-white/50">{member.code} · {t("pos.points", { n: member.loyaltyPoints })}</p></div>
              <button onClick={() => setMember(null)} aria-label={t("pos.removeMember")} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("pos.memberLookup")} className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm" />
              <button onClick={() => lookup.mutate()} aria-label={t("pos.findMember")} disabled={!code.trim() || lookup.isPending} className="px-4 rounded-xl bg-white/10 disabled:opacity-50"><Search className="w-4 h-4" /></button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["dine_in", "take_away"] as const).map((m) => (
            <button key={m} onClick={() => setOrderMode(m)} className={`py-2 rounded-xl border font-semibold text-xs ${orderMode === m ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/10 bg-black/30 text-white/60"}`}>{t(`pos.mode.${m}`)}</button>
          ))}
        </div>
        <SalesPicker value={sales} onChange={setSales} />
        <label className="text-xs text-white/50 block">{t("pos.discountRp")}<input type="number" min={0} value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))} className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm" /></label>
        <MemberWallet code={member?.code} quote={cartItems.length ? quote : null} useCredit={useCredit} onUseCredit={setUseCredit} />
        {cartSubtotal>0&&<BillSummary due={due} settings={posSettings} />}
        <CommissionBox value={commission} onChange={setCommission} base={due.taxable} />
        <KeepBottleCheckout value={keepBottle} onChange={setKeepBottle} hasMember={!!member} drinkOptions={cartItems.filter((x)=>isDrink(x.category,x.name)).map((x)=>({name:x.name,category:x.category}))}/>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${isOffline ? 2 : 3}, minmax(0, 1fr))` }}>
          {(["cash", "card", "credits"] as const).filter((m) => m !== "credits" || !isOffline).map((m) => (
            <button key={m} onClick={() => setPay(m)} className={`py-2.5 rounded-xl border font-semibold text-sm capitalize ${pay === m ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/10 bg-black/30 text-white/60"}`}>{t(`pos.pay.${m}`)}</button>
          ))}
        </div>
        {payable > 0 && pay === "credits" && <CreditsLine code={member?.code} total={payable} onBalance={() => {}} />}
        {pay === "card" && <label className="block text-xs text-white/60">{t("pos.cardRef")}<input value={paymentReference} onChange={(e)=>setPaymentReference(e.target.value)} placeholder={t("pos.cardRefRequired")} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white" /></label>}
        {pay === "cash" && <div className="grid grid-cols-2 gap-2"><label className="block text-xs text-white/60">{t("pos.cashReceived")}<input type="number" min={0} value={cashReceived} onChange={(e)=>setCashReceived(e.target.value)} placeholder={t("pos.required")} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white" /></label><div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3"><p className="text-[11px] text-white/50">{t("pos.change")}</p><p className="font-extrabold text-emerald-300">{rp(Math.max(0,Number(cashReceived||0)-payable))}</p></div></div>}
        <p className="text-[11px] text-white/40 text-center">{t("pos.receiptNote")}</p>
      </div>
      {receiptResult && <ReceiptPreview order={receiptResult.order} meta={receiptResult.receipt} onDone={()=>setReceiptResult(null)} />}
    </div>
  );
}

// ── Stock ─────────────────────────────────────────────────────────────────
// Today's paid bills with same-day refund (before the POS day is closed).
function SalesTodayTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: orders = [], isLoading } = useQuery<Order[]>({ queryKey: ["/api/reborn/pos/orders", "paid"], queryFn: () => apiRequest("GET", "/api/reborn/pos/orders?status=paid").then((r) => r.json()) });
  const { data: refunded = [] } = useQuery<Order[]>({ queryKey: ["/api/reborn/pos/orders", "refunded"], queryFn: () => apiRequest("GET", "/api/reborn/pos/orders?status=refunded").then((r) => r.json()) });
  const { t, language } = useTranslation();
  const [day, setDay] = useState(() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; });
  const shownDay = new Date(`${day}T00:00:00`).toDateString();
  const isToday = (o: any) => new Date(o.paidAt || (o as any).createdAt || Date.now()).toDateString() === shownDay;
  const paidToday = orders.filter(isToday);
  const refundedToday = refunded.filter(isToday);
  const all = [...paidToday, ...refundedToday].sort((a: any, b: any) => new Date(b.paidAt || b.createdAt).getTime() - new Date(a.paidAt || a.createdAt).getTime());
  const totalSales = paidToday.reduce((s, o) => s + Number(o.total), 0);
  const totalRefunded = refundedToday.reduce((s, o) => s + Number(o.total), 0);
  const refund = useMutation({
    mutationFn: (v: { id: number; reason: string }) => apiRequest("POST", `/api/reborn/pos/orders/${v.id}/refund`, { reason: v.reason }).then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
    onSuccess: ({ ok, d }: any) => { if (!ok) { toast({ title: t("pos.cannotRefund"), description: d.message, variant: "destructive" }); return; } toast({ title: d.message }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/orders"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); },
    onError: (e: any) => toast({ title: t("pos.failed"), description: e.message, variant: "destructive" }),
  });
  const doRefund = (o: any) => { const reason = prompt(t("pos.refundPrompt", { orderNo: o.orderNo, total: rp(Number(o.total)) }), t("pos.refundDefault")); if (reason && reason.trim()) refund.mutate({ id: o.id, reason: reason.trim() }); };
  return (
    <div className="max-w-2xl space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-3"><p className="text-[11px] text-white/45">{t("pos.todaysSales")}</p><p className="text-lg font-extrabold text-emerald-300">{rp(totalSales)}</p></div>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-3"><p className="text-[11px] text-white/45">{t("pos.bills")}</p><p className="text-lg font-extrabold">{paidToday.length}</p></div>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-3"><p className="text-[11px] text-white/45">{t("pos.refunded")}</p><p className="text-lg font-extrabold text-red-300">{rp(totalRefunded)}</p></div>
      </div>
      <label className="flex items-center gap-2 text-xs text-white/60">{t("pos.sales.day")}<input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white" /></label>
      <p className="text-[11px] text-white/40">{t("pos.refundInfo")}</p>
      {isLoading && <p className="text-sm text-white/40">{t("pos.loading")}</p>}
      {!isLoading && all.length === 0 && <p className="text-sm text-white/40 py-8 text-center">{t("pos.noSalesToday")}</p>}
      {all.map((o: any) => {
        const isRef = o.status === "refunded";
        const items = (o.items || []).filter((it: any) => !OFF_BILL.includes(it.status));
        return (
          <div key={o.id} className={`rounded-2xl border p-3 ${isRef ? "border-red-400/30 bg-red-500/5" : "border-white/10 bg-white/5"}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-sm">{o.orderNo}{o.tableNumber ? ` · ${t("pos.table", { n: o.tableNumber })}` : ""}{isRef && <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-200">{t("pos.refunded")}</span>}</p>
                <p className="text-[11px] text-white/45">{new Date(o.paidAt || o.createdAt).toLocaleTimeString(localeTag(language), { hour: "numeric", minute: "2-digit" })} · {tOr(t, `pos.pay.${o.paymentMethod || "cash"}`, o.paymentMethod || "cash")}{o.salesStaffName ? ` · ${o.salesStaffName}` : ""}{o.memberName ? ` · ${o.memberName}` : ""}</p>
                <p className="text-[11px] text-white/40 truncate">{items.map((it: any) => `${it.qty}× ${it.name}`).join(", ")}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`font-extrabold ${isRef ? "text-white/40 line-through" : ""}`}>{rp(Number(o.total))}</p>
                <button onClick={() => printReceipt(o, savedReceiptMeta(), { duplicate: true })} className="mt-1 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white/10 border border-white/15">🧾 {t("pos.sales.printDuplicate")}</button>
                {!isRef && <button onClick={() => doRefund(o)} disabled={refund.isPending} className="mt-1 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-red-500/15 text-red-200 border border-red-400/40 disabled:opacity-50"><RotateCcw className="w-3 h-3" /> {t("pos.refund")}</button>}
              </div>
            </div>
            {isRef && o.refundReason && <p className="text-[11px] text-red-300/80 mt-1">{t("pos.reasonLabel", { reason: o.refundReason })}</p>}
          </div>
        );
      })}
    </div>
  );
}

function StockTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [sel, setSel] = useState<number | null>(null);
  const [dir, setDir] = useState<"add" | "deduct">("add");
  const [qty, setQty] = useState(10);
  const [unitCost, setUnitCost] = useState(0);
  const [note, setNote] = useState("");
  const { t } = useTranslation();
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/reborn/pos/stock"], queryFn: () => apiRequest("GET", "/api/reborn/pos/stock").then((r) => r.json()) });
  const [industry, setIndustry] = useState("");
  const industries = useMemo(() => Array.from(new Set(products.flatMap((p) => deptList(p.department)))).sort() as string[], [products]);
  const groups = useMemo(() => {
    const g: Record<string, Product[]> = {};
    for (const p of products) { if (industry && !deptHas(p.department, industry)) continue; (g[p.category || ""] ||= []).push(p); }
    return Object.entries(g);
  }, [products, industry]);
  const adjust = useMutation({
    mutationFn: () => post("/api/reborn/pos/stock-in", { productId: sel, qty: dir === "add" ? qty : -qty, unitCost: dir === "add" ? unitCost : 0, note: note || (dir === "deduct" ? "Manual deduct" : "Manual add") }),
    onSuccess: (d) => { toast({ title: t("pos.stockUpdated"), description: d.message }); setSel(null); setQty(10); setUnitCost(0); setNote(""); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/stock"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); },
    onError: (e: any) => toast({ title: t("pos.failed"), description: e.message, variant: "destructive" }),
  });
  return (
    <div className="space-y-4">
      {industries.length > 0 && <div className="flex items-center gap-2 flex-wrap"><span className="text-xs text-white/50">{t("pos.industry")}</span>{["", ...industries].map((d) => <button key={d || "all"} onClick={() => setIndustry(d)} className={`rounded-full px-3 py-1 text-xs ${industry === d ? "bg-amber-400 text-black font-bold" : "bg-white/5 text-white/60"}`}>{d || t("pos.all")}</button>)}</div>}
      {groups.map(([cat, items]) => (
        <div key={cat}>
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 px-1">{cat || t("pos.other")}</p>
          {/* Columns always fit the screen; cards may shrink so long names truncate. */}
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))" }}>
            {items.map((p) => (
              <div key={p.id} className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-1 items-center gap-2 min-w-0">
                    {p.imageUrl && <img src={p.imageUrl} alt="" className="w-9 h-9 shrink-0 rounded-lg object-cover" />}
                    <div className="min-w-0"><p className="font-semibold text-sm truncate">{p.name}</p><p className={`text-xs ${p.stock <= 5 ? "text-red-400" : "text-white/50"}`}>{t("pos.stockCount", { n: p.stock })}{p.stock <= 5 ? t("pos.lowStock") : ""}</p></div>
                  </div>
                  <button onClick={() => { setSel(sel === p.id ? null : p.id); setDir("add"); }} title={t("pos.adjustStock")} aria-label={t("pos.adjustStock")} className="px-3 py-2 rounded-xl bg-white/10 text-sm font-semibold flex items-center gap-1 flex-shrink-0"><PackagePlus className="w-4 h-4" /></button>
                </div>
                {sel === p.id && (
                  <div className="mt-3">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <button onClick={() => setDir("add")} className={`py-2 rounded-xl border text-sm font-semibold ${dir === "add" ? "border-emerald-400 bg-emerald-400/15 text-emerald-200" : "border-white/10 bg-black/30 text-white/60"}`}>{t("pos.add")}</button>
                      <button onClick={() => setDir("deduct")} className={`py-2 rounded-xl border text-sm font-semibold ${dir === "deduct" ? "border-red-400 bg-red-400/15 text-red-200" : "border-white/10 bg-black/30 text-white/60"}`}>{t("pos.deduct")}</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-[11px] text-white/50">{t("pos.quantity")}</label><input type="number" value={qty} onChange={(e) => setQty(Math.abs(Number(e.target.value)))} className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm" /></div>
                      {dir === "add"
                        ? <div><label className="text-[11px] text-white/50">{t("pos.unitCost")}</label><input type="number" value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm" /></div>
                        : <div><label className="text-[11px] text-white/50">{t("pos.reason")}</label><input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("pos.wastage")} className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm" /></div>}
                      <button onClick={() => adjust.mutate()} disabled={adjust.isPending || qty === 0} className="col-span-2 py-2.5 rounded-xl font-bold text-black disabled:opacity-50" style={{ background: dir === "add" ? "linear-gradient(90deg,#c9a84c,#f0d787)" : "linear-gradient(90deg,#f87171,#fca5a5)" }}>{dir === "add" ? t("pos.addQtyCost", { n: qty, cost: rp(qty * unitCost) }) : t("pos.deductQty", { n: qty })}</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      {products.length === 0 && <p className="text-center text-white/40 py-10 text-sm">{t("pos.noProductsStock")}</p>}
    </div>
  );
}

// ── Bottle keep ─────────────────────────────────────────────────────────────
function BottlesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [f, setF] = useState({ memberCode: "", type: "beer", name: "", quantity: 1, photoUrl: "", note: "" });
  const [isOwn, setIsOwn] = useState(false); // the customer brought the bottle: any name, and a corkage service can go on the bill
  const [corkage, setCorkage] = useState({ productId: "", tableNumber: "" });
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [q, setQ] = useState("");
  const { t } = useTranslation();
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
    mutationFn: () => post("/api/reborn/pos/bottle-keep", { ...f, isOwn, ...(corkage.productId ? { corkage: { productId: Number(corkage.productId), tableNumber: corkage.tableNumber } } : {}) }),
    onSuccess: (d) => { toast({ title: d.message }); setF({ memberCode: "", type: "beer", name: "", quantity: 1, photoUrl: "", note: "" }); setCorkage({ productId: "", tableNumber: "" }); setSelectedMember(null); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/bottle-keeps"] }); },
    onError: (e: any) => toast({ title: t("pos.failed"), description: e.message, variant: "destructive" }),
  });
  const collect = useMutation({
    mutationFn: (id: number) => post(`/api/reborn/pos/bottle-keeps/${id}/collect`, {}),
    onSuccess: (d) => { toast({ title: d.message }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/bottle-keeps"] }); },
    onError: (e: any) => toast({ title: t("pos.failed"), description: e.message, variant: "destructive" }),
  });
  const inp = "w-full px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm";
  const services = products.filter((p: any) => p.isService && Number(p.price) > 0);
  const drinks = products.filter((p)=>isDrink(p.category,p.name));
  const drinkTypes = isOwn ? ["beer", "wine", "whisky", "other"] : Array.from(new Set(drinks.map((p)=>bottleType(p.category,p.name))));
  const drinksForType = drinks.filter((p)=>bottleType(p.category,p.name)===f.type);
  useEffect(()=>{ if(drinkTypes.length && !drinkTypes.includes(f.type)) setF((current)=>({...current,type:drinkTypes[0],name:"",photoUrl:""})); },[drinkTypes.join("|"),f.type]);
  return (
    <div className="lg:grid lg:grid-cols-[360px_1fr] lg:gap-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 mb-4 lg:mb-0 h-fit">
        <p className="font-bold mb-2 text-sm flex items-center gap-2"><Wine className="w-4 h-4 text-amber-300" /> {t("pos.keepBottle")}</p>
        <div className="relative mb-2"><input value={f.memberCode} onChange={(e) => { setSelectedMember(null); setF({ ...f, memberCode: e.target.value }); }} placeholder={t("pos.memberSearch")} className={inp} />
          {!selectedMember && memberMatches.length > 0 && <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-white/15 bg-[#160f2a] p-1 shadow-2xl">{memberMatches.map((m)=><button key={m.id} type="button" onClick={()=>{setSelectedMember(m);setF({...f,memberCode:m.code||m.card||m.email})}} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10"><b className="block text-sm">{m.name}</b><span className="text-xs text-white/50">{m.code||m.card||m.email}</span></button>)}</div>}
        </div>
        {selectedMember && <div className="mb-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-2 text-sm text-emerald-200"><UserCheck className="mr-1 inline h-4 w-4"/> {selectedMember.name}</div>}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value, name: "", photoUrl: "" })} className={inp}>
            {drinkTypes.map((type)=><option key={type} value={type}>{t(`pos.bottleType.${type}`)}</option>)}
          </select>
          <input type="number" min={1} value={f.quantity} onChange={(e) => setF({ ...f, quantity: Number(e.target.value) })} placeholder={t("pos.qtyShort")} className={inp} />
        </div>
        <label className="mb-2 flex items-center gap-2 rounded-xl border border-white/10 p-2.5 text-sm"><input type="checkbox" checked={isOwn} onChange={(e) => { setIsOwn(e.target.checked); setF({ ...f, name: "", photoUrl: "" }); }} /> {t("pos.ownBottle")}</label>
        {isOwn
          ? <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={t("pos.ownBottleName")} className={inp + " mb-2"} />
          :         <select value={f.name} onChange={(e) => { const p=products.find((x)=>x.name===e.target.value); setF({ ...f, name:e.target.value, type:bottleType(p?.category,e.target.value) }); }} className={inp + " mb-2"}>
          <option value="">{t("pos.selectDrink")}</option>
          {drinksForType.map((p)=><option key={p.id} value={p.name}>{p.name} · {p.category}</option>)}
        </select>}
        {(
          <div className="mb-2 rounded-xl border border-white/10 p-2.5">
            <p className="text-xs text-white/50 mb-1.5">🛎️ {t("pos.corkage.title")}</p>
            <div className="grid grid-cols-2 gap-2">
              <select value={corkage.productId} onChange={(e) => setCorkage({ ...corkage, productId: e.target.value })} className={inp}>
                <option value="">{t("pos.corkage.none")}</option>
                {services.map((p: any) => <option key={p.id} value={p.id}>{p.name} · {rp(Number(p.salePrice ?? p.price))}</option>)}
              </select>
              <input value={corkage.tableNumber} onChange={(e) => setCorkage({ ...corkage, tableNumber: e.target.value })} placeholder={t("pos.corkage.table")} disabled={!corkage.productId} className={inp + " disabled:opacity-40"} />
            </div>
            <p className="text-[11px] text-white/40 mt-1.5">{services.length ? t("pos.corkage.hint") : t("pos.corkage.noService")}</p>
          </div>
        )}
        {(f.type === "wine" || f.type === "whisky") && (
          <div className="mb-2"><p className="text-xs text-white/50 mb-1">{t("pos.photoLevel")}</p><ImageUpload value={f.photoUrl} onChange={(v) => setF({ ...f, photoUrl: v })} label={t("pos.uploadPhoto")} /></div>
        )}
        <input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder={t("pos.noteOptional")} className={inp + " mb-2"} />
        <button onClick={() => store.mutate()} disabled={store.isPending || !f.name.trim() || !f.memberCode.trim() || (!!corkage.productId && !corkage.tableNumber.trim()) || ((f.type === "wine" || f.type === "whisky") && !f.photoUrl)} className="w-full py-2.5 rounded-xl font-bold text-black disabled:opacity-50" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>{t("pos.keepBottleBtn")}</button>
      </div>
      <div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("pos.searchKept")} className={inp + " mb-3"} />
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))" }}>
          {kept.map((b) => (
            <div key={b.id} className={`min-w-0 flex items-center gap-3 rounded-2xl border p-3 ${b.expiringSoon ? "border-amber-400/40 bg-amber-400/5" : "border-white/10 bg-white/5"}`}>
              {b.photoUrl
                ? <img src={b.photoUrl} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                : <span className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0"><Wine className="w-6 h-6 text-amber-300" /></span>}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{b.name} <span className="text-white/40">×{b.quantity}</span></p>
                <p className="text-xs text-white/50 truncate">{b.memberName} · {tOr(t, `pos.bottleType.${b.type}`, b.type)}</p>
                <p className={`text-[11px] ${b.daysLeft <= 5 ? "text-amber-300" : "text-white/40"}`}>{t("pos.daysLeft", { n: b.daysLeft })}</p>
              </div>
              <button onClick={() => collect.mutate(b.id)} disabled={collect.isPending} className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-sm font-semibold flex-shrink-0">{t("pos.collect")}</button>
            </div>
          ))}
        </div>
        {kept.length === 0 && <p className="text-center text-white/40 py-10 text-sm">{t("pos.noBottles")}</p>}
      </div>
    </div>
  );
}

function ReceiptPreview({ order, meta, onDone }: { order: any; meta: any; onDone: () => void }) {
  const { toast } = useToast();
  const { t, language } = useTranslation();
  const paidAt = new Date(order.paidAt || order.createdAt || Date.now()).toLocaleString(localeTag(language));
  const print = () => {
    if (!printReceipt(order, meta || {})) toast({ title: t("pos.receiptReady"), description: t("pos.receiptReadyDesc") });
  };
  return <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
    <div className="relative mx-auto my-4 w-full max-w-sm rounded-3xl border border-white/15 bg-[#f7f2e8] p-5 text-black shadow-2xl">
      <button onClick={onDone} aria-label={t("pos.closeReceipt")} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/10"><X className="h-5 w-5"/></button>
      <div className="text-center">
        {meta?.logoUrl && <img src={meta.logoUrl} alt="" className="mx-auto mb-2 max-h-16 max-w-32 object-contain" />}
        <h2 className="text-xl font-black">{meta?.clubName || "Reborn Wave Group"}</h2>
        <span className="mt-2 inline-block border-2 border-black px-3 py-1 text-xs font-black">{order.orderMode === "take_away" ? t("pos.rc.takeAway") : t("pos.rc.dineIn")}</span>
      </div>
      <div className="my-4 border-t border-dashed border-black/50" />
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4"><span>{t("pos.rc.order")}</span><b>{order.orderNo}</b></div>
        {order.tableNumber && <div className="flex justify-between gap-4"><span>{t("pos.rc.table")}</span><span>{order.tableNumber}</span></div>}
        {order.memberName && <div className="flex justify-between gap-4"><span>{t("pos.rc.member")}</span><span className="text-right">{order.memberName}</span></div>}
        {order.salesStaffName && <div className="flex justify-between gap-4"><span>{t("pos.rc.servedBy")}</span><span className="text-right">{order.salesStaffName}</span></div>}
        <div className="flex justify-between gap-4"><span>{t("pos.rc.date")}</span><span className="text-right">{paidAt}</span></div>
      </div>
      <div className="my-4 border-t border-dashed border-black/50" />
      <div className="space-y-2 text-sm">{(order.items || []).filter((x:any)=>!OFF_BILL.includes(x.status)).map((item:any)=><div key={item.id || `${item.name}-${item.qty}`} className="flex justify-between gap-3"><span>{item.qty}× {item.name}</span><span>{rp(Number(item.lineTotal ?? item.price * item.qty))}</span></div>)}</div>
      <div className="my-4 border-t border-dashed border-black/50" />
      <div className="space-y-1 text-sm">
        <div className="flex justify-between"><span>{t("pos.rc.subtotal")}</span><span>{rp(Number(order.subtotal ?? order.total))}</span></div>
        {Number(order.discount)>0 && <div className="flex justify-between gap-3"><span>{t("pos.discount")}{order.discountReason ? ` (${order.discountReason})` : ""}</span><span>- {rp(Number(order.discount))}</span></div>}
        {Number(order.serviceFee)>0 && <div className="flex justify-between"><span>{meta?.serviceFeePercent ? t("pos.serviceFeePct", { n: meta.serviceFeePercent }) : t("pos.serviceFee")}</span><span>{rp(Number(order.serviceFee))}</span></div>}
        {Number(order.tax)>0 && <div className="flex justify-between"><span>{t("pos.tax")}</span><span>{rp(Number(order.tax))}</span></div>}
        <div className="flex justify-between text-lg font-black"><span>{t("pos.rc.total")}</span><span>{rp(Number(order.total))}</span></div>
        {Number(order.packageCreditUsed)>0 && <><div className="flex justify-between"><span>{t("pos.rc.packageCredit")}</span><span>- {rp(Number(order.packageCreditUsed))}</span></div><div className="flex justify-between font-bold"><span>{t("pos.rc.toPay")}</span><span>{rp(Number(order.total) - Number(order.packageCreditUsed))}</span></div></>}
        <div className="flex justify-between"><span>{t("pos.rc.paid")}</span><b>{order.paymentMethod === "cash" || order.paymentMethod === "card" || order.paymentMethod === "credits" || order.paymentMethod === "package" ? t(`pos.pay.${order.paymentMethod}`).toUpperCase() : String(order.paymentMethod || "").toUpperCase()}</b></div>
        {order.paymentReference && <div className="flex justify-between gap-3"><span>{t("pos.rc.cardRef")}</span><b className="text-right">{order.paymentReference}</b></div>}
        {order.paymentMethod === "cash" && <><div className="flex justify-between"><span>{t("pos.cashReceived")}</span><b>{rp(Number(order.cashReceived))}</b></div><div className="flex justify-between"><span>{t("pos.change")}</span><b>{rp(Number(order.changeGiven))}</b></div></>}
      </div>
      <p className="mt-4 border-t border-dashed border-black/50 pt-4 text-center text-xs">{meta?.footer || t("pos.rc.thanks")}</p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button onClick={print} className="flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 font-bold text-white"><Printer className="h-4 w-4"/> {t("pos.print")}</button>
        <button onClick={onDone} className="rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white">{t("pos.done")}</button>
      </div>
    </div>
  </div>;
}

// ── Cash drawer setup ───────────────────────────────────────────────────────
function DrawerSetup({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [url, setUrl] = useState(getDrawerUrl());
  const [linked, setLinked] = useState(false);
  const { t } = useTranslation();
  const connect = async () => {
    const ok = await connectDrawerSerial();
    setLinked(ok);
    toast({ title: ok ? t("pos.drawer.linked") : t("pos.drawer.notLinked"), description: ok ? t("pos.drawer.linkedDesc") : t("pos.drawer.notLinkedDesc") });
  };
  const save = () => { setDrawerUrl(url.trim()); toast({ title: t("pos.drawer.saved") }); };
  const test = async () => { const ok = await openCashDrawer(); toast({ title: ok ? t("pos.drawer.kickSent") : t("pos.drawer.noResponse"), description: ok ? t("pos.drawer.shouldOpen") : t("pos.drawer.linkFirst") }); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-[#160f2a] border border-white/10 rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label={t("pos.drawer.close")} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><X className="w-4 h-4" /></button>
        <h3 className="text-lg font-extrabold mb-1">{t("pos.cashDrawer")}</h3>
        <p className="text-sm text-white/60 mb-4">{t("pos.drawer.desc")}</p>
        {serialSupported() ? (
          <button onClick={connect} className="w-full py-3 rounded-xl font-bold text-black mb-3" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>{linked ? t("pos.drawer.relink") : t("pos.drawer.link")}</button>
        ) : (
          <p className="text-xs text-amber-300/80 mb-3">{t("pos.drawer.noSerial")}</p>
        )}
        <label className="text-xs text-white/50 block mb-1">{t("pos.drawer.urlLabel")}</label>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://192.168.1.50:8000/kick" className="w-full px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm mb-3" />
        <div className="flex gap-2">
          <button onClick={save} className="flex-1 py-2.5 rounded-xl bg-white/10 border border-white/10 text-sm font-semibold">{t("pos.drawer.saveUrl")}</button>
          <button onClick={test} className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-sm font-semibold">{t("pos.drawer.test")}</button>
        </div>
      </div>
    </div>
  );
}

// Paying with the member's RP credits: shows their balance (looked up by member
// code) and whether it covers the bill. Reports the balance to the parent.
function CreditsLine({ code, total, onBalance }: { code?: string | null; total: number; onBalance: (n: number | null) => void }) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/reborn/pos/member", code],
    queryFn: () => apiRequest("GET", `/api/reborn/pos/member/${encodeURIComponent(code || "")}`).then((r) => r.json()),
    enabled: !!code,
  });
  const bal = data?.credits !== undefined ? Number(data.credits) : null;
  useEffect(() => { onBalance(bal); }, [bal]);
  const rp = (n: any) => money(n);
  if (!code) return <p className="mb-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200">{t("pos.credits.needMember")}</p>;
  if (isLoading || bal === null) return <p className="mb-2 text-xs text-white/50">…</p>;
  const ok = bal >= total;
  return (
    <div className={`mb-2 rounded-xl border px-3 py-2 text-xs ${ok ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100" : "border-red-400/40 bg-red-500/10 text-red-100"}`}>
      <div className="flex justify-between font-semibold"><span>{t("pos.credits.balance")}</span><b>{rp(bal)}</b></div>
      <div className="flex justify-between mt-0.5"><span>{ok ? t("pos.credits.after") : t("pos.credits.short")}</span><b>{ok ? rp(bal - total) : rp(total - bal)}</b></div>
    </div>
  );
}

// ── Packages (server/memberPackages.ts) ─────────────────────────────────────
// The bill as the server will charge it: the member's perk and package credit applied.
const QUOTE_STALE_MS = 3000; // the same bill is not asked for again within 3 s (a flaky connection used to loop here)
function useQuote(body: any, enabled: boolean) {
  return useQuery<any>({ queryKey: ["/api/reborn/pos/quote", JSON.stringify(body)], queryFn: () => post("/api/reborn/pos/quote", body), enabled, placeholderData: (prev: any) => prev, staleTime: QUOTE_STALE_MS, retry: false, refetchOnWindowFocus: false }).data;
}
// Bill numbers for the pay panel: the server quote when there is one, else the local estimate.
function quoteTotals(q: any, local: { taxable: number; serviceFee: number; tax: number; total: number }) {
  if (!q) return { ...local, perkAmount: 0, perkPercent: 0, creditUse: 0, payable: local.total };
  return { taxable: q.subtotal - q.discount, serviceFee: q.serviceFee, tax: q.tax, total: q.total, perkAmount: q.perkAmount, perkPercent: q.perkPercent, creditUse: q.creditUse, payable: q.due };
}
function BillSummary({ due, settings }: { due: ReturnType<typeof quoteTotals>; settings: any }) {
  const { t } = useTranslation();
  return (
    <div className="mb-2 space-y-1 rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
      {due.perkAmount > 0 && <div className="flex justify-between text-sky-200"><span>{t("pos.pkg.perkLine", { p: due.perkPercent })}</span><span>- {rp(due.perkAmount)}</span></div>}
      <div className="flex justify-between"><span>{t("pos.subtotalAfterDiscount")}</span><span>{rp(due.taxable)}</span></div>
      <div className="flex justify-between"><span>{t("pos.serviceFeePct", { n: Number(settings?.serviceFeePercent) || 0 })}</span><span>{rp(due.serviceFee)}</span></div>
      <div className="flex justify-between"><span>{t("pos.taxPct", { n: Number(settings?.taxPercent) || 0 })}</span><span>{rp(due.tax)}</span></div>
      <div className="flex justify-between text-sm font-black text-amber-300"><span>{t("pos.total")}</span><span>{rp(due.total)}</span></div>
      {due.creditUse > 0 && <>
        <div className="flex justify-between text-sky-200"><span>{t("pos.rc.packageCredit")}</span><span>- {rp(due.creditUse)}</span></div>
        <div className="flex justify-between text-sm font-black text-emerald-300"><span>{t("pos.rc.toPay")}</span><span>{rp(due.payable)}</span></div>
      </>}
    </div>
  );
}
const fmtDay = (d: any, lang: string) => new Date(d).toLocaleDateString(localeTag(lang as any), { day: "numeric", month: "short", year: "numeric" });
// Taking one use of a package. A package of items ("6 beers") shows a choice of the beers; the chosen item goes on the open bill at RP 0
// and comes off its stock. Without an open bill (ticketId) such a package can't be used.
function UsePackageButton({ p, ticketId, onDone, tone }: { p: any; ticketId?: number; onDone: () => void; tone: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: products = [] } = useProducts();
  const choices = (p.itemIds || []).map((id: number) => products.find((x) => x.id === id)).filter(Boolean) as Product[];
  const [pick, setPick] = useState<number | "">("");
  const chosen = pick || (choices.length === 1 ? choices[0].id : "");
  const use = useMutation({
    mutationFn: () => post(`/api/reborn/pos/packages/${p.id}/use`, { uses: 1, ticketId, productId: chosen || undefined }),
    onSuccess: (d) => { toast({ title: d.message }); onDone(); },
    onError: (e: any) => toast({ title: t("pos.failed"), description: e.message, variant: "destructive" }),
  });
  const isItems = (p.itemIds || []).length > 0;
  return (
    <span className="flex items-center gap-1.5 flex-shrink-0">
      {isItems && choices.length > 1 && (
        <select value={pick} onChange={(e) => setPick(e.target.value ? Number(e.target.value) : "")} aria-label={t("pos.pkg.chooseItem")} className="max-w-[9rem] rounded-lg bg-black/40 border border-white/15 px-2 py-1.5 text-[11px] text-white">
          <option value="">{t("pos.pkg.chooseItem")}</option>
          {choices.map((c) => <option key={c.id} value={c.id} disabled={!!c.soldOut}>{c.name}{c.soldOut ? " ✕" : ` · ${c.stock}`}</option>)}
        </select>
      )}
      <button onClick={() => (isItems && !ticketId ? toast({ title: t("pos.pkg.needBill"), variant: "destructive" }) : use.mutate())} disabled={use.isPending || (isItems && !chosen)} className={tone}>{isItems ? t("pos.pkg.useItem") : t("pos.pkg.use1")}</button>
    </span>
  );
}
// The member's perk, package credit and visit packages on the pay panel.
function MemberWallet({ code, quote, useCredit, onUseCredit, ticketId }: { code?: string | null; quote: any; useCredit: boolean; onUseCredit: (v: boolean) => void; ticketId?: number }) {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: w } = useQuery<any>({
    queryKey: ["/api/reborn/pos/member-packages", code],
    queryFn: () => apiRequest("GET", `/api/reborn/pos/member-packages?code=${encodeURIComponent(code || "")}`).then((r) => (r.ok ? r.json() : null)),
    enabled: !!code,
  });
  useEffect(() => { if (!w?.creditBalance && useCredit) onUseCredit(false); }, [w?.creditBalance]);
  if (!code) return quote?.hasPackages ? <p className="mb-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200">{t("pos.pkg.needMember")}</p> : null;
  if (!w) return null;
  const visits = (w.packages || []).filter((p: any) => p.kind === "uses");
  if (!w.perk && !(w.creditBalance > 0) && !visits.length) return null;
  return (
    <div className="mb-2 space-y-1.5 rounded-xl border border-sky-400/30 bg-sky-500/10 p-2.5 text-xs">
      <p className="font-semibold text-sky-200 flex items-center gap-1.5"><Gift className="w-3.5 h-3.5" /> {t("pos.pkg.wallet")}</p>
      {w.perk && <p>{t("pos.pkg.perk", { p: w.perk.percent })} · {w.perk.until ? t("pos.pkg.until", { d: fmtDay(w.perk.until, language) }) : t("pos.pkg.lifetime")}</p>}
      {w.creditBalance > 0 && (
        <label className="flex items-center gap-2 rounded-lg bg-black/20 px-2 py-1.5">
          <input type="checkbox" checked={useCredit} onChange={(e) => onUseCredit(e.target.checked)} />
          <span className="flex-1">{t("pos.pkg.useCredit", { n: rp(w.creditBalance) })}</span>
        </label>
      )}
      {useCredit && quote && quote.creditable < quote.total && <p className="text-white/50">{t("pos.pkg.someNotCredit")}</p>}
      {visits.map((p: any) => (
        <div key={p.id} className="flex items-center gap-2 rounded-lg bg-black/20 px-2 py-1.5">
          <span className="flex-1 min-w-0 truncate">{p.name} · {t("pos.pkg.left", { n: p.usesLeft, total: p.usesTotal })}</span>
          <UsePackageButton p={p} ticketId={ticketId} onDone={() => { qc.invalidateQueries({ queryKey: ["/api/reborn/pos/member-packages"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/packages"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/orders"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); }} tone="rounded-lg bg-sky-400/90 px-2.5 py-1 text-[11px] font-bold text-black disabled:opacity-50" />
        </div>
      ))}
    </div>
  );
}
// POS › Packages: every member's active packages; take a visit from here.
function PackagesTab() {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data: list = [] } = useQuery<any[]>({
    queryKey: ["/api/reborn/pos/packages", q],
    queryFn: () => apiRequest("GET", `/api/reborn/pos/packages${q ? "?q=" + encodeURIComponent(q) : ""}`).then((r) => r.json()),
    refetchInterval: 30000,
  });
  return (
    <div>
      <p className="text-xs text-white/50 mb-2">{t("pos.pkg.tabHint")}</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("pos.pkg.search")} className="w-full px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm mb-3" />
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))" }}>
        {list.map((p: any) => (
          <div key={p.id} className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-start gap-3">
              <span className="w-11 h-11 rounded-xl bg-sky-400/15 flex items-center justify-center flex-shrink-0 text-lg">{p.kind === "uses" ? "📦" : "💳"}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{p.name}</p>
                <p className="text-xs text-white/50 truncate">{p.memberName || "—"}{p.memberCode ? ` · ${p.memberCode}` : ""}</p>
                <p className="text-xs text-sky-200 mt-0.5">{p.kind === "uses" ? t("pos.pkg.left", { n: p.usesLeft, total: p.usesTotal }) : t("pos.pkg.creditLeft", { n: rp(p.creditLeft), total: rp(p.creditTotal) })}</p>
                <p className="text-[11px] text-white/40">{p.expiresAt ? t("pos.pkg.expires", { d: fmtDay(p.expiresAt, language) }) : t("pos.pkg.noExpiry")}{p.kind === "credit" && p.perkPercent > 0 ? ` · ${t("pos.pkg.perkAfter", { p: p.perkPercent })}` : ""}</p>
              </div>
              {p.kind === "uses" && <UsePackageButton p={p} onDone={() => { qc.invalidateQueries({ queryKey: ["/api/reborn/pos/packages"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/member-packages"] }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/products"] }); }} tone="px-3 py-2 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-200 text-sm font-semibold disabled:opacity-50" />}
            </div>
          </div>
        ))}
      </div>
      {list.length === 0 && <p className="text-center text-white/40 py-10 text-sm">{t("pos.pkg.none")}</p>}
    </div>
  );
}
