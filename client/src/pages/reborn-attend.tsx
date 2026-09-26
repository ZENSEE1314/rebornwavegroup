import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";

// Landing page when a worker scans the workplace attendance QR (/attend?c=CODE).
export default function RebornAttend() {
  const [state, setState] = useState<"checking" | "ok" | "err" | "login">("checking");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("c") || "";
    apiRequest("POST", "/api/reborn/staff/check-in", { code: c })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (r.status === 401 || r.status === 403) { setState("login"); return; }
        if (!r.ok) { setMsg(d?.message || "Check-in failed."); setState("err"); return; }
        setState("ok");
      })
      .catch(() => { setMsg("Network error — try again."); setState("err"); });
  }, []);

  const now = new Date().toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-white text-center" style={{ background: "radial-gradient(120% 100% at 50% 0%, #1a1030 0%, #0a0714 60%)" }}>
      <div className="rwg-card p-8 max-w-sm w-full">
        {state === "checking" && <p className="text-white/60">Checking you in…</p>}
        {state === "ok" && (<>
          <div className="text-7xl mb-3">✅</div>
          <h1 className="text-2xl font-extrabold text-emerald-300">Checked in!</h1>
          <p className="text-white/60 mt-2">{now}</p>
          <a href="/reborn-admin" className="inline-block mt-6 px-5 py-3 rounded-xl font-bold text-black" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>Open app</a>
        </>)}
        {state === "login" && (<>
          <div className="text-6xl mb-3">🔒</div>
          <h1 className="text-xl font-extrabold">Please log in first</h1>
          <p className="text-white/60 mt-2 text-sm">Log in to your staff account, then scan the QR again.</p>
          <a href="/login" className="inline-block mt-6 px-5 py-3 rounded-xl font-bold text-black" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>Log in</a>
        </>)}
        {state === "err" && (<>
          <div className="text-6xl mb-3">⚠️</div>
          <h1 className="text-xl font-extrabold text-amber-300">Couldn't check in</h1>
          <p className="text-white/60 mt-2 text-sm">{msg}</p>
          <button onClick={() => window.location.reload()} className="mt-6 px-5 py-3 rounded-xl font-bold text-black" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>Try again</button>
        </>)}
      </div>
    </div>
  );
}
