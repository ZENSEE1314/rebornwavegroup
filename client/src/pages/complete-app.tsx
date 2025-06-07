import { useState, useEffect, useMemo, useLayoutEffect } from "react";
import { AnimatedProgressBar } from "@/components/AnimatedProgressBar";
import { forceProgressBarUpdate } from "@/utils/forceProgressBarUpdate";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, DollarSign, Calendar, Gift, Copy, Plus, Star, 
  Crown, Trophy, Award, Medal, Zap, Home, User, LogOut,
  QrCode, Globe, Phone, Camera, Trash2, Edit3, ShoppingBag, Package, Database, Check, X, AlertTriangle, Eye, UserCheck, Target, Clock,
  Heart, Droplets, Bed, Sparkles, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Calculator
} from "lucide-react";
import logoImage from "@assets/2-removebg-preview.png";
import toyImage from "@assets/Plush_Dinosaur_with_Colorful_Spikes-removebg-preview.png";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GenealogyTree from "@/components/genealogy-tree";
import { getCategorySymbol, getSymbolById } from "@/lib/rewardSymbols";
import CreditTopUpModal from "@/components/CreditTopUpModal";

// Helper function to format sleep timer as MM:SS
function formatSleepTime(timeRemaining: number): string {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Sound effect function to play text-to-speech + custom voice
function playDoluruuSound() {
  try {
    // First: Play text-to-speech "how do you call my name?"
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('How do you call my name?');
      utterance.rate = 0.6;
      utterance.pitch = 1.8;
      utterance.volume = 0.8;
      
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('female') || 
        voice.name.toLowerCase().includes('child') ||
        voice.name.toLowerCase().includes('cute') ||
        voice.name.toLowerCase().includes('samantha') ||
        voice.name.toLowerCase().includes('karen') ||
        voice.lang.includes('en-US')
      ) || voices[0];
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      // After text-to-speech finishes, play custom voice recording
      utterance.onend = () => {
        setTimeout(() => {
          const audio = new Audio('/src/assets/custom-voice.m4a');
          audio.volume = 0.8;
          audio.play().catch(() => {
            console.log('Custom voice recording failed to play');
          });
        }, 100); // Faster transition between the two sounds
      };
      
      speechSynthesis.speak(utterance);
    }
  } catch (error) {
    console.log('Audio not available');
  }
}

