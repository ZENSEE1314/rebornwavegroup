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
import logoImage from "@assets/2-removebg-preview.png";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CompleteApp() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // State for pending purchases and confirmations
  const [pendingPurchases, setPendingPurchases] = useState([]);
  
  // User data
  const [userCredits, setUserCredits] = useState(3500000); // In Indonesian Rupiah
  const [loyaltyPoints, setLoyaltyPoints] = useState(125);
  const [lifetimePoints, setLifetimePoints] = useState(235);
  const [referralEarnings, setReferralEarnings] = useState(80000);
  const [language, setLanguage] = useState("en");
  const [phoneNumber, setPhoneNumber] = useState("+62 812-3456-7890");
  const [profileImage, setProfileImage] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [newToyCode, setNewToyCode] = useState("");
  const [newListingTitle, setNewListingTitle] = useState("");
  const [newListingPrice, setNewListingPrice] = useState("");
  const [newListingDescription, setNewListingDescription] = useState("");
  const [selectedToyForSale, setSelectedToyForSale] = useState(null);
  const [showCreateListingModal, setShowCreateListingModal] = useState(false);
  const referralCode = "RWG8H4K2";

  // Cash-out states
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [cashOutAmount, setCashOutAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [cashOutHistory, setCashOutHistory] = useState([]);

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
  const [marketplace, setMarketplace] = useState([
    { id: 1, name: "Teddy Bear Premium", rarity: "rare", price: 500000, image: "🧸", owned: false },
    { id: 2, name: "Lucky Cat", rarity: "common", price: 200000, image: "🐱", owned: true },
    { id: 3, name: "Dragon Plushie", rarity: "legendary", price: 1000000, image: "🐉", owned: false },
    { id: 4, name: "Cute Panda", rarity: "rare", price: 600000, image: "🐼", owned: false },
    { id: 5, name: "Rainbow Unicorn", rarity: "epic", price: 800000, image: "🦄", owned: false }
  ]);

  // Marketplace toys (user listings)
  const [marketplaceToys, setMarketplaceToys] = useState([]);
  
  // Transaction history state
  const [transactionHistory, setTransactionHistory] = useState([
    { id: 1, type: "top-up", description: "Top up kredit", amount: 500000, date: "2025-05-25", time: "14:30" },
    { id: 2, type: "booking", description: "Facial Treatment", amount: -250000, date: "2025-05-24", time: "10:00" }
  ]);

  // User's toy inventory
  const [toyInventory, setToyInventory] = useState([
    { id: 2, name: "Lucky Cat", rarity: "common", acquiredDate: "2025-05-15", qrCode: "LC001", image: "🐱" },
    { id: 6, name: "Cute Panda", rarity: "rare", acquiredDate: "2025-05-20", qrCode: "CP002", image: "🐼" },
    { id: 7, name: "Magic Bunny", rarity: "epic", acquiredDate: "2025-05-10", qrCode: "MB003", image: "🐰" }
  ]);

  // Point and redemption history (dynamic)
  const [pointHistory, setPointHistory] = useState([
    { id: 1, date: "2025-05-25", description: language === "id" ? "Hair Spa - Pembelian" : "Hair Spa - Purchase", points: 20, type: "earned" },
    { id: 2, date: "2025-05-20", description: language === "id" ? "Rujukan Baru" : "New Referral", points: 15, type: "earned" },
    { id: 3, date: "2025-05-15", description: language === "id" ? "Tukar Lucky Cat" : "Redeemed Lucky Cat", points: -50, type: "redeemed" },
    { id: 4, date: "2025-05-10", description: language === "id" ? "KTV Room - Pembelian" : "KTV Room - Purchase", points: 50, type: "earned" }
  ]);

  const [redemptionHistory, setRedemptionHistory] = useState([
    { id: 1, date: "2025-05-15", reward: "Lucky Cat", pointsSpent: 50, status: "completed" },
    { id: 2, date: "2025-05-01", reward: language === "id" ? "Diskon 10%" : "10% Discount", pointsSpent: 25, status: "used" }
  ]);

  // Marketplace listings (user-created)
  const [userListings, setUserListings] = useState([
    { id: 1, title: "Rare Teddy Bear", description: "Collectible bear from limited edition", price: 750000, toyId: 2, seller: "Candy", status: "active", createdDate: "2025-05-20" }
  ]);

  // Sales history
  const [salesHistory, setSalesHistory] = useState([
    { id: 1, item: "Lucky Cat", buyer: "Sarah Chen", amount: 300000, date: "2025-05-18", status: "completed" }
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

    // Check if booking is within 2 hours
    const now = new Date();
    const appointmentTime = new Date(`${newAppointment.date}T${newAppointment.time}`);
    const timeDiff = appointmentTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff > 2) {
      toast({
        title: language === "id" ? "Error" : "Error", 
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

  const processPayment = (amount) => {
    // This would integrate with PayPal/Stripe
    setUserCredits(prev => prev + parseInt(amount));
    
    // Add transaction to history
    const newTransaction = {
      id: Date.now(),
      type: "top-up",
      description: `${language === "id" ? "Top up kredit" : "Credit top-up"}`,
      amount: parseInt(amount),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString()
    };
    setTransactionHistory([newTransaction, ...transactionHistory]);
    
    setShowTopUpModal(false);
    setTopUpAmount("");
    toast({
      title: language === "id" ? "Berhasil!" : "Success!",
      description: language === "id" ? `RP ${formatRupiah(amount)} berhasil ditambahkan` : `RP ${formatRupiah(amount)} added successfully`,
    });
  };

  const processCashOut = async () => {
    if (!cashOutAmount || !bankName || !accountNumber || !accountHolderName) {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Harap isi semua field" : "Please fill all fields",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(cashOutAmount);
    if (amount < 50000) {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Minimal penarikan RP 50,000" : "Minimum cash-out RP 50,000",
        variant: "destructive"
      });
      return;
    }

    if (amount > userCredits) {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Kredit tidak mencukupi" : "Insufficient credits",
        variant: "destructive"
      });
      return;
    }

    try {
      // API call would go here
      setUserCredits(userCredits - amount);
      setShowCashOutModal(false);
      setCashOutAmount("");
      setBankName("");
      setAccountNumber("");
      setAccountHolderName("");

      toast({
        title: language === "id" ? "Berhasil!" : "Success!",
        description: language === "id" ? "Permintaan penarikan berhasil diajukan" : "Cash-out request submitted successfully",
      });

      // Add to cash-out history
      const newCashOut = {
        id: Date.now(),
        amount: amount,
        bankName,
        accountNumber,
        accountHolderName,
        status: "pending",
        date: new Date().toISOString().split('T')[0]
      };
      setCashOutHistory([newCashOut, ...cashOutHistory]);
      
      // Add transaction to history
      const newTransaction = {
        id: Date.now(),
        type: "cash-out",
        description: `${language === "id" ? "Penarikan ke" : "Cash out to"} ${bankName}`,
        amount: -amount,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString()
      };
      setTransactionHistory([newTransaction, ...transactionHistory]);
    } catch (error) {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Gagal memproses penarikan" : "Failed to process cash-out",
        variant: "destructive"
      });
    }
  };

  const addToyByCode = () => {
    if (!newToyCode) {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Masukkan kode mainan" : "Enter toy code",
        variant: "destructive"
      });
      return;
    }

    // Simulate adding toy by unique code
    const newToy = {
      id: toyInventory.length + 10,
      name: "Special Edition Bear",
      rarity: "rare",
      acquiredDate: new Date().toISOString().split('T')[0],
      qrCode: newToyCode,
      image: "🧸"
    };

    setToyInventory([...toyInventory, newToy]);
    setNewToyCode("");
    
    toast({
      title: language === "id" ? "Berhasil!" : "Success!",
      description: language === "id" ? "Mainan berhasil ditambahkan ke koleksi" : "Toy added to collection",
    });
  };

  const createMarketplaceListing = () => {
    if (!newListingPrice || !selectedToyForSale) {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Harap pilih mainan dan masukkan harga" : "Please select toy and enter price",
        variant: "destructive"
      });
      return;
    }

    const newListing = {
      id: Date.now(),
      name: selectedToyForSale.name,
      title: `${selectedToyForSale.name} (${selectedToyForSale.rarity})`,
      description: `Original ${selectedToyForSale.name} from collection`,
      price: parseInt(newListingPrice),
      rarity: selectedToyForSale.rarity,
      toyId: selectedToyForSale.id,
      seller: user?.firstName || "User", 
      status: "active",
      createdDate: new Date().toISOString().split('T')[0],
      image: selectedToyForSale.image,
      owned: false
    };

    setUserListings([...userListings, newListing]);
    setMarketplaceToys([...marketplaceToys, newListing]);
    
    // Remove toy from seller's collection when listing
    setToyInventory(toyInventory.filter(toy => toy.id !== selectedToyForSale.id));
    
    setNewListingPrice("");
    setSelectedToyForSale(null);
    setShowCreateListingModal(false);

    toast({
      title: language === "id" ? "Berhasil!" : "Success!",
      description: language === "id" ? "Mainan berhasil dijual di marketplace" : "Toy listed in marketplace successfully",
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

    // Add to point history
    const newHistoryItem = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      description: `${language === "id" ? "Tukar" : "Redeemed"} ${reward.name}`,
      points: -reward.pointsCost,
      type: "redeemed"
    };
    setPointHistory([newHistoryItem, ...pointHistory]);

    toast({
      title: language === "id" ? "Reward Ditukar!" : "Reward Claimed!",
      description: language === "id" ? `Berhasil menukar ${reward.name}` : `Successfully redeemed ${reward.name}`,
    });
  };

  const buyToy = (toy) => {
    // Check if trying to buy own item
    if (toy.seller === (user?.firstName || "User")) {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Tidak bisa membeli item sendiri" : "Cannot buy your own item",
        variant: "destructive"
      });
      return;
    }

    if (userCredits < toy.price) {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Kredit tidak mencukupi" : "Insufficient credits",
        variant: "destructive"
      });
      return;
    }

    // Deduct credits from buyer
    setUserCredits(userCredits - toy.price);
    
    // Calculate and add points (1 point per 10,000 RP)
    const pointsEarned = Math.floor(toy.price / 10000);
    setLoyaltyPoints(prev => prev + pointsEarned);
    setLifetimePoints(prev => prev + pointsEarned);
    
    // Create pending purchase (waiting for confirmation)
    const pendingPurchase = {
      id: Date.now(),
      name: toy.name || toy.title,
      rarity: toy.rarity || "common",
      acquiredDate: new Date().toISOString().split('T')[0],
      qrCode: `QR${Date.now()}`,
      image: toy.image || "🧸",
      status: "pending_confirmation",
      price: toy.price,
      seller: toy.seller
    };
    
    // Remove toy from marketplace (user listings only, not default marketplace)
    if (toy.seller && toy.seller !== "System") {
      setMarketplaceToys(marketplaceToys.filter(item => item.id !== toy.id));
      setUserListings(userListings.filter(item => item.id !== toy.id));
    } else {
      // Mark as owned in default marketplace
      setMarketplace(marketplace.map(item => 
        item.id === toy.id ? { ...item, owned: true } : item
      ));
    }
    
    // Add transaction to history
    const newTransaction = {
      id: Date.now(),
      type: "purchase",
      description: `${language === "id" ? "Beli" : "Bought"} ${toy.name || toy.title} (+${pointsEarned} ${language === "id" ? "poin" : "points"})`,
      amount: -toy.price,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString()
    };
    setTransactionHistory([newTransaction, ...transactionHistory]);

    // Add to point history immediately
    const newPointHistory = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      description: `${language === "id" ? "Beli" : "Purchase"} ${toy.name || toy.title} (+${pointsEarned} ${language === "id" ? "poin" : "points"})`,
      points: pointsEarned,
      type: "earned"
    };
    setPointHistory([newPointHistory, ...pointHistory]);

    // For user items, add to pending; for system items, add directly
    if (toy.seller && toy.seller !== "System") {
      // Create pending purchase state
      const pendingPurchases = JSON.parse(localStorage.getItem('pendingPurchases') || '[]');
      pendingPurchases.push({
        ...pendingPurchase,
        buyerId: user?.id,
        sellerId: toy.sellerId || toy.seller
      });
      localStorage.setItem('pendingPurchases', JSON.stringify(pendingPurchases));
      
      toast({
        title: language === "id" ? "Berhasil!" : "Success!",
        description: language === "id" ? `Pembelian berhasil! Menunggu konfirmasi penjual. +${pointsEarned} poin` : `Purchase successful! Waiting for seller confirmation. +${pointsEarned} points`,
      });
    } else {
      setToyInventory([...toyInventory, pendingPurchase]);
      toast({
        title: language === "id" ? "Berhasil!" : "Success!",
        description: language === "id" ? `Mainan berhasil dibeli! +${pointsEarned} poin` : `Toy purchased successfully! +${pointsEarned} points`,
      });
    }
  };

  const cancelListing = (listingId) => {
    const listing = userListings.find(item => item.id === listingId);
    if (listing) {
      // Return toy to inventory with original toy data
      const originalToy = toyInventory.find(toy => toy.id === listing.toyId) || {
        id: listing.toyId,
        name: listing.title?.split(' (')[0] || listing.name,
        rarity: listing.rarity || "common",
        acquiredDate: listing.createdDate,
        qrCode: `QR${Date.now()}`,
        image: listing.image || "🧸"
      };
      setToyInventory([...toyInventory, originalToy]);
      
      // Remove from listings
      setUserListings(userListings.filter(item => item.id !== listingId));
      setMarketplaceToys(marketplaceToys.filter(item => item.id !== listingId));
      
      toast({
        title: language === "id" ? "Berhasil!" : "Success!",
        description: language === "id" ? "Penjualan dibatalkan dan mainan dikembalikan ke koleksi" : "Sale canceled and toy returned to collection",
      });
    }
  };

  const confirmSale = (purchaseId) => {
    const pendingPurchases = JSON.parse(localStorage.getItem('pendingPurchases') || '[]');
    const purchase = pendingPurchases.find(p => p.id === purchaseId);
    
    if (purchase) {
      // Remove from pending
      const updatedPending = pendingPurchases.filter(p => p.id !== purchaseId);
      localStorage.setItem('pendingPurchases', JSON.stringify(updatedPending));
      
      // Add seller's credit (you would need to implement cross-user credit transfer)
      setUserCredits(prev => prev + purchase.price);
      
      // Add transaction for seller
      const sellerTransaction = {
        id: Date.now(),
        type: "sale",
        description: `${language === "id" ? "Jual" : "Sold"} ${purchase.name}`,
        amount: purchase.price,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString()
      };
      setTransactionHistory([sellerTransaction, ...transactionHistory]);
      
      toast({
        title: language === "id" ? "Berhasil!" : "Success!",
        description: language === "id" ? "Penjualan dikonfirmasi!" : "Sale confirmed!",
      });
    }
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
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1 shadow-sm">
                <img src={logoImage} alt="Reborn Wave House" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-blue-600">Reborn Wave House</h1>
                <p className="text-xs text-gray-500">Your Oasis of Joy</p>
              </div>
            </div>
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
          <div className="flex space-x-4 md:space-x-8 overflow-x-auto scrollbar-hide pb-2">
            {[
              { id: "dashboard", label: language === "id" ? "Beranda" : "Dashboard", icon: Home },
              { id: "loyalty", label: language === "id" ? "Loyalitas" : "Loyalty", icon: Star },
              { id: "bookings", label: language === "id" ? "Reservasi" : "Bookings", icon: Calendar },
              { id: "marketplace", label: language === "id" ? "Pasar" : "Marketplace", icon: ShoppingBag },
              { id: "inventory", label: language === "id" ? "Koleksi" : "Collections", icon: Package },
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

      {/* Top-up Payment Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{language === "id" ? "Top Up Kredit" : "Top Up Credits"}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
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

      {/* Cash-out Modal */}
      {showCashOutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4 text-green-600">
              {language === "id" ? "💰 Tarik Kredit ke Bank" : "💰 Cash Out to Bank"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === "id" ? "Jumlah Penarikan" : "Withdrawal Amount"}
                </label>
                <Input
                  placeholder={language === "id" ? "Min. RP 50,000" : "Min. RP 50,000"}
                  value={cashOutAmount}
                  onChange={(e) => setCashOutAmount(e.target.value)}
                  type="number"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {language === "id" ? `Saldo tersedia: RP ${formatRupiah(userCredits)}` : `Available balance: RP ${formatRupiah(userCredits)}`}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === "id" ? "Nama Bank" : "Bank Name"}
                </label>
                <Select onValueChange={setBankName}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === "id" ? "Pilih bank" : "Select bank"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BCA">🏧 Bank Central Asia (BCA)</SelectItem>
                    <SelectItem value="Mandiri">🏧 Bank Mandiri</SelectItem>
                    <SelectItem value="BRI">🏧 Bank Rakyat Indonesia (BRI)</SelectItem>
                    <SelectItem value="BNI">🏧 Bank Negara Indonesia (BNI)</SelectItem>
                    <SelectItem value="CIMB">🏧 CIMB Niaga</SelectItem>
                    <SelectItem value="Danamon">🏧 Bank Danamon</SelectItem>
                    <SelectItem value="Permata">🏧 Bank Permata</SelectItem>
                    <SelectItem value="OCBC">🏧 OCBC NISP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === "id" ? "Nomor Rekening" : "Account Number"}
                </label>
                <Input
                  placeholder={language === "id" ? "Masukkan nomor rekening" : "Enter account number"}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === "id" ? "Nama Pemilik Rekening" : "Account Holder Name"}
                </label>
                <Input
                  placeholder={language === "id" ? "Nama sesuai rekening bank" : "Name as per bank account"}
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-700">
                  {language === "id" 
                    ? "⚠️ Proses penarikan membutuhkan 1-3 hari kerja. Pastikan data bank sudah benar." 
                    : "⚠️ Withdrawal process takes 1-3 business days. Please ensure bank details are correct."}
                </p>
              </div>

              <div className="flex space-x-2">
                <Button onClick={processCashOut} className="flex-1 bg-green-600 hover:bg-green-700">
                  {language === "id" ? "Ajukan Penarikan" : "Submit Withdrawal"}
                </Button>
                <Button variant="outline" onClick={() => setShowCashOutModal(false)} className="flex-1">
                  {language === "id" ? "Batal" : "Cancel"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Listing Modal */}
      {showCreateListingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{language === "id" ? "Jual Mainan Saya" : "Sell My Toy"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === "id" ? "Pilih Mainan" : "Select Toy"}
                </label>
                <Select onValueChange={(value) => setSelectedToyForSale(toyInventory.find(toy => toy.id.toString() === value))}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === "id" ? "Pilih mainan untuk dijual" : "Select toy to sell"} />
                  </SelectTrigger>
                  <SelectContent>
                    {toyInventory.map((toy) => (
                      <SelectItem key={toy.id} value={toy.id.toString()}>
                        {toy.image} {toy.name} ({toy.rarity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === "id" ? "Harga Jual (RP)" : "Selling Price (RP)"}
                </label>
                <Input
                  placeholder={language === "id" ? "Masukkan harga" : "Enter price"}
                  value={newListingPrice}
                  onChange={(e) => setNewListingPrice(e.target.value)}
                  type="number"
                />
              </div>

              <div className="flex space-x-2">
                <Button onClick={createMarketplaceListing} className="flex-1" disabled={!selectedToyForSale || !newListingPrice}>
                  {language === "id" ? "Buat Listing" : "Create Listing"}
                </Button>
                <Button variant="outline" onClick={() => setShowCreateListingModal(false)} className="flex-1">
                  {language === "id" ? "Batal" : "Cancel"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <p className="text-lg font-bold text-green-800">RP {formatRupiah(userCredits)}</p>
                  <div className="space-y-1 mt-2">
                    <Button size="sm" onClick={() => setShowTopUpModal(true)} className="w-full bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-3 h-3 mr-1" />
                      {language === "id" ? "Top Up Kredit" : "Top Up Credits"}
                    </Button>
                    <Button size="sm" onClick={() => setShowCashOutModal(true)} className="w-full bg-green-600 hover:bg-green-700">
                      <DollarSign className="w-3 h-3 mr-1" />
                      {language === "id" ? "Tarik ke Bank" : "Cash Out to Bank"}
                    </Button>
                  </div>
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

        {/* Loyalty Program Tab */}
        {activeTab === "loyalty" && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                {language === "id" ? "Program Loyalitas" : "Loyalty Program"}
              </h2>
              <p className="text-slate-600">
                {language === "id" ? "Kumpulkan poin dan tukar reward menarik" : "Earn points and claim amazing rewards"}
              </p>
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
                    <p className="text-slate-600">{language === "id" ? "Poin Tersedia" : "Available Points"}</p>
                  </div>
                </div>

                {nextLevelInfo && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700">
                        {language === "id" ? `Progress ke ${nextLevelInfo.name}` : `Progress to ${nextLevelInfo.name}`}
                      </span>
                      <span className="text-sm text-slate-600">
                        {pointsToNextLevel} {language === "id" ? "poin dibutuhkan" : "points needed"}
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
                    <CardTitle>{language === "id" ? "Reward Tersedia" : "Available Rewards"}</CardTitle>
                    <div className="text-sm text-gray-500">
                      {language === "id" ? "Poin hanya dapat ditambahkan oleh admin" : "Points can only be added by admin"}
                    </div>
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
                              {reward.pointsCost} {language === "id" ? "poin" : "points"}
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
                              {loyaltyPoints >= reward.pointsCost ? 
                                (language === "id" ? "Tukar" : "Redeem") : 
                                (language === "id" ? "Poin Kurang" : "Need more points")
                              }
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Point History */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>{language === "id" ? "Riwayat Poin" : "Point History"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pointHistory.map((history) => (
                        <div key={history.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium text-slate-900">{history.description}</p>
                            <p className="text-sm text-slate-600">{history.date}</p>
                          </div>
                          <div className="text-right">
                            <span className={`font-bold ${history.type === 'earned' ? 'text-green-600' : 'text-red-600'}`}>
                              {history.type === 'earned' ? '+' : ''}{history.points} {language === "id" ? "poin" : "points"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>{language === "id" ? "Benefit Level Anda" : "Your Level Benefits"}</CardTitle>
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

                {/* Redemption History */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>{language === "id" ? "Riwayat Penukaran" : "Redemption History"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {redemptionHistory.map((redemption) => (
                        <div key={redemption.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{redemption.reward}</p>
                            <p className="text-xs text-gray-600">{redemption.date}</p>
                          </div>
                          <Badge variant={redemption.status === 'used' ? 'secondary' : 'default'}>
                            {redemption.status}
                          </Badge>
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
                <h2 className="text-3xl font-bold text-slate-900">
                  {language === "id" ? "Manajemen Reservasi" : "Booking Management"}
                </h2>
                <p className="text-slate-600">
                  {language === "id" ? "Kelola reservasi kecantikan, hiburan, dan restoran" : "Manage your beauty, entertainment, and restaurant bookings"}
                </p>
              </div>
            </div>

            {/* Service Categories */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-pink-50 border-pink-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-3">💄</div>
                  <h3 className="text-lg font-semibold text-pink-800 mb-2">
                    {serviceCategories.beauty.name}
                  </h3>
                  <p className="text-sm text-pink-600 mb-4">Hair Spa, Facials, Nails</p>
                  <Badge className="bg-pink-100 text-pink-800">
                    {language === "id" ? "Mulai dari" : "Starting from"} RP {serviceCategories.beauty.startingPrice}
                  </Badge>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-3">🎮</div>
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">
                    {serviceCategories.entertainment.name}
                  </h3>
                  <p className="text-sm text-blue-600 mb-4">Claw Machine, KTV Rooms</p>
                  <Badge className="bg-blue-100 text-blue-800">
                    {language === "id" ? "Mulai dari" : "Starting from"} RP {serviceCategories.entertainment.startingPrice}
                  </Badge>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-3">🍽️</div>
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    {serviceCategories.restaurant.name}
                  </h3>
                  <p className="text-sm text-green-600 mb-4">Breakfast, Lunch, Dinner</p>
                  <Badge className="bg-green-100 text-green-800">
                    {language === "id" ? "Mulai dari" : "Starting from"} RP {serviceCategories.restaurant.startingPrice}
                  </Badge>
                </CardContent>
              </Card>
            </div>

            {/* New Booking Form */}
            <Card>
              <CardHeader>
                <CardTitle>{language === "id" ? "Buat Reservasi Baru" : "Create New Booking"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="date"
                    value={newAppointment.date}
                    min={new Date().toISOString().split('T')[0]}
                    max={new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().split('T')[0]}
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

            {/* Current Appointments */}
            <Card>
              <CardHeader>
                <CardTitle>{language === "id" ? "Reservasi Anda" : "Your Appointments"}</CardTitle>
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
                          <p className="text-sm text-slate-600">{apt.date} at {apt.time}</p>
                          <p className="text-sm text-slate-500">RP {formatRupiah(apt.cost)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge variant={apt.status === 'confirmed' ? 'default' : apt.status === 'pending' ? 'secondary' : 'destructive'}>
                          {apt.status}
                        </Badge>
                        {editingAppointment === apt.id ? (
                          <div className="flex space-x-2">
                            <Input
                              type="date"
                              defaultValue={apt.date}
                              onChange={(e) => apt.newDate = e.target.value}
                              className="w-32"
                            />
                            <Select onValueChange={(value) => apt.newTime = value} defaultValue={apt.time}>
                              <SelectTrigger className="w-24">
                                <SelectValue />
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
                            <Button size="sm" onClick={() => rescheduleAppointment(apt.id, apt.newDate || apt.date, apt.newTime || apt.time)}>
                              {language === "id" ? "Simpan" : "Save"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingAppointment(null)}>
                              {language === "id" ? "Batal" : "Cancel"}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" onClick={() => setEditingAppointment(apt.id)}>
                              <Edit3 className="w-4 h-4" />
                              {language === "id" ? "Ubah" : "Reschedule"}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteAppointment(apt.id)}>
                              <Trash2 className="w-4 h-4" />
                              {language === "id" ? "Hapus" : "Delete"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Marketplace Tab */}
        {activeTab === "marketplace" && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                {language === "id" ? "Pasar Mainan" : "Toy Marketplace"}
              </h2>
              <p className="text-slate-600">
                {language === "id" ? "Beli mainan lucu dengan kredit Anda" : "Buy cute toys with your credits"}
              </p>
              <Button 
                onClick={() => setShowCreateListingModal(true)} 
                className="mt-4 bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                {language === "id" ? "Jual Mainan Saya" : "Sell My Toy"}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...marketplace, ...marketplaceToys].map((toy) => (
                <Card key={toy.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="text-6xl mb-4">{toy.image}</div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">{toy.name}</h3>
                      <Badge className={getRarityColor(toy.rarity)} variant="secondary">
                        {toy.rarity}
                      </Badge>
                      <p className="text-2xl font-bold text-green-600 mt-4 mb-4">
                        RP {formatRupiah(toy.price)}
                      </p>
                      {toy.owned ? (
                        <Badge variant="default" className="w-full">
                          {language === "id" ? "Sudah Dimiliki" : "Owned"}
                        </Badge>
                      ) : (
                        <Button 
                          onClick={() => buyToy(toy)} 
                          className="w-full"
                          disabled={userCredits < toy.price}
                        >
                          {userCredits >= toy.price ? 
                            (language === "id" ? "Beli" : "Buy") : 
                            (language === "id" ? "Kredit Kurang" : "Not enough credits")
                          }
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === "inventory" && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                {language === "id" ? "Koleksi Mainan Saya" : "My Toy Collection"}
              </h2>
              <p className="text-slate-600">
                {language === "id" ? "Lihat semua mainan yang Anda miliki" : "View all your owned toys"}
              </p>
            </div>

            {/* Add New Toy Section */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-blue-900">
                  {language === "id" ? "Tambah Mainan Baru" : "Add New Toy"}
                </h3>
                <div className="flex space-x-2">
                  <Input
                    placeholder={language === "id" ? "Masukkan kode unik mainan" : "Enter unique toy code"}
                    value={newToyCode}
                    onChange={(e) => setNewToyCode(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={addToyByCode} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    {language === "id" ? "Tambah" : "Add"}
                  </Button>
                </div>
                <p className="text-sm text-blue-600 mt-2">
                  {language === "id" ? "Pindai QR code mainan untuk mendapatkan kode unik" : "Scan toy QR code to get the unique code"}
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {toyInventory.map((toy) => (
                <Card key={toy.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="text-6xl mb-4">{toy.image}</div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">{toy.name}</h3>
                      <Badge className={getRarityColor(toy.rarity)} variant="secondary">
                        {toy.rarity}
                      </Badge>
                      <div className="mt-4 space-y-2">
                        <p className="text-sm text-slate-600">
                          {language === "id" ? "Diperoleh" : "Acquired"}: {toy.acquiredDate}
                        </p>
                        <div className="bg-gray-100 p-2 rounded">
                          <p className="text-xs text-gray-600">QR Code: {toy.qrCode}</p>
                          <div className="mt-2 bg-white p-2 rounded border-2 border-dashed border-gray-300">
                            <QrCode className="w-16 h-16 mx-auto text-gray-400" />
                            <p className="text-xs text-gray-500 mt-1">
                              {language === "id" ? "Pindai untuk verifikasi" : "Scan to verify"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Referrals Tab */}
        {activeTab === "referrals" && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                {language === "id" ? "Program Rujukan" : "Referral Program"}
              </h2>
              <p className="text-slate-600">
                {language === "id" ? "Undang teman dan dapatkan komisi" : "Invite friends and earn commissions"}
              </p>
            </div>

            {/* Referral Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <p className="text-2xl font-bold text-green-800">1</p>
                  <p className="text-sm text-green-600">
                    {language === "id" ? "Rujukan Langsung" : "Direct Referrals"}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-6 text-center">
                  <DollarSign className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                  <p className="text-2xl font-bold text-blue-800">RP {formatRupiah(referralEarnings)}</p>
                  <p className="text-sm text-blue-600">
                    {language === "id" ? "Total Pendapatan" : "Total Earnings"}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-6 text-center">
                  <Trophy className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                  <p className="text-2xl font-bold text-purple-800">Level 1</p>
                  <p className="text-sm text-purple-600">
                    {language === "id" ? "Level Rujukan" : "Referrer Level"}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-6 text-center">
                  <Gift className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
                  <p className="text-2xl font-bold text-yellow-800">10%</p>
                  <p className="text-sm text-yellow-600">
                    {language === "id" ? "Tingkat Komisi" : "Commission Rate"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Your Referral Code */}
              <Card className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                <CardHeader>
                  <CardTitle className="text-white">
                    {language === "id" ? "Bagikan Kode Rujukan" : "Share Your Referral Code"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-white/20 rounded-lg p-4 mb-4 text-center">
                    <p className="text-4xl font-bold font-mono mb-2">{referralCode}</p>
                    <p className="text-blue-100">
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
                  <div className="bg-white/20 rounded-lg p-4 text-center">
                    <QrCode className="w-24 h-24 mx-auto text-white/80 mb-2" />
                    <p className="text-sm text-white/80">
                      {language === "id" ? "Pindai QR Code untuk rujukan" : "Scan QR Code for referral"}
                    </p>
                    <p className="text-xs text-white/60 mt-1">
                      Code: {referralCode}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Commission Structure */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {language === "id" ? "Struktur Komisi" : "Commission Structure"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                      <span className="font-medium">
                        {language === "id" ? "Rujukan Langsung" : "Direct Referrals"}
                      </span>
                    </div>
                    <span className="font-bold text-green-600 text-xl">10%</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                      <span className="font-medium">
                        {language === "id" ? "Rujukan Level 2" : "Level 2 Referrals"}
                      </span>
                    </div>
                    <span className="font-bold text-blue-600 text-xl">3%</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
                      <span className="font-medium">
                        {language === "id" ? "Rujukan Level 3" : "Level 3 Referrals"}
                      </span>
                    </div>
                    <span className="font-bold text-purple-600 text-xl">2%</span>
                  </div>
                  
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-2">
                      {language === "id" ? "Pohon Rujukan Anda" : "Your Referral Tree"}
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Sarah Chen (Level 1)</span>
                        <span className="text-green-600 font-medium">+RP {formatRupiah(80000)}</span>
                      </div>
                      <div className="text-xs text-gray-500 ml-4">
                        → {language === "id" ? "Belum ada rujukan Level 2" : "No Level 2 referrals yet"}
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
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                {language === "id" ? "Profil Anda" : "Your Profile"}
              </h2>
              <p className="text-slate-600">
                {language === "id" ? "Kelola pengaturan akun dan preferensi" : "Manage your account settings and preferences"}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Profile Overview */}
              <Card className="lg:col-span-1">
                <CardContent className="p-8 text-center">
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
                    ) : (
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">
                          {(user?.firstName || 'C')[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <Button 
                      size="sm" 
                      className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                      onClick={() => document.getElementById('profile-image').click()}
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                    <input 
                      id="profile-image" 
                      type="file" 
                      accept="image/*" 
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (e) => setProfileImage(e.target?.result);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">
                    {user?.firstName || 'Candy'} {user?.lastName || 'Heng'}
                  </h3>
                  <p className="text-slate-600 mb-2">{user?.email || 'candy@example.com'}</p>
                  <p className="text-slate-600 mb-4">{phoneNumber}</p>
                  <Badge className="bg-blue-100 text-blue-800 mb-4">
                    {currentLevelInfo.name}
                  </Badge>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>{language === "id" ? "Member Sejak:" : "Member Since:"}</span>
                      <span className="font-medium">May 2025</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{language === "id" ? "Total Poin:" : "Total Points:"}</span>
                      <span className="font-medium">{lifetimePoints}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{language === "id" ? "Level Saat Ini:" : "Current Level:"}</span>
                      <span className="font-medium">Level {currentLevelInfo.level}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Settings */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>{language === "id" ? "Pengaturan Akun" : "Account Settings"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-4">
                      {language === "id" ? "Informasi Pribadi" : "Personal Information"}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {language === "id" ? "Nama Depan" : "First Name"}
                        </label>
                        <Input 
                          defaultValue={user?.firstName || 'Candy'} 
                          readOnly={!editingProfile}
                          className={editingProfile ? "" : "bg-gray-50"}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {language === "id" ? "Nama Belakang" : "Last Name"}
                        </label>
                        <Input 
                          defaultValue={user?.lastName || 'Heng'} 
                          readOnly={!editingProfile}
                          className={editingProfile ? "" : "bg-gray-50"}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                        <Input 
                          defaultValue={user?.email || 'candy@example.com'} 
                          type="email" 
                          readOnly={!editingProfile}
                          className={editingProfile ? "" : "bg-gray-50"}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {language === "id" ? "Nomor Telepon" : "Phone Number"}
                        </label>
                        <Input 
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          readOnly={!editingProfile}
                          className={editingProfile ? "" : "bg-gray-50"}
                          placeholder="+62 812-3456-7890"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preferences */}
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-4">
                      {language === "id" ? "Preferensi" : "Preferences"}
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {language === "id" ? "Notifikasi Email" : "Email Notifications"}
                          </p>
                          <p className="text-sm text-slate-600">
                            {language === "id" ? "Terima update tentang janji dan promosi" : "Receive updates about appointments and promotions"}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          {language === "id" ? "Kelola" : "Manage"}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {language === "id" ? "Komunikasi Marketing" : "Marketing Communications"}
                          </p>
                          <p className="text-sm text-slate-600">
                            {language === "id" ? "Penawaran promosi dan promo khusus" : "Promotional offers and special deals"}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          {language === "id" ? "Kelola" : "Manage"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Account Actions */}
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-4">
                      {language === "id" ? "Aksi Akun" : "Account Actions"}
                    </h4>
                    <div className="space-y-3">
                      {editingProfile ? (
                        <div className="flex space-x-3">
                          <Button onClick={saveProfile} className="flex-1 bg-blue-600 hover:bg-blue-700">
                            {language === "id" ? "Simpan Perubahan" : "Save Changes"}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setEditingProfile(false)}
                            className="flex-1"
                          >
                            {language === "id" ? "Batal" : "Cancel"}
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          onClick={() => setEditingProfile(true)}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          {language === "id" ? "Edit Profil" : "Edit Profile"}
                        </Button>
                      )}
                      <Button variant="outline" className="w-full">
                        {language === "id" ? "Ubah Password" : "Change Password"}
                      </Button>
                      <Button variant="outline" className="w-full">
                        {language === "id" ? "Unduh Data Akun" : "Download Account Data"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Account Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>{language === "id" ? "Statistik Akun" : "Account Statistics"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">RP {formatRupiah(userCredits)}</p>
                    <p className="text-sm text-slate-600">
                      {language === "id" ? "Kredit Saat Ini" : "Current Credits"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{loyaltyPoints}</p>
                    <p className="text-sm text-slate-600">
                      {language === "id" ? "Poin Loyalitas" : "Loyalty Points"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{appointments.length}</p>
                    <p className="text-sm text-slate-600">
                      {language === "id" ? "Total Reservasi" : "Total Bookings"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">RP {formatRupiah(referralEarnings)}</p>
                    <p className="text-sm text-slate-600">
                      {language === "id" ? "Pendapatan Rujukan" : "Referral Earnings"}
                    </p>
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