import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Heart, Droplets, Bed, Sparkles, ArrowLeft, ArrowRight, Plus } from "lucide-react";

interface Pet {
  id: number;
  name: string;
  type: string;
  currentAge: number;
  growthStage: string;
  happiness: number;
  hunger: number;
  cleanliness: number;
  energy: number;
  isActive: boolean;
  createdAt: string;
}

interface CareStatus {
  fed: boolean;
  bathed: boolean;
  slept: boolean;
  cleaned: boolean;
  allCareCompleted: boolean;
  tokenEarned: boolean;
}

export default function PetCare() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentPetIndex, setCurrentPetIndex] = useState(0);

  // Fetch user's pets
  const { data: pets = [], isLoading: petsLoading } = useQuery({
    queryKey: ["/api/pets"],
    enabled: isAuthenticated,
  });

  const currentPet = pets[currentPetIndex];

  // Fetch care status for current pet
  const { data: careStatus } = useQuery({
    queryKey: ["/api/pets", currentPet?.id, "care-status"],
    enabled: !!currentPet?.id,
  });

  // Mutation for performing care activities
  const careActivityMutation = useMutation({
    mutationFn: async ({ petId, careType }: { petId: number; careType: string }) => {
      return apiRequest("POST", `/api/pets/${petId}/care/${careType}`, {});
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets", currentPet?.id, "care-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      if (data.allCompleted) {
        toast({
          title: "Daily Care Complete! 🎉",
          description: "You've earned 1 token for completing all care activities today!",
        });
      } else {
        toast({
          title: "Care Activity Complete",
          description: "Your pet feels better!",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Care Failed",
        description: "Unable to perform care activity. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create new pet mutation
  const createPetMutation = useMutation({
    mutationFn: async (petData: { name: string; type: string }) => {
      return apiRequest("POST", "/api/pets", {
        ...petData,
        happiness: 100,
        hunger: 100,
        cleanliness: 100,
        energy: 100,
        currentAge: 0,
        growthStage: "baby",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      toast({
        title: "Pet Created!",
        description: "Your new digital pet is ready for care!",
      });
    },
  });

  const handleCareActivity = (careType: string) => {
    if (!currentPet) return;
    careActivityMutation.mutate({ petId: currentPet.id, careType });
  };

  const navigatePet = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentPetIndex((prev) => (prev > 0 ? prev - 1 : pets.length - 1));
    } else {
      setCurrentPetIndex((prev) => (prev < pets.length - 1 ? prev + 1 : 0));
    }
  };

  const createSamplePet = () => {
    createPetMutation.mutate({
      name: `Pet ${pets.length + 1}`,
      type: "dragon",
    });
  };

  const getStatColor = (value: number) => {
    if (value >= 80) return "bg-green-500";
    if (value >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getGrowthStageInfo = (stage: string) => {
    const stages = {
      baby: { label: "Baby", color: "bg-pink-100 text-pink-800" },
      child: { label: "Child", color: "bg-blue-100 text-blue-800" },
      teen: { label: "Teen", color: "bg-purple-100 text-purple-800" },
      adult: { label: "Adult", color: "bg-green-100 text-green-800" },
      elder: { label: "Elder", color: "bg-gray-100 text-gray-800" },
    };
    return stages[stage as keyof typeof stages] || stages.baby;
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Pet Care System</h2>
            <p className="text-gray-600 mb-4">Please log in to access the pet care system.</p>
            <Button onClick={() => window.location.href = '/api/login'}>
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (petsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!pets.length) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Welcome to Pet Care!</h2>
            <p className="text-gray-600 mb-6">
              You don't have any pets yet. Create your first digital pet to start your care journey!
            </p>
            <Button onClick={createSamplePet} disabled={createPetMutation.isPending}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Pet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stageInfo = getGrowthStageInfo(currentPet?.growthStage || "baby");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Pet Care System</h1>
          <p className="text-gray-600">Take care of your digital pets to earn daily tokens!</p>
        </div>

        {/* Pet Navigation */}
        {pets.length > 1 && (
          <Card>
            <CardContent className="flex items-center justify-between py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigatePet('prev')}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600">
                Pet {currentPetIndex + 1} of {pets.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigatePet('next')}
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {currentPet && (
          <>
            {/* Pet Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">{currentPet.name}</CardTitle>
                  <Badge className={stageInfo.color}>
                    {stageInfo.label}
                  </Badge>
                </div>
                <p className="text-gray-600">
                  Age: {currentPet.currentAge} days • Type: {currentPet.type}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-medium">Happiness</span>
                    </div>
                    <Progress value={currentPet.happiness} className="h-2" />
                    <span className="text-xs text-gray-600">{currentPet.happiness}%</span>
                  </div>
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
                    variant={careStatus?.fed ? "default" : "outline"}
                    className="h-20 flex-col gap-2"
                    onClick={() => handleCareActivity('fed')}
                    disabled={careStatus?.fed || careActivityMutation.isPending}
                  >
                    <span className="text-2xl">🍎</span>
                    <span className="text-sm">Feed</span>
                    {careStatus?.fed && <span className="text-xs">✓ Done</span>}
                  </Button>
                  <Button
                    variant={careStatus?.bathed ? "default" : "outline"}
                    className="h-20 flex-col gap-2"
                    onClick={() => handleCareActivity('bathed')}
                    disabled={careStatus?.bathed || careActivityMutation.isPending}
                  >
                    <Droplets className="w-6 h-6" />
                    <span className="text-sm">Bath</span>
                    {careStatus?.bathed && <span className="text-xs">✓ Done</span>}
                  </Button>
                  <Button
                    variant={careStatus?.slept ? "default" : "outline"}
                    className="h-20 flex-col gap-2"
                    onClick={() => handleCareActivity('slept')}
                    disabled={careStatus?.slept || careActivityMutation.isPending}
                  >
                    <Bed className="w-6 h-6" />
                    <span className="text-sm">Sleep</span>
                    {careStatus?.slept && <span className="text-xs">✓ Done</span>}
                  </Button>
                  <Button
                    variant={careStatus?.cleaned ? "default" : "outline"}
                    className="h-20 flex-col gap-2"
                    onClick={() => handleCareActivity('cleaned')}
                    disabled={careStatus?.cleaned || careActivityMutation.isPending}
                  >
                    <Sparkles className="w-6 h-6" />
                    <span className="text-sm">Clean</span>
                    {careStatus?.cleaned && <span className="text-xs">✓ Done</span>}
                  </Button>
                </div>

                {careStatus?.allCareCompleted && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                    <div className="text-green-600 font-semibold mb-2">
                      🎉 All Care Activities Complete!
                    </div>
                    <div className="text-sm text-green-700">
                      {careStatus.tokenEarned 
                        ? "You've earned your daily token!" 
                        : "Daily token will be awarded shortly!"}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Progress Info */}
            <Card>
              <CardContent className="py-4">
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-600">
                    Current Tokens: {user?.loyaltyPoints || 0}
                  </p>
                  <p className="text-xs text-gray-500">
                    Complete daily care to earn 1 token per day. Pets generate tokens for 100 days.
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Create New Pet Button */}
        <div className="text-center">
          <Button
            variant="outline"
            onClick={createSamplePet}
            disabled={createPetMutation.isPending}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Another Pet
          </Button>
        </div>
      </div>
    </div>
  );
}