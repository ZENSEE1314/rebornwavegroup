import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export default function SimplePetCare() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Pet data query
  const { data: pets, isLoading: petsLoading } = useQuery({
    queryKey: ["/api/pets"],
    refetchInterval: 1000,
  });

  // User stats query
  const { data: userStats } = useQuery({
    queryKey: ["/api/user-stats"],
    refetchInterval: 1000,
  });

  // Care status query
  const { data: careStatus } = useQuery({
    queryKey: ["/api/care-status", pets?.[0]?.id],
    enabled: !!pets?.[0]?.id,
    refetchInterval: 1000,
  });

  // Sleep progress query
  const { data: sleepProgress } = useQuery({
    queryKey: ["/api/sleep-progress", pets?.[0]?.id],
    enabled: !!pets?.[0]?.id && pets?.[0]?.isSleeping,
    refetchInterval: 1000,
  });

  // Energy potion mutation
  const energyPotionMutation = useMutation({
    mutationFn: async ({ petId }: { petId: number }) => {
      return apiRequest("POST", "/api/pets/energy-potion", { petId });
    },
    onSuccess: () => {
      toast({
        title: "Energy Restored!",
        description: "Your pet's energy has been boosted by 20%!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to use energy potion",
        variant: "destructive",
      });
    },
  });

  // Care activity mutation
  const careActivityMutation = useMutation({
    mutationFn: async ({ petId, careType }: { petId: number; careType: string }) => {
      return apiRequest("POST", "/api/pets/care", { petId, careType });
    },
    onSuccess: () => {
      toast({
        title: "Care Activity Complete!",
        description: "Your pet feels better now!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/care-status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete care activity",
        variant: "destructive",
      });
    },
  });

  const pet = pets?.[0];
  const tokens = userStats?.tokens || 0;

  // Sleep timer formatting
  const formatSleepTime = (timeRemaining: number) => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (petsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading pet data...</div>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <h3 className="text-lg font-semibold mb-2">No Active Pet Found</h3>
            <p className="text-gray-600">You need to activate a toy first to create a virtual pet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Pet Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">{pet.name}</CardTitle>
              <Badge className="bg-blue-100 text-blue-800">
                {pet.growthStage || "Baby"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{pet.energy}%</div>
                <div className="text-sm text-gray-600">Energy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{pet.happiness}%</div>
                <div className="text-sm text-gray-600">Happiness</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{pet.hunger}%</div>
                <div className="text-sm text-gray-600">Hunger</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{pet.cleanliness}%</div>
                <div className="text-sm text-gray-600">Cleanliness</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Care Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Pet Care Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                onClick={() => careActivityMutation.mutate({ petId: pet.id, careType: "fed" })}
                className="h-16 bg-green-500 hover:bg-green-600"
                disabled={careActivityMutation.isPending}
              >
                🍎 Feed
              </Button>
              
              <Button
                onClick={() => careActivityMutation.mutate({ petId: pet.id, careType: "bathed" })}
                className="h-16 bg-blue-500 hover:bg-blue-600"
                disabled={careActivityMutation.isPending}
              >
                🛁 Bath
              </Button>
              
              <Button
                onClick={() => careActivityMutation.mutate({ petId: pet.id, careType: "slept" })}
                className="h-16 bg-indigo-500 hover:bg-indigo-600"
                disabled={careActivityMutation.isPending || pet.isSleeping}
              >
                {pet.isSleeping ? (
                  sleepProgress?.timeRemaining ? (
                    <>😴 Sleeping ({formatSleepTime(sleepProgress.timeRemaining)})</>
                  ) : (
                    "😴 Sleeping"
                  )
                ) : (
                  "😴 Sleep"
                )}
              </Button>
              
              <Button
                onClick={() => careActivityMutation.mutate({ petId: pet.id, careType: "cleaned" })}
                className="h-16 bg-yellow-500 hover:bg-yellow-600"
                disabled={careActivityMutation.isPending}
              >
                🧹 Clean
              </Button>
            </div>

            {/* Energy Potion Button */}
            <div className="mt-6">
              <Button
                onClick={() => energyPotionMutation.mutate({ petId: pet.id })}
                className="w-full h-16 bg-purple-600 hover:bg-purple-700 text-white text-lg font-semibold"
                disabled={energyPotionMutation.isPending || tokens < 10 || pet.energy >= 100}
              >
                ⚡ Energy Potion (10 tokens) - Current: {tokens} tokens ⚡
              </Button>
              {tokens < 10 && (
                <p className="text-sm text-red-600 mt-2 text-center">
                  Need 10 tokens to use Energy Potion
                </p>
              )}
              {pet.energy >= 100 && (
                <p className="text-sm text-gray-600 mt-2 text-center">
                  Pet energy is already at maximum
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Display */}
        <Card>
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Pet ID:</strong> {pet.id}</p>
              <p><strong>Your Tokens:</strong> {tokens}</p>
              <p><strong>Pet Age:</strong> {pet.currentAge || 0} days</p>
              <p><strong>Growth Stage:</strong> {pet.growthStage || "Baby"}</p>
              <p><strong>Is Sleeping:</strong> {pet.isSleeping ? "Yes" : "No"}</p>
              {pet.isSleeping && sleepProgress && (
                <p><strong>Sleep Time Remaining:</strong> {formatSleepTime(sleepProgress.timeRemaining)}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}