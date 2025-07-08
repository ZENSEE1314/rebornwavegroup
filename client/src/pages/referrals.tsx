import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Copy, Share2, TrendingUp, DollarSign, Gift } from "lucide-react";
import ReferralTree from "@/components/referral-tree";

export default function Referrals() {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: referrals, isLoading } = useQuery({
    queryKey: ["/api/users/referrals"],
  });

  const { data: referralEarnings } = useQuery({
    queryKey: ["/api/users/referral-earnings"],
  });

  const applyReferralMutation = useMutation({
    mutationFn: async (code: string) => {
      return await apiRequest("POST", "/api/users/apply-referral", { referralCode: code });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Referral code applied successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/referrals"] });
      setReferralCode("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to apply referral code",
        variant: "destructive",
      });
    },
  });

  const handleCopyReferralCode = () => {
    if (user?.referralCode) {
      const referralLink = `${window.location.origin}/login?ref=${user.referralCode}`;
      navigator.clipboard.writeText(referralLink);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
      });
    }
  };

  const handleShareReferralCode = () => {
    if (navigator.share && user?.referralCode) {
      navigator.share({
        title: "Join Reborn Wave Group",
        text: `Use my referral code to join Reborn Wave Group and get exclusive benefits!`,
        url: `${window.location.origin}/login?ref=${user.referralCode}`,
      });
    } else {
      handleCopyReferralCode();
    }
  };

  const handleApplyReferral = (e: React.FormEvent) => {
    e.preventDefault();
    if (referralCode.trim()) {
      applyReferralMutation.mutate(referralCode.trim());
    }
  };

  const level1Referrals = referrals?.filter((r: any) => r.level === 1) || [];

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-48"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Referral Program</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm font-medium">Total Referrals</p>
                    <p className="text-2xl font-bold text-slate-800">{referrals?.length || 0}</p>
                    <p className="text-emerald-600 text-sm font-medium">All levels</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm font-medium">Total Earnings</p>
                    <p className="text-2xl font-bold text-slate-800">
                      RP {(referralEarnings?.earnings || 0).toLocaleString()}
                    </p>
                    <p className="text-primary-600 text-sm font-medium">From referrals</p>
                  </div>
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-primary-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm font-medium">Network Growth</p>
                    <p className="text-2xl font-bold text-slate-800">
                      {level1Referrals.length.toLocaleString()}
                    </p>
                    <p className="text-amber-600 text-sm font-medium">Active network</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Referral Network Tree */}
          <Card>
            <CardHeader>
              <CardTitle>Your Referral Network</CardTitle>
            </CardHeader>
            <CardContent>
              <ReferralTree referrals={referrals} />
            </CardContent>
          </Card>

          {/* Detailed Network Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Network Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                
                {/* Level 1 */}
                <div className="border-l-4 border-emerald-500 pl-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800">Level 1 - Direct Referrals</h3>
                    <Badge className="bg-emerald-100 text-emerald-700">
                      {level1Referrals.length} users • 10% commission
                    </Badge>
                  </div>
                  {level1Referrals.length > 0 ? (
                    <div className="space-y-2">
                      {level1Referrals.map((referral: any) => (
                        <div key={referral.id} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                          <span className="font-medium">{referral.name || `User #${referral.referredId}`}</span>
                          <span className="text-sm text-emerald-600">
                            Earned: RP {(referral.totalEarnings || 0).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">No direct referrals yet</p>
                  )}
                </div>


              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Share Your Code */}
          <div className="bg-gradient-to-br from-emerald-500 to-primary-600 rounded-xl p-6 text-white">
            <h3 className="text-lg font-bold mb-4">Share Your Referral Code</h3>
            <div className="bg-white/20 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <code className="text-lg font-mono font-bold">{user?.referralCode || 'Loading...'}</code>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white"
                  onClick={handleCopyReferralCode}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Button 
                onClick={handleShareReferralCode}
                className="w-full bg-white text-emerald-600 font-semibold hover:bg-slate-50"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Code
              </Button>
              <p className="text-emerald-100 text-sm text-center">
                Earn 10% commission on referrals!
              </p>
            </div>
          </div>

          {/* Apply Referral Code */}
          {!user?.referredById && (
            <Card>
              <CardHeader>
                <CardTitle>Have a Referral Code?</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleApplyReferral} className="space-y-4">
                  <div>
                    <Label htmlFor="referralCode">Enter Referral Code</Label>
                    <Input
                      id="referralCode"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      placeholder="RWG-XXXXXXXX"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={applyReferralMutation.isPending}
                  >
                    {applyReferralMutation.isPending ? "Applying..." : "Apply Code"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Commission Structure */}
          <Card>
            <CardHeader>
              <CardTitle>Commission Structure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                  <span className="font-medium text-slate-800">Direct Referral</span>
                </div>
                <span className="font-bold text-emerald-600">10%</span>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-slate-600">
                  Earn 10% commission on all verified purchases made by people you refer
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Referral Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-start space-x-2">
                  <Gift className="h-4 w-4 mt-0.5 text-primary-600" />
                  <p>Share your code with friends and family to start earning commissions</p>
                </div>
                <div className="flex items-start space-x-2">
                  <TrendingUp className="h-4 w-4 mt-0.5 text-emerald-600" />
                  <p>Build a strong network by helping your referrals succeed</p>
                </div>
                <div className="flex items-start space-x-2">
                  <DollarSign className="h-4 w-4 mt-0.5 text-amber-600" />
                  <p>Earn passive income from up to 3 levels of referrals</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
