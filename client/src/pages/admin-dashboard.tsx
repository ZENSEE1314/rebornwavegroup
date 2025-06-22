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
import { useAuth } from "@/hooks/useAuth";
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
  ShoppingCart,
  History,
  Package,
  Calendar,
  Award,
  Search,
  Download,
  Upload,
  FileText,
  Filter
} from "lucide-react";

function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<any>(null);
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
  
  // Bulk upload states
  const [bulkToyData, setBulkToyData] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Tab state management
  const [activeTab, setActiveTab] = useState("users");

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

  // Check if user is admin - temporarily allow all authenticated users for sss@gmail.com
  const isAdmin = user && ((user as any)?.email === 'sss@gmail.com' || (user as any)?.role === 'admin');
  if (!isAdmin) {
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

  // Fetch all users
  const { data: usersResponse } = useQuery({
    queryKey: ["/api/admin/users"],
  });
  const allUsers = (usersResponse as any)?.data || [];

  // Fetch all cash out requests
  const { data: cashOutResponse } = useQuery({
    queryKey: ["/api/admin/cash-outs"],
  });
  const cashOutRequests = (cashOutResponse as any)?.data || [];

  // Fetch all transactions
  const { data: transactionsResponse } = useQuery({
    queryKey: ["/api/admin/transactions"],
  });
  const allTransactions = (transactionsResponse as any)?.data || [];

  // Fetch all toys
  const { data: toysResponse } = useQuery({
    queryKey: ["/api/admin/all-toys"],
  });
  const allToys = (toysResponse as any)?.data || [];

  // Fetch seasons for template creation
  const { data: seasonsRaw } = useQuery({
    queryKey: ['/api/seasons'],
    retry: false,
  });
  const seasonsData = Array.isArray(seasonsRaw) ? seasonsRaw : [];

  // Fetch template toys separately
  const { data: templateToysData } = useQuery({
    queryKey: ['/api/admin/template-toys'],
    retry: false,
  });
  const templateToys = (templateToysData as any)?.data || [];

  // Fetch payment verifications
  const { data: paymentVerifications = [] } = useQuery({
    queryKey: ["/api/admin/payment-verifications"],
  });

  // Fetch token transactions
  const { data: tokenTransactions = [] } = useQuery({
    queryKey: ["/api/admin/token-transactions"],
  });

  // Fetch token claims
  const { data: tokenClaims = [] } = useQuery({
    queryKey: ["/api/admin/token-claims"],
  });

  // Fetch appointments
  const { data: appointments = [] } = useQuery({
    queryKey: ["/api/admin/appointments"],
  });

  // Fetch game leaderboard
  const { data: gameLeaderboard = [] } = useQuery({
    queryKey: ["/api/game-scores/leaderboard"],
  });

  // Fetch marketplace listings
  const { data: marketplaceListings = [] } = useQuery({
    queryKey: ["/api/admin/all-pending-purchases"],
  });

  // Fetch promotion banners
  const { data: promotionBanners = [] } = useQuery({
    queryKey: ["/api/admin/banners"],
  });

  // Fetch appointment events
  const { data: appointmentEvents = [] } = useQuery({
    queryKey: ["/api/admin/appointment-events"],
  });

  // Fetch reward items
  const { data: rewardItems = [] } = useQuery({
    queryKey: ["/api/admin/reward-items"],
  });

  // Fetch commission stats
  const { data: commissionStats = {} } = useQuery({
    queryKey: ["/api/admin/commission-stats"],
  });

  // Fetch fees report
  const { data: feesReport = {} } = useQuery({
    queryKey: ["/api/admin/fees-report"],
  });

  // Fetch activated pets
  const { data: activatedPets = [] } = useQuery({
    queryKey: ["/api/admin/activated-pets"],
  });

  // Fetch topup requests
  const { data: topupRequests = [] } = useQuery({
    queryKey: ["/api/admin/topup-requests"],
  });

  // Update user credits mutation
  const updateCreditsMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: string; amount: string }) => {
      return apiRequest("POST", "/api/admin/update-credits", { userId, amount });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "User credits updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update credits", variant: "destructive" });
    }
  });

  // Update user points mutation
  const updatePointsMutation = useMutation({
    mutationFn: async ({ userId, points }: { userId: string; points: number }) => {
      return apiRequest("POST", "/api/admin/update-points", { userId, points });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "User points updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update points", variant: "destructive" });
    }
  });

  // Update cash out status mutation
  const updateCashOutMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: number; status: string; adminNotes?: string }) => {
      return apiRequest("PUT", `/api/admin/cash-out/${id}`, { status, adminNotes });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Cash out request updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cash-outs"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update cash out request", variant: "destructive" });
    }
  });

  // Payment verification mutations
  const approvePaymentMutation = useMutation({
    mutationFn: async ({ id, adminNotes }: { id: number; adminNotes?: string }) => {
      return apiRequest("POST", `/api/admin/payment-verification/${id}/approve`, { adminNotes });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Payment approved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-verifications"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to approve payment", variant: "destructive" });
    }
  });

  const rejectPaymentMutation = useMutation({
    mutationFn: async ({ id, adminNotes }: { id: number; adminNotes?: string }) => {
      return apiRequest("POST", `/api/admin/payment-verification/${id}/reject`, { adminNotes });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Payment rejected successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-verifications"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reject payment", variant: "destructive" });
    }
  });

  // Token transaction mutations
  const createTokenTransactionMutation = useMutation({
    mutationFn: async ({ userId, type, description, tokens }: { userId: string; type: string; description: string; tokens: number }) => {
      return apiRequest("POST", "/api/admin/token-transaction", { userId, type, description, tokens });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Token transaction created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/token-transactions"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create token transaction", variant: "destructive" });
    }
  });

  const updateTokenClaimMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: number; status: string; adminNotes?: string }) => {
      return apiRequest("PUT", `/api/admin/token-claim/${id}`, { status, adminNotes });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Token claim updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/token-claims"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update token claim", variant: "destructive" });
    }
  });

  // Appointment mutations
  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: number; status: string; adminNotes?: string }) => {
      return apiRequest("PUT", `/api/admin/appointment/${id}`, { status, adminNotes });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Appointment updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/appointments"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update appointment", variant: "destructive" });
    }
  });

  // Content management mutations
  const createBannerMutation = useMutation({
    mutationFn: async ({ title, content, isActive }: { title: string; content: string; isActive: boolean }) => {
      return apiRequest("POST", "/api/admin/banner", { title, content, isActive });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Banner created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create banner", variant: "destructive" });
    }
  });

  const updateBannerMutation = useMutation({
    mutationFn: async ({ id, title, content, isActive }: { id: number; title: string; content: string; isActive: boolean }) => {
      return apiRequest("PUT", `/api/admin/banner/${id}`, { title, content, isActive });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Banner updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update banner", variant: "destructive" });
    }
  });

  const deleteBannerMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/banner/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Banner deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete banner", variant: "destructive" });
    }
  });

  // Marketplace mutations
  const approvePurchaseMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return apiRequest("POST", `/api/admin/purchase/${id}/approve`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Purchase approved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-pending-purchases"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to approve purchase", variant: "destructive" });
    }
  });

  const rejectPurchaseMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) => {
      return apiRequest("POST", `/api/admin/purchase/${id}/reject`, { reason });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Purchase rejected successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-pending-purchases"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reject purchase", variant: "destructive" });
    }
  });

  // Topup request mutations
  const approveTopupMutation = useMutation({
    mutationFn: async ({ id, adminNotes }: { id: number; adminNotes?: string }) => {
      return apiRequest("POST", `/api/admin/topup/${id}/approve`, { adminNotes });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Topup approved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/topup-requests"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to approve topup", variant: "destructive" });
    }
  });

  const rejectTopupMutation = useMutation({
    mutationFn: async ({ id, adminNotes }: { id: number; adminNotes?: string }) => {
      return apiRequest("POST", `/api/admin/topup/${id}/reject`, { adminNotes });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Topup rejected successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/topup-requests"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reject topup", variant: "destructive" });
    }
  });

  // Add new toy mutation
  const addToyMutation = useMutation({
    mutationFn: async (toyData: any) => {
      return apiRequest("POST", "/api/admin/toys", toyData);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "New toy added successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-toys"] });
      setNewToy({ name: "", series: "", rarity: "common", imageUrl: "", qrCode: "" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add new toy", variant: "destructive" });
    }
  });

  // Create template toy mutation
  const createTemplateToyMutation = useMutation({
    mutationFn: async (templateData: any) => {
      return apiRequest('POST', '/api/admin/toys/create-template', templateData);
    },
    onSuccess: () => {
      toast({ title: "Template toy created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/template-toys'] });
      queryClient.invalidateQueries({ queryKey: ['/api/seasonal-toys'] });
      setShowTemplateDialog(false);
      setTemplateToyForm({
        name: "",
        seasonId: "",
        rarity: "common",
        color: "blue",
        gender: "male",
        imageUrl: "",
        quantity: 1
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || "Failed to create template toy";
      toast({ 
        title: "Error", 
        description: errorMessage,
        variant: "destructive" 
      });
    }
  });

  const handleUpdateCredits = (userId: string, amount: string) => {
    updateCreditsMutation.mutate({ userId, amount });
  };

  const handleUpdatePoints = (userId: string, points: number) => {
    updatePointsMutation.mutate({ userId, points });
  };

  const handleCashOutAction = (id: number, status: string, adminNotes?: string) => {
    updateCashOutMutation.mutate({ id, status, adminNotes });
  };

  const handleAddToy = () => {
    if (!newToy.name || !newToy.series) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    addToyMutation.mutate(newToy);
  };

  const formatCurrency = (amount: string | number) => {
    return `Rp ${parseInt(amount.toString()).toLocaleString('id-ID')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-purple-200">Complete system administration and control panel</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-200 text-sm">Total Users</p>
                  <p className="text-2xl font-bold text-white">{allUsers.length}</p>
                </div>
                <Users className="w-8 h-8 text-purple-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-200 text-sm">Pending Cash Outs</p>
                  <p className="text-2xl font-bold text-white">
                    {cashOutRequests.filter((req: any) => req.status === 'pending').length}
                  </p>
                </div>
                <CreditCard className="w-8 h-8 text-yellow-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-200 text-sm">Total Transactions</p>
                  <p className="text-2xl font-bold text-white">{allTransactions.length}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-200 text-sm">Total Toys</p>
                  <p className="text-2xl font-bold text-white">{allToys.length}</p>
                </div>
                <Package className="w-8 h-8 text-blue-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 bg-white/10 backdrop-blur-md">
            <TabsTrigger value="users" className="data-[state=active]:bg-white/20">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-white/20">
              <DollarSign className="w-4 h-4 mr-2" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="cashouts" className="data-[state=active]:bg-white/20">
              <CreditCard className="w-4 h-4 mr-2" />
              Cash Outs
            </TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-white/20">
              <History className="w-4 h-4 mr-2" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="data-[state=active]:bg-white/20">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Marketplace
            </TabsTrigger>
            <TabsTrigger value="tokens" className="data-[state=active]:bg-white/20">
              <Award className="w-4 h-4 mr-2" />
              Tokens
            </TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-white/20">
              <Edit className="w-4 h-4 mr-2" />
              Content
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-white/20">
              <TrendingUp className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
          </TabsList>

          {/* Users Management */}
          <TabsContent value="users">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-purple-200">User</TableHead>
                      <TableHead className="text-purple-200">Email</TableHead>
                      <TableHead className="text-purple-200">Credits</TableHead>
                      <TableHead className="text-purple-200">Points</TableHead>
                      <TableHead className="text-purple-200">Role</TableHead>
                      <TableHead className="text-purple-200">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell className="text-white">
                          {user.firstName} {user.lastName}
                        </TableCell>
                        <TableCell className="text-purple-200">{user.email}</TableCell>
                        <TableCell className="text-green-300">{formatCurrency(user.credits || 0)}</TableCell>
                        <TableCell className="text-blue-300">{user.loyaltyPoints || 0}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setSelectedUser(user)}
                                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-gray-900 border-gray-700">
                              <DialogHeader>
                                <DialogTitle className="text-white">
                                  Edit User: {selectedUser?.firstName} {selectedUser?.lastName}
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label className="text-gray-300">Update Credits</Label>
                                  <div className="flex gap-2">
                                    <Input
                                      placeholder="Amount"
                                      className="bg-gray-800 border-gray-600 text-white"
                                      id="creditAmount"
                                    />
                                    <Button
                                      onClick={() => {
                                        const amount = (document.getElementById('creditAmount') as HTMLInputElement)?.value;
                                        if (amount && selectedUser) {
                                          handleUpdateCredits(selectedUser.id, amount);
                                        }
                                      }}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      Update
                                    </Button>
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-gray-300">Update Points</Label>
                                  <div className="flex gap-2">
                                    <Input
                                      placeholder="Points"
                                      type="number"
                                      className="bg-gray-800 border-gray-600 text-white"
                                      id="pointAmount"
                                    />
                                    <Button
                                      onClick={() => {
                                        const points = (document.getElementById('pointAmount') as HTMLInputElement)?.value;
                                        if (points && selectedUser) {
                                          handleUpdatePoints(selectedUser.id, parseInt(points));
                                        }
                                      }}
                                      className="bg-blue-600 hover:bg-blue-700"
                                    >
                                      Update
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cash Out Requests */}
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
                    {cashOutRequests.map((request: any) => (
                      <TableRow key={request.id}>
                        <TableCell className="text-white">{request.user?.firstName} {request.user?.lastName}</TableCell>
                        <TableCell className="text-green-300">{formatCurrency(request.amount)}</TableCell>
                        <TableCell className="text-purple-200">
                          <div className="text-sm">
                            <div>{request.bankName}</div>
                            <div>{request.accountNumber}</div>
                            <div>{request.accountHolderName}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            request.status === 'approved' ? 'default' :
                            request.status === 'rejected' ? 'destructive' : 'secondary'
                          }>
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-purple-200">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {request.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleCashOutAction(request.id, 'approved')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleCashOutAction(request.id, 'rejected', 'Rejected by admin')}
                              >
                                <X className="w-4 h-4" />
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

          {/* Transactions */}
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
                      <TableHead className="text-purple-200">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allTransactions.map((transaction: any) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="text-white">{transaction.user?.firstName} {transaction.user?.lastName}</TableCell>
                        <TableCell>
                          <Badge variant={transaction.type === 'credit' ? 'default' : 'secondary'}>
                            {transaction.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-green-300">{formatCurrency(transaction.amount)}</TableCell>
                        <TableCell className="text-purple-200">{transaction.description}</TableCell>
                        <TableCell className="text-purple-200">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Toys Management */}
          <TabsContent value="toys">
            <div className="space-y-6">
              {/* Template Toy Creation */}
              <Card className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 backdrop-blur-md border-green-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Plus className="h-5 w-5 mr-2 text-green-400" />
                    Create Template Toys for Seasonal Collections
                  </CardTitle>
                  <p className="text-gray-300 text-sm mt-2">Template toys appear in Seasonal Collections for users to discover and collect</p>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => setShowTemplateDialog(true)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="lg"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template Toy
                  </Button>
                </CardContent>
              </Card>

              {/* Add New Toy */}
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Add New Toy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-purple-200">Toy Name</Label>
                      <Input
                        value={newToy.name}
                        onChange={(e) => setNewToy({...newToy, name: e.target.value})}
                        className="bg-white/10 border-white/20 text-white"
                        placeholder="Enter toy name"
                      />
                    </div>
                    <div>
                      <Label className="text-purple-200">Series</Label>
                      <Input
                        value={newToy.series}
                        onChange={(e) => setNewToy({...newToy, series: e.target.value})}
                        className="bg-white/10 border-white/20 text-white"
                        placeholder="Enter series name"
                      />
                    </div>
                    <div>
                      <Label className="text-purple-200">Rarity</Label>
                      <Select value={newToy.rarity} onValueChange={(value) => setNewToy({...newToy, rarity: value})}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="common">Common</SelectItem>
                          <SelectItem value="uncommon">Uncommon</SelectItem>
                          <SelectItem value="rare">Rare</SelectItem>
                          <SelectItem value="epic">Epic</SelectItem>
                          <SelectItem value="legendary">Legendary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-purple-200">Image URL</Label>
                      <Input
                        value={newToy.imageUrl}
                        onChange={(e) => setNewToy({...newToy, imageUrl: e.target.value})}
                        className="bg-white/10 border-white/20 text-white"
                        placeholder="Enter image URL"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleAddToy}
                    className="mt-4 bg-purple-600 hover:bg-purple-700"
                    disabled={addToyMutation.isPending}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Toy
                  </Button>
                </CardContent>
              </Card>

              {/* All Toys */}
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">All Toys</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-purple-200">Name</TableHead>
                        <TableHead className="text-purple-200">Series</TableHead>
                        <TableHead className="text-purple-200">Rarity</TableHead>
                        <TableHead className="text-purple-200">Owner</TableHead>
                        <TableHead className="text-purple-200">QR Code</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allToys.map((toy: any) => (
                        <TableRow key={toy.id}>
                          <TableCell className="text-white">{toy.name}</TableCell>
                          <TableCell className="text-purple-200">{toy.series}</TableCell>
                          <TableCell>
                            <Badge variant={
                              toy.rarity === 'legendary' ? 'default' :
                              toy.rarity === 'epic' ? 'secondary' : 'outline'
                            }>
                              {toy.rarity}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-purple-200">
                            {toy.owner ? `${toy.owner.firstName} ${toy.owner.lastName}` : 'Unowned'}
                          </TableCell>
                          <TableCell className="text-purple-200 font-mono text-xs">{toy.qrCode}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Reports */}
          <TabsContent value="reports">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">User Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-purple-200">Total Credits in System:</span>
                      <span className="text-green-300 font-bold">
                        {formatCurrency(allUsers.reduce((sum: number, user: any) => sum + parseInt(user.credits || 0), 0))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-200">Total Points in System:</span>
                      <span className="text-blue-300 font-bold">
                        {allUsers.reduce((sum: number, user: any) => sum + parseInt(user.loyaltyPoints || 0), 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-200">Active Users:</span>
                      <span className="text-white font-bold">{allUsers.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Transaction Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-purple-200">Total Transactions:</span>
                      <span className="text-white font-bold">{allTransactions.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-200">Pending Cash Outs:</span>
                      <span className="text-yellow-300 font-bold">
                        {cashOutRequests.filter((req: any) => req.status === 'pending').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-200">Total Cash Out Amount:</span>
                      <span className="text-red-300 font-bold">
                        {formatCurrency(cashOutRequests.reduce((sum: number, req: any) => sum + parseInt(req.amount || 0), 0))}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Template Toys */}
          <TabsContent value="templates">
            <div className="space-y-6">
              {/* Create Template Toy Button */}
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Template Toy Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => setShowTemplateDialog(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Template Toy
                  </Button>
                </CardContent>
              </Card>

              {/* Template Toys List */}
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Template Toys ({templateToys.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {templateToys.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>No template toys created yet</p>
                      <p className="text-sm">Create template toys for seasonal collections</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-purple-200">Name</TableHead>
                          <TableHead className="text-purple-200">Season</TableHead>
                          <TableHead className="text-purple-200">Rarity</TableHead>
                          <TableHead className="text-purple-200">Color</TableHead>
                          <TableHead className="text-purple-200">Gender</TableHead>
                          <TableHead className="text-purple-200">Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {templateToys.map((toy: any) => (
                          <TableRow key={toy.id}>
                            <TableCell className="text-white font-medium">{toy.name}</TableCell>
                            <TableCell className="text-purple-200">
                              {toy.season ? toy.season.displayName : 'No Season'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                toy.rarity === 'legendary' ? 'default' :
                                toy.rarity === 'epic' ? 'secondary' : 'outline'
                              }>
                                {toy.rarity}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-purple-200">{toy.color}</TableCell>
                            <TableCell className="text-purple-200">
                              <span className={toy.gender === 'male' ? 'text-blue-400' : 'text-pink-400'}>
                                {toy.gender === 'male' ? '♂ Male' : '♀ Female'}
                              </span>
                            </TableCell>
                            <TableCell className="text-purple-200 text-sm">
                              {new Date(toy.createdAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Template Toy Creation Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-green-400">Create Template Toy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Toy Name</Label>
              <Input
                value={templateToyForm.name}
                onChange={(e) => setTemplateToyForm({...templateToyForm, name: e.target.value})}
                className="bg-gray-800 border-gray-600 text-white"
                placeholder="Enter toy name"
              />
            </div>
            
            <div>
              <Label className="text-gray-300">Season</Label>
              <Select 
                value={templateToyForm.seasonId} 
                onValueChange={(value) => setTemplateToyForm({...templateToyForm, seasonId: value})}
              >
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue placeholder="Select season" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {seasonsData.map((season: any) => (
                    <SelectItem key={season.id} value={season.id.toString()} className="text-white hover:bg-gray-700">
                      {season.displayName || season.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300">Rarity</Label>
                <Select 
                  value={templateToyForm.rarity} 
                  onValueChange={(value) => setTemplateToyForm({...templateToyForm, rarity: value})}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="common" className="text-white hover:bg-gray-700">Common</SelectItem>
                    <SelectItem value="uncommon" className="text-white hover:bg-gray-700">Uncommon</SelectItem>
                    <SelectItem value="rare" className="text-white hover:bg-gray-700">Rare</SelectItem>
                    <SelectItem value="epic" className="text-white hover:bg-gray-700">Epic</SelectItem>
                    <SelectItem value="legendary" className="text-white hover:bg-gray-700">Legendary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300">Color</Label>
                <Select 
                  value={templateToyForm.color} 
                  onValueChange={(value) => setTemplateToyForm({...templateToyForm, color: value})}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="red" className="text-white hover:bg-gray-700">Red</SelectItem>
                    <SelectItem value="blue" className="text-white hover:bg-gray-700">Blue</SelectItem>
                    <SelectItem value="green" className="text-white hover:bg-gray-700">Green</SelectItem>
                    <SelectItem value="yellow" className="text-white hover:bg-gray-700">Yellow</SelectItem>
                    <SelectItem value="purple" className="text-white hover:bg-gray-700">Purple</SelectItem>
                    <SelectItem value="pink" className="text-white hover:bg-gray-700">Pink</SelectItem>
                    <SelectItem value="orange" className="text-white hover:bg-gray-700">Orange</SelectItem>
                    <SelectItem value="black" className="text-white hover:bg-gray-700">Black</SelectItem>
                    <SelectItem value="white" className="text-white hover:bg-gray-700">White</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300">Gender</Label>
                <Select 
                  value={templateToyForm.gender} 
                  onValueChange={(value) => setTemplateToyForm({...templateToyForm, gender: value})}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="male" className="text-white hover:bg-gray-700">Male</SelectItem>
                    <SelectItem value="female" className="text-white hover:bg-gray-700">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={templateToyForm.quantity}
                  onChange={(e) => setTemplateToyForm({...templateToyForm, quantity: parseInt(e.target.value) || 1})}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-300">Image URL (Optional)</Label>
              <Input
                value={templateToyForm.imageUrl}
                onChange={(e) => setTemplateToyForm({...templateToyForm, imageUrl: e.target.value})}
                className="bg-gray-800 border-gray-600 text-white"
                placeholder="https://example.com/toy-image.jpg"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={() => setShowTemplateDialog(false)}
                variant="outline" 
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (!templateToyForm.name || !templateToyForm.seasonId) {
                    toast({
                      title: "Missing Information",
                      description: "Please fill in toy name and select a season",
                      variant: "destructive"
                    });
                    return;
                  }
                  createTemplateToyMutation.mutate(templateToyForm);
                }}
                disabled={createTemplateToyMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {createTemplateToyMutation.isPending ? "Creating..." : "Create Template"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

          {/* Payment Verifications Tab */}
          <TabsContent value="payments">
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
                      <TableHead className="text-purple-200">Status</TableHead>
                      <TableHead className="text-purple-200">Date</TableHead>
                      <TableHead className="text-purple-200">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(paymentVerifications as any[]).map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell className="text-white">{payment.userId}</TableCell>
                        <TableCell className="text-white">{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={payment.status === 'approved' ? 'default' : payment.status === 'rejected' ? 'destructive' : 'secondary'}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-purple-200">
                          {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => approvePaymentMutation.mutate({ id: payment.id })}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectPaymentMutation.mutate({ id: payment.id })}
                            >
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

          {/* Marketplace Tab */}
          <TabsContent value="marketplace">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Marketplace Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-purple-200">Purchase ID</TableHead>
                      <TableHead className="text-purple-200">Buyer</TableHead>
                      <TableHead className="text-purple-200">Listing</TableHead>
                      <TableHead className="text-purple-200">Status</TableHead>
                      <TableHead className="text-purple-200">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(marketplaceListings as any[]).map((purchase: any) => (
                      <TableRow key={purchase.id}>
                        <TableCell className="text-white">#{purchase.id}</TableCell>
                        <TableCell className="text-white">{purchase.buyerId}</TableCell>
                        <TableCell className="text-white">Listing #{purchase.listingId}</TableCell>
                        <TableCell>
                          <Badge variant={purchase.status === 'completed' ? 'default' : 'secondary'}>
                            {purchase.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => approvePurchaseMutation.mutate({ id: purchase.id })}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectPurchaseMutation.mutate({ id: purchase.id })}
                            >
                              Reject
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

          {/* Tokens Tab */}
          <TabsContent value="tokens">
            <div className="space-y-6">
              {/* Token Transactions */}
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Token Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-purple-200">User</TableHead>
                        <TableHead className="text-purple-200">Type</TableHead>
                        <TableHead className="text-purple-200">Tokens</TableHead>
                        <TableHead className="text-purple-200">Description</TableHead>
                        <TableHead className="text-purple-200">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tokenTransactions.map((transaction: any) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="text-white">{transaction.userId}</TableCell>
                          <TableCell className="text-white">{transaction.type}</TableCell>
                          <TableCell className="text-white">{transaction.tokens}</TableCell>
                          <TableCell className="text-white">{transaction.description}</TableCell>
                          <TableCell className="text-purple-200">
                            {transaction.createdAt ? new Date(transaction.createdAt).toLocaleDateString() : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Token Claims */}
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Token Claims</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-purple-200">User</TableHead>
                        <TableHead className="text-purple-200">Tokens Awarded</TableHead>
                        <TableHead className="text-purple-200">Status</TableHead>
                        <TableHead className="text-purple-200">Date</TableHead>
                        <TableHead className="text-purple-200">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tokenClaims.map((claim: any) => (
                        <TableRow key={claim.id}>
                          <TableCell className="text-white">{claim.userId}</TableCell>
                          <TableCell className="text-white">{claim.tokensAwarded}</TableCell>
                          <TableCell>
                            <Badge variant={claim.status === 'approved' ? 'default' : claim.status === 'rejected' ? 'destructive' : 'secondary'}>
                              {claim.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-purple-200">
                            {claim.createdAt ? new Date(claim.createdAt).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => updateTokenClaimMutation.mutate({ id: claim.id, status: 'approved' })}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updateTokenClaimMutation.mutate({ id: claim.id, status: 'rejected' })}
                              >
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
            </div>
          </TabsContent>

          {/* Content Management Tab */}
          <TabsContent value="content">
            <div className="space-y-6">
              {/* Promotion Banners */}
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Promotion Banners</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Button
                      onClick={() => createBannerMutation.mutate({ 
                        title: "New Banner", 
                        content: "Banner content", 
                        isActive: true 
                      })}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Banner
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-purple-200">Title</TableHead>
                        <TableHead className="text-purple-200">Content</TableHead>
                        <TableHead className="text-purple-200">Status</TableHead>
                        <TableHead className="text-purple-200">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {promotionBanners.map((banner: any) => (
                        <TableRow key={banner.id}>
                          <TableCell className="text-white">{banner.title}</TableCell>
                          <TableCell className="text-white">{banner.content}</TableCell>
                          <TableCell>
                            <Badge variant={banner.isActive ? 'default' : 'secondary'}>
                              {banner.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => updateBannerMutation.mutate({ 
                                  id: banner.id, 
                                  title: banner.title, 
                                  content: banner.content, 
                                  isActive: !banner.isActive 
                                })}
                                variant="outline"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteBannerMutation.mutate(banner.id)}
                              >
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

              {/* Game Leaderboard */}
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
                      {gameLeaderboard.map((entry: any, index: number) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-white">#{index + 1}</TableCell>
                          <TableCell className="text-white">{entry.userId}</TableCell>
                          <TableCell className="text-white">{entry.score}</TableCell>
                          <TableCell className="text-white">{entry.tokensEarned}</TableCell>
                          <TableCell className="text-purple-200">
                            {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}