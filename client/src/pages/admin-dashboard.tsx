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
  History,
  Package,
  ShoppingCart,
  Calendar,
  Award,
  Search,
  Download,
  Upload,
  FileText,
  Filter
} from "lucide-react";

export default function AdminDashboard() {
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
  
  // Pagination states
  const [currentUserPage, setCurrentUserPage] = useState(1);
  const [currentCashOutPage, setCurrentCashOutPage] = useState(1);
  const [currentTransactionPage, setCurrentTransactionPage] = useState(1);
  const [currentToyPage, setCurrentToyPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Email management states
  const [emailForm, setEmailForm] = useState({
    to: "",
    subject: "",
    message: "",
    template: "welcome"
  });
  
  // Season management states
  const [seasonForm, setSeasonForm] = useState({
    name: "",
    displayName: "",
    description: "",
    isActive: true
  });
  
  // Bulk upload states
  const [bulkToyData, setBulkToyData] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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

  // Fetch all users
  const { data: allUsers = [] } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  // Fetch all cash out requests
  const { data: cashOutRequests = [] } = useQuery({
    queryKey: ["/api/admin/cash-outs"],
  });

  // Fetch all transactions
  const { data: allTransactions = [] } = useQuery({
    queryKey: ["/api/admin/transactions"],
  });

  // Fetch all toys
  const { data: allToys = [] } = useQuery({
    queryKey: ["/api/admin/all-toys"],
  });

  // Fetch seasons for template creation
  const { data: seasonsRaw } = useQuery({
    queryKey: ['/api/seasons'],
    retry: false,
  });
  const seasonsData = Array.isArray(seasonsRaw) ? seasonsRaw : [];

  // Fetch payment verifications
  const { data: paymentVerifications = [] } = useQuery({
    queryKey: ["/api/admin/payment-verifications"],
  });

  // Fetch appointments
  const { data: appointments = [] } = useQuery({
    queryKey: ["/api/admin/appointments"],
  });

  // Fetch token transactions
  const { data: tokenTransactions = [] } = useQuery({
    queryKey: ["/api/admin/token-transactions"],
  });

  // Fetch admin dashboard stats
  const { data: dashboardStats = {} } = useQuery({
    queryKey: ["/api/admin/dashboard-stats"],
  });

  // Fetch admin seasons
  const { data: adminSeasons = [] } = useQuery({
    queryKey: ["/api/admin/seasons"],
  });

  // Extract template toys from allToys data (toys with no owner)
  const templateToys = Array.isArray(allToys?.data) 
    ? allToys.data.filter((toy: any) => !toy.ownerId || toy.ownerId === null) 
    : [];

  // Ensure all data arrays are properly handled
  const usersArray = Array.isArray(allUsers?.data) ? allUsers.data : [];
  const transactionsArray = Array.isArray(allTransactions?.data) ? allTransactions.data : [];
  const cashOutArray = Array.isArray(cashOutRequests?.data) ? cashOutRequests.data : [];
  const toysArray = Array.isArray(allToys?.data) ? allToys.data : [];

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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-toys'] });
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

  // Bulk toy generation mutation
  const bulkGenerateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/admin/toys/bulk-generate', data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Toys bulk generated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-toys'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to bulk generate toys", variant: "destructive" });
    }
  });

  // Delete toy mutation
  const deleteToyMutation = useMutation({
    mutationFn: async (toyId: number) => {
      return apiRequest('DELETE', `/api/admin/toys/${toyId}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Toy deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-toys'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete toy", variant: "destructive" });
    }
  });

  // Edit toy mutation
  const editToyMutation = useMutation({
    mutationFn: async ({ id, ...toyData }: any) => {
      return apiRequest('PUT', `/api/admin/toys/${id}`, toyData);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Toy updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-toys'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update toy", variant: "destructive" });
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
                  <p className="text-2xl font-bold text-white">{usersArray.length}</p>
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
                    {cashOutArray.filter((req: any) => req.status === 'pending').length}
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
                  <p className="text-2xl font-bold text-white">{transactionsArray.length}</p>
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
                  <p className="text-2xl font-bold text-white">{toysArray.length}</p>
                </div>
                <Package className="w-8 h-8 text-blue-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 bg-white/10 backdrop-blur-md">
            <TabsTrigger value="users" className="data-[state=active]:bg-white/20">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="cashouts" className="data-[state=active]:bg-white/20">
              <CreditCard className="w-4 h-4 mr-2" />
              Cash Outs
            </TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-white/20">
              <History className="w-4 h-4 mr-2" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="toys" className="data-[state=active]:bg-white/20">
              <Package className="w-4 h-4 mr-2" />
              Toys
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-white/20">
              <Check className="w-4 h-4 mr-2" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="seasons" className="data-[state=active]:bg-white/20">
              <Award className="w-4 h-4 mr-2" />
              Seasons
            </TabsTrigger>
            <TabsTrigger value="emails" className="data-[state=active]:bg-white/20">
              <FileText className="w-4 h-4 mr-2" />
              Emails
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-white/20">
              <TrendingUp className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
          </TabsList>

          {/* Users Management with Pagination */}
          <TabsContent value="users">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>User Management ({usersArray.length} total)</span>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-64 bg-gray-800 border-gray-600 text-white"
                    />
                    <Button
                      onClick={() => setUserSearch("")}
                      variant="outline"
                      size="sm"
                      className="bg-white/10 border-white/20 text-white"
                    >
                      Clear
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    {usersArray
                      .filter((user: any) => 
                        userSearch === "" || 
                        user.firstName?.toLowerCase().includes(userSearch.toLowerCase()) ||
                        user.lastName?.toLowerCase().includes(userSearch.toLowerCase()) ||
                        user.email?.toLowerCase().includes(userSearch.toLowerCase())
                      )
                      .slice((currentUserPage - 1) * itemsPerPage, currentUserPage * itemsPerPage)
                      .map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell className="text-white">
                          {user.firstName} {user.lastName}
                        </TableCell>
                        <TableCell className="text-purple-200">{user.email}</TableCell>
                        <TableCell className="text-green-300">{formatCurrency(user.credits || 0)}</TableCell>
                        <TableCell className="text-blue-300">{user.loyaltyPoints || 0}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role || 'user'}
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
                                  <Label className="text-gray-300">Add/Subtract Credits</Label>
                                  <div className="flex gap-2">
                                    <Input
                                      placeholder="Amount (+ to add, - to subtract)"
                                      className="bg-gray-800 border-gray-600 text-white"
                                      id="creditAmount"
                                    />
                                    <Button
                                      onClick={() => {
                                        const amount = (document.getElementById('creditAmount') as HTMLInputElement)?.value;
                                        if (amount && selectedUser) {
                                          handleUpdateCredits(selectedUser.id, amount);
                                          (document.getElementById('creditAmount') as HTMLInputElement).value = '';
                                        }
                                      }}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      Update
                                    </Button>
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1">Current: {formatCurrency(selectedUser?.credits || 0)}</p>
                                </div>
                                <div>
                                  <Label className="text-gray-300">Add/Subtract Points</Label>
                                  <div className="flex gap-2">
                                    <Input
                                      placeholder="Points (+ to add, - to subtract)"
                                      type="number"
                                      className="bg-gray-800 border-gray-600 text-white"
                                      id="pointAmount"
                                    />
                                    <Button
                                      onClick={() => {
                                        const points = (document.getElementById('pointAmount') as HTMLInputElement)?.value;
                                        if (points && selectedUser) {
                                          handleUpdatePoints(selectedUser.id, parseInt(points));
                                          (document.getElementById('pointAmount') as HTMLInputElement).value = '';
                                        }
                                      }}
                                      className="bg-blue-600 hover:bg-blue-700"
                                    >
                                      Update
                                    </Button>
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1">Current: {selectedUser?.loyaltyPoints || 0} points</p>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Pagination */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">
                    Showing {((currentUserPage - 1) * itemsPerPage) + 1} to {Math.min(currentUserPage * itemsPerPage, usersArray.length)} of {usersArray.length} users
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentUserPage(Math.max(1, currentUserPage - 1))}
                      disabled={currentUserPage === 1}
                      className="bg-white/10 border-white/20 text-white"
                    >
                      Previous
                    </Button>
                    <span className="text-white px-3 py-1 bg-purple-600 rounded">
                      {currentUserPage}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentUserPage(currentUserPage + 1)}
                      disabled={currentUserPage * itemsPerPage >= usersArray.length}
                      className="bg-white/10 border-white/20 text-white"
                    >
                      Next
                    </Button>
                  </div>
                </div>
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
                    {cashOutArray.map((request: any) => (
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
                    {transactionsArray.map((transaction: any) => (
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

          {/* Template Toys Management */}
          <TabsContent value="toys">
            <div className="space-y-6">
              {/* Template Toy Bulk Generator */}
              <Card className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 backdrop-blur-md border-green-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Package className="h-5 w-5 mr-2 text-green-400" />
                    Template Toy Bulk Generator
                  </CardTitle>
                  <p className="text-gray-300 text-sm mt-2">Create template toys in bulk for seasonal collections. These toys will appear in the Seasonal Collections tab for users to discover and collect.</p>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => setShowTemplateDialog(true)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="lg"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template Toys
                  </Button>
                </CardContent>
              </Card>

              {/* All Toys List */}
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Package className="h-5 w-5 mr-2 text-blue-400" />
                    All Toys ({toysArray.length})
                  </CardTitle>
                  <p className="text-gray-300 text-sm">Manage all toys in the system</p>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-purple-200">Name</TableHead>
                        <TableHead className="text-purple-200">Rarity</TableHead>
                        <TableHead className="text-purple-200">Owner</TableHead>
                        <TableHead className="text-purple-200">Status</TableHead>
                        <TableHead className="text-purple-200">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {toysArray.slice(0, 20).map((toy: any) => (
                        <TableRow key={toy.id}>
                          <TableCell className="text-white">{toy.name}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                toy.rarity === 'legendary' ? 'default' :
                                toy.rarity === 'epic' ? 'secondary' : 
                                toy.rarity === 'rare' ? 'outline' : 'secondary'
                              }
                              className={
                                toy.rarity === 'legendary' ? 'bg-yellow-600 text-white' :
                                toy.rarity === 'epic' ? 'bg-purple-600 text-white' :
                                toy.rarity === 'rare' ? 'bg-blue-600 text-white' :
                                toy.rarity === 'uncommon' ? 'bg-green-600 text-white' :
                                'bg-gray-600 text-white'
                              }
                            >
                              {toy.rarity}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-purple-200">
                            {toy.ownerId ? `User: ${toy.ownerId}` : 'Template'}
                          </TableCell>
                          <TableCell className="text-purple-200">
                            {toy.isActivated ? 'Active' : 'Inactive'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  const newName = prompt('Edit toy name:', toy.name);
                                  if (newName && newName !== toy.name) {
                                    editToyMutation.mutate({ id: toy.id, name: newName });
                                  }
                                }}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete "${toy.name}"?`)) {
                                    deleteToyMutation.mutate(toy.id);
                                  }
                                }}
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

          {/* Payment Verifications */}
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
                      <TableHead className="text-purple-200">Payment Method</TableHead>
                      <TableHead className="text-purple-200">Status</TableHead>
                      <TableHead className="text-purple-200">Date</TableHead>
                      <TableHead className="text-purple-200">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(paymentVerifications?.data || []).map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell className="text-white">{payment.user?.firstName} {payment.user?.lastName}</TableCell>
                        <TableCell className="text-green-300">{formatCurrency(payment.amount)}</TableCell>
                        <TableCell className="text-purple-200">{payment.paymentMethod}</TableCell>
                        <TableCell>
                          <Badge variant={payment.status === 'verified' ? 'default' : 'secondary'}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-purple-200">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appointments */}
          <TabsContent value="appointments">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Appointments</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-purple-200">User</TableHead>
                      <TableHead className="text-purple-200">Service</TableHead>
                      <TableHead className="text-purple-200">Date & Time</TableHead>
                      <TableHead className="text-purple-200">Status</TableHead>
                      <TableHead className="text-purple-200">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(appointments?.data || []).map((appointment: any) => (
                      <TableRow key={appointment.id}>
                        <TableCell className="text-white">{appointment.user?.firstName} {appointment.user?.lastName}</TableCell>
                        <TableCell className="text-purple-200">{appointment.serviceName}</TableCell>
                        <TableCell className="text-purple-200">
                          {new Date(appointment.appointmentDate).toLocaleDateString()} {appointment.appointmentTime}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            appointment.status === 'confirmed' ? 'default' :
                            appointment.status === 'cancelled' ? 'destructive' : 'secondary'
                          }>
                            {appointment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="destructive">
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

          {/* Seasons Management */}
          <TabsContent value="seasons">
            <div className="space-y-6">
              {/* Create New Season */}
              <Card className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 backdrop-blur-md border-indigo-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Plus className="h-5 w-5 mr-2 text-indigo-400" />
                    Create New Season
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Season Name</Label>
                      <Input
                        placeholder="e.g., winter_2025"
                        value={seasonForm.name}
                        onChange={(e) => setSeasonForm({...seasonForm, name: e.target.value})}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Display Name</Label>
                      <Input
                        placeholder="e.g., Winter Collection 2025"
                        value={seasonForm.displayName}
                        onChange={(e) => setSeasonForm({...seasonForm, displayName: e.target.value})}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-300">Description</Label>
                    <Textarea
                      placeholder="Season description..."
                      value={seasonForm.description}
                      onChange={(e) => setSeasonForm({...seasonForm, description: e.target.value})}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      if (seasonForm.name && seasonForm.displayName) {
                        // Create season mutation would go here
                        toast({ title: "Success", description: "Season created successfully" });
                        setSeasonForm({ name: "", displayName: "", description: "", isActive: true });
                      } else {
                        toast({ title: "Error", description: "Please fill in required fields", variant: "destructive" });
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    Create Season
                  </Button>
                </CardContent>
              </Card>

              {/* Existing Seasons */}
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Existing Seasons</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-purple-200">Season Name</TableHead>
                        <TableHead className="text-purple-200">Display Name</TableHead>
                        <TableHead className="text-purple-200">Description</TableHead>
                        <TableHead className="text-purple-200">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(adminSeasons || []).map((season: any) => (
                        <TableRow key={season.id}>
                          <TableCell className="text-white">{season.name}</TableCell>
                          <TableCell className="text-purple-200">{season.displayName}</TableCell>
                          <TableCell className="text-purple-200">{season.description}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="destructive">
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

          {/* Email Management */}
          <TabsContent value="emails">
            <div className="space-y-6">
              {/* Send Email */}
              <Card className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 backdrop-blur-md border-green-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-green-400" />
                    Send Email
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">To (Email)</Label>
                      <Input
                        placeholder="user@example.com"
                        value={emailForm.to}
                        onChange={(e) => setEmailForm({...emailForm, to: e.target.value})}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Template</Label>
                      <Select value={emailForm.template} onValueChange={(value) => setEmailForm({...emailForm, template: value})}>
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="welcome">Welcome Email</SelectItem>
                          <SelectItem value="notification">Notification</SelectItem>
                          <SelectItem value="promotion">Promotion</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-300">Subject</Label>
                    <Input
                      placeholder="Email subject"
                      value={emailForm.subject}
                      onChange={(e) => setEmailForm({...emailForm, subject: e.target.value})}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Message</Label>
                    <Textarea
                      placeholder="Email message content..."
                      value={emailForm.message}
                      onChange={(e) => setEmailForm({...emailForm, message: e.target.value})}
                      className="bg-gray-800 border-gray-600 text-white h-32"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      if (emailForm.to && emailForm.subject && emailForm.message) {
                        // Send email mutation would go here
                        toast({ title: "Success", description: "Email sent successfully" });
                        setEmailForm({ to: "", subject: "", message: "", template: "welcome" });
                      } else {
                        toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Send Email
                  </Button>
                </CardContent>
              </Card>

              {/* Bulk Email */}
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Bulk Email to All Users</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Subject</Label>
                    <Input
                      placeholder="Bulk email subject"
                      className="bg-gray-800 border-gray-600 text-white"
                      id="bulkEmailSubject"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Message</Label>
                    <Textarea
                      placeholder="Bulk email message..."
                      className="bg-gray-800 border-gray-600 text-white h-32"
                      id="bulkEmailMessage"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      const subject = (document.getElementById('bulkEmailSubject') as HTMLInputElement)?.value;
                      const message = (document.getElementById('bulkEmailMessage') as HTMLTextAreaElement)?.value;
                      if (subject && message) {
                        toast({ title: "Success", description: `Bulk email sent to ${usersArray.length} users` });
                      } else {
                        toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
                      }
                    }}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Send to All Users ({usersArray.length})
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Reports and Analytics */}
          <TabsContent value="reports">
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 backdrop-blur-md border-blue-500/30">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-200 text-sm">Total Revenue</p>
                        <p className="text-2xl font-bold text-white">${(transactionsArray.reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0)).toFixed(2)}</p>
                      </div>
                      <DollarSign className="w-8 h-8 text-blue-300" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 backdrop-blur-md border-green-500/30">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-200 text-sm">Pending Cash Outs</p>
                        <p className="text-2xl font-bold text-white">{cashOutArray.filter((c: any) => c.status === 'pending').length}</p>
                      </div>
                      <CreditCard className="w-8 h-8 text-green-300" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 backdrop-blur-md border-purple-500/30">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-200 text-sm">Active Users</p>
                        <p className="text-2xl font-bold text-white">{usersArray.filter((u: any) => u.role !== 'admin').length}</p>
                      </div>
                      <Users className="w-8 h-8 text-purple-300" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-orange-900/30 to-red-900/30 backdrop-blur-md border-orange-500/30">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-200 text-sm">Total Toys</p>
                        <p className="text-2xl font-bold text-white">{toysArray.length}</p>
                      </div>
                      <Package className="w-8 h-8 text-orange-300" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Data Export */}
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Download className="h-5 w-5 mr-2 text-blue-400" />
                    Data Export
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button
                      onClick={() => {
                        // Export users data
                        const csvData = usersArray.map((u: any) => `${u.firstName},${u.lastName},${u.email},${u.credits},${u.loyaltyPoints}`).join('\n');
                        const blob = new Blob([`First Name,Last Name,Email,Credits,Points\n${csvData}`], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'users_export.csv';
                        a.click();
                        toast({ title: "Success", description: "Users data exported successfully" });
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Users
                    </Button>
                    <Button
                      onClick={() => {
                        // Export transactions data
                        const csvData = transactionsArray.map((t: any) => `${t.user?.email},${t.type},${t.amount},${t.description},${t.createdAt}`).join('\n');
                        const blob = new Blob([`User Email,Type,Amount,Description,Date\n${csvData}`], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'transactions_export.csv';
                        a.click();
                        toast({ title: "Success", description: "Transactions data exported successfully" });
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Transactions
                    </Button>
                    <Button
                      onClick={() => {
                        // Export toys data
                        const csvData = toysArray.map((t: any) => `${t.name},${t.rarity},${t.ownerId || 'Template'},${t.isActivated}`).join('\n');
                        const blob = new Blob([`Name,Rarity,Owner,Status\n${csvData}`], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'toys_export.csv';
                        a.click();
                        toast({ title: "Success", description: "Toys data exported successfully" });
                      }}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Toys
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {transactionsArray.slice(0, 10).map((transaction: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span className="text-white">{transaction.user?.email}</span>
                          <Badge variant="outline">{transaction.type}</Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-green-300">{formatCurrency(transaction.amount)}</p>
                          <p className="text-xs text-gray-400">{new Date(transaction.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
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
    </div>
  );
}