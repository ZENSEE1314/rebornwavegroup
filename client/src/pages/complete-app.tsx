import { useState, useEffect, useMemo, useLayoutEffect } from "react";
import { AnimatedProgressBar } from "@/components/AnimatedProgressBar";
// Removed DOM manipulation import to prevent cached display conflicts
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
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
  Heart, Droplets, Bed, Sparkles, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, ChevronDown, Calculator, Coins, Settings, Loader2, ShoppingCart, HelpCircle, TrendingUp,
  Volume2, VolumeX, Search, BarChart3, Info
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import logoImage from "@assets/2-removebg-preview.png";
import toyImage from "@assets/Plush_Dinosaur_with_Colorful_Spikes-removebg-preview.png";
import doluruuGrandpaImage from "@assets/Doluruu Grandpa_1749903476706.png";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GenealogyTree from "@/components/genealogy-tree";
import { getCategorySymbol, getSymbolById } from "@/lib/rewardSymbols";
import CreditTopUpModal from "@/components/CreditTopUpModal";
import { useTranslation } from "@/lib/i18n";
import { LanguageSelector } from "@/components/LanguageSelector";
import { OnboardingWalkthrough } from "@/components/OnboardingWalkthrough";
import MobileBackButton from "@/components/mobile-back-button";
import { TooltipGuide, useTooltipGuide } from "@/components/TooltipGuide";
import { dashboardGuide, guideConfigs } from "@/data/tooltipGuides";

