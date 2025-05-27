import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Crown, Star, Trophy, Gift, Zap, Diamond, Award, Medal } from "lucide-react";

export default function LoyaltyProgram() {
  const { toast } = useToast();
  const [currentPoints, setCurrentPoints] = useState(125);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [lifetimePoints, setLifetimePoints] = useState(235);

  // Loyalty level structure
  const levels = [
    {
      level: 1,
      name: "Bronze Explorer",
      pointsRequired: 0,
      maxPoints: 499,
      icon: Medal,
      color: "from-amber-600 to-amber-800",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      benefits: ["5% bonus points on purchases", "Birthday discount 10%", "Free standard shipping"]
    },
    {
      level: 2,
      name: "Silver Adventurer",
      pointsRequired: 500,
      maxPoints: 1499,
      icon: Award,
      color: "from-gray-500 to-gray-700",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      benefits: ["10% bonus points on purchases", "Birthday discount 15%", "Priority customer support", "Early access to new services"]
    },
    {
      level: 3,
      name: "Gold Champion",
      pointsRequired: 1500,
      maxPoints: 3999,
      icon: Trophy,
      color: "from-yellow-500 to-yellow-700",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      benefits: ["15% bonus points on purchases", "Birthday discount 20%", "Free express shipping", "Exclusive monthly rewards", "Personal account manager"]
    },
    {
      level: 4,
      name: "Platinum Elite",
      pointsRequired: 4000,
      maxPoints: 9999,
      icon: Star,
      color: "from-purple-500 to-purple-700",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      benefits: ["20% bonus points on purchases", "Birthday discount 25%", "VIP event invitations", "Complimentary service upgrades", "Dedicated concierge service"]
    },
    {
      level: 5,
      name: "Diamond Royalty",
      pointsRequired: 10000,
      maxPoints: Infinity,
      icon: Crown,
      color: "from-indigo-500 to-purple-600",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200",
      benefits: ["25% bonus points on purchases", "Birthday discount 30%", "Unlimited premium services", "Personal stylist/consultant", "Exclusive diamond member events", "Custom reward options"]
    }
  ];

  // Available rewards that can be redeemed
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

  // Calculate current level info
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
    setRewards(rewards.map(r => 
      r.id === reward.id ? { ...r, claimed: true } : r
    ));
    
    const newClaimedReward = {
      id: Date.now(),
      name: reward.name,
      pointsSpent: reward.pointsCost,
      claimedDate: new Date().toISOString().split('T')[0],
      status: "active"
    };
    
    setClaimedRewards([newClaimedReward, ...claimedRewards]);

    toast({
      title: "Reward Claimed!",
      description: `You've successfully redeemed ${reward.name}`,
    });
  };

  const earnBonusPoints = () => {
    const bonusPoints = 50;
    setCurrentPoints(prev => prev + bonusPoints);
    setLifetimePoints(prev => prev + bonusPoints);
    
    toast({
      title: "Bonus Points Earned!",
      description: `You earned ${bonusPoints} bonus points!`,
    });
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
      case 'credit': return 'bg-green-100 text-green-800';
      case 'beauty': return 'bg-pink-100 text-pink-800';
      case 'entertainment': return 'bg-blue-100 text-blue-800';
      case 'perk': return 'bg-yellow-100 text-yellow-800';
      case 'experience': return 'bg-purple-100 text-purple-800';
      case 'service': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Loyalty Program</h1>
        <p className="text-slate-600">Earn points, unlock levels, and claim amazing rewards</p>
      </div>

      {/* Current Status */}
      <Card className={`${currentLevelInfo.bgColor} ${currentLevelInfo.borderColor} border-2`}>
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 bg-gradient-to-br ${currentLevelInfo.color} rounded-full flex items-center justify-center`}>
                <currentLevelInfo.icon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{currentLevelInfo.name}</h2>
                <p className="text-slate-600">Level {currentLevelInfo.level}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-slate-900">{currentPoints}</p>
              <p className="text-slate-600">Available Points</p>
            </div>
          </div>

          {nextLevelInfo && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">
                  Progress to {nextLevelInfo.name}
                </span>
                <span className="text-sm text-slate-600">
                  {pointsToNextLevel} points needed
                </span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
              <p className="text-xs text-slate-500 text-center">
                {lifetimePoints} / {nextLevelInfo.pointsRequired} lifetime points
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Available Rewards */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Available Rewards</CardTitle>
              <Button onClick={earnBonusPoints} className="bg-green-600 hover:bg-green-700">
                <Zap className="w-4 h-4 mr-2" />
                Earn 50 Bonus Points
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rewards.filter(r => !r.claimed).map((reward) => (
                  <div key={reward.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getCategoryIcon(reward.category)}</span>
                        <div>
                          <h3 className="font-semibold text-slate-900">{reward.name}</h3>
                          <Badge className={getCategoryColor(reward.category)}>
                            {reward.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-blue-600">
                        {reward.pointsCost} points
                      </span>
                      <Button
                        size="sm"
                        onClick={() => redeemReward(reward)}
                        disabled={currentPoints < reward.pointsCost}
                        className={currentPoints >= reward.pointsCost ? 
                          "bg-blue-600 hover:bg-blue-700" : 
                          "bg-gray-300 cursor-not-allowed"
                        }
                      >
                        {currentPoints >= reward.pointsCost ? "Redeem" : "Not enough points"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          
          {/* Level Benefits */}
          <Card>
            <CardHeader>
              <CardTitle>Your Level Benefits</CardTitle>
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

          {/* All Levels */}
          <Card>
            <CardHeader>
              <CardTitle>All Loyalty Levels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {levels.map((level) => (
                  <div 
                    key={level.level} 
                    className={`flex items-center space-x-3 p-3 rounded-lg ${
                      level.level === currentLevelInfo.level ? 
                      `${level.bgColor} ${level.borderColor} border-2` : 
                      'bg-gray-50'
                    }`}
                  >
                    <level.icon className={`w-6 h-6 ${
                      level.level === currentLevelInfo.level ? 
                      'text-slate-900' : 'text-gray-500'
                    }`} />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{level.name}</p>
                      <p className="text-xs text-gray-600">
                        {level.pointsRequired}+ points
                      </p>
                    </div>
                    {level.level === currentLevelInfo.level && (
                      <Badge variant="default">Current</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Claimed Rewards History */}
          <Card>
            <CardHeader>
              <CardTitle>Claimed Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {claimedRewards.slice(0, 3).map((reward) => (
                  <div key={reward.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{reward.name}</p>
                      <p className="text-xs text-gray-600">{reward.claimedDate}</p>
                    </div>
                    <Badge variant={reward.status === 'used' ? 'secondary' : 'default'}>
                      {reward.status}
                    </Badge>
                  </div>
                ))}
                {claimedRewards.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No rewards claimed yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}