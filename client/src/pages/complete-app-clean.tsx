import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Heart, Star, MessageCircle, ShoppingBag, Clock, Trophy, Gift, Zap, ChevronLeft, ChevronRight, Users, CreditCard, Calendar, MapPin, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import QRCode from "qrcode";
import CoinCatchingGame from "@/components/coin-catching-game";

interface CompleteAppProps {
  user: any;
  language: string;
}

function PetCareSection({ language, user }: { language: string; user: any }) {
  const [currentPetIndex, setCurrentPetIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [showCoinGame, setShowCoinGame] = useState(false);
  const queryClient = useQueryClient();

  // Real-time timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch pets
  const { data: pets = [] } = useQuery({
    queryKey: ["/api/pets"],
  });

  // Care activity mutation
  const careActivityMutation = useMutation({
    mutationFn: async ({ petId, careType }: { petId: number; careType: string }) => {
      return apiRequest("POST", `/api/pets/${petId}/care/${careType}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
    },
  });

  // Sleep mutation
  const sleepMutation = useMutation({
    mutationFn: async (petId: number) => {
      return apiRequest("POST", `/api/pets/${petId}/sleep`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
    },
  });

  // Wake mutation
  const wakeMutation = useMutation({
    mutationFn: async (petId: number) => {
      return apiRequest("POST", `/api/pets/${petId}/wake`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
    },
  });

  const userPets = Array.isArray(pets) ? pets : [];
  
  if (userPets.length === 0) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {language === "id" ? "Belum Ada Hewan Peliharaan" : "No Pets Yet"}
        </h2>
        <p className="text-gray-600">
          {language === "id" ? "Aktifkan mainan untuk mendapatkan hewan peliharaan" : "Activate toys to get pets"}
        </p>
      </div>
    );
  }

  // Single pet display
  const currentPet = userPets[currentPetIndex] || userPets[0];
  
  // Calculate real-time stats
  const now = currentTime;
  const birthTime = new Date(currentPet.birthDate || currentPet.createdAt).getTime();
  const elapsedMs = now - birthTime;
  const days = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
  const isDead = days >= 100;
  
  // Growth stages
  let growthStage = "Baby";
  let dragonEmoji = "🐢";
  
  if (isDead) {
    growthStage = "Deceased";
    dragonEmoji = "💀";
  } else if (days >= 80) {
    growthStage = "Grand Dragon";
    dragonEmoji = "🐉";
  } else if (days >= 60) {
    growthStage = "Adult Dragon";
    dragonEmoji = "🐲";
  } else if (days >= 40) {
    growthStage = "Teen Dragon";
    dragonEmoji = "🦕";
  } else if (days >= 20) {
    growthStage = "Youth Dragon";
    dragonEmoji = "🐢";
  }

  const hunger = isDead ? 0 : (currentPet.hunger || 50);
  const happiness = isDead ? 0 : (currentPet.happiness || 50);
  const cleanliness = isDead ? 0 : (currentPet.cleanliness || 50);
  const energy = isDead ? 0 : (currentPet.energy || 50);

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">
          {language === "id" ? "Perawatan Hewan Peliharaan" : "Pet Care"}
        </h2>
        <p className="text-slate-600">
          {language === "id" ? "Rawat hewan digital Anda" : "Take care of your digital pet"}
        </p>
      </div>

      {/* Coin Catching Game Modal */}
      {showCoinGame && selectedPet && (
        <CoinCatchingGame 
          pet={selectedPet}
          language={language}
          onClose={() => {
            setShowCoinGame(false);
            setSelectedPet(null);
          }}
          user={user}
        />
      )}

      {/* Single Pet Display */}
      <div className="max-w-2xl mx-auto">
        <Card className="overflow-hidden">
          <CardHeader className={`text-white ${isDead ? 'bg-gray-600' : 'bg-gradient-to-r from-purple-500 to-pink-500'}`}>
            <CardTitle className="flex items-center justify-between">
              <span>{currentPet.name}</span>
              <Badge className={`${isDead ? 'bg-red-600 text-white' : 'bg-white text-purple-600'}`}>
                {growthStage}
              </Badge>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Pet Animation */}
              <div className="relative h-32 bg-gradient-to-b from-blue-100 to-green-100 rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={isDead ? '' : currentPet.isSleeping ? '' : 'animate-bounce'}>
                    <div 
                      className="text-6xl transition-transform duration-1000 hover:scale-110"
                      style={{
                        filter: isDead ? 'grayscale(100%) opacity(0.3)' : currentPet.isSleeping ? 'brightness(0.7)' : 'none',
                        transform: isDead ? 'rotate(90deg)' : 'none'
                      }}
                    >
                      {dragonEmoji}
                    </div>
                  </div>
                </div>
                
                {currentPet.isSleeping && !isDead && (
                  <div className="absolute top-2 right-2 text-2xl animate-pulse">💤</div>
                )}
              </div>

              {/* Pet Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    {language === "id" ? "Kebahagiaan" : "Happiness"}
                  </p>
                  <Progress value={happiness} className="h-3" />
                  <p className="text-xs text-center mt-1">{happiness}/100</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    {language === "id" ? "Rasa Lapar" : "Hunger"}
                  </p>
                  <Progress value={hunger} className="h-3" />
                  <p className="text-xs text-center mt-1">{hunger}/100</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    {language === "id" ? "Kebersihan" : "Cleanliness"}
                  </p>
                  <Progress value={cleanliness} className="h-3" />
                  <p className="text-xs text-center mt-1">{cleanliness}/100</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    {language === "id" ? "Energi" : "Energy"}
                  </p>
                  <Progress value={energy} className="h-3" />
                  <p className="text-xs text-center mt-1">{energy}/100</p>
                </div>
              </div>

              {/* Care Actions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  className="flex items-center gap-2 p-4 h-auto flex-col"
                  onClick={() => careActivityMutation.mutate({ petId: currentPet.id, careType: 'fed' })}
                  disabled={careActivityMutation.isPending || isDead}
                >
                  <span className="text-2xl">🍎</span>
                  <span className="text-sm">{language === "id" ? "Beri Makan" : "Feed"}</span>
                </Button>

                <Button
                  variant="outline"
                  className="flex items-center gap-2 p-4 h-auto flex-col"
                  onClick={() => careActivityMutation.mutate({ petId: currentPet.id, careType: 'bathed' })}
                  disabled={careActivityMutation.isPending || isDead}
                >
                  <span className="text-2xl">🛁</span>
                  <span className="text-sm">{language === "id" ? "Mandi" : "Bathe"}</span>
                </Button>

                <Button
                  variant="outline"
                  className="flex items-center gap-2 p-4 h-auto flex-col"
                  onClick={() => careActivityMutation.mutate({ petId: currentPet.id, careType: 'cleaned' })}
                  disabled={careActivityMutation.isPending || isDead}
                >
                  <span className="text-2xl">🎾</span>
                  <span className="text-sm">{language === "id" ? "Bermain" : "Play"}</span>
                </Button>

                {currentPet.isSleeping ? (
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 p-4 h-auto flex-col bg-blue-50"
                    onClick={() => wakeMutation.mutate(currentPet.id)}
                    disabled={wakeMutation.isPending}
                  >
                    <span className="text-2xl">☀️</span>
                    <span className="text-sm">{language === "id" ? "Bangunkan" : "Wake Up"}</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 p-4 h-auto flex-col"
                    onClick={() => sleepMutation.mutate(currentPet.id)}
                    disabled={sleepMutation.isPending || energy >= 100}
                  >
                    <span className="text-2xl">💤</span>
                    <span className="text-sm">{language === "id" ? "Tidurkan" : "Sleep"}</span>
                  </Button>
                )}
              </div>

              {/* Pet Navigation */}
              {userPets.length > 1 && (
                <div className="text-center">
                  <Button
                    onClick={() => setCurrentPetIndex((prev) => (prev + 1) % userPets.length)}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {language === "id" ? "Hewan Berikutnya" : "Next Pet"} ({currentPetIndex + 1}/{userPets.length})
                  </Button>
                </div>
              )}

              {/* Mini Game */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                <h5 className="font-semibold text-gray-900 mb-3">
                  {language === "id" ? "🎮 Mini Game" : "🎮 Mini Game"}
                </h5>
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    setSelectedPet(currentPet);
                    setShowCoinGame(true);
                  }}
                  disabled={isDead}
                >
                  🪙 {language === "id" ? "Mulai Game" : "Start Game"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CompleteApp({ user, language }: CompleteAppProps) {
  return (
    <div className="container mx-auto p-6">
      <PetCareSection language={language} user={user} />
    </div>
  );
}