import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      toast({ title: "Success", description: "Referral code applied successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/referrals"] });
      setReferralCode("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to apply referral code", variant: "destructive" });
    },
  });

  const handleCopyReferralCode = () => {
    if (user?.referralCode) {
      const referralLink = `${window.location.origin}/login?ref=${user.referralCode}`;
      navigator.clipboard.writeText(referralLink);
      toast({ title: "Copied!", description: "Referral link copied to clipboard" });
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
      <div className="rwg-page-bg min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white/40 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rwg-page-bg min-h-screen pb-20 md:pb-0">
      <div className="rwg-orb-1" />
      <div className="rwg-orb-2" />
      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">

        <h1 className="text-3xl font-bold text-white mb-8">Referral Program</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Main Content */}
          <div className="lg:col-span-8 space-y-8">

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  label: "Total Referrals",
                  value: referrals?.length || 0,
                  sub: "All levels",
                  subColor: "text-emerald-400",
                  icon: Users,
                  iconBg: "bg-emerald-500/15 border-emerald-500/25",
                  iconColor: "text-emerald-400"
                },
                {
                  label: "Total Earnings",
                  value: `RP ${(referralEarnings?.earnings || 0).toLocaleString()}`,
                  sub: "From referrals",
                  subColor: "text-violet-400",
                  icon: DollarSign,
                  iconBg: "bg-violet-500/15 border-violet-500/25",
                  iconColor: "text-violet-400"
                },
                {
                  label: "Network Growth",
                  value: level1Referrals.length,
                  sub: "Active network",
                  subColor: "text-amber-400",
                  icon: TrendingUp,
                  iconBg: "bg-amber-500/15 border-amber-500/25",
                  iconColor: "text-amber-400"
                },
              ].map((stat, i) => (
                <div key={i} className="rwg-card p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/50 text-sm font-medium">{stat.label}</p>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                      <p className={`${stat.subColor} text-sm font-medium`}>{stat.sub}</p>
                    </div>
                    <div className={`w-12 h-12 ${stat.iconBg} border rounded-xl flex items-center justify-center`}>
                      <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Referral Network Tree */}
            <div className="rwg-card p-6">
              <h3 className="text-white font-bold text-lg mb-4">Your Referral Network</h3>
              <ReferralTree referrals={referrals} />
            </div>

            {/* Network Breakdown */}
            <div className="rwg-card p-6">
              <h3 className="text-white font-bold text-lg mb-6">Network Breakdown</h3>
              <div className="border-l-4 border-emerald-500 pl-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-semibold text-white">Level 1 - Direct Referrals</h4>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-3 py-1 rounded-full">
                    {level1Referrals.length} users · 10% commission
                  </span>
                </div>
                {level1Referrals.length > 0 ? (
                  <div className="space-y-2">
                    {level1Referrals.map((referral: any) => (
                      <div key={referral.id} className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <span className="font-medium text-white text-sm">{referral.name || `User #${referral.referredId}`}</span>
                        <span className="text-sm text-emerald-400">
                          Earned: RP {(referral.totalEarnings || 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/40 text-sm">No direct referrals yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">

            {/* Share Code */}
            <div className="bg-gradient-to-br from-emerald-500/20 to-violet-600/20 border border-emerald-500/30 rounded-2xl p-6">
              <h3 className="text-white font-bold text-lg mb-4">Share Your Referral Code</h3>
              <div className="bg-white/10 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <code className="text-lg font-mono font-bold text-white">{user?.referralCode || 'Loading...'}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-white/15 hover:bg-white/25 text-white rounded-lg"
                    onClick={handleCopyReferralCode}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button
                onClick={handleShareReferralCode}
                className="w-full bg-white text-emerald-700 font-semibold hover:bg-white/90 rounded-xl mb-2"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Code
              </Button>
              <p className="text-emerald-300 text-sm text-center">Earn 10% commission on referrals!</p>
            </div>

            {/* Apply Referral Code */}
            {!user?.referredById && (
              <div className="rwg-card p-6">
                <h3 className="text-white font-bold text-base mb-4">Have a Referral Code?</h3>
                <form onSubmit={handleApplyReferral} className="space-y-4">
                  <div>
                    <Label htmlFor="referralCode" className="text-white/70 text-sm">Enter Referral Code</Label>
                    <Input
                      id="referralCode"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      placeholder="RWG-XXXXXXXX"
                      required
                      className="rwg-input mt-1"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white border-0 rounded-xl"
                    disabled={applyReferralMutation.isPending}
                  >
                    {applyReferralMutation.isPending ? "Applying..." : "Apply Code"}
                  </Button>
                </form>
              </div>
            )}

            {/* Commission Structure */}
            <div className="rwg-card p-6">
              <h3 className="text-white font-bold text-base mb-4">Commission Structure</h3>
              <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                  <span className="font-medium text-white text-sm">Direct Referral</span>
                </div>
                <span className="font-bold text-emerald-400">10%</span>
              </div>
              <p className="text-sm text-white/50 text-center">
                Earn 10% on all verified purchases from your referrals
              </p>
            </div>

            {/* Tips */}
            <div className="rwg-card p-6">
              <h3 className="text-white font-bold text-base mb-4">Referral Tips</h3>
              <div className="space-y-3 text-sm text-white/60">
                <div className="flex items-start space-x-2">
                  <Gift className="h-4 w-4 mt-0.5 text-violet-400 flex-shrink-0" />
                  <p>Share your code with friends and family to start earning commissions</p>
                </div>
                <div className="flex items-start space-x-2">
                  <TrendingUp className="h-4 w-4 mt-0.5 text-emerald-400 flex-shrink-0" />
                  <p>Build a strong network by helping your referrals succeed</p>
                </div>
                <div className="flex items-start space-x-2">
                  <DollarSign className="h-4 w-4 mt-0.5 text-amber-400 flex-shrink-0" />
                  <p>Earn passive income from your referral network</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
