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

export default function CompleteApp() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // User data
  const [userCredits, setUserCredits] = useState(3500000); // In Indonesian Rupiah
  const [loyaltyPoints, setLoyaltyPoints] = useState(125);
  const [lifetimePoints, setLifetimePoints] = useState(235);
  const [referralEarnings, setReferralEarnings] = useState(80000);
  const [language, setLanguage] = useState("en");
  const [phoneNumber, setPhoneNumber] = useState("+62 812-3456-7890");
  const [profileImage, setProfileImage] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const referralCode = "RWG8H4K2";

  // Format currency
  const formatRupiah = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace(/\./g, ',');
  };

  // Service categories
  const serviceCategories = {
    beauty: {
      name: language === "id" ? "Layanan Kecantikan" : "Beauty Services",
      options: [
        { value: "hair_spa", label: "Hair Spa", cost: 200000 },
        { value: "facials", label: language === "id" ? "Perawatan Wajah" : "Facials", cost: 250000 },
        { value: "nails", label: language === "id" ? "Perawatan Kuku" : "Nail Service", cost: 150000 }
      ],
      startingPrice: "200,000"
    },
    entertainment: {
      name: language === "id" ? "Hiburan" : "Entertainment",
      options: [
        { value: "claw_machine", label: language === "id" ? "Mesin Cakar" : "Claw Machine", cost: 50000 },
        { value: "ktv_lounge_table", label: "KTV Lounge Table", cost: 350000 },
        { value: "ktv_lounge_sofa", label: "KTV Lounge Sofa", cost: 400000 },
        { value: "ktv_room_1", label: "KTV Room 1", cost: 500000 },
        { value: "ktv_room_2", label: "KTV Room 2", cost: 500000 },
        { value: "ktv_room_3", label: "KTV Room 3", cost: 500000 },
        { value: "ktv_room_4", label: "KTV Room 4", cost: 500000 },
        { value: "ktv_vip_1", label: "KTV VIP Room 1", cost: 800000 },
        { value: "ktv_vip_2", label: "KTV VIP Room 2", cost: 800000 }
      ],
      startingPrice: "350,000"
    },
    restaurant: {
      name: language === "id" ? "Kafe & Restoran" : "Cafe & Restaurant",
      options: [
        { value: "breakfast_indoor", label: language === "id" ? "Sarapan Indoor" : "Breakfast Indoor", cost: 150000 },
        { value: "breakfast_outdoor", label: language === "id" ? "Sarapan Outdoor" : "Breakfast Outdoor", cost: 180000 },
        { value: "lunch_indoor", label: language === "id" ? "Makan Siang Indoor" : "Lunch Indoor", cost: 200000 },
        { value: "lunch_outdoor", label: language === "id" ? "Makan Siang Outdoor" : "Lunch Outdoor", cost: 230000 },
        { value: "high_tea", label: "High Tea", cost: 120000 },
        { value: "dinner_indoor", label: language === "id" ? "Makan Malam Indoor" : "Dinner Indoor", cost: 300000 },
        { value: "dinner_outdoor", label: language === "id" ? "Makan Malam Outdoor" : "Dinner Outdoor", cost: 350000 }
      ],
      startingPrice: "150,000"
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

  const [editingAppointment, setEditingAppointment] = useState(null);

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

  // Marketplace items
  const [marketplace] = useState([
    { id: 1, name: "Teddy Bear Premium", rarity: "rare", price: 500000, image: "🧸", owned: false },
    { id: 2, name: "Lucky Cat", rarity: "common", price: 200000, image: "🐱", owned: true },
    { id: 3, name: "Dragon Plushie", rarity: "legendary", price: 1000000, image: "🐉", owned: false },
    { id: 4, name: "Cute Panda", rarity: "rare", price: 600000, image: "🐼", owned: false },
    { id: 5, name: "Rainbow Unicorn", rarity: "epic", price: 800000, image: "🦄", owned: false }
  ]);

  // User's toy inventory
  const [toyInventory] = useState([
    { id: 2, name: "Lucky Cat", rarity: "common", acquiredDate: "2025-05-15", qrCode: "LC001", image: "🐱" },
    { id: 6, name: "Cute Panda", rarity: "rare", acquiredDate: "2025-05-20", qrCode: "CP002", image: "🐼" },
    { id: 7, name: "Magic Bunny", rarity: "epic", acquiredDate: "2025-05-10", qrCode: "MB003", image: "🐰" }
  ]);

  // Point and redemption history
  const [pointHistory] = useState([
    { id: 1, date: "2025-05-25", description: language === "id" ? "Hair Spa - Pembelian" : "Hair Spa - Purchase", points: 20, type: "earned" },
    { id: 2, date: "2025-05-20", description: language === "id" ? "Rujukan Baru" : "New Referral", points: 15, type: "earned" },
    { id: 3, date: "2025-05-15", description: language === "id" ? "Tukar Lucky Cat" : "Redeemed Lucky Cat", points: -50, type: "redeemed" },
    { id: 4, date: "2025-05-10", description: language === "id" ? "KTV Room - Pembelian" : "KTV Room - Purchase", points: 50, type: "earned" }
  ]);

  const [redemptionHistory] = useState([
    { id: 1, date: "2025-05-15", reward: "Lucky Cat", pointsSpent: 50, status: "completed" },
    { id: 2, date: "2025-05-01", reward: language === "id" ? "Diskon 10%" : "10% Discount", pointsSpent: 25, status: "used" }
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

  // Available rewards
  const [rewards, setRewards] = useState([
    { id: 1, name: "RP 100,000 Service Credit", pointsCost: 100, category: "credit", claimed: false },
    { id: 2, name: "Free Basic Facial", pointsCost: 200, category: "beauty", claimed: false },
    { id: 3, name: "Priority Booking Pass", pointsCost: 150, category: "perk", claimed: false },
    { id: 4, name: "RP 250,000 Service Credit", pointsCost: 250, category: "credit", claimed: false },
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
      title: language === "id" ? "Disalin!" : "Copied!",
      description: language === "id" ? "Kode rujukan disalin" : "Referral code copied",
    });
  };

  const bookAppointment = () => {
    if (!newAppointment.category || !newAppointment.service || !newAppointment.date || !newAppointment.time) {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Harap isi semua field" : "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const selectedCategory = serviceCategories[newAppointment.category];
    const selectedService = selectedCategory.options.find(opt => opt.value === newAppointment.service);
    
    const appointment = {
      id: appointments.length + 1,
      service: selectedService.label,
      category: newAppointment.category,
      date: newAppointment.date,
      time: newAppointment.time,
      cost: selectedService.cost,
      status: "pending"
    };

    setAppointments([...appointments, appointment]);
    
    // Add loyalty points (1 point per 10,000 RP spent)
    const pointsEarned = Math.floor(selectedService.cost / 10000);
    setLoyaltyPoints(prev => prev + pointsEarned);
    setLifetimePoints(prev => prev + pointsEarned);

    toast({
      title: language === "id" ? "Berhasil!" : "Success!",
      description: language === "id" ? `Reservasi berhasil dibuat! Anda mendapat ${pointsEarned} poin` : `Appointment booked! You earned ${pointsEarned} points`,
    });

    setNewAppointment({ category: "", service: "", date: "", time: "" });
  };

  const rescheduleAppointment = (appointmentId, newDate, newTime) => {
    setAppointments(appointments.map(apt => 
      apt.id === appointmentId 
        ? { ...apt, date: newDate, time: newTime }
        : apt
    ));
    setEditingAppointment(null);
    toast({
      title: language === "id" ? "Berhasil!" : "Success!",
      description: language === "id" ? "Jadwal berhasil diubah" : "Appointment rescheduled successfully",
    });
  };

  const deleteAppointment = (appointmentId) => {
    setAppointments(appointments.filter(apt => apt.id !== appointmentId));
    toast({
      title: language === "id" ? "Berhasil!" : "Success!",
      description: language === "id" ? "Reservasi berhasil dihapus" : "Appointment deleted successfully",
    });
  };

  const topUpCredits = () => {
    setUserCredits(prev => prev + 1000000);
    toast({
      title: language === "id" ? "Berhasil!" : "Success!",
      description: language === "id" ? "RP 1,000,000 ditambahkan" : "RP 1,000,000 added",
    });
  };

  const earnBonusPoints = () => {
    const bonusPoints = 50;
    setLoyaltyPoints(prev => prev + bonusPoints);
    setLifetimePoints(prev => prev + bonusPoints);
    
    toast({
      title: language === "id" ? "Bonus Poin!" : "Bonus Points!",
      description: language === "id" ? `Anda mendapat ${bonusPoints} poin bonus!` : `You earned ${bonusPoints} bonus points!`,
    });
  };

  const redeemReward = (reward) => {
    if (loyaltyPoints < reward.pointsCost) {
      toast({
        title: language === "id" ? "Poin Tidak Cukup" : "Insufficient Points",
        description: language === "id" ? `Butuh ${reward.pointsCost - loyaltyPoints} poin lagi` : `You need ${reward.pointsCost - loyaltyPoints} more points`,
        variant: "destructive"
      });
      return;
    }

    setLoyaltyPoints(prev => prev - reward.pointsCost);
    setRewards(rewards.map(r => 
      r.id === reward.id ? { ...r, claimed: true } : r
    ));

    toast({
      title: language === "id" ? "Reward Ditukar!" : "Reward Claimed!",
      description: language === "id" ? `Berhasil menukar ${reward.name}` : `Successfully redeemed ${reward.name}`,
    });
  };

  const buyToy = (toy) => {
    if (userCredits < toy.price) {
      toast({
        title: language === "id" ? "Kredit Tidak Cukup" : "Insufficient Credits",
        description: language === "id" ? "Saldo tidak mencukupi" : "Not enough credits",
        variant: "destructive"
      });
      return;
    }

    setUserCredits(prev => prev - toy.price);
    
    // Add points for purchase
    const pointsEarned = Math.floor(toy.price / 10000);
    setLoyaltyPoints(prev => prev + pointsEarned);
    setLifetimePoints(prev => prev + pointsEarned);

    toast({
      title: language === "id" ? "Berhasil!" : "Success!",
      description: language === "id" ? `${toy.name} berhasil dibeli! +${pointsEarned} poin` : `${toy.name} purchased! +${pointsEarned} points`,
    });
  };

  const saveProfile = () => {
    setEditingProfile(false);
    toast({
      title: language === "id" ? "Berhasil!" : "Success!",
      description: language === "id" ? "Profil berhasil diperbarui" : "Profile updated successfully",
    });
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLanguage(language === "en" ? "id" : "en")}
              >
                <Globe className="w-4 h-4 mr-2" />
                {language === "en" ? "ID" : "EN"}
              </Button>
              <span className="text-sm text-gray-600">
                {language === "id" ? "Halo" : "Welcome"}, {user?.firstName || 'Candy'}!
              </span>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/api/logout'}>
                <LogOut className="w-4 h-4 mr-2" />
                {language === "id" ? "Keluar" : "Logout"}
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
              <h2 className="text-3xl font-bold mb-2">
                {language === "id" ? "Selamat datang kembali" : "Welcome back"}, {user?.firstName || 'Candy'}!
              </h2>
              <p className="text-blue-100">
                Level {currentLevelInfo.level} • {loyaltyPoints} {language === "id" ? "poin" : "points"} • RP {formatRupiah(userCredits)}
              </p>
            </div>

            {/* Events and Ads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {events.map((event) => (
                <Card key={event.id} className="bg-gradient-to-r from-green-500 to-blue-500 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="text-4xl">{event.image}</div>
                      <div>
                        <h3 className="text-xl font-bold">{event.title}</h3>
                        <p className="text-green-100">{event.description}</p>
                        <p className="text-sm text-green-200 mt-2">
                          {language === "id" ? "Berlaku hingga" : "Valid until"}: {event.validUntil}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6 text-center">
                  <DollarSign className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <p className="text-sm text-green-600 font-medium">
                    {language === "id" ? "Kredit" : "Credits"}
                  </p>
                  <p className="text-2xl font-bold text-green-800">RP {formatRupiah(userCredits)}</p>
                  <Button size="sm" onClick={topUpCredits} className="mt-2 bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-1" />
                    +RP 1,000,000
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-6 text-center">
                  <Gift className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                  <p className="text-sm text-purple-600 font-medium">
                    {language === "id" ? "Poin Loyalitas" : "Loyalty Points"}
                  </p>
                  <p className="text-2xl font-bold text-purple-800">{loyaltyPoints}</p>
                  <Button size="sm" onClick={() => setActiveTab("loyalty")} className="mt-2 bg-purple-600 hover:bg-purple-700">
                    <Star className="w-4 h-4 mr-1" />
                    {language === "id" ? "Lihat Reward" : "View Rewards"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                  <p className="text-sm text-blue-600 font-medium">
                    {language === "id" ? "Rujukan" : "Referrals"}
                  </p>
                  <p className="text-2xl font-bold text-blue-800">1</p>
                </CardContent>
              </Card>

              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-6 text-center">
                  <DollarSign className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
                  <p className="text-sm text-yellow-600 font-medium">
                    {language === "id" ? "Pendapatan" : "Earnings"}
                  </p>
                  <p className="text-2xl font-bold text-yellow-800">RP {formatRupiah(referralEarnings)}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Quick Booking */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>{language === "id" ? "Reservasi Cepat" : "Quick Booking"}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Select onValueChange={(value) => setNewAppointment({...newAppointment, category: value, service: ""})}>
                      <SelectTrigger>
                        <SelectValue placeholder={language === "id" ? "Pilih Kategori" : "Select Category"} />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(serviceCategories).map(([key, category]) => (
                          <SelectItem key={key} value={key}>{category.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {newAppointment.category && (
                      <Select onValueChange={(value) => setNewAppointment({...newAppointment, service: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder={language === "id" ? "Pilih Layanan" : "Select Service"} />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceCategories[newAppointment.category].options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label} - RP {formatRupiah(option.cost)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <Input
                      type="date"
                      value={newAppointment.date}
                      onChange={(e) => setNewAppointment({...newAppointment, date: e.target.value})}
                    />

                    <Input
                      type="time"
                      value={newAppointment.time}
                      onChange={(e) => setNewAppointment({...newAppointment, time: e.target.value})}
                    />

                    <Button onClick={bookAppointment} className="w-full">
                      <Calendar className="w-4 h-4 mr-2" />
                      {language === "id" ? "Buat Reservasi" : "Book Appointment"}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Referral Section */}
              <div>
                <Card className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white">
                  <CardHeader>
                    <CardTitle className="text-white">
                      {language === "id" ? "Kode Rujukan Anda" : "Your Referral Code"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-white/20 rounded-lg p-4 mb-4 text-center">
                      <p className="text-3xl font-bold font-mono mb-2">{referralCode}</p>
                      <p className="text-emerald-100 text-sm">
                        {language === "id" ? "Bagikan untuk dapat komisi 10%" : "Share to earn 10% commission"}
                      </p>
                    </div>
                    <Button 
                      onClick={copyReferralCode}
                      className="w-full bg-white/20 hover:bg-white/30 text-white mb-4"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      {language === "id" ? "Salin Kode" : "Copy Code"}
                    </Button>
                    <div className="text-center">
                      <QrCode className="w-16 h-16 mx-auto text-white/80 mb-2" />
                      <p className="text-xs text-white/80">
                        {language === "id" ? "Pindai QR Code" : "Scan QR Code"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Continue with other tabs... */}
        {/* Due to length constraints, I'll implement the remaining tabs in the next part */}

      </div>
    </div>
  );
}