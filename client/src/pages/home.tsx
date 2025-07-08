import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, DollarSign, Calendar, Gift, Copy, Plus, Star, 
  Crown, Trophy, Award, Medal, Zap, Home, User, LogOut,
  QrCode, Globe, Phone, Camera, Trash2, Edit3, ShoppingBag, Package
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function HomePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // User data
  const [userCredits, setUserCredits] = useState(3500000); // In Indonesian Rupiah
  const [loyaltyPoints, setLoyaltyPoints] = useState(125);
  const [lifetimePoints, setLifetimePoints] = useState(235);
  const [referralEarnings, setReferralEarnings] = useState(80000); // In Indonesian Rupiah
  const [language, setLanguage] = useState("en"); // "en" or "id"
  const [phoneNumber, setPhoneNumber] = useState("+62 812-3456-7890");
  const [profileImage, setProfileImage] = useState(null);
  const referralCode = "RWG8H4K2";

  // Format currency to Indonesian Rupiah
  const formatRupiah = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Loyalty point history
  const [pointHistory] = useState([
    { id: 1, date: "2025-05-25", description: language === "id" ? "Hair Spa - Penjualan" : "Hair Spa - Purchase", points: 20, type: "earned" },
    { id: 2, date: "2025-05-20", description: language === "id" ? "Rujukan Baru" : "New Referral", points: 15, type: "earned" },
    { id: 3, date: "2025-05-15", description: language === "id" ? "Tukar Lucky Cat" : "Redeemed Lucky Cat", points: -50, type: "redeemed" },
    { id: 4, date: "2025-05-10", description: language === "id" ? "KTV Room - Penjualan" : "KTV Room - Purchase", points: 50, type: "earned" }
  ]);

  // Reward redemption history
  const [redemptionHistory] = useState([
    { id: 1, date: "2025-05-15", reward: "Lucky Cat", pointsSpent: 50, status: "completed" },
    { id: 2, date: "2025-05-01", reward: language === "id" ? "Diskon 10%" : "10% Discount", pointsSpent: 25, status: "used" }
  ]);

  // Service categories and options
  const serviceCategories = {
    beauty: {
      name: language === "id" ? "Layanan Kecantikan" : "Beauty Services",
      options: [
        { value: "hair_spa", label: language === "id" ? "Hair Spa" : "Hair Spa", cost: 200000 },
        { value: "facials", label: language === "id" ? "Perawatan Wajah" : "Facials", cost: 250000 },
        { value: "nails", label: language === "id" ? "Perawatan Kuku" : "Nail Service", cost: 150000 }
      ]
    },
    entertainment: {
      name: language === "id" ? "Hiburan" : "Entertainment",
      options: [
        { value: "claw_machine", label: language === "id" ? "Mesin Cakar" : "Claw Machine", cost: 50000 },
        { value: "ktv_lounge_table", label: language === "id" ? "KTV Lounge Meja" : "KTV Lounge Table", cost: 350000 },
        { value: "ktv_lounge_sofa", label: language === "id" ? "KTV Lounge Sofa" : "KTV Lounge Sofa", cost: 400000 },
        { value: "ktv_room_1", label: "KTV Room 1", cost: 500000 },
        { value: "ktv_room_2", label: "KTV Room 2", cost: 500000 },
        { value: "ktv_room_3", label: "KTV Room 3", cost: 500000 },
        { value: "ktv_room_4", label: "KTV Room 4", cost: 500000 },
        { value: "ktv_vip_1", label: "KTV VIP Room 1", cost: 800000 },
        { value: "ktv_vip_2", label: "KTV VIP Room 2", cost: 800000 }
      ]
    },
    restaurant: {
      name: language === "id" ? "Kafe & Restoran" : "Cafe & Restaurant",
      options: [
        { value: "breakfast_indoor", label: language === "id" ? "Sarapan Indoor" : "Breakfast Indoor", cost: 150000 },
        { value: "breakfast_outdoor", label: language === "id" ? "Sarapan Outdoor" : "Breakfast Outdoor", cost: 180000 },
        { value: "lunch_indoor", label: language === "id" ? "Makan Siang Indoor" : "Lunch Indoor", cost: 200000 },
        { value: "lunch_outdoor", label: language === "id" ? "Makan Siang Outdoor" : "Lunch Outdoor", cost: 230000 },
        { value: "high_tea", label: language === "id" ? "High Tea" : "High Tea", cost: 120000 },
        { value: "dinner_indoor", label: language === "id" ? "Makan Malam Indoor" : "Dinner Indoor", cost: 300000 },
        { value: "dinner_outdoor", label: language === "id" ? "Makan Malam Outdoor" : "Dinner Outdoor", cost: 350000 }
      ]
    }
  };

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

  // Events and Ads
  const [events] = useState([
    {
      id: 1,
      title: language === "id" ? "Promo Akhir Tahun" : "Year End Promotion",
      description: language === "id" ? "Diskon 30% untuk semua layanan kecantikan" : "30% discount on all beauty services",
      validUntil: "2025-12-31",
      image: "🎉"
    },
    {
      id: 2,
      title: language === "id" ? "Grand Opening KTV VIP" : "KTV VIP Grand Opening",
      description: language === "id" ? "Ruang VIP baru dengan sistem audio terbaru" : "New VIP rooms with latest audio system",
      validUntil: "2025-06-30",
      image: "🎤"
    }
  ]);

  // Marketplace items (toys)
  const [marketplace] = useState([
    { id: 1, name: "Teddy Bear Premium", rarity: "rare", price: 500000, image: "🧸", owned: false },
    { id: 2, name: "Lucky Cat", rarity: "common", price: 200000, image: "🐱", owned: true },
    { id: 3, name: "Dragon Plushie", rarity: "legendary", price: 1000000, image: "🐉", owned: false }
  ]);

  // User's toy inventory
  const [toyInventory] = useState([
    { id: 2, name: "Lucky Cat", rarity: "common", acquiredDate: "2025-05-15", qrCode: "LC001" },
    { id: 4, name: "Cute Panda", rarity: "rare", acquiredDate: "2025-05-20", qrCode: "CP002" }
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
      benefits: ["5% bonus points", "Birthday discount 10%", "Free shipping"]
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

  // Rewards
  const [rewards, setRewards] = useState([
    { id: 1, name: "$10 Service Credit", pointsCost: 100, category: "credit", claimed: false },
    { id: 2, name: "Free Basic Facial", pointsCost: 200, category: "beauty", claimed: false },
    { id: 3, name: "Priority Booking Pass", pointsCost: 150, category: "perk", claimed: false },
    { id: 4, name: "$25 Service Credit", pointsCost: 250, category: "credit", claimed: false },
    { id: 5, name: "Free Gaming Session", pointsCost: 180, category: "entertainment", claimed: false },
    { id: 6, name: "Spa Upgrade", pointsCost: 300, category: "beauty", claimed: false }
  ]);

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
    navigator.clipboard.writeText(referralCode);
    toast({
      title: "Copied!",
      description: "Referral code copied to clipboard",
    });
  };

  const bookAppointment = () => {
    if (!newAppointment.service || !newAppointment.date || !newAppointment.cost) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const appointment = {
      id: appointments.length + 1,
      service: newAppointment.service,
      date: newAppointment.date,
      cost: Number(newAppointment.cost),
      status: "pending"
    };

    setAppointments([...appointments, appointment]);
    setUserCredits(prev => prev - appointment.cost);
    setLoyaltyPoints(prev => prev + Math.floor(appointment.cost * 0.1));
    setLifetimePoints(prev => prev + Math.floor(appointment.cost * 0.1));

    toast({
      title: "Success!",
      description: "Appointment booked successfully",
    });

    setNewAppointment({ service: "", date: "", cost: 0 });
  };

  const topUpCredits = () => {
    setUserCredits(prev => prev + 100);
    toast({
      title: "Success!",
      description: "$100 added to your account",
    });
  };

  const earnBonusPoints = () => {
    const bonusPoints = 50;
    setLoyaltyPoints(prev => prev + bonusPoints);
    setLifetimePoints(prev => prev + bonusPoints);
    
    toast({
      title: "Bonus Points Earned!",
      description: `You earned ${bonusPoints} bonus points!`,
    });
  };

  const redeemReward = (reward) => {
    if (loyaltyPoints < reward.pointsCost) {
      toast({
        title: "Insufficient Points",
        description: `You need ${reward.pointsCost - loyaltyPoints} more points.`,
        variant: "destructive"
      });
      return;
    }

    setLoyaltyPoints(prev => prev - reward.pointsCost);
    setRewards(rewards.map(r => 
      r.id === reward.id ? { ...r, claimed: true } : r
    ));

    toast({
      title: "Reward Claimed!",
      description: `You've redeemed ${reward.name}`,
    });
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

  const getCategoryColor = (category) => {
    switch (category) {
      case 'credit': return 'bg-green-100 text-green-800';
      case 'beauty': return 'bg-pink-100 text-pink-800';
      case 'entertainment': return 'bg-blue-100 text-blue-800';
      case 'perk': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-blue-600">Reborn Wave Group</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.firstName || 'Candy'}!
              </span>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/api/logout'}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { id: "dashboard", label: language === "id" ? "Beranda" : "Dashboard", icon: Home },
              { id: "loyalty", label: language === "id" ? "Program Loyalitas" : "Loyalty Program", icon: Star },
              { id: "bookings", label: language === "id" ? "Reservasi" : "Bookings", icon: Calendar },
              { id: "marketplace", label: language === "id" ? "Pasar" : "Marketplace", icon: ShoppingBag },
              { id: "inventory", label: language === "id" ? "Koleksi Saya" : "My Toys", icon: Package },
              { id: "referrals", label: language === "id" ? "Rujukan" : "Referrals", icon: Users },
              { id: "profile", label: language === "id" ? "Profil" : "Profile", icon: User }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
              <h2 className="text-3xl font-bold mb-2">Welcome back, {user?.firstName || 'Candy'}!</h2>
              <p className="text-blue-100">Level {currentLevelInfo.level} • {loyaltyPoints} points • ${userCredits.toFixed(2)} credits</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6 text-center">
                  <DollarSign className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <p className="text-sm text-green-600 font-medium">Credits</p>
                  <p className="text-2xl font-bold text-green-800">${userCredits.toFixed(2)}</p>
                  <Button size="sm" onClick={topUpCredits} className="mt-2 bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-1" />
                    Add $100
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-6 text-center">
                  <Gift className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                  <p className="text-sm text-purple-600 font-medium">Loyalty Points</p>
                  <p className="text-2xl font-bold text-purple-800">{loyaltyPoints}</p>
                  <Button size="sm" onClick={() => setActiveTab("loyalty")} className="mt-2 bg-purple-600 hover:bg-purple-700">
                    <Star className="w-4 h-4 mr-1" />
                    View Rewards
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                  <p className="text-sm text-blue-600 font-medium">Referrals</p>
                  <p className="text-2xl font-bold text-blue-800">1</p>
                </CardContent>
              </Card>

              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-6 text-center">
                  <DollarSign className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
                  <p className="text-sm text-yellow-600 font-medium">Earnings</p>
                  <p className="text-2xl font-bold text-yellow-800">${referralEarnings.toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Appointments */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Appointments</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {appointments.map((apt) => (
                      <div key={apt.id} className="flex justify-between items-center p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{apt.service}</p>
                          <p className="text-sm text-gray-600">{apt.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${apt.cost}</p>
                          <Badge variant={apt.status === 'confirmed' ? 'default' : 'secondary'}>
                            {apt.status}
                          </Badge>
                        </div>
                      </div>
                    ))}

                    {/* Book New Appointment */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 space-y-4">
                      <h3 className="font-medium">Book New Appointment</h3>
                      <Input
                        placeholder="Service (e.g., Beauty Treatment)"
                        value={newAppointment.service}
                        onChange={(e) => setNewAppointment({...newAppointment, service: e.target.value})}
                      />
                      <Input
                        type="date"
                        value={newAppointment.date}
                        onChange={(e) => setNewAppointment({...newAppointment, date: e.target.value})}
                      />
                      <Input
                        type="number"
                        placeholder="Cost ($)"
                        value={newAppointment.cost || ''}
                        onChange={(e) => setNewAppointment({...newAppointment, cost: Number(e.target.value)})}
                      />
                      <Button onClick={bookAppointment} className="w-full">
                        <Calendar className="w-4 h-4 mr-2" />
                        Book Appointment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Referral Section */}
              <div>
                <Card className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white">
                  <CardHeader>
                    <CardTitle className="text-white">Your Referral Code</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-white/20 rounded-lg p-4 mb-4 text-center">
                      <p className="text-2xl font-bold font-mono">{referralCode}</p>
                      <p className="text-emerald-100 text-sm mt-1">Share to earn 10% commission</p>
                    </div>
                    <Button 
                      onClick={copyReferralCode}
                      className="w-full bg-white/20 hover:bg-white/30 text-white"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Code
                    </Button>
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
              <h2 className="text-4xl font-bold text-slate-900 mb-2">Loyalty Program</h2>
              <p className="text-slate-600">Earn points, unlock levels, and claim amazing rewards</p>
            </div>

            {/* Current Status */}
            <Card className={`${currentLevelInfo.bgColor} border-2`}>
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className={`w-16 h-16 bg-gradient-to-br ${currentLevelInfo.color} rounded-full flex items-center justify-center`}>
                      <currentLevelInfo.icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">{currentLevelInfo.name}</h3>
                      <p className="text-slate-600">Level {currentLevelInfo.level}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-slate-900">{loyaltyPoints}</p>
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
                      Earn 50 Points
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
                                <h4 className="font-semibold text-slate-900">{reward.name}</h4>
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
                              disabled={loyaltyPoints < reward.pointsCost}
                              className={loyaltyPoints >= reward.pointsCost ? 
                                "bg-blue-600 hover:bg-blue-700" : 
                                "bg-gray-300 cursor-not-allowed"
                              }
                            >
                              {loyaltyPoints >= reward.pointsCost ? "Redeem" : "Need more points"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Level Benefits */}
              <div>
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
                <Card className="mt-6">
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
                            `${level.bgColor} border-2` : 
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
              </div>
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === "bookings" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Appointment Bookings</h2>
                <p className="text-slate-600">Manage your beauty, spa, and entertainment bookings</p>
              </div>
              <Button onClick={() => setActiveTab("dashboard")} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Book New Appointment
              </Button>
            </div>

            {/* Service Categories */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-pink-50 border-pink-200 hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-3">💄</div>
                  <h3 className="text-lg font-semibold text-pink-800 mb-2">Beauty Services</h3>
                  <p className="text-sm text-pink-600 mb-4">Facials, makeup, skincare treatments</p>
                  <Badge className="bg-pink-100 text-pink-800">Starting from $50</Badge>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200 hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-3">🎮</div>
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">Entertainment</h3>
                  <p className="text-sm text-blue-600 mb-4">Gaming, VR experiences, events</p>
                  <Badge className="bg-blue-100 text-blue-800">Starting from $30</Badge>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200 hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-3">🧘</div>
                  <h3 className="text-lg font-semibold text-green-800 mb-2">Wellness & Spa</h3>
                  <p className="text-sm text-green-600 mb-4">Massage, meditation, wellness</p>
                  <Badge className="bg-green-100 text-green-800">Starting from $80</Badge>
                </CardContent>
              </Card>
            </div>

            {/* Current Appointments */}
            <Card>
              <CardHeader>
                <CardTitle>Your Appointments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appointments.map((apt) => (
                    <div key={apt.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">{apt.service}</h4>
                          <p className="text-sm text-slate-600">{apt.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-bold text-slate-900">${apt.cost}</p>
                          <Badge variant={apt.status === 'confirmed' ? 'default' : 'secondary'}>
                            {apt.status}
                          </Badge>
                        </div>
                        <Button size="sm" variant="outline">
                          Reschedule
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gray-50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
                  <p className="text-sm text-gray-600">Total Bookings</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-900">
                    {appointments.filter(a => a.status === 'confirmed').length}
                  </p>
                  <p className="text-sm text-green-600">Confirmed</p>
                </CardContent>
              </Card>
              <Card className="bg-yellow-50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-900">
                    {appointments.filter(a => a.status === 'pending').length}
                  </p>
                  <p className="text-sm text-yellow-600">Pending</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-blue-900">
                    ${appointments.reduce((sum, apt) => sum + apt.cost, 0)}
                  </p>
                  <p className="text-sm text-blue-600">Total Spent</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Referrals Tab */}
        {activeTab === "referrals" && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Referral Program</h2>
              <p className="text-slate-600">Invite friends and earn amazing commissions</p>
            </div>

            {/* Referral Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <p className="text-2xl font-bold text-green-800">1</p>
                  <p className="text-sm text-green-600">Direct Referrals</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-6 text-center">
                  <DollarSign className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                  <p className="text-2xl font-bold text-blue-800">${referralEarnings.toFixed(2)}</p>
                  <p className="text-sm text-blue-600">Total Earnings</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-6 text-center">
                  <Trophy className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                  <p className="text-2xl font-bold text-purple-800">Level 1</p>
                  <p className="text-sm text-purple-600">Referrer Level</p>
                </CardContent>
              </Card>
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-6 text-center">
                  <Gift className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
                  <p className="text-2xl font-bold text-yellow-800">10%</p>
                  <p className="text-sm text-yellow-600">Commission Rate</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Your Referral Code */}
              <Card className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                <CardHeader>
                  <CardTitle className="text-white">Share Your Referral Code</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-white/20 rounded-lg p-4 mb-4 text-center">
                    <p className="text-3xl font-bold font-mono mb-2">{referralCode}</p>
                    <p className="text-blue-100">Share this code to earn 10% commission</p>
                  </div>
                  <Button 
                    onClick={copyReferralCode}
                    className="w-full bg-white/20 hover:bg-white/30 text-white mb-4"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Referral Code
                  </Button>
                  <div className="space-y-2 text-sm text-blue-100">
                    <p>• Get 10% from direct referrals (Level 1)</p>
                    <p>• Get 3% from their referrals (Level 2)</p>
                    <p>• Get 2% from Level 3 referrals</p>
                  </div>
                </CardContent>
              </Card>

              {/* Commission Structure */}
              <Card>
                <CardHeader>
                  <CardTitle>Commission Structure</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                      <span className="font-medium">Direct Referrals</span>
                    </div>
                    <span className="font-bold text-green-600 text-xl">10%</span>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-slate-600">
                      Earn 10% commission on all verified purchases made by people you refer
                    </p>
                  </div>
                  
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-2">Your Referral Tree</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Sarah Chen (Level 1)</span>
                        <span className="text-green-600 font-medium">+$8.00</span>
                      </div>
                      <div className="text-xs text-gray-500 ml-4">
                        → No Level 2 referrals yet
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Your Profile</h2>
              <p className="text-slate-600">Manage your account settings and preferences</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Profile Overview */}
              <Card className="lg:col-span-1">
                <CardContent className="p-8 text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">
                      {(user?.firstName || 'C')[0].toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">
                    {user?.firstName || 'Candy'} {user?.lastName || 'Heng'}
                  </h3>
                  <p className="text-slate-600 mb-4">{user?.email || 'candy@example.com'}</p>
                  <Badge className="bg-blue-100 text-blue-800 mb-4">
                    {currentLevelInfo.name}
                  </Badge>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Member Since:</span>
                      <span className="font-medium">May 2025</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Points:</span>
                      <span className="font-medium">{lifetimePoints}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Current Level:</span>
                      <span className="font-medium">Level {currentLevelInfo.level}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Settings */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-4">Personal Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
                        <Input value={user?.firstName || 'Candy'} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Last Name</label>
                        <Input value={user?.lastName || 'Heng'} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                        <Input value={user?.email || 'candy@example.com'} type="email" />
                      </div>
                    </div>
                  </div>

                  {/* Preferences */}
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-4">Preferences</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Email Notifications</p>
                          <p className="text-sm text-slate-600">Receive updates about appointments and promotions</p>
                        </div>
                        <Button variant="outline" size="sm">Manage</Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Marketing Communications</p>
                          <p className="text-sm text-slate-600">Promotional offers and special deals</p>
                        </div>
                        <Button variant="outline" size="sm">Manage</Button>
                      </div>
                    </div>
                  </div>

                  {/* Account Actions */}
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-4">Account Actions</h4>
                    <div className="space-y-3">
                      <Button className="w-full bg-blue-600 hover:bg-blue-700">
                        Update Profile
                      </Button>
                      <Button variant="outline" className="w-full">
                        Change Password
                      </Button>
                      <Button variant="outline" className="w-full">
                        Download Account Data
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Account Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Account Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">${userCredits.toFixed(2)}</p>
                    <p className="text-sm text-slate-600">Current Credits</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{loyaltyPoints}</p>
                    <p className="text-sm text-slate-600">Loyalty Points</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{appointments.length}</p>
                    <p className="text-sm text-slate-600">Total Bookings</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">${referralEarnings.toFixed(2)}</p>
                    <p className="text-sm text-slate-600">Referral Earnings</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}