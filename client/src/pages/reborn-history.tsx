import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RebornLayout } from "@/components/RebornLayout";
import { printReceipt } from "@/lib/receipt";
import { ReceiptText, Coins, Gift, CreditCard, ChevronDown, Printer } from "lucide-react";

const fmt = (n: any) => Math.abs(Number(n) || 0).toLocaleString("en-US");
const when = (v: any) => v ? new Date(v).toLocaleString() : "";

export default function RebornHistory() {
  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/reborn/history"], queryFn: () => apiRequest("GET", "/api/reborn/history").then((r) => r.json()) });
  const [open, setOpen] = useState<number | null>(null);
  if (isLoading) return <RebornLayout active="/profile" title="MY HISTORY"><p className="text-white/50">Loading history…</p></RebornLayout>;
  return <RebornLayout active="/profile" title="MY HISTORY">
    <h1 className="text-2xl font-extrabold mb-1">Payments & rewards</h1>
    <p className="text-sm text-white/50 mb-5">Receipts, RP top-ups, KGOLD, gifts and prize redemptions.</p>

    <Section icon={<ReceiptText />} title="Orders & receipts" empty={!data?.tickets?.length}>
      {data?.tickets?.map((t: any) => <div key={t.id} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <button onClick={() => setOpen(open === t.id ? null : t.id)} className="w-full p-4 flex items-center gap-3 text-left"><div className="flex-1"><p className="font-bold">{t.orderNo}</p><p className="text-xs text-white/45">{when(t.paidAt || t.createdAt)} · {t.status}</p></div><p className="font-bold text-amber-300">RP {fmt(t.total)}</p><ChevronDown className={`w-4 h-4 transition-transform ${open === t.id ? "rotate-180" : ""}`} /></button>
        {open === t.id && <div className="border-t border-white/10 p-4 space-y-2">{t.items?.map((i: any) => <div key={i.id} className="flex justify-between text-sm"><span>{i.qty}× {i.name}</span><span>RP {fmt(i.lineTotal)}</span></div>)}<button onClick={() => printReceipt(t, { clubName: "Reborn Wave Group", footer: "Thank you — see you again!" })} className="mt-2 w-full py-2.5 rounded-xl bg-amber-300 text-black font-bold flex items-center justify-center gap-2"><Printer className="w-4 h-4" /> Print receipt</button></div>}
      </div>)}
    </Section>

    <Section icon={<Coins />} title="RP & KGOLD" empty={!data?.wallet?.length}>
      {data?.wallet?.map((x: any) => <Row key={x.id} title={x.description} date={x.createdAt} amount={`${Number(x.rpAmount) ? `${Number(x.rpAmount) > 0 ? "+" : "−"} RP ${fmt(x.rpAmount)}` : ""}${Number(x.rpAmount) && Number(x.kgoldAmount) ? " · " : ""}${Number(x.kgoldAmount) ? `${Number(x.kgoldAmount) > 0 ? "+" : "−"} ${fmt(x.kgoldAmount)} KGOLD` : ""}`} positive={Number(x.rpAmount) > 0 || Number(x.kgoldAmount) > 0} />)}
    </Section>

    <Section icon={<CreditCard />} title="Top-up requests" empty={!data?.topups?.length}>
      {data?.topups?.map((x: any) => <Row key={x.id} title={`${x.paymentMethod} · ${x.status}`} date={x.createdAt} amount={`RP ${fmt(x.amount)}`} positive={x.status === "approved"} />)}
    </Section>

    <Section icon={<Gift />} title="Gift history" empty={!data?.gifts?.length}>
      {data?.gifts?.map((x: any) => <Row key={x.id} title={`${x.direction === "received" ? "Received" : "Sent"} ${x.giftName || "gift"}`} date={x.createdAt} amount={`${x.direction === "received" ? "+" : "−"} ${fmt(x.direction === "received" ? x.recipientKgold : x.kgoldCost)} KGOLD`} positive={x.direction === "received"} />)}
    </Section>

    <Section icon={<Gift />} title="Prizes & redemptions" empty={!data?.prizes?.length}>
      {data?.prizes?.map((x: any) => <Row key={x.id} title={x.prizeLabel || x.prizeType || "Spin reward"} date={x.createdAt} amount={x.status} positive={x.status !== "rejected"} />)}
    </Section>
  </RebornLayout>;
}

function Section({ icon, title, empty, children }: any) {
  return <section className="mb-6"><h2 className="font-bold mb-2 flex items-center gap-2 text-amber-200">{icon && <span className="[&>svg]:w-4 [&>svg]:h-4">{icon}</span>}{title}</h2>{empty ? <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/40">No records yet.</p> : <div className="space-y-2">{children}</div>}</section>;
}
function Row({ title, date, amount, positive }: any) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-3"><div className="flex-1 min-w-0"><p className="font-semibold capitalize truncate">{title}</p><p className="text-xs text-white/40">{when(date)}</p></div><span className={`text-sm font-bold text-right ${positive ? "text-emerald-300" : "text-white/70"}`}>{amount}</span></div>;
}
