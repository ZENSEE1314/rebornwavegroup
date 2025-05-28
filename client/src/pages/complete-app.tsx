import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
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
  QrCode, Globe, Phone, Camera, Trash2, Edit3, ShoppingBag, Package, Database, Check, X, AlertTriangle
} from "lucide-react";
import logoImage from "@assets/2-removebg-preview.png";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CompleteApp() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
  const [showPurchaseConfirmation, setShowPurchaseConfirmation] = useState(false);
  const [selectedPurchaseListing, setSelectedPurchaseListing] = useState(null);
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
  
  // Indonesian banks with account validation
  const indonesianBanks = [
    { code: "BCA", name: "Bank Central Asia (BCA)", minDigits: 10, maxDigits: 10, icon: "🏦" },
    { code: "BNI", name: "Bank Negara Indonesia (BNI)", minDigits: 10, maxDigits: 10, icon: "🏦" },
    { code: "BRI", name: "Bank Rakyat Indonesia (BRI)", minDigits: 15, maxDigits: 15, icon: "🏦" },
    { code: "MANDIRI", name: "Bank Mandiri", minDigits: 13, maxDigits: 13, icon: "🏦" },
    { code: "CIMB", name: "CIMB Niaga", minDigits: 13, maxDigits: 14, icon: "🏦" },
    { code: "DANAMON", name: "Bank Danamon", minDigits: 10, maxDigits: 10, icon: "🏦" },
    { code: "PERMATA", name: "Bank Permata", minDigits: 10, maxDigits: 10, icon: "🏦" },
    { code: "BTPN", name: "Bank BTPN", minDigits: 10, maxDigits: 10, icon: "🏦" },
    { code: "OCBC", name: "OCBC NISP", minDigits: 12, maxDigits: 12, icon: "🏦" },
    { code: "MAYBANK", name: "Maybank Indonesia", minDigits: 12, maxDigits: 12, icon: "🏦" },
    { code: "BSI", name: "Bank Syariah Indonesia (BSI)", minDigits: 10, maxDigits: 10, icon: "🕌" },
    { code: "GOPAY", name: "GoPay", minDigits: 10, maxDigits: 13, icon: "📱" },
    { code: "OVO", name: "OVO", minDigits: 10, maxDigits: 13, icon: "📱" },
    { code: "DANA", name: "DANA", minDigits: 10, maxDigits: 13, icon: "📱" },
    { code: "SHOPEEPAY", name: "ShopeePay", minDigits: 10, maxDigits: 13, icon: "🛒" }
  ];

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

  // Remove this old marketplace array - we only use marketplaceToys now

  // Global toy database (all toys from all users)
  const [allGlobalToys, setAllGlobalToys] = useState(() => {
    const savedGlobalToys = localStorage.getItem('allGlobalToys');
    if (savedGlobalToys) {
      return JSON.parse(savedGlobalToys);
    }
    // Initialize with all users' toys
    const allUserToys = [];
    // Get all user toy data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('userToys_')) {
        const userToys = JSON.parse(localStorage.getItem(key) || '[]');
        const userId = key.replace('userToys_', '');
        userToys.forEach(toy => {
          allUserToys.push({
            ...toy,
            ownerId: userId
          });
        });
      }
    }
    localStorage.setItem('allGlobalToys', JSON.stringify(allUserToys));
    return allUserToys;
  });

  // Remove localStorage usage - marketplace now uses database only
  
  // Transaction history state
  const [transactionHistory, setTransactionHistory] = useState([
    { id: 1, type: "top-up", description: "Credit Top-up", amount: 500000, date: "2025-05-25", time: "14:30" },
    { id: 2, type: "booking", description: "Facial Treatment", amount: -250000, date: "2025-05-24", time: "10:00" },
    { id: 3, type: "purchase", description: "Lucky Cat Purchase", amount: -200000, date: "2025-05-23", time: "16:45" },
    { id: 4, type: "top-up", description: "PayPal Top-up", amount: 1000000, date: "2025-05-22", time: "09:15" },
    { id: 5, type: "booking", description: "KTV Room 1", amount: -500000, date: "2025-05-21", time: "20:30" },
    { id: 6, type: "referral", description: "Referral Bonus (Level 1)", amount: 50000, date: "2025-05-20", time: "11:20" }
  ]);

  // Fetch user's toy inventory from database
  const { data: toyInventory = [], isLoading: toysLoading } = useQuery({
    queryKey: ['/api/toys'],
    enabled: !!user,
  });

  // Fetch all marketplace listings from database
  const { data: marketplaceListings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ['/api/listings'],
    enabled: !!user,
  });

  // Mutation to create new toy
  const createToyMutation = useMutation({
    mutationFn: (toyData: any) => apiRequest('POST', '/api/toys', toyData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/toys'] });
      toast({
        title: "Success!",
        description: "New toy added to your collection!",
      });
    },
  });

  // Mutation to create marketplace listing
  const createListingMutation = useMutation({
    mutationFn: (listingData: any) => apiRequest('POST', '/api/listings', listingData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/toys'] });
      toast({
        title: "Success!",
        description: "Your toy has been listed in the marketplace!",
      });
    },
  });

  // Mutation to update toy ownership
  const updateToyOwnerMutation = useMutation({
    mutationFn: ({ toyId, newOwnerId }: any) => apiRequest('PUT', `/api/toys/${toyId}/owner`, { newOwnerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/toys'] });
    },
  });

  // Mutation to update listing status
  const updateListingStatusMutation = useMutation({
    mutationFn: ({ id, status }: any) => apiRequest('PUT', `/api/listings/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
    },
  });

  // Mutation to create pending purchase
  const createPendingPurchaseMutation = useMutation({
    mutationFn: (purchaseData: any) => apiRequest('POST', '/api/pending-purchases', purchaseData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pending-purchases'] });
    },
  });

  // Mutation to confirm pending purchase
  const confirmPurchaseMutation = useMutation({
    mutationFn: (purchaseId: number) => apiRequest('POST', `/api/pending-purchases/${purchaseId}/confirm`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pending-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['/api/toys'] });
    },
  });

  // Fetch pending purchases for current user (both buyer and seller)
  const { data: userPendingPurchases } = useQuery({
    queryKey: ['/api/pending-purchases'],
    enabled: !!user?.id,
    queryFn: async () => {
      console.log("*** FRONTEND: Making API call to fetch pending purchases");
      const response = await fetch('/api/pending-purchases', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.log("*** FRONTEND: API call failed with status:", response.status);
        throw new Error('Failed to fetch pending purchases');
      }
      
      const data = await response.json();
      console.log("*** FRONTEND: Received data:", data);
      return data;
    }
  });

  // Mutation to create credit history entry
  const createCreditHistoryMutation = useMutation({
    mutationFn: (creditData: any) => apiRequest('POST', '/api/credit-history', creditData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/credit-history'] });
    },
  });

  // Mutation to create points history entry
  const createPointsHistoryMutation = useMutation({
    mutationFn: (pointsData: any) => apiRequest('POST', '/api/points-history', pointsData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/points-history'] });
    },
  });

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

    if (hoursDiff < 2) {
      toast({
        title: language === "id" ? "Error" : "Error", 
        description: language === "id" ? "Reservasi harus dibuat minimal 2 jam ke depan" : "Booking must be at least 2 hours in advance",
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

  // Account number validation function
  const validateAccountNumber = (bankCode, accountNum) => {
    const bank = indonesianBanks.find(b => b.code === bankCode);
    if (!bank) return false;
    
    const numericAccount = accountNum.replace(/\D/g, '');
    return numericAccount.length >= bank.minDigits && numericAccount.length <= bank.maxDigits;
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

    // Validate account number format for selected bank
    if (!validateAccountNumber(bankName, accountNumber)) {
      const bank = indonesianBanks.find(b => b.code === bankName);
      toast({
        title: language === "id" ? "Nomor Rekening Tidak Valid" : "Invalid Account Number",
        description: language === "id" ? 
          `Nomor rekening ${bank?.name} harus ${bank?.minDigits}-${bank?.maxDigits} digit` :
          `${bank?.name} account number must be ${bank?.minDigits}-${bank?.maxDigits} digits`,
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

    // Create listing using database mutation
    createListingMutation.mutate({
      toyId: selectedToyForSale.id,
      price: newListingPrice, // Send as string to match database schema
      description: `Original ${selectedToyForSale.name} from collection`,
    });
    
    setNewListingPrice("");
    setSelectedToyForSale(null);
    setShowCreateListingModal(false);
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

  // Function to cancel listing
  const cancelListing = (listingId) => {
    // Find the toy that was being sold
    const canceledToy = marketplaceToys.find(toy => toy.id === listingId);
    
    // Remove from marketplace toys
    const updatedMarketplaceToys = marketplaceToys.filter(item => item.id !== listingId);
    setMarketplaceToys(updatedMarketplaceToys);
    setUserListings(userListings.filter(item => item.id !== listingId));
    
    // Update global marketplace listings storage
    localStorage.setItem('globalMarketplaceListings', JSON.stringify(updatedMarketplaceToys));
    
    if (canceledToy) {
      // Add it back to user's inventory
      const restoredToy = {
        id: canceledToy.toyId || canceledToy.id,
        name: canceledToy.name,
        rarity: canceledToy.rarity,
        acquiredDate: new Date().toISOString().split('T')[0],
        qrCode: `QR${Date.now()}`,
        image: canceledToy.image
      };
      
      const updatedInventory = [...toyInventory, restoredToy];
      setToyInventory(updatedInventory);
      localStorage.setItem(`userToys_${user?.id || 'guest'}`, JSON.stringify(updatedInventory));
    }
    
    toast({
      title: language === "id" ? "Penjualan Dibatalkan" : "Sale Canceled",
      description: language === "id" ? "Mainan dikembalikan ke inventori Anda" : "Toy returned to your inventory",
    });
  };

  const buyToy = (listing) => {
    // Check if trying to buy own item
    if (listing.sellerId === user?.id) {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Tidak bisa membeli item sendiri" : "Cannot buy your own item",
        variant: "destructive"
      });
      return;
    }

    const price = parseFloat(listing.price || '0');
    if (userCredits < price) {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Kredit tidak mencukupi" : "Insufficient credits",
        variant: "destructive"
      });
      return;
    }

    // Show confirmation dialog
    setSelectedPurchaseListing(listing);
    setShowPurchaseConfirmation(true);
  };

  const confirmPurchaseDialog = () => {
    const listing = selectedPurchaseListing;
    const price = parseFloat(listing.price || '0');
    
    // Calculate points earned (1 point per 10,000 RP)
    const pointsEarned = Math.floor(price / 10000);

    // Create pending purchase - buyer pays, seller must confirm
    createPendingPurchaseMutation.mutate({
      listingId: listing.id,
      buyerId: user?.id,
      sellerId: listing.sellerId,
      toyId: listing.toyId,
      amount: listing.price,
      pointsEarned: pointsEarned,
    });

    // Deduct credits from buyer immediately
    const newCredits = userCredits - price;
    setUserCredits(newCredits);

    // Add credit transaction to history
    createCreditHistoryMutation.mutate({
      userId: user?.id,
      amount: `-${price}`,
      type: 'purchase',
      description: `${language === "id" ? "Beli" : "Purchase"} ${listing.toy?.name} (${language === "id" ? "Menunggu konfirmasi penjual" : "Pending seller confirmation"})`,
      relatedId: listing.id,
    });

    // Add points to buyer's history (earned immediately)
    if (pointsEarned > 0) {
      createPointsHistoryMutation.mutate({
        userId: user?.id,
        points: pointsEarned,
        type: 'earned',
        description: `${language === "id" ? "Pembelian" : "Purchase"} ${listing.toy?.name} (+${pointsEarned} ${language === "id" ? "poin" : "points"})`,
        relatedId: listing.id,
      });
    }

    setShowPurchaseConfirmation(false);
    setSelectedPurchaseListing(null);

    toast({
      title: language === "id" ? "Pembelian Berhasil!" : "Purchase Successful!",
      description: language === "id" ? `Menunggu penjual menerima mainan dan konfirmasi. +${pointsEarned} poin` : `Waiting for seller to receive the toy and confirm it. +${pointsEarned} points`,
    });
  };

  // Function to confirm purchase as seller
  const confirmPurchase = (purchaseId) => {
    confirmPurchaseMutation.mutate(purchaseId);
    toast({
      title: language === "id" ? "Konfirmasi Berhasil!" : "Confirmation Successful!",
      description: language === "id" ? "Penjualan dikonfirmasi, kredit telah ditambahkan" : "Sale confirmed, credits have been added",
    });
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
                    <SelectValue placeholder={language === "id" ? "Pilih bank atau e-wallet" : "Select bank or e-wallet"} />
                  </SelectTrigger>
                  <SelectContent>
                    {indonesianBanks.map((bank) => (
                      <SelectItem key={bank.code} value={bank.code}>
                        {bank.icon} {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {language === "id" ? "Nomor Rekening" : "Account Number"}
                </label>
                <Input
                  placeholder={
                    bankName ? 
                      (() => {
                        const bank = indonesianBanks.find(b => b.code === bankName);
                        return bank ? 
                          `${bank.minDigits === bank.maxDigits ? bank.minDigits : `${bank.minDigits}-${bank.maxDigits}`} digits` :
                          (language === "id" ? "Masukkan nomor rekening" : "Enter account number");
                      })() :
                      (language === "id" ? "Pilih bank terlebih dahulu" : "Select bank first")
                  }
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  disabled={!bankName}
                />
                {bankName && (
                  <p className="text-xs mt-1">
                    {(() => {
                      const bank = indonesianBanks.find(b => b.code === bankName);
                      const isValid = validateAccountNumber(bankName, accountNumber);
                      return bank ? (
                        <span className={isValid ? "text-green-600" : "text-red-500"}>
                          {language === "id" ? 
                            `${bank.name}: ${bank.minDigits === bank.maxDigits ? bank.minDigits : `${bank.minDigits}-${bank.maxDigits}`} digit ${isValid ? '✓' : '✗'}` :
                            `${bank.name}: ${bank.minDigits === bank.maxDigits ? bank.minDigits : `${bank.minDigits}-${bank.maxDigits}`} digits ${isValid ? '✓' : '✗'}`
                          }
                        </span>
                      ) : null;
                    })()}
                  </p>
                )}
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
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={newAppointment.date}
                      onChange={(e) => setNewAppointment({...newAppointment, date: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                  <input
                    type="date"
                    value={newAppointment.date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setNewAppointment({...newAppointment, date: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                            <input
                              type="date"
                              min={new Date().toISOString().split('T')[0]}
                              defaultValue={apt.date}
                              onChange={(e) => apt.newDate = e.target.value}
                              className="w-32 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
              {marketplaceListings.length > 0 ? marketplaceListings.map((listing) => {
                // Check if there's a pending purchase for this listing
                const pendingPurchase = userPendingPurchases?.find(p => p.listingId === listing.id && p.status === 'pending_seller_confirmation');
                const isOwnListing = listing.sellerId === user?.id;
                
                return (
                  <Card key={listing.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="text-center">
                        <div className="text-6xl mb-4">{listing.toy?.imageUrl || "🎮"}</div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">{listing.toy?.name}</h3>
                        <Badge className={getRarityColor(listing.toy?.rarity)} variant="secondary">
                          {listing.toy?.rarity}
                        </Badge>
                        <p className="text-2xl font-bold text-green-600 mt-4 mb-2">
                          RP {parseFloat(listing.price || '0').toLocaleString('id-ID')}
                        </p>
                        <p className="text-sm text-slate-500 mb-4">
                          {language === "id" ? "Dijual oleh" : "Sold by"}: {listing.seller?.firstName || listing.seller?.email?.split('@')[0] || "User"}
                        </p>
                        
                        {isOwnListing ? (
                          <div className="space-y-2">
                            {pendingPurchase ? (
                              <div className="space-y-2">
                                <Badge variant="outline" className="w-full text-blue-600 border-blue-600">
                                  {language === "id" ? "Menunggu Konfirmasi Anda" : "Awaiting Your Confirmation"}
                                </Badge>
                                <Button 
                                  onClick={() => confirmPurchase(pendingPurchase.id)}
                                  className="w-full bg-blue-600 hover:bg-blue-700"
                                >
                                  <Check className="w-4 h-4 mr-2" />
                                  {language === "id" ? "Konfirmasi Penerimaan" : "Confirm Receipt"}
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Badge variant="outline" className="w-full text-orange-600 border-orange-600">
                                  {language === "id" ? "Milik Anda" : "Your Item"}
                                </Badge>
                                <Button 
                                  onClick={() => cancelListing(listing.id)} 
                                  className="w-full bg-red-600 hover:bg-red-700"
                                  variant="destructive"
                                >
                                  {language === "id" ? "Batalkan Penjualan" : "Cancel Sale"}
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : pendingPurchase && pendingPurchase.buyerId === user?.id ? (
                          <Badge variant="outline" className="w-full text-yellow-600 border-yellow-600">
                            {language === "id" ? "Menunggu Konfirmasi Penjual" : "Pending Seller Confirmation"}
                          </Badge>
                        ) : (
                          <Button 
                            onClick={() => buyToy(listing)} 
                            className="w-full"
                            disabled={userCredits < parseFloat(listing.price || '0')}
                          >
                            {userCredits >= parseFloat(listing.price || '0') ? 
                              (language === "id" ? "Beli" : "Buy") : 
                              (language === "id" ? "Kredit Kurang" : "Not enough credits")
                            }
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              }) : (
                <div className="col-span-full text-center py-12 text-slate-500">
                  <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium mb-2">
                    {language === "id" ? "Belum ada mainan dijual" : "No toys for sale yet"}
                  </h3>
                  <p className="text-sm">
                    {language === "id" ? "Jadilah yang pertama menjual mainan!" : "Be the first to sell a toy!"}
                  </p>
                </div>
              )}
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
              {/* Show pending purchases first */}
              {console.log("userPendingPurchases:", userPendingPurchases, "user.id:", user?.id)}
              {userPendingPurchases?.filter(p => p.buyerId === user?.id && p.status === 'pending_seller_confirmation').map((purchase) => (
                <Card key={`pending-${purchase.id}`} className="hover:shadow-lg transition-shadow border-yellow-200 bg-yellow-50">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="text-6xl mb-4">{purchase.toy?.imageUrl || "🎮"}</div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">{purchase.toy?.name}</h3>
                      <Badge className={getRarityColor(purchase.toy?.rarity)} variant="secondary">
                        {purchase.toy?.rarity}
                      </Badge>
                      <Badge className="mt-2 w-full bg-yellow-100 text-yellow-800 border-yellow-300">
                        {language === "id" ? "Menunggu Diterima" : "Awaiting Delivery"}
                      </Badge>
                      <div className="mt-4 space-y-2">
                        <p className="text-sm text-slate-600">
                          {language === "id" ? "Dibeli" : "Purchased"}: {new Date(purchase.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-lg font-bold text-green-600">
                          RP {parseFloat(purchase.amount || '0').toLocaleString('id-ID')}
                        </p>
                        <Button 
                          onClick={() => {
                            // Mark as received by buyer - this completes the transaction
                            confirmPurchaseMutation.mutate(purchase.id);
                            toast({
                              title: language === "id" ? "Transaksi Selesai!" : "Transaction Complete!",
                              description: language === "id" ? "Mainan telah ditambahkan ke koleksi Anda" : "Toy has been added to your collection",
                            });
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          {language === "id" ? "Konfirmasi Diterima" : "Confirm Received"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Show regular toy inventory */}
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

      {/* Purchase Confirmation Dialog */}
      {showPurchaseConfirmation && selectedPurchaseListing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {language === "id" ? "Konfirmasi Pembelian" : "Confirm Purchase"}
              </h3>
              <p className="text-slate-600 mb-4">
                {language === "id" ? "Apakah Anda yakin ingin membeli" : "Are you sure you want to buy"}
              </p>
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <div className="text-4xl mb-2">{selectedPurchaseListing.toy?.imageUrl || "🎮"}</div>
                <h4 className="font-bold text-slate-900">{selectedPurchaseListing.toy?.name}</h4>
                <p className="text-xl font-bold text-green-600 mt-2">
                  RP {parseFloat(selectedPurchaseListing.price || '0').toLocaleString('id-ID')}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  +{Math.floor(parseFloat(selectedPurchaseListing.price || '0') / 10000)} {language === "id" ? "poin loyalitas" : "loyalty points"}
                </p>
              </div>
              <p className="text-sm text-slate-600">
                {language === "id" 
                  ? "Kredit akan dipotong sekarang. Penjual harus mengkonfirmasi untuk menyelesaikan transaksi."
                  : "Credits will be deducted now. Seller must confirm to complete the transaction."
                }
              </p>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowPurchaseConfirmation(false);
                  setSelectedPurchaseListing(null);
                }}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                {language === "id" ? "Batal" : "Cancel"}
              </Button>
              <Button 
                onClick={confirmPurchaseDialog}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-2" />
                {language === "id" ? "Ya, Beli" : "Yes, Buy"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}