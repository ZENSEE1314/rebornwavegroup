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

// UserCard component for displaying user profiles with top contributors
const UserCard = ({ userItem, isTop3 = false, index }: { userItem: any; isTop3?: boolean; index: number }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Fetch top contributors for this user
  const { data: topContributors = [] } = useQuery({
    queryKey: ['/api/kos/top-contributors-with-details', userItem?.id],
    queryFn: () => fetch(`/api/kos/top-contributors-with-details/${userItem?.id}`).then(res => res.json()),
    enabled: !!userItem?.id,
    staleTime: 5000,
  });

  // Voting mutation
  const voteMutation = useMutation({
    mutationFn: async ({ targetUserId, type }: { targetUserId: number; type: 'like' | 'vote' }) => {
      const endpoint = type === 'like' ? '/api/kos/like' : '/api/kos/vote';
      return apiRequest('POST', endpoint, { targetUserId });
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your action was recorded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleVote = (targetUser: any, type: 'like' | 'vote') => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "Please log in to vote",
        variant: "destructive",
      });
      return;
    }

    if (targetUser?.id === user?.id) {
      toast({
        title: "Cannot vote for yourself",
        description: "You cannot vote for your own profile",
        variant: "destructive",
      });
      return;
    }

    voteMutation.mutate({ targetUserId: targetUser?.id, type });
  };

  return (
    <Card className={`${isTop3 ? 'border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50' : 'hover:shadow-lg transition-shadow'}`}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          {/* Position number for top 3 */}
          {isTop3 && (
            <div className="flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
              }`}>
                {index + 1}
              </div>
            </div>
          )}
          
          {/* User avatar */}
          <div className="flex-shrink-0">
            {userItem.profileImageUrl ? (
              <img
                src={userItem.profileImageUrl}
                alt={userItem.username || userItem.firstName || "User"}
                className={`${isTop3 ? 'w-12 h-12' : 'w-10 h-10'} rounded-full object-cover border-2 border-purple-200`}
              />
            ) : (
              <div className={`${isTop3 ? 'w-12 h-12' : 'w-10 h-10'} rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold border-2 border-purple-200`}>
                {(userItem.username || userItem.firstName || "U").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          {/* User info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <p className={`${isTop3 ? 'text-base' : 'text-sm'} font-semibold text-gray-900 truncate`}>
                {userItem.username || `${userItem.firstName || ''} ${userItem.lastName || ''}`.trim() || 'Anonymous User'}
              </p>
              
              {/* Top 3 badge */}
              {isTop3 && (
                <Badge className={`${
                  index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                } text-white`}>
                  <Trophy className="w-3 h-3 mr-1" />
                  Top {index + 1}
                </Badge>
              )}
            </div>
            
            {/* Stats row */}
            <div className="flex items-center space-x-4 text-xs text-gray-600">
              <span className="flex items-center">
                <Star className="w-3 h-3 mr-1 text-yellow-500" />
                {userItem.totalStars || userItem.stars || 0} stars
              </span>
              <span className="flex items-center">
                <Heart className="w-3 h-3 mr-1 text-pink-500" />
                {userItem.votes || userItem.likesReceived || 0} likes
              </span>
            </div>

            {/* Top Supporters - 3 Circular Photos aligned with username */}
            {topContributors && topContributors.length > 0 && (
              <div className="flex items-center space-x-1 mt-1">
                {topContributors.slice(0, 3).map((contributor: any, idx: number) => (
                  <div key={contributor.contributorUserId} className="relative">
                    {contributor.profileImageUrl ? (
                      <img
                        src={contributor.profileImageUrl}
                        alt={contributor.username || contributor.firstName || "Supporter"}
                        className="w-6 h-6 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white border border-gray-200 ${
                        idx === 0 ? 'bg-gradient-to-br from-blue-400 to-blue-600' :
                        idx === 1 ? 'bg-gradient-to-br from-green-400 to-green-600' :
                        'bg-gradient-to-br from-purple-400 to-purple-600'
                      }`}>
                        {(contributor.username || contributor.firstName || "S").charAt(0).toUpperCase()}
                      </div>
                    )}
                    {/* Small star count */}
                    <div className="absolute -bottom-0.5 -right-0.5 bg-yellow-400 text-white text-xs rounded-full w-3 h-3 flex items-center justify-center font-bold text-[8px]">
                      {contributor.totalStars}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Action buttons */}
          {userItem?.id !== user?.id && (
            <div className="flex flex-col space-y-1">
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
          {userItem?.id === user?.id && (
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
};

// KOS (Kings Of Singers) Section Component
function KOSSection({ user, queryClient }: { user: any; queryClient: any }) {
  const { toast } = useToast();
  const [kosActiveTab, setKosActiveTab] = useState<'tournament' | 'individual'>('tournament');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch real KOS users data
  const { data: kosUsers = [], isLoading: kosUsersLoading } = useQuery({
    queryKey: ['/api/kos/users', kosActiveTab, currentPage],
    queryFn: () => fetch(`/api/kos/users?type=${kosActiveTab}&page=${currentPage}&limit=113`).then(res => res.json()),
    staleTime: 0,
    cacheTime: 0,
  });

  return (
    <div className="space-y-6">
      {/* Tournament/Individual Tabs */}
      <div className="flex justify-center">
        <div className="bg-white rounded-lg p-1 shadow-sm border">
          <button
            onClick={() => setKosActiveTab('tournament')}
            className={`px-6 py-2 rounded-md font-medium transition-all ${
              kosActiveTab === 'tournament'
                ? 'bg-purple-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            Tournament Mode
          </button>
          <button
            onClick={() => setKosActiveTab('individual')}
            className={`px-6 py-2 rounded-md font-medium transition-all ${
              kosActiveTab === 'individual'
                ? 'bg-purple-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            Individual Mode
          </button>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {kosUsersLoading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500" />
            <p className="text-gray-600 mt-2">Loading users...</p>
          </div>
        ) : kosUsers.length > 0 ? (
          <>
            {/* Top 3 Users */}
            {kosUsers.slice(0, 3).map((userItem: any, index: number) => (
              <UserCard key={userItem.id} userItem={userItem} isTop3={true} index={index} />
            ))}
            
            {/* Remaining Users */}
            {kosUsers.slice(3).map((userItem: any, index: number) => (
              <UserCard key={userItem.id} userItem={userItem} isTop3={false} index={index + 3} />
            ))}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">No users found</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Main Complete App Component
export default function CompleteApp() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("kos");
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src={logoImage} alt="KOS Logo" className="w-10 h-10" />
              <h1 className="text-2xl font-bold text-purple-600">Kings Of Singers</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.username || user?.firstName || 'User'}!
              </span>
              <Button variant="outline" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab("kos")}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === "kos"
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              KOS Competition
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === "profile"
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Profile
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === "kos" && (
          <KOSSection user={user} queryClient={queryClient} />
        )}
        
        {activeTab === "profile" && (
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">User Profile</h2>
            <p className="text-gray-600">Profile management coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}