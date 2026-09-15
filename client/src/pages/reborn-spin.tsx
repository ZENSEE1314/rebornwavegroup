import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { RebornLayout } from "@/components/RebornLayout";
import { Coins, Gift, History as HistoryIcon, Disc3, Check, Clock, X } from "lucide-react";

const TABS = ["Wheel", "My Prizes", "History"] as const;

export default function RebornSpin() {
  const qc = useQueryClient();
  const { user } = useAuth();
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
    if (tokens < cost) { setResult({ error: "Not enough tokens. Feed your pet to earn more!" }); return; }
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
    <RebornLayout active="/spin" title="SPIN & WIN">
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-full bg-white/5 border border-white/10 mb-5">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-full text-sm font-semibold transition-colors ${tab === t ? "text-black" : "text-white/60"}`} style={tab === t ? { background: "linear-gradient(90deg,#c9a84c,#f0d787)" } : undefined}>{t}</button>
        ))}
      </div>

      {tab === "Wheel" && (
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-white/5 border border-white/10">
            <Coins className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-amber-300">{tokens} tokens</span>
            <span className="text-white/40 text-sm">· {cost} per spin</span>
          </div>

          <Wheel prizes={prizes} rotation={rotation} spinning={spinning} />

          <button onClick={doSpin} disabled={spinning || n === 0}
            className="mt-6 px-10 py-4 rounded-full font-extrabold text-lg text-black shadow-lg disabled:opacity-50 active:scale-95 transition-transform"
            style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>
            {spinning ? "Spinning…" : tokens < cost ? "Need more tokens" : "SPIN"}
          </button>
          <p className="text-white/40 text-xs mt-3 text-center max-w-xs">Prizes are held for you to claim — show them to our staff and an admin confirms your reward.</p>
        </div>
      )}

      {tab === "My Prizes" && <MyPrizes />}
      {tab === "History" && <SpinHistory />}

      {/* Result modal */}
      {result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setResult(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-[#140d26] border border-white/10 rounded-3xl p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setResult(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><X className="w-4 h-4" /></button>
            {result.error ? (
              <><div className="text-4xl mb-3">🙁</div><p className="text-white/80">{result.error}</p></>
            ) : (
              <>
                <div className="text-5xl mb-3">{result.prize?.prizeType === "nothing" ? "🎯" : result.freeSpin ? "🔄" : result.prize?.prizeType === "egg" ? "🥚" : "🎉"}</div>
                <h3 className="text-xl font-extrabold mb-1">{result.prize?.label}</h3>
                <p className="text-white/60 text-sm">{result.message}</p>
                {result.status === "unused" && <p className="mt-3 text-xs text-amber-300 bg-amber-400/10 rounded-xl py-2 px-3">Saved to “My Prizes”. Tap “Use” there when you're at the club — 1 prize per day.</p>}
                {result.freeSpin ? (
                  <button onClick={() => { setResult(null); doSpin(); }} className="mt-4 w-full py-3 rounded-xl font-bold text-black" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>Spin again free</button>
                ) : (
                  <button onClick={() => setResult(null)} className="mt-4 w-full py-3 rounded-xl font-bold bg-white/10">Done</button>
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
      return { path: `M${C},${C} L${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} Z`, color: p.colorHex || "#c9a84c", mid, flip, label: p.label || "" };
    });
  }, [prizes, n]);

  const fontFor = (len: number) => (len > 22 ? 8 : len > 15 ? 9 : 10.5);

  return (
    <div className="relative" style={{ width: 320, maxWidth: "88vw" }}>
      {/* pointer */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-1 z-10" style={{ width: 0, height: 0, borderLeft: "14px solid transparent", borderRight: "14px solid transparent", borderTop: "24px solid #f0d787", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }} />
      <svg viewBox="0 0 320 320" className="w-full" style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? "transform 4s cubic-bezier(0.15,0.9,0.25,1)" : "none" }}>
        <circle cx={C} cy={C} r={R + 6} fill="#0a0714" stroke="#c9a84c" strokeWidth="4" />
        {slices.map((s, i) => <path key={"p" + i} d={s.path} fill={s.color} stroke="rgba(0,0,0,0.25)" strokeWidth="1" />)}
        {/* radial labels: rotate to the slice spoke; flip bottom half so words stay upright and readable end-to-end */}
        {slices.map((s, i) => (
          <g key={"t" + i} transform={`rotate(${s.mid} ${C} ${C})${s.flip ? ` rotate(180 ${C} ${C - R * 0.55})` : ""}`}>
            <text x={C} y={C - R * 0.55} fill="#0a0714" fontSize={fontFor(s.label.length)} fontWeight="700" textAnchor="middle" dominantBaseline="middle">{s.label}</text>
          </g>
        ))}
        <circle cx={C} cy={C} r="26" fill="#140d26" stroke="#c9a84c" strokeWidth="3" />
      </svg>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"><Disc3 className="w-7 h-7 text-amber-300" /></div>
    </div>
  );
}

function MyPrizes() {
  const qc = useQueryClient();
  const { data } = useQuery<{ prizes: any[]; canUseNow: boolean; cooldownHoursLeft: number }>({
    queryKey: ["/api/reborn/prizes"],
    queryFn: () => apiRequest("GET", "/api/reborn/prizes").then((r) => r.json()),
  });
  const use = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/reborn/prizes/${id}/use`).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/reborn/prizes"] }),
  });
  const prizes = data?.prizes || [];
  const canUseNow = data?.canUseNow ?? true;
  if (prizes.length === 0) return <Empty icon={<Gift className="w-10 h-10" />} text="No prizes yet. Spin the wheel to win!" />;
  return (
    <div className="space-y-2">
      {!canUseNow && <p className="text-xs text-amber-300 bg-amber-400/10 rounded-xl py-2 px-3 mb-1">You can use 1 prize per day — next in ~{data?.cooldownHoursLeft}h.</p>}
      {prizes.map((p) => (
        <div key={p.id} className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(201,168,76,0.15)" }}><Gift className="w-5 h-5 text-amber-300" /></span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{p.prizeLabel}</p>
            <p className="text-xs text-white/40">{new Date(p.createdAt).toLocaleDateString()}</p>
          </div>
          {p.status === "redeemed" ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400"><Check className="w-3 h-3" /> Claimed</span>
            : p.status === "redeeming" ? <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-400"><Clock className="w-3 h-3" /> With staff</span>
            : <button onClick={() => use.mutate(p.id)} disabled={!canUseNow || use.isPending} className="px-4 py-2 rounded-full text-xs font-bold text-black disabled:opacity-40" style={{ background: "linear-gradient(90deg,#c9a84c,#f0d787)" }}>Use</button>}
        </div>
      ))}
    </div>
  );
}

function SpinHistory() {
  const { data: rows = [] } = useQuery<any[]>({
    queryKey: ["/api/reborn/spin/history"],
    queryFn: () => apiRequest("GET", "/api/reborn/spin/history").then((r) => r.json()),
  });
  if (rows.length === 0) return <Empty icon={<HistoryIcon className="w-10 h-10" />} text="No spins yet." />;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
          <span className="text-sm">{r.prizeLabel}</span>
          <span className="text-xs text-white/40">{new Date(r.createdAt).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function Empty({ icon, text }: any) {
  return <div className="text-center py-12 text-white/40"><div className="flex justify-center mb-3 opacity-40">{icon}</div><p>{text}</p></div>;
}
