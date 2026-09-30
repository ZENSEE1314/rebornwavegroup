import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation, translate, localeTag } from "@/lib/i18n";

// Landing page when a worker scans the workplace attendance QR (/attend?c=CODE).
export default function RebornAttend() {
  const [state, setState] = useState<"checking" | "ok" | "err">("checking");
  const [msg, setMsg] = useState("");
  const { t, language } = useTranslation();

  useEffect(() => {
    // Keep the scanned code across a login round-trip: if we were sent to log in
    // and came back, the URL no longer has ?c=, so fall back to the stored code.
    const fromUrl = new URLSearchParams(window.location.search).get("c") || "";
    let c = fromUrl;
    try {
      if (fromUrl) localStorage.setItem("rw_attend_code", fromUrl);
      else c = localStorage.getItem("rw_attend_code") || "";
    } catch {}
    apiRequest("POST", "/api/reborn/staff/check-in", { code: c })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (r.status === 401 || r.status === 403) {
          // Not signed in on this phone — log in, then bounce straight back here.
          window.location.replace("/login?next=" + encodeURIComponent("/attend"));
          return;
        }
        try { localStorage.removeItem("rw_attend_code"); } catch {}
        if (!r.ok) { setMsg(d?.message || translate("vn.attend.failed")); setState("err"); return; }
        setState("ok");
      })
      .catch(() => { setMsg(translate("vn.otable.networkRetry")); setState("err"); });
  }, []);

  const now = new Date().toLocaleString(localeTag(language), { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-white text-center" style={{ background: "radial-gradient(120% 100% at 50% 0%, #1a1030 0%, #0a0714 60%)" }}>
      <div className="rwg-card p-8 max-w-sm w-full">
        {state === "checking" && <p className="text-white/60">{t("vn.attend.checking")}</p>}
        {state === "ok" && (<>
          <div className="text-7xl mb-3">✅</div>
          <h1 className="text-2xl font-extrabold text-emerald-300">{t("vn.attend.checkedIn")}</h1>
          <p className="text-white/60 mt-2">{now}</p>
          <a href="/reborn-admin" className="inline-block mt-6 px-5 py-3 rounded-xl font-bold text-black" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>{t("vn.attend.openApp")}</a>
        </>)}
        {state === "err" && (<>
          <div className="text-6xl mb-3">⚠️</div>
          <h1 className="text-xl font-extrabold text-amber-300">{t("vn.attend.couldnt")}</h1>
          <p className="text-white/60 mt-2 text-sm">{msg}</p>
          <button onClick={() => window.location.reload()} className="mt-6 px-5 py-3 rounded-xl font-bold text-black" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>{t("vn.common.tryAgain")}</button>
        </>)}
      </div>
    </div>
  );
}