// KOS (Kings Of Singers) Component
function KOSSection({ user, queryClient }: { user: any; queryClient: any }) {
  const { toast } = useToast();
  const [kosActiveTab, setKosActiveTab] = useState<'tournament' | 'individual'>('tournament');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch real KOS users data
  const { data: kosUsers = [], isLoading: kosUsersLoading } = useQuery({
    queryKey: ['/api/kos/users', kosActiveTab, currentPage],
    queryFn: () => fetch(`/api/kos/users?type=${kosActiveTab}&page=${currentPage}&limit=113`).then(res => res.json()),
    staleTime: 0, // Force fresh data on tab switches
    cacheTime: 0, // Don't cache between tab switches
  });

  // Fetch current tournament data
  const { data: currentTournament, isLoading: tournamentLoading } = useQuery({
    queryKey: ['/api/kos/current-tournament'],
    queryFn: () => fetch('/api/kos/current-tournament').then(res => res.json()),
    staleTime: 5000, // Reduced cache time for tournament data
  });

  // Fetch previous tournament winners
  const { data: previousWinners = [], isLoading: winnersLoading } = useQuery({
    queryKey: ['/api/kos/tournaments/previous-winners'],
    queryFn: () => fetch('/api/kos/tournaments/previous-winners').then(res => res.json()),
    staleTime: 10000, // Reduced cache time for winners data
  });

  // Fetch user's current stars
  const { data: userStarsData, isLoading: userStarsLoading, error: userStarsError } = useQuery({
    queryKey: ['/api/kos/user-stars', user?.id],
    queryFn: async () => {
      console.log('*** FETCHING USER STARS for user:', user?.id);
      const res = await fetch(`/api/kos/user-stars/${user?.id}`, {
        credentials: 'include'
      });
      console.log('*** USER STARS API RESPONSE:', res.status, res.ok);
      if (!res.ok) {
        console.warn('Failed to fetch user stars:', res.status);
        return { stars: 0, totalStars: 0, influencerPoints: 0, influencerTier: 1 };
      }
      const data = await res.json();
      console.log('*** USER STARS DATA RECEIVED:', data);
      return data;
    },
    enabled: !!user?.id,
    staleTime: 0, // Disable caching for now to force fresh data
    cacheTime: 0, // Disable cache storage
    retry: false,
  });

  // Fetch user's star purchase history
  const { data: starPurchaseHistory = [] } = useQuery({
    queryKey: ['/api/kos/star-purchase-history', user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/kos/star-purchase-history/${user?.id}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        console.warn('Failed to fetch star purchase history:', res.status);
        return [];
      }
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 30000,
    retry: false,
  });

  // Star trading state
  const [showStarDialog, setShowStarDialog] = useState(false);
  const [starDialogType, setStarDialogType] = useState<'buy' | 'sell'>('buy');
  const [starsAmount, setStarsAmount] = useState(1);
  const [customStarsAmount, setCustomStarsAmount] = useState<string>('');
  const [showStarHistory, setShowStarHistory] = useState(false);

  // Star price constants (1 star = 1000 RP)
  const STAR_PRICE = 1000;
  const SELL_RETURN_RATE = 0.7; // 70% return rate

  // Calculate RP cost for buying stars
  const buyStarsCost = (customStarsAmount ? parseInt(customStarsAmount) || 0 : starsAmount) * STAR_PRICE;
  
  // Calculate RP return for selling stars
  const sellStarsReturn = Math.floor((customStarsAmount ? parseInt(customStarsAmount) || 0 : starsAmount) * STAR_PRICE * SELL_RETURN_RATE);

  // Star trading mutations
  const starTradingMutation = useMutation({
    mutationFn: ({ type, amount, rpCost }: { type: 'buy' | 'sell'; amount: number; rpCost?: number }) => {
      if (type === 'buy') {
        console.log('*** FRONTEND: Calling purchase-stars endpoint');
        console.log('*** FRONTEND: Payload:', { starsAmount: amount, rpCost });
        return fetch('/api/kos/purchase-stars', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ starsAmount: amount, rpCost })
        }).then(async res => {
          console.log('*** FRONTEND: Response status:', res.status);
          console.log('*** FRONTEND: Response headers:', res.headers);
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to purchase stars');
          }
          return res.json();
        });
      } else {
        return fetch('/api/kos/sell-stars', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ starsAmount: amount })
        }).then(async res => {
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to sell stars');
          }
          return res.json();
        });
      }
    },
    onSuccess: async (data, variables) => {
      console.log('*** STAR PURCHASE SUCCESS - Starting cache refresh');
      console.log('*** Response data:', data);
      
      toast({
        title: variables.type === 'buy' ? "Stars Purchased!" : "Stars Sold!",
        description: data.message,
      });
      
      // Comprehensive cache invalidation and forced refetch
      console.log('*** Invalidating user stars cache for user:', user?.id);
      await queryClient.invalidateQueries({ queryKey: ['/api/kos/user-stars'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/kos/star-purchase-history'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/kos/users'] });
      
      // Force immediate refetch with fresh data
      console.log('*** Force refetching user stars data');
      await queryClient.refetchQueries({ 
        queryKey: ['/api/kos/user-stars', user?.id],
        exact: true 
      });
      
      // Additional targeted cache removal and refetch
      queryClient.removeQueries({ queryKey: ['/api/kos/user-stars', user?.id] });
      setTimeout(async () => {
        console.log('*** Secondary refetch after cache removal');
        await queryClient.refetchQueries({ queryKey: ['/api/kos/user-stars', user?.id] });
      }, 100);
      
      setShowStarDialog(false);
      setStarsAmount(1);
      setCustomStarsAmount('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete transaction. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleStarTrading = (type: 'buy' | 'sell') => {
    const amount = customStarsAmount ? parseInt(customStarsAmount) || 0 : starsAmount;
    if (amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid number of stars.",
        variant: "destructive",
      });
      return;
    }

    if (type === 'buy') {
      const rpCost = amount * STAR_PRICE;
      starTradingMutation.mutate({ type, amount, rpCost });
    } else {
      starTradingMutation.mutate({ type, amount });
    }
  };

  const displayUsers = Array.isArray(kosUsers) ? kosUsers : [];
  const top3Users = displayUsers.slice(0, 3);
  const top10Users = displayUsers.slice(3, 10);
  const remainingUsers = displayUsers.slice(10);
  const usersPerPage = 100;
  const totalPages = Math.ceil(remainingUsers.length / usersPerPage);
  const paginatedUsers = remainingUsers.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage);

  // Vote/Like functions with star spending support
  const [showVoteDialog, setShowVoteDialog] = useState(false);
  const [voteTargetUser, setVoteTargetUser] = useState<any>(null);
  const [voteStarsAmount, setVoteStarsAmount] = useState(1);

  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Search users
  const searchUsers = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/kos/users/search?q=${encodeURIComponent(query.trim())}`);
      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
    setIsSearching(false);
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const voteMutation = useMutation({
    mutationFn: ({ targetUserId, type, starsAmount }: { targetUserId: string; type: 'vote' | 'like'; starsAmount?: number }) => {
      if (type === 'vote') {
        return fetch('/api/kos/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ 
            targetUserId, 
            starsAmount: starsAmount || 1,
            mode: kosActiveTab // Pass the current mode (individual or tournament)
          })
        }).then(res => {
          if (!res.ok) throw new Error('Failed to vote');
          return res.json();
        });
      } else {
        return fetch('/api/kos/like', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ 
            targetUserId,
            mode: kosActiveTab // Pass the current mode (individual or tournament)
          })
        }).then(res => {
          if (!res.ok) throw new Error('Failed to like');
          return res.json();
        });
      }
    },
    onSuccess: (data, variables) => {
      toast({
        title: variables.type === 'vote' ? "Vote Cast!" : "Like Added!",
        description: variables.type === 'vote' 
          ? `You voted for ${voteTargetUser?.name} with ${variables.starsAmount} stars!`
          : `You liked this performer!`,
      });
      // Invalidate and refetch relevant data
      queryClient.invalidateQueries({ queryKey: ['/api/kos/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kos/user-stars'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
      setShowVoteDialog(false);
      setVoteTargetUser(null);
      setVoteStarsAmount(1);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cast vote. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleVote = async (targetUser: any, type: 'vote' | 'like') => {
    console.log('*** HANDLE VOTE CALLED ***');
    console.log('Target User:', targetUser);
    console.log('Type:', type);
    console.log('Current User:', user?.id);
    console.log('Current Mode:', kosActiveTab);
    
    // Prevent self-voting
    if (targetUser.id === user?.id) {
      console.log('*** PREVENTING SELF-VOTE ***');
      toast({
        title: "Cannot Vote for Yourself",
        description: "You cannot vote for your own profile.",
        variant: "destructive",
      });
      return;
    }

    // Different behavior based on tab and type
    if (type === 'vote') {
      console.log('*** VOTE BUTTON CLICKED - SHOWING DIALOG ***');
      // Both individual and tournament modes show vote dialog with star selection
      setVoteTargetUser(targetUser);
      setShowVoteDialog(true);
    } else if (type === 'like') {
      console.log('*** LIKE BUTTON CLICKED - CALLING MUTATION ***');
      console.log('Making like request to:', '/api/kos/like');
      console.log('Request body will include:', { targetUserId: targetUser.id, mode: kosActiveTab });
      // Like button - same behavior for both modes (awards likes only)
      voteMutation.mutate({ targetUserId: targetUser.id, type: 'like' });
    }
  };

  const handleConfirmVote = () => {
    if (voteTargetUser) {
      // Tournament mode only - vote with stars using vote endpoint
      voteMutation.mutate({ 
        targetUserId: voteTargetUser.id, 
        type: 'vote',
        starsAmount: voteStarsAmount
      });
    }
  };

  // Tournament timer component with real-time updates
  const TournamentTimer = ({ tournament }: { tournament: any }) => {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
    
    useEffect(() => {
      if (!tournament?.endDate) return;
      
      const calculateTimeLeft = () => {
        const now = new Date();
        const endDate = new Date(tournament.endDate);
        const timeDiff = endDate.getTime() - now.getTime();
        
        if (timeDiff <= 0) {
          return { days: 0, hours: 0, minutes: 0 };
        }

        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

        return { days, hours, minutes };
      };
      
      // Update immediately
      setTimeLeft(calculateTimeLeft());
      
      // Update every minute
      const interval = setInterval(() => {
        setTimeLeft(calculateTimeLeft());
      }, 60000);
      
      return () => clearInterval(interval);
    }, [tournament?.endDate]);
    
    if (!tournament) return null;
    
    return (
      <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50 mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" />
                {tournament.name}
              </h3>
              <p className="text-sm text-gray-600 mb-2">{tournament.description}</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-600">Prize Pool: <strong>{tournament.totalStarPool?.toLocaleString() || '0'} Stars</strong></span>
                <span className="text-gray-600">Participants: <strong>{tournament.participantCount || 0}</strong></span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
              </div>
              <div className="text-sm text-gray-600">Time Left</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Previous winners component
  const PreviousWinners = ({ winners }: { winners: any[] }) => {
    const validWinners = Array.isArray(winners) ? winners : [];
    if (validWinners.length === 0) return null;
    
    return (
      <Card className="border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 mb-6">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-600" />
            Previous Tournament Winners
          </h3>
          <div className="space-y-4">
            {validWinners.slice(0, 1).map((tournamentData) => (
              <div key={tournamentData.tournament.id}>
                <h4 className="font-medium text-gray-800 mb-2">
                  {tournamentData.tournament.name} - {new Date(tournamentData.tournament.endDate).toLocaleDateString()}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.isArray(tournamentData.winners) ? tournamentData.winners.slice(0, 10).map((winner: any) => (
                    <div key={winner.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        winner.position === 1 ? 'bg-yellow-500' : 
                        winner.position === 2 ? 'bg-gray-400' : 
                        winner.position === 3 ? 'bg-amber-600' : 'bg-blue-500'
                      }`}>
                        {winner.position}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{winner.name}</div>
                        <div className="text-xs text-gray-600">RP {parseFloat(winner.reward || '0').toLocaleString()}</div>
                      </div>
                    </div>
                  )) : null}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const UserCard = ({ user: userItem, isTop3 = false, rank }: { user: any; isTop3?: boolean; rank: number }) => (
    <Card className={`${isTop3 ? 'border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50' : 'hover:shadow-md'} transition-all duration-200`}>
      <CardContent className={`p-${isTop3 ? '6' : '4'}`}>
        <div className="flex items-center gap-4">
          {/* Rank Badge */}
          <div className={`flex-shrink-0 ${isTop3 ? 'w-12 h-12' : 'w-8 h-8'} rounded-full ${
            rank === 1 ? 'bg-yellow-500' : 
            rank === 2 ? 'bg-gray-400' : 
            rank === 3 ? 'bg-amber-600' : 'bg-blue-500'
          } flex items-center justify-center text-white font-bold ${isTop3 ? 'text-lg' : 'text-sm'}`}>
            {rank}
          </div>

          {/* User Photo */}
          <div className={`flex-shrink-0 ${isTop3 ? 'w-16 h-16' : 'w-12 h-12'} rounded-full bg-gray-200 border-2 border-gray-300 overflow-hidden`}>
            {userItem.profileImageUrl ? (
              <img src={userItem.profileImageUrl} alt={userItem.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center text-2xl">
                👤
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-gray-900 ${isTop3 ? 'text-lg' : 'text-base'} truncate`}>
              {userItem.name}
            </h3>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className={`${isTop3 ? 'text-base font-semibold' : 'text-sm'} text-gray-700`}>
                  {userItem.stars?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4 text-pink-500" />
                <span className={`${isTop3 ? 'text-base font-semibold' : 'text-sm'} text-gray-700`}>
                  {kosActiveTab === 'tournament' ? userItem.votes?.toLocaleString() || 0 : userItem.likes?.toLocaleString() || 0}
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {userItem.influencerRank} - Tier {userItem.influencerTier}
            </div>
          </div>

          {/* Action Buttons - Hide for own profile */}
          {userItem.id !== user?.id && (
            <div className="flex gap-2">
              <Button
                size={isTop3 ? "default" : "sm"}
                className="bg-pink-500 hover:bg-pink-600 text-white"
                onClick={() => handleVote(userItem, 'vote')}
                disabled={voteMutation.isPending}
              >
                <Star className={`${isTop3 ? 'w-4 h-4' : 'w-3 h-3'} mr-1`} />
                Vote
              </Button>
              <Button
                size={isTop3 ? "default" : "sm"}
                variant="outline"
                className="border-pink-300 text-pink-600 hover:bg-pink-50"
                onClick={() => handleVote(userItem, 'like')}
                disabled={voteMutation.isPending}
              >
                <Heart className={`${isTop3 ? 'w-4 h-4' : 'w-3 h-3'} mr-1`} />
                Like
              </Button>
            </div>
          )}
          {/* Show "You" badge for own profile */}
          {userItem.id === user?.id && (
            <div className="flex items-center">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                <User className="w-3 h-3 mr-1" />
                You
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2 flex items-center justify-center gap-3">
          <Crown className="w-8 h-8 text-pink-600" />
          KOS - Kings Of Singers
        </h2>
        <p className="text-slate-600">
          Compete, Vote, and Earn Stars in the Ultimate Singing Competition
        </p>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
          <CardContent className="p-4 text-center">
            <Star className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
            <div className="text-xl font-bold text-gray-900">{userStarsData?.totalStars || userStarsData?.stars || 0}</div>
            <div className="text-xs text-gray-600">My Stars</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
          <CardContent className="p-4 text-center">
            <Trophy className="w-6 h-6 text-purple-500 mx-auto mb-1" />
            <div className="text-xl font-bold text-gray-900">{userStarsData?.tournamentWins || 0}</div>
            <div className="text-xs text-gray-600">Wins</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200">
          <CardContent className="p-4 text-center">
            <Heart className="w-6 h-6 text-pink-500 mx-auto mb-1" />
            <div className="text-xl font-bold text-gray-900">{userStarsData?.votesCast || 0}</div>
            <div className="text-xs text-gray-600">Votes Cast</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
            <div className="text-xl font-bold text-gray-900">{userStarsData?.influencerRank || 'Bronze I'}</div>
            <div className="text-xs text-gray-600">Tier</div>
          </CardContent>
        </Card>
      </div>



      {/* Stars Purchase Section */}
      <Card className="border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-amber-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Star Trading</h3>
              <p className="text-sm text-gray-600 mb-2">
                Buy Stars (1 Star = RP 1,000) • Sell Stars (70% return rate)
              </p>
              <p className="text-xs text-gray-500">
                Current Stars: {userStarsData?.totalStars || userStarsData?.stars || 0} • Current RP: {user?.credits ? parseInt(user.credits).toLocaleString() : '0'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                className="bg-green-500 hover:bg-green-600 text-white"
                onClick={() => {
                  setStarDialogType('buy');
                  setShowStarDialog(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Buy Stars
              </Button>
              <Button 
                variant="outline"
                className="border-orange-300 text-orange-600 hover:bg-orange-50"
                onClick={() => {
                  setStarDialogType('sell');
                  setShowStarDialog(true);
                }}
                disabled={!(userStarsData?.totalStars || userStarsData?.stars) || (userStarsData?.totalStars || userStarsData?.stars || 0) <= 0}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Sell Stars
              </Button>
              <Button 
                variant="outline"
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
                onClick={() => setShowStarHistory(!showStarHistory)}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                {showStarHistory ? 'Hide History' : 'View History'}
              </Button>
            </div>
          </div>

          {/* Star Purchase History */}
          {showStarHistory && (
            <div className="mt-4 border-t pt-4">
              <h4 className="text-md font-medium text-gray-800 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                Transaction History
              </h4>
              <div className="max-h-60 overflow-y-auto">
                {starPurchaseHistory.length > 0 ? (
                  <div className="space-y-2">
                    {starPurchaseHistory.map((transaction: any) => {
                      // Determine transaction type based on starsAmount (positive = purchase, negative = sale)
                      const isPurchase = transaction.starsAmount > 0;
                      const starsCount = Math.abs(transaction.starsAmount);
                      
                      return (
                        <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                              isPurchase ? 'bg-green-500' : 'bg-orange-500'
                            }`}>
                              {isPurchase ? '+' : '-'}
                            </div>
                            <div>
                              <div className="font-medium text-sm">
                                {isPurchase ? 'Purchased' : 'Sold'} {starsCount} Stars
                              </div>
                              <div className="text-xs text-gray-600">
                                {new Date(transaction.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-semibold ${
                              isPurchase ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {isPurchase ? '-' : '+'}RP {parseInt(transaction.rpCost || 0).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No star transactions yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={kosActiveTab} onValueChange={(value) => setKosActiveTab(value as 'tournament' | 'individual')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="tournament" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Tournaments
          </TabsTrigger>
          <TabsTrigger value="individual" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Individual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tournament" className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-900">Tournament Rankings</h3>
          
          {/* Tournament Timer */}
          <TournamentTimer tournament={currentTournament} />
          
          {/* Tournament Rules */}
          <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50">
            <CardContent className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-purple-600" />
                7-Day Tournament Rules
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">1</div>
                    <div>
                      <div className="font-medium text-gray-900">7-Day Competition</div>
                      <div className="text-sm text-gray-600">Each tournament runs for exactly 7 days</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">2</div>
                    <div>
                      <div className="font-medium text-gray-900">Prize Pool System</div>
                      <div className="text-sm text-gray-600">All tournament votes go to prize pool</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">3</div>
                    <div>
                      <div className="font-medium text-gray-900">Top 10 Winners</div>
                      <div className="text-sm text-gray-600">Only top 10 performers win prizes</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">4</div>
                    <div>
                      <div className="font-medium text-gray-900">Automatic Distribution</div>
                      <div className="text-sm text-gray-600">Prizes awarded automatically after 7 days</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-white p-4 rounded-lg border">
                    <h5 className="font-semibold text-gray-900 mb-2">Prize Distribution</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-yellow-600 font-medium">🥇 1st Place:</span>
                        <span className="font-bold">30%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-medium">🥈 2nd Place:</span>
                        <span className="font-bold">20%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-600 font-medium">🥉 3rd Place:</span>
                        <span className="font-bold">15%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">4th-5th Place:</span>
                        <span>10% & 8%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">6th-10th Place:</span>
                        <span>6%, 4%, 3%, 2%, 2%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Previous Winners */}
          <PreviousWinners winners={previousWinners} />
          
          {/* Search Bar */}
          <Card className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <div className="relative">
                    <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <Input
                      type="text"
                      placeholder="Search users by username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                    {isSearching && (
                      <Loader2 className="w-4 h-4 text-blue-500 absolute right-3 top-1/2 transform -translate-y-1/2 animate-spin" />
                    )}
                  </div>
                  
                  {/* Search Results Dropdown */}
                  {showSearchResults && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                      {searchResults.length > 0 ? (
                        searchResults.map((result) => (
                          <div
                            key={result.id}
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              setSearchQuery('');
                              setShowSearchResults(false);
                              // You could scroll to user or highlight them here
                            }}
                          >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center text-sm">
                              👤
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm">{result.username}</div>
                              <div className="text-xs text-gray-600">
                                {result.firstName} {result.lastName}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-gray-500 text-sm">
                          No users found
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  Search by username to find performers
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Top 3 Users */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-700 flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Top 3 Performers
            </h4>
            <div className="space-y-3">
              {top3Users.map((user, index) => (
                <UserCard key={user.id} user={user} isTop3={true} rank={index + 1} />
              ))}
            </div>
          </div>

          {/* Top 10 Users */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-700 flex items-center gap-2">
              <Medal className="w-5 h-5 text-purple-500" />
              Top 10 Rankings
            </h4>
            <div className="space-y-2">
              {top10Users.map((user, index) => (
                <UserCard key={user.id} user={user} rank={index + 4} />
              ))}
            </div>
          </div>

          {/* Remaining Users with Pagination */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-700 flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-500" />
              All Participants (Page {currentPage} of {totalPages})
            </h4>
            <div className="space-y-2">
              {paginatedUsers.map((user, index) => (
                <UserCard key={user.id} user={user} rank={11 + (currentPage - 1) * usersPerPage + index} />
              ))}
            </div>
            
            {/* Pagination */}
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center px-4 py-2 bg-gray-100 rounded-md">
                <span className="text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="individual" className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-900">Individual Rankings</h3>
          
          {/* Search Bar */}
          <Card className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <div className="relative">
                    <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <Input
                      type="text"
                      placeholder="Search users by username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                    {isSearching && (
                      <Loader2 className="w-4 h-4 text-blue-500 absolute right-3 top-1/2 transform -translate-y-1/2 animate-spin" />
                    )}
                  </div>
                  
                  {/* Search Results Dropdown */}
                  {showSearchResults && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                      {searchResults.length > 0 ? (
                        searchResults.map((result) => (
                          <div
                            key={result.id}
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              setSearchQuery('');
                              setShowSearchResults(false);
                              // You could scroll to user or highlight them here
                            }}
                          >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center text-sm">
                              👤
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm">{result.username}</div>
                              <div className="text-xs text-gray-600">
                                {result.firstName} {result.lastName}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-gray-500 text-sm">
                          No users found
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  Search by username to find performers
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Top 3 Users */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-700 flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Top 3 Individual Performers
            </h4>
            <div className="space-y-3">
              {top3Users.map((user, index) => (
                <UserCard key={user.id} user={user} isTop3={true} rank={index + 1} />
              ))}
            </div>
          </div>

          {/* Top 10 Users */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-700 flex items-center gap-2">
              <Medal className="w-5 h-5 text-purple-500" />
              Top 10 Individual Rankings
            </h4>
            <div className="space-y-2">
              {top10Users.map((user, index) => (
                <UserCard key={user.id} user={user} rank={index + 4} />
              ))}
            </div>
          </div>

          {/* Remaining Users with Pagination */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-700 flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-500" />
              All Individual Performers (Page {currentPage} of {totalPages})
            </h4>
            <div className="space-y-2">
              {paginatedUsers.map((user, index) => (
                <UserCard key={user.id} user={user} rank={11 + (currentPage - 1) * usersPerPage + index} />
              ))}
            </div>
            
            {/* Pagination */}
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center px-4 py-2 bg-gray-100 rounded-md">
                <span className="text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Star Trading Dialog */}
      <Dialog open={showStarDialog} onOpenChange={setShowStarDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {starDialogType === 'buy' ? (
                <>
                  <Plus className="w-5 h-5 text-green-500" />
                  Purchase Stars
                </>
              ) : (
                <>
                  <DollarSign className="w-5 h-5 text-orange-500" />
                  Sell Stars
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {starDialogType === 'buy' 
                ? 'Buy stars using your RP balance to vote for performers'
                : 'Sell your stars for RP (70% return rate, 30% admin fee)'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Quick amount buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[1, 5, 10, 25].map((amount) => (
                <Button
                  key={amount}
                  variant={starsAmount === amount && !customStarsAmount ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setStarsAmount(amount);
                    setCustomStarsAmount('');
                  }}
                >
                  {amount}
                </Button>
              ))}
            </div>

            {/* Custom amount input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Amount</label>
              <Input
                type="number"
                placeholder="Enter stars amount"
                value={customStarsAmount}
                onChange={(e) => setCustomStarsAmount(e.target.value)}
                min="1"
              />
            </div>

            {/* Summary */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Stars:</span>
                <span className="font-medium">{customStarsAmount || starsAmount}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">
                  {starDialogType === 'buy' ? 'RP Cost:' : 'RP Return:'}
                </span>
                <span className="font-medium text-green-600">
                  RP {starDialogType === 'buy' ? buyStarsCost.toLocaleString() : sellStarsReturn.toLocaleString()}
                </span>
              </div>
              {starDialogType === 'sell' && (
                <div className="text-xs text-gray-500 mt-2">
                  Admin Fee (30%): RP {Math.floor((customStarsAmount ? parseInt(customStarsAmount) || 0 : starsAmount) * STAR_PRICE * 0.3).toLocaleString()}
                </div>
              )}
            </div>

            {/* Current balances */}
            <div className="text-xs text-gray-500 space-y-1">
              <div>Current RP: {user?.credits ? parseInt(user.credits).toLocaleString() : '0'}</div>
              <div>Current Stars: {userStarsData?.totalStars || userStarsData?.stars || 0}</div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStarDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => handleStarTrading(starDialogType)}
              disabled={starTradingMutation.isPending}
              className={starDialogType === 'buy' ? 'bg-green-500 hover:bg-green-600' : 'bg-orange-500 hover:bg-orange-600'}
            >
              {starTradingMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                starDialogType === 'buy' ? (
                  <Plus className="w-4 h-4 mr-2" />
                ) : (
                  <DollarSign className="w-4 h-4 mr-2" />
                )
              )}
              {starDialogType === 'buy' ? 'Purchase' : 'Sell'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vote Confirmation Dialog */}
      <Dialog open={showVoteDialog} onOpenChange={setShowVoteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-pink-500" />
              Vote for {voteTargetUser?.name}
            </DialogTitle>
            <DialogDescription>
              Spend stars to vote for this performer in the tournament
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Star amount selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Stars to spend</label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 5, 10, 25].map((amount) => (
                  <Button
                    key={amount}
                    variant={voteStarsAmount === amount ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVoteStarsAmount(amount)}
                    disabled={amount > (userStarsData?.totalStars || userStarsData?.stars || 0)}
                  >
                    {amount}
                  </Button>
                ))}
              </div>
              <Input
                type="number"
                placeholder="Custom amount"
                value={voteStarsAmount}
                onChange={(e) => setVoteStarsAmount(parseInt(e.target.value) || 1)}
                min="1"
                max={userStarsData?.stars || 0}
              />
            </div>

            {/* Vote summary */}
            <div className="p-4 bg-pink-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Voting for:</span>
                <span className="font-medium">{voteTargetUser?.name}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Stars to spend:</span>
                <span className="font-medium text-pink-600">{voteStarsAmount}</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Your remaining stars: {(userStarsData?.totalStars || userStarsData?.stars || 0) - voteStarsAmount}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVoteDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmVote}
              disabled={voteMutation.isPending || voteStarsAmount > (userStarsData?.totalStars || userStarsData?.stars || 0)}
              className="bg-pink-500 hover:bg-pink-600"
            >
              {voteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Star className="w-4 h-4 mr-2" />
              )}
              Cast Vote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Seasonal Collections Component
function SeasonalCollectionsTab({ activateToyAsPet }: { activateToyAsPet: (toy: any) => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();


  
  // Fetch seasonal data
  const { data: seasons = [] } = useQuery({
    queryKey: ['/api/seasons'],
  });

  const { data: userProgress = [] } = useQuery({
    queryKey: ['/api/user/seasonal-progress'],
  });

  const [selectedSeason, setSelectedSeason] = useState(null);
  const [selectedSector, setSelectedSector] = useState(null);

  const { data: sectors = [] } = useQuery({
    queryKey: ['/api/seasonal-sectors', selectedSeason?.id],
    enabled: !!selectedSeason,
  });

  const { data: seasonalToys = [] } = useQuery({
    queryKey: ['/api/seasons', selectedSeason?.id, 'toys'],
    queryFn: async () => {
      const response = await fetch(`/api/seasons/${selectedSeason?.id}/toys`);
      if (!response.ok) {
        throw new Error('Failed to fetch toys');
      }
      return response.json();
    },
    enabled: !!selectedSeason,
  });

  // Set default season when seasons load
  useEffect(() => {
    if (seasons.length > 0 && !selectedSeason) {
      setSelectedSeason(seasons[0]);
    }
  }, [seasons, selectedSeason]);

  // Set default sector when sectors load
  useEffect(() => {
    if (sectors.length > 0 && !selectedSector) {
      setSelectedSector(sectors[0]);
    }
  }, [sectors, selectedSector]);

  // Filter only toy templates for display
  const toyTemplates = seasonalToys.filter(toy => toy.isTemplate === true);
  


  const getUserProgress = (sectorId) => {
    const progress = userProgress.find(p => p.sectorId === sectorId);
    return progress ? progress.toysCollected : 0;
  };

  const getRarityColor = (rarity) => {
    switch (rarity?.toLowerCase()) {
      case 'common': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'uncommon': return 'bg-green-100 text-green-800 border-green-300';
      case 'rare': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'epic': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'legendary': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'mythical': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Season Selection */}
      <div className="text-center">
        <h3 className="text-2xl font-bold text-slate-900 mb-4">Seasonal Collections</h3>
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {seasons.map((season) => (
            <Button
              key={season?.id || 'season'}
              variant={selectedSeason?.id === season.id ? "default" : "outline"}
              onClick={() => setSelectedSeason(season)}
              className="mb-2"
            >
              {season?.name || 'Season'}
            </Button>
          ))}
        </div>
      </div>

      {/* Sector Grid */}
      {selectedSeason && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {sectors.map((sector) => {
            const progress = getUserProgress(sector?.id || '');
            const total = sector.totalToys || 0;
            const percentage = total > 0 ? (progress / total) * 100 : 0;
            
            return (
              <Card 
                key={sector?.id || 'sector'}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedSector?.id === sector.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedSector(sector)}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl mb-2">{sector.icon}</div>
                  <h4 className="font-semibold text-sm mb-2">{sector?.name || 'Sector'}</h4>
                  <div className="space-y-2">
                    <Progress value={percentage} className="h-2" />
                    <p className="text-xs text-gray-600">
                      {progress}/{total} ({Math.round(percentage)}%)
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Seasonal Toys Grid */}
      {selectedSector && (
        <div className="space-y-4">
          <div className="text-center">
            <h4 className="text-xl font-bold text-slate-900">
              {selectedSector?.name || 'Collection'} Collection
            </h4>
            <p className="text-gray-600">{selectedSector?.description || ''}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {seasonalToys.map((toy) => (
              <Card key={toy?.id || 'toy'} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="mb-4">
                      <img 
                        src={toy.imageUrl || '/images/default-toy.png'} 
                        alt={toy?.name || 'Toy'} 
                        className="w-24 h-24 mx-auto object-contain"
                        onError={(e) => {
                          e.currentTarget.src = '/images/default-toy.png';
                        }}
                      />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{toy?.name || 'Toy'}</h3>
                    <Badge className={getRarityColor(toy?.rarity)} variant="secondary">
                      {toy?.rarity || 'Unknown'}
                    </Badge>
                    <p className="text-sm text-gray-600 mt-2">{toy?.description || ''}</p>
                    

                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Show toys directly when no sectors exist */}
      {selectedSeason && sectors.length === 0 && (
        <div className="space-y-4">
          <div className="text-center">
            <h4 className="text-xl font-bold text-slate-900">
              {selectedSeason?.displayName || selectedSeason?.name || 'Season'} Collection
            </h4>
            <p className="text-gray-600">Seasonal toys available in this collection</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {toyTemplates.map((toy) => (
              <div key={toy?.id || 'toy'} className="text-center">
                <img 
                  src={toy.imageUrl || '/images/default-toy.png'} 
                  alt={toy?.name || 'Toy'} 
                  className="w-full aspect-square object-cover rounded-lg hover:scale-105 transition-transform cursor-pointer mb-2"
                  onError={(e) => {
                    e.currentTarget.src = '/images/default-toy.png';
                  }}
                />
                <div className="text-sm">
                  <div className="font-semibold text-slate-800 mb-1">{toy?.name || 'Toy'}</div>
                  <div className="flex justify-center items-center gap-2 text-xs">
                    <span className={`px-2 py-1 rounded-full ${
                      toy.gender === 'male' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-pink-100 text-pink-800'
                    }`}>
                      {toy.gender === 'male' ? '♂ Male' : '♀ Female'}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full">
                      {toy.color}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {seasonalToys.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No toys available for this season yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function to format sleep timer as MM:SS
function formatSleepTime(timeRemaining: number): string {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Global audio context for mobile browsers
let audioUnlocked = false;
let speechSynthUnlocked = false;

// Sound effect function to play text-to-speech + custom voice
function playDoluruuSound(isMuted = false) {
  // Don't play sound if muted
  if (isMuted) return;
  
  try {
    // Mobile audio unlock check
    if (!audioUnlocked) {
      // Try to unlock audio context on mobile
      const unlockAudio = () => {
        try {
          const audio = new Audio();
          audio.volume = 0;
          audio.play().then(() => {
            audioUnlocked = true;
            audio.pause();
            audio.currentTime = 0;
          }).catch(() => {
            console.log('Audio unlock failed');
          });
        } catch (e) {
          console.log('Audio unlock error:', e);
        }
      };
      unlockAudio();
    }
    
    // First: Play text-to-speech "how do you call my name?"
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('How do you call my name?');
      utterance.rate = 0.6;
      utterance.pitch = 1.8;
      utterance.volume = 0.8;
      
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice?.name?.toLowerCase().includes('female') || 
        voice?.name?.toLowerCase().includes('child') ||
        voice?.name?.toLowerCase().includes('cute') ||
        voice?.name?.toLowerCase().includes('samantha') ||
        voice?.name?.toLowerCase().includes('karen') ||
        voice?.lang?.includes('en-US')
      ) || voices[0];
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      // After text-to-speech finishes, play custom voice recording
      utterance.onend = () => {
        setTimeout(() => {
          if (!isMuted) {
            const audio = new Audio('/src/assets/custom-voice.m4a');
            audio.volume = 0.8;
            audio.play().catch(() => {
              console.log('Custom voice recording failed to play');
            });
          }
        }, 100); // Faster transition between the two sounds
      };
      
      speechSynthesis.speak(utterance);
    }
  } catch (error) {
    console.log('Audio not available');
  }
}

function playFemaleCuteVoice(message: string, isMuted = false) {
  // Don't play sound if muted
  if (isMuted) return;
  
  console.log('Attempting to play audio for:', message.substring(0, 30) + '...');
  
  try {
    // Primary approach: Use the custom voice audio file with correct Vite path
    const audio = new Audio('/assets/custom-voice.m4a');
    audio.volume = 0.8;
    audio.preload = 'auto';
    
    // Mobile audio unlock mechanism
    if (!audioUnlocked) {
      console.log('Audio not unlocked, attempting mobile unlock...');
      
      // Create silent audio to unlock mobile browsers
      const silentAudio = new Audio('data:audio/wav;base64,UklGRnoAAABXQVZFZm10IBAAAAABAAEAVZIBAAUVAQAC8b8bAAAAnABwYXNhegYAAAAAAAAa');
      silentAudio.volume = 0.1;
      
      silentAudio.play().then(() => {
        audioUnlocked = true;
        console.log('Mobile audio unlocked successfully');
        
        // Now play the actual audio
        return audio.play();
      }).then(() => {
        console.log('Custom voice audio played successfully');
      }).catch(error => {
        console.log('Audio playback failed, trying fallback:', error);
        playFallbackSpeech(message);
      });
    } else {
      // Audio already unlocked, play directly
      audio.play().then(() => {
        console.log('Custom voice audio played successfully');
      }).catch(error => {
        console.log('Audio playback failed, trying fallback:', error);
        playFallbackSpeech(message);
      });
    }
    
    audio.onerror = (error) => {
      console.log('Audio loading error, trying fallback:', error);
      playFallbackSpeech(message);
    };
    
  } catch (error) {
    console.log('Audio setup failed, trying fallback:', error);
    playFallbackSpeech(message);
  }
}

function playFallbackSpeech(message: string) {
  console.log('Using fallback speech synthesis for:', message.substring(0, 30) + '...');
  
  try {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.pitch = 1.5;
      utterance.rate = 0.8;
      utterance.volume = 0.8;
      
      utterance.onstart = () => console.log('Fallback speech started');
      utterance.onerror = (event) => console.log('Fallback speech error:', event.error);
      utterance.onend = () => console.log('Fallback speech ended');
      
      const voices = speechSynthesis.getVoices();
      const femaleVoice = voices.find(voice => 
        voice?.name?.toLowerCase().includes('zira') ||
        voice?.name?.toLowerCase().includes('female') ||
        voice?.name?.toLowerCase().includes('samantha')
      );
      
      if (femaleVoice) {
        utterance.voice = femaleVoice;
        console.log('Using fallback voice:', femaleVoice.name);
      }
      
      speechSynthesis.speak(utterance);
    }
  } catch (error) {
    console.log('Fallback speech also failed:', error);
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
          setTokenStatus((prev: any) => ({ ...prev, canClaim: false, lastTokenClaim: new Date() }));
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

// Daily Token Reward Component
function DailyTokenReward({ language, userTokens, dailyRewardStatus, claimDailyRewardMutation }: any) {
  const { t } = useTranslation();
  
  if (!dailyRewardStatus) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Clock className="w-6 h-6 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">
            {t('daily.loadingStatus')}
          </p>
        </div>
      </div>
    );
  }

  const { canClaim, timeUntilNext, allPetsHealthy, petCount } = dailyRewardStatus;

  return (
    <div className="space-y-4">
      {/* Current Token Count */}
      <div className="flex items-center justify-between bg-white rounded-lg p-4 border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
            <Coins className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {t('tokens.current')}
            </p>
            <p className="text-2xl font-bold text-yellow-600">{userTokens || 0}</p>
          </div>
        </div>
      </div>

      {/* Reward Status */}
      <div className="bg-white rounded-lg p-4 border">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900">
            {t('dailyReward.title')}
          </h4>
          <Badge variant={canClaim ? "default" : "secondary"}>
            {canClaim 
              ? t('dailyReward.readyToClaim')
              : t('dailyReward.notAvailable')
            }
          </Badge>
        </div>

        {/* Pet Health Status */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Heart className={`w-4 h-4 ${allPetsHealthy ? 'text-green-500' : 'text-red-500'}`} />
            <span className="text-sm font-medium">
              {t('petHealth.status')}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {allPetsHealthy 
              ? `${t('common.all')} ${petCount} ${t('petHealth.allHealthy')}`
              : t('petHealth.needCare')
            }
          </p>
        </div>

        {/* Action Button */}
        {canClaim ? (
          <Button 
            onClick={() => claimDailyRewardMutation.mutate()}
            disabled={claimDailyRewardMutation.isPending}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            {claimDailyRewardMutation.isPending ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                {t('dailyReward.claiming')}
              </>
            ) : (
              <>
                <Coins className="w-4 h-4 mr-2" />
                {t('dailyReward.claimToken')}
              </>
            )}
          </Button>
        ) : (
          <div className="text-center py-3">
            <p className="text-sm text-gray-500 mb-1">
              {t('dailyReward.nextAvailable')}
            </p>
            <p className="font-mono text-lg font-semibold text-gray-700">
              {timeUntilNext}
            </p>
          </div>
        )}
      </div>

      {/* Requirements */}
      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
        <h5 className="font-medium text-blue-900 mb-2">
          {t('dailyReward.requirements')}
        </h5>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• {t('dailyReward.wait24Hours')}</li>
          <li>• {t('dailyReward.allPetsHealthy')}</li>
        </ul>
      </div>
    </div>
  );
}

function CoinCatchingGame({ pet, language, onClose, user }: { pet: any; language: string; onClose: () => void; user: any }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [coins, setCoins] = useState<Array<{ id: number; x: number; y: number; speed: number }>>([]);
  const [gameOver, setGameOver] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const { toast } = useToast();

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
          petId: pet?.id,
          score: score,
          tokensEarned: 0
        });
        
        // Refresh leaderboard data
        await queryClient.invalidateQueries({ queryKey: ["/api/game-scores/leaderboard"] });
        
        toast({
          title: t('game.over'),
          description: t('game.scoreMessage').replace('{score}', score.toString()),
        });
      } catch (error) {
        console.error('Error submitting game score:', error);
        toast({
          title: t('game.error'),
          description: t('game.failedToSave'),
          variant: "destructive"
        });
      }
    }
  };

  const catchCoin = (coinId: number) => {
    setCoins(prev => prev.filter(coin => coin?.id !== coinId));
    setScore(prev => prev + 10);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">
            {t('game.coinCatching')}
          </h3>
          <Button variant="ghost" onClick={onClose}>✕</Button>
        </div>

        {!gameStarted && !gameOver && !showLeaderboard && (
          <div className="text-center space-y-4">
            <div className="text-4xl">🪙</div>
            <p className="text-gray-600">
              {t('game.instructions')}
            </p>
            <div className="space-y-2">
              <Button onClick={startGame} className="w-full">
                {t('game.startGame')}
              </Button>
              <Button 
                onClick={() => setShowLeaderboard(true)} 
                variant="outline" 
                className="w-full"
              >
                <Trophy className="h-4 w-4 mr-2" />
                {t('game.leaderboard')}
              </Button>
            </div>
          </div>
        )}

        {gameStarted && (
          <div className="space-y-4">
            <div className="flex justify-between">
              <span>{t('game.score')}: {score}</span>
              <span>{t('game.time')}: {timeLeft}s</span>
            </div>
            
            <div className="relative h-64 bg-gradient-to-b from-blue-100 to-green-100 rounded-lg overflow-hidden border-2">
              {coins.map(coin => (
                <div
                  key={coin?.id || Math.random()}
                  className="absolute text-2xl cursor-pointer hover:scale-110 transition-transform"
                  style={{
                    left: `${coin.x}%`,
                    top: `${coin.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  onClick={() => catchCoin(coin?.id)}
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
                {t('game.leaderboard')}
              </h4>
              <Button 
                onClick={() => setShowLeaderboard(false)} 
                variant="outline"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('game.back')}
              </Button>
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-2">
              {leaderboard.length > 0 ? (
                leaderboard.map((entry: any, index: number) => (
                  <div 
                    key={entry?.id || Math.random()} 
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-gray-600">#{index + 1}</span>
                      <div>
                        <div className="font-medium">
                          {entry.user?.firstName || entry.user?.email || 'Anonymous'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {t('game.pet')} {entry?.pet?.name || 'Unknown'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{entry.score}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {t('game.noScores')}
                </div>
              )}
            </div>
          </div>
        )}

        {gameOver && (
          <div className="text-center space-y-4">
            <div className="text-4xl">🏆</div>
            <h4 className="text-lg font-semibold">
              {t('game.gameOver')}
            </h4>
            <p className="text-gray-600">
              {t('game.finalScore').replace('{score}', score.toString())}
            </p>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button onClick={startGame} variant="outline">
                  {t('game.playAgain')}
                </Button>
                <Button onClick={onClose}>
                  {t('game.done')}
                </Button>
              </div>
              <Button 
                onClick={() => setShowLeaderboard(true)} 
                variant="outline" 
                className="w-full"
              >
                <Trophy className="h-4 w-4 mr-2" />
                {t('game.viewLeaderboard')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Pet Care Component
function PetCareSection({ language, user, queryClient, userTokens, activateToyAsPetMutation, showPetActivationDialog, isMuted }: { language: string; user: any; queryClient: any; userTokens: number; activateToyAsPetMutation: any; showPetActivationDialog: (toy: any) => void; isMuted: boolean }) {
  const { toast } = useToast();
  const { t } = useTranslation();
  
  // State for real-time timer updates
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showCoinGame, setShowCoinGame] = useState(false);
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [currentPetIndex, setCurrentPetIndex] = useState(0);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [sleepCountdown, setSleepCountdown] = useState<number>(0);
  const [editingPetName, setEditingPetName] = useState<number | null>(null);
  const [newPetName, setNewPetName] = useState("");
  const [showQRCamera, setShowQRCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSeason, setSelectedSeason] = useState<string>("season1");
  // Removed local pet stats to prevent conflicts with API data

  // Mobile audio initialization on first user interaction
  useEffect(() => {
    const initializeMobileAudio = () => {
      if (!audioUnlocked) {
        // Try to initialize audio context for mobile browsers
        const unlockAudio = () => {
          try {
            const audio = new Audio();
            audio.volume = 0;
            audio.play().then(() => {
              audioUnlocked = true;
              audio.pause();
              audio.currentTime = 0;
              console.log('Mobile audio unlocked successfully');
            }).catch(() => {
              console.log('Audio unlock failed, will retry on next interaction');
            });
          } catch (e) {
            console.log('Audio unlock error:', e);
          }
        };
        
        // Try immediately
        unlockAudio();
        
        // Also add event listeners for mobile interaction
        const handleTouch = () => {
          console.log('User interaction detected, attempting audio unlock...');
          if (!audioUnlocked) {
            unlockAudio();
          }
          
          // Also try to unlock speech synthesis specifically for mobile
          if (!speechSynthUnlocked && 'speechSynthesis' in window) {
            try {
              console.log('Attempting speech synthesis unlock...');
              const testUtterance = new SpeechSynthesisUtterance('test');
              testUtterance.volume = 0;
              testUtterance.rate = 10; // Very fast to make it unnoticeable
              speechSynthesis.speak(testUtterance);
              speechSynthesis.cancel();
              speechSynthUnlocked = true;
              console.log('Speech synthesis unlocked successfully');
            } catch (e) {
              console.log('Speech synthesis unlock failed:', e);
            }
          }
          
          document.removeEventListener('touchstart', handleTouch);
          document.removeEventListener('click', handleTouch);
        };
        
        document.addEventListener('touchstart', handleTouch, { once: true });
        document.addEventListener('click', handleTouch, { once: true });
      }
    };

    initializeMobileAudio();
  }, []);

  // Play greeting when entering Pet Care tab
  useEffect(() => {
    if (user && !hasGreeted) {
      const userName = user.firstName || user.email?.split('@')[0] || 'dear friend';
      setTimeout(() => {
        playFemaleCuteVoice(`Hello ${userName}! Welcome to Pet Care! Let's take wonderful care of your adorable pets together!`, isMuted);
        setHasGreeted(true);
      }, 500); // Small delay to ensure component is fully loaded
    }
  }, [user, hasGreeted]);

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

  // Fetch user's pets with reasonable caching
  const { data: pets = [], isLoading: petsLoading, refetch: refetchPets } = useQuery({
    queryKey: ["/api/pets"],
    enabled: !!user?.id,
    retry: 1,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    refetchOnWindowFocus: true, // Refresh when returning to tab
    refetchOnMount: true,
    refetchInterval: 300000, // Auto-refresh every 5 minutes
  });

  // Safe pets array with proper fallback - define this first to avoid crashes
  const safePets = Array.isArray(pets) ? pets : [];
  
  // Removed DOM manipulation to allow proper React state synchronization

  // Force refresh when pet data changes (only on currentPetIndex change)
  useEffect(() => {
    setForceRefresh(prev => prev + 1);
  }, [currentPetIndex]);

  // Removed aggressive DOM manipulation to prevent constant refreshing
  
  // Minimal sync to prevent excessive refreshing
  useEffect(() => {
    // Initial fetch only
    queryClient.invalidateQueries({ queryKey: ['/api/pets'] });
  }, [queryClient]);

  // Pet status notification system - Check for 0% stats with throttling
  const [lastNotificationTime, setLastNotificationTime] = useState<{[key: string]: number}>({});
  
  useEffect(() => {
    if (safePets.length > 0 && safePets[currentPetIndex]) {
      const pet = safePets[currentPetIndex];
      const criticalStats = [];
      
      // Check each stat for 0% values
      if (pet?.hunger === 0) criticalStats.push('Hunger');
      if (pet?.happiness === 0) criticalStats.push('Happiness');
      if (pet?.cleanliness === 0) criticalStats.push('Cleanliness');
      if (pet?.energy === 0) criticalStats.push('Energy');
      
      // Show notification if any stats hit 0% (but throttle to once every 5 minutes per pet)
      if (criticalStats.length > 0) {
        const notificationKey = `${pet?.id}-${criticalStats.join('-')}`;
        const lastTime = lastNotificationTime[notificationKey] || 0;
        const currentTime = Date.now();
        const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        // Only show notification if it's been more than 5 minutes since the last one for this pet/stats combination
        if (currentTime - lastTime > fiveMinutes) {
          const message = `⚠️ URGENT: ${pet?.name || 'Your pet'}'s ${criticalStats.join(', ')} ${criticalStats.length > 1 ? 'are' : 'is'} at 0%! Please take care of them immediately!`;
          
          try {
            // Show browser notification if possible
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Pet Care Alert!', {
                body: message,
                icon: '/favicon.ico',
                badge: '/favicon.ico'
              });
            } else if ('Notification' in window && Notification.permission !== 'denied') {
              Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                  new Notification('Pet Care Alert!', {
                    body: message,
                    icon: '/favicon.ico',
                    badge: '/favicon.ico'
                  });
                }
              }).catch(error => {
                console.log('Notification permission error:', error);
              });
            }
            
            // Also play urgent audio notification if not muted
            if (!isMuted) {
              playFemaleCuteVoice(`Urgent! ${pet?.name || 'Your pet'} needs immediate attention! Their ${criticalStats.join(' and ')} ${criticalStats.length > 1 ? 'are' : 'is'} critically low!`, false);
            }
            
            console.log('🚨 CRITICAL PET STATUS ALERT:', message);
            
            // Update the last notification time for this pet/stats combination
            setLastNotificationTime(prev => ({
              ...prev,
              [notificationKey]: currentTime
            }));
          } catch (error) {
            console.log('Notification error caught:', error);
          }
        }
      }
    }
  }, [safePets, currentPetIndex, isMuted, lastNotificationTime]);

  // Reduced debug logging to prevent console spam
  useEffect(() => {
    if (safePets.length > 0 && safePets[currentPetIndex]) {
      // Only log when pet stats change significantly
      const pet = safePets[currentPetIndex];
      const key = `${pet?.id}-${pet?.hunger}-${pet?.happiness}-${pet?.cleanliness}-${pet?.energy}`;
      const lastKey = localStorage.getItem('lastPetKey');
      
      if (key !== lastKey) {
        console.log('Pet stats updated:', {
          id: pet?.id,
          name: pet?.name,
          hunger: pet?.hunger,
          happiness: pet?.happiness,
          cleanliness: pet?.cleanliness,
          energy: pet?.energy
        });
        localStorage.setItem('lastPetKey', key);
      }
    }
  }, [safePets, currentPetIndex]);

  // Auto decay system - runs every 10 minutes for reasonable updates
  useEffect(() => {
    if (pets && Array.isArray(pets) && pets.length > 0) {
      const decayInterval = setInterval(async () => {
        for (const pet of pets) {
          if (!pet?.id) continue;
          
          try {
            const response = await fetch(`/api/pets/${pet?.id}/auto-decay`, {
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
      }, 600000); // Run every 10 minutes (600,000 milliseconds)

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

  // Fetch token transactions for current user
  const { data: tokenTransactions = [] } = useQuery({
    queryKey: ["/api/user/token-transactions"],
    enabled: !!user?.id,
  });

  // Calculate tokens earned by current pet from daily care rewards
  const currentPetTokens = useMemo(() => {
    if (!currentPet?.id || !tokenTransactions.length) return 0;
    
    return tokenTransactions.filter(transaction => 
      transaction.relatedId === currentPet.id && 
      transaction.type === 'earned' &&
      transaction.description?.includes('Daily token from pet')
    ).length;
  }, [currentPet?.id, tokenTransactions]);

  // Fetch sleep progress for sleeping pets - reasonable refresh interval
  const { data: sleepProgress } = useQuery({
    queryKey: ["/api/pets", safePets[currentPetIndex]?.id, "sleep-progress"],
    enabled: !!safePets[currentPetIndex]?.id && safePets[currentPetIndex]?.isSleeping,
    refetchInterval: 30000, // Update every 30 seconds for sleeping pets
    queryFn: async () => {
      if (!safePets[currentPetIndex]?.id) return null;
      const response = await fetch(`/api/pets/${safePets[currentPetIndex].id}/sleep-progress`);
      const data = await response.json();
      
      // Check for auto wake-up
      if (data.autoWoken) {
        toast({
          title: t('pet.autoWoke'),
          description: t('pet.energyFull'),
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

  // REMOVED: Auto-decay system - stats now only change when users perform actions

  // Get owned toys (filter out toys that are already pets or listed in marketplace)
  const ownedToys = Array.isArray(userToys) ? userToys.filter((toy: any) => 
    toy.ownerId === user?.id &&
    !pets?.some((pet: any) => pet.toyId === toy.id) &&
    !marketplaceListings?.some((listing: any) => listing.id === toy.id && listing.isListing)
  ) : [];

  // Get unactivated toys (toys without QR codes activated)
  const unactivatedToys = ownedToys?.filter((toy: any) => !toy.isActivated) || [];



  // Bath mutation - correct endpoint
  const bathMutation = useMutation({
    mutationFn: async ({ petId }: { petId: number }) => {
      console.log('Bath button clicked - calling bathed endpoint');
      const result = await apiRequest("POST", `/api/pets/${petId}/care/bathed`, {});
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
        title: t('common.success'),
        description: t('pet.nameUpdateSuccess'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('pet.nameUpdateError'),
        variant: "destructive",
      });
    }
  });

  // Pet care mutations
  const careActivityMutation = useMutation({
    mutationFn: async ({ petId, careType }: { petId: number; careType: string }) => {
      console.log('=== CARE ACTIVITY MUTATION START ===');
      console.log('Pet ID:', petId);
      console.log('Care Type:', careType);
      console.log('Making API call to:', `/api/pets/${petId}/care/${careType}`);
      try {
        const result = await apiRequest("POST", `/api/pets/${petId}/care/${careType}`, {});
        console.log('API call successful:', result);
        console.log('=== CARE ACTIVITY MUTATION SUCCESS ===');
        return result;
      } catch (error) {
        console.error('=== CARE ACTIVITY MUTATION ERROR ===');
        console.error('API call failed:', error);
        throw error;
      }
    },

    onMutate: async ({ petId, careType }) => {
      console.log('=== OPTIMISTIC UPDATE TRIGGERED ===');
      console.log('Pet ID:', petId, 'Care Type:', careType);
      
      // Immediately update local state for instant UI feedback
      const currentPets = Array.isArray(pets) ? pets : [];
      const currentPet = currentPets.find(pet => pet?.id === petId);
      
      console.log('Current pet found:', currentPet);
      
      if (currentPet) {
        let updatedStats = { ...currentPet };
        const currentEnergy = currentPet.energy || 50;
        
        console.log('Current stats before update:', {
          hunger: currentPet.hunger,
          happiness: currentPet.happiness,
          cleanliness: currentPet.cleanliness,
          energy: currentPet.energy
        });
        
        // Apply the stat changes based on care type
        if (careType === 'fed') {
          updatedStats.hunger = Math.min(100, (currentPet.hunger || 0) + 25);
          updatedStats.energy = Math.max(0, currentEnergy - 5);
        } else if (careType === 'bathed') {
          updatedStats.cleanliness = Math.min(100, (currentPet.cleanliness || 0) + 25);
          updatedStats.energy = Math.max(0, currentEnergy - 5);
        } else if (careType === 'play') {
          updatedStats.happiness = Math.min(100, (currentPet.happiness || 0) + 25);
          updatedStats.energy = Math.max(0, currentEnergy - 5);
        }
        
        console.log('Updated stats after calculation:', {
          hunger: updatedStats.hunger,
          happiness: updatedStats.happiness,
          cleanliness: updatedStats.cleanliness,
          energy: updatedStats.energy
        });
        
        // Removed local state update to prevent conflicts with API data
      }
    },

    onSuccess: async (data, variables, context) => {
      console.log('=== CARE ACTIVITY SUCCESS HANDLER ===');
      console.log('Response data:', data);
      
      // Removed local state clearing to prevent conflicts
      
      // Refresh pets data only when care activity completes
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-stats"] });
      
      toast({
        title: t('common.success'),
        description: t('petCare.activitySuccess'),
      });
    },
    onError: (err, variables, context) => {
      // Removed local state clearing to prevent conflicts
      
      toast({
        title: t('common.error'),
        description: err.message || t('petCare.activityError'),
        variant: "destructive"
      });
    }
  });

  // Daily token reward queries
  const { data: dailyRewardStatus, refetch: refetchDailyReward } = useQuery({
    queryKey: ['/api/daily-token-reward/status'],
    enabled: !!user?.id,
    refetchInterval: 60000, // Check every minute
  });

  // Daily token reward claim mutation
  const claimDailyRewardMutation = useMutation({
    mutationFn: () => apiRequest("POST", '/api/daily-token-reward/claim', {}),
    onSuccess: () => {
      refetchDailyReward();
      queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
      toast({
        title: t('dailyToken.claimed'),
        description: t('dailyToken.received'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('dailyToken.claimFailed'),
        description: error.message || t('dailyToken.claimError'),
        variant: "destructive",
      });
    },
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
        title: t('energyPotion.success'),
        description: t('energyPotion.restored') + data.newTokenBalance,
      });
    },
    onError: (error: any) => {
      toast({
        title: t('energyPotion.failed'),
        description: error.message || t('energyPotion.error'),
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
      toast({
        title: t('common.success'),
        description: t('petCare.sleeping'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('petCare.failedSleep'),
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
      toast({
        title: t('common.success'),
        description: t('petCare.awake'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('petCare.failedWakeUp'),
        variant: "destructive"
      });
    }
  });

  // User marketplace listing creation mutation
  const createListingMutation = useMutation({
    mutationFn: async ({ toyId, price, description }: { toyId: number; price: string; description: string }) => {
      return apiRequest("POST", "/api/listings", {
        toyId,
        price,
        description
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/toys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/my-listings"] });
      toast({
        title: "Listing Created!",
        description: "Your toy is now listed in the marketplace.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Listing",
        description: error.message || "Unable to list your toy for sale.",
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
        title: t('common.success'),
        description: t('toy.activated'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('toy.activationFailed'),
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
          <p className="text-muted-foreground">{t('petCare.loading')}</p>
        </div>
      </div>
    );
  }

  // Skip Pet Care System - show admin dashboard for all users
  const userPets = Array.isArray(pets) ? pets : [];
  
  // Safe data handling - filter owned toys early for debug display
  const userOwnedToys = Array.isArray(userToys) ? userToys.filter((toy: any) => toy?.ownerId === user?.id) : [];
  
  // Show clean Pet Care System with text-based stats
  if (userPets.length > 0) {
    // Clean pet care interface without progress bars
    return (
      <div className="space-y-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            {t('petCare.system')}
          </h2>
          <p className="text-slate-600">
            {t('petCare.description')}
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
                {t('navigation.previous')}
              </Button>
              
              <div className="bg-white border rounded-lg px-4 py-2 shadow-sm">
                <span className="text-sm font-medium">
                  {t('pet.count').replace('{current}', (currentPetIndex + 1).toString()).replace('{total}', userPets.length.toString())}
                </span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPetIndex((prev) => (prev < userPets.length - 1 ? prev + 1 : 0))}
                className="flex items-center gap-2"
              >
                {t('navigation.next')}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Critical Pet Status Alert */}
        {userPets[currentPetIndex] && (
          (() => {
            const pet = userPets[currentPetIndex];
            const criticalStats = [];
            
            if (pet?.hunger === 0) criticalStats.push('Hunger');
            if (pet?.happiness === 0) criticalStats.push('Happiness');
            if (pet?.cleanliness === 0) criticalStats.push('Cleanliness');
            if (pet?.energy === 0) criticalStats.push('Energy');
            
            if (criticalStats.length > 0) {
              return (
                <div className="mx-4 mb-6">
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 shadow-lg animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">⚠️</div>
                      <div className="flex-1">
                        <h3 className="font-bold text-red-800 text-lg">
                          URGENT: Critical Pet Status!
                        </h3>
                        <p className="text-red-700 mt-1">
                          <strong>{pet?.name || 'Your pet'}</strong>'s {criticalStats.join(', ')} {criticalStats.length > 1 ? 'are' : 'is'} at 0%! 
                          Please take care of them immediately to prevent health issues.
                        </p>
                      </div>
                      <div className="text-red-600 text-3xl animate-bounce">
                        🚨
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()
        )}

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
              growthStage = t('petStage.deceased');
              dragonEmoji = "💀";
            } else if (ageInYears >= 80) {
              growthStage = t('petStage.grandTurtleDragon');
              dragonEmoji = "🐉"; // Majestic dragon
            } else if (ageInYears >= 60) {
              growthStage = t('petStage.adultTurtleDragon');
              dragonEmoji = "🐲"; // Full grown dragon
            } else if (ageInYears >= 40) {
              growthStage = t('petStage.teenagerTurtleDragon');
              dragonEmoji = "🦕"; // Large dinosaur
            } else if (ageInYears >= 20) {
              growthStage = t('petStage.youthTurtleDragon');
              dragonEmoji = "🐢"; // Turtle form
            } else {
              growthStage = t('petStage.babyTurtleDragon');
              dragonEmoji = "🐢"; // Baby turtle form
            }
            
            // FIXED: Use database values directly without frontend calculations

            // Use synchronized database values directly for accurate display
            const hunger = isDead ? 0 : (pet.hunger ?? 0);
            const cleanliness = isDead ? 0 : (pet.cleanliness ?? 0);
            const energy = isDead ? 0 : (pet.energy ?? 0);
            
            // Use database happiness value directly (no frontend calculation) - DO NOT default to 50
            const happiness = isDead ? 0 : (pet.happiness ?? 0);

            // Check if pet can earn tokens (alive, stats > 0, and at least 1 day old)
            const canEarnTokens = !isDead && days >= 1 && hunger > 0 && happiness > 0;

            return (
              <Card key={pet?.id || Math.random()} className="overflow-hidden">
                <CardHeader className={`text-white ${isDead ? 'bg-gradient-to-r from-gray-600 to-gray-800' : 'bg-gradient-to-r from-purple-500 to-pink-500'}`}>
                  <CardTitle className="flex items-center justify-between">
                    {editingPetName === pet?.id ? (
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
                                petId: pet?.id,
                                newName: newPetName.trim(),
                                currentTokens: user.tokens
                              });
                              editPetNameMutation.mutate({
                                petId: pet?.id,
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
                            setEditingPetName(pet?.id);
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
                      <span>{t('petStatus.lifetime')}</span>
                      <span className="font-mono text-lg">{timerDisplay}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>{t('petStatus.age')}</span>
                      <span>{ageInYears} {t('petStatus.yearsOld')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Gender</span>
                      <span className="capitalize">{pet.gender || 'male'} {pet.gender === 'female' ? '♀️' : '♂️'}</span>
                    </div>
                    {isDead && (
                      <div className="text-red-300 font-bold text-center">
                        💀 {t('petStatus.diedAt100')}
                      </div>
                    )}
                    {days >= 90 && !isDead && (
                      <div className="text-yellow-300 font-bold text-center">
                        ⚠️ {t('petStatus.approachingMax')}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Animated Dragon Turtle with Growth Stages */}
                    <div className="relative h-64 bg-gradient-to-b from-blue-100 to-green-100 rounded-lg overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className={isDead ? '' : pet.isSleeping ? '' : 'animate-bounce'}>
                          {/* Use custom dragon images for baby and child pets, emoji for others */}
                          {ageInYears < 20 ? (
                            <div 
                              className="w-32 h-32 mx-auto transition-transform duration-1000 hover:scale-110"
                              style={{
                                animation: isDead ? 'none' : pet.isSleeping ? 'sleepBreathe 3s ease-in-out infinite' : 'walkLeftRight 4s ease-in-out infinite',
                                filter: isDead ? 'grayscale(100%) opacity(0.3)' : hunger === 0 ? 'grayscale(100%) opacity(0.5)' : pet.isSleeping ? 'brightness(0.7)' : 'none',
                                transform: isDead ? 'rotate(90deg)' : 'none'
                              }}
                            >
                              <img 
                                src="/attached_assets/Doluruu Baby_1749663725243.png" 
                                alt="Baby Dragon"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  // Fallback to emoji if image fails to load
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling.style.display = 'block';
                                }}
                              />
                              <div 
                                className="text-6xl hidden"
                                style={{
                                  animation: isDead ? 'none' : pet.isSleeping ? 'sleepBreathe 3s ease-in-out infinite' : 'walkLeftRight 4s ease-in-out infinite',
                                  filter: isDead ? 'grayscale(100%) opacity(0.3)' : hunger === 0 ? 'grayscale(100%) opacity(0.5)' : pet.isSleeping ? 'brightness(0.7)' : 'none',
                                  transform: isDead ? 'rotate(90deg)' : 'none'
                                }}
                              >
                                {dragonEmoji}
                              </div>
                            </div>
                          ) : ageInYears >= 20 && ageInYears < 40 ? (
                            <div 
                              className="w-32 h-32 mx-auto transition-transform duration-1000 hover:scale-110"
                              style={{
                                animation: isDead ? 'none' : pet.isSleeping ? 'sleepBreathe 3s ease-in-out infinite' : 'walkLeftRight 4s ease-in-out infinite',
                                filter: isDead ? 'grayscale(100%) opacity(0.3)' : hunger === 0 ? 'grayscale(100%) opacity(0.5)' : pet.isSleeping ? 'brightness(0.7)' : 'none',
                                transform: isDead ? 'rotate(90deg)' : 'none'
                              }}
                            >
                              <img 
                                src="/attached_assets/Doluruu Boy_1749664545355.png" 
                                alt="Child Dragon"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  // Fallback to emoji if image fails to load
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling.style.display = 'block';
                                }}
                              />
                              <div 
                                className="text-6xl hidden"
                                style={{
                                  animation: isDead ? 'none' : pet.isSleeping ? 'sleepBreathe 3s ease-in-out infinite' : 'walkLeftRight 4s ease-in-out infinite',
                                  filter: isDead ? 'grayscale(100%) opacity(0.3)' : hunger === 0 ? 'grayscale(100%) opacity(0.5)' : pet.isSleeping ? 'brightness(0.7)' : 'none',
                                  transform: isDead ? 'rotate(90deg)' : 'none'
                                }}
                              >
                                {dragonEmoji}
                              </div>
                            </div>
                          ) : ageInYears >= 40 && ageInYears < 60 ? (
                            <div 
                              className="w-32 h-32 mx-auto transition-transform duration-1000 hover:scale-110"
                              style={{
                                animation: isDead ? 'none' : pet.isSleeping ? 'sleepBreathe 3s ease-in-out infinite' : 'walkLeftRight 4s ease-in-out infinite',
                                filter: isDead ? 'grayscale(100%) opacity(0.3)' : hunger === 0 ? 'grayscale(100%) opacity(0.5)' : pet.isSleeping ? 'brightness(0.7)' : 'none',
                                transform: isDead ? 'rotate(90deg)' : 'none'
                              }}
                            >
                              <img 
                                src="/attached_assets/Doluruu Teenager_1749664707625.png" 
                                alt="Teenager Dragon"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  // Fallback to emoji if image fails to load
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling.style.display = 'block';
                                }}
                              />
                              <div 
                                className="text-6xl hidden"
                                style={{
                                  animation: isDead ? 'none' : pet.isSleeping ? 'sleepBreathe 3s ease-in-out infinite' : 'walkLeftRight 4s ease-in-out infinite',
                                  filter: isDead ? 'grayscale(100%) opacity(0.3)' : hunger === 0 ? 'grayscale(100%) opacity(0.5)' : pet.isSleeping ? 'brightness(0.7)' : 'none',
                                  transform: isDead ? 'rotate(90deg)' : 'none'
                                }}
                              >
                                {dragonEmoji}
                              </div>
                            </div>
                          ) : ageInYears >= 60 && ageInYears < 80 ? (
                            <div 
                              className="w-32 h-32 mx-auto transition-transform duration-1000 hover:scale-110"
                              style={{
                                animation: isDead ? 'none' : pet.isSleeping ? 'sleepBreathe 3s ease-in-out infinite' : 'walkLeftRight 4s ease-in-out infinite',
                                filter: isDead ? 'grayscale(100%) opacity(0.3)' : hunger === 0 ? 'grayscale(100%) opacity(0.5)' : pet.isSleeping ? 'brightness(0.7)' : 'none',
                                transform: isDead ? 'rotate(90deg)' : 'none'
                              }}
                            >
                              <img 
                                src="/attached_assets/Doluruu Adult_1749664856445.png" 
                                alt="Adult Dragon"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  // Fallback to emoji if image fails to load
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling.style.display = 'block';
                                }}
                              />
                              <div 
                                className="text-6xl hidden"
                                style={{
                                  animation: isDead ? 'none' : pet.isSleeping ? 'sleepBreathe 3s ease-in-out infinite' : 'walkLeftRight 4s ease-in-out infinite',
                                  filter: isDead ? 'grayscale(100%) opacity(0.3)' : hunger === 0 ? 'grayscale(100%) opacity(0.5)' : pet.isSleeping ? 'brightness(0.7)' : 'none',
                                  transform: isDead ? 'rotate(90deg)' : 'none'
                                }}
                              >
                                {dragonEmoji}
                              </div>
                            </div>
                          ) : ageInYears >= 80 && ageInYears < 101 ? (
                            <div 
                              className="w-32 h-32 mx-auto transition-transform duration-1000 hover:scale-110"
                              style={{
                                animation: isDead ? 'none' : pet.isSleeping ? 'sleepBreathe 3s ease-in-out infinite' : 'walkLeftRight 4s ease-in-out infinite',
                                filter: isDead ? 'grayscale(100%) opacity(0.3)' : hunger === 0 ? 'grayscale(100%) opacity(0.5)' : pet.isSleeping ? 'brightness(0.7)' : 'none',
                                transform: isDead ? 'rotate(90deg)' : 'none'
                              }}
                            >
                              <img 
                                src="/attached_assets/Doluruu Grandpa_1749664964060.png" 
                                alt="Grandpa Dragon"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  // Fallback to emoji if image fails to load
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling.style.display = 'block';
                                }}
                              />
                              <div 
                                className="text-6xl hidden"
                                style={{
                                  animation: isDead ? 'none' : pet.isSleeping ? 'sleepBreathe 3s ease-in-out infinite' : 'walkLeftRight 4s ease-in-out infinite',
                                  filter: isDead ? 'grayscale(100%) opacity(0.3)' : hunger === 0 ? 'grayscale(100%) opacity(0.5)' : pet.isSleeping ? 'brightness(0.7)' : 'none',
                                  transform: isDead ? 'rotate(90deg)' : 'none'
                                }}
                              >
                                {dragonEmoji}
                              </div>
                            </div>
                          ) : ageInYears >= 101 ? (
                            <div 
                              className="w-32 h-32 mx-auto transition-transform duration-1000"
                              style={{
                                filter: 'grayscale(100%) opacity(0.6)',
                                transform: 'rotate(0deg)'
                              }}
                            >
                              <img 
                                src="/attached_assets/Doluruu Death_1749665061208.jpeg" 
                                alt="Dragon Death"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  // Fallback to emoji if image fails to load
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling.style.display = 'block';
                                }}
                              />
                              <div 
                                className="text-6xl hidden"
                                style={{
                                  filter: 'grayscale(100%) opacity(0.6)'
                                }}
                              >
                                💀
                              </div>
                            </div>
                          ) : (
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
                          )}
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
                        {t('petStatus.stage')} {growthStage}
                      </div>
                      {hunger === 0 && (
                        <div className="absolute top-2 right-2 text-red-500 font-bold">
                          💀 {t('petStatus.starving')}
                        </div>
                      )}
                      {!canEarnTokens && days < 1 && !isDead && (
                        <div className="absolute bottom-2 left-2 text-yellow-600 text-xs">
                          🕒 {t('petStatus.tooYoung')}
                        </div>
                      )}
                    </div>

                    {/* Pet Stats with Real-time Values */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl mb-2">😊</div>
                        <div className="text-sm font-medium text-gray-700">
                          {t('petStats.happiness')}
                        </div>
                        <div className={`text-2xl font-bold ${
                          happiness >= 75 ? 'text-green-600' :
                          happiness >= 50 ? 'text-purple-600' :
                          happiness >= 25 ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {happiness}%
                        </div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl mb-2">🍎</div>
                        <div className="text-sm font-medium text-gray-700">
                          {t('petStats.hunger')}
                        </div>
                        <div className={`text-2xl font-bold ${
                          hunger >= 75 ? 'text-green-600' :
                          hunger >= 50 ? 'text-purple-600' :
                          hunger >= 25 ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {hunger}%
                        </div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl mb-2">🛁</div>
                        <div className="text-sm font-medium text-gray-700">
                          {t('petStats.cleanliness')}
                        </div>
                        <div className={`text-2xl font-bold ${
                          cleanliness >= 75 ? 'text-green-600' :
                          cleanliness >= 50 ? 'text-purple-600' :
                          cleanliness >= 25 ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {cleanliness}%
                        </div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl mb-2">⚡</div>
                        <div className="text-sm font-medium text-gray-700">
                          {t('petStats.energy')}
                        </div>
                        <div className={`text-2xl font-bold ${
                          energy >= 75 ? 'text-green-600' :
                          energy >= 50 ? 'text-purple-600' :
                          energy >= 25 ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {energy}%
                        </div>
                      </div>
                    </div>

                    {/* Evolution Progress Display */}
                    <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-purple-800">
                          {t('petEvolution.progress')}
                        </h3>
                        <div className="text-2xl">🌟</div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-purple-700">
                            {t('petEvolution.currentStage')}
                          </span>
                          <span className="font-semibold text-purple-800 capitalize">
                            {growthStage}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-purple-700">
                            {t('petEvolution.petAge')}
                          </span>
                          <span className="font-semibold text-purple-800">
                            {ageInYears} {t('timeUnits.years')}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-purple-700">
                            {t('petEvolution.nextEvolution')}
                          </span>
                          <span className="font-semibold text-purple-800">
                            {ageInYears >= 80 ? t('petStages.maximum') : 
                             ageInYears >= 60 ? t('petStages.elder') :
                             ageInYears >= 40 ? t('petStages.adult') :
                             ageInYears >= 20 ? t('petStages.teen') :
                             t('petStages.child')}
                          </span>
                        </div>
                        
                        <div className="w-full bg-purple-200 rounded-full h-3">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                            style={{ 
                              width: `${Math.min(100, (ageInYears % 20) / 20 * 100)}%` 
                            }}
                          ></div>
                        </div>
                        
                        <div className="text-xs text-purple-600 text-center mt-2">
                          {isDead ? 
                            t('petEvolution.endOfLife') :
                            t('petEvolution.careToAccelerate')
                          }
                        </div>
                      </div>
                    </div>

                  {/* Daily Care Activities */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">
                      {t('dailyActivities.title')}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className={`flex items-center gap-2 p-4 h-auto flex-col ${
                          energy < 5 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        onClick={async () => {
                          if (energy < 5) {
                            toast({
                              title: t('energyNotEnough.title'),
                              description: t('energyNotEnough.description'),
                              variant: "destructive"
                            });
                            playFemaleCuteVoice("I'm too tired! I need to rest or sleep first.", isMuted);
                            return;
                          }
                          if (pet.isSleeping) {
                            playFemaleCuteVoice("Rise and shine! Time to wake up for feeding!", isMuted);
                            await wakeMutation.mutateAsync(pet?.id);
                            // Small delay to ensure wake up completes
                            setTimeout(() => {
                              playFemaleCuteVoice("Yummy time! Feeding your pet now!", isMuted);
                              careActivityMutation.mutate({ petId: pet?.id, careType: 'fed' });
                            }, 1000);
                          } else {
                            playFemaleCuteVoice("Yummy time! Feeding your pet now!", isMuted);
                            careActivityMutation.mutate({ petId: pet?.id, careType: 'fed' });
                          }
                        }}
                        disabled={careActivityMutation.isPending || wakeMutation.isPending || energy < 5}
                      >
                        <span className="text-2xl">🍎</span>
                        <span className="text-sm">
                          {t('careButtons.feed')}
                          {hunger >= 100 && <span className="text-xs block text-green-600">MAX</span>}
                          {energy < 5 && <span className="text-xs block text-red-600">LOW ENERGY</span>}
                        </span>
                      </Button>

                      <Button
                        variant="outline"
                        className={`flex items-center gap-2 p-4 h-auto flex-col ${
                          energy < 5 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        onClick={async () => {
                          if (energy < 5) {
                            toast({
                              title: t('energyNotEnough.title'),
                              description: t('energyNotEnough.description'),
                              variant: "destructive"
                            });
                            playFemaleCuteVoice("I'm too tired! I need to rest or sleep first.", isMuted);
                            return;
                          }
                          if (pet.isSleeping) {
                            playFemaleCuteVoice("Rise and shine! Time to wake up for bath time!", isMuted);
                            await wakeMutation.mutateAsync(pet?.id);
                            // Small delay to ensure wake up completes
                            setTimeout(() => {
                              playFemaleCuteVoice("Bath time! Let's get you all clean and sparkly!", isMuted);
                              careActivityMutation.mutate({ petId: pet?.id, careType: 'bathed' });
                            }, 1000);
                          } else {
                            playFemaleCuteVoice("Bath time! Let's get you all clean and sparkly!", isMuted);
                            careActivityMutation.mutate({ petId: pet?.id, careType: 'bathed' });
                          }
                        }}
                        disabled={careActivityMutation.isPending || wakeMutation.isPending || energy < 5}
                      >
                        <span className="text-2xl">🛁</span>
                        <span className="text-sm">
                          {t('careButtons.bathe')}
                          {cleanliness >= 100 && <span className="text-xs block text-green-600">MAX</span>}
                          {energy < 5 && <span className="text-xs block text-red-600">LOW ENERGY</span>}
                        </span>
                      </Button>

                      <Button
                        variant="outline"
                        className={`flex items-center gap-2 p-4 h-auto flex-col ${
                          happiness >= 100 ? 'opacity-50 cursor-not-allowed' : ''
                        } ${
                          energy < 5 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        onClick={async () => {
                          if (energy < 5) {
                            toast({
                              title: t('energyNotEnough.title'),
                              description: t('energyNotEnough.description'),
                              variant: "destructive"
                            });
                            playFemaleCuteVoice("I'm too tired! I need to rest or sleep first.", isMuted);
                            return;
                          }
                          if (happiness >= 100) {
                            toast({
                              title: t('happiness.full.title'),
                              description: t('happiness.full.description'),
                              variant: "default"
                            });
                            return;
                          }
                          if (pet.isSleeping) {
                            playFemaleCuteVoice("Rise and shine! Time to wake up for playtime!", isMuted);
                            await wakeMutation.mutateAsync(pet?.id);
                            // Small delay to ensure wake up completes
                            setTimeout(() => {
                              playFemaleCuteVoice("Playtime! Let's have some fun together!", isMuted);
                              careActivityMutation.mutate({ petId: pet?.id, careType: 'play' });
                            }, 1000);
                          } else {
                            playFemaleCuteVoice("Playtime! Let's have some fun together!", isMuted);
                            careActivityMutation.mutate({ petId: pet?.id, careType: 'play' });
                          }
                        }}
                        disabled={careActivityMutation.isPending || wakeMutation.isPending || energy < 5}
                      >
                        <span className="text-2xl">🎾</span>
                        <span className="text-sm">
                          {t('careButtons.play')}
                          {happiness >= 100 && <span className="text-xs block text-green-600">MAX</span>}
                          {energy < 5 && <span className="text-xs block text-red-600">LOW ENERGY</span>}
                        </span>
                      </Button>

                      {pet.isSleeping ? (
                        <Button
                          variant="outline"
                          className="flex items-center gap-2 p-4 h-auto flex-col bg-blue-50 border-blue-200"
                          onClick={() => {
                            playFemaleCuteVoice("Rise and shine! Time to wake up, sweetie!", isMuted);
                            wakeMutation.mutate(pet?.id);
                          }}
                          disabled={wakeMutation.isPending}
                        >
                          <span className="text-2xl">☀️</span>
                          <span className="text-sm">{t('careButtons.wakeUp')}</span>
                          <span className="text-xs text-blue-600">
                            {t('petStates.sleeping')}
                          </span>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="flex items-center gap-2 p-4 h-auto flex-col"
                          onClick={() => {
                            playFemaleCuteVoice("Sleep tight! Sweet dreams, my precious pet!", isMuted);
                            sleepMutation.mutate(pet?.id);
                          }}
                          disabled={sleepMutation.isPending || (pet.energy || 50) >= 100}
                        >
                          <span className="text-2xl">💤</span>
                          <span className="text-sm">{t('careButtons.sleep')}</span>
                          {(pet.energy || 50) >= 100 && (
                            <span className="text-xs text-gray-500">
                              {t('petStates.fullEnergy')}
                            </span>
                          )}
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        className="flex items-center gap-2 p-4 h-auto flex-col bg-purple-50 border-purple-200"
                        onClick={() => energyPotionMutation.mutate({ petId: pet?.id })}
                        disabled={energyPotionMutation.isPending || (user?.tokens || 0) < 2}
                      >
                        <span className="text-2xl">⚡</span>
                        <span className="text-sm">{t('careButtons.energy')}</span>
                        <span className="text-xs">2 tokens</span>
                      </Button>

                      {/* Sleep Timer Display */}
                      {pet.isSleeping && sleepProgress && (
                        <div className="col-span-full mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-700 mb-2">
                              💤 {t('petInfo.sleeping')}
                            </div>
                            
                            <div className="text-3xl font-mono text-blue-600 mb-2">
                              {(() => {
                                const minutes = Math.floor(sleepCountdown / 60);
                                const seconds = sleepCountdown % 60;
                                return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                              })()}
                            </div>
                            
                            <div className="text-sm text-blue-600 mb-2">
                              {t('pet.nextEnergyBoost')}
                            </div>
                            
                            <div className="text-sm text-blue-600">
                              {t('petInfo.energyRestore')}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Feeding Game */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                    <h5 className="font-semibold text-gray-900 mb-3">
                      {t('games.feedingTime')}
                    </h5>
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        setSelectedPet(pet);
                        setShowCoinGame(true);
                      }}
                      disabled={isDead}
                    >
                      🪙 {t('games.coinCatching')}
                    </Button>
                  </div>

                  {/* Comprehensive Pet Info */}
                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 text-center">
                      {t('petInfo.title')}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">{t('petInfo.born')}</span>
                        <p className="font-medium">{new Date(pet.birthDate || pet.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">{t('petInfo.age')}</span>
                        <p className="font-medium">{ageInYears} {t('common.years')}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">{t('petInfo.status')}</span>
                        <p className={`font-medium ${(() => {
                          if (isDead) return 'text-red-600';
                          const lowestStat = Math.min(hunger, cleanliness, energy, happiness);
                          if (lowestStat >= 75) return 'text-green-600';
                          if (lowestStat >= 50) return 'text-purple-600';
                          if (lowestStat >= 25) return 'text-blue-600';
                          return 'text-red-600';
                        })()}`}>
                          {(() => {
                            if (isDead) return t('petStatus.deceased');
                            const lowestStat = Math.min(hunger, cleanliness, energy, happiness);
                            if (lowestStat >= 75) return t('petStatus.healthy');
                            if (lowestStat >= 50) return t('petStatus.great');
                            if (lowestStat >= 25) return t('petStatus.good');
                            return t('petStatus.bad');
                          })()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">{t('petInfo.tokens')}</span>
                        <p className="font-medium">
                          {(() => {
                            // Count daily token rewards from this specific pet
                            const petTokenTransactions = tokenTransactions?.filter((tx: any) => 
                              tx.relatedId === pet.id && 
                              tx.type === 'earned' && 
                              tx.description?.includes('Daily token from pet')
                            ) || [];
                            return petTokenTransactions.length;
                          })()}
                        </p>
                      </div>
                    </div>
                    {!isDead && (
                      <div className="text-center text-xs text-gray-500">
                        Life remaining: {100 - days} days ({100 - ageInYears} years)
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

  // Filter out toys that are currently listed in marketplace
  const petCareToys = userOwnedToys.filter((toy: any) => {
    const isListed = Array.isArray(marketplaceListings) && marketplaceListings.some((listing: any) => 
      listing.id === toy.id && listing.isListing
    );
    return !isListed;
  });

  if (petCareToys.length === 0) {
    return (
      <div className="space-y-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            {t('pet.care.title')}
          </h2>
          <p className="text-slate-600">
            {t('pet.care.noToys')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">
          {t('pet.care.title')}
        </h2>
        <p className="text-slate-600">
          {t('pet.care.activate')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {petCareToys.map((toy: any) => (
          <Card key={toy.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="mb-4">
                  <img 
                    src={toy.imageUrl ? `${toy.imageUrl}?v=${Date.now()}` : "/api/placeholder/100/100"} 
                    alt={toy?.name || 'Toy'} 
                    className="w-24 h-24 mx-auto object-contain"
                    onError={(e) => {
                      e.currentTarget.src = "/api/placeholder/100/100";
                    }}
                    key={`${toy.id}-${toy.imageUrl}`}
                  />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{toy?.name || 'Toy'}</h3>
                <p className="text-sm text-slate-600 mb-4">{toy.series}</p>
                
                <div className="mb-4">
                  {toy.isActivated ? (
                    <Badge className="bg-purple-100 text-purple-800">
                      {t('pet.active')}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      {t('pet.notActivated')}
                    </Badge>
                  )}
                </div>

                {!toy.isActivated && (
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => showPetActivationDialog(toy)}
                    disabled={activateToyAsPetMutation.isPending}
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    {activateToyAsPetMutation.isPending 
                      ? t('pet.processing')
                      : t('pet.activateToy')
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
          <p className="text-muted-foreground">{t('petCare.loading')}</p>
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
            {t('petCareSystem.title')}
          </h2>
          <p className="text-slate-600">
            {t('petCareSystem.buyToys')}
          </p>
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-600 mb-4">
              {t('toys.noToys')}
            </p>
            <p className="text-sm text-gray-500">
              {t('toys.visitMarketplace')}
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
          {t('petCareSystem.title')}
        </h2>
        <p className="text-slate-600">
          {t('petCareSystem.description')}
        </p>
      </div>

      {/* Unactivated Toys Section */}
      {unactivatedToys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('toys.awaiting')}</CardTitle>
            <p className="text-sm text-gray-600">
              {t('toys.activateDescription')}
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
                        alt={toy?.name || 'Toy'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjM3MzkxIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn6e4PC90ZXh0Pgo8L3N2Zz4=';
                        }}
                      />
                    </div>
                    <h4 className="font-semibold">{toy?.name || 'Toy'}</h4>
                    <p className="text-xs text-gray-500 mb-1">{toy?.series || ''}</p>
                    <p className="text-sm text-gray-600 mb-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        toy?.rarity === 'rare' ? 'bg-purple-100 text-purple-800' :
                        toy?.rarity === 'common' ? 'bg-gray-100 text-gray-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {toy?.rarity || 'Unknown'}
                      </span>
                    </p>
                    <Button 
                      onClick={() => activateToyMutation.mutate(toy.qrCode)}
                      disabled={activateToyMutation.isPending}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      {t('common.born')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Token Reward Section */}
      <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-600" />
            {t('daily.tokenReward')}
          </CardTitle>
          <p className="text-sm text-gray-600">
            {t('daily.earnTokens')}
          </p>
        </CardHeader>
        <CardContent>
          <DailyTokenReward 
            language={language}
            userTokens={userTokens}
            dailyRewardStatus={dailyRewardStatus}
            claimDailyRewardMutation={claimDailyRewardMutation}
          />
        </CardContent>
      </Card>

      {/* Activated Toys (can create pets from these) */}
      {ownedToys.filter((toy: any) => toy.isActivated && !pets?.some((pet: any) => pet.toyId === toy.id)).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('toys.active')}</CardTitle>
            <p className="text-sm text-gray-600">
              {t('toys.createDescription')}
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
                        alt={toy?.name || 'Toy'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjM3MzkxIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn6e4PC90ZXh0Pgo8L3N2Zz4=';
                        }}
                      />
                    </div>
                    <h4 className="font-semibold">{toy?.name || 'Toy'}</h4>
                    <p className="text-xs text-gray-500 mb-1">{toy?.series || ''}</p>
                    <div className="mb-3">
                      <Badge className="bg-green-100 text-green-800">
                        {t('common.active')}
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
                            title: t('success.title'),
                            description: t('success.petCreated'),
                          });
                        }).catch((error) => {
                          toast({
                            title: t('error.title'), 
                            description: error.message || t('error.petCreationFailed'),
                            variant: "destructive"
                          });
                        });
                      }}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      {t('common.createPet')}
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
          <Card key={`pet-clean-${safePets[currentPetIndex].id}-${Date.now()}-${safePets[currentPetIndex].hunger}-${safePets[currentPetIndex].happiness}-${safePets[currentPetIndex].cleanliness}-${safePets[currentPetIndex].energy}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">{safePets[currentPetIndex]?.name || 'Pet'}</CardTitle>
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
                    setNewPetName(safePets[currentPetIndex]?.name || "");
                    setEditingPetName(safePets[currentPetIndex]?.id || "");
                  }}
                  className="bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200"
                >
                  ✏️ Edit Pet Name (5 tokens)
                </Button>
                
                {/* Fallback HTML button for testing */}
                <button
                  onClick={() => {
                    alert("HTML button works!");
                    setNewPetName(safePets[currentPetIndex]?.name || "");
                    setEditingPetName(safePets[currentPetIndex]?.id || "");
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
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl mb-2">💖</div>
                  <div className="text-sm font-medium text-gray-700">Happiness</div>
                  <div className={`text-2xl font-bold ${
                    (safePets[currentPetIndex].happiness || 0) >= 75 ? 'text-green-600' :
                    (safePets[currentPetIndex].happiness || 0) >= 50 ? 'text-purple-600' :
                    (safePets[currentPetIndex].happiness || 0) >= 25 ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {safePets[currentPetIndex].happiness || 0}%
                  </div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl mb-2">🍎</div>
                  <div className="text-sm font-medium text-gray-700">Hunger</div>
                  <div className={`text-2xl font-bold ${
                    (safePets[currentPetIndex].hunger || 0) >= 75 ? 'text-green-600' :
                    (safePets[currentPetIndex].hunger || 0) >= 50 ? 'text-purple-600' :
                    (safePets[currentPetIndex].hunger || 0) >= 25 ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {safePets[currentPetIndex].hunger || 0}%
                  </div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl mb-2">🛁</div>
                  <div className="text-sm font-medium text-gray-700">Cleanliness</div>
                  <div className={`text-2xl font-bold ${
                    (safePets[currentPetIndex].cleanliness || 0) >= 75 ? 'text-green-600' :
                    (safePets[currentPetIndex].cleanliness || 0) >= 50 ? 'text-purple-600' :
                    (safePets[currentPetIndex].cleanliness || 0) >= 25 ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {safePets[currentPetIndex].cleanliness || 0}%
                  </div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl mb-2">⚡</div>
                  <div className="text-sm font-medium text-gray-700">Energy</div>
                  <div className={`text-2xl font-bold ${
                    (safePets[currentPetIndex].energy || 0) >= 75 ? 'text-green-600' :
                    (safePets[currentPetIndex].energy || 0) >= 50 ? 'text-purple-600' :
                    (safePets[currentPetIndex].energy || 0) >= 25 ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {safePets[currentPetIndex].energy || 0}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily Care Activities */}
          <Card>
            <CardHeader>
              <CardTitle>{t('petCare.title')}</CardTitle>
              <p className="text-sm text-gray-600">
                {t('dailyActivities.completeAll')}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  onClick={() => {
                    playFemaleCuteVoice("Yummy time! Feeding your pet now!", isMuted);
                    careActivityMutation.mutate({ petId: safePets[currentPetIndex]?.id, careType: 'fed' });
                  }}
                  disabled={careActivityMutation.isPending || (safePets[currentPetIndex]?.energy === 0)}
                >
                  <span className="text-2xl">🍎</span>
                  <span className="text-sm">{t('petCare.feeding')}</span>
                  {safePets[currentPetIndex]?.hunger >= 100 && <span className="text-xs text-green-600">MAX</span>}
                  {safePets[currentPetIndex]?.energy === 0 && <span className="text-xs text-red-500">No Energy</span>}
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  onClick={() => {
                    playFemaleCuteVoice("Bath time! Let's get you all clean and sparkly!", isMuted);
                    careActivityMutation.mutate({ petId: safePets[currentPetIndex]?.id, careType: 'bathed' });
                  }}
                  disabled={careActivityMutation.isPending || (safePets[currentPetIndex]?.energy === 0)}
                >
                  <span className="text-2xl">🛁</span>
                  <span className="text-sm">{t('petCare.bathing')}</span>
                  {safePets[currentPetIndex]?.cleanliness >= 100 && <span className="text-xs text-green-600">MAX</span>}
                  {safePets[currentPetIndex]?.energy === 0 && <span className="text-xs text-red-500">No Energy</span>}
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  onClick={() => {
                    playFemaleCuteVoice("Playtime! Let's have some fun together!", isMuted);
                    careActivityMutation.mutate({ petId: safePets[currentPetIndex]?.id, careType: 'play' });
                  }}
                  disabled={careActivityMutation.isPending || (safePets[currentPetIndex]?.energy === 0)}
                >
                  <Sparkles className="w-6 h-6" />
                  <span className="text-sm">{t('petCare.playing')}</span>
                  {safePets[currentPetIndex]?.happiness >= 100 && <span className="text-xs text-green-600">MAX</span>}
                  {safePets[currentPetIndex]?.energy === 0 && <span className="text-xs text-red-500">No Energy</span>}
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  onClick={() => {
                    playFemaleCuteVoice("Sweet dreams! Time for a cozy nap!", isMuted);
                    careActivityMutation.mutate({ petId: safePets[currentPetIndex]?.id, careType: 'slept' });
                  }}
                  disabled={careActivityMutation.isPending}
                >
                  <Bed className="w-6 h-6" />
                  <span className="text-sm">Sleep</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2 bg-purple-50 border-purple-200"
                  onClick={() => energyPotionMutation.mutate({ petId: safePets[currentPetIndex]?.id })}
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
                      💤 {t('pet.sleeping')}
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
                      {t('pet.nextEnergyBoost')}
                    </div>
                    
                    <div className="text-sm text-blue-600">
                      {t('pet.sleepingFor', { time: formatSleepTime(sleepProgress.totalSleepTime || 0) })}
                    </div>
                    
                    <div className="text-sm text-blue-600 mb-3">
                      {t('pet.energyRestore')}
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-3">
                      {t('energy.currentEnergy')}
                      <span className="font-semibold text-blue-700">
                        {sleepProgress.currentEnergy || safePets[currentPetIndex]?.energy || 0}%
                      </span>
                    </div>
                    
                    {(sleepProgress.currentEnergy || safePets[currentPetIndex]?.energy || 0) >= 100 && (
                      <div className="text-green-600 font-semibold text-sm mb-2">
                        ✨ {t('energy.fullCanWake')}
                      </div>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-blue-300 text-blue-700 hover:bg-blue-100"
                      onClick={() => wakeMutation.mutate(safePets[currentPetIndex].id)}
                      disabled={wakeMutation.isPending}
                    >
                      {t('wakeUp.button')}
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
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pet Care Tokens:</span>
                    <span className="font-medium">{currentPetTokens}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Loyalty Points:</span>
                    <span className="font-medium">{user?.loyaltyPoints || 0}</span>
                  </div>
                </div>
                
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

function PurchaseVerificationSection({ language, user, userTokens }: { language: string; user: any; userTokens: number }) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit'>('cash');
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationPage, setVerificationPage] = useState(1);
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Get userStats for real-time balance updates
  const { data: userStats } = useQuery({
    queryKey: ['/api/user-stats'],
    enabled: !!user?.id,
    staleTime: 0, // Always get fresh data
    refetchInterval: 3000, // Poll every 3 seconds for real-time updates
  });

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
  const { data: verifications = [], isLoading, refetch: refetchVerifications } = useQuery({
    queryKey: ['/api/payment-verifications'],
    refetchOnWindowFocus: true,
    staleTime: 0, // Always refetch for real-time updates
  });

  const submitMutation = useMutation({
    mutationFn: async (data: { amount: string; description: string; paymentMethod: string; receiptImageUrl?: string }) => {
      console.log('Submitting payment verification with data:', data);
      const response = await apiRequest('POST', '/api/payment-verifications', data);
      return await response.json();
    },
    onSuccess: (result) => {
      toast({
        title: t('common.success'),
        description: t('verification.submitted'),
      });
      setAmount("");
      setDescription("");
      setReceiptImage(null);
      setImagePreview(null);
      setIsSubmitting(false);
      
      // Invalidate all payment verification queries to ensure real-time updates
      queryClient.invalidateQueries({ queryKey: ['/api/payment-verifications'] });
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0];
        return key ? key.toString().includes('/api/payment-verifications') : false;
      }});
      
      // For credit payments, immediately refresh user stats for balance update
      if (paymentMethod === 'credit') {
        // Multiple refresh strategies to ensure real-time update
        queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
        
        // Force immediate refetch with error handling
        queryClient.refetchQueries({ queryKey: ['/api/user-stats'] }).catch(console.warn);
        
        // Additional delayed refetch as fallback (0.5 seconds)
        setTimeout(() => {
          queryClient.refetchQueries({ queryKey: ['/api/user-stats'] }).catch(console.warn);
        }, 500);
        
        // Show updated balance in toast
        if (result.newCredits) {
          toast({
            title: t('common.success'),
            description: `Credit payment successful! New balance: RP ${parseFloat(result.newCredits).toLocaleString()}`,
          });
        }
      }
      
      // Also manually refetch to ensure immediate update
      refetchVerifications();
    },
    onError: (error: any) => {
      console.log('Payment verification submission error:', error);
      
      // Check for authentication error
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        toast({
          title: t('session.expired'),
          description: t('session.loginAgain'),
          variant: "destructive",
        });
        // Redirect to login after a delay
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1500);
        return;
      }
      
      toast({
        title: t('common.error'),
        description: error.message || t('verification.failed'),
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
          title: t('file.tooLarge'),
          description: t('file.maxSize'),
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
      paymentMethod,
      receiptImage: !!receiptImage,
      isSubmitting
    });
    
    // Basic validation
    if (!amount || !description) {
      toast({
        title: t('form.incompleteData'),
        description: t('form.fillAllFields'),
        variant: "destructive",
      });
      return;
    }

    // Payment method specific validation
    if (paymentMethod === 'cash' && !receiptImage) {
      toast({
        title: t('form.incompleteData'),
        description: 'Please upload a receipt image for cash payments',
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === 'credit') {
      const userCredits = parseFloat(userStats?.credits || '0');
      const purchaseAmount = parseFloat(amount);
      
      if (userCredits < purchaseAmount) {
        toast({
          title: 'Insufficient Credits',
          description: `You need RP ${purchaseAmount.toLocaleString('id-ID')} but only have RP ${userCredits.toLocaleString('id-ID')}`,
          variant: "destructive",
        });
        return;
      }
    }

    if (isSubmitting) {
      console.log('Already submitting, preventing duplicate submission');
      return;
    }

    console.log('Starting form submission...');
    setIsSubmitting(true);
    
    try {
      let imageUrl = null;
      
      // Only upload image for cash payments
      if (paymentMethod === 'cash' && receiptImage) {
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
      }
      
      const submissionData = {
        amount: parseFloat(amount).toFixed(2),
        description: description,
        paymentMethod: paymentMethod,
        ...(imageUrl && { receiptImageUrl: imageUrl }),
      };
      
      // Use the mutation directly instead of mutateAsync
      submitMutation.mutate(submissionData);
    } catch (error) {
      console.error('Error in form submission process:', error);
      toast({
        title: t('common.error'),
        description: t('purchase.submitError'),
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
      case 'approved': return t('purchase.status.approved');
      case 'rejected': return t('purchase.status.rejected');
      default: return t('purchase.status.pending');
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">
          {t('purchase.title')}
        </h2>
        <p className="text-slate-600">
          {t('purchase.description')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Purchase Calculator & Upload Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              {t('points.calculator.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg font-semibold">Cash Payment</div>
                      <div className="text-sm text-gray-600">Upload receipt for verification</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credit')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === 'credit'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg font-semibold">Credit Payment</div>
                      <div className="text-sm text-gray-600">
                        Balance: RP {parseFloat(userStats?.credits || '0').toLocaleString('id-ID')}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('points.calculator.purchaseAmount')}
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
                    {t('points.calculator.pointsEarned')}
                    <span className="font-bold">{calculatedPoints} poin</span>
                  </p>
                )}
              </div>

              {/* Service Category */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('points.calculator.serviceCategory')}
                </label>
                <Select value={description} onValueChange={setDescription}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('points.calculator.selectCategory')} />
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

              {/* Image Upload - Only for cash payments */}
              {paymentMethod === 'cash' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('payment.uploadReceipt')}
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
                          {t('common.remove')}
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <Camera className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600 mb-4">
                          {t('payment.clickToUpload')}
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
                          {t('payment.chooseFile')}
                        </label>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {t('payment.supported')}
                  </p>
                </div>
              )}

              {/* Credit Payment Info */}
              {paymentMethod === 'credit' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-800">Current Balance:</span>
                    <span className="text-lg font-bold text-green-900">
                      RP {parseFloat(userStats?.credits || '0').toLocaleString('id-ID')}
                    </span>
                  </div>
                  {amount && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-800">After Purchase:</span>
                      <span className="text-lg font-bold text-green-900">
                        RP {Math.max(0, parseFloat(userStats?.credits || '0') - parseFloat(amount || '0')).toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="button"
                onClick={handleSubmit}
                className="w-full"
                disabled={
                  isSubmitting || 
                  !amount || 
                  !description || 
                  (paymentMethod === 'cash' && !receiptImage) ||
                  (paymentMethod === 'credit' && parseFloat(user?.credits || '0') < parseFloat(amount || '0'))
                }
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    {t('common.submitting')}
                  </div>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    {paymentMethod === 'credit' ? 'Purchase with Credits' : t('payment.submitVerification')}
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
              {t('payment.verificationHistory')}
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
                <p>{t('payment.noVerifications')}</p>
                <p className="text-sm mt-2">
                  {t('payment.uploadToGetStarted')}
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
                            {new Date(verification.createdAt).toLocaleDateString(t("date.format"))}
                            {" "} {new Date(verification.createdAt).toLocaleTimeString(t("date.format"), { hour: '2-digit', minute: '2-digit' })}
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
                            {t('purchase.pointsEarned')}
                            <span className="font-bold">{verification.pointsAwarded}</span>
                          </p>
                        </div>
                      )}
                      
                      {verification.adminNotes && (
                        <div className="bg-blue-50 rounded p-2 mt-2">
                          <p className="text-sm text-blue-800">
                            <AlertTriangle className="w-4 h-4 inline mr-1" />
                            {t('purchase.adminNotes')}
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
                      {t('pagination.previous')}
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
                      {t('pagination.next')}
                    </Button>
                  </div>
                )}
                
                {/* Pagination Info */}
                {verificationPagination && (
                  <div className="mt-2 text-center text-sm text-gray-500">
                    {t('pagination.showing')} {((verificationPage - 1) * 10) + 1}
                    {t('pagination.to')} {Math.min(verificationPage * 10, verificationPagination.total || 0)}
                    {t('pagination.of')} {verificationPagination.total || 0}
                    {t('pagination.verifications')}
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
  const { t } = useTranslation();
  
  // Tooltip Guide State
  const {
    activeGuide,
    startGuide,
    completeGuide,
    skipGuide
  } = useTooltipGuide();
  
  // Marketplace state variables
  const [marketplaceView, setMarketplaceView] = useState<'seasons' | 'listings'>('seasons');
  const [showCreateListingModal, setShowCreateListingModal] = useState(false);
  const [selectedToyForSale, setSelectedToyForSale] = useState<any>(null);
  const [newListingPrice, setNewListingPrice] = useState("");
  
  // Confirmation dialog state variables
  const [showPetActivationConfirm, setShowPetActivationConfirm] = useState(false);
  const [showMarketplacePurchaseConfirm, setShowMarketplacePurchaseConfirm] = useState(false);
  const [pendingToyActivation, setPendingToyActivation] = useState<any>(null);
  const [pendingMarketplacePurchase, setPendingMarketplacePurchase] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Audio state for mute/unmute functionality
  const [isMuted, setIsMuted] = useState(() => {
    // Get mute state from localStorage, default to false (unmuted)
    const savedMuteState = localStorage.getItem('petCareSoundMuted');
    return savedMuteState === 'true';
  });
  
  // Function to toggle mute/unmute
  const toggleMute = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    localStorage.setItem('petCareSoundMuted', newMuteState.toString());
    
    // Stop any currently playing speech synthesis
    if (newMuteState && 'speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  };

  // Fetch marketplace listings (for user buy/sell)
  const { data: listings = [] } = useQuery({
    queryKey: ["/api/listings"],
    enabled: !!user?.id,
  });

  // Fetch pending purchases
  const { data: pendingPurchases = [] } = useQuery({
    queryKey: ["/api/pending-purchases"],
    enabled: !!user?.id,
  });

  // Fetch seasons for season-based purchasing
  const { data: seasons = [] } = useQuery({
    queryKey: ["/api/seasons"],
    enabled: !!user?.id,
  });

  // Fetch user's toys for creating listings
  const { data: userToys = [] } = useQuery({
    queryKey: ["/api/toys"],
    enabled: !!user?.id,
  });

  // Random toy purchase mutation
  const purchaseRandomToyMutation = useMutation({
    mutationFn: async (seasonName: string) => {
      return apiRequest("POST", "/api/purchase-random-toy", { seasonName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/toys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success!",
        description: "Random toy purchased successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to purchase toy",
        variant: "destructive",
      });
    }
  });

  // Create marketplace listing mutation
  const createListingMutation = useMutation({
    mutationFn: async ({ toyId, price }: { toyId: number; price: string }) => {
      return apiRequest("POST", "/api/listings", { toyId, price });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/toys"] });
      setShowCreateListingModal(false);
      setSelectedToyForSale(null);
      setNewListingPrice("");
      toast({
        title: "Success!",
        description: "Toy listed for sale successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create listing",
        variant: "destructive",
      });
    }
  });

  // Buy toy mutation
  const buyToyMutation = useMutation({
    mutationFn: async (listing: any) => {
      return apiRequest("POST", `/api/listings/${listing.id}/buy`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/toys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success!",
        description: "Toy purchased successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to purchase toy",
        variant: "destructive",
      });
    }
  });

  // Cancel listing mutation
  const cancelListingMutation = useMutation({
    mutationFn: async (listingId: number) => {
      return apiRequest("DELETE", `/api/listings/${listingId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/toys"] });
      toast({
        title: "Success!",
        description: "Listing cancelled successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel listing",
        variant: "destructive",
      });
    }
  });

  // Cancel purchase mutation
  const cancelPurchaseMutation = useMutation({
    mutationFn: async (purchaseId: number) => {
      return apiRequest("DELETE", `/api/pending-purchases/${purchaseId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pending-purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      toast({
        title: "Success!",
        description: "Purchase cancelled successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel purchase",
        variant: "destructive",
      });
    }
  });

  // Helper functions
  const purchaseRandomToy = (seasonName: string) => {
    purchaseRandomToyMutation.mutate(seasonName);
  };

  const createMarketplaceListing = () => {
    if (selectedToyForSale && newListingPrice) {
      createListingMutation.mutate({
        toyId: selectedToyForSale.id,
        price: newListingPrice
      });
    }
  };

  const cancelListing = (listingId: number) => {
    cancelListingMutation.mutate(listingId);
  };

  const cancelPurchase = (purchaseId: number) => {
    cancelPurchaseMutation.mutate(purchaseId);
  };

  // Get user credits for purchasing validation
  const userCredits = parseFloat(user?.credits || "0");
  
  // Enable WebSocket connection for real-time updates
  useWebSocket(true);

  // Mutation to activate toy as pet - moved to top level for global access
  const activateToyAsPetMutation = useMutation({
    mutationFn: (toy: any) => {
      console.log('*** ACTIVATING TOY AS PET:', toy);
      return apiRequest('POST', `/api/toys/${toy.id}/activate-as-pet`, {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/toys'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
      toast({
        title: "Pet Activated!",
        description: "Your pet is now active!",
      });
    },
    onError: (error: any) => {
      console.error('*** TOY ACTIVATION ERROR:', error);
      toast({
        title: "Activation Failed",
        description: error.message || "Failed to activate pet",
        variant: "destructive",
      });
    },
  });

  // Confirmation dialog handlers
  const showPetActivationDialog = (toy: any) => {
    setPendingToyActivation(toy);
    setShowPetActivationConfirm(true);
  };

  const confirmPetActivation = () => {
    if (pendingToyActivation) {
      console.log('*** FRONTEND: Confirming pet activation for toy:', pendingToyActivation);
      activateToyAsPetMutation.mutate(pendingToyActivation);
      setShowPetActivationConfirm(false);
      setPendingToyActivation(null);
    }
  };

  const showMarketplacePurchaseDialog = (listing: any) => {
    setPendingMarketplacePurchase(listing);
    setShowMarketplacePurchaseConfirm(true);
  };

  const confirmMarketplacePurchase = () => {
    if (pendingMarketplacePurchase) {
      buyToyMutation.mutate(pendingMarketplacePurchase);
      setShowMarketplacePurchaseConfirm(false);
      setPendingMarketplacePurchase(null);
    }
  };

  // Function to activate toy as pet - updated to use confirmation dialog
  const activateToyAsPet = (toy: any) => {
    showPetActivationDialog(toy);
  };

  // Update buyToy function to use confirmation dialog
  const buyToy = (listing: any) => {
    showMarketplacePurchaseDialog(listing);
  };
  
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('onboarding-completed');
  });
  
  // State for confirmations
  
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

  // Optimized data fetching with reduced API calls and improved caching
  
  // User data - fetch from database with optimized caching
  const { data: userStats, refetch: refetchUserStats, isLoading: userStatsLoading } = useQuery({
    queryKey: ['/api/user-stats'],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes stale time for better caching
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection time (replaces cacheTime)
    refetchInterval: 60000, // Reduced to 1 minute instead of 30 seconds
    refetchOnWindowFocus: false,
  });

  // Admin dashboard statistics (only for admin users)
  const { data: dashboardStats }: any = useQuery({
    queryKey: ['/api/admin/dashboard-stats'],
    enabled: user?.role === 'admin',
    refetchInterval: 30000,
    staleTime: 5000,
    retry: 3,
    queryFn: async () => {
      try {
        const response = await fetch('/api/admin/dashboard-stats', { credentials: 'include' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error('Dashboard stats error:', error);
        return { totalUsers: 0, totalToys: 0, totalPets: 0, totalRevenue: 0 };
      }
    },
  });

  // Genealogy tree data - less frequently updated
  const { data: genealogyData, isLoading: genealogyLoading } = useQuery({
    queryKey: ['/api/users/genealogy-tree'],
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes stale time
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection time
  });

  // Seasons already fetched above for marketplace

  const loyaltyPoints = userStats?.loyaltyPoints || 0;
  const lifetimePoints = userStats?.lifetimePoints || 0;
  const referralEarnings = userStats?.referralEarnings || 0;
  const userTokens = userStats?.tokens || 0;
  
  // Use real appointments and rewards from database
  const userAppointments = userStats?.appointments || [];
  const pointRedemptions = userStats?.pointRedemptions || [];
  const userReferrals = userStats?.referrals || [];

  const [language, setLanguage] = useState("en");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [username, setUsername] = useState(user?.username || "");
  const [gender, setGender] = useState(user?.gender || "");
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : "");

  // Update state when user data changes
  useEffect(() => {
    if (user) {
      setPhoneNumber(user.phoneNumber || "");
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setUsername(user.username || "");
      setGender(user.gender || "");
      setDateOfBirth(user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : "");
      setProfileImage(user.profileImageUrl || null);
    }
  }, [user]);
  const [profileImage, setProfileImage] = useState(user?.profileImageUrl || null);
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
  const [showQRCamera, setShowQRCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [selectedMarketplaceSeason, setSelectedMarketplaceSeason] = useState<string | null>(null);

  // 5-Level Loyalty Program System
  const loyaltyLevels = [
    { 
      level: 1, 
      minPoints: 0, 
      maxPoints: 499, 
      discount: 0, 
      name: t('loyaltyTier.bronze'),
      color: "from-orange-600 to-amber-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      icon: Award,
      benefits: [
        t('loyalty.platformAccess'),
        t('loyalty.basicReferral')
      ]
    },
    { 
      level: 2, 
      minPoints: 500, 
      maxPoints: 24999, 
      discount: 2, 
      name: t('loyalty.silver'),
      color: "from-gray-500 to-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      icon: Medal,
      benefits: [
        t('loyalty.discount2Percent'),
        t('loyalty.priorityBooking'),
        t('loyalty.bonusReferralPoints')
      ]
    },
    { 
      level: 3, 
      minPoints: 25000, 
      maxPoints: 249999, 
      discount: 4, 
      name: t('loyalty.gold'),
      color: "from-yellow-500 to-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      icon: Star,
      benefits: [
        t('loyalty.discount4Percent'),
        t('loyalty.exclusiveServiceAccess'),
        t('loyalty.prioritySupport'),
        t('loyalty.birthdayRewards')
      ]
    },
    { 
      level: 4, 
      minPoints: 250000, 
      maxPoints: 999999, 
      discount: 6, 
      name: t('loyalty.platinum'),
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      icon: Crown,
      benefits: [
        t('loyalty.discount6Percent'),
        t('loyalty.vipRoomAccess'),
        t('loyalty.personalAccountManager'),
        t('loyalty.freeUpgrades'),
        t('loyalty.exclusiveEvents')
      ]
    },
    { 
      level: 5, 
      minPoints: 1000000, 
      maxPoints: Infinity, 
      discount: 10, 
      name: t('loyalty.diamond'),
      color: "from-blue-600 to-indigo-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      icon: Trophy,
      benefits: [
        t('loyalty.discount10Percent'),
        t('loyalty.personalConcierge'),
        t('loyalty.unlimitedAccess'),
        t('loyalty.vipEventInvitations'),
        t('loyalty.exclusiveAnnualGifts')
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
      title: t('achievements.firstInviter'),
      description: t('achievements.inviteFirstFriend'),
      reward: t('achievements.50Points'),
      icon: Users,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    },
    {
      id: "referral_5",
      type: "referral",
      count: 5,
      title: t('achievements.socialButterfly'),
      description: t('achievements.invite5Friends'),
      reward: t('achievements.250PointsBonus'),
      icon: Star,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200"
    },
    {
      id: "referral_10",
      type: "referral",
      count: 10,
      title: t('achievements.networkBuilder'),
      description: t('achievements.build10Referrals'),
      reward: t('achievements.500PointsBonus'),
      icon: Trophy,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200"
    },
    {
      id: "referral_15",
      type: "referral",
      count: 15,
      title: t('achievements.activeAgent'),
      description: t('achievements.activeAgentDesc'),
      reward: t('achievements.activeAgentReward'),
      icon: UserCheck,
      color: "from-indigo-500 to-indigo-600",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200"
    },
    {
      id: "referral_20",
      type: "referral",
      count: 20,
      title: t('achievements.referralChampion'),
      description: t('achievements.referralChampionDesc'),
      reward: t('achievements.referralChampionReward'),
      icon: Crown,
      color: "from-yellow-500 to-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200"
    },
    {
      id: "referral_25",
      type: "referral",
      count: 25,
      title: t('achievements.masterNetworker'),
      description: t('achievements.masterNetworkerDesc'),
      reward: t('achievements.firstReward'),
      icon: Award,
      color: "from-pink-500 to-pink-600",
      bgColor: "bg-pink-50",
      borderColor: "border-pink-200"
    },
    {
      id: "referral_50",
      type: "referral",
      count: 50,
      title: t('achievements.legendaryAmbassador'),
      description: t('achievements.legendaryStatus'),
      reward: t('achievements.legendaryReward'),
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
      title: t('achievements.shoppingMentor'),
      description: t('achievements.spendRequirement'),
      reward: t('achievements.bonusPoints'),
      icon: DollarSign,
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200"
    }
  ];

  // Camera functions for QR code scanning
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera for better QR scanning
      });
      setCameraStream(stream);
      setShowQRCamera(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: t('camera.notAvailable'),
        description: t('camera.useManual'),
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowQRCamera(false);
  };

  const scanQRCode = async (videoElement: HTMLVideoElement) => {
    try {
      // Import QR scanner dynamically
      const QrScanner = (await import('qr-scanner')).default;
      
      // Create canvas to capture current video frame
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Cannot create canvas context');
      }
      
      // Set canvas size to match video
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      // Draw current video frame to canvas
      context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // Scan the canvas for QR code
      const result = await QrScanner.scanImage(canvas, { returnDetailedScanResult: true });
      
      console.log('QR Code detected:', result.data);
      
      // Set the detected QR code in the input field
      setNewToyCode(result.data);
      
      // Stop camera
      stopCamera();
      
      toast({
        title: 'QR Code Detected!',
        description: `Code: ${result.data}`,
        duration: 3000,
      });
      
      // Show success but don't auto-activate to let user confirm
      console.log('QR Code successfully set to input field:', result.data);
      
    } catch (error) {
      console.log('QR scan attempt failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Always show feedback to user
      toast({
        title: 'No QR Code Found',
        description: 'Try positioning the QR code clearly in the camera view',
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  const simulateQRDetection = () => {
    const videoElement = document.querySelector('video') as HTMLVideoElement;
    if (videoElement && cameraStream && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
      console.log('Starting QR scan with video dimensions:', videoElement.videoWidth, 'x', videoElement.videoHeight);
      scanQRCode(videoElement);
    } else {
      toast({
        title: 'Camera Not Ready',
        description: 'Please wait for camera to fully load and try again',
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

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
      title: t('achievements.resetSuccessful'),
      description: t('achievements.trackingReset'),
    });
  };
  
  const [showPurchaseConfirmation, setShowPurchaseConfirmation] = useState(false);
  const [selectedPurchaseListing, setSelectedPurchaseListing] = useState(null);
  const [newListingDescription, setNewListingDescription] = useState("");
  const referralCode = "RWG8H4K2";

  // Cash-out states
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [showCreditHistory, setShowCreditHistory] = useState(false);
  const [creditHistoryTab, setCreditHistoryTab] = useState<'credits' | 'commissions'>('credits');
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
      .filter(event => event?.isActive)
      .forEach(event => {
        if (!categories[event?.category]) {
          categories[event?.category] = {
            name: event?.category === 'beauty' 
              ? t('booking.beautyServices')
              : event?.category === 'entertainment'
              ? t('booking.entertainment') 
              : event?.category === 'restaurant'
              ? t('booking.cafeRestaurant')
              : (event?.category || '').charAt(0).toUpperCase() + (event?.category || '').slice(1), // Use custom category name as-is
            options: [],
            startingPrice: "0"
          };
        }
        
        categories[event?.category]?.options.push({
          value: (event?.title || '').toLowerCase().replace(/\s+/g, '_'),
          label: event?.title || '',
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
          const selectedCategory = serviceCategories?.[newAppointment.category];
          const selectedService = selectedCategory?.options?.find(opt => opt?.value === newAppointment.service);
          
          if (selectedService) {
            const response = await fetch(
              `/api/appointments/availability?date=${newAppointment.date}&service=${encodeURIComponent(selectedService?.label || '')}`
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

  // Fetch all marketplace listings from database with seasonal filtering
  const { data: marketplaceListings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ['/api/listings', selectedMarketplaceSeason],
    enabled: !!user,
    queryFn: async () => {
      const url = selectedMarketplaceSeason 
        ? `/api/listings?season=${encodeURIComponent(selectedMarketplaceSeason)}`
        : '/api/listings';
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch listings');
      return response.json();
    }
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

  // Marketplace listing mutation already defined above

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
    onSuccess: (response) => {
      // Invalidate all token-related queries for immediate updates
      queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tokens/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/token-claims'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      setShowTokenClaimModal(false);
      setTokenClaimAmount("");
      toast({
        title: t('common.success'),
        description: t('tokens.claimSubmittedSuccess'),
      });
    },
    onError: (error: any) => {
      console.error('Token claim error:', error);
      toast({
        title: t('common.error'),
        description: error?.message || t('tokens.claimSubmitFailed'),
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
    const statusMatch = appointmentsFilter === 'all' || appointment?.status === appointmentsFilter;
    const dateMatch = !appointmentsDateFilter || 
      new Date(appointment?.createdAt || new Date()).toISOString().split('T')[0] === appointmentsDateFilter;
    return statusMatch && dateMatch;
  });

  // Fetch credit history from database - optimized with caching
  const { data: creditHistoryData = [], isLoading: creditHistoryLoading } = useQuery({
    queryKey: [`/api/credit-history/${user?.id}`],
    enabled: !!user?.id && !userStatsLoading, // Wait for user stats first
    staleTime: 2 * 60 * 1000, // 2 minutes stale time
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    retry: false,
  });

  // Fetch commission history from database - optimized with caching
  const { data: commissionHistoryData, isLoading: commissionHistoryLoading } = useQuery({
    queryKey: [`/api/commission-history/${user?.id}`],
    enabled: !!user?.id && !userStatsLoading, // Wait for user stats first
    staleTime: 2 * 60 * 1000, // 2 minutes stale time
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    retry: false,
  });

  // Fetch commission stats - optimized with caching
  const { data: commissionStats, isLoading: commissionStatsLoading } = useQuery({
    queryKey: [`/api/commission-stats/${user?.id}`],
    enabled: !!user?.id && !userStatsLoading, // Wait for user stats first
    staleTime: 2 * 60 * 1000, // 2 minutes stale time
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
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
      benefits: [t('loyalty.bonusPoints'), t('loyalty.birthdayDiscount'), t('loyalty.freeShipping')]
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
        name: reward?.name || "",
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
    const referralLink = `${window.location.origin}/login?ref=${referralCode}`;
    navigator.clipboard.writeText(referralLink);
    toast({
      title: t('referral.copied'),
      description: t('referral.linkCopied'),
    });
  };

  const bookAppointment = async () => {
    if (!newAppointment.category || !newAppointment.service || !newAppointment.date || !newAppointment.time) {
      toast({
        title: t('common.error'),
        description: t('appointments.fillAllFields'),
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
        title: t('common.error'),
        description: t('appointments.twoHourNotice'),
        variant: "destructive"
      });
      return;
    }

    const selectedCategory = serviceCategories?.[newAppointment.category];
    const selectedService = selectedCategory?.options?.find(opt => opt?.value === newAppointment.service);
    
    try {
      // Create appointment in database with proper date format
      const appointmentDateTime = new Date(`${newAppointment.date}T${newAppointment.time}:00`);
      
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: selectedService?.label || '',
          description: `${newAppointment.category} service booking`,
          appointmentDate: appointmentDateTime.toISOString(),
          duration: 60,
          cost: (selectedService?.cost || 0).toString()
        })
      });

      if (response.ok) {
        toast({
          title: t('common.success'),
          description: t('appointments.bookingSuccess'),
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
          title: t('common.success'),
          description: t('appointments.rescheduleSuccess'),
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
          title: t('common.success'),
          description: t('appointments.deleteSuccess'),
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
      title: t('common.success'),
      description: t('credits.addSuccess', { amount: formatRupiah(amount) }),
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
        title: t('common.error'),
        description: t('form.fillAllFields'),
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(cashOutAmount);
    if (amount < 50000) {
      toast({
        title: t('common.error'),
        description: t('cashout.minimumAmount'),
        variant: "destructive"
      });
      return;
    }

    if (amount > userCredits) {
      toast({
        title: t('common.error'),
        description: t('credits.insufficient'),
        variant: "destructive"
      });
      return;
    }

    // Validate account number format for selected bank
    if (!validateAccountNumber(bankName, accountNumber)) {
      const bank = indonesianBanks.find(b => b.code === bankName);
      toast({
        title: t('account.invalidAccountNumber'),
        description: t('account.accountNumberDigits', { 
          bankName: bank?.name || "", 
          minDigits: bank?.minDigits, 
          maxDigits: bank?.maxDigits 
        }),
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
        title: t('common.success'),
        description: t('cashout.requestSubmitted'),
      });

      // Refresh cash-out history from API
      queryClient.invalidateQueries({ queryKey: ['/api/cashout/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
      
      // Add transaction to history
      // Transaction history now handled by database queries
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('cashout.processingFailed'),
        variant: "destructive"
      });
    }
  };

  const addToyByCode = async () => {
    if (!newToyCode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a QR code',
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Attempting to activate toy with QR code:', newToyCode);
      
      const response = await fetch('/api/toys/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          qrCode: newToyCode.trim()
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to activate toy');
      }

      // Refresh toy inventory
      queryClient.invalidateQueries({ queryKey: ['/api/toys'] });
      
      setNewToyCode("");
      
      toast({
        title: 'Success!',
        description: `Toy "${data.toy?.name || 'Unknown'}" activated successfully!`,
        duration: 4000,
      });
      
      console.log('Toy activated successfully:', data.toy);
      
    } catch (error: any) {
      console.error('Toy activation error:', error);
      toast({
        title: 'Activation Failed',
        description: error.message || 'Failed to activate toy. Please check the QR code.',
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  // createMarketplaceListing function already defined above

  const initiateRedemption = (reward: any) => {
    if (loyaltyPoints < reward.pointsCost) {
      toast({
        title: t('rewards.insufficientPoints'),
        description: t('rewards.needMorePoints', { points: reward.pointsCost - loyaltyPoints }),
        variant: "destructive"
      });
      return;
    }

    // Check stock availability
    if (reward.stockQuantity && reward.stockQuantity <= 0) {
      toast({
        title: t('rewards.outOfStock'),
        description: t('rewards.unavailable'),
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
        title: t('rewards.redeemed'),
        description: result.creditAdded 
          ? t('rewards.redeemedWithCredit', { name: selectedReward?.name || 'Reward', credit: result.creditAdded })
          : t('rewards.redeemedSuccess', { name: selectedReward?.name || 'Reward' })
      });
      
      setShowRedeemConfirmation(false);
      setSelectedReward(null);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('rewards.redeemError'),
        variant: "destructive"
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  // purchaseRandomToyMutation and purchaseRandomToy function already defined above

  // cancelListing function already defined above

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
          title: t('marketplace.saleCancelled'),
          description: t('marketplace.itemReturnedWithRefund')
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

  // cancelPurchase function already defined above

  // buyToy and confirmPurchaseDialog functions already defined above

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
          title: t('marketplace.confirmationSuccessful'),
          description: t('marketplace.saleConfirmedWaitingBuyer'),
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
          title: t('marketplace.saleConfirmed'),
          description: t('account.creditsAdded')
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

  // Onboarding handlers
  const handleOnboardingClose = () => {
    setShowOnboarding(false);
    localStorage.setItem('onboarding-completed', 'true');
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    localStorage.setItem('onboarding-completed', 'true');
    toast({
      title: t('onboarding.complete.title'),
      description: t('onboarding.complete.description'),
    });
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: t('profile.passwordMismatch'),
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error", 
        description: t('profile.passwordMinLength'),
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
          title: t('common.success'),
          description: t('profile.passwordChangedSuccessfully')
        });
        setShowPasswordModal(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || t('profile.passwordChangeFailed'),
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: t('common.errorOccurred'),
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
          title: t('common.success'),
          description: t('settings.notificationsSaved')
        });
        setShowEmailModal(false);
      } else {
        toast({
          title: "Error",
          description: t('settings.saveFailed'),
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: t('common.errorOccurred'),
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
          username,
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
          title: t('common.success') + '!',
          description: t('profile.updateSuccess'),
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
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Enhanced Modern App Header */}
      <div className="bg-white/95 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50 shadow-lg">
        <div className="w-full px-3 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            {/* Left Side - Logo and Welcome Text */}
            <div className="flex items-center space-x-3 flex-1">
              {/* Mobile Back Button - Show when not on dashboard tab */}
              {activeTab !== "dashboard" && (
                <Button
                  onClick={() => setActiveTab("dashboard")}
                  variant="ghost"
                  size="sm"
                  className="md:hidden flex items-center gap-2 text-slate-600 hover:text-slate-900 p-2 mr-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span className="text-sm font-medium">Back</span>
                </Button>
              )}
              
              <Button
                onClick={() => setActiveTab("dashboard")}
                className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center p-2 shadow-lg hover:scale-105 transition-all duration-300"
              >
                <img src={logoImage} alt="Reborn Wave House" className="w-8 h-8 object-contain filter brightness-0 invert" />
              </Button>
              
              <div className="hidden lg:flex items-center space-x-3">
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-700">
                    {t('dashboard.welcome')}, {user?.firstName || 'User'}!
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.role === 'admin' ? 'Administrator' : 'Member'}
                  </p>
                </div>
              </div>
            </div>

            {/* Center - Empty Space */}
            <div className="flex-shrink-0">
            </div>
            
            {/* Right Side Controls - Enhanced Design */}
            <div className="flex items-center space-x-3 md:space-x-5 flex-1 justify-end">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-1 shadow-md">
                <LanguageSelector />
              </div>
              
              {/* Admin Dashboard Button - Only for admin users */}
              {user?.role === 'admin' && (
                <div className="relative group">
                  <Button
                    onClick={() => window.location.href = '/admin'}
                    variant="outline"
                    size="sm"
                    className="bg-white/80 backdrop-blur-sm hover:bg-white/90 border-gray-200 shadow-md rounded-xl transition-all duration-300 hover:scale-105 w-10 h-10 p-0"
                    title="Admin Dashboard"
                  >
                    <Settings className="w-4 h-4 text-purple-600" />
                  </Button>
                  <div className="absolute hidden group-hover:block -bottom-8 right-0 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    Admin Dashboard
                  </div>
                </div>
              )}

              {/* Audio Mute/Unmute Button */}
              <div className="relative group">
                <Button
                  onClick={toggleMute}
                  variant="outline"
                  size="sm"
                  className="bg-white/80 backdrop-blur-sm hover:bg-white/90 border-gray-200 shadow-md rounded-xl transition-all duration-300 hover:scale-105 w-10 h-10 p-0"
                  title={isMuted ? "Unmute Sound" : "Mute Sound"}
                >
                  {isMuted ? 
                    <VolumeX className="w-4 h-4 text-red-600" /> : 
                    <Volume2 className="w-4 h-4 text-green-600" />
                  }
                </Button>
                <div className="absolute hidden group-hover:block -bottom-8 right-0 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  {isMuted ? "Unmute Sound" : "Mute Sound"}
                </div>
              </div>

              {/* Help Button - Guide Access */}
              <div className="relative group">
                <Button
                  onClick={() => startGuide('dashboard')}
                  variant="outline"
                  size="sm"
                  className="bg-white/80 backdrop-blur-sm hover:bg-white/90 border-gray-200 shadow-md rounded-xl transition-all duration-300 hover:scale-105 w-10 h-10 p-0"
                  title={t('tooltip.guiding')}
                  data-tooltip-target="help-guide"
                >
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                </Button>
                <div className="absolute hidden group-hover:block -bottom-8 right-0 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  {t('tooltip.guiding')}
                </div>
              </div>
              
              {/* User Profile Icon */}
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              
              {/* Logout Button - Enhanced Design */}
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/api/logout'}
                size="sm"
                className="hidden md:flex bg-white/80 backdrop-blur-sm hover:bg-white/90 border-gray-200 shadow-md rounded-xl transition-all duration-300 hover:scale-105"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t('dashboard.logout')}
              </Button>
              


              {/* Mobile Logout - Enhanced Icon Only */}
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/api/logout'}
                size="sm"
                className="md:hidden p-3 bg-white/80 backdrop-blur-sm hover:bg-white/90 border-gray-200 shadow-md rounded-xl transition-all duration-300 hover:scale-105"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Desktop Navigation Tabs - Modern App UI with Scrollable */}
      <div className="bg-white/95 backdrop-blur-lg border-b border-gray-100 hidden md:block shadow-sm">
        <div className="w-full px-4 lg:px-6">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 lg:gap-3 py-3 min-w-max">
            {[
              { id: "dashboard", label: t('tabs.dashboard'), icon: Home, color: "from-blue-500 to-blue-600" },
              { id: "petcare", label: t('petcare.title'), icon: Heart, color: "from-pink-500 to-rose-600" },
              { id: "purchase", label: t('purchase.verification'), icon: Camera, color: "from-indigo-500 to-indigo-600" },
              { id: "loyalty", label: t('loyalty.title'), icon: Star, color: "from-yellow-500 to-amber-600" },
              { id: "kos", label: "KOS", icon: Crown, color: "from-pink-600 to-fuchsia-600" },
              { id: "bookings", label: t('bookings.title'), icon: Calendar, color: "from-green-500 to-emerald-600" },
              { id: "marketplace", label: t('marketplace.title'), icon: ShoppingBag, color: "from-purple-500 to-purple-600" },
              { id: "inventory", label: t('inventory.title'), icon: Package, color: "from-orange-500 to-orange-600" },
              ...(user?.role === 'admin' ? [{ id: "admin", label: t('tabs.admin'), icon: Settings, color: "from-red-500 to-red-600" }] : []),
              { id: "referrals", label: t('tabs.referrals'), icon: Users, color: "from-teal-500 to-teal-600" },
              { id: "profile", label: t('tabs.profile'), icon: User, color: "from-gray-500 to-gray-600" }
            ].map((tab) => (
              <button
                key={tab.id}
                data-tab={tab.id}
                onClick={() => {
                  if (tab.id === "petcare") {
                    playDoluruuSound(isMuted);
                  }
                  setActiveTab(tab.id);
                }}
                className={`relative flex items-center space-x-2 lg:space-x-3 py-3 lg:py-4 px-4 lg:px-5 rounded-2xl font-medium text-sm lg:text-base whitespace-nowrap transition-all duration-300 transform hover:scale-105 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-white to-gray-50 text-gray-900 shadow-lg border border-gray-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {/* Active indicator background */}
                {activeTab === tab.id && (
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${tab.color} opacity-5`} />
                )}
                
                {/* Icon with modern styling */}
                <div className={`relative flex items-center justify-center w-5 h-5 lg:w-6 lg:h-6 rounded-lg transition-all duration-300 ${
                  activeTab === tab.id
                    ? `bg-gradient-to-br ${tab.color} text-white shadow-md`
                    : ''
                }`}>
                  <tab.icon className={`w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0 transition-all duration-300 ${
                    activeTab === tab.id ? 'text-white scale-110' : ''
                  }`} />
                </div>
                
                {/* Label with enhanced typography */}
                <span className={`truncate transition-all duration-300 ${
                  activeTab === tab.id ? 'font-semibold' : ''
                }`}>
                  {tab.label}
                </span>
                
                {/* Active indicator bar */}
                {activeTab === tab.id && (
                  <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 rounded-full bg-gradient-to-r ${tab.color} shadow-lg`} />
                )}
              </button>
            ))}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Mobile Bottom Navigation - Modern App UI */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 md:hidden z-40 shadow-2xl">
        <div className="safe-area-inset-bottom">
          <div className="grid grid-cols-5 gap-1 px-3 py-2">
            {[
              { id: "dashboard", label: t('tabs.dashboard'), icon: Home, color: "from-blue-500 to-blue-600", bg: "bg-blue-500" },
              { id: "petcare", label: t('petcare.title'), icon: Heart, color: "from-pink-500 to-rose-600", bg: "bg-pink-500" },
              { id: "kos", label: "KOS", icon: Crown, color: "from-pink-600 to-fuchsia-600", bg: "bg-pink-600" },
              { id: "loyalty", label: t('loyalty.title'), icon: Star, color: "from-yellow-500 to-amber-600", bg: "bg-yellow-500" },
              { id: "profile", label: t('tabs.profile'), icon: User, color: "from-emerald-500 to-green-600", bg: "bg-emerald-500" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === "petcare") {
                    playDoluruuSound(isMuted);
                  }
                  setActiveTab(tab.id);
                }}
                className={`relative flex flex-col items-center justify-center py-3 px-2 rounded-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                  activeTab === tab.id
                    ? 'scale-105'
                    : ''
                }`}
                data-navigation-tab={tab.id}
              >
                {/* Animated background for active state */}
                {activeTab === tab.id && (
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${tab.color} opacity-10 animate-pulse`} />
                )}
                
                {/* Icon container with modern design */}
                <div className={`relative flex items-center justify-center w-10 h-10 rounded-2xl mb-1 transition-all duration-300 shadow-lg ${
                  activeTab === tab.id
                    ? `bg-gradient-to-br ${tab.color} text-white shadow-lg`
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}>
                  <tab.icon className={`w-5 h-5 transition-all duration-300 ${
                    activeTab === tab.id ? 'scale-110' : ''
                  }`} />
                  
                  {/* Active state glow effect */}
                  {activeTab === tab.id && (
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${tab.color} opacity-20 blur-sm`} />
                  )}
                </div>
                
                {/* Label with enhanced typography */}
                <span className={`text-xs font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'text-gray-900 font-semibold'
                    : 'text-gray-500'
                }`}>
                  {tab.label}
                </span>
                
                {/* Active indicator - modern dot */}
                {activeTab === tab.id && (
                  <div className={`absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full bg-gradient-to-r ${tab.color} shadow-lg animate-bounce`} />
                )}
                
                {/* Ripple effect on tap */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 rounded-2xl bg-black opacity-0 transition-opacity duration-150 active:opacity-10" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top-up Payment Modal */}
      {showTopUpModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowTopUpModal(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">{t('credits.topUp')}</h3>
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
                placeholder={t('credits.customAmount')}
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
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cash-out Modal */}
      {showCashOutModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCashOutModal(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4 text-green-600">
              {t('cashout.withdrawToBank')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('cashout.withdrawalAmount')}
                </label>
                <Input
                  placeholder={t("cashout.minimumAmount")}
                  value={cashOutAmount}
                  onChange={(e) => setCashOutAmount(e.target.value)}
                  type="number"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t("cashout.availableBalance", { amount: formatRupiah(userCredits) })}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("cashout.bankName")}
                </label>
                <Select onValueChange={setBankName}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("cashout.selectBank")} />
                  </SelectTrigger>
                  <SelectContent>
                    {indonesianBanks.map((bank) => (
                      <SelectItem key={bank.code} value={bank.code}>
                        {bank.icon} {bank?.name || 'Bank'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("cashout.accountNumber")}
                </label>
                <Input
                  placeholder={
                    bankName ? 
                      (() => {
                        const bank = indonesianBanks.find(b => b.code === bankName);
                        return bank ? 
                          `${bank.minDigits === bank.maxDigits ? bank.minDigits : `${bank.minDigits}-${bank.maxDigits}`} digits` :
                          t("cashout.enterAccountNumber");
                      })() :
                      t("cashout.selectBankFirst")
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
                          {t("cashout.bankValidation", { 
                            bankName: bank?.name || "",
                            digits: bank.minDigits === bank.maxDigits ? bank.minDigits : `${bank.minDigits}-${bank.maxDigits}`,
                            status: isValid ? '✓' : '✗'
                          })}
                        </span>
                      ) : null;
                    })()}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("cashout.accountHolderName")}
                </label>
                <Input
                  placeholder={t("cashout.nameAsPerBank")}
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-700">
                  {t("cashout.withdrawalNotice")}
                </p>
              </div>

              <div className="flex space-x-2">
                <Button onClick={processCashOut} className="flex-1 bg-green-600 hover:bg-green-700">
                  {t("cashout.submitWithdrawal")}
                </Button>
                <Button variant="outline" onClick={() => setShowCashOutModal(false)} className="flex-1">
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Listing Modal */}
      {showCreateListingModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreateListingModal(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">{t("marketplace.sellMyToy")}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("marketplace.selectToy")}
                </label>
                <Select onValueChange={(value) => setSelectedToyForSale(toyInventory.find(toy => toy.id.toString() === value))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("marketplace.selectToyToSell")} />
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
                  {t("marketplace.sellingPrice")}
                </label>
                <Input
                  placeholder={t("marketplace.enterPrice")}
                  value={newListingPrice}
                  onChange={(e) => setNewListingPrice(e.target.value)}
                  type="number"
                />
              </div>

              <div className="flex space-x-2">
                <Button onClick={createMarketplaceListing} className="flex-1" disabled={!selectedToyForSale || !newListingPrice}>
                  {t("marketplace.createListing")}
                </Button>
                <Button variant="outline" onClick={() => setShowCreateListingModal(false)} className="flex-1">
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile-Optimized Content Area */}
      <div className="w-full px-3 md:px-4 py-4 md:py-8 pb-20 md:pb-8">
        
        {/* Dynamic Role-Based Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-4 md:space-y-8">
            {/* Role-Based Welcome Section */}
            <div className={`rounded-xl p-4 md:p-8 text-white ${
              user?.role === 'admin' 
                ? 'bg-gradient-to-r from-purple-600 to-indigo-700' 
                : 'bg-gradient-to-r from-blue-600 to-purple-600'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl md:text-3xl font-bold mb-2">
                    {user?.role === 'admin' ? (
                      <>
                        {t('dashboard.welcome')}, Admin {user?.firstName || 'User'}!
                        <div className="inline-flex items-center ml-3 px-3 py-1 bg-white/20 rounded-full">
                          <Settings className="w-4 h-4 mr-1" />
                          <span className="text-sm font-medium">Administrator</span>
                        </div>
                      </>
                    ) : (
                      `${t('dashboard.welcome')}, ${user?.firstName || 'User'}!`
                    )}
                  </h2>
                  <p className="text-blue-100 text-sm md:text-base">
                    {user?.role === 'admin' ? (
                      `System Administrator • ${loyaltyPoints} ${t('dashboard.points')} • RP ${formatRupiah(userCredits)}`
                    ) : (
                      `Level ${currentLoyaltyLevel.level} • ${loyaltyPoints} ${t('dashboard.points')} • RP ${formatRupiah(userCredits)}`
                    )}
                  </p>
                </div>
                
                {/* Quick Admin Access */}
                {user?.role === 'admin' && (
                  <div className="hidden md:flex items-center space-x-3">
                    <Button
                      onClick={() => window.location.href = '/admin'}
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50"
                      size="sm"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Admin Panel
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Promotion Banners - Single Column on Mobile */}
            {activePromotionBanners.length > 0 && (
              <div className="w-full">
                {activePromotionBanners.map((banner: any) => (
                  <Card key={banner.id} className={`w-full max-w-full mb-6 text-white ${
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

            {/* Role-Based Mobile Navigation Buttons */}
            {user?.role === 'admin' ? (
              // Admin Dashboard - Enhanced Management Controls (removed duplicate Admin Panel button)
              <div className="grid md:hidden grid-cols-2 gap-3 mb-6 px-4 w-full max-w-sm mx-auto">
                <Button 
                  onClick={() => setActiveTab("purchase")} 
                  className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex flex-col items-center justify-center p-2"
                >
                  <Eye className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">Payments</span>
                </Button>

                <Button 
                  onClick={() => setActiveTab("petcare")} 
                  className="w-full h-20 bg-pink-600 hover:bg-pink-700 text-white rounded-xl flex flex-col items-center justify-center p-2"
                >
                  <Heart className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">Pet Management</span>
                </Button>

                <Button 
                  onClick={() => setActiveTab("marketplace")} 
                  className="w-full h-20 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex flex-col items-center justify-center p-2"
                >
                  <TrendingUp className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">Analytics</span>
                </Button>

                <Button 
                  onClick={() => setActiveTab("inventory")} 
                  className="w-full h-20 bg-orange-600 hover:bg-orange-700 text-white rounded-xl flex flex-col items-center justify-center p-2"
                >
                  <Package className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">Inventory</span>
                </Button>
              </div>
            ) : (
              // Regular User Dashboard - Core Features
              <div className="grid md:hidden grid-cols-2 gap-3 mb-6 px-4 w-full max-w-sm mx-auto">
                <Button 
                  onClick={() => setActiveTab("purchase")} 
                  className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex flex-col items-center justify-center p-2"
                >
                  <Camera className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">{t('purchase.verification')}</span>
                </Button>

                <Button 
                  onClick={() => setActiveTab("bookings")} 
                  className="w-full h-20 bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex flex-col items-center justify-center p-2"
                >
                  <Calendar className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">{t('booking.title')}</span>
                </Button>

                <Button 
                  onClick={() => setActiveTab("inventory")} 
                  className="w-full h-20 bg-pink-600 hover:bg-pink-700 text-white rounded-xl flex flex-col items-center justify-center p-2"
                >
                  <Package className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">{t('toys.myCollection')}</span>
                </Button>

                <Button 
                  onClick={() => setActiveTab("referrals")} 
                  className="w-full h-20 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex flex-col items-center justify-center p-2"
                >
                  <Users className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">{t('referral.program')}</span>
                </Button>
              </div>
            )}

            {/* Role-Based Dashboard Stats Layout */}
            <div className="block md:hidden">
              {user?.role === 'admin' ? (
                // Admin System Overview Stats
                <div className="space-y-4">
                  <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                    {/* System Users */}
                    <div className="border-b border-gray-200" data-dashboard-element="system-users">
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-gray-900 font-medium">Total Users</span>
                        </div>
                        <span className="text-gray-900 font-bold">{dashboardStats?.totalUsers || 0}</span>
                      </div>
                    </div>

                    {/* System Pets */}
                    <div className="border-b border-gray-200" data-dashboard-element="system-pets">
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center">
                            <Heart className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-gray-900 font-medium">Active Pets</span>
                        </div>
                        <span className="text-gray-900 font-bold">{dashboardStats?.totalPets || 0}</span>
                      </div>
                    </div>

                    {/* System Revenue */}
                    <div className="border-b border-gray-200" data-dashboard-element="system-revenue">
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-gray-900 font-medium">Total Revenue</span>
                        </div>
                        <span className="text-gray-900 font-bold">RP {dashboardStats?.totalRevenue ? Number(dashboardStats.totalRevenue).toLocaleString('id-ID') : '0'}</span>
                      </div>
                    </div>

                    {/* Pending Approvals */}
                    <div className="border-b border-gray-200" data-dashboard-element="pending-approvals">
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                            <Clock className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-gray-900 font-medium">Pending Approvals</span>
                        </div>
                        <span className="text-gray-900 font-bold">0</span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Personal Stats */}
                  <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                    <div className="p-4 bg-purple-50 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-purple-900">Personal Account</h3>
                    </div>
                    
                    {/* Admin Credits */}
                    <div className="border-b border-gray-200" data-dashboard-element="admin-credits">
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                            <DollarSign className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-gray-900 font-medium">{t('dashboard.credits')}</span>
                        </div>
                        <span className="text-gray-900 font-bold">RP {formatRupiah(parseFloat(userStats?.credits || '0'))}</span>
                      </div>
                    </div>

                    {/* Admin Points */}
                    <div className="border-b border-gray-200" data-dashboard-element="admin-points">
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                            <Gift className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-gray-900 font-medium">{t('dashboard.loyaltyPoints')}</span>
                        </div>
                        <span className="text-gray-900 font-bold">{loyaltyPoints}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Regular User Personal Stats
                <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                  {/* Credits */}
                  <div className="border-b border-gray-200" data-dashboard-element="credits-card">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        const buttonsDiv = document.getElementById('credits-buttons');
                        if (buttonsDiv) {
                          buttonsDiv.style.display = buttonsDiv.style.display === 'none' ? 'flex' : 'none';
                        }
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-gray-900 font-medium">{t('dashboard.credits')}</span>
                      </div>
                      <span className="text-gray-900 font-bold">RP {formatRupiah(parseFloat(userStats?.credits || '0'))}</span>
                    </div>
                    <div id="credits-buttons" className="justify-around pb-4 px-4" style={{ display: 'none' }}>
                      <button 
                        onClick={() => setShowCreditTopUpModal(true)}
                        className="flex flex-col items-center space-y-1 text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <Plus className="w-4 h-4" />
                        </div>
                        <span className="text-xs">Top Up</span>
                      </button>
                      <button 
                        onClick={() => setShowCashOutModal(true)}
                        className="flex flex-col items-center space-y-1 text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <ArrowLeft className="w-4 h-4" />
                        </div>
                        <span className="text-xs">Cash Out</span>
                      </button>
                      <button 
                        onClick={() => {
                          setModalHistoryFilter("credits");
                          setModalHistoryPage(1);
                          setShowHistoryModal(true);
                        }}
                        className="flex flex-col items-center space-y-1 text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <Clock className="w-4 h-4" />
                        </div>
                        <span className="text-xs">History</span>
                      </button>
                    </div>
                  </div>

                {/* Loyalty Points */}
                <div className="border-b border-gray-200" data-dashboard-element="loyalty-card">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      const buttonsDiv = document.getElementById('loyalty-buttons');
                      if (buttonsDiv) {
                        buttonsDiv.style.display = buttonsDiv.style.display === 'none' ? 'flex' : 'none';
                      }
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                        <Gift className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-gray-900 font-medium">{t('dashboard.loyaltyPoints')}</span>
                    </div>
                    <span className="text-gray-900 font-bold">{loyaltyPoints}</span>
                  </div>
                  <div id="loyalty-buttons" className="justify-around pb-4 px-4" style={{ display: 'none' }}>
                    <button 
                      onClick={() => setActiveTab("loyalty")}
                      className="flex flex-col items-center space-y-1 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <Gift className="w-4 h-4" />
                      </div>
                      <span className="text-xs">Rewards</span>
                    </button>
                    <button 
                      onClick={() => {
                        setModalHistoryFilter("points");
                        setModalHistoryPage(1);
                        setShowHistoryModal(true);
                      }}
                      className="flex flex-col items-center space-y-1 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                      </div>
                      <span className="text-xs">History</span>
                    </button>
                  </div>
                </div>

                {/* Tokens */}
                <div className="border-b border-gray-200" data-dashboard-element="tokens-card">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      const buttonsDiv = document.getElementById('tokens-buttons');
                      if (buttonsDiv) {
                        buttonsDiv.style.display = buttonsDiv.style.display === 'none' ? 'flex' : 'none';
                      }
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                        <Star className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-gray-900 font-medium">{t('dashboard.tokens')}</span>
                    </div>
                    <span className="text-gray-900 font-bold">{userTokens}</span>
                  </div>
                  <div id="tokens-buttons" className="justify-around pb-4 px-4" style={{ display: 'none' }}>
                    <button 
                      onClick={() => setShowTokenClaimModal(true)}
                      className="flex flex-col items-center space-y-1 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <Star className="w-4 h-4" />
                      </div>
                      <span className="text-xs">Claim</span>
                    </button>
                    <button 
                      onClick={() => {
                        setModalHistoryFilter("tokens");
                        setModalHistoryPage(1);
                        setShowHistoryModal(true);
                      }}
                      className="flex flex-col items-center space-y-1 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                      </div>
                      <span className="text-xs">History</span>
                    </button>
                  </div>
                </div>

                {/* Referrals */}
                <div className="border-b border-gray-200">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      const buttonsDiv = document.getElementById('referrals-buttons');
                      if (buttonsDiv) {
                        buttonsDiv.style.display = buttonsDiv.style.display === 'none' ? 'flex' : 'none';
                      }
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-gray-900 font-medium">{t("navigation.referrals")}</span>
                    </div>
                    <span className="text-gray-900 font-bold">{userReferrals.length}</span>
                  </div>
                  <div id="referrals-buttons" className="justify-around pb-4 px-4" style={{ display: 'none' }}>
                    <button 
                      onClick={() => setActiveTab("referrals")}
                      className="flex flex-col items-center space-y-1 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                      <span className="text-xs">View</span>
                    </button>
                    <button 
                      onClick={toggleAchievementRules}
                      className="flex flex-col items-center space-y-1 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <Trophy className="w-4 h-4" />
                      </div>
                      <span className="text-xs">Awards</span>
                    </button>
                  </div>
                </div>

                  {/* Referral Earnings - No buttons */}
                  <div>
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-gray-900 font-medium">{t('dashboard.referralEarnings')}</span>
                      </div>
                      <span className="text-gray-900 font-bold">RP {formatRupiah(referralEarnings)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Role-Based Dashboard Layout */}
            <div className="hidden md:block">
              {user?.role === 'admin' ? (
                // Admin Desktop Dashboard with Enhanced Features
                <div className="space-y-6">
                  {/* Admin Quick Actions */}
                  <div className="grid grid-cols-4 gap-4">
                    <Button
                      onClick={() => window.location.href = '/admin'}
                      className="h-24 bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex flex-col items-center justify-center"
                    >
                      <Settings className="w-8 h-8 mb-2" />
                      <span className="text-sm font-medium">Admin Panel</span>
                    </Button>
                    
                    <Button
                      onClick={() => setActiveTab("purchase")}
                      className="h-24 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex flex-col items-center justify-center"
                    >
                      <Eye className="w-8 h-8 mb-2" />
                      <span className="text-sm font-medium">Payment Review</span>
                    </Button>
                    
                    <Button
                      onClick={() => setActiveTab("petcare")}
                      className="h-24 bg-pink-600 hover:bg-pink-700 text-white rounded-xl flex flex-col items-center justify-center"
                    >
                      <Heart className="w-8 h-8 mb-2" />
                      <span className="text-sm font-medium">Pet Management</span>
                    </Button>
                    
                    <Button
                      onClick={() => setActiveTab("marketplace")}
                      className="h-24 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex flex-col items-center justify-center"
                    >
                      <TrendingUp className="w-8 h-8 mb-2" />
                      <span className="text-sm font-medium">Analytics</span>
                    </Button>
                  </div>

                  {/* Admin System Stats Grid */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                              <Users className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-gray-700">Total Users</span>
                          </div>
                          <span className="text-2xl font-bold text-gray-900">{dashboardStats?.totalUsers || 0}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center">
                              <Heart className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-gray-700">Active Pets</span>
                          </div>
                          <span className="text-2xl font-bold text-gray-900">{dashboardStats?.totalPets || 0}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                              <TrendingUp className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-gray-700">Revenue</span>
                          </div>
                          <span className="text-2xl font-bold text-gray-900">RP {dashboardStats?.totalRevenue ? Number(dashboardStats.totalRevenue).toLocaleString('id-ID') : '0'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Account</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                              <DollarSign className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-gray-700">{t('dashboard.credits')}</span>
                          </div>
                          <span className="text-2xl font-bold text-gray-900">RP {formatRupiah(parseFloat(userStats?.credits || '0'))}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                              <Gift className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-gray-700">{t('dashboard.loyaltyPoints')}</span>
                          </div>
                          <span className="text-2xl font-bold text-gray-900">{loyaltyPoints}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
                              <Star className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-gray-700">{t('dashboard.tokens')}</span>
                          </div>
                          <span className="text-2xl font-bold text-gray-900">{userTokens}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Regular User Desktop Dashboard
                <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                  {/* Credits */}
                <div className="border-b border-gray-200">
                  <div 
                    className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      const buttonsDiv = document.getElementById('desktop-credits-buttons');
                      if (buttonsDiv) {
                        buttonsDiv.style.display = buttonsDiv.style.display === 'none' ? 'flex' : 'none';
                      }
                    }}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-gray-900 font-medium text-lg">{t('dashboard.credits')}</span>
                    </div>
                    <span className="text-gray-900 font-bold text-xl">RP {formatRupiah(parseFloat(userStats?.credits || '0'))}</span>
                  </div>
                  <div id="desktop-credits-buttons" className="justify-around pb-6 px-6" style={{ display: 'none' }}>
                    <button 
                      onClick={() => setShowCreditTopUpModal(true)}
                      className="flex flex-col items-center space-y-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span className="text-sm">Top Up</span>
                    </button>
                    <button 
                      onClick={() => setShowCashOutModal(true)}
                      className="flex flex-col items-center space-y-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <ArrowLeft className="w-5 h-5" />
                      </div>
                      <span className="text-sm">Cash Out</span>
                    </button>
                    <button 
                      onClick={() => {
                        setModalHistoryFilter("credits");
                        setModalHistoryPage(1);
                        setShowHistoryModal(true);
                      }}
                      className="flex flex-col items-center space-y-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Clock className="w-5 h-5" />
                      </div>
                      <span className="text-sm">History</span>
                    </button>
                  </div>
                </div>

                {/* Loyalty Points */}
                <div className="border-b border-gray-200">
                  <div 
                    className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      const buttonsDiv = document.getElementById('desktop-loyalty-buttons');
                      if (buttonsDiv) {
                        buttonsDiv.style.display = buttonsDiv.style.display === 'none' ? 'flex' : 'none';
                      }
                    }}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                        <Gift className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-gray-900 font-medium text-lg">{t('dashboard.loyaltyPoints')}</span>
                    </div>
                    <span className="text-gray-900 font-bold text-xl">{loyaltyPoints}</span>
                  </div>
                  <div id="desktop-loyalty-buttons" className="justify-around pb-6 px-6" style={{ display: 'none' }}>
                    <button 
                      onClick={() => setActiveTab("loyalty")}
                      className="flex flex-col items-center space-y-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Gift className="w-5 h-5" />
                      </div>
                      <span className="text-sm">Rewards</span>
                    </button>
                    <button 
                      onClick={() => {
                        setModalHistoryFilter("points");
                        setModalHistoryPage(1);
                        setShowHistoryModal(true);
                      }}
                      className="flex flex-col items-center space-y-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Clock className="w-5 h-5" />
                      </div>
                      <span className="text-sm">History</span>
                    </button>
                  </div>
                </div>

                {/* Tokens */}
                <div className="border-b border-gray-200">
                  <div 
                    className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      const buttonsDiv = document.getElementById('desktop-tokens-buttons');
                      if (buttonsDiv) {
                        buttonsDiv.style.display = buttonsDiv.style.display === 'none' ? 'flex' : 'none';
                      }
                    }}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
                        <Star className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-gray-900 font-medium text-lg">{t('dashboard.tokens')}</span>
                    </div>
                    <span className="text-gray-900 font-bold text-xl">{userTokens}</span>
                  </div>
                  <div id="desktop-tokens-buttons" className="justify-around pb-6 px-6" style={{ display: 'none' }}>
                    <button 
                      onClick={() => setShowTokenClaimModal(true)}
                      className="flex flex-col items-center space-y-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Star className="w-5 h-5" />
                      </div>
                      <span className="text-sm">Claim</span>
                    </button>
                    <button 
                      onClick={() => {
                        setModalHistoryFilter("tokens");
                        setModalHistoryPage(1);
                        setShowHistoryModal(true);
                      }}
                      className="flex flex-col items-center space-y-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Clock className="w-5 h-5" />
                      </div>
                      <span className="text-sm">History</span>
                    </button>
                  </div>
                </div>

                {/* Referrals */}
                <div className="border-b border-gray-200">
                  <div 
                    className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      const buttonsDiv = document.getElementById('desktop-referrals-buttons');
                      if (buttonsDiv) {
                        buttonsDiv.style.display = buttonsDiv.style.display === 'none' ? 'flex' : 'none';
                      }
                    }}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-gray-900 font-medium text-lg">{t("navigation.referrals")}</span>
                    </div>
                    <span className="text-gray-900 font-bold text-xl">{userReferrals.length}</span>
                  </div>
                  <div id="desktop-referrals-buttons" className="justify-around pb-6 px-6" style={{ display: 'none' }}>
                    <button 
                      onClick={() => setActiveTab("referrals")}
                      className="flex flex-col items-center space-y-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <span className="text-sm">View</span>
                    </button>
                    <button 
                      onClick={toggleAchievementRules}
                      className="flex flex-col items-center space-y-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <span className="text-sm">Awards</span>
                    </button>
                  </div>
                </div>

                  {/* Referral Earnings - No buttons */}
                  <div>
                    <div className="flex items-center justify-between p-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-yellow-600 rounded-full flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-gray-900 font-medium text-lg">{t('dashboard.referralEarnings')}</span>
                      </div>
                      <span className="text-gray-900 font-bold text-xl">RP {formatRupiah(referralEarnings)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>



            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
              {/* Quick Booking */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader className="p-4 md:p-6">
                    <CardTitle className="text-lg md:text-xl">{t('dashboard.quickBooking')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 md:p-6">
                    <Select onValueChange={(value) => setNewAppointment({...newAppointment, category: value, service: ""})}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('dashboard.selectCategory')} />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(serviceCategories || {}).map(([key, category]) => (
                          <SelectItem key={key} value={key}>{category?.name || key}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {newAppointment.category && (
                      <Select onValueChange={(value) => setNewAppointment({...newAppointment, service: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("booking.selectService")} />
                        </SelectTrigger>
                        <SelectContent>
                          {(serviceCategories?.[newAppointment.category]?.options || []).map((option) => (
                            <SelectItem key={option?.value || ''} value={option?.value || ''}>
                              {option?.label || 'Service'}
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
                        <SelectValue placeholder={t('dashboard.selectTime')} />
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
                                {timeSlot} {isBooked ? t("booking.notAvailable") : ""}
                              </SelectItem>
                            );
                          })
                        )).flat()}
                      </SelectContent>
                    </Select>

                    <Button onClick={bookAppointment} className="w-full">
                      <Calendar className="w-4 h-4 mr-2" />
                      {t('dashboard.bookAppointment')}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Referral Section */}
              <div>
                <Card className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white">
                  <CardHeader className="p-4 md:p-6">
                    <CardTitle className="text-white text-lg md:text-xl">
                      {t("referral.yourCode")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6">
                    <div className="bg-white/20 rounded-lg p-3 md:p-4 mb-4 text-center">
                      <p className="text-xl md:text-3xl font-bold font-mono mb-2">{referralCode}</p>
                      <p className="text-emerald-100 text-sm">
                        {t("referral.shareToEarn")}
                      </p>
                    </div>
                    <Button 
                      onClick={copyReferralCode}
                      className="w-full bg-white/20 hover:bg-white/30 text-white mb-4"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      {t('referral.copyCode')}
                    </Button>
                    <div className="text-center">
                      <QrCode className="w-16 h-16 mx-auto text-white/80 mb-2" />
                      <p className="text-xs text-white/80">
                        {t("qr.scanCode")}
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
                {t('loyalty.title')}
              </h2>
              <p className="text-slate-600">
                {t('loyalty.description')}
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
                        <p className="text-green-600 font-semibold">{currentLoyaltyLevel.discount}% {t("loyalty.discountActive")}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-slate-900">{loyaltyPoints}</p>
                    <p className="text-slate-600">{t('loyalty.availablePoints')}</p>
                  </div>
                </div>

                {nextLoyaltyLevel && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700">
                        {t('loyalty.progressTo')} {nextLoyaltyLevel.name}
                      </span>
                      <span className="text-sm text-slate-600">
                        {loyaltyPointsToNext} {t('loyalty.pointsNeeded')}
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
                {t('loyalty.allLoyaltyLevels')}
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
                        } {t("common.points")}
                      </p>
                      {level.discount > 0 && (
                        <div className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full mb-2">
                          {level.discount}% {t("common.discount")}
                        </div>
                      )}
                      <div className="space-y-1">
                        {level.benefits.slice(0, 2).map((benefit, index) => (
                          <p key={index} className="text-xs text-gray-600">{benefit}</p>
                        ))}
                        {level.benefits.length > 2 && (
                          <p className="text-xs text-gray-500">+{level.benefits.length - 2} {t("common.more")}</p>
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
                    <CardTitle>{t('rewards.availableRewards')}</CardTitle>
                    <div className="text-sm text-gray-500">
                      {t('loyalty.adminOnlyPoints')}
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
                                    {t("stock.left")}: {reward.stockQuantity}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-blue-600">
                              {reward.pointsCost} {t("common.points")}
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
                                t('rewards.redeem') : 
                                t('rewards.needMorePoints')
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
                    <CardTitle>{t('history.pointHistory')}</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-3 mt-4">
                      <select
                        value={pointsFilter}
                        onChange={(e) => setPointsFilter(e.target.value as 'all' | 'earned' | 'redeemed')}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="all">{t("filters.all")}</option>
                        <option value="earned">{t("filters.earned")}</option>
                        <option value="redeemed">{t("filters.redeemed")}</option>
                      </select>
                      <input
                        type="date"
                        value={pointsDateFilter}
                        onChange={(e) => setPointsDateFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder={t("filters.filterByDate")}
                      />
                      {(pointsFilter !== 'all' || pointsDateFilter) && (
                        <button
                          onClick={() => {
                            setPointsFilter('all');
                            setPointsDateFilter('');
                          }}
                          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                        >
                          {t("filters.clearFilters")}
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
                            <p>{t('points.noHistoryYet')}</p>
                            <p className="text-sm mt-2">{t('points.earningsWillAppear')}</p>
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
                                    {history.type === 'earned' ? '+' : ''}{history.points} {t("common.points")}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Pagination Controls */}
                          {totalPages > 1 && (
                            <div className="flex justify-between items-center pt-4 border-t mt-6">
                              <div className="text-sm text-gray-600">
                                {t("pagination.showing")} {startIndex + 1}-{Math.min(endIndex, points.length)} {t("pagination.of")} {points.length} {t("pagination.items")}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPointsHistoryPage(Math.max(1, pointsHistoryPage - 1))}
                                  disabled={pointsHistoryPage === 1}
                                >
                                  {t("pagination.previous")}
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
                                  {t("common.next")}
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
                    <CardTitle>{t('loyalty.yourLevelBenefits')}</CardTitle>
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
                    <CardTitle>{t('redemption.history')}</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-3 mt-4">
                      <select
                        value={redemptionFilter}
                        onChange={(e) => setRedemptionFilter(e.target.value as 'all' | 'completed' | 'used')}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="all">{t("filters.all")}</option>
                        <option value="completed">{t("status.completed")}</option>
                        <option value="used">{t("status.used")}</option>
                      </select>
                      <input
                        type="date"
                        value={redemptionDateFilter}
                        onChange={(e) => setRedemptionDateFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder={t("filters.filterByDate")}
                      />
                      {(redemptionFilter !== 'all' || redemptionDateFilter) && (
                        <button
                          onClick={() => {
                            setRedemptionFilter('all');
                            setRedemptionDateFilter('');
                          }}
                          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                        >
                          {t("filters.clearFilters")}
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
                            <p>{t('redemption.noHistoryYet')}</p>
                            <p className="text-sm mt-2">{t('redemption.rewardsWillAppear')}</p>
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
                                {t("pagination.showing")} {startIndex + 1}-{Math.min(endIndex, redemptions.length)} {t("pagination.of")} {redemptions.length} {t("pagination.items")}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setRedemptionHistoryPage(Math.max(1, redemptionHistoryPage - 1))}
                                  disabled={redemptionHistoryPage === 1}
                                >
                                  {t("pagination.previous")}
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
                                  {t("common.next")}
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
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAchievementRules(false)}
          >
            <div 
              className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800">
                  {t("achievements.rulesAndPoints")}
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
                    {t("referral.points")}
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">
                        t('referral.eachSuccessful')
                      </span>
                      <span className="font-bold text-blue-600">+50 {t("common.points")}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">
                        t('referral.bonusEvery5')
                      </span>
                      <span className="font-bold text-purple-600">+150 {t("common.points")}</span>
                    </div>
                  </div>
                </div>

                {/* Referral Milestones */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                  <h4 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
                    <Target className="w-5 h-5 mr-2" />
                    {t("referral.milestones")}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {allAchievements.filter(a => a.type === 'referral').map((achievement, index) => (
                      <div key={index} className="flex justify-between items-center bg-white rounded p-3 shadow-sm">
                        <span className="text-gray-700 font-medium">{achievement.count} {t('common.referrals')}</span>
                        <span className="font-bold text-green-600">
                          {achievement.count === 1 ? '50' : 
                           achievement.count === 5 ? '400' :
                           achievement.count === 10 ? '650' :
                           achievement.count === 15 ? '900' :
                           achievement.count === 20 ? '1150' :
                           achievement.count === 25 ? '1400' :
                           '2650'} {t("common.points")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Spending Achievement */}
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
                  <h4 className="text-lg font-semibold text-orange-800 mb-3 flex items-center">
                    <Star className="w-5 h-5 mr-2" />
                    {t("achievements.spending")}
                  </h4>
                  <div className="bg-white rounded p-3 shadow-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-800">
                          {t("shopping.mentor")}
                        </p>
                        <p className="text-sm text-gray-600">
                          {t('loyaltyProgram.diamondRequirement')}
                        </p>
                      </div>
                      <span className="font-bold text-orange-600">+100 {t("common.points")}</span>
                    </div>
                  </div>
                </div>

                {/* Current Progress */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                  <h4 className="text-lg font-semibold text-purple-800 mb-3 flex items-center">
                    <Trophy className="w-5 h-5 mr-2" />
                    {t("progress.current")}
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">
                        {t("referral.totalReferrals")}
                      </span>
                      <span className="font-bold text-purple-600">{userReferrals.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">
                        {t('loyalty.totalPoints')}:
                      </span>
                      <span className="font-bold text-purple-600">{loyaltyPoints}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">
                        {t("referral.nextMilestone")}
                      </span>
                      <span className="font-bold text-gray-800">
                        {allAchievements.filter(a => a.type === 'referral').find(m => m.count > userReferrals.length)?.count || 
                         (t("achievement.allCompleted"))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* How Points Work */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">
                    {t("points.howTheyWork")}
                  </h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>• {t('referral.autoPoints')}</p>
                    <p>• {t('referral.milestoneBonus')}</p>
                    <p>• {t("points.exchangeInfo")}</p>
                    <p>• {t("points.noTimeLimit")}</p>
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
                  {t('booking.title')}
                </h2>
                <p className="text-slate-600">
                  {t('booking.viewAppointments')}
                </p>
              </div>
            </div>

            {/* Service Categories */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-pink-50 border-pink-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-3">💄</div>
                  <h3 className="text-lg font-semibold text-pink-800 mb-2">
                    {serviceCategories?.beauty?.name || 'Beauty Services'}
                  </h3>
                  <p className="text-sm text-pink-600 mb-4">Hair Spa, Facials, Nails</p>
                  <Badge className="bg-pink-100 text-pink-800">
                    {t("common.startingFrom")} RP {serviceCategories?.beauty?.startingPrice || 0}
                  </Badge>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-3">🎮</div>
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">
                    {serviceCategories?.entertainment?.name || 'Entertainment'}
                  </h3>
                  <p className="text-sm text-blue-600 mb-4">Claw Machine, KTV Rooms</p>
                  <Badge className="bg-blue-100 text-blue-800">
                    {t("common.startingFrom")} RP {serviceCategories?.entertainment?.startingPrice || 0}
                  </Badge>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-3">🍽️</div>
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    {serviceCategories?.restaurant?.name || 'Restaurant'}
                  </h3>
                  <p className="text-sm text-green-600 mb-4">Breakfast, Lunch, Dinner</p>
                  <Badge className="bg-green-100 text-green-800">
                    {t("common.startingFrom")} RP {serviceCategories?.restaurant?.startingPrice || 0}
                  </Badge>
                </CardContent>
              </Card>
            </div>

            {/* New Booking Form */}
            <Card>
              <CardHeader>
                <CardTitle>{t('booking.createNewBooking')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select onValueChange={(value) => setNewAppointment({...newAppointment, category: value, service: ""})}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('booking.selectCategory')} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(serviceCategories || {}).map(([key, category]) => (
                        <SelectItem key={key} value={key}>{category?.name || key}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {newAppointment.category && (
                    <Select onValueChange={(value) => setNewAppointment({...newAppointment, service: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("booking.selectService")} />
                      </SelectTrigger>
                      <SelectContent>
                        {(serviceCategories?.[newAppointment.category]?.options || []).map((option) => (
                          <SelectItem key={option?.value || ''} value={option?.value || ''}>
                            {option?.label || 'Service'}
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
                      <SelectValue placeholder={t('booking.selectTime')} />
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
                  {t('booking.bookAppointment')}
                </Button>
              </CardContent>
            </Card>

            {/* Current Appointments */}
            <Card>
              <CardHeader>
                <CardTitle>{t('booking.yourAppointments')}</CardTitle>
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <select
                    value={appointmentsFilter}
                    onChange={(e) => setAppointmentsFilter(e.target.value as 'all' | 'pending' | 'scheduled' | 'completed' | 'cancelled')}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">{t('filter.all')}</option>
                    <option value="pending">{t('filter.pending')}</option>
                    <option value="scheduled">{t('filter.scheduled')}</option>
                    <option value="completed">{t('filter.completed')}</option>
                    <option value="cancelled">{t('filter.cancelled')}</option>
                  </select>
                  <input
                    type="date"
                    value={appointmentsDateFilter}
                    onChange={(e) => setAppointmentsDateFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder={t('filter.filterByDate')}
                  />
                  {(appointmentsFilter !== 'all' || appointmentsDateFilter) && (
                    <button
                      onClick={() => {
                        setAppointmentsFilter('all');
                        setAppointmentsDateFilter('');
                      }}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                      {t('filter.clearFilters')}
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
                        <p>{t('appointments.noAppointments')}</p>
                        <p className="text-sm mt-2">{t('appointments.bookingsWillAppear')}</p>
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
                                    {t("common.save")}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingAppointment(null)}>
                                    {t('common.cancel')}
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                  {apt.status !== 'cancelled' && (
                                    <Button size="sm" variant="outline" onClick={() => setEditingAppointment(apt?.id)}>
                                      <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
                                      <span className="hidden sm:inline ml-1">{t("appointment.reschedule")}</span>
                                    </Button>
                                  )}
                                  {apt.status !== 'cancelled' && (
                                    <Button size="sm" variant="destructive" onClick={() => deleteAppointment(apt.id)}>
                                      <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                      <span className="hidden sm:inline ml-1">{t('common.cancel')}</span>
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
                          {t("pagination.showing")} {startIndex + 1}-{Math.min(endIndex, appointments.length)} {t("pagination.of")} {appointments.length} {t("pagination.items")} ({t("pagination.perPage")})
                        </div>
                        {totalPages > 1 && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAppointmentsPage(Math.max(1, appointmentsPage - 1))}
                              disabled={appointmentsPage === 1}
                            >
                              {t("pagination.previous")}
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
                              {t("common.next")}
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
                {t('toys.marketplace')}
              </h2>
              <p className="text-slate-600">
                Buy random toys from seasons or purchase specific toys from other users
              </p>
            </div>

            {/* Marketplace Navigation */}
            <div className="flex justify-center space-x-4 mb-8">
              <Button
                variant={marketplaceView === 'seasons' ? 'default' : 'outline'}
                onClick={() => setMarketplaceView('seasons')}
                className="px-6 py-2"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Season Packs
              </Button>
              <Button
                variant={marketplaceView === 'listings' ? 'default' : 'outline'}
                onClick={() => setMarketplaceView('listings')}
                className="px-6 py-2"
              >
                <Users className="w-4 h-4 mr-2" />
                User Listings
              </Button>
            </div>

            {/* Season-based Purchase Cards */}
            {marketplaceView === 'seasons' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {seasons?.filter(season => season.showInMarketplace === true).map((season) => (
                    <Card key={season.id} className="hover:shadow-lg transition-shadow border-2 hover:border-blue-300">
                      <CardContent className="p-8 text-center">
                        <div className="mb-6">
                          {/* Season Logo/Icon - 940x940 square */}
                          <div className="w-full aspect-square mx-auto rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                            {season.iconUrl ? (
                              <img 
                                src={season.iconUrl} 
                                alt={season?.name || 'Season'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <span className="text-6xl font-bold text-white">
                                  {season?.name?.charAt(0) || 'S'}
                                </span>
                              </div>
                            )}
                          </div>
                          <h3 className="text-2xl font-bold text-slate-900 mb-2">
                            {season?.displayName || season?.name || 'Season'}
                          </h3>
                          
                          {/* Season Description */}
                          {season?.description && (
                            <p className="text-slate-600 mb-4">
                              {season?.description || ''}
                            </p>
                          )}
                        </div>
                        
                        <div className="space-y-4">
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-lg font-bold text-yellow-800">Random Toy</p>
                            <p className="text-sm text-yellow-600">Get a surprise toy from this season</p>
                            <div className="mt-3 text-center">
                              <span className="text-2xl font-bold text-green-700">
                                RP {season.price ? Number(season.price).toLocaleString('id-ID') : '1,000,000'}
                              </span>
                            </div>
                          </div>
                          
                          <Button 
                            onClick={() => purchaseRandomToy(season?.name || 'Unknown')}
                            className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white py-3"
                            disabled={purchaseRandomToyMutation.isPending}
                          >
                            {purchaseRandomToyMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Purchasing...
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                Purchase Random Toy
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Instructions for season purchases */}
                <div className="text-center">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">Season Packs:</h3>
                    <p className="text-blue-700">
                      Select a season above to purchase a random collectible toy from that season's collection. 
                      Each purchase gives you a surprise toy with unique rarity and characteristics!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* User Listings */}
            {marketplaceView === 'listings' && (
              <div className="space-y-6">
                {/* Create Listing Button */}
                <div className="flex justify-center">
                  <Button
                    onClick={() => setShowCreateListingModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Sell Your Toy
                  </Button>
                </div>

                {/* Listings Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(() => {
                    // Filter to show only actual user-to-user listings
                    const userListings = listings?.filter(listing => 
                      listing.ownerId && listing.ownerId !== 'system' && listing.sellerName
                    ) || [];
                    
                    return userListings.length > 0 ? userListings.map((listing) => {
                      const pendingPurchase = pendingPurchases?.find(p => p.toyId === listing.id);
                    
                    return (
                      <Card key={listing.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          <div className="relative mb-4">
                            <img 
                              src={listing.imageUrl || '/api/placeholder/200/200'} 
                              alt={listing?.name || 'Item'}
                              className="w-full h-48 object-contain rounded-lg"
                            />
                            <Badge 
                              variant="secondary" 
                              className={`absolute top-2 right-2 ${
                                listing.rarity === 'secret' ? 'bg-purple-600 text-white' :
                                listing.rarity === 'epic' ? 'bg-orange-600 text-white' :
                                listing.rarity === 'rare' ? 'bg-blue-600 text-white' :
                                'bg-gray-600 text-white'
                              }`}
                            >
                              {listing.rarity}
                            </Badge>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <h3 className="font-bold text-lg text-slate-900">{listing?.name || 'Item'}</h3>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    listing.gender === 'male' ? 'border-blue-300 text-blue-600' : 'border-pink-300 text-pink-600'
                                  }`}
                                >
                                  {listing.gender === 'male' ? '♂ Male' : '♀ Female'}
                                </Badge>
                                <div 
                                  className="w-4 h-4 rounded-full border-2 border-gray-300"
                                  style={{ backgroundColor: listing.color }}
                                  title={`Color: ${listing.color}`}
                                />
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="text-2xl font-bold text-green-600">
                                Rp {(() => {
                                  const price = listing.listingPrice || listing.price || listing.basePrice || '0';
                                  return parseInt(price.toString()).toLocaleString('id-ID');
                                })()}
                              </span>
                              <span className="text-sm text-slate-500">
                                by {listing.sellerName || 'Unknown'}
                              </span>
                            </div>
                            
                            {listing.ownerId === user?.id ? (
                              <div className="space-y-2">
                                <Badge variant="outline" className="w-full text-green-600 border-green-600">
                                  {t("sale.yourListing")}
                                </Badge>
                                <Button 
                                  onClick={() => cancelListing(listing.listingId || listing.id)}
                                  variant="outline"
                                  className="w-full border-red-600 text-red-600 hover:bg-red-50 text-xs px-3"
                                  size="sm"
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  {t("sale.cancel")}
                                </Button>
                              </div>
                            ) : pendingPurchase && pendingPurchase.buyerId === user?.id ? (
                              <div className="space-y-2">
                                {pendingPurchase.status === 'pending_seller_confirmation' ? (
                                  <>
                                    <Badge variant="outline" className="w-full text-yellow-600 border-yellow-600">
                                      {t("purchase.pendingSeller")}
                                    </Badge>
                                    <Button 
                                      onClick={() => cancelPurchase(pendingPurchase.id)}
                                      variant="outline"
                                      className="w-full border-red-600 text-red-600 hover:bg-red-50"
                                    >
                                      <X className="w-4 h-4 mr-2" />
                                      {t("purchase.cancel")}
                                    </Button>
                                  </>
                                ) : (
                                  <Badge variant="outline" className="w-full text-blue-600 border-blue-600">
                                    {t("purchase.awaitingDelivery")}
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
                                  (t("common.buy")) : 
                                  (t("credits.insufficient"))
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
                        {t('marketplace.noToysForSale')}
                      </h3>
                      <p className="text-sm">
                        {t('marketplace.beFirstToSell')}
                      </p>
                    </div>
                  );
                })()}
                </div>

                {/* Instructions for user listings */}
                <div className="text-center">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-green-900 mb-2">User Marketplace:</h3>
                    <p className="text-green-700">
                      Buy specific toys from other users or sell your own toys to earn credits. 
                      Set your own prices and trade directly with the community!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create Listing Modal */}
        {showCreateListingModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowCreateListingModal(false)}
          >
            <div 
              className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">
                Sell Your Toy
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Toy to Sell
                  </label>
                  <select
                    value={selectedToyForSale?.id || ""}
                    onChange={(e) => {
                      const toyId = parseInt(e.target.value);
                      const toy = userToys.find((t: any) => t.id === toyId);
                      setSelectedToyForSale(toy);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Choose a toy...</option>
                    {userToys
                      .filter((toy: any) => !toy.isActivated && !toy.isForSale)
                      .map((toy: any) => (
                        <option key={toy.id} value={toy.id}>
                          {toy?.name || 'Toy'} ({toy?.rarity || 'Unknown'})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Sale Price ($)
                  </label>
                  <input
                    type="number"
                    placeholder="Enter price"
                    value={newListingPrice}
                    onChange={(e) => setNewListingPrice(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div className="flex space-x-2">
                  <Button 
                    onClick={createMarketplaceListing} 
                    className="flex-1" 
                    disabled={!selectedToyForSale || !newListingPrice || createListingMutation.isPending}
                  >
                    {createListingMutation.isPending ? "Creating..." : "Create Listing"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowCreateListingModal(false);
                      setSelectedToyForSale(null);
                      setNewListingPrice("");
                    }} 
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comprehensive History Tab */}
        {activeTab === "token-history" && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                {t("history.complete")}
              </h2>
              <p className="text-slate-600">
                {t("history.manage")}
              </p>
            </div>

            {/* History Type Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { key: 'points', label: t("common.points"), icon: "🎯" },
                { key: 'credits', label: t("common.credits"), icon: "💰" },
                { key: 'tokens', label: t("common.tokens"), icon: "🪙" },
                { key: 'appointments', label: t("common.bookings"), icon: "📅" },
                { key: 'redemptions', label: t("common.redemptions"), icon: "🎁" }
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
                  {t("history.filtersSearch")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t("date.startDate")}
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
                      {t("date.endDate")}
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
                      {t("common.status")}
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="all">{t("filters.all")}</option>
                      <option value="pending">{t("status.pending")}</option>
                      <option value="completed">{t("status.completed")}</option>
                      <option value="approved">{t("status.approved")}</option>
                      <option value="rejected">{t("status.rejected")}</option>
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
                    {t("filter.reset")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* History Content */}
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>
                    {historyFilter === 'points' && (t("history.points"))}
                    {historyFilter === 'credits' && (t("history.credits"))}
                    {historyFilter === 'tokens' && (t("history.tokens"))}
                    {historyFilter === 'appointments' && (t("history.appointments"))}
                    {historyFilter === 'redemptions' && (t("history.redemptions"))}
                  </span>
                  <div className="text-sm text-gray-500">
                    {t("common.page")} {historyPage}
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
                          {t("common.noDataFound")}
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
                                      `${item.tokensRequested} ${t("common.tokens")}` :
                                      item.description || item.serviceName || `${item.points || item.amount || 0}`
                                    }
                                  </span>
                                </div>
                                
                                <p className="text-sm text-gray-600 mb-1">
                                  {new Date(item.createdAt || item.requestedAt || item.appointmentDate).toLocaleDateString(t("date.format"))} at {new Date(item.createdAt || item.requestedAt || item.appointmentDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                
                                {item.adminNotes && (
                                  <p className="text-sm text-blue-600 bg-blue-50 rounded px-2 py-1 mt-2">
                                    {t("common.notes")}{item.adminNotes}
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
                                  {item.status === 'completed' ? (t("status.completed")) :
                                   item.status === 'approved' ? (t("status.approved")) :
                                   item.status === 'cancelled' ? (t("status.cancelled")) :
                                   item.status === 'rejected' ? (t("status.rejected")) :
                                   item.status === 'pending' ? (t("status.pending")) :
                                   (item.status || (t("status.unknown")))}
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
                            {t("pagination.showing")} {startIndex + 1}-{Math.min(endIndex, data.length)} {t("pagination.of")} {data.length} {t("pagination.items")}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setHistoryPage(Math.max(1, historyPage - 1))}
                              disabled={historyPage === 1}
                            >
                              {t("pagination.previous")}
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
                              {t("common.next")}
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
                {t('toys.myCollection')}
              </h2>
              <p className="text-slate-600">
                {t('toys.viewCollection')}
              </p>
            </div>

            {/* Toy Collection Tabs */}
            <Tabs defaultValue="my-toys" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="my-toys">My Toys</TabsTrigger>
                <TabsTrigger value="seasonal-collections">Seasonal Collections</TabsTrigger>
              </TabsList>
              
              <TabsContent value="my-toys" className="space-y-8">


            {/* QR Code Scanner Section */}
            <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-purple-900">
                  {t("toy.activate")}
                </h3>
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder={t("toy.qrPlaceholder")}
                      value={newToyCode}
                      onChange={(e) => setNewToyCode(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={startCamera} 
                      variant="outline" 
                      className="border-purple-300 text-purple-700 hover:bg-purple-50"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {t('camera.button')}
                    </Button>
                    <Button onClick={addToyByCode} className="bg-purple-600 hover:bg-purple-700">
                      <QrCode className="w-4 h-4 mr-2" />
                      {t('activation.activateButton')}
                    </Button>
                  </div>
                  <div className="bg-purple-100 p-4 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-2">
                      {t("activation.howToActivateToys")}
                    </h4>
                    <ol className="text-sm text-purple-700 space-y-1">
                      <li>1. {t("activation.step1")}</li>
                      <li>2. {t("activation.step2")}</li>
                      <li>3. {t("activation.step3")}</li>
                      <li>4. {t("activation.step4")}</li>
                    </ol>
                    <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-700">
                      <span className="font-semibold">
                        {t("activation.securitySystem")}
                      </span>
                      {" " + t("activation.encryptionProtection")}
                    </div>
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
                          src={purchase.toy?.imageUrl ? `${purchase.toy.imageUrl}?v=${Date.now()}` : '/images/default-toy.png'} 
                          alt={purchase.toy?.name || "Toy"} 
                          className="w-24 h-24 mx-auto object-contain"
                          key={`pending-seller-toy-${purchase.toy?.id}-${Date.now()}`}
                          onError={(e) => {
                            e.currentTarget.src = '/images/default-toy.png';
                          }}
                        />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">{purchase.toy?.name}</h3>
                      <div className="flex justify-center gap-2 mb-2">
                        <Badge className={getRarityColor(purchase.toy?.rarity)} variant="secondary">
                          {purchase.toy?.rarity}
                        </Badge>
                        {purchase.toy?.gender && (
                          <Badge variant="outline" className={
                            purchase.toy.gender === 'male' 
                              ? "border-blue-300 text-blue-700 bg-blue-50" 
                              : "border-pink-300 text-pink-700 bg-pink-50"
                          }>
                            {purchase.toy.gender === 'male' ? '♂ Male' : '♀ Female'}
                          </Badge>
                        )}
                      </div>
                      <Badge className="mt-2 w-full bg-orange-100 text-orange-800 border-orange-300">
                        {t("purchase.waitingSeller")}
                      </Badge>
                      <div className="mt-4 space-y-2">
                        <p className="text-sm text-slate-600">
                          {t("purchase.purchased")}: {new Date(purchase.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-lg font-bold text-green-600">
                          RP {parseFloat(purchase.amount || '0').toLocaleString('id-ID')}
                        </p>
                        <div className="w-full bg-gray-100 text-gray-600 p-3 rounded text-sm">
                          {t("purchase.waitingShipment")}
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
                          src={purchase.toy?.imageUrl ? `${purchase.toy.imageUrl}?v=${Date.now()}` : '/images/default-toy.png'} 
                          alt={purchase.toy?.name || "Toy"} 
                          className="w-24 h-24 mx-auto object-contain"
                          key={`pending-buyer-toy-${purchase.toy?.id}-${Date.now()}`}
                          onError={(e) => {
                            e.currentTarget.src = '/images/default-toy.png';
                          }}
                        />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">{purchase.toy?.name}</h3>
                      <div className="flex justify-center gap-2 mb-2">
                        <Badge className={getRarityColor(purchase.toy?.rarity)} variant="secondary">
                          {purchase.toy?.rarity}
                        </Badge>
                        {purchase.toy?.gender && (
                          <Badge variant="outline" className={
                            purchase.toy.gender === 'male' 
                              ? "border-blue-300 text-blue-700 bg-blue-50" 
                              : "border-pink-300 text-pink-700 bg-pink-50"
                          }>
                            {purchase.toy.gender === 'male' ? '♂ Male' : '♀ Female'}
                          </Badge>
                        )}
                      </div>
                      <Badge className="mt-2 w-full bg-yellow-100 text-yellow-800 border-yellow-300">
                        {t("purchase.awaitingDelivery")}
                      </Badge>
                      <div className="mt-4 space-y-2">
                        <p className="text-sm text-slate-600">
                          {t("purchase.purchased")}: {new Date(purchase.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-lg font-bold text-green-600">
                          RP {parseFloat(purchase.amount || '0').toLocaleString('id-ID')}
                        </p>
                        <Button 
                          onClick={() => {
                            // Mark as received by buyer - this completes the transaction
                            confirmPurchaseMutation.mutate(purchase.id);
                            toast({
                              title: t("transaction.complete"),
                              description: t('collection.toyAdded'),
                            });
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          {t("purchase.confirmReceived")}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Show toy count outside grid */}
            </div>
            
            {Array.isArray(toyInventory) && toyInventory.length > 0 && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium">
                  Found {toyInventory.length} toy(s) in your collection
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  listing?.id === toy?.id && 
                  listing?.sellerId === user?.id &&
                  listing?.isListing
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
                                ? (t("purchase.waitingBuyer"))
                                : (t("purchase.waitingSellerConfirm"))
                              }
                            </div>
                            <p className="text-xs text-yellow-700 mt-1">
                              {t("transaction.inProgress")}
                            </p>
                          </div>
                        )}
                        
                        {/* Marketplace Listing Status Banner */}
                        {activeListing && (
                          <div className="mb-4 p-2 bg-green-100 border border-green-300 rounded-lg">
                            <div className="flex items-center justify-center text-green-800 text-sm font-medium">
                              <ShoppingBag className="w-4 h-4 mr-2" />
                              {t("marketplace.listed")}
                            </div>
                            <p className="text-xs text-green-700 mt-1">
                              Price: Rp {parseInt(activeListing.price).toLocaleString('id-ID')}
                            </p>
                          </div>
                        )}
                        
                        <div className="mb-4">
                          <img 
                            src={toy?.imageUrl ? `${toy.imageUrl}?v=${Date.now()}` : '/images/default-toy.png'} 
                            alt={toy?.name || 'Toy'} 
                            className="w-32 h-32 mx-auto object-contain"
                            key={`toy-collection-${toy?.id}-${Date.now()}`}
                            onError={(e) => {
                              e.currentTarget.src = '/images/default-toy.png';
                            }}
                          />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">{toy?.name || 'Toy'}</h3>
                        <div className="flex justify-center gap-2 mb-2 flex-wrap">
                          <Badge className={getRarityColor(toy?.rarity)} variant="secondary">
                            {toy?.rarity || 'Unknown'}
                          </Badge>
                          {toy.gender && (
                            <Badge variant="outline" className={
                              toy.gender === 'male' 
                                ? "border-blue-300 text-blue-700 bg-blue-50" 
                                : "border-pink-300 text-pink-700 bg-pink-50"
                            }>
                              {toy.gender === 'male' ? '♂ Male' : '♀ Female'}
                            </Badge>
                          )}
                          {toy.isActivated ? (
                            <Badge className="w-full bg-purple-600 text-white">
                              <Heart className="w-3 h-3 mr-1" />
                              Active Pet
                            </Badge>
                          ) : activeListing ? (
                            <Badge className="w-full bg-orange-600 text-white">
                              <ShoppingBag className="w-3 h-3 mr-1" />
                              Listed in Marketplace
                            </Badge>
                          ) : (
                            <Button 
                              onClick={() => activateToyAsPet(toy)}
                              className="w-full bg-green-600 hover:bg-green-700 text-white"
                              size="sm"
                              disabled={false}
                            >
                              <Heart className="w-4 h-4 mr-2" />
                              Activate as Pet
                            </Button>
                          )}
                        </div>
                        <div className="mt-4 space-y-2">
                          <p className="text-sm text-slate-600">
                            {t("toy.acquired")}: {toy.createdAt ? new Date(toy.createdAt).toLocaleString() : toy.acquiredDate}
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
                    {t("pagination.previous")}
                  </Button>
                  
                  <span className="text-sm text-gray-600">
                    {t("common.page")} {toyInventoryPage} {t("pagination.of")} {Math.ceil(toyInventory.length / 10)}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setToyInventoryPage(prev => Math.min(Math.ceil(toyInventory.length / 10), prev + 1))}
                    disabled={toyInventoryPage >= Math.ceil(toyInventory.length / 10)}
                  >
                    {t("common.next")}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
              </TabsContent>

              <TabsContent value="seasonal-collections" className="space-y-6">
                <SeasonalCollectionsTab activateToyAsPet={activateToyAsPet} />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Purchase Verification Tab */}
        {activeTab === "purchase" && (
          <PurchaseVerificationSection language={language} user={user} userTokens={userTokens} />
        )}

        {/* Referrals Tab */}
        {activeTab === "referrals" && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                {t("referral.program")}
              </h2>
              <p className="text-slate-600">
                {t("referral.inviteEarn")}
              </p>
            </div>

            {/* Referral Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <p className="text-2xl font-bold text-green-800">{genealogyData?.totalDirectReferrals || 0}</p>
                  <p className="text-sm text-green-600">
                    {t("referral.direct")}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-6 text-center">
                  <DollarSign className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                  <p className="text-2xl font-bold text-blue-800">RP {formatRupiah(referralEarnings)}</p>
                  <p className="text-sm text-blue-600">
                    {t("referral.totalEarnings")}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-6 text-center">
                  <Trophy className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                  <p className="text-2xl font-bold text-purple-800">Level 1</p>
                  <p className="text-sm text-purple-600">
                    {t("referral.level")}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-6 text-center">
                  <Gift className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
                  <p className="text-2xl font-bold text-yellow-800">10%</p>
                  <p className="text-sm text-yellow-600">
                    {t("commission.rate")}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {/* Your Referral Code */}
              <Card className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                <CardHeader>
                  <CardTitle className="text-white">
                    {t("referral.shareCode")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-white/20 rounded-lg p-4 mb-4 text-center">
                    <p className="text-4xl font-bold font-mono mb-2">{referralCode}</p>
                    <p className="text-blue-100">
                      {t("referral.shareToEarn")}
                    </p>
                  </div>
                  <Button 
                    onClick={copyReferralCode}
                    className="w-full bg-white/20 hover:bg-white/30 text-white mb-4"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {t("common.copyCode")}
                  </Button>
                  <div className="bg-white/20 rounded-lg p-4 text-center">
                    <QrCode className="w-24 h-24 mx-auto text-white/80 mb-2" />
                    <p className="text-sm text-white/80">
                      {t('qr.scanForReferral')}
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
                    {t("commission.structure")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                      <span className="font-medium">
                        {t("referral.direct")}
                      </span>
                    </div>
                    <span className="font-bold text-green-600 text-xl">10%</span>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-2">
                      <p className="text-lg font-semibold text-slate-700">
                        {t("referral.totalReferrals")}
                        <span className="text-green-600">{userStats?.referrals?.length || 0}</span>
                      </p>
                      <p className="text-sm text-slate-600">
                        {t("referral.totalEarningsLabel")}
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
          <PetCareSection 
            language={language} 
            user={user} 
            queryClient={queryClient} 
            userTokens={userTokens}
            activateToyAsPetMutation={activateToyAsPetMutation}
            showPetActivationDialog={showPetActivationDialog}
            isMuted={isMuted}
          />
        )}

        {/* KOS (Kings Of Singers) Tab */}
        {activeTab === "kos" && (
          <KOSSection user={user} queryClient={queryClient} />
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                {t("profile.title")}
              </h2>
              <p className="text-slate-600">
                {t('profile.manageSettings')}
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
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            // Validate file size (5MB max)
                            if (file.size > 5 * 1024 * 1024) {
                              toast({
                                title: "File too large",
                                description: "Please select an image smaller than 5MB",
                                variant: "destructive",
                              });
                              return;
                            }

                            // Show preview immediately
                            const reader = new FileReader();
                            reader.onload = (e) => setProfileImage(e.target?.result);
                            reader.readAsDataURL(file);

                            // Upload to server
                            const formData = new FormData();
                            formData.append('profilePhoto', file);

                            const response = await fetch('/api/auth/user/profile-photo', {
                              method: 'POST',
                              body: formData,
                            });

                            if (response.ok) {
                              const data = await response.json();
                              // Update user data with new profile image URL
                              queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
                              toast({
                                title: "Profile photo updated",
                                description: "Your profile photo has been uploaded successfully",
                              });
                            } else {
                              const error = await response.json();
                              toast({
                                title: "Upload failed",
                                description: error.message || "Failed to upload profile photo",
                                variant: "destructive",
                              });
                            }
                          } catch (error) {
                            console.error('Profile photo upload error:', error);
                            toast({
                              title: "Upload failed",
                              description: "An error occurred while uploading the photo",
                              variant: "destructive",
                            });
                          }
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
                    {currentLevelInfo?.name || 'Level'}
                  </Badge>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>{t("profile.memberSince")}</span>
                      <span className="font-medium">May 2025</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('loyalty.totalPoints')}:</span>
                      <span className="font-medium">{lifetimePoints}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('loyalty.currentLevel')}:</span>
                      <span className="font-medium">Level {currentLevelInfo.level}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Settings */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>{t("account.settings")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-4">
                      {t("personal.information")}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {t("form.firstName")}
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
                          {t("form.lastName")}
                        </label>
                        <Input 
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          readOnly={!editingProfile}
                          className={editingProfile ? "" : "bg-gray-50"}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
                        <Input 
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          readOnly={!editingProfile}
                          className={editingProfile ? "" : "bg-gray-50"}
                          placeholder="Enter your username"
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
                          {t("form.phoneNumber")}
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
                          {t("form.gender")}
                        </label>
                        <select 
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          disabled={!editingProfile}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md ${editingProfile ? "" : "bg-gray-50"}`}
                        >
                          <option value="">{t('profile.selectGender')}</option>
                          <option value="male">{t('profile.male')}</option>
                          <option value="female">{t('profile.female')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {t("form.dateOfBirth")}
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
                      {t('preferences.title')}
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {t('preferences.emailNotifications')}
                          </p>
                          <p className="text-sm text-slate-600">
                            {t('preferences.emailDescription')}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setShowEmailModal(true)}>
                          {t('common.manage')}
                        </Button>
                      </div>

                    </div>
                  </div>

                  {/* Account Actions */}
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-4">
                      {t('account.actions')}
                    </h4>
                    <div className="space-y-3">
                      {editingProfile ? (
                        <div className="flex space-x-3">
                          <Button onClick={saveProfile} className="flex-1 bg-blue-600 hover:bg-blue-700">
                            {t('common.saveChanges')}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setEditingProfile(false)}
                            className="flex-1"
                          >
                            {t('common.cancel')}
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          onClick={() => setEditingProfile(true)}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          {t('account.editProfile')}
                        </Button>
                      )}
                      <Button variant="outline" className="w-full" onClick={() => setShowPasswordModal(true)}>
                        {t('account.changePassword')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Account Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>{t('account.statistics')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">RP {formatRupiah(userCredits)}</p>
                    <p className="text-sm text-slate-600">
                      {t('account.currentCredits')}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{loyaltyPoints}</p>
                    <p className="text-sm text-slate-600">
                      {t('account.loyaltyPoints')}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{userAppointments.length}</p>
                    <p className="text-sm text-slate-600">
                      {t('account.totalBookings')}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">RP {formatRupiah(referralEarnings)}</p>
                    <p className="text-sm text-slate-600">
                      {t('account.referralEarnings')}
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
                {t('marketplace.confirmPurchase')}
              </h3>
              <p className="text-slate-600 mb-4">
                {t('marketplace.confirmPurchaseQuestion')}
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
                  +{Math.floor(parseFloat(selectedPurchaseListing.price || '0') / 10000)} {t('loyaltyProgram.points')}
                </p>
                <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs text-blue-600">
                    <strong>{t('common.note')}:</strong> {t('marketplace.adminFeeNote')}
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                {t('marketplace.creditDeductionNote')}
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
                {t('common.cancel')}
              </Button>
              <Button 
                onClick={confirmPurchaseDialog}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-2" />
                {t('marketplace.yesBuy')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Credit History Modal */}
      {showCreditHistory && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowCreditHistory(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {t('account.financialHistory')}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCreditHistory(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Tab Navigation - Removed, showing only RP Credits */}
            <div className="mb-4">
              <h4 className="text-lg font-semibold text-slate-800 border-b pb-3 mb-4">
                <DollarSign className="w-5 h-5 mr-2 inline" />
                {t('account.rpCredits')}
              </h4>
            </div>
            
            {/* Credit History Content */}
            <div>
                {/* Credit History Filters */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <select
                    value={creditFilter}
                    onChange={(e) => setCreditFilter(e.target.value as 'all' | 'earned' | 'spent')}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">{t("filters.all")}</option>
                    <option value="earned">{t("filters.earned")}</option>
                    <option value="spent">{t('filters.spent')}</option>
                  </select>
                  <input
                    type="date"
                    value={creditDateFilter}
                    onChange={(e) => setCreditDateFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder={t("filters.filterByDate")}
                  />
                  {(creditFilter !== 'all' || creditDateFilter) && (
                    <button
                      onClick={() => {
                        setCreditFilter('all');
                        setCreditDateFilter('');
                      }}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                      {t("filters.clearFilters")}
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
                  <div>
                    <div className="space-y-3">
                      {paginatedCredits.map((entry: any) => (
                        <div key={entry?.id || Math.random()} className="border rounded-lg p-4 bg-green-50">
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
                          {t("pagination.showing")} {startIndex + 1}-{Math.min(endIndex, credits.length)} {t("pagination.of")} {credits.length} {t("pagination.items")}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCreditHistoryPage(Math.max(1, creditHistoryPage - 1))}
                            disabled={creditHistoryPage === 1}
                          >
                            {t("pagination.previous")}
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
                            {t("common.next")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Gamified Achievement Pop-up */}
      {showAchievement && currentAchievement && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] animate-in fade-in duration-300"
          onClick={closeAchievement}
        >
          <div 
            className="relative bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl transform animate-in zoom-in-50 duration-500"
            onClick={(e) => e.stopPropagation()}
          >
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
                {t('achievements.unlocked')}
              </h2>
              <div className={`inline-block px-4 py-2 rounded-full ${currentAchievement.bgColor} ${currentAchievement.borderColor} border-2 mb-4`}>
                <h3 className="text-lg font-bold text-gray-800">{currentAchievement.title}</h3>
              </div>
              <p className="text-gray-600 mb-4">{currentAchievement.description}</p>
              
              {/* Reward section */}
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  {t('achievements.yourReward')}
                </p>
                <p className="text-lg font-bold text-amber-900">{currentAchievement.reward}</p>
              </div>
              
              {/* Progress indicator */}
              <div className="bg-gray-100 rounded-lg p-3 mb-6">
                <p className="text-sm text-gray-600 mb-2">
                  {t('referral.progress')}
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
              {t('achievements.awesome')}
            </Button>
            
            {/* Queue indicator */}
            {achievementQueue.length > 0 && (
              <p className="text-xs text-gray-500 mt-3">
                {t('achievements.waiting', { count: achievementQueue.length })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowPasswordModal(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">
              {t('password.change')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('password.current')}
                </label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t('password.currentPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('password.new')}
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('password.newPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('password.confirm')}
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('password.confirmPlaceholder')}
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <Button
                onClick={changePassword}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={!currentPassword || !newPassword || !confirmPassword}
              >
                {t('profile.changePassword')}
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
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Email Notification Settings Modal */}
      {showEmailModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowEmailModal(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">
              {t('profile.notificationSettings')}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t('profile.emailNotifications')}
                  </label>
                  <p className="text-xs text-gray-500">
                    {t('profile.receiveEmailUpdates')}
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
                    {t('profile.smsNotifications')}
                  </label>
                  <p className="text-xs text-gray-500">
                    {t('profile.receiveSmsUpdates')}
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
                {t('common.save')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEmailModal(false)}
                className="flex-1"
              >
                {t('common.cancel')}
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
              {t('rewards.confirmRedemption')}
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
                    {t('rewards.cost')}: <span className="font-bold text-blue-600">{selectedReward.pointsCost} {t('common.points')}</span>
                  </p>
                  {selectedReward.type === 'credit' && selectedReward.creditAmount && (
                    <p className="text-sm text-green-700 mt-1">
                      {t('rewards.youWillReceive')}: <span className="font-bold text-green-600">RP {selectedReward.creditAmount}</span>
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
                  (t('rewards.redeeming')) : 
                  (t('rewards.yesRedeem'))
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
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Token Claim Modal */}
      {showTokenClaimModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowTokenClaimModal(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">
              {t('tokens.claimPhysical')}
            </h3>
            <p className="text-gray-600 mb-4">
              {t('tokens.claimMessage', { count: userTokens })}
            </p>
            <div className="bg-blue-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-700">
                {t('tokens.redemptionInfo')}
              </p>
            </div>
            <input
              type="number"
              min="1"
              max={userTokens}
              value={tokenClaimAmount}
              onChange={(e) => setTokenClaimAmount(e.target.value)}
              placeholder={t('tokens.numberPlaceholder')}
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
                  ? t('pet.processing')
                  : t('pet.submitClaim')
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
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Token History Modal */}
      {showHistoryModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowHistoryModal(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {modalHistoryFilter === 'tokens' ? t('tokens.history') : 
                 modalHistoryFilter === 'points' ? t('loyalty.pointsHistory') : 
                 modalHistoryFilter === 'credits' ? t('account.creditHistory') : 
                 t('common.history')}
              </h3>
              <Button variant="ghost" onClick={() => setShowHistoryModal(false)}>✕</Button>
            </div>

            <div className="space-y-4">
              {(() => {
                const claims = modalHistoryFilter === 'tokens' ? (tokenClaimsHistory || []) :
                              modalHistoryFilter === 'points' ? (filteredPointHistory || []) :
                              modalHistoryFilter === 'credits' ? (allCreditHistory || []) :
                              [];
                const itemsPerPage = 10;
                const startIndex = (modalHistoryPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const paginatedClaims = claims.slice(startIndex, endIndex);
                const totalPages = Math.ceil(claims.length / itemsPerPage);

                if (claims.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <div className="text-gray-500 mb-4 text-4xl">
                        {modalHistoryFilter === 'tokens' ? '🪙' : 
                         modalHistoryFilter === 'points' ? '🎁' : 
                         modalHistoryFilter === 'credits' ? '💰' : '📝'}
                      </div>
                      <p className="text-gray-500">
                        {modalHistoryFilter === 'tokens' ? t('tokens.noHistory') :
                         modalHistoryFilter === 'points' ? t('loyalty.noPointsHistory') :
                         modalHistoryFilter === 'credits' ? t('account.noCreditHistory') :
                         t('common.noHistory')}
                      </p>
                    </div>
                  );
                }

                return (
                  <>
                    <div className="space-y-3">
                      {paginatedClaims.map((transaction: any, index: number) => {
                        // Determine display values based on history filter type
                        let amount, amountLabel, isPositive, bgClass, textClass;
                        
                        if (modalHistoryFilter === 'tokens') {
                          amount = transaction.tokens !== undefined ? transaction.tokens : 
                                   (transaction.tokensRequested || transaction.tokensAwarded || 0);
                          amountLabel = t('common.tokens');
                          isPositive = amount > 0 || transaction.type === 'token_claim';
                        } else if (modalHistoryFilter === 'points') {
                          amount = transaction.pointsEarned || transaction.points || 0;
                          amountLabel = t('dashboard.loyaltyPoints');
                          isPositive = amount > 0;
                        } else if (modalHistoryFilter === 'credits') {
                          amount = transaction.amount || 0;
                          amountLabel = t('dashboard.credits');
                          isPositive = (transaction.type === 'earned' || amount > 0);
                        }
                        
                        bgClass = isPositive ? 'bg-green-50' : 'bg-red-50';
                        textClass = isPositive ? 'text-green-600' : 'text-red-600';
                        
                        return (
                        <div key={transaction.id || index} className={`border rounded-lg p-4 ${bgClass}`}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={textClass}>
                                  {isPositive ? '➕' : '➖'}
                                </span>
                                <span className="font-semibold">
                                  {modalHistoryFilter === 'credits' ? 
                                    `${isPositive ? '+' : ''}RP ${Math.abs(amount).toLocaleString()}` :
                                    `${isPositive ? '+' : ''}${Math.abs(amount)} ${amountLabel}`
                                  }
                                </span>
                              </div>
                              <p className="text-sm text-gray-800 mb-1">
                                {transaction.description || 
                                 (modalHistoryFilter === 'tokens' && transaction.type === 'token_claim' ? `Token claim: ${transaction.tokensAwarded} tokens` : 
                                  modalHistoryFilter === 'points' ? `Points ${transaction.type || 'transaction'}` :
                                  modalHistoryFilter === 'credits' ? `Credit ${transaction.type || 'transaction'}` :
                                  'Transaction')}
                              </p>
                              <p className="text-sm text-gray-600 mb-1">
                                {new Date(transaction.createdAt || transaction.requestedAt).toLocaleString(t("date.format"), {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                              {(transaction.adminNotes || transaction.notes) && (
                                <p className="text-sm text-blue-600 bg-blue-50 rounded px-2 py-1 mt-2">
                                  {t('common.notes')}{transaction.adminNotes || transaction.notes}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                                transaction.status === 'approved' || transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                                transaction.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {transaction.status === 'approved' || transaction.status === 'completed' ? t('status.completed') :
                                 transaction.status === 'rejected' ? t('status.rejected') :
                                 t('status.pending')}
                              </div>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex justify-between items-center pt-4 border-t mt-6">
                        <div className="text-sm text-gray-600">
                          t('pagination.showing') {startIndex + 1}-{Math.min(endIndex, claims.length)} t('pagination.of') {claims.length} {t("pagination.items")}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setModalHistoryPage(Math.max(1, modalHistoryPage - 1))}
                            disabled={modalHistoryPage === 1}
                          >
                            {t("pagination.previous")}
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
                            {t("common.next")}
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

        {/* Admin Tab */}
        {activeTab === "admin" && user?.role === 'admin' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">
                  {t('admin.dashboard')}
                </h2>
                <p className="text-slate-600">
                  {t('admin.manageSystem')}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    {t('admin.dashboard')}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {t('admin.accessFeatures')}
                  </p>
                  <Button 
                    onClick={() => window.open('/admin', '_blank')}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    {t('admin.openDashboard')}
                  </Button>
                </div>
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

      {/* QR Camera Modal */}
      {showQRCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {t("qr.scanCode")}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={stopCamera}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="mb-4">
              {cameraStream ? (
                <div className="relative">
                  <video
                    ref={(video) => {
                      if (video && cameraStream) {
                        video.srcObject = cameraStream;
                        video.play().then(() => {
                          console.log('Video playing, dimensions:', video.videoWidth, 'x', video.videoHeight);
                        }).catch(err => {
                          console.error('Video play error:', err);
                        });
                      }
                    }}
                    className="w-full h-64 bg-gray-200 rounded-lg object-cover"
                    playsInline
                    muted
                  />
                  <div className="absolute inset-0 border-2 border-purple-500 rounded-lg flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-white rounded-lg bg-transparent" />
                  </div>
                </div>
              ) : (
                <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Camera className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p className="text-gray-500">
                      {t('camera.accessing')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="text-center mb-4">
              <p className="text-sm text-gray-600">
                {t('qr.instructions')}
              </p>
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={simulateQRDetection}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                disabled={!cameraStream}
              >
                <QrCode className="w-4 h-4 mr-2" />
                {t('qr.detect')}
              </Button>
              <Button
                variant="outline"
                onClick={stopCamera}
                className="flex-1"
              >
                {t("common.close")}
              </Button>
            </div>
            
            <div className="mt-2 text-center">
              <p className="text-xs text-purple-600">
                Point camera at QR code and click "Detect QR Code". The code will auto-fill below.
              </p>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                <span className="font-semibold">
                  {t('qr.tips')}
                </span>
                {t('qr.tipsMessage')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pet Activation Confirmation Modal */}
      {showPetActivationConfirm && pendingToyActivation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Activate as Pet
            </h3>
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-lg overflow-hidden">
                  <img 
                    src={pendingToyActivation.imageUrl || '/images/default-toy.png'} 
                    alt={pendingToyActivation.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/images/default-toy.png';
                    }}
                  />
                </div>
                <h4 className="font-medium text-lg">{pendingToyActivation.name}</h4>
                <div className="bg-green-50 rounded-lg p-3 mt-3">
                  <p className="text-sm text-green-700">
                    This will create an active pet from your toy. You can then care for it, play with it, and watch it grow!
                  </p>
                </div>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <Button
                onClick={confirmPetActivation}
                disabled={activateToyAsPetMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {activateToyAsPetMutation.isPending ? 
                  "Activating..." : 
                  "Yes, Activate Pet"
                }
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPetActivationConfirm(false);
                  setPendingToyActivation(null);
                }}
                disabled={activateToyAsPetMutation.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Onboarding Walkthrough */}
      <OnboardingWalkthrough
        isOpen={showOnboarding}
        onClose={handleOnboardingClose}
        onComplete={handleOnboardingComplete}
      />

      {/* Contextual Tooltip Guide */}
      <TooltipGuide
        steps={guideConfigs[activeGuide] || []}
        isActive={!!activeGuide}
        onComplete={completeGuide}
        onSkip={skipGuide}
        characterImage={doluruuGrandpaImage}
      />
    </div>
  );
}