import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useTranslation, getCurrentLanguage, localeTag } from "@/lib/i18n";

type MenuItem = { id: number; name: string; price: string; category: string; imageUrl?: string };
type Info = { table: { id: number; name: string }; company: { appName: string; logoUrl?: string; theme?: any }; menu: MenuItem[] };

// Public self-ordering page: customer scans a table QR → /order/t/:token
export default function OrderTable() {
  const [, params] = useRoute("/order/t/:token");
  const token = params?.token || "";
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { t, language } = useTranslation();

  useEffect(() => {
    fetch(`/api/v1/order/${token}`, { headers: { "X-Lang": getCurrentLanguage() } }).then(async (r) => {
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d?.message || t("vn.otable.qrInactive")); return; }
      setInfo(d);
    }).catch(() => setError(t("vn.otable.networkError")));
  }, [token]);

  const primary = info?.company?.theme?.primaryColor || "#06b6d4";
  const lines = Object.entries(cart).filter(([, q]) => q > 0);
  const total = lines.reduce((s, [id, q]) => s + Number(info?.menu.find((m) => m.id === Number(id))?.price || 0) * q, 0);
  const setQty = (id: number, q: number) => setCart((c) => ({ ...c, [id]: Math.max(0, q) }));

  const submit = async () => {
    setBusy(true); setError("");
    try {
      const r = await fetch(`/api/v1/order/${token}`, { method: "POST", headers: { "Content-Type": "application/json", "X-Lang": getCurrentLanguage() }, body: JSON.stringify({ items: lines.map(([id, q]) => ({ productId: Number(id), qty: q })) }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d?.message || t("vn.otable.couldNotPlace")); setBusy(false); return; }
      setSent(d.orderNo); setCart({});
    } catch { setError(t("vn.otable.networkRetry")); }
    setBusy(false);
  };

  if (error && !info) return <Center><p className="text-amber-300">{error}</p></Center>;
  if (!info) return <Center><p className="text-white/50">{t("vn.otable.loadingMenu")}</p></Center>;

  const cats = Array.from(new Set(info.menu.map((m) => m.category || t("vn.otable.menu"))));
  return (
    <div className="min-h-screen pb-32 text-white" style={{ background: "radial-gradient(120% 100% at 50% 0%, #141024 0%, #0a0714 60%)" }}>
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 px-4 py-3 backdrop-blur" style={{ background: "rgba(10,7,20,.8)" }}>
        {info.company.logoUrl ? <img src={info.company.logoUrl} className="h-9 w-9 rounded-lg object-cover" alt="" /> : <span className="grid h-9 w-9 place-items-center rounded-lg font-black text-black" style={{ background: primary }}>{(info.company.appName || "?")[0]}</span>}
        <div><b>{info.company.appName}</b><p className="text-xs text-white/50">{t("vn.order.tableN", { n: info.table.name })}</p></div>
      </header>

      {sent ? (
        <Center><div className="text-center"><div className="text-6xl mb-3">✅</div><h1 className="text-2xl font-extrabold text-emerald-300">{t("vn.otable.orderSent")}</h1><p className="mt-2 text-white/60">{t("vn.otable.onItsWay", { n: sent })}</p><button className="mt-6 rounded-xl px-5 py-3 font-bold text-black" style={{ background: primary }} onClick={() => setSent(null)}>{t("vn.otable.orderMore")}</button></div></Center>
      ) : (
        <main className="mx-auto max-w-lg px-4 py-4">
          {cats.map((cat) => (
            <section key={cat} className="mb-5">
              <h2 className="mb-2 text-sm font-black uppercase tracking-wider text-white/50">{cat}</h2>
              <div className="space-y-2">{info.menu.filter((m) => (m.category || t("vn.otable.menu")) === cat).map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.03] p-3">
                  {m.imageUrl && <img src={m.imageUrl} className="h-12 w-12 rounded-lg object-cover" alt="" />}
                  <div className="min-w-0 flex-1"><b className="block truncate">{m.name}</b><span className="text-sm text-white/60">{Number(m.price).toLocaleString(localeTag(language))}</span></div>
                  {cart[m.id] ? (
                    <div className="flex items-center gap-2"><button aria-label={t("vn.order.decrease")} className="h-8 w-8 rounded-lg bg-white/10 text-lg" onClick={() => setQty(m.id, (cart[m.id] || 0) - 1)}>−</button><span className="w-5 text-center">{cart[m.id]}</span><button aria-label={t("vn.order.increase")} className="h-8 w-8 rounded-lg text-lg text-black" style={{ background: primary }} onClick={() => setQty(m.id, (cart[m.id] || 0) + 1)}>+</button></div>
                  ) : (
                    <button className="rounded-lg px-3 py-2 text-sm font-bold text-black" style={{ background: primary }} onClick={() => setQty(m.id, 1)}>{t("vn.order.add")}</button>
                  )}
                </div>
              ))}</div>
            </section>
          ))}
          {info.menu.length === 0 && <p className="text-white/50">{t("vn.otable.menuEmpty")}</p>}
        </main>
      )}

      {!sent && lines.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 p-4 backdrop-blur" style={{ background: "rgba(10,7,20,.9)" }}>
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="flex-1"><p className="text-xs text-white/50">{t("vn.order.itemsN", { n: lines.reduce((s, [, q]) => s + q, 0) })}</p><b className="text-lg">{total.toLocaleString(localeTag(language))}</b></div>
            <button disabled={busy} className="rounded-xl px-6 py-3 font-bold text-black disabled:opacity-50" style={{ background: primary }} onClick={submit}>{busy ? t("vn.otable.sending") : t("vn.otable.sendKitchen")}</button>
          </div>
          {error && <p className="mx-auto mt-2 max-w-lg text-center text-xs text-red-300">{error}</p>}
        </div>
      )}
    </div>
  );
}

function Center({ children }: { children: any }) {
  return <div className="flex min-h-screen items-center justify-center p-6 text-white" style={{ background: "radial-gradient(120% 100% at 50% 0%, #141024 0%, #0a0714 60%)" }}>{children}</div>;
}
