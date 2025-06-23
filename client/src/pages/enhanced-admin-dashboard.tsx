import React, { useState, useEffect, useMemo } from "react";
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
  Tag,
  Mail
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
  const [showEditPetDialog, setShowEditPetDialog] = useState(false);
  const [editingToy, setEditingToy] = useState<any>(null);
  const [showEditToyDialog, setShowEditToyDialog] = useState(false);
  const [editedToyData, setEditedToyData] = useState<any>({});
  const [newToy, setNewToy] = useState({
    name: "",
    species: "",
    rarity: "common",
    color: "",
    imageUrl: "",
    qrCode: "",
    price: 0,
    seasonId: null as number | null,
    isSeasonalExclusive: false,
    gender: "male" as "male" | "female",
    description: ""
  });

  // Season and Series management states
  const [newSeason, setNewSeason] = useState({
    name: "",
    displayName: "",
    description: ""
  });

  const [editSeasonData, setEditSeasonData] = useState({
    id: null as number | null,
    name: "",
    displayName: "",
    description: "",
    backgroundColor: "#3B82F6"
  });

  const [showEditSeasonDialog, setShowEditSeasonDialog] = useState(false);
  
  // Email interface state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    text: '',
    html: ''
  });
  const [emailSending, setEmailSending] = useState(false);



  // Simplified bulk generation states
  const [selectedToyForBulk, setSelectedToyForBulk] = useState<number | null>(null);
  const [bulkQuantity, setBulkQuantity] = useState(1);
  const [bulkOverrides, setBulkOverrides] = useState({
    seasonId: null as number | null,
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
  const [approveForm, setApproveForm] = useState({
    pointsAwarded: 0,
    adminNotes: ''
  });
  const [rejectForm, setRejectForm] = useState({
    adminNotes: ''
  });
  
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

  // Template toy creation states
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateToyForm, setTemplateToyForm] = useState({
    name: "",
    seasonId: "",
    rarity: "common",
    color: "blue",
    gender: "male",
    imageUrl: "",
    quantity: 1
  });
  
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

  // All toys list filter states
  const [filterStatus, setFilterStatus] = useState("all");
  
  // Search and pagination states for toys and pets
  const [toySearchTerm, setToySearchTerm] = useState("");
  const [petSearchTerm, setPetSearchTerm] = useState("");
  const [toyCurrentPage, setToyCurrentPage] = useState(1);
  const [petCurrentPage, setPetCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;


  
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

  // Check if user is admin
  if (!user || (user as any).role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Card className="p-8">
          <CardContent className="text-center">
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p>You don't have admin privileges to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  // Query for toy templates (design blueprints)
  const { data: toyTemplatesResponse }: any = useQuery({
    queryKey: ['/api/admin/toy-templates'],
    retry: false,
  });

  // Query for real toys (collectibles)
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



  // New queries for pet management and token claims with pagination
  const { data: activatedPetsResponse }: any = useQuery({
    queryKey: [`/api/admin/activated-pets?page=${petCurrentPage}&limit=10`],
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

  // Query for ALL users (not paginated) for WhatsApp blast count
  const { data: allUsersData }: any = useQuery({
    queryKey: ['/api/admin/all-users'],
    retry: false,
  });

  // All toys query for comprehensive toy list
  const allToysQuery = useQuery({
    queryKey: ['/api/admin/all-toys'],
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

  // Filter toys (exclude templates, only generated toys)
  const filteredToys = useMemo(() => {
    const allToys = allToysQuery?.data?.data || [];
    const generatedToys = allToys.filter((toy: any) => !toy.ownerId && toy.templateId);
    
    if (!toySearchTerm) return generatedToys;
    
    return generatedToys.filter((toy: any) => 
      toy.name?.toLowerCase().includes(toySearchTerm.toLowerCase()) ||
      toy.id?.toString().includes(toySearchTerm) ||
      toy.rarity?.toLowerCase().includes(toySearchTerm.toLowerCase()) ||
      toy.gender?.toLowerCase().includes(toySearchTerm.toLowerCase())
    );
  }, [allToysQuery?.data?.data, toySearchTerm]);

  // Filter active pets - server already provides paginated data (10 per page)
  const filteredPets = useMemo(() => {
    const allPets = activatedPetsResponse?.data || [];
    
    if (!petSearchTerm) return allPets;
    
    return allPets.filter((pet: any) => 
      pet.name?.toLowerCase().includes(petSearchTerm.toLowerCase()) ||
      pet.id?.toString().includes(petSearchTerm) ||
      pet.currentStage?.toLowerCase().includes(petSearchTerm.toLowerCase()) ||
      pet.userId?.toString().includes(petSearchTerm)
    );
  }, [activatedPetsResponse?.data, petSearchTerm]);

  // Paginate toys
  const totalToyPages = Math.ceil(filteredToys.length / ITEMS_PER_PAGE);
  const currentPageToys = useMemo(() => {
    const startIndex = (toyCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredToys.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredToys, toyCurrentPage]);

  // Paginate pets - use server-side pagination (already limited to 10 per page)
  const totalPetPages = activatedPetsResponse?.pagination?.totalPages || 1;
  const totalPetCount = activatedPetsResponse?.pagination?.totalCount || 0;
  const currentPagePets = filteredPets; // Server already provides 10 items per page



  // Extract data arrays from paginated responses
  const allUsers = (usersResponse as any)?.data || [];
  const cashOutRequests = (cashOutResponse as any)?.data || [];
  const topUpRequests = topUpRequestsResponse || [];
  const allTransactions = (transactionsResponse as any)?.data || [];
  const allToys = (toysResponse as any)?.data || [];
  const allAppointments = (appointmentsResponse as any)?.data || [];
  const activatedPets = (activatedPetsResponse as any)?.data || [];
  const tokenClaims = (tokenClaimsResponse as any)?.data || [];
  const paymentVerifications = (paymentVerificationsResponse as any)?.data || [];
  const pendingPurchases = allPendingPurchases || [];
  const tokenTransactions = (tokenTransactionsResponse as any)?.data || [];



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
  const toysPaginationInfo = toysResponse?.pagination || { page: 1, totalPages: 1, totalCount: 0, hasNext: false, hasPrev: false };

  // Filter toy templates (design blueprints) - completely separate from real toys
  const filteredToyTemplates = (() => {
    try {
      if (!toyTemplatesResponse || !toyTemplatesResponse.data) {
        console.log('*** TOY TEMPLATES: No data available yet');
        return [];
      }
      
      const templates = (toyTemplatesResponse.data || []) as any[];
      console.log('*** FILTERING TOY TEMPLATES DEBUG:', { templates: templates.length, templateData: templates });
      
      return templates.filter((template: any) => {
        if (!template || !template.id) return false;
        
        const searchMatch = !toySearch || 
          template.name?.toLowerCase().includes(toySearch.toLowerCase()) ||
          template.description?.toLowerCase().includes(toySearch.toLowerCase());
        const rarityMatch = rarityFilter === "all" || template.rarity === rarityFilter;
        
        return searchMatch && rarityMatch;
      });
    } catch (error) {
      console.error('Error filtering toy templates:', error);
      return [];
    }
  })();

  // Filter real toys (collectibles) - completely separate from templates
  const filteredRealToys = (() => {
    try {
      const toys = (toysResponse?.data || []) as any[];
      console.log('*** FILTERING REAL TOYS DEBUG:', { toys: toys.length });
      
      return toys.filter((toy: any) => {
        if (!toy) return false;
        
        const searchMatch = !toySearch || 
          toy.name?.toLowerCase().includes(toySearch.toLowerCase()) ||
          toy.qrCode?.toLowerCase().includes(toySearch.toLowerCase());
        const rarityMatch = rarityFilter === "all" || toy.rarity === rarityFilter;
        const ownerMatch = ownerFilter === "all" || 
          (ownerFilter === "owned" && toy.ownerId) ||
          (ownerFilter === "unowned" && !toy.ownerId);
        
        return searchMatch && rarityMatch && ownerMatch;
      });
    } catch (error) {
      console.error('Error filtering real toys:', error);
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

  // SendGrid email mutations
  const sendEmailMutation = useMutation({
    mutationFn: async (emailData: { to: string; subject: string; text?: string; html?: string }) => {
      return apiRequest('POST', '/api/admin/send-email', emailData);
    },
    onSuccess: () => {
      toast({ title: "Email sent successfully" });
      setShowEmailForm(false);
      setEmailData({ to: '', subject: '', text: '', html: '' });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to send email", 
        description: error.message || "Please check your email configuration",
        variant: "destructive" 
      });
    }
  });

  const sendWelcomeEmailMutation = useMutation({
    mutationFn: async ({ email, name }: { email: string; name: string }) => {
      return apiRequest('POST', '/api/send-welcome-email', { email, name });
    },
    onSuccess: () => {
      toast({ title: "Welcome email sent successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to send welcome email", 
        description: error.message,
        variant: "destructive" 
      });
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
      queryClient.invalidateQueries({ queryKey: [`/api/admin/all-toys?page=${toysPage}&limit=10`] });
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
      queryClient.invalidateQueries({ queryKey: [`/api/admin/all-toys?page=${toysPage}&limit=10`] });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to delete toy";
      toast({ 
        title: "Error", 
        description: errorMessage,
        variant: "destructive" 
      });
    }
  });



  const editToyMutation = useMutation({
    mutationFn: async ({ toyId, toyData }: { toyId: number; toyData: any }) => {
      return apiRequest('PUT', `/api/admin/toys/${toyId}`, toyData);
    },
    onSuccess: (data, variables) => {
      toast({ title: "Toy updated successfully" });
      // Only invalidate the specific paginated query that's currently displayed
      queryClient.invalidateQueries({ queryKey: [`/api/admin/all-toys?page=${toysPage}&limit=10`] });
      // Also invalidate the seasonal collections if the toy was template
      if (editingToy?.ownerId === null) {
        queryClient.invalidateQueries({ queryKey: ['/api/seasonal-toys'] });
      }
      setShowEditToyDialog(false);
      setEditingToy(null);
      setEditedToyData({});
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to update toy";
      toast({ 
        title: "Error", 
        description: errorMessage,
        variant: "destructive" 
      });
    }
  });

  const editToyTemplateMutation = useMutation({
    mutationFn: async ({ templateId, templateData }: { templateId: number; templateData: any }) => {
      return apiRequest('PUT', `/api/admin/toy-templates/${templateId}`, templateData);
    },
    onSuccess: (data, variables) => {
      toast({ title: "Template updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/toy-templates'] });
      setShowEditToyDialog(false);
      setEditingToy(null);
      setEditedToyData({});
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to update template";
      toast({ 
        title: "Error", 
        description: errorMessage,
        variant: "destructive" 
      });
    }
  });

  const createToyMutation = useMutation({
    mutationFn: async (toyData: any) => {
      // Ensure template toys are created without an owner
      const templateToyData = {
        ...toyData,
        ownerId: null,
        ownerType: null,
        isTemplate: true
      };
      return apiRequest('POST', '/api/admin/create-toy', templateToyData);
    },
    onSuccess: () => {
      toast({ title: "Template toy created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-toys'] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/all-toys?page=${toysPage}&limit=10`] });
      setNewToy({ name: "", species: "", rarity: "common", color: "", imageUrl: "", qrCode: "", price: 0, seasonId: null, isSeasonalExclusive: false, gender: "male" as "male" | "female", description: "" });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to create template toy";
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

  // Proper toy template creation mutation for toy_templates table
  const createToyTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      // Transform data to match schema requirements
      const transformedData = {
        name: templateData.name,
        rarity: templateData.rarity || 'common',
        color: templateData.color || 'blue',
        gender: templateData.gender || 'male',
        imageUrl: templateData.imageUrl || null,
        basePrice: templateData.basePrice ? String(templateData.basePrice) : '0.00',
        description: templateData.description || null,
        // Convert empty string seasonId to null for proper validation
        seasonId: templateData.seasonId && templateData.seasonId !== "" ? parseInt(templateData.seasonId) : null,
        isActive: templateData.isActive !== false
      };
      
      console.log("*** FRONTEND: Sending template data:", transformedData);
      return apiRequest('POST', '/api/admin/toy-templates', transformedData);
    },
    onSuccess: () => {
      toast({ title: "Template created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/toy-templates'] });
      setNewToy({ name: "", species: "", rarity: "common", color: "", imageUrl: "", qrCode: "", price: 0, seasonId: null, isSeasonalExclusive: false, gender: "male" as "male" | "female", description: "" });
      setTemplateToyForm({
        name: "",
        seasonId: "",
        rarity: "common",
        color: "blue",
        gender: "male",
        imageUrl: "",
        quantity: 1
      });
      setShowTemplateDialog(false);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to create template";
      toast({ 
        title: "Error", 
        description: errorMessage,
        variant: "destructive" 
      });
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

  // Toy Template mutations (duplicate removed)

  const bulkGenerationMutation = useMutation({
    mutationFn: async (bulkData: any) => {
      const { baseToy, quantity } = bulkData;
      console.log('*** FRONTEND: Starting bulk generation for', quantity, 'toys from template', baseToy.name);
      const response = await apiRequest('POST', '/api/admin/generate-toys-from-template', {
        templateId: baseToy.id,
        quantity: quantity
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      console.log('*** FRONTEND: Bulk generation successful:', data);
      toast({ 
        title: "Success", 
        description: `Generated ${data.toys?.length || bulkQuantity} toys successfully!`
      });
      
      // Reset to page 1 to show newest toys immediately
      setToysPage(1);
      
      // Complete cache clearing and refresh
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-toys'] });
      queryClient.removeQueries({ queryKey: ['/api/admin/all-toys'] });
      
      // Small delay to ensure state update, then force refresh
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/admin/all-toys'] });
      }, 100);
      
      // Reset form state
      setSelectedToyForBulk(null);
      setBulkQuantity(1);
      setBulkOverrides({ seasonId: null, color: null });
    },
    onError: (error: any) => {
      console.error('*** FRONTEND: Bulk generation failed:', error);
      toast({ 
        title: "Failed to generate toys", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
    }
  });

  // Season management mutations
  const createSeasonMutation = useMutation({
    mutationFn: async (seasonData: any) => {
      console.log("*** CREATING SEASON:", seasonData);
      return apiRequest('POST', '/api/seasons', seasonData);
    },
    onSuccess: (data) => {
      console.log("*** CREATE SEASON SUCCESS:", data);
      toast({ title: "Season created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/seasons'] });
      queryClient.invalidateQueries({ queryKey: ['/api/collection-series'] });
      queryClient.refetchQueries({ queryKey: ['/api/seasons'] });
      // Clear all form fields
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
      console.error("*** CREATE SEASON ERROR:", error);
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
      const message = error.response?.data?.message || "An error occurred";
      toast({ 
        title: "Cannot delete season", 
        description: `${message}. Please reassign or remove related items first.`,
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
      queryClient.invalidateQueries({ queryKey: ['/api/collection-series'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin'] });
      setShowEditSeasonDialog(false);
      setEditSeasonData({
        id: null,
        name: "",
        displayName: "",
        description: "",
        backgroundColor: "#3B82F6"
      });
    },
    onError: (error: any) => {
      console.error("Edit season error:", error);
      toast({ 
        title: "Failed to update season", 
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

  // Cash out management mutation
  const updateCashOutMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: string; status: string; adminNotes: string }) => {
      return apiRequest(`/api/admin/cashouts/${id}`, 'PATCH', { status, adminNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cashouts'] });
      toast({ title: "Cash out request updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update cash out request", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
    }
  });



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
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setNewToy({ ...newToy, imageUrl: data.imageUrl });
        toast({ title: "Image uploaded successfully" });
      } else {
        toast({ title: "Failed to upload image", variant: "destructive" });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: "Failed to upload image", variant: "destructive" });
    } finally {
      setUploading(false);
    }
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900">
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-medium">Total Users</p>
                  <p className="text-2xl font-semibold text-white">{(usersResponse as any)?.pagination?.totalCount || filteredUsers.length}</p>
                </div>
                <Users className="h-6 w-6 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-medium">Admin Fees</p>
                  <p className="text-2xl font-semibold text-white">RP {formatMoney((feesReport as any).totalAdminFees || 0)}</p>
                </div>
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-medium">Transactions</p>
                  <p className="text-2xl font-semibold text-white">{(feesReport as any).totalTransactions || 0}</p>
                </div>
                <CreditCard className="h-6 w-6 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-medium">Top-ups (IDR)</p>
                  <p className="text-2xl font-semibold text-white">
                    {topUpRequests
                      .filter((req: any) => req.status === 'approved')
                      .reduce((total: number, req: any) => total + parseFloat(req.amount), 0)
                      .toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-medium">Total Toys</p>
                  <p className="text-2xl font-semibold text-white">{toysPaginationInfo.totalCount || 0}</p>
                </div>
                <Package className="h-6 w-6 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-medium">Total Pets</p>
                  <p className="text-2xl font-semibold text-white">{activatedPets.length}</p>
                </div>
                <Heart className="h-6 w-6 text-pink-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-medium">Cash-Outs (IDR)</p>
                  <p className="text-2xl font-semibold text-white">
                    {cashOutRequests
                      .filter((req: any) => req.status === 'approved')
                      .reduce((total: number, req: any) => total + parseFloat(req.amount || '0'), 0)
                      .toLocaleString()}
                  </p>
                </div>
                <TrendingDown className="h-6 w-6 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-medium">Pending Cash-Outs</p>
                  <p className="text-2xl font-semibold text-white">
                    {cashOutRequests.filter((req: any) => req.status === 'pending').length}
                  </p>
                </div>
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-medium">Pending Top-Ups</p>
                  <p className="text-2xl font-semibold text-white">
                    {topUpRequests.filter((req: any) => req.status === 'pending').length}
                  </p>
                </div>
                <Clock className="h-6 w-6 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-medium">Active Events</p>
                  <p className="text-2xl font-semibold text-white">
                    {allAppointments.filter((apt: any) => apt.status === 'confirmed').length}
                  </p>
                </div>
                <Calendar className="h-6 w-6 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 overflow-x-auto">
            <TabsList className="bg-slate-700/30 rounded-lg p-1 flex flex-wrap gap-1 min-w-max">
              <TabsTrigger value="users" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300 hover:text-white hover:bg-slate-600/50 text-sm py-2 px-4 rounded-md transition-all whitespace-nowrap">
                Users
              </TabsTrigger>
              <TabsTrigger value="payment-verifications" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300 hover:text-white hover:bg-slate-600/50 text-sm py-2 px-4 rounded-md transition-all whitespace-nowrap">
                Payments
              </TabsTrigger>
              <TabsTrigger value="appointments" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300 hover:text-white hover:bg-slate-600/50 text-sm py-2 px-4 rounded-md transition-all whitespace-nowrap">
                Events
              </TabsTrigger>
              <TabsTrigger value="topups" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300 hover:text-white hover:bg-slate-600/50 text-sm py-2 px-4 rounded-md transition-all whitespace-nowrap">
                Top-ups
              </TabsTrigger>
              <TabsTrigger value="cashouts" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300 hover:text-white hover:bg-slate-600/50 text-sm py-2 px-4 rounded-md transition-all whitespace-nowrap">
                Cash Outs
              </TabsTrigger>
              <TabsTrigger value="transactions" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300 hover:text-white hover:bg-slate-600/50 text-sm py-2 px-4 rounded-md transition-all whitespace-nowrap">
                Finance
              </TabsTrigger>
              <TabsTrigger value="toys" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300 hover:text-white hover:bg-slate-600/50 text-sm py-2 px-4 rounded-md transition-all whitespace-nowrap">
                Toys
              </TabsTrigger>
              <TabsTrigger value="reports" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300 hover:text-white hover:bg-slate-600/50 text-sm py-2 px-4 rounded-md transition-all whitespace-nowrap">
                Reports
              </TabsTrigger>
              <TabsTrigger value="content" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300 hover:text-white hover:bg-slate-600/50 text-sm py-2 px-4 rounded-md transition-all whitespace-nowrap">
                Content
              </TabsTrigger>
              <TabsTrigger value="pets" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300 hover:text-white hover:bg-slate-600/50 text-sm py-2 px-4 rounded-md transition-all whitespace-nowrap">
                Pets
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300 hover:text-white hover:bg-slate-600/50 text-sm py-2 px-4 rounded-md transition-all whitespace-nowrap">
                Games
              </TabsTrigger>
              <TabsTrigger value="marketplace" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300 hover:text-white hover:bg-slate-600/50 text-sm py-2 px-4 rounded-md transition-all whitespace-nowrap">
                Market
              </TabsTrigger>
              <TabsTrigger value="tokens" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300 hover:text-white hover:bg-slate-600/50 text-sm py-2 px-4 rounded-md transition-all whitespace-nowrap">
                Claims
              </TabsTrigger>
              <TabsTrigger value="token-transactions" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300 hover:text-white hover:bg-slate-600/50 text-sm py-2 px-4 rounded-md transition-all whitespace-nowrap">
                Tokens
              </TabsTrigger>
              <TabsTrigger value="emails" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300 hover:text-white hover:bg-slate-600/50 text-sm py-2 px-4 rounded-md transition-all whitespace-nowrap">
                Emails
              </TabsTrigger>
            </TabsList>
          </div>

          {/* User Management Tab */}
          <TabsContent value="users">
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white text-lg font-medium">User Management</CardTitle>
                  <Button 
                    onClick={() => downloadCSV(filteredUsers, 'users')}
                    variant="outline" 
                    size="sm"
                    className="bg-blue-600/20 text-blue-300 border-blue-500/30 hover:bg-blue-600/40"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
                <div className="flex gap-3 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-10 bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-400"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* User Management Table */}
                <div className="bg-gray-800/30 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow className="border-gray-600/30 bg-gray-700/30">
                          <TableHead className="text-gray-300 font-medium py-3 px-4 min-w-[150px]">User</TableHead>
                          <TableHead className="text-gray-300 font-medium py-3 px-4 min-w-[180px]">Email</TableHead>
                          <TableHead className="text-gray-300 font-medium py-3 px-4 min-w-[140px]">Phone</TableHead>
                          <TableHead className="text-gray-300 font-medium py-3 px-4 min-w-[100px]">Gender</TableHead>
                          <TableHead className="text-gray-300 font-medium py-3 px-4 min-w-[120px]">Date of Birth</TableHead>
                          <TableHead className="text-gray-300 font-medium py-3 px-4 min-w-[100px]">Credits</TableHead>
                          <TableHead className="text-gray-300 font-medium py-3 px-4 min-w-[80px]">Points</TableHead>
                          <TableHead className="text-gray-300 font-medium py-3 px-4 min-w-[80px]">Tokens</TableHead>
                          <TableHead className="text-gray-300 font-medium py-3 px-4 min-w-[80px]">Role</TableHead>
                          <TableHead className="text-gray-300 font-medium py-3 px-4 min-w-[120px]">Join Date</TableHead>
                          <TableHead className="text-gray-300 font-medium py-3 px-4 min-w-[150px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user: any) => (
                      <TableRow 
                        key={user.id} 
                        className={`border-gray-600/20 transition-colors hover:bg-gray-700/30 ${
                          highlightedUserId === user.id ? 'bg-blue-500/20 border-blue-400/50' : ''
                        }`}
                      >
                        <TableCell className="text-white py-3 px-4">
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

          {/* Payment Verification Tab */}
          <TabsContent value="payment-verifications">
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white text-lg font-medium">Payment Verification</CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="text-slate-300 text-sm">
                      Total: <span className="font-semibold text-white">{paymentVerifications.length}</span>
                    </div>
                    <Button 
                      onClick={() => downloadCSV(paymentVerifications, 'payment-verifications')}
                      variant="outline" 
                      size="sm"
                      className="bg-blue-600/20 text-blue-300 border-blue-500/30 hover:bg-blue-600/40"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
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
                        <TableHead className="text-gray-300">Description</TableHead>
                        <TableHead className="text-gray-300">Receipt</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">Points Awarded</TableHead>
                        <TableHead className="text-gray-300">Submitted</TableHead>
                        <TableHead className="text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentVerifications
                        .slice((paymentVerificationsPage - 1) * paymentVerificationsPerPage, paymentVerificationsPage * paymentVerificationsPerPage)
                        .map((verification: any) => (
                        <TableRow key={verification.id}>
                          <TableCell className="text-white">
                            {verification.userFirstName} {verification.userLastName}
                            <div className="text-sm text-gray-400">{verification.userEmail}</div>
                          </TableCell>
                          <TableCell className="text-green-300 font-semibold">
                            IDR {parseFloat(verification.amount).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {verification.description || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {verification.receiptImageUrl ? (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20">
                                    <Eye className="h-4 w-4 mr-1" />
                                    View Receipt
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                                  <DialogHeader>
                                    <DialogTitle>Payment Receipt</DialogTitle>
                                  </DialogHeader>
                                  <div className="flex-1 overflow-y-auto">
                                    <img 
                                      src={verification.receiptImageUrl} 
                                      alt="Payment receipt" 
                                      className="w-full h-auto object-contain max-h-[70vh]"
                                    />
                                  </div>
                                </DialogContent>
                              </Dialog>
                            ) : (
                              <span className="text-gray-400">No receipt</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={verification.status === 'approved' ? 'default' : 
                                     verification.status === 'rejected' ? 'destructive' : 'secondary'}
                            >
                              {verification.status.charAt(0).toUpperCase() + verification.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {verification.pointsAwarded || 'N/A'}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {formatDate(verification.createdAt)}
                          </TableCell>
                          <TableCell>
                            {verification.status === 'pending' ? (
                              <div className="flex gap-2">
                                <Dialog open={openApproveDialog === verification.id} onOpenChange={(open) => setOpenApproveDialog(open ? verification.id : null)}>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="default" 
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      Approve
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="bg-gray-900 border-gray-700">
                                    <DialogHeader>
                                      <DialogTitle className="text-white">Approve Payment Verification</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <Label className="text-gray-300">Points to Award</Label>
                                        <Input
                                          type="number"
                                          value={approveForm.pointsAwarded}
                                          onChange={(e) => setApproveForm({...approveForm, pointsAwarded: parseInt(e.target.value) || 0})}
                                          className="bg-gray-800 border-gray-600 text-white"
                                          placeholder="Enter points to award"
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-gray-300">Admin Notes</Label>
                                        <Textarea
                                          value={approveForm.adminNotes}
                                          onChange={(e) => setApproveForm({...approveForm, adminNotes: e.target.value})}
                                          className="bg-gray-800 border-gray-600 text-white"
                                          placeholder="Add notes (optional)"
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          onClick={() => {
                                            approvePaymentVerificationMutation.mutate({
                                              id: verification.id,
                                              pointsAwarded: approveForm.pointsAwarded,
                                              adminNotes: approveForm.adminNotes
                                            });
                                          }}
                                          disabled={approvePaymentVerificationMutation.isPending}
                                          className="bg-green-600 hover:bg-green-700"
                                        >
                                          {approvePaymentVerificationMutation.isPending ? "Approving..." : "Approve"}
                                        </Button>
                                        <Button
                                          variant="outline"
                                          onClick={() => setOpenApproveDialog(null)}
                                          className="border-gray-600 text-white"
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                
                                <Dialog open={openRejectDialog === verification.id} onOpenChange={(open) => setOpenRejectDialog(open ? verification.id : null)}>
                                  <DialogTrigger asChild>
                                    <Button variant="destructive" size="sm">
                                      <X className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="bg-gray-900 border-gray-700">
                                    <DialogHeader>
                                      <DialogTitle className="text-white">Reject Payment Verification</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <Label className="text-gray-300">Rejection Reason</Label>
                                        <Textarea
                                          value={rejectForm.adminNotes}
                                          onChange={(e) => setRejectForm({...rejectForm, adminNotes: e.target.value})}
                                          className="bg-gray-800 border-gray-600 text-white"
                                          placeholder="Explain why this verification is being rejected"
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          onClick={() => {
                                            rejectPaymentVerificationMutation.mutate({
                                              id: verification.id,
                                              adminNotes: rejectForm.adminNotes
                                            });
                                          }}
                                          disabled={rejectPaymentVerificationMutation.isPending}
                                          variant="destructive"
                                        >
                                          {rejectPaymentVerificationMutation.isPending ? "Rejecting..." : "Reject"}
                                        </Button>
                                        <Button
                                          variant="outline"
                                          onClick={() => setOpenRejectDialog(null)}
                                          className="border-gray-600 text-white"
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400">
                                {verification.status === 'approved' ? 'Approved' : 'Rejected'}
                                {verification.adminNotes && (
                                  <div className="mt-1 text-xs text-gray-500 max-w-[200px] truncate" title={verification.adminNotes}>
                                    {verification.adminNotes}
                                  </div>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Payment Verifications Pagination */}
                {paymentVerifications.length > paymentVerificationsPerPage && (
                  <div className="flex items-center justify-between mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentVerificationsPage(Math.max(1, paymentVerificationsPage - 1))}
                      disabled={paymentVerificationsPage === 1}
                      className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                    >
                      Previous
                    </Button>
                    
                    <div className="flex gap-2">
                      {Array.from({ 
                        length: Math.min(10, Math.ceil(paymentVerifications.length / paymentVerificationsPerPage)) 
                      }, (_, i) => {
                        const totalPages = Math.ceil(paymentVerifications.length / paymentVerificationsPerPage);
                        const currentPage = paymentVerificationsPage;
                        const maxPagesToShow = 10;
                        
                        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
                        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
                        
                        if (endPage - startPage + 1 < maxPagesToShow) {
                          startPage = Math.max(1, endPage - maxPagesToShow + 1);
                        }
                        
                        return startPage + i;
                      }).filter(page => page <= Math.ceil(paymentVerifications.length / paymentVerificationsPerPage)).map((page) => (
                        <Button
                          key={page}
                          variant={page === paymentVerificationsPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPaymentVerificationsPage(page)}
                          className={`${
                            page === paymentVerificationsPage 
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
                      onClick={() => setPaymentVerificationsPage(Math.min(Math.ceil(paymentVerifications.length / paymentVerificationsPerPage), paymentVerificationsPage + 1))}
                      disabled={paymentVerificationsPage === Math.ceil(paymentVerifications.length / paymentVerificationsPerPage)}
                      className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top-ups Tab */}
          <TabsContent value="topups">
            <Card className="bg-slate-800/60 border-slate-700/50">
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
            <Card className="bg-slate-800/60 border-slate-700/50">
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

          {/* Cash Outs Tab */}
          <TabsContent value="cashouts">
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">Cash Out Management</CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="text-white">
                      Total Requests: <span className="font-semibold">{cashOutRequests.length}</span>
                    </div>
                    <Button 
                      onClick={() => downloadCSV(filteredCashOuts, 'cashouts')}
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
                      placeholder="Search cash outs..."
                      value={cashOutSearch}
                      onChange={(e) => setCashOutSearch(e.target.value)}
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
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-gray-300">User</TableHead>
                        <TableHead className="text-gray-300">Amount</TableHead>
                        <TableHead className="text-gray-300">Bank Details</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">Requested</TableHead>
                        <TableHead className="text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCashOuts.map((cashOut: any) => (
                        <TableRow key={cashOut.id}>
                          <TableCell className="text-white">
                            {cashOut.user?.firstName} {cashOut.user?.lastName}
                            <div className="text-sm text-gray-400">{cashOut.user?.email}</div>
                          </TableCell>
                          <TableCell className="text-green-300 font-semibold">
                            IDR {parseFloat(cashOut.amount).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            <div className="text-sm">
                              <div>{cashOut.bankName}</div>
                              <div>{cashOut.accountNumber}</div>
                              <div>{cashOut.accountHolderName}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={cashOut.status === 'approved' ? 'default' : 
                                     cashOut.status === 'rejected' ? 'destructive' : 'secondary'}
                            >
                              {cashOut.status.charAt(0).toUpperCase() + cashOut.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {formatDate(cashOut.createdAt)}
                          </TableCell>
                          <TableCell>
                            {cashOut.status === 'pending' ? (
                              <div className="flex gap-2">
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={() => {
                                    updateCashOutMutation.mutate({ 
                                      id: cashOut.id, 
                                      status: 'approved', 
                                      adminNotes: '' 
                                    });
                                  }}
                                  disabled={updateCashOutMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => {
                                    updateCashOutMutation.mutate({ 
                                      id: cashOut.id, 
                                      status: 'rejected', 
                                      adminNotes: 'Rejected by admin' 
                                    });
                                  }}
                                  disabled={updateCashOutMutation.isPending}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">
                                {cashOut.status === 'approved' ? 'Approved' : 'Rejected'}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">Transaction Management</CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="text-white">
                      Total Transactions: <span className="font-semibold">{allTransactions.length}</span>
                    </div>
                    <Button 
                      onClick={() => downloadCSV(filteredTransactions, 'transactions')}
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
                      placeholder="Search transactions..."
                      value={transactionSearch}
                      onChange={(e) => setTransactionSearch(e.target.value)}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-300"
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="purchase">Purchase</SelectItem>
                      <SelectItem value="sale">Sale</SelectItem>
                      <SelectItem value="topup">Top-up</SelectItem>
                      <SelectItem value="cashout">Cash Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-gray-300">User</TableHead>
                        <TableHead className="text-gray-300">Type</TableHead>
                        <TableHead className="text-gray-300">Amount</TableHead>
                        <TableHead className="text-gray-300">Description</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction: any) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="text-white">
                            {transaction.user?.firstName} {transaction.user?.lastName}
                            <div className="text-sm text-gray-400">{transaction.user?.email}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-blue-400 text-blue-300">
                              {transaction.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-green-300 font-semibold">
                            IDR {parseFloat(transaction.amount).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {transaction.description}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={transaction.status === 'completed' ? 'default' : 
                                     transaction.status === 'failed' ? 'destructive' : 'secondary'}
                            >
                              {transaction.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {formatDate(transaction.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Reports & Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-400">
                        IDR {allTransactions
                          .filter((t: any) => t.type === 'purchase' && t.status === 'completed')
                          .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0)
                          .toLocaleString()}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">From completed purchases</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">Active Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-400">{allUsers.length}</div>
                      <p className="text-xs text-gray-400 mt-1">Total registered users</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">Pending Cashouts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-400">
                        {cashOutRequests.filter((c: any) => c.status === 'pending').length}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Awaiting approval</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">Total Toys</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-400">{allToys.length}</div>
                      <p className="text-xs text-gray-400 mt-1">In the system</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">Active Pets</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-pink-400">{activatedPets.length}</div>
                      <p className="text-xs text-gray-400 mt-1">Currently active</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">Token Claims</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-400">{tokenClaims.length}</div>
                      <p className="text-xs text-gray-400 mt-1">Total claims processed</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Management Tab */}
          <TabsContent value="content">
            <div className="space-y-6">
              <Card className="bg-slate-800/60 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white">Promotion Banners</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.isArray(promotionBanners) ? promotionBanners.map((banner: any) => (
                      <div key={banner.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-white font-semibold">{banner.title}</h3>
                            <p className="text-gray-300 text-sm mt-1">{banner.description}</p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant={banner.isActive ? 'default' : 'secondary'}>
                                {banner.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                              <Badge variant="outline" className="border-blue-400 text-blue-300">
                                {banner.type}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="border-white/20 text-white">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )) : <div className="text-gray-400">No banners available</div>}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/60 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white">Reward Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.isArray(rewardItems) ? rewardItems.map((reward: any) => (
                      <div key={reward.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-white font-semibold">{reward.name}</h3>
                            <p className="text-gray-300 text-sm mt-1">{reward.description}</p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline" className="border-green-400 text-green-300">
                                {reward.pointsCost} points
                              </Badge>
                              <Badge variant={reward.isAvailable ? 'default' : 'secondary'}>
                                {reward.isAvailable ? 'Available' : 'Unavailable'}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-white/20 text-white"
                              onClick={() => handleEditReward(reward)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )) : <div className="text-gray-400">No reward items available</div>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Game Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Game Leaderboard Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-gray-300">Rank</TableHead>
                        <TableHead className="text-gray-300">Player</TableHead>
                        <TableHead className="text-gray-300">Score</TableHead>
                        <TableHead className="text-gray-300">Tokens Earned</TableHead>
                        <TableHead className="text-gray-300">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(gameLeaderboard) ? gameLeaderboard.map((entry: any, index: number) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-white font-semibold">
                            #{index + 1}
                          </TableCell>
                          <TableCell className="text-white">
                            {entry.user?.firstName} {entry.user?.lastName}
                            <div className="text-sm text-gray-400">{entry.user?.email}</div>
                          </TableCell>
                          <TableCell className="text-blue-300 font-semibold">
                            {entry.score.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-green-300">
                            {entry.tokensEarned || 0}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {formatDate(entry.createdAt)}
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-400">
                            No leaderboard data available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Marketplace Purchases Tab */}
          <TabsContent value="marketplace">
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Marketplace Purchase Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-gray-300">Buyer</TableHead>
                        <TableHead className="text-gray-300">Seller</TableHead>
                        <TableHead className="text-gray-300">Toy</TableHead>
                        <TableHead className="text-gray-300">Price</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">Date</TableHead>
                        <TableHead className="text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(pendingPurchases) ? pendingPurchases.map((purchase: any) => (
                        <TableRow key={purchase.id}>
                          <TableCell className="text-white">
                            {purchase.buyer?.firstName} {purchase.buyer?.lastName}
                            <div className="text-sm text-gray-400">{purchase.buyer?.email}</div>
                          </TableCell>
                          <TableCell className="text-white">
                            {purchase.seller?.firstName} {purchase.seller?.lastName}
                            <div className="text-sm text-gray-400">{purchase.seller?.email}</div>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {purchase.listing?.toy?.name}
                            <div className="text-sm text-gray-400">
                              {purchase.listing?.toy?.rarity} • {purchase.listing?.toy?.color}
                            </div>
                          </TableCell>
                          <TableCell className="text-green-300 font-semibold">
                            IDR {parseFloat(purchase.listing?.price || '0').toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={purchase.status === 'completed' ? 'default' : 
                                     purchase.status === 'failed' ? 'destructive' : 'secondary'}
                            >
                              {purchase.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {formatDate(purchase.createdAt)}
                          </TableCell>
                          <TableCell>
                            {purchase.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700">
                                  <Check className="h-4 w-4 mr-1" />
                                  Complete
                                </Button>
                                <Button variant="destructive" size="sm">
                                  <X className="h-4 w-4 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-gray-400">
                            No marketplace purchases available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Token Claims Tab */}
          <TabsContent value="tokens">
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Token Claims Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-gray-300">User</TableHead>
                        <TableHead className="text-gray-300">Tokens Awarded</TableHead>
                        <TableHead className="text-gray-300">Reward Date</TableHead>
                        <TableHead className="text-gray-300">Pet Count</TableHead>
                        <TableHead className="text-gray-300">All Pets Healthy</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tokenClaims?.map((claim: any) => (
                        <TableRow key={claim.id}>
                          <TableCell className="text-white">
                            {claim.user?.firstName} {claim.user?.lastName}
                            <div className="text-sm text-gray-400">{claim.user?.email}</div>
                          </TableCell>
                          <TableCell className="text-green-300 font-semibold">
                            {claim.tokensAwarded}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {formatDate(claim.rewardDate)}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {claim.petCount || 0}
                          </TableCell>
                          <TableCell>
                            <Badge variant={claim.allPetsHealthy ? 'default' : 'secondary'}>
                              {claim.allPetsHealthy ? 'Yes' : 'No'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="default">
                              Processed
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Token Transactions Tab */}
          <TabsContent value="token-transactions">
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">Token Transaction Management</CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="text-white">
                      Total Transactions: <span className="font-semibold">{tokenTransactions.length}</span>
                    </div>
                    <Button 
                      onClick={() => downloadCSV(tokenTransactions, 'token-transactions')}
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
                        <TableHead className="text-gray-300">Type</TableHead>
                        <TableHead className="text-gray-300">Tokens</TableHead>
                        <TableHead className="text-gray-300">Description</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tokenTransactions
                        .slice((tokenTransactionsPage - 1) * tokenTransactionsPerPage, tokenTransactionsPage * tokenTransactionsPerPage)
                        .map((transaction: any) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="text-white">
                            {transaction.user?.firstName} {transaction.user?.lastName}
                            <div className="text-sm text-gray-400">{transaction.user?.email}</div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={transaction.type === 'earned' ? 'default' : 'secondary'}
                              className={transaction.type === 'earned' ? 'bg-green-600' : 'bg-red-600'}
                            >
                              {transaction.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-yellow-300 font-semibold">
                            {transaction.tokens > 0 ? '+' : ''}{transaction.tokens}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {transaction.description}
                          </TableCell>
                          <TableCell>
                            <Badge variant="default">
                              {transaction.status || 'completed'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {formatDate(transaction.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Token Transactions Pagination */}
                {tokenTransactions.length > tokenTransactionsPerPage && (
                  <div className="flex items-center justify-between mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTokenTransactionsPage(Math.max(1, tokenTransactionsPage - 1))}
                      disabled={tokenTransactionsPage === 1}
                      className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                    >
                      Previous
                    </Button>
                    
                    <div className="flex gap-2">
                      {Array.from({ 
                        length: Math.min(10, Math.ceil(tokenTransactions.length / tokenTransactionsPerPage)) 
                      }, (_, i) => {
                        const totalPages = Math.ceil(tokenTransactions.length / tokenTransactionsPerPage);
                        const currentPage = tokenTransactionsPage;
                        const maxPagesToShow = 10;
                        
                        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
                        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
                        
                        if (endPage - startPage + 1 < maxPagesToShow) {
                          startPage = Math.max(1, endPage - maxPagesToShow + 1);
                        }
                        
                        return startPage + i;
                      }).filter(page => page <= Math.ceil(tokenTransactions.length / tokenTransactionsPerPage)).map((page) => (
                        <Button
                          key={page}
                          variant={page === tokenTransactionsPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTokenTransactionsPage(page)}
                          className={`${
                            page === tokenTransactionsPage 
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
                      onClick={() => setTokenTransactionsPage(Math.min(Math.ceil(tokenTransactions.length / tokenTransactionsPerPage), tokenTransactionsPage + 1))}
                      disabled={tokenTransactionsPage === Math.ceil(tokenTransactions.length / tokenTransactionsPerPage)}
                      className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Toy Management Tab */}
          <TabsContent value="toys">
            <div className="space-y-6">
              {/* Season Management */}
              <div className="grid grid-cols-1 gap-6">
                {/* Season Management */}
                <Card className="bg-slate-800/60 border-slate-700/50">
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
                                    setEditSeasonData({
                                      id: season.id,
                                      name: season.name,
                                      displayName: season.displayName,
                                      description: season.description || "",
                                      backgroundColor: season.backgroundColor || "#3B82F6"
                                    });
                                    setShowEditSeasonDialog(true);
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


              </div>

              {/* Toy Template Management */}
              <Card className="bg-slate-800/60 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white">Create Template Toy</CardTitle>
                  <p className="text-gray-300 text-sm">Create toy templates/avatars for bulk generation (no owner assigned)</p>
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
                      <Label className="text-gray-300">Image Upload</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="bg-white/10 border-white/20 text-white"
                        disabled={uploading}
                      />
                      {uploading && (
                        <div className="text-sm text-blue-300 mt-1">Uploading...</div>
                      )}
                      {newToy.imageUrl && (
                        <div className="mt-2 flex items-center gap-2">
                          <img 
                            src={newToy.imageUrl} 
                            alt="Preview" 
                            className="w-12 h-12 rounded object-cover border border-white/20"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setNewToy({ ...newToy, imageUrl: '' })}
                            className="bg-red-600/20 border-red-600 text-red-300 hover:bg-red-600/30"
                          >
                            Remove
                          </Button>
                        </div>
                      )}
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
                          createToyTemplateMutation.mutate({
                            name: newToy.name,
                            species: 'Doluruu', // Default species since you only have one
                            rarity: newToy.rarity || 'common',
                            color: newToy.color || 'blue',
                            gender: newToy.gender || 'male',
                            imageUrl: newToy.imageUrl || '',
                            basePrice: newToy.price || 0,
                            description: newToy.description || '',
                            seasonId: newToy.seasonId || undefined,
                            isActive: true
                          });
                        }}
                        className="bg-blue-600 hover:bg-blue-700 w-full"
                        disabled={!newToy.name || createToyMutation.isPending}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {createToyMutation.isPending ? "Creating..." : "Create Template"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* List of Created Toys */}
              <Card className="bg-slate-800/60 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white">
                    List of Created Toys
                  </CardTitle>
                  <p className="text-gray-300 text-sm">Manage all created toy templates</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredToyTemplates.map((template: any) => (
                      <div key={template.id} className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {template.imageUrl && template.imageUrl !== 'placeholder-image-url' ? (
                            <img 
                              src={template.imageUrl} 
                              alt={template.name} 
                              className="w-12 h-12 rounded object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-gray-600 flex items-center justify-center">
                              <span className="text-xs text-gray-400">No Image</span>
                            </div>
                          )}
                          <div>
                            <h4 className="text-white font-medium">{template.name}</h4>
                            <div className="flex items-center space-x-2 text-sm text-gray-300">
                              <span>ID: {template.id}</span>
                              <span>•</span>
                              <span className="capitalize">{template.rarity}</span>
                              <span>•</span>
                              <span className="capitalize">{template.gender || 'male'}</span>
                              {template.color && (
                                <>
                                  <span>•</span>
                                  <span className="capitalize">{template.color}</span>
                                </>
                              )}

                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getRarityColor(template.rarity)}>
                            {template.rarity}
                          </Badge>
                          <Button
                            onClick={() => {
                              setEditingToy(template);
                              setEditedToyData({
                                name: template.name,
                                rarity: template.rarity,
                                color: template.color || '',
                                price: template.basePrice || 0,
                                gender: template.gender || 'male',
                                seasonId: template.seasonId || null,
                                imageUrl: template.imageUrl || ''
                              });
                              setShowEditToyDialog(true);
                            }}
                            size="sm"
                            variant="outline"
                            className="text-white border-white/20 hover:bg-white/10"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => {
                              if (confirm(`Delete template "${template.name}"? This action cannot be undone.`)) {
                                deleteToyMutation.mutate(template.id);
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
                    {filteredToyTemplates.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        No toy templates found matching your filters
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Bulk Generator */}
              <Card className="bg-slate-800/60 border-slate-700/50">
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
                            {(filteredToyTemplates || []).slice(0, 50).filter((template: any) => template && template.id).map((template: any) => (
                              <SelectItem key={template.id} value={template.id.toString()}>
                                {template.name} - {template.rarity} ({template.color || 'No color'})
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
                      const selectedToy = filteredToyTemplates.find((template: any) => template.id === selectedToyForBulk);
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
                          const templateToClone = filteredToyTemplates.find((template: any) => template.id === selectedToyForBulk);
                          if (!templateToClone) {
                            toast({ title: "Error", description: "Selected template not found", variant: "destructive" });
                            return;
                          }
                          
                          const bulkData = {
                            baseToy: templateToClone,
                            quantity: bulkQuantity,
                            overrides: bulkOverrides
                          };
                          
                          bulkGenerationMutation.mutate(bulkData);
                        }}
                        className="bg-purple-600 hover:bg-purple-700 w-full"
                        disabled={!selectedToyForBulk || bulkQuantity < 1 || bulkGenerationMutation.isPending}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        {bulkGenerationMutation.isPending ? "Generating..." : `Generate ${bulkQuantity} Toys`}
                      </Button>

                      {selectedToyForBulk && bulkQuantity > 0 && (
                        <div className="text-xs text-slate-400 bg-white/5 rounded p-3 border border-white/10 mt-4">
                          <div className="font-medium text-slate-300 mb-1">What this does:</div>
                          Creates {bulkQuantity} individual collectible toys from the selected template. Each toy will have a unique QR code and be available for users to discover and collect.
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* All Toys Database */}
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">All Toys Database</CardTitle>
                <p className="text-gray-300 text-sm">Complete overview of generated toys and active pets in the system</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Quick Stats Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-yellow-600/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-300">
                        {allToysQuery?.data?.data?.filter((toy: any) => !toy.ownerId && toy.templateId)?.length || 0}
                      </div>
                      <div className="text-sm text-gray-300">Generated Toys</div>
                      <div className="text-xs text-gray-400 mt-1">Ready to collect</div>
                    </div>
                    <div className="bg-green-600/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-300">
                        {activatedPetsResponse?.data?.length || 0}
                      </div>
                      <div className="text-sm text-gray-300">Active Pets</div>
                      <div className="text-xs text-gray-400 mt-1">Being cared for</div>
                    </div>
                    <div className="bg-purple-600/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-300">
                        {toysResponse?.data?.filter((toy: any) => toy.isListed)?.length || 0}
                      </div>
                      <div className="text-sm text-gray-300">On Market</div>
                      <div className="text-xs text-gray-400 mt-1">For sale</div>
                    </div>
                  </div>

                  {/* Generated Toys Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        Generated Toys ({filteredToys.length})
                      </h3>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Search toys..."
                          value={toySearchTerm}
                          onChange={(e) => setToySearchTerm(e.target.value)}
                          className="w-48 bg-white/10 border-white/20 text-white placeholder-gray-400"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {currentPageToys.map((toy: any) => (
                        <div key={toy.id} className="bg-yellow-600/10 rounded-lg p-4 border border-yellow-600/20">
                          <div className="flex items-start gap-4">
                            {/* Toy Image */}
                            <div className="flex-shrink-0">
                              {toy.imageUrl && toy.imageUrl !== 'placeholder-image-url' ? (
                                <img 
                                  src={toy.imageUrl} 
                                  alt={toy.name}
                                  className="w-20 h-20 rounded object-cover border-2 border-gray-600"
                                />
                              ) : (
                                <div className="w-20 h-20 bg-gray-700 rounded border-2 border-gray-600 flex items-center justify-center">
                                  <span className="text-xs text-gray-400">📦</span>
                                </div>
                              )}
                            </div>

                            {/* QR Code */}
                            <div className="flex-shrink-0">
                              {toy.qrCode ? (
                                <div className="relative group">
                                  <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(toy.qrCode)}`}
                                    alt="QR Code"
                                    className="w-20 h-20 rounded border-2 border-gray-600 cursor-pointer"
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(toy.qrCode)}`;
                                      link.download = `toy-${toy.id}-qr.png`;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                      toast({
                                        title: "QR Code Downloaded!",
                                        description: "QR code image has been downloaded.",
                                        duration: 2000,
                                      });
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                                    <span className="text-xs text-white text-center px-1">Click to download</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="w-20 h-20 bg-gray-700 rounded border-2 border-gray-600 flex items-center justify-center">
                                  <span className="text-xs text-gray-400">No QR</span>
                                </div>
                              )}
                            </div>

                            {/* Toy Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="text-white font-semibold text-lg">{toy.name}</h4>
                                  <div className="mt-1 space-y-1">
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="text-gray-400">ID:</span>
                                      <span className="text-yellow-300 font-mono">#{toy.id}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="text-gray-400">Owner:</span>
                                      <span className="text-gray-300">{toy.ownerId || 'null'}</span>
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-500 font-medium"
                                  onClick={() => {
                                    setEditingToy(toy);
                                    setEditedToyData({
                                      name: toy.name,
                                      gender: toy.gender,
                                      color: toy.color,
                                      rarity: toy.rarity,
                                      basePrice: toy.basePrice || 0,
                                      qrCode: toy.qrCode
                                    });
                                    setShowEditToyDialog(true);
                                  }}
                                >
                                  Edit Toy
                                </Button>
                              </div>

                              {/* Toy Properties */}
                              <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2">
                                <div className="bg-slate-800/50 rounded p-2">
                                  <div className="text-xs text-gray-400">Gender</div>
                                  <div className="text-sm text-white flex items-center gap-1">
                                    {toy.gender === 'male' ? '♂' : '♀'}
                                    <span className={toy.gender === 'male' ? 'text-blue-400' : 'text-pink-400'}>
                                      {toy.gender}
                                    </span>
                                  </div>
                                </div>
                                <div className="bg-slate-800/50 rounded p-2">
                                  <div className="text-xs text-gray-400">Color</div>
                                  <div className="text-sm text-white flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full border border-gray-600"
                                      style={{ backgroundColor: toy.color }}
                                    ></div>
                                    <span>{toy.color}</span>
                                  </div>
                                </div>
                                <div className="bg-slate-800/50 rounded p-2">
                                  <div className="text-xs text-gray-400">Rarity</div>
                                  <div className={`text-sm font-medium ${
                                    toy.rarity === 'legendary' ? 'text-orange-400' :
                                    toy.rarity === 'epic' ? 'text-purple-400' :
                                    toy.rarity === 'rare' ? 'text-blue-400' :
                                    toy.rarity === 'uncommon' ? 'text-green-400' :
                                    'text-gray-400'
                                  }`}>
                                    {toy.rarity}
                                  </div>
                                </div>
                                <div className="bg-slate-800/50 rounded p-2">
                                  <div className="text-xs text-gray-400">Season</div>
                                  <div className="text-sm text-white">
                                    {toy.season?.name || toy.seasonName || 'N/A'}
                                  </div>
                                </div>
                                <div className="bg-slate-800/50 rounded p-2">
                                  <div className="text-xs text-gray-400">Price</div>
                                  <div className="text-sm text-white">
                                    ${toy.basePrice || 'N/A'}
                                  </div>
                                </div>
                              </div>

                              {/* QR Code Details */}
                              {toy.qrCode && (
                                <div className="mt-3 bg-slate-800/30 rounded p-2">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="text-xs text-gray-400">QR Code</div>
                                      <div className="text-sm text-white font-mono break-all">{toy.qrCode}</div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-gray-400 hover:text-white p-2"
                                      onClick={() => {
                                        navigator.clipboard.writeText(toy.qrCode);
                                        toast({
                                          title: "QR Code Copied!",
                                          description: "The QR code has been copied to your clipboard.",
                                          duration: 2000,
                                        });
                                      }}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )) || (
                        <div className="text-center py-8 text-gray-400">No generated toys found</div>
                      )}
                    </div>
                    
                    {/* Toy Pagination */}
                    {totalToyPages > 1 && (
                      <div className="flex justify-center gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setToyCurrentPage(Math.max(1, toyCurrentPage - 1))}
                          disabled={toyCurrentPage === 1}
                          className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600 font-medium px-4 py-2"
                        >
                          ← Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalToyPages) }, (_, i) => {
                            const pageNum = toyCurrentPage <= 3 ? i + 1 : toyCurrentPage - 2 + i;
                            if (pageNum > totalToyPages) return null;
                            return (
                              <Button
                                key={pageNum}
                                size="sm"
                                variant={toyCurrentPage === pageNum ? "default" : "outline"}
                                onClick={() => setToyCurrentPage(pageNum)}
                                className={toyCurrentPage === pageNum 
                                  ? "bg-yellow-600 text-white font-bold min-w-[40px]" 
                                  : "text-white border-white/40 hover:bg-white/20 bg-white/10 font-medium min-w-[40px]"
                                }
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setToyCurrentPage(Math.min(totalToyPages, toyCurrentPage + 1))}
                          disabled={toyCurrentPage === totalToyPages}
                          className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600 font-medium px-4 py-2"
                        >
                          Next →
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Active Pets Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        Active Pets ({totalPetCount}) - Page {petCurrentPage} of {totalPetPages}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Search pets..."
                          value={petSearchTerm}
                          onChange={(e) => setPetSearchTerm(e.target.value)}
                          className="w-48 bg-white/10 border-white/20 text-white placeholder-gray-400"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {currentPagePets.map((pet: any) => (
                        <div key={pet.id} className="bg-green-600/10 rounded-lg p-4 border border-green-600/20">
                          <div className="flex items-start gap-4">
                            {/* Pet Image */}
                            <div className="flex-shrink-0">
                              {pet.imageUrl && pet.imageUrl !== 'placeholder-image-url' ? (
                                <img 
                                  src={pet.imageUrl} 
                                  alt={pet.name}
                                  className="w-20 h-20 rounded object-cover border-2 border-gray-600"
                                />
                              ) : (
                                <div className="w-20 h-20 bg-gray-700 rounded border-2 border-gray-600 flex items-center justify-center">
                                  <span className="text-xs text-gray-400">🎮</span>
                                </div>
                              )}
                            </div>

                            {/* Pet Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="text-white font-semibold text-lg">{pet.name}</h4>
                                  <div className="mt-1 space-y-1">
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="text-gray-400">ID:</span>
                                      <span className="text-green-300 font-mono">#{pet.id}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="text-gray-400">Owner:</span>
                                      <span className="text-blue-300 font-mono">{pet.userId || pet.ownerId || 'Unassigned'}</span>
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-green-600 hover:bg-green-700 text-white border-green-500 font-medium"
                                  onClick={() => {
                                    setEditingPet(pet);
                                    setEditedPetData({
                                      name: pet.name,
                                      currentStage: pet.currentStage,
                                      health: pet.health,
                                      happiness: pet.happiness,
                                      energy: pet.energy,
                                      tokens: pet.totalTokensEarned
                                    });
                                    setShowEditPetDialog(true);
                                  }}
                                >
                                  Edit Pet
                                </Button>
                              </div>

                              {/* Pet Stats Grid */}
                              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                                <div className="bg-blue-600/20 rounded p-2 border border-blue-600/30">
                                  <div className="text-xs text-blue-300 font-medium">Stage</div>
                                  <div className="text-sm text-white font-semibold">
                                    {pet.currentStage || 'Baby'}
                                  </div>
                                </div>
                                <div className="bg-red-600/20 rounded p-2 border border-red-600/30">
                                  <div className="text-xs text-red-300 font-medium">Health</div>
                                  <div className="text-sm text-white font-semibold">
                                    {pet.health || 100}%
                                  </div>
                                </div>
                                <div className="bg-yellow-600/20 rounded p-2 border border-yellow-600/30">
                                  <div className="text-xs text-yellow-300 font-medium">Happiness</div>
                                  <div className="text-sm text-white font-semibold">
                                    {pet.happiness ?? 0}%
                                  </div>
                                </div>
                                <div className="bg-green-600/20 rounded p-2 border border-green-600/30">
                                  <div className="text-xs text-green-300 font-medium">Energy</div>
                                  <div className="text-sm text-white font-semibold">
                                    {pet.energy ?? 0}%
                                  </div>
                                </div>
                                <div className="bg-purple-600/20 rounded p-2 border border-purple-600/30">
                                  <div className="text-xs text-purple-300 font-medium">Hunger</div>
                                  <div className="text-sm text-white font-semibold">
                                    {pet.hunger ?? 0}%
                                  </div>
                                </div>
                                <div className="bg-cyan-600/20 rounded p-2 border border-cyan-600/30">
                                  <div className="text-xs text-cyan-300 font-medium">Cleanliness</div>
                                  <div className="text-sm text-white font-semibold">
                                    {pet.cleanliness ?? 0}%
                                  </div>
                                </div>
                              </div>

                              {/* Additional Pet Info */}
                              <div className="mt-3 bg-slate-800/40 rounded p-3 border border-slate-600/50">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-400">Age:</span>
                                    <span className="text-blue-300 ml-2 font-medium">
                                      {(() => {
                                        const createdDate = new Date(pet.createdAt);
                                        const now = new Date();
                                        const diffInDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
                                        return Math.max(diffInDays, 1);
                                      })()} days
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Tokens:</span>
                                    <span className="text-green-300 ml-2 font-medium">{pet.totalTokensEarned || 0}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )) || (
                        <div className="text-center py-8 text-gray-400">No active pets found</div>
                      )}
                    </div>
                    
                    {/* Pet Pagination */}
                    {totalPetPages > 1 && (
                      <div className="flex justify-center gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPetCurrentPage(Math.max(1, petCurrentPage - 1))}
                          disabled={petCurrentPage === 1}
                          className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600 font-medium px-4 py-2"
                        >
                          ← Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPetPages) }, (_, i) => {
                            const pageNum = petCurrentPage <= 3 ? i + 1 : petCurrentPage - 2 + i;
                            if (pageNum > totalPetPages) return null;
                            return (
                              <Button
                                key={pageNum}
                                size="sm"
                                variant={petCurrentPage === pageNum ? "default" : "outline"}
                                onClick={() => setPetCurrentPage(pageNum)}
                                className={petCurrentPage === pageNum 
                                  ? "bg-green-600 text-white font-bold min-w-[40px]" 
                                  : "text-white border-white/40 hover:bg-white/20 bg-white/10 font-medium min-w-[40px]"
                                }
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPetCurrentPage(Math.min(totalPetPages, petCurrentPage + 1))}
                          disabled={petCurrentPage === totalPetPages}
                          className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600 font-medium px-4 py-2"
                        >
                          Next →
                        </Button>
                      </div>
                    )}
                  </div>


                </div>
              </CardContent>
            </Card>
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

          {/* Email Management Tab */}
          <TabsContent value="emails">
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Email & WhatsApp Management</CardTitle>
                <p className="text-gray-300">Send emails and WhatsApp messages to users</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Custom Email Form */}
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <h3 className="text-white font-semibold">Send Custom Email</h3>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">To (Email Address)</label>
                        <Input
                          value={emailData.to}
                          onChange={(e) => setEmailData({...emailData, to: e.target.value})}
                          placeholder="recipient@example.com"
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
                        <Input
                          value={emailData.subject}
                          onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                          placeholder="Email subject"
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Text Content</label>
                        <textarea
                          value={emailData.text}
                          onChange={(e) => setEmailData({...emailData, text: e.target.value})}
                          placeholder="Plain text email content"
                          className="w-full p-3 rounded-md bg-gray-800 border border-gray-600 text-white min-h-[120px]"
                        />
                      </div>
                      <Button
                        onClick={() => sendEmailMutation.mutate(emailData)}
                        disabled={sendEmailMutation.isPending || !emailData.to || !emailData.subject || !emailData.text}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
                      </Button>
                      
                      <Button
                        onClick={() => {
                          if (emailData.subject.trim() && emailData.text.trim()) {
                            const confirmed = window.confirm(
                              `Send this email to all users?\n\nSubject: ${emailData.subject}\n\nThis action cannot be undone.`
                            );
                            
                            if (confirmed) {
                              fetch('/api/admin/send-email', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                credentials: 'include',
                                body: JSON.stringify({
                                  subject: emailData.subject,
                                  html: emailData.text.replace(/\n/g, '<br>'),
                                  sendToAll: true
                                })
                              })
                              .then(response => response.json())
                              .then(data => {
                                if (data.successCount !== undefined) {
                                  toast({
                                    title: "Email Blast Completed",
                                    description: `Sent to: ${data.successCount} users, Failed: ${data.failureCount}, Total: ${data.totalUsers}`,
                                  });
                                  setEmailData({...emailData, subject: '', text: ''});
                                } else {
                                  toast({
                                    title: "Error",
                                    description: data.message || 'Failed to send email blast',
                                    variant: "destructive"
                                  });
                                }
                              })
                              .catch(error => {
                                console.error('Error:', error);
                                toast({
                                  title: "Error",
                                  description: 'Error sending email blast',
                                  variant: "destructive"
                                });
                              });
                            }
                          } else {
                            toast({
                              title: "Error",
                              description: "Please fill in both subject and text content",
                              variant: "destructive"
                            });
                          }
                        }}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                      >
                        📧 Email Blast to All Users
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <h3 className="text-white font-semibold">Quick Email Actions</h3>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <h4 className="text-gray-300 font-medium">Send Welcome Email</h4>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Email address"
                            value={emailData.to}
                            onChange={(e) => setEmailData({...emailData, to: e.target.value})}
                            className="bg-gray-800 border-gray-600 text-white"
                          />
                          <Input
                            placeholder="Name"
                            className="bg-gray-800 border-gray-600 text-white"
                            id="welcome-name"
                          />
                        </div>
                        <Button
                          onClick={() => {
                            const nameInput = document.getElementById('welcome-name') as HTMLInputElement;
                            sendWelcomeEmailMutation.mutate({
                              email: emailData.to,
                              name: nameInput.value
                            });
                          }}
                          disabled={sendWelcomeEmailMutation.isPending || !emailData.to}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          {sendWelcomeEmailMutation.isPending ? "Sending..." : "Send Welcome Email"}
                        </Button>
                      </div>

                      <div className="border-t border-gray-600 pt-4">
                        <h4 className="text-gray-300 font-medium mb-3">Email Templates</h4>
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            onClick={() => setEmailData({
                              ...emailData,
                              subject: "Account Update Notification",
                              text: "Your account has been updated successfully. If you did not make this change, please contact support immediately."
                            })}
                            className="w-full border-blue-500 bg-blue-600/20 text-blue-300 hover:bg-blue-600/40 hover:text-white font-bold text-sm py-3"
                          >
                            USE ACCOUNT UPDATE EMAIL TEMPLATE
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setEmailData({
                              ...emailData,
                              subject: "Payment Confirmation",
                              text: "Your payment has been processed successfully. Thank you for your purchase!"
                            })}
                            className="w-full border-green-500 bg-green-600/20 text-green-300 hover:bg-green-600/40 hover:text-white font-bold text-sm py-3"
                          >
                            USE PAYMENT CONFIRMATION TEMPLATE
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* WhatsApp Blast Card */}
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <h3 className="text-white font-semibold">WhatsApp Blast</h3>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <h4 className="text-gray-300 font-medium">Send to Users with Mobile Numbers</h4>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                          <textarea
                            placeholder="Hello! This is a message from Reborn Wave Group..."
                            className="w-full p-3 rounded-md bg-gray-800 border border-gray-600 text-white min-h-[100px]"
                            id="whatsapp-message"
                          />
                        </div>
                        <div className="bg-green-600/10 p-3 rounded border border-green-600/20">
                          <p className="text-green-300 text-sm">
                            📱 Users with mobile numbers: {allUsersData?.filter((user: any) => user.phoneNumber && user.phoneNumber.trim() !== '').length || 0}
                          </p>
                          <p className="text-gray-400 text-xs mt-1">
                            Only users who have provided mobile numbers will receive the message
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            const messageInput = document.getElementById('whatsapp-message') as HTMLTextAreaElement;
                            const usersWithMobile = allUsersData?.filter((user: any) => user.phoneNumber) || [];
                            
                            if (messageInput.value.trim() && usersWithMobile.length > 0) {
                              // Show confirmation
                              const confirmed = window.confirm(
                                `Send WhatsApp message to ${usersWithMobile.length} users with mobile numbers?`
                              );
                              
                              if (confirmed) {
                                // Call WhatsApp API
                                fetch('/api/admin/send-whatsapp', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  credentials: 'include',
                                  body: JSON.stringify({
                                    message: messageInput.value,
                                    sendToAll: true
                                  })
                                })
                                .then(response => response.json())
                                .then(data => {
                                  if (data.successCount !== undefined) {
                                    toast({
                                      title: "WhatsApp Blast Completed",
                                      description: `Sent to: ${data.successCount} users, Failed: ${data.failureCount}, Total: ${data.totalUsers}`,
                                    });
                                    messageInput.value = '';
                                  } else {
                                    toast({
                                      title: "Error",
                                      description: data.message || 'Failed to send WhatsApp message',
                                      variant: "destructive"
                                    });
                                  }
                                })
                                .catch(error => {
                                  console.error('Error:', error);
                                  toast({
                                    title: "Error",
                                    description: 'Error sending WhatsApp message',
                                    variant: "destructive"
                                  });
                                });
                              }
                            } else {
                              toast({
                                title: "Error",
                                description: "Please enter a message and ensure users have mobile numbers",
                                variant: "destructive"
                              });
                            }
                          }}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          Send WhatsApp Blast
                        </Button>
                      </div>

                      <div className="border-t border-gray-600 pt-4">
                        <h4 className="text-gray-300 font-medium mb-3">WhatsApp Templates</h4>
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              const messageInput = document.getElementById('whatsapp-message') as HTMLTextAreaElement;
                              messageInput.value = "🎮 New exciting features are now available in Reborn Wave Group! Check out the latest updates in your pet care dashboard.";
                            }}
                            className="w-full border-purple-500 bg-purple-600/20 text-purple-300 hover:bg-purple-600/40 hover:text-white font-bold text-sm py-3"
                          >
                            USE FEATURE UPDATE WHATSAPP TEMPLATE
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              const messageInput = document.getElementById('whatsapp-message') as HTMLTextAreaElement;
                              messageInput.value = "🏆 Don't forget to claim your daily rewards! Your pets are waiting for you in Reborn Wave Group.";
                            }}
                            className="w-full border-orange-500 bg-orange-600/20 text-orange-300 hover:bg-orange-600/40 hover:text-white font-bold text-sm py-3"
                          >
                            USE DAILY REMINDER WHATSAPP TEMPLATE
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pet Management Tab */}
          <TabsContent value="pets">
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">Pet Management</CardTitle>
                  <Button 
                    onClick={() => downloadCSV(activatedPets, 'pets')}
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
                      <TableHead className="text-blue-200">Pet ID</TableHead>
                      <TableHead className="text-blue-200">Name</TableHead>
                      <TableHead className="text-blue-200">Owner</TableHead>
                      <TableHead className="text-blue-200">Toy ID</TableHead>
                      <TableHead className="text-blue-200">Growth Stage</TableHead>
                      <TableHead className="text-blue-200">Gender</TableHead>
                      <TableHead className="text-blue-200">Stats</TableHead>
                      <TableHead className="text-blue-200">Tokens</TableHead>
                      <TableHead className="text-blue-200">Days Left</TableHead>
                      <TableHead className="text-blue-200">Created</TableHead>
                      <TableHead className="text-blue-200">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activatedPets.map((pet: any) => {
                      // Calculate days since creation
                      const createdDate = new Date(pet.createdAt);
                      const now = new Date();
                      const daysSinceCreation = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
                      const maxDays = 30; // Assuming 30 days lifecycle
                      const daysLeft = Math.max(0, maxDays - daysSinceCreation);
                      
                      return (
                        <TableRow key={pet.id} className="border-white/10">
                          <TableCell className="text-white">{pet.id}</TableCell>
                          <TableCell className="text-white">{pet.name}</TableCell>
                          <TableCell className="text-white">
                            {pet.user ? `${pet.user.firstName} ${pet.user.lastName}` : 'Unknown'}
                          </TableCell>
                          <TableCell className="text-white">{pet.toyId}</TableCell>
                          <TableCell className="text-white">
                            <Badge className={`${
                              pet.growthStage === 'baby' ? 'bg-pink-500' :
                              pet.growthStage === 'teenager' ? 'bg-blue-500' :
                              pet.growthStage === 'adult' ? 'bg-green-500' :
                              pet.growthStage === 'grandpa' ? 'bg-yellow-500' :
                              pet.growthStage === 'death' ? 'bg-red-500' :
                              'bg-gray-500'
                            }`}>
                              {pet.growthStage || 'baby'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white">
                            <Badge className={pet.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'}>
                              {pet.gender === 'male' ? '♂ Male' : '♀ Female'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white text-xs">
                            <div className="space-y-1">
                              <div>H: {pet.hunger || 0}%</div>
                              <div>E: {pet.energy || 0}%</div>
                              <div>C: {pet.cleanliness || 0}%</div>
                              <div>Hp: {pet.happiness || 0}%</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-white">
                            <Badge className="bg-yellow-600">
                              {pet.tokensEarned || 0} 🪙
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white">
                            <Badge className={daysLeft > 7 ? 'bg-green-600' : daysLeft > 3 ? 'bg-yellow-600' : 'bg-red-600'}>
                              {daysLeft} days
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white text-xs">
                            {createdDate.toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-blue-600/20 text-blue-300 border-blue-500/30 hover:bg-blue-600/40"
                                onClick={() => {
                                  setEditingPet(pet);
                                  setEditedPetData({
                                    name: pet.name,
                                    hunger: pet.hunger || 0,
                                    energy: pet.energy || 0,
                                    cleanliness: pet.cleanliness || 0,
                                    happiness: pet.happiness || 0,
                                    gender: pet.gender || 'male',
                                    growthStage: pet.growthStage || 'baby',
                                    createdAt: pet.createdAt
                                  });
                                  setShowEditPetDialog(true);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-red-600/20 text-red-300 border-red-500/30 hover:bg-red-600/40"
                                onClick={() => {
                                  if (confirm(`Delete pet "${pet.name}"? This action cannot be undone.`)) {
                                    // Add delete mutation here if needed
                                    toast({ title: "Info", description: "Pet deletion functionality coming soon" });
                                  }
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {activatedPets.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    No pets found
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Toy Dialog */}
      <Dialog open={showEditToyDialog} onOpenChange={setShowEditToyDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Toy: {editingToy?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Toy Name</Label>
                <Input
                  value={editedToyData.name || ''}
                  onChange={(e) => setEditedToyData({ ...editedToyData, name: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="Toy name"
                />
              </div>
              <div>
                <Label className="text-gray-300">Rarity</Label>
                <Select 
                  value={editedToyData.rarity || 'common'} 
                  onValueChange={(value) => setEditedToyData({ ...editedToyData, rarity: value })}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="common" className="text-white">Common</SelectItem>
                    <SelectItem value="rare" className="text-white">Rare</SelectItem>
                    <SelectItem value="epic" className="text-white">Epic</SelectItem>
                    <SelectItem value="legendary" className="text-white">Legendary</SelectItem>
                    <SelectItem value="secret" className="text-white">Secret</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Color</Label>
                <Input
                  value={editedToyData.color || ''}
                  onChange={(e) => setEditedToyData({ ...editedToyData, color: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="Toy color"
                />
              </div>
              <div>
                <Label className="text-gray-300">Gender</Label>
                <Select 
                  value={editedToyData.gender || 'male'} 
                  onValueChange={(value) => setEditedToyData({ ...editedToyData, gender: value })}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="male" className="text-white">♂ Male</SelectItem>
                    <SelectItem value="female" className="text-white">♀ Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Price (RP)</Label>
                <Input
                  type="number"
                  value={editedToyData.price || 0}
                  onChange={(e) => setEditedToyData({ ...editedToyData, price: parseFloat(e.target.value) || 0 })}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label className="text-gray-300">Season</Label>
                <Select 
                  value={editedToyData.seasonId?.toString() || ""} 
                  onValueChange={(value) => setEditedToyData({ ...editedToyData, seasonId: value ? parseInt(value) : null })}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Select Season" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="none" className="text-white">No Season</SelectItem>
                    {seasonsData.map((season: any) => (
                      <SelectItem key={season.id} value={season.id.toString()} className="text-white">
                        {season.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-gray-300">Image</Label>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const formData = new FormData();
                      formData.append('image', file);
                      try {
                        const response = await fetch('/api/upload-image', {
                          method: 'POST',
                          body: formData
                        });
                        const data = await response.json();
                        if (response.ok) {
                          setEditedToyData({ ...editedToyData, imageUrl: data.imageUrl });
                          toast({ title: "Image uploaded successfully" });
                        } else {
                          toast({ title: "Failed to upload image", variant: "destructive" });
                        }
                      } catch (error) {
                        toast({ title: "Failed to upload image", variant: "destructive" });
                      }
                    }
                  }}
                  className="bg-white/10 border-white/20 text-white"
                />
                {editedToyData.imageUrl && (
                  <div className="flex items-center gap-2">
                    <img src={editedToyData.imageUrl} alt="Preview" className="w-12 h-12 rounded object-cover" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditedToyData({ ...editedToyData, imageUrl: '' })}
                      className="bg-red-600/20 border-red-600 text-red-300 hover:bg-red-600/30"
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => {
                  if (editingToy) {
                    // Check if this is a template (from toy_templates table) or regular toy
                    const isTemplate = editingToy.basePrice !== undefined; // Templates have basePrice, toys have originalPrice
                    
                    if (isTemplate) {
                      editToyTemplateMutation.mutate({
                        templateId: editingToy.id,
                        templateData: editedToyData
                      });
                    } else {
                      editToyMutation.mutate({
                        toyId: editingToy.id,
                        toyData: editedToyData
                      });
                    }
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 flex-1"
                disabled={(editToyMutation.isPending || editToyTemplateMutation.isPending) || !editedToyData.name}
              >
                {(editToyMutation.isPending || editToyTemplateMutation.isPending) ? "Updating..." : "Update"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEditToyDialog(false)}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Pet Dialog */}
      <Dialog open={showEditPetDialog} onOpenChange={setShowEditPetDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Pet: {editingPet?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Pet Name</Label>
                <Input
                  value={editedPetData.name || ''}
                  onChange={(e) => setEditedPetData({ ...editedPetData, name: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="Pet name"
                />
              </div>
              <div>
                <Label className="text-gray-300">Gender</Label>
                <Select 
                  value={editedPetData.gender || 'male'} 
                  onValueChange={(value) => setEditedPetData({ ...editedPetData, gender: value })}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="male" className="text-white">♂ Male</SelectItem>
                    <SelectItem value="female" className="text-white">♀ Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-gray-300">Growth Stage</Label>
              <Select 
                value={editedPetData.growthStage || 'baby'} 
                onValueChange={(value) => setEditedPetData({ ...editedPetData, growthStage: value })}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="baby" className="text-white">Baby</SelectItem>
                  <SelectItem value="teenager" className="text-white">Teenager</SelectItem>
                  <SelectItem value="adult" className="text-white">Adult</SelectItem>
                  <SelectItem value="grandpa" className="text-white">Grandpa</SelectItem>
                  <SelectItem value="death" className="text-white">Death</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Creation Date</Label>
              <Input
                type="datetime-local"
                value={editedPetData.createdAt ? new Date(editedPetData.createdAt).toISOString().slice(0, 16) : ''}
                onChange={(e) => setEditedPetData({ ...editedPetData, createdAt: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-gray-300">Pet Stats</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400 text-sm">Hunger (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={editedPetData.hunger || 0}
                    onChange={(e) => setEditedPetData({ ...editedPetData, hunger: parseInt(e.target.value) || 0 })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-sm">Energy (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={editedPetData.energy || 0}
                    onChange={(e) => setEditedPetData({ ...editedPetData, energy: parseInt(e.target.value) || 0 })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-sm">Cleanliness (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={editedPetData.cleanliness || 0}
                    onChange={(e) => setEditedPetData({ ...editedPetData, cleanliness: parseInt(e.target.value) || 0 })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-sm">Happiness (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={editedPetData.happiness || 0}
                    onChange={(e) => setEditedPetData({ ...editedPetData, happiness: parseInt(e.target.value) || 0 })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => {
                  if (editingPet) {
                    editPetMutation.mutate({
                      petId: editingPet.id,
                      petData: editedPetData
                    });
                    setShowEditPetDialog(false);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 flex-1"
                disabled={editPetMutation.isPending}
              >
                {editPetMutation.isPending ? "Updating..." : "Update Pet"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEditPetDialog(false)}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Season Dialog */}
      <Dialog open={showEditSeasonDialog} onOpenChange={setShowEditSeasonDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Edit Season</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Season Name</Label>
              <Input
                value={editSeasonData.name}
                onChange={(e) => setEditSeasonData({ ...editSeasonData, name: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
                placeholder="e.g., Winter 2025"
              />
            </div>
            <div>
              <Label className="text-gray-300">Display Name</Label>
              <Input
                value={editSeasonData.displayName}
                onChange={(e) => setEditSeasonData({ ...editSeasonData, displayName: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
                placeholder="e.g., Winter Collection"
              />
            </div>
            <div>
              <Label className="text-gray-300">Description</Label>
              <Input
                value={editSeasonData.description}
                onChange={(e) => setEditSeasonData({ ...editSeasonData, description: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
                placeholder="Season description"
              />
            </div>
            <div>
              <Label className="text-gray-300">Background Color</Label>
              <Input
                type="color"
                value={editSeasonData.backgroundColor}
                onChange={(e) => setEditSeasonData({ ...editSeasonData, backgroundColor: e.target.value })}
                className="bg-white/10 border-white/20 text-white h-10"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => {
                  if (editSeasonData.id) {
                    editSeasonMutation.mutate({
                      seasonId: editSeasonData.id,
                      seasonData: {
                        name: editSeasonData.name,
                        displayName: editSeasonData.displayName,
                        description: editSeasonData.description,
                        backgroundColor: editSeasonData.backgroundColor
                      }
                    });
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 flex-1"
                disabled={!editSeasonData.name || !editSeasonData.displayName || editSeasonMutation.isPending}
              >
                {editSeasonMutation.isPending ? "Updating..." : "Update Season"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEditSeasonDialog(false)}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Toy Creation Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="bg-gradient-to-br from-blue-900 to-purple-900 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">Create Template Toy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-white text-sm">Name</label>
              <Input
                value={templateToyForm.name}
                onChange={(e) => setTemplateToyForm({...templateToyForm, name: e.target.value})}
                placeholder="Enter toy name"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            
            <div>
              <label className="text-white text-sm">Season</label>
              <Select 
                value={templateToyForm.seasonId} 
                onValueChange={(value) => setTemplateToyForm({...templateToyForm, seasonId: value})}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select season" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Season</SelectItem>
                  {seasonsData.map((season: any) => (
                    <SelectItem key={season.id} value={season.id.toString()}>
                      {season.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white text-sm">Rarity</label>
                <Select 
                  value={templateToyForm.rarity} 
                  onValueChange={(value) => setTemplateToyForm({...templateToyForm, rarity: value})}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
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
                <label className="text-white text-sm">Color</label>
                <Select 
                  value={templateToyForm.color} 
                  onValueChange={(value) => setTemplateToyForm({...templateToyForm, color: value})}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="red">Red</SelectItem>
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="yellow">Yellow</SelectItem>
                    <SelectItem value="purple">Purple</SelectItem>
                    <SelectItem value="orange">Orange</SelectItem>
                    <SelectItem value="pink">Pink</SelectItem>
                    <SelectItem value="black">Black</SelectItem>
                    <SelectItem value="white">White</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="rainbow">Rainbow</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white text-sm">Gender</label>
                <Select 
                  value={templateToyForm.gender} 
                  onValueChange={(value) => setTemplateToyForm({...templateToyForm, gender: value})}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-white text-sm">Quantity</label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={templateToyForm.quantity}
                  onChange={(e) => setTemplateToyForm({...templateToyForm, quantity: parseInt(e.target.value) || 1})}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-white text-sm">Image URL (Optional)</label>
              <Input
                value={templateToyForm.imageUrl}
                onChange={(e) => setTemplateToyForm({...templateToyForm, imageUrl: e.target.value})}
                placeholder="Enter image URL or leave blank for default"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => {
                  if (templateToyForm.name.trim()) {
                    createToyTemplateMutation.mutate(templateToyForm);
                  }
                }}
                className="bg-green-600 hover:bg-green-700 flex-1"
                disabled={!templateToyForm.name.trim() || createToyTemplateMutation.isPending}
              >
                {createToyTemplateMutation.isPending ? "Creating..." : "Create Template Toy"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowTemplateDialog(false)}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EnhancedAdminDashboard;
