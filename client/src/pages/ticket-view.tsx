import { useEffect, useState } from "react";
import { useRoute } from "wouter";

// Public ticket page — the holder lands here by scanning their ticket QR.
export default function TicketView() {
  const [, params] = useRoute("/ticket/:code");
  const code = params?.code || "";
  const [t, setT] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/v1/ticket/${code}`).then(async (r) => {
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d?.message || "Ticket not found."); return; }
      setT(d);
    }).catch(() => setError("Network error."));
  }, [code]);

  const primary = t?.company?.theme?.primaryColor || "#06b6d4";
  const used = t?.status === "used";
  const cancelled = t?.status === "cancelled";

  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-white" style={{ background: "radial-gradient(120% 100% at 50% 0%, #141024 0%, #0a0714 60%)" }}>
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[.04] p-6 text-center">
        {error ? <p className="text-amber-300">{error}</p> : !t ? <p className="text-white/50">Loading…</p> : (<>
          <div className="mb-3 flex items-center justify-center gap-2">
            {t.company.logoUrl ? <img src={t.company.logoUrl} className="h-8 w-8 rounded-lg object-cover" alt="" /> : <span className="grid h-8 w-8 place-items-center rounded-lg font-black text-black" style={{ background: primary }}>{(t.company.appName || "?")[0]}</span>}
            <b>{t.company.appName}</b>
          </div>
          <h1 className="text-2xl font-extrabold">{t.event}</h1>
          {t.startsAt && <p className="mt-1 text-white/60">{new Date(t.startsAt).toLocaleString()}</p>}
          {t.venue && <p className="text-white/50">{t.venue}</p>}
          <div className="my-5 rounded-2xl border border-dashed border-white/20 p-4">
            <p className="text-xs uppercase tracking-widest text-white/40">{t.type || "Ticket"}</p>
            <p className="mt-1 font-mono text-2xl font-black tracking-widest">{t.code}</p>
            {t.buyer && <p className="mt-1 text-sm text-white/60">{t.buyer}</p>}
          </div>
          <div className={`rounded-xl px-4 py-3 font-bold ${cancelled ? "bg-red-500/15 text-red-300" : used ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>
            {cancelled ? "Cancelled" : used ? `Checked in${t.checkedInAt ? ` · ${new Date(t.checkedInAt).toLocaleTimeString()}` : ""}` : "✅ Valid — show this at the door"}
          </div>
        </>)}
      </div>
    </div>
  );
}
