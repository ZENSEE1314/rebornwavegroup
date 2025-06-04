import { useState, useEffect, useMemo } from "react";
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
  Heart, Droplets, Bed, Sparkles, ArrowLeft, ArrowRight
} from "lucide-react";
import logoImage from "@assets/2-removebg-preview.png";
import toyImage from "@assets/Plush_Dinosaur_with_Colorful_Spikes-removebg-preview.png";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GenealogyTree from "@/components/genealogy-tree";
import { getCategorySymbol, getSymbolById } from "@/lib/rewardSymbols";
import CoinCatchingGame from "@/components/coin-catching-game";

interface CompleteAppProps {
  user: any;
  language: string;
}

// Helper function to format sleep timer as MM:SS
function formatSleepTime(timeRemaining: number): string {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export default function CompleteApp({ user, language }: CompleteAppProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [currentPetIndex, setCurrentPetIndex] = useState(0);
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [showCoinGame, setShowCoinGame] = useState(false);

  // Real-time timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch user data
  const { data: userData } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Fetch user stats
  const { data: userStats } = useQuery({
    queryKey: ["/api/user-stats"],
  });

  // Fetch pets
  const { data: pets = [] } = useQuery({
    queryKey: ["/api/pets"],
  });

  // Fetch marketplace listings
  const { data: listings = [] } = useQuery({
    queryKey: ["/api/marketplace/listings"],
  });

  // Fetch referral data
  const { data: referralData } = useQuery({
    queryKey: ["/api/referrals"],
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

  // Get current pet for single-pet display
  const currentPet = pets.length > 0 ? pets[currentPetIndex] : null;

  const renderPetCareSection = () => {
    if (!currentPet) {
      return (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">
              {language === "id" ? "Tidak ada hewan peliharaan yang diaktifkan" : "No activated pets"}
            </p>
          </CardContent>
        </Card>
      );
    }

    const petAge = currentPet.currentAge || 0;
    const isToddler = petAge < 7;
    const isDead = currentPet.happiness <= 0 || currentPet.hunger <= 0 || currentPet.cleanliness <= 0 || currentPet.energy <= 0;
    const isSleeping = currentPet.isSleeping;

    // Calculate sleep progress
    const sleepDuration = 8 * 60; // 8 minutes in seconds
    const sleepStartTime = currentPet.sleepStartTime ? new Date(currentPet.sleepStartTime).getTime() : null;
    const sleepProgress = sleepStartTime ? Math.min(100, ((currentTime - sleepStartTime) / 1000 / sleepDuration) * 100) : 0;
    const sleepCountdown = sleepStartTime ? Math.max(0, sleepDuration - ((currentTime - sleepStartTime) / 1000)) : 0;

    const happiness = Math.max(0, currentPet.happiness || 0);
    const hunger = Math.max(0, currentPet.hunger || 0);
    const cleanliness = Math.max(0, currentPet.cleanliness || 0);
    const energy = Math.max(0, currentPet.energy || 0);

    return (
      <div className="space-y-6">
        {/* Pet Display Card */}
        <Card className="overflow-hidden">
          <CardHeader className="text-center pb-4">
            <CardTitle className="flex items-center justify-center gap-2">
              <span className="text-2xl">🐉</span>
              {currentPet.name}
              {isDead && <Badge variant="destructive">{language === "id" ? "Mati" : "Dead"}</Badge>}
              {isSleeping && <Badge variant="secondary">{language === "id" ? "Tidur" : "Sleeping"}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Pet Image */}
            <div className="relative text-center">
              <div className="text-8xl mb-4">🐉</div>
              <p className="text-sm text-gray-600">
                {language === "id" ? "Umur" : "Age"}: {petAge} {language === "id" ? "hari" : "days"}
              </p>
              {isToddler && (
                <div className="absolute bottom-2 left-2 text-yellow-600 text-xs">
                  🕒 {language === "id" ? "Terlalu muda untuk token" : "Too young for tokens"}
                </div>
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
                  {language === "id" ? "Lapar" : "Hunger"}
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
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="flex items-center gap-2 p-4 h-auto flex-col"
                  onClick={() => careActivityMutation.mutate({ petId: currentPet.id, careType: 'fed' })}
                  disabled={careActivityMutation.isPending || isDead}
                >
                  <span className="text-2xl">🍖</span>
                  <span className="text-sm">{language === "id" ? "Makan" : "Feed"}</span>
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

                {isSleeping ? (
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 p-4 h-auto flex-col col-span-2"
                    onClick={() => wakeMutation.mutate(currentPet.id)}
                    disabled={wakeMutation.isPending}
                  >
                    <span className="text-2xl">⏰</span>
                    <span className="text-sm">{language === "id" ? "Bangunkan" : "Wake Up"}</span>
                    <div className="text-xs text-gray-500">
                      {language === "id" ? "Tidur" : "Sleeping"}: {Math.round(sleepProgress)}%
                    </div>
                    {sleepCountdown > 0 && (
                      <div className="text-xs text-blue-600">
                        {formatSleepTime(Math.floor(sleepCountdown))} {language === "id" ? "tersisa" : "remaining"}
                      </div>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 p-4 h-auto flex-col col-span-2"
                    onClick={() => sleepMutation.mutate(currentPet.id)}
                    disabled={sleepMutation.isPending || isDead}
                  >
                    <span className="text-2xl">😴</span>
                    <span className="text-sm">{language === "id" ? "Tidur" : "Sleep"} (8 {language === "id" ? "menit" : "min"})</span>
                  </Button>
                )}
              </div>

              {/* Pet Navigation */}
              {pets.length > 1 && (
                <div className="text-center">
                  <Button
                    onClick={() => setCurrentPetIndex((prev) => (prev + 1) % pets.length)}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {language === "id" ? "Hewan Berikutnya" : "Next Pet"} ({currentPetIndex + 1}/{pets.length})
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
    );
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* User Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === "id" ? "Kredit" : "Credits"}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              RP {userStats?.credits || "0"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === "id" ? "Poin Loyalitas" : "Loyalty Points"}
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userStats?.loyaltyPoints || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === "id" ? "Token" : "Tokens"}
            </CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userStats?.tokens || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pet Care Section */}
      {renderPetCareSection()}
    </div>
  );

  const renderMarketplace = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          {language === "id" ? "Pasar" : "Marketplace"}
        </h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {language === "id" ? "Buat Listing" : "Create Listing"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.map((listing: any) => (
          <Card key={listing.id}>
            <CardHeader>
              <CardTitle className="text-lg">{listing.title}</CardTitle>
              <Badge variant="secondary">RP {listing.price}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">{listing.description}</p>
              <Button className="w-full">
                {language === "id" ? "Beli Sekarang" : "Buy Now"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderReferrals = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">
        {language === "id" ? "Program Rujukan" : "Referral Program"}
      </h2>

      {/* Referral Code Card */}
      <Card className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white">
        <CardHeader>
          <CardTitle className="text-white">
            {language === "id" ? "Kode Rujukan Anda" : "Your Referral Code"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-white/20 rounded-lg p-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold font-mono mb-2">
                {userData?.referralCode || "Loading..."}
              </div>
              <p className="text-emerald-100 text-sm">
                {language === "id" ? "Bagikan kode ini untuk mendapat komisi!" : "Share this code to earn commissions!"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={() => {
                navigator.clipboard.writeText(userData?.referralCode || "");
                toast({
                  title: language === "id" ? "Disalin!" : "Copied!",
                  description: language === "id" ? "Kode rujukan disalin ke clipboard" : "Referral code copied to clipboard",
                });
              }}
              className="bg-white/20 hover:bg-white/30 text-white border-0"
            >
              <Copy className="w-4 h-4 mr-2" />
              {language === "id" ? "Salin" : "Copy"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Referral Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === "id" ? "Total Rujukan" : "Total Referrals"}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {referralData?.totalReferrals || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === "id" ? "Penghasilan" : "Earnings"}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              RP {referralData?.totalEarnings || "0"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === "id" ? "Level" : "Level"}
            </CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {referralData?.level || 1}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <img src={logoImage} alt="Reborn Wave Group" className="h-10 w-auto" />
              <h1 className="text-xl font-bold text-gray-900">
                {language === "id" ? "Reborn Wave Group" : "Reborn Wave Group"}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Select value={language} onValueChange={() => {}}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">🇺🇸 EN</SelectItem>
                  <SelectItem value="id">🇮🇩 ID</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="ghost" onClick={() => window.location.href = '/api/logout'}>
                <LogOut className="h-4 w-4 mr-2" />
                {language === "id" ? "Keluar" : "Logout"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "dashboard" 
                ? "bg-white text-blue-600 shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Home className="h-4 w-4 mr-2" />
            {language === "id" ? "Dasbor" : "Dashboard"}
          </button>
          
          <button
            onClick={() => setActiveTab("marketplace")}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "marketplace" 
                ? "bg-white text-blue-600 shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <ShoppingBag className="h-4 w-4 mr-2" />
            {language === "id" ? "Pasar" : "Marketplace"}
          </button>
          
          <button
            onClick={() => setActiveTab("referrals")}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "referrals" 
                ? "bg-white text-blue-600 shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Users className="h-4 w-4 mr-2" />
            {language === "id" ? "Rujukan" : "Referrals"}
          </button>
        </div>

        {/* Content */}
        {activeTab === "dashboard" && renderDashboard()}
        {activeTab === "marketplace" && renderMarketplace()}
        {activeTab === "referrals" && renderReferrals()}
      </div>

      {/* Coin Catching Game Modal */}
      {showCoinGame && selectedPet && (
        <CoinCatchingGame
          pet={selectedPet}
          language={language}
          user={userData}
          onClose={() => setShowCoinGame(false)}
        />
      )}
    </div>
  );
}