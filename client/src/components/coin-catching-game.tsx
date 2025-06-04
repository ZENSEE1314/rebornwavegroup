import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Trophy } from "lucide-react";

interface CoinCatchingGameProps {
  pet: any;
  language: string;
  onClose: () => void;
  user: any;
}

export default function CoinCatchingGame({ pet, language, onClose, user }: CoinCatchingGameProps) {
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
          prev.map(coin => ({ ...coin, y: coin.y + coin.speed }))
              .filter(coin => coin.y < 100) // Remove coins that fall off screen
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
    setShowLeaderboard(false);
  };

  const endGame = async () => {
    setGameOver(true);
    setGameStarted(false);
    setCoins([]);

    // Save score to database
    try {
      await apiRequest("POST", "/api/game-scores", {
        userId: user?.id,
        petId: pet?.id,
        score: score,
        gameType: 'coin-catching'
      });
      
      // Award tokens based on score
      const tokensEarned = Math.floor(score / 10);
      if (tokensEarned > 0) {
        await apiRequest("POST", "/api/users/tokens", {
          amount: tokensEarned
        });
        
        toast({
          title: language === "id" ? "Permainan Selesai!" : "Game Complete!",
          description: language === "id" 
            ? `Skor: ${score}. Token yang diperoleh: ${tokensEarned}`
            : `Score: ${score}. Tokens earned: ${tokensEarned}`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/game-scores/leaderboard"] });
    } catch (error) {
      console.error("Error saving game score:", error);
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

        {gameStarted && !gameOver && (
          <div className="space-y-4">
            <div className="flex justify-between text-lg font-bold">
              <span>{language === "id" ? "Skor" : "Score"}: {score}</span>
              <span>{language === "id" ? "Waktu" : "Time"}: {timeLeft}s</span>
            </div>
            
            <div 
              className="relative bg-blue-100 rounded-lg h-64 overflow-hidden cursor-pointer"
              style={{ position: 'relative' }}
            >
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
              
              {coins.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                  {language === "id" ? "Tunggu koin jatuh..." : "Wait for coins to fall..."}
                </div>
              )}
            </div>
          </div>
        )}

        {gameOver && (
          <div className="text-center space-y-4">
            <div className="text-4xl">🏁</div>
            <h4 className="text-xl font-bold">
              {language === "id" ? "Permainan Selesai!" : "Game Over!"}
            </h4>
            <p className="text-lg">
              {language === "id" ? "Skor Akhir" : "Final Score"}: <span className="font-bold">{score}</span>
            </p>
            <p className="text-sm text-gray-600">
              {language === "id" 
                ? `Token yang diperoleh: ${Math.floor(score / 10)}`
                : `Tokens earned: ${Math.floor(score / 10)}`}
            </p>
            <div className="space-y-2">
              <Button onClick={startGame} className="w-full">
                {language === "id" ? "Main Lagi" : "Play Again"}
              </Button>
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

        {showLeaderboard && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold flex items-center">
                <Trophy className="h-5 w-5 mr-2" />
                {language === "id" ? "Papan Peringkat" : "Leaderboard"}
              </h4>
              <Button 
                variant="ghost" 
                onClick={() => setShowLeaderboard(false)}
                size="sm"
              >
                {language === "id" ? "Kembali" : "Back"}
              </Button>
            </div>
            
            <div className="max-h-48 overflow-y-auto">
              {Array.isArray(leaderboard) && leaderboard.length > 0 ? (
                <div className="space-y-2">
                  {leaderboard.slice(0, 10).map((entry: any, index: number) => (
                    <div 
                      key={entry.id} 
                      className={`flex justify-between items-center p-2 rounded ${
                        index === 0 ? 'bg-yellow-100' : 
                        index === 1 ? 'bg-gray-100' : 
                        index === 2 ? 'bg-orange-100' : 'bg-white'
                      }`}
                    >
                      <span className="flex items-center">
                        <span className="w-6 text-center font-bold">
                          {index + 1}
                        </span>
                        {entry.user?.firstName || 'Anonymous'}
                      </span>
                      <span className="font-bold">{entry.score}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  {language === "id" ? "Belum ada skor" : "No scores yet"}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}