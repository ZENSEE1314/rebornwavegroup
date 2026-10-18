// A TV opens this short address (/tv), shows a code, and moves to its own page as soon as the admin types the code next to one of the TV screens in the app.
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";

const POLL_MS = 2000;
const RETRY_MS = 5000;

export default function TvPair() {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const newCode = useCallback(async () => {
    try {
      const res = await fetch("/api/tv/pair", { method: "POST", cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setCode((await res.json()).code);
      setError("");
    } catch { setError(t("hm.tv.pairError")); }
  }, [t]);

  useEffect(() => { void newCode(); }, [newCode]);

  useEffect(() => {
    if (!code) { const retry = window.setTimeout(() => void newCode(), RETRY_MS); return () => window.clearTimeout(retry); }
    const timer = window.setInterval(async () => {
      try {
        const answer = await (await fetch(`/api/tv/pair/${code}`, { cache: "no-store" })).json();
        if (answer.status === "linked") window.location.replace(answer.path);
        else if (answer.status === "expired") { setCode(""); void newCode(); }
      } catch { /* the connection dropped for a moment: ask again */ }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [code, newCode]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black p-8 text-center text-white">
      <p className="mb-6 text-3xl font-bold text-white/80">{t("hm.tv.pairTitle")}</p>
      <p className="font-mono text-[9rem] font-black leading-none tracking-[0.15em] text-amber-300" aria-live="polite">{code ? `${code.slice(0, 3)} ${code.slice(3)}` : "···"}</p>
      <p className="mt-8 max-w-3xl text-2xl text-white/70">{t("hm.tv.pairSteps")}</p>
      {error && <p role="alert" className="mt-4 text-xl text-red-300">{error}</p>}
    </div>
  );
}
