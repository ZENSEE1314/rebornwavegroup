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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatMoney, formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
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
  Filter,
  Settings,
  Heart,
  Trophy
} from "lucide-react";

export default function EnhancedAdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
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
    imageUrl: "",
    qrCode: ""
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
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const toysPerPage = 100;
  
  // Bulk upload states
  const [bulkToyData, setBulkToyData] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
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

  // Check if user is admin
  if (!user || user.role !== 'admin') {
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

  // Fetch all data
  const { data: allUsers = [] } = useQuery({
    queryKey: ['/api/admin/users'],
    retry: false,
  });

  const { data: cashOutRequests = [] } = useQuery({
    queryKey: ['/api/admin/cash-outs'],
    retry: false,
  });

  const { data: allTransactions = [] } = useQuery({
    queryKey: ['/api/admin/transactions'],
    retry: false,
  });

  const { data: allToys = [] } = useQuery({
    queryKey: ['/api/admin/all-toys'],
    retry: false,
  });

  const { data: allAppointments = [] } = useQuery({
    queryKey: ['/api/admin/appointments'],
    retry: false,
  });

  const { data: feesReport = {} } = useQuery({
    queryKey: ['/api/admin/fees-report'],
    retry: false,
  });

  // Content management queries
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

  // New queries for pet management and leaderboard
  const { data: activatedPets = [] } = useQuery({
    queryKey: ['/api/admin/activated-pets'],
    retry: false,
  });

  const { data: gameLeaderboard = [] } = useQuery({
    queryKey: ['/api/game-scores/leaderboard'],
    retry: false,
  });

  const { data: tokenClaims = [] } = useQuery({
    queryKey: ['/api/admin/token-claims'],
    retry: false,
  });

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

  const filteredToys = (allToys as any[]).filter((toy: any) => {
    const searchMatch = !toySearch || 
      toy.name?.toLowerCase().includes(toySearch.toLowerCase()) ||
      toy.series?.toLowerCase().includes(toySearch.toLowerCase());
    const rarityMatch = rarityFilter === "all" || toy.rarity === rarityFilter;
    const ownerMatch = ownerFilter === "all" || 
      (ownerFilter === "owned" && toy.owner) ||
      (ownerFilter === "unowned" && !toy.owner);
    return searchMatch && rarityMatch && ownerMatch;
  });

  // Calculate pagination for toys
  const totalPages = Math.ceil(filteredToys.length / toysPerPage);
  const startIndex = (currentPage - 1) * toysPerPage;
  const endIndex = startIndex + toysPerPage;
  const paginatedToys = filteredToys.slice(startIndex, endIndex);

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
      return apiRequest('POST', '/api/admin/approve-cash-out', { id, status, adminNotes: notes });
    },
    onSuccess: () => {
      toast({ title: "Cash out request updated" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cash-outs'] });
    },
    onError: () => {
      toast({ title: "Failed to update cash out request", variant: "destructive" });
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

  const createToyMutation = useMutation({
    mutationFn: async (toyData: any) => {
      return apiRequest('POST', '/api/admin/create-toy', toyData);
    },
    onSuccess: () => {
      toast({ title: "Toy created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-toys'] });
      setNewToy({ name: "", series: "", rarity: "common", imageUrl: "", qrCode: "" });
    },
    onError: () => {
      toast({ title: "Failed to create toy", variant: "destructive" });
    }
  });

  const bulkCreateToysMutation = useMutation({
    mutationFn: async (toys: any[]) => {
      return apiRequest('POST', '/api/admin/toys/bulk', { toys });
    },
    onSuccess: () => {
      toast({ title: "Toys uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-toys'] });
      setBulkToyData("");
    },
    onError: () => {
      toast({ title: "Failed to upload toys", variant: "destructive" });
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

  const handleBulkUpload = () => {
    if (!bulkToyData.trim()) return;
    
    try {
      const lines = bulkToyData.trim().split('\n');
      const toys = lines.map(line => {
        const [name, series, rarity = 'common', imageUrl = ''] = line.split(',').map(s => s.trim());
        return {
          name,
          series,
          rarity,
          imageUrl,
          qrCode: `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
      });
      
      bulkCreateToysMutation.mutate(toys);
    } catch (error) {
      toast({ title: "Invalid format. Use: name,series,rarity,imageUrl per line", variant: "destructive" });
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-300">Comprehensive system management and reporting</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/20 backdrop-blur border-gray-300/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-200 text-sm">Total Users</p>
                  <p className="text-3xl font-bold text-white">{filteredUsers.length}</p>
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
                  <p className="text-3xl font-bold text-white">{(feesReport as any).totalTransactions || 0}</p>
                </div>
                <CreditCard className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/20 backdrop-blur border-gray-300/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-200 text-sm">Total Volume</p>
                  <p className="text-3xl font-bold text-white">RP {formatMoney((feesReport as any).totalVolume || 0)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-400" />
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
              <TabsTrigger value="appointments" className="data-[state=active]:bg-white/30 text-white whitespace-nowrap">
                <Calendar className="h-4 w-4 mr-2" />
                Appointments
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
              <TabsTrigger value="tokens" className="data-[state=active]:bg-white/30 text-white whitespace-nowrap">
                <Gift className="h-4 w-4 mr-2" />
                Token Claims
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
                              <option value="other">Other</option>
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
                        <TableCell className="text-yellow-300">{user.tokens || 0}</TableCell>
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Toy Management Tab */}
          <TabsContent value="toys">
            <div className="space-y-6">
              {/* Single Toy Creation */}
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Create New Toy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-gray-300">Name</Label>
                      <Input
                        value={newToy.name}
                        onChange={(e) => setNewToy({ ...newToy, name: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Series</Label>
                      <Input
                        value={newToy.series}
                        onChange={(e) => setNewToy({ ...newToy, series: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Rarity</Label>
                      <Select value={newToy.rarity} onValueChange={(value) => setNewToy({ ...newToy, rarity: value })}>
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
                      <Label className="text-gray-300">Image Upload</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Button 
                        onClick={() => {
                          const qrCode = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                          createToyMutation.mutate({ ...newToy, qrCode });
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={!newToy.name || !newToy.series}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Toy
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bulk Upload */}
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Bulk Toy Upload</CardTitle>
                  <p className="text-gray-300 text-sm">Format: name,series,rarity,imageUrl (one per line)</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Doluruu Blue #2001,Season 2 Collection,rare,/images/blue-toy.png"
                      value={bulkToyData}
                      onChange={(e) => setBulkToyData(e.target.value)}
                      className="bg-white/10 border-white/20 text-white min-h-32"
                    />
                    <Button 
                      onClick={handleBulkUpload}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={!bulkToyData.trim()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Toys
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Toy List */}
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-white">All Toys</CardTitle>
                    <Button 
                      onClick={() => downloadCSV(filteredToys, 'toys')}
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
                    <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                      <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Filter by owner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Toys</SelectItem>
                        <SelectItem value="owned">With Owner</SelectItem>
                        <SelectItem value="unowned">No Owner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/20">
                        <TableHead className="text-blue-200">Name</TableHead>
                        <TableHead className="text-blue-200">Series</TableHead>
                        <TableHead className="text-blue-200">Rarity</TableHead>
                        <TableHead className="text-blue-200">Owner</TableHead>
                        <TableHead className="text-blue-200">QR Code</TableHead>
                        <TableHead className="text-blue-200">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedToys.map((toy: any) => (
                        <TableRow key={toy.id} className="border-white/10">
                          <TableCell className="text-white">{toy.name}</TableCell>
                          <TableCell className="text-gray-300">{toy.series}</TableCell>
                          <TableCell>
                            <Badge className={getRarityColor(toy.rarity)}>
                              {toy.rarity}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {toy.owner ? `${toy.owner.firstName} ${toy.owner.lastName}` : 'No Owner'}
                          </TableCell>
                          <TableCell className="text-gray-300 font-mono text-xs">{toy.qrCode}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-gray-900 border-gray-700">
                                  <DialogHeader>
                                    <DialogTitle className="text-white">Edit Toy Owner</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label className="text-gray-300">Current Owner</Label>
                                      <p className="text-white">
                                        {toy.owner ? `${toy.owner.firstName} ${toy.owner.lastName} (${toy.owner.email})` : 'No Owner'}
                                      </p>
                                    </div>
                                    <div>
                                      <Label className="text-gray-300">Select New Owner</Label>
                                      <Select 
                                        value={newOwnerId} 
                                        onValueChange={setNewOwnerId}
                                      >
                                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                                          <SelectValue placeholder="Select a user or leave empty to remove owner" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-gray-800 border-gray-600">
                                          <SelectItem value="REMOVE_OWNER" className="text-white">
                                            Remove Owner
                                          </SelectItem>
                                          {(allUsers as any[])?.map((user: any) => (
                                            <SelectItem key={user.id} value={user.id} className="text-white">
                                              {user.firstName} {user.lastName} ({user.email})
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <Button
                                      onClick={() => {
                                        const ownerIdToSend = newOwnerId === "REMOVE_OWNER" ? null : newOwnerId;
                                        updateToyOwnerMutation.mutate({ 
                                          toyId: toy.id, 
                                          newOwnerId: ownerIdToSend
                                        });
                                        setNewOwnerId("");
                                      }}
                                      className="bg-blue-600 hover:bg-blue-700"
                                    >
                                      Update Owner
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteToyMutation.mutate(toy.id)}
                                className="bg-red-600 hover:bg-red-700 text-white border-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
                      <div className="text-sm text-gray-300">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredToys.length)} of {filteredToys.length} toys
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                        >
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className={
                                  currentPage === pageNum
                                    ? "bg-blue-600 text-white border-blue-500"
                                    : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                                }
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cash Outs Tab */}
          <TabsContent value="cashouts">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">Cash Out Management</CardTitle>
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
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/20">
                      <TableHead className="text-blue-200">User</TableHead>
                      <TableHead className="text-blue-200">Amount</TableHead>
                      <TableHead className="text-blue-200">Bank Details</TableHead>
                      <TableHead className="text-blue-200">Status</TableHead>
                      <TableHead className="text-blue-200">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCashOuts.map((cashOut: any) => (
                      <TableRow key={cashOut.id} className="border-white/10">
                        <TableCell className="text-white">
                          {cashOut.user?.firstName} {cashOut.user?.lastName}
                        </TableCell>
                        <TableCell className="text-green-300">RP {cashOut.amount}</TableCell>
                        <TableCell className="text-gray-300">
                          {cashOut.bankName} - {cashOut.accountNumber}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            cashOut.status === 'approved' ? 'bg-green-500' :
                            cashOut.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                          }>
                            {cashOut.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {cashOut.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button 
                                size="sm"
                                onClick={() => approveCashOutMutation.mutate({ 
                                  id: cashOut.id, 
                                  status: 'approved' 
                                })}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => approveCashOutMutation.mutate({ 
                                  id: cashOut.id, 
                                  status: 'rejected' 
                                })}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">Transaction History</CardTitle>
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
                      <SelectItem value="marketplace_purchase">Marketplace</SelectItem>
                      <SelectItem value="appointment_payment">Appointment</SelectItem>
                      <SelectItem value="referral_bonus">Referral</SelectItem>
                      <SelectItem value="admin_adjustment">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/20">
                      <TableHead className="text-blue-200">User</TableHead>
                      <TableHead className="text-blue-200">Type</TableHead>
                      <TableHead className="text-blue-200">Amount</TableHead>
                      <TableHead className="text-blue-200">Description</TableHead>
                      <TableHead className="text-blue-200">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction: any) => (
                      <TableRow key={transaction.id} className="border-white/10">
                        <TableCell className="text-white">
                          {transaction.user?.firstName} {transaction.user?.lastName}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-500">
                            {transaction.type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-green-300">RP {transaction.amount}</TableCell>
                        <TableCell className="text-gray-300">{transaction.description}</TableCell>
                        <TableCell className="text-gray-300">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Admin Fees Report</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Admin Fees:</span>
                      <span className="text-green-300 font-bold">
                        RP {(feesReport as any).totalAdminFees?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Transactions:</span>
                      <span className="text-white font-bold">{(feesReport as any).totalTransactions || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Volume:</span>
                      <span className="text-white font-bold">
                        RP {(feesReport as any).totalVolume?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Average Transaction:</span>
                      <span className="text-white font-bold">
                        RP {(feesReport as any).averageTransactionValue?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <Button 
                      onClick={() => downloadCSV([feesReport], 'admin-fees-report')}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Report
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">System Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Users:</span>
                      <span className="text-white font-bold">{filteredUsers.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Toys:</span>
                      <span className="text-white font-bold">{filteredToys.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Pending Cash Outs:</span>
                      <span className="text-yellow-300 font-bold">
                        {filteredCashOuts.filter((co: any) => co.status === 'pending').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Pending Appointments:</span>
                      <span className="text-yellow-300 font-bold">
                        {filteredAppointments.filter((apt: any) => apt.status === 'pending').length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Content Management Tab */}
          <TabsContent value="content">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Content Management</CardTitle>
                <p className="text-gray-300">Manage promotion banners, appointment events, and reward items</p>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="banners" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-white/10">
                    <TabsTrigger value="banners" className="data-[state=active]:bg-white/30 text-white">
                      Promotion Banners
                    </TabsTrigger>
                    <TabsTrigger value="events" className="data-[state=active]:bg-white/30 text-white">
                      Appointment Events
                    </TabsTrigger>
                    <TabsTrigger value="rewards" className="data-[state=active]:bg-white/30 text-white">
                      Reward Items
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="banners" className="mt-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-white">Promotion Banners ({(promotionBanners as any[]).length})</h3>
                        <Button 
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => setShowBannerDialog(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Banner
                        </Button>
                      </div>
                      
                      <div className="bg-white/5 rounded-lg p-4">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-white/20">
                              <TableHead className="text-gray-300">Title</TableHead>
                              <TableHead className="text-gray-300">Type</TableHead>
                              <TableHead className="text-gray-300">Color</TableHead>
                              <TableHead className="text-gray-300">Order</TableHead>
                              <TableHead className="text-gray-300">Active</TableHead>
                              <TableHead className="text-gray-300">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(promotionBanners as any[]).length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                                  No promotion banners found. Create your first banner to get started.
                                </TableCell>
                              </TableRow>
                            ) : (
                              (promotionBanners as any[]).map((banner: any) => (
                                <TableRow key={banner.id} className="border-white/10">
                                  <TableCell className="text-white">{banner.title}</TableCell>
                                  <TableCell className="text-gray-300">{banner.type}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div className={`w-4 h-4 rounded-full ${
                                        banner.backgroundColor === 'blue' ? 'bg-blue-500' :
                                        banner.backgroundColor === 'green' ? 'bg-green-500' :
                                        banner.backgroundColor === 'orange' ? 'bg-orange-500' :
                                        banner.backgroundColor === 'purple' ? 'bg-purple-500' :
                                        banner.backgroundColor === 'red' ? 'bg-red-500' :
                                        banner.backgroundColor === 'gray' ? 'bg-gray-500' :
                                        'bg-blue-500'
                                      }`}></div>
                                      <span className="text-gray-300 capitalize">{banner.backgroundColor || 'blue'}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-gray-300">{banner.displayOrder}</TableCell>
                                  <TableCell>
                                    <Badge variant={banner.isActive ? "default" : "secondary"}>
                                      {banner.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="bg-white/10 border-white/20"
                                        onClick={() => {
                                          setEditingBanner(banner);
                                          setBannerForm({
                                            title: banner.title,
                                            description: banner.description,
                                            imageUrl: banner.imageUrl || "",
                                            ctaText: banner.ctaText || "",
                                            ctaUrl: banner.ctaUrl || "",
                                            type: banner.type || "banner",
                                            backgroundColor: banner.backgroundColor || "blue",
                                            displayOrder: banner.displayOrder,
                                            isActive: banner.isActive,
                                            iconSymbol: banner.iconSymbol || ""
                                          });
                                          setShowBannerDialog(true);
                                        }}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="destructive"
                                        onClick={() => deleteBannerMutation.mutate(banner.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="events" className="mt-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-white">Appointment Events ({(appointmentEvents as any[]).length})</h3>
                        <Button 
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => setShowEventDialog(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Event
                        </Button>
                      </div>
                      
                      <div className="bg-white/5 rounded-lg p-4">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-white/20">
                              <TableHead className="text-gray-300">Title</TableHead>
                              <TableHead className="text-gray-300">Category</TableHead>
                              <TableHead className="text-gray-300">Description</TableHead>
                              <TableHead className="text-gray-300">Active</TableHead>
                              <TableHead className="text-gray-300">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(appointmentEvents as any[]).length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                                  No appointment events found. Create your first event to get started.
                                </TableCell>
                              </TableRow>
                            ) : (
                              (appointmentEvents as any[]).map((event: any) => (
                                <TableRow key={event.id} className="border-white/10">
                                  <TableCell className="text-white">{event.title}</TableCell>
                                  <TableCell className="text-gray-300 capitalize">{event.category}</TableCell>
                                  <TableCell className="text-gray-300">{event.description}</TableCell>
                                  <TableCell>
                                    <Badge variant={event.isActive ? "default" : "secondary"}>
                                      {event.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="bg-white/10 border-white/20"
                                        onClick={() => {
                                          setEditingEvent(event);
                                          const predefinedCategories = ['beauty', 'entertainment', 'restaurant'];
                                          const isCustomCategory = !predefinedCategories.includes(event.category);
                                          
                                          setEventForm({
                                            title: event.title,
                                            description: event.description,
                                            category: isCustomCategory ? 'beauty' : event.category,
                                            isActive: event.isActive
                                          });
                                          setUseCustomCategory(isCustomCategory);
                                          setCustomCategory(isCustomCategory ? event.category : '');
                                          setShowEventDialog(true);
                                        }}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="destructive"
                                        onClick={() => handleDeleteEvent(event.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="rewards" className="mt-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-white">Reward Items ({(rewardItems as any[]).length})</h3>
                        <Button 
                          className="bg-purple-600 hover:bg-purple-700"
                          onClick={() => setShowRewardDialog(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Reward
                        </Button>
                      </div>
                      
                      <div className="bg-white/5 rounded-lg p-4">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-white/20">
                              <TableHead className="text-gray-300">Name</TableHead>
                              <TableHead className="text-gray-300">Type</TableHead>
                              <TableHead className="text-gray-300">Points Cost</TableHead>
                              <TableHead className="text-gray-300">Stock</TableHead>
                              <TableHead className="text-gray-300">Active</TableHead>
                              <TableHead className="text-gray-300">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(rewardItems as any[]).length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                                  No reward items found. Create your first reward to get started.
                                </TableCell>
                              </TableRow>
                            ) : (
                              (rewardItems as any[]).map((reward: any) => (
                                <TableRow key={reward.id} className="border-white/10">
                                  <TableCell className="text-white">{reward.name}</TableCell>
                                  <TableCell className="text-gray-300">{reward.type}</TableCell>
                                  <TableCell className="text-gray-300">{reward.pointsCost} pts</TableCell>
                                  <TableCell className="text-gray-300">{reward.stockQuantity || 'Unlimited'}</TableCell>
                                  <TableCell>
                                    <Badge variant={reward.isActive ? "default" : "secondary"}>
                                      {reward.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="bg-white/10 border-white/20"
                                        onClick={() => handleEditReward(reward)}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="destructive"
                                        onClick={() => handleDeleteReward(reward.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pet Management Tab */}
          <TabsContent value="pets">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Activated Pets Management</CardTitle>
                <p className="text-gray-300">View and manage all activated dragon turtle pets</p>
              </CardHeader>
              <CardContent>
                <div className="bg-white/5 rounded-lg p-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/20">
                        <TableHead className="text-gray-300">Pet Name</TableHead>
                        <TableHead className="text-gray-300">Owner</TableHead>
                        <TableHead className="text-gray-300">Series</TableHead>
                        <TableHead className="text-gray-300">Rarity</TableHead>
                        <TableHead className="text-gray-300">Activated Date</TableHead>
                        <TableHead className="text-gray-300">Current Age</TableHead>
                        <TableHead className="text-gray-300">Claimable Tokens</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(activatedPets as any[]).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-gray-400 py-8">
                            No activated pets found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        (activatedPets as any[]).filter((pet: any) => pet.ownerId).map((pet: any) => (
                          <TableRow key={pet.id} className="border-white/10">
                            <TableCell className="text-white">
                              {editingPet?.id === pet.id ? (
                                <Input
                                  value={editedPetData.name || pet.name}
                                  onChange={(e) => setEditedPetData({...editedPetData, name: e.target.value})}
                                  className="bg-gray-800 border-gray-600 text-white h-8 w-48"
                                />
                              ) : (
                                pet.name
                              )}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {pet.ownerName || 'Unknown'}
                              <div className="text-xs text-gray-500">
                                🪙 {pet.ownerTokens || 0} tokens
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-300">{pet.series}</TableCell>
                            <TableCell>
                              <Badge className={`${
                                pet.rarity === 'common' ? 'bg-gray-500' :
                                pet.rarity === 'rare' ? 'bg-blue-500' :
                                pet.rarity === 'epic' ? 'bg-purple-500' :
                                pet.rarity === 'legendary' ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}>
                                {pet.rarity}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {editingPet?.id === pet.id ? (
                                <Input
                                  type="date"
                                  value={editedPetData.activatedDate || (pet.createdAt ? new Date(pet.createdAt).toISOString().split('T')[0] : '')}
                                  onChange={(e) => setEditedPetData({...editedPetData, activatedDate: e.target.value})}
                                  className="bg-gray-800 border-gray-600 text-white h-8"
                                />
                              ) : (
                                pet.createdAt ? new Date(pet.createdAt).toLocaleDateString() : 'N/A'
                              )}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {editingPet?.id === pet.id ? (
                                <Input
                                  type="number"
                                  value={editedPetData.currentAge}
                                  onChange={(e) => {
                                    const newAge = parseInt(e.target.value) || 0;
                                    // Auto-calculate activation date based on age (deduct days from today)
                                    const today = new Date();
                                    const activationDate = new Date(today.getTime() - (newAge * 24 * 60 * 60 * 1000));
                                    setEditedPetData({
                                      ...editedPetData, 
                                      currentAge: newAge,
                                      activatedDate: activationDate.toISOString().split('T')[0]
                                    });
                                  }}
                                  className="bg-gray-800 border-gray-600 text-white h-8 w-20"
                                  min="0"
                                  max="100"
                                />
                              ) : (
                                `${pet.currentAge || 0} days`
                              )}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              🪙 {pet.dailyTokensAvailable || 0}
                            </TableCell>
                            <TableCell>
                              <Badge variant={pet.currentAge >= 100 ? "destructive" : "default"}>
                                {pet.currentAge >= 100 ? "Deceased" : "Alive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {editingPet?.id === pet.id ? (
                                  <>
                                    <Button 
                                      size="sm" 
                                      onClick={() => {
                                        editPetMutation.mutate({
                                          petId: pet.id,
                                          petData: editedPetData
                                        });
                                      }}
                                      className="bg-green-600 hover:bg-green-700 h-8 w-8 p-0"
                                    >
                                      <Check className="h-3 w-3" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      onClick={() => {
                                        setEditingPet(null);
                                        setEditedPetData({});
                                      }}
                                      variant="outline"
                                      className="h-8 w-8 p-0"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button 
                                      size="sm" 
                                      onClick={() => {
                                        setEditingPet(pet);
                                        setEditedPetData({
                                          name: pet.name,
                                          currentAge: pet.currentAge || 0,
                                          activatedDate: pet.createdAt ? new Date(pet.createdAt).toISOString().split('T')[0] : ''
                                        });
                                      }}
                                      className="bg-blue-600 hover:bg-blue-700 h-8 w-8 p-0"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      onClick={() => {
                                        setSelectedUserForTokens({ id: pet.ownerId, name: pet.ownerName });
                                        setShowTokenDialog(true);
                                      }}
                                      className="bg-yellow-600 hover:bg-yellow-700 h-8 w-8 p-0"
                                      title="Add Tokens"
                                    >
                                      🪙
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Game Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-white">Coin Catching Game Leaderboard</CardTitle>
                    <p className="text-gray-300">Top scores from dragon turtle mini-game</p>
                  </div>
                  <Button 
                    onClick={() => {
                      if (confirm('Are you sure you want to reset all game scores? This action cannot be undone.')) {
                        resetLeaderboardMutation.mutate();
                      }
                    }}
                    variant="destructive"
                    disabled={resetLeaderboardMutation.isPending}
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    {resetLeaderboardMutation.isPending ? 'Resetting...' : 'Reset Leaderboard'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-white/5 rounded-lg p-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/20">
                        <TableHead className="text-gray-300">Rank</TableHead>
                        <TableHead className="text-gray-300">Player</TableHead>
                        <TableHead className="text-gray-300">Pet Name</TableHead>
                        <TableHead className="text-gray-300">Score</TableHead>
                        <TableHead className="text-gray-300">Tokens Earned</TableHead>
                        <TableHead className="text-gray-300">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(gameLeaderboard as any[]).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                            No game scores recorded yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        (gameLeaderboard as any[]).map((score: any, index: number) => (
                          <TableRow key={score.id} className="border-white/10">
                            <TableCell className="text-white font-bold">
                              <div className="flex items-center">
                                {index === 0 && '🥇'}
                                {index === 1 && '🥈'}
                                {index === 2 && '🥉'}
                                <span className="ml-2">#{index + 1}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {score.user?.firstName || score.user?.email || 'Anonymous'}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {score.pet?.name || 'Unknown Pet'}
                            </TableCell>
                            <TableCell className="text-white font-semibold">
                              {score.score?.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-yellow-400">
                              🪙 {score.tokensEarned}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {score.createdAt ? new Date(score.createdAt).toLocaleDateString() : 'N/A'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Tokens Dialog */}
        {showTokenDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">
                Set Claimable Tokens for {selectedUserForTokens?.name}
              </h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Set Claimable Tokens</Label>
                  <Input
                    type="number"
                    value={tokenAmount}
                    onChange={(e) => setTokenAmount(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="Enter exact number to set"
                    min="0"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTokenDialog(false);
                    setSelectedUserForTokens(null);
                    setTokenAmount("");
                  }}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (tokenAmount && selectedUserForTokens) {
                      addTokensMutation.mutate({
                        userId: selectedUserForTokens.id,
                        amount: parseInt(tokenAmount)
                      });
                    }
                  }}
                  className="bg-yellow-600 hover:bg-yellow-700"
                  disabled={!tokenAmount || addTokensMutation.isPending}
                >
                  {addTokensMutation.isPending ? 'Setting...' : 'Set Tokens'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Password Change Dialog */}
        {showPasswordDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">
                Change Password for {selectedUserForPassword?.firstName} {selectedUserForPassword?.lastName}
              </h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Confirm New Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <Button
                  onClick={() => {
                    if (newPassword !== confirmPassword) {
                      toast({
                        title: "Error",
                        description: "Passwords don't match",
                        variant: "destructive"
                      });
                      return;
                    }
                    if (newPassword.length < 6) {
                      toast({
                        title: "Error",
                        description: "Password must be at least 6 characters",
                        variant: "destructive"
                      });
                      return;
                    }
                    changeUserPasswordMutation.mutate({
                      userId: selectedUserForPassword.id,
                      newPassword
                    });
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={changeUserPasswordMutation.isPending}
                >
                  Change Password
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPasswordDialog(false);
                    setNewPassword("");
                    setConfirmPassword("");
                    setSelectedUserForPassword(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Banner Creation Dialog */}
        <Dialog open={showBannerDialog} onOpenChange={setShowBannerDialog}>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingBanner ? "Edit Promotion Banner" : "Create Promotion Banner"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="banner-title" className="text-gray-300">Title</Label>
                <Input
                  id="banner-title"
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm({...bannerForm, title: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter banner title"
                />
              </div>
              <div>
                <Label htmlFor="banner-description" className="text-gray-300">Description</Label>
                <textarea
                  id="banner-description"
                  value={bannerForm.description}
                  onChange={(e) => setBannerForm({...bannerForm, description: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-md p-2"
                  placeholder="Enter banner description"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="banner-image" className="text-gray-300">Image URL</Label>
                <Input
                  id="banner-image"
                  value={bannerForm.imageUrl}
                  onChange={(e) => setBannerForm({...bannerForm, imageUrl: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter image URL"
                />
              </div>
              <div>
                <Label htmlFor="banner-cta-text" className="text-gray-300">CTA Button Text</Label>
                <Input
                  id="banner-cta-text"
                  value={bannerForm.ctaText}
                  onChange={(e) => setBannerForm({...bannerForm, ctaText: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter button text (optional)"
                />
              </div>
              <div>
                <Label htmlFor="banner-cta-url" className="text-gray-300">CTA Button URL</Label>
                <Input
                  id="banner-cta-url"
                  value={bannerForm.ctaUrl}
                  onChange={(e) => setBannerForm({...bannerForm, ctaUrl: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter button URL (optional)"
                />
              </div>
              <div>
                <Label htmlFor="banner-type" className="text-gray-300">Banner Type</Label>
                <select
                  id="banner-type"
                  value={bannerForm.type}
                  onChange={(e) => setBannerForm({...bannerForm, type: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-md p-2"
                >
                  <option value="banner">Banner</option>
                  <option value="hero">Hero</option>
                  <option value="promotion">Promotion</option>
                  <option value="announcement">Announcement</option>
                </select>
              </div>
              <div>
                <Label htmlFor="banner-color" className="text-gray-300">Background Color</Label>
                <select
                  id="banner-color"
                  value={bannerForm.backgroundColor}
                  onChange={(e) => setBannerForm({...bannerForm, backgroundColor: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-md p-2"
                >
                  <option value="blue">Blue</option>
                  <option value="green">Green</option>
                  <option value="orange">Orange</option>
                  <option value="purple">Purple</option>
                  <option value="red">Red</option>
                  <option value="gray">Gray</option>
                </select>
              </div>
              <div>
                <Label htmlFor="banner-icon" className="text-gray-300">Icon Symbol</Label>
                <select
                  id="banner-icon"
                  value={bannerForm.iconSymbol}
                  onChange={(e) => setBannerForm({...bannerForm, iconSymbol: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-md p-2"
                >
                  <option value="">No Icon</option>
                  <option value="🎉">🎉 Party</option>
                  <option value="🎊">🎊 Celebration</option>
                  <option value="⭐">⭐ Star</option>
                  <option value="🔥">🔥 Fire</option>
                  <option value="💎">💎 Diamond</option>
                  <option value="🎯">🎯 Target</option>
                  <option value="🏆">🏆 Trophy</option>
                  <option value="💰">💰 Money</option>
                  <option value="🎁">🎁 Gift</option>
                  <option value="⚡">⚡ Lightning</option>
                  <option value="🌟">🌟 Sparkle</option>
                  <option value="💥">💥 Boom</option>
                  <option value="🚀">🚀 Rocket</option>
                  <option value="📢">📢 Announcement</option>
                  <option value="🎪">🎪 Entertainment</option>
                  <option value="💄">💄 Beauty</option>
                  <option value="🍽️">🍽️ Restaurant</option>
                  <option value="🎮">🎮 Gaming</option>
                  <option value="🛍️">🛍️ Shopping</option>
                  <option value="📅">📅 Calendar</option>
                </select>
              </div>
              <div>
                <Label htmlFor="banner-order" className="text-gray-300">Display Order</Label>
                <Input
                  id="banner-order"
                  type="number"
                  value={bannerForm.displayOrder}
                  onChange={(e) => setBannerForm({...bannerForm, displayOrder: parseInt(e.target.value) || 0})}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="banner-active"
                  checked={bannerForm.isActive}
                  onChange={(e) => setBannerForm({...bannerForm, isActive: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="banner-active" className="text-gray-300">Active</Label>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => {
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
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (editingBanner) {
                    updateBannerMutation.mutate({ id: editingBanner.id, bannerData: bannerForm });
                  } else {
                    createBannerMutation.mutate(bannerForm);
                  }
                }}
                disabled={createBannerMutation.isPending || updateBannerMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {(createBannerMutation.isPending || updateBannerMutation.isPending) 
                  ? (editingBanner ? "Updating..." : "Creating...") 
                  : (editingBanner ? "Update Banner" : "Create Banner")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Event Creation/Edit Dialog */}
        <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
          <DialogContent className="bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingEvent ? "Edit Appointment Event" : "Create Appointment Event"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="event-title" className="text-gray-300">Title</Label>
                <Input
                  id="event-title"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter event title"
                />
              </div>
              <div>
                <Label htmlFor="event-description" className="text-gray-300">Description</Label>
                <textarea
                  id="event-description"
                  value={eventForm.description}
                  onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-md p-2"
                  placeholder="Enter event description"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="event-category" className="text-gray-300">Category</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="predefined-category"
                      checked={!useCustomCategory}
                      onChange={() => {
                        setUseCustomCategory(false);
                        setCustomCategory("");
                      }}
                      className="text-blue-600"
                    />
                    <Label htmlFor="predefined-category" className="text-gray-300">Use existing category</Label>
                  </div>
                  
                  {!useCustomCategory && (
                    <select
                      id="event-category"
                      value={eventForm.category}
                      onChange={(e) => setEventForm({...eventForm, category: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-600 text-white rounded-md p-2"
                    >
                      <option value="beauty">Beauty</option>
                      <option value="entertainment">Entertainment</option>
                      <option value="restaurant">Restaurant</option>
                    </select>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="custom-category"
                      checked={useCustomCategory}
                      onChange={() => setUseCustomCategory(true)}
                      className="text-blue-600"
                    />
                    <Label htmlFor="custom-category" className="text-gray-300">Create new category</Label>
                  </div>
                  
                  {useCustomCategory && (
                    <Input
                      id="custom-category-input"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="Enter new category name"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="event-active"
                  checked={eventForm.isActive}
                  onChange={(e) => setEventForm({...eventForm, isActive: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="event-active" className="text-gray-300">Active</Label>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => {
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
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  const finalCategory = useCustomCategory ? customCategory.trim() : eventForm.category;
                  
                  // Validation
                  if (!eventForm.title.trim()) {
                    toast({ title: "Please enter event title", variant: "destructive" });
                    return;
                  }
                  if (!eventForm.description.trim()) {
                    toast({ title: "Please enter event description", variant: "destructive" });
                    return;
                  }
                  if (useCustomCategory && !customCategory.trim()) {
                    toast({ title: "Please enter custom category name", variant: "destructive" });
                    return;
                  }
                  
                  createEventMutation.mutate({
                    ...eventForm,
                    category: finalCategory
                  });
                }}
                disabled={createEventMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {createEventMutation.isPending 
                  ? (editingEvent ? "Updating..." : "Creating...") 
                  : (editingEvent ? "Update Event" : "Create Event")
                }
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reward Creation Dialog */}
        <Dialog open={showRewardDialog} onOpenChange={setShowRewardDialog}>
          <DialogContent className="bg-gray-900 border-gray-700 max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingReward ? "Edit Reward Item" : "Create Reward Item"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="reward-name" className="text-gray-300">Name</Label>
                <Input
                  id="reward-name"
                  value={rewardForm.name}
                  onChange={(e) => setRewardForm({...rewardForm, name: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter reward name"
                />
              </div>
              <div>
                <Label htmlFor="reward-description" className="text-gray-300">Description</Label>
                <textarea
                  id="reward-description"
                  value={rewardForm.description}
                  onChange={(e) => setRewardForm({...rewardForm, description: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-md p-2"
                  placeholder="Enter reward description"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="reward-type" className="text-gray-300">Type</Label>
                <select
                  id="reward-type"
                  value={rewardForm.type}
                  onChange={(e) => setRewardForm({...rewardForm, type: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-md p-2"
                >
                  <option value="item">Physical Item</option>
                  <option value="service">Service</option>
                  <option value="discount">Discount</option>
                  <option value="voucher">Voucher</option>
                  <option value="credit">Credit Reward</option>
                </select>
              </div>
              <div>
                <Label htmlFor="reward-points" className="text-gray-300">Points Cost</Label>
                <Input
                  id="reward-points"
                  type="number"
                  value={rewardForm.pointsCost}
                  onChange={(e) => setRewardForm({...rewardForm, pointsCost: parseInt(e.target.value) || 0})}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="reward-stock" className="text-gray-300">Stock Quantity (leave empty for unlimited)</Label>
                <Input
                  id="reward-stock"
                  type="number"
                  value={rewardForm.stockQuantity || ""}
                  onChange={(e) => setRewardForm({...rewardForm, stockQuantity: e.target.value ? parseInt(e.target.value) : null})}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              
              {rewardForm.type === 'credit' && (
                <div>
                  <Label htmlFor="credit-amount" className="text-gray-300">Credit Amount (RP)</Label>
                  <Input
                    id="credit-amount"
                    type="number"
                    value={rewardForm.creditAmount || ""}
                    onChange={(e) => setRewardForm({...rewardForm, creditAmount: e.target.value})}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="Enter credit amount in RP"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="reward-image" className="text-gray-300">Image URL</Label>
                <Input
                  id="reward-image"
                  value={rewardForm.imageUrl}
                  onChange={(e) => setRewardForm({...rewardForm, imageUrl: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter image URL"
                />
              </div>
              
              <div>
                <Label className="text-gray-300">Icon Symbol</Label>
                <div className="bg-gray-800 border border-gray-600 rounded-md p-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white text-sm">Selected: {rewardForm.imageUrl || "None"}</span>
                    <div className="text-2xl">{rewardForm.imageUrl || "🎁"}</div>
                  </div>
                  <div className="max-h-32 overflow-y-auto border border-gray-700 rounded p-2 bg-gray-700">
                    <div className="grid grid-cols-8 gap-1">
                      {rewardSymbols.map((symbol, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setRewardForm({...rewardForm, imageUrl: symbol})}
                          className={`p-2 text-lg hover:bg-gray-600 rounded transition-colors ${
                            rewardForm.imageUrl === symbol ? 'bg-blue-600' : ''
                          }`}
                          title={`Symbol ${index + 1}`}
                        >
                          {symbol}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="reward-active"
                  checked={rewardForm.isActive}
                  onChange={(e) => setRewardForm({...rewardForm, isActive: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="reward-active" className="text-gray-300">Active</Label>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowRewardDialog(false);
                  setEditingReward(null);
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
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (editingReward) {
                    updateRewardMutation.mutate({ id: editingReward.id, data: rewardForm });
                  } else {
                    createRewardMutation.mutate(rewardForm);
                  }
                }}
                disabled={createRewardMutation.isPending || updateRewardMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {(createRewardMutation.isPending || updateRewardMutation.isPending) 
                  ? (editingReward ? "Updating..." : "Creating...") 
                  : (editingReward ? "Update Reward" : "Create Reward")
                }
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}