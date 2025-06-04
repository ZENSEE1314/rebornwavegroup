import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Heart, Droplets, Coffee, Moon, Zap, Coins, ChevronLeft, ChevronRight, User
} from "lucide-react";

export default function PetCare() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentPetIndex, setCurrentPetIndex] = useState(0);
  const [language, setLanguage] = useState<"en" | "id">("en");

  // Fetch user's pets
  const { data: pets = [], isLoading: petsLoading } = useQuery({
    queryKey: ['/api/pets'],
    enabled: !!user,
  });

  // Pet care mutations
  const feedPetMutation = useMutation({
    mutationFn: async (petId: number) => {
      await apiRequest("POST", `/api/pets/${petId}/care/feed`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pets'] });
      toast({
        title: language === "id" ? "Berhasil!" : "Success!",
        description: language === "id" ? "Hewan peliharaan sudah diberi makan" : "Pet has been fed",
      });
    },
    onError: () => {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Gagal memberi makan" : "Failed to feed pet",
        variant: "destructive",
      });
    }
  });

  const bathePetMutation = useMutation({
    mutationFn: async (petId: number) => {
      await apiRequest("POST", `/api/pets/${petId}/care/bathe`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pets'] });
      toast({
        title: language === "id" ? "Berhasil!" : "Success!",
        description: language === "id" ? "Hewan peliharaan sudah dimandikan" : "Pet has been bathed",
      });
    },
    onError: () => {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Gagal memandikan" : "Failed to bathe pet",
        variant: "destructive",
      });
    }
  });

  const playWithPetMutation = useMutation({
    mutationFn: async (petId: number) => {
      await apiRequest("POST", `/api/pets/${petId}/care/play`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pets'] });
      toast({
        title: language === "id" ? "Berhasil!" : "Success!",
        description: language === "id" ? "Bermain dengan hewan peliharaan" : "Played with pet",
      });
    },
    onError: () => {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Gagal bermain" : "Failed to play with pet",
        variant: "destructive",
      });
    }
  });

  const putPetToSleepMutation = useMutation({
    mutationFn: async (petId: number) => {
      await apiRequest("POST", `/api/pets/${petId}/care/sleep`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pets'] });
      toast({
        title: language === "id" ? "Berhasil!" : "Success!",
        description: language === "id" ? "Hewan peliharaan sedang tidur" : "Pet is now sleeping",
      });
    },
    onError: () => {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Gagal menidurkan" : "Failed to put pet to sleep",
        variant: "destructive",
      });
    }
  });

  const wakeUpPetMutation = useMutation({
    mutationFn: async (petId: number) => {
      await apiRequest("POST", `/api/pets/${petId}/care/wake`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pets'] });
      toast({
        title: language === "id" ? "Berhasil!" : "Success!",
        description: language === "id" ? "Hewan peliharaan sudah bangun" : "Pet is now awake",
      });
    },
    onError: () => {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Gagal membangunkan" : "Failed to wake up pet",
        variant: "destructive",
      });
    }
  });

  const claimDailyTokenMutation = useMutation({
    mutationFn: async (petId: number) => {
      await apiRequest("POST", `/api/pets/${petId}/claim-token`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: language === "id" ? "Token Diklaim!" : "Token Claimed!",
        description: language === "id" ? "Token harian berhasil diklaim" : "Daily token successfully claimed",
      });
    },
    onError: () => {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Gagal mengklaim token" : "Failed to claim token",
        variant: "destructive",
      });
    }
  });

  // Loading state
  if (petsLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  // Safe pets handling
  const safePets = Array.isArray(pets) ? pets : [];
  const userPets = safePets.filter((pet: any) => pet?.userId === user?.id);

  // Check if user has pets
  if (userPets.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {language === "id" ? "Tidak ada hewan peliharaan" : "No pets found"}
          </h2>
          <p className="text-gray-600 mb-4">
            {language === "id" 
              ? "Anda belum memiliki hewan peliharaan virtual. Aktivasi mainan untuk mendapatkan hewan peliharaan pertama Anda!"
              : "You don't have any virtual pets yet. Activate a toy to get your first pet!"}
          </p>
        </div>
      </div>
    );
  }

  // Get current pet
  const currentPet = userPets[currentPetIndex];
  if (!currentPet) return null;

  // Calculate pet age and status
  const now = Date.now();
  const activatedTime = new Date(currentPet.activatedDate).getTime();
  const elapsedMs = now - activatedTime;
  
  // Convert to days:hours:minutes:seconds format
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;
  
  // Format timer as DD:HH:MM:SS
  const timerDisplay = `${days.toString().padStart(2, '0')}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  // Pet age in years (each day = 1 year)
  const ageInYears = days;
  
  // Death check - pet dies at 100 days (100 years)
  const isDead = days >= 100;
  
  // Growth stage based on age
  let growthStage = "Baby";
  let dragonEmoji = "🥚";
  
  if (isDead) {
    growthStage = "Deceased";
    dragonEmoji = "💀";
  } else if (ageInYears >= 80) {
    growthStage = language === "id" ? "Grand Turtle Dragon" : "Grand Turtle Dragon";
    dragonEmoji = "🐉";
  } else if (ageInYears >= 60) {
    growthStage = language === "id" ? "Adult Turtle Dragon" : "Adult Turtle Dragon";
    dragonEmoji = "🐲";
  } else if (ageInYears >= 40) {
    growthStage = language === "id" ? "Teenager Turtle Dragon" : "Teenager Turtle Dragon";
    dragonEmoji = "🦕";
  } else if (ageInYears >= 20) {
    growthStage = language === "id" ? "Youth Turtle Dragon" : "Youth Turtle Dragon";
    dragonEmoji = "🐢";
  } else {
    growthStage = language === "id" ? "Baby Turtle Dragon" : "Baby Turtle Dragon";
    dragonEmoji = "🐢";
  }

  // Calculate stats with decay
  const calculateHunger = (lastFeedTime?: Date) => {
    if (isDead) return 0;
    
    if (lastFeedTime) {
      const minutesSinceLastFeed = (now - new Date(lastFeedTime).getTime()) / (1000 * 60);
      if (minutesSinceLastFeed < 2) {
        return currentPet.hunger || 50;
      }
    }
    
    if (!lastFeedTime) {
      const hoursSinceBirth = elapsedMs / (1000 * 60 * 60);
      const decay = Math.max(1, 100 - (hoursSinceBirth / 6) * 99);
      return Math.floor(decay);
    }
    
    const hoursSinceLastFeed = (now - new Date(lastFeedTime).getTime()) / (1000 * 60 * 60);
    const decay = Math.max(1, 100 - (hoursSinceLastFeed / 6) * 99);
    return Math.floor(decay);
  };

  const calculateCleanliness = (lastCareTime?: Date) => {
    if (isDead) return 0;
    
    if (lastCareTime) {
      const minutesSinceLastCare = (now - new Date(lastCareTime).getTime()) / (1000 * 60);
      if (minutesSinceLastCare < 2) {
        return currentPet.cleanliness || 50;
      }
    }
    
    if (!lastCareTime) {
      const hoursSinceBirth = elapsedMs / (1000 * 60 * 60);
      const decay = Math.max(1, 100 - (hoursSinceBirth / 6) * 99);
      return Math.floor(decay);
    }
    
    const hoursSinceLastCare = (now - new Date(lastCareTime).getTime()) / (1000 * 60 * 60);
    const decay = Math.max(1, 100 - (hoursSinceLastCare / 6) * 99);
    return Math.floor(decay);
  };

  // Use actual database values for stats, with time decay as fallback
  const hunger = isDead ? 0 : (currentPet.hunger || calculateHunger(currentPet.lastFedAt));
  const cleanliness = isDead ? 0 : (currentPet.cleanliness || calculateCleanliness(currentPet.lastCareDate));
  const energy = isDead ? 0 : currentPet.energy;
  const happiness = isDead ? 0 : (currentPet.happiness || 50);

  // Check if pet can earn tokens
  const canEarnTokens = !isDead && days >= 1 && hunger > 0 && happiness > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {language === "id" ? "🐾 Perawatan Hewan Peliharaan Virtual" : "🐾 Virtual Pet Care"}
          </h1>
          
          {/* Language toggle */}
          <div className="flex justify-center gap-2 mb-6">
            <Button
              variant={language === "en" ? "default" : "outline"}
              size="sm"
              onClick={() => setLanguage("en")}
            >
              English
            </Button>
            <Button
              variant={language === "id" ? "default" : "outline"}
              size="sm"
              onClick={() => setLanguage("id")}
            >
              Bahasa Indonesia
            </Button>
          </div>
        </div>

        {/* Pet Navigation Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-red-500" />
              {language === "id" ? "Perawatan Hewan Peliharaan Virtual" : "Virtual Pet Care"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-4">
              <p className="text-lg font-medium">
                {language === "id" 
                  ? `Hewan Peliharaan ${currentPetIndex + 1} dari ${userPets.length}`
                  : `Pet ${currentPetIndex + 1} of ${userPets.length}`}
              </p>
            </div>
            
            {/* Pet Navigation Controls */}
            {userPets.length > 1 && (
              <div className="flex items-center justify-center gap-4 mb-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPetIndex(Math.max(0, currentPetIndex - 1))}
                  disabled={currentPetIndex === 0}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {language === "id" ? "Sebelumnya" : "Previous"}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPetIndex(Math.min(userPets.length - 1, currentPetIndex + 1))}
                  disabled={currentPetIndex === userPets.length - 1}
                  className="flex items-center gap-2"
                >
                  {language === "id" ? "Berikutnya" : "Next"}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
            
            {/* Pet Care Instructions */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">
                {language === "id" ? "Panduan Perawatan Hewan Peliharaan" : "Pet Care Guide"}
              </h4>
              <p className="text-blue-800 text-sm">
                {language === "id" 
                  ? "Rawat hewan peliharaan virtual Anda dengan memberi makan, memandikan, dan bermain. Hewan peliharaan yang sehat akan memberikan token harian!"
                  : "Take care of your virtual pet by feeding, bathing, and playing. Healthy pets provide daily tokens!"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Current Pet Display */}
        <Card className="overflow-hidden">
          <CardHeader className={`text-white ${isDead ? 'bg-gradient-to-r from-gray-600 to-gray-800' : 'bg-gradient-to-r from-purple-500 to-pink-500'}`}>
            <CardTitle className="flex items-center justify-between">
              <span>{currentPet.name}</span>
              <Badge className={`${isDead ? 'bg-red-600 text-white' : 'bg-white text-purple-600'}`}>
                {growthStage}
              </Badge>
            </CardTitle>
            <div className="text-sm space-y-1">
              <div className="flex justify-between items-center">
                <span>{language === "id" ? "Waktu Hidup:" : "Lifetime:"}</span>
                <span className="font-mono text-lg">{timerDisplay}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>{language === "id" ? "Umur:" : "Age:"}</span>
                <span>{ageInYears} {language === "id" ? "tahun" : "years old"}</span>
              </div>
              {isDead && (
                <div className="text-red-300 font-bold text-center">
                  💀 {language === "id" ? "Meninggal pada usia 100 tahun" : "Died at age 100"}
                </div>
              )}
              {days >= 90 && !isDead && (
                <div className="text-yellow-300 font-bold text-center">
                  ⚠️ {language === "id" ? "Mendekati usia maksimal!" : "Approaching maximum age!"}
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            {/* Pet Visual */}
            <div className="text-center mb-6">
              <div className="text-8xl mb-2">{dragonEmoji}</div>
              <div className="text-xl font-bold text-gray-800">{currentPet.name}</div>
              <div className="text-sm text-gray-600">{growthStage}</div>
            </div>

            {/* Stats Display */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-red-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium">{language === "id" ? "Kebahagiaan" : "Happiness"}</span>
                </div>
                <div className="w-full bg-red-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${happiness}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-600 mt-1">{happiness}%</div>
              </div>

              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Coffee className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium">{language === "id" ? "Kelaparan" : "Hunger"}</span>
                </div>
                <div className="w-full bg-orange-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${hunger > 30 ? 'bg-orange-500' : 'bg-red-500'}`}
                    style={{ width: `${hunger}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-600 mt-1">{hunger}%</div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">{language === "id" ? "Kebersihan" : "Cleanliness"}</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${cleanliness}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-600 mt-1">{cleanliness}%</div>
              </div>

              <div className="bg-green-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">{language === "id" ? "Energi" : "Energy"}</span>
                </div>
                <div className="w-full bg-green-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${energy}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-600 mt-1">{energy}%</div>
              </div>
            </div>

            {/* Care Actions */}
            {!isDead && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    feedPetMutation.mutate(currentPet.id);
                  }}
                  disabled={feedPetMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Coffee className="w-4 h-4" />
                  {language === "id" ? "Beri Makan" : "Feed"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    bathePetMutation.mutate(currentPet.id);
                  }}
                  disabled={bathePetMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Droplets className="w-4 h-4" />
                  {language === "id" ? "Mandikan" : "Bathe"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    playWithPetMutation.mutate(currentPet.id);
                  }}
                  disabled={playWithPetMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Heart className="w-4 h-4" />
                  {language === "id" ? "Bermain" : "Play"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (currentPet.isSleeping) {
                      wakeUpPetMutation.mutate(currentPet.id);
                    } else {
                      putPetToSleepMutation.mutate(currentPet.id);
                    }
                  }}
                  disabled={putPetToSleepMutation.isPending || wakeUpPetMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Moon className="w-4 h-4" />
                  {currentPet.isSleeping 
                    ? (language === "id" ? "Bangunkan" : "Wake Up")
                    : (language === "id" ? "Tidurkan" : "Sleep")
                  }
                </Button>
              </div>
            )}

            {/* Token earning status */}
            <div className="bg-yellow-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium">{language === "id" ? "Status Token" : "Token Status"}</span>
              </div>
              {canEarnTokens ? (
                <div className="text-green-600 text-sm">
                  ✅ {language === "id" ? "Dapat menghasilkan token harian!" : "Can earn daily tokens!"}
                </div>
              ) : (
                <div className="text-red-600 text-sm">
                  {isDead 
                    ? (language === "id" ? "💀 Tidak dapat menghasilkan token (meninggal)" : "💀 Cannot earn tokens (deceased)")
                    : days < 1
                      ? (language === "id" ? "⏳ Terlalu muda untuk menghasilkan token" : "⏳ Too young to earn tokens")
                      : (language === "id" ? "⚠️ Perlu perawatan untuk menghasilkan token" : "⚠️ Needs care to earn tokens")
                  }
                </div>
              )}
              {canEarnTokens && (
                <Button
                  size="sm"
                  onClick={() => claimDailyTokenMutation.mutate(currentPet.id)}
                  disabled={claimDailyTokenMutation.isPending}
                  className="mt-2 w-full"
                >
                  {language === "id" ? "Klaim Token Harian" : "Claim Daily Token"}
                </Button>
              )}
            </div>

            {/* Age display */}
            <div className="text-center mt-4 text-sm text-gray-600">
              {language === "id" ? `Usia: ${ageInYears} tahun` : `Age: ${ageInYears} years old`}
              {ageInYears >= 100 ? (
                <span className="text-red-600 font-bold ml-2">
                  💀 {language === "id" ? "Meninggal" : "Deceased"}
                </span>
              ) : ageInYears >= 90 ? (
                <span className="text-orange-600 font-bold ml-2">
                  ⚠️ {language === "id" ? "Sangat Tua" : "Very Old"}
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}