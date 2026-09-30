import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RebornLayout } from "@/components/RebornLayout";
import { useTranslation, translate, localeTag, tData } from "@/lib/i18n";
import { ReceiptText, Coins, Gift, CreditCard, ChevronDown } from "lucide-react";

const fmt = (n: any) => Math.abs(Number(n) || 0).toLocaleString(localeTag());
const when = (v: any) => v ? new Date(v).toLocaleString(localeTag()) : "";
const STATUS_WORDS = ["open", "paid", "cancelled", "completed", "pending", "approved", "rejected", "won", "available", "used", "confirmed", "claimed", "redeemed", "failed", "shipped", "processing", "refunded"];
const METHOD_WORDS = ["cash", "card", "credit", "credits", "rwg_credits", "rp_balance", "bank_transfer", "qr_pending", "qris", "transfer"];
const status = (s: any) => s && STATUS_WORDS.includes(String(s).toLowerCase()) ? translate(`vn.status.${String(s).toLowerCase()}`) : (s || "");
const method = (m: any) => m && METHOD_WORDS.includes(String(m).toLowerCase()) ? translate(`vn.pay.${String(m).toLowerCase()}`) : (m || "");

export default function RebornHistory() {
  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/reborn/history"], queryFn: () => apiRequest("GET", "/api/reborn/history").then((r) => r.json()) });
  const [open, setOpen] = useState<number | null>(null);
  const { t: tr } = useTranslation();
  if (isLoading) return <RebornLayout active="/profile" title={tr("vn.hist.title")}><p className="text-white/50">{tr("vn.hist.loading")}</p></RebornLayout>;
  return <RebornLayout active="/profile" title={tr("vn.hist.title")}>
    <h1 className="text-2xl font-extrabold mb-1">{tr("vn.hist.heading")}</h1>
    <p className="text-sm text-white/50 mb-5">{tr("vn.hist.sub")}</p>

    <Section icon={<ReceiptText />} title={tr("vn.hist.orders")} empty={!data?.tickets?.length}>
      {data?.tickets?.map((t: any) => <div key={t.id} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <button onClick={() => setOpen(open === t.id ? null : t.id)} className="w-full p-4 flex items-center gap-3 text-left"><div className="flex-1"><p className="font-bold">{t.orderNo}</p><p className="text-xs text-white/45">{when(t.paidAt || t.createdAt)} · {status(t.status)}</p></div><p className="font-bold text-amber-300">RP {fmt(t.total)}</p><ChevronDown className={`w-4 h-4 transition-transform ${open === t.id ? "rotate-180" : ""}`} /></button>
        {open === t.id && <div className="border-t border-white/10 p-4 space-y-2">
          {t.items?.map((i: any) => <div key={i.id} className="flex justify-between text-sm"><span>{i.qty}× {i.name}</span><span>RP {fmt(i.lineTotal)}</span></div>)}
          <div className="mt-3 space-y-1 border-t border-white/10 pt-3 text-sm">
            <div className="flex justify-between text-white/65"><span>{tr("vn.hist.subtotal")}</span><span>RP {fmt(t.subtotal ?? t.total)}</span></div>
            {Number(t.discount) > 0 && <div className="flex justify-between text-white/65"><span>{tr("vn.hist.discount")}</span><span>− RP {fmt(t.discount)}</span></div>}
            {Number(t.serviceFee) > 0 && <div className="flex justify-between text-white/65"><span>{tr("vn.hist.serviceFee")}</span><span>RP {fmt(t.serviceFee)}</span></div>}
            {Number(t.tax) > 0 && <div className="flex justify-between text-white/65"><span>{tr("vn.hist.tax")}</span><span>RP {fmt(t.tax)}</span></div>}
            <div className="flex justify-between font-extrabold text-amber-300"><span>{tr("vn.hist.total")}</span><span>RP {fmt(t.total)}</span></div>
            {t.paymentMethod && <div className="flex justify-between text-white/65"><span>{tr("vn.hist.paidBy")}</span><span className="uppercase">{method(t.paymentMethod)}</span></div>}
            {t.paymentReference && <div className="flex justify-between gap-3 text-white/65"><span>{tr("vn.hist.cardRef")}</span><span className="text-right">{t.paymentReference}</span></div>}
            {t.paymentMethod === "cash" && <><div className="flex justify-between text-white/65"><span>{tr("vn.hist.cashReceived")}</span><span>RP {fmt(t.cashReceived)}</span></div><div className="flex justify-between text-white/65"><span>{tr("vn.hist.change")}</span><span>RP {fmt(t.changeGiven)}</span></div></>}
          </div>
          <p className="pt-2 text-center text-xs text-white/40">{tr("vn.hist.receiptSaved")}</p>
        </div>}
      </div>)}
    </Section>

    <Section icon={<Coins />} title={tr("vn.hist.rpKgold")} empty={!data?.wallet?.length}>
      {data?.wallet?.map((x: any) => <Row key={x.id} title={x.description} date={x.createdAt} amount={`${Number(x.rpAmount) ? `${Number(x.rpAmount) > 0 ? "+" : "−"} RP ${fmt(x.rpAmount)}` : ""}${Number(x.rpAmount) && Number(x.kgoldAmount) ? " · " : ""}${Number(x.kgoldAmount) ? `${Number(x.kgoldAmount) > 0 ? "+" : "−"} ${fmt(x.kgoldAmount)} KGOLD` : ""}`} positive={Number(x.rpAmount) > 0 || Number(x.kgoldAmount) > 0} />)}
    </Section>

    <Section icon={<CreditCard />} title={tr("vn.hist.topups")} empty={!data?.topups?.length}>
      {data?.topups?.map((x: any) => <Row key={x.id} title={`${method(x.paymentMethod)} · ${status(x.status)}`} date={x.createdAt} amount={`RP ${fmt(x.amount)}`} positive={x.status === "approved"} />)}
    </Section>

    <Section icon={<Gift />} title={tr("vn.hist.gifts")} empty={!data?.gifts?.length}>
      {data?.gifts?.map((x: any) => <Row key={x.id} title={tr(x.direction === "received" ? "vn.hist.receivedGift" : "vn.hist.sentGift", { gift: x.giftName || tr("vn.hist.giftWord") })} date={x.createdAt} amount={`${x.direction === "received" ? "+" : "−"} ${fmt(x.direction === "received" ? x.recipientKgold : x.kgoldCost)} KGOLD`} positive={x.direction === "received"} />)}
    </Section>

    <Section icon={<Gift />} title={tr("vn.hist.prizes")} empty={!data?.prizes?.length}>
      {data?.prizes?.map((x: any) => <Row key={x.id} title={tData(x.prizeLabel) || x.prizeType || tr("vn.hist.spinReward")} date={x.createdAt} amount={status(x.status)} positive={x.status !== "rejected"} />)}
    </Section>
  </RebornLayout>;
}

function Section({ icon, title, empty, children }: any) {
  const { t } = useTranslation();
  return <section className="mb-6"><h2 className="font-bold mb-2 flex items-center gap-2 text-amber-200">{icon && <span className="[&>svg]:w-4 [&>svg]:h-4">{icon}</span>}{title}</h2>{empty ? <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/40">{t("vn.hist.noRecords")}</p> : <div className="space-y-2">{children}</div>}</section>;
}
function Row({ title, date, amount, positive }: any) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-3"><div className="flex-1 min-w-0"><p className="font-semibold capitalize truncate">{title}</p><p className="text-xs text-white/40">{when(date)}</p></div><span className={`text-sm font-bold text-right ${positive ? "text-emerald-300" : "text-white/70"}`}>{amount}</span></div>;
}
