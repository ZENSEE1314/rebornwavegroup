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

            {/* Top Supporters Box - 3 Circular Photos */}
            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="text-xs font-medium text-gray-700 mb-2">Top Supporters</div>
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3">
                <div className="flex justify-center space-x-4">
                  {/* Show top contributors if available */}
                  {topContributors && topContributors.length > 0 ? (
                    <>
                      {topContributors.slice(0, 3).map((contributor: any, idx: number) => (
                        <div key={contributor.contributorUserId} className="flex flex-col items-center">
                          {/* Circular Photo */}
                          <div className="relative">
                            {contributor.profileImageUrl ? (
                              <img
                                src={contributor.profileImageUrl}
                                alt={contributor.username || contributor.firstName || "Supporter"}
                                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md"
                              />
                            ) : (
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white border-2 border-white shadow-md ${
                                idx === 0 ? 'bg-gradient-to-br from-blue-400 to-blue-600' :
                                idx === 1 ? 'bg-gradient-to-br from-green-400 to-green-600' :
                                'bg-gradient-to-br from-purple-400 to-purple-600'
                              }`}>
                                {(contributor.username || contributor.firstName || "S").charAt(0).toUpperCase()}
                              </div>
                            )}
                            {/* Star count badge */}
                            <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-5 flex items-center justify-center font-bold shadow-md">
                              {contributor.totalStars}
                            </div>
                          </div>
                          {/* Name below photo */}
                          <div className="text-xs text-gray-700 font-medium mt-2 text-center max-w-[70px] truncate">
                            {contributor.username || contributor.firstName || 'Anonymous'}
                          </div>
                        </div>
                      ))}
                      
                      {/* Fill empty slots with placeholder circles if less than 3 supporters */}
                      {Array.from({ length: Math.max(0, 3 - topContributors.length) }).map((_, idx) => (
                        <div key={`empty-${idx}`} className="flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 bg-white flex items-center justify-center shadow-md">
                            <User className="w-5 h-5 text-gray-400" />
                          </div>
                          <div className="text-xs text-gray-400 mt-2 font-medium">No supporter</div>
                        </div>
                      ))}
                    </>
                  ) : (
                    /* Show 3 empty slots when no contributors */
                    Array.from({ length: 3 }).map((_, idx) => (
                      <div key={`empty-${idx}`} className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 bg-white flex items-center justify-center shadow-md">
                          <User className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="text-xs text-gray-400 mt-2 font-medium">No supporter</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
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

// Simple test export default function
export default function CompleteApp() {
  const { user } = useAuth();
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">KOS - Kings Of Singers</h1>
        <p className="text-center text-gray-600 mb-8">Top Contributors System Test</p>
        
        <div className="space-y-4">
          <UserCard userItem={{ id: 1, username: "test_user", totalStars: 100, votes: 50 }} isTop3={true} index={0} />
          <UserCard userItem={{ id: 2, username: "another_user", totalStars: 80, votes: 30 }} isTop3={false} index={1} />
        </div>
      </div>
    </div>
  );
}