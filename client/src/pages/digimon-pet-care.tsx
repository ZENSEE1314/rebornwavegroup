import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Heart, Zap, Dumbbell, Utensils, Shield, Trophy, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface DigimonPet {
  id: number;
  name: string;
  species: string;
  currentAge: number;
  growthStage: string;
  
  // Core Digimon stats
  weight: number; // in Gigabytes (G)
  hunger: number; // 0-4 hearts
  strength: number; // 0-999
  effort: number; // 0-999
  dp: number; // energy for battles
  
  // Battle system
  totalBattles: number;
  battlesWon: number;
  winRatio: string;
  
  // Care system
  careMistakes: number;
  injuries: number;
  dailyInjuries: number;
  
  // Status tracking
  happiness: number;
  cleanliness: number;
  isActive: boolean;
  isDead: boolean;
  isUpset: boolean;
  needsAttention: boolean;
  attentionType?: string;
  
  // Timing
  lastFedAt?: string;
  lastTrainedAt?: string;
  lastBattleAt?: string;
}

export default function DigimonPetCare() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPet, setSelectedPet] = useState<DigimonPet | null>(null);

  // Fetch user's Digimon pets
  const { data: pets, isLoading } = useQuery({
    queryKey: ["/api/pets/digimon"],
    refetchInterval: 5000, // Real-time updates every 5 seconds
  });

  // Feeding mutation
  const feedPetMutation = useMutation({
    mutationFn: async ({ petId, foodType }: { petId: number; foodType: 'meat' | 'fish' | 'protein' }) => {
      await apiRequest("POST", `/api/pets/${petId}/feed`, { foodType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets/digimon"] });
      toast({
        title: "Pet Fed Successfully!",
        description: "Your Digimon has been fed and gained weight.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Feeding Failed",
        description: error.message || "Could not feed your pet.",
        variant: "destructive",
      });
    },
  });

  // Training mutation
  const trainPetMutation = useMutation({
    mutationFn: async ({ petId, trainingType }: { petId: number; trainingType: 'strength' | 'effort' }) => {
      await apiRequest("POST", `/api/pets/${petId}/train`, { trainingType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets/digimon"] });
      toast({
        title: "Training Complete!",
        description: "Your Digimon has trained and improved its stats!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Training Failed",
        description: error.message || "Could not train your pet.",
        variant: "destructive",
      });
    },
  });

  // Battle mutation
  const battlePetMutation = useMutation({
    mutationFn: async ({ petId, opponentType }: { petId: number; opponentType: 'wild' | 'boss' | 'tournament' }) => {
      await apiRequest("POST", `/api/pets/${petId}/battle`, { opponentType });
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets/digimon"] });
      toast({
        title: result.result === 'won' ? "Victory!" : result.result === 'lost' ? "Defeated" : "Fled",
        description: result.result === 'won' 
          ? "Your Digimon won the battle and gained experience!" 
          : result.result === 'lost' 
          ? "Your Digimon was defeated but gained some experience."
          : "Your Digimon fled from battle.",
        variant: result.result === 'won' ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Battle Failed",
        description: error.message || "Could not start battle.",
        variant: "destructive",
      });
    },
  });

  // Respond to attention call mutation
  const respondToCallMutation = useMutation({
    mutationFn: async ({ petId }: { petId: number }) => {
      await apiRequest("POST", `/api/pets/${petId}/respond`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets/digimon"] });
      toast({
        title: "Responded to Call",
        description: "You responded to your Digimon's call for attention.",
      });
    },
  });

  // Heal injuries mutation
  const healInjuriesMutation = useMutation({
    mutationFn: async ({ petId }: { petId: number }) => {
      await apiRequest("POST", `/api/pets/${petId}/heal`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets/digimon"] });
      toast({
        title: "Injuries Healed",
        description: "Your Digimon's injuries have been healed.",
      });
    },
  });

  const getStatusColor = (pet: DigimonPet) => {
    if (pet.isDead) return "bg-black text-white";
    if (pet.isUpset) return "bg-red-500 text-white";
    if (pet.needsAttention) return "bg-yellow-500 text-black";
    if (pet.injuries > 0) return "bg-orange-500 text-white";
    return "bg-green-500 text-white";
  };

  const getStatusText = (pet: DigimonPet) => {
    if (pet.isDead) return "DEAD";
    if (pet.isUpset) return "UPSET";
    if (pet.needsAttention) return `NEEDS: ${pet.attentionType?.toUpperCase()}`;
    if (pet.injuries > 0) return `INJURED (${pet.injuries})`;
    return "HEALTHY";
  };

  const formatWeight = (weight: number) => `${weight}G`;
  const formatWinRatio = (ratio: string) => `${parseFloat(ratio).toFixed(1)}%`;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  const petList = Array.isArray(pets) ? pets : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Digimon Pet Care System
          </h1>
          <p className="text-slate-600">
            Advanced pet care with weight management, training, battles, and stat tracking
          </p>
        </div>

        {petList.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-semibold mb-2">No Digimon Pets</h3>
              <p className="text-slate-600 mb-4">
                Activate a toy to create your first Digimon pet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {petList.map((pet: DigimonPet) => (
              <Card key={pet.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{pet.name}</CardTitle>
                    <Badge className={getStatusColor(pet)}>
                      {getStatusText(pet)}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">
                    {pet.species} • {pet.growthStage} • Age: {pet.currentAge} days
                  </p>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Core Stats Display */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4 text-red-500" />
                          Hunger
                        </span>
                        <span>{pet.hunger}/4</span>
                      </div>
                      <Progress value={(pet.hunger / 4) * 100} className="h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <Zap className="w-4 h-4 text-blue-500" />
                          DP
                        </span>
                        <span>{pet.dp}</span>
                      </div>
                      <Progress value={Math.min((pet.dp / 20) * 100, 100)} className="h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <Dumbbell className="w-4 h-4 text-green-500" />
                          Strength
                        </span>
                        <span>{pet.strength}/999</span>
                      </div>
                      <Progress value={(pet.strength / 999) * 100} className="h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <Shield className="w-4 h-4 text-purple-500" />
                          Effort
                        </span>
                        <span>{pet.effort}/999</span>
                      </div>
                      <Progress value={(pet.effort / 999) * 100} className="h-2" />
                    </div>
                  </div>

                  {/* Weight and Battle Stats */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-slate-600">Weight</p>
                      <p className="font-semibold">{formatWeight(pet.weight)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Battles</p>
                      <p className="font-semibold">{pet.totalBattles}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Win Rate</p>
                      <p className="font-semibold">{formatWinRatio(pet.winRatio)}</p>
                    </div>
                  </div>

                  {/* Care Status */}
                  {(pet.careMistakes > 0 || pet.injuries > 0) && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-yellow-800 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <span>
                          Care Mistakes: {pet.careMistakes} | Injuries: {pet.injuries}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {!pet.isDead && (
                    <div className="space-y-3">
                      {/* Feeding Actions */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-700">Feeding (+Weight)</p>
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => feedPetMutation.mutate({ petId: pet.id, foodType: 'meat' })}
                            disabled={feedPetMutation.isPending || pet.hunger >= 4}
                          >
                            Meat (+1G)
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => feedPetMutation.mutate({ petId: pet.id, foodType: 'fish' })}
                            disabled={feedPetMutation.isPending || pet.hunger >= 4}
                          >
                            Fish (+1G)
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => feedPetMutation.mutate({ petId: pet.id, foodType: 'protein' })}
                            disabled={feedPetMutation.isPending || pet.hunger >= 4}
                          >
                            Protein (+2G)
                          </Button>
                        </div>
                      </div>

                      {/* Training Actions */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-700">Training (-2G Weight)</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => trainPetMutation.mutate({ petId: pet.id, trainingType: 'strength' })}
                            disabled={trainPetMutation.isPending || pet.weight <= 5}
                          >
                            <Dumbbell className="w-4 h-4 mr-1" />
                            Strength
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => trainPetMutation.mutate({ petId: pet.id, trainingType: 'effort' })}
                            disabled={trainPetMutation.isPending || pet.weight <= 5}
                          >
                            <Shield className="w-4 h-4 mr-1" />
                            Effort
                          </Button>
                        </div>
                      </div>

                      {/* Battle Actions */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-700">Battles (-4G Weight)</p>
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => battlePetMutation.mutate({ petId: pet.id, opponentType: 'wild' })}
                            disabled={battlePetMutation.isPending || pet.dp < 5}
                          >
                            Wild
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => battlePetMutation.mutate({ petId: pet.id, opponentType: 'boss' })}
                            disabled={battlePetMutation.isPending || pet.dp < 10}
                          >
                            Boss
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => battlePetMutation.mutate({ petId: pet.id, opponentType: 'tournament' })}
                            disabled={battlePetMutation.isPending || pet.dp < 15}
                          >
                            <Trophy className="w-4 h-4 mr-1" />
                            Tournament
                          </Button>
                        </div>
                      </div>

                      {/* Special Actions */}
                      <div className="grid grid-cols-2 gap-2">
                        {pet.needsAttention && (
                          <Button
                            size="sm"
                            className="bg-yellow-500 hover:bg-yellow-600"
                            onClick={() => respondToCallMutation.mutate({ petId: pet.id })}
                            disabled={respondToCallMutation.isPending}
                          >
                            Respond to Call
                          </Button>
                        )}
                        {pet.injuries > 0 && (
                          <Button
                            size="sm"
                            className="bg-red-500 hover:bg-red-600"
                            onClick={() => healInjuriesMutation.mutate({ petId: pet.id })}
                            disabled={healInjuriesMutation.isPending}
                          >
                            Heal Injuries
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {pet.isDead && (
                    <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-center">
                      <p className="text-gray-600 font-medium">This Digimon has died</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Care mistakes: {pet.careMistakes} | Final injuries: {pet.injuries}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}