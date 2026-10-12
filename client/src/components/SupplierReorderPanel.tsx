import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquareShare } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type Lang = "en" | "zh" | "id";
interface ItemSetup { at: number; qty: number }
interface Setup { enabled: boolean; lang: Lang; items: Record<string, ItemSetup> }
interface RequestItem { productId: number; name: string; stock: number; qty: number }
interface Request { id: string; supplierName: string; phone: string; items: RequestItem[]; message: string; status: "pending" | "sent" | "failed" | "dismissed"; createdAt: string; error?: string }
interface Product { id: number; name: string; stock: number; supplierName: string; supplierPhone: string }
interface Data { setup: Setup; requests: Request[]; hasAi: boolean; items: Product[] }

const API = "/api/reborn/admin/reorder";
const DEFAULT_LOW_AT = 5;
const DEFAULT_QTY = 24;
const HISTORY_SHOWN = 6;
const box = "rounded-2xl bg-white/5 border border-white/10 p-3 space-y-3";
const small = "w-20 px-2 py-1.5 rounded-lg bg-black/30 border border-white/15 text-sm text-right";
const hasPhone = (phone: string) => phone.replace(/\D/g, "").length >= 8;

function PendingRequest({ request }: { request: Request }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [message, setMessage] = useState(request.message);
  const done = () => qc.invalidateQueries({ queryKey: [API] });
  const send = useMutation({
    mutationFn: () => apiRequest("POST", `${API}/${request.id}/send`, { message }).then((r) => r.json()),
    onSuccess: (d: Request) => { toast({ title: d.status === "sent" ? t("admin.ro.sentOk") : t("admin.ro.sentFail"), variant: d.status === "sent" ? undefined : "destructive" }); done(); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: String(e.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" }),
  });
  const dismiss = useMutation({ mutationFn: () => apiRequest("POST", `${API}/${request.id}/dismiss`, {}).then((r) => r.json()), onSuccess: done });
  return (
    <div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-3 space-y-2">
      <p className="text-sm font-bold">{request.supplierName || t("admin.ro.noName")} <span className="font-normal text-white/50">· +{request.phone}</span></p>
      <p className="text-[11px] text-white/60">{request.items.map((item) => `${item.name} (${item.stock} → +${item.qty})`).join(" · ")}</p>
      <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={Math.min(10, message.split("\n").length + 1)} className="w-full rounded-lg bg-black/30 border border-white/15 p-2 text-sm" />
      {request.status === "failed" && <p className="text-xs text-red-300">{t("admin.ro.sentFail")}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => send.mutate()} disabled={send.isPending || !message.trim()} className="min-h-[44px] px-4 rounded-lg text-sm font-bold bg-emerald-500 text-black disabled:opacity-40">{t("admin.ro.send")}</button>
        <button type="button" onClick={() => dismiss.mutate()} disabled={dismiss.isPending} className="min-h-[44px] px-4 rounded-lg text-sm font-semibold bg-white/5 border border-white/10 text-white/70">{t("admin.ro.dismiss")}</button>
      </div>
    </div>
  );
}

export default function SupplierReorderPanel() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data } = useQuery<Data>({ queryKey: [API], queryFn: () => apiRequest("GET", API).then((r) => r.json()), refetchInterval: 30_000 });
  const [setup, setSetup] = useState<Setup | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => { if (data && !setup) setSetup(data.setup); }, [data, setup]);

  const save = useMutation({
    mutationFn: (next: Setup) => apiRequest("PUT", `${API}/setup`, next).then((r) => r.json()),
    onSuccess: () => { toast({ title: t("admin.ro.saved") }); qc.invalidateQueries({ queryKey: [API] }); },
    onError: (e: any) => toast({ title: t("admin.c.failed"), description: e.message, variant: "destructive" }),
  });
  const check = useMutation({
    mutationFn: () => apiRequest("POST", `${API}/check`, {}).then((r) => r.json()),
    onSuccess: (d: { drafted: number }) => { toast({ title: d.drafted ? t("admin.ro.drafted", { n: String(d.drafted) }) : t("admin.ro.nothingLow") }); qc.invalidateQueries({ queryKey: [API] }); },
  });
  const pending = useMemo(() => (data?.requests || []).filter((r) => r.status === "pending" || r.status === "failed"), [data]);
  const history = useMemo(() => (data?.requests || []).filter((r) => r.status === "sent" || r.status === "dismissed").slice(0, HISTORY_SHOWN), [data]);
  if (!data || !setup) return null;

  const change = (next: Setup) => setSetup(next);
  const toggleItem = (id: number) => {
    const key = String(id);
    const items = { ...setup.items };
    if (items[key]) delete items[key]; else items[key] = { at: DEFAULT_LOW_AT, qty: DEFAULT_QTY };
    change({ ...setup, items });
  };
  const setField = (id: number, field: keyof ItemSetup, value: string) => change({ ...setup, items: { ...setup.items, [String(id)]: { ...setup.items[String(id)], [field]: Math.max(0, Math.floor(Number(value) || 0)) } } });
  const isDirty = JSON.stringify(setup) !== JSON.stringify(data.setup);
  const enabledCount = Object.keys(setup.items).length;

  return (
    <div className={box}>
      <div className="flex items-center gap-2">
        <MessageSquareShare className="w-4 h-4 text-emerald-300" />
        <p className="text-sm font-bold flex-1">{t("admin.ro.title")}</p>
        <button type="button" role="switch" aria-checked={setup.enabled} onClick={() => { const next = { ...setup, enabled: !setup.enabled }; change(next); save.mutate(next); }} className={`px-3 py-1.5 rounded-full text-xs font-bold ${setup.enabled ? "bg-emerald-400 text-black" : "bg-white/10 text-white/60"}`}>{setup.enabled ? t("admin.bx.features.on") : t("admin.bx.features.off")}</button>
      </div>
      <p className="text-[11px] text-white/50">{t("admin.ro.hint")}{data.hasAi ? ` ${t("admin.ro.ai")}` : ` ${t("admin.ro.noAi")}`}</p>

      {pending.length > 0 && <div className="space-y-2"><p className="text-xs font-bold text-amber-300">{t("admin.ro.waiting", { n: String(pending.length) })}</p>{pending.map((request) => <PendingRequest key={request.id} request={request} />)}</div>}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setIsOpen(!isOpen)} className="min-h-[44px] px-4 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-white/80">{t("admin.ro.items", { n: String(enabledCount) })} {isOpen ? "▲" : "▼"}</button>
        <label className="flex items-center gap-1.5 text-xs text-white/60">{t("admin.ro.lang")}
          <select value={setup.lang} onChange={(event) => change({ ...setup, lang: event.target.value as Lang })} className="rounded-lg bg-black/30 border border-white/15 px-2 py-1.5 text-sm"><option value="id">Bahasa</option><option value="en">English</option><option value="zh">中文</option></select>
        </label>
        <button type="button" onClick={() => save.mutate(setup)} disabled={!isDirty || save.isPending} className="min-h-[44px] px-4 rounded-lg text-xs font-bold bg-amber-400 text-black disabled:opacity-40">{t("admin.c.save")}</button>
        <button type="button" onClick={() => check.mutate()} disabled={check.isPending || isDirty || !setup.enabled} className="min-h-[44px] px-4 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-white/80 disabled:opacity-40">{t("admin.ro.checkNow")}</button>
      </div>

      {isOpen && (
        <div className="max-h-96 overflow-y-auto rounded-xl border border-white/10">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 gap-y-1 items-center p-2 text-xs">
            <span className="text-white/40">{t("admin.prod.item")}</span><span className="text-white/40 text-right">{t("admin.ro.lowAt")}</span><span className="text-white/40 text-right">{t("admin.ro.orderQty")}</span>
            {data.items.map((item) => {
              const on = Boolean(setup.items[String(item.id)]);
              return (
                <div key={item.id} className="contents">
                  <label className="flex items-center gap-2 min-w-0 py-1"><input type="checkbox" checked={on} onChange={() => toggleItem(item.id)} /><span className="truncate">{item.name}</span><span className="text-white/40 shrink-0">({item.stock})</span>{on && !hasPhone(item.supplierPhone) && <span className="text-red-300 shrink-0">{t("admin.ro.noPhone")}</span>}</label>
                  {on ? <input type="number" min={0} value={setup.items[String(item.id)].at} onChange={(event) => setField(item.id, "at", event.target.value)} className={small} /> : <span />}
                  {on ? <input type="number" min={1} value={setup.items[String(item.id)].qty} onChange={(event) => setField(item.id, "qty", event.target.value)} className={small} /> : <span />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {history.length > 0 && <ul className="text-[11px] text-white/45 space-y-0.5">{history.map((request) => <li key={request.id}>{request.status === "sent" ? "✓" : "✕"} {request.supplierName || request.phone} · {request.items.map((item) => item.name).join(", ")} · {new Date(request.createdAt).toLocaleDateString()}</li>)}</ul>}
    </div>
  );
}
