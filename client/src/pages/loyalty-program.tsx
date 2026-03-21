import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Crown, Star, Trophy, Gift, Zap, Diamond, Award, Medal } from "lucide-react";

export default function LoyaltyProgram() {
  const { toast } = useToast();
  const [currentPoints, setCurrentPoints] = useState(125);
  const [lifetimePoints, setLifetimePoints] = useState(235);

  const levels = [
    {
      level: 1,
      name: "Bronze Explorer",
      pointsRequired: 0,
      maxPoints: 499,
      icon: Medal,
      color: "from-amber-500 to-amber-700",
      benefits: ["5% bonus points on purchases", "Birthday discount 10%", "Free standard shipping"]
    },
    {
      level: 2,
      name: "Silver Adventurer",
      pointsRequired: 500,
      maxPoints: 1499,
      icon: Award,
      color: "from-slate-400 to-slate-600",
      benefits: ["10% bonus points on purchases", "Birthday discount 15%", "Priority customer support", "Early access to new services"]
    },
    {
      level: 3,
      name: "Gold Champion",
      pointsRequired: 1500,
      maxPoints: 3999,
      icon: Trophy,
      color: "from-yellow-400 to-yellow-600",
      benefits: ["15% bonus points on purchases", "Birthday discount 20%", "Free express shipping", "Exclusive monthly rewards", "Personal account manager"]
    },
    {
      level: 4,
      name: "Platinum Elite",
      pointsRequired: 4000,
      maxPoints: 9999,
      icon: Star,
      color: "from-violet-500 to-purple-700",
      benefits: ["20% bonus points on purchases", "Birthday discount 25%", "VIP event invitations", "Complimentary service upgrades", "Dedicated concierge service"]
    },
    {
      level: 5,
      name: "Diamond Royalty",
      pointsRequired: 10000,
      maxPoints: Infinity,
      icon: Crown,
      color: "from-indigo-400 to-violet-600",
      benefits: ["25% bonus points on purchases", "Birthday discount 30%", "Unlimited premium services", "Personal stylist/consultant", "Exclusive diamond member events", "Custom reward options"]
    }
  ];

  const [rewards, setRewards] = useState([
    { id: 1, name: "$10 Service Credit", pointsCost: 100, category: "credit", claimed: false },
    { id: 2, name: "Free Basic Facial", pointsCost: 200, category: "beauty", claimed: false },
    { id: 3, name: "Priority Booking Pass", pointsCost: 150, category: "perk", claimed: false },
    { id: 4, name: "$25 Service Credit", pointsCost: 250, category: "credit", claimed: false },
    { id: 5, name: "Free Gaming Session (1hr)", pointsCost: 180, category: "entertainment", claimed: false },
    { id: 6, name: "Spa Package Upgrade", pointsCost: 300, category: "beauty", claimed: false },
    { id: 7, name: "$50 Service Credit", pointsCost: 500, category: "credit", claimed: false },
    { id: 8, name: "VIP Experience Day", pointsCost: 750, category: "experience", claimed: true },
    { id: 9, name: "Personal Consultation", pointsCost: 400, category: "service", claimed: false },
    { id: 10, name: "$100 Service Credit", pointsCost: 1000, category: "credit", claimed: false }
  ]);

  const [claimedRewards, setClaimedRewards] = useState([
    { id: 101, name: "VIP Experience Day", pointsSpent: 750, claimedDate: "2025-05-20", status: "used" },
    { id: 102, name: "$10 Service Credit", pointsSpent: 100, claimedDate: "2025-05-15", status: "used" }
  ]);

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

  const redeemReward = (reward) => {
    if (currentPoints < reward.pointsCost) {
      toast({
        title: "Insufficient Points",
        description: `You need ${reward.pointsCost - currentPoints} more points to redeem this reward.`,
        variant: "destructive"
      });
      return;
    }
    setCurrentPoints(prev => prev - reward.pointsCost);
    setRewards(rewards.map(r => r.id === reward.id ? { ...r, claimed: true } : r));
    const newClaimed = {
      id: Date.now(),
      name: reward.name,
      pointsSpent: reward.pointsCost,
      claimedDate: new Date().toISOString().split('T')[0],
      status: "active"
    };
    setClaimedRewards([newClaimed, ...claimedRewards]);
    toast({ title: "Reward Claimed!", description: `You've successfully redeemed ${reward.name}` });
  };

  const earnBonusPoints = () => {
    setCurrentPoints(prev => prev + 50);
    setLifetimePoints(prev => prev + 50);
    toast({ title: "Bonus Points Earned!", description: "You earned 50 bonus points!" });
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'credit': return '💳';
      case 'beauty': return '💄';
      case 'entertainment': return '🎮';
      case 'perk': return '⭐';
      case 'experience': return '🎭';
      case 'service': return '🤝';
      default: return '🎁';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'credit': return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      case 'beauty': return 'bg-pink-500/20 text-pink-300 border border-pink-500/30';
      case 'entertainment': return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
      case 'perk': return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
      case 'experience': return 'bg-violet-500/20 text-violet-300 border border-violet-500/30';
      case 'service': return 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
      default: return 'bg-white/10 text-white/60 border border-white/20';
    }
  };

  return (
    <div className="rwg-page-bg min-h-screen pb-20 md:pb-0">
      <div className="rwg-orb-1" />
      <div className="rwg-orb-2" />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 relative z-10">

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Loyalty Program</h1>
          <p className="text-white/50">Earn points, unlock levels, and claim amazing rewards</p>
        </div>

        {/* Current Status */}
        <div className="rwg-card p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 bg-gradient-to-br ${currentLevelInfo.color} rounded-2xl flex items-center justify-center`}>
                <currentLevelInfo.icon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{currentLevelInfo.name}</h2>
                <p className="text-white/50">Level {currentLevelInfo.level}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white">{currentPoints}</p>
              <p className="text-white/50">Available Points</p>
            </div>
          </div>

          {nextLevelInfo && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-white/70">Progress to {nextLevelInfo.name}</span>
                <span className="text-sm text-white/50">{pointsToNextLevel} points needed</span>
              </div>
              <Progress value={progressPercentage} className="h-3 bg-white/10" />
              <p className="text-xs text-white/40 text-center">
                {lifetimePoints} / {nextLevelInfo.pointsRequired} lifetime points
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Available Rewards */}
          <div className="lg:col-span-2">
            <div className="rwg-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">Available Rewards</h3>
                <Button
                  onClick={earnBonusPoints}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 rounded-xl"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Earn 50 Bonus Points
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rewards.filter(r => !r.claimed).map((reward) => (
                  <div key={reward.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getCategoryIcon(reward.category)}</span>
                        <div>
                          <h3 className="font-semibold text-white text-sm">{reward.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(reward.category)}`}>
                            {reward.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-violet-400">{reward.pointsCost} pts</span>
                      <Button
                        size="sm"
                        onClick={() => redeemReward(reward)}
                        disabled={currentPoints < reward.pointsCost}
                        className={currentPoints >= reward.pointsCost
                          ? "bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white border-0 rounded-lg"
                          : "bg-white/10 text-white/30 cursor-not-allowed border-0 rounded-lg"
                        }
                      >
                        {currentPoints >= reward.pointsCost ? "Redeem" : "Not enough"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Level Benefits */}
            <div className="rwg-card p-6">
              <h3 className="text-base font-bold text-white mb-4">Your Level Benefits</h3>
              <div className="space-y-3">
                {currentLevelInfo.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0"></div>
                    <span className="text-sm text-white/70">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* All Levels */}
            <div className="rwg-card p-6">
              <h3 className="text-base font-bold text-white mb-4">All Loyalty Levels</h3>
              <div className="space-y-2">
                {levels.map((level) => {
                  const isCurrent = level.level === currentLevelInfo.level;
                  return (
                    <div
                      key={level.level}
                      className={`flex items-center space-x-3 p-3 rounded-xl transition-colors ${
                        isCurrent ? 'bg-violet-500/20 border border-violet-500/30' : 'bg-white/5'
                      }`}
                    >
                      <div className={`w-8 h-8 bg-gradient-to-br ${level.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <level.icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-white truncate">{level.name}</p>
                        <p className="text-xs text-white/40">{level.pointsRequired}+ points</p>
                      </div>
                      {isCurrent && (
                        <span className="text-xs bg-violet-500/30 text-violet-300 border border-violet-500/40 px-2 py-0.5 rounded-full flex-shrink-0">
                          Current
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Claimed History */}
            <div className="rwg-card p-6">
              <h3 className="text-base font-bold text-white mb-4">Claimed Rewards</h3>
              <div className="space-y-3">
                {claimedRewards.slice(0, 3).map((reward) => (
                  <div key={reward.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div>
                      <p className="font-medium text-sm text-white">{reward.name}</p>
                      <p className="text-xs text-white/40">{reward.claimedDate}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      reward.status === 'used'
                        ? 'bg-white/10 text-white/40 border-white/20'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {reward.status}
                    </span>
                  </div>
                ))}
                {claimedRewards.length === 0 && (
                  <p className="text-sm text-white/40 text-center py-4">No rewards claimed yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
