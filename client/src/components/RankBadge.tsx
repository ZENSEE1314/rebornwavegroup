import { computeRank, type Tier } from "@/lib/rank";

// Compact rank emblem: colored gem + tier/division + star pips (or Legend Nx).
export function RankBadge({ stars, tiers, size = "md" }: { stars: number; tiers: Tier[]; size?: "sm" | "md" | "lg" }) {
  if (!tiers?.length) return null;
  const r = computeRank(stars, tiers);
  const big = size === "lg";
  const gem = big ? 48 : size === "sm" ? 26 : 34;
  return (
    <div className="inline-flex items-center gap-2">
      <div className="rounded-xl flex items-center justify-center font-black shrink-0"
        style={{ width: gem, height: gem, background: r.isLegend ? "linear-gradient(135deg,#a855f7,#f0d787)" : `linear-gradient(135deg,${r.color},#0a1e26)`, color: "#0a0a0a", fontSize: gem * 0.42, boxShadow: `0 2px 10px ${r.color}55` }}>
        {r.isLegend ? "★" : r.tier[0]}
      </div>
      <div className="min-w-0">
        <p className={`font-extrabold leading-tight ${big ? "text-base" : "text-xs"}`} style={{ color: r.isLegend ? "#e9d5ff" : r.color }}>{r.label}</p>
        {!r.isLegend ? (
          <div className="flex gap-0.5 mt-0.5">
            {Array.from({ length: r.perDiv }).map((_, i) => (
              <span key={i} style={{ color: i < r.starsInDiv ? "#f0d787" : "rgba(255,255,255,0.2)", fontSize: big ? 16 : 11 }}>★</span>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-white/50 leading-tight">Legend {r.legendLevel}★</p>
        )}
      </div>
    </div>
  );
}
