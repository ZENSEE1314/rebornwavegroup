import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, DollarSign, Gift, Users, Star, Clock, 
  Globe, LogOut, Plus, QrCode, Zap, ShoppingCart,
  User, Phone, Camera, Trash2, Edit3
} from "lucide-react";

export default function CompleteWorkingApp() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [userCredits, setUserCredits] = useState(3500000);
  const [loyaltyPoints, setLoyaltyPoints] = useState(125);
  const [language, setLanguage] = useState("en");
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [newToyCode, setNewToyCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("+62 812-3456-7890");
  const [editingProfile, setEditingProfile] = useState(false);
  const referralCode = "RWG8H4K2";

  // Data states
  const [appointments, setAppointments] = useState([
    { id: 1, service: "Hair Spa Premium", category: "beauty", date: "2025-05-27", time: "14:00", cost: 200000, status: "pending" },
    { id: 2, service: "KTV Room Deluxe", category: "entertainment", date: "2025-05-28", time: "19:30", cost: 500000, status: "confirmed" }
  ]);

  const [newAppointment, setNewAppointment] = useState({ category: "", service: "", date: "", time: "" });

  const [toyCollection, setToyCollection] = useState([
    { id: 1, name: "Lucky Cat", rarity: "legendary", acquiredDate: "2025-05-15", qrCode: "LC001", image: "🐱" },
    { id: 2, name: "Golden Bear", rarity: "epic", acquiredDate: "2025-05-18", qrCode: "GB002", image: "🧸" },
    { id: 3, name: "Magic Bunny", rarity: "rare", acquiredDate: "2025-05-20", qrCode: "MB003", image: "🐰" }
  ]);

  const [pointHistory, setPointHistory] = useState([
    { id: 1, date: "2025-05-25", description: "Hair Spa Purchase", points: 20, type: "earned" },
    { id: 2, date: "2025-05-20", description: "New Referral", points: 15, type: "earned" },
    { id: 3, date: "2025-05-15", description: "Redeemed Lucky Cat", points: -50, type: "redeemed" }
  ]);

  const [userListings, setUserListings] = useState([
    { id: 1, title: "Rare Teddy Bear", description: "Limited edition", price: 750000, status: "active", createdDate: "2025-05-20" }
  ]);

  const [salesHistory, setSalesHistory] = useState([
    { id: 1, item: "Lucky Cat", buyer: "Sarah Chen", amount: 300000, date: "2025-05-18", status: "completed" }
  ]);

  // Service categories
  const serviceCategories = {
    beauty: {
      name: "Beauty Services",
      options: [
        { value: "hair_spa", label: "Hair Spa Premium", cost: 200000 },
        { value: "facial", label: "Facial Treatment", cost: 150000 },
        { value: "massage", label: "Body Massage", cost: 180000 }
      ]
    },
    entertainment: {
      name: "Entertainment",
      options: [
        { value: "ktv_deluxe", label: "KTV Room Deluxe", cost: 500000 },
        { value: "ktv_vip", label: "KTV Room VIP", cost: 800000 },
        { value: "game_zone", label: "Game Zone", cost: 100000 }
      ]
    },
    restaurant: {
      name: "Dining",
      options: [
        { value: "fine_dining", label: "Fine Dining Experience", cost: 400000 },
        { value: "buffet", label: "Premium Buffet", cost: 250000 },
        { value: "private_room", label: "Private Dining Room", cost: 600000 }
      ]
    }
  };

  const rewards = [
    { id: 1, name: "10% Discount Voucher", pointsCost: 25, category: "discount" },
    { id: 2, name: "Lucky Cat Toy", pointsCost: 50, category: "toy" },
    { id: 3, name: "Free Hair Spa", pointsCost: 100, category: "service" },
    { id: 4, name: "VIP KTV Access", pointsCost: 150, category: "premium" }
  ];

  // Utility functions
  const formatRupiah = (amount) => {
    return new Intl.NumberFormat('id-ID').format(amount);
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast({
      title: language === "id" ? "Berhasil!" : "Success!",
      description: language === "id" ? "Kode rujukan disalin" : "Referral code copied",
    });
  };

  const processPayment = (amount) => {
    setUserCredits(prev => prev + parseInt(amount));
    setShowTopUpModal(false);
    setTopUpAmount("");
    toast({
      title: language === "id" ? "Berhasil!" : "Success!",
      description: language === "id" ? `RP ${formatRupiah(amount)} berhasil ditambahkan` : `RP ${formatRupiah(amount)} added successfully`,
    });
  };

  const bookAppointment = () => {
    if (!newAppointment.category || !newAppointment.service || !newAppointment.date || !newAppointment.time) {
      toast({
        title: "Error",
        description: language === "id" ? "Harap isi semua field" : "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    // Check 2-hour booking window
    const now = new Date();
    const appointmentTime = new Date(`${newAppointment.date}T${newAppointment.time}`);
    const hoursDiff = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDiff > 2) {
      toast({
        title: "Error",
        description: language === "id" ? "Reservasi harus dibuat dalam 2 jam ke depan" : "Booking must be within 2 hours",
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

    toast({
      title: language === "id" ? "Berhasil!" : "Success!",
      description: language === "id" ? "Reservasi berhasil dibuat! Menunggu persetujuan admin" : "Appointment booked! Waiting for admin approval",
    });

    setNewAppointment({ category: "", service: "", date: "", time: "" });
  };

  const addToyByCode = () => {
    if (!newToyCode) {
      toast({
        title: "Error",
        description: language === "id" ? "Masukkan kode mainan" : "Enter toy code",
        variant: "destructive"
      });
      return;
    }

    const newToy = {
      id: toyCollection.length + 10,
      name: "Special Edition Bear",
      rarity: "rare",
      acquiredDate: new Date().toISOString().split('T')[0],
      qrCode: newToyCode,
      image: "🧸"
    };

    setToyCollection([...toyCollection, newToy]);
    setNewToyCode("");
    
    toast({
      title: language === "id" ? "Berhasil!" : "Success!",
      description: language === "id" ? "Mainan berhasil ditambahkan ke koleksi" : "Toy added to collection",
    });
  };

  const redeemReward = (reward) => {
    if (loyaltyPoints < reward.pointsCost) {
      toast({
        title: language === "id" ? "Poin Tidak Cukup" : "Insufficient Points",
        description: language === "id" ? "Anda membutuhkan lebih banyak poin" : "You need more points",
        variant: "destructive"
      });
      return;
    }

    setLoyaltyPoints(prev => prev - reward.pointsCost);
    
    // Add to point history
    const newEntry = {
      id: pointHistory.length + 1,
      date: new Date().toISOString().split('T')[0],
      description: `${language === "id" ? "Tukar" : "Redeemed"} ${reward.name}`,
      points: -reward.pointsCost,
      type: "redeemed"
    };
    setPointHistory([newEntry, ...pointHistory]);
    
    toast({
      title: language === "id" ? "Berhasil!" : "Success!",
      description: language === "id" ? `${reward.name} berhasil ditukar` : `${reward.name} redeemed successfully`,
    });
  };

  const getRarityColor = (rarity) => {
    switch(rarity) {
      case "legendary": return "bg-gradient-to-r from-yellow-400 to-orange-500";
      case "epic": return "bg-gradient-to-r from-purple-500 to-pink-500";
      case "rare": return "bg-gradient-to-r from-blue-500 to-cyan-500";
      default: return "bg-gradient-to-r from-gray-400 to-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-6">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Kings Of Singers (KOS)
              </h1>
              
              <div className="flex space-x-2">
                <Button variant={activeTab === "dashboard" ? "default" : "outline"} onClick={() => setActiveTab("dashboard")}>
                  {language === "id" ? "Dasbor" : "Dashboard"}
                </Button>
                <Button variant={activeTab === "loyalty" ? "default" : "outline"} onClick={() => setActiveTab("loyalty")}>
                  {language === "id" ? "Loyalitas" : "Loyalty"}
                </Button>
                <Button variant={activeTab === "bookings" ? "default" : "outline"} onClick={() => setActiveTab("bookings")}>
                  {language === "id" ? "Reservasi" : "Bookings"}
                </Button>
                <Button variant={activeTab === "marketplace" ? "default" : "outline"} onClick={() => setActiveTab("marketplace")}>
                  {language === "id" ? "Pasar" : "Marketplace"}
                </Button>
                <Button variant={activeTab === "collections" ? "default" : "outline"} onClick={() => setActiveTab("collections")}>
                  {language === "id" ? "Koleksi" : "Collections"}
                </Button>
                <Button variant={activeTab === "referrals" ? "default" : "outline"} onClick={() => setActiveTab("referrals")}>
                  {language === "id" ? "Rujukan" : "Referrals"}
                </Button>
                <Button variant={activeTab === "profile" ? "default" : "outline"} onClick={() => setActiveTab("profile")}>
                  {language === "id" ? "Profil" : "Profile"}
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => setLanguage(language === "en" ? "id" : "en")}>
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

      {/* Top-up Payment Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-bold mb-4">{language === "id" ? "Top Up Kredit" : "Top Up Credits"}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
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
                placeholder={language === "id" ? "Jumlah custom" : "Custom amount"}
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
                {language === "id" ? "Batal" : "Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6 text-center">
                  <DollarSign className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <p className="text-sm text-green-600 font-medium">{language === "id" ? "Kredit" : "Credits"}</p>
                  <p className="text-lg font-bold text-green-800">{formatRupiah(userCredits)}</p>
                  <Button size="sm" onClick={() => setShowTopUpModal(true)} className="mt-2 bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-1" />
                    {language === "id" ? "Top Up" : "Top Up"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-6 text-center">
                  <Gift className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                  <p className="text-sm text-purple-600 font-medium">{language === "id" ? "Poin Loyalitas" : "Loyalty Points"}</p>
                  <p className="text-2xl font-bold text-purple-800">{loyaltyPoints}</p>
                  <Button size="sm" onClick={() => setActiveTab("loyalty")} className="mt-2 bg-purple-600 hover:bg-purple-700">
                    <Gift className="w-4 h-4 mr-1" />
                    {language === "id" ? "Lihat" : "View"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-6 text-center">
                  <Calendar className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                  <p className="text-sm text-blue-600 font-medium">{language === "id" ? "Reservasi" : "Appointments"}</p>
                  <p className="text-2xl font-bold text-blue-800">{appointments.length}</p>
                  <Button size="sm" onClick={() => setActiveTab("bookings")} className="mt-2 bg-blue-600 hover:bg-blue-700">
                    <Calendar className="w-4 h-4 mr-1" />
                    {language === "id" ? "Buat" : "Book"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 mx-auto text-orange-600 mb-2" />
                  <p className="text-sm text-orange-600 font-medium">{language === "id" ? "Rujukan" : "Referrals"}</p>
                  <p className="text-2xl font-bold text-orange-800">3</p>
                  <Button size="sm" onClick={() => setActiveTab("referrals")} className="mt-2 bg-orange-600 hover:bg-orange-700">
                    <Users className="w-4 h-4 mr-1" />
                    {language === "id" ? "Lihat" : "View"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Quick Booking */}
            <Card>
              <CardHeader>
                <CardTitle>{language === "id" ? "Buat Reservasi Cepat" : "Quick Booking"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Select onValueChange={(value) => setNewAppointment({...newAppointment, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === "id" ? "Pilih Kategori" : "Select Category"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beauty">{language === "id" ? "Kecantikan" : "Beauty"}</SelectItem>
                      <SelectItem value="entertainment">{language === "id" ? "Hiburan" : "Entertainment"}</SelectItem>
                      <SelectItem value="restaurant">{language === "id" ? "Restoran" : "Dining"}</SelectItem>
                    </SelectContent>
                  </Select>

                  {newAppointment.category && (
                    <Select onValueChange={(value) => setNewAppointment({...newAppointment, service: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder={language === "id" ? "Pilih Layanan" : "Select Service"} />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceCategories[newAppointment.category]?.options.map((option) => (
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

                  <Select onValueChange={(value) => setNewAppointment({...newAppointment, time: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === "id" ? "Pilih Waktu" : "Select Time"} />
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
                  {language === "id" ? "Buat Reservasi" : "Book Appointment"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loyalty Tab */}
        {activeTab === "loyalty" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {language === "id" ? "Program Loyalitas" : "Loyalty Program"}
                  <span className="text-sm text-gray-500">
                    {language === "id" ? "Poin hanya dapat ditambahkan oleh admin" : "Points can only be added by admin"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">{language === "id" ? "Reward Tersedia" : "Available Rewards"}</h3>
                    {rewards.map((reward) => (
                      <Card key={reward.id} className="border-2">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-medium">{reward.name}</h4>
                              <p className="text-sm text-gray-600">{reward.pointsCost} {language === "id" ? "poin" : "points"}</p>
                            </div>
                            <Button 
                              size="sm" 
                              onClick={() => redeemReward(reward)}
                              disabled={loyaltyPoints < reward.pointsCost}
                            >
                              {language === "id" ? "Tukar" : "Redeem"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">{language === "id" ? "Riwayat Poin" : "Points History"}</h3>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {pointHistory.map((entry) => (
                        <Card key={entry.id} className="border">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm font-medium">{entry.description}</p>
                                <p className="text-xs text-gray-500">{entry.date}</p>
                              </div>
                              <Badge variant={entry.type === "earned" ? "default" : "destructive"}>
                                {entry.points > 0 ? "+" : ""}{entry.points}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === "bookings" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{language === "id" ? "Reservasi Saya" : "My Bookings"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <Card key={appointment.id} className="border-2">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">{appointment.service}</h4>
                            <p className="text-sm text-gray-600">
                              {appointment.date} at {appointment.time}
                            </p>
                            <p className="text-sm font-medium">RP {formatRupiah(appointment.cost)}</p>
                          </div>
                          <Badge variant={appointment.status === "confirmed" ? "default" : "secondary"}>
                            {appointment.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Marketplace Tab */}
        {activeTab === "marketplace" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{language === "id" ? "Pasar Mainan" : "Toy Marketplace"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{language === "id" ? "Listing Saya" : "My Listings"}</h3>
                  {userListings.map((listing) => (
                    <Card key={listing.id} className="border-2">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">{listing.title}</h4>
                            <p className="text-sm text-gray-600">{listing.description}</p>
                            <p className="text-sm font-medium">RP {formatRupiah(listing.price)}</p>
                          </div>
                          <Badge variant="default">{listing.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <h3 className="text-lg font-semibold mt-6">{language === "id" ? "Riwayat Penjualan" : "Sales History"}</h3>
                  {salesHistory.map((sale) => (
                    <Card key={sale.id} className="border-2">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">{sale.item}</h4>
                            <p className="text-sm text-gray-600">{language === "id" ? "Pembeli" : "Buyer"}: {sale.buyer}</p>
                            <p className="text-sm text-gray-500">{sale.date}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">RP {formatRupiah(sale.amount)}</p>
                            <Badge variant="default">{sale.status}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Collections Tab */}
        {activeTab === "collections" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{language === "id" ? "Koleksi Mainan" : "Toy Collections"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder={language === "id" ? "Masukkan kode unik mainan" : "Enter unique toy code"}
                      value={newToyCode}
                      onChange={(e) => setNewToyCode(e.target.value)}
                    />
                    <Button onClick={addToyByCode}>
                      <Plus className="w-4 h-4 mr-2" />
                      {language === "id" ? "Tambah" : "Add"}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {toyCollection.map((toy) => (
                      <Card key={toy.id} className={`border-2 ${getRarityColor(toy.rarity)}`}>
                        <CardContent className="p-4 text-center text-white">
                          <div className="text-4xl mb-2">{toy.image}</div>
                          <h4 className="font-bold">{toy.name}</h4>
                          <p className="text-sm opacity-90">{toy.rarity}</p>
                          <p className="text-xs opacity-75">{language === "id" ? "Diperoleh" : "Acquired"}: {toy.acquiredDate}</p>
                          <div className="mt-2 flex items-center justify-center space-x-1">
                            <QrCode className="w-4 h-4" />
                            <span className="text-xs">{toy.qrCode}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Referrals Tab */}
        {activeTab === "referrals" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{language === "id" ? "Program Rujukan" : "Referral Program"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg">
                    <h3 className="text-xl font-bold mb-2">{language === "id" ? "Kode Rujukan Anda" : "Your Referral Code"}</h3>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-2xl font-mono bg-white bg-opacity-20 px-4 py-2 rounded">{referralCode}</span>
                      <Button variant="secondary" size="sm" onClick={copyReferralCode}>
                        {language === "id" ? "Salin" : "Copy"}
                      </Button>
                    </div>
                    <div className="mt-4 text-center">
                      <QrCode className="w-16 h-16 mx-auto mb-2" />
                      <p className="text-sm opacity-90">{language === "id" ? "Tampilkan QR code untuk rujukan" : "Show QR code for referrals"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="p-4 text-center">
                        <h4 className="font-bold text-green-800">Level 1 (10%)</h4>
                        <p className="text-2xl font-bold text-green-600">2</p>
                        <p className="text-sm text-green-600">{language === "id" ? "Rujukan Langsung" : "Direct Referrals"}</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4 text-center">
                        <h4 className="font-bold text-blue-800">Level 2 (3%)</h4>
                        <p className="text-2xl font-bold text-blue-600">1</p>
                        <p className="text-sm text-blue-600">{language === "id" ? "Rujukan Level 2" : "Level 2 Referrals"}</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-purple-50 border-purple-200">
                      <CardContent className="p-4 text-center">
                        <h4 className="font-bold text-purple-800">Level 3 (2%)</h4>
                        <p className="text-2xl font-bold text-purple-600">0</p>
                        <p className="text-sm text-purple-600">{language === "id" ? "Rujukan Level 3" : "Level 3 Referrals"}</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{language === "id" ? "Profil Saya" : "My Profile"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{user?.firstName || 'Candy'} {user?.lastName || 'Heng'}</h3>
                      <p className="text-gray-600">{user?.email || 'candy@email.com'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">{language === "id" ? "Nomor Telepon" : "Phone Number"}</label>
                      <div className="flex space-x-2">
                        <Input 
                          value={phoneNumber} 
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          disabled={!editingProfile}
                        />
                        <Button variant="outline" onClick={() => setEditingProfile(!editingProfile)}>
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">{language === "id" ? "Foto Profil" : "Profile Photo"}</label>
                      <Button variant="outline" className="w-full">
                        <Camera className="w-4 h-4 mr-2" />
                        {language === "id" ? "Ubah Foto" : "Change Photo"}
                      </Button>
                    </div>
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