import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, DollarSign, TrendingUp, Copy, Share2, Gift, Award, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MobileBackButton from "@/components/mobile-back-button";

export default function Referrals() {
  const { toast } = useToast();
  const [newReferralCode, setNewReferralCode] = useState("");
  
  const myReferralCode = "RWG-1HMTE49h";
  const [referralNetwork, setReferralNetwork] = useState([
    {
      id: 1,
      name: "Zen",
      email: "zensee1314@gmail.com",
      joinDate: "2025-05-27",
      level: 1,
      totalSpent: 80.00,
      myEarnings: 8.00,
      status: "active"
    }
  ]);

  const [totalEarnings, setTotalEarnings] = useState(8.00);
  const [monthlyEarnings, setMonthlyEarnings] = useState(8.00);

  const copyReferralCode = () => {
    navigator.clipboard.writeText(myReferralCode);
    toast({
      title: "Copied!",
      description: "Referral code copied to clipboard",
    });
  };

  const shareReferralCode = () => {
    const message = `Join Reborn Wave Group and experience premium beauty, fun & entertainment services! Use my referral code: ${myReferralCode} to get started.`;
    
    if (navigator.share) {
      navigator.share({
        title: "Join Reborn Wave Group",
        text: message,
      });
    } else {
      navigator.clipboard.writeText(message);
      toast({
        title: "Copied!",
        description: "Referral message copied to clipboard",
      });
    }
  };

  const applyReferralCode = () => {
    if (!newReferralCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a referral code",
        variant: "destructive",
      });
      return;
    }

    if (newReferralCode === myReferralCode) {
      toast({
        title: "Error",
        description: "You cannot use your own referral code",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success!",
      description: "Referral code applied successfully. You'll earn bonus points on your next purchase!",
    });
    setNewReferralCode("");
  };

  const getLevelIcon = (level: number) => {
    switch (level) {
      case 1: return <Users className="w-5 h-5 text-emerald-600" />;
      case 2: return <Award className="w-5 h-5 text-blue-600" />;
      case 3: return <Crown className="w-5 h-5 text-purple-600" />;
      default: return <Users className="w-5 h-5 text-gray-600" />;
    }
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return "bg-emerald-100 text-emerald-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getCommissionRate = (level: number) => {
    switch (level) {
      case 1: return "10%";
      default: return "0%";
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Mobile Back Button */}
      <MobileBackButton className="mb-4" />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Referral Network</h1>
        <p className="text-slate-600 mt-2">Invite friends and earn 10% commission on their verified purchases</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-emerald-500 to-green-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm font-medium">Total Referrals</p>
                    <p className="text-3xl font-bold">{referralNetwork.length}</p>
                    <p className="text-emerald-200 text-xs">Active network</p>
                  </div>
                  <Users className="h-8 w-8 text-emerald-200" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Earnings</p>
                    <p className="text-3xl font-bold">${totalEarnings.toFixed(2)}</p>
                    <p className="text-blue-200 text-xs">All time</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">This Month</p>
                    <p className="text-3xl font-bold">${monthlyEarnings.toFixed(2)}</p>
                    <p className="text-purple-200 text-xs">Earnings</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Referral Network */}
          <Card>
            <CardHeader>
              <CardTitle>Your Referral Network</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {referralNetwork.map((referral) => (
                  <div key={referral.id} className="flex items-center justify-between p-4 border-2 border-slate-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                        {getLevelIcon(referral.level)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{referral.name}</h3>
                        <p className="text-sm text-slate-600">{referral.email}</p>
                        <p className="text-xs text-slate-500">Joined {referral.joinDate}</p>
                      </div>
                    </div>
                    
                    <div className="text-right space-y-2">
                      <Badge className={getLevelColor(referral.level)}>
                        Level {referral.level} • {getCommissionRate(referral.level)}
                      </Badge>
                      <div>
                        <p className="text-sm text-slate-600">Total Spent: ${referral.totalSpent.toFixed(2)}</p>
                        <p className="text-lg font-bold text-emerald-600">Your Earnings: ${referral.myEarnings.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {referralNetwork.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No referrals yet</h3>
                    <p className="text-slate-600">Start sharing your referral code to build your network</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Apply Referral Code */}
          <Card>
            <CardHeader>
              <CardTitle>Have a Referral Code?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4">
                <Input
                  placeholder="Enter referral code (e.g., RWG-XXXXXX)"
                  value={newReferralCode}
                  onChange={(e) => setNewReferralCode(e.target.value.toUpperCase())}
                  className="flex-1"
                />
                <Button onClick={applyReferralCode}>
                  <Gift className="w-4 h-4 mr-2" />
                  Apply Code
                </Button>
              </div>
              <p className="text-sm text-slate-600 mt-2">
                Enter someone else's referral code to get bonus points on your next purchase!
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          
          {/* Your Referral Code */}
          <Card className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white">
            <CardHeader>
              <CardTitle className="text-white">Your Referral Code</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white/20 rounded-lg p-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold font-mono mb-2">{myReferralCode}</div>
                  <p className="text-emerald-100 text-sm">Share this code to earn commissions!</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={copyReferralCode}
                  className="bg-white/20 hover:bg-white/30 text-white border-0"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button 
                  onClick={shareReferralCode}
                  className="bg-white/20 hover:bg-white/30 text-white border-0"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Commission Structure */}
          <Card>
            <CardHeader>
              <CardTitle>Commission Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border-2 border-emerald-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                    <span className="font-medium">Direct Referrals</span>
                  </div>
                  <span className="font-bold text-emerald-600 text-lg">10%</span>
                </div>
                
                <div className="text-center py-4">
                  <p className="text-sm text-slate-600">
                    Earn 10% commission on all verified purchases made by people you refer
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-xs">1</div>
                  <div>
                    <p className="font-medium text-slate-800">Share your code</p>
                    <p className="text-sm text-slate-600">Send your referral code to friends</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs">2</div>
                  <div>
                    <p className="font-medium text-slate-800">They sign up</p>
                    <p className="text-sm text-slate-600">Friends use your code when joining</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">3</div>
                  <div>
                    <p className="font-medium text-slate-800">Earn commissions</p>
                    <p className="text-sm text-slate-600">Get paid when they make purchases</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}