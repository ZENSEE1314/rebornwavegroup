import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Crown, Gift, Medal, Star, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { RebornLayout } from "@/components/RebornLayout";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const tierIcons = [Medal, Award, Trophy, Star, Crown];
const tierColors = ["from-amber-500 to-amber-700", "from-slate-400 to-slate-600", "from-yellow-400 to-yellow-600", "from-violet-500 to-purple-700", "from-indigo-400 to-violet-600"];
const fallbackTiers = [
  { name: "Bronze", minPoints: 0, discountPercent: 0, freeRp: 0, benefits: ["Member access"] },
  { name: "Silver", minPoints: 500, discountPercent: 2, freeRp: 0, benefits: ["Priority booking"] },
  { name: "Gold", minPoints: 2000, discountPercent: 5, freeRp: 50000, benefits: ["Priority support"] },
];

export default function LoyaltyProgram() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings } = useQuery<any>({
    queryKey: ["/api/v1/tenant/settings", "reborn-wave-group"],
    queryFn: () => apiRequest("GET", "/api/v1/tenant/settings?slug=reborn-wave-group").then((r) => r.json()),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
  const { data: stats } = useQuery<any>({ queryKey: ["/api/user-stats"], refetchInterval: 10000, refetchOnWindowFocus: true });
  const rewardsEnabled = settings?.loyalty?.rewardsEnabled !== false;
  const { data: rewards = [] } = useQuery<any[]>({ queryKey: ["/api/rewards"], enabled: rewardsEnabled });
  const levels = useMemo(() => {
    const configured = settings?.loyalty?.tiers?.length ? settings.loyalty.tiers : fallbackTiers;
    return [...configured].sort((a: any, b: any) => Number(a.minPoints || 0) - Number(b.minPoints || 0)).map((tier: any, index: number, all: any[]) => ({
      level: index + 1,
      name: tier.name || `Tier ${index + 1}`,
      pointsRequired: Number(tier.minPoints || 0),
      maxPoints: index < all.length - 1 ? Number(all[index + 1].minPoints || 0) - 1 : Infinity,
      discount: Number(tier.discountPercent || 0),
      freeRp: Number(tier.freeRp || 0),
      benefits: Array.isArray(tier.benefits) ? tier.benefits : [],
      icon: tierIcons[index % tierIcons.length],
      color: tierColors[index % tierColors.length],
    }));
  }, [settings]);
  const currentPoints = Number(stats?.loyaltyPoints || 0);
  const lifetimePoints = Number(stats?.lifetimePoints || 0);
  const currentLevel = levels.find((level) => lifetimePoints >= level.pointsRequired && lifetimePoints <= level.maxPoints) || levels[0];
  const nextLevel = levels.find((level) => level.level === currentLevel.level + 1);
  const pointsToNext = nextLevel ? Math.max(0, nextLevel.pointsRequired - lifetimePoints) : 0;
  const progress = nextLevel ? Math.max(0, Math.min(100, ((lifetimePoints - currentLevel.pointsRequired) / Math.max(1, nextLevel.pointsRequired - currentLevel.pointsRequired)) * 100)) : 100;
  const benefits = [...currentLevel.benefits, ...(currentLevel.discount > 0 ? [`${currentLevel.discount}% member discount`] : []), ...(currentLevel.freeRp > 0 ? [`RP ${currentLevel.freeRp.toLocaleString()} store gift`] : [])];
  const redeem = useMutation({
    mutationFn: (rewardId: number) => apiRequest("POST", "/api/redeem-reward", { rewardId }).then((r) => r.json()),
    onSuccess: (data) => { toast({ title: "Reward redeemed", description: data.message }); queryClient.invalidateQueries({ queryKey: ["/api/user-stats"] }); queryClient.invalidateQueries({ queryKey: ["/api/rewards"] }); },
    onError: (error: any) => toast({ title: "Unable to redeem", description: error.message, variant: "destructive" }),
  });

  return <RebornLayout active="/loyalty-program" title="LOYALTY"><div className="relative z-10 mx-auto max-w-3xl space-y-5 py-2">
    <div className="text-center"><h1 className="text-2xl font-bold text-white">Loyalty Program</h1><p className="mt-1 text-sm text-white/50">Earn 1 point for every RP {Number(settings?.loyalty?.pointsSpendRp || 1000).toLocaleString()} spent.</p></div>
    <div className="rwg-card p-5">
      <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${currentLevel.color}`}><currentLevel.icon className="h-7 w-7 text-white" /></div><div className="min-w-0"><h2 className="truncate text-xl font-bold text-white">{currentLevel.name}</h2><p className="text-sm text-white/50">Level {currentLevel.level} · {currentLevel.discount}% discount</p></div></div><div className="text-right"><p className="text-3xl font-bold text-white">{currentPoints.toLocaleString()}</p><p className="text-xs text-white/50">Available points</p></div></div>
      {nextLevel && <div className="mt-5 space-y-2"><div className="flex justify-between gap-3 text-xs"><span className="text-white/70">Progress to {nextLevel.name}</span><span className="text-white/50">{pointsToNext.toLocaleString()} points needed</span></div><Progress value={progress} className="h-3 bg-white/10"/><p className="text-center text-xs text-white/40">{lifetimePoints.toLocaleString()} lifetime points</p></div>}
    </div>
    <div className="rwg-card p-5"><h3 className="mb-3 font-bold text-white">Your level benefits</h3>{benefits.length ? <div className="space-y-2">{benefits.map((benefit, index) => <div key={`${benefit}-${index}`} className="flex items-start gap-2 text-sm text-white/70"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"/><span>{benefit}</span></div>)}</div> : <p className="text-sm text-white/40">No extra benefits for this tier.</p>}</div>
    <div className="rwg-card p-5"><h3 className="mb-4 font-bold text-white">All loyalty tiers</h3><div className="space-y-2">{levels.map((level) => { const active = level.level === currentLevel.level; return <div key={`${level.name}-${level.level}`} className={`rounded-xl border p-3 ${active ? "border-violet-400/50 bg-violet-500/15" : "border-white/10 bg-white/5"}`}><div className="flex items-center gap-3"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${level.color}`}><level.icon className="h-4 w-4 text-white"/></div><div className="min-w-0 flex-1"><p className="font-semibold text-white">{level.name}</p><p className="text-xs text-white/45">{level.pointsRequired.toLocaleString()}+ points · {level.discount}% discount{level.freeRp > 0 ? ` · RP ${level.freeRp.toLocaleString()} gift` : ""}</p></div>{active && <span className="rounded-full bg-violet-400/20 px-2 py-1 text-[10px] font-bold text-violet-200">CURRENT</span>}</div></div>; })}</div></div>
    {rewardsEnabled && <div className="rwg-card p-5"><h3 className="mb-4 flex items-center gap-2 font-bold text-white"><Gift className="h-5 w-5 text-amber-300"/> Available rewards</h3>{rewards.filter((reward) => reward.isActive !== false).length ? <div className="space-y-3">{rewards.filter((reward) => reward.isActive !== false).map((reward) => <div key={reward.id} className="rounded-xl border border-white/10 bg-white/5 p-4"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-white">{reward.name}</p><p className="text-xs text-white/45">{reward.description || reward.type || "Store reward"}</p></div><span className="shrink-0 font-bold text-violet-300">{Number(reward.pointsCost || 0).toLocaleString()} pts</span></div><button onClick={() => redeem.mutate(reward.id)} disabled={redeem.isPending || currentPoints < Number(reward.pointsCost || 0) || Number(reward.stockQuantity) === 0} className="mt-3 w-full rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{currentPoints >= Number(reward.pointsCost || 0) ? "Redeem reward" : "Not enough points"}</button></div>)}</div> : <p className="text-sm text-white/40">No rewards are available right now.</p>}</div>}
  </div></RebornLayout>;
}
