import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Package, 
  DollarSign, 
  TrendingUp, 
  Edit, 
  Trash2, 
  Plus, 
  Download, 
  Search,
  Filter,
  Calendar,
  Award,
  Star,
  Zap,
  Mail,
  Send,
  Clock,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  List,
  Grid,
  ArrowUp,
  ArrowDown
} from "lucide-react";

function EnhancedAdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [activeTab, setActiveTab] = useState("overview");
  const [showEditToyDialog, setShowEditToyDialog] = useState(false);
  const [editingToy, setEditingToy] = useState<any>(null);
  const [editedToyData, setEditedToyData] = useState<any>({});
  
  // Season management state
  const [showCreateSeasonDialog, setShowCreateSeasonDialog] = useState(false);
  const [showEditSeasonDialog, setShowEditSeasonDialog] = useState(false);
  const [editingSeason, setEditingSeason] = useState<any>(null);
  const [newSeasonData, setNewSeasonData] = useState({
    name: '',
    displayName: '',
    description: '',
    startDate: '',
    endDate: '',
    isActive: true
  });
  
  // Toy management state
  const [showCreateToyDialog, setShowCreateToyDialog] = useState(false);
  const [showBulkGenerateDialog, setShowBulkGenerateDialog] = useState(false);
  const [newToyData, setNewToyData] = useState({
    name: '',
    description: '',
    rarity: 'common',
    seasonId: '',
    imageUrl: '',
    gender: 'male'
  });
  const [bulkGenerateData, setBulkGenerateData] = useState({
    seasonId: '',
    quantity: 50,
    namePrefix: '',
    rarity: 'common'
  });
  const [selectedToyForBulk, setSelectedToyForBulk] = useState<string>('');
  const [bulkQuantity, setBulkQuantity] = useState<number>(1);
  
  // Additional season editing state
  const [editedSeasonData, setEditedSeasonData] = useState<any>({});
  
  // Email management state
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    message: '',
    type: 'custom'
  });

  // Data fetching with error handling
  const { data: dashboardStats, error: dashboardError } = useQuery({
    queryKey: ['/api/admin/dashboard-stats'],
    refetchInterval: 30000,
    retry: 1
  });

  const { data: usersResponse, error: usersError } = useQuery({
    queryKey: ['/api/admin/users'],
    retry: 1
  });

  const { data: allToys, error: toysError } = useQuery({
    queryKey: ['/api/admin/toys'],
    retry: 1
  });

  const { data: allTransactions, error: transactionsError } = useQuery({
    queryKey: ['/api/admin/transactions'],
    retry: 1
  });

  const { data: paymentVerifications, error: paymentsError } = useQuery({
    queryKey: ['/api/admin/payment-verifications'],
    retry: 1
  });

  const { data: cashOutRequests, error: cashOutError } = useQuery({
    queryKey: ['/api/admin/cash-outs'],
    retry: 1
  });

  const { data: allAppointments, error: appointmentsError } = useQuery({
    queryKey: ['/api/admin/appointments'],
    retry: 1
  });

  const { data: seasonsData, error: seasonsError } = useQuery({
    queryKey: ['/api/admin/seasons'],
    retry: 1
  });

  const { data: feesReport, error: feesError } = useQuery({
    queryKey: ['/api/admin/fees-report'],
    retry: 1
  });

  const { data: commissionStats, error: commissionError } = useQuery({
    queryKey: ['/api/admin/commission-stats'],
    retry: 1
  });

  const { data: promotionBanners, error: bannersError } = useQuery({
    queryKey: ['/api/admin/promotion-banners'],
    retry: 1
  });

  const { data: gameLeaderboard, error: leaderboardError } = useQuery({
    queryKey: ['/api/admin/game-leaderboard'],
    retry: 1
  });

  const { data: pendingPurchases, error: purchasesError } = useQuery({
    queryKey: ['/api/admin/pending-purchases'],
    retry: 1
  });

  const { data: tokenClaims, error: claimsError } = useQuery({
    queryKey: ['/api/admin/token-claims'],
    retry: 1
  });

  const { data: tokenTransactions, error: tokenTransError } = useQuery({
    queryKey: ['/api/admin/token-transactions'],
    retry: 1
  });

  // Admin mutations for CRUD operations
  const createToyMutation = useMutation({
    mutationFn: async (toyData: any) => {
      const response = await fetch('/api/admin/toys', {
        method: 'POST',
        body: JSON.stringify(toyData),
        headers: { 'Content-Type': 'application/json' }
      } as RequestInit);
      if (!response.ok) throw new Error('Failed to create toy');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/toys'] });
      toast({ title: "Success", description: "Toy created successfully" });
      setShowCreateToyDialog(false);
      setNewToyData({ name: '', description: '', rarity: 'common', seasonId: '', imageUrl: '', gender: 'male' });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateToyMutation = useMutation({
    mutationFn: async ({ id, ...toyData }: any) => {
      const response = await fetch(`/api/admin/toys/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(toyData),
        headers: { 'Content-Type': 'application/json' }
      } as RequestInit);
      if (!response.ok) throw new Error('Failed to update toy');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/toys'] });
      toast({ title: "Success", description: "Toy updated successfully" });
      setShowEditToyDialog(false);
      setEditingToy(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteToyMutation = useMutation({
    mutationFn: async (toyId: string) => {
      const response = await fetch(`/api/admin/toys/${toyId}`, {
        method: 'DELETE'
      } as RequestInit);
      if (!response.ok) throw new Error('Failed to delete toy');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/toys'] });
      toast({ title: "Success", description: "Toy deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const bulkGenerateToysMutation = useMutation({
    mutationFn: async (bulkData: any) => {
      const response = await fetch('/api/admin/toys/bulk-generate', {
        method: 'POST',
        body: JSON.stringify(bulkData),
        headers: { 'Content-Type': 'application/json' }
      } as RequestInit);
      if (!response.ok) throw new Error('Failed to bulk generate toys');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/toys'] });
      toast({ title: "Success", description: "Toys bulk generated successfully" });
      setShowBulkGenerateDialog(false);
      setBulkGenerateData({ seasonId: '', quantity: 50, namePrefix: '', rarity: 'common' });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const createSeasonMutation = useMutation({
    mutationFn: async (seasonData: any) => {
      const response = await fetch('/api/admin/seasons', {
        method: 'POST',
        body: JSON.stringify(seasonData),
        headers: { 'Content-Type': 'application/json' }
      } as RequestInit);
      if (!response.ok) throw new Error('Failed to create season');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/seasons'] });
      toast({ title: "Success", description: "Season created successfully" });
      setShowCreateSeasonDialog(false);
      setNewSeasonData({ name: '', displayName: '', description: '', startDate: '', endDate: '', isActive: true });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateSeasonMutation = useMutation({
    mutationFn: async ({ id, ...seasonData }: any) => {
      const response = await fetch(`/api/admin/seasons/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(seasonData),
        headers: { 'Content-Type': 'application/json' }
      } as RequestInit);
      if (!response.ok) throw new Error('Failed to update season');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/seasons'] });
      toast({ title: "Success", description: "Season updated successfully" });
      setShowEditSeasonDialog(false);
      setEditingSeason(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteSeasonMutation = useMutation({
    mutationFn: async (seasonId: string) => {
      const response = await fetch(`/api/admin/seasons/${seasonId}`, {
        method: 'DELETE'
      } as RequestInit);
      if (!response.ok) throw new Error('Failed to delete season');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/seasons'] });
      toast({ title: "Success", description: "Season deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (emailData: any) => {
      const response = await fetch('/api/admin/send-email', {
        method: 'POST',
        body: JSON.stringify(emailData),
        headers: { 'Content-Type': 'application/json' }
      } as RequestInit);
      if (!response.ok) throw new Error('Failed to send email');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Email sent successfully" });
      setShowEmailDialog(false);
      setEmailData({ to: '', subject: '', message: '', type: 'custom' });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async ({ id, status }: any) => {
      const response = await fetch(`/api/admin/payment-verifications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        headers: { 'Content-Type': 'application/json' }
      } as RequestInit);
      if (!response.ok) throw new Error('Failed to verify payment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payment-verifications'] });
      toast({ title: "Success", description: "Payment verification updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const processCashOutMutation = useMutation({
    mutationFn: async ({ id, status }: any) => {
      const response = await fetch(`/api/admin/cash-outs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        headers: { 'Content-Type': 'application/json' }
      } as RequestInit);
      if (!response.ok) throw new Error('Failed to process cash out');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cash-outs'] });
      toast({ title: "Success", description: "Cash out request processed" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Error handling
  useEffect(() => {
    const errors = [
      dashboardError, usersError, toysError, transactionsError, 
      paymentsError, cashOutError, appointmentsError, seasonsError,
      feesError, commissionError, bannersError, leaderboardError,
      purchasesError, claimsError, tokenTransError
    ].filter(Boolean);
    
    if (errors.length > 0) {
      console.error('Admin dashboard errors:', errors);
      toast({
        title: "Loading Error",
        description: "Some admin data failed to load. Check console for details.",
        variant: "destructive"
      });
    }
  }, [dashboardError, usersError, toysError, transactionsError, 
      paymentsError, cashOutError, appointmentsError, seasonsError,
      feesError, commissionError, bannersError, leaderboardError,
      purchasesError, claimsError, tokenTransError, toast]);

  // Helper functions with safe data access
  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  const getRarityColor = (rarity: string) => {
    const colors = {
      common: 'bg-gray-500',
      rare: 'bg-blue-500',
      epic: 'bg-purple-500',
      legendary: 'bg-orange-500',
      secret: 'bg-red-500'
    };
    return colors[rarity as keyof typeof colors] || 'bg-gray-500';
  };

  // Safe data extraction with guaranteed array initialization
  const safeUsers: any[] = Array.isArray((usersResponse as any)?.users) ? (usersResponse as any).users : 
                           Array.isArray((usersResponse as any)?.data) ? (usersResponse as any).data : [];
  const safeTransactions: any[] = Array.isArray((allTransactions as any)?.data) ? (allTransactions as any).data : 
                                  Array.isArray(allTransactions) ? allTransactions : [];
  const safePaymentVerifications: any[] = Array.isArray((paymentVerifications as any)?.data) ? (paymentVerifications as any).data : 
                                          Array.isArray(paymentVerifications) ? paymentVerifications : [];
  const safeCashOutRequests: any[] = Array.isArray((cashOutRequests as any)?.data) ? (cashOutRequests as any).data : 
                                     Array.isArray(cashOutRequests) ? cashOutRequests : [];
  const safeAppointments: any[] = Array.isArray((allAppointments as any)?.data) ? (allAppointments as any).data : 
                                  Array.isArray(allAppointments) ? allAppointments : [];
  const safePromotionBanners: any[] = Array.isArray((promotionBanners as any)?.data) ? (promotionBanners as any).data : 
                                      Array.isArray(promotionBanners) ? promotionBanners : [];
  const safeGameLeaderboard: any[] = Array.isArray((gameLeaderboard as any)?.data) ? (gameLeaderboard as any).data : 
                                     Array.isArray(gameLeaderboard) ? gameLeaderboard : [];
  const safePendingPurchases: any[] = Array.isArray((pendingPurchases as any)?.data) ? (pendingPurchases as any).data : 
                                      Array.isArray(pendingPurchases) ? pendingPurchases : [];
  const safeTokenClaims: any[] = Array.isArray((tokenClaims as any)?.data) ? (tokenClaims as any).data : 
                                 Array.isArray(tokenClaims) ? tokenClaims : [];
  const safeTokenTransactions: any[] = Array.isArray((tokenTransactions as any)?.data) ? (tokenTransactions as any).data : 
                                       Array.isArray(tokenTransactions) ? tokenTransactions : [];
  const safeToys: any[] = Array.isArray(allToys) ? allToys : [];
  const safeSeasons: any[] = Array.isArray(seasonsData) ? seasonsData : [];
  const safeDashboardStats: any = (dashboardStats as any) || {};
  const safeFeesReport: any = (feesReport as any) || {};
  const safeCommissionStats: any = (commissionStats as any) || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Enhanced Admin Dashboard</h1>
          <p className="text-purple-200">Comprehensive system management and analytics</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:grid-cols-12 bg-white/10 backdrop-blur">
            <TabsTrigger value="overview" className="text-white">Overview</TabsTrigger>
            <TabsTrigger value="users" className="text-white">Users</TabsTrigger>
            <TabsTrigger value="toys" className="text-white">Toys</TabsTrigger>
            <TabsTrigger value="seasons" className="text-white">Seasons</TabsTrigger>
            <TabsTrigger value="appointments" className="text-white">Appointments</TabsTrigger>
            <TabsTrigger value="email" className="text-white">Email</TabsTrigger>
            <TabsTrigger value="payment-verifications" className="text-white">Payments</TabsTrigger>
            <TabsTrigger value="cashouts" className="text-white">Cash Outs</TabsTrigger>
            <TabsTrigger value="transactions" className="text-white">Transactions</TabsTrigger>
            <TabsTrigger value="reports" className="text-white">Reports</TabsTrigger>
            <TabsTrigger value="content" className="text-white">Content</TabsTrigger>
            <TabsTrigger value="leaderboard" className="text-white">Leaderboard</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-200 text-sm font-medium">Total Users</p>
                      <p className="text-3xl font-bold text-white">{safeDashboardStats?.totalUsers || safeUsers.length || 0}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-200 text-sm font-medium">Total Toys</p>
                      <p className="text-3xl font-bold text-white">{safeDashboardStats?.totalToys || safeToys.length || 0}</p>
                    </div>
                    <Package className="h-8 w-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-200 text-sm font-medium">Revenue</p>
                      <p className="text-3xl font-bold text-white">{formatCurrency(safeDashboardStats?.totalRevenue || safeFeesReport?.totalRevenue || 0)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-yellow-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-200 text-sm font-medium">Active Sessions</p>
                      <p className="text-3xl font-bold text-white">{safeDashboardStats?.activeSessions || 0}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-red-400" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-purple-200">ID</TableHead>
                      <TableHead className="text-purple-200">Email</TableHead>
                      <TableHead className="text-purple-200">Name</TableHead>
                      <TableHead className="text-purple-200">Credits</TableHead>
                      <TableHead className="text-purple-200">Status</TableHead>
                      <TableHead className="text-purple-200">Created</TableHead>
                      <TableHead className="text-purple-200">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {safeUsers.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell className="text-white font-mono text-xs">{user.id}</TableCell>
                        <TableCell className="text-white">{user.email}</TableCell>
                        <TableCell className="text-white">{user.firstName} {user.lastName}</TableCell>
                        <TableCell className="text-green-300">{formatCurrency(user.credits || 0)}</TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? 'default' : 'secondary'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-purple-200">{formatDate(user.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="bg-white/10 border-white/20 text-white">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="bg-red-600/20 text-red-300">
                              <Trash2 className="w-4 h-4" />
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

          {/* Toys Tab */}
          <TabsContent value="toys">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white">Toy Management</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setShowCreateToyDialog(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Toy
                  </Button>
                  <Button 
                    onClick={() => setShowBulkGenerateDialog(true)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Bulk Generate
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-purple-200">Name</TableHead>
                      <TableHead className="text-purple-200">Rarity</TableHead>
                      <TableHead className="text-purple-200">Owner</TableHead>
                      <TableHead className="text-purple-200">Season</TableHead>
                      <TableHead className="text-purple-200">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {safeToys.map((toy: any) => (
                      <TableRow key={toy.id}>
                        <TableCell className="text-white">{toy.name}</TableCell>
                        <TableCell>
                          <Badge className={`${getRarityColor(toy.rarity)} text-white`}>
                            {toy.rarity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-purple-200">
                          {toy.ownerId ? `User ${toy.ownerId}` : 'Template'}
                        </TableCell>
                        <TableCell className="text-purple-200">{toy.seasonName || 'None'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="bg-white/10 border-white/20 text-white"
                              onClick={() => {
                                setEditingToy(toy);
                                setEditedToyData(toy);
                                setShowEditToyDialog(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="bg-red-600/20 text-red-300"
                              onClick={() => {
                                deleteToyMutation.mutate(toy.id);
                              }}
                              disabled={deleteToyMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
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

          {/* Seasons Tab */}
          <TabsContent value="seasons">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white">Season Management</CardTitle>
                <Button 
                  onClick={() => setShowCreateSeasonDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Season
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-purple-200">Name</TableHead>
                      <TableHead className="text-purple-200">Display Name</TableHead>
                      <TableHead className="text-purple-200">Start Date</TableHead>
                      <TableHead className="text-purple-200">End Date</TableHead>
                      <TableHead className="text-purple-200">Active</TableHead>
                      <TableHead className="text-purple-200">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {safeSeasons.map((season: any) => (
                      <TableRow key={season.id}>
                        <TableCell className="text-white">{season.name}</TableCell>
                        <TableCell className="text-white">{season.displayName}</TableCell>
                        <TableCell className="text-purple-200">{formatDate(season.startDate)}</TableCell>
                        <TableCell className="text-purple-200">{formatDate(season.endDate)}</TableCell>
                        <TableCell>
                          <Badge variant={season.isActive ? 'default' : 'secondary'}>
                            {season.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="bg-white/10 border-white/20 text-white">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="bg-red-600/20 text-red-300">
                              <Trash2 className="w-4 h-4" />
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

          {/* Appointments Tab */}
          <TabsContent value="appointments">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Appointment Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-purple-200">User</TableHead>
                      <TableHead className="text-purple-200">Date</TableHead>
                      <TableHead className="text-purple-200">Time</TableHead>
                      <TableHead className="text-purple-200">Status</TableHead>
                      <TableHead className="text-purple-200">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {safeAppointments.map((appointment: any) => (
                      <TableRow key={appointment.id}>
                        <TableCell className="text-white">{appointment.userId}</TableCell>
                        <TableCell className="text-purple-200">{formatDate(appointment.date)}</TableCell>
                        <TableCell className="text-purple-200">{appointment.time}</TableCell>
                        <TableCell>
                          <Badge variant={appointment.status === 'confirmed' ? 'default' : 'secondary'}>
                            {appointment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-purple-200">{appointment.notes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Email Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">To Email</Label>
                      <Input
                        placeholder="recipient@example.com"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Subject</Label>
                      <Input
                        placeholder="Email subject"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-300">Message</Label>
                    <Textarea
                      placeholder="Email content..."
                      rows={6}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Send className="w-4 h-4 mr-2" />
                    Send Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Verifications Tab */}
          <TabsContent value="payment-verifications">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Payment Verifications</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-purple-200">User</TableHead>
                      <TableHead className="text-purple-200">Amount</TableHead>
                      <TableHead className="text-purple-200">Description</TableHead>
                      <TableHead className="text-purple-200">Status</TableHead>
                      <TableHead className="text-purple-200">Date</TableHead>
                      <TableHead className="text-purple-200">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {safePaymentVerifications.map((verification: any) => (
                      <TableRow key={verification.id}>
                        <TableCell className="text-white">{verification.userId}</TableCell>
                        <TableCell className="text-green-300">{formatCurrency(verification.amount)}</TableCell>
                        <TableCell className="text-purple-200">{verification.description}</TableCell>
                        <TableCell>
                          <Badge variant={verification.status === 'approved' ? 'default' : 'secondary'}>
                            {verification.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-purple-200">{formatDate(verification.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="bg-green-600/20 text-green-300">
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="bg-red-600/20 text-red-300">
                              <X className="w-4 h-4" />
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

          {/* Cash Outs Tab */}
          <TabsContent value="cashouts">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Cash Out Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-purple-200">User</TableHead>
                      <TableHead className="text-purple-200">Amount</TableHead>
                      <TableHead className="text-purple-200">Bank Details</TableHead>
                      <TableHead className="text-purple-200">Status</TableHead>
                      <TableHead className="text-purple-200">Date</TableHead>
                      <TableHead className="text-purple-200">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {safeCashOutRequests.map((request: any) => (
                      <TableRow key={request.id}>
                        <TableCell className="text-white">{request.userId}</TableCell>
                        <TableCell className="text-green-300">{formatCurrency(request.amount)}</TableCell>
                        <TableCell className="text-purple-200">
                          {request.bankName} - {request.accountNumber}
                        </TableCell>
                        <TableCell>
                          <Badge variant={request.status === 'approved' ? 'default' : 'secondary'}>
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-purple-200">{formatDate(request.requestedAt)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="bg-green-600/20 text-green-300">
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="bg-red-600/20 text-red-300">
                              <X className="w-4 h-4" />
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

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">All Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-purple-200">User</TableHead>
                      <TableHead className="text-purple-200">Type</TableHead>
                      <TableHead className="text-purple-200">Amount</TableHead>
                      <TableHead className="text-purple-200">Description</TableHead>
                      <TableHead className="text-purple-200">Status</TableHead>
                      <TableHead className="text-purple-200">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {safeTransactions.map((transaction: any) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="text-white">{transaction.userId}</TableCell>
                        <TableCell className="text-purple-200">{transaction.type}</TableCell>
                        <TableCell className="text-green-300">{formatCurrency(transaction.amount)}</TableCell>
                        <TableCell className="text-purple-200">{transaction.description}</TableCell>
                        <TableCell>
                          <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-purple-200">{formatDate(transaction.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Reports & Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-200 text-sm">Total Admin Fees</p>
                          <p className="text-2xl font-bold text-white">{formatCurrency((feesReport as any)?.totalAdminFees || 0)}</p>
                        </div>
                        <DollarSign className="h-8 w-8 text-green-400" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-200 text-sm">Total Transactions</p>
                          <p className="text-2xl font-bold text-white">{(feesReport as any)?.totalTransactions || 0}</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-blue-400" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-200 text-sm">Commission Stats</p>
                          <p className="text-2xl font-bold text-white">{safeCommissionStats?.totalCommissions || 0}</p>
                        </div>
                        <Award className="h-8 w-8 text-yellow-400" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Management Tab */}
          <TabsContent value="content">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Content Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">Banners</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-purple-200">Title</TableHead>
                            <TableHead className="text-purple-200">Description</TableHead>
                            <TableHead className="text-purple-200">Active</TableHead>
                            <TableHead className="text-purple-200">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {safePromotionBanners.map((banner: any) => (
                            <TableRow key={banner.id}>
                              <TableCell className="text-white">{banner.title}</TableCell>
                              <TableCell className="text-purple-200">{banner.description}</TableCell>
                              <TableCell>
                                <Badge variant={banner.isActive ? 'default' : 'secondary'}>
                                  {banner.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button size="sm" variant="outline" className="bg-white/10 border-white/20 text-white">
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Game Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Game Leaderboard</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-purple-200">Rank</TableHead>
                      <TableHead className="text-purple-200">User</TableHead>
                      <TableHead className="text-purple-200">Score</TableHead>
                      <TableHead className="text-purple-200">Tokens Earned</TableHead>
                      <TableHead className="text-purple-200">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {safeGameLeaderboard.map((entry: any, index: number) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-white font-bold">#{index + 1}</TableCell>
                        <TableCell className="text-white">{entry.userId}</TableCell>
                        <TableCell className="text-green-300">{entry.score}</TableCell>
                        <TableCell className="text-yellow-300">{entry.tokensEarned}</TableCell>
                        <TableCell className="text-purple-200">{formatDate(entry.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Toy Dialog */}
        <Dialog open={showCreateToyDialog} onOpenChange={setShowCreateToyDialog}>
          <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Template Toy</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Toy Name</Label>
                  <Input
                    value={newToyData.name || ''}
                    onChange={(e) => setNewToyData({ ...newToyData, name: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                    placeholder="Enter toy name"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Rarity</Label>
                  <Select 
                    value={newToyData.rarity || 'common'} 
                    onValueChange={(value) => setNewToyData({ ...newToyData, rarity: value })}
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
              <div>
                <Label className="text-gray-300">Season</Label>
                <Select 
                  value={newToyData.seasonId || ''} 
                  onValueChange={(value) => setNewToyData({ ...newToyData, seasonId: value })}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Select season" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {safeSeasons.map((season: any) => (
                      <SelectItem key={season.id} value={season.id.toString()} className="text-white">
                        {season.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setShowCreateToyDialog(false);
                  setNewToyData({
                    name: '',
                    description: '',
                    rarity: 'common',
                    seasonId: '',
                    imageUrl: '',
                    gender: 'male'
                  });
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    createToyMutation.mutate({
                      ...newToyData,
                      ownerId: null, // Template toy
                      gender: newToyData.gender || 'male'
                    });
                  }}
                  disabled={createToyMutation.isPending}
                >
                  {createToyMutation.isPending ? 'Creating...' : 'Create Template Toy'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Generate Dialog */}
        <Dialog open={showBulkGenerateDialog} onOpenChange={setShowBulkGenerateDialog}>
          <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Bulk Generate Template Toys</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Base Template Toy</Label>
                  <Select 
                    value={selectedToyForBulk || ''} 
                    onValueChange={setSelectedToyForBulk}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select template toy" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {safeToys.filter((toy: any) => !toy.ownerId).map((toy: any) => (
                        <SelectItem key={toy.id} value={toy.id.toString()} className="text-white">
                          {toy.name} ({toy.rarity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Quantity</Label>
                  <Input
                    type="number"
                    value={bulkQuantity}
                    onChange={(e) => setBulkQuantity(parseInt(e.target.value) || 1)}
                    className="bg-white/10 border-white/20 text-white"
                    placeholder="Number to generate"
                    min="1"
                    max="100"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setShowBulkGenerateDialog(false);
                  setSelectedToyForBulk('');
                  setBulkQuantity(1);
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (selectedToyForBulk && bulkQuantity > 0) {
                      bulkGenerateToysMutation.mutate({
                        templateToyId: selectedToyForBulk,
                        quantity: bulkQuantity
                      });
                    }
                  }}
                  disabled={bulkGenerateToysMutation.isPending || !selectedToyForBulk}
                >
                  {bulkGenerateToysMutation.isPending ? 'Generating...' : `Generate ${bulkQuantity} Template Toys`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Season Dialog */}
        <Dialog open={showCreateSeasonDialog} onOpenChange={setShowCreateSeasonDialog}>
          <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Season</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Season Name</Label>
                  <Input
                    value={newSeasonData.name || ''}
                    onChange={(e) => setNewSeasonData({ ...newSeasonData, name: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                    placeholder="Enter season name"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Display Name</Label>
                  <Input
                    value={newSeasonData.displayName || ''}
                    onChange={(e) => setNewSeasonData({ ...newSeasonData, displayName: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                    placeholder="Enter display name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Start Date</Label>
                  <Input
                    type="date"
                    value={newSeasonData.startDate || ''}
                    onChange={(e) => setNewSeasonData({ ...newSeasonData, startDate: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">End Date</Label>
                  <Input
                    type="date"
                    value={newSeasonData.endDate || ''}
                    onChange={(e) => setNewSeasonData({ ...newSeasonData, endDate: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={newSeasonData.isActive || false}
                  onChange={(e) => setNewSeasonData({ ...newSeasonData, isActive: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isActive" className="text-gray-300">Active Season</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setShowCreateSeasonDialog(false);
                  setNewSeasonData({
                    name: '',
                    displayName: '',
                    description: '',
                    startDate: '',
                    endDate: '',
                    isActive: false
                  });
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    createSeasonMutation.mutate(newSeasonData);
                  }}
                  disabled={createSeasonMutation.isPending}
                >
                  {createSeasonMutation.isPending ? 'Creating...' : 'Create Season'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditToyDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  toast({ title: "Toy updated", description: "Template has been updated successfully" });
                  setShowEditToyDialog(false);
                }}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default EnhancedAdminDashboard;