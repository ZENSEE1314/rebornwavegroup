import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { RebornLayout } from "@/components/RebornLayout";
import { useTranslation, localeTag, tData } from "@/lib/i18n";
import { Coins, Gift, History as HistoryIcon, Disc3, Check, Clock, X } from "lucide-react";

const TABS = ["Wheel", "My Prizes", "History"] as const;
const TAB_KEY: Record<(typeof TABS)[number], string> = { "Wheel": "hm.spin.tabWheel", "My Prizes": "hm.spin.tabPrizes", "History": "hm.spin.tabHistory" };

export default function RebornSpin() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation();
  const tokens = (user as any)?.tokens ?? 0;
  const initialTab = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "prizes" ? "My Prizes" : "Wheel";
  const [tab, setTab] = useState<(typeof TABS)[number]>(initialTab as any);

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const spinningRef = useRef(false);

  const { data: cfg } = useQuery<{ cost: number; prizes: any[] }>({
    queryKey: ["/api/reborn/spin/prizes"],
    queryFn: () => apiRequest("GET", "/api/reborn/spin/prizes").then((r) => r.json()),
  });
  const prizes = cfg?.prizes || [];
  const cost = cfg?.cost ?? 1;
  const n = prizes.length;
  const seg = n ? 360 / n : 0;

  const doSpin = async () => {
    if (spinningRef.current || n === 0) return;
    if (tokens < cost) { setResult({ error: t("hm.spin.notEnough") }); return; }
    spinningRef.current = true; setSpinning(true); setResult(null);
    try {
      const res = await apiRequest("POST", "/api/reborn/spin").then((r) => r.json());
      const index = Math.max(0, res.prizeIndex ?? 0);
      const targetC = index * seg + seg / 2;
      const landing = (360 - targetC + 360) % 360;
      setRotation((prev) => Math.ceil(prev / 360) * 360 + 360 * 5 + landing);
      setTimeout(() => {
        setResult(res); setSpinning(false); spinningRef.current = false;
        qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
        qc.invalidateQueries({ queryKey: ["/api/reborn/prizes"] });
        qc.invalidateQueries({ queryKey: ["/api/reborn/pets"] });
      }, 4200);
    } catch (e: any) {
      setResult({ error: e.message }); setSpinning(false); spinningRef.current = false;
    }
  };

  return (
    <RebornLayout active="/spin" title={t("hm.spin.pageTitle")}>
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-full bg-white/5 border border-white/10 mb-5">
        {TABS.map((tb) => (
          <button key={tb} onClick={() => setTab(tb)} className={`flex-1 py-2 rounded-full text-sm font-semibold transition-colors ${tab === tb ? "text-black" : "text-white/60"}`} style={tab === tb ? { background: "linear-gradient(90deg,#c9a84c,#f0d787)" } : undefined}>{t(TAB_KEY[tb])}</button>
        ))}
      </div>

      {tab === "Wheel" && (
        <div className="flex flex-col items-center">
          <div className="rwg-token-chip flex items-center gap-2 mb-5 px-4 py-2 rounded-full border">
            <Coins className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-amber-300">{t("hm.spin.tokens", { n: tokens })}</span>
            <span className="text-white/40 text-sm">· {t("hm.spin.perSpin", { n: cost })}</span>
          </div>

          <Wheel prizes={prizes} rotation={rotation} spinning={spinning} />

          <button onClick={doSpin} disabled={spinning || n === 0}
            className="arc-play arc-start spin-go mt-8 justify-center disabled:opacity-50">
            {spinning ? t("hm.spin.spinning") : tokens < cost ? t("hm.spin.needMore") : t("hm.spin.spin")}
          </button>
          <p className="text-white/40 text-xs mt-3 text-center max-w-xs">{t("hm.spin.heldNote")}</p>
        </div>
      )}

      {tab === "My Prizes" && <MyPrizes />}
      {tab === "History" && <SpinHistory />}

      {/* Result modal */}
      {result && (
        <div className="kos-sheet fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setResult(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="kos-sheet-box relative w-full max-w-sm rounded-3xl p-6 text-center" style={{ borderColor: "rgba(247,215,116,.55)" }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setResult(null)} className="arc-btn" style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32 }}><X className="w-4 h-4" /></button>
            {result.error ? (
              <><div className="text-4xl mb-3">🙁</div><p className="text-white/80">{result.error}</p></>
            ) : (
              <>
                <div className="text-5xl mb-3">{result.prize?.prizeType === "nothing" ? "🎯" : result.freeSpin ? "🔄" : result.prize?.prizeType === "egg" ? "🥚" : "🎉"}</div>
                <h3 className="arc-title mb-1" style={{ ["--c1" as any]: "#f3b52f", fontSize: 22 }}>{tData(result.prize?.label)}</h3>
                <p className="text-white/60 text-sm">{result.message}</p>
                {result.status === "unused" && <p className="mt-3 text-xs text-amber-300 bg-amber-400/10 rounded-xl py-2 px-3">{t("hm.spin.savedNote")}</p>}
                {result.freeSpin ? (
                  <button onClick={() => { setResult(null); doSpin(); }} className="arc-play arc-start mt-4 w-full justify-center" style={{ padding: 12, fontSize: 14 }}>{t("hm.spin.again")}</button>
                ) : (
                  <button onClick={() => setResult(null)} className="mt-4 w-full py-3 rounded-xl font-bold bg-white/10">{t("hm.common.done")}</button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </RebornLayout>
  );
}

function Wheel({ prizes, rotation, spinning }: { prizes: any[]; rotation: number; spinning: boolean }) {
  const n = prizes.length;
  const R = 150, C = 160;
  const slices = useMemo(() => {
    if (!n) return [];
    const seg = 360 / n;
    return prizes.map((p, i) => {
      const a0 = (i * seg - 90) * (Math.PI / 180);
      const a1 = ((i + 1) * seg - 90) * (Math.PI / 180);
      const x0 = C + R * Math.cos(a0), y0 = C + R * Math.sin(a0);
      const x1 = C + R * Math.cos(a1), y1 = C + R * Math.sin(a1);
      const large = seg > 180 ? 1 : 0;
      const mid = (i + 0.5) * seg; // degrees clockwise from top
      const flip = mid > 90 && mid < 270; // bottom half → keep text upright
      return { path: `M${C},${C} L${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} Z`, color: p.colorHex || "#c9a84c", mid, flip, label: tData(p.label) };
    });
  }, [prizes, n]);

  const fontFor = (len: number) => (len > 24 ? 7 : len > 18 ? 8.5 : len > 12 ? 10 : 11);
  const inner = 30, outer = R - 6;
  const midR = (inner + outer) / 2; // centre each label on the middle of its slice

  return (
    <div className="spin-wheel relative isolate" style={{ width: 320, maxWidth: "88vw" }}>
      {/* pointer */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-1 z-10" style={{ width: 0, height: 0, borderLeft: "14px solid transparent", borderRight: "14px solid transparent", borderTop: "24px solid #f0d787", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }} />
      <svg viewBox="0 0 320 320" className="w-full" style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? "transform 4s cubic-bezier(0.15,0.9,0.25,1)" : "none" }}>
        <circle cx={C} cy={C} r={R + 6} fill="#0a0714" stroke="#c9a84c" strokeWidth="4" />
        {slices.map((s, i) => <path key={"p" + i} d={s.path} fill={s.color} stroke="rgba(0,0,0,0.25)" strokeWidth="1" />)}
        {/* labels run ALONG each spoke (radially), from just outside the hub to the rim */}
        {slices.map((s, i) => {
          const t = s.flip
            ? `translate(${C} ${C}) rotate(${s.mid + 90}) translate(${-midR} 0)`
            : `translate(${C} ${C}) rotate(${s.mid - 90}) translate(${midR} 0)`;
          return (
            <text key={"t" + i} x={0} y={0} transform={t} textAnchor="middle" dominantBaseline="central"
              fill="#0a0714" fontSize={fontFor(s.label.length)} fontWeight="700">{s.label}</text>
          );
        })}
        <circle cx={C} cy={C} r="26" fill="#140d26" stroke="#c9a84c" strokeWidth="3" />
      </svg>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"><Disc3 className="w-7 h-7 text-amber-300" /></div>
    </div>
  );
}

function MyPrizes() {
  const qc = useQueryClient();
  const { t, language } = useTranslation();
  const { data } = useQuery<{ prizes: any[]; canUseNow: boolean; cooldownHoursLeft: number }>({
    queryKey: ["/api/reborn/prizes"],
    queryFn: () => apiRequest("GET", "/api/reborn/prizes").then((r) => r.json()),
    refetchInterval: 10000, refetchOnWindowFocus: true,
  });
  const use = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/reborn/prizes/${id}/use`).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/reborn/prizes"] }),
  });
  const prizes = data?.prizes || [];
  const canUseNow = data?.canUseNow ?? true;
  if (prizes.length === 0) return <Empty icon={<Gift className="w-10 h-10" />} text={t("hm.spin.noPrizes")} />;
  return (
    <div className="space-y-2">
      {!canUseNow && <p className="text-xs text-amber-300 bg-amber-400/10 rounded-xl py-2 px-3 mb-1">{t("hm.spin.cooldown", { n: data?.cooldownHoursLeft ?? 0 })}</p>}
      {prizes.map((p) => (
        <div key={p.id} className="arc-room-row" style={{ ["--c1" as any]: p.status === "redeemed" ? "#22c55e" : "#f3b52f" }}>
          <span className="arc-icon shrink-0" style={{ width: 44, height: 44, fontSize: 20, ["--c1" as any]: "#ffe89a", ["--c2" as any]: "#f3b52f" }}><span><Gift className="w-5 h-5 text-white" /></span></span>
          <div className="flex-1 min-w-0">
            <p className="font-black italic truncate">{tData(p.prizeLabel)}</p>
            <p className="text-xs text-white/40">{new Date(p.createdAt).toLocaleDateString(localeTag(language))}</p>
          </div>
          {p.status === "redeemed" ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400"><Check className="w-3 h-3" /> {t("hm.spin.claimed")}</span>
            : p.status === "redeeming" ? <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-400"><Clock className="w-3 h-3" /> {t("hm.spin.withStaff")}</span>
            : <button onClick={() => use.mutate(p.id)} disabled={!canUseNow || use.isPending} className="arc-play disabled:opacity-40">{t("hm.spin.use")}</button>}
        </div>
      ))}
    </div>
  );
}

function SpinHistory() {
  const { t, language } = useTranslation();
  const { data: rows = [] } = useQuery<any[]>({
    queryKey: ["/api/reborn/spin/history"],
    queryFn: () => apiRequest("GET", "/api/reborn/spin/history").then((r) => r.json()),
  });
  if (rows.length === 0) return <Empty icon={<HistoryIcon className="w-10 h-10" />} text={t("hm.spin.noSpins")} />;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
          <span className="text-sm">{tData(r.prizeLabel)}</span>
          <span className="text-xs text-white/40">{new Date(r.createdAt).toLocaleString(localeTag(language))}</span>
        </div>
      ))}
    </div>
  );
}

function Empty({ icon, text }: any) {
  return <div className="text-center py-12 text-white/40"><div className="flex justify-center mb-3 opacity-40">{icon}</div><p>{text}</p></div>;
}