// Coin Catching Game Component
// DailyTokenChecker component for 24-hour token system
function DailyTokenChecker({ petId, petName, currentStats }: { 
  petId: number; 
  petName: string; 
  currentStats: { happiness: number; hunger: number; cleanliness: number; energy: number }; 
}) {
  const [tokenStatus, setTokenStatus] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    if (!petId) return;

    const checkTokenStatus = async () => {
      try {
        const response = await fetch(`/api/pets/${petId}/token-status`);
        const data = await response.json();
        setTokenStatus(data);
      } catch (error) {
        console.error("Error checking token status:", error);
      }
    };

    checkTokenStatus();
    const interval = setInterval(checkTokenStatus, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [petId]);

  useEffect(() => {
    if (!tokenStatus?.lastTokenClaim) return;

    const updateTimer = () => {
      const now = new Date();
      const lastClaim = new Date(tokenStatus.lastTokenClaim);
      const hoursElapsed = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
      const hoursRemaining = Math.max(0, 24 - hoursElapsed);

      if (hoursRemaining > 0) {
        const hours = Math.floor(hoursRemaining);
        const minutes = Math.floor((hoursRemaining - hours) * 60);
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining("Ready!");
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 60000);

    return () => clearInterval(timer);
  }, [tokenStatus]);

  const allStatsAboveOne = currentStats.happiness > 1 && 
                          currentStats.hunger > 1 && 
                          currentStats.cleanliness > 1 && 
                          currentStats.energy > 1;

  const claimToken = async () => {
    try {
      const response = await fetch(`/api/pets/${petId}/claim-daily-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setTokenStatus(prev => ({ ...prev, canClaim: false, lastTokenClaim: new Date() }));
          // Refresh user data to show new token count
          window.location.reload();
        }
      }
    } catch (error) {
      console.error("Error claiming token:", error);
    }
  };

  if (!tokenStatus) {
    return <div className="text-sm text-gray-500">Checking token status...</div>;
  }

  if (tokenStatus.canClaim && allStatsAboveOne) {
    return (
      <div className="text-green-600 bg-green-50 p-2 rounded border border-green-200">
        <div className="font-semibold">✓ Token Ready!</div>
        <div className="text-xs mb-2">
          {petName} has kept all stats above 1% for 24 hours!
        </div>
        <button
          onClick={claimToken}
          className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
        >
          Claim Daily Token
        </button>
      </div>
    );
  }

  if (!allStatsAboveOne) {
    const failedStats = [];
    if (currentStats.happiness <= 1) failedStats.push(`Happiness: ${currentStats.happiness}%`);
    if (currentStats.hunger <= 1) failedStats.push(`Hunger: ${currentStats.hunger}%`);
    if (currentStats.cleanliness <= 1) failedStats.push(`Cleanliness: ${currentStats.cleanliness}%`);
    if (currentStats.energy <= 1) failedStats.push(`Energy: ${currentStats.energy}%`);

    return (
      <div className="text-red-600 bg-red-50 p-2 rounded border border-red-200">
        <div className="font-semibold">⚠ Stats Too Low</div>
        <div className="text-xs">
          These stats must stay above 1%: {failedStats.join(", ")}
        </div>
        <div className="text-xs mt-1">
          Timer reset - keep all stats above 1% for 24 hours to earn a token.
        </div>
      </div>
    );
  }

  return (
    <div className="text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
      <div className="font-semibold">⏱ Monitoring Progress</div>
      <div className="text-xs">
        All stats above 1% - Time remaining: {timeRemaining}
      </div>
      <div className="text-xs mt-1">
        Keep all stats above 1% to earn your daily token!
      </div>
    </div>
  );
}

function CoinCatchingGame({ pet, language, onClose, user }: { pet: any; language: string; onClose: () => void; user: any }) {
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [coins, setCoins] = useState<Array<{ id: number; x: number; y: number; speed: number }>>([]);
  const [gameOver, setGameOver] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch leaderboard data
  const { data: leaderboard = [] } = useQuery({
    queryKey: ['/api/game-scores/leaderboard'],
    enabled: showLeaderboard,
  });

  // Game timer
  useEffect(() => {
    if (gameStarted && timeLeft > 0 && !gameOver) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && gameStarted) {
      endGame();
    }
  }, [gameStarted, timeLeft, gameOver]);

  // Spawn coins
  useEffect(() => {
    if (gameStarted && !gameOver) {
      const spawnInterval = setInterval(() => {
        const newCoin = {
          id: Date.now() + Math.random(),
          x: Math.random() * 80 + 10, // 10% to 90% of container width
          y: 0,
          speed: Math.random() * 2 + 1, // Speed between 1-3
        };
        setCoins(prev => [...prev, newCoin]);
      }, 800);

      return () => clearInterval(spawnInterval);
    }
  }, [gameStarted, gameOver]);

  // Move coins down
  useEffect(() => {
    if (gameStarted && !gameOver) {
      const moveInterval = setInterval(() => {
        setCoins(prev => 
          prev.map(coin => ({
            ...coin,
            y: coin.y + coin.speed
          })).filter(coin => coin.y < 100) // Remove coins that fall off screen
        );
      }, 50);

      return () => clearInterval(moveInterval);
    }
  }, [gameStarted, gameOver]);

  const startGame = () => {
    setGameStarted(true);
    setScore(0);
    setTimeLeft(30);
    setCoins([]);
    setGameOver(false);
  };

  const endGame = async () => {
    setGameOver(true);
    setGameStarted(false);
    
    if (score > 0) {
      try {
        // Submit score to backend (no tokens earned)
        await apiRequest('POST', '/api/game-scores', {
          petId: pet.id,
          score: score,
          tokensEarned: 0
        });
        
        // Refresh leaderboard data
        await queryClient.invalidateQueries({ queryKey: ["/api/game-scores/leaderboard"] });
        
        toast({
          title: language === "id" ? "Permainan Selesai!" : "Game Over!",
          description: language === "id" 
            ? `Skor: ${score}. Skor tersimpan di papan peringkat!` 
            : `Score: ${score}. Score saved to leaderboard!`,
        });
      } catch (error) {
        console.error('Error submitting game score:', error);
        toast({
          title: language === "id" ? "Error" : "Error",
          description: language === "id" ? "Gagal menyimpan skor" : "Failed to save score",
          variant: "destructive"
        });
      }
    }
  };

  const catchCoin = (coinId: number) => {
    setCoins(prev => prev.filter(coin => coin.id !== coinId));
    setScore(prev => prev + 10);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">
            {language === "id" ? "Permainan Coin Catching" : "Coin Catching Game"}
          </h3>
          <Button variant="ghost" onClick={onClose}>✕</Button>
        </div>

        {!gameStarted && !gameOver && !showLeaderboard && (
          <div className="text-center space-y-4">
            <div className="text-4xl">🪙</div>
            <p className="text-gray-600">
              {language === "id" 
                ? "Tangkap koin yang jatuh untuk mendapatkan poin! Klik koin untuk menangkapnya."
                : "Catch falling coins to earn points! Click coins to catch them."}
            </p>
            <div className="space-y-2">
              <Button onClick={startGame} className="w-full">
                {language === "id" ? "Mulai Permainan" : "Start Game"}
              </Button>
              <Button 
                onClick={() => setShowLeaderboard(true)} 
                variant="outline" 
                className="w-full"
              >
                <Trophy className="h-4 w-4 mr-2" />
                {language === "id" ? "Papan Peringkat" : "Leaderboard"}
              </Button>
            </div>
          </div>
        )}

        {gameStarted && (
          <div className="space-y-4">
            <div className="flex justify-between">
              <span>{language === "id" ? "Skor" : "Score"}: {score}</span>
              <span>{language === "id" ? "Waktu" : "Time"}: {timeLeft}s</span>
            </div>
            
            <div className="relative h-64 bg-gradient-to-b from-blue-100 to-green-100 rounded-lg overflow-hidden border-2">
              {coins.map(coin => (
                <div
                  key={coin.id}
                  className="absolute text-2xl cursor-pointer hover:scale-110 transition-transform"
                  style={{
                    left: `${coin.x}%`,
                    top: `${coin.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  onClick={() => catchCoin(coin.id)}
                >
                  🪙
                </div>
              ))}
              
              {/* Pet character at bottom */}
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-3xl">
                🐢
              </div>
            </div>
          </div>
        )}

        {showLeaderboard && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-semibold">
                {language === "id" ? "Papan Peringkat" : "Leaderboard"}
              </h4>
              <Button 
                onClick={() => setShowLeaderboard(false)} 
                variant="outline"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {language === "id" ? "Kembali" : "Back"}
              </Button>
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-2">
              {leaderboard.length > 0 ? (
                leaderboard.map((entry: any, index: number) => (
                  <div 
                    key={entry.id} 
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-gray-600">#{index + 1}</span>
                      <div>
                        <div className="font-medium">
                          {entry.user?.firstName || entry.user?.email || 'Anonymous'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {language === "id" ? "Pet:" : "Pet:"} {entry.pet?.name || 'Unknown'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{entry.score}</div>
                      <div className="text-sm text-gray-500">
                        {entry.tokensEarned} {language === "id" ? "token" : "tokens"}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {language === "id" 
                    ? "Belum ada skor yang tercatat. Jadilah yang pertama!"
                    : "No scores recorded yet. Be the first!"}
                </div>
              )}
            </div>
          </div>
        )}

        {gameOver && (
          <div className="text-center space-y-4">
            <div className="text-4xl">🏆</div>
            <h4 className="text-lg font-semibold">
              {language === "id" ? "Permainan Selesai!" : "Game Over!"}
            </h4>
            <p className="text-gray-600">
              {language === "id" ? `Skor Akhir: ${score}` : `Final Score: ${score}`}
            </p>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button onClick={startGame} variant="outline">
                  {language === "id" ? "Main Lagi" : "Play Again"}
                </Button>
                <Button onClick={onClose}>
                  {language === "id" ? "Selesai" : "Done"}
                </Button>
              </div>
              <Button 
                onClick={() => setShowLeaderboard(true)} 
                variant="outline" 
                className="w-full"
              >
                <Trophy className="h-4 w-4 mr-2" />
                {language === "id" ? "Lihat Peringkat" : "View Leaderboard"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Pet Care Component
function PetCareSection({ language, user }: { language: string; user: any }) {
  const { toast } = useToast();
  
  // State for real-time timer updates
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showCoinGame, setShowCoinGame] = useState(false);
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [currentPetIndex, setCurrentPetIndex] = useState(0);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [sleepCountdown, setSleepCountdown] = useState<number>(0);
  const [editingPetName, setEditingPetName] = useState<number | null>(null);
  const [newPetName, setNewPetName] = useState("");

  // Update timer every second for real-time display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
      // Update sleep countdown
      setSleepCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch user's toys that can become pets
  const { data: userToys = [], isLoading: toysLoading } = useQuery({
    queryKey: ["/api/toys"],
    enabled: !!user?.id,
    retry: 1,
  });

  // Fetch marketplace listings to filter out listed toys
  const { data: marketplaceListings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ["/api/listings"],
    enabled: !!user?.id,
    retry: 1,
  });

  // Fetch user's pets with real-time updates
  const { data: pets = [], isLoading: petsLoading, refetch: refetchPets } = useQuery({
    queryKey: ["/api/pets"],
    enabled: !!user?.id,
    retry: 1,
    staleTime: 5000, // Consider data fresh for 5 seconds
    refetchInterval: 5000, // Update every 5 seconds to prevent flashing
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Safe pets array with proper fallback - define this first to avoid crashes
  const safePets = Array.isArray(pets) ? pets : [];
  
  // Synchronous DOM update using useLayoutEffect for immediate visual changes
  useLayoutEffect(() => {
    if (safePets.length > 0 && safePets[currentPetIndex]) {
      const currentPet = safePets[currentPetIndex];
      
      // Update progress bars directly with proper TypeScript casting
      const hungerBar = document.querySelector(`[data-stat="hunger-${currentPet.id}"]`) as HTMLElement;
      const happinessBar = document.querySelector(`[data-stat="happiness-${currentPet.id}"]`) as HTMLElement;
      const cleanlinessBar = document.querySelector(`[data-stat="cleanliness-${currentPet.id}"]`) as HTMLElement;
      const energyBar = document.querySelector(`[data-stat="energy-${currentPet.id}"]`) as HTMLElement;
      
      if (hungerBar) {
        hungerBar.style.width = `${currentPet.hunger || 0}%`;
        hungerBar.style.transform = `scaleX(${(currentPet.hunger || 0) / 100})`;
        hungerBar.style.transformOrigin = 'left';
      }
      if (happinessBar) {
        happinessBar.style.width = `${currentPet.happiness || 0}%`;
        happinessBar.style.transform = `scaleX(${(currentPet.happiness || 0) / 100})`;
        happinessBar.style.transformOrigin = 'left';
      }
      if (cleanlinessBar) {
        cleanlinessBar.style.width = `${currentPet.cleanliness || 0}%`;
        cleanlinessBar.style.transform = `scaleX(${(currentPet.cleanliness || 0) / 100})`;
        cleanlinessBar.style.transformOrigin = 'left';
      }
      if (energyBar) {
        energyBar.style.width = `${currentPet.energy || 0}%`;
        energyBar.style.transform = `scaleX(${(currentPet.energy || 0) / 100})`;
        energyBar.style.transformOrigin = 'left';
      }
    }
  });

  // Force refresh when pet data changes (only on currentPetIndex change)
  useEffect(() => {
    setForceRefresh(prev => prev + 1);
  }, [currentPetIndex]);

  // Aggressive timer-based refresh for visual updates
  useEffect(() => {
    const aggressiveUpdate = setInterval(() => {
      if (safePets.length > 0 && safePets[currentPetIndex]) {
        const currentPet = safePets[currentPetIndex];
        
        // Force DOM updates every 500ms
        const hungerBar = document.querySelector(`[data-stat="hunger-${currentPet.id}"]`) as HTMLElement;
        const happinessBar = document.querySelector(`[data-stat="happiness-${currentPet.id}"]`) as HTMLElement;
        const cleanlinessBar = document.querySelector(`[data-stat="cleanliness-${currentPet.id}"]`) as HTMLElement;
        const energyBar = document.querySelector(`[data-stat="energy-${currentPet.id}"]`) as HTMLElement;
        
        if (hungerBar) {
          hungerBar.style.width = `${currentPet.hunger || 0}%`;
          hungerBar.style.transform = `scaleX(${(currentPet.hunger || 0) / 100})`;
        }
        if (happinessBar) {
          happinessBar.style.width = `${currentPet.happiness || 0}%`;
          happinessBar.style.transform = `scaleX(${(currentPet.happiness || 0) / 100})`;
        }
        if (cleanlinessBar) {
          cleanlinessBar.style.width = `${currentPet.cleanliness || 0}%`;
          cleanlinessBar.style.transform = `scaleX(${(currentPet.cleanliness || 0) / 100})`;
        }
        if (energyBar) {
          energyBar.style.width = `${currentPet.energy || 0}%`;
          energyBar.style.transform = `scaleX(${(currentPet.energy || 0) / 100})`;
        }
      }
    }, 500);

    return () => clearInterval(aggressiveUpdate);
  }, [safePets, currentPetIndex]);
  
  // Debug logging to track what data we're getting
  useEffect(() => {
    if (safePets.length > 0 && safePets[currentPetIndex]) {
      console.log('Current pet data in UI:', {
        id: safePets[currentPetIndex].id,
        name: safePets[currentPetIndex].name,
        hunger: safePets[currentPetIndex].hunger,
        happiness: safePets[currentPetIndex].happiness,
        cleanliness: safePets[currentPetIndex].cleanliness,
        energy: safePets[currentPetIndex].energy,
        timestamp: new Date().toISOString()
      });
    }
  }, [safePets, currentPetIndex]);

  // Auto decay system - runs every 3 minutes for all pets
  useEffect(() => {
    if (pets && Array.isArray(pets) && pets.length > 0) {
      const decayInterval = setInterval(async () => {
        for (const pet of pets) {
          if (!pet?.id) continue;
          
          try {
            const response = await fetch(`/api/pets/${pet.id}/auto-decay`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log(`Decay applied to pet ${pet.name}:`, data.message);
              
              // Refresh pets to get updated stats
              refetchPets();
            }
          } catch (error) {
            console.error(`Error applying decay to pet ${pet.name}:`, error);
          }
        }
      }, 180000); // Run every 3 minutes (180,000 milliseconds)

      return () => clearInterval(decayInterval);
    }
  }, [pets]);
  
  // Get current pet from pets array
  const currentPet = safePets[currentPetIndex];

  // Fetch care status for current pet
  const { data: careStatus } = useQuery({
    queryKey: ["/api/pets", currentPet?.id, "care-status"],
    enabled: !!currentPet?.id,
  });

  // Fetch sleep progress for sleeping pets with proper API endpoint
  const { data: sleepProgress } = useQuery({
    queryKey: ["/api/pets", safePets[currentPetIndex]?.id, "sleep-progress"],
    enabled: !!safePets[currentPetIndex]?.id && safePets[currentPetIndex]?.isSleeping,
    refetchInterval: 1000, // Update every second for real-time timer
    queryFn: async () => {
      if (!safePets[currentPetIndex]?.id) return null;
      const response = await fetch(`/api/pets/${safePets[currentPetIndex].id}/sleep-progress`);
      const data = await response.json();
      
      // Check for auto wake-up
      if (data.autoWoken) {
        toast({
          title: language === "id" ? "Pet Bangun Otomatis!" : "Pet Auto-Woke!",
          description: language === "id" ? "Energi pet sudah penuh (100%)!" : "Pet's energy is now full (100%)!",
        });
        // Refresh pet data to show updated status
        refetchPets();
      }
      
      return data;
    }
  });

  // Persistent sleep timer that maintains state across page navigation
  useEffect(() => {
    if (!safePets[currentPetIndex]?.isSleeping) {
      // Clear any stored sleep data if pet is not sleeping
      localStorage.removeItem(`sleep_${safePets[currentPetIndex]?.id}`);
      return;
    }

    const petId = safePets[currentPetIndex]?.id;
    if (!petId) return;

    const sleepKey = `sleep_${petId}`;
    
    // Check if we have stored sleep start time
    let sleepStartTime = localStorage.getItem(sleepKey);
    
    if (!sleepStartTime && sleepProgress?.nextEnergyIn) {
      // First time seeing this sleeping pet - calculate and store the start time
      const now = Date.now();
      const minutesUntilNext = sleepProgress.nextEnergyIn;
      const secondsUntilNext = minutesUntilNext * 60;
      const lastEnergyTime = now - ((5 * 60) - secondsUntilNext) * 1000;
      localStorage.setItem(sleepKey, lastEnergyTime.toString());
      sleepStartTime = lastEnergyTime.toString();
    }
    
    if (sleepStartTime) {
      const updateCountdown = () => {
        const now = Date.now();
        const lastEnergy = parseInt(sleepStartTime);
        const timeSinceLastEnergy = (now - lastEnergy) / 1000; // in seconds
        const secondsUntilNextEnergy = (5 * 60) - (timeSinceLastEnergy % (5 * 60));
        setSleepCountdown(Math.max(0, Math.floor(secondsUntilNextEnergy)));
      };
      
      updateCountdown();
      const timer = setInterval(updateCountdown, 1000);
      
      return () => clearInterval(timer);
    }
  }, [safePets[currentPetIndex]?.isSleeping, safePets[currentPetIndex]?.id, sleepProgress]);

  // Automatic stat decay system - reduce hunger and cleanliness by 1% every 3 minutes
  useEffect(() => {
    if (!safePets[currentPetIndex]?.id) return;

    const decayInterval = setInterval(async () => {
      try {
        // Apply stat decay via backend endpoint
        await apiRequest('POST', `/api/pets/${safePets[currentPetIndex].id}/auto-decay`);
        // Refresh pet data to show updated stats
        refetchPets();
      } catch (error) {
        console.error('Stat decay error:', error);
      }
    }, 180000); // 3 minutes = 180,000ms

    return () => clearInterval(decayInterval);
  }, [safePets[currentPetIndex]?.id]);

  // Get owned toys (filter out toys that are already pets or listed in marketplace)
  const ownedToys = Array.isArray(userToys) ? userToys.filter((toy: any) => 
    toy.ownerId === user?.id &&
    !pets?.some((pet: any) => pet.toyId === toy.id) &&
    !marketplaceListings?.some((listing: any) => listing.toyId === toy.id && listing.status === 'active')
  ) : [];

  // Get unactivated toys (toys without QR codes activated)
  const unactivatedToys = ownedToys?.filter((toy: any) => !toy.isActivated) || [];

  const queryClient = useQueryClient();

  // Simple bath mutation that uses the working feed endpoint
  const bathMutation = useMutation({
    mutationFn: async ({ petId }: { petId: number }) => {
      console.log('Bath button clicked - calling fed endpoint');
      const result = await apiRequest("POST", `/api/pets/${petId}/care/fed`, {});
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      toast({
        title: "Bath Complete!",
        description: "Your pet has been bathed and feels refreshed!",
      });
    },
    onError: (error) => {
      console.error('Bath failed:', error);
      toast({
        title: "Bath Failed",
        description: "Something went wrong while bathing your pet.",
        variant: "destructive",
      });
    }
  });

  // Pet name editing mutation
  const petNameMutation = useMutation({
    mutationFn: async ({ petId, newName }: { petId: number; newName: string }) => {
      const result = await apiRequest("PATCH", `/api/pets/${petId}/name`, { name: newName });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tokens/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-stats"] });
      setEditingPetName(null);
      setNewPetName("");
      toast({
        title: language === "id" ? "Berhasil!" : "Success!",
        description: language === "id" ? "Nama pet berhasil diubah! (-5 token)" : "Pet name updated successfully! (-5 tokens)",
      });
    },
    onError: (error: any) => {
      toast({
        title: language === "id" ? "Gagal!" : "Error!",
        description: error.message || (language === "id" ? "Gagal mengubah nama pet" : "Failed to update pet name"),
        variant: "destructive",
      });
    }
  });

  // Pet care mutations
  const careActivityMutation = useMutation({
    mutationFn: async ({ petId, careType }: { petId: number; careType: string }) => {
      console.log('Making API call to:', `/api/pets/${petId}/care/${careType}`);
      try {
        const result = await apiRequest("POST", `/api/pets/${petId}/care/${careType}`, {});
        console.log('API call successful:', result);
        return result;
      } catch (error) {
        console.error('API call failed:', error);
        throw error;
      }
    },
    onSuccess: async (data) => {
      // Force complete cache invalidation and refetch
      await queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      await queryClient.refetchQueries({ queryKey: ["/api/pets"] });
      
      // Also invalidate user stats in case tokens were awarded
      await queryClient.invalidateQueries({ queryKey: ["/api/user-stats"] });
      
      // Aggressive DOM manipulation with forced reflows
      if (data && data.pet) {
        const petId = data.pet.id;
        const updatedPet = data.pet;
        
        // Find all progress bars for this pet
        const allProgressBars = document.querySelectorAll(`[data-stat*="${petId}"]`) as NodeListOf<HTMLElement>;
        const allValueDisplays = document.querySelectorAll(`span[style*="color"]`) as NodeListOf<HTMLElement>;
        
        // Update each stat individually with forced reflow
        ['hunger', 'happiness', 'cleanliness', 'energy'].forEach(stat => {
          const value = updatedPet[stat];
          if (value !== undefined) {
            // Update progress bar
            const progressBar = document.querySelector(`[data-stat="${stat}-${petId}"]`) as HTMLElement;
            if (progressBar) {
              // Force immediate style changes
              progressBar.style.width = '0%';
              progressBar.offsetHeight; // Force reflow
              progressBar.style.width = `${value}%`;
              progressBar.style.backgroundColor = value >= 75 ? '#10b981' : value >= 50 ? '#8b5cf6' : value >= 25 ? '#3b82f6' : '#ef4444';
              progressBar.offsetHeight; // Force another reflow
              
              // Add visual feedback
              progressBar.style.transition = 'width 0.5s ease-out';
              progressBar.classList.add('animate-pulse');
              setTimeout(() => progressBar.classList.remove('animate-pulse'), 600);
            }
            
            // Update text displays
            const textElements = document.querySelectorAll(`*:contains("${value}%")`);
            textElements.forEach(el => {
              if (el.textContent?.includes('%')) {
                el.textContent = el.textContent.replace(/\d+%/, `${value}%`);
              }
            });
          }
        });
        
        // Use vanilla JavaScript DOM manipulation to force visual updates
        forceProgressBarUpdate(petId, updatedPet);
        
        // Force complete component re-render
        setForceRefresh(Date.now());
      }
      
      // Multiple refetch attempts with delays
      setTimeout(async () => {
        await queryClient.refetchQueries({ queryKey: ["/api/pets"] });
        setForceRefresh(Date.now());
        
        // Force DOM update again after refetch
        if (data && data.pet) {
          forceProgressBarUpdate(data.pet.id, data.pet);
        }
      }, 100);
      
      setTimeout(async () => {
        await queryClient.refetchQueries({ queryKey: ["/api/pets"] });
        setForceRefresh(Date.now());
        
        // Final DOM update
        if (data && data.pet) {
          forceProgressBarUpdate(data.pet.id, data.pet);
        }
      }, 500);
      
      toast({
        title: language === "id" ? "Berhasil!" : "Success!",
        description: language === "id" ? "Aktivitas perawatan berhasil!" : "Care activity completed!",
      });
    },
    onError: (error: any) => {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: error.message || (language === "id" ? "Gagal melakukan aktivitas perawatan" : "Failed to perform care activity"),
        variant: "destructive"
      });
    }
  });

  // Energy potion mutation
  const energyPotionMutation = useMutation({
    mutationFn: async ({ petId }: { petId: number }) => {
      const result = await apiRequest("POST", `/api/pets/${petId}/energy-potion`, {});
      return result;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-stats"] });
      queryClient.refetchQueries({ queryKey: ["/api/pets"] });
      queryClient.refetchQueries({ queryKey: ["/api/user-stats"] });
      toast({
        title: language === "id" ? "Ramuan Energi Berhasil!" : "Energy Potion Success!",
        description: language === "id" ? `Energi pet dipulihkan ke 100%! Token: ${data.newTokenBalance}` : `Pet energy restored to 100%! Tokens: ${data.newTokenBalance}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: language === "id" ? "Gagal Menggunakan Ramuan" : "Failed to Use Potion",
        description: error.message || (language === "id" ? "Gagal menggunakan ramuan energi" : "Failed to use energy potion"),
        variant: "destructive"
      });
    }
  });

  // Sleep mutation
  const sleepMutation = useMutation({
    mutationFn: async (petId: number) => {
      return apiRequest("POST", `/api/pets/${petId}/sleep`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      queryClient.refetchQueries({ queryKey: ["/api/pets"] });
      toast({
        title: language === "id" ? "Berhasil!" : "Success!",
        description: language === "id" ? "Hewan peliharaan sedang tidur" : "Pet is now sleeping",
      });
    },
    onError: (error: any) => {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: error.message || (language === "id" ? "Gagal menidurkan hewan" : "Failed to put pet to sleep"),
        variant: "destructive"
      });
    }
  });

  // Wake mutation
  const wakeMutation = useMutation({
    mutationFn: async (petId: number) => {
      return apiRequest("POST", `/api/pets/${petId}/wake`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      queryClient.refetchQueries({ queryKey: ["/api/pets"] });
      toast({
        title: language === "id" ? "Berhasil!" : "Success!",
        description: language === "id" ? "Hewan peliharaan sudah bangun" : "Pet is now awake",
      });
    },
    onError: (error: any) => {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: error.message || (language === "id" ? "Gagal membangunkan hewan" : "Failed to wake up pet"),
        variant: "destructive"
      });
    }
  });

  // Edit pet name mutation
  const editPetNameMutation = useMutation({
    mutationFn: async ({ petId, newName }: { petId: number; newName: string }) => {
      console.log(`Making PATCH request to /api/pets/${petId}/name with name:`, newName);
      const response = await apiRequest("PATCH", `/api/pets/${petId}/name`, { name: newName });
      console.log("Edit pet name response:", response);
      return response;
    },
    onSuccess: (data, variables) => {
      console.log("Edit pet name success, clearing edit state");
      // Clear edit state immediately
      setEditingPetName(null);
      setNewPetName("");
      
      // Refresh queries with a delay to prevent race conditions
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user-stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }, 100);
      
      toast({
        title: "Success!",
        description: `Pet name updated to "${variables.newName}" (-5 tokens)`,
      });
    },
    onError: (error: any) => {
      console.error("Edit pet name error:", error);
      // Clear edit state on error too
      setEditingPetName(null);
      setNewPetName("");
      
      toast({
        title: "Error",
        description: error.message || "Failed to update pet name",
        variant: "destructive"
      });
    }
  });

  // Simple toy activation mutation (no pet creation)
  const activateToyMutation = useMutation({
    mutationFn: async (qrCode: string) => {
      return apiRequest("POST", "/api/toys/scan", { qrCode });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/toys"] });
      toast({
        title: language === "id" ? "Berhasil!" : "Success!",
        description: language === "id" ? "Mainan berhasil diaktifkan!" : "Toy successfully activated!",
      });
    },
    onError: (error: any) => {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: error.message || (language === "id" ? "Gagal mengaktifkan mainan" : "Failed to activate toy"),
        variant: "destructive"
      });
    }
  });



  // Show loading state
  if (toysLoading || listingsLoading || petsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading pet care...</p>
        </div>
      </div>
    );
  }

  // Check if user has any pets activated
  const userPets = Array.isArray(pets) ? pets : [];
  
  if (userPets.length > 0) {
    // Show pet care interface with feeding games
    return (
      <div className="space-y-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            {language === "id" ? "Sistem Perawatan Hewan" : "Pet Care System"}
          </h2>
          <p className="text-slate-600">
            {language === "id" ? "Rawat hewan digital Anda untuk mendapatkan token harian!" : "Take care of your digital pets to earn daily tokens!"}
          </p>
          
          {/* Pet Navigation - Only show if user has multiple pets */}
          {userPets.length > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPetIndex((prev) => (prev > 0 ? prev - 1 : userPets.length - 1))}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {language === "id" ? "Sebelumnya" : "Previous"}
              </Button>
              
              <div className="bg-white border rounded-lg px-4 py-2 shadow-sm">
                <span className="text-sm font-medium">
                  {language === "id" ? `Hewan ${currentPetIndex + 1} dari ${userPets.length}` : `Pet ${currentPetIndex + 1} of ${userPets.length}`}
                </span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPetIndex((prev) => (prev < userPets.length - 1 ? prev + 1 : 0))}
                className="flex items-center gap-2"
              >
                {language === "id" ? "Selanjutnya" : "Next"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
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

        <div className="grid grid-cols-1 gap-8">
          {userPets.slice(currentPetIndex, currentPetIndex + 1).map((pet: any) => {
            // Calculate comprehensive pet lifecycle timer using real-time updates
            const now = currentTime;
            const birthTime = new Date(pet.birthDate || pet.createdAt).getTime();
            const elapsedMs = now - birthTime;
            
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
            
            // Growth stage based on age (every 20 days)
            let growthStage = "Baby";
            let dragonEmoji = "🥚"; // Default baby stage
            
            if (isDead) {
              growthStage = "Deceased";
              dragonEmoji = "💀";
            } else if (ageInYears >= 80) {
              growthStage = language === "id" ? "Grand Turtle Dragon" : "Grand Turtle Dragon";
              dragonEmoji = "🐉"; // Majestic dragon
            } else if (ageInYears >= 60) {
              growthStage = language === "id" ? "Adult Turtle Dragon" : "Adult Turtle Dragon";
              dragonEmoji = "🐲"; // Full grown dragon
            } else if (ageInYears >= 40) {
              growthStage = language === "id" ? "Teenager Turtle Dragon" : "Teenager Turtle Dragon";
              dragonEmoji = "🦕"; // Large dinosaur
            } else if (ageInYears >= 20) {
              growthStage = language === "id" ? "Youth Turtle Dragon" : "Youth Turtle Dragon";
              dragonEmoji = "🐢"; // Turtle form
            } else {
              growthStage = language === "id" ? "Baby Turtle Dragon" : "Baby Turtle Dragon";
              dragonEmoji = "🐢"; // Baby turtle form
            }
            
            // Hunger decreases from the last fed value over 6 hours
            const calculateHunger = (lastFeedTime?: Date) => {
              if (isDead) return 0; // Dead pets have 0 status
              
              // If fed recently (within 5 minutes), use database value to show immediate effect
              if (lastFeedTime) {
                const minutesSinceLastFeed = (now - new Date(lastFeedTime).getTime()) / (1000 * 60);
                if (minutesSinceLastFeed < 5) {
                  return pet.hunger || 50; // Use fresh database value
                }
              }
              
              // Use database value as starting point, then apply decay
              const baseHunger = pet.hunger || 50;
              
              if (!lastFeedTime) {
                // No feeding recorded, decay from birth
                const hoursSinceBirth = elapsedMs / (1000 * 60 * 60);
                const decay = Math.max(0, baseHunger - (hoursSinceBirth / 6) * baseHunger);
                return Math.floor(decay);
              }
              
              const hoursSinceLastFeed = (now - new Date(lastFeedTime).getTime()) / (1000 * 60 * 60);
              const decay = Math.max(0, baseHunger - (hoursSinceLastFeed / 6) * baseHunger);
              return Math.floor(decay);
            };

            // Cleanliness decreases from the last bathed value over 6 hours
            const calculateCleanliness = (lastCareTime?: Date) => {
              if (isDead) return 0; // Dead pets have 0 status
              
              // If bathed recently (within 5 minutes), use database value to show immediate effect
              if (lastCareTime) {
                const minutesSinceLastCare = (now - new Date(lastCareTime).getTime()) / (1000 * 60);
                if (minutesSinceLastCare < 5) {
                  return pet.cleanliness || 50; // Use fresh database value
                }
              }
              
              // Use database value as starting point, then apply decay
              const baseCleanliness = pet.cleanliness || 50;
              
              if (!lastCareTime) {
                // No care recorded, decay from birth
                const hoursSinceBirth = elapsedMs / (1000 * 60 * 60);
                const decay = Math.max(0, baseCleanliness - (hoursSinceBirth / 6) * baseCleanliness);
                return Math.floor(decay);
              }
              
              const hoursSinceLastCare = (now - new Date(lastCareTime).getTime()) / (1000 * 60 * 60);
              const decay = Math.max(0, baseCleanliness - (hoursSinceLastCare / 6) * baseCleanliness);
              return Math.floor(decay);
            };

            // Always use calculated decay values for proper pet lifecycle
            const hunger = isDead ? 0 : calculateHunger(pet.lastFedAt);
            const cleanliness = isDead ? 0 : calculateCleanliness(pet.lastCareDate);
            const energy = isDead ? 0 : (pet.energy || 50); // Use stored energy value
            
            // Calculate happiness decay over time
            const calculateHappiness = () => {
              if (isDead) return 0;
              
              // Happiness decreases if hunger or cleanliness are low
              const happinessDecay = Math.max(10, Math.min(hunger, cleanliness));
              return Math.floor(happinessDecay);
            };
            
            const happiness = isDead ? 0 : calculateHappiness();

            // Check if pet can earn tokens (alive, stats > 0, and at least 1 day old)
            const canEarnTokens = !isDead && days >= 1 && hunger > 0 && happiness > 0;

            return (
              <Card key={pet.id} className="overflow-hidden">
                <CardHeader className={`text-white ${isDead ? 'bg-gradient-to-r from-gray-600 to-gray-800' : 'bg-gradient-to-r from-purple-500 to-pink-500'}`}>
                  <CardTitle className="flex items-center justify-between">
                    {editingPetName === pet.id ? (
                      <div className="flex items-center gap-2 w-full">
                        <Input
                          value={newPetName}
                          onChange={(e) => setNewPetName(e.target.value)}
                          placeholder="Enter new name"
                          className="text-white bg-white/20 border-white/30 placeholder:text-white/70 flex-1"
                          maxLength={20}
                          autoFocus
                        />
                        <span className="text-xs text-white/80 whitespace-nowrap">-5 tokens</span>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!newPetName.trim()) {
                              toast({
                                title: "Error",
                                description: "Pet name cannot be empty",
                                variant: "destructive",
                              });
                              return;
                            }
                            
                            if (user && user.tokens >= 5) {
                              console.log("Triggering pet name edit mutation:", {
                                petId: pet.id,
                                newName: newPetName.trim(),
                                currentTokens: user.tokens
                              });
                              editPetNameMutation.mutate({
                                petId: pet.id,
                                newName: newPetName.trim()
                              });
                            } else {
                              console.log("Cannot edit pet name - insufficient tokens:", {
                                userTokens: user?.tokens,
                                required: 5
                              });
                            }
                          }}
                          disabled={editPetNameMutation.isPending || !user || user.tokens < 5}
                          className="bg-green-600 hover:bg-green-700 text-white px-3"
                        >
                          {editPetNameMutation.isPending ? "..." : "✓"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingPetName(null);
                            setNewPetName("");
                          }}
                          className="text-white hover:bg-white/20 px-3"
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span>{pet.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingPetName(pet.id);
                            setNewPetName(pet.name || "");
                          }}
                          disabled={!user || user.loyaltyPoints < 5}
                          className="h-6 w-6 p-0 text-white hover:bg-white/20 bg-white/10 border border-white/30"
                          title={`Edit Pet Name - Costs 5 tokens (You have ${user?.loyaltyPoints || 0})`}
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
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
                  <div className="space-y-6">
                    {/* Animated Dragon Turtle with Growth Stages */}
                    <div className="relative h-32 bg-gradient-to-b from-blue-100 to-green-100 rounded-lg overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className={isDead ? '' : pet.isSleeping ? '' : 'animate-bounce'}>
                          <div 
                            className="text-6xl transition-transform duration-1000 hover:scale-110"
                            style={{
                              animation: isDead ? 'none' : pet.isSleeping ? 'sleepBreathe 3s ease-in-out infinite' : 'walkLeftRight 4s ease-in-out infinite',
                              filter: isDead ? 'grayscale(100%) opacity(0.3)' : hunger === 0 ? 'grayscale(100%) opacity(0.5)' : pet.isSleeping ? 'brightness(0.7)' : 'none',
                              transform: isDead ? 'rotate(90deg)' : 'none'
                            }}
                          >
                            {dragonEmoji}
                          </div>
                        </div>
                        
                        {/* Sleep indicator with floating Z's */}
                        {pet.isSleeping && !isDead && (
                          <div className="absolute top-2 right-2">
                            <div 
                              className="text-2xl"
                              style={{
                                animation: 'sleepZzz 2s ease-in-out infinite',
                                animationDelay: '0s'
                              }}
                            >
                              💤
                            </div>
                            <div 
                              className="text-xl absolute -top-1 -right-1"
                              style={{
                                animation: 'sleepZzz 2s ease-in-out infinite',
                                animationDelay: '0.5s'
                              }}
                            >
                              z
                            </div>
                            <div 
                              className="text-lg absolute -top-2 -right-2"
                              style={{
                                animation: 'sleepZzz 2s ease-in-out infinite',
                                animationDelay: '1s'
                              }}
                            >
                              z
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Growth Stage Indicator */}
                      <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        {language === "id" ? `Tahap: ${growthStage}` : `Stage: ${growthStage}`}
                      </div>
                      {hunger === 0 && (
                        <div className="absolute top-2 right-2 text-red-500 font-bold">
                          💀 {language === "id" ? "Lapar" : "Starving"}
                        </div>
                      )}
                      {!canEarnTokens && days < 1 && !isDead && (
                        <div className="absolute bottom-2 left-2 text-yellow-600 text-xs">
                          🕒 {language === "id" ? "Terlalu muda untuk token" : "Too young for tokens"}
                        </div>
                      )}
                    </div>

                    {/* Pet Stats with Real-time Values */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                          {language === "id" ? "Kebahagiaan" : "Happiness"}
                          {happiness < 25 && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full animate-pulse">
                              😢 {language === "id" ? "Sedih" : "Sad"}
                            </span>
                          )}
                        </p>
                        <div className="relative energy-shimmer">
                          <div className="w-full bg-blue-100 rounded-full h-4 overflow-hidden border border-gray-200">
                            <div 
                              className={`h-full transition-all duration-700 ${
                                happiness >= 100 ? 'energy-full' : 
                                happiness < 25 ? 'energy-low' : ''
                              }`}
                              style={{
                                width: `${happiness}%`,
                                background: happiness >= 75 
                                  ? 'linear-gradient(90deg, #10b981, #34d399, #10b981)' 
                                  : happiness >= 50
                                  ? 'linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b)'
                                  : happiness >= 25
                                  ? 'linear-gradient(90deg, #f97316, #fb923c, #f97316)'
                                  : 'linear-gradient(90deg, #dc2626, #ef4444, #dc2626)'
                              }}
                            />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-xs font-bold ${happiness >= 75 ? 'text-white' : 'text-gray-800'} drop-shadow-lg ${
                              happiness >= 100 ? 'animate-bounce' : ''
                            }`}>
                              😊 {happiness}/100
                            </span>
                          </div>
                        </div>
                        <div className="mt-1 text-center">
                          {happiness >= 100 && (
                            <span className="text-xs text-green-600 font-bold animate-bounce">
                              ✨ {language === "id" ? "Sangat Bahagia!" : "Very Happy!"}
                            </span>
                          )}
                          {happiness < 25 && (
                            <span className="text-xs text-red-600 font-bold animate-pulse">
                              💔 {language === "id" ? "Tidak Bahagia" : "Unhappy"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                          {language === "id" ? "Rasa Lapar" : "Hunger"}
                          {hunger < 25 && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full animate-pulse">
                              🍽️ {language === "id" ? "Kelaparan" : "Starving"}
                            </span>
                          )}
                        </p>
                        <div className="relative energy-shimmer">
                          <div className="w-full bg-blue-100 rounded-full h-4 overflow-hidden border border-gray-200">
                            <div 
                              className={`h-full transition-all duration-700 ${
                                hunger >= 100 ? 'energy-full' : 
                                hunger < 25 ? 'energy-low' : ''
                              }`}
                              style={{
                                width: `${hunger}%`,
                                background: hunger >= 100 
                                  ? 'linear-gradient(90deg, #10b981, #34d399, #10b981)' 
                                  : hunger >= 75 
                                  ? 'linear-gradient(90deg, #10b981, #34d399, #10b981)'
                                  : hunger >= 50
                                  ? 'linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b)'
                                  : hunger >= 25
                                  ? 'linear-gradient(90deg, #f97316, #fb923c, #f97316)'
                                  : 'linear-gradient(90deg, #dc2626, #ef4444, #dc2626)'
                              }}
                            />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-xs font-bold ${hunger >= 75 ? 'text-white' : 'text-gray-800'} drop-shadow-lg ${
                              hunger >= 100 ? 'animate-bounce' : ''
                            }`}>
                              🍎 {hunger}/100
                            </span>
                          </div>
                        </div>
                        <div className="mt-1 text-center">
                          {hunger >= 100 && (
                            <span className="text-xs text-green-600 font-bold animate-bounce">
                              ✨ {language === "id" ? "Kenyang!" : "Full!"}
                            </span>
                          )}
                          {hunger < 25 && (
                            <span className="text-xs text-red-600 font-bold animate-pulse">
                              ⚠️ {language === "id" ? "Sangat Lapar" : "Very Hungry"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                          {language === "id" ? "Kebersihan" : "Cleanliness"}
                          {cleanliness < 25 && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full animate-pulse">
                              🧼 {language === "id" ? "Kotor" : "Dirty"}
                            </span>
                          )}
                        </p>
                        <div className="relative energy-shimmer">
                          <div className="w-full bg-blue-100 rounded-full h-4 overflow-hidden border border-gray-200">
                            <div 
                              className={`h-full transition-all duration-700 ${
                                cleanliness >= 100 ? 'energy-full' : 
                                cleanliness < 25 ? 'energy-low' : ''
                              }`}
                              style={{
                                width: `${cleanliness}%`,
                                background: cleanliness >= 75 
                                  ? 'linear-gradient(90deg, #10b981, #34d399, #10b981)'
                                  : cleanliness >= 50
                                  ? 'linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b)'
                                  : cleanliness >= 25
                                  ? 'linear-gradient(90deg, #f97316, #fb923c, #f97316)'
                                  : 'linear-gradient(90deg, #dc2626, #ef4444, #dc2626)'
                              }}
                            />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-xs font-bold ${cleanliness >= 75 ? 'text-white' : 'text-gray-800'} drop-shadow-lg ${
                              cleanliness >= 100 ? 'animate-bounce' : ''
                            }`}>
                              🛁 {cleanliness}/100
                            </span>
                          </div>
                        </div>
                        <div className="mt-1 text-center">
                          {cleanliness >= 100 && (
                            <span className="text-xs text-blue-600 font-bold animate-bounce">
                              ✨ {language === "id" ? "Bersih Sekali!" : "Very Clean!"}
                            </span>
                          )}
                          {cleanliness < 25 && (
                            <span className="text-xs text-red-600 font-bold animate-pulse">
                              ⚠️ {language === "id" ? "Sangat Kotor" : "Very Dirty"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                          {language === "id" ? "Energi" : "Energy"}
                          {pet.isSleeping && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full animate-pulse">
                              💤 {language === "id" ? "Mengisi" : "Charging"}
                            </span>
                          )}
                        </p>
                        <div className="relative energy-shimmer">
                          <div className="w-full bg-blue-100 rounded-full h-4 overflow-hidden border border-gray-200">
                            <div 
                              className={`h-full transition-all duration-700 ${
                                energy >= 100 ? 'energy-full' : 
                                pet.isSleeping ? 'energy-charging' :
                                energy < 25 ? 'energy-low' : ''
                              }`}
                              style={{
                                width: `${energy}%`,
                                background: energy >= 100 
                                  ? 'linear-gradient(90deg, #10b981, #34d399, #10b981)' 
                                  : energy >= 75 
                                  ? 'linear-gradient(90deg, #10b981, #34d399, #10b981)'
                                  : energy >= 50
                                  ? 'linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b)'
                                  : energy >= 25
                                  ? 'linear-gradient(90deg, #f97316, #fb923c, #f97316)'
                                  : 'linear-gradient(90deg, #dc2626, #ef4444, #dc2626)',
                                backgroundSize: pet.isSleeping ? '200% 100%' : '100% 100%'
                              }}
                            />
                          </div>
                          {energy >= 100 && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-40 animate-ping">
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-xs font-bold text-white drop-shadow-lg ${
                              energy >= 100 ? 'animate-bounce' : ''
                            }`}>
                              ⚡ {energy}/100
                            </span>
                          </div>
                        </div>
                        <div className="mt-1 text-center">
                          {energy >= 100 && (
                            <span className="text-xs text-green-600 font-bold animate-bounce">
                              ✨ {language === "id" ? "Penuh!" : "Full!"}
                            </span>
                          )}
                          {energy < 25 && (
                            <span className="text-xs text-red-600 font-bold animate-pulse">
                              ⚠️ {language === "id" ? "Rendah" : "Low"}
                            </span>
                          )}
                          {pet.isSleeping && energy < 100 && (
                            <span className="text-xs text-blue-600">
                              ⏳ {language === "id" ? "+1 setiap 5 menit" : "+1 every 5 minutes"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                  {/* Daily Care Activities */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">
                      {language === "id" ? "Aktivitas Harian" : "Daily Activities"}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="flex items-center gap-2 p-4 h-auto flex-col"
                        onClick={() => {
                          careActivityMutation.mutate({ petId: pet.id, careType: 'fed' });
                        }}
                        disabled={careActivityMutation.isPending}
                      >
                        <span className="text-2xl">🍎</span>
                        <span className="text-sm">{language === "id" ? "Beri Makan" : "Feed"}</span>
                      </Button>

                      <Button
                        variant="outline"
                        className="flex items-center gap-2 p-4 h-auto flex-col"
                        onClick={() => {
                          careActivityMutation.mutate({ petId: pet.id, careType: 'bathed' });
                        }}
                        disabled={careActivityMutation.isPending}
                      >
                        <span className="text-2xl">🛁</span>
                        <span className="text-sm">{language === "id" ? "Mandikan" : "Bathe"}</span>
                      </Button>

                      <Button
                        variant="outline"
                        className="flex items-center gap-2 p-4 h-auto flex-col"
                        onClick={() => {
                          careActivityMutation.mutate({ petId: pet.id, careType: 'cleaned' });
                        }}
                        disabled={careActivityMutation.isPending}
                      >
                        <span className="text-2xl">🎾</span>
                        <span className="text-sm">{language === "id" ? "Bermain" : "Play"}</span>
                      </Button>

                      {pet.isSleeping ? (
                        <Button
                          variant="outline"
                          className="flex items-center gap-2 p-4 h-auto flex-col bg-blue-50 border-blue-200"
                          onClick={() => {
                            wakeMutation.mutate(pet.id);
                          }}
                          disabled={wakeMutation.isPending}
                        >
                          <span className="text-2xl">☀️</span>
                          <span className="text-sm">{language === "id" ? "Bangunkan" : "Wake Up"}</span>
                          <span className="text-xs text-blue-600">
                            {language === "id" ? "Sedang Tidur" : "Sleeping"}
                          </span>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="flex items-center gap-2 p-4 h-auto flex-col"
                          onClick={() => {
                            sleepMutation.mutate(pet.id);
                          }}
                          disabled={sleepMutation.isPending || (pet.energy || 50) >= 100}
                        >
                          <span className="text-2xl">💤</span>
                          <span className="text-sm">{language === "id" ? "Tidurkan" : "Sleep"}</span>
                          {(pet.energy || 50) >= 100 && (
                            <span className="text-xs text-gray-500">
                              {language === "id" ? "Penuh Energi" : "Full Energy"}
                            </span>
                          )}
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        className="flex items-center gap-2 p-4 h-auto flex-col bg-purple-50 border-purple-200"
                        onClick={() => energyPotionMutation.mutate({ petId: pet.id })}
                        disabled={energyPotionMutation.isPending || (user?.tokens || 0) < 2}
                      >
                        <span className="text-2xl">⚡</span>
                        <span className="text-sm">{language === "id" ? "Energi" : "Energy"}</span>
                        <span className="text-xs">2 tokens</span>
                      </Button>

                      {/* Sleep Timer Display */}
                      {pet.isSleeping && sleepProgress && (
                        <div className="col-span-full mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-700 mb-2">
                              💤 {language === "id" ? "Pet Sedang Tidur" : "Pet is Sleeping"}
                            </div>
                            
                            <div className="text-3xl font-mono text-blue-600 mb-2">
                              {(() => {
                                const minutes = Math.floor(sleepCountdown / 60);
                                const seconds = sleepCountdown % 60;
                                return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                              })()}
                            </div>
                            
                            <div className="text-sm text-blue-600 mb-2">
                              {language === "id" 
                                ? "Waktu hingga energi berikutnya"
                                : "Time until next energy boost"
                              }
                            </div>
                            
                            <div className="text-sm text-blue-600">
                              {language === "id" ? "Energi akan pulih secara otomatis setiap 5 menit" : "Energy restores automatically every 5 minutes"}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Feeding Game */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                    <h5 className="font-semibold text-gray-900 mb-3">
                      {language === "id" ? "🎮 Mini Game: Feeding Time" : "🎮 Mini Game: Feeding Time"}
                    </h5>
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        setSelectedPet(pet);
                        setShowCoinGame(true);
                      }}
                      disabled={isDead}
                    >
                      🪙 {language === "id" ? "Mulai Coin Catching Game" : "Start Coin Catching Game"}
                    </Button>
                  </div>

                  {/* Comprehensive Pet Info */}
                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 text-center">
                      {language === "id" ? "Informasi Hewan Peliharaan" : "Pet Information"}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">{language === "id" ? "Lahir:" : "Born:"}</span>
                        <p className="font-medium">{new Date(pet.birthDate || pet.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">{language === "id" ? "Umur:" : "Age:"}</span>
                        <p className="font-medium">{ageInYears} {language === "id" ? "tahun" : "years"}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">{language === "id" ? "Status:" : "Status:"}</span>
                        <p className={`font-medium ${(() => {
                          if (isDead) return 'text-red-600';
                          const lowestStat = Math.min(hunger, cleanliness, energy, happiness);
                          if (lowestStat >= 75) return 'text-green-600';
                          if (lowestStat >= 50) return 'text-purple-600';
                          if (lowestStat >= 25) return 'text-blue-600';
                          return 'text-red-600';
                        })()}`}>
                          {(() => {
                            if (isDead) return language === "id" ? "Meninggal" : "Deceased";
                            const lowestStat = Math.min(hunger, cleanliness, energy, happiness);
                            if (lowestStat >= 75) return language === "id" ? "Sehat" : "Healthy";
                            if (lowestStat >= 50) return language === "id" ? "Bagus" : "Great";
                            if (lowestStat >= 25) return language === "id" ? "Baik" : "Good";
                            return language === "id" ? "Buruk" : "Bad";
                          })()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">{language === "id" ? "Token:" : "Tokens:"}</span>
                        <p className="font-medium">{canEarnTokens ? (pet.dailyTokensAvailable || 1) : 0}</p>
                      </div>
                    </div>
                    {!isDead && (
                      <div className="text-center text-xs text-gray-500">
                        {language === "id" ? 
                          `Sisa hidup: ${100 - days} hari (${100 - ageInYears} tahun)` : 
                          `Life remaining: ${100 - days} days (${100 - ageInYears} years)`}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
          })}
        </div>
      </div>
    );
  }

  // Safe data handling - filter owned toys and exclude marketplace listings
  const userOwnedToys = Array.isArray(userToys) ? userToys.filter((toy: any) => toy?.ownerId === user?.id) : [];
  
  // Filter out toys that are currently listed in marketplace
  const petCareToys = userOwnedToys.filter((toy: any) => {
    const isListed = Array.isArray(marketplaceListings) && marketplaceListings.some((listing: any) => 
      listing.toyId === toy.id && listing.status === 'active'
    );
    return !isListed;
  });

  if (petCareToys.length === 0) {
    return (
      <div className="space-y-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            {language === "id" ? "Perawatan Hewan Peliharaan" : "Pet Care"}
          </h2>
          <p className="text-slate-600">
            {language === "id" 
              ? "Anda belum memiliki mainan untuk dijadikan hewan peliharaan. Beli mainan terlebih dahulu!"
              : "You don't have any toys to turn into pets yet. Purchase toys first!"
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">
          {language === "id" ? "Perawatan Hewan Peliharaan" : "Pet Care"}
        </h2>
        <p className="text-slate-600">
          {language === "id" 
            ? "Aktifkan mainan Anda untuk menjadi hewan peliharaan virtual"
            : "Activate your toys to become virtual pets"
          }
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {petCareToys.map((toy: any) => (
          <Card key={toy.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="mb-4">
                  <img 
                    src={toy.imageUrl || toy.image || "/api/placeholder/100/100"} 
                    alt={toy.name} 
                    className="w-24 h-24 mx-auto object-contain"
                    onError={(e) => {
                      // Try the attached assets path if the original fails
                      if (!e.currentTarget.src.includes('/attached_assets/')) {
                        e.currentTarget.src = toy.imageUrl.startsWith('/attached_assets/') 
                          ? toy.imageUrl 
                          : "/api/placeholder/100/100";
                      } else {
                        e.currentTarget.src = "/api/placeholder/100/100";
                      }
                    }}
                  />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{toy.name}</h3>
                <p className="text-sm text-slate-600 mb-4">{toy.series}</p>
                
                <div className="mb-4">
                  {toy.isActivated ? (
                    <Badge className="bg-purple-100 text-purple-800">
                      {language === "id" ? "Hewan Peliharaan Aktif" : "Pet Active"}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      {language === "id" ? "Belum Diaktifkan" : "Not Activated"}
                    </Badge>
                  )}
                </div>

                {!toy.isActivated && (
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => activateToyMutation.mutate(toy.qrCode)}
                    disabled={activateToyMutation.isPending}
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    {activateToyMutation.isPending 
                      ? (language === "id" ? "Memproses..." : "Processing...") 
                      : (language === "id" ? "Aktifkan Mainan" : "Activate Toy")
                    }
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>


    </div>
  );

  const handleCareActivity = (petId: number, careType: string) => {
    careActivityMutation.mutate({ petId, careType });
  };

  const navigatePet = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentPetIndex((prev) => (prev > 0 ? prev - 1 : pets.length - 1));
    } else {
      setCurrentPetIndex((prev) => (prev < pets.length - 1 ? prev + 1 : 0));
    }
  };

  const getGrowthStageInfo = (stage: string) => {
    const stages: any = {
      baby: { label: "Baby", color: "bg-pink-100 text-pink-800" },
      child: { label: "Child", color: "bg-blue-100 text-blue-800" },
      teen: { label: "Teen", color: "bg-purple-100 text-purple-800" },
      adult: { label: "Adult", color: "bg-green-100 text-green-800" },
      elder: { label: "Elder", color: "bg-gray-100 text-gray-800" },
    };
    return stages[stage] || stages.baby;
  };

  if (petsLoading || toysLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }



  // Early return with loading state if data is still loading
  if (toysLoading || petsLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading pet care...</p>
        </div>
      </div>
    );
  }



  // Add safety checks for all data arrays
  const safeOwnedToys = Array.isArray(ownedToys) ? ownedToys : [];

  if (!safePets.length && !safeOwnedToys.length) {
    return (
      <div className="space-y-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            {language === "id" ? "Sistem Perawatan Hewan" : "Pet Care System"}
          </h2>
          <p className="text-slate-600">
            {language === "id" ? "Beli mainan terlebih dahulu untuk membuat hewan peliharaan!" : "Buy toys from the marketplace to create pets!"}
          </p>
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-600 mb-4">
              {language === "id" ? "Tidak ada mainan yang dimiliki" : "No toys owned"}
            </p>
            <p className="text-sm text-gray-500">
              {language === "id" ? "Kunjungi tab Marketplace untuk membeli mainan" : "Visit Marketplace tab to buy toys"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stageInfo = getGrowthStageInfo(currentPet?.growthStage || "baby");

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">
          {language === "id" ? "Sistem Perawatan Hewan" : "Pet Care System"}
        </h2>
        <p className="text-slate-600">
          {language === "id" ? "Rawat hewan digital Anda untuk mendapatkan token harian!" : "Take care of your digital pets to earn daily tokens!"}
        </p>
      </div>

      {/* Unactivated Toys Section */}
      {unactivatedToys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{language === "id" ? "Mainan yang Perlu Diaktivasi" : "Toys Awaiting Activation"}</CardTitle>
            <p className="text-sm text-gray-600">
              {language === "id" ? "Aktivasi mainan untuk mengubahnya menjadi hewan peliharaan" : "Activate your toys to turn them into pets"}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unactivatedToys.map((toy: any) => (
                <Card key={toy.id} className="border-2 border-dashed border-blue-300">
                  <CardContent className="p-4 text-center">
                    <div className="w-20 h-20 mx-auto mb-3 rounded-lg overflow-hidden">
                      <img 
                        src={toy.imageUrl} 
                        alt={toy.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjM3MzkxIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn6e4PC90ZXh0Pgo8L3N2Zz4=';
                        }}
                      />
                    </div>
                    <h4 className="font-semibold">{toy.name}</h4>
                    <p className="text-xs text-gray-500 mb-1">{toy.series}</p>
                    <p className="text-sm text-gray-600 mb-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        toy.rarity === 'rare' ? 'bg-purple-100 text-purple-800' :
                        toy.rarity === 'common' ? 'bg-gray-100 text-gray-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {toy.rarity}
                      </span>
                    </p>
                    <Button 
                      onClick={() => activateToyMutation.mutate(toy.qrCode)}
                      disabled={activateToyMutation.isPending}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      {language === "id" ? "Lahirkan" : "Born"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activated Toys (can create pets from these) */}
      {ownedToys.filter((toy: any) => toy.isActivated && !pets?.some((pet: any) => pet.toyId === toy.id)).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{language === "id" ? "Mainan Aktif - Buat Hewan Peliharaan" : "Active Toys - Create Pets"}</CardTitle>
            <p className="text-sm text-gray-600">
              {language === "id" ? "Ubah mainan aktif menjadi hewan peliharaan virtual" : "Turn active toys into virtual pets"}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ownedToys.filter((toy: any) => toy.isActivated && !pets?.some((pet: any) => pet.toyId === toy.id)).map((toy: any) => (
                <Card key={toy.id} className="border-2 border-dashed border-green-300">
                  <CardContent className="p-4 text-center">
                    <div className="w-20 h-20 mx-auto mb-3 rounded-lg overflow-hidden">
                      <img 
                        src={toy.imageUrl} 
                        alt={toy.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjM3MzkxIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn6e4PC90ZXh0Pgo8L3N2Zz4=';
                        }}
                      />
                    </div>
                    <h4 className="font-semibold">{toy.name}</h4>
                    <p className="text-xs text-gray-500 mb-1">{toy.series}</p>
                    <div className="mb-3">
                      <Badge className="bg-green-100 text-green-800">
                        {language === "id" ? "Aktif" : "Active"}
                      </Badge>
                    </div>
                    <Button 
                      onClick={() => {
                        // Use the pet creation endpoint
                        fetch('/api/toys/activate', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ qrCode: toy.qrCode })
                        }).then(() => {
                          queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
                          toast({
                            title: language === "id" ? "Berhasil!" : "Success!",
                            description: language === "id" ? "Hewan peliharaan berhasil dibuat!" : "Pet successfully created!",
                          });
                        }).catch((error) => {
                          toast({
                            title: language === "id" ? "Error" : "Error", 
                            description: error.message || (language === "id" ? "Gagal membuat hewan peliharaan" : "Failed to create pet"),
                            variant: "destructive"
                          });
                        });
                      }}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      {language === "id" ? "Buat Pet" : "Create Pet"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pet Navigation */}
      {safePets.length > 1 && (
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
              Pet {currentPetIndex + 1} of {safePets.length}
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



      {safePets.length > 0 && safePets[currentPetIndex] && (
        <>
          {/* Pet Info */}
          <Card key={`pet-${safePets[currentPetIndex].id}-${safePets[currentPetIndex].hunger}-${safePets[currentPetIndex].happiness}-${safePets[currentPetIndex].cleanliness}-${safePets[currentPetIndex].energy}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">{safePets[currentPetIndex].name}</CardTitle>
                <Badge className={getGrowthStageInfo(safePets[currentPetIndex]?.growthStage || "baby").color}>
                  {getGrowthStageInfo(safePets[currentPetIndex]?.growthStage || "baby").label}
                </Badge>
              </div>
              <div className="mt-2 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    alert("Button clicked!");
                    setNewPetName(safePets[currentPetIndex].name);
                    setEditingPetName(safePets[currentPetIndex].id);
                  }}
                  className="bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200"
                >
                  ✏️ Edit Pet Name (5 tokens)
                </Button>
                
                {/* Fallback HTML button for testing */}
                <button
                  onClick={() => {
                    alert("HTML button works!");
                    setNewPetName(safePets[currentPetIndex].name);
                    setEditingPetName(safePets[currentPetIndex].id);
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f97316',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  🖊️ Test Edit Button
                </button>
              </div>
              <div className="space-y-1">
                <p className="text-gray-600">
                  Age: {safePets[currentPetIndex].currentAge} days • Type: {safePets[currentPetIndex].type}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Status:</span>
                  {(() => {
                    const currentPet = safePets[currentPetIndex];
                    const hunger = currentPet.hunger || 0;
                    const cleanliness = currentPet.cleanliness || 0;
                    const energy = currentPet.energy || 0;
                    const happiness = currentPet.happiness || 0;
                    
                    const lowestStat = Math.min(hunger, cleanliness, energy, happiness);
                    
                    let status = "Healthy";
                    let statusColor = "text-green-600 bg-green-50";
                    
                    if (lowestStat >= 0 && lowestStat <= 24) {
                      status = "Bad";
                      statusColor = "text-red-600 bg-red-50";
                    } else if (lowestStat >= 25 && lowestStat <= 49) {
                      status = "Good";
                      statusColor = "text-blue-600 bg-blue-50";
                    } else if (lowestStat >= 50 && lowestStat <= 74) {
                      status = "Great";
                      statusColor = "text-purple-600 bg-purple-50";
                    } else if (lowestStat >= 75) {
                      status = "Healthy";
                      statusColor = "text-green-600 bg-green-50";
                    }
                    
                    return (
                      <Badge className={`${statusColor} border-0`}>
                        {status}
                      </Badge>
                    );
                  })()}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2" key={`happiness-${safePets[currentPetIndex].id}-${safePets[currentPetIndex].happiness}-${Date.now()}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💖</span>
                      <span className="text-sm font-medium">Happiness</span>
                    </div>
                    <span 
                      className="text-lg font-bold" 
                      style={{ 
                        color: (safePets[currentPetIndex].happiness || 0) >= 75 ? '#10b981' :
                               (safePets[currentPetIndex].happiness || 0) >= 50 ? '#8b5cf6' :
                               (safePets[currentPetIndex].happiness || 0) >= 25 ? '#3b82f6' : '#ef4444'
                      }}
                    >
                      {safePets[currentPetIndex].happiness || 0}%
                    </span>
                  </div>
                  <div className="w-full h-6 bg-gray-200 rounded-full relative">
                    <div 
                      className="h-6 rounded-full flex items-center text-xs font-bold text-white"
                      style={{ 
                        backgroundColor: (safePets[currentPetIndex].happiness || 0) >= 75 ? '#10b981' :
                                        (safePets[currentPetIndex].happiness || 0) >= 50 ? '#8b5cf6' :
                                        (safePets[currentPetIndex].happiness || 0) >= 25 ? '#3b82f6' : '#ef4444',
                        width: `${Math.max(0, Math.min(100, safePets[currentPetIndex].happiness || 0))}%`,
                        minWidth: '20px'
                      }}
                    >
                      <span className="ml-2">💖 {safePets[currentPetIndex].happiness || 0}%</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2" key={`hunger-${safePets[currentPetIndex].id}-${safePets[currentPetIndex].hunger}-${Date.now()}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🍎</span>
                      <span className="text-sm font-medium">Hunger</span>
                    </div>
                    <span 
                      className="text-lg font-bold" 
                      style={{ 
                        color: (safePets[currentPetIndex].hunger || 0) >= 75 ? '#10b981' :
                               (safePets[currentPetIndex].hunger || 0) >= 50 ? '#8b5cf6' :
                               (safePets[currentPetIndex].hunger || 0) >= 25 ? '#3b82f6' : '#ef4444'
                      }}
                    >
                      {safePets[currentPetIndex].hunger || 0}%
                    </span>
                  </div>
                  <div className="w-full h-6 bg-gray-200 rounded-full relative">
                    <div 
                      className="h-6 rounded-full flex items-center text-xs font-bold text-white"
                      style={{ 
                        backgroundColor: (safePets[currentPetIndex].hunger || 0) >= 75 ? '#10b981' :
                                        (safePets[currentPetIndex].hunger || 0) >= 50 ? '#8b5cf6' :
                                        (safePets[currentPetIndex].hunger || 0) >= 25 ? '#3b82f6' : '#ef4444',
                        width: `${Math.max(0, Math.min(100, safePets[currentPetIndex].hunger || 0))}%`,
                        minWidth: '20px'
                      }}
                    >
                      <span className="ml-2">🍎 {safePets[currentPetIndex].hunger || 0}%</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2" key={`cleanliness-${safePets[currentPetIndex].id}-${safePets[currentPetIndex].cleanliness}-${Date.now()}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💧</span>
                      <span className="text-sm font-medium">Cleanliness</span>
                    </div>
                    <span 
                      className="text-lg font-bold" 
                      style={{ 
                        color: (safePets[currentPetIndex].cleanliness || 0) >= 75 ? '#10b981' :
                               (safePets[currentPetIndex].cleanliness || 0) >= 50 ? '#8b5cf6' :
                               (safePets[currentPetIndex].cleanliness || 0) >= 25 ? '#3b82f6' : '#ef4444'
                      }}
                    >
                      {safePets[currentPetIndex].cleanliness || 0}%
                    </span>
                  </div>
                  <div className="w-full h-6 bg-gray-200 rounded-full relative">
                    <div 
                      className="h-6 rounded-full flex items-center text-xs font-bold text-white"
                      style={{ 
                        backgroundColor: (safePets[currentPetIndex].cleanliness || 0) >= 75 ? '#10b981' :
                                        (safePets[currentPetIndex].cleanliness || 0) >= 50 ? '#8b5cf6' :
                                        (safePets[currentPetIndex].cleanliness || 0) >= 25 ? '#3b82f6' : '#ef4444',
                        width: `${Math.max(0, Math.min(100, safePets[currentPetIndex].cleanliness || 0))}%`,
                        minWidth: '20px'
                      }}
                    >
                      <span className="ml-2">💧 {safePets[currentPetIndex].cleanliness || 0}%</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2" key={`energy-${safePets[currentPetIndex].id}-${safePets[currentPetIndex].energy}-${Date.now()}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg ${safePets[currentPetIndex].energy >= 100 ? 'animate-bounce' : ''}`}>
                        ⚡
                      </span>
                      <span className="text-sm font-medium">Energy</span>
                      {safePets[currentPetIndex].isSleeping && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full animate-pulse">
                          💤 Charging
                        </span>
                      )}
                    </div>
                    <span 
                      className="text-lg font-bold" 
                      style={{ 
                        color: (safePets[currentPetIndex].energy || 0) >= 75 ? '#10b981' :
                               (safePets[currentPetIndex].energy || 0) >= 50 ? '#8b5cf6' :
                               (safePets[currentPetIndex].energy || 0) >= 25 ? '#3b82f6' : '#ef4444'
                      }}
                    >
                      {safePets[currentPetIndex].energy || 0}%
                    </span>
                  </div>
                  <div className="w-full h-6 bg-gray-200 rounded-full relative">
                    <div 
                      className="h-6 rounded-full flex items-center text-xs font-bold text-white"
                      style={{ 
                        backgroundColor: (safePets[currentPetIndex].energy || 0) >= 75 ? '#10b981' :
                                        (safePets[currentPetIndex].energy || 0) >= 50 ? '#8b5cf6' :
                                        (safePets[currentPetIndex].energy || 0) >= 25 ? '#3b82f6' : '#ef4444',
                        width: `${Math.max(0, Math.min(100, safePets[currentPetIndex].energy || 0))}%`,
                        minWidth: '20px'
                      }}
                    >
                      <span className="ml-2">⚡ {safePets[currentPetIndex].energy || 0}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">
                      {safePets[currentPetIndex].energy}%
                    </span>
                    {safePets[currentPetIndex].energy >= 100 && (
                      <span className="text-xs text-green-600 font-bold animate-bounce">
                        ✨ Full!
                      </span>
                    )}
                    {safePets[currentPetIndex].energy < 25 && (
                      <span className="text-xs text-red-600 font-bold animate-pulse">
                        ⚠️ Low
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily Care Activities */}
          <Card>
            <CardHeader>
              <CardTitle>{language === "id" ? "Aktivitas Perawatan Harian" : "Daily Care Activities"}</CardTitle>
              <p className="text-sm text-gray-600">
                {language === "id" ? "Selesaikan semua aktivitas untuk mendapatkan 1 token hari ini!" : "Complete all activities to earn 1 token today!"}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  onClick={() => careActivityMutation.mutate({ petId: safePets[currentPetIndex].id, careType: 'fed' })}
                  disabled={careActivityMutation.isPending || (safePets[currentPetIndex]?.energy === 0)}
                >
                  <span className="text-2xl">🍎</span>
                  <span className="text-sm">Feed</span>
                  {safePets[currentPetIndex]?.energy === 0 && <span className="text-xs text-red-500">No Energy</span>}
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  onClick={() => careActivityMutation.mutate({ petId: safePets[currentPetIndex].id, careType: 'bathed' })}
                  disabled={careActivityMutation.isPending || (safePets[currentPetIndex]?.energy === 0)}
                >
                  <span className="text-2xl">🛁</span>
                  <span className="text-sm">Bath</span>
                  {safePets[currentPetIndex]?.energy === 0 && <span className="text-xs text-red-500">No Energy</span>}
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  onClick={() => careActivityMutation.mutate({ petId: safePets[currentPetIndex].id, careType: 'cleaned' })}
                  disabled={careActivityMutation.isPending || (safePets[currentPetIndex]?.energy === 0)}
                >
                  <Sparkles className="w-6 h-6" />
                  <span className="text-sm">Play</span>
                  {safePets[currentPetIndex]?.energy === 0 && <span className="text-xs text-red-500">No Energy</span>}
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  onClick={() => careActivityMutation.mutate({ petId: safePets[currentPetIndex].id, careType: 'slept' })}
                  disabled={careActivityMutation.isPending}
                >
                  <Bed className="w-6 h-6" />
                  <span className="text-sm">Sleep</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2 bg-purple-50 border-purple-200"
                  onClick={() => energyPotionMutation.mutate({ petId: safePets[currentPetIndex].id })}
                  disabled={energyPotionMutation.isPending || (user?.tokens || 0) < 2}
                >
                  <span className="text-2xl">⚡</span>
                  <span className="text-sm">Energy</span>
                  <span className="text-xs">2 tokens</span>
                </Button>
              </div>





              {/* Sleep Timer Display - Real-time countdown - Always show if pet is sleeping */}
              {safePets[currentPetIndex]?.isSleeping && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-700 mb-2">
                      💤 {language === "id" ? "Pet Sedang Tidur" : "Pet is Sleeping"}
                    </div>
                    
                    {/* Real-time countdown timer */}
                    <div className="text-3xl font-mono text-blue-600 mb-2">
                      {sleepProgress?.nextEnergyIn ? (
                        (() => {
                          const nextEnergyMinutes = sleepProgress.nextEnergyIn;
                          const totalSecondsRemaining = Math.max(0, Math.floor(nextEnergyMinutes * 60));
                          const minutes = Math.floor(totalSecondsRemaining / 60);
                          const seconds = totalSecondsRemaining % 60;
                          return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                        })()
                      ) : "05:00"}
                    </div>
                    
                    <div className="text-sm text-blue-600 mb-2">
                      {language === "id" 
                        ? "Waktu hingga energi berikutnya"
                        : "Time until next energy boost"
                      }
                    </div>
                    
                    <div className="text-sm text-blue-600">
                      {language === "id" 
                        ? `Telah tidur selama ${formatSleepTime(sleepProgress.totalSleepTime || 0)}`
                        : `Sleeping for ${formatSleepTime(sleepProgress.totalSleepTime || 0)}`
                      }
                    </div>
                    
                    <div className="text-sm text-blue-600 mb-3">
                      {language === "id" ? "Energi akan pulih secara otomatis setiap 5 menit" : "Energy restores automatically every 5 minutes"}
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-3">
                      {language === "id" ? "Energi saat ini: " : "Current energy: "}
                      <span className="font-semibold text-blue-700">
                        {sleepProgress.currentEnergy || safePets[currentPetIndex]?.energy || 0}%
                      </span>
                    </div>
                    
                    {(sleepProgress.currentEnergy || safePets[currentPetIndex]?.energy || 0) >= 100 && (
                      <div className="text-green-600 font-semibold text-sm mb-2">
                        ✨ {language === "id" ? "Energi penuh! Bisa bangun sekarang" : "Energy full! Can wake up now"}
                      </div>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-blue-300 text-blue-700 hover:bg-blue-100"
                      onClick={() => wakeMutation.mutate(safePets[currentPetIndex].id)}
                      disabled={wakeMutation.isPending}
                    >
                      {language === "id" ? "Bangunkan Pet" : "Wake Pet"}
                    </Button>
                  </div>
                </div>
              )}



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

          {/* Token Eligibility Status */}
          <Card>
            <CardContent className="py-4">
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-600">
                  Current Tokens: {user?.loyaltyPoints || 0}
                </p>
                
                {/* 24-Hour Token System */}
                <div className="p-3 rounded-lg border">
                  <div className="text-sm font-medium mb-2">24-Hour Token System</div>
                  
                  <DailyTokenChecker 
                    petId={safePets[currentPetIndex]?.id} 
                    petName={safePets[currentPetIndex]?.name}
                    currentStats={{
                      happiness: safePets[currentPetIndex]?.happiness || 0,
                      hunger: safePets[currentPetIndex]?.hunger || 0,
                      cleanliness: safePets[currentPetIndex]?.cleanliness || 0,
                      energy: safePets[currentPetIndex]?.energy || 0
                    }}
                  />
                </div>
                
                <p className="text-xs text-gray-500">
                  Earn 1 token daily if ALL pet stats stay above 1% for 24 hours. If any stat drops to 0%, no token is earned.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}



    </div>
  );
}

function PurchaseVerificationSection({ language, user }: { language: string; user: any }) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationPage, setVerificationPage] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's payment verifications with pagination
  const { data: userVerificationsResponse, isLoading: verificationsLoading } = useQuery({
    queryKey: [`/api/payment-verifications?page=${verificationPage}&limit=10`],
    retry: false,
  });

  const userVerifications = userVerificationsResponse?.data || [];
  const verificationPagination = userVerificationsResponse?.pagination;

  // Calculate points based on amount (1 point per RP 1000)
  const calculatedPoints = Math.floor(parseFloat(amount || "0") / 1000);

  // Fetch user's payment verifications
  const { data: verifications = [], isLoading } = useQuery({
    queryKey: ['/api/payment-verifications'],
  });

  const submitMutation = useMutation({
    mutationFn: async (data: { amount: string; description: string; receiptImageUrl: string }) => {
      console.log('Submitting payment verification with data:', data);
      return apiRequest('POST', '/api/payment-verifications', data);
    },
    onSuccess: () => {
      toast({
        title: language === "id" ? "Berhasil" : "Success",
        description: language === "id" ? "Verifikasi pembelian berhasil dikirim" : "Purchase verification submitted successfully",
      });
      setAmount("");
      setDescription("");
      setReceiptImage(null);
      setImagePreview(null);
      setIsSubmitting(false);
      queryClient.invalidateQueries({ queryKey: ['/api/payment-verifications'] });
    },
    onError: (error: any) => {
      console.log('Payment verification submission error:', error);
      
      // Check for authentication error
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        toast({
          title: language === "id" ? "Sesi Berakhir" : "Session Expired",
          description: language === "id" ? "Silakan login ulang" : "Please log in again",
          variant: "destructive",
        });
        // Redirect to login after a delay
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1500);
        return;
      }
      
      toast({
        title: language === "id" ? "Gagal" : "Error",
        description: error.message || (language === "id" ? "Gagal mengirim verifikasi" : "Failed to submit verification"),
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: language === "id" ? "File Terlalu Besar" : "File Too Large",
          description: language === "id" ? "Ukuran maksimal 10MB" : "Maximum file size is 10MB",
          variant: "destructive",
        });
        return;
      }
      setReceiptImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
      credentials: 'include', // Include session cookies for authentication
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Image upload failed:', response.status, errorText);
      throw new Error(`Failed to upload image: ${response.status}`);
    }
    
    const data = await response.json();
    return data.imageUrl;
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    
    console.log('Form submit triggered:', {
      amount,
      description,
      receiptImage: !!receiptImage,
      isSubmitting
    });
    
    if (!amount || !description || !receiptImage) {
      console.log('Validation failed:', { amount: !!amount, description: !!description, receiptImage: !!receiptImage });
      toast({
        title: language === "id" ? "Data Tidak Lengkap" : "Incomplete Data",
        description: language === "id" ? "Mohon isi semua field dan upload bukti pembayaran" : "Please fill all fields, select service category, and upload receipt image",
        variant: "destructive",
      });
      return;
    }

    if (isSubmitting) {
      console.log('Already submitting, preventing duplicate submission');
      return;
    }

    console.log('Starting form submission...');
    setIsSubmitting(true);
    
    try {
      // Upload image first
      let imageUrl;
      try {
        console.log('Attempting image upload...');
        imageUrl = await uploadImage(receiptImage);
        console.log('Image upload successful:', imageUrl);
      } catch (uploadError) {
        console.log('Image upload failed, using base64 fallback:', uploadError);
        // Fallback to base64 data URL if upload fails
        const reader = new FileReader();
        imageUrl = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(receiptImage);
        });

      }
      
      const submissionData = {
        amount: parseFloat(amount).toFixed(2),
        description: description,
        receiptImageUrl: imageUrl,
      };
      
      // Use the mutation directly instead of mutateAsync
      submitMutation.mutate(submissionData);
    } catch (error) {
      console.error('Error in form submission process:', error);
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Gagal mengirim verifikasi" : "Failed to submit verification",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return language === "id" ? "Disetujui" : "Approved";
      case 'rejected': return language === "id" ? "Ditolak" : "Rejected";
      default: return language === "id" ? "Menunggu" : "Pending";
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">
          {language === "id" ? "Verifikasi Pembelian" : "Purchase Verification"}
        </h2>
        <p className="text-slate-600">
          {language === "id" 
            ? "Upload bukti pembelian untuk mendapatkan poin loyalitas" 
            : "Upload purchase receipts to earn loyalty points"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Purchase Calculator & Upload Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              {language === "id" ? "Kalkulator Poin" : "Points Calculator"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === "id" ? "Jumlah Pembelian (RP)" : "Purchase Amount (RP)"}
                </label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="text-lg"
                />
                {amount && (
                  <p className="text-sm text-blue-600 mt-1">
                    {language === "id" ? "Poin yang akan diperoleh: " : "Points to earn: "}
                    <span className="font-bold">{calculatedPoints} poin</span>
                  </p>
                )}
              </div>

              {/* Service Category */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === "id" ? "Kategori Layanan" : "Service Category"}
                </label>
                <Select value={description} onValueChange={setDescription}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === "id" ? "Pilih kategori layanan" : "Select service category"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KTV Level 1">KTV Level 1</SelectItem>
                    <SelectItem value="KTV Level 2">KTV Level 2</SelectItem>
                    <SelectItem value="KTV VIP">KTV VIP</SelectItem>
                    <SelectItem value="Sky Bar">Sky Bar</SelectItem>
                    <SelectItem value="Beauty Spa">Beauty Spa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === "id" ? "Upload Bukti Pembayaran" : "Upload Receipt Image"}
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {imagePreview ? (
                    <div className="space-y-4">
                      <img 
                        src={imagePreview} 
                        alt="Receipt preview" 
                        className="max-w-full h-32 object-contain mx-auto rounded"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setReceiptImage(null);
                          setImagePreview(null);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {language === "id" ? "Hapus" : "Remove"}
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Camera className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600 mb-4">
                        {language === "id" 
                          ? "Klik untuk upload bukti pembayaran" 
                          : "Click to upload receipt image"}
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="receipt-upload"
                      />
                      <label
                        htmlFor="receipt-upload"
                        className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        {language === "id" ? "Pilih File" : "Choose File"}
                      </label>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {language === "id" 
                    ? "Format: JPG, PNG, maksimal 10MB" 
                    : "Supported: JPG, PNG, max 10MB"}
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="button"
                onClick={handleSubmit}
                className="w-full"
                disabled={isSubmitting || !amount || !description || !receiptImage}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    {language === "id" ? "Mengirim..." : "Submitting..."}
                  </div>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    {language === "id" ? "Kirim Verifikasi" : "Submit Verification"}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Verification History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {language === "id" ? "Riwayat Verifikasi" : "Verification History"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {verificationsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse bg-gray-200 h-20 rounded" />
                ))}
              </div>
            ) : userVerifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{language === "id" ? "Belum ada verifikasi" : "No verifications yet"}</p>
                <p className="text-sm mt-2">
                  {language === "id" 
                    ? "Upload bukti pembelian untuk memulai" 
                    : "Upload purchase receipts to get started"}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {userVerifications.map((verification: any) => (
                    <div key={verification.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">RP {parseFloat(verification.amount).toLocaleString('id-ID')}</p>
                          <p className="text-sm text-gray-600">{verification.description}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(verification.createdAt).toLocaleDateString(language === "id" ? "id-ID" : "en-US")}
                            {" "} {new Date(verification.createdAt).toLocaleTimeString(language === "id" ? "id-ID" : "en-US", { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <Badge className={getStatusColor(verification.status)}>
                          {getStatusText(verification.status)}
                        </Badge>
                      </div>
                      
                      {verification.status === 'approved' && verification.pointsAwarded && (
                        <div className="bg-green-50 rounded p-2 mt-2">
                          <p className="text-sm text-green-800">
                            <Star className="w-4 h-4 inline mr-1" />
                            {language === "id" ? "Poin diperoleh: " : "Points earned: "}
                            <span className="font-bold">{verification.pointsAwarded}</span>
                          </p>
                        </div>
                      )}
                      
                      {verification.adminNotes && (
                        <div className="bg-blue-50 rounded p-2 mt-2">
                          <p className="text-sm text-blue-800">
                            <AlertTriangle className="w-4 h-4 inline mr-1" />
                            {language === "id" ? "Catatan admin: " : "Admin notes: "}
                            {verification.adminNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* 10x10 Pagination Controls */}
                {verificationPagination && verificationPagination.totalPages > 1 && (
                  <div className="flex justify-center items-center mt-6 space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVerificationPage(Math.max(1, verificationPage - 1))}
                      disabled={verificationPage === 1}
                    >
                      {language === "id" ? "Sebelumnya" : "Previous"}
                    </Button>
                    
                    <div className="flex space-x-1">
                      {Array.from({ 
                        length: Math.min(10, verificationPagination.totalPages)
                      }, (_, i) => {
                        const totalPages = verificationPagination.totalPages;
                        const currentPage = verificationPage;
                        const maxPagesToShow = 10;
                        
                        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
                        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
                        
                        if (endPage - startPage + 1 < maxPagesToShow) {
                          startPage = Math.max(1, endPage - maxPagesToShow + 1);
                        }
                        
                        const pageNumber = startPage + i;
                        if (pageNumber > endPage) return null;
                        
                        return (
                          <Button
                            key={pageNumber}
                            variant={pageNumber === verificationPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => setVerificationPage(pageNumber)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNumber}
                          </Button>
                        );
                      }).filter(Boolean)}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVerificationPage(Math.min(verificationPagination.totalPages, verificationPage + 1))}
                      disabled={verificationPage === verificationPagination.totalPages}
                    >
                      {language === "id" ? "Selanjutnya" : "Next"}
                    </Button>
                  </div>
                )}
                
                {/* Pagination Info */}
                {verificationPagination && (
                  <div className="mt-2 text-center text-sm text-gray-500">
                    {language === "id" ? "Menampilkan" : "Showing"} {((verificationPage - 1) * 10) + 1} 
                    {language === "id" ? " sampai " : " to "} {Math.min(verificationPage * 10, verificationPagination.total || 0)} 
                    {language === "id" ? " dari " : " of "} {verificationPagination.total || 0} 
                    {language === "id" ? " verifikasi" : " verifications"}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CompleteApp() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pet-care");
  
  // State for pending purchases and confirmations
  const [pendingPurchases, setPendingPurchases] = useState([]);
  
  // History modal states
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [modalHistoryFilter, setModalHistoryFilter] = useState<'points' | 'credits' | 'tokens' | 'appointments' | 'redemptions'>('tokens');
  const [modalHistoryPage, setModalHistoryPage] = useState(1);
  const [creditHistoryPage, setCreditHistoryPage] = useState(1);
  const [pointsHistoryPage, setPointsHistoryPage] = useState(1);
  const [redemptionHistoryPage, setRedemptionHistoryPage] = useState(1);
  const [appointmentsPage, setAppointmentsPage] = useState(1);
  const [marketplacePage, setMarketplacePage] = useState(1);
  const [toyInventoryPage, setToyInventoryPage] = useState(1);
  const [verificationPage, setVerificationPage] = useState(1);
  const [modalDateFilterStart, setModalDateFilterStart] = useState("");
  const [modalDateFilterEnd, setModalDateFilterEnd] = useState("");
  const [modalStatusFilter, setModalStatusFilter] = useState("all");
  
  // Global error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Prevent Vite HMR connection errors from showing in console
      if (event.reason && typeof event.reason === 'object' && 
          (event.reason.message?.includes('vite') || 
           event.reason.toString().includes('WebSocket') ||
           event.reason.toString().includes('connection'))) {
        event.preventDefault();
        return;
      }
      
      // Allow other genuine errors to show
      console.warn('Unhandled promise rejection:', event.reason);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Real-time data updates via frequent polling for stable performance
  
  // User data - fetch from database with real-time updates
  const { data: userStats, refetch: refetchUserStats } = useQuery({
    queryKey: ['/api/user-stats'],
    enabled: !!user?.id,
    refetchInterval: 5000, // Update every 5 seconds for real-time data
    refetchOnWindowFocus: true,
  });

  // Genealogy tree data
  const { data: genealogyData } = useQuery({
    queryKey: ['/api/users/genealogy-tree'],
    enabled: !!user?.id,
  });

  const userCredits = userStats ? parseFloat(userStats.credits) : 0;
  const loyaltyPoints = userStats?.loyaltyPoints || 0;
  const lifetimePoints = userStats?.lifetimePoints || 0;
  const referralEarnings = userStats?.referralEarnings || 0;
  const userTokens = userStats?.tokens || 0;
  
  // Use real appointments and rewards from database
  const userAppointments = userStats?.appointments || [];
  const pointRedemptions = userStats?.pointRedemptions || [];
  const userReferrals = userStats?.referrals || [];

  const [language, setLanguage] = useState("en");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "+62 812-3456-7890");
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [gender, setGender] = useState(user?.gender || "");
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : "");
  const [profileImage, setProfileImage] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showCreditTopUpModal, setShowCreditTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [newToyCode, setNewToyCode] = useState("");
  const [newListingTitle, setNewListingTitle] = useState("");
  const [showTokenClaimModal, setShowTokenClaimModal] = useState(false);
  const [tokenClaimAmount, setTokenClaimAmount] = useState("");

  // 5-Level Loyalty Program System
  const loyaltyLevels = [
    { 
      level: 1, 
      minPoints: 0, 
      maxPoints: 499, 
      discount: 0, 
      name: language === "id" ? "Perunggu" : "Bronze",
      color: "from-orange-600 to-amber-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      icon: Award,
      benefits: [
        language === "id" ? "Akses ke platform" : "Platform access",
        language === "id" ? "Program referral dasar" : "Basic referral program"
      ]
    },
    { 
      level: 2, 
      minPoints: 500, 
      maxPoints: 24999, 
      discount: 2, 
      name: language === "id" ? "Perak" : "Silver",
      color: "from-gray-500 to-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      icon: Medal,
      benefits: [
        language === "id" ? "Diskon 2% semua layanan" : "2% discount on all services",
        language === "id" ? "Prioritas booking" : "Priority booking",
        language === "id" ? "Bonus poin referral" : "Bonus referral points"
      ]
    },
    { 
      level: 3, 
      minPoints: 25000, 
      maxPoints: 249999, 
      discount: 4, 
      name: language === "id" ? "Emas" : "Gold",
      color: "from-yellow-500 to-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      icon: Star,
      benefits: [
        language === "id" ? "Diskon 4% semua layanan" : "4% discount on all services",
        language === "id" ? "Akses layanan eksklusif" : "Exclusive service access",
        language === "id" ? "Dukungan prioritas" : "Priority support",
        language === "id" ? "Hadiah ulang tahun" : "Birthday rewards"
      ]
    },
    { 
      level: 4, 
      minPoints: 250000, 
      maxPoints: 999999, 
      discount: 6, 
      name: language === "id" ? "Platinum" : "Platinum",
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      icon: Crown,
      benefits: [
        language === "id" ? "Diskon 6% semua layanan" : "6% discount on all services",
        language === "id" ? "Akses VIP room" : "VIP room access",
        language === "id" ? "Personal account manager" : "Personal account manager",
        language === "id" ? "Upgrade gratis" : "Free upgrades",
        language === "id" ? "Event eksklusif" : "Exclusive events"
      ]
    },
    { 
      level: 5, 
      minPoints: 1000000, 
      maxPoints: Infinity, 
      discount: 10, 
      name: language === "id" ? "Berlian" : "Diamond",
      color: "from-blue-600 to-indigo-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      icon: Trophy,
      benefits: [
        language === "id" ? "Diskon 10% semua layanan" : "10% discount on all services",
        language === "id" ? "Layanan concierge pribadi" : "Personal concierge service",
        language === "id" ? "Akses unlimited ke semua fasilitas" : "Unlimited access to all facilities",
        language === "id" ? "Undangan acara VIP" : "VIP event invitations",
        language === "id" ? "Hadiah tahunan eksklusif" : "Exclusive annual gifts"
      ]
    }
  ];

  const getLoyaltyLevel = (points) => {
    return loyaltyLevels.find(level => points >= level.minPoints && points <= level.maxPoints) || loyaltyLevels[0];
  };

  const getNextLoyaltyLevel = (currentLevel) => {
    return loyaltyLevels.find(level => level.level === currentLevel.level + 1);
  };

  const currentLoyaltyLevel = getLoyaltyLevel(lifetimePoints);
  const nextLoyaltyLevel = getNextLoyaltyLevel(currentLoyaltyLevel);
  
  const loyaltyPointsToNext = nextLoyaltyLevel ? nextLoyaltyLevel.minPoints - lifetimePoints : 0;
  const loyaltyProgress = nextLoyaltyLevel ? 
    Math.min(100, ((lifetimePoints - currentLoyaltyLevel.minPoints) / (nextLoyaltyLevel.minPoints - currentLoyaltyLevel.minPoints)) * 100) : 100;
  
  // Achievement system state
  const [showAchievement, setShowAchievement] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState(null);
  const [achievementQueue, setAchievementQueue] = useState([]);
  
  // All achievement milestones
  const allAchievements = [
    // Referral Achievements (50 points each + 150 bonus every 5)
    {
      id: "referral_1",
      type: "referral",
      count: 1,
      title: language === "id" ? "Pengundang Pertama" : "First Inviter",
      description: language === "id" ? "Undang teman pertama Anda!" : "Invite your first friend!",
      reward: language === "id" ? "50 Poin" : "50 Points",
      icon: Users,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    },
    {
      id: "referral_5",
      type: "referral",
      count: 5,
      title: language === "id" ? "Kupu-kupu Sosial" : "Social Butterfly",
      description: language === "id" ? "Undang 5 teman bergabung!" : "Invite 5 friends to join!",
      reward: language === "id" ? "250 Poin + 150 Bonus" : "250 Points + 150 Bonus",
      icon: Star,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200"
    },
    {
      id: "referral_10",
      type: "referral",
      count: 10,
      title: language === "id" ? "Pembangun Jaringan" : "Network Builder",
      description: language === "id" ? "Bangun jaringan 10 referral!" : "Build a network of 10 referrals!",
      reward: language === "id" ? "500 Poin + 300 Bonus" : "500 Points + 300 Bonus",
      icon: Trophy,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200"
    },
    {
      id: "referral_15",
      type: "referral",
      count: 15,
      title: language === "id" ? "Agen Aktif" : "Active Agent",
      description: language === "id" ? "Capai 15 referral aktif!" : "Reach 15 active referrals!",
      reward: language === "id" ? "750 Poin + 450 Bonus" : "750 Points + 450 Bonus",
      icon: UserCheck,
      color: "from-indigo-500 to-indigo-600",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200"
    },
    {
      id: "referral_20",
      type: "referral",
      count: 20,
      title: language === "id" ? "Juara Rujukan" : "Referral Champion",
      description: language === "id" ? "Mencapai 20 undangan sukses!" : "Achieve 20 successful invites!",
      reward: language === "id" ? "1,000 Poin + 600 Bonus" : "1,000 Points + 600 Bonus",
      icon: Crown,
      color: "from-yellow-500 to-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200"
    },
    {
      id: "referral_25",
      type: "referral",
      count: 25,
      title: language === "id" ? "Master Networker" : "Master Networker",
      description: language === "id" ? "Raja undangan dengan 25 rujukan!" : "Invitation king with 25 referrals!",
      reward: language === "id" ? "1,250 Poin + 750 Bonus" : "1,250 Points + 750 Bonus",
      icon: Award,
      color: "from-pink-500 to-pink-600",
      bgColor: "bg-pink-50",
      borderColor: "border-pink-200"
    },
    {
      id: "referral_50",
      type: "referral",
      count: 50,
      title: language === "id" ? "Duta Legendaris" : "Legendary Ambassador",
      description: language === "id" ? "Status legendaris dengan 50 rujukan!" : "Legendary status with 50 referrals!",
      reward: language === "id" ? "2,500 Poin + 1,500 Bonus" : "2,500 Points + 1,500 Bonus",
      icon: Medal,
      color: "from-purple-600 to-pink-600",
      bgColor: "bg-gradient-to-r from-purple-50 to-pink-50",
      borderColor: "border-gradient-to-r from-purple-200 to-pink-200"
    },
    // Spending Achievement
    {
      id: "spending_milestone",
      type: "spending",
      count: 5,
      title: language === "id" ? "Mentor Belanja" : "Shopping Mentor",
      description: language === "id" ? "5 referral Anda menghabiskan 10,000,000 RP masing-masing" : "5 of your referrals spend 10,000,000 RP each",
      reward: language === "id" ? "100 Poin Bonus" : "100 Bonus Points",
      icon: DollarSign,
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200"
    }
  ];

  // Achievement tracking functions
  const checkReferralAchievements = (referralCount) => {
    const seenAchievements = JSON.parse(localStorage.getItem('seenAchievements') || '[]');
    const newAchievements = [];
    
    allAchievements.filter(achievement => achievement.type === 'referral').forEach(milestone => {
      if (referralCount === milestone.count && !seenAchievements.includes(milestone.id)) {
        newAchievements.push(milestone);
      }
    });
    
    if (newAchievements.length > 0) {
      setAchievementQueue(prev => [...prev, ...newAchievements]);
    }
  };

  const showNextAchievement = () => {
    if (achievementQueue.length > 0 && !showAchievement) {
      const nextAchievement = achievementQueue[0];
      setCurrentAchievement(nextAchievement);
      setShowAchievement(true);
      setAchievementQueue(prev => prev.slice(1));
    }
  };

  const closeAchievement = () => {
    if (currentAchievement) {
      // Mark achievement as seen in localStorage
      const seenAchievements = JSON.parse(localStorage.getItem('seenAchievements') || '[]');
      seenAchievements.push(currentAchievement.id);
      localStorage.setItem('seenAchievements', JSON.stringify(seenAchievements));
    }
    
    setShowAchievement(false);
    setCurrentAchievement(null);
    // Show next achievement after a delay
    setTimeout(() => {
      showNextAchievement();
    }, 500);
  };

  // Watch for referral count changes
  useEffect(() => {
    if (userReferrals.length > 0) {
      checkReferralAchievements(userReferrals.length);
    }
  }, [userReferrals.length]);

  // Process achievement queue
  useEffect(() => {
    showNextAchievement();
  }, [achievementQueue]);

  // Show achievement rules instead of pop-ups
  const [showAchievementRules, setShowAchievementRules] = useState(false);
  
  const toggleAchievementRules = () => {
    setShowAchievementRules(!showAchievementRules);
  };

  // Reset achievement tracking for testing
  const resetAchievements = () => {
    localStorage.removeItem('seenAchievements');
    toast({
      title: language === "id" ? "Reset Berhasil" : "Reset Successful",
      description: language === "id" ? "Tracking pencapaian telah direset" : "Achievement tracking has been reset",
    });
  };
  
  const [showPurchaseConfirmation, setShowPurchaseConfirmation] = useState(false);
  const [selectedPurchaseListing, setSelectedPurchaseListing] = useState(null);
  const [newListingPrice, setNewListingPrice] = useState("");
  const [newListingDescription, setNewListingDescription] = useState("");
  const [selectedToyForSale, setSelectedToyForSale] = useState(null);
  const [showCreateListingModal, setShowCreateListingModal] = useState(false);
  const referralCode = "RWG8H4K2";

  // Cash-out states
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [showCreditHistory, setShowCreditHistory] = useState(false);
  const [cashOutAmount, setCashOutAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");

  
  // Reward redemption confirmation states
  const [showRedeemConfirmation, setShowRedeemConfirmation] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  
  // Indonesian banks with account validation
  const indonesianBanks = [
    { code: "BCA", name: "Bank Central Asia (BCA)", minDigits: 10, maxDigits: 10, icon: "🏦" },
    { code: "BNI", name: "Bank Negara Indonesia (BNI)", minDigits: 10, maxDigits: 10, icon: "🏦" },
    { code: "BRI", name: "Bank Rakyat Indonesia (BRI)", minDigits: 15, maxDigits: 15, icon: "🏦" },
    { code: "MANDIRI", name: "Bank Mandiri", minDigits: 13, maxDigits: 13, icon: "🏦" },
    { code: "CIMB", name: "CIMB Niaga", minDigits: 13, maxDigits: 14, icon: "🏦" },
    { code: "DANAMON", name: "Bank Danamon", minDigits: 10, maxDigits: 10, icon: "🏦" },
    { code: "PERMATA", name: "Bank Permata", minDigits: 10, maxDigits: 10, icon: "🏦" },
    { code: "BTPN", name: "Bank BTPN", minDigits: 10, maxDigits: 10, icon: "🏦" },
    { code: "OCBC", name: "OCBC NISP", minDigits: 12, maxDigits: 12, icon: "🏦" },
    { code: "MAYBANK", name: "Maybank Indonesia", minDigits: 12, maxDigits: 12, icon: "🏦" },
    { code: "BSI", name: "Bank Syariah Indonesia (BSI)", minDigits: 10, maxDigits: 10, icon: "🕌" },
    { code: "GOPAY", name: "GoPay", minDigits: 10, maxDigits: 13, icon: "📱" },
    { code: "OVO", name: "OVO", minDigits: 10, maxDigits: 13, icon: "📱" },
    { code: "DANA", name: "DANA", minDigits: 10, maxDigits: 13, icon: "📱" },
    { code: "SHOPEEPAY", name: "ShopeePay", minDigits: 10, maxDigits: 13, icon: "🛒" }
  ];

  // Format currency
  const formatRupiah = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace(/\./g, ',');
  };

  // Fetch appointment events from database
  const { data: appointmentEvents } = useQuery({
    queryKey: ['/api/appointment-events']
  });

  // Transform appointment events into service categories format
  const serviceCategories = useMemo(() => {
    if (!appointmentEvents || !Array.isArray(appointmentEvents)) {
      return {};
    }

    const categories = {};
    
    appointmentEvents
      .filter(event => event.isActive)
      .forEach(event => {
        if (!categories[event.category]) {
          categories[event.category] = {
            name: event.category === 'beauty' 
              ? (language === "id" ? "Layanan Kecantikan" : "Beauty Services")
              : event.category === 'entertainment'
              ? (language === "id" ? "Hiburan" : "Entertainment") 
              : event.category === 'restaurant'
              ? (language === "id" ? "Kafe & Restoran" : "Cafe & Restaurant")
              : event.category.charAt(0).toUpperCase() + event.category.slice(1), // Use custom category name as-is
            options: [],
            startingPrice: "0"
          };
        }
        
        categories[event.category].options.push({
          value: event.title.toLowerCase().replace(/\s+/g, '_'),
          label: event.title,
          cost: 0 // Flexible pricing - will be determined during booking
        });
      });

    return categories;
  }, [appointmentEvents, language]);

  // Appointments
  const [appointments, setAppointments] = useState([
    { id: 1, service: "Hair Spa", category: "beauty", date: "2025-05-30", time: "14:00", status: "confirmed", cost: 200000 },
    { id: 2, service: "KTV Room 1", category: "entertainment", date: "2025-06-02", time: "19:00", status: "pending", cost: 500000 }
  ]);

  const [newAppointment, setNewAppointment] = useState({
    category: "",
    service: "",
    date: "",
    time: ""
  });
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);

  // Check for booking conflicts when date and service change
  useEffect(() => {
    const checkAvailability = async () => {
      if (newAppointment.date && newAppointment.service) {
        try {
          const selectedCategory = serviceCategories[newAppointment.category];
          const selectedService = selectedCategory?.options.find(opt => opt.value === newAppointment.service);
          
          if (selectedService) {
            const response = await fetch(
              `/api/appointments/availability?date=${newAppointment.date}&service=${encodeURIComponent(selectedService.label)}`
            );
            
            if (response.ok) {
              const data = await response.json();
              setBookedTimes(data.bookedTimes || []);
            }
          }
        } catch (error) {
          console.error('Error checking availability:', error);
        }
      } else {
        setBookedTimes([]);
      }
    };

    checkAvailability();
  }, [newAppointment.date, newAppointment.service, newAppointment.category]);

  const [editingAppointment, setEditingAppointment] = useState(null);

  // Fetch promotion banners from content management system
  const { data: promotionBanners = [] } = useQuery({
    queryKey: ['/api/promotion-banners'],
    queryFn: async () => {
      const response = await fetch('/api/promotion-banners', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch promotion banners');
      return response.json();
    }
  });

  // Filter and sort active banners for display
  const activePromotionBanners = promotionBanners
    .filter((banner: any) => banner.isActive)
    .sort((a: any, b: any) => a.displayOrder - b.displayOrder);

  // Remove this old marketplace array - we only use marketplaceToys now

  // Global toy database (all toys from all users)
  const [allGlobalToys, setAllGlobalToys] = useState(() => {
    const savedGlobalToys = localStorage.getItem('allGlobalToys');
    if (savedGlobalToys) {
      return JSON.parse(savedGlobalToys);
    }
    // Initialize with all users' toys
    const allUserToys = [];
    // Get all user toy data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('userToys_')) {
        const userToys = JSON.parse(localStorage.getItem(key) || '[]');
        const userId = key.replace('userToys_', '');
        userToys.forEach(toy => {
          allUserToys.push({
            ...toy,
            ownerId: userId
          });
        });
      }
    }
    localStorage.setItem('allGlobalToys', JSON.stringify(allUserToys));
    return allUserToys;
  });

  // Remove localStorage usage - marketplace now uses database only
  
  // Fetch credit transaction history from database
  const { data: transactionHistory = [] } = useQuery({
    queryKey: ['/api/credit-history'],
    enabled: !!user,
  });

  // Fetch user's toy inventory from database
  const { data: toyInventory = [], isLoading: toysLoading } = useQuery({
    queryKey: ['/api/toys'],
    enabled: !!user,
  });

  // Fetch all marketplace listings from database
  const { data: marketplaceListings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ['/api/listings'],
    enabled: !!user,
  });

  // Mutation to create new toy
  const createToyMutation = useMutation({
    mutationFn: (toyData: any) => apiRequest('POST', '/api/toys', toyData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/toys'] });
      toast({
        title: "Success!",
        description: "New toy added to your collection!",
      });
    },
  });

  // Mutation to create marketplace listing
  const createListingMutation = useMutation({
    mutationFn: (listingData: any) => apiRequest('POST', '/api/listings', listingData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/toys'] });
      toast({
        title: "Success!",
        description: "Your toy has been listed in the marketplace!",
      });
    },
  });

  // Mutation to update toy ownership
  const updateToyOwnerMutation = useMutation({
    mutationFn: ({ toyId, newOwnerId }: any) => apiRequest('PUT', `/api/toys/${toyId}/owner`, { newOwnerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/toys'] });
    },
  });

  // Mutation to update listing status
  const updateListingStatusMutation = useMutation({
    mutationFn: ({ id, status }: any) => apiRequest('PUT', `/api/listings/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
    },
  });

  // Mutation to create pending purchase
  const createPendingPurchaseMutation = useMutation({
    mutationFn: (purchaseData: any) => apiRequest('POST', '/api/pending-purchases', purchaseData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pending-purchases'] });
    },
  });

  // Mutation to confirm pending purchase
  const confirmPurchaseMutation = useMutation({
    mutationFn: (purchaseId: number) => apiRequest('POST', `/api/pending-purchases/${purchaseId}/buyer-confirm`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pending-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
    },
  });

  // Mutation to claim tokens
  const claimTokensMutation = useMutation({
    mutationFn: (tokenData: { tokensRequested: number }) => apiRequest('POST', '/api/token-claims', tokenData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
      setShowTokenClaimModal(false);
      setTokenClaimAmount("");
      toast({
        title: language === "id" ? "Berhasil!" : "Success!",
        description: language === "id" ? "Permintaan klaim token berhasil diajukan!" : "Token claim request submitted successfully!",
      });
    },
    onError: () => {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Gagal mengajukan klaim token" : "Failed to submit token claim",
        variant: "destructive",
      });
    },
  });

  // Fetch pending purchases for current user (both buyer and seller)
  const { data: userPendingPurchases } = useQuery({
    queryKey: ['/api/pending-purchases'],
    enabled: !!user?.id,
    queryFn: async () => {
      console.log("*** FRONTEND: Making API call to fetch pending purchases");
      const response = await fetch('/api/pending-purchases', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.log("*** FRONTEND: API call failed with status:", response.status);
        throw new Error('Failed to fetch pending purchases');
      }
      
      const data = await response.json();
      console.log("*** FRONTEND: Received data:", data);
      return data;
    }
  });

  // Fetch user's token claim history
  const { data: tokenClaimsData = [], isLoading: tokenHistoryLoading, error: tokenHistoryError } = useQuery({
    queryKey: ['/api/tokens/history'],
    enabled: !!user?.id,
    retry: 3,
  });
  

  
  const tokenClaimsHistory = tokenClaimsData || [];

  // Fetch cash-out history
  const { data: cashOutHistoryData = [] } = useQuery({
    queryKey: ['/api/cashout/history'],
    enabled: !!user?.id,
  });
  
  const cashOutHistory = cashOutHistoryData || [];

  // Mutation to create credit history entry
  const createCreditHistoryMutation = useMutation({
    mutationFn: (creditData: any) => apiRequest('POST', '/api/credit-history', creditData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/credit-history'] });
    },
  });

  // Mutation to create points history entry
  const createPointsHistoryMutation = useMutation({
    mutationFn: (pointsData: any) => apiRequest('POST', '/api/points-history', pointsData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/points-history'] });
    },
  });

  // Filter and sorting states
  const [pointsFilter, setPointsFilter] = useState<'all' | 'earned' | 'redeemed'>('all');
  const [pointsDateFilter, setPointsDateFilter] = useState('');
  const [appointmentsFilter, setAppointmentsFilter] = useState<'all' | 'pending' | 'scheduled' | 'completed' | 'cancelled'>('all');
  const [appointmentsDateFilter, setAppointmentsDateFilter] = useState('');
  const [creditFilter, setCreditFilter] = useState<'all' | 'earned' | 'spent'>('all');
  const [creditDateFilter, setCreditDateFilter] = useState('');

  // History management states
  const [historyFilter, setHistoryFilter] = useState<'points' | 'credits' | 'tokens' | 'appointments' | 'redemptions'>('points');
  const [historyPage, setHistoryPage] = useState(1);
  const [dateFilterStart, setDateFilterStart] = useState('');
  const [dateFilterEnd, setDateFilterEnd] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Get points history from user stats and sort by newest first
  const allPointHistory = userStats?.pointRedemptions || [];
  const sortedPointHistory = [...allPointHistory].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Filter points history
  const filteredPointHistory = sortedPointHistory.filter(entry => {
    const typeMatch = pointsFilter === 'all' || entry.type === pointsFilter;
    const dateMatch = !pointsDateFilter || 
      new Date(entry.createdAt).toISOString().split('T')[0] === pointsDateFilter;
    return typeMatch && dateMatch;
  });

  // Get appointments from user stats and sort by newest first
  const allAppointments = userStats?.appointments || [];
  const sortedAppointments = [...allAppointments].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Filter appointments
  const filteredAppointments = sortedAppointments.filter(appointment => {
    const statusMatch = appointmentsFilter === 'all' || appointment.status === appointmentsFilter;
    const dateMatch = !appointmentsDateFilter || 
      new Date(appointment.createdAt).toISOString().split('T')[0] === appointmentsDateFilter;
    return statusMatch && dateMatch;
  });

  // Fetch credit history from database
  const { data: creditHistoryData = [] } = useQuery({
    queryKey: [`/api/credit-history/${user?.id}`],
    enabled: !!user?.id,
    retry: false,
  });

  // Create credit history from various sources and sort by newest first
  const allCreditHistory = [
    // From completed purchases (both buying and selling)
    ...(userPendingPurchases || []).filter((p: any) => p.status === 'completed').map((p: any) => ({
      id: `purchase-${p.id}`,
      description: p.buyerId === user?.id 
        ? `Purchase - ${p.toy?.name}` 
        : `Sale - ${p.toy?.name}`,
      amount: p.buyerId === user?.id 
        ? -parseFloat(p.amount)  // Negative for purchases (debit)
        : parseFloat(p.amount) * 0.9, // 90% after 10% platform fee (credit)
      type: p.buyerId === user?.id ? 'spent' : 'earned',
      createdAt: p.createdAt
    })),
    // Add cash-out requests as credit transactions - only show approved ones as completed transactions
    ...cashOutHistory
      .filter((cashOut: any) => cashOut.status === 'approved')
      .map((cashOut: any) => ({
        id: `cashout-${cashOut.id}`,
        description: `Cash out approved: ${cashOut.bankName} ${cashOut.accountNumber}`,
        amount: -parseFloat(cashOut.amount), // Negative for debit transactions
        type: 'spent',
        createdAt: cashOut.updatedAt || cashOut.createdAt || cashOut.date || new Date().toISOString()
      })),
    // From credit history database (reward redemptions, etc.)
    ...(creditHistoryData || []).map((credit: any) => ({
      id: `credit-${credit.id}`,
      description: credit.description,
      amount: parseFloat(credit.amount),
      type: credit.type,
      createdAt: credit.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Filter credit history
  const filteredCreditHistory = allCreditHistory.filter(entry => {
    const typeMatch = creditFilter === 'all' || entry.type === creditFilter;
    const dateMatch = !creditDateFilter || 
      new Date(entry.createdAt).toISOString().split('T')[0] === creditDateFilter;
    return typeMatch && dateMatch;
  });

  // Fetch redemption history from database (filter for 'redeemed' type)
  const { data: redemptionHistory = [] } = useQuery({
    queryKey: ['/api/points-history', user?.id, 'redeemed'],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await fetch(`/api/points-history/${user?.id}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch redemption history');
      const data = await response.json();
      // Filter for only redeemed items and format for redemption display
      return data
        .filter((item: any) => item.type === 'redeemed')
        .map((item: any) => ({
          id: item.id,
          date: new Date(item.createdAt).toLocaleDateString(),
          reward: item.description.replace('Redeemed: ', ''),
          pointsSpent: Math.abs(item.points),
          status: "completed"
        }));
    }
  });

  // Filter and sort redemption history
  const [redemptionFilter, setRedemptionFilter] = useState<'all' | 'completed' | 'used'>('all');
  const [redemptionDateFilter, setRedemptionDateFilter] = useState('');
  
  const filteredRedemptionHistory = redemptionHistory.filter((redemption: any) => {
    const statusMatch = redemptionFilter === 'all' || redemption.status === redemptionFilter;
    const dateMatch = !redemptionDateFilter || 
      redemption.date === new Date(redemptionDateFilter).toLocaleDateString();
    return statusMatch && dateMatch;
  });

  // Marketplace listings (user-created)
  const [userListings, setUserListings] = useState([
    { id: 1, title: "Rare Teddy Bear", description: "Collectible bear from limited edition", price: 750000, toyId: 2, seller: "Candy", status: "active", createdDate: "2025-05-20" }
  ]);

  // Sales history
  const [salesHistory, setSalesHistory] = useState([
    { id: 1, item: "Lucky Cat", buyer: "Sarah Chen", amount: 300000, date: "2025-05-18", status: "completed" }
  ]);

  // Loyalty levels
  const levels = [
    {
      level: 1,
      name: "Bronze Explorer",
      pointsRequired: 0,
      maxPoints: 499,
      icon: Medal,
      color: "from-amber-600 to-amber-800",
      bgColor: "bg-amber-50",
      benefits: ["5% bonus points", "Birthday discount 10%", "Free shipping"]
    },
    {
      level: 2,
      name: "Silver Adventurer", 
      pointsRequired: 500,
      maxPoints: 1499,
      icon: Award,
      color: "from-gray-500 to-gray-700",
      bgColor: "bg-gray-50",
      benefits: ["10% bonus points", "Birthday discount 15%", "Priority support"]
    },
    {
      level: 3,
      name: "Gold Champion",
      pointsRequired: 1500,
      maxPoints: 3999,
      icon: Trophy,
      color: "from-yellow-500 to-yellow-700",
      bgColor: "bg-yellow-50",
      benefits: ["15% bonus points", "Birthday discount 20%", "Express shipping"]
    },
    {
      level: 4,
      name: "Platinum Elite",
      pointsRequired: 4000,
      maxPoints: 9999,
      icon: Star,
      color: "from-purple-500 to-purple-700",
      bgColor: "bg-purple-50",
      benefits: ["20% bonus points", "VIP events", "Service upgrades"]
    },
    {
      level: 5,
      name: "Diamond Royalty",
      pointsRequired: 10000,
      maxPoints: Infinity,
      icon: Crown,
      color: "from-indigo-500 to-purple-600",
      bgColor: "bg-indigo-50",
      benefits: ["25% bonus points", "Personal consultant", "Exclusive events"]
    }
  ];

  // Fetch rewards from admin-created rewards
  const { data: adminRewards } = useQuery({
    queryKey: ['/api/rewards']
  });

  // Transform admin rewards to match the expected format
  const rewards = useMemo(() => {
    if (!adminRewards || !Array.isArray(adminRewards)) {
      return [];
    }
    
    return adminRewards
      .filter(reward => reward.isActive)
      .map(reward => ({
        id: reward.id,
        name: reward.name,
        pointsCost: reward.pointsCost,
        category: reward.type || 'general',
        claimed: false,
        description: reward.description,
        stockQuantity: reward.stockQuantity,
        imageUrl: reward.imageUrl
      }));
  }, [adminRewards]);

  // Helper functions for reward display
  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'credit':
      case 'money':
        return "bg-green-100 text-green-800";
      case 'beauty':
      case 'spa':
        return "bg-pink-100 text-pink-800";
      case 'entertainment':
      case 'gaming':
        return "bg-blue-100 text-blue-800";
      case 'food':
      case 'dining':
        return "bg-orange-100 text-orange-800";
      case 'health':
      case 'fitness':
        return "bg-red-100 text-red-800";
      case 'premium':
      case 'vip':
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Functions
  const getCurrentLevel = () => {
    return levels.find(level => 
      lifetimePoints >= level.pointsRequired && 
      (level.maxPoints === Infinity || lifetimePoints <= level.maxPoints)
    ) || levels[0];
  };

  const getNextLevel = () => {
    const current = getCurrentLevel();
    return levels.find(level => level.level === current.level + 1);
  };

  const currentLevelInfo = getCurrentLevel();
  const nextLevelInfo = getNextLevel();
  const pointsToNextLevel = nextLevelInfo ? nextLevelInfo.pointsRequired - lifetimePoints : 0;
  const progressPercentage = nextLevelInfo 
    ? ((lifetimePoints - currentLevelInfo.pointsRequired) / (nextLevelInfo.pointsRequired - currentLevelInfo.pointsRequired)) * 100
    : 100;

  const copyReferralCode = () => {
    const referralLink = `${window.location.origin}?ref=${referralCode}`;
    navigator.clipboard.writeText(referralLink);
    toast({
      title: language === "id" ? "Disalin!" : "Copied!",
      description: language === "id" ? "Link rujukan disalin" : "Referral link copied",
    });
  };

  const bookAppointment = async () => {
    if (!newAppointment.category || !newAppointment.service || !newAppointment.date || !newAppointment.time) {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Harap isi semua field" : "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    // Check if booking is within 2 hours
    const now = new Date();
    const appointmentTime = new Date(`${newAppointment.date}T${newAppointment.time}`);
    const timeDiff = appointmentTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff < 2) {
      toast({
        title: language === "id" ? "Error" : "Error", 
        description: language === "id" ? "Reservasi harus dibuat minimal 2 jam ke depan" : "Booking must be at least 2 hours in advance",
        variant: "destructive"
      });
      return;
    }

    const selectedCategory = serviceCategories[newAppointment.category];
    const selectedService = selectedCategory.options.find(opt => opt.value === newAppointment.service);
    
    try {
      // Create appointment in database with proper date format
      const appointmentDateTime = new Date(`${newAppointment.date}T${newAppointment.time}:00`);
      
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: selectedService.label,
          description: `${newAppointment.category} service booking`,
          appointmentDate: appointmentDateTime.toISOString(),
          duration: 60,
          cost: selectedService.cost.toString()
        })
      });

      if (response.ok) {
        toast({
          title: language === "id" ? "Berhasil!" : "Success!",
          description: language === "id" ? "Reservasi berhasil dibuat! Menunggu persetujuan admin" : "Appointment booked! Waiting for admin approval",
        });
        
        // Refresh user data to show new appointment
        queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
        setNewAppointment({ category: "", service: "", date: "", time: "" });
      } else {
        toast({
          title: "Error",
          description: "Failed to create appointment",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: "Error", 
        description: "Failed to create appointment",
        variant: "destructive"
      });
    }
  };

  const rescheduleAppointment = async (appointmentId, newDate, newTime) => {
    try {
      const appointmentDateTime = new Date(`${newDate}T${newTime}:00`);
      
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          appointmentDate: appointmentDateTime.toISOString()
        })
      });

      if (response.ok) {
        setEditingAppointment(null);
        toast({
          title: language === "id" ? "Berhasil!" : "Success!",
          description: language === "id" ? "Jadwal berhasil diubah" : "Appointment rescheduled successfully",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
      } else {
        toast({
          title: "Error",
          description: "Failed to reschedule appointment",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      toast({
        title: "Error",
        description: "Failed to reschedule appointment",
        variant: "destructive"
      });
    }
  };

  const deleteAppointment = async (appointmentId) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'cancelled' })
      });

      if (response.ok) {
        toast({
          title: language === "id" ? "Berhasil!" : "Success!",
          description: language === "id" ? "Reservasi berhasil dihapus" : "Appointment deleted successfully",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
      } else {
        toast({
          title: "Error",
          description: "Failed to cancel appointment",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        title: "Error",
        description: "Failed to cancel appointment",
        variant: "destructive"
      });
    }
  };

  const processPayment = (amount) => {
    // This would integrate with PayPal/Stripe
    // Credits are managed through the database, not local state
    
    // Transaction history now handled by database queries
    
    setShowTopUpModal(false);
    setTopUpAmount("");
    toast({
      title: language === "id" ? "Berhasil!" : "Success!",
      description: language === "id" ? `RP ${formatRupiah(amount)} berhasil ditambahkan` : `RP ${formatRupiah(amount)} added successfully`,
    });
  };

  // Account number validation function
  const validateAccountNumber = (bankCode, accountNum) => {
    const bank = indonesianBanks.find(b => b.code === bankCode);
    if (!bank) return false;
    
    const numericAccount = accountNum.replace(/\D/g, '');
    return numericAccount.length >= bank.minDigits && numericAccount.length <= bank.maxDigits;
  };

  const processCashOut = async () => {
    if (!cashOutAmount || !bankName || !accountNumber || !accountHolderName) {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Harap isi semua field" : "Please fill all fields",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(cashOutAmount);
    if (amount < 50000) {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Minimal penarikan RP 50,000" : "Minimum cash-out RP 50,000",
        variant: "destructive"
      });
      return;
    }

    if (amount > userCredits) {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Kredit tidak mencukupi" : "Insufficient credits",
        variant: "destructive"
      });
      return;
    }

    // Validate account number format for selected bank
    if (!validateAccountNumber(bankName, accountNumber)) {
      const bank = indonesianBanks.find(b => b.code === bankName);
      toast({
        title: language === "id" ? "Nomor Rekening Tidak Valid" : "Invalid Account Number",
        description: language === "id" ? 
          `Nomor rekening ${bank?.name} harus ${bank?.minDigits}-${bank?.maxDigits} digit` :
          `${bank?.name} account number must be ${bank?.minDigits}-${bank?.maxDigits} digits`,
        variant: "destructive"
      });
      return;
    }

    try {
      // Submit cash-out request to backend
      await apiRequest('POST', '/api/cash-out', {
        amount: amount.toString(),
        bankName,
        accountNumber,
        accountHolderName
      });
      
      setShowCashOutModal(false);
      setCashOutAmount("");
      setBankName("");
      setAccountNumber("");
      setAccountHolderName("");

      toast({
        title: language === "id" ? "Berhasil!" : "Success!",
        description: language === "id" ? "Permintaan penarikan berhasil diajukan" : "Cash-out request submitted successfully",
      });

      // Refresh cash-out history from API
      queryClient.invalidateQueries({ queryKey: ['/api/cashout/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
      
      // Add transaction to history
      // Transaction history now handled by database queries
    } catch (error) {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Gagal memproses penarikan" : "Failed to process cash-out",
        variant: "destructive"
      });
    }
  };

  const addToyByCode = async () => {
    if (!newToyCode) {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Masukkan kode QR mainan" : "Enter toy QR code",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await apiRequest('POST', '/api/toys/scan', {
        qrCode: newToyCode
      });

      // Refresh toy inventory
      queryClient.invalidateQueries({ queryKey: ['/api/toys'] });
      
      setNewToyCode("");
      
      toast({
        title: language === "id" ? "Berhasil!" : "Success!",
        description: language === "id" ? "Mainan Doluruu berhasil diaktifkan dan ditambahkan ke koleksi!" : "Doluruu toy successfully activated and added to collection!",
      });
    } catch (error: any) {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: error.message || (language === "id" ? "Gagal mengaktifkan mainan" : "Failed to activate toy"),
        variant: "destructive"
      });
    }
  };

  const createMarketplaceListing = () => {
    if (!newListingPrice || !selectedToyForSale) {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Harap pilih mainan dan masukkan harga" : "Please select toy and enter price",
        variant: "destructive"
      });
      return;
    }

    // Create listing using database mutation
    createListingMutation.mutate({
      toyId: selectedToyForSale.id,
      price: newListingPrice, // Send as string to match database schema
      description: `Original ${selectedToyForSale.name} from collection`,
    });
    
    setNewListingPrice("");
    setSelectedToyForSale(null);
    setShowCreateListingModal(false);
  };

  const initiateRedemption = (reward: any) => {
    if (loyaltyPoints < reward.pointsCost) {
      toast({
        title: language === "id" ? "Poin Tidak Cukup" : "Insufficient Points",
        description: language === "id" ? `Butuh ${reward.pointsCost - loyaltyPoints} poin lagi` : `You need ${reward.pointsCost - loyaltyPoints} more points`,
        variant: "destructive"
      });
      return;
    }

    // Check stock availability
    if (reward.stockQuantity && reward.stockQuantity <= 0) {
      toast({
        title: language === "id" ? "Stok Habis" : "Out of Stock",
        description: language === "id" ? "Reward ini sedang tidak tersedia" : "This reward is currently unavailable",
        variant: "destructive"
      });
      return;
    }

    // Show confirmation dialog
    setSelectedReward(reward);
    setShowRedeemConfirmation(true);
  };

  const confirmRedemption = async () => {
    if (!selectedReward || isRedeeming) return;
    
    setIsRedeeming(true);
    
    try {
      const redeemResponse = await apiRequest('POST', '/api/redeem-reward', {
        rewardId: selectedReward.id,
        pointsCost: selectedReward.pointsCost
      });

      if (!redeemResponse.ok) {
        throw new Error('Failed to redeem reward');
      }

      const result = await redeemResponse.json();

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/points-history', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/credit-history', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/rewards'] });

      toast({
        title: language === "id" ? "Reward Ditukar!" : "Reward Redeemed!",
        description: result.creditAdded 
          ? (language === "id" ? `${selectedReward.name} berhasil ditukar! +RP ${result.creditAdded} ditambahkan` : `${selectedReward.name} successfully redeemed! +RP ${result.creditAdded} added`)
          : (language === "id" ? `${selectedReward.name} berhasil ditukar` : `${selectedReward.name} successfully redeemed`)
      });
      
      setShowRedeemConfirmation(false);
      setSelectedReward(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to redeem reward",
        variant: "destructive"
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  // Function to cancel listing
  const cancelListing = (listingId) => {
    // Find the toy that was being sold
    const canceledToy = marketplaceToys.find(toy => toy.id === listingId);
    
    // Remove from marketplace toys
    const updatedMarketplaceToys = marketplaceToys.filter(item => item.id !== listingId);
    setMarketplaceToys(updatedMarketplaceToys);
    setUserListings(userListings.filter(item => item.id !== listingId));
    
    // Update global marketplace listings storage
    localStorage.setItem('globalMarketplaceListings', JSON.stringify(updatedMarketplaceToys));
    
    if (canceledToy) {
      // Add it back to user's inventory
      const restoredToy = {
        id: canceledToy.toyId || canceledToy.id,
        name: canceledToy.name,
        rarity: canceledToy.rarity,
        acquiredDate: new Date().toISOString().split('T')[0],
        qrCode: `QR${Date.now()}`,
        image: canceledToy.image
      };
      
      const updatedInventory = [...toyInventory, restoredToy];
      setToyInventory(updatedInventory);
      localStorage.setItem(`userToys_${user?.id || 'guest'}`, JSON.stringify(updatedInventory));
    }
    
    toast({
      title: language === "id" ? "Penjualan Dibatalkan" : "Sale Canceled",
      description: language === "id" ? "Mainan dikembalikan ke inventori Anda" : "Toy returned to your inventory",
    });
  };

  // Fixed cancel sale function using real API
  const cancelSale = async (purchaseId: any) => {
    try {
      const response = await fetch(`/api/pending-purchases/${purchaseId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: language === "id" ? "Penjualan Dibatalkan" : "Sale Cancelled",
          description: language === "id" ? "Item dikembalikan ke marketplace dan kredit dikembalikan" : "Item returned to marketplace and credits refunded"
        });
        
        // Refresh all data from database
        queryClient.invalidateQueries({ queryKey: ['/api/pending-purchases'] });
        queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
        queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
      }
    } catch (error) {
      console.error('Error cancelling sale:', error);
      toast({
        title: "Error",
        description: "Failed to cancel sale",
        variant: "destructive"
      });
    }
  };

  // Cancel purchase function for buyers
  const cancelPurchase = async (purchaseId: any) => {
    try {
      const response = await fetch(`/api/pending-purchases/${purchaseId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: language === "id" ? "Pembelian Dibatalkan" : "Purchase Cancelled",
          description: language === "id" ? "Kredit dikembalikan ke akun Anda" : "Credits refunded to your account"
        });
        
        // Refresh all data from database
        queryClient.invalidateQueries({ queryKey: ['/api/pending-purchases'] });
        queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
        queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
      }
    } catch (error) {
      console.error('Error cancelling purchase:', error);
      toast({
        title: "Error",
        description: "Failed to cancel purchase",
        variant: "destructive"
      });
    }
  };

  const buyToy = (listing) => {
    // Check if trying to buy own item
    if (listing.sellerId === user?.id) {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Tidak bisa membeli item sendiri" : "Cannot buy your own item",
        variant: "destructive"
      });
      return;
    }

    const price = parseFloat(listing.price || '0');
    if (userCredits < price) {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Kredit tidak mencukupi" : "Insufficient credits",
        variant: "destructive"
      });
      return;
    }

    // Show confirmation dialog
    setSelectedPurchaseListing(listing);
    setShowPurchaseConfirmation(true);
  };

  const confirmPurchaseDialog = () => {
    const listing = selectedPurchaseListing;
    const price = parseFloat(listing.price || '0');
    
    // Calculate points earned (1 point per 10,000 RP)
    const pointsEarned = Math.floor(price / 10000);

    // Create pending purchase - buyer pays, seller must confirm
    // The backend will handle both credit deduction and credit history creation
    createPendingPurchaseMutation.mutate({
      listingId: listing.id,
      buyerId: user?.id,
      sellerId: listing.sellerId,
      toyId: listing.toyId,
      amount: listing.price,
      pointsEarned: pointsEarned,
    });

    // Points will be added when seller confirms the purchase

    setShowPurchaseConfirmation(false);
    setSelectedPurchaseListing(null);

    toast({
      title: language === "id" ? "Pembelian Berhasil!" : "Purchase Successful!",
      description: language === "id" ? `Kredit telah dipotong. Menunggu penjual konfirmasi untuk mendapat ${pointsEarned} poin.` : `Credits deducted. Waiting for seller confirmation to earn ${pointsEarned} points.`,
    });
  };

  // Function to confirm purchase as seller
  const confirmPurchase = async (purchaseId) => {
    try {
      const response = await fetch(`/api/pending-purchases/${purchaseId}/seller-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (response.ok) {
        toast({
          title: language === "id" ? "Konfirmasi Berhasil!" : "Confirmation Successful!",
          description: language === "id" ? "Penjualan dikonfirmasi, menunggu konfirmasi penerima" : "Sale confirmed, waiting for buyer confirmation",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/pending-purchases'] });
        queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
        queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
      } else {
        throw new Error('Failed to confirm purchase');
      }
    } catch (error) {
      console.error('Error confirming sale:', error);
      toast({
        title: "Error",
        description: "Failed to confirm sale",
        variant: "destructive"
      });
    }
  };



  const confirmSale = async (purchaseId: any) => {
    try {
      const response = await fetch(`/api/pending-purchases/${purchaseId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: language === "id" ? "Penjualan Dikonfirmasi!" : "Sale Confirmed!",
          description: language === "id" ? "Kredit telah ditambahkan ke akun Anda" : "Credits have been added to your account"
        });
        
        // Refresh all data from database
        queryClient.invalidateQueries({ queryKey: ['/api/pending-purchases'] });
        queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
        queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
      }
    } catch (error) {
      console.error('Error confirming sale:', error);
      toast({
        title: "Error",
        description: "Failed to confirm sale",
        variant: "destructive"
      });
    }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: language === "id" ? "Password baru tidak cocok" : "New passwords don't match",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error", 
        description: language === "id" ? "Password minimal 6 karakter" : "Password must be at least 6 characters",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        }),
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: language === "id" ? "Berhasil" : "Success",
          description: language === "id" ? "Password berhasil diubah" : "Password changed successfully"
        });
        setShowPasswordModal(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || (language === "id" ? "Gagal mengubah password" : "Failed to change password"),
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: language === "id" ? "Terjadi kesalahan" : "An error occurred",
        variant: "destructive"
      });
    }
  };

  const saveNotificationSettings = async () => {
    try {
      const response = await fetch('/api/auth/notification-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailNotifications,
          smsNotifications
        }),
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: language === "id" ? "Berhasil" : "Success",
          description: language === "id" ? "Pengaturan notifikasi berhasil disimpan" : "Notification settings saved successfully"
        });
        setShowEmailModal(false);
      } else {
        toast({
          title: "Error",
          description: language === "id" ? "Gagal menyimpan pengaturan" : "Failed to save settings",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: language === "id" ? "Terjadi kesalahan" : "An error occurred",
        variant: "destructive"
      });
    }
  };

  const saveProfile = async () => {
    try {
      const response = await fetch('/api/auth/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          phoneNumber,
          gender,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null
        }),
        credentials: 'include'
      });

      if (response.ok) {
        setEditingProfile(false);
        
        // Refresh user data
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        
        toast({
          title: language === "id" ? "Berhasil!" : "Success!",
          description: language === "id" ? "Profil berhasil diperbarui" : "Profile updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update profile",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800';
      case 'rare': return 'bg-blue-100 text-blue-800';
      case 'epic': return 'bg-purple-100 text-purple-800';
      case 'legendary': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'credit': return '💳';
      case 'beauty': return '💄';
      case 'entertainment': return '🎮';
      case 'perk': return '⭐';
      default: return '🎁';
    }
  };

  const getRewardIcon = (imageUrl) => {
    if (!imageUrl) return '🎁';
    
    // Map common reward types to icons
    if (imageUrl.includes('credit')) return '💳';
    if (imageUrl.includes('beauty')) return '💄';
    if (imageUrl.includes('entertainment') || imageUrl.includes('game')) return '🎮';
    if (imageUrl.includes('token') || imageUrl.includes('coin')) return '🪙';
    if (imageUrl.includes('discount')) return '🏷️';
    if (imageUrl.includes('voucher')) return '🎫';
    
    return '🎁'; // Default gift icon
  };



  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1 shadow-sm">
                <img src={logoImage} alt="Reborn Wave House" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-blue-600">Reborn Wave House</h1>
                <p className="text-xs text-gray-500">Your Oasis of Joy</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLanguage(language === "en" ? "id" : "en")}
              >
                <Globe className="w-4 h-4 mr-2" />
                {language === "en" ? "ID" : "EN"}
              </Button>
              <span className="text-sm text-gray-600">
                {language === "id" ? "Halo" : "Welcome"}, {user?.firstName || user?.email?.split('@')[0] || 'User'}!
              </span>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/api/logout'}>
                <LogOut className="w-4 h-4 mr-2" />
                {language === "id" ? "Keluar" : "Logout"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-4 md:space-x-8 overflow-x-auto scrollbar-hide pb-2">
            {[
              { id: "dashboard", label: language === "id" ? "Beranda" : "Dashboard", icon: Home },
              { id: "petcare", label: language === "id" ? "Perawatan Hewan" : "Pet Care", icon: Heart },
              { id: "loyalty", label: language === "id" ? "Loyalitas" : "Loyalty", icon: Star },
              { id: "bookings", label: language === "id" ? "Reservasi" : "Bookings", icon: Calendar },
              { id: "marketplace", label: language === "id" ? "Pasar" : "Marketplace", icon: ShoppingBag },
              { id: "inventory", label: language === "id" ? "Koleksi" : "Collections", icon: Package },
              { id: "purchase", label: language === "id" ? "Verifikasi Pembelian" : "Purchase Verification", icon: Camera },
              { id: "referrals", label: language === "id" ? "Rujukan" : "Referrals", icon: Users },
              { id: "profile", label: language === "id" ? "Profil" : "Profile", icon: User }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  // Play Doluruu sound when pet care tab is clicked
                  if (tab.id === "petcare") {
                    playDoluruuSound();
                  }
                  setActiveTab(tab.id);
                }}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top-up Payment Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{language === "id" ? "Top Up Kredit" : "Top Up Credits"}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {["100000", "500000", "1000000", "2000000", "5000000", "10000000"].map(amount => (
                  <Button 
                    key={amount}
                    variant="outline"
                    onClick={() => setTopUpAmount(amount)}
                    className={`text-xs ${topUpAmount === amount ? "bg-blue-100" : ""}`}
                  >
                    RP {parseInt(amount).toLocaleString('id-ID')}
                  </Button>
                ))}
              </div>
              <Input
                placeholder={language === "id" ? "Jumlah custom" : "Custom amount"}
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
              />
              <div className="flex space-x-2">
                <Button 
                  className="flex-1 bg-blue-600" 
                  onClick={() => processPayment(topUpAmount)}
                  disabled={!topUpAmount}
                >
                  PayPal
                </Button>
                <Button 
                  className="flex-1 bg-purple-600" 
                  onClick={() => processPayment(topUpAmount)}
                  disabled={!topUpAmount}
                >
                  Stripe
                </Button>
              </div>
              <Button variant="outline" onClick={() => setShowTopUpModal(false)} className="w-full">
                {language === "id" ? "Batal" : "Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cash-out Modal */}
      {showCashOutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4 text-green-600">
              {language === "id" ? "💰 Tarik Kredit ke Bank" : "💰 Cash Out to Bank"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === "id" ? "Jumlah Penarikan" : "Withdrawal Amount"}
                </label>
                <Input
                  placeholder={language === "id" ? "Min. RP 50,000" : "Min. RP 50,000"}
                  value={cashOutAmount}
                  onChange={(e) => setCashOutAmount(e.target.value)}
                  type="number"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {language === "id" ? `Saldo tersedia: RP ${formatRupiah(userCredits)}` : `Available balance: RP ${formatRupiah(userCredits)}`}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === "id" ? "Nama Bank" : "Bank Name"}
                </label>
                <Select onValueChange={setBankName}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === "id" ? "Pilih bank atau e-wallet" : "Select bank or e-wallet"} />
                  </SelectTrigger>
                  <SelectContent>
                    {indonesianBanks.map((bank) => (
                      <SelectItem key={bank.code} value={bank.code}>
                        {bank.icon} {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === "id" ? "Nomor Rekening" : "Account Number"}
                </label>
                <Input
                  placeholder={
                    bankName ? 
                      (() => {
                        const bank = indonesianBanks.find(b => b.code === bankName);
                        return bank ? 
                          `${bank.minDigits === bank.maxDigits ? bank.minDigits : `${bank.minDigits}-${bank.maxDigits}`} digits` :
                          (language === "id" ? "Masukkan nomor rekening" : "Enter account number");
                      })() :
                      (language === "id" ? "Pilih bank terlebih dahulu" : "Select bank first")
                  }
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  disabled={!bankName}
                />
                {bankName && (
                  <p className="text-xs mt-1">
                    {(() => {
                      const bank = indonesianBanks.find(b => b.code === bankName);
                      const isValid = validateAccountNumber(bankName, accountNumber);
                      return bank ? (
                        <span className={isValid ? "text-green-600" : "text-red-500"}>
                          {language === "id" ? 
                            `${bank.name}: ${bank.minDigits === bank.maxDigits ? bank.minDigits : `${bank.minDigits}-${bank.maxDigits}`} digit ${isValid ? '✓' : '✗'}` :
                            `${bank.name}: ${bank.minDigits === bank.maxDigits ? bank.minDigits : `${bank.minDigits}-${bank.maxDigits}`} digits ${isValid ? '✓' : '✗'}`
                          }
                        </span>
                      ) : null;
                    })()}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === "id" ? "Nama Pemilik Rekening" : "Account Holder Name"}
                </label>
                <Input
                  placeholder={language === "id" ? "Nama sesuai rekening bank" : "Name as per bank account"}
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-700">
                  {language === "id" 
                    ? "⚠️ Proses penarikan membutuhkan 1-3 hari kerja. Pastikan data bank sudah benar." 
                    : "⚠️ Withdrawal process takes 1-3 business days. Please ensure bank details are correct."}
                </p>
              </div>

              <div className="flex space-x-2">
                <Button onClick={processCashOut} className="flex-1 bg-green-600 hover:bg-green-700">
                  {language === "id" ? "Ajukan Penarikan" : "Submit Withdrawal"}
                </Button>
                <Button variant="outline" onClick={() => setShowCashOutModal(false)} className="flex-1">
                  {language === "id" ? "Batal" : "Cancel"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Listing Modal */}
      {showCreateListingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{language === "id" ? "Jual Mainan Saya" : "Sell My Toy"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === "id" ? "Pilih Mainan" : "Select Toy"}
                </label>
                <Select onValueChange={(value) => setSelectedToyForSale(toyInventory.find(toy => toy.id.toString() === value))}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === "id" ? "Pilih mainan untuk dijual" : "Select toy to sell"} />
                  </SelectTrigger>
                  <SelectContent>
                    {toyInventory.filter((toy) => {
                      // Only show toys that are NOT already actively listed by this user
                      const isAlreadyListed = marketplaceListings?.some((listing: any) => 
                        listing.toyId === toy.id && 
                        listing.sellerId === user?.id &&
                        listing.status === 'active'
                      );
                      
                      // Also hide toys that have pending transactions
                      const hasPendingTransaction = userPendingPurchases?.some((purchase: any) => 
                        purchase.toyId === toy.id && 
                        (purchase.status === 'pending_seller_confirmation' || 
                         purchase.status === 'pending_buyer_confirmation')
                      );
                      
                      // Hide activated toys (they became pets and can't be sold)
                      const isActivated = toy.isActivated === true;
                      
                      return !isAlreadyListed && !hasPendingTransaction && !isActivated;
                    }).map((toy) => (
                      <SelectItem key={toy.id} value={toy.id.toString()}>
                        {toy.image} {toy.name} ({toy.rarity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === "id" ? "Harga Jual (RP)" : "Selling Price (RP)"}
                </label>
                <Input
                  placeholder={language === "id" ? "Masukkan harga" : "Enter price"}
                  value={newListingPrice}
                  onChange={(e) => setNewListingPrice(e.target.value)}
                  type="number"
                />
              </div>

              <div className="flex space-x-2">
                <Button onClick={createMarketplaceListing} className="flex-1" disabled={!selectedToyForSale || !newListingPrice}>
                  {language === "id" ? "Buat Listing" : "Create Listing"}
                </Button>
                <Button variant="outline" onClick={() => setShowCreateListingModal(false)} className="flex-1">
                  {language === "id" ? "Batal" : "Cancel"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
              <h2 className="text-3xl font-bold mb-2">
                {language === "id" ? "Selamat datang kembali" : "Welcome back"}, {user?.firstName || 'Candy'}!
              </h2>
              <p className="text-blue-100">
                Level {currentLoyaltyLevel.level} • {loyaltyPoints} {language === "id" ? "poin" : "points"} • RP {formatRupiah(userCredits)}
              </p>
            </div>

            {/* Promotion Banners */}
            {activePromotionBanners.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activePromotionBanners.map((banner: any) => (
                  <Card key={banner.id} className={`text-white ${
                    banner.backgroundColor === 'blue' ? 'bg-gradient-to-r from-blue-600 to-blue-800' :
                    banner.backgroundColor === 'green' ? 'bg-gradient-to-r from-green-500 to-green-700' :
                    banner.backgroundColor === 'orange' ? 'bg-gradient-to-r from-orange-500 to-orange-700' :
                    banner.backgroundColor === 'purple' ? 'bg-gradient-to-r from-purple-500 to-purple-700' :
                    banner.backgroundColor === 'red' ? 'bg-gradient-to-r from-red-500 to-red-700' :
                    banner.backgroundColor === 'gray' ? 'bg-gradient-to-r from-gray-600 to-gray-800' :
                    'bg-gradient-to-r from-blue-600 to-blue-800'
                  }`}>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        {banner.iconSymbol && (
                          <div className="text-4xl">
                            {banner.iconSymbol}
                          </div>
                        )}
                        {banner.imageUrl && !banner.iconSymbol && (
                          <div className="text-4xl">
                            <img src={banner.imageUrl} alt={banner.title} className="w-16 h-16 object-cover rounded-lg" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="text-xl font-bold">{banner.title}</h3>
                          <p className="text-white/90 mb-2">{banner.description}</p>
                          {banner.ctaText && banner.ctaUrl && (
                            <a 
                              href={banner.ctaUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-block bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                              {banner.ctaText}
                            </a>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6 text-center">
                  <DollarSign className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <p className="text-sm text-green-600 font-medium">
                    {language === "id" ? "Kredit" : "Credits"}
                  </p>
                  <p className="text-lg font-bold text-green-800">RP {formatRupiah(userCredits)}</p>
                  <div className="space-y-1 mt-2">
                    <Button size="sm" onClick={() => setShowCreditTopUpModal(true)} className="w-full bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-3 h-3 mr-1" />
                      {language === "id" ? "Top Up Kredit" : "Add Credits"}
                    </Button>
                    <Button size="sm" onClick={() => setShowCashOutModal(true)} className="w-full bg-green-600 hover:bg-green-700">
                      <DollarSign className="w-3 h-3 mr-1" />
                      {language === "id" ? "Tarik ke Bank" : "Cash Out to Bank"}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setShowCreditHistory(true)}
                      className="w-full bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      {language === "id" ? "Lihat Riwayat" : "View Credits"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-6 text-center">
                  <Gift className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                  <p className="text-sm text-purple-600 font-medium">
                    {language === "id" ? "Poin Loyalitas" : "Loyalty Points"}
                  </p>
                  <p className="text-2xl font-bold text-purple-800">{loyaltyPoints}</p>
                  <Button size="sm" onClick={() => setActiveTab("loyalty")} className="mt-2 bg-purple-600 hover:bg-purple-700">
                    <Star className="w-4 h-4 mr-1" />
                    {language === "id" ? "Lihat Reward" : "View Rewards"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-6 text-center">
                  <Gift className="h-8 w-8 mx-auto text-orange-600 mb-2" />
                  <p className="text-sm text-orange-600 font-medium">
                    {language === "id" ? "Token" : "Tokens"}
                  </p>
                  <p className="text-2xl font-bold text-orange-800">{userTokens}</p>
                  <div className="space-y-2 mt-2">
                    <Button size="sm" onClick={() => setShowTokenClaimModal(true)} className="w-full bg-orange-600 hover:bg-orange-700">
                      <Star className="w-4 h-4 mr-1" />
                      {language === "id" ? "Klaim Token" : "Claim Tokens"}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setModalHistoryFilter("tokens");
                        setModalHistoryPage(1);
                        setShowHistoryModal(true);
                      }}
                      className="w-full bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      {language === "id" ? "Riwayat Klaim" : "Claim History"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                  <p className="text-sm text-blue-600 font-medium">
                    {language === "id" ? "Rujukan" : "Referrals"}
                  </p>
                  <p className="text-2xl font-bold text-blue-800">{userReferrals.length}</p>
                  <Button 
                    size="sm" 
                    onClick={toggleAchievementRules}
                    className="mt-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  >
                    <Trophy className="w-4 h-4 mr-1" />
                    {language === "id" ? "Pencapaian" : "Achievement"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-6 text-center">
                  <DollarSign className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
                  <p className="text-sm text-yellow-600 font-medium">
                    {language === "id" ? "Pendapatan" : "Earnings"}
                  </p>
                  <p className="text-2xl font-bold text-yellow-800">RP {formatRupiah(referralEarnings)}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Quick Booking */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>{language === "id" ? "Reservasi Cepat" : "Quick Booking"}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Select onValueChange={(value) => setNewAppointment({...newAppointment, category: value, service: ""})}>
                      <SelectTrigger>
                        <SelectValue placeholder={language === "id" ? "Pilih Kategori" : "Select Category"} />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(serviceCategories).map(([key, category]) => (
                          <SelectItem key={key} value={key}>{category.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {newAppointment.category && (
                      <Select onValueChange={(value) => setNewAppointment({...newAppointment, service: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder={language === "id" ? "Pilih Layanan" : "Select Service"} />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceCategories[newAppointment.category].options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={newAppointment.date}
                      onChange={(e) => setNewAppointment({...newAppointment, date: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />

                    <Select onValueChange={(value) => setNewAppointment({...newAppointment, time: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder={language === "id" ? "Pilih Waktu" : "Select Time"} />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({length: 24}, (_, i) => i).map(hour => (
                          ['00', '30'].map(minute => {
                            const timeSlot = `${hour.toString().padStart(2, '0')}:${minute}`;
                            const isBooked = bookedTimes.includes(timeSlot);
                            
                            return (
                              <SelectItem 
                                key={timeSlot} 
                                value={timeSlot}
                                disabled={isBooked}
                                className={isBooked ? "text-gray-400 cursor-not-allowed" : ""}
                              >
                                {timeSlot} {isBooked ? (language === "id" ? "(Tidak Tersedia)" : "(Booked)") : ""}
                              </SelectItem>
                            );
                          })
                        )).flat()}
                      </SelectContent>
                    </Select>

                    <Button onClick={bookAppointment} className="w-full">
                      <Calendar className="w-4 h-4 mr-2" />
                      {language === "id" ? "Buat Reservasi" : "Book Appointment"}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Referral Section */}
              <div>
                <Card className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white">
                  <CardHeader>
                    <CardTitle className="text-white">
                      {language === "id" ? "Kode Rujukan Anda" : "Your Referral Code"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-white/20 rounded-lg p-4 mb-4 text-center">
                      <p className="text-3xl font-bold font-mono mb-2">{referralCode}</p>
                      <p className="text-emerald-100 text-sm">
                        {language === "id" ? "Bagikan untuk dapat komisi 10%" : "Share to earn 10% commission"}
                      </p>
                    </div>
                    <Button 
                      onClick={copyReferralCode}
                      className="w-full bg-white/20 hover:bg-white/30 text-white mb-4"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      {language === "id" ? "Salin Kode" : "Copy Code"}
                    </Button>
                    <div className="text-center">
                      <QrCode className="w-16 h-16 mx-auto text-white/80 mb-2" />
                      <p className="text-xs text-white/80">
                        {language === "id" ? "Pindai QR Code" : "Scan QR Code"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Loyalty Program Tab */}
        {activeTab === "loyalty" && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                {language === "id" ? "Program Loyalitas" : "Loyalty Program"}
              </h2>
              <p className="text-slate-600">
                {language === "id" ? "Kumpulkan poin dan tukar reward menarik" : "Earn points and claim amazing rewards"}
              </p>
            </div>

            {/* Current Status */}
            <Card className={`${currentLoyaltyLevel.bgColor} border-2`}>
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className={`w-16 h-16 bg-gradient-to-br ${currentLoyaltyLevel.color} rounded-full flex items-center justify-center`}>
                      <currentLoyaltyLevel.icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">{currentLoyaltyLevel.name}</h3>
                      <p className="text-slate-600">Level {currentLoyaltyLevel.level}</p>
                      {currentLoyaltyLevel.discount > 0 && (
                        <p className="text-green-600 font-semibold">{currentLoyaltyLevel.discount}% {language === "id" ? "diskon aktif" : "discount active"}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-slate-900">{loyaltyPoints}</p>
                    <p className="text-slate-600">{language === "id" ? "Poin Tersedia" : "Available Points"}</p>
                  </div>
                </div>

                {nextLoyaltyLevel && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700">
                        {language === "id" ? `Progress ke ${nextLoyaltyLevel.name}` : `Progress to ${nextLoyaltyLevel.name}`}
                      </span>
                      <span className="text-sm text-slate-600">
                        {loyaltyPointsToNext} {language === "id" ? "poin dibutuhkan" : "points needed"}
                      </span>
                    </div>
                    <Progress value={loyaltyProgress} className="h-3" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* All Loyalty Levels Overview */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                {language === "id" ? "Semua Level Loyalitas" : "All Loyalty Levels"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {loyaltyLevels.map((level) => (
                  <Card 
                    key={level.level} 
                    className={`${currentLoyaltyLevel.level === level.level ? level.bgColor + ' border-2 ' + level.borderColor : 'bg-white border border-gray-200'} transition-all hover:shadow-lg`}
                  >
                    <CardContent className="p-4 text-center">
                      <div className={`w-12 h-12 bg-gradient-to-br ${level.color} rounded-full flex items-center justify-center mx-auto mb-3`}>
                        <level.icon className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="font-bold text-sm mb-1">{level.name}</h4>
                      <p className="text-xs text-gray-600 mb-2">Level {level.level}</p>
                      <p className="text-xs font-medium text-slate-900 mb-2">
                        {level.minPoints === 0 ? 
                          `0 - ${level.maxPoints.toLocaleString()}` : 
                          level.maxPoints === Infinity ? 
                            `${level.minPoints.toLocaleString()}+` : 
                            `${level.minPoints.toLocaleString()} - ${level.maxPoints.toLocaleString()}`
                        } {language === "id" ? "poin" : "points"}
                      </p>
                      {level.discount > 0 && (
                        <div className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full mb-2">
                          {level.discount}% {language === "id" ? "diskon" : "discount"}
                        </div>
                      )}
                      <div className="space-y-1">
                        {level.benefits.slice(0, 2).map((benefit, index) => (
                          <p key={index} className="text-xs text-gray-600">{benefit}</p>
                        ))}
                        {level.benefits.length > 2 && (
                          <p className="text-xs text-gray-500">+{level.benefits.length - 2} {language === "id" ? "lainnya" : "more"}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Available Rewards */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{language === "id" ? "Reward Tersedia" : "Available Rewards"}</CardTitle>
                    <div className="text-sm text-gray-500">
                      {language === "id" ? "Poin hanya dapat ditambahkan oleh admin" : "Points can only be added by admin"}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {rewards.filter(r => !r.claimed).map((reward) => (
                        <div key={reward.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <span className="text-3xl">{reward.imageUrl || getCategorySymbol(reward.category, reward.id)}</span>
                              <div>
                                <h4 className="font-semibold text-slate-900">{reward.name}</h4>
                                <Badge className={getCategoryColor(reward.category)}>
                                  {reward.category}
                                </Badge>
                                {reward.description && (
                                  <p className="text-sm text-gray-600 mt-1">{reward.description}</p>
                                )}
                                {reward.stockQuantity && (
                                  <p className="text-xs text-orange-600 mt-1">
                                    {language === "id" ? "Stok tersisa" : "Stock left"}: {reward.stockQuantity}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-blue-600">
                              {reward.pointsCost} {language === "id" ? "poin" : "points"}
                            </span>
                            <Button
                              size="sm"
                              onClick={() => initiateRedemption(reward)}
                              disabled={loyaltyPoints < reward.pointsCost}
                              className={loyaltyPoints >= reward.pointsCost ? 
                                "bg-blue-600 hover:bg-blue-700" : 
                                "bg-gray-300 cursor-not-allowed"
                              }
                            >
                              {loyaltyPoints >= reward.pointsCost ? 
                                (language === "id" ? "Tukar" : "Redeem") : 
                                (language === "id" ? "Poin Kurang" : "Need more points")
                              }
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Point History */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>{language === "id" ? "Riwayat Poin" : "Point History"}</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-3 mt-4">
                      <select
                        value={pointsFilter}
                        onChange={(e) => setPointsFilter(e.target.value as 'all' | 'earned' | 'redeemed')}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="all">{language === "id" ? "Semua" : "All"}</option>
                        <option value="earned">{language === "id" ? "Diperoleh" : "Earned"}</option>
                        <option value="redeemed">{language === "id" ? "Ditukar" : "Redeemed"}</option>
                      </select>
                      <input
                        type="date"
                        value={pointsDateFilter}
                        onChange={(e) => setPointsDateFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder={language === "id" ? "Filter tanggal" : "Filter by date"}
                      />
                      {(pointsFilter !== 'all' || pointsDateFilter) && (
                        <button
                          onClick={() => {
                            setPointsFilter('all');
                            setPointsDateFilter('');
                          }}
                          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                        >
                          {language === "id" ? "Hapus Filter" : "Clear Filters"}
                        </button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const points = filteredPointHistory || [];
                      const itemsPerPage = 10;
                      const startIndex = (pointsHistoryPage - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const paginatedPoints = points.slice(startIndex, endIndex);
                      const totalPages = Math.ceil(points.length / itemsPerPage);

                      if (points.length === 0) {
                        return (
                          <div className="text-center py-8 text-gray-500">
                            <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No points history yet</p>
                            <p className="text-sm mt-2">Your point earnings and redemptions will appear here</p>
                          </div>
                        );
                      }

                      return (
                        <>
                          <div className="space-y-3">
                            {paginatedPoints.map((history) => (
                              <div key={history.id} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                                <div>
                                  <p className="font-medium text-slate-900">{history.description}</p>
                                  <p className="text-sm text-slate-600">{new Date(history.createdAt).toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                  <span className={`font-bold ${history.type === 'earned' ? 'text-green-600' : 'text-red-600'}`}>
                                    {history.type === 'earned' ? '+' : ''}{history.points} {language === "id" ? "poin" : "points"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Pagination Controls */}
                          {totalPages > 1 && (
                            <div className="flex justify-between items-center pt-4 border-t mt-6">
                              <div className="text-sm text-gray-600">
                                {language === "id" ? "Menampilkan" : "Showing"} {startIndex + 1}-{Math.min(endIndex, points.length)} {language === "id" ? "dari" : "of"} {points.length} {language === "id" ? "item" : "items"}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPointsHistoryPage(Math.max(1, pointsHistoryPage - 1))}
                                  disabled={pointsHistoryPage === 1}
                                >
                                  {language === "id" ? "Sebelumnya" : "Previous"}
                                </Button>
                                <span className="px-3 py-1 text-sm bg-gray-100 rounded flex items-center">
                                  {pointsHistoryPage} / {totalPages}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPointsHistoryPage(Math.min(totalPages, pointsHistoryPage + 1))}
                                  disabled={pointsHistoryPage === totalPages}
                                >
                                  {language === "id" ? "Selanjutnya" : "Next"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>{language === "id" ? "Benefit Level Anda" : "Your Level Benefits"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {currentLevelInfo.benefits.map((benefit, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-slate-700">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Redemption History */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>{language === "id" ? "Riwayat Penukaran" : "Redemption History"}</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-3 mt-4">
                      <select
                        value={redemptionFilter}
                        onChange={(e) => setRedemptionFilter(e.target.value as 'all' | 'completed' | 'used')}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="all">{language === "id" ? "Semua" : "All"}</option>
                        <option value="completed">{language === "id" ? "Selesai" : "Completed"}</option>
                        <option value="used">{language === "id" ? "Digunakan" : "Used"}</option>
                      </select>
                      <input
                        type="date"
                        value={redemptionDateFilter}
                        onChange={(e) => setRedemptionDateFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder={language === "id" ? "Filter tanggal" : "Filter by date"}
                      />
                      {(redemptionFilter !== 'all' || redemptionDateFilter) && (
                        <button
                          onClick={() => {
                            setRedemptionFilter('all');
                            setRedemptionDateFilter('');
                          }}
                          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                        >
                          {language === "id" ? "Hapus Filter" : "Clear Filters"}
                        </button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const redemptions = filteredRedemptionHistory || [];
                      const itemsPerPage = 10;
                      const startIndex = (redemptionHistoryPage - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const paginatedRedemptions = redemptions.slice(startIndex, endIndex);
                      const totalPages = Math.ceil(redemptions.length / itemsPerPage);

                      if (redemptions.length === 0) {
                        return (
                          <div className="text-center py-8 text-gray-500">
                            <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No redemption history yet</p>
                            <p className="text-sm mt-2">Your reward redemptions will appear here</p>
                          </div>
                        );
                      }

                      return (
                        <>
                          <div className="space-y-3">
                            {paginatedRedemptions.map((redemption) => (
                              <div key={redemption.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border">
                                <div>
                                  <p className="font-medium text-sm">{redemption.reward}</p>
                                  <p className="text-xs text-gray-600">{new Date(redemption.createdAt || redemption.date).toLocaleString()}</p>
                                </div>
                                <Badge variant={redemption.status === 'used' ? 'secondary' : 'default'}>
                                  {redemption.status}
                                </Badge>
                              </div>
                            ))}
                          </div>

                          {/* Pagination Controls */}
                          {totalPages > 1 && (
                            <div className="flex justify-between items-center pt-4 border-t mt-6">
                              <div className="text-sm text-gray-600">
                                {language === "id" ? "Menampilkan" : "Showing"} {startIndex + 1}-{Math.min(endIndex, redemptions.length)} {language === "id" ? "dari" : "of"} {redemptions.length} {language === "id" ? "item" : "items"}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setRedemptionHistoryPage(Math.max(1, redemptionHistoryPage - 1))}
                                  disabled={redemptionHistoryPage === 1}
                                >
                                  {language === "id" ? "Sebelumnya" : "Previous"}
                                </Button>
                                <span className="px-3 py-1 text-sm bg-gray-100 rounded flex items-center">
                                  {redemptionHistoryPage} / {totalPages}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setRedemptionHistoryPage(Math.min(totalPages, redemptionHistoryPage + 1))}
                                  disabled={redemptionHistoryPage === totalPages}
                                >
                                  {language === "id" ? "Selanjutnya" : "Next"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Achievement Rules Panel */}
        {showAchievementRules && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800">
                  {language === "id" ? "Aturan Pencapaian & Poin" : "Achievement Rules & Points"}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAchievementRules(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-6">
                {/* Referral Points Section */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    {language === "id" ? "Poin Rujukan" : "Referral Points"}
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">
                        {language === "id" ? "Setiap rujukan berhasil:" : "Each successful referral:"}
                      </span>
                      <span className="font-bold text-blue-600">+50 {language === "id" ? "poin" : "points"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">
                        {language === "id" ? "Bonus setiap 5 rujukan:" : "Bonus every 5 referrals:"}
                      </span>
                      <span className="font-bold text-purple-600">+150 {language === "id" ? "poin" : "points"}</span>
                    </div>
                  </div>
                </div>

                {/* Referral Milestones */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                  <h4 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
                    <Target className="w-5 h-5 mr-2" />
                    {language === "id" ? "Target Rujukan" : "Referral Milestones"}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {allAchievements.filter(a => a.type === 'referral').map((achievement, index) => (
                      <div key={index} className="flex justify-between items-center bg-white rounded p-3 shadow-sm">
                        <span className="text-gray-700 font-medium">{achievement.count} {language === "id" ? "rujukan" : "referrals"}</span>
                        <span className="font-bold text-green-600">
                          {achievement.count === 1 ? '50' : 
                           achievement.count === 5 ? '400' :
                           achievement.count === 10 ? '650' :
                           achievement.count === 15 ? '900' :
                           achievement.count === 20 ? '1150' :
                           achievement.count === 25 ? '1400' :
                           '2650'} {language === "id" ? "poin" : "points"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Spending Achievement */}
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
                  <h4 className="text-lg font-semibold text-orange-800 mb-3 flex items-center">
                    <Star className="w-5 h-5 mr-2" />
                    {language === "id" ? "Pencapaian Belanja" : "Spending Achievement"}
                  </h4>
                  <div className="bg-white rounded p-3 shadow-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-800">
                          {language === "id" ? "Mentor Belanja" : "Shopping Mentor"}
                        </p>
                        <p className="text-sm text-gray-600">
                          {language === "id" 
                            ? "5 rujukan yang masing-masing belanja RP 10,000,000" 
                            : "5 referrals each spending RP 10,000,000"}
                        </p>
                      </div>
                      <span className="font-bold text-orange-600">+100 {language === "id" ? "poin" : "points"}</span>
                    </div>
                  </div>
                </div>

                {/* Current Progress */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                  <h4 className="text-lg font-semibold text-purple-800 mb-3 flex items-center">
                    <Trophy className="w-5 h-5 mr-2" />
                    {language === "id" ? "Progres Saat Ini" : "Current Progress"}
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">
                        {language === "id" ? "Total Rujukan:" : "Total Referrals:"}
                      </span>
                      <span className="font-bold text-purple-600">{userReferrals.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">
                        {language === "id" ? "Total Poin:" : "Total Points:"}
                      </span>
                      <span className="font-bold text-purple-600">{loyaltyPoints}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">
                        {language === "id" ? "Target Berikutnya:" : "Next Milestone:"}
                      </span>
                      <span className="font-bold text-gray-800">
                        {allAchievements.filter(a => a.type === 'referral').find(m => m.count > userReferrals.length)?.count || 
                         (language === "id" ? "Semua tercapai!" : "All completed!")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* How Points Work */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">
                    {language === "id" ? "Cara Kerja Poin" : "How Points Work"}
                  </h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>• {language === "id" ? "Poin diperoleh otomatis saat rujukan berhasil" : "Points are earned automatically when referrals are successful"}</p>
                    <p>• {language === "id" ? "Bonus milestone diberikan setiap kelipatan 5 rujukan" : "Milestone bonuses are given every 5 referrals"}</p>
                    <p>• {language === "id" ? "Poin dapat ditukar dengan kredit atau hadiah" : "Points can be exchanged for credits or rewards"}</p>
                    <p>• {language === "id" ? "Tidak ada batas waktu untuk menggunakan poin" : "No time limit for using points"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === "bookings" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">
                  {language === "id" ? "Manajemen Reservasi" : "Booking Management"}
                </h2>
                <p className="text-slate-600">
                  {language === "id" ? "Kelola reservasi kecantikan, hiburan, dan restoran" : "Manage your beauty, entertainment, and restaurant bookings"}
                </p>
              </div>
            </div>

            {/* Service Categories */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-pink-50 border-pink-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-3">💄</div>
                  <h3 className="text-lg font-semibold text-pink-800 mb-2">
                    {serviceCategories.beauty.name}
                  </h3>
                  <p className="text-sm text-pink-600 mb-4">Hair Spa, Facials, Nails</p>
                  <Badge className="bg-pink-100 text-pink-800">
                    {language === "id" ? "Mulai dari" : "Starting from"} RP {serviceCategories.beauty.startingPrice}
                  </Badge>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-3">🎮</div>
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">
                    {serviceCategories.entertainment.name}
                  </h3>
                  <p className="text-sm text-blue-600 mb-4">Claw Machine, KTV Rooms</p>
                  <Badge className="bg-blue-100 text-blue-800">
                    {language === "id" ? "Mulai dari" : "Starting from"} RP {serviceCategories.entertainment.startingPrice}
                  </Badge>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-3">🍽️</div>
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    {serviceCategories.restaurant.name}
                  </h3>
                  <p className="text-sm text-green-600 mb-4">Breakfast, Lunch, Dinner</p>
                  <Badge className="bg-green-100 text-green-800">
                    {language === "id" ? "Mulai dari" : "Starting from"} RP {serviceCategories.restaurant.startingPrice}
                  </Badge>
                </CardContent>
              </Card>
            </div>

            {/* New Booking Form */}
            <Card>
              <CardHeader>
                <CardTitle>{language === "id" ? "Buat Reservasi Baru" : "Create New Booking"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select onValueChange={(value) => setNewAppointment({...newAppointment, category: value, service: ""})}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === "id" ? "Pilih Kategori" : "Select Category"} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(serviceCategories).map(([key, category]) => (
                        <SelectItem key={key} value={key}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {newAppointment.category && (
                    <Select onValueChange={(value) => setNewAppointment({...newAppointment, service: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder={language === "id" ? "Pilih Layanan" : "Select Service"} />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceCategories[newAppointment.category].options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="date"
                    value={newAppointment.date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setNewAppointment({...newAppointment, date: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />

                  <Select onValueChange={(value) => setNewAppointment({...newAppointment, time: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === "id" ? "Pilih Waktu" : "Select Time"} />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 24}, (_, i) => i).map(hour => (
                        ['00', '30'].map(minute => (
                          <SelectItem key={`${hour}:${minute}`} value={`${hour.toString().padStart(2, '0')}:${minute}`}>
                            {`${hour.toString().padStart(2, '0')}:${minute}`}
                          </SelectItem>
                        ))
                      )).flat()}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={bookAppointment} className="w-full">
                  <Calendar className="w-4 h-4 mr-2" />
                  {language === "id" ? "Buat Reservasi" : "Book Appointment"}
                </Button>
              </CardContent>
            </Card>

            {/* Current Appointments */}
            <Card>
              <CardHeader>
                <CardTitle>{language === "id" ? "Reservasi Anda" : "Your Appointments"}</CardTitle>
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <select
                    value={appointmentsFilter}
                    onChange={(e) => setAppointmentsFilter(e.target.value as 'all' | 'pending' | 'scheduled' | 'completed' | 'cancelled')}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">{language === "id" ? "Semua" : "All"}</option>
                    <option value="pending">{language === "id" ? "Menunggu" : "Pending"}</option>
                    <option value="scheduled">{language === "id" ? "Terjadwal" : "Scheduled"}</option>
                    <option value="completed">{language === "id" ? "Selesai" : "Completed"}</option>
                    <option value="cancelled">{language === "id" ? "Dibatalkan" : "Cancelled"}</option>
                  </select>
                  <input
                    type="date"
                    value={appointmentsDateFilter}
                    onChange={(e) => setAppointmentsDateFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder={language === "id" ? "Filter tanggal" : "Filter by date"}
                  />
                  {(appointmentsFilter !== 'all' || appointmentsDateFilter) && (
                    <button
                      onClick={() => {
                        setAppointmentsFilter('all');
                        setAppointmentsDateFilter('');
                      }}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                      {language === "id" ? "Hapus Filter" : "Clear Filters"}
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const appointments = filteredAppointments || [];
                  const itemsPerPage = 10;
                  const startIndex = (appointmentsPage - 1) * itemsPerPage;
                  const endIndex = startIndex + itemsPerPage;
                  const paginatedAppointments = appointments.slice(startIndex, endIndex);
                  const totalPages = Math.ceil(appointments.length / itemsPerPage);

                  if (appointments.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No appointments yet</p>
                        <p className="text-sm mt-2">Your bookings and appointments will appear here</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="space-y-4">
                        {paginatedAppointments.map((apt) => (
                          <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:bg-gray-50 space-y-3 sm:space-y-0">
                            <div className="flex items-center space-x-3 sm:space-x-4">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-semibold text-slate-900 text-sm sm:text-base truncate">{apt.title}</h4>
                                <p className="text-xs sm:text-sm text-slate-600">{new Date(apt.appointmentDate).toLocaleDateString()} at {new Date(apt.appointmentDate).toLocaleTimeString()}</p>
                                <p className="text-xs sm:text-sm text-slate-500">{apt.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-4">
                              <Badge 
                                className={
                                  apt.status === 'scheduled' ? 'bg-blue-500 text-white hover:bg-blue-600' :
                                  apt.status === 'pending' ? 'bg-yellow-500 text-white hover:bg-yellow-600' :
                                  apt.status === 'cancelled' ? 'bg-red-500 text-white hover:bg-red-600' :
                                  apt.status === 'completed' ? 'bg-green-500 text-white hover:bg-green-600' :
                                  'bg-gray-500 text-white hover:bg-gray-600'
                                }
                              >
                                {apt.status}
                              </Badge>
                              {editingAppointment === apt.id ? (
                                <div className="flex space-x-2">
                                  <input
                                    type="date"
                                    min={new Date().toISOString().split('T')[0]}
                                    defaultValue={apt.date}
                                    onChange={(e) => apt.newDate = e.target.value}
                                    className="w-32 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  />
                                  <Select onValueChange={(value) => apt.newTime = value} defaultValue={apt.time}>
                                    <SelectTrigger className="w-24">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Array.from({length: 24}, (_, i) => i).map(hour => (
                                        ['00', '30'].map(minute => (
                                          <SelectItem key={`${hour}:${minute}`} value={`${hour.toString().padStart(2, '0')}:${minute}`}>
                                            {`${hour.toString().padStart(2, '0')}:${minute}`}
                                          </SelectItem>
                                        ))
                                      )).flat()}
                                    </SelectContent>
                                  </Select>
                                  <Button size="sm" onClick={() => rescheduleAppointment(apt.id, apt.newDate || apt.date, apt.newTime || apt.time)}>
                                    {language === "id" ? "Simpan" : "Save"}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingAppointment(null)}>
                                    {language === "id" ? "Batal" : "Cancel"}
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                  {apt.status !== 'cancelled' && (
                                    <Button size="sm" variant="outline" onClick={() => setEditingAppointment(apt.id)}>
                                      <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
                                      <span className="hidden sm:inline ml-1">{language === "id" ? "Ubah" : "Reschedule"}</span>
                                    </Button>
                                  )}
                                  {apt.status !== 'cancelled' && (
                                    <Button size="sm" variant="destructive" onClick={() => deleteAppointment(apt.id)}>
                                      <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                      <span className="hidden sm:inline ml-1">{language === "id" ? "Batal" : "Cancel"}</span>
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination Controls - Always show to indicate 10-per-page structure */}
                      <div className="flex justify-between items-center pt-4 border-t mt-6">
                        <div className="text-sm text-gray-600">
                          {language === "id" ? "Menampilkan" : "Showing"} {startIndex + 1}-{Math.min(endIndex, appointments.length)} {language === "id" ? "dari" : "of"} {appointments.length} {language === "id" ? "item" : "items"} ({language === "id" ? "10 per halaman" : "10 per page"})
                        </div>
                        {totalPages > 1 && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAppointmentsPage(Math.max(1, appointmentsPage - 1))}
                              disabled={appointmentsPage === 1}
                            >
                              {language === "id" ? "Sebelumnya" : "Previous"}
                            </Button>
                            <span className="px-3 py-1 text-sm bg-gray-100 rounded flex items-center">
                              {appointmentsPage} / {totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAppointmentsPage(Math.min(totalPages, appointmentsPage + 1))}
                              disabled={appointmentsPage === totalPages}
                            >
                              {language === "id" ? "Selanjutnya" : "Next"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Marketplace Tab */}
        {activeTab === "marketplace" && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                {language === "id" ? "Pasar Mainan" : "Toy Marketplace"}
              </h2>
              <p className="text-slate-600">
                {language === "id" ? "Beli mainan lucu dengan kredit Anda" : "Buy cute toys with your credits"}
              </p>
              <Button 
                onClick={() => setShowCreateListingModal(true)} 
                className="mt-4 bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                {language === "id" ? "Jual Mainan Saya" : "Sell My Toy"}
              </Button>
            </div>

            {(() => {
              const listings = marketplaceListings || [];
              const itemsPerPage = 10;
              const startIndex = (marketplacePage - 1) * itemsPerPage;
              const endIndex = startIndex + itemsPerPage;
              const paginatedListings = listings.slice(startIndex, endIndex);
              const totalPages = Math.ceil(listings.length / itemsPerPage);

              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedListings.length > 0 ? paginatedListings.map((listing) => {
                // Check if there's a pending purchase for this listing
                const pendingPurchase = userPendingPurchases?.find(p => p.listingId === listing.id);
                const isOwnListing = listing.sellerId === user?.id;
                
                
                return (
                  <Card key={listing.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="text-center">
                        <div className="mb-4">
                          <img 
                            src={toyImage} 
                            alt={listing.toy?.name || "Toy"} 
                            className="w-24 h-24 mx-auto object-contain"
                          />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">{listing.toy?.name}</h3>
                        <Badge className={getRarityColor(listing.toy?.rarity)} variant="secondary">
                          {listing.toy?.rarity}
                        </Badge>
                        <p className="text-2xl font-bold text-green-600 mt-4 mb-2">
                          RP {parseFloat(listing.price || '0').toLocaleString('id-ID')}
                        </p>
                        <p className="text-sm text-slate-500 mb-4">
                          {language === "id" ? "Dijual oleh" : "Sold by"}: {listing.seller?.firstName || listing.seller?.email?.split('@')[0] || "User"}
                        </p>
                        
                        {isOwnListing ? (
                          <div className="space-y-2">
                            {pendingPurchase && pendingPurchase.status === 'pending_seller_confirmation' ? (
                              <div className="space-y-2">
                                <Badge variant="outline" className="w-full text-blue-600 border-blue-600">
                                  {language === "id" ? "Menunggu Konfirmasi Anda" : "Awaiting Your Confirmation"}
                                </Badge>
                                <div className="flex gap-2">
                                  <Button 
                                    onClick={() => confirmPurchase(pendingPurchase.id)}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                  >
                                    <Check className="w-4 h-4 mr-2" />
                                    {language === "id" ? "Konfirmasi" : "Confirm"}
                                  </Button>
                                  <Button 
                                    onClick={() => cancelSale(pendingPurchase.id)}
                                    variant="outline"
                                    className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
                                  >
                                    <X className="w-4 h-4 mr-2" />
                                    {language === "id" ? "Tolak" : "Cancel"}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Badge variant="outline" className="w-full text-orange-600 border-orange-600">
                                  {language === "id" ? "Milik Anda" : "Your Item"}
                                </Badge>
                                <Button 
                                  onClick={async () => {
                                    try {
                                      const response = await fetch(`/api/listings/${listing.id}`, {
                                        method: 'DELETE',
                                        credentials: 'include'
                                      });
                                      if (response.ok) {
                                        toast({
                                          title: language === "id" ? "Penjualan Dibatalkan" : "Sale Cancelled",
                                          description: language === "id" ? "Listing dihapus dari marketplace" : "Listing removed from marketplace"
                                        });
                                        queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
                                      }
                                    } catch (error) {
                                      console.error('Error cancelling listing:', error);
                                      toast({
                                        title: "Error",
                                        description: "Failed to cancel listing",
                                        variant: "destructive"
                                      });
                                    }
                                  }} 
                                  className="w-full bg-red-600 hover:bg-red-700"
                                  variant="destructive"
                                >
                                  {language === "id" ? "Batalkan Penjualan" : "Cancel Sale"}
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : pendingPurchase && pendingPurchase.buyerId === user?.id ? (
                          <div className="space-y-2">
                            {pendingPurchase.status === 'pending_seller_confirmation' ? (
                              <>
                                <Badge variant="outline" className="w-full text-yellow-600 border-yellow-600">
                                  {language === "id" ? "Menunggu Konfirmasi Penjual" : "Pending Seller Confirmation"}
                                </Badge>
                                <Button 
                                  onClick={() => cancelPurchase(pendingPurchase.id)}
                                  variant="outline"
                                  className="w-full border-red-600 text-red-600 hover:bg-red-50"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  {language === "id" ? "Batalkan Pembelian" : "Cancel Purchase"}
                                </Button>
                              </>
                            ) : (
                              <Badge variant="outline" className="w-full text-blue-600 border-blue-600">
                                {language === "id" ? "Menunggu Konfirmasi Diterima" : "Awaiting Delivery Confirmation"}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <Button 
                            onClick={() => buyToy(listing)} 
                            className="w-full"
                            disabled={userCredits < parseFloat(listing.price || '0')}
                          >
                            {userCredits >= parseFloat(listing.price || '0') ? 
                              (language === "id" ? "Beli" : "Buy") : 
                              (language === "id" ? "Kredit Kurang" : "Not enough credits")
                            }
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              }) : (
                <div className="col-span-full text-center py-12 text-slate-500">
                  <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium mb-2">
                    {language === "id" ? "Belum ada mainan dijual" : "No toys for sale yet"}
                  </h3>
                  <p className="text-sm">
                    {language === "id" ? "Jadilah yang pertama menjual mainan!" : "Be the first to sell a toy!"}
                  </p>
                </div>
              )}
                    </div>

                    {/* Marketplace Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex justify-between items-center pt-6 mt-6">
                        <div className="text-sm text-gray-600">
                          {language === "id" ? "Menampilkan" : "Showing"} {startIndex + 1}-{Math.min(endIndex, listings.length)} {language === "id" ? "dari" : "of"} {listings.length} {language === "id" ? "item" : "items"}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setMarketplacePage(Math.max(1, marketplacePage - 1))}
                            disabled={marketplacePage === 1}
                          >
                            {language === "id" ? "Sebelumnya" : "Previous"}
                          </Button>
                          <span className="px-3 py-1 text-sm bg-gray-100 rounded flex items-center">
                            {marketplacePage} / {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setMarketplacePage(Math.min(totalPages, marketplacePage + 1))}
                            disabled={marketplacePage === totalPages}
                          >
                            {language === "id" ? "Selanjutnya" : "Next"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
          </div>
        )}

        {/* Comprehensive History Tab */}
        {activeTab === "token-history" && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                {language === "id" ? "Riwayat Lengkap" : "Complete History"}
              </h2>
              <p className="text-slate-600">
                {language === "id" ? "Kelola semua riwayat aktivitas Anda" : "Manage all your activity history"}
              </p>
            </div>

            {/* History Type Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { key: 'points', label: language === "id" ? "Poin" : "Points", icon: "🎯" },
                { key: 'credits', label: language === "id" ? "Kredit" : "Credits", icon: "💰" },
                { key: 'tokens', label: language === "id" ? "Token" : "Tokens", icon: "🪙" },
                { key: 'appointments', label: language === "id" ? "Booking" : "Bookings", icon: "📅" },
                { key: 'redemptions', label: language === "id" ? "Penukaran" : "Redemptions", icon: "🎁" }
              ].map((tab) => (
                <Button
                  key={tab.key}
                  variant={historyFilter === tab.key ? "default" : "outline"}
                  onClick={() => {
                    setHistoryFilter(tab.key);
                    setHistoryPage(1);
                  }}
                  className="flex items-center gap-2"
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </Button>
              ))}
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  {language === "id" ? "Filter & Pencarian" : "Filters & Search"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {language === "id" ? "Tanggal Mulai" : "Start Date"}
                    </label>
                    <input
                      type="date"
                      value={dateFilterStart}
                      onChange={(e) => setDateFilterStart(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {language === "id" ? "Tanggal Akhir" : "End Date"}
                    </label>
                    <input
                      type="date"
                      value={dateFilterEnd}
                      onChange={(e) => setDateFilterEnd(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {language === "id" ? "Status" : "Status"}
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="all">{language === "id" ? "Semua" : "All"}</option>
                      <option value="pending">{language === "id" ? "Menunggu" : "Pending"}</option>
                      <option value="completed">{language === "id" ? "Selesai" : "Completed"}</option>
                      <option value="approved">{language === "id" ? "Disetujui" : "Approved"}</option>
                      <option value="rejected">{language === "id" ? "Ditolak" : "Rejected"}</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setDateFilterStart('');
                      setDateFilterEnd('');
                      setStatusFilter('all');
                    }}
                  >
                    {language === "id" ? "Reset Filter" : "Reset Filters"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* History Content */}
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>
                    {historyFilter === 'points' && (language === "id" ? "Riwayat Poin" : "Points History")}
                    {historyFilter === 'credits' && (language === "id" ? "Riwayat Kredit" : "Credits History")}
                    {historyFilter === 'tokens' && (language === "id" ? "Riwayat Token" : "Token History")}
                    {historyFilter === 'appointments' && (language === "id" ? "Riwayat Booking" : "Booking History")}
                    {historyFilter === 'redemptions' && (language === "id" ? "Riwayat Penukaran" : "Redemption History")}
                  </span>
                  <div className="text-sm text-gray-500">
                    {language === "id" ? "Halaman" : "Page"} {historyPage}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* History Content with Pagination */}
                {(() => {
                  let data: any[] = [];
                  
                  switch (historyFilter) {
                    case 'points':
                      data = filteredPointHistory || [];
                      break;
                    case 'credits':
                      data = filteredCreditHistory || [];
                      break;
                    case 'tokens':
                      data = tokenClaimsHistory || [];
                      break;
                    case 'appointments':
                      data = filteredAppointments || [];
                      break;
                    case 'redemptions':
                      data = (filteredPointHistory || []).filter((item: any) => item.type === 'redeemed');
                      break;
                    default:
                      data = [];
                  }

                  // Apply additional date filters if set
                  if (dateFilterStart || dateFilterEnd) {
                    data = data.filter((item: any) => {
                      const itemDate = new Date(item.createdAt || item.requestedAt || item.appointmentDate);
                      const start = dateFilterStart ? new Date(dateFilterStart) : null;
                      const end = dateFilterEnd ? new Date(dateFilterEnd) : null;
                      
                      if (start && itemDate < start) return false;
                      if (end && itemDate > end) return false;
                      return true;
                    });
                  }

                  // Apply status filter if different from existing filters
                  if (statusFilter !== 'all') {
                    data = data.filter((item: any) => item.status === statusFilter);
                  }

                  // Pagination - 10 items per page
                  const itemsPerPage = 10;
                  const startIndex = (historyPage - 1) * itemsPerPage;
                  const endIndex = startIndex + itemsPerPage;
                  const paginatedData = data.slice(startIndex, endIndex);
                  const totalPages = Math.ceil(data.length / itemsPerPage);

                  if (data.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <div className="text-gray-500 mb-4">
                          {historyFilter === 'points' && "📊"}
                          {historyFilter === 'credits' && "💰"}
                          {historyFilter === 'tokens' && "🪙"}
                          {historyFilter === 'appointments' && "📅"}
                          {historyFilter === 'redemptions' && "🎁"}
                        </div>
                        <p className="text-gray-500">
                          {language === "id" ? "Tidak ada data ditemukan" : "No data found"}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {/* Items List */}
                      <div className="space-y-3">
                        {paginatedData.map((item: any, index: number) => (
                          <div key={item.id || index} className="border rounded-lg p-4 bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {historyFilter === 'points' && <span className="text-blue-600">🎯</span>}
                                  {historyFilter === 'credits' && <span className="text-green-600">💰</span>}
                                  {historyFilter === 'tokens' && <span className="text-orange-600">🪙</span>}
                                  {historyFilter === 'appointments' && <span className="text-purple-600">📅</span>}
                                  {historyFilter === 'redemptions' && <span className="text-red-600">🎁</span>}
                                  
                                  <span className="font-semibold">
                                    {historyFilter === 'tokens' ? 
                                      `${item.tokensRequested} ${language === "id" ? "Token" : "Tokens"}` :
                                      item.description || item.serviceName || `${item.points || item.amount || 0}`
                                    }
                                  </span>
                                </div>
                                
                                <p className="text-sm text-gray-600 mb-1">
                                  {new Date(item.createdAt || item.requestedAt || item.appointmentDate).toLocaleDateString(language === "id" ? "id-ID" : "en-US")} at {new Date(item.createdAt || item.requestedAt || item.appointmentDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                
                                {item.adminNotes && (
                                  <p className="text-sm text-blue-600 bg-blue-50 rounded px-2 py-1 mt-2">
                                    {language === "id" ? "Catatan: " : "Notes: "}{item.adminNotes}
                                  </p>
                                )}
                              </div>
                              
                              <div className="text-right">
                                <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                                  item.status === 'completed' || item.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  item.status === 'cancelled' || item.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {item.status === 'completed' ? (language === "id" ? "Selesai" : "Completed") :
                                   item.status === 'approved' ? (language === "id" ? "Disetujui" : "Approved") :
                                   item.status === 'cancelled' ? (language === "id" ? "Dibatalkan" : "Cancelled") :
                                   item.status === 'rejected' ? (language === "id" ? "Ditolak" : "Rejected") :
                                   item.status === 'pending' ? (language === "id" ? "Menunggu" : "Pending") :
                                   (item.status || (language === "id" ? "Tidak diketahui" : "Unknown"))}
                                </div>
                                
                                {(historyFilter === 'points' || historyFilter === 'credits') && (
                                  <div className={`text-sm font-medium mt-1 ${
                                    item.type === 'earned' ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {item.type === 'earned' ? '+' : '-'}{item.points || item.amount || 0}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex justify-between items-center pt-4 border-t">
                          <div className="text-sm text-gray-600">
                            {language === "id" ? "Menampilkan" : "Showing"} {startIndex + 1}-{Math.min(endIndex, data.length)} {language === "id" ? "dari" : "of"} {data.length} {language === "id" ? "item" : "items"}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setHistoryPage(Math.max(1, historyPage - 1))}
                              disabled={historyPage === 1}
                            >
                              {language === "id" ? "Sebelumnya" : "Previous"}
                            </Button>
                            <span className="px-3 py-1 text-sm">
                              {historyPage} / {totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setHistoryPage(Math.min(totalPages, historyPage + 1))}
                              disabled={historyPage === totalPages}
                            >
                              {language === "id" ? "Selanjutnya" : "Next"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === "inventory" && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                {language === "id" ? "Koleksi Mainan Saya" : "My Toy Collection"}
              </h2>
              <p className="text-slate-600">
                {language === "id" ? "Lihat semua mainan yang Anda miliki" : "View all your owned toys"}
              </p>
            </div>


            {/* QR Code Scanner Section */}
            <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-purple-900">
                  {language === "id" ? "Aktifkan Mainan Doluruu" : "Activate Doluruu Toy"}
                </h3>
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder={language === "id" ? "Masukkan QR Code mainan (contoh: QR-87b4a03b003a-07377ac9-53d8fd)" : "Enter toy QR Code (e.g. QR-87b4a03b003a-07377ac9-53d8fd)"}
                      value={newToyCode}
                      onChange={(e) => setNewToyCode(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={addToyByCode} className="bg-purple-600 hover:bg-purple-700">
                      <QrCode className="w-4 h-4 mr-2" />
                      {language === "id" ? "Aktifkan" : "Activate"}
                    </Button>
                  </div>
                  <div className="bg-purple-100 p-4 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-2">
                      {language === "id" ? "Cara Mengaktifkan Mainan:" : "How to Activate Toys:"}
                    </h4>
                    <ol className="text-sm text-purple-700 space-y-1">
                      <li>1. {language === "id" ? "Beli mainan Doluruu dari toko fisik" : "Purchase Doluruu toy from physical store"}</li>
                      <li>2. {language === "id" ? "Temukan QR code unik di kemasan mainan" : "Find unique QR code on toy packaging"}</li>
                      <li>3. {language === "id" ? "Masukkan kode QR yang aman di atas untuk mengaktifkan" : "Enter secure QR code above to activate"}</li>
                      <li>4. {language === "id" ? "Mainan akan ditambahkan ke koleksi digital Anda!" : "Toy will be added to your digital collection!"}</li>
                    </ol>
                    <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-700">
                      <span className="font-semibold">
                        {language === "id" ? "🔒 Sistem Keamanan:" : "🔒 Security System:"}
                      </span>
                      {language === "id" ? " Setiap QR code adalah unik dan tidak dapat ditebak untuk mencegah penambahan mainan tanpa izin." : " Each QR code is unique and unpredictable to prevent unauthorized toy additions."}
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-2 mt-4">
                    {["red", "blue", "orange", "green", "white", "purple", "secret"].map(color => (
                      <div key={color} className="text-center">
                        <div className={`w-8 h-8 rounded-full mx-auto mb-1 ${
                          color === "red" ? "bg-red-500" :
                          color === "blue" ? "bg-blue-500" :
                          color === "orange" ? "bg-orange-500" :
                          color === "green" ? "bg-green-500" :
                          color === "white" ? "bg-gray-200 border border-gray-400" :
                          color === "purple" ? "bg-purple-500" :
                          "bg-gradient-to-r from-purple-600 to-pink-600"
                        }`}></div>
                        <p className="text-xs text-gray-600 capitalize">{color}</p>
                      </div>
                    ))}
                  </div>
                  <div className="text-center text-sm text-purple-600">
                    <p className="font-medium">Season 1 Collection - 7,000 toys available</p>
                    <p className="text-xs mt-1">1,000 secret rarity • 6,000 common rarity</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Show pending purchases first */}
              {console.log("userPendingPurchases:", userPendingPurchases, "user.id:", user?.id)}
              {/* Show purchases waiting for seller confirmation */}
              {userPendingPurchases?.filter(p => p.buyerId === user?.id && p.status === 'pending_seller_confirmation').map((purchase) => (
                <Card key={`pending-seller-${purchase.id}`} className="hover:shadow-lg transition-shadow border-orange-200 bg-orange-50">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="mb-4">
                        <img 
                          src={toyImage} 
                          alt={purchase.toy?.name || "Toy"} 
                          className="w-24 h-24 mx-auto object-contain"
                        />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">{purchase.toy?.name}</h3>
                      <Badge className={getRarityColor(purchase.toy?.rarity)} variant="secondary">
                        {purchase.toy?.rarity}
                      </Badge>
                      <Badge className="mt-2 w-full bg-orange-100 text-orange-800 border-orange-300">
                        {language === "id" ? "Menunggu Konfirmasi Penjual" : "Waiting for Seller"}
                      </Badge>
                      <div className="mt-4 space-y-2">
                        <p className="text-sm text-slate-600">
                          {language === "id" ? "Dibeli" : "Purchased"}: {new Date(purchase.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-lg font-bold text-green-600">
                          RP {parseFloat(purchase.amount || '0').toLocaleString('id-ID')}
                        </p>
                        <div className="w-full bg-gray-100 text-gray-600 p-3 rounded text-sm">
                          {language === "id" ? "Menunggu penjual mengkonfirmasi pengiriman" : "Waiting for seller to confirm shipment"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Show purchases ready for buyer confirmation */}
              {userPendingPurchases?.filter(p => p.buyerId === user?.id && p.status === 'pending_buyer_confirmation').map((purchase) => (
                <Card key={`pending-buyer-${purchase.id}`} className="hover:shadow-lg transition-shadow border-yellow-200 bg-yellow-50">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="mb-4">
                        <img 
                          src={toyImage} 
                          alt={purchase.toy?.name || "Toy"} 
                          className="w-24 h-24 mx-auto object-contain"
                        />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">{purchase.toy?.name}</h3>
                      <Badge className={getRarityColor(purchase.toy?.rarity)} variant="secondary">
                        {purchase.toy?.rarity}
                      </Badge>
                      <Badge className="mt-2 w-full bg-yellow-100 text-yellow-800 border-yellow-300">
                        {language === "id" ? "Menunggu Konfirmasi Diterima" : "Awaiting Delivery Confirmation"}
                      </Badge>
                      <div className="mt-4 space-y-2">
                        <p className="text-sm text-slate-600">
                          {language === "id" ? "Dibeli" : "Purchased"}: {new Date(purchase.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-lg font-bold text-green-600">
                          RP {parseFloat(purchase.amount || '0').toLocaleString('id-ID')}
                        </p>
                        <Button 
                          onClick={() => {
                            // Mark as received by buyer - this completes the transaction
                            confirmPurchaseMutation.mutate(purchase.id);
                            toast({
                              title: language === "id" ? "Transaksi Selesai!" : "Transaction Complete!",
                              description: language === "id" ? "Mainan telah ditambahkan ke koleksi Anda" : "Toy has been added to your collection",
                            });
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          {language === "id" ? "Konfirmasi Diterima" : "Confirm Received"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Show regular toy inventory with pagination */}
              {Array.isArray(toyInventory) && toyInventory.slice((toyInventoryPage - 1) * 10, toyInventoryPage * 10).map((toy) => {
                // Check if this toy has a pending transaction
                const pendingTransaction = Array.isArray(userPendingPurchases) ? userPendingPurchases.find((purchase: any) => 
                  purchase?.toyId === toy?.id && 
                  (purchase?.status === 'pending_seller_confirmation' || 
                   purchase?.status === 'pending_buyer_confirmation')
                ) : null;
                
                // Check if this toy is currently listed in marketplace
                const activeListing = Array.isArray(marketplaceListings) ? marketplaceListings.find((listing: any) => 
                  listing?.toyId === toy?.id && 
                  listing?.sellerId === user?.id &&
                  listing?.status === 'active'
                ) : null;
                
                return (
                  <Card key={toy.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="text-center">
                        {/* Transaction Status Banner */}
                        {pendingTransaction && (
                          <div className="mb-4 p-2 bg-yellow-100 border border-yellow-300 rounded-lg">
                            <div className="flex items-center justify-center text-yellow-800 text-sm font-medium">
                              <Clock className="w-4 h-4 mr-2" />
                              {pendingTransaction.status === 'pending_buyer_confirmation' 
                                ? (language === "id" ? "Menunggu konfirmasi pembeli" : "Waiting for buyer confirmation")
                                : (language === "id" ? "Menunggu konfirmasi penjual" : "Waiting for seller confirmation")
                              }
                            </div>
                            <p className="text-xs text-yellow-700 mt-1">
                              {language === "id" ? "Transaksi sedang berlangsung" : "Transaction in progress"}
                            </p>
                          </div>
                        )}
                        
                        {/* Marketplace Listing Status Banner */}
                        {activeListing && (
                          <div className="mb-4 p-2 bg-green-100 border border-green-300 rounded-lg">
                            <div className="flex items-center justify-center text-green-800 text-sm font-medium">
                              <ShoppingBag className="w-4 h-4 mr-2" />
                              {language === "id" ? "Sedang dijual di marketplace" : "Listed in marketplace"}
                            </div>
                            <p className="text-xs text-green-700 mt-1">
                              {language === "id" ? `Harga: Rp ${parseInt(activeListing.price).toLocaleString('id-ID')}` : `Price: Rp ${parseInt(activeListing.price).toLocaleString('id-ID')}`}
                            </p>
                          </div>
                        )}
                        
                        <div className="mb-4">
                          <img 
                            src={toyImage} 
                            alt={toy.name} 
                            className="w-32 h-32 mx-auto object-contain"
                          />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">{toy.name}</h3>
                        <div className="flex justify-center gap-2 mb-2">
                          <Badge className={getRarityColor(toy.rarity)} variant="secondary">
                            {toy.rarity}
                          </Badge>
                          <Badge variant={toy.isActivated ? "default" : "outline"} className={
                            toy.isActivated 
                              ? "bg-purple-600 hover:bg-purple-700 text-white" 
                              : "border-purple-300 text-purple-700"
                          }>
                            <Heart className="w-3 h-3 mr-1" />
                            {toy.isActivated 
                              ? (language === "id" ? "Pet Aktif" : "Pet Active")
                              : (language === "id" ? "Belum Aktif" : "Not Activated")
                            }
                          </Badge>
                        </div>
                        <div className="mt-4 space-y-2">
                          <p className="text-sm text-slate-600">
                            {language === "id" ? "Diperoleh" : "Acquired"}: {toy.createdAt ? new Date(toy.createdAt).toLocaleString() : toy.acquiredDate}
                          </p>
                          <div className="bg-gray-100 p-2 rounded">
                            <p className="text-xs text-gray-600">QR Code: {toy.qrCode}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {/* Pagination for toy inventory */}
              {Array.isArray(toyInventory) && toyInventory.length > 10 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setToyInventoryPage(prev => Math.max(1, prev - 1))}
                    disabled={toyInventoryPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    {language === "id" ? "Sebelumnya" : "Previous"}
                  </Button>
                  
                  <span className="text-sm text-gray-600">
                    {language === "id" ? "Halaman" : "Page"} {toyInventoryPage} {language === "id" ? "dari" : "of"} {Math.ceil(toyInventory.length / 10)}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setToyInventoryPage(prev => Math.min(Math.ceil(toyInventory.length / 10), prev + 1))}
                    disabled={toyInventoryPage >= Math.ceil(toyInventory.length / 10)}
                  >
                    {language === "id" ? "Selanjutnya" : "Next"}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Purchase Verification Tab */}
        {activeTab === "purchase" && (
          <PurchaseVerificationSection language={language} user={user} />
        )}

        {/* Referrals Tab */}
        {activeTab === "referrals" && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                {language === "id" ? "Program Rujukan" : "Referral Program"}
              </h2>
              <p className="text-slate-600">
                {language === "id" ? "Undang teman dan dapatkan komisi" : "Invite friends and earn commissions"}
              </p>
            </div>

            {/* Referral Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <p className="text-2xl font-bold text-green-800">{genealogyData?.totalDirectReferrals || 0}</p>
                  <p className="text-sm text-green-600">
                    {language === "id" ? "Rujukan Langsung" : "Direct Referrals"}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-6 text-center">
                  <DollarSign className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                  <p className="text-2xl font-bold text-blue-800">RP {formatRupiah(referralEarnings)}</p>
                  <p className="text-sm text-blue-600">
                    {language === "id" ? "Total Pendapatan" : "Total Earnings"}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-6 text-center">
                  <Trophy className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                  <p className="text-2xl font-bold text-purple-800">Level 1</p>
                  <p className="text-sm text-purple-600">
                    {language === "id" ? "Level Rujukan" : "Referrer Level"}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-6 text-center">
                  <Gift className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
                  <p className="text-2xl font-bold text-yellow-800">10%</p>
                  <p className="text-sm text-yellow-600">
                    {language === "id" ? "Tingkat Komisi" : "Commission Rate"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Your Referral Code */}
              <Card className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                <CardHeader>
                  <CardTitle className="text-white">
                    {language === "id" ? "Bagikan Kode Rujukan" : "Share Your Referral Code"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-white/20 rounded-lg p-4 mb-4 text-center">
                    <p className="text-4xl font-bold font-mono mb-2">{referralCode}</p>
                    <p className="text-blue-100">
                      {language === "id" ? "Bagikan untuk dapat komisi 10%" : "Share to earn 10% commission"}
                    </p>
                  </div>
                  <Button 
                    onClick={copyReferralCode}
                    className="w-full bg-white/20 hover:bg-white/30 text-white mb-4"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {language === "id" ? "Salin Kode" : "Copy Code"}
                  </Button>
                  <div className="bg-white/20 rounded-lg p-4 text-center">
                    <QrCode className="w-24 h-24 mx-auto text-white/80 mb-2" />
                    <p className="text-sm text-white/80">
                      {language === "id" ? "Pindai QR Code untuk rujukan" : "Scan QR Code for referral"}
                    </p>
                    <p className="text-xs text-white/60 mt-1">
                      Code: {referralCode}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Commission Structure */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {language === "id" ? "Struktur Komisi" : "Commission Structure"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                      <span className="font-medium">
                        {language === "id" ? "Rujukan Langsung" : "Direct Referrals"}
                      </span>
                    </div>
                    <span className="font-bold text-green-600 text-xl">10%</span>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-2">
                      <p className="text-lg font-semibold text-slate-700">
                        {language === "id" ? "Total Rujukan: " : "Total Referrals: "}
                        <span className="text-green-600">{userStats?.referrals?.length || 0}</span>
                      </p>
                      <p className="text-sm text-slate-600">
                        {language === "id" ? "Total Pendapatan: " : "Total Earnings: "}
                        <span className="font-bold text-green-600">RP {formatRupiah(userStats?.referralEarnings || 0)}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <GenealogyTree />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Pet Care Tab */}
        {activeTab === "petcare" && (
          <PetCareSection language={language} user={user} />
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                {language === "id" ? "Profil Anda" : "Your Profile"}
              </h2>
              <p className="text-slate-600">
                {language === "id" ? "Kelola pengaturan akun dan preferensi" : "Manage your account settings and preferences"}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Profile Overview */}
              <Card className="lg:col-span-1">
                <CardContent className="p-8 text-center">
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
                    ) : (
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">
                          {(user?.firstName || user?.email?.split('@')[0] || 'U')[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <Button 
                      size="sm" 
                      className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                      onClick={() => document.getElementById('profile-image').click()}
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                    <input 
                      id="profile-image" 
                      type="file" 
                      accept="image/*" 
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (e) => setProfileImage(e.target?.result);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">
                    {user?.firstName || 'Candy'} {user?.lastName || 'Heng'}
                  </h3>
                  <p className="text-slate-600 mb-2">{user?.email || 'candy@example.com'}</p>
                  <p className="text-slate-600 mb-4">{phoneNumber}</p>
                  <Badge className="bg-blue-100 text-blue-800 mb-4">
                    {currentLevelInfo.name}
                  </Badge>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>{language === "id" ? "Member Sejak:" : "Member Since:"}</span>
                      <span className="font-medium">May 2025</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{language === "id" ? "Total Poin:" : "Total Points:"}</span>
                      <span className="font-medium">{lifetimePoints}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{language === "id" ? "Level Saat Ini:" : "Current Level:"}</span>
                      <span className="font-medium">Level {currentLevelInfo.level}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Settings */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>{language === "id" ? "Pengaturan Akun" : "Account Settings"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-4">
                      {language === "id" ? "Informasi Pribadi" : "Personal Information"}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {language === "id" ? "Nama Depan" : "First Name"}
                        </label>
                        <Input 
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          readOnly={!editingProfile}
                          className={editingProfile ? "" : "bg-gray-50"}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {language === "id" ? "Nama Belakang" : "Last Name"}
                        </label>
                        <Input 
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          readOnly={!editingProfile}
                          className={editingProfile ? "" : "bg-gray-50"}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                        <Input 
                          defaultValue={user?.email || 'candy@example.com'} 
                          type="email" 
                          readOnly={!editingProfile}
                          className={editingProfile ? "" : "bg-gray-50"}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {language === "id" ? "Nomor Telepon" : "Phone Number"}
                        </label>
                        <Input 
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          readOnly={!editingProfile}
                          className={editingProfile ? "" : "bg-gray-50"}
                          placeholder="+62 812-3456-7890"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {language === "id" ? "Jenis Kelamin" : "Gender"}
                        </label>
                        <select 
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          disabled={!editingProfile}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md ${editingProfile ? "" : "bg-gray-50"}`}
                        >
                          <option value="">{language === "id" ? "Pilih jenis kelamin" : "Select gender"}</option>
                          <option value="male">{language === "id" ? "Laki-laki" : "Male"}</option>
                          <option value="female">{language === "id" ? "Perempuan" : "Female"}</option>
                          <option value="other">{language === "id" ? "Lainnya" : "Other"}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {language === "id" ? "Tanggal Lahir" : "Date of Birth"}
                        </label>
                        <Input 
                          type="date"
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          readOnly={!editingProfile}
                          className={editingProfile ? "" : "bg-gray-50"}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preferences */}
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-4">
                      {language === "id" ? "Preferensi" : "Preferences"}
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {language === "id" ? "Notifikasi Email" : "Email Notifications"}
                          </p>
                          <p className="text-sm text-slate-600">
                            {language === "id" ? "Terima update tentang janji dan promosi" : "Receive updates about appointments and promotions"}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setShowEmailModal(true)}>
                          {language === "id" ? "Kelola" : "Manage"}
                        </Button>
                      </div>

                    </div>
                  </div>

                  {/* Account Actions */}
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-4">
                      {language === "id" ? "Aksi Akun" : "Account Actions"}
                    </h4>
                    <div className="space-y-3">
                      {editingProfile ? (
                        <div className="flex space-x-3">
                          <Button onClick={saveProfile} className="flex-1 bg-blue-600 hover:bg-blue-700">
                            {language === "id" ? "Simpan Perubahan" : "Save Changes"}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setEditingProfile(false)}
                            className="flex-1"
                          >
                            {language === "id" ? "Batal" : "Cancel"}
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          onClick={() => setEditingProfile(true)}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          {language === "id" ? "Edit Profil" : "Edit Profile"}
                        </Button>
                      )}
                      <Button variant="outline" className="w-full" onClick={() => setShowPasswordModal(true)}>
                        {language === "id" ? "Ubah Password" : "Change Password"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Account Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>{language === "id" ? "Statistik Akun" : "Account Statistics"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">RP {formatRupiah(userCredits)}</p>
                    <p className="text-sm text-slate-600">
                      {language === "id" ? "Kredit Saat Ini" : "Current Credits"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{loyaltyPoints}</p>
                    <p className="text-sm text-slate-600">
                      {language === "id" ? "Poin Loyalitas" : "Loyalty Points"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{userAppointments.length}</p>
                    <p className="text-sm text-slate-600">
                      {language === "id" ? "Total Reservasi" : "Total Bookings"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">RP {formatRupiah(referralEarnings)}</p>
                    <p className="text-sm text-slate-600">
                      {language === "id" ? "Pendapatan Rujukan" : "Referral Earnings"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </div>

      {/* Purchase Confirmation Dialog */}
      {showPurchaseConfirmation && selectedPurchaseListing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {language === "id" ? "Konfirmasi Pembelian" : "Confirm Purchase"}
              </h3>
              <p className="text-slate-600 mb-4">
                {language === "id" ? "Apakah Anda yakin ingin membeli" : "Are you sure you want to buy"}
              </p>
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <div className="mb-2">
                  <img 
                    src={toyImage} 
                    alt={selectedPurchaseListing.toy?.name || "Toy"} 
                    className="w-16 h-16 mx-auto object-contain"
                  />
                </div>
                <h4 className="font-bold text-slate-900">{selectedPurchaseListing.toy?.name}</h4>
                <p className="text-xl font-bold text-green-600 mt-2">
                  RP {parseFloat(selectedPurchaseListing.price || '0').toLocaleString('id-ID')}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  +{Math.floor(parseFloat(selectedPurchaseListing.price || '0') / 10000)} {language === "id" ? "poin loyalitas" : "loyalty points"}
                </p>
                <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs text-blue-600">
                    <strong>{language === "id" ? "Catatan:" : "Note:"}</strong> {language === "id" 
                      ? "Termasuk biaya admin 10%. Penjual menerima 90% dari harga jual."
                      : "Includes 10% admin fee. Seller receives 90% of the sale price."
                    }
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                {language === "id" 
                  ? "Kredit akan dipotong sekarang. Penjual harus mengkonfirmasi untuk menyelesaikan transaksi."
                  : "Credits will be deducted now. Seller must confirm to complete the transaction."
                }
              </p>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowPurchaseConfirmation(false);
                  setSelectedPurchaseListing(null);
                }}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                {language === "id" ? "Batal" : "Cancel"}
              </Button>
              <Button 
                onClick={confirmPurchaseDialog}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-2" />
                {language === "id" ? "Ya, Beli" : "Yes, Buy"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Credit History Modal */}
      {showCreditHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Credit History</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCreditHistory(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Credit History Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <select
                value={creditFilter}
                onChange={(e) => setCreditFilter(e.target.value as 'all' | 'earned' | 'spent')}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">{language === "id" ? "Semua" : "All"}</option>
                <option value="earned">{language === "id" ? "Diperoleh" : "Earned"}</option>
                <option value="spent">{language === "id" ? "Digunakan" : "Spent"}</option>
              </select>
              <input
                type="date"
                value={creditDateFilter}
                onChange={(e) => setCreditDateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder={language === "id" ? "Filter tanggal" : "Filter by date"}
              />
              {(creditFilter !== 'all' || creditDateFilter) && (
                <button
                  onClick={() => {
                    setCreditFilter('all');
                    setCreditDateFilter('');
                  }}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  {language === "id" ? "Hapus Filter" : "Clear Filters"}
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {(() => {
                const credits = filteredCreditHistory || [];
                const itemsPerPage = 10;
                const startIndex = (creditHistoryPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const paginatedCredits = credits.slice(startIndex, endIndex);
                const totalPages = Math.ceil(credits.length / itemsPerPage);

                if (credits.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No transaction history yet</p>
                      <p className="text-sm mt-2">Your purchases and sales will appear here</p>
                    </div>
                  );
                }

                return (
                  <>
                    <div className="space-y-3">
                      {paginatedCredits.map((entry: any) => (
                        <div key={entry.id} className="border rounded-lg p-4 bg-green-50">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{entry.description}</p>
                              <p className="text-sm text-gray-600">
                                {new Date(entry.createdAt).toLocaleDateString()} at {new Date(entry.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${entry.type === 'spent' ? 'text-red-600' : 'text-green-600'}`}>
                                {entry.type === 'spent' ? '-' : '+'}RP {entry.amount.toLocaleString('id-ID')}
                              </p>
                              <p className="text-sm text-gray-600 capitalize">
                                {entry.type}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex justify-between items-center pt-4 border-t mt-6">
                        <div className="text-sm text-gray-600">
                          {language === "id" ? "Menampilkan" : "Showing"} {startIndex + 1}-{Math.min(endIndex, credits.length)} {language === "id" ? "dari" : "of"} {credits.length} {language === "id" ? "item" : "items"}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCreditHistoryPage(Math.max(1, creditHistoryPage - 1))}
                            disabled={creditHistoryPage === 1}
                          >
                            {language === "id" ? "Sebelumnya" : "Previous"}
                          </Button>
                          <span className="px-3 py-1 text-sm bg-gray-100 rounded flex items-center">
                            {creditHistoryPage} / {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCreditHistoryPage(Math.min(totalPages, creditHistoryPage + 1))}
                            disabled={creditHistoryPage === totalPages}
                          >
                            {language === "id" ? "Selanjutnya" : "Next"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Gamified Achievement Pop-up */}
      {showAchievement && currentAchievement && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] animate-in fade-in duration-300">
          <div className="relative bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl transform animate-in zoom-in-50 duration-500">
            {/* Decorative elements */}
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
              <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${currentAchievement.color} flex items-center justify-center shadow-lg animate-bounce`}>
                <currentAchievement.icon className="w-8 h-8 text-white" />
              </div>
            </div>
            
            {/* Sparkle effects */}
            <div className="absolute top-4 left-4 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
            <div className="absolute top-8 right-6 w-1 h-1 bg-yellow-400 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
            <div className="absolute bottom-8 left-8 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
            <div className="absolute bottom-6 right-4 w-1 h-1 bg-yellow-400 rounded-full animate-ping" style={{animationDelay: '1.5s'}}></div>
            
            <div className="mt-8 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {language === "id" ? "🎉 Pencapaian Baru!" : "🎉 Achievement Unlocked!"}
              </h2>
              <div className={`inline-block px-4 py-2 rounded-full ${currentAchievement.bgColor} ${currentAchievement.borderColor} border-2 mb-4`}>
                <h3 className="text-lg font-bold text-gray-800">{currentAchievement.title}</h3>
              </div>
              <p className="text-gray-600 mb-4">{currentAchievement.description}</p>
              
              {/* Reward section */}
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  {language === "id" ? "🏆 Hadiah Anda:" : "🏆 Your Reward:"}
                </p>
                <p className="text-lg font-bold text-amber-900">{currentAchievement.reward}</p>
              </div>
              
              {/* Progress indicator */}
              <div className="bg-gray-100 rounded-lg p-3 mb-6">
                <p className="text-sm text-gray-600 mb-2">
                  {language === "id" ? "Progres Rujukan:" : "Referral Progress:"}
                </p>
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-2xl font-bold text-purple-600">{userReferrals.length}</span>
                  <span className="text-gray-500">/</span>
                  <span className="text-lg text-gray-400">
                    {allAchievements.filter(a => a.type === 'referral').find(m => m.count > userReferrals.length)?.count || "∞"}
                  </span>
                  <Users className="w-5 h-5 text-purple-600 ml-2" />
                </div>
              </div>
            </div>
            
            <Button 
              onClick={closeAchievement}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg transform transition-all duration-200 hover:scale-105"
            >
              {language === "id" ? "Luar Biasa!" : "Awesome!"}
            </Button>
            
            {/* Queue indicator */}
            {achievementQueue.length > 0 && (
              <p className="text-xs text-gray-500 mt-3">
                {language === "id" 
                  ? `${achievementQueue.length} pencapaian lagi menunggu...` 
                  : `${achievementQueue.length} more achievements waiting...`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {language === "id" ? "Ubah Password" : "Change Password"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === "id" ? "Password Saat Ini" : "Current Password"}
                </label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={language === "id" ? "Masukkan password saat ini" : "Enter current password"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === "id" ? "Password Baru" : "New Password"}
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={language === "id" ? "Masukkan password baru" : "Enter new password"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === "id" ? "Konfirmasi Password Baru" : "Confirm New Password"}
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={language === "id" ? "Konfirmasi password baru" : "Confirm new password"}
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <Button
                onClick={changePassword}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={!currentPassword || !newPassword || !confirmPassword}
              >
                {language === "id" ? "Ubah Password" : "Change Password"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordModal(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className="flex-1"
              >
                {language === "id" ? "Batal" : "Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Email Notification Settings Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {language === "id" ? "Pengaturan Notifikasi" : "Notification Settings"}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {language === "id" ? "Notifikasi Email" : "Email Notifications"}
                  </label>
                  <p className="text-xs text-gray-500">
                    {language === "id" ? "Terima update melalui email" : "Receive updates via email"}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {language === "id" ? "Notifikasi SMS" : "SMS Notifications"}
                  </label>
                  <p className="text-xs text-gray-500">
                    {language === "id" ? "Terima update melalui SMS" : "Receive updates via SMS"}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={smsNotifications}
                  onChange={(e) => setSmsNotifications(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <Button
                onClick={saveNotificationSettings}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {language === "id" ? "Simpan" : "Save"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEmailModal(false)}
                className="flex-1"
              >
                {language === "id" ? "Batal" : "Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reward Redemption Confirmation Modal */}
      {showRedeemConfirmation && selectedReward && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {language === "id" ? "Konfirmasi Tukar Reward" : "Confirm Reward Redemption"}
            </h3>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl mb-2">
                  {getRewardIcon(selectedReward.imageUrl)}
                </div>
                <h4 className="font-medium text-lg">{selectedReward.name}</h4>
                {selectedReward.description && (
                  <p className="text-sm text-gray-600 mt-1">{selectedReward.description}</p>
                )}
                <div className="bg-blue-50 rounded-lg p-3 mt-3">
                  <p className="text-sm text-gray-700">
                    {language === "id" ? "Biaya" : "Cost"}: <span className="font-bold text-blue-600">{selectedReward.pointsCost} {language === "id" ? "poin" : "points"}</span>
                  </p>
                  {selectedReward.type === 'credit' && selectedReward.creditAmount && (
                    <p className="text-sm text-green-700 mt-1">
                      {language === "id" ? "Anda akan menerima" : "You will receive"}: <span className="font-bold text-green-600">RP {selectedReward.creditAmount}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <Button
                onClick={confirmRedemption}
                disabled={isRedeeming}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isRedeeming ? 
                  (language === "id" ? "Menukar..." : "Redeeming...") : 
                  (language === "id" ? "Ya, Tukar" : "Yes, Redeem")
                }
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRedeemConfirmation(false);
                  setSelectedReward(null);
                }}
                disabled={isRedeeming}
                className="flex-1"
              >
                {language === "id" ? "Batal" : "Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Token Claim Modal */}
      {showTokenClaimModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {language === "id" ? "Klaim Token Fisik" : "Claim Physical Tokens"}
            </h3>
            <p className="text-gray-600 mb-4">
              {language === "id" 
                ? `Anda memiliki ${userTokens} token. Berapa yang ingin diklaim untuk ditukar di lokasi yang disetujui?`
                : `You have ${userTokens} tokens. How many would you like to claim for redemption at approved locations?`
              }
            </p>
            <div className="bg-blue-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-700">
                {language === "id" 
                  ? "Token akan ditukar di lokasi yang disetujui. Tidak ada pengiriman diperlukan."
                  : "Tokens will be redeemed at approved locations. No shipping required."
                }
              </p>
            </div>
            <input
              type="number"
              min="1"
              max={userTokens}
              value={tokenClaimAmount}
              onChange={(e) => setTokenClaimAmount(e.target.value)}
              placeholder={language === "id" ? "Jumlah token" : "Number of tokens"}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
            />

            <div className="flex gap-3">
              <Button 
                onClick={() => {
                  const amount = parseInt(tokenClaimAmount);
                  if (amount > 0 && amount <= userTokens) {
                    claimTokensMutation.mutate({ 
                      tokensRequested: amount
                    });
                  }
                }}
                disabled={!tokenClaimAmount || parseInt(tokenClaimAmount) <= 0 || parseInt(tokenClaimAmount) > userTokens || claimTokensMutation.isPending}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                {claimTokensMutation.isPending 
                  ? (language === "id" ? "Memproses..." : "Processing...") 
                  : (language === "id" ? "Ajukan Klaim" : "Submit Claim")
                }
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setShowTokenClaimModal(false);
                  setTokenClaimAmount("");
                }}
                className="flex-1"
              >
                {language === "id" ? "Batal" : "Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Token History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {language === "id" ? "Riwayat Token" : "Token History"}
              </h3>
              <Button variant="ghost" onClick={() => setShowHistoryModal(false)}>✕</Button>
            </div>

            <div className="space-y-4">
              {(() => {
                const claims = tokenClaimsHistory || [];
                const itemsPerPage = 10;
                const startIndex = (modalHistoryPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const paginatedClaims = claims.slice(startIndex, endIndex);
                const totalPages = Math.ceil(claims.length / itemsPerPage);

                console.log("Token History Modal Debug:", {
                  totalClaims: claims.length,
                  itemsPerPage,
                  currentPage: modalHistoryPage,
                  totalPages,
                  startIndex,
                  endIndex,
                  paginatedClaims: paginatedClaims.length
                });

                if (claims.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <div className="text-gray-500 mb-4 text-4xl">🪙</div>
                      <p className="text-gray-500">
                        {language === "id" ? "Tidak ada riwayat token" : "No token history"}
                      </p>
                    </div>
                  );
                }

                return (
                  <>
                    <div className="space-y-3">
                      {paginatedClaims.map((transaction: any, index: number) => (
                        <div key={transaction.id || index} className={`border rounded-lg p-4 ${
                          transaction.tokens !== undefined ? 
                            (transaction.tokens > 0 ? 'bg-green-50' : 'bg-red-50') :
                            (transaction.type === 'token_claim' || (transaction.pointsEarned && transaction.pointsEarned > 0) ? 'bg-green-50' : 
                             transaction.type === 'pet_name_change' || transaction.type === 'energy_potion' ? 'bg-red-50' : 'bg-orange-50')
                        }`}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={
                                  transaction.tokens !== undefined ? 
                                    (transaction.tokens > 0 ? 'text-green-600' : 'text-red-600') :
                                    (transaction.type === 'token_claim' || (transaction.pointsEarned && transaction.pointsEarned > 0) ? 'text-green-600' : 'text-red-600')
                                }>
                                  {transaction.tokens !== undefined ? 
                                    (transaction.tokens > 0 ? '➕' : '➖') :
                                    (transaction.type === 'token_claim' || (transaction.pointsEarned && transaction.pointsEarned > 0) ? '➕' : '➖')
                                  }
                                </span>
                                <span className="font-semibold">
                                  {transaction.tokens !== undefined ? 
                                    `${transaction.tokens > 0 ? '+' : ''}${transaction.tokens}` : 
                                    `${transaction.tokensRequested || transaction.tokensAwarded || 0 > 0 ? '+' : ''}${transaction.tokensRequested || transaction.tokensAwarded || 0}`
                                  } {language === "id" ? "Token" : "Tokens"}
                                </span>
                              </div>
                              <p className="text-sm text-gray-800 mb-1">
                                {transaction.description || 
                                 (transaction.type === 'token_claim' ? `Token claim: ${transaction.tokensAwarded} tokens` : 'Token transaction')}
                              </p>
                              <p className="text-sm text-gray-600 mb-1">
                                {new Date(transaction.createdAt || transaction.requestedAt).toLocaleString(language === "id" ? "id-ID" : "en-US", {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                              {(transaction.adminNotes || transaction.notes) && (
                                <p className="text-sm text-blue-600 bg-blue-50 rounded px-2 py-1 mt-2">
                                  {language === "id" ? "Catatan: " : "Notes: "}{transaction.adminNotes || transaction.notes}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                                transaction.status === 'approved' || transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                                transaction.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {transaction.status === 'approved' || transaction.status === 'completed' ? (language === "id" ? "Selesai" : "Completed") :
                                 transaction.status === 'rejected' ? (language === "id" ? "Ditolak" : "Rejected") :
                                 (language === "id" ? "Menunggu" : "Pending")}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex justify-between items-center pt-4 border-t mt-6">
                        <div className="text-sm text-gray-600">
                          {language === "id" ? "Menampilkan" : "Showing"} {startIndex + 1}-{Math.min(endIndex, claims.length)} {language === "id" ? "dari" : "of"} {claims.length} {language === "id" ? "item" : "items"}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setModalHistoryPage(Math.max(1, modalHistoryPage - 1))}
                            disabled={modalHistoryPage === 1}
                          >
                            {language === "id" ? "Sebelumnya" : "Previous"}
                          </Button>
                          <span className="px-3 py-1 text-sm bg-gray-100 rounded flex items-center">
                            {modalHistoryPage} / {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setModalHistoryPage(Math.min(totalPages, modalHistoryPage + 1))}
                            disabled={modalHistoryPage === totalPages}
                          >
                            {language === "id" ? "Selanjutnya" : "Next"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}



      {/* Credit Top-Up Modal */}
      <CreditTopUpModal 
        isOpen={showCreditTopUpModal}
        onClose={() => setShowCreditTopUpModal(false)}
        currentCredits={userCredits.toString()}
      />
    </div>
  );
}