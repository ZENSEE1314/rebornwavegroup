// Admin › Expenses: the accounts staff upload the day's expenses (rent, electricity, salary, security ...) with the receipt photo. Every entry keeps who uploaded it and when;
// a mistake is voided with a reason (managers and the main admin), never deleted. Different from the Inventory receipt scan, which is for stock bought.
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Receipt, Sparkles, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { money } from "@/lib/money";
import { ImageUpload } from "@/components/ImageUpload";
import { readReceipt } from "@/lib/receipt-ocr";
import { EXPENSE_GROUPS, GROUP_OF_SECTION, sectionOf, type ExpenseGroup } from "@shared/accountingReport";

const card = "rounded-2xl bg-white/5 border border-white/10 p-4";
const field = "min-w-0 w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400/60";
const PHOTO_MAX_DIM = 1400;
const PHOTO_QUALITY = 0.8;
// What the upload is for, grouped as the reports show it. Items bought for the shop's stock are not uploaded here (Inventory › Scan a supplier receipt).
const groupOf = (category: string): ExpenseGroup => GROUP_OF_SECTION[sectionOf(category)];
const todayText = () => new Date().toISOString().slice(0, 10);
const nowTimeText = () => new Date().toTimeString().slice(0, 5);
const CHECK_RING = " ring-1 ring-amber-400";
const UTILITY_WORDS: [RegExp, string][] = [[/electric|listrik|pln|power/i, "electricity"], [/water|air|pdam/i, "water"], [/internet|wifi|wi-fi|fiber|telkom|indihome/i, "internet"]];
// The reader says rental / utilities / salary / other (or goods); this screen's own list is finer.
function categoryFromRead(kind: string, category: string, hint: string): string {
  if (category === "rental") return "rent";
  if (category === "salary") return "salary";
  if (category === "utilities") return UTILITY_WORDS.find(([re]) => re.test(hint))?.[1] || "";
  return kind === "goods" ? "supplies" : "";
}

interface Expense { id: number; category: string; amount: string; spentOn: string; spentTime?: string | null; payee?: string | null; payeeAddress?: string | null; payeePhone?: string | null; invoiceNo?: string | null; items?: { name: string; qty: number; unitCost: number }[]; note?: string | null; hasPhoto: boolean; status: string; voidReason?: string | null; uploadedByName?: string | null; createdAt?: string }
interface ExpenseList { month: string; expenses: Expense[]; totals: Record<string, number>; total: number; canVoid: boolean; categories: string[]; runningCosts: { id: string; name: string }[] }
interface Line { key: number; name: string; qty: number; unitCost: number }
interface Vendor { name: string; address: string; phone: string; category: string; items: { name: string; qty: number; unitCost: number }[] }
let nextLineKey = 1;
const newLine = (line: Partial<Line> = {}): Line => ({ key: nextLineKey++, name: "", qty: 1, unitCost: 0, ...line });
const emptyForm = (category = "") => ({ category, amount: "", spentOn: todayText(), spentTime: nowTimeText(), payee: "", payeeAddress: "", payeePhone: "", invoiceNo: "", note: "", photoUrl: "", fixedCostId: "" });

