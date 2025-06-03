import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Bed, Droplets, Sparkles } from "lucide-react";

// Helper function to format sleep timer as MM:SS
function formatSleepTime(timeRemaining: number): string {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export default function TestPetCare() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every second for real-time display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Mock user data for testing
  const user = {
    id: "42447407",
    loyaltyPoints: 187,
    tokens: 187,
  };

  // Fetch pets data
  const { data: pets = [], refetch: refetchPets } = useQuery({
    queryKey: ["/api/pets"],
    retry: 1,
    refetchInterval: 3000,
  });

  const safePets = Array.isArray(pets) ? pets : [];
  const currentPet = safePets[0]; // Use first pet

  // Fetch sleep progress for sleeping pets
  const { data: sleepProgress } = useQuery({
    queryKey: ["/api/pets", currentPet?.id, "sleep-progress"],
    enabled: !!currentPet?.id,
    refetchInterval: 1000,
  });

  // Energy Potion mutation
  const energyPotionMutation = useMutation({
    mutationFn: async (data: { petId: number }) => {
      return await apiRequest('POST', `/api/pets/${data.petId}/energy-potion`);
    },
    onSuccess: (data) => {
      toast({
        title: "Energy Potion Used!",
        description: `Pet energy restored to ${data.newEnergy}%`,
      });
      refetchPets();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Care activity mutation
  const careActivityMutation = useMutation({
    mutationFn: async (data: { petId: number; careType: string }) => {
      return await apiRequest('POST', `/api/pets/${data.petId}/care/${data.careType}`);
    },
    onSuccess: (data) => {
      toast({
        title: "Care Activity Completed!",
        description: data.message,
      });
      refetchPets();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!currentPet) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Test Pet Care System</h1>
        <p>No pets found. Please activate a pet first.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Test Pet Care System</h1>
      <p className="text-sm text-gray-600">Testing user: {user.id} | Tokens: {user.loyaltyPoints}</p>

      {/* Pet Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🐢 {currentPet.name}
          </CardTitle>
          <p className="text-sm text-gray-600">
            Age: {currentPet.currentAge} days • Type: {currentPet.type}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 text-orange-500">🍎</span>
                <span className="text-sm font-medium">Hunger</span>
              </div>
              <Progress value={currentPet.hunger} className="h-2" />
              <span className="text-xs text-gray-600">{currentPet.hunger}%</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Cleanliness</span>
              </div>
              <Progress value={currentPet.cleanliness} className="h-2" />
              <span className="text-xs text-gray-600">{currentPet.cleanliness}%</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Bed className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">Energy</span>
              </div>
              <Progress value={currentPet.energy} className="h-2" />
              <span className="text-xs text-gray-600">{currentPet.energy}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Care Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Care Activities</CardTitle>
          <p className="text-sm text-gray-600">
            Complete all activities to earn 1 token today!
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => careActivityMutation.mutate({ petId: currentPet.id, careType: 'fed' })}
              disabled={careActivityMutation.isPending || (currentPet?.energy === 0)}
            >
              <span className="text-2xl">🍎</span>
              <span className="text-sm">Feed</span>
              {currentPet?.energy === 0 && <span className="text-xs text-red-500">No Energy</span>}
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => careActivityMutation.mutate({ petId: currentPet.id, careType: 'bathed' })}
              disabled={careActivityMutation.isPending || (currentPet?.energy === 0)}
            >
              <span className="text-2xl">🛁</span>
              <span className="text-sm">Bath</span>
              {currentPet?.energy === 0 && <span className="text-xs text-red-500">No Energy</span>}
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => careActivityMutation.mutate({ petId: currentPet.id, careType: 'slept' })}
              disabled={careActivityMutation.isPending}
            >
              <Bed className="w-6 h-6" />
              <span className="text-sm">Sleep</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => careActivityMutation.mutate({ petId: currentPet.id, careType: 'cleaned' })}
              disabled={careActivityMutation.isPending || (currentPet?.energy === 0)}
            >
              <Sparkles className="w-6 h-6" />
              <span className="text-sm">Play</span>
              {currentPet?.energy === 0 && <span className="text-xs text-red-500">No Energy</span>}
            </Button>
          </div>

          {/* ENERGY POTION BUTTON */}
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg">
            <div className="text-center mb-3">
              <h3 className="font-bold text-purple-700">⚡ ENERGY POTION ⚡</h3>
              <p className="text-sm text-gray-600">Tokens: {user.loyaltyPoints}</p>
            </div>
            <Button
              size="lg"
              className="w-full h-16 text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 shadow-lg"
              onClick={() => {
                console.log('Energy Potion clicked', { petId: currentPet?.id });
                if (currentPet?.id) {
                  energyPotionMutation.mutate({ petId: currentPet.id });
                }
              }}
              disabled={
                energyPotionMutation.isPending || 
                (user.loyaltyPoints || 0) < 10 || 
                currentPet?.energy === 100 ||
                !currentPet?.id
              }
            >
              <span className="text-3xl mr-3">⚡</span>
              <div className="flex-1">
                <div className="font-bold text-lg">
                  Energy Potion
                </div>
                <div className="text-sm opacity-90">
                  {!currentPet?.id 
                    ? "No pet selected"
                    : (user.loyaltyPoints || 0) < 10 
                    ? "Need 10 tokens"
                    : currentPet?.energy === 100
                    ? "Energy full"
                    : "Restore 20% energy"
                  }
                </div>
              </div>
              <span className="text-lg font-bold ml-3">10🪙</span>
            </Button>
          </div>

          {/* Sleep Timer Display - MM:SS format */}
          {currentPet?.isSleeping && sleepProgress && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-700 mb-2">
                  💤 Pet is Sleeping
                </div>
                <div className="text-2xl font-mono text-blue-600 mb-2">
                  {formatSleepTime(sleepProgress.timeRemaining || 0)}
                </div>
                <div className="text-sm text-blue-600">
                  Energy will restore in {formatSleepTime(sleepProgress.timeRemaining || 0)}
                </div>
                <div className="text-sm text-blue-600 mb-3">
                  Energy restores automatically every 5 minutes
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}