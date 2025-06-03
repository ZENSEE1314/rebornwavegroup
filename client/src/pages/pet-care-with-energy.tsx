import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Bed, Sparkles, Droplets, Zap } from "lucide-react";

export default function PetCareWithEnergy() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user data
  const { data: user } = useQuery({
    queryKey: ['/api/user-stats']
  });

  // Fetch pets data
  const { data: pets } = useQuery({
    queryKey: ['/api/pets']
  });

  const pet = Array.isArray(pets) && pets.length > 0 ? pets[0] : null;

  // Care activity mutation
  const careActivityMutation = useMutation({
    mutationFn: async ({ petId, careType }: { petId: number; careType: string }) => {
      return await apiRequest("POST", `/api/pets/${petId}/care/${careType}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pets'] });
      toast({
        title: "Success",
        description: "Pet care activity completed!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete activity",
        variant: "destructive",
      });
    }
  });

  // Energy Potion mutation
  const energyPotionMutation = useMutation({
    mutationFn: async ({ petId }: { petId: number }) => {
      return await apiRequest("POST", `/api/pets/${petId}/energy-potion`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
      toast({
        title: "Energy Restored!",
        description: "Your pet gained 20% energy!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to use energy potion",
        variant: "destructive",
      });
    }
  });

  if (!pet) {
    return (
      <div className="min-h-screen p-4 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <p className="text-gray-600">No pets found. Please activate a pet first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-md mx-auto space-y-6">
        {/* Pet Header */}
        <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">{pet.name}</h1>
                <p className="text-purple-100">Age: {pet.currentAge} years old</p>
              </div>
              <div className="text-right">
                <p className="text-sm">Baby Turtle Dragon</p>
                <p className="text-lg font-mono">01:04:10:25</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pet Avatar */}
        <Card>
          <CardContent className="p-6 text-center bg-gradient-to-br from-green-100 to-blue-100">
            <div className="text-6xl mb-4">🐢</div>
            <p className="text-sm text-gray-600">Stage: Baby Turtle Dragon</p>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Happiness</span>
                  <span className="text-sm text-gray-600">{pet.happiness || 100}/100</span>
                </div>
                <Progress value={pet.happiness || 100} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Hunger</span>
                  <span className="text-sm text-gray-600">{pet.hunger || 100}/100</span>
                </div>
                <Progress value={pet.hunger || 100} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Cleanliness</span>
                  <span className="text-sm text-gray-600">{pet.cleanliness || 100}/100</span>
                </div>
                <Progress value={pet.cleanliness || 100} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Energy</span>
                  <span className="text-sm text-gray-600">{pet.energy || 0}/100</span>
                </div>
                <Progress value={pet.energy || 0} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => careActivityMutation.mutate({ petId: pet.id, careType: 'fed' })}
                disabled={careActivityMutation.isPending}
              >
                <span className="text-2xl">🍎</span>
                <span className="text-sm">Feed</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => careActivityMutation.mutate({ petId: pet.id, careType: 'bathed' })}
                disabled={careActivityMutation.isPending}
              >
                <Droplets className="w-6 h-6" />
                <span className="text-sm">Bathe</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => careActivityMutation.mutate({ petId: pet.id, careType: 'slept' })}
                disabled={careActivityMutation.isPending}
              >
                <Bed className="w-6 h-6" />
                <span className="text-sm">Sleep</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => careActivityMutation.mutate({ petId: pet.id, careType: 'cleaned' })}
                disabled={careActivityMutation.isPending}
              >
                <Sparkles className="w-6 h-6" />
                <span className="text-sm">Play</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ENERGY POTION - Prominently Displayed */}
        <Card className="border-4 border-purple-400 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardHeader className="text-center">
            <CardTitle className="text-purple-700 flex items-center justify-center gap-2">
              <Zap className="w-6 h-6" />
              Energy Potion
              <Zap className="w-6 h-6" />
            </CardTitle>
            <p className="text-sm text-gray-600">
              Tokens: {user?.loyaltyPoints || 0} | Cost: 10 tokens
            </p>
          </CardHeader>
          <CardContent>
            <Button
              size="lg"
              className="w-full h-16 text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 shadow-lg text-lg font-bold"
              onClick={() => energyPotionMutation.mutate({ petId: pet.id })}
              disabled={
                energyPotionMutation.isPending || 
                (user?.loyaltyPoints || 0) < 10 || 
                pet.energy >= 100
              }
            >
              {energyPotionMutation.isPending ? (
                "Using Potion..."
              ) : pet.energy >= 100 ? (
                "Energy Full!"
              ) : (user?.loyaltyPoints || 0) < 10 ? (
                "Need 10 Tokens"
              ) : (
                "⚡ Use Energy Potion ⚡"
              )}
            </Button>
            <p className="text-center text-sm text-purple-700 mt-2">
              Restores 20% energy instantly
            </p>
          </CardContent>
        </Card>

        {/* Mini Game */}
        <Card className="bg-gradient-to-r from-green-50 to-blue-50">
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              🎮 Mini Game: Feeding Time
            </h3>
            <Button 
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              disabled={pet.energy === 0}
            >
              🪙 Start Coin Catching Game
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}