/** startWith: the kind pre-picked in the form (the Accounting page opens it on "Other"). */
export default function ExpensesPanel({ startWith = "" }: { startWith?: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [month, setMonth] = useState(todayText().slice(0, 7));
  const [form, setForm] = useState(() => emptyForm(startWith));
  const [lines, setLines] = useState<Line[]>([]);
  const [readState, setReadState] = useState<"idle" | "reading" | "done" | "failed">("idle");
  const [readMessage, setReadMessage] = useState("");
  const [readPercent, setReadPercent] = useState(0);
  const lastRead = useRef("");
  const [voiding, setVoiding] = useState<Expense | null>(null);
  const [reason, setReason] = useState("");
  const [photo, setPhoto] = useState<{ id: number; url: string | null } | null>(null);
  const url = `/api/reborn/expenses?month=${month}`;
  const { data } = useQuery<ExpenseList>({ queryKey: [url], queryFn: () => apiRequest("GET", url).then((r) => r.json()) });
  const refresh = () => { qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/reborn/expenses") }); qc.invalidateQueries({ queryKey: ["/api/reborn/admin/fixed-costs"] }); qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/reborn/admin/accounting") }); };
  const fail = (e: any) => toast({ title: t("admin.c.failed"), description: String(e.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" });
  const save = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/expenses", { ...form, fixedCostId: form.fixedCostId || undefined, items: lines.filter((l) => l.name.trim()).map(({ name, qty, unitCost }) => ({ name, qty, unitCost })) }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; }),
    onSuccess: () => { toast({ title: t("ex.saved") }); qc.invalidateQueries({ queryKey: ["/api/reborn/expenses/vendors"] }); setForm({ ...emptyForm(startWith), spentOn: form.spentOn }); setLines([]); setReadState("idle"); lastRead.current = ""; refresh(); },
    onError: fail,
  });
  const voidIt = useMutation({
    mutationFn: () => apiRequest("POST", `/api/reborn/expenses/${voiding!.id}/void`, { reason }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; }),
    onSuccess: () => { toast({ title: t("ex.voidedToast") }); setVoiding(null); setReason(""); refresh(); },
    onError: fail,
  });
  const showPhoto = async (id: number) => {
    setPhoto({ id, url: null });
    const r = await apiRequest("GET", `/api/reborn/expenses/${id}/photo`);
    setPhoto({ id, url: (await r.json()).photoUrl });
  };
  const { data: reader } = useQuery<{ ai: boolean }>({ queryKey: ["/api/reborn/admin/inventory/receipt/ready"], queryFn: () => apiRequest("GET", "/api/reborn/admin/inventory/receipt/ready").then((r) => r.json()) });
  const { data: vendorList } = useQuery<{ vendors: Vendor[] }>({ queryKey: ["/api/reborn/expenses/vendors"], queryFn: () => apiRequest("GET", "/api/reborn/expenses/vendors").then((r) => r.json()) });
  // Typing (or picking) the name of a supplier saved before fills its address, phone, kind and usual lines into the boxes that are still empty.
  const setPayee = (value: string) => {
    const known = (vendorList?.vendors || []).find((v) => v.name.toLowerCase() === value.trim().toLowerCase());
    setForm((current) => ({ ...current, payee: value, ...(known ? { payeeAddress: current.payeeAddress || known.address, payeePhone: current.payeePhone || known.phone, category: current.category || known.category } : {}) }));
    if (known && !lines.length && known.items.length) setLines(known.items.map((it) => newLine(it)));
  };
  const linesTotal =lines.reduce((sum, l) => sum + l.qty * l.unitCost, 0);
  const setLine = (key: number, patch: Partial<Line>) => {
    const next = lines.map((l) => (l.key === key ? { ...l, ...patch } : l));
    setLines(next);
    const sum = next.reduce((total, l) => total + l.qty * l.unitCost, 0);
    if (sum > 0) setForm((current) => ({ ...current, amount: String(Math.round(sum * 100) / 100) }));
  };
  // A new photo is read at once: whatever the reader finds fills the form; anything it could not read stays empty (ringed) for the person to type.
  useEffect(() => {
    if (!form.photoUrl || lastRead.current === form.photoUrl || !reader) return;
    lastRead.current = form.photoUrl;
    setReadState("reading");
    setReadPercent(0);
    readReceipt(form.photoUrl, reader.ai, setReadPercent).then((d) => {
      const vendor: Vendor | null = d.vendor || null;
      const readLines: any[] = (d.items || []).length ? d.items : vendor?.items || []; // nothing read: this supplier's usual lines from last time
      const read: Line[] = readLines.map((it: any) => newLine({ name: it.name, qty: Number(it.qty) || 1, unitCost: Number(it.unitCost) || 0 }));
      const sum = read.reduce((total, l) => total + l.qty * l.unitCost, 0);
      const total = Number(d.total) || sum;
      const validDate = /^\d{4}-\d{2}-\d{2}$/.test(d.date || "") && d.date <= todayText();
      setLines(read);
      setForm((current) => ({
        ...current,
        payee: d.supplier || vendor?.name || current.payee, payeeAddress: d.supplierAddress || vendor?.address || current.payeeAddress, payeePhone: d.supplierPhone || vendor?.phone || current.payeePhone, invoiceNo: d.invoiceNo || current.invoiceNo,
        spentOn: validDate ? d.date : current.spentOn, spentTime: d.time || current.spentTime,
        amount: total > 0 ? String(total) : current.amount,
        category: current.category || vendor?.category || categoryFromRead(d.kind, d.category, [d.supplier, ...(d.items || []).map((it: any) => it.name)].join(" ")),
      }));
      setReadState("done");
      setReadMessage(vendor ? t("ex.knownVendor", { name: vendor.name }) : d.kind === "goods" ? t("ex.readGoods") : "");
    }).catch((e: any) => { setReadState("failed"); setReadMessage(String(e.message || "").replace(/^\d{3}:\s*/, "")); });
  }, [form.photoUrl, reader?.ai]);
  const isChecked = readState === "done";
  const ring = (value: string | number) => (isChecked && !value ? CHECK_RING : "");
  const isReady = !!form.category && Number(form.amount) > 0 && !!form.spentOn && (!!form.photoUrl || !!form.note.trim());
  return (
    <div className="space-y-3">
      <div className={card + " space-y-3"}>
        <h3 className="font-extrabold flex items-center gap-2"><Receipt className="w-5 h-5 text-amber-300" /> {t("ex.title")}</h3>
        <ImageUpload value={form.photoUrl} onChange={(photoUrl) => { setForm({ ...form, photoUrl }); if (!photoUrl) { setReadState("idle"); lastRead.current = ""; } }} label={t("ex.photo")} output="jpeg" maxDim={PHOTO_MAX_DIM} quality={PHOTO_QUALITY} />
        {readState === "reading" && <p className="text-xs text-amber-200 inline-flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> {reader?.ai ? t("ex.reading") : t("ex.readingFree", { n: String(readPercent) })}</p>}
        {readState === "done" && <p className="text-xs text-emerald-300">{t("ex.readDone")}{readMessage ? ` ${readMessage}` : ""}</p>}
        {readState === "failed" && <p className="text-xs text-amber-200">{readMessage || t("ex.readFail")} {t("ex.typeIn")}</p>}
        {readState === "done" && reader?.ai === false && <p className="text-xs text-amber-200">{t("ex.freeCheck")}</p>}
        <p className="text-[11px] text-white/50">{t("ex.intro")}</p>
        <p className="text-[11px] text-white/40">{t("ex.itemsNote")}</p>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <label className="block text-xs text-white/60">{t("ex.category")}
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={field + " mt-1" + ring(form.category)}>
              <option value="">—</option>
              {EXPENSE_GROUPS.filter((group) => (data?.categories || []).some((c) => groupOf(c) === group)).map((group) => (
                <optgroup key={group} label={t(`ar.group.${group}`)}>{(data?.categories || []).filter((c) => groupOf(c) === group).map((c) => <option key={c} value={c}>{t(`ex.cat.${c}`)}</option>)}</optgroup>
              ))}
            </select>
          </label>
          <label className="block text-xs text-white/60">{t("ex.amount")}<input type="number" inputMode="numeric" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={field + " mt-1" + ring(form.amount)} /></label>
          <label className="block text-xs text-white/60">{t("ex.date")}<input type="date" max={todayText()} value={form.spentOn} onChange={(e) => setForm({ ...form, spentOn: e.target.value })} className={field + " mt-1"} /></label>
          <label className="block text-xs text-white/60">{t("ex.time")}<input type="time" value={form.spentTime} onChange={(e) => setForm({ ...form, spentTime: e.target.value })} className={field + " mt-1"} /></label>
          <label className="block text-xs text-white/60">{t("ex.payee")}<input list="expense-vendors" value={form.payee} onChange={(e) => setPayee(e.target.value)} className={field + " mt-1" + ring(form.payee)} /><datalist id="expense-vendors">{(vendorList?.vendors || []).map((v) => <option key={v.name} value={v.name} />)}</datalist></label>
          <label className="block text-xs text-white/60">{t("ex.phone")}<input type="tel" value={form.payeePhone} onChange={(e) => setForm({ ...form, payeePhone: e.target.value })} className={field + " mt-1" + ring(form.payeePhone)} /></label>
          <label className="block text-xs text-white/60" style={{ gridColumn: "1 / -1" }}>{t("ex.address")}<input value={form.payeeAddress} onChange={(e) => setForm({ ...form, payeeAddress: e.target.value })} className={field + " mt-1" + ring(form.payeeAddress)} /></label>
          <label className="block text-xs text-white/60">{t("ex.invoice")}<input value={form.invoiceNo} onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} className={field + " mt-1"} /></label>
        </div>
        {(data?.runningCosts || []).length > 0 && (
          <label className="block text-xs text-white/60">{t("ex.settles")}
            <select value={form.fixedCostId} onChange={(e) => setForm({ ...form, fixedCostId: e.target.value })} className={field + " mt-1"}>
              <option value="">—</option>
              {data!.runningCosts.map((cost) => <option key={cost.id} value={cost.id}>{cost.name}</option>)}
            </select>
            <span className="mt-0.5 block text-[10px] text-white/40">{t("ex.settlesHint")}</span>
          </label>
        )}
        <label className="block text-xs text-white/60">{t("ex.note")}<input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={field + " mt-1"} /></label>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-white/60">{t("ex.items")}</p>
            <button type="button" onClick={() => setLines([...lines, newLine()])} className="min-h-0 px-2 py-1 rounded-lg bg-white/10 text-xs inline-flex items-center gap-1"><Plus className="w-3 h-3" /> {t("ex.addLine")}</button>
          </div>
          {lines.map((line) => (
            <div key={line.key} className="flex items-center gap-1.5">
              <input value={line.name} onChange={(e) => setLine(line.key, { name: e.target.value })} placeholder={t("ex.itemName")} aria-label={t("ex.itemName")} className={field + " flex-1"} />
              <input type="number" inputMode="decimal" min={0} value={line.qty} onChange={(e) => setLine(line.key, { qty: Number(e.target.value) })} aria-label={t("ex.qty")} className={field} style={{ width: 64 }} />
              <input type="number" inputMode="decimal" min={0} value={line.unitCost} onChange={(e) => setLine(line.key, { unitCost: Number(e.target.value) })} aria-label={t("ex.price")} className={field} style={{ width: 96 }} />
              <button type="button" onClick={() => setLines(lines.filter((l) => l.key !== line.key))} aria-label={t("ex.removeLine")} className="w-9 h-9 shrink-0 rounded-lg bg-white/10 inline-flex items-center justify-center p-0"><X className="w-4 h-4" /></button>
            </div>
          ))}
          {lines.length > 0 && <p className="text-[11px] text-white/50">{t("ex.itemsSum", { n: money(linesTotal) })}</p>}
        </div>
        <p className="text-[11px] text-white/40">{t("ex.needProof")}</p>
        <button type="button" onClick={() => save.mutate()} disabled={!isReady || save.isPending} className="min-h-[44px] px-5 rounded-lg bg-amber-400 text-black text-sm font-bold disabled:opacity-40">{t("ex.save")}</button>
      </div>

      <div className={card}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="font-bold text-sm">{t("ex.list")}</p>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={field + " w-auto"} />
        </div>
        {data && <p className="mt-1 text-sm font-black text-amber-200">{t("ex.total", { n: money(data.total) })}</p>}
        {data && Object.keys(data.totals).length > 0 && (
          <div className="mt-1 space-y-0.5 text-[11px] text-white/50">
            {EXPENSE_GROUPS.map((group) => {
              const inGroup = Object.entries(data.totals).filter(([c]) => groupOf(c) === group);
              return inGroup.length ? <p key={group}><b className="text-amber-200">{t(`ar.group.${group}`)} {money(inGroup.reduce((sum, [, n]) => sum + n, 0))}</b> · {inGroup.map(([c, n]) => `${t(`ex.cat.${c}`)} ${money(n)}`).join(" · ")}</p> : null;
            })}
          </div>
        )}
        <div className="mt-3 space-y-2">
          {(data?.expenses || []).map((row) => (
            <div key={row.id} className={`rounded-xl border p-3 text-xs ${row.status === "voided" ? "border-white/10 opacity-50" : "border-white/10 bg-black/20"}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{t(`ex.cat.${row.category}`)}{row.payee ? ` · ${row.payee}` : ""}</span>
                <span className={`font-black ${row.status === "voided" ? "line-through" : "text-amber-200"}`}>{money(Number(row.amount))}</span>
              </div>
              <p className="mt-0.5 text-white/50">{row.spentOn}{row.spentTime ? ` ${row.spentTime}` : ""}{row.uploadedByName ? ` · ${t("ex.by", { name: row.uploadedByName })}` : ""}{row.note ? ` · ${row.note}` : ""}</p>
              {(row.payeePhone || row.payeeAddress || row.invoiceNo) && <p className="mt-0.5 text-white/40">{[row.invoiceNo, row.payeePhone, row.payeeAddress].filter(Boolean).join(" · ")}</p>}
              {(row.items || []).length > 0 && <p className="mt-0.5 text-white/40">{(row.items || []).map((it) => `${it.qty} × ${it.name} ${money(it.unitCost)}`).join(" · ")}</p>}
              {row.status === "voided" && <p className="mt-0.5 text-red-300">{t("ex.voided", { reason: row.voidReason || "" })}</p>}
              <div className="mt-1 flex gap-3">
                {row.hasPhoto ? <button type="button" onClick={() => showPhoto(row.id)} className="min-h-0 p-0 text-amber-300 underline">{t("ex.viewPhoto")}</button> : <span className="text-white/30">{t("ex.noPhoto")}</span>}
                {data?.canVoid && row.status === "active" && <button type="button" onClick={() => { setVoiding(row); setReason(""); }} className="min-h-0 p-0 text-red-300 underline">{t("ex.void")}</button>}
              </div>
            </div>
          ))}
          {data && data.expenses.length === 0 && <p className="text-xs text-white/40">{t("ex.none")}</p>}
        </div>
      </div>

      {voiding && (
        <div className={card + " space-y-2 border-red-400/30"}>
          <p className="text-sm font-semibold">{t("ex.voidAsk", { what: `${t(`ex.cat.${voiding.category}`)} ${money(Number(voiding.amount))}` })}</p>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("ex.voidReason")} aria-label={t("ex.voidReason")} className={field} />
          <div className="flex gap-2">
            <button type="button" onClick={() => voidIt.mutate()} disabled={!reason.trim() || voidIt.isPending} className="min-h-[44px] px-4 rounded-lg bg-red-400 text-black text-sm font-bold disabled:opacity-40">{t("ex.void")}</button>
            <button type="button" onClick={() => setVoiding(null)} className="min-h-[44px] px-4 rounded-lg bg-white/10 text-sm">{t("ex.cancel")}</button>
          </div>
        </div>
      )}
      {photo && (
        <div className={card}>
          {photo.url ? <img src={photo.url} alt={t("ex.photo")} className="max-h-96 w-full object-contain rounded-lg" /> : <p className="text-xs text-white/50">…</p>}
          <button type="button" onClick={() => setPhoto(null)} className="mt-2 min-h-[40px] px-4 rounded-lg bg-white/10 text-xs">{t("ex.close")}</button>
        </div>
      )}
    </div>
  );
}
