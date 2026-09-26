import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";

export interface Tier { name: string; perDiv: number }
export interface RankConfig { seasonStarDrop: number; season: number; tiers: Tier[] }

const DIV_ORDER = ["Bronze", "Silver", "Gold"];
export const DIV_COLOR: Record<string, string> = { Bronze: "#c07b46", Silver: "#b8c0cc", Gold: "#f0c64a" };

export interface Rank {
  tier: string; division: string; color: string;
  starsInDiv: number; perDiv: number; isLegend: boolean; legendLevel: number; label: string; totalStars: number;
}

// Convert career stars → tier/division/star using the ladder config.
export function computeRank(stars: number, tiers: Tier[]): Rank {
  let s = Math.max(0, Math.floor(stars || 0));
  const total = stars || 0;
  for (const t of tiers) {
    const span = t.perDiv * 3;
    if (s < span) {
      const divIdx = Math.floor(s / t.perDiv);
      const div = DIV_ORDER[divIdx] || "Bronze";
      return { tier: t.name, division: div, color: DIV_COLOR[div], starsInDiv: s % t.perDiv, perDiv: t.perDiv, isLegend: false, legendLevel: 0, label: `${t.name} ${div}`, totalStars: total };
    }
    s -= span;
  }
  const level = Math.min(1000, s + 1);
  return { tier: "Legend", division: "", color: "#a855f7", starsInDiv: 0, perDiv: 0, isLegend: true, legendLevel: level, label: `Legend ${level}★`, totalStars: total };
}

export function useRankConfig() {
  const { data } = useQuery<RankConfig>({ queryKey: ["/api/reborn/rank/config"], queryFn: () => apiRequest("GET", "/api/reborn/rank/config").then((r) => r.json()), staleTime: 60_000 });
  return data;
}
export function useMyRank() {
  const { data } = useQuery<any>({ queryKey: ["/api/reborn/rank/me"], queryFn: () => apiRequest("GET", "/api/reborn/rank/me").then((r) => r.json()), staleTime: 15_000 });
  return data;
}
