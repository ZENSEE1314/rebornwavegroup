import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Heart, Zap, Dumbbell, Utensils, Shield, Trophy, AlertTriangle, ArrowLeft, ArrowRight
} from "lucide-react";

export default function DigimonPetCareFixed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentPetIndex, setCurrentPetIndex] = useState(0);
  const [currentPet, setCurrentPet] = useState<any>(null);

  // Fetch user data
  const { data: pets } = useQuery({ queryKey: ["/api/pets"] });
  const { data: toys } = useQuery({ queryKey: ["/api/toys"] });

  const petList = Array.isArray(pets) ? pets : [];
  const ownedToys = Array.isArray(toys) ? toys.filter((toy: any) => toy.isOwned) : [];

  // Set current pet when pets data changes
  useEffect(() => {
    if (petList.length > 0) {
      setCurrentPet(petList[currentPetIndex] || petList[0]);
    }
  }, [petList, currentPetIndex]);

  // Navigation functions for pet selection
  const navigatePet = (direction: 'prev' | 'next') => {
    if (petList.length === 0) return;
    
    setCurrentPetIndex((prev) => {
      if (direction === 'prev') {
        return prev > 0 ? prev - 1 : petList.length - 1;
      } else {
        return prev < petList.length - 1 ? prev + 1 : 0;
      }
    });
  };

  // Enhanced pet care mutations
  const feedMutation = useMutation({
    mutationFn: async (data: { petId: string; foodType: string }) => {
      const response = await apiRequest("POST", "/api/pets/feed", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      toast({
        title: "Pet Fed Successfully!",
        description: `${data.message}. Tokens earned: ${data.tokensEarned}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Feeding Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const trainMutation = useMutation({
    mutationFn: async (data: { petId: string; trainingType: string }) => {
      const response = await apiRequest("POST", "/api/pets/train", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      toast({
        title: "Training Complete!",
        description: `${data.message}. Tokens earned: ${data.tokensEarned}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Training Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const battleMutation = useMutation({
    mutationFn: async (data: { petId: string; battleType: string }) => {
      const response = await apiRequest("POST", "/api/pets/battle", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      toast({
        title: `Battle ${data.result}!`,
        description: `Tokens earned: ${data.tokensEarned}. New win ratio: ${data.newWinRatio}%`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Battle Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const healMutation = useMutation({
    mutationFn: async (data: { petId: string }) => {
      const response = await apiRequest("POST", "/api/pets/heal", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      toast({
        title: "Pet Healed!",
        description: `${data.message}. Injuries healed: ${data.injuriesHealed}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Healing Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const attentionMutation = useMutation({
    mutationFn: async (data: { petId: string }) => {
      const response = await apiRequest("POST", "/api/pets/attention", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      if (data.wasCareMistake) {
        toast({
          title: "Care Mistake!",
          description: `Response was ${data.responseDelayMinutes} minutes late. Care mistake recorded.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Good Response!",
          description: "Your pet feels cared for!",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Attention Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Render hunger hearts
  const renderHungerHearts = (hunger: number) => {
    const hearts = [];
    for (let i = 0; i < 4; i++) {
      hearts.push(
        <Heart
          key={i}
          className={`w-6 h-6 ${i < hunger ? 'text-red-500 fill-red-500' : 'text-gray-300'}`}
        />
      );
    }
    return hearts;
  };

  if (!petList.length) {
    return (
      <div className="space-y-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            Enhanced Pet Care System
          </h2>
          <p className="text-slate-600">
            Buy toys from the marketplace to create pets!
          </p>
        </div>
      </div>
    );
  }

  if (!currentPet) {
    return <div>Loading pet data...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">
          Enhanced Digimon Pet Care
        </h2>
        <p className="text-slate-600">
          Advanced pet care with weight in Gigabytes, battles, and training
        </p>
      </div>

      {/* Pet Navigation */}
      {petList.length > 1 && (
        <div className="flex justify-center items-center gap-4 mb-6">
          <Button onClick={() => navigatePet('prev')} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="text-lg font-medium">
            Pet {currentPetIndex + 1} of {petList.length}
          </span>
          <Button onClick={() => navigatePet('next')} variant="outline" size="sm">
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Current Pet Display */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <img 
              src={currentPet.toy?.imageUrl || "/default-pet.png"} 
              alt={currentPet.name}
              className="w-12 h-12 object-cover rounded-lg"
            />
            {currentPet.name}
            <Badge variant="secondary">{currentPet.species}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Enhanced Digimon Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium">Hunger</span>
              </div>
              <div className="flex gap-1">
                {renderHungerHearts(currentPet.hunger || 0)}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Weight</span>
              </div>
              <div className="text-lg font-bold text-blue-600">
                {currentPet.weight || 0}G
              </div>
              <span className="text-xs text-gray-600">Gigabytes</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Strength</span>
              </div>
              <div className="text-lg font-bold text-green-600">
                {currentPet.strength || 0}
              </div>
              <span className="text-xs text-gray-600">Max: 999</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">Effort</span>
              </div>
              <div className="text-lg font-bold text-purple-600">
                {currentPet.effort || 0}
              </div>
              <span className="text-xs text-gray-600">Max: 999</span>
            </div>
          </div>

          {/* Second row of stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">DP Energy</span>
              </div>
              <div className="text-lg font-bold text-yellow-600">
                {currentPet.dp || 0}
              </div>
              <span className="text-xs text-gray-600">Max: 100</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-gold-500" />
                <span className="text-sm font-medium">Win Ratio</span>
              </div>
              <div className="text-lg font-bold text-gold-600">
                {(currentPet.winRatio || 0).toFixed(1)}%
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium">Care Mistakes</span>
              </div>
              <div className="text-lg font-bold text-orange-600">
                {currentPet.careMistakes || 0}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium">Injuries</span>
              </div>
              <div className="text-lg font-bold text-red-600">
                {currentPet.injuries || 0}
              </div>
            </div>
          </div>

          {/* Enhanced Care Actions */}
          <div className="space-y-6">
            {/* Feeding Options */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Utensils className="w-5 h-5 text-green-500" />
                Enhanced Feeding
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button
                  onClick={() => feedMutation.mutate({ petId: currentPet.id, foodType: "meat" })}
                  disabled={feedMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Feed Meat (+2 Hunger)
                </Button>
                <Button
                  onClick={() => feedMutation.mutate({ petId: currentPet.id, foodType: "fish" })}
                  disabled={feedMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Feed Fish (+3 Hunger)
                </Button>
                <Button
                  onClick={() => feedMutation.mutate({ petId: currentPet.id, foodType: "protein" })}
                  disabled={feedMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Feed Protein (+4 Hunger)
                </Button>
              </div>
            </div>

            {/* Training Options */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-green-500" />
                Enhanced Training
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  onClick={() => trainMutation.mutate({ petId: currentPet.id, trainingType: "strength" })}
                  disabled={trainMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Strength Training (+2-5 Strength)
                </Button>
                <Button
                  onClick={() => trainMutation.mutate({ petId: currentPet.id, trainingType: "effort" })}
                  disabled={trainMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Effort Training (+2-5 Effort)
                </Button>
              </div>
            </div>

            {/* Battle System */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-500" />
                Battle System
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button
                  onClick={() => battleMutation.mutate({ petId: currentPet.id, battleType: "wild" })}
                  disabled={battleMutation.isPending}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  Wild Battle (Easy)
                </Button>
                <Button
                  onClick={() => battleMutation.mutate({ petId: currentPet.id, battleType: "boss" })}
                  disabled={battleMutation.isPending}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Boss Battle (Hard)
                </Button>
                <Button
                  onClick={() => battleMutation.mutate({ petId: currentPet.id, battleType: "tournament" })}
                  disabled={battleMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Tournament (Expert)
                </Button>
              </div>
            </div>

            {/* Special Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                onClick={() => healMutation.mutate({ petId: currentPet.id })}
                disabled={healMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Shield className="w-4 h-4 mr-2" />
                Heal Pet (Remove Injuries)
              </Button>
              <Button
                onClick={() => attentionMutation.mutate({ petId: currentPet.id })}
                disabled={attentionMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Heart className="w-4 h-4 mr-2" />
                Give Attention
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}