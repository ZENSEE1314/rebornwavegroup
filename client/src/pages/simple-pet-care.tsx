import React, { useState, useRef, useEffect } from "react";

function ProgressBar({ percent, className }: { percent: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.style.setProperty('--rwg-w', `${Math.min(percent, 100)}%`);
  }, [percent]);
  return <div ref={ref} className={`rwg-stat-fill ${className ?? ''}`} />;
}
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function SimplePetCare() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pets, isLoading: petsLoading } = useQuery({
    queryKey: ["/api/pets"],
    refetchInterval: 1000,
  });

  const { data: userStats } = useQuery({
    queryKey: ["/api/user-stats"],
    refetchInterval: 1000,
  });

  const { data: careStatus } = useQuery({
    queryKey: ["/api/care-status", pets?.[0]?.id],
    enabled: !!pets?.[0]?.id,
    refetchInterval: 1000,
  });

  const { data: sleepProgress } = useQuery({
    queryKey: ["/api/sleep-progress", pets?.[0]?.id],
    enabled: !!pets?.[0]?.id && pets?.[0]?.isSleeping,
    refetchInterval: 1000,
  });

  const energyPotionMutation = useMutation({
    mutationFn: async ({ petId }: { petId: number }) => {
      return apiRequest("POST", "/api/pets/energy-potion", { petId });
    },
    onSuccess: () => {
      toast({ title: "Energy Restored!", description: "Your pet's energy has been boosted by 20%!" });
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-stats"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to use energy potion", variant: "destructive" });
    },
  });

  const careActivityMutation = useMutation({
    mutationFn: async ({ petId, careType }: { petId: number; careType: string }) => {
      return apiRequest("POST", "/api/pets/care", { petId, careType });
    },
    onSuccess: () => {
      toast({ title: "Care Activity Complete!", description: "Your pet feels better now!" });
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/care-status"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to complete care activity", variant: "destructive" });
    },
  });

  const pet = pets?.[0];
  const tokens = userStats?.tokens || 0;

  const formatSleepTime = (timeRemaining: number) => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (petsLoading) {
    return (
      <div className="rwg-page-bg min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white/40 text-sm">Loading pet data...</p>
        </div>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="rwg-page-bg min-h-screen flex items-center justify-center p-4">
        <div className="rwg-orb-1" />
        <div className="rwg-orb-2" />
        <div className="rwg-card p-10 max-w-md w-full text-center relative z-10">
          <div className="text-5xl mb-4">🧸</div>
          <h3 className="text-xl font-bold text-white mb-2">No Active Pet Found</h3>
          <p className="text-white/50">You need to activate a toy first to create a virtual pet.</p>
        </div>
      </div>
    );
  }

  const statItems = [
    { label: "Energy", value: pet.energy, color: "text-emerald-400", bg: "bg-emerald-500/20", bar: "bg-emerald-500" },
    { label: "Happiness", value: pet.happiness, color: "text-blue-400", bg: "bg-blue-500/20", bar: "bg-blue-500" },
    { label: "Hunger", value: pet.hunger, color: "text-orange-400", bg: "bg-orange-500/20", bar: "bg-orange-500" },
    { label: "Cleanliness", value: pet.cleanliness, color: "text-violet-400", bg: "bg-violet-500/20", bar: "bg-violet-500" },
  ];

  return (
    <div className="rwg-page-bg min-h-screen pb-20 md:pb-0">
      <div className="rwg-orb-1" />
      <div className="rwg-orb-2" />
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 relative z-10">

        {/* Pet Info */}
        <div className="rwg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">{pet.name}</h2>
            <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-sm px-3 py-1 rounded-full">
              {pet.growthStage || "Baby"}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statItems.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}%</div>
                <div className="text-sm text-white/50 mb-2">{stat.label}</div>
                <div className="w-full bg-white/10 rounded-full h-1.5">
                  <ProgressBar percent={stat.value} className={`${stat.bar} h-1.5 rounded-full`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Care Actions */}
        <div className="rwg-card p-6">
          <h3 className="text-lg font-bold text-white mb-4">Pet Care Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { emoji: "🍎", label: "Feed", careType: "fed", color: "from-emerald-600 to-emerald-700" },
              { emoji: "🛁", label: "Bath", careType: "bathed", color: "from-blue-600 to-blue-700" },
              { emoji: "😴", label: pet.isSleeping ? (sleepProgress?.timeRemaining ? `${formatSleepTime(sleepProgress.timeRemaining)}` : "Sleeping") : "Sleep", careType: "slept", color: "from-indigo-600 to-indigo-700", disabled: pet.isSleeping },
              { emoji: "🧹", label: "Clean", careType: "cleaned", color: "from-yellow-600 to-yellow-700" },
            ].map((action) => (
              <Button
                key={action.careType}
                onClick={() => careActivityMutation.mutate({ petId: pet.id, careType: action.careType })}
                className={`h-16 bg-gradient-to-b ${action.color} text-white border-0 rounded-xl text-sm font-medium flex flex-col gap-1`}
                disabled={careActivityMutation.isPending || action.disabled}
              >
                <span className="text-xl">{action.emoji}</span>
                <span>{action.label}</span>
              </Button>
            ))}
          </div>

          {/* Energy Potion */}
          <div className="mt-4">
            <Button
              onClick={() => energyPotionMutation.mutate({ petId: pet.id })}
              className="w-full h-14 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white border-0 rounded-xl text-base font-semibold"
              disabled={energyPotionMutation.isPending || tokens < 10 || pet.energy >= 100}
            >
              ⚡ Energy Potion (10 tokens) — You have {tokens} tokens
            </Button>
            {tokens < 10 && (
              <p className="text-sm text-red-400 mt-2 text-center">Need 10 tokens to use Energy Potion</p>
            )}
            {pet.energy >= 100 && (
              <p className="text-sm text-white/40 mt-2 text-center">Pet energy is already at maximum</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="rwg-card p-6">
          <h3 className="text-lg font-bold text-white mb-4">Current Status</h3>
          <div className="space-y-3 text-sm">
            {[
              { label: "Pet ID", value: pet.id },
              { label: "Your Tokens", value: tokens },
              { label: "Pet Age", value: `${pet.currentAge || 0} days` },
              { label: "Growth Stage", value: pet.growthStage || "Baby" },
              { label: "Is Sleeping", value: pet.isSleeping ? "Yes" : "No" },
              ...(pet.isSleeping && sleepProgress ? [{ label: "Sleep Time Remaining", value: formatSleepTime(sleepProgress.timeRemaining) }] : []),
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-white/50">{item.label}</span>
                <span className="font-medium text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
