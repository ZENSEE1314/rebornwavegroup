import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Heart, ShoppingCart, User, BarChart3, Coins, Clock, Star, Zap } from "lucide-react";

// Coin Catching Game Component
function CoinCatchingGame({ pet, language, onClose, user }: { pet: any; language: string; onClose: () => void; user: any }) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [coins, setCoins] = useState<Array<{ id: number; x: number; y: number; speed: number }>>([]);
  const [gameActive, setGameActive] = useState(true);

  useEffect(() => {
    if (!gameActive) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameActive]);

  useEffect(() => {
    if (!gameActive) return;

    const coinSpawner = setInterval(() => {
      const newCoin = {
        id: Date.now() + Math.random(),
        x: Math.random() * 90,
        y: 0,
        speed: 2 + Math.random() * 3
      };
      setCoins(prev => [...prev, newCoin]);
    }, 1000);

    return () => clearInterval(coinSpawner);
  }, [gameActive]);

  useEffect(() => {
    if (!gameActive) return;

    const moveCoins = setInterval(() => {
      setCoins(prev => prev
        .map(coin => ({ ...coin, y: coin.y + coin.speed }))
        .filter(coin => coin.y < 100)
      );
    }, 50);

    return () => clearInterval(moveCoins);
  }, [gameActive]);

  const handleCoinClick = (coinId: number) => {
    setCoins(prev => prev.filter(coin => coin.id !== coinId));
    setScore(prev => prev + 1);
  };

  if (!gameActive && timeLeft === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Game Over!</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-lg mb-4">Score: {score} coins</p>
            <p className="mb-4">You earned {score} tokens!</p>
            <Button onClick={onClose}>Close</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-96 h-96">
        <CardHeader>
          <CardTitle className="flex justify-between">
            <span>Coin Catching Game</span>
            <span>Time: {timeLeft}s</span>
          </CardTitle>
          <p>Score: {score}</p>
        </CardHeader>
        <CardContent className="relative h-64 overflow-hidden bg-gradient-to-b from-blue-200 to-green-200">
          {coins.map(coin => (
            <div
              key={coin.id}
              className="absolute w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center cursor-pointer shadow-lg"
              style={{ left: `${coin.x}%`, top: `${coin.y}%` }}
              onClick={() => handleCoinClick(coin.id)}
            >
              <Coins className="w-6 h-6 text-yellow-800" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// Simple Game Timer Component
function SimpleGameTimer() {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-blue-50 p-3 rounded-lg">
      <div className="text-center">
        <p className="text-sm text-gray-600">Daily Reset In:</p>
        <p className="text-lg font-bold text-blue-600">{timeLeft}</p>
      </div>
    </div>
  );
}

// Pet Care Tab Content Component
function PetCareTabContent({ setActiveTab, toast, queryClient, setShowCoinGame }: { setActiveTab: any; toast: any; queryClient: any; setShowCoinGame: any }) {
  const { data: pets = [] } = useQuery({
    queryKey: ["/api/pets"],
  });

  const feedMutation = useMutation({
    mutationFn: async (petId: number) => {
      const response = await fetch(`/api/pets/${petId}/feed`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to feed pet');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pet Fed!",
        description: "Your pet is happy and well-fed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
    },
  });

  const cleanMutation = useMutation({
    mutationFn: async (petId: number) => {
      const response = await fetch(`/api/pets/${petId}/clean`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to clean pet');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pet Cleaned!",
        description: "Your pet is sparkling clean.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
    },
  });

  if (pets.length === 0) {
    return (
      <div className="text-center p-8">
        <Heart className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-xl font-semibold mb-2">No Pets Yet</h3>
        <p className="text-gray-600 mb-4">You don't have any pets to care for.</p>
        <Button onClick={() => setActiveTab("marketplace")}>
          Go to Marketplace
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pets.map((pet: any) => (
        <Card key={pet.id} className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              {pet.name || "Your Pet"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Hunger</span>
                  <span>{pet.hunger || 50}%</span>
                </div>
                <Progress value={pet.hunger || 50} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Cleanliness</span>
                  <span>{pet.cleanliness || 50}%</span>
                </div>
                <Progress value={pet.cleanliness || 50} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Happiness</span>
                  <span>{pet.happiness || 50}%</span>
                </div>
                <Progress value={pet.happiness || 50} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Energy</span>
                  <span>{pet.energy || 50}%</span>
                </div>
                <Progress value={pet.energy || 50} className="h-2" />
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                onClick={() => feedMutation.mutate(pet.id)}
                disabled={feedMutation.isPending}
              >
                Feed
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => cleanMutation.mutate(pet.id)}
                disabled={cleanMutation.isPending}
              >
                Clean
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCoinGame(true)}
              >
                Play Game
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Main Complete App Component
function CompleteApp() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showCoinGame, setShowCoinGame] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <div className="max-w-6xl mx-auto p-4">
        {showCoinGame && (
          <CoinCatchingGame 
            pet={null} 
            language="en" 
            onClose={() => setShowCoinGame(false)} 
            user={null} 
          />
        )}
        
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex overflow-x-auto">
            {[
              { id: "dashboard", label: "Dashboard", icon: BarChart3 },
              { id: "petcare", label: "Pet Care", icon: Heart },
              { id: "marketplace", label: "Marketplace", icon: ShoppingCart },
              { id: "profile", label: "Profile", icon: User },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                Welcome to Reborn Wave House
              </h2>
              <p className="text-slate-600">
                Your digital pet care and marketplace platform
              </p>
            </div>
            
            <SimpleGameTimer />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    Pet Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Manage your digital pets and track their progress.
                  </p>
                  <Button onClick={() => setActiveTab("petcare")}>
                    View Pet Care
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-yellow-500" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setShowCoinGame(true)}
                    >
                      <Coins className="h-4 w-4 mr-2" />
                      Play Coin Game
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setActiveTab("marketplace")}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Visit Marketplace
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Pet Care Tab */}
        {activeTab === "petcare" && (
          <PetCareTabContent 
            setActiveTab={setActiveTab} 
            toast={toast} 
            queryClient={queryClient}
            setShowCoinGame={setShowCoinGame}
          />
        )}

        {/* Marketplace Tab */}
        {activeTab === "marketplace" && (
          <div className="text-center p-8">
            <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold mb-4">Marketplace</h2>
            <p className="text-gray-600 mb-4">
              Buy and sell toys, activate pets, and discover new items.
            </p>
            <Button variant="outline">
              Coming Soon
            </Button>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="text-center p-8">
            <User className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold mb-4">Profile</h2>
            <p className="text-gray-600 mb-4">
              Manage your account settings and view your achievements.
            </p>
            <Button variant="outline">
              Coming Soon
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CompleteApp;