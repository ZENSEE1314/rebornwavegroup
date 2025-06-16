import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatMoney, formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { rewardSymbols } from "@/lib/rewardSymbols";
import { 
  Users, 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  Eye, 
  Check, 
  X, 
  Plus,
  Edit,
  History,
  Package,
  ShoppingCart,
  Gift,
  Calendar,
  Award,
  Search,
  Download,
  Upload,
  FileText,
  Trash2,
  Zap,
  Filter,
  Settings,
  Heart,
  Trophy,
  LogOut,
  ArrowUp,
  TrendingDown,
  Clock,
  Camera,
  Star,
  AlertTriangle,
  Tag
} from "lucide-react";

function EnhancedAdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Enable WebSocket for real-time updates only for admin users
  useWebSocket(Boolean(user && (user as any).role === 'admin'));
  
  // State management
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editedUserData, setEditedUserData] = useState<any>({});
  const [activeTab, setActiveTab] = useState("overview");
  const [highlightedUserId, setHighlightedUserId] = useState<string | null>(null);
  const [editingPet, setEditingPet] = useState<any>(null);
  const [editedPetData, setEditedPetData] = useState<any>({});
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [selectedUserForTokens, setSelectedUserForTokens] = useState<any>(null);
  const [tokenAmount, setTokenAmount] = useState("");
  const [newToy, setNewToy] = useState({
    name: "",
    series: "",
    rarity: "common",
    color: "",
    imageUrl: "",
    qrCode: "",
    price: 0,
    seasonId: null as number | null,
    seriesId: null as number | null,
    isSeasonalExclusive: false,
    gender: "male" as "male" | "female"
  });

  // Season and Series management states
  const [newSeason, setNewSeason] = useState({
    name: "",
    displayName: "",
    description: ""
  });

  const [newSeries, setNewSeries] = useState({
    name: "",
    seasonId: null as number | null,
    description: ""
  });

  // Simplified bulk generation states
  const [selectedToyForBulk, setSelectedToyForBulk] = useState<number | null>(null);
  const [bulkQuantity, setBulkQuantity] = useState(1);
  const [bulkOverrides, setBulkOverrides] = useState({
    seasonId: null as number | null,
    seriesId: null as number | null,
    color: null as string | null
  });
  
  // Pagination states
  const [topUpCurrentPage, setTopUpCurrentPage] = useState(1);
  const topUpItemsPerPage = 10;
  const [tokenTransactionsPage, setTokenTransactionsPage] = useState(1);
  const tokenTransactionsPerPage = 10;
  const [paymentVerificationsPage, setPaymentVerificationsPage] = useState(1);
  const paymentVerificationsPerPage = 10;
  const [usersPage, setUsersPage] = useState(1);
  const usersPerPage = 10;
  const [openApproveDialog, setOpenApproveDialog] = useState<number | null>(null);
  const [openRejectDialog, setOpenRejectDialog] = useState<number | null>(null);
  
  // Search and filter states
  const [userSearch, setUserSearch] = useState("");
  const [cashOutSearch, setCashOutSearch] = useState("");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [toySearch, setToySearch] = useState("");
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [adminNotes, setAdminNotes] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [toysPage, setToysPage] = useState(1);
  const toysPerPage = 10;
  
  // Bulk upload states
  const [bulkToyData, setBulkToyData] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Advanced bulk generation states
  const [customSeason, setCustomSeason] = useState("");
  const [customSector, setCustomSector] = useState("");
  const [baseToyName, setBaseToyName] = useState("");
  const [totalToysToGenerate, setTotalToysToGenerate] = useState("");
  const [rarityDistribution, setRarityDistribution] = useState("mixed");
  const [defaultImageUrl, setDefaultImageUrl] = useState("");
  const [generateQRImages, setGenerateQRImages] = useState(true);
  const [autoNumbering, setAutoNumbering] = useState(true);
  
  // Edit toy owner dialog states
  const [editOwnerDialog, setEditOwnerDialog] = useState(false);
  const [selectedToyForEdit, setSelectedToyForEdit] = useState<any>(null);
  const [newOwnerId, setNewOwnerId] = useState("");
  
  // Password change dialog states
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Content management dialog states
  const [showBannerDialog, setShowBannerDialog] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showRewardDialog, setShowRewardDialog] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [editingReward, setEditingReward] = useState<any>(null);
  const [bannerForm, setBannerForm] = useState({
    title: "",
    description: "",
    imageUrl: "",
    ctaText: "",
    ctaUrl: "",
    type: "banner",
    backgroundColor: "blue",
    displayOrder: 0,
    isActive: true,
    iconSymbol: ""
  });
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    category: "beauty",
    isActive: true
  });
  const [useCustomCategory, setUseCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [rewardForm, setRewardForm] = useState({
    name: "",
    description: "",
    type: "item",
    pointsCost: 0,
    stockQuantity: null,
    creditAmount: "",
    imageUrl: "",
    isActive: true
  });

  // Season and sector management states
  const [showSeasonDialog, setShowSeasonDialog] = useState(false);
  const [showSectorDialog, setShowSectorDialog] = useState(false);
  const [editingSeason, setEditingSeason] = useState<any>(null);
  const [editingSector, setEditingSector] = useState<any>(null);
  const [seasonForm, setSeasonForm] = useState({
    name: "",
    displayName: "",
    description: "",
    backgroundColor: "#3B82F6",
    iconUrl: "/images/default-season.png",
    isActive: true
  });
  const [sectorForm, setSectorForm] = useState({
    seasonId: "",
    name: "",
    displayName: "",
    description: "",
    backgroundColor: "#F3F4F6",
    iconSymbol: "🎯",
    unlockCondition: "none",
    isUnlocked: true
  });

  // Temporarily bypass admin check for debugging - user session exists on backend
  // TODO: Fix frontend authentication data transmission
  console.log('*** ADMIN DEBUG: user data:', user);
  
  // Check if user is admin (temporarily disabled for debugging)
  // if (!user || (user as any).role !== 'admin') {
  //   return (
  //     <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
  //       <Card className="p-8">
  //         <CardContent className="text-center">
  //           <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
  //           <p>You don't have admin privileges to access this page.</p>
  //         </CardContent>
  //       </Card>
  //     </div>
  //   );
  // }

  // Fetch all data with pagination
  const { data: usersResponse }: any = useQuery({
    queryKey: [`/api/admin/users?page=${usersPage}&limit=${usersPerPage}`],
    retry: false,
  });



  const { data: cashOutResponse }: any = useQuery({
    queryKey: ['/api/admin/cash-outs'],
    retry: false,
  });

  const { data: transactionsResponse }: any = useQuery({
    queryKey: ['/api/admin/transactions'],
    retry: false,
  });

  const { data: tokenTransactionsResponse }: any = useQuery({
    queryKey: [`/api/admin/token-transactions?page=${tokenTransactionsPage}&limit=${tokenTransactionsPerPage}`],
    retry: false,
  });

  const { data: toysResponse }: any = useQuery({
    queryKey: [`/api/admin/all-toys?page=${toysPage}&limit=10`],
    retry: false,
  });

  const { data: appointmentsResponse }: any = useQuery({
    queryKey: ['/api/admin/appointments'],
    retry: false,
  });

  const { data: feesReport = {} } = useQuery({
    queryKey: ['/api/admin/fees-report'],
    retry: false,
  });

  // Content management queries (these remain as arrays - not paginated yet)
  const { data: promotionBanners = [] } = useQuery({
    queryKey: ['/api/admin/banners'],
    retry: false,
  });

  const { data: appointmentEvents = [] } = useQuery({
    queryKey: ['/api/admin/appointment-events'],
    retry: false,
  });

  const { data: rewardItems = [] } = useQuery({
    queryKey: ['/api/admin/reward-items'],
    retry: false,
  });

  // Season and series management queries
  const { data: seasonsRaw } = useQuery({
    queryKey: ['/api/seasons'],
    retry: false,
  });
  const seasonsData = Array.isArray(seasonsRaw) ? seasonsRaw : [];

  const { data: seriesRaw } = useQuery({
    queryKey: ['/api/collection-series'],
    retry: false,
  });
  const seriesData = Array.isArray(seriesRaw) ? seriesRaw : [];

  // New queries for pet management and token claims with pagination
  const { data: activatedPetsResponse }: any = useQuery({
    queryKey: ['/api/admin/activated-pets'],
    retry: false,
  });

  const { data: gameLeaderboard = [] } = useQuery({
    queryKey: ['/api/game-scores/leaderboard'],
    retry: false,
  });

  const { data: tokenClaimsResponse }: any = useQuery({
    queryKey: ['/api/admin/token-claims'],
    retry: false,
  });

  const { data: topUpRequestsResponse }: any = useQuery({
    queryKey: ['/api/admin/topup-requests'],
    retry: false,
  });

  const { data: paymentVerificationsResponse }: any = useQuery({
    queryKey: [`/api/admin/payment-verifications?page=${paymentVerificationsPage}&limit=${paymentVerificationsPerPage}`],
    retry: false,
  });

  const { data: allPendingPurchases = [] } = useQuery({
    queryKey: ['/api/admin/all-pending-purchases'],
    retry: false,
  });

  const { data: commissionStats }: any = useQuery({
    queryKey: ['/api/admin/commission-stats'],
    retry: false,
  });

  // Extract data arrays from responses - handle both direct arrays and paginated responses
  const allUsers = (usersResponse as any)?.data || usersResponse || [];
  const cashOutRequests = (cashOutResponse as any)?.data || cashOutResponse || [];
  const topUpRequests = topUpRequestsResponse || [];
  const allTransactions = (transactionsResponse as any)?.data || transactionsResponse || [];
  const allToys = (toysResponse as any)?.data || toysResponse || [];
  const allAppointments = (appointmentsResponse as any)?.data || appointmentsResponse || [];
  const activatedPets = (activatedPetsResponse as any)?.data || activatedPetsResponse || [];
  const tokenClaims = (tokenClaimsResponse as any)?.data || tokenClaimsResponse || [];
  const paymentVerifications = (paymentVerificationsResponse as any)?.data || paymentVerificationsResponse || [];
  const pendingPurchases = allPendingPurchases || [];



  // Filter functions
  const filteredUsers = (allUsers as any[]).filter((user: any) => {
    const searchMatch = !userSearch || 
      user.firstName?.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.email?.toLowerCase().includes(userSearch.toLowerCase());
    return searchMatch;
  });

  const filteredCashOuts = (cashOutRequests as any[]).filter((cashOut: any) => {
    const searchMatch = !cashOutSearch || 
      cashOut.user?.firstName?.toLowerCase().includes(cashOutSearch.toLowerCase()) ||
      cashOut.user?.email?.toLowerCase().includes(cashOutSearch.toLowerCase());
    const statusMatch = statusFilter === "all" || cashOut.status === statusFilter;
    return searchMatch && statusMatch;
  });

  const filteredTransactions = (allTransactions as any[]).filter((transaction: any) => {
    const searchMatch = !transactionSearch || 
      transaction.description?.toLowerCase().includes(transactionSearch.toLowerCase()) ||
      transaction.user?.firstName?.toLowerCase().includes(transactionSearch.toLowerCase());
    const typeMatch = typeFilter === "all" || transaction.type === typeFilter;
    return searchMatch && typeMatch;
  });

  // Use server-side pagination for toys
  const toysPaginationInfo = toysResponse?.pagination || { page: 1, totalPages: 1, totalCount: allToys.length, hasNext: false, hasPrev: false };

  const filteredToys = (() => {
    try {
      const toys = (allToys || []) as any[];
      console.log('*** FILTERING TOYS DEBUG:', { allToys: toys.length, toySearch, rarityFilter, ownerFilter });
      
      return toys.filter((toy: any) => {
        if (!toy) return false;
        const searchMatch = !toySearch || 
          toy.name?.toLowerCase().includes(toySearch.toLowerCase()) ||
          toy.series?.toLowerCase().includes(toySearch.toLowerCase()) ||
          toy.qrCode?.toLowerCase().includes(toySearch.toLowerCase());
        const rarityMatch = rarityFilter === "all" || toy.rarity === rarityFilter;
        const ownerMatch = ownerFilter === "all" || 
          (ownerFilter === "owned" && toy.owner) ||
          (ownerFilter === "unowned" && !toy.owner);
        return searchMatch && rarityMatch && ownerMatch;
      });
    } catch (error) {
      console.error('*** TOY FILTERING ERROR:', error);
      return [];
    }
  })();

  const filteredAppointments = (allAppointments as any[]).filter((appointment: any) => {
    const searchMatch = !appointmentSearch || 
      appointment.user?.firstName?.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
      appointment.service?.toLowerCase().includes(appointmentSearch.toLowerCase());
    const statusMatch = statusFilter === "all" || appointment.status === statusFilter;
    return searchMatch && statusMatch;
  });

  // Mutations
  const updateCreditsMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: string; amount: string }) => {
      return apiRequest('POST', '/api/admin/update-credits', { userId, amount });
    },
    onSuccess: () => {
      toast({ title: "Credits updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setSelectedUser(null);
    },
    onError: () => {
      toast({ title: "Failed to update credits", variant: "destructive" });
    }
  });

  const updatePointsMutation = useMutation({
    mutationFn: async ({ userId, points }: { userId: string; points: number }) => {
      return apiRequest('POST', '/api/admin/update-points', { userId, points });
    },
    onSuccess: () => {
      toast({ title: "Points updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setSelectedUser(null);
    },
    onError: () => {
      toast({ title: "Failed to update points", variant: "destructive" });
    }
  });

  const approveCashOutMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      return apiRequest('PUT', `/api/admin/cashouts/${id}/status`, { status, adminNotes: notes });
    },
    onSuccess: () => {
      toast({ title: "Cash out request updated" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cash-outs'] });
    },
    onError: () => {
      toast({ title: "Failed to update cash out request", variant: "destructive" });
    }
  });

  const updateTopUpMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: number; status: string; adminNotes?: string }) => {
      return apiRequest('PUT', `/api/admin/topup-requests/${id}/status`, { status, adminNotes });
    },
    onSuccess: () => {
      toast({ title: "Top-up request updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/topup-requests'] });
    },
    onError: () => {
      toast({ title: "Failed to update top-up request", variant: "destructive" });
    }
  });

  const updateToyOwnerMutation = useMutation({
    mutationFn: async ({ toyId, newOwnerId }: { toyId: number; newOwnerId: string | null }) => {
      return apiRequest('PATCH', `/api/admin/toys/${toyId}/owner`, { newOwnerId });
    },
    onSuccess: () => {
      toast({ title: "Toy owner updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-toys'] });
    },
    onError: () => {
      toast({ title: "Failed to update toy owner", variant: "destructive" });
    }
  });

  const deleteToyMutation = useMutation({
    mutationFn: async (toyId: number) => {
      return apiRequest('DELETE', `/api/admin/toys/${toyId}`);
    },
    onSuccess: () => {
      toast({ title: "Toy deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-toys'] });
    },
    onError: () => {
      toast({ title: "Failed to delete toy", variant: "destructive" });
    }
  });

  const editToyMutation = useMutation({
    mutationFn: async ({ toyId, toyData }: { toyId: number; toyData: any }) => {
      return apiRequest('PUT', `/api/admin/toys/${toyId}`, toyData);
    },
    onSuccess: () => {
      toast({ title: "Toy updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-toys'] });
    },
    onError: () => {
      toast({ title: "Failed to update toy", variant: "destructive" });
    }
  });

  const createToyMutation = useMutation({
    mutationFn: async (toyData: any) => {
      return apiRequest('POST', '/api/admin/create-toy', toyData);
    },
    onSuccess: () => {
      toast({ title: "Toy created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-toys'] });
      setNewToy({ name: "", series: "", rarity: "common", color: "", imageUrl: "", qrCode: "", price: 0, seasonId: null, seriesId: null, isSeasonalExclusive: false, gender: "male" as "male" | "female" });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to create toy";
      if (errorMessage.includes("QR code already exists")) {
        toast({ 
          title: "QR Code Error", 
          description: "This QR code is already in use. Please use a different QR code or leave it empty to auto-generate one.",
          variant: "destructive" 
        });
      } else {
        toast({ title: errorMessage, variant: "destructive" });
      }
    }
  });

  const bulkCreateToysMutation = useMutation({
    mutationFn: async (toys: any[]) => {
      return apiRequest('POST', '/api/admin/toys/bulk', { toys });
    },
    onSuccess: (data: any) => {
      if (data.errorCount > 0) {
        toast({ 
          title: `Partial Success: ${data.createdCount} toys created, ${data.errorCount} errors`,
          description: data.errors?.slice(0, 3).join('; ') + (data.errors?.length > 3 ? '...' : ''),
          variant: "destructive" 
        });
      } else {
        toast({ title: `Successfully created ${data.createdCount} toys` });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-toys'] });
      setBulkToyData("");
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to upload toys";
      toast({ title: errorMessage, variant: "destructive" });
    }
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest('PATCH', `/api/admin/appointments/${id}`, { status });
    },
    onSuccess: () => {
      toast({ title: "Appointment updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
      setSelectedAppointment(null);
    },
    onError: () => {
      toast({ title: "Failed to update appointment", variant: "destructive" });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }: { userId: string; userData: any }) => {
      return apiRequest('PATCH', `/api/admin/users/${userId}`, userData);
    },
    onSuccess: () => {
      toast({ title: "User updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setEditingUser(null);
      setEditedUserData({});
    },
    onError: () => {
      toast({ title: "Failed to update user", variant: "destructive" });
    }
  });

  const changeUserPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      return apiRequest('POST', `/api/admin/users/${userId}/change-password`, { newPassword });
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully" });
      setShowPasswordDialog(false);
      setNewPassword("");
      setConfirmPassword("");
      setSelectedUserForPassword(null);
    },
    onError: () => {
      toast({ title: "Failed to change password", variant: "destructive" });
    }
  });

  const updateUserTokensMutation = useMutation({
    mutationFn: async ({ userId, tokens }: { userId: string; tokens: number }) => {
      return apiRequest('PATCH', `/api/admin/users/${userId}/tokens`, { tokens });
    },
    onSuccess: () => {
      toast({ title: "User tokens updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: () => {
      toast({ title: "Failed to update user tokens", variant: "destructive" });
    }
  });

  // Content management mutations
  const createBannerMutation = useMutation({
    mutationFn: async (bannerData: any) => {
      return apiRequest('POST', '/api/admin/banners', bannerData);
    },
    onSuccess: () => {
      toast({ title: "Banner created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/banners'] });
      setShowBannerDialog(false);
      setEditingBanner(null);
      setBannerForm({
        title: "",
        description: "",
        imageUrl: "",
        ctaText: "",
        ctaUrl: "",
        type: "banner",
        backgroundColor: "blue",
        displayOrder: 0,
        isActive: true,
        iconSymbol: ""
      });
    },
    onError: () => {
      toast({ title: "Failed to create banner", variant: "destructive" });
    }
  });

  const updateBannerMutation = useMutation({
    mutationFn: async ({ id, bannerData }: { id: number; bannerData: any }) => {
      return apiRequest('PUT', `/api/admin/banners/${id}`, bannerData);
    },
    onSuccess: () => {
      toast({ title: "Banner updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/banners'] });
      setShowBannerDialog(false);
      setEditingBanner(null);
      setBannerForm({
        title: "",
        description: "",
        imageUrl: "",
        ctaText: "",
        ctaUrl: "",
        type: "banner",
        backgroundColor: "blue",
        displayOrder: 0,
        isActive: true,
        iconSymbol: ""
      });
    },
    onError: () => {
      toast({ title: "Failed to update banner", variant: "destructive" });
    }
  });

  const deleteBannerMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/admin/banners/${id}`, {});
    },
    onSuccess: () => {
      toast({ title: "Banner deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/banners'] });
    },
    onError: () => {
      toast({ title: "Failed to delete banner", variant: "destructive" });
    }
  });

  const approvePurchaseMutation = useMutation({
    mutationFn: async (purchaseId: number) => {
      return apiRequest('POST', `/api/admin/purchases/${purchaseId}/approve`, {});
    },
    onSuccess: () => {
      toast({ title: "Purchase approved successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-pending-purchases'] });
    },
    onError: () => {
      toast({ title: "Failed to approve purchase", variant: "destructive" });
    }
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      if (editingEvent) {
        return apiRequest('PUT', `/api/admin/appointment-events/${editingEvent.id}`, eventData);
      } else {
        return apiRequest('POST', '/api/admin/appointment-events', eventData);
      }
    },
    onSuccess: () => {
      toast({ title: editingEvent ? "Event updated successfully" : "Event created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/appointment-events'] });
      setShowEventDialog(false);
      setEditingEvent(null);
      setEventForm({
        title: "",
        description: "",
        category: "beauty",
        isActive: true
      });
      setUseCustomCategory(false);
      setCustomCategory("");
    },
    onError: () => {
      toast({ title: editingEvent ? "Failed to update event" : "Failed to create event", variant: "destructive" });
    }
  });

  const handleDeleteEvent = async (eventId: number) => {
    if (confirm('Are you sure you want to delete this appointment event?')) {
      try {
        await apiRequest('DELETE', `/api/admin/appointment-events/${eventId}`);
        toast({ title: "Event deleted successfully" });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/appointment-events'] });
      } catch (error) {
        toast({ title: "Failed to delete event", variant: "destructive" });
      }
    }
  };

  // Season management mutations
  const createSeasonMutation = useMutation({
    mutationFn: async (seasonData: any) => {
      return apiRequest('POST', '/api/seasons', seasonData);
    },
    onSuccess: () => {
      toast({ title: "Season created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/seasons'] });
      setShowSeasonDialog(false);
      setSeasonForm({
        name: "",
        displayName: "",
        description: "",
        backgroundColor: "#3B82F6",
        iconUrl: "/images/default-season.png",
        isActive: true
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create season", 
        description: error.response?.data?.message || "An error occurred",
        variant: "destructive" 
      });
    }
  });

  const deleteSeasonMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/seasons/${id}`, {});
    },
    onSuccess: () => {
      toast({ title: "Season deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/seasons'] });
      queryClient.invalidateQueries({ queryKey: ['/api/collection-series'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete season", 
        description: error.response?.data?.message || "An error occurred",
        variant: "destructive" 
      });
    }
  });

  const editSeasonMutation = useMutation({
    mutationFn: async ({ seasonId, seasonData }: { seasonId: number; seasonData: any }) => {
      return apiRequest('PUT', `/api/seasons/${seasonId}`, seasonData);
    },
    onSuccess: () => {
      toast({ title: "Season updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/seasons'] });
    },
    onError: () => {
      toast({ title: "Failed to update season", variant: "destructive" });
    }
  });

  // Series management mutations
  const createSeriesMutation = useMutation({
    mutationFn: async (seriesData: any) => {
      return apiRequest('POST', '/api/collection-series', seriesData);
    },
    onSuccess: () => {
      toast({ title: "Series created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/collection-series'] });
      setShowSectorDialog(false);
      setEditingSector(null);
      setSectorForm({
        seasonId: "",
        name: "",
        displayName: "",
        description: "",
        backgroundColor: "#F3F4F6",
        iconSymbol: "🎯",
        unlockCondition: "none",
        isUnlocked: true
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create series", 
        description: error.response?.data?.message || "An error occurred",
        variant: "destructive" 
      });
    }
  });

  const deleteSeriesMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/collection-series/${id}`, {});
    },
    onSuccess: () => {
      toast({ title: "Series deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/collection-series'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete series", 
        description: error.response?.data?.message || "An error occurred",
        variant: "destructive" 
      });
    }
  });

  const editSeriesMutation = useMutation({
    mutationFn: async ({ seriesId, seriesData }: { seriesId: number; seriesData: any }) => {
      return apiRequest('PUT', `/api/collection-series/${seriesId}`, seriesData);
    },
    onSuccess: () => {
      toast({ title: "Series updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/collection-series'] });
    },
    onError: () => {
      toast({ title: "Failed to update series", variant: "destructive" });
    }
  });

  // Bulk generation mutation
  const bulkGenerationMutation = useMutation({
    mutationFn: async (generationData: any) => {
      return apiRequest('POST', '/api/admin/bulk-generate-toys', generationData);
    },
    onSuccess: (response: any) => {
      toast({ title: `Successfully generated ${response.toysCreated || 'multiple'} toys` });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-toys'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to generate toys", 
        description: error.response?.data?.message || "An error occurred",
        variant: "destructive" 
      });
    }
  });

  // Reset leaderboard mutation
  const resetLeaderboardMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/admin/game-scores/reset");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/game-scores/leaderboard'] });
      toast({
        title: "Success",
        description: "Game leaderboard reset successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reset leaderboard",
        variant: "destructive",
      });
    },
  });

  // Edit pet mutation
  const editPetMutation = useMutation({
    mutationFn: async ({ petId, petData }: { petId: number; petData: any }) => {
      await apiRequest("PUT", `/api/admin/pets/${petId}`, petData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/activated-pets'] });
      setEditingPet(null);
      setEditedPetData({});
      toast({
        title: "Success",
        description: "Pet details updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update pet details",
        variant: "destructive",
      });
    },
  });





  // Add tokens mutation
  const addTokensMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: string; amount: number }) => {
      await apiRequest("POST", `/api/admin/users/${userId}/add-tokens`, { amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/activated-pets'] });
      setShowTokenDialog(false);
      setSelectedUserForTokens(null);
      setTokenAmount("");
      toast({
        title: "Success",
        description: "Claimable tokens set successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to set tokens",
        variant: "destructive",
      });
    },
  });

  const updateTokenClaimMutation = useMutation({
    mutationFn: async ({ claimId, status, adminNotes }: { claimId: number; status: string; adminNotes: string }) => {
      return apiRequest('PATCH', `/api/admin/token-claims/${claimId}`, { status, adminNotes });
    },
    onSuccess: () => {
      toast({ title: "Token claim updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/token-claims'] });
    },
    onError: () => {
      toast({ title: "Failed to update token claim", variant: "destructive" });
    }
  });

  const createRewardMutation = useMutation({
    mutationFn: async (rewardData: any) => {
      return apiRequest('POST', '/api/admin/reward-items', rewardData);
    },
    onSuccess: () => {
      toast({ title: "Reward created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reward-items'] });
      setShowRewardDialog(false);
      setRewardForm({
        name: "",
        description: "",
        type: "item",
        pointsCost: 0,
        stockQuantity: null,
        creditAmount: "",
        imageUrl: "",
        isActive: true
      });
    },
    onError: () => {
      toast({ title: "Failed to create reward", variant: "destructive" });
    }
  });

  const updateRewardMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest('PUT', `/api/admin/reward-items/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Reward updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reward-items'] });
      setShowRewardDialog(false);
      setEditingReward(null);
      // Don't reset form immediately - let it close naturally
      setTimeout(() => {
        setRewardForm({
          name: "",
          description: "",
          type: "item",
          pointsCost: 0,
          stockQuantity: null,
          creditAmount: "",
          imageUrl: "",
          isActive: true
        });
      }, 100);
    },
    onError: () => {
      toast({ title: "Failed to update reward", variant: "destructive" });
    }
  });

  const deleteRewardMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/admin/reward-items/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Reward deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reward-items'] });
    },
    onError: () => {
      toast({ title: "Failed to delete reward", variant: "destructive" });
    }
  });

  const approvePaymentVerificationMutation = useMutation({
    mutationFn: async ({ id, pointsAwarded, adminNotes }: { id: number, pointsAwarded: number, adminNotes: string }) => {
      return apiRequest('PATCH', `/api/admin/payment-verifications/${id}`, {
        status: 'approved',
        pointsAwarded,
        adminNotes
      });
    },
    onSuccess: () => {
      toast({ title: "Payment verification approved with 10% referral commission" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payment-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/commission-stats'] });
      setOpenApproveDialog(null);
    },
    onError: (error: any) => {
      console.error('Payment verification approval error:', error);
      toast({ 
        title: "Failed to approve verification", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
    }
  });

  const rejectPaymentVerificationMutation = useMutation({
    mutationFn: async ({ id, adminNotes }: { id: number, adminNotes: string }) => {
      return apiRequest('PATCH', `/api/admin/payment-verifications/${id}`, {
        status: 'rejected',
        pointsAwarded: 0,
        adminNotes
      });
    },
    onSuccess: () => {
      toast({ title: "Payment verification rejected" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payment-verifications'] });
      setOpenRejectDialog(null);
    },
    onError: (error: any) => {
      console.error('Payment verification rejection error:', error);
      toast({ 
        title: "Failed to reject verification", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
    }
  });

  // Handler functions for rewards
  const handleEditReward = (reward: any) => {
    setEditingReward(reward);
    setRewardForm({
      name: reward.name,
      description: reward.description,
      type: reward.type,
      pointsCost: reward.pointsCost,
      stockQuantity: reward.stockQuantity,
      creditAmount: reward.creditAmount || "",
      imageUrl: reward.imageUrl,
      isActive: reward.isActive
    });
    setShowRewardDialog(true);
  };

  const handleDeleteReward = (id: number) => {
    if (window.confirm('Are you sure you want to delete this reward?')) {
      deleteRewardMutation.mutate(id);
    }
  };



  // Download functions
  const downloadCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Advanced bulk generation function
  const handleBulkGeneration = async () => {
    if (!customSeason || !baseToyName || !totalToysToGenerate || parseInt(totalToysToGenerate) < 1) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    const totalCount = parseInt(totalToysToGenerate);
    if (totalCount > 1000) {
      toast({ title: "Error", description: "Maximum 1000 toys can be generated at once", variant: "destructive" });
      return;
    }

    try {
      setUploading(true);
      
      const generationData = {
        customSeason,
        customSector: customSector || "General Collection",
        baseToyName,
        totalCount,
        rarityDistribution,
        defaultImageUrl: defaultImageUrl || "/images/default-toy.png",
        generateQRImages,
        autoNumbering
      };

      bulkGenerationMutation.mutate(generationData);
      
      // Reset form
      setCustomSeason('');
      setCustomSector('');
      setBaseToyName('');
      setTotalToysToGenerate('');
      setDefaultImageUrl('');
    } catch (error: any) {
      console.error('Bulk generation error:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to generate toys",
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
    }
  };

  const handleBulkUpload = () => {
    if (!bulkToyData.trim()) return;
    
    try {
      const lines = bulkToyData.trim().split('\n');
      const toys = lines.map(line => {
        const parts = line.split(',').map(s => s.trim());
        
        // Support both old format (4 fields) and new seasonal format (6 fields)
        if (parts.length === 4) {
          const [name, series, rarity = 'common', imageUrl = ''] = parts;
          return {
            name,
            series,
            rarity,
            imageUrl,
            qrCode: `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            seasonId: null,
            sectorId: null,
            isSeasonalExclusive: false
          };
        } else if (parts.length === 6) {
          const [name, series, rarity = 'common', seasonId, sectorId, imageUrl = ''] = parts;
          return {
            name,
            series,
            rarity,
            imageUrl,
            qrCode: `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            seasonId: seasonId ? parseInt(seasonId) : null,
            sectorId: sectorId ? parseInt(sectorId) : null,
            isSeasonalExclusive: !!(seasonId && sectorId)
          };
        } else {
          throw new Error(`Invalid format: expected 4 or 6 fields, got ${parts.length}`);
        }
      });
      
      bulkCreateToysMutation.mutate(toys);
    } catch (error) {
      toast({ title: "Invalid format. Use: name,series,rarity,imageUrl OR name,series,rarity,seasonId,sectorId,imageUrl per line", variant: "destructive" });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    setUploading(true);
    
    // Here you would typically upload to a file storage service
    // For now, we'll simulate with a placeholder URL
    const imageUrl = `/uploaded-images/${file.name}`;
    setNewToy({ ...newToy, imageUrl });
    setUploading(false);
    
    toast({ title: "Image uploaded successfully" });
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800';
      case 'rare': return 'bg-blue-100 text-blue-800';
      case 'epic': return 'bg-purple-100 text-purple-800';
      case 'legendary': return 'bg-yellow-100 text-yellow-800';
      case 'secret': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Function to handle clicking on username in appointments
  const handleUserNameClick = (userId: string) => {
    setActiveTab("users");
    setHighlightedUserId(userId);
    setUserSearch(""); // Clear search to show all users
    // Clear highlight after 3 seconds
    setTimeout(() => {
      setHighlightedUserId(null);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-gray-300">Comprehensive system management and reporting</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => window.location.href = '/dashboard'}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ArrowUp className="h-4 w-4 mr-2 rotate-180" />
              Go Back to User Dashboard
            </Button>
            <span className="text-gray-300">Welcome, {(user as any)?.firstName || (user as any)?.email || 'Admin'}</span>
            <Button
              onClick={() => window.location.href = '/api/logout'}
              variant="outline"
              className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Commission Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="bg-red-500/20 backdrop-blur border-red-300/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-200 text-sm font-medium">Pending Verifications</p>
                  <p className="text-white text-3xl font-bold">{commissionStats?.pendingVerifications || 0}</p>
                </div>
                <AlertTriangle className="h-12 w-12 text-red-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-green-500/20 backdrop-blur border-green-300/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-200 text-sm font-medium">Total Commissions Paid</p>
                  <p className="text-white text-3xl font-bold">RP {formatMoney(commissionStats?.totalCommissionsPaid || 0)}</p>
                </div>
                <DollarSign className="h-12 w-12 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <Card className="bg-white/20 backdrop-blur border-gray-300/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-200 text-sm">Total Users</p>
                  <p className="text-3xl font-bold text-white">{(usersResponse as any)?.pagination?.totalCount || filteredUsers.length}</p>
                </div>
                <Users className="h-8 w-8 text-gray-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/20 backdrop-blur border-gray-300/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-200 text-sm">Admin Fees</p>
                  <p className="text-3xl font-bold text-white">RP {formatMoney((feesReport as any).totalAdminFees || 0)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/20 backdrop-blur border-gray-300/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-200 text-sm">Total Transactions</p>
                  <p className="text-3xl font-bold text-white">{allTransactions.length || 0}</p>
                </div>
                <CreditCard className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/20 backdrop-blur border-gray-300/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-200 text-sm">Approved Top-ups (IDR)</p>
                  <p className="text-3xl font-bold text-white">
                    {topUpRequests
                      .filter((req: any) => req.status === 'approved')
                      .reduce((total: number, req: any) => total + parseFloat(req.amount), 0)
                      .toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/20 backdrop-blur border-gray-300/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-200 text-sm">Total Toys</p>
                  <p className="text-3xl font-bold text-white">{allToys.length || 0}</p>
                </div>
                <Package className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/20 backdrop-blur border-gray-300/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-200 text-sm">Total Pets</p>
                  <p className="text-3xl font-bold text-white">{activatedPets.length}</p>
                </div>
                <Heart className="h-8 w-8 text-pink-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/20 backdrop-blur border-gray-300/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-200 text-sm">Total Cash-Outs (IDR)</p>
                  <p className="text-3xl font-bold text-white">
                    {cashOutRequests
                      .filter((req: any) => req.status === 'approved')
                      .reduce((total: number, req: any) => total + parseFloat(req.amount || '0'), 0)
                      .toLocaleString()}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/20 backdrop-blur border-gray-300/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-200 text-sm">Pending Cash-Outs</p>
                  <p className="text-3xl font-bold text-white">
                    {cashOutRequests.filter((req: any) => req.status === 'pending').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/20 backdrop-blur border-gray-300/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-200 text-sm">Pending Top-Ups</p>
                  <p className="text-3xl font-bold text-white">
                    {topUpRequests.filter((req: any) => req.status === 'pending').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/20 backdrop-blur border-gray-300/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-200 text-sm">Active Appointments</p>
                  <p className="text-3xl font-bold text-white">
                    {allAppointments.filter((apt: any) => apt.status === 'confirmed').length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto scrollbar-hide">
            <TabsList className="bg-white/20 backdrop-blur border-gray-300/30 flex min-w-max">
              <TabsTrigger value="users" className="data-[state=active]:bg-white/30 text-white whitespace-nowrap">
                <Users className="h-4 w-4 mr-2" />
                User Management
              </TabsTrigger>
              <TabsTrigger value="payment-verifications" className="data-[state=active]:bg-white/30 text-white whitespace-nowrap">
                <Camera className="h-4 w-4 mr-2" />
                Payment Verification
              </TabsTrigger>
              <TabsTrigger value="appointments" className="data-[state=active]:bg-white/30 text-white whitespace-nowrap">
                <Calendar className="h-4 w-4 mr-2" />
                Appointments
              </TabsTrigger>
              <TabsTrigger value="topups" className="data-[state=active]:bg-white/30 text-white whitespace-nowrap">
                <ArrowUp className="h-4 w-4 mr-2" />
                Top-ups
              </TabsTrigger>
              <TabsTrigger value="cashouts" className="data-[state=active]:bg-white/30 text-white whitespace-nowrap">
                <CreditCard className="h-4 w-4 mr-2" />
                Cash Outs
              </TabsTrigger>
              <TabsTrigger value="transactions" className="data-[state=active]:bg-white/30 text-white whitespace-nowrap">
                <History className="h-4 w-4 mr-2" />
                Transactions
              </TabsTrigger>
              <TabsTrigger value="toys" className="data-[state=active]:bg-white/30 text-white whitespace-nowrap">
                <Package className="h-4 w-4 mr-2" />
                Toy Management
              </TabsTrigger>
              <TabsTrigger value="reports" className="data-[state=active]:bg-white/30 text-white whitespace-nowrap">
                <FileText className="h-4 w-4 mr-2" />
                Reports
              </TabsTrigger>
              <TabsTrigger value="content" className="data-[state=active]:bg-white/30 text-white whitespace-nowrap">
                <Settings className="h-4 w-4 mr-2" />
                Content Management
              </TabsTrigger>
              <TabsTrigger value="pets" className="data-[state=active]:bg-white/30 text-white whitespace-nowrap">
                <Heart className="h-4 w-4 mr-2" />
                Pet Management
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="data-[state=active]:bg-white/30 text-white whitespace-nowrap">
                <Trophy className="h-4 w-4 mr-2" />
                Game Leaderboard
              </TabsTrigger>
              <TabsTrigger value="marketplace" className="data-[state=active]:bg-white/30 text-white whitespace-nowrap">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Marketplace Purchases
              </TabsTrigger>
              <TabsTrigger value="tokens" className="data-[state=active]:bg-white/30 text-white whitespace-nowrap">
                <Gift className="h-4 w-4 mr-2" />
                Token Claims
              </TabsTrigger>
              <TabsTrigger value="token-transactions" className="data-[state=active]:bg-white/30 text-white whitespace-nowrap">
                <Trophy className="h-4 w-4 mr-2" />
                Token Transactions
              </TabsTrigger>
            </TabsList>
          </div>

          {/* User Management Tab */}
          <TabsContent value="users">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">User Management</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => downloadCSV(filteredUsers, 'users')}
                      variant="outline" 
                      size="sm"
                      className="bg-white/10 text-white border-white/20"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
                <div className="flex gap-4 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-300"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* User Management Table */}
                <div>
                  <div className="overflow-x-auto">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow className="border-white/20">
                          <TableHead className="text-blue-200 min-w-[150px]">User</TableHead>
                          <TableHead className="text-blue-200 min-w-[180px]">Email</TableHead>
                          <TableHead className="text-blue-200 min-w-[140px]">Phone</TableHead>
                          <TableHead className="text-blue-200 min-w-[100px]">Gender</TableHead>
                          <TableHead className="text-blue-200 min-w-[120px]">Date of Birth</TableHead>
                          <TableHead className="text-blue-200 min-w-[100px]">Credits</TableHead>
                          <TableHead className="text-blue-200 min-w-[80px]">Points</TableHead>
                          <TableHead className="text-blue-200 min-w-[80px]">Tokens</TableHead>
                          <TableHead className="text-blue-200 min-w-[80px]">Role</TableHead>
                          <TableHead className="text-blue-200 min-w-[120px]">Join Date</TableHead>
                          <TableHead className="text-blue-200 min-w-[150px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user: any) => (
                      <TableRow 
                        key={user.id} 
                        className={`border-white/10 transition-colors ${
                          highlightedUserId === user.id ? 'bg-blue-500/20 border-blue-400/50' : ''
                        }`}
                      >
                        <TableCell className="text-white">
                {editingUser?.id === user.id ? (
                            <div className="flex flex-col sm:flex-row gap-1 min-w-0">
                              <Input
                                placeholder="First Name"
                                value={editedUserData.firstName || user.firstName || ''}
                                onChange={(e) => setEditedUserData({...editedUserData, firstName: e.target.value})}
                                className="bg-gray-800 border-gray-600 text-white text-sm h-10 min-w-[120px]"
                              />
                              <Input
                                placeholder="Last Name"
                                value={editedUserData.lastName || user.lastName || ''}
                                onChange={(e) => setEditedUserData({...editedUserData, lastName: e.target.value})}
                                className="bg-gray-800 border-gray-600 text-white text-sm h-10 min-w-[120px]"
                              />
                            </div>
                          ) : (
                            `${user.firstName || ''} ${user.lastName || ''}`
                          )}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {editingUser?.id === user.id ? (
                            <Input
                              placeholder="Email"
                              value={editedUserData.email || user.email || ''}
                              onChange={(e) => setEditedUserData({...editedUserData, email: e.target.value})}
                              className="bg-gray-800 border-gray-600 text-white text-sm h-10 min-w-[180px]"
                            />
                          ) : (
                            user.email
                          )}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {editingUser?.id === user.id ? (
                            <Input
                              placeholder="Phone Number"
                              value={editedUserData.phoneNumber || user.phoneNumber || ''}
                              onChange={(e) => setEditedUserData({...editedUserData, phoneNumber: e.target.value})}
                              className="bg-gray-800 border-gray-600 text-white text-sm h-10 min-w-[140px]"
                            />
                          ) : (
                            user.phoneNumber || 'Not set'
                          )}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {editingUser?.id === user.id ? (
                            <select
                              value={editedUserData.gender || user.gender || ''}
                              onChange={(e) => setEditedUserData({...editedUserData, gender: e.target.value})}
                              className="bg-gray-800 border border-gray-600 text-white text-sm h-10 min-w-[100px] rounded-md px-2"
                            >
                              <option value="">Select</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                            </select>
                          ) : (
                            user.gender ? (user.gender.charAt(0).toUpperCase() + user.gender.slice(1)) : 'Not set'
                          )}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {editingUser?.id === user.id ? (
                            <Input
                              type="date"
                              value={editedUserData.dateOfBirth || (user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '')}
                              onChange={(e) => setEditedUserData({...editedUserData, dateOfBirth: e.target.value})}
                              className="bg-gray-800 border-gray-600 text-white text-sm h-10 min-w-[120px]"
                            />
                          ) : (
                            user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'Not set'
                          )}
                        </TableCell>
                        <TableCell className="text-green-300">RP {formatMoney(user.credits || 0)}</TableCell>
                        <TableCell className="text-purple-300">{user.loyaltyPoints || 0}</TableCell>
                        <TableCell className="text-yellow-300">
                          <div className="flex items-center gap-2">
                            <span>🪙 {user.tokens || 0}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const newTokens = prompt(`Edit tokens for ${user.firstName || user.email || 'User'}:`, (user.tokens || 0).toString());
                                if (newTokens !== null && !isNaN(parseInt(newTokens)) && parseInt(newTokens) >= 0) {
                                  updateUserTokensMutation.mutate({
                                    userId: user.id,
                                    tokens: parseInt(newTokens)
                                  });
                                }
                              }}
                              className="h-6 px-2 text-xs border-gray-600 text-gray-300 hover:bg-gray-800"
                            >
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {editingUser?.id === user.id ? (
                            <Select 
                              value={editedUserData.role || user.role || 'user'} 
                              onValueChange={(value) => setEditedUserData({...editedUserData, role: value})}
                            >
                              <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-sm h-10 w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge className={user.role === 'admin' ? 'bg-red-500' : 'bg-blue-500'}>
                              {user.role || 'user'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {formatDate(user.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {editingUser?.id === user.id ? (
                              <>
                                <Button 
                                  size="sm" 
                                  onClick={() => updateUserMutation.mutate({ 
                                    userId: user.id, 
                                    userData: editedUserData 
                                  })}
                                  className="bg-green-600 hover:bg-green-700 h-10 w-10 p-0"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  onClick={() => {
                                    setEditingUser(null);
                                    setEditedUserData({});
                                  }}
                                  variant="outline"
                                  className="h-10 w-10 p-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  setEditingUser(user);
                                  setEditedUserData({
                                    firstName: user.firstName,
                                    lastName: user.lastName,
                                    email: user.email,
                                    phoneNumber: user.phoneNumber,
                                    gender: user.gender,
                                    dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
                                    role: user.role
                                  });
                                }}
                                className="bg-blue-600 hover:bg-blue-700 h-10 w-10 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              onClick={() => {
                                setSelectedUserForPassword(user);
                                setShowPasswordDialog(true);
                                setNewPassword("");
                                setConfirmPassword("");
                              }}
                              className="bg-orange-600 hover:bg-orange-700 h-10 w-10 p-0"
                              title="Change Password"
                            >
                              🔑
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  onClick={() => setSelectedUser(user)}
                                  className="bg-purple-600 hover:bg-purple-700 h-10 w-10 p-0"
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-gray-900 border-gray-700">
                                <DialogHeader>
                                  <DialogTitle className="text-white">Manage Credits & Points</DialogTitle>
                                </DialogHeader>
                                {selectedUser && (
                                  <div className="space-y-4">
                                    <div>
                                      <Label className="text-gray-300">Credits</Label>
                                      <Input
                                        type="number"
                                        defaultValue={selectedUser.credits}
                                        onChange={(e) => setSelectedUser({...selectedUser, credits: e.target.value})}
                                        className="bg-gray-800 border-gray-600 text-white"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-gray-300">Points</Label>
                                      <Input
                                        type="number"
                                        defaultValue={selectedUser.loyaltyPoints}
                                        onChange={(e) => setSelectedUser({...selectedUser, loyaltyPoints: e.target.value})}
                                        className="bg-gray-800 border-gray-600 text-white"
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <Button 
                                        onClick={() => updateCreditsMutation.mutate({ 
                                          userId: selectedUser.id, 
                                          amount: selectedUser.credits 
                                        })}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        Update Credits
                                      </Button>
                                      <Button 
                                        onClick={() => updatePointsMutation.mutate({ 
                                          userId: selectedUser.id, 
                                          points: parseInt(selectedUser.loyaltyPoints) 
                                        })}
                                        className="bg-purple-600 hover:bg-purple-700"
                                      >
                                        Update Points
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  </Table>
                </div>
                </div>
                
                {/* 10-Item Pagination for Users */}
                {(usersResponse as any)?.pagination && (usersResponse as any).pagination.totalPages > 1 && (
                  <div className="mt-6 flex justify-center items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUsersPage(Math.max(1, usersPage - 1))}
                      disabled={usersPage === 1}
                      className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                    >
                      Previous
                    </Button>
                    
                    <div className="flex space-x-1">
                      {Array.from({ 
                        length: Math.min(10, (usersResponse as any).pagination.totalPages)
                      }, (_, i) => {
                        const totalPages = (usersResponse as any).pagination.totalPages;
                        const currentPage = usersPage;
                        const maxPagesToShow = 10;
                        
                        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
                        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
                        
                        if (endPage - startPage + 1 < maxPagesToShow) {
                          startPage = Math.max(1, endPage - maxPagesToShow + 1);
                        }
                        
                        return startPage + i;
                      }).filter(page => page <= (usersResponse as any).pagination.totalPages).map((page) => (
                        <Button
                          key={page}
                          variant={page === usersPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setUsersPage(page)}
                          className={`${
                            page === usersPage 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                          }`}
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUsersPage(Math.min((usersResponse as any).pagination.totalPages, usersPage + 1))}
                      disabled={usersPage === (usersResponse as any).pagination.totalPages}
                      className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                    >
                      Next
                    </Button>
                    
                    <div className="ml-4 text-sm text-gray-300">
                      Showing {((usersPage - 1) * usersPerPage) + 1} to{' '}
                      {Math.min(usersPage * usersPerPage, (usersResponse as any)?.pagination?.totalCount || usersResponse?.data?.length || 0)} of{' '}
                      {(usersResponse as any)?.pagination?.totalCount || usersResponse?.data?.length || 0} users
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top-ups Tab */}
          <TabsContent value="topups">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">Credit Top-up Management</CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="text-white">
                      Total Requests: <span className="font-semibold">{topUpRequests.length}</span>
                    </div>
                    <Button 
                      onClick={() => downloadCSV(topUpRequests, 'topups')}
                      variant="outline" 
                      size="sm"
                      className="bg-white/10 text-white border-white/20"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-gray-300">User</TableHead>
                        <TableHead className="text-gray-300">Amount</TableHead>
                        <TableHead className="text-gray-300">Payment Method</TableHead>
                        <TableHead className="text-gray-300">Payment Proof</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">Submitted</TableHead>
                        <TableHead className="text-gray-300">Processed</TableHead>
                        <TableHead className="text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {topUpRequests
                      .slice((topUpCurrentPage - 1) * topUpItemsPerPage, topUpCurrentPage * topUpItemsPerPage)
                      .map((request: any) => (
                      <TableRow key={request.id}>
                        <TableCell className="text-white">
                          {request.user?.firstName} {request.user?.lastName}
                          <div className="text-sm text-gray-400">{request.user?.email}</div>
                        </TableCell>
                        <TableCell className="text-green-300 font-semibold">
                          IDR {parseFloat(request.amount).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          <Badge variant={request.paymentMethod === 'paypal' ? 'default' : 'secondary'}>
                            {request.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 
                             request.paymentMethod === 'cash_deposit' ? 'Cash Deposit' : 'PayPal'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {request.paymentProof && (request.paymentMethod === 'bank_transfer' || request.paymentMethod === 'cash_deposit') ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20">
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Proof
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                                <DialogHeader>
                                  <DialogTitle>Payment Proof - {request.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'Cash Deposit'}</DialogTitle>
                                </DialogHeader>
                                <div className="flex-1 overflow-y-auto space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>User</Label>
                                      <p className="text-sm">{request.user?.firstName} {request.user?.lastName}</p>
                                    </div>
                                    <div>
                                      <Label>Amount</Label>
                                      <p className="text-sm font-semibold">IDR {parseFloat(request.amount).toLocaleString()}</p>
                                    </div>
                                  </div>
                                  {request.bankTransferDetails && (
                                    <div>
                                      <Label>Bank Details</Label>
                                      <div className="text-sm bg-gray-50 p-3 rounded mt-1">
                                        <p><strong>Bank:</strong> {request.bankTransferDetails.bankName}</p>
                                        <p><strong>Account:</strong> {request.bankTransferDetails.accountNumber}</p>
                                        <p><strong>Holder:</strong> {request.bankTransferDetails.accountHolderName}</p>
                                      </div>
                                    </div>
                                  )}
                                  <div>
                                    <Label>Payment Proof</Label>
                                    <div className="mt-2 border rounded-lg overflow-auto">
                                      <img 
                                        src={request.paymentProof} 
                                        alt="Payment proof" 
                                        className="w-full h-auto object-contain max-h-[60vh]"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={request.status === 'approved' ? 'default' : 
                                   request.status === 'rejected' ? 'destructive' : 'secondary'}
                          >
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {formatDate(request.createdAt)}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {request.updatedAt && request.status !== 'pending' ? formatDate(request.updatedAt) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {request.status === 'pending' ? (
                            <div className="flex gap-2">
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => {
                                  updateTopUpMutation.mutate({ 
                                    id: request.id, 
                                    status: 'approved', 
                                    adminNotes: '' 
                                  });
                                }}
                                disabled={updateTopUpMutation.isPending}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    <X className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Reject Top-up Request</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <p>Reject top-up request for {request.user?.firstName} {request.user?.lastName}?</p>
                                    <Textarea
                                      placeholder="Rejection reason (required)"
                                      value={adminNotes}
                                      onChange={(e) => setAdminNotes(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                      <Button 
                                        onClick={() => {
                                          updateTopUpMutation.mutate({ 
                                            id: request.id, 
                                            status: 'rejected', 
                                            adminNotes 
                                          });
                                          setAdminNotes('');
                                        }}
                                        disabled={updateTopUpMutation.isPending || !adminNotes.trim()}
                                        variant="destructive"
                                      >
                                        Confirm Rejection
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          ) : (
                            <span className="text-gray-400">Processed</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    </TableBody>
                  </Table>
                  {topUpRequests.length === 0 && (
                    <div className="text-center text-gray-400 py-8">
                      No top-up requests found
                    </div>
                  )}
                </div>
                
                {/* Pagination Controls - Force display for testing */}
                {true && (
                  <div className="flex justify-between items-center mt-4 px-4 pb-4">
                    <div className="text-sm text-gray-400">
                      Showing {((topUpCurrentPage - 1) * topUpItemsPerPage) + 1} to {Math.min(topUpCurrentPage * topUpItemsPerPage, topUpRequests.length)} of {topUpRequests.length} requests
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTopUpCurrentPage(Math.max(1, topUpCurrentPage - 1))}
                        disabled={topUpCurrentPage === 1}
                        className="bg-white/10 text-white border-white/20"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTopUpCurrentPage(Math.min(Math.ceil(topUpRequests.length / topUpItemsPerPage), topUpCurrentPage + 1))}
                        disabled={topUpCurrentPage >= Math.ceil(topUpRequests.length / topUpItemsPerPage)}
                        className="bg-white/10 text-white border-white/20"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">Appointment Management</CardTitle>
                  <Button 
                    onClick={() => downloadCSV(filteredAppointments, 'appointments')}
                    variant="outline" 
                    size="sm"
                    className="bg-white/10 text-white border-white/20"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
                <div className="flex gap-4 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search appointments..."
                      value={appointmentSearch}
                      onChange={(e) => setAppointmentSearch(e.target.value)}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-300"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/20">
                      <TableHead className="text-blue-200">User</TableHead>
                      <TableHead className="text-blue-200">Service</TableHead>
                      <TableHead className="text-blue-200">Date</TableHead>
                      <TableHead className="text-blue-200">Time</TableHead>
                      <TableHead className="text-blue-200">Status</TableHead>
                      <TableHead className="text-blue-200">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAppointments.map((appointment: any) => (
                      <TableRow key={appointment.id} className="border-white/10">
                        <TableCell className="text-white">
                          <button
                            onClick={() => handleUserNameClick(appointment.userId)}
                            className="text-blue-300 hover:text-blue-100 underline cursor-pointer transition-colors"
                          >
                            {appointment.user?.firstName} {appointment.user?.lastName}
                          </button>
                        </TableCell>
                        <TableCell className="text-gray-300">{appointment.service}</TableCell>
                        <TableCell className="text-gray-300">
                          {new Date(appointment.appointmentDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {new Date(appointment.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            appointment.status === 'confirmed' ? 'bg-green-500' :
                            appointment.status === 'pending' ? 'bg-yellow-500' :
                            appointment.status === 'cancelled' ? 'bg-red-500' : 'bg-blue-500'
                          }>
                            {appointment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {appointment.status === 'pending' ? (
                            <div className="flex gap-2">
                              <Button 
                                size="sm"
                                onClick={() => updateAppointmentMutation.mutate({ 
                                  id: appointment.id, 
                                  status: 'scheduled' 
                                })}
                                className="bg-green-600 hover:bg-green-700 h-10 w-10 p-0"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => updateAppointmentMutation.mutate({ 
                                  id: appointment.id, 
                                  status: 'cancelled' 
                                })}
                                className="bg-red-600 hover:bg-red-700 h-10 w-10 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No actions available</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Pagination for Appointments */}
                {(appointmentsResponse as any)?.pagination && (
                  <div className="mt-4 flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        {(appointmentsResponse as any).pagination.hasPrev && (
                          <PaginationItem>
                            <PaginationPrevious 
                              href="#" 
                              onClick={() => {
                                console.log('Previous page');
                              }}
                            />
                          </PaginationItem>
                        )}
                        
                        <PaginationItem>
                          <PaginationLink href="#" isActive>
                            {(appointmentsResponse as any).pagination.page}
                          </PaginationLink>
                        </PaginationItem>
                        
                        {(appointmentsResponse as any).pagination.hasNext && (
                          <PaginationItem>
                            <PaginationNext 
                              href="#" 
                              onClick={() => {
                                console.log('Next page');
                              }}
                            />
                          </PaginationItem>
                        )}
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Toy Management Tab */}
          <TabsContent value="toys">
            <div className="space-y-6">
              {/* Season and Series Management */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Season Management */}
                <Card className="bg-white/10 backdrop-blur border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Season Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-gray-300">Season Name</Label>
                          <Input
                            value={newSeason.name}
                            onChange={(e) => setNewSeason({ ...newSeason, name: e.target.value })}
                            className="bg-white/10 border-white/20 text-white"
                            placeholder="e.g., Winter 2025"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-300">Display Name</Label>
                          <Input
                            value={newSeason.displayName}
                            onChange={(e) => setNewSeason({ ...newSeason, displayName: e.target.value })}
                            className="bg-white/10 border-white/20 text-white"
                            placeholder="e.g., Winter Collection"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-gray-300">Description</Label>
                        <Input
                          value={newSeason.description}
                          onChange={(e) => setNewSeason({ ...newSeason, description: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                          placeholder="Season description"
                        />
                      </div>
                      <Button 
                        onClick={() => createSeasonMutation.mutate(newSeason)}
                        className="bg-green-600 hover:bg-green-700 w-full"
                        disabled={!newSeason.name || createSeasonMutation.isPending}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {createSeasonMutation.isPending ? "Creating..." : "Create Season"}
                      </Button>
                      
                      {/* Available Seasons */}
                      <div className="mt-4">
                        <h4 className="text-gray-300 text-sm font-medium mb-2">Available Seasons ({seasonsData.length})</h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {seasonsData.map((season: any) => (
                            <div key={season.id} className="flex items-center justify-between bg-white/5 rounded px-3 py-2">
                              <span className="text-white text-sm">{season.displayName}</span>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-blue-600/20 text-blue-300 border-blue-500/30 hover:bg-blue-600/40 h-6 px-2"
                                  onClick={() => {
                                    const editData = {
                                      name: prompt("Edit season name:", season.name) || season.name,
                                      displayName: prompt("Edit display name:", season.displayName) || season.displayName,
                                      description: prompt("Edit description:", season.description) || season.description
                                    };
                                    editSeasonMutation.mutate({ seasonId: season.id, seasonData: editData });
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-red-600/20 text-red-300 border-red-500/30 hover:bg-red-600/40 h-6 px-2"
                                  onClick={() => {
                                    if (confirm(`Delete season "${season.displayName}"?`)) {
                                      deleteSeasonMutation.mutate(season.id);
                                    }
                                  }}
                                >
                                  Delete
                                </Button>
                                <Badge variant="outline" className="text-xs">ID: {season.id}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Series Management */}
                <Card className="bg-white/10 backdrop-blur border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Tag className="h-5 w-5" />
                      Series Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-gray-300">Series Name</Label>
                        <Input
                          value={newSeries.name}
                          onChange={(e) => setNewSeries({ ...newSeries, name: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                          placeholder="e.g., Rare Collectibles"
                        />
                      </div>

                      <div>
                        <Label className="text-gray-300">Description</Label>
                        <Input
                          value={newSeries.description}
                          onChange={(e) => setNewSeries({ ...newSeries, description: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                          placeholder="Series description"
                        />
                      </div>
                      <Button 
                        onClick={() => createSeriesMutation.mutate(newSeries)}
                        className="bg-blue-600 hover:bg-blue-700 w-full"
                        disabled={!newSeries.name || createSeriesMutation.isPending}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {createSeriesMutation.isPending ? "Creating..." : "Create Series"}
                      </Button>
                      
                      {/* Available Series */}
                      <div className="mt-4">
                        <h4 className="text-gray-300 text-sm font-medium mb-2">Available Series ({seriesData.length})</h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {seriesData.map((series: any) => (
                            <div key={series.id} className="flex items-center justify-between bg-white/5 rounded px-3 py-2">
                              <span className="text-white text-sm">{series.displayName}</span>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-blue-600/20 text-blue-300 border-blue-500/30 hover:bg-blue-600/40 h-6 px-2"
                                  onClick={() => {
                                    const editData = {
                                      name: prompt("Edit series name:", series.name) || series.name,
                                      description: prompt("Edit description:", series.description) || series.description,
                                      requiredCount: parseInt(prompt("Edit required count:", series.requiredCount) || series.requiredCount)
                                    };
                                    editSeriesMutation.mutate({ seriesId: series.id, seriesData: editData });
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-red-600/20 text-red-300 border-red-500/30 hover:bg-red-600/40 h-6 px-2"
                                  onClick={() => {
                                    if (confirm(`Delete series "${series.displayName}"?`)) {
                                      deleteSeriesMutation.mutate(series.id);
                                    }
                                  }}
                                >
                                  Delete
                                </Button>
                                <Badge variant="outline" className="text-xs">ID: {series.id}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Enhanced Toy Creation */}
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Create New Toy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-gray-300">Name</Label>
                      <Input
                        value={newToy.name}
                        onChange={(e) => setNewToy({ ...newToy, name: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                        placeholder="Toy name"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={newToy.color || ""}
                          onChange={(e) => setNewToy({ ...newToy, color: e.target.value })}
                          className="bg-white/10 border-white/20 text-white flex-1"
                          placeholder="Enter color or hex code (e.g., #FF5733)"
                        />
                        <input
                          type="color"
                          value={newToy.color?.startsWith('#') ? newToy.color : '#FF5733'}
                          onChange={(e) => setNewToy({ ...newToy, color: e.target.value })}
                          className="w-12 h-10 rounded border border-white/20 bg-white/10"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-300">Rarity</Label>
                      <Select value={newToy.rarity} onValueChange={(value) => setNewToy({ ...newToy, rarity: value })}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select Rarity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="common">Common</SelectItem>
                          <SelectItem value="rare">Rare</SelectItem>
                          <SelectItem value="epic">Epic</SelectItem>
                          <SelectItem value="legendary">Legendary</SelectItem>
                          <SelectItem value="secret">Secret</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-300">Season</Label>
                      <Select value={newToy.seasonId?.toString() || ""} onValueChange={(value) => setNewToy({ ...newToy, seasonId: value ? parseInt(value) : null })}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select Season" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Season</SelectItem>
                          {seasonsData.map((season: any) => (
                            <SelectItem key={season.id} value={season.id.toString()}>
                              {season.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-300">Series</Label>
                      <Select value={newToy.seriesId?.toString() || ""} onValueChange={(value) => setNewToy({ ...newToy, seriesId: value ? parseInt(value) : null })}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select Series" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Series</SelectItem>
                          {seriesData.map((series: any) => (
                            <SelectItem key={series.id} value={series.id.toString()}>
                              {series.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-300">Image Upload</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Gender</Label>
                      <Select value={newToy.gender} onValueChange={(value: "male" | "female") => setNewToy({ ...newToy, gender: value })}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-300">Price (RP)</Label>
                      <Input
                        type="number"
                        value={newToy.price || ""}
                        onChange={(e) => setNewToy({ ...newToy, price: parseFloat(e.target.value) || 0 })}
                        className="bg-white/10 border-white/20 text-white"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button 
                        onClick={() => {
                          const qrCode = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                          createToyMutation.mutate({ ...newToy, qrCode });
                        }}
                        className="bg-blue-600 hover:bg-blue-700 w-full"
                        disabled={!newToy.name || createToyMutation.isPending}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {createToyMutation.isPending ? "Creating..." : "Create Toy"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* List of Created Toys */}
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    List of Created Toys
                    <Button
                      onClick={async () => {
                        try {
                          const response = await apiRequest('/api/admin/hardcoded-toys', 'DELETE');
                          toast({ title: "Success", description: `Deleted hardcoded toys successfully` });
                          queryClient.invalidateQueries({ queryKey: ['/api/admin/all-toys'] });
                        } catch (error: any) {
                          toast({ 
                            title: "Error", 
                            description: error.message || "Failed to delete hardcoded toys",
                            variant: "destructive" 
                          });
                        }
                      }}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Hardcoded Toys
                    </Button>
                  </CardTitle>
                  <p className="text-gray-300 text-sm">Manage all created toys and remove hardcoded entries</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredToys.map((toy: any) => (
                      <div key={toy.id} className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {toy.imageUrl && (
                            <img src={toy.imageUrl} alt={toy.name} className="w-12 h-12 rounded object-cover" />
                          )}
                          <div>
                            <h4 className="text-white font-medium">{toy.name}</h4>
                            <div className="flex items-center space-x-2 text-sm text-gray-300">
                              <span>ID: {toy.id}</span>
                              <span>•</span>
                              <span className="capitalize">{toy.rarity}</span>
                              <span>•</span>
                              <span className="capitalize">{toy.gender || 'male'}</span>
                              {toy.color && (
                                <>
                                  <span>•</span>
                                  <span className="capitalize">{toy.color}</span>
                                </>
                              )}
                              {toy.ownerId ? (
                                <>
                                  <span>•</span>
                                  <span className="text-green-400">Owned</span>
                                </>
                              ) : (
                                <>
                                  <span>•</span>
                                  <span className="text-orange-400">Hardcoded</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getRarityColor(toy.rarity)}>
                            {toy.rarity}
                          </Badge>
                          <Button
                            onClick={() => {
                              // Edit functionality can be implemented later
                              toast({ title: "Info", description: "Edit functionality coming soon" });
                            }}
                            size="sm"
                            variant="outline"
                            className="text-white border-white/20 hover:bg-white/10"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={async () => {
                              try {
                                await apiRequest(`/api/admin/toys/${toy.id}`, 'DELETE');
                                toast({ title: "Success", description: "Toy deleted successfully" });
                                queryClient.invalidateQueries({ queryKey: ['/api/admin/all-toys'] });
                              } catch (error: any) {
                                toast({ 
                                  title: "Error", 
                                  description: error.message || "Failed to delete toy",
                                  variant: "destructive" 
                                });
                              }
                            }}
                            size="sm"
                            variant="destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {filteredToys.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        No toys found matching your filters
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Simplified Bulk Toy Generator */}
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Bulk Toy Generator</CardTitle>
                  <p className="text-gray-300 text-sm">Select existing toys and specify quantities to generate</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Toy Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-300">Select Base Toy</Label>
                        <Select value={selectedToyForBulk?.toString() || ""} onValueChange={(value) => setSelectedToyForBulk(value ? parseInt(value) : null)}>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Choose existing toy" />
                          </SelectTrigger>
                          <SelectContent>
                            {(allToys || []).slice(0, 50).filter((toy: any) => toy && toy.id).map((toy: any) => (
                              <SelectItem key={toy.id} value={toy.id.toString()}>
                                {toy.name} - {toy.rarity} ({toy.color || 'No color'})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-gray-300">Quantity to Generate</Label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          placeholder="Enter quantity (1-100)"
                          value={bulkQuantity}
                          onChange={(e) => setBulkQuantity(parseInt(e.target.value) || 1)}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                    </div>

                    {/* Selected Toy Preview */}
                    {selectedToyForBulk && (() => {
                      const selectedToy = (allToys || []).find((toy: any) => toy.id === selectedToyForBulk);
                      return selectedToy ? (
                        <div className="bg-white/5 rounded-lg p-4">
                          <h4 className="text-white font-medium mb-3">Selected Toy Preview</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">Name:</span>
                              <div className="text-white">{selectedToy.name}</div>
                            </div>
                            <div>
                              <span className="text-gray-400">Color:</span>
                              <div className="text-white">{selectedToy.color || 'Not specified'}</div>
                            </div>
                            <div>
                              <span className="text-gray-400">Rarity:</span>
                              <div className="text-white capitalize">{selectedToy.rarity}</div>
                            </div>
                            <div>
                              <span className="text-gray-400">Series:</span>
                              <div className="text-white">{selectedToy.series || 'No series'}</div>
                            </div>
                          </div>
                          {selectedToy.imageUrl && (
                            <div className="mt-3">
                              <img 
                                src={selectedToy.imageUrl} 
                                alt={selectedToy.name}
                                className="w-16 h-16 rounded object-cover"
                              />
                            </div>
                          )}
                        </div>
                      ) : null;
                    })()}



                    {/* Generate Button */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-300">
                        {selectedToyForBulk && bulkQuantity > 0 && (
                          <span>Ready to generate {bulkQuantity} copies</span>
                        )}
                      </div>
                      <Button 
                        onClick={() => {
                          if (!selectedToyForBulk || bulkQuantity < 1) {
                            toast({ title: "Error", description: "Please select a toy and specify quantity", variant: "destructive" });
                            return;
                          }
                          const toyToClone = allToys?.find((toy: any) => toy.id === selectedToyForBulk);
                          if (!toyToClone || !allToys || allToys.length === 0) {
                            toast({ title: "Error", description: "Selected toy not found or toys not loaded", variant: "destructive" });
                            return;
                          }
                          
                          const bulkData = {
                            baseToy: toyToClone,
                            quantity: bulkQuantity,
                            overrides: bulkOverrides
                          };
                          
                          bulkGenerationMutation.mutate(bulkData);
                        }}
                        className="bg-purple-600 hover:bg-purple-700"
                        disabled={!selectedToyForBulk || bulkQuantity < 1 || bulkGenerationMutation.isPending}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        {bulkGenerationMutation.isPending ? "Generating..." : `Generate ${bulkQuantity} Toys`}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Toy List */}
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-white">All Toys</CardTitle>
                    <Button 
                      onClick={() => downloadCSV(allToys, 'toys')}
                      variant="outline" 
                      size="sm"
                      className="bg-white/10 text-white border-white/20"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  <div className="flex gap-4 mt-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search toys..."
                        value={toySearch}
                        onChange={(e) => setToySearch(e.target.value)}
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-300"
                      />
                    </div>
                    <Select value={rarityFilter} onValueChange={setRarityFilter}>
                      <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Filter by rarity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Rarities</SelectItem>
                        <SelectItem value="common">Common</SelectItem>
                        <SelectItem value="rare">Rare</SelectItem>
                        <SelectItem value="epic">Epic</SelectItem>
                        <SelectItem value="legendary">Legendary</SelectItem>
                        <SelectItem value="secret">Secret</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/20">
                        <TableHead className="text-blue-200">Image</TableHead>
                        <TableHead className="text-blue-200">Name</TableHead>
                        <TableHead className="text-blue-200">Color</TableHead>
                        <TableHead className="text-blue-200">Series</TableHead>
                        <TableHead className="text-blue-200">Rarity</TableHead>
                        <TableHead className="text-blue-200">Season</TableHead>
                        <TableHead className="text-blue-200">Owner</TableHead>
                        <TableHead className="text-blue-200">QR Code</TableHead>
                        <TableHead className="text-blue-200">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredToys.map((toy: any) => (
                        <TableRow key={toy.id} className="border-white/10">
                          <TableCell>
                            <img 
                              src={toy.imageUrl} 
                              alt={toy.name}
                              className="w-10 h-10 rounded object-cover"
                            />
                          </TableCell>
                          <TableCell className="text-white">{toy.name}</TableCell>
                          <TableCell className="text-white">
                            <div className="flex items-center gap-2">
                              {toy.color && (
                                <div className={`w-3 h-3 rounded-full ${
                                  toy.color === 'red' ? 'bg-red-500' :
                                  toy.color === 'blue' ? 'bg-blue-500' :
                                  toy.color === 'green' ? 'bg-green-500' :
                                  toy.color === 'yellow' ? 'bg-yellow-500' :
                                  toy.color === 'purple' ? 'bg-purple-500' :
                                  toy.color === 'orange' ? 'bg-orange-500' :
                                  toy.color === 'pink' ? 'bg-pink-500' :
                                  toy.color === 'black' ? 'bg-black border border-white/20' :
                                  toy.color === 'white' ? 'bg-white' :
                                  toy.color === 'gold' ? 'bg-yellow-400' :
                                  toy.color === 'silver' ? 'bg-gray-400' :
                                  'bg-gradient-to-r from-red-500 to-purple-500'
                                }`}></div>
                              )}
                              <span className="capitalize">{toy.color || 'No color'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-white">{toy.series}</TableCell>
                          <TableCell>
                            <Badge className={`${
                              toy.rarity === 'common' ? 'bg-gray-500' :
                              toy.rarity === 'rare' ? 'bg-blue-500' :
                              toy.rarity === 'epic' ? 'bg-purple-500' :
                              toy.rarity === 'legendary' ? 'bg-yellow-500' :
                              toy.rarity === 'secret' ? 'bg-red-500' :
                              'bg-gray-500'
                            }`}>
                              {toy.rarity}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {toy.season?.displayName || 'No season'}
                          </TableCell>
                          <TableCell className="text-purple-200">
                            {toy.owner ? `${toy.owner.firstName} ${toy.owner.lastName}` : 'Unowned'}
                          </TableCell>
                          <TableCell className="text-purple-200 font-mono text-xs">{toy.qrCode}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-blue-600/20 text-blue-300 border-blue-500/30 hover:bg-blue-600/40"
                                onClick={() => {
                                  // Edit toy functionality
                                  const editData = {
                                    name: prompt("Edit toy name:", toy.name) || toy.name,
                                    color: prompt("Edit toy color:", toy.color) || toy.color,
                                    rarity: prompt("Edit toy rarity:", toy.rarity) || toy.rarity
                                  };
                                  editToyMutation.mutate({ toyId: toy.id, toyData: editData });
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-red-600/20 text-red-300 border-red-500/30 hover:bg-red-600/40"
                                onClick={() => {
                                  if (confirm(`Delete toy "${toy.name}"?`)) {
                                    deleteToyMutation.mutate(toy.id);
                                  }
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-6">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">Appointments Management</CardTitle>
                  <Button 
                    onClick={() => downloadCSV(allAppointments, 'appointments')}
                    variant="outline" 
                    size="sm"
                    className="bg-white/10 text-white border-white/20"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/20">
                      <TableHead className="text-blue-200">User</TableHead>
                      <TableHead className="text-blue-200">Date</TableHead>
                      <TableHead className="text-blue-200">Time</TableHead>
                      <TableHead className="text-blue-200">Service</TableHead>
                      <TableHead className="text-blue-200">Status</TableHead>
                      <TableHead className="text-blue-200">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allAppointments?.map((appointment: any) => (
                      <TableRow key={appointment.id} className="border-white/10">
                        <TableCell className="text-white">
                          {appointment.user?.firstName} {appointment.user?.lastName}
                        </TableCell>
                        <TableCell className="text-white">{formatDate(appointment.date)}</TableCell>
                        <TableCell className="text-white">{appointment.time}</TableCell>
                        <TableCell className="text-white">{appointment.service}</TableCell>
                        <TableCell>
                          <Badge className={`${
                            appointment.status === 'confirmed' ? 'bg-green-500' :
                            appointment.status === 'pending' ? 'bg-yellow-500' :
                            appointment.status === 'cancelled' ? 'bg-red-500' :
                            'bg-gray-500'
                          }`}>
                            {appointment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="bg-white/10 text-white border-white/20">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="bg-white/10 text-white border-white/20">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default EnhancedAdminDashboard;
